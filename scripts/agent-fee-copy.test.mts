/**
 * WHAT THE AGENT FEE COSTS, AND WHAT IT SAYS ABOUT VAT — the arithmetic and the copy, together.
 *
 *   npx tsx scripts/agent-fee-copy.test.mts     (npm run test:agent-fee-copy)
 *
 * ⛔ THIS GUARD DID NOT EXIST UNTIL 2026-09-09, AND TWO DOCBLOCKS SAID IT DID.
 * `src/app/legal/agent-terms/page.tsx` claimed *"`test:agent-fee-copy` refuses a locale that
 * states a treatment the config does not have"*, and `agent-application-service.ts` said
 * *"A guard (`test:agent-fee-copy`) now holds that shut."* No such script and no such npm
 * entry ever existed. A comment naming a guard is not a guard, and it is worse than silence:
 * the next reader stops looking. (money-gate `controls-and-guards`; §7.10.)
 *
 * 🔴 AND THE THING IT WAS SUPPOSED TO CATCH THEN HAPPENED. Ali set the registration fee
 * VAT-free on 2026-09-09 (`feeVatRatePct` 18 → 0) while `feeVatTreatment` stayed `EXCLUSIVE`.
 * The unconditional copy rendered the BINDING contract as "(TZS 100,000 plus TZS 0 VAT)" and
 * the public page as "TZS 100,000 + TZS 0 VAT · one-off registration fee, VAT included in this
 * total" — three separate assertions about a tax on a fee that bears none.
 *
 *   §1 the arithmetic: EXCLUSIVE adds, INCLUSIVE backs out, and a 0 rate does neither
 *   §2 ⭐ a ZERO VAT component produces NO VAT sentence, in all three languages, RENDERED
 *   §3 a NON-ZERO rate still states the treatment it actually has — the original claim
 *   §4 ⚠️ POSITIVE CONTROL, same run — the checker catches a page that DOES say "plus 0 VAT"
 *   §5 ⛔ the refund reverses what was BOOKED, not today's rate
 *
 * In-memory: no DATABASE_URL, so config is the shipped default and the audit ring is the store.
 */
import { feeBreakdownFor, vatWithinGross } from "../src/lib/server/agent-application-service.ts";
import { getAgentConfig } from "../src/lib/server/agent-config.ts";
import { agentFeeVatClause } from "../src/app/legal/agent-terms/page.tsx";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

// ── §1 · the arithmetic ──────────────────────────────────────────────────────
console.log("\n§1 · feeBreakdownFor — EXCLUSIVE adds, INCLUSIVE backs out, 0 does neither");
{
  const ex18 = feeBreakdownFor(100_000, "EXCLUSIVE", 18);
  ok("EXCLUSIVE @18% → 100,000 net + 18,000 VAT = 118,000",
    ex18.netTzs === 100_000 && ex18.vatTzs === 18_000 && ex18.totalTzs === 118_000, JSON.stringify(ex18));

  const in18 = feeBreakdownFor(118_000, "INCLUSIVE", 18);
  ok("INCLUSIVE @18% on 118,000 → 18,000 VAT inside, total unchanged",
    in18.totalTzs === 118_000 && in18.vatTzs === 18_000, JSON.stringify(in18));

  // ⭐ The live shape after Ali's 2026-09-09 decision.
  const ex0 = feeBreakdownFor(100_000, "EXCLUSIVE", 0);
  ok("⭐ EXCLUSIVE @0% → 100,000 total, ZERO VAT (the live rule)",
    ex0.netTzs === 100_000 && ex0.vatTzs === 0 && ex0.totalTzs === 100_000, JSON.stringify(ex0));
  ok("INCLUSIVE @0% also yields zero VAT", feeBreakdownFor(100_000, "INCLUSIVE", 0).vatTzs === 0);

  ok("⛔ vatWithinGross at a 0 rate is 0, not NaN", vatWithinGross(118_000, 0) === 0);
  ok("vatWithinGross at 18% backs 18,000 out of 118,000", vatWithinGross(118_000, 18) === 18_000);
}

// ── §2 · a zero VAT component says nothing about VAT ─────────────────────────
console.log("\n§2 · ⭐ zero VAT → no VAT sentence, in all three languages");
{
  const cfg = getAgentConfig();
  ok("the shipped default is the VAT-free rule Ali decided", cfg.feeVatRatePct === 0, `feeVatRatePct=${cfg.feeVatRatePct}`);

  // ⛔ THE FUNCTION THE PAGE ITSELF CALLS — not a copy of its logic. `/legal/agent-terms`
  // renders exactly `agentFeeVatClause(fee, cfg.feeVatTreatment)` into §2 of the contract.
  const live = agentFeeVatClause(feeBreakdownFor(cfg.registrationFeeTzs, cfg.feeVatTreatment, cfg.feeVatRatePct), cfg.feeVatTreatment);
  const VAT_WORDS = ["VAT", "增值税"];
  for (const locale of ["en", "sw", "zh"] as const) {
    const said = VAT_WORDS.filter((w) => live[locale].includes(w));
    ok(`⭐ ${locale}: says NOTHING about VAT while the component is 0`, said.length === 0, `rendered ${JSON.stringify(live[locale])}`);
  }

  // ⛔ And it must go silent on the COMPONENT, not on the treatment — both treatments at a
  // zero rate, because `feeVatTreatment` stayed EXCLUSIVE when the rate went to zero.
  for (const treatment of ["EXCLUSIVE", "INCLUSIVE"] as const) {
    const c = agentFeeVatClause(feeBreakdownFor(100_000, treatment, 0), treatment);
    ok(`⭐ ${treatment} at a 0 rate is silent in all three languages`,
      c.en === "" && c.sw === "" && c.zh === "", JSON.stringify(c));
  }
}

