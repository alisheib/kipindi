/**
 * Up & Down board data — the read model the player surfaces render from.
 *
 * Kept OUT of the page component so `/updown`, `/updown/[roundId]` and any future
 * surface all read the same shapes, and so the "what does the player actually see"
 * question has one answer.
 *
 * ⚠️ REAL DATA OR NOTHING. Every field that can be unknown is typed `| null` and the
 * card renders an explicit empty state for it. Nothing here substitutes a zero for an
 * unknown price, and nothing derives a price from anything but a CONFIRMED observation.
 */
import { assetStore, chainStore, roundStore, observationStore, type StoredAsset, type StoredChain, type StoredRound } from "./updown-dal";
import { marketStore } from "./market-dal";
import { getUpDownConfig, stakeBoundsFor } from "./updown-config";
// E-53 · the player is told the KIND of market, never who sells us the data. Resolved
// HERE, on the server, because translating a vendor string in the browser still ships the
// vendor in the RSC payload where View Source finds it.
import { publicSourceClassFor, type PublicSourceClass } from "./updown-symbols";
import { ratesFor, listPositionsForUser, projectedPayout } from "./market-service";
import { impliedYesPct } from "./market-service";
// ⭐ D2 · the shape the player surfaces price a bet from. Isomorphic by design — the card is a
// client component, this is the server, and one definition of "what would I be paid" is the
// point (same reasoning as `updown-refund-reason.ts`).
import type { UpDownPricing } from "@/lib/updown-pricing";
// E-99 · the result clock is driven by an asset's OWN measured record, never by a constant.
import { feedHistoryFor } from "./updown-feed-history";
import { MIN_SAMPLES_FOR_ADVICE } from "./updown-feed-advice";

/**
 * ⭐ E-99 · How many seconds after its boundary this asset's reading TYPICALLY arrives — or
 * `null` when we have not measured it enough to say.
 *
 * ⛔ THE SAMPLE FLOOR IS THE POINT, and it is the SAME one the operator-facing gate uses
 * (`MIN_SAMPLES_FOR_ADVICE`). A median off three readings renders identically to one off three
 * thousand, and putting the shallow one on a player's screen as a countdown is precisely the
 * fabrication A-5 forbids. Below the floor this returns null and the card shows no clock —
 * "Reading the closing price…" is the honest state and it stays.
 *
 * ⚠️ Never throws. A history read that fails degrades to "no clock", never to a guessed number.
 */
async function measuredLagSeconds(assetKey: string): Promise<number | null> {
  try {
    const h = await feedHistoryFor(assetKey);
    if (h.confirmed < MIN_SAMPLES_FOR_ADVICE) return null;
    return h.medianLagSeconds != null && h.medianLagSeconds >= 0 ? h.medianLagSeconds : null;
  } catch {
    return null;
  }
}

export type BoardAsset = {
  id: string;
  key: string;
  nameEn: string;
  nameSw: string;
  nameZh: string | null;
  iconKey: string;
  decimals: number;
  /** E-53 · the KIND of market, never the data vendor. See `publicSourceClassFor`. */
  sourceClass: PublicSourceClass;
  /** Most recent CONFIRMED price, or null. Never a pending/failed reading. */
  livePrice: number | null;
  /** The timestamp the SOURCE published for that price. */
  sourceQuotedAt: string | null;
  durations: number[];
};

