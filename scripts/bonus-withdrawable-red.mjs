/**
 * J · RED HARNESS for `test:bonus-withdrawable` — can this guard see a repealed bonus?
 *
 *   node scripts/bonus-withdrawable-red.mjs      (npm run red:bonus-withdrawable)
 *
 * ⭐ MUTATION 1 IS THE ONE THAT MATTERS, and it is a change somebody would make on purpose.
 * "The player's wallet shows 13,000 — let them withdraw 13,000" is a reasonable-sounding
 * ticket, it is one line, and it repeals the entire wagering requirement: every bonus ever
 * granted becomes cash the moment it lands. Before this file, no suite in the repository
 * would have gone red on it.
 *
 * 🔴 AND THE FIRST DRAFT OF MUTATION 1 WOULD HAVE PROVED NOTHING, WHICH IS WHY §DEPTH EXISTS.
 * The balance is guarded TWICE — an explicit `if (w.balance < amount)` and then an ATOMIC
 * `db.wallet.adjust(..., { requireBalanceGte: amount })` whose failure returns the identical
 * refusal. Mutating only the first leaves the second standing, the suite stays green, and a
 * harness that expected red would have reported "GUARD DID NOT CATCH IT" against a guard that
 * is working and a platform that is safe. ⛔ **A mutation must remove the whole control, not
 * the first line of it** — the same lesson as a mutation that APPENDS a class instead of
 * deleting one. §DEPTH below measures the second control rather than assuming it, and it
 * asserts GREEN: it is a control that must NOT go red, and it is not counted as a catch.
 *
 * ⚠️ A NON-ZERO EXIT IS NOT ENOUGH. `tsx` exits non-zero when the suite CRASHES too — a
 * mutation that produces a type error would then read as "defect caught" while proving
 * nothing at all. Every verdict here requires the suite to exit non-zero AND to have printed
 * at least one `FAIL` line, so a crash is reported as a harness error rather than a catch.
 *
 * ⚠️ CRLF: an LF anchor silently fails to match a CRLF tree, the mutation never applies, and
 * the harness reports guard weakness. Every mutation matches both line endings AND re-reads
 * the file to confirm the anchor is gone from disk.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
// ⛔ ONE DEFINITION. The sidecar is DATA, and `test:red-anchors` §3 imports the same array to
// re-resolve every anchor WITHOUT running this harness — so an anchor that rots against
// rewritten code is caught in under a second on every `test:all`, instead of the next time
// somebody happens to run the fleet. §4's undeclared-harness ceiling only ever shrinks.
import { MUTATIONS as DECLARED } from "./anchors/bonus-withdrawable.anchors.mjs";

const abs = (rel) => new URL(`../${rel}`, import.meta.url);
const files = [...new Set(DECLARED.map((m) => m.file))];
const originals = new Map(files.map((f) => [f, readFileSync(abs(f), "utf8")]));
const restore = () => { for (const [f, s] of originals) writeFileSync(abs(f), s); };

const WALLET = "src/lib/server/wallet-service.ts";

const CWD = new URL("..", import.meta.url);
/**
 * Run the suite and say what actually happened, rather than collapsing three different
 * outcomes into one boolean.
 *   { red: true }   exited non-zero AND printed a FAIL line   → the guard saw it
 *   { red: false }  exited zero                               → the guard did not
 *   { crash: true } exited non-zero with no FAIL line         → proves nothing
 */
function runSuite() {
  try {
    execSync("npx tsx scripts/bonus-withdrawable.test.mts", { cwd: CWD, stdio: "pipe" });
    return { red: false, crash: false, out: "" };
  } catch (e) {
    const out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    return { red: /^FAIL /m.test(out), crash: !/^FAIL /m.test(out), out };
  }
}

restore();
{
  const base = runSuite();
  if (base.red || base.crash) {
    console.error("✗ POSITIVE CONTROL FAILED — the unmutated suite is already red.");
    console.error("  A red below would be indistinguishable from red-on-everything. Fix the suite first.");
    process.exit(1);
  }
}
console.log("  ✓ CONTROL  the unmutated tree is GREEN — a red below is caused by the mutation\n");

