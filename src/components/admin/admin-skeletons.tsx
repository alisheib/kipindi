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
import { AdminBody } from "@/components/admin/admin-body";

/** One pulsing placeholder bar. Size via Tailwind className (house style).
 *  ⛔ WIDTHS HERE ARE ARBITRARY LITERALS, NOT `w-24`/`w-20`/`w-16`/`w-32`. Those four
 *  keys are NOT in `tailwind.config.ts`'s spacing override, so they keep their stock
 *  values (96/80/64/128px) while the LOWER key `w-12` paints 128 — the inverted scale
 *  `npm run test:spacing-scale` ratchets. This kit is imported by 46 loaders, so a
 *  key here is a key in every one of them; `w-[96px]` says the same number and counts
 *  as zero. Same reason `h-2.5`/`h-3.5`/`py-2.5` are written `h-[10px]`/`h-[14px]`/
 *  `py-[10px]` throughout this file. */
export function SkBar({ className = "h-3 w-[96px]" }: { className?: string }) {
  return <div className={`rounded bg-bg-overlay ${className}`} />;
}

/** A skeleton stand-in for a status Chip / pill action in the page header.
 *  ⚠️ The 26px DEFAULT is the Toggle box, not a Chip: a `Chip size="sm"` is 18px
 *  (20 for a status variant), `md` 21 (23 status) and `lg` 25 (27) — `ui/chip.tsx`'s
 *  `sizeStyles`, whose `isStatus` set is live/resolved/pending/objection/new/hot. A
 *  header action that is a `.btn-sm` is 40 (`--h-control-sm`) and a `.btn-md` 44.
 *  Pass the height the page's own action actually renders. */
export function SkChip({ className = "h-[26px] w-[80px]" }: { className?: string }) {
  return <div className={`rounded-pill bg-bg-overlay ${className}`} />;
}

/**
 * The CARD-HEADER ghost — the one shape 150 call sites across this console get wrong.
 *
 * 🔴 The real `<AdminCard>` header (admin-shell.tsx:556-561) is a
 * `text-body-sm leading-tight` title — 13px × 1.25 = **16.25px** — over an optional
 * `text-caption italic leading-tight mt-0.5` Swahili gloss — 2 + 11 × 1.25 = **15.75px**
 * — i.e. **32px** with the gloss and 16.25 without. Measured, not remembered: the sizes
 * are `tailwind.config.ts`'s `fontSize` table and `mt-0.5` is 2px on the overridden
 * spacing scale.
 * ⛔ It is NOT one 14px bar. A single `h-3.5` drew 14px where the page draws 32, so
 * every titled ghost in the console was **18px short** and the card stepped DOWN the
 * instant the data landed — DESIGN_AUTHORITY §S1's dated DG-P-04 ruling (2026-08-29),
 * which is about exactly this: "the skeleton standing in for it rendered 20 and 24, so
 * the page moved twice on every load".
 *
 * ⭐ `sw` DEFAULTS TRUE because the console does: re-derived over all 47 admin pages,
 * 197 `<AdminCard>` sites, 130 titled, and **129 of those 130 pass `sw`** (the sole
 * exception is kyc/[id]/page.tsx:198). A ghost standing for the exception passes
 * `sw={false}`; one standing for an UNTITLED card passes `title={false}` — 67 of the
 * 197 are untitled, and a header drawn for a card that has none is the same defect
 * pointing the other way.
 */
export function SkTitle({ titleW = "w-40", sw = true, className = "" }: { titleW?: string; sw?: boolean; className?: string }) {
  return (
    <div className={className}>
      <SkBar className={`h-[16px] ${titleW}`} />
      {sw && <SkBar className="h-[14px] w-[96px] mt-[2px]" />}
    </div>
  );
}

/** Body wrapper — the page's own <AdminBody>, plus the single pulse so the whole
 *  skeleton breathes in phase. ⭐ It USES <AdminBody> rather than re-typing its
 *  class string: a loader that drifts from its page's gutters is a loader that
 *  makes the load→loaded swap jump sideways, and that is exactly what two copies
 *  of one padding value eventually do. */
export function SkBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <AdminBody className={`animate-pulse ${className}`}>{children}</AdminBody>;
}

