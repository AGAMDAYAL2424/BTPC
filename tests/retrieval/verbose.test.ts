import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { SearchIndex } from '../../lib/server/retrieval/index';
import { morphVariants } from '../../lib/server/nlp/tokenize';
import type { Faq } from '../../lib/shared/types';

/**
 * Regression tests for two bugs found by stress-testing with long, rambling
 * questions. Both were silent: accuracy on short questions looked fine while
 * verbose questions were being scored on a different scale.
 */
const ROOT = path.resolve(import.meta.dirname, '..', '..');
let index: SearchIndex;

beforeAll(() => {
  const faqs: Faq[] = JSON.parse(
    readFileSync(path.join(ROOT, 'data', 'faqs.seed.json'), 'utf-8'),
  );
  index = new SearchIndex(faqs);
});

function top(question: string): string | null {
  return index.search(question, { lang: 'hi' }).candidates[0]?.faqId ?? null;
}

function keywordScoreOf(question: string, faqId: string): number {
  const r = index.search(question, { lang: 'hi' });
  return r.candidates.find((c) => c.faqId === faqId)?.breakdown.keyword ?? 0;
}

describe('the keyword channel is insensitive to question length', () => {
  /**
   * The literal half of the keyword score used to be divided by the query's
   * token count, so padding a question with filler made the CORRECT row score
   * three times lower and flipped the winner. It is a saturating function of
   * the hit count now, which has an absolute meaning.
   */
  it('scores a row the same whether the question is terse or padded', () => {
    const terse = 'gaadi check karni chahiye';
    const padded =
      'lambi journey par nikalne se pehle apni gaadi me kya kya check karna chahiye taki raste me koi dikkat na ho';

    const a = keywordScoreOf(terse, 'faq-58');
    const b = keywordScoreOf(padded, 'faq-58');
    // Within a factor of two, rather than the 3.5x collapse it used to show.
    expect(b).toBeGreaterThan(a / 2);
  });

  it('still picks the right row when the question is padded with filler', () => {
    expect(
      top(
        'lambi journey par nikalne se pehle apni gaadi me kya kya check karna chahiye taki raste me koi dikkat na ho',
      ),
    ).toBe('faq-58');
  });
});

describe('morphological variants', () => {
  it('lets a plural question reach a keyword written in the singular', () => {
    // "residents" never matched the curated keyword "resident", which cost a
    // whole concept-group hit on any question phrased in the plural.
    expect(morphVariants('residents')).toContain('resident');
    expect(morphVariants('shops')).toContain('shop');
    expect(morphVariants('buses')).toContain('bus');
    expect(morphVariants('checking')).toContain('check');
  });

  it.each(['paas', 'bas', 'das', 'gaadiyon', 'walon', 'hai', 'class'])(
    'leaves the romanised Hindi word %s alone',
    (token) => {
      // A trailing s is usually part of the word in romanised Hindi, so
      // stemming in place would destroy real tokens. Variants are additive and
      // these produce none at all.
      expect(morphVariants(token)).toEqual([]);
    },
  );
});

describe('word-heavy questions', () => {
  it.each([
    [
      'namaste sir mujhe kal subah apne bete ko exam dilane ke liye centre tak le jana hai to kitne baje ghar se nikalna chahiye',
      'faq-11',
    ],
    [
      'sir ji main bahut pareshan hu kyunki mera flight kal shaam ka hai aur mujhe samajh nahi aa raha ki ghar se kitne baje niklu ki time par pahunch jau',
      'faq-05',
    ],
    [
      'meri wife ki tabiyat thodi kharab hai aur mujhe use apni hi car me hospital le jana pad sakta hai to kya us waqt police rokegi ya jane degi',
      'faq-14',
    ],
    [
      'hello, I wanted to ask whether the whole of Delhi is going to be completely shut down during the BRICS summit or only certain parts of it',
      'faq-01',
    ],
    [
      'सर नमस्ते, मुझे यह पूछना था कि क्या BRICS Summit के दौरान पूरी दिल्ली में सब कुछ बंद रहेगा या सिर्फ कुछ इलाकों में',
      'faq-01',
    ],
  ])('answers a rambling question correctly', (question, expected) => {
    expect(top(question)).toBe(expected);
  });

  it('picks one acceptable answer for a question containing two questions', () => {
    // Not a disambiguation failure: either row genuinely answers part of it,
    // and the other is offered as a chip.
    const result = index.search(
      'metro chalegi kya aur agar nahi chali to auto taxi mil jayegi kya',
      { lang: 'hi' },
    );
    expect(['faq-15', 'faq-18', 'faq-19']).toContain(result.candidates[0]?.faqId);
  });

  it('does not answer a long out-of-scope question confidently', () => {
    const result = index.search(
      'sir ji mujhe ye jaanna tha ki aaj shaam ko mausam kaisa rahega aur kal barish hone ki koi sambhavna hai kya',
      { lang: 'hi' },
    );
    expect(result.band).not.toBe('confident');
  });
});
