import { QueryFilter, Types } from "mongoose";
import dbConnect from "@/db/dbConnect";
import AuditLogModel from "@/db/models/auditLog";
import type { AuditLog } from "@/types/audit";
import type { Doc } from "@/types/models";
import { paginate } from "@/utils/validation/common";

/** Append-only: there is intentionally no update or delete here. */
export default class AuditLogDAO {
  static async create(entry: Omit<AuditLog, "createdAt">): Promise<void> {
    await dbConnect();
    await AuditLogModel.create(entry);
  }

  static async list(
    filter: QueryFilter<AuditLog>,
    page: number
  ): Promise<{ items: Doc<AuditLog>[]; total: number }> {
    await dbConnect();
    const { skip, limit } = paginate(page);
    const [items, total] = await Promise.all([
      AuditLogModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<Doc<AuditLog>[]>(),
      AuditLogModel.countDocuments(filter),
    ]);
    return { items, total };
  }

  static async findAll(
    filter: QueryFilter<AuditLog>,
    limit = 5000
  ): Promise<Doc<AuditLog>[]> {
    await dbConnect();
    return AuditLogModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<Doc<AuditLog>[]>();
  }

  static async findForUser(
    userId: string | Types.ObjectId,
    limit = 100
  ): Promise<Doc<AuditLog>[]> {
    await dbConnect();
    return AuditLogModel.find({
      $or: [{ actorId: userId }, { entityType: "user", entityId: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<Doc<AuditLog>[]>();
  }
}
