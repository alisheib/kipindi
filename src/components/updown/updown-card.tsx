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

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { cn, formatTzs } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { useUpDownQuickBet, usePlacePulse } from "./use-quick-bet";
import { UpDownStakeControls } from "./updown-stake-controls";
import { useCountdown, mmss } from "./round-countdown";
import { SOURCE_CLASS_KEY } from "@/lib/updown-source-label";
import { roundPhase, resultClock } from "@/lib/updown-card-phase";
// ⛔ ONE RULE FOR "why did this stake come back", shared with the round page, the settlement
// proof, the push and the inbox. Five copies is five chances to disagree about someone money.
import { refundReasonFor, REFUND_REASON_KEY } from "@/lib/updown-refund-reason";
// ⛔ ONE RULE for "what would I be paid" (D2) — shared with the quick-bet controls, the round
// page and the server's own `myExactPayout`. The card never re-derives money.
import { impliedMultiplier, emptySideOf, formatMultiplier, type UpDownPricing } from "@/lib/updown-pricing";
import type { PublicSourceClass } from "@/lib/server/updown-symbols";

export type UpDownCardState = "open" | "locked" | "closing" | "confirming" | "resolved" | "void";

export type UpDownCardProps = {
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
  volumeTzs: number;
  players: number;
  /** 0..100. Down is derived — one number, one source. */
  upPct: number;
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
};


/** Asset prices are quoted in USD because that is what the source publishes. Player
 *  money is ALWAYS TZS via formatTzs — the two must never be confusable. */
function usd(n: number, decimals: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
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

/** Asset identity chip. Gold gets a gilt ring as ASSET IDENTITY — flagged in the spec
 *  as the one place gold is not "earned money"; real artwork replaces it (Q7). */
/** The asset mark — a tinted glyph chip. Default 40px on the board card; the D3 round
 *  page uses it at 44px (page scale). Gold tint is asset identity here, NOT earned money. */
export function AssetMark({ icon, ticker, size = 40 }: { icon: string; ticker: string; size?: number }) {
  const gold = icon === "gold";
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-mono font-bold"
      style={{
        width: size, height: size, fontSize: size >= 44 ? 14 : 13,
        background: gold ? "color-mix(in oklab, var(--gold-500) 16%, transparent)" : "var(--bg-inset)",
        border: `1px solid ${gold ? "color-mix(in oklab, var(--gold-400) 45%, transparent)" : "var(--border)"}`,
        color: gold ? "var(--gold-300)" : "var(--text-subtle)",
      }}
    >
      {markFor(icon, ticker)}
    </span>
  );
}

