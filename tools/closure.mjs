// Walk the static import closure of the ai-cycles gate's four product modules (relative + @/ imports)
// and list every file that uses the `@/` alias, to prove which import breaks inside node_modules.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const REPO = process.argv[2] ?? "F:/kipindi-rot1";
const seeds = [
  "src/lib/server/ai-usage.ts",
  "src/lib/server/ai-cycles.ts",
  "src/lib/server/ai-cycle-dal.ts",
  "src/lib/ai-cycle-rules.ts",
  "src/lib/server/ai-usage-dal.ts",
];
const seen = new Set();
const aliasHits = [];
const unresolved = [];

function resolveFile(base, spec) {
  const cands = [base, base + ".ts", base + ".tsx", join(base, "index.ts"), join(base, "index.tsx")];
  return cands.find((c) => existsSync(c) && !c.endsWith("/") && statSafe(c));
}
import { statSync } from "node:fs";
function statSafe(c) { try { return statSync(c).isFile(); } catch { return false; } }

function walk(rel) {
  if (seen.has(rel)) return;
  seen.add(rel);
  const abs = join(REPO, rel);
  const src = readFileSync(abs, "utf8");
  const re = /(?:^|\n)\s*(?:import|export)\b[^;]*?\sfrom\s+["']([^"']+)["']|(?:^|\n)\s*import\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;
  for (const m of src.matchAll(re)) {
    const spec = m[1] ?? m[2] ?? m[3];
    if (!spec) continue;
    let target;
    if (spec.startsWith("@/")) {
      aliasHits.push(`${rel}  ->  ${spec}`);
      target = resolveFile(join(REPO, "src", spec.slice(2)), spec);
    } else if (spec.startsWith(".")) {
      target = resolveFile(resolve(dirname(abs), spec), spec);
    } else continue; // bare specifier
    if (!target) { unresolved.push(`${rel} -> ${spec}`); continue; }
    walk(target.slice(REPO.length + 1).replace(/\\/g, "/"));
  }
}
for (const s of seeds) walk(s);
console.log(`files in closure: ${seen.size}`);
console.log(`alias imports (${aliasHits.length}):`);
for (const a of aliasHits) console.log("  " + a);
console.log(`unresolved (${unresolved.length}):`); for (const u of unresolved) console.log("  " + u);
