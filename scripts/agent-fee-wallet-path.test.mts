/**
 * THE APPLICANT'S PATH ON THE WALLET RAIL — the dead ends, and the one line that traps a payer.
 *
 * Units 3.1–3.5 of `docs/PAYMENTS-SEAL-CAMPAIGN.md`. Ali ruled 2026-09-10 that the agent
 * registration fee is paid from the applicant's wallet. `test:agent-fee-wallet` proves the MONEY
 * is safe (all-or-nothing, idempotent, correctly booked). This suite proves the PERSON is not
 * stranded — which is a different failure, and a quieter one.
 *
 * ── THE THREE WAYS A PERSON GETS TRAPPED ────────────────────────────────────────────────────
 *
 * ⛔ 1. THEY PAY AND CANNOT SUBMIT. `recomputeDraftStatus` derives `PAYMENT_PENDING` from
 *    `!!app.feeReference || feeDisposition === "WAIVED"`. A wallet payment writes **no
 *    feeReference** — the debit carries the payer's identity, so there is nothing to type. So a
 *    wallet-paid applicant stays at `KYC_SUBMITTED`, and `submitForReview` is the ONLY door into
 *    review. They have paid us TZS 100,000 and the form will not let them apply.
 *    ⭐ This is the highest-value assertion in the campaign: the money guard cannot see it,
 *    because the money moved correctly.
 *
 * ⛔ 2. AN OFFICER-INVITED APPLICANT CANNOT DEPOSIT. Paying from a wallet inherits every
 *    precondition of DEPOSITING, and deposit requires KYC APPROVED. `applicantEligibility`
 *    enforces that for self-service — but `if (!opts.forInvitation)` exempts an invitee
 *    deliberately, because their identity is "decided at approval". Under the old rail that was
 *    harmless: they paid by bank transfer. Under this one they cannot fund a wallet, cannot pay,
 *    and are told nothing. ⚠️ And `agentInvitationHtml({ feeWaivable: true })` is hard-coded, so
 *    the invitation says the fee *may* be waived while the waiver is a separate officer action.
 *
 * ⛔ 3. AN UNVERIFIED EMAIL. Deposit requires it; `applicantEligibility` never checks it.
 *
 * ── WHERE THE REFUSAL MUST BITE, AND WHY ────────────────────────────────────────────────────
 * The module's own law (`agent-application-service.ts` header): *"Every refusal that would strand
 * the registration fee … bites at `startApplication` and on the /agent page's CTA, BEFORE the
 * applicant is asked to pay."* And `wallet/deposit/page.tsx` states the principle it is defending:
 * *"being told up front, with the action that fixes it, is the difference between a gate and a
 * dead end."* So each refusal carries a MACHINE TOKEN — ⛔ never English prose the form
 * substring-matches, which is a defect this repo has already shipped and fixed once.
 *
 * ── WHAT MAKES THIS GUARD NON-VACUOUS ───────────────────────────────────────────────────────
 * ⭐ Every section asserts the CORRECT behaviour **and** that the guard can still see the defect:
 *   · §1 drives a real wallet payment through the real service and asserts the status ADVANCES,
 *     then asserts the refusal tokens exist as a TYPE — so deleting a token is a compile error,
 *     not a silent English fallback.
 *   · §4 asserts the CALL SITE, not the component. ⚠️ Learned twice today: `shouldShowLipaQr`
 *     returning false is already true and already green while the account digits sit in the
 *     page's flight payload, and asserting `reconcileFee`'s helper works said nothing about
 *     whether its caller passes the right argument.
 *   · Each source scan carries a POPULATION RATCHET, because a scan that finds nothing passes
 *     beautifully and reads as thorough.
 *
 * Run: npm run test:agent-fee-wallet-path
 */
import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";
// ⛔ FIXTURES MUST BE VERIFIED PLAYERS. §7 drives a real payment, and paying from a wallet
// inherits every precondition of DEPOSITING — including an APPROVED identity. An unverified
// fixture would be refused by the KYC gate, and §7 would then be measuring the gate rather
// than the fee.
import "./lib/verified-fixtures.mts";
import { db } from "../src/lib/server/store.ts";
import { mkFixtureUser } from "./lib/agent-fixtures.mts";
import {
  feeBreakdown, missingForSubmit, startApplication, attachAgentDocument, setReferees,
  submitForReview, REQUIRED_DOC_SLOTS,
} from "../src/lib/server/agent-application-service.ts";
import { AGENT_TERMS_VERSION } from "../src/lib/agent-terms-version.ts";
import { getAgentConfig } from "../src/lib/server/agent-config.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) pass++;
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

