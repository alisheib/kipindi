/**
 * RED PROOF for `test:updown-digest` (E-37 / E-43).
 *
 * A guard that has only ever been green is a guard nobody has tested. This
 * reintroduces each real defect — one at a time, in the real source — runs the
 * suite, records that it fails, and puts the file back byte-for-byte.
 *
 * Every mutation below is a defect that ACTUALLY EXISTED on production, not an
 * invented one:
 *   · ungate-refunds  — E-43 exactly as it shipped: the refund emitters not behind
 *                       `perEventNotificationsSuppressed`.
 *   · no-idempotence  — the digest without its once-per-day check, i.e. what a
 *                       15-minute sweep would do to a player's inbox.
 *   · soft-loss       — a loss reported as money returned, the LCCP failure the
 *                       old comment claimed was impossible.
 *   · wrong-tz        — the digest binned by UTC days instead of East Africa days.
 *   · dead-link       — the page ignoring the `?day=` the digest sends it.
 *
 *   node scripts/updown-digest-red.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const MUTATIONS = [
  {
    name: "ungate-refunds (E-43 as it shipped)",
    file: "src/lib/server/market-service.ts",
    from: `      if (!perEventNotificationsSuppressed(m)) {
        notifyRefund(p.userId, { stake: p.stake, marketTitle: m.titleEn, marketId: m.id });
      }`,
    to: `      notifyRefund(p.userId, { stake: p.stake, marketTitle: m.titleEn, marketId: m.id });`,
  },
  {
    name: "no-idempotence (a digest every 15 minutes, forever)",
    file: "src/lib/server/updown-digest.ts",
    from: `      if (await db.notification.existsWithHref(line.userId, copy.href)) { alreadySent++; continue; }`,
    to: `      if (false) { alreadySent++; continue; }`,
  },
  {
    name: "soft-loss (a loss dressed as money returned — the LCCP failure)",
    file: "src/lib/server/updown-digest.ts",
    from: `    : net < 0 ? \`Up & Down · you lost \${tzs(-net)}\``,
    to: `    : net < 0 ? \`Up & Down · \${tzs(t.returned)} returned\``,
  },
  {
    name: "wrong-tz (UTC days, not East Africa days)",
    file: "src/lib/eat-day.ts",
    from: `export const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;`,
    to: `export const EAT_OFFSET_MS = 0;`,
  },
  {
    // ⚠️ THIS ONE CAUGHT THE GUARD OUT, and that is why it is here. The first §7
    // asserted the page's SOURCE contained `dayWindow` and `filter(`; this
    // mutation broke the filter while keeping both words, and the suite stayed
    // GREEN — the RED harness caught a hole in the test, which is the whole
    // reason to run one. §7 now drives the shared predicate instead.
    name: "dead-link (the shared day predicate stops filtering)",
    file: "src/lib/eat-day.ts",
    from: `  return Number.isFinite(at) && at >= w.fromMs && at < w.toMs;`,
    to: `  return Number.isFinite(at);`,
  },
  {
    name: "page-reimplements-the-offset (the two disagree around midnight)",
    file: "src/app/updown/history/page.tsx",
    from: `    ? allRows.filter((r) => isInEatDay(r.settledAt ?? r.placedAt, dayParam))`,
    to: `    ? allRows.filter((r) => { const EAT = 3 * 60 * 60 * 1000; void EAT; return isInEatDay(r.settledAt ?? r.placedAt, dayParam); })`,
  },
];

// ⚠️ The working tree is CRLF (git autocrlf on Windows), and the anchors in this
// file are LF. A multi-line anchor therefore never matched, and the script
// reported "the source moved" for the two mutations that mattered most — a
// false all-clear from the very tool whose job is to prove the guard can fail.
// Normalise before comparing; the original bytes are restored verbatim either way.
const lf = (s) => s.replace(/\r\n/g, "\n");

let proven = 0;
for (const m of MUTATIONS) {
  const original = readFileSync(m.file, "utf8");
  const normalised = lf(original);
  if (!normalised.includes(lf(m.from))) {
    console.log(`⚠️  ${m.name}: anchor not found in ${m.file} — the source moved, fix this script`);
    continue;
  }
  writeFileSync(m.file, normalised.replace(lf(m.from), lf(m.to)));
  let out = "";
  let red = false;
  try {
    out = execSync("npm run test:updown-digest", { encoding: "utf8", stdio: "pipe" });
  } catch (e) {
    red = true;
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  } finally {
    writeFileSync(m.file, original); // always restore, even if the run threw
  }
  const tail = (out.match(/updown-digest \(E-37 \+ E-43\): (\d+) passed, (\d+) failed/) ?? [])[0]
    ?? out.trim().split("\n").slice(-1)[0];
  console.log(`${red ? "✓ RED " : "✗ GREEN"}  ${m.name}\n         ${tail}`);
  if (red) proven++;
}

console.log(`\n${proven}/${MUTATIONS.length} defects caught by the guard`);
process.exit(proven === MUTATIONS.length ? 0 : 1);
