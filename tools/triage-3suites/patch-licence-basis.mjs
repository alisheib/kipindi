// Inserts the F8 declaration into scripts/marketing-consent/licence-basis.mts, between the header comment and the first import.
// CRLF-preserving. Refuses to run twice, and refuses if the anchor is not exactly one line.
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "F:/kipindi-rot2/scripts/marketing-consent/licence-basis.mts";
const raw = readFileSync(FILE, "utf8");
const NL = raw.includes("\r\n") ? "\r\n" : "\n";
const lines = raw.split(NL);

if (lines.some((l) => /house-bot: covered by L2 sweep/.test(l))) throw new Error("already declared");
const anchor = lines.findIndex((l) => l === 'import { db } from "../../src/lib/server/store.ts";');
if (anchor < 0 || lines.filter((l) => l === 'import { db } from "../../src/lib/server/store.ts";').length !== 1) throw new Error("anchor not unique");
if (lines[anchor - 1] !== " */") throw new Error(`expected the header comment's close right above the anchor, found ${JSON.stringify(lines[anchor - 1])}`);

const note = [
  "// house-bot: covered by L2 sweep — this seeds fixture accounts and one self-exclusion row straight through the store, so no in-app",
  "// hook fires; the holder sweep re-reads every bot holder once a minute and applies whatever changed (04 F8, A2). It writes only to the",
  "// accounts it creates itself (`lu<n>`), which no bot holds, and it is imported only by `test:marketing-consent`.",
];
lines.splice(anchor, 0, ...note);
writeFileSync(FILE, lines.join(NL), "utf8");
console.log(`inserted ${note.length} lines before line ${anchor + 1}`);
