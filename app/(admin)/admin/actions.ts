'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { INTENT_IDS } from '../../../lib/shared/intents';
import type { Faq } from '../../../lib/shared/types';
import { getRepo } from '../../../lib/server/db';
import { login, logout, requireSession } from '../../../lib/server/auth/session';
import { getAiProvider } from '../../../lib/server/ai';
import { invalidateIndex } from '../../../lib/server/retrieval/store';

/**
 * Every mutation follows the same order: authenticate, validate, fetch the row,
 * check it exists, then write. The session check lives inside each action
 * rather than only in the layout, because a layout guard is not an
 * authorisation check for the actions beneath it.
 *
 * Fields are copied one at a time from validated values, never spread from the
 * submitted form, so a hidden extra field cannot reach the database.
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

const LoginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
});

export async function loginAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  const parsed = LoginSchema.safeParse({
    username: form.get('username'),
    password: form.get('password'),
  });
  if (!parsed.success) return { ok: false, error: 'Enter a username and password.' };

  const result = await login(parsed.data.username, parsed.data.password);
  if (!result.ok) {
    if (result.error === 'locked') {
      return {
        ok: false,
        error: `Too many failed attempts. Try again in ${result.retryAfterMinutes} minutes.`,
      };
    }
    // Identical message whether the username exists or not.
    return { ok: false, error: 'Invalid credentials.' };
  }
  redirect('/admin');
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect('/admin/login');
}

const AnswerSchema = z.object({
  flaggedId: z.coerce.number().int().positive(),
  intentId: z.enum(INTENT_IDS as [string, ...string[]]),
  questionHi: z.string().trim().min(3).max(300),
  questionEn: z.string().trim().min(3).max(300),
  answerHi: z.string().trim().min(10).max(2000),
  answerEn: z.string().trim().min(10).max(2000),
  keywords: z.string().trim().max(500),
  volatility: z.enum(['stable', 'volatile']),
  provenance: z.string().trim().max(200),
});

/** Em-dashes and en-dashes are banned in every user-visible string. */
function findDashes(...values: string[]): boolean {
  return values.some((v) => /[—–]/.test(v));
}

export async function publishAnswerAction(
  _prev: unknown,
  form: FormData,
): Promise<ActionResult> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return { ok: false, error: 'Your session has expired. Please sign in again.' };
  }
  if (session.role !== 'editor' && session.role !== 'admin') {
    return { ok: false, error: 'Not authorised to publish answers.' };
  }

  const parsed = AnswerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: `${first?.path.join('.')}: ${first?.message}` };
  }
  const d = parsed.data;

  if (findDashes(d.questionHi, d.questionEn, d.answerHi, d.answerEn)) {
    return {
      ok: false,
      error: 'Please use a plain hyphen. Em-dashes and en-dashes are not used anywhere on the site.',
    };
  }

  const repo = getRepo();
  const flagged = repo.getFlagged(d.flaggedId);
  if (!flagged) return { ok: false, error: 'That queue item no longer exists.' };
  if (flagged.status !== 'new') return { ok: false, error: 'That queue item is already resolved.' };

  const existing = repo.listAllFaqs();
  const nextNumber =
    existing.reduce((max, f) => Math.max(max, f.displayOrder), 0) + 1;
  const faqId = `faq-adm-${String(nextNumber).padStart(3, '0')}`;

  const faq: Faq = {
    id: faqId,
    intentId: d.intentId,
    displayOrder: nextNumber,
    questionHi: d.questionHi,
    questionEn: d.questionEn,
    answerHi: d.answerHi,
    answerEn: d.answerEn,
    // The original phrasing becomes a matching variant, so the exact wording
    // that failed now succeeds.
    variantsHi: [],
    variantsEn: [],
    variantsRoman: [flagged.questionNorm],
    keywords: d.keywords
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0),
    volatility: d.volatility,
    provenance: d.provenance || 'Written by Delhi Traffic Police staff',
    source: 'admin',
    status: 'published',
    lastUpdated: new Date().toISOString().slice(0, 10),
  };

  repo.upsertFaq(faq);
  repo.resolveFlagged(d.flaggedId, faqId);

  // Embed the new row so the semantic channel covers it too. Failure here is
  // not fatal: the row is already reachable through the other three channels.
  const ai = getAiProvider();
  if (ai.available) {
    const vector = await ai.embed(
      `${faq.questionHi} ${faq.questionEn} ${faq.keywords.join(' ')}`,
      'document',
    );
    if (vector) repo.putVector(faqId, 'gemini-embedding-001', vector);
  }

  // Rebuild the index and drop cached answers, so the very next question sees
  // the new row without a restart.
  invalidateIndex();
  revalidatePath('/[lang]', 'page');
  revalidatePath('/admin');

  return { ok: true, message: `Published as ${faqId}. It is answering questions now.` };
}

