// reproof.cjs <repo> — rewrites the two S7 WP0 commits on top of their parent with each message's "Proof on
// OMEGA-COMPILE01 …" paragraph replaced, trees kept byte for byte (git commit-tree). Prints the new tip.
const { execFileSync } = require("child_process");
const fs = require("fs");
const repo = process.argv[2];
const git = (args, input) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", input }).trimEnd();
const PROOFS = {
  "Vodacom S7 WP0: the scripts-only repairs before S7":
    "Proof on OMEGA-COMPILE01 (2026-10-08), on main d4358318: the moved cases deep-equal the old array (28/28);\n" +
    "red:ticker-honesty ALONE 28/28 real defects caught, each on its own assertion, its whole-id control holding (11.2 is\n" +
    "not 11.21, 11.22 or 11.2j; 1.1 is not 1.1-control), the tree unchanged after - run on c37b5e47, whose ticker files are\n" +
    "byte for byte this tree's; test:red-anchors 4865/0, every ticker-honesty anchor resolving once; test:stacking\n" +
    "129/129 - main's 6.1 z-order red was named on main the same day (dfd0072e), the primer's 8.1-8.5 green;\n" +
    "test:ticker-honesty green; red:simple-journey-flag 37/37 on this tree (the twin as the money-doors release left it).",
  "Vodacom S7 WP0: red:ops-provision-staff's six plants declared":
    "Proof on OMEGA-COMPILE01 (2026-10-08), on main d4358318: red:ops-provision-staff 6 of 6 proofs held, the same as\n" +
    "before the move; test:ops-provision-staff 10/10; test:red-anchors 4865/0 - 4.1 and 4.2 at 64 against 64, every\n" +
    "declared ops anchor resolving exactly once (the two other lanes' stale anchors an earlier draft named were\n" +
    "re-anchored on main, 5b89b32b).",
};
const tip = git(["rev-parse", "HEAD"]);
const commits = git(["rev-list", "--reverse", "HEAD~2..HEAD"]).split("\n");
let parent = git(["rev-parse", "HEAD~2"]);
for (const c of commits) {
  const msg = git(["log", "-1", "--format=%B", c]);
  const key = Object.keys(PROOFS).find((k) => msg.startsWith(k));
  if (!key) throw new Error(`${c}: no proof key matches`);
  const at = msg.indexOf("Proof on OMEGA-COMPILE01");
  const end = msg.indexOf("\n\nCo-Authored-By", at);
  if (at < 0 || end < 0) throw new Error(`${c}: proof paragraph not found`);
  const next = msg.slice(0, at) + PROOFS[key] + msg.slice(end) + "\n";
  if (/\{PROOF\}/.test(next)) throw new Error(`${c}: a {PROOF} remains`);
  const tree = git(["rev-parse", `${c}^{tree}`]);
  const env = { ...process.env,
    GIT_AUTHOR_NAME: git(["log", "-1", "--format=%an", c]), GIT_AUTHOR_EMAIL: git(["log", "-1", "--format=%ae", c]),
    GIT_AUTHOR_DATE: git(["log", "-1", "--format=%aI", c]) };
  parent = execFileSync("git", ["-C", repo, "commit-tree", tree, "-p", parent, "-F", "-"], { encoding: "utf8", input: next, env }).trim();
}
const same = git(["diff", tip, parent]) === "";
console.log(`new tip ${parent.slice(0, 8)} · trees identical to ${tip.slice(0, 8)}: ${same}`);
if (!same) process.exit(1);
