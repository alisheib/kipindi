/**
 * C1 · G2 VISUAL — render every email and LOOK at it.
 *
 * `test:cert-c1` reads the bytes. This reads the PIXELS, because they are not
 * the same question: a template can carry correct copy, correct links and
 * correct escaping and still arrive as a wall of text on a phone, with a CTA
 * too small to hit or a card that scrolls sideways.
 *
 * Renders all 47 at the 50pick responsiveness matrix — 360 / 768 / 1280 / 1920 —
 * and asserts, on the rendered page:
 *   · zero horizontal overflow (the card must never force a sideways scroll)
 *   · the CTA is a real tap target (>= 44 px tall) and inside the viewport
 *   · the brand mark and the card actually paint (no zero-height chrome)
 *   · text does not collide with its own container
 *
 * Screenshots land in `.qa-shots/emails/` for a human to look at. A green run is
 * evidence, not proof — LOOK AT THEM.
 *
 * Needs Chromium (Playwright). Not part of `test:all` by design; run it with
 * `npm run qa:cert-c1`.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { EMAIL_TEMPLATES } from "../src/lib/server/comms-registry.ts";
import * as E from "../src/lib/server/email.ts";

const OUT = join(process.cwd(), ".qa-shots", "emails");
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

const SAFE = "Will Simba SC beat Yanga in the Kariakoo derby on 12 August 2026?";
const LONG = "Will the Bank of Tanzania hold its policy rate at or above 6.00% at the Monetary Policy Committee meeting scheduled for the final week of September 2026, as reported by the Bank's own published statement?";

/** One representative render per template, with realistic (not minimal) content —
 *  a layout bug hides behind a two-word title. */
