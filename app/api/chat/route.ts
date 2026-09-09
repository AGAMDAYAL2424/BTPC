// better-sqlite3 is a native module and the retrieval engine reads files at
// module load, so this route cannot run on the edge runtime. Stated explicitly
// so it does not get "optimised" to edge later.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { after } from 'next/server';
import { z } from 'zod';
import { config } from '../../../lib/server/config';
import { getRepo } from '../../../lib/server/db';
import { getAiProvider } from '../../../lib/server/ai';
import { getIndex } from '../../../lib/server/retrieval/store';
import { buildReply } from '../../../lib/server/reply/build';
import { getSession, saveSession } from '../../../lib/server/reply/session';
import {
  addressKey,
  ipHash as hashIp,
  limiterKey,
} from '../../../lib/server/guard/ratelimit';
import { resolveTier } from '../../../lib/server/guard/tiers';
import { scoreSpam } from '../../../lib/server/guard/spam';
import { collapseRepeats, normalize } from '../../../lib/server/nlp/normalize';
import { t } from '../../../lib/shared/strings';
import type { Lang } from '../../../lib/shared/types';

/**
 * Allowlist, not a denylist. `.strict()` rejects unknown keys, and the message
 * cap rejects rather than truncates: silently answering a question that was cut
 * in half is worse than declining it.
 *
 * Conversation history is deliberately NOT accepted. Session state lives on the
 * server, so there is no client-supplied transcript to validate or trust.
 */
const BodySchema = z
  .object({
    message: z.string().trim().min(1).max(config.limits.maxQuestionChars),
    lang: z.enum(['hi', 'en']),
    sessionId: z.string().uuid().optional(),
  })
  .strict();

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
  });
}

/** A correlation id the visitor can quote without anything internal leaking. */
function correlationId(): string {
  return crypto.randomUUID().slice(0, 8);
}

export async function POST(request: Request): Promise<Response> {
  const started = Date.now();
  const requestId = correlationId();

  // Body size is checked before parsing. Schema validation cannot protect
  // against a body large enough to exhaust memory during JSON.parse.
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > config.limits.maxBodyBytes) {
    return json({ error: 'Request too large', requestId }, 413);
  }

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > config.limits.maxBodyBytes) {
      return json({ error: 'Request too large', requestId }, 413);
    }
    raw = JSON.parse(text);
  } catch {
    return json({ error: 'Invalid request', requestId }, 400);
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    // The schema shape is not echoed back to an unauthenticated caller.
    console.warn(`[chat ${requestId}] validation failed: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`);
    return json({ error: 'Invalid request', requestId }, 400);
  }

  const { message, lang } = parsed.data;
  const sessionId = parsed.data.sessionId ?? crypto.randomUUID();

  const repo = getRepo();
  const primaryKey = limiterKey(request.headers, 'chat');
  const addrKey = addressKey(request.headers, 'chat');
  const session = getSession(sessionId);
  const now = Date.now();

  // Spam is scored before the tier decision, because a high score is one of the
  // things that drops a visitor to the deterministic engine.
  const normalized = collapseRepeats(normalize(message));
  const spam = scoreSpam({
    normalized,
    noLexicalSignal: false,
    history: { recent: session.recent, timestamps: session.timestamps },
    now,
  });

  const decision = resolveTier({ primaryKey, addressKey: addrKey, spam, repo });

  const rateHeaders = {
    'x-ratelimit-limit': String(decision.limit.limit),
    'x-ratelimit-remaining': String(decision.limit.remaining),
    'x-ratelimit-reset': String(Math.floor(decision.limit.resetAt / 1000)),
  };

  if (decision.tier === 'throttled') {
    const s = t(lang as Lang);
    return json(
      {
        reply: {
          kind: 'throttled',
          title: s.tooManyTitle,
          body: s.tooManyBody,
          followUp: s.followUp,
          lang,
          tier: 'throttled',
          suggestions: [],
          helplines: { traffic: config.helplines.traffic, emergency: config.helplines.emergency },
        },
        sessionId,
        requestId,
      },
      429,
      { ...rateHeaders, 'retry-after': String(decision.limit.retryAfterSeconds) },
    );
  }

  try {
    const built = await buildReply({
      question: message,
      lang: lang as Lang,
      sessionId,
      session,
      tier: decision.tier,
      tierReason: decision.reason,
      index: getIndex(),
      repo,
      ai: getAiProvider(),
      ipHash: hashIp(request.headers),
      now,
    });

    saveSession(sessionId, built.session);
    const latencyMs = Date.now() - started;

    // Logging and the flagged-question write must not delay the answer.
    let messageId: number | null = null;
    messageId = repo.logMessage({
      sessionId,
      turn: built.session.turn,
      textHash: built.log.textHash,
      textLength: built.log.textLength,
      lang: lang as Lang,
      script: built.log.script as never,
      matchedFaqId: built.log.faqId,
      intentId: built.log.intentId,
      score: built.log.score,
      band: built.log.band,
      fallbackLayer: built.log.fallbackLayer,
      ruleKind: built.log.ruleKind,
      tier: decision.tier,
      llmFired: built.log.llmFired,
      polishRejected: built.log.polishRejected,
      cacheHit: built.log.cacheHit,
      latencyMs,
    });

    after(() => {
      if (built.log.injectionMarkers.length > 0) {
        // Recorded for visibility only. The defence is that the model can only
        // return an id from an allowlist, so there is nothing here to steer.
        console.warn(
          `[chat ${requestId}] injection markers: ${built.log.injectionMarkers.join(', ')}`,
        );
      }
      if (built.log.spam.reasons.length > 0) {
        console.info(
          `[chat ${requestId}] spam ${built.log.spam.score.toFixed(2)}: ${built.log.spam.reasons.join(', ')}`,
        );
      }
    });

    return json(
      { reply: { ...built.reply, messageId }, sessionId, requestId },
      200,
      rateHeaders,
    );
  } catch (error) {
    // Full detail to the log, a generic message plus a quotable id to the
    // caller. No SQLite text, no file paths, no stack.
    console.error(`[chat ${requestId}] failed`, error);
    const s = t(lang as Lang);
    return json(
      {
        reply: {
          kind: 'error',
          title: s.errorTitle,
          body: s.errorBody,
          followUp: s.followUp,
          lang,
          tier: decision.tier,
          suggestions: [],
          helplines: { traffic: config.helplines.traffic, emergency: config.helplines.emergency },
        },
        sessionId,
        requestId,
      },
      500,
    );
  }
}
