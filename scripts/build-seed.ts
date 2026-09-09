/**
 * Merge the verbatim Hindi source with the hand-authored enrichment into the
 * single knowledge-base seed the app loads.
 *
 * Fails loudly rather than emitting a partial seed: a missing translation or a
 * dropped helpline number in a police advisory is not a warning-level problem.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ENRICHMENT, PROVENANCE } from '../data/enrichment';
import { INTENT_IDS } from '../lib/shared/intents';
import type { Faq } from '../lib/shared/types';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'data', 'source-hi.json');
const OUT = path.join(ROOT, 'data', 'faqs.seed.json');

interface SourceEntry {
  id: string;
  number: number;
  questionHi: string;
  answerHi: string;
}

/** Digit runs are load-bearing facts: 1095, 112, "60 to 90 minutes", "13 September". */
function digitRuns(text: string): string[] {
  return (text.match(/\d+/g) ?? []).sort();
}

function main(): void {
  const source: SourceEntry[] = JSON.parse(readFileSync(SOURCE, 'utf-8'));
  const errors: string[] = [];
  const faqs: Faq[] = [];

  for (const entry of source) {
    const extra = ENRICHMENT[entry.id];
    if (!extra) {
      errors.push(`${entry.id}: no enrichment entry`);
      continue;
    }
    if (!INTENT_IDS.includes(extra.intentId)) {
      errors.push(`${entry.id}: unknown intentId "${extra.intentId}"`);
    }

    // Every number in the approved Hindi answer must survive into English.
    const hiNums = digitRuns(entry.answerHi);
    const enNums = digitRuns(extra.answerEn);
    const dropped = hiNums.filter((n) => !enNums.includes(n));
    if (dropped.length > 0) {
      errors.push(
        `${entry.id}: answerEn is missing number(s) present in answerHi: ${dropped.join(', ')}`,
      );
    }

    if (extra.variantsRoman.length === 0) {
      errors.push(`${entry.id}: needs at least one romanised variant`);
    }
    if (extra.keywords.length < 4) {
      errors.push(`${entry.id}: needs at least 4 keywords`);
    }

    faqs.push({
      id: entry.id,
      intentId: extra.intentId,
      displayOrder: entry.number,
      questionHi: entry.questionHi,
      questionEn: extra.questionEn,
      answerHi: entry.answerHi,
      answerEn: extra.answerEn,
      variantsHi: extra.variantsHi,
      variantsEn: extra.variantsEn,
      variantsRoman: extra.variantsRoman,
      keywords: extra.keywords,
      volatility: extra.volatility,
      provenance: PROVENANCE,
      source: 'seed',
      status: 'published',
      lastUpdated: '2026-09-09',
    });
  }

  if (errors.length > 0) {
    console.error(`build-seed failed with ${errors.length} problem(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  writeFileSync(OUT, `${JSON.stringify(faqs, null, 2)}\n`, 'utf-8');

  const byIntent = new Map<string, number>();
  for (const f of faqs) byIntent.set(f.intentId, (byIntent.get(f.intentId) ?? 0) + 1);

  console.log(`built ${faqs.length} FAQs -> data/faqs.seed.json`);
  for (const id of INTENT_IDS) {
    console.log(`  ${id.padEnd(24)} ${byIntent.get(id) ?? 0}`);
  }
  const volatile = faqs.filter((f) => f.volatility === 'volatile').map((f) => f.id);
  console.log(`  volatile rows: ${volatile.join(', ')}`);
}

main();
