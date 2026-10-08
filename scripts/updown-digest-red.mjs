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
    // ⚠️ RE-ANCHORED 2026-08-14. This case had been reporting "the source moved" — and
    // therefore proving NOTHING — since `354bc307` (2026-08-10), when `positionId: p.id`
    // joined the call and E-57 added the `else { pushOnly(…) }` branch beside it. Four days
    // of `red:updown-digest` printing 6/7, which reads as a known-red harness rather than as
    // a case that had quietly stopped testing its defect.
    //
    // ⛔ THE MUTATION MUST *MOVE* THE CALL, NOT NEGATE THE GATE. §5 of the guard is a SOURCE
    // assertion: it anchors on the emitter in statement position and looks BACK 400 characters
    // for `!perEventNotificationsSuppressed(`. So `if (true || !perEventNotificationsSuppressed(m))`
    // would leave the text in place and the suite would stay GREEN over an ungated refund —
    // a mutation that looks like a defect and is not one. Hoisting the call above the gate is
    // what actually reproduces E-43: a refund emitter nobody had gated.
    name: "ungate-refunds (E-43 as it shipped)",
    file: "src/lib/server/market-service.ts",
    // ⚠️ RE-ANCHORED 2026-08-15: the title is `localizedText(...)` now, so every player
    // notification carries all three market titles (§7.2c). The MUTATION is unchanged — the
    // refund emitter comes out from behind `perEventNotificationsSuppressed`, which is E-43
    // exactly as it shipped.
    from: `      if (!perEventNotificationsSuppressed(m)) {
        notifyRefund(p.userId, { stake: p.stake, marketTitle: localizedText(m.titleEn, m.titleSw, m.titleZh), marketId: m.id, positionId: p.id });
      } else {`,
    to: `      notifyRefund(p.userId, { stake: p.stake, marketTitle: localizedText(m.titleEn, m.titleSw, m.titleZh), marketId: m.id, positionId: p.id });
      if (false) {
      } else {`,
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
    // ⚠️ RE-ANCHORED 2026-10-08. `4f9abedc` (PLAYER QUERY 4.1, 2026-09-08) deleted the
    // `allRows.filter((r) => isInEatDay(r.settledAt ?? r.placedAt, dayKey))` this case planted
    // into: the page now groups rounds first and cuts them through ONE `inDay` closure that
    // `filterUd` / `udCounts` / `udEmptyCause` all receive. That closure is the only place the
    // page touches the shared day predicate, so it is where a local copy of the offset would
    // land. The plant is unchanged — a decoy `3 * 60 * 60 * 1000` beside the shared call — so
    // that it isolates §7's "has not re-derived the EAT offset locally" and nothing else.
    name: "page-reimplements-the-offset (the two disagree around midnight)",
    file: "src/app/updown/history/page.tsx",
    from: `  const inDay = (row: HistoryRow, day: string) => isInEatDay(new Date(row.binnedAtMs).toISOString(), day);`,
    to: `  const inDay = (row: HistoryRow, day: string) => { const EAT = 3 * 60 * 60 * 1000; void EAT; return isInEatDay(new Date(row.binnedAtMs).toISOString(), day); };`,
    expect: "has not re-derived the EAT offset locally",
  },
  {
    // 🔴 The bug the LIVE run caught and no unit test would have: filtering on the raw
    // query param instead of the validated one. `?day=lol` then hides every card while
    // the chip — which keys off the validated value — does not render, so the player
    // gets an empty page with nothing explaining it and no way back.
    //
    // ⚠️ RE-ANCHORED 2026-10-08. `4f9abedc` removed `const dayKey = dayWindow ? rawDay : null`:
    // the validation moved INTO `parseUdParams` (`day: isValidDay(rawDay) ? rawDay : ""`) and the
    // page now supplies the validator — `(d) => !!d && !!eatDayWindow(d)` — so the same defect
    // is the page handing the parser a validator that lets `lol` through, after which
    // `state.day` IS the raw param and drives the filter, the chip and the empty state.
    //
    // ⛔ AS OF 2026-10-08 THIS CASE CANNOT BE PROVEN: §7's assertion for it is stale. It still
    // pattern-matches the deleted `const dayKey = dayWindow ? rawDay : null`, so it fails on the
    // UNTOUCHED tree and fails identically with this plant — the suite cannot tell the defect
    // from the fix. The runner below scores every case as a DELTA against the baseline and so
    // reports this one as MISSED until that assertion is re-anchored to today's page (it should
    // then fail on this plant, by the label named in `expect`). Delete this paragraph when it does.
    name: "raw-param-filter (?day=lol empties the page with no way out)",
    file: "src/app/updown/history/page.tsx",
    from: `  const state = parseUdParams(sp, assetIds, durIds, (d) => !!d && !!eatDayWindow(d));`,
    to: `  const state = parseUdParams(sp, assetIds, durIds, (d) => !!d);`,
    expect: "one validated day drives the filter",
  },
];

