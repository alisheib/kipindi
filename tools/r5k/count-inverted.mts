/* Inverted spacing usages (test:spacing-scale's regex) per file: this tip's version against the worktree's. */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
const req = createRequire("F:/kipindi-r5k/package.json");
const { decomment } = req("F:/kipindi-r5k/scripts/lib/decomment.mts");
const defaultTheme = req("tailwindcss/defaultTheme");
const ROOT = "F:/kipindi-r5k/";
const twConfig = readFileSync(ROOT + "tailwind.config.ts", "utf8");
const block = /spacing:\s*\{([\s\S]*?)\n\s{6}\},/.exec(twConfig);
const OVERRIDE = new Map<string, number>();
for (const m of (block?.[1] ?? "").matchAll(/"([\d.]+)":\s*"(\d+)px"/g)) OVERRIDE.set(m[1], Number(m[2]));
const STOCK = new Map<string, number>();
for (const [k, v] of Object.entries((defaultTheme.default ?? defaultTheme).spacing as Record<string, string>)) {
  const rem = /^([\d.]+)rem$/.exec(v); if (rem) STOCK.set(k, Number(rem[1]) * 16); else if (v === "1px") STOCK.set(k, 1); else if (v === "0px") STOCK.set(k, 0);
}
const FORBIDDEN = new Set<string>();
for (const [k, px] of STOCK) { if (OVERRIDE.has(k) || !/^[\d.]+$/.test(k)) continue; for (const [o, opx] of OVERRIDE) if (Number(o) < Number(k) && opx >= px) { FORBIDDEN.add(k); break; } }
const PREFIX = "(?:p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y|w|h|size|min-w|min-h|max-w|max-h|top|right|bottom|left|start|end|inset|inset-x|inset-y|translate-x|translate-y|basis|scroll-mt|scroll-mb|scroll-pt|scroll-pb)";
const USE = new RegExp(`(?:^|[\\s"'\`:])(?:-)?${PREFIX}-(${[...FORBIDDEN].map((k) => k.replace(".", "\\.")).join("|")})\\b`, "g");
const files = execSync("git diff --name-only 9677a3f54 -- src && git ls-files --others --exclude-standard src", { cwd: ROOT, encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
let before = 0, after = 0;
for (const f of files) {
  let base = ""; try { base = execSync(`git show 9677a3f54:"${f}"`, { cwd: ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }); } catch { base = ""; }
  const now = existsSync(ROOT + f) ? readFileSync(ROOT + f, "utf8") : "";
  const b = [...decomment(base).matchAll(USE)].map((m) => m[0].trim()), a = [...decomment(now).matchAll(USE)].map((m) => m[0].trim());
  before += b.length; after += a.length;
  if (b.length || a.length) console.log(`${f}: ${b.length} → ${a.length}   [${b.join(" ")}] → [${a.join(" ")}]`);
}
console.log(`total over the changed files: ${before} → ${after} (${after - before})`);
