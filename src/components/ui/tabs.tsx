"use client";

/**
 * Tabs — kit-faithful three-variant tabs.
 *
 *   line       — kit default. Horizontal row, gold underline on active.
 *   segmented  — pill-shaped capsule with active surface raised.
 *   pill       — separate pills, active fills with teal-subtle.
 *
 * All three share the same data shape and onChange API; pick the one that
 * fits the host context (line on detail pages, segmented in toolbars,
 * pill for lightweight filter strips).
 *
 * ⚠️ EVERY TAB HEIGHT BELOW IS AN ARBITRARY LITERAL ON PURPOSE. `theme.extend.spacing`
 * is OVERRIDDEN in `tailwind.config.ts:200-215`, so a scale class is ~double what it
 * reads as (`h-8` = 48px, `h-10` = 80px). All three variants were written in the
 * default-Tailwind idiom and shipped oversized — `line` put the wallet section rail
 * in an 80px band. ⛔ Never "tidy" these back into `h-8` / `h-10`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 A5 (2026-08-21) — THESE ARE PRESSED BUTTONS, NOT AN ARIA TAB WIDGET.
 *
 * All three variants used to carry `role="tablist"` + `role="tab"` + `aria-selected`, and
 * that is a promise the markup could not keep: the ARIA tab pattern requires arrow-key
 * navigation with a roving tabindex AND an `aria-controls` pointing at a `role="tabpanel"`
 * that is labelled back by its tab. None of it was there — every tab sat in the tab order,
 * arrows did nothing, and there was no panel to point at. A screen-reader user was told
 * "tab, 1 of 3" and then found the only way through the rail was Tab, which is the one key
 * a real tablist does NOT use.
 *
 * ⭐ THE FIX IS TO STOP CLAIMING THE WIDGET, not to build it here — and that is a fact about
 * WHERE the panel lives, not a preference. The panel is rendered by the CALLER
 * (`wallet-client.tsx` switches its own sections on `value`), so this component can never
 * emit a correct `aria-controls`; a primitive cannot label an element it does not own.
 * Building the widget properly would mean a new required `panelId` prop and a matching
 * `role="tabpanel"` at every call site — a cross-file contract for a single rail.
 *
 * So: `role="group"` + a button per option carrying `aria-pressed`, which is exactly the
 * `"toggle"` semantics `filter-pill.tsx` already ships across eight player surfaces. Tab
 * moves between the options (which is what actually happens), Enter/Space chooses, and
 * nothing announces a contract the DOM does not honour.
 *
 * ⚠️ NOT `aria-current`: `filter-pill.tsx` reserves that for a rail whose options NAVIGATE
 * (`aria-current="page"`). These change in-page view state without a URL, which is the
 * `/markets` discovery-chip case, and that rail is `aria-pressed`.
 *
 * 📋 STAGE 8 — `TabItem.labelSw` is dead API: nothing reads it, and the one call site passes
 * translated `labelEn` from `useT()`. Left in place here on purpose (removing a public field
 * is a call-site change, not an accessibility fix); flag it with the naming pass.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export type TabItem = { value: string; labelEn: string; labelSw?: string; count?: number };

type Variant = "line" | "segmented" | "pill";

export function Tabs({
  tabs,
  value,
  onChange,
  variant = "line",
  className,
  ariaLabel,
}: {
  tabs: TabItem[];
  value: string;
  onChange: (v: string) => void;
  variant?: Variant;
  className?: string;
  ariaLabel?: string;
}) {
  if (variant === "segmented") {
    return (
      <div
        role="group"
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center gap-0.5 rounded-lg bg-bg-inset p-1 border border-border",
          className,
        )}
      >
        {tabs.map((t) => {
          const active = value === t.value;
          return (
            <button
              key={t.value}
              aria-pressed={active}
              type="button"
              onClick={() => onChange(t.value)}
              className={cn(
                // 36px segment inside the `p-1` (4px) capsule above ⇒ a 46px capsule with its
                // 1px border, in line with the 44px filter rails (was h-8 = 48px ⇒ 58px).
                "h-[36px] px-3 rounded-md text-[12.5px] font-mono font-semibold transition-colors duration-100",
                active
                  ? "text-text"
                  : "text-text-muted hover:text-text",
              )}
              style={active ? { background: "oklch(40% 0.08 264 / 0.55)" } : undefined}
            >
              {t.labelEn}
              {t.count !== undefined && (
                <span className="ml-1.5 font-mono text-[11px] text-text-subtle">{t.count}</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "pill") {
    return (
      <div role="group" aria-label={ariaLabel} className={cn("flex flex-wrap gap-1.5", className)}>
        {tabs.map((t) => {
          const active = value === t.value;
          return (
            <button
              key={t.value}
              aria-pressed={active}
              type="button"
              onClick={() => onChange(t.value)}
              className={cn(
                // 40px = --tap-min, the chip language every other filter rail uses (was h-8 = 48px).
                "h-[40px] px-3.5 rounded-pill text-label font-mono font-semibold uppercase tracking-[0.14em] border transition-colors duration-100",
                active
                  ? "border-brand-500 bg-brand-500/15 text-brand-300"
                  : "border-border bg-bg-elevated text-text-muted hover:border-border-strong hover:text-text",
              )}
            >
              {t.labelEn}
              {t.count !== undefined && <span className="ml-1.5 opacity-70">{t.count}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  // line
  return (
    <div role="group" aria-label={ariaLabel} className={cn("flex items-end gap-1 border-b border-border overflow-x-auto", className)}>
      {tabs.map((t) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            aria-pressed={active}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn(
              // 44px — A2's mobile-preferred tap height (was h-10 = 80px on the wallet rail).
              "relative h-[44px] px-4 text-[13px] font-display font-semibold transition-colors duration-150 whitespace-nowrap",
              active ? "text-text" : "text-text-muted hover:text-text",
            )}
          >
            {t.labelEn}
            {t.count !== undefined && (
              <span className="ml-1.5 font-mono text-[11px] text-text-subtle">{t.count}</span>
            )}
            <span
              aria-hidden
              className="absolute left-2 right-2 -bottom-px h-[2px] rounded-pill"
              style={{
                background: active ? "var(--brand-500)" : "transparent",
                boxShadow: active ? "0 0 8px color-mix(in oklab, var(--brand-500) 50%, transparent)" : "none",
                transform: active ? "scaleX(1)" : "scaleX(0)",
                transition: "transform var(--t-base) var(--m-glide), background var(--t-quick) ease-out, box-shadow var(--t-base) ease-out",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
