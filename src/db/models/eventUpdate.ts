import { Schema } from "mongoose";
import { defineModel } from "@/db/defineModel";
import { EventUpdate, UPDATE_KINDS } from "@/types/event";

const eventUpdateSchema = new Schema<EventUpdate>(
  {
    eventId: { type: Schema.ObjectId, ref: "Event", required: true },
    authorId: { type: Schema.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: UPDATE_KINDS, required: true },
    body: { type: String, required: true },
    rosterOnly: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
    postedAt: { type: Date, required: true },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    notifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

eventUpdateSchema.index({ eventId: 1, postedAt: -1 });

export default defineModel<EventUpdate>("EventUpdate", eventUpdateSchema);
