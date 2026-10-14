/**
 * THE BET SHEET'S READS ON A REAL POSTGRES — the Prisma side of the Vodacom plan S8 WP3's three new reads, which no
 * in-memory suite executes (S8-PLAN A11).
 *
 * ⭐ WHY THIS EXISTS. `test:journey-sheet` §6–§8 proves the reads on the MEMORY store, and `test:dal-parity` §32 holds the
 * Prisma twin of `txn.newestProcessingDeposit` to its SHAPE. Whether its `where` really leaves out a withdrawal, a
 * confirmed deposit and another player's row, whether its `orderBy` really takes the newest, whether `keyPosition` really
 * answers only the viewer's own key on the `Position.idempotencyKey` unique index, and whether the session read really
 * leaves the play clock alone while the OPEN read writes exactly one `rg.session_limit.enforced` row are facts about the
 * database. This writes a small book to a scratch Postgres through the REAL `db`, the REAL bet path and the REAL sheet
 * reads, and reads it back against answers written here by hand.
 *
 * Run (through the heavy-node lock; it needs a migrated EMPTY database):
 *   npm run db:probe-sheet-facts   (db-scratch boots Postgres; scripts/live/pg-probe-run.mts migrates it and runs this)
 */
// house-bot: covered by L2 sweep — it writes account facts (a responsible-gambling row each, the play clock through the
// gate) only to the four accounts it creates itself, in a LOOPBACK scratch Postgres it refuses to leave; its world holds
// no house bot (test:house-bot-holder-lifecycle 2.1).
process.exitCode = 1;
if (!process.env.DATABASE_URL) {
  console.error("sheet-facts-pg-probe: needs DATABASE_URL (a scratch Postgres) — refusing to run on the memory twin, which proves nothing here.");
  process.exit(2);
}
{
  // ⛔ A LOOPBACK CLUSTER ONLY: this probe writes accounts, wallets, markets, positions and transactions.
  let host = "";
  try { host = new URL(process.env.DATABASE_URL).hostname; } catch { /* refused below */ }
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
    console.error("sheet-facts-pg-probe: refusing — it writes rows, and runs only against a loopback scratch cluster (db-scratch).");
    process.exit(2);
  }
}

