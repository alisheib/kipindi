/**
 * A2/A3 · THE UP & DOWN FEE CUTOVER, AND THE NO-MIX GUARANTEE — executed, not asserted.
 *
 *   npx tsx scripts/updown-fee-cutover.test.mts     (npm run test:updown-cutover)
 *
 * On 2026-08-14 Up & Down moved from `capped-commission` (13% of the pool, capped at ⅓ of
 * the smaller side) to `loser-share` (13% of the LOSING side) — the same charge as long-form
 * polls, in the same words. `docs/RULES.md` §2.1.
 *
 * ⛔ THE PROPERTY THAT MATTERS IS NOT "THE NEW RATE IS RIGHT". It is that the two maths
 * NEVER MIX. 4,146 Up & Down rounds are frozen at the old model on production and must settle
 * by it forever; every round opened after the switch must settle by the new one. A suite that
 * only checked the new number would pass just as happily on a build that had silently
 * repriced history.
 *
 * So both run HERE, in one process, through the real path — real chains, real `openRound`,
 * real `buyPosition`, real `closeRound` → `settleMarket`, real wallets — and each is checked
 * against arithmetic computed independently in this file:
 *
 *   §1 a round opened AFTER the switch settles 13% of the LOSING side
 *   §2 a round frozen BEFORE it settles min(13% × pool, ⅓ × smaller) — unchanged
 *   §3 both satisfy the winner floor AND exact conservation: Σ payouts + fee == pool
 *   §4 the DEFAULT really moved, and the migration moves a live config that predates it
 *   §5 a one-sided round and a VOID still charge NOTHING under the new model
 *
 * ⚠️ §2's "old" round is built by giving its chain an EXPLICIT capped-commission profile —
 * which is exactly how the 4,146 production rows got theirs. It is not a simulation of a
 * legacy row; it is a legacy row.
 *
 * RED harness: `node scripts/updown-cutover-red.mjs`.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { assetStore, chainStore, observationStore, __resetUpDownMemoryStores } from "../src/lib/server/updown-dal.ts";
import {
  createAsset, setAssetEnabled, createChain, setChainState,
  cleanGridAnchor, __resetUpDownConfig, getUpDownConfig, rateProfileFor,
  reconcileUpDownDefaults, DEFAULT_UPDOWN_CONFIG,
} from "../src/lib/server/updown-config.ts";
import { openRound, closeRound } from "../src/lib/server/updown-service.ts";
import { marketStore } from "../src/lib/server/market-dal.ts";
import { buyPosition, listPositionsForMarket, ratesFor } from "../src/lib/server/market-service.ts";
import { addSource, seedDefaultSources } from "../src/lib/server/source-registry.ts";
import { db } from "../src/lib/server/store.ts";
import { poolFee } from "../src/lib/payout.ts";

import "./lib/verified-fixtures.mts";
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const OFFICER = "usr_officer";
__resetUpDownMemoryStores();
__resetUpDownConfig();
await seedDefaultSources();
// A round resolves against its exact source link, so the domain must be approved for the
// asset's category first — the same gate production enforces.
await addSource({ domain: "api.twelvedata.com", label: "Twelve Data", category: "crypto", rationale: "test fixture", addedBy: "system" });

const nowIso = () => new Date().toISOString();
let seq = 0;
async function fundedUser(id: string, balance: number): Promise<string> {
  await db.user.create({
    id, phoneE164: `+25596${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
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
const balanceOf = async (id: string) => (await db.wallet.findByUserId(id))!.balance;

const a = await createAsset({
  // ⚠️ CRYPTO, not gold. The product refuses a gold chain under 15 minutes — its own feed
  // disagrees with itself by about the size of a whole 5-minute gold move — and this suite
  // needs several short chains on one grid. That refusal is correct; work with it.
  key: "BTCCUT", symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto",
  priceSourceUrl: "https://api.twelvedata.com/quote", category: "crypto",
  decimals: 2, minMoveTicks: 2,
}, OFFICER);
if (!a.ok) throw new Error(a.error);
await setAssetEnabled(a.data.id, true, OFFICER);
const asset = (await assetStore.get(a.data.id))!;

const anchorMs = cleanGridAnchor(Date.now() + 60_000);
const B = (k: number) => new Date(anchorMs + k * 5 * 60_000).toISOString();

async function stubObservation(boundaryIso: string, price: number) {
  const o = await observationStore.ensure(asset.id, boundaryIso);
  await observationStore.confirm(o.id, {
    price, sourceUrl: asset.priceSourceUrl, sourceQuotedAt: boundaryIso,
    evidence: `BTC quoted ${price}`, confidence: 96, model: "test-stub", rawHash: `h${boundaryIso}${price}`,
  });
  return o.id;
}

/**
 * Open a round on `chain`, take the given bets, close it at `closePrice`, and return
 * everything needed to check the money. Uses ONLY the real product path.
 */
