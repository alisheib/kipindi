/**
 * D37 · THE MONEY ON /updown/history DESCRIBES THE VIEW, NOT THE PAGE.
 *
 *   npm run test:updown-history-pnl      (RED control: npm run red:updown-history-pnl)
 *
 * 🔴 WHAT THIS GUARDS. The P&L strip reduced over `rounds` — the TWELVE on the current page —
 * while everything around it described the whole filtered view: the bar above counts
 * `matched.length`, the middle tile printed an unpaged bet count under a paged round count
 * ("Rounds 12 · 87 bets"), and the page's own comment claimed the figures "describe the whole
 * filtered view". **Net return and Win rate changed when the player pressed "next".**
 * Ali chose the scope on 2026-09-24: the whole filtered view.
 *
 * ⛔ WHY NOT A LIVE DRIVE. Reaching this screen needs a signed-in account with enough history to
 * page — and to SEE the defect you need two pages whose settled rounds differ, which no
 * production account is guaranteed to have on any given day. A driver would have been green on
 * an account with eleven rounds and said nothing about the code (§0 trap 3). The population
 * here is constructed, so every shape is present on every run.
 *
 * ⛔ AND IT ASSERTS VALUES, NOT SYMBOLS. Every figure below is computed by hand in the comment
 * beside it, and the rules have ANTI-CONSTANT twins — a second input that must produce a
 * DIFFERENT answer — so a hardcoded return cannot pass.
 *
 * No network, no database, no build: one pure function plus a source read.
 */
