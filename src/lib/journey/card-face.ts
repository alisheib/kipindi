/**
 * WHAT A JOURNEY CARD SAYS — the meta row's right-hand label and each pick's second line, decided once from the
 * market's own facts (the Vodacom plan S7, §3.2; S7-PLAN WP3 step 2, amendments A12 and A24). The card (WP5) draws what
 * `cardFace` returns and decides nothing itself, so a card on the home, `/live`, `/watchlist`, `/results` or the
 * similar rail cannot say two different things about one market.
 *
 * ── THE PICKS read `cardEstimate`'s states and nothing else (`estimate.ts`; the states come from `cardFigures`) ──
 *   · priced (over the cap and a thin side included) → `word`: the side word alone;
 *   · an empty pool, or this side empty → `beFirst`: "Kuwa wa kwanza";
 *   · the other side empty     → `oneSide`: "Upande mmoja tu";
 *   · hidden (a legacy capped fee, the display switch off, no rates) → `word`: the side word alone;
 *   · an Up & Down round (no estimate) → `word`: the product's side word alone.
 * ⭐ NO FIGURE ON A PICK — Ali's ruling of 2026-10-19 (COMPLIANCE-DECISIONS § "2026-10-19 · Up & Down and the market cards
 *   (MOBILE-VISUAL U43): …", item 4: "for market cards we can remove odds please, keep yes and no only … in this and the
 *   Vodacom plan"). A card's two choices read the side words on every surface and in both shells; the three faces that
 *   printed a multiple — `win` "Shinda ≈{mult}× dau", `thin` "Faida ndogo · ≈{mult}×" and `overCap` "Upande mdogo, ona
 *   makadirio" — are gone, with their dictionary keys. The estimate is said where a stake is chosen: the bet sheet
 *   (DESIGN_AUTHORITY §C3, the 2026-09-29 amendment's sheet half). The two pool facts stay — they are not estimates.
 * A market that is not settled and takes no bets now is `closed`: one row, no control. RESOLVED or VOIDED is `settled`,
 * carrying the outcome and its ink: the YES ink, the NO ink, a void neutral (one-sided 8.10's rule). The outcome is the
 * platform's one reading, the recorded verdict else a void for a VOIDED market; a verdict that was never recorded carries
 * no side at all, because no side is better than a wrong one (law 25).
 *
 * ── THE META LABEL (A12) ──
 * `today` ("Inafungwa leo", with its clock) and `waiting` ("Inasubiri matokeo", with its hourglass) take the brighter
 * muted ink; `days` ("Siku N"), `settled` ("Imetatuliwa") and `void` ("Imebatilishwa") keep the row's subtle ink. The
 * kind comes from `cardCloseLabel`'s kinds, the status and the outcome: a market that takes no bets is waiting for its
 * result whatever its clock says, so the label never promises a close the picks have already passed. No closing instant
 * at all is no label (null), never "NaN".
 *
 * ── ONE-SIDED (L22, Open point 7) ──
 * An unsettled pool with money on one side only names its EMPTY side in `oneSidedNote` (the estimate's `emptySide`, a
 * fact the display switch never hides), and the card puts that side into the refund sentence under the picks. It is
 * true in every unsettled phase, the closed one included; a settled card says nothing about it.
 *
 * ⛔ PURE AND CLIENT-SAFE: it imports types only, so nothing it reads can reach a server module (`test:client-graph-safe`
 * pins it). `test:journey-home` §3 holds every state, and `red:journey-home` plants a defect in each.
 */
import type { CardCloseLabel } from "@/lib/markets/card-close-label";
import type { Estimate } from "@/lib/markets/estimate";
import { storedProductLine } from "@/lib/product-line";

/** One pick's second line: a fact about the pool, or nothing (the side word alone). Never a figure (Ali, 2026-10-19). */
export type PickFace =
  | { kind: "beFirst" }
  | { kind: "oneSide" }
  | { kind: "word" };

/** The meta row's right-hand label: which one, and its ink. */
export type CardMeta = {
  kind: "today" | "days" | "waiting" | "settled" | "void";
  emphasis: "muted" | "subtle";
};

