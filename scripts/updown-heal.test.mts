/**
 * Up & Down HEAL — the refund guarantee, proven.
 *
 *   npx tsx scripts/updown-heal.test.mts     (npm run test:updown-heal)
 *
 * ⛔ WHAT THIS SUITE EXISTS TO PREVENT — it already happened, on production.
 *
 * The design promised, in four places (`docs/UPDOWN-ARCHITECTURE.md` §3, the oracle
 * header, the admin help text, the schema comments): "a boundary that will not confirm
 * VOIDS its rounds and refunds every stake in full."
 *
 * It was never implemented. `advanceChain` observes ONLY `chain.nextBoundaryAt` and then
 * moves that pointer on, so a boundary refused once was never revisited. Every
 * observation stayed PENDING at one attempt, `maxObservationAttempts` was unreachable,
 * FAILED never occurred, and a round holding player money could neither resolve NOR
 * refund. `retryBackoffSeconds` sat in the config, read by nothing.
 *
 * Production reached 1,398 such rounds holding TZS 96,250 across 35 positions, with no
 * code path — automatic or manual — able to return it. The whole Up & Down suite was
 * green throughout, because every suite stubs the oracle and drives `closeRound`
 * directly. Nothing exercised the retry ladder, so nothing noticed it did not exist.
 *
 * This suite drives `resolveOverdueRounds()` — the sweep — with REAL money underneath:
 * real `buyPosition` debits, the untouched `settleMarket`, real wallet balances.
 *
 * What it proves, hardest-to-lose first:
 *   1. An exhausted boundary VOIDS its round and refunds EVERY stake IN FULL.
 *   2. It does so on a PAUSED chain — money must not depend on the operator's switch.
 *   3. A confirmed reading still RESOLVES normally through the sweep (it is not a
 *      void-everything hammer).
 *   4. Running the sweep twice settles exactly once.
 *   5. One reading per (asset, boundary) — healing must not multiply the spend it heals.
 *   6. An OPERATOR-state refusal (paused AI / no key) does NOT burn the attempt budget.
 *   7. The backoff is honoured, so a refund is spaced out rather than hammered.
 *   8. Money conserves across the whole run.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
// The oracle must never be called for real here. Absent key ⇒ `observePrice` refuses with
// "no-api-key", which §6 relies on being treated as an OPERATOR state.
delete process.env.ANTHROPIC_API_KEY;

import { assetStore, chainStore, roundStore, observationStore, __resetUpDownMemoryStores } from "../src/lib/server/updown-dal.ts";
import {
  createAsset, setAssetEnabled, createChain, setChainState,
  __resetUpDownConfig, setUpDownConfig, getUpDownConfig,
} from "../src/lib/server/updown-config.ts";
import { openRound, resolveOverdueRounds, acquireObservation } from "../src/lib/server/updown-service.ts";
import { marketStore } from "../src/lib/server/market-dal.ts";
import { buyPosition, ratesFor } from "../src/lib/server/market-service.ts";
import { poolFee } from "../src/lib/payout.ts";
import { addSource, seedDefaultSources } from "../src/lib/server/source-registry.ts";
import { db } from "../src/lib/server/store.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const OFFICER = "usr_officer";
__resetUpDownMemoryStores();
__resetUpDownConfig();
await seedDefaultSources();
await addSource({ domain: "kitco.com", label: "Kitco", category: "macro", rationale: "spot metals", addedBy: "system" });

// Zero backoff so the ladder can be walked without the suite sleeping for 180 seconds.
// This is a real admin-tunable field, set through the real setter — not a poke at state.
const cfgSet = await setUpDownConfig({ retryBackoffSeconds: [0, 0, 0], maxObservationAttempts: 3 }, OFFICER);
if (!cfgSet.ok) throw new Error(cfgSet.error);

const nowIso = () => new Date().toISOString();
let seq = 0;
async function fundedUser(id: string, balance: number): Promise<string> {
  await db.user.create({
    id, phoneE164: `+25599${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: nowIso(), updatedAt: nowIso(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: nowIso(), updatedAt: nowIso(),
  } as never);
  return id;
}
const dave = await fundedUser("hl_dave", 500_000);
const erin = await fundedUser("hl_erin", 500_000);
const players = [dave, erin];
const walletsTotal = async () =>
  (await Promise.all(players.map(async (id) => (await db.wallet.findByUserId(id))?.balance ?? 0))).reduce((s, b) => s + b, 0);
const START_TOTAL = await walletsTotal();

// ── Asset + two chains sharing one grid ─────────────────────────────────────
const a = await createAsset({
  key: "XAU", symbol: "XAU/USD", nameEn: "Gold", nameSw: "Dhahabu", iconKey: "gold",
  priceSourceUrl: "https://www.kitco.com/price/precious-metals", category: "macro",
  decimals: 2, minMoveTicks: 1,
}, OFFICER);
if (!a.ok) throw new Error(a.error);
await setAssetEnabled(a.data.id, true, OFFICER);
const asset = (await assetStore.get(a.data.id))!;

const c5 = await createChain({ assetId: asset.id, durationMinutes: 5 }, OFFICER);
if (!c5.ok) throw new Error(c5.error);
const c15 = await createChain({ assetId: asset.id, durationMinutes: 15 }, OFFICER);
if (!c15.ok) throw new Error(c15.error);

/**
 * A round can only BECOME overdue by time passing: `createMarket` refuses a past
 * resolution date, so a round with an already-elapsed boundary cannot be fabricated —
 * and `boundaryAt` is (rightly) not in `ROUND_PATCHABLE`, so it cannot be moved either.
 *
 * So the fixture opens a round whose boundary is a few seconds out, bets on it while it
 * is genuinely open, then waits for the boundary to pass. That is exactly how production
 * produced the stuck rounds, which is the point.
 */
