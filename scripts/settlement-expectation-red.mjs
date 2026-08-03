/**
 * RED harness for `npm run test:settlement-expectation` (E-48).
 *
 *   node scripts/settlement-expectation-red.mjs
 *
 * Reintroduces each real defect ONE AT A TIME, in the real source, runs the guard, and puts
 * the file back. A guard that has never been observed failing is a decoration.
 *
 * ⚠️ TWO TRAPS THIS FILE IS BUILT AROUND, both of which have already cost this campaign a
 * false all-clear:
 *
 *  1 · **CRLF.** This working tree is MIXED — `markets-runbook.html` is LF while
 *      `LIVE-QA-CAMPAIGN.md` and `payout.ts` are CRLF. In session 15 an LF anchor failed to
 *      match a CRLF file, the harness reported *"the source moved"*, and that read as an
 *      all-clear from the one tool whose entire job is to prove the guard can fail. So every
 *      anchor here is SINGLE-LINE — it can never contain a line terminator — and a missed
 *      anchor is a HARD FAILURE of this harness, never a skip.
 *  2 · **Mutating around the defect instead of the defect.** `code-charges-whole-pool` is the
 *      important one: it changes the CODE, and §4 must fail because the runbook's figure no
 *      longer matches what the code computes. That proves §4 couples the document to the
 *      arithmetic in both directions, rather than just pattern-matching a number it expects.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RUNBOOK = join(ROOT, "docs/runbooks/markets-runbook.html");
const CAMPAIGN = join(ROOT, "docs/LIVE-QA-CAMPAIGN.md");
const PAYOUT = join(ROOT, "src/lib/payout.ts");

/** Each mutation: a file, a single-line `find`, its `replace`, and what it re-creates. */
const MUTATIONS = [
  {
    name: "runbook-wrong-payout",
    what: "the runbook's worked example states 3,480 again (E-48 exactly as it shipped)",
    file: RUNBOOK,
    find: "receives all of it: <strong>TZS 3,740</strong>",
    replace: "receives all of it: <strong>TZS 3,480</strong>",
  },
  {
    name: "handoff-wrong-payout",
    what: "§6b tells the next session to expect 3,480 — the false-defect trap",
    file: CAMPAIGN,
    // ⚠️ SCOPED TO THE CURRENT HANDOFF, not to the first match in the file. A plain
    // `"receive **TZS 3,740**"` → `3,480` replacement stopped proving anything the moment the
    // document gained OTHER copies of that phrase: the first literal occurrence is now inside a
    // *narrative* paragraph explaining how this very guard was once disarmed, which §5 does not
    // read — so the mutation edited text nobody checks and the harness honestly reported a MISS.
    // ⛔ Note also the live resume block wraps the phrase ACROSS A LINE BREAK ("receive\n**TZS
    // 3,740**"), which is why §5 matches with `\s*` and why a single-space literal missed it.
    // ⭐ THE MUTATION MUST LOCATE THE TARGET EXACTLY AS THE GUARD DOES, or it proves nothing
    // about the guard. §5 anchors LINE-INITIALLY (`/^⏭️ \*\*RESUME AT:/m`); a plain `indexOf`
    // on the same marker text finds the copy quoted inside §0.1a's prose first and mutates a
    // paragraph §5 never reads — which is precisely how this mutation reported a MISS twice.
    rewrite: (doc) => {
      const m = /^⏭️ \*\*RESUME AT:/m.exec(doc);
      if (!m) return doc;
      const at = m.index;
      return doc.slice(0, at) + doc.slice(at).replace("**TZS 3,740**", "**TZS 3,480**");
    },
  },
  {
    name: "model-unnamed",
    what: "the worked example stops saying WHICH fee model it applied",
    file: RUNBOOK,
    find: "<strong>loser-share</strong> fee model",
    replace: "<strong>standard</strong> fee model",
  },
  {
    name: "caution-gone",
    what: "the do-not-mix caution stops forbidding the mix",
    file: RUNBOOK,
    find: "<em>never</em> mix",
    replace: "<em>rarely</em> mix",
  },
  {
    name: "caution-claims-uniformity",
    what: "the caution asserts one model platform-wide — false, and it misroutes 12 of 19 live polls",
    file: RUNBOOK,
    find: "<strong>⛔ Never assume which fee model a market settles at — read it off that",
    replace: "<strong>Every live market today is loser-share, so the fee is 13% of the losing pool. Also, that",
  },
  {
    name: "caution-drops-the-comparison",
    what: "the caution stops showing what the OTHER model would pay",
    file: RUNBOOK,
    find: "<td>min(520, 666) = <strong>TZS 520</strong></td><td><strong>TZS 3,480</strong></td></tr>",
    replace: "<td>—</td><td>—</td></tr>",
  },
  {
    name: "code-charges-whole-pool",
    what: "poolFee charges loser-share on the WHOLE pool — the bug the docs had, in code",
    file: PAYOUT,
    find: 'const losingPool = winningSide === "YES" ? no : winningSide === "NO" ? yes : 0;',
    replace: 'const losingPool = winningSide === "YES" ? pool : winningSide === "NO" ? pool : 0;',
  },
  {
    name: "no-mix-broken",
    what: "a snapshot with no feeModel inherits loser-share — pre-23-July money reprices",
    file: PAYOUT,
    find: 'feeModel: rates?.feeModel === "loser-share" ? "loser-share" : "capped-commission",',
    replace: 'feeModel: rates?.feeModel === "capped-commission" ? "capped-commission" : "loser-share",',
  },
];

