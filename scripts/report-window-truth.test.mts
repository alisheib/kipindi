/**
 * REPORT WINDOW TRUTH — a report states the window it covers, and the window it states is the
 * window it read.
 *
 *   Run:  npm run test:report-window-truth
 *   Red:  npm run red:report-window-truth
 *
 * 🔴 THE DEFECT (2026-09-28). Users reported that `/admin/reports` "gets the date ranges for
 * reports wrong". The arithmetic was never wrong — `resolveRange` is EAT-safe on every preset and
 * the bounds are half-open throughout. What was wrong is that the window was INVISIBLE:
 *
 *  · exactly ONE of nine catalogue entries follows the page's date rail. The other eight compute
 *    their own statutory or point-in-time period, which is correct — but nothing said so, and the
 *    Excel/PDF pair in the page head builds `gbt-monthly`, fixed to the previous complete calendar
 *    month, drawn ~40px from that rail. Set the rail to "Today", press Excel, receive LAST MONTH.
 *  · `meta.period` — the one field on `Report` that names the window — was computed by all nine
 *    builders and rendered by NEITHER renderer. `fiu-sar`, `sx-register`, `kyc-reverify` and
 *    `rg-engagement` reached a regulator with no stated coverage at all.
 *  · `makeReference` stamped the UTC day on a document whose every figure is EAT, so for the last
 *    three hours of every EAT day — including every month end — the reference on a statutory
 *    filing named YESTERDAY.
 *
 * ⭐ WHY THIS SUITE IS NOT A GREP. "The builder prints `coverage.statement()`" is circular: the
 * builder literally calls it. The assertion that earns its keep is §4 — the bounds the builder
 * actually handed to SQL, recorded by wrapping `db.txn`, compared against the bounds its
 * declaration claims, and against the EAT dates the document PRINTS. Three independent
 * derivations of one window; a fix in one of them cannot buy agreement in the other two.
 *
 * ⛔ EVERY SECTION TAKES ITS SUBJECT AS A PARAMETER, so `--prove-red` runs the SAME assertions
 * against a coverage with one defect planted and requires the MATCHING named assertion to fire.
 * A red case that goes red on some other assertion is reported as a problem, not as proof.
 *
 * ⚠️ PINNED TO A ZONE THAT IS NEITHER UTC NOR EAT, and the run is vacuous without it. §6's whole
 * subject is a stamp that read the UTC day instead of the East Africa day. On a UTC+3 box the
 * broken code and the fixed code print the same string; on a UTC box a LOCAL-zone read is
 * indistinguishable from a UTC one. Pacific/Honolulu (UTC−10) separates all three, and §0 checks
 * the effective offset and reports BLIND rather than green if this ever stops working.
 * `finance-window-truth.test.mts` records why it is set here and not as a shell prefix: there is no
 * `cross-env` in this repo and a bare `TZ=… ` does not survive npm's cmd.exe on Windows.
 */
process.env.TZ = "Pacific/Honolulu";

/* ⛔ BEFORE THE FIRST AWAIT. A suite that sets its exit code at the end scores GREEN when a promise
   never settles or the process exits early. */
process.exitCode = 1;

/* ⛔ THE IN-MEMORY STORE, ALWAYS. `store.ts` picks Postgres at import time when DATABASE_URL is
   set, and this suite writes fixtures — so the env is cleared BEFORE the first dynamic import
   (static imports would evaluate first). The convention `report-window-reads.test.mts` uses. */
delete process.env.DATABASE_URL;
delete process.env.DATABASE_PUBLIC_URL;
process.env.USE_PRISMA_DAL = "false";

import ExcelJS from "exceljs";

const { db } = await import("../src/lib/server/store.ts");
type StoredTxn = import("../src/lib/server/store.ts").StoredTxn;
const { startOfEatDay, eatDateLabel, EAT_OFFSET_MS } = await import("../src/lib/server/report-money.ts");
const { currentPackPeriod, currentEatMonth, packPeriodBounds } = await import("../src/lib/server/report-pack.ts");
const { REPORT_CATALOGUE, reportCoverage, isWindowedReport, buildDailyOps, buildFiuSar, buildGbtMonthly, buildSxRegister, buildKycReverify } =
  await import("../src/lib/server/reports/catalogue.ts");
const { asOf, calendarMonth, cumulative, eatDay, monthCompleteness, selectedWindow, sinceGenesis } =
  await import("../src/lib/server/reports/coverage.ts");
type Coverage = import("../src/lib/server/reports/coverage.ts").Coverage;
type CoverageKind = import("../src/lib/server/reports/coverage.ts").CoverageKind;
const { renderXlsx } = await import("../src/lib/server/reports/xlsx.ts");
const { renderPdf } = await import("../src/lib/server/reports/pdf.ts");
type Report = import("../src/lib/server/reports/types.ts").Report;

const PROVE_RED = process.argv.includes("--prove-red");

let pass = 0, fail = 0;
const failed: string[] = [];
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) pass++; else { fail++; failed.push(label); }
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};

