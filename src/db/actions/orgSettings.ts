import dbConnect from "@/db/dbConnect";
import OrgSettingsModel, { ORG_SETTINGS_KEY } from "@/db/models/orgSettings";
import { DEFAULT_ORG_SETTINGS } from "@/constants/org";
import type { OrgSettings } from "@/types/settings";

export default class OrgSettingsDAO {
  /** Reads the singleton, creating it from the defaults on first use. */
  static async get(): Promise<OrgSettings> {
    await dbConnect();
    const doc = await OrgSettingsModel.findOneAndUpdate(
      { key: ORG_SETTINGS_KEY },
      { $setOnInsert: { key: ORG_SETTINGS_KEY, ...DEFAULT_ORG_SETTINGS } },
      { upsert: true, returnDocument: "after" }
    ).lean<OrgSettings>();
    return doc as OrgSettings;
  }

  static async update(
    updates: Partial<OrgSettings> & { $inc?: { waiverVersion: number } }
  ): Promise<OrgSettings> {
    await dbConnect();
    const { $inc, ...set } = updates;
    const doc = await OrgSettingsModel.findOneAndUpdate(
      { key: ORG_SETTINGS_KEY },
      { $set: set, ...($inc ? { $inc } : {}) },
      { returnDocument: "after", runValidators: true }
    ).lean<OrgSettings>();
    return doc as OrgSettings;
  }
}
