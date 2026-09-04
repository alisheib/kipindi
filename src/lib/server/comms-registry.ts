/**
 * C · COMMUNICATIONS — the inventory.
 *
 * Every message 50pick can send, declared once. This file is the thing the
 * `test:cert-c1` / `test:cert-c3` gates measure the code against: add a template
 * and forget to register it, register one that does not exist, move a trigger, or
 * change an email's chrome, and a named gate goes red.
 *
 * ⚠️ It is a REGISTRY, not documentation. Nothing here is believed on its own —
 * every field is cross-checked against `email.ts` / `notification-service.ts` by
 * the gates. A registry nobody verifies is the same defect as a hardcoded green
 * tick on a compliance page.
 *
 * ── THE CHANNEL PICTURE, measured on production 2026-07-31 ───────────────────
 *
 * `NotificationChannel` has four members. Exactly one is reachable: `prisma-dal`
 * writes the literal `"IN_APP"` and there is no other writer, so all 1,673 rows
 * are IN_APP and always will be. **That is the design, not a bug** — the
 * `Notification` table is the in-app inbox, and email is a separate rail with its
 * own record (Postmark + the audit chain). What IS a defect is a schema that
 * advertises PUSH/SMS/EMAIL delivery it cannot perform — recorded in the C1/C3
 * dossiers of `docs/MODULE-CERTIFICATION-PROGRAM.md`.
 *
 * Three more columns were dead alongside it, measured the same day, and here is
 * where each one stands after this pass:
 *   · `sentAt` — was 0 of 1,673. **NOW WRITTEN.** For an IN_APP notification,
 *     delivery IS the row becoming visible in the bell, so the timestamp is
 *     knowable exactly at insert. "Was it delivered?" now has an answer.
 *   · `failedAt` / `failureReason` — still unwritten, and honestly so: the only
 *     thing that can fail for an IN_APP row is the DB write itself, and a failed
 *     write cannot record its own failure in the same table. ⚠️ They are NOT a
 *     record of email or push outcomes; email health lives on `/api/health`
 *     (`emailHealth()`) and in the audit chain (`email.provider_down`).
 *   · `priority` — `NORMAL` on all 1,673; the other three enum members unused.
 *   · `event` — the DAL writes `event: n.kind`, so it is a duplicate of `kind`,
 *     not the dotted `bet.won` / `kyc.approved` the schema comment promises.
 *     ⛔ Correcting the schema comment needs the KYC lane's sign-off — that file
 *     is theirs this round. Flagged, not taken.
 *
 * So the honest shape of the matrix is:
 *
 *   IN_APP  · 36 emitters · 3 language fields per row (en/sw/zh) · the bell
 *   EMAIL   · 47 templates · ONE bilingual EN+SW message, locale-independent
 *   PUSH    · fan-out of the IN_APP row, in the recipient's locale, no record
 *   SMS     · OTP only, outside this module (`sms.ts`) — never a Notification row
 */

/* ══ EMAIL ══════════════════════════════════════════════════════════════════ */

/** Who reads it. Officer mail may name internal state; player mail may not. */
export type EmailAudience = "player" | "officer";

/** Card chrome. Gold is reserved for earned money / earned status / money-in. */
export type EmailChrome = "gold" | "royal";

export type EmailSpec = {
  /** Exported builder in `email.ts`. Must exist, and must be the only entry for it. */
  template: string;
  /** Repo-relative module that owns the trigger and must reference the template. */
  trigger: string;
  audience: EmailAudience;
  chrome: EmailChrome;
  /** True when the message states, moves or accounts for a player's money. */
  money: boolean;
};

/**
 * All 49 transactional templates.
 *
 * `chrome` is asserted against the actual `wrap` / `wrapGold` call in the
 * builder — the gold-discipline law (gold ONLY on earned money / earned status)
 * is otherwise a comment nobody enforces.
 */
