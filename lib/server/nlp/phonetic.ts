import 'server-only';
import doubleMetaphone from 'talisman/phonetics/double-metaphone';
import jaroWinkler from 'talisman/metrics/jaro-winkler';

/**
 * Two phonetic channels, because neither alone covers this input.
 *
 * Double Metaphone knows English orthography, so it handles "airport" against
 * "airpot" and "challan" against "chalan". It knows nothing about Hindi.
 *
 * The Indic key handles what Double Metaphone cannot: the systematic gap
 * between how ITRANS transliterates Devanagari and how people actually type.
 * Sanscript renders घर as "ghara" and निकलना as "nikalana", but a visitor types
 * "ghar" and "nikalna" - Hindi deletes the inherent short vowel, ITRANS keeps
 * it. Dropping every non-initial vowel collapses both spellings onto the same
 * consonant skeleton, which is the whole trick.
 */

/** Aspirated to unaspirated, plus digraphs that vary freely in romanisation. */
const DIGRAPHS: Array<[RegExp, string]> = [
  [/chh/g, 'c'],
  [/ch/g, 'c'],
  [/kh/g, 'k'],
  [/gh/g, 'g'],
  [/jh/g, 'j'],
  [/th/g, 't'],
  [/dh/g, 'd'],
  [/ph/g, 'f'],
  [/bh/g, 'b'],
  [/sh/g, 's'],
  [/ss/g, 's'],
  [/shh/g, 's'],
];

/** Long vowels and diphthongs folded to their short counterparts. */
const VOWEL_FOLDS: Array<[RegExp, string]> = [
  [/aa+/g, 'a'],
  [/ii+/g, 'i'],
  [/ee+/g, 'i'],
  [/uu+/g, 'u'],
  [/oo+/g, 'u'],
  [/ai/g, 'e'],
  [/au/g, 'o'],
];

const VOWELS = /[aeiou]/g;

/**
 * Consonant skeleton of a romanised token. Keeps a leading vowel the way
 * Soundex keeps its first letter, so "airport" and "report" stay distinct.
 */
export function indicKey(token: string): string {
  let s = token.toLowerCase().replace(/[^a-z]/g, '');
  if (s.length === 0) return '';

  for (const [re, to] of DIGRAPHS) s = s.replace(re, to);
  for (const [re, to] of VOWEL_FOLDS) s = s.replace(re, to);

  // Every real Hindi aspirate was folded above, so a leftover consonant plus h
  // is a spelling artifact rather than a sound. This is what makes "delhi" and
  // "dilli" agree: lh is not an aspirate, so the h carries nothing.
  s = s.replace(/([^aeiouh])h/g, '$1');
  // Glide between vowels is inaudible: "chahiye" and "chahie" are one word.
  s = s.replace(/([aeiou])y([aeiou])/g, '$1$2');
  // Free variation in how Hindi sounds get typed in Latin script.
  s = s.replace(/w/g, 'v').replace(/z/g, 'j').replace(/q/g, 'k').replace(/x/g, 'ks');
  // Nasals collapse everywhere EXCEPT word-initially: ITRANS gives "bamda" for
  // बंद and "karem" for करें, so a non-initial m and n have to fold together.
  // The initial consonant is the most distinctive part of a word though, and
  // folding it too made "mausam" and "nasa" share a skeleton.
  const initial = s.slice(0, 1);
  s = initial + s.slice(1).replace(/[mn]/g, 'N');
  // Doubled consonants are a spelling choice, not a sound.
  s = s.replace(/([^aeiou])\1+/g, '$1');

  const head = /^[aeiou]/.test(s) ? s[0]! : '';
  const body = s.slice(head.length).replace(VOWELS, '');
  const key = head + body;

  // A token that was all vowels still needs an identity.
  return key.length > 0 ? key : s;
}

export interface TokenCodes {
  token: string;
  /** Double Metaphone primary and secondary, empty strings filtered out. */
  metaphone: string[];
  indic: string;
}

export function encodeToken(token: string): TokenCodes {
  const latin = token.replace(/[^a-z0-9]/gi, '');
  const metaphone = latin.length > 0
    ? (doubleMetaphone(latin) as string[]).filter((c) => c.length > 0)
    : [];
  return { token, metaphone, indic: indicKey(latin) };
}

export function encodeTokens(tokens: string[]): TokenCodes[] {
  return tokens.map(encodeToken);
}

/** Below this, two phonetic keys are different words rather than a typo. */
const NEAR_MISS_FLOOR = 0.9;

/**
 * A phonetic code shorter than this carries no information and collides with
 * everything. Double Metaphone in particular emits very short secondary codes
 * (the secondary for "aaj" is just "A"), and treating those as a match made
 * unrelated questions look phonetically similar to half the corpus.
 */
const MIN_CODE_LENGTH = 3;

/** Long enough to be a real word rather than a fragment. */
const FULLY_INFORMATIVE_LENGTH = 5;

/**
 * How much a single query token is allowed to contribute. Short tokens are
 * both more collision-prone and less likely to be the content word that
 * decides the question, so they are discounted rather than trusted equally.
 */
function tokenWeight(token: string): number {
  return Math.min(1, Math.max(0.35, token.length / FULLY_INFORMATIVE_LENGTH));
}

/**
 * How well one query token is covered by the tokens of a document.
 * 1 on a shared phonetic code, a scaled value on a near miss, 0 otherwise.
 */
function tokenCoverage(query: TokenCodes, docCodes: TokenCodes[]): number {
  const qIndic = query.indic;
  const qMeta = query.metaphone.filter((c) => c.length >= MIN_CODE_LENGTH);

  let best = 0;
  for (const doc of docCodes) {
    if (qIndic.length >= MIN_CODE_LENGTH && qIndic === doc.indic) return 1;
    for (const qm of qMeta) {
      if (doc.metaphone.includes(qm)) return 1;
    }
    // Keys too short to compare as codes fall back to comparing the words
    // themselves, which is stricter than comparing two-character skeletons.
    if (qIndic.length > 0 && qIndic.length < MIN_CODE_LENGTH && qIndic === doc.indic) {
      const sim = jaroWinkler(query.token, doc.token);
      if (sim >= 0.8) return 1;
      continue;
    }
    if (qIndic.length >= MIN_CODE_LENGTH && doc.indic.length >= MIN_CODE_LENGTH) {
      const sim = jaroWinkler(qIndic, doc.indic);
      if (sim >= NEAR_MISS_FLOOR && sim > best) best = sim;
    }
  }
  // Rescale a near miss so it is clearly worth less than an exact code match.
  return best > 0 ? ((best - NEAR_MISS_FLOOR) / (1 - NEAR_MISS_FLOOR)) * 0.7 : 0;
}

/**
 * Weighted fraction of the query's phonetic content present in the document,
 * in [0,1].
 *
 * Query-normalised rather than symmetric on purpose: a long FAQ row should not
 * be penalised for containing more words than the question asked.
 */
export function phoneticScore(queryCodes: TokenCodes[], docCodes: TokenCodes[]): number {
  if (queryCodes.length === 0 || docCodes.length === 0) return 0;
  let total = 0;
  let weightSum = 0;
  for (const q of queryCodes) {
    const w = tokenWeight(q.token);
    weightSum += w;
    total += w * tokenCoverage(q, docCodes);
  }
  return weightSum > 0 ? total / weightSum : 0;
}
