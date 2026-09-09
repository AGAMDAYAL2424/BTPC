import { describe, expect, it } from 'vitest';
import { indicKey, encodeTokens, phoneticScore } from '../../lib/server/nlp/phonetic';

/**
 * The values asserted here are the SPELLINGS people actually type, paired with
 * what Sanscript's ITRANS transliteration produces for the same word. That is
 * an independent source of truth: the pairs were taken from running the
 * transliterator over the source document, not from running this code.
 */
describe('indicKey', () => {
  it.each([
    ['ghara', 'ghar', 'inherent vowel that Hindi deletes and ITRANS keeps'],
    ['nikalana', 'nikalna', 'schwa deletion inside a longer verb'],
    ['kitani', 'kitni', 'schwa deletion before a suffix'],
    ['para', 'par', 'inherent vowel on a postposition'],
    ['karem', 'karen', 'anusvara transliterated as m against a typed n'],
    ['bamda', 'band', 'anusvara inside a closed syllable'],
    ['chahie', 'chahiye', 'inaudible glide between vowels'],
    ['zaroori', 'jaruri', 'z against j, and long against short vowels'],
    ['doodh', 'dudh', 'long vowel plus aspirate'],
    ['hawai', 'havai', 'w against v'],
    ['delhi', 'dilli', 'h that is not part of a real aspirate'],
    ['shaadi', 'shadi', 'long vowel'],
    ['metro', 'mtro', 'dropped vowel in a loanword'],
  ])('folds %s and %s together (%s)', (a, b) => {
    expect(indicKey(a)).toBe(indicKey(b));
  });

  it('keeps a word-initial nasal distinct, so short words do not all collide', () => {
    // Folding every m and n to one symbol made "mausam" and "nausam" identical,
    // which let unrelated questions look phonetically similar to half the corpus.
    expect(indicKey('mausam')).not.toBe(indicKey('nausam'));
  });

  it('distinguishes words that merely rhyme', () => {
    expect(indicKey('metro')).not.toBe(indicKey('petrol'));
  });

  it('collapses to a consonant skeleton, so unrelated words can collide', () => {
    // Documenting a real limitation rather than pretending it away: "maitri"
    // and "metro" share m-t-r. This is why the phonetic channel is one of four
    // and carries the smallest fitted weight, never a decision on its own.
    expect(indicKey('maitri')).toBe(indicKey('metro'));
  });
});

describe('phoneticScore', () => {
  const doc = encodeTokens(['metro', 'chalegi', 'delhi', 'band', 'station']);

  it('scores a fully misspelled query as covered', () => {
    expect(phoneticScore(encodeTokens(['mtro', 'chalega']), doc)).toBe(1);
  });

  it('scores an unrelated query at zero', () => {
    expect(phoneticScore(encodeTokens(['pizza', 'recipe']), doc)).toBe(0);
  });

  it('gives a near miss partial credit, below an exact code match', () => {
    const exact = phoneticScore(encodeTokens(['mtro']), doc);
    const near = phoneticScore(encodeTokens(['metrol']), doc);
    expect(exact).toBe(1);
    expect(near).toBeGreaterThan(0);
    expect(near).toBeLessThan(exact);
  });

  it('returns zero rather than throwing on empty input', () => {
    expect(phoneticScore([], doc)).toBe(0);
    expect(phoneticScore(encodeTokens(['metro']), [])).toBe(0);
  });
});
