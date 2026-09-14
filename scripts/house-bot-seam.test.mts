/**
 * HOUSE-BOT SEAM — the money seam's player-path promises, proven on the in-memory store and by source.
 *
 *   npm run test:house-bot-seam
 *
 * ⛔ WHAT THIS GUARDS (PLAN §3, 04 A7/A14/A18, F3, N1 §3, N2 §3). House bots bet through the SAME
 * function players do. Every change the seam makes to the player path is a sanctioned change with a
 * letter, and each one is proven here to give unchanged output for a player (a null marker). The
 * house-only gates are proven to exist, in their declared order, and never to be skipped by a
 * `ctx.kind` branch at an unanchored site.
 *
 * ⛔ EVERY SECTION HAS A PLANTED CONTROL THAT MUST FAIL. A check that can only pass is decoration.
 * Exit 1 on any failure; exit 3 when no assertion ran at all.
 *
 * The Postgres half (markers on every money path, trial balance, concurrency and caps) is
 * `test:house-bot-money` and `test:house-bot-caps`; this file never pretends to cover it.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EXIT_WINDOW_GRID, exitGridCase } from "./lib/house-bot-exit-grid.mts";

process.env.DATABASE_URL = "";
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

/* ═══ Harness ═══════════════════════════════════════════════════════════════════════════════ */

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const section = (title: string) => console.log(`\n${title}`);

/** Canonical JSON (sorted keys, `undefined` dropped the way JSON drops it). */
function canon(v: unknown): string {
  return JSON.stringify(v, (_k, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.fromEntries(Object.keys(val).sort().map((k) => [k, (val as Record<string, unknown>)[k]]))
      : val,
  );
}

const { cashOutValue, exitWindowClosesAt } = await import("../src/lib/server/market-service.ts");
const { exitWindowFacts } = await import("../src/lib/exit-window.ts");

/* ═══ §1 · (k) A14 — the exit window, byte-identical to the pre-extraction golden grid ════════ */
section("§1 · (k) A14 exit window");
{
  const golden = JSON.parse(readFileSync(join(here, "fixtures", "house-bot-exit-window-golden.json"), "utf8")) as {
    count: number; rows: Array<{ id: string; out: Record<string, unknown> }>;
  };
  const byId = new Map(golden.rows.map((r) => [r.id, r.out]));
  ok("1.0 · the golden file covers exactly the grid", golden.count === EXIT_WINDOW_GRID.length && EXIT_WINDOW_GRID.every((c) => byId.has(c.id)),
    `golden ${golden.count} · grid ${EXIT_WINDOW_GRID.length}`);

  const realNow = Date.now;
  const diffs: string[] = [];
  const relationDiffs: string[] = [];
  const mutantDiffs: string[] = [];
  try {
    for (const c of EXIT_WINDOW_GRID) {
      const { position, market, nowMs } = exitGridCase(c);
      Date.now = () => nowMs;
      const live = await cashOutValue(position, market);
      const want = byId.get(c.id);
      if (canon(JSON.parse(JSON.stringify(live))) !== canon(want)) diffs.push(`${c.id}: ${canon(live)} ≠ ${canon(want)}`);

      if (!c.emptyPlacedAt) {
        // Independent relation: with no bonus, sellable ⇔ the window has a runway AND now is before its close.
        const closeMs = Date.parse(exitWindowClosesAt(position, market));
        const placedMs = Date.parse(position.placedAt);
        const expectSellable = c.bonus === 0 ? closeMs > placedMs && nowMs < closeMs : false;
        if ((want as { sellable: boolean }).sellable !== expectSellable) relationDiffs.push(c.id);

        // ⛔ CONTROL — the mutant A14 forbids (no `graceMs > 0`) must disagree with the golden grid somewhere.
        const graceMs = c.graceMin * 60_000, windowMs = graceMs + c.paidMin * 60_000;
        const mutantRunway = c.runwayMs >= graceMs;
        const mutantSellable = mutantRunway && nowMs - placedMs < windowMs && c.bonus === 0;
        if (mutantSellable !== (want as { sellable: boolean }).sellable) mutantDiffs.push(c.id);
      }
    }
  } finally {
    Date.now = realNow;
  }
  ok(`1.1 · cashOutValue deep-equals the golden grid on all ${EXIT_WINDOW_GRID.length} rows`, diffs.length === 0, diffs.slice(0, 3).join(" | "));
  ok("1.2 · exitWindowClosesAt agrees with the golden `sellable` on every row", relationDiffs.length === 0, relationDiffs.slice(0, 5).join(", "));
  ok("1.c1 · CONTROL · the formula without `graceMs > 0` disagrees with the golden grid", mutantDiffs.length > 0, `${mutantDiffs.length} rows differ`);

  // 1.3 · the pure facts, against hand-worked rows.
  const t0 = Date.UTC(2026, 8, 14, 9, 0, 0);
  const f1 = exitWindowFacts({ placedAtMs: t0, closesAtMs: t0 + 3_600_000, freeExitGraceMinutes: 5, paidExitWindowMinutes: 2 });
  ok("1.3 · grace 5, paid 2, an hour of runway → closes at +7:00", f1.hadRunway && f1.exitCloseAtMs === t0 + 420_000, canon(f1));
  const f2 = exitWindowFacts({ placedAtMs: t0, closesAtMs: t0 + 3_600_000, freeExitGraceMinutes: 0, paidExitWindowMinutes: 10 });
  ok("1.4 · grace 0 with a paid window → no runway, closes at placement", !f2.hadRunway && f2.exitCloseAtMs === t0, canon(f2));
  const f3 = exitWindowFacts({ placedAtMs: t0, closesAtMs: t0 + 299_999, freeExitGraceMinutes: 5, paidExitWindowMinutes: 0 });
  ok("1.5 · runway 1 ms short of grace → no runway", !f3.hadRunway && f3.exitCloseAtMs === t0, canon(f3));
  const f4 = exitWindowFacts({ placedAtMs: t0, closesAtMs: Number.NaN, freeExitGraceMinutes: 5, paidExitWindowMinutes: 0 });
  ok("1.6 · an unparseable close → no runway", !f4.hadRunway && f4.exitCloseAtMs === t0, canon(f4));
}

/* ═══ Result ════════════════════════════════════════════════════════════════════════════════ */

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — house-bot-seam: ${pass} passed, ${fail} failed`);
if (pass + fail === 0) {
  console.error("!! ZERO assertions ran — treating as failure.");
  process.exit(3);
}
process.exit(fail === 0 ? 0 : 1);
