import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquareMore } from 'lucide-react';

import { AlertForm } from './components/AlertForm.jsx';
import { Header } from './components/Header.jsx';
import { IncidentDetails } from './components/IncidentDetails.jsx';
import { IncidentFeed } from './components/IncidentFeed.jsx';
import { OpsLog } from './components/OpsLog.jsx';
import { SmsSimulator } from './components/SmsSimulator.jsx';
import { TacticalMap } from './components/TacticalMap.jsx';
import { Toasts } from './components/Toasts.jsx';
import { VolunteerRoster } from './components/VolunteerRoster.jsx';

import {
  PIN,
  STATUS,
  buildDemoIncidents,
  createIncident,
  criticalTriageRate,
  medianTriageMs,
} from './lib/triage.js';
import {
  GUARDRAIL_STEPS,
  LIVE_STREAM_ALERTS,
  SMS_BRIDGE,
  VOLUNTEER_POOL,
  buildSmsReply,
  matchVolunteer,
  runGuardrail,
} from './lib/ops.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const truncate = (text, max = 68) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Live disaster stream cadence and feed cap. */
const STREAM_INTERVAL_MS = 6000;
const MAX_FEED = 60;

function seedEvents() {
  const base = Date.now();
  return [
    {
      id: 'seed-1',
      at: base - 52_000,
      kind: 'system',
      text: `Triage model v4.2 warm · ${VOLUNTEER_POOL.length} responders staged across Grid 7`,
    },
    {
      id: 'seed-2',
      at: base - 34_000,
      kind: 'flag',
      text: 'Power-out cluster detected on 4th St — medical relay pre-warmed',
    },
    {
      id: 'seed-3',
      at: base - 12_000,
      kind: 'intake',
      text: 'INC-4125 received from Civilian App · keywords oxygen, power out',
    },
  ];
}

