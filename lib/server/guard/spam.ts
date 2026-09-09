import 'server-only';
import jaroWinkler from 'talisman/metrics/jaro-winkler';

/**
 * Composite spam scoring.
 *
 * A high score does not refuse service. It drops the visitor to the
 * deterministic engine, which still answers correctly from the approved text,
 * so a false positive costs a little answer polish rather than access to public
 * safety information. That asymmetry is deliberate and is why the thresholds
 * lean permissive.
 */

export interface SpamSignals {
  score: number;
  reasons: string[];
}

/** Short-term memory of what a visitor has already asked. */
export interface SessionHistory {
  recent: string[];
  /** Unix ms of the last few submissions, newest last. */
  timestamps: number[];
}

const VOWELS = /[aeiouाेैीौोुूिअआइईउऊएऐओऔ]/g;

/**
 * Shannon entropy per character. Real questions in either script sit in a
 * middling band; keyboard mashing sits high, and a single repeated character
 * sits near zero.
 */
function entropy(text: string): number {
  if (text.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const ch of text) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let h = 0;
  for (const n of counts.values()) {
    const p = n / text.length;
    h -= p * Math.log2(p);
  }
  return h;
}

export interface SpamInput {
  normalized: string;
  /** True when neither the lexical nor the phonetic channel found anything. */
  noLexicalSignal: boolean;
  history: SessionHistory;
  now: number;
}

export function scoreSpam(input: SpamInput): SpamSignals {
  const { normalized, history, now } = input;
  const reasons: string[] = [];
  let score = 0;

  // Burst rate. Five submissions inside ten seconds is not reading answers.
  const recentWindow = history.timestamps.filter((t) => now - t < 10_000);
  if (recentWindow.length >= 5) {
    score += 0.4;
    reasons.push('burst');
  } else if (recentWindow.length >= 3) {
    score += 0.15;
    reasons.push('fast');
  }

  // Near-identical repeats. Asking the same thing twice is normal; three times
  // consecutively is a script or a stuck finger.
  const nearIdentical = history.recent.filter(
    (prev) => prev.length > 0 && jaroWinkler(prev, normalized) > 0.95,
  ).length;
  if (nearIdentical >= 3) {
    score += 0.4;
    reasons.push('repeated');
  } else if (nearIdentical === 2) {
    score += 0.15;
    reasons.push('repetitive');
  }

  // Gibberish: no vowels at all, or extreme entropy, AND nothing matched.
  const letters = normalized.replace(/[^a-zऀ-ॿ]/g, '');
  if (letters.length >= 6) {
    const vowelRatio = (letters.match(VOWELS) ?? []).length / letters.length;
    const h = entropy(letters);
    if (input.noLexicalSignal && (vowelRatio < 0.12 || h > 4.2)) {
      score += 0.35;
      reasons.push('gibberish');
    }
  }

  // Single character or emoji spam.
  if (normalized.length > 0 && normalized.replace(/(.)\1*/g, '$1').length <= 2) {
    score += 0.3;
    reasons.push('degenerate');
  }

  // Length abuse. The route rejects anything over the cap outright; this
  // catches everything that squeezed under it.
  if (normalized.length > 380) {
    score += 0.2;
    reasons.push('overlong');
  }

  return { score: Math.min(1, score), reasons };
}

/** At or above this, drop to the deterministic engine. */
export const SPAM_DEGRADE_THRESHOLD = 0.5;
/** At or above this, throttle outright. Reserved for a genuine flood. */
export const SPAM_THROTTLE_THRESHOLD = 0.9;

/**
 * Phrases that try to steer a model rather than ask a question.
 *
 * Logged and stripped from what reaches the model, but note this is NOT the
 * defence against prompt injection. The defence is architectural: the model can
 * only ever return an id from a validated allowlist of known rows, and the text
 * served is the stored human-written answer. A phrase list would be a
 * blocklist, and blocklists lose.
 */
const INJECTION_MARKERS = [
  'ignore previous', 'ignore all previous', 'ignore the above',
  'disregard previous', 'disregard the above',
  'system prompt', 'you are now', 'act as', 'pretend to be',
  'new instructions', 'forget your instructions', 'reveal your',
  'print your instructions', 'jailbreak',
];

export function detectInjectionAttempt(normalized: string): string[] {
  return INJECTION_MARKERS.filter((m) => normalized.includes(m));
}
