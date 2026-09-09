import 'server-only';

/**
 * Stopwords in both scripts plus romanised Hindi. Deliberately conservative:
 * over-aggressive stopping hurts a 60 document corpus, where a single retained
 * content word often decides the match.
 *
 * "band" (closed), "khula" (open), "nahi" (no) are NOT stopwords even though
 * they are common, because they carry the actual question in this domain.
 */
const STOPWORDS = new Set([
  // English
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'do', 'does', 'did', 'will', 'would', 'shall', 'should', 'can', 'could',
  'may', 'might', 'must', 'have', 'has', 'had', 'i', 'me', 'my', 'we', 'our',
  'you', 'your', 'he', 'she', 'it', 'its', 'they', 'them', 'their', 'this',
  'that', 'these', 'those', 'of', 'in', 'on', 'at', 'to', 'for', 'with',
  'and', 'or', 'but', 'if', 'as', 'by', 'from', 'about', 'there', 'any',
  'some', 'so', 'than', 'then', 'too', 'very', 'also', 'get', 'got',
  // Devanagari
  'का', 'की', 'के', 'को', 'में', 'से', 'पर', 'है', 'हैं', 'हो', 'था', 'थी', 'थे',
  'और', 'या', 'तो', 'भी', 'ही', 'एक', 'यह', 'वह', 'क्या', 'जो', 'कि', 'तक',
  'लिए', 'साथ', 'अपना', 'अपनी', 'हम', 'मैं', 'आप', 'वो', 'इस', 'उस', 'कुछ',
  // Romanised Hindi function words
  'ka', 'ki', 'ke', 'ko', 'me', 'mein', 'se', 'par', 'hai', 'hain', 'ho',
  'tha', 'thi', 'the', 'aur', 'ya', 'to', 'bhi', 'hi', 'ek', 'yah', 'ye',
  'vah', 'wo', 'jo', 'kya', 'kyaa', 'tak', 'liye', 'sath', 'hum', 'main',
  'aap', 'is', 'us', 'kuch', 'kar', 'karta', 'karte',
]);

export function tokenize(normalized: string): string[] {
  return normalized
    .split(/[^a-z0-9ऀ-ॿ]+/)
    .filter((t) => t.length > 0);
}

export function removeStopwords(tokens: string[]): string[] {
  const kept = tokens.filter((t) => !STOPWORDS.has(t) && t.length > 1);
  // Never return nothing: a question made entirely of stopwords still has to
  // be scored against something.
  return kept.length > 0 ? kept : tokens;
}

export function contentTokens(normalized: string): string[] {
  return removeStopwords(tokenize(normalized));
}

export function isStopword(token: string): boolean {
  return STOPWORDS.has(token);
}

/**
 * Extra surface forms for a token, ADDED alongside it rather than replacing it.
 *
 * "residents" never matched the curated keyword "resident", which cost a whole
 * concept-group hit on any question phrased in the plural. Stemming in place
 * would be the obvious fix and is unsafe here: this corpus is full of romanised
 * Hindi, where a trailing s is usually part of the word ("paas", "bas", "das").
 * Generating variants additively means a wrong guess produces a token that
 * simply matches nothing, instead of destroying a real one.
 */
export function morphVariants(token: string): string[] {
  if (!/^[a-z]+$/.test(token) || token.length < 4) return [];
  const out: string[] = [];

  if (token.endsWith('ies') && token.length > 4) {
    out.push(`${token.slice(0, -3)}y`);
  } else if (/(?:s|x|z|ch|sh)es$/.test(token)) {
    out.push(token.slice(0, -2));
  } else if (token.endsWith('s') && !/(?:ss|us|is|as|os)$/.test(token)) {
    // The exclusions protect romanised Hindi: "bas", "paas", "das".
    out.push(token.slice(0, -1));
  }

  if (token.endsWith('ing') && token.length > 6) out.push(token.slice(0, -3));
  if (token.endsWith('ed') && token.length > 5) {
    // Both, because the right cut depends on the stem: "closed" wants one
    // character off, "allowed" wants two. The wrong one is inert.
    out.push(token.slice(0, -1), token.slice(0, -2));
  }

  return out.filter((v) => v.length >= 3 && v !== token);
}

/** Token list plus every morphological variant, de-duplicated. */
export function expandMorphology(tokens: string[]): string[] {
  const out = new Set(tokens);
  for (const t of tokens) {
    for (const v of morphVariants(t)) out.add(v);
  }
  return [...out];
}
