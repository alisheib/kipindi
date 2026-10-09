import fs from "node:fs";
const p = process.argv[2];
const lines = [
  "- MUTATION PROOF run 3 (final): 40/40 caught on their named checks, 0 missed, 0 not applied, 40/40 restored byte-identical;",
  "  global re-check: git status identical, 64 files sha-identical, dict + share-button + return ghost unmodified.",
  "- r6c on the final tree: 87/87 exit 0. All 64 changed/new files CRLF.",
  "- AFTER models (after-models.txt): C12 -- the stake never splits; it moves under the side: 320 every row; 360 sw HAPANA all, en",
  "  from 10,000, sw NDIO at 1,000,000; 390 sw HAPANA from 100,000, en at 1,000,000; 412 sw HAPANA at 1,000,000; 1024 none.",
  "  C7 -- sw range on its own line at 320/360, one line from 390; en own line at 320; zh one line everywhere.",
  "  Reviewer c2: no hand-drawn dialog x left (its old-geometry readers find nothing); c3: its OLD regex copies still miss 61 by",
  "  construction (it prints 'copied verbatim: false' -- the suite changed); c1: hub rows run (agent = dashboard); its other",
  "  columns are hard-coded keys and its line-411 literal moved (crash) -- r6c 5.4 runs the real after for every reader.",
  "- FINAL: git diff --stat 61 files +576/-292 (src 45 +395/-230; scripts+package.json 16 +181/-62); untracked 3. Nothing committed.",
];
fs.appendFileSync(p, lines.join("\r\n") + "\r\n");