async function driveRound(opts: {
  chainId: string; k: number; openPrice: number; closePrice: number;
  bets: Array<{ user: string; side: "YES" | "NO"; stake: number }>;
}) {
  const chain = (await chainStore.get(opts.chainId))!;
  const openObs = await stubObservation(B(opts.k), opts.openPrice);
  const r = await openRound(chain, B(opts.k), openObs, opts.openPrice);
  if (!r.ok) throw new Error(`openRound: ${r.error}`);
  const marketId = r.data.marketId;

  const before: Record<string, number> = {};
  for (const b of opts.bets) before[b.user] ??= await balanceOf(b.user);

  for (const b of opts.bets) {
    const res = await buyPosition(b.user, { marketId, side: b.side, stake: b.stake });
    if (!res.ok) throw new Error(`buyPosition ${b.user}: ${(res as { error: string }).error}`);
  }

  const market = (await marketStore.get(marketId))!;
  const rates = ratesFor(market);
  const yesPool = market.yesPool, noPool = market.noPool;

  const closeObs = await stubObservation(B(opts.k + 1), opts.closePrice);
  const cr = await closeRound(r.data.id, closeObs, opts.closePrice);
  if (!cr.ok) throw new Error(`closeRound: ${cr.error}`);

  const settled = (await marketStore.get(marketId))!;
  const positions = await listPositionsForMarket(marketId);
  const after: Record<string, number> = {};
  for (const u of Object.keys(before)) after[u] = await balanceOf(u);

  return { roundId: r.data.id, marketId, rates, yesPool, noPool, settled, positions, before, after, outcome: cr.data.outcome };
}

/** Σ of what settlement actually paid out, from the positions themselves. */
const paidOut = (positions: Array<{ finalPayout?: number | null }>) =>
  positions.reduce((s, p) => s + (p.finalPayout ?? 0), 0);

