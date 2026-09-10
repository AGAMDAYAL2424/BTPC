import 'server-only';
import type { Tier } from '../../shared/types';
import { config } from '../config';
import type { KnowledgeRepo } from '../db/repo';
import {
  addressDegradeLimiter,
  addressThrottleLimiter,
  aiLimiter,
  chatLimiter,
  sessionFloodLimiter,
  type LimitResult,
} from './ratelimit';
import { SPAM_DEGRADE_THRESHOLD, SPAM_THROTTLE_THRESHOLD, type SpamSignals } from './spam';

export interface TierDecision {
  tier: Tier;
  /** Why the visitor is not on the AI tier, for the notice shown in the UI. */
  reason:
    | null
    | 'budget_spent'
    | 'daily_quota'
    | 'no_api_key'
    | 'spam_suspected'
    | 'session_flood'
    | 'address_flood'
    | 'flood';
  limit: LimitResult;
}

export interface TierInput {
  primaryKey: string;
  addressKey: string;
  /** Address plus the visitor's session id. See `sessionKey` in ratelimit.ts. */
  sessionKey: string;
  spam: SpamSignals;
  repo: KnowledgeRepo;
}

/** Throttle logs, at most one a minute, so a flood cannot also flood the log. */
let lastThrottleLog = 0;

function logThrottle(stage: string, key: string): void {
  const now = Date.now();
  if (now - lastThrottleLog < 60_000) return;
  lastThrottleLog = now;
  // The key is a salted hash and the prefix identifies nobody, but it is enough
  // to tell one abusive source from every visitor collapsing onto one bucket,
  // which is the difference between ignoring this and fixing a proxy.
  console.warn(`[tiers] throttled on ${stage}, key ${key.slice(0, 8)}`);
}

/**
 * Decide how a request is served.
 *
 * The important property is that only a genuine flood produces a refusal.
 * Everything else degrades: the visitor still gets the correct approved answer,
 * just selected by the deterministic engine and served verbatim rather than
 * polished. A public safety surface should not go quiet because someone typed
 * too fast or because a free-tier quota ran out.
 */
export function resolveTier(input: TierInput): TierDecision {
  const { primaryKey, addressKey: addr, sessionKey: sess, spam, repo } = input;

  // Every volume counter is consumed before any branch, so the counts stay
  // accurate whichever way the decision goes and the ordering below is free to
  // express severity rather than bookkeeping.
  const hardFlood = addressThrottleLimiter.consume(addr);
  const softFlood = addressDegradeLimiter.consume(addr);
  const sessionFlood = sessionFloodLimiter.consume(sess);
  const baseline = chatLimiter.consume(primaryKey);

  // The only volume ceiling that refuses service, and it sits above this whole
  // deployment's expected peak throughput from a single address.
  if (!hardFlood.allowed) {
    logThrottle('address', addr);
    return { tier: 'throttled', reason: 'flood', limit: hardFlood };
  }

  if (spam.score >= SPAM_THROTTLE_THRESHOLD) {
    return { tier: 'throttled', reason: 'flood', limit: hardFlood };
  }

  if (!baseline.allowed) {
    // Over the baseline but not flooding: keep answering, without the model.
    return { tier: 'deterministic', reason: 'budget_spent', limit: baseline };
  }

  if (spam.score >= SPAM_DEGRADE_THRESHOLD) {
    return { tier: 'deterministic', reason: 'spam_suspected', limit: baseline };
  }

  if (config.ai.provider === 'none' || !config.ai.geminiApiKey) {
    return { tier: 'deterministic', reason: 'no_api_key', limit: baseline };
  }

  if (repo.getQuota('embed') + repo.getQuota('llm') >= config.ai.dailyQuota) {
    return { tier: 'deterministic', reason: 'daily_quota', limit: baseline };
  }

  // Stages 1 and 2. Checked after the key and quota gates because without a
  // model there is nothing left to degrade, and reporting a volume reason for a
  // visitor who was always going to be served deterministically would put a
  // misleading notice on the answer.
  if (!sessionFlood.allowed) {
    return { tier: 'deterministic', reason: 'session_flood', limit: baseline };
  }

  if (!softFlood.allowed) {
    return { tier: 'deterministic', reason: 'address_flood', limit: baseline };
  }

  const ai = aiLimiter.consume(primaryKey);
  if (!ai.allowed) {
    return { tier: 'deterministic', reason: 'budget_spent', limit: baseline };
  }

  return { tier: 'ai', reason: null, limit: baseline };
}