// ⚠️ ONE ANCHOR HERE HAS ALREADY MOVED, AND THE HARNESS CAUGHT IT RATHER THAN LYING.
// `E-223` rewrote the refusal to `return shortOfFunds(w, amount)`, so the previous literal —
// the inline `{ ok: false … "Insufficient balance." }` object — stopped existing. Both
// mutations that used it reported HARNESS ERROR: anchor not found instead of quietly editing
// nothing and calling the guard weak. ⭐ Now that the anchors are DECLARED, `test:red-anchors`
// §3 catches that same drift statically on every run, without executing this file at all.
const BALANCE_CHECK = DECLARED.find((m) => m.name === "the-bonus-becomes-spendable").from;

// The declared mutations, minus the ones that are HALVES of another (they are applied with
// their partner, never on their own — see the sidecar's header).
const MUTATIONS = DECLARED.filter((m) => !m.combineInto).map((m) => ({
  ...m,
  also: DECLARED.filter((x) => x.combineInto === m.name),
}));

let caught = 0;
const problems = [];

/** Apply one anchored replacement, CRLF-aware, and confirm the anchor left the disk. */
function applyOne(rel, from, to) {
  const file = abs(rel);
  const src = readFileSync(file, "utf8");
  const asCRLF = from.replace(/\n/g, "\r\n");
  const anchor = src.includes(from) ? from : src.includes(asCRLF) ? asCRLF : null;
  if (anchor === null) return "anchor not found";
  writeFileSync(file, src.replace(anchor, anchor === asCRLF ? to.replace(/\n/g, "\r\n") : to));
  if (readFileSync(file, "utf8").includes(anchor)) return "anchor still present after write";
  return null;
}

for (const m of MUTATIONS) {
  restore();
  let bad = applyOne(m.file, m.from, m.to);
  // ⛔ EVERY HALF, OR NONE. `also` is a LIST — a mutation may need more than one edit to remove
  // a whole control, and applying some of them would test something nobody described.
  for (const part of m.also) if (!bad) bad = applyOne(part.file, part.from, part.to);
  if (bad) { problems.push(`${m.name} — HARNESS ERROR: ${bad}`); continue; }

  const r = runSuite();
  if (r.crash) { problems.push(`${m.name} — HARNESS ERROR: the suite CRASHED rather than failing a check; this proves nothing`); continue; }
  if (!r.red) { problems.push(`${m.name} — GUARD DID NOT CATCH IT (${m.why})`); continue; }

  // ⭐ "THE SUITE WENT RED" IS NOT THE CLAIM. A mutation that reddens some unrelated assertion
  // proves the suite is fragile, not that it can see THIS defect — so each declared mutation
  // names the check it must break, and that exact check has to be among the failures.
  const fails = r.out.split(/\r?\n/).filter((l) => l.startsWith("FAIL "));
  const hit = !m.check || fails.some((l) => l.includes(m.check));
  if (hit) { caught++; console.log(`  ✓ RED  ${m.name} — ${m.why}`); }
  else {
    problems.push(`${m.name} — RED, BUT ON THE WRONG CHECK. Expected "${m.check}" among the failures; got: ${fails.map((f) => f.slice(5, 60)).join(" | ") || "(none)"}`);
  }
}

// ── §DEPTH · a control that must NOT go red ──────────────────────────────────
// Removing ONLY the explicit balance check must leave the platform safe, because the atomic
// debit refuses the same overdraw. This is measured, not assumed — and if it ever starts
// going red, the second control has gone and mutation 1's `also` clause is load-bearing in a
// way this file should say out loud.
restore();
{
  const bad = applyOne(WALLET, BALANCE_CHECK, `    void amount;`);
  if (bad) problems.push(`DEPTH — HARNESS ERROR: ${bad}`);
  else {
    const r = runSuite();
    if (r.crash) problems.push("DEPTH — HARNESS ERROR: the suite crashed");
    else if (r.red) problems.push("DEPTH — the atomic `requireBalanceGte` debit NO LONGER holds on its own; the explicit check is now the only control");
    else console.log("  ✓ GREEN  defence-in-depth — with the explicit balance check deleted, the atomic debit still refuses the overdraw (not counted as a catch)");
  }
}

restore();
console.log(`\ntree restored · ${caught}/${MUTATIONS.length} defects caught`);
if (problems.length) { for (const p of problems) console.error(`  ✗ ${p}`); process.exit(1); }