const DAY = 86_400_000, HOUR = 3_600_000;
const GEN = "usr_windowtruth";
const iso = (ms: number) => new Date(ms).toISOString();
/** The UTC calendar day — the wrong answer §6 exists to catch, computed here so it is nameable. */
const utcDateLabel = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The six kinds, closed. A seventh must be declared in coverage.ts, where every surface sees it. */
const KINDS: CoverageKind[] = ["selected-window", "eat-day", "calendar-month", "as-of", "since-genesis", "cumulative"];
/** ⭐ The kinds that MUST NOT carry bounds — see §3. */
const UNBOUNDED: CoverageKind[] = ["selected-window", "as-of", "since-genesis", "cumulative"];

// ── the instrument: record the bounds every windowed txn read actually asks SQL for ──
const ranges: Array<[number, number]> = [];
const txn = db.txn as unknown as Record<string, (...a: unknown[]) => unknown>;
const realListInRange = txn.listInRange.bind(db.txn);
txn.listInRange = async (...a: unknown[]) => {
  ranges.push([a[0] as number, a[1] as number]);
  return realListInRange(...a);
};
const reset = () => { ranges.length = 0; };

let seq = 0;
async function put(atMs: number, type: StoredTxn["type"], amount: number, over: Partial<StoredTxn> = {}) {
  await db.txn.create({
    id: `txn_wt_${String(++seq).padStart(4, "0")}`,
    userId: "usr_wt_player", walletId: "wlt_wt_player",
    type, status: "CONFIRMED", amount, fee: 0, createdAt: new Date(atMs).toISOString(), ...over,
  } as StoredTxn);
}

/* ══ §0 · THE ZONE DISCRIMINATES, OR THIS RUN IS BLIND ═══════════════════════════════════════ */
console.log("\n── 0 · the instrument ──");
{
  const offsetMin = -new Date().getTimezoneOffset();
  const blind = offsetMin === 0 || offsetMin === 180;
  if (blind) {
    console.log(`BLIND — process zone offset is ${offsetMin} min. §6 cannot tell an EAT stamp from a UTC or local one; refusing to print green.`);
    process.exitCode = 1;
    process.exit(1);
  }
  ok("the process zone is neither UTC nor EAT, so §6 can discriminate", true, `offset ${offsetMin} min (TZ=${process.env.TZ})`);
  ok("CONTROL · the windowed-read recorder is installed and sees a read",
    await (async () => { reset(); await db.txn.listInRange(0, 1); return ranges.length === 1; })(),
    "an uninstalled recorder would make §4 pass on zero evidence");
}

/* ══ §1 · EVERY ENTRY DECLARES A CONTRACT ════════════════════════════════════════════════════
 * ⭐ Read off the registry, so a NINTH report cannot ship with a blank coverage line on its card.
 * `as const satisfies` already makes a missing `coverage` a compile error; this is the runtime
 * half — it also checks the declaration is USABLE (three non-empty renderings), which the type
 * cannot. */
type Entry = { name?: string; coverage?: Coverage };
function assertDeclares(entries: Record<string, Entry>, now: number, tag = "") {
  const ids = Object.keys(entries);
  ok(`${tag}every catalogue entry declares a coverage contract`,
    ids.length > 0 && ids.every((id) => !!entries[id].coverage),
    `${ids.filter((id) => !entries[id].coverage).join(", ") || "all declared"} (${ids.length} entries)`);
  ok(`${tag}every declared kind is one of the six`,
    ids.every((id) => {
      const k = entries[id].coverage?.kind;
      return !!k && KINDS.includes(k);
    }),
    ids.map((id) => entries[id].coverage?.kind ?? "MISSING").join(" · "));
  ok(`${tag}every contract renders three non-empty forms (describe · short · statement)`,
    ids.every((id) => {
      const c = entries[id].coverage;
      if (!c) return false;
      return [c.describe(now), c.short(now), c.statement(now)].every((s) => typeof s === "string" && s.trim().length > 0);
    }));
}
console.log("\n── 1 · every entry declares a coverage contract ──");
{
  const now = Date.now();
  assertDeclares(REPORT_CATALOGUE as unknown as Record<string, Entry>, now);
  /* ⚠️ DISTINCT, NOT MERELY PRESENT. Nine cards all reading "Covers the selected window" would
     satisfy "is non-empty" and tell an officer nothing. One phrase per KIND is the real property:
     a cumulative document and a calendar-month filing must not describe themselves alike. */
  const byKind = new Map<string, Set<string>>();
  for (const id of Object.keys(REPORT_CATALOGUE)) {
    const c = reportCoverage(id as keyof typeof REPORT_CATALOGUE);
    if (!byKind.has(c.kind)) byKind.set(c.kind, new Set());
    byKind.get(c.kind)!.add(c.describe(now));
  }
  const phrases = [...byKind.values()].flatMap((s) => [...s]);
  ok("each kind describes itself in exactly one way, and no two kinds share a phrase",
    [...byKind.values()].every((s) => s.size === 1) && new Set(phrases).size === phrases.length,
    phrases.join(" | "));
}

/* ══ §2 · A BOUNDED KIND'S BOUNDS ARE HALF-OPEN AND EAT-ALIGNED ══════════════════════════════
 * 🔴 The class this pins: a month boundary computed at UTC midnight is 21:00 EAT the previous
 * day, so three hours of transactions land in the wrong statutory return. `packPeriodBounds`
 * carries its own ⛔ about the offset being imported and not retyped; this asserts the result. */
