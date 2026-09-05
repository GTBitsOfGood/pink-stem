import { Schema } from "mongoose";
import { defineModel } from "@/db/defineModel";
import { OrgSettings } from "@/types/settings";

/** Singleton: exactly one document, addressed by `key: "org"`. */
export const ORG_SETTINGS_KEY = "org";

const orgSettingsSchema = new Schema<OrgSettings & { key: string }>(
  {
    key: { type: String, required: true, unique: true },
    orgName: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    website: { type: String, required: true },
    signatoryName: { type: String, required: true },
    signatoryTitle: { type: String, required: true },
    waiverVersion: { type: Number, required: true },
    waiverText: { type: String, required: true },
    codeOfConductText: { type: String, required: true },
    cancellationCutoffHours: { type: Number, required: true },
    autoPromoteCutoffHours: { type: Number, required: true },
    noShowThreshold: { type: Number, required: true },
    noShowWindowDays: { type: Number, required: true },
  },
  { timestamps: true }
);

export default defineModel<OrgSettings & { key: string }>(
  "OrgSettings",
  orgSettingsSchema
);
