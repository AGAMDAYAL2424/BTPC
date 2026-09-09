import 'server-only';

/**
 * Environment, read once at module load.
 *
 * Secrets fail fast rather than surfacing as a confusing runtime error later,
 * with one deliberate exception: GEMINI_API_KEY is OPTIONAL. The bot is
 * designed to work with no key at all, serving the deterministic engine and
 * verbatim answers, so a missing key must not stop the process.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Resolved on first use rather than at import.
 *
 * A predictable secret in production would make admin sessions forgeable and
 * rate-limit keys guessable, so it must be required. But `next build` runs with
 * NODE_ENV=production while generating static pages and a sitemap, none of
 * which need the secret, and throwing during module load would fail the build
 * on a machine that legitimately has no runtime secrets. Deferring to first use
 * still fails on the very first request, and never silently falls back to a
 * weak value in production.
 */
let cachedSecret: string | null = null;

function sessionSecret(): string {
  if (cachedSecret) return cachedSecret;
  cachedSecret = isProduction
    ? required('SESSION_SECRET')
    : (process.env.SESSION_SECRET ?? 'dev-only-insecure-session-secret');
  return cachedSecret;
}

export const config = {
  isProduction,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL ?? 'data/brics-faq.db',
  get sessionSecret(): string {
    return sessionSecret();
  },

  ai: {
    provider: (process.env.AI_PROVIDER ?? 'gemini') as 'gemini' | 'none',
    /** Absent is a supported state, not an error. */
    geminiApiKey: process.env.GEMINI_API_KEY?.trim() || null,
    embeddingModel: 'gemini-embedding-001',
    chatModel: 'gemini-2.5-flash-lite',
    /** Hard ceiling per day, so one abuser cannot exhaust the free tier. */
    dailyQuota: int('GEMINI_DAILY_QUOTA', 1200),
    /** Milliseconds. Past this the canonical answer is served instead. */
    timeoutMs: int('AI_TIMEOUT_MS', 2500),
  },

  limits: {
    /** Longest question accepted. Rejected, never truncated. */
    maxQuestionChars: 500,
    /** Body cap applied before JSON parsing. */
    maxBodyBytes: 8 * 1024,
    /** Baseline chat limiter. */
    chatWindowMs: 15 * 60 * 1000,
    chatMax: 100,
    /** Stricter limiter counted only when a request reaches the model. */
    aiWindowMs: 60 * 60 * 1000,
    aiMax: int('AI_BUDGET_PER_WINDOW', 25),
    /** Admin login. Only failures consume budget. */
    loginWindowMinutes: 15,
    loginMax: 5,
  },

  session: {
    idleMinutes: 60,
    absoluteHours: 8,
    cookieName: 'dtp_admin_session',
  },

  privacy: {
    /** Days before a flagged question's raw text is scrubbed. */
    flaggedRetentionDays: int('FLAGGED_RETENTION_DAYS', 30),
  },

  helplines: {
    traffic: '1095',
    emergency: '112',
  },
} as const;

export type Config = typeof config;
