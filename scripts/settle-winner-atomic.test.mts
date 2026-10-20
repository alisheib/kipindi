/**
 * A two-sided market has more than one winner: a fault on winner two must not
 * leave winner one paid, strand the loser, or announce a result that did not
 * commit. Runs in memory, and with VERIFY_DATABASE_URL on an owned disposable
 * loopback PostgreSQL database. The PG run also uses a deferred constraint
 * trigger to fail the outer transaction at COMMIT, after its callback returns.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import pg from "pg";

process.env.EMAIL_OUTBOX_CAPTURE = "1";
process.env.POSTMARK_API_KEY = "";
process.env.SMS_PROVIDER = "console";
process.env.MARKET_SCHEDULER = "false";
process.env.UPDOWN_SCHEDULER = "false";
process.env.UPDOWN_HEALER = "false";
process.env.HOUSE_BOT_ENGINE = "false";
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

const scratch = process.env.VERIFY_DATABASE_URL ?? "";
const scratchDb = scratch ? `settle_winner_${process.pid}_${Date.now()}` : "";
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
    const admin = new pg.Client({ connectionString: scratch });
    try { await admin.connect(); await admin.query(`DROP DATABASE IF EXISTS "${scratchDb}" WITH (FORCE)`); }
    finally { await admin.end(); }
    throw error;
  }
  process.env.DATABASE_URL = url.toString();
  process.env.USE_PRISMA_DAL = "true";
} else if (process.env.DATABASE_URL) {
  assert.fail("Use VERIFY_DATABASE_URL for a freshly created disposable PostgreSQL database; direct DATABASE_URL writes are refused");
}

// The fixture module imports store.ts and fixes its backend at import time.
// Import it only after selecting the scratch database or the memory backend.
await import("./lib/verified-fixtures.mts");
const { db } = await import("../src/lib/server/store.ts");
const { marketStore, positionStore } = await import("../src/lib/server/market-dal.ts");
const { createMarket, buyPosition, settleMarket, ratesFor } = await import("../src/lib/server/market-service.ts");
const { poolFee } = await import("../src/lib/payout.ts");
const { getHistory } = await import("../src/lib/server/market-history.ts");
const { getAuditForTargetsDurable } = await import("../src/lib/server/audit.ts");
const { emailOutbox } = await import("../src/lib/server/email.ts");
const { prisma } = await import("../src/lib/server/prisma.ts");

let passed = 0;
const check = (label: string, condition: unknown) => {
  if (!condition) {
    console.error(`FAIL ${label}`);
    assert.fail(label);
  }
  passed++;
  console.log(`PASS ${label}`);
};
const now = () => new Date().toISOString();
const tag = `swa${process.pid}_${Date.now()}`;
let phoneSeq = 0;

async function user(suffix: string): Promise<string> {
  const id = `${tag}_${suffix}`;
  await db.user.create({
    id, phoneE164: `+2556${String(process.pid % 100_000).padStart(5, "0")}${String(++phoneSeq).padStart(3, "0")}`,
    email: `${id}@example.invalid`, emailVerifiedAt: now(),
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
    acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false,
    avatarDataUrl: null, recruitedBy: null, createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 20_000, bonusBalance: 0,
    pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now() } as never);
  return id;
}

type Fixture = { marketId: string; winners: [string, string]; loser: string; watcher: string; proposalId: string };
async function fixture(suffix: string): Promise<Fixture> {
  const [a, b, loser, watcher] = await Promise.all([
    user(`${suffix}_a`), user(`${suffix}_b`), user(`${suffix}_loser`), user(`${suffix}_watcher`),
  ]);
  const market = await createMarket({
    titleEn: `Atomic winner ${suffix}`, titleSw: "Soko la majaribio", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);
  for (const [id, side, stake] of [[a, "YES", 2_000], [b, "YES", 3_000], [loser, "NO", 4_000]] as const) {
    const bet = await buyPosition(id, { marketId: market.id, side, stake });
    assert.ok(bet.ok, `${side} fixture bet was accepted`);
  }
  const row = await marketStore.get(market.id);
  assert.ok(row);
  await marketStore.set({ ...row, status: "RESOLVED", resolvedOutcome: "YES",
    objectionsClosedAt: new Date(Date.now() - 1000).toISOString(), resolutionEvidence: "Fixture verdict" });
  await db.watchlist.add(market.id, watcher);
  const proposalId = `${tag}_${suffix}_proposal`;
  await db.proposal.create({
    id: proposalId, proposerId: a, titleEn: `Atomic winner ${suffix}`, titleSw: null, titleZh: null,
    description: null, resolutionCriterion: "Fixture verdict", category: "macro",
    resolutionDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), selectionCloseDate: null,
    sourceUrl: "https://bot.go.tz", status: "LISTED", up: 0, down: 0,
    publishedMarketId: market.id, bonusGrantedTzs: 0, bonusGrantId: null, approvedAt: null,
    declineReason: null, declineNote: null, changeNote: null, reviewedBy: null,
    reviewedAt: null, createdAt: now(), updatedAt: now(),
  } as never);
  // Placement's history and notices are asynchronous. Require the actual bet
  // evidence before taking a fault baseline so it cannot be misread as settle.
  await waitFor("fixture bet side effects", async () =>
    (await getHistory(market.id)).length >= 3 &&
    emailOutbox().filter((mail) => mail.tag === "bet-placed" &&
      [a, b, loser].some((id) => mail.to === `${id}@example.invalid`)).length === 3 &&
    (await Promise.all([a, b, loser].map(async (id) =>
      (await db.notification.findByUser(id, 100)).length > 0))).every(Boolean));
  return { marketId: market.id, winners: [a, b], loser, watcher, proposalId };
}

async function waitFor(label: string, predicate: () => Promise<boolean>, timeoutMs = 8000): Promise<void> {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.fail(`${label} did not arrive within ${timeoutMs} ms`);
}

async function snapshot(f: Fixture) {
  const ids = [...f.winners, f.loser, f.watcher];
  const wallets = await Promise.all(ids.map(async (id) => {
    const w = await db.wallet.findByUserId(id);
    assert.ok(w);
    return { id, balance: w.balance, bonusBalance: w.bonusBalance, pending: w.pending, hold: w.hold };
  }));
  const positions = (await positionStore.listForMarket(f.marketId))
    .map((p) => ({ id: p.id, userId: p.userId, status: p.status, finalPayout: p.finalPayout, settledAt: p.settledAt }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const payoutTxns = await Promise.all(ids.map(async (id) => ({
    id, count: (await db.txn.listForUser(id)).filter((t) => t.type === "BET_PAYOUT").length,
  })));
  const notices = await Promise.all(ids.map(async (id) => ({
    id, count: (await db.notification.findByUser(id, 100)).length,
  })));
  const market = await marketStore.get(f.marketId);
  assert.ok(market);
  const proposal = await db.proposal.findById(f.proposalId);
  assert.ok(proposal);
  // A payout books TWO PAYOUT_CREDIT rows: POOL debit and PLAYER credit. Count
  // and inspect both accounts; a bare count of two for two winners would accept
  // one-sided bookkeeping that did not credit either player's ledger account.
  const ledger = prisma()
    ? (await prisma()!.ledgerEntry.findMany({
      where: { marketId: f.marketId, entryType: "PAYOUT_CREDIT" },
      select: { id: true, groupId: true, account: true, amount: true, userId: true },
      orderBy: { id: "asc" },
    })).map((line) => ({ ...line, amount: Number(line.amount) }))
    : null;
  return {
    wallets, positions, payoutTxns, notices, market: {
      status: market.status, resolvedOutcome: market.resolvedOutcome, settledAt: market.settledAt,
    }, proposalStatus: proposal.status, ledger,
    historyLength: (await getHistory(f.marketId)).length,
    mailLength: emailOutbox().length,
  };
}

async function terminalAudits(f: Fixture, sinceIso: string) {
  const market = await getAuditForTargetsDurable({ targetType: "Market", targetIds: [f.marketId],
    actions: ["market.resolved", "market.settled"], sinceIso });
  const position = await getAuditForTargetsDurable({ targetType: "Position",
    targetIds: (await positionStore.listForMarket(f.marketId)).map((p) => p.id),
    actions: ["bet.payout"], sinceIso });
  return { market: market.entries, position: position.entries };
}

async function assertFaultRolledBack(f: Fixture, before: Awaited<ReturnType<typeof snapshot>>, sinceIso: string, label: string) {
  // Catch a wrongly launched fire-and-forget notice/history/proposal hook too.
  await new Promise((resolve) => setTimeout(resolve, scratch ? 750 : 200));
  const after = await snapshot(f);
  check(`${label}: every real and bonus wallet balance rolled back`, JSON.stringify(after.wallets) === JSON.stringify(before.wallets));
  check(`${label}: both wins and the loss remain OPEN`, JSON.stringify(after.positions) === JSON.stringify(before.positions) &&
    after.positions.length === 3 && after.positions.every((p) => p.status === "OPEN" && p.finalPayout == null && p.settledAt == null));
  check(`${label}: no payout transaction or ledger survived`, JSON.stringify(after.payoutTxns) === JSON.stringify(before.payoutTxns) &&
    JSON.stringify(after.ledger) === JSON.stringify(before.ledger));
  check(`${label}: market is retryable`, JSON.stringify(after.market) === JSON.stringify(before.market) &&
    after.market.status === "RESOLVED" && after.market.resolvedOutcome === "YES" && after.market.settledAt == null);
  check(`${label}: no settlement history or player email`, after.historyLength === before.historyLength &&
    after.mailLength === before.mailLength);
  check(`${label}: no winner, loser or watcher notice`, JSON.stringify(after.notices) === JSON.stringify(before.notices));
  check(`${label}: linked proposal stays LISTED`, after.proposalStatus === "LISTED");
  const audits = await terminalAudits(f, sinceIso);
  check(`${label}: no payout or terminal market audit`, audits.position.length === 0 && audits.market.length === 0);
}

async function assertRetryOnce(f: Fixture, before: Awaited<ReturnType<typeof snapshot>>, sinceIso: string, label: string) {
  const result = await settleMarket(f.marketId, { force: true });
  check(`${label}: retry settles all three positions`, result.ok && result.data?.positionsSettled === 3);
  await waitFor(`${label} postcommit claims`, async () => {
    const proposal = await db.proposal.findById(f.proposalId);
    const notices = await Promise.all([...f.winners, f.loser, f.watcher]
      .map(async (id) => ({ id, count: (await db.notification.findByUser(id, 100)).length })));
    const audits = await terminalAudits(f, sinceIso);
    return proposal?.status === "RESOLVED" &&
      notices.every((n) => n.count === before.notices.find((b) => b.id === n.id)!.count + 1) &&
      audits.market.some((e) => e.action === "market.settled") && audits.position.length === 2 &&
      emailOutbox().length === before.mailLength + 3 &&
      (await getHistory(f.marketId)).length > before.historyLength;
  });
  const settled = await snapshot(f);
  const winnerRows = settled.positions.filter((p) => f.winners.includes(p.userId));
  const loserRow = settled.positions.find((p) => p.userId === f.loser);
  check(`${label}: two winners paid at least stake and one loser marked plainly`,
    winnerRows.length === 2 && winnerRows.every((p) => p.status === "WIN" && (p.finalPayout ?? 0) >=
      (p.userId === f.winners[0] ? 2_000 : 3_000)) && loserRow?.status === "LOSS" && loserRow.finalPayout === 0);
  const paid = winnerRows.reduce((sum, p) => sum + (p.finalPayout ?? 0), 0);
  const market = await marketStore.get(f.marketId);
  assert.ok(market);
  const fee = poolFee(market.yesPool, market.noPool, ratesFor(market), "YES").fee;
  check(`${label}: whole pool is paid or booked as fee, with no negative wallet`,
    paid + fee === market.yesPool + market.noPool &&
    settled.wallets.every((w) => w.balance >= 0 && w.bonusBalance >= 0));
  check(`${label}: payout report and balances agree with rows`, result.data?.winnersPaid === paid &&
    f.winners.every((id) => {
      const current = settled.wallets.find((w) => w.id === id)!;
      const original = before.wallets.find((w) => w.id === id)!;
      return current.balance - original.balance === (winnerRows.find((p) => p.userId === id)?.finalPayout ?? -1);
    }) && settled.wallets.find((w) => w.id === f.loser)?.balance === before.wallets.find((w) => w.id === f.loser)?.balance);
  const payoutLines = settled.ledger?.filter((line) =>
    !before.ledger?.some((old) => old.id === line.id)) ?? null;
  if (payoutLines) console.log(`${label} ledger evidence: ${payoutLines.length} PAYOUT_CREDIT rows, ` +
    `${new Set(payoutLines.map((line) => line.groupId)).size} groups, ` +
    `${payoutLines.filter((line) => line.account === `POOL:${f.marketId}`).length} pool debits, ` +
    `${payoutLines.filter((line) => line.account.startsWith("PLAYER:")).length} player credits`);
  const ledgerBalanced = payoutLines == null || (
      payoutLines.length === 4 &&
      new Set(payoutLines.map((line) => line.groupId)).size === 2 &&
      payoutLines.filter((line) => line.account === `POOL:${f.marketId}`).length === 2 &&
      payoutLines.filter((line) => line.account === `POOL:${f.marketId}`)
        .reduce((sum, line) => sum + line.amount, 0) === -(market.yesPool + market.noPool) &&
      f.winners.every((id) => payoutLines.some((line) =>
        line.account === `PLAYER:${id}` && line.userId === id &&
        line.amount === winnerRows.find((p) => p.userId === id)?.finalPayout)));
  check(`${label}: two payout transactions and balanced ledger groups`,
    f.winners.every((id) => settled.payoutTxns.find((t) => t.id === id)!.count ===
      before.payoutTxns.find((t) => t.id === id)!.count + 1) && ledgerBalanced);
  check(`${label}: terminal market, proposal, history, notices and mail now agree`,
    !!settled.market.settledAt && settled.proposalStatus === "RESOLVED" &&
    settled.historyLength > before.historyLength && settled.mailLength === before.mailLength + 3 &&
    settled.notices.every((n) => n.count === before.notices.find((b) => b.id === n.id)!.count + 1));
  const replay = await settleMarket(f.marketId, { force: true });
  check(`${label}: replay is refused after commit`, !replay.ok);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const afterReplay = await snapshot(f);
  check(`${label}: replay moves no money and sends no duplicate claim`,
    JSON.stringify(afterReplay) === JSON.stringify(settled));
}

async function secondWinnerFault(): Promise<void> {
  const f = await fixture("second_wallet");
  const before = await snapshot(f);
  const sinceIso = now();
  const original = db.wallet.adjust;
  let credits = 0;
  db.wallet.adjust = (async (...args: Parameters<typeof original>) => {
    if (f.winners.some((id) => args[0] === `wal_${id}`) && (args[1].balance ?? 0) > 0 && ++credits === 2) {
      throw new Error("injected second-winner payout fault");
    }
    return original(...args);
  }) as typeof original;
  let threw = false;
  try { await settleMarket(f.marketId, { force: true }); }
  catch (error) { threw = String(error).includes("injected second-winner payout fault"); }
  finally { db.wallet.adjust = original; }
  check("second-winner fault was reached after first winner credit", threw && credits === 2);
  await assertFaultRolledBack(f, before, sinceIso, "second-winner fault");
  await assertRetryOnce(f, before, sinceIso, "second-winner fault");
}

async function deferredCommitFault(): Promise<void> {
  assert.ok(scratch, "deferred commit proof requires owned disposable PostgreSQL");
  const f = await fixture("deferred_commit");
  const before = await snapshot(f);
  const sinceIso = now();
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  // This constraint trigger fires only when PostgreSQL tries to COMMIT this
  // market's terminal update. If `afterCommit` publishes even one claim before
  // that point, the failed transaction leaves a false player/operator claim.
  assert.match(f.marketId, /^[A-Za-z0-9_]+$/, "generated fixture market id is SQL-literal safe");
  const marketId = f.marketId;
  await client.query(`CREATE FUNCTION settle_winner_commit_fault() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.id = '${marketId}' AND OLD."settledAt" IS NULL AND NEW."settledAt" IS NOT NULL THEN
        RAISE EXCEPTION 'injected deferred winner commit fault';
      END IF;
      RETURN NEW;
    END $$`);
  await client.query(`CREATE CONSTRAINT TRIGGER settle_winner_commit_fault
    AFTER UPDATE ON "PredictionMarket" DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION settle_winner_commit_fault()`);
  let threw = false;
  try { await settleMarket(f.marketId, { force: true }); }
  catch (error) { threw = String(error).includes("injected deferred winner commit fault"); }
  finally {
    await client.query(`DROP TRIGGER IF EXISTS settle_winner_commit_fault ON "PredictionMarket"`);
    await client.query("DROP FUNCTION IF EXISTS settle_winner_commit_fault()");
    await client.end();
  }
  check("deferred PostgreSQL COMMIT fault reached the terminal market write", threw);
  await assertFaultRolledBack(f, before, sinceIso, "deferred COMMIT fault");
  await assertRetryOnce(f, before, sinceIso, "deferred COMMIT fault");
}

try {
  await secondWinnerFault();
  if (scratch) await deferredCommitFault();
  console.log(`settle-winner-atomic: ${passed} passed, 0 failed (${scratch ? "PostgreSQL" : "memory"})`);
} finally {
  if (scratchDb) {
    const client = prisma();
    if (client) await client.$disconnect().catch(() => {});
    const admin = new pg.Client({ connectionString: scratch });
    try { await admin.connect(); await admin.query(`DROP DATABASE IF EXISTS "${scratchDb}" WITH (FORCE)`); }
    finally { await admin.end(); }
  }
}