// ════════════════════════════════════════════════════════════════════════════
// §1 · A ROUND OPENED AFTER THE SWITCH — 13% OF THE LOSING SIDE
// ════════════════════════════════════════════════════════════════════════════
{
  // No explicit profile → the chain inherits the product default, which is the whole point.
  const c = await createChain({ assetId: asset.id, durationMinutes: 5 }, OFFICER);
  if (!c.ok) throw new Error(c.error);
  await setChainState(c.data.id, "RUNNING", OFFICER);

  const inherited = await rateProfileFor((await chainStore.get(c.data.id))!);
  ok("1.1 · a NEW chain with no profile of its own inherits loser-share",
     inherited.feeModel === "loser-share", String(inherited.feeModel));

  const alice = await fundedUser("cut_alice", 500_000);
  const bob = await fundedUser("cut_bob", 500_000);
  const carol = await fundedUser("cut_carol", 500_000);

  // UP 100,000 (alice 60k + bob 40k) vs DOWN 60,000 (carol). Close HIGHER → UP wins,
  // so the LOSING pool is the 60,000 on DOWN.
  const r = await driveRound({
    chainId: c.data.id, k: 0, openPrice: 2400.00, closePrice: 2412.50,
    bets: [
      { user: alice, side: "YES", stake: 60_000 },
      { user: bob, side: "YES", stake: 40_000 },
      { user: carol, side: "NO", stake: 60_000 },
    ],
  });

  ok("1.2 · the round FROZE loser-share, 3% + 10%",
     r.rates.feeModel === "loser-share" && r.rates.platformFeeRate === 0.03 && r.rates.operatorFeeRate === 0.10,
     `${r.rates.feeModel} ${r.rates.platformFeeRate}+${r.rates.operatorFeeRate}`);
  ok("1.3 · it resolved UP and the pools are 100,000 / 60,000",
     r.outcome === "UP" && r.yesPool === 100_000 && r.noPool === 60_000,
     `${r.outcome} ${r.yesPool}/${r.noPool}`);

  // ⭐ The arithmetic, computed HERE and not borrowed from the code under test.
  const losingPool = 60_000;
  const expectedFee = Math.round(0.13 * losingPool);           // 7,800
  const fee = poolFee(r.yesPool, r.noPool, r.rates, "YES").fee;
  ok("1.4 · ★ the fee is 13% of the LOSING side — TZS 7,800, not 13% of the pool",
     Math.round(fee) === expectedFee, `${Math.round(fee)} (expected ${expectedFee})`);

  // ⛔ And it is NOT what the old model would have charged. Without this the check passes
  //    on any build where the two happen to agree, which on a lopsided pool they do not.
  const oldModelFee = Math.min(0.13 * 160_000, (1 / 3) * 60_000);   // min(20,800 , 20,000) = 20,000
  ok("1.5 · ⭐ …and the OLD model would have charged 20,000 — the change is visible here",
     Math.round(oldModelFee) === 20_000 && Math.round(fee) !== Math.round(oldModelFee),
     `new ${Math.round(fee)} vs old ${Math.round(oldModelFee)}`);

  const out = paidOut(r.positions);
  ok("1.6 · ★ CONSERVATION — Σ payouts + fee == pool, to the shilling",
     Math.abs(out + Math.round(fee) - 160_000) <= 1, `${out} + ${Math.round(fee)} vs 160,000`);

  const wins = r.positions.filter((p) => p.status === "WIN");
  const below = wins.filter((p) => (p.finalPayout ?? 0) < p.stake);
  ok("1.7 · ★ WINNER FLOOR — no winning bet paid below its stake",
     wins.length === 2 && below.length === 0,
     below.map((p) => `${p.stake}→${p.finalPayout}`).join(", ") || `${wins.length} winners`);

  // A player-visible consequence worth pinning: the smaller fee means a BIGGER payout than
  // the old model would have produced on the same pools.
  const netNew = 160_000 - Math.round(fee);
  const netOld = 160_000 - Math.round(oldModelFee);
  ok("1.8 · the winners share a LARGER net pool than the old model would have left them",
     netNew > netOld, `${netNew} vs ${netOld}`);
}

