/**
 * E-48 · THE SETTLEMENT EXPECTATION — the operator runbook's money maths, held to the code.
 *
 * WHY THIS EXISTS, and it is not a hypothetical. Session 15 sealed a real market on
 * production (`mkt_54f75a1959cdee5f1ed8`, YES · 2,000 v 2,000) and armed its payout for the
 * close of a 24-hour objection window. It then wrote the expected payout into TWO
 * operator-facing places — the markets runbook's worked example and §6b's instruction to the
 * next session — as **TZS 3,480**, from the fee `min(13% × 4,000, 33.3% × 2,000)` = 520.
 *
 * That is the `capped-commission` formula. The market is frozen at **`loser-share`**, where
 * the fee is `(platformFeeRate + operatorFeeRate) × the LOSING pool` = 13% × 2,000 = **260**,
 * so the real payout is **3,740**. The live product had it right all along — the officer's own
 * market page states "LOSER-SHARE — the fee is a slice of the losing side · FEE IF YES WINS
 * TZS 260" and prints 3,740 in the predictor grid. The DOCUMENTS were wrong, by TZS 260 of a
 * real player's money, in the direction of paying them less.
 *
 * 🔴 THE FAILURE THIS PREVENTS IS NOT A MISPRINT. The next session was told to check that
 * alpha "should receive TZS 3,480". Had it asserted that, a CORRECT settlement would have
 * failed the check and been filed as a money defect — the campaign's most expensive recurring
 * mistake, where the harness lies and the product is right. §6y logged five of those in one
 * session. This is the sixth, caught before it fired.
 *
 * WHAT IT MEASURES:
 *
 *  1 · The two fee models on the SAME pools, so the 260-v-520 divergence is pinned in a test
 *      rather than left to be re-derived. This is the arithmetic that was got wrong.
 *  2 · The no-mix guarantee: a snapshot with no `feeModel` must read as capped-commission, or
 *      pre-23-July money silently reprices.
 *  3 · The winner floor under loser-share, at the hostile end (a 1-shilling losing pool).
 *  4 · ⭐ THE RUNBOOK'S OWN WORKED EXAMPLE, parsed out of the shipped HTML and compared to
 *      what the code computes. Not "does the file contain 3,740" — the figure is read from
 *      the sentence that makes the claim, so moving the number without moving the claim, or
 *      changing the rates without regenerating the runbook, both fail.
 *  5 · §6b does not tell the next session to expect the capped-commission figure.
 *
 * ⚠️ §4 deliberately does NOT ban the strings "520" and "3,480" from the runbook. The
 * corrected page cites both ON PURPOSE, in a caution box, as what the *other* model would
 * give — the trap is worth naming. A guard that banned the characters would force the
 * explanation out of the document and call that a pass.
 */
import { readFileSync } from "node:fs";
import {
  poolFee, settledPayoutFor, DEFAULT_FEE_MODEL,
  DEFAULT_PLATFORM_FEE_RATE, DEFAULT_OPERATOR_FEE_RATE,
} from "../src/lib/payout";

