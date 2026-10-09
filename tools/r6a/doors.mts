// R6-A · list every decommented src line carrying `?side=` (outside admin/api), to classify the stake doors.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "file:///F:/kipindi-r6a/scripts/lib/decomment.mts";
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f).split("\\").join("/");
  return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mts)$/.test(p) ? [p] : [];
});
for (const p of walk("src").filter((p) => !p.startsWith("src/app/admin/") && !p.startsWith("src/components/admin/") && !p.startsWith("src/app/api/"))) {
  const s = decomment(readFileSync(p, "utf8").split("\r\n").join("\n"));
  for (const line of s.split("\n")) if (line.includes("?side=")) console.log(p, "::", line.trim().slice(0, 170));
}
