'use client';

import type { CardDesign, RatioId } from '@/lib/design';
import {
  FONTS, BACKGROUNDS, RADII, PANELS, ANIMATIONS,
  SOCIAL_STYLES, BUTTON_STYLES, BUTTON_ANIMATIONS, RATIOS,
} from '@/lib/design';
import { ALL_SECTIONS, SECTION_NAMES, type SectionId, type TemplateDef } from '@/lib/templates';
import { inputClass } from './UploadInput';

type Patch = (p: Partial<CardDesign>) => void;

/* ─────────────────────── small building blocks ────────────────────── */

function Group({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-slate-700">{label}</p>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

/** Segmented control. `value === undefined` means "inherit from template". */
function Choice<T extends string | number | boolean>({
  options,
  value,
  onChange,
  allowInherit = true,
}: {
  options: { id: T; name: string; note?: string }[];
  value: T | undefined;
  onChange: (v: T | undefined) => void;
  allowInherit?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {allowInherit && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
            value === undefined
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          Auto
        </button>
      )}
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          title={o.note}
          onClick={() => onChange(o.id)}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
            value === o.id
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          {o.name}
        </button>
      ))}
    </div>
  );
}

function RatioChoice({
  value,
  onChange,
  only,
}: {
  value: RatioId | undefined;
  onChange: (v: RatioId | undefined) => void;
  only?: RatioId[];
}) {
  const list = only ? RATIOS.filter((r) => only.includes(r.id)) : RATIOS;
  return (
    <Choice
      options={list.map((r) => ({ id: r.id, name: `${r.name} ${r.id}` }))}
      value={value}
      onChange={onChange}
    />
  );
}

/* ───────────────────────────── the panel ──────────────────────────── */

