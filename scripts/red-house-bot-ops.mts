/**
 * RED PROOF for `test:house-bot-ops` — every planted control, in process.     npm run red:house-bot-ops
 *
 * ⛔ THIS FILE EXISTS SO THE RED PATH HAS A SOURCE OF ITS OWN (2026-09-26, RESUME-HERE §0c step 7). Until then the
 * key ran `scripts/lib/house-bot-ops-cases.mts --prove-red` — one file, two entry points — and that file's §9
 * removes a temporary git index from the disk. `test:red-anchors` §4 reads the WHOLE source of the script a `red:*`
 * command names, comments included, so the test path's disk write counted this in-memory proof as a harness whose
 * anchors nobody audits. The ratchet was right; the entry point was shared.
 *
 * ⭐ Nothing on this path writes, spawns or opens a store: every plant is a string constant in
 * `scripts/lib/house-bot-ops-detectors.mts`, and `test:house-bot-ops` `ops.red.1` pins this file AND its whole
 * import closure write-free with §4's own predicate, read out of `red-anchors.test.mts` — more than §4 reads.
 *
 * ⛔ Do not add a lock file, a log file or a restore step. The disk-mutating red-house-bot-*.mjs entries need them;
 * this one must not have them — any file-writing call here puts it straight back into §4's count, and so does a
 * write call's name followed by an opening parenthesis in a comment, because §4 reads comments too.
 *
 * ⛔ There is no scripts/anchors/house-bot-ops.anchors.mjs and there must not be: nothing here injects a string into
 * a file, so a declaration would invent anchors (ruling 505; the case list's header).
 *
 * The flag is required, not decorative: it is what §4 classifies this key by, so a command that dropped it would be
 * counted as un-audited while still printing a clean tally. Without it this refuses with exit 2.
 */
import { redCases } from "./lib/house-bot-ops-detectors.mts";

if (!process.argv.includes("--prove-red")) {
  console.error("red:house-bot-ops runs only with --prove-red — the flag is what test:red-anchors §4 classifies it by.");
  process.exit(2);
}
console.log("\n[red] red:house-bot-ops · every planted control, in process, nothing written");
const cases = redCases();
for (const c of cases) console.log(`${c.caught ? "SEEN RED" : "NOT CAUGHT"}  ${c.label} — ${c.saw}`);
const missed = cases.filter((c) => !c.caught);
// The tally red:all's table reads: it takes the LAST "N/M … caught" on the stream, and the exit code decides.
console.log(`\nred:house-bot-ops — ${cases.length - missed.length}/${cases.length} caught`);
console.log(`@@RED ${JSON.stringify({ planted: cases.length, caught: cases.length - missed.length, missed: missed.map((m) => m.label) })}`);
process.exit(missed.length === 0 ? 0 : 1);
