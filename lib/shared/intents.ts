import type { Intent } from './types';

/**
 * Nine named top-level intents. The 60 Q&A pairs are sub-intents beneath these.
 *
 * Two reasons this layer exists rather than treating each pair as its own intent:
 * per-intent analytics need more than one row to mean anything, and ambiguity
 * that crosses an intent boundary should ask the user rather than auto-resolve.
 *
 * `outOfScope` is the written boundary. Anything listed there looks adjacent but
 * must not be answered from this intent's pairs.
 */
export const INTENTS: Intent[] = [
  {
    id: 'zones_restrictions',
    nameHi: 'Zones और restrictions',
    nameEn: 'Zones & restrictions',
    descriptionEn:
      'Controlled and Regulated Zones, area closures, resident movement, parking rules.',
    outOfScope: [
      'Which exact roads are shut today (volatile; point at the live advisory)',
      'Whether a specific individual will be allowed through a checkpoint',
      'Permit or pass applications',
    ],
    displayOrder: 1,
    featured: true,
  },
  {
    id: 'airport_rail_travel',
    nameHi: 'Airport और Railway Station',
    nameEn: 'Airport & railway station',
    descriptionEn:
      'Reaching the airport or a railway station, how much buffer time to keep, documents, pick-up and drop-off.',
    outOfScope: [
      'Flight or train status, delays and cancellations',
      'Ticket booking',
      'Airport terminal-side procedures',
    ],
    displayOrder: 2,
    featured: true,
  },
  {
    id: 'public_transport',
    nameHi: 'Metro, Bus, Auto, Cab',
    nameEn: 'Metro, bus, auto, cab',
    descriptionEn:
      'Delhi Metro, DTC and inter-state buses, autos, taxis and app cabs during the summit.',
    outOfScope: [
      'Metro fares, card recharge and timings (Delhi Metro handles these)',
      'Complaints about a specific driver or operator',
      'Live train position inside the Metro network',
    ],
    displayOrder: 3,
    featured: true,
  },
  {
    id: 'vip_movement',
    nameHi: 'VIP movement',
    nameEn: 'VIP movement',
    descriptionEn:
      'Convoy stoppages, how long traffic is held, and how to conduct yourself during movement.',
    outOfScope: [
      'Which dignitary is travelling, on what route, at what time (security-sensitive)',
      'Summit schedule and delegate itineraries',
    ],
    displayOrder: 4,
    featured: true,
  },
  {
    id: 'emergency_medical',
    nameHi: 'Emergency और medical',
    nameEn: 'Emergency & medical',
    descriptionEn:
      'Medical emergencies, hospital travel, accidents, and giving way to emergency vehicles.',
    outOfScope: [
      'Medical advice of any kind',
      'Hospital bed or ambulance availability',
      'Insurance and compensation claims',
    ],
    displayOrder: 5,
    featured: true,
  },
  {
    id: 'road_conduct_jams',
    nameHi: 'Jam और road rules',
    nameEn: 'Jams & road rules',
    descriptionEn:
      'Traffic jams, blocked routes, wrong-side driving, horn use, missed exits, breakdowns, navigation apps.',
    outOfScope: [
      'Challan amounts, payment and disputes',
      'Licence, registration and insurance procedures',
      'Live congestion levels on a named stretch',
    ],
    displayOrder: 6,
    featured: true,
  },
  {
    id: 'goods_delivery_trucks',
    nameHi: 'Delivery और trucks',
    nameEn: 'Deliveries & trucks',
    descriptionEn:
      'Food and grocery delivery, essential supplies, heavy goods vehicles and inter-state trucks.',
    outOfScope: [
      'The status of one particular order or shipment',
      'Commercial vehicle permits and fitness certificates',
    ],
    displayOrder: 7,
    featured: false,
  },
  {
    id: 'special_journeys',
    nameHi: 'Exam, school, office, venue',
    nameEn: 'Exams, school, office, venues',
    descriptionEn:
      'Exam centres, school transport, office commutes, government staff, hotels and summit venues, private functions, two-wheelers and pedestrians.',
    outOfScope: [
      'Exam admit cards, centre allotment and exam-body procedures',
      'Hotel bookings and event permissions',
      'Whether one named person will be let into a venue',
    ],
    displayOrder: 8,
    featured: false,
  },
  {
    id: 'info_reporting_prep',
    nameHi: 'Information और reporting',
    nameEn: 'Information & reporting',
    descriptionEn:
      'Where to get verified traffic information, handling misinformation, reporting problems and violations, citizen responsibility, and preparing for a journey.',
    outOfScope: [
      'The outcome of a complaint already filed',
      'FIR and case status',
      'Personal grievance redressal',
    ],
    displayOrder: 9,
    featured: false,
  },
];

export const INTENT_IDS = INTENTS.map((i) => i.id);

export function getIntent(id: string): Intent | undefined {
  return INTENTS.find((i) => i.id === id);
}

/** Opening quick-reply chips. Six is the mobile ceiling before the row gets noisy. */
export const FEATURED_INTENTS = INTENTS.filter((i) => i.featured);
