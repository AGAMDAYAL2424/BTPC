import 'server-only';
import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
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
 * Strip a port or IPv6 brackets, then require something that is actually an
 * address. An unparseable value must never become a limiter key: it would put
 * every request carrying the same junk into one bucket.
 */
function cleanAddress(raw: string): string | null {
  let value = raw.trim();
  if (value.length === 0) return null;

  // [2001:db8::1]:443 -> 2001:db8::1
  const bracketed = /^\[(.+)\](?::\d+)?$/.exec(value);
  if (bracketed) {
    value = bracketed[1] ?? value;
  } else if (value.split(':').length === 2) {
    // 203.0.113.7:54321 -> 203.0.113.7. Only when there is exactly one colon:
    // a bare IPv6 address is full of them and must not be split.
    value = value.split(':')[0] ?? value;
  }

  return isIP(value) === 0 ? null : value;
}

/** Warnings about a malformed proxy chain, at most one a minute. */
let lastChainWarning = 0;

function warnChain(message: string): void {
  const now = Date.now();
  if (now - lastChainWarning < 60_000) return;
  lastChainWarning = now;
  console.warn(`[ratelimit] ${message}`);
}

/**
 * The client address, read from the correct end of the proxy chain.
 *
 * `x-forwarded-for` grows left to right, and each proxy *appends* rather than
 * replaces, so the leftmost entry is whatever the client sent and is forgeable.
 * With N trusted proxies in front of this process the real client sits N from
 * the right; everything further left is attacker-controlled.
 *
 * Reading the leftmost entry, which is the obvious thing to do, is wrong in two
 * opposite directions at once. A client can send a different forged value on
 * every request and get a fresh bucket each time, which removes rate limiting
 * altogether. And behind a proxy that does not forward the header, every
 * visitor collapses onto a single bucket and the flood ceiling then refuses the
 * entire site at once.
 */
export function clientIp(headers: Headers): string {
  const hops = config.limits.trustedProxyHops;

  if (hops > 0) {
    const chain = (headers.get('x-forwarded-for') ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    if (chain.length >= hops) {
      const candidate = cleanAddress(chain[chain.length - hops] ?? '');
      if (candidate) return candidate;
    } else {
      // The chain is shorter than the deployment says it should be, so
      // something in front is not appending. An absent header is the strongest
      // form of this and the likeliest real misconfiguration, and it is exactly
      // what collapses every visitor onto one bucket and refuses the whole site
      // at the flood ceiling. It should be loud on day one rather than
      // discovered at peak.
      warnChain(
        `x-forwarded-for has ${chain.length} hop(s) but TRUSTED_PROXY_HOPS=${hops}; ` +
          `falling back to x-real-ip. Check the proxy configuration.`,
      );
    }
  }

  return cleanAddress(headers.get('x-real-ip') ?? '') ?? 'unknown';
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
  const ua = headers.get('user-agent') ?? '';
  return createHash('sha256')
    .update(`${scope}:${clientIp(headers)}:${ua}:${config.sessionSecret}`)
    .digest('hex')
    .slice(0, 32);
}

/** Coarse per-address key, used only for the flood ceilings. */
export function addressKey(headers: Headers, scope: string): string {
  return createHash('sha256')
    .update(`${scope}:${clientIp(headers)}:${config.sessionSecret}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Per-conversation key: the address plus the session id the visitor is
 * carrying.
 *
 * The session id is client-supplied and trivially rotated, so this is not an
 * abuse control on its own. What it buys is the ability to tell a crowd apart
 * from a flood: three hundred people behind one carrier gateway hold three
 * hundred distinct session ids and stay well inside their own budgets, where a
 * single runaway client spends one budget quickly. An attacker who rotates the
 * id defeats this key and lands on the per-address ceilings instead, which is
 * what those are for.
 */
export function sessionKey(headers: Headers, sessionId: string, scope: string): string {
  return createHash('sha256')
    .update(`${scope}:${clientIp(headers)}:${sessionId}:${config.sessionSecret}`)
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

/**
 * Three volume ceilings, in increasing order of severity. Only the last one
 * refuses service.
 *
 * The single bare-address ceiling this replaced could not tell a carrier-NAT
 * crowd from one attacker, so a busy Jio gateway on event day would have been
 * refused wholesale. Splitting the conversation out gives the crowd somewhere
 * to spread, and leaves the address ceilings set high enough that only genuine
 * abuse reaches them.
 */
/** Stage 1: one conversation. Over budget drops to the deterministic engine. */
export const sessionFloodLimiter = new FixedWindowLimiter(
  config.limits.chatWindowMs,
  config.limits.sessionFloodMax,
);

/** Stage 2: one address, generous. Over budget drops to the deterministic engine. */
export const addressDegradeLimiter = new FixedWindowLimiter(
  config.limits.chatWindowMs,
  config.limits.addressDegradeMax,
);

/** Stage 3: one address, the only volume path to a 429. */
export const addressThrottleLimiter = new FixedWindowLimiter(
  config.limits.chatWindowMs,
  config.limits.addressThrottleMax,
);
