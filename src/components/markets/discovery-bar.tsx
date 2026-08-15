/**
 * The /markets discovery bar — the sticky two-row control surface that replaced the
 * thirteen-button vertical rail (5 WHEN pills + 8 TOPIC pills, `markets/page.tsx:135-221`).
 *
 * Inherited from the round-2 kit (README §3, COMPONENTS §3/§4/§5/§6/§8) and reconciled in
 * `design-brief/PLAN-OF-RECORD.md` §8.
 *
 * ⭐ WHY THIS IS SERVER-RENDERED LINKS, NOT CLIENT STATE. The kit asks for a server-renderable
 * URL contract and for `replaceState` writes ("a filter is not a navigation"). `<Link replace
 * scroll={false}>` is exactly `replaceState`, and it keeps three properties the client version
 * would cost: every filter combination is a real shareable URL, every control is a real anchor
 * that needs no JavaScript to apply a filter, and the counts are computed on the server against
 * the SAME cached board read the grid uses — so a count can never disagree with the grid it sits
 * above. Client islands are used only where the interaction genuinely needs one.
 *
 * 🔴 THIS COMMENT USED TO SAY "the board still works with no JavaScript". IT DOES NOT, AND HAS
 * NOT SINCE IT WAS BUILT. Measured 2026-08-15 with scripts disabled, on **production** as well as
 * locally: the board streams through a Suspense boundary, React relocates streamed content with
 * an inline `<script>`, and with scripts off that never runs — `.kp-discovery-bar` measures 0px
 * inside a `display: none` `div#S:3`, cards sitting in `<template>`s. ⛔ It mattered: that
 * sentence was the stated reason batch 1 chose scrolling strips over the kit's filter SHEET, a
 * trade made on a premise nobody had measured. The markup being native is still worth keeping —
 * it is what makes the page recoverable if the streaming ever changes — but it is not the same
 * claim. `qa:discovery-board` now prints what a scripts-off browser actually sees.
 *
 * ⛔ Every href comes from `buildDiscoveryHref`. Never hand-assemble a query string here — the
 * page this replaces had four independent builders and one of them had drifted.
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { FilterPill, FilterGroupKey } from "@/components/ui/filter-pill";
import { cn } from "@/lib/utils";
import {
  ODDS_IDS,
  POOL_IDS,
  SORT_IDS,
  STATUS_IDS,
  SORT_NATURAL_DIR,
  buildDiscoveryHref,
  clearedState,
  effectiveDir,
  hasActiveFilters,
  sheetFilterCount,
  type DiscoveryState,
  type OddsId,
  type PoolId,
  type SortId,
  type StatusId,
} from "@/lib/markets/discovery";
import type { Dict } from "@/lib/i18n-dict";
import { MenuShell } from "./menu-shell";
import { FilterSheet, FilterSheetGroup } from "./filter-sheet";

/* ───────────────────────────────────── the chip ───────────────────────────────────────── */

/**
 * ⭐ THE CHIP LEFT THIS FILE IN BATCH 5 (2026-08-14). It is now
 * `src/components/ui/filter-pill.tsx`, and it is the control EVERY player filter rail renders —
 * `/results`, `/positions`, `/proposals`, `/updown`, `/updown/history`, `/profile/activity`,
 * `/profile/account`. Read that file's header for the governing rule and the 44px note; both
 * moved with it rather than being restated here, because a rule in two places drifts.
 *
 * 🔴 AND THE EXTRACTION FIXED THE REFERENCE, IT DID NOT COPY IT. The chip this bar shipped
 * carried `style={{ background: "var(--pill-active)", boxShadow: "var(--glow-selected)" }}` —
 * a law-82 breach (a paint value at the call site) on the very surface the other five were
 * told to match. Five of them had duly copied the inline-style habit. The selected fill now
 * lives in `.kp-fchip[data-on]` in `globals.css`, one definition site for the whole product.
 *
 * ⛔ `test:design-frozen` never saw any of this: its rules are exempted by any line containing
 * `var(--`, and every one of those inline styles did. A green ratchet was not evidence.
 *
 * A thin local wrapper survives only to bind this bar's two invariants — `replace scroll=false`
 * ("a filter is not a navigation") and `aria-pressed` (the semantics these chips have always
 * shipped) — so no call site below can forget either.
 */
