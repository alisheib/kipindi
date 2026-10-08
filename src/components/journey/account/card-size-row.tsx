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
import { keepLastWords } from "@/components/ui/keep-words";
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
        className="kp-hub__row kp-hub__row--switch"
      >
        {/* ⭐ THE RAIL ROW'S LAYOUT, AS ITS HEADER PROMISES (round 3, 2026-10-09, tiles 124 127 256 264 294 295 298 302 306
            331): label and value beside the switch, the hint under all three. The hint used to share its line with the
            value and the switch, so it had 183px at 390 and 113px at 320 and left a word alone at every phone width —
            "Kwa simu tu. Hakuna" / "kinachofichwa.", "Phones only. Nothing is" / "hidden.", and three lines at 320. Under
            the whole row it has 222px at 320 and 292px at 390 (the hub's row less its glyph slot): one line at 360 and up
            in every language, and at sw 320 "Kwa simu tu." / "Hakuna kinachofichwa." — the last two words kept together
            (`keepLastWords`), so it breaks between its sentences and not before its last word. */}
        <span className="kp-hub__glyph" aria-hidden><I.layoutGrid s={20} /></span>
        <span className="kp-hub__label">{t.journey.hubCardSize}</span>
        <span className="kp-hub__value">{compact ? t.nav.densityCompact : t.nav.densityComfortable}</span>
        <Toggle on={compact} decorative />
        <span id={hintId} className="kp-hub__sub kp-hub__row-hint">{keepLastWords(t.nav.cardSpacingHint)}</span>
      </button>
    </li>
  );
}