export const EMAIL_TEMPLATES: readonly EmailSpec[] = [
  // ── Money in ──────────────────────────────────────────────────────────────
  { template: "depositConfirmedHtml",      trigger: "src/lib/server/wallet-service.ts",    audience: "player",  chrome: "gold",  money: true },
  { template: "depositPendingHtml",        trigger: "src/lib/server/wallet-service.ts",    audience: "player",  chrome: "royal", money: true },
  { template: "depositFailedHtml",         trigger: "src/lib/server/wallet-service.ts",    audience: "player",  chrome: "royal", money: true },
  { template: "depositReversedHtml",       trigger: "src/lib/server/wallet-service.ts",    audience: "player",  chrome: "royal", money: true },
  // ── Money out ─────────────────────────────────────────────────────────────
  { template: "withdrawalSentHtml",        trigger: "src/lib/server/wallet-service.ts",    audience: "player",  chrome: "royal", money: true },
  { template: "withdrawalUnderReviewHtml", trigger: "src/lib/server/wallet-service.ts",    audience: "player",  chrome: "royal", money: true },
  { template: "amlRejectRefundHtml",       trigger: "src/lib/server/wallet-service.ts",    audience: "player",  chrome: "royal", money: true },
  // ── Betting & settlement ──────────────────────────────────────────────────
  { template: "betPlacedHtml",             trigger: "src/lib/server/market-service.ts",    audience: "player",  chrome: "royal", money: true },
  { template: "selectionClosedHtml",       trigger: "src/lib/server/market-service.ts",    audience: "player",  chrome: "royal", money: true },
  { template: "winNotificationHtml",       trigger: "src/lib/server/market-service.ts",    audience: "player",  chrome: "gold",  money: true },
  { template: "lossNotificationHtml",      trigger: "src/lib/server/market-service.ts",    audience: "player",  chrome: "royal", money: true },
  { template: "cashOutReceiptHtml",        trigger: "src/lib/server/market-service.ts",    audience: "player",  chrome: "royal", money: true },
  { template: "oneSidedRefundHtml",        trigger: "src/lib/server/market-service.ts",    audience: "player",  chrome: "royal", money: true },
  // Up & Down's ONE player-facing message (E-37). Royal even on a winning day —
  // see the gold-discipline note on the template itself.
  { template: "updownDigestHtml",          trigger: "src/lib/server/updown-digest.ts",     audience: "player",  chrome: "royal", money: true },
  { template: "marketCancelledRefundHtml", trigger: "src/lib/server/market-service.ts",    audience: "player",  chrome: "royal", money: true },
  { template: "marketCancelledAdminHtml",  trigger: "src/lib/server/market-service.ts",    audience: "officer", chrome: "royal", money: true },
  { template: "marketResolutionAdminHtml", trigger: "src/lib/server/market-service.ts",    audience: "officer", chrome: "royal", money: false },
  // ── Bonus ─────────────────────────────────────────────────────────────────
  { template: "bonusCreditedHtml",         trigger: "src/lib/server/bonus-service.ts",     audience: "player",  chrome: "gold",  money: true },
  { template: "bonusFulfilledHtml",        trigger: "src/lib/server/bonus-service.ts",     audience: "player",  chrome: "gold",  money: true },
  // ── Affiliate ─────────────────────────────────────────────────────────────
  { template: "referralRewardHtml",        trigger: "src/lib/server/affiliate-service.ts", audience: "player",  chrome: "gold",  money: true },
  { template: "referralEarningHtml",       trigger: "src/lib/server/affiliate-service.ts", audience: "player",  chrome: "gold",  money: true },
  { template: "inviteHtml",                trigger: "src/lib/server/invite-service.ts",    audience: "player",  chrome: "gold",  money: true },
  // ── Identity & compliance ─────────────────────────────────────────────────
  { template: "kycSubmittedHtml",          trigger: "src/lib/server/kyc-service.ts",       audience: "player",  chrome: "royal", money: false },
  { template: "kycApprovedHtml",           trigger: "src/lib/server/kyc-service.ts",       audience: "player",  chrome: "gold",  money: false },
  { template: "kycRejectedHtml",           trigger: "src/lib/server/kyc-service.ts",       audience: "player",  chrome: "royal", money: false },
  { template: "kycMoreInfoHtml",           trigger: "src/lib/server/kyc-service.ts",       audience: "player",  chrome: "royal", money: false },
  { template: "kycSubmittedAdminHtml",     trigger: "src/lib/server/kyc-service.ts",       audience: "officer", chrome: "royal", money: false },
  { template: "sofSubmittedHtml",          trigger: "src/app/profile/source-of-funds/actions.ts", audience: "player",  chrome: "royal", money: false },
  { template: "sofDecisionHtml",           trigger: "src/app/admin/approvals/actions.ts",  audience: "player",  chrome: "royal", money: false },
  { template: "amlReviewAdminHtml",        trigger: "src/lib/server/notification-service.ts", audience: "officer", chrome: "royal", money: true },
  // ── Responsible gambling ──────────────────────────────────────────────────
  { template: "selfExclusionHtml",         trigger: "src/lib/server/responsible-gambling.ts", audience: "player", chrome: "royal", money: false },
  { template: "coolOffHtml",               trigger: "src/lib/server/responsible-gambling.ts", audience: "player", chrome: "royal", money: false },
  // ── Account & security ────────────────────────────────────────────────────
  { template: "welcomeHtml",               trigger: "src/lib/server/auth-service.ts",      audience: "player",  chrome: "royal", money: false },
  { template: "loginNotificationHtml",     trigger: "src/lib/server/auth-service.ts",      audience: "player",  chrome: "royal", money: false },
  { template: "emailVerifyHtml",           trigger: "src/lib/server/email-verification.ts", audience: "player", chrome: "royal", money: false },
  { template: "emailChangedHtml",          trigger: "src/lib/server/email-verification.ts", audience: "player", chrome: "royal", money: false },
  { template: "passwordResetHtml",         trigger: "src/lib/server/password-reset.ts",    audience: "player",  chrome: "royal", money: false },
  { template: "passwordChangedHtml",       trigger: "src/lib/server/password-reset.ts",    audience: "player",  chrome: "royal", money: false },
  { template: "accountClosedHtml",         trigger: "src/lib/server/user-service.ts",      audience: "player",  chrome: "royal", money: false },
  { template: "staffRoleChangedHtml",      trigger: "src/app/admin/staff/actions.ts",      audience: "officer", chrome: "royal", money: false },
  // ── Player proposals ──────────────────────────────────────────────────────
  { template: "proposalSubmittedHtml",     trigger: "src/lib/server/proposals-service.ts", audience: "player",  chrome: "royal", money: false },
  { template: "proposalSubmittedAdminHtml", trigger: "src/lib/server/proposals-service.ts", audience: "officer", chrome: "royal", money: false },
  { template: "proposalApprovedHtml",      trigger: "src/lib/server/proposals-service.ts", audience: "player",  chrome: "gold",  money: true },
  { template: "proposalListedHtml",        trigger: "src/lib/server/proposals-service.ts", audience: "player",  chrome: "royal", money: false },
  { template: "proposalChangesHtml",       trigger: "src/lib/server/proposals-service.ts", audience: "player",  chrome: "royal", money: false },
  { template: "proposalDeclinedHtml",      trigger: "src/lib/server/proposals-service.ts", audience: "player",  chrome: "royal", money: false },
  // ── Platform health (officer only) ────────────────────────────────────────
  { template: "sentinelDownAdminHtml",     trigger: "src/lib/server/notification-service.ts", audience: "officer", chrome: "royal", money: false },
  { template: "aiCreditLimitAdminHtml",    trigger: "src/lib/server/notification-service.ts", audience: "officer", chrome: "royal", money: false },
  { template: "backupUnhealthyAdminHtml",  trigger: "src/lib/server/notification-service.ts", audience: "officer", chrome: "royal", money: false },
];

