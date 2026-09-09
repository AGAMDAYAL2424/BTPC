/**
 * Accuracy harness for the retrieval engine.
 *
 * The chatbot-flow-design skill gives outcome targets rather than score
 * cutoffs, so thresholds are fitted here instead of guessed:
 *   - top-1 accuracy in the 80-90% band, per language as well as overall
 *   - measured fallback rate under 25-30%
 *   - ZERO out-of-scope questions answered confidently
 *
 * Run `npm run eval` to report, `npm run eval -- --tune` to grid search.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { SearchIndex } from '../lib/server/retrieval/index';
import { DEFAULT_THRESHOLDS, WEIGHTS_WITHOUT_EMBEDDING } from '../lib/server/retrieval/thresholds';
import { DEFAULT_BM25_K } from '../lib/server/retrieval/score';
import type { Thresholds, Weights } from '../lib/server/retrieval/thresholds';
import type { Faq } from '../lib/shared/types';

const ROOT = path.resolve(import.meta.dirname, '..');

interface GoldCase {
  q: string;
  expect: string;
  style: 'deva' | 'en' | 'roman';
}
interface GoldSet {
  inScope: GoldCase[];
  outOfScope: string[];
}

const faqs: Faq[] = JSON.parse(
  readFileSync(path.join(ROOT, 'data', 'faqs.seed.json'), 'utf-8'),
);
const gold: GoldSet = JSON.parse(
  readFileSync(path.join(ROOT, 'tests', 'eval', 'goldset.json'), 'utf-8'),
);

const vectors = loadVectors();
const index = new SearchIndex(faqs, vectors);

function loadVectors(): Map<string, Float32Array> {
  const file = path.join(ROOT, 'data', 'embeddings.json');
  try {
    const raw = JSON.parse(readFileSync(file, 'utf-8')) as {
      vectors: Record<string, number[]>;
    };
    const map = new Map<string, Float32Array>();
    for (const [id, v] of Object.entries(raw.vectors)) {
      map.set(id, Float32Array.from(v));
    }
    return map;
  } catch {
    return new Map();
  }
}

export interface Report {
  total: number;
  top1: number;
  top3: number;
  confidentCorrect: number;
  fallback: number;
  wrongConfident: number;
  byStyle: Record<string, { total: number; top1: number }>;
  oosLeaks: number;
  oosAmbiguous: number;
  failures: Array<{ q: string; expect: string; got: string; band: string; score: number }>;
}

function evaluate(
  weights: Weights,
  thresholds: Thresholds,
  bm25K: number,
  collect = false,
): Report {
  const byStyle: Report['byStyle'] = {};
  const failures: Report['failures'] = [];
  let top1 = 0;
  let top3 = 0;
  let confidentCorrect = 0;
  let fallback = 0;
  let wrongConfident = 0;

  for (const c of gold.inScope) {
    const r = index.search(c.q, { lang: 'hi', thresholds, weightsOverride: weights, bm25K });
    const ranked = r.candidates.map((x) => x.faqId);
    const isTop1 = ranked[0] === c.expect;
    const isTop3 = ranked.slice(0, 3).includes(c.expect);

    if (isTop1) top1 += 1;
    if (isTop3) top3 += 1;
    if (r.band === 'miss') fallback += 1;
    if (r.band === 'confident' && isTop1) confidentCorrect += 1;
    if (r.band === 'confident' && !isTop1) wrongConfident += 1;

    byStyle[c.style] ??= { total: 0, top1: 0 };
    byStyle[c.style]!.total += 1;
    if (isTop1) byStyle[c.style]!.top1 += 1;

    if (collect && !isTop1) {
      failures.push({
        q: c.q,
        expect: c.expect,
        got: ranked[0] ?? '-',
        band: r.band,
        score: r.score,
      });
    }
  }

  let oosLeaks = 0;
  let oosAmbiguous = 0;
  for (const q of gold.outOfScope) {
    const r = index.search(q, { lang: 'hi', thresholds, weightsOverride: weights, bm25K });
    if (r.band === 'confident') oosLeaks += 1;
    else if (r.band === 'ambiguous') oosAmbiguous += 1;
  }

  return {
    total: gold.inScope.length,
    top1,
    top3,
    confidentCorrect,
    fallback,
    wrongConfident,
    byStyle,
    oosLeaks,
    oosAmbiguous,
    failures,
  };
}

/**
 * A configuration is only acceptable if it never answers an out-of-scope
 * question confidently. Within that constraint, prefer correct confident
 * answers, then penalise unnecessary fallbacks and confident wrong answers.
 */
function objective(r: Report): number {
  if (r.oosLeaks > 0) return -1000 + r.oosLeaks * -10;
  return (
    r.confidentCorrect * 1.0 -
    r.wrongConfident * 2.0 -
    r.fallback * 0.5 -
    r.oosAmbiguous * 0.3
  );
}

function pct(n: number, d: number): string {
  return `${((n / d) * 100).toFixed(1)}%`;
}