/** The pick row: two picks, the one closed row, or the settled row with its outcome and the outcome's ink. */
export type CardPicks =
  | { kind: "open"; YES: PickFace; NO: PickFace }
  | { kind: "break"; until: string }
  | { kind: "closed" }
  | { kind: "settled"; outcome: "YES" | "NO" | "VOID" | null; ink: "yes" | "no" | "neutral" };

export type CardFace = {
  /** Null only when the market carries no closing instant and is still taking bets. */
  meta: CardMeta | null;
  picks: CardPicks;
  /** The side nobody has backed on an unsettled one-sided pool, for the refund sentence; null otherwise. */
  oneSidedNote: "YES" | "NO" | null;
};

export type CardFaceInput = {
  productLine?: string | null;
  status: string;
  resolvedOutcome?: string | null;
  /** The market takes a bet now: `cardFigures`' answer, the bet path's own test. */
  bettable: boolean;
  /** `cardFigures`' estimates (stake 0). Null for each side of an Up & Down round. */
  estimates: { YES: Estimate | null; NO: Estimate | null } | null;
  /** `cardCloseLabel(market, nowMs)`, computed on the server with the render's clock. */
  close: CardCloseLabel | null;
  /** The server's running break: only an unsettled, bettable card replaces its picks with this row. */
  onBreak?: { until: string } | null;
};

/** One pick, from its side's estimate. */
function pickFace(e: Estimate | null, updown: boolean): PickFace {
  if (updown || !e) return { kind: "word" };
  switch (e.state) {
    case "priced":
      // A priced pool's pick is its side word alone, however the estimate reads — over the cap or thin included (Ali,
      // 2026-10-19: no odds on a card). The figure belongs to the bet sheet, where a stake is chosen.
      return { kind: "word" };
    case "emptyPool":
    case "fillsEmptySide":
      return { kind: "beFirst" };
    case "oneSidedRefund":
      return { kind: "oneSide" };
    default:
      // hidden: the side word alone. A card never meets `closed` (the closed row answers first) or `invalidStake`.
      return { kind: "word" };
  }
}

/** The label of a market that takes bets now, from its close label. */
function openMeta(close: CardCloseLabel | null): CardMeta | null {
  if (!close) return null;
  if (close.kind === "today") return { kind: "today", emphasis: "muted" };
  if (close.kind === "days") return { kind: "days", emphasis: "subtle" };
  return { kind: "waiting", emphasis: "muted" };
}

/** ⭐ THE FACE of one card. Total: any input gives an answer, and an answer it cannot honestly give is words, not a number. */
export function cardFace(input: CardFaceInput): CardFace {
  if (input.status === "RESOLVED" || input.status === "VOIDED") {
    const r = input.resolvedOutcome;
    const recorded = r === "YES" || r === "NO" || r === "VOID" ? r : null;
    const outcome = recorded ?? (input.status === "VOIDED" ? "VOID" : null);
    return {
      meta: { kind: outcome === "VOID" ? "void" : "settled", emphasis: "subtle" },
      picks: { kind: "settled", outcome, ink: outcome === "YES" ? "yes" : outcome === "NO" ? "no" : "neutral" },
      oneSidedNote: null,
    };
  }
  // Only a poll's card shows the pool facts and the one-sided note (S0.5): a round shows words, and a Millionea week is
  // never a question card at all — if one ever reached here it reads as words, never a figure it might win.
  const wordsOnly = storedProductLine(input.productLine) !== "MARKET";
  const empty = input.estimates?.YES?.emptySide ?? input.estimates?.NO?.emptySide ?? null;
  const oneSidedNote = !wordsOnly && (empty === "YES" || empty === "NO") ? empty : null;
  if (!input.bettable) {
    return { meta: { kind: "waiting", emphasis: "muted" }, picks: { kind: "closed" }, oneSidedNote };
  }
  if (input.onBreak) return { meta: openMeta(input.close), picks: { kind: "break", until: input.onBreak.until }, oneSidedNote };
  return {
    meta: openMeta(input.close),
    picks: { kind: "open", YES: pickFace(input.estimates?.YES ?? null, wordsOnly), NO: pickFace(input.estimates?.NO ?? null, wordsOnly) },
    oneSidedNote,
  };
}
