"use client";

/**
 * UpDownCard — the iconic surface of the Up & Down product.
 *
 * Built to the reviewed spec: `docs/design-system/v2-2026-07-27/02-components/_specs-as-delivered/D1-updown-card-spec.md`.
 * KIT-ONLY — `.chip`, `.live-dot`, `.btn-yes` / `.btn-no`, `formatTzs`, kit glyphs. No
 * primitive is forked here; anything genuinely new belongs in the kit.
 *
 * Four things are MANDATORY on this card (management requirement) and must survive
 * 360px: VOLUME · PLAYERS · AMOUNT · TIMER.
 *
 * ── HONESTY RULES BAKED INTO THIS COMPONENT ─────────────────────────────────
 *  · `livePrice = null` renders an em-dash and "awaiting price". NEVER a zero, never a
 *    stale value dressed as current. (Platform rule A-5 — real data or nothing.)
 *  · The `× 1.4` on the buttons is a DISPLAY ESTIMATE, not fixed odds. It is marked
 *    "est." on the button and carries a qualifier line beneath. Pari-mutuel payouts
 *    depend on how the pools close, and implying otherwise would be a lie to a
 *    real-money bettor.
 *  · `confirming` is CALM, not an error — no red, no spinner, no alarm. The round is
 *    waiting for a source to confirm, which is the system working as designed.
 *  · `void` is NEUTRAL — a refund, not a failure.
 *  · The footer shows the timestamp THE SOURCE published, never our boundary.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Dot } from "@/components/ui/dot";
import { cn, formatTzs } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useUpDownQuickBet, usePlacePulse } from "./use-quick-bet";
import { UpDownStakeControls, GLYPH_NO_SHRINK } from "./updown-stake-controls";
import { Button } from "@/components/ui/button";
// ⭐ The kit's ONE pool-split bar, and the home of the cold-start rail (§B9). See the pool-split
// block below for why this card stopped drawing its own — PV-06.
import { TippingBar } from "@/components/brand";
import { mmss, useHoldAnchor, useTickSeconds } from "./round-countdown";
// ⭐ ONE TIMER FOR THE WHOLE BOARD, and a card that only re-renders when its PHASE moves.
// See `use-shared-second.ts` — a board of eight cards used to arm 32 unaligned intervals and
// re-create every card once a second to re-derive a handful of booleans.
import { secondsUntil, useServerNowGated } from "@/lib/use-shared-second";
import { SOURCE_CLASS_KEY } from "@/lib/updown-source-label";
import { roundPhase, resultClock, handoverClock, type HandoverClock } from "@/lib/updown-card-phase";
import type { RoundSuccessor } from "@/lib/server/updown-board";
// ⛔ ONE RULE FOR "why did this stake come back", shared with the round page, the settlement
// proof, the push and the inbox. Five copies is five chances to disagree about someone money.
import { refundReasonFor, REFUND_REASON_KEY } from "@/lib/updown-refund-reason";
// ⛔ ONE RULE for "what would I be paid" (D2) — shared with the quick-bet controls, the round
// page and the server's own `myExactPayout`. The card never re-derives money.
import { impliedMultiplier, emptySideOf, formatMultiplier, type UpDownPricing } from "@/lib/updown-pricing";
import type { PublicSourceClass } from "@/lib/server/updown-symbols";
import type { UpDownReceiptInfo } from "@/lib/updown-receipt";

export type UpDownCardState = "open" | "locked" | "closing" | "confirming" | "resolved" | "void";

export type UpDownCardProps = {
  /** UD-22 · the round's frozen receipt facts, for the bet-confirmation modal. */
  receipt?: UpDownReceiptInfo;
  roundId: string;
  assetName: string;
  assetTicker: string;
  /** Kit icon recipe key. Unknown keys fall back to a neutral ring. */
  assetIcon: string;
  durationMinutes: number;
  /** Quote precision — the price is never shown to more digits than the source gives. */
  decimals: number;
  /** null ⇒ "—" + awaiting price. NEVER render 0 for an unknown price. */
  livePrice: number | null;
  openPrice: number | null;
  /** Frozen winning boundaries (base ± margin, the PDF's Up/Down target prices). A side
   *  must REACH its target to win: UP ≥ upTarget, DOWN ≤ downTarget; a smaller move voids
   *  + refunds. Null on legacy rounds or before the open price is confirmed. */
  upTarget?: number | null;
  downTarget?: number | null;
  movePct: number | null;
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
  volumeTzs: number;
  players: number;
  /**
   * 0..100, or **null** when the pool is empty. Down is derived — one number, one source.
   *
   * ⛔ NULL IS NOT "UNKNOWN, SO SHOW 50". It is *there is no crowd price*, and it is the whole
   * point of the type (PV-06). Until 2026-09-03 this was a bare `number` fed by
   * `impliedYesPct`, which hands out a hardcoded 50 on an empty pool — so a live round with
   * `VOL TZS 0` and no predictors painted a confident "Up 50% · 50% Down". ⛔ Never `?? 50`.
   */
  upPct: number | null;
  /**
   * ⭐ D2 · THE ROUND'S REAL POOL + ITS FROZEN RATES, so the two buttons can quote what a
   * player would ACTUALLY be paid instead of a config constant. See `@/lib/updown-pricing`.
   *
   * 🔴 This replaced `estMultiplier`, a flat `1 + estimatedWinningsRate` that read the same
   * when the other side held TZS 36,000 and when it held nothing. Required, never optional —
   * the E-99 lesson is that an omitted optional argument type-checks and silently does nothing.
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
  /** ISO — the time THE SOURCE quoted, not our boundary. */
  sourceQuotedAt: string | null;
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
};


