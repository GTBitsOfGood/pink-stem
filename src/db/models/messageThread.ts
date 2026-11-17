import { Schema } from "mongoose";
import { defineModel } from "@/db/defineModel";
import { MessageThread, THREAD_STATUSES } from "@/types/message";

const messageThreadSchema = new Schema<MessageThread>(
  {
    eventId: { type: Schema.ObjectId, ref: "Event", required: true },
    volunteerId: { type: Schema.ObjectId, ref: "User", required: true },
    organizerId: { type: Schema.ObjectId, ref: "User", required: true },
    status: { type: String, enum: THREAD_STATUSES, default: "open" },
    involvesMinor: { type: Boolean, default: false },
    lastMessageAt: { type: Date, required: true },
    lastReadAt: { type: Map, of: Date, default: () => ({}) },
    readOnlyAt: { type: Date, default: null },
    flaggedAt: { type: Date, default: null },
    flaggedBy: { type: Schema.ObjectId, ref: "User", default: null },
    flagReason: String,
  },
  { timestamps: true }
);

// One conversation per volunteer per event.
messageThreadSchema.index({ eventId: 1, volunteerId: 1 }, { unique: true });
messageThreadSchema.index({ organizerId: 1, lastMessageAt: -1 });
messageThreadSchema.index({ volunteerId: 1, lastMessageAt: -1 });

export default defineModel<MessageThread>("MessageThread", messageThreadSchema);