export type BoardRound = {
  roundId: string;
  marketId: string;
  assetId: string;
  durationMinutes: number;
  opensAt: string;
  closesAt: string;
  openPrice: number | null;
  closePrice: number | null;
  /** The frozen winning boundaries: base ± margin (null on legacy rounds). The player
   *  must reach one to win; between them the round voids and refunds. */
  upTarget: number | null;
  downTarget: number | null;
  marginBps: number | null;
  outcome: "UP" | "DOWN" | "VOID" | null;
  voidReason: string | null;
  volumeTzs: number;
  players: number;
  upPct: number;
  /**
   * ⭐ D2 · THE ROUND'S REAL MONEY, so a player can be told what they would ACTUALLY be paid
   * before they bet — see `@/lib/updown-pricing`.
   *
   * 🔴 THIS REPLACED A FLAT CONFIG CONSTANT. The field was `estMultiplier: 1 +
   * rates.estimatedWinningsRate`, which is a number an admin types at `/admin/config`. It read
   * **identically when the other side held TZS 36,000 and when it held nothing** — so on a
   * pari-mutuel game the board actively concealed the single strongest reason to take the thin
   * side, and the thin side is **43% of every stake this product has ever refunded**. Measured
   * on a real one-sided round: the fat side returns exactly 1.00× and the empty side 16.66×.
   * Both buttons printed 1.5.
   *
   * ⛔ RAW SHILLINGS, NOT `upPct`. The percentage is rounded to an integer for the bar, and
   * "is this side empty" — the whole question the copy answers — cannot be read off a rounded
   * percentage: 0 and 400 on a 100,000 pool are both `0%`.
   *
   * ⛔ THE RATES ARE THE ROUND'S OWN FROZEN SNAPSHOT, never live config, for exactly the reason
   * `myExactPayout` is computed on the server: a rate retune must not reprice a placed bet, and
   * a surface pricing off live config would drift from what settlement pays.
   */
  pricing: UpDownPricing;
  state: "open" | "locked" | "closing" | "confirming" | "resolved" | "void";
  /**
   * E-72 · when bets stopped (or stop) being accepted — the last 20% of the round, floored
   * at 30s. Null only on legacy rounds opened before the window existed.
   *
   * ⛔ THE SERVER'S INSTANT, NOT THE CARD'S ARITHMETIC. `buyPosition` enforces this exact
   * value through `isSelectionClosed`, so the card must render the same number rather than
   * re-deriving one — a disabled button is decoration, and two computations of one deadline
   * is how a screen comes to disagree with the money path.
   */
  selectionClosedAt: string | null;
  /**
   * The server's own clock at render, so the countdown is anchored to IT rather than to the
   * viewer's handset.
   *
   * ⚠️ `useCountdown` reads `Date.now()`, which is the DEVICE clock. A phone running 40
   * seconds fast shows a different countdown to the player beside it, and on a 3-minute round
   * that is a fifth of the game. The card applies (serverNow − clientNow) as an offset so
   * every player sees one clock — the one the server will actually settle against.
   */
  serverNowMs: number;
  settled: boolean;
  /** The signed-in viewer's OWN open stake on each side of this round, in TZS (0 when
   *  none, or when signed out). Powers the "you're in" indicator + quick-bet state on
   *  the card. Read from the viewer's OPEN positions — the real money, not client
   *  state — so it survives a refresh. */
  myUpStake: number;
  myDownStake: number;
  /** What this viewer had RETURNED on this round (E-65). Non-zero even when the round
   *  DECIDED, if nobody took the other side — which is the whole point of the field. */
  myRefundedStake: number;
  /**
   * ⭐ WHAT HAPPENED TO THIS VIEWER'S MONEY ON THIS ROUND — Ali's decision, 2026-08-05.
   *
   * ⛔ THE BOARD HAS NEVER CARRIED THIS, AND THAT IS WHY UP & DOWN HAS NO WIN MOMENT.
   * `myStakesByMarket` recorded a settled position ONLY when `finalPayout === stake` (a
   * refund); a WIN and a LOSS were both recorded as *nothing*, and `myUpStake`/`myDownStake`
   * are zeroed the instant a position leaves OPEN because "only live money counts as you're
   * in". So a winner and a loser received **byte-identical board props** — the card could not
   * have congratulated anyone if it wanted to, because the data was never sent.
   *
   * The other half of the same silence: the platform's `WinCelebrationHost` was fired by
   * `notify-poller.tsx`, gated on a `readStoredBet()` localStorage record that the Up & Down
   * quick-bet path never writes — and gated behind notifications, which
   * `perEventNotificationsSuppressed()` turns off for UPDOWN. Suppressing the MESSAGE (Ali's
   * dated 2026-07-24 decision, which stands) also suppressed the MOMENT.
   *
   * ⛔ `payout` IS THE REALISED FIGURE, never a projection. A celebrated amount that is not
   * the amount paid is a false money statement of the E-39/E-65 kind, on the one screen a
   * player is most likely to screenshot. This is `Position.finalPayout`.
   *
   * ✅ UPDATED 2026-08-10 (DA-5 / E-115): **the long-form path has been brought to this same
   * rule and the paragraph above is now history.** `notify-poller.tsx` no longer reads any
   * `localStorage` bet record — that write is deleted at its source in `conviction-dial.tsx`
   * — and instead reads the viewer's own settled rows through `/api/positions/settled`,
   * requiring `settledAt` so it cannot announce before the money has moved. This file's
   * contract was the model for that fix; both product lines now headline `finalPayout`.
   */
  myResult: {
    status: "WIN" | "LOSS" | "VOID";
    side: "UP" | "DOWN";
    stake: number;
    /** Realised, from the settled row. 0 for a loss. */
    payout: number;
  } | null;
  /**
   * What this viewer takes home if their side wins — EXACT, and only once the round is LOCKED.
   *
   * ⛔ Null while the round is open, deliberately: the pool is still moving, so any figure
   * would be a projection dressed as a fact. Once bets close the pool is frozen and this is
   * arithmetic — which is what lets the card drop `× 1.4 est.` for a real number.
   * ⛔ Computed through the SAME `projectedPayout` settlement pays out with, because it depends
   * on the round's frozen fee snapshot. The client cannot derive it from the pool split.
   */
  myExactPayout: number | null;
  /**
   * ⭐ UD-20 · WHAT THIS VIEWER RECEIVES UNDER **EACH** OUTCOME — Ali's decision, 2026-08-14:
   * *quote both outcomes.*
   *
   * Null unless the round is LOCKED and the viewer holds something. Otherwise both are always
   * present together, so a surface can render the pair without asking whether the holder is
   * hedged: a one-sided holder's losing outcome is genuinely **0**, and saying so is more
   * honest than leaving it unsaid.
   *
   * ⛔ WHY THE PAIR EXISTS AT ALL. `myExactPayout` is one number, and one number cannot state
   * a two-sided position — it used to price `up + down` as though it all sat on the UP side,
   * printing a confident wrong figure on a money surface (A-5). Suppressing it was the right
   * fix and left a hedged holder seeing NOTHING, which `docs/RULES.md` §2.4 turned from a rare
   * state into an ordinary one. Two figures state the position exactly; one never can.
   */
  myPayoutIfUp: number | null;
  myPayoutIfDown: number | null;
  /**
   * ⭐ WHEN THE RESULT IS ACTUALLY EXPECTED — Ali's decision, 2026-08-05. E-99.
   *
   * The betting timer runs to the lock and the result-phase timer runs to the close, and then
   * the player waited a **measured median 95s (p90 116s, max 151s)** with NOTHING counting
   * down, because the closing price comes from a dated one-minute bar that does not exist until
   * after the boundary. That is E-82's dead `00:00` one phase further out, and it is the single
   * longest unexplained wait in the game.
   *
   * This is `boundaryAt + the asset's OWN measured median lag`, taken from `UpDownObservation`
   * — the same history the admin console's Feed record column reasons from.
   *
   * ⛔ NULL WHEN THERE IS NO MEASUREMENT, and the card must then show no clock at all (A-5).
   * A brand-new asset has no median; inventing 90s for it would be a fabricated number on a
   * money surface, which is precisely what the sample floor in `updown-feed-advice.ts` exists
   * to refuse. "Reading the closing price…" is the honest state, and it is what we keep.
   */
  expectedResultAtMs: number | null;
};

