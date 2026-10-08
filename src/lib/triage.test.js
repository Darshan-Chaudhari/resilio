import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CATEGORY,
  PIN,
  STATUS,
  buildDemoIncidents,
  coordsForLocation,
  createIncident,
  criticalTriageRate,
  medianTriageMs,
  triageRequest,
} from './triage.js';
import {
  LIVE_STREAM_ALERTS,
  SMS_PRESETS,
  VOLUNTEER_POOL,
  buildSmsReply,
  matchVolunteer,
  runGuardrail,
} from './ops.js';
import { PIPELINE_ID, buildAiPayload, serializeAiPayload } from './payload.js';
import { gridCellFor, toCoordinates } from './geo.js';
import { statusLabel } from './ui.js';

test('critical keywords route to a Medical Emergency with a RED pin at urgency 90+', () => {
  const samples = [
    'Elderly parent needs oxygen generator immediately.',
    'Family trapped under collapsed wall on 9th St.',
    'Fire spreading through the apartment block, smoke everywhere.',
    'Medical team needed, someone is unresponsive.',
  ];

  for (const text of samples) {
    const result = triageRequest(text, '4th St');
    assert.equal(result.category, CATEGORY.MEDICAL, text);
    assert.equal(result.pin, PIN.RED, text);
    assert.ok(result.urgency >= 90, `${text} -> ${result.urgency}`);
    assert.ok(result.urgency <= 100, `${text} -> ${result.urgency}`);
  }
});

test('resource keywords route to a Resource Need with a YELLOW pin at urgency 60-80', () => {
  const samples = [
    'We are out of bottled water at the shelter.',
    'Need blankets for the family shelter tonight.',
    'Food supplies running low at the community centre.',
    'Shelter capacity at Central High is full.',
  ];

  for (const text of samples) {
    const result = triageRequest(text, 'Central High');
    assert.equal(result.category, CATEGORY.RESOURCE, text);
    assert.equal(result.pin, PIN.YELLOW, text);
    assert.ok(result.urgency >= 60 && result.urgency <= 80, `${text} -> ${result.urgency}`);
  }
});

test('unmatched text routes to a General Update with a GREEN pin and urgency below 50', () => {
  const samples = [
    'Inquiry on estimated power restoration timeline for Downtown district.',
    'When will the road to Hillside be reopened?',
    'ok',
  ];

  for (const text of samples) {
    const result = triageRequest(text, 'Downtown District');
    assert.equal(result.category, CATEGORY.GENERAL, text);
    assert.equal(result.pin, PIN.GREEN, text);
    assert.ok(result.urgency < 50, `${text} -> ${result.urgency}`);
  }
});

test('multiple resource signals stay inside the yellow urgency band', () => {
  const result = triageRequest(
    'Shelter needs water, blankets, food and baby formula today.',
    'Central High',
  );
  assert.equal(result.pin, PIN.YELLOW);
  assert.ok(result.urgency >= 60 && result.urgency <= 80, `urgency ${result.urgency}`);
});

test('critical signals win over resource signals', () => {
  const result = triageRequest(
    'Fire in the shelter kitchen, we also need water for the trapped residents.',
    'Riverside Shelter',
  );
  assert.equal(result.category, CATEGORY.MEDICAL);
  assert.equal(result.pin, PIN.RED);
  assert.ok(result.urgency >= 90);
});

test('classification ignores the address field so unrelated street names cannot flip the pin', () => {
  const result = triageRequest('Elderly parent needs oxygen immediately.', 'Water Street');
  assert.equal(result.pin, PIN.RED);
  assert.equal(result.category, CATEGORY.MEDICAL);
});

test('createIncident returns a complete record in the awaiting-verification state', () => {
  const incident = createIncident('Need water at the shelter', '5 Elm Ave', { id: 'INC-TEST' });

  assert.equal(incident.id, 'INC-TEST');
  assert.equal(incident.status, STATUS.PENDING);
  assert.equal(incident.pin, PIN.YELLOW);
  assert.equal(incident.location, '5 Elm Ave');
  assert.equal(incident.verification, null);
  assert.equal(incident.volunteer, null);
  assert.ok(incident.coords.x >= 6 && incident.coords.x <= 94);
  assert.ok(incident.coords.y >= 8 && incident.coords.y <= 92);
});

