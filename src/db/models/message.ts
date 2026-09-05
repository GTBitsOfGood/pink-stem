import { Schema } from "mongoose";
import { defineModel } from "@/db/defineModel";
import { Message } from "@/types/message";
import { MAX_MESSAGE_LENGTH } from "@/constants/limits";

const messageSchema = new Schema<Message>(
  {
    threadId: { type: Schema.ObjectId, ref: "MessageThread", required: true },
    senderId: { type: Schema.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, maxlength: MAX_MESSAGE_LENGTH },
    sentAt: { type: Date, required: true },
    notifiedAt: { type: Date, default: null },
    reportedAt: { type: Date, default: null },
    reportedBy: { type: Schema.ObjectId, ref: "User", default: null },
    reportReason: String,
  },
  { timestamps: true }
);

messageSchema.index({ threadId: 1, sentAt: 1 });
messageSchema.index({ senderId: 1, sentAt: -1 });

export default defineModel<Message>("Message", messageSchema);