/**
 * The player-visible state of a round. Derived, so board and detail always agree.
 *
 * ⭐ FOUR LIVE STATES, NOT THREE (E-72). `locked` sits between "you may bet" and "we are
 * reading the price": the round is still running and the player can watch it, but the pool is
 * frozen. It is a distinct state because the player can do a distinct thing in it — nothing —
 * and because the pool being frozen is what lets the card stop estimating the payout.
 */
export function roundState(
  r: StoredRound,
  closesAtMs: number,
  now = Date.now(),
  selectionClosedAt?: string | null,
): BoardRound["state"] {
  if (r.outcome === "VOID") return "void";
  if (r.outcome === "UP" || r.outcome === "DOWN") return "resolved";
  // Past its boundary with no outcome yet ⇒ we are waiting on the source. That is the
  // "Confirming price" state — deliberate, not an error.
  if (closesAtMs <= now) return "confirming";
  // ⚠️ A legacy round (opened before the betting window existed) has no `selectionClosedAt`
  // and stays `open` to its boundary — which is what it genuinely does, since `buyPosition`
  // falls back to `resolutionAt` for it. Rendering it as locked would be the card lying about
  // a bet the server would still accept.
  if (selectionClosedAt && Date.parse(selectionClosedAt) <= now) return "locked";
  return "open";
}

/**
 * What a stake ALREADY IN THE POOL is paid if its side wins.
 *
 * 🔴 WHY THIS EXISTS, AND IT IS A MONEY DEFECT THAT WAS SHIPPING. `projectedPayout` answers a
 * different question — *"what would I get if I bet X **more** right now"* — so it ADDS the
 * stake to the pool before dividing. Handing it a stake the player has already placed counts
 * that money **twice**: once in `yesPool`, once again as the new bet.
 *
 * Measured against a real production settlement, gold round #267 (YES 8,000 / NO 14,000, YES
 * won). QA Fleet 11 held **5,000** on the winning side:
 *
 *     quoted on the locked card   9,685      ← stake counted twice: share read 5,000/13,000
 *     what settlement PAID       12,612
 *
 * ⛔ An understatement of 2,927 shillings — **23%** — on a screen whose own comment promised
 * *"this figure and the settled one cannot disagree"*. It did, on every locked round, for as
 * long as the field has existed.
 *
 * ⭐ THE FIX REUSES THE SAME FUNCTION RATHER THAN WRITING A SECOND ARITHMETIC. Remove the
 * player's own money from their side's pool and ask `payoutFor` the question it is built for:
 * the pool it then reconstructs is exactly the real one, and the share is exactly theirs.
 * A separate fee calculation here would be a second answer to "what does this round pay",
 * which is the drift this file already refuses everywhere else.
 */
async function heldPayout(
  m: Parameters<typeof projectedPayout>[0] & { yesPool: number; noPool: number },
  side: "YES" | "NO",
  myStake: number,
): Promise<number> {
  const pools = side === "YES"
    ? { ...m, yesPool: Math.max(0, m.yesPool - myStake) }
    : { ...m, noPool: Math.max(0, m.noPool - myStake) };
  return projectedPayout(pools, side, myStake);
}

