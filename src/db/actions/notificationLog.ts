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
}