export async function dismissFlaggedAction(
  _prev: unknown,
  form: FormData,
): Promise<ActionResult> {
  try {
    await requireSession();
  } catch {
    return { ok: false, error: 'Your session has expired. Please sign in again.' };
  }
  const id = z.coerce.number().int().positive().safeParse(form.get('flaggedId'));
  if (!id.success) return { ok: false, error: 'Invalid request.' };

  const repo = getRepo();
  const flagged = repo.getFlagged(id.data);
  if (!flagged) return { ok: false, error: 'That queue item no longer exists.' };

  repo.dismissFlagged(id.data);
  revalidatePath('/admin');
  return { ok: true, message: 'Dismissed.' };
}

const StatusSchema = z.object({
  faqId: z.string().trim().min(1).max(64),
  status: z.enum(['published', 'draft', 'retired']),
});

export async function setFaqStatusAction(
  _prev: unknown,
  form: FormData,
): Promise<ActionResult> {
  try {
    await requireSession();
  } catch {
    return { ok: false, error: 'Your session has expired. Please sign in again.' };
  }
  const parsed = StatusSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: 'Invalid request.' };

  const repo = getRepo();
  if (!repo.getFaq(parsed.data.faqId)) {
    return { ok: false, error: 'That entry no longer exists.' };
  }

  repo.setFaqStatus(parsed.data.faqId, parsed.data.status);
  invalidateIndex();
  revalidatePath('/[lang]', 'page');
  revalidatePath('/admin/faqs');
  return { ok: true, message: `${parsed.data.faqId} is now ${parsed.data.status}.` };
}

const EditSchema = z.object({
  faqId: z.string().trim().min(1).max(64),
  answerHi: z.string().trim().min(10).max(2000),
  answerEn: z.string().trim().min(10).max(2000),
});

export async function editAnswerAction(
  _prev: unknown,
  form: FormData,
): Promise<ActionResult> {
  try {
    await requireSession();
  } catch {
    return { ok: false, error: 'Your session has expired. Please sign in again.' };
  }
  const parsed = EditSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: 'Invalid request.' };
  if (findDashes(parsed.data.answerHi, parsed.data.answerEn)) {
    return { ok: false, error: 'Please use a plain hyphen instead of an em-dash or en-dash.' };
  }

  const repo = getRepo();
  const existing = repo.getFaq(parsed.data.faqId);
  if (!existing) return { ok: false, error: 'That entry no longer exists.' };

  repo.upsertFaq({
    ...existing,
    answerHi: parsed.data.answerHi,
    answerEn: parsed.data.answerEn,
    lastUpdated: new Date().toISOString().slice(0, 10),
  });
  // A changed answer invalidates any polished variant of the old wording.
  repo.clearPolishCache(parsed.data.faqId);
  invalidateIndex();
  revalidatePath('/[lang]', 'page');
  revalidatePath('/admin/faqs');
  return { ok: true, message: `${parsed.data.faqId} updated.` };
}
