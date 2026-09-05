import { QueryFilter, Types, UpdateQuery } from "mongoose";
import dbConnect from "@/db/dbConnect";
import { toDoc } from "@/db/defineModel";
import UserModel from "@/db/models/user";
import type { Doc } from "@/types/models";
import {
  Role,
  SafeUser,
  User,
  USER_PRIVATE_FIELDS,
  UserSummary,
} from "@/types/user";
import { escapeRegex } from "@/lib/utils";
import { paginate } from "@/utils/validation/common";

export type NewUser = Pick<
  User,
  "email" | "provider" | "role" | "firstName" | "lastName"
> &
  Partial<User>;

export interface UserSearch {
  q?: string;
  role?: Role;
  status?: User["status"];
  flagged?: boolean;
  ids?: Types.ObjectId[];
  notIds?: Types.ObjectId[];
  page: number;
}

const SUMMARY_FIELDS = "firstName lastName email phone skills role status";

/**
 * Data access for users. Private fields (`passwordHash`, `sessionVersion`)
 * are `select: false` on the schema, so only the two `findAuth*` methods
 * ever load them.
 */
export default class UserDAO {
  /** Strips the fields that must never reach a client. */
  static toSafe(user: Doc<User>): Doc<SafeUser> {
    const hidden: readonly string[] = USER_PRIVATE_FIELDS;
    return Object.fromEntries(
      Object.entries(user).filter(([key]) => !hidden.includes(key))
    ) as Doc<SafeUser>;
  }

  static async create(data: NewUser): Promise<Doc<User>> {
    await dbConnect();
    return toDoc<User>(await UserModel.create(data));
  }

  static async findById(
    id: string | Types.ObjectId
  ): Promise<Doc<SafeUser> | null> {
    await dbConnect();
    return UserModel.findById(id).lean<Doc<SafeUser>>();
  }

  static async findByEmail(email: string): Promise<Doc<SafeUser> | null> {
    await dbConnect();
    return UserModel.findOne({ email: email.toLowerCase() }).lean<
      Doc<SafeUser>
    >();
  }

  static async findAuthByEmail(email: string): Promise<Doc<User> | null> {
    await dbConnect();
    return UserModel.findOne({ email: email.toLowerCase() })
      .select("+passwordHash +sessionVersion")
      .lean<Doc<User>>();
  }

  static async findAuthById(
    id: string | Types.ObjectId
  ): Promise<Doc<User> | null> {
    await dbConnect();
    if (!Types.ObjectId.isValid(id)) return null;
    return UserModel.findById(id).select("+sessionVersion").lean<Doc<User>>();
  }

  static async updateById(
    id: string | Types.ObjectId,
    updates: UpdateQuery<User>
  ): Promise<Doc<SafeUser> | null> {
    await dbConnect();
    return UserModel.findByIdAndUpdate(id, updates, {
      returnDocument: "after",
      runValidators: true,
    }).lean<Doc<SafeUser>>();
  }

  /** Changing the password signs every other session out. */
  static async setPassword(
    id: string | Types.ObjectId,
    passwordHash: string
  ): Promise<void> {
    await dbConnect();
    await UserModel.updateOne(
      { _id: id },
      { passwordHash, $inc: { sessionVersion: 1 } }
    );
  }

  static async bumpSessionVersion(id: string | Types.ObjectId): Promise<void> {
    await dbConnect();
    await UserModel.updateOne({ _id: id }, { $inc: { sessionVersion: 1 } });
  }

  static async findSummaries(
    ids: (string | Types.ObjectId)[]
  ): Promise<UserSummary[]> {
    await dbConnect();
    return UserModel.find({ _id: { $in: ids } })
      .select(SUMMARY_FIELDS)
      .lean<UserSummary[]>();
  }

  static async listByRole(role: Role): Promise<Doc<SafeUser>[]> {
    await dbConnect();
    return UserModel.find({ role, status: "active" }).lean<Doc<SafeUser>[]>();
  }

  static async search(
    search: UserSearch
  ): Promise<{ items: Doc<SafeUser>[]; total: number }> {
    await dbConnect();
    const filter: QueryFilter<User> = {};
    if (search.q) {
      const re = new RegExp(escapeRegex(search.q), "i");
      filter.$or = [{ firstName: re }, { lastName: re }, { email: re }];
    }
    if (search.role) filter.role = search.role;
    if (search.status) filter.status = search.status;
    if (search.flagged) filter.flaggedForReviewAt = { $ne: null };
    if (search.ids) filter._id = { $in: search.ids };
    if (search.notIds)
      filter._id = { ...(filter._id ?? {}), $nin: search.notIds };

    const { skip, limit } = paginate(search.page);
    const [items, total] = await Promise.all([
      UserModel.find(filter)
        .sort({ lastName: 1, firstName: 1 })
        .skip(skip)
        .limit(limit)
        .lean<Doc<SafeUser>[]>(),
      UserModel.countDocuments(filter),
    ]);
    return { items, total };
  }

  static async count(filter: QueryFilter<User>): Promise<number> {
    await dbConnect();
    return UserModel.countDocuments(filter);
  }
}
