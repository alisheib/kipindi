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

/** The house vocabulary in the three locales, and the identifiers the feature's code uses. */
const PATTERNS = {
  liquidity: /liquidity/gi,
  ukwasi: /ukwasi/gi,
  zhLiquidity: /流动性/g,
  houseBot: /house[_ -]?bots?/gi,
  houseSnake: /\bhouse_[a-z]+/g,
  // `HOUSE_FEE` is the platform's own transaction type (the operator's fee), not house-bot wording.
  HOUSE_UPPER: /HOUSE_(?!FEE\b)[A-Z_]+/g,
  houseFields: /houseStake|houseOnly|houseBotId|HouseBot[A-Z]\w*/g,
  botiNyumba: /boti (za|ya) nyumba/gi,
  zhBot: /平台机器人/g,
};

const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (/\.(js|css|json|txt|map)$/.test(e.name)) files.push(p);
  }
};
walk(dir);
if (files.length === 0) { console.log(`NOT MEASURED — ${dir} holds no files`); process.exit(2); }

let total = 0;
const report = new Map();
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  for (const [name, re] of Object.entries(PATTERNS)) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(s))) {
      total++;
      const key = `${name} · "${m[0]}"`;
      const r = report.get(key) ?? { n: 0, files: new Set(), ctx: s.slice(Math.max(0, m.index - 50), m.index + 70).replace(/\s+/g, " ") };
      r.n++; r.files.add(path.relative(dir, f)); report.set(key, r);
    }
  }
}
console.log(`scanned ${files.length} files under ${dir} (build ${new Date(builtAt).toISOString()})`);
for (const [key, r] of report) console.log(`FOUND ${key} ×${r.n} in ${r.files.size} file(s) · e.g. …${r.ctx}…`);
console.log(total === 0 ? "ALL PASS — verify:house-bot-bundle: no house-bot vocabulary in the public bundle" : `FAIL — verify:house-bot-bundle: ${total} hit(s)`);
process.exit(total === 0 ? 0 : 1);
