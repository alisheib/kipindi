import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MUTATIONS } from "./anchors/maswali-admin-pools-query.anchors.mjs";
import { openState, poolsLine, poolsSearchParams, queryOpenWeeks, queryRolloverTrail } from "../src/lib/maswali-admin-pools-query.ts";
import type { PoolsTrailRow, PoolsWeek } from "../src/lib/server/maswali-console.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
if (process.argv.includes("--prove-red")) {
  for (const plant of MUTATIONS) {
    const source = resolve(root, plant.file);
    const before = readFileSync(source, "utf8");
    const normalized = before.replace(/\r\n/g, "\n");
    assert.equal(normalized.split(plant.from).length - 1, 1, `${plant.name} anchor must be unique`);
    try {
      writeFileSync(source, normalized.replace(plant.from, plant.to));
      const run = spawnSync(process.execPath, ["--import", "tsx", "scripts/maswali-admin-pools-query.test.mts"],
        { cwd: root, encoding: "utf8", env: { ...process.env, NODE_ENV: "test" } });
      assert.notEqual(run.status, 0, `removing ${plant.name} must fail the behavior guard`);
      assert.match(`${run.stdout}\n${run.stderr}`, plant.failure,
        `the failed assertion must name ${plant.name}, not a loader or syntax error`);
      process.stdout.write(`RED: removing ${plant.name} fails its behavior assertion\n`);
    } finally {
      writeFileSync(source, before);
    }
  }
  process.exit(0);
}

const week = (code: string, visibility: "PUBLIC" | "DRIVE", state: "OPEN" | "CLOSED" | "RESOLVING", sales: number, combos: number): PoolsWeek => ({
  row: { code, visibility, state }, sales, distinctCombos: combos, worstTopUp: 1_000_000 - sales,
} as PoolsWeek);
const open = [
  week("MLN-2026-W01", "PUBLIC", "OPEN", 4_000, 4),
  week("MLN-2026-W02", "DRIVE", "CLOSED", 20_000, 2),
  week("MLN-2026-W03", "PUBLIC", "RESOLVING", 10_000, 8),
];
assert.equal(poolsLine("nonsense"), "ALL", "unknown line cannot select an invented population");
assert.equal(openState("nonsense"), "ALL", "unknown state cannot select an invented population");
assert.deepEqual(poolsSearchParams({ tcode: ["one", "two"], tline: "DRIVE", irrelevant: "ignored" }),
  { tpage: undefined, tcode: undefined, tline: "DRIVE", tsort: undefined, tdir: undefined,
    oline: undefined, ostate: undefined, osort: undefined, odir: undefined },
  "repeated or unknown URL controls cannot crash or leak into pools links");
assert.deepEqual(queryOpenWeeks(open, { line: "PUBLIC", state: "ALL", sort: "sales", dir: "desc" }).map((w) => w.row.code),
  ["MLN-2026-W03", "MLN-2026-W01"], "open line filter and numeric sort compose");
assert.deepEqual(queryOpenWeeks(open, { line: "ALL", state: "CLOSED", sort: "week", dir: "asc" }).map((w) => w.row.code),
  ["MLN-2026-W02"], "open state filter selects the real week state");

const trailRow = (n: number, visibility: "PUBLIC" | "DRIVE", paid: number): PoolsTrailRow => ({
  code: `MLN-2026-W${String(n).padStart(2, "0")}`, visibility,
  settledAt: `2026-10-${String(Math.min(n, 28)).padStart(2, "0")}T10:00:00.000Z`,
  sales: n * 1_000, rolloverIn: 0, winners: n % 3, fee: 0, topUp: 0, paid, carryOut: 0, levyOnOwnTopUp: 0,
});
const trail = Array.from({ length: 25 }, (_, n) => trailRow(n + 1, "PUBLIC", n + 1));
trail.push(trailRow(26, "DRIVE", 1_000));
assert.deepEqual(queryRolloverTrail(trail, { code: "", line: "DRIVE", sort: "settled", dir: "desc" }).map((w) => w.code),
  ["MLN-2026-W26"], "trail line filter keeps only the requested line");
assert.deepEqual(queryRolloverTrail(trail, { code: "w26", line: "ALL", sort: "week", dir: "asc" }).map((w) => w.code),
  ["MLN-2026-W26"], "code lookup searches past the first page and ignores case");
assert.deepEqual(queryRolloverTrail(trail, { code: "", line: "PUBLIC", sort: "paid", dir: "desc" }).slice(0, 2).map((w) => w.paid),
  [25, 24], "numeric sort runs before the visible page is sliced");
assert.equal(queryRolloverTrail(trail, { code: "not-a-week", line: "ALL", sort: "week", dir: "asc" }).length, 0,
  "a missing code yields an honest empty result");
process.stdout.write("maswali admin pools query: 9 behavior assertions PASS\n");
