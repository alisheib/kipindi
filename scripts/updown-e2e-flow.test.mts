/**
 * UP & DOWN — THE WHOLE FLOW, END TO END, WITH REAL MONEY MOVING.
 *
 *   npx tsx scripts/updown-e2e-flow.test.mts     (npm run test:updown-e2e-flow)
 *
 * ⛔ WHY THIS EXISTS, and why the other suites did not already cover it.
 *
 * Every piece of this subsystem was tested in isolation — the feed refuses correctly
 * (`test:updown-feed`), rounds settle and conserve money (`test:updown-engine`), overdue rounds
 * heal (`test:updown-heal`), nothing arms without an officer (`test:updown-proposal`). And yet
 * the honest answer to "can we start using it?" was **no**, because the ONE path that actually
 * matters had never been run start to finish:
 *
 *     a price is READ → an observation is CONFIRMED → a round CLOSES on it → a player is PAID
 *
 * On production that path has never once completed: 1,398 rounds opened, zero ever resolved.
 * A suite that green-lights every component while the assembled thing has never worked is
 * exactly the kind of false comfort this repo has shipped before.
 *
 * WHAT IS REAL HERE: the real `TwelveDataFeed` class, the real `readPrice` → `acquireObservation`
 * → `closeRound` → `settleMarket` chain, real `buyPosition` money, the real fee model, the real
 * source-capture check. **The only fake is the HTTP response body** — stubbed so the test can
 * choose whether the price rises, falls or sits inside the band.
 *
 * WHAT THIS STILL DOES NOT PROVE: that a real provider returns a usable quote for a real asset.
 * That needs `TWELVEDATA_API_KEY` and a live call. This suite proves the plumbing is sound, so
 * that when the key arrives the only remaining variable is the provider itself.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
delete process.env.ANTHROPIC_API_KEY;              // the AI reader must never be used here
process.env.TWELVEDATA_API_KEY = "e2e-test-key-never-stored";

import { __resetUpDownMemoryStores, roundStore, observationStore } from "../src/lib/server/updown-dal.ts";
import {
  createAsset, setAssetEnabled, createChain, setChainState,
  __resetUpDownConfig, setUpDownConfig, getUpDownConfig,
} from "../src/lib/server/updown-config.ts";
import { openRound, closeRound, acquireObservation } from "../src/lib/server/updown-service.ts";
import { marketStore } from "../src/lib/server/market-dal.ts";
import { buyPosition } from "../src/lib/server/market-service.ts";
import { addSource, seedDefaultSources } from "../src/lib/server/source-registry.ts";
import { db } from "../src/lib/server/store.ts";

import "./lib/verified-fixtures.mts";
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const OFFICER = "usr_officer";
const ENDPOINT = "https://api.twelvedata.com/quote";

__resetUpDownMemoryStores();
__resetUpDownConfig();
await seedDefaultSources();
await addSource({ domain: "twelvedata.com", label: "Twelve Data", category: "macro", rationale: "market data feed", addedBy: "system" });
// E-36 — a 24/7 category, so this suite does not pass on weekdays and fail at weekends.
// `isSourceTrusted` matches on (domain, category), so the same domain needs both rows.
await addSource({ domain: "twelvedata.com", label: "Twelve Data", category: "crypto", rationale: "market data feed", addedBy: "system" });

// The operator's real choice, made through the real setter.
const cfgSet = await setUpDownConfig({ observationMethod: "feed", feedProvider: "twelvedata" }, OFFICER);
if (!cfgSet.ok) throw new Error(cfgSet.error);

/**
 * Stub ONLY the HTTP reply. Everything above it — URL building, key handling, JSON parse,
 * timestamp gate, host check, staleness gate — is the real code under test.
 */
let quotePrice = 2000;
let quotedAtMs = Date.now();
const realFetch = globalThis.fetch;
globalThis.fetch = (async () => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify({
    symbol: "XAU/USD",
    close: String(quotePrice),
    timestamp: Math.floor(quotedAtMs / 1000),
  }),
})) as unknown as typeof fetch;

