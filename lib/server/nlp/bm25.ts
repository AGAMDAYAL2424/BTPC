import 'server-only';

/**
 * BM25 over a small in-memory corpus.
 *
 * Hand-rolled rather than pulled from a library for two reasons: 60 documents
 * needs about 60 lines, and user text must never reach SQLite FTS5 MATCH
 * syntax, where operators like NEAR and * are injectable even through a bound
 * parameter. Scoring in application code removes that surface entirely.
 */

/** Term frequency saturation. 1.2 is the standard default. */
const K1 = 1.2;
/** Length normalisation. 0.75 is the standard default. */
const B = 0.75;

export interface Bm25Doc {
  id: string;
  tokens: string[];
}

export class Bm25Index {
  private readonly docFreq = new Map<string, number>();
  private readonly termFreq = new Map<string, Map<string, number>>();
  private readonly docLength = new Map<string, number>();
  private avgDocLength = 0;
  private docCount = 0;

  constructor(docs: Bm25Doc[] = []) {
    for (const doc of docs) this.add(doc);
  }

  add(doc: Bm25Doc): void {
    const counts = new Map<string, number>();
    for (const token of doc.tokens) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
    this.termFreq.set(doc.id, counts);
    this.docLength.set(doc.id, doc.tokens.length);
    for (const term of counts.keys()) {
      this.docFreq.set(term, (this.docFreq.get(term) ?? 0) + 1);
    }
    this.docCount = this.termFreq.size;
    let total = 0;
    for (const len of this.docLength.values()) total += len;
    this.avgDocLength = this.docCount > 0 ? total / this.docCount : 0;
  }

  /**
   * Probabilistic IDF, floored at zero. Without the floor, a term appearing in
   * more than half of a 60 document corpus scores negative and actively
   * penalises a document for containing the word the visitor asked about.
   */
  private idf(term: string): number {
    const df = this.docFreq.get(term) ?? 0;
    if (df === 0) return 0;
    return Math.max(0, Math.log(1 + (this.docCount - df + 0.5) / (df + 0.5)));
  }

  score(queryTokens: string[], docId: string): number {
    const counts = this.termFreq.get(docId);
    const length = this.docLength.get(docId);
    if (!counts || length === undefined || this.avgDocLength === 0) return 0;

    const norm = K1 * (1 - B + B * (length / this.avgDocLength));
    let score = 0;
    for (const term of new Set(queryTokens)) {
      const tf = counts.get(term);
      if (tf === undefined) continue;
      score += this.idf(term) * ((tf * (K1 + 1)) / (tf + norm));
    }
    return score;
  }

  scoreAll(queryTokens: string[]): Map<string, number> {
    const out = new Map<string, number>();
    for (const id of this.termFreq.keys()) {
      out.set(id, this.score(queryTokens, id));
    }
    return out;
  }

  /**
   * Highest score this query reaches against any document in the corpus.
   * Reported for diagnostics only. It must NOT be used to normalise, see
   * `saturate` below.
   */
  maxPossible(queryTokens: string[]): number {
    let max = 0;
    for (const id of this.termFreq.keys()) {
      const s = this.score(queryTokens, id);
      if (s > max) max = s;
    }
    return max;
  }

  get size(): number {
    return this.docCount;
  }
}

/**
 * Squash unbounded BM25 into [0,1) with an absolute meaning.
 *
 * The obvious alternative, dividing by the best score in the corpus, was tried
 * first and is actively wrong: it hands 1.0 to the least-bad row for ANY input,
 * so a question about the weather scores as high lexically as a real one and
 * the confidence threshold stops meaning anything. A saturating transform keeps
 * the channel comparable across queries, which is what a threshold needs.
 */
export function saturate(raw: number, k = 4): number {
  return raw <= 0 ? 0 : raw / (raw + k);
}
