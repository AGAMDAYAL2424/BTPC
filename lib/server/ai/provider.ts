import 'server-only';
import type { Lang } from '../../shared/types';

/**
 * One method per external operation rather than a generic `fetch` wrapper.
 *
 * This shape makes each call site obvious, gives every mock a single concrete
 * return type, and keeps the API key read in exactly one place. It is also what
 * makes the injection defence natural: `rankCandidates` can only return an id,
 * so there is no path from model output to answer content.
 */
export interface AiProvider {
  readonly name: string;
  readonly available: boolean;

  /** Query embedding. Null on any failure, which drops to the deterministic engine. */
  embed(text: string, kind: 'query' | 'document'): Promise<Float32Array | null>;

  /**
   * Choose among candidate QUESTIONS. Never sees the answers.
   * Returns one of the supplied ids, or null for "none of these".
   */
  rankCandidates(
    question: string,
    candidates: Array<{ id: string; question: string }>,
  ): Promise<string | null>;

  /** Conversational rewrite of an approved answer. Null if it should not be used. */
  polish(canonical: string, lang: Lang): Promise<string | null>;
}

/** Used when there is no API key, or the provider is switched off. */
export class NoAiProvider implements AiProvider {
  readonly name = 'none';
  readonly available = false;

  async embed(): Promise<Float32Array | null> {
    return null;
  }

  async rankCandidates(): Promise<string | null> {
    return null;
  }

  async polish(): Promise<string | null> {
    return null;
  }
}