let pass = 0;
const fails: string[] = [];
function eq(name: string, got: unknown, want: unknown) {
  if (got === want) { pass++; return; }
  fails.push(`${name} — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}
function ok(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; return; }
  fails.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

// The frozen snapshot of mkt_54f75a1959cdee5f1ed8, read off production 2026-08-03.
// ⛔ Do not "tidy" these into the DEFAULT_* constants: the point of a snapshot is that it
// is what THIS market settles at, even after config moves.
const SNAP = {
  v: 2, feeModel: "loser-share" as const, commissionRate: 0.13, feeCeilingRate: 0.333,
  platformFeeRate: 0.03, operatorFeeRate: 0.1,
  traTaxOnCommissionRate: 0.1, gbtLevyOnCommissionRate: 0.05,
};
const YES_POOL = 2000, NO_POOL = 2000, ALPHA_STAKE = 2000;

// ── §1 · the two models on the same pools ───────────────────────────────────────
{
  const ls = poolFee(YES_POOL, NO_POOL, SNAP, "YES");
  eq("§1 loser-share · fee = 13% of the LOSING (NO) pool", ls.fee, 260);
  eq("§1 loser-share · netPool", ls.netPool, 3740);
  eq("§1 loser-share · pool", ls.pool, 4000);
  // The whole-pool figure the wrong maths used. The code exposes it, labelled
  // "informational only" — this asserts it is NOT what gets charged.
  eq("§1 loser-share · notional whole-pool commission is 520 and is NOT the fee", ls.commission, 520);
  ok("§1 loser-share · the fee charged is not the notional figure", ls.fee !== ls.commission);

  const alpha = settledPayoutFor({ yesPool: YES_POOL, noPool: NO_POOL, side: "YES", stake: ALPHA_STAKE }, SNAP);
  eq("§1 alpha's payout under the model this market is frozen at", alpha.payout, 3740);
  eq("§1 alpha's profit", alpha.net, 1740);

  // Symmetry: under loser-share the fee depends on who lost, and here the pools are equal,
  // so both outcomes cost the same 260. This is what the market page shows as two figures.
  eq("§1 fee if NO wins is also 260 (equal pools)", poolFee(YES_POOL, NO_POOL, SNAP, "NO").fee, 260);

  // …and the figure the documents actually printed, so the divergence is pinned.
  const legacy = { ...SNAP, feeModel: "capped-commission" as const };
  eq("§1 capped-commission · fee = min(13% x 4000, 33.3% x 2000)", poolFee(YES_POOL, NO_POOL, legacy, "YES").fee, 520);
  eq("§1 capped-commission · payout is the 3,480 the docs claimed",
    settledPayoutFor({ yesPool: YES_POOL, noPool: NO_POOL, side: "YES", stake: ALPHA_STAKE }, legacy).payout, 3480);
  ok("§1 the two models differ by exactly the 260 the runbook under-stated",
    3740 - 3480 === 260);
}

// ── §2 · the no-mix guarantee ───────────────────────────────────────────────────
{
  // A pre-2026-07-23 snapshot has no feeModel at all. It MUST NOT inherit loser-share.
  const bare = { commissionRate: 0.13, feeCeilingRate: 0.333 };
  eq("§2 a snapshot with no feeModel charges the capped-commission fee",
    poolFee(YES_POOL, NO_POOL, bare, "YES").fee, 520);
  eq("§2 …and new polls freeze loser-share", DEFAULT_FEE_MODEL, "loser-share");
  eq("§2 the loser-share rate is platform + operator", DEFAULT_PLATFORM_FEE_RATE + DEFAULT_OPERATOR_FEE_RATE, 0.13);
}

// ── §3 · the winner floor, at the hostile end ───────────────────────────────────
{
  // netPool = winningPool + losingPool·(1−rate) ≥ winningPool, so a winner can never be
  // paid below stake. Drive it where the losing pool is almost nothing.
  const thin = settledPayoutFor({ yesPool: 100_000, noPool: 1, side: "YES", stake: 100_000 }, SNAP);
  ok("§3 a winner with a 1-shilling losing pool still clears its stake",
    thin.payout >= 100_000, `payout ${thin.payout}`);
  // And with NO losing pool at all the fee is zero, not negative.
  eq("§3 no losing pool ⇒ no fee", poolFee(100_000, 0, SNAP, "YES").fee, 0);
}

// ── §4 · ⭐ the runbook's worked example, parsed from the shipped HTML ────────────
{
  const html = readFileSync(new URL("../docs/runbooks/markets-runbook.html", import.meta.url), "utf8");

  // Read the figure out of the SENTENCE THAT MAKES THE CLAIM, not out of the file. A
  // `includes("3,740")` would pass on a document that says 3,740 anywhere at all —
  // including inside the caution box explaining what NOT to do.
  // `[^<]*` spans intervening PROSE but never a tag, so the figure has to belong to this
  // sentence rather than to the next element that happens to hold a number.
  const claim = html.match(/receives[^<]*<strong>TZS\s*([\d,]+)<\/strong>/);
  ok("§4 the runbook states a payout for the worked example", claim != null,
    "no 'receives <strong>TZS …</strong>' sentence found — did the paragraph move?");
  if (claim) {
    const stated = Number(claim[1].replace(/,/g, ""));
    const computed = settledPayoutFor(
      { yesPool: YES_POOL, noPool: NO_POOL, side: "YES", stake: ALPHA_STAKE }, SNAP,
    ).payout;
    eq("§4 the runbook's payout equals what the settlement code computes", stated, computed);
  }

  // The paragraph must name the model it is applying. The whole defect was applying the
  // right arithmetic from the wrong model, which reads as careful work.
  const para = html.match(/<p>When that window closes[\s\S]*?<\/p>/)?.[0] ?? "";
  ok("§4 the worked example names loser-share", /loser-share/i.test(para), "the paragraph does not say which model it used");
  ok("§4 the worked example says the fee is a slice of the LOSING side",
    /losing|NO pool/i.test(para), "nothing in the paragraph ties the fee to the losing side");
  ok("§4 the worked example states the 260 fee", /TZS\s*260/.test(para), "the 260 fee is not in the paragraph");

  // The caution box must survive. It is the only place a reader is told the two models exist
  // and must never be mixed — and it is where the 520/3,480 figures are allowed to appear.
  ok("§4 the caution box naming capped-commission is present",
    /capped-commission/.test(html) && /never<\/em>\s*mix/.test(html),
    "the do-not-mix caution is gone — the trap becomes re-discoverable");

  // ⭐ The caution must give the operator the COMPARISON, not a single rule to remember.
  // The first draft of this fix asserted "every live market today is loser-share" — measured
  // against production it was FALSE (12 of the 19 open polls settle at capped-commission), so
  // the correction would have sent an officer to the wrong maths on the majority of the board.
  // A rule that is right about one market is how E-48 happened in the first place.
  // ⚠️ Pick the box by what it SAYS, not by being the first `.note.stop` in the file — there
  // are five, and matching the first one measured a caution box from Part 3 and reported this
  // section as missing. Ask for the element by its content.
  const caution = [...html.matchAll(/<div class="note stop">[\s\S]*?<\/div>/g)]
    .map((m) => m[0])
    .find((box) => /fee model/i.test(box)) ?? "";
  ok("§4 the fee-model caution box was found", caution.length > 0,
    "no .note.stop box mentions the fee model — the caution moved or was removed");
  ok("§4 the caution states BOTH models' fees", /TZS 260/.test(caution) && /TZS 520/.test(caution),
    "the caution does not put the two fees side by side");
  ok("§4 the caution states BOTH models' payouts", /3,740/.test(caution) && /3,480/.test(caution),
    "the caution does not show what each model pays");
  ok("§4 the caution tells the reader to read the model off the market, not to memorise one",
    /never assume|read it off/i.test(caution),
    "the caution gives a rule to remember instead of telling the officer where to look");
  ok("§4 the caution does not claim every live market uses one model",
    !/every live market|all live markets/i.test(caution),
    "a uniformity claim is measurably false on production — both models are live");

  // The figure that shows an officer where to read the model.
  ok("§4 the fee-model figure is referenced", /m21-fee-model\.png/.test(html));
}

// ── §5 · the handoff does not carry the wrong expectation ───────────────────────
{
  const camp = readFileSync(new URL("../docs/LIVE-QA-CAMPAIGN.md", import.meta.url), "utf8");
  // Scoped to the resume instruction, which is the line a next session acts on.
  // ⚠️ ANCHOR ON A STRUCTURAL PROPERTY: the handoff marker STARTS A LINE (`^…` with `m`).
  // This was `/RESUME AT:[\s\S]{0,600}/`, and the moment §0.1a began *describing* the
  // tracker-hygiene rule — mentioning "RESUME AT:" in prose, in §0, which precedes §6b — that
  // became the FIRST match and §5 silently measured the wrong 600 characters, failing on a
  // CORRECT handoff. Anchoring on the literal marker text was not enough either: the note
  // explaining the fix quotes the marker in backticks and broke it again in the same edit.
  // Prose can contain any string; only a real handoff begins a line with it.
  // `test:tracker-hygiene` §2 had the identical bug from the identical copy-paste.
  //
  // 🔴 AND SO DID THE FIX — the identical copy-paste propagated the NEXT bug too. From session
  // 23 the handoff is written as a HEADING (`#### ⏭️ **RESUME AT:`), which "starts a line"
  // does not match, so both guards silently fell through to a SUPERSEDED handoff from an
  // earlier session and validated that instead. Optional `#`s admit every form the marker
  // legitimately takes; prose still cannot match it. See the fuller note in tracker-hygiene §2.
  const resume = camp.match(/^#{0,4} ?⏭️ \*\*RESUME AT:[\s\S]{0,600}/m)?.[0] ?? "";
  ok("§5 §6b's resume line exists", resume.length > 0,
    "no '⏭️ **RESUME AT:' marker — has the handoff format changed?");
  // ⚠️ NOT `!resume.includes("3,480")`. The corrected line names 3,480 deliberately, to say
  // it was wrong and why — banning the characters would force that warning out and score the
  // silence as a pass. Parse the figure the line actually tells the next session to EXPECT.
  const expected = resume.match(/receive\s*\*\*TZS\s*([\d,]+)\*\*/);
  // ⚠️ The handoff must state the MONEY POSITION either way — but demanding a
  // `receive **TZS …**` figure UNCONDITIONALLY was wrong, and it only became
  // visible once the anchor above was fixed and this check started reading the
  // real handoff. That form is tied to one specific stranded market (alpha's
  // payout, the constants below); when no market is mid-settlement there is no
  // such figure, and requiring one would force a session to INVENT a number to
  // get to green — the precise failure A-5 (no fabrication) exists to prevent.
  // ⭐ So: an arithmetic claim is CHECKED against the settlement code, and its
  // absence is allowed ONLY when the handoff positively declares the position
  // instead. Silence satisfies neither branch, so the check can still fail —
  // a vague or empty handoff is exactly what it is here to catch.
  // ⚠️ Pin the PROPERTY — "the handoff states where the money stands" — not one
  // session's phrasing. This alternation is the accepted vocabulary and it is
  // deliberately broad: a handoff may report money *in flight*, *stranded*,
  // *frozen*, or explicitly *none*. It failed once already on a correct handoff
  // that said "freezing TZS 59,450" simply because that verb was missing here,
  // which is the same vocabulary-pinning mistake three earlier guards made.
  // What it must NOT accept is silence, and it does not.
  const declares = /money in flight|nothing in flight|stranded|frozen|freezing|unsettled|no money (is )?(in flight|outstanding)/i.test(resume);
  ok("§5 §6b states the money position — an expected payout, or an explicit declaration",
    expected != null || declares,
    "the handoff names neither a 'receive **TZS …**' figure nor the money position");
  if (expected) {
    eq("§5 §6b's expected payout equals what the settlement code computes",
      Number(expected[1].replace(/,/g, "")),
      settledPayoutFor({ yesPool: YES_POOL, noPool: NO_POOL, side: "YES", stake: ALPHA_STAKE }, SNAP).payout);
  }
}

console.log(`\nE-48 · settlement expectation — ${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length === 0 ? 0 : 1);
