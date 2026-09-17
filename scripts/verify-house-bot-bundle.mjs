/**
 * `npm run verify:house-bot-bundle` — does the JavaScript every visitor downloads say anything about house bots?
 *
 * ⛔ OWNER RULING D19 (2026-09-16): house bots are never public. What a player is TOLD is only half of that; the
 * other half is what the public site SHIPS. A dictionary, a failure registry or a switch case that a client
 * component imports is in the browser bundle whether or not any screen renders it, and anyone can read it.
 *
 * ⭐ THE POPULATION IS THE BUILD OUTPUT, NOT A LIST OF FILES. It reads every file under `.next/static` of a real
 * `next build`, so an import chain nobody thought of is caught — which is how C4 ruling 151 was found: an admin
 * client component imported a constant from a server module and pulled Prisma's browser runtime, naming every
 * model, into a chunk served on every route.
 *
 * ⭐ SHOWN ABLE TO FAIL: on `54dbb0dd` (before the D19 un-build) this found 320 hits; after it, 0 (C4 ruling 152).
 *
 * Usage: `npx next build` first (heavy — it is not in `test:all`; the commit's closing gates and REL-0 run it), then
 * `npm run verify:house-bot-bundle [repoRoot]`. A missing or stale build is NOT MEASURED, never a pass.
 */
import fs from "node:fs";
import path from "node:path";
import { houseHitsByFamily, HOUSE_WORD_SAMPLES, HOUSE_IDENTIFIER_SAMPLES, HOUSE_ID_SAMPLES, HOUSE_BENIGN_SAMPLES } from "./lib/house-bot-vocabulary.mjs";

/**
 * ⛔ THE VOCABULARY IS NOT DECLARED HERE (C5-SPEC ruling 175): words, identifiers and bounded ids come from
 * `scripts/lib/house-bot-vocabulary.mjs`, the one module every absence proof imports.
 *
 * ⭐ A FILE'S PATH IS SCANNED AS WELL AS ITS CONTENT (ruling 175, 255). A route segment or a chunk named after the feature
 * (`static/chunks/app/admin/house-bots/…`) is published to every visitor by its URL even when its bytes say nothing.
 */
/** Every hit in one file: its path under `.next/static` (forward slashes) and its content. */
function scanFile(relPath, content) {
  return [
    ...houseHitsByFamily(relPath).map((h) => ({ where: "path", family: h.family, word: h.word, ctx: relPath })),
    ...houseHitsByFamily(content).map((h) => ({ where: "content", family: h.family, word: h.word, ctx: content.slice(Math.max(0, h.index - 50), h.index + 70).replace(/\s+/g, " ") })),
  ];
}

// ⛔ CONTROLS FIRST, BEFORE THE BUILD IS EVEN LOOKED FOR — the scanner must be able to fail before its silence means anything. A planted sample of every family
// in a chunk's CONTENT, a planted feature name in a chunk's PATH, and the benign look-alikes found by neither.
{
  const planted = [...HOUSE_WORD_SAMPLES, ...HOUSE_IDENTIFIER_SAMPLES, ...HOUSE_ID_SAMPLES];
  const missedContent = planted.filter((s) => scanFile("static/chunks/0a1b2c.js", `var a=${JSON.stringify(s)};`).length === 0);
  const pathHits = scanFile("static/chunks/app/admin/house-bots/page-0a1b2c3d.js", "var a=1;");
  const benign = HOUSE_BENIGN_SAMPLES.flatMap((s) => scanFile("static/chunks/app/admin/house/page-0a1b2c3d.js", `var a=${JSON.stringify(s)};`));
  const controlsHold = missedContent.length === 0 && pathHits.some((h) => h.where === "path") && benign.length === 0;
  console.log(`${controlsHold ? "PASS" : "FAIL"} control · every planted family sample in content is found (${planted.length}), a planted house-bots route path is found, and HOUSE_FEE, /admin/house and raw hb_ look-alikes are not${controlsHold ? "" : ` — missed ${JSON.stringify(missedContent)} · path ${JSON.stringify(pathHits)} · benign ${JSON.stringify(benign)}`}`);
  if (!controlsHold) { console.log("FAIL — verify:house-bot-bundle: the scanner's own controls failed, so no result from it can be trusted"); process.exit(1); }
}

const root = path.resolve(process.argv[2] ?? process.cwd());
const dir = path.join(root, ".next", "static");
const buildId = path.join(root, ".next", "BUILD_ID");
if (!fs.existsSync(dir) || !fs.existsSync(buildId)) {
  console.log(`NOT MEASURED — no production build at ${path.join(root, ".next")} (run \`npx next build\` first)`);
  process.exit(2);
}
const builtAt = fs.statSync(buildId).mtimeMs;
const newestSource = (() => {
  let newest = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else newest = Math.max(newest, fs.statSync(p).mtimeMs);
    }
  };
  walk(path.join(root, "src"));
  return newest;
})();
if (newestSource > builtAt) {
  console.log(`NOT MEASURED — the build (${new Date(builtAt).toISOString()}) is older than a file under src/ (${new Date(newestSource).toISOString()}); rebuild first`);
  process.exit(2);
}

const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    // Every file's PATH is scanned (a font or image named after the feature ships its name too); only text is read.
    if (e.isDirectory()) walk(p); else files.push(p);
  }
};
walk(dir);
if (files.length === 0) { console.log(`NOT MEASURED — ${dir} holds no files`); process.exit(2); }

let total = 0;
const report = new Map();
for (const f of files) {
  const rel = path.relative(path.join(root, ".next"), f).replace(/\\/g, "/");
  const content = /\.(js|css|json|txt|map)$/.test(f) ? fs.readFileSync(f, "utf8") : "";
  for (const h of scanFile(rel, content)) {
    total++;
    const key = `${h.where} · ${h.family} · "${h.word}"`;
    const r = report.get(key) ?? { n: 0, files: new Set(), ctx: h.ctx };
    r.n++; r.files.add(path.relative(dir, f)); report.set(key, r);
  }
}
console.log(`scanned ${files.length} files under ${dir} (build ${new Date(builtAt).toISOString()})`);
for (const [key, r] of report) console.log(`FOUND ${key} ×${r.n} in ${r.files.size} file(s) · e.g. …${r.ctx}…`);
console.log(total === 0 ? "ALL PASS — verify:house-bot-bundle: no house-bot vocabulary in the public bundle" : `FAIL — verify:house-bot-bundle: ${total} hit(s)`);
process.exit(total === 0 ? 0 : 1);
