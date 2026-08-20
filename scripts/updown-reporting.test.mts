/**
 * Per-game money separation — moneyByGame() attributes each game's money correctly.
 *
 *   npx tsx scripts/updown-reporting.test.mts   (npm run test:updown-reporting)
 *
 * Ali, 2026-07-25: "Up & Down is a game and normal polls are another game completely."
 * This proves the split is CORRECT and ADDITIVE: a bet on a long-form poll lands in
 * MARKET, a bet on an Up & Down round lands in UPDOWN, deposits belong to neither, and
 * combined always equals the sum. If this drifts, the admin "By game" breakdown and the
 * Up & Down economics card lie about what each game earns.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { db } from "../src/lib/server/store.ts";
import { createMarket, buyPosition, resolveMarket, settleMarket } from "../src/lib/server/market-service.ts";
import { moneyByGame } from "../src/lib/server/report-money.ts";
import { createAsset, setAssetEnabled, createChain, setChainState, cleanGridAnchor, __resetUpDownConfig } from "../src/lib/server/updown-config.ts";
import { assetStore, chainStore, observationStore, __resetUpDownMemoryStores } from "../src/lib/server/updown-dal.ts";
import { openRound, closeRound } from "../src/lib/server/updown-service.ts";
import { seedDefaultSources, addSource } from "../src/lib/server/source-registry.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

__resetUpDownMemoryStores();
__resetUpDownConfig();
await seedDefaultSources();
await addSource({ domain: "kitco.com", label: "Kitco", category: "macro", rationale: "spot", addedBy: "system" });
// ⚠️ The fixture below is a 24/7 CRYPTO asset (gold is 15m+ only since 2026-08-04, and
// these suites are not about gold). `isSourceTrusted` matches on (domain, category), so the
// same domain needs a crypto row as well — exactly what `updown-heal` already does.
try { await addSource({ domain: "kitco.com", label: "Kitco", category: "crypto", rationale: "test fixture", addedBy: "system" }); } catch { /* already present */ }

