import { Schema } from "mongoose";
import { defineModel } from "@/db/defineModel";
import { Shift } from "@/types/event";
import { SKILLS } from "@/types/user";

const shiftSchema = new Schema<Shift>(
  {
    eventId: { type: Schema.ObjectId, ref: "Event", required: true },
    roleName: { type: String, required: true, trim: true },
    description: String,
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    capacity: { type: Number, required: true, min: 1 },
    minStaffing: { type: Number, default: 1, min: 0 },
    requiredSkills: { type: [String], enum: SKILLS, default: [] },
    filledCount: { type: Number, default: 0, min: 0 },
    waitlistCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

shiftSchema.index({ eventId: 1, startsAt: 1 });

export default defineModel<Shift>("Shift", shiftSchema);
