import { Types, UpdateQuery } from "mongoose";
import dbConnect from "@/db/dbConnect";
import { toDoc } from "@/db/defineModel";
import ShiftModel from "@/db/models/shift";
import type { Shift } from "@/types/event";
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

  static async deleteById(id: string | Types.ObjectId): Promise<void> {
    await dbConnect();
    await ShiftModel.deleteOne({ _id: id });
  }

  /**
   * Atomically takes one spot. The filter and increment run as a single
   * document operation, so two volunteers racing for the last spot cannot
   * both succeed: the loser gets `null` and is offered the waitlist.
   */
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

  static async adjustWaitlist(
    id: string | Types.ObjectId,
    delta: number
  ): Promise<void> {
    await dbConnect();
    const filter =
      delta < 0 ? { _id: id, waitlistCount: { $gt: 0 } } : { _id: id };
    await ShiftModel.updateOne(filter, { $inc: { waitlistCount: delta } });
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
