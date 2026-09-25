/**
 * REPORT WINDOW READS — a report that covers a window reads THAT WINDOW, never the whole
 * `Transaction` table.
 *
 *   npm run test:report-window-reads        (npx tsx scripts/report-window-reads.test.mts)
 *
 * 🔴 THE DEFECT (2026-09-25, `SESSION-PROMPT-FINANCE-SEAL.md` §2). `buildDailyOps` — one EAT day —
 * called `db.txn.listAll()` and kept the day in JavaScript, and `buildFiuSar` — one calendar month —
 * did the same. On production that is every transaction the platform has ever recorded, pulled into
 * a 512 MB container to keep a day of it: the daily-ops build THREW once against production during
 * verification and passed on retry. It is the exact shape `test:report-parity` exists because of
 * (3,176 ms and 333 MB at 1,000 users × 100 txns, vs 48 ms in SQL) — and that suite's §4 source
 * scan never looked at `reports/catalogue.ts`.
 *
 * ⭐ BEHAVIOURAL, NOT A GREP. Every `db.txn` read method is wrapped to RECORD its name and, for
 * `listInRange`, its bounds; the real builders then run on the in-memory store. So the suite sees a
 * whole-table walk by any route (`listAll`, `listByStatus`, `search`…), not one spelling of it —
 * and it checks every figure against the fixture's own arithmetic with a row ON each boundary, so
 * a bounded read cannot buy its speed by dropping a row.
 *
 *   §1 daily-ops      — ONE read, of exactly [EAT midnight, next EAT midnight); figures unchanged
 *   §2 fiu-sar        — ONE read, of exactly the pack month; boundary rows in/out; ties ordered
 *   §3 every builder  — no builder walks the table except the ALL-TIME match-integrity review
 *   §4 match-integrity — "the most recent 200" IS the newest 200 (it was the first 200 read)
 *   §5 a malformed pack period is refused, not turned into NaN bounds
 */
import { readFileSync } from "node:fs";

/* ⛔ THE IN-MEMORY STORE, ALWAYS. `store.ts` picks Postgres at import time when DATABASE_URL is
   set, and this suite writes fixtures — so the env is cleared BEFORE the first dynamic import
   (static imports would evaluate first). The convention `ai-usage.test.mts` uses. */
delete process.env.DATABASE_URL;
delete process.env.DATABASE_PUBLIC_URL;
process.env.USE_PRISMA_DAL = "false";
const { db } = await import("../src/lib/server/store.ts");
type StoredTxn = import("../src/lib/server/store.ts").StoredTxn;
type StoredUser = import("../src/lib/server/store.ts").StoredUser;
const { startOfEatDay } = await import("../src/lib/server/report-money.ts");
const { packPeriodBounds } = await import("../src/lib/server/report-pack.ts");
const { REPORT_CATALOGUE, buildDailyOps, buildFiuSar, buildMatchIntegrity } = await import("../src/lib/server/reports/catalogue.ts");
type Report = import("../src/lib/server/reports/types.ts").Report;

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

const DAY = 86_400_000, HOUR = 3_600_000;
const GEN = "usr_windowreads";

// ── the instrument: every db.txn READ method records its name; listInRange records its bounds ──
const txnCalls: string[] = [];
const ranges: Array<[number, number]> = [];
const WRITES = new Set(["create", "update"]);
const txn = db.txn as unknown as Record<string, (...a: unknown[]) => unknown>;
const real: Record<string, (...a: unknown[]) => unknown> = {};
for (const k of Object.keys(txn)) {
  if (WRITES.has(k) || typeof txn[k] !== "function") continue;
  real[k] = txn[k].bind(db.txn);
  txn[k] = async (...a: unknown[]) => {
    txnCalls.push(k);
    if (k === "listInRange") ranges.push([a[0] as number, a[1] as number]);
    return real[k](...a);
  };
}
const reset = () => { txnCalls.length = 0; ranges.length = 0; };
const allTxns = () => real.listAll() as StoredTxn[];   // the fixture's own view — never counted