const PAGES: { name: string; html: string }[] = [
  { name: "depositConfirmedHtml", html: E.depositConfirmedHtml({ amount: 250_000, method: "M-Pesa", reference: "txn_9f3c2a7b41e8", gatewayRef: "dep_7712aa93bc41", balance: 1_250_000 }) },
  { name: "depositPendingHtml", html: E.depositPendingHtml({ amount: 50_000, method: "Tigo Pesa", reference: "txn_9f3c2a7b41e8", gatewayRef: "dep_7712aa93bc41" }) },
  { name: "depositFailedHtml", html: E.depositFailedHtml({ amount: 50_000, method: "Airtel Money", reference: "txn_9f3c2a7b41e8", gatewayRef: "dep_7712aa93bc41", reason: "Your mobile money account did not have enough balance" }) },
  { name: "depositReversedHtml", html: E.depositReversedHtml({ amount: 50_000, method: "M-Pesa", reference: "txn_9f3c2a7b41e8", gatewayRef: "dep_7712aa93bc41" }) },
  { name: "withdrawalSentHtml", html: E.withdrawalSentHtml({ amount: 197_000, destination: "M-Pesa", destinationPhone: "+255712345678", reference: "wdr_95e5cddab0fb", gatewayRef: "sel_009c1a7c3662", railLabel: "Selcom Pesa", railNote: null }) },
  { name: "withdrawalUnderReviewHtml", html: E.withdrawalUnderReviewHtml({ amount: 2_500_000, reference: "wdr_95e5cddab0fb" }) },
  { name: "amlRejectRefundHtml", html: E.amlRejectRefundHtml({ amount: 15_000, reason: "The payout rail declined the destination number", reference: "wdr_95e5cddab0fb", gatewayRef: "sel_009c1a7c3662", railLabel: "Selcom Pesa" }) },
  { name: "betPlacedHtml", html: E.betPlacedHtml({ reference: "pos_41ab77cd", side: "YES", stake: 25_000, marketTitle: LONG, placedAt: "2026-07-31T09:00:00.000Z", resolutionDate: "30 Sep 2026", cashOutFeeRate: 0.1, freeExitGraceMinutes: 5, paidExitWindowMinutes: 0 }) },
  { name: "selectionClosedHtml", html: E.selectionClosedHtml({ marketTitle: LONG, closedAt: "2026-07-31T09:00:00.000Z", resolvesAt: "2026-09-30T09:00:00.000Z", marketId: "mkt_41ab77cd", payoutIfYes: 46_250, payoutIfNo: 12_400 }) },
  { name: "winNotificationHtml", html: E.winNotificationHtml({ reference: "pos_41ab77cd", payout: 46_250, stake: 25_000, marketTitle: SAFE, settledAt: "2026-07-31T09:00:00.000Z" }) },
  { name: "lossNotificationHtml", html: E.lossNotificationHtml({ reference: "pos_41ab77cd", stake: 25_000, marketTitle: SAFE, settledAt: "2026-07-31T09:00:00.000Z" }) },
  { name: "cashOutReceiptHtml", html: E.cashOutReceiptHtml({ reference: "pos_41ab77cd", value: 23_100, stake: 25_000, marketTitle: SAFE, soldAt: "2026-07-31T09:00:00.000Z", gracePeriod: false }) },
  { name: "cashOutReceiptHtml.grace", html: E.cashOutReceiptHtml({ reference: "pos_41ab77cd", value: 25_000, stake: 25_000, marketTitle: SAFE, soldAt: "2026-07-31T09:00:00.000Z", gracePeriod: true }) },
  { name: "oneSidedRefundHtml", html: E.oneSidedRefundHtml({ reference: "pos_41ab77cd", stake: 25_000, marketTitle: SAFE, settledAt: "2026-07-31T09:00:00.000Z" }) },
  { name: "marketCancelledRefundHtml", html: E.marketCancelledRefundHtml({ title: LONG, reason: "The published source retracted its result after settlement", amount: 25_000, reference: "pos_41ab77cd" }) },
  { name: "marketCancelledAdminHtml", html: E.marketCancelledAdminHtml({ title: LONG, reason: "Source retracted", refundedCount: 42, refundedTzs: 1_050_000 }) },
  { name: "marketResolutionAdminHtml", html: E.marketResolutionAdminHtml({ title: LONG, closedAt: "2026-07-31T09:00:00.000Z", reviewUrl: "/admin/resolver-queue" }) },
  { name: "bonusCreditedHtml", html: E.bonusCreditedHtml({ amountTzs: 5_000, wagerRequiredTzs: 25_000, sourceLabel: "Welcome bonus" }) },
  { name: "bonusFulfilledHtml", html: E.bonusFulfilledHtml({ amountTzs: 5_000 }) },
  { name: "referralRewardHtml", html: E.referralRewardHtml({ amount: 2_000, referredName: "Asha Mwakalinga", totalEarned: 12_000 }) },
  { name: "referralEarningHtml", html: E.referralEarningHtml({ type: "COMMISSION", amountTzs: 2_000 }) },
  { name: "inviteHtml", html: E.inviteHtml({ campaignName: "Launch week", bonusAmountTzs: 5_000, code: "ABC123", message: "Join me on 50pick — you get a bonus when you sign up." }) },
  { name: "kycSubmittedHtml", html: E.kycSubmittedHtml({ name: "Asha", reference: "kyc_41ab77cd", submittedAt: "2026-07-31T09:00:00.000Z", docTypes: ["NIDA_FRONT", "NIDA_BACK", "SELFIE"], viewUrl: "/profile/kyc" }) },
  { name: "kycApprovedHtml", html: E.kycApprovedHtml({ name: "Asha", reference: "kyc_41ab77cd" }) },
  { name: "kycRejectedHtml", html: E.kycRejectedHtml({ reason: "The photograph of the back of your ID was too blurred for our officer to read the document number.", reference: "kyc_41ab77cd" }) },
  { name: "kycMoreInfoHtml", html: E.kycMoreInfoHtml({ reason: "Please add a photograph of the back of your ID card.", reference: "kyc_41ab77cd" }) },
  { name: "kycSubmittedAdminHtml", html: E.kycSubmittedAdminHtml({ reference: "kyc_41ab77cd", phoneMasked: "+2557••••5678", name: "Asha Mwakalinga", nidaMasked: "•••• 1234", submittedAt: "2026-07-31T09:00:00.000Z", reviewUrl: "/admin/players/u1?tab=kyc" }) },
  { name: "sofSubmittedHtml", html: E.sofSubmittedHtml() },
  { name: "sofDecisionHtml", html: E.sofDecisionHtml({ status: "ACCEPTED", note: "Payslips accepted" }) },
  { name: "amlReviewAdminHtml", html: E.amlReviewAdminHtml({ amount: 2_500_000, kind: "WITHDRAWAL", reference: "wdr_95e5cddab0fb" }) },
  { name: "selfExclusionHtml", html: E.selfExclusionHtml({ period: "6 months", endDate: "31 January 2027" }) },
  { name: "coolOffHtml", html: E.coolOffHtml({ duration: "24 hours", endDate: "01 August 2026" }) },
  { name: "welcomeHtml", html: E.welcomeHtml({ name: "Asha" }) },
  { name: "loginNotificationHtml", html: E.loginNotificationHtml({ name: "Asha", time: "31 Jul 2026, 14:32 EAT", ip: "41.222.0.1" }) },
  { name: "emailVerifyHtml", html: E.emailVerifyHtml({ name: "Asha", verifyUrl: "https://50pick.tz/auth/verify-email?t=abc123" }) },
  { name: "emailChangedHtml", html: E.emailChangedHtml({ newEmail: "asha.mwakalinga@example.tz", time: "31 Jul 2026, 14:32 EAT" }) },
  { name: "passwordResetHtml", html: E.passwordResetHtml({ resetLink: "https://50pick.tz/auth/reset-password?t=abc123" }) },
  { name: "passwordChangedHtml", html: E.passwordChangedHtml({ time: "31 Jul 2026, 14:32 EAT", method: "Self-service change" }) },
  { name: "accountClosedHtml", html: E.accountClosedHtml({ name: "Asha", time: "31 Jul 2026, 14:32 EAT" }) },
  { name: "staffRoleChangedHtml", html: E.staffRoleChangedHtml({ name: "Asha", roleLabel: "COMPLIANCE", isStaff: true }) },
  { name: "proposalSubmittedHtml", html: E.proposalSubmittedHtml({ titleEn: LONG, reference: "prp_41ab77cd", submittedAt: "2026-07-31T09:00:00.000Z" }) },
  { name: "proposalSubmittedAdminHtml", html: E.proposalSubmittedAdminHtml({ reference: "prp_41ab77cd", proposer: "Asha Mwakalinga", titleEn: LONG, titleSw: "Je, Benki Kuu ya Tanzania itashikilia riba?", category: "MACRO", sourceUrl: "https://www.bot.go.tz/monetary-policy-committee-statement", reviewUrl: "/admin/proposals" }) },
  { name: "proposalApprovedHtml", html: E.proposalApprovedHtml({ titleEn: LONG, amountTzs: 5_000, wagerRequiredTzs: 25_000, queued: false }) },
  { name: "proposalListedHtml", html: E.proposalListedHtml({ titleEn: LONG, marketId: "mkt_41ab77cd" }) },
  { name: "proposalChangesHtml", html: E.proposalChangesHtml({ titleEn: LONG, note: "Please name the exact public source that will settle this." }) },
  { name: "proposalDeclinedHtml", html: E.proposalDeclinedHtml({ titleEn: LONG, reason: "Not verifiable from a public source", note: "No published figure exists on that date." }) },
  { name: "sentinelDownAdminHtml", html: E.sentinelDownAdminHtml({ reason: "anthropic-401", errorCount: 3, sampleError: "invalid x-api-key: the key provided is not valid for this account" }) },
  { name: "aiCreditLimitAdminHtml", html: E.aiCreditLimitAdminHtml({ level: "limit", spentUsd: 50, limitUsd: 50 }) },
];

