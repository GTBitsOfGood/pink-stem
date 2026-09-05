import { Schema } from "mongoose";
import { defineModel } from "@/db/defineModel";
import {
  AUTH_PROVIDERS,
  NOTIFICATION_CATEGORIES,
  REGIONS,
  ROLES,
  SHIRT_SIZES,
  SKILLS,
  User,
  USER_STATUSES,
} from "@/types/user";
import { MAX_BIO_LENGTH } from "@/constants/limits";

const notificationPreferences = Object.fromEntries(
  NOTIFICATION_CATEGORIES.map((category) => [
    category,
    { type: Boolean, default: true },
  ])
);

const userSchema = new Schema<User>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, select: false },
    provider: { type: String, enum: AUTH_PROVIDERS, required: true },
    role: { type: String, enum: ROLES, default: "volunteer", index: true },
    status: { type: String, enum: USER_STATUSES, default: "active" },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    city: { type: String, trim: true },
    region: { type: String, enum: REGIONS },
    dateOfBirth: Date,
    guardianEmail: { type: String, lowercase: true, trim: true },
    guardianConsentAt: { type: Date, default: null },
    emergencyContact: {
      type: new Schema(
        {
          name: { type: String, trim: true },
          phone: { type: String, trim: true },
        },
        { _id: false }
      ),
    },
    skills: { type: [String], enum: SKILLS, default: [] },
    interests: { type: [String], enum: SKILLS, default: [] },
    shirtSize: { type: String, enum: SHIRT_SIZES },
    bio: { type: String, maxlength: MAX_BIO_LENGTH, trim: true },
    waiverVersionAccepted: Number,
    waiverAcceptedAt: Date,
    emailVerifiedAt: { type: Date, default: null },
    notificationPreferences: {
      type: new Schema(notificationPreferences, { _id: false }),
      default: () => ({}),
    },
    sessionVersion: { type: Number, default: 0, select: false },
    flaggedForReviewAt: { type: Date, default: null },
    deactivatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ lastName: 1, firstName: 1 });

export default defineModel<User>("User", userSchema);