let seq = 0;
async function put(atMs: number, type: StoredTxn["type"], amount: number, over: Partial<StoredTxn> = {}) {
  const id = `txn_wr_${String(++seq).padStart(4, "0")}`;
  await db.txn.create({
    id, userId: "usr_wr_player", walletId: "wlt_wr_player",
    type, status: "CONFIRMED", amount, fee: 0, createdAt: new Date(atMs).toISOString(), ...over,
  } as StoredTxn);
  return id;
}
const tile = (r: Report, re: RegExp) => r.summary?.find((k) => re.test(k.label));
const iso = (ms: number) => new Date(ms).toISOString();

console.log("\n── 1 · daily-ops reads ONE EAT day, and every figure is unchanged ──");
{
  const dayStart = startOfEatDay(Date.now());
  const dayEnd = dayStart + DAY;
  // ⭐ A row ON each bound — the only place a bounded read can disagree with the JS filter it replaces.
  await put(dayStart - 1, "BET_PLACED", -1_000);                 // yesterday — OUT
  await put(dayStart, "BET_PLACED", -2_000);                     // ON start — IN (>= start)
  await put(dayStart + 5 * HOUR, "DEPOSIT", 50_000);             // IN
  await put(dayStart + 6 * HOUR, "DEPOSIT", 70_000, { status: "FAILED" }); // never moved — OUT
  await put(dayStart + 7 * HOUR, "BET_PAYOUT", 1_500);           // IN
  await put(dayStart + 8 * HOUR, "BET_REFUND", 300);             // IN
  await put(dayStart + 9 * HOUR, "WITHDRAWAL", -10_000);         // IN
  await put(dayEnd - 1, "BET_PLACED", -4_000);                   // last ms of the day — IN
  await put(dayEnd, "BET_PLACED", -8_000);                       // ON end — OUT (< end)

  reset();
  const r = await buildDailyOps(GEN);
  if (startOfEatDay(Date.now()) !== dayStart) {
    console.log("⚠️ the clock crossed EAT midnight mid-run — the fixture no longer names today. Re-run.");
    process.exit(1);
  }
  ok("🔴 daily-ops reads transactions ONLY through the windowed read",
    txnCalls.length > 0 && txnCalls.every((k) => k === "listInRange"),
    `db.txn calls: ${txnCalls.join(", ") || "(none)"} — listAll is every transaction ever recorded, to keep one day`);
  ok("…exactly ONE windowed read, of exactly [EAT midnight, next EAT midnight)",
    ranges.length === 1 && ranges[0][0] === dayStart && ranges[0][1] === dayEnd,
    JSON.stringify(ranges.map(([a, b]) => [iso(a), iso(b)])));

  // The fixture's own arithmetic: sales 2,000 + 4,000; GGR = 6,000 − 1,500 − 300.
  ok("Total sales = the two in-day bets, boundary rows in/out exactly", tile(r, /^Total sales/)?.num === 6_000,
    `got ${tile(r, /^Total sales/)?.num} — 6,000 expected (14,000 means the END row leaked in, 7,000 the row BEFORE)`);
  ok("…counted as 2 tickets", tile(r, /^Total sales/)?.delta === "2 tickets", tile(r, /^Total sales/)?.delta);
  ok("GGR = sales − payouts − refunds = 4,200", tile(r, /^GGR/)?.num === 4_200, `got ${tile(r, /^GGR/)?.num}`);
  const hourly = r.sections.find((s) => s.rows.some((row) => row.hour === "00:00"));
  const sum = (k: string) => (hourly?.rows ?? []).reduce((t, row) => t + Number(row[k] ?? 0), 0);
  ok("CONTROL · the hourly breakdown is there to read", !!hourly && hourly.rows.length === 24, `${hourly?.rows.length ?? 0} rows`);
  ok("hourly deposits = the one CONFIRMED deposit (the FAILED one never moved)", sum("deposits") === 50_000, `${sum("deposits")}`);
  ok("hourly withdrawals = 10,000", sum("withdrawals") === 10_000, `${sum("withdrawals")}`);
  ok("the bet ON midnight lands in the 00:00 hour", hourly?.rows.find((row) => row.hour === "00:00")?.sales === 2_000);
  ok("the bet at 23:59:59.999 lands in the 23:00 hour", hourly?.rows.find((row) => row.hour === "23:00")?.sales === 4_000);
}

