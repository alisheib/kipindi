"use client";

/**
 * RoundActionPanel — the round page's right-rail ACTION slot: the stake panel while
 * betting is open, the locked card once the lock instant passes.
 *
 * UD-2 (ux-audit 2026-08) · E-82's defect, closed in its last branch. The page used to
 * render `RoundStakePanel` iff `round.state === "open"` — a SERVER-RENDERED prop — so a
 * player sitting on the page at the lock kept live chips and the gold Confirm for up to
 * 20 s (the poll interval), and a Confirm tap in that window produced the reported
 * sequence: optimistic "You're in" → server refuses SELECTION_CLOSED → rollback +
 * vanishing toast. The pod above the panel was already instant-driven (E-104); the
 * panel was not.
 *
 * ⭐ No second rule is invented here: the phase comes from `roundPhase` off the
 * server-anchored clock, exactly as the board card derives it (`updown-card.tsx` is the
 * reference implementation). At the lock instant the panel flips to the locked
 * presentation with zero refetch; the server's own render then agrees at the next poll.
 * Past the CLOSE (roundPhase reports neither bettable nor locked) the locked card holds
 * until the poller swaps the page to the confirming branch — the same one-interval
 * staleness the old markup had, minus the live money controls.
 */

import { useState } from "react";
import { useCountdown } from "./round-countdown";
import { roundPhase, type RoundPhaseState } from "@/lib/updown-card-phase";
import { RoundStakePanel } from "./round-stake-panel";
import { formatTzs } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { UpDownPricing } from "@/lib/updown-pricing";
import type { CSSProperties } from "react";

export function RoundActionPanel(props: {
  state: RoundPhaseState;
  selectionClosedAt: string | null;
  closesAtMs: number;
  serverNowMs?: number;
  /** Frozen-pool exact payout for the locked card's "you win X if …" line. */
  myExactPayout: number | null;
  /* — RoundStakePanel pass-through — */
  marketId: string;
  isAuthed: boolean;
  minStake: number;
  maxStake: number;
  myUpStake: number;
  myDownStake: number;
  pricing: UpDownPricing;
  assetName: string;
  signInHref: string;
  lockedSide: "UP" | "DOWN" | null;
  /** UD-1 · server-rendered wallet balance for the bet pre-flight; null = unknown. */
  walletBalance?: number | null;
  /** The page's shared section chromes (kit tokens, composed page-side). */
  cardStyle: CSSProperties;
  insetStyle: CSSProperties;
}) {
  const { t } = useT();
  const {
    state, selectionClosedAt, closesAtMs, serverNowMs, myExactPayout,
    cardStyle, insetStyle, ...panel
  } = props;
  const selectionClosesAtMs = selectionClosedAt ? Date.parse(selectionClosedAt) : null;

  // Same derivation as the board card: tick off the server-anchored clock; the
  // pre-hydration tick falls back to the render-time server instant so server and
  // client markup agree.
  const secondsToClose = useCountdown(closesAtMs, serverNowMs);
  const nowMs = secondsToClose == null ? (serverNowMs ?? closesAtMs) : closesAtMs - secondsToClose * 1000;
  const phase = roundPhase({ state, selectionClosesAtMs, closesAtMs, nowMs });
  // UD-3 · the server's own SELECTION_CLOSED refusal flips this panel immediately —
  // the server has spoken; don't keep offering the Confirm until the next poll.
  const [lockedByServer, setLockedByServer] = useState(false);
  const bettable = phase.bettable && !lockedByServer;

  if (bettable) {
    return (
      <section aria-label={t.market.udStake} style={{ ...cardStyle, padding: "14px 16px 16px" }}>
        <RoundStakePanel
          {...panel}
          selectionClosesAtMs={selectionClosesAtMs}
          serverNowMs={serverNowMs}
          onServerLocked={() => setLockedByServer(true)}
        />
      </section>
    );
  }

  // ── 🔒 LOCKED ── (markup moved verbatim from the page's server branch)
  // ⛔ The message carries its REASON. "Closed" reads as the app being too slow;
  // naming the instant and the fairness rule reads as fair.
  const lockClock = selectionClosedAt
    ? new Date(selectionClosedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;
  return (
    <section aria-label={t.market.udLockedTitle} style={{ ...insetStyle, padding: 16 }}>
      <span className="chip chip-pending">🔒 {t.market.udLockedTitle}</span>
      <p className="mt-2.5 m-0 text-[12.5px] leading-[1.55] text-text-muted">
        {t.market.udLockedWhy.replace("{time}", lockClock ?? "—")}
      </p>
      {/* ⭐ No estimate here — the pool is frozen, so this is the real number. */}
      {myExactPayout != null && (props.myUpStake > 0 || props.myDownStake > 0) && (
        <p className="mt-3 m-0 font-mono text-[15px] font-bold tabular-nums"
           style={{ color: props.myUpStake > 0 ? "var(--yes-300)" : "var(--no-300)" }}>
          {t.market.udYouWin} {formatTzs(myExactPayout)}{" "}
          {props.myUpStake > 0 ? t.market.udIfUp : t.market.udIfDown}
        </p>
      )}
    </section>
  );
}
