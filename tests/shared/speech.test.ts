import { describe, expect, it } from 'vitest';
import { toSpeakable } from '../../lib/shared/speech';

/**
 * The Hindi answers are Hinglish, so a hi-IN voice is handed Latin words
 * embedded in Devanagari sentences roughly every few words. These check the
 * rewrite that makes them readable, and that it never touches meaning.
 */
describe('toSpeakable, Hindi', () => {
  it('gives Latin loanwords a Devanagari pronunciation', () => {
    const out = toSpeakable('Metro services सामान्य रूप से चलेंगी', 'hi');
    expect(out).toContain('मेट्रो');
    expect(out).not.toMatch(/Metro/i);
  });

  it('handles a plural whose singular is mapped', () => {
    // A plain स gives स्टेशनस, which reads as three syllables. The consonant
    // needs a halant first.
    expect(toSpeakable('कुछ stations पर', 'hi')).toContain('स्टेशन्स');
  });

  it('handles a gerund whose stem is mapped', () => {
    expect(toSpeakable('security checking के दौरान', 'hi')).toContain('चेकिंग');
  });

  it('reads a helpline digit by digit', () => {
    // "1095" as a quantity is एक हज़ार पंचानबे, which nobody can dial.
    const out = toSpeakable('1095 पर contact करें', 'hi');
    expect(out).toContain('१ ० ९ ५');
    expect(out).not.toContain('1095');
  });

  it('does not turn a quantity into digits', () => {
    // The airport buffer is a duration, not a number to dial.
    expect(toSpeakable('60 से 90 मिनट का buffer', 'hi')).toContain('60 से 90');
  });

  it('separates a slash so it is not read as the word slash', () => {
    expect(toSpeakable('entry/exit control', 'hi')).not.toContain('/');
  });

  it('converts the danda to a full stop so sentences do not run together', () => {
    const out = toSpeakable('पहला वाक्य। दूसरा वाक्य।', 'hi');
    expect(out).not.toContain('।');
    expect(out).toContain('.');
  });

  it('leaves an unmapped Latin word in place rather than dropping it', () => {
    // Reading a word imperfectly beats silently omitting it from an advisory.
    expect(toSpeakable('कोई zzzunknownzzz शब्द', 'hi')).toContain('zzzunknownzzz');
  });
});

describe('toSpeakable, English', () => {
  it('reads a helpline digit by digit', () => {
    const out = toSpeakable('Contact 1095 for help, or 112 in an emergency.', 'en');
    expect(out).toContain('one zero nine five');
    expect(out).toContain('one one two');
  });

  it('leaves ordinary English untouched apart from the numbers', () => {
    const source = 'Metro services are expected to run normally.';
    expect(toSpeakable(source, 'en')).toBe(source);
  });

  it('does not apply the Devanagari map to English text', () => {
    expect(toSpeakable('Follow the traffic police instructions.', 'en')).not.toMatch(/[ऀ-ॿ]/);
  });
});

describe('every number in an answer survives being spoken', () => {
  it.each([
    ['60 से 90 मिनट का buffer time रखें, 1095 पर call करें', 'hi'],
    ['Keep a buffer of 60 to 90 minutes and call 1095 or 112', 'en'],
  ] as const)('preserves the digits of %s', (text, lang) => {
    const spoken = toSpeakable(text, lang);
    // Helplines become words or Devanagari digits by design; everything else
    // must still be present as a number.
    for (const n of (text.match(/\d+/g) ?? []).filter((d) => d !== '1095' && d !== '112')) {
      expect(spoken).toContain(n);
    }
  });
});