console.log("\n── 2 · fiu-sar reads its pack MONTH, not the table ──");
{
  // A FIXED past month, so no row sits in the future and the result cannot drift with the clock.
  const PERIOD = "2026-06";
  const { start, end } = packPeriodBounds(PERIOD);
  for (const [id, phone] of [["usr_wr_in", "+255700000901"], ["usr_wr_out", "+255700000902"]]) {
    await db.user.create({ id, phoneE164: phone, role: "PLAYER", status: "ACTIVE" } as StoredUser);
  }
  await put(start - 1, "DEPOSIT", 5_000_000, { userId: "usr_wr_out" });            // last ms of May — OUT
  const onStart = await put(start, "DEPOSIT", 1_200_000, { userId: "usr_wr_in" }); // ON start — IN
  await put(start + 10 * DAY, "WITHDRAWAL", -2_000_000, { userId: "usr_wr_in" });  // IN
  await put(start + 11 * DAY, "DEPOSIT", 999_999, { userId: "usr_wr_in" });        // under the line — no breach
  const tieLater = await put(start + 20 * DAY, "DEPOSIT", 1_200_000, { userId: "usr_wr_in" }); // a TIE with onStart
  await put(end, "DEPOSIT", 3_000_000, { userId: "usr_wr_out" });                  // ON end (1 July EAT) — OUT

  reset();
  const r = await buildFiuSar(GEN, PERIOD);
  ok("🔴 fiu-sar reads transactions ONLY through the windowed read",
    txnCalls.length > 0 && txnCalls.every((k) => k === "listInRange"), `db.txn calls: ${txnCalls.join(", ") || "(none)"}`);
  ok("…exactly ONE windowed read, of exactly the pack month",
    ranges.length === 1 && ranges[0][0] === start && ranges[0][1] === end, JSON.stringify(ranges.map(([a, b]) => [iso(a), iso(b)])));
  ok("the three in-month breaches are reported, the two boundary rows are not",
    tile(r, /^Triggered entries/)?.num === 3, `got ${tile(r, /^Triggered entries/)?.num}`);
  ok("flagged volume = 1,200,000 × 2 + 2,000,000", tile(r, /^Total flagged volume/)?.num === 4_400_000,
    `got ${tile(r, /^Total flagged volume/)?.num}`);
  // ⭐ Equal amounts are ordered by the DATA (time, then id), not by the order the store returned them.
  const rows = r.sections[0]?.rows ?? [];
  const idxOf = (id: string) => rows.findIndex((row) => row.txnId === id);
  ok("CONTROL · both tied rows are in the section", idxOf(onStart) >= 0 && idxOf(tieLater) >= 0,
    `${idxOf(onStart)} / ${idxOf(tieLater)} (columns: ${Object.keys(rows[0] ?? {}).join(",")})`);
  ok("a tie on amount is broken by time — the earlier breach first", idxOf(onStart) < idxOf(tieLater));
}

