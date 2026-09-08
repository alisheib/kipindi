/**
 * THE QUERY BAR — the control surface every player-facing list wears.
 *
 * ⭐ A player who learns this bar on `/positions` must already know it on `/wallet`. That is the
 * whole campaign: `/markets` shipped lifecycle lenses, a tri-state sort, cross-filtered counts, a
 * phone sheet and a named empty cause, and none of it was ever carried across to the pages where
 * a player looks at their own money. This file is where the shape now lives.
 *
 * ── WHAT THIS FILE IS, AND WHAT IT DELIBERATELY IS NOT ───────────────────────────────────────
 * ⛔ IT IS NOT A BAR THAT RENDERS YOUR PILLS FOR YOU, and that is a decision forced by a gate
 * that is right. `test:filter-language` §3.1/§3.2 require every declared filter surface to
 * IMPORT `filter-pill` and render `<FilterPill>` **in its own source**, and §0.5 requires each to
 * carry the `data-filter-rail` hook literally. A component that swallowed both would make every
 * page it served invisible to the gate — which is §6's named blind spot, built on purpose
 * instead of by accident. Re-derive the rules before changing this shape:
 *
 *     grep -n "3\.1 \|3\.2 \|0\.5 " scripts/filter-language.test.mts
 *
 * ⭐ SO IT OWNS THE MECHANISMS AND THE PAGE OWNS THE CONTROLS. Every class string, every
 * scrolling/auto-scroll behaviour, the sort+direction pairing, the option row and the result-count
 * contract are defined once here; the page writes its own `<FilterPill>`s inside them and carries
 * its own rail hook. A page ends up thin without becoming unreadable to the instruments.
 *
 * ⛔ `FilterSheet` and `MenuShell` DO NOT MOVE HOUSE. Guards are pinned to their current paths —
 * re-derive which, and do not trust a number in prose:
 *
 *     grep -rln "filter-sheet\|menu-shell" scripts/
 *
 * A guard pinned to a path stops guarding the moment the file moves, so this file imports both
 * where they already are.
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { StripAutoScroll } from "@/components/ui/strip-autoscroll";
import { MenuShell } from "@/components/markets/menu-shell";
import { cn } from "@/lib/utils";
import type { SortDir } from "@/lib/query/sort";

/**
 * The sticky wrapper's class, in one place.
 *
 * ⚠️ THE NAME STAYS `kp-discovery-bar` THOUGH THIS IS NO LONGER ONLY `/markets`, and renaming it
 * would be a silent breakage rather than a tidy-up: `globals.css` keys two load-bearing rules off
 * that exact selector — the `:has(.kp-fsheet[open])` lift that puts the bar above the `z-40`
 * bottom nav, and the `html[data-sheet-open]` fallback for browsers without `:has()` — and
 * `test:filter-language` §5.9/§5.10 assert both by name. A page that adopts this class inherits
 * the working sheet stacking; a page that invents its own opens its sheet UNDERNEATH the
 * navigation, with a scrim you can tap through.
 *
 * ⚠️ `top-[56px]` is the app header's height. Arbitrary value on purpose — this repo overrides
 * Tailwind's spacing scale, so a scale class here is silently the wrong number.
 */
export const QUERY_BAR_CLASS =
  "kp-discovery-bar sticky top-[56px] z-20 -mx-3 bg-bg-base px-3 lg:-mx-6 lg:px-6";

/**
 * ⭐ THE SAME BAR, NOT STICKY — for a rail that filters ONE PANEL rather than the page.
 *
 * 🔴 FOUND BY `qa:bar-geometry` ON `/profile/account`, and it is the defect that driver's fourth
 * assertion exists for, arriving from a new direction. Measured at 1280: `bar@-93` — the bar had
 * scrolled clean off the top. Its parent is a `glass-panel` section holding the activity heading,
 * the table and the pager, and **a sticky element only sticks within its PARENT's box**, so it
 * unpinned the moment that panel scrolled away. The same sentence that explains `/updown/history`'s
 * `bar@-252`.
 *
 * ⛔ AND THE FIX IS NOT TO HOIST IT OUT OF THE PANEL. `/profile/account` is FIVE panels — profile,
 * activity, export, privacy, close account — and this rail filters exactly one table inside one of
 * them. A page-level sticky band would follow the reader down and hover over *Close account*,
 * which is a one-way ceremony: a filter for a table you can no longer see, sitting on top of the
 * most dangerous control on the page. ⛔ The bar is right to be scoped; what was wrong was
 * claiming an offset it cannot hold.
 *
 * ⚠️ IT IS A SECOND CONSTANT AND NOT A PROP, deliberately: `test:filter-language` §5.9/§5.10 key
 * the sheet-stacking rules off the `kp-discovery-bar` class by name, so a panel-scoped bar must
 * keep that class and lose only the position. ⛔ The surface must also DECLARE itself non-sticky
 * in `scripts/live/bar-geometry-drive.mjs`, or that driver will keep asserting an offset this bar
 * does not promise.
 */
