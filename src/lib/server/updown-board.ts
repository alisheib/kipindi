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
// CHART-SPRINT-2 · the terminal chart's vendor-bars tier (real market OHLC; E-53-safe proxying).
import { vendorBarsFor, VENDOR_PLAN } from "./updown-terminal-vendor";
import { ratesFor, listPositionsForUser, listPositionsForMarket, projectedPayout } from "./market-service";
// 🔴 `pricedYesPct`, NOT `impliedYesPct` — PV-06, 2026-09-03. Two functions answer "what share
// of the pool is on UP", and they disagree about the only case that matters: `impliedYesPct`
// returns a hardcoded **50** on an empty pool (`market-service.ts:315`), `pricedYesPct` returns
// **null**. This board took the fabricating one, so a round with `VOL TZS 0` and ZERO predictors
// rendered a filled "Up 50% · 50% Down" bar on production — a crowd price invented for a crowd
// that does not exist (RULES law 5 / §C2). Five surfaces already consume the honest rule; this
// was the sixth that was never wired to it.
import { pricedYesPct } from "@/lib/markets/discovery";
// ⭐ D2 · the shape the player surfaces price a bet from. Isomorphic by design — the card is a
// client component, this is the server, and one definition of "what would I be paid" is the
// point (same reasoning as `updown-refund-reason.ts`).
import type { UpDownPricing } from "@/lib/updown-pricing";
// The frozen facts a placed bet is confirmed with, and the one rule that decides whether it
// has a way out. Isomorphic for the same reason `UpDownPricing` is — see the module header.
import type { UpDownReceiptInfo } from "@/lib/updown-receipt";
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
  /** The UP share of the pool, or **null** when no money is in it — see the `pricedYesPct`
   *  import note. ⛔ Never coalesce this to 50 at a call site; that is the defect, relocated. */
  upPct: number | null;
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
  /**
   * ⭐ E-166 · WHEN THIS ROUND'S RESULT LANDED — the anchor the handover hold is measured from.
   *
   * ⛔ It must be the SERVER's record of the settle, never the instant a component mounted. A
   * hold anchored to the mount restarts on every `router.refresh()`, which the poller fires
   * constantly, so the ticker would appear and vanish for ever. Null until the round resolves.
   */
  resolvedAtMs: number | null;
  /**
   * ⭐ E-166 · THE ROUND THAT TAKES THE SCREEN NEXT, and everything needed to say something true
   * about it. Always present (never null) so a surface cannot silently forget to ask; the
   * emptiness is expressed in the fields, which is the shape `resultClock` already established.
   *
   * ⛔ THE PLAYER SURFACES MAY NOT DERIVE THIS. The successor's open instant is a fact about the
   * chain's grid and its persisted `nextBoundaryAt`, and re-deriving it in the browser would be
   * a second answer to "when does the next match start" — the drift `selectionClosedAt` and
   * `expectedResultAtMs` are both shaped to avoid.
   */
  successor: RoundSuccessor;
  /**
   * ⭐ THE BET RECEIPT'S FROZEN FACTS — assembled ONCE, here, so the board card and
   * `/updown/[roundId]` confirm a bet with the same sentences.
   *
   * ⛔ IT CARRIES `freeExitGraceMinutes` FROM `ratesFor(m)`, THE MARKET'S OWN SNAPSHOT, and
   * that is the whole reason it is built server-side rather than in the modal. The receipt
   * states whether this bet can be cancelled, and `cashOutValue` answers that from the
   * market's frozen grace against the bet's runway — never live config. A client reading
   * `docs/RULES.md` §2.6's "5 minutes" as a constant would print *"Free cancellation ·
   * 5 min"* on a 3-minute round, where the exit does not exist at all.
   */
  receipt: UpDownReceiptInfo;
};

/**
 * ⭐ E-166 · What the surface is allowed to say about the round that follows this one.
 *
 * ⛔ EVERY FIELD CAN BE EMPTY, AND EACH EMPTINESS MEANS SOMETHING DIFFERENT — which is why this
 * is four fields rather than one nullable id. "The chain is stopped" and "the chain is running
 * but the bar has not published yet" are opposite facts about the player's next two minutes,
 * and collapsing them into `successor: null` would make the surface say the same wrong thing
 * about both.
 */
export type RoundSuccessor = {
  /** The successor round, when it EXISTS. Null ⇒ no row yet, whatever the clock says. */
  roundId: string | null;
  /**
   * When it opens: its own `opensAt` when the row exists, else the chain's persisted
   * `nextBoundaryAt` — the instant the chain will next act.
   * ⛔ Null when we cannot honestly name one, and the surface then shows `—:—`.
   */
  opensAtMs: number | null;
  /** False ⇒ no successor can exist right now: the chain is not RUNNING. */
  chainRunning: boolean;
};

