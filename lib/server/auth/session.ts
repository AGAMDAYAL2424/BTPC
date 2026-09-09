import 'server-only';
import { randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { config } from '../config';
import { getRepo } from '../db';
import type { SessionRecord } from '../db/repo';
import { verifyPassword, dummyVerify } from './password';

/**
 * Opaque random session ids in an HttpOnly cookie, with the record in the
 * database.
 *
 * A JWT in localStorage would be readable by any script on the page and could
 * not be revoked without building a blocklist. An opaque id gives short
 * expiry, server-side revocation and no sensitive data in the token, which are
 * the three properties that actually matter, with less machinery.
 */

function newSessionId(): string {
  return randomBytes(32).toString('base64url');
}

export interface LoginOutcome {
  ok: boolean;
  /** Deliberately identical for an unknown user and a wrong password. */
  error?: 'invalid' | 'locked';
  retryAfterMinutes?: number;
}

function attemptKey(username: string): string {
  return createHash('sha256')
    .update(`login:${username.toLowerCase()}:${config.sessionSecret}`)
    .digest('hex')
    .slice(0, 32);
}

export async function login(username: string, password: string): Promise<LoginOutcome> {
  const repo = getRepo();
  const key = attemptKey(username);

  // Only failures consume budget, so a busy legitimate user is never locked out.
  const failures = repo.countRecentLoginFailures(key, config.limits.loginWindowMinutes);
  if (failures >= config.limits.loginMax) {
    return {
      ok: false,
      error: 'locked',
      retryAfterMinutes: config.limits.loginWindowMinutes,
    };
  }

  const admin = repo.findAdmin(username);
  if (!admin) {
    // Spend the same time as a real check, so timing does not leak existence.
    await dummyVerify(password);
    repo.recordLoginFailure(key);
    return { ok: false, error: 'invalid' };
  }

  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) {
    repo.recordLoginFailure(key);
    return { ok: false, error: 'invalid' };
  }

  repo.clearLoginFailures(key);
  repo.touchAdminLogin(admin.id);

  // Rotated on every login, so an id fixed before login is useless afterwards.
  const id = newSessionId();
  repo.createSession(id, admin.id, config.session.idleMinutes, config.session.absoluteHours);

  const jar = await cookies();
  jar.set(config.session.cookieName, id, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/admin',
    maxAge: config.session.absoluteHours * 3600,
  });

  return { ok: true };
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(config.session.cookieName)?.value;
  if (id) getRepo().deleteSession(id);
  jar.delete({ name: config.session.cookieName, path: '/admin' });
}

/**
 * The authoritative session check. Called inside every admin page and action,
 * never only in middleware or a layout: middleware cannot reach the database,
 * and a layout guard is not an authorisation check for the actions beneath it.
 */
export async function currentSession(): Promise<SessionRecord | null> {
  const jar = await cookies();
  const id = jar.get(config.session.cookieName)?.value;
  if (!id) return null;

  const repo = getRepo();
  const session = repo.getSession(id);
  if (!session) return null;

  // Slide the idle window. The absolute ceiling is untouched.
  repo.refreshSession(id, config.session.idleMinutes);
  return session;
}

/** Throws rather than returning null, for use at the top of a mutation. */
export async function requireSession(): Promise<SessionRecord> {
  const session = await currentSession();
  if (!session) throw new Error('UNAUTHENTICATED');
  return session;
}

/**
 * Same-origin check for state-changing requests.
 *
 * Server Actions carry their own Origin check, but the api-security skill is
 * silent on CSRF entirely, so this is applied explicitly rather than relying on
 * a framework behaviour that could change.
 */
export function isSameOrigin(request: { headers: Headers }): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin) return true; // Same-origin form posts may omit it.
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
