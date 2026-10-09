// Rewrites each named file with CRLF line endings (idempotent), and reports the line-ending census of each.
import fs from "node:fs";
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, "utf8");
  const lf = t.replace(/\r\n/g, "\n");
  const crlf = lf.replace(/\n/g, "\r\n");
  if (crlf !== t) fs.writeFileSync(f, crlf);
  const after = fs.readFileSync(f, "utf8");
  const total = (after.match(/\n/g) ?? []).length;
  const withCr = (after.match(/\r\n/g) ?? []).length;
  console.log(`${f}: ${total} lines, ${withCr} CRLF, ${total - withCr} bare LF${crlf !== t ? " (rewritten)" : ""}`);
}
