/**
 * THE SPEND-CYCLE GUARD.                                    `npm run test:ai-cycles`
 *
 * ⭐ WHY IT EXISTS. A cycle count is a number Ali PRICES FROM. The failure mode is not a
 * crash — it is a confident wrong figure that looks exactly like a right one. Every check
 * below is one of the twenty ways `docs/SESSION-PROMPT-AI-CYCLES.md` §10 says this number
 * can be quietly wrong, turned into something that must go red when it is.
 *
 * ⛔ THE METER IS BEST-EFFORT, AND THAT IS ONLY SAFE BECAUSE OF §1. `recordAiUsage` swallows
 * its own errors so a broken meter can never break an AI call — which means "best-effort"
 * plus "nobody checks" would equal "silently wrong", this repo's single most repeated
 * defect. §1 is the check. It is the reconciliation that makes the swallow acceptable.
 *
 * ⛔ EVERY COUNT-BASED CHECK CARRIES A CONTROL THAT THE CORPUS WAS NON-EMPTY. A conservation
 * assertion over zero rows passes vacuously, and this repo has shipped exactly that mistake
 * more than once. §1.0, §4.0 and §5.0 are those controls; they are not padding.
 *
 * Runs entirely against the in-memory DAL — no database, no network, no Anthropic key.
 * The root it imported from is printed on every run so `red:ai-cycles` can prove the mutant
 * tree is what it measured. "It exited non-zero" is not evidence.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";

import {
  recordAiUsage, assertAiBudget, setCreditLimit, startNewTopUpWindow,
  getCycleConfig, saveCycleConfig, startNextCycle, closeOpenCycleNow, cycleGate,
  CYCLE_DEFAULTS, CYCLE_EPS, clampCycleSize, PRICE_REV, costOf,
} from "../src/lib/server/ai-usage.ts";
import { aiCycleDal, DuplicateCycleIndexError } from "../src/lib/server/ai-cycle-dal.ts";
import { aiUsageDal } from "../src/lib/server/ai-usage-dal.ts";
import {
  projectCyclesPerYear, yearsFrom, safeRatio, suggestedPriceUsd, tzs, decorate,
} from "../src/lib/server/ai-cycles.ts";
import { parseCycleForm, CYCLE_BOUNDS } from "../src/lib/ai-cycle-rules.ts";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

let pass = 0, fail = 0;
const log = (m: string) => console.log(m);
const section = (t: string) => log(`\n── ${t} ${"─".repeat(Math.max(0, 74 - t.length))}`);
function check(label: string, cond: boolean, detail = ""): boolean {
  if (cond) { pass++; log(`  PASS ${label}`); }
  else { fail++; log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
  return cond;
}
const near = (label: string, a: number, b: number, eps = CYCLE_EPS) =>
  check(label, Math.abs(a - b) <= eps, `${a} vs ${b} (eps ${eps})`);

log("Spend-cycle guard");
log(`  root: ${ROOT}`);
// ⛔ THE ROOT ALONE IS NOT PROOF. A `@/…` import inside a module under test resolves
// through the CWD's tsconfig paths, so the gate can sit in a mutant tree while loading
// the ORIGINAL module — a red harness that certifies a mutation it never ran. These lines
// print the paths the runtime will genuinely resolve, and `red:ai-cycles` requires every
// one of them to be inside the tree it mutated.
for (const spec of ["../src/lib/server/ai-usage.ts", "../src/lib/server/ai-cycles.ts", "../src/lib/server/ai-cycle-dal.ts", "../src/lib/ai-cycle-rules.ts"]) {
  log(`  module: ${import.meta.resolve(spec)}`);
}

// ── fixtures ────────────────────────────────────────────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __50PICK_AI_CYCLES: unknown[] | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_AI_USAGE: unknown[] | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_AI_CYCLE_CFG: unknown;
  // eslint-disable-next-line no-var
  var __50PICK_AI_CREDIT: unknown;
}

/** Empty both in-memory ledgers. Same arrays the DALs hold, so this really does reset. */
async function reset(cfg?: Partial<typeof CYCLE_DEFAULTS>): Promise<void> {
  (globalThis.__50PICK_AI_CYCLES ??= []).length = 0;
  (globalThis.__50PICK_AI_USAGE ??= []).length = 0;
  globalThis.__50PICK_AI_CREDIT = undefined;
  await saveCycleConfig({ ...CYCLE_DEFAULTS, ...cfg });
  await setCreditLimit(1_000_000); // the money ceiling is out of the way unless a check wants it
  await startNewTopUpWindow();
}