async function toBoardRound(
  r: StoredRound,
  chain: StoredChain,
  mine?: MyMarketStake,
  /** The asset's measured median seconds from boundary to a confirmed reading, or null when
   *  it has too little history to quote one. Passed in — never recomputed per round, which
   *  would be one query per card. */
  medianLagSeconds?: number | null,
): Promise<BoardRound | null> {
  const m = await marketStore.get(r.marketId);
  if (!m) return null;
  const rates = ratesFor(m);
  const closesAtMs = Date.parse(r.closesAt);
  const state = roundState(r, closesAtMs, Date.now(), m.selectionClosedAt);
  const myUpStake = mine?.up ?? 0;
  const myDownStake = mine?.down ?? 0;
  const myStake = myUpStake + myDownStake;
  return {
    roundId: r.id,
    marketId: r.marketId,
    assetId: chain.assetId,
    durationMinutes: chain.durationMinutes,
    opensAt: r.opensAt,
    closesAt: r.closesAt,
    openPrice: r.openPrice,
    closePrice: r.closePrice,
    upTarget: r.upTarget,
    downTarget: r.downTarget,
    marginBps: r.marginBps,
    outcome: r.outcome,
    voidReason: r.voidReason,
    volumeTzs: m.yesPool + m.noPool,
    players: m.predictorCount,
    upPct: impliedYesPct(m),
    // ⭐ D2 · the pool itself, so every player surface can price a bet through the SAME
    // `payoutFor` settlement pays with. See the field comment for what this replaced.
    pricing: {
      upPool: m.yesPool,
      downPool: m.noPool,
      // Exactly the five fields `poolFee` reads — nothing else about the poll's fees crosses
      // to the browser. Frozen per round, so a retune cannot reprice a bet already placed.
      rates: {
        feeModel: rates.feeModel,
        commissionRate: rates.commissionRate,
        feeCeilingRate: rates.feeCeilingRate,
        platformFeeRate: rates.platformFeeRate,
        operatorFeeRate: rates.operatorFeeRate,
      },
      // The operator's display switch, unchanged in meaning: a round that never froze the
      // display fields shows no "× …" at all, exactly as before. ⚠️ It gates the MULTIPLIER
      // only — the empty-side sentence is a fact about the round, and no display switch may
      // suppress that.
      show: rates.showEstimatedWinnings === true,
    },
    // ⛔ The MARKET'S `selectionClosedAt`, because that is the exact field `isSelectionClosed`
    // enforces in `buyPosition`. Re-deriving it here from the duration would produce a second
    // answer to "when do bets close", and the two would drift the first time the fraction is
    // tuned — the `[5, 15, 30]` failure, applied to a deadline that decides whether a bet is legal.
    selectionClosedAt: m.selectionClosedAt,
    serverNowMs: Date.now(),
    state,
    settled: !!r.settledAt,
    myUpStake: mine?.up ?? 0,
    myDownStake: mine?.down ?? 0,
    myRefundedStake: mine?.refunded ?? 0,
    // ⭐ The viewer's own settled outcome. Null while nothing of theirs has settled — which is
    // also the signed-out case, because `mine` is undefined then.
    myResult: mine?.result ?? null,
    // Only for a LOCKED round the viewer actually holds — see the field comment. `projectedPayout`
    // is the money path's own function, so this figure and the settled one cannot disagree.
    //
    // ⛔ UD-20 · NULL FOR A HEDGED HOLDER, and that null is a money-truth fix. This line used
    // to price `myUpStake + myDownStake` as if ALL of it sat on the UP side — so a hedger's
    // locked card read "You win X if Up" with an X computed from a stake that includes their
    // DOWN money: a silently wrong figure on a money surface (A-5). One number cannot state
    // a two-sided position; the surfaces suppress the line rather than print a half-truth.
    //
    // ⚠️ THIS COMMENT HAS BEEN WRONG TWICE, IN OPPOSITE DIRECTIONS, AND THAT IS THE POINT.
    // It first read *"Holding both sides is legal (repeat taps, either side)"*, which the
    // 2026-08-04 ONE-ACCOUNT-ONE-SIDE guard falsified. On 2026-08-10 it was rewritten to say
    // the hedged state was **unreachable** and UD-20 was "closed as moot". On 2026-08-14 Ali
    // REMOVED that guard (docs/RULES.md §2.4), so the original sentence is true again.
    //
    // ⛔ THE BEHAVIOUR BELOW IS UNCHANGED AND STILL CORRECT — but its reason has changed from
    // "defence-in-depth for legacy rows" to "the ordinary case". One number cannot state a
    // two-sided position: pricing `myUpStake + myDownStake` as if it all sat on UP is what
    // UD-20 filed, and suppressing the line is still better than printing a half-truth on a
    // money surface (A-5). What is NO LONGER TRUE is that this is rare.
    //
    // ✅ UD-20 ANSWERED — Ali, 2026-08-14: **quote both outcomes.** The gap is closed by
    // `myPayoutIfUp` / `myPayoutIfDown` below, NOT by resurrecting the single number.
    //
    // ⚠️ `myExactPayout` IS KEPT AND IS STILL NULL FOR A HEDGED HOLDER. It is the one-number
    // field, and one number cannot state a two-sided position — that is the whole finding. It
    // stays because surfaces and suites still read it for the ordinary one-sided card; it must
    // never learn to answer for a hedge.
    //
    // `myUpStake`/`myDownStake` count OPEN positions only (see the accumulator below).
    myExactPayout:
      state === "locked" && myStake > 0 && (myUpStake === 0 || myDownStake === 0)
        ? await heldPayout(m, myUpStake > 0 ? "YES" : "NO", myStake)
        : null,
    // ⭐ UD-20 · BOTH OUTCOMES, PRICED SEPARATELY — the only form that states a two-sided
    // position honestly. Each figure is what this viewer receives IF THAT SIDE WINS, so the
    // stake on the losing side is simply not in it:
    //     if UP wins   → their UP stake pays, their DOWN stake is lost   → payout(YES, up)
    //     if DOWN wins → their DOWN stake pays, their UP stake is lost   → payout(NO, down)
    // ⛔ THE SAME `projectedPayout` THE MONEY PATH SETTLES WITH, twice — never `up + down`
    // priced as if it all sat on one side, which is exactly the half-truth UD-20 filed. And
    // never re-derived on the client from percentages, which ignores the frozen fee snapshot.
    // ⚠️ A one-sided holder is not a special case: their losing outcome is genuinely 0, and
    // saying so is more honest than leaving it unsaid.
    myPayoutIfUp:
      state === "locked" && myStake > 0
        ? (myUpStake > 0 ? await heldPayout(m, "YES", myUpStake) : 0)
        : null,
    myPayoutIfDown:
      state === "locked" && myStake > 0
        ? (myDownStake > 0 ? await heldPayout(m, "NO", myDownStake) : 0)
        : null,
    // ⭐ E-99 · the instant the result is genuinely expected, from THIS asset's own record.
    // ⛔ Null when unmeasured — see the field comment. A guessed lag on a money surface is a
    // fabricated number, and the card is built to show nothing rather than a number we invented.
    expectedResultAtMs:
      medianLagSeconds != null && Number.isFinite(closesAtMs)
        ? closesAtMs + medianLagSeconds * 1000
        : null,
  };
}

/** One viewer's stake on one market: the live money, plus what SETTLED (E-64/result moment). */
type MyMarketStake = {
  up: number;
  down: number;
  refunded: number;
  /** The settled outcome for this viewer, or null while nothing has settled. See
   *  `BoardRound.myResult` for why this exists and why `payout` must be the realised figure. */
  result: { status: "WIN" | "LOSS" | "VOID"; side: "UP" | "DOWN"; stake: number; payout: number } | null;
};

/** The viewer's OPEN stake per market, split UP(=YES)/DOWN(=NO). Empty when signed
 *  out. One query, then grouped — never an N+1 across the board. */
