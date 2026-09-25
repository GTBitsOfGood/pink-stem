import { mongo } from "mongoose";
import dbConnect from "@/db/dbConnect";
import { ensureIndexes } from "@/db/defineModel";
import NotificationLogModel from "@/db/models/notificationLog";

export default class NotificationLogDAO {
  /**
   * Records that `key` was sent. Returns false if it already had been, which
   * is how scheduled jobs avoid sending the same reminder twice.
   */
  static async claim(key: string): Promise<boolean> {
    await dbConnect();
    // Duplicate keys here would block the unique index the lock depends on.
    await ensureIndexes(NotificationLogModel);
    const result = await NotificationLogModel.updateOne(
      { key },
      { $setOnInsert: { key, sentAt: new Date() } },
      { upsert: true }
    );
    return result.upsertedCount === 1;
  }

  /**
   * Takes an expiring lock on `key` and returns its expiry, which identifies
   * this holder. Returns null while another holder's lock is unexpired; a
   * holder that dies loses it once expiresAt passes.
   */
  static async acquireLock(key: string, ttlMs: number): Promise<Date | null> {
    await dbConnect();
    // A fresh database lacks the unique key index the lock depends on.
    await ensureIndexes(NotificationLogModel);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);
    try {
      await NotificationLogModel.updateOne(
        { key, expiresAt: { $lte: now } },
        { $set: { sentAt: now, expiresAt } },
        { upsert: true }
      );
      return expiresAt;
    } catch (error) {
      // A live lock makes the upsert's insert collide on the unique key.
      if (error instanceof mongo.MongoServerError && error.code === 11000) {
        return null;
      }
      throw error;
    }
  }

  /** Releases the lock only if it is still the one `acquireLock` returned. */
  static async releaseLock(key: string, expiresAt: Date): Promise<void> {
    await dbConnect();
    await NotificationLogModel.deleteOne({ key, expiresAt });
  }
}
