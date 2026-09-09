import 'server-only';
import { getRepo } from '../db';
import { SearchIndex } from './index';

/**
 * The search index, built once per process rather than per request.
 *
 * Module scope on the server is process-wide shared memory. An index is safe to
 * keep here because it holds only the knowledge base, which is the same for
 * every visitor; nothing request-specific is cached.
 */
let index: SearchIndex | null = null;

export function getIndex(): SearchIndex {
  if (!index) {
    const repo = getRepo();
    index = new SearchIndex(repo.listPublishedFaqs(), repo.listVectors());
  }
  return index;
}

/**
 * Called after an admin publishes or retires a row, so the next question sees
 * the change without a restart. Cached answers are dropped at the same time:
 * a question that previously fell through may now have a real answer.
 */
export function invalidateIndex(): void {
  index = null;
  getRepo().clearResultCache();
}
