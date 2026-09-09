import 'server-only';
import type { Band, Faq, Lang, Script, Tier } from '../../shared/types';

/**
 * Persistence contract.
 *
 * Everything the app needs from a database lives behind this interface, with a
 * SQLite adapter today. Moving to Postgres later is one new file implementing
 * this, not a change anywhere else.
 */

export interface FlaggedRow {
  id: number;
  referenceId: string;
  questionRaw: string;
  questionNorm: string;
  lang: Lang;
  script: Script;
  topCandidates: Array<{ faqId: string; score: number }>;
  topScore: number;
  fallbackLayer: number;
  clusterId: string;
  occurrences: number;
  status: 'new' | 'answered' | 'dismissed';
  resolvedFaqId: string | null;
  firstSeen: string;
  lastSeen: string;
}

export interface FlagInput {
  questionRaw: string;
  questionNorm: string;
  lang: Lang;
  script: Script;
  topCandidates: Array<{ faqId: string; score: number }>;
  topScore: number;
  fallbackLayer: number;
  ipHash: string | null;
  /** Days before the raw question text is purged. */
  retentionDays: number;
}

export interface MessageLog {
  sessionId: string;
  turn: number;
  textHash: string;
  textLength: number;
  lang: Lang;
  script: Script;
  matchedFaqId: string | null;
  intentId: string | null;
  score: number;
  band: Band;
  fallbackLayer: number;
  ruleKind: string | null;
  tier: Tier;
  llmFired: boolean;
  polishRejected: boolean;
  cacheHit: boolean;
  latencyMs: number;
}

export interface CachedResult {
  faqId: string | null;
  band: Band;
  score: number;
  candidates: Array<{ faqId: string; intentId: string; score: number }>;
}

export interface AdminRecord {
  id: number;
  username: string;
  passwordHash: string;
  role: string;
}

export interface SessionRecord {
  id: string;
  adminId: number;
  role: string;
  username: string;
}

export interface Analytics {
  totalMessages: number;
  byBand: Record<string, number>;
  byTier: Record<string, number>;
  byLang: Record<string, number>;
  byIntent: Array<{
    intentId: string;
    asked: number;
    confident: number;
    missed: number;
    ruleRouted: number;
    helpful: number;
    notHelpful: number;
  }>;
  fallbackByLayer: Record<string, number>;
  topFlagged: Array<{ referenceId: string; question: string; occurrences: number }>;
  llmCalls: number;
  polishRejections: number;
  cacheHitRate: number;
  medianLatencyMs: number;
  p95LatencyMs: number;
}

export interface KnowledgeRepo {
  /** Every published row, for building the search index. */
  listPublishedFaqs(): Faq[];
  listAllFaqs(): Faq[];
  getFaq(id: string): Faq | null;
  upsertFaq(faq: Faq): void;
  setFaqStatus(id: string, status: Faq['status']): void;

  getVector(faqId: string): Float32Array | null;
  listVectors(): Map<string, Float32Array>;
  putVector(faqId: string, model: string, vector: Float32Array): void;

  /** Increments the occurrence count when a near-identical question recurs. */
  flagQuestion(input: FlagInput): FlaggedRow;
  listFlagged(status: FlaggedRow['status'], limit?: number): FlaggedRow[];
  getFlagged(id: number): FlaggedRow | null;
  resolveFlagged(id: number, faqId: string): void;
  dismissFlagged(id: number): void;
  /** Deletes raw question text past its retention deadline. */
  purgeExpiredFlagged(): number;

  logMessage(log: MessageLog): number;
  recordFeedback(messageId: number, rating: 1 | -1): void;
  analytics(sinceIso?: string): Analytics;

  getCachedResult(queryHash: string): CachedResult | null;
  putCachedResult(queryHash: string, result: CachedResult): void;
  clearResultCache(): void;

  getCachedVector(queryHash: string): Float32Array | null;
  putCachedVector(queryHash: string, model: string, vector: Float32Array): void;

  getPolished(faqId: string, lang: Lang): string | null;
  putPolished(faqId: string, lang: Lang, text: string, verified: boolean): void;
  clearPolishCache(faqId?: string): void;

  findAdmin(username: string): AdminRecord | null;
  createAdmin(username: string, passwordHash: string, role: string): number;
  touchAdminLogin(adminId: number): void;

  createSession(id: string, adminId: number, idleMinutes: number, absoluteHours: number): void;
  getSession(id: string): SessionRecord | null;
  /** Slides the idle window forward; the absolute ceiling is untouched. */
  refreshSession(id: string, idleMinutes: number): void;
  deleteSession(id: string): void;
  deleteSessionsForAdmin(adminId: number): void;

  countRecentLoginFailures(key: string, windowMinutes: number): number;
  recordLoginFailure(key: string): void;
  clearLoginFailures(key: string): void;

  /** Returns the running count AFTER incrementing, so callers can compare. */
  bumpQuota(kind: 'embed' | 'llm', by?: number): number;
  getQuota(kind: 'embed' | 'llm'): number;

  getSetting(key: string): string | null;
  putSetting(key: string, value: string): void;
}
