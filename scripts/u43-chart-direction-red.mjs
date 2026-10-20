/** Source-copy red proof: each paint regression must fail the runnable guard. */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

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
const mutations = [
  ["up token", 'const upInk = ink("--yes-400");', 'const upInk = ink("--aqua-300");', "direction tokens"],
  ["down token", 'const downInk = ink("--no-400");', 'const downInk = ink("--text-muted");', "direction tokens"],
  ["body", 'upColor: upInk, downColor: downInk,', 'upColor: downInk, downColor: downInk,', "candle body"],
  ["wick", 'wickUpColor: upInk, wickDownColor: downInk,', 'wickUpColor: upInk, wickDownColor: upInk,', "candle body"],
  ["forming token", 'const formingUp = ink("--yes-400", 0.45);', 'const formingUp = ink("--aqua-300", 0.45);', "forming tokens"],
  ["forming direction", 'color: c.c >= c.o ? formingUp : formingDown,', 'color: c.c >= c.o ? formingDown : formingUp,', "forming candle direction"],
  ["volume rise", 'color: c.c >= c.o ? ink("--yes-400", c.forming ? 0.18 : 0.3)', 'color: c.c >= c.o ? ink("--aqua-300", c.forming ? 0.18 : 0.3)', "volume candle direction"],
  ["volume fall", ': ink("--no-400", c.forming ? 0.18 : 0.3),', ': ink("--text-muted", c.forming ? 0.18 : 0.3),', "volume candle direction"],
  ["curve endpoints", 'const first = real[0]?.price ?? null, last = real[real.length - 1]?.price ?? null;', 'const first = real[real.length - 1]?.price ?? null, last = real[0]?.price ?? null;', "curve endpoints"],
  ["curve down", 'last < first ? "--no-400"', 'last < first ? "--aqua-300"', "curve direction"],
  ["curve always aqua", 'const dirInk = ink(dirToken);', 'const dirInk = ink("--aqua-300");', "curve ink bridge"],
  ["curve fill", 'topColor: ink(dirToken, dirToken === "--text-muted" ? 0.16 : 0.24),', 'topColor: ink("--aqua-300", 0.20),', "curve paint"],
];
try {
  const baseline = run(original, micro);
  if (baseline.code !== 0) throw new Error(`baseline guard failed\n${baseline.output}`);
  for (const [name, from, to, expected] of mutations) {
    if (original.split(from).length !== 2) throw new Error(`mutation target not unique: ${name}`);
    const result = run(original.replace(from, to), micro);
    if (result.code === 0 || !result.output.includes(`FAIL ${expected}`))
      throw new Error(`red proof missed ${name}\n${result.output}`);
    proved++;
    console.log(`RED ${name}: ${expected}`);
  }
  const alteredMicro = micro.replace('stroke="var(--aqua-300)" strokeWidth="1.5"', 'stroke="var(--yes-400)" strokeWidth="1.5"');
  if (alteredMicro === micro) throw new Error("micro mutation target absent");
  const result = run(original, alteredMicro);
  if (result.code === 0 || !result.output.includes("FAIL micro line stays aqua"))
    throw new Error(`red proof missed micro line\n${result.output}`);
  proved++;
  console.log("RED micro line: micro line stays aqua");
} finally {
  unlinkSync(chartCopy);
  unlinkSync(microCopy);
}
console.log(`U43 chart direction red: ${proved}/${mutations.length + 1} regressions caught`);
