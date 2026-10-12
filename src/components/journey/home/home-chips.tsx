/**
 * THE JOURNEY HOME'S TOPIC CHIPS — "Zote", then every category the open book holds (the Vodacom plan S7: VODACOM-PLAN
 * SJ-7; `S7-PLAN.md` WP7 step 2 item 3 and Correction 8; pick-1-home.dc.html :50-55, s4-3-home-chips, s4-3-home-desktop).
 *
 * ⭐ A DECLARED FILTER SURFACE (Correction 8): the canvas draws `<button aria-pressed>`, but each chip is an address —
 * `/?cat=…` — so it is the kit's `FilterPill`, the product's one filter language (`test:filter-language` names this file
 * in its SURFACES, and §0.4 would refuse its `data-filter-rail` otherwise). The kit wins where the canvas differs: only
 * the selected pill wears an outline (an unselected one is words on the page), the kit's 44px floor and its padding.
 * ⭐ WHICH CHIPS, AND IN WHAT ORDER, IS WP3's (`homeChips`): Zote, the deck's three, then the rest; a selected category
 * keeps its chip though it holds no question. ⭐ WHERE EACH GOES (`homeHref`): its category, the search kept, the page
 * dropped — a chip never applies a setting out of sight, and Zote clears the category alone.
 * ⭐ TOGGLE SEMANTICS (`aria-pressed`, as the canvas and `/markets`' topic chips), `replace` and `scroll={false}`: a filter
 * is not a navigation (the kit's rule), so the back button leaves the home rather than walking back through its chips.
 * ⭐ THE HOUSE'S SCROLLING STRIP below 1024 (`.kp-strip-fade`, `data-strip-autoscroll`): the rail scrolls sideways, its
 * hidden edge faded, and it bleeds to the screen's right edge as the canvas draws it (`.kp-jhome__chips`); from 1024 it
 * wraps. The pressed chip is framed on load by the kit's StripAutoScroll, which the home renders through its lazy module
 * (`home-lazy.tsx`) — this file stays a server component that loads no client code of its own.
 * `test:journey-home` §7 holds it.
 */
import { FilterPill } from "@/components/ui/filter-pill";
import { homeHref, type HomeChip } from "@/lib/journey/home-list";
import { marketCategoryLabel } from "@/lib/localized";
import type { Dict } from "@/lib/i18n-dict";

export function HomeChips({ chips, selected, q, t }: {
  /** `homeChips`' answer: null is Zote. */
  chips: readonly HomeChip[];
  /** The address's category, or null for Zote. */
  selected: HomeChip;
  /** The address's search, kept by every chip ("" for none). */
  q: string;
  t: Dict;
}) {
  return (
    <nav aria-label={t.journey.homeChipsAria} data-filter-rail data-strip-autoscroll className="kp-thin-scroll kp-strip-fade kp-jhome__chips">
      {chips.map((c) => (
        <FilterPill
          key={c ?? "all"}
          href={homeHref({ cat: c, q })}
          label={c === null ? t.market.catAll : marketCategoryLabel(t, c)}
          on={c === selected}
          semantics="toggle"
          replace
          scroll={false}
          testId={`cat:${c ?? "all"}`}
        />
      ))}
    </nav>
  );
}
