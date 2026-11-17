import { Schema } from "mongoose";
import { defineModel } from "@/db/defineModel";
import { Certificate, CERTIFICATE_TYPES } from "@/types/certificate";

const certificateItemSchema = new Schema(
  {
    eventId: { type: Schema.ObjectId, ref: "Event", required: true },
    eventTitle: { type: String, required: true },
    eventDate: { type: Date, required: true },
    roleName: { type: String, required: true },
    hours: { type: Number, required: true },
  },
  { _id: false }
);

const certificateSchema = new Schema<Certificate>(
  {
    volunteerId: { type: Schema.ObjectId, ref: "User", required: true },
    type: { type: String, enum: CERTIFICATE_TYPES, required: true },
    eventId: { type: Schema.ObjectId, ref: "Event", default: null },
    volunteerName: { type: String, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    totalHours: { type: Number, required: true },
    items: { type: [certificateItemSchema], default: [] },
    signatoryName: { type: String, required: true },
    signatoryTitle: { type: String, required: true },
    verificationCode: { type: String, required: true, unique: true },
    issuedAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: Schema.ObjectId, ref: "User", default: null },
    revocationReason: String,
    supersededBy: { type: Schema.ObjectId, ref: "Certificate", default: null },
  },
  { timestamps: true }
);

certificateSchema.index({ volunteerId: 1, issuedAt: -1 });
certificateSchema.index({ eventId: 1 }, { sparse: true });

export default defineModel<Certificate>("Certificate", certificateSchema);
