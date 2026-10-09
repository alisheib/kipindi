// R5-B · which npm suites read a file this change touches: every test:* whose script file (or a scripts/lib module it
// imports) names one of the touched paths. Prints the suites, split into static (plain tsx/node) and heavy (db-scratch,
// live, browser, build) — the heavy ones need a lock turn.
const fs = require("fs");
const path = require("path");
const ROOT = "F:/kipindi-r5b/";
const touched = process.argv.slice(2);
const pkg = JSON.parse(fs.readFileSync(ROOT + "package.json", "utf8"));
const scripts = pkg.scripts;
const readSafe = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } };
// The script file each test:* runs (the first scripts/... path in its command).
const fileOf = (cmd) => (/(scripts\/[\w./-]+\.(?:mts|mjs|ts|cjs|js))/.exec(cmd) || [])[1];
// A script file plus the scripts/lib modules it imports (one level), as text.
const textOf = (rel) => {
  const own = readSafe(ROOT + rel);
  const libs = [...own.matchAll(/from\s+["'](\.\/lib\/[\w./-]+|\.\.\/lib\/[\w./-]+)["']/g)].map((m) => path.posix.join(path.posix.dirname(rel), m[1]));
  return own + "\n" + libs.map((l) => readSafe(ROOT + l)).join("\n");
};
const names = (p) => {
  const base = p.replace(/^src\//, "");
  const noExt = p.replace(/\.(tsx?|mts|css)$/, "");
  return [p, base, noExt, noExt.replace(/^src\//, "@/")];
};
const hits = {};
for (const [name, cmd] of Object.entries(scripts)) {
  if (!/^(test|red|qa|check|verify):/.test(name)) continue;
  const f = fileOf(cmd);
  if (!f) continue;
  const text = textOf(f);
  const which = touched.filter((t) => names(t).some((n) => text.includes(n)));
  if (which.length) hits[name] = { cmd, which };
}
const heavy = (cmd) => /db-scratch|live\/|playwright|--headed|next build|chromium|browser|qa-|drive/.test(cmd);
const out = { static: [], heavy: [] };
for (const [name, { cmd, which }] of Object.entries(hits)) (heavy(cmd) ? out.heavy : out.static).push(`${name}  [${which.map((w) => path.basename(w)).join(", ")}]`);
console.log(`STATIC (${out.static.length}):\n  ` + out.static.sort().join("\n  "));
console.log(`\nHEAVY (${out.heavy.length}):\n  ` + out.heavy.sort().join("\n  "));
