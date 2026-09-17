/**
 * `npm run verify:house-bot-bundle` — does anything every visitor can download say anything about house bots?
 *
 * ⛔ OWNER RULING D19 (2026-09-16): house bots are never public. What a player is TOLD is only half of that; the
 * other half is what the public site SHIPS. A dictionary, a failure registry or a switch case that a client
 * component imports is in the browser bundle whether or not any screen renders it, and anyone can read it.
 *
 * ⭐ THE POPULATION IS WHAT THE SITE SERVES, NOT A LIST OF FILES. Three places, each read whole:
 *   · `.next/static` of a real `next build` — every chunk, so an import chain nobody thought of is caught, which is how
 *     C4 ruling 151 was found: an admin client component imported a constant from a server module and pulled Prisma's
 *     browser runtime, naming every model, into a chunk served on every route;
 *   · the build's PRERENDERED documents — `.next/server/app/**` and `.next/server/pages/**` `.html`, `.rsc`, `.body` and
 *     `.meta` (headers), served as they are without running any server code (the server's own `.js` and manifests are not
 *     served, and are not read);
 *   · `public/` — served at the site root as it is (`sw.js`, `manifest.json`, icons, images), whatever the build did.
 *
 * ⭐ SHOWN ABLE TO FAIL: on `54dbb0dd` (before the D19 un-build) this found 320 hits; after it, 0 (C4 ruling 152).
 *
 * Usage: `npx next build` first (heavy — it is not in `test:all`; the commit's closing gates and REL-0 run it), then
 * `npm run verify:house-bot-bundle [repoRoot]`. A missing or stale build, or an empty population, is NOT MEASURED, never a pass.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { houseHitsByFamily, HOUSE_WORD_SAMPLES, HOUSE_IDENTIFIER_SAMPLES, HOUSE_ID_SAMPLES, HOUSE_BENIGN_SAMPLES } from "./lib/house-bot-vocabulary.mjs";

/**
 * ⛔ THE VOCABULARY IS NOT DECLARED HERE (C5-SPEC ruling 175): words, identifiers and bounded ids come from
 * `scripts/lib/house-bot-vocabulary.mjs`, the one module every absence proof imports.
 *
 * ⭐ A FILE'S PATH IS SCANNED AS WELL AS ITS CONTENT (ruling 175, 255). A route segment or a chunk named after the feature
 * (`static/chunks/app/admin/house-bots/…`) is published to every visitor by its URL even when its bytes say nothing.
 */
/** Every hit in one file: its path (forward slashes, relative to `.next` or the repo root) and its content. */
function scanFile(relPath, content) {
  return [
    ...houseHitsByFamily(relPath).map((h) => ({ where: "path", family: h.family, word: h.word, ctx: relPath })),
    ...houseHitsByFamily(content).map((h) => ({ where: "content", family: h.family, word: h.word, ctx: content.slice(Math.max(0, h.index - 50), h.index + 70).replace(/\s+/g, " ") })),
  ];
}

/** Text files are read; every file's path is scanned regardless (an image named after the feature ships its name too). */
const TEXT = /\.(js|mjs|css|json|txt|map|html|rsc|meta|body|svg|webmanifest|xml)$/;
/** The prerendered documents a request is answered with as they are; never the server's own code or manifests. */
const PRERENDERED = /\.(html|rsc|meta|body)$/;

/** Every file under `dir` (recursive), filtered by `keep` on its path. */
function filesUnder(dir, keep = () => true) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else if (keep(p)) out.push(p);
    }
  };
  walk(dir);
  return out;
}

/** The three served populations of a checkout at `root`. */
function populationsOf(root) {
  const next = path.join(root, ".next");
  return [
    { name: ".next/static", base: next, files: filesUnder(path.join(next, "static")) },
    { name: ".next/server prerendered documents", base: next, files: [...filesUnder(path.join(next, "server", "app"), (p) => PRERENDERED.test(p)), ...filesUnder(path.join(next, "server", "pages"), (p) => PRERENDERED.test(p))] },
    { name: "public/", base: root, files: filesUnder(path.join(root, "public")) },
  ];
}

/** Every hit across the populations, grouped by what was found, with the files each was found in. */
function scanPopulations(populations) {
  let total = 0;
  const report = new Map();
  const files = new Set();
  for (const pop of populations) {
    for (const f of pop.files) {
      const rel = path.relative(pop.base, f).replace(/\\/g, "/");
      const content = TEXT.test(f) ? fs.readFileSync(f, "utf8") : "";
      for (const h of scanFile(rel, content)) {
        total++;
        files.add(rel);
        const key = `${h.where} · ${h.family} · "${h.word}"`;
        const r = report.get(key) ?? { n: 0, files: new Set(), ctx: h.ctx };
        r.n++; r.files.add(rel); report.set(key, r);
      }
    }
  }
  return { total, report, files: [...files].sort() };
}