function assertEatAligned(c: Coverage, now: number, tag = "") {
  const b = c.bounds!(now);
  ok(`${tag}${c.kind} · start sits exactly on an EAT midnight`,
    startOfEatDay(b.start) === b.start,
    `${iso(b.start)} — EAT midnight would be ${iso(startOfEatDay(b.start))}`);
  ok(`${tag}${c.kind} · end sits exactly on an EAT midnight (half-open, so it is the NEXT period's start)`,
    startOfEatDay(b.end) === b.end,
    iso(b.end));
  ok(`${tag}${c.kind} · the window is positive and the offset is EAT, not UTC`,
    b.end > b.start && (b.start + EAT_OFFSET_MS) % DAY === 0,
    `${iso(b.start)} → ${iso(b.end)}`);
}
console.log("\n── 2 · bounded kinds are half-open and EAT-aligned ──");
{
  const now = Date.now();
  assertEatAligned(eatDay(), now);
  ok("eat-day spans exactly 24 hours",
    (() => { const b = eatDay().bounds!(now); return b.end - b.start === DAY; })());
  assertEatAligned(calendarMonth(), now);
  ok("calendar-month opens on the FIRST of its month and closes on the first of the next",
    (() => {
      const p = currentPackPeriod(now);
      const b = calendarMonth().bounds!(now);
      return eatDateLabel(b.start) === `${p}-01` && eatDateLabel(b.end - 1).startsWith(p);
    })(),
    (() => { const b = calendarMonth().bounds!(now); return `${eatDateLabel(b.start)} → ${eatDateLabel(b.end - 1)} inclusive`; })());
}

/* ══ §3 · AN UNBOUNDED KIND DECLARES NO BOUNDS ═══════════════════════════════════════════════
 * ⛔ THE POINT OF THE WHOLE TYPE. A point-in-time register has no window; inventing one so the
 * shape looks uniform would hand §4 a pair of numbers to agree with and make the guard unable to
 * fail on exactly the four reports that shipped with no stated coverage at all. */
function assertNoBounds(pairs: Array<[CoverageKind, Coverage]>, tag = "") {
  for (const [kind, c] of pairs) {
    ok(`${tag}${kind} declares NO bounds — an invented window is worse than none`,
      c.bounds === undefined,
      c.bounds ? `bounds() present: ${JSON.stringify(c.bounds(Date.now()))}` : "undefined");
  }
}
console.log("\n── 3 · unbounded kinds declare no bounds ──");
{
  assertNoBounds([
    ["selected-window", selectedWindow()],
    ["as-of", asOf()],
    ["since-genesis", sinceGenesis(25_000)],
    ["cumulative", cumulative()],
  ]);
  ok("…and every registry entry of an unbounded kind agrees",
    Object.keys(REPORT_CATALOGUE).every((id) => {
      const c = reportCoverage(id as keyof typeof REPORT_CATALOGUE);
      return UNBOUNDED.includes(c.kind) ? c.bounds === undefined : typeof c.bounds === "function";
    }));
}

/* ══ §4 · THE DECISIVE ONE ═══════════════════════════════════════════════════════════════════
 * The bounds the builder handed to SQL == the bounds its declaration claims == the EAT dates the
 * document prints. Three independent derivations; agreement cannot be bought in one of them. */
async function assertReadMatchesDeclared(
  label: string,
  build: () => Promise<Report>,
  declared: { start: number; end: number },
  expectInPeriod: string[],
  tag = "",
) {
  reset();
  const r = await build();
  ok(`${tag}🔴 ${label} reads exactly the window its coverage declares`,
    ranges.length > 0 && ranges.every(([s, e]) => s === declared.start && e === declared.end),
    `declared ${iso(declared.start)} → ${iso(declared.end)} · read ${ranges.map(([s, e]) => `${iso(s)} → ${iso(e)}`).join(" ; ") || "(nothing)"}`);
  ok(`${tag}…and the period it PRINTS names that same window`,
    expectInPeriod.every((frag) => r.meta.period.includes(frag)),
    `period "${r.meta.period}" · expected to contain ${expectInPeriod.map((f) => `"${f}"`).join(" + ")}`);
  ok(`${tag}…and the period is not the empty promise a reader cannot check`,
    r.meta.period.trim().length > 10 && /\d{4}-\d{2}|\d{4}/.test(r.meta.period),
    r.meta.period);
  return r;
}
console.log("\n── 4 · the window read IS the window declared IS the window printed ──");
{
  const dayStart = startOfEatDay(Date.now());
  const dayEnd = dayStart + DAY;
  // ⭐ A row ON each bound — the only place a bounded read can disagree with the filter it replaces.
  await put(dayStart - 1, "BET_PLACED", -1_000);
  await put(dayStart, "BET_PLACED", -2_000);
  await put(dayStart + 5 * HOUR, "DEPOSIT", 50_000);
  await put(dayEnd - 1, "BET_PLACED", -4_000);
  await put(dayEnd, "BET_PLACED", -8_000);

  const declaredDay = reportCoverage("daily-ops").bounds!(Date.now());
  await assertReadMatchesDeclared("daily-ops", () => buildDailyOps(GEN), declaredDay, [eatDateLabel(dayStart)]);
  if (startOfEatDay(Date.now()) !== dayStart) {
    console.log("⚠️ the clock crossed EAT midnight mid-run — the fixture no longer names today. Re-run.");
    process.exit(1);
  }

  const p = currentPackPeriod(Date.now());
  const declaredMonth = reportCoverage("fiu-sar").bounds!(Date.now());
  ok("the fiu-sar declaration agrees with packPeriodBounds, the statutory source",
    declaredMonth.start === packPeriodBounds(p).start && declaredMonth.end === packPeriodBounds(p).end,
    `${iso(declaredMonth.start)} → ${iso(declaredMonth.end)}`);
  await assertReadMatchesDeclared("fiu-sar", () => buildFiuSar(GEN), declaredMonth, [`${p}-01`]);
}

