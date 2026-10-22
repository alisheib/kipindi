// split-73.mjs — run from the slip worktree. Writes scripts/maswali-slip-design.test.mts as HEAD's version with ONLY the
// new 7.3 block (taken from the aside copy), so the marker correction commits alone. Refuses unless each block is found once.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const F = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad/slip";
const REL = "scripts/maswali-slip-design.test.mts";
const head = execFileSync("git", ["show", `HEAD:${REL}`], { encoding: "utf8" }).replace(/\r\n/g, "\n");
const full = readFileSync(`${F}/aside-link/${REL}`, "utf8").replace(/\r\n/g, "\n");
const START = "  // 7.3 · round 2 (the lead, for REGISTER's `qa:millionea-ghost-hops`";
const END = "\n}\n\n/* ══ §8 · THE DECIDED WORDS";
const block = (s, label) => {
  const a = s.indexOf(START), b = s.indexOf(END, a);
  if (a < 0 || b < 0 || s.indexOf(START, a + 1) >= 0) throw new Error(`PREMISE ABSENT — the 7.3 block in ${label}`);
  return [a, b];
};
const [ha, hb] = block(head, "HEAD"), [fa, fb] = block(full, "the aside copy");
const out = head.slice(0, ha) + full.slice(fa, fb) + head.slice(hb);
writeFileSync(REL, out, "utf8");
console.log(`7.3 block: HEAD ${hb - ha} chars → new ${fb - fa} chars; file written (${out.length} chars)`);
