import { Schema } from "mongoose";
import { defineModel } from "@/db/defineModel";
import {
  MAIL_FAILURES,
  NOTIFICATION_STATUSES,
  NotificationLog,
} from "@/types/notification";

const notificationLogSchema = new Schema<NotificationLog>(
  {
    key: { type: String, required: true, unique: true },
    status: { type: String, enum: NOTIFICATION_STATUSES },
    claimedAt: { type: Date },
    sentAt: { type: Date },
    failedAt: { type: Date },
    failureKind: { type: String, enum: MAIL_FAILURES },
    lastError: { type: String },
    expiresAt: { type: Date },
  },
  { timestamps: false }
);

export default defineModel<NotificationLog>(
  "NotificationLog",
  notificationLogSchema
);
