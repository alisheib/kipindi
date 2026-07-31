/**
 * C1 · EMAIL TRUTH — what actually lands in the player's inbox.
 *
 * ⚠️ WHY THIS EXISTS. 50pick ships 47 transactional templates and, until this
 * suite, exactly FIVE of them had ever been rendered by a test — and that test
 * only asserted they did not THROW. It even fed
 * `welcomeHtml({ name: "<script>alert(1)</script>" })` and passed, because
 * "did not throw" was the whole assertion. Two real defects were living inside
 * that green tick:
 *
 *   1. 🔴 `heading()` did not escape, and four templates interpolate a
 *      PLAYER-CONTROLLED display name into it (`welcomeHtml`, `kycApprovedHtml`,
 *      `loginNotificationHtml`, `accountClosedHtml`). The payload above reached
 *      the recipient as live markup.
 *   2. 🔴 Three templates wrote raw HTML into `subtitle()`, which escapes — so
 *      the player READ THE MARKUP. On `selfExclusionHtml` and `coolOffHtml`
 *      (the two most compliance-sensitive mails the platform sends) and on
 *      `amlRejectRefundHtml`, the mail every FAILED PAYOUT triggers:
 *          "…contact &lt;a href=&quot;mailto:support@50pick.tz&quot;…&gt;"
 *
 * Neither is findable by reading the code — both were found by rendering the
 * template and looking at the bytes. So that is what this file does: it renders
 * ALL 47, twice (benign input and hostile input), and reads the output.
 *
 * ⛔ NO FIXTURE IS CAST. Every builder below is invoked with literal arguments
 * that TypeScript checks against the real parameter type. An `as never` fixture
 * would compile forever while the template's shape drifted underneath it.
 *
 * Every negative assertion here was broken on purpose and observed to go red —
 * see the commit message.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  EMAIL_TEMPLATES, DUAL_CHROME_TEMPLATES, NO_CTA_TEMPLATES,
} from "../src/lib/server/comms-registry.ts";
import * as E from "../src/lib/server/email.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? `\n       ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 62 - s.length))}`);

/**
 * The hostile payload, chosen so every failure mode is unambiguous in the output:
 *   `<b>`            — no template legitimately emits a <b>, so its presence is proof of injection
 *   ` onmouseover="` — an unescaped double quote escaping an attribute
 * Both survive `esc()` as harmless text (`&lt;b&gt;`, `&quot;`), so a correctly
 * escaped template contains NEITHER raw form.
 */
const HOSTILE = `<b>x</b>" onmouseover="BOOM`;
const ATTR_BREAK = ` onmouseover="`;

/** A benign value containing no angle brackets, quotes or braces at all. */
const SAFE = "Manchester United to win the derby";

type Rendered = { template: string; benign: string; hostile: string };

/**
 * All 47, built from their real types.
 *
 * `benign` proves the template reads correctly; `hostile` proves every
 * caller-supplied string reaches the page escaped. Where a builder takes several
 * free-text fields the hostile render puts the payload in EVERY one of them —
 * escaping one position and missing another is precisely the bug shape here.
 */
