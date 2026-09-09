import 'server-only';
import { createHash } from 'node:crypto';
import { config } from '../config';

/**
 * Fixed-window counters held in process memory.
 *
 * In-memory is correct for this deployment: the app runs as a single Node
 * process alongside a SQLite file, so there is one counter set and no
 * coordination problem. Behind more than one instance these counters would
 * diverge and each instance would allow the full budget, at which point this
 * needs to move to Redis. The interface below does not change when it does.
 */

interface Window {
  count: number;
  resetAt: number;
}

export interface LimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Unix ms when the window rolls over. */
  resetAt: number;
  retryAfterSeconds: number;
}

export type Clock = () => number;

export class FixedWindowLimiter {
  private readonly windows = new Map<string, Window>();
  private lastSweep = 0;

  constructor(
    private readonly windowMs: number,
    private readonly max: number,
    private readonly now: Clock = Date.now,
  ) {}

  /** Reads the current state without consuming budget. */
  peek(key: string): LimitResult {
    const t = this.now();
    const w = this.windows.get(key);
    if (!w || w.resetAt <= t) {
      return {
        allowed: true,
        limit: this.max,
        remaining: this.max,
        resetAt: t + this.windowMs,
        retryAfterSeconds: 0,
      };
    }
    return this.describe(w, t);
  }

  consume(key: string, cost = 1): LimitResult {
    const t = this.now();
    this.sweep(t);

    let w = this.windows.get(key);
    if (!w || w.resetAt <= t) {
      w = { count: 0, resetAt: t + this.windowMs };
      this.windows.set(key, w);
    }
    w.count += cost;
    return this.describe(w, t);
  }

  /** Returns budget, used when a request turned out not to need it. */
  refund(key: string, cost = 1): void {
    const w = this.windows.get(key);
    if (w) w.count = Math.max(0, w.count - cost);
  }

  private describe(w: Window, t: number): LimitResult {
    const remaining = Math.max(0, this.max - w.count);
    return {
      allowed: w.count <= this.max,
      limit: this.max,
      remaining,
      resetAt: w.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((w.resetAt - t) / 1000)),
    };
  }

  /** Drop expired windows occasionally so the map cannot grow without bound. */
  private sweep(t: number): void {
    if (t - this.lastSweep < 60_000) return;
    this.lastSweep = t;
    for (const [k, w] of this.windows) {
      if (w.resetAt <= t) this.windows.delete(k);
    }
  }

  get size(): number {
    return this.windows.size;
  }
}

/**
 * Derive a limiter key from request headers.
 *
 * A bare IP key is the wrong choice for this audience. Indian mobile traffic
 * sits behind carrier NAT, so a single address can represent thousands of
 * genuine users, and an IP-only limit would throttle an entire neighbourhood
 * because of one heavy user. Composing the user agent in separates most of
 * them without identifying anybody.
 *
 * The address is hashed, never stored or logged raw, and never written on the
 * same row as question text.
 */
export function limiterKey(headers: Headers, scope: string): string {
  const forwarded = headers.get('x-forwarded-for') ?? '';
  // Only the first hop is meaningful; the rest is client-supplied and untrusted.
  const ip = (forwarded.split(',')[0] ?? '').trim() || headers.get('x-real-ip') || 'unknown';
  const ua = headers.get('user-agent') ?? '';
  return createHash('sha256')
    .update(`${scope}:${ip}:${ua}:${config.sessionSecret}`)
    .digest('hex')
    .slice(0, 32);
}

/** Coarse per-address key, used only as the flood backstop. */
export function addressKey(headers: Headers, scope: string): string {
  const forwarded = headers.get('x-forwarded-for') ?? '';
  const ip = (forwarded.split(',')[0] ?? '').trim() || headers.get('x-real-ip') || 'unknown';
  return createHash('sha256')
    .update(`${scope}:${ip}:${config.sessionSecret}`)
    .digest('hex')
    .slice(0, 32);
}

/** Salted hash for storing alongside a flagged question, for abuse triage only. */
export function ipHash(headers: Headers): string {
  return addressKey(headers, 'store');
}

export const chatLimiter = new FixedWindowLimiter(
  config.limits.chatWindowMs,
  config.limits.chatMax,
);

/**
 * The AI budget. Exceeding it does NOT refuse service: it drops the visitor to
 * the deterministic engine, which answers the same questions from the same
 * approved text without calling out to a model.
 */
export const aiLimiter = new FixedWindowLimiter(
  config.limits.aiWindowMs,
  config.limits.aiMax,
);

/** Flood backstop. Deliberately far above the per-visitor budget. */
export const floodLimiter = new FixedWindowLimiter(
  config.limits.chatWindowMs,
  config.limits.chatMax * 12,
);