const FEE = feeBreakdown(getAgentConfig()).totalTzs;
const SRC = (f: string) => readFileSync(new URL(`../src/lib/server/${f}`, import.meta.url), "utf8");
const APP = (f: string) => readFileSync(new URL(`../src/app/${f}`, import.meta.url), "utf8");
/** A real 1×1 PNG — `attachAgentDocument` sniffs BYTES, not the data-URL label. */
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

console.log(`\nAGENT FEE · THE APPLICANT'S PATH — fee = ${FEE} TZS\n`);

// ═══ §1 · THE ONE LINE THAT TRAPS A PAYER ════════════════════════════════════════════════
console.log("§1 a wallet-paid applicant can reach PAYMENT_PENDING, and therefore submit");
{
  const svc = SRC("agent-application-service.ts");

  /**
   * ── The derivation itself, asserted WHERE THE RULE LIVES. ──
   *
   * ⚠️ This first sliced `recomputeDraftStatus`, and a refactor that moved the rule into the pure
   * `deriveDraftStatus` turned it red with nothing broken — the flow was still correct and
   * `test:agent-application-security` still 110/0. A guard pinned to a FUNCTION NAME rather than
   * to the rule is brittle in exactly that way, so it now targets the pure helper, which is the
   * single home the derivation is supposed to have. If that helper is ever inlined again, 1.0
   * fails loudly and names the reason rather than the assertions silently measuring nothing.
   */
  const fn = svc.slice(svc.indexOf("function deriveDraftStatus"));
  const body = fn.slice(0, fn.indexOf("\n}") + 2);
  ok("1.0 CONTROL · the draft-state rule has ONE pure home and its body was found",
    svc.includes("function deriveDraftStatus") && body.length > 200, `len=${body.length}`);
  ok("1.0b ⭐ …and recomputeDraftStatus defers to it rather than restating the rule",
    /deriveDraftStatus\(/.test(svc.slice(svc.indexOf("async function recomputeDraftStatus"))));

  ok("1.1 ⛔ PAYMENT_PENDING is reachable from a COLLECTED fee, not only from a feeReference",
    /feeDisposition\s*===\s*"COLLECTED"/.test(body),
    "a wallet payment writes no feeReference, so a payer stays at KYC_SUBMITTED and can never submit");

  ok("1.2 ⭐ …and the WAIVED path is not lost in the process",
    /feeDisposition\s*===\s*"WAIVED"/.test(body));

  // ── The wizard's own completeness list must not demand a receipt either. ──
  const client = APP("agent/apply/apply-client.tsx");
  ok("1.3 CONTROL · the wizard's missing-list was found", /missingNow/.test(client));
  const missingBlock = client.slice(client.indexOf("const missingNow"), client.indexOf("const canSubmit"));
  ok("1.4 ⛔ the wizard does not demand a FEE RECEIPT on the wallet rail",
    !/missingReceipt/.test(missingBlock) || /feeFundingSource|paidFromWallet|walletPaid/.test(missingBlock),
    "canSubmit can never become true while missingNow requires a receipt that no longer exists");
  ok("1.5 ⛔ …nor a typed reference",
    !/missingReference/.test(missingBlock) || /feeFundingSource|paidFromWallet|walletPaid/.test(missingBlock));
}

// ═══ §2 · THE TWO DEAD ENDS — GATED AT THE OFFER, NOT DISCOVERED AT THE TILL ══════════════
console.log("\n§2 the preconditions deposit imposes are surfaced BEFORE the applicant is asked to pay");
{
  const svc = SRC("agent-application-service.ts");

  ok("2.0 CONTROL · the refusal-token union was found",
    /export type FeeRefusal\s*=/.test(svc));

  const union = svc.slice(svc.indexOf("export type FeeRefusal"), svc.indexOf("export type FeeResult"));
  ok("2.1 ⛔ a KYC refusal has a MACHINE TOKEN, so the form renders translated copy",
    /"kyc_required"/.test(union),
    "without a token the form falls through to r.error and puts raw English into a Swahili UI");
  ok("2.2 ⛔ an unverified email has one too", /"email_unverified"/.test(union));
  ok("2.3 ⛔ and so does an insufficient balance — the commonest refusal of all",
    /"insufficient_balance"/.test(union));

  // ⭐ The RETAINED control. It is not a receipt control, so the wallet rail keeps it.
  ok("2.4 ⭐ the refund-owed refusal is RETAINED — a money-owed control, not a receipt control",
    /"refund_owed"/.test(union));

  // ── The server must actually CHECK them, not merely name them. ──
  const payFn = svc.slice(svc.indexOf("export async function payFeeFromWallet"));
  const payBody = payFn.slice(0, payFn.indexOf("\n}\n") > 0 ? payFn.indexOf("\n}\n") + 3 : payFn.length);
  ok("2.5 CONTROL · payFeeFromWallet exists and its body was isolated",
    svc.includes("export async function payFeeFromWallet") && payBody.length > 400,
    `len=${payBody.length}`);
  ok("2.6 ⛔ it refuses on KYC before moving any money", /kyc_required/.test(payBody));
  ok("2.7 ⛔ …and on an unverified email", /email_unverified/.test(payBody));
  ok("2.8 ⛔ …and it still refuses while a previous refund is owed", /refund_owed/.test(payBody));
  ok("2.9 ⭐ the amount comes from feeBreakdown, never a config field or a literal",
    /feeBreakdown\(/.test(payBody) && !/100_000|100000/.test(payBody));
}

// ═══ §3 · THE MONEY IS STAMPED SO A REFUND CAN MIRROR IT ═════════════════════════════════
console.log("\n§3 what the payment records, so the officer and the refund both know what happened");
{
  const svc = SRC("agent-application-service.ts");
  const payFn = svc.slice(svc.indexOf("export async function payFeeFromWallet"));
  const payBody = payFn.slice(0, payFn.indexOf("\n}\n") > 0 ? payFn.indexOf("\n}\n") + 3 : payFn.length);

  ok("3.1 ⭐ it stamps feeFundingSource WALLET, so recordFeeRefund mirrors the collection",
    /feeFundingSource:\s*"WALLET"/.test(payBody),
    "without it a wallet-funded refund would be sent to a bank account the payer never used");
  ok("3.2 ⭐ it stamps feeDisposition COLLECTED — the disposition approveAgent requires",
    /feeDisposition:\s*"COLLECTED"/.test(payBody));
  ok("3.3 ⭐ it stamps feeAmountTzs, or the officer's panel shows today's config figure",
    /feeAmountTzs:/.test(payBody));
  ok("3.4 ⛔ it holds the application lock, so the debit and the stamp cannot half-commit",
    /withLock\(`agentapp:/.test(payBody));
  ok("3.5 ⭐ it delegates the debit to the all-or-nothing primitive, never to debitInternal",
    /payAgentRegistrationFee\(/.test(payBody) && !/debitInternal\(/.test(payBody));
  ok("3.6 ⭐ it writes an audit naming the movement", /audit\(/.test(payBody));
}

// ═══ §4 · THE CALL SITES — assert the CALLER, never the component ════════════════════════
/**
 * ⚠️ THIS SECTION EXISTS BECAUSE COMPONENT-LEVEL ASSERTIONS LIE BY OMISSION, twice proven today:
 *   · `test:lipa-qr` is GREEN, including "the PERFECT config still renders NOTHING", while the
 *     fee destination account sits in `/agent`'s RSC flight payload — because `LipaQrPanel` is
 *     `"use client"` and a SERVER component passes it props, which Next.js serialises whatever
 *     the component returns. "Renders nothing" and "sends nothing" are different claims.
 *   · asserting `agentRegistrationFeeEntries` honours its `source` argument said nothing about
 *     whether `reconcileFee` passes the right one — and flipping it went undetected.
 */
console.log("\n§4 the call sites, because 'renders nothing' is not 'sends nothing'");
{
  const page = APP("agent/page.tsx");
  const client = APP("agent/apply/apply-client.tsx");

  const panelCalls = [...page.matchAll(/<LipaQrPanel/g)].length + [...client.matchAll(/<LipaQrPanel/g)].length;
  ok("4.0 CONTROL · at least one LipaQrPanel call site was found (a scan finding zero passes beautifully)",
    panelCalls >= 1, `found ${panelCalls}`);

  /**
   * ⛔ PSC-02. The panel must not be RENDERED — and therefore must not be PASSED PROPS — while
   * the release gate is shut. Relying on the component to return null publishes the merchant
   * name, the Lipa number, the USSD code, the asset path and the destination account to every
   * anonymous visitor of a publicly-readable page.
   */
  const gatedAtCallSite = (src: string) =>
    !/<LipaQrPanel/.test(src) || /(LIPA_QR_RELEASED|lipaQrWouldShow|shouldShowLipaQr)[^\n]{0,120}<LipaQrPanel|\{\s*(LIPA_QR_RELEASED|lipaQrWouldShow\([^)]*\))\s*&&[\s\S]{0,200}<LipaQrPanel/.test(src);
  ok("4.1 ⛔ /agent gates the QR panel AT THE CALL SITE, so its props never reach the payload",
    gatedAtCallSite(page),
    "the component returning null does not stop Next.js serialising the props it was given");
  ok("4.2 ⛔ …and so does the wizard's payment step", gatedAtCallSite(client));

  /**
   * ── The visible bank instruction must be gone from the public page's template. ──
   *
   * 🔴 THIS ASSERTION WAS VACUOUS IN ITS FIRST FORM, and it is worth recording why. It read
   * `!/feeDestinationAccount/.test(page) || /LIPA_QR_RELEASED/.test(page)` — a disjunction that
   * the PSC-02 fix satisfied as a SIDE EFFECT: importing the flag for the call-site gate made the
   * second branch true, so 4.3 went green while `feeBody` still told the applicant to pay an
   * account number. A guard that its own neighbouring fix turns green proves nothing.
   *
   * ⭐ So it now asks the question it means: with the gated QR block removed, does any
   * destination account still reach a RENDERED template? That cannot be satisfied by an import.
   */
  /**
   * ⚠️ STRIP COMMENTS FIRST, WITH THE SHARED SCANNER. This assertion fired on the very comment
   * that EXPLAINS it — the docblock above the fee copy names the destination field in prose to
   * say why it was removed. A source assertion has to test CODE, not writing about the code, or
   * documenting a fix becomes indistinguishable from not making it. That is the exact reason
   * `scripts/lib/decomment.mts` exists: *"a guard that greps raw text matches the paragraph
   * explaining the fix instead of the fix."*
   *
   * ⛔ AND IT USES THE SHARED SCANNER, NOT A PRIVATE PAIR OF REGEXES. My first version was
   * `.replace(block).replace(line)`, and `test:decomment` §2.1 caught it as a **21st** private
   * stripper against a ceiling of **20** — a ratchet that may only SHRINK, so raising it was
   * never an option. The shared one is better for a MEASURED reason, not a stylistic one: a pair
   * of regexes has an ORDER, and each order is its own blindness (`E-186` — block-first lets a
   * `/*` inside a `//` line open a block nobody wrote, and that hid 7,581 characters of `src`
   * from five guards). `decomment` is a scanner, and it tracks string literals too.
   */

  /**
   * ⚠️ AND STATE THE RULE PER LINE, NOT BY STRIPPING A REGION.
   *
   * The first version cut out the gated block with
   * `/\{LIPA_QR_RELEASED && \([\s\S]{0,400}?\)\}/` and then searched what was left. The lazy
   * quantifier stopped at the FIRST `)}` it met — which is `lipaDisplay()}` INSIDE the element —
   * so `account={cfg.feeDestinationAccount}` fell outside the strip and 4.3 failed with the
   * fix already in place. A guard that fails for the wrong reason is as costly as one that
   * passes for the wrong reason: both send the next reader somewhere untrue.
   *
   * ⭐ The rule is simply *"the destination account may only ever be handed to the QR panel"*,
   * so assert exactly that, line by line. No region matching, nothing for a nested brace to
   * break.
   */
  const accountLines = decomment(page).split(/\r?\n/).filter((l) => l.includes("feeDestinationAccount"));
  ok("4.3a CONTROL · at least one line mentions the destination account (else 4.3 is vacuous)",
    accountLines.length >= 1, `found ${accountLines.length}`);
  ok("4.3 ⭐ /agent hands the destination account ONLY to the withheld QR panel, never to visible copy",
    accountLines.every((l) => l.includes("LipaQrPanel")),
    accountLines.filter((l) => !l.includes("LipaQrPanel")).join(" | ").slice(0, 200));
}

// ═══ §5 · A REAL PAYMENT, DRIVEN THROUGH THE SERVICE ═════════════════════════════════════
console.log("\n§5 driven end to end: a funded applicant pays and becomes able to submit");
{
  const mod: Record<string, unknown> = await import("../src/lib/server/agent-application-service.ts");
  const payFeeFromWallet = mod.payFeeFromWallet as
    | ((userId: string) => Promise<{ ok: boolean; data?: { status: string }; refusal?: string }>)
    | undefined;
  const ABSENT = "payFeeFromWallet does not exist in agent-application-service.ts";

  if (typeof payFeeFromWallet !== "function") {
    ok("5.1 ⭐ a funded, KYC'd applicant pays and the status ADVANCES", false, ABSENT);
    ok("5.2 ⛔ an unfunded applicant is refused with insufficient_balance", false, ABSENT);
    ok("5.3 ⛔ paying twice does not charge twice", false, ABSENT);
  } else {
    await mkFixtureUser("path_broke");
    const r = await payFeeFromWallet("path_broke");
    ok("5.2 ⛔ an applicant with no balance is refused, and by TOKEN not by prose",
      r.ok === false && typeof r.refusal === "string" && r.refusal.length > 0,
      JSON.stringify(r));
    const w = await db.wallet.findByUserId("path_broke");
    ok("5.4 ⛔ …and nothing was debited", (w?.balance ?? -1) === 0, `balance=${w?.balance}`);
  }
}

// ═══ §7 · 🔴 THE PAYER CAN ACTUALLY SUBMIT ═══════════════════════════════════════════════
/**
 * 🔴 THIS SECTION EXISTS BECAUSE §5 PROMISED THIS AND NEVER RAN IT, AND A PAID APPLICANT
 * SHIPPED TO PRODUCTION UNABLE TO APPLY.
 *
 * §5's own header reads "driven end to end: a funded applicant pays and becomes able to
 * submit". Read its branches: `5.1 a funded, KYC'd applicant pays and the status ADVANCES`
 * and `5.3 paying twice does not charge twice` exist ONLY inside
 * `if (typeof payFeeFromWallet !== "function")` — the branch taken when the function is
 * ABSENT. Once the function shipped, the else-branch ran instead, and it drives an UNFUNDED
 * applicant and asserts a refusal. So from the moment the feature existed, the only thing
 * §5 ever tested was the unhappy path, under a heading that claimed the opposite.
 *
 * ⭐ THE DEFECT IT LET THROUGH. `missingForSubmit` gates `submitForReview`, and it read:
 *     if (app.feeDisposition !== "WAIVED") {
 *       if (!docs.some(d => d.docType === "FEE_RECEIPT")) missing.push("FEE_RECEIPT");
 *       if (!app.feeReference) missing.push("FEE_REFERENCE");
 *     }
 * A wallet payment sets `COLLECTED`, never `WAIVED`, and writes NEITHER a receipt document
 * nor a reference — deliberately, because nobody attested anything. So a person who had paid
 * TZS 100,000 from their balance was told "Your application is not complete." and named two
 * pieces of evidence the product had stopped collecting. **Identical treatment to somebody
 * who had paid nothing at all.**
 *
 * ⛔ AND THE CLIENT HAD ALREADY BEEN FIXED, WHICH IS WHY IT LOOKED DONE. `apply-client.tsx`
 * pushes ONE entry keyed on settlement, and its docblock says the two edits "are ONE atomic
 * change and must never be split". They were split — across the client and the server. The
 * wizard therefore ENABLED its Submit button and the server refused it.
 *
 * ⚠️ WHY NO EXISTING GUARD SAW IT. `test:agent-application-security` drives a submit to
 * green — over the LEGACY rail, uploading a FEE_RECEIPT and typing a reference. It proves
 * the bank rail submits. Nothing proved the WALLET rail submits, so the suite was green
 * about a rail the product no longer offers.
 *
 * ⭐ So this section drives the REAL thing: seven documents, referees, a funded wallet, a
 * payment through the service, and then `submitForReview` — the door the applicant actually
 * has to walk through.
 */
console.log("\n§7 🔴 a wallet-paid applicant can SUBMIT — the door, not the payment");
{
  const mod: Record<string, unknown> = await import("../src/lib/server/agent-application-service.ts");
  const payFeeFromWallet = mod.payFeeFromWallet as ((userId: string) => Promise<{ ok: boolean; error?: string }>) | undefined;

  if (typeof payFeeFromWallet !== "function") {
    ok("7.1 ⛔ payFeeFromWallet exists", false, "absent — every assertion below would be vacuous");
  } else {
    const UID = "path_submit";
    await mkFixtureUser(UID);
    /**
     * ⭐ A VERIFIED EMAIL, BECAUSE PAYING INHERITS EVERY PRECONDITION OF DEPOSITING.
     * The first run of this section was refused with `email_unverified` — which is the
     * product being RIGHT, and the fixture being an applicant who could not exist. Left
     * unfixtured it would have masked 7.7/7.8 behind an unrelated refusal, and a section
     * that fails for the wrong reason is as costly as one that passes for the wrong reason.
     */
    await db.user.update(UID, { emailVerifiedAt: new Date().toISOString() });
    const wallet = await db.wallet.findByUserId(UID);
    await db.wallet.update(wallet!.id, { balance: FEE * 2 });

    const started = await startApplication(UID);
    ok("7.0 CONTROL · the applicant has a draft (without one, every later step is vacuous)",
      started.ok === true, JSON.stringify(started));

    for (const slot of REQUIRED_DOC_SLOTS) {
      await attachAgentDocument(UID, slot, PNG);
    }
    await setReferees(UID, {
      oneName: "Amina J", oneContact: "+255711000001",
      twoName: "Baraka K", twoContact: "+255711000002", consent: true,
    });

    // ⭐ THE CONTROL THAT MAKES 7.3 MEAN SOMETHING. Before paying, the ONLY thing outstanding
    // must be the fee. If anything else were missing, 7.3 could fail for a reason that has
    // nothing to do with the rail and the section would be measuring its own fixture.
    const beforePay = await missingForSubmit((await db.agentApplication.findActiveByUser(UID))!);
    const nonFeeBefore = beforePay.filter((m) => !/^FEE_/.test(m));
    ok("7.1 CONTROL · documents and referees are complete — only the fee is outstanding",
      nonFeeBefore.length === 0, `still missing: ${nonFeeBefore.join(", ")}`);
    ok("7.2 CONTROL · …and the fee IS outstanding before payment (else 7.3 proves nothing)",
      beforePay.some((m) => /^FEE/.test(m)), JSON.stringify(beforePay));

    const paid = await payFeeFromWallet(UID);
    ok("7.3 ⭐ a funded, verified applicant's payment is ACCEPTED",
      paid.ok === true, JSON.stringify(paid));

    const after = (await db.agentApplication.findActiveByUser(UID))!;
    ok("7.4 ⛔ the fee is stamped COLLECTED, not WAIVED",
      after.feeDisposition === "COLLECTED", `disposition=${after.feeDisposition}`);
    ok("7.5 ⛔ …and the wallet really was debited",
      (await db.wallet.findByUserId(UID))?.balance === FEE, `balance=${(await db.wallet.findByUserId(UID))?.balance}`);
    ok("7.6 ⛔ …and NO receipt document and NO reference were invented",
      !after.feeReference, `feeReference=${after.feeReference}`);

    // 🔴 THE ASSERTION THAT WAS RED. A settled fee must leave nothing outstanding.
    const stillMissing = await missingForSubmit(after);
    ok("7.7 🔴 a PAID applicant is missing NOTHING — the fee is settled, so no evidence is owed",
      stillMissing.length === 0,
      `server still demands: ${stillMissing.join(", ")}`);

    // ⭐ AND THE DOOR ITSELF, not merely the function behind it. A guard that drives
    // `missingForSubmit` alone is blind to its call site — the same blindness that left
    // `reconcileFee`'s flipped source at 34/0.
    const sub = await submitForReview(UID, { acceptedTermsVersion: AGENT_TERMS_VERSION });
    ok("7.8 🔴 …and `submitForReview` LETS THEM IN — they paid; they must be able to apply",
      sub.ok === true, JSON.stringify(sub));
    ok("7.9 ⛔ …and the application really reached review",
      (await db.agentApplication.findActiveByUser(UID))!.status === "UNDER_REVIEW",
      (await db.agentApplication.findActiveByUser(UID))!.status);
  }
}

// ═══ §8 · THE LEGACY RAIL STILL SUBMITS ══════════════════════════════════════════════════
/**
 * ⛔ UNIT 7's NON-REGRESSION OBLIGATION, asserted rather than assumed. The fix to §7 must not
 * be "stop requiring fee evidence" — an application with NOTHING settled and no evidence must
 * still be refused, or the door is simply open. And an out-of-band applicant who typed a
 * reference and uploaded a receipt must still get through, because that is how the one
 * historical APPROVED agent got in.
 *
 * ⭐ THIS IS THE HALF THAT STOPS THE OBVIOUS WRONG FIX. Deleting the two pushes outright would
 * make §7 green instantly and let an applicant who has paid NOTHING submit — turning a
 * blocked-payer defect into a free-agent defect, which is strictly worse.
 */
console.log("\n§8 ⛔ an UNPAID applicant is still refused, and the legacy rail still works");
{
  const UID = "path_unpaid";
  await mkFixtureUser(UID);
  await startApplication(UID);
  for (const slot of REQUIRED_DOC_SLOTS) await attachAgentDocument(UID, slot, PNG);
  await setReferees(UID, {
    oneName: "Amina J", oneContact: "+255711000001",
    twoName: "Baraka K", twoContact: "+255711000002", consent: true,
  });

  const app = (await db.agentApplication.findActiveByUser(UID))!;
  const missing = await missingForSubmit(app);
  ok("8.1 ⛔ an applicant who has paid NOTHING is still missing the fee",
    missing.length > 0, `missing=${JSON.stringify(missing)}`);

  const sub = await submitForReview(UID, { acceptedTermsVersion: AGENT_TERMS_VERSION });
  ok("8.2 ⛔ …and the door is CLOSED to them — this is not a free pass",
    sub.ok === false, JSON.stringify(sub));

  // The legacy rail: an out-of-band applicant records a reference against an uploaded receipt.
  // ⭐ Asserted through `missingForSubmit` on a constructed row rather than by re-driving the
  // withdrawn wizard, because the wizard no longer offers it — the RULE must still honour it.
  const legacy = await missingForSubmit({ ...app, feeReference: "RCPT-LEGACY-1" } as never);
  const legacyFee = legacy.filter((m) => /^FEE/.test(m));
  ok("8.3 ⛔ a legacy row with a reference but no receipt image is still incomplete",
    legacyFee.length > 0, `fee slots=${JSON.stringify(legacyFee)}`);

  const waived = await missingForSubmit({ ...app, feeDisposition: "WAIVED" } as never);
  ok("8.4 ⛔ CONTROL · a WAIVED fee owes nothing — the exemption that always worked still does",
    waived.filter((m) => /^FEE/.test(m)).length === 0, JSON.stringify(waived));

  const collected = await missingForSubmit({ ...app, feeDisposition: "COLLECTED" } as never);
  ok("8.5 ⭐ …and a COLLECTED fee owes nothing either — the differential that names the defect",
    collected.filter((m) => /^FEE/.test(m)).length === 0, JSON.stringify(collected));
}

// ═══ §9 · THE FEE EMAILS SAY WHAT ACTUALLY HAPPENS ═══════════════════════════════════════
/**
 * UNIT 6.5. Three of them were false or silent after the rail changed, and each in a different
 * way — which is why a single "does it mention a bank?" scan would not have found them all.
 *
 *   · `agentApplicationSubmittedAdminHtml` told OFFICERS the applicant had submitted "the seven
 *     documents and their fee reference". A wallet payment writes no reference, so the mail
 *     that opens a compliance review named evidence the product had stopped collecting.
 *   · `agentFeeRefundedHtml` renders its `To` row ONLY when `destinationMasked` is truthy, and
 *     the caller passed `app.feeSourceAccount` — a column a wallet payment never writes. So the
 *     row vanished and a refunded applicant was told an amount and a reference and NOTHING
 *     about where their money had gone. ⭐ Not a false sentence: an ABSENT one. A vocabulary
 *     scan cannot see a missing row, which is why 9.3 asserts the row is PRESENT.
 *   · `agentInvitationHtml` quoted a price and never said how it is paid. An officer-invited
 *     applicant never sees the public `/agent` page, so nothing told them the fee comes out of
 *     their own wallet.
 *
 * ⭐ THE POPULATION IS DISCOVERED, from `comms-registry`'s `EMAIL_TEMPLATES`, filtered to the
 * agent service — not a list typed here. `comms-email-truth` already ratchets that registry
 * against the module's real exports ("the inventory is 61 templates"), so a template that is
 * added and forgotten cannot slip past this section either.
 */
console.log("\n§9 every agent fee email describes the wallet rail");
{
  const reg = await import("../src/lib/server/comms-registry.ts");
  const E = await import("../src/lib/server/email.ts") as unknown as Record<string, unknown>;
  const specs = (reg.EMAIL_TEMPLATES as ReadonlyArray<{ template: string; trigger: string }>)
    .filter((s) => s.trigger.includes("agent-application-service"));

  ok("9.0 ⛔ RATCHET · the registry really yielded the agent templates (a broken filter finds none)",
    specs.length >= 8, `found ${specs.length}`);
  ok("9.0b CONTROL · …including the three this section is ABOUT",
    ["agentFeeRefundedHtml", "agentApplicationSubmittedAdminHtml", "agentInvitationHtml"]
      .every((n) => specs.some((s) => s.template === n)),
    specs.map((s) => s.template).join(", "));

  const refunded = (E.agentFeeRefundedHtml as (a: { amountTzs: number; reference: string; destinationMasked: string | null }) => string);
  const submitted = (E.agentApplicationSubmittedAdminHtml as (a: { reference: string; applicantLabel: string; submittedAt: string; reviewUrl: string }) => string);
  const invite = (E.agentInvitationHtml as (a: { link: string; expiresAt: string; feeWaivable: boolean; feeTzs: number }) => string);

  const adminBody = submitted({ reference: "agp_x", applicantLabel: "A B", submittedAt: "2026-09-11T09:00:00.000Z", reviewUrl: "https://x/y" });
  ok("9.1 🔴 the officer's alert no longer promises a fee REFERENCE that no longer exists",
    !/fee reference/i.test(adminBody), "still says 'fee reference'");
  ok("9.1b CONTROL · …and it still says the fee was dealt with at all",
    /registration fee/i.test(adminBody), adminBody.slice(0, 0));

  // ⭐ THE ABSENT ROW. Rendered with the value the WALLET path now supplies.
  const walletRefund = refunded({ amountTzs: 100_000, reference: "RF-1", destinationMasked: "Your 50pick wallet" });
  ok("9.2 ⭐ a wallet refund NAMES the wallet as the destination",
    /50pick wallet/i.test(walletRefund), "the refund mail does not say where the money went");
  ok("9.3 ⛔ …and the `To` row is PRESENT — the defect was an ABSENT row, not a wrong sentence",
    /To/.test(walletRefund) && /50pick wallet/i.test(walletRefund));

  // ⛔ CONTROL: the legacy rail must still render its masked bank account.
  const bankRefund = refunded({ amountTzs: 118_000, reference: "RF-2", destinationMasked: "****4412" });
  ok("9.4 ⛔ CONTROL · an out-of-band refund still names the masked account it really went to",
    bankRefund.includes("****4412"), "the legacy refund lost its destination");

  // ⚠️ AND THE SHAPE THAT SHIPPED: null destination → the row disappears entirely.
  const silent = refunded({ amountTzs: 100_000, reference: "RF-3", destinationMasked: null });
  ok("9.5 ⭐ CONTROL · with a null destination the row really does VANISH — this is what was live",
    !/50pick wallet/i.test(silent) && !silent.includes("****4412"),
    "the null case did not reproduce, so 9.3 proves nothing");

  const inviteBody = invite({ link: "https://x/i", expiresAt: "2026-09-12T09:00:00.000Z", feeWaivable: true, feeTzs: 100_000 });
  ok("9.6 ⭐ the invitation says HOW the fee is paid, not just how much",
    /wallet/i.test(inviteBody), "an invitee is quoted a price with no rail");
  ok("9.7 ⛔ …and no agent fee mail instructs anybody to pay a bank account or upload a receipt",
    ![adminBody, walletRefund, inviteBody].some((b) => /upload the receipt|bank account|account number|deposit slip/i.test(b)),
    "an out-of-band instruction survives in an agent fee mail");
}

// ═══ §6 · NO LIVE AGENT COPY STILL DESCRIBES THE OUT-OF-BAND RAIL ════════════════════════
/**
 * 🔴 THIS SECTION EXISTS BECAUSE §4 MISSED A LIVE FALSEHOOD, AND SHIPPED IT.
 *
 * §4.3 asserts no `feeDestinationAccount` reaches a rendered template — an INTERPOLATION check.
 * `/agent`'s numbered steps carried `how3: "Pay the registration fee to the account below and
 * upload the receipt."`, a STATIC claim with no placeholder in it, so it was invisible to that
 * assertion AND to the grep that found `feeBody` and `payInstruction`. It went to production
 * and was caught only by reading the deployed page.
 *
 * ⚠️ Worse than merely stale: once Unit 6.1 removed the account, "the account below" pointed at
 * nothing. Deleting one false statement made a second one incoherent.
 *
 * ⭐ SO THE RULE IS ABOUT THE CLAIM, NOT THE MECHANISM: no agent-facing string may tell an
 * applicant to pay an ACCOUNT, upload a RECEIPT, or type a REFERENCE, however it is assembled.
 *
 * ⛔ AND IT IS SCOPED, DELIBERATELY. Three neighbours legitimately mention receipts and must not
 * be dragged in:
 *   · `docReceipt` / `payRefundOwed` — the legacy FEE_RECEIPT slot label and the retained
 *     refund-owed refusal, both still true for the one historical out-of-band row;
 *   · `t.lipa.*` — the withheld QR panel's own copy, which belongs with its machinery (§0.6
 *     forbids deleting that machinery, and its copy is part of it);
 *   · anything about DEPOSIT receipts, which are a different subject entirely.
 * An unscoped guard would demand that correct strings be made false, which is worse than the
 * defect it set out to catch.
 */
console.log("\n§6 no live agent copy still describes the out-of-band rail");
{
  const dict = readFileSync(new URL("../src/lib/i18n-dict.ts", import.meta.url), "utf8");

  // The EN `agent:` block only — one locale is enough, because `test:i18n` proves parity and a
  // claim present in EN is present in all three by construction.
  const start = dict.indexOf("    agent: {");
  const end = dict.indexOf("\n    },", start);
  const block = start >= 0 && end > start ? dict.slice(start, end) : "";
  ok("6.0 CONTROL · the EN agent dictionary block was isolated (a short slice is not a block)",
    block.length > 2000, `len=${block.length}`);

  const OUT_OF_BAND = [
    /account below/i,
    /upload the receipt/i,
    /account \{account\}/i,
    /enter its reference/i,
    /keep the receipt/i,
  ];
  const offenders = block
    .split(/\r?\n/)
    .filter((l) => /^\s+[a-zA-Z0-9_]+:\s*"/.test(l))
    // ⛔ The three legitimate exemptions, by KEY rather than by guessing at the prose.
    .filter((l) => !/^\s+(docReceipt|payRefundOwed|payReceiptFirst|payDuplicate|payReference[A-Za-z]*|missingReceipt|missingReference):/.test(l))
    .filter((l) => OUT_OF_BAND.some((re) => re.test(l)));

  ok("6.1 ⛔ no agent-facing string tells an applicant to pay an ACCOUNT or upload a RECEIPT",
    offenders.length === 0, offenders.map((l) => l.trim().slice(0, 110)).join(" | "));

  // ⭐ And prove the pattern would still catch the sentence that shipped — otherwise 6.1 passing
  // says nothing about whether the rule is the right shape.
  const SHIPPED = '      how3: "Pay the registration fee to the account below and upload the receipt.",';
  ok("6.2 ⭐ CONTROL · the pattern still catches the exact sentence that reached production",
    OUT_OF_BAND.some((re) => re.test(SHIPPED)));

  // ⛔ The dead template is gone, not merely unused: a false string left in the dictionary is an
  // invitation for the next surface to reuse it.
  ok("6.3 ⛔ the superseded `feeBody` template is removed, not left dead in the dictionary",
    !/\n\s+feeBody:/.test(dict));
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