const RENDERS: Rendered[] = [
  { template: "depositConfirmedHtml",
    benign:  E.depositConfirmedHtml({ amount: 50_000, method: "M-Pesa", reference: "txn_a1", gatewayRef: "dep_b2", balance: 150_000 }),
    hostile: E.depositConfirmedHtml({ amount: 50_000, method: HOSTILE, reference: HOSTILE, gatewayRef: HOSTILE, balance: 1 }) },
  { template: "depositPendingHtml",
    benign:  E.depositPendingHtml({ amount: 50_000, method: "Tigo Pesa", reference: "txn_a1", gatewayRef: "dep_b2" }),
    hostile: E.depositPendingHtml({ amount: 1, method: HOSTILE, reference: HOSTILE, gatewayRef: HOSTILE }) },
  { template: "depositFailedHtml",
    benign:  E.depositFailedHtml({ amount: 50_000, method: "Airtel Money", reference: "txn_a1", gatewayRef: "dep_b2", reason: "Insufficient funds" }),
    hostile: E.depositFailedHtml({ amount: 1, method: HOSTILE, reference: HOSTILE, gatewayRef: HOSTILE, reason: HOSTILE }) },
  { template: "depositReversedHtml",
    benign:  E.depositReversedHtml({ amount: 50_000, method: "M-Pesa", reference: "txn_a1", gatewayRef: "dep_b2" }),
    hostile: E.depositReversedHtml({ amount: 1, method: HOSTILE, reference: HOSTILE, gatewayRef: HOSTILE }) },
  { template: "withdrawalSentHtml",
    benign:  E.withdrawalSentHtml({ amount: 20_000, destination: "M-Pesa", destinationPhone: "+255712345678", reference: "wdr_a1", gatewayRef: "sel_b2", railLabel: "Selcom Pesa", railNote: null }),
    hostile: E.withdrawalSentHtml({ amount: 1, destination: HOSTILE, destinationPhone: HOSTILE, reference: HOSTILE, gatewayRef: HOSTILE, railLabel: HOSTILE, railNote: { en: HOSTILE, sw: HOSTILE } }) },
  { template: "withdrawalUnderReviewHtml",
    benign:  E.withdrawalUnderReviewHtml({ amount: 2_000_000, reference: "wdr_a1" }),
    hostile: E.withdrawalUnderReviewHtml({ amount: 1, reference: HOSTILE }) },
  { template: "amlRejectRefundHtml",
    benign:  E.amlRejectRefundHtml({ amount: 15_000, reason: "Rail refused the payout", reference: "wdr_a1", gatewayRef: "sel_b2", railLabel: "Selcom Pesa" }),
    hostile: E.amlRejectRefundHtml({ amount: 1, reason: HOSTILE, reference: HOSTILE, gatewayRef: HOSTILE, railLabel: HOSTILE }) },
  { template: "betPlacedHtml",
    benign:  E.betPlacedHtml({ reference: "pos_a1", side: "YES", stake: 10_000, marketTitle: SAFE, placedAt: "2026-07-31T09:00:00.000Z", resolutionDate: "01 Aug 2026", cashOutFeeRate: 0.1, freeExitGraceMinutes: 5, paidExitWindowMinutes: 0 }),
    hostile: E.betPlacedHtml({ reference: HOSTILE, side: "NO", stake: 1, marketTitle: HOSTILE, placedAt: HOSTILE, resolutionDate: HOSTILE, cashOutFeeRate: 0.1, freeExitGraceMinutes: 5, paidExitWindowMinutes: 30 }) },
  { template: "selectionClosedHtml",
    benign:  E.selectionClosedHtml({ marketTitle: SAFE, closedAt: "2026-07-31T09:00:00.000Z", resolvesAt: "2026-08-01T09:00:00.000Z", marketId: "mkt_a1", payoutIfYes: 18_500, payoutIfNo: null }),
    hostile: E.selectionClosedHtml({ marketTitle: HOSTILE, closedAt: HOSTILE, resolvesAt: HOSTILE, marketId: HOSTILE, payoutIfYes: 1, payoutIfNo: 2 }) },
  { template: "winNotificationHtml",
    benign:  E.winNotificationHtml({ reference: "pos_a1", payout: 18_500, stake: 10_000, marketTitle: SAFE, settledAt: "2026-07-31T09:00:00.000Z" }),
    hostile: E.winNotificationHtml({ reference: HOSTILE, payout: 2, stake: 1, marketTitle: HOSTILE, settledAt: HOSTILE }) },
  { template: "lossNotificationHtml",
    benign:  E.lossNotificationHtml({ reference: "pos_a1", stake: 10_000, marketTitle: SAFE, settledAt: "2026-07-31T09:00:00.000Z" }),
    hostile: E.lossNotificationHtml({ reference: HOSTILE, stake: 1, marketTitle: HOSTILE, settledAt: HOSTILE }) },
  { template: "cashOutReceiptHtml",
    benign:  E.cashOutReceiptHtml({ reference: "pos_a1", value: 9_500, stake: 10_000, marketTitle: SAFE, soldAt: "2026-07-31T09:00:00.000Z", gracePeriod: false }),
    hostile: E.cashOutReceiptHtml({ reference: HOSTILE, value: 1, stake: 2, marketTitle: HOSTILE, soldAt: HOSTILE, gracePeriod: true }) },
  { template: "oneSidedRefundHtml",
    benign:  E.oneSidedRefundHtml({ reference: "pos_a1", stake: 10_000, marketTitle: SAFE, settledAt: "2026-07-31T09:00:00.000Z" }),
    hostile: E.oneSidedRefundHtml({ reference: HOSTILE, stake: 1, marketTitle: HOSTILE, settledAt: HOSTILE }) },
  { template: "marketCancelledRefundHtml",
    benign:  E.marketCancelledRefundHtml({ title: SAFE, reason: "Source retracted the result", amount: 10_000, reference: "pos_a1" }),
    hostile: E.marketCancelledRefundHtml({ title: HOSTILE, reason: HOSTILE, amount: 1, reference: HOSTILE }) },
  { template: "marketCancelledAdminHtml",
    benign:  E.marketCancelledAdminHtml({ title: SAFE, reason: "Source retracted", refundedCount: 12, refundedTzs: 120_000 }),
    hostile: E.marketCancelledAdminHtml({ title: HOSTILE, reason: HOSTILE, refundedCount: 0, refundedTzs: 0 }) },
  { template: "marketResolutionAdminHtml",
    benign:  E.marketResolutionAdminHtml({ title: SAFE, closedAt: "2026-07-31T09:00:00.000Z", reviewUrl: "/admin/resolver-queue" }),
    hostile: E.marketResolutionAdminHtml({ title: HOSTILE, closedAt: HOSTILE, reviewUrl: "/admin/resolver-queue" }) },
  { template: "bonusCreditedHtml",
    benign:  E.bonusCreditedHtml({ amountTzs: 5_000, wagerRequiredTzs: 25_000, sourceLabel: "Welcome bonus" }),
    hostile: E.bonusCreditedHtml({ amountTzs: 1, wagerRequiredTzs: 2, sourceLabel: HOSTILE }) },
  { template: "bonusFulfilledHtml",
    benign:  E.bonusFulfilledHtml({ amountTzs: 5_000 }),
    hostile: E.bonusFulfilledHtml({ amountTzs: 0 }) },
  { template: "referralRewardHtml",
    benign:  E.referralRewardHtml({ amount: 2_000, referredName: "Asha M.", totalEarned: 12_000 }),
    hostile: E.referralRewardHtml({ amount: 1, referredName: HOSTILE, totalEarned: 2 }) },
  { template: "referralEarningHtml",
    benign:  E.referralEarningHtml({ type: "COMMISSION", amountTzs: 2_000 }),
    hostile: E.referralEarningHtml({ type: "PRIZE", amountTzs: 0 }) },
  { template: "inviteHtml",
    benign:  E.inviteHtml({ campaignName: "Launch week", bonusAmountTzs: 5_000, code: "ABC123", message: "Join me on 50pick" }),
    hostile: E.inviteHtml({ campaignName: HOSTILE, bonusAmountTzs: 1, code: HOSTILE, message: HOSTILE }) },
  { template: "kycSubmittedHtml",
    benign:  E.kycSubmittedHtml({ name: "Asha", reference: "kyc_a1", submittedAt: "2026-07-31T09:00:00.000Z", docTypes: ["NIDA_FRONT", "SELFIE"], viewUrl: "/profile/kyc" }),
    hostile: E.kycSubmittedHtml({ name: HOSTILE, reference: HOSTILE, submittedAt: HOSTILE, docTypes: [HOSTILE], viewUrl: "/profile/kyc" }) },
  { template: "kycApprovedHtml",
    benign:  E.kycApprovedHtml({ name: "Asha", reference: "kyc_a1" }),
    hostile: E.kycApprovedHtml({ name: HOSTILE, reference: HOSTILE }) },
  { template: "kycRejectedHtml",
    benign:  E.kycRejectedHtml({ reason: "The ID photograph was too blurred to read", reference: "kyc_a1" }),
    hostile: E.kycRejectedHtml({ reason: HOSTILE, reference: HOSTILE }) },
  { template: "kycMoreInfoHtml",
    benign:  E.kycMoreInfoHtml({ reason: "Please add the back of your ID", reference: "kyc_a1" }),
    hostile: E.kycMoreInfoHtml({ reason: HOSTILE, reference: HOSTILE }) },
  { template: "kycSubmittedAdminHtml",
    benign:  E.kycSubmittedAdminHtml({ reference: "kyc_a1", phoneMasked: "+2557••••5678", name: "Asha M.", nidaMasked: "••••1234", submittedAt: "2026-07-31T09:00:00.000Z", reviewUrl: "/admin/players/u1?tab=kyc" }),
    hostile: E.kycSubmittedAdminHtml({ reference: HOSTILE, phoneMasked: HOSTILE, name: HOSTILE, nidaMasked: HOSTILE, submittedAt: HOSTILE, reviewUrl: "/admin/players/u1?tab=kyc" }) },
  { template: "sofSubmittedHtml",
    benign:  E.sofSubmittedHtml(),
    hostile: E.sofSubmittedHtml() },
  { template: "sofDecisionHtml",
    benign:  E.sofDecisionHtml({ status: "ACCEPTED", note: "Payslips accepted" }),
    hostile: E.sofDecisionHtml({ status: "REJECTED", note: HOSTILE }) },
  { template: "amlReviewAdminHtml",
    benign:  E.amlReviewAdminHtml({ amount: 2_000_000, kind: "WITHDRAWAL", reference: "wdr_a1" }),
    hostile: E.amlReviewAdminHtml({ amount: 1, kind: HOSTILE, reference: HOSTILE }) },
  { template: "selfExclusionHtml",
    benign:  E.selfExclusionHtml({ period: "6 months", endDate: "31 Jan 2027" }),
    hostile: E.selfExclusionHtml({ period: HOSTILE, endDate: HOSTILE }) },
  { template: "coolOffHtml",
    benign:  E.coolOffHtml({ duration: "24 hours", endDate: "01 Aug 2026" }),
    hostile: E.coolOffHtml({ duration: HOSTILE, endDate: HOSTILE }) },
  { template: "welcomeHtml",
    benign:  E.welcomeHtml({ name: "Asha" }),
    hostile: E.welcomeHtml({ name: HOSTILE }) },
  { template: "loginNotificationHtml",
    benign:  E.loginNotificationHtml({ name: "Asha", time: "31 Jul 2026, 14:32 EAT", ip: "41.222.0.1" }),
    hostile: E.loginNotificationHtml({ name: HOSTILE, time: HOSTILE, ip: HOSTILE }) },
  { template: "emailVerifyHtml",
    benign:  E.emailVerifyHtml({ name: "Asha", verifyUrl: "https://50pick.tz/auth/verify-email?t=abc" }),
    hostile: E.emailVerifyHtml({ name: HOSTILE, verifyUrl: "https://50pick.tz/auth/verify-email?t=abc" }) },
  { template: "emailChangedHtml",
    benign:  E.emailChangedHtml({ newEmail: "asha@example.tz", time: "31 Jul 2026, 14:32 EAT" }),
    hostile: E.emailChangedHtml({ newEmail: HOSTILE, time: HOSTILE }) },
  { template: "passwordResetHtml",
    benign:  E.passwordResetHtml({ resetLink: "https://50pick.tz/auth/reset-password?t=abc" }),
    hostile: E.passwordResetHtml({ resetLink: "https://50pick.tz/auth/reset-password?t=abc" }) },
  { template: "passwordChangedHtml",
    benign:  E.passwordChangedHtml({ time: "31 Jul 2026, 14:32 EAT", method: "Self-service change" }),
    hostile: E.passwordChangedHtml({ time: HOSTILE, method: HOSTILE }) },
  { template: "accountClosedHtml",
    benign:  E.accountClosedHtml({ name: "Asha", time: "31 Jul 2026, 14:32 EAT" }),
    hostile: E.accountClosedHtml({ name: HOSTILE, time: HOSTILE }) },
  { template: "staffRoleChangedHtml",
    benign:  E.staffRoleChangedHtml({ name: "Asha", roleLabel: "COMPLIANCE", isStaff: true }),
    hostile: E.staffRoleChangedHtml({ name: HOSTILE, roleLabel: HOSTILE, isStaff: false }) },
  { template: "proposalSubmittedHtml",
    benign:  E.proposalSubmittedHtml({ titleEn: SAFE, reference: "prp_a1", submittedAt: "2026-07-31T09:00:00.000Z" }),
    hostile: E.proposalSubmittedHtml({ titleEn: HOSTILE, reference: HOSTILE, submittedAt: HOSTILE }) },
  { template: "proposalSubmittedAdminHtml",
    benign:  E.proposalSubmittedAdminHtml({ reference: "prp_a1", proposer: "Asha M.", titleEn: SAFE, titleSw: "Timu ipi itashinda", category: "SPORT", sourceUrl: "https://bbc.co.uk/sport", reviewUrl: "/admin/proposals" }),
    hostile: E.proposalSubmittedAdminHtml({ reference: HOSTILE, proposer: HOSTILE, titleEn: HOSTILE, titleSw: HOSTILE, category: HOSTILE, sourceUrl: HOSTILE, reviewUrl: "/admin/proposals" }) },
  { template: "proposalApprovedHtml",
    benign:  E.proposalApprovedHtml({ titleEn: SAFE, amountTzs: 5_000, wagerRequiredTzs: 25_000, queued: false }),
    hostile: E.proposalApprovedHtml({ titleEn: HOSTILE, amountTzs: 1, wagerRequiredTzs: 2, queued: true }) },
  { template: "proposalListedHtml",
    benign:  E.proposalListedHtml({ titleEn: SAFE, marketId: "mkt_a1" }),
    hostile: E.proposalListedHtml({ titleEn: HOSTILE, marketId: HOSTILE }) },
  { template: "proposalChangesHtml",
    benign:  E.proposalChangesHtml({ titleEn: SAFE, note: "Please name the source" }),
    hostile: E.proposalChangesHtml({ titleEn: HOSTILE, note: HOSTILE }) },
  { template: "proposalDeclinedHtml",
    benign:  E.proposalDeclinedHtml({ titleEn: SAFE, reason: "Not verifiable", note: "No public source" }),
    hostile: E.proposalDeclinedHtml({ titleEn: HOSTILE, reason: HOSTILE, note: HOSTILE }) },
  { template: "sentinelDownAdminHtml",
    benign:  E.sentinelDownAdminHtml({ reason: "anthropic-401", errorCount: 3, sampleError: "invalid x-api-key" }),
    hostile: E.sentinelDownAdminHtml({ reason: HOSTILE, errorCount: 0, sampleError: HOSTILE }) },
  { template: "aiCreditLimitAdminHtml",
    benign:  E.aiCreditLimitAdminHtml({ level: "warn", spentUsd: 40, limitUsd: 50 }),
    hostile: E.aiCreditLimitAdminHtml({ level: "limit", spentUsd: 50, limitUsd: 50 }) },
];