// ════════════════════════════════════════════════════════════════════════════
// §2 · A ROUND FROZEN BEFORE THE SWITCH — THE OLD MATHS, UNCHANGED
// ════════════════════════════════════════════════════════════════════════════
{
  // An EXPLICIT capped-commission profile — exactly how the 4,146 production rows carry
  // theirs, because a chain's own rateProfile always beats the product default.
  const c = await createChain({
    assetId: asset.id, durationMinutes: 10,
    rateProfile: { feeModel: "capped-commission", commissionRate: 0.13, feeCeilingRate: 1 / 3 },
  }, OFFICER);
  if (!c.ok) throw new Error(c.error);
  await setChainState(c.data.id, "RUNNING", OFFICER);

  const dave = await fundedUser("cut_dave", 500_000);
  const erin = await fundedUser("cut_erin", 500_000);

  const r = await driveRound({
    chainId: c.data.id, k: 4, openPrice: 2400.00, closePrice: 2412.50,
    bets: [
      { user: dave, side: "YES", stake: 100_000 },
      { user: erin, side: "NO", stake: 60_000 },
    ],
  });

  ok("2.1 · a chain carrying its own capped-commission profile still freezes it",
     r.rates.feeModel === "capped-commission" && r.rates.commissionRate === 0.13,
     `${r.rates.feeModel} @ ${r.rates.commissionRate}`);

  const fee = poolFee(r.yesPool, r.noPool, r.rates, "YES").fee;
  const expectedOld = Math.min(0.13 * 160_000, (1 / 3) * 60_000);   // 20,000 — the ceiling binds
  ok("2.2 · ★ it settles by min(13% × pool, ⅓ × smaller) = TZS 20,000 — the OLD maths",
     Math.round(fee) === Math.round(expectedOld), `${Math.round(fee)} (expected ${Math.round(expectedOld)})`);

  ok("2.3 · ⛔ NO MIX — the pre-switch round did NOT get the new model's 7,800",
     Math.round(fee) !== Math.round(0.13 * 60_000), `${Math.round(fee)}`);

  const out = paidOut(r.positions);
  ok("2.4 · ★ CONSERVATION holds on the legacy model too",
     Math.abs(out + Math.round(fee) - 160_000) <= 1, `${out} + ${Math.round(fee)} vs 160,000`);

  const wins = r.positions.filter((p) => p.status === "WIN");
  const below = wins.filter((p) => (p.finalPayout ?? 0) < p.stake);
  ok("2.5 · ★ WINNER FLOOR holds on the legacy model too", below.length === 0,
     below.map((p) => `${p.stake}→${p.finalPayout}`).join(", "));
}

// ════════════════════════════════════════════════════════════════════════════
// §3 · THE TWO RAN IN ONE PROCESS AND DID NOT CONTAMINATE EACH OTHER
// ════════════════════════════════════════════════════════════════════════════
{
  // Re-read the product default AFTER a capped-commission chain existed. The freezing
  // mechanism is shared, so "the last chain created wins" would be a real failure mode.
  const cfg = await getUpDownConfig();
  ok("3.1 · the product default is still loser-share after a legacy chain was created",
     cfg.defaultRateProfile.feeModel === "loser-share", String(cfg.defaultRateProfile.feeModel));
}

