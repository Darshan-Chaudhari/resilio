/**
 * Resileo — mock on-device AI triage engine.
 *
 * Everything in this module runs client-side with no network calls so the
 * triage path is deterministic and testable (see triage.test.js).
 */

export const CRITICAL_KEYWORDS = ['oxygen', 'trapped', 'fire', 'medical'];
export const RESOURCE_KEYWORDS = ['water', 'blankets', 'food', 'shelter'];

export const CATEGORY = {
  MEDICAL: 'Medical Emergency',
  RESOURCE: 'Resource Need',
  GENERAL: 'General Update',
};

/** Pin colours requested by the product spec. */
export const PIN = {
  RED: 'red',
  YELLOW: 'yellow',
  GREEN: 'green',
};

export const STATUS = {
  PENDING: 'Awaiting Verification',
  VERIFIED: 'Verified',
  FLAGGED: 'Flagged for Review',
  DISPATCHED: 'Matched & Dispatched',
};

export const CATEGORY_ICON_KEY = {
  [CATEGORY.MEDICAL]: 'medical',
  [CATEGORY.RESOURCE]: 'resource',
  [CATEGORY.GENERAL]: 'general',
};

/** Words that raise the severity inside an already-classified band. */
const ESCALATORS = [
  'immediately',
  'unconscious',
  'not breathing',
  'bleeding',
  'collapsed',
  'severe',
  'elderly',
  'infant',
  'baby',
  'child',
  'trapped',
  'gas leak',
  'power out',
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function hashString(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

/**
 * Deterministic pseudo-GPS placement so the same address always lands on the
 * same map pin (no external geocoder needed for the demo).
 */
export function coordsForLocation(location = '', seed = '') {
  const key = `${location.trim().toLowerCase()}::${seed}`;
  return {
    x: clamp(9 + (hashString(key) % 82), 6, 94),
    y: clamp(11 + (hashString(`${seed}${key}`) % 76), 8, 92),
  };
}

/**
 * Classify a free-text civilian/dispatcher alert.
 *
 * - critical keywords  -> "Medical Emergency", urgency 90+, RED pin
 * - resource keywords  -> "Resource Need", urgency 60-80, YELLOW pin
 * - anything else      -> "General Update", urgency < 50, GREEN pin
 *
 * @param {string} text     the raw message body
 * @param {string} location the reported address (used for map placement only)
 */
export function triageRequest(text = '', location = '') {
  const message = String(text ?? '');
  const haystack = message.toLowerCase();

  const criticalHits = CRITICAL_KEYWORDS.filter((word) => haystack.includes(word));
  const resourceHits = RESOURCE_KEYWORDS.filter((word) => haystack.includes(word));
  const escalations = ESCALATORS.filter((word) => haystack.includes(word));

  let category;
  let pin;
  let urgency;

  if (criticalHits.length > 0) {
    category = CATEGORY.MEDICAL;
    pin = PIN.RED;
    urgency = clamp(
      90 + (criticalHits.length - 1) * 3 + Math.min(3, escalations.length * 2),
      90,
      99,
    );
  } else if (resourceHits.length > 0) {
    category = CATEGORY.RESOURCE;
    pin = PIN.YELLOW;
    urgency = clamp(
      60 + (resourceHits.length - 1) * 6 + Math.min(10, escalations.length * 2),
      60,
      80,
    );
  } else {
    category = CATEGORY.GENERAL;
    pin = PIN.GREEN;
    urgency = clamp(26 + Math.round(Math.min(message.trim().length, 240) / 8), 18, 49);
  }

  const matched = criticalHits.length > 0 ? criticalHits : resourceHits;
  const confidence =
    matched.length > 0
      ? Math.round(clamp(0.82 + matched.length * 0.04 + escalations.length * 0.01, 0, 0.99) * 100)
      : Math.round(clamp(0.5 + message.trim().length / 400, 0, 0.78) * 100);

  return {
    category,
    urgency,
    pin,
    keywords: [...new Set(matched)],
    escalators: [...new Set(escalations)],
    confidence,
    location: location.trim(),
    summary: buildSummary(category, matched),
  };
}

function buildSummary(category, matched) {
  if (category === CATEGORY.MEDICAL) {
    return matched.length
      ? `Life-safety signal detected (${matched.join(', ')}). Escalated to the medical relay queue.`
      : 'Life-safety signal detected. Escalated to the medical relay queue.';
  }
  if (category === CATEGORY.RESOURCE) {
    return matched.length
      ? `Supply signal detected (${matched.join(', ')}). Routed to the logistics desk.`
      : 'Supply signal detected. Routed to the logistics desk.';
  }
  return 'No life-safety or supply signal detected. Logged as a situational update.';
}

let sequence = 0;

/**
 * Build a complete incident record from a raw alert.
 */
export function createIncident(text, location, options = {}) {
  const triage = triageRequest(text, location);
  sequence += 1;

  const id = options.id ?? `INC-${4128 + sequence}`;
  const createdAt = options.createdAt ?? Date.now();

  return {
    id,
    message: String(text ?? '').trim(),
    location: location.trim() || 'Location not provided',
    ...triage,
    coords: options.coords ?? coordsForLocation(location, id),
    status: options.status ?? STATUS.PENDING,
    source: options.source ?? 'Civilian App',
    createdAt,
    triageMs: options.triageMs ?? 900 + (hashString(id + text) % 1700),
    verification: options.verification ?? null,
    volunteer: options.volunteer ?? null,
    isNew: options.isNew ?? false,
  };
}

/** Demo incidents injected on first paint. */
export const DEMO_ALERTS = [
  {
    message:
      'Tree fell through roof on 4th St. Power out, elderly parent needs oxygen generator immediately.',
    location: '4th St & Cypress Ave',
    coords: { x: 26, y: 30 },
    createdAt: -4 * 60 * 1000,
    triageMs: 1180,
    source: 'Civilian App',
  },
  {
    message: 'Shelter at Central High running out of bottled water and baby formula.',
    location: 'Central High School, Gymnasium',
    coords: { x: 62, y: 22 },
    createdAt: -13 * 60 * 1000,
    triageMs: 1620,
    source: 'Shelter Coordinator',
  },
  {
    message: 'Inquiry on estimated power restoration timeline for Downtown district.',
    location: 'Downtown District, Grid 7',
    coords: { x: 47, y: 70 },
    createdAt: -28 * 60 * 1000,
    triageMs: 840,
    source: 'Dispatch Radio',
  },
];

export function buildDemoIncidents(now = Date.now()) {
  return DEMO_ALERTS.map((alert, index) =>
    createIncident(alert.message, alert.location, {
      id: `INC-${4125 + index}`,
      createdAt: now + alert.createdAt,
      coords: alert.coords,
      triageMs: alert.triageMs,
      source: alert.source,
    }),
  );
}

/** Critical triage rate: share of alerts classified in under 30 seconds. */
export function criticalTriageRate(incidents) {
  if (!incidents.length) return 100;
  const fast = incidents.filter((incident) => incident.triageMs < 30000).length;
  return (fast / incidents.length) * 100;
}

export function medianTriageMs(incidents) {
  if (!incidents.length) return 0;
  const sorted = incidents.map((incident) => incident.triageMs).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