// ── 1 · The registry is the inventory, and it matches reality ───────────────────
section("1 · registry ↔ code — nothing unregistered, nothing phantom");

const emailSrc = read("src/lib/server/email.ts");
const exported = [...emailSrc.matchAll(/^export function ([a-zA-Z]+Html)/gm)].map((m) => m[1]);
const registered = EMAIL_TEMPLATES.map((t) => t.template);

ok("every exported *Html template is registered",
  exported.every((n) => registered.includes(n)),
  `unregistered: ${exported.filter((n) => !registered.includes(n)).join(", ") || "-"}`);
ok("every registered template is actually exported",
  registered.every((n) => exported.includes(n)),
  `phantom: ${registered.filter((n) => !exported.includes(n)).join(", ") || "-"}`);
ok("no template is registered twice",
  new Set(registered).size === registered.length);
ok("every template is rendered by this suite",
  exported.every((n) => RENDERS.some((r) => r.template === n)),
  `never rendered: ${exported.filter((n) => !RENDERS.some((r) => r.template === n)).join(", ") || "-"}`);
ok(`the inventory is 47 templates (found ${exported.length})`, exported.length === 47);

// ── 2 · Every template has a real sender ───────────────────────────────────────
section("2 · wiring — a template with no sender is a template nobody gets");

