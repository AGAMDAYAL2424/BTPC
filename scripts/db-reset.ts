/**
 * Start the database over.
 *
 * Reloads the knowledge base, clears the queue, analytics, caches and
 * sessions, and KEEPS staff accounts so nobody has to be re-created. Use it to
 * clear test data before handing the app over.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { SqliteRepo } from '../lib/server/db/sqlite';
import { config } from '../lib/server/config';
import type { Faq } from '../lib/shared/types';

const ROOT = path.resolve(import.meta.dirname, '..');
const file = path.isAbsolute(config.databaseUrl)
  ? config.databaseUrl
  : path.join(ROOT, config.databaseUrl);

const db = new Database(file);
const cleared: string[] = [];
for (const table of [
  'flagged',
  'feedback',
  'messages',
  'query_cache',
  'vector_cache',
  'polish_cache',
  'login_attempts',
  'sessions',
  'quota',
]) {
  try {
    const before = (db.prepare(`SELECT COUNT(*) n FROM ${table}`).get() as { n: number }).n;
    db.prepare(`DELETE FROM ${table}`).run();
    if (before > 0) cleared.push(`${table} (${before})`);
  } catch {
    // Table may not exist yet on a database created by an older version.
  }
}
// Entries written by staff are test data on a reset; the seed 60 are reloaded below.
const admin = db.prepare(`DELETE FROM faqs WHERE source = 'admin'`).run();
if (admin.changes > 0) cleared.push(`admin-written faqs (${admin.changes})`);
const keptAdmins = (db.prepare(`SELECT COUNT(*) n FROM admins`).get() as { n: number }).n;
db.close();

const repo = new SqliteRepo(file);
const faqs: Faq[] = JSON.parse(
  readFileSync(path.join(ROOT, 'data', 'faqs.seed.json'), 'utf-8'),
);
for (const faq of faqs) repo.upsertFaq(faq);

let vectors = 0;
try {
  const raw = JSON.parse(
    readFileSync(path.join(ROOT, 'data', 'embeddings.json'), 'utf-8'),
  ) as { model: string; vectors: Record<string, number[]> };
  for (const [id, v] of Object.entries(raw.vectors)) {
    repo.putVector(id, raw.model, Float32Array.from(v));
    vectors += 1;
  }
} catch {
  // No embeddings yet.
}

console.log(`reset ${path.relative(ROOT, file)}`);
console.log(`  cleared: ${cleared.length > 0 ? cleared.join(', ') : 'nothing to clear'}`);
console.log(`  reloaded: ${faqs.length} FAQ rows, ${vectors} vectors`);
console.log(`  kept: ${keptAdmins} staff account(s)`);
repo.close();