function Chip(props: {
  href: string;
  label: string;
  count?: number;
  pressed: boolean;
  glyph?: React.ReactNode;
  title?: string;
  /** "axis:value" — lets a driver read the promised count and press exactly this control. */
  testId?: string;
  /** Layout only, for the sheet's `1fr 1fr` topic grid (kit COMPONENTS §21). ⛔ Never paint
   *  through this — the selected fill is `.kp-fchip[data-on]`, one definition site (law 82). */
  className?: string;
}) {
  const { pressed, ...rest } = props;
  return <FilterPill {...rest} on={pressed} semantics="toggle" replace scroll={false} />;
}

/* ─────────────────────────────────────── the bar ──────────────────────────────────────── */

export type DiscoveryCounts = {
  status: Record<StatusId, number>;
  odds: Record<OddsId, number>;
  pool: Record<PoolId, number>;
  topic: Record<string, number>;
};

export function DiscoveryBar({
  state,
  counts,
  resultCount,
  topics,
  t,
  signedIn,
}: {
  state: DiscoveryState;
  counts: DiscoveryCounts;
  /** The pager total. Same value, same source — the kit's no-drift contract. */
  resultCount: number;
  topics: Array<{ id: string; label: string }>;
  t: Dict;
  signedIn: boolean;
}) {
  const href = (patch: Partial<DiscoveryState>) => buildDiscoveryHref(state, patch);
  const dir = effectiveDir(state);
  const active = hasActiveFilters(state);

  const STATUS_LABEL: Record<StatusId, string> = {
    open: t.market.statusOpen,
    today: t.market.statusClosingToday,
    new: t.market.statusNew,
    watch: t.market.statusWatching,
    all: t.market.statusAll,
  };
  const SORT_LABEL: Record<SortId, string> = {
    closing: t.market.sortClosing,
    pool: t.market.sortPool,
    people: t.market.sortPeople,
    close: t.market.sortClose,
    move: t.market.sortMove,
    new: t.market.sortNew,
  };
  const ODDS_LABEL: Record<OddsId, string> = {
    any: t.market.oddsAny,
    call: t.market.oddsCall,
    cont: t.market.oddsCont,
    long: t.market.oddsLong,
  };
  const POOL_LABEL: Record<PoolId, string> = {
    any: t.market.poolAny,
    "10k": t.market.pool10k,
    "50k": t.market.pool50k,
  };

  // A signed-out player has no server-side watchlist, so the segment would always read 0.
  // Offering a control that cannot be anything but empty is a dead end, not a filter.
  const statuses = STATUS_IDS.filter((s) => s !== "watch" || signedIn);

  /* The phrase the bar, the pager and the sheet's dismiss button all read — ONE variable, so
     the number a player leaves the sheet with is the number they arrive at. */
  const resultPhrase =
    resultCount === 1 ? t.market.oneResult : t.market.nResults.replace("{n}", String(resultCount));
  const sheetCount = sheetFilterCount(state);

  /**
   * One flat option row — the shape shared by the desktop menus and the mobile sheet.
   *
   * ⭐ EXTRACTED IN BATCH 6 because it had already been written twice in this file (sort and
   * topic), and the sheet would have made it four. The selected fill is `.kp-fopt[data-on]` in
   * globals.css — the same token the selected pill uses, so a menu row, a sheet row and a chip
   * can never drift apart.
   */
  const Opt = ({
    href: optHref,
    on,
    children,
    trailing,
  }: {
    href: string;
    on: boolean;
    children: React.ReactNode;
    trailing?: React.ReactNode;
  }) => (
    <Link
      href={optHref as never}
      replace
      scroll={false}
      role="option"
      aria-selected={on}
      data-on={on || undefined}
      className={cn(
        "kp-fopt flex min-h-[44px] items-center justify-between gap-4 px-3 text-[13px] font-semibold",
        on ? "text-text" : "text-text-muted hover:bg-bg-overlay hover:text-text",
      )}
    >
      {children}
      {trailing}
    </Link>
  );

  /* `Clear all`, shared by both layouts. On a phone it lives in the sheet's footer rather than
     beside the result count: the kit puts it on the count line, but at 360 in Swahili
     "Futa zote" lands hard against "masoko 40" — the exact collision §8.7c removed from the
     status strip ("Mpymasoko 40"). Same control, one line lower, no width fight. */
  const clearAll = active ? (
    <Link
      href={buildDiscoveryHref(clearedState(state)) as never}
      replace
      scroll={false}
      className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-pill px-3 text-[13px] font-semibold text-text-muted hover:text-text lg:ml-auto"
    >
      <I.x s={14} aria-hidden />
      {t.market.clearAll}
    </Link>
  ) : null;

  return (
    /**
     * ⚠️ MOBILE SCROLLS, IT DOES NOT WRAP — and this was measured, not assumed.
     *
     * Built wrapping first, the bar rendered **448px tall at 360 in Swahili and Chinese**:
     * eleven controls stacked into six rows, sticky, eating 57% of a 780px phone viewport
     * before a single card was visible. Swahili short labels measure 1.74× p90 / 2.25× p95
     * against English, so the wrap is worst exactly where the audience is.
     *
     * Each row is therefore ONE horizontally-scrollable strip below `lg` and wraps normally
     * above it. That is the codebase's existing answer to the same problem — the rail this bar
     * replaced scrolled its groups the same way — and it keeps every control reachable with no
     * JavaScript, unlike the kit's mobile filter sheet. The strips bleed to the viewport edge
     * (`-mx-3 px-3`) so a half-visible chip signals "more this way".
     */
    <div data-filter-rail className="kp-discovery-bar sticky top-[56px] z-20 -mx-3 bg-bg-base px-3 lg:-mx-6 lg:px-6">
      {/* ── row 1 · status · count ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-x-3 pt-2.5">
        <nav
          aria-label={t.market.statusAria}
          /* ⚠️ NO EDGE BLEED. `-mx-3 px-3` used to run both strips 16px past the content box so a
             half-visible chip would signal "more this way". It cost more than it bought: on the
             right it ate the whole gap before the result count, so a clipped chip landed hard
             against it and "Mpya" + "masoko 40" rendered as one broken word; and the bleed made
             the row overflow its own container by 16px. `.kp-strip-fade` now carries the
             "there is more this way" signal properly, so the strips sit inside the content box
             and nothing overflows. */
          className="kp-thin-scroll kp-strip-fade flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pr-2 lg:flex-wrap lg:overflow-visible lg:pr-0"
        >
          {statuses.map((s) => (
            <Chip
              key={s}
              href={href({ status: s })}
              label={STATUS_LABEL[s]}
              count={counts.status[s]}
              pressed={state.status === s}
              testId={`status:${s}`}
            />
          ))}
        </nav>

        {/* The pager total and this number are the SAME value — never recomputed.
            ⬜ DEFERRED, deliberately: the kit's density toggle sits here. It promises a
            "compact list view" that is a genuinely different DOM — role="table", role="row",
            seven columns with their own hide points (COMPONENTS §5). A toggle carrying that
            label while only restyling the cards would be a false promise, so it is recorded as
            an open item in PLAN-OF-RECORD §8.8 rather than half-built. */}
        <p aria-live="polite" data-result-count={resultCount} className="shrink-0 font-mono text-[11.5px] tabular-nums text-text-subtle">
          {resultCount === 1 ? t.market.oneResult : t.market.nResults.replace("{n}", String(resultCount))}
        </p>
      </div>

      {/* ── row 2 · sort + direction, then EITHER the phone sheet OR the desktop groups ──
          ⭐ BATCH 6. These groups used to stack here as a one-column grid: correct, readable, and
          **214px of sticky bar at 360×780 before a single market was visible**. The kit's mobile
          answer (`layouts/05-markets-discovery-mobile.html`, COMPONENTS §21) puts odds, pool and
          topic behind one `Filters` button and takes the bar back under 120px.

          ⭐ SORT AND STATUS STAY IN THE BAR AT EVERY WIDTH — the kit's ruling, not a convenience:
          *"they answer the first two questions a punter has and must never cost a tap"*
          (COMPONENTS §21, and again in SPEC's responsive table, README §discovery and
          DISCOVERY-RATIONALE). The sheet holds exactly three groups, which is what §21 lists.
          ⚠️ PLAN-OF-RECORD §8.8 read as though sort belonged inside the sheet. Its actual concern
          was that sort and topic must not become NESTED `<details>` in there — §8.7c's 4px
          listbox — not that sort should leave the bar. The kit is followed and §8.8 is corrected,
          rather than leaving two documents to disagree.

          🔴 AND THE MENU MUST NOT SIT INSIDE A HORIZONTALLY SCROLLING BOX. Measured on production
          2026-08-13: sort and topic did, and both were unusable on a phone. A box that scrolls on
          one axis cannot let a child escape on the other — CSS coerces `overflow-y: visible` to
          `auto` the moment `overflow-x` scrolls — so the 274px sort panel and the 362px topic
          panel were clipped by a 62px strip to a FOUR-PIXEL sliver: 1% of the panel, 0 of 6 sort
          options and 0 of 8 topics reachable at 360px. ⛔ Every automated check passed while that
          was true; only OPENING the control found it. This row WRAPS, it does not scroll, on
          either axis — which is what lets sort keep its panel here at every width. */}
      <div className="flex flex-wrap items-center gap-x-2 pb-2.5 pt-1.5">
        {/* ⛔ NO GOLD — sort is view state, and the kit's round-2 final withdrew the gilt shell it
            had proposed. Gold is money on this platform (test:gold-is-money). */}
        <div className="flex min-w-0 flex-1 items-center lg:flex-none">
          <MenuShell
            /* At 360 sort shares its line with the Filters button, so it is the control that
               gives: the KEY never truncates and the VALUE ellipsises, which is MenuShell's own
               rule. ⛔ An ellipsis is not a defect — the hidden tail IS the "…" — but the amount
               hidden in Swahili is reported by `qa:filter-scan` so a person can judge it. */
            rootClassName="min-w-0 shrink"
            label={t.common.sort}
            value={SORT_LABEL[state.sort]}
            ariaLabel={t.market.sortAria}
            className="min-w-0 rounded-l-pill rounded-r-none border-r-0"
          >
            {SORT_IDS.map((s) => (
              <Opt key={s} href={href({ sort: s, dir: null })} on={state.sort === s}
                trailing={
                  <span className="font-mono text-[11px] text-text-faint">
                    {SORT_NATURAL_DIR[s] === "asc" ? "↑" : "↓"}
                  </span>
                }
              >
                {SORT_LABEL[s]}
              </Opt>
            ))}
          </MenuShell>
          {/* Direction is fused to the sort control's right edge (COMPONENTS §4). Choosing a
              new sort resets direction to null — that is why the options above pass dir:null. */}
          <Link
            href={href({ dir: dir === "asc" ? "desc" : "asc" }) as never}
            replace
            scroll={false}
            aria-label={dir === "asc" ? t.market.sortedAsc : t.market.sortedDesc}
            title={dir === "asc" ? t.market.sortedAsc : t.market.sortedDesc}
            className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-r-pill border border-border-control bg-bg-inset text-text-muted hover:text-text"
          >
            <span
              aria-hidden
              className="kp-sortdir inline-block font-mono text-[13px] leading-none"
              data-dir={dir}
            >
              ↑
            </span>
          </Link>
        </div>

        {/* ── PHONE · odds, pool and topic behind one button (kit COMPONENTS §21) ──────────
            ⛔ EVERYTHING IN HERE IS A PILL. §21 lists the sheet's groups as "Odds, Pool size,
            Topic (a 1fr 1fr grid of chips)" — so topic arrives as chips rather than as the
            desktop row's menu, which also means the sheet contains no nested disclosure to be
            clipped by its own scrolling body (§8.7c). One control language, one primitive. */}
        <FilterSheet
          label={t.market.filtersOpen}
          title={t.market.filtersTitle}
          ariaLabel={
            sheetCount > 0
              ? t.market.filtersAriaN.replace("{n}", String(sheetCount))
              : t.market.filtersOpen
          }
          closeLabel={t.market.filtersClose}
          applyLabel={t.market.filtersApply.replace("{n}", resultPhrase)}
          count={sheetCount}
          footer={clearAll}
        >
          <FilterSheetGroup label={t.market.oddsKey}>
            {ODDS_IDS.map((o) => (
              <Chip key={o} href={href({ odds: o })} label={ODDS_LABEL[o]} count={counts.odds[o]}
                pressed={state.odds === o} testId={`odds:${o}`} />
            ))}
          </FilterSheetGroup>

          <FilterSheetGroup label={t.market.poolKey}>
            {POOL_IDS.map((p) => (
              <Chip key={p} href={href({ pool: p })} label={POOL_LABEL[p]} count={counts.pool[p]}
                pressed={state.pool === p} testId={`pool:${p}`} />
            ))}
          </FilterSheetGroup>

          {/* Topic stays SINGLE-select — DISCOVERY-RATIONALE rejects multi-select by name
              ("doubles the state space"). A grid rather than a wrap, so eight topics read as a
              block: §21's figure is `1fr 1fr`, which is what `minmax(148px, 1fr)` gives at the
              390px the kit drew.
              🔴 IT WAS A LITERAL `grid-cols-2` AND THAT WAS WRONG ABOVE THE PHONE. Read at 768:
              two columns meant two ~380px cells, and a pill stretched to fill one stops looking
              like a pill and starts looking like a button bar. `auto-fill` keeps the cell the
              size of a control instead of the size of the sheet, so the same rule gives 2 columns
              at 360 and 4 at 768. ⛔ And the pills size to their content (`justify-self-start`),
              never to the cell — a filter pill's width is its label, at every width. */}
          <FilterSheetGroup
            label={t.common.topic}
            className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-1.5"
          >
            {topics.map((tp) => (
              <Chip key={tp.id} href={href({ topic: tp.id })} label={tp.label}
                count={counts.topic[tp.id] ?? 0} pressed={state.topic === tp.id}
                testId={`topic:${tp.id}`} className="justify-self-start" />
            ))}
          </FilterSheetGroup>
        </FilterSheet>

        {/* ── DESKTOP · the same three groups, laid out along the bar ─────────────────────
            ⚠️ THE GROUP KEY IS LOAD-BEARING, NOT DECORATION. Odds and pool each open with an
            "Any" chip, so without a visible key the bar renders two identical "Any" pills side
            by side and neither says what it clears. The key uses the same quiet mono treatment
            as the sort and topic menus, so all four groups read as one family. */}
        <span aria-hidden className="mx-0.5 hidden h-5 w-px shrink-0 bg-border lg:block" />

        <nav aria-label={t.market.oddsAria} className="hidden shrink-0 items-center gap-1 lg:flex">
          <FilterGroupKey>{t.market.oddsKey}</FilterGroupKey>
          {ODDS_IDS.map((o) => (
            <Chip
              key={o}
              href={href({ odds: o })}
              label={ODDS_LABEL[o]}
              count={counts.odds[o]}
              pressed={state.odds === o}
              testId={`odds:${o}`}
            />
          ))}
        </nav>

        <span aria-hidden className="mx-0.5 hidden h-5 w-px shrink-0 bg-border lg:block" />

        <nav aria-label={t.market.poolAria} className="hidden shrink-0 items-center gap-1 lg:flex">
          <FilterGroupKey>{t.market.poolKey}</FilterGroupKey>
          {POOL_IDS.map((p) => (
            <Chip
              key={p}
              href={href({ pool: p })}
              label={POOL_LABEL[p]}
              count={counts.pool[p]}
              pressed={state.pool === p}
              testId={`pool:${p}`}
            />
          ))}
        </nav>

        <span aria-hidden className="mx-0.5 hidden h-5 w-px shrink-0 bg-border lg:block" />

        {/* Topic is ONE menu HERE, not eight pills. The kit flipped this twice; correction round
            2.6 — the LAST one — replaced the eight-pill wall with a single menu, and "round 2
            final" means the last round wins.
            ⚠️ IN THE SHEET IT IS CHIPS, and that is not a contradiction: §21 specifies "Topic (a
            1fr 1fr grid of chips)" for the sheet, because a menu inside a scrolling sheet is the
            nested disclosure §8.7c forbids. Same axis, same single-select, two layouts — which is
            exactly what a responsive design is. */}
        <MenuShell
          rootClassName="hidden max-w-full lg:block"
          label={t.common.topic}
          value={topics.find((x) => x.id === state.topic)?.label ?? t.market.catAll}
          count={counts.topic[state.topic]}
          ariaLabel={t.market.topicAria}
          className="rounded-pill"
        >
          {topics.map((tp) => (
            <Opt key={tp.id} href={href({ topic: tp.id })} on={state.topic === tp.id}
              trailing={
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-text-faint">
                  {counts.topic[tp.id] ?? 0}
                </span>
              }
            >
              <span className="truncate">{tp.label}</span>
            </Opt>
          ))}
        </MenuShell>

        {/* `Clear all` sits at the end of the desktop row. On a phone it is the sheet's footer
            button instead — the kit's own placement, and it costs the bar no height. */}
        <span className="hidden lg:contents">{clearAll}</span>
      </div>
    </div>
  );
}