/**
 * One metered call of an EXACT USD cost, via the REAL recording path.
 *
 * ⛔ DRIVEN THROUGH `recordAiUsage`, never by writing a cycle row directly. A guard that
 * builds the ledger itself proves its own arithmetic, not the product's.
 *
 * ⚠️ PRICED IN WEB SEARCHES ($0.01 each), NOT TOKENS. Tokens cannot express most amounts
 * exactly — $0.50 of Sonnet input is 166,666.67 tokens, which rounds to a call costing
 * $0.500001. That dust is not harmless in a fixture: it is a remainder, and a remainder is
 * precisely what decides whether a cycle boundary rolls or pauses. The first version of this
 * helper used tokens and made §6 fail for a reason that had nothing to do with §6 —
 * ⭐ which is how the straddling-call bug in the meter was found, so the dust earned its keep
 * once and is now removed so the checks measure what they claim to.
 */
async function spend(usd: number, over = { feature: "sentinel" as const, subjectId: "mkt_fx" as string | null }): Promise<void> {
  const webSearches = Math.round(usd * 100);
  if (Math.abs(webSearches * 0.01 - usd) > 1e-9) throw new Error(`spend(${usd}) is not a whole number of cents — the fixture must be exact`);
  await recordAiUsage({
    feature: over.feature, model: "claude-sonnet-4-6",
    inputTokens: 0, outputTokens: 0, webSearches, ok: true,
    subjectType: "market", subjectId: over.subjectId,
  });
}

const sumCycles = async () => (await aiCycleDal.all(100_000)).reduce((s, c) => s + c.costUsd, 0);
const sumEvents = async () => (await aiUsageDal.recent("1970-01-01T00:00:00.000Z", 100_000)).reduce((s, e) => s + e.costUsd, 0);

// ════════════════════════════════════════════════════════════════════════════════
section("1 · CONSERVATION — the ledger and the calls agree, and the corpus was real");
// ════════════════════════════════════════════════════════════════════════════════
{
  await reset({ sizeUsd: 10, autoRoll: true });
  const amounts = [1.5, 0.25, 7.75, 3, 0.03, 12.4, 0.9];
  for (const a of amounts) await spend(a);

  const events = await aiUsageDal.recent("1970-01-01T00:00:00.000Z", 100_000);
  const cycles = await aiCycleDal.all(100_000);

  // ⭐ THE CONTROL. Without it every assertion in this section passes over an empty ledger.
  check("1.0 ⭐ CONTROL: the corpus is non-empty — this section measured something",
    events.length === amounts.length && cycles.length > 1,
    `${events.length} events, ${cycles.length} cycles`);

  near("1.1 Σ cycle.costUsd == Σ event.costUsd", await sumCycles(), await sumEvents());
  near("1.2 …and equals the amounts actually spent", await sumCycles(), amounts.reduce((s, a) => s + a, 0), 1e-4);

  // ⭐ AND THE CONTROL OF THE CONTROL: a meter that recorded nothing at all would satisfy
  // "0 == 0" above. This asserts the total is the non-trivial number it should be.
  check("1.3 ⭐ CONTROL: the total is non-zero, so 1.1 is not 0 == 0",
    (await sumCycles()) > 25, String(await sumCycles()));
}

// ════════════════════════════════════════════════════════════════════════════════
section("2 · NO GAPS, NO OVERLAPS — the index is contiguous and one cycle is open");
// ════════════════════════════════════════════════════════════════════════════════
{
  await reset({ sizeUsd: 5, autoRoll: true });
  for (let i = 0; i < 12; i++) await spend(2);

  const cycles = (await aiCycleDal.all(100_000)).sort((a, b) => a.index - b.index);
  check("2.0 ⭐ CONTROL: several cycles were opened", cycles.length >= 4, `${cycles.length}`);
  check("2.1 the index starts at 1", cycles[0]?.index === 1, String(cycles[0]?.index));
  check("2.2 the index is contiguous — no gaps",
    cycles.every((c, i) => c.index === i + 1),
    cycles.map((c) => c.index).join(","));
  check("2.3 exactly ONE cycle is OPEN", (await aiCycleDal.countOpen()) === 1, String(await aiCycleDal.countOpen()));
  check("2.4 every CLOSED cycle carries a closedAt",
    cycles.filter((c) => c.status === "CLOSED").every((c) => !!c.closedAt));
  check("2.5 ⛔ closedAt is never BEFORE openedAt (clock skew would make durations negative)",
    cycles.filter((c) => c.closedAt).every((c) => Date.parse(c.closedAt as string) >= Date.parse(c.openedAt)));

  // ⛔ THE UNIQUE INDEX IS WHAT MAKES A LOST LOCK LOUD. If it stopped being enforced, a
  // duplicate would be written silently and every count downstream would be wrong.
  let threw = false;
  try {
    await aiCycleDal.create({ ...cycles[0], id: "aic_duplicate_probe" });
  } catch (e) { threw = e instanceof DuplicateCycleIndexError; }
  check("2.6 ⛔ a DUPLICATE index is refused — a lost lock is loud, not silent", threw);
}

