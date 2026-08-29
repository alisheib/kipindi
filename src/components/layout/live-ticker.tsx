"use client";

/**
 * Live ticker — a 32px strip carrying the platform's REAL recent settlements.
 *
 * ⛔ THE TYPE IS IMPORTED, NEVER RE-DECLARED. `TickerEvent` used to be declared here AND in
 * `ticker-feed.ts`, which is exactly how a `timeAgo` field that nothing rendered survived in
 * both copies. One declaration, in `lib/markets/ticker.ts` (B9 / §0a: two copies of one truth do
 * not stay equal). ⚠️ `import type` is load-bearing — this is a CLIENT component and the feed
 * module reaches the store, so a value import would pull the server graph into a browser chunk.
 * The pure module is safe either way; the rule is kept because the next type to live there may
 * not be.
 *
 * Kit tokens (bg-inset, border, live-400, mono) + horizontal scroll.
 */

import { useState } from "react";
import { Dot } from "@/components/ui/dot";
import { useT } from "@/lib/i18n";
import { sideWord } from "@/lib/side-label";
import { formatTzsCompact } from "@/lib/utils";
import type { TickerEvent } from "@/lib/markets/ticker";

type Verbs = { settled: string; on: string; voided: string };

/**
 * The side words, resolved once by `LiveTicker` and handed down.
 *
 * ⛔ This strip used to print `ev.side` — the stored enum — between two TRANSLATED
 * connectives, so the Chinese strip read "TZS 180K 已结算 YES 在 …" on every page of the
 * site. That is the SAME defect this file's header records having fixed for the market
 * TITLE, one field over: a localised sentence closing around an English token. The feed is
 * long-form only (`platform-stats.ts:103` filters to `productLine === "MARKET"`), which is
 * why "MARKET" is the honest vocabulary here rather than a guess.
 */
type Sides = { YES: string; NO: string };

function Items({ events, prefix, verbs, sides }: { events: TickerEvent[]; prefix: string; verbs: Verbs; sides: Sides }) {
  return (
    <>
      {events.map((ev) => (
        <span key={`${prefix}-${ev.id}`} className="inline-flex items-center gap-1.5 shrink-0 font-mono text-[12px] pr-8 whitespace-nowrap">
          {/* A VOID CARRIES NO FIGURE AND NO SIDE — we kept nothing and every stake was
              refunded, so there is no amount that describes what happened, and no winning
              side to name. Stated neutrally, never as an error: licence condition 4 / §C4,
              "the money came back". */}
          {ev.kind === "void" ? (
            <span className="text-text-muted">{verbs.voided}</span>
          ) : (
            <>
              {/* Absent rather than "TZS 0" when a settlement paid nothing — §C2 forbids a
                  zero standing in for an unknown, and a bare TZS 0 reads as a broken figure. */}
              {ev.amount !== undefined && <span className="text-text-muted">{formatTzsCompact(ev.amount)} </span>}
              <span className="text-text-muted">{verbs.settled} </span>
              <span className={`font-bold ${ev.side === "YES" ? "text-yes-400" : "text-no-400"}`}>{ev.side === "YES" ? sides.YES : sides.NO}</span>
            </>
          )}
          <span className="text-text-muted"> {verbs.on} {ev.title}</span>
          {/* Stage 9b — kit <Dot>. `color` rather than `tone="gold"`: the separator is
              gold-400, one stop lighter than the tone's gold-500, and a consolidation
              does not get to change a hue on the way past. */}
          <Dot color="var(--gold-400)" size={3} className="opacity-40 ml-2" />
        </span>
      ))}
    </>
  );
}

