"use client";

/**
 * UpDownCard — the iconic surface of the Up & Down product.
 *
 * Built to the reviewed spec: `docs/design-system/v2-2026-07-27/02-components/_specs-as-delivered/D1-updown-card-spec.md`.
 * KIT-ONLY — `<Chip>`, `.live-dot`, `.btn-yes` / `.btn-no`, `formatTzs`, kit glyphs. No
 * primitive is forked here; anything genuinely new belongs in the kit.
 * ⚠️ PV-13c (2026-09-03) — this used to say `.chip`, the raw CSS family `<Chip>` replaced in
 * stage 9 (2026-08-21); this file's own four call sites were the leftover the migration missed.
 *
 * Four things are MANDATORY on this card (management requirement) and must survive
 * 360px: VOLUME · PLAYERS · AMOUNT · TIMER.
 *
 * ── HONESTY RULES BAKED INTO THIS COMPONENT ─────────────────────────────────
 *  · A newer price comes only from this round's confirmed observation. A missing or
 *    failed read never borrows the asset's latest number. (Platform rule A-5.)
 *  · THE TWO CHOICES SAY "UP" AND "DOWN" AND NOTHING ELSE (Ali's ruling of 2026-10-14 — DESIGN_AUTHORITY §C3,
 *    COMPLIANCE-DECISIONS § "2026-10-14 · Up & Down cards show Up and Down only"). No multiplier on the buttons and
 *    no note about one: what a stake would return is said at the commit (the round page's confirm panel, the bet
 *    receipt) and, once betting closes, as the viewer's exact payout. The empty-side sentence stays — it is a fact
 *    about the pools, never an estimate.
 *  · `confirming` is CALM, not an error — no red, no spinner, no alarm. The round is
 *    waiting for a source to confirm, which is the system working as designed.
 *  · `void` is NEUTRAL — a refund, not a failure.
 *  · The footer shows the timestamp THE SOURCE published, never our boundary.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { Chip } from "@/components/ui/chip";
import { Dot } from "@/components/ui/dot";
import { DotSeq } from "@/components/ui/dot-seq";
import { cn, fill, formatNumber, formatTzs } from "@/lib/utils";
import { priceState } from "@/lib/markets/price-state";
import { usd } from "@/lib/usd-price";
import { fillNodes } from "@/lib/fill-nodes";
// ⭐ R5(c) · F1 — the figure's ink is the round's TARGETS, the rule the round page and the landing band read.
import { valueTone } from "@/lib/updown-match";
import { useT } from "@/lib/i18n";
import { formatBreakEnd } from "@/lib/break-end";
import { useUpDownQuickBet, usePlacePulse } from "./use-quick-bet";
import { UpDownSidePair, UpDownStakeControls } from "./updown-stake-controls";
// S12 WP9 · the journey arm's loader alone: the arm is a chunk of its own, fetched only for a journey request.
import { LazyJudTwoWay } from "@/components/journey/updown/jud-lazy";
import type { JudViewer } from "@/lib/journey/updown-arm";
import { PLATFORM_MAX_STAKE, PLATFORM_MIN_STAKE } from "@/lib/payout";
import { AssetMark } from "./asset-mark";
import { Button } from "@/components/ui/button";
// ⭐ The kit's ONE pool-split bar, and the home of the cold-start rail (§B9). See the pool-split
// block below for why this card stopped drawing its own — PV-06.
import { TippingBar } from "@/components/brand";
import { mmss, useHoldAnchor, useTickSeconds } from "./round-countdown";
// ⭐ ONE TIMER FOR THE WHOLE BOARD, and a card that only re-renders when its PHASE moves.
// See `use-shared-second.ts` — a board of eight cards used to arm 32 unaligned intervals and
// re-create every card once a second to re-derive a handful of booleans.
import { secondsUntil, useServerNowGated } from "@/lib/use-shared-second";
import { SOURCE_CLASS_KEY, fmtEATClock } from "@/lib/updown-source-label";
import { RoundLiveLine } from "@/components/charts/round-live-line";
import { roundPhase, resultClock, handoverClock, type HandoverClock } from "@/lib/updown-card-phase";
import { cardPriceRead } from "@/lib/updown-card-view";
import { roundDuration } from "@/lib/updown-round-name";
import type { RoundSuccessor } from "@/lib/server/updown-board";
// ⛔ ONE RULE FOR "why did this stake come back", shared with the round page, the settlement
// proof, the push and the inbox. Five copies is five chances to disagree about someone money.
import { refundReasonFor, viewerRefundCopy, VOID_NOTE_KEY } from "@/lib/updown-refund-reason";
import { STATUS_TONE, TONE_CHIP } from "@/lib/status-tone";
// ⛔ ONE RULE for "which side is empty" (D2) — read from the round's RAW pools and shared with the quick-bet controls
// and the round page. The card prints no multiplier (the owner's ruling of 2026-10-14) and never re-derives money.
import { emptySideOf, type UpDownPricing } from "@/lib/updown-pricing";
import { sideWord } from "@/lib/side-label";
import type { PublicSourceClass } from "@/lib/server/updown-symbols";
import type { UpDownReceiptInfo } from "@/lib/updown-receipt";
import { noticeBody, type KeptBody } from "@/components/ui/empty-state-text";
import { BetBreakNotice } from "@/components/rg/bet-break-notice";

export type UpDownCardState = "open" | "locked" | "closing" | "confirming" | "resolved" | "void";

export type UpDownCardProps = {
  /** UD-22 · the round's frozen receipt facts, for the bet-confirmation modal. */
  receipt?: UpDownReceiptInfo;
  roundId: string;
  assetName: string;
  assetTicker: string;
  /** Kit icon recipe key. Unknown keys fall back to ticker letters. */
  assetIcon: string;
  durationMinutes: number;
  /** Quote precision — the price is never shown to more digits than the source gives. */
  decimals: number;
  /** The latest confirmed observation inside this round, strictly after its open. */
  readPrice: number | null;
  /** True only when the server could not read this round's observations. */
  readUnavailable: boolean;
  openPrice: number | null;
  /** Frozen winning boundaries (base ± margin, the PDF's Up/Down target prices). A side
   *  must REACH its target to win: UP ≥ upTarget, DOWN ≤ downTarget; a smaller move voids
   *  + refunds. Null on legacy rounds or before the open price is confirmed. */
  upTarget?: number | null;
  downTarget?: number | null;
  /** The real round boundary; never derive it from the chosen duration. */
  opensAtMs: number;
  /** The feed key for this asset, passed to the round's live line. */
  assetKey: string;
  /** Absolute instant the round closes; the countdown derives from it client-side so
   *  every card agrees and no server timestamp goes stale in the HTML. */
  closesAtMs: number;
  /**
   * E-72 · the instant bets stop being accepted — the last 20% of the round, floored at 30s.
   * Null on legacy rounds opened before the window existed, which stay bettable to the close.
   *
   * ⛔ THE SERVER'S VALUE, NOT ARITHMETIC DONE HERE. `buyPosition` enforces exactly this field
   * through `isSelectionClosed`, so re-deriving it from the duration would give the card a
   * second answer to "when do bets close" — and a screen that disagrees with the money path
   * about a deadline is how a player comes to believe they were cheated.
   */
  selectionClosesAtMs?: number | null;
  /** The server's clock at render, so the countdown is anchored to IT and not to the handset.
   *  A device 40s fast otherwise shows a different round to the player beside it. */
  serverNowMs?: number;
  /**
   * What this viewer takes home if their side wins — EXACT, not estimated, and only present
   * once the round is locked and the pool can no longer move.
   *
   * ⛔ Computed by the server through the SAME `projectedPayout` that settlement pays out
   * with, because it depends on the round's frozen fee snapshot. Deriving it on the client
   * from the pool split would print a confident wrong number on a money screen.
   */
  myExactPayout?: number | null;
  /** UD-20 · what the viewer receives under EACH outcome. Both, or neither. */
  myPayoutIfUp?: number | null;
  myPayoutIfDown?: number | null;
  /** Settled rows grouped by side on the server; no client inference from a single row. */
  myResults?: Array<{ status: "WIN" | "LOSS" | "VOID"; side: "UP" | "DOWN"; stake: number; payout: number }>;
  volumeTzs: number;
  players: number;
  /**
   * ⭐ D2 · THE ROUND'S REAL POOL + ITS FROZEN RATES. The card reads the RAW pools for its split and its empty-side
   * sentence, and hands the whole object to the quick-bet controls, whose bet receipt states the projected return.
   * See `@/lib/updown-pricing`.
   *
   * ⛔ THE BUTTONS QUOTE NOTHING FROM IT — no multiplier on an Up & Down card (the owner's ruling of 2026-10-14). Until
   * then they printed `× N` from it, and before D2 a flat `1 + estimatedWinningsRate` that read the same whatever the
   * other side held. Required, never optional — the E-99 lesson is that an omitted optional argument type-checks and
   * silently does nothing.
   */
  pricing: UpDownPricing;
  state: UpDownCardState;
  outcome?: "UP" | "DOWN" | null;
  closePrice?: number | null;
  voidReason?: "no-move" | "source-failed" | "operator" | null;
  /**
   * E-53 · the KIND of market this price is read from — NOT the data vendor.
   *
   * ⛔ This is deliberately a `PublicSourceClass` and not a string. It used to be
   * `sourceName: string` and the board handed it `asset.sourceDomain`, so every card on
   * production read "Source: api.twelvedata.com". A typed union makes passing a domain a
   * COMPILE ERROR rather than a thing someone has to remember not to do — the same reason
   * `payoutViewFor` takes an outcome instead of a boolean (E-56).
   */
  sourceClass: PublicSourceClass;
  /** Per-round source quote times from the observations tied to the displayed prices. */
  openQuotedAt: string | null;
  readQuotedAt: string | null;
  closeQuotedAt: string | null;
  className?: string;

  // ── Quick-bet (fast game — one tap places a bet, no navigation) ────────────
  /** The PredictionMarket this round IS — the bet goes to the SAME buyPosition path
   *  the dial uses. Absent ⇒ the card is display-only (buttons route to the detail). */
  marketId?: string;
  /** Signed-out taps route to sign-in instead of placing. */
  isAuthed?: boolean;
  /** Quick-stake selector bounds (the chain's, else the platform default). */
  minStake?: number;
  maxStake?: number;
  /**
   * UD-1 · the viewer's wallet balance, from the board payload. `null` = unknown (a
   * failed read never renders as zero — B-1) and the pre-flight simply does not arm.
   */
  walletBalance?: number | null;
  /**
   * What THIS viewer had returned to them on this round, in TZS. 0 when they were not
   * refunded, or were not in the round at all.
   *
   * ⭐ E-65 · this is what tells a DECIDED round apart from a refunded one FOR THIS PLAYER.
   * A round can resolve DOWN and still hand a stake back, when nobody took the other side.
   */
  myRefundedStake?: number;
  /** The viewer's OWN open stake per side on THIS round (server truth), shown as the
   *  "you're in" indicator and topped up optimistically on each tap. */
  myUpStake?: number;
  myDownStake?: number;
  /**
   * ⭐ E-99 · when the result is genuinely expected — the boundary plus THIS asset's own
   * measured median lag from `UpDownObservation`, computed on the server.
   *
   * ⛔ NULL means "not measured enough to say", and the card must then show no clock at all.
   * Do not substitute a constant: 90s is right for BTC today and wrong for an asset nobody
   * has read yet, and a countdown that expires without a result is worse than no countdown.
   */
  expectedResultAtMs?: number | null;
  /**
   * ⭐ E-166 · when this round's result landed, and what follows it.
   *
   * ⛔ BOTH COME FROM THE SERVER. The hold is anchored to `resolvedAtMs` so it cannot restart on
   * every poll, and the successor's instants are the chain's own — a card that derived "when
   * does the next match start" from the grid would be a second answer to a question the server
   * already answers, and it would keep counting down to a boundary the chain had abandoned.
   * ⛔ Omit them and the card behaves exactly as it did before, so this is additive.
   */
  resolvedAtMs?: number | null;
  successor?: RoundSuccessor;
  /** The board already has this successor card, so a second link is redundant. */
  successorOnBoard?: boolean;
  /** Board calendar and chain state, never inferred from duration or a device clock. */
  nextMarketOpenAtMs?: number | null;
  chainPaused?: boolean;
  /**
   * ⭐ R6-A (2026-10-09, reviewer A's A2) · the viewer's running break or self-exclusion, as the board page words it (the
   * approved sentence with its end, `breakSentence`), or null. A bettable card then draws the break's notice where its
   * one-tap stakes stand (`BetBreakNotice`) — the page reads the lockout, failing open; the card only draws.
   */
  breakBody?: KeptBody | null;
  /**
   * S12 WP9–WP10 · a journey reader's own facts (`judViewerFor`, read by the board page for a journey request with a
   * session), or absent. Present, the signed-in control is Juu/Chini's journey arm; absent, it is the classic control.
   */
  journey?: JudViewer | null;
};