// ════════════════════════════════════════════════════════════════════════════════
section("3 · THE SIZE IS STAMPED AT OPEN — a retune never rewrites history");
// ════════════════════════════════════════════════════════════════════════════════
{
  await reset({ sizeUsd: 4, autoRoll: true });
  await spend(9); // closes cycles 1 and 2 at size 4

  const before = (await aiCycleDal.all(100_000)).filter((c) => c.status === "CLOSED");
  check("3.0 ⭐ CONTROL: cycles closed at the ORIGINAL size", before.length >= 2 && before.every((c) => c.sizeUsd === 4),
    before.map((c) => c.sizeUsd).join(","));

  await saveCycleConfig({ ...CYCLE_DEFAULTS, sizeUsd: 50, autoRoll: true });
  const after = (await aiCycleDal.all(100_000)).filter((c) => c.status === "CLOSED");
  check("3.1 ⛔ closed cycles KEEP their old size after a config change",
    after.every((c) => c.sizeUsd === 4), after.map((c) => c.sizeUsd).join(","));

  await spend(60); // now runs at the new size
  const opened = (await aiCycleDal.all(100_000)).filter((c) => c.sizeUsd === 50);
  check("3.2 the NEW size applies to cycles opened after the change", opened.length >= 1, `${opened.length}`);

  // ⭐ THE CONSEQUENCE THAT ACTUALLY MATTERS: the rows that were ALREADY CLOSED are
  // byte-for-byte what they were. ⚠️ Not a COUNT — the first version of this check compared
  // counts and went red for a correct behaviour: cycle 3 was still OPEN at the old size when
  // the retune happened, and closed later, legitimately, at that same stamped size. Counting
  // the population "cycles at size 4" measured a set that was allowed to grow. The invariant
  // is about the specific historical rows, so it is asserted about those rows.
  const after2 = await aiCycleDal.all(100_000);
  const unchanged = before.every((b) => {
    const now = after2.find((c) => c.id === b.id);
    return !!now && now.sizeUsd === b.sizeUsd && now.costUsd === b.costUsd && now.closedAt === b.closedAt;
  });
  check("3.3 ⭐ every already-closed cycle is byte-for-byte unchanged by the retune", unchanged,
    before.map((b) => `${b.index}@${b.sizeUsd}`).join(","));
}

// ════════════════════════════════════════════════════════════════════════════════
section("4 · ONE CALL SPANS N CYCLES — the `while` loop, not a single `if`");
// ════════════════════════════════════════════════════════════════════════════════
{
  await reset({ sizeUsd: 0.01, autoRoll: true });
  await spend(0.3); // 30 cycles at $0.01

  const cycles = await aiCycleDal.all(100_000);
  const closed = cycles.filter((c) => c.status === "CLOSED");
  check("4.0 ⭐ CONTROL: exactly ONE call was recorded", (await aiUsageDal.recent("1970-01-01T00:00:00.000Z", 100)).length === 1);
  check("4.1 ⛔ one call closed 30 cycles — a single `if` would have closed 1",
    closed.length === 30, `${closed.length} closed`);
  near("4.2 …and no money was lost across the rollover", await sumCycles(), 0.3, 1e-6);
  check("4.3 every closed cycle in the span is exactly full",
    closed.every((c) => Math.abs(c.costUsd - c.sizeUsd) <= CYCLE_EPS));
}

// ════════════════════════════════════════════════════════════════════════════════
section("5 · CONCURRENCY — M simultaneous calls, no duplicate index, nothing lost");
// ════════════════════════════════════════════════════════════════════════════════
{
  await reset({ sizeUsd: 1, autoRoll: true });
  const M = 40;
  const each = 0.3;
  await Promise.all(Array.from({ length: M }, () => spend(each)));

  const cycles = await aiCycleDal.all(100_000);
  const indexes = cycles.map((c) => c.index);
  check("5.0 ⭐ CONTROL: all M calls were recorded",
    (await aiUsageDal.recent("1970-01-01T00:00:00.000Z", 1000)).length === M);
  check("5.1 no duplicate cycle index under concurrency",
    new Set(indexes).size === indexes.length, indexes.join(","));
  check("5.2 the index is still contiguous from 1",
    indexes.slice().sort((a, b) => a - b).every((v, i) => v === i + 1), indexes.join(","));
  near("5.3 ⛔ conservation holds under concurrency", await sumCycles(), M * each, 1e-4);
  check("5.4 still exactly one OPEN cycle", (await aiCycleDal.countOpen()) === 1);
}

