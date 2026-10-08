import {
  BadgeCheck,
  CheckCheck,
  CircleAlert,
  CircleCheckBig,
  Crosshair,
  Gauge,
  LoaderCircle,
  MapPin,
  Package,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';
import { CategoryChip, LiveDot, MetaCell, Panel, StatusChip } from './Primitives.jsx';
import { PayloadViewer } from './JsonPayload.jsx';
import { PIN_THEME, formatLatency, statusLabel, timeAgo } from '../lib/ui.js';
import { CATEGORY, STATUS } from '../lib/triage.js';
import { GUARDRAIL_STEPS } from '../lib/ops.js';

const SUBPANEL = 'rounded-md border border-slate-800 bg-black/30 p-3';
const PANEL_HEAD =
  'inline-flex items-center gap-2 font-mono text-xs tracking-wider text-slate-400 uppercase';

function ActionButton({ children, className = '', ...rest }) {
  return (
    <button
      type="button"
      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 font-mono text-[11px] tracking-wide uppercase transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-not-allowed ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

function UrgencyMeter({ incident }) {
  const theme = PIN_THEME[incident.pin];
  return (
    <div className="flex items-center gap-2">
      <span className="tnum text-base leading-none font-light text-slate-100">
        {incident.urgency}
      </span>
      <span className="font-mono text-[10px] text-slate-500">/100</span>
      <span className="ml-auto h-1 w-20 overflow-hidden rounded-full bg-slate-800">
        <span
          className={`block h-full rounded-full ${theme.bar}`}
          style={{ width: `${incident.urgency}%` }}
        />
      </span>
    </div>
  );
}

function GuardrailPanel({ incident, verifyState, onVerify }) {
  const running = verifyState?.incidentId === incident.id && verifyState.running;
  const step = running ? verifyState.step : -1;
  const result = incident.verification;

  return (
    <div className={SUBPANEL}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={PANEL_HEAD}>
          <ShieldCheck className="size-3.5 text-slate-500" />
          AI Verification Guardrail
        </h3>
        {result && (
          <span
            className={`tnum rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wide ${
              result.verdict === 'VERIFIED'
                ? 'border-slate-700 bg-slate-800/60 text-slate-200'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
            }`}
          >
            {result.verdict} · {result.score}%
          </span>
        )}
      </div>

      {running && (
        <ul className="mt-3 space-y-1.5">
          {GUARDRAIL_STEPS.map((label, index) => (
            <li key={label} className="flex items-center gap-2 font-mono text-[10.5px]">
              {index < step ? (
                <CircleCheckBig className="size-3.5 shrink-0 text-slate-300" />
              ) : index === step ? (
                <LoaderCircle className="size-3.5 shrink-0 animate-spin text-slate-300" />
              ) : (
                <span className="size-3.5 shrink-0 rounded-full border border-slate-700" />
              )}
              <span className={index <= step ? 'text-slate-300' : 'text-slate-500'}>{label}</span>
            </li>
          ))}
        </ul>
      )}

      {!running && result && (
        <div className="animate-fade mt-3 space-y-2">
          <ul className="space-y-1.5">
            {result.checks.map((check) => (
              <li key={check.label} className="flex items-start gap-2 text-[11px]">
                {check.pass ? (
                  <CheckCheck className="mt-px size-3.5 shrink-0 text-slate-400" />
                ) : (
                  <CircleAlert className="mt-px size-3.5 shrink-0 text-amber-400" />
                )}
                <span className="text-slate-400">
                  <span className="font-medium text-slate-200">{check.label}</span> — {check.detail}
                </span>
              </li>
            ))}
          </ul>
          <p
            className={`rounded border px-2.5 py-2 text-[11px] ${
              result.verdict === 'VERIFIED'
                ? 'border-slate-800 bg-black/30 text-slate-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
            }`}
          >
            {result.recommendation}
          </p>
        </div>
      )}

      {!running && !result && (
        <p className="mt-2 text-[11px] text-slate-500">
          Cross-checks the alert against geo, duplicate and corroboration signals before a
          responder is committed.
        </p>
      )}

      <ActionButton
        onClick={() => onVerify(incident.id)}
        disabled={running}
        className="mt-3 w-full border border-slate-700 bg-[#1c2029] text-slate-200 hover:border-slate-600 hover:text-white"
      >
        {running ? (
          <>
            <LoaderCircle className="size-3.5 animate-spin" />
            Running guardrail…
          </>
        ) : (
          <>
            <ShieldCheck className="size-3.5" />
            {result ? 'Re-run guardrail' : 'Run guardrail'}
          </>
        )}
      </ActionButton>
    </div>
  );
}

function MatchPanel({ incident, onMatch, busy }) {
  const dispatched = incident.status === STATUS.DISPATCHED;

  return (
    <div className={SUBPANEL}>
      <h3 className={PANEL_HEAD}>
        <Users className="size-3.5 text-slate-500" />
        Responder Routing
      </h3>

      {dispatched && incident.volunteer ? (
        <div className="animate-fade mt-3 rounded border border-emerald-500/30 bg-emerald-500/[0.07] p-2.5">
          <p className="tnum mb-2 inline-flex items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-emerald-300 uppercase">
            <LiveDot />
            {statusLabel(incident)}
          </p>
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded border border-emerald-500/40 bg-emerald-500/10 font-mono text-[10px] tracking-wide text-emerald-200">
              {incident.volunteer.name
                .split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('')}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] text-slate-100">{incident.volunteer.name}</p>
              <p className="truncate font-mono text-[10px] tracking-wide text-slate-400 uppercase">
                {incident.volunteer.role}
              </p>
            </div>
            <span className="tnum ml-auto shrink-0 text-right">
              <span className="block text-[12.5px] text-emerald-300">
                {incident.volunteer.etaMinutes} min
              </span>
              <span className="block font-mono text-[10px] text-slate-500">
                {incident.volunteer.distanceKm} km out
              </span>
            </span>
          </div>
          <p className="tnum mt-2 font-mono text-[10px] tracking-wide text-slate-500">
            {incident.volunteer.id} · {incident.volunteer.certUnit} · {incident.volunteer.capacity}{' '}
            available · assigned {timeAgo(incident.volunteer.assignedAt)}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-slate-500">
          {incident.status === STATUS.FLAGGED
            ? 'Guardrail flagged this alert — a human dispatcher should confirm before routing.'
            : 'Routes the nearest volunteer whose skills match the extracted category.'}
        </p>
      )}

      <ActionButton
        onClick={() => onMatch(incident.id)}
        disabled={dispatched || busy}
        className={`mt-3 w-full ${
          dispatched
            ? 'border border-slate-700 bg-[#1c2029] text-slate-400'
            : 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 disabled:border-slate-800 disabled:bg-transparent disabled:text-slate-500'
        }`}
      >
        {dispatched ? (
          <>
            <CircleCheckBig className="size-3.5" />
            {statusLabel(incident)}
          </>
        ) : (
          <>
            <Users className="size-3.5" />
            Auto-match volunteer
          </>
        )}
      </ActionButton>
    </div>
  );
}

function EmptyState({ incidents, onSelect }) {
  const suggestions = [...incidents].sort((a, b) => b.urgency - a.urgency).slice(0, 3);
  return (
    <div className="grid h-full min-h-[280px] place-items-center rounded border border-dashed border-slate-800 bg-black/20 p-6">
      <div className="max-w-sm text-center">
        <span className="mx-auto grid size-9 place-items-center rounded border border-slate-800 bg-black/30 text-slate-500">
          <Crosshair className="size-4" />
        </span>
        <h3 className="mt-3 font-mono text-xs tracking-wider text-slate-400 uppercase">
          No incident selected
        </h3>
        <p className="mt-1 text-[11.5px] text-slate-500">
          Click a pin on the dispatcher map — or pick the highest-urgency alert below — to open its
          AI metadata card.
        </p>
        <div className="mt-3 flex flex-col gap-1.5">
          {suggestions.map((incident) => (
            <button
              key={incident.id}
              type="button"
              onClick={() => onSelect(incident.id)}
              className="flex items-center gap-2 rounded border border-slate-800 bg-black/30 px-2.5 py-1.5 text-left text-[11px] text-slate-400 transition hover:border-slate-700 hover:text-slate-100"
            >
              <span className={`size-1.5 rounded-full ${PIN_THEME[incident.pin].dot}`} />
              <span className="tnum font-mono">{incident.id}</span>
              <span className="truncate">{incident.location}</span>
              <span className="tnum ml-auto font-mono text-slate-300">{incident.urgency}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function IncidentDetails({ incident, incidents, onSelect, onVerify, onMatch, verifyState, now }) {
  const theme = incident ? PIN_THEME[incident.pin] : null;

  return (
    <Panel
      icon={Ticket}
      title="Incident Details"
      subtitle={
        incident
          ? `${incident.id} · received ${timeAgo(incident.createdAt, now)}`
          : 'Dispatcher verification dashboard'
      }
      actions={incident ? <StatusChip status={incident.status} label={statusLabel(incident)} /> : null}
    >
      {!incident ? (
        <EmptyState incidents={incidents} onSelect={onSelect} />
      ) : (
        <div key={incident.id} className="animate-fade space-y-3">
          <div className={`rounded border border-slate-800 border-l-2 bg-black/30 px-3 py-3 ${theme.line}`}>
            <div className="flex flex-wrap items-center gap-2">
              <CategoryChip category={incident.category} />
              <span
                className={`tnum rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wide uppercase ${theme.chip}`}
              >
                {incident.pin} pin
              </span>
              <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] tracking-wider text-slate-500 uppercase">
                <Sparkles className="size-3" />
                AI extracted
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed font-light text-slate-100">
              “{incident.message}”
            </p>
            <p className="mt-2 text-[11px] text-slate-500">{incident.summary}</p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <MetaCell label="Category">{incident.category}</MetaCell>
            <MetaCell label="Urgency Score">
              <UrgencyMeter incident={incident} />
            </MetaCell>
            <MetaCell label="Location" className="sm:col-span-2">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-slate-500" />
                {incident.location}
              </span>
            </MetaCell>
            <MetaCell label="Detected Keywords">
              {incident.keywords.length ? (
                <span className="flex flex-wrap gap-1">
                  {incident.keywords.map((word) => (
                    <span
                      key={word}
                      className="rounded border border-slate-700 bg-slate-800/40 px-1.5 py-px font-mono text-[10px] tracking-wide text-slate-300"
                    >
                      {word}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="text-[12px] text-slate-500">No trigger keywords detected</span>
              )}
            </MetaCell>
            <MetaCell label="Confidence">
              <span className="inline-flex items-center gap-2">
                <Gauge className="size-3.5 text-slate-500" />
                <span className="tnum">{incident.confidence}%</span>
              </span>
            </MetaCell>
            <MetaCell label="Signal Path">
              <span className="tnum inline-flex items-center gap-1.5 text-[12px] text-slate-300">
                <Package className="size-3.5 text-slate-500" />
                {incident.source} · triaged {formatLatency(incident.triageMs)}
              </span>
            </MetaCell>
            <MetaCell label="Received">
              <span className="tnum text-[12px] text-slate-300">
                {new Date(incident.createdAt).toLocaleTimeString()} ({timeAgo(incident.createdAt, now)})
              </span>
            </MetaCell>
          </div>

          <GuardrailPanel incident={incident} verifyState={verifyState} onVerify={onVerify} />
          <MatchPanel incident={incident} onMatch={onMatch} busy={verifyState?.running} />
          <PayloadViewer incident={incident} />

          <p className="flex items-start gap-1.5 text-[10px] text-slate-600">
            <BadgeCheck className="mt-px size-3 shrink-0" />
            Triage, verification and matching are simulated client-side for this prototype
            {incident.category === CATEGORY.GENERAL ? ' — low-priority signals are queued, not paged.' : '.'}
          </p>
        </div>
      )}
    </Panel>
  );
}
