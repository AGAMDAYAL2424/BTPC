import type { Lang } from './types';

/**
 * Preparing advisory text for a speech synthesiser.
 *
 * The Hindi answers are Hinglish: 745 Latin-script English words are embedded
 * inside Devanagari sentences, roughly one every few words. A hi-IN voice
 * handed "Metro services सामान्य रूप से" either switches to an English
 * phonology mid-sentence, spells the word out, or skips it, depending on the
 * device's engine. None of those are acceptable on a public safety page.
 *
 * The fix is a curated Devanagari pronunciation for the recurring terms,
 * written the way a Delhi Hindi speaker actually says them. It is applied ONLY
 * to the string handed to the synthesiser; the text on screen is never
 * altered. The map covers the most frequent terms rather than all 238, since
 * an unmapped word is merely read less well, not wrongly.
 */
const HINGLISH_PRONUNCIATION: Record<string, string> = {
  // Traffic and policing
  traffic: 'ट्रैफिक', police: 'पुलिस', security: 'सिक्योरिटी',
  personnel: 'पर्सनल', officer: 'ऑफिसर', official: 'ऑफिशियल',
  authorized: 'ऑथराइज्ड', authorization: 'ऑथराइजेशन',
  barricade: 'बैरिकेड', barricading: 'बैरिकेडिंग', bypass: 'बायपास',
  challan: 'चालान', signal: 'सिग्नल', violation: 'वायलेशन',
  discipline: 'डिसिप्लिन', rules: 'रूल्स', regulate: 'रेगुलेट',
  regulated: 'रेगुलेटेड', controlled: 'कंट्रोल्ड', control: 'कंट्रोल',

  // Roads and movement
  route: 'रूट', routes: 'रूट्स', road: 'रोड', roads: 'रोड्स',
  lane: 'लेन', side: 'साइड', wrong: 'रॉन्ग', direction: 'डायरेक्शन',
  intersection: 'इंटरसेक्शन', diversion: 'डायवर्जन', divert: 'डायवर्ट',
  alternate: 'ऑल्टरनेट', block: 'ब्लॉक', clear: 'क्लियर',
  movement: 'मूवमेंट', congestion: 'कंजेशन', jam: 'जाम',
  parking: 'पार्किंग', park: 'पार्क', stoppages: 'स्टॉपेजेस',
  passage: 'पैसेज', entry: 'एंट्री', exit: 'एग्जिट',
  restrictions: 'रिस्ट्रिक्शन्स', restriction: 'रिस्ट्रिक्शन',
  restricted: 'रिस्ट्रिक्टेड', temporary: 'टेम्पररी',
  temporarily: 'टेम्पररिली', permanent: 'परमानेंट',

  // Vehicles
  vehicle: 'व्हीकल', vehicles: 'व्हीकल्स', car: 'कार', bus: 'बस',
  metro: 'मेट्रो', auto: 'ऑटो', taxi: 'टैक्सी', cab: 'कैब',
  truck: 'ट्रक', trucks: 'ट्रक्स', heavy: 'हेवी', goods: 'गुड्स',
  ambulance: 'एम्बुलेंस', convoy: 'कॉन्वॉय', horn: 'हॉर्न',
  brake: 'ब्रेक', lights: 'लाइट्स', fuel: 'फ्यूल', battery: 'बैटरी',
  tyre: 'टायर', breakdown: 'ब्रेकडाउन', hazard: 'हैज़र्ड',
  commercial: 'कमर्शियल', private: 'प्राइवेट', transport: 'ट्रांसपोर्ट',
  services: 'सर्विसेज', service: 'सर्विस', driving: 'ड्राइविंग',

  // Places
  delhi: 'दिल्ली', airport: 'एयरपोर्ट', station: 'स्टेशन',
  railway: 'रेलवे', terminal: 'टर्मिनल', venue: 'वेन्यू',
  hotel: 'होटल', summit: 'समिट', area: 'एरिया', areas: 'एरियाज़',
  zone: 'ज़ोन', zones: 'ज़ोन्स', school: 'स्कूल', office: 'ऑफिस',
  hospital: 'हॉस्पिटल', centre: 'सेंटर', center: 'सेंटर',
  main: 'मेन', local: 'लोकल', public: 'पब्लिक',

  // Emergency
  emergency: 'इमरजेंसी', medical: 'मेडिकल', accident: 'एक्सीडेंट',
  injured: 'इंजर्ड', patient: 'पेशेंट', safety: 'सेफ्टी',
  safe: 'सेफ', danger: 'डेंजर', assistance: 'असिस्टेंस',
  immediate: 'इमीडिएट', urgent: 'अर्जेंट', serious: 'सीरियस',

  // Travel and documents
  flight: 'फ्लाइट', ticket: 'टिकट', booking: 'बुकिंग',
  passenger: 'पैसेंजर', journey: 'जर्नी', travel: 'ट्रैवल',
  buffer: 'बफर', time: 'टाइम', extra: 'एक्स्ट्रा', last: 'लास्ट',
  minute: 'मिनट', plan: 'प्लान', option: 'ऑप्शन',
  convenient: 'कन्वीनिएंट', preference: 'प्रेफरेंस',
  admit: 'एडमिट', card: 'कार्ड', id: 'आई डी', valid: 'वैलिड',
  document: 'डॉक्युमेंट', documents: 'डॉक्युमेंट्स',
  details: 'डिटेल्स', location: 'लोकेशन', purpose: 'पर्पस',
  exam: 'एग्जाम', pick: 'पिक', drop: 'ड्रॉप', off: 'ऑफ',
  wait: 'वेट', confirm: 'कन्फर्म', decision: 'डिसीजन',

  // Information
  advisory: 'एडवाइजरी', information: 'इन्फॉर्मेशन', latest: 'लेटेस्ट',
  update: 'अपडेट', channels: 'चैनल्स', source: 'सोर्स',
  navigation: 'नेविगेशन', priority: 'प्रायोरिटी',
  delivery: 'डिलीवरी', essential: 'एसेंशियल', supplies: 'सप्लाइज़',
  management: 'मैनेजमेंट', arrangements: 'अरेंजमेंट्स',
  arrangement: 'अरेंजमेंट', requirement: 'रिक्वायरमेंट',
  situation: 'सिचुएशन', instructions: 'इंस्ट्रक्शन्स',
  cooperation: 'को-ऑपरेशन', patience: 'पेशेंस', problem: 'प्रॉब्लम',
  check: 'चेक', checking: 'चेकिंग', follow: 'फॉलो',
  possible: 'पॉसिबल', unnecessary: 'अननेसेसरी', affected: 'अफेक्टेड',
  change: 'चेंज', contact: 'कॉन्टैक्ट', depend: 'डिपेंड',
  limit: 'लिमिट', distance: 'डिस्टेंस', tight: 'टाइट',
  sensitive: 'सेंसिटिव', residents: 'रेजिडेंट्स', resident: 'रेजिडेंट',
  guests: 'गेस्ट्स', useful: 'यूजफुल', automatically: 'ऑटोमैटिकली',
  reason: 'रीज़न', particular: 'पर्टिकुलर', gate: 'गेट',
  normal: 'नॉर्मल', general: 'जनरल', special: 'स्पेशल',
  order: 'ऑर्डर', market: 'मार्केट', shop: 'शॉप', mall: 'मॉल',
  crowd: 'क्राउड', stress: 'स्ट्रेस', noise: 'नॉइज़',
  reverse: 'रिवर्स', turn: 'टर्न', cycle: 'साइकल',
  cooperate: 'को-ऑपरेट', function: 'फंक्शन', staff: 'स्टाफ',
  department: 'डिपार्टमेंट', departments: 'डिपार्टमेंट्स',
  notification: 'नोटिफिकेशन', period: 'पीरियड', duty: 'ड्यूटी',
  meeting: 'मीटिंग', google: 'गूगल', maps: 'मैप्स', app: 'ऐप',
  apps: 'ऐप्स', social: 'सोशल', media: 'मीडिया',
  message: 'मैसेज', forward: 'फॉरवर्ड', verification: 'वेरिफिकेशन',
  panic: 'पैनिक', spot: 'स्पॉट', help: 'हेल्प',
  swiggy: 'स्विगी', zomato: 'ज़ोमैटो', blinkit: 'ब्लिंकिट',
  final: 'फाइनल', real: 'रियल', restrict: 'रिस्ट्रिक्ट',
  inter: 'इंटर', state: 'स्टेट', permission: 'परमिशन',
  available: 'अवेलेबल', driver: 'ड्राइवर', point: 'पॉइंट',
  fixed: 'फिक्स्ड', safely: 'सेफ्ली', blocked: 'ब्लॉक्ड',
  express: 'एक्सप्रेस', line: 'लाइन', gates: 'गेट्स',
  isbt: 'आई एस बी टी', ndls: 'एन डी एल एस', igi: 'आई जी आई',
  vip: 'वी आई पी', ndmc: 'एन डी एम सी', dtc: 'डी टी सी',
  brics: 'ब्रिक्स', upsc: 'यू पी एस सी', nda: 'एन डी ए',
  cds: 'सी डी एस', ola: 'ओला', uber: 'ऊबर',
};

