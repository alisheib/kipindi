/**
 * RED harness for `npm run test:updown-margin`.
 *
 *   node scripts/updown-margin-red.mjs
 *
 * ⛔ MUTATIONS 3 AND 4 ARE THE IMPORTANT ONES: they restore `minMoveTicks: 1` — E-73's live
 * production configuration, on which all 1,291 gold rounds settled. A guard is worth nothing
 * unless it rejects the exact configuration that shipped.
 *
 * Rules obeyed: anchors re-expressed in the target file's line endings (mixed CRLF/LF repo);
 * the result read from the suite's OWN summary line, never the bare words `N failed`; and a
 * MISS unless the run exits non-zero AND names a failure.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const CONFIG = new URL("../src/lib/server/updown-config.ts", import.meta.url);

const MUTATIONS = [
  {
    name: "margin-back-to-a-band — the retired ladder re-prices every round",
    from: `  defaultMarginBps: 0,`,
    to: `  defaultMarginBps: 2,`,
  },
  {
    name: "ladder-rung-survives — one duration is silently re-priced behind our back",
    from: `  marginSchedule: [],`,
    to: `  marginSchedule: [{ category: "*", maxDurationMinutes: 5, bps: 2 }],`,
  },
  {
    name: "floor-back-to-one-tick — E-73's live configuration, restored",
    from: `export const MIN_MOVE_TICKS_FLOOR = 2;`,
    to: `export const MIN_MOVE_TICKS_FLOOR = 1;`,
  },
  {
    // The door nobody was watching: the validator refuses an explicit 1, but the row default
    // wrote one anyway. §3.5 caught this for real during development.
    name: "create-default-back-to-1 — an asset made without the field lands on the forbidden value",
    from: `    minMoveTicks: input.minMoveTicks ?? MIN_MOVE_TICKS_FLOOR,`,
    to: `    minMoveTicks: input.minMoveTicks ?? 1,`,
  },
  {
    // Removing the tick floor entirely: at 0 bps the band becomes ZERO, so any close that is
    // not bit-identical to the open decides the round — including one decided by rounding.
    name: "no-tick-floor — a 0 bps margin becomes a ZERO band",
    from: `  const margin = Math.max(Number(raw.toFixed(asset.decimals)), tick);`,
    to: `  const margin = Number(raw.toFixed(asset.decimals));`,
  },
  {
    // The recommendation ignores the feed's own disagreement, so gold is advised a band
    // smaller than the noise it is measured against.
    name: "recommendation-ignores-feed-noise — gold is advised a band its own feed cannot resolve",
    from: `  const needAbs = Math.max(roundingAbs, noiseAbs) * 2;`,
    to: `  const needAbs = roundingAbs * 2;`,
  },
  {
    name: "per-chain-override-lost — an operator can no longer widen one chain",
    from: `  return chain.marginBps
    ?? resolveScheduledMarginBps(cfg, asset.category, chain.durationMinutes)
    ?? cfg.defaultMarginBps;`,
    to: `  return resolveScheduledMarginBps(cfg, asset.category, chain.durationMinutes)
    ?? cfg.defaultMarginBps;`,
  },
];

let caught = 0;
const missed = [];
const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const toFileEol = (text, contents) => (contents.includes("\r\n") ? text.replace(/\n/g, "\r\n") : text);

for (const m of MUTATIONS) {
  const original = readFileSync(CONFIG, "utf8");
  const from = toFileEol(m.from, original);
  const to = toFileEol(m.to, original);
  if (!original.includes(from)) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND — the harness is broken, not the guard.`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  writeFileSync(CONFIG, original.replace(from, to));
  try {
    if (readFileSync(CONFIG, "utf8") === original) throw new Error("mutation did not land on disk");
    let exitCode = 0, out = "";
    try {
      out = execSync("npx tsx scripts/updown-margin.test.mts", { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      exitCode = e.status ?? 1;
      out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    }
    const failed = Number(/updown-margin: \d+ passed, (\d+) failed/.exec(out)?.[1] ?? 0);
    if (exitCode !== 0 && failed > 0) {
      caught++;
      console.log(`  ✓ RED  ${m.name}\n         → ${failed} failed · ${(/FAIL (.+)/.exec(out)?.[1] ?? "").slice(0, 86)}`);
    } else {
      missed.push(m.name);
      console.log(`  ✗ MISS ${m.name}\n         → exit ${exitCode}, ${failed} failed — the guard did NOT catch this`);
    }
  } finally {
    writeFileSync(CONFIG, original);
  }
}

console.log(`\nRED HARNESS — ${caught}/${MUTATIONS.length} caught`);
if (missed.length) { for (const m of missed) console.log(`  · ${m}`); process.exit(1); }
