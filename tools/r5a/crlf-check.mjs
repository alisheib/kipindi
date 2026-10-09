// Read-only: report any touched or untracked file with a lone LF (the repo's working files are CRLF).
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
process.chdir("F:/kipindi-r5a");
const files = [
  ...execSync("git diff --name-only", { encoding: "utf8" }).trim().split(/\r?\n/),
  ...execSync("git ls-files --others --exclude-standard", { encoding: "utf8" }).trim().split(/\r?\n/),
].filter(Boolean);
let bad = 0;
for (const f of files) {
  const s = readFileSync(f, "utf8");
  const lone = (s.match(/(?<!\r)\n/g) ?? []).length, crlf = (s.match(/\r\n/g) ?? []).length;
  if (lone) { bad++; console.log(`LONE LF ×${lone} (CRLF ×${crlf}): ${f}`); }
}
console.log(`${files.length} files checked, ${bad} with a lone LF`);