async function myStakesByMarket(userId: string | undefined): Promise<Map<string, MyMarketStake>> {
  const out = new Map<string, MyMarketStake>();
  if (!userId) return out;
  // UPDOWN only — this map powers the card's "you're in" indicator, so it must not
  // pull the player's long-form-poll positions.
  const positions = await listPositionsForUser(userId, 500, "UPDOWN").catch(() => []);
  for (const p of positions) {
    const e = out.get(p.marketId) ?? { up: 0, down: 0, refunded: 0, result: null };
    // ⭐ E-65 · A SETTLED POSITION WHOSE PAYOUT EQUALS ITS STAKE WAS REFUNDED, and that can
    // happen on a round that DECIDED — when nobody took the other side there is no pool to
    // win from. The card needs this to tell a refund apart from a loss; without it a decided
    // round rendered "the price did not move enough" over a stake that came back for the
    // opposite reason.
    if (p.status !== "OPEN") {
      if (p.finalPayout != null && p.finalPayout === p.stake) e.refunded += p.stake;
      // ⭐ THE VIEWER'S OWN OUTCOME — see `BoardRound.myResult`. Until this line the board
      // sent a winner and a loser byte-identical props, so no surface could tell them apart.
      // ⛔ The status is read off the POSITION ROW, never inferred from the round's outcome:
      // a round can resolve DOWN and still hand an UP backer their stake back when nobody
      // took the other side (E-65), so "my side !== the outcome" is NOT a loss.
      const payout = p.finalPayout ?? 0;
      const status: "WIN" | "LOSS" | "VOID" =
        p.status === "WIN" ? "WIN" : p.status === "LOSS" ? "LOSS" : "VOID";
      // A player may top up the same side; aggregate rather than letting the last row win.
      const prev = e.result;
      e.result = {
        status: prev && prev.status !== status ? prev.status : status,
        side: p.side === "YES" ? "UP" : "DOWN",
        stake: (prev?.stake ?? 0) + p.stake,
        payout: (prev?.payout ?? 0) + payout,
      };
      out.set(p.marketId, e);
      continue; // only live money counts as "you're in"
    }
    if (p.side === "YES") e.up += p.stake;
    else e.down += p.stake;
    out.set(p.marketId, e);
  }
  return out;
}

/** The most recent CONFIRMED reading for an asset, or null. */
async function latestConfirmed(assetId: string): Promise<{ price: number; quotedAt: string | null } | null> {
  const rows = await observationStore.list({ assetId, state: "CONFIRMED", limit: 1 }).catch(() => []);
  const o = rows[0];
  return o && o.price != null ? { price: o.price, quotedAt: o.sourceQuotedAt } : null;
}

/**
 * Everything `/updown` needs: the enabled assets with their live prices, the durations
 * each actually runs, and the open rounds for the selected asset+duration.
 */
/**
 * UD-1 · the viewer's spendable balance for the quick-bet pre-flight.
 *
 * Null = signed out, no wallet, or the read failed. ⛔ Never 0 on failure: on this
 * surface a fabricated zero would DISABLE betting for a player whose money is fine —
 * B-1's "a failed read never renders as zero", pointed the other way. The gate is UX
 * only; `buyPosition` re-checks the real balance inside the wallet lock.
 */
async function walletBalanceOf(userId: string | undefined): Promise<number | null> {
  if (!userId) return null;
  try {
    const { db } = await import("./store");
    const w = await Promise.resolve(db.wallet.findByUserId(userId));
    return w ? Number(w.balance) : null;
  } catch {
    return null;
  }
}

