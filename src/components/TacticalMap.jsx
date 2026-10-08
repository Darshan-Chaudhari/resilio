import { Compass, Crosshair, Map as MapIcon, Navigation, Users } from 'lucide-react';
import { Panel } from './Primitives.jsx';
import { PIN_HEX, PIN_SOLID, categoryTag } from '../lib/ui.js';
import { toLatLng } from '../lib/geo.js';
import { PIN, STATUS } from '../lib/triage.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const LEGEND = [
  { pin: PIN.RED, label: 'High · critical' },
  { pin: PIN.YELLOW, label: 'Medium · supply' },
  { pin: PIN.GREEN, label: 'Low · matched / info' },
];

function volunteerMarkerFor(incident) {
  return {
    x: clamp(incident.coords.x + (incident.coords.x > 55 ? -16 : 16), 6, 94),
    y: clamp(incident.coords.y - 13, 8, 92),
  };
}

function DistrictLayer() {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 size-full"
      aria-hidden="true"
    >
      {/* districts */}
      {[
        { x: 6, y: 8, w: 30, h: 26 },
        { x: 40, y: 6, w: 26, h: 24 },
        { x: 70, y: 10, w: 24, h: 30 },
        { x: 8, y: 42, w: 26, h: 20 },
        { x: 38, y: 36, w: 30, h: 24 },
        { x: 72, y: 46, w: 22, h: 24 },
        { x: 10, y: 70, w: 34, h: 22 },
        { x: 50, y: 68, w: 22, h: 24 },
        { x: 76, y: 76, w: 18, h: 18 },
      ].map((block) => (
        <rect
          key={`${block.x}-${block.y}`}
          x={block.x}
          y={block.y}
          width={block.w}
          height={block.h}
          rx="1.2"
          fill="rgba(148,163,184,0.03)"
          stroke="rgba(148,163,184,0.1)"
          strokeWidth="0.35"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {/* roads */}
      {[20, 38, 55, 72, 88].map((x) => (
        <line
          key={`v${x}`}
          x1={x}
          y1="0"
          x2={x}
          y2="100"
          stroke="rgba(148,163,184,0.09)"
          strokeWidth="0.6"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {[22, 44, 64, 82].map((y) => (
        <line
          key={`h${y}`}
          x1="0"
          y1={y}
          x2="100"
          y2={y}
          stroke="rgba(148,163,184,0.09)"
          strokeWidth="0.6"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {/* river + transit corridor */}
      <path
        d="M -2 60 C 18 54, 32 70, 52 65 C 72 60, 84 74, 102 67"
        fill="none"
        stroke="rgba(100,116,139,0.45)"
        strokeWidth="2.6"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M 2 96 L 22 62 L 48 40 L 70 26 L 98 12"
        fill="none"
        stroke="rgba(148,163,184,0.16)"
        strokeWidth="1.2"
        strokeDasharray="2 2"
        vectorEffect="non-scaling-stroke"
      />

      {/* district labels */}
      <g
        fill="#94a3b8"
        fontSize="2.6"
        fontWeight="500"
        letterSpacing="0.35"
        textAnchor="middle"
      >
        <text x="21" y="22">HARBOR</text>
        <text x="53" y="19">CENTRAL HIGH</text>
        <text x="82" y="26">NORTH RIDGE</text>
        <text x="21" y="54">4TH ST</text>
        <text x="53" y="49">CIVIC CORE</text>
        <text x="83" y="59">MILLWORKS</text>
        <text x="27" y="83">DOWNTOWN DIST.</text>
        <text x="61" y="82">RIVERSIDE</text>
      </g>
    </svg>
  );
}

/**
 * High-contrast marker: an opaque priority dot plus a solid badge carrying the
 * sequence number and category. Both read as blocks of priority colour with
 * white text/rims so they hold up on the dark survey grid and on video.
 * Selection swaps the rim for a glowing cyan outline (see PIN selection rule).
 */
function IncidentPin({ incident, number, selected, onSelect }) {
  const tag = categoryTag(incident.category);
  const solid = PIN_SOLID[incident.pin];
  const flip = incident.coords.x > 62;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelect(incident.id);
      }}
      aria-pressed={selected}
      aria-label={`${incident.id} · ${incident.category} · urgency ${incident.urgency} · ${incident.location}`}
      style={{ left: `${incident.coords.x}%`, top: `${incident.coords.y}%` }}
      className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 focus:outline-none"
    >
      <span className="relative block size-2.5">
        {selected && (
          <span className="absolute -inset-1.5 rounded-full border-2 border-cyan-500/70 shadow-[0_0_14px_rgba(6,182,212,0.6)]" />
        )}
        <span
          className={`absolute inset-0 rounded-full border ${solid} ${
            selected
              ? 'border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.75)]'
              : 'border-white/70'
          }`}
        />
        <span
          className={`pointer-events-none absolute top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded border px-1.5 py-[3px] font-mono text-[9px] leading-none tracking-wide whitespace-nowrap text-white uppercase transition [text-shadow:0_1px_2px_rgba(0,0,0,0.55)] ${
            flip ? 'right-full mr-2' : 'left-full ml-2'
          } ${solid} ${
            selected
              ? 'border-cyan-400 ring-1 ring-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.6)]'
              : 'border-white/60 shadow-[0_1px_6px_rgba(0,0,0,0.65)] group-hover:border-white'
          }`}
        >
          <span className="tnum font-semibold">{number}</span>
          <span className="opacity-90">{tag}</span>
        </span>
      </span>
    </button>
  );
}

/** Static dashed response route — dispatched units read as emerald (matched). */
function DispatchRoute({ incident }) {
  const marker = volunteerMarkerFor(incident);
  const path = `M ${incident.coords.x} ${incident.coords.y} L ${marker.x} ${marker.y}`;

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke="#10b981"
        strokeWidth="0.8"
        strokeDasharray="2.5 2"
        opacity="0.6"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={marker.x} cy={marker.y} r="1" fill="#10b981" opacity="0.9" />
    </g>
  );
}

function VolunteerMarker({ incident }) {
  const marker = volunteerMarkerFor(incident);
  const initials = (incident.volunteer?.name ?? 'VS')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');

  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
      title={`${incident.volunteer?.name} · ${incident.volunteer?.role}`}
    >
      <span className="grid size-5 place-items-center rounded border border-emerald-500/50 bg-emerald-500/15 font-mono text-[8px] tracking-wide text-emerald-200">
        {initials}
      </span>
      <span className="mt-1 block text-center font-mono text-[8px] tracking-wide whitespace-nowrap text-slate-400 uppercase">
        {incident.volunteer?.certUnit?.replace('Unit ', '')} · {incident.volunteer?.etaMinutes}m
      </span>
    </div>
  );
}

export function TacticalMap({ incidents, selectedId, onSelect, onClearSelection }) {
  const selected = incidents.find((incident) => incident.id === selectedId) ?? null;
  const dispatched = incidents.filter(
    (incident) => incident.status === STATUS.DISPATCHED && incident.volunteer,
  );
  const readout = selected ? toLatLng(selected.coords) : null;

  // Stable chronological numbering so a pin keeps its number as new alerts land.
  const numbers = new Map(
    [...incidents]
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((incident, index) => [incident.id, String(index + 1).padStart(2, '0')]),
  );

  return (
    <Panel
      icon={MapIcon}
      title="Dispatcher Map"
      subtitle="Click a pin to open the incident card"
      actions={
        <span className="tnum inline-flex items-center gap-1.5 rounded border border-slate-800 bg-black/30 px-2 py-1 font-mono text-[10px] tracking-wide text-slate-400 uppercase">
          <Crosshair className="size-3" />
          {incidents.length} pins live
        </span>
      }
    >
      <div
        role="presentation"
        onClick={onClearSelection}
        className="relative h-[340px] overflow-hidden rounded-lg border border-slate-800 bg-ink-800 sm:h-[400px] xl:h-[440px]"
      >
        <div className="grid-map absolute inset-0 opacity-70" />

        <DistrictLayer />

        {/* response routes */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 size-full"
          aria-hidden="true"
        >
          {dispatched.map((incident) => (
            <DispatchRoute key={incident.id} incident={incident} />
          ))}
          {selected && (
            <g>
              <line
                x1={selected.coords.x}
                y1="0"
                x2={selected.coords.x}
                y2="100"
                stroke="rgba(6,182,212,0.5)"
                strokeWidth="0.5"
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1="0"
                y1={selected.coords.y}
                x2="100"
                y2={selected.coords.y}
                stroke="rgba(6,182,212,0.5)"
                strokeWidth="0.5"
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}
        </svg>

        {dispatched.map((incident) => (
          <VolunteerMarker key={incident.id} incident={incident} />
        ))}

        {incidents.map((incident) => (
          <IncidentPin
            key={incident.id}
            incident={incident}
            number={numbers.get(incident.id) ?? '--'}
            selected={incident.id === selectedId}
            onSelect={onSelect}
          />
        ))}

        {/* compass */}
        <div className="pointer-events-none absolute top-3 right-3 flex flex-col items-center gap-1 rounded border border-slate-800 bg-[#0C0E12]/80 px-2 py-1.5">
          <Compass className="size-3.5 text-slate-400" />
          <span className="font-mono text-[9px] tracking-widest text-slate-500">N</span>
        </div>

        {/* uplink chip */}
        <div className="pointer-events-none absolute top-3 left-3 inline-flex items-center gap-1.5 rounded border border-slate-800 bg-[#0C0E12]/80 px-2 py-1 font-mono text-[10px] tracking-wide text-slate-400 uppercase">
          <Navigation className="size-3 text-slate-500" />
          Grid 7 · Metro West
        </div>

        {/* readout */}
        <div className="pointer-events-none absolute bottom-3 left-3 rounded border border-slate-800 bg-[#0C0E12]/80 px-2 py-1 font-mono text-[10px] tracking-wide text-slate-400 uppercase">
          {selected && readout ? (
            <span className="tnum">
              Target <span className="text-slate-200">{selected.id}</span> · {readout.lat},{' '}
              {readout.lng}
            </span>
          ) : (
            <span className="tnum">No target selected · scale 1:12,500</span>
          )}
        </div>

        {/* responders en route */}
        <div className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded border border-slate-800 bg-[#0C0E12]/80 px-2 py-1 font-mono text-[10px] tracking-wide text-slate-400 uppercase">
          <Users className="size-3 text-emerald-500" />
          {dispatched.length} en route
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-slate-800 bg-black/30 px-3 py-2.5">
        {LEGEND.map((entry) => (
          <span
            key={entry.pin}
            className="inline-flex items-center gap-2 font-mono text-[10px] tracking-wide text-slate-400 uppercase"
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: PIN_HEX[entry.pin] }} />
            {entry.label}
          </span>
        ))}
      </div>
    </Panel>
  );
}
