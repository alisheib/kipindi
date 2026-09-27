"use client";

/**
 * THE MATCH'S LIVE PARTS — the score and the timeline, the two regions of the landing's Up & Down band
 * that change when the 60-second refresh brings in a newer confirmed read (landing v3, ruling R5(a)).
 *
 * Everything else in the band is server-rendered and static; these two read the band's live round from
 * `UpdownMatchState` and speak it through the band's ONE word builder (`updown-match-words.tsx`), with
 * the reader's own dictionary. At first paint the live round IS the server's round, so the markup is
 * byte-identical to the server render.
 *
 * ⛔ THE PICKS ARE NOT RENDERED HERE. The score receives them as `children` — the server's Up/Down links
 * and padlocked sides — so the scoreboard owns only its answer: DOM order is the verdict first, then Up,
 * then Down (a screen reader hears the answer before the choices; Tab order Up → Down matches the screen).
 */
import type { ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { UpdownMatchTrack } from "@/components/charts/updown-match-track";
import { matchWords } from "./updown-match-words";
import { useMatch } from "./updown-match-state";

/** G2 — the plate: the verdict, its dated detail, the level note, then the picks the server passed in. */
export function UpdownMatchScore({ children }: { children: ReactNode }) {
  const { t, locale } = useT();
  const { round } = useMatch();
  const w = matchWords(t, locale, round);
  return (
    <div className="kp-udbug" data-lead={w.lead}>
      <div className="kp-udbug__mid">
        <p className="kp-udbug__verdict">{w.verdict}</p>
        {/* Below 640 this block keeps two lines' height in every state, so the picks under it never move
            when the 60-second refresh turns kick-off into a lead (frame panel, 2026-09-27). */}
        <div className="kp-udbug__sub">
          {w.detail != null && <p className="kp-udbug__detail">{w.detail}</p>}
          {w.note != null && <p className="kp-udbug__note">{w.note}</p>}
          {w.agedNote != null && <p className="kp-udbug__agednote">{w.agedNote}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

/** G3 — the match track (a member of the chart home), named by the timeline in words. */
export function UpdownMatchTimeline() {
  const { t, locale } = useT();
  const { round, anchorMs } = useMatch();
  const w = matchWords(t, locale, round);
  return <UpdownMatchTrack round={round} label={w.aria} openLabel={t.market.udOpenPrice} anchorMs={anchorMs} />;
}
