// Runs npm scripts ONE AT A TIME from F:/kipindi-r5e, recording each exit code, its time and its last lines.
//   node run-suites.mjs <out.log> [--touched] [name ...]
// --touched adds every static suite whose script reads a path this worktree changes (git diff + untracked), plus the
// rules' required list; a script that drives a browser (playwright / chromium.launch) is skipped as a live audit.
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { spawnSync, execFileSync } from "node:child_process";

const ROOT = "F:/kipindi-r5e";
const [OUT, ...rest] = process.argv.slice(2);
const pkg = JSON.parse(readFileSync(`${ROOT}/package.json`, "utf8"));
const S = pkg.scripts;
const fileOf = (cmd) => /(?:tsx|node)\s+(scripts\/[\w./\-\[\]]+)/.exec(cmd)?.[1];
const named = rest.filter((x) => !x.startsWith("--"));
let list = [...named];
if (rest.includes("--touched")) {
  const git = (...a) => execFileSync("git", ["-C", ROOT, ...a], { encoding: "utf8" });
  const changed = [...git("diff", "--name-only").split("\n"), ...git("ls-files", "--others", "--exclude-standard").split("\n")].filter(Boolean)
    .filter((f) => f.startsWith("src/"));
  // A path as a suite would name it: the file, its path without the extension, and for globals.css the file name.
  // …and its file name ("toast.tsx", "globals.css"), or for a page/route/loading file its folder and name ("fairness/page").
  const fileName = (f) => { const parts = f.split("/"); const name = parts.at(-1); return /^(?:page|route|loading|layout|not-found|error)\./.test(name) ? `${parts.at(-2)}/${name.replace(/\.(tsx?|css)$/, "")}` : name; };
  const needles = [...new Set(changed.flatMap((f) => [f, f.replace(/\.(tsx?|css)$/, ""), f.replace(/^src\//, "").replace(/\.(tsx?|css)$/, ""), fileName(f)]))];
  const readers = Object.keys(S).filter((k) => k.startsWith("test:") && k !== "test:all").filter((k) => {
    const f = fileOf(S[k]); if (!f) return false;
    let src = ""; try { src = readFileSync(`${ROOT}/${f}`, "utf8"); } catch { return false; }
    return needles.some((t) => src.includes(t));
  });
  const required = ["test:red-anchors", "test:decomment", "test:hooks-order", "test:ui-consistency", "test:i18n", "test:journey-shell",
    "test:simple-journey-flag", "test:eyebrow-roles", "test:type-scale", "test:spacing-scale", "test:design-frozen", "test:css-vars-defined", "test:stacking"];
  list = [...new Set([...named, ...required, ...readers])];
}
const live = (k) => { const f = fileOf(S[k] ?? ""); try { return /playwright|chromium\.launch|webkit\.launch/.test(readFileSync(`${ROOT}/${f}`, "utf8")); } catch { return false; } };
const skipped = list.filter((k) => S[k] && live(k));
const run = list.filter((k) => S[k] && !live(k));
const missing = list.filter((k) => !S[k]);
writeFileSync(OUT, `# ${run.length} suites, ${new Date().toISOString()}\n# skipped as live (browser): ${skipped.join(", ") || "none"}\n# not in package.json: ${missing.join(", ") || "none"}\n`);
if (rest.includes("--dry")) { console.log(`${run.length} to run:\n${run.join(" ")}\nskipped (browser): ${skipped.join(" ")}`); process.exit(0); }
for (const k of run) {
  const t0 = Date.now();
  const r = spawnSync("npm", ["run", "-s", k], { cwd: ROOT, encoding: "utf8", shell: true, timeout: 900_000 });
  const tail = (String(r.stdout ?? "") + String(r.stderr ?? "")).trim().split("\n").slice(-3).join(" ⏎ ").slice(0, 500);
  appendFileSync(OUT, `${k}\texit ${r.status}\t${((Date.now() - t0) / 1000).toFixed(0)}s\t${tail}\n`);
}
appendFileSync(OUT, "# done\n");
