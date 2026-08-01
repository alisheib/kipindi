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
 * THE ORACLE IS NEVER STUBBED AWAY. With no ANTHROPIC_API_KEY the REAL `observePrice`
 * refuses `no-api-key` before any network call, so the ladder runs for real, for free,
 * and its attempt accounting is genuine rather than simulated.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
delete process.env.ANTHROPIC_API_KEY; // the oracle must refuse locally, never dial out

import { assetStore, chainStore, roundStore, observationStore, __resetUpDownMemoryStores } from "../src/lib/server/updown-dal.ts";
import {
  createAsset, setAssetEnabled, createChain, setChainState, setUpDownConfig, getUpDownConfig,
  __resetUpDownConfig,
  retryDelaySeconds, ladderSpanSeconds, abandonAfterSeconds, ABANDON_GRACE_SECONDS,
  DEFAULT_UPDOWN_CONFIG,
} from "../src/lib/server/updown-config.ts";
import {
  openRound, closeRound, advanceChain, healStuckRounds, voidRoundByOperator,
} from "../src/lib/server/updown-service.ts";
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
  key: "XAU", symbol: "XAU/USD", nameEn: "Gold", nameSw: "Dhahabu", iconKey: "gold",
  priceSourceUrl: "https://www.kitco.com/price/precious-metals", category: "macro",
  decimals: 2, minMoveTicks: 1,
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
await setUpDownConfig({ defaultMinStake: 500 }, OFFICER);

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

  const bet = await buyPosition(alpha, { marketId: strandedMarketId, side: "YES", stake: 500 });
  ok("2.1 · a real stake enters the round", bet.ok, bet.ok ? "" : bet.error);
  ok("2.2 · the money has left the wallet", (await balanceOf(alpha)) === START_BALANCE - 500, String(await balanceOf(alpha)));

  // ① ORPHANING. The boundary passes with no confirmed reading, so the round stays
  // pending — and `advanceChain` opens the NEXT round, moving `currentRoundId` off it.
  await chainStore.patch(chain.id, { nextBoundaryAt: B(1) });
  const adv = await advanceChain(chain.id);
  ok("2.3 · the boundary could not confirm (the REAL oracle refused, no network)",
     adv.observation === "pending", `${adv.observation} ${adv.detail ?? ""}`);
  ok("2.4 · ⚠️ THE BUG — the round is still unresolved after its own boundary",
     !(await roundStore.get(strandedRoundId))!.resolvedAt);
  ok("2.5 · ⚠️ THE BUG — the chain has already moved on, orphaning it",
     (await chainStore.get(chain.id))!.currentRoundId !== strandedRoundId,
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
     (await balanceOf(alpha)) === START_BALANCE - 500, String(await balanceOf(alpha)));

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
  const readers = ["src/lib/server/updown-config.ts", "src/lib/server/updown-service.ts", "src/lib/server/updown-scheduler.ts"]
    .filter((f) => /cfg\.retryBackoffSeconds|config\.retryBackoffSeconds/.test(read(f)));
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
  ok("10.7 · the action reads its domain from CONTROL_DOMAIN, not a literal",
     /CONTROL_DOMAIN\.voidUpDownRound/.test(actions) &&
     /voidUpDownRound:\s*"compliance"/.test(read("src/lib/server/control-gates.ts")),
     "hard-coded domain");
  ok("10.8 · …and the page renders a locked state rather than a button that bounces",
     /ControlLocked/.test(read("src/app/admin/updown/rounds/page.tsx")) &&
     /canUseControl\(session\?\.role, "voidUpDownRound"\)/.test(read("src/app/admin/updown/rounds/page.tsx")),
     "no locked state");
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
