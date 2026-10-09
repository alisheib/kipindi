// Reports mixed line endings in the files git sees as changed or new in F:/kipindi-r3c; with --fix, converts bare LF to CRLF
// in files that are otherwise CRLF (or new files under src/ and scripts/, which the repo writes CRLF).
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const root = "F:/kipindi-r3c";
const fix = process.argv.includes("--fix");
const out = execSync("git status --porcelain", { cwd: root }).toString().split("\n").filter(Boolean);
for (const line of out) {
  const rel = line.slice(3).trim();
  const p = path.join(root, rel);
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) continue;
  const buf = fs.readFileSync(p);
  let crlf = 0, lf = 0;
  for (let i = 0; i < buf.length; i++) if (buf[i] === 10) { if (i > 0 && buf[i - 1] === 13) crlf++; else lf++; }
  const status = line.slice(0, 2);
  console.log(`${status} ${rel.padEnd(60)} CRLF ${crlf} LF ${lf}${lf && crlf ? "  <-- MIXED" : ""}`);
  if (fix && lf > 0 && (crlf > 0 || status.includes("?"))) {
    const s = buf.toString("utf8").replace(/\r?\n/g, "\r\n");
    fs.writeFileSync(p, s, "utf8");
    console.log("   fixed ->", rel);
  }
}