export async function getBoard(opts?: { assetKey?: string; durationMinutes?: number; userId?: string }): Promise<{
  assets: BoardAsset[];
  activeAsset: BoardAsset | null;
  activeDuration: number | null;
  rounds: BoardRound[];
  recent: Array<"UP" | "DOWN" | "VOID">;
  chainPaused: boolean;
  /** Stake bounds for the ACTIVE chain — the quick-bet stake selector's range. */
  stakeBounds: { min: number; max: number };
  /** UD-1 · the viewer's balance for the quick-bet pre-flight. Null = signed out or
   *  the read failed — UNKNOWN, never zero (B-1): a fabricated 0 would falsely
   *  disable betting, so a failed read simply leaves the gate unarmed. */
  walletBalance: number | null;
}> {
  const cfg = await getUpDownConfig();
  const defaultBounds = { min: cfg.defaultMinStake, max: cfg.defaultMaxStake };
  const [enabled, allChains, mineByMarket, walletBalance] = await Promise.all([
    assetStore.list({ enabledOnly: true }).catch(() => [] as StoredAsset[]),
    chainStore.list().catch(() => [] as StoredChain[]),
    myStakesByMarket(opts?.userId),
    walletBalanceOf(opts?.userId),
  ]);

  const assets: BoardAsset[] = await Promise.all(
    enabled.map(async (a) => {
      const live = await latestConfirmed(a.id);
      return {
        id: a.id, key: a.key, nameEn: a.nameEn, nameSw: a.nameSw, nameZh: a.nameZh,
        iconKey: a.iconKey, decimals: a.decimals, sourceClass: publicSourceClassFor(a),
        livePrice: live?.price ?? null,
        sourceQuotedAt: live?.quotedAt ?? null,
        // ⛔ E-67 · A DURATION IS OFFERED BECAUSE THE CHAIN EXISTS, NOT BECAUSE IT IS RUNNING.
        //
        // This filtered on `state !== "STOPPED"`. That was fine while a STOPPED chain meant a
        // dead market — but Ali removed automatic emission (*"my admins will enter and generate
        // every 5 min"*), so EVERY chain is now STOPPED and rounds are made by hand. The filter
        // therefore returned an EMPTY duration list, `activeDuration` fell to null, and the
        // board returned no rounds at all: the duration chips vanished from the page and a real
        // live round (`udr_17e07a91ecf526c2ae17`, open 63,716.56, targets set) was invisible.
        //
        // The asset list is already restricted to ENABLED assets, so a disabled asset's chains
        // never reach here. What remains is the honest statement: these are the round lengths
        // this market offers. If none is open the board says so, in the (now accurate) empty
        // state — which is a different and better answer than pretending the market is gone.
        // ⚠️ Retiring a chain for good is E-59's archive, not a side effect of Stop.
        durations: allChains
          .filter((c) => c.assetId === a.id)
          .map((c) => c.durationMinutes)
          .sort((x, y) => x - y),
      };
    }),
  );

  // ⛔ DEFAULT TO AN ASSET THAT ACTUALLY HAS A CHAIN, NOT MERELY THE FIRST ONE.
  //
  // 🔴 `assets[0]` was the default, and an enabled asset with NO chains yields `durations: []`,
  // which falls to `activeDuration: null` and returns `chainPaused: true` with an empty board.
  // So a player landing on `/updown` could be shown "no games" while a round was live on the very
  // next asset — and the operator guide actively invites this: it tells the operator to choose
  // whichever asset they like, and four assets are enabled while typically one carries a chain.
  //
  // ⚠️ It only worked at all because BTC happened to sort first AND happened to be the asset the
  // chain was built on. Build the first chain on gold instead and the board goes dark. That is
  // luck, not behaviour.
  //
  // An EXPLICIT `?asset=` still wins — including onto an asset with no chains, because a player
  // who asked for gold should be told gold is idle, not silently redirected somewhere else.
  const firstPlayable = assets.find((a) => a.durations.length > 0);
  const activeAsset =
    (opts?.assetKey ? assets.find((a) => a.key === opts.assetKey) : undefined)
    ?? firstPlayable ?? assets[0] ?? null;
  if (!activeAsset) return { assets, activeAsset: null, activeDuration: null, rounds: [], recent: [], chainPaused: false, stakeBounds: defaultBounds, walletBalance };

  const activeDuration =
    (opts?.durationMinutes && activeAsset.durations.includes(opts.durationMinutes) ? opts.durationMinutes : undefined)
    ?? activeAsset.durations[0] ?? null;
  if (activeDuration == null) {
    return { assets, activeAsset, activeDuration: null, rounds: [], recent: [], chainPaused: true, stakeBounds: defaultBounds, walletBalance };
  }

  const chain = allChains.find((c) => c.assetId === activeAsset.id && c.durationMinutes === activeDuration);
  if (!chain) return { assets, activeAsset, activeDuration, rounds: [], recent: [], chainPaused: true, stakeBounds: defaultBounds, walletBalance };

  // ONE resolver, shared with the money path (buyPosition → stakeBoundsForUpDownMarket):
  // the product default is the FLOOR — a chain override may raise the min, never drop it
  // below the platform floor (currently 1,000). What the card shows here is exactly what a
  // bet is validated against, so display and enforcement can never diverge.
  const stakeBounds = await stakeBoundsFor(chain);

  // ⭐ E-99 · the ACTIVE ASSET'S measured lag, loaded ONCE for the whole board.
  // ⛔ Under the same sample floor the operator-facing gate uses. Below it the median is null
  // and the card shows no result clock at all — a median off three readings is not a
  // measurement, and quoting one on a money surface is the fabrication A-5 forbids.
  // ⚠️ Never fatal: a history read that fails degrades to "no clock", never to a guess.
  const lagSeconds = await measuredLagSeconds(activeAsset.key);

  // Newest first, bounded — never an unbounded scan of a table that grows every minute.
  const raw = await roundStore.list({ chainId: chain.id, limit: 24 }).catch(() => []);
  const mapped = (await Promise.all(
    raw.map((r) => toBoardRound(r, chain, mineByMarket.get(r.marketId), lagSeconds)),
  )).filter(Boolean) as BoardRound[];

  // The board shows what a player can act on or has just watched: open + confirming,
  // plus the most recent settled one for continuity.
  //
  // ⚠️ `opensAt <= now` is load-bearing. A round whose window has not begun is a real
  // row (the chain pre-creates the next one), but showing it as bettable would let a
  // player stake on a round whose OPEN PRICE is not yet fixed — they would be betting
  // against a line that does not exist. Without this the board showed two "LIVE"
  // 5-minute rounds side by side with different countdowns.
  const nowMs = Date.now();
  const started = mapped.filter(
    (r) => (r.state === "open" || r.state === "confirming") && Date.parse(r.opensAt) <= nowMs,
  );

  // ONE current round per chain — the round whose window contains NOW. A chain is a
  // single game running back to back, not a queue: showing several open rounds at once
  // with different countdowns reads as several simultaneous games and invites a player
  // to stake on whichever timer they like. `mapped` is newest-first, so the first
  // started round IS the current one; anything behind it is a round still confirming.
  const current = started[0] ?? null;
  // At most ONE confirming round — the one that just closed, which the player who bet
  // on it wants to see resolve. Older confirming rounds are a source outage, not
  // content: showing a column of them turns an ops problem into a wall of identical
  // cards and buries the round that is actually playable.
  const justClosed = started.slice(1).find((r) => r.state === "confirming") ?? null;
  const lastDone = mapped.find((r) => r.state === "resolved" || r.state === "void");
  const rounds = [current, justClosed, lastDone].filter(Boolean) as BoardRound[];

  // The heartbeat strip — oldest → newest, real outcomes only.
  const recent = mapped
    .filter((r) => r.outcome != null)
    .slice(0, 12)
    .reverse()
    .map((r) => r.outcome!) as Array<"UP" | "DOWN" | "VOID">;

  return { assets, activeAsset, activeDuration, rounds, recent, chainPaused: chain.state !== "RUNNING", stakeBounds, walletBalance };
}

/**
 * The player's OWN Up & Down history — one row per position they hold/held on a round,
 * newest first. Its own portfolio, separate from the long-form /positions page
 * (Ali, 2026-07-25). Reads the money the settlement path already wrote (position status
 * + finalPayout); adds NO money logic.
 */