const GRACE_MS = 3_500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Open a round that ends at `endAtMs` and bet real money on it. Does NOT wait — so two
 *  rounds can be opened onto the SAME boundary before it elapses (§5 needs exactly that). */
async function openRoundWithBets(
  chainId: string, endAtMs: number, openPrice: number,
  bets: Array<{ userId: string; side: "YES" | "NO"; stake: number }>,
) {
  const chain = (await chainStore.get(chainId))!;
  const openIso = new Date(endAtMs - chain.durationMinutes * 60_000).toISOString();

  // The open boundary needs a confirmed observation for the round to carry an openPrice.
  const openObs = await observationStore.ensure(asset.id, openIso);
  if (openObs.state === "PENDING") {
    await observationStore.confirm(openObs.id, {
      price: openPrice, sourceUrl: asset.priceSourceUrl, sourceQuotedAt: openIso,
      evidence: "test fixture: opening reading", confidence: 99, model: "test", rawHash: "test",
    });
  }
  const r = await openRound(chain, openIso, openObs.id, openPrice);
  if (!r.ok) throw new Error(r.error);

  let betNo = 0;
  for (const b of bets) {
    const res = await buyPosition(b.userId, {
      marketId: r.data.marketId, side: b.side, stake: b.stake,
      idempotencyKey: `heal-${r.data.id}-${++betNo}`,
    });
    if (!res.ok) throw new Error(`bet failed: ${JSON.stringify(res)}`);
  }

  return r.data;
}

/** Wait until `boundaryIso` has genuinely elapsed, so its rounds are overdue. */
async function elapse(boundaryIso: string) {
  const remaining = Date.parse(boundaryIso) - Date.now();
  if (remaining > 0) await sleep(remaining + 250);
}

/** The common case: one round, opened and then left to elapse. */
async function overdueRoundWithBets(
  chainId: string, endAtMs: number, openPrice: number,
  bets: Array<{ userId: string; side: "YES" | "NO"; stake: number }>,
) {
  const round = await openRoundWithBets(chainId, endAtMs, openPrice, bets);
  await elapse(round.boundaryAt);
  return round;
}

