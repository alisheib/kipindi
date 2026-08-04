/**
 * RED harness for `npm run test:updown-chain-stats`.
 *
 *   node scripts/updown-chain-stats-red.mjs
 *
 * A guard that has never failed is not a guard. Each mutation below re-introduces a REAL
 * defect — several of them verbatim the code that shipped — and the suite must reject it.
 *
 * ⛔ TWO RULES THIS HARNESS OBEYS, BOTH LEARNED THE HARD WAY IN THIS CAMPAIGN:
 *
 *  1. A mutation that does not APPLY is not a MISS, it is a broken harness. CRLF has fooled
 *     three sessions running: an LF-anchored replace silently matches nothing, the file is
 *     rewritten unchanged, and the run reports "defect not caught" as if the guard were weak.
 *     So every anchor is asserted present BEFORE the edit and the text is asserted GONE after.
 *  2. "The file changed" is not evidence. The suite must EXIT NON-ZERO **and** print at least
 *     one failing assertion — a harness that only checks for a diff printed "✓ RED" for three
 *     mutations a guard silently passed.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const STATS = new URL("../src/lib/server/updown-chain-stats.ts", import.meta.url);
const PAGE = new URL("../src/app/admin/updown/page.tsx", import.meta.url);

/** @type {{name: string, file: URL, from: string, to: string}[]} */
const MUTATIONS = [
  {
    name: "blend-the-reasons — every void counted as no-move (the shipped defect)",
    file: STATS,
    from: `      case "no-move": noMove++; break;
      case "source-failed": sourceFailed++; break;`,
    to: `      case "no-move": noMove++; break;
      case "source-failed": noMove++; break;`,
  },
  {
    name: "operator-counts-as-a-feed-failure — a July remediation reads as an outage (E-58)",
    file: STATS,
    from: `    feedFailRate: (sourceFailed + sourceMismatch) / resolved,`,
    to: `    feedFailRate: (sourceFailed + sourceMismatch + operator) / resolved,`,
  },
  {
    name: "unknown-folded-into-no-move — a new reason vanishes silently (E-1's shape)",
    file: STATS,
    from: `      default: unknownVoid++; break;`,
    to: `      default: noMove++; break;`,
  },
  {
    name: "low-payout-outranks-the-outage — an outage shown as a pricing choice",
    file: STATS,
    from: `  if ((s.feedFailRate ?? 0) > 0) return "feed-failing";
  if ((s.decisiveRate ?? 1) < 0.6) return "low-payout";`,
    to: `  if ((s.decisiveRate ?? 1) < 0.6) return "low-payout";
  if ((s.feedFailRate ?? 0) > 0) return "feed-failing";`,
  },
  {
    name: "count-window-not-time-window — two chains stop being comparable (E-58's enabler)",
    file: PAGE,
    from: `          .list({ chainId: c.id, boundaryFrom: statsFrom, limit: STATS_CAP })`,
    to: `          .list({ chainId: c.id, limit: STATS_CAP })`,
  },
  {
    name: "rates-report-zero-instead-of-null — 'no data' shown as 0% (A-5)",
    file: STATS,
    from: `  if (resolved === 0) return { ...EMPTY_CHAIN_STATS };`,
    to: `  if (resolved === 0) return { ...EMPTY_CHAIN_STATS, decisiveRate: 0, feedFailRate: 0 };`,
  },
];

let caught = 0;
const missed = [];

for (const m of MUTATIONS) {
  const original = readFileSync(m.file, "utf8");
  // Rule 1 — the anchor must exist, or this run proves nothing.
  if (!original.includes(m.from)) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND — the harness is broken, not the guard.`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  const mutated = original.replace(m.from, m.to);
  writeFileSync(m.file, mutated);
  try {
    if (readFileSync(m.file, "utf8").includes(m.from)) {
      throw new Error("mutation did not land on disk");
    }
    let exitCode = 0;
    let out = "";
    try {
      out = execSync("npx tsx scripts/updown-chain-stats.test.mts", {
        cwd: new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (e) {
      exitCode = e.status ?? 1;
      out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    }
    // Rule 2 — non-zero exit AND a named failure. Either alone is not proof.
    const failedCount = Number(/(\d+) failed/.exec(out)?.[1] ?? 0);
    if (exitCode !== 0 && failedCount > 0) {
      caught++;
      const first = /✗ (.+)/.exec(out)?.[1] ?? "";
      console.log(`  ✓ RED  ${m.name}\n         → ${failedCount} failed · ${first.slice(0, 96)}`);
    } else {
      missed.push(m.name);
      console.log(`  ✗ MISS ${m.name}\n         → exit ${exitCode}, ${failedCount} failed — the guard did NOT catch this`);
    }
  } finally {
    writeFileSync(m.file, original); // always restore, pass or fail
  }
}

console.log(`\nRED HARNESS — ${caught}/${MUTATIONS.length} caught`);
if (missed.length) {
  console.log("Uncaught:");
  for (const m of missed) console.log(`  · ${m}`);
  process.exit(1);
}
