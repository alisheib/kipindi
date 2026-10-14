/**
 * JUU/CHINI IN THE JOURNEY'S LANGUAGE — THE PURE HALF (the Vodacom plan S12, WP9–WP11; `S12-PLAN.md`).
 *
 * A journey reader's Up & Down controls are drawn by `components/journey/updown/jud-arm.tsx`; every decision they show is
 * made here, from the same engines the bet sheet reads, so the two cannot disagree about a wallet:
 *   · THE FRAME is the sheet's own `sheetFrame`, on the round dressed as a sheet seed (`judSeed`): the stake as typed, its
 *     bounds line, the chips (`quickStakes(min, max)`, full figures), and every refusal branch the sheet draws, in the bet
 *     path's order (maintenance, a break, the session limit, the account, a held wallet, the round no longer taking bets,
 *     the stake's bounds, the loss limit, a pending deposit by its age, the deposit's ceilings, source of funds, every
 *     mobile-money rail paused). ⛔ The seed carries NO rates, so the frame's own estimate is always `hidden`: no Up & Down
 *     figure is ever priced by the YES/NO engine, and no multiple can reach a Juu/Chini control (the owner's ruling of
 *     2026-10-14: an Up & Down choice says Up or Down, nothing else).
 *   · THE PROJECTION at the commit is `projectedReturn`, the function the receipt and settlement use (`updown-pricing.ts`).
 *   · THE SPENDABLE FIGURE is balance + bonus — the figure `buyPosition` refuses against (`shortfall.ts`), not the
 *     classic board's balance alone (S12-PLAN "F1").
 *   · THE ADDRESSES — the deposit door's (`judDepositHref`, the sheet's own query shape with a round's `bet`) and the next
 *     round's (`judNextRoundHref`) — carry a stake only as the PLAYER chose it; a link never sets one on its own
 *     (`stakeFromUrl`, owner-scoped, decides on the way back).
 *
 * Pure and client-safe: no clock, no storage, no server module. Every "now" is the caller's.
 */
import { sheetFrame, type SheetFacts, type SheetFrame, type SheetSeed, type SheetSide, type SheetViewerRead } from "./sheet-state";
import { formatBetParam, type PendingBet } from "./pending-bet";
import { projectedReturn, refundWarningFor, emptySideOf, type UpDownPricing } from "@/lib/updown-pricing";

/**
 * ⛔ THE TAB MARKER THAT CARRIES A CHOSEN STAKE (through the deposit page, and on to the next round) IS WRITTEN ONLY ONCE
 * THE PRIVACY NOTICE NAMES A ROUND (S12-PLAN Risk 14, Open point 12): a round written into `kp-pending-bet` before §7 says
 * so would be storage the notice does not disclose. ON since Privacy v2026-10-15, whose §7 round paragraph
 * (data-policy-addition="pending-round") landed in the same commit; `test:journey-updown` 3.4 refuses this true without
 * it. Reading a marker is never gated: `stakeFromUrl` only answers for one this tab wrote, for its owner.
 */
export const JUD_TAB_MARKER = true;

export type JudSide = "UP" | "DOWN";

/** The round, as the arm is handed it by the page that rendered it. */
export type JudRound = {
  /** The round's market id (`mkt_…`) — the id a bet is placed on. */
  marketId: string;
  /** The round's own id (`udr_…`) — the id its address and a carried bet name. */
  roundId: string;
  pricing: UpDownPricing;
  /** The chain's stake bounds (`stakeBoundsFor`), the ones the bet path enforces. */
  min: number;
  max: number;
  /** When selections close, ms; null when the round carries no lock instant. */
  selectionClosesAtMs: number | null;
  /** The round took a bet when the server rendered it (open, before its lock). */
  open: boolean;
  /** The server's clock at that render. */
  serverNowMs: number;
  /** The viewer's own stakes on this round as that render read them (server truth; the hook adds its taps in flight). */
  myUpStake: number;
  myDownStake: number;
};