test('coordinate placement is deterministic per address', () => {
  assert.deepEqual(coordsForLocation('4th St', 'INC-1'), coordsForLocation('4th St', 'INC-1'));
});

test('demo incidents match the pre-populated spec data', () => {
  const [medical, resource, general] = buildDemoIncidents(1_700_000_000_000);

  assert.equal(medical.id, 'INC-4125');
  assert.match(medical.message, /oxygen generator immediately/);
  assert.equal(medical.pin, PIN.RED);
  assert.equal(medical.category, CATEGORY.MEDICAL);
  assert.ok(medical.urgency >= 90);

  assert.equal(resource.pin, PIN.YELLOW);
  assert.equal(resource.category, CATEGORY.RESOURCE);
  assert.ok(resource.urgency >= 60 && resource.urgency <= 80);

  assert.equal(general.pin, PIN.GREEN);
  assert.equal(general.category, CATEGORY.GENERAL);
  assert.ok(general.urgency < 50);
});

test('header metrics derive from the incident list', () => {
  const incidents = buildDemoIncidents();
  assert.equal(incidents.length, 3);
  assert.equal(criticalTriageRate(incidents), 100);
  assert.ok(medianTriageMs(incidents) > 0);
  assert.equal(criticalTriageRate([]), 100);
});

test('guardrail verifies a well-formed alert and flags an unusable one', () => {
  const incidents = buildDemoIncidents();
  const good = runGuardrail(incidents[0], incidents);
  assert.equal(good.verdict, 'VERIFIED');
  assert.ok(good.score >= 70);
  assert.ok(good.checks.length > 0);

  const broken = createIncident('help', '', { id: 'INC-BAD' });
  const flagged = runGuardrail(broken, [...incidents, broken]);
  assert.equal(flagged.verdict, 'FLAGGED');
  assert.ok(flagged.checks.some((check) => !check.pass));
});

test('guardrail flags near-duplicate alerts', () => {
  const first = createIncident(
    'Shelter at Central High running out of bottled water and baby formula.',
    'Central High',
    { id: 'INC-1' },
  );
  const dupe = createIncident(
    'Shelter at Central High is running out of bottled water and baby formula.',
    'Central High',
    { id: 'INC-2' },
  );
  const result = runGuardrail(dupe, [first, dupe]);
  assert.equal(result.verdict, 'FLAGGED');
});

test('auto-match picks a category-appropriate volunteer and never double-books', () => {
  const incidents = buildDemoIncidents();
  const medical = incidents[0];
  const first = matchVolunteer(medical, []);
  assert.ok(first.skills.includes(medical.category));
  assert.ok(first.etaMinutes >= 4);

  const second = matchVolunteer(medical, [first.id]);
  assert.notEqual(second.id, first.id);

  const general = matchVolunteer(incidents[2], []);
  assert.equal(general.skills.includes(CATEGORY.GENERAL), true);
});

