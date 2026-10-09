// Writes broken COPIES of the tool (never the repo file), one detector broken in each, and runs each copy's --self-test.
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const dir = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/s7a9a/";
const src = readFileSync("F:/kipindi-s7a9a/scripts/qa-served-skeleton.mjs", "utf8");
const breaks = [
  ["broken-markers", "the <!--$!--> counter never matches", `if (k.t === "comment" && k.data === "$!") { counts.markers++;`, `if (k.t === "comment" && k.data === "$!!") { counts.markers++;`],
  ["broken-comments", "the body drops every comment", "if (k.t === \"comment\") { sink.push(", "if (k.t === \"comment\") { continue; sink.push("],
  ["broken-segment-ids", "streamed segment ids are no longer normalised", "return `${v[0]}:~`;", "return v;"],
  ["broken-main", "--main never walks main", "if (main) walk(k.kids, 0, out.main);", ""],
  ["broken-shell-time", "React's shell-time script is read as an inline script", "|requestAnimationFrame\\(function\\(\\)\\{\\$RT=)/", ")/"],
  ["broken-template-owner", "the body lists the bail-out templates too", "if (k.tag === \"head\" || headOwned(k) || isDigestTemplate(k)) continue;", "if (k.tag === \"head\" || headOwned(k)) continue;"],
  ["broken-growth", "a grown count is not failed", "const grew = COUNTS.filter((k) => fb.bailouts.counts[k] > fa.bailouts.counts[k]);", "const grew = [];"],
];
let allFailed = true;
for (const [name, what, from, to] of breaks) {
  if (!src.includes(from)) { console.log(`✗ ${name}: anchor not found`); allFailed = false; continue; }
  const file = `${dir}${name}.mjs`;
  writeFileSync(file, src.replace(from, to));
  const r = spawnSync(process.execPath, [file, "--self-test"], { encoding: "utf8" });
  const failing = r.stdout.split(/\r?\n/).filter((l) => l.trimStart().startsWith("✗"));
  console.log(`${name} (${what}) → exit ${r.status}; ${failing.length} row(s) fail; verdict: ${r.stdout.trim().split(/\r?\n/).pop()}`);
  for (const l of failing.slice(0, 4)) console.log(`    ${l.trim()}`);
  if (r.status === 0) allFailed = false;
}
console.log(allFailed ? "\nEVERY BROKEN COPY FAILS ITS SELF-TEST" : "\nA BROKEN COPY PASSED — the control is blind");
process.exit(allFailed ? 0 : 1);
