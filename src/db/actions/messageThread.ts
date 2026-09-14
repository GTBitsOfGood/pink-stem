import { QueryFilter, Types, UpdateQuery } from "mongoose";
import dbConnect from "@/db/dbConnect";
import { toDoc } from "@/db/defineModel";
import MessageThreadModel from "@/db/models/messageThread";
import type { MessageThread } from "@/types/message";
import type { Doc } from "@/types/models";
import { paginate } from "@/utils/validation/common";

export default class MessageThreadDAO {
  static async create(
    data: Omit<MessageThread, "lastReadAt"> & Partial<MessageThread>
  ): Promise<Doc<MessageThread>> {
    await dbConnect();
    return toDoc<MessageThread>(await MessageThreadModel.create(data));
  }

  static async findById(
    id: string | Types.ObjectId
  ): Promise<Doc<MessageThread> | null> {
    await dbConnect();
    if (!Types.ObjectId.isValid(id)) return null;
    return MessageThreadModel.findById(id).lean<Doc<MessageThread>>();
  }

  static async findByEventAndVolunteer(
    eventId: string | Types.ObjectId,
    volunteerId: string | Types.ObjectId
  ): Promise<Doc<MessageThread> | null> {
    await dbConnect();
    return MessageThreadModel.findOne({ eventId, volunteerId }).lean<
      Doc<MessageThread>
    >();
  }

  static async list(
    filter: QueryFilter<MessageThread>,
    page: number
  ): Promise<{ items: Doc<MessageThread>[]; total: number }> {
    await dbConnect();
    const { skip, limit } = paginate(page);
    const [items, total] = await Promise.all([
      MessageThreadModel.find(filter)
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<Doc<MessageThread>[]>(),
      MessageThreadModel.countDocuments(filter),
    ]);
    return { items, total };
  }

  static async findAll(
    filter: QueryFilter<MessageThread>
  ): Promise<Doc<MessageThread>[]> {
    await dbConnect();
    return MessageThreadModel.find(filter).lean<Doc<MessageThread>[]>();
  }

  static async updateById(
    id: string | Types.ObjectId,
    updates: UpdateQuery<MessageThread>
  ): Promise<Doc<MessageThread> | null> {
    await dbConnect();
    return MessageThreadModel.findByIdAndUpdate(id, updates, {
      returnDocument: "after",
    }).lean<Doc<MessageThread>>();
  }

  static async updateMany(
    filter: QueryFilter<MessageThread>,
    updates: UpdateQuery<MessageThread>
  ): Promise<void> {
    await dbConnect();
    await MessageThreadModel.updateMany(filter, updates);
  }

  static async count(filter: QueryFilter<MessageThread>): Promise<number> {
    await dbConnect();
    return MessageThreadModel.countDocuments(filter);
  }
}
