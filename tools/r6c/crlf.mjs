// Convert the given files to CRLF (LF -> CRLF, CRLF kept). Usage: node crlf.mjs <file...>
import { readFileSync, writeFileSync } from "node:fs";
for (const f of process.argv.slice(2)) {
  const s = readFileSync(f, "utf8").replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
  writeFileSync(f, s);
  console.log("crlf", f);
}
