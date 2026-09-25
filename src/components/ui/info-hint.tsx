"use client";

/**
 * InfoHint — the disclosure that explains a money line, and the panel it opens.
 *
 * 🔴 D41 · IT USED TO BE A TOOLTIP, AND ON A PHONE THAT MEANT THE MONEY COPY COULD NOT BE READ.
 * Measured on production 2026-09-25, signed in, dial open, at 320/360/412 x sw/en/zh — nine
 * cells, three hints each, all twenty-seven wrong:
 *
 *   - the explanation was ONE LINE. `.kp-tooltip-popover` sets `white-space: nowrap`, so the
 *     commission hint rendered **1392.8px wide in a 320px viewport — 23% of it readable** (26%
 *     at 360, 25% at 360 en). The other 77% was not merely off-screen: `body { overflow-x: clip }`
 *     means the page CANNOT be scrolled to it. 201 characters about a fee, unreachable.
 *   - it rendered in CAPITALS. The popover sets font, size and letter-spacing and never
 *     `text-transform`, so it inherited `uppercase` from the eyebrow `<p>` it hung off: fee copy
 *     in 11px ALL-CAPS mono. The register's cell never named that, and a screenshot of a hidden
 *     tooltip could not show it.
 *   - the trigger was **14x10** — 140px of hit area against Law 9's `--tap-min` 40px (1600px).
 *   - `pointer-events: none` on the popover, so even the visible third could not be selected.
 *
 * ⚠️ AND A §5 BREACH THAT IS NOT ONE — recorded because the next session will measure it too.
 * `body.scrollWidth` read **763 against a 320 viewport** with the dial open, and exactly 320 with
 * the dial absent, so the popovers were unambiguously the cause of a 443px box. But `scrollX`
 * stayed **0** at both widths and both scroll positions: the clip means the page never actually
 * moves. `qa:signup-funnel` §1 already warns `body.scrollWidth` over-reports clipped content.
 *
 * ⛔ WHY THE PANEL IS PLACED BY THE CALL SITE AND NOT BY THIS COMPONENT. The obvious fix — let
 * the popover wrap where it stands — was measured and does not work: each trigger sits in an
 * eyebrow `<p>` whose own width is **172px, 54px and 204px** at 320. Wrapping 465px of Swahili
 * inside 54px is a column of single words. The panel has to be a sibling of the ROW, which for
 * hint 1 is a `grid-cols-[1fr_auto]` — a third child there would break the two-column layout, so
 * only the call site knows where its panel belongs. Hence a trigger and a panel, paired by id.
 * ⛔ AND NOT A FLOATING PANEL EITHER: keeping it absolute needs the distance to the viewport edge,
 * which CSS cannot know here (`anchor-name` is past this product's browser floor, U29) — so it
 * would need JS geometry on every open, for a box that reads better in flow anyway.
 *
 * ⚠️ `Tooltip` (`./tooltip`) is UNCHANGED and still has all of this, because `/leaderboard`'s
 * badge tiers are its other consumer and they are a different unit's surface. Measured there at
 * 320 sw: 14 triggers at 22x22, popovers 264-380px, overflowing the right edge by up to 72px.
 * Filed, not fixed here.
 */

import type { ReactNode } from "react";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * The trigger. Its accessible name is the label it explains, so a screen-reader user hears
 * "STAKE, Info, collapsed" rather than an unnamed glyph.
 *
 * ⚠️ `-my-[13px] py-[13px]` IS THE §L6 PATTERN AND THE LITERAL IS DELIBERATE — the same reason
 * `side-picker.tsx`'s "change side" control carries `min-h-[44px] -my-2`: **the spacing scale is
 * overridden** (`tailwind.config.ts:211-226`, where `p-5` is 24px), so a scale token here means
 * something other than it reads. 13 is (40 - 14) / 2: the eyebrow line is 14px tall, the floor is
 * 40, and the padding grows the BOX while the negative margin gives the growth back to the
 * layout, so the row does not move. ⛔ Nothing trusts that arithmetic — `qa:detail-order-hints`
 * §4 asserts the OUTCOME instead: `--tap-min` in both axes AND `elementFromPoint` landing on this
 * button at all four edges of that square. If the floor moves and 13 stops working, §4 fails.
 *
 * `relative z-10` is not decoration. The 40px box reaches 11px past the eyebrow's own line, and
 * directly below hint 0 sits the stake input — measured: a 40px square's bottom edge lands on
 * `<input>`. The input is a LATER sibling, so without a stacking boost it wins the overlap and
 * this control's reach stops at its own 14px line while measuring 40.
 */
export function InfoHint({
  panelId,
  open,
  onToggle,
  children,
  size = 11,
  className,
}: {
  /** id of the `InfoHintPanel` this opens. */
  panelId: string;
  open: boolean;
  onToggle: () => void;
  /** The label text this explains — it becomes the button's accessible name. */
  children: ReactNode;
  size?: number;
  className?: string;
}) {
  const { t } = useT();
  return (
    <button
      type="button"
      data-hint-trigger
      aria-expanded={open}
      aria-controls={panelId}
      onClick={onToggle}
      className={cn(
        "relative z-10 inline-flex min-h-[var(--tap-min)] min-w-[var(--tap-min)] items-center gap-1 text-left",
        "-my-[13px] py-[13px]",
        "text-text-subtle transition-colors hover:text-text-muted",
        className,
      )}
    >
      {children}
      <span aria-hidden className="inline-block align-[-0.1em]">
        <I.info s={size} />
      </span>
      <span className="sr-only">{t.common.info}</span>
    </button>
  );
}

/**
 * The explanation, in flow, at the measure of whatever row the call site puts it after.
 *
 * ⛔ `hidden` RATHER THAN RETURNING null: the trigger's `aria-controls` must resolve to a real
 * element in both states, and a check that follows `aria-controls` to find the panel (which
 * `qa:detail-order-hints` §3 does) cannot tell "closed" from "wired to nothing" otherwise.
 * `normal-case tracking-normal` are insurance, not a fix — out here the panel no longer inherits
 * the eyebrow's `uppercase`, and §3 asserts it never comes back.
 */
export function InfoHintPanel({
  id,
  open,
  children,
  className,
}: {
  id: string;
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      id={id}
      data-hint-panel
      hidden={!open}
      className={cn(
        "mt-2 rounded-md border border-border bg-bg-overlay px-3 py-2",
        "text-body-sm normal-case leading-snug tracking-normal text-text-muted",
        className,
      )}
    >
      {children}
    </div>
  );
}
