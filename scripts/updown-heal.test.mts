/**
 * Up & Down SELF-HEALER — the guarantee that a stake always has a way out.
 *
 *   npx tsx scripts/updown-heal.test.mts     (npm run test:updown-heal)
 *
 * 🔴 THE FINDING (E-24, live QA campaign, production, 2026-08-01). A player's real
 * TZS 500 entered Up & Down round #155 and had **no path out** — not by the engine,
 * not by a sweep, not by an operator. Five independent mechanisms had to be absent,
 * and all five were:
 *
 *   ① `retryBackoffSeconds` was DEAD CONFIG — nothing in src/ read it.
 *   ② `advanceChain` orphans a pending round at the very next boundary, because it
 *      closes only the round `chain.currentRoundId` still points at — and `openRound`
 *      has already moved that pointer.
 *   ③ The market settle sweep deliberately excludes Up & Down.
 *   ④ STOPPING the chain does not void its open rounds.
 *   ⑤ `voidRoundByOperator` had no UI, no action, no route (E-23).
 *
 * THE INVARIANT THIS SUITE EXISTS TO PIN:
 *
 *   ⭐ Every round reaches a terminal state — resolved, or voided with every stake
 *      refunded in full — within `abandonAfterSeconds` of its own boundary, whatever
 *      the oracle, the AI budget, the chain's state, or the timers do.
 *
 * HOW IT TESTS, and why this shape. §2 does not assert on source text and does not
 * call a helper: it **reproduces the production incident** — real chain, real bet
 * through `buyPosition`, real orphaning through `advanceChain`, chain stopped through
 * the real `setChainState` — and then proves the money comes back through the real
 * settlement path. E-4 established that a missing mechanism is precisely what reads as
 * present in review; the only convincing evidence is the wallet balance afterwards.
 *
 * THE ONLY THING FAKED IS THE CLOCK, and it is injected (`healStuckRounds({ now })`)
 * rather than patched — no row is edited behind a service's back, no lock is bypassed.
 *
 * THE PRICE READER IS NEVER STUBBED AWAY, and after the 2026-08-01 feed merge it is worth
 * being precise about WHICH refusal drives the ladder here, because the two are no longer
 * interchangeable. The default reader is now the FEED (`observationMethod: "feed"`,
 * `feedProvider: "mock"`). The mock quotes the present instant, so against these future
 * boundaries it is refused as `stale` — a genuine SOURCE failure, which correctly spends an
 * attempt. That is what lets §4 climb a real ladder locally, for free.
 *
 * ⛔ It is deliberately NOT the `no-api-key` path. That one is an OPERATOR state and is now
 * carved out of the attempt budget (§11) — a suite resting on it would have a ladder that
 * never climbs, and would prove nothing at all. §11 tests that carve-out head-on, including
 * the one combination neither source branch had: the carve-out plus §3's deadline.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
delete process.env.ANTHROPIC_API_KEY; // the oracle must refuse locally, never dial out

import { assetStore, chainStore, roundStore, observationStore, __resetUpDownMemoryStores } from "../src/lib/server/updown-dal.ts";
import {
  createAsset, setAssetEnabled, createChain, setChainState, setUpDownConfig, getUpDownConfig,
  __resetUpDownConfig,
  retryDelaySeconds, ladderSpanSeconds, abandonAfterSeconds, ABANDON_GRACE_SECONDS,
  DEFAULT_UPDOWN_CONFIG,
  // E-86 — whether a refusal spends one of the boundary's lives is a MONEY decision.
  refusalCostsAnAttempt,
} from "../src/lib/server/updown-config.ts";
// E-86 — one rule for "is this a rate limit", shared by both readers and both report shapes.
import { isRateLimit } from "../src/lib/server/updown-feed.ts";
// §6 · a boundary can only open a round while its own SPAN still has room — see E83.0b.
import { roundSpanMinutes } from "../src/lib/updown-durations.ts";
import {
  openRound, closeRound, advanceChain, healStuckRounds, voidRoundByOperator, acquireObservation,
  settlementNote,
  // E-63 — the seal's verdict arithmetic, proven per live asset in §2c.
  decideOutcomeByTargets,
} from "../src/lib/server/updown-service.ts";
import { computeTargets } from "../src/lib/server/updown-config.ts";
import { findSymbol } from "../src/lib/server/updown-symbols.ts";
import { marketStore } from "../src/lib/server/market-dal.ts";
import { buyPosition, listPositionsForMarket } from "../src/lib/server/market-service.ts";
import { addSource, seedDefaultSources } from "../src/lib/server/source-registry.ts";
import { getAuditPage } from "../src/lib/server/audit.ts";
import { db } from "../src/lib/server/store.ts";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => (existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p), "utf8") : "");

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const OFFICER = "usr_officer";
__resetUpDownMemoryStores();
__resetUpDownConfig();
await seedDefaultSources();
await addSource({ domain: "kitco.com", label: "Kitco", category: "macro", rationale: "spot metals", addedBy: "system" });
// E-36 — the fixture below is a 24/7 category so this suite is calendar-independent;
// `isSourceTrusted` matches on (domain, category), so the same domain needs both rows.
await addSource({ domain: "kitco.com", label: "Kitco", category: "crypto", rationale: "test fixture", addedBy: "system" });

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
const balanceOf = async (id: string) => (await db.wallet.findByUserId(id))?.balance ?? 0;

const START_BALANCE = 100_000;
const alpha = await fundedUser("heal_alpha", START_BALANCE);
const bravo = await fundedUser("heal_bravo", START_BALANCE);
const START_TOTAL = (await balanceOf(alpha)) + (await balanceOf(bravo));

// ── Asset + a 5-minute chain, through the real registry ──────────────────────
const a = await createAsset({
  // ⛔ A REAL CRYPTO SYMBOL, NOT GOLD WEARING A CRYPTO CALENDAR. This read
  // `symbol: "XAU/USD"` with `category: "crypto"`, and E-46's server-side
  // `validateSymbolCategory` — added in session 14 to stop exactly that misconfiguration —
  // has refused it ever since, so this whole suite has been RED on every tree since then and
  // nobody noticed. **THIRD SUITE KILLED BY THIS FIXTURE PATTERN** (`test:updown-engine`,
  // session 15; `test:updown-proposal`, session 16). The comment below explains why a 24/7
  // market is needed and it was always right — the SYMBOL was always wrong. BTC/USD is both.
  key: "BTCHEAL", symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto",
  // ⚠️ E-36 · `crypto`, i.e. a 24/7 market, ON PURPOSE. This suite is about the RETRY
  // LADDER, and the money path now refuses to read a price while the asset's market is
  // shut — as an operator-state refusal, which deliberately does NOT burn an attempt.
  // With a `macro` fixture and a grid anchored to `Date.now()`, every ladder case here
  // passed Monday-Friday and failed at the weekend. A suite whose verdict depends on the
  // day it runs is a suite that lies. The calendar has its own proof:
  // `npm run test:market-calendar`, plus §12 of `test:updown-engine` for the integration.
  priceSourceUrl: "https://www.kitco.com/price/precious-metals", category: "crypto",
  decimals: 2, minMoveTicks: 2,
}, OFFICER);
if (!a.ok) throw new Error(a.error);
await setAssetEnabled(a.data.id, true, OFFICER);
const asset = (await assetStore.get(a.data.id))!;

const c = await createChain({ assetId: asset.id, durationMinutes: 5 }, OFFICER);
if (!c.ok) throw new Error(c.error);
await setChainState(c.data.id, "RUNNING", OFFICER);
const chain = (await chainStore.get(c.data.id))!;
const anchorMs = Date.parse(chain.gridAnchorAt);

// ⚠️ EVERY ROUND IS OPENED ON A **FUTURE** BOUNDARY, and elapsed time is then
// injected as `now`. Not a convenience: `createMarket` refuses a past `resolutionAt`
// outright ("Cannot create a market with a past or invalid resolution date"), and
// `buyPosition` refuses a stake once it has passed — both correct, and both mean a
// back-dated round cannot be built through the real code at all. So the clock moves,
// not the rows.
/** The grid boundary k steps after the anchor. A round opened at `B(k)` has its own
 *  boundary at `B(k+1)`, one chain duration later. */
const B = (k: number) => new Date(anchorMs + k * 5 * 60_000).toISOString();
const SEC = 1000;

// Production's GOLD chain takes TZS 500 stakes, and the incident being reproduced is a
// 500 stake, so the floor is lowered to match rather than the reproduction being
// rounded up to fit the default.
// ⛔ 2026-08-14 · setUpDownConfig REFUSES a sub-floor minimum now — 500 is below the
// platform rule of TZS 1,000. And its result is CHECKED: the first version of this line
// discarded it, so when the write started failing the run died 30 lines later on
// "open price did not confirm" and blamed the price feed for a config refusal.
{
  const cfgSet = await setUpDownConfig({ defaultMinStake: 1_000 }, OFFICER);
  if (!cfgSet.ok) throw new Error("fixture: setUpDownConfig refused — " + cfgSet.error);
}

