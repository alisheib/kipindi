// plant-proof.mjs <anchors file> <name-prefix>[,<name-prefix>...] -- <child command...>
// Applies each named plant (from the anchors file, by name prefix) to the WORKING TREE, runs the child command on the memory
// store, and requires a non-zero exit AND a FAIL line naming the plant's own `expect`. Then it writes the file back byte for
// byte and checks the bytes. Used where a suite's own red drive cannot run (its green baseline is red for another lane's
// reason) or for a plant that is not in a drive yet. Run from anywhere; it works in the S7 tree.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = "C:/50pick-ssd/maswali-s7-integrate-20261019";
const [anchors, names, sep, ...cmd] = process.argv.slice(2);
if (!anchors || !names || sep !== "--" || cmd.length === 0) { console.error("usage: plant-proof.mjs <anchors> <prefixes> -- <command...>"); process.exit(2); }
const { injectDefect } = await import(`file:///${root}/scripts/red-anchor.mjs`);
const { MUTATIONS } = await import(`file:///${/^[A-Za-z]:/.test(anchors) ? anchors : `${root}/${anchors}`}?${Date.now()}`);
const want = names.split(",");
const picked = MUTATIONS.filter((m) => want.some((w) => m.name.startsWith(w)));
const env = { ...process.env, DATABASE_URL: "", USE_PRISMA_DAL: "false", HB_MONEY_STORE: "memory", TEMP: "C:\\50pick-ssd\\tmp", TMP: "C:\\50pick-ssd\\tmp" };
let caught = 0, missed = 0;
for (const m of picked) {
  const path = `${root}/${m.file}`;
  const orig = readFileSync(path);
  const h0 = createHash("sha256").update(orig).digest("hex");
  let out = "", code = 0;
  try {
    writeFileSync(path, injectDefect(orig.toString("utf8"), m.from, m.to));
    try { out = execSync(cmd.join(" "), { cwd: root, encoding: "utf8", stdio: "pipe", env, maxBuffer: 256 << 20, timeout: 20 * 60_000 }); }
    catch (e) { code = e.status ?? 1; out = `${e.stdout ?? ""}${e.stderr ?? ""}`; }
  } finally {
    writeFileSync(path, orig);
  }
  const h1 = createHash("sha256").update(readFileSync(path)).digest("hex");
  const fails = out.split("\n").filter((l) => /^\s*FAIL/.test(l));
  const own = fails.some((l) => l.includes(m.expect));
  const ok = code !== 0 && own;
  ok ? caught++ : missed++;
  console.log(`${ok ? "CAUGHT" : "MISSED"} ${m.name} — exit ${code}; restored ${h0 === h1 ? "byte-identical" : "DIFFERENT!"}`);
  for (const f of fails.slice(0, 6)) console.log(`   ${f.trim().slice(0, 160)}`);
}
console.log(`plant-proof: ${caught} caught, ${missed} missed of ${picked.length}`);
process.exit(missed || picked.length === 0 ? 1 : 0);
