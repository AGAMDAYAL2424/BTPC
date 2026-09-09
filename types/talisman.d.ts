/**
 * Minimal declarations for the talisman submodules this project imports.
 * talisman ships no types of its own, and only these two entry points are used.
 */
declare module 'talisman/phonetics/double-metaphone' {
  /** Returns [primary, secondary]; the secondary is often the empty string. */
  const doubleMetaphone: (word: string) => [string, string];
  export default doubleMetaphone;
}

declare module 'talisman/metrics/jaro-winkler' {
  /** Similarity in [0,1]. */
  const jaroWinkler: (a: string, b: string) => number;
  export default jaroWinkler;
}

declare module 'talisman/metrics/levenshtein' {
  const levenshtein: (a: string, b: string) => number;
  export default levenshtein;
}
