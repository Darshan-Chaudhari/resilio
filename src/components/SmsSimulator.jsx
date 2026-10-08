import { useEffect, useRef, useState } from 'react';
import {
  LoaderCircle,
  MessageSquareMore,
  Send,
  Server,
  Smartphone,
  X,
} from 'lucide-react';
import { CategoryChip, LiveDot, Panel } from './Primitives.jsx';
import { PIN_THEME, formatClock } from '../lib/ui.js';
import { SMS_BRIDGE, SMS_PRESETS } from '../lib/ops.js';

const FIELD =
  'w-full rounded-md border border-slate-800 bg-black/40 text-slate-100 placeholder:text-slate-600 focus:border-slate-600 focus:ring-1 focus:ring-slate-600/40 focus:outline-none';

function Bubble({ entry }) {
  const inbound = entry.direction === 'inbound';
  const theme = entry.incident ? PIN_THEME[entry.incident.pin] : null;

  return (
    <div className={`flex flex-col ${inbound ? 'items-start' : 'items-end'}`}>
      <p className="mb-1 font-mono text-[10px] tracking-wide text-slate-500 uppercase">
        {inbound ? `Inbound · ${SMS_BRIDGE.number}` : `${SMS_BRIDGE.provider} auto-reply · EOC`}
        <span className="tnum ml-1.5 text-slate-600">{formatClock(entry.at)}</span>
      </p>
      <div
        className={`max-w-[92%] rounded-md border px-3 py-2 text-[12px] leading-snug ${
          inbound
            ? 'border-slate-800 bg-black/40 text-slate-200'
            : 'border-slate-700 bg-[#1c2029] text-slate-200'
        }`}
      >
        {entry.text}
      </div>
      {entry.incident && theme && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <CategoryChip category={entry.incident.category} />
          <span
            className={`tnum rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wide ${theme.chip}`}
          >
            U {entry.incident.urgency}
          </span>
          <span className="tnum font-mono text-[10px] text-slate-500">{entry.incident.id}</span>
        </div>
      )}
    </div>
  );
}

export function SmsSimulator({ onSend }) {
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState([]);
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const threadRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [thread]);

  const deliver = async (event) => {
    event.preventDefault();
    if (message.trim().length === 0) {
      setError('Type the inbound SMS body first.');
      return;
    }

    const body = message.trim();
    const address = location.trim();
    setError('');
    setMessage('');
    setLocation('');
    setSending(true);
    setThread((prev) => [
      ...prev,
      { id: `${Date.now()}-in`, direction: 'inbound', text: body, at: Date.now() },
    ]);

    const { incident, reply } = await onSend({ message: body, location: address });

    setThread((prev) => [
      ...prev,
      {
        id: `${Date.now()}-out`,
        direction: 'outbound',
        text: reply,
        at: Date.now(),
        incident,
      },
    ]);
    setSending(false);
  };

  const inboundCount = thread.filter((entry) => entry.direction === 'inbound').length;

  return (
    <>
      <Panel
        icon={Smartphone}
        title="SMS Intake Bridge"
        subtitle={`${SMS_BRIDGE.provider} webhook · ${SMS_BRIDGE.number}`}
        className="w-full self-start"
        actions={
          <span className="hidden items-center gap-1.5 rounded border border-slate-800 bg-black/30 px-2 py-1 font-mono text-[10px] tracking-wide text-slate-400 uppercase sm:inline-flex">
            <LiveDot />
            webhook listening
          </span>
        }
        bodyClassName="flex flex-wrap items-center gap-2"
      >
        <span className="tnum inline-flex items-center gap-1.5 rounded border border-slate-800 bg-black/30 px-2 py-1 font-mono text-[10px] tracking-wide text-slate-400">
          <Server className="size-3 text-slate-500" />
          {SMS_BRIDGE.route}
        </span>
        {inboundCount > 0 && (
          <span className="tnum inline-flex items-center gap-1.5 rounded border border-slate-800 bg-black/30 px-2 py-1 font-mono text-[10px] tracking-wide text-slate-400">
            <MessageSquareMore className="size-3 text-slate-500" />
            {inboundCount} inbound this session
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ml-auto inline-flex items-center gap-2 rounded-md bg-slate-200 px-3 py-2 font-mono text-[11px] tracking-wide text-slate-900 uppercase transition hover:bg-white"
        >
          <MessageSquareMore className="size-3.5" />
          Simulate Incoming SMS
        </button>
      </Panel>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Simulate incoming SMS"
            onClick={(event) => event.stopPropagation()}
            className="animate-fade flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-lg border border-slate-800 bg-[#151821] sm:rounded-lg"
          >
            <header className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
              <span className="grid size-8 place-items-center rounded border border-slate-800 bg-black/30 text-slate-400">
                <Smartphone className="size-3.5" />
              </span>
              <div className="min-w-0">
                <h2 className="font-mono text-xs tracking-wider text-slate-300 uppercase">
                  Simulate Incoming SMS
                </h2>
                <p className="tnum mt-0.5 truncate font-mono text-[10px] tracking-wide text-slate-500">
                  {SMS_BRIDGE.provider} · {SMS_BRIDGE.number} · {SMS_BRIDGE.route}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close SMS simulator"
                className="ml-auto grid size-7 shrink-0 place-items-center rounded border border-slate-800 bg-black/30 text-slate-400 transition hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            </header>

            <div
              ref={threadRef}
              className="scroll-slim flex min-h-[160px] flex-col gap-3 overflow-y-auto px-4 py-3"
            >
              {thread.length === 0 ? (
                <p className="m-auto max-w-xs text-center text-[11.5px] text-slate-500">
                  No inbound messages in this session. Deliver an SMS below and Resileo will triage
                  it and text the sender back automatically.
                </p>
              ) : (
                thread.map((entry) => <Bubble key={entry.id} entry={entry} />)
              )}
              {sending && (
                <p className="inline-flex items-center gap-2 font-mono text-[10px] tracking-wide text-slate-500 uppercase">
                  <LoaderCircle className="size-3.5 animate-spin text-slate-400" />
                  Routing through {SMS_BRIDGE.provider} webhook…
                </p>
              )}
            </div>

            <form onSubmit={deliver} className="border-t border-slate-800 p-3">
              <div className="flex flex-wrap gap-1.5">
                {SMS_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setMessage(preset.text);
                      setLocation(preset.location);
                    }}
                    className="rounded border border-slate-800 bg-black/30 px-2.5 py-1 font-mono text-[10px] tracking-wide text-slate-400 uppercase transition hover:border-slate-700 hover:text-slate-100"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)]">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={3}
                  maxLength={320}
                  placeholder="SMS body from the civil network…"
                  className={`resize-none px-3 py-2 text-[13px] ${FIELD}`}
                />
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Address (optional)"
                  className={`h-11 px-3 text-[13px] sm:h-full ${FIELD}`}
                />
              </div>

              {error && <p className="mt-2 font-mono text-[10px] tracking-wide text-rose-300 uppercase">{error}</p>}

              <button
                type="submit"
                disabled={sending}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-200 px-4 py-2.5 font-mono text-[11px] tracking-wide text-slate-900 uppercase transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
              >
                {sending ? (
                  <>
                    <LoaderCircle className="size-3.5 animate-spin" />
                    Delivering…
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" />
                    Deliver SMS to Resileo EOC
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
