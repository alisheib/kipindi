// Probe: why does css-vars-defined stay green when `--gilt`'s declaration is deleted? Plant, run, restore (sha256).
const fs = require("fs"), crypto = require("crypto"), { spawnSync } = require("child_process");
const p = "F:/kipindi-r5i/src/app/globals.css";
const orig = fs.readFileSync(p);
const h0 = crypto.createHash("sha256").update(orig).digest("hex");
const s = orig.toString("utf8");
const from = "  --gilt:          var(--gold-300);";
if (s.split(from).length !== 2) { console.log("anchor count", s.split(from).length - 1); process.exit(1); }
try {
  fs.writeFileSync(p, s.replace(from, "  /* declaration deleted by probe */"));
  const r = spawnSync("npx", ["tsx", "scripts/css-vars-defined.test.mts", "--verbose"], { cwd: "F:/kipindi-r5i", encoding: "utf8", shell: true });
  const out = (r.stdout || "") + (r.stderr || "");
  console.log("exit", r.status);
  console.log(out.split("\n").filter((l) => /gilt|FAIL|defined by|definition/i.test(l)).slice(0, 30).join("\n"));
} finally {
  fs.writeFileSync(p, orig);
}
console.log("restored:", crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex") === h0);
