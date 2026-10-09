// fill-proofs.mjs <repo> <base> <tip> <proofs.json> [--write <ref>]
// Rebuilds base..tip with each message's "{PROOF}" replaced by the text proofs.json gives for that commit (keyed by the
// start of its subject), keeping every TREE, author and author date exactly: `git commit-tree <tree> -p <new parent>`.
// Extra keys: proofs.json may also hold { "<subject start>": { "append": "..." } } to add a paragraph before the
// Co-Authored-By trailer. Refuses if any {PROOF} would remain, or a key matches no commit / more than one.
// Without --write it only prints what it would do; with it, the new tip is written to <ref> and checked: the diff
// between the old and the new tip must be empty.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
const [, , repo, base, tip, proofsFile, flag, ref] = process.argv;
const git = (args, env) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 1 << 26 }).trimEnd();
const proofs = JSON.parse(readFileSync(proofsFile, "utf8"));
for (const [k, v] of Object.entries(proofs)) {
  if (/TBD|\{…\}|\{n\}/.test(JSON.stringify(v))) throw new Error(`"${k}": the proof still holds a TBD or {…} — fill it from the runs first`);
}
const commits = git(["rev-list", "--reverse", `${base}..${tip}`]).split("\n").filter(Boolean);
const used = new Map(Object.keys(proofs).map((k) => [k, 0]));
const dir = mkdtempSync(join(tmpdir(), "fill-proofs-"));
let parent = git(["rev-parse", base]);
const plan = [];
for (const c of commits) {
  let msg = git(["log", "-1", "--format=%B", c]) + "\n";
  const subject = msg.split("\n", 1)[0];
  const keys = Object.keys(proofs).filter((k) => subject.startsWith(k));
  if (keys.length > 1) throw new Error(`${c.slice(0, 8)}: more than one key matches "${subject.slice(0, 60)}"`);
  for (const k of keys) {
    used.set(k, used.get(k) + 1);
    const p = proofs[k];
    const proof = typeof p === "string" ? p : p.proof;
    if (proof !== undefined) {
      if (!msg.includes("{PROOF}")) throw new Error(`${c.slice(0, 8)}: a proof was given but the message has no {PROOF}`);
      msg = msg.replace("{PROOF}", proof);
    }
    if (p && typeof p === "object" && p.append) {
      const i = msg.lastIndexOf("\nCo-Authored-By:");
      msg = i < 0 ? `${msg.trimEnd()}\n\n${p.append}\n` : `${msg.slice(0, i).trimEnd()}\n\n${p.append}\n${msg.slice(i)}`;
    }
  }
  if (msg.includes("{PROOF}")) throw new Error(`${c.slice(0, 8)} "${subject.slice(0, 60)}": {PROOF} left unfilled`);
  const f = join(dir, `${c}.txt`);
  writeFileSync(f, msg);
  const env = {
    GIT_AUTHOR_NAME: git(["log", "-1", "--format=%an", c]), GIT_AUTHOR_EMAIL: git(["log", "-1", "--format=%ae", c]),
    GIT_AUTHOR_DATE: git(["log", "-1", "--format=%aI", c]),
  };
  const tree = git(["rev-parse", `${c}^{tree}`]);
  plan.push(`${c.slice(0, 8)} ${keys.length ? "FILLED" : "kept  "} ${subject.slice(0, 90)}`);
  if (flag === "--write") parent = git(["commit-tree", tree, "-p", parent, "-F", f], env);
}
for (const [k, n] of used) if (n !== 1) throw new Error(`key "${k}" matched ${n} commits`);
console.log(plan.join("\n"));
if (flag === "--write") {
  const diff = git(["diff", tip, parent, "--stat"]);
  if (diff) throw new Error(`the rebuilt tip differs from the old one:\n${diff}`);
  git(["update-ref", `refs/heads/${ref}`, parent]);
  console.log(`\nrefs/heads/${ref} → ${parent.slice(0, 8)} (trees identical to ${tip})`);
}