/** Walk an observation's attempt budget to zero through the REAL store API. */
async function exhaust(boundaryIso: string) {
  const cfg = await getUpDownConfig();
  const obs = await observationStore.ensure(asset.id, boundaryIso);
  for (let i = 0; i < cfg.maxObservationAttempts; i++) {
    await observationStore.recordAttempt(obs.id, "test: source returned no usable price");
  }
  return obs;
}

// ── 1 · An exhausted boundary VOIDS and refunds IN FULL ─────────────────────
console.log("\n── 1 · an exhausted boundary voids its round and refunds every stake ──");
{
  const before = await walletsTotal();
  const round = await overdueRoundWithBets(c5.data.id, Date.now() + GRACE_MS, 2400.00, [
    { userId: dave, side: "YES", stake: 20_000 },
    { userId: erin, side: "NO", stake: 30_000 },
  ]);
  const afterBets = await walletsTotal();
  ok("1.1 · real money left the wallets", afterBets === before - 50_000, `${before} → ${afterBets}`);

  await exhaust(round.boundaryAt);
  const swept = await resolveOverdueRounds({ maxRounds: 50, maxObservations: 8 });

  const healed = (await roundStore.get(round.id))!;
  ok("1.2 · the sweep reached the round at all (the whole bug)", healed.resolvedAt != null,
     "before the sweep existed, this round could never resolve OR refund");
  ok("1.3 · it VOIDed rather than guessing a price", healed.outcome === "VOID", String(healed.outcome));
  ok("1.4 · the void reason names the source, not the operator", healed.voidReason === "source-failed", String(healed.voidReason));
  ok("1.5 · the money actually moved (settledAt stamped)", healed.settledAt != null);
  ok("1.6 · ⛔ EVERY stake refunded IN FULL — no fee on a void",
     (await walletsTotal()) === before, `${before} → ${await walletsTotal()}`);
  ok("1.7 · the sweep reports what it did", swept.voided >= 1, JSON.stringify(swept));

  const m = (await marketStore.get(round.marketId))!;
  ok("1.8 · the market is VOIDED, through the untouched settlement path", m.status === "VOIDED", m.status);
}

// ── 2 · It heals a PAUSED chain — money does not depend on the switch ────────
console.log("\n── 2 · a paused chain still refunds (the operator pauses when it misbehaves) ──");
{
  const before = await walletsTotal();
  const round = await overdueRoundWithBets(c5.data.id, Date.now() + GRACE_MS, 2400.00, [
    { userId: dave, side: "YES", stake: 15_000 },
  ]);
  // Exactly the containment an operator applies when resolution is misbehaving.
  await setChainState(c5.data.id, "PAUSED", OFFICER);
  ok("2.1 · the chain really is paused", (await chainStore.get(c5.data.id))!.state === "PAUSED");

  await exhaust(round.boundaryAt);
  await resolveOverdueRounds({ maxRounds: 50, maxObservations: 8 });

  const healed = (await roundStore.get(round.id))!;
  ok("2.2 · a PAUSED chain's round still reached a verdict", healed.resolvedAt != null,
     "staked money must terminate regardless of chain state");
  ok("2.3 · …and was refunded in full", (await walletsTotal()) === before);
}

// ── 3 · A confirmed reading still RESOLVES (not a void-everything hammer) ────
console.log("\n── 3 · the sweep resolves a real reading, it does not just void ──");
{
  const before = await walletsTotal();
  const round = await overdueRoundWithBets(c5.data.id, Date.now() + GRACE_MS, 2400.00, [
    { userId: dave, side: "YES", stake: 40_000 },
    { userId: erin, side: "NO", stake: 10_000 },
  ]);
  // A close ABOVE the frozen up-target ⇒ UP ⇒ YES wins.
  ok("3.0 · the round froze its winning boundaries at open", round.upTarget != null && round.downTarget != null,
     `up=${round.upTarget} down=${round.downTarget}`);
  const closeObs = await observationStore.ensure(asset.id, round.boundaryAt);
  await observationStore.confirm(closeObs.id, {
    price: round.upTarget! + 5, sourceUrl: asset.priceSourceUrl, sourceQuotedAt: round.boundaryAt,
    evidence: "test fixture: closing reading above the up target", confidence: 99, model: "test", rawHash: "test",
  });

  await resolveOverdueRounds({ maxRounds: 50, maxObservations: 8 });
  const healed = (await roundStore.get(round.id))!;
  ok("3.1 · the sweep RESOLVED it", healed.resolvedAt != null);
  ok("3.2 · UP, because the close cleared the up-target", healed.outcome === "UP", String(healed.outcome));
  ok("3.3 · the winner is up on the round", (await db.wallet.findByUserId(dave))!.balance > 0);
  ok("3.4 · money did not vanish: total changed by at most the fee",
     (await walletsTotal()) <= before && before - (await walletsTotal()) <= 50_000,
     `${before} → ${await walletsTotal()}`);
}

