import dbConnect from "@/db/dbConnect";
import NotificationLogModel from "@/db/models/notificationLog";

export default class NotificationLogDAO {
  /**
   * Records that `key` was sent. Returns false if it already had been, which
   * is how scheduled jobs avoid sending the same reminder twice.
   */
  static async claim(key: string): Promise<boolean> {
    await dbConnect();
    const result = await NotificationLogModel.updateOne(
      { key },
      { $setOnInsert: { key, sentAt: new Date() } },
      { upsert: true }
    );
    return result.upsertedCount === 1;
  }

  /**
   * Atomic expiring lock, sharing this collection's unique key index.
   * Succeeds if no document exists for `key`, or the existing one has
   * expired. Fails (returns false) if another process holds it. A crashed
   * holder is recovered from automatically once expiresAt passes — no
   * manual cleanup needed.
   */
  static async acquireLock(key: string, ttlMs: number): Promise<boolean> {
    await dbConnect();
    const now = new Date();
    try {
      await NotificationLogModel.findOneAndUpdate(
        { key, expiresAt: { $lte: now } },
        { $set: { sentAt: now, expiresAt: new Date(now.getTime() + ttlMs) } },
        { upsert: true }
      );
      return true;
    } catch (error) {
      // E11000: another process's lock document exists and hasn't expired,
      // so the upsert's implicit insert collided with the unique key index.
      if ((error as { code?: number }).code === 11000) return false;
      throw error;
    }
  }

  /** Releases a lock early so the next scheduled run doesn't wait out the TTL. */
  static async releaseLock(key: string): Promise<void> {
    await dbConnect();
    await NotificationLogModel.deleteOne({ key });
  }
}
