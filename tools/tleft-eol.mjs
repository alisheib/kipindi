// Read-only: report CRLF / lone-LF / lone-CR counts and BOM for the files this change edits.
import { readFileSync } from "node:fs";
const ROOT = "F:/kipindi-tleft/";
const files = process.argv.slice(2);
for (const f of files) {
  const b = readFileSync(ROOT + f);
  let crlf = 0, lf = 0, cr = 0;
  for (let i = 0; i < b.length; i++) {
    if (b[i] === 0x0d && b[i + 1] === 0x0a) { crlf++; i++; }
    else if (b[i] === 0x0a) lf++;
    else if (b[i] === 0x0d) cr++;
  }
  const bom = b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf;
  const endsNl = b.length > 1 && (b[b.length - 1] === 0x0a);
  console.log(`${f}\tbytes=${b.length}\tCRLF=${crlf}\tloneLF=${lf}\tloneCR=${cr}\tBOM=${bom}\tendsWithNewline=${endsNl}`);
}
