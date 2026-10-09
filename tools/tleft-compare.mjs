// Read-only: compare the pre-edit and post-edit suite runs (exit codes and last lines), and diff the logs of any suite
// that is red in either run.
import { readFileSync, existsSync } from "node:fs";
const SP = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad";
const load = (label) => new Map(readFileSync(`${SP}/${label}/summary.tsv`, "utf8").split("\n").filter(Boolean).map((l) => {
  const [name, code, ...rest] = l.split("\t");
  return [name, { code: Number(code), last: rest.join("\t") }];
}));
const before = load("tleft-baseline");
const after = load("tleft-after");
console.log(`suites: baseline ${before.size}, after ${after.size}`);
const names = [...new Set([...before.keys(), ...after.keys()])].sort();
let changed = 0;
for (const n of names) {
  const b = before.get(n), a = after.get(n);
  if (!b || !a) { console.log(`MISSING  ${n}: baseline=${b ? b.code : "-"} after=${a ? a.code : "-"}`); changed++; continue; }
  if (b.code !== a.code) { console.log(`EXIT CHANGED  ${n}: ${b.code} -> ${a.code}   after: ${a.last}`); changed++; }
}
console.log(`exit-code changes: ${changed}`);
console.log(`green before: ${[...before.values()].filter((v) => v.code === 0).length}  green after: ${[...after.values()].filter((v) => v.code === 0).length}`);
console.log("\nRED in either run:");
for (const n of names) {
  const b = before.get(n), a = after.get(n);
  if ((b && b.code !== 0) || (a && a.code !== 0)) {
    const safe = n.replace(/:/g, "_");
    const lb = readFileSync(`${SP}/tleft-baseline/${safe}.log`, "utf8");
    const la = readFileSync(`${SP}/tleft-after/${safe}.log`, "utf8");
    console.log(`  ${n}: before=${b?.code} after=${a?.code}  logs identical: ${lb === la}`);
    if (lb !== la) {
      const x = lb.split("\n"), y = la.split("\n");
      const del = x.filter((l) => !y.includes(l)).slice(0, 6), add = y.filter((l) => !x.includes(l)).slice(0, 6);
      console.log("    only in baseline:", JSON.stringify(del));
      console.log("    only in after   :", JSON.stringify(add));
    }
  }
}
// The assertion counts that should have moved: time-left and i18n.
for (const n of ["test:time-left", "test:i18n", "test:trilingual", "test:translation-safety", "test:landing-contract", "test:hero-contract", "test:featured-card"]) {
  console.log(`\n${n}: before [${before.get(n)?.code}] ${before.get(n)?.last}\n${" ".repeat(n.length)}  after  [${after.get(n)?.code}] ${after.get(n)?.last}`);
}
