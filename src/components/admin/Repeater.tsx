'use client';

/**
 * Generic add/remove list used by every repeatable section (services,
 * packages, testimonials, gallery, videos, social links).
 */
export default function Repeater<T>({
  items,
  onChange,
  blank,
  addLabel,
  render,
  emptyHint,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  blank: () => T;
  addLabel: string;
  emptyHint?: string;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
}) {
  const update = (i: number) => (patch: Partial<T>) => {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {items.length === 0 && emptyHint && (
        <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">
          {emptyHint}
        </p>
      )}

      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              #{i + 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="rounded px-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                className="rounded px-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="rounded px-1.5 text-rose-400 hover:bg-rose-50"
                aria-label="Remove"
              >
                ×
              </button>
            </div>
          </div>
          <div className="space-y-2">{render(item, update(i), i)}</div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...items, blank()])}
        className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
      >
        + {addLabel}
      </button>
    </div>
  );
}
