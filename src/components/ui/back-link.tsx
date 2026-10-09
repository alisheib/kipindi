"use client";

import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";

/**
 * BackLink — uses router.back() when the user navigated in-app,
 * falls back to `fallbackHref` on direct visits (no history).
 */
export function BackLink({
  fallbackHref,
  label,
}: {
  fallbackHref: string;
  label: string;
}) {
  const router = useRouter();

  /* ⭐ DG-P-07 · §A2 — THE HOUSE BACK AFFORDANCE WAS 16px TALL, ON 18 PLAYER PAGES.
     Re-derived, not quoted: `text-label` is 12px/16px (`tailwind.config.ts:193`), the chevron
     is `s={11}`, there is no padding, no border, and `globals.css` declares NO base `button`
     reset — so the single flex line's cross size was max(16, 11) = 16px and that WAS the whole
     border box. §A2 asks 40 (`--tap-min`, globals.css:291) and prefers 44 on a phone.
     ⛔ 44 IS WRITTEN AS AN ARBITRARY LITERAL, never `min-h-11`. The spacing scale is REPLACED,
     not extended (`tailwind.config.ts:204-219`): `min-h-11` is a 96px floor here, which is the
     exact mistake `side-picker.tsx:87-89` records paying for once already.
     ⚠️ SAY WHAT MOVES. `min-height` applies to the flex container's box; with zero padding and
     zero border the content and border boxes coincide, the flex line stays 16px and
     `items-center` re-centres it — so the glyph, size, tracking and colour are pixel-identical.
     The BORDER BOX grows 16 → 44, so all 18 call sites gain 28px above their hero. That is a
     layout change; "the text look unchanged" was only ever true of the type.
     ⛔ NOT the `-my-2` absorber that `side-picker.tsx:90` uses, and not the `::after` overlay
     that `globals.css:1625` (DG-A-02) uses for the 26px Switch. Both are out-of-flow tricks
     whose safety argument is "the vertical neighbours were MEASURED" — and this component has
     18 call sites with different neighbours, one of them (`updown/[roundId]:317`) a
     `gap-[18px]` flex column whose very next item carries its own 14px round link. An overlay
     that cannot be measured at every call site is the `.pchart-range` failure (globals.css:2850
     — it measured 36, not 40). Where the height can honestly grow, grow it. */
  return (
    <button
      type="button"
      onClick={() => {
        // UD-11 · programmatic navigations announce themselves so NavProgress runs —
        // the exact idiom the Up & Down card uses. Without it, going BACK from a round
        // (the highest-traffic exit of the section) showed no loader while every
        // forward navigation got the gold bar: inconsistent perceived speed.
        window.dispatchEvent(new Event("50pick:navigating"));
        // If there's real navigation history, go back.
        // window.history.length > 1 is true even on direct nav in some
        // browsers, so also check the referrer as a heuristic.
        if (window.history.length > 1 && document.referrer) {
          router.back();
        } else {
          router.push(fallbackHref as never);
        }
      }}
      className="min-h-[44px] inline-flex items-center gap-1.5 text-label font-mono uppercase tracking-[0.16em] text-text-subtle hover:text-text transition-all hover:-translate-x-0.5 group"
    >
      {/* ⭐ THE CHEVRON'S TIP SITS ON THE COLUMN'S EDGE (2026-10-09, the visual pass's round 3, tiles 332/333 and
          067–069): the glyph draws its point at x9 of its 24-unit box, stroke 1.9, so at 11px its ink began 3.7px in
          and "‹ WASIFU" / "‹ POCHI" stood 3px inside the card edge under it (x19 against 16 at 390, x355 against 352 at
          1280). The 3px margin hands back that side bearing — the mark and its word move together, so their own
          spacing is unchanged and the button's box still starts on the edge. */}
      <I.chevronLeft s={11} className="-ml-[3px]" />
      {label}
    </button>
  );
}

/**
 * THE BACK LINK WHILE ITS PAGE LOADS (round 5's follow-up, R5-H · G-2b) — the box `BackLink` draws (`min-h-[44px]`, its
 * one 16px label line centred in it) with a bar for the label. Every loading ghost whose page opens on a back link draws
 * this one: nine drew a 16–20px bar there (and the receipt's none), so each page landed 24–28px lower than its ghost
 * promised. A shape, never a link: hidden from a screen reader, nothing to press.
 */
export function BackLinkGhost() {
  return (
    <div className="flex min-h-[44px] items-center" aria-hidden>
      <div className="h-3 w-[64px] rounded bg-bg-overlay kp-shimmer-track" />
    </div>
  );
}
