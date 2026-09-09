import 'server-only';
import { createHash } from 'node:crypto';
import type { Band, Faq, Lang, Tier } from '../../shared/types';
import type { ChatReply, Suggestion } from '../../shared/reply';
import { FEATURED_INTENTS, getIntent } from '../../shared/intents';
import { t } from '../../shared/strings';
import { config } from '../config';
import type { KnowledgeRepo } from '../db/repo';
import { collapseRepeats, normalize } from '../nlp/normalize';
import { romanize } from '../nlp/translit';
import { checkRules, type RuleMatch } from '../rules/index';
import type { SearchIndex } from '../retrieval/index';
import type { AiProvider } from '../ai/provider';
import { isPolishSafe, verifyPolish } from '../ai/guardrail';
import { detectInjectionAttempt, scoreSpam, type SpamSignals } from '../guard/spam';
import type { SessionState } from './session';

/**
 * A margin this small means the top two rows are effectively tied. When they
 * also sit in different intents, guessing is worse than asking.
 */
const TIE_MARGIN = 0.03;

export interface BuildInput {
  question: string;
  lang: Lang;
  sessionId: string;
  session: SessionState;
  tier: Tier;
  tierReason: string | null;
  index: SearchIndex;
  repo: KnowledgeRepo;
  ai: AiProvider;
  ipHash: string | null;
  now: number;
}

export interface BuildOutput {
  reply: ChatReply;
  session: SessionState;
  /** Everything the caller needs to log, after the response has been sent. */
  log: {
    textHash: string;
    textLength: number;
    band: Band;
    fallbackLayer: number;
    ruleKind: string | null;
    intentId: string | null;
    faqId: string | null;
    score: number;
    llmFired: boolean;
    polishRejected: boolean;
    cacheHit: boolean;
    script: string;
    spam: SpamSignals;
    injectionMarkers: string[];
    flagged: boolean;
  };
}

function hash(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 32);
}

function answerOf(faq: Faq, lang: Lang): string {
  return lang === 'hi' ? faq.answerHi : faq.answerEn;
}

function questionOf(faq: Faq, lang: Lang): string {
  return lang === 'hi' ? faq.questionHi : faq.questionEn;
}

function toSuggestions(
  ids: Array<{ faqId: string; intentId: string }>,
  index: SearchIndex,
  lang: Lang,
  limit: number,
): Suggestion[] {
  const out: Suggestion[] = [];
  for (const c of ids) {
    const faq = index.getFaq(c.faqId);
    if (!faq) continue;
    out.push({ faqId: faq.id, label: questionOf(faq, lang), intentId: c.intentId });
    if (out.length >= limit) break;
  }
  return out;
}

/** Capability chips drawn from the real intent list, never generic options. */
function intentChips(lang: Lang, index: SearchIndex): Suggestion[] {
  const out: Suggestion[] = [];
  for (const intent of FEATURED_INTENTS) {
    const first = index.firstFaqOfIntent(intent.id);
    if (!first) continue;
    out.push({
      faqId: first.id,
      label: lang === 'hi' ? intent.nameHi : intent.nameEn,
      intentId: intent.id,
    });
  }
  return out;
}

function base(lang: Lang, tier: Tier, tierReason: string | null): ChatReply {
  const s = t(lang);
  return {
    kind: 'answer',
    title: null,
    body: '',
    guidance: null,
    faqId: null,
    intentId: null,
    band: 'miss',
    suggestions: [],
    suggestionsLabel: null,
    helplines: null,
    referenceId: null,
    escalationSummary: null,
    followUp: s.followUp,
    volatile: false,
    lastUpdated: null,
    provenance: null,
    tier,
    tierNotice:
      tier === 'deterministic' && tierReason !== 'no_api_key'
        ? s.tierNoticeDeterministic
        : null,
    lang,
    messageId: null,
  };
}

/**
 * Build the reply for a rule match. None of these paths touch retrieval, an
 * embedding call, or the polish model.
 */
function ruleReply(
  rule: RuleMatch,
  lang: Lang,
  index: SearchIndex,
  reply: ChatReply,
  question: string,
): ChatReply {
  const s = t(lang);
  const guidanceFaq = rule.linkedFaqId ? index.getFaq(rule.linkedFaqId) : null;
  const guidance = guidanceFaq ? answerOf(guidanceFaq, lang) : null;
  const helplines = { traffic: config.helplines.traffic, emergency: config.helplines.emergency };

  if (rule.kind === 'emergency') {
    return {
      ...reply,
      kind: 'emergency',
      title: s.emergencyTitle,
      body: s.emergencyBody,
      guidance,
      faqId: guidanceFaq?.id ?? null,
      intentId: guidanceFaq?.intentId ?? null,
      band: 'confident',
      helplines,
    };
  }

  if (rule.kind === 'personalization') {
    return {
      ...reply,
      kind: 'boundary',
      title: s.boundaryTitle,
      body: s.boundaryBody,
      band: 'confident',
      helplines,
      suggestions: intentChips(lang, index),
      suggestionsLabel: s.chipsIntro,
    };
  }

  // A phone number cannot receive a transcript, so the handoff is split: the
  // caller gets a summary to read out, and the admin queue gets the record.
  return {
    ...reply,
    kind: 'escalate',
    title: s.escalateTitle,
    body: s.escalateBody,
    band: 'confident',
    helplines,
    escalationSummary: question,
    suggestions: intentChips(lang, index),
    suggestionsLabel: s.chipsIntro,
  };
}

