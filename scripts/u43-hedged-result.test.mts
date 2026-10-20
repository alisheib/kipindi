/** A settled hedge has two leg outcomes, even when its total return is a net loss. */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.MARKET_SCHEDULER = "false";
process.env.HOUSE_BOT_ENGINE = "false";
process.env.UPDOWN_SCHEDULER = "false";
process.env.UPDOWN_HEALER = "false";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { hedgedResultIssues } from "./u43-hedged-result-contract.mjs";

const scratch = process.env.VERIFY_DATABASE_URL ?? "";
const database = scratch ? `ud_hedged_${process.pid}_${Date.now()}` : "";
let admin: pg.Client | null = null;
if (scratch) {
  if (process.env.NODE_ENV === "production") throw new Error("Hedge fixture refuses production mode");
  const adminUrl = new URL(scratch);
  if (adminUrl.hostname !== "127.0.0.1" || adminUrl.port !== "5491" || adminUrl.pathname !== "/postgres")
    throw new Error("Hedge fixture requires the reserved loopback scratch database");
  admin = new pg.Client({ connectionString: scratch });
  await admin.connect();
  const directory = (await admin.query<{ setting: string }>(
    "select setting from pg_settings where name = 'data_directory'",
  )).rows[0]?.setting ?? "";
  const normal = (path: string) => resolve(path).replace(/\\/g, "/").toLowerCase();
  if (normal(directory) !== normal(resolve(process.cwd(), ".pgscratch"))) {
    await admin.end();
    throw new Error("Hedge fixture refuses a scratch cluster from another checkout");
  }
  const target = new URL(scratch);
  target.pathname = `/${database}`;
  target.search = "";
  try {
    await admin.query(`CREATE DATABASE "${database}"`);
    process.env.DATABASE_URL = target.toString();
    process.env.USE_PRISMA_DAL = "true";
    execFileSync("npx", ["prisma", "migrate", "deploy"], {
      env: process.env, stdio: "pipe", shell: process.platform === "win32",
    });
  } catch {
    try { await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`); }
    finally { await admin.end(); }
    admin = null;
    throw new Error("Hedge fixture could not migrate its disposable database");
  }
} else {
  // The default guard must remain in memory even when a machine has a saved DB variable.
  process.env.DATABASE_URL = "";
  process.env.USE_PRISMA_DAL = "false";
}

try {
const { db } = await import("../src/lib/server/store.ts");
const { buyPosition, cashOutPosition, listPositionsForMarket, settleMarket } = await import("../src/lib/server/market-service.ts");
const { getBoard, getRoundDetail, getMyUpDownHistory } = await import("../src/lib/server/updown-board.ts");
const { roundAnnouncementFor, validRealizedPayout } = await import("../src/lib/updown-result-truth.ts");
const { marketStore, positionStore } = await import("../src/lib/server/market-dal.ts");
const { createAsset, setAssetEnabled, createChain, setChainState, __resetUpDownConfig } = await import("../src/lib/server/updown-config.ts");
const { chainStore, observationStore, roundStore, __resetUpDownMemoryStores } = await import("../src/lib/server/updown-dal.ts");
const { openRound, closeRound, settlementNote } = await import("../src/lib/server/updown-service.ts");
const { seedDefaultSources, addSource } = await import("../src/lib/server/source-registry.ts");
await import("./lib/verified-fixtures.mts");

__resetUpDownMemoryStores();
__resetUpDownConfig();
await seedDefaultSources();
try { await addSource({ domain: "kitco.com", label: "Kitco", category: "crypto", rationale: "test fixture", addedBy: "system" }); }
catch { /* Already in this test process. */ }

let nextPhone = 1;
async function funded(id: string): Promise<string> {
  const now = new Date().toISOString();
  await db.user.create({
    id, phoneE164: `+25596${String(nextPhone++).padStart(7, "0")}`,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: null,
    region: null, acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null, createdAt: now, updatedAt: now,
    lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 1_000_000, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now,
  } as never);
  return id;
}

const hedger = await funded("hr_hedger");
const upOnly = await funded("hr_up");
const downOnly = await funded("hr_down");
const refundOnly = await funded("hr_refund");
const voidHedger = await funded("hr_void_hedger");
const cashoutHolder = await funded("hr_cashout");
const pendingHolder = await funded("hr_pending");
const asset = await createAsset({
  key: "HRBTC", symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto",
  priceSourceUrl: "https://www.kitco.com/price/precious-metals", category: "crypto",
  decimals: 2, minMoveTicks: 2,
}, "off");
assert.equal(asset.ok, true, "test asset must be created");
if (!asset.ok) throw new Error(asset.error);
await setAssetEnabled(asset.data.id, true, "off");

async function round(durationMinutes: number, opening: string, roundAsset: typeof asset.data = asset.data, openingPrice: number | null = 2400) {
  const created = await createChain({ assetId: roundAsset.id, durationMinutes }, "off");
  assert.equal(created.ok, true, "test chain must be created");
  if (!created.ok) throw new Error(created.error);
  await setChainState(created.data.id, "RUNNING", "off");
  const chain = await chainStore.get(created.data.id);
  assert.ok(chain, "test chain must be readable");
  let observationId: string | null = null;
  if (openingPrice != null) {
    const observation = await observationStore.ensure(roundAsset.id, opening);
    await observationStore.confirm(observation.id, {
      price: openingPrice, sourceUrl: roundAsset.priceSourceUrl, sourceQuotedAt: opening,
      evidence: "open", confidence: 95, model: "t", rawHash: `hr-open-${durationMinutes}`,
    });
    observationId = observation.id;
  }
  const made = await openRound(chain, opening, observationId, openingPrice);
  assert.equal(made.ok, true, "test round must open");
  if (!made.ok) throw new Error(made.error);
  return made.data;
}

async function bet(userId: string, marketId: string, side: "YES" | "NO", stake: number) {
  const placed = await buyPosition(userId, {
    marketId, side, stake, idempotencyKey: `hr-${userId}-${marketId}-${side}-${stake}`,
  });
  assert.equal(placed.ok, true, `test ${side} stake must be accepted`);
  if (!placed.ok) throw new Error(placed.error);
  return placed.data.positionId;
}

async function settleUp(roundId: string, marketId: string, closing: string, roundAsset: typeof asset.data = asset.data) {
  await marketStore.stamp(marketId, { selectionClosedAt: new Date(Date.now() - 1_000).toISOString() });
  const observation = await observationStore.ensure(roundAsset.id, closing);
  await observationStore.confirm(observation.id, {
    price: 2600, sourceUrl: roundAsset.priceSourceUrl, sourceQuotedAt: closing,
    evidence: "close", confidence: 95, model: "t", rawHash: `hr-close-${roundId}`,
  });
  const closed = await closeRound(roundId, observation.id, 2600);
  assert.equal(closed.ok, true, "test round must settle");
  if (closed.ok) assert.equal(closed.data.outcome, "UP", "test price must choose UP");
}

const firstOpen = new Date(Date.now() - 2 * 60_000).toISOString();
const first = await round(5, firstOpen);
await bet(hedger, first.marketId, "YES", 2_000);
await bet(hedger, first.marketId, "NO", 18_000);
await bet(upOnly, first.marketId, "YES", 20_000);
await bet(downOnly, first.marketId, "NO", 2_000);
await settleUp(first.id, first.marketId, first.closesAt);

const stored = (await listPositionsForMarket(first.marketId)).filter((position) => position.userId === hedger);
assert.equal(stored.length, 2, "hedger must own exactly two legs");
assert.deepEqual(new Set(stored.map((position) => position.status)), new Set(["WIN", "LOSS"]),
  "settlement must store distinct outcomes; a uniform fixture proves nothing");
const stake = stored.reduce((sum, position) => sum + position.stake, 0);
const payout = stored.reduce((sum, position) => sum + (position.finalPayout ?? 0), 0);
assert.equal(stake, 20_000);
assert.ok(payout > 0 && payout < stake,
  `fixture must be a net losing hedge with a winning leg; payout ${payout}, stake ${stake}`);

const hedge = (await getRoundDetail(first.id, hedger))?.myPosition;
assert.ok(hedge, "settled hedger detail must exist");
assert.equal(hedge.hedged, true);
assert.equal(hedge.stake, stake);
assert.equal(hedge.payout, payout, "headline amount must be the stored aggregate payout");
assert.equal(hedge.result, "MIXED", "a WIN leg must not turn a net losing hedge into a WIN headline");
assert.deepEqual(new Set(hedge.items.map((item) => item.status)), new Set(["WIN", "LOSS"]));
const hedgeRound = (await getRoundDetail(first.id, hedger))?.round;
assert.ok(hedgeRound?.settled && hedgeRound.settledAtMs != null, "money stamp must be present after payout");
assert.deepEqual(roundAnnouncementFor(hedgeRound.myResults, hedgeRound.settled), {
  status: "MIXED", side: null, stake, payout,
}, "two-sided net-loss must announce factual totals, never a WIN seal");
const boardHedge = (await getBoard({ assetKey: "HRBTC", durationMinutes: 5, userId: hedger })).rounds
  .find((item) => item.roundId === first.id);
assert.ok(boardHedge, "settled hedge must be visible on board");
assert.deepEqual(roundAnnouncementFor(boardHedge.myResults, boardHedge.settled),
  roundAnnouncementFor(hedgeRound.myResults, hedgeRound.settled),
  "board and detail must announce the same combined result");

// A legacy or malformed terminal row can retain a null payout even with the
// market's settledAt stamp. Preserve the status, but never silently drop that
// leg and promote the paid WIN leg to an unqualified win or partial paid total.
const storedLoss = stored.find((position) => position.status === "LOSS")!;
await positionStore.set({ ...storedLoss, finalPayout: null });
const incompleteBoard = (await getBoard({ assetKey: "HRBTC", durationMinutes: 5, userId: hedger })).rounds
  .find((item) => item.roundId === first.id)!;
assert.equal(incompleteBoard.myResults.length, 2, "missing-payout leg must stay in the board result");
assert.deepEqual(new Set(incompleteBoard.myResults.map((row) => row.status)), new Set(["WIN", "LOSS"]));
assert.equal(incompleteBoard.myResults.find((row) => row.status === "LOSS")?.payout, null);
assert.equal(roundAnnouncementFor(incompleteBoard.myResults, incompleteBoard.settled), null,
  "a terminal row with no payout must not announce a false WIN or partial total");
const incompleteDetail = (await getRoundDetail(first.id, hedger))!;
assert.equal(incompleteDetail.myPosition?.incompletePayout, true);
assert.equal(incompleteDetail.myPosition?.result, null, "incomplete money cannot earn a WIN seal");
assert.equal(incompleteDetail.myPosition?.payout, null, "partial payout must not be printed as total");
assert.equal(incompleteDetail.myPosition?.items.find((row) => row.status === "LOSS")?.payout, null,
  "the item's missing payout stays visibly unavailable");
await positionStore.set(storedLoss);
for (const malformed of [
  { status: "WIN" as const, stake: -1, payout: 2_000 },
  { status: "WIN" as const, stake: 2_000, payout: 1_999 },
  { status: "LOSS" as const, stake: 2_000, payout: -1 },
  { status: "LOSS" as const, stake: 2_000, payout: 1 },
  { status: "VOID" as const, stake: 2_000, payout: 1_999 },
  { status: "VOID" as const, stake: 2_000, payout: 2_000.5 },
  { status: "OPEN" as const, stake: 2_000, payout: null },
]) {
  assert.equal(validRealizedPayout(malformed), false, "invalid terminal money must not become a paid result");
  assert.equal(roundAnnouncementFor([{ ...malformed, side: "UP" }], true), null,
    "a malformed row cannot earn a result announcement");
}
await positionStore.set({ ...storedLoss, finalPayout: -1 });
const negativeBoard = (await getBoard({ assetKey: "HRBTC", durationMinutes: 5, userId: hedger })).rounds
  .find((item) => item.roundId === first.id)!;
assert.equal(negativeBoard.myResults.find((row) => row.status === "LOSS")?.payout, null,
  "negative stored payout must be unavailable on board");
assert.equal(roundAnnouncementFor(negativeBoard.myResults, negativeBoard.settled), null);
assert.equal((await getRoundDetail(first.id, hedger))?.myPosition?.result, null,
  "negative stored payout cannot leave a WIN seal on detail");
await positionStore.set(storedLoss);
// A settled market with one still-OPEN position is a corrupt/partial money state.
// It must carry the held stake through the board read, or its WIN leg alone
// would be celebrated and the detail panel could look like the whole payout.
await positionStore.set({ ...storedLoss, status: "OPEN", finalPayout: null });
const heldBoard = (await getBoard({ assetKey: "HRBTC", durationMinutes: 5, userId: hedger })).rounds
  .find((item) => item.roundId === first.id)!;
assert.equal(heldBoard.settled, true);
assert.equal(heldBoard.myResults.find((row) => row.status === "OPEN")?.stake, storedLoss.stake,
  "settled market's still-OPEN row must remain in the board aggregate");
assert.equal(roundAnnouncementFor(heldBoard.myResults, heldBoard.settled), null,
  "a settled market with held money must not announce its paid WIN leg alone");
const heldDetail = (await getRoundDetail(first.id, hedger))!;
assert.equal(heldDetail.myPosition?.incompletePayout, true,
  "detail must treat a settled market's OPEN row as incomplete money");
assert.equal(heldDetail.myPosition?.result, null);
assert.equal(heldDetail.myPosition?.payout, null);
assert.equal(heldDetail.myPosition?.items.find((row) => row.status === "OPEN")?.payout, null);
await positionStore.set(storedLoss);

const winner = (await getRoundDetail(first.id, upOnly))?.myPosition;
const loser = (await getRoundDetail(first.id, downOnly))?.myPosition;
assert.equal(winner?.result, "WIN", "one-sided winner stays WIN");
assert.equal(loser?.result, "LOSS", "one-sided loser stays LOSS");

const secondOpen = new Date(Date.now() - 3 * 60_000).toISOString();
const second = await round(15, secondOpen);
await bet(refundOnly, second.marketId, "YES", 4_000);
await settleUp(second.id, second.marketId, second.closesAt);
const refunded = (await getRoundDetail(second.id, refundOnly))?.myPosition;
assert.ok(refunded, "refunded holder detail must exist");
assert.equal(refunded.items.length, 1);
assert.equal(refunded.items[0].status, "VOID", "one-sided settlement must return the stake");
assert.equal(refunded.result, "VOID", "all-VOID positions must not be labelled MIXED");

const voidRound = await round(10, new Date(Date.now() - 2 * 60_000).toISOString());
await bet(voidHedger, voidRound.marketId, "YES", 3_000);
await bet(voidHedger, voidRound.marketId, "NO", 5_000);
await marketStore.stamp(voidRound.marketId, { selectionClosedAt: new Date(Date.now() - 1_000).toISOString() });
const voidObservation = await observationStore.ensure(asset.data.id, voidRound.closesAt);
await observationStore.confirm(voidObservation.id, {
  price: 2400, sourceUrl: asset.data.priceSourceUrl, sourceQuotedAt: voidRound.closesAt,
  evidence: "close", confidence: 95, model: "t", rawHash: `hr-void-${voidRound.id}`,
});
const voidClose = await closeRound(voidRound.id, voidObservation.id, 2400);
assert.equal(voidClose.ok, true, "flat price must void the round");
if (voidClose.ok) assert.equal(voidClose.data.outcome, "VOID");
const bothVoid = (await getRoundDetail(voidRound.id, voidHedger))!;
assert.deepEqual(new Set(bothVoid.myPosition?.items.map((item) => item.status)), new Set(["VOID"]));
assert.deepEqual(roundAnnouncementFor(bothVoid.round.myResults, bothVoid.round.settled), {
  status: "VOID", side: null, stake: 8_000, payout: 8_000,
}, "both-side all-VOID is one full-stake refund, not a mixed loss");
const voidRows = (await listPositionsForMarket(voidRound.marketId)).filter((position) => position.userId === voidHedger);
assert.equal(voidRows.length, 2);
await positionStore.set({ ...voidRows[0], finalPayout: voidRows[0].stake - 1 });
const mismatchedVoid = (await getRoundDetail(voidRound.id, voidHedger))!;
assert.equal(mismatchedVoid.myPosition?.incompletePayout, true);
assert.equal(mismatchedVoid.myPosition?.result, null, "partial full refund cannot receive a VOID result seal");
assert.equal(mismatchedVoid.myPosition?.payout, null, "one valid VOID leg is not a whole-round payout");
assert.equal(mismatchedVoid.myPosition?.items.find((item) => item.id === voidRows[0].id)?.payout, null);
assert.equal(roundAnnouncementFor(mismatchedVoid.round.myResults, mismatchedVoid.round.settled), null,
  "recorded VOID payout below stake cannot announce a full refund");
const mismatchedVoidBoard = (await getBoard({ assetKey: "HRBTC", durationMinutes: 10, userId: voidHedger })).rounds
  .find((item) => item.roundId === voidRound.id)!;
assert.equal(mismatchedVoidBoard.myResults.find((item) => item.payout == null)?.status, "VOID");
assert.equal(roundAnnouncementFor(mismatchedVoidBoard.myResults, mismatchedVoidBoard.settled), null);
await positionStore.set(voidRows[0]);

const exitRound = await round(60, new Date(Date.now() - 1 * 60_000).toISOString());
const soldPositionId = await bet(cashoutHolder, exitRound.marketId, "YES", 4_000);
const sold = await cashOutPosition(cashoutHolder, soldPositionId);
assert.equal(sold.ok, true, "test exit must be a real paid cash-out");
await bet(cashoutHolder, exitRound.marketId, "YES", 2_000);
await bet(downOnly, exitRound.marketId, "NO", 18_000);
await settleUp(exitRound.id, exitRound.marketId, exitRound.closesAt);
const exited = (await getRoundDetail(exitRound.id, cashoutHolder))!;
assert.deepEqual(new Set(exited.myPosition?.items.map((item) => item.status)), new Set(["WIN", "CASHED_OUT"]),
  "real cash-out and final winner must both reach the viewer");
assert.equal(exited.myPosition?.result, "MIXED", "cash-out plus win is not one unqualified WIN");
const exitedEvent = roundAnnouncementFor(exited.round.myResults, exited.round.settled);
assert.equal(exitedEvent?.status, "MIXED", "cash-out plus win must not trigger the gold seal");
assert.equal(exitedEvent?.stake, exited.myPosition?.stake);
assert.equal(exitedEvent?.payout, exited.myPosition?.payout);

const pendingRound = await round(30, new Date(Date.now() - 1 * 60_000).toISOString());
await bet(pendingHolder, pendingRound.marketId, "YES", 2_000);
await bet(downOnly, pendingRound.marketId, "NO", 4_000);
// `closeRound` commits this verdict before calling `settleMarket`; a standing objection
// can then leave the price decided with OPEN money. `settlement-gate.test.mts` proves the
// real objection refusal. Materialise that persisted intermediate state here so this guard
// tests its player read model, then let the real settlement path make the final transition.
const verdictAt = new Date(Date.now() - 30_000).toISOString();
await marketStore.stamp(pendingRound.marketId, {
  status: "RESOLVED", resolvedOutcome: "YES", objectionsClosedAt: verdictAt,
});
await roundStore.patch(pendingRound.id, { outcome: "UP", closePrice: 2600, resolvedAt: verdictAt });
const unpaid = (await getRoundDetail(pendingRound.id, pendingHolder))!;
assert.equal(unpaid.round.state, "resolved", "price verdict must remain visible");
assert.equal(unpaid.round.settled, false, "price verdict must not claim payment settled");
assert.equal(unpaid.round.settledAtMs, null);
assert.equal(unpaid.myPosition?.items[0].status, "OPEN", "money has not moved yet");
assert.equal(roundAnnouncementFor(unpaid.round.myResults, unpaid.round.settled), null,
  "no result event before market payout commits");
// A source-failed VOID has no confirmed close price. Its OPEN stake is still held
// until the same settlement transaction refunds it, so pending copy must not
// claim the price was confirmed or that money has returned.
const oneSideAsset = await createAsset({
  key: "HRETH", symbol: "ETH/USD", nameEn: "Ether", nameSw: "Ether", iconKey: "crypto",
  priceSourceUrl: "https://www.kitco.com/price/precious-metals", category: "crypto",
  decimals: 2, minMoveTicks: 2,
}, "off");
assert.equal(oneSideAsset.ok, true, "second asset gives pending cases their own allowed chains");
if (!oneSideAsset.ok) throw new Error(oneSideAsset.error);
await setAssetEnabled(oneSideAsset.data.id, true, "off");
// Selling every leg removes the active pool, but the market still records that
// players bet and received real cash-out money. A later price verdict or VOID
// must never tell them that nobody placed a bet or that every stake was refunded.
const noPoolRound = await round(15, new Date(Date.now() - 1 * 60_000).toISOString(), oneSideAsset.data);
const noPoolId = await bet(cashoutHolder, noPoolRound.marketId, "YES", 4_000);
assert.equal((await cashOutPosition(cashoutHolder, noPoolId)).ok, true);
const noPoolMarket = await marketStore.get(noPoolRound.marketId);
assert.equal(noPoolMarket?.yesPool, 0);
assert.equal(noPoolMarket?.noPool, 0);
assert.ok((noPoolMarket?.predictorCount ?? 0) > 0);
await settleUp(noPoolRound.id, noPoolRound.marketId, noPoolRound.closesAt, oneSideAsset.data);
const noPoolDetail = (await getRoundDetail(noPoolRound.id, cashoutHolder))!;
assert.equal(noPoolDetail.round.state, "resolved");
assert.equal(noPoolDetail.round.players > 0, true);
assert.equal(noPoolDetail.round.pricing.upPool + noPoolDetail.round.pricing.downPool, 0);
assert.equal(noPoolDetail.myPosition?.items[0].status, "CASHED_OUT");
assert.ok((noPoolDetail.myPosition?.items[0].payout ?? 0) > 0);

const noPoolVoidRound = await round(30, new Date(Date.now() - 1 * 60_000).toISOString(), oneSideAsset.data);
const noPoolVoidId = await bet(cashoutHolder, noPoolVoidRound.marketId, "YES", 4_000);
assert.equal((await cashOutPosition(cashoutHolder, noPoolVoidId)).ok, true);
await marketStore.stamp(noPoolVoidRound.marketId, { selectionClosedAt: new Date(Date.now() - 1_000).toISOString() });
const noPoolVoidRead = await observationStore.ensure(oneSideAsset.data.id, noPoolVoidRound.closesAt);
await observationStore.confirm(noPoolVoidRead.id, {
  price: 2400, sourceUrl: oneSideAsset.data.priceSourceUrl, sourceQuotedAt: noPoolVoidRound.closesAt,
  evidence: "flat close", confidence: 95, model: "t", rawHash: `hr-no-pool-void-${noPoolVoidRound.id}`,
});
assert.equal((await closeRound(noPoolVoidRound.id, noPoolVoidRead.id, 2400)).ok, true);
const noPoolVoidDetail = (await getRoundDetail(noPoolVoidRound.id, cashoutHolder))!;
assert.equal(noPoolVoidDetail.round.state, "void");
assert.equal(noPoolVoidDetail.round.players > 0, true);
assert.equal(noPoolVoidDetail.round.pricing.upPool + noPoolVoidDetail.round.pricing.downPool, 0);
assert.equal(noPoolVoidDetail.myPosition?.items[0].status, "CASHED_OUT");
assert.ok((noPoolVoidDetail.myPosition?.items[0].payout ?? 0) > 0);
const noPoolVoidMarket = await marketStore.get(noPoolVoidRound.marketId);
assert.ok(noPoolVoidMarket, "cash-out then VOID market must remain readable");
const dueTerms = "Stakes still held are due full return when settlement commits; earlier cash-outs keep their paid amount.";
assert.ok(noPoolVoidMarket.resolutionEvidence?.includes(dueTerms),
  "permanent VOID evidence must not erase an earlier paid cash-out or claim an unpaid refund");
assert.ok(settlementNote("VOID", "no-move", noPoolVoidRound.openObservationId, noPoolVoidRead.id).includes(dueTerms),
  "append-only compliance note must describe remaining stakes and the payment gate");
assert.ok(noPoolVoidMarket.resolutionCriterion.includes("Stakes still held are returned in full when settlement completes; earlier cash-outs keep their paid amount."),
  "the round's stored player terms must describe the same cash-out exception");

// A missing opening observation uses the simple comparison terms instead of
// frozen targets. Both stored-term branches must preserve already-paid exits.
const noOpenPriceRound = await round(10, new Date(Date.now() - 1 * 60_000).toISOString(), oneSideAsset.data, null);
assert.equal(noOpenPriceRound.openPrice, null, "simple terms require a genuinely unconfirmed opening price");
const noOpenPriceMarket = await marketStore.get(noOpenPriceRound.marketId);
assert.ok(noOpenPriceMarket, "simple-terms market must be readable");
assert.ok(noOpenPriceMarket.resolutionCriterion.includes("compared with the price at"),
  "the no-opening-price market must use the simple comparison terms");
assert.ok(noOpenPriceMarket.resolutionCriterion.includes("Stakes still held are returned in full when settlement completes; earlier cash-outs keep their paid amount."),
  "the round's stored player terms must describe the same cash-out exception");

const voidPendingRound = await round(60, new Date(Date.now() - 1 * 60_000).toISOString(), oneSideAsset.data);
await bet(pendingHolder, voidPendingRound.marketId, "YES", 3_000);
const preVoidCashoutId = await bet(cashoutHolder, voidPendingRound.marketId, "YES", 1_000);
const preVoidCashout = await cashOutPosition(cashoutHolder, preVoidCashoutId);
assert.equal(preVoidCashout.ok, true,
  `a cashed-out viewer has an already-paid leg before the held VOID: ${preVoidCashout.ok ? "ok" : preVoidCashout.error}`);
await bet(cashoutHolder, voidPendingRound.marketId, "YES", 2_000);
await marketStore.stamp(voidPendingRound.marketId, {
  status: "VOIDED", resolvedOutcome: "VOID", objectionsClosedAt: verdictAt,
});
await roundStore.patch(voidPendingRound.id, {
  outcome: "VOID", voidReason: "source-failed", closePrice: null, resolvedAt: verdictAt,
});
const unpaidVoid = (await getRoundDetail(voidPendingRound.id, pendingHolder))!;
assert.equal(unpaidVoid.round.state, "void");
assert.equal(unpaidVoid.round.closePrice, null);
assert.equal(unpaidVoid.round.settled, false);
assert.equal(unpaidVoid.myPosition?.items[0].status, "OPEN");
assert.equal(unpaidVoid.myPosition?.items[0].stake, 3_000);
assert.equal(roundAnnouncementFor(unpaidVoid.round.myResults, unpaidVoid.round.settled), null);
const cashedUnpaidVoid = (await getRoundDetail(voidPendingRound.id, cashoutHolder))!;
assert.equal(cashedUnpaidVoid.round.settled, false);
assert.equal(cashedUnpaidVoid.myPosition?.result, null, "the holder's remaining OPEN leg has no result yet");
assert.deepEqual(new Set(cashedUnpaidVoid.myPosition?.items.map((item) => item.status)),
  new Set(["CASHED_OUT", "OPEN"]));
assert.ok((cashedUnpaidVoid.myPosition?.items.find((item) => item.status === "CASHED_OUT")?.payout ?? 0) > 0,
  "the earlier cash-out has its own realised payout, separate from the held stake");
const oneSidePendingRound = await round(5, new Date(Date.now() - 1 * 60_000).toISOString(), oneSideAsset.data);
await bet(pendingHolder, oneSidePendingRound.marketId, "YES", 5_000);
await marketStore.stamp(oneSidePendingRound.marketId, {
  status: "RESOLVED", resolvedOutcome: "YES", objectionsClosedAt: verdictAt,
});
await roundStore.patch(oneSidePendingRound.id, { outcome: "UP", closePrice: 2600, resolvedAt: verdictAt });
const unpaidOneSide = (await getRoundDetail(oneSidePendingRound.id, pendingHolder))!;
assert.equal(unpaidOneSide.round.state, "resolved");
assert.equal(unpaidOneSide.round.pricing.upPool, 5_000);
assert.equal(unpaidOneSide.round.pricing.downPool, 0);
assert.equal(unpaidOneSide.round.settled, false);
assert.equal(unpaidOneSide.myPosition?.items[0].status, "OPEN");
assert.equal(unpaidOneSide.myPosition?.items[0].stake, 5_000);
// A legacy upheld objection can leave the round's first verdict stamped UP
// while the market (which determines actual payout) has been corrected DOWN.
// This fixture isolates the read model; the real officer transition is covered
// by the objection money suite. The recorded price/targets remain original.
await marketStore.stamp(oneSidePendingRound.marketId, { resolvedOutcome: "NO" });
const legacyCorrected = (await getRoundDetail(oneSidePendingRound.id, pendingHolder))!;
assert.equal((await roundStore.get(oneSidePendingRound.id))?.outcome, "UP");
assert.equal(legacyCorrected.round.outcome, "DOWN", "detail must use money market's verdict, not stale round stamp");
assert.equal(legacyCorrected.round.state, "resolved");
assert.equal(legacyCorrected.round.correctionKind, "record");
assert.equal(legacyCorrected.round.closePrice, 2600, "review cannot rewrite an observed price");
const correctedBoard = await getBoard({ assetKey: oneSideAsset.data.key, durationMinutes: 5, userId: pendingHolder });
assert.equal(correctedBoard.rounds.find((item) => item.roundId === oneSidePendingRound.id)?.outcome, "DOWN",
  "board and detail must show the same corrected money verdict");
assert.equal((await getMyUpDownHistory(pendingHolder)).find((item) => item.roundId === oneSidePendingRound.id)?.outcome, "DOWN",
  "player history reader must use the corrected money verdict, not the stale round stamp");
await marketStore.stamp(oneSidePendingRound.marketId, {
  resolutionEvidence: "UPDOWN_OFFICER_CORRECTION: officer upheld an objection; original price evidence preserved.",
});
assert.equal((await getRoundDetail(oneSidePendingRound.id, pendingHolder))?.round.correctionKind, "objection",
  "new officer correction marker must select the specific public cue");
const paid = await settleMarket(pendingRound.marketId, { actorId: "system_updown" });
assert.equal(paid.ok, true, "pending fixture must really settle through the money path");
const paidRound = (await getRoundDetail(pendingRound.id, pendingHolder))!;
const paidMarket = await marketStore.get(pendingRound.marketId);
assert.equal(paidRound.round.settled, true);
assert.equal(paidRound.round.settledAtMs, Date.parse(paidMarket!.settledAt!),
  "event time must be the money transaction, not the earlier price verdict");
assert.equal(roundAnnouncementFor(paidRound.round.myResults, paidRound.round.settled)?.status, "WIN");

const updownSource = readFileSync("src/lib/server/updown-service.ts", "utf8");
const marketSource = readFileSync("src/lib/server/market-service.ts", "utf8");
assert.ok(updownSource.includes('"and stakes still held are due full return when settlement commits; earlier cash-outs keep their paid amount. The "'),
  "the healer's permanent audit note must not call earlier cash-outs refunds");
assert.ok(marketSource.includes("ONE-SIDED — no opposing pool. Stakes still held are due full return when settlement commits; earlier cash-outs keep their paid amount."),
  "one-sided admin audit must describe remaining stakes without inventing payment");

assert.deepEqual(hedgedResultIssues({
  detail: readFileSync("src/app/updown/[roundId]/page.tsx", "utf8"),
  card: readFileSync("src/components/updown/updown-card.tsx", "utf8"),
  boardPage: readFileSync("src/app/updown/page.tsx", "utf8"),
  announcer: readFileSync("src/components/updown/updown-result-announcer.tsx", "utf8"),
  countdown: readFileSync("src/components/updown/round-countdown.tsx", "utf8"),
  dictionary: readFileSync("src/lib/i18n-dict.ts", "utf8"),
  marketCard: readFileSync("src/components/markets/market-card.tsx", "utf8"),
  resolutionPanel: readFileSync("src/components/markets/resolution-panel.tsx", "utf8"),
}), [], "detail and card must render the mixed money result truthfully");

console.log(`U43 result truth: hedge, both-side VOID, cash-out plus win, and payment-pending transition passed (hedge stake ${stake}, paid ${payout})`);
} finally {
  if (admin) {
    try { await (await import("../src/lib/server/prisma.ts")).prisma()?.$disconnect(); }
    catch { /* No pooled connection to close after a failed fixture. */ }
    try { await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`); }
    finally { await admin.end(); }
  }
}