/**
 * What a journey reader's page renders into the arm (S12-PLAN WP10 step 2, Open point 10): the viewer's facts from the
 * gates' own reads (`viewerFacts`, the sheet's), the spendable figure, and the account the tab marker is scoped to. A
 * read that failed is `facts: null` (unknown, never zero): the arm then lets the server decide, as the sheet does.
 */
export type JudViewer = {
  facts: SheetFacts | null;
  /** balance + bonus; null when the wallet could not be read. */
  spendable: number | null;
  /** The signed-in account, for the tab marker's owner (`writeMarker`); never sent anywhere. */
  viewerId: string;
};

export const sheetSideOf = (side: JudSide): SheetSide => (side === "UP" ? "YES" : "NO");

/** The round as the sheet's frame engine reads a market: its pools, its bounds and its lock — and NO rates (see header). */
export function judSeed(round: JudRound): SheetSeed {
  return {
    v: 1,
    id: round.marketId,
    yesPool: Math.max(0, round.pricing.upPool),
    noPool: Math.max(0, round.pricing.downPool),
    rates: null,
    feePct: null,
    min: round.min,
    max: round.max,
    closesAt: round.selectionClosesAtMs === null || !Number.isFinite(round.selectionClosesAtMs)
      ? null : new Date(round.selectionClosesAtMs).toISOString(),
    serverNow: round.serverNowMs,
    bettable: round.open,
  };
}

/**
 * ⭐ THE FACTS AFTER THIS PAGE'S OWN TAPS. The facts were read when the page rendered; a burst of taps since then has
 * spent money the facts still count until the poller re-renders. `spent` is what the hook holds beyond the server's
 * stakes (taps in flight, and placed ones the server value has not caught up with), taken from the balance first and
 * then the bonus, floored at zero, so a stale read never offers a bet the wallet can no longer cover. Unknown stays
 * unknown.
 */
export function judViewerAfterSpend(viewer: JudViewer | null, spent: number): JudViewer | null {
  if (!viewer || !(spent > 0)) return viewer;
  const facts = viewer.facts;
  const wallet = facts?.wallet ?? null;
  if (!facts || !wallet || wallet.balance === null) {
    return { ...viewer, spendable: viewer.spendable === null ? null : Math.max(0, viewer.spendable - spent) };
  }
  const balance = Math.max(0, wallet.balance);
  const fromBalance = Math.min(balance, spent);
  const bonus = Math.max(0, wallet.bonusBalance ?? 0);
  const fromBonus = Math.min(bonus, spent - fromBalance);
  const nextWallet = { ...wallet, balance: balance - fromBalance, bonusBalance: bonus - fromBonus };
  return {
    ...viewer,
    facts: { ...facts, wallet: nextWallet },
    spendable: nextWallet.balance + nextWallet.bonusBalance,
  };
}

/** What the hook holds beyond the server's own stakes on this round: its taps in flight and placed-but-unreconciled. */
export function judSpentSince(round: Pick<JudRound, "myUpStake" | "myDownStake">, shown: { up: number; down: number }): number {
  return Math.max(0, shown.up - round.myUpStake) + Math.max(0, shown.down - round.myDownStake);
}

/** The viewer as the frame engine reads it: read, with its facts (or none: unknown), holding no side of a sheet. */
export function judViewerRead(viewer: JudViewer | null): SheetViewerRead {
  if (!viewer) return { state: "failed" };
  return { state: "read", viewer: { spendable: viewer.spendable, heldSides: [], bonusWager: null, facts: viewer.facts } };
}

/**
 * ⭐ THE ARM'S FRAME at this stake: the sheet's `sheetFrame`, with no intent and no settled answer (a Juu/Chini tap is
 * the classic hook's — its own key per tap, its own receipt), at the server-offset clock. For the two-way control the
 * side is a formality (it chooses nothing the frame shows); the confirm panel passes its locked side.
 */
