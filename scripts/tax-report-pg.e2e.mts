/**
 * e2e:tax-report — the Government Tax Report driven on a REAL Postgres (docs/TAX-REPORT.md §9).
 *
 *   DATABASE_URL=postgresql://…@127.0.0.1:<port>/<scratch db> npm run e2e:tax-report
 *
 * ⭐ WHY THIS EXISTS BESIDE `test:tax-report`. That suite runs on the in-memory store, so it proves the
 * arithmetic and the reader's logic — but the reader's PRISMA twins never execute there:
 * `positionStore.listLiveDuring` (a WHERE over naive-UTC timestamps with a three-arm OR),
 * `positionStore.getMany` (chunked), `marketStore.bookByIds`, `db.txn.listInRange`; nor does the
 * `TaxPeriodLock` table, whose "one live lock per period" is a PARTIAL UNIQUE INDEX only Postgres
 * enforces. This drives the same real money flows — bets, settlement, a one-sided refund, an
 * emergency void, a free exit, an Up & Down round, a round resulted after the cut-off, a fractional
 * fee — through Prisma, and checks the SAME figures to the cent.
 *
 * ⛔ NOT a `test:*` script: it needs a migrated Postgres, and `test:all` must run without one (the
 * `e2e:money` convention). ⛔ LOOPBACK ONLY: it WRITES, so it refuses any host but 127.0.0.1/localhost.
 */
const url = process.env.DATABASE_URL ?? "";
let host = "";
try { host = new URL(url).hostname; } catch { /* reported below */ }
if (!url || !["127.0.0.1", "localhost"].includes(host)) {
  console.error(`e2e:tax-report REFUSED — DATABASE_URL must be a LOOPBACK scratch Postgres (got "${host || "none"}"); this suite writes.`);
  process.exit(2);
}
process.env.USE_PRISMA_DAL = "true";

const { PrismaClient } = await import("@prisma/client");
const { db } = await import("../src/lib/server/store.ts");
const svc = await import("../src/lib/server/market-service.ts");
const { marketStore, positionStore } = await import("../src/lib/server/market-dal.ts");
const { buildTaxReportData } = await import("../src/lib/server/tax-report-data.ts");
const L = await import("../src/lib/server/tax-locks.ts");
const V = await import("../src/lib/server/tax-report-view.ts");
const E = await import("../src/lib/tax-report.ts");

const prisma = new PrismaClient({ datasources: { db: { url } } });
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
const eq = (label: string, got: unknown, want: unknown) => ok(label, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)} · want ${JSON.stringify(want)}`);
const RUN = `tx${Date.now().toString(36)}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const nowIso = () => new Date().toISOString();
let seq = 0;

