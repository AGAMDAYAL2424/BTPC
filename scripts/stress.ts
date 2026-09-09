/**
 * Word-heavy stress test.
 *
 * Three of the four scoring channels are query-normalised, so a long rambling
 * question dilutes them: a 25 token question where 4 tokens match a row scores
 * about 0.16 phonetic no matter how good that row is. This measures how badly,
 * and prints the per-channel breakdown so the collapse is attributable.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { SearchIndex } from '../lib/server/retrieval/index';
import type { Faq } from '../lib/shared/types';

const ROOT = path.resolve(import.meta.dirname, '..');
const faqs: Faq[] = JSON.parse(
  readFileSync(path.join(ROOT, 'data', 'faqs.seed.json'), 'utf-8'),
);
const stress = JSON.parse(
  readFileSync(path.join(ROOT, 'tests', 'eval', 'stressset.json'), 'utf-8'),
) as {
  verbose: Array<{ q: string; expect: string }>;
  multiIntent: Array<{ q: string; acceptable: string[] }>;
};
const gold = JSON.parse(
  readFileSync(path.join(ROOT, 'tests', 'eval', 'goldset.json'), 'utf-8'),
) as { inScope: Array<{ q: string; expect: string }> };

const index = new SearchIndex(faqs);
const showAll = process.argv.includes('--all');

interface Row {
  words: number;
  ok: boolean;
  top3: boolean;
  band: string;
  score: number;
  emb: number;
  lex: number;
  pho: number;
  key: number;
}

function run(cases: Array<{ q: string; expect: string }>, label: string) {
  const rows: Row[] = [];
  const failures: string[] = [];

  for (const c of cases) {
    const r = index.search(c.q, { lang: 'hi' });
    const top = r.candidates[0];
    const ranked = r.candidates.map((x) => x.faqId);
    const ok = ranked[0] === c.expect;
    const top3 = ranked.slice(0, 3).includes(c.expect);
    rows.push({
      words: c.q.split(/\s+/).length,
      ok,
      top3,
      band: r.band,
      score: r.score,
      emb: top?.breakdown.embedding ?? 0,
      lex: top?.breakdown.lexical ?? 0,
      pho: top?.breakdown.phonetic ?? 0,
      key: top?.breakdown.keyword ?? 0,
    });
    if (!ok) {
      const want = r.candidates.findIndex((x) => x.faqId === c.expect);
      failures.push(
        `  want ${c.expect} got ${(ranked[0] ?? '-').padEnd(11)} ` +
          `rank${want < 0 ? '>5' : want + 1} ${r.band.padEnd(11)} ` +
          `s=${r.score.toFixed(2)} lex=${(top?.breakdown.lexical ?? 0).toFixed(2)} ` +
          `pho=${(top?.breakdown.phonetic ?? 0).toFixed(2)} key=${(top?.breakdown.keyword ?? 0).toFixed(2)}\n` +
          `     ${c.q.slice(0, 96)}`,
      );
    }
  }

  const n = rows.length;
  const avg = (f: (r: Row) => number) => rows.reduce((s, r) => s + f(r), 0) / n;
  const pc = (k: number) => `${((k / n) * 100).toFixed(1)}%`;

  console.log(`\n=== ${label} (${n} queries, avg ${avg((r) => r.words).toFixed(1)} words) ===`);
  console.log(`  top-1            ${rows.filter((r) => r.ok).length}/${n}  ${pc(rows.filter((r) => r.ok).length)}`);
  console.log(`  top-3            ${rows.filter((r) => r.top3).length}/${n}  ${pc(rows.filter((r) => r.top3).length)}`);
  console.log(`  band: confident  ${rows.filter((r) => r.band === 'confident').length}`);
  console.log(`        ambiguous  ${rows.filter((r) => r.band === 'ambiguous').length}`);
  console.log(`        miss       ${rows.filter((r) => r.band === 'miss').length}   ${pc(rows.filter((r) => r.band === 'miss').length)}`);
  console.log(
    `  mean channel     lex=${avg((r) => r.lex).toFixed(3)}  pho=${avg((r) => r.pho).toFixed(3)}  ` +
      `key=${avg((r) => r.key).toFixed(3)}  fused=${avg((r) => r.score).toFixed(3)}`,
  );
  if (failures.length > 0 && (showAll || failures.length <= 20)) {
    console.log(`\n  --- ${failures.length} top-1 failures ---`);
    for (const f of failures) console.log(f);
  } else if (failures.length > 0) {
    console.log(`\n  ${failures.length} top-1 failures (pass --all to list)`);
  }
  return rows;
}

const shortRows = run(gold.inScope, 'SHORT (gold set, for comparison)');
const longRows = run(stress.verbose, 'WORD-HEAVY (stress set)');

console.log('\n=== multi-intent (any acceptable answer counts) ===');
let miOk = 0;
for (const c of stress.multiIntent) {
  const r = index.search(c.q, { lang: 'hi' });
  const top = r.candidates[0]?.faqId ?? '-';
  const ok = c.acceptable.includes(top);
  if (ok) miOk += 1;
  console.log(
    `  ${ok ? 'ok  ' : 'MISS'} got ${top.padEnd(11)} ${r.band.padEnd(11)} of [${c.acceptable.join(' ')}]  ${c.q.slice(0, 60)}`,
  );
}
console.log(`  ${miOk}/${stress.multiIntent.length} landed on an acceptable answer`);

console.log('\n=== the length effect ===');
const bucket = (rows: Row[], lo: number, hi: number) => {
  const b = rows.filter((r) => r.words >= lo && r.words < hi);
  if (b.length === 0) return null;
  return {
    band: `${lo}-${hi === Infinity ? '+' : hi} words`,
    n: b.length,
    top1: `${((b.filter((r) => r.ok).length / b.length) * 100).toFixed(0)}%`,
    pho: (b.reduce((s, r) => s + r.pho, 0) / b.length).toFixed(2),
    key: (b.reduce((s, r) => s + r.key, 0) / b.length).toFixed(2),
    lex: (b.reduce((s, r) => s + r.lex, 0) / b.length).toFixed(2),
    fused: (b.reduce((s, r) => s + r.score, 0) / b.length).toFixed(2),
  };
};
const all = [...shortRows, ...longRows];
console.log('  words       n   top-1   lex   pho   key  fused');
for (const [lo, hi] of [[1, 6], [6, 11], [11, 16], [16, 21], [21, 26], [26, Infinity]] as const) {
  const b = bucket(all, lo, hi);
  if (b) {
    console.log(
      `  ${b.band.padEnd(11)} ${String(b.n).padStart(3)}   ${b.top1.padStart(5)}  ${b.lex}  ${b.pho}  ${b.key}   ${b.fused}`,
    );
  }
}
