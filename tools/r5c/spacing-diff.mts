// Which changed files moved spacing-scale's inverted-key count (HEAD vs working tree), and on which keys.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { decomment } from "file:///F:/kipindi-r5c/scripts/lib/decomment.mts";

const ROOT = "F:/kipindi-r5c";
const PREFIX = "(?:p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y|w|h|size|min-w|min-h|max-w|max-h|top|right|bottom|left|start|end|inset|inset-x|inset-y|translate-x|translate-y|basis|scroll-mt|scroll-mb|scroll-pt|scroll-pb)";
const KEYS = ["14", "16", "20", "24", "28", "32", "2.5", "3.5"];
const USE = new RegExp(`(?:^|[\\s"'\`:])(?:-)?${PREFIX}-(${KEYS.map((k) => k.replace(".", "\\.")).join("|")})\\b`, "g");
const files = execSync("git diff --name-only -- src", { cwd: ROOT, encoding: "utf8" }).split("\n").filter((f) => /\.tsx?$/.test(f));
for (const f of files) {
  let head = "";
  try { head = execSync(`git show "HEAD:${f}"`, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); } catch { head = ""; }
  const now = readFileSync(`${ROOT}/${f}`, "utf8");
  const a = [...decomment(head).matchAll(USE)].map((m) => m[0].trim());
  const b = [...decomment(now).matchAll(USE)].map((m) => m[0].trim());
  if (a.length !== b.length) {
    const count = (xs: string[]) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>());
    const ca = count(a), cb = count(b);
    const keys = new Set([...ca.keys(), ...cb.keys()]);
    const delta = [...keys].map((k) => [k, (cb.get(k) ?? 0) - (ca.get(k) ?? 0)] as const).filter(([, d]) => d !== 0);
    console.log(`${f}: ${a.length} → ${b.length}  ${delta.map(([k, d]) => `${k} ${d > 0 ? "+" : ""}${d}`).join(", ")}`);
  }
}
