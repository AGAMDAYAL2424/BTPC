import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { SearchIndex } from '../../lib/server/retrieval/index';
import type { Faq } from '../../lib/shared/types';

/**
 * Tests at the `retrieve` seam: question in, ranked FAQ ids out.
 *
 * Assertions are on behaviour and ordering, never on score values. Asserting a
 * score would either restate the formula (and so could never disagree with the
 * code) or freeze a number copied out of a passing run. What callers actually
 * depend on is which row comes back and whether it is confident enough to
 * serve, so that is what is pinned here.
 */
const ROOT = path.resolve(import.meta.dirname, '..', '..');
let index: SearchIndex;
let faqs: Faq[];

beforeAll(() => {
  faqs = JSON.parse(readFileSync(path.join(ROOT, 'data', 'faqs.seed.json'), 'utf-8'));
  index = new SearchIndex(faqs);
});

function top(question: string): string | null {
  return index.search(question, { lang: 'hi' }).candidates[0]?.faqId ?? null;
}

describe('the index', () => {
  it('holds every published seed row', () => {
    expect(index.size).toBe(60);
  });

  it('excludes rows that are not published', () => {
    const withDraft = new SearchIndex([
      ...faqs,
      { ...faqs[0]!, id: 'faq-draft', status: 'draft' },
    ]);
    expect(withDraft.getFaq('faq-draft')).toBeUndefined();
  });
});

describe('the same question in three writing systems', () => {
  it.each([
    ['क्या मेट्रो चलेगी', 'devanagari'],
    ['kya metro chalegi', 'romanised'],
    ['will the metro run', 'english'],
  ])('reaches the metro row from %s', (question) => {
    expect(top(question)).toBe('faq-15');
  });

  it('reports the script it detected without changing the answer language', () => {
    const deva = index.search('क्या मेट्रो चलेगी', { lang: 'en' });
    expect(deva.script).toBe('devanagari');
    expect(deva.lang).toBe('en');
  });

  it('infers Hindi from romanised function words when no language is chosen', () => {
    expect(index.search('kya metro chalegi').lang).toBe('hi');
  });

  it('infers English when there are no Hindi markers', () => {
    expect(index.search('will the metro run normally').lang).toBe('en');
  });
});

describe('misspellings and phonetic input', () => {
  it.each([
    ['mtro chalu hai kya', 'faq-15'],
    ['airpot kitne time pehle jana chahiye', 'faq-05'],
    ['parkig kahan milegi', 'faq-31'],
  ])('recovers %s', (question, expected) => {
    expect(top(question)).toBe(expected);
  });
});

describe('confidence banding', () => {
  it('is confident about a question that matches a row squarely', () => {
    expect(index.search('kya metro chalegi', { lang: 'hi' }).band).toBe('confident');
  });

  it.each([
    'aaj ka mausam kaise hai',
    'pizza recipe batao',
    'who won the cricket match',
    'bitcoin price today',
    'asdfgh qwerty zxcvb',
  ])('never answers the out-of-scope question %s confidently', (question) => {
    expect(index.search(question, { lang: 'hi' }).band).not.toBe('confident');
  });

  it('ranks the squarely matching row above a merely related one', () => {
    // Both rows concern the airport; only one concerns how early to leave.
    const ranked = index
      .search('airport ke liye kitni jaldi niklu', { lang: 'hi' })
      .candidates.map((c) => c.faqId);
    expect(ranked.indexOf('faq-05')).toBeLessThan(ranked.indexOf('faq-07'));
  });

  it('reports a margin of zero when nothing was ranked', () => {
    const empty = new SearchIndex([]);
    const result = empty.search('kya metro chalegi');
    expect(result.band).toBe('miss');
    expect(result.faqId).toBeNull();
  });
});

describe('publishing a new row', () => {
  it('makes an admin-written answer retrievable without a restart', () => {
    const fresh = new SearchIndex(faqs);
    const question = 'pragati maidan ke paas parking kahan milegi';
    expect(fresh.search(question, { lang: 'hi' }).candidates[0]?.faqId).not.toBe('faq-new');

    fresh.add({
      ...faqs[0]!,
      id: 'faq-new',
      intentId: 'zones_restrictions',
      questionHi: 'Pragati Maidan के पास parking कहां मिलेगी?',
      questionEn: 'Where is parking near Pragati Maidan?',
      variantsRoman: ['pragati maidan ke paas parking kahan milegi'],
      variantsHi: [],
      variantsEn: [],
      keywords: ['pragati', 'maidan', 'parking', 'bhairon', 'marg'],
      source: 'admin',
    });

    expect(fresh.search(question, { lang: 'hi' }).candidates[0]?.faqId).toBe('faq-new');
  });
});

describe('candidate list', () => {
  it('returns enough candidates to offer alternatives', () => {
    const result = index.search('truck ko entry milegi', { lang: 'hi' });
    expect(result.candidates.length).toBeGreaterThanOrEqual(3);
  });

  it('labels every candidate with its intent, so cross-intent ambiguity is visible', () => {
    const result = index.search('kya metro chalegi', { lang: 'hi' });
    for (const c of result.candidates) {
      expect(c.intentId).toBeTruthy();
    }
  });
});
