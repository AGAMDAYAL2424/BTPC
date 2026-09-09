import { describe, expect, it } from 'vitest';
import { checkRules } from '../../lib/server/rules/index';
import { normalize } from '../../lib/server/nlp/normalize';
import { romanize } from '../../lib/server/nlp/translit';

function check(question: string) {
  return checkRules(normalize(question), normalize(romanize(question)));
}

/**
 * These rules are a safety boundary, so both directions matter equally: a real
 * emergency must always reach 112, and a question ABOUT emergencies must always
 * reach the approved guidance instead of a helpline referral.
 */
describe('emergency rule', () => {
  it.each([
    'accident ho gaya hai koi ghayal hai',
    'दुर्घटना हो गई है खून बह रहा है',
    'there has been a crash someone is injured',
    'aag lag gayi hai',
    'someone is having a heart attack',
    'help me my father collapsed',
    'मुझे तुरंत ambulance चाहिए',
    'loot liya gaya hai bachao',
  ])('routes %s to the emergency path', (q) => {
    expect(check(q)?.kind).toBe('emergency');
  });

  it.each([
    'ambulance ko rasta dena zaroori hai',
    'accident ho jaye to kya kare',
    'Medical emergency होने पर क्या करें',
    'दुर्घटना होने पर क्या करना चाहिए',
    'what should I do if there is an accident',
    'fire tender ko rasta de',
  ])('leaves the informational question %s to retrieval', (q) => {
    expect(check(q)).toBeNull();
  });

  it('attaches the accident guidance to an accident report', () => {
    expect(check('accident ho gaya hai koi ghayal hai')?.linkedFaqId).toBe('faq-33');
  });

  it('attaches the medical guidance to a medical report', () => {
    expect(check('someone is having a heart attack')?.linkedFaqId).toBe('faq-13');
  });
});

describe('personalization rule', () => {
  it.each([
    'मेरा challan kitna hai',
    'my car was towed where is it',
    'meri gaadi uthwa li gayi kahan hai',
    'क्या मेरा pass approve हो गया',
  ])('refuses the account-specific question %s', (q) => {
    expect(check(q)?.kind).toBe('personalization');
  });

  it('does not mistake a fire engine for an FIR lookup', () => {
    // "fir" as a substring lives inside "fire", which previously turned a
    // question about fire tenders into a personal-records refusal.
    expect(check('fire tender ko rasta de')?.kind).not.toBe('personalization');
  });
});

describe('human request rule', () => {
  it.each([
    'मुझे किसी इंसान से बात करनी है',
    'i want to talk to a real person',
    'kisi officer se baat karao',
  ])('escalates %s immediately', (q) => {
    expect(check(q)?.kind).toBe('human_request');
  });
});

describe('ordinary questions', () => {
  it.each([
    'kya metro chalegi',
    'airport kitni jaldi niklu',
    'parking kahan milegi',
    'swiggy zomato chalega',
  ])('leaves %s to retrieval', (q) => {
    expect(check(q)).toBeNull();
  });
});
