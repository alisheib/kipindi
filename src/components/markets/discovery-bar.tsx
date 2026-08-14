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
 * would cost: every filter combination is a real shareable URL, the board still works with no
 * JavaScript, and the counts are computed on the server against the SAME cached board read the
 * grid uses — so a count can never disagree with the grid it sits above. Client islands are
 * used only where the interaction genuinely needs one (density, which is pure presentation).
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
  type DiscoveryState,
  type OddsId,
  type PoolId,
  type SortId,
  type StatusId,
} from "@/lib/markets/discovery";
import type { Dict } from "@/lib/i18n-dict";
import { MenuShell } from "./menu-shell";

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

      {/* ── row 2 · sort + direction · odds · pool · topic · clear ──────────────────────
          🔴 THE TWO `<details>` MENUS MUST NOT SIT INSIDE A HORIZONTALLY SCROLLING BOX.
          Measured on production 2026-08-13: they did, and both were unusable on a phone. A box
          that scrolls on one axis cannot let a child escape on the other — CSS coerces
          `overflow-y: visible` to `auto` the moment `overflow-x` scrolls — so the listbox panel
          (274px for sort, 362px for topic) was clipped by the 62px strip to a FOUR-PIXEL sliver:
          1% of the panel, 0 of 6 sort options and 0 of 8 topics reachable at 360px.
          ⛔ Every automated check passed while that was true — zero horizontal overflow, every
          tap target 44px, no element overflowing its own box, and the closed menus look correct
          in a screenshot. Only OPENING the control found it.
          So the layout is now: the chips keep the scrolling strip (that is what fixed the 448px
          wrapped bar), and the menus live outside it. `order-*` puts sort and topic together on
          the first mobile line while the DOM keeps the kit's sort → odds → pool → topic order,
          and `lg:contents` dissolves the strip at desktop so the row is byte-identical to before
          this fix. Still no JavaScript: `<details>` opens natively either way.

          ⭐ MOBILE IS A ONE-COLUMN GRID, so the four groups stack in the kit's own
          sort → odds → pool → topic order with no placement classes and no reordering. Two
          arrangements were measured at 360 and rejected: sort and topic sharing a line fits in
          168px but truncates the Swahili sort value mid-word ("Zinazofunga kwa") and squeezes the
          fused direction button to nothing, and flex-wrap cannot help because it breaks a line
          BEFORE it shrinks. Stacked costs 52px of sticky height and every control reads in full,
          which is the trade this surface should make.
          ⬜ The kit's own mobile answer is a filter SHEET behind one button
          (`05-markets-discovery-mobile.html`), which would take the bar back under 120px. It is
          not built here — recorded in PLAN-OF-RECORD §8.8 with this measurement, not dropped. */}
      <div className="grid grid-cols-1 justify-items-start gap-y-1.5 pb-2.5 pt-1.5 lg:flex lg:flex-wrap lg:items-center lg:gap-x-2">
        {/* Sort. ⛔ NO GOLD — sort is view state, and the kit's own round-2 final withdrew the
            gilt shell it had proposed. Gold is money on this platform (test:gold-is-money). */}
        <div className="flex max-w-full items-center">
          <MenuShell
            label={t.common.sort}
            value={SORT_LABEL[state.sort]}
            ariaLabel={t.market.sortAria}
            className="rounded-l-pill rounded-r-none border-r-0"
          >
            {SORT_IDS.map((s) => (
              <Link
                key={s}
                href={href({ sort: s, dir: null }) as never}
                replace
                scroll={false}
                role="option"
                aria-selected={state.sort === s}
                /* The selected fill is `.kp-fopt[data-on]` in globals.css — the same token the
                   selected pill uses, so a menu row and a chip can never drift apart. */
                data-on={state.sort === s || undefined}
                className={cn(
                  "kp-fopt flex min-h-[44px] items-center justify-between gap-4 px-3 text-[13px] font-semibold",
                  state.sort === s ? "text-text" : "text-text-muted hover:bg-bg-overlay hover:text-text",
                )}
              >
                {SORT_LABEL[s]}
                <span className="font-mono text-[11px] text-text-faint">
                  {SORT_NATURAL_DIR[s] === "asc" ? "↑" : "↓"}
                </span>
              </Link>
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

        {/* The group dividers are a desktop device: on a phone the groups already sit on their
            own line, and a 1px rule between two scrolled strips reads as a glitch. */}
        <span aria-hidden className="mx-0.5 hidden h-5 w-px shrink-0 bg-border lg:block" />

        {/* The chips keep the scrolling strip — that is what took the bar from 448px to 116px in
            Swahili. `lg:contents` removes this box at desktop so odds and pool become direct
            children of the row again, exactly as they were before the menus moved out. */}
        <div className="kp-thin-scroll kp-strip-fade flex w-full items-center gap-x-2 overflow-x-auto lg:contents">
        {/* ⚠️ THE GROUP KEY IS LOAD-BEARING, NOT DECORATION. Odds and pool each open with an
            "Any" chip, so without a visible key the bar renders two identical "Any" pills side
            by side and neither says what it clears. The key uses the same quiet mono treatment
            as the sort and topic menus, so all four groups read as one family. */}
        <nav aria-label={t.market.oddsAria} className="flex shrink-0 items-center gap-1">
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

        <nav aria-label={t.market.poolAria} className="flex shrink-0 items-center gap-1">
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

        </div>

        <span aria-hidden className="mx-0.5 hidden h-5 w-px shrink-0 bg-border lg:block" />

        {/* Topic is ONE menu, not eight pills. The kit flipped this twice; correction round 2.6
            — the LAST one — replaced the eight-pill wall with a single menu, and "round 2 final"
            means the last round wins. It is also single-select: DISCOVERY-RATIONALE rejects
            multi-select by name ("doubles the state space"). */}
        {/* Topic and Clear share one grid cell so pressing a filter never grows the sticky bar by
            another 52px on a phone — it measured 272px with Clear on its own row, past the 260px
            ceiling the mobile guard holds. `lg:contents` returns both to the desktop row, where
            Clear keeps its `lg:ml-auto` and sits at the far end. */}
        <div className="flex max-w-full items-center gap-x-2 lg:contents">
        <MenuShell
          rootClassName="max-w-full"
          label={t.common.topic}
          value={topics.find((x) => x.id === state.topic)?.label ?? t.market.catAll}
          count={counts.topic[state.topic]}
          ariaLabel={t.market.topicAria}
          className="rounded-pill"
        >
          {topics.map((tp) => (
            <Link
              key={tp.id}
              href={href({ topic: tp.id }) as never}
              replace
              scroll={false}
              role="option"
              aria-selected={state.topic === tp.id}
              data-on={state.topic === tp.id || undefined}
              className={cn(
                "kp-fopt flex min-h-[44px] items-center justify-between gap-4 px-3 text-[13px] font-semibold",
                state.topic === tp.id ? "text-text" : "text-text-muted hover:bg-bg-overlay hover:text-text",
              )}
            >
              <span className="truncate">{tp.label}</span>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-text-faint">
                {counts.topic[tp.id] ?? 0}
              </span>
            </Link>
          ))}
        </MenuShell>

        {active && (
          <Link
            href={buildDiscoveryHref(clearedState(state)) as never}
            replace
            scroll={false}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-pill px-3 text-[13px] font-semibold text-text-muted hover:text-text lg:ml-auto"
          >
            <I.x s={14} aria-hidden />
            {t.market.clearAll}
          </Link>
        )}
        </div>
      </div>
    </div>
  );
}
