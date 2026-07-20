/**
 * Admin loading-skeleton kit — the ONE source of skeleton primitives every
 * admin `loading.tsx` composes from, so a loader mirrors its page's real
 * geometry (KPI band, table rows == real rows, card stacks) instead of a bare
 * centred spinner. Pattern set by `ai-polls/[id]/loading.tsx`.
 *
 * All server-safe (no hooks, no "use client") so they render inside a Suspense
 * fallback. Skeleton fill is `bg-bg-overlay` — the established placeholder tint
 * — and the page-level `animate-pulse` lives on <SkBody>, so bars don't each
 * animate on their own phase.
 *
 * Loaders render the REAL <AdminPageHead> (title/sw are static and known), which
 * keeps the page identity + header height stable across the load→loaded swap;
 * only the body is skeletonised.
 */
import type { ReactNode } from "react";

/** One pulsing placeholder bar. Size via Tailwind className (house style). */
export function SkBar({ className = "h-3 w-24" }: { className?: string }) {
  return <div className={`rounded bg-bg-overlay ${className}`} />;
}

/** A skeleton stand-in for a status Chip / pill action in the page header. */
export function SkChip({ className = "h-[26px] w-20" }: { className?: string }) {
  return <div className={`rounded-pill bg-bg-overlay ${className}`} />;
}

/** Body wrapper — matches every admin page's `px-4 lg:px-6 py-5 space-y-4`, and
 *  owns the single pulse so the whole skeleton breathes in phase. */
export function SkBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-4 lg:px-6 py-5 space-y-4 animate-pulse ${className}`}>{children}</div>;
}

/** KPI band skeleton — mirrors AdminKpi tiles (glass-panel, min-h-[110px]). */
export function SkKpiRow({
  count = 4,
  cols = "grid-cols-2 lg:grid-cols-4",
}: {
  count?: number;
  cols?: string;
}) {
  return (
    <div className={`grid ${cols} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg glass-panel p-3.5 flex flex-col gap-2 min-h-[110px]">
          <SkBar className="h-2.5 w-20" />
          <SkBar className="h-6 w-24 mt-1" />
          <div className="mt-auto flex items-center gap-2">
            <SkBar className="h-2.5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A generic card skeleton — glass-panel with an optional title bar + body lines. */
export function SkCard({
  lines = 3,
  titleW = "w-40",
  title = true,
  className = "",
}: {
  lines?: number;
  titleW?: string;
  title?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded-lg glass-panel p-4 space-y-3 ${className}`}>
      {title && <SkBar className={`h-3.5 ${titleW}`} />}
      {Array.from({ length: lines }).map((_, i) => (
        <SkBar key={i} className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

/** A form-card skeleton — a label+field stack (settings / grant / config pages). */
export function SkFormCard({
  fields = 3,
  titleW = "w-36",
  className = "",
}: {
  fields?: number;
  titleW?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-lg glass-panel p-4 space-y-4 ${className}`}>
      <SkBar className={`h-3.5 ${titleW}`} />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <SkBar className="h-2.5 w-24" />
            <SkBar className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
      <SkBar className="h-9 w-32 rounded-md" />
    </div>
  );
}

/**
 * Table-card skeleton — a glass-panel (flush) with a title row, then a header
 * row + N body rows inside a horizontal-scroll wrapper at the real min-width, so
 * the skeleton has the same column count and row rhythm as the real table.
 */
export function SkTableCard({
  cols = 5,
  rows = 8,
  minWidth = 640,
  headW = "w-40",
  title = true,
}: {
  cols?: number;
  rows?: number;
  minWidth?: number;
  headW?: string;
  title?: boolean;
}) {
  return (
    <div className="rounded-lg glass-panel p-0">
      {title && (
        <div className="px-4 pt-4 pb-3">
          <SkBar className={`h-3.5 ${headW}`} />
        </div>
      )}
      <div className="overflow-x-auto">
        <div style={{ minWidth }} className="px-4 pb-4">
          {/* header */}
          <div className="flex items-center gap-4 border-b border-border py-2.5">
            {Array.from({ length: cols }).map((_, i) => (
              <SkBar key={i} className="h-2.5 flex-1 max-w-[84px]" />
            ))}
          </div>
          {/* rows */}
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex items-center gap-4 border-b border-dashed border-border-subtle py-3 last:border-b-0">
              {Array.from({ length: cols }).map((_, i) => (
                <SkBar key={i} className="h-3 flex-1 max-w-[110px]" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** A tall block placeholder — for chart cards / client-owned regions whose inner
 *  shape isn't known to the loader (matches AdminBlock height rhythm). */
export function SkBlock({ height = 240, className = "" }: { height?: number; className?: string }) {
  return (
    <div
      className={`rounded-lg glass-panel ${className}`}
      style={{ minHeight: height }}
    />
  );
}