/**
 * Helpline numbers, read digit by digit.
 *
 * A Hindi synthesiser reads "1095" as "एक हज़ार पंचानबे", which is a quantity,
 * not a phone number. Nobody can dial that.
 */
const SPOKEN_NUMBERS: Record<string, string> = {
  '1095': '१ ० ९ ५',
  '112': '१ १ २',
};

const SPOKEN_NUMBERS_EN: Record<string, string> = {
  '1095': 'one zero nine five',
  '112': 'one one two',
};

/**
 * Devanagari plural, which needs a halant after a bare consonant.
 *
 * "station" plus a plain स gives स्टेशनस, which reads as three syllables and
 * sounds wrong. The consonant has to lose its inherent vowel first, giving
 * स्टेशन्स. A word already ending in a vowel sign takes the स directly.
 */
const DEVANAGARI_CONSONANT = /[\u0915-\u0939\u0958-\u095f]$/;

function pluralise(base: string): string {
  return DEVANAGARI_CONSONANT.test(base) ? `${base}\u094dस` : `${base}स`;
}

function pronounce(word: string): string | null {
  const lower = word.toLowerCase();
  const direct = HINGLISH_PRONUNCIATION[lower];
  if (direct) return direct;

  if (lower.endsWith('s')) {
    const singular = HINGLISH_PRONUNCIATION[lower.slice(0, -1)];
    if (singular) return pluralise(singular);
    if (lower.endsWith('es')) {
      const stem = HINGLISH_PRONUNCIATION[lower.slice(0, -2)];
      if (stem) return pluralise(stem);
    }
  }
  if (lower.endsWith('ing')) {
    const stem = HINGLISH_PRONUNCIATION[lower.slice(0, -3)];
    if (stem) return `${stem}\u093f\u0902\u0917`;
  }
  // Unmapped: hand the original to the engine, which makes a reasonable
  // attempt at Latin text. Reading it imperfectly beats dropping it.
  return null;
}

