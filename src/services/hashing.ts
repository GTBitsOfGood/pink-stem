import bcrypt from "bcryptjs";

const ROUNDS = 12;

export default class HashingService {
  /**
   * A bcrypt hash at ROUNDS cost, compared against on a login where the
   * account doesn't exist, so a miss takes as long as a hit and reveals
   * nothing. Regenerate it if ROUNDS changes.
   */
  static readonly DUMMY_HASH =
    "$2b$12$xkoFlnlI2KCm3CpXvecVeeHUHYoZVZUL3kDlOEZUOR6wEUKulfS6.";

  static hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, ROUNDS);
  }

  static compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