/**
 * ⭐ E-166 · Resolve the successor of `r` on `chain`.
 *
 * ⛔ THE SUCCESSOR IS THE ROUND THAT OPENS WHERE THIS ONE CLOSES — matched on the INSTANT, not
 * on `roundNumber + 1`. Numbers survive an abandoned boundary and the instants do not lie about
 * it: when a boundary is skipped (measured: 20 of 2,357 successions in 48h, gaps of 11 to 83
 * minutes) round `n+1` exists but does NOT start where round `n` ended, and calling it "next"
 * would hand a player a round that begins an hour later as though it were imminent.
 *
 * ⛔ AND WHEN NO ROW MATCHES, `chain.nextBoundaryAt` IS THE ANSWER — not arithmetic on the grid.
 * `advanceChain` leaves that column pinned to the boundary it is still retrying, so it names
 * exactly the instant the chain will next attempt to open a round. Deriving `anchor + k·span`
 * here instead would produce a boundary the chain has already abandoned, and the player would
 * watch a countdown reach zero and nothing happen. Re-read on every poll, never accumulated.
 */
async function successorFor(
  r: StoredRound,
  chain: StoredChain,
  /** Rounds already in hand (the board has 24 of them) — saves a query per card. */
  siblings?: StoredRound[],
): Promise<RoundSuccessor> {
  const chainRunning = chain.state === "RUNNING";
  const empty: RoundSuccessor = { roundId: null, opensAtMs: null, chainRunning };
  if (!chainRunning) return empty;

  const pool = siblings ?? await roundStore.list({ chainId: chain.id, limit: 4 }).catch(() => []);
  const next = pool.find((x) => x.id !== r.id && x.opensAt === r.closesAt) ?? null;

  if (!next) {
    // No round at this boundary yet. The chain's own declared next attempt is the honest
    // instant — and null when it has none, which the surface renders as `—:—`.
    const nb = chain.nextBoundaryAt ? Date.parse(chain.nextBoundaryAt) : NaN;
    return { ...empty, opensAtMs: Number.isFinite(nb) ? nb : null };
  }

  // ⚠️ THE SUCCESSOR'S LOCK INSTANT IS DELIBERATELY NOT CARRIED. It was, for one iteration: the
  // handover pod counted down to "how long you have to get into the next match". Looking at the
  // board killed it — the successor is the card immediately to the left, already showing that
  // very clock, so the settled card rendered a second identical `02:50`. The next match's clock
  // belongs to the next match, so nothing here needs to know when its betting shuts.
  const opensAtMs = Date.parse(next.opensAt);
  return {
    roundId: next.id,
    opensAtMs: Number.isFinite(opensAtMs) ? opensAtMs : null,
    chainRunning,
  };
}

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
  /**
   * ⛔ REQUIRED, and positioned BEFORE the optional arguments deliberately. The receipt needs
   * the asset's `decimals` and `sourceClass`, and this file has already been bitten once by
   * an optional trailing parameter: the note on `measuredLagSeconds` at the `getRoundDetail`
   * call site records that `toBoardRound(r, chain, mine)` type-checked perfectly with the
   * lag missing, so a feature would have been null on `/updown/[roundId]` for ever while the
   * board card worked. A required parameter makes forgetting it a compile error instead.
   */
  asset: Pick<StoredAsset, "decimals" | "symbol" | "category">,
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
    upPct: pricedYesPct(m.yesPool, m.noPool),
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
    // ⭐ The receipt's frozen facts, built here so both bet surfaces confirm identically.
    // `rates` is `ratesFor(m)` — the MARKET's own snapshot, already resolved above for the
    // pricing block, so the exit terms stated on the receipt are the exact ones
    // `cashOutValue` will apply. See `src/lib/updown-receipt.ts`.
    receipt: {
      durationMinutes: chain.durationMinutes,
      selectionClosedAt: m.selectionClosedAt,
      closesAt: r.closesAt,
      openPrice: r.openPrice,
      decimals: asset.decimals,
      sourceClass: publicSourceClassFor(asset),
      roundHref: `/updown/${r.id}`,
      freeExitGraceMinutes: rates.freeExitGraceMinutes,
    },
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
    // ⭐ E-166 · the SERVER's record of when the result landed — the hold's anchor.
    resolvedAtMs: r.resolvedAt != null && Number.isFinite(Date.parse(r.resolvedAt))
      ? Date.parse(r.resolvedAt) : null,
    // ⛔ E-166 · DELIBERATELY EMPTY HERE, and filled only for the rounds that can use it.
    // `handoverClock` returns `none` for anything unsettled, so resolving a successor for every
    // one of the board's 24 mapped rounds would be 24 queries answering a question no surface
    // asks. `chainRunning` is the one fact that is free and always true of the chain, so it is
    // the one fact this default carries.
    successor: { roundId: null, opensAtMs: null, chainRunning: chain.state === "RUNNING" },
  };
}

