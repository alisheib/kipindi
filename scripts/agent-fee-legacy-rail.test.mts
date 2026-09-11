/**
 * UNIT 7 · THE LEGACY OUT-OF-BAND RAIL — a NON-REGRESSION obligation, not a backfill.
 *
 * ⛔ THERE IS NO MIGRATION TO WRITE AND THIS SUITE IS NOT A SUBSTITUTE FOR ONE. Production was
 * measured on 2026-09-10: the whole `AgentApplication` table is TWO ROWS — one APPROVED, whose
 * fee was collected out of band at 18% VAT, and one DRAFT that has paid nothing and recorded
 * nothing. Nobody is mid-payment on the old rail. `PAYMENT_PENDING`: 0. `REFUND_DUE`: 0.
 * Orphaned references: 0. So Unit 7 is the obligation to keep the OLD path working while the
 * new one exists beside it — and that is a GUARD's job, not a data migration's.
 *
 * ⚠️ A COUNT IS TRUE ONLY AT THE MOMENT IT WAS READ. That census is not re-asserted here (this
 * suite never touches production); it is the REASON for the suite, not a claim inside it.
 *
 * ── 🔴 THE MONEY DEFECT THIS EXISTS TO PREVENT ──────────────────────────────────────────────
 * `recordFeeRefund` branches on the stored `feeFundingSource` to decide where a refund goes. If
 * that branch ever collapses to "always the wallet" — which is the tempting simplification once
 * the wallet is the only live rail — then refunding the one historical bank-collected fee would
 * CREDIT A WALLET THAT WAS NEVER DEBITED. That is not a wrong destination; it is MINTING
 * shillings, and `computeTrialBalance` drifts by the whole fee forever.
 * ⭐ The mirror defect is equally real in the other direction and was actually shipped once:
 * before Unit 5, a wallet-funded refund posted the ledger mirror and moved NO money, leaving the
 * applicant out of pocket while the books said they had been paid.
 *
 * ── ⭐ `null` IS THE LEGACY RAIL, AND IT IS ENCODED IN TWO PLACES ────────────────────────────
 * The historical APPROVED row has `feeFundingSource: null` and was deliberately NEVER
 * backfilled, because the 2026-09-09 VAT ruling is not retroactive and that row must not be
 * reclassified. So `null` has to read as EXTERNAL — and that rule is written down TWICE:
 * `recordFeeRefund`'s `app.feeFundingSource ?? "EXTERNAL"` and `fee-evidence.ts`'s
 * `fundingSourceOf`. §4 asserts the two AGREE on every input, because two encodings of one rule
 * is exactly the shape that produced the client/server split in §5d of the campaign doc.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { decomment } from "./lib/decomment.mts";
import { agentRegistrationFeeEntries } from "../src/lib/server/ledger.ts";
import { fundingSourceOf, feeEvidence, feeRefundDestination } from "../src/app/admin/agents/[id]/fee-evidence.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? `\n       ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 60 - s.length))}`);

const UID = "legacy_agent_1";
const APPID = "agp_legacy_1";
const FEE = 118_000;   // the historical collection: 100,000 + 18% VAT
const VAT = 18_000;

const legFor = (entries: ReadonlyArray<{ account: string; amount: number }>, account: string) =>
  entries.find((e) => e.account === account) ?? null;
const sumOf = (entries: ReadonlyArray<{ amount: number }>) => entries.reduce((s, e) => s + e.amount, 0);

console.log("\nAGENT FEE · THE LEGACY OUT-OF-BAND RAIL — non-regression\n");

// ═══ §1 · AN EXTERNAL COLLECTION NEVER TOUCHES A PLAYER ACCOUNT ══════════════════════════
section("§1 · an out-of-band collection books to EXTERNAL, never to the payer's wallet");
{
  const entries = agentRegistrationFeeEntries({
    groupRef: APPID, userId: UID, amount: FEE, vatAmount: VAT,
    description: "Agent registration fee · legacy", source: "EXTERNAL",
  });

  ok("1.0 CONTROL · the builder produced legs at all (an empty set passes 1.2 for free)",
    entries.length >= 2, `legs=${entries.length}`);
  ok("1.1 ⛔ the money-in leg is EXTERNAL, because a bank account paid — not a wallet",
    !!legFor(entries, "EXTERNAL:SELCOM"), entries.map((e) => e.account).join(" | "));
  ok("1.2 🔴 NO `PLAYER:` leg exists — crediting one would describe a wallet movement that never happened",
    !entries.some((e) => e.account.startsWith("PLAYER:")),
    entries.filter((e) => e.account.startsWith("PLAYER:")).map((e) => e.account).join(" | "));
  ok("1.3 ⛔ the group still balances to zero", Math.abs(sumOf(entries)) < 0.005, `sum=${sumOf(entries)}`);
  ok("1.4 ⛔ the VAT actually booked is the 18% the collection carried, not today's 0%",
    legFor(entries, "HOUSE:TAX")?.amount === VAT, `HOUSE:TAX=${legFor(entries, "HOUSE:TAX")?.amount}`);

  // ⭐ THE DIFFERENTIAL. The same builder, same amounts, the OTHER source — if these two agree
  // the parameter is doing nothing and §1 is decoration.
  const wallet = agentRegistrationFeeEntries({
    groupRef: APPID, userId: UID, amount: FEE, vatAmount: VAT,
    description: "Agent registration fee · wallet", source: "WALLET",
  });
  ok("1.5 ⭐ CONTROL · the WALLET source books a PLAYER leg, so the parameter really discriminates",
    !!legFor(wallet, `PLAYER:${UID}`) && !legFor(wallet, "EXTERNAL:SELCOM"),
    wallet.map((e) => e.account).join(" | "));
}

// ═══ §2 · THE REFUND REVERSES TO WHICHEVER RAIL COLLECTED ════════════════════════════════
section("§2 · the refund mirror reverses to the rail that collected, never to today's rail");
{
  const refundExternal = agentRegistrationFeeEntries({
    groupRef: APPID, userId: UID, amount: -FEE, vatAmount: -VAT,
    description: "refund of an out-of-band collection", source: "EXTERNAL",
  });
  ok("2.1 🔴 an EXTERNAL refund gives the money back OUT OF BAND — it does not credit a wallet",
    !refundExternal.some((e) => e.account.startsWith("PLAYER:")),
    "crediting a wallet that was never debited MINTS the fee and drifts the trial balance forever");
  /**
   * ⚠️ THE SIGNS ARE MEASURED, NOT ASSUMED. The first version of 2.2 and 2.4 asserted `-FEE`
   * and went red with nothing broken: a COLLECTION books `EXTERNAL:SELCOM = -118,000` — money
   * arriving FROM outside is negative on the external account — so a refund reverses it to
   * `+118,000`. ⛔ An assertion written from an intuition about sign conventions accuses correct
   * code on its first run, which is how a real accusation later gets waved away. These were read
   * off the real builder before being pinned, and 2.2b holds the opposite sign so the word
   * "reverses" is doing work rather than decorating.
   */
  ok("2.2 ⛔ …and it reverses the EXTERNAL leg the collection posted",
    legFor(refundExternal, "EXTERNAL:SELCOM")?.amount === FEE,
    `EXTERNAL:SELCOM=${legFor(refundExternal, "EXTERNAL:SELCOM")?.amount}`);
  ok("2.2b ⭐ CONTROL · the COLLECTION posts the OPPOSITE sign, so 2.2 reverses something real",
    legFor(agentRegistrationFeeEntries({
      groupRef: APPID, userId: UID, amount: FEE, vatAmount: VAT,
      description: "collection", source: "EXTERNAL",
    }), "EXTERNAL:SELCOM")?.amount === -FEE);
  ok("2.3 ⛔ the refund mirror balances", Math.abs(sumOf(refundExternal)) < 0.005);

  const refundWallet = agentRegistrationFeeEntries({
    groupRef: APPID, userId: UID, amount: -FEE, vatAmount: -VAT,
    description: "refund of a wallet collection", source: "WALLET",
  });
  ok("2.4 ⭐ CONTROL · a WALLET refund DOES return to the player account — the mirror discriminates",
    legFor(refundWallet, `PLAYER:${UID}`)?.amount === FEE,
    refundWallet.map((e) => `${e.account}=${e.amount}`).join(" | "));
  ok("2.5 🔴 …and the EXTERNAL refund has NO player leg at all — that is the minting defect",
    legFor(refundExternal, `PLAYER:${UID}`) === null,
    "a PLAYER leg on an out-of-band refund credits a wallet that was never debited");
}

