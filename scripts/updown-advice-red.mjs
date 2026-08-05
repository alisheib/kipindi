/**
 * RED harness for `npm run test:updown-advice`.
 *
 *   node scripts/updown-advice-red.mjs
 *
 * ⛔ THE ONE THAT MATTERS IS `staleness-window-as-the-deadline`. That is not a hypothetical
 * mutation — it is **the code as it was written and pushed** in `286676d6`, and it scores
 * Bitcoin ③ *"more than half its rounds cannot be priced in time"* off a production record of
 * 198 usable readings out of 204. The suite that shipped with it was 22 green checks, because
 * the checks were written from the same wrong model. This harness exists so that cannot recur
 * silently: revert the fix and §6 goes red.
 *
 * Rules obeyed: anchors re-expressed in the target file's line endings; results read from the
 * suite's OWN summary line; MISS unless the run exits non-zero AND names a failure.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const ADVICE = new URL("../src/lib/server/updown-feed-advice.ts", import.meta.url);

const MUTATIONS = [
  {
    // ⛔ E-84 ITSELF, restored. `maxStalenessSeconds` judges `sourceQuotedAt − boundaryAt`
    // (0.00s on all 198 confirmed BTC readings); this module measures `confirmedAt −
    // boundaryAt` (132s). Judging one by the other's limit condemns a healthy asset.
    name: "staleness-window-as-the-deadline — Bitcoin scored ③ off a 97.1% record",
    from: `  if (h.medianLagSeconds >= abandonAfterSeconds) {`,
    to: `  if (h.medianLagSeconds >= 90) {`,
  },
  {
    name: "unmeasured-guard-removed — two readings summarised as a confident median",
    from: `  if (h.readings < MIN_SAMPLES_FOR_ADVICE || h.medianLagSeconds == null || h.maxLagSeconds == null) {`,
    to: `  if (h.readings < 0 || h.medianLagSeconds == null || h.maxLagSeconds == null) {`,
  },
  {
    // Ali's instruction is that a risky pairing is BLOCKED, not advised. Demote the block to a
    // caution and the dropdown offers a round with no betting time in it.
    name: "block-demoted-to-advice — a round with no betting time is merely warned about",
    from: `    if (left < MIN_BETTING_SECONDS) {
      level = 3;`,
    to: `    if (left < MIN_BETTING_SECONDS) {
      level = level === 3 ? 3 : 2;`,
  },
  {
    // The result phase does NOT extend the window a late reading eats into — the two cancel.
    // Adding it back is the most plausible wrong answer, and it flatters every asset by 60s.
    name: "result-phase-added-back — the betting window is overstated by the result phase",
    from: `  return Math.round(durationMinutes * 60 - lagSeconds);`,
    to: `  return Math.round((durationMinutes + 1) * 60 - lagSeconds);`,
  },
  {
    name: "half-window-rule-dropped — a duration that loses most of its window is advised",
    from: `    if (left >= MIN_BETTING_SECONDS && left >= d * 60 * BETTING_WINDOW_CAUTION_FRACTION) return d;`,
    to: `    if (left >= MIN_BETTING_SECONDS) return d;`,
  },
  {
    name: "money-consequence-dropped — a flaky asset is refused with a bare percentage",
    from: `      \`\${h.assetKey} has produced a usable price in only \${okPct.toFixed(0)}% of \` +
      \`\${h.readings} readings here. Rounds on it will refund often, and a refunded round earns \` +
      \`nothing — it is not offered until that improves.\`,`,
    to: `      \`\${h.assetKey} has produced a usable price in only \${okPct.toFixed(0)}% of \` +
      \`\${h.readings} readings here.\`,`,
  },
  {
    name: "sample-size-hidden — an advisory that cannot be weighed",
    from: `    parts.push(\`\${h.assetKey} reads successfully \${okPct.toFixed(0)}% of the time here (\${h.readings} readings).\`);`,
    to: `    parts.push(\`\${h.assetKey} reads successfully \${okPct.toFixed(0)}% of the time here.\`);`,
  },
];

let caught = 0;
const missed = [];
const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const toFileEol = (text, contents) => (contents.includes("\r\n") ? text.replace(/\n/g, "\r\n") : text);

for (const m of MUTATIONS) {
  const original = readFileSync(ADVICE, "utf8");
  const from = toFileEol(m.from, original);
  const to = toFileEol(m.to, original);
  if (!original.includes(from)) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND — the harness is broken, not the guard.`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  writeFileSync(ADVICE, original.replace(from, to));
  try {
    if (readFileSync(ADVICE, "utf8") === original) throw new Error("mutation did not land on disk");
    let exitCode = 0, out = "";
    try {
      out = execSync("npx tsx scripts/updown-feed-advice.test.mts", { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      exitCode = e.status ?? 1;
      out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    }
    // The suite's OWN summary line — never the bare words "N failed", which appear in its output.
    const failed = Number(/updown-feed-advice: \d+ passed, (\d+) failed/.exec(out)?.[1] ?? 0);
    if (exitCode !== 0 && failed > 0) {
      caught++;
      console.log(`  ✓ RED  ${m.name}\n         → ${failed} failed · ${(/FAIL (.+)/.exec(out)?.[1] ?? "").slice(0, 88)}`);
    } else {
      missed.push(m.name);
      console.log(`  ✗ MISS ${m.name}\n         → exit ${exitCode}, ${failed} failed — the guard did NOT catch this`);
    }
  } finally {
    writeFileSync(ADVICE, original);
  }
}

console.log(`\nRED HARNESS — ${caught}/${MUTATIONS.length} caught`);
if (missed.length) { for (const m of missed) console.log(`  · ${m}`); process.exit(1); }
