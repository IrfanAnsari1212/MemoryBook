"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { createThemeAction, updateThemeAction, type ThemeFormState } from "@/actions/themes";
import { PhotoLayout, TransitionType } from "@/generated/prisma/enums";
import { PHOTO_LAYOUT_LABEL, TRANSITION_LABEL } from "@/lib/pages/registry";
import { ACCENT_FONTS, BODY_FONTS, HEADING_FONTS } from "@/lib/themes/fonts";
import { THEME_TEMPLATES } from "@/lib/themes/defaults";
import { resolveTheme } from "@/lib/themes/resolve";
import { DENSITY_KEYS, RADIUS_KEYS, TEXTURE_KEYS, type ThemeInput } from "@/lib/themes/schema";
import { AA_TEXT, contrastRatio } from "@/lib/themes/contrast";
import { btnPrimary, btnSecondary } from "@/components/admin/book-ui";
import { ThemePreview } from "./theme-preview";

type Values = Record<keyof ThemeInput, string>;

const input = "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2";
const ok = "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/30";
const bad = "border-red-400 focus:border-red-500 focus:ring-red-500/30";

const RADIUS_LABEL = { sharp: "Sharp", soft: "Soft", round: "Round" } as const;
const DENSITY_LABEL = { compact: "Compact", comfortable: "Comfortable", spacious: "Spacious" } as const;
const TEXTURE_LABEL = { none: "Plain", paper: "Soft paper", grain: "Fine grain", dots: "Subtle dots" } as const;

