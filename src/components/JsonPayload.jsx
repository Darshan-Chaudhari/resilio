import { useMemo, useState } from 'react';
import { Braces, Check, Copy, Eye, EyeOff } from 'lucide-react';
import { serializeAiPayload } from '../lib/payload.js';

const TOKEN_PATTERN = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g;

/**
 * Minimal JSON highlighting — plain React nodes, no innerHTML. Everything stays
 * on the slate ramp so the block reads as one calm monospaced surface.
 */
function highlightLine(line, lineIndex) {
  const nodes = [];
  let lastIndex = 0;
  let match;

  TOKEN_PATTERN.lastIndex = 0;
  while ((match = TOKEN_PATTERN.exec(line)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(line.slice(lastIndex, match.index));
    }

    const key = `${lineIndex}-${match.index}`;
    if (match[1] && match[2]) {
      nodes.push(
        <span key={key} className="text-slate-100">
          {match[1]}
        </span>,
        match[2],
      );
    } else if (match[1]) {
      nodes.push(
        <span key={key} className="text-slate-400">
          {match[1]}
        </span>,
      );
    } else if (match[3]) {
      nodes.push(
        <span key={key} className="text-slate-500">
          {match[3]}
        </span>,
      );
    } else {
      nodes.push(
        <span key={key} className="text-slate-300">
          {match[4]}
        </span>,
      );
    }

    lastIndex = TOKEN_PATTERN.lastIndex;
  }

  if (lastIndex < line.length) nodes.push(line.slice(lastIndex));
  return nodes;
}

export function PayloadViewer({ incident }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const json = useMemo(() => serializeAiPayload(incident), [incident]);
  const lines = useMemo(() => json.split('\n'), [json]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-w-0 rounded-md border border-slate-800 bg-black/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="inline-flex items-center gap-2 font-mono text-xs tracking-wider text-slate-400 uppercase">
          <Braces className="size-3.5 text-slate-500" />
          Model Output
        </h3>
        <span className="tnum rounded border border-slate-800 bg-black/30 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-slate-500">
          {lines.length} lines
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {open && (
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded border border-slate-800 bg-[#1c2029] px-2 py-1 font-mono text-[10px] tracking-wide text-slate-300 uppercase transition hover:text-white"
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-[#1c2029] px-2.5 py-1 font-mono text-[10px] tracking-wide text-slate-300 uppercase transition hover:border-slate-600 hover:text-white"
          >
            {open ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
            {open ? 'Hide AI Json Payload' : 'View AI Json Payload'}
          </button>
        </div>
      </div>

      {open ? (
        <div className="mt-2.5 min-w-0">
          <p className="mb-1.5 font-mono text-[10px] tracking-wide text-slate-600">
            {incident.id.toLowerCase()}_triage.json
          </p>
          <pre className="scroll-slim max-h-80 overflow-auto rounded border border-slate-800 bg-black/50 p-3 font-mono text-xs leading-relaxed text-slate-300">
            <code>
              {lines.map((line, index) => (
                <div key={index} className="whitespace-pre">
                  {highlightLine(line, index)}
                </div>
              ))}
            </code>
          </pre>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-slate-500">
          Inspect the raw model payload: extracted entities, geocoded coordinates, confidence and
          verification status.
        </p>
      )}
    </div>
  );
}
