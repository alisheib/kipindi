/**
 * Up & Down quick-bet — the one-tap card path.
 *
 *   npx tsx scripts/updown-quickbet.test.mts   (npm run test:updown-quickbet)
 *
 * The card places through the SAME `buyPosition` the conviction dial uses (no parallel
 * money path) and shows the viewer's OWN live stake per side ("you're in") straight from
 * `getBoard({ userId })`. This proves both:
 *   • the action path — a tap places, a double-submit pays ONCE, distinct taps stack,
 *     a closed round / over-balance / over-max are all refused BY THE SERVER; and
 *   • the read model — myUpStake/myDownStake is per-viewer, per-side, OPEN-only, and
 *     never leaks one player's position to another (or to a signed-out board).
 *
 * If any of this drifts, the fast-game promise ("bet a lot in one tap, see it instantly")
 * either loses money (double-charge) or lies (wrong "you're in").
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { db } from "../src/lib/server/store.ts";
import { buyPosition, MAX_STAKE } from "../src/lib/server/market-service.ts";
import { getBoard } from "../src/lib/server/updown-board.ts";
import { createAsset, setAssetEnabled, createChain, setChainState, stakeBoundsFor, __resetUpDownConfig } from "../src/lib/server/updown-config.ts";
import { chainStore, observationStore, __resetUpDownMemoryStores } from "../src/lib/server/updown-dal.ts";
import { openRound, closeRound } from "../src/lib/server/updown-service.ts";
import { seedDefaultSources, addSource } from "../src/lib/server/source-registry.ts";
import { parseStake, quickStakes, stakeIsValid } from "../src/components/updown/stake-math.ts";

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
    id, phoneE164: `+25596${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: bal, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as never);
  return id;
}

const alice = await funded("qb_alice", 1_000_000);
const bob = await funded("qb_bob", 1_000_000);
const broke = await funded("qb_broke", 10_000);

// ── An UPDOWN round, open for betting ────────────────────────────────────────
const asset = await createAsset({ key: "XAU", symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", nameZh: "比特币", iconKey: "crypto", priceSourceUrl: "https://www.kitco.com/price/precious-metals", category: "crypto", decimals: 2, minMoveTicks: 2 }, "off");
if (!asset.ok) throw new Error(asset.error);
await setAssetEnabled(asset.data.id, true, "off");
const chainR = await createChain({ assetId: asset.data.id, durationMinutes: 5, minStake: 100, maxStake: 50_000 }, "off");
if (!chainR.ok) throw new Error(chainR.error);
await setChainState(chainR.data.id, "RUNNING", "off");
const chain = (await chainStore.get(chainR.data.id))!;

// ── 0 · STAKE FLOOR — a chain stored with a below-floor min (100, legacy) must never
//        surface a sub-floor bound; the product default (1,000) is the hard floor. ─────
{
  const b = await stakeBoundsFor(chain);
  ok("0.1 · a stale chain min (100) is floored to the platform min (1,000)", b.min === 1_000, `got ${b.min}`);
  ok("0.2 · the chain's own higher max is preserved", b.max === 50_000, `got ${b.max}`);
}

// A round that is OPEN RIGHT NOW: opened 2 min ago (so the board shows it —
// `opensAt <= now` is load-bearing), closing 3 min out (so betting is allowed —
// `resolutionAt > now`, with comfortable margin for the whole test to run).
const nowMs = Date.now();
const openMs = nowMs - 2 * 60_000;
const openIso = new Date(openMs).toISOString();
const closeIso = new Date(openMs + 5 * 60_000).toISOString();
async function confirm(iso: string, price: number) {
  const o = await observationStore.ensure(asset.data.id, iso);
  await observationStore.confirm(o.id, { price, sourceUrl: asset.data.priceSourceUrl, sourceQuotedAt: iso, evidence: `q ${price}`, confidence: 95, model: "t", rawHash: `h${price}${iso}` });
  return o.id;
}
const oo = await confirm(openIso, 2400);
const r = await openRound(chain, openIso, oo, 2400);
if (!r.ok) throw new Error(r.error);
const marketId = r.data.marketId;

// The viewer's per-side open stake, exactly as the card reads it.
async function mine(userId: string | undefined): Promise<{ up: number; down: number }> {
  const board = await getBoard({ assetKey: "XAU", durationMinutes: 5, userId });
  const round = board.rounds.find((x) => x.marketId === marketId);
  return { up: round?.myUpStake ?? 0, down: round?.myDownStake ?? 0 };
}

// ── 1 · a single tap places ──────────────────────────────────────────────────
{
  const before = (await db.wallet.findByUserId(alice))!.balance;
  const res = await buyPosition(alice, { marketId, side: "YES", stake: 2_000, idempotencyKey: "qb-a-1" });
  ok("1 · a tap places a bet", res.ok, res.ok ? "" : res.error);
  const after = (await db.wallet.findByUserId(alice))!.balance;
  ok("2 · the stake left the wallet exactly once", before - after === 2_000, `moved ${before - after}`);
  const m = await mine(alice);
  ok("3 · the card shows it on the UP side", m.up === 2_000 && m.down === 0, `up ${m.up} down ${m.down}`);
}

// ── 2 · double-submit (SAME key) pays once — the 2G double-tap guard ──────────
{
  const before = (await db.wallet.findByUserId(alice))!.balance;
  const a = await buyPosition(alice, { marketId, side: "YES", stake: 3_000, idempotencyKey: "qb-a-dup" });
  const b = await buyPosition(alice, { marketId, side: "YES", stake: 3_000, idempotencyKey: "qb-a-dup" });
  ok("4 · both idempotent calls report ok", a.ok && b.ok);
  const after = (await db.wallet.findByUserId(alice))!.balance;
  ok("5 · only ONE stake was charged for the duplicate key", before - after === 3_000, `moved ${before - after}`);
  ok("6 · both return the SAME position", a.ok && b.ok && a.data!.positionId === b.data!.positionId);
}

// ── 3 · distinct taps STACK (fast game — many bets in a row) ──────────────────
{
  const before = (await db.wallet.findByUserId(alice))!.balance;
  for (let i = 0; i < 5; i++) {
    const res = await buyPosition(alice, { marketId, side: "YES", stake: 1_000, idempotencyKey: `qb-a-spam-${i}` });
    if (!res.ok) { ok(`7.${i} · rapid tap ${i} placed`, false, res.error); }
  }
  const after = (await db.wallet.findByUserId(alice))!.balance;
  ok("7 · five distinct rapid taps all placed", before - after === 5_000, `moved ${before - after}`);
  const m = await mine(alice);
  // 2,000 + 3,000 (dedup'd) + 5×1,000 = 10,000 on UP.
  ok("8 · 'you're in' sums every distinct UP tap", m.up === 10_000, `up ${m.up}`);
}

// ── 4 · ONE ACCOUNT, ONE SIDE — the hedge is refused (Ali's decision, 2026-08-04) ──
//
// ⚠️ THIS SECTION ASSERTED THE OPPOSITE UNTIL 2026-08-04, AND THE OLD ASSERTION WAS NOT WRONG
// AT THE TIME. It pinned that the "you're in" chip sums each side independently — which it
// still does. What changed is a PRODUCT RULE, not an implementation: in a pari-mutuel pool,
// holding both sides is a hedge that risks only the fee, so one leg always wins and the stake
// comes back less commission. That is near-zero-risk volume on a platform whose leaderboards
// and bonus wagering both count volume. `buyPosition` now refuses it, and
// `test:updown-window` §6 is the dedicated guard.
//
// ⭐ What is re-pinned HERE is that the refusal is CLEAN: the first side is untouched, no
// money moves, and the chip still reads the truth afterwards. A refusal that corrupted the
// position it declined would be worse than the hedge it prevented.
{
  const before = (await db.wallet.findByUserId(alice))!.balance;
  const res = await buyPosition(alice, { marketId, side: "NO", stake: 4_000, idempotencyKey: "qb-a-down" });
  ok("9 · ⭐ a DOWN tap is REFUSED for an account already holding UP", !res.ok, res.ok ? "the hedge landed" : res.error);
  const m = await mine(alice);
  const after = (await db.wallet.findByUserId(alice))!.balance;
  ok("10 · ⭐ and the refusal moves NO money and leaves the UP side intact",
     m.up === 10_000 && m.down === 0 && after === before, `up ${m.up} down ${m.down} balance ${before}→${after}`);
}

// ── 5 · 'you're in' is PER-VIEWER — never leaks between players ───────────────
{
  await buyPosition(bob, { marketId, side: "NO", stake: 7_000, idempotencyKey: "qb-b-1" });
  const mb = await mine(bob);
  const ma = await mine(alice);
  ok("11 · Bob sees only Bob's stake", mb.up === 0 && mb.down === 7_000, `bob up ${mb.up} down ${mb.down}`);
  ok("12 · Alice is unchanged by Bob's bet", ma.up === 10_000 && ma.down === 0, `alice up ${ma.up} down ${ma.down}`);
  const anon = await mine(undefined);
  ok("13 · a signed-out board shows no 'you're in'", anon.up === 0 && anon.down === 0, `anon up ${anon.up} down ${anon.down}`);
}

// ── 6 · server refuses the bad taps ──────────────────────────────────────────
{
  const over = await buyPosition(broke, { marketId, side: "YES", stake: 25_000, idempotencyKey: "qb-broke" });
  ok("14 · over-balance is refused", !over.ok, over.ok ? "charged an over-balance bet!" : over.error);
  const bal = (await db.wallet.findByUserId(broke))!.balance;
  ok("15 · a refused bet moved no money", bal === 10_000, `balance ${bal}`);

  const huge = await buyPosition(alice, { marketId, side: "YES", stake: MAX_STAKE + 1, idempotencyKey: "qb-huge" });
  ok("16 · over-max stake is refused", !huge.ok, huge.ok ? "accepted an over-max stake!" : "");

  const zero = await buyPosition(alice, { marketId, side: "YES", stake: 0, idempotencyKey: "qb-zero" });
  ok("17 · a zero stake is refused", !zero.ok);

  const frac = await buyPosition(alice, { marketId, side: "YES", stake: 150.5 as never, idempotencyKey: "qb-frac" });
  ok("18 · a fractional stake is refused", !frac.ok);
}

// ── 6B · CUSTOM stake — the free-typed amount (client math + server placement) ──
{
  // Pure stake math (the client's placement gate — buyPosition re-validates server-side).
  ok("20 · parseStake reads a grouped amount", parseStake("1,250") === 1_250, `got ${parseStake("1,250")}`);
  ok("21 · parseStake rejects empty / non-numeric / zero",
     parseStake("") === null && parseStake("abc") === null && parseStake("0") === null);
  ok("22 · quickStakes stays within [min,max] and dedupes",
     quickStakes(100, 50_000).every((s) => s >= 100 && s <= 50_000) && new Set(quickStakes(100, 50_000)).size === quickStakes(100, 50_000).length);
  // The chain here is min 100 / max 50,000.
  ok("23 · stakeIsValid gates on the chain bounds",
     stakeIsValid("1234", 100, 50_000) && !stakeIsValid("50", 100, 50_000) && !stakeIsValid("60000", 100, 50_000) && !stakeIsValid("", 100, 50_000));

  // A NON-preset custom amount within bounds places through the same path.
  const before = (await db.wallet.findByUserId(alice))!.balance;
  const custom = await buyPosition(alice, { marketId, side: "YES", stake: 1_337, idempotencyKey: "qb-custom-ok" });
  ok("24 · a valid custom amount places", custom.ok, custom.ok ? "" : custom.error);
  const after = (await db.wallet.findByUserId(alice))!.balance;
  ok("25 · exactly the custom amount left the wallet", before - after === 1_337, `moved ${before - after}`);
  const m = await mine(alice);
  ok("26 · the custom amount joins the UP 'you're in'", m.up === 10_000 + 1_337, `up ${m.up}`);
}

// ── 7 · a CLOSED round refuses new taps ──────────────────────────────────────
{
  const co = await confirm(closeIso, 2410);
  await closeRound(r.data.id, co, 2410);
  const late = await buyPosition(bob, { marketId, side: "YES", stake: 1_000, idempotencyKey: "qb-late" });
  ok("27 · a closed round refuses a late tap", !late.ok, late.ok ? "accepted a bet on a closed round!" : late.error);
}

// ═══════════════════════════════════════════════════════════════════════════
// 28 · THE DEFAULT LANDING — a player with NO query string must reach a PLAYABLE asset
// ═══════════════════════════════════════════════════════════════════════════
//
// 🔴 `getBoard()` defaulted to `assets[0]`. An enabled asset with NO chains yields
// `durations: []`, which falls to `activeDuration: null` and returns `chainPaused: true` with an
// empty board. So a player landing on `/updown` could be told "no games" while a round was LIVE
// on the very next asset.
//
// ⛔ THE OPERATOR GUIDE ACTIVELY INVITES THIS. It tells the operator to pick whichever asset they
// like, and production has four assets enabled while typically ONE carries a chain. It worked only
// because BTC happened to sort first AND happened to be the asset the chain was built on — build
// the first chain on gold instead and the board goes dark. That is luck, not behaviour.
{
  // A second enabled asset with NO chains, planted BEFORE the playable one in sort order, which
  // is exactly the shape production is one operator decision away from.
  const idle = await createAsset({
    key: "IDLE", symbol: "ETH/USD", nameEn: "Ethereum", nameSw: "Ethereum", nameZh: "以太坊",
    iconKey: "crypto", priceSourceUrl: "https://www.kitco.com/price/precious-metals",
    category: "crypto", decimals: 2, minMoveTicks: 2, sortOrder: -10,
  }, "off");
  if (!idle.ok) {
    ok("28.1 · (setup) an idle enabled asset was created", false, idle.error);
  } else {
    await setAssetEnabled(idle.data.id, true, "off");

    const board = await getBoard({ userId: alice });
    ok("28.1 · ⭐ with no query string the board lands on an asset that HAS a chain",
       board.activeAsset?.key === "XAU",
       `landed on ${board.activeAsset?.key ?? "(none)"} · durations ${JSON.stringify(board.activeAsset?.durations ?? [])}`);
    ok("28.2 · …so a duration resolves and the board is not reported paused",
       board.activeDuration === 5 && board.chainPaused === false,
       `duration ${board.activeDuration} · paused ${board.chainPaused}`);
    // ⛔ An EXPLICIT ask still wins, even onto an idle asset: a player who asked for gold must be
    // told gold is idle, not silently moved somewhere else.
    const asked = await getBoard({ assetKey: "IDLE", userId: alice });
    ok("28.3 · ⛔ an EXPLICIT ?asset= still wins, even onto an idle asset",
       asked.activeAsset?.key === "IDLE" && asked.activeDuration === null,
       `landed on ${asked.activeAsset?.key} · duration ${asked.activeDuration}`);
    // And the idle asset stays VISIBLE in the switcher — hiding it would answer
    // "why isn't gold in the list?" with silence.
    ok("28.4 · …and the idle asset is still listed, not hidden",
       board.assets.some((a) => a.key === "IDLE"));
  }
}

console.log(`\nupdown-quickbet: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.error("\n✗ QUICK-BET BROKEN — the one-tap card would mischarge or misreport the player's position.\n"); process.exit(1); }
console.log("updown-quickbet: OK — one tap places once, duplicates pay once, distinct taps stack, 'you're in' is per-viewer, bad taps refused");
