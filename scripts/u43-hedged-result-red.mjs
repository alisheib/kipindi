/** Physical money-truth reversals plus in-memory UI reversals. Restores every byte. */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { hedgedResultIssues } from "./u43-hedged-result-contract.mjs";
import { MUTATIONS } from "./anchors/u43-hedged-result.anchors.mjs";

const UI_FILES = {
  detail: "src/app/updown/[roundId]/page.tsx",
  card: "src/components/updown/updown-card.tsx",
  boardPage: "src/app/updown/page.tsx",
  announcer: "src/components/updown/updown-result-announcer.tsx",
  countdown: "src/components/updown/round-countdown.tsx",
  dictionary: "src/lib/i18n-dict.ts",
  marketCard: "src/components/markets/market-card.tsx",
  resolutionPanel: "src/components/markets/resolution-panel.tsx",
};
const ui = Object.fromEntries(Object.entries(UI_FILES).map(([key, path]) => [key, readFileSync(path, "utf8")]));
const digest = (value) => createHash("sha256").update(value).digest("hex");
const replaceOnce = (source, from, to, name, count = 1) => {
  const needle = source.includes(from) ? from : from.replace(/\n/g, "\r\n");
  const replacement = needle === from ? to : to.replace(/\n/g, "\r\n");
  if (source.split(needle).length !== count + 1) throw new Error(`RED ANCHOR STALE: ${name}`);
  return count === 1 ? source.replace(needle, replacement) : source.replaceAll(needle, replacement);
};
if (hedgedResultIssues(ui).length) throw new Error(`Baseline result UI guard failed: ${hedgedResultIssues(ui).join("; ")}`);

let checked = 0;
for (const plant of MUTATIONS.filter((item) => !item.physical)) {
  const key = Object.keys(UI_FILES).find((candidate) => UI_FILES[candidate] === plant.file);
  if (!key) throw new Error(`Unrecognised UI mutation target: ${plant.file}`);
  const next = { ...ui, [key]: replaceOnce(ui[key], plant.from, plant.to, plant.name) };
  const issues = hedgedResultIssues(next);
  if (issues.length === 0) throw new Error(`RED MISSED: ${plant.name}`);
  checked++;
}
console.log(`U43 result UI red: ${checked} in-memory reversals caught`);
if (process.argv.includes("--ui-only")) process.exit(0);
if (process.argv.includes("--anchors-only")) {
  for (const plant of MUTATIONS.filter((item) => item.physical))
    replaceOnce(readFileSync(plant.file, "utf8"), plant.from, plant.to, plant.name, plant.all ?? 1);
  console.log("U43 result physical anchors: all present; no source bytes changed");
  process.exit(0);
}

function runTest() {
  const run = spawnSync("npx", ["tsx", "scripts/u43-hedged-result.test.mts"], {
    cwd: process.cwd(), shell: process.platform === "win32", encoding: "utf8", timeout: 240_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  return { code: run.status ?? 1, output: `${run.stdout ?? ""}\n${run.stderr ?? ""}` };
}
const baseline = runTest();
if (baseline.code !== 0 || !baseline.output.includes("U43 result truth:"))
  throw new Error(`Baseline result test is not green: ${baseline.output.slice(-2000)}`);

const onlyAt = process.argv.indexOf("--only");
const onlyName = onlyAt < 0 ? null : process.argv[onlyAt + 1];
if (onlyAt >= 0 && !onlyName) throw new Error("--only requires one exact mutation name");
const physicalPlants = MUTATIONS.filter((item) => item.physical && (onlyName == null || item.name === onlyName));
if (onlyName != null && physicalPlants.length !== 1) throw new Error(`Unknown physical mutation: ${onlyName}`);
for (const plant of physicalPlants) {
  const original = readFileSync(plant.file, "utf8");
  const mutant = replaceOnce(original, plant.from, plant.to, plant.name, plant.all ?? 1);
  let red;
  try {
    writeFileSync(plant.file, mutant, "utf8");
    red = runTest();
  } finally {
    writeFileSync(plant.file, original, "utf8");
  }
  if (digest(readFileSync(plant.file, "utf8")) !== digest(original))
    throw new Error(`RED RESTORE FAILED: ${plant.file} differs`);
  if (red.code === 0 || !red.output.includes(plant.expect))
    throw new Error(`RED MISSED: ${plant.name}: ${red.output.slice(-2000)}`);
  checked++;
  console.log(`U43 result physical red: ${plant.name} caught and source restored`);
}
console.log(onlyName == null
  ? `U43 result red: ${checked}/${MUTATIONS.length} reversals caught`
  : `U43 result red: selected physical plant caught, plus ${checked - 1} UI reversals`);
