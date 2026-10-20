/**
 * An officer's upheld objection changes Up & Down's payable verdict, its linked
 * round, and the player's board/detail together. Run without DATABASE_URL for the
 * memory twin, or with a disposable loopback DATABASE_URL for PostgreSQL.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import pg from "pg";

process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
process.env.SMS_PROVIDER = "console";
process.env.MARKET_SCHEDULER = "false";
process.env.UPDOWN_SCHEDULER = "false";
process.env.UPDOWN_HEALER = "false";
process.env.HOUSE_BOT_ENGINE = "false";

// db:scratch supplies an admin URL. This fixture owns one newly migrated database
// within that loopback cluster and drops only that database when it finishes.
const scratch = process.env.VERIFY_DATABASE_URL ?? "";
const scratchDb = scratch ? `ud_objection_${process.pid}_${Date.now()}` : "";
if (scratch) {
  const adminUrl = new URL(scratch);
  assert.ok(["127.0.0.1", "localhost", "::1", "[::1]"].includes(adminUrl.hostname),
    "this money fixture requires loopback PostgreSQL");
  const admin = new pg.Client({ connectionString: scratch });
  try {
    await admin.connect();
    await admin.query(`CREATE DATABASE "${scratchDb}"`);
  } finally { await admin.end(); }
  adminUrl.pathname = `/${scratchDb}`;
  adminUrl.searchParams.set("connect_timeout", "30");
  const dbUrl = adminUrl.toString();
  try {
    execFileSync("npx", ["prisma", "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: dbUrl }, stdio: "inherit", shell: process.platform === "win32",
    });
  } catch (error) {
    const admin = new pg.Client({ connectionString: scratch });
    try {
      await admin.connect();
      await admin.query(`DROP DATABASE IF EXISTS "${scratchDb}" WITH (FORCE)`);
    } finally { await admin.end(); }
    throw error;
  }
  process.env.DATABASE_URL = dbUrl;
  process.env.USE_PRISMA_DAL = "true";
} else if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname),
    "this money fixture runs only on disposable loopback PostgreSQL");
}

const { db } = await import("../src/lib/server/store.ts");
const { marketStore, positionStore } = await import("../src/lib/server/market-dal.ts");
const UD = await import("../src/lib/server/updown-dal.ts");
const UC = await import("../src/lib/server/updown-config.ts");
const { openRound, closeRound, healStuckRounds, reconcileTerminalRound } = await import("../src/lib/server/updown-service.ts");
const { withLock } = await import("../src/lib/server/locks.ts");
const { buyPosition, settleMarket, emergencyVoidMarket } = await import("../src/lib/server/market-service.ts");
const { getAuditForTargetsDurable, auditFlush, auditPending } = await import("../src/lib/server/audit.ts");
const { holdSettlementAsOfficer, upholdObjection, rejectObjection, closeObjectionsForVoidedMarket } = await import("../src/lib/server/objections-service.ts");
const { getBoard, getRoundDetail } = await import("../src/lib/server/updown-board.ts");
const { seedDefaultSources, addSource } = await import("../src/lib/server/source-registry.ts");

// Objection and emergency-void callbacks intentionally fire their notices and
// audit writes after commit. The scratch DB belongs to this fixture; dropping
// it while those promises are still running produces false E57P01 errors and
// can conceal a missing notice. Track the DAL seams those callbacks use and
// wait for them plus the audit queue before teardown.
const pendingPostCommit = new Set<Promise<unknown>>();
const restoreTrackedMethods: Array<() => void> = [];
let postCommitCalls = 0;
if (scratchDb) {
  const watch = (object: unknown, key: string) => {
    const methods = object as Record<string, (...args: unknown[]) => unknown>;
    const original = methods[key];
    methods[key] = (...args: unknown[]) => {
      const result = Reflect.apply(original, object, args);
      if (result && typeof (result as Promise<unknown>).then === "function") {
        const promise = Promise.resolve(result);
        pendingPostCommit.add(promise);
        postCommitCalls++;
        void promise.then(() => pendingPostCommit.delete(promise), () => pendingPostCommit.delete(promise));
      }
      return result;
    };
    restoreTrackedMethods.push(() => { methods[key] = original; });
  };
  watch(db.user, "listByRoles");
  watch(db.notification, "findRecentDuplicate");
  watch(db.notification, "create");
}
async function drainPostCommit(): Promise<boolean> {
  const deadline = Date.now() + 15_000;
  let stable = 0;
  let priorCalls = -1;
  while (Date.now() < deadline) {
    await Promise.allSettled([...pendingPostCommit]);
    await auditFlush();
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (pendingPostCommit.size === 0 && auditPending() === 0 && postCommitCalls === priorCalls) stable++;
    else stable = 0;
    if (stable >= 3) return true;
    priorCalls = postCommitCalls;
  }
  return false;
}

try {
if (!process.env.DATABASE_URL) { UD.__resetUpDownMemoryStores(); UC.__resetUpDownConfig(); }
await seedDefaultSources();
try { await addSource({ domain: "kitco.com", label: "Kitco", category: "crypto", rationale: "fixture", addedBy: "system" }); }
catch { /* already registered */ }

let passed = 0;
function check(label: string, condition: unknown): void {
  assert.ok(condition, label);
  passed++;
  console.log(`PASS ${label}`);
}

const tag = `OV${String(process.pid % 10_000).padStart(4, "0")}${String(Date.now() % 100_000).padStart(5, "0")}`;
let phoneSeq = 0;
async function user(suffix: string, role: "PLAYER" | "COMPLIANCE", balance: number): Promise<string> {
  const id = `usr_${tag}_${suffix}`;
  const now = new Date().toISOString();
  await db.user.create({
    id, phoneE164: `+2556${String(process.pid % 100_000).padStart(5, "0")}${String(++phoneSeq).padStart(3, "0")}`,
    email: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0,
    lockedUntil: null, role, status: "ACTIVE", locale: "EN", displayName: null,
    dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    recruitedBy: null, createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0,
    bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now } as never);
  return id;
}
const balance = async (id: string) => (await db.wallet.findByUserId(id))?.balance ?? -1;
const legacyRounds: Array<{ id: string; marketId: string; expected: "DOWN" | "VOID" }> = [];

