import { Users } from 'lucide-react';
import { Panel } from './Primitives.jsx';
import { STATUS } from '../lib/triage.js';
import { VOLUNTEER_POOL } from '../lib/ops.js';

export function VolunteerRoster({ incidents }) {
  const assignments = new Map();
  incidents.forEach((incident) => {
    if (incident.status === STATUS.DISPATCHED && incident.volunteer) {
      assignments.set(incident.volunteer.id, incident);
    }
  });

  const enRoute = assignments.size;

  return (
    <Panel
      icon={Users}
      title="Volunteer Roster"
      subtitle="Skill-based routing pool"
      actions={
        <span className="tnum inline-flex items-center gap-1.5 rounded border border-slate-800 bg-black/30 px-2 py-1 font-mono text-[10px] tracking-wide text-slate-400 uppercase">
          {enRoute} en route · {VOLUNTEER_POOL.length - enRoute} staged
        </span>
      }
    >
      <ul className="scroll-slim flex max-h-[240px] flex-col divide-y divide-slate-800/60 overflow-y-auto">
        {VOLUNTEER_POOL.map((volunteer) => {
          const incident = assignments.get(volunteer.id);
          return (
            <li key={volunteer.id} className="flex items-center gap-2.5 py-2">
              <span
                className={`grid size-6 shrink-0 place-items-center rounded border font-mono text-[9px] tracking-wide ${
                  incident
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                    : 'border-slate-800 bg-black/30 text-slate-400'
                }`}
              >
                {volunteer.name
                  .split(' ')
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] text-slate-200">{volunteer.name}</span>
                <span className="block truncate font-mono text-[10px] tracking-wide text-slate-500">
                  {volunteer.role}
                </span>
              </span>
              <span className="ml-auto shrink-0 text-right">
                {incident ? (
                  <>
                    <span className="tnum block text-[11px] text-emerald-300">
                      ETA {incident.volunteer.etaMinutes}m
                    </span>
                    <span className="tnum block font-mono text-[10px] text-slate-500">
                      {incident.id}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="block font-mono text-[10px] tracking-wide text-slate-500 uppercase">
                      Staged
                    </span>
                    <span className="tnum block font-mono text-[10px] text-slate-600">
                      {volunteer.distanceKm} km
                    </span>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
