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
  lexical: 0.21,
  phonetic: 0.2,
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
  lexical: 0.32,
  phonetic: 0.3,
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
 * Fitted by `npm run eval -- --tune` over goldset.json AND stressset.json
 * together, 228 queries spanning 4 to 30 words.
 *
 * Achieved with NO embeddings at all: top-1 96.9% overall
 * (98.3 deva / 93.3 en / 96.7 roman / 100 verbose), top-3 100%, zero
 * out-of-scope questions answered confidently, zero in-scope misses.
 *
 * Fitting on short questions alone produced a materially different and worse
 * configuration, because three channels are length-sensitive and a terse-only
 * fit silently optimises for one end of the distribution.
 */
export const DEFAULT_THRESHOLDS: Thresholds = {
  confident: 0.64,
  floor: 0.24,
  // Near zero on purpose, and safe only because of what sits above it: at 96%
  // top-1 a clear gap to the runner-up is no longer the signal it was, and the
  // case a margin actually protects against, two rows tied ACROSS topics, is
  // caught separately by TIE_MARGIN in reply/build.ts, which asks the visitor
  // which topic they meant instead of guessing.
  margin: 0.005,
  absoluteEvidence: 0.4,
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