/* ══ §4b · A CALENDAR-MONTH REPORT CAN BE ASKED FOR **WHICH** MONTH ══════════════════════════
 * 🔴 `buildGbtMonthly` and `buildFiuSar` always took a `packPeriod` and NO caller ever passed one,
 * so the route could only ever serve `currentPackPeriod()`. The pack card's Download sat beside
 * that card's own `periodLabel` and sha256 and, once the EAT month rolled over, handed over a
 * DIFFERENT MONTH than the heading above it.
 * ⭐ The assertion is a DELTA: ask for a month that is NOT the default and require the printed
 * period AND the bounds read from SQL to BOTH move to it. "It accepted a period param" would pass
 * against a builder that ignored it. */
function assertKindsAreDisjoint(tag = "") {
  /* ⛔ THE ROUTE PASSES `win ?? packPeriod` INTO ONE ARGUMENT, so a report that was both windowed
     and calendar-month would receive whichever happened to be set — a `{start,end}` object where a
     `YYYY-MM` string was expected.
     ⭐ THE TWO SIDES ARE DIFFERENT MECHANISMS, which is exactly why this can drift: `windowed` is a
     FLAG on the registry entry and `calendar-month` is a KIND on its coverage. Nothing but this
     assertion stops one entry carrying both. Testing kind-vs-kind instead would be vacuous — a
     single field cannot hold two values, so it could never fail. */
  const ids = Object.keys(REPORT_CATALOGUE);
  const windowed = ids.filter((id) => isWindowedReport(id));
  const monthly = ids.filter((id) => reportCoverage(id as never).kind === "calendar-month");
  const both = ids.filter((id) => isWindowedReport(id) && reportCoverage(id as never).kind === "calendar-month");
  ok(`${tag}🔴 no report is BOTH windowed and calendar-month — the route's single build argument depends on it`,
    both.length === 0,
    both.length ? `BOTH: ${both.join(", ")}` : `windowed: ${windowed.join(", ")} · calendar-month: ${monthly.join(", ")}`);
  ok(`${tag}CONTROL · both populations are non-empty, so the disjointness above is not vacuous`,
    windowed.length > 0 && monthly.length > 0, `${windowed.length} windowed, ${monthly.length} monthly`);
}
console.log("\n── 4b · a calendar-month report honours an explicit period ──");
{
  assertKindsAreDisjoint();
  const now = Date.now();
  const deflt = currentPackPeriod(now);
  // The month BEFORE the default — complete, in the past, and provably not what the default gives.
  const [dy, dm] = deflt.split("-").map(Number);
  const prev = new Date(Date.UTC(dy, dm - 2, 1));
  const asked = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;
  ok("CONTROL · the month asked for is NOT the builder's default, so the delta below is real",
    asked !== deflt, `asked ${asked} · default ${deflt}`);

  reset();
  const r = await buildFiuSar(GEN, asked);
  const want = packPeriodBounds(asked);
  ok("🔴 an explicit pack period moves the bounds the builder reads",
    ranges.length > 0 && ranges.every(([s, e]) => s === want.start && e === want.end),
    `asked ${asked} → read ${ranges.map(([s, e]) => `${iso(s)} → ${iso(e)}`).join(" ; ") || "(nothing)"}`);
  ok("🔴 …and moves the period the document PRINTS",
    r.meta.period.includes(`${asked}-01`) && !r.meta.period.includes(`${deflt}-01`),
    r.meta.period);
}

/* ══ §4c · AN UNFINISHED MONTH IS A PREVIEW, NEVER A FILING ══════════════════════════════════
 * 🔴 The current month is a legitimate thing to ask for and a dangerous thing to receive silently:
 * a month-to-date total under a bare "September 2026" heading reads exactly like September's
 * statutory return. Four things have to change together, and any one of them left in filing dress
 * is enough to get an incomplete month signed and submitted.
 * ⭐ Every assertion is a DELTA against the SAME builder run on a COMPLETE month, so "the partial
 * document says PARTIAL" cannot pass by the complete one saying it too. */
