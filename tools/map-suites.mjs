// Read-only: map package.json npm scripts -> the script files they run, then keep the ones whose
// file (or a lib it obviously reads) mentions a file this change touches.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = "F:/kipindi-tleft";
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const scripts = pkg.scripts;

// Everything under scripts/ that is source text we might read.
function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(mts|mjs|ts|js|cjs|json)$/.test(e)) out.push(p.replace(/\\/g, "/"));
  }
  return out;
}
const all = walk(join(ROOT, "scripts"));
const rel = (p) => p.replace(ROOT + "/", "");

// What this change touches (the pattern is a literal fragment of how a script would name the file).
const TOUCHED = [
  "i18n-dict",
  "time-left",
  "landing-hero",
  "markets/page",
  "live/page",
  "markets/[id]/page",
  "markets\\\\[id\\\\]/page",
];

const mentions = new Map(); // file -> which patterns
for (const f of all) {
  if (!/\.(mts|mjs|ts|js|cjs)$/.test(f)) continue;
  const src = readFileSync(f, "utf8");
  const hit = TOUCHED.filter((p) => src.includes(p));
  if (hit.length) mentions.set(rel(f), hit);
}

// Which npm scripts run which file.
const byFile = new Map();
for (const [name, cmd] of Object.entries(scripts)) {
  const m = [...String(cmd).matchAll(/scripts\/([A-Za-z0-9_./-]+\.(?:mts|mjs|ts|js|cjs))/g)].map((x) => "scripts/" + x[1]);
  for (const f of m) {
    if (!byFile.has(f)) byFile.set(f, []);
    byFile.get(f).push(name);
  }
}

const rows = [];
for (const [f, hits] of mentions) {
  const names = byFile.get(f) ?? [];
  rows.push({ file: f, hits: hits.join(","), npm: names.join(" | ") || "(none)", cmd: names.map((n) => scripts[n]).join(" | ").slice(0, 160) });
}
rows.sort((a, b) => a.file.localeCompare(b.file));
for (const r of rows) console.log(`${r.file}\t${r.hits}\t${r.npm}\t${r.cmd}`);
console.log(`\n${rows.length} script files mention a touched file; ${rows.filter((r) => r.npm !== "(none)").length} are wired to an npm script.`);
