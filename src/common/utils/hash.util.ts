import * as bcrypt from 'bcryptjs';

const DEFAULT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, DEFAULT_SALT_ROUNDS);
}

export async function comparePassword(
  plain: string,
  hashed: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}
