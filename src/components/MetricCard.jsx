/**
 * Quiet, compact operational stat: a mono uppercase label paired with a light
 * figure on the same line ("TRIAGE STATUS • 100% AUTOMATED"). The only colour
 * is a single priority dot.
 */
export function MetricCard({ label, value, suffix, sub, accent = 'slate' }) {
  const dot =
    {
      slate: 'bg-slate-500',
      rose: 'bg-rose-500',
      amber: 'bg-amber-500',
      emerald: 'bg-emerald-500',
    }[accent] ?? 'bg-slate-500';

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center gap-2 font-mono text-xs tracking-wider text-slate-400 uppercase">
        <span className={`size-1.5 shrink-0 rounded-full ${dot}`} />
        <span className="truncate">{label}</span>
        <span className="text-slate-700">•</span>
        <span className="flex shrink-0 items-baseline">
          <span className="tnum text-base leading-none font-light text-slate-100">{value}</span>
          {suffix && <span className="text-xs text-slate-400">{suffix}</span>}
        </span>
      </div>
      {sub && (
        <p className="truncate pl-3.5 font-mono text-[10px] tracking-wide text-slate-500">{sub}</p>
      )}
    </div>
  );
}
