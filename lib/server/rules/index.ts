import 'server-only';
import type { RuleKind } from '../../shared/types';

/**
 * Deterministic rules that run BEFORE retrieval and before any model call.
 *
 * Two of these are safety boundaries. Nearest-neighbour search over 60 rows
 * will always return something plausible-looking, so "my car was towed, where
 * is it" would otherwise be answered from a generic parking row. Matching here
 * is exact-term, never phonetic and never fuzzy: a spelling-tolerant match is
 * exactly what you do not want deciding whether a question is an emergency.
 */

export interface RuleMatch {
  kind: RuleKind;
  /** Canonical FAQ whose approved guidance accompanies the rule response. */
  linkedFaqId: string | null;
  matched: string[];
}

/** Distress that needs 112 regardless of anything else in the message. */
const ACUTE_DISTRESS = [
  'bachao', 'बचाओ', 'bachaao',
  'help me', 'save me', 'save us',
  'heart attack', 'हार्ट अटैक', 'dil ka daura', 'दिल का दौरा',
  'behosh', 'बेहोश', 'unconscious', 'collapsed', 'collapse',
  'mar raha', 'मर रहा', 'mar rahi', 'मर रही', 'dying',
  'saans nahi', 'सांस नहीं', 'not breathing', 'cant breathe',
  'stabbed', 'chaku', 'चाकू', 'goli', 'गोली', 'shot',
  'doob', 'डूब', 'drowning',
];

/** An incident. On its own this may be a guidance question, not a report. */
const INCIDENT = [
  'accident', 'aksident', 'दुर्घटना', 'durghatna', 'crash', 'takkar', 'टक्कर',
  'takra', 'टकरा', 'collided',
  'ghayal', 'घायल', 'injured', 'injury', 'khoon', 'खून', 'blood', 'bleeding',
  'aag', 'आग', 'fire', 'jal raha', 'जल रहा',
  'loot', 'लूट', 'robbed', 'robbery', 'chori', 'चोरी', 'theft',
  'hamla', 'हमला', 'attack', 'assault', 'maar', 'मार',
  'emergency', 'इमरजेंसी',
];

/** Signals the incident is happening now rather than being asked about. */
const OCCURRENCE = [
  'ho gaya', 'हो गया', 'ho gayi', 'हो गई', 'ho gya',
  'lag gayi', 'लग गई', 'lag gaya', 'लग गया',
  'bah raha', 'बह रहा', 'ho raha', 'हो रहा',
  'there has been', 'there is a', 'someone is', 'someone has',
  'turant', 'तुरंत', 'jaldi bhejo', 'जल्दी भेजो', 'abhi', 'अभी',
  'right now', 'immediately', 'urgent',
  'liya gaya', 'लिया गया', 'has happened', 'just happened',
];

/**
 * Marks the message as a request for guidance rather than an incident report.
 *
 * This is what separates "accident ho jaye to kya kare" (what should I do if
 * there is an accident) from "accident ho gaya hai" (there has been an
 * accident). Without it the informational rows on accidents and ambulances
 * would be unreachable, because they all mention the same nouns.
 */
const HYPOTHETICAL = [
  'jaye to', 'जाए तो', 'jaaye to', 'hone par', 'होने पर', 'ho to', 'हो तो',
  'kya kare', 'क्या करें', 'kya karna', 'क्या करना', 'kya karu', 'क्या करूं',
  'what should i do if', 'what to do if', 'if there is', 'in case of',
  'what happens if', 'zaroori hai', 'जरूरी है', 'chahiye ki', 'rasta dena',
  'रास्ता देना', 'give way', 'niyam', 'नियम', 'rules for',
];

/** Records tied to one person that this bot has no access to. */
const PERSONAL_RECORD = [
  'challan', 'chalan', 'चालान', 'chaalan',
  'towed', 'tow', 'uthwa', 'उठवा', 'utha li', 'उठा ली', 'jabt', 'जब्त',
  'impound', 'impounded', 'crane se', 'क्रेन',
  'my pass', 'mera pass', 'मेरा pass', 'मेरा पास', 'pass approve', 'पास approve',
  'my fine', 'meri fine', 'my case', 'mera case', 'मेरा case',
  'fir status', 'fir number', 'एफआईआर', 'my licence', 'my license', 'mera licence',
  'my vehicle number', 'meri gaadi kahan', 'मेरी गाड़ी कहां',
  'registration status', 'my complaint status', 'meri shikayat ka',
];

