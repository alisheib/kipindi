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
const mutations = MUTATIONS.filter((item) => item.file === "src/components/charts/terminal-chart.tsx");
const [microMutation] = MUTATIONS.filter((item) => item.file === "src/components/charts/round-live-line.tsx");
if (mutations.length !== 12 || !microMutation) throw new Error("Expected twelve chart and one micro-line plant");
try {
  const baseline = run(original, micro);
  if (baseline.code !== 0) throw new Error(`baseline guard failed\n${baseline.output}`);
  for (const { name, from, to, expected } of mutations) {
    if (original.split(from).length !== 2) throw new Error(`mutation target not unique: ${name}`);
    const result = run(original.replace(from, to), micro);
    if (result.code === 0 || !result.output.includes(`FAIL ${expected}`))
      throw new Error(`red proof missed ${name}\n${result.output}`);
    proved++;
    console.log(`RED ${name}: ${expected}`);
  }
  if (micro.split(microMutation.from).length !== 2) throw new Error("micro mutation target not unique");
  const alteredMicro = micro.replace(microMutation.from, microMutation.to);
  const result = run(original, alteredMicro);
  if (result.code === 0 || !result.output.includes(`FAIL ${microMutation.expected}`))
    throw new Error(`red proof missed micro line\n${result.output}`);
  proved++;
  console.log("RED micro line: micro line stays aqua");
} finally {
  unlinkSync(chartCopy);
  unlinkSync(microCopy);
}
console.log(`U43 chart direction red: ${proved}/${mutations.length + 1} regressions caught`);