/** KPI band skeleton — mirrors AdminKpi tiles (glass-panel, min-h-[110px]). */
export function SkKpiRow({
  count = 4,
  cols = "grid-cols-2 lg:grid-cols-4",
  gap = "gap-3",
}: {
  count?: number;
  /** The page's own responsive ladder. The default is `KPI_COLS["4"]`, which 33 of the
   *  console's bands take; pass the page's string where it differs — including the one
   *  hand-rolled AdminKpi grid left at HEAD (system/page.tsx:100, `sm:grid-cols-4`). */
  cols?: string;
  /** `<KpiGrid>`'s own gap is `gap-3`; the hand-rolled grid on /admin/system uses
   *  `gap-2`. `twMerge` lets a real call site override it, so the ghost must too. */
  gap?: string;
}) {
  return (
    <div className={`grid ${cols} ${gap}`}>
      {/* ⛔ DO NOT ADD A GLOSS BAR OR "ALIGN" `gap-2` TO THE REAL TILE'S `gap-1.5`.
          Re-measured 2026-08-30 on the overridden scale: the real tile's tallest content is
          24 (p-2) + 12.35 (9.5px label × 1.3) + 8 + 22 (`sm:text-title-md` `leading-none`)
          + 8 + 13.125 (10.5px gloss × 1.25) + 8 + 18 (`text-micro` delta in `py-0.5`) =
          113.5px, and that is the MAXIMUM — a tile without both a gloss and a delta computes
          to 95.5 or less, and below 640 the value drops to 18 and the maximum itself falls to
          109.5. `min-h-[110px]` therefore governs on the great majority of real tiles. These
          three bars compute to 104, so it governs here too and the ghost lands on 110 with
          them. A fourth bar would take the ghost to 125 and over-draw every tile with no
          delta — the same defect pointing the other way. */}
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-panel admin-kpi p-2 flex flex-col gap-2 min-h-[110px]">
          <SkBar className="h-[10px] w-[80px]" />
          <SkBar className="h-6 w-[96px] mt-1" />
          <div className="mt-auto flex items-center gap-2">
            <SkBar className="h-[10px] w-[64px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A generic card skeleton — glass-panel with an optional title block + body lines.
 *  The `space-y-3` after the title block is the real header's own `mb-3` (16px), so a
 *  titled ghost is 20 (p-4) + 32 (SkTitle) + 16 = 68px to its first body line, exactly
 *  what `<AdminCard title sw>` renders. ⚠️ `title={false}` for the 67 untitled cards. */
export function SkCard({
  lines = 3,
  titleW = "w-40",
  title = true,
  sw = true,
  className = "",
}: {
  lines?: number;
  titleW?: string;
  title?: boolean;
  /** The Swahili gloss line. True on 129 of the console's 130 titled cards. */
  sw?: boolean;
  className?: string;
}) {
  return (
    <div className={`glass-panel p-4 space-y-3 ${className}`}>
      {title && <SkTitle titleW={titleW} sw={sw} />}
      {Array.from({ length: lines }).map((_, i) => (
        <SkBar key={i} className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

/** A form-card skeleton — a label+field stack (settings / grant / config pages).
 *  `cols` mirrors the REAL form's grid: a 3-up form skeletoned at the 2-up
 *  default wraps to a second row that the page does not have, and the swap then
 *  jumps by a whole field row (~76px). Pass the page's own grid classes. */
export function SkFormCard({
  fields = 3,
  titleW = "w-36",
  title = true,
  sw = true,
  cols = "sm:grid-cols-2",
  fieldH = 44,
  afterFields,
  className = "",
}: {
  fields?: number;
  titleW?: string;
  title?: boolean;
  sw?: boolean;
  cols?: string;
  /** 44 == `--h-input` / `--h-control-md` (`Input` with no size, or `size="md"`).
   *  Pass **40** where the page's fields are `Input size="sm"` — that rung became
   *  `--h-control-sm` (40) on 2026-08-29 by DG-A-04's dated ruling, input.tsx:60-67. */
  fieldH?: 40 | 44;
  /** A band the page's form renders BETWEEN its field grid and its submit — a nested
   *  settings panel, a consequence note. A slot, not a second card (§K5). */
  afterFields?: ReactNode;
  className?: string;
}) {
  return (
    /* ⚠️ NOT `space-y-4`. The real card's header→body gap is the AdminCard header's own
       `mb-3` (16px), and `space-y-4` is 20 — so the title block carries `mb-3` and the
       submit carries `mt-4` (20px, the gap this card already had between its field grid
       and its button). Two explicit margins, because one `space-y` cannot say both. */
    <div className={`glass-panel p-4 ${className}`}>
      {title && <SkTitle titleW={titleW} sw={sw} className="mb-3" />}
      <div className={`grid gap-4 ${cols}`}>
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <SkBar className="h-[10px] w-[96px]" />
            {/* ⛔ LITERAL, NOT `h-9` — the spacing scale is overridden
                (tailwind.config.ts:200-215) and `h-9` is 64px, so this placeholder was
                20px taller than the field it stands in for and the swap jumped on load. */}
            {/* ⛔ Both classes written OUT, not interpolated: Tailwind scans source text,
                so `h-[${fieldH}px]` would compile to nothing (§B8 — a dead class is a typo). */}
            <SkBar className={`w-full rounded-md ${fieldH === 40 ? "h-[40px]" : "h-[44px]"}`} />
          </div>
        ))}
      </div>
      {afterFields && <div className="mt-3">{afterFields}</div>}
      {/* Submit-button placeholder — 44px == --h-control-md, not `h-9` (64px). */}
      <SkBar className="h-[44px] w-[128px] rounded-md mt-4" />
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
  sw = true,
  sortable = false,
  pager = false,
  bodyMaxH = "",
  beforeBody,
  cellPy = 12,
}: {
  cols?: number;
  rows?: number;
  minWidth?: number;
  headW?: string;
  title?: boolean;
  sw?: boolean;
  /** The page's OWN height cap on the scroll box, verbatim — e.g.
   *  `"max-h-[calc(100vh-280px)]"`. Two of the console's 52 tables cap their box
   *  (players/page.tsx:199, staff/page.tsx:65) and there the row count stops deciding
   *  the card's height: without the cap a 20-row ghost draws ~890px for a box the page
   *  holds at ~620. Pass the class the page passes, never a re-typed approximation. */
  bodyMaxH?: string;
  /** The table's header row holds at least one `<SortTh>`. A sortable header CELL is
   *  44px, not 35: its anchor carries `min-h-[44px]` (admin-sort.tsx:160) and DG-A-17
   *  (landed 2026-08-29, commit `0d749dba`) zeroed the th's own vertical padding so the
   *  cell "lands on 44, which is a rung (`--h-control-md`)" — globals.css:3962-3974,
   *  re-measured on production 64.5 → 44.5. ⛔ That figure is 44, NOT the pre-fix 64. */
  sortable?: boolean;
  /** The card ends in an `<AdminPagination>`. ⛔ Only where the row source is unbounded
   *  in production: `pagination.tsx:105` returns null at `totalPages <= 1`, so on a queue
   *  that is normally under `PER_PAGE` (20) a forced pager ghost over-draws 77px, which
   *  is this row's own defect pointing the other way. */
  pager?: boolean;
  /** A band the page renders INSIDE this card between the header and the table — a
   *  filter toolbar, a chip strip, a search rail. ⭐ A SLOT rather than a second card,
   *  because that is what the page does: nesting one `glass-panel` inside another draws
   *  a border and a lamp the page has not got (§K5 — extend the kit, never fork it). */
  beforeBody?: ReactNode;
  /** The table's VERTICAL cell padding. 12 is `.admin-tbl`'s own rule (globals.css:3992)
   *  and the default. ⚠️ EIGHT admin pages override every cell to `p-3` — ai-polls,
   *  ai-usage, candidates, compliance, config, privacy, retention, sources — and 16px
   *  makes each row 52.5px rather than 44.5. Pass 16 there, or the ghost is 8px short on
   *  every row of an eight-page population. (A `SortTh` cell is unaffected either way:
   *  `.admin-tbl th[aria-sort]` is (0,2,0) and beats a `p-3` utility, so it stays 44.) */
  cellPy?: 12 | 16;
}) {
  return (
    <div className="glass-panel p-0">
      {title && (
        <div className="px-4 pt-4 pb-3">
          <SkTitle titleW={headW} sw={sw} />
        </div>
      )}
      {beforeBody}
      <SkTableRows
        cols={cols}
        rows={rows}
        minWidth={minWidth}
        sortable={sortable}
        cellPy={cellPy}
        maxH={bodyMaxH}
        className="px-4 pb-4"
      />
      {pager && <SkPager />}
    </div>
  );
}

/**
 * Just the ROWS of a table ghost — a header row and N body rows inside a horizontal
 * scroll box at the real min-width. `SkTableCard` is this plus a flush card around it;
 * this is exported separately for the handful of pages that put a table inside a
 * PADDED card (privacy's on-behalf export, ai-usage's meters), so those loaders extend
 * the kit instead of re-typing the row markup — §K5, and the reason the row height is
 * right in one place rather than nearly right in six.
 */
export function SkTableRows({
  cols = 5,
  rows = 8,
  minWidth = 640,
  sortable = false,
  cellPy = 12,
  maxH = "",
  className = "",
}: {
  cols?: number;
  rows?: number;
  minWidth?: number;
  sortable?: boolean;
  cellPy?: 12 | 16;
  /** The page's own height cap on the scroll box, verbatim. See `SkTableCard.bodyMaxH`. */
  maxH?: string;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto ${maxH ? `${maxH} overflow-y-auto` : ""} ${className}`}>
      <div style={{ minWidth }}>
        {/* Header row. A plain `.admin-tbl th` is `padding: 10px 16px` (globals.css:3991)
            around `--type-label` 9.5px at the inherited `line-height: 1.5` = 14.25px, plus
            the thead's 1px bottom border: 35.25px. A sortable one is its anchor's 44 + 1. */}
        <div
          className={`flex items-center gap-4 border-b border-border ${
            sortable ? "min-h-[44px]" : cellPy === 16 ? "py-[16px]" : "py-[10px]"
          }`}
        >
          {Array.from({ length: cols }).map((_, i) => (
            <SkBar key={i} className="h-[14px] flex-1 max-w-[84px]" />
          ))}
        </div>
        {/* Body rows. `.admin-tbl td` is `padding: 12px 16px` (globals.css:3992) around
            `--type-small` 13px × 1.5 = 19.5px, plus the row's 1px border: 44.5px — the
            "dense row 44px" the admin design gate names. ⛔ It was `py-3` + `h-3` = 49,
            5px too tall on EVERY row of every table in the console. */}
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className={`flex items-center gap-4 border-b border-dashed border-border-subtle last:border-b-0 ${
              cellPy === 16 ? "py-[16px]" : "py-[12px]"
            }`}
          >
            {Array.from({ length: cols }).map((_, i) => (
              <SkBar key={i} className="h-[19.5px] flex-1 max-w-[110px]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The pager ghost. `<AdminPagination>` renders
 * `px-4 py-3 border-t` around `h-[44px]` controls (pagination.tsx:130, :157) — 16 + 44 +
 * 16 + 1 = **77px** on one line. There was no pager ghost anywhere in the console: a grep
 * for "Pagination" across all 47 `loading.tsx` returned zero, against 27 admin pages that
 * import `AdminPagination`, so every one of those tables jumped 77px on load.
 * ⚠️ It is CONDITIONAL in the real component — `totalPages <= 1` renders nothing — which
 * is why `SkTableCard` takes `pager` rather than always drawing one.
 */
export function SkPager() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 border-t border-border">
      <SkBar className="h-[14px] w-[128px]" />
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkBar key={i} className="h-[44px] w-[44px] rounded-md" />
        ))}
      </div>
    </div>
  );
}

/**
 * Row-list card skeleton — a titled glass-panel holding N bordered rows, each a
 * two-line label on the left and `controls` control-sized placeholders on the
 * right. This is the shape of every toggle/grant list in the console (the role
 * matrix at /admin/roles, the source toggles), and it is NOT <SkCard>: a
 * <SkCard> line is a 12px bar, while one of these rows is a ~50px bordered box,
 * so ghosting a 7-row list with SkCard(lines=7) is ~240px short PER CARD.
 *
 * `rowH` is the real row height in px — measure it, don't guess: it is the
 * content height (e.g. body-sm 18 + micro 14) plus the row's own padding and
 * borders, and `min-h` is border-box here.
 */
export function SkRowCard({
  rows = 6,
  rowH = 50,
  controls = 0,
  titleW = "w-40",
  sw = true,
  className = "",
}: {
  rows?: number;
  rowH?: number;
  controls?: number;
  titleW?: string;
  sw?: boolean;
  className?: string;
}) {
  return (
    <div className={`glass-panel p-4 ${className}`}>
      <SkTitle titleW={titleW} sw={sw} className="mb-3" />
      <div className="grid grid-cols-1 gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-bg-overlay px-3"
            style={{ minHeight: rowH }}
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <SkBar className="h-3 w-[128px]" />
              <SkBar className="h-[10px] w-full max-w-[280px]" />
            </div>
            <div className="flex shrink-0 items-center gap-4">
              {Array.from({ length: controls }).map((_, c) => (
                /* 44×26 == the Toggle's own box (ui/toggle.tsx), not a guess. */
                <SkBar key={c} className="h-[26px] w-[44px] rounded-pill" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A tall block placeholder — for chart cards / client-owned regions whose inner
 *  shape isn't known to the loader (matches AdminBlock height rhythm). */
export function SkBlock({ height = 240, className = "" }: { height?: number; className?: string }) {
  return (
    <div
      className={`glass-panel ${className}`}
      style={{ minHeight: height }}
    />
  );
}