for (const spec of EMAIL_TEMPLATES) {
  const src = read(spec.trigger);
  ok(`${spec.template} is referenced by ${spec.trigger.split("/").pop()}`, src.includes(spec.template));
  // Static proof that the reference is a SEND, not merely an import: the builder
  // must appear within 8 lines of a sendEmail/sendEmailToUser call.
  //
  // Two shapes are legitimate and both must count, or the gate rejects correct
  // code: the builder called INLINE inside the send, and the builder assigned to
  // a local that the send then passes (`kyc-service` does the latter, with a
  // multi-line object literal between the two — an 8-line window missed it and
  // reported a correctly-wired template as unwired).
  const lines = src.split(/\r?\n/);
  const uses = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.includes(spec.template) && !/^\s*import\b/.test(l) && !l.includes("} from"));
  const nearSend = uses.some(({ i }) =>
    lines.slice(Math.max(0, i - 10), i + 4).some((l) => /sendEmail\b|sendEmailToUser\b/.test(l)));
  // One hop: `const html = template({…})` … later `html:` inside a send.
  const viaLocal = uses.some(({ l }) => {
    const bind = l.match(/(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*\w*\.?\s*$|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/);
    const name = bind?.[1] ?? bind?.[2];
    if (!name) return false;
    return new RegExp(`html:\\s*${name}\\b`).test(src);
  });
  ok(`${spec.template} sits inside a send call`, nearSend || viaLocal);
}

