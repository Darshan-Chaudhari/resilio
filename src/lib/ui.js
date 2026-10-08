import { CATEGORY, PIN, STATUS } from './triage.js';

/**
 * Raw hex values for the SVG map layer (Tailwind classes can't reach inside SVG
 * props). These are the only saturated colours in the interface and map exactly
 * to the priority indicators: rose-600 / amber-500 / emerald-500 — matching the
 * opaque pin badges on the dispatcher map.
 */
export const PIN_HEX = {
  [PIN.RED]: '#e11d48',
  [PIN.YELLOW]: '#f59e0b',
  [PIN.GREEN]: '#10b981',
};

/**
 * Opaque, high-contrast fills for the map pins. Solid blocks of priority colour
 * with white text so they stay legible on video and on the dark survey grid.
 * Kept as complete literal strings so Tailwind can statically extract them.
 */
export const PIN_SOLID = {
  [PIN.RED]: 'bg-rose-600',
  [PIN.YELLOW]: 'bg-amber-500',
  [PIN.GREEN]: 'bg-emerald-500',
};

/** Long-form priority description, used in the map legend. */
export const PIN_LABEL = {
  [PIN.RED]: 'High priority — critical',
  [PIN.YELLOW]: 'Medium priority — supply',
  [PIN.GREEN]: 'Low priority — matched / info',
};

/** Compact uppercase tags for the numbered map dots ("01 • MEDICAL"). */
export const CATEGORY_TAG = {
  [CATEGORY.MEDICAL]: 'MEDICAL',
  [CATEGORY.RESOURCE]: 'SUPPLY',
  [CATEGORY.GENERAL]: 'GENERAL',
};

export function categoryTag(category) {
  return CATEGORY_TAG[category] ?? 'GENERAL';
}

/**
 * Colour is reserved for priority. Everything here is either a solid dot, a
 * priority bar, or a restrained tinted badge — never decoration.
 * Kept as complete literal strings so Tailwind can statically extract them.
 */
export const PIN_THEME = {
  [PIN.RED]: {
    text: 'text-rose-300',
    dot: 'bg-rose-500',
    bar: 'bg-rose-500',
    line: 'border-l-rose-500',
    chip: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    border: 'border-rose-500/40',
    hex: PIN_HEX[PIN.RED],
  },
  [PIN.YELLOW]: {
    text: 'text-amber-300',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
    line: 'border-l-amber-500',
    chip: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    border: 'border-amber-500/40',
    hex: PIN_HEX[PIN.YELLOW],
  },
  [PIN.GREEN]: {
    text: 'text-emerald-300',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
    line: 'border-l-emerald-500',
    chip: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    border: 'border-emerald-500/40',
    hex: PIN_HEX[PIN.GREEN],
  },
};

/** Category is metadata, not priority — so it stays fully neutral. */
export const CATEGORY_THEME = {
  [CATEGORY.MEDICAL]: {
    icon: 'heart',
    text: 'text-slate-300',
    chip: 'border-slate-700 bg-slate-800/40 text-slate-300',
  },
  [CATEGORY.RESOURCE]: {
    icon: 'package',
    text: 'text-slate-300',
    chip: 'border-slate-700 bg-slate-800/40 text-slate-300',
  },
  [CATEGORY.GENERAL]: {
    icon: 'info',
    text: 'text-slate-300',
    chip: 'border-slate-700 bg-slate-800/40 text-slate-300',
  },
};

/**
 * Status colouring is limited to the two states that carry priority meaning:
 * FLAGGED (needs a human look) and DISPATCHED / matched. Pending and verified
 * stay neutral.
 */
export const STATUS_THEME = {
  [STATUS.PENDING]: 'border-slate-700 bg-slate-800/40 text-slate-300',
  [STATUS.VERIFIED]: 'border-slate-700 bg-slate-800/60 text-slate-200',
  [STATUS.FLAGGED]: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  [STATUS.DISPATCHED]: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
};

/**
 * Display text for an incident's status badge. Dispatched incidents surface the
 * responding unit and ETA, e.g. "DISPATCHED (CERT Unit #4 - ETA 4 min)".
 */
export function statusLabel(incident) {
  if (!incident) return '';
  if (incident.status === STATUS.DISPATCHED && incident.volunteer) {
    return `DISPATCHED (${incident.volunteer.certUnit} - ETA ${incident.volunteer.etaMinutes} min)`;
  }
  return incident.status;
}

export function timeAgo(timestamp, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function formatLatency(ms) {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function formatClock(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