// ⭐ THE FORMATTERS ARE BUILT ONCE, NOT PER CALL — this card's own memoized USD formatter
// was hoisted to `@/lib/usd-price` (session 80): six byte-equivalent private copies lived
// across the chart home and the updown/admin pages, the "private copies" class the chart
// one-home sprint exists to kill. The device-cost story (forty Intl constructions a second
// on an eight-card board) and the USD-vs-TZS confusability rule moved with it.

/*
 * ⭐ THE PLAYER COUNT IS GROUPED AS EVERY COUNT IS — `formatNumber` (round 5 of the visual pass, R5-J, 2026-10-09). It had a
 * formatter of its own in the DEVICE's locale (`new Intl.NumberFormat()`, once `players.toLocaleString()`), and the note
 * here kept it on purpose: swapping the locale under a rendered figure is a copy change. This is that copy change, made
 * deliberately — one way to count. The card is a client component the server renders first, so a device whose locale
 * groups otherwise drew "12,345" in the first paint and "12.345" (de) or "12 345" (fr) after hydration: a mismatch, and a
 * grouping no other surface writes. The round page beside it, the cards and the bars all write "12,345".
 */

/**
 * The wall-clock time the lock happened, in the platform's named EAT zone, from one formatter.
 * ⚠️ Lazy for the same reason: most cards never render the locked branch.
 *
 * 🔴 IT RETURNS `null` FOR A TIME THAT IS NOT A TIME, AND THAT IS THE WHOLE POINT (2026-09-18).
 *
 * ⛔ THIS HEADER USED TO CLAIM THIS WAS "the identical output of
 * `new Date(ms).toLocaleTimeString(undefined, { hour, minute, second })`". IT IS NOT, on exactly
 * one input, and that input reaches here:
 *   · `toLocaleTimeString` on an invalid date returns the STRING `"Invalid Date"` — ugly, harmless;
 *   · `Intl.DateTimeFormat.prototype.format` on one THROWS `RangeError: Invalid time value`.
 * So the refactor to "one formatter" silently converted a cosmetic degradation into a throw
 * during render, which escapes to the route error boundary and replaces the whole board with
 * *"Ukurasa huu umekumbana na tatizo"* — a page lost to a clock caption.
 *
 * ⭐ AND THE CALL SITE'S GUARD DOES NOT STOP IT. It tests `selectionClosesAtMs != null`, but the
 * value is built with `Date.parse(...)`, which returns **NaN** — not null — for any string it
 * cannot read. `NaN != null` is `true`, so NaN walks straight through the guard into the throw.
 * `Number.isFinite` is the test that actually holds; its sibling `clockOf` in
 * `updown-bet-receipt-modal.tsx` already used it, so the two now agree.
 * Guard: `npm run test:updown-clock-guard`.
 */
let CLOCK_FORMAT: Intl.DateTimeFormat | null = null;
function formatClock(ms: number): string | null {
  if (!Number.isFinite(ms)) return null;
  if (CLOCK_FORMAT === null) {
    CLOCK_FORMAT = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  }
  return `${CLOCK_FORMAT.format(new Date(ms))} EAT`;
}

/**
 * The asset mark lives in `./asset-mark` since 2026-09-27 (landing v3, R5): the landing's server-side
 * Up & Down band renders it too, and a server component must not import a helper from this `"use client"`
 * module. Re-exported so every existing importer of `AssetMark` from here is unchanged.
 */
export { AssetMark };

/**
 * ⭐ EVERYTHING THIS CARD DERIVES FROM THE CLOCK, IN ONE PURE CALL.
 *
 * 🔴 WHAT IT EXISTS FOR. The card used to hold a ticking `useServerNow` at the TOP of its body,
 * so a second's passing re-rendered the WHOLE card — header, price, the pool bar, both target
 * tiles, the action row and the footer — to re-derive a handful of booleans that had not
 * changed. On an open round every one of those renders produced byte-identical output, once a
 * second, per card, for the entire life of the round.
 *
 * ⭐ Pure, so the SAME call decides the render and gates it (`useServerNowGated`). Writing the
 * phase test twice — once to draw and once to compare — is the two-definitions drift
 * `roundPhase`, `resultClock` and `handoverClock` were extracted to stop, and here the two
 * copies would be one render apart from each other.
 *
 * ⛔ NOT A NEW RULE. Every line below is the arithmetic that stood in the card body, moved
 * verbatim; the shared pure rules are still the ones being called.
 */
type CardClock = {
  locked: boolean;
  settledNow: boolean;
  awaitingResult: boolean;
  resultTarget: number | null;
  resultRunning: boolean;
  countdownTarget: number;
  handover: HandoverClock;
  inHandover: boolean;
  running: boolean;
  bettable: boolean;
  urgent: boolean;
  podPhase: string;
};