const holder = await user("hold", "COMPLIANCE", 0);
const reviewer = await user("review", "COMPLIANCE", 0);
const competingReviewer = await user("compete", "COMPLIANCE", 0);
const upPlayer = await user("up", "PLAYER", 20_000);
const downPlayer = await user("down", "PLAYER", 20_000);

async function decidedButUnpaid(label: string, stampVerdict = true) {
  const key = `${tag}${label === "reverse" ? "R" : label === "void" ? "V" : label === "fault" ? "F" : label === "objection-fault" ? "O" : label === "emergency" ? "E" : label === "emergency-fault" ? "G" : label === "emergency-commit-fault" ? "H" : label === "emergency-memory-fault" ? "J" : label === "two-step" ? "T" : label === "close-race" ? "Q" : label === "close-fault" ? "W" : label === "legacy-race" ? "Z" : label === "unpaid-mismatch" ? "U" : "C"}`;
  const asset = await UC.createAsset({ key, symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", nameZh: "比特币",
    iconKey: "crypto", priceSourceUrl: "https://www.kitco.com/price/crypto", category: "crypto",
    decimals: 2, minMoveTicks: 2 }, reviewer);
  assert.ok(asset.ok, "fixture asset created");
  await UC.setAssetEnabled(asset.data.id, true, reviewer);
  const chain = await UC.createChain({ assetId: asset.data.id, durationMinutes: 5 }, reviewer);
  assert.ok(chain.ok, "fixture chain created");
  await UC.setChainState(chain.data.id, "RUNNING", reviewer);
  const storedChain = await UD.chainStore.get(chain.data.id);
  assert.ok(storedChain);
  const openedAt = new Date(Date.now() - 30_000).toISOString();
  const openObservation = await UD.observationStore.ensure(asset.data.id, openedAt);
  await UD.observationStore.confirm(openObservation.id, { price: 62_000, sourceUrl: "https://www.kitco.com/price/crypto",
    sourceQuotedAt: openedAt, evidence: "fixture open", confidence: 95, model: "test", rawHash: `${key}-open` });
  const opened = await openRound(storedChain, openedAt, openObservation.id, 62_000);
  assert.ok(opened.ok, "fixture round opened");
  const round = await UD.roundStore.get(opened.data.id);
  assert.ok(round?.upTarget != null && round.downTarget != null, "fixture has frozen targets");

  const upBet = await buyPosition(upPlayer, { marketId: round.marketId, side: "YES", stake: 2_000,
    idempotencyKey: `${key}-up` });
  const downBet = await buyPosition(downPlayer, { marketId: round.marketId, side: "NO", stake: 2_000,
    idempotencyKey: `${key}-down` });
  assert.ok(upBet.ok && downBet.ok, "both sides backed the round");

  const closePrice = round.upTarget + 10;
  const closeObservation = await UD.observationStore.ensure(asset.data.id, round.boundaryAt);
  await UD.observationStore.confirm(closeObservation.id, { price: closePrice, sourceUrl: "https://www.kitco.com/price/crypto",
    sourceQuotedAt: round.boundaryAt, evidence: "fixture close", confidence: 95, model: "test", rawHash: `${key}-close` });
  const now = new Date().toISOString();
  // This is the reachable closeRound crash/freeze shape: both verdict rows were
  // stamped, but settlement has not run. Officer hold is then the real service.
  if (stampVerdict) {
  await marketStore.stamp(round.marketId, { status: "RESOLVED", resolvedOutcome: "YES",
    resolutionEvidence: `Original close ${closePrice} crossed the up target ${round.upTarget}.`,
    resolutionStage1By: "system_updown", resolutionStage1At: now,
    resolutionStage2By: "system_updown", resolutionStage2At: now,
    objectionsClosedAt: new Date(Date.now() - 1000).toISOString(), settledAt: null });
  await UD.roundStore.patch(round.id, { outcome: "UP", voidReason: null,
    closeObservationId: closeObservation.id, closePrice, resolvedAt: now });
  }
  return { key, round, closePrice, closeObservationId: closeObservation.id };
}

for (const remedy of ["REVERSE", "VOID"] as const) {
  const f = await decidedButUnpaid(remedy.toLowerCase());
  const held = await holdSettlementAsOfficer(holder, { marketId: f.round.marketId,
    reason: "WRONG_OUTCOME", detail: "The recorded Up verdict needs an independent officer review." });
  check(`${remedy}: officer hold freezes the unpaid market`, held.ok);
  const frozen = await settleMarket(f.round.marketId);
  check(`${remedy}: the hold blocks settlement`, !frozen.ok && frozen.code === "OBJECTION_OPEN");
  const upBefore = await balance(upPlayer), downBefore = await balance(downPlayer);
  const ruling = await upholdObjection(held.data!.objectionId, reviewer, {
    remedy, note: "Reviewed the recorded price and the disputed outcome independently.",
  });
  check(`${remedy}: independent officer may uphold`, ruling.ok);

  const market = await marketStore.get(f.round.marketId);
  const round = await UD.roundStore.get(f.round.id);
  const expectedMarket = remedy === "REVERSE" ? "NO" : "VOID";
  const expectedRound = remedy === "REVERSE" ? "DOWN" : "VOID";
  check(`${remedy}: market and round agree on the payable verdict`,
    market?.resolvedOutcome === expectedMarket && round?.outcome === expectedRound);
  check(`${remedy}: officer correction is attributed without a private note`,
    market?.resolutionEvidence?.startsWith("UPDOWN_OFFICER_CORRECTION:") &&
    !market.resolutionEvidence.includes("Reviewed the recorded price"));
  check(`${remedy}: source price, observation and frozen targets stay unchanged`,
    round?.closePrice === f.closePrice && round.closeObservationId === f.closeObservationId &&
    round.upTarget === f.round.upTarget && round.downTarget === f.round.downTarget);
  check(`${remedy}: void reason names the officer instead of the price source`,
    remedy === "REVERSE" ? round?.voidReason === null : round?.voidReason === "operator");
  check(`${remedy}: the ruling remains audited as UPHELD`,
    (await db.objection.findById(held.data!.objectionId))?.status === "UPHELD");

  const detail = await getRoundDetail(f.round.id, upPlayer);
  check(`${remedy}: detail projects corrected verdict and marks review`,
    detail?.round.outcome === expectedRound && detail.round.correctionKind === "objection" &&
    detail.proof?.closePrice === f.closePrice);
  const board = await getBoard({ assetKey: f.key, durationMinutes: 5, userId: upPlayer });
  check(`${remedy}: board projects the same corrected verdict and review cue`,
    board.rounds.some((r) => r.roundId === f.round.id && r.outcome === expectedRound && r.correctionKind === "objection"));

  if (remedy === "REVERSE") {
    // The corrected side gets a fresh objection window. Advance only this fixture's
    // market to the deadline, then let the real money settlement run.
    check("REVERSE: new objection window is open", !!market?.objectionsClosedAt && Date.parse(market.objectionsClosedAt) > Date.now());
    await marketStore.stamp(f.round.marketId, { objectionsClosedAt: new Date(Date.now() - 1000).toISOString() });
  }
  const settled = await settleMarket(f.round.marketId);
  check(`${remedy}: real money settlement completes`, settled.ok);
  const positions = await positionStore.listForMarket(f.round.marketId);
  check(`${remedy}: both positions reach terminal money states`, positions.length === 2 && positions.every((p) => p.status !== "OPEN"));
  if (remedy === "REVERSE") {
    check("REVERSE: NO player receives winnings; UP player receives none",
      (await balance(downPlayer)) > downBefore && (await balance(upPlayer)) === upBefore);
  } else {
    check("VOID: both still-held stakes return exactly once",
      (await balance(upPlayer)) === upBefore + 2_000 && (await balance(downPlayer)) === downBefore + 2_000);
  }
  const balancesAfter = [await balance(upPlayer), await balance(downPlayer)];
  const replay = await settleMarket(f.round.marketId);
  check(`${remedy}: replay cannot pay twice`, !replay.ok &&
    (await balance(upPlayer)) === balancesAfter[0] && (await balance(downPlayer)) === balancesAfter[1]);
  legacyRounds.push({ id: f.round.id, marketId: f.round.marketId, expected: expectedRound });
}