test('every responder carries a CERT unit call-sign', () => {
  for (const volunteer of VOLUNTEER_POOL) {
    assert.match(volunteer.certUnit, /^CERT Unit #\d+$/);
  }
});

test('dispatching the demo medical alert yields the CERT Unit #4 badge at ETA 4 min', () => {
  const incident = { ...buildDemoIncidents()[0] };
  const volunteer = matchVolunteer(incident, []);
  const dispatched = { ...incident, volunteer, status: STATUS.DISPATCHED };

  assert.equal(volunteer.certUnit, 'CERT Unit #4');
  assert.equal(volunteer.etaMinutes, 4);
  assert.equal(statusLabel(dispatched), 'DISPATCHED (CERT Unit #4 - ETA 4 min)');
});

test('status badge falls back to the raw status before dispatch', () => {
  const incident = buildDemoIncidents()[1];
  assert.equal(statusLabel(incident), STATUS.PENDING);
});

test('SMS auto-reply confirms the triage status of the alert', () => {
  const incident = buildDemoIncidents()[0];
  const reply = buildSmsReply(incident);

  assert.match(reply, /RESILEO EOC/);
  assert.match(reply, new RegExp(incident.id));
  assert.match(reply, /Medical Emergency/);
  assert.match(reply, /93\/100/);
  assert.match(reply, /RED band/);
  assert.match(reply, /awaiting AI verification/);

  const dispatched = { ...incident, volunteer: matchVolunteer(incident, []), status: STATUS.DISPATCHED };
  const dispatchReply = buildSmsReply(dispatched);
  assert.match(dispatchReply, /CERT Unit #4 dispatched, ETA 4 min/);
});

test('AI payload exposes extracted entities, coordinates and verification state', () => {
  const incident = buildDemoIncidents()[0];
  const payload = buildAiPayload(incident);

  assert.equal(payload.event_id, incident.id);
  assert.equal(payload.pipeline, PIPELINE_ID);
  assert.equal(payload.extracted_entities.category, CATEGORY.MEDICAL);
  assert.equal(payload.extracted_entities.urgency_score, incident.urgency);
  assert.equal(payload.extracted_entities.urgency_band, 'RED');
  assert.equal(typeof payload.extracted_entities.geocoded.lat, 'number');
  assert.equal(typeof payload.extracted_entities.geocoded.lng, 'number');
  assert.match(payload.extracted_entities.geocoded.grid_cell, /^GRID-7\.\d\d$/);
  assert.equal(payload.extracted_entities.confidence_score, Number((incident.confidence / 100).toFixed(2)));
  assert.equal(payload.verification.status, 'PENDING');
  assert.equal(payload.dispatch, null);

  const verified = { ...incident, verification: runGuardrail(incident, [incident]), status: STATUS.VERIFIED };
  const verifiedPayload = buildAiPayload(verified);
  assert.equal(verifiedPayload.verification.status, 'VERIFIED');
  assert.equal(verifiedPayload.verification.checks_passed, 4);
  assert.equal(verifiedPayload.verification.checks_total, 4);

  const dispatched = { ...verified, volunteer: matchVolunteer(verified, []), status: STATUS.DISPATCHED };
  const dispatchedPayload = buildAiPayload(dispatched);
  assert.equal(dispatchedPayload.dispatch.status, 'DISPATCHED');
  assert.equal(dispatchedPayload.dispatch.unit, 'CERT Unit #4');
  assert.equal(dispatchedPayload.dispatch.eta_minutes, 4);
  assert.equal(dispatchedPayload.status, 'DISPATCHED (CERT Unit #4 - ETA 4 min)');
});

test('serialized payload is valid, pretty-printed JSON', () => {
  const json = serializeAiPayload(buildDemoIncidents()[2]);
  assert.ok(json.includes('\n  "event_id"'));
  const parsed = JSON.parse(json);
  assert.equal(parsed.extracted_entities.urgency_band, 'GREEN');
});

test('geo helpers are deterministic and stay inside the region bounds', () => {
  const coords = buildDemoIncidents()[0].coords;
  assert.deepEqual(toCoordinates(coords), toCoordinates(coords));
  const { lat, lng } = toCoordinates(coords);
  assert.ok(lat > 37.7 && lat < 37.85);
  assert.ok(lng > -122.5 && lng < -122.35);
  assert.equal(gridCellFor({ x: 0, y: 0 }), 'GRID-7.11');
  assert.equal(gridCellFor({ x: 100, y: 100 }), 'GRID-7.88');
});

test('live stream + SMS simulator content always triages cleanly', () => {
  assert.equal(LIVE_STREAM_ALERTS.length, 10);

  const bands = new Set();
  for (const template of LIVE_STREAM_ALERTS) {
    const incident = createIncident(template.message, template.location, { source: template.source });
    assert.ok(template.location.length > 0);
    assert.ok(incident.category, template.message);
    assert.ok(incident.urgency >= 18 && incident.urgency <= 99, `${template.message} -> ${incident.urgency}`);
    bands.add(incident.pin);
  }
  // The stream should exercise all three pin colours.
  assert.deepEqual([...bands].sort(), [PIN.GREEN, PIN.RED, PIN.YELLOW]);

  for (const preset of SMS_PRESETS) {
    const incident = createIncident(preset.text, preset.location, { source: 'SMS / Twilio' });
    assert.ok(incident.category, preset.label);
    assert.ok(buildSmsReply(incident).includes(incident.id));
  }
});
