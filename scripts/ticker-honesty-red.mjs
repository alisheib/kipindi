/**
 * red:ticker-honesty — proves `test:ticker-honesty` actually CATCHES the defects it names.
 *
 * A gate phrased as a refusal ("no unsettled row appears") is green on an empty array, on a broken
 * import, and on a feature that has been deleted. The gate itself answers that with a positive
 * control per case; this harness answers the other half: it reintroduces each REAL defect, one at a
 * time, and asserts the gate goes red **on that case's own assertion** rather than on some
 * incidental collapse. Then it restores the file and checks the tree is byte-identical.
 *
 * ⛔ Anchors go through `scripts/red-anchor.mjs`: matched in the FILE's line-ending convention, and
 * refused if they match twice. A `\n` anchor cannot match a CRLF checkout, which once made a
 * harness declare the product unprovable on a normal Windows clone.
 *
 * Run: npm run red:ticker-honesty
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";

const PURE = "src/lib/markets/ticker.ts";
const FEED = "src/lib/server/ticker-feed.ts";
const STATS = "src/lib/server/platform-stats.ts";
const CLIENT = "src/components/layout/live-ticker.tsx";
const DICT = "src/lib/i18n-dict.ts";

/** Each case: the defect that was really shipped (or really possible), and the assertion id the
 *  gate must fail on. `expect` is matched against the gate's own failure lines. */
const CASES = [
  {
    name: "an unsettled row (RESOLVED, still inside its objection window) is announced as settled",
    file: PURE,
    from: `.filter((r) => typeof r.settledAtMs === "number" && Number.isFinite(r.settledAtMs) && r.settledAtMs > 0)`,
    to: `.filter((r) => true)`,
    expect: "1.1",
  },
  {
    name: "a VOID is given the netPool figure (we kept nothing; every stake was refunded)",
    file: PURE,
    from: `        return { id: r.id, kind: "void" as const, title: r.title };`,
    to: `        return { id: r.id, kind: "void" as const, title: r.title, amount: r.amountTzs ?? undefined };`,
    expect: "2.3",
  },
  {
    name: "an unrecorded outcome is inferred from the pools instead of dropped (law 25)",
    file: PURE,
    from: `    .filter((r) => r.outcome === "YES" || r.outcome === "NO" || r.outcome === "VOID")`,
    to: `    .filter((r) => true)`,
    expect: "4.1",
  },
  {
    name: "the strip is ordered by the board's order rather than settledAt DESC",
    file: PURE,
    from: `    .sort((a, b) => (b.settledAtMs! - a.settledAtMs!) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))`,
    to: `    .sort(() => 0)`,
    expect: "5.1",
  },
  {
    name: "a settlement that paid nothing prints a bare TZS 0 (§C2)",
    file: PURE,
    from: `      if (typeof r.amountTzs === "number" && Number.isFinite(r.amountTzs) && r.amountTzs > 0) {`,
    to: `      if (typeof r.amountTzs === "number" && Number.isFinite(r.amountTzs)) {`,
    expect: "7.2",
  },
  {
    name: "the limit slices the input instead of the newest rows",
    file: PURE,
    from: `    .slice(0, Math.max(0, limit))`,
    to: `    .slice(0, limit)`,
    expect: "6.4",
  },
  {
    name: "the feed runs its OWN unbounded resolved-market scan on every page",
    file: FEED,
    from: `  const stats = await getPlatformStats().catch(() => null);`,
    to: `  const { listMarkets } = await import("./market-service");\n  await listMarkets({ status: "RESOLVED" }).catch(() => []);\n  const stats = await getPlatformStats().catch(() => null);`,
    expect: "9.1",
  },
  {
    name: "the market question reaches the strip UNLOCALISED (Chinese connectives, English titles)",
    file: FEED,
    from: `    title: pickLocalized(locale, s.titleEn, s.titleSw, s.titleZh),`,
    to: `    title: s.titleEn,`,
    expect: "9.5",
  },
  {
    name: "the server module hands a VOID a money figure before the pure filter ever sees it",
    file: STATS,
    from: `  if (m.resolvedOutcome !== "YES" && m.resolvedOutcome !== "NO") return null;`,
    to: `  if (m.resolvedOutcome === null) return null;`,
    expect: "9.8",
  },
  {
    name: "the fee is priced from LIVE admin config instead of the poll's frozen snapshot",
    file: STATS,
    from: `  return poolFee(m.yesPool, m.noPool, ratesFor(m), m.resolvedOutcome).netPool;`,
    to: `  return poolFee(m.yesPool, m.noPool, {}, m.resolvedOutcome).netPool;`,
    expect: "9.9",
  },
  {
    name: "TickerEvent is declared a SECOND time in the client (how `timeAgo` survived in both copies)",
    file: CLIENT,
    from: `type Verbs = { settled: string; on: string; voided: string };`,
    to: `export type TickerEvent = { id: string; kind: "settled" | "void"; side?: "YES" | "NO"; title: string; amount?: number; timeAgo: string };\ntype Verbs = { settled: string; on: string; voided: string };`,
    expect: "10.1",
  },
  {
    name: "the client imports the server-reaching module as a VALUE (server graph into a browser chunk)",
    file: CLIENT,
    from: `import type { TickerEvent } from "@/lib/markets/ticker";`,
    to: `import { type TickerEvent } from "@/lib/markets/ticker";`,
    expect: "10.2",
  },
  {
    name: "a copy key that can only render one player's stake comes back into the dict",
    file: DICT,
    from: `      tickerSettled: "settled", tickerOn: "on",`,
    to: `      tickerPredicted: "predicted", tickerSettled: "settled", tickerOn: "on",`,
    expect: "8.2",
  },
];

