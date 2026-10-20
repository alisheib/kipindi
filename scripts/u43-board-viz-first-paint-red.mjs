/** Physical BoardViz reversals. Each plant reruns the SSR/source guard in a fresh
 * process and restores the component byte-for-byte before the next. */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "src/components/charts/board-viz.tsx");
const guard = join(root, "scripts/u43-board-viz-first-paint.test.mts");
const original = readFileSync(target, "utf8");
const run = () => spawnSync(process.execPath, ["--import", "tsx", guard], { cwd: root, encoding: "utf8", timeout: 30_000 });
const control = run();
if (control.status !== 0) throw new Error(`green control failed: ${control.stdout}\n${control.stderr}`);
const cases = [
  ["old false first paint", "useState<boolean | null>(null)", "useState<boolean | null>(false)"],
  ["no desktop reserve", "kp-shimmer-track lg:block", "kp-shimmer-track"],
  ["visible phone reserve", "ud-chart-slot hidden rounded-lg", "ud-chart-slot block rounded-lg"],
  ["claims chart expanded before it exists", "aria-expanded={open === true}", "aria-expanded={true}"],
  ["drops saved closed choice", 'setOpen((current) => current ?? (stored === "open"))', "setOpen(true)"],
  ["ignores desktop default", 'setOpen((current) => current ?? window.matchMedia("(min-width: 1024px)").matches)', "setOpen(false)", 2],
  ["keeps slot for saved closed", "hidden={!open}", "hidden={false}"],
  ["forgets saved toggle", 'window.localStorage.setItem(STORE_KEY, next ? "open" : "closed")', "void next"],
];
let caught = 0;
try {
  for (const [name, from, to, expectedCount = 1] of cases) {
    if (readFileSync(target, "utf8") !== original) throw new Error(`${name}: source changed during red fleet`);
    if (original.split(from).length !== expectedCount + 1) throw new Error(`${name}: red anchor absent or ambiguous`);
    try {
      writeFileSync(target, original.replaceAll(from, to));
      const result = run();
      if (result.status === 0) throw new Error(`${name}: guard missed the reversal`);
      console.log(`RED ${++caught}/${cases.length}: ${name}`);
    } finally { writeFileSync(target, original); }
  }
} finally {
  if (readFileSync(target, "utf8") !== original) throw new Error("BoardViz not restored byte-for-byte");
}
const after = run();
if (after.status !== 0) throw new Error(`green control failed after red: ${after.stdout}\n${after.stderr}`);
console.log(`U43 BoardViz first-paint red: ${caught}/${cases.length}, source restored`);
