import { Schema } from "mongoose";
import { defineModel } from "@/db/defineModel";

export interface RateLimitWindow {
  key: string;
  windowStart: Date;
  count: number;
  expiresAt: Date;
}

const rateLimitWindowSchema = new Schema<RateLimitWindow>({
  key: { type: String, required: true, unique: true },
  windowStart: { type: Date, required: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
});

// Buffer past windowMs so the TTL reaper (which runs ~once/minute) never
// deletes a window that's still live; correctness comes from windowStart,
// not from the document's existence.
rateLimitWindowSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default defineModel<RateLimitWindow>(
  "RateLimitWindow",
  rateLimitWindowSchema
);
