// R5-G · which npm suites read a file this worktree touched: grep scripts/ for each touched path's distinctive forms,
// then map each script file to the package.json entries that run it (test:* and red:* only — never a drive or a browser).
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "F:/kipindi-r5g";
const git = (...a) => execFileSync("git", ["-C", ROOT, ...a], { encoding: "utf8" });
const touched = [...git("diff", "--name-only").split("\n"), ...git("ls-files", "--others", "--exclude-standard").split("\n")].filter(Boolean)
  .filter((p) => p.startsWith("src/"));
const forms = (p) => {
  const rel = p.replace(/^src\//, "");
  const noExt = rel.replace(/\.(tsx?|mts)$/, "");
  const parts = noExt.split("/");
  const base = parts.at(-1);
  // A generic basename (page, loading) is only distinctive with its folder.
  const generic = ["page", "loading", "actions", "route", "layout"].includes(base);
  return [rel, noExt, generic ? parts.slice(-2).join("/") : base].filter((x, i, a) => a.indexOf(x) === i);
};
const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : /\.(m?[jt]s|cjs)$/.test(n) ? [p.replace(/\\/g, "/").replace(`${ROOT}/`, "")] : [];
});
const scripts = walk(`${ROOT}/scripts`);
const readers = new Map();
for (const s of scripts) {
  const body = readFileSync(join(ROOT, s), "utf8");
  for (const p of touched) for (const f of forms(p)) {
    // `profile/page` must not match `profile/invite/page`, etc.: require a non-word char or quote before the form.
    const re = new RegExp(`(^|[^\\w/-])(src/)?${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\.tsx?|\\.mts|["'\`]|\\b)`);
    if (re.test(body)) { if (!readers.has(s)) readers.set(s, new Set()); readers.get(s).add(p); }
  }
}
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).scripts;
const npm = new Map();
for (const [name, cmd] of Object.entries(pkg)) {
  if (!/^(test|red):/.test(name)) continue;
  for (const s of readers.keys()) {
    const file = s.replace(/^scripts\//, "");
    if (cmd.includes(`scripts/${file}`) || cmd.includes(file)) { if (!npm.has(name)) npm.set(name, new Set()); for (const p of readers.get(s)) npm.get(name).add(p); }
  }
}
const libReaders = [...readers.keys()].filter((s) => s.startsWith("scripts/lib/") || s.startsWith("scripts/anchors/"));
console.log(`touched src files: ${touched.length}`);
console.log(`scripts reading them: ${readers.size} (${libReaders.length} are libs/anchors, run through their suites)`);
for (const [name, ps] of [...npm].sort()) console.log(`${name}\t${[...ps].map((p) => p.replace(/^src\//, "")).join(", ")}`);
const unmapped = [...readers.keys()].filter((s) => ![...Object.values(pkg)].some((c) => c.includes(s.replace(/^scripts\//, ""))));
console.log(`\nscripts with no test:/red: entry (drives, libs, anchors): ${unmapped.join(" ")}`);
