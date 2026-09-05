import { UpdateQuery } from "mongoose";
import ActionTokenDAO from "@/db/actions/actionToken";
import ClearanceDAO from "@/db/actions/clearance";
import OrgSettingsDAO from "@/db/actions/orgSettings";
import UserDAO from "@/db/actions/user";
import { isMinor } from "@/lib/dates";
import AuthService from "@/services/auth";
import MessageService from "@/services/message";
import SignupService from "@/services/signup";
import type { MeResponse } from "@/types/api";
import type { Actor } from "@/types/auth";
import { InvalidArgumentsError, NotFoundError } from "@/types/exceptions";
import type { Doc } from "@/types/models";
import type { SafeUser, User } from "@/types/user";
import ERRORS from "@/utils/errorMessages";
import { updateProfileSchema } from "@/utils/validation/user";

/** Fields that an empty string clears rather than stores. */
const CLEARABLE = ["phone", "city", "guardianEmail", "bio"] as const;

/** The signed-in user's own profile, waiver, and guardian consent. */
export default class UserService {
  static async getMe(actor: Actor): Promise<MeResponse> {
    const [user, clearance, settings, unreadMessages] = await Promise.all([
      UserDAO.findById(actor.id),
      ClearanceDAO.findByUser(actor.id),
      OrgSettingsDAO.get(),
      MessageService.unreadCount(actor),
    ]);
    if (!user) throw new NotFoundError(ERRORS.USER.NOT_FOUND);

    return {
      user,
      clearance: clearance
        ? { status: clearance.status, expiresOn: clearance.expiresOn }
        : null,
      isMinor: isMinor(user.dateOfBirth),
      outstanding: SignupService.pendingReasons({ user, clearance, settings }),
      waiverVersion: settings.waiverVersion,
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

    const dateOfBirth = data.dateOfBirth ?? user.dateOfBirth;
    const guardianEmail =
      data.guardianEmail !== undefined
        ? data.guardianEmail || undefined
        : user.guardianEmail;

    if (isMinor(dateOfBirth) && !guardianEmail) {
      throw new InvalidArgumentsError(ERRORS.USER.GUARDIAN_EMAIL_REQUIRED);
    }
    if (guardianEmail && guardianEmail === user.email) {
      throw new InvalidArgumentsError(ERRORS.USER.GUARDIAN_EMAIL_SAME);
    }

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

    // A new guardian address restarts consent.
    const guardianChanged = guardianEmail !== user.guardianEmail;
    if (guardianChanged) $set.guardianConsentAt = null;

    const updates: UpdateQuery<User> = { $set };
    if (Object.keys($unset).length) updates.$unset = $unset;
    const updated = (await UserDAO.updateById(
      actor.id,
      updates
    )) as Doc<SafeUser>;

    if (guardianChanged && isMinor(dateOfBirth) && guardianEmail) {
      await AuthService.sendGuardianConsent(updated);
    }
    await SignupService.reevaluateForVolunteer(actor.id);
    return UserService.getMe(actor);
  }

  static async acceptWaiver(actor: Actor): Promise<MeResponse> {
    const settings = await OrgSettingsDAO.get();
    await UserDAO.updateById(actor.id, {
      waiverVersionAccepted: settings.waiverVersion,
      waiverAcceptedAt: new Date(),
    });
    await SignupService.reevaluateForVolunteer(actor.id);
    return UserService.getMe(actor);
  }

  static async resendGuardianConsent(actor: Actor): Promise<void> {
    const user = await UserDAO.findById(actor.id);
    if (!user) throw new NotFoundError(ERRORS.USER.NOT_FOUND);
    if (
      !isMinor(user.dateOfBirth) ||
      !user.guardianEmail ||
      user.guardianConsentAt
    )
      return;
    await AuthService.sendGuardianConsent(user);
  }

  /** What the guardian sees before deciding. */
  static async guardianConsentInfo(token: string) {
    const pending = await ActionTokenDAO.findValid(token, "guardian_consent");
    const user = pending?.userId
      ? await UserDAO.findById(pending.userId)
      : null;
    if (!pending || !user) throw new NotFoundError(ERRORS.AUTH.TOKEN_INVALID);
    const settings = await OrgSettingsDAO.get();
    return {
      volunteerName: `${user.firstName} ${user.lastName}`,
      guardianEmail: pending.email,
      alreadyConsented: !!user.guardianConsentAt,
      orgName: settings.orgName,
      waiverText: settings.waiverText,
      codeOfConductText: settings.codeOfConductText,
    };
  }

  static async giveGuardianConsent(
    token: string
  ): Promise<{ volunteerName: string }> {
    const consumed = await ActionTokenDAO.consume(token, "guardian_consent");
    if (!consumed?.userId) throw new NotFoundError(ERRORS.AUTH.TOKEN_INVALID);
    const user = await UserDAO.updateById(consumed.userId, {
      guardianConsentAt: new Date(),
      guardianEmail: consumed.email,
    });
    if (!user) throw new NotFoundError(ERRORS.USER.NOT_FOUND);
    await SignupService.reevaluateForVolunteer(user._id);
    return { volunteerName: `${user.firstName} ${user.lastName}` };
  }
}
