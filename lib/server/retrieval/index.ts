import 'server-only';
import type { Faq, Lang, RetrievalResult } from '../../shared/types';
import { Bm25Index } from '../nlp/bm25';
import { detectScript, resolveLang } from '../nlp/langdetect';
import { conceptGroups, expandSynonyms } from '../nlp/lexicon';
import { encodeTokens } from '../nlp/phonetic';
import { collapseRepeats, normalize } from '../nlp/normalize';
import { romanize } from '../nlp/translit';
import { contentTokens, expandMorphology } from '../nlp/tokenize';
import { decideBand, scoreCorpus, type ScorableDoc } from './score';
import {
  DEFAULT_THRESHOLDS,
  WEIGHTS_WITHOUT_EMBEDDING,
  WEIGHTS_WITH_EMBEDDING,
  type Thresholds,
  type Weights,
} from './thresholds';

/**
 * Every string a visitor might type to reach this row: both canonical
 * questions, every variant in all three writing styles, and the curated
 * keywords. Answers are deliberately excluded - matching on answer prose pulls
 * in boilerplate like "traffic police के instructions follow करें", which
 * appears in most rows and would blur them together.
 */
function searchableText(faq: Faq): string {
  return [
    faq.questionHi,
    faq.questionEn,
    ...faq.variantsHi,
    ...faq.variantsEn,
    ...faq.variantsRoman,
    ...faq.keywords,
  ].join(' ');
}

/**
 * Index in both writing systems at once.
 *
 * A Devanagari query is also romanised, so the two meet in Latin space. But the
 * lexicon carries Devanagari entries too, and a Devanagari-to-Devanagari hit is
 * a stronger, cleaner signal than one mediated by transliteration. Indexing the
 * union costs a little duplication in the term counts, applied evenly across
 * every row, and buys both paths.
 */
function dualScriptTokens(text: string): string[] {
  const direct = contentTokens(collapseRepeats(normalize(text)));
  const roman = contentTokens(collapseRepeats(normalize(romanize(text))));
  // Morphological variants are added on both sides, index and query, so a
  // question in the plural meets a keyword written in the singular.
  return expandMorphology([...new Set([...direct, ...roman])]);
}

export interface SearchOptions {
  /** Display language the visitor chose. Decides which answer text is served. */
  lang?: Lang;
  /** Query embedding, when one was obtained. Absent on the deterministic tier. */
  vector?: Float32Array | null;
  thresholds?: Thresholds;
  /** How many ranked candidates to return for disambiguation and flagging. */
  topK?: number;
  /** Grid search only. Production uses the weights implied by `vector`. */
  weightsOverride?: Weights;
  /** Grid search only. Saturation constant for the lexical channel. */
  bm25K?: number;
}

export class SearchIndex {
  private readonly docs: ScorableDoc[] = [];
  private readonly bm25: Bm25Index;
  private readonly byId = new Map<string, Faq>();

  constructor(faqs: Faq[], vectors: Map<string, Float32Array> = new Map()) {
    this.bm25 = new Bm25Index();
    for (const faq of faqs) {
      if (faq.status !== 'published') continue;
      this.add(faq, vectors.get(faq.id) ?? null);
    }
  }

  /**
   * Add or replace a row. Called at construction for the seed set, and again at
   * runtime when an admin publishes an answer, so a newly written FAQ is
   * searchable on the very next question without a restart.
   */
  add(faq: Faq, vector: Float32Array | null = null): void {
    const text = searchableText(faq);
    const tokens = dualScriptTokens(text);
    const doc: ScorableDoc = {
      faqId: faq.id,
      intentId: faq.intentId,
      tokens,
      codes: encodeTokens(tokens),
      groups: conceptGroups(tokens),
      keywords: new Set(faq.keywords.map((k) => normalize(k))),
      vector,
    };
    const existing = this.docs.findIndex((d) => d.faqId === faq.id);
    if (existing >= 0) this.docs[existing] = doc;
    else this.docs.push(doc);
    this.bm25.add({ id: faq.id, tokens });
    this.byId.set(faq.id, faq);
  }

  getFaq(id: string): Faq | undefined {
    return this.byId.get(id);
  }

  /** Lowest-numbered row in an intent, used as the target of a topic chip. */
  firstFaqOfIntent(intentId: string): Faq | undefined {
    let best: Faq | undefined;
    for (const faq of this.byId.values()) {
      if (faq.intentId !== intentId) continue;
      if (!best || faq.displayOrder < best.displayOrder) best = faq;
    }
    return best;
  }

  listFaqs(): Faq[] {
    return [...this.byId.values()].sort((a, b) => a.displayOrder - b.displayOrder);
  }

  get size(): number {
    return this.docs.length;
  }

  search(question: string, options: SearchOptions = {}): RetrievalResult {
    const { vector = null, thresholds = DEFAULT_THRESHOLDS, topK = 5 } = options;

    const normalized = collapseRepeats(normalize(question));
    const script = detectScript(normalized);
    const romanTokens = contentTokens(collapseRepeats(normalize(romanize(question))));
    const directTokens = contentTokens(normalized);
    const tokens = expandMorphology([...new Set([...directTokens, ...romanTokens])]);
    const lang = resolveLang(script, romanTokens, options.lang);

    const query = {
      tokens,
      expandedTokens: expandSynonyms(tokens),
      // Phonetic coding only makes sense on the Latin form.
      codes: encodeTokens(romanTokens.length > 0 ? romanTokens : tokens),
      groups: conceptGroups(tokens),
      vector,
    };

    const weights =
      options.weightsOverride ??
      (vector ? WEIGHTS_WITH_EMBEDDING : WEIGHTS_WITHOUT_EMBEDDING);
    const scored = scoreCorpus(query, this.docs, this.bm25, {
      weights,
      thresholds,
      bm25K: options.bm25K,
    });
    const decision = decideBand(scored, thresholds);

    return {
      band: decision.band,
      faqId: decision.band === 'miss' ? null : (scored.candidates[0]?.faqId ?? null),
      score: scored.candidates[0]?.score ?? 0,
      margin: decision.margin,
      candidates: scored.candidates.slice(0, topK),
      lang,
      script,
      usedEmbedding: vector !== null,
    };
  }
}
