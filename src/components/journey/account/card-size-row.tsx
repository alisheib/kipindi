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
        <span className="kp-hub__glyph" aria-hidden><I.layoutGrid s={20} /></span>
        <span className="kp-hub__text">
          <span className="kp-hub__label">{t.journey.hubCardSize}</span>
          <span id={hintId} className="kp-hub__sub">{t.nav.cardSpacingHint}</span>
        </span>
        <span className="kp-hub__value">{compact ? t.nav.densityCompact : t.nav.densityComfortable}</span>
        <Toggle on={compact} decorative />
      </button>
    </li>
  );
}