const runGate = () => {
  try {
    execFileSync("npx", ["tsx", "scripts/ticker-honesty.test.mts"], { encoding: "utf8", stdio: "pipe", shell: process.platform === "win32" });
    return { code: 0, out: "" };
  } catch (e) {
    return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
};

// ⭐ THE PRECONDITION. If the gate is not green on the untouched tree, every "it went red" below
// is meaningless — it was already red. Refuse rather than report.
const base = runGate();
if (base.code !== 0) {
  console.error("REFUSING TO RUN: test:ticker-honesty is already RED on the untouched tree.");
  console.error(base.out.slice(0, 1500));
  process.exit(1);
}
console.log("precondition: gate is GREEN on the untouched tree\n");

const originals = new Map();
for (const f of new Set(CASES.map((c) => c.file))) originals.set(f, readFileSync(f, "utf8"));

let caught = 0;
const problems = [];

for (const [i, c] of CASES.entries()) {
  const original = originals.get(c.file);
  let mutated;
  try {
    mutated = injectDefect(original, c.from, c.to);
  } catch (e) {
    problems.push(`case ${i + 1} (${c.name}): ANCHOR PROBLEM — ${e.message}`);
    console.log(`  ${String(i + 1).padStart(2)}. ANCHOR FAIL  ${c.name}`);
    continue;
  }
  writeFileSync(c.file, mutated, "utf8");
  const r = runGate();
  writeFileSync(c.file, original, "utf8");

  if (r.code === 0) {
    problems.push(`case ${i + 1} (${c.name}): gate stayed GREEN with the defect present`);
    console.log(`  ${String(i + 1).padStart(2)}. NOT CAUGHT   ${c.name}`);
  } else if (!r.out.includes(c.expect)) {
    // Red for the wrong reason is not a proof. This is the check that separates "the gate caught
    // my defect" from "the gate fell over".
    const lines = r.out.split("\n").filter((l) => l.includes("✗")).map((l) => l.trim()).slice(0, 3);
    problems.push(`case ${i + 1} (${c.name}): went red, but NOT on ${c.expect} — got: ${lines.join(" | ") || "(no ✗ lines)"}`);
    console.log(`  ${String(i + 1).padStart(2)}. WRONG REASON ${c.name}  (wanted ${c.expect})`);
  } else {
    caught++;
    console.log(`  ${String(i + 1).padStart(2)}. caught on ${c.expect.padEnd(5)} ${c.name}`);
  }
}

// The tree must be exactly as it was found.
for (const [f, original] of originals) {
  if (readFileSync(f, "utf8") !== original) problems.push(`${f} was NOT restored byte-identically`);
}
let gitClean = true;
try {
  const st = execFileSync("git", ["status", "--porcelain", ...originals.keys()], { encoding: "utf8" }).trim();
  // Files legitimately edited in this working tree will show; what matters is that the harness
  // did not change them, which the byte comparison above already proved. Reported, not asserted.
  if (st) { gitClean = false; console.log(`\nnote: these files have working-tree changes of their own:\n${st}`); }
} catch { /* not a git checkout — the byte comparison stands on its own */ }

const after = runGate();
if (after.code !== 0) problems.push("the gate is RED after restore — the tree was not put back");

console.log(`\n${caught}/${CASES.length} real defects caught, each on its own assertion`);
console.log(`tree restored: ${gitClean ? "clean" : "byte-identical (pre-existing edits present)"} · gate green after restore: ${after.code === 0}`);
if (problems.length) {
  console.error("\nPROBLEMS:");
  problems.forEach((p) => console.error("  ✗ " + p));
  process.exit(1);
}
console.log("RED PROOF COMPLETE");
