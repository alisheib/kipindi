"use client";

/**
 * UD-2 · the round page's right-rail action area, PHASE-AWARE AT THE INSTANT.
 *
 * 🔴 WHAT THIS REPLACES. The page rendered `RoundStakePanel` iff `round.state ===
 * "open"` — a prop rendered ONCE on the server. A player sitting on the round page
 * when the lock passed kept a fully live stake panel (chips, custom field, the gold
 * Confirm) for up to the 20s poll interval, while the pod above it already said
 * "Result in" (E-104 fixed the pod; the panel was the branch it missed). Tapping
 * Confirm in that window produced exactly the reported sequence: optimistic "You're
 * in" → the server refuses `SELECTION_CLOSED` → rollback + a vanishing toast. The
 * page's own comment called that gap "worse than no lock at all".
 *
 * ⛔ NO SECOND RULE. The open-vs-locked decision is `roundPhase` — the SAME pure rule
 * the board card runs (updown-card.tsx is the reference implementation) — off the
 * server-anchored ticking clock (`useServerNow`, the E-104 idiom). At the lock
 * instant this flips to the locked presentation with zero refetch; the server's own
 * verdict still wins when it already says locked. The belt under this braces is in
 * the hook itself, which refuses `place()` past the lock on every surface.
 */
import { useServerNow } from "./round-countdown";
import { roundPhase, type RoundPhaseState } from "@/lib/updown-card-phase";
import { RoundStakePanel } from "./round-stake-panel";
import { formatTzs } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { UpDownPricing } from "@/lib/updown-pricing";

const cardStyle = {
  background: "var(--bg-elevated)", border: "1px solid var(--border)",
  borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-card)",
} as const;
const insetStyle = {
  background: "var(--bg-inset)", border: "1px solid color-mix(in oklab, var(--border) 70%, transparent)",
  borderRadius: "var(--r-md)",
} as const;

export function RoundActionPanel(props: {
  state: RoundPhaseState;
  selectionClosedAt: string | null;
  closesAt: string;
  serverNowMs: number;
  /** Everything the live stake panel needs, passed through untouched. */
  stakePanel: {
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
    walletBalance: number | null;
  };
  /** The frozen figure for the locked presentation — server-computed, never derived here. */
  myExactPayout: number | null;
  ariaStake: string;
}) {
  const { t } = useT();
  const { state, selectionClosedAt, closesAt, serverNowMs, stakePanel, myExactPayout } = props;
  const selectionClosesAtMs = selectionClosedAt ? Date.parse(selectionClosedAt) : null;

  const now = useServerNow(serverNowMs);
  // Pre-hydration tick (`now === null`): render from the server's own instant so the
  // server and client markup agree — the same contract useCountdown keeps.
  const nowMs = now ?? serverNowMs;
  const { bettable, locked } = roundPhase({ state, selectionClosesAtMs, closesAtMs: Date.parse(closesAt), nowMs });

  if (bettable) {
    return (
      <section aria-label={props.ariaStake} style={{ ...cardStyle, padding: "14px 16px 16px" }}>
        <RoundStakePanel
          {...stakePanel}
          selectionClosesAtMs={selectionClosesAtMs}
          serverNowMs={serverNowMs}
        />
      </section>
    );
  }

  if (locked) {
    // The SAME locked presentation the server renders for a locked arrival — chip,
    // reason naming the instant, and the frozen exact payout when the viewer holds a
    // side. Copy and shape mirror the page's own locked branch so the two cannot read
    // differently depending on whether the lock happened before or after page load.
    const lockClock = selectionClosesAtMs != null
      ? new Date(selectionClosesAtMs).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      : null;
    const mySide = stakePanel.myUpStake > 0 ? "UP" : stakePanel.myDownStake > 0 ? "DOWN" : null;
    return (
      <section aria-label={t.market.udLockedTitle} style={{ ...insetStyle, padding: 16 }}>
        <span className="chip chip-pending">{t.market.udLockedTitle}</span>
        <p className="mt-2.5 m-0 text-[12.5px] leading-[1.55] text-text-muted">
          {t.market.udLockedWhy.replace("{time}", lockClock ?? "—")}
        </p>
        {myExactPayout != null && mySide != null && (
          <p
            className="mt-3 m-0 font-mono text-[15px] font-bold tabular-nums"
            style={{ color: mySide === "UP" ? "var(--yes-300)" : "var(--no-300)" }}
          >
            {t.market.udYouWin} {formatTzs(myExactPayout)}{" "}
            {mySide === "UP" ? t.market.udIfUp : t.market.udIfDown}
          </p>
        )}
      </section>
    );
  }

  // Past the close (or settled): this panel renders nothing — the server's own
  // confirming/result/refund branches own those states, and the page poller delivers
  // them. The pod above already counts the wait honestly (E-99/E-104).
  return null;
}