/**
 * `proposalApprovedHtml` renders gold ONLY on its bonus branch and royal when the
 * reward is zero. Registered as gold because that is the branch a player sees
 * when money moves; the chrome check treats it as satisfied if EITHER wrapper
 * appears. Listed explicitly so the exception is a decision, not an oversight.
 */
export const DUAL_CHROME_TEMPLATES: readonly string[] = ["proposalApprovedHtml"];

/**
 * Templates that legitimately carry NO CTA button — a link would be wrong, not
 * missing. Every other template must offer the player somewhere to go.
 */
export const NO_CTA_TEMPLATES: readonly string[] = [
  "depositReversedHtml",       // must NOT invite a self-excluded player back to deposit
  "withdrawalUnderReviewHtml", // nothing for the player to do but wait
  "selfExclusionHtml",         // an exclusion mail must not link into the product
  "coolOffHtml",               // same
  "amlRejectRefundHtml",       // support contact only
  "passwordChangedHtml",       // security alert — a button is a phishing shape
  "emailChangedHtml",          // same
  "accountClosedHtml",         // the account is closed; there is nowhere to send them
];

/* ══ IN-APP ═════════════════════════════════════════════════════════════════ */

/**
 * The `kind` written on every inbox row. This is the bell's icon + tint key, and
 * — because `prisma-dal` writes `event: n.kind` — it is also the `event` column.
 *
 * 🔴 `kind` is LOSSY and the production "top events" numbers inherit the loss:
 * `notifyCashout` and `notifyOneSidedRefund` are filed under `WIN`,
 * `notifyRefund` and `notifyMarketCancelled` under `DEPOSIT`, and
 * `notifyAdminMarketResolution` under `PROPOSAL`. So `WIN 164` is not 164 wins.
 * Recorded here rather than silently corrected: renaming a kind reclassifies
 * 1,673 historical rows, which is a data decision, not a code one.
 */
