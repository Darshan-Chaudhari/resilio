import { CATEGORY, PIN, STATUS } from './triage.js';

/**
 * Volunteer roster the router dispatches from. `skills` doubles as the
 * routing key: medical alerts get clinical volunteers, supply alerts get
 * logistics volunteers. `certUnit` is the radio call-sign shown on dispatch.
 */
export const VOLUNTEER_POOL = [
  {
    id: 'VOL-01',
    name: 'Dana Whitfield',
    role: 'Paramedic (off-shift)',
    certUnit: 'CERT Unit #4',
    skills: ['Medical Emergency', 'General Update'],
    distanceKm: 1.4,
    capacity: '2 slots',
  },
  {
    id: 'VOL-02',
    name: 'Marcus Iyer',
    role: 'Search & Rescue Lead',
    certUnit: 'CERT Unit #7',
    skills: ['Medical Emergency'],
    distanceKm: 2.1,
    capacity: '1 slot',
  },
  {
    id: 'VOL-03',
    name: 'Priya Raman',
    role: 'RN · Triage Desk',
    certUnit: 'CERT Unit #2',
    skills: ['Medical Emergency', 'Resource Need'],
    distanceKm: 3.0,
    capacity: '3 slots',
  },
  {
    id: 'VOL-04',
    name: 'Tomas Berg',
    role: 'Logistics Coordinator',
    certUnit: 'CERT Unit #9',
    skills: ['Resource Need'],
    distanceKm: 2.6,
    capacity: '6 pallets',
  },
  {
    id: 'VOL-05',
    name: 'Aisha Okafor',
    role: 'Shelter Manager',
    certUnit: 'CERT Unit #1',
    skills: ['Resource Need', 'General Update'],
    distanceKm: 4.2,
    capacity: '4 crates',
  },
  {
    id: 'VOL-06',
    name: 'Leo Castellanos',
    role: 'Radio Operator',
    certUnit: 'CERT Unit #12',
    skills: ['General Update', 'Medical Emergency'],
    distanceKm: 3.8,
    capacity: '2 slots',
  },
  {
    id: 'VOL-07',
    name: 'Hannah Vance',
    role: 'Community Liaison',
    certUnit: 'CERT Unit #5',
    skills: ['General Update'],
    distanceKm: 5.1,
    capacity: '3 slots',
  },
  {
    id: 'VOL-08',
    name: 'Dr. Omar Haddad',
    role: 'Field Physician',
    certUnit: 'CERT Unit #3',
    skills: ['Medical Emergency'],
    distanceKm: 5.9,
    capacity: '1 slot',
  },
];

/** Base response time per triage band, in minutes. */
const ETA_BY_PIN = {
  [PIN.RED]: 4,
  [PIN.YELLOW]: 9,
  [PIN.GREEN]: 14,
};

function hash(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

/**
 * Pick the best available volunteer for an incident: category match first,
 * closest distance second. Already-assigned volunteers are skipped.
 */
export function matchVolunteer(incident, assignedIds = []) {
  const ranked = VOLUNTEER_POOL.filter((volunteer) => !assignedIds.includes(volunteer.id)).sort(
    (a, b) => {
      const aMatch = a.skills.includes(incident.category) ? 0 : 1;
      const bMatch = b.skills.includes(incident.category) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return a.distanceKm - b.distanceKm;
    },
  );

  const volunteer = ranked[0] ?? VOLUNTEER_POOL[hash(incident.id) % VOLUNTEER_POOL.length];

  return {
    ...volunteer,
    etaMinutes: ETA_BY_PIN[incident.pin],
    assignedAt: Date.now(),
    channel:
      incident.category === CATEGORY.MEDICAL ? 'Priority relay (SMS + voice)' : 'Task queue push',
  };
}

function tokenize(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3),
  );
}

function similarity(a, b) {
  const left = tokenize(a);
  const right = tokenize(b);
  if (!left.size || !right.size) return 0;
  let shared = 0;
  left.forEach((word) => {
    if (right.has(word)) shared += 1;
  });
  return shared / Math.min(left.size, right.size);
}

/**
 * Mock "verification guardrail": scores an alert for authenticity before any
 * responder is committed. Deterministic and fully client-side.
 *
 * @returns {{score:number, verdict:'VERIFIED'|'FLAGGED', checks:Array, recommendation:string}}
 */
