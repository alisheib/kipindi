/**
 * RED harness for `npm run test:updown-window`.
 *
 *   node scripts/updown-window-red.mjs
 *
 * ⛔ MUTATION 1 IS THE IMPORTANT ONE: it restores `selectionClosedAt: null`, character for
 * character — the line that shipped, and that let a player stake on a round whose outcome was
 * already visible. A guard for E-72 is worth nothing unless it rejects that exact code.
 *
 * Rules obeyed (each learned the hard way in this campaign):
 *  1. Anchors are re-expressed in the TARGET FILE'S line endings — the repo is mixed CRLF/LF
 *     and a multi-line `\n` anchor silently misses half of it (paid for five times now).
 *  2. Result is read from the suite's OWN summary line, never the bare words `N failed` —
 *     other output contains those, and matching them scored a working guard as 0/7.
 *  3. Non-zero exit AND a named failure, or it is a MISS.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const SERVICE = new URL("../src/lib/server/updown-service.ts", import.meta.url);
const DURATIONS = new URL("../src/lib/updown-durations.ts", import.meta.url);
const BOARD = new URL("../src/lib/server/updown-board.ts", import.meta.url);
const MARKET = new URL("../src/lib/server/market-service.ts", import.meta.url);

const MUTATIONS = [
  {
    name: "selectionClosedAt-null — the shipped E-72 line, restored verbatim",
    file: SERVICE,
    from: `    selectionClosedAt: selectionClosesAt(closeIso, chain.durationMinutes),`,
    to: `    selectionClosedAt: null,`,
  },
  {
    // The obvious "simplification": a flat 30s. Passes a 3-minute round and leaves a
    // 15-minute one 97% exposed, which is the entire reason the lead is a proportion.
    name: "fixed-30s-lead — a long round is left almost entirely exposed",
    file: DURATIONS,
    from: `  return Math.min(total, Math.max(minSeconds, Math.round(total * fraction)));`,
    to: `  return Math.min(total, minSeconds);`,
  },
  {
    // The lead swallows the round: born locked, takes no bets, reads as an outage.
    name: "lead-longer-than-the-round — a round is locked before it opens",
    file: DURATIONS,
    from: `  return at > openMs ? new Date(at).toISOString() : null;`,
    to: `  return new Date(at).toISOString();`,
  },
  {
    // The card stops distinguishing locked from open, so the buttons stay live over a
    // round the server will refuse — the screen and the money path disagreeing.
    name: "no-locked-state — the board never reports LOCKED",
    file: BOARD,
    from: `  if (selectionClosedAt && Date.parse(selectionClosedAt) <= now) return "locked";`,
    to: `  if (false) return "locked";`,
  },
  {
    // A legacy round with no lock instant rendered as locked — the card inventing a lock
    // the server does not enforce, which reads as the app refusing a legal bet.
    name: "legacy-round-shown-locked — the card invents a lock the server will not enforce",
    file: BOARD,
    from: `  if (selectionClosedAt && Date.parse(selectionClosedAt) <= now) return "locked";`,
    to: `  if (!selectionClosedAt || Date.parse(selectionClosedAt) <= now) return "locked";`,
  },
  {
    name: "hedge-allowed — one account holds both sides again",
    file: MARKET,
    from: `    const opposite = mine.find((p) => p.status === "OPEN" && p.side !== opts.side);`,
    to: `    const opposite = undefined;`,
  },
  {
    // The over-correction: blocking a TOP-UP on the same side. That is not a hedge, and a
    // rule that stops a player backing their own view harder was never decided.
    name: "same-side-blocked — topping up your own side is refused",
    file: MARKET,
    from: `    const opposite = mine.find((p) => p.status === "OPEN" && p.side !== opts.side);`,
    to: `    const opposite = mine.find((p) => p.status === "OPEN");`,
  },
];

let caught = 0;
const missed = [];
const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const toFileEol = (text, contents) => (contents.includes("\r\n") ? text.replace(/\n/g, "\r\n") : text);

for (const m of MUTATIONS) {
  const original = readFileSync(m.file, "utf8");
  const from = toFileEol(m.from, original);
  const to = toFileEol(m.to, original);
  if (!original.includes(from)) {
    console.log(`  ✗ ${m.name}\n      ⛔ ANCHOR NOT FOUND — the harness is broken, not the guard.`);
    missed.push(`${m.name} (anchor missing)`);
    continue;
  }
  writeFileSync(m.file, original.replace(from, to));
  try {
    if (readFileSync(m.file, "utf8") === original) throw new Error("mutation did not land on disk");
    let exitCode = 0, out = "";
    try {
      out = execSync("npx tsx scripts/updown-window.test.mts", { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      exitCode = e.status ?? 1;
      out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    }
    const failed = Number(/updown-window: \d+ passed, (\d+) failed/.exec(out)?.[1] ?? 0);
    if (exitCode !== 0 && failed > 0) {
      caught++;
      console.log(`  ✓ RED  ${m.name}\n         → ${failed} failed · ${(/FAIL (.+)/.exec(out)?.[1] ?? "").slice(0, 88)}`);
    } else {
      missed.push(m.name);
      console.log(`  ✗ MISS ${m.name}\n         → exit ${exitCode}, ${failed} failed — the guard did NOT catch this`);
    }
  } finally {
    writeFileSync(m.file, original);
  }
}

console.log(`\nRED HARNESS — ${caught}/${MUTATIONS.length} caught`);
if (missed.length) { for (const m of missed) console.log(`  · ${m}`); process.exit(1); }
