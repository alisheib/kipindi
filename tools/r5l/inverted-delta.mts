/* R5-L · spacing-scale's inverted-key usages per changed file, HEAD vs the worktree (its own regex and decomment). */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
const { decomment } = await import("file:///F:/kipindi-r5l/scripts/lib/decomment.mts");
const FORBIDDEN = ["14", "16", "20", "24", "28", "32", "2.5", "3.5"];
const PREFIX = "(?:p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y|w|h|size|min-w|min-h|max-w|max-h|top|right|bottom|left|start|end|inset|inset-x|inset-y|translate-x|translate-y|basis|scroll-mt|scroll-mb|scroll-pt|scroll-pb)";
const USE = new RegExp(`(?:^|[\\s"'\`:])(?:-)?${PREFIX}-(${FORBIDDEN.map((k) => k.replace(".", "\\.")).join("|")})\\b`, "g");
const cwd = "F:/kipindi-r5l";
const files = [
  ...execSync("git diff --name-only", { cwd, encoding: "utf8" }).trim().split(/\r?\n/),
  ...execSync("git ls-files --others --exclude-standard", { cwd, encoding: "utf8" }).trim().split(/\r?\n/),
].filter((f) => /^src\/.*\.tsx?$/.test(f));
let before = 0, after = 0;
for (const f of files) {
  let old = "";
  try { old = execSync(`git show HEAD:"${f}"`, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }); } catch { old = ""; }
  const now = existsSync(`${cwd}/${f}`) ? readFileSync(`${cwd}/${f}`, "utf8") : "";
  const b = [...decomment(old).matchAll(USE)].map((m) => m[0].trim());
  const a = [...decomment(now).matchAll(USE)].map((m) => m[0].trim());
  before += b.length; after += a.length;
  if (b.length !== a.length) console.log(`${f}: ${b.length} → ${a.length}  removed [${b.filter((x) => !a.includes(x)).join(" ")}] added [${a.filter((x) => !b.includes(x)).join(" ")}]`);
}
console.log(`total over changed files: ${before} → ${after} (${after - before})`);
