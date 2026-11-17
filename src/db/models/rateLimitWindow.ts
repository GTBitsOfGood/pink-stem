import { Schema } from "mongoose";
import { defineModel } from "@/db/defineModel";
import { RateLimitWindow } from "@/types/rateLimit";

const rateLimitWindowSchema = new Schema<RateLimitWindow>(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false }
);

// MongoDB removes lapsed windows on its own.
rateLimitWindowSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default defineModel<RateLimitWindow>(
  "RateLimitWindow",
  rateLimitWindowSchema
);