export function judFrame(input: {
  round: JudRound;
  side: JudSide;
  stakeText: string;
  viewer: JudViewer | null;
  nowMs: number;
  offsetMs?: number;
}): SheetFrame {
  return sheetFrame({
    seed: judSeed(input.round),
    side: sheetSideOf(input.side),
    stakeText: input.stakeText,
    viewer: judViewerRead(input.viewer),
    nowMs: input.nowMs,
    offsetMs: input.offsetMs ?? 0,
    intent: null,
    settled: null,
  });
}

/**
 * The commit may fire: the frame enables it, and the hook would place EXACTLY the stake the frame shows (the two are fed
 * from one text, but a placement is never sent for a figure the player is not looking at), before the lock.
 */
export function judCommitReady(frame: SheetFrame, hook: { stakeReady: boolean; stake: number; locallyLocked: boolean }): boolean {
  return frame.cta?.enabled === true && frame.stake !== null && hook.stakeReady && hook.stake === frame.stake && !hook.locallyLocked;
}

/** The figure the confirm panel states ("Ukishinda ≈ TZS 634"): `projectedReturn`, or null (no stake, the switch off). */
export function judProjection(pricing: UpDownPricing, side: JudSide, stake: number | null): number | null {
  return stake === null ? null : projectedReturn(pricing, side, stake);
}

/** The empty-side sentence's side, as the classic controls say it: round-wide on the two-way control, side-aware once locked. */
export function judEmptySide(pricing: UpDownPricing, locked: JudSide | null): "UP" | "DOWN" | "BOTH" | null {
  return locked ? refundWarningFor(pricing, locked) : emptySideOf(pricing);
}

/** A round's bet as the link writes it (`udr_….UP.5000`). */
export function judBet(roundId: string, side: JudSide, stake: number | null): PendingBet {
  return { kind: "round", id: roundId, side, stake };
}

/**
 * ⭐ THE DEPOSIT DOOR (S12-PLAN WP10 step 4): today's deposit page with the amount the engine offered, the sheet's
 * `from=low-balance` origin and the round's bet — the sheet's own query shape (`bet-sheet-host.tsx`'s `deposit`), so S9's
 * return reads one grammar for both products.
 */
export function judDepositHref(roundId: string, side: JudSide, stake: number, amount: number): string {
  const query = new URLSearchParams({ amount: String(amount), bet: formatBetParam(judBet(roundId, side, stake)), from: "low-balance" });
  return `/wallet/deposit?${query}`;
}

/** ⭐ THE NEXT ROUND (WP11): the successor's page with the side and the stake the player carried, never more. */
export function judNextRoundHref(successorRoundId: string, side: JudSide, stake: number | null): string {
  return `/updown/${encodeURIComponent(successorRoundId)}?bet=${formatBetParam(judBet(successorRoundId, side, stake))}`;
}

/** The round-closed notice's lines (WP11): which show, from facts the server knows — never a guess. */
export type JudClosedNotice = {
  /** "Pesa zako zimeingia — {amount} …" — only with a CONFIRMED deposit read from S9's owned status, never the address. */
  paidAmount: number | null;
  /** "Raundi inayofuata inaanza {time}." — only with an instant the server knows (`successor.opensAtMs`). */
  nextOpensAtMs: number | null;
  /** The button — only once the successor round exists (it is created when this round settles). */
  successorRoundId: string | null;
};

export function judClosedNotice(input: {
  successor: { roundId: string | null; opensAtMs: number | null } | null;
  confirmedDepositTzs: number | null;
  /** The server's clock: an opening already past is not "starts at" (the round is live; the button says the rest). */
  nowMs: number;
}): JudClosedNotice {
  const opens = input.successor?.opensAtMs;
  const paid = input.confirmedDepositTzs;
  return {
    paidAmount: typeof paid === "number" && Number.isSafeInteger(paid) && paid > 0 ? paid : null,
    nextOpensAtMs: typeof opens === "number" && Number.isFinite(opens) && opens > input.nowMs ? opens : null,
    successorRoundId: input.successor?.roundId ?? null,
  };
}