export const NOTIFICATION_KINDS = [
  "WIN", "LOSS", "BET_PLACED", "SELECTION_CLOSED", "ROUND_RESULT",
  "DEPOSIT", "WITHDRAW", "KYC", "MATCH_START", "RG", "SECURITY",
  "AFFILIATE", "PROPOSAL", "BONUS", "WATCHLIST", "OBJECTION",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** Kinds that carry, promise or account for money. Their copy is compliance copy. */
export const MONEY_KINDS: readonly NotificationKind[] = [
  // ROUND_RESULT is the Up & Down daily digest, and it is the ONLY message a
  // player receives about a day of real settled rounds — so it accounts for money
  // by definition and its copy is compliance copy.
  "WIN", "LOSS", "BET_PLACED", "SELECTION_CLOSED", "ROUND_RESULT", "DEPOSIT", "WITHDRAW", "BONUS", "AFFILIATE",
];

/**
 * Every emitter exported by `notification-service.ts`, and who it addresses.
 *
 * The gate drives EACH of these and asserts the row it produces is complete in
 * all three languages. Before 2026-07-31 only three set Chinese at all, which is
 * why 1,573 of 1,673 production rows had none.
 */
export type EmitterSpec = { fn: string; kind: NotificationKind; audience: EmailAudience };

export const NOTIFICATION_EMITTERS: readonly EmitterSpec[] = [
  { fn: "notifyBetPlaced",             kind: "BET_PLACED",        audience: "player" },
  { fn: "notifyWin",                   kind: "WIN",               audience: "player" },
  { fn: "notifyLoss",                  kind: "LOSS",              audience: "player" },
  { fn: "notifySelectionClosed",       kind: "SELECTION_CLOSED",  audience: "player" },
  { fn: "notifyCashout",               kind: "WIN",               audience: "player" },
  { fn: "notifyOneSidedRefund",        kind: "WIN",               audience: "player" },
  { fn: "notifyRefund",                kind: "DEPOSIT",           audience: "player" },
  // The Up & Down daily digest (E-37). `ROUND_RESULT` was declared here, given a
  // bell icon and a tint, and left with no emitter until this shipped.
  { fn: "notifyUpDownDigest",          kind: "ROUND_RESULT",      audience: "player" },
  // ── Up & Down PER-ROUND result rows (owner decision 2026-08-22, reversing 2026-07-24
  // and 2026-08-05). ⛔ ALL FOUR OR NONE — E-43 is what happens when one outcome is
  // missing from this list: refunds were announced and wins and losses were not, so the
  // only outcome a player ever heard about was the one where nothing happened to their
  // money. `test:updown-bell` asserts all four exist and are wired.
  //
  // ⚠️ The two refunds are filed under DEPOSIT deliberately. `notifyOneSidedRefund`
  // above files a refund as `WIN`, which is one of the misfilings this file's own header
  // flags as making the production "top events" numbers wrong. New emitters do not
  // inherit an old mistake for symmetry's sake — money returning to a wallet is a
  // deposit-shaped event and renders with the money-in tint rather than a trophy.
  { fn: "notifyUpDownWin",             kind: "WIN",               audience: "player" },
  { fn: "notifyUpDownLoss",            kind: "LOSS",              audience: "player" },
  { fn: "notifyUpDownRefund",          kind: "DEPOSIT",           audience: "player" },
  { fn: "notifyUpDownOneSidedRefund",  kind: "DEPOSIT",           audience: "player" },
  { fn: "notifyMarketCancelled",       kind: "DEPOSIT",           audience: "player" },
  { fn: "notifyDeposit",               kind: "DEPOSIT",           audience: "player" },
  { fn: "notifyWithdraw",              kind: "WITHDRAW",          audience: "player" },
  { fn: "notifyBonusCredited",         kind: "BONUS",             audience: "player" },
  { fn: "notifyBonusFulfilled",        kind: "BONUS",             audience: "player" },
  { fn: "notifyBonusExpired",          kind: "BONUS",             audience: "player" },
  { fn: "notifyReferralJoined",        kind: "AFFILIATE",         audience: "player" },
  { fn: "notifyReferralReward",        kind: "AFFILIATE",         audience: "player" },
  { fn: "notifyKyc",                   kind: "KYC",               audience: "player" },
  { fn: "notifySof",                   kind: "KYC",               audience: "player" },
  { fn: "notifySelfExclusion",         kind: "RG",                audience: "player" },
  { fn: "notifyCoolOff",               kind: "RG",                audience: "player" },
  { fn: "notifyPasswordChanged",       kind: "SECURITY",          audience: "player" },
  { fn: "notifyWatchedClosingSoon",    kind: "WATCHLIST",         audience: "player" },
  { fn: "notifyWatchedSettled",        kind: "WATCHLIST",         audience: "player" },
  { fn: "notifyProposalUnderReview",   kind: "PROPOSAL",          audience: "player" },
  { fn: "notifyProposalApproved",      kind: "PROPOSAL",          audience: "player" },
  { fn: "notifyProposalListed",        kind: "PROPOSAL",          audience: "player" },
  { fn: "notifyProposalChanges",       kind: "PROPOSAL",          audience: "player" },
  { fn: "notifyProposalDeclined",      kind: "PROPOSAL",          audience: "player" },
  { fn: "notifyObjectionDecided",      kind: "OBJECTION",         audience: "player" },
  // Officer-facing — same bell, same completeness rule.
  { fn: "notifyAdminKycReview",        kind: "KYC",               audience: "officer" },
  { fn: "notifyAdminMarketResolution", kind: "PROPOSAL",          audience: "officer" },
  { fn: "notifyAdminMarketCancelled",  kind: "SECURITY",          audience: "officer" },
  { fn: "notifyAdminProposalReview",   kind: "PROPOSAL",          audience: "officer" },
  { fn: "notifyAdminObjectionFiled",   kind: "OBJECTION",         audience: "officer" },
  { fn: "notifyAdminsAmlReview",       kind: "SECURITY",          audience: "officer" },
  { fn: "notifyAdminsSentinelDown",    kind: "SECURITY",          audience: "officer" },
  { fn: "notifyAdminsAiCreditLimit",   kind: "SECURITY",          audience: "officer" },
  { fn: "notifyAdminsBackupUnhealthy", kind: "SECURITY",          audience: "officer" },
];
