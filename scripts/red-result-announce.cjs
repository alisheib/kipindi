/**
 * RED PROOF for the Up & Down result moment.
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. Every mutation must make the suite EXIT NON-ZERO *and*
 * report ≥1 failure, and every mutation is a REVERT verified byte-for-byte.
 *
 * ⭐ THE THREE THAT MATTER MOST:
 *  · `no-myResult` restores the exact server the board shipped for the whole campaign — a
 *    winner and a loser getting byte-identical props. If that is ever MISSED this guard has
 *    stopped guarding the feature.
 *  · `void-treated-as-loss` is the FALSE MONEY STATEMENT. A round can resolve DOWN and still
 *    hand an UP backer their whole stake back because nobody took the other side (E-65);
 *    telling that player "you lost" is the E-39/E-65/E-68 defect on the most screenshot-able
 *    screen in the product.
 *  · `sends-an-email` silently reverses Ali's dated 2026-07-24 decision. §4 exists for it.
 *
 *   npm run red:updown-result-announce
 */
const { readFileSync, writeFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

const ANN = "src/components/updown/updown-result-announcer.tsx";
const BOARD = "src/lib/server/updown-board.ts";
const SUITE = "scripts/updown-result-announce.test.mts";

const MUTATIONS = [
  {
    name: "⭐ no-myResult — the server stops sending the viewer's outcome (the pre-fix board)",
    file: BOARD,
    find: `    myResult: mine?.result ?? null,`,
    with: `    myResult: null,`,
  },
  {
    name: "⭐ void-treated-as-loss — a refunded player is told they lost (FALSE MONEY STATEMENT)",
    file: ANN,
    // ⚠️ This said `if (res.status === "VOID") {`, a stand-alone arm that ended in `continue`.
    // `eb887f9d` (PRESENCE-4, 2026-09-05) folded the three outcomes into one lane chain, so the
    // arm is now `} else if (routing.channel === "TOAST" && res.status === "VOID") {` and the next
    // arm, `else if (routing.channel === "TOAST")`, is the LOSS toast. The defect is unchanged:
    // kill the VOID arm and a refunded player falls into the loss toast. (Only a WIN can be
    // routed to CEREMONY, and the LEDGER arm is handed `kind: res.status`, so the TOAST lane is
    // the one place a live refund can be misread.) 3.2 wants `status === "VOID"` in the effect.
    find: `      } else if (routing.channel === "TOAST" && res.status === "VOID") {`,
    with: `      } else if (false) {`,
  },
  {
    name: "⭐ sends-an-email — silently reverses Ali's 2026-07-24 decision",
    file: ANN,
    // ⚠️ This said `if (res.status === "WIN") {`; `eb887f9d` made the win arm conditional on the
    // CEREMONY lane too. The plant still goes first thing inside the win arm, in code (not in a
    // comment), where §4's comment-stripped `4.sendEmailToUser` reads it.
    find: `      if (routing.channel === "CEREMONY" && res.status === "WIN") {`,
    with: `      if (routing.channel === "CEREMONY" && res.status === "WIN") {\n        void sendEmailToUser;`,
  },
  {
    name: "fires-on-mount — every page load re-congratulates you (an ambush, not a moment)",
    file: ANN,
    find: `    if (seen.current == null) {`,
    with: `    if (false) {`,
  },
  {
    name: "celebrates the STAKE instead of the realised payout",
    file: ANN,
    // ⚠️ THE ANCHOR CARRIES `kind: "WIN",` ON PURPOSE. Since `eb887f9d` the away-ledger's
    // `recordAway({ … amount: res.payout … })` spells the same line, so `amount: res.payout,` alone
    // matches TWICE: `String.replace` planted at the first (the celebration, by luck of order) and
    // `scripts/red-anchor.mjs` would refuse it as ambiguous. This pair is unique and names the site.
    //
    // ⛔ IF THIS READS ✗ MISSED, THE ANCHOR IS NOT WHY — THE SUITE IS. Suite 3.4 asks
    // `/amount:\s*res\.payout/` of the WHOLE effect, and the ledger's line satisfies it while
    // `dispatchWinCelebration` headlines the stake. It must look at that call alone. Planting at
    // BOTH sites would turn this red (3.4) but would prove the ledger line, not the celebration.
    find: `          kind: "WIN",\n          amount: res.payout,`,
    with: `          kind: "WIN",\n          amount: res.stake,`,
  },
  {
    name: "the loss stops naming the amount (the euphemism RG forbids)",
    file: ANN,
    find: `        description: \`\${sideWord} · \${formatTzs(res.stake)}\`,`,
    with: `        description: sideWord,`,
  },
  {
    name: "status inferred from the round outcome instead of the position row",
    file: BOARD,
    find: `        p.status === "WIN" ? "WIN" : p.status === "LOSS" ? "LOSS" : "VOID";`,
    with: `        payout > p.stake ? "WIN" : payout > 0 ? "VOID" : "LOSS";`,
  },
  {
    name: "⭐ stripComments returns nothing — §4's six absence checks would pass over \"\"",
    file: SUITE,
    find: `function stripComments(src: string): string {\n  return src`,
    with: `function stripComments(src: string): string {\n  return "" || src`,
    // ⚠️ EXPECTED TO BE MISSED: `"" || src` is still src. This mutation is here to be reported
    // honestly — it documents that §4.control guards the SHAPE of the stripped source, not
    // every possible way the stripper could misbehave.
    expectMiss: true,
  },
  {
    name: "⭐ stripComments returns EMPTY — the real vacuity, and §4.control must catch it",
    file: SUITE,
    find: `function stripComments(src: string): string {\n  return src`,
    with: `function stripComments(src: string): string {\n  return "" && src`,
  },
];

function resolve(text, needle) {
  if (text.includes(needle)) return needle;
  const crlf = needle.replace(/\n/g, "\r\n");
  if (text.includes(crlf)) return crlf;
  return null;
}

const run = () => spawnSync("npx", ["tsx", SUITE], { encoding: "utf8", shell: true });

console.log("── the suite on the FIXED tree (must be green) ──");
const before = run();
console.log(`   exit=${before.status}  ${before.stdout.match(/\d+ passed, \d+ failed/)?.[0] ?? ""}`);
if (before.status !== 0) { console.error("   ✗ not green to begin with"); process.exit(2); }

let proven = 0, documented = 0;
for (const m of MUTATIONS) {
  console.log(`\n── mutation: ${m.name} ──`);
  const original = readFileSync(m.file, "utf8");
  const find = resolve(original, m.find);
  if (!find) { console.error(`   ✗ ANCHOR NOT FOUND in ${m.file} — THIS MUTATION PROVES NOTHING.`); continue; }
  const mutated = original.replace(find, m.with.replace(/\n/g, find.includes("\r\n") ? "\r\n" : "\n"));
  if (mutated === original) { console.error(`   ✗ FILE UNCHANGED — PROVES NOTHING.`); continue; }
  writeFileSync(m.file, mutated, "utf8");
  const r = run();
  const out = r.stdout + r.stderr;
  const failed = Number(out.match(/^updown-result-announce: (\d+) passed, (\d+) failed$/m)?.[2] ?? 0);
  const caught = r.status !== 0 && failed >= 1;
  console.log(`   exit=${r.status}  failures=${failed}  ${m.expectMiss ? (caught ? "⚠️ CAUGHT (better than documented)" : "· missed, AS DOCUMENTED") : caught ? "✓ CAUGHT" : "✗ MISSED"}`);
  for (const line of out.split(/\r?\n/).filter((l) => l.includes("FAIL")).slice(0, 3)) console.log(`     ${line.trim()}`);
  writeFileSync(m.file, original, "utf8");
  if (readFileSync(m.file, "utf8") !== original) { console.error("   🔴 REVERT FAILED"); process.exit(2); }
  if (m.expectMiss) documented++; else if (caught) proven++;
}

const required = MUTATIONS.filter((m) => !m.expectMiss).length;
console.log(`\n${proven}/${required} required mutations caught (+${documented} documented-miss) — files restored byte-for-byte.`);
process.exit(proven === required ? 0 : 1);
