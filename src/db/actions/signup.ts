import { QueryFilter, Types, UpdateQuery } from "mongoose";
import dbConnect from "@/db/dbConnect";
import { toDoc } from "@/db/defineModel";
import SignupModel from "@/db/models/signup";
import type { ShiftCounters } from "@/types/event";
import type { Doc } from "@/types/models";
import {
  ACTIVE_SIGNUP_STATUSES,
  ATTENDANCE_STATUSES,
  type Signup,
  type SignupStatus,
} from "@/types/signup";

const SPOT_HOLDING_STATUSES = [
  ...ACTIVE_SIGNUP_STATUSES,
  ...ATTENDANCE_STATUSES,
];

type ShiftSignupCounts = ShiftCounters & { lastChangedAt: Date };

export default class SignupDAO {
  static async create(
    data: Omit<Signup, "attendance"> & Partial<Signup>
  ): Promise<Doc<Signup>> {
    await dbConnect();
    return toDoc<Signup>(await SignupModel.create(data));
  }

  static async findById(
    id: string | Types.ObjectId
  ): Promise<Doc<Signup> | null> {
    await dbConnect();
    if (!Types.ObjectId.isValid(id)) return null;
    return SignupModel.findById(id).lean<Doc<Signup>>();
  }

  static async findByShiftAndVolunteer(
    shiftId: string | Types.ObjectId,
    volunteerId: string | Types.ObjectId
  ): Promise<Doc<Signup> | null> {
    await dbConnect();
    return SignupModel.findOne({ shiftId, volunteerId }).lean<Doc<Signup>>();
  }

  static async find(filter: QueryFilter<Signup>): Promise<Doc<Signup>[]> {
    await dbConnect();
    return SignupModel.find(filter)
      .sort({ signedUpAt: 1 })
      .lean<Doc<Signup>[]>();
  }

  static async findByVolunteer(
    volunteerId: string | Types.ObjectId,
    statuses?: readonly SignupStatus[]
  ): Promise<Doc<Signup>[]> {
    return SignupDAO.find({
      volunteerId,
      ...(statuses ? { status: { $in: statuses } } : {}),
    });
  }

  static async findByEvent(
    eventId: string | Types.ObjectId,
    statuses?: readonly SignupStatus[]
  ): Promise<Doc<Signup>[]> {
    return SignupDAO.find({
      eventId,
      ...(statuses ? { status: { $in: statuses } } : {}),
    });
  }

  static async updateById(
    id: string | Types.ObjectId,
    updates: UpdateQuery<Signup>
  ): Promise<Doc<Signup> | null> {
    await dbConnect();
    return SignupModel.findByIdAndUpdate(id, updates, {
      returnDocument: "after",
      runValidators: true,
    }).lean<Doc<Signup>>();
  }

  /** Applies the update only while the sign-up is still in `status`. */
  static async updateByIdIfStatus(
    id: string | Types.ObjectId,
    status: SignupStatus,
    updates: UpdateQuery<Signup>
  ): Promise<Doc<Signup> | null> {
    await dbConnect();
    return SignupModel.findOneAndUpdate({ _id: id, status }, updates, {
      returnDocument: "after",
      runValidators: true,
    }).lean<Doc<Signup>>();
  }

  static async updateMany(
    filter: QueryFilter<Signup>,
    updates: UpdateQuery<Signup>
  ): Promise<void> {
    await dbConnect();
    await SignupModel.updateMany(filter, updates);
  }

  /** The waitlist is ordered by sign-up time; the earliest is promoted first. */
  static async firstWaitlisted(
    shiftId: string | Types.ObjectId
  ): Promise<Doc<Signup> | null> {
    await dbConnect();
    return SignupModel.findOne({ shiftId, status: "waitlisted" })
      .sort({ signedUpAt: 1 })
      .lean<Doc<Signup>>();
  }

  static async countNoShowsSince(
    volunteerId: string | Types.ObjectId,
    since: Date
  ): Promise<number> {
    await dbConnect();
    return SignupModel.countDocuments({
      volunteerId,
      status: "no_show",
      "attendance.markedAt": { $gte: since },
    });
  }

  static async count(filter: QueryFilter<Signup>): Promise<number> {
    await dbConnect();
    return SignupModel.countDocuments(filter);
  }

  /**
   * What each shift's counters should be. Pending and confirmed sign-ups hold
   * a spot, and so do attended/no-show ones, since roster approval moves them
   * there without releasing it; waitlisted ones hold a waitlist place.
   * `lastChangedAt` spans every status, so a just-cancelled sign-up counts.
   */
  static async countCapacityByShifts(
    shiftIds: Types.ObjectId[]
  ): Promise<Map<string, ShiftSignupCounts>> {
    await dbConnect();
    const rows = await SignupModel.aggregate<
      ShiftSignupCounts & { _id: Types.ObjectId }
    >([
      { $match: { shiftId: { $in: shiftIds } } },
      {
        $group: {
          _id: "$shiftId",
          filledCount: {
            $sum: {
              $cond: [{ $in: ["$status", SPOT_HOLDING_STATUSES] }, 1, 0],
            },
          },
          waitlistCount: {
            $sum: { $cond: [{ $eq: ["$status", "waitlisted"] }, 1, 0] },
          },
          lastChangedAt: { $max: "$updatedAt" },
        },
      },
    ]);
    return new Map(rows.map(({ _id, ...counts }) => [_id.toString(), counts]));
  }

  /** Sign-ups per event in the given statuses, for fill and no-show reporting. */
  static async countByEvents(
    eventIds: Types.ObjectId[],
    statuses: readonly SignupStatus[]
  ): Promise<Map<string, Partial<Record<SignupStatus, number>>>> {
    await dbConnect();
    const rows = await SignupModel.aggregate<{
      _id: { eventId: Types.ObjectId; status: SignupStatus };
      count: number;
    }>([
      { $match: { eventId: { $in: eventIds }, status: { $in: statuses } } },
      {
        $group: {
          _id: { eventId: "$eventId", status: "$status" },
          count: { $sum: 1 },
        },
      },
    ]);
    const map = new Map<string, Partial<Record<SignupStatus, number>>>();
    for (const row of rows) {
      const key = row._id.eventId.toString();
      map.set(key, { ...(map.get(key) ?? {}), [row._id.status]: row.count });
    }
    return map;
  }

  /** Volunteers with attended sign-ups on at least `minEvents` distinct events since a date. */
  static async countRepeatVolunteers(
    since: Date,
    minEvents: number
  ): Promise<number> {
    await dbConnect();
    const rows = await SignupModel.aggregate<{ count: number }>([
      {
        $match: { status: "attended", "attendance.markedAt": { $gte: since } },
      },
      { $group: { _id: "$volunteerId", events: { $addToSet: "$eventId" } } },
      { $match: { $expr: { $gte: [{ $size: "$events" }, minEvents] } } },
      { $count: "count" },
    ]);
    return rows[0]?.count ?? 0;
  }
}
