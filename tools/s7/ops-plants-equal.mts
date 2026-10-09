// Prove the declared anchors are the inline plants byte for byte: the ORIGINAL plants (their source lines taken from
// git HEAD's scripts/ops-provision-staff.test.mts, evaluated as written) and the declared { from, to } must turn the
// real script into the same text, plant by plant, with the same names and expected claims.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
const R = "F:/kipindi-s7";
const head = execFileSync("git", ["-C", R, "show", "HEAD:scripts/ops-provision-staff.test.mts"], { encoding: "utf8" }).replace(/\r\n/g, "\n");
const a = head.indexOf("const plants: Plant[] = [");
const b = head.indexOf("\n    ];", a);
if (a < 0 || b < 0) throw new Error("plants block not found");
const block = head.slice(a, b + "\n    ];".length).replace("const plants: Plant[] =", "export const plants: any[] =");
const dir = mkdtempSync(join(tmpdir(), "plants-"));
writeFileSync(join(dir, "orig.mts"), block + "\n");
const { plants } = await import(pathToFileURL(join(dir, "orig.mts")).href);
const { MUTATIONS } = await import(pathToFileURL(`${R}/scripts/anchors/ops-provision-staff.anchors.mjs`).href);
const real = readFileSync(`${R}/scripts/ops-provision-staff.mts`, "utf8");
let bad = 0;
if (plants.length !== MUTATIONS.length) { console.log(`count differs: ${plants.length} vs ${MUTATIONS.length}`); bad++; }
plants.forEach((p: any, i: number) => {
  const m = MUTATIONS[i];
  const same = p.name === m.name && JSON.stringify(p.expect) === JSON.stringify(m.expect) && p.mutate(real) === real.replace(m.from, () => m.to) && p.mutate(real) !== real;
  if (!same) bad++;
  console.log(`${same ? "same" : "DIFFERS"} · ${p.name}`);
});
console.log(bad ? `${bad} DIFFER` : `all ${plants.length} identical (name, expect, and the text each produces)`);
