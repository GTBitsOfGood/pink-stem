import { Types } from "mongoose";
import dbConnect from "@/db/dbConnect";
import ScreeningCheckModel from "@/db/models/screeningCheck";
import type { Doc } from "@/types/models";
import type { RegistryCheckResult, ScreeningCheck } from "@/types/screening";

export default class ScreeningCheckDAO {
  static async findByUser(
    userId: string | Types.ObjectId
  ): Promise<Doc<ScreeningCheck> | null> {
    await dbConnect();
    return ScreeningCheckModel.findOne({ userId }).lean<Doc<ScreeningCheck>>();
  }

  static async findByUsers(
    userIds: (string | Types.ObjectId)[]
  ): Promise<Doc<ScreeningCheck>[]> {
    await dbConnect();
    return ScreeningCheckModel.find({ userId: { $in: userIds } }).lean<
      Doc<ScreeningCheck>[]
    >();
  }

  static async findRerunRequested(): Promise<Doc<ScreeningCheck>[]> {
    await dbConnect();
    return ScreeningCheckModel.find({ rerunRequestedAt: { $ne: null } }).lean<
      Doc<ScreeningCheck>[]
    >();
  }

  static async requestRerun(
    userId: string | Types.ObjectId,
    adminId: string | Types.ObjectId,
    at: Date
  ): Promise<Doc<ScreeningCheck>> {
    await dbConnect();
    return ScreeningCheckModel.findOneAndUpdate(
      { userId },
      {
        rerunRequestedAt: at,
        rerunRequestedBy: new Types.ObjectId(adminId),
      },
      { upsert: true, returnDocument: "after", runValidators: true }
    ).lean<Doc<ScreeningCheck>>() as Promise<Doc<ScreeningCheck>>;
  }

  /**
   * Replaces the saved results. A rerun request made before `startedAt` is
   * answered by this run and cleared; one made during the run stays queued.
   */
  static async saveResults(
    userId: string | Types.ObjectId,
    results: RegistryCheckResult[],
    startedAt: Date
  ): Promise<void> {
    await dbConnect();
    await ScreeningCheckModel.updateOne(
      { userId },
      { results },
      { upsert: true, runValidators: true }
    );
    await ScreeningCheckModel.updateOne(
      { userId, rerunRequestedAt: { $lte: startedAt } },
      { rerunRequestedAt: null, rerunRequestedBy: null }
    );
  }
}
