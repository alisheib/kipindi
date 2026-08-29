/**
 * Pagination — ONE shared pager for the whole platform (player + admin).
 * Server-rendered, URL-driven (?page=), so it's shareable + back-button-friendly
 * and needs no client JS. Admin tables use PER_PAGE (20); player lists/grids use
 * PLAYER_PER_PAGE (12). `admin/admin-pagination` re-exports this so existing
 * admin imports keep working.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { I } from "@/components/ui/glyphs";

/** Admin table page size. */
export const PER_PAGE = 20;
/** Player-facing list/grid page size — one value across wallet, markets,
 *  results, leaderboard, positions, proposals. */
export const PLAYER_PER_PAGE = 12;

/**
 * The numbered window: at most 7 page buttons around the current one, with `"..."`
 * standing in for the pages between.
 *
 * ⭐ PURE AND EXPORTED because it was inline in the render, and a decision that lives
 * only inside a render is a decision nothing can drive (SESSION-PROMPT-CLOSE-THE-BOARD
 * §1b). Extracting it is what lets `test:pager-reach` sweep every (page, totalPages)
 * pair rather than eyeball three of them.
 */
export function pageWindow(page: number, totalPages: number): (number | "...")[] {
  const out: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) out.push(i);
    return out;
  }
  out.push(1);
  if (page > 3) out.push("...");
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) out.push(i);
  if (page < totalPages - 2) out.push("...");
  out.push(totalPages);
  return out;
}

/**
 * Every page this control row can reach in ONE interaction from `page` — the numbered
 * window plus first, previous, next and last.
 *
 * ⚠️ AND THE HONEST NOTE ABOUT WHAT first/last CHANGED, 2026-08-25. The window has
 * ALWAYS carried `1` and `totalPages`, so both edges were already reachable in one
 * click by number. **The arrows did not fix a reachability defect and this file must
 * not pretend they did.** What they fix is the AFFORDANCE: a numbered button moves as
 * the window slides, so "jump to the end" is a different target on every page and is
 * indistinguishable from an ordinary page number; a `»` at a fixed end of the row is
 * one target that always means the same thing. That is what Ali asked for — *"arrow
 * controls, not only numbers"*.
 *
 * The invariant is still worth pinning, because it is the thing a future simplification
 * of `pageWindow` would silently break.
 */
export function reachablePages(page: number, totalPages: number): number[] {
  const safe = Math.min(Math.max(1, page), Math.max(1, totalPages));
  const set = new Set<number>([1, totalPages]);
  if (safe > 1) set.add(safe - 1);
  if (safe < totalPages) set.add(safe + 1);
  for (const p of pageWindow(safe, totalPages)) if (p !== "...") set.add(p);
  return [...set].sort((a, b) => a - b);
}

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
  firstLabel = "First page",
  lastLabel = "Last page",
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
  /** ⛔ An icon-only control MUST be named, and a double chevron is not self-describing.
   *  These follow prev/next exactly: the caller passes them from its own `t`, because this
   *  component is shared by server AND client trees and so cannot call getServerT/useT. */
  firstLabel?: string;
  lastLabel?: string;
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

  const pages = pageWindow(safePage, totalPages);

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
  // (onNavigate), else a client-routed <Link href="?page="> for the URL-driven
  // default — B-11: a raw <a> made every page turn a full document teardown
  // (flash, scroll lost, SSE reconnect). A disabled chevron stays a span.
  const Control = ({ to, disabled, cls, aria, children }: {
    to: number; disabled?: boolean; cls: string; aria?: string; children: ReactNode;
  }) =>
    onNavigate ? (
      <button type="button" onClick={() => onNavigate(to)} disabled={disabled} className={cls} aria-label={aria}>
        {children}
      </button>
    ) : disabled ? (
      <span aria-disabled="true" className={cls} aria-label={aria}>
        {children}
      </span>
    ) : (
      <Link href={href(to) as never} className={cls} aria-label={aria}>
        {children}
      </Link>
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 border-t border-border">
      <p className="font-mono text-micro tracking-[0.14em] uppercase text-text-subtle">
        {((safePage - 1) * perPage + 1).toLocaleString()}–{Math.min(safePage * perPage, total).toLocaleString()} {ofLabel} {total.toLocaleString()}
      </p>
      {/* Centred while wrapped, right-aligned once it fits on one line. `justify-end` once
          left the overflowing chevron hanging alone against the right edge, which reads as a
          broken layout rather than a wrapped one.
          ⭐ THE WRAP IS THE DESIGN, AND FIRST/LAST COST NOTHING — MEASURED ON PRODUCTION,
          2026-08-25, before and after. Eight 44px controls are 380px with gaps against a
          326px container at 360 and a 359px one at 393, so the row ALREADY wrapped to two
          lines on both. Six controls fit a row at 360 and seven at 393, so going from 8 to
          10 (or 11, the worst case where `totalPages === 7`) still lands on TWO rows and the
          block stays 92px tall. ⛔ So the trade-off this change was expected to force —
          "hide the numbers on a phone and keep only first/prev/next/last" — was NOT taken,
          because the measurement says it is not needed. Nothing is hidden at any width.
          ⚠️ Re-measure before adding a ninth kind of control; the next one is not free. */}
      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1">
        {/* ⛔ FIRST and LAST are the point of this control existing: a player on page 40 of
            60 could otherwise only step one page at a time. They are disabled exactly as
            prev/next are — a `<span aria-disabled>` in URL mode, so a dead control is never
            a link — and they keep the same 44px box, so the row's rhythm does not change. */}
        <Control to={1} disabled={!hasPrev} cls={`${btnBase} ${hasPrev ? btnInactive : btnDisabled}`} aria={firstLabel}>
          <I.chevronsLeft s={14} />
        </Control>
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
        <Control to={totalPages} disabled={!hasNext} cls={`${btnBase} ${hasNext ? btnInactive : btnDisabled}`} aria={lastLabel}>
          <I.chevronsRight s={14} />
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
