import type { ReactNode } from "react";
import { FilterGroupKey } from "@/components/ui/filter-pill";
import { QUERY_GROUP_CLASS } from "@/components/ui/query-bar";

/**
 * THE QUERY BAR WHILE IT LOADS — the parts every bar ghost draws, in one place (round 5's follow-up, R5-L; the pill is
 * R5-H's, moved here from `app/wallet/money-bar-ghost.tsx` so the money books, /results, /markets and /leaderboard draw
 * ONE pill).
 *
 * ⭐ A BAR'S SECOND ROW WRAPS ON ITS WORDS, SO ITS GHOST CARRIES THEM. From `lg` a bar lays its sort and its groups along
 * one wrapping row, 29px apart (`.kp-qbar-row:has(.kp-qdiv)`, globals.css), and how many lines that row takes is decided
 * by the pills' labels — measured from the served fonts with two-digit counts (S/r5l/measure-routes.cts), /results' row
 * is four lines at 1024 and three at 1280 in Swahili and English (three and two in Chinese), /markets' two (one in
 * Chinese at 1280), where their ghosts drew ONE line of typed boxes: the grid landed 56 to 168px below the ghost's
 * promise. So every part here is the page's own box (`filterPillClass`'s geometry, the key's type, the sort's and the
 * topic menu's summary) with the page's words set and not shown, and a group stands in `QUERY_GROUP_CLASS` behind the
 * page's own `QueryGroupDivider`: the ghost's row wraps where the page's does, in every language and at every width.
 * ⛔ A count is two digits' room ("00", R5-H's choice): the ghost cannot know the numbers, and the page prints them.
 * ⛔ A ghost promises a shape and nothing else: no link, no `<nav>`, no `<details>` (a summary takes focus), no live
 *    region, no `data-result-count` (`qa:count-truth` reads that one). The drawing is hidden from a screen reader.
 */

/** A pill while it loads: `filterPillClass`'s box (its geometry, not its ink) with the label set and not shown. A glyph
 *  takes its 14px place before the label; `amount` sets the label as money (`.amount`, as the pool floors are set). */
export function PillGhost({ label, glyph = false, amount = false }: { label: ReactNode; glyph?: boolean; amount?: boolean }) {
  return (
    <span className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-pill border border-transparent bg-bg-overlay px-3 text-[13px] font-semibold text-transparent kp-shimmer-track">
      {glyph && <span className="h-[14px] w-[14px] shrink-0" />}
      {amount ? <span className="amount">{label}</span> : label}
      <span className="font-mono text-[11px] font-bold tabular-nums">00</span>
    </span>
  );
}

/** A desktop group: the page's own wrapper (`QUERY_GROUP_CLASS`, `hidden … lg:flex`, wrapping inside itself), its key in
 *  the key's own type, then its pills. The page draws a `<nav>`; a ghost has nothing to navigate. */
export function GroupGhost({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={QUERY_GROUP_CLASS}>
      <FilterGroupKey className="text-transparent">{label}</FilterGroupKey>
      {children}
    </div>
  );
}

/** The sort and its direction button (`QuerySort`): the wrapper's own flex (it fills a phone's row and is its own width
 *  from `lg`), the summary's box — 8px of padding and gap below `lg` and 16/12 from it, as `QuerySort` sets them — with
 *  the key shown from `lg` only (`hidden lg:inline`, the page's `labelClassName`), the value and the caret's 14px; then
 *  the 44px button. `data-bar-cell` places it in /markets' phone grid as the page's own cell. */
export function SortGhost({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center lg:flex-none" data-bar-cell="sort">
      <span className="kp-shimmer-track inline-flex min-h-[44px] w-full min-w-[var(--tap-min)] items-center justify-center gap-1.5 rounded-l-pill border border-r-0 border-transparent bg-bg-elevated px-1.5 text-transparent lg:gap-2 lg:px-3">
        <span className="hidden shrink-0 font-mono text-micro font-bold uppercase eyebrow lg:inline">{label}</span>
        <span className="kp-menu-value min-w-0 truncate text-[13px] font-semibold">{value}</span>
        <span className="h-[14px] w-[14px] shrink-0" />
      </span>
      <span className="h-[44px] w-[44px] shrink-0 rounded-r-pill border border-transparent bg-bg-elevated kp-shimmer-track" />
    </div>
  );
}

/** The phone's Filters button (`FilterSheet`'s trigger, its pill shape): the trigger's own geometry class
 *  (`.kp-fsheet-trigger`, globals.css — 44px, 14px of padding, 12px gaps), the sliders' 15px, the label and the caret's
 *  14px, in the sheet's own root (`kp-fsheet lg:hidden`) — so /markets' one-line phone bar folds its label and caret away
 *  exactly as it folds the page's (`.kp-discovery-bar:has(> [data-bar-row]) .kp-fsheet-trigger-label`). */
export function FiltersGhost({ label }: { label: string }) {
  return (
    <div className="kp-fsheet lg:hidden">
      <span className="kp-fsheet-trigger kp-shimmer-track items-center border border-transparent bg-bg-elevated font-semibold text-transparent" data-shape="pill">
        <span className="h-[15px] w-[15px] shrink-0" />
        <span className="kp-fsheet-trigger-label">{label}</span>
        <span className="kp-fsheet-caret h-[14px] w-[14px] shrink-0" />
      </span>
    </div>
  );
}

/** A desktop menu (`MenuShell`'s own summary — /markets' topic): shown from `lg` as the page's (`hidden max-w-full
 *  lg:block`), its key, value, a count's room and the caret's 14px, 12px apart inside 16px of padding. */
export function MenuGhost({ label, value }: { label: string; value: string }) {
  return (
    <div className="hidden max-w-full shrink-0 lg:block">
      <span className="kp-shimmer-track inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-pill border border-transparent bg-bg-elevated px-3 text-transparent">
        <span className="shrink-0 font-mono text-micro font-bold uppercase eyebrow">{label}</span>
        <span className="min-w-0 truncate text-[13px] font-semibold">{value}</span>
        {/* The count's two-digit room: two mono digits at 11px (2 × 0.6em). */}
        <span className="h-[14px] w-[13.2px] shrink-0" />
        <span className="h-[14px] w-[14px] shrink-0" />
      </span>
    </div>
  );
}
