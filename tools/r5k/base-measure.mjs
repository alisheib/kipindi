// Measure a suite's numbers on THIS TIP's version of the files R5-K changed (src only), then put every file back
// byte-identical (sha-256 checked). Usage: node base-measure.mjs <npm script> [grep pattern]
import { execSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
const ROOT = "F:/kipindi-r5k/";
const BASE = "9677a3f54";
const [script, pattern] = process.argv.slice(2);
const sh = (c) => execSync(c, { cwd: ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
const changed = sh(`git diff --name-only ${BASE} -- src`).split(/\r?\n/).filter(Boolean);
const added = sh("git ls-files --others --exclude-standard src").split(/\r?\n/).filter(Boolean);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const saved = new Map();
for (const f of [...changed, ...added]) saved.set(f, readFileSync(ROOT + f));
const before = new Map([...saved].map(([f, b]) => [f, sha(b)]));
let out = "";
try {
  for (const f of changed) writeFileSync(ROOT + f, execSync(`git show ${BASE}:"${f}"`, { cwd: ROOT }));
  for (const f of added) unlinkSync(ROOT + f);
  const r = spawnSync("npm", ["run", "-s", script], { cwd: ROOT, encoding: "utf8", shell: true, timeout: 600000 });
  out = (r.stdout ?? "") + (r.stderr ?? "");
} finally {
  for (const [f, b] of saved) { mkdirSync(dirname(ROOT + f), { recursive: true }); writeFileSync(ROOT + f, b); }
}
const bad = [...saved.keys()].filter((f) => !existsSync(ROOT + f) || sha(readFileSync(ROOT + f)) !== before.get(f));
console.log(out.split(/\r?\n/).filter((l) => !pattern || new RegExp(pattern).test(l)).join("\n"));
console.log(`\nrestored ${saved.size} files; byte-identical: ${bad.length === 0 ? "yes" : "NO — " + bad.join(", ")}`);
if (bad.length) process.exit(3);