// Before this fix, the healer copied only settledAt. Simulate an older officer
// correction where the market and money were already final but the round still
// said the initial price verdict. The healer must restore both verdict and stamp.
for (const r of legacyRounds) await UD.roundStore.patch(r.id, { outcome: "UP", voidReason: null });
// Older settled records may have a corrected market verdict but no dedicated
// provenance prefix. Before the heal, the round/market mismatch is the only
// public cue. The heal must make it durable before the mismatch disappears.
const prefixlessLegacy = legacyRounds[0];
const legacyPriceEvidence = "Original confirmed close price remained above the frozen UP target.";
await marketStore.stamp(prefixlessLegacy.marketId, { resolutionEvidence: legacyPriceEvidence });
process.env.UPDOWN_HEALER = "true";
const healed = await healStuckRounds({ limit: 10 });
process.env.UPDOWN_HEALER = "false";
check("LEGACY: healer scans decided rounds whose own settle stamp was lost", healed.settled >= legacyRounds.length);
for (const r of legacyRounds) {
  const [round, market] = await Promise.all([UD.roundStore.get(r.id), marketStore.get(r.marketId)]);
  check(`LEGACY: healer restores ${r.expected} from the paid market`,
    round?.outcome === r.expected && !!round.settledAt && round.settledAt === market?.settledAt &&
    (r.expected !== "VOID" || round.voidReason === "operator"));
}
const legacyMarket = await marketStore.get(prefixlessLegacy.marketId);
const legacyDetail = await getRoundDetail(prefixlessLegacy.id, upPlayer);
check("LEGACY: prefixless verdict mismatch gains a durable generic correction cue",
  legacyMarket?.resolutionEvidence?.startsWith("UPDOWN_RECORD_CORRECTION:") &&
  legacyMarket.resolutionEvidence.includes(legacyPriceEvidence) &&
  legacyDetail?.round.correctionKind === "record");

// A legacy round can already have BOTH terminal stamps and still disagree with
// the market's paid verdict. An outcome or resolvedAt is not proof of agreement.
// Feed the reconciler a stale close price to prove it only repairs the verdict.
for (const r of legacyRounds) {
  const market = await marketStore.get(r.marketId);
  const previous = await UD.roundStore.get(r.id);
  assert.ok(market?.settledAt && previous?.resolvedAt && previous.settledAt);
  const recorded = structuredClone(previous);
  if (r.expected === "DOWN") await marketStore.stamp(r.marketId, { resolutionEvidence: legacyPriceEvidence });
  await UD.roundStore.patch(r.id, { outcome: "UP", voidReason: null });
  const repaired = await reconcileTerminalRound(recorded, null, 1, "source-failed");
  const [round, finalMarket] = await Promise.all([UD.roundStore.get(r.id), marketStore.get(r.marketId)]);
  check(`TERMINAL MISMATCH: settled ${r.expected} market repairs recorded UP round`,
    repaired?.already === false && repaired.outcome === r.expected &&
    round?.outcome === r.expected && round.settledAt === market.settledAt);
  check(`TERMINAL MISMATCH: ${r.expected} keeps observed price, source and frozen targets`,
    round?.closePrice === recorded.closePrice && round.closeObservationId === recorded.closeObservationId &&
    round.upTarget === recorded.upTarget && round.downTarget === recorded.downTarget);
  if (r.expected === "DOWN") check("TERMINAL MISMATCH: prefixless paid correction gains durable provenance",
    finalMarket?.resolutionEvidence?.startsWith("UPDOWN_RECORD_CORRECTION:") &&
    finalMarket.resolutionEvidence.includes(legacyPriceEvidence));
  else check("TERMINAL MISMATCH: officer VOID retains its recorded reason",
    round?.voidReason === "operator" && finalMarket?.resolutionEvidence?.startsWith("UPDOWN_OFFICER_CORRECTION:"));
  const replay = await reconcileTerminalRound(recorded, null, 1, "source-failed");
  const replayMarket = await marketStore.get(r.marketId);
  check(`TERMINAL MISMATCH: ${r.expected} replay is a no-op`,
    replay?.already === true && replayMarket?.resolutionEvidence === finalMarket?.resolutionEvidence);
}

