import { useEffect, useState } from 'react';
import { Activity, Clock3, Radar, RotateCcw, Rss, ShieldCheck, Square } from 'lucide-react';
import { MetricCard } from './MetricCard.jsx';
import { LiveDot } from './Primitives.jsx';
import { formatLatency } from '../lib/ui.js';

const CHIP =
  'inline-flex items-center gap-1.5 rounded border border-slate-800 bg-[#151821] px-2 py-1 font-mono text-[10px] tracking-wide text-slate-400 uppercase';

export function Header({ metrics, streaming, onToggleStream, onReset }) {
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  );

  // Local to the header so the live clock doesn't repaint the whole dashboard.
  useEffect(() => {
    const timer = setInterval(
      () =>
        setClock(
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        ),
      1000,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="relative z-30 border-b border-slate-800 bg-[#0C0E12] lg:sticky lg:top-0">
      <div className="mx-auto max-w-[1700px] px-4 pt-3 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-md border border-slate-800 bg-[#151821] text-slate-300">
              <Radar className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg leading-none font-light tracking-tight text-slate-100">
                  Resileo
                </h1>
                <span className={CHIP}>
                  <LiveDot />
                  Live Triage Network
                </span>
                {streaming && (
                  <span className="inline-flex items-center gap-1.5 rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 font-mono text-[10px] tracking-wide text-rose-300 uppercase">
                    <LiveDot className="bg-rose-500" />
                    Disaster Stream · 6s
                  </span>
                )}
              </div>
              <p className="mt-1 truncate font-mono text-[10px] tracking-wider text-slate-500 uppercase">
                AI Emergency Resource Router · Metro West response grid
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleStream}
              aria-pressed={streaming}
              className={`inline-flex items-center gap-2 rounded border px-2.5 py-1.5 font-mono text-[10px] tracking-wide uppercase transition ${
                streaming
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                  : 'border-slate-800 bg-[#151821] text-slate-300 hover:bg-[#1c2029]'
              }`}
            >
              {streaming ? <Square className="size-3" /> : <Rss className="size-3" />}
              {streaming ? 'Stop Live Disaster Stream' : 'Simulate Live Disaster Stream'}
            </button>
            <button
              type="button"
              onClick={onReset}
              title="Clear the feed and restore the 3 seed incidents"
              className="inline-flex items-center gap-2 rounded border border-slate-700 bg-[#151821] px-2.5 py-1.5 font-mono text-[10px] tracking-wide text-slate-200 uppercase transition hover:bg-[#1c2029] hover:text-white"
            >
              <RotateCcw className="size-3" />
              Reset State
            </button>
            <span className={CHIP}>
              <ShieldCheck className="size-3 text-slate-500" />
              Guardrail v4.2 · online
            </span>
            <span className={CHIP}>
              <Activity className="size-3 text-slate-500" />
              Nodes {metrics.nodesOnline}/{metrics.nodesTotal}
            </span>
            <span className={`${CHIP} tnum`}>
              <Clock3 className="size-3 text-slate-500" />
              {clock}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-800 pt-4 sm:grid-cols-3">
          <MetricCard
            accent="rose"
            label="Total Incidents"
            value={metrics.total}
            sub={`${metrics.critical} critical · ${metrics.dispatched} dispatched · ${metrics.pending} awaiting verification`}
          />
          <MetricCard
            accent="amber"
            label="Critical Triage Rate"
            value={metrics.triageRate}
            suffix="%"
            sub={`< 30 sec target · median ${formatLatency(metrics.medianLatency)} on-device`}
          />
          <MetricCard
            accent="emerald"
            label="Volunteers Matched"
            value={metrics.matchedVolunteers}
            suffix={` / ${metrics.poolSize}`}
            sub={`Triage status · 100% automated · ${metrics.poolSize - metrics.matchedVolunteers} staged`}
          />
        </div>
      </div>
    </header>
  );
}