export const QUERY_BAR_CLASS_PANEL =
  "kp-discovery-bar relative z-20 -mx-2 bg-bg-base px-2";

/** Row 1 — the lens strip and the result count. Row 2 — sort, then filters. */
export const QUERY_BAR_ROW1_CLASS = "flex items-center gap-x-3 pt-2.5";
export const QUERY_BAR_ROW2_CLASS = "flex flex-wrap items-center gap-x-2 pb-2.5 pt-1.5";

/**
 * The LENS strip — rank-primary pills, scrolling below `lg`, wrapping above it.
 *
 * ⚠️ IT SCROLLS, IT DOES NOT WRAP, AND THAT WAS MEASURED. Built wrapping first, the reference bar
 * rendered **448px tall at 360 in Swahili and Chinese** — eleven controls in six rows, sticky,
 * eating 57% of a 780px phone viewport before a single row of content was visible. Swahili short
 * labels measure 1.74× p90 / 2.25× p95 against English, so a wrap is worst exactly where the
 * audience is.
 *
 * ⚠️ NO EDGE BLEED. `-mx-3 px-3` on the strip used to run it 16px past the content box so a
 * half-visible pill would signal "more this way". It cost more than it bought: on the right it ate
 * the whole gap before the result count, so a clipped pill landed hard against it and rendered as
 * one broken word, and the row overflowed its own container by 16px. `.kp-strip-fade` carries that
 * signal properly.
 *
 * ⭐ THE SELECTED PILL IS SCROLLED INTO VIEW ON LOAD — `<StripAutoScroll/>`. Measured at 360 on
 * 2026-09-06: six pills in a 328px box put the fourth past the fold, so the page opened with the
 * ACTIVE lens entirely off-screen. §3 rule 9. ⛔ A seven-pill lens strip without this opens on a
 * lens the player cannot see, which reads as the control having done nothing.
 */
export function QueryStrip({
  ariaLabel,
  children,
  className,
}: {
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      data-strip-autoscroll
      className={cn(
        "kp-thin-scroll kp-strip-fade flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pr-2 lg:flex-wrap lg:overflow-visible lg:pr-0",
        className,
      )}
    >
      <StripAutoScroll />
      {children}
    </nav>
  );
}

/**
 * The result count — ⭐ **ONE VARIABLE**, shared by the bar, the pager and the sheet's apply
 * button, published as `data-result-count` so an instrument can check the promise against the
 * delivery (§3 rule 5).
 *
 * 🔴 THE REASON IT IS PUBLISHED AT ALL. A board once printed *"40 live · TZS 1,659k in play"*
 * above ZERO cards at nine of nine viewport × locale combinations. The number was true and the
 * board was still a lie. `qa:count-truth` reads this attribute, follows the page's own links and
 * counts what arrives — which is only possible because the promise is in the DOM.
 *
 * ⛔ Never recompute this number for the pager. Pass the same variable to both.
 */
export function QueryResultCount({ count, phrase }: { count: number; phrase: string }) {
  return (
    <p
      aria-live="polite"
      data-result-count={count}
      className="shrink-0 font-mono text-[11.5px] tabular-nums text-text-subtle"
    >
      {phrase}
    </p>
  );
}

/**
 * One flat option row — the shape shared by the desktop menus and the phone sheet.
 *
 * The selected fill is `.kp-fopt[data-on]` in `globals.css`: the SAME `--pill-active` token the
 * selected pill uses, so a menu row, a sheet row and a pill can never drift apart
 * (`test:filter-language` §2.4 asserts it).
 */