export type MyRoundRow = {
  positionId: string;
  roundId: string | null;
  marketId: string;
  assetKey: string;
  assetNameEn: string;
  assetNameSw: string;
  assetNameZh: string | null;
  durationMinutes: number;
  side: "UP" | "DOWN";
  stake: number;
  status: "OPEN" | "WIN" | "LOSS" | "VOID" | "CASHED_OUT";
  payout: number | null;
  outcome: "UP" | "DOWN" | "VOID" | null;
  openPrice: number | null;
  closePrice: number | null;
  decimals: number;
  placedAt: string;
  settledAt: string | null;
  closesAt: string | null;
};

export async function getMyUpDownHistory(userId: string, limit = 200): Promise<MyRoundRow[]> {
  const positions = await listPositionsForUser(userId, limit, "UPDOWN").catch(() => []);
  if (positions.length === 0) return [];
  // Resolve each position's round + asset. Bounded by the page limit; distinct markets
  // are cached so multiple positions on one round cost one lookup.
  const roundCache = new Map<string, Awaited<ReturnType<typeof roundStore.getByMarketId>>>();
  const assetCache = new Map<string, StoredAsset | null>();
  const chainCache = new Map<string, StoredChain | null>();
  const rows: MyRoundRow[] = [];
  for (const p of positions) {
    let round = roundCache.get(p.marketId);
    if (round === undefined) { round = await roundStore.getByMarketId(p.marketId).catch(() => null); roundCache.set(p.marketId, round); }
    let chain = round ? chainCache.get(round.chainId) : null;
    if (round && chain === undefined) { chain = await chainStore.get(round.chainId).catch(() => null); chainCache.set(round.chainId, chain); }
    let asset = chain ? assetCache.get(chain.assetId) : null;
    if (chain && asset === undefined) { asset = await assetStore.get(chain.assetId).catch(() => null); assetCache.set(chain.assetId, asset); }
    rows.push({
      positionId: p.id,
      roundId: round?.id ?? null,
      marketId: p.marketId,
      assetKey: asset?.key ?? "?",
      assetNameEn: asset?.nameEn ?? "Unknown",
      assetNameSw: asset?.nameSw ?? "Unknown",
      assetNameZh: asset?.nameZh ?? null,
      durationMinutes: chain?.durationMinutes ?? 0,
      side: p.side === "YES" ? "UP" : "DOWN",
      stake: p.stake,
      status: p.status,
      payout: p.finalPayout,
      outcome: round?.outcome ?? null,
      openPrice: round?.openPrice ?? null,
      closePrice: round?.closePrice ?? null,
      decimals: asset?.decimals ?? 2,
      placedAt: p.placedAt,
      settledAt: p.settledAt,
      closesAt: round?.closesAt ?? null,
    });
  }
  return rows;
}

/** Real intra-round price points for the D3 hero — CONFIRMED observations only, inside
 *  the round window, oldest→newest, capped at ~60. NOTHING is sampled or simulated: the
 *  oracle reads at grid boundaries, so a short round yields few real points and a long
 *  one more; we hand the hero exactly the real reads (A-5, "real data or nothing"). Null
 *  when fewer than two real points exist — the hero then draws the open line alone. */
async function priceSeriesFor(
  assetId: string, opensAtMs: number, endMs: number,
): Promise<{ t: string; price: number }[] | null> {
  const rows = await observationStore.list({ assetId, state: "CONFIRMED", limit: 120 }).catch(() => []);
  const pts = rows
    .filter((o) => o.price != null && o.boundaryAt != null)
    .map((o) => ({ t: o.boundaryAt, price: o.price as number, ms: Date.parse(o.boundaryAt) }))
    .filter((o) => Number.isFinite(o.ms) && o.ms >= opensAtMs && o.ms <= endMs)
    .sort((a, b) => a.ms - b.ms);
  if (pts.length < 2) return null;
  // Never hand the hero more than ~60 points; even-step downsample if a finer feed ever
  // produces more (mirrors market-history.getCompressedHistory). No point is invented.
  const N = 60;
  let out = pts;
  if (pts.length > N) {
    const step = (pts.length - 1) / (N - 1);
    out = Array.from({ length: N }, (_, i) => pts[Math.round(i * step)]);
  }
  return out.map((p) => ({ t: p.t, price: p.price }));
}

/** The viewer's OWN position on THIS market, aggregated for the resolved "Your result"
 *  panel. Reads only the money the settlement path already wrote (status + finalPayout) —
 *  adds no money logic. Null when the viewer holds no position on this round. */
async function myPositionFor(
  userId: string | undefined, marketId: string,
): Promise<{ side: "UP" | "DOWN"; stake: number; payout: number | null; result: "WIN" | "LOSS" | "VOID" | null; ids: string[] } | null> {
  if (!userId) return null;
  const positions = (await listPositionsForUser(userId, 500, "UPDOWN").catch(() => [])).filter((p) => p.marketId === marketId);
  if (positions.length === 0) return null;
  let up = 0, down = 0, stake = 0, payout = 0, anyPayout = false, anyWin = false, anyVoid = false, allSettled = true;
  for (const p of positions) {
    stake += p.stake;
    if (p.side === "YES") up += p.stake; else down += p.stake;
    if (p.finalPayout != null) { payout += p.finalPayout; anyPayout = true; }
    if (p.status === "WIN") anyWin = true;
    else if (p.status === "VOID") anyVoid = true;
    if (p.status === "OPEN") allSettled = false;
  }
  const side: "UP" | "DOWN" = up >= down ? "UP" : "DOWN";
  const result: "WIN" | "LOSS" | "VOID" | null = !allSettled ? null : anyVoid && !anyWin ? "VOID" : anyWin ? "WIN" : "LOSS";
  // ⭐ E-101 · the ids the panel AGGREGATES, so the page can render an anchor for each one and a
  // `/positions/<id>` permalink actually lands on the panel it named. Without these the fragment
  // matches nothing, the browser silently stays at the top, and the deep link is
  // indistinguishable from the generic href it replaced — the subtler version of the same bug.
  return { side, stake, payout: anyPayout ? payout : null, result, ids: positions.map((p) => p.id) };
}