/**
 * ⭐ THE FORMATTERS ARE BUILT ONCE, NOT PER CALL — the same discipline `formatTzs` already
 * keeps with its module-scope `TZ_NUMBER` in `@/lib/utils`.
 *
 * 🔴 WHY THIS IS A DEVICE PROBLEM AND NOT A TIDINESS ONE. `n.toLocaleString("en-US", {…})`
 * constructs a fresh `Intl.NumberFormat` on **every call** — the single most expensive thing
 * this card did. A card renders up to five of them (live price, open price, both targets, the
 * margin, and a close price once settled), and the card used to re-render once a second, per
 * card, for the whole life of a round. Eight cards on a board is forty `Intl` constructions a
 * second on a handset that has to build one from the ICU locale data each time.
 *
 * Keyed by `decimals`, because that is the only thing that varies — a chain quotes BTC to 2 and
 * gold to 2 but FX to 4, and the board can show several assets' cards in one session.
 * ⛔ Output is byte-identical to what it replaced; this is a caching change, not a format one.
 */
const USD_FORMATS = new Map<number, Intl.NumberFormat>();
function usdFormat(decimals: number): Intl.NumberFormat {
  let f = USD_FORMATS.get(decimals);
  if (f === undefined) {
    f = new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    USD_FORMATS.set(decimals, f);
  }
  return f;
}

/** Asset prices are quoted in USD because that is what the source publishes. Player
 *  money is ALWAYS TZS via formatTzs — the two must never be confusable. */
function usd(n: number, decimals: number): string {
  return `$${usdFormat(decimals).format(n)}`;
}

/**
 * The player count, in the DEVICE's own locale — exactly what `players.toLocaleString()` gave,
 * built once instead of once per render. ⛔ Not `formatNumber` from `@/lib/utils`: that one is
 * pinned to `en-US`, and swapping the locale under a rendered figure is a copy change wearing a
 * performance label.
 * ⚠️ Lazy, so importing this module does not pay for a formatter a page may never draw.
 */
let COUNT_FORMAT: Intl.NumberFormat | null = null;
function formatCount(n: number): string {
  if (COUNT_FORMAT === null) COUNT_FORMAT = new Intl.NumberFormat();
  return COUNT_FORMAT.format(n);
}

/**
 * The wall-clock time the lock happened, in the player's own locale — the identical output of
 * `new Date(ms).toLocaleTimeString(undefined, { hour, minute, second })`, from one formatter.
 * ⚠️ Lazy for the same reason: most cards never render the locked branch.
 */
let CLOCK_FORMAT: Intl.DateTimeFormat | null = null;
function formatClock(ms: number): string {
  if (CLOCK_FORMAT === null) {
    CLOCK_FORMAT = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  return CLOCK_FORMAT.format(new Date(ms));
}

function hhmmss(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(11, 19) : null;
}

/**
 * The two-character mark for an asset.
 *
 * ⚠️ NOT `ticker.slice(0, 2)` — XAU and XAG both start "XA", so every metal rendered an
 * identical chip and Gold was visually indistinguishable from Silver on the board.
 * These are the real element symbols, which is also what the design spec asked for.
 */
const ASSET_MARKS: Record<string, string> = {
  gold: "Au", silver: "Ag", platinum: "Pt", copper: "Cu", oil: "Oil", fx: "FX", crypto: "₿",
};
function markFor(icon: string, ticker: string): string {
  return ASSET_MARKS[icon] ?? ticker.slice(-2).toUpperCase();
}

/**
 * The asset mark — a glyph chip carrying which asset this is.
 *
 * ⭐ Q5, RESOLVED 2026-08-10: **GOLD IS MONEY, AND NOTHING ELSE.** This chip used to tint
 * itself with `--gold-500` / `--gold-400` / `--gold-300` when the asset happened to be gold,
 * and its own comment conceded that was "the one place gold is not earned money". M3 says
 * struck gold appears only where money was **earned** — so the product was spending its most
 * meaningful ink on a label, and a player learning "gold = I won something" had to unlearn it
 * on the board.
 *
 * ⛔ The escape hatch closed with Q7. The standing answer was *"accept it — real artwork
 * replaces the tint anyway"*, and Ali ruled 2026-08-10 that the `Au`/`Ag` lettermarks are
 * FINAL. There is no artwork coming, so the tint is not temporary and had to be decided on
 * its merits. It loses: a law with an exception for the one case that tempted us is not a law.
 *
 * ⚠️ Identity still has to be visible — the fix is not "make gold look like everything else".
 * XAU keeps a distinct **neutral metallic** treatment (a brighter rim and ink than the base
 * chip), so the asset is still instantly recognisable without borrowing the money ink.
 */
export function AssetMark({ icon, ticker, size = 40 }: { icon: string; ticker: string; size?: number }) {
  // A precious-metal asset earns a brighter METALLIC chip — lightness and rim weight, never hue.
  const metal = icon === "gold" || icon === "silver" || icon === "platinum";
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-mono font-bold"
      style={{
        width: size, height: size, fontSize: size >= 44 ? 14 : 13,
        background: metal ? "color-mix(in oklab, var(--text-subtle) 12%, var(--bg-inset))" : "var(--bg-inset)",
        border: `1px solid ${metal ? "color-mix(in oklab, var(--text-muted) 42%, transparent)" : "var(--border)"}`,
        color: metal ? "var(--text-secondary)" : "var(--text-subtle)",
      }}
    >
      {markFor(icon, ticker)}
    </span>
  );
}

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
    countdownTarget, handover, inHandover, running, bettable, podPhase,
  };
}

