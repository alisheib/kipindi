/**
 * RED proof for `test:updown-positions-visible`.
 *
 * ⛔ IT RESTORES THE REAL PRE-FIX SOURCE, VERBATIM — not a mutation invented to match the
 * guard's locators. That distinction is the whole point: a guard and a RED proof that
 * share a wrong locator agree with each other and are both wrong, and the suite then
 * presents as a working gate over a defect it cannot see. Every string below is the text
 * that was actually in the file before 2026-08-15.
 *
 * Each defect is restored ON ITS OWN and the guard is run against it, so this proves each
 * assertion GROUP is load-bearing — not merely that the suite goes red when the file is
 * damaged in some way. A single combined mutation could be caught by one assertion while
 * three others were silently vacuous.
 *
 * Run: `npm run red:updown-positions-visible`
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const HISTORY = "src/app/updown/history/page.tsx";
const ROUND = "src/app/updown/[roundId]/page.tsx";
const BOARD = "src/lib/server/updown-board.ts";

const FILES = [HISTORY, ROUND, BOARD];
const original = new Map(FILES.map((f) => [f, readFileSync(f, "utf8")]));

/** Restore every file to the working-tree text we started from. */
function restore() {
  for (const [f, text] of original) writeFileSync(f, text, "utf8");
}

/** Apply a replacement; throw loudly if the anchor is not found (a no-op mutation would
 *  otherwise "pass" this proof while changing nothing — the exact silent-degradation
 *  failure two RED harnesses on this repo shipped with for four days). */
/**
 * ⛔ EOL-AWARE, and that is not a detail. These files are CRLF on the Windows checkout, so
 * a multi-line anchor written with "\n" matches NOTHING while every single-line anchor in
 * the same case applies cleanly — the harness then reports a partly-applied mutation as if
 * it were the real defect. Caught by the anchor assertion below on the first run.
 */
const eolOf = (text) => (text.includes("\r\n") ? "\r\n" : "\n");

function mutate(file, rawFrom, rawTo, label) {
  const before = readFileSync(file, "utf8");
  const eol = eolOf(before);
  const from = rawFrom.replace(/\n/g, eol);
  const to = rawTo.replace(/\n/g, eol);
  if (!before.includes(from)) {
    restore();
    console.error(`\n✗ ANCHOR NOT FOUND for "${label}" in ${file}`);
    console.error("  This proof is stale: the code moved and the mutation applied nothing.");
    console.error("  A RED harness with a stale anchor is an ABSENT test — fix the anchor.");
    process.exit(2);
  }
  writeFileSync(file, before.replace(from, to), "utf8");
}

function guardIsRed() {
  try {
    execSync("npx tsx scripts/updown-positions-visible.test.mts", { stdio: "pipe" });
    return false; // exited 0 — the guard did NOT catch it
  } catch {
    return true;
  }
}

const cases = [
  {
    name: "D1 · the history card caps the chip row at two bets + a bare `+N`",
    apply: () => {
      mutate(HISTORY,
        "              const roundLink = r.roundId ? `/updown/${r.roundId}` : null;",
        "              const shown = g.bets.slice(0, 2);\n"
        + "              const extra = g.bets.length - shown.length;\n"
        + "              const roundLink = r.roundId ? `/updown/${r.roundId}` : null;",
        "reinstate shown/extra");
      mutate(HISTORY,
        "                    {g.bets.map((b) => (",
        "                    {shown.map((b) => (",
        "chip row maps the truncated list");
      mutate(HISTORY,
        "                  </div>\n\n                  {/* Money: staked",
        "                    {extra > 0 && <span className=\"chip\">+{extra}</span>}\n"
        + "                  </div>\n\n                  {/* Money: staked",
        "restore the +N chip");
    },
  },
  {
    name: "D2 · the 400-row read cap is silent again",
    apply: () => {
      mutate(HISTORY,
        "  const allRows = await getMyUpDownHistory(session.userId, UD_HISTORY_LIMIT);",
        "  const allRows = await getMyUpDownHistory(session.userId, 400);",
        "bare literal instead of the named limit");
      mutate(HISTORY,
        "  const capped = allRows.length >= UD_HISTORY_LIMIT;",
        "",
        "remove the truncation detector");
    },
  },
  {
    name: "D3 · the round panel shows one aggregated line again",
    apply: () => {
      mutate(ROUND,
        "                {myPosition.items.length > 1 && (",
        "                {false && (",
        "stop itemising");
    },
  },
  {
    name: "D4 · myPositionFor caps across ALL rounds, then filters to this one",
    apply: () => {
      mutate(BOARD,
        "  const positions = (await listPositionsForMarket(marketId).catch(() => [])).filter((p) => p.userId === userId);",
        "  const positions = (await listPositionsForUser(userId, 500, \"UPDOWN\").catch(() => [])).filter((p) => p.marketId === marketId);",
        "restore the global-cap-then-filter read");
    },
  },
];

console.log("RED · restoring each pre-fix defect on its own and requiring the guard to catch it\n");

// Sanity: the guard must be GREEN before we break anything. A proof that starts red
// proves nothing about the mutations.
if (guardIsRed()) {
  restore();
  console.error("✗ the guard is ALREADY red on the unmodified tree — fix that first");
  process.exit(2);
}
console.log("  ok   baseline · the guard is green on the current tree\n");

let caught = 0;
for (const c of cases) {
  restore();
  c.apply();
  const red = guardIsRed();
  console.log(`  ${red ? "ok  " : "FAIL"} ${c.name} → guard ${red ? "went RED" : "STAYED GREEN"}`);
  if (red) caught++;
}
restore();

console.log(`\nred:updown-positions-visible: ${caught}/${cases.length} defects caught`);
if (caught !== cases.length) {
  console.error("✗ at least one real defect slips past the guard — the gate is not a gate");
  process.exit(1);
}
console.log("red:updown-positions-visible: OK — every pre-fix defect is seen, and the tree is restored");
