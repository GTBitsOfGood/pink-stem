import dbConnect from "@/db/dbConnect";
import OrgSettingsModel, { ORG_SETTINGS_KEY } from "@/db/models/orgSettings";
import { DEFAULT_ORG_SETTINGS } from "@/constants/org";
import type { OrgSettings } from "@/types/settings";

/** Settings created before the waiver link existed do not have one yet. */
function withDefaults(doc: OrgSettings): OrgSettings {
  return {
    ...doc,
    waiverFormUrl: doc?.waiverFormUrl ?? DEFAULT_ORG_SETTINGS.waiverFormUrl,
  };
}

export default class OrgSettingsDAO {
  /** Reads the singleton, creating it from the defaults on first use. */
  static async get(): Promise<OrgSettings> {
    await dbConnect();
    const doc = await OrgSettingsModel.findOneAndUpdate(
      { key: ORG_SETTINGS_KEY },
      { $setOnInsert: { key: ORG_SETTINGS_KEY, ...DEFAULT_ORG_SETTINGS } },
      { upsert: true, returnDocument: "after" }
    ).lean<OrgSettings>();
    return withDefaults(doc as OrgSettings);
  }

  static async update(updates: Partial<OrgSettings>): Promise<OrgSettings> {
    await dbConnect();
    const doc = await OrgSettingsModel.findOneAndUpdate(
      { key: ORG_SETTINGS_KEY },
      { $set: updates },
      { returnDocument: "after", runValidators: true }
    ).lean<OrgSettings>();
    return withDefaults(doc as OrgSettings);
  }
}