// ⚠️ The working tree is CRLF (git autocrlf on Windows), and the anchors in this
// file are LF. A multi-line anchor therefore never matched, and the script
// reported "the source moved" for the two mutations that mattered most — a
// false all-clear from the very tool whose job is to prove the guard can fail.
// Normalise before comparing; the original bytes are restored verbatim either way.
const lf = (s) => s.replace(/\r\n/g, "\n");

/**
 * One run of the guard: whether it exited non-zero, its closing tally, and the LABEL of every
 * assertion that failed. The suite's `ok()` prints `FAIL <label>` at the start of a line, and the
 * label is the only id an assertion has here.
 */
function runGuard() {
  let out = "";
  let red = false;
  try {
    out = execSync("npm run test:updown-digest", { encoding: "utf8", stdio: "pipe" });
  } catch (e) {
    red = true;
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
  const failing = (out.match(/^FAIL (.+)$/gm) ?? []).map((l) => l.slice(5).trim());
  const tail = (out.match(/updown-digest \(E-37 \+ E-43\): (\d+) passed, (\d+) failed/) ?? [])[0]
    ?? out.trim().split("\n").slice(-1)[0];
  return { red, failing, tail };
}

// ⛔ THE BASELINE FIRST (2026-10-08). "The suite exited non-zero" proves nothing when it was going
// to exit non-zero anyway — and it was. From `4f9abedc` (2026-09-08) §7's assertion for the
// raw-param case pattern-matched a line that commit deleted, so `test:updown-digest` failed on the
// UNTOUCHED tree and this script printed a ✓ for every case it could still apply, including one
// the suite could no longer detect at all. So the guard is run once with nothing planted, and every
// case below is a DELTA: it counts only if it makes an assertion fail that was NOT already failing
// (and, where a case names its assertion with `expect`, only if that one is the new failure).
const base = runGuard();
const problems = [];
if (base.red || base.failing.length > 0) {
  const names = base.failing.length > 0 ? base.failing.map((l) => `"${l}"`).join("; ") : "it crashed";
  problems.push(`the guard is ALREADY RED on the untouched tree (${names}) — repair the suite before trusting any ✓ below`);
  console.log(`baseline · ${base.tail} — RED BEFORE ANY PLANT`);
  for (const l of base.failing) console.log(`         · ${l}`);
  console.log("         every verdict below is a DELTA against this; a case whose own assertion is in it cannot be proven\n");
} else {
  console.log(`baseline · ${base.tail} — green, so a red below is a DELTA\n`);
}

let proven = 0;
for (const m of MUTATIONS) {
  const original = readFileSync(m.file, "utf8");
  const normalised = lf(original);
  // The anchor must land EXACTLY ONCE: `replace` plants at the first of two and leaves the other
  // intact, so the suite could go red for a different reason than the case claims.
  const hits = normalised.split(lf(m.from)).length - 1;
  if (hits !== 1) {
    console.log(`⚠️  ${m.name}: anchor ${hits === 0 ? "not found" : `matches ${hits}×`} in ${m.file} — the source moved, fix this script`);
    continue;
  }
  writeFileSync(m.file, normalised.replace(lf(m.from), lf(m.to)));
  let run;
  try {
    run = runGuard();
  } finally {
    writeFileSync(m.file, original); // always restore, even if the run threw
  }
  const fresh = run.failing.filter((l) => !base.failing.includes(l));
  const hit = m.expect ? fresh.filter((l) => l.includes(m.expect)) : fresh;
  if (hit.length > 0) {
    proven++;
    console.log(`✓ RED   ${m.name}\n         ${run.tail} — new: ${hit[0]}${hit.length > 1 ? ` (+${hit.length - 1} more)` : ""}`);
    continue;
  }
  const why = m.expect && base.failing.some((l) => l.includes(m.expect))
    ? `its own assertion ("${m.expect}") is ALREADY failing on the untouched tree, so it cannot tell this defect from the fix`
    : m.expect ? `the named assertion ("${m.expect}") did not fail`
    : "no assertion failed that was not already failing";
  console.log(`✗ MISS  ${m.name}\n         ${run.tail} — ${why}`);
}

console.log(`\n${proven}/${MUTATIONS.length} defects caught by the guard`);
if (problems.length > 0) {
  console.error("\nRED HARNESS CANNOT BE TRUSTED:");
  for (const p of problems) console.error(`  !! ${p}`);
}
process.exit(problems.length === 0 && proven === MUTATIONS.length ? 0 : 1);
