import { Schema } from "mongoose";
import { defineModel } from "@/db/defineModel";
import {
  REGISTRY_OUTCOMES,
  REGISTRY_SOURCES,
  REGISTRY_UNAVAILABLE_REASONS,
  ScreeningCheck,
} from "@/types/screening";

const hitSchema = new Schema(
  {
    name: { type: String, required: true },
    yearOfBirth: { type: Number, default: null },
    location: String,
    url: { type: String, required: true },
  },
  { _id: false }
);

/** One RegistryCheckResult, stored as-is. Fields outside its outcome stay unset. */
const resultSchema = new Schema(
  {
    source: { type: String, enum: REGISTRY_SOURCES, required: true },
    sourceLabel: { type: String, required: true },
    checkedAt: { type: Date, required: true },
    outcome: { type: String, enum: REGISTRY_OUTCOMES, required: true },
    hits: { type: [hitSchema], default: undefined },
    reason: { type: String, enum: REGISTRY_UNAVAILABLE_REASONS },
    manualSearchUrl: String,
  },
  { _id: false }
);

/**
 * The registry pre-check for a volunteer. Kept apart from users, like
 * Clearance, so it is never returned alongside a user by accident. It never
 * changes clearance; the admin decides what a result means.
 */
const screeningCheckSchema = new Schema<ScreeningCheck>(
  {
    userId: {
      type: Schema.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    results: { type: [resultSchema], default: [] },
    rerunRequestedAt: { type: Date, default: null },
    rerunRequestedBy: { type: Schema.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export default defineModel<ScreeningCheck>(
  "ScreeningCheck",
  screeningCheckSchema
);
