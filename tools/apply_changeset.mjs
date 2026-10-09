// Node port of handover/vodacom-2026-10-07/tools/apply_changeset.py (same rules).
// Usage: node apply_changeset.mjs <changeset.json> <repoRoot> [--write]
// Every edit's find must occur EXACTLY ONCE (newline-style-insensitive). Nothing is written unless all edits resolve.
import fs from "node:fs";
import path from "node:path";

const [, , csPath, repo, ...rest] = process.argv;
const write = rest.includes("--write");
if (!csPath || !repo) { console.error("usage: node apply_changeset.mjs <cs.json> <repoRoot> [--write]"); process.exit(2); }
const CRLF = "\r\n", LF = "\n";
const nlOf = (t) => (t.includes(CRLF) ? CRLF : LF);
const toNl = (s, nl) => (nl === CRLF ? s.replaceAll(CRLF, LF).replaceAll(LF, CRLF) : s.replaceAll(CRLF, LF));
const count = (hay, needle) => { let n = 0, i = 0; while ((i = hay.indexOf(needle, i)) !== -1) { n++; i += needle.length; } return n; };

const cs = JSON.parse(fs.readFileSync(csPath, "utf8"));
const problems = [];
const plan = new Map();
for (const nf of cs.newFiles ?? []) {
  if (fs.existsSync(path.join(repo, nf.path))) problems.push("new file already exists: " + nf.path);
  plan.set(nf.path, ["new", nf.content]);
}
for (const e of cs.edits ?? []) {
  const f = e.file;
  let cur;
  if (plan.has(f)) cur = plan.get(f)[1];
  else {
    const p = path.join(repo, f);
    if (!fs.existsSync(p)) { problems.push("missing file: " + f); continue; }
    cur = fs.readFileSync(p, "utf8");
  }
  const nl = nlOf(cur);
  const find = toNl(e.find, nl), rep = toNl(e.replace, nl);
  const n = count(cur, find);
  if (n !== 1) { problems.push(`${f}: find occurs ${n}x: ${JSON.stringify(e.find.slice(0, 90))}`); continue; }
  const i = cur.indexOf(find);
  cur = cur.slice(0, i) + rep + cur.slice(i + find.length);
  plan.set(f, [plan.has(f) ? plan.get(f)[0] : "edit", cur]);
}
for (const [k, [, text]] of plan) {
  const bad = [...text].filter((c) => c.charCodeAt(0) < 32 && c !== "\r" && c !== "\n" && c !== "\t").slice(0, 3);
  if (bad.length) problems.push("control characters in " + k + ": " + bad.map((c) => "0x" + c.charCodeAt(0).toString(16)).join(","));
}
console.log(`${plan.size} files, ${(cs.edits ?? []).length} edits, ${(cs.newFiles ?? []).length} new`);
if (problems.length) { console.log("PROBLEMS:"); for (const x of problems) console.log("  -", x); process.exit(1); }
if (!write) { console.log("dry run OK"); process.exit(0); }
for (const [f, [kind, text]] of plan) {
  const p = path.join(repo, f);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = p + ".tmp-apply";
  fs.writeFileSync(tmp, text, "utf8");
  fs.renameSync(tmp, p);
  console.log(kind, f);
}
