import 'server-only';

/**
 * Domain synonyms for the curated keyword scorer.
 *
 * Every group is a set of terms that mean the same thing in a Delhi traffic
 * question, across English, romanised Hindi and Devanagari. A hit on any member
 * counts as a hit on the whole group, which is what lets "aspatal", "hospital"
 * and "अस्पताल" all reach the same FAQ row.
 *
 * Kept explicit rather than learned: this is the one scorer whose behaviour a
 * non-programmer at the department should be able to read and correct.
 */
const SYNONYM_GROUPS: string[][] = [
  // Transport modes
  ['metro', 'mtro', 'dmrc', 'मेट्रो', 'subway', 'underground', 'भूमिगत', 'bhumigat', 'rail'],
  ['bus', 'bas', 'dtc', 'बस', 'बसें', 'busen', 'cluster', 'coach', 'सरकारी'],
  ['auto', 'rickshaw', 'ऑटो', 'रिक्शा', 'tuktuk', 'tipahiya', 'तिपहिया', 'threewheeler'],
  ['taxi', 'cab', 'ola', 'uber', 'rapido', 'टैक्सी', 'कैब', 'bhade', 'भाड़े', 'hire', 'hailing'],
  ['airport', 'airpot', 'igi', 'hawai', 'havai', 'हवाई', 'एयरपोर्ट', 'terminal', 'adda', 'अड्डा'],
  ['flight', 'plane', 'udaan', 'उड़ान', 'विमान', 'viman', 'फ्लाइट'],
  ['railway', 'station', 'train', 'ndls', 'रेलवे', 'स्टेशन', 'ट्रेन', 'terminus', 'रेल'],
  ['bike', 'scooty', 'scooter', 'motorcycle', 'motorbike', 'dopahiya', 'दोपहिया', 'मोटरसाइकिल'],
  ['pedestrian', 'paidal', 'पैदल', 'chalkar', 'चलकर', 'walking', 'cycle', 'cyclist', 'foot'],

  // Health and emergency
  ['hospital', 'aspatal', 'अस्पताल', 'clinic', 'ilaj', 'इलाज', 'treatment'],
  ['patient', 'bimar', 'बीमार', 'sick', 'tabiyat', 'तबीयत', 'collapsed', 'unwell'],
  ['ambulance', 'एम्बुलेंस', 'एंबुलेंस', 'damkal', 'दमकल', 'fire', 'tender', 'brigade', 'engine'],
  ['accident', 'durghatna', 'दुर्घटना', 'takkar', 'टक्कर', 'takra', 'टकरा', 'crash', 'collide',
   'collided', 'collision', 'ghayal', 'घायल', 'injured'],

  // Roads and conditions
  ['jam', 'congestion', 'जाम', 'bheed', 'भीड़', 'choked', 'blockage', 'crowded'],
  ['barricade', 'barikade', 'बैरिकेड', 'blockade', 'rok', 'रोक', 'sealed'],
  ['closed', 'band', 'बंद', 'shut', 'blocked', 'halted', 'shutting', 'shutdown'],
  ['open', 'khula', 'खुला', 'chalu', 'चालू', 'running', 'operating', 'khulegi', 'khulega'],
  ['parking', 'park', 'khadi', 'पार्किंग', 'parkig', 'halt', 'jagah', 'जगह'],
  ['breakdown', 'kharab', 'खराब', 'tow', 'puncture', 'stalled', 'stall'],
  ['wrongside', 'wrong', 'galat', 'गलत', 'ulti', 'उल्टी', 'opposite', 'against'],
  ['horn', 'honk', 'हॉर्न', 'bajana', 'awaz', 'आवाज', 'noise', 'shor', 'शोर'],
  ['turn', 'exit', 'mod', 'मोड़', 'cut', 'कट', 'reverse', 'peeche', 'पीछे'],
  ['route', 'rasta', 'raasta', 'रास्ता', 'sadak', 'सड़क', 'road', 'street', 'diversion', 'divert'],
  ['destination', 'manzil', 'मंजिल', 'directions', 'naksha', 'नक्शा', 'maps', 'navigation', 'gps'],
  ['speed', 'tez', 'तेज', 'jaldbazi', 'जल्दबाजी', 'rushing', 'hurry', 'fast', 'daudana'],

  // Zones, permissions, VIP
  ['zone', 'controlled', 'regulated', 'ज़ोन', 'जोन', 'restricted', 'प्रतिबंधित'],
  ['resident', 'ndmc', 'lutyens', 'लुटियन', 'rehta', 'रहता', 'rehne', 'रहने', 'ilake', 'इलाके'],
  ['permission', 'ijazat', 'इजाजत', 'allowed', 'permitted', 'anumati', 'अनुमति', 'entry',
   'ghusega', 'घुसेगा', 'chhut', 'छूट', 'rahat', 'राहत', 'relaxation'],
  ['vip', 'convoy', 'काफिला', 'kafila', 'kafile', 'काफिले', 'motorcade'],

  // Goods and delivery
  ['truck', 'lorry', 'goods', 'heavy', 'bhari', 'भारी', 'ट्रक', 'maal', 'माल', 'carrier',
   'carriers', 'commercial', 'vahan', 'वाहन'],
  ['delivery', 'swiggy', 'zomato', 'blinkit', 'zepto', 'order', 'डिलीवरी', 'courier',
   'pahunchega', 'पहुंचेगा', 'restaurant'],
  ['milk', 'doodh', 'dudh', 'दूध', 'medicine', 'dawa', 'दवा', 'essential', 'zaroori', 'जरूरी',
   'necessities', 'cheezen', 'चीजें', 'supplies', 'saman', 'सामान'],
  ['fuel', 'petrol', 'diesel', 'cng', 'पेट्रोल', 'डीजल', 'tank', 'tanki', 'टंकी'],

  // People and occasions
  ['exam', 'upsc', 'nda', 'cds', 'paper', 'centre', 'center', 'परीक्षा', 'pariksha',
   'kendra', 'केंद्र', 'bharti', 'भर्ती', 'hall'],
  ['school', 'bachcha', 'बच्चा', 'बच्चे', 'बच्चों', 'bachche', 'student', 'स्कूल', 'child'],
  ['office', 'daftar', 'दफ्तर', 'ऑफिस', 'commute', 'meeting', 'naukri', 'नौकरी',
   'workplace', 'duty'],
  ['staff', 'karmchari', 'कर्मचारी', 'कर्मचारियों', 'karmchariyon', 'vibhag', 'विभाग',
   'department', 'employee', 'employees', 'official'],
  ['wedding', 'shaadi', 'शादी', 'baraat', 'बारात', 'marriage', 'samaroh', 'समारोह',
   'function', 'mehman', 'मेहमान', 'guest', 'guests', 'celebration', 'juloos', 'जुलूस',
   'procession'],
  ['hotel', 'venue', 'होटल', 'summit', 'sammelan', 'सम्मेलन', 'conference'],

  // Information and reporting
  ['helpline', 'complaint', 'shikayat', 'शिकायत', 'report', '1095', '112', 'soochna', 'सूचना'],
  ['advisory', 'information', 'jankari', 'जानकारी', 'khabar', 'खबर', 'update', 'updates',
   'bharosemand', 'भरोसेमंद', 'trustworthy', 'verified', 'source'],
  ['social', 'whatsapp', 'fake', 'rumour', 'afwah', 'अफवाह', 'forward', 'jhoothi', 'झूठी',
   'unverified', 'bhej', 'भेज'],
  ['cooperate', 'sahyog', 'सहयोग', 'assist', 'madad', 'मदद', 'help', 'cooperation'],
  ['responsibility', 'zimmedari', 'जिम्मेदारी', 'kartavya', 'कर्तव्य', 'obligation', 'duty'],
  ['rules', 'niyam', 'नियम', 'discipline', 'violation', 'flouting', 'breaking'],
  ['document', 'kagaz', 'कागज', 'praman', 'प्रमाण', 'proof', 'admit', 'patra', 'पत्र',
   'card', 'ticket', 'booking'],
  ['sudden', 'achanak', 'अचानक', 'warning', 'notice', 'bataye', 'बताए'],
  ['photo', 'video', 'recording', 'रिकॉर्डिंग', 'camera', 'record', 'film'],
  ['advice', 'salah', 'सलाह', 'guidance', 'strategy', 'tips', 'suggestion'],
];

/** term -> ids of every group containing it. */
const TERM_TO_GROUPS = new Map<string, number[]>();
for (const [index, group] of SYNONYM_GROUPS.entries()) {
  for (const term of group) {
    const existing = TERM_TO_GROUPS.get(term);
    if (existing) existing.push(index);
    else TERM_TO_GROUPS.set(term, [index]);
  }
}

/** Expand tokens into the set of concept groups they touch. */
export function conceptGroups(tokens: string[]): Set<number> {
  const groups = new Set<number>();
  for (const token of tokens) {
    for (const g of TERM_TO_GROUPS.get(token) ?? []) groups.add(g);
  }
  return groups;
}

/** Add every synonym of every matched concept to a token list. */
export function expandSynonyms(tokens: string[]): string[] {
  const out = new Set(tokens);
  for (const g of conceptGroups(tokens)) {
    for (const term of SYNONYM_GROUPS[g] ?? []) out.add(term);
  }
  return [...out];
}

export const SYNONYM_GROUP_COUNT = SYNONYM_GROUPS.length;
