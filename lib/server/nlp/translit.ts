import 'server-only';
import Sanscript from '@indic-transliteration/sanscript';

/**
 * Devanagari to Latin. ITRANS is the right target scheme here because its
 * output is plain ASCII, which both the phonetic coder and BM25 can consume
 * without further folding. "क्या मेट्रो चलेगी" becomes "kya metro chalegi",
 * which is exactly what a visitor types on a phone keyboard.
 */
export function devanagariToLatin(text: string): string {
  if (!/[ऀ-ॿ]/.test(text)) return text;
  return Sanscript.t(text, 'devanagari', 'itrans').toLowerCase();
}

/**
 * Produce a Latin-only form of a mixed-script question, leaving existing Latin
 * words untouched. Applied per run so "मुझे Airport जाना है" transliterates the
 * Devanagari without mangling "Airport".
 */
export function romanize(text: string): string {
  return text
    .replace(/[ऀ-ॿ]+/g, (run) => ` ${devanagariToLatin(run)} `)
    .replace(/\s+/g, ' ')
    .trim();
}