/**
 * Set an observation's `lastAttemptAt` to a chosen instant.
 *
 * The one place this suite reaches into a store rather than through it. `recordAttempt`
 * stamps the REAL clock, so with time injected the two would disagree and the backoff
 * gate could not be exercised at all. It writes the same column, with the same kind of
 * value, on the in-memory store these suites run against — the clock again, not the
 * behaviour. Everything the assertions actually check still goes through the services.
 */
async function setLastAttempt(obsId: string, iso: string): Promise<void> {
  const o = (await observationStore.get(obsId))!;
  Object.assign(o, { lastAttemptAt: iso });
}

// ═══════════════════════════════════════════════════════════════════════════
// 1 · THE LADDER ARITHMETIC — pure, so the deadline can be reasoned about
// ═══════════════════════════════════════════════════════════════════════════
{
  const cfg = await getUpDownConfig();
  ok("1.1 · attempt 1 is taken AT the boundary, with no delay", retryDelaySeconds(cfg, 0) === 0, String(retryDelaySeconds(cfg, 0)));
  ok("1.2 · rung 1 is 15s", retryDelaySeconds(cfg, 1) === 15, String(retryDelaySeconds(cfg, 1)));
  ok("1.3 · rung 2 is 45s", retryDelaySeconds(cfg, 2) === 45, String(retryDelaySeconds(cfg, 2)));
  ok("1.4 · rung 3 is 120s", retryDelaySeconds(cfg, 3) === 120, String(retryDelaySeconds(cfg, 3)));
  ok("1.5 · past the end the LAST rung repeats — never collapses to 0",
     retryDelaySeconds(cfg, 9) === 120, String(retryDelaySeconds(cfg, 9)));
  ok("1.6 · an empty ladder is 0, not NaN", retryDelaySeconds({ ...cfg, retryBackoffSeconds: [] }, 2) === 0);
  ok("1.7 · the ladder spans 15+45+120 = 180s at 4 attempts", ladderSpanSeconds(cfg) === 180, String(ladderSpanSeconds(cfg)));
  ok("1.8 · the deadline is ladder + staleness + grace",
     abandonAfterSeconds(cfg) === 180 + cfg.maxStalenessSeconds + ABANDON_GRACE_SECONDS,
     String(abandonAfterSeconds(cfg)));
  ok("1.9 · defaults put the deadline at 390s — a stake is never stuck longer than ~6½ minutes",
     abandonAfterSeconds(DEFAULT_UPDOWN_CONFIG) === 390, String(abandonAfterSeconds(DEFAULT_UPDOWN_CONFIG)));
  // The deadline must always outlast the ladder, or the backstop would fire first and
  // the ladder would never get to succeed. Must hold for ANY valid config.
  ok("1.10 · the deadline always outlasts the ladder it backs up",
     abandonAfterSeconds(cfg) > ladderSpanSeconds(cfg), `${abandonAfterSeconds(cfg)} vs ${ladderSpanSeconds(cfg)}`);
}