export default function DesignPanel({
  design,
  onChange,
  template,
}: {
  design: CardDesign;
  onChange: (next: CardDesign) => void;
  template: TemplateDef;
}) {
  const set: Patch = (p) => onChange({ ...design, ...p });

  /* Sections: start from the template order, then apply any custom order.
     Any section missing from a saved order (e.g. one added in a later
     release) is appended so it never silently disappears. */
  const order: SectionId[] = (() => {
    const base = design.order?.length ? design.order : template.order;
    const missing = ALL_SECTIONS.filter((s) => !base.includes(s));
    return [...base, ...missing];
  })();
  const hidden = new Set(design.hidden ?? []);

  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    set({ order: next });
  };

  const toggle = (id: SectionId) => {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ hidden: [...next] });
  };

  const bgPreset = design.background ?? 'template';

  return (
    <div className="space-y-5">
      {/* ───────────── Sections ───────────── */}
      <section className="card-panel space-y-3 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
            Sections — order & visibility
          </h2>
          {design.order && (
            <button type="button" onClick={() => set({ order: undefined })}
              className="text-xs font-semibold text-slate-400 hover:text-slate-700">
              Reset order
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400">
          A section with no content stays hidden regardless of this list.
        </p>

        <div className="space-y-1.5">
          {order.map((id, i) => {
            const off = hidden.has(id);
            return (
              <div key={id}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${
                  off ? 'border-slate-100 bg-slate-50 opacity-55' : 'border-slate-200'
                }`}>
                <span className="w-5 text-center text-[11px] font-bold text-slate-300">{i + 1}</span>
                <span className="flex-1 text-sm font-medium text-slate-700">{SECTION_NAMES[id]}</span>
                <button type="button" onClick={() => toggle(id)}
                  title={off ? 'Show this section' : 'Hide this section'}
                  className="rounded px-1.5 text-sm text-slate-400 hover:bg-slate-100">
                  {off ? '🚫' : '👁'}
                </button>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                  className="rounded px-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-25">↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === order.length - 1}
                  className="rounded px-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-25">↓</button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────────── Background ───────────── */}
      <section className="card-panel space-y-3 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Background</h2>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {BACKGROUNDS.map((bg) => (
            <button
              key={bg.id}
              type="button"
              onClick={() => set({ background: bg.id })}
              title={bg.name}
              className={`h-12 rounded-lg border-2 text-[9px] font-bold transition ${
                bgPreset === bg.id ? 'border-slate-900' : 'border-transparent hover:border-slate-300'
              } ${bg.dark ? 'text-white' : 'text-slate-500'}`}
              style={{
                background: bg.css || 'repeating-linear-gradient(45deg,#f1f5f9 0 6px,#e2e8f0 6px 12px)',
              }}
            >
              {bg.id === 'template' ? 'Auto' : bg.id === 'custom' ? 'Custom' : ''}
            </button>
          ))}
        </div>

        {design.background === 'custom' && (
          <Group label="Custom CSS background"
            hint="Any CSS background value — a hex, a gradient, even url(...). e.g. linear-gradient(180deg,#111,#333)">
            <input className={inputClass} value={design.backgroundCustom ?? ''}
              onChange={(e) => set({ backgroundCustom: e.target.value })}
              placeholder="linear-gradient(180deg,#0f172a,#1e293b)" />
          </Group>
        )}
      </section>

      {/* ───────────── Typography ───────────── */}
      <section className="card-panel space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Typography</h2>

        <Group label="Heading font">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {FONTS.map((f) => (
              <button key={f.id} type="button" onClick={() => set({ headingFont: f.id })}
                className={`rounded-lg border px-2.5 py-2 text-left transition ${
                  design.headingFont === f.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                <span className="block text-[13px] font-bold text-slate-800"
                  style={{ fontFamily: `var(${f.varName})` }}>{f.name}</span>
                <span className="block text-[10px] text-slate-400">{f.note}</span>
              </button>
            ))}
          </div>
        </Group>

        <Group label="Body font">
          <Choice options={FONTS.map((f) => ({ id: f.id, name: f.name }))}
            value={design.bodyFont} onChange={(v) => set({ bodyFont: v })} />
        </Group>

        <Group label="Text size">
          <Choice
            options={[{ id: 'sm', name: 'Small' }, { id: 'md', name: 'Normal' }, { id: 'lg', name: 'Large' }] as const}
            value={design.textScale} onChange={(v) => set({ textScale: v })} allowInherit={false} />
        </Group>
      </section>

      {/* ───────────── Shape & motion ───────────── */}
      <section className="card-panel space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Shape & motion</h2>

        <Group label="Corner style">
          <Choice options={RADII} value={design.radius} onChange={(v) => set({ radius: v })} />
        </Group>

        <Group label="Card style">
          <Choice options={PANELS} value={design.panel} onChange={(v) => set({ panel: v })} />
        </Group>

        <Group label="Entrance animation" hint="How each section appears as you scroll in.">
          <Choice options={ANIMATIONS} value={design.animation} onChange={(v) => set({ animation: v })} allowInherit={false} />
        </Group>

        <Group label="Animation speed">
          <Choice options={[{ id: 'slow', name: 'Slow' }, { id: 'normal', name: 'Normal' }, { id: 'fast', name: 'Fast' }] as const}
            value={design.animationSpeed} onChange={(v) => set({ animationSpeed: v })} allowInherit={false} />
        </Group>
      </section>

      {/* ───────────── Buttons & social ───────────── */}
      <section className="card-panel space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Buttons & social icons</h2>

        <Group label="Button style">
          <Choice options={BUTTON_STYLES} value={design.buttonStyle} onChange={(v) => set({ buttonStyle: v })} allowInherit={false} />
        </Group>

        <Group label="Button animation">
          <Choice options={BUTTON_ANIMATIONS} value={design.buttonAnimation} onChange={(v) => set({ buttonAnimation: v })} allowInherit={false} />
        </Group>

        <Group label="Social icon style">
          <Choice options={SOCIAL_STYLES} value={design.socialStyle} onChange={(v) => set({ socialStyle: v })} allowInherit={false} />
        </Group>

        <Group label="Social icon size">
          <Choice options={[{ id: 'sm', name: 'Small' }, { id: 'md', name: 'Medium' }, { id: 'lg', name: 'Large' }] as const}
            value={design.socialSize} onChange={(v) => set({ socialSize: v })} allowInherit={false} />
        </Group>
      </section>

      {/* ───────────── Hero ───────────── */}
      <section className="card-panel space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Cover image</h2>

        <Group label="Shape">
          <Choice
            options={[
              { id: 'rounded', name: 'Rounded' },
              { id: 'arch', name: 'Arch' },
              { id: 'bleed', name: 'Edge to edge' },
              { id: 'circle', name: 'Circle' },
            ] as const}
            value={design.heroShape} onChange={(v) => set({ heroShape: v })} />
        </Group>

        <Group label="Shape ratio">
          <RatioChoice value={design.heroRatio} onChange={(v) => set({ heroRatio: v })} />
        </Group>

        <Group label="Logo position" hint="Overlap tucks the logo card over the cover; banner sits it below.">
          <Choice options={[{ id: 'overlap', name: 'Overlap' }, { id: 'banner', name: 'Below' }] as const}
            value={design.heroStyle} onChange={(v) => set({ heroStyle: v })} />
        </Group>
      </section>

      {/* ───────────── Layout ───────────── */}
      <section className="card-panel space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Layout</h2>

        <Group label="Services — columns">
          <Choice options={[{ id: 1, name: '1 per row' }, { id: 2, name: '2 side by side' }] as const}
            value={design.serviceColumns} onChange={(v) => set({ serviceColumns: v })} allowInherit={false} />
        </Group>
        <Group label="Services — image ratio">
          <RatioChoice value={design.serviceRatio} onChange={(v) => set({ serviceRatio: v })} />
        </Group>

        <hr className="border-slate-100" />

        <Group label="Packages / Menu — columns">
          <Choice options={[{ id: 1, name: '1 per row' }, { id: 2, name: '2 side by side' }] as const}
            value={design.packageColumns} onChange={(v) => set({ packageColumns: v })} allowInherit={false} />
        </Group>
        <Group label="Packages — layout" hint="Row puts the photo beside the text; card puts it on top.">
          <Choice options={[{ id: 'row', name: 'Photo beside' }, { id: 'card', name: 'Photo on top' }] as const}
            value={design.packageLayout} onChange={(v) => set({ packageLayout: v })} allowInherit={false} />
        </Group>
        <Group label="Packages — image ratio">
          <RatioChoice value={design.packageRatio} onChange={(v) => set({ packageRatio: v })} />
        </Group>

        <hr className="border-slate-100" />

        <Group label="Gallery — columns">
          <Choice options={[{ id: 2, name: '2' }, { id: 3, name: '3' }, { id: 4, name: '4' }] as const}
            value={design.galleryColumns} onChange={(v) => set({ galleryColumns: v })} allowInherit={false} />
        </Group>
        <Group label="Gallery — image ratio">
          <RatioChoice value={design.galleryRatio} onChange={(v) => set({ galleryRatio: v })} />
        </Group>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={!!design.galleryAutoplay}
            onChange={(e) => set({ galleryAutoplay: e.target.checked })} />
          Auto-sliding banner instead of a grid
        </label>

        {design.galleryAutoplay && (
          <Group label={`Slide every ${design.gallerySpeed ?? 4}s`}>
            <input type="range" min={2} max={10} step={1} className="w-full"
              value={design.gallerySpeed ?? 4}
              onChange={(e) => set({ gallerySpeed: Number(e.target.value) })} />
          </Group>
        )}
      </section>

      {/* ───────────── Embeds ───────────── */}
      <section className="card-panel space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">
          Videos & Instagram
        </h2>

        <Group label="Layout">
          <Choice options={[{ id: 'carousel', name: 'Swipe carousel' }, { id: 'stack', name: 'Stacked' }] as const}
            value={design.embedLayout} onChange={(v) => set({ embedLayout: v })} allowInherit={false} />
        </Group>

        <Group label="Width in carousel" hint="Full width never crops an embed; narrower shows a peek of the next one.">
          <Choice options={[{ id: 'full', name: 'Full' }, { id: 'wide', name: 'Wide' }, { id: 'medium', name: 'Medium' }] as const}
            value={design.embedWidth} onChange={(v) => set({ embedWidth: v })} allowInherit={false} />
        </Group>

        <Group label="YouTube ratio" hint="16:9 matches how YouTube encodes video. Story for Shorts.">
          <RatioChoice value={design.videoRatio} onChange={(v) => set({ videoRatio: v })}
            only={['16:9', '4:3', '1:1', '9:16']} />
        </Group>

        <Group label="Instagram ratio"
          hint="An Instagram embed is a whole card — header, photo, caption and actions. Anything shorter than 9:16 cuts the bottom off.">
          <RatioChoice value={design.instagramRatio} onChange={(v) => set({ instagramRatio: v })}
            only={['9:16', '3:4', '5:6', '1:1']} />
        </Group>
      </section>

      <button
        type="button"
        onClick={() => onChange({})}
        className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
      >
        Reset everything to template defaults
      </button>
    </div>
  );
}
