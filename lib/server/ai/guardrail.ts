import 'server-only';
import type { Lang } from '../../shared/types';

/**
 * Verifies that a model-polished answer still says what the approved answer
 * said.
 *
 * The chatbot-flow-design skill's strongest objection to rewriting retrieved
 * content is that it "risks drifting from the source-of-truth", and it insists
 * hallucination be TRACKED rather than merely instructed against. So every
 * polished string is checked mechanically, and any failure serves the canonical
 * text instead. The rejection is counted so the rate is visible in the admin
 * analytics rather than invisible.
 *
 * The facts this protects are concrete: 1095, 112, the 60 to 90 minute airport
 * buffer, and the 13 September exam date.
 */

export interface VerificationResult {
  ok: boolean;
  failures: string[];
}

const DIGITS = /\d+/g;
const URLISH = /(https?:\/\/|www\.)\S+/gi;
const DEVANAGARI = /[ऀ-ॿ]/g;

/** Model preamble or refusal leaking into the answer text. */
const META_MARKERS = [
  'as an ai', 'as a language model', 'i cannot', "i can't", 'i am unable',
  'here is the', 'here is a', 'rewritten:', 'sure,', 'certainly,',
  'मैं एक', 'यहाँ है', 'निम्नलिखित',
];

function multiset(text: string, re: RegExp): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of text.match(re) ?? []) {
    out.set(m, (out.get(m) ?? 0) + 1);
  }
  return out;
}

export function verifyPolish(
  canonical: string,
  polished: string,
  lang: Lang,
): VerificationResult {
  const failures: string[] = [];

  if (polished.trim().length === 0) {
    return { ok: false, failures: ['empty'] };
  }

  // Every number in the approved answer must survive, and none may appear that
  // was not there. A fabricated helpline number is the worst failure mode here.
  const wanted = multiset(canonical, DIGITS);
  const got = multiset(polished, DIGITS);
  for (const [digit, count] of wanted) {
    if ((got.get(digit) ?? 0) < count) failures.push(`dropped number ${digit}`);
  }
  for (const digit of got.keys()) {
    if (!wanted.has(digit)) failures.push(`invented number ${digit}`);
  }

  // No links, ever. The canonical answers contain none.
  if ((polished.match(URLISH) ?? []).length > (canonical.match(URLISH) ?? []).length) {
    failures.push('invented a link');
  }

  // A rewrite that is much shorter has dropped content; much longer has added it.
  const ratio = polished.length / Math.max(1, canonical.length);
  if (ratio < 0.6) failures.push(`too short (${ratio.toFixed(2)}x)`);
  if (ratio > 1.6) failures.push(`too long (${ratio.toFixed(2)}x)`);

  // The Hindi answers are Hinglish, so a Hindi rewrite must still be
  // predominantly Devanagari, and an English one must not slip into Devanagari.
  const devaCount = (polished.match(DEVANAGARI) ?? []).length;
  const devaRatio = devaCount / Math.max(1, polished.replace(/\s/g, '').length);
  if (lang === 'hi' && devaRatio < 0.15) failures.push('lost the Devanagari');
  if (lang === 'en' && devaRatio > 0.05) failures.push('drifted into Devanagari');

  const lower = polished.toLowerCase();
  for (const marker of META_MARKERS) {
    if (lower.includes(marker)) {
      failures.push(`model preamble: ${marker}`);
      break;
    }
  }

  // Em-dashes and en-dashes are banned in every user-visible string, and
  // model-written prose is where they leak in.
  if (/[—–]/.test(polished)) failures.push('em-dash or en-dash');

  return { ok: failures.length === 0, failures };
}

/**
 * Answers whose wording should never be rewritten at all.
 *
 * Anything carrying a number, a date, or a helpline is served exactly as
 * approved. In practice that is most of the corpus, which is the correct
 * default for a police advisory.
 */
export function isPolishSafe(canonical: string): boolean {
  if (DIGITS.test(canonical)) return false;
  if (/\b(September|सितंबर|1095|112)\b/i.test(canonical)) return false;
  return true;
}
