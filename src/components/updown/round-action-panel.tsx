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
import type { UpDownReceiptInfo } from "@/lib/updown-receipt";

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
    /** UD-22 · the round's frozen receipt facts, for the bet-confirmation modal. */
    receipt?: UpDownReceiptInfo;
  };
  /** The frozen figure for the locked presentation — server-computed, never derived here. */
  myExactPayout: number | null;
  /** UD-20 · what the viewer receives under EACH outcome. Both, or neither. */
  myPayoutIfUp?: number | null;
  myPayoutIfDown?: number | null;
  ariaStake: string;
}) {
  const { t } = useT();
  const { state, selectionClosedAt, closesAt, serverNowMs, stakePanel, myExactPayout, myPayoutIfUp, myPayoutIfDown } = props;
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
    const bothSides = stakePanel.myUpStake > 0 && stakePanel.myDownStake > 0;
    // ⚠️ BOTH OR NEITHER. Rendering one row would be the single-number half-truth again,
    // wearing a different label.
    const payoutIfUp = myPayoutIfUp ?? null;
    const payoutIfDown = myPayoutIfDown ?? null;
    void mySide; void myExactPayout;
    return (
      <section aria-label={t.market.udLockedTitle} style={{ ...insetStyle, padding: 16 }}>
        <span className="chip chip-pending">{t.market.udLockedTitle}</span>
        <p className="mt-2.5 m-0 text-body-sm leading-[1.55] text-text-muted">
          {t.market.udLockedWhy.replace("{time}", lockClock ?? "—")}
        </p>
        {/* ⭐ UD-20 · BOTH OUTCOMES, QUOTED — Ali's decision, 2026-08-14.
            A hedged holder used to see NOTHING here: `myExactPayout` is null for them, because
            one number cannot state a two-sided position and printing `up + down` as if it all
            sat on UP was a confident wrong figure on a money surface (A-5). Suppressing it was
            right; leaving the player with no figure at all was the gap, and RULES.md §2.4 turned
            that from a rare state into an ordinary one.
            ⛔ NOT ANSWERED BY RESURRECTING THE SINGLE NUMBER. Two rows, one per outcome, both
            priced by the server's own `projectedPayout`.
            ⚠️ A one-sided holder gets the same two rows, and their losing outcome reads 0 —
            genuinely true, and more honest than leaving it unsaid. */}
        {payoutIfUp != null && payoutIfDown != null && (
          <div className="mt-3">
            {bothSides && (
              // DG-A-14 · §T3 + §T4 — "You hold both sides" is a full sentence stating the
              // player's position, so it is prose and not a section eyebrow. The uppercase and
              // the 0.14em tracking come off and 10px becomes `text-body-sm` (13), the first
              // rung above the 12.5px reading floor.
              <p className="m-0 font-mono text-body-sm font-bold text-text-subtle">
                {t.market.udBothSidesHeld}
              </p>
            )}
            {/* ⭐ DG-A-12 · §M4 + §T1 — the two "you get" payouts. `.amount` replaces
                `font-mono … tabular-nums`, and 15px — on neither ladder — takes `text-body`
                (14). ⛔ NOT `text-body-lg` (16): the label these sit opposite is `text-body-sm`
                (13) on this very line, so 14 keeps the figure one step louder than the words,
                which is the relationship 15-against-13 was drawing. 16 would open it to three
                steps on a projection §M3 keeps deliberately quiet. */}
            <p className="mt-1.5 m-0 flex items-baseline justify-between gap-3 text-body-sm text-text-muted">
              <span>{t.market.udIfClosesUp}</span>
              <span className="amount text-body font-bold" style={{ color: "var(--yes-300)" }}>
                {t.market.udYouGet} {formatTzs(payoutIfUp)}
              </span>
            </p>
            <p className="mt-1 m-0 flex items-baseline justify-between gap-3 text-body-sm text-text-muted">
              <span>{t.market.udIfClosesDown}</span>
              <span className="amount text-body font-bold" style={{ color: "var(--no-300)" }}>
                {t.market.udYouGet} {formatTzs(payoutIfDown)}
              </span>
            </p>
          </div>
        )}
      </section>
    );
  }

  // Past the close (or settled): this panel renders nothing — the server's own
  // confirming/result/refund branches own those states, and the page poller delivers
  // them. The pod above already counts the wait honestly (E-99/E-104).
  return null;
}
