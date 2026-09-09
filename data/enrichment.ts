/**
 * Hand-authored companion to data/source-hi.json.
 *
 * source-hi.json holds the approved Hindi advisory VERBATIM. This file adds
 * everything around it: the English rendering, alternate phrasings that feed the
 * lexical and phonetic scorers, curated keywords, and the intent assignment.
 *
 * Rules for editing:
 *  - Never edit answerHi here. It lives in source-hi.json and is byte-exact.
 *  - Every number in the Hindi answer must survive into answerEn. 1095, 112,
 *    "60 to 90 minutes" and "13 September" are load-bearing facts.
 *  - No em-dashes or en-dashes in any user-visible string.
 *  - variantsRoman is how people actually type on a phone keyboard. Include
 *    misspellings that are common, not every theoretical one; the phonetic
 *    scorer generalises from a few good examples.
 */
import type { Volatility } from '../lib/shared/types';

export interface Enrichment {
  intentId: string;
  questionEn: string;
  answerEn: string;
  variantsHi: string[];
  variantsEn: string[];
  variantsRoman: string[];
  keywords: string[];
  volatility: Volatility;
}

const ADVISORY = 'Delhi Traffic Police, BRICS Summit 2026 traffic advisory FAQ';
export const PROVENANCE = ADVISORY;

