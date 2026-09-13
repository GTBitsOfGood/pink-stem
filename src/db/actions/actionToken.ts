import { Types } from "mongoose";
import dbConnect from "@/db/dbConnect";
import ActionTokenModel from "@/db/models/actionToken";
import { generateSecret, hashSecret } from "@/lib/tokens";
import type { Doc } from "@/types/models";
import type { ActionToken, TokenPurpose } from "@/types/token";

type NewToken = Omit<ActionToken, "tokenHash" | "expiresAt" | "usedAt"> & {
  ttlMs: number;
};

export default class ActionTokenDAO {
  /** Issues a new link, invalidating earlier ones for the same email and purpose. Returns the raw secret. */
  static async issue({
    ttlMs,
    ...data
  }: NewToken): Promise<{ secret: string; id: Types.ObjectId }> {
    await dbConnect();
    await ActionTokenModel.deleteMany({
      email: data.email,
      purpose: data.purpose,
      usedAt: null,
    });
    const secret = generateSecret();
    const created = await ActionTokenModel.create({
      ...data,
      tokenHash: hashSecret(secret),
      expiresAt: new Date(Date.now() + ttlMs),
    });
    return { secret, id: created._id };
  }

  static async findValid(
    secret: string,
    purpose: TokenPurpose
  ): Promise<Doc<ActionToken> | null> {
    await dbConnect();
    return ActionTokenModel.findOne({
      tokenHash: hashSecret(secret),
      purpose,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    }).lean<Doc<ActionToken>>();
  }

  /** Marks the token used in the same operation that reads it, so a link works exactly once. */
  static async consume(
    secret: string,
    purpose: TokenPurpose
  ): Promise<Doc<ActionToken> | null> {
    await dbConnect();
    return ActionTokenModel.findOneAndUpdate(
      {
        tokenHash: hashSecret(secret),
        purpose,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      },
      { usedAt: new Date() },
      { returnDocument: "after" }
    ).lean<Doc<ActionToken>>();
  }

  static async findPendingInvites(): Promise<Doc<ActionToken>[]> {
    await dbConnect();
    return ActionTokenModel.find({
      purpose: "organizer_invite",
      usedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .lean<Doc<ActionToken>[]>();
  }

  static async deleteForUser(
    userId: Types.ObjectId,
    purpose: TokenPurpose
  ): Promise<void> {
    await dbConnect();
    await ActionTokenModel.deleteMany({ userId, purpose });
  }
}
