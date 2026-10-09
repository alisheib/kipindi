// R6-A · which registered suites read a file R6-A touched? Maps every package.json script to the script file it runs and
// the helper files it imports (one level: ./lib/*, ./anchors/*, ./design-gate/*), and lists the ones whose text names a
// touched path. Read-only. Prints the run list (static suites first), skipping drives that need a server, a browser or Postgres.
const fs = require("node:fs");
const path = require("node:path");
const ROOT = "F:/kipindi-r6a";
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const TOUCHED = [
  "lib/server/email.ts", "server/email\"", "server/email.ts", "lib/server/responsible-gambling", "lib/server/market-service", "lib/server/notification-service",
  "markets/[id]/page", "app/updown/page", "updown/[roundId]/page", "updown/history/page", "positions/performance/page",
  "leaderboard/page", "profile/activity/page", "round-action-panel", "updown-card", "components/rg/", "bet-break-notice",
  "comms-email-truth", "comms-email-shots", "email-preview", "email-stress", "poll-lifecycle-e2e",
];
const SKIP = /(^|\/)(load|rehearsals)\/|ops-|seed-|live-|\.e2e\.mts|playwright|chromium|qa-|-shots\.mts|email-preview|house-bots-local|probe\.mts/;
const readSafe = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } };
const helpersOf = (file, src) => {
  const out = [];
  for (const m of src.matchAll(/from\s+["'](\.\/[^"']+)["']|import\(\s*["'](\.\/[^"']+)["']\s*\)|["'](\.\/(?:lib|anchors|design-gate)\/[^"']+)["']/g)) {
    const rel = m[1] ?? m[2] ?? m[3];
    out.push(path.join(path.dirname(file), rel));
  }
  return out;
};
const rows = [];
for (const [name, cmd] of Object.entries(pkg.scripts)) {
  if (!/^(test|red):/.test(name)) continue;
  const m = /(?:tsx|node)\s+(scripts\/[^\s]+)/.exec(cmd);
  if (!m) continue;
  const file = path.join(ROOT, m[1]);
  if (SKIP.test(m[1])) continue;
  const src = readSafe(file);
  const all = [src, ...helpersOf(file, src).map(readSafe)].join("\n");
  const hits = TOUCHED.filter((t) => all.includes(t));
  if (hits.length) rows.push({ name, file: m[1], hits });
}
rows.sort((a, b) => a.name.localeCompare(b.name));
for (const r of rows) console.log(`${r.name}\t${r.file}\t${r.hits.join(",")}`);
console.log(`\n${rows.length} suites`);