// ════════════════════════════════════════════════════════════════════════════
// §4 · THE DEFAULT MOVED, AND A LIVE CONFIG THAT PREDATES IT MIGRATES
// ════════════════════════════════════════════════════════════════════════════
{
  ok("4.1 · the shipped default is loser-share at 3% + 10%",
     DEFAULT_UPDOWN_CONFIG.defaultRateProfile.feeModel === "loser-share" &&
     DEFAULT_UPDOWN_CONFIG.defaultRateProfile.platformFeeRate === 0.03 &&
     DEFAULT_UPDOWN_CONFIG.defaultRateProfile.operatorFeeRate === 0.10,
     JSON.stringify(DEFAULT_UPDOWN_CONFIG.defaultRateProfile));

  // The exact shape production carried on 2026-08-14.
  const live = reconcileUpDownDefaults({
    ...DEFAULT_UPDOWN_CONFIG,
    defaultRateProfile: { feeModel: "capped-commission", commissionRate: 0.13, feeCeilingRate: 1 / 3 },
  }, 3);
  ok("4.2 · a stored capped-commission default is migrated to loser-share",
     live.changed && live.config.defaultRateProfile.feeModel === "loser-share",
     `${live.changed} ${live.config.defaultRateProfile.feeModel}`);

  // ⭐ POSITIVE CONTROL — a deliberate operator choice is NOT overwritten. Without this,
  //   "migrate the retired default" and "overwrite whatever is there" pass identically.
  const custom = reconcileUpDownDefaults({
    ...DEFAULT_UPDOWN_CONFIG,
    defaultRateProfile: { feeModel: "capped-commission", commissionRate: 0.09, feeCeilingRate: 0.25 },
  }, 3);
  ok("4.3 · ⭐ a DELIBERATE non-default profile is left alone",
     !custom.changed && custom.config.defaultRateProfile.commissionRate === 0.09,
     JSON.stringify(custom.config.defaultRateProfile));

  const done = reconcileUpDownDefaults({
    ...DEFAULT_UPDOWN_CONFIG,
    defaultRateProfile: { feeModel: "capped-commission", commissionRate: 0.13, feeCeilingRate: 1 / 3 },
  }, 4);
  ok("4.4 · a v4 config is not migrated again", !done.changed);

  // ⛔ THE THING THAT WOULD MAKE ALL OF THE ABOVE WORTHLESS. Every UpDownChain row carries
  //    its OWN rateProfile and `rateProfileFor` prefers it — so moving the default alone
  //    changes NOTHING a player can see on the 16 live chains. This asserts the precedence
  //    that makes `ops:updown-loser-share` necessary, so nobody concludes the constant was
  //    the whole job.
  const legacy = await createChain({
    assetId: asset.id, durationMinutes: 30,
    rateProfile: { feeModel: "capped-commission", commissionRate: 0.13, feeCeilingRate: 1 / 3 },
  }, OFFICER);
  if (!legacy.ok) throw new Error(legacy.error);
  const resolved = await rateProfileFor((await chainStore.get(legacy.data.id))!);
  ok("4.5 · ⛔ a chain's OWN profile beats the product default — the default alone is not the job",
     resolved.feeModel === "capped-commission", String(resolved.feeModel));
}

// ════════════════════════════════════════════════════════════════════════════
// §5 · ONE-SIDED AND VOID STILL CHARGE NOTHING
// ════════════════════════════════════════════════════════════════════════════
{
  const c = await createChain({ assetId: asset.id, durationMinutes: 15 }, OFFICER);
  if (!c.ok) throw new Error(c.error);
  await setChainState(c.data.id, "RUNNING", OFFICER);

  // 5a · ONE-SIDED: everybody on UP, UP wins. There is no losing pool, so there is no fee.
  const frank = await fundedUser("cut_frank", 500_000);
  const startFrank = await balanceOf(frank);
  const oneSided = await driveRound({
    chainId: c.data.id, k: 8, openPrice: 2400.00, closePrice: 2412.50,
    bets: [{ user: frank, side: "YES", stake: 50_000 }],
  });
  const feeOneSided = poolFee(oneSided.yesPool, oneSided.noPool, oneSided.rates, "YES").fee;
  ok("5a.1 · a one-sided round charges NOTHING under loser-share",
     Math.round(feeOneSided) === 0, String(Math.round(feeOneSided)));
  ok("5a.2 · …and the stake comes back in full",
     (await balanceOf(frank)) === startFrank, `${startFrank} → ${await balanceOf(frank)}`);

  // 5b · VOID: the price does not move out of the band, so every stake is refunded.
  const gina = await fundedUser("cut_gina", 500_000);
  const hank = await fundedUser("cut_hank", 500_000);
  const startGina = await balanceOf(gina), startHank = await balanceOf(hank);
  const voided = await driveRound({
    chainId: c.data.id, k: 10, openPrice: 2400.00, closePrice: 2400.00,
    bets: [
      { user: gina, side: "YES", stake: 30_000 },
      { user: hank, side: "NO", stake: 20_000 },
    ],
  });
  ok("5b.1 · a no-move round VOIDs", voided.outcome === "VOID", voided.outcome);
  ok("5b.2 · ★ a VOID charges nothing and refunds BOTH sides in full",
     (await balanceOf(gina)) === startGina && (await balanceOf(hank)) === startHank,
     `${startGina}→${await balanceOf(gina)} · ${startHank}→${await balanceOf(hank)}`);
}

console.log(`\nupdown-fee-cutover: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
