// Which `test:*` scripts read a file this change touches (by name in the suite's source), minus suites that boot a
// database, bind a port or drive a browser. Prints one script name per line.
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const keys = ["app/loading.tsx", "live/loading.tsx", "landing-hero", "hero-intro", "app-shell", "shell-lazy", "route-transition",
  "route-ghost", "route-pick", "journey-top-bar", "journey-tabs", "ChatRoot", "channels-panel", "layout/needle.tsx", "needle.tsx",
  "not-found-mark", "globals.css", "notifications-panel", "query-bar", "updown/loading", "package.json"];
const broad = /readdirSync\(\s*["'`](src|src\/app|src\/components)["'`]|walk\(\s*["'`]src|globSync|readdirSync\(.*recursive/;
const out = [];
for (const [name, cmd] of Object.entries(pkg.scripts)) {
  if (!name.startsWith("test:")) continue;
  const m = /(scripts\/[\w./-]+\.(?:mts|mjs|cjs|ts|js))/.exec(cmd);
  if (!m || !fs.existsSync(m[1])) continue;
  const src = fs.readFileSync(m[1], "utf8");
  if (/db-scratch|\.listen\(|createServer\(|localhost:3000|chromium|playwright/.test(src)) continue;
  const hit = keys.filter((k) => src.includes(k));
  const scans = broad.test(src);
  if (hit.length || scans) out.push(`${name}\t${scans ? "scan" : ""}${hit.length ? (scans ? "+" : "") + hit.join(",") : ""}`);
}
console.log(out.join("\n"));
console.error(`${out.length} suites`);