export function QueryOption({
  href,
  on,
  children,
  trailing,
}: {
  href: string;
  on: boolean;
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <Link
      href={href as never}
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
}

export type QuerySortOption = {
  id: string;
  label: string;
  href: string;
  on: boolean;
  /** The arrow shown beside the option — which way this sort points when nobody has said. */
  naturalDir: SortDir;
};

/**
 * SORT + DIRECTION, fused into one control.
 *
 * ⛔ SORT NEVER GOES BEHIND A CLICK, AT ANY WIDTH — §K 6b and the kit's own ruling, stated in four
 * of its documents: *"they answer the first two questions a punter has and must never cost a
 * tap."* Side, topic and window belong in the phone sheet; sort and the lens do not.
 *
 * ⛔ NO GOLD. Sort is view state, and on this platform gold is money and nothing else
 * (`test:gold-is-money`). The kit's round-2 final withdrew the gilt shell it had proposed.
 *
 * ⭐ CHOOSING A NEW SORT RESETS DIRECTION TO `null`, which is why every option's href carries
 * `dir: null`: the new sort then arrives pointing its own natural way. A two-state direction would
 * make "closing soonest" open on the rows closing LAST — see `parse.ts`'s `parseDir`.
 *
 * 🔴 AND THE MENU MUST NOT SIT INSIDE A HORIZONTALLY SCROLLING BOX. Measured on production
 * 2026-08-13: a box that scrolls on one axis cannot let a child escape on the other — CSS coerces
 * `overflow-y: visible` to `auto` the moment `overflow-x` scrolls — so a 274px sort panel was
 * clipped by a 62px strip to a FOUR-PIXEL sliver: 0 of 6 options reachable at 360px, every
 * automated check green. ⛔ Put this in a row that WRAPS (`QUERY_BAR_ROW2_CLASS`), never in a
 * strip that scrolls.
 */
export function QuerySort({
  label,
  value,
  ariaLabel,
  options,
  dir,
  dirHref,
  ascLabel,
  descLabel,
}: {
  /** The quiet key — "Sort". Never truncates. */
  label: string;
  /** The chosen sort's label — ellipsises before the key does. */
  value: string;
  ariaLabel: string;
  options: readonly QuerySortOption[];
  dir: SortDir;
  /** Where the direction button points — the same state with the direction flipped. */
  dirHref: string;
  ascLabel: string;
  descLabel: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center lg:flex-none">
      <MenuShell
        /* At 360 sort shares its line with the Filters button, so it is the control that gives:
           the KEY never truncates and the VALUE ellipsises, which is MenuShell's own rule.
           ⛔ An ellipsis is not a defect — the hidden tail IS the "…" — but the amount hidden in
           Swahili is reported by `qa:filter-scan` so a person can judge it.

           🔴 `shrink` ON THE SUMMARY IS A BUG FIX, NOT A TIDY-UP — AND THE BUG WAS SHIPPED, ON
           `/markets`, AT 360, IN ENGLISH AND SWAHILI. `menu-shell.tsx`'s summary carries
           `inline-flex … shrink-0`, so it kept its intrinsic width however narrow its parent got,
           and the `truncate` on its value span could never engage. Measured on the live board at
           360 before this line existed:

             /markets sw  summary 16→255 · direction button 154→198  → 44px OVERLAP
             /markets en  summary 16→218 · direction button 166→210  → 44px OVERLAP
             /markets zh  summary 16→162 · direction button 162→206  → 0  (short labels escape)

           The 44×44 direction button was drawn ON TOP of the sort label — "Za hivi karibuni" with
           an arrow through it. ⛔ AND EVERY AUTOMATED CHECK PASSED: the DOCUMENT does not
           overflow (`scrollWidth === clientWidth === 360`), so `test:responsive` is green; the
           pill radius and 44px floor are untouched, so `qa:filter-scan` is green. Only opening
           the screenshot found it — the "clipped-not-scrolled" class the standards name.
           ⛔ AND THE FIX IS `w-full`, NOT `shrink` — the first attempt WAS `shrink` and it changed
           nothing, measured, because the summary is not a flex item: its parent `<details>` is a
           plain block, so `flex-shrink` has no one to negotiate with. `w-full` binds the summary
           to the width the `<details>` was already shrunk to as a flex item of the row, and only
           then does the value span's `min-w-0 truncate` have a box to truncate inside.
           ⚠️ Applied HERE rather than in `menu-shell.tsx`, so the desktop topic menu and
           `/updown`'s call sites keep the intrinsic width they want. */
        rootClassName="min-w-0 shrink"
        label={label}
        value={value}
        ariaLabel={ariaLabel}
        /* ⚠️ THE KEY STANDS DOWN BELOW `lg`, AND ONLY HERE. With the overlap fixed the value had
           138px to live in and truncated to "Za…" — the ellipsis was doing the key's job of
           telling the player nothing. On a phone the fused ↓ button and the caret already say
           this is a sort, so the VALUE is the label; from `lg` the row has room and the key
           returns. `aria-label` names the axis at every width. */
        labelClassName="hidden lg:inline"
        className="w-full min-w-0 rounded-l-pill rounded-r-none border-r-0"
      >
        {options.map((o) => (
          <QueryOption
            key={o.id}
            href={o.href}
            on={o.on}
            trailing={
              <span className="font-mono text-[11px] text-text-faint">
                {o.naturalDir === "asc" ? "↑" : "↓"}
              </span>
            }
          >
            {o.label}
          </QueryOption>
        ))}
      </MenuShell>
      {/* Direction is fused to the sort control's right edge (kit COMPONENTS §4). */}
      <Link
        href={dirHref as never}
        replace
        scroll={false}
        aria-label={dir === "asc" ? ascLabel : descLabel}
        title={dir === "asc" ? ascLabel : descLabel}
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
  );
}

/**
 * `Clear`, shared by both layouts.
 *
 * ⚠️ On a phone it belongs in the sheet's FOOTER, not beside the result count: the kit puts it on
 * the count line, but at 360 in Swahili "Futa zote" lands hard against the count and collides —
 * the same width fight §8.7c removed from the status strip. Same control, one line lower.
 *
 * ⛔ Returns `null` when nothing is narrowed. A permanently-visible `Clear` on an unfiltered page
 * is a control that cannot do anything, and §3 rule 8's reasoning applies to controls as much as
 * to exits.
 */
export function QueryClear({
  href,
  label,
  className,
}: {
  href: string | null;
  label: string;
  className?: string;
}) {
  if (!href) return null;
  return (
    <Link
      href={href as never}
      replace
      scroll={false}
      className={cn(
        "inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-pill px-3 text-[13px] font-semibold text-text-muted hover:text-text lg:ml-auto",
        className,
      )}
    >
      <I.x s={14} aria-hidden />
      {label}
    </Link>
  );
}

/**
 * The thin vertical rule between desktop filter groups.
 *
 * ⚠️ Desktop only. Below `lg` those groups are inside the sheet, where a divider would separate
 * nothing — the sheet already gives each group a titled section.
 */
export function QueryGroupDivider() {
  return <span aria-hidden className="mx-0.5 hidden h-5 w-px shrink-0 bg-border lg:block" />;
}

/**
 * A DESKTOP GROUP of pills — the `<nav>` that sits beside the sort above `lg`.
 *
 * 🔴 IT WRAPS, AND THAT IS A REPAIR RATHER THAN A PREFERENCE. Every bar wrote this wrapper by
 * hand as `hidden shrink-0 items-center gap-1 lg:flex`, and `shrink-0` with no wrap means a group
 * whose pills are wider than the space left simply runs off the screen. Measured on `/proposals`
 * at 1280 in Swahili, by `qa:bar-geometry` on its first full run:
 *
 *     CLIPPED "Mchanganyiko / Zote"  1239→1442  vs viewport 1280   (162px off the right edge)
 *
 * ⚠️ IT IS NOT A `/proposals` BUG, IT IS A LATENT ONE EVERYWHERE, and only that route has been
 * unlucky enough to prove it. Its topic axis carries EIGHT categories rather than the market
 * board's seven (`ProposalCategory` adds `infrastructure` and `mixed`), and Swahili renders
 * "Mixed / All" as "Mchanganyiko / Zote" — the longest single pill label on the platform. The
 * same markup on `/results` survives today only because its words are shorter.
 *
 * ⛔ THE ROW ALREADY WRAPS; THE GROUP DID NOT. `QUERY_BAR_ROW2_CLASS` is `flex-wrap`, so a group
 * that no longer fits drops to its own line — and then overflows THAT line, because inside the
 * group `shrink-0` forbids both shrinking and wrapping. Wrapping inside the group is what makes
 * the row's wrap actually sufficient.
 *
 * ⚠️ `min-w-0` IS LOAD-BEARING BESIDE `flex-wrap`: without it the group's min-content width is its
 * widest pill, so a flex parent will still let it exceed the line rather than break.
 */
export const QUERY_GROUP_CLASS = "hidden min-w-0 flex-wrap items-center gap-1 lg:flex";
