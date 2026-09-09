/**
 * Create the database and load the seed knowledge base into it.
 * Idempotent: re-running refreshes the seed rows without touching the queue,
 * analytics, or admin accounts.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { SqliteRepo } from '../lib/server/db/sqlite';
import { config } from '../lib/server/config';
import type { Faq } from '../lib/shared/types';

const ROOT = path.resolve(import.meta.dirname, '..');
const file = path.isAbsolute(config.databaseUrl)
  ? config.databaseUrl
  : path.join(ROOT, config.databaseUrl);

const repo = new SqliteRepo(file);
const faqs: Faq[] = JSON.parse(
  readFileSync(path.join(ROOT, 'data', 'faqs.seed.json'), 'utf-8'),
);

let loaded = 0;
for (const faq of faqs) {
  repo.upsertFaq(faq);
  loaded += 1;
}

// Load precomputed vectors if `npm run seed:embed` has been run.
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
  // No embeddings yet. The bot runs on the deterministic engine until there are.
}

// A knowledge-base change invalidates cached answers.
repo.clearResultCache();

console.log(`database: ${path.relative(ROOT, file)}`);
console.log(`  ${loaded} FAQ rows loaded`);
console.log(`  ${vectors} vectors loaded${vectors === 0 ? ' (run npm run seed:embed once a key is set)' : ''}`);
console.log(`  ${repo.listPublishedFaqs().length} published`);
repo.close();
