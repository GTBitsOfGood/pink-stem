import { QueryFilter, Types, UpdateQuery } from "mongoose";
import dbConnect from "@/db/dbConnect";
import { toDoc } from "@/db/defineModel";
import EventModel from "@/db/models/event";
import type { Event } from "@/types/event";
import type { Doc } from "@/types/models";

export default class EventDAO {
  static async create(
    data: Omit<
      Event,
      "status" | "publishedAt" | "completedAt" | "cancelledAt" | "cancelledBy"
    > &
      Partial<Event>
  ): Promise<Doc<Event>> {
    await dbConnect();
    return toDoc<Event>(await EventModel.create(data));
  }

  static async findById(
    id: string | Types.ObjectId
  ): Promise<Doc<Event> | null> {
    await dbConnect();
    if (!Types.ObjectId.isValid(id)) return null;
    return EventModel.findById(id).lean<Doc<Event>>();
  }

  static async findByIds(
    ids: (string | Types.ObjectId)[]
  ): Promise<Doc<Event>[]> {
    await dbConnect();
    return EventModel.find({ _id: { $in: ids } }).lean<Doc<Event>[]>();
  }

  static async updateById(
    id: string | Types.ObjectId,
    updates: UpdateQuery<Event>
  ): Promise<Doc<Event> | null> {
    await dbConnect();
    return EventModel.findByIdAndUpdate(id, updates, {
      returnDocument: "after",
      runValidators: true,
    }).lean<Doc<Event>>();
  }

  static async list(
    filter: QueryFilter<Event>,
    options: {
      sort?: Record<string, 1 | -1>;
      skip?: number;
      limit?: number;
    } = {}
  ): Promise<{ items: Doc<Event>[]; total: number }> {
    await dbConnect();
    const query = EventModel.find(filter).sort(
      options.sort ?? { eventDate: 1 }
    );
    if (options.skip) query.skip(options.skip);
    if (options.limit) query.limit(options.limit);
    const [items, total] = await Promise.all([
      query.lean<Doc<Event>[]>(),
      EventModel.countDocuments(filter),
    ]);
    return { items, total };
  }

  static async findAll(filter: QueryFilter<Event>): Promise<Doc<Event>[]> {
    await dbConnect();
    return EventModel.find(filter).sort({ eventDate: 1 }).lean<Doc<Event>[]>();
  }

  static async count(filter: QueryFilter<Event>): Promise<number> {
    await dbConnect();
    return EventModel.countDocuments(filter);
  }
}
