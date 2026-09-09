import 'server-only';
import type { Band, Candidate, ScoreBreakdown } from '../../shared/types';
import { conceptGroups } from '../nlp/lexicon';
import { phoneticScore, type TokenCodes } from '../nlp/phonetic';
import { saturate, type Bm25Index } from '../nlp/bm25';
import {
  DEFAULT_THRESHOLDS,
  rescaleCosine,
  type Thresholds,
  type Weights,
} from './thresholds';

export interface ScorableDoc {
  faqId: string;
  intentId: string;
  tokens: string[];
  codes: TokenCodes[];
  groups: Set<number>;
  keywords: Set<string>;
  vector: Float32Array | null;
}

export interface QueryRepresentation {
  tokens: string[];
  expandedTokens: string[];
  codes: TokenCodes[];
  groups: Set<number>;
  vector: Float32Array | null;
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    magA += x * x;
    magB += y * y;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Curated-keyword channel. Two halves: how many of the concepts the visitor
 * mentioned this row also covers, and how many of their literal words appear
 * in the row's hand-written keyword list.
 */
export function keywordScore(query: QueryRepresentation, doc: ScorableDoc): number {
  let conceptHits = 0;
  for (const g of query.groups) {
    if (doc.groups.has(g)) conceptHits += 1;
  }
  const conceptPart = query.groups.size > 0 ? conceptHits / query.groups.size : 0;

  let literalHits = 0;
  for (const t of query.tokens) {
    if (doc.keywords.has(t)) literalHits += 1;
  }
  const literalPart = query.tokens.length > 0 ? literalHits / query.tokens.length : 0;

  return 0.65 * conceptPart + 0.35 * literalPart;
}

export interface ScoreOptions {
  weights: Weights;
  thresholds?: Thresholds;
  /** Saturation constant for the lexical channel. Fitted by scripts/eval.ts. */
  bm25K?: number;
}

export interface ScoredCorpus {
  candidates: Candidate[];
  /** Strongest absolute signal for the top candidate, ignoring the other rows. */
  topAbsoluteEvidence: number;
}

/** Default saturation constant for the lexical channel. Fitted, see eval.ts. */
export const DEFAULT_BM25_K = 2;

/**
 * Score every document and return them ranked.
 *
 * All four channels are absolute: each says how well THIS row answers the
 * question, with no reference to how the other 59 scored. That is what makes a
 * single fixed confidence threshold meaningful, and it is what lets an
 * out-of-scope question score low across the board instead of being handed a
 * high relative score for being the least-bad match.
 */
export function scoreCorpus(
  query: QueryRepresentation,
  docs: ScorableDoc[],
  bm25: Bm25Index,
  options: ScoreOptions,
): ScoredCorpus {
  const { weights, bm25K = DEFAULT_BM25_K } = options;
  const bmScores = bm25.scoreAll(query.expandedTokens);

  const candidates: Candidate[] = docs.map((doc) => {
    const lexical = saturate(bmScores.get(doc.faqId) ?? 0, bm25K);
    const phonetic = phoneticScore(query.codes, doc.codes);
    const keyword = keywordScore(query, doc);
    const embedding =
      query.vector && doc.vector
        ? rescaleCosine(cosineSimilarity(query.vector, doc.vector))
        : 0;

    const fused =
      weights.embedding * embedding +
      weights.lexical * lexical +
      weights.phonetic * phonetic +
      weights.keyword * keyword;

    const breakdown: ScoreBreakdown = { embedding, lexical, phonetic, keyword, fused };
    return { faqId: doc.faqId, intentId: doc.intentId, score: fused, breakdown };
  });

  candidates.sort((a, b) => b.score - a.score);

  const top = candidates[0];
  const topAbsoluteEvidence = top
    ? Math.max(
        top.breakdown.phonetic,
        top.breakdown.keyword,
        top.breakdown.embedding,
        top.breakdown.lexical,
      )
    : 0;

  return { candidates, topAbsoluteEvidence };
}

export interface BandDecision {
  band: Band;
  margin: number;
  /** True when the runner-up sits in a different intent, so ask rather than guess. */
  crossIntent: boolean;
}

/**
 * Turn a ranked list into one of three actions.
 *
 * `confident` needs all three of: a high enough fused score, a clear gap to the
 * runner-up, and real absolute evidence. Dropping any one of those produces a
 * bot that answers everything, including questions it has never heard of.
 */
export function decideBand(
  scored: ScoredCorpus,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): BandDecision {
  const [top, second] = scored.candidates;
  if (!top) return { band: 'miss', margin: 0, crossIntent: false };

  const margin = top.score - (second?.score ?? 0);
  const crossIntent = second !== undefined && second.intentId !== top.intentId;

  if (top.score < thresholds.floor || scored.topAbsoluteEvidence < thresholds.absoluteEvidence) {
    return { band: 'miss', margin, crossIntent };
  }
  if (top.score >= thresholds.confident && margin >= thresholds.margin) {
    return { band: 'confident', margin, crossIntent };
  }
  return { band: 'ambiguous', margin, crossIntent };
}
