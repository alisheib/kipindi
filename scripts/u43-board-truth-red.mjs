/** Physical reversals of U43 board calendar and dev-only read-fault gates. */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const paths = {
  calendar: join(root, "src/lib/server/market-calendar.ts"),
  board: join(root, "src/lib/server/updown-board.ts"),
  page: join(root, "src/app/updown/page.tsx"),
};
const tsx = join(root, "node_modules", "tsx", "dist", "cli.mjs");
const run = (script) => spawnSync(process.execPath, [tsx, join(root, script)],
  { cwd: root, encoding: "utf8", timeout: 30_000 });
const guard = "scripts/u43-board-truth.test.mts";
const calendarTest = "scripts/market-calendar.test.mts";
for (const script of [guard, calendarTest]) {
  const result = run(script);
  if (result.status !== 0) throw new Error(`${script} green control failed: ${result.stdout}\n${result.stderr}`);
}
const mutations = [
  ["ignore dead hours in next-open scan", "calendar", "isMarketOpenAt(category, probe, deadHoursUtc)",
    "isMarketOpenAt(category, probe)", "a measured weekday break reopens", true],
  ["omit measured asset profile", "board", "const deadHours = await deadHoursFor(activeAssetRow.symbol)",
    "const deadHours = []", "board reads this asset's measured", false],
  ["ignore dead hours at board closure", "board", "isMarketOpenAt(activeAssetRow.category, calendarNow, deadHours)",
    "isMarketOpenAt(activeAssetRow.category, calendarNow)", "board reads this asset's measured", false],
  ["invent wrong next-open time", "board", "nextOpenAfter(activeAssetRow.category, calendarNow, deadHours)",
    "nextOpenAfter(activeAssetRow.category, calendarNow)", "board reads this asset's measured", false],
  ["make fault available outside development at board read", "board", 'opts?.qaReadAssetFault && process.env.NODE_ENV === "development"',
    "opts?.qaReadAssetFault && true", "injected failed asset catalogue", false],
  ["hide failed read as an empty asset list", "board", 'Promise.reject(new Error("U43 QA-INJECTED asset catalogue read failure"))',
    "Promise.resolve([])", "injected failed asset catalogue", false],
  ["make page fault available outside development", "page", 'qaReadAssetFault: process.env.NODE_ENV === "development"',
    "qaReadAssetFault: true", "page fault probe requires", false],
  ["remove explicit server switch", "page", 'process.env.U43_DEV_BOARD_READ_FAULT === "1"',
    "true", "page fault probe requires", false],
  ["remove exact query gate", "page", 'sp.__u43ReadFault === "asset-list"',
    "true", "page fault probe requires", false],
];
const original = new Map(Object.entries(paths).map(([key, path]) => [key, readFileSync(path, "utf8")]));
let caught = 0;
try {
  for (const [name, key, from, to, expected, checkCalendar] of mutations) {
    const path = paths[key], source = original.get(key);
    if (readFileSync(path, "utf8") !== source) throw new Error(`${name}: source changed during red run`);
    if (source.split(from).length - 1 !== 1) throw new Error(`${name}: expected exactly one mutation anchor`);
    try {
      writeFileSync(path, source.replace(from, to));
      const result = run(guard), output = `${result.stdout}\n${result.stderr}`;
      if (result.status === 0 || !output.includes(expected)) {
        throw new Error(`${name}: board truth guard missed the reversal: ${output.slice(0, 720)}`);
      }
      if (checkCalendar) {
        const calendarResult = run(calendarTest);
        if (calendarResult.status === 0 || !`${calendarResult.stdout}\n${calendarResult.stderr}`.includes("FAIL 4.4")) {
          throw new Error(`${name}: market-calendar guard missed the 3-argument reversal`);
        }
      }
      console.log(`RED ${++caught}/${mutations.length}: ${name}`);
    } finally { writeFileSync(path, source); }
  }
} finally {
  for (const [key, path] of Object.entries(paths)) {
    if (readFileSync(path, "utf8") !== original.get(key)) throw new Error(`${key} was not byte-restored`);
  }
}
for (const script of [guard, calendarTest]) {
  const result = run(script);
  if (result.status !== 0) throw new Error(`${script} green after red failed: ${result.stdout}\n${result.stderr}`);
}
console.log(`U43 board truth physical red: ${caught}/${mutations.length}, all source files restored`);
