import { describe, expect, it } from 'vitest';
import { FixedWindowLimiter } from '../../lib/server/guard/ratelimit';

/**
 * The clock is injected, because a limiter that reads Date.now directly cannot
 * be tested without sleeping.
 */
function limiterAt(start: number, windowMs = 1000, max = 3) {
  let now = start;
  const limiter = new FixedWindowLimiter(windowMs, max, () => now);
  return { limiter, advance: (ms: number) => { now += ms; } };
}

describe('FixedWindowLimiter', () => {
  it('allows requests up to the limit', () => {
    const { limiter } = limiterAt(0);
    expect(limiter.consume('k').allowed).toBe(true);
    expect(limiter.consume('k').allowed).toBe(true);
    expect(limiter.consume('k').allowed).toBe(true);
  });

  it('refuses the request past the limit', () => {
    const { limiter } = limiterAt(0);
    for (let i = 0; i < 3; i += 1) limiter.consume('k');
    expect(limiter.consume('k').allowed).toBe(false);
  });

  it('counts each key separately', () => {
    const { limiter } = limiterAt(0);
    for (let i = 0; i < 3; i += 1) limiter.consume('a');
    expect(limiter.consume('a').allowed).toBe(false);
    expect(limiter.consume('b').allowed).toBe(true);
  });

  it('starts a fresh budget once the window has rolled over', () => {
    const { limiter, advance } = limiterAt(0);
    for (let i = 0; i < 4; i += 1) limiter.consume('k');
    advance(1001);
    expect(limiter.consume('k').allowed).toBe(true);
  });

  it('reports how long to wait', () => {
    const { limiter } = limiterAt(0);
    for (let i = 0; i < 4; i += 1) limiter.consume('k');
    expect(limiter.consume('k').retryAfterSeconds).toBeGreaterThan(0);
  });

  it('does not consume budget when only peeking', () => {
    const { limiter } = limiterAt(0);
    limiter.peek('k');
    limiter.peek('k');
    expect(limiter.peek('k').remaining).toBe(3);
  });

  it('gives budget back on a refund', () => {
    const { limiter } = limiterAt(0);
    limiter.consume('k');
    limiter.consume('k');
    limiter.refund('k');
    expect(limiter.peek('k').remaining).toBe(2);
  });

  it('drops expired windows so the map cannot grow without bound', () => {
    const { limiter, advance } = limiterAt(0, 1000, 100);
    for (let i = 0; i < 50; i += 1) limiter.consume(`key-${i}`);
    expect(limiter.size).toBe(50);
    advance(61_000);
    limiter.consume('trigger-sweep');
    expect(limiter.size).toBe(1);
  });
});
