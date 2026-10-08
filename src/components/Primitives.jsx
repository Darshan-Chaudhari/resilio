import { HeartPulse, Info, Package } from 'lucide-react';
import { CATEGORY } from '../lib/triage.js';
import { CATEGORY_THEME, STATUS_THEME } from '../lib/ui.js';

/**
 * Flat industrial surface used by every dashboard panel. No blur, no glow, no
 * gradient — a solid #151821 slab with a single hairline border.
 */
export function Panel({ icon: Icon, title, subtitle, actions, children, className = '', bodyClassName = '' }) {
  return (
    <section
      className={`flex min-h-0 min-w-0 flex-col rounded-lg border border-slate-800 bg-[#151821] p-4 ${className}`}
    >
      {(title || actions) && (
        <header className="mb-3 flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon && (
              <span className="grid size-7 shrink-0 place-items-center rounded-md border border-slate-800 bg-black/30 text-slate-400">
                <Icon className="size-3.5" />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="truncate font-mono text-xs tracking-wider text-slate-400 uppercase">
                {title}
              </h2>
              {subtitle && <p className="mt-0.5 truncate text-[11px] text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={`min-h-0 min-w-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function Chip({ className = '', children, ...rest }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wide uppercase ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}

const CATEGORY_ICONS = {
  [CATEGORY.MEDICAL]: HeartPulse,
  [CATEGORY.RESOURCE]: Package,
  [CATEGORY.GENERAL]: Info,
};

export function CategoryChip({ category, className = '' }) {
  const theme = CATEGORY_THEME[category];
  const Icon = CATEGORY_ICONS[category] ?? Info;
  return (
    <Chip className={`${theme.chip} ${className}`}>
      <Icon className="size-3" />
      {category}
    </Chip>
  );
}

export function StatusChip({ status, label, className = '', icon: Icon }) {
  return (
    <Chip className={`${STATUS_THEME[status] ?? ''} ${className}`}>
      {Icon && <Icon className="size-3" />}
      {label ?? status}
    </Chip>
  );
}

/** Key/value row used inside the AI metadata grid. */
export function MetaCell({ label, children, className = '' }) {
  return (
    <div className={`rounded-md border border-slate-800 bg-black/30 px-3 py-2 ${className}`}>
      <p className="font-mono text-[10px] tracking-wider text-slate-500 uppercase">{label}</p>
      <div className="mt-1 text-sm text-slate-200">{children}</div>
    </div>
  );
}

/** Static status dot — deliberately unanimated to keep the surface calm. */
export function LiveDot({ className = 'bg-emerald-500' }) {
  return <span className={`inline-block size-1.5 shrink-0 rounded-full ${className}`} />;
}