// ⛔ CONTROLS FIRST, BEFORE THE BUILD IS EVEN LOOKED FOR — the scanner must be able to fail before its silence means anything.
// (1) A planted sample of every family in content, a planted feature name in a path, and the benign look-alikes found by
// neither. (2) The WALKER, over a planted checkout: a hit in each of the three populations is found, and the server's own
// code and manifests, which are never served, are not read.
{
  const planted = [...HOUSE_WORD_SAMPLES, ...HOUSE_IDENTIFIER_SAMPLES, ...HOUSE_ID_SAMPLES];
  const missedContent = planted.filter((s) => scanFile("static/chunks/0a1b2c.js", `var a=${JSON.stringify(s)};`).length === 0);
  const pathHits = scanFile("static/chunks/app/admin/house-bots/page-0a1b2c3d.js", "var a=1;");
  const benign = HOUSE_BENIGN_SAMPLES.flatMap((s) => scanFile("static/chunks/app/admin/house/page-0a1b2c3d.js", `var a=${JSON.stringify(s)};`));

  const fake = fs.mkdtempSync(path.join(os.tmpdir(), "hb-bundle-control-"));
  let walker = { total: -1, files: [] };
  try {
    const plant = (rel, content) => { const p = path.join(fake, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); };
    plant(".next/static/chunks/0a1b2c.js", 'var a="house bot";');
    plant(".next/static/chunks/clean.js", "var a=1;");
    plant(".next/server/app/admin/house-bots.html", "<p>ok</p>");
    plant(".next/server/app/index.meta", '{"headers":{"x-note":"liquidity"}}');
    plant(".next/server/pages/500.html", "<p>boti za nyumba</p>");
    plant(".next/server/app/page.js", 'module.exports="house bot";');
    plant(".next/server/app/admin/page/server-reference-manifest.json", '{"houseBotId":1}');
    plant("public/icons/house-bot-192.png", "PNG");
    plant("public/sw.js", 'self.x="HouseBotStatus";');
    walker = scanPopulations(populationsOf(fake));
  } finally {
    fs.rmSync(fake, { recursive: true, force: true });
  }
  const expectedFiles = ["public/icons/house-bot-192.png", "public/sw.js", "server/app/admin/house-bots.html", "server/app/index.meta", "server/pages/500.html", "static/chunks/0a1b2c.js"];
  const walkerHolds = JSON.stringify(walker.files) === JSON.stringify(expectedFiles);
  const controlsHold = missedContent.length === 0 && pathHits.some((h) => h.where === "path") && benign.length === 0 && walkerHolds;
  console.log(`${controlsHold ? "PASS" : "FAIL"} control · every planted family sample in content is found (${planted.length}), a planted house-bots path is found, HOUSE_FEE, /admin/house and raw hb_ look-alikes are not, and over a planted checkout the walker finds the static chunk, the prerendered app page, headers and pages document, and the public icon and service worker — and never reads the server's own code or manifests${controlsHold ? "" : ` — missed ${JSON.stringify(missedContent)} · path ${JSON.stringify(pathHits)} · benign ${JSON.stringify(benign)} · walker found ${JSON.stringify(walker.files)} (expected ${JSON.stringify(expectedFiles)})`}`);
  if (!controlsHold) { console.log("FAIL — verify:house-bot-bundle: the scanner's own controls failed, so no result from it can be trusted"); process.exit(1); }
}

const root = path.resolve(process.argv[2] ?? process.cwd());
const next = path.join(root, ".next");
const buildId = path.join(next, "BUILD_ID");
if (!fs.existsSync(path.join(next, "static")) || !fs.existsSync(buildId)) {
  console.log(`NOT MEASURED — no production build at ${next} (run \`npx next build\` first)`);
  process.exit(2);
}
const builtAt = fs.statSync(buildId).mtimeMs;
const newestSource = filesUnder(path.join(root, "src")).reduce((newest, p) => Math.max(newest, fs.statSync(p).mtimeMs), 0);
if (newestSource > builtAt) {
  console.log(`NOT MEASURED — the build (${new Date(builtAt).toISOString()}) is older than a file under src/ (${new Date(newestSource).toISOString()}); rebuild first`);
  process.exit(2);
}

const populations = populationsOf(root);
const empty = populations.filter((p) => p.files.length === 0);
if (empty.length > 0) { console.log(`NOT MEASURED — no files in ${empty.map((p) => p.name).join(", ")}`); process.exit(2); }

const { total, report } = scanPopulations(populations);
console.log(`scanned ${populations.map((p) => `${p.files.length} files under ${p.name}`).join(" · ")} (build ${new Date(builtAt).toISOString()})`);
for (const [key, r] of report) console.log(`FOUND ${key} ×${r.n} in ${r.files.size} file(s) · e.g. …${r.ctx}…`);
console.log(total === 0 ? "ALL PASS — verify:house-bot-bundle: no house-bot vocabulary in the public bundle, the prerendered documents or public/" : `FAIL — verify:house-bot-bundle: ${total} hit(s)`);
process.exit(total === 0 ? 0 : 1);
