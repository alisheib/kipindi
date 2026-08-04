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
  /** Display-only estimate from the round's OWN frozen snapshot, or null if the poll
   *  did not freeze one — never a default invented at render time. */
  estMultiplier: number | null;
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

async function toBoardRound(
  r: StoredRound,
  chain: StoredChain,
  mine?: { up: number; down: number },
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
    // Only if the poll actually froze one. `showEstimatedWinnings` false ⇒ null ⇒ the
    // card hides the "× …" entirely rather than printing "× 0".
    estMultiplier: rates.showEstimatedWinnings ? 1 + rates.estimatedWinningsRate : null,
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
    // Only for a LOCKED round the viewer actually holds — see the field comment. `projectedPayout`
    // is the money path's own function, so this figure and the settled one cannot disagree.
    myExactPayout:
      state === "locked" && myStake > 0
        ? await projectedPayout(m, myUpStake > 0 ? "YES" : "NO", myStake)
        : null,
  };
}

/** The viewer's OPEN stake per market, split UP(=YES)/DOWN(=NO). Empty when signed
 *  out. One query, then grouped — never an N+1 across the board. */
async function myStakesByMarket(userId: string | undefined): Promise<Map<string, { up: number; down: number }>> {
  const out = new Map<string, { up: number; down: number }>();
  if (!userId) return out;
  // UPDOWN only — this map powers the card's "you're in" indicator, so it must not
  // pull the player's long-form-poll positions.
  const positions = await listPositionsForUser(userId, 500, "UPDOWN").catch(() => []);
  for (const p of positions) {
    if (p.status !== "OPEN") continue; // only live money on the round counts as "you're in"
    const e = out.get(p.marketId) ?? { up: 0, down: 0 };
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
export async function getBoard(opts?: { assetKey?: string; durationMinutes?: number; userId?: string }): Promise<{
  assets: BoardAsset[];
  activeAsset: BoardAsset | null;
  activeDuration: number | null;
  rounds: BoardRound[];
  recent: Array<"UP" | "DOWN" | "VOID">;
  chainPaused: boolean;
  /** Stake bounds for the ACTIVE chain — the quick-bet stake selector's range. */
  stakeBounds: { min: number; max: number };
}> {
  const cfg = await getUpDownConfig();
  const defaultBounds = { min: cfg.defaultMinStake, max: cfg.defaultMaxStake };
  const [enabled, allChains, mineByMarket] = await Promise.all([
    assetStore.list({ enabledOnly: true }).catch(() => [] as StoredAsset[]),
    chainStore.list().catch(() => [] as StoredChain[]),
    myStakesByMarket(opts?.userId),
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

  const activeAsset = (opts?.assetKey ? assets.find((a) => a.key === opts.assetKey) : undefined) ?? assets[0] ?? null;
  if (!activeAsset) return { assets, activeAsset: null, activeDuration: null, rounds: [], recent: [], chainPaused: false, stakeBounds: defaultBounds };

  const activeDuration =
    (opts?.durationMinutes && activeAsset.durations.includes(opts.durationMinutes) ? opts.durationMinutes : undefined)
    ?? activeAsset.durations[0] ?? null;
  if (activeDuration == null) {
    return { assets, activeAsset, activeDuration: null, rounds: [], recent: [], chainPaused: true, stakeBounds: defaultBounds };
  }

  const chain = allChains.find((c) => c.assetId === activeAsset.id && c.durationMinutes === activeDuration);
  if (!chain) return { assets, activeAsset, activeDuration, rounds: [], recent: [], chainPaused: true, stakeBounds: defaultBounds };

  // ONE resolver, shared with the money path (buyPosition → stakeBoundsForUpDownMarket):
  // the product default is the FLOOR — a chain override may raise the min, never drop it
  // below the platform floor (currently 1,000). What the card shows here is exactly what a
  // bet is validated against, so display and enforcement can never diverge.
  const stakeBounds = await stakeBoundsFor(chain);

  // Newest first, bounded — never an unbounded scan of a table that grows every minute.
  const raw = await roundStore.list({ chainId: chain.id, limit: 24 }).catch(() => []);
  const mapped = (await Promise.all(raw.map((r) => toBoardRound(r, chain, mineByMarket.get(r.marketId))))).filter(Boolean) as BoardRound[];

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

  return { assets, activeAsset, activeDuration, rounds, recent, chainPaused: chain.state !== "RUNNING", stakeBounds };
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
): Promise<{ side: "UP" | "DOWN"; stake: number; payout: number | null; result: "WIN" | "LOSS" | "VOID" | null } | null> {
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
  return { side, stake, payout: anyPayout ? payout : null, result };
}

/** One round, for the detail page — with its settlement proof when it has one. */
export async function getRoundDetail(roundId: string, userId?: string): Promise<{
  round: BoardRound;
  asset: BoardAsset;
  titleEn: string;
  /** Real confirmed price points inside the round window; null ⇒ hero draws open line only. */
  priceSeries: { t: string; price: number }[] | null;
  /** The viewer's own stake/result on this round, or null when they did not play it. */
  myPosition: { side: "UP" | "DOWN"; stake: number; payout: number | null; result: "WIN" | "LOSS" | "VOID" | null } | null;
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
  const board = await toBoardRound(r, chain, mine);
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
  const [priceSeries, myPosition] = await Promise.all([
    priceSeriesFor(a.id, Date.parse(r.opensAt), endMs),
    myPositionFor(userId, r.marketId),
  ]);

  const cfg = await getUpDownConfig();
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
    minStake: chain.minStake ?? cfg.defaultMinStake,
    maxStake: chain.maxStake ?? cfg.defaultMaxStake,
  };
}