// If the round write fails after provenance was stamped, neither store may
// claim that a correction completed. The retry must still see the mismatch.
{
  const r = legacyRounds[0];
  await marketStore.stamp(r.marketId, { resolutionEvidence: legacyPriceEvidence });
  await UD.roundStore.patch(r.id, { outcome: "UP", voidReason: null });
  const stale = await UD.roundStore.get(r.id);
  assert.ok(stale);
  const originalPatch = UD.roundStore.patch;
  UD.roundStore.patch = (async (...args: Parameters<typeof originalPatch>) => {
    if (args[0] === r.id && args[1].outcome === "DOWN") throw new Error("injected terminal mismatch repair fault");
    return originalPatch(...args);
  }) as typeof originalPatch;
  let failed = false;
  try { await reconcileTerminalRound(stale, null, 1, "source-failed"); }
  catch (error) { failed = String(error).includes("injected terminal mismatch repair fault"); }
  finally { UD.roundStore.patch = originalPatch; }
  check("TERMINAL MISMATCH FAULT: failed round write is reported", failed);
  check("TERMINAL MISMATCH FAULT: market provenance and round verdict roll back together",
    (await UD.roundStore.get(r.id))?.outcome === "UP" &&
    (await marketStore.get(r.marketId))?.resolutionEvidence === legacyPriceEvidence);
  const retry = await reconcileTerminalRound(stale, null, 1, "source-failed");
  check("TERMINAL MISMATCH FAULT: retry repairs one truthful terminal verdict",
    retry?.already === false && (await UD.roundStore.get(r.id))?.outcome === "DOWN" &&
    (await marketStore.get(r.marketId))?.resolutionEvidence?.startsWith("UPDOWN_RECORD_CORRECTION:"));
}

// A market may be adjudicated while objections still hold its money. Its
// correction record must never say it was paid before settlement commits.
{
  const f = await decidedButUnpaid("unpaid-mismatch");
  await UD.roundStore.patch(f.round.id, { outcome: "DOWN" });
  const repaired = await reconcileTerminalRound(f.round, null, 1, "source-failed");
  const [market, round] = await Promise.all([
    marketStore.get(f.round.marketId), UD.roundStore.get(f.round.id),
  ]);
  check("UNPAID MISMATCH: verdict repairs while money remains held",
    repaired?.already === false && round?.outcome === "UP" && !round.settledAt && !market?.settledAt);
  check("UNPAID MISMATCH: provenance names the market verdict without claiming payment",
    market?.resolutionEvidence?.includes("reconciled with the market verdict UP") &&
    !market.resolutionEvidence.includes("paid market verdict"));
}

// A stale healer read must not overwrite the emergency or officer record that
// commits while the healer is waiting for this market lock. The patch gate makes
// the historical unlocked fallback deterministically write AFTER the new VOID.
{
  const f = await decidedButUnpaid("legacy-race", false);
  await marketStore.stamp(f.round.marketId, {
    status: "RESOLVED", resolvedOutcome: "YES",
    resolutionEvidence: "Original price verdict UP",
    resolutionStage2At: new Date().toISOString(),
  });
  const originalPatch = UD.roundStore.patch;
  let releaseStalePatch!: () => void;
  const stalePatchGate = new Promise<void>((resolve) => { releaseStalePatch = resolve; });
  let sawStalePatch!: () => void;
  const stalePatchSeen = new Promise<void>((resolve) => { sawStalePatch = resolve; });
  UD.roundStore.patch = async (...args) => {
    if (args[0] === f.round.id && args[1].outcome === "UP") {
      sawStalePatch();
      await stalePatchGate;
    }
    return originalPatch(...args);
  };
  let reconciling!: ReturnType<typeof reconcileTerminalRound>;
  let markLockHeld!: () => void;
  const lockHeld = new Promise<void>((resolve) => { markLockHeld = resolve; });
  let doVoid!: () => void;
  const voidGate = new Promise<void>((resolve) => { doVoid = resolve; });
  try {
    const holding = withLock(`market:${f.round.marketId}`, async (lockTx) => {
      markLockHeld();
      await voidGate;
      const at = new Date().toISOString();
      await marketStore.stamp(f.round.marketId, {
        status: "VOIDED", resolvedOutcome: "VOID", resolutionEvidence: "Officer emergency cancellation",
        settledAt: at, resolutionStage2At: at,
      }, lockTx);
      if (lockTx) await lockTx.upDownRound.update({ where: { id: f.round.id }, data: {
        outcome: "VOID", voidReason: "operator", resolvedAt: new Date(at), settledAt: new Date(at),
      } });
      else await originalPatch(f.round.id, { outcome: "VOID", voidReason: "operator", resolvedAt: at, settledAt: at });
    });
    await lockHeld;
    // Start outside the held lock's async context. The correct helper waits;
    // the historical unlocked helper reaches the trapped stale UP patch.
    reconciling = reconcileTerminalRound(f.round, f.closeObservationId, f.closePrice, "source-failed");
    await Promise.race([stalePatchSeen, new Promise((resolve) => setTimeout(resolve, 250))]);
    doVoid();
    await holding;
  } finally {
    releaseStalePatch();
    UD.roundStore.patch = originalPatch;
  }
  await reconciling;
  const [finalMarket, finalRound] = await Promise.all([
    marketStore.get(f.round.marketId), UD.roundStore.get(f.round.id),
  ]);
  check("LEGACY RACE: paid market retains officer VOID",
    finalMarket?.resolvedOutcome === "VOID");
  check("LEGACY RACE: healer never overwrites newer round verdict or price",
    finalRound?.outcome === "VOID" && finalRound.voidReason === "operator" && finalRound.closePrice === null);
}

