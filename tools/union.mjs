// Read-only: build the list of npm test scripts that read a file this change touches, either by
// NAME (the file path appears in the suite) or by WALKING the whole src tree.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = "F:/kipindi-tleft";
const scripts = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).scripts;

const TOUCHED = ["i18n-dict", "time-left", "landing-hero", "markets/page", "live/page", "markets/[id]/page", "markets\\\\[id\\\\]/page"];
const WALKS = /walk\(("|')src|walk\(join\([A-Za-z_]*,? ?("|')src|readdirSync\(("|')src|readdirSync\(join\([A-Za-z_]*, ?("|')src|globSync\(("|')src|"src"\)|'src'\)|src\/\*\*|SRC_ROOT|srcFiles|allSrc|listSrc/;

// Always-include extras that read the source tree or the anchors without naming a file.
const EXTRA = new Set(["test:source-bytes", "test:red-anchors", "test:decomment", "test:time-left"]);

const out = [];
const skipped = [];
for (const [name, cmd] of Object.entries(scripts)) {
  if (!name.startsWith("test:")) continue;
  const m = /^tsx scripts\/([A-Za-z0-9_.-]+\.test\.mts)$/.exec(String(cmd));
  if (!m) { if (EXTRA.has(name)) skipped.push(`${name} (not a plain tsx script: ${cmd})`); continue; }
  const file = join(ROOT, "scripts", m[1]);
  let src = "";
  try { src = readFileSync(file, "utf8"); } catch { skipped.push(`${name} (cannot read ${m[1]})`); continue; }
  const byName = TOUCHED.some((p) => src.includes(p));
  const walks = WALKS.test(src);
  if (byName || walks || EXTRA.has(name)) out.push({ name, file: m[1], byName, walks });
}
out.sort((a, b) => a.name.localeCompare(b.name));
console.log(out.map((o) => o.name).join("\n"));
console.error(`\nselected ${out.length} suites (${out.filter((o) => o.byName).length} by name, ${out.filter((o) => o.walks).length} by walk); skipped: ${skipped.length}`);
for (const s of skipped) console.error("  skipped " + s);
