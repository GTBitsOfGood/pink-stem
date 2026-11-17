import { Types, UpdateQuery } from "mongoose";
import dbConnect from "@/db/dbConnect";
import { toDoc } from "@/db/defineModel";
import ShiftModel from "@/db/models/shift";
import type { Shift, ShiftCounters } from "@/types/event";
import type { Doc } from "@/types/models";

export type NewShift = Omit<Shift, "filledCount" | "waitlistCount">;

export default class ShiftDAO {
  static async create(data: NewShift): Promise<Doc<Shift>> {
    await dbConnect();
    return toDoc<Shift>(await ShiftModel.create(data));
  }

  static async createMany(data: NewShift[]): Promise<Doc<Shift>[]> {
    await dbConnect();
    const created = await ShiftModel.insertMany(data);
    return created.map((doc) => toDoc<Shift>(doc));
  }

  static async findById(
    id: string | Types.ObjectId
  ): Promise<Doc<Shift> | null> {
    await dbConnect();
    if (!Types.ObjectId.isValid(id)) return null;
    return ShiftModel.findById(id).lean<Doc<Shift>>();
  }

  static async findByIds(
    ids: (string | Types.ObjectId)[]
  ): Promise<Doc<Shift>[]> {
    await dbConnect();
    return ShiftModel.find({ _id: { $in: ids } })
      .sort({ startsAt: 1 })
      .lean<Doc<Shift>[]>();
  }

  static async findByEvent(
    eventId: string | Types.ObjectId
  ): Promise<Doc<Shift>[]> {
    await dbConnect();
    return ShiftModel.find({ eventId })
      .sort({ startsAt: 1 })
      .lean<Doc<Shift>[]>();
  }

  static async findByEvents(
    eventIds: (string | Types.ObjectId)[]
  ): Promise<Doc<Shift>[]> {
    await dbConnect();
    return ShiftModel.find({ eventId: { $in: eventIds } })
      .sort({ startsAt: 1 })
      .lean<Doc<Shift>[]>();
  }

  /** Shifts that have not ended yet, the only ones whose capacity still matters. */
  static async findUnfinishedByEvents(
    eventIds: Types.ObjectId[]
  ): Promise<Doc<Shift>[]> {
    await dbConnect();
    return ShiftModel.find({
      eventId: { $in: eventIds },
      endsAt: { $gt: new Date() },
    }).lean<Doc<Shift>[]>();
  }

  static async updateById(
    id: string | Types.ObjectId,
    updates: UpdateQuery<Shift>
  ): Promise<Doc<Shift> | null> {
    await dbConnect();
    return ShiftModel.findByIdAndUpdate(id, updates, {
      returnDocument: "after",
      runValidators: true,
    }).lean<Doc<Shift>>();
  }

  /**
   * Deletes the shift only while nobody holds a spot or a waitlist place.
   * Sign-ups bump these counters before they are saved, so one in flight
   * blocks the delete.
   */
  static async deleteIfEmpty(id: string | Types.ObjectId): Promise<boolean> {
    await dbConnect();
    const { deletedCount } = await ShiftModel.deleteOne({
      _id: id,
      filledCount: 0,
      waitlistCount: 0,
    });
    return deletedCount > 0;
  }

  /**
   * Atomically takes one spot. The filter and increment run as a single
   * document operation, so two volunteers racing for the last spot cannot
   * both succeed: the loser gets `null` and is offered the waitlist.
   */
  /** Updates the shift only while it holds no more than `capacity` spots. */
  static async updateCapacity(
    id: string | Types.ObjectId,
    updates: UpdateQuery<Shift> & { capacity: number }
  ): Promise<Doc<Shift> | null> {
    await dbConnect();
    return ShiftModel.findOneAndUpdate(
      { _id: id, filledCount: { $lte: updates.capacity } },
      updates,
      { returnDocument: "after", runValidators: true }
    ).lean<Doc<Shift>>();
  }

  static async claimSpot(
    id: string | Types.ObjectId
  ): Promise<Doc<Shift> | null> {
    await dbConnect();
    return ShiftModel.findOneAndUpdate(
      { _id: id, $expr: { $lt: ["$filledCount", "$capacity"] } },
      { $inc: { filledCount: 1 } },
      { returnDocument: "after" }
    ).lean<Doc<Shift>>();
  }

  static async releaseSpot(id: string | Types.ObjectId): Promise<void> {
    await dbConnect();
    await ShiftModel.updateOne(
      { _id: id, filledCount: { $gt: 0 } },
      { $inc: { filledCount: -1 } }
    );
  }

  /** Returns false when no shift was updated, e.g. it has been deleted. */
  static async adjustWaitlist(
    id: string | Types.ObjectId,
    delta: number
  ): Promise<boolean> {
    await dbConnect();
    const filter =
      delta < 0 ? { _id: id, waitlistCount: { $gt: 0 } } : { _id: id };
    const { matchedCount } = await ShiftModel.updateOne(filter, {
      $inc: { waitlistCount: delta },
    });
    return matchedCount > 0;
  }

  /**
   * Overwrites both counters only if the shift has not been written since
   * `updatedAt` was read, so a concurrent claim or release wins.
   */
  static async setCountersIfUnchanged(
    shift: Pick<Doc<Shift>, "_id" | "updatedAt">,
    counters: ShiftCounters
  ): Promise<boolean> {
    await dbConnect();
    const result = await ShiftModel.updateOne(
      { _id: shift._id, updatedAt: shift.updatedAt },
      { $set: counters }
    );
    return result.modifiedCount === 1;
  }

  static async findStartingBetween(
    from: Date,
    to: Date
  ): Promise<Doc<Shift>[]> {
    await dbConnect();
    return ShiftModel.find({ startsAt: { $gte: from, $lt: to } }).lean<
      Doc<Shift>[]
    >();
  }
}
