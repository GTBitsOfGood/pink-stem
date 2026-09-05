import ActionTokenDAO from "@/db/actions/actionToken";
import UserDAO from "@/db/actions/user";
import {
  GUARDIAN_CONSENT_DAYS,
  RATE_LIMITS,
  RESET_PASSWORD_TOKEN_MINUTES,
  VERIFY_EMAIL_TOKEN_HOURS,
} from "@/constants/limits";
import { isMinor } from "@/lib/dates";
import { assertRateLimit } from "@/lib/rateLimit";
import { signSession } from "@/lib/session";
import { appUrl } from "@/lib/urls";
import AuditService from "@/services/audit";
import HashingService from "@/services/hashing";
import NotificationService from "@/services/notification";
import SignupService from "@/services/signup";
import type { Actor } from "@/types/auth";
import {
  ConflictError,
  InvalidArgumentsError,
  NotFoundError,
  UnauthorizedError,
} from "@/types/exceptions";
import type { Doc } from "@/types/models";
import type { Role, SafeUser, User } from "@/types/user";
import ERRORS from "@/utils/errorMessages";
import {
  acceptInviteSchema,
  emailOnlySchema,
  googleSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  tokenSchema,
} from "@/utils/validation/auth";

export interface SessionResult {
  token: string;
  user: Doc<SafeUser>;
}

const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;

/** Accounts, sessions, and every one-time link flow. */
export default class AuthService {
  private static async session(user: Doc<User>): Promise<SessionResult> {
    const token = await signSession(
      user._id.toString(),
      user.role,
      user.sessionVersion ?? 0
    );
    return { token, user: UserDAO.toSafe(user) };
  }

  static async register(input: unknown, ip: string): Promise<SessionResult> {
    assertRateLimit(`register:${ip}`, RATE_LIMITS.register);
    const data = registerSchema.parse(input);

    const existing = await UserDAO.findByEmail(data.email);
    if (existing) {
      throw new ConflictError(
        existing.provider === "google"
          ? ERRORS.AUTH.GOOGLE_ACCOUNT
          : ERRORS.AUTH.EMAIL_TAKEN
      );
    }

    const minor = isMinor(data.dateOfBirth);
    if (minor && !data.guardianEmail) {
      throw new InvalidArgumentsError(ERRORS.USER.GUARDIAN_EMAIL_REQUIRED);
    }
    if (data.guardianEmail && data.guardianEmail === data.email) {
      throw new InvalidArgumentsError(ERRORS.USER.GUARDIAN_EMAIL_SAME);
    }

    const created = await UserDAO.create({
      email: data.email,
      provider: "password",
      role: "volunteer",
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
      guardianEmail: minor ? data.guardianEmail : undefined,
      passwordHash: await HashingService.hash(data.password),
    });

    await AuthService.sendVerification(created);
    if (minor) await AuthService.sendGuardianConsent(created);

    return AuthService.session({ ...created, sessionVersion: 0 });
  }

  static async login(input: unknown, ip: string): Promise<SessionResult> {
    assertRateLimit(`login:${ip}`, RATE_LIMITS.loginPerAddress);
    const { email, password } = loginSchema.parse(input);
    assertRateLimit(`login:${ip}:${email}`, RATE_LIMITS.login);

    const user = await UserDAO.findAuthByEmail(email);
    if (user?.provider === "google") {
      throw new ConflictError(ERRORS.AUTH.GOOGLE_ACCOUNT);
    }
    const matches = user?.passwordHash
      ? await HashingService.compare(password, user.passwordHash)
      : false;
    if (!user || !matches) {
      throw new UnauthorizedError(ERRORS.AUTH.INVALID_CREDENTIALS);
    }
    if (user.status !== "active") {
      throw new UnauthorizedError(ERRORS.AUTH.ACCOUNT_INACTIVE);
    }
    return AuthService.session(user);
  }

  static async loginWithGoogle(input: unknown): Promise<SessionResult> {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId)
      throw new InvalidArgumentsError(ERRORS.AUTH.GOOGLE_NOT_CONFIGURED);
    const { credential } = googleSchema.parse(input);

    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    const info = (await response.json()) as {
      aud?: string;
      email?: string;
      email_verified?: string;
      given_name?: string;
      family_name?: string;
    };
    if (
      !response.ok ||
      info.aud !== clientId ||
      !info.email ||
      info.email_verified !== "true"
    ) {
      throw new UnauthorizedError(ERRORS.AUTH.GOOGLE_TOKEN);
    }