/**
 * Run the guard. Returns {failed, count, how} where `how` distinguishes the two ways a
 * guard can go red — and they are NOT the same evidence:
 *
 *   "assertions" — it ran to completion and N checks reported false. The normal case.
 *   "threw"      — it never reached its summary. Still red, but it proves a DIFFERENT
 *                  thing: something aborted. `code-charges-whole-pool` lands here because
 *                  charging loser-share on the whole pool breaches the WINNER FLOOR in §3
 *                  and `assertWinnerFloor` refuses to settle — the product's own money
 *                  tripwire firing, which is a stronger result than a failed comparison.
 *
 * Reporting a throw as "-1 failed" (the first version of this) is the kind of unexplained
 * number that makes a harness untrustworthy, so it is spelled out instead.
 */
function runGuard() {
  try {
    const out = execSync("npm run test:settlement-expectation", { cwd: ROOT, encoding: "utf8", stdio: "pipe" });
    return { failed: false, count: 0, how: "green", out };
  } catch (e) {
    const out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    const m = out.match(/(\d+) passed, (\d+) failed/);
    if (m) return { failed: true, count: Number(m[2]), how: "assertions", out };
    const thrown = out.match(/^Error: (.+)$/m)?.[1] ?? "no summary line and no Error line";
    return { failed: true, count: null, how: "threw", thrown: thrown.slice(0, 120), out };
  }
}

// Sanity: the guard must be GREEN before any mutation, or every result below is meaningless.
const baseline = runGuard();
if (baseline.failed) {
  console.log("\n⛔ the guard is ALREADY RED on an unmutated tree — fix that first\n");
  console.log(baseline.out.split("\n").slice(-12).join("\n"));
  process.exit(2);
}
console.log("\nbaseline: guard GREEN on the unmutated tree\n");

let proven = 0;
const broken = [];

for (const m of MUTATIONS) {
  const original = readFileSync(m.file, "utf8");
  // A mutation is either a literal find/replace or a `rewrite(doc)` for cases that must be
  // scoped (see `handoff-wrong-payout`). Either way the file MUST actually change.
  const mutated = m.rewrite ? m.rewrite(original) : original.replace(m.find, m.replace);
  if (mutated === original) {
    // ⛔ NOT a skip. An anchor that no longer matches means this harness is no longer
    // testing anything, and that is exactly how session 15 got a false all-clear.
    broken.push(`${m.name} — NOTHING CHANGED, this mutation tested nothing${m.find ? `: ${m.find}` : ""}`);
    console.log(`  ⛔ ${m.name.padEnd(26)} nothing changed — harness broken, not a pass`);
    continue;
  }
  writeFileSync(m.file, mutated);
  let r;
  try {
    r = runGuard();
  } finally {
    writeFileSync(m.file, original); // restore on every path, including a throw
  }
  if (r.failed) {
    proven++;
    const how = r.how === "threw" ? `THREW: ${r.thrown}` : `${String(r.count).padStart(2)} failed`;
    console.log(`  ✓ RED  ${m.name.padEnd(26)} ${how} — ${m.what}`);
  } else {
    broken.push(`${m.name} — the guard stayed GREEN with this defect present: ${m.what}`);
    console.log(`  ✗ GREEN ${m.name.padEnd(25)} guard did NOT catch it — ${m.what}`);
  }
}

// The tree must be exactly as we found it.
const after = runGuard();
console.log(`\nrestored: guard ${after.failed ? "RED — ⛔ THE TREE WAS NOT RESTORED" : "GREEN"}`);
console.log(`\n${proven}/${MUTATIONS.length}\n`);
for (const b of broken) console.log(`  · ${b}`);
process.exit(broken.length === 0 && !after.failed ? 0 : 1);