export function LiveTicker({ events }: { events: TickerEvent[] }) {
  const [paused, setPaused] = useState(false);
  const { t } = useT();
  const verbs: Verbs = {
    settled: t.market.tickerSettled,
    on: t.market.tickerOn,
    voided: t.market.tickerVoided,
  };
  const sides: Sides = { YES: sideWord(t, "YES", "MARKET"), NO: sideWord(t, "NO", "MARKET") };

  // A platform with no settlements has no strip. ⛔ Not an empty rail, not a placeholder line —
  // A-5: nothing over a guess.
  if (events.length === 0) return null;

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      /* Pauses for the KEYBOARD too, not only the mouse. The run holds real settlement figures
         and market questions; a strip a keyboard user can never stop is content they cannot
         read. `:focus-within` is the kit's own answer and costs nothing. */
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      style={{
        height: 32,
        background: "var(--bg-inset)",
        borderBottom: "1px solid var(--border)",
        overflow: "hidden",
        position: "relative",
        userSelect: "none",
        display: "flex",
        alignItems: "stretch",
      }}
    >
      {/* Fixed LIVE label.
          IN FLOW (flex item), not absolutely positioned over the track. It used to
          be absolute with the track carrying a hardcoded paddingLeft: 80 — but the
          label's width is LOCALE-DEPENDENT ("LIVE" / "MUBASHARA" / "直播"), so no
          single padding can clear it. In Swahili the marquee visibly scrolled
          underneath the label. Flex makes the track start wherever the label
          actually ends, in every locale, with no measurement. The gradient is now
          solid across the label and fades only in its trailing padding, so nothing
          is ever legible beneath the text. */}
      <div style={{
        flex: "0 0 auto", zIndex: 10,
        display: "flex", alignItems: "center", paddingLeft: 16, paddingRight: 24,
        background: "linear-gradient(90deg, var(--bg-inset) 0%, var(--bg-inset) 70%, oklch(11% 0.11 268 / 0) 100%)",
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {/* Stage 9b — kit <Dot pulse>, which IS `.live-dot`: same 6px, same
              `--live-400`, same 2600ms breathe, and the same gating at all three
              reduced-motion tiers. */}
          <Dot tone="live" size={6} pulse />
          <span className="font-mono text-micro font-semibold uppercase tracking-[0.1em] text-[var(--live-400)]">
            {t.common.live}
          </span>
        </span>
      </div>

      {/* Right fade */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: 48, zIndex: 10, pointerEvents: "none",
        background: "linear-gradient(270deg, var(--bg-inset), oklch(11% 0.11 268 / 0))",
      }} />

      {/* VIEWPORT — the clipping box. .ticker-track is the ANIMATED element
          (inline-flex, flex-shrink:0, translateX(-50%)), so it must stay free to
          overflow and translate; clipping has to happen on a wrapper, not on the
          track itself. Without this box the marquee rendered straight across the
          LIVE label and ate the first characters — in Swahili "MUBASHARA" and
          "TZS" collided into "MUBASHARAZS". The container's own overflow:hidden
          does not help: it clips at the window edge, not at the label.

          `paddingLeft` is 8px of air between the LIVE label's trailing fade and item 1 AT
          REST — the state a reduced-motion reader sees permanently, and the first frame
          everyone else sees. ⚠️ It is NOT a clip fix, and this comment claimed it was for one
          revision: that reading came from a probe measuring the marquee MID-FLIGHT, where
          item 1 sitting left of its container is simply what a marquee does. Re-measured at
          rest with the product's own calm branch applied (computed `transform: none`), item 1
          begins 8px INSIDE the viewport in en, sw and zh. Corrected here rather than quietly
          deleted, because a comment claiming a fix for a defect that was really the
          instrument's is how the next reader "protects" behaviour nothing ever needed. */}
      <div style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden", display: "flex", alignItems: "center", paddingLeft: 8 }}>
        <div className="ticker-track" style={{ animationPlayState: paused ? "paused" : "running" }}>
          <Items events={events} prefix="a" verbs={verbs} sides={sides} />
          <Items events={events} prefix="b" verbs={verbs} sides={sides} />
        </div>
      </div>
    </div>
  );
}
