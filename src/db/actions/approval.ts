import { Types } from "mongoose";
import dbConnect from "@/db/dbConnect";
import ClearanceModel from "@/db/models/clearance";
import EventModel from "@/db/models/event";
import MessageModel from "@/db/models/message";
import MessageThreadModel from "@/db/models/messageThread";
import SignupModel from "@/db/models/signup";
import type { Event } from "@/types/event";
import type { MessageThread } from "@/types/message";
import type { Doc } from "@/types/models";
import type { ApprovalCounts } from "@/types/api";
import type { ApprovalQueue } from "@/utils/validation/admin";
import { paginate } from "@/utils/validation/common";

type IdRow = { _id: Types.ObjectId };

/** Bounded database reads for the four admin approval queues. */
export default class ApprovalDAO {
  static async counts(now: Date): Promise<ApprovalCounts> {
    await dbConnect();
    const [clearances, awaitingClearance, rosters, reportedThreads] =
      await Promise.all([
        ClearanceModel.countDocuments({ status: "submitted" }),
        SignupModel.aggregate<{ total: number }>([
          { $match: { status: "pending", pendingReasons: "clearance" } },
          { $group: { _id: "$volunteerId" } },
          { $count: "total" },
        ]),
        EventModel.countDocuments({
          status: "published",
          eventDate: { $lt: now },
        }),
        MessageModel.aggregate<{ total: number }>([
          { $match: { reportedAt: { $ne: null }, reviewedAt: null } },
          { $group: { _id: "$threadId" } },
          { $count: "total" },
        ]),
      ]);
    return {
      clearances,
      awaitingClearance: awaitingClearance[0]?.total ?? 0,
      rosters,
      reportedThreads: reportedThreads[0]?.total ?? 0,
    };
  }

  static async page(
    queue: ApprovalQueue,
    page: number,
    now: Date
  ): Promise<Types.ObjectId[] | Doc<Event>[] | Doc<MessageThread>[]> {
    await dbConnect();
    const { skip, limit } = paginate(page);
    if (queue === "clearances") {
      const rows = await ClearanceModel.find({ status: "submitted" })
        .sort({ userId: 1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .select("userId")
        .lean<{ userId: Types.ObjectId }[]>();
      return rows.map((row) => row.userId);
    }
    if (queue === "awaitingClearance") {
      const rows = await SignupModel.aggregate<IdRow>([
        { $match: { status: "pending", pendingReasons: "clearance" } },
        { $group: { _id: "$volunteerId" } },
        { $sort: { _id: 1 } },
        { $skip: skip },
        { $limit: limit },
      ]);
      return rows.map((row) => row._id);
    }
    if (queue === "rosters") {
      return EventModel.find({
        status: "published",
        eventDate: { $lt: now },
      })
        .sort({ eventDate: 1, _id: 1 })
        .skip(skip)
        .limit(limit)
        .lean<Doc<Event>[]>();
    }
    const ids = await MessageModel.aggregate<IdRow>([
      { $match: { reportedAt: { $ne: null }, reviewedAt: null } },
      { $group: { _id: "$threadId" } },
      { $sort: { _id: 1 } },
      { $skip: skip },
      { $limit: limit },
    ]);
    const order = new Map(ids.map((row, index) => [row._id.toString(), index]));
    const threads = await MessageThreadModel.find({
      _id: { $in: ids.map((row) => row._id) },
    }).lean<Doc<MessageThread>[]>();
    return threads.sort(
      (a, b) =>
        (order.get(a._id.toString()) ?? 0) - (order.get(b._id.toString()) ?? 0)
    );
  }
}
