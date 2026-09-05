import type { Types } from "mongoose";
import type { Role } from "@/types/user";

export const TOKEN_PURPOSES = [
  "verify_email",
  "reset_password",
  "organizer_invite",
  "guardian_consent",
] as const;
export type TokenPurpose = (typeof TOKEN_PURPOSES)[number];

/**
 * A one-time link. Only the hash of the secret is stored, so a database read
 * cannot be turned into a working link.
 */
export interface ActionToken {
  purpose: TokenPurpose;
  tokenHash: string;
  email: string;
  userId?: Types.ObjectId | null;
  role?: Role;
  invitedBy?: Types.ObjectId | null;
  expiresAt: Date;
  usedAt?: Date | null;
}
