// Measure R5-I's own type-scale delta: run the suite on the tree, then with R5-I's changed src files swapped back to
// HEAD (one run, restored byte-identical after), and print the three counts both ways.
const fs = require("fs"), crypto = require("crypto"), { spawnSync, execFileSync } = require("child_process");
const ROOT = "F:/kipindi-r5i/";
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const changed = execFileSync("git", ["-C", ROOT, "diff", "--name-only"], { encoding: "utf8" }).split("\n").filter((f) => /^src\/.*\.(tsx?|css)$/.test(f));
const counts = () => {
  const r = spawnSync("npx", ["tsx", "scripts/type-scale.test.mts"], { cwd: ROOT, encoding: "utf8", shell: true });
  const out = (r.stdout || "") + (r.stderr || "");
  const pick = (name) => Number((out.match(new RegExp(`set ${name} = (\\d+)`)) ?? [])[1] ?? NaN);
  return { exit: r.status, SUBFLOOR: pick("RATCHET_SUBFLOOR"), SIZE: pick("RATCHET_ARBITRARY_SIZE"), TRACKING: pick("RATCHET_ARBITRARY_TRACKING") };
};
const now = counts();
const saved = new Map(changed.map((f) => [f, fs.readFileSync(ROOT + f)]));
let head;
try {
  for (const f of changed) fs.writeFileSync(ROOT + f, execFileSync("git", ["-C", ROOT, "show", `HEAD:${f}`]));
  head = counts();
} finally {
  for (const [f, b] of saved) fs.writeFileSync(ROOT + f, b);
}
const ok = [...saved].every(([f, b]) => sha(fs.readFileSync(ROOT + f)) === sha(b));
console.log("with R5-I:", JSON.stringify(now));
console.log("at HEAD's versions of R5-I's files:", JSON.stringify(head));
console.log("restored byte-identical:", ok, `(${changed.length} files)`);
