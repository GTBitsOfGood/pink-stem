import { mongo } from "mongoose";
import { NOTIFICATION_CLAIM_TTL_MS } from "@/constants/limits";
import dbConnect from "@/db/dbConnect";
import { ensureIndexes } from "@/db/defineModel";
import NotificationLogModel from "@/db/models/notificationLog";
import type { MailFailure } from "@/types/notification";

/** Mongo's duplicate key error: the upsert lost to an existing key. */
function isDuplicateKey(error: unknown): boolean {
  return error instanceof mongo.MongoServerError && error.code === 11000;
}

/**
 * Keyed emails move through sending → sent, or sending → failed → sending on
 * the next run. Only one sender can hold a key at a time, so two runs at once
 * never both send it. The one gap: a sender that dies after Resend accepted
 * the email but before `markSent` leaves a claim that lapses after
 * NOTIFICATION_CLAIM_TTL_MS, and the email goes out a second time.
 */
export default class NotificationLogDAO {
  /**
   * Claims `key` for sending and returns the claim's timestamp, which
   * identifies this holder. Returns null when the key was already sent or
   * another sender holds a live claim on it. A failed key, or one whose
   * claim has lapsed, can be claimed again.
   */
  static async claim(key: string): Promise<Date | null> {
    await dbConnect();
    // The claim depends on the unique key index existing.
    await ensureIndexes(NotificationLogModel);
    const now = new Date();
    try {
      await NotificationLogModel.updateOne(
        {
          key,
          $or: [
            { status: "failed" },
            {
              status: "sending",
              claimedAt: {
                $lte: new Date(now.getTime() - NOTIFICATION_CLAIM_TTL_MS),
              },
            },
          ],
        },
        { $set: { status: "sending", claimedAt: now }, $inc: { attempts: 1 } },
        { upsert: true }
      );
      return now;
    } catch (error) {
      // Sent, untracked (sent before statuses existed), or claimed by a live
      // sender: the filter misses, and the upsert's insert hits the unique key.
      if (isDuplicateKey(error)) return null;
      throw error;
    }
  }

  /** Records the send, if this holder's claim is still the current one. */
  static async markSent(key: string, claimedAt: Date): Promise<void> {
    await dbConnect();
    await NotificationLogModel.updateOne(
      { key, status: "sending", claimedAt },
      {
        $set: { status: "sent", sentAt: new Date() },
        $unset: { failedAt: 1, failureKind: 1, lastError: 1 },
      }
    );
  }

  /** Frees the key for the next run, if this holder's claim is still current. */
  static async markFailed(
    key: string,
    claimedAt: Date,
    kind: MailFailure,
    error: string
  ): Promise<void> {
    await dbConnect();
    await NotificationLogModel.updateOne(
      { key, status: "sending", claimedAt },
      {
        $set: {
          status: "failed",
          failedAt: new Date(),
          failureKind: kind,
          lastError: error,
        },
      }
    );
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
      if (isDuplicateKey(error)) return null;
      throw error;
    }
  }

  /** Releases the lock only if it is still the one `acquireLock` returned. */
  static async releaseLock(key: string, expiresAt: Date): Promise<void> {
    await dbConnect();
    await NotificationLogModel.deleteOne({ key, expiresAt });
  }
}
