import { UpdateQuery } from "mongoose";
import ActionTokenDAO from "@/db/actions/actionToken";
import ClearanceDAO from "@/db/actions/clearance";
import UserDAO from "@/db/actions/user";
import { RATE_LIMITS } from "@/constants/limits";
import { isMinor } from "@/lib/dates";
import { assertRateLimit } from "@/lib/rateLimit";
import AuthService from "@/services/auth";
import { MailError } from "@/services/mail";
import MessageService from "@/services/message";
import SignupService from "@/services/signup";
import type { MeResponse } from "@/types/api";
import type { Actor } from "@/types/auth";
import { NotFoundError } from "@/types/exceptions";
import type { User } from "@/types/user";
import ERRORS from "@/utils/errorMessages";
import { updateProfileSchema } from "@/utils/validation/user";

/** Fields that an empty string clears rather than stores. */
const CLEARABLE = ["phone", "city", "bio"] as const;

/** The signed-in user's own profile and email verification. */
export default class UserService {
  static async getMe(actor: Actor): Promise<MeResponse> {
    const [user, clearance, unreadMessages] = await Promise.all([
      UserDAO.findById(actor.id),
      ClearanceDAO.findByUser(actor.id),
      MessageService.unreadCount(actor),
    ]);
    if (!user) throw new NotFoundError(ERRORS.USER.NOT_FOUND);

    return {
      user,
      clearance: clearance
        ? { status: clearance.status, expiresOn: clearance.expiresOn }
        : null,
      isMinor: isMinor(user.dateOfBirth),
      outstanding: SignupService.pendingReasons({ user, clearance }),
      unreadMessages,
    };
  }

  static async updateProfile(
    actor: Actor,
    input: unknown
  ): Promise<MeResponse> {
    const data = updateProfileSchema.parse(input);
    const user = await UserDAO.findById(actor.id);
    if (!user) throw new NotFoundError(ERRORS.USER.NOT_FOUND);

    const $set: Record<string, unknown> = {};
    const $unset: Record<string, 1> = {};
    const { notificationPreferences, ...fields } = data;
    for (const [key, value] of Object.entries(fields)) {
      if ((CLEARABLE as readonly string[]).includes(key) && value === "")
        $unset[key] = 1;
      else $set[key] = value;
    }
    for (const [category, enabled] of Object.entries(
      notificationPreferences ?? {}
    )) {
      $set[`notificationPreferences.${category}`] = enabled;
    }

    const updates: UpdateQuery<User> = { $set };
    if (Object.keys($unset).length) updates.$unset = $unset;
    await UserDAO.updateById(actor.id, updates);
    await SignupService.reevaluateForVolunteer(actor.id);
    return UserService.getMe(actor);
  }

  static async resendEmailVerification(actor: Actor): Promise<void> {
    await assertRateLimit(
      `verify-email-resend:${actor.id}`,
      RATE_LIMITS.verifyEmailResend
    );
    const user = await UserDAO.findById(actor.id);
    if (!user) throw new NotFoundError(ERRORS.USER.NOT_FOUND);
    if (user.emailVerifiedAt) return;
    // Registration carries on if its email fails; a resend tells the user.
    if ((await AuthService.sendEmailVerification(user)) === "failed")
      throw new MailError("unavailable", "Verification email was not sent");
  }

  /** What the page shows before confirming. */
  static async verifyEmailInfo(token: string, ip: string) {
    await assertRateLimit(`verify-email:${ip}`, RATE_LIMITS.verifyEmailLookup);
    const pending = await ActionTokenDAO.findValid(token, "verify_email");
    const user = pending?.userId
      ? await UserDAO.findById(pending.userId)
      : null;
    if (!user) throw new NotFoundError(ERRORS.AUTH.TOKEN_INVALID);
    return {
      firstName: user.firstName,
      alreadyVerified: !!user.emailVerifiedAt,
    };
  }

  static async verifyEmail(token: string): Promise<void> {
    const consumed = await ActionTokenDAO.consume(token, "verify_email");
    if (!consumed?.userId) throw new NotFoundError(ERRORS.AUTH.TOKEN_INVALID);
    const user = await UserDAO.updateById(consumed.userId, {
      emailVerifiedAt: new Date(),
    });
    if (!user) throw new NotFoundError(ERRORS.USER.NOT_FOUND);
    await SignupService.reevaluateForVolunteer(user._id);
  }
}
