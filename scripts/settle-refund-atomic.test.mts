/**
 * Ordinary VOID and one-sided refunds must commit real credit, bonus principal,
 * turnover reversal, position, ledger and terminal market stamp together.
 * Runs in memory or on an owned disposable loopback PostgreSQL database.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import pg from "pg";
import "./lib/bonus-feature-on.mts";

process.env.EMAIL_OUTBOX_CAPTURE = "1";
process.env.POSTMARK_API_KEY = "";
process.env.SMS_PROVIDER = "console";
process.env.MARKET_SCHEDULER = "false";
process.env.UPDOWN_SCHEDULER = "false";
process.env.UPDOWN_HEALER = "false";
process.env.HOUSE_BOT_ENGINE = "false";
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

const scratch = process.env.VERIFY_DATABASE_URL ?? "";
const scratchDb = scratch ? `settle_refund_${process.pid}_${Date.now()}` : "";
if (scratch) {
  const url = new URL(scratch);
  assert.ok(["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname), "loopback PostgreSQL required");
  const admin = new pg.Client({ connectionString: scratch });
  try { await admin.connect(); await admin.query(`CREATE DATABASE "${scratchDb}"`); }
  finally { await admin.end(); }
  url.pathname = `/${scratchDb}`;
  try {
    execFileSync("npx", ["prisma", "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: url.toString() }, stdio: "inherit", shell: process.platform === "win32",
    });
  } catch (error) {
    const cleanup = new pg.Client({ connectionString: scratch });
    try { await cleanup.connect(); await cleanup.query(`DROP DATABASE IF EXISTS "${scratchDb}" WITH (FORCE)`); }
    finally { await cleanup.end(); }
    throw error;
  }
  process.env.DATABASE_URL = url.toString();
  process.env.USE_PRISMA_DAL = "true";
} else if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname), "loopback PostgreSQL required");
}

// The verified fixture patches db.user.create at import time. Load it only
// after DATABASE_URL selects the disposable store; a static import would pin
// the in-memory DAL before the PostgreSQL test environment exists.
await import("./lib/verified-fixtures.mts");

const { db } = await import("../src/lib/server/store.ts");
const { marketStore, positionStore } = await import("../src/lib/server/market-dal.ts");
const { createMarket, buyPosition, settleMarket, repairOrphanedPositions } = await import("../src/lib/server/market-service.ts");
const { creditBonus, refundBonusToActive } = await import("../src/lib/server/bonus-service.ts");
const { getHistory } = await import("../src/lib/server/market-history.ts");
const { getAuditForTargetsDurable } = await import("../src/lib/server/audit.ts");
const { emailOutbox } = await import("../src/lib/server/email.ts");

try {
  let passed = 0;
  const check = (label: string, condition: unknown) => {
    assert.ok(condition, label);
    passed++;
    console.log(`PASS ${label}`);
  };
  const tag = `sr${process.pid}_${Date.now()}`;
  let phoneSeq = 0;
  const now = () => new Date().toISOString();
  async function user(suffix: string, initialBalance = 20_000, initialBonus = 30_000): Promise<string> {
    const id = `${tag}_${suffix}`;
    await db.user.create({
      id, phoneE164: `+2556${String(process.pid % 100_000).padStart(5, "0")}${String(++phoneSeq).padStart(3, "0")}`,
      email: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
      role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
      acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false,
      avatarDataUrl: null, recruitedBy: null, createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
    } as never);
    await db.wallet.create({ id: `wal_${id}`, userId: id, balance: initialBalance, bonusBalance: 0,
      pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now() } as never);
    if (initialBonus > 0) {
      const grant = await creditBonus(id, { amountTzs: initialBonus, source: "ADMIN", wagerMultiplier: 5, notifyPlayer: false });
      assert.ok(grant.ok, "fixture bonus credited");
    }
    return id;
  }
  async function market(label: string) {
    return createMarket({ titleEn: `Atomic refund ${label}`, titleSw: "Soko la marejesho", category: "macro",
      sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
      resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test" } as never);
  }
  async function wallet(id: string) {
    const row = await db.wallet.findByUserId(id);
    assert.ok(row);
    return row;
  }
  async function position(marketId: string, id: string) {
    const row = (await positionStore.listForMarket(marketId)).find((p) => p.userId === id);
    assert.ok(row);
    return row;
  }
  async function mark(marketId: string, outcome: "VOID" | "YES") {
    const row = await marketStore.get(marketId);
    assert.ok(row);
    await marketStore.set({ ...row, status: outcome === "VOID" ? "VOIDED" : "RESOLVED",
      resolvedOutcome: outcome, objectionsClosedAt: new Date(Date.now() - 1000).toISOString(),
      resolutionEvidence: "Fixture verdict" });
  }

  // A market can appear between the planning read and the market lock. A
  // missing plan must stop before settlement, since no holder wallets were
  // locked for that market. One intercepted read models that exact gap.
  const earlyA = await user("early_a"), earlyB = await user("early_b");
  const earlyMarket = await market("missing-prelock-plan");
  assert.ok((await buyPosition(earlyA, { marketId: earlyMarket.id, side: "YES", stake: 2_000 })).ok);
  assert.ok((await buyPosition(earlyB, { marketId: earlyMarket.id, side: "NO", stake: 2_000 })).ok);
  await mark(earlyMarket.id, "YES");
  const earlyWallets = await Promise.all([wallet(earlyA), wallet(earlyB)]);
  const originalMarketGet = marketStore.get;
  let missedPlan = false;
  marketStore.get = (async (...args: Parameters<typeof originalMarketGet>) => {
    if (args[0] === earlyMarket.id && !missedPlan) {
      missedPlan = true;
      return null;
    }
    return originalMarketGet(...args);
  }) as typeof originalMarketGet;
  const missingPlanResult = await (async () => {
    try { return await settleMarket(earlyMarket.id, { force: true }); }
    finally { marketStore.get = originalMarketGet; }
  })();
  check("missing prelock market plan refuses before any settlement money moves",
    missedPlan && !missingPlanResult.ok && missingPlanResult.code === "NOT_FOUND" &&
    !(await marketStore.get(earlyMarket.id))?.settledAt &&
    (await positionStore.listForMarket(earlyMarket.id)).every((p) => p.status === "OPEN") &&
    (await Promise.all([wallet(earlyA), wallet(earlyB)])).every((w, i) =>
      w.balance === earlyWallets[i].balance && w.bonusBalance === earlyWallets[i].bonusBalance));

  const a = await user("a"), b = await user("b");
  const voidMarket = await market("void");
  const betA = await buyPosition(a, { marketId: voidMarket.id, side: "YES", stake: 40_000 });
  const betB = await buyPosition(b, { marketId: voidMarket.id, side: "NO", stake: 40_000 });
  check("two-holder VOID fixture uses actual mixed real/bonus stake", betA.ok && betB.ok &&
    (await position(voidMarket.id, a)).bonusStakeTzs === 20_000 &&
    (await position(voidMarket.id, b)).bonusStakeTzs === 20_000);
  await mark(voidMarket.id, "VOID");
  const walletsBefore = await Promise.all([wallet(a), wallet(b)]);
  const txnCounts = await Promise.all([a, b].map(async (id) => (await db.txn.listForUser(id)).length));
  await new Promise((resolve) => setTimeout(resolve, 100));
  const historyBefore = (await getHistory(voidMarket.id)).length;
  const noticeCounts = await Promise.all([a, b].map(async (id) => (await db.notification.findByUser(id, 100)).length));
  const mailCount = emailOutbox().length;
  const faultSince = now();
  const originalAdjust = db.wallet.adjust;
  let refundAdjusts = 0;
  db.wallet.adjust = (async (...args: Parameters<typeof originalAdjust>) => {
    if ([`wal_${a}`, `wal_${b}`].includes(args[0]) && (args[1].balance ?? 0) > 0 && ++refundAdjusts === 2) {
      throw new Error("injected second-holder ordinary refund fault");
    }
    return originalAdjust(...args);
  }) as typeof originalAdjust;
  let threw = false;
  try { await settleMarket(voidMarket.id, { force: true }); }
  catch (error) { threw = String(error).includes("second-holder ordinary refund fault"); }
  finally { db.wallet.adjust = originalAdjust; }
  check("fault lands after first real+bonus refund", threw && refundAdjusts === 2);
  const afterFault = await Promise.all([wallet(a), wallet(b)]);
  check("fault rolls back both real and bonus wallet balances", afterFault.every((w, i) =>
    w.balance === walletsBefore[i].balance && w.bonusBalance === walletsBefore[i].bonusBalance));
  check("fault leaves both positions OPEN and market retryable", !((await marketStore.get(voidMarket.id))?.settledAt) &&
    (await positionStore.listForMarket(voidMarket.id)).every((p) => p.status === "OPEN" && p.finalPayout == null));
  check("fault leaves no refund transaction or terminal history point",
    (await Promise.all([a, b].map(async (id) => (await db.txn.listForUser(id)).length))).every((n, i) => n === txnCounts[i]) &&
    (await getHistory(voidMarket.id)).length === historyBefore);
  await new Promise((resolve) => setTimeout(resolve, 100));
  check("fault sends no player notice or email",
    (await Promise.all([a, b].map(async (id) => (await db.notification.findByUser(id, 100)).length)))
      .every((n, i) => n === noticeCounts[i]) && emailOutbox().length === mailCount);
  const falseAudits = await getAuditForTargetsDurable({ targetType: "Market", targetIds: [voidMarket.id],
    actions: ["market.resolved", "market.settled"], sinceIso: faultSince });
  check("fault emits no terminal settlement audit", falseAudits.entries.length === 0);

  const voidResult = await settleMarket(voidMarket.id, { force: true });
  check("VOID retry settles once", voidResult.ok && voidResult.data?.positionsSettled === 2);
  check("VOID restores each real and bonus principal", (await wallet(a)).balance === 20_000 &&
    (await wallet(a)).bonusBalance === 30_000 && (await wallet(b)).balance === 20_000 &&
    (await wallet(b)).bonusBalance === 30_000);
  check("VOID stamps full payout and position state", (await position(voidMarket.id, a)).status === "VOID" &&
    (await position(voidMarket.id, a)).finalPayout === 40_000 && !!(await marketStore.get(voidMarket.id))?.settledAt);
  const replayBefore = await Promise.all([wallet(a), wallet(b)]);
  const replay = await settleMarket(voidMarket.id, { force: true });
  check("VOID replay cannot refund again", !replay.ok &&
    (await Promise.all([wallet(a), wallet(b)])).every((w, i) =>
      w.balance === replayBefore[i].balance && w.bonusBalance === replayBefore[i].bonusBalance));

  const c = await user("c");
  const oneSide = await market("one-sided");
  const betC = await buyPosition(c, { marketId: oneSide.id, side: "YES", stake: 40_000 });
  check("one-sided fixture uses actual mixed stake", betC.ok && (await position(oneSide.id, c)).bonusStakeTzs === 20_000);
  await mark(oneSide.id, "YES");
  const oneResult = await settleMarket(oneSide.id, { force: true });
  check("one-sided result returns the full stake at no fee", oneResult.ok && oneResult.data?.winnersPaid === 0 &&
    (await position(oneSide.id, c)).status === "VOID" && (await position(oneSide.id, c)).finalPayout === 40_000);
  check("one-sided result restores both funding balances", (await wallet(c)).balance === 20_000 &&
    (await wallet(c)).bonusBalance === 30_000);
  check("one-sided replay cannot credit again", !(await settleMarket(oneSide.id, { force: true })).ok &&
    (await wallet(c)).balance === 20_000 && (await wallet(c)).bonusBalance === 30_000);

  // Two separate original grants fund two positions. The position stores only
  // its aggregate bonus stake, not the grant allocation. Restitution must be
  // keyed to each position, never attached to whichever old grant sorts first.
  const provenanceUser = await user("two-grants", 0, 0);
  // The current promotional funnel queues a second grant. The store/schema can
  // still hold two ACTIVE legacy grants, so seed that exact persisted premise.
  const originalIds = [`bg_${tag}_A`, `bg_${tag}_B`];
  for (const [index, id] of originalIds.entries()) await db.bonusGrant.create({
    id, userId: provenanceUser, walletId: `wal_${provenanceUser}`,
    amountTzs: 1_000, remainingTzs: 1_000, wagerMultiplier: 5,
    wagerRequiredTzs: 5_000, wageredTzs: 0, source: "ADMIN",
    sourceRef: `source-${index}-${tag}`, status: "ACTIVE",
    expiresAt: new Date(Date.now() + 7 * 864e5).toISOString(), fulfilledAt: null,
    note: "two-active-grant restitution fixture", createdAt: new Date(Date.now() + index).toISOString(),
    updatedAt: now(),
  } as never);
  const funded = await db.wallet.adjust(`wal_${provenanceUser}`, { bonusBalance: 2_000 });
  assert.equal(funded?.bonusBalance, 2_000, "two active grants back the fixture wallet");
  const marketA = await market("grant-A");
  const marketB = await market("grant-B");
  const placedA = await buyPosition(provenanceUser, { marketId: marketA.id, side: "YES", stake: 1_000 });
  const placedB = await buyPosition(provenanceUser, { marketId: marketB.id, side: "YES", stake: 1_000 });
  assert.ok(placedA.ok && placedB.ok, "both bonus-only positions placed");
  const positionA = await position(marketA.id, provenanceUser);
  const positionB = await position(marketB.id, provenanceUser);
  check("two active original grants fund two separate positions",
    positionA.bonusStakeTzs === 1_000 && positionB.bonusStakeTzs === 1_000 &&
    (await db.bonusGrant.listActiveByUser(provenanceUser))
      .filter((g) => originalIds.includes(g.id)).every((g) => g.remainingTzs === 0));
  await mark(marketA.id, "YES");
  await mark(marketB.id, "YES");
  const refundedB = await settleMarket(marketB.id, { force: true });
  const afterB = await db.bonusGrant.listByUser(provenanceUser);
  check("refund B leaves both original grants untouched and credits its own position grant",
    refundedB.ok && originalIds.every((id) => afterB.find((g) => g.id === id)?.remainingTzs === 0) &&
    afterB.some((g) => g.sourceRef === `void-restitution:${positionB.id}` &&
      g.amountTzs === 1_000 && g.remainingTzs === 1_000) &&
    (await wallet(provenanceUser)).bonusBalance === 1_000);
  const refundedA = await settleMarket(marketA.id, { force: true });
  const afterA = await db.bonusGrant.listByUser(provenanceUser);
  check("refund A keeps one accurate grant face per refunded position",
    refundedA.ok && originalIds.every((id) => afterA.find((g) => g.id === id)?.remainingTzs === 0) &&
    [positionA.id, positionB.id].every((id) => afterA.some((g) =>
      g.sourceRef === `void-restitution:${id}` && g.amountTzs === 1_000 && g.remainingTzs === 1_000)) &&
    (await wallet(provenanceUser)).bonusBalance === 2_000);
  const restitutionCount = afterA.filter((g) => g.sourceRef?.startsWith("void-restitution:")).length;
  check("two-grant refund replay does not mint or credit again",
    !(await settleMarket(marketB.id, { force: true })).ok &&
    (await db.bonusGrant.listByUser(provenanceUser)).filter((g) => g.sourceRef?.startsWith("void-restitution:")).length === restitutionCount &&
    (await wallet(provenanceUser)).bonusBalance === 2_000);

  // The legacy standalone helper remains used by orphan repair. A failure after
  // creating a restitution grant must not leave a grant without wallet credit.
  const d = await user("legacy");
  const existing = await db.bonusGrant.listActiveByUser(d);
  for (const grant of existing) await db.bonusGrant.update(grant.id,
    { expiresAt: new Date(Date.now() - 1000).toISOString() });
  const legacyWalletBefore = await wallet(d);
  const grantsBefore = (await db.bonusGrant.listByUser(d)).length;
  const legacyAdjust = db.wallet.adjust;
  db.wallet.adjust = (async (...args: Parameters<typeof legacyAdjust>) => {
    if (args[0] === `wal_${d}` && (args[1].bonusBalance ?? 0) > 0) {
      throw new Error("injected legacy bonus wallet fault");
    }
    return legacyAdjust(...args);
  }) as typeof legacyAdjust;
  let legacyThrew = false;
  try { await refundBonusToActive(d, 5_000); }
  catch (error) { legacyThrew = String(error).includes("legacy bonus wallet fault"); }
  finally { db.wallet.adjust = legacyAdjust; }
  check("legacy helper fault reaches wallet after grant creation", legacyThrew);
  check("legacy helper fault rolls back grant and bonus wallet together",
    (await db.bonusGrant.listByUser(d)).length === grantsBefore &&
    (await wallet(d)).bonusBalance === legacyWalletBefore.bonusBalance);
  const legacyRetry = await refundBonusToActive(d, 5_000);
  check("legacy helper retry credits a new restitution grant", legacyRetry.refundedToBonus === 5_000 &&
    (await wallet(d)).bonusBalance === legacyWalletBefore.bonusBalance + 5_000 &&
    (await db.bonusGrant.listByUser(d)).some((g) =>
      g.status === "ACTIVE" && !g.expiresAt && g.remainingTzs === 5_000));
  const secondRestitution = await refundBonusToActive(d, 3_000);
  const legacyRestitution = (await db.bonusGrant.listByUser(d)).filter((g) => g.sourceRef?.startsWith("void-restitution:"));
  check("same-holder second restitution has its own grant and face amount",
    secondRestitution.refundedToBonus === 3_000 &&
    legacyRestitution.length === 2 &&
    [3_000, 5_000].every((amount) => legacyRestitution.some((g) =>
      g.amountTzs === amount && g.remainingTzs === amount)) &&
    (await wallet(d)).bonusBalance === legacyWalletBefore.bonusBalance + 8_000);

  const orphanUser = await user("orphan");
  const orphanMarket = await market("orphan");
  const orphanBet = await buyPosition(orphanUser, { marketId: orphanMarket.id, side: "YES", stake: 40_000 });
  assert.ok(orphanBet.ok);
  const orphanPosition = await position(orphanMarket.id, orphanUser);
  await marketStore.delete(orphanMarket.id);
  if (scratch) {
    check("PostgreSQL market FK cascades away the position before orphan repair",
      (await positionStore.get(orphanPosition.id)) === null);
  } else {
    const orphanWalletBefore = await wallet(orphanUser);
    const orphanTxnBefore = (await db.txn.listForUser(orphanUser)).length;
    const adjustBefore = db.wallet.adjust;
    db.wallet.adjust = (async (...args: Parameters<typeof adjustBefore>) => {
      if (args[0] === `wal_${orphanUser}` && (args[1].bonusBalance ?? 0) > 0) {
        throw new Error("injected orphan bonus restitution fault");
      }
      return adjustBefore(...args);
    }) as typeof adjustBefore;
    let orphanThrew = false;
    try { await repairOrphanedPositions(); }
    catch (error) { orphanThrew = String(error).includes("orphan bonus restitution fault"); }
    finally { db.wallet.adjust = adjustBefore; }
    check("orphan fault follows real credit but fails before bonus restitution", orphanThrew);
    check("orphan fault rolls back wallet, transaction and OPEN position",
      (await wallet(orphanUser)).balance === orphanWalletBefore.balance &&
      (await wallet(orphanUser)).bonusBalance === orphanWalletBefore.bonusBalance &&
      (await db.txn.listForUser(orphanUser)).length === orphanTxnBefore &&
      (await positionStore.get(orphanPosition.id))?.status === "OPEN");
    const repaired = await repairOrphanedPositions();
    check("orphan retry refunds both funding sources exactly once",
      repaired.repaired === 1 && repaired.refundedTzs === 40_000 &&
      (await wallet(orphanUser)).balance === 20_000 &&
      (await wallet(orphanUser)).bonusBalance === 30_000 &&
      (await positionStore.get(orphanPosition.id))?.status === "VOID");
    const replay = await repairOrphanedPositions();
    check("orphan replay cannot credit the same position again",
      replay.repaired === 0 && (await wallet(orphanUser)).balance === 20_000 &&
      (await wallet(orphanUser)).bonusBalance === 30_000);
  }

  console.log(`settle-refund-atomic: ${passed} passed, 0 failed (${scratch ? "PostgreSQL" : "memory"})`);
} finally {
  if (scratchDb) {
    await import("../src/lib/server/prisma.ts").then(({ prisma }) => prisma()?.$disconnect()).catch(() => {});
    const admin = new pg.Client({ connectionString: scratch });
    try { await admin.connect(); await admin.query(`DROP DATABASE IF EXISTS "${scratchDb}" WITH (FORCE)`); }
    finally { await admin.end(); }
  }
}
