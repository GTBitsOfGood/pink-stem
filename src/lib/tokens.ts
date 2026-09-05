import { createHash, randomBytes, randomInt } from "crypto";
import { VERIFICATION_CODE_LENGTH } from "@/constants/limits";

/** A URL-safe secret for one-time links. */
export function generateSecret(): string {
  return randomBytes(32).toString("base64url");
}

/** Only the hash is persisted, so the database never holds a usable link. */
export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/** Crockford base32 without the ambiguous characters (0/O, 1/I/L). */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * A certificate verification code: 16 random characters in groups of four,
 * roughly 78 bits of entropy, so codes cannot be guessed or enumerated.
 */
export function generateVerificationCode(): string {
  const chars = Array.from(
    { length: VERIFICATION_CODE_LENGTH },
    () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  );
  return chars.join("").replace(/(.{4})(?=.)/g, "$1-");
}

/** Accepts codes typed with or without dashes, in any case. */
export function normalizeVerificationCode(input: string): string {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return raw.replace(/(.{4})(?=.)/g, "$1-");
}