async function assertPartialIsNotAFiling(monthKey: string, tag = "") {
  const c = monthCompleteness(monthKey, Date.now());
  ok(`${tag}CONTROL · the month under test really is unfinished, so this section is not vacuous`,
    c.partial && c.daysRemaining > 0, `${monthKey} · partial=${c.partial} daysRemaining=${c.daysRemaining}`);

  /* ⚠️ TWO CLOCKS, AND THE FIRST DRAFT USED BOTH. A partial window is clamped to the builder's OWN
     `now`; re-deriving `bounds(Date.now())` out here produces a later instant and the equality
     fails on correct code — measured, and it cost a red run. `/admin/finance` carries the same
     ruling for the same reason ("ONE now FOR THE PAGE AND FOR THE EXPORT"). Bracket the build
     instead and assert the window ENDS INSIDE that bracket: clock-robust, and a stronger claim
     than equality — it pins the start to the month, the end to this build's own present, and the
     whole window strictly short of the month's nominal end. */
  const monthStart = packPeriodBounds(monthKey).start;
  reset();
  const t0 = Date.now();
  const partial = await buildGbtMonthly(GEN, monthKey);
  const t1 = Date.now();
  ok(`${tag}🔴 the window STOPS AT NOW, it does not read to the month's nominal end`,
    ranges.length > 0 && ranges.every(([s, e]) => s === monthStart && e >= t0 && e <= t1 && e < c.monthEnd),
    `read ${ranges.map(([s, e]) => `${iso(s)} → ${iso(e)}`).join(" ; ") || "(nothing)"} · month ends ${iso(c.monthEnd)}`);
  ok(`${tag}🔴 the printed period says PARTIAL and names the days remaining`,
    /PARTIAL/.test(partial.meta.period) && partial.meta.period.includes(String(c.daysRemaining)),
    partial.meta.period);
  ok(`${tag}🔴 the TITLE says partial — the first thing a reader sees`,
    /PARTIAL/i.test(partial.title), partial.title);
  ok(`${tag}🔴 it is classified Internal, not a regulator hand-off`,
    partial.meta.classification === "Internal", String(partial.meta.classification));
  ok(`${tag}🔴 it carries NO attestation block — nothing to sign`,
    partial.signatures === undefined, `signatures: ${partial.signatures ? "PRESENT" : "absent"}`);
  ok(`${tag}🔴 a note states the month is incomplete and must not be submitted`,
    (partial.notes ?? []).some((n) => /INCOMPLETE MONTH/.test(n) && /not be submitted/i.test(n)));
  /* 🔴 CAUGHT BY READING THE RENDERED PDF, NOT BY A SUITE. Two section descriptions still said
     "TZS totals for the STATUTORY CALENDAR MONTH" on a document whose figures covered part of one.
     A stated methodology that contradicts the computed one is the same class `test:report-note-truth`
     exists for, one level down at the section. */
  ok(`${tag}🔴 no section still calls a part-month "the statutory calendar month"`,
    !(partial.sections ?? []).some((sec) => /statutory calendar month/i.test(sec.description ?? "")),
    (partial.sections ?? []).filter((sec) => /statutory calendar month/i.test(sec.description ?? "")).map((sec) => sec.title).join(", ") || "none do");
  return partial;
}
console.log("\n── 4c · an unfinished month is a preview, never a filing ──");
{
  const nowMs = Date.now();
  const current = currentEatMonth(nowMs);
  const partial = await assertPartialIsNotAFiling(current);

  /* ⭐ THE COMPLETE MONTH IS THE CONTROL. Without it, every assertion above would also pass on a
     builder that stamped PARTIAL on everything it produced. */
  const done = currentPackPeriod(nowMs);
  const complete = await buildGbtMonthly(GEN, done);
  ok("CONTROL · the COMPLETE month is none of those things — no PARTIAL, hand-off, signed",
    !/PARTIAL/i.test(complete.title) && !/PARTIAL/.test(complete.meta.period)
      && complete.meta.classification === "Regulator hand-off" && complete.signatures !== undefined,
    `title="${complete.title}" class=${complete.meta.classification} signatures=${complete.signatures ? "present" : "ABSENT"}`);
  ok("CONTROL · and the two really are different months, so the pair discriminates",
    current !== done && partial.meta.period !== complete.meta.period, `${current} vs ${done}`);
  ok("a complete month's window is NOT clamped — it ends on the month's own EAT midnight",
    calendarMonth(done).bounds!(nowMs).end === packPeriodBounds(done).end);
}

/* ══ §5 · BOTH RENDERERS CARRY THE PERIOD ════════════════════════════════════════════════════
 * 🔴 `meta.period` was set by all nine builders and printed by neither renderer. A grep for
 * `meta.period` in pdf.ts would "prove" the fix and prove nothing about the page.
 * ⭐ XLSX is read BACK with exceljs — the real cell. The PDF is proven by a DELTA: render the same
 * report twice, changing ONLY the period, and the bytes must move. A renderer that ignores the
 * field produces two identical-size documents, which is exactly the red case below. */
const BASE_REPORT = (period: string): Report => ({
  title: "Window truth probe",
  subtitle: "A probe, not a filing",
  reference: "PROBE-20260928-WT0001",
  meta: { generatedAt: new Date(0).toISOString(), generatedBy: GEN, period, classification: "Internal" },
  summary: [{ label: "Rows", num: 1, format: "integer" }],
  sections: [{ title: "Rows", columns: [{ key: "a", header: "A", width: 10 }], rows: [{ a: "x" }] }],
} as unknown as Report);

