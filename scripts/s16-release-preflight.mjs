/** Fail-closed publication gate for the later S16 unmount commit. */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateS14Evidence } from "./lib/s14-evidence.mjs";
import { validateS16Postlaunch, S16_MEASURES, S16_HARM_MARKERS, SEVEN_DAYS_MS } from "./lib/s16-release.mjs";
import { validateShelvedInventory, validateShelvedSource, readShelvedSource } from "./lib/s16-shelved.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = readShelvedSource(root);
if (process.argv[2] === "--prove-red") {
  const at = Date.parse("2026-10-01T00:00:00.000Z");
  const now = at + SEVEN_DAYS_MS + 1;
  const proof = (stamp) => ({ checkedAt: new Date(stamp).toISOString() });
  const good = {
    s15: { launchAt: new Date(at).toISOString(), ownerGo: proof(at - 1), baseline14Days: proof(at - 1), productionReadback: proof(at) },
    s16: {
      sevenDayMeasures: { ...proof(now), verdict: "in-bounds", baselineDays: 14, afterDays: 7, measureKeys: S16_MEASURES, harmMarkerKeys: S16_HARM_MARKERS },
      noRollback: { ...proof(now), events: 0 }, agencyAcknowledgment: { ...proof(now), acknowledged: true },
      shelvingProof: { ...proof(now), testShelved: "passed", redShelved: "passed" },
    },
  };
  if (validateS16Postlaunch(good, now).length) throw new Error("valid post-launch control failed");
  const plants = [
    ["six days", good, at + SEVEN_DAYS_MS - 1, "seven full days"],
    ["early observation", { ...good, s16: { ...good.s16, sevenDayMeasures: { ...good.s16.sevenDayMeasures, checkedAt: new Date(at + SEVEN_DAYS_MS - 1).toISOString() } } }, now, "proof must follow"],
    ["measure below", { ...good, s16: { ...good.s16, sevenDayMeasures: { ...good.s16.sevenDayMeasures, verdict: "out-of-bounds" } } }, now, "in-bounds"],
    ["harm marker omitted", { ...good, s16: { ...good.s16, sevenDayMeasures: { ...good.s16.sevenDayMeasures, harmMarkerKeys: ["rapidDeposit"] } } }, now, "both harm markers"],
    ["rollback", { ...good, s16: { ...good.s16, noRollback: { ...good.s16.noRollback, events: 1 } } }, now, "zero rollback"],
    ["agency unsigned", { ...good, s16: { ...good.s16, agencyAcknowledgment: { ...good.s16.agencyAcknowledgment, acknowledged: false } } }, now, "agency acknowledgment"],
    ["S15 read-back early", { ...good, s15: { ...good.s15, productionReadback: proof(at - 1) } }, now, "read-back must follow"],
  ];
  for (const [name, record, when, expected] of plants) {
    const errors = validateS16Postlaunch(record, when);
    if (!errors.some((error) => error.includes(expected))) throw new Error(`${name} escaped: ${errors.join("; ")}`);
  }
  console.log(`red:s16-release ${plants.length}/${plants.length}: early time, measure, harm, rollback, agency and read-back plants refused`);
  process.exit(0);
}
if (process.argv.length > 2) {
  console.error("Use gate:s16-release without arguments, or --prove-red.");
  process.exit(2);
}
const evidence = JSON.parse(read("docs/qa/vodacom-s14-evidence.json"));
const scripts = JSON.parse(read("package.json")).scripts;
const errors = [
  ...validateS14Evidence(evidence, { root, requireS16: true }),
  ...validateS16Postlaunch(evidence),
  ...validateShelvedInventory(read("docs/SHELVED.md"), scripts, { root }),
  ...validateShelvedSource(read),
];
if (errors.length) {
  console.error(`S16 release gate closed (${errors.length}):`);
  for (const error of errors.slice(0, 35)) console.error(`  ${error}`);
  if (errors.length > 35) console.error(`  ... ${errors.length - 35} more; complete the S14/S15 evidence, seven-day observation and final source unmount`);
  process.exit(1);
}
console.log("S16 release gate: dated S14/S15/S16 evidence, seven-day in-bounds observation, agency acknowledgment and final source unmount checked");