import { roundPnl, type PnlRound } from "../src/lib/updown-history-pnl.ts";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** A rule quoted in a comment is not a rule that runs — the call-site section reads code. */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, "");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, why = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${!cond && why ? ` — ${why}` : ""}`);
};

const r = (stake: number, returned: number, outcome: string | null = "UP", anyOpen = false): PnlRound =>
  ({ stake, returned, anyOpen, outcome });

/* ── §1 · the arithmetic, against figures computed here ──────────────────────────────────── */
console.log("\n§1 · the figures");
{
  // Two winners (1000→1800, 500→900) and one loser (2000→0).
  // staked 3500 · returned 2700 · net −800 · decided 3 · wins 2 · rate round(66.66…) = 67
  const p = roundPnl([r(1000, 1800), r(500, 900), r(2000, 0, "DOWN")]);
  ok("§1a staked is the sum of every settled stake", p.staked === 3500, `got ${p.staked}`);
  ok("§1b returned is the sum of every settled return", p.returned === 2700, `got ${p.returned}`);
  ok("§1c net is returned minus staked, and it may be NEGATIVE", p.net === -800, `got ${p.net}`);
  ok("§1d decided counts ROUNDS", p.decided === 3, `got ${p.decided}`);
  ok("§1e a win is a round that returned MORE than it took", p.wins === 2, `got ${p.wins}`);
  ok("§1f the rate rounds to a whole percent: 2 of 3 is 67", p.winRate === 67, `got ${p.winRate}`);

  // ⭐ ANTI-CONSTANT: a different population must give a different answer.
  const q = roundPnl([r(1000, 0, "DOWN")]);
  ok("§1g a different population gives a different answer",
    q.net === -1000 && q.winRate === 0 && q.decided === 1,
    `got net ${q.net}, rate ${q.winRate}`);
  ok("§1h …and 0 percent is reachable, so §1f's 67 is not a constant", q.winRate === 0);
}

/* ── §2 · what must NOT score ────────────────────────────────────────────────────────────── */
console.log("\n§2 · open and void rounds");
{
  const base = [r(1000, 1800)];
  const withOpen = roundPnl([...base, r(9999, 0, null, true)]);
  ok("§2a an OPEN round contributes nothing — not to the money, not to the denominator",
    withOpen.staked === 1000 && withOpen.decided === 1 && withOpen.net === 800,
    `got staked ${withOpen.staked}, decided ${withOpen.decided}`);

  const withVoid = roundPnl([...base, r(5000, 5000, "VOID")]);
  ok("§2b a VOID round contributes nothing either — a refund is not a decided round",
    withVoid.staked === 1000 && withVoid.decided === 1 && withVoid.wins === 1,
    "counting it adds a zero-net decided round and drags the rate down for a round that never resolved");

  // ⭐ ANTI-CONSTANT for the exclusions: the same rows, NOT excluded, give a different answer.
  ok("§2c …and the exclusion is doing work — the same rows otherwise change the figures",
    roundPnl([...base, r(5000, 5000, "UP")]).staked === 6000,
    "if this were also 1000 the filter would be matching everything, not VOID");

  ok("§2d a round that returned exactly its stake is NOT a win",
    roundPnl([r(1000, 1000)]).wins === 0 && roundPnl([r(1000, 1000)]).decided === 1);
  ok("§2e nothing decided is an ABSENCE, not zero",
    roundPnl([]).winRate === null && roundPnl([r(1, 0, null, true)]).winRate === null,
    "0 percent tells a player they lost every round");
  ok("§2f …and an empty view reports zeros, never NaN",
    [roundPnl([]).staked, roundPnl([]).net, roundPnl([]).decided].every((v) => v === 0));
}

/* ── §3 · the call site — which POPULATION the page hands over ───────────────────────────── */
console.log("\n§3 · the page passes the VIEW, not the page");
{
  const page = strip(read("src/app/updown/history/page.tsx"));

  // ⛔ EXTRACTED AND ASSERTED POSITIVELY. A bare "does not contain rounds" would pass if the
  // call were deleted, and `rounds` is a substring of `viewRounds` besides.
  const call = page.match(/roundPnl\(([\s\S]{0,240}?)\);/);
  ok("§3a the page still calls `roundPnl`", call !== null,
    "a failed extraction is not a zero — every assertion below depends on this one landing");
  ok("§3b …and hands it `viewRounds`, the whole filtered view",
    call !== null && /\bviewRounds\b/.test(call[1]),
    "this is D37: the strip read the twelve rounds on the current page");
  ok("§3c …and never the paged list",
    call !== null && !/[^w]\brounds\b\s*\.map/.test(call[1]),
    "`rounds` is the pager's twelve");

  // The two populations must still be DIFFERENT things, or §3b asserts nothing at all.
  ok("§3d `viewRounds` and `rounds` are still two different populations",
    /const viewRounds = matched\.map/.test(page) && /const rounds = viewRounds\.filter\(/.test(page),
    "if `rounds` became an alias for the view the pager is gone, and this guard is vacuous");

  // The middle tile printed a PAGED count directly over an UNPAGED one — the visible tell.
  ok("§3e the Rounds tile counts the VIEW, so it agrees with the bets line beneath it",
    /tabular-nums text-text">\{viewRounds\.length\}/.test(page),
    "`{rounds.length}` over `{rows.length} bets` is two scopes in one tile");
  ok("§3f the poller watches the VIEW too, or an off-screen settlement leaves the money stale",
    /const anyLive = viewRounds\.some/.test(page));

  // D37's other half: the sub-line that spilled out of its tile.
  ok("§3g the staked-to-returned line can WRAP — `.amount` is on the NUMBERS, not the whole run",
    /flex flex-wrap items-baseline[^"]*text-micro/.test(page)
      && !/className="amount text-micro text-text-subtle">\{formatTzs\(staked\)\}/.test(page),
    "`.amount.amount` sets white-space:nowrap at (0,2,0); a utility class cannot override it");
}

/* ── §4 · controls — every §3 matcher shown able to say no ───────────────────────────────── */
console.log("\n§4 · controls");
{
  const asPaged = "const x = roundPnl(\n  rounds.map((g) => ({ stake: g.stake })),\n);";
  const m = asPaged.match(/roundPnl\(([\s\S]{0,240}?)\);/);
  ok("§4a control · the extractor finds the argument at all", m !== null);
  ok("§4b control · a PAGED population IS detected", m !== null && !/\bviewRounds\b/.test(m[1]));
  ok("§4c control · the extractor answers null when the call is gone",
    "const x = 1;".match(/roundPnl\(([\s\S]{0,240}?)\);/) === null);
  ok("§4d control · the old spilling sub-line IS detected",
    /className="amount text-micro text-text-subtle">\{formatTzs\(staked\)\}/
      .test('<div className="amount text-micro text-text-subtle">{formatTzs(staked)}</div>'));
  ok("§4e control · stripComments removes prose that names the defect",
    !/viewRounds/.test(strip("/* this used to read viewRounds */\nconst a = 1;")));
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
// ⛔ A suite that silently stops running is a suite that cannot fail. Raise this with every
//    section added, or the new assertions become deletable in silence.
if (pass + fail < 24) { console.error(`!! only ${pass + fail} assertions ran — treating as failure.`); process.exit(3); }
process.exit(fail === 0 ? 0 : 1);
