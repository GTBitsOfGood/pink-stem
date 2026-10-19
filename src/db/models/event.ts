import { Schema } from "mongoose";
import { defineModel } from "@/db/defineModel";
import {
  Event,
  EVENT_COMMITMENTS,
  EVENT_STATUSES,
  EVENT_VISIBILITIES,
  PROGRAM_AREAS,
  WEEKDAYS,
} from "@/types/event";
import { REGIONS } from "@/types/user";

const eventSchema = new Schema<Event>(
  {
    organizerId: { type: Schema.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    programArea: { type: String, enum: PROGRAM_AREAS, required: true },
    status: { type: String, enum: EVENT_STATUSES, default: "draft" },
    visibility: { type: String, enum: EVENT_VISIBILITIES, default: "public" },
    commitment: {
      type: String,
      enum: EVENT_COMMITMENTS,
      default: "short_term",
    },
    seriesId: { type: Schema.ObjectId },
    seriesWeekdays: { type: [String], enum: WEEKDAYS, default: undefined },
    seriesStartDate: Date,
    seriesEndDate: Date,
    eventDate: { type: Date, required: true },
    region: { type: String, enum: REGIONS, required: true },
    isVirtual: { type: Boolean, default: false },
    virtualLink: String,
    locationName: String,
    address: String,
    locationNote: String,
    city: String,
    requiresClearance: { type: Boolean, default: false },
    requiresApproval: { type: Boolean, default: false },
    minAge: Number,
    siteContactName: String,
    siteContactPhone: String,
    coverImageUrl: String,
    cancellationReason: String,
    publishedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: Schema.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

eventSchema.index({ status: 1, eventDate: 1 });
eventSchema.index({ organizerId: 1, eventDate: -1 });
// One live session per program date. Cancelled sessions keep their date, so
// they drop out and a program cut short can later be extended over them.
eventSchema.index(
  { seriesId: 1, eventDate: 1 },
  {
    unique: true,
    partialFilterExpression: {
      seriesId: { $exists: true },
      cancelledAt: { $type: "null" },
    },
  }
);

export default defineModel<Event>("Event", eventSchema);
