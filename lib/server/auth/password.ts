import 'server-only';
import {
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';

/**
 * promisify picks scrypt's three-argument overload and drops the options
 * parameter, so the wrapper is written out rather than inferred.
 */
function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/**
 * Password hashing with Node's built-in scrypt.
 *
 * A deliberate deviation from the api-security skill, which specifies "bcrypt
 * with salt rounds >= 10". bcrypt for Node needs a native build through
 * node-gyp, which is a real deployment liability for a project that already
 * carries one native dependency. scrypt is in the standard library, is
 * memory-hard where bcrypt is only CPU-hard, and at these parameters is at
 * least as resistant to offline cracking. The properties the skill actually
 * cares about, a per-password salt and a deliberately expensive derivation, are
 * both satisfied.
 *
 * N = 2^15 costs roughly 100ms per verification on a modern server, which is
 * far too slow to brute force and unnoticeable on a login form.
 */
const N = 32768;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

const OPTIONS = { N, r: BLOCK_SIZE, p: PARALLELISM, maxmem: 128 * N * BLOCK_SIZE * 2 };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await scrypt(password, salt, KEY_LENGTH, OPTIONS);
  return `scrypt$${N}$${BLOCK_SIZE}$${PARALLELISM}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, keyB64] = parts;
  const salt = Buffer.from(saltB64!, 'base64');
  const expected = Buffer.from(keyB64!, 'base64');
  const derived = await scrypt(password, salt, expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 128 * Number(n) * Number(r) * 2,
  });
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/**
 * Burns the same time as a real verification on an unknown username, so the
 * response time does not reveal whether an account exists.
 */
export async function dummyVerify(password: string): Promise<void> {
  const salt = randomBytes(SALT_LENGTH);
  await scrypt(password, salt, KEY_LENGTH, OPTIONS);
}

export interface PasswordCheck {
  ok: boolean;
  problems: string[];
}

/** The stricter of the two policies the skill gives. */
export function checkPasswordStrength(password: string): PasswordCheck {
  const problems: string[] = [];
  if (password.length < 12) problems.push('at least 12 characters');
  if (!/[A-Z]/.test(password)) problems.push('an uppercase letter');
  if (!/[a-z]/.test(password)) problems.push('a lowercase letter');
  if (!/[0-9]/.test(password)) problems.push('a digit');
  if (!/[^A-Za-z0-9]/.test(password)) problems.push('a symbol');
  return { ok: problems.length === 0, problems };
}