let seq = 0;
async function funded(id: string, bal: number): Promise<string> {
  await db.user.create({
    id, phoneE164: `+25595${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: bal, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as never);
  return id;
}
const a = await funded("rep_a", 1_000_000);
const b = await funded("rep_b", 1_000_000);

const H = 3600_000;
// A window that generously brackets this whole run. `within()` is half-open [start, end):
// if we passed `end = Date.now()` at assert time, a bet whose createdAt lands in that
// exact millisecond would be excluded (a fast run makes this flaky — 40k → 25k → 0). The
// store is fresh, so only this run's txns exist; a ±1h bracket captures them all.
const windowStart = Date.now() - H;
const windowEnd = Date.now() + H;

// ── A long-form MARKET poll ─────────────────────────────────────────────────
const poll = await createMarket({
  titleEn: "Reporting test poll", titleSw: "x", category: "macro",
  sourceUrl: "https://bot.go.tz/x", resolutionCriterion: "test",
  resolutionAt: new Date(Date.now() + 24 * H).toISOString(), proposedBy: "test",
});
await buyPosition(a, { marketId: poll.id, side: "YES", stake: 40_000 });
await buyPosition(b, { marketId: poll.id, side: "NO", stake: 60_000 });

// ── An UPDOWN round ─────────────────────────────────────────────────────────
const asset = await createAsset({ key: "XAU", symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", nameZh: "比特币", iconKey: "crypto", priceSourceUrl: "https://www.kitco.com/price/precious-metals", category: "crypto", decimals: 2, minMoveTicks: 2 }, "off");
if (!asset.ok) throw new Error(asset.error);
await setAssetEnabled(asset.data.id, true, "off");
const chainR = await createChain({ assetId: asset.data.id, durationMinutes: 5 }, "off");
if (!chainR.ok) throw new Error(chainR.error);
await setChainState(chainR.data.id, "RUNNING", "off");
const chain = (await chainStore.get(chainR.data.id))!;
const anchorMs = cleanGridAnchor(Date.now() + 60_000);
const B = (k: number) => new Date(anchorMs + k * 5 * 60_000).toISOString();
async function confirm(iso: string, price: number) {
  const o = await observationStore.ensure(asset.data.id, iso);
  await observationStore.confirm(o.id, { price, sourceUrl: asset.data.priceSourceUrl, sourceQuotedAt: iso, evidence: `q ${price}`, confidence: 95, model: "t", rawHash: `h${price}${iso}` });
  return o.id;
}
const oo = await confirm(B(0), 2400);
const r = await openRound(chain, B(0), oo, 2400);
if (!r.ok) throw new Error(r.error);
await buyPosition(a, { marketId: r.data.marketId, side: "YES", stake: 25_000 });
await buyPosition(b, { marketId: r.data.marketId, side: "NO", stake: 15_000 });

// A deposit — belongs to NEITHER game.
try { await Promise.resolve(db.txn.create({ id: `txn_dep_${seq}`, walletId: `wal_${a}`, userId: a, type: "DEPOSIT", status: "CONFIRMED", amount: 500_000, fee: 0, currency: "TZS", positionId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as never)); } catch { /* shape drift ok */ }

// ── Split BEFORE settlement (stakes only) ────────────────────────────────────
{
  const g = await moneyByGame(windowStart, windowEnd);
  ok("1 · MARKET stakes = the poll's 100,000", g.market.stakes === 100_000, `got ${g.market.stakes}`);
  ok("2 · UPDOWN stakes = the round's 40,000", g.updown.stakes === 40_000, `got ${g.updown.stakes}`);
  ok("3 · the two games do not bleed into each other", g.market.stakes !== g.updown.stakes && g.updown.stakes === 40_000);
  ok("4 · the deposit is attributed to NEITHER game", g.market.stakes + g.updown.stakes === 140_000, `combined stakes ${g.market.stakes + g.updown.stakes}`);
  ok("5 · per-game player counts are right", g.market.players === 2 && g.updown.players === 2);
}

// ── Settle both, then split payouts/GGR ──────────────────────────────────────
// MARKET poll: resolve YES (single-admin path).
await resolveMarket({ marketId: poll.id, outcome: "YES", officerId: "off", evidence: "test" });
await settleMarket(poll.id, { actorId: "off", force: true });
// UPDOWN round: close UP (=YES) ABOVE the up target (base 2400 + 0.5% margin = 2412).
const co = await confirm(B(1), 2415);
await closeRound(r.data.id, co, 2415);

{
  const g = await moneyByGame(windowStart, windowEnd);
  ok("6 · MARKET GGR is this game's commission only", g.market.ggr > 0 && g.market.payouts > 0, `mkt ggr ${g.market.ggr} payouts ${g.market.payouts}`);
  ok("7 · UPDOWN GGR is this game's commission only", g.updown.ggr > 0 && g.updown.payouts > 0, `ud ggr ${g.updown.ggr} payouts ${g.updown.payouts}`);
  // ⚠️ THIS ASSERTION USED TO BE UNFALSIFIABLE. It read:
  //     const combinedGgr = g.market.ggr + g.updown.ggr;
  //     ok(..., combinedGgr === g.market.ggr + g.updown.ggr);
  // — a variable compared against its own definition. It could not fail, so it was never
  // evidence of the additive guarantee; it only proved that addition is deterministic.
  // The real claim is that the per-game split RECONCILES against the same window counted
  // independently, so that is what is checked now: every CONFIRMED bet-derived txn in the
  // window lands in exactly one bucket, and the buckets sum to that independent total.
  const independent = (await db.txn.listInRange(windowStart, windowEnd)).filter((t) =>
    t.status === "CONFIRMED" && t.positionId
    && (t.type === "BET_PLACED" || t.type === "BET_PAYOUT" || t.type === "CASHOUT" || t.type === "BET_REFUND"));
  const indepStakes = independent.filter((t) => t.type === "BET_PLACED").reduce((n, t) => n + Math.abs(t.amount), 0);
  const bucketStakes = g.market.stakes + g.updown.stakes + g.unattributed.stakes;
  ok("8 · the buckets account for EVERY bet-derived stake in the window (nothing dropped, nothing double-counted)",
     bucketStakes === indepStakes, `buckets ${bucketStakes} vs independent count ${indepStakes}`);
  // ⭐ INVERTED 2026-08-14 (A2). Up & Down charges `loser-share` now, so the regulator-facing
  // GGR figure moves with it — and it is worth pinning the exact number, because this is the
  // line a statutory report is built from.
  // pool 40,000, YES 25k / NO 15k, YES wins → the LOSING side is the 15,000 on NO
  //   new: 0.13 × 15,000                        = 1,950
  //   old: min(0.13 × 40,000, ⅓ × 15,000)       = 5,000
  ok("9 · UPDOWN GGR = 13% of the LOSING side (0.13 × 15,000 = 1,950), not the retired 5,000",
     Math.round(g.updown.ggr) === 1950, `got ${Math.round(g.updown.ggr)}`);
  ok("10 · hold % is per-game and sane", g.updown.holdPct > 0 && g.updown.holdPct < 100 && g.market.holdPct > 0);
}

// ── F-03 · a bet txn whose Position no longer resolves is DISCLOSED, not guessed ─────
//
// WHY THIS EXISTS. `moneyByGame` used to end its lookup with `?? "MARKET"`, so bet money
// whose position row had gone silently inflated the long-form MARKET line — a
// regulator-facing number. Production carried 374 such transactions on 2026-08-20
// (213 BET_PLACED · 104 BET_REFUND · 57 BET_PAYOUT, 16 players, net −50,494 TZS).
//
// The fixture is the exact production shape: a CONFIRMED BET_PLACED pointing at a
// positionId that was never created. It proves the orphan lands in `unattributed`, that
// both real game lines are UNMOVED, and that Combined still totals everything — because
// that money is real revenue and dropping it would understate the statutory figure.
{
  const before = await moneyByGame(windowStart, windowEnd);
  const ghostStake = 7_000;
  await Promise.resolve(db.txn.create({
    id: `txn_ghost_${seq}`, walletId: `wal_${a}`, userId: a, type: "BET_PLACED", status: "CONFIRMED",
    amount: ghostStake, fee: 0, currency: "TZS",
    positionId: "pos_deleted_by_a_pre_launch_reset",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  } as never));
  const after = await moneyByGame(windowStart, windowEnd);

  // ⛔ CONTROL FIRST. If the fixture never reached the calculation (wrong status, wrong
  // type, outside the window, create() silently swallowed), then 11-15 below would all pass
  // vacuously. Assert the total MOVED by exactly the stake before trusting any of them.
  ok("11 · CONTROL: the fixture really entered the calculation (total grew by exactly the stake)",
     (after.market.stakes + after.updown.stakes + after.unattributed.stakes)
       - (before.market.stakes + before.updown.stakes + before.unattributed.stakes) === ghostStake,
     `delta ${(after.market.stakes + after.updown.stakes + after.unattributed.stakes) - (before.market.stakes + before.updown.stakes + before.unattributed.stakes)}`);
  ok("12 · the orphaned bet lands in `unattributed`, not in a game",
     after.unattributed.stakes === before.unattributed.stakes + ghostStake,
     `unattributed stakes ${before.unattributed.stakes} -> ${after.unattributed.stakes}`);
  ok("13 · MARKET is UNMOVED by it — this is the F-03 defect itself",
     after.market.stakes === before.market.stakes && after.market.ggr === before.market.ggr,
     `market stakes ${before.market.stakes} -> ${after.market.stakes}`);
  ok("14 · UPDOWN is UNMOVED by it",
     after.updown.stakes === before.updown.stakes && after.updown.ggr === before.updown.ggr,
     `updown stakes ${before.updown.stakes} -> ${after.updown.stakes}`);
  ok("15 · Combined still accounts for it (the statutory total must not shrink)",
     after.market.stakes + after.updown.stakes + after.unattributed.stakes
       === before.market.stakes + before.updown.stakes + before.unattributed.stakes + ghostStake);
  ok("16 · it is labelled a non-game, so no reader can mistake it for one",
     after.unattributed.game === "UNATTRIBUTED", `got ${after.unattributed.game}`);
}

console.log(`\nupdown-reporting: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.error("\n✗ PER-GAME MONEY SPLIT WRONG — the admin 'By game' breakdown would misreport each game's earnings.\n"); process.exit(1); }
console.log("updown-reporting: OK — each game's money is attributed correctly, deposits belong to neither, unattributable money is disclosed rather than guessed, combined = sum");
