// Report (and with --fix, normalise to CRLF) the line endings of the files this helper touched.
const fs = require("node:fs");
const { execSync } = require("node:child_process");
const root = "F:/kipindi-r4k";
const changed = execSync("git status --porcelain", { cwd: root, encoding: "utf8" })
  .split("\n").filter(Boolean).map((l) => l.slice(3).trim().replace(/^"|"$/g, ""));
const fix = process.argv.includes("--fix");
for (const rel of changed) {
  const p = `${root}/${rel}`;
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { console.log("skip", rel); continue; }
  const t = fs.readFileSync(p, "utf8");
  const crlf = (t.match(/\r\n/g) || []).length;
  const lf = (t.match(/\n/g) || []).length;
  const bare = lf - crlf;
  console.log(`${rel}  CRLF ${crlf}  bare LF ${bare}`);
  if (fix && bare > 0) {
    fs.writeFileSync(p, t.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n"));
    console.log("   → normalised to CRLF");
  }
}
