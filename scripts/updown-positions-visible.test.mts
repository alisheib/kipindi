/**
 * EVERY UP & DOWN POSITION IS VISIBLE — the guard for Ali's 2026-08-15 instruction,
 * *"make it show, no matter how much position I have, perfectly."*
 *
 * Two surfaces compressed a player's positions and both are fixed:
 *
 *   1. `/updown/history` rendered `g.bets.slice(0, 2)` per round card and collapsed the
 *      rest into a bare `+N` chip that was not a control — six positions read as two
 *      chips and the number four, with nowhere to go for the rest.
 *   2. `/updown/[roundId]` rendered `myPosition`, which `myPositionFor` AGGREGATED into
 *      one side / one stake / one payout. A player holding six positions saw one line,
 *      and a HEDGED player was shown whichever leg was larger — `up >= down` is a
 *      tie-break, not a fact about their bet.
 *
 * And a third, found while fixing them: `myPositionFor` read the player's 500 most recent
 * Up & Down positions and only THEN filtered to this market. The cap is applied by the
 * store, before the filter — so a player past 500 positions opening an older round got an
 * empty list and the page said they had no position on a round they had played.
 *
 * ⛔ WHAT THIS FILE MAY AND MAY NOT CLAIM. These are SOURCE assertions, so each one is
 * written to fail on the real pre-fix text — `scripts/updown-positions-visible-red.mjs`
 * restores that text verbatim and requires this suite to go red. A check that would pass
 * with the feature absent is worth nothing here, so every "the cap is gone" assertion is
 * paired with a positive control proving the file was actually read and understood.
 */
import { readFileSync } from "node:fs";
import { decomment as stripComments } from "./lib/decomment.mts";

let pass = 0;
const fails: string[] = [];
function ok(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(name + (detail ? ` — ${detail}` : "")); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
}

const HISTORY = "src/app/updown/history/page.tsx";
const ROUND = "src/app/updown/[roundId]/page.tsx";
const BOARD = "src/lib/server/updown-board.ts";
const DICT = "src/lib/i18n-dict.ts";

/**
 * ⛔ ASSERT ON CODE, NOT ON PROSE. The first run of this suite failed on a CORRECT file:
 * the comment above the fixed chip row quotes the defect it replaced (`g.bets.slice(0, 2)`),
 * and the absence check matched the explanation instead of the code. That is the §5b
 * instrument failure in miniature — a check that fails when the product is fine — and the
 * fix is to read what actually executes. Every source-shape assertion below runs against
 * the comment-stripped text; the i18n key counts run against the raw file, where comments
 * cannot produce a `key:` pair.
 *
 * ⚠️ The `(?<!:)` guard keeps `https://` intact, which would otherwise swallow the rest of
 * any line carrying a URL.
 */

const history = stripComments(readFileSync(HISTORY, "utf8"));
const round = stripComments(readFileSync(ROUND, "utf8"));
const board = stripComments(readFileSync(BOARD, "utf8"));
const dict = readFileSync(DICT, "utf8");

console.log("\n── 1 · the history card renders EVERY bet ─────────────────────────\n");

