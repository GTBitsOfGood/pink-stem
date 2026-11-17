import { Types } from "mongoose";
import dbConnect from "@/db/dbConnect";
import ClearanceModel from "@/db/models/clearance";
import type { Doc } from "@/types/models";
import type { Clearance, ClearanceStatus } from "@/types/user";

export default class ClearanceDAO {
  static async findByUser(
    userId: string | Types.ObjectId
  ): Promise<Doc<Clearance> | null> {
    await dbConnect();
    return ClearanceModel.findOne({ userId }).lean<Doc<Clearance>>();
  }

  static async findByUsers(
    userIds: (string | Types.ObjectId)[]
  ): Promise<Doc<Clearance>[]> {
    await dbConnect();
    return ClearanceModel.find({ userId: { $in: userIds } }).lean<
      Doc<Clearance>[]
    >();
  }

  static async upsert(
    userId: string | Types.ObjectId,
    data: Omit<Clearance, "userId">
  ): Promise<Doc<Clearance>> {
    await dbConnect();
    return ClearanceModel.findOneAndUpdate({ userId }, data, {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
    }).lean<Doc<Clearance>>() as Promise<Doc<Clearance>>;
  }

  static async findUserIdsByStatus(
    status: ClearanceStatus
  ): Promise<Types.ObjectId[]> {
    await dbConnect();
    const rows = await ClearanceModel.find({ status })
      .select("userId")
      .lean<{ userId: Types.ObjectId }[]>();
    return rows.map((row) => row.userId);
  }

  /** Cleared records whose expiry falls inside the window. */
  static async findExpiringBetween(
    from: Date,
    to: Date
  ): Promise<Doc<Clearance>[]> {
    await dbConnect();
    return ClearanceModel.find({
      status: "cleared",
      expiresOn: { $gte: from, $lte: to },
    }).lean<Doc<Clearance>[]>();
  }

  /** Records still marked cleared whose expiry has passed. */
  static async findLapsed(now: Date): Promise<Doc<Clearance>[]> {
    await dbConnect();
    return ClearanceModel.find({
      status: "cleared",
      expiresOn: { $lt: now },
    }).lean<Doc<Clearance>[]>();
  }

  /** Marks one lapsed record expired, unless it was renewed since it was read. */
  static async markExpired(id: Types.ObjectId, now: Date): Promise<void> {
    await dbConnect();
    await ClearanceModel.updateOne(
      { _id: id, status: "cleared", expiresOn: { $lt: now } },
      { status: "expired" }
    );
  }
}