// ── 3 · The bytes the player receives ──────────────────────────────────────────
section("3 · rendered output — read it, do not reason about it");

for (const r of RENDERS) {
  // 3a — ESCAPED-TAG LEAKAGE. Benign inputs contain no angle brackets, so any
  // `&lt;` in the output means the template wrote markup into an escaping helper
  // and the player will READ the tag. This is the selfExclusion/coolOff/AML bug.
  ok(`${r.template}: no HTML markup rendered as visible text`, !r.benign.includes("&lt;"),
    firstEscapedTag(r.benign));

  // 3b — INJECTION. `<b>` is emitted by no template, so its presence proves a
  // caller string reached the page unescaped.
  ok(`${r.template}: hostile input cannot inject a tag`, !r.hostile.includes("<b>"));
  ok(`${r.template}: hostile input cannot break out of an attribute`, !r.hostile.includes(ATTR_BREAK));

  // 3c — PLACEHOLDER LEAKAGE. A template that lost an argument prints the fault.
  for (const bad of ["undefined", "[object Object]", "NaN", "${"]) {
    ok(`${r.template}: no "${bad}" in the body`, !r.benign.includes(bad));
  }
  ok(`${r.template}: no unreplaced {placeholder}`, !/\{[a-zA-Z][a-zA-Z0-9_]*\}/.test(stripStyle(r.benign)));

  // 3d — STRUCTURE. Every mail must be a complete document with the brand mark
  // and the licence footer; a fragment renders as a wall of text in some clients.
  ok(`${r.template}: is a complete HTML document`, r.benign.startsWith("<!DOCTYPE html>") && r.benign.trimEnd().endsWith("</html>"));
  ok(`${r.template}: carries the 18+ / GBT licence footer`, r.benign.includes("18+") && r.benign.includes("Gaming Board of Tanzania"));
  ok(`${r.template}: carries the helpline`, r.benign.includes("+255 22 211 5811"));

  // 3e — LINKS. A relative href is dead in an inbox.
  const hrefs = [...r.benign.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  ok(`${r.template}: every link is absolute or mailto`, hrefs.every((h) => /^(https?:\/\/|mailto:)/.test(h)),
    hrefs.filter((h) => !/^(https?:\/\/|mailto:)/.test(h)).join(", "));

  // 3f — PLAIN-TEXT DEGRADATION. Postmark ships `stripHtml(html)` as the text
  // part; if that is empty or still full of markup, a plain-text client shows junk.
  const text = plain(r.benign);
  ok(`${r.template}: degrades to readable plain text`, text.length > 40 && !text.includes("<") && !text.includes("{"),
    text.slice(0, 90));

  // 3g — NO EMOJI in player-facing copy (CLAUDE.md design rule).
  ok(`${r.template}: no emoji in the copy`, !hasEmoji(stripStyle(r.benign)));
}

// ── 3h · The escaping helpers themselves ───────────────────────────────────────
section("3h · helpers — every interpolation point escapes");

// 🔴 Found by the red proof, not by reading: un-escaping the CTA *label* left
// every artifact assertion GREEN, because no template passes caller data into a
// label today. An assertion that cannot fail is not a guard — so the helper's
// contract is pinned directly. If someone writes `ctaButton(url, playerName)`
// tomorrow, the escaping is already there and this keeps it there.
const cta = emailSrc.slice(emailSrc.indexOf("function ctaButton"), emailSrc.indexOf("function stripHtml"));
ok("ctaButton escapes its href", /const href = esc\(link\(hrefOrPath\)\)/.test(cta));
ok("ctaButton escapes its label", /const safeLabel = esc\(label\)/.test(cta));
ok("ctaButton emits no raw ${label}", !cta.includes("${label}"));
const hdr = emailSrc.slice(emailSrc.indexOf("function heading"), emailSrc.indexOf("/** Escape HTML entities"));
ok("heading escapes its text", hdr.includes("${esc(text)}"));
const eyeb = emailSrc.slice(emailSrc.indexOf("function eyebrow"), emailSrc.indexOf("function heading"));
ok("eyebrow escapes both labels", eyeb.includes("${esc(en)}") && eyeb.includes("${esc(sw)}"));
ok("subtitle escapes", /function subtitle\(text: string\)[\s\S]{0,240}\$\{esc\(text\)\}/.test(emailSrc));
ok("detailRows escapes label and value",
  /function detailRows[\s\S]{0,1400}\$\{esc\(r\.label\)\}[\s\S]{0,600}\$\{esc\(r\.value\)\}/.test(emailSrc));

// ── 4 · Gold discipline — gold means money EARNED, nothing else ────────────────
section("4 · gold discipline — the chrome must match what happened");

const bodies = splitTemplates(emailSrc);
for (const spec of EMAIL_TEMPLATES) {
  const body = bodies[spec.template] ?? "";
  const usesGold = /wrapGold\(/.test(body);
  const usesRoyal = /[^d]wrap\(/.test(body);
  if (DUAL_CHROME_TEMPLATES.includes(spec.template)) {
    ok(`${spec.template}: branches between gold and royal (declared dual)`, usesGold && usesRoyal);
  } else {
    ok(`${spec.template}: chrome is ${spec.chrome} as registered`,
      spec.chrome === "gold" ? usesGold && !usesRoyal : usesRoyal && !usesGold);
  }
}
// The law itself: a mail may only be gold if money or status was EARNED.
for (const spec of EMAIL_TEMPLATES.filter((t) => t.chrome === "gold")) {
  ok(`${spec.template}: gold is justified (money-in or earned status)`,
    spec.money || spec.template === "kycApprovedHtml",
    "gold on a non-money, non-earned-status email breaks the gold budget");
}
// Loss and failure may NEVER be gold — the most direct form of misleading chrome.
for (const t of ["lossNotificationHtml", "depositFailedHtml", "depositReversedHtml", "amlRejectRefundHtml", "withdrawalUnderReviewHtml"]) {
  ok(`${t}: is NOT gold — nothing was earned`, !/wrapGold\(/.test(bodies[t] ?? "x"));
}

// ── 5 · Money-adjacent copy is compliance copy ─────────────────────────────────
section("5 · money copy — direct language, no euphemism, no invented promise");

const byName = Object.fromEntries(RENDERS.map((r) => [r.template, r.benign]));

// LCCP harm-prevention: a loss must be named, plainly, with the amount.
const lossText = plain(byName.lossNotificationHtml);
ok("loss email says 'Bet lost' outright", /Bet lost/.test(lossText));
ok("loss email states the amount lost", /TZS\s?10,000/.test(lossText));
ok("loss email offers a limits route", byName.lossNotificationHtml.includes("/profile/responsible-gambling"));
for (const euphemism of ["better luck", "unlucky", "so close", "try again to win", "win it back"]) {
  ok(`loss email avoids the euphemism "${euphemism}"`, !lossText.toLowerCase().includes(euphemism));
}

// A failed deposit must lead with "no money was taken" — the sentence that stops
// a player opening a card dispute over a charge that never happened.
const failedText = plain(byName.depositFailedHtml);
ok("failed-deposit email states no money was taken", /No money was taken/i.test(failedText));
ok("failed-deposit email says the balance is unchanged", /balance is unchanged/i.test(failedText));

// A reversed deposit must NOT invite the excluded player back into the funnel.
ok("reversed-deposit email has no deposit CTA", !byName.depositReversedHtml.includes("/wallet/deposit"));
ok("reversed-deposit email confirms the exclusion stands", /exclusion stays in place/i.test(plain(byName.depositReversedHtml)));

// A returned withdrawal must say the money came back, and be traceable.
const amlText = plain(byName.amlRejectRefundHtml);
ok("returned-withdrawal email says the money is back", /returned to your wallet/i.test(amlText));
ok("returned-withdrawal email carries our reference", amlText.includes("wdr_a1"));
ok("returned-withdrawal email carries the gateway reference", amlText.includes("sel_b2"));
ok("returned-withdrawal email names the rail it was attempted on", amlText.includes("Selcom Pesa"));

// The one email that quotes an exact payout must say it is exact, not a forecast.
const closedText = plain(byName.selectionClosedHtml);
ok("selection-closed email states the figure is exact", /not an estimate/i.test(closedText));
ok("selection-closed email prints the payout", /TZS\s?18,500/.test(closedText));

// The bet receipt must NOT print a pre-close payout projection (D3 policy).
const betText = plain(byName.betPlacedHtml);
ok("bet-placed email prints no potential-return figure", !/potential return/i.test(betText));
// The exit terms come from the poll's FROZEN snapshot, never a hardcoded number —
// hardcoding "5 minutes / 9%" is how this copy started lying once. Both branches
// are checked: with no paid tail the mail must say selling CLOSES, and with one
// it must quote that poll's own fee rate.
ok("bet-placed email quotes the poll's own free-exit window", betText.includes("5-min free exit"));
ok("bet-placed email (no paid tail) says selling closes at the window",
  /selling closes and the bet rides to settlement/i.test(betText));
const betPaid = plain(E.betPlacedHtml({ reference: "pos_a2", side: "YES", stake: 10_000, marketTitle: SAFE, resolutionDate: "01 Aug 2026", cashOutFeeRate: 0.07, freeExitGraceMinutes: 3, paidExitWindowMinutes: 30 }));
ok("bet-placed email (paid tail) quotes THAT poll's fee, not a constant",
  betPaid.includes("3-min free exit") && betPaid.includes("7%") && !betPaid.includes("10%"));

// ── 6 · Send-path contract ─────────────────────────────────────────────────────
section("6 · sendEmail contract — a non-delivery must never read as a delivery");

const stub1 = await E.sendEmail({ to: "someone@example.tz", subject: "s", html: "<p>x</p>" });
ok("no provider configured → reason 'stub', never 'sent'", stub1.reason === "stub", stub1.reason);
const none = await E.sendEmail({ to: "0712@none", subject: "s", html: "<p>x</p>" });
ok("an address-less user is reported as 'no-address'", none.reason === "no-address", none.reason);
ok("sendEmail never throws for any input",
  (await E.sendEmail({ to: "", subject: "", html: "" }).then(() => true, () => false)));

console.log(`\ncert-c1 (email truth): ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

/* ── helpers ─────────────────────────────────────────────────────────────── */

/** Drop <style> and inline style="…" so CSS braces never read as placeholders. */
function stripStyle(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/style="[^"]*"/g, "");
}

/** What Postmark sends as the text part — the same transform `sendEmail` uses. */
function plain(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Show the offending fragment so a failure is diagnosable without a debugger. */
function firstEscapedTag(html: string): string {
  const i = html.indexOf("&lt;");
  return i < 0 ? "" : `…${html.slice(Math.max(0, i - 60), i + 80)}…`;
}

function hasEmoji(s: string): boolean {
  // Pictographs and dingbats. Excludes the typographic marks the kit uses on
  // purpose (·, —, ✓ is not used in mail) and the variation selector alone.
  return /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(s);
}

/** Slice email.ts into { templateName: sourceBody } so chrome can be checked. */
function splitTemplates(src: string): Record<string, string> {
  const marks = [...src.matchAll(/^export function ([a-zA-Z]+Html)/gm)].map((m) => ({ name: m[1], at: m.index ?? 0 }));
  const out: Record<string, string> = {};
  marks.forEach((m, i) => { out[m.name] = src.slice(m.at, marks[i + 1]?.at ?? src.length); });
  return out;
}
