/**
 * test:maswali-admin-words — AN ADMIN READS PLAIN WORDS (MASWALI-BUILD S6-ADMIN; DESIGN_AUTHORITY §M8a item 29).
 *
 *   npx tsx scripts/maswali-admin-words.test.mts              (npm run test:maswali-admin-words)
 *   npx tsx scripts/maswali-admin-words.test.mts --prove-red  (npm run red:maswali-admin-words — every plant in memory)
 *
 * Ali, 2026-10-22: his admin guide must be "clear, perfect … no unneeded wording", and the console it describes must be
 * the same. The S6-DOCS lane's walk found the programme's own codes printed to officers all over the console — "(MB-75)",
 * "OD-14: inside the rules' band", alert texts ending "(MB-96)" — words that mean something to the build and nothing to
 * the officer reading them (FAILURE-INVENTORY §9b G1).
 *
 * §1 · G1 · NO PROGRAMME CODE OUTSIDE A COMMENT, in any Millionea source an admin's screen can be drawn from: the console's
 *      pages and controls (`src/app/admin/maswali/**`), its download route (`src/app/api/admin/maswali/**`), every
 *      Millionea service (`src/lib/server/maswali-*`, `millionea-*`) — their refusals, the open's checklist, the alerts,
 *      the settlement's and the void's words, the records a console or the audit log prints — the shared Millionea
 *      modules (`src/lib/maswali-*`, `millionea-*`), and the lock chip every console control draws. A code is kept in a
 *      comment beside the words that replaced it; a comment is never printed.
 *      ⛔ The population is DERIVED from the folders, never listed: a new console file is in it the day it exists.
 *      ⏳ ONE file waits, named with its reason: the desk scripts (`maswali-support-scripts.ts`) are the S6-DOCS lane's,
 *      stripped in its item 9 (the lead's ruling G1). The exclusion is a ratchet: once that file holds no code, this
 *      suite FAILS until the exclusion is deleted, so it cannot outlive its reason.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const RED = process.argv.includes("--prove-red");
let passed = 0, failed = 0;
const ok = (name: string, condition: boolean, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (condition) passed++; else failed++;
};
const rel = (abs: string) => relative(ROOT, abs).split("\\").join("/");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

/** The programme's code families: a build finding (MB-nn), an owner decision (OD-nn), a rule (MR-nn), a plan's open
 *  question (OPEN-nn) and an owner ruling's name (R-WEEK, R-INSIDERS …). */
export const PROGRAMME_CODE = /\b(?:MB|OD|MR|OPEN)-\d+[a-z]?\b|\bR-[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*\b/g;

/** Every code standing outside a comment in `source`, with its line. */
export function codesOutsideComments(source: string): Array<{ line: number; code: string; text: string }> {
  const out: Array<{ line: number; code: string; text: string }> = [];
  decomment(source).split("\n").forEach((text, i) => {
    for (const m of text.matchAll(PROGRAMME_CODE)) out.push({ line: i + 1, code: m[0], text: text.trim().slice(0, 140) });
  });
  return out;
}

// ── The population, derived ───────────────────────────────────────────────────────────────────────────
const walk = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : [path];
});
const SOURCE = /\.(ts|tsx)$/;
const MILLIONEA_MODULE = /^(maswali|millionea)-.*\.(ts|tsx)$/;
const population = [
  ...walk(join(ROOT, "src/app/admin/maswali")),
  ...walk(join(ROOT, "src/app/api/admin/maswali")),
  ...readdirSync(join(ROOT, "src/lib/server")).filter((n) => MILLIONEA_MODULE.test(n)).map((n) => join(ROOT, "src/lib/server", n)),
  ...readdirSync(join(ROOT, "src/lib")).filter((n) => MILLIONEA_MODULE.test(n)).map((n) => join(ROOT, "src/lib", n)),
  join(ROOT, "src/components/admin/control-locked.tsx"),
].filter((p) => SOURCE.test(p)).map(rel).sort();

/** ⏳ The one file that waits, and why. Deleted once the file holds no code (§1.3 fails until then). */
const WAITING: Record<string, string> = {
  "src/lib/maswali-support-scripts.ts": "the S6-DOCS lane strips the desk scripts' codes in its item 9 (the lead's G1 ruling)",
};