if (!process.env.DATABASE_URL) {
  // The local twin has no database transaction. Inject a failure after the
  // market stamp and prove compensation restores the old verdict before retry.
  const f = await decidedButUnpaid("fault");
  const held = await holdSettlementAsOfficer(holder, { marketId: f.round.marketId,
    reason: "WRONG_OUTCOME", detail: "Hold the money while the officer checks this result." });
  assert.ok(held.ok);
  const patch = UD.roundStore.patch;
  let failOnce = true;
  UD.roundStore.patch = async (...args) => {
    if (failOnce) { failOnce = false; throw new Error("injected local round write fault"); }
    return patch(...args);
  };
  let threw = false;
  try {
    await upholdObjection(held.data.objectionId, reviewer, { remedy: "REVERSE", note: "Review confirmed reverse outcome." });
  } catch { threw = true; }
  finally { UD.roundStore.patch = patch; }
  check("FAULT: injected round write is observed as a failed ruling", threw);
  const [market, round, objection] = await Promise.all([
    marketStore.get(f.round.marketId), UD.roundStore.get(f.round.id), db.objection.findById(held.data.objectionId),
  ]);
  check("FAULT: memory rollback leaves verdict and case unchanged",
    market?.resolvedOutcome === "YES" && round?.outcome === "UP" && objection?.status === "OPEN");
  const retry = await upholdObjection(held.data.objectionId, reviewer, { remedy: "REVERSE", note: "Review confirmed reverse outcome." });
  check("FAULT: safe retry applies correction exactly once", retry.ok &&
    (await marketStore.get(f.round.marketId))?.resolvedOutcome === "NO" &&
    (await UD.roundStore.get(f.round.id))?.outcome === "DOWN");

  const o = await decidedButUnpaid("objection-fault");
  const opened = await holdSettlementAsOfficer(holder, { marketId: o.round.marketId,
    reason: "WRONG_OUTCOME", detail: "Hold the money while the officer checks this result." });
  assert.ok(opened.ok);
  const update = db.objection.update;
  let objectionFailOnce = true;
  db.objection.update = async (...args) => {
    if (objectionFailOnce) { objectionFailOnce = false; throw new Error("injected local objection write fault"); }
    return update(...args);
  };
  let objectionThrew = false;
  try {
    await upholdObjection(opened.data.objectionId, reviewer, { remedy: "VOID", note: "Review confirmed a void." });
  } catch { objectionThrew = true; }
  finally { db.objection.update = update; }
  check("FAULT: injected objection write is observed as a failed ruling", objectionThrew);
  const [objectionMarket, objectionRound, objectionCase] = await Promise.all([
    marketStore.get(o.round.marketId), UD.roundStore.get(o.round.id), db.objection.findById(opened.data.objectionId),
  ]);
  check("FAULT: memory rollback restores both verdicts after objection write fails",
    objectionMarket?.resolvedOutcome === "YES" && objectionRound?.outcome === "UP" && objectionCase?.status === "OPEN");
  const objectionRetry = await upholdObjection(opened.data.objectionId, reviewer,
    { remedy: "VOID", note: "Review confirmed a void." });
  check("FAULT: objection-write retry applies a single VOID ruling", objectionRetry.ok &&
    (await marketStore.get(o.round.marketId))?.resolvedOutcome === "VOID" &&
    (await UD.roundStore.get(o.round.id))?.outcome === "VOID" &&
    (await db.objection.findById(opened.data.objectionId))?.status === "UPHELD");
}

if (scratchDb) {
  // A real database error between the market and round writes must roll the
  // entire officer ruling back, including the objection status and evidence.
  const f = await decidedButUnpaid("fault");
  const held = await holdSettlementAsOfficer(holder, { marketId: f.round.marketId,
    reason: "WRONG_OUTCOME", detail: "Hold the money while the officer checks this result." });
  assert.ok(held.ok);
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`CREATE FUNCTION ud_objection_fail_round_update() RETURNS trigger AS $$
      BEGIN IF NEW.outcome IS DISTINCT FROM OLD.outcome THEN
        RAISE EXCEPTION 'injected round verdict write fault'; END IF;
        RETURN NEW; END; $$ LANGUAGE plpgsql`);
    await client.query(`CREATE TRIGGER ud_objection_fail_round_update BEFORE UPDATE ON "UpDownRound"
      FOR EACH ROW EXECUTE FUNCTION ud_objection_fail_round_update()`);
    let threw = false;
    try {
      await upholdObjection(held.data.objectionId, reviewer,
        { remedy: "REVERSE", note: "Review confirmed reverse outcome." });
    } catch { threw = true; }
    check("PG FAULT: a round write failure aborts the officer ruling", threw);
    const [market, round, objection] = await Promise.all([
      marketStore.get(f.round.marketId), UD.roundStore.get(f.round.id), db.objection.findById(held.data.objectionId),
    ]);
    check("PG FAULT: market, round and objection all roll back atomically",
      market?.resolvedOutcome === "YES" && round?.outcome === "UP" && objection?.status === "OPEN");
  } finally {
    await client.query(`DROP TRIGGER IF EXISTS ud_objection_fail_round_update ON "UpDownRound"`);
    await client.query("DROP FUNCTION IF EXISTS ud_objection_fail_round_update()");
    await client.end();
  }
  const retry = await upholdObjection(held.data.objectionId, reviewer,
    { remedy: "REVERSE", note: "Review confirmed reverse outcome." });
  check("PG FAULT: safe retry commits market, round and objection together", retry.ok &&
    (await marketStore.get(f.round.marketId))?.resolvedOutcome === "NO" &&
    (await UD.roundStore.get(f.round.id))?.outcome === "DOWN" &&
    (await db.objection.findById(held.data.objectionId))?.status === "UPHELD");
}

// The generic emergency VOID path closes objections after refunding held
// positions. Its nested call must share the same market lock and, on PG, the
// same transaction; it must not leave a case UPHELD if that transaction aborts.
{
  const f = await decidedButUnpaid("two-step");
  const longPriceEvidence = `Original close ${f.closePrice} crossed the up target ${f.round.upTarget}. ` +
    `Source price evidence retained after review: ${"observed-price-record ".repeat(130)}END-PRICE-EVIDENCE`;
  await marketStore.stamp(f.round.marketId, { resolutionEvidence: longPriceEvidence });
  const held = await holdSettlementAsOfficer(holder, { marketId: f.round.marketId,
    reason: "WRONG_OUTCOME", detail: "First officer rules the recorded price verdict void." });
  assert.ok(held.ok);
  const corrected = await upholdObjection(held.data.objectionId, reviewer,
    { remedy: "VOID", note: "Review found the price verdict should be void." });
  check("TWO-STEP: objection VOID is recorded before money settlement", corrected.ok &&
    (await marketStore.get(f.round.marketId))?.resolutionEvidence?.startsWith("UPDOWN_OFFICER_CORRECTION:"));
  const emergency = await emergencyVoidMarket({ marketId: f.round.marketId, officerId: reviewer,
    reason: "Emergency cancellation after the corrected VOID verdict." });
  const [market, round, detail] = await Promise.all([
    marketStore.get(f.round.marketId), UD.roundStore.get(f.round.id), getRoundDetail(f.round.id, upPlayer),
  ]);
  check("TWO-STEP: emergency refund preserves objection correction and original price evidence",
    emergency.ok && market?.resolutionEvidence?.startsWith("UPDOWN_OFFICER_CORRECTION:") &&
    market.resolutionEvidence.includes(longPriceEvidence) &&
    market.resolutionEvidence.includes("Emergency cancellation") &&
    round?.outcome === "VOID" && round.closePrice === f.closePrice &&
    detail?.round.correctionKind === "objection");
}

