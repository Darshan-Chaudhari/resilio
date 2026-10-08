import { STATUS } from './triage.js';
import { gridCellFor, toCoordinates } from './geo.js';
import { statusLabel } from './ui.js';

export const PIPELINE_ID = 'resileo-triage-v4.2';

/**
 * The "under the hood" JSON the triage model would emit for an incident —
 * surfaced verbatim in the incident card's payload viewer.
 */
export function buildAiPayload(incident) {
  const { lat, lng } = toCoordinates(incident.coords);
  const verification = incident.verification;
  const checks = verification?.checks ?? [];

  return {
    event_id: incident.id,
    pipeline: PIPELINE_ID,
    received_at: new Date(incident.createdAt).toISOString(),
    source: incident.source,
    status: statusLabel(incident),
    extracted_entities: {
      category: incident.category,
      urgency_score: incident.urgency,
      urgency_band: incident.pin.toUpperCase(),
      keywords: incident.keywords,
      escalators: incident.escalators,
      geocoded: {
        address: incident.location,
        lat,
        lng,
        grid_cell: gridCellFor(incident.coords),
      },
      confidence_score: Number((incident.confidence / 100).toFixed(2)),
    },
    verification: verification
      ? {
          status: verification.verdict,
          authenticity_score: verification.score,
          checks_passed: checks.filter((check) => check.pass).length,
          checks_total: checks.length,
          recommendation: verification.recommendation,
        }
      : {
          status: 'PENDING',
          authenticity_score: null,
          checks_passed: 0,
          checks_total: checks.length || 4,
          recommendation: 'Run the verification guardrail before dispatch.',
        },
    dispatch: incident.volunteer
      ? {
          status: incident.status === STATUS.DISPATCHED ? 'DISPATCHED' : 'QUEUED',
          unit: incident.volunteer.certUnit,
          responder: incident.volunteer.name,
          role: incident.volunteer.role,
          eta_minutes: incident.volunteer.etaMinutes,
          channel: incident.volunteer.channel,
          assigned_at: new Date(incident.volunteer.assignedAt).toISOString(),
        }
      : null,
    triage_latency_ms: incident.triageMs,
  };
}

export function serializeAiPayload(incident) {
  return JSON.stringify(buildAiPayload(incident), null, 2);
}
