import { Types, UpdateQuery } from "mongoose";
import dbConnect from "@/db/dbConnect";
import { toDoc } from "@/db/defineModel";
import MessageModel from "@/db/models/message";
import type { Message } from "@/types/message";
import type { Doc } from "@/types/models";

export default class MessageDAO {
  static async create(data: Message): Promise<Doc<Message>> {
    await dbConnect();
    return toDoc<Message>(await MessageModel.create(data));
  }

  static async findById(
    id: string | Types.ObjectId
  ): Promise<Doc<Message> | null> {
    await dbConnect();
    if (!Types.ObjectId.isValid(id)) return null;
    return MessageModel.findById(id).lean<Doc<Message>>();
  }

  static async findByThread(
    threadId: string | Types.ObjectId
  ): Promise<Doc<Message>[]> {
    await dbConnect();
    return MessageModel.find({ threadId })
      .sort({ sentAt: 1 })
      .lean<Doc<Message>[]>();
  }

  /** The latest message in each thread, for list previews. */
  static async latestByThreads(
    threadIds: Types.ObjectId[]
  ): Promise<Map<string, Doc<Message>>> {
    await dbConnect();
    const rows = await MessageModel.aggregate<Doc<Message>>([
      { $match: { threadId: { $in: threadIds } } },
      { $sort: { sentAt: -1 } },
      { $group: { _id: "$threadId", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } },
    ]);
    return new Map(rows.map((row) => [row.threadId.toString(), row]));
  }

  /** Messages in a thread from other participants sent after the reader's last read time. */
  static async countUnread(
    threadId: Types.ObjectId,
    readerId: string | Types.ObjectId,
    lastReadAt?: Date
  ): Promise<number> {
    await dbConnect();
    return MessageModel.countDocuments({
      threadId,
      senderId: { $ne: new Types.ObjectId(readerId) },
      ...(lastReadAt ? { sentAt: { $gt: lastReadAt } } : {}),
    });
  }

  static async countBySenderSince(
    senderId: string | Types.ObjectId,
    since: Date
  ): Promise<number> {
    await dbConnect();
    return MessageModel.countDocuments({ senderId, sentAt: { $gte: since } });
  }

  static async updateById(
    id: string | Types.ObjectId,
    updates: UpdateQuery<Message>
  ): Promise<Doc<Message> | null> {
    await dbConnect();
    return MessageModel.findByIdAndUpdate(id, updates, {
      returnDocument: "after",
    }).lean<Doc<Message>>();
  }

  /** When this sender last triggered an email in the thread, for hourly collapsing. */
  static async lastNotifiedAt(
    threadId: Types.ObjectId,
    senderId: string | Types.ObjectId
  ): Promise<Date | null> {
    await dbConnect();
    const row = await MessageModel.findOne({
      threadId,
      senderId,
      notifiedAt: { $ne: null },
    })
      .sort({ notifiedAt: -1 })
      .select("notifiedAt")
      .lean<{ notifiedAt: Date }>();
    return row?.notifiedAt ?? null;
  }

  static async findUnnotified(): Promise<Doc<Message>[]> {
    await dbConnect();
    return MessageModel.find({ notifiedAt: null })
      .sort({ sentAt: 1 })
      .lean<Doc<Message>[]>();
  }

  static async markNotified(ids: Types.ObjectId[], at: Date): Promise<void> {
    await dbConnect();
    await MessageModel.updateMany({ _id: { $in: ids } }, { notifiedAt: at });
  }

  /** Thread ids that contain at least one reported message. */
  static async reportedThreadIds(): Promise<Types.ObjectId[]> {
    await dbConnect();
    return MessageModel.distinct("threadId", { reportedAt: { $ne: null } });
  }
}
