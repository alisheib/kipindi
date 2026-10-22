/** Source-copy red proof: each paint regression must fail the runnable guard. */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { MUTATIONS } from "./anchors/u43-chart-direction.anchors.mjs";

const original = readFileSync("src/components/charts/terminal-chart.tsx", "utf8");
const micro = readFileSync("src/components/charts/round-live-line.tsx", "utf8");
const chartCopy = join(tmpdir(), `u43-chart-direction-${randomUUID()}.tsx`);
const microCopy = join(tmpdir(), `u43-micro-direction-${randomUUID()}.tsx`);
const test = resolve("scripts/u43-chart-direction.test.mjs");
let proved = 0;
const run = (chart, card) => {
  writeFileSync(chartCopy, chart);
  writeFileSync(microCopy, card);
  const result = spawnSync(process.execPath, [test], {
    cwd: process.cwd(), encoding: "utf8",
    env: { ...process.env, U43_CHART_SOURCE: chartCopy, U43_MICRO_SOURCE: microCopy },
  });
  return { code: result.status, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
};
try {
  const baseline = run(original, micro);
  if (baseline.code !== 0) throw new Error(`baseline guard failed\n${baseline.output}`);
  for (const { name, file, from, to, expected } of MUTATIONS) {
    const source = file === "src/components/charts/terminal-chart.tsx" ? original : micro;
    if (source.split(from).length !== 2) throw new Error(`mutation target not unique: ${name}`);
    const result = file === "src/components/charts/terminal-chart.tsx"
      ? run(original.replace(from, to), micro)
      : run(original, micro.replace(from, to));
    if (result.code === 0 || !result.output.includes(`FAIL ${expected}`))
      throw new Error(`red proof missed ${name}\n${result.output}`);
    proved++;
    console.log(`RED ${name}: ${expected}`);
  }
} finally {
  unlinkSync(chartCopy);
  unlinkSync(microCopy);
}
console.log(`U43 chart direction red: ${proved}/${MUTATIONS.length} regressions caught`);
