/**
 * test:tax-report — the Government Tax Report, asserted by CALLING it (docs/TAX-REPORT.md §9).
 *
 * ⭐ EVERY CHECK EXECUTES THE CODE THAT SHIPS. §1–§8 call the pure engine (`src/lib/tax-report.ts`);
 * §9–§13 build real books through the REAL money services in memory — `buyPosition`,
 * `resolveMarket`, `settleMarket`, `cashOutPosition`, `emergencyVoidMarket` — and read them through
 * the REAL reader (`buildTaxReportData`), lock store, view loader and document builders. Nothing here
 * re-implements the arithmetic it is checking: every expected figure is computed BY HAND in this
 * file, from the plan or from the bets placed, and the reader must reproduce it to the cent.
 *
 * The plan's acceptance tests (§8 of the owner's PDF) are §2 (the worked example), §10 (a withdrawal
 * changes nothing) and §11 (a round resulted after the cut-off stays On hold, then reclassifies).
 * §14 is the day-by-day breakdown: real bets placed and settled across three EAT days (one across midnight, one
 * on its stroke), every day read back as its own report and as that day opened on its own, the days adding up.
 * §12 (S6) is Maswali Millionea (MASWALI-BUILD S6, OD-08): planted weeks — no winner, a carry with a floor top-up,
 * seven winners with rounding carried, a void — filed by their three reconciling lines and their booked fee, beside a
 * poll and a round that are byte-identical with and without the weeks (`test:maswali-reporting` drives the real week);
 * and the weeks whose record cannot be filed from — a fee off its rate, a record missing, a record lacking its fee
 * (12.19c, round 2) — each named as an exception, never filed as a zero; and a week whose booked levies are null files
 * whole (12.19d, round 5: the report never reads them).
 *
 * ⛔ NO DATABASE, EVER: the URL is deleted before any server module loads, so this suite cannot
 * write to a real database even when one is configured in the shell. TZ is forced to Honolulu so a
 * date computed in server-local time instead of EAT fails here.
 * TAX_SRC points the suite at a copied tree — `red:tax-report`'s mechanism.
 *
 * Run: npm run test:tax-report
 */
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

process.exitCode = 1;
delete process.env.DATABASE_URL;
delete process.env.DATABASE_PUBLIC_URL;
process.env.USE_PRISMA_DAL = "false";
process.env.TZ = "Pacific/Honolulu";

const ROOT = process.env.TAX_SRC ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (rel: string) => import(pathToFileURL(join(ROOT, rel)).href);

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); }
  else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? `\n         ${d}` : ""}`); }
  return c;
};
const eq = (n: string, got: unknown, want: unknown) => ok(n, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)} · want ${JSON.stringify(want)}`);

if (new Date(Date.UTC(2026, 0, 1)).getTimezoneOffset() !== 600) {
  console.log("BLIND — the time zone did not take; a local-time defect could not be seen. Refusing to report.");
  process.exit(3);
}

const E = (await load("src/lib/tax-report.ts")) as typeof import("../src/lib/tax-report.ts");

console.log("\ntax-report — the Government Tax Report, executed\n");