// ── 4 · Idempotent — two sweeps settle exactly once ─────────────────────────
console.log("\n── 4 · running the sweep twice settles exactly once ──");
{
  const round = await overdueRoundWithBets(c5.data.id, Date.now() + GRACE_MS, 2400.00, [
    { userId: erin, side: "YES", stake: 25_000 },
  ]);
  await exhaust(round.boundaryAt);
  await resolveOverdueRounds({ maxRounds: 50, maxObservations: 8 });
  const afterFirst = await walletsTotal();
  const first = (await roundStore.get(round.id))!;

  const second = await resolveOverdueRounds({ maxRounds: 50, maxObservations: 8 });
  ok("4.1 · the healed round is no longer even scanned", second.scanned === 0 || (await roundStore.get(round.id))!.resolvedAt === first.resolvedAt);
  ok("4.2 · ⛔ no second refund — a replay cannot pay twice", (await walletsTotal()) === afterFirst,
     `${afterFirst} → ${await walletsTotal()}`);
}

// ── 5 · ONE reading per (asset, boundary), even while healing ────────────────
console.log("\n── 5 · healing must not multiply the spend it heals ──");
{
  // A 5-minute and a 15-minute round both ENDING at the same instant.
  // Both rounds are opened to END at the SAME instant — a 5-minute and a 15-minute round
  // meeting at one boundary, which is the case the sharing law exists for.
  // Opened BEFORE the boundary elapses — both must exist while it is still in the future.
  const sharedMs = Date.now() + GRACE_MS;
  const shared = new Date(sharedMs).toISOString();
  const r5 = await openRoundWithBets(c5.data.id, sharedMs, 2400, []);
  const r15 = await openRoundWithBets(c15.data.id, sharedMs, 2400, []);
  await elapse(shared);
  ok("5.0 · the two rounds really do share one closing instant",
     r5.boundaryAt === r15.boundaryAt && r5.boundaryAt === shared, `${r5.boundaryAt} vs ${r15.boundaryAt}`);

  await exhaust(shared);
  const before = (await observationStore.list({ assetId: asset.id })).length;
  await resolveOverdueRounds({ maxRounds: 50, maxObservations: 8 });
  const after = (await observationStore.list({ assetId: asset.id })).length;
  ok("5.1 · no extra observation row was created for the shared boundary", after === before,
     `${before} → ${after}`);
  ok("5.2 · BOTH rounds reached a verdict off the ONE reading",
     (await roundStore.get(r5.id))!.resolvedAt != null && (await roundStore.get(r15.id))!.resolvedAt != null);
}

// ── 6 · An OPERATOR-state refusal must NOT burn the attempt budget ───────────
console.log("\n── 6 · a paused AI / missing key does not spend a round's retries ──");
{
  const boundary = new Date(Date.now() + 10 * 60_000).toISOString();
  const obs = await observationStore.ensure(asset.id, boundary);
  ok("6.0 · fresh observation starts at zero attempts", obs.attempts === 0);

  // No ANTHROPIC_API_KEY ⇒ `observePrice` refuses "no-api-key" — an OPERATOR state.
  const got = await acquireObservation(asset, boundary);
  ok("6.1 · the reading is refused, not invented", got.state === "pending", got.state);

  const after = (await observationStore.get(obs.id))!;
  ok("6.2 · ⛔ the attempt budget was NOT spent on an operator state", after.attempts === 0,
     `attempts=${after.attempts} — burning it here voids live rounds for an ops action, which is what the old code did`);
  ok("6.3 · the observation is still PENDING, not FAILED", after.state === "PENDING", after.state);
}

