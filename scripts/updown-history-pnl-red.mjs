/**
 * RED CONTROL for `test:updown-history-pnl` (D37).
 *
 *   npm run red:updown-history-pnl
 *
 * ⛔ A GUARD NOBODY HAS SEEN FAIL IS NOT A GUARD. Each mutation below is ONE change to PRODUCT
 * code — not to a fixture the guard was built from — and each must turn a NAMED assertion red.
 * M1 and M6 are the defect verbatim as it shipped until 2026-09-24, so the suite is proven
 * against the real thing rather than against a plant.
 *
 * ⛔ IT NEVER TOUCHES GIT. The originals are held in memory and written back in a `finally`, so
 * an interrupted run cannot leave a mutation in the tree and no `git checkout` can eat an
 * uncommitted fix. The run ends by re-asserting every file byte-for-byte.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const PAGE = "src/app/updown/history/page.tsx";
const LIB = "src/lib/updown-history-pnl.ts";

const MUTATIONS = [
  {
    label: "M1 · the defect verbatim — the strip reduces over the PAGE again",
    file: PAGE,
    from: "roundPnl(\n    viewRounds.map(",
    to: "roundPnl(\n    rounds.map(",
    expect: ["§3b", "§3c"],
  },
  {
    label: "M2 · VOID rounds are allowed to score",
    file: LIB,
    from: 'rounds.filter((g) => !g.anyOpen && g.outcome !== "VOID")',
    to: "rounds.filter((g) => !g.anyOpen)",
    expect: ["§2b"],
  },
  {
    label: "M3 · nothing decided reports 0 percent instead of an absence",
    file: LIB,
    from: "winRate: decided > 0 ? Math.round((wins / decided) * 100) : null,",
    to: "winRate: decided > 0 ? Math.round((wins / decided) * 100) : 0,",
    expect: ["§2e"],
  },
  {
    label: "M4 · a break-even round counts as a win",
    file: LIB,
    from: "settled.filter((g) => g.returned > g.stake).length",
    to: "settled.filter((g) => g.returned >= g.stake).length",
    expect: ["§2d"],
  },
  {
    label: "M5 · the Rounds tile goes back to the page count",
    file: PAGE,
    from: 'tabular-nums text-text">{viewRounds.length}',
    to: 'tabular-nums text-text">{rounds.length}',
    expect: ["§3e"],
  },
  {
    label: "M6 · the sub-line that spilled out of its tile, restored",
    file: PAGE,
    from: '<div className="flex flex-wrap items-baseline gap-x-1 text-micro text-text-subtle">\n'
      + '                <span className="amount">{formatTzs(staked)}</span>\n'
      + "                <span>→</span>\n"
      + '                <span className="amount">{formatTzs(returned)}</span>\n'
      + "              </div>",
    to: '<div className="amount text-micro text-text-subtle">{formatTzs(staked)} → {formatTzs(returned)}</div>',
    expect: ["§3g"],
  },
];

/** Read/write preserving the file's own line endings — the page is CRLF, the lib is LF. */
const load = (f) => {
  const raw = readFileSync(f, "utf8");
  return { raw, crlf: raw.includes("\r\n"), body: raw.replace(/\r\n/g, "\n") };
};
const save = (f, body, crlf) => writeFileSync(f, crlf ? body.replace(/\n/g, "\r\n") : body, "utf8");

/** The suite's own FAIL lines. A crash is not a pass — a non-zero exit still yields its output. */
function failingIds() {
  let out = "";
  try {
    out = execFileSync("npx", ["tsx", "scripts/updown-history-pnl.test.mts"], { encoding: "utf8", shell: true });
  } catch (e) {
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
  }
  return (out.match(/^FAIL (§\S+)/gm) ?? []).map((l) => l.replace("FAIL ", ""));
}

const ORIGINALS = new Map();
for (const f of [PAGE, LIB]) ORIGINALS.set(f, load(f));

let caught = 0;
const problems = [];

try {
  // ⛔ THE BASELINE FIRST. If the suite is already red, every "it went red" below is meaningless.
  const before = failingIds();
  if (before.length > 0) {
    problems.push(`the suite is ALREADY RED before any mutation (${before.join(", ")}) — nothing below proves anything`);
  } else {
    console.log("baseline · the suite is green, so a red below is a DELTA\n");
  }

  for (const m of MUTATIONS) {
    const src = ORIGINALS.get(m.file);
    const hits = src.body.split(m.from).length - 1;
    if (hits !== 1) {
      // ⛔ A MUTATION THAT DID NOT LAND IS NOT A PASS. This is the failure mode where a suite
      // scores itself green because its own plant never reached the file.
      problems.push(`${m.label} — anchor matched ${hits}× in ${m.file}; the mutation NEVER LANDED`);
      continue;
    }
    save(m.file, src.body.replace(m.from, () => m.to), src.crlf);
    const got = failingIds();
    const missing = m.expect.filter((id) => !got.some((g) => g.startsWith(id)));
    save(m.file, src.body, src.crlf);

    if (missing.length === 0) {
      caught++;
      console.log(`  CAUGHT  ${m.label}\n          → ${got.join(", ")}`);
    } else {
      problems.push(`${m.label} — expected ${m.expect.join(", ")} to fail; got [${got.join(", ") || "nothing"}]`);
      console.log(`  MISSED  ${m.label}`);
    }
  }
} finally {
  // ⛔ ALWAYS. An interrupted run must not leave a mutation in the working tree.
  for (const [f, src] of ORIGINALS) save(f, src.body, src.crlf);
}

// ⭐ And prove the restore actually restored, rather than trusting that it did.
for (const [f, src] of ORIGINALS) {
  if (readFileSync(f, "utf8") !== src.raw) problems.push(`${f} WAS NOT RESTORED byte-for-byte`);
}

console.log(`\n${caught}/${MUTATIONS.length} mutations caught`);
if (problems.length > 0) {
  console.error("\nRED CONTROL FAILED:");
  for (const p of problems) console.error(`  !! ${p}`);
  process.exit(1);
}
console.log("RED control PASSED — every mutation turned the named assertion red, and the tree is clean.");
