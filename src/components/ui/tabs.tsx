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
        role="tablist"
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
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => onChange(t.value)}
              className={cn(
                "h-8 px-3 rounded-md text-[12.5px] font-mono font-semibold transition-colors duration-100",
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
      <div role="tablist" aria-label={ariaLabel} className={cn("flex flex-wrap gap-1.5", className)}>
        {tabs.map((t) => {
          const active = value === t.value;
          return (
            <button
              key={t.value}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => onChange(t.value)}
              className={cn(
                "h-8 px-3.5 rounded-pill text-[12px] font-mono font-semibold uppercase tracking-[0.14em] border transition-colors duration-100",
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
    <div role="tablist" aria-label={ariaLabel} className={cn("flex items-end gap-1 border-b border-border overflow-x-auto", className)}>
      {tabs.map((t) => {
        const active = value === t.value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn(
              "relative h-10 px-4 text-[13px] font-display font-semibold transition-colors duration-150 whitespace-nowrap",
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
                transition: "transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1), background 150ms ease-out, box-shadow 200ms ease-out",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