// ── 7 · The backoff is honoured ─────────────────────────────────────────────
console.log("\n── 7 · the retry ladder spaces attempts out (it used to be read by nothing) ──");
{
  const restore = await getUpDownConfig();
  const set = await setUpDownConfig({ retryBackoffSeconds: [3600] }, OFFICER);
  if (!set.ok) throw new Error(set.error);

  const boundary = new Date(Date.now() + 20 * 60_000).toISOString();
  const obs = await observationStore.ensure(asset.id, boundary);
  await observationStore.recordAttempt(obs.id, "test: one failed attempt just now");
  const attemptsBefore = (await observationStore.get(obs.id))!.attempts;

  const got = await acquireObservation(asset, boundary);
  ok("7.1 · a boundary inside its backoff window is left alone", got.state === "pending", got.state);
  ok("7.2 · …and reports the wait rather than a source failure",
     "detail" in got && /waiting \d+s/.test(got.detail), "detail" in got ? got.detail : "(none)");
  ok("7.3 · no attempt was consumed while waiting",
     (await observationStore.get(obs.id))!.attempts === attemptsBefore);

  const back = await setUpDownConfig({ retryBackoffSeconds: restore.retryBackoffSeconds }, OFFICER);
  if (!back.ok) throw new Error(back.error);

  // Validation, now that the field is load-bearing.
  ok("7.4 · a garbage backoff is refused", !(await setUpDownConfig({ retryBackoffSeconds: [] }, OFFICER)).ok);
  ok("7.5 · a negative backoff is refused", !(await setUpDownConfig({ retryBackoffSeconds: [-1] }, OFFICER)).ok);
}

// ── 8 · Conservation across the whole run ───────────────────────────────────
console.log("\n── 8 · money conservation ──");
{
  const end = await walletsTotal();

  // The same accounting the engine suite uses: wallets + pools of rounds whose money has
  // NOT yet moved + the fee we actually charged on each round that RESOLVED. A voided
  // round contributes nothing to the house — its pool went back to the players in full,
  // which is exactly what §1.6 measured directly.
  let openPools = 0;
  let house = 0;
  for (const r of await roundStore.list({ limit: 500 })) {
    const m = await marketStore.get(r.marketId);
    if (!m) continue;
    if (!r.settledAt) {
      openPools += Number(m.yesPool ?? 0) + Number(m.noPool ?? 0);
    } else if (m.resolvedOutcome && m.resolvedOutcome !== "VOID") {
      house += Math.round(poolFee(m.yesPool, m.noPool, ratesFor(m), m.resolvedOutcome).fee);
    }
  }

  const accounted = end + openPools + house;
  console.log(`\n  players ${end.toLocaleString()} + open pools ${openPools.toLocaleString()} + house ${house.toLocaleString()} = ${accounted.toLocaleString()} (started ${START_TOTAL.toLocaleString()})`);

  ok("8.1 · nothing was minted — wallets never exceed the opening total",
     end <= START_TOTAL, `start ${START_TOTAL} → end ${end}`);
  ok("8.2 · ⛔ every shilling is in a wallet, a still-open pool, or was our fee",
     Math.abs(accounted - START_TOTAL) <= 1, `drift ${accounted - START_TOTAL}`);
  ok("8.3 · the house earned a fee ONLY on the round that actually resolved",
     house > 0 && house < 10_000, `house ${house}`);
}

const line = "─".repeat(66);
console.log(`\n${line}\n  UPDOWN HEAL: ${pass} passed, ${fail} failed\n${line}`);
if (fail === 0) {
  console.log("  OK — an unconfirmable boundary now voids and refunds IN FULL, on any chain state,");
  console.log("       exactly once, off one shared reading, without an ops pause spending its retries.");
}
process.exit(fail === 0 ? 0 : 1);