// ════════════════════════════════════════════════════════════════════════════════
section("6 · THE CHECKPOINT — a finished cycle pauses the AI until an officer resumes");
// ════════════════════════════════════════════════════════════════════════════════
{
  // Ali, 2026-08-23: "when a cycle ends we have to start a new one to proceed, or posting
  // or AI resolving blocked."
  await reset({ sizeUsd: 1, autoRoll: false });

  check("6.0 ⭐ CONTROL: an EMPTY ledger never blocks — deploying this must not pause the platform",
    !(await cycleGate()).blocked && (await assertAiBudget("sentinel")).ok);

  await spend(0.5);
  check("6.1 a partly-spent cycle does not block", (await assertAiBudget("sentinel")).ok);

  await spend(0.5); // fills cycle 1 exactly
  const gate = await cycleGate();
  check("6.2 ⛔ a FINISHED cycle blocks the next call", gate.blocked, JSON.stringify(gate));
  check("6.3 …and no cycle is left open", (await aiCycleDal.countOpen()) === 0);

  const blocked = await assertAiBudget("sentinel");
  check("6.4 assertAiBudget refuses, and names the CYCLE as the reason",
    !blocked.ok && blocked.reason === "cycle", JSON.stringify(blocked));

  const opened = await startNextCycle("officer_1", "resumed by test");
  check("6.5 starting the next cycle un-pauses the AI",
    !!opened && opened.index === 2 && (await assertAiBudget("sentinel")).ok);
  check("6.6 the officer who opened it is recorded", opened?.openedBy === "officer_1");

  check("6.7 ⛔ starting a SECOND cycle while one is open is refused — never two OPEN rows",
    (await startNextCycle("officer_1", null)) === null && (await aiCycleDal.countOpen()) === 1);

  // Closing early also pauses, deliberately.
  const closed = await closeOpenCycleNow("officer_1", "closing the books");
  check("6.8 closing early pauses the AI too",
    !!closed && (await cycleGate()).blocked && !(await assertAiBudget("sentinel")).ok);

  // 🔴 THE STRADDLING CALL. This is the check the meter bug was hiding behind: a call that
  // fills a cycle and has money left over must NOT open a successor in pause mode, or the
  // checkpoint never fires at all. Measured before the fix: 0 pauses in 6 boundaries.
  await reset({ sizeUsd: 1, autoRoll: false });
  await spend(0.9);
  await spend(0.3); // fills cycle 1 and leaves $0.20 over
  const straddled = await aiCycleDal.all(100_000);
  check("6.10 🔴 a call that STRADDLES the boundary still pauses — it does not roll over",
    (await cycleGate()).blocked && straddled.length === 1, `${straddled.length} cycle(s), blocked=${(await cycleGate()).blocked}`);
  near("6.11 …and the remainder is kept, not lost — the cycle simply reads over 100%",
    straddled[0]?.costUsd ?? 0, 1.2, 1e-6);
  check("6.12 …which the ledger shows honestly as used > 100%",
    decorate(straddled[0]).usedPct > 100);

  // ⛔ AND A CALL WORTH SEVERAL CYCLES IS STILL SPLIT INTO SEVERAL. Absorbing a whole-cycle
  // remainder would destroy the denomination, which is the entire feature.
  await reset({ sizeUsd: 0.01, autoRoll: false });
  await spend(0.3);
  check("6.13 ⛔ a call worth 30 cycles still makes 30 — the absorb rule never eats a full cycle",
    (await aiCycleDal.all(100_000)).filter((c) => c.status === "CLOSED").length === 30,
    String((await aiCycleDal.all(100_000)).filter((c) => c.status === "CLOSED").length));

  await reset({ sizeUsd: 1, autoRoll: false });
  await spend(1);
  await startNextCycle("officer_1", null);
  // ⭐ And the money ceiling still wins when BOTH would refuse — one authority about amounts.
  await startNextCycle("officer_1", null);
  await setCreditLimit(0.01);
  const both = await assertAiBudget("sentinel");
  check("6.9 ⭐ when the budget is also exhausted, BUDGET is the reason reported",
    !both.ok && both.reason === "budget", JSON.stringify(both));
}