const { db } = await import("../../src/lib/server/store.ts");
const { marketStore, positionStore } = await import("../../src/lib/server/market-dal.ts");
const { createMarket, buyPosition } = await import("../../src/lib/server/market-service.ts");
const { sheetClosedKeyRead, sheetForUser, sheetPublic, viewerFacts } = await import("../../src/lib/server/journey-sheet.ts");
const { auditFlush } = await import("../../src/lib/server/audit.ts");
const { prisma } = await import("../../src/lib/server/prisma.ts");

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { if (c) pass++; else fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const json = (v: unknown) => JSON.stringify(v);
const iso = (t: number) => new Date(t).toISOString();
const NOW = Date.now();
const MIN = 60_000, HOUR = 60 * MIN;

const mkUser = async (id: string, phone: string, balance: number) => {
  const at = iso(NOW - 48 * HOUR);
  await db.user.create({
    id, phoneE164: phone, email: null, emailVerifiedAt: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: "1990-01-01", region: null,
    acceptedTermsVersion: "v1", acceptedTermsAt: at, marketingOptIn: false, twoFactorEnabled: false,
    avatarDataUrl: null, createdAt: at, updatedAt: at, lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: at, updatedAt: at } as never);
};
await mkUser("probe_sf_me", "+255751300001", 500_000);
await mkUser("probe_sf_other", "+255751300002", 500_000);
await mkUser("probe_sf_over", "+255751300003", 500_000);
await mkUser("probe_sf_within", "+255751300004", 500_000);

/* ── 1 · newestProcessingDeposit: the player's own newest PROCESSING deposit, with createdAt ── */
let seq = 0;
const txn = (userId: string, type: string, status: string, amount: number, at: number) => {
  const id = `probe_sf_t${String(++seq).padStart(3, "0")}`;
  return db.txn.create({
    id, walletId: `wal_${userId}`, userId, type, status, amount, fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS",
    provider: "MPESA", providerRef: null, msisdn: null, description: "probe", positionId: null, amlReason: null,
    createdAt: iso(at), updatedAt: iso(at), completedAt: null, idempotencyKey: null,
  } as never).then(() => ({ id, at: iso(at) }));
};
await txn("probe_sf_me", "DEPOSIT", "PROCESSING", 3_000, NOW - 2 * HOUR);           // older
const want = await txn("probe_sf_me", "DEPOSIT", "PROCESSING", 5_000, NOW - HOUR);  // ★ the answer
await txn("probe_sf_me", "DEPOSIT", "CONFIRMED", 9_000, NOW - 10 * MIN);            // a newer CONFIRMED deposit
await txn("probe_sf_me", "DEPOSIT", "FAILED", 8_000, NOW - 5 * MIN);                // a newer FAILED deposit
await txn("probe_sf_me", "WITHDRAWAL", "PROCESSING", -2_000, NOW - MIN);            // a PROCESSING withdrawal
await txn("probe_sf_other", "DEPOSIT", "PROCESSING", 7_000, NOW - 30_000);          // another player's
const got = await db.txn.newestProcessingDeposit("probe_sf_me");
ok("1 · ★ the newest PROCESSING deposit is the player's own 5,000 of an hour ago, with its createdAt — never the older one, a newer confirmed or failed deposit, a PROCESSING withdrawal, or another player's",
  json(got) === json({ amount: 5_000, txnId: want.id, createdAt: want.at }), json(got));
const none = await db.txn.newestProcessingDeposit("probe_sf_within");
ok("2 · a player with no deposit in flight reads null, not an error", none === null, json(none));
const facts = await viewerFacts("probe_sf_me", null);
ok("3 · the sheet's facts carry the same pending deposit, and the deposit windows count PROCESSING as the gate does (3,000 + 5,000 + 9,000 today)",
  json(facts?.pendingDeposit) === json(got) && facts?.deposit.usage.day === 17_000, json({ pending: facts?.pendingDeposit, usage: facts?.deposit.usage }));

/* ── 2 · keyPosition: the viewer's own key only ── */
const m = await createMarket({
  titleEn: "S8 WP3 probe market", titleSw: "S8 WP3 probe market", category: "macro",
  sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
  resolutionAt: iso(NOW + 7 * 24 * HOUR), proposedBy: "probe",
} as never);
const KEY_ME = "1b2c3d4e-5f60-4718-8293-a4b5c6d7e8f9";
const KEY_OTHER = "2c3d4e5f-6071-4829-93a4-b5c6d7e8f901";
const KEY_HOUSE = "3d4e5f60-7182-4930-a4b5-c6d7e8f90112";
const mine = await buyPosition("probe_sf_me", { marketId: m.id, side: "YES", stake: 2_000, idempotencyKey: KEY_ME });
const theirs = await buyPosition("probe_sf_other", { marketId: m.id, side: "NO", stake: 2_000, idempotencyKey: KEY_OTHER });
ok("4 · control: both real bets landed with their keys", mine.ok && theirs.ok, json({ mine: mine.ok ? "ok" : mine, theirs: theirs.ok ? "ok" : theirs }));
// A house stake on the viewer's own account, keyed: written as the house path marks it (houseBotId set).
await positionStore.set({
  id: "probe_sf_house_pos", userId: "probe_sf_me", marketId: m.id, side: "NO", stake: 1_000, potentialPayout: 2_000, status: "OPEN",
  finalPayout: null, placedAt: iso(NOW), settledAt: null, idempotencyKey: KEY_HOUSE, houseBotId: "probe_hb",
} as never);
const houseRow = await positionStore.findByIdempotencyKey(KEY_HOUSE);
ok("5 · control: the house row reached Postgres with its marker", houseRow?.houseBotId === "probe_hb", json(houseRow));
const kMine = await sheetForUser(m.id, "probe_sf_me", { key: KEY_ME });
const kOther = await sheetForUser(m.id, "probe_sf_me", { key: KEY_OTHER });
const kHouse = await sheetForUser(m.id, "probe_sf_me", { key: KEY_HOUSE });
const kBad = await sheetForUser(m.id, "probe_sf_me", { key: "not-a-uuid" });
// The receipt a key answers, written here by hand from the bet placed above. Since ee518f52a (sheet recovery bound to its
// account) it carries the bet's own quote beside its id, so the host can match a recovered answer to the stake it asked
// for; the memory twin pins the same shape (test:journey-sheet 8.key.mine, 8.closedKey.receipt).
const KEY_ME_RECEIPT = mine.ok ? { positionId: mine.data.positionId, quote: { marketId: m.id, side: "YES", stake: 2_000 } } : null;
ok("6 · ★ the viewer's own key names its position on Postgres", mine.ok && json(kMine.keyPosition) === json(KEY_ME_RECEIPT), json(kMine.keyPosition));
ok("7 · ★ another player's key is null, a house bot's key on the viewer's account is null, a malformed key is null",
  kOther.keyPosition === null && kHouse.keyPosition === null && kBad.keyPosition === null, json({ other: kOther.keyPosition, house: kHouse.keyPosition, bad: kBad.keyPosition }));

/* ── 3 · the session limit: the read writes nothing; the OPEN read past the limit writes what the gate writes ── */
const pc = prisma();
if (!pc) { console.error("sheet-facts-pg-probe: no Prisma client"); process.exit(1); }
const clockOf = async (id: string) => {
  const r = await pc.responsibleGambling.findUnique({ where: { userId: id }, select: { playStartedAt: true, playLastSeenAt: true } });
  return json(r);
};
const enforced = async (id: string) => { await auditFlush(); return pc.auditLog.count({ where: { action: "rg.session_limit.enforced", actorId: id } }); };
for (const id of ["probe_sf_over", "probe_sf_within"]) {
  const cur = await db.responsible.get(id);
  await db.responsible.upsert({
    userId: id, dailyDepositLimit: null, weeklyDepositLimit: null, monthlyDepositLimit: null, dailyLossLimit: null,
    sessionTimeLimitMin: 30, realityCheckIntervalMin: 30, selfExclusionUntil: null, coolingOffUntil: null,
    pendingIncreaseTo: null, pendingIncreaseEffectiveAt: null, pendingWeeklyIncreaseTo: null, pendingWeeklyIncreaseEffectiveAt: null,
    pendingMonthlyIncreaseTo: null, pendingMonthlyIncreaseEffectiveAt: null, playStartedAt: null, playLastSeenAt: null, ...(cur ?? {}),
    sessionTimeLimitMin: 30,
  } as never);
}
const pub = await sheetPublic(m.id);
const open = pub ? { bettable: pub.bettable, min: pub.min, max: pub.max } : null;
ok("8 · control: the probe market is a sheet that takes bets", !!open?.bettable, json(open));

const w0 = await clockOf("probe_sf_within");
await sheetForUser(m.id, "probe_sf_within", { playStartedAt: NOW - 10 * MIN });
await sheetForUser(m.id, "probe_sf_within", { playStartedAt: NOW - 10 * MIN, open });
const w1 = await clockOf("probe_sf_within");
ok("9 · ★ within the limit, neither the viewer's read nor the open read changes playStartedAt or playLastSeenAt, and no enforced row is written",
  w0 === w1 && (await enforced("probe_sf_within")) === 0, json({ w0, w1 }));

const o0 = await clockOf("probe_sf_over");
const read = await sheetForUser(m.id, "probe_sf_over", { playStartedAt: NOW - 45 * MIN });
const o1 = await clockOf("probe_sf_over");
ok("10 · ★ past the limit, a read without open says so (the fact is exceeded) and writes nothing",
  read.facts?.session?.exceeded === true && o0 === o1 && (await enforced("probe_sf_over")) === 0, json({ session: read.facts?.session, o0, o1 }));
await sheetForUser(m.id, "probe_sf_over", { playStartedAt: NOW - 45 * MIN, open });
const o2 = await clockOf("probe_sf_over");
await auditFlush();
const rows = await pc.auditLog.findMany({ where: { action: "rg.session_limit.enforced", actorId: "probe_sf_over" }, select: { payload: true } });
ok("11 · ★ past the limit, the OPEN read writes the gate's play clock and exactly ONE rg.session_limit.enforced row, with at: \"sheet\"",
  o2 !== o1 && /"playStartedAt":"/.test(o2) && rows.length === 1 && (rows[0]?.payload as { at?: string } | null)?.at === "sheet", json({ o2, rows }));

/* ── 4 · a landed key remains readable after the question is no longer a public sheet ── */
for (const status of ["CLOSED", "RESOLVED", "VOIDED"] as const) {
  await marketStore.set({ ...m, status });
  const publicSheet = await sheetPublic(m.id);
  const receipt = await sheetClosedKeyRead(m.id, "probe_sf_me", KEY_ME);
  ok(`12 · ★ ${status}: the public sheet is absent, while a lost answer still recovers the landed position through its private key`,
    publicSheet === null && mine.ok && json(receipt) === json({ public: null, me: { keyPosition: KEY_ME_RECEIPT } }), json({ publicSheet, receipt }));
}
const terminalOther = await sheetClosedKeyRead(m.id, "probe_sf_me", KEY_OTHER);
const terminalHouse = await sheetClosedKeyRead(m.id, "probe_sf_me", KEY_HOUSE);
const terminalWrongMarket = await sheetClosedKeyRead("mkt_otherquestion", "probe_sf_me", KEY_ME);
const terminalBad = await sheetClosedKeyRead(m.id, "probe_sf_me", "not-a-uuid");
ok("13 · ★ terminal key reads reveal neither another player's position, a house stake nor a position on another question; a malformed key has no lookup response",
  [terminalOther, terminalHouse, terminalWrongMarket].every((r) => json(r) === json({ public: null, me: { keyPosition: null } })) && terminalBad === null,
  json({ other: terminalOther, house: terminalHouse, wrongMarket: terminalWrongMarket, bad: terminalBad }));

/* ── 5 · a real database change between reads cannot split the headline from the shortfall facts ── */
const walletGetter = db.wallet.findByUserId;
const walletBefore = await walletGetter("probe_sf_me");
let walletReads = 0;
db.wallet.findByUserId = async (userId) => {
  walletReads++;
  const row = await walletGetter(userId);
  // The real DB changes immediately after the first snapshot. A second read would see 123 less cash.
  if (walletReads === 1) await pc.wallet.update({ where: { userId }, data: { balance: { decrement: 123 } } });
  return row;
};
let walletSnapshot: Awaited<ReturnType<typeof sheetForUser>>;
try { walletSnapshot = await sheetForUser(m.id, "probe_sf_me"); }
finally { db.wallet.findByUserId = walletGetter; }
const walletAfter = await walletGetter("probe_sf_me");
ok("14 · ★ after a concurrent database change, one wallet snapshot still supplies both the spendable headline and shortfall facts — the later DB balance is not mixed into this response",
  !!walletBefore && walletReads === 1 && walletAfter?.balance === walletBefore.balance - 123
    && walletSnapshot!.spendable === walletBefore.balance + (walletBefore.bonusBalance ?? 0)
    && walletSnapshot!.facts?.wallet?.balance === walletBefore.balance
    && walletSnapshot!.facts?.wallet?.bonusBalance === (walletBefore.bonusBalance ?? 0),
  json({ walletReads, before: walletBefore?.balance, after: walletAfter?.balance, spendable: walletSnapshot!.spendable, factsWallet: walletSnapshot!.facts?.wallet }));

console.log(`\nsheet-facts-pg-probe: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
