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
import { createAsset, setAssetEnabled, createChain, setChainState, __resetUpDownConfig } from "../src/lib/server/updown-config.ts";
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
const asset = await createAsset({ key: "XAU", symbol: "XAU/USD", nameEn: "Gold", nameSw: "Dhahabu", nameZh: "黄金", iconKey: "gold", priceSourceUrl: "https://www.kitco.com/price/precious-metals", category: "macro", decimals: 2, minMoveTicks: 1 }, "off");
if (!asset.ok) throw new Error(asset.error);
await setAssetEnabled(asset.data.id, true, "off");
const chainR = await createChain({ assetId: asset.data.id, durationMinutes: 5, minStake: 100, maxStake: 50_000 }, "off");
if (!chainR.ok) throw new Error(chainR.error);
await setChainState(chainR.data.id, "RUNNING", "off");
const chain = (await chainStore.get(chainR.data.id))!;

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

// ── 4 · hedge — betting DOWN too shows on both sides ─────────────────────────
{
  const res = await buyPosition(alice, { marketId, side: "NO", stake: 4_000, idempotencyKey: "qb-a-down" });
  ok("9 · a DOWN tap places", res.ok, res.ok ? "" : res.error);
  const m = await mine(alice);
  ok("10 · the card shows BOTH sides after a hedge", m.up === 10_000 && m.down === 4_000, `up ${m.up} down ${m.down}`);
}

// ── 5 · 'you're in' is PER-VIEWER — never leaks between players ───────────────
{
  await buyPosition(bob, { marketId, side: "NO", stake: 7_000, idempotencyKey: "qb-b-1" });
  const mb = await mine(bob);
  const ma = await mine(alice);
  ok("11 · Bob sees only Bob's stake", mb.up === 0 && mb.down === 7_000, `bob up ${mb.up} down ${mb.down}`);
  ok("12 · Alice is unchanged by Bob's bet", ma.up === 10_000 && ma.down === 4_000, `alice up ${ma.up} down ${ma.down}`);
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

console.log(`\nupdown-quickbet: ${pass} passed, ${fail} failed`);
if (fail > 0) { console.error("\n✗ QUICK-BET BROKEN — the one-tap card would mischarge or misreport the player's position.\n"); process.exit(1); }
console.log("updown-quickbet: OK — one tap places once, duplicates pay once, distinct taps stack, 'you're in' is per-viewer, bad taps refused");
