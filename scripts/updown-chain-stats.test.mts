/**
 * E-58's ROOT CAUSE · THE CHAIN HEALTH NUMBERS THE CONSOLE SHOWS AN OPERATOR.
 *
 *   npx tsx scripts/updown-chain-stats.test.mts     (npm run test:updown-chain-stats)
 *
 * `/admin/updown` computed `voids / resolved` inline and **discarded `voidReason`**. Three
 * situations that need opposite responses therefore rendered as one identical amber number:
 *
 *   `source-failed`  our bug — SOL is 290 of 290 on production, it has never paid anybody
 *   `no-move`        the margin doing exactly what it is set to do
 *   `operator`       a human — 1,154 of XAU's voids are one July remediation
 *
 * Session 19 filed E-58 as "four chains void every round they run", argued it as a money
 * decision for the owner, and withdrew it a session later once the *reasons* were read. The
 * console is what made that mistake available: it showed the rate without the reason.
 *
 * ⛔ THIS SUITE ASSERTS THE ARITHMETIC AN OPERATOR PRICES A CHAIN FROM, and it asserts the
 * CALL SITE — that the page passes a TIME window and consumes the shared reducer — because a
 * correct helper nobody calls is exactly how E-4 and E-56 shipped.
 */
import { summariseRounds, chainHealth, EMPTY_CHAIN_STATS, type StatRound } from "../src/lib/server/updown-chain-stats";
import { readFileSync } from "node:fs";

let pass = 0; const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => { if (c) pass++; else fails.push(`${n}${d ? ` — ${d}` : ""}`); };
const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

const r = (outcome: StatRound["outcome"], voidReason: string | null = null): StatRound => ({ outcome, voidReason });

// ── §1 · every reason is counted SEPARATELY ────────────────────────────────
// The production shape: a chain whose voids are a mix. If any two reasons share a bucket
// the operator cannot tell an outage from a pricing choice.
const mixed = [
  r("UP"), r("DOWN"), r("UP"),
  r("VOID", "no-move"), r("VOID", "no-move"),
  r("VOID", "source-failed"),
  r("VOID", "operator"), r("VOID", "operator"), r("VOID", "operator"),
  r("VOID", "source-mismatch"),
  r(null), // still pending — not evidence about anything
];
const s = summariseRounds(mixed);
ok("§1 pending rounds are excluded from `resolved`", s.resolved === 10, `got ${s.resolved}`);
ok("§1 decisive counts UP and DOWN only", s.decisive === 3, `got ${s.decisive}`);
ok("§1 no-move is its own bucket", s.noMove === 2, `got ${s.noMove}`);
ok("§1 source-failed is its own bucket", s.sourceFailed === 1, `got ${s.sourceFailed}`);
ok("§1 operator is its own bucket", s.operator === 3, `got ${s.operator}`);
ok("§1 source-mismatch is its own bucket", s.sourceMismatch === 1, `got ${s.sourceMismatch}`);
ok("§1 the buckets account for every resolved round",
  s.decisive + s.noMove + s.sourceFailed + s.operator + s.sourceMismatch + s.unknownVoid === s.resolved,
  "a round that falls through every branch would vanish from the operator's view");

// §1b · an UNRECOGNISED reason must surface, not be folded into no-move.
// A silent bucket is how a newly-added reason goes unnoticed for a month (E-1's shape:
// a dead key is indistinguishable from a live one).
const odd = summariseRounds([r("VOID", "something-new"), r("VOID", null), r("UP")]);
ok("§1b an unknown void reason is surfaced as `unknownVoid`", odd.unknownVoid === 2, `got ${odd.unknownVoid}`);
ok("§1b an unknown reason is NOT silently counted as no-move", odd.noMove === 0, `got ${odd.noMove}`);

// ── §2 · the two rates, and what each one must EXCLUDE ─────────────────────
ok("§2 decisiveRate = decisive / resolved", Math.abs(s.decisiveRate! - 0.3) < 1e-9, `got ${s.decisiveRate}`);
ok("§2 feedFailRate counts source-failed AND source-mismatch",
  Math.abs(s.feedFailRate! - 0.2) < 1e-9, `got ${s.feedFailRate}`);
// ⛔ The whole point of E-58: an operator's bulk void is NOT a feed failure and NOT a margin
// signal. If either rate absorbs it, the console is lying in the same way it lied before.
const opOnly = summariseRounds([r("UP"), ...Array.from({ length: 9 }, () => r("VOID", "operator"))]);
ok("§2 ⛔ operator voids do NOT count as a feed failure", opOnly.feedFailRate === 0,
  `got ${opOnly.feedFailRate} — a July remediation would read as an outage`);
