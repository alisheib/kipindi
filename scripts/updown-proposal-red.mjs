/**
 * RED harness for `npm run test:updown-proposal` — the E-47b properties specifically.
 *
 *   node scripts/updown-proposal-red.mjs
 *
 * Reintroduces each real defect one at a time, in the real source, and puts the file back.
 * ⚠️ Single-line anchors only, and a missed anchor is a HARD FAILURE, not a skip — session 15
 * lost a whole RED pass to LF anchors against a CRLF tree reporting "the source moved".
 *
 * `ai-supplies-the-price` is the one that matters: it is E-47 EXACTLY AS IT SHIPPED — the AI
 * asked for a price it cannot read — and it must take §1 down.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROP = join(ROOT, "src/lib/server/updown-proposal.ts");

const MUTATIONS = [
  {
    name: "ai-supplies-the-price",
    what: "E-47 as it shipped — the price comes back from the model, which never has one",
    file: PROP,
    // The post-AI assignment (line ~683), not the birth one: `\n  p.framingEn` pins it to the
    // block that runs AFTER the provider returns.
    find: "  p.observedPrice = reading.price;\n  p.observedQuotedAt = reading.sourceQuotedAt;\n  p.framingEn =",
    replace: "  p.observedPrice = Number(g.observedPrice) || null;\n  p.observedQuotedAt = g.observedQuotedAt ?? null;\n  p.framingEn =",
    multiline: true,
  },
  {
    name: "ai-supplies-the-source",
    what: "the link comes from the model again — a chain armed on a page an officer never approved",
    file: PROP,
    find: "  p.sourceUrl = asset.priceSourceUrl;\n  p.sourceDomain = asset.sourceDomain;\n  p.observedPrice = reading.price;\n  p.observedQuotedAt = reading.sourceQuotedAt;\n  p.framingEn =",
    replace: "  p.sourceUrl = String(g.sourceUrl ?? \"\").trim();\n  p.sourceDomain = p.sourceUrl ? normalizeDomain(p.sourceUrl) : \"\";\n  p.observedPrice = reading.price;\n  p.observedQuotedAt = reading.sourceQuotedAt;\n  p.framingEn =",
    multiline: true,
  },
  {
    name: "spend-before-reading",
    what: "the credit is spent BEFORE the feed is checked — ~$0.16 per unusable proposal",
    file: PROP,
    find: "  const reading = await readPrice(asset, now, cfg);\n  if (!reading.ok) {",
    replace: "  const reading = await readPrice(asset, now, cfg);\n  if (false && !reading.ok) {",
    multiline: true,
  },
];

function runGuard() {
  try {
    const out = execSync("npm run test:updown-proposal", { cwd: ROOT, encoding: "utf8", stdio: "pipe" });
    const m = out.match(/(\d+) passed, (\d+) failed/);
    return { failed: false, count: m ? Number(m[2]) : 0, how: "green", out };
  } catch (e) {
    const out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    const m = out.match(/(\d+) passed, (\d+) failed/);
    if (m) return { failed: true, count: Number(m[2]), how: "assertions", out };
    const thrown = out.match(/^Error: (.+)$/m)?.[1] ?? "no summary line and no Error line";
    return { failed: true, count: null, how: "threw", thrown: thrown.slice(0, 110), out };
  }
}

// ⚠️ A guard whose summary says "0 failed" but exits non-zero, or vice versa, would make every
// result below meaningless. Establish green first.
const baseline = runGuard();
if (baseline.failed) {
  console.log("\n⛔ the guard is ALREADY RED on an unmutated tree — fix that first\n");
  console.log(baseline.out.split("\n").filter((l) => l.startsWith("FAIL") || /passed,/.test(l)).join("\n"));
  process.exit(2);
}
console.log(`\nbaseline: guard GREEN (${baseline.out.match(/(\d+) passed/)?.[1]} assertions)\n`);

let proven = 0;
const broken = [];

for (const m of MUTATIONS) {
  const original = readFileSync(m.file, "utf8");
  // CRLF-proof a multi-line anchor by matching against a normalised copy and splicing back
  // with the file's own terminators. A single-line anchor needs none of this.
  const nl = original.includes("\r\n") ? "\r\n" : "\n";
  const find = m.multiline ? m.find.replace(/\n/g, nl) : m.find;
  const replace = m.multiline ? m.replace.replace(/\n/g, nl) : m.replace;
  if (!original.includes(find)) {
    broken.push(`${m.name} — ANCHOR NOT FOUND, this mutation tested nothing`);
    console.log(`  ⛔ ${m.name.padEnd(24)} anchor not found — harness broken, not a pass`);
    continue;
  }
  writeFileSync(m.file, original.replace(find, replace));
  let r;
  try {
    r = runGuard();
  } finally {
    writeFileSync(m.file, original);
  }
  if (r.failed) {
    proven++;
    const how = r.how === "threw" ? `THREW: ${r.thrown}` : `${String(r.count).padStart(2)} failed`;
    console.log(`  ✓ RED  ${m.name.padEnd(24)} ${how} — ${m.what}`);
  } else {
    broken.push(`${m.name} — the guard stayed GREEN with this defect present: ${m.what}`);
    console.log(`  ✗ GREEN ${m.name.padEnd(23)} guard did NOT catch it — ${m.what}`);
  }
}

const after = runGuard();
console.log(`\nrestored: guard ${after.failed ? "RED — ⛔ THE TREE WAS NOT RESTORED" : "GREEN"}`);
console.log(`\n${proven}/${MUTATIONS.length}\n`);
for (const b of broken) console.log(`  · ${b}`);
process.exit(broken.length === 0 && !after.failed ? 0 : 1);
