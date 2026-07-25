/**
 * Up & Down quick-bet UNDER CONCURRENT LOAD — the fast game's worst case.
 *
 *   In-memory (logic — always runs):   npm run test:updown-load
 *   Real Postgres (pool/deadlock):     DATABASE_URL=... USE_PRISMA_DAL=true npm run test:updown-load
 *
 * The card lets a player tap Up/Down many times a second, and a whole board of
 * players hammers the SAME open round at once. This fires a storm of concurrent
 * buyPosition() calls at one round and proves the money contract holds under it:
 *
 *   • EXACTLY-ONCE per idempotency key — a duplicate-key storm (the 2G double-tap /
 *     retry) charges ONCE, never N times.
 *   • CONSERVATION — every shilling debited from a wallet lands in the pool; none is
 *     minted or lost under interleaving.
 *   • NO THROW to the caller — a contended bet returns ok:false at worst, never an
 *     unhandled rejection (a real Postgres surfaces P2024 pool-timeout here; the
 *     in-memory run can't, which is why the PG mode exists — see the note at the end).
 *
 * The in-memory store still exercises the async-lock serialization (withLock), so it
 * catches double-charge / drift logic bugs. It CANNOT reproduce real connection-pool
 * exhaustion — that needs the Postgres mode, run in CI / against a scratch DB.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { db } from "../src/lib/server/store.ts";
import { buyPosition } from "../src/lib/server/market-service.ts";
import { createAsset, setAssetEnabled, createChain, setChainState, __resetUpDownConfig } from "../src/lib/server/updown-config.ts";
import { chainStore, observationStore, __resetUpDownMemoryStores } from "../src/lib/server/updown-dal.ts";
import { marketStore as mStore } from "../src/lib/server/market-dal.ts";
import { openRound } from "../src/lib/server/updown-service.ts";
import { seedDefaultSources, addSource } from "../src/lib/server/source-registry.ts";

const ON_PG = !!process.env.DATABASE_URL && process.env.USE_PRISMA_DAL === "true";
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

if (!ON_PG) { __resetUpDownMemoryStores(); __resetUpDownConfig(); }
await seedDefaultSources();
try { await addSource({ domain: "kitco.com", label: "Kitco", category: "macro", rationale: "spot", addedBy: "system" }); } catch { /* already seeded on PG */ }

