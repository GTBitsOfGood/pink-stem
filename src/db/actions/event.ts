import { QueryFilter, Types, UpdateQuery } from "mongoose";
import dbConnect from "@/db/dbConnect";
import { ensureIndexes, toDoc } from "@/db/defineModel";
import EventModel from "@/db/models/event";
import type { Event } from "@/types/event";
import type { Doc } from "@/types/models";

/** Lean reads skip schema defaults, so events from before programs read as short-term. */
const withCommitment = <T extends Doc<Event> | null>(event: T): T =>
  event && !event.commitment
    ? ({ ...event, commitment: "short_term" } as T)
    : event;

const withCommitments = (events: Doc<Event>[]) => events.map(withCommitment);

export type NewEvent = Omit<
  Event,
  | "status"
  | "commitment"
  | "publishedAt"
  | "completedAt"
  | "cancelledAt"
  | "cancelledBy"
> &
  Partial<Event>;

export default class EventDAO {
  static async create(data: NewEvent): Promise<Doc<Event>> {
    await dbConnect();
    return toDoc<Event>(await EventModel.create(data));
  }

  static async createMany(data: NewEvent[]): Promise<Doc<Event>[]> {
    await dbConnect();
    // A fresh database lacks the unique session index this relies on.
    await ensureIndexes(EventModel);
    const created = await EventModel.insertMany(data);
    return created.map((doc) => doc.toObject() as unknown as Doc<Event>);
  }

  static async findById(
    id: string | Types.ObjectId
  ): Promise<Doc<Event> | null> {
    await dbConnect();
    if (!Types.ObjectId.isValid(id)) return null;
    return withCommitment(await EventModel.findById(id).lean<Doc<Event>>());
  }

  static async findByIds(
    ids: (string | Types.ObjectId)[]
  ): Promise<Doc<Event>[]> {
    await dbConnect();
    return withCommitments(
      await EventModel.find({ _id: { $in: ids } }).lean<Doc<Event>[]>()
    );
  }

  static async updateById(
    id: string | Types.ObjectId,
    updates: UpdateQuery<Event>
  ): Promise<Doc<Event> | null> {
    await dbConnect();
    return withCommitment(
      await EventModel.findByIdAndUpdate(id, updates, {
        returnDocument: "after",
        runValidators: true,
      }).lean<Doc<Event>>()
    );
  }

  static async updateMany(
    filter: QueryFilter<Event>,
    updates: UpdateQuery<Event>
  ): Promise<void> {
    await dbConnect();
    await EventModel.updateMany(filter, updates, { runValidators: true });
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
    return { items: withCommitments(items), total };
  }

  static async findAll(filter: QueryFilter<Event>): Promise<Doc<Event>[]> {
    await dbConnect();
    return withCommitments(
      await EventModel.find(filter).sort({ eventDate: 1 }).lean<Doc<Event>[]>()
    );
  }

  static async deleteByIds(ids: Types.ObjectId[]): Promise<void> {
    await dbConnect();
    await EventModel.deleteMany({ _id: { $in: ids } });
  }

  static async count(filter: QueryFilter<Event>): Promise<number> {
    await dbConnect();
    return EventModel.countDocuments(filter);
  }
}