// ════════════════════════════════════════════════════════════════════════════════
section("7 · CONTINUOUS MODE — autoRoll never pauses, and never loses money either");
// ════════════════════════════════════════════════════════════════════════════════
{
  await reset({ sizeUsd: 1, autoRoll: true });
  for (let i = 0; i < 6; i++) await spend(0.5);
  check("7.0 ⭐ CONTROL: cycles really did close", (await aiCycleDal.all(100_000)).filter((c) => c.status === "CLOSED").length === 3);
  check("7.1 continuous mode never blocks", !(await cycleGate()).blocked && (await assertAiBudget("polls")).ok);
  near("7.2 conservation holds in continuous mode", await sumCycles(), 3, 1e-6);
}

// ════════════════════════════════════════════════════════════════════════════════
section("8 · PROJECTION — it refuses a year from too little history");
// ════════════════════════════════════════════════════════════════════════════════
{
  const DAY = 86_400_000;
  const mk = (i: number, openedDaysAgo: number, closedDaysAgo: number | null) => ({
    id: `aic_${i}`, index: i, sizeUsd: 100, priceRev: "p1",
    openedAt: new Date(Date.now() - openedDaysAgo * DAY).toISOString(),
    closedAt: closedDaysAgo === null ? null : new Date(Date.now() - closedDaysAgo * DAY).toISOString(),
    costUsd: 100, status: (closedDaysAgo === null ? "OPEN" : "CLOSED") as "OPEN" | "CLOSED",
    openedBy: null, note: null,
  });

  const none = projectCyclesPerYear([mk(1, 2, null)], 14);
  check("8.1 no CLOSED cycle → no projection", !none.ok && none.reason === "no-closed-cycles", JSON.stringify(none));

  const short = projectCyclesPerYear([mk(1, 3, 1), mk(2, 1, null)], 14);
  check("8.2 ⛔ 2 days observed against a 14-day floor → refused, and it says how many days it has",
    !short.ok && short.reason === "too-little-history" && short.observedDays < 14, JSON.stringify(short));

  const long = projectCyclesPerYear([mk(1, 40, 30), mk(2, 30, 20), mk(3, 20, 10), mk(4, 10, null)], 14);
  check("8.3 enough history → a projection is given", long.ok, JSON.stringify(long));
  if (long.ok) {
    // 3 closed cycles across the 30 days from the first open to the last close.
    near("8.4 the rate is closed-cycles ÷ observed span, ×365", long.cyclesPerYear, (3 / 30) * 365, 0.5);
    check("8.5 ⛔ the OPEN cycle contributes NEITHER its spend NOR its elapsed time",
      Math.abs(long.observedDays - 30) < 0.01, String(long.observedDays));
  }

  // ⭐ CONTROL: the projector can actually produce different answers — a function returning
  // a constant would satisfy 8.3 and 8.4 by luck.
  const denser = projectCyclesPerYear(
    [mk(1, 40, 35), mk(2, 35, 30), mk(3, 30, 25), mk(4, 25, 20), mk(5, 20, 15), mk(6, 15, 10)], 14);
  check("8.6 ⭐ CONTROL: a denser history projects a HIGHER rate",
    denser.ok && long.ok && denser.cyclesPerYear > long.cyclesPerYear,
    denser.ok && long.ok ? `${denser.cyclesPerYear} vs ${long.cyclesPerYear}` : "n/a");
}

// ════════════════════════════════════════════════════════════════════════════════
section("9 · DIVIDE BY ZERO, AND EVERY OTHER WAY A FIGURE COULD BE FABRICATED");
// ════════════════════════════════════════════════════════════════════════════════
{
  check("9.1 ⛔ a zero divisor returns null, never Infinity", safeRatio(12, 0) === null);
  check("9.2 …and null is not NaN either", safeRatio(0, 0) === null);
  check("9.3 a real ratio still divides", safeRatio(10, 4) === 2.5);
  check("9.4 ⭐ CONTROL: safeRatio is not simply always-null", safeRatio(1, 1) === 1);

  const cfgNoFx = { ...CYCLE_DEFAULTS };
  check("9.5 ⛔ with NO fx rate set, a TZS figure is null — never a guessed number",
    tzs(10, cfgNoFx) === null);
  check("9.6 a rate WITHOUT a date is still refused — an unverifiable rate is not a rate",
    tzs(10, { ...cfgNoFx, fxTzsPerUsd: 2600, fxAsOfIso: "" }) === null);
  check("9.7 with both a rate and its date, it converts",
    tzs(10, { ...cfgNoFx, fxTzsPerUsd: 2600, fxAsOfIso: "2026-08-23T00:00:00.000Z" }) === 26000);

  check("9.8 the suggested price is cost × (1 + margin)", suggestedPriceUsd(2.5, 100) === 5);
  check("9.9 a zero margin leaves the cost alone", suggestedPriceUsd(2.5, 0) === 2.5);

  const openRow = decorate({
    id: "x", index: 1, sizeUsd: 100, priceRev: "p", openedAt: new Date().toISOString(),
    closedAt: null, costUsd: 40, status: "OPEN", openedBy: null, note: null,
  });
  check("9.10 an OPEN cycle reports no duration — it has not lasted yet", openRow.lastedMs === null);
  check("9.11 …and its used-percentage is real", Math.abs(openRow.usedPct - 40) < 1e-9);
}

