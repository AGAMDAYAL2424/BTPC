import 'server-only';

/** Devanagari digits ० through ९ mapped to ASCII. */
const DEVANAGARI_DIGITS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

/**
 * Characters that carry no matching signal but appear constantly in typed
 * questions. Devanagari danda (।) and double danda (॥) are sentence enders.
 */
const PUNCTUATION = /[!"#$%&'()*+,./:;<=>?@[\]^_`{|}~।॥‘’“”–—]/g;

/**
 * Fold a raw question into a stable comparison form.
 *
 * NFC first, because Devanagari can arrive either precomposed or as a base
 * character plus a combining nukta, and those must not score as different text.
 * ZWJ and ZWNJ are stripped only after normalisation, since they participate in
 * conjunct formation and removing them earlier can change the composed result.
 */
export function normalize(input: string): string {
  return input
    .normalize('NFC')
    .toLowerCase()
    .replace(/[‌‍﻿]/g, '')
    .replace(/[०-९]/g, (d) => DEVANAGARI_DIGITS[d] ?? d)
    .replace(PUNCTUATION, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Collapse a run of the same character, e.g. "kyaaaa" to "kyaa". */
export function collapseRepeats(input: string, max = 2): string {
  return input.replace(/(.)\1{2,}/g, (_m, ch: string) => ch.repeat(max));
}

/** Stable cache key for a question in a given language. */
export function queryKey(normalized: string, lang: string): string {
  return `${lang}:${normalized}`;
}