{
  const f = await decidedButUnpaid("emergency");
  const held = await holdSettlementAsOfficer(holder, { marketId: f.round.marketId,
    reason: "WRONG_OUTCOME", detail: "The entire round must be voided before this pool pays." });
  assert.ok(held.ok);
  const priorRound = await UD.roundStore.get(f.round.id);
  const upBefore = await balance(upPlayer), downBefore = await balance(downPlayer);
  const longOfficerReason = `Fixture officer emergency voids the disputed round. ${"Long public reason. ".repeat(145)}`;
  const voided = await emergencyVoidMarket({ marketId: f.round.marketId, officerId: reviewer,
    reason: longOfficerReason });
  check("EMERGENCY: officer void refunds both held positions", voided.ok && voided.data?.refundedCount === 2 &&
    (await balance(upPlayer)) === upBefore + 2_000 && (await balance(downPlayer)) === downBefore + 2_000);
  const [market, objection, positions, round, detail, board] = await Promise.all([
    marketStore.get(f.round.marketId), db.objection.findById(held.data.objectionId),
    positionStore.listForMarket(f.round.marketId), UD.roundStore.get(f.round.id),
    getRoundDetail(f.round.id, upPlayer), getBoard({ assetKey: f.key, durationMinutes: 5, userId: upPlayer }),
  ]);
  check("EMERGENCY: money verdict and objection closure agree", market?.status === "VOIDED" &&
    market.resolvedOutcome === "VOID" && !!market.settledAt &&
    objection?.status === "UPHELD" && objection.remedy === "VOID" &&
    positions.length === 2 && positions.every((p) => p.status === "VOID" && p.finalPayout === p.stake));
  check("EMERGENCY: linked round is VOID and settled with the market, retaining observed prices and targets",
    round?.outcome === "VOID" && round.voidReason === "operator" && round.settledAt === market?.settledAt &&
    round.resolvedAt === priorRound?.resolvedAt && round.closePrice === f.closePrice &&
    round.closeObservationId === f.closeObservationId &&
    round.upTarget === f.round.upTarget && round.downTarget === f.round.downTarget);
  check("EMERGENCY: officer cancellation keeps its distinct public proof cue",
    market?.resolutionEvidence?.startsWith("UPDOWN_OPERATOR_VOID:") &&
    detail?.round.correctionKind === "operator" &&
    board.rounds.some((r) => r.roundId === f.round.id && r.correctionKind === "operator"));
  check("EMERGENCY: long reason and original price evidence survive unchanged",
    market?.resolutionEvidence?.includes(`Original close ${f.closePrice}`) &&
    market.resolutionEvidence.includes(longOfficerReason.trim()));
}

if (!process.env.DATABASE_URL) {
  const f = await decidedButUnpaid("emergency-memory-fault");
  const first = await holdSettlementAsOfficer(holder, { marketId: f.round.marketId,
    reason: "WRONG_OUTCOME", detail: "One officer holds this disputed round." });
  const second = await holdSettlementAsOfficer(competingReviewer, { marketId: f.round.marketId,
    reason: "WRONG_OUTCOME", detail: "A second officer also holds this disputed round." });
  assert.ok(first.ok && second.ok);
  const update = db.objection.update;
  let calls = 0;
  db.objection.update = async (...args) => {
    if (++calls === 2) throw new Error("injected second emergency case write fault");
    return update(...args);
  };
  let threw = false;
  const upBefore = await balance(upPlayer), downBefore = await balance(downPlayer);
  try {
    await emergencyVoidMarket({ marketId: f.round.marketId, officerId: reviewer,
      reason: "Fixture emergency void with one case-write fault." });
  } catch (error) { threw = String(error).includes("injected second emergency case write fault"); }
  finally { db.objection.update = update; }
  check("MEMORY EMERGENCY FAULT: case-write fault aborts the whole void", threw);
  check("MEMORY EMERGENCY FAULT: both cases, money and round restore together",
    (await db.objection.findById(first.data.objectionId))?.status === "OPEN" &&
    (await db.objection.findById(second.data.objectionId))?.status === "OPEN" &&
    (await marketStore.get(f.round.marketId))?.resolvedOutcome === "YES" &&
    !(await marketStore.get(f.round.marketId))?.settledAt &&
    (await UD.roundStore.get(f.round.id))?.outcome === "UP" &&
    (await balance(upPlayer)) === upBefore && (await balance(downPlayer)) === downBefore);
  const retry = await emergencyVoidMarket({ marketId: f.round.marketId, officerId: reviewer,
    reason: "Fixture emergency void with one case-write fault." });
  check("MEMORY EMERGENCY FAULT: retry pays each holder once and closes both cases", retry.ok &&
    (await db.objection.findById(first.data.objectionId))?.status === "UPHELD" &&
    (await db.objection.findById(second.data.objectionId))?.status === "UPHELD" &&
    (await balance(upPlayer)) === upBefore + 2_000 && (await balance(downPlayer)) === downBefore + 2_000);
}

