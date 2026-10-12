"use client";

/**
 * THE HOW-TO CARD — first in the journey home's column, it opens the static How to Play sheet in place (the Vodacom plan
 * S7: VODACOM-PLAN §3.2's order and §3.8; `S7-PLAN.md` WP6 step 3, amendments A14 and A24, Open points 18 and 19; the S4
 * frame `pick-1-home.dc.html` :37-46).
 *
 * A row of three, as the frame draws it: the play glyph on its royal plate, the card's words ("Jinsi ya kucheza" over
 * "Hatua 3 · dakika 1") and a chevron at its end.
 * ⭐ A BUTTON, NOT A LINK (Correction 8; Open point 19): the canvas draws an `<a>` to the sheet's board, but the product
 * opens the sheet in place, with no URL (`/?howto=1` is S11's), so it is a `<button aria-haspopup="dialog">` that holds
 * `open` and renders the sheet beside it — the guest Tiketi tab's pattern (`journey-tabs.tsx`), `aria-expanded` with it.
 * It opens on a tap alone: no auto-open and no seen key (Open point 18), so nothing here touches storage.
 * ⭐ THE ROYAL PLATE IS CHOICE 3A, AS ITS BOARD DRAWS IT (A14): the kit's 48px `IconPlate` with NO colour props, so it sets
 * no inline colour, and `.kp-jhowto__plate` paints it from the primary material's own tokens — `.btn-primary`'s ramp,
 * lit edge and drop (`--wash-primary`, `--edge-primary`, `--shadow-primary`, never its glow), the glyph in `--pearl-50`.
 * Never gilt (§2 :2447): the plate is a door, not money. The glyph is `I.playBare` (Correction 22 names the glyph, not
 * its size) at `plateGlyph(48)`, 24px — the kit's glyph for a 48px plate, derived from the plate's edge: where the board
 * draws 20, the kit wins over the canvas (§0h point 7).
 * ⭐ THE NUMBERS ARE THE SHEET'S: `{steps}` is its own step count and `{minutes}` its named constant (the deck's "dakika 1"),
 * both exported beside the steps they describe, so the card cannot promise a sheet it does not open.
 * ⭐ `signedIn` IS READ ON THE SERVER (WP7's `JourneyHome` hands it down) and only decides where the sheet's Weka mipaka
 * goes. ⛔ Nothing mounts this card in WP6: WP7's home renders it through `home-lazy.tsx`, its one loader, so its code
 * (and the sheet's) stays out of a classic visitor's first load of `/`.
 * ⚠️ The chevron ends the card's content, so its ink stands on the content edge (`edge="end"`, round 9's R9-A4 and round
 * 10's R10-A6: a door's end mark), in the family's stroke — `test:visual-pass-r9a` 4.10 names it.
 */
import { useState } from "react";
import { I, plateGlyph } from "@/components/ui/glyphs";
import { IconPlate } from "@/components/ui/icon-plate";
import { HowToPlaySheet, HOW_TO_MINUTES, HOW_TO_STEPS } from "@/components/onboarding/how-to-play-sheet";
import { useT } from "@/lib/i18n";
import { fill } from "@/lib/utils";

export function HowToCard({ signedIn }: { signedIn: boolean }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="kp-jhowto"
        data-testid="journey-howto-card"
      >
        <IconPlate size={48} className="kp-jhowto__plate" aria-hidden>
          <I.playBare s={plateGlyph(48)} />
        </IconPlate>
        <span className="kp-jhowto__text">
          <span className="font-display font-semibold text-body-lg">{t.journey.howToCardTitle}</span>
          <span className="kp-jhowto__meta text-body-sm">{fill(t.journey.howToCardMeta, { steps: HOW_TO_STEPS, minutes: HOW_TO_MINUTES })}</span>
        </span>
        <I.chevronRight s={20} edge="end" className="kp-jhowto__chev" />
      </button>
      <HowToPlaySheet open={open} onClose={() => setOpen(false)} signedIn={signedIn} />
    </>
  );
}