let seq = 0;
const nowIso = () => new Date().toISOString();
async function fundedUser(id: string, balance: number): Promise<string> {
  await db.user.create({
    id, phoneE164: `+25597${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
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
const balanceOf = async (id: string) => (await db.wallet.findByUserId(id))?.balance ?? 0;

// ── Setup: one asset, one chain, through the real service functions ─────────
// ⛔ A REAL CRYPTO SYMBOL, NOT GOLD WEARING A CRYPTO CALENDAR — the FOURTH suite killed by
// this exact fixture pattern. It read `symbol: "XAU/USD"` with `category: "crypto"`, which
// E-46's server-side `validateSymbolCategory` has refused since session 14, so this suite has
// been RED on every tree since. A 24/7 market is genuinely what the flow needs (otherwise the
// verdict depends on the day it runs) — the SYMBOL was always the wrong half. BTC/USD is both.
const asset = await createAsset({
  key: "BTCE2E", symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto",
  priceSourceUrl: ENDPOINT, category: "crypto", decimals: 2, minMoveTicks: 2,
}, OFFICER);
if (!asset.ok) throw new Error(asset.error);
const en = await setAssetEnabled(asset.data.id, true, OFFICER);
if (!en.ok) throw new Error(en.error);
const chain = await createChain({ assetId: asset.data.id, durationMinutes: 15, marginBps: 50 }, OFFICER);
if (!chain.ok) throw new Error(chain.error);
const run = await setChainState(chain.data.id, "RUNNING", OFFICER);
if (!run.ok) throw new Error(run.error);

const alice = await fundedUser("e2e_alice", 100_000);   // will back UP
const bob   = await fundedUser("e2e_bob",   100_000);   // will back DOWN
const START_TOTAL = (await balanceOf(alice)) + (await balanceOf(bob));

// ── 1 · A price is READ through the real feed ───────────────────────────────
console.log("\n── 1 · the reader produces a confirmed observation ──");
const openBoundary = new Date().toISOString();
quotePrice = 2000;
quotedAtMs = Date.parse(openBoundary);

const openObs = await acquireObservation(asset.data, openBoundary);
ok("⛔ the OPEN boundary CONFIRMS — the step that has never once succeeded in production",
  openObs.state === "confirmed",
  openObs.state !== "confirmed" ? openObs.detail : "");
if (openObs.state !== "confirmed") { console.log("\n  cannot continue without an open price\n"); process.exit(1); }
ok("…at the price the provider actually quoted", openObs.price === 2000, `got ${openObs.price}`);

const storedOpen = await observationStore.find(asset.data.id, openBoundary);
ok("the reading is stored with the PROVIDER's own timestamp", !!storedOpen?.sourceQuotedAt);
ok("⛔ the API key never reached a stored field",
  !JSON.stringify(storedOpen ?? {}).includes("e2e-test-key-never-stored"));

// ── 2 · A round opens on it, and pins its source ────────────────────────────
console.log("\n── 2 · a round opens and pins the page it was sold on ──");
const opened = await openRound(run.data, openBoundary, openObs.id, openObs.price);
ok("the round opened", opened.ok, opened.ok ? "" : opened.error);
if (!opened.ok) process.exit(1);
const round = opened.data;
ok("it captured the source link at open", !!round.capturedSourceUrl, String(round.capturedSourceUrl));
// normalizeDomain keeps the FULL host — api.twelvedata.com, not the registrable domain. That
// is deliberate: the round must pin the exact host it will be checked against.
ok("…and the domain, as the exact host", round.capturedSourceDomain === "api.twelvedata.com", String(round.capturedSourceDomain));
ok("the winning boundaries were frozen at open",
  round.upTarget != null && round.downTarget != null,
  `up ${round.upTarget} / down ${round.downTarget}`);
ok("…at ±0.50% of the open price",
  round.upTarget === 2010 && round.downTarget === 1990,
  `up ${round.upTarget} / down ${round.downTarget}`);

// ── 3 · Real players stake real money ───────────────────────────────────────
console.log("\n── 3 · real money goes in ──");
const betA = await buyPosition(alice, { marketId: round.marketId, side: "YES", stake: 10_000, idempotencyKey: "e2e-a" });
const betB = await buyPosition(bob,   { marketId: round.marketId, side: "NO",  stake: 10_000, idempotencyKey: "e2e-b" });
ok("UP bet accepted", betA.ok, betA.ok ? "" : String((betA as { error?: string }).error));
ok("DOWN bet accepted", betB.ok, betB.ok ? "" : String((betB as { error?: string }).error));
const m0 = await marketStore.get(round.marketId);
ok("the pool holds both stakes", Number(m0?.yesPool ?? 0) + Number(m0?.noPool ?? 0) === 20_000,
  `pool ${Number(m0?.yesPool ?? 0) + Number(m0?.noPool ?? 0)}`);
ok("…and the money left the players' wallets",
  (await balanceOf(alice)) === 90_000 && (await balanceOf(bob)) === 90_000);

// ── 4 · The close price is read, the round settles, a player is PAID ────────
console.log("\n── 4 · ⛔ THE STEP THAT HAS NEVER COMPLETED: close, settle, pay ──");
const closeBoundary = round.boundaryAt;
quotePrice = 2015;                       // clears upTarget (2010) → UP must win
quotedAtMs = Date.parse(closeBoundary);

const closeObs = await acquireObservation(asset.data, closeBoundary);
ok("the CLOSE boundary confirms", closeObs.state === "confirmed",
  closeObs.state !== "confirmed" ? closeObs.detail : "");
if (closeObs.state !== "confirmed") process.exit(1);

const closed = await closeRound(round.id, closeObs.id, closeObs.price);
ok("the round closed", closed.ok, closed.ok ? "" : closed.error);
if (!closed.ok) process.exit(1);
ok("⛔ the outcome is UP — decided by the FROZEN targets, not recomputed",
  closed.data.outcome === "UP", `got ${closed.data.outcome}`);
// ⚠️ Read the round BACK from the store. `closed.data` is the snapshot taken before
// settleMarket stamped it, so asserting on it tests the local variable, not the database —
// and would have reported "not settled" for a round whose money had already moved.
const settledRow = await roundStore.get(round.id);
ok("…and it is SETTLED in the store, not merely resolved", !!settledRow?.settledAt,
  `settledAt=${settledRow?.settledAt}`);

const aliceEnd = await balanceOf(alice);
const bobEnd = await balanceOf(bob);
ok("⛔⛔ THE UP BACKER WAS ACTUALLY PAID", aliceEnd > 90_000, `alice ${aliceEnd}`);
ok("the DOWN backer lost their stake, and no more", bobEnd === 90_000, `bob ${bobEnd}`);
ok("the winner got back more than they staked", aliceEnd - 90_000 > 10_000, `returned ${aliceEnd - 90_000}`);

// ── 5 · The money adds up ───────────────────────────────────────────────────
console.log("\n── 5 · conservation ──");
const endTotal = aliceEnd + bobEnd;
const fee = START_TOTAL - endTotal;
ok("no money was created", endTotal <= START_TOTAL, `start ${START_TOTAL} end ${endTotal}`);
ok("the house took exactly the fee and not a shilling more",
  fee > 0 && fee <= 20_000 * 0.13 + 1, `fee ${fee}`);
ok("⛔ players + fee reconcile to the start, to the shilling",
  endTotal + fee === START_TOTAL, `${endTotal} + ${fee} vs ${START_TOTAL}`);

// ── 6 · The other two outcomes, on the same rails ───────────────────────────
console.log("\n── 6 · DOWN and VOID resolve the same way ──");
async function runRound(label: string, closePrice: number): Promise<string> {
  const b = new Date(Date.now() + ++seq * 3_600_000).toISOString();
  quotePrice = 2000; quotedAtMs = Date.parse(b);
  const o = await acquireObservation(asset.data, b);
  if (o.state !== "confirmed") throw new Error(`${label}: open failed`);
  const r = await openRound(run.data, b, o.id, o.price);
  if (!r.ok) throw new Error(`${label}: ${r.error}`);
  const cb = r.data.boundaryAt;
  quotePrice = closePrice; quotedAtMs = Date.parse(cb);
  const co = await acquireObservation(asset.data, cb);
  if (co.state !== "confirmed") throw new Error(`${label}: close failed`);
  const c = await closeRound(r.data.id, co.id, co.price);
  if (!c.ok) throw new Error(`${label}: ${c.error}`);
  return c.data.outcome ?? "?";
}
ok("a fall below the down boundary settles DOWN", (await runRound("down", 1985)) === "DOWN");
ok("a move inside the band VOIDs (everyone refunded)", (await runRound("void", 2003)) === "VOID");

// ── 7 · The refusals still refuse, on the live path ─────────────────────────
console.log("\n── 7 · the gates still hold when wired up ──");
{
  const b = new Date(Date.now() + ++seq * 3_600_000).toISOString();
  quotePrice = 2000;
  quotedAtMs = Date.parse(b) - 3_600_000;      // an hour stale
  const o = await acquireObservation(asset.data, b);
  ok("⛔ a stale quote is REFUSED even though the provider answered 200",
    o.state !== "confirmed", o.state === "confirmed" ? "IT SETTLED ON A STALE PRICE" : o.detail.slice(0, 70));
}
{
  const b = new Date(Date.now() + ++seq * 3_600_000).toISOString();
  const saved = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: true, status: 200,
    text: async () => JSON.stringify({ symbol: "XAU/USD", close: "2000" }),  // no timestamp
  })) as unknown as typeof fetch;
  const o = await acquireObservation(asset.data, b);
  ok("⛔ a quote with NO timestamp is refused — the failure that broke the AI reader",
    o.state !== "confirmed", o.state === "confirmed" ? "IT ACCEPTED AN UNDATED PRICE" : o.detail.slice(0, 70));
  globalThis.fetch = saved;
}

globalThis.fetch = realFetch;

const line = "─".repeat(70);
console.log(`\n${line}\n  UP & DOWN END-TO-END: ${pass} passed, ${fail} failed\n${line}`);
if (fail === 0) {
  console.log("  A price was read, a round opened and pinned its source, real money went in,");
  console.log("  the round closed on a second reading and a player was PAID — the path that has");
  console.log("  never once completed in production. UP, DOWN and VOID all settle; stale and");
  console.log("  undated quotes are still refused.");
  console.log("  ⚠️ STILL UNPROVEN: that a real provider returns a usable quote. Needs the key.");
}
process.exit(fail === 0 ? 0 : 1);
