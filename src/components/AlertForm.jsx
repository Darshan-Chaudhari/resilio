import { useState } from 'react';
import {
  AlertTriangle,
  Cpu,
  LoaderCircle,
  MapPin,
  Send,
  Siren,
  Sparkles,
  CircleCheckBig,
} from 'lucide-react';
import { Panel, CategoryChip } from './Primitives.jsx';
import { PIN_THEME, formatLatency, timeAgo } from '../lib/ui.js';

const SAMPLES = [
  { label: 'Critical medical', text: 'Neighbor collapsed and is not breathing, we need medical help now.' },
  { label: 'Supply request', text: 'Shelter is out of bottled water and blankets for tonight.' },
  { label: 'General enquiry', text: 'Any update on the power restoration timeline for our block?' },
];

const FIELD =
  'w-full rounded-md border border-slate-800 bg-black/40 text-slate-100 placeholder:text-slate-600 focus:border-slate-600 focus:ring-1 focus:ring-slate-600/40 focus:outline-none';

export function AlertForm({ onSubmit, submitting, lastRouted }) {
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');

  const canSubmit = message.trim().length > 0 && !submitting;

  const submit = (event) => {
    event.preventDefault();
    if (!canSubmit) {
      setError('Describe the emergency before submitting.');
      return;
    }
    setError('');
    onSubmit({ message: message.trim(), location: location.trim() });
    setMessage('');
    setLocation('');
  };

  return (
    <Panel
      icon={Siren}
      title="Report an Emergency"
      subtitle="Citizen app & dispatcher console intake"
      actions={
        <span className="hidden items-center gap-1.5 rounded border border-slate-800 bg-black/30 px-2 py-1 font-mono text-[10px] tracking-wide text-slate-400 uppercase sm:inline-flex">
          <Cpu className="size-3" />
          On-device triage
        </span>
      }
    >
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div>
          <label
            htmlFor="alert-message"
            className="mb-1.5 flex items-center justify-between font-mono text-[10px] tracking-wider text-slate-400 uppercase"
          >
            Emergency message
            <span className="tnum font-mono text-[10px] font-normal tracking-wide text-slate-600">
              {message.length}/400
            </span>
          </label>
          <textarea
            id="alert-message"
            value={message}
            maxLength={400}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            placeholder="Describe what is happening, who is affected and what is needed…"
            className={`resize-none px-3 py-2.5 text-sm ${FIELD}`}
          />
        </div>

        <div>
          <label
            htmlFor="alert-location"
            className="mb-1.5 block font-mono text-[10px] tracking-wider text-slate-400 uppercase"
          >
            Address / location
          </label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-slate-600" />
            <input
              id="alert-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="e.g. 4th St & Cypress Ave"
              className={`py-2.5 pr-3 pl-9 text-sm ${FIELD}`}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 font-mono text-[10px] tracking-wider text-slate-500 uppercase">
            <Sparkles className="size-3" />
            Samples
          </span>
          {SAMPLES.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => setMessage(sample.text)}
              className="rounded border border-slate-800 bg-black/30 px-2 py-1 font-mono text-[10px] tracking-wide text-slate-400 uppercase transition hover:border-slate-700 hover:text-slate-100"
            >
              {sample.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="flex items-center gap-1.5 rounded border border-rose-500/30 bg-rose-500/10 px-2.5 py-2 text-xs text-rose-300">
            <AlertTriangle className="size-3.5" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-200 px-4 py-2.5 font-mono text-[11px] tracking-wide text-slate-900 uppercase transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
        >
          {submitting ? (
            <>
              <LoaderCircle className="size-3.5 animate-spin" />
              Triaging alert…
            </>
          ) : (
            <>
              <Send className="size-3.5 transition group-hover:translate-x-0.5" />
              Submit Emergency Alert
            </>
          )}
        </button>
      </form>

      {lastRouted && (
        <div
          className={`animate-fade mt-3 rounded border border-slate-800 border-l-2 bg-black/30 px-3 py-2.5 text-xs ${PIN_THEME[lastRouted.incident.pin].line}`}
        >
          <div className="flex items-center gap-2">
            <CircleCheckBig className={`size-3.5 ${PIN_THEME[lastRouted.incident.pin].text}`} />
            <span className="font-mono text-[11px] tracking-wide text-slate-200 uppercase">
              {lastRouted.incident.id} routed in {formatLatency(lastRouted.latencyMs)}
            </span>
            <span className="tnum ml-auto font-mono text-[10px] text-slate-500">
              {timeAgo(lastRouted.incident.createdAt)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CategoryChip category={lastRouted.incident.category} />
            <span className="font-mono text-[10px] tracking-wide text-slate-400 uppercase">
              Urgency {lastRouted.incident.urgency}/100 · {lastRouted.incident.pin} pin
            </span>
          </div>
        </div>
      )}
    </Panel>
  );
}