if (scratchDb) {
  const f = await decidedButUnpaid("emergency-fault");
  const held = await holdSettlementAsOfficer(holder, { marketId: f.round.marketId,
    reason: "WRONG_OUTCOME", detail: "The entire round must be voided before this pool pays." });
  assert.ok(held.ok);
  const upBefore = await balance(upPlayer), downBefore = await balance(downPlayer);
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(`CREATE FUNCTION ud_objection_fail_case_close() RETURNS trigger AS $$
    BEGIN IF NEW.status::text = 'UPHELD' THEN
      RAISE EXCEPTION 'injected objection closure fault'; END IF;
      RETURN NEW; END; $$ LANGUAGE plpgsql`);
  await client.query(`CREATE TRIGGER ud_objection_fail_case_close BEFORE UPDATE ON "Objection"
    FOR EACH ROW EXECUTE FUNCTION ud_objection_fail_case_close()`);
  let threw = false;
  try {
    await emergencyVoidMarket({ marketId: f.round.marketId, officerId: reviewer,
      reason: "Fixture emergency closure fault must roll back." });
  } catch { threw = true; }
  finally {
    await client.query(`DROP TRIGGER ud_objection_fail_case_close ON "Objection"`);
    await client.query("DROP FUNCTION ud_objection_fail_case_close()");
    await client.end();
  }
  check("PG EMERGENCY FAULT: a failed objection closure aborts the void", threw);
  const [market, objection, positions] = await Promise.all([
    marketStore.get(f.round.marketId), db.objection.findById(held.data.objectionId),
    positionStore.listForMarket(f.round.marketId),
  ]);
  check("PG EMERGENCY FAULT: verdict, held stakes and objection all roll back",
    market?.resolvedOutcome === "YES" && market.status === "RESOLVED" && !market.settledAt &&
    objection?.status === "OPEN" && positions.length === 2 &&
    positions.every((p) => p.status === "OPEN" && p.finalPayout == null) &&
    (await balance(upPlayer)) === upBefore && (await balance(downPlayer)) === downBefore);
}

if (scratchDb) {
  // A deferred trigger fires only at COMMIT, after the refund loop, objection
  // closure, officer lookup and every notice registration. No player or officer
  // may receive a cancellation claim about this rolled-back transaction.
  const f = await decidedButUnpaid("emergency-commit-fault");
  const held = await holdSettlementAsOfficer(holder, { marketId: f.round.marketId,
    reason: "WRONG_OUTCOME", detail: "The entire round must be voided before this pool pays." });
  assert.ok(held.ok);
  const faultSince = new Date(Date.now() - 1_000).toISOString();
  const upBefore = await balance(upPlayer), downBefore = await balance(downPlayer);
  const officerBefore = (await db.notification.findByUser(reviewer, 100))
    .filter((n) => n.titleEn.startsWith("Market cancelled")).length;
  const objectorBefore = (await db.notification.findByUser(holder, 100))
    .filter((n) => n.titleEn === "Your objection was upheld" && n.href?.includes(f.round.marketId)).length;
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(`CREATE FUNCTION ud_objection_fail_commit() RETURNS trigger AS $$
    BEGIN IF NEW.status::text = 'UPHELD' THEN
      RAISE EXCEPTION 'injected deferred emergency commit fault'; END IF;
      RETURN NEW; END; $$ LANGUAGE plpgsql`);
  await client.query(`CREATE CONSTRAINT TRIGGER ud_objection_fail_commit AFTER UPDATE ON "Objection"
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ud_objection_fail_commit()`);
  let threw = false;
  try {
    await emergencyVoidMarket({ marketId: f.round.marketId, officerId: reviewer,
      reason: "Fixture emergency commit fault must send no refund claim." });
  } catch { threw = true; }
  finally {
    await client.query(`DROP TRIGGER ud_objection_fail_commit ON "Objection"`);
    await client.query("DROP FUNCTION ud_objection_fail_commit()");
    await client.end();
  }
  check("PG COMMIT FAULT: a deferred failure aborts the complete emergency void", threw);
  // Allow a pre-commit fire-and-forget notification mutant to complete its DB
  // insert before checking; the corrected path never starts those calls.
  await new Promise((resolve) => setTimeout(resolve, 100));
  const [market, objection, positions, upNotices, downNotices, officerNotices, objectorNotices] = await Promise.all([
    marketStore.get(f.round.marketId), db.objection.findById(held.data.objectionId),
    positionStore.listForMarket(f.round.marketId), db.notification.findByUser(upPlayer, 100),
    db.notification.findByUser(downPlayer, 100), db.notification.findByUser(reviewer, 100),
    db.notification.findByUser(holder, 100),
  ]);
  check("PG COMMIT FAULT: market, held stakes, case and balances all roll back",
    market?.resolvedOutcome === "YES" && market.status === "RESOLVED" && !market.settledAt &&
    objection?.status === "OPEN" && positions.length === 2 &&
    positions.every((p) => p.status === "OPEN" && p.finalPayout == null) &&
    (await balance(upPlayer)) === upBefore && (await balance(downPlayer)) === downBefore);
  check("PG COMMIT FAULT: no player or officer receives a false refund notice",
    !upNotices.some((n) => n.kind === "REFUND" && n.href?.includes(f.round.marketId)) &&
    !downNotices.some((n) => n.kind === "REFUND" && n.href?.includes(f.round.marketId)) &&
    officerNotices.filter((n) => n.titleEn.startsWith("Market cancelled")).length === officerBefore &&
    objectorNotices.filter((n) => n.titleEn === "Your objection was upheld" && n.href?.includes(f.round.marketId)).length === objectorBefore);
  const leakedAudit = await getAuditForTargetsDurable({
    targetType: "Market", targetIds: [f.round.marketId],
    actions: ["market.emergency_void", "objection.closed_by_void"], sinceIso: faultSince,
  });
  check("PG COMMIT FAULT: no false emergency or objection closure audit escapes",
    leakedAudit.entries.length === 0);
}

