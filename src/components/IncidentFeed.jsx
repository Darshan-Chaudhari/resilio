import { ChevronRight, Inbox, MapPin, RadioTower } from 'lucide-react';
import { CategoryChip, Panel, StatusChip } from './Primitives.jsx';
import { PIN_THEME, formatLatency, statusLabel, timeAgo } from '../lib/ui.js';
import { STATUS } from '../lib/triage.js';

function FeedItem({ incident, selected, onSelect, now }) {
  const theme = PIN_THEME[incident.pin];

  return (
    <button
      type="button"
      onClick={() => onSelect(incident.id)}
      aria-pressed={selected}
      className={`group relative flex w-full flex-col gap-1.5 border-l-2 px-3 py-2.5 text-left transition ${theme.line} ${
        selected
          ? 'z-10 bg-cyan-500/[0.07] ring-1 ring-cyan-500 ring-inset shadow-[inset_0_0_22px_rgba(6,182,212,0.14)]'
          : 'bg-transparent hover:bg-[#1c2029]/60'
      } ${incident.isNew ? 'animate-fade' : ''}`}
    >
      <div className="flex items-center gap-2">
        <span className="tnum font-mono text-[11px] tracking-wide text-slate-300">
          {incident.id}
        </span>
        {incident.isNew && (
          <span className="rounded border border-slate-700 px-1 py-px font-mono text-[9px] tracking-widest text-slate-400 uppercase">
            New
          </span>
        )}
        <span className="tnum ml-auto font-mono text-[10px] tracking-wide text-slate-500">
          {timeAgo(incident.createdAt, now)}
        </span>
        <ChevronRight
          className={`size-3.5 shrink-0 transition ${selected ? 'text-cyan-300' : 'text-slate-600 group-hover:text-slate-400'}`}
        />
      </div>

      <p className="line-clamp-2 text-[13px] leading-snug font-light text-slate-200">
        {incident.message}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <CategoryChip category={incident.category} />
        <span
          className={`tnum inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wide ${theme.chip}`}
        >
          U {incident.urgency}
        </span>
        <StatusChip status={incident.status} label={statusLabel(incident)} />
        <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] tracking-wide text-slate-500">
          <MapPin className="size-3" />
          <span className="max-w-[9rem] truncate">{incident.location}</span>
        </span>
      </div>

      <p className="tnum font-mono text-[10px] tracking-wide text-slate-500">
        {incident.source} · triaged in {formatLatency(incident.triageMs)} · confidence{' '}
        {incident.confidence}%
      </p>
    </button>
  );
}

export function IncidentFeed({ incidents, selectedId, onSelect, now }) {
  const ordered = [...incidents].sort((a, b) => b.createdAt - a.createdAt);
  const openCount = incidents.filter((incident) => incident.status !== STATUS.DISPATCHED).length;

  return (
    <Panel
      icon={RadioTower}
      title="Incoming Requests"
      subtitle="Live civil & dispatcher feed"
      className="w-full self-start"
      actions={
        <span className="tnum inline-flex items-center gap-1.5 rounded border border-slate-800 bg-black/30 px-2 py-1 font-mono text-[10px] tracking-wide text-slate-400 uppercase">
          {openCount} open · {incidents.length} total
        </span>
      }
      bodyClassName="flex flex-col px-0"
    >
      {ordered.length === 0 ? (
        <div className="grid flex-1 place-items-center gap-2 py-10 text-center">
          <Inbox className="size-6 text-slate-600" />
          <p className="font-mono text-[11px] tracking-wide text-slate-500 uppercase">
            No alerts in the queue
          </p>
        </div>
      ) : (
        <div className="scroll-slim flex max-h-[min(62vh,640px)] flex-col divide-y divide-slate-800/70 overflow-y-auto">
          {ordered.map((incident) => (
            <FeedItem
              key={incident.id}
              incident={incident}
              selected={incident.id === selectedId}
              onSelect={onSelect}
              now={now}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}