// ═══ §3 · THE SERVICE READS THE STAMP, AND `null` MEANS EXTERNAL ═════════════════════════
/**
 * ⚠️ A SOURCE ASSERTION, AND IT IS LABELLED AS ONE. §1 and §2 drive the BUILDER; they are blind
 * to whether the CALLER passes the right argument — the exact blindness that left a flipped
 * `reconcileFee` source at 34/0 in this campaign's own history. Driving `recordFeeRefund` for
 * real needs a rejected application, an officer and a ledger the in-memory store cannot read
 * back, so the caller is asserted at source here and named as the weaker evidence it is.
 */
section("§3 · the callers pass the stamp, and a null stamp is the LEGACY rail");
{
  const svc = decomment(read("src/lib/server/agent-application-service.ts"));

  ok("3.0 CONTROL · the service was read and decommented", svc.length > 20_000, `len=${svc.length}`);
  ok("3.1 ⛔ `reconcileFee` books its collection as EXTERNAL",
    /source:\s*"EXTERNAL"/.test(svc), "the legacy attestation no longer names its own rail");
  ok("3.2 🔴 the refund branches on the STORED stamp, never on today's policy",
    /feeFundingSource\s*\?\?\s*"EXTERNAL"/.test(svc),
    "a refund that infers the rail instead of reading it will send the historical row's money to the wrong place");
  ok("3.3 ⛔ …and the wallet credit is CONDITIONAL, not unconditional",
    /if\s*\(\s*fundingSource\s*===\s*"WALLET"\s*\)/.test(svc),
    "an unconditional wallet credit mints the fee for every out-of-band collection");
  ok("3.4 ⛔ the VAT reversed is read back from the LEDGER, not recomputed from config",
    /ledgerGroupAccountSum\(/.test(svc),
    "recomputing VAT at today's rate strands the 18,000 the historical collection actually booked");
}

// ═══ §4 · ONE RULE, TWO ENCODINGS — THEY MUST AGREE ══════════════════════════════════════
/**
 * 🔴 THE SHAPE THAT ALREADY COST THIS CAMPAIGN A LIVE DEFECT. `missingForSubmit` and the
 * wizard's `missingNow` both encoded "is the fee settled?", one was updated and the other was
 * not, and a paying applicant could not submit (§5d). "`null` means EXTERNAL" is now written in
 * TWO places for the same reason — the service's refund branch and the officer panel's
 * `fundingSourceOf`. So assert they agree on EVERY input rather than hoping.
 */
section("§4 · `null` reads as EXTERNAL everywhere it is decided");
{
  const CASES: Array<"WALLET" | "EXTERNAL" | null> = ["WALLET", "EXTERNAL", null];
  const expected: Record<string, string> = { WALLET: "WALLET", EXTERNAL: "EXTERNAL", null: "EXTERNAL" };

  for (const c of CASES) {
    ok(`4.1.${String(c)} ⛔ fundingSourceOf(${String(c)}) → ${expected[String(c)]}`,
      fundingSourceOf({ feeFundingSource: c }) === expected[String(c)],
      `got ${fundingSourceOf({ feeFundingSource: c })}`);
  }

  // The panel and the refund destination must classify the historical row identically.
  const legacyRow = {
    feeFundingSource: null, feeReference: "AGT-HIST-1", feeAttestedTzs: FEE,
    feeStatementRef: "STMT-HIST", feeReconciledAt: "2026-09-06T10:00:00.000Z",
    feeSourceAccount: "****4412",
  };
  const ext = { ...legacyRow, feeFundingSource: "EXTERNAL" as const };
  ok("4.2 ⭐ the officer panel renders the null-stamped historical row EXACTLY as an EXTERNAL one",
    JSON.stringify(feeEvidence(legacyRow)) === JSON.stringify(feeEvidence(ext)),
    "the one surviving out-of-band agent would be shown a rail they never used");
  ok("4.3 ⛔ …and its refund destination is the masked bank account, not a wallet",
    feeRefundDestination(legacyRow) === "****4412" && !/wallet/i.test(feeRefundDestination(legacyRow)),
    feeRefundDestination(legacyRow));

  // ⭐ CONTROL — prove the comparison in 4.2 can FAIL, or it is asserting nothing.
  const asWallet = { ...legacyRow, feeFundingSource: "WALLET" as const };
  ok("4.4 ⭐ CONTROL · a WALLET-stamped row renders DIFFERENTLY, so 4.2 is a real comparison",
    JSON.stringify(feeEvidence(asWallet)) !== JSON.stringify(feeEvidence(ext)));
}

// ═══ §5 · THE HISTORICAL ROW'S EVIDENCE IS PRESERVED, NOT REWRITTEN ══════════════════════
/**
 * ⛔ 7.2: "a `feeReference` already recorded is not orphaned". The one reference in production
 * belongs to the APPROVED agent and must be preserved untouched. Nothing in this campaign
 * writes to it — this section asserts that the READ path still surfaces it, because a reference
 * that survives in the database but disappears from the officer's screen is orphaned in every
 * way that matters to the person using it.
 */
section("§5 · a recorded reference is still SHOWN, not merely stored");
{
  const ev = feeEvidence({
    feeFundingSource: null, feeReference: "AGT-HIST-1", feeAttestedTzs: FEE,
    feeStatementRef: "STMT-HIST", feeReconciledAt: "2026-09-06T10:00:00.000Z", feeSourceAccount: "****4412",
  });
  ok("5.1 ⛔ the historical reference is rendered to the officer",
    ev.rows.some((r) => r.value.includes("AGT-HIST-1")),
    ev.rows.map((r) => `${r.label}=${r.value}`).join(" | "));
  ok("5.2 ⛔ …as is the statement line the officer matched it against",
    ev.rows.some((r) => r.value.includes("STMT-HIST")));
  ok("5.3 ⛔ …and the attested amount, formatted as money",
    ev.rows.some((r) => /118,000/.test(r.value)),
    ev.rows.map((r) => r.value).join(" | "));
  ok("5.4 ⛔ …and it is NOT given the wallet rail's 'no attestation needed' note",
    ev.note === null, JSON.stringify(ev.note));
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
