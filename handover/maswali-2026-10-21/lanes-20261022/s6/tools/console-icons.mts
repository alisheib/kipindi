// console-icons.mts <ref> — per-file typed icon characters under src/(app|components)/admin/ in the working tree, and the
// same files at <ref>, using glyph-source's own regex on decommented code (the repo's shared decomment helper). Read-only.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
const root = process.cwd();
const ref = process.argv[2] ?? "HEAD";
const { decomment } = await import(pathToFileURL(join(root, "scripts/lib/decomment.mts")).href);
const RE = /[▲▼△▽▶◀►◄▸▾▴◂★☆✓✔✗✘✕✖⚠⛔↑↓↗↘↖↙→←●○◉☰ⓘℹ‹›≡⋮⋯⇅◆■□✦⌄]|\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]/gu;
const NOT = new Set(["©", "®", "™"]);
const walk = (d: string): string[] => readdirSync(d).flatMap((e) => { const p = join(d, e); return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mts)$/.test(e) ? [p] : []; });
const toRel = (p: string) => p.slice(root.length + 1).split("\\").join("/");
const files = [...walk(join(root, "src/app/admin")), ...walk(join(root, "src/components/admin"))].map(toRel);
const count = (text: string) => [...decomment(text).matchAll(RE)].filter((m) => !NOT.has(m[0])).length;
let wt = 0, at = 0;
for (const rel of files.sort()) {
  if (/\.generated\./.test(rel)) continue;
  const n = count(readFileSync(join(root, rel), "utf8"));
  let m = 0;
  try { m = count(execFileSync("git", ["show", `${ref}:${rel}`], { encoding: "utf8", maxBuffer: 64 << 20 })); } catch { m = -1; }
  wt += n; at += Math.max(0, m);
  if (n !== m) console.log(`${rel}: tree ${n} · ${ref} ${m === -1 ? "absent" : m}`);
}
console.log(`total tree ${wt} · ${ref} ${at}`);
