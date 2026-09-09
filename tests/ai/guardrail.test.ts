import { describe, expect, it } from 'vitest';
import { isPolishSafe, verifyPolish } from '../../lib/server/ai/guardrail';

/**
 * The canonical strings here are real answers from the advisory, so the numbers
 * being protected are the actual ones that matter: 1095, 112, and the 60 to 90
 * minute airport buffer.
 */
const AIRPORT_EN =
  'During the Summit, VIP movement and security arrangements may add extra time on some routes. So leave well before your usual time for a flight, and it is better to keep a buffer of at least 60 to 90 minutes.';

const NO_NUMBERS_EN =
  'No. Unnecessary honking does not clear traffic faster. It only increases noise and stress. Keep patience and stay in your lane.';

describe('isPolishSafe', () => {
  it('refuses to rewrite an answer containing a number', () => {
    expect(isPolishSafe(AIRPORT_EN)).toBe(false);
  });

  it('refuses to rewrite an answer containing a helpline', () => {
    expect(isPolishSafe('Contact Delhi Traffic Police on 1095 for help.')).toBe(false);
  });

  it('allows rewriting an answer that carries no facts of that kind', () => {
    expect(isPolishSafe(NO_NUMBERS_EN)).toBe(true);
  });
});

describe('verifyPolish', () => {
  it('accepts a faithful rewrite', () => {
    const polished =
      'No, sounding the horn again and again will not clear the traffic any faster. It just adds noise and stress. Stay patient and keep to your lane.';
    expect(verifyPolish(NO_NUMBERS_EN, polished, 'en').ok).toBe(true);
  });

  it('rejects a rewrite that invents a helpline number', () => {
    const polished = `${NO_NUMBERS_EN} You can also call 100 for help.`;
    const result = verifyPolish(NO_NUMBERS_EN, polished, 'en');
    expect(result.ok).toBe(false);
    expect(result.failures.join(' ')).toContain('invented number 100');
  });

  it('rejects a rewrite that drops a number the original carried', () => {
    const polished =
      'During the Summit, VIP movement may add extra time on some routes, so leave a good while before your flight and keep a comfortable buffer in hand.';
    const result = verifyPolish(AIRPORT_EN, polished, 'en');
    expect(result.ok).toBe(false);
    expect(result.failures.join(' ')).toContain('dropped number');
  });

  it('rejects a rewrite that changes a number', () => {
    const polished = AIRPORT_EN.replace('60 to 90 minutes', '30 to 45 minutes');
    expect(verifyPolish(AIRPORT_EN, polished, 'en').ok).toBe(false);
  });

  it('rejects a rewrite that adds a link', () => {
    const polished = `${NO_NUMBERS_EN} See https://example.com for more.`;
    expect(verifyPolish(NO_NUMBERS_EN, polished, 'en').ok).toBe(false);
  });

  it('rejects a rewrite that lost most of the content', () => {
    expect(verifyPolish(NO_NUMBERS_EN, 'No, it does not help.', 'en').ok).toBe(false);
  });

  it('rejects model preamble leaking into the answer', () => {
    const polished = `Sure, here is the rewritten answer: ${NO_NUMBERS_EN}`;
    expect(verifyPolish(NO_NUMBERS_EN, polished, 'en').ok).toBe(false);
  });

  it('rejects an em-dash, which is banned in every visible string', () => {
    const polished = NO_NUMBERS_EN.replace('faster.', 'faster — it never has.');
    const result = verifyPolish(NO_NUMBERS_EN, polished, 'en');
    expect(result.ok).toBe(false);
    expect(result.failures).toContain('em-dash or en-dash');
  });

  it('rejects a Hindi rewrite that dropped the Devanagari', () => {
    const canonicalHi =
      'नहीं। Unnecessary horn से traffic जल्दी clear नहीं होता। इससे noise और stress बढ़ता है। Patience रखें।';
    const polished =
      'No, unnecessary horn use does not clear traffic faster and only adds noise and stress here.';
    const result = verifyPolish(canonicalHi, polished, 'hi');
    expect(result.ok).toBe(false);
    expect(result.failures).toContain('lost the Devanagari');
  });

  it('rejects an empty rewrite', () => {
    expect(verifyPolish(NO_NUMBERS_EN, '   ', 'en').ok).toBe(false);
  });
});