ok("§2 ⛔ operator voids do NOT count as no-move", opOnly.noMove === 0,
  "counting a bulk refund as a margin signal is exactly the E-58 misdiagnosis");
// ...and a wide margin must NOT read as a broken feed, the mirror of the same error.
const marginOnly = summariseRounds([r("UP"), ...Array.from({ length: 9 }, () => r("VOID", "no-move"))]);
ok("§2 ⛔ no-move voids do NOT count as a feed failure", marginOnly.feedFailRate === 0,
  `got ${marginOnly.feedFailRate} — a wide band would read as an outage`);

// §2b · nothing to divide by
const empty = summariseRounds([r(null), r(null)]);
ok("§2b no resolved rounds → null rates, never 0%", empty.decisiveRate === null && empty.feedFailRate === null,
  "0% and 'no data' mean opposite things to an operator (A-5: never state what nothing computed)");
ok("§2b the empty constant agrees with the function", JSON.stringify(summariseRounds([])) === JSON.stringify(EMPTY_CHAIN_STATS));

// ── §3 · the health verdict — a FEED failure outranks a low pay rate ───────
// SOL on production: 290 resolved, 0 decisive, all source-failed.
const sol = summariseRounds(Array.from({ length: 290 }, () => r("VOID", "source-failed")));
ok("§3 SOL's real shape is reported as a FEED failure, not a pricing one",
  chainHealth(sol) === "feed-failing", `got ${chainHealth(sol)}`);
// A chain paying 30% because the band is wide is a pricing conversation, not an outage.
const wide = summariseRounds([...Array.from({ length: 3 }, () => r("UP")), ...Array.from({ length: 7 }, () => r("VOID", "no-move"))]);
ok("§3 a wide band is 'low-payout', NOT 'feed-failing'", chainHealth(wide) === "low-payout", `got ${chainHealth(wide)}`);
// ⛔ The ordering itself: a chain that is BOTH must report the outage.
const both = summariseRounds([r("UP"), r("VOID", "no-move"), r("VOID", "source-failed")]);
ok("§3 ⛔ when a chain is both feed-failing AND low-paying, the OUTAGE wins",
  chainHealth(both) === "feed-failing", `got ${chainHealth(both)} — an outage must never be shown as a pricing choice`);
ok("§3 a healthy chain reports ok",
  chainHealth(summariseRounds(Array.from({ length: 10 }, () => r("UP")))) === "ok");
ok("§3 no rounds reports 'none', not 'ok'", chainHealth(EMPTY_CHAIN_STATS) === "none",
  "an unrun chain is not a healthy chain");

// ── §4 · THE CALL SITE — a correct reducer nobody calls is the E-4/E-56 shape ──
const page = read("../src/app/admin/updown/page.tsx");
ok("§4 the console consumes the shared reducer", /summariseRounds\(/.test(page),
  "a second inline copy of this rule is how the cell and the sort came to disagree (E-49)");
ok("§4 the console consumes the shared health verdict", /chainHealth\(/.test(page));
// ⚠️ ANCHOR ON CODE, NOT PROSE. The first version of this assertion matched the words
// `voids / resolved` — which the page's own comment explaining the fix now contains, so a
// correct file failed. Same trap the tracker hygiene guards hit twice: never locate code by
// a phrase its own documentation will one day quote. `const voids =` is a statement; a
// comment can mention it but cannot be it.
ok("§4 ⛔ the console no longer computes a blended void rate inline",
  !/const\s+voids\s*=/.test(page),
  "the inline reducer is what discarded voidReason in the first place");
ok("§4 ⛔ the window is TIME-based — `boundaryFrom` is passed to the round query",
  /boundaryFrom:\s*statsFrom/.test(page),
  "a count window makes a busy chain and a stopped chain incomparable, which is how E-58 was argued");
ok("§4 the reason breakdown reaches the operator's screen",
  /source-failed/.test(page) && /no-move/.test(page) && /operator/.test(page),
  "splitting the tally and then not rendering it is a write-only fix");

// ── §5 · the DAL filter the window depends on ──────────────────────────────
const dal = read("../src/lib/server/updown-dal.ts");
ok("§5 `boundaryFrom` filters the Prisma query", /boundaryAt:\s*\{\s*gte:/.test(dal));
ok("§5 `boundaryFrom` filters the in-memory mirror too",
  /opts\?\.boundaryFrom && Date\.parse\(r\.boundaryAt\)/.test(dal),
  "one predicate behind list and count, or the pager disagrees with its own rows (G-1)");

console.log(`\nUP & DOWN CHAIN STATS — ${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  ✗ ${f}`); process.exit(1); }