/**
 * Rewrite an answer into something a synthesiser reads well.
 * Never used for display, only for speech.
 */
export function toSpeakable(text: string, lang: Lang): string {
  let out = text;

  if (lang === 'hi') {
    // Replace each Latin run by looking it up, rather than looping over the map
    // and running one regex per term. This also gets plurals for free: an
    // unlisted "stations" resolves through "station", which the term-by-term
    // version missed because the word boundary made them different words.
    out = out.replace(/[A-Za-z]+/g, (word) => pronounce(word) ?? word);
    for (const [digits, spoken] of Object.entries(SPOKEN_NUMBERS)) {
      out = out.replace(new RegExp(`\\b${digits}\\b`, 'g'), spoken);
    }
  } else {
    for (const [digits, spoken] of Object.entries(SPOKEN_NUMBERS_EN)) {
      out = out.replace(new RegExp(`\\b${digits}\\b`, 'g'), spoken);
    }
  }

  // A slash between two words is read aloud as "slash" by most engines.
  out = out.replace(/(\S)\/(\S)/g, '$1, $2');
  // The danda is a full stop; some engines ignore it and run sentences together.
  out = out.replace(/।/g, '.');

  return out.replace(/\s+/g, ' ').trim();
}

/** BCP 47 tags to try, most specific first. */
export const VOICE_PREFERENCE: Record<Lang, string[]> = {
  hi: ['hi-IN', 'hi'],
  en: ['en-IN', 'en-GB', 'en-US', 'en'],
};

export const SPEECH_RATE: Record<Lang, number> = {
  // Slightly slower than default: this is safety information, often read on a
  // noisy roadside, and Devanagari synthesis at full rate is hard to follow.
  hi: 0.92,
  en: 0.95,
};
