/**
 * RED PROOF for E-70 — the player↔admin shell boundary.
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. Every mutation must make the suite EXIT NON-ZERO *and*
 * report ≥1 failure, and every mutation is a REVERT verified byte-for-byte.
 *
 * ⚠️ Both files are CRLF. Each anchor is tried as written, then in its CRLF form; an anchor
 * matching NEITHER is reported as proving nothing rather than passing quietly.
 *
 * ⭐ MUTATIONS 1 AND 2 ARE THE FOUNDING CASES — they restore the exact `<Link>` the tree
 * carried when Ali reported the missing navbar. If either is ever MISSED this guard has stopped
 * guarding E-70 whatever else it reports. Mutation 5 is the one that matters most for the
 * suite's own honesty: it breaks the PARSER, and §3's control must catch that — otherwise §1
 * and §2 would be passing over an empty result set, which is the vacuity that made session 29
 * write six checks that could not fail.
 *
 *   npm run red:shell-boundary
 */
const { readFileSync, writeFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

const ADMIN = "src/components/admin/admin-shell.tsx";
const AVATAR = "src/components/layout/avatar-menu.tsx";
const MENU_PARSER = "scripts/shell-boundary.test.mts";
const SUITE = "scripts/shell-boundary.test.mts";

const MUTATIONS = [
  {
    name: "⭐ admin→player reverted to <Link> (the tree Ali reported: no navbar)",
    file: ADMIN,
    find: `        <a\n          href="/"\n          aria-label="Back to app"`,
    with: `        <Link\n          href="/"\n          aria-label="Back to app"`,
  },
  {
    name: "⭐ player→admin reverted to <Link> (session 21: console inside player chrome)",
    file: AVATAR,
    find: `                <a\n                  href="/admin"\n                  role="menuitem"`,
    with: `                <Link\n                  href="/admin"\n                  role="menuitem"`,
  },
  {
    name: "the Back-to-app control DELETED entirely — the suite must go blind loudly, not quietly",
    file: ADMIN,
    find: `          href="/"\n          aria-label="Back to app"`,
    with: `          href="/somewhere-else"\n          aria-label="Back to app"`,
  },
  {
    name: "a SECOND crossing link added — one correct link must not excuse a wrong one",
    file: AVATAR,
    find: `            {isAdmin && (`,
    with: `            {isAdmin && <Link href="/admin">second</Link>}\n            {isAdmin && (`,
  },
  {
    name: "⭐ THE PARSER ITSELF BROKEN — §3's control must catch it, or §1/§2 prove nothing",
    file: MENU_PARSER,
    find: `    if (value !== want) continue;`,
    with: `    if (true) continue;`,
  },
  {
    name: "the root-cause check made unfalsifiable (§4 must not be a rubber stamp)",
    file: MENU_PARSER,
    find: `ok("4.1 AppShell still decides the player chrome from the REQUEST PATH in the root layout",\n   /x-pathname/.test(gate) && /startsWith\\("\\/admin"\\)/.test(gate),`,
    with: `ok("4.1 AppShell still decides the player chrome from the REQUEST PATH in the root layout",\n   true,`,
    // ⚠️ This mutation is EXPECTED TO BE MISSED — making a check always-true cannot fail the
    // suite. It is here to be reported honestly, as the standing reminder that §4 is a
    // tripwire for a future refactor and not a defect detector.
    expectMiss: true,
  },
];

function resolve(text, needle) {
  if (text.includes(needle)) return needle;
  const crlf = needle.replace(/\n/g, "\r\n");
  if (text.includes(crlf)) return crlf;
  return null;
}

const run = () => spawnSync("npx", ["tsx", SUITE], { encoding: "utf8", shell: true });

console.log("── the suite on the FIXED tree (must be green, or nothing below proves anything) ──");
const before = run();
console.log(`   exit=${before.status}  ${before.stdout.match(/\d+ passed, \d+ failed/)?.[0] ?? ""}`);
if (before.status !== 0) { console.error("   ✗ the suite is not green to begin with"); process.exit(2); }

let proven = 0, expected = 0;
for (const m of MUTATIONS) {
  console.log(`\n── mutation: ${m.name} ──`);
  const original = readFileSync(m.file, "utf8");
  const find = resolve(original, m.find);
  if (!find) { console.error(`   ✗ ANCHOR NOT FOUND (neither LF nor CRLF) in ${m.file} — THIS MUTATION PROVES NOTHING.`); continue; }
  const mutated = original.replace(find, m.with.replace(/\n/g, find.includes("\r\n") ? "\r\n" : "\n"));
  if (mutated === original) { console.error(`   ✗ THE FILE DID NOT CHANGE — THIS MUTATION PROVES NOTHING.`); continue; }
  writeFileSync(m.file, mutated, "utf8");
  const r = run();
  const out = r.stdout + r.stderr;
  const failed = Number(out.match(/^shell-boundary: (\d+) passed, (\d+) failed$/m)?.[2] ?? 0);
  const caught = r.status !== 0 && failed >= 1;
  const verdict = m.expectMiss ? (caught ? "⚠️ CAUGHT (unexpected — good)" : "· missed, AS DOCUMENTED") : (caught ? "✓ CAUGHT" : "✗ MISSED");
  console.log(`   exit=${r.status}  failures=${failed}  ${verdict}`);
  for (const line of out.split(/\r?\n/).filter((l) => l.includes("FAIL")).slice(0, 3)) console.log(`     ${line.trim()}`);
  writeFileSync(m.file, original, "utf8");
  if (readFileSync(m.file, "utf8") !== original) { console.error("   🔴 REVERT FAILED — stop and restore by hand"); process.exit(2); }
  if (m.expectMiss) expected++; else if (caught) proven++;
}

const required = MUTATIONS.filter((m) => !m.expectMiss).length;
console.log(`\n${proven}/${required} required mutations caught (+${expected} documented-miss) — files restored byte-for-byte.`);
process.exit(proven === required ? 0 : 1);
