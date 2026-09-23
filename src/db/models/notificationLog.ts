import { Schema } from "mongoose";
import { defineModel } from "@/db/defineModel";
import { NotificationLog } from "@/types/notification";

const notificationLogSchema = new Schema<NotificationLog>(
  {
    key: { type: String, required: true, unique: true },
    sentAt: { type: Date, required: true },
    expiresAt: { type: Date },
  },
  { timestamps: false }
);

notificationLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default defineModel<NotificationLog>(
  "NotificationLog",
  notificationLogSchema
);
