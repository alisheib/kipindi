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

/** `sides` = how many sides of the round held money: 2 paid a winner, 1 refunded one side,
 *  0 had no players at all. Defaults to 2 so the void-reason checks below read unchanged. */
const r = (outcome: StatRound["outcome"], voidReason: string | null = null, sides: 0 | 1 | 2 = 2): StatRound =>
  ({ outcome, voidReason, sides });

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

// ── §6 · 🔴 E-90 · "PAID A WINNER" MUST MEAN A WINNER WAS PAID ─────────────
//
// Driven on production 2026-08-05: a fresh BTC 5m chain, two resolved rounds. Round #1
// decided DOWN with one player on one side — every stake refunded, no winner, no fee.
// Round #2 decided DOWN with both sides held — echo was paid TZS 870. The column headed
// "PAID A WINNER · 7d", which the operator guide's §14.7 calls *"the single most useful
// number on the page"*, read `100% 2/2 paid`.
//
// ⛔ `decisive` answers "did the round DECIDE", and the console labels it "paid". Those are
// the same question only when both sides hold money — and the one-sided case is precisely
// the one the platform is deciding whether to seed a house float against. A metric that
// hides the problem it exists to expose is worse than none.
const oneSided = summariseRounds([
  r("DOWN", null, 1),      // decided, nobody on the other side → refunded, nobody paid
  r("DOWN"),               // decided, both sides held → a winner was paid
]);
ok("§6 ⭐ a decided round that paid NOBODY is counted as unmatched", oneSided.unmatched === 1,
  `got ${oneSided.unmatched} — production round udr_887060cb9dcecc9eead1`);
ok("§6 ⭐ `paid` excludes it — one of these two rounds paid a winner", oneSided.paid === 1,
  `got ${oneSided.paid}, decisive ${oneSided.decisive}`);
ok("§6 ⭐ paidRate is 50%, not 100%", Math.abs(oneSided.paidRate! - 0.5) < 1e-9,
  `got ${oneSided.paidRate} — the live cell read 100% 2/2 paid`);
ok("§6 `decisive` still counts both — the round DID decide, and the proof panel says so",
  oneSided.decisive === 2, `got ${oneSided.decisive}`);
ok("§6 the buckets still account for every resolved round",
  oneSided.paid + oneSided.unmatched + oneSided.noMove + oneSided.sourceFailed
  + oneSided.sourceMismatch + oneSided.operator + oneSided.unknownVoid === oneSided.resolved);
// ⛔ AND UNMATCHED IS NOT A FEED FAILURE AND NOT A MARGIN SIGNAL. It is a liquidity fact, and
// folding it into either is the E-58 misdiagnosis with a new label.
ok("§6 ⛔ an unmatched round is NOT a feed failure", oneSided.feedFailRate === 0, `got ${oneSided.feedFailRate}`);
ok("§6 ⛔ an unmatched round is NOT a no-move", oneSided.noMove === 0, `got ${oneSided.noMove}`);
// A chain whose rounds all decide but never find a counterparty is NOT healthy — it earns
// nothing, and before this it read "ok" at 100%.
const allThin = summariseRounds(Array.from({ length: 10 }, () => r("UP", null, 1)));
ok("§6 ⭐ a chain that decides every round but pays nobody is NOT 'ok'",
  chainHealth(allThin) === "low-payout", `got ${chainHealth(allThin)}`);

// ── §6c · 🔴 E-92 · A ROUND NOBODY BET ON IS NOT A ONE-SIDED ROUND ─────────
//
// Caught by driving E-90's own fix on production ten minutes after shipping it. The chain
// ran through a quiet stretch: rounds #3–#6 took NO bets at all, and the cell reported
// `17% 1/6 paid · 5 unmatched`. But `unmatched` is a word with a meaning — the player's own
// card says *"Nobody backed the other side, so there was nothing to win and nothing to
// lose"* — and it is FALSE about a round with no players. Only ONE of those five had a
// refunded stake in it. An operator reading "5 unmatched" would go looking for liquidity on
// four rounds where the honest answer is "nobody was here".
//
// ⛔ THE THREE CASES ARE THREE CASES: money on both sides, money on one, money on neither.
const quiet = summariseRounds([
  r("DOWN"),            // both sides → paid a winner
  r("DOWN", null, 1),   // one side → someone was refunded
  r("UP", null, 0),     // nobody bet at all
  r("UP", null, 0),
]);
ok("§6c ⭐ a round with no players is NOT counted as unmatched", quiet.unmatched === 1,
  `got ${quiet.unmatched} — "unmatched" claims a stake came back for want of a counterparty`);
ok("§6c ⭐ it has its own bucket, so the operator can tell 'no audience' from 'thin side'",
  quiet.noBets === 2, `got ${quiet.noBets}`);
ok("§6c a round nobody bet on did not pay a winner either", quiet.paid === 1, `got ${quiet.paid}`);
ok("§6c the three buckets still account for every DECIDED round",
  quiet.paid + quiet.unmatched + quiet.noBets === quiet.decisive);
ok("§6c ⛔ and `no bets` reaches the operator's screen, in those words",
  /no bets/.test(page), "an operator told '5 unmatched' about 4 empty rounds goes hunting for a problem that is not there");

// §6b · THE CALL SITE — the page must render the paid figure and surface the bucket.
ok("§6b the console renders the PAID count, not the decisive one",
  /s\.paid\}\/\{s\.resolved\}/.test(page) || /\{s\.paid\}/.test(page),
  "labelling `decisive` as 'paid' is the defect itself");
ok("§6b ⭐ the unmatched bucket reaches the operator's screen",
  /unmatched/.test(page),
  "splitting the tally and not rendering it is a write-only fix (see §4)");
ok("§6b the page reads each round's pools to know whether a side was empty",
  /poolsByIds|yesPool/.test(page),
  "without the pools the page cannot tell a paid round from a one-sided one");

// ── §5 · the DAL filter the window depends on ──────────────────────────────
const dal = read("../src/lib/server/updown-dal.ts");
ok("§5 `boundaryFrom` filters the Prisma query", /boundaryAt:\s*\{\s*gte:/.test(dal));
ok("§5 `boundaryFrom` filters the in-memory mirror too",
  /opts\?\.boundaryFrom && Date\.parse\(r\.boundaryAt\)/.test(dal),
  "one predicate behind list and count, or the pager disagrees with its own rows (G-1)");

console.log(`\nUP & DOWN CHAIN STATS — ${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  ✗ ${f}`); process.exit(1); }