// A round write fault cannot leave a price-stamped market over an OPEN round.
if (!process.env.DATABASE_URL) {
  const f = await decidedButUnpaid("close-fault", false);
  const originalPatch = UD.roundStore.patch;
  UD.roundStore.patch = (async (...args: Parameters<typeof originalPatch>) => {
    if (args[0] === f.round.id && args[1].resolvedAt) throw new Error("injected close-round memory write fault");
    return originalPatch(...args);
  }) as typeof originalPatch;
  let threw = false;
  try { await closeRound(f.round.id, f.closeObservationId, f.closePrice); }
  catch (error) { threw = String(error).includes("close-round memory write fault"); }
  finally { UD.roundStore.patch = originalPatch; }
  check("CLOSE FAULT: round write failed after market stamp", threw);
  const market = await marketStore.get(f.round.marketId);
  const round = await UD.roundStore.get(f.round.id);
  check("CLOSE FAULT: memory restores both market and round before retry",
    market?.status === "LIVE" && market.resolvedOutcome == null && !market.settledAt &&
    round?.outcome == null && !round.resolvedAt);
  const retry = await closeRound(f.round.id, f.closeObservationId, f.closePrice);
  check("CLOSE FAULT: retry records one matching price verdict",
    retry.ok && (await marketStore.get(f.round.marketId))?.resolvedOutcome === "YES" &&
    (await UD.roundStore.get(f.round.id))?.outcome === "UP");
}
if (scratchDb) {
  const f = await decidedButUnpaid("close-fault", false);
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(`CREATE FUNCTION ud_close_fail_round() RETURNS trigger AS $$
    BEGIN IF NEW.outcome IS NOT NULL THEN RAISE EXCEPTION 'injected close-round PG write fault'; END IF;
    RETURN NEW; END; $$ LANGUAGE plpgsql`);
  await client.query(`CREATE TRIGGER ud_close_fail_round BEFORE UPDATE ON "UpDownRound"
    FOR EACH ROW EXECUTE FUNCTION ud_close_fail_round()`);
  let threw = false;
  try { await closeRound(f.round.id, f.closeObservationId, f.closePrice); }
  catch { threw = true; }
  finally {
    await client.query(`DROP TRIGGER ud_close_fail_round ON "UpDownRound"`);
    await client.query("DROP FUNCTION ud_close_fail_round()");
    await client.end();
  }
  check("PG CLOSE FAULT: round write aborts linked market stamp", threw &&
    (await marketStore.get(f.round.marketId))?.status === "LIVE" &&
    (await marketStore.get(f.round.marketId))?.resolvedOutcome == null &&
    !(await UD.roundStore.get(f.round.id))?.resolvedAt);
  const retry = await closeRound(f.round.id, f.closeObservationId, f.closePrice);
  check("PG CLOSE FAULT: retry records one matching price verdict",
    retry.ok && (await marketStore.get(f.round.marketId))?.resolvedOutcome === "YES" &&
    (await UD.roundStore.get(f.round.id))?.outcome === "UP");
}

// Hold the price stamp before its linked round write, then queue an emergency
// cancellation on the same market. The market mutex must keep the two verdict
// rows together; the queued officer cancellation may then replace both.
{
  const f = await decidedButUnpaid("close-race", false);
  const originalStamp = marketStore.stamp;
  let releaseStamp!: () => void;
  let stampReached!: () => void;
  const heldStamp = new Promise<void>((resolve) => { releaseStamp = resolve; });
  const reached = new Promise<void>((resolve) => { stampReached = resolve; });
  marketStore.stamp = (async (...args: Parameters<typeof originalStamp>) => {
    await originalStamp(...args);
    if (args[0] === f.round.marketId && args[1].resolutionStage1By === "system_updown") {
      stampReached();
      await heldStamp;
    }
  }) as typeof originalStamp;
  let closing: ReturnType<typeof closeRound> | null = null;
  let voiding: ReturnType<typeof emergencyVoidMarket> | null = null;
  try {
    closing = closeRound(f.round.id, f.closeObservationId, f.closePrice);
    await reached;
    voiding = emergencyVoidMarket({ marketId: f.round.marketId, officerId: reviewer,
      reason: "Fixture officer cancellation queued behind price verdict." });
    await new Promise((resolve) => setTimeout(resolve, 100));
  } finally { releaseStamp(); marketStore.stamp = originalStamp; }
  const [closeResult, voidResult] = await Promise.all([closing!, voiding!]);
  const market = await marketStore.get(f.round.marketId);
  const round = await UD.roundStore.get(f.round.id);
  check("CLOSE/VOID RACE: officer cancellation completes after the price lock", closeResult.ok && voidResult.ok);
  check("CLOSE/VOID RACE: market, round and player money end at one VOID verdict",
    market?.resolvedOutcome === "VOID" && !!market.settledAt &&
    round?.outcome === "VOID" && round.voidReason === "operator" && !!round.settledAt &&
    round.closePrice === f.closePrice &&
    (await positionStore.listForMarket(f.round.marketId)).every((p) => p.status === "VOID" && p.finalPayout === p.stake));
}

// A second officer may reject the same hold while the first tries to uphold it.
// Only one ruling can win the market lock; the loser must see the committed case.
{
  const f = await decidedButUnpaid("race");
  const held = await holdSettlementAsOfficer(holder, { marketId: f.round.marketId,
    reason: "WRONG_OUTCOME", detail: "The officer result is disputed before any money moves." });
  assert.ok(held.ok);
  const [upheld, rejected] = await Promise.all([
    upholdObjection(held.data.objectionId, reviewer, { remedy: "REVERSE", note: "Officer confirmed the reverse verdict." }),
    rejectObjection(held.data.objectionId, competingReviewer, "Officer confirmed the original price verdict."),
  ]);
  check("RACE: exactly one independent officer ruling commits", Number(upheld.ok) + Number(rejected.ok) === 1);
  const caseRow = await db.objection.findById(held.data.objectionId);
  const market = await marketStore.get(f.round.marketId);
  const round = await UD.roundStore.get(f.round.id);
  check("RACE: objection, market and round agree with the winning ruling",
    upheld.ok
      ? caseRow?.status === "UPHELD" && market?.resolvedOutcome === "NO" && round?.outcome === "DOWN"
      : caseRow?.status === "REJECTED" && market?.resolvedOutcome === "YES" && round?.outcome === "UP");
}

if (scratchDb) check("POSTCOMMIT DRAIN: objection notices and audit writes finish before scratch teardown",
  await drainPostCommit());
console.log(`ALL PASS — ${passed} passed, 0 failed (${process.env.DATABASE_URL ? "PostgreSQL" : "memory"})`);
} finally {
  if (scratchDb) {
    for (const restore of restoreTrackedMethods.reverse()) restore();
    try { await (await import("../src/lib/server/prisma.ts")).prisma().$disconnect(); } catch { /* no connection */ }
    const admin = new pg.Client({ connectionString: scratch });
    try {
      await admin.connect();
      await admin.query(`DROP DATABASE IF EXISTS "${scratchDb}" WITH (FORCE)`);
    } finally { await admin.end(); }
  }
}
