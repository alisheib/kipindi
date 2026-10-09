// Runs the named npm scripts ONE AT A TIME from the cwd (F:\kipindi-r4d), recording each exit code and its last lines.
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const OUT = process.argv[2];
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const S = pkg.scripts;
const fileOf = (cmd) => /(?:tsx|node)\s+(scripts\/[\w./-]+)/.exec(cmd)?.[1];

const required = ["test:market-columns", "test:updown-filter-sheet", "test:money-format", "test:type-scale", "test:contrast",
  "test:ui-consistency", "test:density-contract", "test:design-frozen", "test:dead-css", "test:css-vars-defined",
  "test:featured-card", "test:measure", "test:tap-target", "test:hooks-order", "test:red-anchors", "test:decomment",
  "test:gold-is-money", "test:visual-pass-r4d"];
const updown = Object.keys(S).filter((k) => /^test:updown-/.test(k));
// Every static suite that reads a file this change touches (grep of scripts/ for the path).
const touched = ["terminal-chart", "updown-chart-lab", "updown-stake-controls", "updown-card", "round-stake-panel", "price-hero",
  "updown/[roundId]/page", "live/pulse-grid", "globals.css", "markets/[id]/page", "results/page", "markets/loading", "brand.tsx", "query-bar", "positions/page", "eyebrow"];
const readers = Object.keys(S).filter((k) => k.startsWith("test:") && k !== "test:all").filter((k) => {
  const f = fileOf(S[k]); if (!f) return false;
  let src = ""; try { src = readFileSync(f, "utf8"); } catch { return false; }
  return touched.some((t) => src.includes(t));
});
// ⛔ No browser: a suite whose script drives Playwright/Chromium is a live audit (needs a server), never run here.
const live = (k) => { const f = fileOf(S[k]); try { return /playwright|chromium.launch/.test(readFileSync(f, "utf8")); } catch { return false; } };
const all = [...new Set([...required, ...updown, ...readers, "test:eyebrow-roles"])];
const skipped = all.filter(live);
const list = all.filter((k) => !live(k));
writeFileSync(OUT, `# ${list.length} suites, ${new Date().toISOString()}\n`);
appendFileSync(OUT, `# skipped as live (browser): ${skipped.join(", ")}\n`);
for (const k of list) {
  const t0 = Date.now();
  const r = spawnSync("npm", ["run", "-s", k], { encoding: "utf8", shell: true, timeout: 600_000 });
  const tail = (String(r.stdout ?? "") + String(r.stderr ?? "")).trim().split("\n").slice(-3).join(" ⏎ ").slice(0, 400);
  appendFileSync(OUT, `${k}\texit ${r.status}\t${((Date.now() - t0) / 1000).toFixed(0)}s\t${tail}\n`);
}
appendFileSync(OUT, "# done\n");