function cardClock(p: {
  state: UpDownCardState;
  selectionClosesAtMs: number | null;
  closesAtMs: number;
  expectedResultAtMs: number | null;
  successorExists: boolean;
  successorOpensAtMs: number | null;
  chainRunning: boolean;
  holdAnchor: number | null;
  /**
   * The instant to evaluate at — the caller's `serverNow ?? serverNowMs ?? closesAtMs`.
   * ⛔ PASSED IN, NOT RE-DERIVED HERE, so the card's own `nowMs` line stays the single place
   * this product decides what "now" is on this surface (E-166's frozen-clock defect lived on
   * exactly that line, and `red:updown-handover` mutates it to prove the freeze stays fixed).
   */
  nowMs: number;
  /** ⛔ `null` IS THE PRE-HYDRATION TICK, not "unknown". It is what makes the server and the
   *  client render the same markup — see the `--:--` convention below. */
  serverNow: number | null;
}): CardClock {
  const { state, closesAtMs, selectionClosesAtMs, holdAnchor, nowMs } = p;
  const { locked, bettable: phaseBettable } = roundPhase({
    state, selectionClosesAtMs, closesAtMs, nowMs,
  });
  const settledNow = state === "resolved" || state === "void";
  const clock = resultClock({ state, closesAtMs, expectedResultAtMs: p.expectedResultAtMs, nowMs });
  const awaitingResult = clock.awaiting;
  const resultTarget = clock.targetMs;
  const countdownTarget = resultTarget
    ?? (locked || selectionClosesAtMs == null ? closesAtMs : selectionClosesAtMs);
  // ⛔ `secondsUntil` IS THE FUNCTION THE DIGITS USE. `running` was read off `useCountdown`'s
  // CLAMPED return (`secondsLeft > 0`, i.e. `now <= target − 1000`); a gate that instead asked
  // `now < target` would disagree with the number on screen for a full second at every
  // boundary — and `running` decides whether the BET BUTTONS are offered.
  const secondsLeft = p.serverNow == null ? null : secondsUntil(countdownTarget, p.serverNow);
  // The pre-hydration tick renders `--:--` on both sides; treat it as still counting so the
  // server and client markup agree (the same rule `running` uses below).
  const resultRunning = resultTarget != null && (secondsLeft == null || clock.counting);
  const handover = handoverClock({
    state,
    settledAtMs: holdAnchor,
    successorExists: p.successorExists,
    successorOpensAtMs: p.successorOpensAtMs,
    chainRunning: p.chainRunning,
    nowMs,
  });
  // The pod speaks only once the hold has passed — before that the result stands alone.
  const inHandover = handover.phase !== "none" && handover.phase !== "hold";
  // `secondsLeft === null` is the pre-hydration tick. Treat it as "not yet expired" so
  // the server renders the same action row the client will, and only the digits differ
  // (they read `--:--`, which is identical on both sides).
  const running = secondsLeft == null || secondsLeft > 0;
  // ⛔ `phaseBettable` already excludes the result phase — see the note in `roundPhase`. The
  // pre-hydration tick (`secondsLeft == null`) still has to render the same action row the
  // client will, or the server and client markup disagree.
  const bettable = phaseBettable && running;
  const urgent = bettable && secondsLeft != null && secondsLeft > 0 && secondsLeft <= 30;
  /**
   * ⭐ E-166 · the pod reads as ONE object changing state. `.m-tick` is the kit's own
   * dip-and-land for a changing value (`--t-base` / `--m-glide`), keyed on the PHASE so the
   * per-second digits never animate — see the twin of this block in `round-countdown.tsx` for
   * the full reasoning, including why reduced motion needs no branch of its own.
   */
  const podPhase = inHandover ? `h:${handover.phase}`
    : settledNow ? "settled" : awaitingResult ? (resultRunning ? "result" : "spent")
    : locked ? "locked" : running ? "open" : "idle";

  // ⛔ THE INSTANT ITSELF IS DELIBERATELY NOT RETURNED. It changes every second by definition,
  // and `cardKey` is built from this whole struct — leaking `nowMs` into it would put a
  // per-second value in the gate's comparison and undo the entire point of the gate.
  return {
    locked, settledNow, awaitingResult, resultTarget, resultRunning,
    countdownTarget, handover, inHandover, running, bettable, urgent, podPhase,
  };
}

/** The card's whole clock-derived output as one string — what the gate compares tick to tick. */
function cardKey(c: CardClock): string {
  return [
    c.podPhase, c.locked ? 1 : 0, c.bettable ? 1 : 0, c.running ? 1 : 0, c.urgent ? 1 : 0,
    c.awaitingResult ? 1 : 0, c.resultRunning ? 1 : 0, c.resultTarget ?? "-", c.countdownTarget,
    c.settledNow ? 1 : 0, c.inHandover ? 1 : 0, c.handover.phase,
    c.handover.counting ? 1 : 0, c.handover.ready ? 1 : 0, c.handover.targetMs ?? "-",
  ].join("|");
}

/**
 * ⭐ THE LEAF — the ONE part of this card allowed to re-render every second.
 *
 * The card owns the pod's box, its caption and its ink; this owns the digit. That split is what
 * lets `useServerNowGated` hold the card still for a whole round while the number inside it
 * still moves. ⛔ `urgent` is decided HERE, off the same `left` the digits are drawn from — read
 * from a second sampling of the clock upstairs it could cross the 30-second line a tick either
 * side of the number the player is looking at, and start the "last seconds" pulse on `0:31`.
 */
function CardCountdownDigits({
  digits, targetMs, serverNowMs, seedNowMs, urgentEligible, tone,
}: {
  /** A fixed readout to show verbatim, or `null` to COUNT `targetMs` down. */
  digits: string | null;
  targetMs: number; serverNowMs?: number; seedNowMs: number | null;
  urgentEligible: boolean; tone: string;
}) {
  const counting = digits === null;
  const left = useTickSeconds(targetMs, serverNowMs, counting, seedNowMs);
  const urgent = urgentEligible && left != null && left <= 30;
  return (
    <div
      aria-hidden={!counting}
      className="m-tick shrink-0 whitespace-nowrap font-mono font-bold tabular-nums leading-none"
      style={{
        visibility: counting ? undefined : "hidden",
        fontSize: 28, letterSpacing: "0.05em",
        // Inks: `tone` (plain while betting · brand = the result is coming · subtle = nothing
        // is counting). Never rose for the wait — `confirming` is CALM by design (see this
        // file's header), not an alarm.
        // ⭐ E-166 · a COUNTING handover is brand too — the same "something is coming"
        // ink, for the same reason. ⛔ And never rose, on any handover branch: a void
        // hands over exactly like a win does, and the next match is not an alarm.
        // ⛔ AND NOT ROSE IN THE LAST 30 s EITHER (2026-09-14, register E-400 ⓪). The digits sit beside the
        // round's Up and Down sides, and `--no-300` there reads as "price going down" — the betting pair names a
        // side (DESIGN_AUTHORITY §B2a). The kit's `m-urgent` carries urgency; the ink stays the tone.
        color: tone,
        // ⛔ The ladder, not a typed number — see the twin of this line in
        // `round-countdown.tsx` for why `--t-base` and not `--t-flick`.
        transition: "color var(--t-base) var(--m-glide)",
      }}
    >
      {/* ⛔ An em-dash pair, not `0:00`. A zeroed clock reads as "it should have happened
          and did not"; `—:—` reads as "we are not counting this", which is the truth in
          both the overrun and the never-measured case. It also matches the pre-hydration
          `--:--` convention already used here, so the shape is familiar.
          🔴 AND THE SETTLED BRANCH USED TO FALL THROUGH TO `mmss(0)` — a dead `00:00`,
          measured on production 2026-08-19 on both this card and the round page. The
          handover branch is what removes it. */}
      {/* The kit's urgency loop lives on the digits span so the phase dip and loop
          can animate independently. Reduced motion keeps the caption's words. */}
      <span className={urgent ? "m-urgent" : undefined}>{digits ?? mmss(left)}</span>
    </div>
  );
}

