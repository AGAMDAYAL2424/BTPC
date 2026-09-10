import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KnowledgeRepo } from '../../lib/server/db/repo';
import { resolveTier } from '../../lib/server/guard/tiers';
import { config } from '../../lib/server/config';

/**
 * The property under test is that only a genuine flood produces a refusal.
 *
 * Every other pressure - a spent AI budget, an exhausted daily quota, a missing
 * API key, suspected spam - has to keep answering, just without the model. A
 * public safety surface that goes quiet because a free-tier quota ran out would
 * be worse than one that never had a model in the first place.
 */
function fakeRepo(quota = { embed: 0, llm: 0 }): KnowledgeRepo {
  return {
    getQuota: (kind: 'embed' | 'llm') => quota[kind],
  } as unknown as KnowledgeRepo;
}

const clean = { score: 0, reasons: [] as string[] };

function decide(opts: {
  key?: string;
  sessionKey?: string;
  spamScore?: number;
  quota?: { embed: number; llm: number };
} = {}) {
  const key = opts.key ?? `key-${Math.random()}`;
  return resolveTier({
    primaryKey: key,
    addressKey: key,
    sessionKey: opts.sessionKey ?? key,
    spam: opts.spamScore === undefined ? clean : { score: opts.spamScore, reasons: ['test'] },
    repo: fakeRepo(opts.quota),
  });
}

beforeEach(() => {
  // Without this the API-key spy from one test leaks into the next, which made
  // the no-key case pass for the wrong reason.
  vi.restoreAllMocks();
});

/** Pretend a key is configured, for the duration of one test. */
function withKey(): void {
  vi.spyOn(config.ai, 'geminiApiKey', 'get').mockReturnValue('test-key');
}

describe('resolveTier', () => {
  it('uses the model when there is a key, budget, and clean traffic', () => {
    withKey();
    expect(decide().tier).toBe('ai');
  });

  it('falls back to the deterministic engine when there is no key', () => {
    const d = decide();
    expect(d.tier).toBe('deterministic');
    expect(d.reason).toBe('no_api_key');
  });

  it('degrades rather than refusing once the per-visitor AI budget is spent', () => {
    withKey();
    const key = `budget-${Date.now()}`;
    let last = decide({ key });
    for (let i = 0; i < config.limits.aiMax + 2; i += 1) last = decide({ key });
    expect(last.tier).toBe('deterministic');
    expect(last.reason).toBe('budget_spent');
  });

  it('degrades rather than refusing once the daily quota is exhausted', () => {
    withKey();
    const d = decide({ quota: { embed: config.ai.dailyQuota, llm: 0 } });
    expect(d.tier).toBe('deterministic');
    expect(d.reason).toBe('daily_quota');
  });

  it('degrades rather than refusing when spam is suspected', () => {
    withKey();
    const d = decide({ spamScore: 0.6 });
    expect(d.tier).toBe('deterministic');
    expect(d.reason).toBe('spam_suspected');
  });

  it('throttles only on a genuine flood', () => {
    const d = decide({ spamScore: 0.95 });
    expect(d.tier).toBe('throttled');
  });

  it('reports rate-limit headers on every decision', () => {
    const d = decide();
    expect(d.limit.limit).toBeGreaterThan(0);
    expect(d.limit.resetAt).toBeGreaterThan(0);
  });
});

/**
 * The failure this ladder exists to prevent.
 *
 * The flood ceiling used to be keyed on the bare address alone, which cannot
 * tell a carrier-NAT crowd from a single attacker. Indian mobile traffic sits
 * behind CGNAT, so one public address can be hundreds of genuine citizens; the
 * old single ceiling would have refused all of them together, and a sitewide
 * 429 on a public safety surface during the event it was built for is the worst
 * outcome this system has.
 */
describe('volume ladder', () => {
  it('never refuses a crowd sharing one address', () => {
    const address = `crowd-${Date.now()}`;
    const decisions = [];

    // 300 people behind one carrier gateway, five questions each.
    for (let person = 0; person < 300; person += 1) {
      for (let turn = 0; turn < 5; turn += 1) {
        decisions.push(
          resolveTier({
            // A real crowd differs by user agent, so the baseline key differs too.
            primaryKey: `${address}-ua-${person}`,
            addressKey: address,
            sessionKey: `${address}-session-${person}`,
            spam: clean,
            repo: fakeRepo(),
          }),
        );
      }
    }

    expect(decisions).toHaveLength(1500);
    expect(decisions.filter((d) => d.tier === 'throttled')).toHaveLength(0);
  });

  it('degrades a single runaway conversation instead of refusing it', () => {
    withKey();
    const key = `runaway-${Date.now()}`;
    let last = decide({ key });
    for (let i = 0; i < config.limits.sessionFloodMax + 2; i += 1) last = decide({ key });

    expect(last.tier).toBe('deterministic');
    expect(last.reason).toBe('session_flood');
  });

  it('still refuses a genuine flood from one address', () => {
    const address = `flood-${Date.now()}`;
    let last = decide({ key: address });
    for (let i = 0; i < config.limits.addressThrottleMax + 2; i += 1) {
      last = decide({ key: address, sessionKey: `${address}-${i}` });
    }

    expect(last.tier).toBe('throttled');
    expect(last.reason).toBe('flood');
  });

  it('keeps the address ceiling above the whole deployment peak', () => {
    // ~3 req/s sitewide at peak is ~2700 per 15 minute window across every
    // visitor. One address must be allowed well past that before it is refused,
    // or a busy gateway becomes indistinguishable from an attack.
    expect(config.limits.addressThrottleMax).toBeGreaterThan(2700);
    expect(config.limits.addressDegradeMax).toBeLessThan(config.limits.addressThrottleMax);
    expect(config.limits.sessionFloodMax).toBeLessThan(config.limits.addressDegradeMax);
    // The AI budget must bite before the conversation ceiling, or 'budget_spent'
    // becomes unreachable.
    expect(config.limits.aiMax).toBeLessThan(config.limits.sessionFloodMax);
  });
});
