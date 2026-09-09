/**
 * Content lint over everything a citizen can read.
 *
 * Two of these checks exist because of how the content was produced. The
 * em-dash ban is easy to state and easy to violate: model-drafted prose is full
 * of them, and they leak in through the English translations and anything staff
 * paste in. The number check protects the facts that actually matter, since a
 * translation that quietly drops "1095" is worse than one that reads awkwardly.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Faq } from '../lib/shared/types';
import { STRINGS } from '../lib/shared/strings';

const ROOT = path.resolve(import.meta.dirname, '..');
const problems: string[] = [];

const DASHES = /[—–]/;
const FILLER = /\b(elevate|seamless|unleash|next-gen|revolutioniz|leverage our|world-class)\b/i;
/** Invented precision: a suspiciously round or perfect claim. */
const FAKE_PRECISION = /\b(99\.\d+%|100% accurate|instantly)\b/i;

function check(label: string, text: string): void {
  if (DASHES.test(text)) problems.push(`${label}: contains an em-dash or en-dash`);
  if (FILLER.test(text)) problems.push(`${label}: contains marketing filler`);
  if (FAKE_PRECISION.test(text)) problems.push(`${label}: contains invented precision`);
  if (/\s{2,}/.test(text.trim())) problems.push(`${label}: has a double space`);
}

// Interface copy
for (const [lang, strings] of Object.entries(STRINGS)) {
  for (const [key, value] of Object.entries(strings)) {
    check(`strings.${lang}.${key}`, value);
  }
}

// Knowledge base
const faqs: Faq[] = JSON.parse(
  readFileSync(path.join(ROOT, 'data', 'faqs.seed.json'), 'utf-8'),
);

for (const faq of faqs) {
  check(`${faq.id}.questionHi`, faq.questionHi);
  check(`${faq.id}.questionEn`, faq.questionEn);
  check(`${faq.id}.answerHi`, faq.answerHi);
  check(`${faq.id}.answerEn`, faq.answerEn);

  const hiNumbers: string[] = faq.answerHi.match(/\d+/g) ?? [];
  const enNumbers: string[] = faq.answerEn.match(/\d+/g) ?? [];
  for (const n of hiNumbers) {
    if (!enNumbers.includes(n)) {
      problems.push(`${faq.id}: answerEn is missing the number ${n} from answerHi`);
    }
  }
  if (faq.variantsRoman.length === 0) {
    problems.push(`${faq.id}: has no romanised variant, so phone-keyboard input will miss it`);
  }
  if (faq.keywords.length < 4) {
    problems.push(`${faq.id}: has fewer than 4 keywords`);
  }
}

if (problems.length > 0) {
  console.error(`content lint found ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(`content lint clean: ${faqs.length} FAQ rows and ${Object.keys(STRINGS).length} language string sets`);