export function runGuardrail(incident, allIncidents = []) {
  const peers = allIncidents.filter((item) => item.id !== incident.id);

  const hasStreet = /\d|street|st\b|ave|road|rd|school|district|grid|building/i.test(
    incident.location,
  );
  const locationResolved = incident.location !== 'Location not provided' && hasStreet;

  const duplicate = peers
    .map((item) => ({ item, score: similarity(incident.message, item.message) }))
    .sort((a, b) => b.score - a.score)[0];

  const tooShort = incident.message.trim().length < 12;
  const keywordSignal = incident.keywords.length > 0;
  const corroborated = incident.confidence >= 65;

  const checks = [
    {
      label: 'Intent & language parse',
      pass: !tooShort,
      detail: tooShort
        ? 'Message too short for confident intent extraction.'
        : `${incident.keywords.length || 'No'} keyword signal · ${incident.confidence}% confidence`,
    },
    {
      label: 'Geo-location cross-check',
      pass: locationResolved,
      detail: locationResolved
        ? `Address resolved to grid cell · ${incident.location}`
        : 'Address unresolved — manual dispatch review required.',
    },
    {
      label: 'Duplicate & spam scan',
      pass: !duplicate || duplicate.score < 0.6,
      detail:
        duplicate && duplicate.score >= 0.6
          ? `Possible duplicate of ${duplicate.item.id} (${Math.round(duplicate.score * 100)}% overlap).`
          : 'No duplicate cluster found across the last 25 alerts.',
    },
    {
      label: 'Corroboration signal',
      pass: corroborated || keywordSignal,
      detail: corroborated
        ? 'Signal strength consistent with reported urgency band.'
        : 'Weak corroboration — flagged for human confirm.',
    },
  ];

  const passed = checks.filter((check) => check.pass).length;
  const severityBoost = incident.pin === PIN.RED ? 6 : incident.pin === PIN.YELLOW ? 3 : 0;
  const score = Math.max(
    12,
    Math.min(99, Math.round((passed / checks.length) * 88 + severityBoost + 3)),
  );

  const hardFail = !locationResolved || tooShort || (duplicate && duplicate.score >= 0.6);
  const verdict = hardFail || score < 70 ? 'FLAGGED' : 'VERIFIED';

  const recommendation =
    verdict === 'VERIFIED'
      ? 'Authenticity confirmed — safe to auto-dispatch the nearest matched volunteer.'
      : 'Route to a human dispatcher before committing a responder.';

  return { score, verdict, checks, recommendation };
}

/** Simulated reasoning steps the guardrail streams to the UI. */
export const GUARDRAIL_STEPS = [
  'Tokenising alert text',
  'Scoring urgency against triage model',
  'Geo-validating reported address',
  'Scanning for duplicates and spam',
  'Writing verification verdict',
];

/** Twilio-style intake bridge shown on the left panel. */
export const SMS_BRIDGE = {
  provider: 'Twilio',
  number: '+1 (415) 555-0142',
  route: 'POST /api/intake/sms',
};

export const SMS_PRESETS = [
  {
    label: 'Trapped · rising water',
    text: 'We are trapped on the second floor at 44 Elm Ave, water is rising fast.',
    location: '44 Elm Ave',
  },
  {
    label: 'Medical · insulin',
    text: 'My father is diabetic and out of insulin, we have no power and need medical help.',
    location: 'Cypress Ave, Block 4',
  },
  {
    label: 'Supply · blankets',
    text: 'The shelter on 3rd St is out of blankets and food for tonight.',
    location: '3rd St Community Shelter',
  },
  {
    label: 'General · status',
    text: 'Any update on the power restoration timeline for the Riverside district?',
    location: 'Riverside District',
  },
];

/**
 * Automated SMS acknowledgement sent back to the reporting number once the
 * alert has been triaged.
 */
export function buildSmsReply(incident) {
  const dispatched = incident.status === STATUS.DISPATCHED && incident.volunteer;
  const closing = dispatched
    ? `${incident.volunteer.certUnit} dispatched, ETA ${incident.volunteer.etaMinutes} min.`
    : 'Status: awaiting AI verification, a responder will be routed shortly.';

  return `RESILEO EOC: Alert ${incident.id} logged · ${incident.category} · urgency ${incident.urgency}/100 (${incident.pin.toUpperCase()} band). ${closing} Reply HELP for assistance.`;
}

/** Alerts injected by the "Simulate Live Disaster Stream" header control. */
export const LIVE_STREAM_ALERTS = [
  {
    message: 'Smoke and flames visible from the warehouse on Pier 9, two workers possibly trapped inside.',
    location: 'Pier 9 Warehouse, Harbor District',
    source: 'Dispatch Radio',
  },
  {
    message: 'Dialysis patient on Cypress Ave missed two sessions, needs medical transport and oxygen.',
    location: 'Cypress Ave, Block 4',
    source: 'Civilian App',
  },
  {
    message: 'Community shelter on 3rd St needs blankets, food and clean water for 40 evacuees.',
    location: '3rd St Community Shelter',
    source: 'Shelter Coordinator',
  },
  {
    message: 'Residents report a gas smell at North Ridge apartments; a child is trapped and needs medical help.',
    location: 'North Ridge Apartments, Block C',
    source: 'Drone Telemetry',
  },
  {
    message: 'Two families evacuated to Riverside are asking for baby formula and bottled water.',
    location: 'Riverside Evac Centre',
    source: 'SMS / Twilio',
  },
  {
    message: 'Fire alarm and smoke reported in the Millworks tower, wheelchair user still inside.',
    location: 'Millworks Tower, 12th floor',
    source: 'Dispatch Radio',
  },
  {
    message: 'We need a medical courier with insulin for a diabetic resident on 4th St.',
    location: '4th St, Apartment 2B',
    source: 'Civilian App',
  },
  {
    message: 'Food and water distribution point on Cypress Ave is running low on supplies.',
    location: 'Cypress Ave Distribution Point',
    source: 'Shelter Coordinator',
  },
  {
    message: 'Ask about road closures near the Millworks overpass before the evening convoy.',
    location: 'Millworks Overpass',
    source: 'Dispatch Radio',
  },
  {
    message: 'Is the Downtown district power grid coming back online this evening?',
    location: 'Downtown District, Grid 7',
    source: 'Civilian App',
  },
];