function print(label: string, w: Weights, t: Thresholds, k: number): Report {
  const r = evaluate(w, t, k, true);
  console.log(`\n=== ${label} ===`);
  console.log(`weights    emb ${w.embedding} lex ${w.lexical} pho ${w.phonetic} key ${w.keyword}  bm25K ${k}`);
  console.log(
    `thresholds confident ${t.confident} floor ${t.floor} margin ${t.margin} evidence ${t.absoluteEvidence}`,
  );
  console.log(`\nin-scope (${r.total} queries, ${new Set(gold.inScope.map((c) => c.expect)).size} FAQs)`);
  console.log(`  top-1 accuracy      ${r.top1}/${r.total}  ${pct(r.top1, r.total)}`);
  console.log(`  top-3 recall        ${r.top3}/${r.total}  ${pct(r.top3, r.total)}`);
  console.log(`  answered correctly  ${r.confidentCorrect}/${r.total}  ${pct(r.confidentCorrect, r.total)}`);
  console.log(`  answered wrongly    ${r.wrongConfident}/${r.total}  ${pct(r.wrongConfident, r.total)}`);
  console.log(`  fell back           ${r.fallback}/${r.total}  ${pct(r.fallback, r.total)}   (target under 25-30%)`);
  console.log('  by input style');
  for (const [style, s] of Object.entries(r.byStyle)) {
    console.log(`    ${style.padEnd(6)} ${s.top1}/${s.total}  ${pct(s.top1, s.total)}`);
  }
  console.log(`\nout-of-scope (${gold.outOfScope.length} queries)`);
  console.log(`  answered confidently  ${r.oosLeaks}   (must be 0)`);
  console.log(`  offered suggestions   ${r.oosAmbiguous}`);
  console.log(`  cleanly flagged       ${gold.outOfScope.length - r.oosLeaks - r.oosAmbiguous}`);
  return r;
}

/**
 * Two-stage coordinate search rather than a full product grid.
 *
 * The full cross-product of weights, thresholds and the saturation constant is
 * roughly 48,000 configurations times 210 queries, which takes minutes. Weights
 * decide the RANKING and thresholds decide only WHICH BAND a given ranking
 * falls into, so the two are close to separable: fit weights against ranking
 * accuracy first, then fit thresholds against banding on the fixed ranking.
 */
function tune(): { weights: Weights; thresholds: Thresholds; bm25K: number } {
  const hasVectors = vectors.size > 0;

  // Stage 1: weights and saturation, judged on top-1 ranking accuracy alone.
  const lexGrid = [0.2, 0.26, 0.32, 0.38, 0.44, 0.5];
  const phoGrid = [0.12, 0.18, 0.24, 0.3, 0.36];
  const embGrid = hasVectors ? [0.2, 0.28, 0.36, 0.44, 0.52] : [0];
  const kGrid = [2, 3, 4, 6, 8];

  let bestRank = { top1: -1, weights: WEIGHTS_WITHOUT_EMBEDDING, bm25K: DEFAULT_BM25_K };
  let stage1 = 0;
  for (const emb of embGrid) {
    for (const lex of lexGrid) {
      for (const pho of phoGrid) {
        const key = Number((1 - emb - lex - pho).toFixed(4));
        if (key < 0.08 || key > 0.4) continue;
        const weights: Weights = { embedding: emb, lexical: lex, phonetic: pho, keyword: key };
        for (const bm25K of kGrid) {
          const r = evaluate(weights, DEFAULT_THRESHOLDS, bm25K);
          stage1 += 1;
          if (r.top1 > bestRank.top1) bestRank = { top1: r.top1, weights, bm25K };
        }
      }
    }
  }

  // Stage 2: thresholds, on the ranking stage 1 settled.
  const confGrid = [0.34, 0.4, 0.46, 0.52, 0.58, 0.64, 0.7];
  const floorGrid = [0.24, 0.3, 0.36, 0.42, 0.48, 0.54];
  const marginGrid = [0.005, 0.02, 0.04, 0.07, 0.1];
  const evidenceGrid = [0.28, 0.34, 0.4, 0.46, 0.52, 0.58, 0.64];

  let best = { score: -Infinity, thresholds: DEFAULT_THRESHOLDS };
  let stage2 = 0;
  for (const confident of confGrid) {
    for (const floor of floorGrid) {
      if (floor >= confident) continue;
      for (const margin of marginGrid) {
        for (const absoluteEvidence of evidenceGrid) {
          const thresholds: Thresholds = { confident, floor, margin, absoluteEvidence };
          const score = objective(evaluate(bestRank.weights, thresholds, bestRank.bm25K));
          stage2 += 1;
          if (score > best.score) best = { score, thresholds };
        }
      }
    }
  }

  console.log(`\nstage 1: ${stage1} weight configs, best top-1 ${bestRank.top1}/${gold.inScope.length}`);
  console.log(`stage 2: ${stage2} threshold configs`);
  return { weights: bestRank.weights, thresholds: best.thresholds, bm25K: bestRank.bm25K };
}

const wantTune = process.argv.includes('--tune');
const wantFailures = process.argv.includes('--failures');

console.log(`index: ${index.size} rows, ${vectors.size} vectors loaded`);

if (wantTune) {
  const best = tune();
  const r = print('BEST (grid searched)', best.weights, best.thresholds, best.bm25K);
  console.log('\npaste into lib/server/retrieval/thresholds.ts:');
  console.log(JSON.stringify(best.weights, null, 2));
  console.log(JSON.stringify(best.thresholds, null, 2));
  console.log(`bm25K = ${best.bm25K}`);
  if (wantFailures) showFailures(r);
} else {
  const r = print('CURRENT', WEIGHTS_WITHOUT_EMBEDDING, DEFAULT_THRESHOLDS, DEFAULT_BM25_K);
  if (wantFailures) showFailures(r);
  const ok = r.oosLeaks === 0 && r.top1 / r.total >= 0.8;
  if (!ok) {
    console.error('\nFAILED: needs zero out-of-scope leaks and top-1 at or above 80%');
    process.exit(1);
  }
  console.log('\nPASS');
}

function showFailures(r: Report): void {
  if (r.failures.length === 0) return;
  console.log(`\n--- ${r.failures.length} top-1 failures ---`);
  for (const f of r.failures) {
    console.log(
      `  want ${f.expect}  got ${f.got.padEnd(7)} ${f.band.padEnd(10)} ${f.score.toFixed(3)}  ${f.q}`,
    );
  }
}