/** One round, for the detail page — with its settlement proof when it has one. */
export async function getRoundDetail(roundId: string, userId?: string): Promise<{
  round: BoardRound;
  asset: BoardAsset;
  titleEn: string;
  /** Real confirmed price points inside the round window; null ⇒ hero draws open line only. */
  priceSeries: { t: string; price: number }[] | null;
  /** The viewer's own stake/result on this round, or null when they did not play it.
   *  `ids` are the positions it aggregates — E-101's anchors are rendered from them. */
  myPosition: { side: "UP" | "DOWN"; stake: number; payout: number | null; result: "WIN" | "LOSS" | "VOID" | null; ids: string[] } | null;
  proof: {
    openPrice: number | null; closePrice: number | null;
    // E-53 · NEITHER endpoint is sent. The half-applied version of this change dropped
    // `openSourceUrl` and kept `closeSourceUrl`, which would have leaked the vendor from
    // the close reading while the open reading looked cleaned — worse than not starting,
    // because it reads as done. What makes this a proof is the price and the two
    // timestamps; the supplier is ours.
    openQuotedAt: string | null; openObservedAt: string | null;
    closeQuotedAt: string | null; closeObservedAt: string | null;
    openEvidence: string | null; closeEvidence: string | null;
  } | null;
  minStake: number; maxStake: number;
  /** UD-1 · viewer's balance for the quick-bet pre-flight. Null = signed out / read
   *  failed — unknown, never zero (see `walletBalanceOf`). */
  walletBalance: number | null;
} | null> {
  const r = await roundStore.get(roundId);
  if (!r) return null;
  const chain = await chainStore.get(r.chainId);
  if (!chain) return null;
  const a = await assetStore.get(chain.assetId);
  const m = await marketStore.get(r.marketId);
  if (!a || !m) return null;

  // The viewer's OWN open stake per side on THIS round — powers the "you're in"
  // indicator + optimistic base on the inline bet box (same source as the board card).
  const mine = userId ? (await myStakesByMarket(userId)).get(r.marketId) : undefined;
  // ⛔ E-99 · THE LAG MUST BE PASSED HERE TOO. This is the ROUND DETAIL path, and it was the
  // one that would have silently shipped broken: `toBoardRound(r, chain, mine)` type-checks
  // perfectly with the fourth argument missing, so `expectedResultAtMs` would have been null
  // on `/updown/[roundId]` for ever while the board card worked — a feature that is present in
  // the code, passes tsc, and does nothing on half the surfaces it claims to cover.
  const board = await toBoardRound(r, chain, mine, await measuredLagSeconds(a.key));
  if (!board) return null;

  const live = await latestConfirmed(a.id);
  const [openObs, closeObs] = await Promise.all([
    r.openObservationId ? observationStore.get(r.openObservationId) : Promise.resolve(null),
    r.closeObservationId ? observationStore.get(r.closeObservationId) : Promise.resolve(null),
  ]);

  // The window ends at close once decided, else "now" — so an open round shows the real
  // reads so far and a resolved one the full window up to close.
  const decided = board.state === "resolved" || board.state === "void";
  const endMs = decided ? Date.parse(r.closesAt) : Date.now();
  const [priceSeries, myPosition, walletBalance, detailBounds] = await Promise.all([
    priceSeriesFor(a.id, Date.parse(r.opensAt), endMs),
    myPositionFor(userId, r.marketId),
    walletBalanceOf(userId),
    stakeBoundsFor(chain),
  ]);

  return {
    round: board,
    asset: {
      id: a.id, key: a.key, nameEn: a.nameEn, nameSw: a.nameSw, nameZh: a.nameZh,
      iconKey: a.iconKey, decimals: a.decimals, sourceClass: publicSourceClassFor(a),
      livePrice: live?.price ?? null, sourceQuotedAt: live?.quotedAt ?? null,
      durations: [chain.durationMinutes],
    },
    titleEn: m.titleEn,
    priceSeries,
    myPosition,
    // The proof panel renders ONLY once the round is decided — showing a half-filled
    // receipt mid-round would imply a result that does not exist yet.
    proof: r.resolvedAt
      ? {
          openPrice: r.openPrice, closePrice: r.closePrice,
          // E-53 · the endpoint is NOT sent. It named the vendor and, being a query
          // URL, invited a click to a page the player cannot read anyway. The price
          // and both timestamps are what make this a proof; the supplier is ours.
          openQuotedAt: openObs?.sourceQuotedAt ?? null, openObservedAt: openObs?.confirmedAt ?? null,
          closeQuotedAt: closeObs?.sourceQuotedAt ?? null, closeObservedAt: closeObs?.confirmedAt ?? null,
          openEvidence: openObs?.evidence ?? null, closeEvidence: closeObs?.evidence ?? null,
        }
      : null,
    // ⛔ THROUGH `stakeBoundsFor`, not `chain.minStake ?? default`. The inline form skips
    // the product floor the resolver applies (Math.max with defaultMinStake), so a chain
    // configured below the floor showed this page a minimum `buyPosition` then refused —
    // the exact display/enforcement split the money path's comment forbids. The board and
    // the money path both already resolve through this ONE function.
    minStake: detailBounds.min,
    maxStake: detailBounds.max,
    walletBalance,
  };
}
