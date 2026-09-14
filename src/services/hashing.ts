import bcrypt from "bcryptjs";

const ROUNDS = 12;

export default class HashingService {
  static hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, ROUNDS);
  }

  static compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