const COLOR_FIELDS: Array<[keyof ThemeInput, string]> = [
  ["background", "Background"],
  ["surface", "Surface / cards"],
  ["text", "Text"],
  ["textSecondary", "Secondary text"],
  ["accent", "Accent"],
  ["accentMuted", "Muted accent"],
];

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function ThemeEditor({ mode, themeId, initial }: { mode: "create" | "edit"; themeId?: string; initial: ThemeInput }) {
  const [state, formAction, pending] = useActionState<ThemeFormState, FormData>(mode === "create" ? createThemeAction : updateThemeAction, {});
  const [v, setV] = useState<Values>({ ...(initial as Values), ...(state.values as Partial<Values> | undefined) });
  const fe = state.fieldErrors ?? {};
  const err = (k: string) => fe[k]?.[0];
  const set = (k: keyof ThemeInput, val: string) => setV((cur) => ({ ...cur, [k]: val }));
  const p = (k: keyof ThemeInput) => ({
    id: k, name: k, value: v[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => set(k, e.target.value),
    "aria-invalid": fe[k] ? true : undefined, "aria-describedby": fe[k] ? `${k}-error` : undefined,
    className: `${input} ${fe[k] ? bad : ok}`,
  });

  // The preview is built from the real story components; invalid fields fall back to defaults while typing.
  const preview = useMemo(
    () =>
      resolveTheme({
        name: v.name, background: v.background, foreground: v.text, card: v.surface, accent: v.accent,
        headingFont: v.headingFont, bodyFont: v.bodyFont, accentFont: v.accentFont,
        config: { textSecondary: v.textSecondary, accentMuted: v.accentMuted, radius: v.radius, density: v.density, texture: v.texture, defaultTransition: v.defaultTransition, defaultPhotoLayout: v.defaultPhotoLayout },
      }),
    [v],
  );

  const bodyContrast = contrastRatio(preview.text, preview.background);
  const secondaryContrast = contrastRatio(preview.textSecondary, preview.background);
  const warnings = [
    bodyContrast !== null && bodyContrast < AA_TEXT && `Text on background has a contrast of ${bodyContrast.toFixed(1)}:1 (aim for at least ${AA_TEXT}:1).`,
    secondaryContrast !== null && secondaryContrast < AA_TEXT && `Secondary text has a contrast of ${secondaryContrast.toFixed(1)}:1 (aim for at least ${AA_TEXT}:1).`,
  ].filter(Boolean) as string[];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <form action={formAction} className="space-y-6" noValidate>
        {themeId && <input type="hidden" name="themeId" value={themeId} />}

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold">Basics</h2>
          <Field id="name" label="Theme name" error={err("name")}>
            <input {...p("name")} type="text" maxLength={60} />
          </Field>
          {mode === "create" && (
            <div className="space-y-1.5">
              <label htmlFor="template" className="text-sm font-medium text-slate-700">Start from</label>
              <select
                id="template"
                defaultValue=""
                onChange={(e) => {
                  const t = THEME_TEMPLATES.find((x) => x.name === e.target.value);
                  if (t) setV((cur) => ({ ...(t as Values), name: cur.name || `${t.name} copy` }));
                }}
                className={`${input} ${ok}`}
              >
                <option value="">Keep current values</option>
                {THEME_TEMPLATES.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold">Colors</h2>
          {COLOR_FIELDS.map(([k, label]) => (
            <Field key={k} id={k} label={label} error={err(k)}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={`${label} picker`}
                  value={/^#[0-9a-f]{6}$/i.test(v[k]) ? v[k] : "#000000"}
                  onChange={(e) => set(k, e.target.value)}
                  className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                />
                <input {...p(k)} type="text" maxLength={9} spellCheck={false} autoCapitalize="none" className={`${input} ${fe[k] ? bad : ok} font-mono`} />
              </div>
            </Field>
          ))}
          {warnings.length > 0 && (
            <ul role="status" className="space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold">Typography</h2>
          <Field id="headingFont" label="Heading font" error={err("headingFont")}>
            <select {...p("headingFont")}>{Object.entries(HEADING_FONTS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}</select>
          </Field>
          <Field id="bodyFont" label="Body font" error={err("bodyFont")}>
            <select {...p("bodyFont")}>{Object.entries(BODY_FONTS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}</select>
          </Field>
          <Field id="accentFont" label="Accent font" hint="Used sparingly for captions and signatures." error={err("accentFont")}>
            <select {...p("accentFont")}>{Object.entries(ACCENT_FONTS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}</select>
          </Field>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold">Spacing &amp; style</h2>
          <Field id="radius" label="Corners" error={err("radius")}>
            <select {...p("radius")}>{RADIUS_KEYS.map((k) => <option key={k} value={k}>{RADIUS_LABEL[k]}</option>)}</select>
          </Field>
          <Field id="density" label="Spacing" error={err("density")}>
            <select {...p("density")}>{DENSITY_KEYS.map((k) => <option key={k} value={k}>{DENSITY_LABEL[k]}</option>)}</select>
          </Field>
          <Field id="texture" label="Background" error={err("texture")}>
            <select {...p("texture")}>{TEXTURE_KEYS.map((k) => <option key={k} value={k}>{TEXTURE_LABEL[k]}</option>)}</select>
          </Field>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold">Defaults for new pages</h2>
          <Field id="defaultTransition" label="Transition" hint="Also used when the cover opens." error={err("defaultTransition")}>
            <select {...p("defaultTransition")}>{Object.values(TransitionType).map((t) => <option key={t} value={t}>{TRANSITION_LABEL[t]}</option>)}</select>
          </Field>
          <Field id="defaultPhotoLayout" label="Photo layout" error={err("defaultPhotoLayout")}>
            <select {...p("defaultPhotoLayout")}>{Object.values(PhotoLayout).map((l) => <option key={l} value={l}>{PHOTO_LAYOUT_LABEL[l]}</option>)}</select>
          </Field>
        </section>

        <p role="alert" aria-live="polite" className="min-h-5 text-sm text-red-600">{state.error ?? ""}</p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={btnPrimary}>{pending ? "Saving…" : mode === "create" ? "Create theme" : "Save theme"}</button>
          <Link href="/admin/themes" className={btnSecondary}>Cancel</Link>
        </div>
      </form>

      <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto">
        <h2 className="mb-3 text-base font-semibold">Live preview</h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <ThemePreview theme={preview} />
        </div>
      </aside>
    </div>
  );
}