console.log("\n── 3 · no builder walks the Transaction table except the ALL-TIME review ──");
{
  /* ⚠️ ONE WHOLE-TABLE READ REMAINS, ON PURPOSE, AND IT IS NAMED RATHER THAN HIDDEN. `buildMatchIntegrity`
     reconciles EVERY voided market against EVERY refund — both sides all-time — so there is no window
     to push down, and bounding only the refund side would print refunds with no market to explain
     them. It is a SCALE item (a type-filtered count + sum + newest 200 in SQL), recorded in the
     handover §2 — not a window bug. Any OTHER builder that reads the table fails here, by name. */
  const WHOLE = new Set(["listAll", "listByStatus", "search", "listSince"]);
  const walkers: string[] = [];
  let reviewWalks = 0;
  for (const [id, entry] of Object.entries(REPORT_CATALOGUE)) {
    reset();
    await (entry as { build: (g: string) => Promise<Report> }).build(GEN);
    const walks = txnCalls.filter((k) => WHOLE.has(k));
    if (id === "match-integrity") reviewWalks = walks.length;
    else if (walks.length) walkers.push(`${id}: ${walks.join(", ")}`);
  }
  ok("CONTROL · the instrument sees the one all-time read it expects (else it is measuring nothing)",
    reviewWalks >= 1, `match-integrity whole-table reads: ${reviewWalks}`);
  ok("🔴 no other report builder walks the Transaction table", walkers.length === 0, walkers.join(" · ") || `${Object.keys(REPORT_CATALOGUE).length} builders`);
}

console.log("\n── 4 · match-integrity's \"most recent 200\" IS the newest 200 ──");
{
  /* 🔴 The section tells the Gaming Board it shows "the most recent 200 of N", and it took the FIRST
     200 of an unordered read — insertion order in memory, heap order in Postgres: roughly the OLDEST.
     Seeded oldest-first, so the old code's first 200 are exactly the wrong 200. */
  const base = Date.UTC(2026, 4, 1);
  for (let i = 0; i < 205; i++) await put(base + i * HOUR, "BET_REFUND", 1_000);
  const refunds = allTxns().filter((t) => t.type === "BET_REFUND");
  const expected = [...refunds]
    .sort((a, b) => (b.createdAt < a.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0) || b.id.localeCompare(a.id))
    .slice(0, 200).map((t) => t.id);
  const oldest = [...refunds].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0].id;
  const r = await buildMatchIntegrity(GEN);
  const section = r.sections.find((s) => /refund/i.test(s.title));
  const got = (section?.rows ?? []).map((row) => String(row.ref));
  ok("CONTROL · more refunds exist than the cap, so the cap is exercised", refunds.length > 200, `${refunds.length} refunds`);
  ok("CONTROL · the section says it is showing the most recent", /most recent/i.test(section?.description ?? ""), section?.description);
  ok("the 200 rows shown are EXACTLY the 200 newest", got.length === 200 && got.every((id, i) => id === expected[i]),
    `first shown ${got[0]} vs newest ${expected[0]} · ${got.filter((id) => !expected.includes(id)).length} rows not among the newest`);
  ok("…and the oldest refund is NOT among them", !got.includes(oldest), oldest);
}

console.log("\n── 5 · a malformed pack period is refused, not turned into NaN bounds ──");
{
  const refuses = (p: string) => { try { packPeriodBounds(p); return false; } catch { return true; } };
  ok("\"2026-06\" resolves", !refuses("2026-06"));
  ok("\"2026-13\", \"2026-6\", \"abc\" and \"\" are each refused",
    ["2026-13", "2026-6", "abc", ""].every(refuses), ["2026-13", "2026-6", "abc", ""].map((p) => `${JSON.stringify(p)}:${refuses(p)}`).join(" "));
}

{
  // A source cross-check, kept deliberately small: the behavioural §3 is the guard, this only makes
  // sure the header of this file is not describing a builder list that has moved on.
  const src = readFileSync(new URL("../src/lib/server/reports/catalogue.ts", import.meta.url), "utf8");
  ok("CONTROL · the catalogue still has the three builders this suite drives by name",
    ["buildDailyOps", "buildFiuSar", "buildMatchIntegrity"].every((f) => src.includes(`export async function ${f}(`)));
}

for (const k of Object.keys(real)) txn[k] = real[k];
console.log(`\nreport-window-reads: ${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
