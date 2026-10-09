// Scratch helper: report CRLF vs bare-LF line counts per file; with --fix make every line CRLF.
// Lives in the scratchpad, never in the repo.
import { readFileSync, writeFileSync } from "node:fs";

const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const args = process.argv.slice(2);
const fix = args.includes("--fix");
for (const f of args.filter((a) => a !== "--fix")) {
  const s = readFileSync(f, "utf8");
  const crlf = s.split(CR + LF).length - 1;
  const loneLf = s.split(LF).length - 1 - crlf;
  const loneCr = s.split(CR).length - 1 - crlf;
  const endsWithNewline = s.endsWith(LF);
  let note = "";
  if (fix && loneLf > 0) {
    const fixed = s.split(CR + LF).join(LF).split(LF).join(CR + LF);
    writeFileSync(f, fixed, "utf8");
    note = "  -> normalised to CRLF";
  }
  console.log(`${f}: CRLF=${crlf} loneLF=${loneLf} loneCR=${loneCr} endsWithNewline=${endsWithNewline}${note}`);
}