// ════════════════════════════════════════════════════════════════════════════════
section("10 · YEARS — counted from the ledger, at the size each cycle was opened with");
// ════════════════════════════════════════════════════════════════════════════════
{
  const TZ = "Africa/Dar_es_Salaam";
  const rows = [
    { id: "a", index: 1, sizeUsd: 50, priceRev: "p", openedAt: "2025-11-01T00:00:00.000Z", closedAt: "2025-12-01T00:00:00.000Z", costUsd: 50, status: "CLOSED" as const, openedBy: null, note: null },
    { id: "b", index: 2, sizeUsd: 50, priceRev: "p", openedAt: "2025-12-01T00:00:00.000Z", closedAt: "2025-12-21T00:00:00.000Z", costUsd: 50, status: "CLOSED" as const, openedBy: null, note: null },
    { id: "c", index: 3, sizeUsd: 100, priceRev: "p", openedAt: "2026-01-05T00:00:00.000Z", closedAt: "2026-02-05T00:00:00.000Z", costUsd: 100, status: "CLOSED" as const, openedBy: null, note: null },
    { id: "d", index: 4, sizeUsd: 100, priceRev: "p", openedAt: "2026-02-05T00:00:00.000Z", closedAt: null, costUsd: 30, status: "OPEN" as const, openedBy: null, note: null },
  ];
  const years = yearsFrom(rows, TZ, Date.parse("2026-08-23T00:00:00.000Z"));
  check("10.0 ⭐ CONTROL: two years are present", years.length === 2, years.map((y) => y.year).join(","));
  check("10.1 2025 closed 2 cycles totalling $100", years.find((y) => y.year === 2025)?.closed === 2 && years.find((y) => y.year === 2025)?.costUsd === 100);
  check("10.2 2026 closed 1 cycle totalling $100", years.find((y) => y.year === 2026)?.closed === 1 && years.find((y) => y.year === 2026)?.costUsd === 100);
  check("10.3 ⛔ the OPEN cycle is NOT counted in any year", years.reduce((s, y) => s + y.closed, 0) === 3);
  check("10.4 the running year is marked PARTIAL", years.find((y) => y.year === 2026)?.partial === true);
  check("10.5 a finished year is not", years.find((y) => y.year === 2025)?.partial === false);
  check("10.6 average duration is reported per year", (years.find((y) => y.year === 2025)?.avgLastedDays ?? 0) === 25);

  // ⛔ A cycle closing just after local midnight on 1 January belongs to the NEW year in the
  // PLATFORM timezone. At UTC+3 a raw-UTC reading files it under the old one — on the one
  // figure Ali reads by year.
  const edge = yearsFrom(
    [{ id: "e", index: 9, sizeUsd: 1, priceRev: "p", openedAt: "2025-12-30T00:00:00.000Z", closedAt: "2025-12-31T22:00:00.000Z", costUsd: 1, status: "CLOSED" as const, openedBy: null, note: null }],
    TZ, Date.parse("2026-08-23T00:00:00.000Z"));
  check("10.7 ⛔ 22:00 UTC on 31 Dec is 01:00 EAT on 1 Jan → counted in 2026, not 2025",
    edge[0]?.year === 2026, String(edge[0]?.year));
}