/* ═══ §1 · THE ENGINE IS PURE ═════════════════════════════════════════════════════════════════ */
console.log("§1 · the arithmetic module is pure, so every check below is a real assertion");
{
  const { decomment } = await import("./lib/decomment.mts");
  const code = decomment(readFileSync(join(ROOT, "src/lib/tax-report.ts"), "utf8").replace(/\r\n/g, "\n"));
  ok("1.1 no client directive, no DOM, no Prisma, no clock, no server import",
    !/["']use client["']/.test(code) && !/\bdocument\.|\bwindow\.|prisma|Date\.now\(\)|new Date\(\)|lib\/server/.test(code));
  ok("1.2 control — the scan sees the module (it names taxOnPayout)", /export function taxOnPayout/.test(code));
}

/* ═══ §2 · THE PLAN'S WORKED EXAMPLE, TO THE SHILLING (acceptance test 1) ═════════════════════════ */
console.log("§2 · the approved worked example (plan §3, §8)");
{
  const t = E.taxOnPayout(570_000 * 100, E.APPROVED_RATES);
  eq("2.1 Commission = 13% × 570,000 = 74,100", t.commission, 74_100);
  eq("2.2 TRA = 10% × 74,100 = 7,410", t.tra, 7_410);
  eq("2.3 GBT = 5% × 74,100 = 3,705", t.gbt, 3_705);
  eq("2.4 Total tax = 11,115", t.total, 11_115);
  const r = E.reconcile({ salesCents: 1_000_000_00, payoutCents: 570_000_00, onHoldCents: 150_000_00, refundsCents: 280_000_00, feeKeptCents: 0, broughtForwardCents: 0 });
  ok("2.5 Sales 1,000,000 = Payout 570,000 + On hold 150,000 + Refunds 280,000 — reconciliation 0", r.balanced && r.differenceCents === 0 && r.accountedCents === 1_000_000_00, JSON.stringify(r));
  const bad = E.reconcile({ salesCents: 1_000_000_00, payoutCents: 570_000_00, onHoldCents: 150_000_00, refundsCents: 279_999_99, feeKeptCents: 0, broughtForwardCents: 0 });
  ok("2.6 control — one cent short is OUT of balance (exact, no tolerance)", !bad.balanced && bad.differenceCents === 1, JSON.stringify(bad));
  const general = E.reconcile({ salesCents: 0, payoutCents: 9_610_00, onHoldCents: 0, refundsCents: 0, feeKeptCents: 390_00, broughtForwardCents: 10_000_00 });
  ok("2.7 the general form — a period of only reclassified stakes balances with its brought-forward", general.balanced, JSON.stringify(general));
  eq("2.8 the approved rates are 13% / 10% / 5% in basis points", E.APPROVED_RATES, { commissionBp: 1300, traBp: 1000, gbtBp: 500 });
}

/* ═══ §3 · ROUNDING AT EACH STEP, HALVES AWAY FROM ZERO ══════════════════════════════════════════ */
console.log("§3 · rounding is applied at every step (plan §3.3)");
{
  const a = E.taxOnPayout(999 * 100, E.APPROVED_RATES); // 129.87 → 130; TRA 13; GBT 6.5 → 7
  eq("3.1 Payout 999: Commission 129.87 → 130", a.commission, 130);
  eq("3.2 …TRA 13.0 → 13, GBT 6.5 → 7 (half up), Total 20", [a.tra, a.gbt, a.total], [13, 7, 20]);
  ok("3.3 control — rounding only at the end would give 19 (999 × 13% × 15% = 19.48); step rounding gives 20", Math.round(999 * 0.13 * 0.15) === 19 && a.total === 20);
  const h = E.taxOnPayout(1_150 * 100, E.APPROVED_RATES); // 149.5 → 150
  eq("3.4 a half commission rounds up: 1,150 × 13% = 149.5 → 150; GBT 7.5 → 8", [h.commission, h.tra, h.gbt], [150, 15, 8]);
  eq("3.5 negatives round half AWAY from zero (−2.5 → −3), never toward +∞", Number(E.roundHalfAwayFromZero(BigInt(-25), BigInt(10))), -3);
  eq("3.6 …and −2.4 → −2", Number(E.roundHalfAwayFromZero(BigInt(-24), BigInt(10))), -2);
  const big = E.taxOnPayout(50_000_000_000 * 100, E.APPROVED_RATES);
  eq("3.7 50 billion of Payout taxes exactly (BigInt — past 2^53 in cents × basis points)", [big.commission, big.tra, big.gbt], [6_500_000_000, 650_000_000, 325_000_000]);
  const cents = E.taxOnPayout(1_000_50, E.APPROVED_RATES); // 1,000.50 × 13% = 130.065 → 130
  eq("3.8 a Payout with cents: 1,000.50 → Commission 130", cents.commission, 130);
  let threw = false;
  try { E.taxOnPayout(1.5, E.APPROVED_RATES); } catch { threw = true; }
  ok("3.9 a non-integer cents figure is REFUSED, never rounded silently", threw);
}

/* ═══ §4 · RATES: PERCENT INPUT, LABELS, VALIDATION ═══════════════════════════════════════════════ */
console.log("§4 · an officer's percentage becomes basis points, or nothing");
{
  const cases: Array<[string, number | null]> = [["13", 1300], ["12.5", 1250], ["13.25", 1325], [" 10 % ", 1000], ["0", 0], ["100", 10000], ["1,3", null], ["13.333", null], ["101", null], ["-1", null], ["", null], ["abc", null]];
  for (const [input, want] of cases) eq(`4.1 parsePercentToBp(${JSON.stringify(input)}) → ${want}`, E.parsePercentToBp(input), want);
  eq("4.2 labels print no binary tail: 1300 → 13% · 1250 → 12.5% · 1305 → 13.05% · 1310 → 13.1%", [1300, 1250, 1305, 1310].map(E.percentLabel), ["13%", "12.5%", "13.05%", "13.1%"]);
  ok("4.3 a rate above 100% or a fraction of a basis point is not a rate", !E.isValidBp(10001) && !E.isValidBp(12.5) && E.isValidBp(0) && E.isValidBp(10000));
}

/* ═══ §5 · EFFECTIVE-DATED RATE VERSIONS ══════════════════════════════════════════════════════════ */
console.log("§5 · a rate change re-prices nothing before its day");
{
  const v = (id: string, day: string, c: number, at: string): import("../src/lib/tax-report.ts").RateVersion =>
    ({ id, effectiveFrom: day, rates: { commissionBp: c, traBp: 1000, gbtBp: 500 }, recordedBy: "usr_t", recordedAt: at, note: "test" });
  const versions = [v("v_nov", "2026-11-01", 1200, "2026-10-03T10:00:00Z"), v("v_bad", "2026-02-30", 1, "2026-10-03T10:00:00Z")];
  const norm = E.normaliseVersions(versions);
  eq("5.1 the approved version is always first; a version on an impossible day is dropped", norm.map((x) => x.id), ["approved-2026", "v_nov"]);
  const mid = E.monthPeriod("2026-10")!;
  eq("5.2 October is taxed at 13% — November's change does not reach back", E.versionAt(mid.startMs + 1, norm).rates.commissionBp, 1300);
  const nov = E.monthPeriod("2026-11")!;
  eq("5.3 November is taxed at 12%", E.versionAt(nov.startMs, norm).rates.commissionBp, 1200);
  const span = { startMs: E.monthPeriod("2026-10")!.startMs, endMs: E.monthPeriod("2026-11")!.endMs };
  const segs = E.rateSegments(span.startMs, span.endMs, norm);
  ok("5.4 a window spanning the change splits at 00:00 EAT on 1 Nov into two segments", segs.length === 2 && segs[0].endMs === nov.startMs && segs[1].version.id === "v_nov", JSON.stringify(segs.map((s) => [s.startMs, s.endMs, s.version.id])));
  const tot = E.taxForSegments([{ segment: segs[0], payoutCents: 1_000_00 }, { segment: segs[1], payoutCents: 1_000_00 }]);
  eq("5.5 each segment is taxed at its own rate and the totals are sums of rounded lines (130 + 120)", [tot.commission, tot.tra, tot.gbt, tot.total], [250, 25, 13, 38]);
  const corrected = E.normaliseVersions([v("v1", "2026-11-01", 1200, "2026-10-03T10:00:00Z"), v("v2", "2026-11-01", 1100, "2026-10-04T10:00:00Z")]);
  eq("5.6 two versions for one day: the later-recorded one wins (a correction)", corrected.map((x) => [x.id, x.rates.commissionBp]), [["approved-2026", 1300], ["v2", 1100]]);
  const genesis = E.normaliseVersions([v("g", E.GENESIS_DAY, 1400, "2026-10-03T10:00:00Z")]);
  eq("5.7 an admin version ON the genesis day replaces the approved rates from the start", genesis.map((x) => x.id), ["g"]);
  const same = E.rateSegments(span.startMs, span.endMs, [v("v_same", "2026-10-15", 1300, "2026-10-03T10:00:00Z")]);
  eq("5.8 a version that changes NO rate does not split the period (a split could move the tax by a rounding)", same.length, 1);
}

/* ═══ §6 · REPORTING PERIODS IN EAST AFRICA TIME ══════════════════════════════════════════════════ */
console.log("§6 · day, week, month and custom periods are EAT windows");
{
  const sep = E.monthPeriod("2026-09")!;
  eq("6.1 September 2026 = [31 Aug 21:00Z, 30 Sep 21:00Z)", [new Date(sep.startMs).toISOString(), new Date(sep.endMs).toISOString(), sep.label], ["2026-08-31T21:00:00.000Z", "2026-09-30T21:00:00.000Z", "September 2026"]);
  const wk = E.weekPeriod("2026-09-17")!; // a Thursday
  eq("6.2 any day of a week names its Monday-to-Sunday EAT week (ISO week 38)", [wk.key, wk.label], ["2026-09-14", "Week 38 · 14–20 Sep 2026"]);
  const wkYear = E.weekPeriod("2026-12-31")!;
  eq("6.3 a week spanning New Year keeps both years in its label (ISO week 53)", wkYear.label, "Week 53 · 28 Dec 2026 – 3 Jan 2027");
  const day = E.dayPeriod("2026-09-30")!;
  eq("6.4 a day is 00:00–24:00 EAT", [new Date(day.startMs).toISOString(), day.label], ["2026-09-29T21:00:00.000Z", "Wed 30 Sep 2026"]);
  ok("6.5 impossible inputs are null, never a guess", E.monthPeriod("2026-13") === null && E.dayPeriod("2026-02-30") === null && E.customPeriod("2026-09-02T00:00", "2026-09-01T00:00") === null && E.customPeriod("2026-01-01T00:00", "2027-06-01T00:00") === null);
  const c = E.customPeriod("2026-09-14T08:00", "2026-09-20T18:00")!;
  eq("6.6 a custom window is EAT wall-clock, end exclusive", [new Date(c.startMs).toISOString(), new Date(c.endMs).toISOString()], ["2026-09-14T05:00:00.000Z", "2026-09-20T15:00:00.000Z"]);
  const oct3 = Date.parse("2026-10-03T12:00:00Z");
  eq("6.7 the default view is the last COMPLETE month: on 3 Oct, September", E.lastCompleteMonth(oct3).key, "2026-09");
  eq("6.8 …and at 01:00 EAT on 1 Nov (still 31 Oct in UTC) it is October", E.lastCompleteMonth(Date.parse("2026-10-31T22:00:00Z")).key, "2026-10");
  const fb = E.periodFromParams({ period: "day", day: "nonsense" }, oct3);
  ok("6.9 an unreadable period falls back to the default AND says so", fb.fellBack && fb.period.key === "2026-09");
  const okp = E.periodFromParams({ period: "week", week: "2026-09-16" }, oct3);
  ok("6.10 a readable one does not", !okp.fellBack && okp.period.key === "2026-09-14");
  eq("6.11 previous and next months", [E.shiftPeriod(sep, -1)!.key, E.shiftPeriod(sep, 1)!.key, E.shiftPeriod(E.monthPeriod("2026-01")!, -1)!.key], ["2026-08", "2026-10", "2025-12"]);
  const oct = E.monthPeriod("2026-10")!;
  ok("6.12 a running month is PARTIAL, read to a minute before now (bets still committing); a past one is whole",
    E.cutoffOf(oct, oct3).inProgress && E.cutoffOf(oct, oct3).cutoffMs === oct3 - E.RUNNING_MARGIN_MS && !E.cutoffOf(sep, oct3).inProgress && E.cutoffOf(sep, oct3).cutoffMs === sep.endMs);
  ok("6.13 only a finished day/week/month can be locked, and only after the grace", E.isLockable(sep, oct3) && !E.isLockable(oct, oct3) && !E.isLockable(c, oct3) && !E.isLockable(sep, sep.endMs + 60_000) && E.isLockable(sep, sep.endMs + E.LOCK_GRACE_MS));
  eq("6.14 switching kinds keeps the first day: September → week of 31 Aug–6 Sep, day 1 Sep", [E.periodOfKind(sep, "week").key, E.periodOfKind(sep, "day").key, E.periodOfKind(sep, "custom").key], ["2026-08-31", "2026-09-01", "2026-09-01T00:00~2026-10-01T00:00"]);
  const qs = E.taxQueryString(wk, "UPDOWN");
  const back = E.periodFromParams(Object.fromEntries(new URLSearchParams(qs)), oct3);
  ok("6.15 the URL round-trips: the query a link carries names the period it was built from", qs === "period=week&week=2026-09-14&product=UPDOWN" && back.period.key === wk.key && !back.fellBack, qs);
  eq("6.16 'All products' is the default and is left out of the URL", E.taxQueryString(sep, "ALL"), "period=month&month=2026-09");
  const inferred = [
    E.periodFromParams({ week: "2026-09-16" }, oct3),
    E.periodFromParams({ day: "2026-09-16" }, oct3),
    E.periodFromParams({ from: "2026-09-14T08:00", to: "2026-09-20T18:00" }, oct3),
  ];
  eq("6.17 a link naming only a week, a day or a window means THAT — never silently the default month",
    inferred.map((r) => [r.period.kind, r.period.key, r.fellBack]),
    [["week", "2026-09-14", false], ["day", "2026-09-16", false], ["custom", "2026-09-14T08:00~2026-09-20T18:00", false]]);
}

/* ═══ §7 · CENTS IN, CENTS OUT ════════════════════════════════════════════════════════════════════ */
console.log("§7 · money is integer cents end to end");
{
  eq("7.1 toCents reads a Decimal string, a float and a negative exactly", [E.toCents("1110.6"), E.toCents(1110.6), E.toCents("-12.345"), E.toCents(0.1 + 0.2), E.toCents(null)], [111060, 111060, -1235, 30, 0]);
  eq("7.2 formatCents prints cents only when they exist, with a real minus", [E.formatCents(100000000), E.formatCents(111060), E.formatCents(-1999900), E.formatCents(0)], ["1,000,000", "1,110.60", "−19,999", "0"]);
}

/* ═══ §8 · REFUND REASONS ═════════════════════════════════════════════════════════════════════════ */
console.log("§8 · every refund carries the reason its round records");
{
  eq("8.1 a cash-out is a player's exit", E.classifyRefund({ type: "CASHOUT", roundFound: true, verdict: null }), "PLAYER_EXIT");
  eq("8.2 a refund on a round resolved YES/NO is a one-sided bet", E.classifyRefund({ type: "BET_REFUND", roundFound: true, verdict: "NO" }), "ONE_SIDED_BET");
  eq("8.3 a refund on a VOID round is a cancelled round", E.classifyRefund({ type: "BET_REFUND", roundFound: true, verdict: "VOID" }), "ROUND_CANCELLED");
  eq("8.4 a refund whose round is gone is OTHER", E.classifyRefund({ type: "BET_REFUND", roundFound: false, verdict: null }), "OTHER");
  eq("8.5 the plan's codes: ONE_SIDED_BET | CANCELLED | OTHER", E.REFUND_REASON_ORDER.map((c) => E.REFUND_REASONS[c].planCode), ["ONE_SIDED_BET", "CANCELLED", "CANCELLED", "OTHER"]);
}

/* ═══ §9 · REAL BOOKS: THE READER AGAINST REAL BETS AND SETTLEMENTS ═══════════════════════════════ */
console.log("§9 · real bets, settlements, refunds and exits, read back to the cent");
const { db } = (await load("src/lib/server/store.ts")) as typeof import("../src/lib/server/store.ts");
// ⚠️ No `verified-fixtures` import: this suite bets, settles, refunds and exits, and since 2026-09-13 identity is asked
// before a WITHDRAWAL only — that module's own header calls it inert for such a suite. Keeping every load under ROOT
// is what lets `red:tax-report` run the whole suite against a mutated copy of `src/`.
const svc = (await load("src/lib/server/market-service.ts")) as typeof import("../src/lib/server/market-service.ts");
const { marketStore, positionStore } = (await load("src/lib/server/market-dal.ts")) as typeof import("../src/lib/server/market-dal.ts");
const { buildTaxReportData } = (await load("src/lib/server/tax-report-data.ts")) as typeof import("../src/lib/server/tax-report-data.ts");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const nowIso = () => new Date().toISOString();
let seq = 0;
async function user(id: string, role = "PLAYER") {
  await db.user.create({
    id, phoneE164: `+25596${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role, status: "ACTIVE", locale: "EN",
    displayName: id, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: nowIso(), updatedAt: nowIso(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 1_000_000, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: nowIso(), updatedAt: nowIso() } as never);
}
async function market(tag: string) {
  return svc.createMarket({
    titleEn: `tax-report ${tag}`, titleSw: "Soko", category: "macro", sourceUrl: "https://bot.go.tz",
    resolutionCriterion: "Resolves at the official date.", resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);
}
async function bet(tag: string, marketId: string, side: "YES" | "NO", stake: number) {
  const uid = `tx_${tag}_${++seq}`;
  await user(uid);
  const r = await svc.buyPosition(uid, { marketId, side, stake });
  if (!r.ok) throw new Error(`bet refused (${tag}): ${JSON.stringify(r).slice(0, 200)}`);
  return { uid, positionId: (r as { data: { positionId: string } }).data.positionId };
}
async function resolveAndSettle(marketId: string, outcome: "YES" | "NO" | "VOID") {
  const first = await svc.resolveMarket({ marketId, outcome, officerId: "tx_officer_a" });
  if (first.ok && first.data.stage === "stage1") await svc.resolveMarket({ marketId, outcome, officerId: "tx_officer_b" });
  const s = await svc.settleMarket(marketId, { force: true });
  if (!s.ok) throw new Error(`settle refused: ${JSON.stringify(s).slice(0, 200)}`);
}
const custom = (startMs: number, endMs: number): import("../src/lib/tax-report.ts").TaxPeriod => ({ kind: "custom", key: `t~${startMs}`, startMs, endMs, label: "test window" });
const FAR = Date.now() + 365 * 864e5;
async function read(startMs: number, endMs: number, product: "ALL" | "MARKET" | "UPDOWN" = "ALL") {
  const r = await buildTaxReportData({ period: custom(startMs, endMs), product, nowMs: FAR });
  if (!r.ok) throw new Error(r.error);
  return r.data;
}

await user("tx_officer_a", "ADMIN");
await user("tx_officer_b", "ADMIN");

// ── Window A: every kind of movement ──────────────────────────────────────────────────────────
const tA0 = Date.now() - 1;
await sleep(5);
const m1 = await market("two-sided");          // YES wins: losing NO 10,000 → fee 1,300, winners share 18,700
await bet("m1", m1.id, "YES", 5_000); await bet("m1", m1.id, "YES", 5_000); await bet("m1", m1.id, "NO", 10_000);
const m2 = await market("one-sided");          // YES only, resolved YES → every stake refunded
await bet("m2", m2.id, "YES", 4_000); await bet("m2", m2.id, "YES", 6_000);
const m3 = await market("emergency");          // emergency void → refunded
await bet("m3", m3.id, "YES", 3_000); await bet("m3", m3.id, "NO", 2_000);
const m4 = await market("cash-out");           // free exit → the whole stake back
const exit = await bet("m4", m4.id, "YES", 2_000);
const m5 = await market("late");               // placed in A, resulted in B
await bet("m5", m5.id, "YES", 7_000); await bet("m5", m5.id, "NO", 3_000);
const m6 = await market("updown");             // flipped to Up & Down before it settles: NO wins
await bet("m6", m6.id, "YES", 1_000); await bet("m6", m6.id, "NO", 1_000);
{
  const m = await marketStore.get(m6.id);
  await marketStore.set({ ...m!, productLine: "UPDOWN" } as never);
}
await resolveAndSettle(m1.id, "YES");
await resolveAndSettle(m2.id, "YES");
const ev = await svc.emergencyVoidMarket({ marketId: m3.id, officerId: "tx_officer_a", reason: "Test: emergency void for the tax report" });
ok("9.0 precondition — the emergency void ran", ev.ok, JSON.stringify(ev).slice(0, 200));
const co = await svc.cashOutPosition(exit.uid, exit.positionId);
ok("9.0 precondition — the free exit ran", co.ok, JSON.stringify(co).slice(0, 200));
await resolveAndSettle(m6.id, "NO");
await sleep(5);
const before = await read(tA0, Date.now() + 1);
// A customer withdrawal inside the window (acceptance test 2) — written straight into the money records.
await db.txn.create({
  id: `txn_tx_wd_${seq}`, walletId: "wal_tx_officer_a", userId: "tx_officer_a", type: "WITHDRAWAL", status: "CONFIRMED",
  amount: -50_000, fee: 750, taxWithheld: 0, balanceAfter: 950_000, currency: "TZS", provider: "MPESA", providerRef: null,
  msisdn: null, description: "Withdrawal", positionId: null, amlReason: null, createdAt: nowIso(), updatedAt: nowIso(), completedAt: nowIso(),
} as never);
await sleep(5);
const tCut = Date.now();
await sleep(5);
// ── Window B: the late round results ─────────────────────────────────────────────────────────
await resolveAndSettle(m5.id, "YES");
await sleep(5);
const tB1 = Date.now() + 1;

const A = await read(tA0, tCut);
const f = A.main;
/** The single-product view of the planted window (set in section 12), whose own check closes while the whole book's does not. */
let wholeOutView: Awaited<ReturnType<typeof read>> | null = null;
/** One real exception row from section 12, cloned for the PDF fit fixture in section 13. */
let X0: Awaited<ReturnType<typeof read>>["exceptions"][number] | null = null;
/** Section 12's planted window under All products: out of balance by -20,999 on its own check. */
let outAllView: Awaited<ReturnType<typeof read>> | null = null;
{
  // Hand-computed from the bets above:
  //   Sales   = 20,000 (m1) + 10,000 (m2) + 5,000 (m3) + 2,000 (m4) + 10,000 (m5) + 2,000 (m6) = 49,000
  //   Payout  = 18,700 (m1: 20,000 − 13% × 10,000) + 1,870 (m6: 2,000 − 13% × 1,000)     = 20,570
  //   Refunds = 10,000 (one-sided) + 5,000 (emergency void) + 2,000 (free exit)          = 17,000
  //   Fee     = 1,300 + 130                                                              = 1,430
  //   On hold = 10,000 (m5, resulted after the cut-off) · brought forward = 0
  eq("9.1 Sales 49,000 — every stake placed in A", f.report1.salesCents, 49_000_00);
  eq("9.2 Payout 20,570 — winnings on the two resulted rounds", f.report1.payoutCents, 20_570_00);
  eq("9.3 Refunds 17,000 — one-sided + emergency void + free exit", f.report1.refundsCents, 17_000_00);
  eq("9.4 Platform fee kept 1,430 — 13% of each losing side", f.report1.feeKeptCents, 1_430_00);
  eq("9.5 On hold 10,000 — the round resulted after the cut-off", f.report1.onHoldCents, 10_000_00);
  eq("9.6 nothing was brought forward into A", f.report1.broughtForwardCents, 0);
  ok("9.7 THE CHECK CLOSES: 20,570 + 10,000 + 17,000 + 1,430 − 0 = 49,000", f.reconciliation.balanced && f.reconciliation.differenceCents === 0, JSON.stringify(f.reconciliation));
  eq("9.8 no exceptions on clean books", [A.exceptionCount, A.explainedCents], [0, 0]);
  // Tax: 13% × 20,570 = 2,674.1 → 2,674 · TRA 267.4 → 267 · GBT 133.7 → 134 · Total 401
  eq("9.9 Report 2 on 20,570: Commission 2,674 · TRA 267 · GBT 134 · Total 401", [f.tax.commission, f.tax.tra, f.tax.gbt, f.tax.total], [2_674, 267, 134, 401]);
  const reasons = Object.fromEntries(f.refundsByReason.map((r) => [r.code, [r.count, r.cents]]));
  eq("9.10 refunds by reason: one-sided 2 × 10,000 · cancelled round 2 × 5,000 · player exit 1 × 2,000", reasons, { ONE_SIDED_BET: [2, 10_000_00], ROUND_CANCELLED: [2, 5_000_00], PLAYER_EXIT: [1, 2_000_00], OTHER: [0, 0] });
  eq("9.11 the reasons add up to Refunds", f.refundsByReason.reduce((t, r) => t + r.cents, 0), f.report1.refundsCents);
  // 3 (m1) + 2 (m2) + 2 (m3) + 1 (m4) + 2 (m5) + 2 (m6) = 12 bets.
  eq("9.12 counts: 12 bets placed, 3 payments, 5 refund records, 2 rounds resulted, 2 bets on hold", [f.counts.betsPlaced, f.counts.payoutRecords, f.counts.refundRecords, f.counts.roundsResulted, f.counts.betsOnHold], [12, 3, 5, 2, 2]);
}

/* ═══ §10 · A WITHDRAWAL CHANGES NOTHING (acceptance test 2) ═════════════════════════════════════ */
console.log("§10 · a customer withdrawal is a wallet movement, never Payout");
{
  const after = await read(tA0, tCut);
  eq("10.1 Report 1 is identical with and without the 50,000 withdrawal in the window", after.main.report1, before.main.report1);
  eq("10.2 Report 2 is identical too", after.main.tax.total, before.main.tax.total);
  ok("10.3 control — the withdrawal really is inside the window", (await db.txn.listInRange(tA0, tCut)).some((t) => t.type === "WITHDRAWAL" && t.amount === -50_000));
}

/* ═══ §11 · A ROUND RESULTED AFTER THE CUT-OFF (acceptance test 3) ═══════════════════════════════ */
console.log("§11 · it stays On hold for the closed period, and reclassifies in the next");
{
  const B = await read(tCut, tB1);
  const b = B.main;
  // m5: losing NO 3,000 → fee 390, winner gets 9,610.
  eq("11.1 B: nothing placed, 10,000 brought forward", [b.report1.salesCents, b.report1.broughtForwardCents], [0, 10_000_00]);
  eq("11.2 B: the late winnings are B's Payout (9,610) and its fee (390); nothing left on hold", [b.report1.payoutCents, b.report1.feeKeptCents, b.report1.onHoldCents], [9_610_00, 390_00, 0]);
  ok("11.3 B balances with its brought-forward: 9,610 + 0 + 0 + 390 − 10,000 = 0", b.reconciliation.balanced, JSON.stringify(b.reconciliation));
  eq("11.4 B is taxed on 9,610: Commission 1,249 · TRA 125 · GBT 62 · Total 187", [b.tax.commission, b.tax.tra, b.tax.gbt, b.tax.total], [1_249, 125, 62, 187]);
  const AB = await read(tA0, tB1);
  ok("11.5 the union of A and B balances with nothing brought forward or held", AB.main.reconciliation.balanced && AB.main.report1.broughtForwardCents === 0 && AB.main.report1.onHoldCents === 0);
  eq("11.6 every payout is taxed once: A's Payout + B's Payout = the union's", A.main.report1.payoutCents + b.report1.payoutCents, AB.main.report1.payoutCents);
}

/* ═══ §12 · PRODUCTS, ROUNDING AND EXCEPTIONS ═════════════════════════════════════════════════════ */
console.log("§12 · the product filter partitions the books; rounding and defects are named");
{
  const pm = await read(tA0, tCut, "MARKET");
  const pu = await read(tA0, tCut, "UPDOWN");
  eq("12.1 Up & Down alone: Sales 2,000 · Payout 1,870 · fee 130", [pu.main.report1.salesCents, pu.main.report1.payoutCents, pu.main.report1.feeKeptCents], [2_000_00, 1_870_00, 130_00]);
  ok("12.2 each product balances on its own", pm.main.reconciliation.balanced && pu.main.reconciliation.balanced);
  for (const k of ["salesCents", "payoutCents", "onHoldCents", "refundsCents", "feeKeptCents", "broughtForwardCents"] as const) {
    eq(`12.3 Polls + Up & Down = All · ${k}`, pm.main.report1[k] + pu.main.report1[k], A.main.report1[k]);
  }
  ok("12.4 the All view carries both products side by side", A.byProduct?.length === 2 && A.byProduct[0].product === "MARKET" && A.byProduct[1].product === "UPDOWN");
  // The tax lines are NOT additive across products, by the plan's own rule (each Payout rounded at each step).
  eq("12.3b the tax is rounded per product, so it need not add up: Payout 999 + 999 → Total 20 + 20, All 39",
    [E.taxOnPayout(999_00, E.APPROVED_RATES).total * 2, E.taxOnPayout(1_998_00, E.APPROVED_RATES).total], [40, 39]);

  // A fractional fee: losing 1,050 → fee 136.5; settlement books 136 and leaves 1 shilling in the pool.
  const tR0 = Date.now(); await sleep(5);
  const m7 = await market("rounding");
  await bet("m7", m7.id, "YES", 1_000); await bet("m7", m7.id, "NO", 1_050);
  await resolveAndSettle(m7.id, "YES");
  await sleep(5);
  const R = await read(tR0, Date.now() + 1);
  const paid = (await svc.listPositionsForMarket(m7.id)).reduce((t, p) => t + (p.status === "WIN" ? (p.finalPayout ?? 0) : 0), 0);
  eq("12.5 settlement paid the winner floor(2,050 − 136.5) = 1,913", paid, 1_913);
  eq("12.6 the fee kept is everything settlement did not pay: 137 = 136 booked + 1 rounding", [R.main.report1.feeKeptCents, R.main.feeDetail.settlementFeeCents, R.main.feeDetail.roundingCents], [137_00, 136_00, 1_00]);
  ok("12.7 …so the check still closes to the cent", R.main.reconciliation.balanced, JSON.stringify(R.main.reconciliation));

  // Defects, planted in their own window: a payout with no bet, and a bet whose stake is not what was debited.
  const tX0 = Date.now(); await sleep(5);
  await db.txn.create({
    id: `txn_tx_orphan_${seq}`, walletId: "wal_tx_officer_b", userId: "tx_officer_b", type: "BET_PAYOUT", status: "CONFIRMED",
    amount: 19_999, fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS", provider: "INTERNAL", providerRef: null,
    msisdn: null, description: "planted", positionId: "pos_does_not_exist", amlReason: null, createdAt: nowIso(), updatedAt: nowIso(), completedAt: nowIso(),
  } as never);
  const m8 = await market("mismatch");
  const placed = nowIso();
  await positionStore.set({ id: "pos_tx_mismatch", userId: "tx_officer_b", marketId: m8.id, side: "YES", stake: 5_000, bonusStakeTzs: 0, potentialPayout: 5_000, status: "OPEN", finalPayout: null, placedAt: placed, settledAt: null } as never);
  await db.txn.create({
    id: `txn_tx_mm_${seq}`, walletId: "wal_tx_officer_b", userId: "tx_officer_b", type: "BET_PLACED", status: "CONFIRMED",
    amount: -4_000, fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS", provider: "INTERNAL", providerRef: null,
    msisdn: null, description: "planted", positionId: "pos_tx_mismatch", amlReason: null, createdAt: placed, updatedAt: placed, completedAt: placed,
  } as never);
  await sleep(5);
  const X = await read(tX0, Date.now() + 1);
  const x = X.main;
  // Sales 4,000 (the record) · On hold 5,000 (the bet) · Payout 19,999 (the orphan) → D = 4,000 − 19,999 − 5,000 = −20,999
  eq("12.8 the planted books are OUT of balance by exactly −20,999", [x.reconciliation.balanced, x.reconciliation.differenceCents], [false, -20_999_00]);
  eq("12.9 the exceptions explain every shilling of it", X.explainedCents, x.reconciliation.differenceCents);
  const kinds = X.exceptions.map((e) => [e.kind, e.contributionCents]).sort();
  eq("12.10 named: the orphan payout (−19,999) and the short stake (−1,000)", kinds, [["PAYOUT_WITHOUT_RESULT", -19_999_00], ["STAKE_MISMATCH", -1_000_00]].sort());
  eq("12.11 the four parts sum to the difference", x.parts.stakeCents + x.parts.resultCents + x.parts.refundCents + x.parts.exitCents, x.reconciliation.differenceCents);
  // ⛔ THE LOOPHOLE: Up & Down alone has nothing in this window and balances — while the whole book is out.
  const xu = await read(tX0, Date.now() + 1, "UPDOWN");
  ok("12.12 a single-product view that balances still carries the WHOLE book's check (out by −20,999)",
    xu.main.reconciliation.balanced && xu.wholeBook !== null && !xu.wholeBook.balanced && xu.wholeBook.differenceCents === -20_999_00 && xu.unattributedRecords === 1,
    JSON.stringify({ main: xu.main.reconciliation, whole: xu.wholeBook, un: xu.unattributedRecords }));
  ok("12.13 …and the All view carries none (its own check IS the whole book's)", X.wholeBook === null);
  wholeOutView = xu;
  X0 = X.exceptions[0] ?? null;
  outAllView = X;
}

/* ═══ §12 (S6) · MILLIONEA: A WEEK FILES BY ITS OWN LINES, AND POLLS AND UP & DOWN DO NOT MOVE ═══════════ */
// MASWALI-BUILD S6, OD-08 (MB-65). The weeks are PLANTED through the DAL (a market of their own model, their tickets'
// positions and money records, the week's settlement record) — as §12's defects are — so every shape is exact: a
// no-winner week with a claimed carry and a free cancel, a paying week with a carry and a floor top-up, a paying week
// with rounding carried, a voided week. `test:maswali-reporting` drives the REAL week settlement on both stores and holds
// this reader to what it booked. The poll and the round beside them go through the real services, as §9's do.
console.log("§12 (S6) · a Millionea week files by its three reconciling lines and its booked fee (OD-08, MB-65)");
{
  const { weekStore } = (await load("src/lib/server/maswali-dal.ts")) as typeof import("../src/lib/server/maswali-dal.ts");
  const P = (await load("src/lib/payout.ts")) as typeof import("../src/lib/payout.ts");
  const D = (await load("src/lib/server/tax-report-doc.ts")) as typeof import("../src/lib/server/tax-report-doc.ts");
  const L = (await load("src/lib/server/tax-locks.ts")) as typeof import("../src/lib/server/tax-locks.ts");
  const V = (await load("src/lib/server/tax-report-view.ts")) as typeof import("../src/lib/server/tax-report-view.ts");
  const { findPdfOverflows } = (await load("src/lib/server/reports/pdf.ts")) as typeof import("../src/lib/server/reports/pdf.ts");
  type Data = Awaited<ReturnType<typeof read>>;
  type Product = import("../src/lib/tax-report.ts").ProductFilter;
  /** A read that turns a refusal or a throw into a FAIL line under its case's id — a planted defect is named, never a crash. */
  const readM = async (id: string, startMs: number, endMs: number, product: Product): Promise<Data | null> => {
    try {
      const r = await buildTaxReportData({ period: custom(startMs, endMs), product, nowMs: FAR });
      if (r.ok) return r.data;
      ok(`${id} (read ${product})`, false, r.error);
    } catch (e) {
      ok(`${id} (read ${product})`, false, String((e as Error)?.message ?? e).slice(0, 240));
    }
    return null;
  };
  const gen = { generatorId: "usr_tx_gen", generatorName: "Test Officer", generatedAtMs: FAR, lock: null };

  // ── The window: a poll and an Up & Down round through the real services, read BEFORE any week exists ─────────────
  const tM0 = Date.now(); await sleep(5);
  const cp = await market("mln-control-poll");   // YES wins: losing NO 5,000 → fee 650, the winner 9,350
  await bet("mcp", cp.id, "YES", 5_000); await bet("mcp", cp.id, "NO", 5_000);
  await resolveAndSettle(cp.id, "YES");
  const cu = await market("mln-control-round");  // flipped to Up & Down: NO wins → fee 130, the winner 1,870
  await bet("mcu", cu.id, "YES", 1_000); await bet("mcu", cu.id, "NO", 1_000);
  { const m = await marketStore.get(cu.id); await marketStore.set({ ...m!, productLine: "UPDOWN" } as never); }
  await resolveAndSettle(cu.id, "NO");
  await sleep(5);
  const tEnd = Date.now() + 3_600_000;
  const pollsBefore = await readM("12.14", tM0, tEnd, "MARKET");
  const roundsBefore = await readM("12.14", tM0, tEnd, "UPDOWN");
  const allBefore = await readM("12.14b", tM0, tEnd, "ALL");

  // ── The weeks, planted ─────────────────────────────────────────────────────────────────────────────────────────
  await user("tx_mln_player");
  let mseq = 0;
  type Ticket = { status: "WIN" | "LOSS" | "CASHED_OUT" | "VOID"; payout?: number };
  type Cols = Partial<import("../src/lib/server/maswali-dal.ts").StoredWeek>;
  const txn = (id: string, positionId: string, type: string, amount: number, at: string) => db.txn.create({
    id, walletId: "wal_tx_mln_player", userId: "tx_mln_player", type, status: "CONFIRMED", amount, fee: 0, taxWithheld: 0, balanceAfter: null,
    currency: "TZS", provider: "INTERNAL", providerRef: null, msisdn: null, description: "planted Millionea ticket", positionId, amlReason: null,
    createdAt: at, updatedAt: at, completedAt: at,
  } as never);
  async function plantWeek(tag: string, state: "SETTLED" | "VOIDED", tickets: Ticket[], cols: Cols, o: { record?: boolean } = {}): Promise<string> {
    const m = await svc.createMarket({
      titleEn: `Maswali Millionea · tax ${tag}`, titleSw: `Maswali Millionea · ${tag}`, category: "macro", sourceUrl: "https://bot.go.tz",
      resolutionCriterion: "A planted week for the tax report.", resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
      productLine: "MASWALI", rateOverrides: { feeModel: "jackpot-payout", jackpotFeeRate: 0.13, paidExitWindowMinutes: 0 },
    } as never);
    const placedAt = nowIso();
    await sleep(3);
    const settledAt = nowIso();
    let live = 0;
    for (const t of tickets) {
      const id = `pos_tx_mln_${tag}_${++mseq}`;
      const finalPayout = t.status === "WIN" ? (t.payout ?? 0) : t.status === "LOSS" ? 0 : 1_000;
      await positionStore.set({ id, userId: "tx_mln_player", marketId: m.id, side: "YES", stake: 1_000, bonusStakeTzs: 0, potentialPayout: 0,
        status: t.status, finalPayout, placedAt, settledAt, idempotencyKey: null } as never);
      await txn(`txn_tx_mln_${tag}_${mseq}_b`, id, "BET_PLACED", -1_000, placedAt);
      const back = t.status === "WIN" ? "BET_PAYOUT" : t.status === "CASHED_OUT" ? "CASHOUT" : t.status === "VOID" ? "BET_REFUND" : null;
      if (back) await txn(`txn_tx_mln_${tag}_${mseq}_r`, id, back, finalPayout, settledAt);
      if (t.status !== "CASHED_OUT") live++;
    }
    // The market as the week's own paths leave it: the settlement stamps it RESOLVED with no verdict; the void, VOID.
    const cur = await marketStore.get(m.id);
    await marketStore.set({ ...cur!, yesPool: live * 1_000, status: state === "VOIDED" ? "VOIDED" : "RESOLVED",
      resolvedOutcome: state === "VOIDED" ? "VOID" : null, settledAt } as never);
    if (o.record !== false) {
      await weekStore.create({
        id: `mlw_tx_${tag}`, marketId: m.id, code: `MLN-TX-${tag}`, seq: 9_000 + mseq, visibility: "PUBLIC", state,
        opensAt: placedAt, closesAt: settledAt, finalDeadlineAt: settledAt, closedAt: settledAt,
        rulesSnapshot: { planted: true }, questionSetHash: "planted", ticketMerkleRoot: null, ticketCount: live, salesAtClose: live * 1_000,
        gradedSetFinalAt: null, objectionsCloseAt: null, objectionRestarted: false,
        rolloverIn: null, jackpot: null, fee: null, traLevy: null, gbtLevy: null, topUp: null, winningTickets: null, sharePerTicket: null,
        paidTotal: null, carryOut: null, dustCarried: null, settlementGroupId: null, settledAt: state === "SETTLED" ? settledAt : null, releasedBy: null,
        isFinal: false, parityAttestedBy: null, parityAttestedAt: null, createdBy: "test", createdAt: placedAt, updatedAt: settledAt,
        ...cols,
      });
    }
    return m.id;
  }
  // A · no winner: 4 sold, 1 cancelled free, S 3,000 rolled; its claimed carry of 50,000 is a claim, never money in.
  await plantWeek("A", "SETTLED", [{ status: "LOSS" }, { status: "LOSS" }, { status: "LOSS" }, { status: "CASHED_OUT" }],
    { rolloverIn: 50_000, fee: 0, traLevy: 0, gbtLevy: 0, topUp: 0, winningTickets: 0, paidTotal: 0, carryOut: 3_000, dustCarried: 0 });
  // B · one winner: S 4,000 + R 300,000 + U 696,000 = J 1,000,000 = F 130,000 + paid 870,000.
  await plantWeek("B", "SETTLED", [{ status: "WIN", payout: 870_000 }, { status: "LOSS" }, { status: "LOSS" }, { status: "LOSS" }],
    { rolloverIn: 300_000, jackpot: 1_000_000, fee: 130_000, traLevy: 13_000, gbtLevy: 6_500, topUp: 696_000, winningTickets: 1, sharePerTicket: 870_000, paidTotal: 870_000, carryOut: 0, dustCarried: 0 });
  // C · seven winners: S 7,000 + R 993,000 = J 1,000,000 = F 130,000 + 7 × 124,285 + 5 carried (MASWALI-PLAN §5a.1).
  await plantWeek("C", "SETTLED", Array.from({ length: 7 }, () => ({ status: "WIN" as const, payout: 124_285 })),
    { rolloverIn: 993_000, jackpot: 1_000_000, fee: 130_000, traLevy: 13_000, gbtLevy: 6_500, topUp: 0, winningTickets: 7, sharePerTicket: 124_285, paidTotal: 869_995, carryOut: 5, dustCarried: 5 });
  // D · voided whole: both tickets refunded, no fee, R untouched (MR-18).
  await plantWeek("D", "VOIDED", [{ status: "VOID" }, { status: "VOID" }], {});
  await sleep(5);
  const pollsAfter = await readM("12.14", tM0, tEnd, "MARKET");
  const roundsAfter = await readM("12.14", tM0, tEnd, "UPDOWN");
  const all = await readM("12.15", tM0, tEnd, "ALL");
  const mln = await readM("12.16", tM0, tEnd, "MASWALI");

  // ── 12.14 · Polls and Up & Down do not move ────────────────────────────────────────────────────────────────────
  const same = (a: Data | null, b: Data | null) => !!a && !!b && JSON.stringify(a) === JSON.stringify(b) && L.seenFingerprint(a) === L.seenFingerprint(b);
  ok("12.14 ⛔ Polls and Up & Down are byte-identical with and without Millionea weeks in the period — every figure, the whole book's check, the lock fingerprint",
    same(pollsBefore, pollsAfter) && same(roundsBefore, roundsAfter) && pollsAfter?.main.report1.payoutCents === 9_350_00 && roundsAfter?.main.report1.payoutCents === 1_870_00,
    JSON.stringify({ polls: [pollsBefore?.main.report1, pollsAfter?.main.report1], whole: [pollsBefore?.wholeBook, pollsAfter?.wholeBook] }).slice(0, 400));
  ok("12.14b CONTROL — a period with no week files exactly as before: Report 1's six lines, the two products, no Millionea part in Report 2",
    !!allBefore && Object.keys(allBefore.main.report1).join(",") === "salesCents,payoutCents,onHoldCents,refundsCents,feeKeptCents,broughtForwardCents"
      && allBefore.byProduct?.map((p) => p.product).join(",") === "MARKET,UPDOWN" && !("jackpot" in allBefore.main.tax)
      && allBefore.main.tax.segments.every((s) => !("jackpot" in s)),
    JSON.stringify({ keys: allBefore && Object.keys(allBefore.main.report1), parts: allBefore?.byProduct?.map((p) => p.product) }));
  ok("12.14c CONTROL — a Polls lock's drift sees nothing move under it when the weeks land", !!pollsBefore && !!pollsAfter && V.driftBetween(pollsBefore, pollsAfter).length === 0);

  // ── 12.15 · Polls + Up & Down + Millionea = All ────────────────────────────────────────────────────────────────
  ok("12.15 the All view stands Millionea beside Polls and Up & Down", all?.byProduct?.map((p) => p.product).join(",") === "MARKET,UPDOWN,MASWALI",
    JSON.stringify(all?.byProduct?.map((p) => p.product)));
  for (const k of ["salesCents", "payoutCents", "onHoldCents", "refundsCents", "feeKeptCents", "broughtForwardCents", "jackpotBroughtForwardCents", "floorTopUpCents", "carriedToJackpotCents"] as const) {
    eq(`12.15 Polls + Up & Down + Millionea = All · ${k}`, (all?.byProduct ?? []).reduce((t, p) => t + (p.report1[k] ?? 0), 0), all?.main.report1[k] ?? null);
  }
  eq("12.15b All: Sales 29,000 · Payout 1,751,215 · fee kept 260,780 — and balanced, with no exception",
    all ? [all.main.report1.salesCents, all.main.report1.payoutCents, all.main.report1.feeKeptCents, all.main.reconciliation.balanced, all.exceptionCount] : null,
    [29_000_00, 1_751_215_00, 260_780_00, true, 0]);

  // ── 12.16 · the Millionea view, line by line ───────────────────────────────────────────────────────────────────
  const r1 = mln?.main.report1;
  eq("12.16 the Millionea view: Sales 17,000 · Payout 1,739,995 · Refunds 3,000 · fee kept 260,000 · jackpot brought forward 1,293,000 · house floor top-up 696,000 · carried 3,005",
    r1 ? [r1.salesCents, r1.payoutCents, r1.refundsCents, r1.feeKeptCents, r1.onHoldCents, r1.broughtForwardCents, r1.jackpotBroughtForwardCents, r1.floorTopUpCents, r1.carriedToJackpotCents] : null,
    [17_000_00, 1_739_995_00, 3_000_00, 260_000_00, 0, 0, 1_293_000_00, 696_000_00, 3_005_00]);
  ok("12.16b ⭐ THE CHECK CLOSES with the three lines — a no-winner week, two paying weeks and a void (MB-65: without them it was out by every week's movements)",
    !!mln && mln.main.reconciliation.balanced && mln.exceptionCount === 0, JSON.stringify({ rec: mln?.main.reconciliation, x: mln?.exceptions.slice(0, 3) }));
  if (r1) {
    const plain = { salesCents: r1.salesCents, payoutCents: r1.payoutCents, onHoldCents: r1.onHoldCents, refundsCents: r1.refundsCents, feeKeptCents: r1.feeKeptCents, broughtForwardCents: r1.broughtForwardCents };
    eq("12.16c CONTROL — the same books read without the three lines are out by exactly them (1,293,000 + 696,000 − 3,005)",
      E.reconcile(plain).differenceCents, -(1_293_000_00 + 696_000_00 - 3_005_00));
  }
  eq("12.16d counts: 17 tickets placed, 8 payments, 3 refunds, 3 weeks resulted, none on hold",
    mln ? [mln.main.counts.betsPlaced, mln.main.counts.payoutRecords, mln.main.counts.refundRecords, mln.main.counts.roundsResulted, mln.main.counts.betsOnHold] : null, [17, 8, 3, 3, 0]);
  eq("12.16e the refunds keep their reasons: the free cancel a player exit (1 × 1,000), the void a cancelled round (2 × 2,000)",
    mln ? Object.fromEntries(mln.main.refundsByReason.map((r) => [r.code, [r.count, r.cents]])) : null,
    { ONE_SIDED_BET: [0, 0], ROUND_CANCELLED: [2, 2_000_00], PLAYER_EXIT: [1, 1_000_00], OTHER: [0, 0] });

  // ── 12.17–12.18 · Report 2: the booked fee ─────────────────────────────────────────────────────────────────────
  const t2 = mln?.main.tax;
  eq("12.17 ⭐ Report 2 files the fee the weeks' settlements BOOKED (2 × 130,000 on 2,000,000 of jackpots) — TRA 26,000 · GBT 13,000 · Total 39,000",
    t2 ? [t2.commission, t2.tra, t2.gbt, t2.total, t2.jackpot?.jackpotCents, t2.jackpot?.bookedFee, t2.jackpot?.feeRateBp, t2.jackpot?.weeks, t2.payoutCents] : null,
    [260_000, 26_000, 13_000, 39_000, 2_000_000_00, 260_000, 1300, 2, 0]);
  ok("12.17b CONTROL — 13% × the weeks' Payout would have filed 226,199 (0.87 of the booked fee, MASWALI-PLAN §5a.4); the report does not",
    E.taxOnPayout(1_739_995_00, E.APPROVED_RATES).commission === 226_199 && t2?.commission !== 226_199);
  const ta = all?.main.tax;
  eq("12.18 All products' Report 2: 13% × the Polls and Up & Down Payout (11,220 → 1,459) + the booked 260,000 = 261,459 · TRA 26,146 · GBT 13,073 · Total 39,219",
    ta ? [ta.payoutCents, ta.jackpot?.payoutCommission, ta.commission, ta.tra, ta.gbt, ta.total] : null, [11_220_00, 1_459, 261_459, 26_146, 13_073, 39_219]);
  eq("12.18b each product's own tax: Polls 1,216 / 183 · Up & Down 243 / 36 · Millionea 260,000 / 39,000",
    all?.byProduct?.map((p) => [p.product, p.tax.commission, p.tax.total]) ?? null, [["MARKET", 1_216, 183], ["UPDOWN", 243, 36], ["MASWALI", 260_000, 39_000]]);

  // ── 12.19 · a week that does not close is named ────────────────────────────────────────────────────────────────
  const tY0 = Date.now(); await sleep(5);
  // E · its booked fee is 130,001, one shilling off its own rate × J; its columns close on the booked figure.
  await plantWeek("E", "SETTLED", [{ status: "WIN", payout: 869_999 }, { status: "LOSS" }],
    { rolloverIn: 0, jackpot: 1_000_000, fee: 130_001, traLevy: 13_000, gbtLevy: 6_500, topUp: 998_000, winningTickets: 1, sharePerTicket: 869_999, paidTotal: 869_999, carryOut: 0, dustCarried: 0 });
  // F · its tickets resulted, but the week's own record is gone.
  await plantWeek("F", "SETTLED", [{ status: "LOSS" }], {}, { record: false });
  await sleep(5);
  const Y = await readM("12.19", tY0, Date.now() + 3_600_000, "MASWALI");
  eq("12.19 a week whose booked fee is not its own rate × J is named (+1), and a week whose record is missing (+1,000): Millionea RESULT_MISMATCHes",
    (Y?.exceptions ?? []).map((e) => [e.kind, e.product, e.contributionCents]).sort(), [["RESULT_MISMATCH", "MASWALI", 100], ["RESULT_MISMATCH", "MASWALI", 100_000]].sort());
  ok("12.19b …the exceptions explain every shilling (1,001), the missing record says so, and Report 2 still files the fee as booked (130,001)",
    !!Y && Y.explainedCents === Y.main.reconciliation.differenceCents && Y.main.reconciliation.differenceCents === 1_001_00
      && Y.exceptions.some((e) => /record is missing/.test(e.note)) && Y.main.tax.commission === 130_001,
    JSON.stringify({ d: Y?.main.reconciliation, x: Y?.exceptions.map((e) => e.note.slice(0, 60)), c: Y?.main.tax.commission }));
  // G · ⭐ round 2 — B's week to the shilling, but its settlement record lacks its fee: a fault in the record, named, and
  // never a booked fee of 0 filed in Report 2 (before, the week filed "fee booked 0" on its 1,000,000 jackpot, unflagged).
  const tG0 = Date.now(); await sleep(5);
  await plantWeek("G", "SETTLED", [{ status: "WIN", payout: 870_000 }, { status: "LOSS" }, { status: "LOSS" }, { status: "LOSS" }],
    { rolloverIn: 300_000, jackpot: 1_000_000, fee: null, traLevy: 13_000, gbtLevy: 6_500, topUp: 696_000, winningTickets: 1, sharePerTicket: 870_000, paidTotal: 870_000, carryOut: 0, dustCarried: 0 });
  await sleep(5);
  const G = await readM("12.19c", tG0, Date.now() + 3_600_000, "MASWALI");
  ok("12.19c ⛔ a settled paying week whose record lacks its fee is a RESULT_MISMATCH that names what the record lacks — and Report 2 files no booked fee of 0 for it",
    !!G && G.exceptions.length === 1 && G.exceptions[0].kind === "RESULT_MISMATCH" && G.exceptions[0].product === "MASWALI"
      && /^Week MLN-TX-G is settled, but its settlement record lacks its fee:/.test(G.exceptions[0].note) && G.main.tax.jackpot === undefined,
    JSON.stringify({ x: G?.exceptions.map((e) => [e.kind, e.note.slice(0, 90)]), jackpot: G?.main.tax.jackpot ?? null }));
  // H · ⭐ round 5 — B's week again, its booked levies null: this report prices its levies from the fee and never reads the
  // booked ones, so the week files whole (each reader asks only for what it reads); 12.19c is the control.
  const tH0 = Date.now(); await sleep(5);
  await plantWeek("H", "SETTLED", [{ status: "WIN", payout: 870_000 }, { status: "LOSS" }, { status: "LOSS" }, { status: "LOSS" }],
    { rolloverIn: 300_000, jackpot: 1_000_000, fee: 130_000, traLevy: null, gbtLevy: null, topUp: 696_000, winningTickets: 1, sharePerTicket: 870_000, paidTotal: 870_000, carryOut: 0, dustCarried: 0 });
  await sleep(5);
  const H = await readM("12.19d", tH0, Date.now() + 3_600_000, "MASWALI");
  ok("12.19d ⭐ R5 · a paying week whose booked levies are null still files whole here — no exception, the fee it booked filed (130,000) — since this report never reads them",
    !!H && H.exceptionCount === 0 && H.main.reconciliation.balanced && H.main.tax.jackpot?.bookedFee === 130_000 && H.main.tax.commission === 130_000,
    JSON.stringify({ x: H?.exceptions.map((e) => [e.kind, e.note.slice(0, 90)]), jackpot: H?.main.tax.jackpot ?? null }));

  // ── 12.20–12.22 · the fee mirror and the tax line, pure ────────────────────────────────────────────────────────
  const J13 = { feeModel: "jackpot-payout" as const, jackpotFeeRate: 0.13, commissionRate: 0.1, feeCeilingRate: 1 / 3 };
  const pdf = P.chargedFee({ yesPool: 300_000, noPool: 0, productLine: "MASWALI", week: { state: "SETTLED", jackpot: 1_050_000, winningTickets: 3 } }, J13);
  eq("12.20 chargedFee prices a week as its settlement did, round(13% × J): the PDF case J 1,050,000 → 136,500, 913,500 to share",
    [pdf.fee, pdf.netPool, pdf.refunded], [136_500, 913_500, false]);
  const k0 = P.chargedFee({ yesPool: 300_000, noPool: 0, productLine: "MASWALI", week: { state: "SETTLED", jackpot: null, winningTickets: 0 } }, J13);
  const vd = P.chargedFee({ yesPool: 2_000, noPool: 0, productLine: "MASWALI", week: { state: "VOIDED" } }, J13);
  ok("12.20b a no-winner week takes no fee and shares nothing; a voided week is a refund at no fee",
    k0.fee === 0 && !k0.refunded && k0.netPool === 0 && vd.fee === 0 && vd.refunded && vd.netPool === 2_000, JSON.stringify({ k0, vd }));
  const throws = (f: () => unknown) => { try { f(); return false; } catch { return true; } };
  ok("12.20c ⛔ a week that paid with no jackpot on record, a week priced under a pool model, and a week handed in without its settlement all THROW",
    throws(() => P.chargedFee({ yesPool: 1, noPool: 0, productLine: "MASWALI", week: { state: "SETTLED", jackpot: null, winningTickets: 1 } }, J13))
      && throws(() => P.chargedFee({ yesPool: 1, noPool: 0, productLine: "MASWALI", week: { state: "SETTLED", jackpot: 1_000_000, winningTickets: 1 } }, { commissionRate: 0.1, feeCeilingRate: 1 / 3 }))
      && throws(() => P.chargedFee({ yesPool: 1, noPool: 0, resolvedOutcome: "YES", productLine: "MASWALI" }, J13)));
  const LS = { feeModel: "loser-share" as const, platformFeeRate: 0.03, operatorFeeRate: 0.10, commissionRate: 0.1, feeCeilingRate: 1 / 3 };
  ok("12.20d CONTROL — a poll is priced exactly as before (settlement's own poolFee)",
    P.chargedFee({ yesPool: 20_000, noPool: 5_000, resolvedOutcome: "NO" }, LS).fee === P.poolFee(20_000, 5_000, LS, "NO").fee);
  eq("12.21 the Millionea pill's value round-trips: parseProduct reads MASWALI (any case); an unknown value is still All",
    [E.parseProduct("MASWALI"), E.parseProduct(" maswali "), E.parseProduct("JACKPOT"), E.parseProduct("UPDOWN")], ["MASWALI", "MASWALI", "ALL", "UPDOWN"]);
  eq("12.22 with no paying week the jackpot-aware tax IS taxOnPayout — the same lines, no Millionea part",
    E.taxOnPayoutAndJackpot(570_000_00, null, E.APPROVED_RATES), E.taxOnPayout(570_000_00, E.APPROVED_RATES));
  const tj = E.taxOnPayoutAndJackpot(0, { jackpotCents: 1_000_000_00, bookedFee: 130_000, feeRateBp: 1300, weeks: 1 }, E.APPROVED_RATES);
  eq("12.22b the floor week of §5a.4: the booked 130,000 → TRA 13,000 · GBT 6,500, where 13% × its Payout of 870,000 would file 113,100",
    [tj.commission, tj.tra, tj.gbt, E.taxOnPayout(870_000_00, E.APPROVED_RATES).commission], [130_000, 13_000, 6_500, 113_100]);

  // ── 12.23–12.28 · the page's rows, the files, the drift ───────────────────────────────────────────────────────
  const mr1 = mln ? D.report1Rows(mln.main) : [];
  eq("12.23 Report 1 prints Millionea's three items after the two every period needs, then the widened check",
    mr1.map((r) => r.line), ["Sales", "Payout", "On hold", "Refunds", "Platform fee kept", "Less: on hold brought forward", "Less: jackpot brought forward",
      "Less: house floor top-up", "Carried to the jackpot", "Check: accounted total", "Difference from Sales (must be 0)"]);
  eq("12.23b …with the reader's amounts: the check equals Sales", mr1.map((r) => r.cents),
    [17_000_00, 1_739_995_00, 0, 3_000_00, 260_000_00, 0, -1_293_000_00, -696_000_00, 3_005_00, 17_000_00, 0]);
  const pr1 = pollsAfter ? D.report1Rows(pollsAfter.main) : [];
  ok("12.23c CONTROL — a Polls view prints the plan's eight lines and the check exactly as before",
    pr1.map((r) => r.line).join("|") === "Sales|Payout|On hold|Refunds|Platform fee kept|Less: on hold brought forward|Check: accounted total|Difference from Sales (must be 0)"
      && pr1[6]?.basis === "Payout + On hold + Refunds + Platform fee kept − on hold brought forward", pr1.map((r) => r.line).join("|"));
  const mr2 = mln ? D.report2Rows(mln.main) : [];
  eq("12.24 Report 2 on the Millionea view: its jackpots and the fee they booked, then the levies on it",
    mr2.map((r) => [r.line, r.amount]), [["Sales less refunds", 14_000_00], ["Jackpot paid (taxable reference)", 2_000_000_00], ["Commission", 260_000],
      ["TRA tax", 26_000], ["GBT levy", 13_000], ["Total Tax payable", 39_000], ["Net commission revenue", 221_000]]);
  ok("12.24b …the Commission's basis is the weeks' own frozen rate on the jackpot, never the report's rate on Payout", mr2[2]?.basis === "13% × Jackpot, booked at payout", mr2[2]?.basis);
  const ar2 = all ? D.report2Rows(all.main) : [];
  eq("12.25 Report 2 on All products: Commission on the Polls and Up & Down Payout, the jackpots and the fee booked, then their sum",
    ar2.map((r) => [r.line, r.amount]),
    [["Sales less refunds", 26_000_00], ["Payout (taxable reference)", 11_220_00], ["Commission on Payout", 1_459], ["Millionea jackpot paid", 2_000_000_00],
      ["Millionea fee booked", 260_000], ["Commission", 261_459], ["TRA tax", 26_146], ["GBT levy", 13_073], ["Total Tax payable", 39_219], ["Net commission revenue", 222_240]]);
  ok("12.25b CONTROL — a Polls view's Report 2 is the plan's lines exactly as before",
    pollsAfter !== null && D.report2Rows(pollsAfter.main).map((r) => r.line).join("|") === "Sales less refunds|Payout (taxable reference)|Commission|TRA tax|GBT levy|Total Tax payable|Net commission revenue");
  const mdoc = mln ? D.buildTaxDocument(mln, gen) : null;
  const pdoc = pollsAfter ? D.buildTaxDocument(pollsAfter, gen) : null;
  ok("12.26 the documents state the Millionea treatment where they hold a week, with the weeks' own 13% — and a Polls document does not",
    !!mdoc && !!pdoc && (mdoc.notes ?? []).some((n) => n.startsWith("Millionea is taxed on the fee its settlement booked — 13% of each paying week's jackpot"))
      && !(pdoc.notes ?? []).some((n) => n.includes("Millionea")));
  const acsv = all ? D.buildTaxCsv(all, { generatorName: "Test Officer", generatedAtMs: FAR, lock: null, reference: "TAX-TEST" }) : "";
  ok("12.26b the CSV's By product carries Millionea's column and its three lines as plain numbers (Polls at 0)",
    acsv.includes('"By product — Millionea","Carried to the jackpot","",3005,""') && acsv.includes('"By product — Polls","Carried to the jackpot","",0,""')
      && acsv.includes('"Report 1 — Total Reporting System","Less: jackpot brought forward",'),
    acsv.split(String.fromCharCode(10)).filter((l) => l.includes("jackpot")).slice(0, 4).join(" | "));
  const adoc = all ? D.buildTaxDocument(all, gen) : null;
  const over = mdoc && adoc ? [...findPdfOverflows(mdoc), ...findPdfOverflows(adoc)] : null;
  ok("12.27 the Millionea view's PDF and the four products' PDF fit every box (the new lines, the fourth By product column)",
    over !== null && over.length === 0, JSON.stringify(over?.slice(0, 4)));
  if (mln) {
    const moved = { ...mln, main: { ...mln.main, report1: { ...mln.main.report1, carriedToJackpotCents: (mln.main.report1.carriedToJackpotCents ?? 0) + 100 } } };
    ok("12.28 a locked Millionea view names a moved reconciling line in its drift (Carried to the jackpot 3,005 → 3,006)",
      V.driftBetween(mln, moved).some((x) => x.line === "Carried to the jackpot" && x.locked === 3_005_00 && x.live === 3_006_00));
  } else ok("12.28 (fixture) the Millionea view was read", false);
  // ── 12.29 · the Millionea pill follows the PERIOD: offered where the period holds a week, never on one that holds none ──
  const pv = await V.loadTaxReportView({ period: custom(tM0, tEnd), product: "MARKET", nowMs: FAR });
  const pa = await V.loadTaxReportView({ period: custom(tA0, tCut), product: "ALL", nowMs: FAR });
  ok("12.29 the Millionea pill is offered on a period that holds a week — on its Polls view too", pv.ok && pv.view.millionea === true, pv.ok ? "" : pv.error);
  ok("12.29b CONTROL — a period that holds no week offers no Millionea pill, whatever other periods hold, so its page is as it was",
    pa.ok && pa.view.millionea === false, pa.ok ? "" : pa.error);
}

/* ═══ §13 · LOCKS, DRIFT AND THE DOCUMENTS ════════════════════════════════════════════════════════ */
console.log("§13 · a lock freezes the filed figures; the documents print the same numbers");
{
  const L = (await load("src/lib/server/tax-locks.ts")) as typeof import("../src/lib/server/tax-locks.ts");
  const V = (await load("src/lib/server/tax-report-view.ts")) as typeof import("../src/lib/server/tax-report-view.ts");
  const D = (await load("src/lib/server/tax-report-doc.ts")) as typeof import("../src/lib/server/tax-report-doc.ts");
  L.__resetTaxLocksForTest();
  const snap = A;
  ok("13.1 the snapshot hash survives a JSON round trip with its keys reordered", L.snapshotHash(snap) === L.snapshotHash(JSON.parse(JSON.stringify(snap))) && L.canonicalJson({ b: 1, a: [2, { d: 3, c: 4 }] }) === L.canonicalJson({ a: [2, { c: 4, d: 3 }], b: 1 }));
  const lockArgs = { periodKind: "month" as const, periodKey: "2026-09", product: "ALL" as const, periodStartMs: snap.period.startMs, periodEndMs: snap.period.endMs, snapshot: snap, balanced: true, lockedBy: "tx_officer_a", note: null, exceptionsAcknowledged: null };
  const first = await L.insertLock(lockArgs);
  const second = await L.insertLock(lockArgs);
  ok("13.2 one live lock per period and product: the second is refused", first.ok && !second.ok && second.code === "ALREADY_LOCKED");
  const rel = first.ok ? await L.releaseLock(first.lock.id, "tx_officer_a", "Reopened for the test") : { ok: false as const };
  const relAgain = first.ok ? await L.releaseLock(first.lock.id, "tx_officer_a", "again") : { ok: true as const };
  ok("13.3 releasing keeps the row and cannot happen twice", rel.ok && !relAgain.ok);
  const relock = await L.insertLock(lockArgs);
  const hist = await L.locksForPeriod("month", "2026-09", "ALL");
  ok("13.4 a re-lock is a NEW row; the history keeps both, newest first", relock.ok && hist.length === 2 && hist[0].unlockedAtMs === null && hist[1].unlockedAtMs !== null);

  // The view: a locked period prints its snapshot, and names what moved in the live books since.
  const sep = E.monthPeriod("2026-09")!;
  const viewLock = await L.insertLock({ ...lockArgs, periodKey: "2026-08", snapshot: { ...snap, period: E.monthPeriod("2026-08")! } });
  const view = await V.loadTaxReportView({ period: E.monthPeriod("2026-08")!, product: "ALL", nowMs: FAR });
  ok("13.5 a locked period shows its locked snapshot, not the live books", view.ok && view.view.lock?.id === (viewLock.ok ? viewLock.lock.id : "") && view.view.data.main.report1.salesCents === snap.main.report1.salesCents);
  ok("13.6 …and names every line where the live books now differ (August has no live bets here)", view.ok && view.view.drift.some((d) => d.line === "Sales" && d.locked === snap.main.report1.salesCents && d.live === 0));
  const drift = V.driftBetween(snap, snap);
  eq("13.7 control — identical books drift on nothing", drift.length, 0);
  void sep;

  // The documents: the PDF/workbook `Report` and the CSV print the reader's numbers, exactly.
  const doc = D.buildTaxDocument(A, { generatorId: "usr_tx_gen", generatorName: "Test Officer", generatedAtMs: FAR, lock: null });
  const r1 = doc.sections.find((s) => s.title === "Report 1 — Total Reporting System");
  const r2 = doc.sections.find((s) => s.title === "Report 2 — Taxation");
  ok("13.8 the document carries both reports under the plan's names", !!r1 && !!r2);
  eq("13.9 Report 1's lines in the plan's order, then the reconciling items and the check", r1?.rows.map((r) => r.line), ["Sales", "Payout", "On hold", "Refunds", "Platform fee kept", "Less: on hold brought forward", "Check: accounted total", "Difference from Sales (must be 0)"]);
  eq("13.10 Report 1's amounts are the reader's, in shillings", r1?.rows.map((r) => r.amount), [49_000, 20_570, 10_000, 17_000, 1_430, 0, 49_000, 0]);
  ok('13.10b nothing brought forward prints 0, never "-0"', Object.is(r1?.rows.find((r) => r.line === "Less: on hold brought forward")?.amount, 0));
  // Framed by Finance's two filing lines (§15): Sales less refunds 49,000 − 17,000 with its 12 − 5 tickets (§9.12), and
  // Net commission revenue 2,674 − 401.
  eq("13.11 Report 2's lines and amounts", r2?.rows.map((r) => [r.line, r.basis, r.amount]), [["Sales less refunds · 7 tickets", "Sales − Refunds", 32_000], ["Payout (taxable reference)", "From Report 1", 20_570], ["Commission", "13% × Payout", 2_674], ["TRA tax", "10% × Commission", 267], ["GBT levy", "5% × Commission", 134], ["Total Tax payable", "TRA + GBT", 401], ["Net commission revenue", "Commission − Total Tax", 2_273]]);
  ok("13.12 a custom window is never filing-grade: Internal, no signature block", doc.meta.classification === "Internal" && doc.signatures === undefined, `${doc.meta.classification} · signatures ${doc.signatures?.length ?? 0}`);
  const monthDoc = D.buildTaxDocument({ ...A, period: E.monthPeriod("2026-09")! }, { generatorId: "usr_tx_gen", generatorName: "Test Officer", generatedAtMs: FAR, lock: null });
  ok("13.12b a finished, balanced month IS filing-grade: a regulator hand-off with the three-role attestation", monthDoc.meta.classification === "Regulator hand-off" && monthDoc.signatures?.length === 3 && monthDoc.signatures[0].name === "Test Officer");
  const partialDoc = D.buildTaxDocument({ ...A, period: E.monthPeriod("2026-09")!, inProgress: true }, { generatorId: "usr_tx_gen", generatorName: "Test Officer", generatedAtMs: FAR, lock: null });
  ok("13.12c a period in progress says PARTIAL in its title, is Internal and carries no signatures", /PARTIAL/.test(partialDoc.title) && partialDoc.meta.classification === "Internal" && partialDoc.signatures === undefined, partialDoc.title);
  ok("13.12d a custom window's title says it is not a filing period", doc.title.includes("CUSTOM WINDOW (not a filing period)"), doc.title);
  const sepP = E.monthPeriod("2026-09")!;
  const settling = D.buildTaxDocument({ ...A, period: sepP, generatedAtMs: sepP.endMs + 60_000 }, { generatorId: "usr_tx_gen", generatorName: "Test Officer", generatedAtMs: sepP.endMs + 60_000, lock: null });
  ok("13.12e a month read a minute after it closed is still SETTLING: Internal, unsigned, titled so", settling.title.includes("SETTLING") && settling.meta.classification === "Internal" && settling.signatures === undefined, settling.title);
  const settled = D.buildTaxDocument({ ...A, period: sepP, generatedAtMs: sepP.endMs + E.LOCK_GRACE_MS + 1 }, { generatorId: "usr_tx_gen", generatorName: "Test Officer", generatedAtMs: sepP.endMs + E.LOCK_GRACE_MS + 1, lock: null });
  ok("13.12f …and once the lock grace has passed it is the filing copy", !settled.title.includes("SETTLING") && settled.meta.classification === "Regulator hand-off", settled.title);
  ok("13.12g (fixture) section 12 left a single-product view whose whole book is out", wholeOutView !== null);
  if (wholeOutView) {
    const wb = D.buildTaxDocument({ ...wholeOutView, period: sepP }, { generatorId: "usr_tx_gen", generatorName: "Test Officer", generatedAtMs: FAR, lock: null });
    ok("13.12h one product cannot file around the whole book: WHOLE BOOK OUT OF BALANCE, Internal, unsigned", wb.title.includes("WHOLE BOOK OUT OF BALANCE") && wb.meta.classification === "Internal" && wb.signatures === undefined, wb.title);
  }
  const csv = D.buildTaxCsv(A, { generatorName: "Test Officer", generatedAtMs: FAR, lock: null, reference: "TAX-TEST" });
  ok("13.13 the CSV starts with a BOM and its header row", csv.charCodeAt(0) === 0xfeff && csv.slice(1).startsWith('"Section","Line","Basis / rate","Amount (TZS)","Count"'));
  ok("13.14 the CSV writes Sales as a plain number, not quoted text", /"Report 1 — Total Reporting System","Sales","[^"]*",49000,/.test(csv), csv.split("\r\n").find((l) => l.includes(",\"Sales\",")) ?? "no Sales row");
  ok("13.15 …and the Total Tax payable line with its whole-shilling amount", /"Report 2 — Taxation","Total Tax payable","TRA \+ GBT",401,/.test(csv));
  const { renderPdf } = (await load("src/lib/server/reports/pdf.ts")) as typeof import("../src/lib/server/reports/pdf.ts");
  const { renderXlsx } = (await load("src/lib/server/reports/xlsx.ts")) as typeof import("../src/lib/server/reports/xlsx.ts");
  const pdf = await renderPdf(doc);
  const xlsx = await renderXlsx(doc);
  ok("13.16 the PDF renders (%PDF-)", pdf.subarray(0, 5).toString("latin1") === "%PDF-", `${pdf.length} bytes`);
  ok("13.17 the workbook renders (a zip: PK)", xlsx.subarray(0, 2).toString("latin1") === "PK", `${xlsx.length} bytes`);
  eq("13.18 the file name carries the period type, the period and the product", D.documentFilename({ ...A, period: E.monthPeriod("2026-09")!, product: "UPDOWN" }, "pdf"), "50pick-government-tax-report-month-2026-09-up-down.pdf");
  // A week and the day of its Monday share the key "2026-09-14" — the kind keeps their files and references apart.
  const wk = { ...A, period: E.weekPeriod("2026-09-14")! }, dy = { ...A, period: E.dayPeriod("2026-09-14")! };
  ok("13.19 the week of 14 Sep and the day 14 Sep get different file names and references",
    D.documentFilename(wk, "pdf") !== D.documentFilename(dy, "pdf") && D.documentReference(wk, "usr_x") !== D.documentReference(dy, "usr_x"),
    `${D.documentFilename(wk, "pdf")} · ${D.documentFilename(dy, "pdf")}`);
  const moved = D.buildTaxCsv({ ...A, period: sepP }, { generatorName: "Test Officer", generatedAtMs: FAR, lock: null, reference: "TAX-TEST", drift: [{ line: "Sales", locked: 49_000_00, live: 50_000_00, unit: "cents" }, { line: "Total Tax payable", locked: 401, live: 410, unit: "tzs" }] });
  ok("13.20 a locked CSV whose books moved names each moved line, the live figure as a number",
    moved.includes('"Moved since the lock","Sales","Locked 49,000 → live now",50000,') && moved.includes('"Moved since the lock","Total Tax payable","Locked 401 → live now",410,'),
    moved.split(String.fromCharCode(10)).filter((l) => l.startsWith('"Moved')).join(" | ") || "no drift rows");
  ok("13.21 control — no drift, no such rows", !csv.includes("Moved since the lock"));

  // ⛔ THE OWNER LOCKS ONE PRODUCT WHILE THE WHOLE BOOK IS OUT: a filing, and it SAYS SO — the difference and the reason.
  if (wholeOutView) {
    const ackLock = await L.insertLock({ periodKind: "month", periodKey: "2026-07", product: "UPDOWN", periodStartMs: E.monthPeriod("2026-07")!.startMs, periodEndMs: E.monthPeriod("2026-07")!.endMs,
      snapshot: { ...wholeOutView, period: E.monthPeriod("2026-07")! }, balanced: true, lockedBy: "tx_officer_a", note: null, exceptionsAcknowledged: "Orphan payout under investigation, filed with it noted" });
    if (ackLock.ok) {
      const snapA = ackLock.lock.snapshot;
      const ackDoc = D.buildTaxDocument(snapA, { generatorId: "usr_tx_gen", generatorName: "Test Officer", generatedAtMs: FAR, lock: ackLock.lock });
      const ackCsv = D.buildTaxCsv(snapA, { generatorName: "Test Officer", generatedAtMs: FAR, lock: ackLock.lock, reference: "TAX-TEST" });
      const first = ackDoc.notes?.[0] ?? "";
      ok("13.12i an acknowledged whole-book lock is a filing that PRINTS the whole-book difference and the Owner's reason, first",
        ackDoc.title.includes("EXCEPTIONS ACKNOWLEDGED") && ackDoc.meta.classification === "Regulator hand-off" && ackDoc.signatures?.length === 3 && first.includes("OUT OF BALANCE by TZS") && first.includes("20,999") && first.includes("Orphan payout under investigation"), first);
      ok("13.12j …and its CSV carries the same line as the Status row", ackCsv.includes('"Document","Status","Locked while the whole book') && ackCsv.includes("Orphan payout under investigation"));
    } else ok("13.12i (fixture) the acknowledged lock was recorded", false, JSON.stringify(ackLock));
  }
  if (outAllView) {
    const jun = E.monthPeriod("2026-06")!;
    const pk = await L.insertLock({ periodKind: "month", periodKey: "2026-06", product: "ALL", periodStartMs: jun.startMs, periodEndMs: jun.endMs,
      snapshot: { ...outAllView, period: jun }, balanced: false, lockedBy: "tx_officer_a", note: null, exceptionsAcknowledged: "Planted defects for the test, filed with them noted" });
    if (pk.ok) {
      const pd = D.buildTaxDocument(pk.lock.snapshot, { generatorId: "usr_tx_gen", generatorName: "Test Officer", generatedAtMs: FAR, lock: pk.lock });
      const n0 = pd.notes?.[0] ?? "";
      ok("13.12k a lock acknowledged on its own difference is a filing TITLED 'EXCEPTIONS ACKNOWLEDGED', its first note the difference and the reason",
        pd.title.includes("EXCEPTIONS ACKNOWLEDGED") && pd.meta.classification === "Regulator hand-off" && n0.includes("20,999") && n0.includes("Planted defects for the test"), `${pd.title} | ${n0}`);
    } else ok("13.12k (fixture) the acknowledged lock was recorded", false, JSON.stringify(pk));
  }

  // ⭐ WHAT WAS SHOWN IS WHAT IS LOCKED: the fingerprint ignores only the moment of reading, and sees every figure.
  const fp = L.seenFingerprint(A);
  ok("13.23 the lock fingerprint is the same for two reads of unchanged books (only the moment of reading differs)", fp === L.seenFingerprint({ ...A, generatedAtMs: A.generatedAtMs + 60_000 }));
  const reread = await buildTaxReportData({ period: A.period, product: "ALL", nowMs: FAR + 5_000 });
  ok("13.23b …and for two INDEPENDENT reads of the same books (every list in a total order — what the lock action relies on)",
    reread.ok && L.seenFingerprint(reread.data) === fp, reread.ok ? `${L.seenFingerprint(reread.data).slice(0, 12)} vs ${fp.slice(0, 12)}` : reread.error);
  const resplit = { ...A, main: { ...A.main, tax: { ...A.main.tax, tra: A.main.tax.tra + 1, gbt: A.main.tax.gbt - 1 } } };
  ok("13.24 …and differs when TRA and GBT re-split with the same total (the case eight figures could not see)", fp !== L.seenFingerprint(resplit) && resplit.main.tax.tra + resplit.main.tax.gbt === A.main.tax.tra + A.main.tax.gbt);
  ok("13.25 …and when only the whole book behind a product moves", wholeOutView !== null && L.seenFingerprint(wholeOutView) !== L.seenFingerprint({ ...wholeOutView, wholeBook: { differenceCents: -1, balanced: false } }));

  // The window printed for a running period is the window the figures cover: the cut-off, never "now".
  const runCut = sepP.startMs + 5 * 86_400_000;
  const runLine = D.windowStatement({ ...A, period: sepP, inProgress: true, cutoffMs: runCut });
  ok("13.26 a running period's window ends at the reader's cut-off and says the period is in progress", runLine.includes(E.eatDateTimeLabel(runCut)) && runLine.includes("(period in progress)") && !runLine.includes("(now)"), runLine);

  // ⭐ THE PRINTED PAGE, MEASURED: ten-digit figures, a five-digit refund count per reason, a 28-character record id and a
  // two-decimal rate, laid out by the real renderer's fonts and widths — nothing may be split mid-token.
  const { findPdfOverflows, pdfFontsLoaded } = (await load("src/lib/server/reports/pdf.ts")) as typeof import("../src/lib/server/reports/pdf.ts");
  const BIG = 9_999_999_999_00;
  const bigFig = (x: typeof A.main) => ({
    ...x,
    report1: { ...x.report1, salesCents: BIG, payoutCents: BIG, onHoldCents: BIG, refundsCents: BIG, feeKeptCents: BIG, broughtForwardCents: BIG },
    reconciliation: { ...x.reconciliation, differenceCents: -BIG, balanced: false },
    tax: { ...x.tax, commission: 9_999_999_999, tra: 9_999_999_999, gbt: 9_999_999_999, total: 9_999_999_999,
      segments: x.tax.segments.map((sg) => ({ ...sg, payoutCents: BIG, commission: 9_999_999_999, tra: 9_999_999_999, gbt: 9_999_999_999 })) },
    refundsByReason: x.refundsByReason.map((r) => ({ ...r, count: 99_999, cents: BIG })),
  });
  const huge = {
    ...A,
    period: sepP,
    main: bigFig(A.main),
    byProduct: (A.byProduct ?? []).map(bigFig),
    rateVersions: A.rateVersions.map((v) => ({ ...v, rates: { commissionBp: 9_999, traBp: 1_025, gbtBp: 1_025 } })),
    exceptions: [{ ...(X0 ?? { kind: "PAYOUT_WITHOUT_RESULT", roundId: null, product: null, expectedCents: 0, recordedCents: 0, note: "planted" }), ref: "txn_0123456789abcdef01234567", contributionCents: -BIG } as (typeof A.exceptions)[number]],
    exceptionCount: 1,
    explainedCents: -BIG,
  };
  const hugeDoc = D.buildTaxDocument(huge, { generatorId: "usr_tx_gen", generatorName: "Test Officer", generatedAtMs: FAR, lock: null });
  const over = findPdfOverflows(hugeDoc);
  // To LOOK at what was measured: TAX_PDF_OUT=<dir> writes the measured documents (a balanced month and the ten-digit one).
  if (process.env.TAX_PDF_OUT) {
    mkdirSync(process.env.TAX_PDF_OUT, { recursive: true });
    writeFileSync(join(process.env.TAX_PDF_OUT, "tax-month.pdf"), await renderPdf(monthDoc));
    writeFileSync(join(process.env.TAX_PDF_OUT, "tax-ten-digit.pdf"), await renderPdf(hugeDoc));
    writeFileSync(join(process.env.TAX_PDF_OUT, "tax-month.xlsx"), await renderXlsx(monthDoc));
    writeFileSync(join(process.env.TAX_PDF_OUT, "tax-ten-digit.xlsx"), await renderXlsx(hugeDoc));
  }
  const fonts = pdfFontsLoaded();
  ok(`13.27 ten-digit figures fit every PDF box: KPI tiles, every column, the totals band (measured on ${fonts.inter ? "Inter" : "the Helvetica fallback"} + ${fonts.mono ? "JetBrains Mono" : "the Courier fallback"})`,
    over.length === 0 && hugeDoc.sections.some((x) => x.title.startsWith("Exceptions")), JSON.stringify(over.slice(0, 6)));
  const narrow = { ...hugeDoc, summaryColumns: 4 as const, sections: hugeDoc.sections.map((x) => x.title.startsWith("Report 1") ? { ...x, columns: x.columns.map((c) => c.key === "amount" ? { ...c, width: 18 } : c) } : x) };
  const overNarrow = findPdfOverflows(narrow);
  ok("13.28 CONTROL — the old layout (four tiles across, an 18-wide Amount) is caught splitting the same figures",
    overNarrow.some((o) => o.where.startsWith("Report 1") && o.text.includes("9,999,999,99")) && overNarrow.some((o) => o.where.startsWith("summary")), JSON.stringify(overNarrow.slice(0, 4)));
  const ExcelJS = (await import("exceljs")).default;
  const wbk = new ExcelJS.Workbook();
  await wbk.xlsx.load(await renderXlsx(hugeDoc));
  ok("13.29 the workbook's tab is the title's head — 'Government Tax Report' — never the title cut mid-phrase at Excel's 31 characters",
    hugeDoc.title.length > 31 && wbk.worksheets[0]?.name === "Government Tax Report", `${hugeDoc.title} → ${wbk.worksheets[0]?.name}`);
}

/* ═══ §14 · DAY BY DAY ════════════════════════════════════════════════════════════════════════════ */
console.log("§14 · day by day: each day is its own report, and the days add up to the period");
{
  const D = (await load("src/lib/server/tax-report-doc.ts")) as typeof import("../src/lib/server/tax-report-doc.ts");
  const L = (await load("src/lib/server/tax-locks.ts")) as typeof import("../src/lib/server/tax-locks.ts");
  const { findPdfOverflows } = (await load("src/lib/server/reports/pdf.ts")) as typeof import("../src/lib/server/reports/pdf.ts");
  const at = (day: string, hhmm: string) => E.parseEatLocal(`${day}T${hhmm}`)!;
  const iso = (ms: number) => new Date(ms).toISOString();
  const gen = { generatorId: "usr_tx_gen", generatorName: "Test Officer", generatedAtMs: FAR };

  // ── The edges, pure ──────────────────────────────────────────────────────────────────────────
  const sepP = E.monthPeriod("2026-09")!;
  const sepEdges = E.dayEdges(sepP.startMs, sepP.endMs);
  ok("14.1 September cuts into its 30 EAT days, every inner edge at 00:00 EAT",
    sepEdges.length === 31 && sepEdges.every((t) => E.toEatLocal(t).endsWith("T00:00")) && sepEdges[1] - sepEdges[0] === 86_400_000,
    `${sepEdges.length} edges`);
  eq("14.2 a window from 08:00 to 18:00 two days later keeps its part-days: 08:00 → 00:00 → 00:00 → 18:00",
    E.dayEdges(at("2026-09-20", "08:00"), at("2026-09-22", "18:00")).map(E.toEatLocal),
    ["2026-09-20T08:00", "2026-09-21T00:00", "2026-09-22T00:00", "2026-09-22T18:00"]);
  eq("14.3 a window inside one day is one slice; an empty one is none",
    [E.dayEdges(at("2026-09-20", "08:00"), at("2026-09-20", "18:00")).length, E.dayEdges(at("2026-09-20", "08:00"), at("2026-09-20", "08:00")).length], [2, 1]);
  const whole = E.daySlice(at("2026-09-20", "00:00"), sepP.endMs);
  ok("14.4 a whole day opens as that DAY", whole.hours === null && whole.period.kind === "day" && whole.period.key === "2026-09-20" && whole.label === "Sun 20 Sep 2026" && whole.short === "Sun 20 Sep", JSON.stringify(whole));
  const head = E.daySlice(at("2026-09-20", "08:00"), at("2026-09-22", "18:00"));
  const tail = E.daySlice(at("2026-09-22", "00:00"), at("2026-09-22", "18:00"));
  ok("14.5 a part-day reads 'from 08:00' / 'to 18:00' and opens as the custom window of exactly those hours",
    head.hours === "from 08:00" && head.period.kind === "custom" && head.period.key === "2026-09-20T08:00~2026-09-21T00:00"
      && tail.hours === "to 18:00" && tail.period.key === "2026-09-22T00:00~2026-09-22T18:00",
    JSON.stringify([head.hours, head.period.key, tail.hours, tail.period.key]));

  // ── Real books on 20–22 Sep 2026: placed and settled by the real services, then stamped onto their days ────────
  /** Move a market's bets and their money records onto chosen instants — the stake records to `placedAt`, the
   *  settlement's records to `settledAt` — exactly as the services would have stamped them then. */
  async function stamp(marketId: string, placedAt: number, settledAt: number | null) {
    const ids = new Set<string>();
    for (const p of await svc.listPositionsForMarket(marketId)) {
      ids.add(p.id);
      const cur = (await positionStore.get(p.id))!;
      await positionStore.set({ ...cur, placedAt: iso(placedAt), settledAt: cur.settledAt && settledAt !== null ? iso(settledAt) : cur.settledAt } as never);
    }
    for (const t of await db.txn.listAll()) {
      if (t.positionId && ids.has(t.positionId)) await db.txn.update(t.id, { createdAt: iso(t.type === "BET_PLACED" ? placedAt : settledAt!) });
    }
  }
  const updown = async (id: string) => { const m = await marketStore.get(id); await marketStore.set({ ...m!, productLine: "UPDOWN" } as never); };
  const ma = await market("days-two-sided");        // YES 5,000 v NO 5,000 → YES paid 9,350, fee 650
  await bet("ma", ma.id, "YES", 5_000); await bet("ma", ma.id, "NO", 5_000);
  await resolveAndSettle(ma.id, "YES");
  await stamp(ma.id, at("2026-09-20", "10:00"), at("2026-09-21", "09:00"));
  const mb = await market("days-one-sided");        // YES 4,000 alone → refunded
  await bet("mb", mb.id, "YES", 4_000);
  await resolveAndSettle(mb.id, "YES");
  await stamp(mb.id, at("2026-09-21", "11:00"), at("2026-09-21", "15:00"));
  const mc = await market("days-midnight");         // Up & Down, placed 23:59 and settled 00:01: NO paid 1,870, fee 130
  await bet("mc", mc.id, "YES", 1_000); await bet("mc", mc.id, "NO", 1_000);
  await updown(mc.id);
  await resolveAndSettle(mc.id, "NO");
  await stamp(mc.id, at("2026-09-20", "23:59"), at("2026-09-21", "00:01"));
  const md = await market("days-open");              // YES 3,000, never settled — on hold through every day
  await bet("md", md.id, "YES", 3_000);
  await stamp(md.id, at("2026-09-20", "12:00"), null);
  const mf = await market("days-early");             // YES 1,000 at 07:00, never settled — brought forward into an 08:00 window
  await bet("mf", mf.id, "YES", 1_000);
  await stamp(mf.id, at("2026-09-20", "07:00"), null);
  const me = await market("days-stroke");            // Up & Down placed ON THE STROKE of Tuesday's midnight: YES paid 3,740, fee 260
  await bet("me", me.id, "YES", 2_000); await bet("me", me.id, "NO", 2_000);
  await updown(me.id);
  await resolveAndSettle(me.id, "YES");
  await stamp(me.id, at("2026-09-22", "00:00"), at("2026-09-22", "10:05"));

  const w0 = at("2026-09-20", "00:00"), w3 = at("2026-09-23", "00:00");
  const W = await read(w0, w3);
  const days = W.byDay ?? [];
  type Day = (typeof days)[number];
  const r1 = (x: Day["report1"]) => [x.salesCents, x.payoutCents, x.onHoldCents, x.refundsCents, x.feeKeptCents, x.broughtForwardCents].map((c) => c / 100);
  eq("14.6 three days, oldest first", days.map((x) => x.dayKey), ["2026-09-20", "2026-09-21", "2026-09-22"]);
  // Sales · Payout · On hold · Refunds · fee kept · brought forward
  eq("14.7 Sun 20: Sales 16,000 · nothing paid · all 16,000 on hold at midnight", days[0] ? r1(days[0].report1) : null, [16_000, 0, 16_000, 0, 0, 0]);
  eq("14.8 Mon 21: Sales 4,000 · Payout 9,350 + 1,870 · On hold 4,000 · Refund 4,000 · fee 780 · 16,000 brought forward", days[1] ? r1(days[1].report1) : null, [4_000, 11_220, 4_000, 4_000, 780, 16_000]);
  eq("14.9 Tue 22: a bet placed on the stroke of midnight is Tuesday's — Sales 4,000 · Payout 3,740 · fee 260 · 4,000 held throughout", days[2] ? r1(days[2].report1) : null, [4_000, 3_740, 4_000, 0, 260, 4_000]);
  ok("14.10 every day balances on its own", days.length === 3 && days.every((x) => x.balanced && x.differenceCents === 0), JSON.stringify(days.map((x) => x.differenceCents)));
  eq("14.11 each day is taxed on its own Payout: Mon 1,459 · 146 · 73 = 219 · Tue 486 · 49 · 24 = 73",
    days.map((x) => [x.tax.commission, x.tax.tra, x.tax.gbt, x.tax.total]), [[0, 0, 0, 0], [1_459, 146, 73, 219], [486, 49, 24, 73]]);
  const sum = (get: (x: Day) => number) => days.reduce((t, x) => t + get(x), 0);
  eq("14.12 the days' flows add up to the period's exactly (Sales · Payout · Refunds · fee kept)",
    [sum((x) => x.report1.salesCents), sum((x) => x.report1.payoutCents), sum((x) => x.report1.refundsCents), sum((x) => x.report1.feeKeptCents)],
    [W.main.report1.salesCents, W.main.report1.payoutCents, W.main.report1.refundsCents, W.main.report1.feeKeptCents]);
  ok("14.13 On hold is a balance: each day closes on what the next opens with; the first opens with the period, the last closes with it",
    days.length === 3 && days.every((x, i) => i === 0 || days[i - 1].report1.onHoldCents === x.report1.broughtForwardCents)
      && days[0].report1.broughtForwardCents === W.main.report1.broughtForwardCents && days[2].report1.onHoldCents === W.main.report1.onHoldCents);
  eq("14.14 the period: Sales 24,000 · Payout 14,960 · On hold 4,000 · Refunds 4,000 · fee 1,040 · nothing brought forward — balanced",
    [...r1(W.main.report1), W.main.reconciliation.balanced], [24_000, 14_960, 4_000, 4_000, 1_040, 0, true]);
  eq("14.15 the days' differences add up to the period's", sum((x) => x.differenceCents), W.main.reconciliation.differenceCents);
  eq("14.16 bets placed, day by day: 6 · 1 · 2", days.map((x) => x.counts.betsPlaced), [6, 1, 2]);
  for (const x of days) {
    const own = await buildTaxReportData({ period: E.daySlice(x.startMs, W.period.endMs).period, product: "ALL", nowMs: FAR });
    ok(`14.17 ${x.dayKey} is exactly that day opened on its own (Report 1, the check, the counts, the tax)`,
      own.ok && own.data.period.kind === "day" && JSON.stringify(own.data.main.report1) === JSON.stringify(x.report1)
        && own.data.main.reconciliation.differenceCents === x.differenceCents && own.data.main.counts.betsPlaced === x.counts.betsPlaced
        && own.data.main.counts.betsOnHold === x.counts.betsOnHold && own.data.main.counts.payoutRecords === x.counts.payoutRecords
        && JSON.stringify([own.data.main.tax.commission, own.data.main.tax.tra, own.data.main.tax.gbt, own.data.main.tax.total]) === JSON.stringify([x.tax.commission, x.tax.tra, x.tax.gbt, x.tax.total]),
      own.ok ? JSON.stringify([own.data.main.report1, x.report1]) : own.error);
  }

  // ── The product filter, day by day ───────────────────────────────────────────────────────────
  const WM = await read(w0, w3, "MARKET");
  const WU = await read(w0, w3, "UPDOWN");
  ok("14.18 Polls + Up & Down = All, every day, for every flow and both balances",
    days.length === 3 && days.every((x, i) => (["salesCents", "payoutCents", "onHoldCents", "refundsCents", "feeKeptCents", "broughtForwardCents"] as const)
      .every((k) => (WM.byDay ?? [])[i]?.report1[k] + (WU.byDay ?? [])[i]?.report1[k] === x.report1[k])));
  eq("14.19 Up & Down alone: Sun 2,000 placed and held · Mon 1,870 paid with 2,000 brought forward · Tue 4,000 placed, 3,740 paid",
    (WU.byDay ?? []).map((x) => [x.report1.salesCents / 100, x.report1.payoutCents / 100, x.report1.onHoldCents / 100, x.report1.broughtForwardCents / 100]),
    [[2_000, 0, 2_000, 0], [0, 1_870, 0, 2_000], [4_000, 3_740, 0, 0]]);

  // ── A custom window that opens and closes mid-day ────────────────────────────────────────────
  const part = E.customPeriod("2026-09-20T08:00", "2026-09-22T18:00")!;
  const P = await buildTaxReportData({ period: part, product: "ALL", nowMs: FAR });
  const pd = P.ok ? P.data.byDay ?? [] : [];
  eq("14.20 a custom window keeps its part-days: Sunday from 08:00, the whole Monday, Tuesday to 18:00",
    pd.map((x) => E.daySlice(x.startMs, part.endMs).period.key), ["2026-09-20T08:00~2026-09-21T00:00", "2026-09-21", "2026-09-22T00:00~2026-09-22T18:00"]);
  eq("14.21 the 07:00 bet is brought forward into the 08:00 part-day, which closes with 16,000 on hold",
    pd[0] ? [pd[0].report1.salesCents / 100, pd[0].report1.broughtForwardCents / 100, pd[0].report1.onHoldCents / 100, pd[0].balanced] : null, [15_000, 1_000, 16_000, true]);
  for (const x of pd) {
    const own = await buildTaxReportData({ period: E.daySlice(x.startMs, part.endMs).period, product: "ALL", nowMs: FAR });
    ok(`14.22 the slice from ${E.toEatLocal(x.startMs)} is its own window opened`,
      own.ok && JSON.stringify(own.data.main.report1) === JSON.stringify(x.report1) && own.data.main.tax.total === x.tax.total,
      own.ok ? JSON.stringify([own.data.main.report1, x.report1]) : own.error);
  }

  // ── A running month, its first morning, a month not started, a single day ──────────────────
  const noon = at("2026-09-21", "12:00");
  const run = await buildTaxReportData({ period: sepP, product: "ALL", nowMs: noon });
  const rd = run.ok ? run.data.byDay ?? [] : [];
  const lastRow = rd[rd.length - 1];
  ok("14.23 a running month lists its days so far — 1 to 21 Sep, the last cut a minute before now",
    rd.length === 21 && rd[0].dayKey === "2026-09-01" && lastRow.dayKey === "2026-09-21" && lastRow.endMs === noon - E.RUNNING_MARGIN_MS,
    `${rd.length} rows, last ${lastRow?.dayKey} to ${lastRow ? E.toEatLocal(lastRow.endMs) : ""}`);
  const today = lastRow ? E.daySlice(lastRow.startMs, sepP.endMs).period : null;
  const todayOwn = today ? await buildTaxReportData({ period: today, product: "ALL", nowMs: noon }) : null;
  ok("14.24 …and today's row opens TODAY, which read at the same moment shows the same figures",
    today?.kind === "day" && today.key === "2026-09-21" && !!todayOwn?.ok && JSON.stringify(todayOwn.data.main.report1) === JSON.stringify(lastRow.report1),
    todayOwn?.ok ? JSON.stringify([todayOwn.data.main.report1, lastRow?.report1]) : "no row");
  eq("14.25 at noon on Monday the one-sided 4,000 is still on hold — its 15:00 refund is after the cut",
    lastRow ? [lastRow.report1.salesCents / 100, lastRow.report1.onHoldCents / 100, lastRow.report1.refundsCents / 100, lastRow.balanced] : null, [4_000, 8_000, 0, true]);
  const firstMorning = await buildTaxReportData({ period: sepP, product: "ALL", nowMs: at("2026-09-01", "10:00") });
  const notYet = await buildTaxReportData({ period: E.monthPeriod("2026-10")!, product: "ALL", nowMs: noon });
  const oneDay = await buildTaxReportData({ period: E.dayPeriod("2026-09-21")!, product: "ALL", nowMs: FAR });
  eq("14.26 a month on its first morning shows its one day so far; a month not started, none; a day is its own day (no breakdown)",
    [firstMorning.ok ? firstMorning.data.byDay?.length : "err", notYet.ok ? notYet.data.byDay : "err", oneDay.ok ? oneDay.data.byDay : "err"], [1, [], null]);

  // The first minute after midnight: a day that closed less than a minute ago is still read a minute back, so the running
  // month's last row — yesterday, cut there — is exactly the day its link opens (the review's finding, 2026-10-04).
  const mn = await market("days-closing-minute");
  await bet("mn", mn.id, "YES", 1_000); await bet("mn", mn.id, "NO", 1_000);
  await stamp(mn.id, at("2026-09-27", "23:59") + 45_000, null);
  const justAfter = at("2026-09-28", "00:00") + 30_000;
  const early = await buildTaxReportData({ period: sepP, product: "ALL", nowMs: justAfter });
  const er = early.ok ? early.data.byDay ?? [] : [];
  const yRow = er[er.length - 1];
  const yOwn = yRow ? await buildTaxReportData({ period: E.daySlice(yRow.startMs, sepP.endMs).period, product: "ALL", nowMs: justAfter }) : null;
  ok("14.26b thirty seconds after midnight the running month ends at yesterday, cut a minute back — and yesterday opened then is exactly that row",
    er.length === 27 && yRow?.dayKey === "2026-09-27" && yRow.endMs === justAfter - E.RUNNING_MARGIN_MS && !!yOwn?.ok && yOwn.data.inProgress
      && JSON.stringify(yOwn.data.main.report1) === JSON.stringify(yRow.report1) && yRow.report1.salesCents === 0,
    JSON.stringify({ rows: er.length, last: yRow?.dayKey, end: yRow ? E.toEatLocal(yRow.endMs) : null, own: yOwn?.ok ? yOwn.data.main.report1 : null, row: yRow?.report1 }));
  const settledDay = await buildTaxReportData({ period: E.dayPeriod("2026-09-27")!, product: "ALL", nowMs: at("2026-09-28", "00:01") });
  ok("14.26c …and once that minute has passed the day is finished, read to its end: the 23:59:45 stakes are in it",
    settledDay.ok && !settledDay.data.inProgress && settledDay.data.main.report1.salesCents === 2_000_00, settledDay.ok ? JSON.stringify(settledDay.data.main.report1) : settledDay.error);

  // ── A day out of balance: a second payout, a day after its round settled ─────────────────────
  const mg = await market("days-late-payout");      // Up & Down settled Friday; 500 more paid on Saturday names its winner
  await bet("mg", mg.id, "YES", 1_000); await bet("mg", mg.id, "NO", 1_000);
  await updown(mg.id);
  await resolveAndSettle(mg.id, "NO");
  await stamp(mg.id, at("2026-09-25", "10:00"), at("2026-09-25", "11:00"));
  const winner = (await svc.listPositionsForMarket(mg.id)).find((p) => p.status === "WIN")!;
  await db.txn.create({
    id: `txn_tx_late_${seq}`, walletId: "wal_tx_officer_b", userId: "tx_officer_b", type: "BET_PAYOUT", status: "CONFIRMED",
    amount: 500, fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS", provider: "INTERNAL", providerRef: null,
    msisdn: null, description: "planted", positionId: winner.id, amlReason: null,
    createdAt: iso(at("2026-09-26", "09:00")), updatedAt: iso(at("2026-09-26", "09:00")), completedAt: iso(at("2026-09-26", "09:00")),
  } as never);
  const late = await read(at("2026-09-25", "00:00"), at("2026-09-27", "00:00"), "UPDOWN");
  const sat = (late.byDay ?? [])[1];
  const satOwn = await buildTaxReportData({ period: E.dayPeriod("2026-09-26")!, product: "UPDOWN", nowMs: FAR });
  ok("14.27 Saturday's 500 is Up & Down's — its record names the bet, as the Day view reads it — and Saturday is out by −500",
    !!sat && sat.report1.payoutCents === 500_00 && !sat.balanced && sat.differenceCents === -500_00 && satOwn.ok && JSON.stringify(satOwn.data.main.report1) === JSON.stringify(sat.report1),
    JSON.stringify([sat?.report1, sat?.differenceCents, satOwn.ok ? satOwn.data.main.report1 : null]));
  ok("14.28 …while Friday still balances: a day's difference stays on its day — and the days' differences add up to the window's (−500)",
    (late.byDay ?? [])[0]?.balanced === true && (late.byDay ?? []).reduce((t, x) => t + x.differenceCents, 0) === late.main.reconciliation.differenceCents && late.main.reconciliation.differenceCents === -500_00);

  // ── The words, and the documents ─────────────────────────────────────────────────────────────
  ok("14.29 the note says what adds up, with no tax clause while the days' tax equals Report 2's", D.dayByDayNote(days, W.main).includes("add up to the period's") && !D.dayByDayNote(days, W.main).includes("tax adds to"));
  const day999 = (x: Day) => ({ ...x, tax: { ...E.taxOnPayout(999_00, E.APPROVED_RATES) } });
  const note = D.dayByDayNote([day999(days[1]), day999(days[2])], { ...W.main, tax: { ...W.main.tax, total: E.taxOnPayout(1_998_00, E.APPROVED_RATES).total } });
  ok("14.30 …and names both figures when each day's own rounding makes them differ (40 against 39)", note.includes("TZS 40 against Report 2's TZS 39"), note);
  const pdfDoc = D.buildTaxDocument(W, { ...gen, lock: null });
  const ds = pdfDoc.sections.find((s) => s.title === "Day by day");
  eq("14.31 the PDF prints the five figures that fit a portrait page, beside the day", ds?.columns.map((c) => c.header), ["Day", "Sales", "Payout", "On hold", "Refunds", "Total tax"]);
  eq("14.32 …one row per day, the reader's figures — the day without its year, which the period line states once",
    ds?.rows.map((r) => [r.day, r.sales, r.payout, r.onHold, r.refunds, r.tax]),
    [["Sun 20 Sep", 16_000, 0, 16_000, 0, 0], ["Mon 21 Sep", 4_000, 11_220, 4_000, 4_000, 219], ["Tue 22 Sep", 4_000, 3_740, 4_000, 0, 73]]);
  const titles = pdfDoc.sections.map((s) => s.title);
  ok("14.33 …after By product, before the exceptions and the rates", titles.indexOf("Day by day") === titles.indexOf("By product") + 1 && titles.indexOf("Rates applied") > titles.indexOf("Day by day"), titles.join(" | "));
  const lateDoc = D.buildTaxDocument({ ...late, period: E.customPeriod("2026-09-25T00:00", "2026-09-27T00:00")! }, { ...gen, lock: null });
  eq("14.34 an out-of-balance day says so in its first cell on the printed page — on a line of its own", lateDoc.sections.find((s) => s.title === "Day by day")?.rows.map((r) => r.day), ["Fri 25 Sep", ["Sat 26 Sep", "out of balance"].join(String.fromCharCode(10))]);
  const xDoc = D.buildTaxDocument(W, { ...gen, lock: null, layout: "xlsx" });
  const xs = xDoc.sections.find((s) => s.title === "Day by day");
  eq("14.35 the workbook carries every daily figure as its own column", xs?.columns.map((c) => c.header),
    ["Day", "Sales", "Payout", "On hold", "Refunds", "Platform fee kept", "Less: on hold brought forward", "Difference (must be 0)", "Commission", "TRA tax", "GBT levy", "Total tax", "Bets placed"]);
  eq("14.36 …Monday's row in full: the stakes brought forward subtracted, as Report 1 prints them", xs?.rows[1],
    { day: "Mon 21 Sep 2026", sales: 4_000, payout: 11_220, onHold: 4_000, refunds: 4_000, fee: 780, bf: -16_000, diff: 0, commission: 1_459, tra: 146, gbt: 73, bets: 1, tax: 219 });
  eq("14.37 …and a sum row that IS the sum: the balances left blank, the tax lines the days' own", xs?.totals,
    { day: "Sum of the days", sales: 24_000, payout: 14_960, onHold: "", refunds: 4_000, fee: 1_040, bf: "", diff: 0, commission: 1_945, tra: 195, gbt: 97, tax: 292, bets: 9 });
  ok("14.38 a day's own document has no day table — the day IS the report",
    !D.buildTaxDocument({ ...W, period: E.dayPeriod("2026-09-21")!, byDay: null }, { ...gen, lock: null }).sections.some((s) => s.title === "Day by day"));
  const csv = D.buildTaxCsv(W, { ...gen, lock: null, reference: "TAX-TEST" });
  ok("14.39 the CSV has one row per day per line, the day's date in its section, figures and counts as numbers",
    csv.includes('"Day by day — 2026-09-20","Sales","Sun 20 Sep 2026",16000,6') && csv.includes('"Day by day — 2026-09-21","Payout","Mon 21 Sep 2026",11220,2')
      && csv.includes('"Day by day — 2026-09-21","Less: on hold brought forward","Mon 21 Sep 2026",-16000,') && csv.includes('"Day by day — 2026-09-22","Total Tax payable","Tue 22 Sep 2026",73,'),
    csv.split(String.fromCharCode(10)).filter((l) => l.startsWith('"Day by day')).slice(0, 3).join(" | "));
  const cents = { ...W, byDay: days.map((x, i) => (i === 0 ? { ...x, report1: { ...x.report1, salesCents: x.report1.salesCents + 50 } } : x)) };
  eq("14.40 a day with cents prints exactly even when the period's own figures are whole", D.buildTaxDocument(cents, { ...gen, lock: null }).sections.find((s) => s.title === "Day by day")?.rows[0]?.sales, "16,000.50");

  // ── A lock taken before daily figures were recorded ──────────────────────────────────────────
  const may = E.monthPeriod("2026-05")!;
  const { byDay: _none, ...oldSnap } = { ...W, period: may };
  void _none;
  const oldLock = await L.insertLock({ periodKind: "month", periodKey: "2026-05", product: "ALL", periodStartMs: may.startMs, periodEndMs: may.endMs, snapshot: oldSnap as never, balanced: true, lockedBy: "tx_officer_a", note: null, exceptionsAcknowledged: null });
  if (oldLock.ok) {
    const od = D.buildTaxDocument(oldLock.lock.snapshot, { ...gen, lock: oldLock.lock });
    const oc = D.buildTaxCsv(oldLock.lock.snapshot, { ...gen, lock: oldLock.lock, reference: "TAX-TEST" });
    ok("14.41 a filing locked before daily figures existed prints no day table and SAYS it holds none — the PDF and the CSV",
      oldLock.lock.snapshot.byDay === undefined && !od.sections.some((s) => s.title === "Day by day") && (od.notes ?? []).some((n) => n.includes("holds no day-by-day table")) && oc.includes('"Day by day","Not recorded"'));
  } else ok("14.41 (fixture) the old-style lock was recorded", false, JSON.stringify(oldLock));
  const newDoc = D.buildTaxDocument({ ...W, period: sepP }, { ...gen, lock: null });
  ok("14.42 control — a report that carries its days never prints that note", !(newDoc.notes ?? []).some((n) => n.includes("holds no day-by-day table")));

  // ── The printed day table, measured with the renderer's own fonts ─────────────────────────────
  // 999,999,999.99 — a billion shillings in a day, with cents. A figure with cents prints as exact TEXT, in Inter (whole
  // shillings print in JetBrains Mono): measured, it is the widest that fits a 21-wide money column.
  const BIG_DAY = 999_999_999_99;
  const bigDay = (i: number): Day => ({
    ...days[0],
    dayKey: E.toEatLocal(sepP.startMs + i * 86_400_000).slice(0, 10),
    // The first a part-day ("08:00–24:00"): the longest word the day cell must hold.
    startMs: sepP.startMs + i * 86_400_000 + (i === 0 ? 8 * 3_600_000 : 0),
    endMs: sepP.startMs + (i + 1) * 86_400_000,
    report1: { salesCents: BIG_DAY, payoutCents: BIG_DAY, onHoldCents: BIG_DAY, refundsCents: BIG_DAY, feeKeptCents: BIG_DAY, broughtForwardCents: BIG_DAY },
    differenceCents: -BIG_DAY,
    balanced: false,
    tax: { commission: 9_999_999_999, tra: 9_999_999_999, gbt: 9_999_999_999, total: 9_999_999_999 },
  });
  const bigW = { ...W, period: sepP, inProgress: true, byDay: Array.from({ length: 30 }, (_, i) => bigDay(i)) };
  const bigDoc = D.buildTaxDocument(bigW, { ...gen, lock: null });
  const bigRows = bigDoc.sections.find((s) => s.title === "Day by day")?.rows ?? [];
  const bigOver = findPdfOverflows(bigDoc).filter((o) => o.where.startsWith("Day by day"));
  ok("14.43 a billion shillings a day with cents, a part-day, 'so far' and 'out of balance' fit every printed day cell",
    bigOver.length === 0 && bigRows.length === 30 && String(bigRows[0].day).split(String.fromCharCode(10)).join("|") === "Tue 1 Sep|from 08:00|out of balance"
      && String(bigRows[29].day).split(String.fromCharCode(10)).join("|") === "Wed 30 Sep|so far|out of balance",
    JSON.stringify(bigOver.slice(0, 4)));
  const tooBig = { ...bigW, byDay: bigW.byDay.map((x) => ({ ...x, report1: { ...x.report1, salesCents: 9_999_999_999_99 } })) };
  ok("14.44 CONTROL — ten billion with cents (sixteen characters) IS caught splitting in the Sales column",
    findPdfOverflows(D.buildTaxDocument(tooBig, { ...gen, lock: null })).some((o) => o.where === "Day by day · Sales"));
  // A lock's days drift too: money moved between two days leaves every period line equal.
  const Vw = (await load("src/lib/server/tax-report-view.ts")) as typeof import("../src/lib/server/tax-report-view.ts");
  const shifted = { ...W, byDay: days.map((x, i) => (i === 1 ? { ...x, report1: { ...x.report1, salesCents: x.report1.salesCents - 1_000_00 } } : i === 2 ? { ...x, report1: { ...x.report1, salesCents: x.report1.salesCents + 1_000_00 } } : x)) };
  eq("14.48 money moved between two days, with every period line equal, is named as drift — day by day",
    Vw.driftBetween(W, shifted).map((l) => [l.line, l.locked / 100, l.live / 100]), [["Sales on Mon 21 Sep 2026", 4_000, 3_000], ["Sales on Tue 22 Sep 2026", 4_000, 5_000]]);
  ok("14.49 control — a filing that holds no days drifts on its period lines alone", Vw.driftBetween({ ...W, byDay: undefined }, shifted).length === 0);
  // A window across New Year prints each day's year — the period line no longer states one year for all.
  const nye = E.customPeriod("2026-12-31T00:00", "2027-01-02T00:00")!;
  const nyeDays = [0, 1].map((i): Day => ({ ...days[0], dayKey: E.toEatLocal(nye.startMs + i * 86_400_000).slice(0, 10), startMs: nye.startMs + i * 86_400_000, endMs: nye.startMs + (i + 1) * 86_400_000 }));
  eq("14.45 a window across New Year prints each day with its year",
    D.buildTaxDocument({ ...W, period: nye, byDay: nyeDays }, { ...gen, lock: null }).sections.find((s) => s.title === "Day by day")?.rows.map((r) => r.day), ["Thu 31 Dec 2026", "Fri 1 Jan 2027"]);
  // ⭐ THE FOOTER, MEASURED: a custom window's reference is the longest this report prints, and it ran under the page number.
  const footerOver = findPdfOverflows(lateDoc).filter((o) => o.where.startsWith("footer"));
  ok("14.46 a custom window's long reference leaves the footer's page number and date clear", footerOver.length === 0 && lateDoc.reference.length > 40, JSON.stringify(footerOver));
  ok("14.47 CONTROL — a reference no footer could hold IS caught", findPdfOverflows({ ...lateDoc, reference: "TAX-".padEnd(400, "X") }).some((o) => o.where.startsWith("footer")));
  // To LOOK at the day tables: TAX_PDF_OUT=<dir> writes the three-day window as PDF and workbook, and the billion-a-day page.
  if (process.env.TAX_PDF_OUT) {
    const { renderPdf, renderXlsx } = (await load("src/lib/server/reports/pdf.ts").then(async (pdfMod) => ({ ...pdfMod, ...(await load("src/lib/server/reports/xlsx.ts")) }))) as typeof import("../src/lib/server/reports/pdf.ts") & typeof import("../src/lib/server/reports/xlsx.ts");
    mkdirSync(process.env.TAX_PDF_OUT, { recursive: true });
    writeFileSync(join(process.env.TAX_PDF_OUT, "tax-days.pdf"), await renderPdf(D.buildTaxDocument({ ...W, period: E.customPeriod("2026-09-20T00:00", "2026-09-23T00:00")! }, { ...gen, lock: null })));
    writeFileSync(join(process.env.TAX_PDF_OUT, "tax-days.xlsx"), await renderXlsx(D.buildTaxDocument({ ...W, period: E.customPeriod("2026-09-20T00:00", "2026-09-23T00:00")! }, { ...gen, lock: null, layout: "xlsx" })));
    writeFileSync(join(process.env.TAX_PDF_OUT, "tax-days-billion.pdf"), await renderPdf(bigDoc));
    writeFileSync(join(process.env.TAX_PDF_OUT, "tax-days-out.pdf"), await renderPdf(lateDoc));
  }
}

/* ═══ §15 · FINANCE'S FILING LINES ════════════════════════════════════════════════════════════════ */
// Jaykishan, 2026-10-06, with Finance's sheet "Ocean Entertainment Limited (50pick) — Tax for the month of September
// 2026": "We pay tax on what we earn. That is 13% on winnings … I need number of tickets on sales which is 3,063,000 —
// only ones which are not refunded". This report's September: Sales 7,210,500 (3,353 bets) · Refunds 4,147,500 (2,279
// refunds) · Payout 1,751,305.
console.log("§15 · Sales less refunds with its tickets, and Net commission revenue — Finance's September 2026 sheet");
{
  const D = (await load("src/lib/server/tax-report-doc.ts")) as typeof import("../src/lib/server/tax-report-doc.ts");
  const { findPdfOverflows } = (await load("src/lib/server/reports/pdf.ts")) as typeof import("../src/lib/server/reports/pdf.ts");
  const gen = { generatorId: "usr_tx_gen", generatorName: "Test Officer", generatedAtMs: FAR };

  // ── The sheet, to the shilling (pure) ─────────────────────────────────────────────────────────
  const t = E.taxOnPayout(1_751_305_00, E.APPROVED_RATES);
  const fs = E.filingSummary({ report1: { salesCents: 7_210_500_00, refundsCents: 4_147_500_00 }, counts: { betsPlaced: 3_353, refundRecords: 2_279 }, tax: t });
  eq("15.1 Sales less refunds = Sales − Refunds: 7,210,500 − 4,147,500 = 3,063,000, the sales on Finance's sheet", fs.salesLessRefundsCents, 3_063_000_00);
  eq("15.2 its tickets: 3,353 placed − 2,279 refunded = 1,074", [fs.ticketsPlaced, fs.ticketsRefunded, fs.ticketsNotRefunded], [3_353, 2_279, 1_074]);
  // The sheet rounds once, at the end (TRA 22,766.97 · GBT 11,383.48 · Total 34,150); the plan rounds at each step (§3).
  eq("15.3 the sheet's Winnings 1,751,305 taxed by the plan: Commission 227,670 · TRA 22,767 · GBT 11,384 · Total 34,151", [t.commission, t.tra, t.gbt, t.total], [227_670, 22_767, 11_384, 34_151]);
  eq("15.4 Net commission revenue = Commission − Total tax = 193,519 — the sheet's own last line", fs.netCommission, 193_519);

  // ── On the reader's own books (fixture A: Sales 49,000 · Refunds 17,000 · 12 bets placed · 5 refund records) ──
  const ra = D.report2Rows(A.main);
  ok("15.5 Report 2 opens with Sales less refunds, carrying its tickets, and closes with Net commission revenue",
    ra[0]?.line === "Sales less refunds" && ra[0].amount === 32_000_00 && ra[0].tickets?.net === 7 && ra[0].tickets.placed === 12 && ra[0].tickets.refunded === 5
      && ra.at(-1)?.line === "Net commission revenue" && ra.at(-1)?.amount === A.main.tax.commission - A.main.tax.total && ra.at(-1)?.kind === "total",
    JSON.stringify([ra[0], ra.at(-1)]));
  const csv = D.buildTaxCsv(A, { generatorName: "Test Officer", generatedAtMs: FAR, lock: null, reference: "TAX-TEST" });
  const csvLine = (s: string) => csv.split(String.fromCharCode(10)).find((l) => l.includes(s)) ?? `no line with ${s}`;
  ok("15.6 the CSV: the tickets in the Count column as a plain number, how they are made in the basis",
    csv.includes('"Report 2 — Taxation","Sales less refunds","Sales − Refunds · tickets: 12 placed − 5 refunded",32000,7'), csvLine("Sales less refunds"));
  ok("15.7 …and Net commission revenue as a whole-shilling number", csv.includes('"Report 2 — Taxation","Net commission revenue","Commission − Total Tax",2273,'), csvLine("Net commission revenue"));
  const nb = String.fromCharCode(160);
  ok("15.7b the page's tickets line keeps each number with its word and the minus with the number after it (no-break spaces: it broke as '… − 5' / 'refunded' at 360px); the CSV is plain text",
    D.ticketsLine(ra[0].tickets!) === `Tickets: 12${nb}placed −${nb}5${nb}refunded` && D.report2BasisText(ra[0]) === "Sales − Refunds · tickets: 12 placed − 5 refunded" && !csv.includes(nb),
    JSON.stringify(D.ticketsLine(ra[0].tickets!)));
  const parts = (A.byProduct ?? []).map((p) => E.filingSummary(p));
  const all = E.filingSummary(A.main);
  ok("15.8 Polls + Up & Down add up to All products — Sales less refunds and its tickets",
    parts.length === 2 && parts.reduce((s, p) => s + p.salesLessRefundsCents, 0) === all.salesLessRefundsCents && parts.reduce((s, p) => s + p.ticketsNotRefunded, 0) === all.ticketsNotRefunded,
    JSON.stringify({ parts, all }));
  // A lock stores the report as JSON. The lines are made from figures every snapshot holds, so a filing locked before
  // they existed prints them too — and the lock fingerprint, which hashes those figures, already covers them.
  eq("15.9 a locked snapshot (a JSON round trip) prints the same Report 2 rows", D.report2Rows(JSON.parse(JSON.stringify(A.main))), ra);

  // ── Deposits and withdrawals: said once, plainly, and nowhere a figure stands (management, 2026-10-06) ──
  const docA = D.buildTaxDocument(A, { ...gen, lock: null });
  const payoutBasis = D.report1Rows(A.main).find((r) => r.line === "Payout")?.basis ?? "";
  const notes = docA.notes ?? [];
  ok("15.10 the Payout line no longer names withdrawals; the notes say ONCE that deposits and withdrawals are not part of the report",
    !/withdraw/i.test(payoutBasis) && notes.filter((n) => /withdraw/i.test(n)).length === 1 && notes.some((n) => n.startsWith("Deposits and withdrawals are not part of this report")),
    `${payoutBasis} | ${notes.filter((n) => /withdraw/i.test(n)).join(" | ")}`);
  ok("15.11 …and no table cell and no CSV line mentions a deposit or a withdrawal",
    !docA.sections.some((s) => s.rows.some((r) => Object.values(r).some((v) => typeof v === "string" && /withdraw|deposit/i.test(v)))) && !/withdraw|deposit/i.test(csv));

  // ── The printed page, measured: the widest the new lines can be ───────────────────────────────
  const BIGC = 9_999_999_999_00;
  const wide = {
    ...A,
    period: E.monthPeriod("2026-09")!,
    main: {
      ...A.main,
      report1: { ...A.main.report1, salesCents: 0, refundsCents: BIGC },
      counts: { ...A.main.counts, betsPlaced: 0, refundRecords: 9_999_999 },
      tax: { ...A.main.tax, commission: 0, total: 9_999_999_999 },
    },
  };
  const wideDoc = D.buildTaxDocument(wide, { ...gen, lock: null });
  const wideOver = findPdfOverflows(wideDoc).filter((o) => o.where.startsWith("Report 2"));
  const wideRows = wideDoc.sections.find((s) => s.title === "Report 2 — Taxation")?.rows ?? [];
  ok("15.12 the printed Report 2 holds −9,999,999,999 Sales less refunds with −9,999,999 tickets, and −9,999,999,999 net commission, each on its line",
    wideOver.length === 0 && wideRows[0]?.line === "Sales less refunds · −9,999,999 tickets" && wideRows.at(-1)?.amount === -9_999_999_999,
    JSON.stringify({ over: wideOver.slice(0, 4), first: wideRows[0], last: wideRows.at(-1) }));
  const cramped = { ...wideDoc, sections: wideDoc.sections.map((s) => (s.title.startsWith("Report 2") ? { ...s, columns: s.columns.map((c) => (c.key === "amount" ? { ...c, width: 12 } : c)) } : s)) };
  ok("15.13 CONTROL — the same figures in a 12-wide Amount column ARE caught splitting", findPdfOverflows(cramped).some((o) => o.where.startsWith("Report 2")));

  // ── Real books: a refund of a ticket placed BEFORE the window is deducted here — printed as it is, never clamped ──
  const iso = (ms: number) => new Date(ms).toISOString();
  const at = (day: string, hhmm: string) => E.parseEatLocal(`${day}T${hhmm}`)!;
  /** §14's stamp: move a market's bets and their money records onto chosen instants, as the services would have stamped them. */
  async function stampAt(marketId: string, placedAt: number, settledAt: number) {
    const ids = new Set<string>();
    for (const p of await svc.listPositionsForMarket(marketId)) {
      ids.add(p.id);
      const cur = (await positionStore.get(p.id))!;
      await positionStore.set({ ...cur, placedAt: iso(placedAt), settledAt: cur.settledAt ? iso(settledAt) : cur.settledAt } as never);
    }
    for (const t of await db.txn.listAll()) {
      if (t.positionId && ids.has(t.positionId)) await db.txn.update(t.id, { createdAt: iso(t.type === "BET_PLACED" ? placedAt : settledAt) });
    }
  }
  const mbf = await market("filing-brought-forward");   // YES 4,000 alone: placed 10 Aug, refunded one-sided on 12 Aug
  await bet("mbf", mbf.id, "YES", 4_000);
  await resolveAndSettle(mbf.id, "YES");
  await stampAt(mbf.id, at("2026-08-10", "10:00"), at("2026-08-12", "15:00"));
  const BFW = await read(at("2026-08-11", "00:00"), at("2026-08-13", "00:00"));
  const bfs = E.filingSummary(BFW.main);
  ok("15.14 a window that only refunds a ticket placed before it: Sales less refunds −4,000 and −1 ticket (0 placed − 1 refunded), its own check balanced",
    BFW.main.reconciliation.balanced && BFW.main.report1.broughtForwardCents === 4_000_00 && BFW.main.report1.refundsCents === 4_000_00
      && bfs.salesLessRefundsCents === -4_000_00 && bfs.ticketsPlaced === 0 && bfs.ticketsRefunded === 1 && bfs.ticketsNotRefunded === -1,
    JSON.stringify({ r1: BFW.main.report1, rec: BFW.main.reconciliation, bfs }));
  const bfLine = D.buildTaxDocument(BFW, { ...gen, lock: null }).sections.find((s) => s.title === "Report 2 — Taxation")?.rows[0]?.line;
  const bfCsv = D.buildTaxCsv(BFW, { generatorName: "Test Officer", generatedAtMs: FAR, lock: null, reference: "TAX-TEST" });
  ok("15.15 …and every surface prints it as it is: '−1 ticket' on the page and on the printed line, −1 in the CSV's Count, −4,000 its amount",
    D.ticketsLabel(D.report2Rows(BFW.main)[0].tickets!.net) === "−1 ticket" && bfLine === "Sales less refunds · −1 ticket"
      && bfCsv.includes('"Report 2 — Taxation","Sales less refunds","Sales − Refunds · tickets: 0 placed − 1 refunded",-4000,-1'),
    `${bfLine} | ${bfCsv.split(String.fromCharCode(10)).find((l) => l.includes("Sales less refunds")) ?? "no CSV line"}`);

  // ── A ticket staked wholly from bonus and voided: refunded with NO money record, still one refunded ticket ──
  const mbo = await market("filing-bonus-void");
  const placedBo = at("2026-08-20", "10:00");
  await positionStore.set({ id: "pos_tx_bonus_void", userId: "tx_officer_b", marketId: mbo.id, side: "YES", stake: 2_500, bonusStakeTzs: 2_500, potentialPayout: 2_500, status: "VOID", finalPayout: null, placedAt: iso(placedBo), settledAt: iso(placedBo + 3_600_000) } as never);
  const BOW = await read(at("2026-08-20", "00:00"), at("2026-08-21", "00:00"));
  const bos = E.filingSummary(BOW.main);
  const reasonsTotal = BOW.main.refundsByReason.reduce((s, r) => s + r.count, 0);
  ok("15.16 a ticket staked wholly from bonus and voided is one refunded ticket: 1 placed − 1 refunded = 0, Sales less refunds 0, Report 1's refunds count = the reasons' total",
    BOW.main.reconciliation.balanced && BOW.main.report1.salesCents === 2_500_00 && BOW.main.report1.refundsCents === 2_500_00
      && bos.salesLessRefundsCents === 0 && bos.ticketsNotRefunded === 0 && BOW.main.counts.refundRecords === 1 && reasonsTotal === 1,
    JSON.stringify({ r1: BOW.main.report1, counts: BOW.main.counts, reasonsTotal, bos }));

  // ── A month split by a rate change: the filing lines frame the segments, once each ─────────────
  const vMid: import("../src/lib/tax-report.ts").RateVersion = { id: "v_mid", effectiveFrom: "2026-09-15", rates: { commissionBp: 1200, traBp: 1000, gbtBp: 500 }, recordedBy: "usr_t", recordedAt: "2026-10-03T10:00:00Z", note: "test" };
  const sepW = E.monthPeriod("2026-09")!;
  const segs = E.rateSegments(sepW.startMs, sepW.endMs, E.normaliseVersions([vMid]));
  // 13% × 1,000,000 = 130,000 · 13,000 · 6,500 and 12% × 751,305 = 90,157 · 9,016 · 4,508 → 220,157 − 33,024 = 187,133.
  const split = E.taxForSegments([{ segment: segs[0], payoutCents: 1_000_000_00 }, { segment: segs[1], payoutCents: 751_305_00 }]);
  const rs = D.report2Rows({ ...A.main, tax: split });
  const names = rs.map((r) => r.line);
  ok("15.17 a month split by a rate change: Net commission revenue = Σ Commission − Σ Total tax (187,133), last, after Total Tax payable and the all-segments sums; Sales less refunds first, once",
    segs.length === 2 && segs[1].version.id === "v_mid" && names[0] === "Sales less refunds" && names.filter((n) => n === "Sales less refunds").length === 1
      && rs.at(-1)?.line === "Net commission revenue" && rs.at(-1)?.amount === 187_133 && rs.at(-1)?.amount === split.commission - split.total
      && names.at(-2) === "Total Tax payable" && names.at(-3) === "GBT levy — all segments",
    JSON.stringify({ names, net: rs.at(-1)?.amount, split: [split.commission, split.total] }));

  eq("15.18 the count's words: grouped, singular for one, and signed with U+2212 like every figure here",
    [1_074, 1, 0, -1, -37].map(D.ticketsLabel), ["1,074 tickets", "1 ticket", "0 tickets", "−1 ticket", "−37 tickets"]);

  // ── The Gaming Board's line is a LEVY (Ali, 2026-10-06: "change GBT tax to GBT levy") — on every surface ──
  const V = (await load("src/lib/server/tax-report-view.ts")) as typeof import("../src/lib/server/tax-report-view.ts");
  type DayRow = NonNullable<typeof A.byDay>[number];
  const dayOf = (k: string): DayRow => {
    const s0 = at(k, "00:00"); const m = A.main;
    return { dayKey: k, startMs: s0, endMs: s0 + 86_400_000, report1: m.report1, differenceCents: 0, balanced: true,
      counts: { betsPlaced: m.counts.betsPlaced, payoutRecords: m.counts.payoutRecords, refundRecords: m.counts.refundRecords, betsOnHold: m.counts.betsOnHold },
      tax: { commission: m.tax.commission, tra: m.tax.tra, gbt: m.tax.gbt, total: m.tax.total } };
  };
  const levyView = { ...A, period: sepW, byDay: [dayOf("2026-09-20"), dayOf("2026-09-21")] };
  const levySurfaces: Array<[string, string]> = [
    ["the PDF", JSON.stringify(D.buildTaxDocument(levyView, { ...gen, lock: null }))],
    ["the workbook", JSON.stringify(D.buildTaxDocument(levyView, { ...gen, lock: null, layout: "xlsx" }))],
    ["the CSV", D.buildTaxCsv(levyView, { generatorName: "Test Officer", generatedAtMs: FAR, lock: null, reference: "TAX-TEST" })],
    ["the drift", JSON.stringify(V.driftBetween(A, { ...A, main: { ...A.main, tax: { ...A.main.tax, gbt: A.main.tax.gbt + 1 } } }))],
  ];
  ok("15.19 the Gaming Board's line reads 'GBT levy' on every surface — Report 2, By product, the workbook's day columns, the CSV's day and product rows, the drift — and 'GBT tax' nowhere",
    levySurfaces.every(([, s]) => s.includes("GBT levy") && !/GBT tax/i.test(s)),
    levySurfaces.map(([n, s]) => `${n}: levy ${s.includes("GBT levy")}, tax ${/GBT tax/i.test(s)}`).join(" | "));
  // To LOOK at the September sheet's lines as printed: TAX_PDF_OUT=<dir> writes the fixture's month with them.
  if (process.env.TAX_PDF_OUT) {
    const { renderPdf } = (await load("src/lib/server/reports/pdf.ts")) as typeof import("../src/lib/server/reports/pdf.ts");
    mkdirSync(process.env.TAX_PDF_OUT, { recursive: true });
    writeFileSync(join(process.env.TAX_PDF_OUT, "tax-filing-lines-widest.pdf"), await renderPdf(wideDoc));
  }
}

console.log(`\ntax-report: ${pass} passed, ${fails.length} failed`);
if (fails.length) { console.log("\nFAILED:"); for (const f of fails) console.log(`  - ${f}`); }
process.exitCode = fails.length === 0 ? 0 : 1;
process.exit(process.exitCode);