/** The card's whole clock-derived output as one string — what the gate compares tick to tick. */
function cardKey(c: CardClock): string {
  return [
    c.podPhase, c.locked ? 1 : 0, c.bettable ? 1 : 0, c.running ? 1 : 0,
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
 * side of the number the player is looking at, and paint a rose "last seconds" pulse on `0:31`.
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
      className={cn("m-tick font-mono font-bold tabular-nums leading-none", urgent && "ud-count-pulse")}
      style={{
        fontSize: 28, letterSpacing: "0.05em",
        // Three states, three inks: rose = your last seconds to bet · brand = the
        // result is coming · subtle = nothing is counting. Never rose for the wait —
        // `confirming` is CALM by design (see this file's header), not an alarm.
        // ⭐ E-166 · a COUNTING handover is brand too — the same "something is coming"
        // ink, for the same reason. ⛔ And never rose, on any handover branch: a void
        // hands over exactly like a win does, and the next match is not an alarm.
        color: urgent ? "var(--no-300)" : tone,
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
      {digits ?? mmss(left)}
    </div>
  );
}

export function UpDownCard(props: UpDownCardProps) {
  const {
    roundId, assetName, assetTicker, assetIcon, durationMinutes, decimals,
    livePrice, openPrice, upTarget, downTarget, movePct, closesAtMs, volumeTzs, players, upPct,
    pricing, state, outcome, closePrice, voidReason,
    sourceClass, sourceQuotedAt, className,
    selectionClosesAtMs, serverNowMs, myExactPayout, myPayoutIfUp, myPayoutIfDown, myRefundedStake,
    marketId, isAuthed, minStake, maxStake, walletBalance, myUpStake = 0, myDownStake = 0,
    expectedResultAtMs = null, resolvedAtMs = null, successor, receipt,
  } = props;
  const { t } = useT();
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
          handover, inHandover, running, bettable, podPhase } = c;
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
  const handoverCaption =
    handover.phase === "counting" ? t.market.udNextMatchIn
    : handover.phase === "live" ? t.market.udNextMatchLive
    : handover.phase === "waiting" ? t.market.udNextMatchSoon
    : handover.phase === "unavailable" ? t.market.udNextMatchNone
    : null;
  // ⛔ `—:—`, NEVER A DEAD `0:00`, on every branch that is not counting (E-99 rule 3). The
  // pre-hydration tick renders `--:--` on both sides, which is the same shape and matches.
  // ⚠️ `null` NOW MEANS "COUNT IT" — the leaf owns the ticking number, and a string here is a
  // fixed readout it shows verbatim. The four branches are the same four they always were.
  const handoverDigits = handover.counting ? null : "—:—";
  // The exact time the lock happened (or will), for the reason line. Local-time formatting is
  // deliberate — the player's own clock is what they will compare it against.
  // ⚠️ `formatClock` reuses ONE `Intl.DateTimeFormat`; this used to build a fresh one on every
  // render, and this card used to render every second.
  const lockClock = useMemo(
    () => (selectionClosesAtMs != null ? formatClock(selectionClosesAtMs) : null),
    [selectionClosesAtMs],
  );
  // ⭐ THE LOCK IS WHAT LETS US STOP ESTIMATING. Once betting closes the pool is frozen, so a
  // payout stops being a projection and becomes arithmetic — `× 1.4 est.` can become a real
  // number. That deletes an estimate from a screen about someone's money, which is the shape
  // of half the findings in this campaign.
  //
  // ⛔ AND IT IS COMPUTED ON THE SERVER, NOT HERE. The first version of this line derived it
  // from `upPct` and the estimate multiplier, which ignores the round's FROZEN FEE SNAPSHOT
  // entirely — so it would have printed a confident, wrong figure on a money surface, which is
  // strictly worse than the honest estimate it replaced. `myExactPayout` comes from the same
  // `projectedPayout` the money path pays out with. One rule, one answer.
  const mySide: "UP" | "DOWN" | null = myUpStake > 0 ? "UP" : myDownStake > 0 ? "DOWN" : null;
  const exactWin = locked ? myExactPayout ?? null : null;
  // ⭐ UD-20 (Ali, 2026-08-14) · both outcomes, or neither. Rendering just one would be the
  // single-number half-truth again, wearing a different label.
  const ifUp = locked ? myPayoutIfUp ?? null : null;
  const ifDown = locked ? myPayoutIfDown ?? null : null;
  const holdsBoth = (myUpStake ?? 0) > 0 && (myDownStake ?? 0) > 0;
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
  // ⛔ Both null together, or both numbers. A `downPct` that stayed a number while `upPct` went
  // null would put the cold-start branch and the paint back out of step, which is the defect.
  const downPct = upPct === null ? null : Math.max(0, 100 - upPct);
  const dir = movePct == null ? null : movePct > 0 ? "up" : movePct < 0 ? "down" : "flat";
  const priceColor = dir === "up" ? "var(--yes-300)" : dir === "down" ? "var(--no-300)" : "var(--text-muted)";
  /**
   * ⭐ EVERY FORMATTED STRING ON THIS CARD, COMPUTED ONCE PER CHANGE — not once per render.
   *
   * The prices move when the poller brings a new quote (~20s); the player count and the
   * quoted-at stamp move less often than that. They were all being re-derived on every render,
   * and this card rendered every second. One `useMemo` per group is one dependency compare in
   * place of five `Intl` calls, a `Date` parse and a `toISOString`.
   * ⛔ SAME OUTPUT, SAME RULES. `livePrice == null` is still an em-dash and "awaiting price"
   * (A-5); nothing here invents a figure for a value the source has not given us.
   */
  const priceText = useMemo(() => ({
    live: livePrice == null ? null : usd(livePrice, decimals),
    open: openPrice == null ? null : usd(openPrice, decimals),
    close: closePrice == null ? null : usd(closePrice, decimals),
    up: upTarget == null ? null : usd(upTarget, decimals),
    down: downTarget == null ? null : usd(downTarget, decimals),
    margin: upTarget == null || openPrice == null ? null : usd(upTarget - openPrice, decimals),
    move: movePct == null ? null : `${movePct > 0 ? "+" : ""}${movePct.toFixed(2)}%`,
  }), [livePrice, openPrice, closePrice, upTarget, downTarget, decimals, movePct]);
  const playersText = useMemo(() => formatCount(players), [players]);
  const quoted = useMemo(() => hhmmss(sourceQuotedAt), [sourceQuotedAt]);

  // ── Quick-bet ──────────────────────────────────────────────────────────────
  // One-tap bet that keeps the card in place (see useUpDownQuickBet — the SHARED
  // logic the round-detail bet box uses too). The card does NOT reorder the board or
  // router.refresh() per tap — the game is fast, so taps must feel instant; the
  // board's 20s poller reconciles server truth.
  const canQuickBet = bettable && !!marketId && isAuthed === true;

  // ── UD-17 (option a — default per the audit's recommendation, 2026-08-07) ──
  //
  // At rollover the board's slots shift: the old current card moves to slot 2 and a
  // NEW bettable card mounts under a pointer that may be mid-tap — a real-money
  // mis-tap vector (the buttons are position-stable within a card; the card under the
  // finger changes identity). A freshly-MOUNTED bettable card therefore ignores
  // pointer events for ~300ms — invisible in normal use, and precisely scoped: the
  // card that merely moved slots keeps its React identity (keyed by roundId) and gets
  // no guard. Not motion, so no reduced-motion concern.
  const [tapGuard, setTapGuard] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setTapGuard(false), 300);
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
  });
  // A placed bet pulses the whole card (non-intrusive confirmation, reduced-motion aware).
  const cardPulse = usePlacePulse(bet.justPlaced?.nonce);

  // ── D2 · WHAT THE OTHER SIDE IS WORTH, ON THE DISPLAY-ONLY CARD ───────────
  //
  // The authed card renders `UpDownStakeControls`, which prices against the stake the player
  // has chosen. A SIGNED-OUT card has no stake control, so it prices at `bet.stake` — the
  // default preset, i.e. exactly the stake those buttons would start on after sign-in. It is a
  // reference amount, and the pari-mutuel multiplier barely moves with stake size on any pool
  // that is not nearly empty; where it does move, the empty-side sentence below says so in
  // words. ⛔ What it must NOT be is one number for both sides — that was the defect.
  const outMultUp = impliedMultiplier(pricing, "UP", bet.stake);
  const outMultDown = impliedMultiplier(pricing, "DOWN", bet.stake);
  const outEmpty = emptySideOf(pricing);
  const outEmptyCopy =
    outEmpty === "BOTH" ? t.market.udNobodyBackedEither
    : outEmpty === "UP" ? t.market.udNobodyBacked.replace("{side}", t.market.udUp)
    : outEmpty === "DOWN" ? t.market.udNobodyBacked.replace("{side}", t.market.udDown)
    : null;

  // Signed-out / display-only cards keep the old behaviour: open the round detail
  // (where the sign-in gate lives) rather than trying to place from the card.
  const go = (side: "UP" | "DOWN") => (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    window.dispatchEvent(new Event("50pick:navigating"));
    router.push(`/updown/${roundId}?side=${side}`);
  };

  return (
    <article
      className={cn("mcardp group", cardPulse && "ud-place-pulse", className)}
      aria-label={`${assetName} ${t.market.udTitle} · ${durationMinutes} ${t.market.udMin}`}
      style={{
        cursor: "pointer", display: "flex", flexDirection: "column",
        // UD-17a · the settle window for a card that JUST mounted bettable.
        pointerEvents: tapGuard && bettable ? "none" : undefined,
      }}
      role="link"
      tabIndex={0}
      onClick={() => { window.dispatchEvent(new Event("50pick:navigating")); router.push(`/updown/${roundId}`); }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          router.push(`/updown/${roundId}`);
        }
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2.5">
        <AssetMark icon={assetIcon} ticker={assetTicker} />
        <div className="min-w-0 flex-1">
          {/* 2-line clamp, not ellipsis: Swahili and Chinese expand ~35% and the card
              is bottom-pinned, so the extra height keeps grid alignment (Q6). */}
          <h3 className="font-display text-[14.5px] font-semibold leading-[1.25] text-text"
              style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {assetName} {t.market.udTitle}
            <span className="chip" style={{ marginLeft: 6, verticalAlign: "middle" }}>{durationMinutes} {t.market.udMin}</span>
          </h3>
          <div className="mt-1 flex items-center gap-1.5 font-mono text-micro font-semibold uppercase tracking-[0.10em] text-text-subtle">
            {/* Stage 9b — kit <Dot pulse>. It IS `.live-dot`: same 6px box, same
                `--live-400`, same 2600ms breathe, same gating at all three
                reduced-motion tiers. Nothing about this pip renders differently. */}
            {bettable && <Dot tone="live" size={6} pulse />}
            {/* 🔴 E-166 · THIS SAID "CLOSED" FOR EVERY NON-BETTABLE STATE, and it was wrong about
                three of them. Measured on production 2026-08-19: a settled card read
                **"Closed · BTC"** beside its own "Up wins" result — *closed is not a result* —
                and a LOCKED round, which is still running and still being watched, read "Closed"
                too. Copy discipline §7: say what is true. The word now comes from the round's
                own state, and it is the SAME ladder `/updown/[roundId]` already renders, so the
                two surfaces cannot describe one round differently. */}
            {bettable ? t.market.udStreaming
              : state === "resolved" ? t.market.statusResolved
              : state === "void" ? t.market.statusVoid
              : state === "confirming" ? t.market.udSettlingTitle
              : locked ? t.market.udLockedTitle
              : t.market.statusClosed} · {assetTicker}
          </div>
        </div>
        <div className="shrink-0 text-right">
          {livePrice == null ? (
            <>
              <div className="font-mono text-[15.5px] font-bold tabular-nums" style={{ color: "var(--text-faint)" }}>—</div>
              <div className="font-mono text-micro uppercase tracking-[0.10em] text-text-faint">{t.market.udAwaitingRead}</div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-end gap-1 font-mono text-[15.5px] font-bold tabular-nums" style={{ color: priceColor }}>
                {dir === "up" && <I.trendingUp s={11} />}
                {dir === "down" && <I.trendingDown s={11} />}
                {priceText.live}
              </div>
              {priceText.move != null && (
                <div className="font-mono text-[11px] font-semibold tabular-nums" style={{ color: priceColor }}>
                  {priceText.move}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Countdown (mandatory: TIMER) ───────────────────────────────── */}
      <div className="mt-3 rounded-xl px-3 py-2.5"
           style={{ background: "var(--bg-inset)", border: "1px solid color-mix(in oklab, var(--border) 70%, transparent)" }}>
        {/* ⛔ THE CAPTION IS THE FIX, NOT THE DIGITS. Same `0:36` means two different things
            either side of the lock, so the label must say which — "Betting closes in" before,
            "Result in" after. Without it the player reads a live-looking clock over dead
            buttons and concludes the app cheated them. */}
        <div key={`c-${podPhase}`}
             className="m-tick font-mono text-micro font-semibold uppercase eyebrow text-text-faint"
             style={{
               // ⛔ ONE LINE, ALWAYS, IN EVERY LOCALE. The handover caption replaces the
               // countdown caption inside a pod whose height must not change (no layout shift),
               // and SW/ZH run ~35% longer than EN. A wrapped caption grows the pod by a whole
               // line and shunts every card below it — so the caption is clipped to one line
               // rather than allowed to reflow the board.
               whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
             }}>
          {/* ⭐ E-166 · past the hold, a SETTLED round stops describing itself and names what
              comes next. "Round settled" is the hold; after it the pod is the handover. */}
          {inHandover ? handoverCaption
            : settledNow ? t.market.udRoundSettled
            // ⭐ E-99 · past the close the caption is about the RESULT, never "Selections
            // closed" — the player already knows selections closed, they are waiting to find
            // out what happened. Once the estimate is spent we say we are waiting instead of
            // counting, because a clock that has run out is not information.
            : awaitingResult ? (resultRunning ? t.market.udResultIn : t.market.udAwaitingResult)
            : locked ? t.market.udResultIn
            : running ? t.market.udBetsCloseIn : t.market.udSelectionsClosed}
        </div>
        {/* ⛔ THE PHASE KEY STAYS ON THE ELEMENT THAT WEARS `.m-tick` — the leaf IS that
            element, so the kit's dip-and-land is unchanged. `seedNowMs` is what makes the
            remount safe: without it the first paint of a new phase would be `--:--` for a
            frame, in the middle of the very animation the key exists to trigger.
            ⛔ THE FOUR BRANCHES ARE THE SAME FOUR — "is anything being counted, and to what". */}
        <CardCountdownDigits
          key={`d-${podPhase}`}
          digits={inHandover ? handoverDigits
            : settledNow ? "—:—"
            : awaitingResult && !resultRunning ? "—:—"
            : null}
          targetMs={inHandover ? (handover.targetMs ?? closesAtMs) : countdownTarget}
          serverNowMs={serverNowMs}
          seedNowMs={serverNow}
          urgentEligible={bettable}
          tone={inHandover ? (handover.counting ? "var(--brand-300)" : "var(--text-subtle)")
            : resultRunning ? "var(--brand-300)"
            : running ? "var(--text)" : "var(--text-subtle)"}
        />
      </div>

      {/* ── Stats (mandatory: VOLUME · PLAYERS) ────────────────────────── */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[11.5px] font-semibold tabular-nums text-text-muted">
          <span className="text-micro uppercase eyebrow text-text-faint">{t.market.udVolume} </span>
          {formatTzs(volumeTzs)}
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-[11.5px] font-semibold tabular-nums text-text-muted">
          <I.users s={11} />{playersText}
        </span>
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
      <div className="mt-2">
        {upPct !== null && downPct !== null && (
          <div className="flex items-center justify-between font-mono text-[9.5px] font-bold tracking-[0.06em]">
            <span style={{ color: "var(--yes-300)" }}>{t.market.udUp} {Math.round(upPct)}%</span>
            <span style={{ color: "var(--no-300)" }}>{Math.round(downPct)}% {t.market.udDown}</span>
          </div>
        )}
        {/* ⛔ TWO CALLS, NO `?? 50`. A single call would need a numeric fallback for `yesPct`
            on the empty branch, and writing `upPct ?? 50` here — three lines under a prop doc
            that forbids exactly that — is how the fabricated 50 walks back in the moment
            someone deletes the `empty` prop. The branch makes the contract unforgeable. */}
        {upPct === null ? (
          <TippingBar className="mt-1" height={7} showLabels={false} recastOnHover={false}
            empty emptyLabel={t.market.noBetsYet} />
        ) : (
          <TippingBar className="mt-1" yesPct={upPct} height={7} showLabels={false}
            recastOnHover={false} resolved={state === "resolved"}
            probabilityLabel={t.market.probBarAria.replace("{side}", t.market.udUp)} />
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

      {/* ── The winning prices ────────────────────────────────────────────
          ⛔ RE-WORDED FOR THE TICK-FLOOR MARGIN (Ali's decision, 2026-08-04). This block
          used to be headed "Target to win" and framed the game as REACHING a boundary — a
          band of ±0.02% around the open, which a 5-minute round often failed to cross (36.6%
          of BTC rounds refunded at that setting).

          At the tick floor the band is the asset's smallest meaningful move, so the two tiles
          sit essentially AT the open price and the game is plainly **higher or lower**.
          Keeping the old wording would describe a game the platform no longer runs — E-39's
          exact shape, where a settlement rule was printed underneath a band it did not match.

          Frozen at open; hidden once the round settles (it shows its outcome instead) or
          before a price is confirmed (we never invent a boundary). */}
      {upTarget != null && downTarget != null && state !== "resolved" && state !== "void" && (
        <div className="mt-2.5">
          {/* "Higher or lower than $63,572.10" — the OPEN price is the thing being compared
              against, so it is what the heading names. The ± figure stays because it is the
              honest size of the band, and at the tick floor it is reassuringly tiny. */}
          <div className="flex items-center justify-between gap-2 font-mono text-micro font-semibold uppercase eyebrow text-text-faint">
            <span className="truncate">
              {t.market.udWinTarget}{openPrice != null ? ` ${priceText.open ?? ""}` : ""}
            </span>
            {openPrice != null && <span className="shrink-0 tabular-nums">± {priceText.margin}</span>}
          </div>
          {/* ⚠️ STAGE 9b — these two tiles were examined for the <Stat> consolidation and
              KEPT. They are label-over-value pairs, but not one of them lands on a rung:
              the label is 9px BOLD at 0.10em (the dictionary has 9px/regular and
              9.5px/bold, not this), the value is 12.5px (nearest rung is 13.5), and the
              box is a per-side `color-mix` wash with a matching border that no entry in
              the BOX dictionary describes. The right-hand tile is additionally
              right-ALIGNED, which <Stat> has no prop for. Folding them would restyle the
              two figures that tell a player what price wins — reported instead. */}
          <div className="mt-1 grid grid-cols-2 gap-2">
            <div className="min-w-0 rounded-lg px-2.5 py-1.5"
                 style={{ background: "color-mix(in oklab, var(--yes-500) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--yes-500) 24%, transparent)" }}>
              <div className="flex items-center gap-1 font-mono text-micro font-bold uppercase eyebrow" style={{ color: "var(--yes-300)" }}>
                <I.trendingUp s={10} />{t.market.udUp}
              </div>
              <div className="mt-0.5 font-mono text-[12.5px] font-bold tabular-nums leading-tight" style={{ color: "var(--yes-300)" }}>
                ≥ {priceText.up}
              </div>
            </div>
            <div className="min-w-0 rounded-lg px-2.5 py-1.5 text-right"
                 style={{ background: "color-mix(in oklab, var(--no-500) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--no-500) 24%, transparent)" }}>
              <div className="flex items-center justify-end gap-1 font-mono text-micro font-bold uppercase eyebrow" style={{ color: "var(--no-300)" }}>
                {t.market.udDown}<I.trendingDown s={10} />
              </div>
              <div className="mt-0.5 font-mono text-[12.5px] font-bold tabular-nums leading-tight" style={{ color: "var(--no-300)" }}>
                ≤ {priceText.down}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── The one action / status block. Exactly one renders. ────────── */}
      <div style={{ marginTop: "auto", paddingTop: 12 }}>
        {bettable ? (
          canQuickBet ? (
            // Authed + has its market → the shared quick-bet control (chips + custom
            // amount + place buttons + success pulse), identical to the round page.
            //
            // ⛔ UD-16 · THE CONTROLS AREA IS A NAVIGATION DEAD ZONE. The card is a link
            // (role="link" on the <article>), and only the buttons/input stopped their
            // own propagation — so a tap on the "STAKE" label, a "You're in" chip, the
            // helper line, or the GAP BETWEEN CHIPS bubbled up and navigated away while
            // a player was lining up a bet: a 2mm mis-tap on the money surface yanked
            // them to the detail page. The wrapper swallows click AND the Enter/Space
            // bubbling; header/countdown/stats above keep the card-as-link behaviour.
            // (The per-child stopPropagation prop stays — the input's Escape case and
            // defence in depth cost nothing.)
            <div
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); }}
            >
              {/* UD-22 · the receipt's ghost CTA goes to the round. From the BOARD that is a
                  real destination, so it is offered here; the round page omits it. */}
              <UpDownStakeControls
                bet={bet} pricing={pricing} assetName={assetName} size="card" stopPropagation
                receipt={receipt}
                onWatchRound={receipt ? () => router.push(receipt.roundHref as never) : undefined}
              />
            </div>
          ) : (
            // Signed-out / display-only → the buttons route to the round detail, where
            // the sign-in gate lives. No stake control, no money path from here.
            <>
              {/* ⛔ E-196 · THE SAME PADDING OBJECT THE AUTHED CONTROL USES, IMPORTED.
                  🔴 These two buttons are a SECOND COPY of the pair in `updown-stake-controls.tsx`
                  — same classes, same content shape, different file — because the signed-out card
                  navigates instead of betting. That duplication is exactly why the clipped payout
                  figure appeared ONLY to signed-out visitors, and why the first repair MISSED: it
                  went into the authed copy, which was never the broken one. ⭐ One padding
                  definition, imported, so on this axis at least the two cannot drift again. */}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={go("UP")} className="btn btn-yes btn-lg"
                        aria-label={`${t.market.udUp} — ${assetName}`}>
                  <I.trendingUp s={14} className={GLYPH_NO_SHRINK} /> {t.market.udUp}
                  {outMultUp != null && <span className="font-mono text-[12.5px] opacity-85">× {formatMultiplier(outMultUp)}</span>}
                </button>
                <button type="button" onClick={go("DOWN")} className="btn btn-no btn-lg"
                        aria-label={`${t.market.udDown} — ${assetName}`}>
                  <I.trendingDown s={14} className={GLYPH_NO_SHRINK} /> {t.market.udDown}
                  {outMultDown != null && <span className="font-mono text-[12.5px] opacity-85">× {formatMultiplier(outMultDown)}</span>}
                </button>
              </div>
              {/* ⭐ D2 · the empty-side state — the same sentence the signed-in control shows,
                  because a visitor deciding whether to sign up deserves the same fact. Faint
                  informational ink + the `info` glyph: not gold, not an alarm (G5). */}
              {outEmptyCopy && (
                <p className="mt-1.5 flex items-start gap-1 text-[10px] leading-[1.45] text-text-faint">
                  <I.info s={10} className="mt-[2px] shrink-0" />
                  <span>{outEmptyCopy}</span>
                </p>
              )}
              {(outMultUp != null || outMultDown != null) && (
                <p className="mt-1 text-[10px] leading-[1.45] text-text-faint">{t.market.udEstimateNote}</p>
              )}
            </>
          )
        ) : locked ? (
          // ── 🔒 LOCKED — watching, not betting ─────────────────────────────
          //
          // ⛔ THE MESSAGE CARRIES ITS REASON, and this is the most load-bearing sentence in
          // the feature. "Closed" reads as *the app was too slow and cheated me*. "Bets closed
          // at 07:21:24 — the result is locked so nobody can bet on an outcome they can already
          // see" reads as fair. Identical event, opposite feeling.
          //
          // Deliberately NOT an alarm tone: the round is running normally and the player has
          // done nothing wrong. Same calm chrome as `confirming`.
          <div className="rounded-xl p-3.5" style={{ background: "color-mix(in oklab, var(--bg-inset) 70%, transparent)", border: "1px solid var(--border)" }}>
            {/* V-1 — kit glyph, not the 🔒 emoji: platform rule is no emoji in
                UI copy, and the OS-rendered glyph broke the card's ink. */}
            <span className="chip chip-pending"><I.lock s={11} /> {t.market.udLockedTitle}</span>
            <p className="mt-2 text-body-sm leading-[1.5] text-text-muted">
              {lockClock ? t.market.udLockedWhy.replace("{time}", lockClock) : t.market.udLockedWhy.replace("{time}", "—")}
            </p>
            {/* ⭐ The estimate is GONE here — the pool is frozen, so these are the real figures.
                ⭐ UD-20 (Ali, 2026-08-14) · BOTH OUTCOMES. A hedged holder saw nothing at all
                here: `myExactPayout` is null for them, because one number cannot state a
                two-sided position and pricing `up + down` as if it all sat on UP printed a
                confident wrong figure on a money surface (A-5). Two numbers can. ⚠️ A one-sided
                holder gets the same two rows and their losing row reads 0 — simply true, and
                better than leaving it unsaid. */}
            {ifUp != null && ifDown != null && (
              <div className="mt-2">
                {holdsBoth && (
                  // DG-A-14 · §T3 + §T4 — "You hold both sides" is a sentence about the player's
                  // own position, not an identifier, so the eyebrow dressing is wrong for it:
                  // uppercase and tracking dropped, 10px lifted to `text-body-sm` (13). This is
                  // the card twin of the same line in `round-action-panel.tsx`, and the two
                  // surfaces stay on the same rung.
                  <p className="m-0 font-mono text-body-sm font-bold text-text-subtle">
                    {t.market.udBothSidesHeld}
                  </p>
                )}
                {/* DG-A-12 · §M4 + §T1 — the card's two "if it closes" payouts. `.amount`
                    replaces `font-mono … tabular-nums`; 12.5 → `text-body-sm` (13). ⭐ This is
                    the card twin of `round-action-panel.tsx` L129/135; the two surfaces state
                    the same fact and now land on the same rung. */}
                <p className="mt-1 m-0 flex items-baseline justify-between gap-2 text-body-sm text-text-muted">
                  <span>{t.market.udIfClosesUp}</span>
                  <span className="amount text-body-sm font-bold" style={{ color: "var(--yes-300)" }}>
                    {formatTzs(ifUp)}
                  </span>
                </p>
                <p className="mt-0.5 m-0 flex items-baseline justify-between gap-2 text-body-sm text-text-muted">
                  <span>{t.market.udIfClosesDown}</span>
                  <span className="amount text-body-sm font-bold" style={{ color: "var(--no-300)" }}>
                    {formatTzs(ifDown)}
                  </span>
                </p>
              </div>
            )}
          </div>
        ) : state === "confirming" ? (
          // CALM. No red, no spinner, and above all no number we do not have.
          <div className="rounded-xl p-3.5" style={{ background: "color-mix(in oklab, var(--bg-inset) 70%, transparent)", border: "1px solid var(--border)" }}>
            <span className="chip chip-pending">{t.market.udSettlingTitle}</span>
            <p className="mt-2 text-body-sm leading-[1.5] text-text-muted">{t.market.udConfirmingBody}</p>
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
          <div className="rounded-xl p-3.5" style={{ background: "color-mix(in oklab, var(--bg-inset) 70%, transparent)", border: "1px solid var(--border)" }}>
            <span className="chip">{t.market.udRefundTitle}</span>
            <p className="mt-2 text-body-sm leading-[1.5] text-text-muted">
              {(t.market as Record<string, string>)[REFUND_REASON_KEY[refundReason]]}
            </p>
          </div>
        ) : state === "resolved" ? (
          // The market outcome, NOT the player's payout — no gold here.
          <div className="flex items-center justify-between gap-2 rounded-xl px-3.5 py-3" style={{ background: "var(--bg-inset)" }}>
            <span className="inline-flex items-center gap-1.5 font-mono text-[14px] font-bold tracking-[0.04em]"
                  style={{ color: outcome === "UP" ? "var(--yes-300)" : "var(--no-300)" }}>
              {outcome === "UP" ? <I.trendingUp s={14} className={GLYPH_NO_SHRINK} /> : <I.trendingDown s={14} className={GLYPH_NO_SHRINK} />}
              {outcome === "UP" ? t.market.udUpWins : t.market.udDownWins}
            </span>
            {openPrice != null && closePrice != null && (
              <span className="text-right font-mono text-[10.5px] tabular-nums text-text-muted">
                {priceText.open} → {priceText.close}
              </span>
            )}
          </div>
        ) : (
          <div className="btn btn-ghost btn-lg pointer-events-none w-full justify-center opacity-85">
            {t.market.udAwaitingResult}
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
            {handover.ready && successor?.roundId && (
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
                trailing={<I.chevronRight s={10} />}
                className="font-mono uppercase tracking-[0.08em]"
                style={{ color: "var(--brand-300)", fontSize: 10.5 }}
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

      {/* ── Footer: the trust line. Never dropped, even at 360px. ────────
          🔴 AND IT WAS BEING DROPPED — `truncate` painted "Live metals market · quoted 17:5…"
          on production, measured 2026-08-14 on the first gold round after the chain stall was
          fixed: content 205px in a 191px box at **1024**, and 205 in 196 at **360**. This line
          exists to say WHICH source priced the round and WHEN it quoted — an integrity signal —
          so an ellipsis eating the timestamp removes the only thing it is for. `truncate` sets
          `white-space: nowrap`, so the text could not wrap even when there was a second line to
          be had.
          ⛔ Do not "fix" this by dropping the seconds. E-47b's whole finding was a source that
          had quoted 14 minutes before we read it; second-level precision is the evidence.
          ⚠️ Found by LOOKING, at a width a suite had no reason to visit — `document.scrollWidth`
          cannot see clipping INSIDE a card, which is why `qa:asset-board` measures elements. */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2.5 font-mono text-[9.5px] text-text-faint"
           style={{ borderTop: "1px solid color-mix(in oklab, var(--border) 55%, transparent)" }}>
        <span className="min-w-0">
          {t.market[SOURCE_CLASS_KEY[sourceClass]]}{quoted ? ` · ${t.market.udQuoted} ${quoted}` : ""}
        </span>
        {openPrice != null && (
          <span className="shrink-0 tabular-nums">{t.market.udOpenPrice} {priceText.open}</span>
        )}
      </div>
    </article>
  );
}
