import { afterEach, describe, expect, it, vi } from 'vitest';
import { clientIp } from '../../lib/server/guard/ratelimit';
import { config } from '../../lib/server/config';

/**
 * `x-forwarded-for` is only trustworthy from the right.
 *
 * Each proxy appends rather than replaces, so the leftmost entry is whatever
 * the client sent. Reading it - the obvious thing to do - fails in two opposite
 * directions: a client can forge a fresh value per request and get a fresh
 * limiter bucket every time, and behind a proxy that does not forward the
 * header at all every visitor collapses onto one bucket, at which point the
 * flood ceiling refuses the whole site at once.
 */
function headers(map: Record<string, string>): Headers {
  return new Headers(map);
}

function withHops(hops: number): void {
  vi.spyOn(config.limits, 'trustedProxyHops', 'get').mockReturnValue(hops);
}

/**
 * Chain warnings are throttled to one a minute at module scope, which is right
 * in production and makes these tests order-dependent. Jumping the clock past
 * the throttle gives each one its own window.
 */
let fakeClock = Date.now();

function freshWarningWindow(): ReturnType<typeof vi.spyOn> {
  fakeClock += 120_000;
  vi.spyOn(Date, 'now').mockReturnValue(fakeClock);
  return vi.spyOn(console, 'warn').mockImplementation(() => {});
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('clientIp', () => {
  it('reads the client from one trusted proxy', () => {
    withHops(1);
    expect(clientIp(headers({ 'x-forwarded-for': '203.0.113.7' }))).toBe('203.0.113.7');
  });

  it('ignores a forged entry the client prepended', () => {
    withHops(1);
    // The attacker sent 1.2.3.4; our proxy appended the address it actually saw.
    const ip = clientIp(headers({ 'x-forwarded-for': '1.2.3.4, 203.0.113.7' }));
    expect(ip).toBe('203.0.113.7');
    expect(ip).not.toBe('1.2.3.4');
  });

  it('cannot be made to hand out a fresh bucket per request', () => {
    withHops(1);
    const seen = new Set<string>();
    for (let i = 0; i < 20; i += 1) {
      seen.add(clientIp(headers({ 'x-forwarded-for': `10.0.0.${i}, 203.0.113.7` })));
    }
    expect([...seen]).toEqual(['203.0.113.7']);
  });

  it('reads through two proxies when both are trusted', () => {
    withHops(2);
    // client -> their Apache -> our Caddy
    expect(clientIp(headers({ 'x-forwarded-for': '203.0.113.7, 198.51.100.9' }))).toBe(
      '203.0.113.7',
    );
  });

  it('still ignores a forged entry with two proxies', () => {
    withHops(2);
    expect(
      clientIp(headers({ 'x-forwarded-for': '1.2.3.4, 203.0.113.7, 198.51.100.9' })),
    ).toBe('203.0.113.7');
  });

  it('falls back to x-real-ip when the chain is shorter than configured', () => {
    withHops(2);
    const warn = freshWarningWindow();
    const ip = clientIp(
      headers({ 'x-forwarded-for': '198.51.100.9', 'x-real-ip': '203.0.113.7' }),
    );
    expect(ip).toBe('203.0.113.7');
    // A silent fallback here is exactly how a sitewide 429 goes unnoticed.
    expect(warn).toHaveBeenCalled();
  });

  it('warns when the header is absent but a proxy is expected', () => {
    // The likeliest real misconfiguration: their Apache proxies to us without
    // forwarding the client address at all. Silent here means every visitor
    // shares one bucket and the site refuses itself at peak.
    withHops(1);
    const warn = freshWarningWindow();
    expect(clientIp(headers({ 'x-real-ip': '203.0.113.7' }))).toBe('203.0.113.7');
    expect(warn).toHaveBeenCalled();
  });

  it('ignores the header entirely when no proxy is trusted', () => {
    withHops(0);
    expect(
      clientIp(headers({ 'x-forwarded-for': '1.2.3.4', 'x-real-ip': '203.0.113.7' })),
    ).toBe('203.0.113.7');
  });

  it('refuses to turn an unparseable value into a key', () => {
    withHops(1);
    expect(clientIp(headers({ 'x-forwarded-for': 'not-an-address' }))).toBe('unknown');
    expect(clientIp(headers({ 'x-forwarded-for': '' }))).toBe('unknown');
    expect(clientIp(headers({}))).toBe('unknown');
  });

  it('strips a port without mangling IPv6', () => {
    withHops(1);
    expect(clientIp(headers({ 'x-forwarded-for': '203.0.113.7:54321' }))).toBe('203.0.113.7');
    expect(clientIp(headers({ 'x-forwarded-for': '[2001:db8::1]:443' }))).toBe('2001:db8::1');
    expect(clientIp(headers({ 'x-forwarded-for': '2001:db8::1' }))).toBe('2001:db8::1');
  });
});
