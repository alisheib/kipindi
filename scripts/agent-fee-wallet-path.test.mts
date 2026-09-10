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
import { db } from "../src/lib/server/store.ts";
import { mkFixtureUser } from "./lib/agent-fixtures.mts";
import { feeBreakdown } from "../src/lib/server/agent-application-service.ts";
import { getAgentConfig } from "../src/lib/server/agent-config.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) pass++;
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

const FEE = feeBreakdown(getAgentConfig()).totalTzs;
const SRC = (f: string) => readFileSync(new URL(`../src/lib/server/${f}`, import.meta.url), "utf8");
const APP = (f: string) => readFileSync(new URL(`../src/app/${f}`, import.meta.url), "utf8");

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

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
