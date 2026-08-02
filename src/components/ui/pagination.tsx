/**
 * Pagination — ONE shared pager for the whole platform (player + admin).
 * Server-rendered, URL-driven (?page=), so it's shareable + back-button-friendly
 * and needs no client JS. Admin tables use PER_PAGE (20); player lists/grids use
 * PLAYER_PER_PAGE (12). `admin/admin-pagination` re-exports this so existing
 * admin imports keep working.
 */
import type { ReactNode } from "react";
import { I } from "@/components/ui/glyphs";

/** Admin table page size. */
export const PER_PAGE = 20;
/** Player-facing list/grid page size — one value across wallet, markets,
 *  results, leaderboard, positions, proposals. */
export const PLAYER_PER_PAGE = 12;

export function Pagination({
  total,
  page,
  perPage = PER_PAGE,
  baseHref,
  param = "page",
  onNavigate,
  ofLabel = "of",
  prevLabel = "Previous page",
  nextLabel = "Next page",
}: {
  total: number;
  page: number;
  perPage?: number;
  /** Base URL including existing query params (e.g. "/results?tab=resolved"). The
   *  page param is appended. Optional when `onNavigate` drives client-side paging. */
  baseHref?: string;
  /** Page query-param name. Override (e.g. "txpage") when one page hosts several
   *  independently-paginated lists so each keeps its own page state. */
  param?: string;
  /** Client-side mode: when provided, page controls render as buttons that call
   *  this with the target 1-indexed page instead of navigating via ?page= links.
   *  Used by the wallet activity list (client-rendered inside tabs). */
  onNavigate?: (page: number) => void;
  /** Localized labels. Pagination is a sync component shared by server + client
   *  trees (so it can't call getServerT/useT itself) — callers pass these from
   *  their own `t`. Default to English (admin tables, which are English-only). */
  ofLabel?: string;
  prevLabel?: string;
  nextLabel?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1) return null;

  const safePage = Math.min(Math.max(1, page), totalPages);
  const hasPrev = safePage > 1;
  const hasNext = safePage < totalPages;

  const href = (p: number) => {
    const base = baseHref ?? "";
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}${param}=${p}`;
  };

  // Show at most 7 page buttons around the current page.
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (safePage > 3) pages.push("...");
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) pages.push(i);
    if (safePage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  // ⚠️ 44px WRITTEN LITERALLY, NOT `h-10` (campaign finding G-2, 2026-08-02).
  // This project overrides Tailwind's spacing scale in `tailwind.config.ts`, where the
  // key `10` is **80px** — not the 40px it means everywhere else. So `h-10 min-w-[40px]`
  // rendered every page control on all 25 paginated screens as a 40×80 PORTRAIT pill:
  // twice the height it was written to be, taller than the 44px filter chips directly
  // above it, and on a phone tall enough to push the next-page chevron onto its own row.
  // Nothing caught it because the class list reads correct to anyone who knows Tailwind
  // and not this config — the same trap already paid for in `notifications-panel.tsx`.
  // ⛔ Do not "tidy" these back into scale tokens without checking that table.
  // 44px is also the campaign's tap-target floor (WCAG 2.5.5 AAA), so the literal value
  // is the one the design rule actually names.
  const btnBase = "inline-flex items-center justify-center h-[44px] min-w-[44px] px-2 rounded-md font-mono text-[11px] tracking-[0.10em] transition-all duration-150";
  const btnActive = "border border-brand-500 bg-brand-500/15 text-brand-300 font-bold shadow-glow-selected";
  const btnInactive = "border border-border bg-bg-elevated text-text-muted hover:border-border-strong hover:text-text hover:bg-bg-overlay/30";
  const btnDisabled = "border border-border bg-bg-elevated text-text-subtle/40 pointer-events-none";

  // One control renderer for both modes: a <button onClick> in client mode
  // (onNavigate), else an <a href="?page="> for the URL-driven default.
  const Control = ({ to, disabled, cls, aria, children }: {
    to: number; disabled?: boolean; cls: string; aria?: string; children: ReactNode;
  }) =>
    onNavigate ? (
      <button type="button" onClick={() => onNavigate(to)} disabled={disabled} className={cls} aria-label={aria}>
        {children}
      </button>
    ) : (
      <a href={disabled ? undefined : href(to)} className={cls} aria-label={aria}>
        {children}
      </a>
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 border-t border-border">
      <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-text-subtle">
        {((safePage - 1) * perPage + 1).toLocaleString()}–{Math.min(safePage * perPage, total).toLocaleString()} {ofLabel} {total.toLocaleString()}
      </p>
      {/* Centred while wrapped, right-aligned once it fits on one line. At 360 seven
          44px controls need two rows, and `justify-end` left the overflowing chevron
          hanging alone against the right edge, which reads as a broken layout rather
          than a wrapped one. */}
      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1">
        <Control to={safePage - 1} disabled={!hasPrev} cls={`${btnBase} ${hasPrev ? btnInactive : btnDisabled}`} aria={prevLabel}>
          <I.chevronLeft s={14} />
        </Control>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="px-1 text-text-subtle">…</span>
          ) : (
            <Control key={p} to={p} cls={`${btnBase} ${p === safePage ? btnActive : btnInactive}`}>
              {p}
            </Control>
          ),
        )}
        <Control to={safePage + 1} disabled={!hasNext} cls={`${btnBase} ${hasNext ? btnInactive : btnDisabled}`} aria={nextLabel}>
          <I.chevronRight s={14} />
        </Control>
      </div>
    </div>
  );
}

/** Parse page from searchParams, clamp to valid range. */
export function parsePage(raw: string | undefined, total: number, perPage = PER_PAGE): number {
  const n = parseInt(raw ?? "1", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  const max = Math.max(1, Math.ceil(total / perPage));
  return Math.min(n, max);
}

/**
 * Build baseHref from current searchParams, excluding the page param. Pass
 * `pageParam` on multi-list pages so the OTHER lists' page/filter state is kept.
 */
export function buildBaseHref(
  path: string,
  params: Record<string, string | undefined>,
  pageParam = "page",
): string {
  const entries = Object.entries(params).filter(([k, v]) => k !== pageParam && v);
  if (entries.length === 0) return path;
  return `${path}?${entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&")}`;
}
