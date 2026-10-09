// Read-only replica of the ratchet's detector (scripts/live-target-safe.test.mjs §1) that also prints line numbers.
import { readFileSync } from "node:fs";

const isProdUrl = (quoted) => /^["'][a-z]+:\/\//i.test(quoted) && !/localhost|127\.0\.0\.1|\[::1\]/.test(quoted);
const DEFAULT_TARGET = /\b(?:BASE|BASE_URL|TARGET|ORIGIN)\b[^\n]*?(?:\?\?|\|\|)\s*("[^"]*"|'[^']*')/g;

for (const f of process.argv.slice(2)) {
  const raw = readFileSync(f, "utf8");
  // Same stripping as the test, but replace with equal-length blanks so offsets keep their line numbers.
  const blank = (s) => s.replace(/[^\n]/g, " ");
  const src = raw
    .replace(/^[ \t]*\/\/.*$/gm, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank);
  console.log("=== " + f);
  for (const m of src.matchAll(DEFAULT_TARGET)) {
    const line = src.slice(0, m.index).split("\n").length;
    console.log("  line " + line + (isProdUrl(m[1]) ? "  [PROD OFFENDER]" : "  [ok/local]") + "  default=" + m[1]);
    console.log("    match: " + JSON.stringify(m[0]).slice(0, 220));
  }
}
