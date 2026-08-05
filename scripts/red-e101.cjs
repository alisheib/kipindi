/**
 * RED PROOF for E-101 — a ticket reference must link to that ticket.
 *
 *   node scripts/red-e101.cjs        (npm run red:position-permalink)
 *
 * ⛔ "THE FILE CHANGED" IS NOT A RED. Every mutation must make the suite EXIT NON-ZERO *and*
 * report at least one FAIL, and every mutation is a REVERT — restored byte-for-byte, verified.
 *
 * ⭐ EVERY MUTATION HERE IS THE PRODUCT AS IT SHIPPED. This is not a synthetic corruption
 * exercise: `/positions` really was the href on all four surfaces this morning, and the anchors
 * really did not exist. The primary RED is therefore the pre-fix tree itself — recorded at
 * **12 passed, 13 failed, exit 1**. These mutations exist to keep the checks honest afterwards,
 * one site at a time, so a future edit cannot quietly undo one of the four and stay green.
 *
 * ⚠️ Multi-file on purpose: the finding is a CLASS across four surfaces plus three destinations,
 * and a harness that only mutated the shared rule would prove nothing about the wiring.
 */
const { readFileSync, writeFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

const SUITE = "scripts/position-permalink.test.mts";

const MUTATIONS = [
  {
    name: "wallet-ticket-back-to-the-list (Ali's report, exactly as reported)",
    file: "src/app/wallet/wallet-client.tsx",
    find: `              href={positionPermalinkHref(tx.positionId)}`,
    with: `              href="/positions"`,
  },
  {
    name: "updown-round-button-back-to-the-OTHER-game's-list (the guaranteed dead end)",
    file: "src/app/updown/[roundId]/page.tsx",
    find: `                <Link href={positionListHref("UPDOWN", myPosition.ids[0] ?? "")}`,
    with: `                <Link href="/positions"`,
  },
  {
    // ⚠️ ALL THREE, because the three CTAs are byte-identical and the finding is the class:
    // an email that quotes `Reference: pos_…` and then links to a list. A single-site anchor
    // here was wrong twice — once on CRLF (this file is LF, unlike most) and once on the
    // neighbouring declaration, which is a comment block, not the next export.
    name: "every-email-cta-back-to-the-list (all 3 — bet placed · win · cash-out)",
    file: "src/lib/server/email.ts",
    all: true,
    find: `\${ctaButton(positionPermalinkHref(reference), "View this ticket`,
    with: `\${ctaButton("/positions", "View positions`,
  },
  {
    name: "notifyWin-default-href-restored (a default that is wrong for one of two products)",
    file: "src/lib/server/notification-service.ts",
    find: `export function notifyWin(userId: string, amount: number, label: string, href: string) {`,
    with: `export function notifyWin(userId: string, amount: number, label: string, href = "/positions") {`,
  },
  {
    name: "updown-position-falls-back-to-the-long-form-list (the rule itself)",
    file: "src/lib/position-permalink.ts",
    find: `    return { href: positionListHref("UPDOWN", positionId), surface: "updown-list", isFallback: true };`,
    with: `    return { href: positionListHref("MARKET", positionId), surface: "updown-list", isFallback: true };`,
  },
  {
    name: "market-card-loses-its-anchor (the deep link lands at the top of the page)",
    file: "src/app/markets/[id]/page.tsx",
    find: `                  <div key={p.id} id={p.id} className="ticket-target scroll-mt-24 rounded-md`,
    with: `                  <div key={p.id} className="rounded-md`,
  },
  {
    name: "round-panel-loses-its-anchors (same, on the Up & Down side)",
    file: "src/app/updown/[roundId]/page.tsx",
    find: `                {myPosition.ids.map((pid) => (
                  <span key={pid} id={pid} className="ticket-anchor block scroll-mt-24" aria-hidden="true" />
                ))}`,
    with: ``,
  },
  {
    // 🔴 E-101b, the defect this found on production: anchor present, ring lit, no scroll.
    name: "destination-stops-scrolling-to-the-fragment (looks deep, lands at the top)",
    file: "src/app/markets/[id]/page.tsx",
    find: `      <HashFocus />\n`,
    with: ``,
  },
  {
    name: "resolver-drops-the-ownership-check (a permalink is guessable)",
    file: "src/app/positions/[positionId]/page.tsx",
    find: `  if (!position || position.userId !== session.userId) notFound();`,
    with: `  if (!position) notFound();`,
  },
];

const run = () => spawnSync("npx", ["tsx", SUITE], { encoding: "utf8", shell: true });

console.log("── the suite on the FIXED tree (must be green) ──");
const before = run();
console.log(`   exit=${before.status}`);
if (before.status !== 0) { console.error("   the suite is not green to begin with — nothing can be proven"); process.exit(2); }

let proven = 0;
for (const m of MUTATIONS) {
  console.log(`\n── mutation: ${m.name} ──`);
  const original = readFileSync(m.file, "utf8");
  // ⛔ CHECK THE ANCHOR BEFORE BELIEVING A GREEN. An anchor that is not found edits nothing
  // while the run still looks orderly — that is how a harness reports comfort instead of proof.
  //
  // ⚠️ CRLF, FOR THE SIXTH TIME IN THIS REPO. Most files here are CRLF, so any anchor spanning
  // more than one line misses when written with `\n` — and it missed TWICE on this harness's
  // first run, which is exactly why the check above exists. Fixed once, generally, rather than
  // by hand-editing two literals: try the anchor as written, then as CRLF.
  const find = original.includes(m.find) ? m.find : m.find.replace(/\n/g, "\r\n");
  const repl = find === m.find ? m.with : m.with.replace(/\n/g, "\r\n");
  if (!original.includes(find)) {
    console.error(`   ANCHOR NOT FOUND in ${m.file} — this mutation proves NOTHING. Fix the anchor.`);
    continue;
  }
  writeFileSync(m.file, m.all ? original.split(find).join(repl) : original.replace(find, repl), "utf8");
  const r = run();
  const out = r.stdout + r.stderr;
  const line = out.match(/^(\d+) passed, (\d+) failed$/m);
  const failed = line ? Number(line[2]) : 0;
  const caught = r.status !== 0 && failed >= 1;
  console.log(`   exit=${r.status}  failures=${failed}  ${caught ? "✓ CAUGHT" : "✗ MISSED"}`);
  for (const l of out.split(/\r?\n/).filter((x) => x.includes("FAIL")).slice(0, 3)) console.log(`     ${l.trim()}`);
  writeFileSync(m.file, original, "utf8");
  if (readFileSync(m.file, "utf8") !== original) { console.error(`   🔴 REVERT FAILED on ${m.file}`); process.exit(2); }
  if (caught) proven++;
}

console.log(`\n${proven}/${MUTATIONS.length} mutations caught — every file restored byte-for-byte.`);
process.exit(proven === MUTATIONS.length ? 0 : 1);
