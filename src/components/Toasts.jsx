import { Bell, Info, MessageSquareMore, Rss, ShieldCheck, Users, X } from 'lucide-react';

const KIND_STYLES = {
  sms: { icon: MessageSquareMore, line: 'border-l-slate-600' },
  dispatch: { icon: Users, line: 'border-l-emerald-500' },
  verify: { icon: ShieldCheck, line: 'border-l-slate-600' },
  stream: { icon: Rss, line: 'border-l-rose-500' },
  system: { icon: Info, line: 'border-l-slate-700' },
};

export function Toasts({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-3 bottom-3 z-[80] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const kind = KIND_STYLES[toast.kind] ?? KIND_STYLES.system;
        const Icon = toast.icon ?? kind.icon;
        return (
          <div
            key={toast.id}
            className={`animate-fade pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border border-slate-800 border-l-2 bg-[#151821] px-3 py-2.5 ${kind.line}`}
          >
            <span className="mt-px grid size-7 shrink-0 place-items-center rounded border border-slate-800 bg-black/30 text-slate-400">
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-mono text-[11px] tracking-wide text-slate-200 uppercase">
                {toast.title}
                <Bell className="size-3 text-slate-600" />
              </p>
              {toast.detail && (
                <p className="mt-1 text-[11px] leading-snug text-slate-400">{toast.detail}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="grid size-6 shrink-0 place-items-center rounded text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