/**
 * Emergency services, which are ALSO the subject of legitimate informational
 * rows ("must I give way to an ambulance"). A bare mention must not trigger
 * 112; it only counts alongside a first-person request for one.
 */
const EMERGENCY_SERVICE = [
  'ambulance', 'एम्बुलेंस', 'एंबुलेंस', 'fire brigade', 'दमकल', 'damkal',
  'fire tender', 'police', 'पुलिस',
];

/** Asking for a service to be sent, as opposed to asking about the rules. */
const SELF_REQUEST = [
  'mujhe', 'मुझे', 'chahiye', 'चाहिए', 'bhejo', 'भेजो', 'bhej do', 'भेज दो',
  'i need', 'we need', 'send', 'call an', 'bulao', 'बुलाओ', 'bula do', 'बुला दो',
];

const HUMAN_REQUEST = [
  'insan se baat', 'इंसान से बात', 'aadmi se baat', 'आदमी से बात',
  'real person', 'talk to a human', 'speak to a human', 'speak to someone',
  'talk to someone', 'human agent', 'customer care', 'live agent',
  'officer se baat', 'ऑफिसर से बात', 'kisi se baat karao', 'किसी से बात कराओ',
  'operator', 'representative',
];

/**
 * Multi-word phrases match as substrings; single words must match a whole
 * token.
 *
 * Substring matching on short words is a real hazard here: a bare "fir" for
 * an FIR lookup also matches inside "fire tender", which turned an
 * informational question about fire engines into a personal-records refusal.
 */
function findAll(haystack: string, tokens: Set<string>, needles: string[]): string[] {
  return needles.filter((n) => (n.includes(' ') ? haystack.includes(n) : tokens.has(n)));
}

/**
 * The canonical row whose approved wording should accompany a 112 referral, so
 * the emergency response is not a dead end that only prints a phone number.
 */
function emergencyGuidanceFaq(matched: string[]): string {
  const joined = matched.join(' ');
  if (/accident|durghatna|takkar|takra|collided|crash|अक्|दुर्घटना|टक्कर|टकरा/.test(joined)) {
    return 'faq-33';
  }
  return 'faq-13';
}

/**
 * Check a question against every rule. `haystack` should contain both the
 * normalised original and its romanised form, so a Devanagari phrase and its
 * transliteration both get a chance to match.
 */
export function checkRules(normalized: string, romanized: string): RuleMatch | null {
  const haystack = `${normalized} ${romanized}`;
  const tokens = new Set(haystack.split(/[^a-z0-9\u0900-\u097f]+/).filter((t) => t.length > 0));

  const human = findAll(haystack, tokens, HUMAN_REQUEST);
  if (human.length > 0) {
    return { kind: 'human_request', linkedFaqId: 'faq-51', matched: human };
  }

  // Personal records come before emergency: "my challan" is never an emergency,
  // and "challan" sits near enough to enforcement words to be misread as one.
  const personal = findAll(haystack, tokens, PERSONAL_RECORD);
  if (personal.length > 0) {
    return { kind: 'personalization', linkedFaqId: 'faq-51', matched: personal };
  }

  const acute = findAll(haystack, tokens, ACUTE_DISTRESS);
  if (acute.length > 0) {
    return {
      kind: 'emergency',
      linkedFaqId: emergencyGuidanceFaq(acute),
      matched: acute,
    };
  }

  const incident = findAll(haystack, tokens, INCIDENT);
  if (incident.length > 0) {
    const hypothetical = findAll(haystack, tokens, HYPOTHETICAL);
    const occurrence = findAll(haystack, tokens, OCCURRENCE);
    if (occurrence.length > 0 && hypothetical.length === 0) {
      return {
        kind: 'emergency',
        linkedFaqId: emergencyGuidanceFaq(incident),
        matched: [...incident, ...occurrence],
      };
    }
  }

  // "mujhe turant ambulance chahiye" is a call for help; "ambulance ko rasta
  // dena zaroori hai" is a question about the rules. Only the first fires.
  const service = findAll(haystack, tokens, EMERGENCY_SERVICE);
  if (service.length > 0) {
    const hypothetical = findAll(haystack, tokens, HYPOTHETICAL);
    const request = findAll(haystack, tokens, SELF_REQUEST);
    const urgency = findAll(haystack, tokens, OCCURRENCE);
    if (request.length > 0 && hypothetical.length === 0 && urgency.length > 0) {
      return {
        kind: 'emergency',
        linkedFaqId: 'faq-13',
        matched: [...service, ...request],
      };
    }
  }

  return null;
}
