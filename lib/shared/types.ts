/** Display + input languages. `hi` serves the advisory's original Hinglish wording. */
export type Lang = 'hi' | 'en';

/** Detected script of the user's raw input, independent of display language. */
export type Script = 'devanagari' | 'latin' | 'mixed';

/** Content that changes day to day must not be asserted as a fixed fact. */
export type Volatility = 'stable' | 'volatile';

export type FaqStatus = 'published' | 'draft' | 'retired';
export type FaqSource = 'seed' | 'admin';

/** Which rung of the fallback ladder produced a reply. */
export type FallbackLayer = 0 | 1 | 2 | 3 | 4;

/** Confidence band from the retrieval engine. */
export type Band = 'confident' | 'ambiguous' | 'miss';

/** How a request was served. Degrades rather than refusing. */
export type Tier = 'ai' | 'deterministic' | 'throttled';

/**
 * A deterministic rule can pre-empt retrieval entirely. Both of these are
 * safety boundaries: a similarity match must never be able to answer them.
 */
export type RuleKind = 'emergency' | 'personalization' | 'human_request';

export interface Intent {
  id: string;
  nameHi: string;
  nameEn: string;
  descriptionEn: string;
  /** Written boundary. Topics that look adjacent but must not be answered here. */
  outOfScope: string[];
  displayOrder: number;
  /** Shown as an opening quick-reply chip on mobile. */
  featured: boolean;
}

export interface Faq {
  id: string;
  intentId: string;
  displayOrder: number;
  questionHi: string;
  questionEn: string;
  /** Verbatim from FAQs.docx. Never rewritten. */
  answerHi: string;
  answerEn: string;
  /** Alternate phrasings, used by the lexical and phonetic scorers. */
  variantsHi: string[];
  variantsEn: string[];
  /** Romanised Hinglish phrasings, e.g. "kya metro chalegi". */
  variantsRoman: string[];
  keywords: string[];
  volatility: Volatility;
  provenance: string;
  source: FaqSource;
  status: FaqStatus;
  lastUpdated: string;
}

export interface ScoreBreakdown {
  embedding: number;
  lexical: number;
  phonetic: number;
  keyword: number;
  fused: number;
}

export interface Candidate {
  faqId: string;
  intentId: string;
  score: number;
  breakdown: ScoreBreakdown;
}

export interface RetrievalResult {
  band: Band;
  /** Null on a miss. */
  faqId: string | null;
  score: number;
  /** Gap between the top two candidates. A small margin means ambiguity. */
  margin: number;
  candidates: Candidate[];
  lang: Lang;
  script: Script;
  /** True when the embedding scorer contributed (i.e. a vector was available). */
  usedEmbedding: boolean;
}