// Coverage: every registered template must appear at least once.
const covered = new Set(PAGES.map((p) => p.name.split(".")[0]));
for (const t of EMAIL_TEMPLATES) ok(`${t.template} is rendered in the visual pass`, covered.has(t.template));

const WIDTHS = [360, 768, 1280, 1920];
const browser = await chromium.launch();

for (const p of PAGES) {
  const file = join(OUT, `${p.name}.html`);
  writeFileSync(file, p.html);
  for (const w of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(`file://${file.replace(/\\/g, "/")}`, { waitUntil: "load" });
    await page.waitForTimeout(120);

    // ⚠️ Passed as a STRING, not a function. `tsx`/esbuild compiles arrow
    // functions with a `keepNames` helper that references `__name`, which does
    // not exist inside the page — the first draft died with
    // "ReferenceError: __name is not defined" on the very first probe.
    const m = (await page.evaluate(`(() => {
      const de = document.documentElement;
      const card = document.querySelector("td[class*='sp-card']");
      const cta = document.querySelector("a[class*='sp-cta']");
      const mark = document.querySelector("img[class*='sp-mark']");
      const h1 = document.querySelector("h1");
      const rect = function (el) { return el ? el.getBoundingClientRect().toJSON() : null; };
      let overflowing = 0;
      const tds = document.querySelectorAll("td");
      for (let i = 0; i < tds.length; i++) {
        if (tds[i].scrollWidth > tds[i].clientWidth + 1) overflowing++;
      }
      return {
        scrollW: de.scrollWidth, clientW: de.clientWidth,
        card: rect(card), cta: rect(cta), h1: rect(h1),
        markPresent: !!mark,
        overflowingRows: overflowing,
      };
    })()`)) as {
      scrollW: number; clientW: number;
      card: DOMRect | null; cta: DOMRect | null; h1: DOMRect | null;
      markPresent: boolean; overflowingRows: number;
    };

    const tag = `${p.name} @${w}`;
    ok(`${tag}: no horizontal overflow`, m.scrollW <= m.clientW + 1, `scrollW=${m.scrollW} clientW=${m.clientW}`);
    ok(`${tag}: the card paints`, !!m.card && m.card.height > 80, `h=${m.card?.height ?? 0}`);
    ok(`${tag}: the card fits the viewport`, !!m.card && m.card.right <= w + 1, `right=${m.card?.right}`);
    ok(`${tag}: the headline paints`, !!m.h1 && m.h1.height > 10);
    ok(`${tag}: the brand mark is present`, m.markPresent);
    ok(`${tag}: no detail row overflows its cell`, m.overflowingRows === 0, `${m.overflowingRows} rows`);
    if (m.cta) {
      ok(`${tag}: CTA is a real tap target (>=44px)`, m.cta.height >= 44, `h=${Math.round(m.cta.height)}`);
      ok(`${tag}: CTA is inside the viewport`, m.cta.left >= -1 && m.cta.right <= w + 1, `l=${Math.round(m.cta.left)} r=${Math.round(m.cta.right)}`);
    }

    await page.screenshot({ path: join(OUT, `${p.name}@${w}.png`), fullPage: true });
    await page.close();
  }
}

await browser.close();
console.log(`\nshots written to ${OUT}`);
console.log(`qa:cert-c1 (email visual): ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