export function UpDownCard(props: UpDownCardProps) {
  const {
    roundId, assetName, assetTicker, assetIcon, durationMinutes, decimals,
    livePrice, openPrice, upTarget, downTarget, movePct, closesAtMs, volumeTzs, players, upPct,
    pricing, state, outcome, closePrice, voidReason,
    sourceClass, sourceQuotedAt, className,
    selectionClosesAtMs, serverNowMs, myExactPayout, myRefundedStake,
    marketId, isAuthed, minStake, maxStake, myUpStake = 0, myDownStake = 0,
    expectedResultAtMs = null,
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
  const secondsToClose = useCountdown(closesAtMs, serverNowMs);
  const nowMs = secondsToClose == null ? (serverNowMs ?? closesAtMs) : closesAtMs - secondsToClose * 1000;
  const { locked, bettable: phaseBettable } = roundPhase({
    state, selectionClosesAtMs: selectionClosesAtMs ?? null, closesAtMs, nowMs,
  });
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
  const settledNow = state === "resolved" || state === "void";
  const clock = resultClock({ state, closesAtMs, expectedResultAtMs, nowMs });
  const awaitingResult = clock.awaiting;
  const resultTarget = clock.targetMs;
  const countdownTarget = resultTarget
    ?? (locked || selectionClosesAtMs == null ? closesAtMs : selectionClosesAtMs);
  const secondsLeft = useCountdown(countdownTarget, serverNowMs);
  // The pre-hydration tick renders `--:--` on both sides; treat it as still counting so the
  // server and client markup agree (the same rule `running` uses below).
  const resultRunning = resultTarget != null && (secondsLeft == null || clock.counting);

  // `secondsLeft === null` is the pre-hydration tick. Treat it as "not yet expired" so
  // the server renders the same action row the client will, and only the digits differ
  // (they read `--:--`, which is identical on both sides).
  const running = secondsLeft == null || secondsLeft > 0;
  // ⛔ `phaseBettable` already excludes the result phase — see the note in `roundPhase`. The
  // pre-hydration tick (`secondsLeft == null`) still has to render the same action row the
  // client will, or the server and client markup disagree.
  const bettable = phaseBettable && running;
  const urgent = bettable && secondsLeft != null && secondsLeft <= 30;
  // The exact time the lock happened (or will), for the reason line. Local-time formatting is
  // deliberate — the player's own clock is what they will compare it against.
  const lockClock = selectionClosesAtMs != null
    ? new Date(selectionClosesAtMs).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;
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

  // ⭐ WHY THIS VIEWER GOT THEIR STAKE BACK — one shared rule (E-65). Covers both the round
  // voiding AND the round deciding with nobody on the other side, which are opposite events
  // that used to render as the same sentence.
  const refundReason = refundReasonFor({
    outcome: state === "void" ? "VOID" : outcome ?? null,
    voidReason: voidReason ?? null,
    refundedStake: myRefundedStake ?? 0,
  });
  const downPct = Math.max(0, 100 - upPct);
  const dir = movePct == null ? null : movePct > 0 ? "up" : movePct < 0 ? "down" : "flat";
  const priceColor = dir === "up" ? "var(--yes-300)" : dir === "down" ? "var(--no-300)" : "var(--text-muted)";
  /* M5 directional primitive — the live-price arrow takes `.g-nudge-up/-down` on a
     data CHANGE only (the keyframe's own rule: never on mount, never looping). The
     first render leaves it static; when the polled `dir` flips, the arrow branch
     remounts carrying the nudge class. */
  const prevDirRef = useRef(dir);
  const dirChangedRef = useRef(false);
  if (dir !== prevDirRef.current) { dirChangedRef.current = true; prevDirRef.current = dir; }
  const nudge = dirChangedRef.current;
  const quoted = hhmmss(sourceQuotedAt);

  // ── Quick-bet ──────────────────────────────────────────────────────────────
  // One-tap bet that keeps the card in place (see useUpDownQuickBet — the SHARED
  // logic the round-detail bet box uses too). The card does NOT reorder the board or
  // router.refresh() per tap — the game is fast, so taps must feel instant; the
  // board's 20s poller reconciles server truth.
  const canQuickBet = bettable && !!marketId && isAuthed === true;
  const bet = useUpDownQuickBet({
    marketId, minStake, maxStake, myUpStake, myDownStake,
    // UD-2 · belt-and-braces: the final-second race is refused locally, off the same
    // server-anchored instants the card's own phase derives from.
    selectionClosesAtMs: selectionClosesAtMs ?? null, serverNowMs,
    copy: { placed: t.market.udBetPlaced, failed: t.market.udBetFailed, up: t.market.udUp, down: t.market.udDown, locked: t.market.udLockedTitle },
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
      style={{ cursor: "pointer", display: "flex", flexDirection: "column" }}
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
          <div className="mt-1 flex items-center gap-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.10em] text-text-subtle">
            {bettable && <span className="live-dot" />}
            {bettable ? t.market.udStreaming : t.market.statusClosed} · {assetTicker}
          </div>
        </div>
        <div className="shrink-0 text-right">
          {livePrice == null ? (
            <>
              <div className="font-mono text-[15.5px] font-bold tabular-nums" style={{ color: "var(--text-faint)" }}>—</div>
              <div className="font-mono text-[9px] uppercase tracking-[0.10em] text-text-faint">{t.market.udAwaitingRead}</div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-end gap-1 font-mono text-[15.5px] font-bold tabular-nums" style={{ color: priceColor }}>
                {dir === "up" && <I.trendingUp s={11} className={nudge ? "g-nudge-up" : undefined} />}
                {dir === "down" && <I.trendingDown s={11} className={nudge ? "g-nudge-down" : undefined} />}
                {usd(livePrice, decimals)}
              </div>
              {movePct != null && (
                <div className="font-mono text-[11px] font-semibold tabular-nums" style={{ color: priceColor }}>
                  {movePct > 0 ? "+" : ""}{movePct.toFixed(2)}%
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
        <div className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.12em] text-text-faint">
          {settledNow ? t.market.udRoundSettled
            // ⭐ E-99 · past the close the caption is about the RESULT, never "Selections
            // closed" — the player already knows selections closed, they are waiting to find
            // out what happened. Once the estimate is spent we say we are waiting instead of
            // counting, because a clock that has run out is not information.
            : awaitingResult ? (resultRunning ? t.market.udResultIn : t.market.udAwaitingResult)
            : locked ? t.market.udResultIn
            : running ? t.market.udBetsCloseIn : t.market.udSelectionsClosed}
        </div>
        <div className={cn("font-mono font-bold tabular-nums leading-none", urgent && "ud-count-pulse")}
             style={{
               fontSize: 28, letterSpacing: "0.05em",
               // Three states, three inks: rose = your last seconds to bet · brand = the
               // result is coming · subtle = nothing is counting. Never rose for the wait —
               // `confirming` is CALM by design (see this file's header), not an alarm.
               color: urgent ? "var(--no-300)"
                 : resultRunning ? "var(--brand-300)"
                 : running ? "var(--text)" : "var(--text-subtle)",
               // ⛔ The ladder, not a typed number — see the twin of this line in
               // `round-countdown.tsx` for why `--t-base` and not `--t-flick`.
               transition: "color var(--t-base) var(--m-glide)",
             }}>
          {/* ⛔ An em-dash pair, not `0:00`. A zeroed clock reads as "it should have happened
              and did not"; `—:—` reads as "we are not counting this", which is the truth in
              both the overrun and the never-measured case. It also matches the pre-hydration
              `--:--` convention already used here, so the shape is familiar. */}
          {awaitingResult && !resultRunning ? "—:—" : mmss(secondsLeft)}
        </div>
      </div>

      {/* ── Stats (mandatory: VOLUME · PLAYERS) ────────────────────────── */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[11.5px] font-semibold tabular-nums text-text-muted">
          <span className="text-[8.5px] uppercase tracking-[0.12em] text-text-faint">{t.market.udVolume} </span>
          {formatTzs(volumeTzs)}
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-[11.5px] font-semibold tabular-nums text-text-muted">
          <I.users s={11} />{players.toLocaleString()}
        </span>
      </div>

      {/* Pool split — words AND colour, never colour alone (a11y). */}
      <div className="mt-2">
        <div className="flex items-center justify-between font-mono text-[9.5px] font-bold tracking-[0.06em]">
          <span style={{ color: "var(--yes-300)" }}>{t.market.udUp} {Math.round(upPct)}%</span>
          <span style={{ color: "var(--no-300)" }}>{Math.round(downPct)}% {t.market.udDown}</span>
        </div>
        <div className="mt-1 flex gap-[2px] overflow-hidden rounded-pill" style={{ height: 5 }}>
          <span style={{ width: `${upPct}%`, background: "var(--yes-500)" }} />
          <span style={{ width: `${downPct}%`, background: "var(--no-500)" }} />
        </div>
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
          <div className="flex items-center justify-between gap-2 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-text-faint">
            <span className="truncate">
              {t.market.udWinTarget}{openPrice != null ? ` ${usd(openPrice, decimals)}` : ""}
            </span>
            {openPrice != null && <span className="shrink-0 tabular-nums">± {usd(upTarget - openPrice, decimals)}</span>}
          </div>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <div className="min-w-0 rounded-lg px-2.5 py-1.5"
                 style={{ background: "color-mix(in oklab, var(--yes-500) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--yes-500) 24%, transparent)" }}>
              <div className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-[0.10em]" style={{ color: "var(--yes-300)" }}>
                <I.trendingUp s={10} />{t.market.udUp}
              </div>
              <div className="mt-0.5 font-mono text-[12.5px] font-bold tabular-nums leading-tight" style={{ color: "var(--yes-300)" }}>
                ≥ {usd(upTarget, decimals)}
              </div>
            </div>
            <div className="min-w-0 rounded-lg px-2.5 py-1.5 text-right"
                 style={{ background: "color-mix(in oklab, var(--no-500) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--no-500) 24%, transparent)" }}>
              <div className="flex items-center justify-end gap-1 font-mono text-[9px] font-bold uppercase tracking-[0.10em]" style={{ color: "var(--no-300)" }}>
                {t.market.udDown}<I.trendingDown s={10} />
              </div>
              <div className="mt-0.5 font-mono text-[12.5px] font-bold tabular-nums leading-tight" style={{ color: "var(--no-300)" }}>
                ≤ {usd(downTarget, decimals)}
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
            <UpDownStakeControls bet={bet} pricing={pricing} assetName={assetName} size="card" stopPropagation />
          ) : (
            // Signed-out / display-only → the buttons route to the round detail, where
            // the sign-in gate lives. No stake control, no money path from here.
            <>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={go("UP")} className="btn btn-yes btn-lg"
                        aria-label={`${t.market.udUp} — ${assetName}`}>
                  <I.trendingUp s={14} /> {t.market.udUp}
                  {outMultUp != null && <span className="font-mono text-[12.5px] opacity-85">× {formatMultiplier(outMultUp)} est.</span>}
                </button>
                <button type="button" onClick={go("DOWN")} className="btn btn-no btn-lg"
                        aria-label={`${t.market.udDown} — ${assetName}`}>
                  <I.trendingDown s={14} /> {t.market.udDown}
                  {outMultDown != null && <span className="font-mono text-[12.5px] opacity-85">× {formatMultiplier(outMultDown)} est.</span>}
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
            <span className="chip chip-pending">🔒 {t.market.udLockedTitle}</span>
            <p className="mt-2 text-[11.5px] leading-[1.5] text-text-muted">
              {lockClock ? t.market.udLockedWhy.replace("{time}", lockClock) : t.market.udLockedWhy.replace("{time}", "—")}
            </p>
            {/* ⭐ The estimate is GONE here — the pool is frozen, so this is the real figure. */}
            {exactWin != null && mySide && (
              <p className="mt-2 font-mono text-[12.5px] font-bold tabular-nums"
                 style={{ color: mySide === "UP" ? "var(--yes-300)" : "var(--no-300)" }}>
                {t.market.udYouWin} {formatTzs(exactWin)} {mySide === "UP" ? t.market.udIfUp : t.market.udIfDown}
              </p>
            )}
          </div>
        ) : state === "confirming" ? (
          // CALM. No red, no spinner, and above all no number we do not have.
          <div className="rounded-xl p-3.5" style={{ background: "color-mix(in oklab, var(--bg-inset) 70%, transparent)", border: "1px solid var(--border)" }}>
            <span className="chip chip-pending">{t.market.udSettlingTitle}</span>
            <p className="mt-2 text-[11.5px] leading-[1.5] text-text-muted">{t.market.udConfirmingBody}</p>
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
            <p className="mt-2 text-[11.5px] leading-[1.5] text-text-muted">
              {(t.market as Record<string, string>)[REFUND_REASON_KEY[refundReason]]}
            </p>
          </div>
        ) : state === "resolved" ? (
          // The market outcome, NOT the player's payout — no gold here.
          <div className="flex items-center justify-between gap-2 rounded-xl px-3.5 py-3" style={{ background: "var(--bg-inset)" }}>
            <span className="inline-flex items-center gap-1.5 font-mono text-[14px] font-bold tracking-[0.04em]"
                  style={{ color: outcome === "UP" ? "var(--yes-300)" : "var(--no-300)" }}>
              {outcome === "UP" ? <I.trendingUp s={14} /> : <I.trendingDown s={14} />}
              {outcome === "UP" ? t.market.udUpWins : t.market.udDownWins}
            </span>
            {openPrice != null && closePrice != null && (
              <span className="text-right font-mono text-[10.5px] tabular-nums text-text-muted">
                {usd(openPrice, decimals)} → {usd(closePrice, decimals)}
              </span>
            )}
          </div>
        ) : (
          <div className="btn btn-ghost btn-lg pointer-events-none w-full justify-center opacity-85">
            {t.market.udAwaitingResult}
          </div>
        )}
      </div>

      {/* ── Footer: the trust line. Never dropped, even at 360px. ──────── */}
      <div className="mt-3 flex items-center justify-between gap-2 pt-2.5 font-mono text-[9.5px] text-text-faint"
           style={{ borderTop: "1px solid color-mix(in oklab, var(--border) 55%, transparent)" }}>
        <span className="truncate">
          {t.market[SOURCE_CLASS_KEY[sourceClass]]}{quoted ? ` · ${t.market.udQuoted} ${quoted}` : ""}
        </span>
        {openPrice != null && (
          <span className="shrink-0 tabular-nums">{t.market.udOpenPrice} {usd(openPrice, decimals)}</span>
        )}
      </div>
    </article>
  );
}