    let user = await UserDAO.findAuthByEmail(info.email);
    if (user?.provider === "password") {
      throw new ConflictError(ERRORS.AUTH.PASSWORD_ACCOUNT);
    }
    if (!user) {
      const created = await UserDAO.create({
        email: info.email,
        provider: "google",
        role: "volunteer",
        firstName: info.given_name ?? "New",
        lastName: info.family_name ?? "Volunteer",
        emailVerifiedAt: new Date(),
      });
      user = { ...created, sessionVersion: 0 };
    }
    if (user.status !== "active") {
      throw new UnauthorizedError(ERRORS.AUTH.ACCOUNT_INACTIVE);
    }
    return AuthService.session(user);
  }

  static async sendVerification(
    user: Pick<Doc<SafeUser>, "_id" | "email" | "firstName" | "status">
  ): Promise<void> {
    const { secret } = await ActionTokenDAO.issue({
      purpose: "verify_email",
      email: user.email,
      userId: user._id,
      ttlMs: VERIFY_EMAIL_TOKEN_HOURS * HOUR,
    });
    const org = await NotificationService.org();
    await NotificationService.send(
      user,
      NotificationService.templates.verifyEmail(org, {
        name: user.firstName,
        url: appUrl(`/verify-email?token=${secret}`),
      })
    );
  }

  static async sendGuardianConsent(
    user: Pick<
      Doc<SafeUser>,
      "_id" | "email" | "firstName" | "lastName" | "guardianEmail"
    >
  ): Promise<void> {
    if (!user.guardianEmail) return;
    const { secret } = await ActionTokenDAO.issue({
      purpose: "guardian_consent",
      email: user.guardianEmail,
      userId: user._id,
      ttlMs: GUARDIAN_CONSENT_DAYS * DAY,
    });
    const org = await NotificationService.org();
    await NotificationService.sendRaw(
      user.guardianEmail,
      NotificationService.templates.guardianConsent(org, {
        volunteerName: `${user.firstName} ${user.lastName}`,
        url: appUrl(`/consent/${secret}`),
      })
    );
  }

  static async resendVerification(actor: Actor): Promise<void> {
    const user = await UserDAO.findById(actor.id);
    if (!user) throw new NotFoundError(ERRORS.USER.NOT_FOUND);
    if (user.emailVerifiedAt)
      throw new ConflictError(ERRORS.AUTH.ALREADY_VERIFIED);
    await AuthService.sendVerification(user);
  }

  static async verifyEmail(input: unknown): Promise<void> {
    const { token } = tokenSchema.parse(input);
    const consumed = await ActionTokenDAO.consume(token, "verify_email");
    if (!consumed?.userId) throw new NotFoundError(ERRORS.AUTH.TOKEN_INVALID);
    await UserDAO.updateById(consumed.userId, { emailVerifiedAt: new Date() });
    await SignupService.reevaluateForVolunteer(consumed.userId);
  }

  static async forgotPassword(input: unknown, ip: string): Promise<void> {
    assertRateLimit(`reset:${ip}`, RATE_LIMITS.passwordReset);
    const { email } = emailOnlySchema.parse(input);
    const user = await UserDAO.findByEmail(email);
    // Always resolve: the response never reveals whether the account exists.
    if (!user || user.provider !== "password" || user.status !== "active")
      return;

    const { secret } = await ActionTokenDAO.issue({
      purpose: "reset_password",
      email: user.email,
      userId: user._id,
      ttlMs: RESET_PASSWORD_TOKEN_MINUTES * 60_000,
    });
    const org = await NotificationService.org();
    await NotificationService.send(
      user,
      NotificationService.templates.passwordReset(org, {
        name: user.firstName,
        url: appUrl(`/reset-password?token=${secret}`),
      })
    );
  }

  static async resetPassword(input: unknown): Promise<SessionResult> {
    const { token, password } = resetPasswordSchema.parse(input);
    const consumed = await ActionTokenDAO.consume(token, "reset_password");
    if (!consumed?.userId) throw new NotFoundError(ERRORS.AUTH.TOKEN_INVALID);

    await UserDAO.setPassword(
      consumed.userId,
      await HashingService.hash(password)
    );
    const user = await UserDAO.findAuthById(consumed.userId);
    if (!user) throw new NotFoundError(ERRORS.USER.NOT_FOUND);
    return AuthService.session(user);
  }

  static async getInvite(
    token: string
  ): Promise<{ email: string; role: Role; existingAccount: boolean }> {
    const invite = await ActionTokenDAO.findValid(token, "organizer_invite");
    if (!invite?.role) throw new NotFoundError(ERRORS.AUTH.TOKEN_INVALID);
    const existing = await UserDAO.findByEmail(invite.email);
    return {
      email: invite.email,
      role: invite.role,
      existingAccount: !!existing,
    };
  }

  /** Organizer and admin accounts only ever come from an admin's invitation. */
  static async acceptInvite(input: unknown): Promise<SessionResult> {
    const data = acceptInviteSchema.parse(input);
    const invite = await ActionTokenDAO.consume(data.token, "organizer_invite");
    if (!invite?.role) throw new NotFoundError(ERRORS.AUTH.TOKEN_INVALID);

    const passwordHash = await HashingService.hash(data.password);
    const existing = await UserDAO.findAuthByEmail(invite.email);
    let user: Doc<User>;

    if (existing) {
      const before = { role: existing.role };
      await UserDAO.updateById(existing._id, {
        role: invite.role,
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
        status: "active",
        deactivatedAt: null,
      });
      await UserDAO.setPassword(existing._id, passwordHash);
      user = (await UserDAO.findAuthById(existing._id)) as Doc<User>;
      if (invite.invitedBy) {
        await AuditService.record(
          {
            id: invite.invitedBy.toString(),
            role: "admin",
            email: "",
            name: "",
          },
          "user.role_changed",
          "user",
          existing._id,
          { before, after: { role: invite.role, via: "invitation" } }
        );
      }
    } else {
      const created = await UserDAO.create({
        email: invite.email,
        provider: "password",
        role: invite.role,
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash,
        emailVerifiedAt: new Date(),
      });
      user = { ...created, sessionVersion: 0 };
    }

    return AuthService.session(user);
  }
}
