"use client";

/**
 * UKUBWA WA KADI — the phone board's card size, as a switch row of the hub (the Vodacom plan S6, SJ-17; S6-PLAN WP5
 * step 5; Mobile Visual Plan U2).
 *
 * ⭐ THE RAIL MENU'S PROVEN CONTROL, NOT A NEW ONE (`nav-more.tsx`): one row that IS the switch, its state read through
 * `useSyncExternalStore` from the card-spacing module and written through `applyCardSpacing`, with the kit toggle as its
 * picture only. The kit wins where the canvas drifts: a switch row, not the canvas's two-segment capsule (VODACOM-PLAN
 * §0h point 7) — and never a filter pill, which `test:filter-language` would count as a new rail.
 * ⛔ Phones only (the setting changes nothing at 640 and wider), and it never names the page attribute itself: only the
 * root layout and the card-spacing module may (`test:density-contract` §3 and §4h).
 * ⚠️ The words are the journey's corrected name ("Ukubwa wa kadi"); the rail's own key keeps its word until S15.
 */
import { useId, useSyncExternalStore } from "react";
import { I } from "@/components/ui/glyphs";
import { Toggle } from "@/components/ui/toggle";
import { keepSentences } from "@/components/ui/keep-words";
import { useT } from "@/lib/i18n";
import { applyCardSpacing, currentCardSpacing, subscribeCardSpacing } from "@/lib/card-spacing";

/** The server renders Compact, the default, exactly as the rail menu does. */
const compactOnServer = () => "compact" as const;

export function CardSizeRow() {
  const { t } = useT();
  const spacing = useSyncExternalStore(subscribeCardSpacing, currentCardSpacing, compactOnServer);
  const hintId = useId();
  const compact = spacing === "compact";
  return (
    <li className="sm:hidden">
      <button
        type="button"
        role="switch"
        aria-checked={compact}
        aria-label={`${t.journey.hubCardSize}: ${t.nav.densityCompact}`}
        aria-describedby={hintId}
        onClick={() => applyCardSpacing(compact ? "comfortable" : "compact")}
        className="kp-hub__row"
      >
        {/* ⭐ A TWO-LINE HUB ROW LIKE EVERY OTHER (round 4, 2026-10-09, tile 259): the glyph and the trailing control
            centred on the row, the words in the text column — the label with its value on the first line, the hint on
            the second. Round 3 hung the hint under the switch's column too, which put the 26px switch on the LABEL's
            line: it sat 10px above the glyph (146.5 against 156.5) and grew the row to 61px against every hub row's 56.
            ⚠️ A switch centred on a 56px row overlaps both text lines (y15–41 of 56; the lines are about 8–28 and 30–48),
            so neither line may run under it: each has the row less the glyph slot and the switch's — viewport − 154,
            166px at 320, 206 at 360, 236 at 390. The hint is one line wherever it fits (en and zh from 360, sw from 390,
            row 56px); where it does not it breaks between its two sentences (`keepSentences`: "Kwa simu tu." /
            "Hakuna kinachofichwa.", "Phones only." / "Nothing is hidden.") and the row grows, as the hub's rule allows.
            The value rides the label as the rail menu's row has it (`nav-more.tsx`: label and value in one column, the
            switch beside them); at sw 320 the pair is 171px against 166, so the value drops under the label rather than
            split "Ukubwa wa / kadi". */}
        <span className="kp-hub__glyph" aria-hidden><I.layoutGrid s={20} /></span>
        <span className="kp-hub__text">
          <span className="kp-hub__pair">
            <span className="kp-hub__label">{t.journey.hubCardSize}</span>
            <span className="kp-hub__value">{compact ? t.nav.densityCompact : t.nav.densityComfortable}</span>
          </span>
          <span id={hintId} className="kp-hub__sub">{keepSentences(t.nav.cardSpacingHint)}</span>
        </span>
        <Toggle on={compact} decorative />
      </button>
    </li>
  );
}
