// Removes the two allowlist entries the orphan gate reports as "no longer orphaned". A SHRINK (230 -> 228).
// CRLF-preserving; each entry must be exactly one line; refuses to run twice; the result must still parse.
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "F:/kipindi-rot2/scripts/orphan-allowlist.json";
const raw = readFileSync(FILE, "utf8");
const NL = raw.includes("\r\n") ? "\r\n" : "\n";
const lines = raw.split(NL);

const before = JSON.parse(raw);
const DROP = ['    "ai-poll-break-it.mts",', '    "fuzz-malformed-payloads.mjs",'];
for (const d of DROP) {
  const n = lines.filter((l) => l === d).length;
  if (n !== 1) throw new Error(`${d} appears ${n} times, expected exactly 1`);
}
const kept = lines.filter((l) => !DROP.includes(l));
const text = kept.join(NL);
const after = JSON.parse(text);

if (after.orphans.length !== before.orphans.length - 2) throw new Error("expected exactly two entries to go");
const gone = before.orphans.filter((o) => !after.orphans.includes(o));
if (gone.join("|") !== "ai-poll-break-it.mts|fuzz-malformed-payloads.mjs") throw new Error(`unexpected removal: ${gone}`);
if (Object.keys(before).join() !== Object.keys(after).join()) throw new Error("top-level keys changed");

writeFileSync(FILE, text, "utf8");
console.log(`allowlist: ${before.orphans.length} -> ${after.orphans.length} entries; removed ${gone.join(", ")}`);
