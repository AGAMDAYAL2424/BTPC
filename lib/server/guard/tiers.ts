import 'server-only';
import type { Tier } from '../../shared/types';
import { config } from '../config';
import type { KnowledgeRepo } from '../db/repo';
import { aiLimiter, chatLimiter, floodLimiter, type LimitResult } from './ratelimit';
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
    | 'flood';
  limit: LimitResult;
}

export interface TierInput {
  primaryKey: string;
  addressKey: string;
  spam: SpamSignals;
  repo: KnowledgeRepo;
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
  const { primaryKey, addressKey: addr, spam, repo } = input;

  const flood = floodLimiter.consume(addr);
  if (!flood.allowed || spam.score >= SPAM_THROTTLE_THRESHOLD) {
    return { tier: 'throttled', reason: 'flood', limit: flood };
  }

  const baseline = chatLimiter.consume(primaryKey);
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

  const ai = aiLimiter.consume(primaryKey);
  if (!ai.allowed) {
    return { tier: 'deterministic', reason: 'budget_spent', limit: baseline };
  }

  return { tier: 'ai', reason: null, limit: baseline };
}
