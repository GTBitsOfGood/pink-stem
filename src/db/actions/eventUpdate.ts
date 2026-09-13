import { QueryFilter, Types, UpdateQuery } from "mongoose";
import dbConnect from "@/db/dbConnect";
import { toDoc } from "@/db/defineModel";
import EventUpdateModel from "@/db/models/eventUpdate";
import type { EventUpdate } from "@/types/event";
import type { Doc } from "@/types/models";

export default class EventUpdateDAO {
  static async create(data: EventUpdate): Promise<Doc<EventUpdate>> {
    await dbConnect();
    return toDoc<EventUpdate>(await EventUpdateModel.create(data));
  }

  static async findById(
    id: string | Types.ObjectId
  ): Promise<Doc<EventUpdate> | null> {
    await dbConnect();
    if (!Types.ObjectId.isValid(id)) return null;
    return EventUpdateModel.findById(id).lean<Doc<EventUpdate>>();
  }

  /** Newest first, with pinned important changes ahead of everything else. */
  static async findByEvent(
    eventId: string | Types.ObjectId,
    options: { includeRosterOnly: boolean }
  ): Promise<Doc<EventUpdate>[]> {
    await dbConnect();
    const filter: QueryFilter<EventUpdate> = { eventId, deletedAt: null };
    if (!options.includeRosterOnly) filter.rosterOnly = false;
    return EventUpdateModel.find(filter)
      .sort({ pinned: -1, postedAt: -1 })
      .lean<Doc<EventUpdate>[]>();
  }

  static async updateById(
    id: string | Types.ObjectId,
    updates: UpdateQuery<EventUpdate>
  ): Promise<Doc<EventUpdate> | null> {
    await dbConnect();
    return EventUpdateModel.findByIdAndUpdate(id, updates, {
      returnDocument: "after",
    }).lean<Doc<EventUpdate>>();
  }

  static async unpinForEvent(eventId: string | Types.ObjectId): Promise<void> {
    await dbConnect();
    await EventUpdateModel.updateMany(
      { eventId, pinned: true },
      { pinned: false }
    );
  }

  /** Notes that have not yet gone out in a daily digest. */
  static async findUnnotifiedNotes(): Promise<Doc<EventUpdate>[]> {
    await dbConnect();
    return EventUpdateModel.find({
      kind: "note",
      notifiedAt: null,
      deletedAt: null,
    })
      .sort({ postedAt: 1 })
      .lean<Doc<EventUpdate>[]>();
  }

  static async markNotified(ids: Types.ObjectId[], at: Date): Promise<void> {
    await dbConnect();
    await EventUpdateModel.updateMany(
      { _id: { $in: ids } },
      { notifiedAt: at }
    );
  }
}
