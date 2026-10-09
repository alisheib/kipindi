// Reports each file's line endings; with --fix, rewrites bare LF as CRLF (never touches a CRLF already there).
import { readFileSync, writeFileSync } from "node:fs";
const fix = process.argv.includes("--fix");
for (const f of process.argv.slice(2).filter((a) => a !== "--fix")) {
  const s = readFileSync(f, "latin1");
  let bare = 0, crlf = 0;
  for (let i = 0; i < s.length; i++) if (s[i] === "\n") { if (s[i - 1] === "\r") crlf++; else bare++; }
  console.log(`${f}: ${crlf} CRLF · ${bare} bare LF`);
  if (fix && bare) {
    const out = s.replace(/\r?\n/g, "\r\n");
    writeFileSync(f, out, "latin1");
    let b2 = 0, c2 = 0;
    for (let i = 0; i < out.length; i++) if (out[i] === "\n") { if (out[i - 1] === "\r") c2++; else b2++; }
    console.log(`  fixed → ${c2} CRLF · ${b2} bare LF`);
  }
}