export async function buildReply(input: BuildInput): Promise<BuildOutput> {
  const { question, lang, index, repo, ai, tier, tierReason, now } = input;
  const s = t(lang);
  const session = { ...input.session };
  session.turn += 1;
  session.timestamps = [...session.timestamps, now];

  const normalized = collapseRepeats(normalize(question));
  const romanized = collapseRepeats(normalize(romanize(question)));
  const textHash = hash(normalized);
  const injectionMarkers = detectInjectionAttempt(normalized);

  const spam = scoreSpam({
    normalized,
    noLexicalSignal: false,
    history: { recent: session.recent, timestamps: session.timestamps },
    now,
  });
  session.recent = [...session.recent, normalized];

  const log: BuildOutput['log'] = {
    textHash,
    textLength: question.length,
    band: 'miss',
    fallbackLayer: 0,
    ruleKind: null,
    intentId: null,
    faqId: null,
    score: 0,
    llmFired: false,
    polishRejected: false,
    cacheHit: false,
    script: 'latin',
    spam,
    injectionMarkers,
    flagged: false,
  };

  let reply = base(lang, tier, tierReason);

  if (tier === 'throttled') {
    return {
      reply: { ...reply, kind: 'throttled', title: s.tooManyTitle, body: s.tooManyBody },
      session,
      log,
    };
  }

  // ------------------------------------------------- deterministic boundaries
  const rule = checkRules(normalized, romanized);
  if (rule) {
    log.ruleKind = rule.kind;
    log.band = 'confident';
    const built = ruleReply(rule, lang, index, reply, question);
    log.faqId = built.faqId;
    log.intentId = built.intentId;
    return { reply: built, session, log };
  }

  // ------------------------------------------------------------------ caching
  const cacheKey = hash(`${lang}|${normalized}`);
  const cached = tier === 'ai' ? repo.getCachedResult(cacheKey) : null;

  let band: Band;
  let faqId: string | null;
  let score: number;
  let margin = 0;
  let candidates: Array<{ faqId: string; intentId: string; score: number }>;
  let script = 'latin';

  if (cached) {
    log.cacheHit = true;
    band = cached.band;
    faqId = cached.faqId;
    score = cached.score;
    candidates = cached.candidates;
    const top = candidates[0];
    const second = candidates[1];
    margin = top && second ? top.score - second.score : (top?.score ?? 0);
  } else {
    // A vector is only fetched on the AI tier. Everything below still works
    // without one, which is what makes degradation invisible to the visitor.
    let vector: Float32Array | null = null;
    if (tier === 'ai' && ai.available) {
      const vecKey = hash(`v|${normalized}`);
      vector = repo.getCachedVector(vecKey);
      if (!vector) {
        vector = await ai.embed(question, 'query');
        if (vector) repo.putCachedVector(vecKey, config.ai.embeddingModel, vector);
      }
    }

    const result = index.search(question, { lang, vector });
    band = result.band;
    faqId = result.faqId;
    score = result.score;
    margin = result.margin;
    script = result.script;
    candidates = result.candidates.map((c) => ({
      faqId: c.faqId,
      intentId: c.intentId,
      score: c.score,
    }));
  }

  log.script = script;
  log.score = score;

  const top = candidates[0];
  const second = candidates[1];
  const crossIntent = Boolean(top && second && top.intentId !== second.intentId);

  // ----------------------------------------------------- model arbitration
  // Only when the ranking is genuinely close. The model can return an id from
  // the offered list or nothing, so it cannot introduce content.
  if (
    tier === 'ai' &&
    ai.available &&
    !cached &&
    band === 'ambiguous' &&
    margin < TIE_MARGIN &&
    candidates.length >= 2
  ) {
    const offered = candidates.slice(0, 5).flatMap((c) => {
      const faq = index.getFaq(c.faqId);
      return faq ? [{ id: faq.id, question: questionOf(faq, lang) }] : [];
    });
    const picked = await ai.rankCandidates(question, offered);
    log.llmFired = true;
    if (picked) {
      faqId = picked;
      band = 'confident';
      candidates = [
        candidates.find((c) => c.faqId === picked) ?? candidates[0]!,
        ...candidates.filter((c) => c.faqId !== picked),
      ];
    }
  }

  if (!cached && tier === 'ai') {
    repo.putCachedResult(cacheKey, { faqId, band, score, candidates });
  }

  log.band = band;

  // ------------------------------------------------------------- fallback ladder
  if (band === 'miss' || !faqId) {
    const flagged = repo.flagQuestion({
      questionRaw: question.slice(0, config.limits.maxQuestionChars),
      questionNorm: normalized,
      lang,
      script: script as never,
      topCandidates: candidates.slice(0, 3).map((c) => ({ faqId: c.faqId, score: c.score })),
      topScore: score,
      fallbackLayer: 3,
      ipHash: input.ipHash,
      retentionDays: config.privacy.flaggedRetentionDays,
    });
    log.flagged = true;
    log.fallbackLayer = 3;
    session.escalationOffered = true;

    return {
      reply: {
        ...reply,
        kind: 'fallback',
        title: s.fallbackTitle,
        body: `${s.fallbackBody}`,
        guidance: s.fallbackResource,
        band: 'miss',
        suggestions: intentChips(lang, index),
        suggestionsLabel: s.chipsIntro,
        helplines: {
          traffic: config.helplines.traffic,
          emergency: config.helplines.emergency,
        },
        referenceId: flagged.referenceId,
      },
      session,
      log,
    };
  }

  const faq = index.getFaq(faqId);
  if (!faq) {
    return { reply: { ...reply, kind: 'error', title: s.errorTitle, body: s.errorBody }, session, log };
  }

  log.faqId = faq.id;
  log.intentId = faq.intentId;
  session.lastIntentId = faq.intentId;

  // A dead tie across two different topics is the one case where asking beats
  // answering. The skill allows exactly one clarification round per
  // conversation, so a second tie is answered rather than asked again.
  if (band === 'ambiguous' && crossIntent && margin < TIE_MARGIN && session.clarifications === 0) {
    session.clarifications += 1;
    const suggestions = toSuggestions(candidates.slice(0, 3), index, lang, 3);
    session.offered = [...session.offered, ...suggestions.map((x) => x.faqId)];
    log.fallbackLayer = 1;

    // Also queued, at layer 1 rather than layer 3.
    //
    // Having to ask which topic the visitor meant is itself a coverage signal:
    // it usually means the question is about something the advisory does not
    // cover, and the nearest rows are spread across unrelated topics. Without
    // this, "will shops be open during the summit" would quietly get three
    // topic chips forever and never reach anyone who could write the answer.
    repo.flagQuestion({
      questionRaw: question.slice(0, config.limits.maxQuestionChars),
      questionNorm: normalized,
      lang,
      script: script as never,
      topCandidates: candidates.slice(0, 3).map((c) => ({ faqId: c.faqId, score: c.score })),
      topScore: score,
      fallbackLayer: 1,
      ipHash: input.ipHash,
      retentionDays: config.privacy.flaggedRetentionDays,
    });
    log.flagged = true;

    return {
      reply: {
        ...reply,
        kind: 'disambiguate',
        title: null,
        body: s.disambiguate,
        band,
        intentId: faq.intentId,
        suggestions,
        suggestionsLabel: null,
      },
      session,
      log,
    };
  }

  // ------------------------------------------------------------------- answer
  let body = answerOf(faq, lang);

  // Tone polish: off for any answer carrying a number, date or helpline, which
  // is most of them. Generated once per row per language and cached, never per
  // visitor, and discarded entirely if the verifier finds any drift.
  if (tier === 'ai' && ai.available && isPolishSafe(body)) {
    const cachedPolish = repo.getPolished(faq.id, lang);
    if (cachedPolish) {
      body = cachedPolish;
    } else {
      const polished = await ai.polish(body, lang);
      log.llmFired = true;
      if (polished) {
        const check = verifyPolish(body, polished, lang);
        if (check.ok) {
          repo.putPolished(faq.id, lang, polished, true);
          body = polished;
        } else {
          log.polishRejected = true;
          console.warn(`[polish] rejected for ${faq.id}/${lang}: ${check.failures.join(', ')}`);
        }
      }
    }
  }

  const alternatives =
    band === 'ambiguous'
      ? toSuggestions(
          candidates.slice(1, 3).filter((c) => !session.offered.includes(c.faqId)),
          index,
          lang,
          2,
        )
      : [];
  session.offered = [...session.offered, ...alternatives.map((x) => x.faqId)];

  return {
    reply: {
      ...reply,
      kind: 'answer',
      title: null,
      body,
      band,
      faqId: faq.id,
      intentId: faq.intentId,
      suggestions: alternatives,
      suggestionsLabel: alternatives.length > 0 ? s.didYouMean : null,
      volatile: faq.volatility === 'volatile',
      lastUpdated: faq.lastUpdated,
      provenance: faq.provenance,
    },
    session,
    log,
  };
}
