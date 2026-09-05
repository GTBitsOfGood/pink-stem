import OrgSettingsDAO from "@/db/actions/orgSettings";
import type { OrgSettings } from "@/types/settings";
import { settingsInputSchema } from "@/utils/validation/admin";

/** What signed-out visitors and volunteers may see of the org configuration. */
export type PublicSettings = Pick<
  OrgSettings,
  | "orgName"
  | "addressLine1"
  | "addressLine2"
  | "phone"
  | "email"
  | "website"
  | "waiverVersion"
  | "waiverText"
  | "codeOfConductText"
  | "cancellationCutoffHours"
  | "autoPromoteCutoffHours"
>;

export default class SettingsService {
  static get(): Promise<OrgSettings> {
    return OrgSettingsDAO.get();
  }

  static async getPublic(): Promise<PublicSettings> {
    const s = await OrgSettingsDAO.get();
    return {
      orgName: s.orgName,
      addressLine1: s.addressLine1,
      addressLine2: s.addressLine2,
      phone: s.phone,
      email: s.email,
      website: s.website,
      waiverVersion: s.waiverVersion,
      waiverText: s.waiverText,
      codeOfConductText: s.codeOfConductText,
      cancellationCutoffHours: s.cancellationCutoffHours,
      autoPromoteCutoffHours: s.autoPromoteCutoffHours,
    };
  }

  static async update(input: unknown): Promise<OrgSettings> {
    const { bumpWaiverVersion, ...updates } = settingsInputSchema.parse(input);
    return OrgSettingsDAO.update({
      ...updates,
      ...(bumpWaiverVersion ? { $inc: { waiverVersion: 1 } } : {}),
    });
  }
}
