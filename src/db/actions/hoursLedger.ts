import { Types } from "mongoose";
import dbConnect from "@/db/dbConnect";
import { toDoc } from "@/db/defineModel";
import HoursLedgerModel from "@/db/models/hoursLedger";
import type { ProgramArea } from "@/types/event";
import type { Doc } from "@/types/models";
import type { HoursLedgerEntry } from "@/types/signup";

export interface HoursByEventRow {
  eventId: Types.ObjectId;
  eventTitle: string;
  eventDate: Date;
  programArea: ProgramArea;
  hours: number;
  volunteers: number;
}

/**
 * The ledger is the source of truth for hour totals. This class deliberately
 * exposes no update or delete: corrections are new rows.
 */
export default class HoursLedgerDAO {
  static async create(entry: HoursLedgerEntry): Promise<Doc<HoursLedgerEntry>> {
    await dbConnect();
    return toDoc<HoursLedgerEntry>(await HoursLedgerModel.create(entry));
  }

  static async createMany(entries: HoursLedgerEntry[]): Promise<void> {
    await dbConnect();
    if (entries.length) await HoursLedgerModel.insertMany(entries);
  }

  static async findById(
    id: string | Types.ObjectId
  ): Promise<Doc<HoursLedgerEntry> | null> {
    await dbConnect();
    return HoursLedgerModel.findById(id).lean<Doc<HoursLedgerEntry>>();
  }

  static async findByVolunteer(
    volunteerId: string | Types.ObjectId
  ): Promise<Doc<HoursLedgerEntry>[]> {
    await dbConnect();
    return HoursLedgerModel.find({ volunteerId })
      .sort({ approvedAt: -1 })
      .lean<Doc<HoursLedgerEntry>[]>();
  }

  static async findByVolunteerAndEvent(
    volunteerId: string | Types.ObjectId,
    eventId: string | Types.ObjectId
  ): Promise<Doc<HoursLedgerEntry>[]> {
    await dbConnect();
    return HoursLedgerModel.find({ volunteerId, eventId })
      .sort({ approvedAt: 1 })
      .lean<Doc<HoursLedgerEntry>[]>();
  }

  static async totalForVolunteer(
    volunteerId: string | Types.ObjectId
  ): Promise<number> {
    await dbConnect();
    const rows = await HoursLedgerModel.aggregate<{ total: number }>([
      { $match: { volunteerId: new Types.ObjectId(volunteerId) } },
      { $group: { _id: null, total: { $sum: "$hours" } } },
    ]);
    return rows[0]?.total ?? 0;
  }

  static async totalsForVolunteers(
    volunteerIds: Types.ObjectId[]
  ): Promise<Map<string, number>> {
    await dbConnect();
    const rows = await HoursLedgerModel.aggregate<{
      _id: Types.ObjectId;
      total: number;
    }>([
      { $match: { volunteerId: { $in: volunteerIds } } },
      { $group: { _id: "$volunteerId", total: { $sum: "$hours" } } },
    ]);
    return new Map(rows.map((row) => [row._id.toString(), row.total]));
  }

  /** Net hours per event for a volunteer within a window, for service records. */
  static async hoursByEventForVolunteer(
    volunteerId: string | Types.ObjectId,
    from: Date,
    to: Date
  ): Promise<{ eventId: Types.ObjectId; hours: number }[]> {
    await dbConnect();
    return HoursLedgerModel.aggregate([
      { $match: { volunteerId: new Types.ObjectId(volunteerId) } },
      {
        $lookup: {
          from: "events",
          localField: "eventId",
          foreignField: "_id",
          as: "event",
        },
      },
      { $unwind: "$event" },
      { $match: { "event.eventDate": { $gte: from, $lte: to } } },
      { $group: { _id: "$eventId", hours: { $sum: "$hours" } } },
      { $match: { hours: { $gt: 0 } } },
      { $project: { _id: 0, eventId: "$_id", hours: 1 } },
    ]);
  }

  /** Net hours and distinct volunteers per event for events dated in the window. */
  static async hoursByEvent(from: Date, to: Date): Promise<HoursByEventRow[]> {
    await dbConnect();
    return HoursLedgerModel.aggregate<HoursByEventRow>([
      {
        $lookup: {
          from: "events",
          localField: "eventId",
          foreignField: "_id",
          as: "event",
        },
      },
      { $unwind: "$event" },
      { $match: { "event.eventDate": { $gte: from, $lte: to } } },
      {
        $group: {
          _id: "$eventId",
          eventTitle: { $first: "$event.title" },
          eventDate: { $first: "$event.eventDate" },
          programArea: { $first: "$event.programArea" },
          hours: { $sum: "$hours" },
          volunteerIds: { $addToSet: "$volunteerId" },
        },
      },
      {
        $project: {
          _id: 0,
          eventId: "$_id",
          eventTitle: 1,
          eventDate: 1,
          programArea: 1,
          hours: 1,
          volunteers: { $size: "$volunteerIds" },
        },
      },
      { $sort: { eventDate: 1 } },
    ]);
  }

  /** Net hours and distinct events per volunteer for events dated in the window. */
  static async hoursByVolunteer(
    from: Date,
    to: Date
  ): Promise<{ volunteerId: Types.ObjectId; hours: number; events: number }[]> {
    await dbConnect();
    return HoursLedgerModel.aggregate([
      {
        $lookup: {
          from: "events",
          localField: "eventId",
          foreignField: "_id",
          as: "event",
        },
      },
      { $unwind: "$event" },
      { $match: { "event.eventDate": { $gte: from, $lte: to } } },
      {
        $group: {
          _id: "$volunteerId",
          hours: { $sum: "$hours" },
          eventIds: { $addToSet: "$eventId" },
        },
      },
      {
        $project: {
          _id: 0,
          volunteerId: "$_id",
          hours: 1,
          events: { $size: "$eventIds" },
        },
      },
      { $sort: { hours: -1 } },
    ]);
  }

  static async grandTotal(): Promise<number> {
    await dbConnect();
    const rows = await HoursLedgerModel.aggregate<{ total: number }>([
      { $group: { _id: null, total: { $sum: "$hours" } } },
    ]);
    return rows[0]?.total ?? 0;
  }
}