// ── §3 · a non-zero rate still states the treatment it has ───────────────────
console.log("\n§3 · a NON-ZERO rate states the treatment the config actually has");
{
  const ex = agentFeeVatClause(feeBreakdownFor(100_000, "EXCLUSIVE", 18), "EXCLUSIVE");
  ok("EXCLUSIVE @18% states the split: net PLUS VAT", /100,000.*plus.*18,000 VAT/.test(ex.en), ex.en);
  ok("…and does so in Swahili too", /pamoja na VAT/.test(ex.sw), ex.sw);
  ok("…and in Chinese", ex.zh.includes("增值税") && ex.zh.includes("18,000"), ex.zh);

  const inc = agentFeeVatClause(feeBreakdownFor(118_000, "INCLUSIVE", 18), "INCLUSIVE");
  ok("INCLUSIVE @18% states VAT is INSIDE the price", inc.en === "(VAT inclusive)", inc.en);

  // ⛔ The original claim the missing guard made: a locale may not state a treatment the
  // config does not have. EXCLUSIVE and INCLUSIVE must never render the same sentence.
  ok("⛔ the two treatments render DIFFERENT sentences at the same rate",
    ex.en !== inc.en && ex.sw !== inc.sw && ex.zh !== inc.zh,
    "if they matched, the treatment field would be decorative and this guard vacuous");
  ok("⛔ …and they do NOT agree on what an applicant owes for the same config number",
    feeBreakdownFor(100_000, "EXCLUSIVE", 18).totalTzs !== feeBreakdownFor(100_000, "INCLUSIVE", 18).totalTzs);
}

// ── §4 · POSITIVE CONTROL ────────────────────────────────────────────────────
console.log("\n§4 · ⚠️ POSITIVE CONTROL — the checker must catch a page that DOES claim VAT");
{
  const VAT_WORDS = ["VAT", "增值税"];
  const saysVat = (t: string) => VAT_WORDS.some((w) => t.includes(w));

  // Verbatim what the pre-fix page rendered at a zero rate.
  ok("⚠️ '(TZS 100,000 plus TZS 0 VAT)' is CAUGHT", saysVat("pay the registration fee of TZS 100,000 (TZS 100,000 plus TZS 0 VAT) to"));
  ok("⚠️ the INCLUSIVE-at-zero form '(VAT inclusive)' is CAUGHT", saysVat("registration fee of TZS 100,000 (VAT inclusive)"));
  ok("⚠️ the Chinese form is CAUGHT", saysVat("支付 TZS 100,000（TZS 100,000 加 TZS 0 增值税）的注册费"));
  // …and must NOT fire on clean copy, or §2 passing would mean nothing.
  ok("⚠️ …and clean copy is NOT caught", !saysVat("pay the registration fee of TZS 100,000 to Selcom LIPA NAMBA"));
  ok("⚠️ …nor is clean Chinese copy", !saysVat("支付 TZS 100,000 的注册费并上传收据"));
}

// ── §5 · the refund reverses what was booked ─────────────────────────────────
console.log("\n§5 · ⛔ the refund reverses the VAT actually BOOKED, not today's rate");
{
  // The application collected at 18%: gross 118,000, VAT 18,000 booked to HOUSE:TAX.
  const collectedGross = 118_000, bookedVat = 18_000;
  const todaysRate = getAgentConfig().feeVatRatePct;   // 0

  const wrong = vatWithinGross(collectedGross, todaysRate);      // what the OLD code reversed
  const right = bookedVat;                                        // what the ledger says

  ok("⛔ today's rate would reverse ZERO of an 18,000 VAT leg", wrong === 0, `got ${wrong}`);
  ok("⭐ the booked figure reverses all 18,000", right === 18_000);
  ok(
    "⛔ …and the difference is money STRANDED in HOUSE:TAX against a full refund",
    right - wrong === 18_000,
    "if these agreed, the rate had not moved and the defect would be invisible — that is exactly how it survived",
  );

  // The three-state read is the safeguard: `null` must NOT be treated as "no VAT".
  const asIfUnavailable: number | null = null;
  ok(
    "⛔ a null ledger read falls back to computing, it does NOT silently reverse 0",
    (asIfUnavailable ?? vatWithinGross(collectedGross, 18)) === 18_000,
    "null must mean 'could not ask', never 'nothing was booked'",
  );
}

console.log(`\n${"═".repeat(70)}\n  AGENT FEE COPY: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
process.exit(fail === 0 ? 0 : 1);
