// Wires nine existing landing-v3 instruments into package.json as named qa:* scripts, beside the thirteen already there.
// CRLF-preserving; refuses to run twice; the anchor must be exactly one line.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const ROOT = "F:/kipindi-rot2";
const FILE = `${ROOT}/package.json`;
const raw = readFileSync(FILE, "utf8");
const NL = raw.includes("\r\n") ? "\r\n" : "\n";
const lines = raw.split(NL);

const ANCHOR = '    "qa:landing-v3:c1": "bash scripts/qa/landing-v3/verify-c1.sh",';
const at = lines.indexOf(ANCHOR);
if (at < 0 || lines.filter((l) => l === ANCHOR).length !== 1) throw new Error("anchor not unique");

// [script name, command] — each command is the one its verify-*.sh wrapper (or its own header) runs it with.
const WIRE = [
  ["qa:landing-v3:c1-seed", "node scripts/qa/landing-v3/c1-seed.mjs"],
  ["qa:landing-v3:c1-drive", "tsx scripts/qa/landing-v3/c1-drive.mjs"],         // verify-c1.sh: `npx tsx` — it reads src/lib/i18n-dict.ts
  ["qa:landing-v3:band-drive", "node scripts/qa/landing-v3/band-drive.mjs"],
  ["qa:landing-v3:band-metrics", "node scripts/qa/landing-v3/band-metrics.mjs"],
  ["qa:landing-v3:band-agree", "node scripts/qa/landing-v3/band-agree.mjs"],
  ["qa:landing-v3:wp34-seed", "node scripts/qa/landing-v3/wp34-seed.mjs"],
  ["qa:landing-v3:featured-budget", "node scripts/qa/landing-v3/featured-budget.mjs"],
  ["qa:landing-v3:hero-served", "node scripts/qa/landing-v3/hero-served.mjs"],
  ["qa:landing-v3:hero-states", "node scripts/qa/landing-v3/hero-states.mjs"],
];
const existing = new Set(Object.keys(JSON.parse(raw).scripts));
const out = [];
for (const [name, cmd] of WIRE) {
  if (existing.has(name)) throw new Error(`${name} already exists`);
  const file = cmd.split(" ")[1];
  if (!existsSync(`${ROOT}/${file}`)) throw new Error(`${file} does not exist`);
  out.push(`    ${JSON.stringify(name)}: ${JSON.stringify(cmd)},`);
}
lines.splice(at + 1, 0, ...out);
const text = lines.join(NL);
JSON.parse(text);   // still valid JSON
writeFileSync(FILE, text, "utf8");
console.log(`wired ${out.length} scripts after line ${at + 1}`);