async function assertRenderersCarry(shortPeriod: string, longPeriod: string, tag = "") {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await renderXlsx(BASE_REPORT(shortPeriod))) as unknown as ArrayBuffer);
  const a7 = String(wb.worksheets[0].getCell("A7").value ?? "");
  ok(`${tag}🔴 the XLSX meta cell names the period`, a7.includes(shortPeriod), `A7 = "${a7}"`);

  const small = Buffer.from(await renderPdf(BASE_REPORT(shortPeriod)));
  const big = Buffer.from(await renderPdf(BASE_REPORT(longPeriod)));
  const again = Buffer.from(await renderPdf(BASE_REPORT(shortPeriod)));
  /* ⭐ NO BYTE THRESHOLD, AND THAT IS THE POINT. A first draft asserted "the PDF grew by more than
     500 bytes" and FAILED on a correct renderer: +2,441 characters of repetitive padding compressed
     down to +443 bytes, so the number it chose was measuring zlib, not the document. The control
     below then showed the real property — this renderer is byte-DETERMINISTIC for identical input
     (42,936 vs 42,936, exactly equal). So "the bytes differ AT ALL" is a complete proof that the
     period reached the page, and it needs no magic number to tolerate. ⛔ Do not reintroduce a
     threshold here; a tolerance would blind the assertion (and a compressible string would sail
     under it). */
  ok(`${tag}🔴 changing ONLY the period changes the PDF, so the period reaches the page`,
    !big.equals(small),
    `${small.length} → ${big.length} bytes for +${longPeriod.length - shortPeriod.length} chars`);
  ok(`${tag}CONTROL · the renderer is byte-deterministic, so any difference above IS the period`,
    again.equals(small),
    `${small.length} vs ${again.length} bytes · identical: ${again.equals(small)}`);
}
console.log("\n── 5 · both renderers carry the period onto the artifact ──");
{
  await assertRenderersCarry(
    "September 2026 · 2026-09-01 → 2026-09-30 (EAT)",
    `September 2026 · 2026-09-01 → 2026-09-30 (EAT) ${"· padding to force the line to wrap and the document to grow ".repeat(40)}`,
  );
}

/* ══ §6 · THE STAMPS ARE EAT, NOT UTC ════════════════════════════════════════════════════════
 * 🔴 `makeReference` built its date from `toISOString().slice(0, 10)` — the UTC day — on documents
 * whose every figure is EAT. Between 21:00 and midnight EAT, INCLUDING EVERY MONTH END, the
 * reference printed on a statutory filing and stored in the audit row beside it named YESTERDAY.
 * `kyc-reverify` and `rg-engagement` stamped `meta.period` the same way; `reportFilename` in
 * brand.ts had already been fixed for exactly this, and its siblings were left standing.
 * ⭐ The clock is pinned to an instant where the EAT day and the UTC day DIFFER, so the right
 * answer and the wrong answer are two different strings. Unpinned, this section is vacuous for 21
 * hours out of every 24. */
const PINNED = Date.UTC(2026, 8, 28, 21, 30); // 2026-09-28T21:30Z = 2026-09-29 00:30 EAT
/** Dashes out, so one predicate reads both `SXR-20260929-…` and `… 2026-09-29 00:30 EAT`. */
const norm = (s: string) => s.replace(/-/g, "");

/**
 * ⭐ THE PREDICATE IS OVER A STRING, NOT OVER THE BUILDERS. That is what lets the red proof plant
 * the PRE-FIX implementation — one line, `toISOString().slice(0, 10)` — and require this same
 * assertion to reject it AT THE SAME INSTANT the real code passes it. A first draft instead pinned
 * the clock to an hour where the EAT day and the UTC day coincide and called the resulting failure
 * a red control. It was not one: it proved only that the assertion is unsatisfiable when the two
 * days are the same string, which is a statement about the calendar, not about the code. Its own
 * "the two days really are different" control went red to say so.
 */
function assertStampIsEat(what: string, stamp: string, nowStub: number, tag = "") {
  const eat = eatDateLabel(nowStub); // 2026-09-29
  const utc = utcDateLabel(nowStub); // 2026-09-28
  ok(`${tag}🔴 ${what} names the EAT day, never the UTC day`,
    norm(stamp).includes(norm(eat)) && !norm(stamp).includes(norm(utc)),
    `"${stamp}" · EAT ${eat} / UTC ${utc}`);
}
/** The stamps the real builders produce at `nowStub`, with the clock pinned around the build. */
async function realStamps(nowStub: number) {
  const realNow = Date.now;
  Date.now = () => nowStub;
  try {
    const sx = await buildSxRegister(GEN);
    const kyc = await buildKycReverify(GEN);
    return { pinnedOk: Date.now() === nowStub, sxRef: sx.reference, sxPeriod: sx.meta.period, kycPeriod: kyc.meta.period };
  } finally {
    Date.now = realNow;
  }
}
console.log("\n── 6 · every stamp is the East Africa day ──");
{
  ok("CONTROL · at the pinned instant the EAT day and the UTC day really are different",
    eatDateLabel(PINNED) !== utcDateLabel(PINNED),
    `EAT ${eatDateLabel(PINNED)} vs UTC ${utcDateLabel(PINNED)} — without this the section proves nothing`);
  const s = await realStamps(PINNED);
  ok("CONTROL · Date.now was pinned, so the builders saw the pinned instant", s.pinnedOk);
  assertStampIsEat("the reference on a filing", s.sxRef, PINNED);
  assertStampIsEat("sx-register's point-in-time period", s.sxPeriod, PINNED);
  assertStampIsEat("kyc-reverify's as-of period", s.kycPeriod, PINNED);
}