async function user(id: string, role = "PLAYER") {
  await db.user.create({
    id, phoneE164: `+25595${String(Date.now()).slice(-5)}${String(++seq).padStart(2, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role, status: "ACTIVE", locale: "EN",
    displayName: id, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: nowIso(), updatedAt: nowIso(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 1_000_000, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: nowIso(), updatedAt: nowIso() } as never);
}
async function market(tag: string) {
  return svc.createMarket({
    titleEn: `${RUN} ${tag}`, titleSw: "Soko", category: "macro", sourceUrl: "https://bot.go.tz",
    resolutionCriterion: "Resolves at the official date.", resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);
}
async function bet(marketId: string, side: "YES" | "NO", stake: number) {
  const uid = `${RUN}_u${++seq}`;
  await user(uid);
  const r = await svc.buyPosition(uid, { marketId, side, stake });
  if (!r.ok) throw new Error(`bet refused: ${JSON.stringify(r).slice(0, 200)}`);
  return { uid, positionId: (r as { data: { positionId: string } }).data.positionId };
}
async function resolveAndSettle(marketId: string, outcome: "YES" | "NO" | "VOID") {
  const first = await svc.resolveMarket({ marketId, outcome, officerId: `${RUN}_oa` });
  if (first.ok && first.data.stage === "stage1") await svc.resolveMarket({ marketId, outcome, officerId: `${RUN}_ob` });
  const s = await svc.settleMarket(marketId, { force: true });
  if (!s.ok) throw new Error(`settle refused: ${JSON.stringify(s).slice(0, 200)}`);
}
const custom = (startMs: number, endMs: number) => ({ kind: "custom" as const, key: `e2e~${startMs}`, startMs, endMs, label: "e2e window" });
const FAR = Date.now() + 365 * 864e5;
async function read(startMs: number, endMs: number, product: "ALL" | "MARKET" | "UPDOWN" = "ALL") {
  const r = await buildTaxReportData({ period: custom(startMs, endMs), product, nowMs: FAR });
  if (!r.ok) throw new Error(r.error);
  return r.data;
}

console.log(`\ne2e:tax-report on ${host} — run ${RUN}\n`);
await user(`${RUN}_oa`, "ADMIN");
await user(`${RUN}_ob`, "ADMIN");

const tA0 = Date.now() - 1;
await sleep(10);
const m1 = await market("two-sided");
await bet(m1.id, "YES", 5_000); await bet(m1.id, "YES", 5_000); await bet(m1.id, "NO", 10_000);
const m2 = await market("one-sided");
await bet(m2.id, "YES", 4_000); await bet(m2.id, "YES", 6_000);
const m3 = await market("emergency");
await bet(m3.id, "YES", 3_000); await bet(m3.id, "NO", 2_000);
const m4 = await market("cash-out");
const exit = await bet(m4.id, "YES", 2_000);
const m5 = await market("late");
await bet(m5.id, "YES", 7_000); await bet(m5.id, "NO", 3_000);
const m6 = await market("updown");
await bet(m6.id, "YES", 1_000); await bet(m6.id, "NO", 1_000);
// ⚠️ A FIXTURE SHORTCUT, written straight to the scratch database: the Postgres `marketStore.set` deliberately never
// rewrites `productLine` (a round's product is fixed for life — market-dal.ts), so the memory suite's flip cannot be
// copied through the store here. A real Up & Down round is born UPDOWN; this one becomes it after its bets.
await prisma.predictionMarket.update({ where: { id: m6.id }, data: { productLine: "UPDOWN" } });
void marketStore;
await resolveAndSettle(m1.id, "YES");
await resolveAndSettle(m2.id, "YES");
const ev = await svc.emergencyVoidMarket({ marketId: m3.id, officerId: `${RUN}_oa`, reason: "e2e: emergency void for the tax report" });
ok("0.1 precondition — the emergency void ran", ev.ok, JSON.stringify(ev).slice(0, 160));
const co = await svc.cashOutPosition(exit.uid, exit.positionId);
ok("0.2 precondition — the free exit ran", co.ok, JSON.stringify(co).slice(0, 160));
await resolveAndSettle(m6.id, "NO");
await sleep(10);
const tCut = Date.now();
await sleep(10);
await resolveAndSettle(m5.id, "YES");
await sleep(10);
const tB1 = Date.now() + 1;

// ── 1 · the same figures as the memory suite, read through every Prisma twin ─────────────────
const A = await read(tA0, tCut);
const f = A.main;
eq("1.1 Sales 49,000 · Payout 20,570 · Refunds 17,000 · Fee kept 1,430 · On hold 10,000 · B/f 0",
  [f.report1.salesCents, f.report1.payoutCents, f.report1.refundsCents, f.report1.feeKeptCents, f.report1.onHoldCents, f.report1.broughtForwardCents],
  [49_000_00, 20_570_00, 17_000_00, 1_430_00, 10_000_00, 0]);
ok("1.2 the check closes to the cent on Postgres", f.reconciliation.balanced && A.exceptionCount === 0, JSON.stringify({ rec: f.reconciliation, ex: A.exceptions.slice(0, 3) }));
eq("1.3 Report 2: 2,674 · 267 · 134 · 401", [f.tax.commission, f.tax.tra, f.tax.gbt, f.tax.total], [2_674, 267, 134, 401]);
eq("1.4 refunds by reason", Object.fromEntries(f.refundsByReason.map((r) => [r.code, [r.count, r.cents]])), { ONE_SIDED_BET: [2, 10_000_00], ROUND_CANCELLED: [2, 5_000_00], PLAYER_EXIT: [1, 2_000_00], OTHER: [0, 0] });
const B = await read(tCut, tB1);
eq("1.5 the late round reclassifies: B = Payout 9,610 · fee 390 · B/f 10,000", [B.main.report1.payoutCents, B.main.report1.feeKeptCents, B.main.report1.broughtForwardCents, B.main.reconciliation.balanced], [9_610_00, 390_00, 10_000_00, true]);
const pu = await read(tA0, tCut, "UPDOWN");
eq("1.6 the product filter on Postgres: Up & Down = 2,000 · 1,870 · 130", [pu.main.report1.salesCents, pu.main.report1.payoutCents, pu.main.report1.feeKeptCents], [2_000_00, 1_870_00, 130_00]);

// ── 2 · the live-during read itself (the Prisma WHERE) ───────────────────────────────────────────
const live = await positionStore.listLiveDuring(tA0, tCut);
const ours = live.filter((p) => [m1.id, m2.id, m3.id, m4.id, m5.id, m6.id].includes(p.marketId));
eq("2.1 every bet of the run is live in A (12 bets)", ours.length, 12);
const liveB = (await positionStore.listLiveDuring(tCut, tB1)).filter((p) => [m1.id, m2.id, m3.id, m4.id, m5.id, m6.id].includes(p.marketId));
eq("2.2 only the late round's two bets are live in B (they were on hold at its start)", liveB.map((p) => p.marketId).sort(), [m5.id, m5.id]);
const many = await positionStore.getMany([exit.positionId, "pos_missing"]);
ok("2.3 getMany returns the bets that exist and silently skips the rest", many.length === 1 && many[0].id === exit.positionId);

// ── 3 · locks: the partial unique index, the jsonb round trip ────────────────────────────────────
const key = `${RUN}`.slice(-6);
const period = { periodKind: "day" as const, periodKey: `2031-01-${String((Date.now() % 27) + 1).padStart(2, "0")}`, product: "ALL" as const };
const base = { ...period, periodStartMs: A.period.startMs, periodEndMs: A.period.endMs, snapshot: A, balanced: true, lockedBy: `${RUN}_oa`, note: `e2e ${key}`, exceptionsAcknowledged: null };
// Clear any live lock left on this key by an earlier run of the suite on the same database.
await prisma.taxPeriodLock.updateMany({ where: { ...period, unlockedAt: null }, data: { unlockedAt: new Date(), unlockedBy: "e2e-cleanup", unlockReason: "previous e2e run" } });
const l1 = await L.insertLock(base);
const l2 = await L.insertLock(base);
ok("3.1 the database refuses a second live lock (partial unique index → ALREADY_LOCKED)", l1.ok && !l2.ok && l2.code === "ALREADY_LOCKED", JSON.stringify(l2).slice(0, 120));
const row = l1.ok ? await prisma.taxPeriodLock.findUnique({ where: { id: l1.lock.id } }) : null;
ok("3.2 the snapshot read back from jsonb hashes to the stored sha256", !!row && L.snapshotHash(row.snapshot as never) === row.sha256);
const viewP = E.dayPeriod(period.periodKey)!;
const v = await V.loadTaxReportView({ period: viewP, product: "ALL", nowMs: FAR });
ok("3.3 the view of a locked period is the snapshot read from Postgres", v.ok && v.view.lock?.id === (l1.ok ? l1.lock.id : "") && v.view.data.main.report1.salesCents === A.main.report1.salesCents);
const rel = l1.ok ? await L.releaseLock(l1.lock.id, `${RUN}_oa`, "e2e reopen") : { ok: false };
const relAgain = l1.ok ? await L.releaseLock(l1.lock.id, `${RUN}_oa`, "again") : { ok: true };
const l3 = await L.insertLock(base);
ok("3.4 release is conditional (once), and a re-lock after it is a new row", rel.ok && !relAgain.ok && l3.ok && l3.lock.id !== (l1.ok ? l1.lock.id : ""));
const hist = await L.locksForPeriod(period.periodKind, period.periodKey, "ALL");
ok("3.5 the history keeps both rows, newest first", hist.length >= 2 && hist[0].unlockedAtMs === null && hist.some((h) => h.unlockedAtMs !== null));
let checkRefused = false;
try { await prisma.$executeRawUnsafe(`INSERT INTO "TaxPeriodLock" ("id","periodKind","periodKey","product","periodStart","periodEnd","snapshot","sha256","balanced","lockedBy") VALUES ('${RUN}_bad','custom','x','ALL',now(),now(),'{}','x',true,'x')`); } catch { checkRefused = true; }
ok("3.6 the CHECK constraint refuses a custom period lock", checkRefused);
if (l3.ok) await L.releaseLock(l3.lock.id, `${RUN}_oa`, "e2e cleanup");

// ── 4 · day by day on Postgres: the days add up, and a lock carries them through jsonb ──────────
// A window from a day before the run to its end crosses at least one EAT midnight, so it has days. Its edges are on
// the minute, as every window the page can name is: a day's link opens a window of whole minutes.
const MIN = 60_000;
const W = await read(Math.floor((tA0 - 86_400_000) / MIN) * MIN, Math.ceil(tB1 / MIN) * MIN + MIN);
const days = W.byDay ?? [];
const sumOf = (k: "salesCents" | "payoutCents" | "refundsCents" | "feeKeptCents") => days.reduce((t, x) => t + x.report1[k], 0);
ok("4.1 a window across midnight has its days, and their flows add up to it on Postgres",
  days.length >= 2 && sumOf("salesCents") === W.main.report1.salesCents && sumOf("payoutCents") === W.main.report1.payoutCents
    && sumOf("refundsCents") === W.main.report1.refundsCents && sumOf("feeKeptCents") === W.main.report1.feeKeptCents
    && days[days.length - 1].report1.onHoldCents === W.main.report1.onHoldCents,
  `${days.length} days`);
const last = days[days.length - 1];
const own = last ? await buildTaxReportData({ period: E.daySlice(last.startMs, W.period.endMs).period, product: "ALL", nowMs: FAR }) : null;
ok("4.2 the run's day, opened on its own through every Prisma twin, is exactly its row",
  !!own?.ok && JSON.stringify(own.data.main.report1) === JSON.stringify(last.report1), own?.ok ? JSON.stringify([own.data.main.report1, last.report1]) : "no row");
const dayKeyed = { periodKind: "day" as const, periodKey: `2031-02-${String((Date.now() % 27) + 1).padStart(2, "0")}`, product: "ALL" as const };
await prisma.taxPeriodLock.updateMany({ where: { ...dayKeyed, unlockedAt: null }, data: { unlockedAt: new Date(), unlockedBy: "e2e-cleanup", unlockReason: "previous e2e run" } });
const l4 = await L.insertLock({ ...dayKeyed, periodStartMs: W.period.startMs, periodEndMs: W.period.endMs, snapshot: W, balanced: true, lockedBy: `${RUN}_oa`, note: `e2e days ${key}`, exceptionsAcknowledged: null });
const row4 = l4.ok ? await prisma.taxPeriodLock.findUnique({ where: { id: l4.lock.id } }) : null;
const back = row4?.snapshot as { byDay?: unknown } | undefined;
ok("4.3 a lock's snapshot keeps its days through jsonb — the same days, the same sha256",
  // Compared CANONICALLY: jsonb keeps its own key order (tax-locks.ts), so a plain stringify of the read-back differs.
  !!row4 && L.snapshotHash(row4.snapshot as never) === row4.sha256 && L.canonicalJson(back?.byDay ?? null) === L.canonicalJson(W.byDay ?? null), l4.ok ? "" : JSON.stringify(l4).slice(0, 160));
if (l4.ok) await L.releaseLock(l4.lock.id, `${RUN}_oa`, "e2e cleanup");

await prisma.$disconnect();
console.log(`\ne2e:tax-report: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