console.log("\n§1 · G1 · no programme code outside a comment in any Millionea source an admin reads");
// The premise: the walk found the console, its services and the lock chip — a census over nothing passes anything.
const must = [
  "src/app/admin/maswali/page.tsx", "src/app/admin/maswali/[weekId]/week-controls.tsx", "src/app/admin/maswali/pools/page.tsx",
  "src/app/admin/maswali/integrity/page.tsx", "src/app/admin/maswali/new/week-builder.tsx", "src/lib/server/maswali-console.ts",
  "src/lib/server/maswali-service.ts", "src/lib/server/maswali-settlement.ts", "src/components/admin/control-locked.tsx",
];
ok("1.0 · premise: the derived population holds the console's pages, its controls, its services and the lock chip",
  must.every((p) => population.includes(p)) && population.length >= 60, `${population.length} files`);
const hits = population.filter((p) => !(p in WAITING)).flatMap((p) => codesOutsideComments(read(p)).map((h) => ({ file: p, ...h })));
ok("1.1 · ⭐ no programme code stands outside a comment in the console, its services or the lock chip", hits.length === 0,
  hits.length ? `${hits.length}: ${hits.slice(0, 12).map((h) => `${h.file}:${h.line} ${h.code}`).join(" · ")}` : "");
for (const h of hits) console.log(`     ${h.file}:${h.line} ${h.code} :: ${h.text}`);
for (const [file, why] of Object.entries(WAITING)) {
  ok(`1.2 · the waiting file is still in the population: ${file}`, population.includes(file));
  const left = codesOutsideComments(read(file)).length;
  ok(`1.3 · ⏳ ${file} still waits (${why}) — delete its exclusion once it holds no code`, left > 0, `${left} code(s) left`);
}

if (RED) {
  console.log("\n§R · the plants, in memory — each must be caught (and the comment control must not be)");
  const page = read("src/app/admin/maswali/page.tsx");
  const service = read("src/lib/server/maswali-service.ts");
  const consoleRead = read("src/lib/server/maswali-console.ts");
  const plant = (source: string, from: string, to: string) => {
    if (source.split(from).length !== 2) throw new Error(`plant anchor must occur once: ${from}`);
    return source.replace(from, to);
  };
  // R.1 · a code back in a page's JSX text (the shape the walk found: "… froze when it opened (MB-75).").
  const jsx = plant(page, "Nothing needs attention.", "Nothing needs attention (MB-75).");
  ok("R.1 · a code in a page's JSX text is caught", codesOutsideComments(jsx).some((h) => h.code === "MB-75"));
  // R.2 · a code back in a service refusal (a template literal).
  const refusal = plant(service, "? `To stop Millionea, make the next week to open, ${next.code}, the final week:",
    "? `To stop Millionea (OD-03), make the next week to open, ${next.code}, the final week:");
  ok("R.2 · a code in a service's refusal (a template literal) is caught", codesOutsideComments(refusal).some((h) => h.code === "OD-03"));
  // R.3 · an owner ruling's name in an alert (a plain string), the R-… family.
  const alert = plant(consoleRead, "\"The guarantee balance could not be read.\"", "\"The guarantee balance could not be read (R-WEEK).\"");
  ok("R.3 · a ruling's name (R-WEEK) in an alert string is caught", codesOutsideComments(alert).some((h) => h.code === "R-WEEK"));
  // R.4 · a code in a JSX attribute (a hint), the builder's own shape ("OD-14: inside the rules' band").
  const hint = plant(page, "placeholder=\"Search week code\"", "placeholder=\"Search week code (MR-3)\"");
  ok("R.4 · a code in a JSX attribute is caught", codesOutsideComments(hint).some((h) => h.code === "MR-3"));
  // R.5 · CONTROL: a code in a comment is NOT a finding — the census reads what is printed, never the notes beside it.
  const noted = plant(page, "Nothing needs attention.", "Nothing needs attention.{/* MB-75 */}");
  ok("R.5 · control: a code kept in a JSX comment is not reported", codesOutsideComments(noted).length === codesOutsideComments(page).length);
  const lineNote = plant(service, "const DAY_MS = 86_400_000;", "const DAY_MS = 86_400_000; // OD-03 MR-3 MB-84");
  ok("R.6 · control: a code in a line comment is not reported", codesOutsideComments(lineNote).length === codesOutsideComments(service).length);
  // R.7 · the population is derived: a file the walk would not reach is the defect the derivation exists for.
  ok("R.7 · the population reaches a nested console page and the API route without a list",
    population.some((p) => p.startsWith("src/app/admin/maswali/[weekId]/edit/")) && population.some((p) => p.startsWith("src/app/api/admin/maswali/")));
}

console.log(`\nmaswali admin words: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
