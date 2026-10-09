/* R5-L · every import specifier in the changed .tsx files is used beyond its import (no tsc on this machine). */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
const { decomment } = await import("file:///F:/kipindi-r5l/scripts/lib/decomment.mts");
const cwd = "F:/kipindi-r5l";
const files = [
  ...execSync("git diff --name-only", { cwd, encoding: "utf8" }).trim().split(/\r?\n/),
  ...execSync("git ls-files --others --exclude-standard", { cwd, encoding: "utf8" }).trim().split(/\r?\n/),
].filter((f) => /\.tsx?$/.test(f) && f.startsWith("src/") && existsSync(`${cwd}/${f}`));
let bad = 0;
for (const f of files) {
  const s = decomment(readFileSync(`${cwd}/${f}`, "utf8"));
  const imports = [...s.matchAll(/^import\s+(type\s+)?\{([^}]+)\}\s+from\s+["'][^"']+["'];?/gm)];
  const body = s.replace(/^import[^;]+;/gm, "");
  for (const m of imports) {
    for (const spec of m[2].split(",").map((x) => x.trim()).filter(Boolean)) {
      const name = spec.replace(/^type\s+/, "").split(/\s+as\s+/).pop()!.trim();
      if (!new RegExp(`\\b${name.replace(/[$]/g, "\\$")}\\b`).test(body)) { bad++; console.log(`${f}: ${name} unused`); }
    }
  }
}
console.log(bad ? `${bad} unused` : `all imports used (${files.length} files)`);