export function UpDownCard(props: UpDownCardProps) {
  const {
    roundId, assetName, assetTicker, assetIcon, assetKey, durationMinutes, decimals,
    readPrice, readUnavailable, openPrice, upTarget, downTarget, opensAtMs, closesAtMs, volumeTzs, players,
    pricing, state, outcome, closePrice, voidReason,
    sourceClass, openQuotedAt, readQuotedAt, closeQuotedAt, className,
    selectionClosesAtMs, serverNowMs, myExactPayout, myPayoutIfUp, myPayoutIfDown, myResults, myRefundedStake,
    marketId, isAuthed, minStake, maxStake, walletBalance, myUpStake = 0, myDownStake = 0,
    expectedResultAtMs = null, resolvedAtMs = null, successor, successorOnBoard = false, nextMarketOpenAtMs = null,
    chainPaused, receipt, breakBody = null, journey = null,
  } = props;
  const { t, locale } = useT();
  const router = useRouter();

  // ── TWO DEADLINES, ONE SET OF DIGITS (E-72) ───────────────────────────────
  //
  // ⛔ THE COUNTDOWN MUST RE-LABEL ITSELF AT THE LOCK, not merely keep ticking. Before the
  // lock `0:36` means *"36 seconds left to bet"*; after it, the same digits mean *"36 seconds
  // until you find out"*. Left unlabelled that single ambiguity would produce more complaints
  // than the rest of this rebuild put together — a player watching the number run down while
  // the buttons are dead concludes the app stole their chance, not that the round is fair.
  //
  // So the countdown TARGETS the nearer deadline and the caption names which one it is.
  // 🔴 `state` IS A SERVER-RENDERED PROP, AND THE LOCK HAPPENS WHILE THE PAGE IS OPEN.
  // It is computed once, during the render, so a player who loaded the board DURING betting
  // holds `state: "open"` for as long as they sit there. When the lock passed, `locked` stayed
  // false, the countdown to `selectionClosesAtMs` hit zero, and the caption fell through to the
  // "Selections closed" branch — a DEAD 00:00 clock for the entire result phase. Measured on
  // production 2026-08-04: 25 consecutive samples across a whole 1-minute phase, never once
  // reading "Result in". That is exactly the failure the comment above warns about, and the
  // whole point of Ali's change was to make this phase visible and counted.
  //
  // ⭐ So the lock is derived from the INSTANTS, which the card already has and which do not go
  // stale, with the server's own verdict still winning when it says locked. The clock is
  // anchored to `serverNowMs` (never the device clock — see `useCountdown`), so a player whose
  // laptop is 93 seconds slow still sees the same phase the server is in.
  // `useCountdown` ticks off the SERVER-anchored clock, so this advances through the lock
  // without a refetch and without trusting the device clock. `roundPhase` is pure and lives in
  // `@/lib/updown-card-phase` so the rule is testable — see updown-window §7.
  // 🔴 E-166 · THIS CARD'S CLOCK USED TO STOP AT THE CLOSE, and two separate defects fell out
  // of it. It read:
  //
  //     const secondsToClose = useCountdown(closesAtMs, serverNowMs);
  //     const nowMs = secondsToClose == null ? (serverNowMs ?? closesAtMs)
  //                                          : closesAtMs - secondsToClose * 1000;
  //
  // `useCountdown` CLAMPS at zero (`Math.max(0, …)`), so the moment the close passed
  // `secondsToClose` became 0 and `nowMs` froze at `closesAtMs` — for ever. The card's idea of
  // "now" simply stopped, on the one card whose whole remaining job is about what happens after
  // the close.
  //
  // ⛔ WHAT IT COST, both found by the E2E rather than by any suite:
  //  1. **A dead `0:00` during every result overrun.** `resultClock` decides `counting` as
  //     `nowMs < expectedResultAtMs`; with `nowMs` pinned to `closesAtMs` that is TRUE for ever,
  //     so `resultRunning` never went false, the `—:—` branch was unreachable, and the digits
  //     counted down to a dead `00:00`. That is E-99 rule 3 being broken on the board, live,
  //     by the very variable the rule was given to protect it.
  //  2. **A handover stuck in `hold` for ever.** `resolvedAt` is always LATER than `closesAt`,
  //     so `nowMs < settledAtMs + HANDOVER_HOLD_MS` could never become false. Measured: the
  //     settled board card sat on `Round settled —:—` and never became the ticker.
  //
  // ⭐ `useServerNow` is the tool that already exists for this and the round page's pod already
  // uses it: a real, ticking, SERVER-ANCHORED instant that does not stop at any boundary. The
  // pre-hydration value is the server's own clock, so the markup matches on both sides.
  // ⭐ AND IT NO LONGER RE-RENDERS THE CARD ONCE A SECOND TO DO IT. `useServerNowGated` keeps
  // the ticking instant in a ref and asks for a render only when `cardKey` — the card's whole
  // clock-derived output — actually moves. An open round costs ZERO renders a second; the
  // boundary it is waiting for still lands on the very tick it happens. The digits keep moving
  // in their own leaf (`CardCountdownDigits`), which is the only thing that has to.
  // ⛔ THE HOLD ANCHOR IS READ THROUGH A REF because the gate's closure runs on the ticker,
  // after this render has assigned it. `useHoldAnchor` still stamps during render, on the
  // observed settle, exactly as before.
  const holdAnchorRef = useRef<number | null>(null);
  const clockOf = (n: number | null, at: number): CardClock => cardClock({
    state, selectionClosesAtMs: selectionClosesAtMs ?? null, closesAtMs, expectedResultAtMs,
    successorExists: successor?.roundId != null,
    successorOpensAtMs: successor?.opensAtMs ?? null,
    chainRunning: successor?.chainRunning ?? false,
    holdAnchor: holdAnchorRef.current, nowMs: at, serverNow: n,
  });
  const serverNow = useServerNowGated(serverNowMs, (n) => cardKey(clockOf(n, n ?? serverNowMs ?? closesAtMs)));
  // ⛔ THE HOLD IS OWED FROM WHEN THIS CARD LEARNED THE RESULT. The board polls every 20s, so a
  // hold measured from the server's `resolvedAt` would be spent before the card ever rendered
  // the outcome — the result would flash and be replaced in one paint. See `useHoldAnchor`.
  const settledNow = state === "resolved" || state === "void";
  const holdAnchor = useHoldAnchor(roundId, settledNow, resolvedAtMs, serverNow);
  holdAnchorRef.current = holdAnchor;
  const nowMs = serverNow ?? serverNowMs ?? closesAtMs;
  const c = clockOf(serverNow, nowMs);
  const { locked, awaitingResult, resultRunning, countdownTarget,
          handover, inHandover, running, bettable, urgent, podPhase } = c;
  // A pending result with no measured target has words, but no honest clock.
  // The clock leaf reserves its slot while hiding the non-counting fallback.
  const clockWithoutTarget = (awaitingResult && !resultRunning) || !running;
  // ⭐ E-99 · THE THIRD TIMER — Ali, 2026-08-05: *"we agreed that we want a timer called
  // results and put a new timer for results… so users would wait for results."*
  //
  // 🔴 THE GAP THIS CLOSES, MEASURED ON PRODUCTION over 22 real rounds. The betting clock runs
  // to the LOCK and the result-phase clock runs to the CLOSE — and then the player sat in front
  // of a DEAD `0:00` captioned "Selections closed" for a further **median 95s, p90 116s, max
  // 151s**, because the closing price comes from a dated one-minute bar that does not exist
  // until after the boundary. It is E-82's defect one phase further out, and it was the longest
  // unexplained wait in the game: the round is working perfectly and the screen looks stuck.
  //
  // ⛔ THE TARGET IS MEASURED, NOT ASSUMED. `expectedResultAtMs` is the boundary plus THIS
  // asset's own median lag from `UpDownObservation`, under the same 20-sample floor the
  // operator gate uses. When it is null we show NO clock rather than a plausible one — a
  // countdown is a promise, and a fabricated promise on a money surface is exactly A-5.
  // ⛔ THE RULE LIVES IN `resultClock`, NOT HERE. Inlining it would put the logic somewhere no
  // suite can reach, which is precisely why `roundPhase` was extracted after E-82.
  //
  // ── ⭐ E-166 · THE HANDOVER — what a FINISHED round says about the one that follows ──────
  //
  // 🔴 WHAT THIS REPLACES, read off production 2026-08-19: this card's header said **"Closed ·
  // BTC"** and its pod a frozen `Round settled 00:00`. *Closed is not a result*, and it is not
  // true of a game that emits a round every span, for ever. The chain had already opened the
  // successor — 0.1s after this round settled, in the same `advanceChain` call — and the card
  // said nothing about it.
  //
  // ⛔ THE RULE IS `handoverClock`, NOT LOGIC HERE. Same reasoning as `roundPhase` and
  // `resultClock`: a phase decided inside a client component is a phase no suite can reach.
  // ⛔ AND ITS INSTANTS ARE THE SERVER'S. `successor` carries the chain's own `opensAt` and the
  // market's own lock — never arithmetic done on this side, which would give the screen a second
  // answer to a deadline the money path already owns.
  //
  // ⚠️ ALL THREE RULES NOW LIVE IN `cardClock` ABOVE — moved verbatim, not rewritten, so the
  // gate and the render cannot hold two opinions about which phase this round is in.
  // The lock and the source quote on this card use one named EAT clock. A device-local 12-hour
  // time beside a 24-hour EAT quote made one round appear to have two different clocks.
  // `formatClock` retains its finite guard and its one cached formatter.
  const lockClock = useMemo(
    () => (selectionClosesAtMs != null ? formatClock(selectionClosesAtMs) : null),
    [selectionClosesAtMs],
  );
  // ⭐ THE LOCK IS WHAT LETS THIS CARD STATE MONEY AT ALL. Once betting closes the pool is frozen,
  // so a payout stops being a projection and becomes arithmetic. Before the lock the card states
  // no payout figure — its buttons say Up and Down only (the owner's ruling of 2026-10-14) — and
  // after it, the viewer's own exact payouts below.
  //
  // ⛔ AND IT IS COMPUTED ON THE SERVER, NOT HERE. The first version of this line derived it
  // from `upPct` and the estimate multiplier, which ignores the round's FROZEN FEE SNAPSHOT
  // entirely — so it would have printed a confident, wrong figure on a money surface, which is
  // strictly worse than the honest estimate it replaced. `myExactPayout` comes from the same
  // `projectedPayout` the money path pays out with. One rule, one answer.
  const exactWin = locked ? myExactPayout ?? null : null;
  // ⭐ UD-20 (Ali, 2026-08-14) · both outcomes, or neither. Rendering just one would be the
  // single-number half-truth again, wearing a different label.
  const quoteVisible = locked || awaitingResult || state === "confirming";
  const ifUp = quoteVisible ? myPayoutIfUp ?? null : null;
  const ifDown = quoteVisible ? myPayoutIfDown ?? null : null;
  const holdsBoth = (myUpStake ?? 0) > 0 && (myDownStake ?? 0) > 0;
  // 🔴 U43 (2026-10-19) · A ROUND ONLY ONE SIDE BACKED REFUNDS WHICHEVER WAY IT CLOSES (settlement's `oneSided`: "nobody to
  // lose to"), and the pools are final after the lock — so a holder's locked card says so in ONE sentence instead of the two
  // "If it closes …" rows, which printed TZS 0 on the side they never backed (Round 0, a local round). The side named is the
  // empty one (`emptySideOf`), as the empty-side sentence before the lock names it.
  const emptyAtLock = quoteVisible && ifUp != null && ifDown != null ? emptySideOf(pricing) : null;
  const lockedOneSided: "UP" | "DOWN" | null = emptyAtLock === "UP" || emptyAtLock === "DOWN" ? emptyAtLock : null;
  // ⚠️ `exactWin`/`mySide` stay in the payload and are no longer painted on the locked card —
  // the pair above replaces that line. Kept because other surfaces and suites still read them,
  // and because `myExactPayout` must remain the ONE-SIDED-ONLY field it was fixed to be.
  void exactWin;

  // ⭐ WHY THIS VIEWER GOT THEIR STAKE BACK — one shared rule (E-65). Covers both the round
  // voiding AND the round deciding with nobody on the other side, which are opposite events
  // that used to render as the same sentence.
  const refundReason = refundReasonFor({
    outcome: state === "void" ? "VOID" : outcome ?? null,
    voidReason: voidReason ?? null,
    refundedStake: myRefundedStake ?? 0,
  });
  // ⛔ 2026-09-13 · On a VOID round `refundReason` is the ROUND's reason whether or not this
  // viewer bet, so the pill and "your stake is back" are gated on THEIR refunded stake. A viewer
  // with nothing returned gets the round's neutral void note, never a claim about money.
  const refundCopy = viewerRefundCopy(refundReason, myRefundedStake ?? 0);
  const refundCopyText = refundCopy ? (t.market as Record<string, string>)[refundCopy.key] : undefined;
  // The settled result below states the exact returned amount. In that case the card
  // needs only WHY it came back here, not a second promise that it came back in full.
  // Reuse the canonical reason-only void notes; unmatched has its own reason because
  // that round decided normally and must never be described as void.
  const ownRefundAmountShown = settledNow && !!myResults?.length && myResults.every((r) => r.status === "VOID");
  const cardRefundCopyText = ownRefundAmountShown && refundCopy?.claimsRefund && refundReason
    ? refundReason === "unmatched" ? t.market.udRefundUnmatchedReason
      : (t.market as Record<string, string>)[VOID_NOTE_KEY[refundReason]]
    : refundCopyText;
  // ⭐ C1 · THE CARD'S PRICE RULE, from the round's RAW pools (`priceState`): a split only where both sides
  // hold money (1–99). A one-sided round draws the dashed rail named "One side only" — it used to print
  // "Up 100% · 0% Down" directly above "Nobody has backed Down yet" on the same card. PV-06 (2026-09-03)
  // had already stopped an EMPTY round painting "Up 50% · 50% Down". ⛔ Both null together, or both numbers.
  const price = priceState(pricing.upPool, pricing.downPool);
  const upPct = price.kind === "priced" ? price.yesPct : null;
  const downPct = upPct === null ? null : 100 - upPct;
  /**
   * ⭐ R5(c) · F1 (2026-09-27) · The read's direction follows the round's targets, like settlement.
   *
   * 🔴 It wore the SIGN OF THE MOVE FROM THE OPEN. A read one cent above the open painted green with an up-arrow while
   * settlement, which needs the UP target reached, would refund every stake there: the band one screen away said
   * "Nobody leads" and the round page one tap away painted the same read muted. Three surfaces, one read, two answers.
   * ⭐ `valueTone` is `sideByTargets`, pinned equal to `decideOutcomeByTargets` (`test:updown-match` §1 and §11b): UP at or
   * above `upTarget`, DOWN at or below `downTarget`, muted strictly between. The open decides only for a round that has
   * no targets (legacy), exactly the fallback `price-hero.tsx` keeps.
   * ⛔ The arrow follows the same tone: a level read carries no direction glyph. The price and move
   * remain neutral data; only the UP and DOWN choices or outcome wear side colours (U43 B5).
   */
  const readKind = cardPriceRead({ opensAtMs, closesAtMs, readQuotedAt, openPrice, readPrice });
  const hasNewerRead = !settledNow && readKind === "newer";
  const shownPrice = settledNow ? closePrice ?? null : hasNewerRead ? readPrice : null;
  const tone = valueTone(shownPrice, openPrice, upTarget, downTarget);
  const priceColor = "var(--text)";
  // Strictly between the targets the muted figure says WHY, in the band's own words ("Only $0.20 from the open — not
  // enough to decide"; exactly at the open, the band's "Exactly at the opening price"). Present tense, so only while the
  // round is undecided — a settled card states its result below, never a verdict on a price that no longer decides.
  const levelAmount = hasNewerRead && tone === "level" && shownPrice != null && openPrice != null
    ? usd(Math.abs(shownPrice - openPrice), decimals) : null;
  const levelWords = levelAmount == null ? null
    : levelAmount === usd(0, decimals) ? t.home.udMatchLevelExact
    : fillNodes(t.market.udLevelBy, { amount: <span className="amount">{levelAmount}</span> });
  /**
   * ⭐ EVERY FORMATTED STRING ON THIS CARD, COMPUTED ONCE PER CHANGE — not once per render.
   *
   * The prices move when the poller brings a new quote (~20s); the player count and the
   * quoted-at stamp move less often than that. They were all being re-derived on every render,
   * and this card rendered every second. One `useMemo` per group is one dependency compare in
   * place of five `Intl` calls, a `Date` parse and the quote stamp's EAT formatting.
   * ⛔ A failed or absent round observation stays absent (A-5); nothing here borrows
   * an asset-wide quote and calls it this round's latest price.
   */
  const priceText = useMemo(() => ({
    live: shownPrice == null ? null : usd(shownPrice, decimals),
    open: openPrice == null ? null : usd(openPrice, decimals),
    close: closePrice == null ? null : usd(closePrice, decimals),
    up: upTarget == null ? null : usd(upTarget, decimals),
    down: downTarget == null ? null : usd(downTarget, decimals),
    margin: upTarget == null || openPrice == null ? null : usd(upTarget - openPrice, decimals),
    move: shownPrice == null || openPrice == null ? null
      : `${shownPrice > openPrice ? "+" : shownPrice < openPrice ? "−" : ""}${usd(Math.abs(shownPrice - openPrice), decimals)}`,
  }), [shownPrice, openPrice, closePrice, upTarget, downTarget, decimals]);
  const playersText = useMemo(() => formatNumber(players), [players]);
  /* 2026-09-14 — East Africa Time with the zone stated, the same `fmtEAT` the round page and the
     chart use. A private UTC helper printed "quoted 22:54:00" for a 01:54 EAT quote, so a live
     round read as three hours stale to a player in Tanzania. */
  const displayedQuotedAt = settledNow
    ? closePrice != null ? closeQuotedAt : openPrice != null ? openQuotedAt : null
    : hasNewerRead ? readQuotedAt : openPrice != null ? openQuotedAt : null;
  // U43 B1: the compact card gives the source and the EAT minute on one line.
  // The exact observation instant survives in <time dateTime>; detail still
  // prints seconds beside the settlement proof.
  const quoted = useMemo(() => {
    const clock = displayedQuotedAt ? fmtEATClock(Date.parse(displayedQuotedAt)) : null;
    return clock ? `${clock} EAT` : null;
  }, [displayedQuotedAt]);
  const sourceLabel = t.market[SOURCE_CLASS_KEY[sourceClass]];
  const openClock = fmtEATClock(opensAtMs);
  const closeClock = fmtEATClock(closesAtMs);
  const windowLabel = openClock && closeClock ? `${openClock}–${closeClock}` : null;
  const durationWords = roundDuration(t, durationMinutes);
  const marketReopenClock = nextMarketOpenAtMs != null && Number.isFinite(nextMarketOpenAtMs)
    && nextMarketOpenAtMs > nowMs ? fmtEATClock(nextMarketOpenAtMs) : null;
  const nextRoundWords = marketReopenClock
    ? t.market.udMarketClosedUntil.replace("{time}", `${marketReopenClock} EAT`)
    : chainPaused || successor?.chainRunning === false ? t.market.udNextMatchNoneBody
    : successor?.chainRunning ? t.market.udNextAfterResult : null;

  // ── Quick-bet ──────────────────────────────────────────────────────────────
  // One-tap bet that keeps the card in place (see useUpDownQuickBet — the SHARED
  // logic the round-detail bet box uses too). The card does NOT reorder the board or
  // router.refresh() per tap — the game is fast, so taps must feel instant; the
  // board's 20s poller reconciles server truth.
  // ⛔ No identity term since 2026-09-13: a stake asks no identity question (`kyc-gate.ts`), so the
  // `!kycBlocked` clause that switched quick-bet off for unverified players from 2026-09-05 is deleted.
  const canQuickBet = bettable && !!marketId && isAuthed === true;

  // ── UD-17 (option a — default per the audit's recommendation, 2026-08-07) ──
  //
  // At rollover the board's slots shift: the old current card moves to slot 2 and a
  // NEW bettable card mounts under a pointer that may be mid-tap — a real-money
  // mis-tap vector (the buttons are position-stable within a card; the card under the
  // finger changes identity). A freshly-MOUNTED bettable card therefore ignores
  // pointer events for 340ms — the card entrance's own duration, and precisely scoped: the
  // card that merely moved slots keeps its React identity (keyed by roundId) and gets
  // no guard. Not motion, so no reduced-motion concern.
  const [tapGuard, setTapGuard] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setTapGuard(false), 340);
    return () => clearTimeout(id);
  }, []);
  const bet = useUpDownQuickBet({
    marketId, minStake, maxStake, myUpStake, myDownStake,
    // UD-1/UD-2 · the pre-flight gates: the known balance, and the same lock instant +
    // server clock the card's own phase runs on — one deadline, screen and money agreeing.
    walletBalance, selectionClosesAtMs, serverNowMs,
    copy: {
      placed: t.market.udBetPlaced, failed: t.market.udBetFailed,
      up: t.market.udUp, down: t.market.udDown, insufficient: t.market.udInsufficientBalance,
    },
    errCopy: t.market,
    reasonCopy: t.error as unknown as Record<string, string>,
    // R4-I · a break's end in the reader's words, the formatter every break end uses.
    when: (at) => formatBreakEnd(at, Date.now(), t.common.monthsShort, locale),
  });
  // A placed bet pulses the whole card (non-intrusive confirmation, reduced-motion aware).
  const cardPulse = usePlacePulse(bet.justPlaced?.nonce);

  // ── D2 · THE EMPTY SIDE, ON THE DISPLAY-ONLY CARD ─────────────────────────
  //
  // A SIGNED-OUT card has no stake control, so it says the one fact about the pools a visitor
  // needs before deciding to sign up: which side nobody has backed. It is read from the RAW
  // pools (`emptySideOf`), the rule the authed control and the round page use — never from a
  // printed multiple. ⛔ The buttons quote no multiplier (the owner's ruling of 2026-10-14);
  // until then they printed `× N` here, priced at the default preset.
  const outEmpty = emptySideOf(pricing);
  const outEmptyCopy =
    outEmpty === "BOTH" ? t.market.udNobodyBackedEither
    : outEmpty === "UP" ? t.market.udNobodyBacked.replace("{side}", t.market.udUp)
    : outEmpty === "DOWN" ? t.market.udNobodyBacked.replace("{side}", t.market.udDown)
    : null;

  // Signed-out / display-only cards keep the old behaviour: open the round detail
  // (where the sign-in gate lives) rather than trying to place from the card.
  const go = (side: "UP" | "DOWN") => {
    window.dispatchEvent(new Event("50pick:navigating"));
    router.push(`/updown/${roundId}?side=${side}`);
  };

  return (
    <article
      className={cn("mcardp ud-card group", cardPulse && "ud-place-pulse", className)}
      /* The round's own phase, on the card. It changes NOTHING a player sees — it is here so a
         measurement can be keyed to the state that produced it. U1 found this card measuring 468
         and then 660px minutes apart on the SAME board, because its height follows the live round;
         a before/after taken without the phase is comparing two different cards. 11 values:
         open · locked · result · spent · settled · idle · h:unavailable · h:waiting · h:counting · h:live. */
      data-phase={podPhase}
      data-ud-layout={isAuthed === true && marketId ? (myUpStake > 0 || myDownStake > 0 ? "held" : "player") : "guest"}
      aria-label={`${assetName} ${t.market.udTitle} · ${durationWords}${windowLabel ? ` · ${windowLabel}` : ""}`}
      style={{
        cursor: "pointer", display: "flex", flexDirection: "column",
        // UD-17a · the settle window for a card that JUST mounted bettable.
        pointerEvents: tapGuard && bettable ? "none" : undefined,
      }}
    >
      {/* 🔴 THE SAME FIX AS THE MARKET CARD, AND FOR THE SAME REQUEST. `role="link"` + router.push
          is not an anchor, so the browser offered no "open in new tab", no middle-click and no
          "copy link address" on a round card. This card holds the UP/DOWN buttons and a stake
          input, so it cannot BE an anchor — the link is stretched over it and the action block is
          raised above the link (`.ud-act`, globals.css). */}
      <Link
        href={`/updown/${roundId}` as never}
        className="mcardp-open"
        aria-label={`${assetName} ${t.market.udTitle} · ${durationWords}${windowLabel ? ` · ${windowLabel}` : ""}`}
        onClick={() => window.dispatchEvent(new Event("50pick:navigating"))}
      />
      {/* Identity names the asset and the real EAT round window once. */}
      <div className="ud-identity">
        <AssetMark icon={assetIcon} ticker={assetTicker} size={32} />
        <h3 className="ud-title">{assetName}</h3>
        {windowLabel && <span className="ud-window font-mono tabular-nums">{windowLabel}</span>}
      </div>

      {/* One clock row: a named deadline beside its digits, or the actual result. */}
      <div className="ud-clock">
        <div key={`c-${podPhase}-${urgent ? "final" : "normal"}`}
             className="ud-clock-caption m-tick text-body-sm text-text-subtle"
             aria-live="polite">
          {bettable && <Dot tone="neutral" size={6} pulse />}
          {settledNow ? t.market.udResultLabel
            : awaitingResult ? (resultRunning ? t.market.udResultIn : t.market.udAwaitingResult)
            : locked ? t.market.udClosesIn
            : urgent ? t.market.udLastSeconds
            : running ? t.market.udBetsCloseIn : t.market.udSelectionsClosed}
        </div>
        {settledNow ? (
          <span className="ud-card-result m-tick inline-flex items-center gap-1.5 font-semibold"
                style={{ color: state === "void" ? "var(--text-muted)" : outcome === "UP" ? "var(--yes-300)" : "var(--no-300)" }}>
            {state === "void" ? t.market.statusVoid : outcome === "UP" ? <><I.arrowUp s={14} edge="start" text="body-700" />{price.kind === "oneSided" ? t.market.udUp : t.market.udUpWins}</>
              : outcome === "DOWN" ? <><I.arrowDown s={14} edge="start" text="body-700" />{price.kind === "oneSided" ? t.market.udDown : t.market.udDownWins}</> : t.market.statusResolved}
          </span>
        ) : (
          <CardCountdownDigits
            key={`d-${podPhase}`}
            digits={clockWithoutTarget ? "—:—" : null}
            targetMs={countdownTarget}
            serverNowMs={serverNowMs}
            seedNowMs={serverNow}
            urgentEligible={bettable}
            tone={running ? "var(--text)" : "var(--text-subtle)"}
          />
        )}
      </div>

      {/* The open is the price to beat, stated once. The exact boundaries remain on the round page. */}
      <div className="ud-beat flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-body-sm text-text-subtle">
          {settledNow ? t.market.udOpenPrice : t.market.udWinTarget}
        </span>
        <span className="ud-figure whitespace-nowrap font-mono font-semibold tabular-nums text-text">
          {priceText.open ?? "—"}
        </span>
        {!settledNow && priceText.margin && (
          <span className="font-mono text-micro tabular-nums text-text-faint"
                aria-label={t.home.udMatchRefund.replace("{margin}", priceText.margin)}>±{priceText.margin}</span>
        )}
        {openPrice == null && <span className="text-body-sm text-text-faint">{t.market.udAwaitingRead}</span>}
      </div>

      {openPrice != null && (
        <div className="ud-now" data-tone={tone ?? "none"}>
          {shownPrice == null ? (
            <span className="text-body-sm text-text-subtle">
              {readUnavailable ? t.market.udReadUnavailable
                : openClock
                ? t.home.udMatchNoNewPrice.replace("{time}", openClock)
                : t.market.udAwaitingRead}
            </span>
          ) : (
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
              <span className="text-body-sm text-text-subtle">
                {settledNow ? t.market.udClosePrice : t.market.udConfirmedPrice}
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 whitespace-nowrap" style={{ color: priceColor }}>
                {tone === "up" && <I.arrowUp s={12} edge="start" text="mono-700" />}
                {tone === "down" && <I.arrowDown s={12} edge="start" text="mono-700" />}
                <span className="ud-figure font-mono font-semibold tabular-nums">{priceText.live}</span>
                {priceText.move && <span className="ud-now-delta font-mono text-micro tabular-nums">{priceText.move}</span>}
              </span>
            </div>
          )}
          {levelWords && <p className="m-0 text-body-sm text-text-muted">{levelWords}</p>}
        </div>
      )}

      {/* ── Stats (mandatory: VOLUME · PLAYERS) ────────────────────────── */}
      <div className="ud-stats flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-body-sm">
        <span className="text-text-subtle">{t.market.udPool}</span>
        <span className="amount font-semibold text-text">{formatTzs(volumeTzs)}</span>
        <span aria-hidden className="text-text-faint">·</span>
        <span className="text-text-subtle">{playersText} {players === 1 ? t.market.udPlayersOne : t.market.udPlayers}</span>
      </div>

      {/* ── Pool split — words AND colour, never colour alone (a11y) ──────
          🔴 PV-06, 2026-09-03. This block used to render the percentages and a filled bar
          UNCONDITIONALLY, so a live round with `VOL TZS 0` and zero predictors advertised
          "Up 50% · 50% Down" — a crowd price for a crowd that does not exist. Measured on
          production, on both a LIVE and an already-RESOLVED empty round.

          ⭐ THE BAR IS NOW THE KIT'S, NOT THIS FILE'S. The two-span strip that stood here was
          a second implementation of `TippingBar`, whose own documentation had already ruled on
          exactly this: the cold-start rail is "A STATE OF THIS BAR, not a second component —
          DESIGN_AUTHORITY B9". Thirteen surfaces used the primitive; this card did not, so it
          was the one place the empty state could not be inherited — and the one place it was
          missing. Adopting it also gives the bar a `role="progressbar"` and a localised
          accessible name, which the hand-rolled strip never had at all.

          ⚠️ `height={7}` matches `.mcardp`'s own bar deliberately (market-card.tsx). Both card
          families sit in the same `.mcardp` shell; a 5px bar here and a 7px bar there was one
          idea drawn two ways on one board. */}
      <div className="ud-split">
        {upPct !== null && downPct !== null ? (
          <div className="flex items-center justify-between font-mono text-micro font-semibold">
            <span style={{ color: "var(--yes-300)" }}>{t.market.udUp} {upPct}%</span>
            {/* On the bar's end, its trailing 0.06em taken back (round 7, R7-C) — the round page's bar does the same. */}
            <span className="kp-track-end kp-track-end--06" style={{ color: "var(--no-300)" }}>{downPct}% {t.market.udDown}</span>
          </div>
        ) : price.kind === "oneSided" ? (
          <div className="ud-oneside-caption flex"><span className="mcardp-oneside">{t.market.oneSideOnly}</span></div>
        ) : null}
        {/* ⛔ TWO CALLS, NO `?? 50`. A single call would need a numeric fallback for `yesPct`
            on the empty branch, and writing `upPct ?? 50` here — three lines under a prop doc
            that forbids exactly that — is how the fabricated 50 walks back in the moment
            someone deletes the `empty` prop. The branch makes the contract unforgeable. */}
        {upPct === null ? (
          <TippingBar className="mt-0.5" height={7} showLabels={false} recastOnHover={false}
            empty emptyLabel={price.kind === "oneSided" ? t.market.oneSideOnly : players === 0 ? t.market.noBetsYet : t.market.noPoolYet} />
        ) : (
          <TippingBar className="mt-0.5" yesPct={upPct} height={7} showLabels={false}
            recastOnHover={false} resolved={state === "resolved"}
            probabilityLabel={fill(t.market.barReading, {
              yesPct: upPct, yesWord: t.market.udUp, noPct: 100 - upPct, noWord: t.market.udDown,
            })} />
        )}
        {/* ⛔ NO `mcardp-nobets` CAPTION HERE, and that is a difference from `.mcardp` ON PURPOSE
            — caught by LOOKING at the render, not by any count. `.mcardp` needs the caption
            because the dashed rail is the only thing on that card saying the pool is empty.
            This card already says it, ten lines lower and better: "No bets yet — if only one
            side is backed when betting closes, every stake comes back." Adding the caption put
            the SAME four words twice inside 200px. The rail still carries `noBetsYet` as its
            accessible name, so a screen reader is told once, exactly like a sighted reader.
            ⭐ Consistency is one idea stated one way — not the same words pasted twice. */}
      </div>

      {bettable && outEmptyCopy && (
        <p className="ud-refund-brief m-0 text-body-sm text-text-subtle">
          {t.market.udOneSideRefundBrief}
        </p>
      )}

      {/* ── The one action / status block. Exactly one renders. ────────── */}
      <div className="ud-act">
        {bettable ? (
          canQuickBet && breakBody ? (
            // ⭐ R6-A (2026-10-09, A2) · a signed-in viewer on a break or a self-exclusion is not offered the one-tap stakes:
            // the break's own notice stands where they stand (`BetBreakNotice`, the market page's bet column draws the same).
            <BetBreakNotice body={breakBody} testId="updown-card-break" />
          ) : canQuickBet ? (
            // Authed + has its market → the shared quick-bet control (chips + custom
            // amount + place buttons + success pulse), identical to the round page.
            //
            // ⛔ UD-16 · THE CONTROLS AREA IS A NAVIGATION DEAD ZONE. The card USED to be a
            // link (role="link" on the <article>), and only the buttons/input stopped their
            // own propagation — so a tap on the "STAKE" label, a "You're in" chip, the
            // helper line, or the GAP BETWEEN CHIPS bubbled up and navigated away while
            // a player was lining up a bet: a 2mm mis-tap on the money surface yanked
            // them to the detail page. Today the link is an anchor stretched OVER the card's
            // content (`.mcardp-open`, above: z-index 2 over its rows at 1) and this block is
            // raised above the link (`.ud-act`, z-index 3), so a tap here never reaches it; the
            // wrapper still swallows click AND the Enter/Space bubbling, as defence in depth.
            // Header, countdown and stats sit beneath the link, so a tap there opens the
            // round. (The per-child stopPropagation prop stays — the input's Escape case and
            // defence in depth cost nothing.)
            <div
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); }}
            >
              {/* UD-22 · the receipt's ghost CTA goes to the round. From the BOARD that is a
                  real destination, so it is offered here; the round page omits it. */}
              {/* S12 WP9 · a journey reader's control is Juu/Chini's journey arm, on this very hook; the else arm is the classic control. */}
              {journey && marketId && serverNowMs != null ? <LazyJudTwoWay bet={bet} viewer={journey} assetName={assetName} receipt={receipt} size="card"
                onWatchRound={receipt ? () => router.push(receipt.roundHref as never) : undefined}
                round={{ marketId, roundId, pricing, min: minStake ?? PLATFORM_MIN_STAKE, max: maxStake ?? PLATFORM_MAX_STAKE, selectionClosesAtMs: selectionClosesAtMs ?? null, open: bettable, serverNowMs, myUpStake, myDownStake }} /> : (
              <UpDownStakeControls
                bet={bet} pricing={pricing} assetName={assetName} size="card" stopPropagation
                receipt={receipt}
                onWatchRound={receipt ? () => router.push(receipt.roundHref as never) : undefined}
              />
              )}
            </div>
          ) : (
            // Signed-out / display-only → the buttons route to the round detail, where
            // the sign-in gate lives. No stake control, no money path from here.
            <>
              <UpDownSidePair assetName={assetName} onPick={go} />
              <p className="mt-1 mb-0 text-body-sm text-text-faint">
                {t.market.udSignInToBet} · {t.market.udFromStake} <span className="amount">{formatTzs(minStake ?? PLATFORM_MIN_STAKE)}</span>
              </p>
              {/* ⭐ D2 · the empty-side state — the same sentence the signed-in control shows,
                  because a visitor deciding whether to sign up deserves the same fact. Faint
                  informational ink + the `info` glyph: not gold, not an alarm (G5). */}
              {/* F1 (2026-09-27) · it is a SENTENCE — a refund promise — and it sat at 10px, under §T4's 12.5px reading
                  floor. It takes the kit's 13px, the size the round page already prints it at, and the authed card's copy
                  moved with it (`updown-stake-controls.tsx`). */}
              {outEmptyCopy && (
                <p className="mt-1 flex items-start gap-1 text-body-sm leading-[1.45] text-text-faint break-keep [overflow-wrap:anywhere]">
                  <I.info s={11} className="mt-[2px] shrink-0" />
                  {/* R10-B (round 10's read, tile 166): the note holds "dau lako" / "your stake" like every notice body. */}
                  <span>{noticeBody(outEmptyCopy)}</span>
                </p>
              )}
            </>
          )
        ) : quoteVisible ? (
          <div className="ud-card-wait text-body-sm text-text-muted">
            <p className="m-0">
              {locked ? t.market.udLockedWhy.replace("{time}", lockClock ?? "—") : t.market.udConfirmingBody}
            </p>
            {lockedOneSided && (
              <p className="m-0">{noticeBody(t.market.udLockedOneSided.replace("{side}", sideWord(t, lockedOneSided, "UPDOWN")))}</p>
            )}
            {ifUp != null && ifDown != null && !lockedOneSided && (
              <div className="ud-card-payouts">
                {holdsBoth && <p className="m-0 text-text-subtle">{t.market.udBothSidesHeld}</p>}
                <p className="m-0 flex flex-wrap items-baseline justify-between gap-x-2">
                  <span>{t.market.udIfClosesUp}</span>
                  <span className="amount font-semibold" style={{ color: "var(--yes-300)" }}>{formatTzs(ifUp)}</span>
                </p>
                <p className="m-0 flex flex-wrap items-baseline justify-between gap-x-2">
                  <span>{t.market.udIfClosesDown}</span>
                  <span className="amount font-semibold" style={{ color: "var(--no-300)" }}>{formatTzs(ifDown)}</span>
                </p>
              </div>
            )}
            {nextRoundWords && <p className="ud-card-next m-0 text-text-subtle">{nextRoundWords}</p>}
          </div>
        ) : refundReason ? (
          // ── A REFUND, WITH ITS REAL REASON (E-65 / E-39) ──────────────────
          //
          // ⛔ THIS BRANCH USED TO BE `state === "void"` ONLY, AND THAT IS THE BUG.
          // A round can DECIDE and still refund this player — when nobody took the other side
          // there is no pool to win from. On production a round resolved DOWN, the player had
          // backed UP, and this card said "VOID · REFUNDED" while the rule printed below said
          // they had lost. The money was right and the page argued the opposite.
          //
          // Now the branch is driven by whether THIS VIEWER was refunded, and the sentence
          // comes from `refundReasonFor` — one rule shared with the round page, the settlement
          // proof, the push and the inbox. NEUTRAL chrome throughout: a refund is not a failure.
          <div className="ud-card-refund text-body-sm text-text-muted">
            {!refundCopy?.claimsRefund && (
              // 2026-09-13 · nothing of THIS viewer's came back, so no "Stake returned" pill: the
              // round's own VOID word in the player VOID tone the round page already uses.
              <Chip variant={TONE_CHIP[STATUS_TONE.VOID.player]}>{t.market.statusVoid}</Chip>
            )}
            {cardRefundCopyText && (
              <p className="mt-0 text-body-sm leading-[1.5] text-text-muted text-balance">{cardRefundCopyText}</p>
            )}
          </div>
        ) : state === "resolved" ? null : (
          <p className="m-0 text-body-sm text-text-muted">{t.market.udAwaitingResult}</p>
        )}

        {settledNow && myResults && myResults.length > 0 && (
          <div className="ud-card-own-result text-body-sm text-text-muted">
            {myResults.length === 1 ? (
              <p className="m-0 flex flex-wrap items-baseline gap-x-1.5">
                <span>{t.market.udYourResult}:</span>
                <span>{myResults[0].status === "WIN" ? t.market.udWon
                  : myResults[0].status === "LOSS" ? t.market.udLost : t.market.udRefundTitle}</span>
                <span aria-hidden>·</span>
                {myResults[0].status !== "VOID" && (
                  <span>{myResults[0].status === "WIN" ? t.market.udPaidOut : t.market.udStake}</span>
                )}
                <span className="amount font-semibold"
                      style={{ color: myResults[0].status === "WIN" ? "var(--gold-300)" : "var(--text)" }}>
                  {formatTzs(myResults[0].status === "LOSS" ? myResults[0].stake : myResults[0].payout)}
                </span>
              </p>
            ) : (
              <p className="m-0 flex flex-wrap items-baseline gap-x-1.5">
                <span>{t.market.udBothSidesHeld}</span><span aria-hidden>·</span>
                <span>{myResults.every((result) => result.status === "VOID") ? t.market.udRefundTitle : t.market.udPaidOut}</span>
                <span className="amount font-semibold text-text">
                  {formatTzs(myResults.reduce((sum, result) => sum + result.payout, 0))}
                </span>
              </p>
            )}
          </div>
        )}

        {/* ── ⭐ E-166 · THE HANDOVER LINE — the sentence that makes the pod unambiguous ─────
            The pod above is terse by necessity (one line, three languages, 360px), so the words
            live here: what is happening, and where to go. ⛔ NEUTRAL INK ON EVERY BRANCH — a
            void hands over exactly as a win does (rule 7), so nothing here is rose and nothing
            is gold. `--brand-300` marks only the LINK, which is a navigation, not money. */}
        {inHandover && (
          <p className="mt-2.5 mb-0 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-body-sm leading-[1.45] text-text-muted">
            <span>
              {handover.phase === "live" ? t.market.udNextMatchLiveBody
                : handover.phase === "counting" ? t.market.udNextMatchCountingBody
                : handover.phase === "waiting" ? t.market.udNextMatchSoonBody
                : t.market.udNextMatchNoneBody}
            </span>
            {/* ⛔ ONLY WHEN THERE IS SOMEWHERE TO GO. `ready` is true solely when a successor ROW
                is open, so this link can never point at a round that does not exist — the whole
                reason `ready` is not "the open instant has passed". */}
            {handover.ready && successor?.roundId && !successorOnBoard && (
              /* ⛔ THE KIT PRIMITIVE, AND IT TOOK TWO TRIES. The first draft was a `<button>`
                 painted only with ink, which `test:ui-consistency`'s `bare-text-button` caught
                 — a control whose entire appearance is type reads as a label, and this one sits
                 inside a card the player already knows is clickable, so "is this a different
                 destination?" has to be answered by the chrome. The second draft wore the kit's
                 `btn` CLASSES by hand, which `raw-button-btn-class` caught in turn: the kit's
                 `<Button>` is the primitive, and hand-composing its classes forgoes the spinner,
                 `aria-busy` and icon slots that make every other control in the product behave
                 the same. Third time is the actual kit. */
              <Button
                variant="ghost"
                size="sm"
                trailing={<I.chevronRight s={10} text="mono-600" />}
                className="ud-card-next-button text-body-sm"
                style={{ color: "var(--brand-300)" }}
                onClick={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  window.dispatchEvent(new Event("50pick:navigating"));
                  router.push(`/updown/${successor.roundId}`);
                }}
              >
                {t.market.udNextMatchGo}
              </Button>
            )}
          </p>
        )}
      </div>

      {/* Keep the money buttons at a steady screen position while the vendor's
          minute bars arrive. The line may grow from no drawing to a plot, but
          it cannot push an in-progress tap under the phone navigation. */}
      <RoundLiveLine assetKey={assetKey} opensAtMs={opensAtMs} closesAtMs={closesAtMs}
        openPrice={openPrice} closePrice={closePrice} readPrice={readPrice} readQuotedAt={readQuotedAt}
        decimals={decimals} locale={locale} state={state} serverNowMs={serverNowMs} />

      {/* The one source line. A stamp appears only when it belongs to this round's displayed read. */}
      <div className="ud-foot flex flex-wrap items-baseline gap-x-3 gap-y-1 text-body-sm text-text-faint"
           style={{ borderTop: "1px solid color-mix(in oklab, var(--border) 55%, transparent)" }}>
        <span className="min-w-0">
          <DotSeq
            text={quoted ? `${sourceLabel} · ${quoted}` : sourceLabel}
            renderPart={(part) => part === quoted
              ? <time className="whitespace-nowrap font-mono tabular-nums" dateTime={displayedQuotedAt ?? undefined}>{quoted}</time>
              : part}
          />
        </span>
      </div>
    </article>
  );
}