/* ══ VERDICT ═════════════════════════════════════════════════════════════════════════════════ */
if (!PROVE_RED) {
  console.log(`\nreport-window-truth: ${pass} passed, ${fail} failed`);
  if (fail) { console.log(`FAILED: ${failed.join(" | ")}`); process.exitCode = 1; }
  else { console.log("OK — every report states the window it covers, and the window it states is the window it read."); process.exitCode = 0; }
} else {
  /* ══ RED PROOF ═════════════════════════════════════════════════════════════════════════════
   * Each case plants ONE defect and names the assertion that MUST fire. A case that stays green,
   * or goes red on some OTHER assertion, is a problem: it would mean the section is satisfied by
   * something other than the property it claims to check.
   * ⭐ EVERY DEFECT IS A DELTA, not an absence. "Did it report anything" passes against a broken
   * guard; "did the number MOVE by exactly this much" does not. */
  console.log("\n══ RED PROOF — each planted defect must break its named assertion ══");
  const problems: string[] = [];
  const now = Date.now();

  /** Wrap a coverage with one field replaced. */
  const withDefect = (c: Coverage, over: Partial<Coverage>): Coverage => ({ ...c, ...over });

  type RedCase = { name: string; expect: string; run: (tag: string) => Promise<void> | void };
  const CASES: RedCase[] = [
    {
      name: "an entry loses its coverage declaration (the ninth report ships blank)",
      expect: "every catalogue entry declares a coverage contract",
      run: (tag) => {
        const broken = { ...(REPORT_CATALOGUE as unknown as Record<string, Entry>), "tenth-report": { name: "Tenth" } };
        assertDeclares(broken, now, tag);
      },
    },
    {
      name: "eat-day bounds slip by one hour (the 03:00→03:00 'day' the UTC container used to produce)",
      expect: "🔴 daily-ops reads exactly the window its coverage declares",
      run: async (tag) => {
        const base = eatDay();
        const slipped = withDefect(base, { bounds: (n) => { const b = base.bounds!(n); return { start: b.start + HOUR, end: b.end + HOUR }; } });
        await assertReadMatchesDeclared("daily-ops", () => buildDailyOps(GEN), slipped.bounds!(Date.now()), [eatDateLabel(startOfEatDay(Date.now()))], tag);
      },
    },
    {
      name: "calendar-month bounds drop the EAT offset (UTC midnights — three hours into the wrong return)",
      expect: "calendar-month · start sits exactly on an EAT midnight",
      run: (tag) => {
        const base = calendarMonth();
        const utcMidnights = withDefect(base, { bounds: (n) => { const b = base.bounds!(n); return { start: b.start + EAT_OFFSET_MS, end: b.end + EAT_OFFSET_MS }; } });
        assertEatAligned(utcMidnights, now, tag);
      },
    },
    {
      name: "a point-in-time kind is given invented bounds so every kind 'looks uniform'",
      expect: "as-of declares NO bounds — an invented window is worse than none",
      run: (tag) => {
        const invented = withDefect(asOf(), { bounds: (n) => ({ start: n - 30 * DAY, end: n }) });
        assertNoBounds([["as-of", invented]], tag);
      },
    },
    {
      name: "a calendar-month builder ignores the period handed to it (the state every caller shipped in)",
      expect: "🔴 an explicit pack period moves the bounds the builder reads",
      run: async (tag) => {
        /* The defect is planted at the CALL: drop the period argument, which is exactly what every
           caller did until 2026-09-28, and require the delta assertion to notice that the bounds
           never left the default month. */
        const deflt = currentPackPeriod(Date.now());
        const [dy, dm] = deflt.split("-").map(Number);
        const prev = new Date(Date.UTC(dy, dm - 2, 1));
        const asked = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;
        reset();
        const r = await buildFiuSar(GEN); // ⛔ the period is NOT passed
        const want = packPeriodBounds(asked);
        ok(`${tag}🔴 an explicit pack period moves the bounds the builder reads`,
          ranges.length > 0 && ranges.every(([s, e]) => s === want.start && e === want.end),
          `asked ${asked} · read ${ranges.map(([s, e]) => `${iso(s)} → ${iso(e)}`).join(" ; ") || "(nothing)"}`);
        ok(`${tag}🔴 …and moves the period the document PRINTS`,
          r.meta.period.includes(`${asked}-01`) && !r.meta.period.includes(`${deflt}-01`), r.meta.period);
      },
    },
    {
      name: "the partial-month guard is pointed at a FINISHED month (the month-in-progress check goes blind)",
      expect: "CONTROL · the month under test really is unfinished, so this section is not vacuous",
      run: async (tag) => {
        /* ⭐ THE PLANT IS THE POPULATION, AND THAT IS THE RIGHT PLANT HERE. §4c's every claim is
           about a month that has not ended; aimed at a finished one it would report "no PARTIAL in
           the title" as a defect in correct code. Its vacuity control must fire FIRST and name the
           reason, so a future session that changes `currentEatMonth` learns the section went blind
           instead of reading six confident failures about nothing. */
        await assertPartialIsNotAFiling(currentPackPeriod(Date.now()), tag);
      },
    },
    {
      name: "an unfinished month is built as a signable filing (no PARTIAL, hand-off class, attestation block)",
      expect: "🔴 the TITLE says partial — the first thing a reader sees",
      run: (tag) => {
        /* The pre-2026-09-28 shape, planted as a document rather than by breaking the builder:
           a month-to-date total wearing exactly the dress of a complete statutory return. */
        const asIfFiling = {
          title: "Monthly report",
          meta: { period: "September 2026 · 2026-09-01 → 2026-09-30 (EAT)", classification: "Regulator hand-off" },
          signatures: [{ role: "Prepared by", name: "Someone" }],
          notes: ["Source: the Transaction, User and KYC tables."],
        } as unknown as Report;
        const c = monthCompleteness(currentEatMonth(Date.now()), Date.now());
        ok(`${tag}CONTROL · the month under test really is unfinished, so this section is not vacuous`, c.partial && c.daysRemaining > 0);
        ok(`${tag}🔴 the TITLE says partial — the first thing a reader sees`, /PARTIAL/i.test(asIfFiling.title), asIfFiling.title);
        ok(`${tag}🔴 it is classified Internal, not a regulator hand-off`, asIfFiling.meta.classification === "Internal", String(asIfFiling.meta.classification));
        ok(`${tag}🔴 it carries NO attestation block — nothing to sign`, asIfFiling.signatures === undefined);
        ok(`${tag}🔴 a note states the month is incomplete and must not be submitted`,
          (asIfFiling.notes ?? []).some((n) => /INCOMPLETE MONTH/.test(n) && /not be submitted/i.test(n)));
      },
    },
    {
      name: "a report is declared BOTH windowed and calendar-month (the route would hand a builder the wrong argument shape)",
      expect: "🔴 no report is BOTH windowed and calendar-month — the route's single build argument depends on it",
      run: (tag) => {
        /* ⭐ THE PLANT ADDS THE FLAG, IT DOES NOT MOVE THE KIND. A first version flipped
           `finance-window`'s kind to calendar-month, which EMPTIED the windowed population — the
           disjointness then passed trivially and the vacuity control fired instead. A plant that
           removes the population is not a plant on the property; it has to produce the exact
           overlap the assertion looks for. */
        const reg = REPORT_CATALOGUE as unknown as Record<string, { windowed?: boolean }>;
        reg["gbt-monthly"].windowed = true; // now calendar-month AND windowed
        try { assertKindsAreDisjoint(tag); } finally { delete reg["gbt-monthly"].windowed; }
      },
    },
    {
      name: "a renderer ignores meta.period (the state both renderers shipped in)",
      expect: "🔴 changing ONLY the period changes the PDF, so the period reaches the page",
      run: async (tag) => {
        /* The defect is simulated at the INPUT: if the renderer dropped the field, a long period
           and a short one would produce the same-size document. Feeding the same period twice
           reproduces exactly that observation, so the delta assertion must go red. */
        const same = "September 2026 · 2026-09-01 → 2026-09-30 (EAT)";
        await assertRenderersCarry(same, same, tag);
      },
    },
    {
      name: "the stamps go back to the UTC day (makeReference and meta.period before 2026-09-28)",
      expect: "🔴 the reference on a filing names the EAT day, never the UTC day",
      run: (tag) => {
        /* ⭐ THE ACTUAL PRE-FIX LINE, at the SAME instant the real code passes: the UTC calendar
           day via `toISOString().slice(0, 10)`. Nothing about the calendar is bent — EAT is still
           2026-09-29 here and UTC is still 2026-09-28 — so the assertion fires on the defect and
           on nothing else. */
        const preFixDay = new Date(PINNED).toISOString().slice(0, 10).replace(/-/g, "");
        assertStampIsEat("the reference on a filing", `SXR-${preFixDay}-WTRUTH`, PINNED, tag);
        assertStampIsEat("sx-register's point-in-time period", `As of ${new Date(PINNED).toISOString().slice(0, 10)}`, PINNED, tag);
      },
    },
  ];

  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`\n── red case ${i + 1}: ${c.name}`);
    await c.run(tag);
    const wanted = `${tag}${c.expect}`;
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(wanted)) problems.push(`case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}`);
  }

  const caught = CASES.length - problems.length;
  console.log(`\n${caught}/${CASES.length} caught`);
  if (problems.length) {
    console.log("\nPROBLEMS:");
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE — every section can fail, and fails on its own subject.");
    process.exitCode = 0;
  }
}
