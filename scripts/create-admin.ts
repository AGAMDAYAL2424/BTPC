/**
 * Create an admin account.
 *   npm run admin:create -- <username> '<password>'
 *
 * The password is taken as an argument rather than prompted so this works in a
 * non-interactive setup step. Clear your shell history afterwards, or prefix
 * the command with a space if your shell is configured to skip those.
 */
import path from 'node:path';
import { SqliteRepo } from '../lib/server/db/sqlite';
import { config } from '../lib/server/config';
import { checkPasswordStrength, hashPassword } from '../lib/server/auth/password';

const [username, password] = process.argv.slice(2);

if (!username || !password) {
  console.error("usage: npm run admin:create -- <username> '<password>'");
  process.exit(1);
}

const strength = checkPasswordStrength(password);
if (!strength.ok) {
  console.error(`password needs ${strength.problems.join(', ')}`);
  process.exit(1);
}

const file = path.isAbsolute(config.databaseUrl)
  ? config.databaseUrl
  : path.join(path.resolve(import.meta.dirname, '..'), config.databaseUrl);

const repo = new SqliteRepo(file);

if (repo.findAdmin(username)) {
  console.error(`admin "${username}" already exists`);
  repo.close();
  process.exit(1);
}

async function main(): Promise<void> {
  const hash = await hashPassword(password!);
  const id = repo.createAdmin(username!, hash, 'editor');
  console.log(`created admin "${username}" (id ${id})`);
  console.log('sign in at /admin/login');
  repo.close();
}

void main();