// Positive control FIRST: if this fails, the file moved and every absence check below
// is vacuous. This is the §5b lesson — an absence assertion on a file you did not read
// is not evidence.
ok("1.0 positive control · the chip row exists and is keyed per position",
  /g\.bets\.map\(\(b\)\s*=>/.test(history) && /key=\{b\.positionId\}/.test(history),
  "the per-bet chip row was not found at all");

ok("1.1 the two-chip cap is gone",
  !/g\.bets\.slice\(/.test(history),
  "g.bets.slice( still present — the card still truncates");

ok("1.2 no `+N` overflow chip remains",
  !/\+\{extra\}/.test(history) && !/const extra\s*=/.test(history),
  "the +N overflow chip is still rendered");

ok("1.3 the chip row maps the FULL bet list",
  /\{g\.bets\.map\(\(b\)\s*=>\s*\(/.test(history),
  "the row does not map g.bets directly");

// ⛔ A scroll box or a max-height would be the same defect wearing a different mechanism:
// the positions would render and still not be visible. Assert the row is a plain wrap.
ok("1.4 the row is not re-clipped by a scroll container or a max-height",
  !/flex flex-wrap[^"]*max-h-/.test(history) && !/flex flex-wrap[^"]*overflow-(y|auto|hidden)/.test(history),
  "the chip row is clipped by its own container");

console.log("\n── 2 · the 400-row read cap is STATED, not silent ─────────────────\n");

ok("2.0 positive control · the page names its own limit once",
  /const UD_HISTORY_LIMIT\s*=\s*\d+/.test(history),
  "UD_HISTORY_LIMIT is not defined");

ok("2.1 the limit constant is what the query uses (not a second literal)",
  /getMyUpDownHistory\(session\.userId,\s*UD_HISTORY_LIMIT\)/.test(history),
  "the query passes a bare number instead of the named limit");

ok("2.2 the page computes whether the cap bit",
  /const capped\s*=\s*allRows\.length\s*>=\s*UD_HISTORY_LIMIT/.test(history),
  "nothing detects the truncation");

ok("2.3 …and renders the notice when it did",
  /\{capped\s*&&\s*\(/.test(history) && /udHistoryCapped/.test(history),
  "the truncation is detected but never shown");

console.log("\n── 3 · the round panel itemises, and the aggregate survives ───────\n");

ok("3.0 positive control · the result panel still renders the aggregate payout",
  /myPosition\.payout\s*\?\?\s*0/.test(round),
  "the aggregate payout figure is gone — settlement's own number must stay");

ok("3.1 every position is rendered",
  /myPosition\.items\.map\(\(p\)\s*=>/.test(round),
  "the panel does not map items");

// 🔴 3.1 ALONE IS NOT A GATE, and the RED proof is what proved it. Replacing the render
// condition with `{false && (` leaves the `.map` in the source, so 3.1 stayed green over a
// panel that rendered nothing. That is E-65 exactly — as this very page's comment puts it,
// the guard "asserted the branch EXISTED; it did not assert it was REACHABLE, and those
// are different claims." Reachability is now asserted directly.
ok("3.1a …under a predicate on the player's OWN data, not a constant",
  /myPosition\.items\.length\s*>\s*1\s*&&/.test(round),
  "the itemised list is not gated on how many positions the viewer holds");

ok("3.1b …and no branch in this file is constant-folded dead",
  !/\{\s*(false|true)\s*&&/.test(round),
  "a `{false &&` / `{true &&` branch exists — dead or unconditional UI");

ok("3.2 a hedged holder is not quoted a single side",
  /myPosition\.hedged/.test(round) && /udBothSides/.test(round),
  "the panel still reports one side for a two-sided bet");

ok("3.3 the itemised list reads STORED status — it derives no result of its own",
  /POSITION_STATUS_LABEL/.test(round)
  && !/p\.payout\s*>\s*p\.stake\s*\?/.test(round),
  "the list infers a result instead of reading what settlement wrote");

console.log("\n── 4 · myPositionFor is scoped to the ROUND, not to a user cap ────\n");

ok("4.0 positive control · myPositionFor still exists and still returns the aggregate",
  /async function myPositionFor\(/.test(board) && /hedged:/.test(board),
  "myPositionFor was not found");

// 🔴 THE DEFECT ITSELF: a global cap applied by the store, then filtered by market.
ok("4.1 it no longer takes the user's most-recent-N and filters by market",
  !/listPositionsForUser\([^)]*\)[^\n]*\.filter\(\(p\)\s*=>\s*p\.marketId === marketId\)/.test(board),
  "still capping across all rounds before filtering to this one");

ok("4.2 it queries by market",
  /listPositionsForMarket\(marketId\)/.test(board),
  "the market-scoped query is not used");

ok("4.3 …and still restricts to the viewer",
  /listPositionsForMarket\(marketId\)[\s\S]{0,120}p\.userId === userId/.test(board),
  "the market query is not filtered to this user — that would leak other players");

ok("4.4 it returns the itemised list",
  /items:\s*MyRoundPosition\[\]/.test(board) && /export type MyRoundPosition/.test(board),
  "items is not part of the contract");

console.log("\n── 5 · the copy exists in all three languages ─────────────────────\n");

for (const key of ["udPositionsOnRound", "udBothSides", "udHistoryCapped", "udPosWon", "udPosLost", "udPosRefunded", "udPosOpen", "udPosCashedOut"]) {
  const n = dict.split(`${key}:`).length - 1;
  ok(`5.x ${key} is defined three times (en · sw · zh)`, n === 3, `found ${n}`);
}

// ⚠️ Parity of the placeholder specifically: `udHistoryCapped` interpolates the limit, and
// a locale that dropped {n} would print a sentence with a hole in it on a money surface.
const capLines = dict.split("\n").filter((l) => l.includes("udHistoryCapped:"));
ok("5.9 every udHistoryCapped translation keeps the {n} placeholder",
  capLines.length === 3 && capLines.every((l) => l.includes("{n}")),
  `lines=${capLines.length}`);

console.log(`\nupdown-positions-visible: ${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.error("  ✗ " + f); process.exit(1); }
console.log("updown-positions-visible: OK — every position renders on both surfaces, the read cap is stated, and a hedge is not flattened to one side");