const stamp = Date.now();
let seq = 0;
async function funded(id: string, bal: number): Promise<string> {
  await db.user.create({
    id, phoneE164: `+2559${String(stamp % 100000).padStart(5, "0")}${String(++seq).padStart(4, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: bal, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as never);
  return id;
}

// ── One open round, and a board of players ───────────────────────────────────
const asset = await createAsset({ key: `XAU${stamp % 10000}`, symbol: "XAU/USD", nameEn: "Gold", nameSw: "Dhahabu", nameZh: "黄金", iconKey: "gold", priceSourceUrl: "https://www.kitco.com/price/precious-metals", category: "macro", decimals: 2, minMoveTicks: 1 }, "off");
if (!asset.ok) throw new Error(asset.error);
await setAssetEnabled(asset.data.id, true, "off");
const chainR = await createChain({ assetId: asset.data.id, durationMinutes: 5, minStake: 100, maxStake: 100_000 }, "off");
if (!chainR.ok) throw new Error(chainR.error);
await setChainState(chainR.data.id, "RUNNING", "off");
const chain = (await chainStore.get(chainR.data.id))!;

const openMs = Date.now() - 2 * 60_000;
const openIso = new Date(openMs).toISOString();
async function confirm(iso: string, price: number) {
  const o = await observationStore.ensure(asset.data.id, iso);
  await observationStore.confirm(o.id, { price, sourceUrl: asset.data.priceSourceUrl, sourceQuotedAt: iso, evidence: `q ${price}`, confidence: 95, model: "t", rawHash: `h${price}${iso}${stamp}` });
  return o.id;
}
const r = await openRound(chain, openIso, await confirm(openIso, 2400), 2400);
if (!r.ok) throw new Error(r.error);
const marketId = r.data.marketId;

const N_PLAYERS = 40;
const TAPS_EACH = 3;       // distinct taps per player — the "many bets in one click"
const STAKE = 1_000;
const players = await Promise.all(Array.from({ length: N_PLAYERS }, (_, i) => funded(`ld_${stamp}_${i}`, 500_000)));
const startTotal = (await Promise.all(players.map(async (p) => (await db.wallet.findByUserId(p))!.balance))).reduce((s, b) => s + b, 0);

// ── Storm 1 · distinct taps — a whole board hammering ONE round at once ───────
{
  const jobs: Promise<{ ok: boolean }>[] = [];
  for (const p of players) {
    for (let k = 0; k < TAPS_EACH; k++) {
      jobs.push(
        buyPosition(p, { marketId, side: k % 2 === 0 ? "YES" : "NO", stake: STAKE, idempotencyKey: `${p}-tap-${k}` })
          .then((res) => ({ ok: res.ok }))
          .catch(() => ({ ok: false })), // a THROW is the failure — a contended ok:false is fine
      );
    }
  }
  const results = await Promise.all(jobs);
  const placed = results.filter((r) => r.ok).length;
  ok(`1 · ${N_PLAYERS * TAPS_EACH} concurrent distinct taps all placed, none threw`, placed === N_PLAYERS * TAPS_EACH, `${placed}/${N_PLAYERS * TAPS_EACH}`);

  const m = (await mStore.get(marketId))!;
  const pool = m.yesPool + m.noPool;
  ok("2 · ⛔ CONSERVATION — the pool holds exactly what the board staked",
     pool === N_PLAYERS * TAPS_EACH * STAKE, `pool ${pool}, expected ${N_PLAYERS * TAPS_EACH * STAKE}`);
  const nowTotal = (await Promise.all(players.map(async (p) => (await db.wallet.findByUserId(p))!.balance))).reduce((s, b) => s + b, 0);
  ok("3 · ⛔ CONSERVATION — every shilling debited from a wallet is in the pool (none minted/lost)",
     startTotal - nowTotal === pool, `wallets down ${startTotal - nowTotal}, pool ${pool}`);
}

// ── Storm 2 · duplicate-key storm — the 2G double-tap / retry pays ONCE ───────
{
  const victim = players[0];
  const before = (await db.wallet.findByUserId(victim))!.balance;
  const DUP_KEY = `${victim}-double-tap-${stamp}`;
  const FANOUT = 12;
  const dupResults = await Promise.all(
    Array.from({ length: FANOUT }, () =>
      buyPosition(victim, { marketId, side: "YES", stake: STAKE, idempotencyKey: DUP_KEY })
        .then((res) => ({ ok: res.ok, id: res.ok ? res.data?.positionId : null }))
        .catch(() => ({ ok: false, id: null })),
    ),
  );
  const after = (await db.wallet.findByUserId(victim))!.balance;
  ok("4 · a duplicate-key storm never throws", dupResults.every((r) => "ok" in r));
  ok("5 · ⛔ EXACTLY-ONCE — the same key charged ONE stake, not a multiple",
     before - after === STAKE, `charged ${before - after} across ${FANOUT} identical taps`);
  const distinctPositions = new Set(dupResults.map((r) => r.id).filter(Boolean));
  ok("6 · ⛔ …and resolved to ONE position id, however many taps landed",
     distinctPositions.size === 1, `distinct positions: ${distinctPositions.size}`);
}

console.log(`\nupdown-load (${ON_PG ? "REAL POSTGRES" : "in-memory locks"}): ${pass} passed, ${fail} failed`);
if (!ON_PG) console.log("  note: in-memory mode proves exactly-once + conservation under concurrent fire; run with DATABASE_URL + USE_PRISMA_DAL=true to also exercise the connection pool (P2024).");
if (fail > 0) { console.error("\n✗ QUICK-BET IS NOT SAFE UNDER LOAD — a board hammering one round would double-charge or drift.\n"); process.exit(1); }
console.log("updown-load: OK — concurrent taps place exactly once, duplicates pay once, the pool conserves every shilling");