// ── 1b · the config gate that keeps the ladder sane (validated for the first
//         time here, because for the first time the value is READ) ───────────
{
  const zero = await setUpDownConfig({ retryBackoffSeconds: [0, 45] }, OFFICER);
  ok("1.11 · a 0-second rung is refused — it would re-dial the paid oracle every tick", !zero.ok, zero.ok ? "accepted" : "");
  const empty = await setUpDownConfig({ retryBackoffSeconds: [] }, OFFICER);
  ok("1.12 · an empty ladder is refused", !empty.ok);
  const huge = await setUpDownConfig({ retryBackoffSeconds: [99_999] }, OFFICER);
  ok("1.13 · an absurd rung is refused — it would strand a stake for hours", !huge.ok);
  const good = await setUpDownConfig({ retryBackoffSeconds: [15, 45, 120] }, OFFICER);
  ok("1.14 · a sane ladder is accepted", good.ok);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 · THE PRODUCTION INCIDENT, REPRODUCED — and then healed
// ═══════════════════════════════════════════════════════════════════════════
//
// This is round #155. A real bet, orphaned exactly the way production orphaned it, on
// a chain the operator then STOPPED. The assertions before the heal ARE the bug; the
// ones after it are the fix.
let strandedRoundId = "";
let strandedMarketId = "";
{
  const opened = await openRound(chain, B(0), null, null);
  if (!opened.ok) throw new Error(opened.error);
  strandedRoundId = opened.data.id;
  strandedMarketId = opened.data.marketId;

  const bet = await buyPosition(alpha, { marketId: strandedMarketId, side: "YES", stake: 1_000 });   // the platform floor (2026-08-14)
  ok("2.1 · a real stake enters the round", bet.ok, bet.ok ? "" : bet.error);
  ok("2.2 · the money has left the wallet", (await balanceOf(alpha)) === START_BALANCE - 1_000, String(await balanceOf(alpha)));

  // ① ORPHANING. The boundary passes with no confirmed reading, so the round stays
  // pending — and `advanceChain` opens the NEXT round, moving `currentRoundId` off it.
  await chainStore.patch(chain.id, { nextBoundaryAt: B(1) });
  const adv = await advanceChain(chain.id);
  ok("2.3 · the boundary could not confirm (the REAL oracle refused, no network)",
     adv.observation === "pending", `${adv.observation} ${adv.detail ?? ""}`);
  ok("2.4 · ⚠️ THE BUG — the round is still unresolved after its own boundary",
     !(await roundStore.get(strandedRoundId))!.resolvedAt);
  // ⭐ UPDATED 2026-08-05 (E-83), and the change is an IMPROVEMENT, not a weakening.
  // This used to assert the chain had *already moved on*, orphaning the pending round — the
  // bug this section reproduces. Since E-83 a tick that cannot confirm a reading opens no
  // round at all, so `currentRoundId` stays put and that particular orphaning route is gone.
  // The section still does its job: the round below is genuinely stranded (it was opened with
  // a null price directly, above) and the healer still has to rescue it.
  ok("2.5 · ⭐ E-83 — the chain no longer orphans it by opening a priceless successor",
     (await chainStore.get(chain.id))!.currentRoundId === strandedRoundId,
     `currentRoundId=${(await chainStore.get(chain.id))!.currentRoundId}`);

  // ② A further boundary passes. On production this is the point of no return:
  // nothing ever looks at the orphan again.
  await chainStore.patch(chain.id, { nextBoundaryAt: B(2) });
  await advanceChain(chain.id);
  ok("2.6 · ⚠️ THE BUG — a further boundary does not rescue it",
     !(await roundStore.get(strandedRoundId))!.resolvedAt);

  // ③ The operator STOPS the chain, which is what actually happened on production.
  const stopped = await setChainState(chain.id, "STOPPED", OFFICER);
  ok("2.7 · the chain is stopped through the real control", stopped.ok && stopped.data.state === "STOPPED");
  ok("2.8 · ⚠️ THE BUG — stopping the chain does NOT void its open round",
     !(await roundStore.get(strandedRoundId))!.resolvedAt);
  ok("2.9 · ⚠️ THE BUG — the player's money is still gone",
     (await balanceOf(alpha)) === START_BALANCE - 1_000, String(await balanceOf(alpha)));

  // ── THE FIX. One hour after the boundary, with the chain still STOPPED. ────
  const report = await healStuckRounds({ now: Date.parse(B(1)) + 3600 * SEC });
  ok("2.10 · the healer found it on a STOPPED chain — chain state is not a filter",
     report.scanned >= 1, JSON.stringify(report));
  ok("2.11 · it was closed VOID", report.voided >= 1, JSON.stringify(report));

  const healed = (await roundStore.get(strandedRoundId))!;
  ok("2.12 · ⭐ the round is terminal", !!healed.resolvedAt && healed.outcome === "VOID", `${healed.outcome} @ ${healed.resolvedAt}`);
  ok("2.13 · ⭐ and its money moved", !!healed.settledAt);
  ok("2.14 · the void reason is honest — the source failed, nobody guessed",
     healed.voidReason === "source-failed", String(healed.voidReason));

  const positions = await listPositionsForMarket(strandedMarketId);
  ok("2.15 · the stake is no longer OPEN", positions.every((p) => p.status !== "OPEN"), positions.map((p) => p.status).join(","));
  ok("2.16 · it was refunded, not paid out — finalPayout === stake",
     positions.every((p) => Number(p.finalPayout) === Number(p.stake)),
     positions.map((p) => `${p.stake}->${p.finalPayout}`).join(","));

  ok("2.17 · ⭐⭐ THE ACCEPTANCE TEST — the player's TZS 500 is back, to the shilling",
     (await balanceOf(alpha)) === START_BALANCE, String(await balanceOf(alpha)));
  ok("2.18 · the market is VOIDED, not left LIVE",
     (await marketStore.get(strandedMarketId))!.status === "VOIDED",
     (await marketStore.get(strandedMarketId))!.status);
}

// ── 2b · the audit row says WHAT did it ──────────────────────────────────────
//
// A player's balance changed with no human involved. "Who released this money" has to
// be answerable from the compliance record alone.
{
  const rows = getAuditPage({ limit: 1000 }).filter((e) => e.action === "updown.round.healed");
  ok("2.19 · a `updown.round.healed` row exists", rows.length >= 1, `${rows.length} rows`);
  const mine = rows.find((e) => e.targetId === strandedRoundId);
  ok("2.20 · it names the round", !!mine);
  ok("2.21 · it is attributed to the healer, distinguishable from a normal engine close",
     mine?.actorId === "system_updown_healer", String(mine?.actorId));
  ok("2.22 · it is COMPLIANCE, not SYSTEM — money moved", mine?.category === "COMPLIANCE", String(mine?.category));
  const p = (mine?.payload ?? {}) as Record<string, unknown>;
  ok("2.23 · it records how late the round was", typeof p.lateBySeconds === "number", JSON.stringify(p.lateBySeconds));
  ok("2.24 · and whether the money actually moved", p.settled === true, JSON.stringify(p.settled));
  ok("2.25 · it never claims a price was observed", p.closePrice === null, JSON.stringify(p.closePrice));
}

// ═══════════════════════════════════════════════════════════════════════════
// 2c · ⭐ E-63 · THE OPEN-SIDE BACKFILL — the round gets the open it already paid for
// ═══════════════════════════════════════════════════════════════════════════
//
// SOL 5m voided 199 of 201 rounds while a CONFIRMED observation sat at each round's own
// `opensAt` — the price the round needed was in the database, confirmed, and the round
// refunded for want of it (`decideOutcome*` answers `source-failed` to a null ROUND
// price, not to a missing observation). The PRODUCING mechanism is closed — E-83 made
// `advanceChain` refuse to open a priceless round, `generateRoundNow` always refused, and
// the 176 legacy rows were cascade-deleted — so no current code can create the shape.
// This section is the SEAL: if it ever reappears (a new caller, a restore, a regression),
// the healer must stamp the open the round already paid for and let the ordinary close
// path deliver the verdict the market produced, instead of refunding it.
//
// ⚠️ THE CONTROL IS §2 ABOVE, UNCHANGED: a null-open round with NO confirmed open
// observation still voids `source-failed` and refunds in full (2.10–2.18). Together the
// two sections say: the healer never invents a price — and never discards one either.
{
  const opened = await openRound(chain, B(80), null, null); // E-63's shape, verbatim
  if (!opened.ok) throw new Error(opened.error);
  const r0 = (await roundStore.get(opened.data.id))!;
  ok("2c.1 · the E-63 shape: open, priceless, targetless",
     r0.openPrice === null && r0.upTarget === null && r0.downTarget === null);

  // Two sides, so the verdict pays a winner and charges a loser — a one-sided round
  // would refund whatever the prices did and prove nothing about the verdict.
  // ⚠️ FRESH USERS, not alpha/bravo: this is the one section whose money moves
  // DECISIVELY (a fee is kept), and §6–§9 assert alpha's and bravo's balances to the
  // shilling on the premise that every earlier section refunded in full.
  const charlie = await fundedUser("heal_charlie", START_BALANCE);
  const delta = await fundedUser("heal_delta", START_BALANCE);
  const aBefore = await balanceOf(charlie), bBefore = await balanceOf(delta);
  const betUp = await buyPosition(charlie, { marketId: r0.marketId, side: "YES", stake: 1_000 });
  const betDn = await buyPosition(delta, { marketId: r0.marketId, side: "NO", stake: 1_000 });
  ok("2c.2 · both sides carry real stakes", betUp.ok && betDn.ok,
     `${betUp.ok ? "" : betUp.error} ${betDn.ok ? "" : betDn.error}`);

  // The CONFIRMED observation at the round's own `opensAt` — the row production had 178
  // of on SOL alone, every one ignored.
  const OPEN_PRICE = 63_268.0;
  const openObs = await observationStore.ensure(asset.id, r0.opensAt);
  const won = await observationStore.confirm(openObs.id, {
    price: OPEN_PRICE, sourceUrl: asset.priceSourceUrl, sourceQuotedAt: r0.opensAt,
    evidence: null, confidence: 100, model: null, rawHash: null,
  });
  ok("2c.3 · the open observation is CONFIRMED with a price", won);

  // A confirmed close strictly beyond the up target the backfill must compute — the
  // market delivered a decisive UP, at the round's OWN frozen marginBps.
  const expected = computeTargets(OPEN_PRICE, r0.marginBps!, asset);
  const CLOSE_PRICE = Number((expected.upTarget + 5).toFixed(2));
  const closeObs = await observationStore.ensure(asset.id, r0.boundaryAt);
  await observationStore.confirm(closeObs.id, {
    price: CLOSE_PRICE, sourceUrl: asset.priceSourceUrl, sourceQuotedAt: r0.boundaryAt,
    evidence: null, confidence: 100, model: null, rawHash: null,
  });

  // Heal INSIDE the window (60s past the boundary), exactly as the lifecycle ticker would.
  const report = await healStuckRounds({ now: Date.parse(r0.boundaryAt) + 60 * SEC });
  ok("2c.4 · the healer RESOLVED it — nothing was voided", report.resolved >= 1 && report.voided === 0,
     JSON.stringify(report));

  const healed = (await roundStore.get(r0.id))!;
  // ⭐ ALL FOUR, as the campaign's session-31 seal spec demands:
  ok("2c.5 · ① openPrice is the confirmed observation's, to the digit",
     healed.openPrice === OPEN_PRICE, String(healed.openPrice));
  ok("2c.6 · ② both targets computed at the round's own frozen marginBps",
     healed.upTarget === expected.upTarget && healed.downTarget === expected.downTarget,
     `${healed.downTarget}…${healed.upTarget} vs ${expected.downTarget}…${expected.upTarget}`);
  ok("2c.7 · ③ the outcome is DECISIVE — UP, the verdict the market delivered",
     healed.outcome === "UP", String(healed.outcome));
  ok("2c.8 · ④ voidReason is null — nothing about this round failed",
     healed.voidReason === null, String(healed.voidReason));
  ok("2c.9 · the observation id is stamped, so source-pinning covered the backfill too",
     healed.openObservationId === openObs.id, String(healed.openObservationId));
  ok("2c.10 · the round is terminal and its money moved", !!healed.resolvedAt && !!healed.settledAt);

  // ── THE LEDGER PROOF. UP won: the winner is paid the pool minus the fee, never below
  // stake (the winner floor); the loser's stake is gone; the two deltas net to exactly
  // what the house kept, and the house can never keep more than a third of the smaller
  // side (the fee rule, frozen per poll).
  const aAfter = await balanceOf(charlie), bAfter = await balanceOf(delta);
  const payout = aAfter - (aBefore - 1_000);
  const houseTake = 2_000 - payout;
  ok("2c.11 · the winner is paid at least their stake back", payout >= 1_000, `payout ${payout}`);
  ok("2c.12 · the loser's stake is gone — this was a verdict, not a refund",
     bAfter === bBefore - 1_000, `${bBefore} → ${bAfter}`);
  ok("2c.13 · conservation: winner credit + loser debit net to the house take, ≤ ⅓ of the smaller side",
     houseTake >= 0 && houseTake <= Math.ceil(1_000 / 3), `house ${houseTake}`);

  // ── The compliance record answers "who put a price on a live round" ────────
  const rows = getAuditPage({ limit: 1000 }).filter((e) => e.action === "updown.round.open_backfilled");
  const mine = rows.find((e) => e.targetId === r0.id);
  ok("2c.14 · a `updown.round.open_backfilled` audit row names the round", !!mine);
  ok("2c.15 · it is the healer's act, COMPLIANCE category",
     mine?.actorId === "system_updown_healer" && mine?.category === "COMPLIANCE",
     `${mine?.actorId} ${mine?.category}`);
  const bp = (mine?.payload ?? {}) as Record<string, unknown>;
  ok("2c.16 · it records the price and both targets it stamped",
     bp.openPrice === OPEN_PRICE && bp.upTarget === expected.upTarget && bp.downTarget === expected.downTarget,
     JSON.stringify({ p: bp.openPrice, u: bp.upTarget, d: bp.downTarget }));
}

// ── 2c-b · the seal's arithmetic holds for ALL FOUR live Twelve Data assets ──
//
// The lifecycle above proves the backfill end-to-end once; what differs per asset is the
// TARGET ARITHMETIC (decimals, tick floors — BTC's $0.02 against gold's $0.40). Sweep the
// four real catalogue specs at the measured ladder's tightest band (2 bps): the band must
// never collapse below the asset's own tick floor, and the stored targets must decide
// UP / DOWN / VOID exactly at their boundaries — the pari-mutuel signature the seal
// restores on every asset equally.
{
  const CASES: readonly [string, number][] = [
    ["BTC/USD", 63_268.12], ["ETH/USD", 2_456.78], ["SOL/USD", 72.46], ["XAU/USD", 2_408.55],
  ];
  for (const [symbol, price] of CASES) {
    const spec = findSymbol(symbol);
    if (!spec) { ok(`2c-b · ${symbol} is in the catalogue`, false); continue; }
    const t = computeTargets(price, 2, spec);
    const tick = spec.minMoveTicks * Math.pow(10, -spec.decimals);
    const up = decideOutcomeByTargets(t.upTarget, t.upTarget, t.downTarget).outcome;
    const dn = decideOutcomeByTargets(t.downTarget, t.upTarget, t.downTarget).outcome;
    const mid = decideOutcomeByTargets(price, t.upTarget, t.downTarget).outcome;
    ok(`2c-b · ${symbol}: band ≥ its own tick floor and targets decide UP/DOWN/VOID at their boundaries`,
       t.margin >= tick && up === "UP" && dn === "DOWN" && mid === "VOID",
       `margin ${t.margin} tick ${tick} · ${up}/${dn}/${mid}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 · THE DEADLINE COSTS NOTHING — no oracle call for a boundary long past
// ═══════════════════════════════════════════════════════════════════════════
//
// Money, not tidiness. A backlog sweep that re-dialled a paid provider once per
// orphan would have cost hundreds of dollars against production's 1,398 historical
// rounds, to learn what the staleness contract already says: a reading for an
// hour-old boundary can never be accepted. `attempts` NOT MOVING is the proof that
// no call was made.
{
  const opened = await openRound(chain, B(30), null, null);
  if (!opened.ok) throw new Error(opened.error);
  const boundary = (await roundStore.get(opened.data.id))!.boundaryAt;
  const obs = await observationStore.ensure(asset.id, boundary);
  await observationStore.recordAttempt(obs.id, "the source rendered its price in JavaScript");
  ok("3.1 · the boundary has one recorded attempt", (await observationStore.get(obs.id))!.attempts === 1);

  await healStuckRounds({ now: Date.parse(boundary) + 3600 * SEC });
  const after = (await observationStore.get(obs.id))!;
  ok("3.2 · ⭐ the oracle was NOT re-dialled — attempts did not move", after.attempts === 1, String(after.attempts));
  ok("3.3 · the observation reads FAILED, with a reason a human can act on",
     after.state === "FAILED" && /abandoned/i.test(after.failReason ?? ""), `${after.state}: ${after.failReason}`);
  const r = (await roundStore.get(opened.data.id))!;
  ok("3.4 · and the round is closed VOID anyway", r.outcome === "VOID" && !!r.resolvedAt, String(r.outcome));
}

// ═══════════════════════════════════════════════════════════════════════════
// 4 · INSIDE THE WINDOW THE LADDER IS HONOURED — the config that did nothing
// ═══════════════════════════════════════════════════════════════════════════
{
  const opened = await openRound(chain, B(40), null, null);
  if (!opened.ok) throw new Error(opened.error);
  const roundId = opened.data.id;
  const boundary = (await roundStore.get(roundId))!.boundaryAt;
  const obs = await observationStore.ensure(asset.id, boundary);
  await observationStore.recordAttempt(obs.id, "first attempt, taken at the boundary");
  const t0 = Date.parse(boundary);
  await setLastAttempt(obs.id, boundary); // attempt 1 happened AT the boundary

  // Rung 1 is 15s and the first attempt was 5s ago, so nothing is due yet.
  const r1 = await healStuckRounds({ now: t0 + 5 * SEC });
  ok("4.1 · ⭐ the backoff is respected — no attempt while rung 1 has not elapsed",
     (await observationStore.get(obs.id))!.attempts === 1 && r1.waiting >= 1, JSON.stringify(r1));
  ok("4.2 · and the round is deliberately still open — waiting is not stranding",
     !(await roundStore.get(roundId))!.resolvedAt);

  // Let rung 1 elapse. This is the line that had never executed on production.
  await healStuckRounds({ now: t0 + 20 * SEC });
  ok("4.3 · ⭐ once the rung elapses the ladder CLIMBS — this never ran before",
     (await observationStore.get(obs.id))!.attempts === 2, String((await observationStore.get(obs.id))!.attempts));

  // Climb the rest. Each offset clears its own rung (45s then 120s) and every one of
  // them stays inside the 390s deadline, so what terminates this round is the ATTEMPT
  // BUDGET, not the backstop — which is the half this section exists to prove.
  for (const [at, prev] of [[70, 20], [200, 70], [250, 200]] as const) {
    if ((await roundStore.get(roundId))!.resolvedAt) break;
    await setLastAttempt(obs.id, new Date(t0 + prev * SEC).toISOString());
    await healStuckRounds({ now: t0 + at * SEC });
  }
  const finalObs = (await observationStore.get(obs.id))!;
  const finalRound = (await roundStore.get(roundId))!;
  ok("4.4 · ⭐ the ladder TERMINATES — the boundary is declared FAILED, not retried forever",
     finalObs.state === "FAILED", `${finalObs.state} after ${finalObs.attempts} attempts`);
  ok("4.5 · attempts stopped at the configured budget",
     finalObs.attempts === DEFAULT_UPDOWN_CONFIG.maxObservationAttempts, String(finalObs.attempts));
  ok("4.6 · ⭐ and the round is closed and refunded, not left open",
     finalRound.outcome === "VOID" && !!finalRound.resolvedAt && !!finalRound.settledAt,
     `${finalRound.outcome} resolved=${finalRound.resolvedAt} settled=${finalRound.settledAt}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 · IDEMPOTENCE — a healer that double-refunds is worse than one that stalls
// ═══════════════════════════════════════════════════════════════════════════
{
  const before = (await balanceOf(alpha)) + (await balanceOf(bravo));
  // Far enough ahead that EVERY round created so far is in scope — a pass that skips
  // its work would prove nothing about not repeating it.
  await healStuckRounds({ now: Date.parse(B(80)) });
  const r2 = await healStuckRounds({ now: Date.parse(B(80)) });
  const after = (await balanceOf(alpha)) + (await balanceOf(bravo));
  ok("5.1 · ⭐ two consecutive passes move no money", before === after, `${before} -> ${after}`);
  ok("5.2 · and the second pass finds nothing left to close",
     r2.voided === 0 && r2.resolved === 0 && r2.settled === 0, JSON.stringify(r2));
}

// ═══════════════════════════════════════════════════════════════════════════
// 6 · THE OTHER STRANDING SHAPE — decided, but the money never moved
// ═══════════════════════════════════════════════════════════════════════════
//
// `closeRound` stamps the round and THEN settles. A process that dies between the two
// leaves a decided round with players still OPEN on it — money frozen just as surely
// as in §2, and invisible to a sweep that only looks for unresolved rounds.
{
  const opened = await openRound(chain, B(50), null, null);
  if (!opened.ok) throw new Error(opened.error);
  const bet = await buyPosition(bravo, { marketId: opened.data.marketId, side: "NO", stake: 2_000 });
  ok("6.1 · a real stake enters", bet.ok, bet.ok ? "" : bet.error);
  ok("6.2 · the money has left the wallet", (await balanceOf(bravo)) === START_BALANCE - 2_000);

  // Exactly `closeRound`'s pre-settlement state — the same columns, written the same
  // way, with the settlement step simply never reached.
  const t = new Date().toISOString();
  await marketStore.stamp(opened.data.marketId, {
    status: "VOIDED", resolvedOutcome: "VOID",
    resolutionStage1By: "system_updown", resolutionStage1At: t,
    resolutionStage2By: "system_updown", resolutionStage2At: t,
    resolutionEvidence: "test: the process died between resolution and settlement",
    objectionsClosedAt: t, resolutionNotifiedAt: t, settledAt: null, updatedAt: t,
  });
  await roundStore.patch(opened.data.id, { outcome: "VOID", voidReason: "source-failed", resolvedAt: t });
  ok("6.3 · the round reads decided-but-unpaid",
     !!(await roundStore.get(opened.data.id))!.resolvedAt && !(await roundStore.get(opened.data.id))!.settledAt);
  ok("6.4 · ⚠️ and the player's money is still out", (await balanceOf(bravo)) === START_BALANCE - 2_000);

  const rep = await healStuckRounds();
  ok("6.5 · ⭐ the healer settles it", rep.settled >= 1, JSON.stringify(rep));
  ok("6.6 · ⭐ and the stake comes back in full", (await balanceOf(bravo)) === START_BALANCE, String(await balanceOf(bravo)));
  ok("6.7 · the round's own stamp is repaired too", !!(await roundStore.get(opened.data.id))!.settledAt);
}

// ═══════════════════════════════════════════════════════════════════════════
// 7 · CONSERVATION — across everything above, not a shilling created or lost
// ═══════════════════════════════════════════════════════════════════════════
{
  const horizon = Date.parse(B(80));
  await healStuckRounds({ now: horizon });
  const total = (await balanceOf(alpha)) + (await balanceOf(bravo));
  ok("7.1 · ⭐ every void refunded in full — wallets are exactly where they started",
     total === START_TOTAL, `${total} vs ${START_TOTAL}`);
  const stillOpen = (await roundStore.list({ chainId: chain.id })).filter(
    (r) => !r.resolvedAt && Date.parse(r.boundaryAt) <= horizon,
  );
  ok("7.2 · ⭐ no round whose boundary has passed is left without a verdict",
     stillOpen.length === 0, stillOpen.map((r) => `#${r.roundNumber}@${r.boundaryAt}`).join(","));
}

// ═══════════════════════════════════════════════════════════════════════════
// 8 · E-23 — the operator's remedy, which existed and could not be reached
// ═══════════════════════════════════════════════════════════════════════════
{
  const opened = await openRound(chain, B(60), null, null);
  if (!opened.ok) throw new Error(opened.error);
  const bet = await buyPosition(alpha, { marketId: opened.data.marketId, side: "YES", stake: 1_000 });
  ok("8.1 · a real stake enters", bet.ok, bet.ok ? "" : bet.error);

  const v = await voidRoundByOperator(opened.data.id, OFFICER, "QA: releasing a stuck round");
  ok("8.2 · the operator void succeeds", v.ok, v.ok ? "" : v.error);
  ok("8.3 · ⭐ and the stake is returned in full", (await balanceOf(alpha)) === START_BALANCE, String(await balanceOf(alpha)));
  ok("8.4 · it is attributed to the OFFICER, not to the system",
     getAuditPage({ limit: 1000 }).some(
       (e) => e.action === "updown.round.void_operator" && e.actorId === OFFICER && e.targetId === opened.data.id,
     ));

  const again = await voidRoundByOperator(opened.data.id, OFFICER, "QA: second attempt");
  ok("8.5 · a settled round refuses a second void — it cannot double-refund",
     !again.ok, again.ok ? "ACCEPTED TWICE" : "");
  ok("8.6 · and the balance did not move on the refusal", (await balanceOf(alpha)) === START_BALANCE);
}

// ═══════════════════════════════════════════════════════════════════════════
// 9 · THE KILL SWITCH — off means off, and it is NOT the scheduler's switch
// ═══════════════════════════════════════════════════════════════════════════
{
  const opened = await openRound(chain, B(70), null, null);
  if (!opened.ok) throw new Error(opened.error);
  const after = Date.parse(B(71)) + 3600 * SEC;

  process.env.UPDOWN_HEALER = "false";
  const off = await healStuckRounds({ now: after });
  ok("9.1 · UPDOWN_HEALER=false is a no-op", off.scanned === 0, JSON.stringify(off));
  ok("9.2 · and the round is untouched", !(await roundStore.get(opened.data.id))!.resolvedAt);
  delete process.env.UPDOWN_HEALER;

  // The important half: switching the GAME off must not switch off the thing that
  // returns money already staked in it. That is failure mode ④ of E-24, one layer up.
  process.env.UPDOWN_SCHEDULER = "false";
  const on = await healStuckRounds({ now: after });
  delete process.env.UPDOWN_SCHEDULER;
  ok("9.3 · ⭐ the healer still runs with the SCHEDULER disabled — switching the game off must not trap stakes",
     on.voided >= 1, JSON.stringify(on));
  ok("9.4 · the round is closed", !!(await roundStore.get(opened.data.id))!.resolvedAt);
  ok("9.5 · and no money was created doing it", (await balanceOf(alpha)) + (await balanceOf(bravo)) === START_TOTAL);
}

// ═══════════════════════════════════════════════════════════════════════════
// 10 · WIRING — a mechanism nothing calls is exactly the defect being fixed
// ═══════════════════════════════════════════════════════════════════════════
//
// E-24 ① was `retryBackoffSeconds`: a configured safety mechanism that no code read.
// E-4 was a server-side gate that no wire carried. Both look correct in review. These
// are the only assertions in this file that read source rather than drive behaviour,
// and that is precisely why they exist.
{
  // ⚠️ COMMENTS ARE STRIPPED FIRST, and that is not fussiness. The first version of
  // this section was proven red by commenting the call out — and it stayed GREEN,
  // because `// await healUpDownRounds()` still contains the string it was matching.
  // A wiring detector that a comment satisfies is the very thing it is guarding
  // against: a mechanism that reads as present and is not on the wire.
  const lifecycle = read("src/lib/server/lifecycle.ts")
    .split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  ok("10.1 · the lifecycle ticker actually CALLS the healer",
     /healStuckRounds/.test(lifecycle), "not referenced in lifecycle.ts");
  ok("10.2 · …on the once-a-minute pass, not the 5-minute reconcile cadence",
     /await healUpDownRounds\(\)/.test(lifecycle) &&
     lifecycle.indexOf("await healUpDownRounds()") < lifecycle.indexOf("await expireActiveGrants()"),
     "not on the main pass");

  ok("10.3 · ⭐ retryBackoffSeconds is READ by real code (it was read by NOTHING — E-24 ①)",
     /ladder\s*=\s*cfg\.retryBackoffSeconds/.test(read("src/lib/server/updown-config.ts")),
     "no accessor reads it");
  // Two readers is how a ladder ends up half-honoured, which is a subtler version of
  // not honoured at all.
  //
  // ⚠️ COMMENTS ARE STRIPPED FIRST, and that is not a convenience. This assertion fired on
  // the 2026-08-01 feed-branch merge against a tree where the ladder genuinely had exactly
  // one reader — what tripped it was a COMMENT in updown-service.ts explaining that very
  // rule, quoting the field it names. A structural guard that a correct explanation can
  // turn red teaches the next session to delete the explanation, which is the opposite of
  // what this guard is for. It must measure code, so it reads code.
  const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const readers = ["src/lib/server/updown-config.ts", "src/lib/server/updown-service.ts", "src/lib/server/updown-scheduler.ts"]
    .filter((f) => /cfg\.retryBackoffSeconds|config\.retryBackoffSeconds/.test(stripComments(read(f))));
  ok("10.4 · …and by exactly one module, so the ladder cannot be half-honoured", readers.length === 1, readers.join(","));

  // E-23: the remedy must be reachable from the product, not only from a script.
  const actions = read("src/app/admin/updown/actions.ts");
  ok("10.5 · ⭐ voidRoundByOperator is reachable through a server action (E-23)",
     /voidRoundByOperator/.test(actions) && /export async function voidRoundAction/.test(actions),
     "no action exports it");
  ok("10.6 · …and a page actually renders the control",
     /VoidRoundControl/.test(read("src/app/admin/updown/rounds/page.tsx")), "not rendered");
  // E-18's lesson: the page must be able to ask the same question the action asks, or
  // a legitimate click is filed as an attempted privilege escalation.
  // ⚠️ `trading`, and the domain is pinned here on purpose. It shipped as `compliance`
  // for one deploy and production proved that unusable — /admin/updown/rounds is a
  // `trading` route, so the compliance officer could not open the page at all and the
  // remedy became Owner-only, i.e. E-23 restated. `test:control-gates` §2 carries the
  // role-by-role decision; this line stops the domain drifting back silently.
  ok("10.7 · the action reads its domain from CONTROL_DOMAIN, not a literal",
     /CONTROL_DOMAIN\.voidUpDownRound/.test(actions) &&
     /voidUpDownRound:\s*"trading"/.test(read("src/lib/server/control-gates.ts")),
     "hard-coded or wrong domain");
  ok("10.8 · …and the page renders a locked state rather than a button that bounces",
     /ControlLocked/.test(read("src/app/admin/updown/rounds/page.tsx")) &&
     /canUseControl\(session\?\.role, "voidUpDownRound"\)/.test(read("src/app/admin/updown/rounds/page.tsx")),
     "no locked state");
}

// ═══════════════════════════════════════════════════════════════════════════
// 11 · AN OPERATOR STATE MUST NOT SPEND A ROUND'S RETRIES
// ═══════════════════════════════════════════════════════════════════════════
//
// ℹ️ MERGED IN 2026-08-01 from `feat/updown-source-pinning-and-proposals`, whose own
// heal sweep was dropped in favour of `healStuckRounds` — but whose carve-out inside
// `acquireObservation` was kept, because it fixes a real defect this suite did not cover.
//
// THE DEFECT: `acquireObservation` recorded an attempt on EVERY refusal, including
// refusals that are an operator's own doing — no API key, AI paused, a feed provider
// selected with no credentials. Four lifecycle fires with the AI paused therefore walked
// the attempt budget to zero and VOIDED live rounds for an ops mistake, refunding players
// who were happily betting. The carve-out is the fix.
//
// ⭐ AND WHY THE TWO FIXES NEED EACH OTHER — the thing neither branch had alone. The
// carve-out means a misconfigured platform never spends the budget, so on that branch a
// round with a bad key would have waited FOREVER: E-24 again, through a new door. What
// stops it is §3's deadline — `abandonAfterSeconds` closes the round regardless of the
// budget. Carve-out without deadline strands money; deadline without carve-out voids live
// rounds for a typo. §11.4 pins the combination, which is the real merge outcome.
console.log("\n── 11 · an ops-state refusal does not spend a round's retries ──");
{
  const restore = await getUpDownConfig();

  // 11a · The FEED path: a real provider selected with no API key. `not-configured` is
  // mapped onto the carve-out, which is the whole reason that mapping exists.
  const savedKey = process.env.TWELVEDATA_API_KEY;
  delete process.env.TWELVEDATA_API_KEY;
  const setFeed = await setUpDownConfig({ observationMethod: "feed", feedProvider: "twelvedata" }, OFFICER);
  ok("11.1 · the feed reader can be selected at all", setFeed.ok, setFeed.ok ? "" : setFeed.error);

  const bFeed = B(200);
  const oFeed = await observationStore.ensure(asset.id, bFeed);
  const gotFeed = await acquireObservation(asset, bFeed);
  ok("11.2 · an unconfigured feed is REFUSED, never invented around", gotFeed.state === "pending", gotFeed.state);
  const afterFeed = (await observationStore.get(oFeed.id))!;
  ok("11.3 · ⛔ FEED: the attempt budget was NOT spent on an operator state",
     afterFeed.attempts === 0 && afterFeed.state === "PENDING",
     `attempts=${afterFeed.attempts} state=${afterFeed.state} — burning it here voids live rounds for an ops mistake`);

  // 11.4 · …and the deadline is what stops that carve-out from stranding the money.
  // Same misconfiguration, a round with a real stake, clock pushed past the deadline.
  {
    const opened = await openRound(chain, B(201), null, null);
    if (!opened.ok) throw new Error(opened.error);
    const round = (await roundStore.get(opened.data.id))!;
    const bought = await buyPosition(alpha, { marketId: round.marketId, side: "YES", stake: 1_000 });   // the platform floor (2026-08-14)
    ok("11.4a · a real stake entered the round", bought.ok, bought.ok ? "" : String(bought.error));
    const staked = await balanceOf(alpha);

    const t = Date.parse(round.boundaryAt) + (abandonAfterSeconds(restore) + 30) * SEC;
    await healStuckRounds({ now: t });
    const healed = (await roundStore.get(round.id))!;
    const obs = await observationStore.find(asset.id, round.boundaryAt);
    ok("11.4b · ⭐ the budget was never spent — the carve-out held throughout",
       (obs?.attempts ?? 0) === 0, `attempts=${obs?.attempts}`);
    ok("11.4c · ⭐ …and the round STILL terminated, on the deadline rather than the budget",
       healed.outcome === "VOID" && !!healed.resolvedAt, `${healed.outcome} resolved=${healed.resolvedAt}`);
    ok("11.4d · ⛔ the stake came back in full — an ops mistake costs a round, never a player",
       (await balanceOf(alpha)) === staked + 1_000, `${staked} → ${await balanceOf(alpha)} (staked 1,000)`);
  }

  // 11b · A GENUINE source failure, by contrast, MUST burn an attempt — otherwise a
  // boundary that truly cannot be read never reaches FAILED and its rounds never refund.
  // The mock feed quotes NOW, so against a future boundary it is refused as `stale`.
  const setMock = await setUpDownConfig({ feedProvider: "mock" }, OFFICER);
  if (!setMock.ok) throw new Error(setMock.error);
  const bStale = B(210);
  const oStale = await observationStore.ensure(asset.id, bStale);
  const gotStale = await acquireObservation(asset, bStale);
  ok("11.5 · a genuine source failure is refused", gotStale.state === "pending", gotStale.state);
  ok("11.6 · ⛔ …and DOES spend an attempt, or a dead boundary could never reach FAILED and refund",
     (await observationStore.get(oStale.id))!.attempts === 1,
     `attempts=${(await observationStore.get(oStale.id))!.attempts}`);

  if (savedKey !== undefined) process.env.TWELVEDATA_API_KEY = savedKey;
  const back = await setUpDownConfig(
    { observationMethod: restore.observationMethod, feedProvider: restore.feedProvider }, OFFICER);
  if (!back.ok) throw new Error(back.error);
}

// ═══════════════════════════════════════════════════════════════════════════
// 12 · THE BACKOFF GATE LIVES IN `acquireObservation`, AND IS CLOCK-INJECTABLE
// ═══════════════════════════════════════════════════════════════════════════
//
// §4 proves the ladder through the healer. This proves the gate itself, at the one place
// it now lives — because the merge moved it there, and a gate nobody tests directly is how
// the ladder came to be dead config in the first place.
console.log("\n── 12 · the ladder gate, tested where it actually lives ──");
{
  const restore = await getUpDownConfig();
  const set = await setUpDownConfig({ retryBackoffSeconds: [600] }, OFFICER);
  ok("12.1 · a long rung is accepted (600s is the documented ceiling)", set.ok, set.ok ? "" : set.error);

  const boundary = B(220);
  const obs = await observationStore.ensure(asset.id, boundary);
  await observationStore.recordAttempt(obs.id, "test: one failed attempt just now");
  const attemptsBefore = (await observationStore.get(obs.id))!.attempts;
  const lastAt = Date.parse((await observationStore.get(obs.id))!.lastAttemptAt!);

  const waiting = await acquireObservation(asset, boundary, lastAt + 60 * SEC);
  ok("12.2 · a boundary inside its backoff window is left alone", waiting.state === "pending", waiting.state);
  ok("12.3 · …and reports the WAIT, not a source failure — an operator must not read a rung as a broken feed",
     "detail" in waiting && /waiting \d+s/.test(waiting.detail), "detail" in waiting ? waiting.detail : "(none)");
  ok("12.4 · no attempt is consumed while waiting",
     (await observationStore.get(obs.id))!.attempts === attemptsBefore);

  // ⭐ The clock is INJECTED. Before this parameter existed the gate read wall-clock time
  // while the healer believed it was minutes later, so the rung never elapsed and the
  // ladder looked dead — the exact regression the merge introduced and §4 caught.
  const climbed = await acquireObservation(asset, boundary, lastAt + 601 * SEC);
  ok("12.5 · ⭐ past the rung the gate opens and the ladder CLIMBS",
     (await observationStore.get(obs.id))!.attempts === attemptsBefore + 1,
     `attempts=${(await observationStore.get(obs.id))!.attempts} state=${climbed.state}`);

  const back = await setUpDownConfig({ retryBackoffSeconds: restore.retryBackoffSeconds }, OFFICER);
  if (!back.ok) throw new Error(back.error);

  // Validation, now that the field is load-bearing and metered money is behind it.
  ok("12.6 · an empty ladder is refused", !(await setUpDownConfig({ retryBackoffSeconds: [] }, OFFICER)).ok);
  ok("12.7 · a negative rung is refused", !(await setUpDownConfig({ retryBackoffSeconds: [-1] }, OFFICER)).ok);
  ok("12.8 · ⛔ a 0s rung is refused — it would re-dial a METERED price feed on every tick",
     !(await setUpDownConfig({ retryBackoffSeconds: [0] }, OFFICER)).ok);
  ok("12.9 · a rung beyond the ceiling is refused — it would push the deadline out of minutes",
     !(await setUpDownConfig({ retryBackoffSeconds: [3600] }, OFFICER)).ok);
}

// ── 13 · ⛔ E-29 · the compliance note must describe what ACTUALLY happened ──
/**
 * The note on every `updown.round.voided` / `.resolved` row was a single fixed string
 * asserting "two immutable price observations". Measured on production 2026-08-01:
 * **1,397 of 1,397** rows carrying it have NEITHER observation, and every one is a VOID
 * (1,392 `operator`, 5 `source-failed`). `AuditLog` is append-only and HMAC-chained on a
 * 7-year AML retention, so a false sentence there cannot be corrected — only stopped.
 */
console.log("\n── 13 · E-29 · the settlement note states only what is true ──");
{
  const claimsObs = (n: string) => /two immutable price observations/.test(n);

  ok("13.1 · a real resolution DOES claim two observations",
     claimsObs(settlementNote("UP", null, "obs_a", "obs_b")));

  // The four void paths. None may claim evidence that does not exist.
  for (const [reason, must] of [
    ["source-failed", /no confirmed price reading/i],
    ["operator", /closed by an operator/i],
    ["no-move", /did not clear the round's frozen margin/i],
    ["source-mismatch", /did not pin/i],
  ] as const) {
    const n = settlementNote("VOID", reason, null, null);
    ok(`13.2 · VOID/${reason} · ⛔ claims NO observations it does not have`, !claimsObs(n), n.slice(0, 66));
    ok(`13.2 · VOID/${reason} · says what actually happened`, must.test(n), n.slice(0, 66));
    ok(`13.2 · VOID/${reason} · still promises the refund`, /refunded in full/.test(n));
  }

  // The exact live row that exposed it: operator void, both observation ids null.
  const live = settlementNote("VOID", "operator", null, null);
  ok("13.3 · ⭐ the production row that exposed E-29 now reads truthfully",
     !claimsObs(live) && /names the officer/.test(live), live.slice(0, 80));

  // An unrecognised reason must degrade to honesty, not to a confident sentence.
  const unknown = settlementNote("VOID", "something-new", null, null);
  ok("13.4 · an UNKNOWN void reason does not inherit a confident claim",
     !claimsObs(unknown) && /something-new/.test(unknown), unknown.slice(0, 72));
  ok("13.5 · a void with no reason at all says so rather than guessing",
     /no reason was recorded/.test(settlementNote("VOID", null, null, null)));

  // ⛔ Structural: exactly ONE place may compose this note. A second copy is a second set
  // of claims, and the whole finding is that the claim drifted from the facts.
  const svc = readFileSync(join(ROOT, "src/lib/server/updown-service.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok("13.6 · the audit payload calls settlementNote() rather than inlining prose",
     /note:\s*settlementNote\(/.test(svc));
  ok("13.7 · ⛔ the claim sentence appears exactly once in the service",
     (svc.match(/two immutable price observations/g) ?? []).length === 1,
     String((svc.match(/two immutable price observations/g) ?? []).length));
}


// ═══════════════════════════════════════════════════════════════════════════
// E-68 · THE VOID REASON MUST COME FROM THE PRICES, NOT FROM THE CALLER
// ═══════════════════════════════════════════════════════════════════════════
//
// Every `finishRound` call passed `"source-failed"` unconditionally — including the two that
// hold a REAL CONFIRMED PRICE. `closeRound` treats an explicit reason as authoritative (it must,
// so an officer's "operator" void is not relabelled), so a good close that simply landed BETWEEN
// the targets was stamped `source-failed` instead of `no-move`.
//
// Measured on production: udr_cd386bbaeaf63be696f5 open 63,719.98 close 63,722.47 inside the
// band 63,707.24–63,732.72, stored `source-failed`. The player was told "The closing price could
// not be confirmed" about a price sitting in the same row — a false statement about their own
// money, and it also made the void-rate column an operator reads as "the feed is broken" lie.
{
  const { decideOutcomeByTargets } = await import("../src/lib/server/updown-service.ts");

  // The two real rounds, by their real numbers.
  const a = decideOutcomeByTargets(63722.47, 63732.72, 63707.24);
  ok("E-68 · an in-band close is no-move, not source-failed",
     a.outcome === "VOID" && a.voidReason === "no-move", `${a.outcome}/${a.voidReason}`);
  const b = decideOutcomeByTargets(63710.73, 63729.30, 63703.82);
  ok("E-68 · …and so is the second one", b.outcome === "VOID" && b.voidReason === "no-move");

  // A genuinely absent price is still a source failure — the override must survive for it.
  const c = decideOutcomeByTargets(null, 63729.30, 63703.82);
  ok("E-68 · a missing close price IS source-failed", c.voidReason === "source-failed");

  // ⭐ THE FIX ITSELF: `finishRound` may only force a reason when there is no price.
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/lib/server/updown-service.ts", import.meta.url), "utf8");
  const fn = src.match(/async function finishRound\([\s\S]*?\n\}/)?.[0] ?? "";
  ok("E-68 · finishRound was found", fn.length > 0);
  ok("E-68 · ⛔ the override is conditional on there being no price",
     /const reason = closePrice == null \? voidReason : undefined;/.test(fn),
     "an unconditional reason relabels every priced void as a feed failure");
  ok("E-68 · …and closeRound is called with that conditional reason",
     /closeRound\(round\.id, closeObservationId, closePrice, reason\)/.test(fn));
}


// ═══════════════════════════════════════════════════════════════════════════
// 6 · E-83 · A TICK MUST NEVER OPEN A ROUND WITHOUT AN OPEN PRICE
// ═══════════════════════════════════════════════════════════════════════════
//
// 🔴 FOUND ON PRODUCTION 2026-08-05: a RUNNING chain voided **175 consecutive rounds** over
// eleven hours, every one `source-failed`, while the price data was available the whole time.
// Every one of those rounds had `openObservationId: null` and `openPrice: null`.
//
// ⭐ The cause is timing, not the feed. `advanceChain` fires AT the boundary and asks for the
// bar labelled with that same instant — and a bar labelled T does not exist until ~+19s
// (BTC/ETH/XAU) or ~+87s (SOL), measured live. So the reading is legitimately `pending` at the
// moment of every tick, and the code passed that `null` straight into `openRound`.
//
// `generateRoundNow` refuses in exactly this situation and says why: *"a round opened without
// an open price cannot resolve: it would take stakes, show a countdown, and then void and
// refund every one."* The manual path was fixed for this; the tick was not.
//
// ⛔ The property is NOT "the tick opens a round" — it is "any round the tick opens can
// actually resolve". A guard asserting a round appeared would have passed all night.
{
  // A different duration: the asset already carries a 5-minute chain from §1, and one chain
  // per asset per length is a real rule (§8.2) rather than a fixture inconvenience.
  //
  // ⛔ AND THE LENGTH IS NOT FREE — IT MUST BE ONE WHOSE SPAN OUTLASTS THE ABANDON DEADLINE.
  // This read `durationMinutes: 3` until 2026-08-19, and that made E83.5 assert something
  // UNSATISFIABLE without anyone noticing. A 3-minute round SPANS 240s (3 minutes of betting
  // plus a 1-minute result phase) and the fixture below pins the boundary 240s back — the
  // midpoint of 90 and 390 on the defaults, the same number by coincidence of the config.
  //
  // A boundary whose round has already CLOSED cannot open one however often it is retried:
  // `openRound` derives a close of boundary + span, `createMarket` refuses a past resolution
  // date BY THROWING, the throw skips the re-arm, and the scheduler repeats the identical
  // call every 30s for ever. That is the production outage filed as
  // `docs/FAILURE-INVENTORY.md` §7.4 — and both stalled chains were 3-MINUTE chains.
  //
  // `advanceChain` now ABANDONS a boundary that outlived its own round rather than retrying
  // it, so "retried, not consumed" is only a real property on a chain whose span still has
  // room at the deadline. E83.0b pins that requirement so this fixture cannot drift back,
  // and E83.6-E83.9 assert the short-chain half deliberately.
  const c2c = await createChain({ assetId: asset.id, durationMinutes: 15 }, OFFICER);
  if (!c2c.ok) throw new Error(c2c.error);
  const chain2 = (await chainStore.get(c2c.data.id))!;
  await setChainState(chain2.id, "RUNNING", OFFICER);

  // 🔴 THE BOUNDARY IS PINNED RELATIVE TO **NOW**, AND THAT IS THE POINT (found 2026-08-05).
  // This used to be `B(0)` — the chain's grid anchor, which `cleanGridAnchor` floors to a
  // 5-minute mark at suite start. `advanceChain` reads wall-clock time and the mock feed quotes
  // the present instant, so whether the reading was refused as `stale` depended on **how far
  // into the current five minutes the suite happened to be launched**: start just after a mark
  // and the skew is seconds, the mock CONFIRMS, a round opens, and E83.2 fails on correct code.
  // Start at 4:30 past and the skew is 270s, the mock is refused, and it passes. A guard for a
  // defect that voided 175 rounds cannot be decided by the second hand.
  //
  // ⛔ 120s BACK IS THE ONLY WINDOW THAT PINS BOTH PROPERTIES, and both edges are real config:
  //   · > `maxStalenessSeconds` (90) — so the mock's "price now" is ALWAYS refused and the
  //     reading is genuinely unconfirmed, which is what E83.1–E83.3 are about;
  //   · < `abandonAfterSeconds` (390) — so the tick RETRIES this boundary instead of skipping
  //     it, which is what E83.5 is about. Push it past the deadline and E83.5 inverts.
  const cfgE83 = await getUpDownConfig();
  const staleWindow = cfgE83.maxStalenessSeconds;
  const abandonWindow = abandonAfterSeconds(cfgE83);
  const backSeconds = Math.round((staleWindow + abandonWindow) / 2);   // 240s on the defaults
  ok("E83.0 · the fixture sits between the staleness limit and the abandon deadline",
     backSeconds > staleWindow && backSeconds < abandonWindow,
     `${backSeconds}s back · stale>${staleWindow}s · abandon<${abandonWindow}s`);
  ok("E83.0b · ⛔ …and the chain's SPAN outlasts that deadline, or E83.5 asserts the impossible",
     roundSpanMinutes(15) * 60 > abandonWindow,
     `15m spans ${roundSpanMinutes(15) * 60}s vs abandon ${abandonWindow}s — a 3m chain spans ${roundSpanMinutes(3) * 60}s and would FAIL this`);
  const e83Boundary = new Date(Math.floor((Date.now() - backSeconds * 1000) / 60_000) * 60_000).toISOString();
  await chainStore.patch(chain2.id, { gridAnchorAt: e83Boundary, nextBoundaryAt: e83Boundary, currentRoundId: null });

  const before = await roundStore.latestForChain(chain2.id);
  // No network in this suite, so the reading cannot confirm — exactly production's situation
  // at the instant of a tick.
  const adv = await advanceChain(chain2.id);
  const after = await roundStore.latestForChain(chain2.id);

  ok("E83.1 · the reading is genuinely unconfirmed (the real oracle refused)",
     adv.observation !== "confirmed", String(adv.observation));
  ok("E83.2 · ⭐ NO round was opened — a priceless round can only void",
     after === null && before === null && adv.opened === false,
     `opened=${adv.opened} latest=${after?.id ?? "none"}`);
  ok("E83.3 · …and no round exists carrying a null open price",
     after === null || after.openPrice != null,
     after ? `${after.id} openPrice=${after.openPrice}` : "no rounds");
  ok("E83.4 · the tick says WHY, in the operator's terms",
     /not published yet|not opening|abandoned/i.test(adv.detail ?? ""), String(adv.detail));

  // ⛔ AND IT MUST RETRY THE SAME BOUNDARY, not skip it — otherwise every boundary is
  // consumed unpriced and the chain silently produces nothing at all.
  const c2 = await chainStore.get(chain2.id);
  ok("E83.5 · ⭐ the boundary is RETRIED, not consumed",
     c2!.nextBoundaryAt === e83Boundary, `nextBoundaryAt=${c2!.nextBoundaryAt} (expected ${e83Boundary})`);

  // ⭐ THE OTHER HALF OF THE SAME RULE — AND THE HALF PRODUCTION PAID FOR (§7.4).
  //
  // E83.5 says a boundary that can still become a round is RETRIED. This says a boundary
  // that cannot is NOT — because retrying that one is not merely wasteful, it is unbounded:
  // the reading eventually confirms, `openRound` derives a past close, `createMarket` throws,
  // the throw skips the re-arm, and the chain fires the identical call for ever while
  // producing nothing. Two chains did exactly that on production until they were stopped by
  // hand, which silenced the logs and left the code untouched.
  //
  // ⛔ THE PAIR IS THE POINT, and neither half is padding. A suite asserting only E83.5 is
  // green on a chain that never advances; a suite asserting only E83.7 is green on a chain
  // that consumes every boundary unpriced — the 175-void defect this section is named for.
  // Together they say the boundary moves exactly when it can no longer be played.
  const short = await createChain({ assetId: asset.id, durationMinutes: 3 }, OFFICER);
  if (!short.ok) throw new Error(short.error);
  await setChainState(short.data.id, "RUNNING", OFFICER);
  const shortSpanS = roundSpanMinutes(3) * 60;
  ok("E83.6 · fixture · a 3-minute round's span is SHORTER than the abandon deadline",
     shortSpanS < abandonWindow, `${shortSpanS}s span vs ${abandonWindow}s deadline`);

  // Pinned one span back: the earliest instant at which no round can open there any more.
  const deadBoundary = new Date(Math.floor((Date.now() - shortSpanS * 1000) / 60_000) * 60_000).toISOString();
  await chainStore.patch(short.data.id, {
    gridAnchorAt: deadBoundary, nextBoundaryAt: deadBoundary, currentRoundId: null,
  });
  const dead = await advanceChain(short.data.id);
  const shortAfter = await chainStore.get(short.data.id);
  ok("E83.7 · 🔴 a boundary that outlived its own round is ABANDONED, not retried for ever",
     shortAfter!.nextBoundaryAt !== deadBoundary,
     `${deadBoundary} → ${shortAfter!.nextBoundaryAt}`);
  ok("E83.8 · ⭐ …and it lands at or after NOW, so ONE tick catches up — not one span per tick",
     shortAfter!.nextBoundaryAt != null && Date.parse(shortAfter!.nextBoundaryAt) >= Date.parse(deadBoundary) + shortSpanS * 1000,
     `${shortAfter!.nextBoundaryAt} vs one-span-on ${new Date(Date.parse(deadBoundary) + shortSpanS * 1000).toISOString()}`);
  ok("E83.9 · …and it says so in the operator's terms, naming the round's own close",
     /outlived its own round/i.test(dead.detail ?? "") && dead.opened === false,
     (dead.detail ?? "").slice(0, 80));
}

// ═══════════════════════════════════════════════════════════════════════════
// E-86 · A READ THAT COSTS NO LIFE STILL COSTS A CREDIT — AND MUST STILL BE SPACED
// ═══════════════════════════════════════════════════════════════════════════
//
// 🔴 FOUND BY AN HOUR OF LIVE SOAK, 2026-08-05. §11's carve-out is right: an operator state or
// an unpublished bar must not spend a round's lives. But `lastAttemptAt` was written ONLY by
// `recordAttempt`, which runs ONLY when a refusal is charged — so a carved-out refusal left the
// timestamp null, §12's backoff gate was skipped entirely, and the metered provider was re-read
// with NO DELAY on every tick for the ~130s a bar takes to publish.
//
// ⭐ Measured on production against Twelve Data's OWN counter: usage climbed
// **10 → 345 of 377 credits in 55 seconds** (~6 reads a second) and the next read returned HTTP
// 429. That 429 was classified `error`, which IS charged — so four of them inside ninety seconds
// declared the boundary FAILED and refunded every stake, **at +90s of a 390s deadline**.
// BTC 3m #188 and BTC 5m #6, both `source-failed`, on the shared 09:07 boundary.
//
// ⛔ The comment beside the backoff gate predicted this exactly — *"a cost leak (TwelveData is
// metered) and a good way to be rate-limited into voiding rounds that a slightly later read
// would have settled"*. The ladder was wired for the refusals that already cost a life, and
// bypassed for the one that happens at EVERY boundary.
console.log("\n── E-86 · an uncharged read is still spaced, and a rate limit costs no life ──");
{
  const restore = await getUpDownConfig();
  const savedKey = process.env.TWELVEDATA_API_KEY;
  delete process.env.TWELVEDATA_API_KEY;
  const setFeed = await setUpDownConfig({ observationMethod: "feed", feedProvider: "twelvedata" }, OFFICER);
  ok("E86.0 · the unconfigured feed fixture is in place", setFeed.ok, setFeed.ok ? "" : setFeed.error);

  const b = B(300);
  const o = await observationStore.ensure(asset.id, b);
  const t0 = Date.parse(b);

  const first = await acquireObservation(asset, b, t0);
  const afterFirst = (await observationStore.get(o.id))!;
  ok("E86.1 · the read is refused without spending a life (the §11 carve-out still holds)",
     first.state === "pending" && afterFirst.attempts === 0, `${first.state} attempts=${afterFirst.attempts}`);
  ok("E86.2 · ⭐ …but WHEN we asked is now recorded — the rate control, not the money control",
     !!afterFirst.lastAttemptAt, `lastAttemptAt=${afterFirst.lastAttemptAt}`);

  // ⚠️ THE CLOCK IS DERIVED FROM THE ROW, exactly as §12 does it. `touchAttempt` stamps
  // WALL-CLOCK time while `acquireObservation` takes an INJECTED `now`, so timing the next read
  // from the synthetic boundary compares two unrelated clocks and the gate looks dead. In
  // production the two are the same instant; in a test they are not, and reading `lastAttemptAt`
  // back is the only honest base.
  const askedAt = Date.parse(afterFirst.lastAttemptAt!);

  // ⛔ THE HOLE ITSELF. One second later the provider must NOT be dialled again.
  const immediate = await acquireObservation(asset, b, askedAt + 1 * SEC);
  ok("E86.3 · ⭐⭐ a second read one second later is REFUSED BY THE LADDER, not sent",
     "detail" in immediate && /waiting \d+s/.test(immediate.detail),
     "detail" in immediate ? immediate.detail : "(no detail) — the metered provider was re-dialled");

  // ⚠️ And the wait must be a real rung. With nothing charged, `retryDelaySeconds(cfg, 0)` is 0
  // by design — reading it literally would restore the hole from the second read onward.
  const waited = "detail" in immediate ? Number(/waiting (\d+)s/.exec(immediate.detail)?.[1] ?? 0) : 0;
  ok("E86.4 · …and the wait is the ladder's FIRST RUNG, never zero",
     waited > 0 && waited >= restore.retryBackoffSeconds[0] - 1, `waiting ${waited}s`);

  // Past the rung it may ask again — a gate that never opens is an outage, not a fix.
  const later = await acquireObservation(asset, b, askedAt + (restore.retryBackoffSeconds[0] + 2) * SEC);
  ok("E86.5 · past the rung the read is allowed through again",
     !("detail" in later && /waiting/.test(later.detail)), "detail" in later ? later.detail : String(later.state));
  ok("E86.6 · …and STILL costs no life — the carve-out survives the spacing fix",
     (await observationStore.get(o.id))!.attempts === 0,
     `attempts=${(await observationStore.get(o.id))!.attempts}`);

  if (savedKey !== undefined) process.env.TWELVEDATA_API_KEY = savedKey;
  const back = await setUpDownConfig(
    { observationMethod: restore.observationMethod, feedProvider: restore.feedProvider }, OFFICER);
  if (!back.ok) throw new Error(back.error);
}

// ── E-86b · the classification itself, at the money decision ────────────────
{
  const cfg = await getUpDownConfig();
  // ⛔ THE ONE THAT VOIDED REAL ROUNDS. A rate limit is transient by definition: the identical
  // request succeeds a minute later, so charging it declares a boundary FAILED over our own
  // request rate. Same shape as `bar-not-published`, one union member away.
  ok("E86.7 · ⭐ a rate limit NEVER costs a life, at any elapsed time",
     [0, 60, 200, 1000].every((e) => refusalCostsAnAttempt("rate-limited", e, cfg) === false));
  ok("E86.8 · …while a genuine source failure still does — the budget is not disarmed",
     refusalCostsAnAttempt("error", 60, cfg) === true &&
     refusalCostsAnAttempt("unparseable-price", 60, cfg) === true);
  ok("E86.9 · …and an unpublished bar keeps its measured grace, unchanged",
     refusalCostsAnAttempt("bar-not-published", cfg.barPublicationGraceSeconds - 1, cfg) === false &&
     refusalCostsAnAttempt("bar-not-published", cfg.barPublicationGraceSeconds + 1, cfg) === true);

  // Both shapes the provider reports it in — an HTTP 429, and an in-band `code: 429` under
  // HTTP 200. Two readers × two shapes was four chances to classify one thing differently.
  ok("E86.10 · ⭐ a 429 is recognised as a rate limit however the provider reports it",
     isRateLimit(429, null) && isRateLimit(null, 429) && isRateLimit(200, 429));
  ok("E86.11 · …and an ordinary provider error is NOT swept into the carve-out",
     !isRateLimit(500, null) && !isRateLimit(404, null) && !isRateLimit(null, 400));
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);