export default function App() {
  const [incidents, setIncidents] = useState(() => buildDemoIncidents());
  const [selectedId, setSelectedId] = useState('INC-4125');
  const [submitting, setSubmitting] = useState(false);
  const [lastRouted, setLastRouted] = useState(null);
  const [verifyState, setVerifyState] = useState(null);
  const [events, setEvents] = useState(seedEvents);
  const [toasts, setToasts] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const streamCursor = useRef(0);

  // Keeps the relative timestamps ("4m ago") honest without a per-second repaint.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(timer);
  }, []);

  const pushEvent = useCallback((kind, text) => {
    setEvents((prev) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          at: Date.now(),
          kind,
          text,
        },
        ...prev,
      ].slice(0, 40),
    );
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [{ id, ...toast }, ...prev].slice(0, 3));
    setTimeout(() => setToasts((prev) => prev.filter((item) => item.id !== id)), 5400);
  }, []);

  const clearNewFlag = useCallback((id) => {
    setTimeout(() => {
      setIncidents((prev) => prev.map((item) => (item.id === id ? { ...item, isNew: false } : item)));
    }, 6000);
  }, []);

  const handleSubmit = useCallback(
    async ({ message, location }) => {
      setSubmitting(true);
      const startedAt = performance.now();
      // Stands in for the on-device inference call.
      await sleep(620 + Math.random() * 420);
      const latencyMs = Math.max(120, Math.round(performance.now() - startedAt));

      const incident = createIncident(message, location || 'Location not provided', {
        isNew: true,
        triageMs: latencyMs,
      });

      setIncidents((prev) => [incident, ...prev].slice(0, MAX_FEED));
      setSelectedId(incident.id);
      setLastRouted({ incident, latencyMs });
      setSubmitting(false);

      pushEvent('intake', `${incident.id} received · "${truncate(incident.message)}"`);
      if (incident.pin === PIN.RED) {
        pushEvent(
          'flag',
          `${incident.id} escalated to the medical relay queue (urgency ${incident.urgency})`,
        );
      } else if (incident.pin === PIN.YELLOW) {
        pushEvent(
          'system',
          `${incident.id} routed to the logistics desk (urgency ${incident.urgency})`,
        );
      }

      clearNewFlag(incident.id);
    },
    [clearNewFlag, pushEvent],
  );

  /** Twilio webhook simulation: triage the SMS and text the sender back. */
  const submitSms = useCallback(
    async ({ message, location }) => {
      await sleep(560 + Math.random() * 380);

      const incident = createIncident(message, location || 'Location not provided', {
        source: 'SMS / Twilio',
        isNew: true,
      });

      setIncidents((prev) => [incident, ...prev].slice(0, MAX_FEED));
      setSelectedId(incident.id);

      const reply = buildSmsReply(incident);
      pushToast({
        kind: 'sms',
        icon: MessageSquareMore,
        title: 'Received via Twilio Webhook',
        detail: `${incident.id} · ${incident.category} · urgency ${incident.urgency}/100 — auto-reply sent to ${SMS_BRIDGE.number}`,
      });
      pushEvent('intake', `${incident.id} received via ${SMS_BRIDGE.provider} SMS webhook`);
      pushEvent(
        'system',
        `Automated triage reply delivered to ${SMS_BRIDGE.number} · ${incident.category}`,
      );
      clearNewFlag(incident.id);

      return { incident, reply };
    },
    [clearNewFlag, pushEvent, pushToast],
  );

  /** Injects one realistic alert every six seconds while enabled. */
  useEffect(() => {
    if (!streaming) return undefined;

    const inject = () => {
      const template = LIVE_STREAM_ALERTS[streamCursor.current % LIVE_STREAM_ALERTS.length];
      streamCursor.current += 1;

      const incident = createIncident(template.message, template.location, {
        source: template.source,
        isNew: true,
      });

      setIncidents((prev) => [incident, ...prev].slice(0, MAX_FEED));
      pushEvent('intake', `${incident.id} pushed by live disaster stream · ${template.source}`);
      clearNewFlag(incident.id);
    };

    const timer = setInterval(inject, STREAM_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [clearNewFlag, pushEvent, streaming]);

  const toggleStream = useCallback(() => {
    // Side effects stay out of the state updater so they run exactly once.
    const next = !streaming;
    setStreaming(next);
    pushToast(
      next
        ? {
            kind: 'stream',
            title: 'Live disaster stream active',
            detail: 'Injecting one simulated civilian alert every 6 s. Press stop to pause the feed.',
          }
        : {
            kind: 'stream',
            title: 'Live disaster stream paused',
            detail: 'No further alerts will be injected into the queue.',
          },
    );
    pushEvent(
      'system',
      next ? 'Live disaster stream started (6 s interval)' : 'Live disaster stream paused',
    );
  }, [pushEvent, pushToast, streaming]);

  /**
   * Demo reset: drop every submitted/SMS/streamed alert, rebuild the three seed
   * incidents and restore all counters, selections and guardrail state.
   */
  const handleReset = useCallback(() => {
    setStreaming(false);
    streamCursor.current = 0;
    setIncidents(buildDemoIncidents());
    setSelectedId('INC-4125');
    setSubmitting(false);
    setLastRouted(null);
    setVerifyState(null);
    setEvents(seedEvents());
    setToasts([]);
    pushToast({
      kind: 'system',
      title: 'Dashboard reset',
      detail:
        'Feed cleared · INC-4125 / 4126 / 4127 restored · every status back to Awaiting Verification.',
    });
    pushEvent(
      'system',
      'Reset State — queue cleared and re-seeded with INC-4125 / INC-4126 / INC-4127',
    );
  }, [pushEvent, pushToast]);

  const handleVerify = useCallback(
    async (id) => {
      const incident = incidents.find((item) => item.id === id);
      if (!incident) return;

      setVerifyState({ incidentId: id, running: true, step: 0 });

      for (let step = 0; step < GUARDRAIL_STEPS.length; step += 1) {
        setVerifyState({ incidentId: id, running: true, step });
        await sleep(300 + Math.random() * 200);
      }

      const result = runGuardrail(incident, incidents);
      setVerifyState({ incidentId: id, running: false, step: GUARDRAIL_STEPS.length });
      setIncidents((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                verification: result,
                status: result.verdict === 'VERIFIED' ? STATUS.VERIFIED : STATUS.FLAGGED,
              }
            : item,
        ),
      );

      pushEvent(
        result.verdict === 'VERIFIED' ? 'verify' : 'flag',
        `${id} guardrail ${result.verdict} · authenticity score ${result.score}%`,
      );
      pushToast({
        kind: 'verify',
        title: `Guardrail ${result.verdict}`,
        detail: `${id} · authenticity score ${result.score}% · ${result.checks.filter((check) => check.pass).length}/${result.checks.length} checks passed`,
      });
    },
    [incidents, pushEvent, pushToast],
  );

  const handleMatch = useCallback(
    (id) => {
      const incident = incidents.find((item) => item.id === id);
      if (!incident || incident.status === STATUS.DISPATCHED) return;

      const assigned = incidents.map((item) => item.volunteer?.id).filter(Boolean);
      const volunteer = matchVolunteer(incident, assigned);

      setIncidents((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, volunteer, status: STATUS.DISPATCHED } : item,
        ),
      );
      pushEvent(
        'match',
        `${volunteer.certUnit} dispatched to ${id} · ETA ${volunteer.etaMinutes} min`,
      );
      pushToast({
        kind: 'dispatch',
        title: 'Volunteer dispatched',
        detail: `${volunteer.certUnit} (${volunteer.name}) → ${id} · ETA ${volunteer.etaMinutes} min`,
      });
    },
    [incidents, pushEvent, pushToast],
  );

  const metrics = useMemo(
    () => ({
      total: incidents.length,
      critical: incidents.filter((item) => item.pin === PIN.RED).length,
      dispatched: incidents.filter((item) => item.status === STATUS.DISPATCHED).length,
      pending: incidents.filter((item) => item.status === STATUS.PENDING).length,
      triageRate: Math.round(criticalTriageRate(incidents)),
      medianLatency: medianTriageMs(incidents),
      matchedVolunteers: incidents.filter((item) => item.status === STATUS.DISPATCHED).length,
      poolSize: VOLUNTEER_POOL.length,
      nodesOnline: VOLUNTEER_POOL.length + 3,
      nodesTotal: VOLUNTEER_POOL.length + 4,
    }),
    [incidents],
  );

  const selected = incidents.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="min-h-screen bg-[#0C0E12] text-slate-300">
      <Header
        metrics={metrics}
        streaming={streaming}
        onToggleStream={toggleStream}
        onReset={handleReset}
      />

      <main className="mx-auto grid max-w-[1700px] gap-4 px-4 py-4 lg:grid-cols-12">
        {/* LEFT PANEL — civilian & incident feed */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-5 xl:col-span-4">
          <AlertForm onSubmit={handleSubmit} submitting={submitting} lastRouted={lastRouted} />
          <SmsSimulator onSend={submitSms} />
          <IncidentFeed
            incidents={incidents}
            selectedId={selectedId}
            onSelect={setSelectedId}
            now={now}
          />
        </div>

        {/* RIGHT PANEL — dispatcher map & verification dashboard */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-7 xl:col-span-8">
          <TacticalMap
            incidents={incidents}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onClearSelection={() => setSelectedId(null)}
          />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
            <IncidentDetails
              incident={selected}
              incidents={incidents}
              onSelect={setSelectedId}
              onVerify={handleVerify}
              onMatch={handleMatch}
              verifyState={verifyState}
              now={now}
            />
            <div className="flex min-w-0 flex-col gap-4">
              <VolunteerRoster incidents={incidents} />
              <OpsLog events={events} />
            </div>
          </div>
        </div>
      </main>

      <footer className="mx-auto max-w-[1700px] px-4 py-6 font-mono text-[10px] tracking-wider text-slate-600">
        Resileo Operations • Sandbox Environment • ImpactHack 2026
      </footer>

      <Toasts toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
