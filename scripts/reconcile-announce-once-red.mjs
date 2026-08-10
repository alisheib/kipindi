/**
 * RED harness for `test:reconcile-announce` (E-134).
 *
 * A suite that makes an audit log quieter is worthless unless it can tell the difference
 * between "quieter" and "silent". So the two mutations here are the two ways this fix can
 * go wrong, and they must fail DIFFERENT sections:
 *
 *   · revert to announcing every sweep  → §1 fails (the flood returns)
 *   · dedupe per ACTION, not per (txn, reason) → §2 fails (a SECOND frozen payout goes
 *     silent, which is strictly worse than the noise it replaced — an officer never learns
 *     there is a second player waiting for their money)
 *
 * ⛔ "The file changed" is not a pass. Each mutation must make the suite EXIT NON-ZERO and
 * the NAMED section must be the one that fails, or the harness is reporting comfort.
 * ⛔ The tree is shared: the file is restored in `finally` and the restore is verified.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const REPO = process.env.KP_REPO || process.cwd();
const TARGET = `${REPO}/src/lib/server/wallet-service.ts`;
const ORIG = readFileSync(TARGET, "utf8");

let pass = 0, fail = 0;
const check = (n, ok, d = "") => { console.log(`  ${ok ? "ok  " : "FAIL"} ${n}${d ? ` — ${d}` : ""}`); ok ? pass++ : fail++; };

const run = () => {
  try {
    const out = execSync("npm run test:reconcile-announce", { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (e) { return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` }; }
};

/** `from` may be a RegExp — it must be, wherever the target spans a line break, because
 *  this file is CRLF here and a literal "\n" would silently match nothing. */
function mutate(label, from, to, mustFailSubstring) {
  const found = typeof from === "string" ? ORIG.includes(from) : from.test(ORIG);
  if (!found) { check(`${label} — target located`, false, String(from).slice(0, 70)); return; }
  writeFileSync(TARGET, ORIG.replace(from, to));
  const r = run();
  writeFileSync(TARGET, ORIG);
  check(`${label} → suite EXITS NON-ZERO`, r.code !== 0, `exit ${r.code}`);
  const line = r.out.split("\n").find((l) => l.startsWith("  FAIL") && l.includes(mustFailSubstring));
  check(`${label} → and the failing check is the RIGHT one`, Boolean(line), line ? line.trim().slice(0, 90) : `no FAIL line mentioning "${mustFailSubstring}"`);
}

console.log("\nRED HARNESS — E-134, the announce-once contract\n");

try {
  const base = run();
  check("baseline: clean tree is GREEN", base.code === 0, `exit ${base.code}`);

  // ① the flood returns — announce on every sweep
  mutate("revert to announcing on EVERY sweep",
    /if \(NEEDS_REVIEW_SEEN\.has\(key\)\) return;/,
    "if (false) return;",
    "THREE sweeps wrote exactly ONE");

  // ② ⭐ the DANGEROUS fix — a global per-reason mute. §1 still passes under this;
  //   only §2, which uses a second transaction, can catch it.
  mutate("dedupe per REASON only, muting every other stuck payout",
    /const key = `\$\{txnId\}::\$\{reason\}`;/,
    "const key = `${reason}`;",
    "second stuck payout gets its OWN row");

  // ③ a `green` mutation: a compliant edit the suite must stay SILENT on.
  {
    const from = "const NEEDS_REVIEW_CAP = 5_000;";
    const to = "const NEEDS_REVIEW_CAP = 4_000;";
    if (!ORIG.includes(from)) check("green mutation — target located", false);
    else {
      writeFileSync(TARGET, ORIG.replace(from, to));
      const r = run();
      writeFileSync(TARGET, ORIG);
      check("GREEN mutation (a smaller cap, still correct) leaves the suite SILENT", r.code === 0, `exit ${r.code}`);
    }
  }
} finally {
  writeFileSync(TARGET, ORIG);
  const restored = readFileSync(TARGET, "utf8") === ORIG;
  console.log(`\n  ${restored ? "✅" : "🔴"} restore verified byte-for-byte: ${restored}`);
  if (!restored) { console.error("  ⛔ wallet-service.ts LEFT MUTATED — fix before anything else."); process.exit(1); }
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
