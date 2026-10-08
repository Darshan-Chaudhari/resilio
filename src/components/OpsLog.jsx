import { ScrollText } from 'lucide-react';
import { Panel } from './Primitives.jsx';
import { formatClock } from '../lib/ui.js';

const KIND_DOT = {
  intake: 'bg-rose-500',
  verify: 'bg-slate-500',
  flag: 'bg-amber-500',
  match: 'bg-emerald-500',
  system: 'bg-slate-600',
};

export function OpsLog({ events }) {
  return (
    <Panel
      icon={ScrollText}
      title="Ops Activity Log"
      subtitle="Immutable dispatch trail"
      actions={
        <span className="tnum inline-flex items-center gap-1.5 rounded border border-slate-800 bg-black/30 px-2 py-1 font-mono text-[10px] tracking-wide text-slate-400 uppercase">
          {events.length} events
        </span>
      }
    >
      <ul className="scroll-slim flex max-h-[280px] flex-col divide-y divide-slate-800/60 overflow-y-auto">
        {events.map((event) => (
          <li key={event.id} className="flex items-start gap-2.5 py-1.5">
            <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${KIND_DOT[event.kind] ?? KIND_DOT.system}`} />
            <p className="text-[11.5px] leading-snug text-slate-400">
              <span className="tnum mr-1.5 font-mono text-[10px] text-slate-600">
                {formatClock(event.at)}
              </span>
              {event.text}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
