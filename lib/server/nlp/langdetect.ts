import 'server-only';
import type { Lang, Script } from '../../shared/types';

const DEVANAGARI = /[ऀ-ॿ]/g;
const LATIN_LETTER = /[a-z]/gi;

/**
 * Detect the script a question was typed in, independent of the display
 * language the visitor selected.
 *
 * This matters because the advisory itself is Hinglish: a Hindi answer is full
 * of Latin-script words like "Metro" and "security". So a question containing
 * Latin characters is not evidence of an English question, and the threshold
 * for calling something `mixed` has to be generous on both sides.
 */
export function detectScript(normalized: string): Script {
  const deva = (normalized.match(DEVANAGARI) ?? []).length;
  const latin = (normalized.match(LATIN_LETTER) ?? []).length;
  const total = deva + latin;
  if (total === 0) return 'latin';
  const devaRatio = deva / total;
  if (devaRatio >= 0.85) return 'devanagari';
  if (devaRatio <= 0.05) return 'latin';
  return 'mixed';
}

/**
 * Romanised Hindi function words. These are the giveaway that a Latin-script
 * question is actually Hindi: "kya metro chalegi" has no Devanagari at all.
 */
const ROMAN_HINDI_MARKERS = new Set([
  'kya', 'kyaa', 'kaise', 'kaisa', 'kaha', 'kahan', 'kab', 'kyun', 'kyon', 'kitna',
  'kitni', 'kitne', 'hai', 'hain', 'ho', 'hoga', 'hogi', 'honge', 'raha', 'rahi',
  'rahega', 'rahegi', 'karu', 'karun', 'kare', 'karna', 'karni', 'chahiye', 'sakte',
  'sakta', 'sakti', 'nahi', 'nahin', 'mujhe', 'mera', 'meri', 'apna', 'apni', 'jana',
  'jaana', 'jaye', 'jayenge', 'milega', 'milegi', 'chalega', 'chalegi', 'band',
  'khula', 'rasta', 'raasta', 'gaadi', 'gadi', 'se', 'ko', 'ka', 'ki', 'ke', 'me',
  'mein', 'par', 'aur', 'ya', 'to', 'tak', 'liye', 'wala', 'wali', 'kaun', 'kaunsa',
  'zaroori', 'jaruri', 'pahunche', 'pahunchu', 'nikle', 'niklu', 'dekhe', 'bataye',
]);

export function hasRomanHindiMarkers(tokens: string[]): boolean {
  return tokens.some((t) => ROMAN_HINDI_MARKERS.has(t));
}

/**
 * Which answer language to serve. The visitor's explicit choice wins, because
 * a Hindi speaker may deliberately read the English rendering and vice versa.
 * Script detection only supplies a default when no choice has been made.
 */
export function resolveLang(script: Script, tokens: string[], chosen?: Lang): Lang {
  if (chosen) return chosen;
  if (script === 'devanagari' || script === 'mixed') return 'hi';
  return hasRomanHindiMarkers(tokens) ? 'hi' : 'en';
}