export const ENRICHMENT: Record<string, Enrichment> = {
  'faq-01': {
    intentId: 'zones_restrictions',
    questionEn: 'Will the whole of Delhi be shut during the BRICS Summit?',
    answerEn:
      'No, the whole of Delhi will not be shut. Traffic restrictions will mainly apply around the Summit venue, on routes used for VIP movement, and in security-sensitive areas. Traffic in the rest of Delhi will keep running normally. That said, during VIP movement some routes may be held or diverted for a short while.',
    variantsHi: [
      'क्या दिल्ली पूरी तरह बंद रहेगी',
      'Summit के दौरान Delhi बंद रहेगी क्या',
      'पूरा शहर बंद होगा',
    ],
    variantsEn: [
      'Is Delhi closed during the summit',
      'Will the city be shut down',
      'Is everything closed in Delhi',
      'Delhi lockdown during BRICS',
    ],
    variantsRoman: [
      'kya delhi band rahegi',
      'puri dilli band hogi kya',
      'delhi band rahega summit ke dauran',
      'shahar band hoga',
    ],
    keywords: ['delhi', 'band', 'closed', 'shut', 'summit', 'restriction', 'lockdown', 'city'],
    volatility: 'stable',
  },
  'faq-02': {
    intentId: 'zones_restrictions',
    questionEn: 'What is the difference between a Controlled Zone and a Regulated Zone?',
    answerEn:
      'In a Controlled Zone security will be tighter and entry will be given only to authorised people, as per the rules in force. In a Regulated Zone normal traffic will keep moving, but traffic can be regulated temporarily when there is VIP movement or a security requirement.',
    variantsHi: [
      'Controlled Zone क्या है',
      'Regulated Zone का मतलब क्या है',
      'दोनों zone में अंतर',
    ],
    variantsEn: [
      'What is a controlled zone',
      'What is a regulated zone',
      'Difference between the two zones',
      'Explain zone types',
    ],
    variantsRoman: [
      'controlled zone aur regulated zone me kya fark hai',
      'zone ka matlab kya hai',
      'dono zone me antar',
    ],
    keywords: [
      'controlled', 'regulated', 'zone', 'fark', 'antar', 'difference', 'security', 'entry', 'authorized',
    ],
    volatility: 'stable',
  },
  'faq-03': {
    intentId: 'zones_restrictions',
    questionEn: 'How will residents of New Delhi and the NDMC area get to and from their homes?',
    answerEn:
      'Residents should carry their valid ID and cooperate fully with police personnel during security checking. Where local movement is permitted, you will be allowed in and out along the designated route. Avoid unnecessary parking or stopping on the main road.',
    variantsHi: [
      'NDMC area के resident घर कैसे जाएंगे',
      'नई दिल्ली में रहने वाले लोग घर कैसे पहुंचेंगे',
      'residents को घर जाने दिया जाएगा',
    ],
    variantsEn: [
      'I live in NDMC area how do I get home',
      'Can residents enter New Delhi area',
      'Resident access to homes',
    ],
    variantsRoman: [
      'ndmc area ke resident ghar kaise jayenge',
      'nai dilli me rehne wale ghar kaise pahunchenge',
      'main new delhi me rehta hu ghar kaise jau',
    ],
    keywords: [
      'ndmc', 'resident', 'ghar', 'home', 'nai', 'delhi', 'id', 'entry', 'local', 'movement', 'checking',
    ],
    volatility: 'stable',
  },
  'faq-04': {
    intentId: 'zones_restrictions',
    questionEn: 'Will private vehicles of people living in the NDMC area be allowed to run?',
    answerEn:
      'Where the traffic plan permits it, local resident vehicles will be given movement. But because of security arrangements there may be temporary restrictions on some roads. Follow the instructions of the traffic police on the spot.',
    variantsHi: [
      'NDMC में private car चला सकते हैं',
      'अपनी गाड़ी निकाल सकते हैं क्या',
      'resident की गाड़ी चलेगी',
    ],
    variantsEn: [
      'Can I use my own car in NDMC area',
      'Are private vehicles allowed for residents',
      'Can residents drive their cars',
    ],
    variantsRoman: [
      'ndmc me private vehicle chalega kya',
      'apni gaadi nikal sakte hai',
      'resident ki car chal sakti hai',
    ],
    keywords: [
      'apni',
      'car',
      'chalega',
      'chalegi',
      'gaadi',
      'ijazat',
      'movement',
      'ndmc',
      'nikal',
      'permission',
      'private',
      'resident',
      'restriction',
      'road',
      'vehicle',
    ],
    volatility: 'stable',
  },
  'faq-05': {
    intentId: 'airport_rail_travel',
    questionEn: 'I have to go to the airport. How early should I leave home?',
    answerEn:
      'During the Summit, VIP movement and security arrangements may add extra time on some routes. So leave well before your usual time for a flight, and it is better to keep a buffer of at least 60 to 90 minutes.',
    variantsHi: [
      'Airport के लिए कितनी जल्दी निकलें',
      'फ्लाइट के लिए कब निकलना चाहिए',
      'हवाई अड्डे जाने में कितना time लगेगा',
    ],
    variantsEn: [
      'How early to leave for the airport',
      'How much time to reach airport',
      'Flight buffer time during summit',
      'When should I start for the airport',
    ],
    variantsRoman: [
      'airport ke liye kitni jaldi niklu',
      'flight ke liye kab nikalna chahiye',
      'hawai adda jane me kitna time lagega',
      'airpot kitne time pehle jana chahiye',
    ],
    keywords: [
      'airport', 'flight', 'hawai', 'adda', 'time', 'buffer', 'jaldi', 'nikalna', 'early', 'igi', 'terminal',
    ],
    volatility: 'stable',
  },
  'faq-06': {
    intentId: 'airport_rail_travel',
    questionEn: 'Is the Metro a better option for getting to the airport?',
    answerEn:
      'Where possible, the Metro is a convenient option. Road traffic can be affected by restrictions or temporary stoppages. Check the latest status of both the Metro and your road route before you travel.',
    variantsHi: [
      'Airport के लिए Metro लेना ठीक है',
      'Airport Express Line चलेगी',
      'metro से airport जाना बेहतर है',
    ],
    variantsEn: [
      'Should I take the metro to the airport',
      'Is airport metro better than road',
      'Best way to reach airport',
    ],
    variantsRoman: [
      'airport ke liye metro better hai kya',
      'metro se airport jana theek hai',
      'airport express line chalegi',
    ],
    keywords: [
      'accha',
      'airport',
      'behtar',
      'better',
      'express',
      'line',
      'lu',
      'metro',
      'option',
      'road',
      'safer',
      'traffic',
      'versus',
    ],
    volatility: 'stable',
  },
  'faq-07': {
    intentId: 'airport_rail_travel',
    questionEn: 'Which documents should I carry when going to the airport?',
    answerEn:
      'Carry your flight ticket or booking details and a valid ID. It will be useful to show these if needed during security checking.',
    variantsHi: [
      'Airport जाते समय क्या documents चाहिए',
      'कौन से कागज साथ रखें',
      'ID card ले जाना जरूरी है',
    ],
    variantsEn: [
      'What documents for airport travel',
      'Do I need ID to go to the airport',
      'Papers to carry for the airport',
    ],
    variantsRoman: [
      'airport jate samay kaun se document rakhe',
      'kya kagaz sath rakhna hai',
      'id card lena zaroori hai',
    ],
    keywords: [
      'document', 'kagaz', 'ticket', 'booking', 'id', 'airport', 'security', 'checking', 'proof',
    ],
    volatility: 'stable',
  },
  'faq-08': {
    intentId: 'airport_rail_travel',
    questionEn: 'I have to go to New Delhi Railway Station. Will the station stay open?',
    answerEn:
      'Railway station services will continue, but there may be traffic restrictions or diversions on some routes leading to the station. Where possible, prefer the Metro or public transport, and leave with extra time in hand.',
    variantsHi: [
      'New Delhi Railway Station खुला रहेगा',
      'रेलवे स्टेशन जा सकते हैं',
      'NDLS तक कैसे पहुंचें',
    ],
    variantsEn: [
      'Is New Delhi railway station open',
      'Can I reach the railway station',
      'How to get to NDLS',
    ],
    variantsRoman: [
      'new delhi railway station khula rahega',
      'railway station ja sakte hai',
      'ndls tak kaise pahunche',
      'nai dilli station jana hai',
    ],
    keywords: [
      'delhi',
      'departs',
      'diversion',
      'ndls',
      'new',
      'open',
      'railway',
      'route',
      'station',
      'terminus',
      'train',
    ],
    volatility: 'stable',
  },
  'faq-09': {
    intentId: 'airport_rail_travel',
    questionEn: 'What problems could there be in reaching Old Delhi Railway Station?',
    answerEn:
      'There may be temporary traffic control on routes towards the station because of VIP movement or security arrangements. Plan your route after looking at the latest traffic advisory.',
    variantsHi: [
      'पुरानी दिल्ली स्टेशन जाने में दिक्कत',
      'Old Delhi station तक रास्ता',
      'पुरानी दिल्ली रेलवे स्टेशन कैसे जाएं',
    ],
    variantsEn: [
      'Problems reaching Old Delhi railway station',
      'Route to Old Delhi station',
      'Is Old Delhi station accessible',
    ],
    variantsRoman: [
      'purani dilli railway station jane me pareshani',
      'old delhi station tak rasta',
      'purani delhi station kaise jaye',
    ],
    keywords: [
      'purani', 'old', 'delhi', 'railway', 'station', 'route', 'rasta', 'traffic', 'control', 'advisory',
    ],
    volatility: 'stable',
  },
  'faq-10': {
    intentId: 'airport_rail_travel',
    questionEn: 'I have to pick up a passenger at the railway station. Can I stop my vehicle on the road?',
    answerEn:
      'No. Do not stop your vehicle on the road near the station and wait for a passenger. Use only authorised parking or the designated pick-up and drop-off area.',
    variantsHi: [
      'station पर गाड़ी रोक सकते हैं',
      'passenger लेने के लिए कहां रुकें',
      'pick up कहां से करें',
    ],
    variantsEn: [
      'Can I stop my car at the station to pick someone up',
      'Where to wait for a passenger at the station',
      'Pick up and drop off point',
    ],
    variantsRoman: [
      'station par gaadi rok sakte hai',
      'passenger lene ke liye kahan ruke',
      'pick up kahan se kare',
    ],
    keywords: [
      'pick', 'drop', 'passenger', 'station', 'rokna', 'wait', 'parking', 'authorized', 'gaadi',
    ],
    volatility: 'stable',
  },
  'faq-11': {
    intentId: 'special_journeys',
    questionEn: 'I have my UPSC, NDA or CDS exam on 13 September. How do I reach the exam centre?',
    answerEn:
      'Carry your admit card and check the location of your exam centre in advance. Where possible, use the Metro or public transport, and leave home well in advance. Avoid last-minute trouble caused by traffic restrictions.',
    variantsHi: [
      'exam centre कैसे पहुंचें',
      'UPSC exam है कैसे जाऊं',
      '13 September का पेपर है',
      'NDA CDS exam centre जाना है',
    ],
    variantsEn: [
      'How to reach my exam centre',
      'I have an exam on 13 September',
      'UPSC exam travel during summit',
      'Student going to exam centre',
    ],
    variantsRoman: [
      'exam centre kaise pahunchu',
      'upsc exam hai kaise jau',
      '13 september ka paper hai',
      'nda cds exam centre jana hai',
    ],
    keywords: [
      'exam', 'upsc', 'nda', 'cds', 'centre', 'center', 'admit', 'card', 'paper', 'student', 'september',
    ],
    volatility: 'volatile',
  },
  'faq-12': {
    intentId: 'special_journeys',
    questionEn: 'Will showing an admit card get me through a restricted road?',
    answerEn:
      'That should not be assumed automatically. An admit card can help explain the purpose of your travel, but the final decision will depend on the traffic and security arrangements in force at that time. Follow the alternate route the police suggest.',
    variantsHi: [
      'Admit card दिखाकर जा सकते हैं',
      'admit card से restricted road पर entry मिलेगी',
      'exam का proof दिखाने पर छोड़ेंगे',
    ],
    variantsEn: [
      'Will an admit card let me pass a barricade',
      'Does exam proof allow restricted road entry',
      'Can I use my admit card to enter a closed road',
    ],
    variantsRoman: [
      'admit card dikha kar ja sakte hai',
      'admit card se restricted road par entry milegi',
      'exam ka proof dikhane par chodenge',
    ],
    keywords: [
      'admit',
      'barricade',
      'card',
      'dikhakar',
      'dikhane',
      'entry',
      'exam',
      'khulegi',
      'letter',
      'override',
      'patra',
      'permission',
      'proof',
      'restricted',
      'road',
    ],
    volatility: 'stable',
  },
  'faq-13': {
    intentId: 'emergency_medical',
    questionEn: 'What should I do in a medical emergency?',
    answerEn:
      'Do not panic. If an ambulance is coming through, help give it way. If you need immediate assistance because of a medical emergency and your route is blocked, tell the traffic police present on the spot or contact 112 or 1095.',
    variantsHi: [
      'Medical emergency में क्या करें',
      'तबीयत खराब हो तो क्या करें',
      'emergency में किसे call करें',
    ],
    variantsEn: [
      'What to do in a medical emergency',
      'Medical emergency and the road is blocked',
      'Who to call in an emergency',
    ],
    variantsRoman: [
      'medical emergency me kya kare',
      'tabiyat kharab ho to kya kare',
      'emergency me kisko call kare',
    ],
    keywords: [
      'medical', 'emergency', 'ambulance', '112', '1095', 'help', 'blocked', 'urgent', 'tabiyat',
    ],
    volatility: 'stable',
  },
  'faq-14': {
    intentId: 'emergency_medical',
    questionEn: 'What arrangement will there be for the private vehicle of a patient going to hospital?',
    answerEn:
      'In a real medical emergency, tell the police personnel about the situation and follow their instructions. Do not try to remove a barricade or bypass the security arrangement. The traffic police will try to give safe passage according to the situation available.',
    variantsHi: [
      'Hospital जाना है गाड़ी से',
      'patient को अस्पताल ले जाना है',
      'बीमार को hospital कैसे ले जाएं',
    ],
    variantsEn: [
      'Taking a patient to hospital by car',
      'Private vehicle to hospital during restrictions',
      'How do I get a patient through',
    ],
    variantsRoman: [
      'hospital jana hai gaadi se',
      'patient ko aspatal le jana hai',
      'bimar ko hospital kaise le jaye',
    ],
    keywords: [
      'hospital', 'aspatal', 'patient', 'bimar', 'private', 'vehicle', 'passage', 'emergency', 'barricade',
    ],
    volatility: 'stable',
  },
  'faq-15': {
    intentId: 'public_transport',
    questionEn: 'Will the Delhi Metro run normally?',
    answerEn:
      'Metro services are expected to run normally, but for security reasons entry or exit at some stations, or a particular gate, may be controlled temporarily. Check the latest Metro advisory before you travel.',
    variantsHi: [
      'क्या मेट्रो चलेगी',
      'Delhi Metro बंद रहेगी क्या',
      'metro service normal रहेगी',
      'मेट्रो station खुला रहेगा',
    ],
    variantsEn: [
      'Will the metro run',
      'Is Delhi Metro closed',
      'Are metro stations open',
      'Metro service during BRICS summit',
    ],
    variantsRoman: [
      'kya metro chalegi',
      'delhi metro band rahegi kya',
      'metro service normal rahegi',
      'metro station khula rahega',
      'mtro chalu hai',
    ],
    keywords: [
      'metro', 'dmrc', 'station', 'gate', 'entry', 'exit', 'chalegi', 'band', 'service', 'normal',
    ],
    volatility: 'stable',
  },
  'faq-16': {
    intentId: 'public_transport',
    questionEn: 'Will DTC buses run?',
    answerEn:
      'Bus services will keep running, but in affected areas some routes may be temporarily changed, restricted or diverted. Check the latest status of your route before you travel.',
    variantsHi: [
      'DTC bus चलेगी',
      'बस service चालू रहेगी',
      'सरकारी बस मिलेगी',
    ],
    variantsEn: [
      'Are DTC buses running',
      'Will city buses operate',
      'Bus service during the summit',
    ],
    variantsRoman: [
      'dtc bus chalegi',
      'bus service chalu rahegi',
      'sarkari bus milegi',
      'bas chalegi kya',
    ],
    keywords: ['dtc', 'bus', 'bas', 'route', 'divert', 'service', 'cluster', 'chalegi'],
    volatility: 'stable',
  },
  'faq-17': {
    intentId: 'public_transport',
    questionEn: 'Will the entry of inter-state buses into Delhi stay normal?',
    answerEn:
      'The routes of some inter-state buses may change according to the situation. Passengers should plan their journey after checking with the bus service concerned and the latest traffic advisory.',
    variantsHi: [
      'दूसरे राज्य की बस Delhi आएगी',
      'inter state bus entry मिलेगी',
      'बाहर से आने वाली बस कहां रुकेगी',
    ],
    variantsEn: [
      'Will interstate buses enter Delhi',
      'Bus coming from another state',
      'ISBT bus service during summit',
    ],
    variantsRoman: [
      'dusre rajya ki bus delhi aayegi',
      'inter state bus entry milegi',
      'bahar se aane wali bus kahan rukegi',
    ],
    keywords: [
      'andar',
      'bus',
      'coach',
      'delhi',
      'entry',
      'haryana',
      'inter',
      'interstate',
      'isbt',
      'neighbouring',
      'passenger',
      'payegi',
      'rajya',
      'state',
      'up',
    ],
    volatility: 'volatile',
  },
  'faq-18': {
    intentId: 'public_transport',
    questionEn: 'Will autos and taxis be able to run?',
    answerEn:
      'Where there is permission, auto and taxi services will run. But in controlled or restricted areas their movement may be affected.',
    variantsHi: [
      'Auto चलेगा क्या',
      'टैक्सी मिलेगी',
      'auto rickshaw restricted area में जाएगा',
    ],
    variantsEn: [
      'Will autos run',
      'Are taxis available',
      'Auto rickshaw during the summit',
    ],
    variantsRoman: [
      'auto chalega kya',
      'taxi milegi',
      'auto rickshaw restricted area me jayega',
    ],
    keywords: [
      'auto',
      'bhade',
      'black',
      'chalega',
      'controlled',
      'hire',
      'milegi',
      'movement',
      'restricted',
      'rickshaw',
      'taxi',
      'threewheeler',
      'tipahiya',
      'yellow',
    ],
    volatility: 'stable',
  },
  'faq-19': {
    intentId: 'public_transport',
    questionEn: 'Will Ola, Uber and other cab services be available?',
    answerEn:
      'Cab services may remain available, but in restricted areas the entry of a vehicle or the pick-up of a passenger may be affected. Confirm the pick-up point and route with your driver in advance.',
    variantsHi: [
      'Ola Uber चलेगी',
      'cab book कर सकते हैं',
      'app से गाड़ी मिलेगी',
    ],
    variantsEn: [
      'Are Ola and Uber working',
      'Can I book a cab',
      'App cab availability during summit',
    ],
    variantsRoman: [
      'ola uber chalegi',
      'cab book kar sakte hai',
      'app se gaadi milegi',
      'uber chalu hai kya',
    ],
    keywords: [
      'app',
      'available',
      'book',
      'bookinng',
      'cab',
      'driver',
      'hailing',
      'hogi',
      'mobile',
      'ola',
      'online',
      'phone',
      'pickup',
      'rapido',
      'ride',
      'uber',
    ],
    volatility: 'stable',
  },
  'faq-20': {
    intentId: 'goods_delivery_trucks',
    questionEn: 'Will delivery services like Swiggy, Zomato and Blinkit work?',
    answerEn:
      'Delivery services may run in most areas of Delhi. But in controlled zones there may be temporary restrictions on entry and on delivery vehicles. The arrangement in force for essential supplies may be different.',
    variantsHi: [
      'Swiggy Zomato चलेगा',
      'online order आएगा',
      'खाना order कर सकते हैं',
      'Blinkit delivery होगी',
    ],
    variantsEn: [
      'Will food delivery work',
      'Are Swiggy and Zomato delivering',
      'Online grocery delivery during summit',
    ],
    variantsRoman: [
      'swiggy zomato chalega',
      'online order aayega',
      'khana order kar sakte hai',
      'blinkit delivery hogi',
    ],
    keywords: [
      'blinkit',
      'delivery',
      'flat',
      'food',
      'grocery',
      'khana',
      'khane',
      'online',
      'order',
      'pahunchega',
      'restaurant',
      'saman',
      'swiggy',
      'zepto',
      'zomato',
    ],
    volatility: 'stable',
  },
  'faq-21': {
    intentId: 'goods_delivery_trucks',
    questionEn: 'Will the delivery of milk, medicine and other essential supplies be affected?',
    answerEn:
      'An effort will be made to keep essential services running smoothly. Even so, in affected areas there may be restrictions on entry time or route. Follow the official instructions concerned.',
    variantsHi: [
      'दूध दवा मिलेगी',
      'essential supply आएगी',
      'medicine delivery होगी',
    ],
    variantsEn: [
      'Will milk and medicine be delivered',
      'Essential supplies during the summit',
      'Medicine availability and delivery',
    ],
    variantsRoman: [
      'doodh dawa milegi',
      'essential supply aayegi',
      'medicine delivery hogi',
      'dudh ki supply hogi',
    ],
    keywords: [
      'doodh', 'milk', 'dawa', 'medicine', 'essential', 'supply', 'delivery', 'zaroori', 'chemist',
    ],
    volatility: 'stable',
  },
  'faq-22': {
    intentId: 'goods_delivery_trucks',
    questionEn: 'What rules will apply to heavy vehicles and trucks?',
    answerEn:
      'Separate traffic arrangements may apply to heavy and goods vehicles. Entry restrictions, time restrictions or alternate routes may be fixed. Truck drivers should check the latest traffic advisory before travelling.',
    variantsHi: [
      'Truck के लिए क्या नियम है',
      'भारी गाड़ी चल सकती है',
      'commercial vehicle entry',
    ],
    variantsEn: [
      'Rules for trucks during the summit',
      'Heavy vehicle restrictions',
      'Goods vehicle entry timings',
    ],
    variantsRoman: [
      'truck ke liye kya niyam hai',
      'bhari gaadi chal sakti hai',
      'commercial vehicle entry milegi',
    ],
    keywords: [
      'truck', 'heavy', 'goods', 'bhari', 'commercial', 'vehicle', 'entry', 'time', 'restriction', 'lorry',
    ],
    volatility: 'volatile',
  },
  'faq-23': {
    intentId: 'goods_delivery_trucks',
    questionEn: 'Will trucks coming from other states get entry into Delhi?',
    answerEn:
      'During the restricted period some heavy vehicles may be diverted towards alternate routes outside Delhi. Follow the notification and diversion plan in force.',
    variantsHi: [
      'बाहर से आने वाले truck को entry मिलेगी',
      'दूसरे राज्य का truck Delhi आ सकता है',
      'truck divert होगा',
    ],
    variantsEn: [
      'Can interstate trucks enter Delhi',
      'Truck diversion during the summit',
      'Are outside trucks allowed in',
    ],
    variantsRoman: [
      'bahar se aane wale truck ko entry milegi',
      'dusre rajya ka truck delhi aa sakta hai',
      'truck divert hoga kya',
    ],
    keywords: [
      'alternate',
      'bahar',
      'carrier',
      'diversion',
      'divert',
      'entry',
      'ghusega',
      'interstate',
      'lorry',
      'neighbouring',
      'notification',
      'rajya',
      'route',
      'shahar',
      'truck',
    ],
    volatility: 'volatile',
  },
  'faq-24': {
    intentId: 'vip_movement',
    questionEn: 'What should I do if my vehicle is stopped because of VIP movement?',
    answerEn:
      'Keep patience and stay in your lane. Do not try to get through from the wrong lane, the footpath or the wrong direction, and do not block the intersection. Once the VIP movement is clear, traffic will be released on the signal of the traffic police.',
    variantsHi: [
      'VIP movement में गाड़ी रोक दी तो क्या करें',
      'convoy की वजह से रुके हैं',
      'traffic रोक दिया गया है',
    ],
    variantsEn: [
      'My car is stopped for VIP movement',
      'What to do when traffic is held for a convoy',
      'Stuck because of VIP movement',
    ],
    variantsRoman: [
      'vip movement me gaadi rok di to kya kare',
      'convoy ki wajah se ruke hai',
      'traffic rok diya gaya hai',
    ],
    keywords: [
      'vip', 'movement', 'convoy', 'stopped', 'rok', 'lane', 'patience', 'signal', 'intersection',
    ],
    volatility: 'stable',
  },
  'faq-25': {
    intentId: 'vip_movement',
    questionEn: 'How long will traffic be held during VIP movement?',
    answerEn:
      'No fixed time limit can be given for this. It depends on the convoy, the security arrangements and the situation on the spot. Follow police instructions and do not sound the horn unnecessarily.',
    variantsHi: [
      'कितनी देर traffic रुकेगा',
      'VIP movement कितना time लेगा',
      'कब खुलेगा रास्ता',
    ],
    variantsEn: [
      'How long is traffic stopped for VIP movement',
      'Duration of a convoy hold',
      'When will the road open again',
    ],
    variantsRoman: [
      'kitni der traffic rukega',
      'vip movement kitna time lega',
      'kab khulega rasta',
    ],
    keywords: [
      'kitni', 'der', 'time', 'duration', 'vip', 'movement', 'convoy', 'hold', 'wait', 'khulega',
    ],
    volatility: 'stable',
  },
  'faq-26': {
    intentId: 'vip_movement',
    questionEn: 'Should I get out of my vehicle during VIP movement?',
    answerEn:
      'No. Do not step out of your vehicle without need. Stay safely in your lane and follow the instructions of the traffic police.',
    variantsHi: [
      'गाड़ी से उतर सकते हैं',
      'VIP movement में बाहर निकलना चाहिए',
      'car से बाहर आ सकते हैं',
    ],
    variantsEn: [
      'Can I step out of my car during VIP movement',
      'Should I get out of the vehicle while waiting',
    ],
    variantsRoman: [
      'gaadi se utar sakte hai',
      'vip movement me bahar nikalna chahiye',
      'car se bahar aa sakte hai',
    ],
    keywords: [
      'bahar',
      'gaadi',
      'intezar',
      'khada',
      'lane',
      'movement',
      'out',
      'safe',
      'stand',
      'step',
      'utar',
      'utarna',
      'utaru',
      'vehicle',
      'vip',
      'wait',
    ],
    volatility: 'stable',
  },
  'faq-27': {
    intentId: 'vip_movement',
    questionEn: 'Should I take photos or videos of a VIP convoy?',
    answerEn:
      'Avoid going near the convoy to take photos or video during security arrangements. Do not obstruct traffic or security movement in any way.',
    variantsHi: [
      'convoy की photo खींच सकते हैं',
      'VIP का video बना सकते हैं',
      'फोटो लेना allowed है',
    ],
    variantsEn: [
      'Can I photograph a VIP convoy',
      'Is filming the convoy allowed',
      'Taking pictures of VIP movement',
    ],
    variantsRoman: [
      'convoy ki photo kheech sakte hai',
      'vip ka video bana sakte hai',
      'photo lena allowed hai',
    ],
    keywords: ['photo', 'video', 'convoy', 'vip', 'camera', 'record', 'allowed', 'security'],
    volatility: 'stable',
  },
  'faq-28': {
    intentId: 'road_conduct_jams',
    questionEn: 'Can I move a barricade and go through a restricted road?',
    answerEn:
      'No. Do not remove a barricade or try to cross a security arrangement. Use the alternate route told to you by the traffic police.',
    variantsHi: [
      'barricade हटा सकते हैं',
      'restricted road से निकल सकते हैं',
      'बैरिकेड पार कर सकते हैं',
    ],
    variantsEn: [
      'Can I remove a barricade',
      'Can I drive through a restricted road',
      'Is crossing a barricade allowed',
    ],
    variantsRoman: [
      'barricade hata sakte hai',
      'restricted road se nikal sakte hai',
      'barikade paar kar sakte hai',
    ],
    keywords: [
      'alternate',
      'aside',
      'badh',
      'barricade',
      'bypass',
      'cross',
      'hatakar',
      'hatana',
      'paar',
      'push',
      'restricted',
      'road',
      'route',
    ],
    volatility: 'stable',
  },
  'faq-29': {
    intentId: 'road_conduct_jams',
    questionEn: 'What should I do if my normal route is suddenly closed?',
    answerEn:
      'Do not panic. Stop at a safe place and look for an alternate route. Follow the official traffic advisory and the instructions of the traffic police present on the spot. Do not drive on the wrong side or force entry into a restricted road.',
    variantsHi: [
      'रास्ता बंद मिले तो क्या करें',
      'route अचानक बंद हो गया',
      'मेरा रोज का रास्ता बंद है',
    ],
    variantsEn: [
      'My usual route is closed what do I do',
      'Road suddenly blocked',
      'Route closed unexpectedly',
    ],
    variantsRoman: [
      'rasta band mile to kya kare',
      'route achanak band ho gaya',
      'mera roz ka rasta band hai',
    ],
    keywords: [
      'achanak',
      'advisory',
      'alternate',
      'band',
      'blocked',
      'closed',
      'daily',
      'diversion',
      'rasta',
      'route',
      'roz',
      'usual',
    ],
    volatility: 'stable',
  },
  'faq-30': {
    intentId: 'road_conduct_jams',
    questionEn: 'Can I fully rely on Google Maps or other navigation apps?',
    answerEn:
      'Navigation apps are useful, but temporary traffic restrictions or VIP movement may not update on them immediately. So give priority to the official traffic advisory.',
    variantsHi: [
      'Google Maps पर भरोसा कर सकते हैं',
      'navigation app सही बताएगा',
      'maps से route देख सकते हैं',
    ],
    variantsEn: [
      'Can I trust Google Maps during the summit',
      'Are navigation apps accurate',
      'Should I follow maps or the advisory',
    ],
    variantsRoman: [
      'google maps par bharosa kar sakte hai',
      'navigation app sahi batayega',
      'maps se route dekh sakte hai',
    ],
    keywords: [
      'accurate',
      'advisory',
      'app',
      'bharosa',
      'dikhayega',
      'diversion',
      'google',
      'gps',
      'immediately',
      'maps',
      'naksha',
      'navigation',
      'rely',
      'route',
      'sahi',
      'trust',
      'update',
    ],
    volatility: 'stable',
  },
  'faq-31': {
    intentId: 'zones_restrictions',
    questionEn: 'Will there be special restrictions on parking?',
    answerEn:
      'Yes. There may be special restrictions on parking in security-sensitive areas, on main roads, at intersections and around the venue. Use only authorised parking.',
    variantsHi: [
      'parking कहां कर सकते हैं',
      'गाड़ी कहां खड़ी करें',
      'parking पर रोक है क्या',
    ],
    variantsEn: [
      'Where can I park during the summit',
      'Are there parking restrictions',
      'Parking rules near the venue',
    ],
    variantsRoman: [
      'parking kahan kar sakte hai',
      'gaadi kahan khadi kare',
      'parking par rok hai kya',
      'parkig kahan milegi',
    ],
    keywords: [
      'parking', 'park', 'khadi', 'authorized', 'restriction', 'venue', 'intersection', 'main', 'road',
    ],
    volatility: 'stable',
  },
  'faq-32': {
    intentId: 'road_conduct_jams',
    questionEn: 'What should I do if my vehicle breaks down on the way?',
    answerEn:
      'If possible, move the vehicle to a safe side, put the hazard lights on, and do not leave the vehicle in the middle of the road. If traffic is being obstructed, contact Delhi Traffic Police on 1095 for help.',
    variantsHi: [
      'गाड़ी खराब हो जाए तो क्या करें',
      'car breakdown हो गई',
      'गाड़ी बंद हो गई रास्ते में',
    ],
    variantsEn: [
      'My car broke down what do I do',
      'Vehicle breakdown on the road',
      'Who to call if my car stops working',
    ],
    variantsRoman: [
      'gaadi kharab ho jaye to kya kare',
      'car breakdown ho gayi',
      'gaadi band ho gayi raste me',
    ],
    keywords: [
      'breakdown', 'kharab', 'band', 'hazard', 'lights', 'tow', '1095', 'help', 'safe', 'side',
    ],
    volatility: 'stable',
  },
  'faq-33': {
    intentId: 'emergency_medical',
    questionEn: 'What should I do if there is an accident?',
    answerEn:
      'First look to your own safety and that of others. Get medical help for anyone injured. Contact 112 if needed and inform the traffic police. Do not let an unnecessary crowd gather at the accident spot.',
    variantsHi: [
      'Accident हो जाए तो क्या करें',
      'दुर्घटना हो गई है',
      'टक्कर हो गई क्या करें',
    ],
    variantsEn: [
      'What to do after an accident',
      'There has been a road accident',
      'Accident on the road who to call',
    ],
    variantsRoman: [
      'accident ho jaye to kya kare',
      'durghatna ho gayi hai',
      'takkar ho gayi kya kare',
      'aksident hua hai',
    ],
    keywords: [
      'accident', 'durghatna', 'takkar', 'injured', 'ghayal', '112', 'safety', 'crash', 'medical',
    ],
    volatility: 'stable',
  },
  'faq-34': {
    intentId: 'road_conduct_jams',
    questionEn: 'What should I do if the traffic jam is very heavy?',
    answerEn:
      'Do not block the intersection, do not drive on the wrong side, and avoid changing lanes repeatedly. Follow the instructions of the traffic police and take an alternate route if possible.',
    variantsHi: [
      'बहुत जाम लगा है क्या करें',
      'traffic jam में फंस गए',
      'jam से कैसे निकलें',
    ],
    variantsEn: [
      'Heavy traffic jam what should I do',
      'Stuck in a jam',
      'How to handle a big traffic jam',
    ],
    variantsRoman: [
      'bahut jam laga hai kya kare',
      'traffic jam me phas gaye',
      'jam se kaise nikle',
    ],
    keywords: [
      'alternate',
      'bhayankar',
      'bheed',
      'choked',
      'congestion',
      'crowd',
      'heavy',
      'intersection',
      'jam',
      'lane',
      'phas',
      'phasna',
      'stuck',
      'traffic',
      'zyada',
    ],
    volatility: 'stable',
  },
  'faq-35': {
    intentId: 'road_conduct_jams',
    questionEn: 'Will sounding the horn continuously in a jam clear the traffic faster?',
    answerEn:
      'No. Unnecessary honking does not clear traffic faster. It only increases noise and stress. Keep patience and stay in your lane.',
    variantsHi: [
      'horn बजाने से जाम खुलेगा',
      'हॉर्न बजाना चाहिए jam में',
      'बार बार horn बजाना ठीक है',
    ],
    variantsEn: [
      'Does honking clear a jam',
      'Should I honk in traffic',
      'Is continuous honking useful',
    ],
    variantsRoman: [
      'horn bajane se jam khulega',
      'horn bajana chahiye jam me',
      'baar baar horn bajana theek hai',
    ],
    keywords: ['horn', 'honk', 'bajana', 'jam', 'noise', 'shor', 'patience', 'lane'],
    volatility: 'stable',
  },
  'faq-36': {
    intentId: 'road_conduct_jams',
    questionEn: 'Can I drive on the wrong side to get out of a jam?',
    answerEn:
      'Absolutely not. Wrong-side driving can cause a serious accident and makes the traffic situation even worse.',
    variantsHi: [
      'wrong side जा सकते हैं',
      'गलत दिशा में गाड़ी चला सकते हैं',
      'उल्टी साइड से निकल सकते हैं',
    ],
    variantsEn: [
      'Can I drive on the wrong side',
      'Is wrong side driving allowed to escape a jam',
    ],
    variantsRoman: [
      'wrong side ja sakte hai',
      'galat disha me gaadi chala sakte hai',
      'ulti side se nikal sakte hai',
    ],
    keywords: [
      'accident',
      'across',
      'against',
      'disha',
      'driving',
      'flow',
      'galat',
      'illegal',
      'jam',
      'opposite',
      'side',
      'taraf',
      'ulta',
      'ulti',
      'wrong',
    ],
    volatility: 'stable',
  },
  'faq-37': {
    intentId: 'road_conduct_jams',
    questionEn: 'What should I do if I miss my turn or exit?',
    answerEn:
      'Do not brake suddenly, do not reverse, and do not try to go back in the wrong direction. Go ahead and change your route from a safe and legal place. A delay of a few minutes is better than an accident.',
    variantsHi: [
      'turn miss हो गया तो क्या करें',
      'exit छूट गया',
      'मोड़ निकल गया अब क्या करें',
    ],
    variantsEn: [
      'I missed my turn what now',
      'Missed the exit on the road',
      'Can I reverse if I miss a turn',
    ],
    variantsRoman: [
      'turn miss ho gaya to kya kare',
      'exit chhut gaya',
      'mod nikal gaya ab kya kare',
    ],
    keywords: ['turn', 'exit', 'miss', 'chhutna', 'reverse', 'brake', 'u-turn', 'route', 'safe'],
    volatility: 'stable',
  },
  'faq-38': {
    intentId: 'emergency_medical',
    questionEn: 'Is it necessary to give way to emergency vehicles?',
    answerEn:
      'Yes. Give safe passage to ambulances, fire tenders and other emergency vehicles. Instead of changing lanes suddenly, stay calm and make way.',
    variantsHi: [
      'ambulance को रास्ता देना जरूरी है',
      'emergency vehicle को साइड देनी चाहिए',
      'fire brigade को रास्ता दें',
    ],
    variantsEn: [
      'Must I give way to an ambulance',
      'Giving way to emergency vehicles',
      'Fire tender passage rules',
    ],
    variantsRoman: [
      'ambulance ko rasta dena zaroori hai',
      'emergency vehicle ko side deni chahiye',
      'fire brigade ko rasta de',
    ],
    keywords: [
      'ambulance', 'emergency', 'vehicle', 'fire', 'tender', 'brigade', 'rasta', 'passage', 'side',
    ],
    volatility: 'stable',
  },
  'faq-39': {
    intentId: 'emergency_medical',
    questionEn: 'What should I do if a vehicle is blocking the way of an emergency vehicle?',
    answerEn:
      'Do not argue with them yourself. Inform the traffic police from a safe distance. If there is immediate danger, contact 112, or 1095 for traffic assistance.',
    variantsHi: [
      'कोई ambulance का रास्ता रोक रहा है',
      'गाड़ी emergency vehicle को नहीं जाने दे रही',
      'किसे बताएं ambulance रुकी है',
    ],
    variantsEn: [
      'Someone is blocking an ambulance',
      'A car will not move for the ambulance',
      'Who to report a blocked ambulance to',
    ],
    variantsRoman: [
      'koi ambulance ka rasta rok raha hai',
      'gaadi emergency vehicle ko nahi jane de rahi',
      'kisko bataye ambulance ruki hai',
    ],
    keywords: [
      '1095',
      '112',
      'ambulance',
      'aside',
      'blocking',
      'danger',
      'emergency',
      'inform',
      'refuses',
      'report',
      'rokna',
    ],
    volatility: 'stable',
  },
  'faq-40': {
    intentId: 'special_journeys',
    questionEn: 'Will two-wheelers be able to go into restricted areas?',
    answerEn:
      'This will depend on the traffic and security plan in force at that time. Check the latest official traffic advisory before going into any restricted area.',
    variantsHi: [
      'bike restricted area में जा सकती है',
      'scooty ले जा सकते हैं',
      'दोपहिया वाहन की entry',
    ],
    variantsEn: [
      'Can two-wheelers enter restricted areas',
      'Bike entry during the summit',
      'Are scooters allowed in controlled zones',
    ],
    variantsRoman: [
      'bike restricted area me ja sakti hai',
      'scooty le ja sakte hai',
      'dopahiya vahan ki entry milegi',
    ],
    keywords: [
      'two', 'wheeler', 'bike', 'scooty', 'scooter', 'motorcycle', 'dopahiya', 'restricted', 'entry',
    ],
    volatility: 'stable',
  },
  'faq-41': {
    intentId: 'special_journeys',
    questionEn: 'Can there be restrictions on pedestrians and cyclists too?',
    answerEn:
      'Yes. In security-sensitive areas the movement of pedestrians and cycles can also be regulated temporarily. Follow the instructions of the police personnel present on the spot.',
    variantsHi: [
      'पैदल चलने वालों पर रोक होगी',
      'cycle चला सकते हैं',
      'पैदल जा सकते हैं',
    ],
    variantsEn: [
      'Are there restrictions for pedestrians',
      'Can I walk through the area',
      'Cycling during the summit',
    ],
    variantsRoman: [
      'paidal chalne walon par rok hogi',
      'cycle chala sakte hai',
      'paidal ja sakte hai',
    ],
    keywords: [
      'pedestrian', 'paidal', 'walk', 'cycle', 'cyclist', 'cycling', 'foot', 'movement', 'regulate',
    ],
    volatility: 'stable',
  },
  'faq-42': {
    intentId: 'special_journeys',
    questionEn: 'Can the movement of school buses and school vehicles be affected?',
    answerEn:
      'If the school is in an affected area, bus routes and timings may be affected. Parents and school management should check the latest traffic information before travelling.',
    variantsHi: [
      'school bus चलेगी',
      'बच्चों की बस आएगी',
      'स्कूल खुला रहेगा बस मिलेगी',
    ],
    variantsEn: [
      'Will school buses run',
      'School transport during the summit',
      'Will my child bus be affected',
    ],
    variantsRoman: [
      'school bus chalegi',
      'bachchon ki bus aayegi',
      'school khula rahega bus milegi',
    ],
    keywords: [
      'school', 'bus', 'bachcha', 'children', 'parent', 'timing', 'route', 'transport', 'student',
    ],
    volatility: 'stable',
  },
  'faq-43': {
    intentId: 'special_journeys',
    questionEn: 'What precautions should people going to office take?',
    answerEn:
      'Make your travel plan in advance, check the affected routes, and use public transport if possible. If you have an important duty or meeting, keep extra travel time.',
    variantsHi: [
      'office जाने वालों को क्या ध्यान रखना है',
      'दफ्तर कैसे पहुंचें',
      'office commute में क्या सावधानी',
    ],
    variantsEn: [
      'Advice for office commuters',
      'How to get to work during the summit',
      'Office travel precautions',
    ],
    variantsRoman: [
      'office jane walon ko kya dhyan rakhna hai',
      'daftar kaise pahunche',
      'office commute me kya savdhani',
    ],
    keywords: [
      'office', 'daftar', 'work', 'commute', 'meeting', 'duty', 'plan', 'public', 'transport', 'time',
    ],
    volatility: 'stable',
  },
  'faq-44': {
    intentId: 'special_journeys',
    questionEn: 'Will there be any special arrangement for government office and essential services staff?',
    answerEn:
      'Where needed, coordination will be done with the departments concerned. Staff should carry their official ID and cooperate during security checking.',
    variantsHi: [
      'सरकारी कर्मचारी के लिए व्यवस्था',
      'government staff को छूट मिलेगी',
      'essential service staff की entry',
    ],
    variantsEn: [
      'Arrangements for government staff',
      'Do essential services staff get an exemption',
      'Official ID for staff movement',
    ],
    variantsRoman: [
      'sarkari karmchari ke liye vyavastha',
      'government staff ko chhut milegi',
      'essential service staff ki entry',
    ],
    keywords: [
      'government', 'sarkari', 'staff', 'karmchari', 'official', 'id', 'essential', 'service', 'department',
    ],
    volatility: 'stable',
  },
  'faq-45': {
    intentId: 'special_journeys',
    questionEn: 'What should I do if I have to go to a hotel or a Summit-related venue?',
    answerEn:
      'Confirm the entry instructions from the hotel or venue in advance. Follow the designated entry route and timing. Do not try to enter a controlled area without authorisation.',
    variantsHi: [
      'hotel जाना है क्या करें',
      'Summit venue तक कैसे जाएं',
      'venue में entry कैसे मिलेगी',
    ],
    variantsEn: [
      'I need to go to a hotel near the venue',
      'How to reach a summit venue',
      'Entry to a summit hotel',
    ],
    variantsRoman: [
      'hotel jana hai kya kare',
      'summit venue tak kaise jaye',
      'venue me entry kaise milegi',
    ],
    keywords: [
      'area',
      'authorization',
      'conference',
      'controlled',
      'entry',
      'hosting',
      'hotel',
      'jagah',
      'property',
      'route',
      'sammelan',
      'summit',
      'timing',
      'venue',
    ],
    volatility: 'stable',
  },
  'faq-46': {
    intentId: 'special_journeys',
    questionEn: 'Will people going to a private function or a wedding also be affected?',
    answerEn:
      'If the function is in an affected area, the movement of guests and vehicles may be affected. Organisers should give guests information about the route and parking in advance.',
    variantsHi: [
      'शादी में जाना है असर पड़ेगा',
      'private function पर restriction है',
      'function में guest आ पाएंगे',
    ],
    variantsEn: [
      'Will my wedding be affected',
      'Private function during the summit',
      'Guests travelling to an event',
    ],
    variantsRoman: [
      'shaadi me jana hai asar padega',
      'private function par restriction hai',
      'function me guest aa payenge',
    ],
    keywords: [
      'shaadi', 'wedding', 'function', 'private', 'guest', 'event', 'organiser', 'parking', 'marriage',
    ],
    volatility: 'stable',
  },
  'faq-47': {
    intentId: 'special_journeys',
    questionEn: 'Is it all right to move on the road with a baraat or a large vehicle convoy?',
    answerEn:
      'No. Stopping vehicles on the road, forming an unnecessary convoy or blocking traffic is not appropriate. Follow traffic rules and police instructions.',
    variantsHi: [
      'बारात निकाल सकते हैं',
      'convoy बना सकते हैं सड़क पर',
      'शादी का जुलूस सड़क पर',
    ],
    variantsEn: [
      'Can we take a baraat procession on the road',
      'Is a large vehicle convoy allowed',
      'Wedding procession on the road',
    ],
    variantsRoman: [
      'baraat nikal sakte hai',
      'convoy bana sakte hai sadak par',
      'shaadi ka juloos sadak par',
    ],
    keywords: [
      'baraat', 'procession', 'juloos', 'convoy', 'blocking', 'road', 'sadak', 'wedding', 'rules',
    ],
    volatility: 'stable',
  },
  'faq-48': {
    intentId: 'vip_movement',
    questionEn: 'What should I do if the traffic police suddenly stop traffic on a road?',
    answerEn:
      'During security or VIP movement, an immediate decision can be taken according to the situation on the spot. Follow the instructions of the police personnel and do not try to bypass the barricading.',
    variantsHi: [
      'police ने अचानक traffic रोक दिया',
      'अचानक रास्ता बंद कर दिया गया',
      'traffic police रोक रही है क्यों',
    ],
    variantsEn: [
      'Police suddenly stopped the traffic',
      'Why has the road been closed suddenly',
      'Traffic held without notice',
    ],
    variantsRoman: [
      'police ne achanak traffic rok diya',
      'achanak rasta band kar diya gaya',
      'traffic police rok rahi hai kyun',
    ],
    keywords: [
      'barricading',
      'bataye',
      'bypass',
      'halted',
      'instruction',
      'notice',
      'police',
      'security',
      'stopped',
      'sudden',
      'suddenly',
      'vip',
      'warning',
    ],
    volatility: 'stable',
  },
  'faq-49': {
    intentId: 'info_reporting_prep',
    questionEn: 'Where will I get correct and latest traffic information?',
    answerEn:
      'Give priority to the official communication channels of Delhi Traffic Police, its traffic advisories, and information from the traffic police personnel deployed on the spot. Do not trust unverified social media messages.',
    variantsHi: [
      'सही traffic information कहां मिलेगी',
      'latest advisory कहां देखें',
      'official जानकारी कहां से लें',
    ],
    variantsEn: [
      'Where to get official traffic information',
      'Latest traffic advisory source',
      'How do I check verified updates',
    ],
    variantsRoman: [
      'sahi traffic information kahan milegi',
      'latest advisory kahan dekhe',
      'official jankari kahan se le',
    ],
    keywords: [
      'information', 'jankari', 'advisory', 'official', 'latest', 'update', 'source', 'verified', 'channel',
    ],
    volatility: 'stable',
  },
  'faq-50': {
    intentId: 'info_reporting_prep',
    questionEn: 'What should I do if I get wrong traffic information on social media?',
    answerEn:
      'Do not forward any message without verification. Confirm the information from an official source. Wrong information can increase unnecessary panic and traffic congestion.',
    variantsHi: [
      'social media पर गलत खबर मिली',
      'WhatsApp message forward करूं',
      'fake news traffic की',
    ],
    variantsEn: [
      'I saw wrong traffic news on social media',
      'Should I forward a traffic message',
      'Fake traffic news what to do',
    ],
    variantsRoman: [
      'social media par galat khabar mili',
      'whatsapp message forward karu',
      'fake news traffic ki',
    ],
    keywords: [
      'afwah',
      'bhej',
      'bhejna',
      'fake',
      'forward',
      'galat',
      'jhoothi',
      'khabar',
      'media',
      'panic',
      'rumour',
      'social',
      'unverified',
      'verify',
      'whatsapp',
    ],
    volatility: 'stable',
  },
  'faq-51': {
    intentId: 'info_reporting_prep',
    questionEn: 'Can citizens give information about a traffic problem to Delhi Traffic Police?',
    answerEn:
      'Yes. Information about an accident, vehicle breakdown, serious congestion or any other urgent traffic problem can be given to Delhi Traffic Police on 1095. In an emergency, contact 112.',
    variantsHi: [
      'traffic problem की शिकायत कहां करें',
      '1095 पर call कर सकते हैं',
      'police को कैसे बताएं',
    ],
    variantsEn: [
      'How do I report a traffic problem',
      'Traffic police helpline number',
      'Can I call about congestion',
    ],
    variantsRoman: [
      'traffic problem ki shikayat kahan kare',
      '1095 par call kar sakte hai',
      'police ko kaise bataye',
      'helpline number kya hai',
    ],
    keywords: [
      'report', 'shikayat', 'complaint', 'helpline', '1095', '112', 'call', 'inform', 'congestion', 'number',
    ],
    volatility: 'stable',
  },
  'faq-52': {
    intentId: 'info_reporting_prep',
    questionEn: 'Can citizens give information about traffic violations?',
    answerEn:
      'Yes. Information about actionable traffic problems such as wrong-side driving, illegal parking, signal violation and encroachment can be given through official channels. Giving clear details of location, time and the problem helps in taking action.',
    variantsHi: [
      'traffic violation की report कैसे करें',
      'गलत parking की शिकायत',
      'signal तोड़ने की जानकारी दें',
    ],
    variantsEn: [
      'How to report a traffic violation',
      'Reporting illegal parking',
      'Report signal jumping',
    ],
    variantsRoman: [
      'traffic violation ki report kaise kare',
      'galat parking ki shikayat',
      'signal todne ki jankari de',
    ],
    keywords: [
      'action',
      'encroachment',
      'illegal',
      'kahan',
      'parking',
      'report',
      'reporting',
      'shikayat',
      'side',
      'signal',
      'violation',
      'wrong',
    ],
    volatility: 'stable',
  },
  'faq-53': {
    intentId: 'info_reporting_prep',
    questionEn: 'Can citizens help the traffic police?',
    answerEn:
      'Absolutely. Traffic management is not the responsibility of the police alone. Lane discipline, correct parking, keeping intersections clear, avoiding wrong-side driving and driving with patience all help directly in making traffic better.',
    variantsHi: [
      'नागरिक traffic police की मदद कैसे करें',
      'हम क्या कर सकते हैं traffic के लिए',
      'public कैसे help करे',
    ],
    variantsEn: [
      'How can citizens help the traffic police',
      'What can I do to help traffic',
      'Public cooperation with traffic police',
    ],
    variantsRoman: [
      'nagrik traffic police ki madad kaise kare',
      'hum kya kar sakte hai traffic ke liye',
      'public kaise help kare',
    ],
    keywords: [
      'help', 'madad', 'citizen', 'nagrik', 'cooperate', 'lane', 'discipline', 'public', 'patience',
    ],
    volatility: 'stable',
  },
  'faq-54': {
    intentId: 'info_reporting_prep',
    questionEn: 'What will be the biggest responsibility of citizens?',
    answerEn:
      'Following the rules and cooperating with the instructions of the traffic police. One vehicle changing lane wrongly, blocking an intersection or driving on the wrong side can create a long jam for many people.',
    variantsHi: [
      'नागरिक की जिम्मेदारी क्या है',
      'हमारी क्या responsibility है',
      'लोगों को क्या करना चाहिए',
    ],
    variantsEn: [
      'What is the biggest responsibility of citizens',
      'What should the public do',
      'Citizen duty during the summit',
    ],
    variantsRoman: [
      'nagrik ki zimmedari kya hai',
      'hamari kya responsibility hai',
      'logon ko kya karna chahiye',
    ],
    keywords: [
      'responsibility', 'zimmedari', 'duty', 'citizen', 'nagrik', 'rules', 'cooperate', 'lane', 'jam',
    ],
    volatility: 'stable',
  },
  'faq-55': {
    intentId: 'info_reporting_prep',
    questionEn: 'What should I do if I do not know the way?',
    answerEn:
      'Do not try to find a route by looking at your mobile while driving. Stop at a safe place and check navigation, or take help from the traffic police. Do not try to find a route by compromising on safety.',
    variantsHi: [
      'रास्ता नहीं पता तो क्या करें',
      'route कैसे पता करें',
      'गाड़ी चलाते समय mobile देख सकते हैं',
    ],
    variantsEn: [
      'I do not know the route what should I do',
      'Can I check my phone while driving',
      'How to find the way safely',
    ],
    variantsRoman: [
      'rasta nahi pata to kya kare',
      'route kaise pata kare',
      'gaadi chalate samay mobile dekh sakte hai',
    ],
    keywords: [
      'rasta', 'route', 'navigation', 'mobile', 'phone', 'driving', 'safe', 'help', 'lost', 'directions',
    ],
    volatility: 'stable',
  },
  'faq-56': {
    intentId: 'info_reporting_prep',
    questionEn: 'Is it safe to drive fast during traffic restrictions?',
    answerEn:
      'No. During changed routes and restrictions, hurrying increases the risk of an accident. Follow the speed limit, lane discipline and the instructions of the traffic police.',
    variantsHi: [
      'तेज गाड़ी चला सकते हैं',
      'जल्दी driving safe है',
      'speed limit का ध्यान रखना है',
    ],
    variantsEn: [
      'Is fast driving safe during restrictions',
      'Can I speed up to save time',
      'Speed limit during the summit',
    ],
    variantsRoman: [
      'tez gaadi chala sakte hai',
      'jaldi driving safe hai',
      'speed limit ka dhyan rakhna hai',
    ],
    keywords: ['speed', 'fast', 'tez', 'jaldi', 'limit', 'safe', 'driving', 'accident', 'risk', 'lane'],
    volatility: 'stable',
  },
  'faq-57': {
    intentId: 'info_reporting_prep',
    questionEn: 'Should I keep enough fuel in the vehicle before a long journey?',
    answerEn:
      'Yes. Before a long journey, check the fuel and the basic condition of your vehicle. Journey time can increase because of traffic restrictions.',
    variantsHi: [
      'petrol भरवा लेना चाहिए',
      'fuel कितना रखें',
      'लंबी यात्रा से पहले tank full करें',
    ],
    variantsEn: [
      'Should I fill up fuel before travelling',
      'Fuel advice for a long journey',
      'Do I need a full tank',
    ],
    variantsRoman: [
      'petrol bharwa lena chahiye',
      'fuel kitna rakhe',
      'lambi yatra se pehle tank full kare',
      'disel bharna hai',
    ],
    keywords: [
      'fuel', 'petrol', 'diesel', 'cng', 'tank', 'journey', 'yatra', 'long', 'lambi', 'condition',
    ],
    volatility: 'stable',
  },
  'faq-58': {
    intentId: 'info_reporting_prep',
    questionEn: 'Should I do a basic check of the vehicle before travelling?',
    answerEn:
      'Yes. Check the tyres, brakes, fuel, battery, lights and the necessary documents. A breakdown can cause unnecessary congestion on the road.',
    variantsHi: [
      'गाड़ी की checking करनी चाहिए',
      'यात्रा से पहले क्या देखें गाड़ी में',
      'vehicle check करना जरूरी है',
    ],
    variantsEn: [
      'Should I check my vehicle before the trip',
      'What to inspect in the car before travelling',
      'Basic vehicle checks',
    ],
    variantsRoman: [
      'gaadi ki checking karni chahiye',
      'yatra se pehle kya dekhe gaadi me',
      'vehicle check karna zaroori hai',
    ],
    keywords: [
      'battery',
      'brake',
      'check',
      'checking',
      'condition',
      'dekhe',
      'document',
      'inspect',
      'journey',
      'lambi',
      'lights',
      'maintenance',
      'nikalne',
      'safar',
      'tyre',
      'vehicle',
      'yatra',
    ],
    volatility: 'stable',
  },
  'faq-59': {
    intentId: 'info_reporting_prep',
    questionEn: 'What should I do if someone is deliberately breaking traffic rules?',
    answerEn:
      'Do not argue or get into a confrontation with them yourself. If their driving is causing immediate danger or a serious traffic problem, give the information to the traffic police from a safe distance.',
    variantsHi: [
      'कोई जानबूझकर rules तोड़ रहा है',
      'गलत driving कर रहा है कोई',
      'किसी से बहस करनी चाहिए',
    ],
    variantsEn: [
      'Someone is deliberately breaking traffic rules',
      'A driver is being dangerous',
      'Should I confront a rule breaker',
    ],
    variantsRoman: [
      'koi jaanbujh kar rules tod raha hai',
      'galat driving kar raha hai koi',
      'kisi se behas karni chahiye',
    ],
    keywords: [
      'argue',
      'behas',
      'breaking',
      'confrontation',
      'danger',
      'deliberately',
      'distance',
      'flouting',
      'jaanbujh',
      'khud',
      'rules',
      'safe',
      'todna',
    ],
    volatility: 'stable',
  },
  'faq-60': {
    intentId: 'info_reporting_prep',
    questionEn: 'What is the safest traffic strategy during the BRICS Summit?',
    answerEn:
      'Plan your journey in advance, look at the official traffic advisory, take the Metro or public transport if possible, keep extra buffer time, and follow the instructions of the traffic police on the spot.',
    variantsHi: [
      'सबसे safe तरीका क्या है',
      'Summit में यात्रा की सलाह',
      'क्या करना चाहिए सबसे अच्छा',
      'best plan क्या है',
    ],
    variantsEn: [
      'Safest travel strategy during the summit',
      'Best advice for travelling during BRICS',
      'Summary of what I should do',
      'General tips for the summit',
    ],
    variantsRoman: [
      'sabse safe tarika kya hai',
      'summit me yatra ki salah',
      'kya karna chahiye sabse achha',
      'best plan kya hai',
    ],
    keywords: [
      'safe', 'strategy', 'advice', 'salah', 'plan', 'tips', 'best', 'buffer', 'metro', 'public', 'transport',
    ],
    volatility: 'stable',
  },
};
