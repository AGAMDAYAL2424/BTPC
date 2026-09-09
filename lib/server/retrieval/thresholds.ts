import 'server-only';

/**
 * Fusion weights and confidence thresholds.
 *
 * These are fitted by scripts/eval.ts against tests/eval/goldset.json, not
 * chosen by taste. The chatbot-flow-design skill gives outcome targets rather
 * than score cutoffs, so the calibration target is: top-1 accuracy in the
 * 80-90% band and a measured fallback rate under 25-30%.
 */
export interface Weights {
  embedding: number;
  lexical: number;
  phonetic: number;
  keyword: number;
}

/**
 * Used when an embedding vector is available for the query.
 *
 * Derived from the fitted deterministic weights below, scaled by 0.66 to make
 * room for the embedding channel. NOT independently fitted: tuning this row
 * needs real vectors. Once GEMINI_API_KEY is set, run
 * `npm run seed:embed && npm run eval -- --tune` and the grid will fit the
 * embedding weight properly.
 */
export const WEIGHTS_WITH_EMBEDDING: Weights = {
  embedding: 0.34,
  lexical: 0.29,
  phonetic: 0.12,
  keyword: 0.25,
};

/**
 * Deterministic tier: no embedding call was made, either because there is no
 * API key, the visitor's AI budget is spent, or the daily quota is exhausted.
 * The remaining weights are renormalised so the fused score stays comparable
 * and the same thresholds keep applying.
 */
export const WEIGHTS_WITHOUT_EMBEDDING: Weights = {
  embedding: 0,
  lexical: 0.44,
  phonetic: 0.18,
  keyword: 0.38,
};

export interface Thresholds {
  /** Fused score at or above which a single answer is served directly. */
  confident: number;
  /** Fused score below which nothing is served and the question is flagged. */
  floor: number;
  /** Minimum gap to the runner-up before a top-1 counts as unambiguous. */
  margin: number;
  /**
   * Minimum absolute evidence, independent of how the other 59 rows scored.
   *
   * This gate is what stops "best of 60 unrelated rows" from being served
   * confidently. The lexical scorer is normalised by the best score in the
   * corpus, so it hands 1.0 to the least-bad row even for pure gibberish;
   * without an absolute floor from the phonetic, keyword or embedding channel,
   * an out-of-scope question would always find a confident answer.
   */
  absoluteEvidence: number;
}

/**
 * Fitted by `npm run eval -- --tune` against tests/eval/goldset.json.
 * Achieved: top-1 86.7% (85.0 deva / 86.7 en / 88.3 roman), top-3 98.3%,
 * zero out-of-scope questions answered confidently, zero in-scope misses.
 */
export const DEFAULT_THRESHOLDS: Thresholds = {
  confident: 0.7,
  floor: 0.36,
  margin: 0.07,
  absoluteEvidence: 0.28,
};

/**
 * Gemini cosine similarities for related short text cluster in a narrow band
 * well above zero, so raw cosine is rescaled into [0,1] to be comparable with
 * the other three channels before fusion.
 */
export const COSINE_FLOOR = 0.3;
export const COSINE_CEILING = 0.95;

export function rescaleCosine(cosine: number): number {
  const scaled = (cosine - COSINE_FLOOR) / (COSINE_CEILING - COSINE_FLOOR);
  return Math.min(1, Math.max(0, scaled));
}