/**
 * ⭐ E-166 · Fill in the successor for the rounds that will actually be RENDERED, and only for
 * the settled ones — the only state in which a handover exists.
 *
 * ⛔ AFTER the board's selection, never before. `toBoardRound` runs over 24 rows to find the two
 * or three the board shows; resolving a successor inside it would put a market read on every one
 * of them, on a page that already carries the product's heaviest query.
 */
async function withSuccessors(
  rounds: BoardRound[],
  chain: StoredChain,
  siblings: StoredRound[],
): Promise<BoardRound[]> {
  return Promise.all(rounds.map(async (b) => {
    if (b.state !== "resolved" && b.state !== "void") return b;
    const raw = siblings.find((x) => x.id === b.roundId);
    if (!raw) return b;
    return { ...b, successor: await successorFor(raw, chain, siblings) };
  }));
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
        // ⚠️ CORRECTED 2026-08-19 — the sentence below said *"EVERY chain is now STOPPED"* and
        // it has stopped being true. Live census the same day: **19 chains, 14 RUNNING**, the
        // scheduler armed and current on every one of them, emitting automatically. Automatic
        // emission was evidently turned back on and this comment did not hear about it. The
        // CONCLUSION still stands and the filter must stay off — a stopped chain's existing
        // rounds are still playable — but a session reading this to learn how the product runs
        // today would have been told the opposite of the truth, which is the drift §0 forbids.
        //
        // This filtered on `state !== "STOPPED"`. That was fine while a STOPPED chain meant a
        // dead market — but Ali removed automatic emission (*"my admins will enter and generate
        // every 5 min"*), so every chain was STOPPED and rounds were made by hand. The filter
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
  /**
   * 🔴 E-166 · AND "HAS A CHAIN" WAS NOT ENOUGH EITHER — measured on production 2026-08-19.
   *
   * The note above fixed the ASSET default and left the DURATION default as `durations[0]`,
   * which is simply the SMALLEST round length. BTC's smallest is **3 minutes and its 3-minute
   * chain is STOPPED** — so `https://50pick.tz/updown`, the front door of this product, served
   * exactly one card: a round that had settled **25 hours earlier**, headed *"Closed · BTC"*.
   * No live game at all, while BTC 5m, 10m and 15m were all running and bettable one tab away.
   *
   * ⚠️ THE SAME MISTAKE, ONE FIELD ACROSS. The asset default already reasons *"default to one
   * that is actually playable"*; the duration default was still reasoning *"the first one"*. Of
   * nineteen live chains five are STOPPED, and three of those five are the shortest length on
   * their asset — so this was not an unlucky configuration, it was the likely one.
   *
   * ⛔ AN EXPLICIT `?d=` STILL WINS, exactly as `?asset=` does: a player who asked for the
   * 3-minute board is told the 3-minute board is idle, never silently moved somewhere else.
   * ⛔ AND THE TABS ARE UNCHANGED. A stopped length is still offered — E-67's whole finding is
   * that a chain's state says whether MORE rounds will appear, not whether the ones there can
   * be played. This changes only which one you land on when you did not choose.
   */
  const runningDurations = (assetId: string) =>
    allChains
      .filter((c) => c.assetId === assetId && c.state === "RUNNING")
      .map((c) => c.durationMinutes)
      .sort((x, y) => x - y);

  const activeAsset =
    (opts?.assetKey ? assets.find((a) => a.key === opts.assetKey) : undefined)
    // Prefer an asset with a RUNNING chain; fall back to one that merely has a chain, so an
    // all-stopped platform still lands somewhere real rather than on the empty state.
    ?? assets.find((a) => runningDurations(a.id).length > 0)
    ?? assets.find((a) => a.durations.length > 0)
    ?? assets[0] ?? null;
  if (!activeAsset) return { assets, activeAsset: null, activeDuration: null, rounds: [], recent: [], chainPaused: false, stakeBounds: defaultBounds, walletBalance };
  // The STORED row behind the active card. `BoardAsset` is the mapped, player-safe shape and
  // deliberately carries no `symbol`/`category` — E-53 keeps the vendor's identifiers off the
  // wire — but `publicSourceClassFor` classifies FROM those fields, so the receipt is built
  // from the row rather than by widening what crosses to the browser.
  const activeAssetRow = enabled.find((a) => a.id === activeAsset.id);
  if (!activeAssetRow) return { assets, activeAsset, activeDuration: null, rounds: [], recent: [], chainPaused: true, stakeBounds: defaultBounds, walletBalance };

  const activeDuration =
    (opts?.durationMinutes && activeAsset.durations.includes(opts.durationMinutes) ? opts.durationMinutes : undefined)
    ?? runningDurations(activeAsset.id)[0]
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
    raw.map((r) => toBoardRound(r, chain, activeAssetRow, mineByMarket.get(r.marketId), lagSeconds)),
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
  // ⭐ E-166 · the settled card must be able to say what comes NEXT, not "Closed". Resolved here
  // — after the selection — so the cost is one lookup for the one card that can use it.
  const rounds = await withSuccessors(
    [current, justClosed, lastDone].filter(Boolean) as BoardRound[],
    chain,
    raw,
  );

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

// ═══════════════════════════════════════════════════════════════════════════
// CHART-SPRINT-2 · the terminal chart's HISTORY windows (Ali, 2026-09-04:
// "history plus live — show them history until a period based on what they
// filter, and what's happening now will be the last candle or last point").
//
// ⚠️ THE CADENCE IS A MEASUREMENT, NEVER AN ASSUMPTION. The first version of
// this reader hard-coded a per-minute feed; the adversarial review executed
// the real writers and proved reads land only at CHAIN GRID BOUNDARIES —
// every `roundSpanMinutes(duration)` (duration + result phase), i.e. 4 to 72
// minutes apart per chain, interleaved when an asset runs several chains, and
// the reader's own test had seeded the assumption back to itself. Everything
// below therefore DERIVES from the window's observed median inter-read delta:
//  · the gap threshold (a hole > GAP_FACTOR × median becomes a MARKER — the
//    client renders it as a real break, never a bridge),
//  · the candle bucket (smallest rung holding ≥ READS_PER_CANDLE medians),
//  · the per-bucket floor (a HISTORICAL bucket under half its expected reads
//    is a gap, not a candle — §B12.3 bans invented wicks, and aggregating
//    too-few real reads invents a wick's confidence if not its values),
//  · the FORMING bucket (newest, still filling) is exempt from the floor —
//    a partial candle of real reads is Ali's "what's happening now IS the
//    last candle", and it is labelled by its own n.
// A window whose eligible candles cover under half its span degrades to the
// line form. Store failures on the SERIES read PROPAGATE (no catch): a DB blip
// must reach the route as a 503, never render as a cacheable "no data"
// (A-5/B-1). ⚠️ The ONE deliberate exception: the live-price garnish rides
// `latestConfirmed`, which degrades to null on failure — an honest-null "no
// live line" while the series still draws, judged correct because a chart
// that 503s over its garnish read punishes the working 95%.
// ═══════════════════════════════════════════════════════════════════════════

export type TerminalRange = "15M" | "30M" | "1H" | "6H" | "12H" | "24H" | "7D";

const TERMINAL_WINDOWS: Record<TerminalRange, { windowMs: number; wantCandles: boolean }> = {
  // Ali's final ladder (2026-09-04): 15M · 30M · 1H · 6H · 12H · 24H — his 1m/5m
  // were REFUSED on the data: at the measured ~3-min grid cadence those windows
  // hold ≤2 reads, and a pill that mostly answers "no reads" is a dead control;
  // the sub-15-minute now belongs to the ROUND view. Short windows default to
  // the curve, long ones to candles; the style rail overrides either way.
  "15M": { windowMs: 15 * 60_000, wantCandles: false },
  "30M": { windowMs: 30 * 60_000, wantCandles: false },
  "1H": { windowMs: 60 * 60_000, wantCandles: false },
  "6H": { windowMs: 6 * 3600_000, wantCandles: true },
  "12H": { windowMs: 12 * 3600_000, wantCandles: true },
  "24H": { windowMs: 24 * 3600_000, wantCandles: true },
  "7D": { windowMs: 7 * 24 * 3600_000, wantCandles: true },
};

/** Candle bucket rungs, minutes — the smallest that fits the cadence wins. */
const BUCKET_RUNGS_MIN = [5, 10, 15, 30, 60, 120, 240];
/** A candle wants at least this many median inter-read gaps of width. */
const READS_PER_CANDLE = 4;
/** A hole wider than this many medians is a gap marker. */
const GAP_FACTOR = 2.5;

export type TerminalPoint = { t: number; price: number | null }; // price null = gap marker
export type TerminalCandle = { t: number; o: number; h: number; l: number; c: number; n?: number; v?: number | null; forming?: boolean };
export type TerminalSeries =
  | { mode: "line"; points: TerminalPoint[] }
  | { mode: "candles"; candles: TerminalCandle[]; bucketMs: number; gaps: number[] };

/** The player's explicit style choice (Ali, 2026-09-04: "should we have a
 *  toggle for each version" — auto-switching between forms read as a glitch).
 *  "auto" keeps the range defaults; an explicit "candles" NEVER relaxes the
 *  per-bucket honesty floor — a window too thin for ≥MIN_EXPLICIT_CANDLES
 *  honest candles answers with the line and says so via `candlesUnavailable`. */
export type TerminalStyle = "auto" | "line" | "candles";
const MIN_EXPLICIT_CANDLES = 3;

export type TerminalFeed = {
  series: TerminalSeries;
  livePrice: number | null;
  sourceQuotedAt: string | null;
  /** True when the newest confirmed read is older than GAP_FACTOR × the window's
   *  median cadence — the client dims the live reference line and the receipt
   *  line carries the quote time, so a stalled feed cannot wear a flat market's
   *  face (review finding F20). Null when the window cannot measure a cadence. */
  liveStale: boolean | null;
  medianDeltaMs: number | null;
  decimals: number;
  /** Set only when the player EXPLICITLY asked for candles and the window
   *  cannot honestly provide them — the client states why it shows the curve. */
  candlesUnavailable?: boolean;
};

/**
 * The history window for one asset. Bounded in TIME and COUNT (the DAL read is
 * index-served via `boundaryFrom`). Returns null only for an UNKNOWN/disabled
 * asset — the route's 404. ⛔ Reads that FAIL throw: the route answers 503
 * with no-store, because a store error rendered as an empty chart is a
 * fabricated statement about the world, cached for every viewer.
 */
export async function getAssetTerminalSeries(
  assetKey: string,
  range: TerminalRange,
  style: TerminalStyle = "auto",
): Promise<TerminalFeed | null> {
  const cfg = TERMINAL_WINDOWS[range];
  if (!cfg) return null;
  const assets = await assetStore.list({ enabledOnly: true });
  const asset = assets.find((a) => a.key === assetKey);
  if (!asset) return null;

  const now = Date.now();

  // ── TIER 1 · the vendor's own bars (Ali's full-access grant, 2026-09-04) ──
  // Real market OHLC(+volume) at the range's native resolution, one credit per
  // 30s per (asset, range) across all viewers. The MONEY stays untouched: the
  // gilt live line and every settlement remain the platform's confirmed reads;
  // these bars are the market context every trading product charts. A vendor
  // miss falls through to the confirmed-reads tier — never a blank pane.
  const vendorBars = await vendorBarsFor(
    { id: asset.id, symbol: asset.symbol, priceSourceUrl: asset.priceSourceUrl, sourceDomain: asset.sourceDomain },
    range,
    process.env.TWELVEDATA_API_KEY,
  );
  const liveForBase = await latestConfirmed(asset.id);
  if (vendorBars && vendorBars.length >= 2) {
    const plan = VENDOR_PLAN[range];
    const inWindow = vendorBars.filter((b) => b.t >= now - cfg.windowMs && b.t <= now);
    if (inWindow.length >= 2) {
      // ⛔ STALENESS IS A PROPERTY OF THE QUOTE, NOT THE VIEWING WINDOW (re-sign
      // panel, finance lens): keyed to the bar interval, the 7D pill tolerated a
      // dead oracle for 2.5 hours while 15M flagged the SAME quote at 5 minutes —
      // two contradictory verdicts one tap apart. The gate now measures the quote
      // feed's own cadence (its recent confirmed reads); plan.intervalMs stays in
      // medianDeltaMs for POLL PACING only.
      const recentQuotes = await observationStore
        .list({ assetId: asset.id, state: "CONFIRMED", limit: 8 })
        .catch(() => []);
      const qTimes = recentQuotes.map((o) => Date.parse(o.boundaryAt)).filter(Number.isFinite).sort((a, b) => a - b);
      const qDeltas = qTimes.slice(1).map((t, i) => t - qTimes[i]).sort((a, b) => a - b);
      const quoteCadence = qDeltas.length >= 2 ? qDeltas[Math.floor(qDeltas.length / 2)] : null;
      const vLiveStale = liveForBase?.quotedAt != null
        ? now - Date.parse(liveForBase.quotedAt) > Math.max(quoteCadence != null ? GAP_FACTOR * quoteCadence : 0, 5 * 60_000)
        : null;
      const vBase = {
        livePrice: liveForBase?.price ?? null,
        sourceQuotedAt: liveForBase?.quotedAt ?? null,
        liveStale: vLiveStale,
        medianDeltaMs: plan.intervalMs,
        decimals: asset.decimals,
      };
      // Missing grid steps between the first and last bar are REAL market
      // closures or feed holes — reserved as gaps either way (a shut gold
      // weekend must keep its width, §B12.3's spirit at market scale).
      const gaps: number[] = [];
      for (let t = inWindow[0].t + plan.intervalMs; t < inWindow[inWindow.length - 1].t; t += plan.intervalMs) {
        if (!inWindow.some((b) => b.t === t)) gaps.push(t);
      }
      if (style === "line" || (style === "auto" && !cfg.wantCandles)) {
        const points: TerminalPoint[] = [];
        for (let i = 0; i < inWindow.length; i++) {
          if (i > 0 && inWindow[i].t - inWindow[i - 1].t > plan.intervalMs) {
            for (let k = inWindow[i - 1].t + plan.intervalMs; k < inWindow[i].t; k += plan.intervalMs) {
              points.push({ t: k, price: null });
            }
          }
          points.push({ t: inWindow[i].t, price: inWindow[i].c });
        }
        return { series: { mode: "line", points }, ...vBase };
      }
      const formingT = Math.floor(now / plan.intervalMs) * plan.intervalMs;
      const candles: TerminalCandle[] = inWindow.map((b) => ({
        t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v,
        ...(b.t === formingT ? { forming: true } : {}),
      }));
      return { series: { mode: "candles", candles, bucketMs: plan.intervalMs, gaps }, ...vBase };
    }
  }

  // ── TIER 2 · the platform's own confirmed reads (the settlement truth) ────
  const since = new Date(now - cfg.windowMs).toISOString();
  const rows = await observationStore.list({ assetId: asset.id, state: "CONFIRMED", boundaryFrom: since, limit: 1600 });
  const reads = rows
    .filter((o) => o.price != null && o.boundaryAt != null)
    .map((o) => ({ t: Date.parse(o.boundaryAt), price: o.price as number }))
    .filter((o) => Number.isFinite(o.t))
    .sort((a, b) => a.t - b.t);

  const live = liveForBase;

  // The window's own cadence — the median inter-read delta. Needs ≥3 reads to
  // mean anything; below that everything degrades to the sparse line.
  const deltas = reads.slice(1).map((r, i) => r.t - reads[i].t).sort((a, b) => a - b);
  const medianDeltaMs = deltas.length >= 2 ? deltas[Math.floor(deltas.length / 2)] : null;
  const gapMs = medianDeltaMs != null ? Math.max(3 * 60_000, GAP_FACTOR * medianDeltaMs) : null;
  // ⛔ The stale gate must not FAIL OPEN on an unmeasurable window (judge panel,
  // finance + data lenses): during the first minutes of a real outage a 15M/30M
  // window can hold 1–2 reads, cadence unmeasurable — exactly when a dead feed
  // is most likely. With a quote in hand the ABSOLUTE 5-minute floor always
  // applies; null only when there is no quote at all.
  const liveStale =
    live?.quotedAt != null
      ? now - Date.parse(live.quotedAt) > Math.max(medianDeltaMs != null ? GAP_FACTOR * medianDeltaMs : 0, 5 * 60_000)
      : null;

  const base = {
    livePrice: live?.price ?? null,
    sourceQuotedAt: live?.quotedAt ?? null,
    liveStale,
    medianDeltaMs,
    decimals: asset.decimals,
  };

  // ONE line-builder for the line ranges and every degrade path, so no two
  // paths can disagree about what a gap is. Without a measurable cadence there
  // are no markers — the client draws the isolated points it was given.
  // ⚠️ A hole emits one marker PER MISSING GRID STEP, not one per hole: the
  // renderer's time scale is INDEX-spaced (a trading-chart property the review
  // probe measured — absent times occupy no axis width at all), so an outage
  // keeps honest width only if each missing step reserves its slot, exactly
  // how trading terminals draw session breaks.
  const lineFrom = (rs: typeof reads): TerminalSeries => {
    const points: TerminalPoint[] = [];
    for (let i = 0; i < rs.length; i++) {
      if (i > 0 && gapMs != null && medianDeltaMs != null && rs[i].t - rs[i - 1].t > gapMs) {
        for (let k = rs[i - 1].t + medianDeltaMs; k <= rs[i].t - medianDeltaMs / 2; k += medianDeltaMs) {
          points.push({ t: Math.round(k), price: null });
        }
      }
      points.push({ t: rs[i].t, price: rs[i].price });
    }
    return { mode: "line", points };
  };

  // The player's explicit "line" always wins; explicit "candles" ATTEMPTS the
  // candle build on any window; "auto" keeps the per-range defaults.
  const wantCandles = style === "candles" ? true : style === "line" ? false : cfg.wantCandles;
  if (!wantCandles || medianDeltaMs == null) {
    return {
      series: lineFrom(reads),
      ...base,
      ...(style === "candles" ? { candlesUnavailable: true } : {}),
    };
  }

  // The bucket rung: smallest that holds READS_PER_CANDLE median gaps. A
  // cadence too slow for the window's largest sensible rung → line.
  const bucketMs = (BUCKET_RUNGS_MIN.map((m) => m * 60_000).find((b) => b >= READS_PER_CANDLE * medianDeltaMs) ?? Infinity);
  // The window must FIT enough buckets: six on "auto" (a candle chart of five is
  // a thin claim to make silently), but an EXPLICIT request already owns the
  // form, so the fit bar is MIN_EXPLICIT_CANDLES — measured live: at the real
  // 3-min cadence, 1H+Candles honestly yields four 15-min candles and was being
  // refused by the auto bar (full usage of data, Ali's ruling).
  const fitDivisor = style === "candles" ? MIN_EXPLICIT_CANDLES : 6;
  if (!Number.isFinite(bucketMs) || bucketMs > cfg.windowMs / fitDivisor) {
    return {
      series: lineFrom(reads),
      ...base,
      ...(style === "candles" ? { candlesUnavailable: true } : {}),
    };
  }

  // Bucket on ALIGNED boundaries across an ALIGNED window start, so the oldest
  // bucket is never structurally partial (review F10).
  // ⛔ If the row cap truncated the OLDEST edge, tile candles only from the
  // oldest read actually fetched — otherwise the missing-but-existing early
  // buckets would render as gap whitespace: a fabricated outage (judge panel,
  // data lens; reachable at any future sub-54s cadence against the 1600 cap).
  const capped = rows.length >= 1600 && reads.length > 0;
  const windowStart = Math.max(
    Math.ceil((now - cfg.windowMs) / bucketMs) * bucketMs,
    capped ? Math.ceil(reads[0].t / bucketMs) * bucketMs : -Infinity,
  );
  const formingBucket = Math.floor(now / bucketMs) * bucketMs;
  const buckets = new Map<number, number[]>();
  for (const r of reads) {
    if (r.t < windowStart) continue;
    const b = Math.floor(r.t / bucketMs) * bucketMs;
    const arr = buckets.get(b);
    if (arr) arr.push(r.price);
    else buckets.set(b, [r.price]);
  }

  // A HISTORICAL bucket earns its candle with at least half its expected reads
  // (never fewer than 2); the FORMING bucket is exempt — its partial OHLC is
  // real reads, growing, and labelled by its own n.
  const expectedPerBucket = bucketMs / medianDeltaMs;
  const floor = Math.max(2, Math.round(expectedPerBucket / 2));
  const candles: TerminalCandle[] = [];
  const gaps: number[] = [];
  for (let b = windowStart; b <= formingBucket; b += bucketMs) {
    const prices = buckets.get(b);
    const forming = b === formingBucket;
    if (prices && (forming || prices.length >= floor)) {
      candles.push({
        t: b,
        o: prices[0],
        h: Math.max(...prices),
        l: Math.min(...prices),
        c: prices[prices.length - 1],
        n: prices.length,
        ...(forming ? { forming: true } : {}),
      });
    } else {
      // The dropped/empty bucket stays VISIBLE as reserved axis space — the
      // client feeds these as whitespace so a feed outage looks like exactly
      // what it is, never like candles closing ranks (review F19).
      gaps.push(b);
    }
  }

  // The mode threshold: on "auto", under half the window's buckets → line (a
  // sparse window must not wear a candle chart's confidence). On an EXPLICIT
  // "candles" request the player owns the form, so the bar is the floor of
  // meaning instead: at least MIN_EXPLICIT_CANDLES honest historical candles —
  // below that the window answers with the line AND says why. ⛔ The per-bucket
  // floor above never relaxes on any path: thin buckets stay gaps.
  const done = candles.filter((c) => !c.forming).length;
  const expectedBuckets = Math.max(1, Math.floor((formingBucket - windowStart) / bucketMs));
  const enough = style === "candles" ? done >= MIN_EXPLICIT_CANDLES : done >= expectedBuckets / 2;
  if (!enough) {
    return {
      series: lineFrom(reads),
      ...base,
      ...(style === "candles" ? { candlesUnavailable: true } : {}),
    };
  }

  return { series: { mode: "candles", candles, bucketMs, gaps }, ...base };
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

/** The viewer's OWN position on THIS market, for the resolved "Your result" panel.
 *  Reads only the money the settlement path already wrote (status + finalPayout) —
 *  adds no money logic. Null when the viewer holds no position on this round.
 *
 *  🔴 IT USED TO READ THE PLAYER'S 500 MOST RECENT POSITIONS AND *THEN* FILTER TO THIS
 *  MARKET — `listPositionsForUser(userId, 500, "UPDOWN").filter(p => p.marketId === …)`.
 *  The cap is applied by the STORE, before the filter, so a player past 500 Up & Down
 *  positions opening an older round got an empty list and this returned `null`: the page
 *  then says they did not play a round they did play, and their settled money is invisible.
 *  A silent truncation is bad; a silent truncation that reads as "you have no position" on
 *  a money surface is the B-1 class outright. Scoping the query to the MARKET removes the
 *  cap entirely — one round's positions are bounded by the round, and it is the indexed
 *  lookup on `@@index([marketId, status])` rather than a scan of the player's history.
 *
 *  ⭐ `items` is every position, itemised. The aggregate stays (settlement wrote it and the
 *  panel's headline figures are read straight off it) — but a player holding six positions
 *  was shown ONE line, and a HEDGED player was shown a single `side` chosen by
 *  `up >= down`, which is not a fact about their bet. Both surfaces now render each one. */
export type MyRoundPosition = {
  id: string;
  side: "UP" | "DOWN";
  stake: number;
  payout: number | null;
  status: "OPEN" | "WIN" | "LOSS" | "VOID" | "CASHED_OUT";
  placedAt: string;
};

async function myPositionFor(
  userId: string | undefined, marketId: string,
): Promise<{
  side: "UP" | "DOWN"; stake: number; payout: number | null;
  result: "WIN" | "LOSS" | "VOID" | null; ids: string[];
  /** Every position this viewer holds on this round, newest first. Never truncated. */
  items: MyRoundPosition[];
  /** True when the viewer backed BOTH sides — the aggregate `side` cannot describe them. */
  hedged: boolean;
} | null> {
  if (!userId) return null;
  const positions = (await listPositionsForMarket(marketId).catch(() => [])).filter((p) => p.userId === userId);
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
  // ⭐ Newest first, matching /updown/history's own ordering so a player reading both
  // surfaces sees their positions in one order. `listForMarket` orders by the store's
  // own key, so the sort is explicit here rather than assumed.
  const items: MyRoundPosition[] = positions
    .map((p) => ({
      id: p.id,
      side: (p.side === "YES" ? "UP" : "DOWN") as "UP" | "DOWN",
      stake: p.stake,
      payout: p.finalPayout,
      status: p.status,
      placedAt: p.placedAt,
    }))
    .sort((a, b) => (Date.parse(b.placedAt) || 0) - (Date.parse(a.placedAt) || 0));
  // ⭐ E-101 · the ids the panel AGGREGATES, so the page can render an anchor for each one and a
  // `/positions/<id>` permalink actually lands on the panel it named. Without these the fragment
  // matches nothing, the browser silently stays at the top, and the deep link is
  // indistinguishable from the generic href it replaced — the subtler version of the same bug.
  return {
    side, stake, payout: anyPayout ? payout : null, result,
    ids: items.map((p) => p.id),
    items,
    hedged: up > 0 && down > 0,
  };
}

/** One round, for the detail page — with its settlement proof when it has one. */
export async function getRoundDetail(roundId: string, userId?: string): Promise<{
  round: BoardRound;
  asset: BoardAsset;
  titleEn: string;
  /** Real confirmed price points inside the round window; null ⇒ hero draws open line only. */
  priceSeries: { t: string; price: number }[] | null;
  /** The viewer's own stake/result on this round, or null when they did not play it.
   *  `ids` are the positions it aggregates — E-101's anchors are rendered from them.
   *  `items` is every one of those positions, itemised and never truncated. */
  myPosition: {
    side: "UP" | "DOWN"; stake: number; payout: number | null;
    result: "WIN" | "LOSS" | "VOID" | null; ids: string[];
    items: MyRoundPosition[]; hedged: boolean;
  } | null;
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
  const board = await toBoardRound(r, chain, a, mine, await measuredLagSeconds(a.key));
  if (!board) return null;
  // ⭐ E-166 · THE DETAIL PAGE NEEDS THIS TOO, and it is the surface that would have shipped
  // broken without the line. `toBoardRound` type-checks perfectly with an empty successor, so
  // the round page would have rendered a permanent "no next match" while the board worked —
  // exactly the half-wired shape E-99's own comment three lines above warns about.
  if (board.state === "resolved" || board.state === "void") {
    board.successor = await successorFor(r, chain);
  }

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