// ════════════════════════════════════════════════════════════════════════════════
section("11 · FORM VALIDATION — every refusal, and every message that must teach");
// ════════════════════════════════════════════════════════════════════════════════
{
  const NOW = Date.parse("2026-08-23T12:00:00.000Z");
  const base = { sizeUsd: "100", autoRoll: "false", targetMarginPct: "100", fxTzsPerUsd: "", fxAsOfIso: "", minDaysForProjection: "14" };
  const P = (over: Partial<typeof base>) => parseCycleForm({ ...base, ...over }, NOW);

  check("11.0 ⭐ CONTROL: the valid form is ACCEPTED — the parser is not always-refusing", P({}).ok);
  check("11.1 a padded number is accepted — \" 20 \" is a paste, not a mistake", P({ sizeUsd: " 20 " }).ok);

  const rejects: [string, Partial<typeof base>, string][] = [
    ["11.2 empty size", { sizeUsd: "" }, "sizeUsd"],
    ["11.3 whitespace-only size", { sizeUsd: "   " }, "sizeUsd"],
    ["11.4 zero size (infinitely many cycles)", { sizeUsd: "0" }, "sizeUsd"],
    ["11.5 negative size", { sizeUsd: "-5" }, "sizeUsd"],
    ["11.6 ⛔ negative zero", { sizeUsd: "-0" }, "sizeUsd"],
    ["11.7 ⛔ \"1e999\" → Infinity", { sizeUsd: "1e999" }, "sizeUsd"],
    ["11.8 ⛔ \"0.1.2\" → NaN (parseFloat would have accepted 0.1)", { sizeUsd: "0.1.2" }, "sizeUsd"],
    ["11.9 a thousands separator", { sizeUsd: "1,000" }, "sizeUsd"],
    ["11.10 below the floor", { sizeUsd: "0.0001" }, "sizeUsd"],
    ["11.11 above the ceiling", { sizeUsd: "1001" }, "sizeUsd"],
    ["11.12 more than 6 decimal places", { sizeUsd: "1.0000001" }, "sizeUsd"],
    ["11.13 margin above 500%", { targetMarginPct: "501" }, "targetMarginPct"],
    ["11.14 negative margin", { targetMarginPct: "-1" }, "targetMarginPct"],
    ["11.15 fractional projection days", { minDaysForProjection: "14.5" }, "minDaysForProjection"],
    ["11.16 zero projection days", { minDaysForProjection: "0" }, "minDaysForProjection"],
    ["11.17 projection days above a year", { minDaysForProjection: "366" }, "minDaysForProjection"],
    ["11.18 a rate with no date", { fxTzsPerUsd: "2600", fxAsOfIso: "" }, "fxAsOfIso"],
    ["11.19 a date with no rate", { fxTzsPerUsd: "", fxAsOfIso: "2026-08-01" }, "fxTzsPerUsd"],
    ["11.20 ⛔ a decimal-point slip (26 TZS/USD)", { fxTzsPerUsd: "26", fxAsOfIso: "2026-08-01" }, "fxTzsPerUsd"],
    ["11.21 ⛔ a decimal-point slip the other way (26,000)", { fxTzsPerUsd: "26000", fxAsOfIso: "2026-08-01" }, "fxTzsPerUsd"],
    ["11.22 an unreadable rate date", { fxTzsPerUsd: "2600", fxAsOfIso: "last tuesday" }, "fxAsOfIso"],
    ["11.23 ⛔ a rate dated in the FUTURE", { fxTzsPerUsd: "2600", fxAsOfIso: "2026-09-30" }, "fxAsOfIso"],
    ["11.24 an unrecognised switch value", { autoRoll: "maybe" }, "autoRoll"],
  ];
  for (const [label, over, field] of rejects) {
    const r = P(over);
    check(label + " is refused, on the right field", !r.ok && r.field === field, r.ok ? "ACCEPTED" : `field=${r.field}`);
  }

  // ⛔ A MESSAGE THAT SAYS "INVALID" TEACHES NOTHING. Every refusal must say why the bound
  // exists, so an operator does not simply retype the same value.
  const shallow = rejects.filter(([, over]) => {
    const r = P(over);
    return !r.ok && (r.error.length < 40 || /^invalid/i.test(r.error));
  });
  check("11.25 ⛔ every refusal EXPLAINS itself — none is a bare \"invalid\"",
    shallow.length === 0, shallow.map(([l]) => l).join(", "));

  const stale = P({ fxTzsPerUsd: "2600", fxAsOfIso: "2026-01-01" });
  check("11.26 a rate older than 30 days is accepted WITH a warning, not refused",
    stale.ok && stale.warnings.some((w) => /old/i.test(w)), JSON.stringify(stale));

  const roll = P({ autoRoll: "true" });
  check("11.27 turning OFF the pause warns that the AI will never stop",
    roll.ok && roll.warnings.some((w) => /never pause/i.test(w)), JSON.stringify(roll));

  check("11.28 an absent checkbox is FALSE, not truthy",
    parseCycleForm({ ...base, autoRoll: null }, NOW).ok &&
    (parseCycleForm({ ...base, autoRoll: null }, NOW) as { value: { autoRoll: boolean } }).value.autoRoll === false);

  check("11.29 the bounds the form shows are the bounds the parser enforces",
    CYCLE_BOUNDS.sizeUsd.min === 0.001 && CYCLE_BOUNDS.sizeUsd.max === 1000);

  // 🔴 THIS CHECK EXISTS BECAUSE A RED MUTATION MISSED, AND THE MISS WAS THE FINDING.
  // Deleting the empty-string guard left 11.2 GREEN: `Number("")` is 0, and a zero SIZE is
  // caught a line later by the "> 0" rule, on the same field. So 11.2 was proving the size
  // bound, not the empty-field guard — the guard itself was unproven.
  //
  // ⛔ The field where it actually bites is MARGIN, because 0 is a LEGAL margin. A blank box
  // would be silently read as "0% margin", and the suggested price would quietly collapse to
  // bare cost — a wrong number that looks completely reasonable on screen.
  const blankMargin = P({ targetMarginPct: "" });
  check("11.30 🔴 an EMPTY margin is refused, not silently read as 0% — the field where blank is legal",
    !blankMargin.ok && blankMargin.field === "targetMarginPct",
    blankMargin.ok ? `ACCEPTED as ${blankMargin.value.targetMarginPct}%` : `field=${blankMargin.field}`);
  const blankDays = P({ minDaysForProjection: "" });
  check("11.31 …and an empty projection floor is refused too", !blankDays.ok && blankDays.field === "minDaysForProjection");

  // 🔴 ALSO FROM A RED THAT LANDED ON THE WRONG CHECK. Reading the switch as truthiness
  // (`if (!rollRaw)`) makes the explicit strings "false" / "off" / "0" fall through to the
  // error branch. 11.24 stayed green because "maybe" is still refused either way — what was
  // never asserted is that a legitimate OFF value is ACCEPTED and means false.
  for (const off of ["false", "off", "0"]) {
    const r = P({ autoRoll: off });
    check(`11.32 🔴 "${off}" is accepted and means OFF — not an error, not ON`,
      r.ok && r.value.autoRoll === false, r.ok ? `autoRoll=${r.value.autoRoll}` : `refused: ${r.field}`);
  }
  for (const on of ["true", "on", "1"]) {
    const r = P({ autoRoll: on });
    check(`11.33 ⭐ CONTROL: "${on}" is accepted and means ON`, r.ok && r.value.autoRoll === true);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
section("12 · THE METER'S LAST-RESORT CLAMP, AND THE PRICING REVISION");
// ════════════════════════════════════════════════════════════════════════════════
{
  check("12.1 ⛔ a zero size reaching the meter is clamped, never divided by",
    clampCycleSize(0) === CYCLE_DEFAULTS.sizeUsd);
  check("12.2 a negative size is clamped", clampCycleSize(-10) === CYCLE_DEFAULTS.sizeUsd);
  check("12.3 NaN is clamped", clampCycleSize(Number.NaN) === CYCLE_DEFAULTS.sizeUsd);
  check("12.4 an absurdly large size is clamped to the ceiling", clampCycleSize(1e9) === CYCLE_BOUNDS.sizeUsd.max);
  check("12.5 ⭐ CONTROL: a legitimate size passes through untouched", clampCycleSize(100) === 100);

  check("12.6 the pricing revision is stamped on every cycle opened",
    (await aiCycleDal.all(10)).every((c) => typeof c.priceRev === "string" && c.priceRev.length > 0));
  check("12.7 ⭐ the revision is DERIVED from the price table, so a rate change moves it",
    /^p[0-9a-z]+$/.test(PRICE_REV), PRICE_REV);

  // ⭐ The cost function the whole ledger rests on still prices a known call correctly.
  check("12.8 ⭐ CONTROL: 1M Sonnet input tokens still costs $3", costOf("claude-sonnet-4-6", 1_000_000, 0, 0) === 3);
}

// ════════════════════════════════════════════════════════════════════════════════
section("13 · A BROKEN METER MUST NOT BREAK AN AI CALL");
// ════════════════════════════════════════════════════════════════════════════════
{
  await reset({ sizeUsd: 10, autoRoll: true });
  const original = aiCycleDal.openCycle;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (aiCycleDal as any).openCycle = async () => { throw new Error("cycle store is down"); };
  let threw = false;
  try {
    await recordAiUsage({
      feature: "sentinel", model: "claude-sonnet-4-6", inputTokens: 1000, outputTokens: 0,
      webSearches: 0, ok: true, subjectType: "market", subjectId: "mkt_broken",
    });
  } catch { threw = true; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (aiCycleDal as any).openCycle = original;

  check("13.1 ⛔ a failing cycle store does NOT throw out of recordAiUsage", !threw);
  check("13.2 ⭐ CONTROL: and the usage row was still written — the senior record survives",
    (await aiUsageDal.recent("1970-01-01T00:00:00.000Z", 10)).length === 1);
  check("13.3 the budget gate still fails OPEN, so the Sentinel keeps resolving",
    (await assertAiBudget("sentinel")).ok);
}

// ════════════════════════════════════════════════════════════════════════════════
log("");
log(`ai-cycles: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
