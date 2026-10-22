// resolve.mjs <file> <plan>  — resolve git conflict hunks in <file> by a plan string, one token per hunk, in order:
//   o = ours (HEAD side), t = theirs, ot = ours then theirs, to = theirs then ours,
//   ot:<sep> / to:<sep> where <sep> is a JS string literal escape ("\n\n---\n\n" written as \\n\\n---\\n\\n)
// Prints the hunk count first if plan is "?" (and the first line of each side), and refuses a plan of the wrong length.
// Handles diff3-free markers (<<<<<<< / ======= / >>>>>>>). Writes the file in place, keeping its line endings.
import { readFileSync, writeFileSync } from "node:fs";
const [file, plan] = process.argv.slice(2);
const raw = readFileSync(file, "utf8");
const crlf = raw.includes("\r\n");
const lines = raw.split(/\r?\n/);
const hunks = [];
const out = [];
let i = 0;
while (i < lines.length) {
  if (lines[i].startsWith("<<<<<<< ")) {
    const ours = [], theirs = [];
    let j = i + 1;
    while (j < lines.length && !lines[j].startsWith("=======")) ours.push(lines[j++]);
    if (j >= lines.length) throw new Error(`unterminated hunk at line ${i + 1}`);
    j++;
    while (j < lines.length && !lines[j].startsWith(">>>>>>> ")) theirs.push(lines[j++]);
    if (j >= lines.length) throw new Error(`unterminated hunk at line ${i + 1}`);
    hunks.push({ at: i + 1, ours, theirs, outIndex: out.length });
    out.push(null);
    i = j + 1;
  } else {
    out.push(lines[i]);
    i++;
  }
}
if (!plan || plan === "?") {
  console.log(`${file}: ${hunks.length} hunk(s)`);
  hunks.forEach((h, k) => console.log(`#${k + 1} @${h.at} ours=${h.ours.length} lines [${(h.ours[0] ?? "").slice(0, 90)}] theirs=${h.theirs.length} lines [${(h.theirs[0] ?? "").slice(0, 90)}]`));
  process.exit(0);
}
const tokens = plan.split(",");
if (tokens.length !== hunks.length) { console.error(`plan has ${tokens.length} tokens, file has ${hunks.length} hunks`); process.exit(2); }
const unesc = (s) => s.replace(/\\n/g, "\n");
tokens.forEach((tok, k) => {
  const h = hunks[k];
  const [mode, sepRaw] = tok.split(":");
  const sep = sepRaw === undefined ? null : unesc(sepRaw).split("\n");
  let body;
  if (mode === "o") body = h.ours;
  else if (mode === "t") body = h.theirs;
  else if (mode === "ot") body = [...h.ours, ...(sep ? sep.slice(1, -1) : []), ...h.theirs];
  else if (mode === "to") body = [...h.theirs, ...(sep ? sep.slice(1, -1) : []), ...h.ours];
  else throw new Error(`bad token ${tok}`);
  out[h.outIndex] = body;
});
const flat = out.flatMap((x) => (Array.isArray(x) ? x : [x]));
writeFileSync(file, flat.join(crlf ? "\r\n" : "\n"), "utf8");
console.log(`${file}: resolved ${hunks.length} hunk(s) by ${plan}`);
