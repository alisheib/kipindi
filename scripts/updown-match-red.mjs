/** Physical source-copy regressions for the U43 card and no-read wording guard. */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolveAnchor } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/updown-match.anchors.mjs";

const dir = dirname(fileURLToPath(import.meta.url));
const original = readFileSync(join(dir, "updown-match.test.mts"), "utf8");
const copy = join(dir, `.tmp-updown-match-red-${randomUUID()}.mts`);
const tsx = resolve("node_modules/tsx/dist/cli.mjs");
const run = (source) => {
  writeFileSync(copy, source);
  const result = spawnSync(process.execPath, [tsx, copy], {
    cwd: process.cwd(), encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
  });
  return { code: result.status, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
};
const mutate = ({ name, from, to, expect }) => {
  const anchor = resolveAnchor(original, from);
  if (!anchor.ok) throw new Error(`${name}: ${anchor.reason}`);
  const result = run(original.replace(anchor.needle, to));
  if (result.code === 0 || !result.output.includes(`FAIL ${expect}`))
    throw new Error(`${name}: guard did not reject the regression\n${result.output.slice(-2500)}`);
  console.log(`RED ${name}: ${expect}`);
};

try {
  const baseline = run(original);
  const baselineSummary = /ALL PASS — (\d+) passed, 0 failed/.exec(baseline.output);
  if (baseline.code !== 0 || !baselineSummary)
    throw new Error(`baseline guard failed\n${baseline.output.slice(-2500)}`);
  console.log(`GREEN baseline: ${baselineSummary[1]} passed, 0 failed`);

  for (const mutation of MUTATIONS) mutate(mutation);
} finally {
  unlinkSync(copy);
}
console.log(`UPDOWN MATCH RED: ${MUTATIONS.length}/${MUTATIONS.length} physical source-copy regressions caught`);
