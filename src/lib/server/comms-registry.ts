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
 *   EMAIL   · every `EMAIL_TEMPLATES` entry below — the count is `test:cert-c1` §1's to measure (this line said
 *             47 long after the inventory outgrew it) · ONE bilingual EN+SW message, locale-independent
 *   PUSH    · fan-out of the IN_APP row, in the recipient's locale, no record
 *   SMS     · OTP + invite campaigns, outside this module (`sms.ts` / `sms-blackball.ts`),
 *             with its own record on `SmsMessage` and its own delivery receipts — and
 *             STILL never a `Notification` row. (Blackball wired 2026-09-16; the surviving
 *             half of the old claim is the half that matters, and it is measured: nothing
 *             in `src/` writes `NotificationChannel.SMS`.)
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
 * Every transactional template. The count is not restated here: `test:cert-c1` §1 measures it from
 * `email.ts`'s own exports and pins it. (This line said "All 49" while the inventory was 63.)
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
  // ── Maswali Millionea (MASWALI-BUILD S6; MB-11, MB-44, MB-68) ───────────────
  // The week's three letters, each beside its bell notice (`MILLIONEA_NOTICES` below). The win is the one Millionea letter
  // that may be gold, and only on its PAID branch (MB-68): royal when every share is held (DUAL_CHROME_TEMPLATES).
  { template: "millioneaWinHtml",          trigger: "src/lib/server/maswali-notify.ts",    audience: "player",  chrome: "gold",  money: true },
  { template: "millioneaNotWonHtml",       trigger: "src/lib/server/maswali-notify.ts",    audience: "player",  chrome: "royal", money: true },
  { template: "millioneaWeekRefundedHtml", trigger: "src/lib/server/maswali-notify.ts",    audience: "player",  chrome: "royal", money: true },
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
  // 2026-09-13 · S1 — the written decision about a finally-refused player's balance (Terms §3a).
  { template: "refusedFundsDecisionHtml",  trigger: "src/lib/server/refused-funds.ts",     audience: "player",  chrome: "royal", money: true },
  // 2026-09-14 · …and the follow-up when that decision's RETURN payout failed and the amount came back into the
  // frozen wallet. Sent from the payout-failure path, where the failure is learned. It carries no identity
  // sentence: it answers a payout that failed, not a verification event (the quiet rule below).
  { template: "refusedFundsReturnFailedHtml", trigger: "src/lib/server/wallet-service.ts", audience: "player",  chrome: "royal", money: true },
  { template: "kycMoreInfoHtml",           trigger: "src/lib/server/kyc-service.ts",       audience: "player",  chrome: "royal", money: false },
  // ⛔ NO "VERIFY BEFORE YOU WITHDRAW" LETTER BELONGS IN THIS LIST (owner, 2026-09-13, the quiet rule).
  // A player learns identity comes before a withdrawal on the withdrawal screen and in one dismissible
  // wallet notice; a player EMAIL about identity answers something that happened in verification —
  // the four KYC letters above and `refusedFundsDecisionHtml`. `test:cert-c1` §5b holds it.
  // ⭐ ONE NAMED EXCEPTION, BY A LATER RULING: the Millionea win (`millioneaWinHtml` and its bell row `notifyMillioneaWon`)
  // states the withdrawal ladder — a confirmed email and the typed identity details, the cap, the fee (MB-11, ruled
  // 2026-10-16: "Nothing tells the winner truthfully how a share becomes cash"). It states the ladder as facts of a
  // withdrawal, once, on the win itself: no prompt, no link into verification, no reminder. Nothing else joins it.
  // ── Agent affiliate programme ─────────────────────────────────────────────
  { template: "agentApprovedHtml",              trigger: "src/lib/server/agent-application-service.ts", audience: "player",  chrome: "gold",  money: true },
  { template: "agentRejectedHtml",              trigger: "src/lib/server/agent-application-service.ts", audience: "player",  chrome: "royal", money: true },
  { template: "agentInfoRequestedHtml",         trigger: "src/lib/server/agent-application-service.ts", audience: "player",  chrome: "royal", money: false },
  { template: "agentFeeRefundedHtml",           trigger: "src/lib/server/agent-application-service.ts", audience: "player",  chrome: "royal", money: true },
  { template: "agentApplicationSubmittedAdminHtml", trigger: "src/lib/server/agent-application-service.ts", audience: "officer", chrome: "royal", money: false },
  { template: "agentInvitationHtml",            trigger: "src/lib/server/agent-application-service.ts", audience: "player",  chrome: "royal", money: false },
  // ⭐ The invitation's one-time code. SMS-only until 2026-09-08, when the agent programme
  // moved to Postmark because no SMS provider was licensed (`sms.ts` — two stubs that threw,
  // one unsigned contract, `console` as the shipped default).
  // ⚠️ A licensed provider EXISTS as of 2026-09-16 (Blackball), so the original blocker is
  // gone — but this template STAYS on email and moving it back is a decision, not a tidy-up:
  // an officer invitation reaches a mailbox the applicant controls and keeps a durable copy,
  // which an SMS does not.
  { template: "agentInviteOtpHtml",             trigger: "src/lib/server/agent-application-service.ts", audience: "player",  chrome: "royal", money: false },
  { template: "agentDeactivatedHtml",           trigger: "src/lib/server/agent-application-service.ts", audience: "player",  chrome: "royal", money: false },
  { template: "agentRevokedHtml",               trigger: "src/lib/server/agent-application-service.ts", audience: "player",  chrome: "royal", money: false },
  { template: "agentRateChangedHtml",           trigger: "src/lib/server/agent-application-service.ts", audience: "player",  chrome: "gold",  money: true },
  { template: "agentCommissionReversedHtml",    trigger: "src/lib/server/affiliate-service.ts",         audience: "player",  chrome: "royal", money: true },
  { template: "agentCommissionEarnedHtml",      trigger: "src/lib/server/affiliate-service.ts",         audience: "player",  chrome: "gold",  money: true },
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
  // 2026-09-26 · the SMS credit reached the alert line — our operating balance, not a player's money.
  { template: "smsCreditLowAdminHtml",     trigger: "src/lib/server/notification-service.ts", audience: "officer", chrome: "royal", money: false },
  // 2026-09-13 · the identity review queue became a MONEY queue — a player waits on it for their own
  // withdrawal. One alert per submission past `KYC_REVIEW_SLA_HOURS`, never one per tick.
  { template: "kycReviewOverdueAdminHtml", trigger: "src/lib/server/notification-service.ts", audience: "officer", chrome: "royal", money: false },
  // ── House bots (build commit 3) ───────────────────────────────────────────
  // Admin letters only — the holder receives no house-bot email (D19c, C4 ruling 149).
  { template: "houseBotErasureBlockedAdminHtml", trigger: "src/lib/server/notification-service.ts", audience: "officer", chrome: "royal", money: false },
  // ── House bots (build commit 4, step 9) ───────────────────────────────────
  // One parametrised letter behind every admin house alert that emails: pause, switch, money, alert, roster and
  // staff-chosen. Royal, never gold: a figure in a detail row is a fact, not money promised to the reader.
  { template: "houseBotAdminHtml",       trigger: "src/lib/server/notification-service.ts", audience: "officer", chrome: "royal", money: false },
];

/**
 * ⭐ MONEY MAIL ONLY TO A CONFIRMED ADDRESS (owner ruling 2026-10-07 — docs/COMPLIANCE-DECISIONS.md, "A deposit asks no
 * email; a confirmed email is required to withdraw; receipts in the app"). Every `audience: "player"`, `money: true`
 * template above is sent through `sendEmailToUser(…, { confirmedOnly: true })`: since a deposit asks for no email, an
 * account can hold money with an address nobody proved is theirs, and a statement of that money must not go to it.
 * `test:cert-c1` (`comms-email-truth.test.mts`) §2b derives the list from THIS registry and checks every call site. An account that cannot sign
 * in (self-excluded, closed, suspended) is mailed at the address on file even unconfirmed (`CANNOT_SIGN_IN`, email.ts):
 * the bell and the receipts are out of its reach, so the letter is the only notice it can read.
 * ⛔ EXEMPT, BY NAME: the two refused-funds letters. Terms §3a promises a refused player the officer's decision about
 * their balance IN WRITING; withholding the letter because an address was never confirmed would break that promise to
 * the one player who cannot use the app to read it (the wallet is frozen). The in-app row carries it as well.
 */
export const CONFIRMED_ONLY_EXEMPT: readonly string[] = ["refusedFundsDecisionHtml", "refusedFundsReturnFailedHtml"];

/** The player money templates `sendEmailToUser` must send with `confirmedOnly` — derived, never typed out. */
export const CONFIRMED_ONLY_TEMPLATES: readonly string[] = EMAIL_TEMPLATES
  .filter((t) => t.audience === "player" && t.money && !CONFIRMED_ONLY_EXEMPT.includes(t.template))
  .map((t) => t.template);

/**
 * `proposalApprovedHtml` renders gold ONLY on its bonus branch and royal when the
 * reward is zero. Registered as gold because that is the branch a player sees
 * when money moves; the chrome check treats it as satisfied if EITHER wrapper
 * appears. Listed explicitly so the exception is a decision, not an oversight.
 */
export const DUAL_CHROME_TEMPLATES: readonly string[] = [
  "proposalApprovedHtml",
  // MASWALI-BUILD S6 · gold on its paid branch, royal when every winning share is held for Compliance (MB-43, MB-68).
  "millioneaWinHtml",
];

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
  "agentFeeRefundedHtml",      // telling someone their own money came back is information, not solicitation
  "agentDeactivatedHtml",      // a paused partnership must not link into the product; support is the route
  "agentRevokedHtml",          // the partnership has ended; support is the route
];

/* ══ IN-APP ═════════════════════════════════════════════════════════════════ */

/**
 * The `kind` written on every inbox row. This is the bell's icon + tint key, and
 * — because `prisma-dal` writes `event: n.kind` — it is also the `event` column.
 *
 * Historic rows retain their written kind. Some old cash-outs and refunds were
 * filed under WIN or DEPOSIT; new free exits carry REFUND and paid exits CASHOUT. The bell's
 * appearanceKind recognises exact old title prefixes without rewriting history.
 * Admin market resolutions remain filed under PROPOSAL.
 */
export const NOTIFICATION_KINDS = [
  "WIN", "LOSS", "BET_PLACED", "SELECTION_CLOSED", "ROUND_RESULT",
  "DEPOSIT", "DEPOSIT_PROCESSING", "DEPOSIT_REVIEW", "DEPOSIT_FAILED", "DEPOSIT_HELD",
  "REFUND", "CASHOUT", "WITHDRAW", "KYC", "MATCH_START", "RG", "SECURITY",
  "AFFILIATE", "PROPOSAL", "BONUS", "WATCHLIST", "OBJECTION",
  // A verdict is recorded but nothing has been paid — the notice that makes the
  // objection window exercisable (management ruling ①, 2026-09-05).
  "VERDICT",
  // House bots (build commit 3): the holder's liquidity notices and the officers' house-bot alerts.
  // ⛔ NOT a money kind, although PLAN §7 put it there (PLAN §18, W17): these notices state no figure, and
  // `test:cert-c3` §6 requires one of every money kind — the rule stays as strict as it is. A holder's own
  // stakes keep their own money receipts.
  "HOUSE_BOT",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** Kinds that carry, promise or account for money. Their copy is compliance copy. */
export const MONEY_KINDS: readonly NotificationKind[] = [
  // ROUND_RESULT is the Up & Down daily digest, and it is the ONLY message a
  // player receives about a day of real settled rounds — so it accounts for money
  // by definition and its copy is compliance copy.
  "WIN", "LOSS", "BET_PLACED", "SELECTION_CLOSED", "ROUND_RESULT",
  "DEPOSIT", "DEPOSIT_PROCESSING", "DEPOSIT_REVIEW", "DEPOSIT_FAILED", "DEPOSIT_HELD", "REFUND", "CASHOUT",
  "WITHDRAW", "BONUS", "AFFILIATE",
  // VERDICT names the instant a payout becomes due and states when it will be paid.
  // It promises money, so its copy is compliance copy and it belongs in the money lens.
  "VERDICT",
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
  { fn: "notifyCashout",               kind: "REFUND",            audience: "player" },
  { fn: "notifyCashout",               kind: "CASHOUT",           audience: "player" },
  { fn: "notifyOneSidedRefund",        kind: "REFUND",            audience: "player" },
  { fn: "notifyRefund",                kind: "REFUND",            audience: "player" },
  // The Up & Down daily digest (E-37). `ROUND_RESULT` was declared here, given a
  // bell icon and a tint, and left with no emitter until this shipped.
  { fn: "notifyUpDownDigest",          kind: "ROUND_RESULT",      audience: "player" },
  // ── Up & Down PER-ROUND result rows (owner decision 2026-08-22, reversing 2026-07-24
  // and 2026-08-05). ⛔ ALL FOUR OR NONE — E-43 is what happens when one outcome is
  // missing from this list: refunds were announced and wins and losses were not, so the
  // only outcome a player ever heard about was the one where nothing happened to their
  // money. `test:updown-bell` asserts all four exist and are wired.
  //
  // Refunds now have a distinct kind. Historic WIN/DEPOSIT rows keep their stored
  // value and receive the refund appearance through appearanceKind.
  { fn: "notifyUpDownWin",             kind: "WIN",               audience: "player" },
  { fn: "notifyUpDownLoss",            kind: "LOSS",              audience: "player" },
  { fn: "notifyUpDownRefund",          kind: "REFUND",            audience: "player" },
  { fn: "notifyUpDownOneSidedRefund",  kind: "REFUND",            audience: "player" },
  { fn: "notifyMarketCancelled",       kind: "REFUND",            audience: "player" },
  { fn: "notifyDeposit",               kind: "DEPOSIT",           audience: "player" },
  { fn: "notifyDeposit",               kind: "DEPOSIT_PROCESSING", audience: "player" },
  { fn: "notifyDeposit",               kind: "DEPOSIT_REVIEW",    audience: "player" },
  { fn: "notifyDeposit",               kind: "DEPOSIT_FAILED",    audience: "player" },
  { fn: "notifyDeposit",               kind: "DEPOSIT_HELD",      audience: "player" },
  { fn: "notifyWithdraw",              kind: "WITHDRAW",          audience: "player" },
  { fn: "notifyBonusCredited",         kind: "BONUS",             audience: "player" },
  { fn: "notifyBonusFulfilled",        kind: "BONUS",             audience: "player" },
  { fn: "notifyBonusExpired",          kind: "BONUS",             audience: "player" },
  { fn: "notifyReferralJoined",        kind: "AFFILIATE",         audience: "player" },
  { fn: "notifyReferralReward",        kind: "AFFILIATE",         audience: "player" },
  { fn: "notifyKyc",                   kind: "KYC",               audience: "player" },
  // ⛔ No "verify before you withdraw" bell row belongs here either (owner, 2026-09-13, the quiet rule —
  // see EMAIL_TEMPLATES). `notifyKyc` answers verification events; nothing prompts. `test:cert-c3` §7.
  // 2026-09-13 · S1 — the decision about a finally-refused player's balance. A money kind: every
  // outcome states a figure (held, returned or not returned).
  { fn: "notifyRefusedFundsDecision",  kind: "WITHDRAW",          audience: "player" },
  // 2026-09-14 · …and when that decision's return payout failed: the figure is back in the frozen wallet. A money
  // kind like its parent. It carries no identity sentence (the quiet rule above).
  { fn: "notifyRefusedFundsReturnFailed", kind: "WITHDRAW",       audience: "player" },
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
  { fn: "notifyVerdictRecorded",       kind: "VERDICT",           audience: "player" },
  // ── Maswali Millionea (MASWALI-BUILD S6; MB-68): a week's notices, one per state (`MILLIONEA_NOTICES` below). Every one
  // is a money kind and states a figure. The two refunds are REFUND, as every refund is since S5 (Up & Down's too); a
  // question voided is a VERDICT (a result recorded, no money moved yet), and the close is SELECTION_CLOSED by meaning.
  { fn: "notifyMillioneaTicketsCut",      kind: "BET_PLACED",       audience: "player" },
  { fn: "notifyMillioneaTicketCancelled", kind: "REFUND",           audience: "player" },
  { fn: "notifyMillioneaSalesClosed",     kind: "SELECTION_CLOSED", audience: "player" },
  { fn: "notifyMillioneaQuestionVoided",  kind: "VERDICT",          audience: "player" },
  // A correction (OD-09, MB-24) records a result and moves no money; a moved close (MB-28) is the close's own kind.
  { fn: "notifyMillioneaQuestionCorrected", kind: "VERDICT",        audience: "player" },
  { fn: "notifyMillioneaCloseMoved",      kind: "SELECTION_CLOSED", audience: "player" },
  { fn: "notifyMillioneaWon",             kind: "WIN",              audience: "player" },
  // ⛔ A win whose every share is held pays nothing yet: a VERDICT, never a gold WIN (its letter wears royal too).
  { fn: "notifyMillioneaWonHeld",         kind: "VERDICT",          audience: "player" },
  { fn: "notifyMillioneaNotWon",          kind: "LOSS",             audience: "player" },
  { fn: "notifyMillioneaWeekRefunded",    kind: "REFUND",           audience: "player" },
  // Officer-facing — same bell, same completeness rule.
  { fn: "notifyAdminKycReview",        kind: "KYC",               audience: "officer" },
  // ── Agent affiliate programme ─────────────────────────────────────────────
  // The three that carry money (approval states the rate; rejection and refund state the fee)
  // are AFFILIATE, a money kind. The four lifecycle notices carry no figure and are filed
  // under KYC — the compliance review of a person's documents — because a money kind must
  // state a figure and these have none.
  { fn: "notifyAgentApplicationSubmitted", kind: "KYC",           audience: "player" },
  { fn: "notifyAgentApproved",         kind: "AFFILIATE",         audience: "player" },
  { fn: "notifyAgentRejected",         kind: "AFFILIATE",         audience: "player" },
  { fn: "notifyAgentInfoRequested",    kind: "KYC",               audience: "player" },
  { fn: "notifyAgentFeeRefunded",      kind: "AFFILIATE",         audience: "player" },
  { fn: "notifyAgentDeactivated",      kind: "KYC",               audience: "player" },
  { fn: "notifyAgentRevoked",          kind: "KYC",               audience: "player" },
  { fn: "notifyAgentRateChanged",      kind: "AFFILIATE",         audience: "player" },
  { fn: "notifyAgentCommissionReversed", kind: "AFFILIATE",       audience: "player" },
  { fn: "notifyAgentCommission",       kind: "AFFILIATE",         audience: "player" },
  { fn: "notifyAdminAgentReview",      kind: "KYC",               audience: "officer" },
  { fn: "notifyAdminMarketResolution", kind: "PROPOSAL",          audience: "officer" },
  { fn: "notifyAdminMarketCancelled",  kind: "SECURITY",          audience: "officer" },
  { fn: "notifyAdminProposalReview",   kind: "PROPOSAL",          audience: "officer" },
  { fn: "notifyAdminObjectionFiled",   kind: "OBJECTION",         audience: "officer" },
  { fn: "notifyAdminsAmlReview",       kind: "SECURITY",          audience: "officer" },
  { fn: "notifyAdminsSentinelDown",    kind: "SECURITY",          audience: "officer" },
  { fn: "notifyAdminsAiCreditLimit",   kind: "SECURITY",          audience: "officer" },
  { fn: "notifyAdminsBackupUnhealthy", kind: "SECURITY",          audience: "officer" },
  // 2026-09-26 · the SMS credit reached the alert line (`sms.ts` recordBalance), once per crossing.
  { fn: "notifyAdminsSmsCreditLow",    kind: "SECURITY",          audience: "officer" },
  // 2026-09-13 · an identity review past `KYC_REVIEW_SLA_HOURS`. KYC, like `notifyAdminKycReview`: it is
  // the same queue, and the kind is what routes an officer's bell tint to it.
  { fn: "notifyAdminsKycReviewOverdue", kind: "KYC",              audience: "officer" },
  // 2026-10-10 · an AUTOMATIC identity approval (typed details, no officer) still unchecked — at once when it carries
  // a flag, after 24 h otherwise (`runKycPostCheckAlerts`). KYC: the same post-check list the bell links to.
  { fn: "notifyAdminsKycPostCheckDue", kind: "KYC",               audience: "officer" },
  // ── House bots (build commit 3) ─────────────────────────────────────────
  // ⛔ No holder notices: every HOUSE_BOT row is an officer's (D19c, C4 ruling 149).
  // An erasure refused while the account is still a house bot (04 R6) — to `houseBotAlertRecipients()`.
  { fn: "notifyAdminsHouseBotErasureBlocked", kind: "HOUSE_BOT",  audience: "officer" },
  // N6: a flagged designated-account stake needs owner review in the AML queue.
  { fn: "notifyAdminsDeskAmlFlag",          kind: "HOUSE_BOT",  audience: "officer" },
  // ── House bots (build commit 4, step 9): the engine's voice ──────────────
  // Every automatic stake (bell only, capped per hour by the control row) and every staff-chosen one
  // (bell + email, uncapped — a person chose it).
  { fn: "notifyAdminsHouseBotBet",         kind: "HOUSE_BOT",     audience: "officer" },
  { fn: "notifyAdminsHouseBotStaffChosen", kind: "HOUSE_BOT",     audience: "officer" },
  { fn: "notifyAdminsHouseBotHourSummary", kind: "HOUSE_BOT",     audience: "officer" },
  { fn: "notifyAdminsHouseBotPaused",      kind: "HOUSE_BOT",     audience: "officer" },
  { fn: "notifyAdminsHouseBotSwitch",      kind: "HOUSE_BOT",     audience: "officer" },
  { fn: "notifyAdminsHouseBotMoneyEvent",  kind: "HOUSE_BOT",     audience: "officer" },
  { fn: "notifyAdminsHouseBotAlert",       kind: "HOUSE_BOT",     audience: "officer" },
  { fn: "notifyAdminsHouseBotRoster",      kind: "HOUSE_BOT",     audience: "officer" },
];

/**
 * F6 · WHICH CHANNELS A KIND MAY EVER USE (04 F6). One home, beside the kinds themselves, so a future fan-out asks
 * the policy instead of re-deciding it — the drift `prisma-dal.ts` records for the lens lists is the same mistake.
 *
 * - `sms: "never"` means no SMS may ever carry this kind; `"otp"` means only a one-time code; `"allowed"` leaves the
 *   channel to the emitter.
 * - `email: "never"` means no letter; `"template-only"` means only through a registered template, so a new letter has
 *   to pass `test:cert-c1`; `"allowed"` leaves it to the emitter.
 * - HOUSE_BOT is `sms: "never"` (04 C13) and `email: "template-only"` (ruling 17: only the registered admin letters;
 *   the holder receives no house-bot bell or letter at all — D19c, C4 ruling 149).
 *
 * ⛔ `satisfies Record<NotificationKind, …>` is what makes a 19th kind impossible to ship without a row.
 */
export type ChannelRule = { sms: "never" | "otp" | "allowed"; email: "never" | "template-only" | "allowed" };

export const CHANNEL_POLICY: Record<NotificationKind, ChannelRule> = {
  WIN: { sms: "allowed", email: "allowed" },
  LOSS: { sms: "never", email: "allowed" },
  BET_PLACED: { sms: "never", email: "allowed" },
  SELECTION_CLOSED: { sms: "never", email: "allowed" },
  ROUND_RESULT: { sms: "never", email: "allowed" },
  DEPOSIT: { sms: "allowed", email: "allowed" },
  DEPOSIT_PROCESSING: { sms: "allowed", email: "allowed" },
  DEPOSIT_REVIEW: { sms: "allowed", email: "allowed" },
  DEPOSIT_FAILED: { sms: "allowed", email: "allowed" },
  DEPOSIT_HELD: { sms: "allowed", email: "allowed" },
  REFUND: { sms: "allowed", email: "allowed" },
  CASHOUT: { sms: "allowed", email: "allowed" },
  WITHDRAW: { sms: "allowed", email: "allowed" },
  KYC: { sms: "never", email: "allowed" },
  MATCH_START: { sms: "never", email: "allowed" },
  RG: { sms: "never", email: "allowed" },
  SECURITY: { sms: "otp", email: "allowed" },
  AFFILIATE: { sms: "never", email: "allowed" },
  PROPOSAL: { sms: "never", email: "allowed" },
  BONUS: { sms: "never", email: "allowed" },
  WATCHLIST: { sms: "never", email: "allowed" },
  OBJECTION: { sms: "never", email: "allowed" },
  VERDICT: { sms: "never", email: "allowed" },
  HOUSE_BOT: { sms: "never", email: "template-only" },
};

/**
 * What a fan-out may use for one notice. `houseOnly` is 04 F6's rule: when every position behind a notice is
 * house-marked it never goes to a phone and never becomes a letter.
 *
 * ⛔ THE SENTENCE THAT USED TO FINISH THIS PARAGRAPH IS GONE (C5-SPEC ruling 149). It described an hourly
 * holder summary as "the one account of those stakes" — a surface owner ruling D19 does not allow and this
 * programme never built, so the docstring was promising a compensating notice that does not exist. What the
 * rule actually does is stated above and nowhere else.
 *
 * ⭐ ITS ONE PRODUCTION CALLER is the Up & Down daily digest (`updown-digest.ts`, C5-SPEC ruling 235). Until
 * that call this helper had none, so F6's rule was written down and never ran.
 */
export function channelAllowed(kind: NotificationKind, opts: { houseOnly?: boolean } = {}): { sms: boolean; email: boolean } {
  if (opts.houseOnly === true) return { sms: false, email: false };
  const row = CHANNEL_POLICY[kind];
  return { sms: row.sms !== "never", email: row.email !== "never" };
}

/* ══ MASWALI MILLIONEA ══════════════════════════════════════════════════════ */

/**
 * ⭐ THE REGISTERED SET — ONE NOTICE PER WEEK STATE (MASWALI-BUILD S6; MASWALI-PLAN §7b S6 item 2, MB-68, OD-25).
 *
 * What a Millionea player is told, by whom, on which channels and from which money file's commit. `maswali-notify.ts`
 * sends each exactly once per player, each part on its own key: the bell first, because its link is the notice's key
 * (`millioneaNoticeHref`, read by `existsWithHref`, the Up & Down digest's mechanism); the letter with the bell, and for a
 * result or a refund on its own record too; and (winners first, each right after its winner) the one service SMS on its
 * own target (`MaswaliWinner`, reserved by its own row). A result or refund run that stopped part-way is finished by the
 * reconcile (`reconcileMillioneaNotices`, the tick and the heal), one process at a time (the week's lease), which sends only
 * what is missing; every other notice is at most once (the ticket page shows the truth, a failed write raises an ALARM).
 * Only AFTER the money commits: each trigger is an `afterCommit` or a call after the outer lock returns, never a write
 * inside a money transaction (`test:maswali-notify` holds both).
 * ⛔ THE POLL'S NOTICES NEVER REACH A TICKET (MB-68): no "Bet placed · YES", no "the exact amount you receive" — the ticket
 *    arms return before them (S3), and these are the only Millionea notices there are.
 * ⛔ HOLDERS ONLY (OD-25): every recipient below holds a ticket of the week. Anyone else hears of Millionea only through an
 *    approved marketing wording, past the consent gate (`millionea-claims.ts`, MB-47).
 * ⛔ THE BELL IS THE RECORD where there is no letter (MB-93): a receipt, a cancel, the close and a void are in the app
 *    already, on the ticket page; a result and a refund also go by letter to a confirmed address (or, for an account that
 *    cannot sign in, the address on file — `CANNOT_SIGN_IN`, email.ts).
 */
export type MillioneaNoticeSpec = {
  /** The notice, as `maswali-notify.ts` names its run. */
  notice: "receipt" | "cancel" | "closed" | "closeMoved" | "void" | "correction" | "won" | "wonHeld" | "notWon" | "refund";
  /** The week state(s) it belongs to. */
  states: readonly ("OPEN" | "CLOSED" | "RESOLVING" | "SETTLED" | "VOIDED")[];
  /** Its bell emitter (`NOTIFICATION_EMITTERS`). */
  emitter: string;
  /** Its letter (`EMAIL_TEMPLATES`), or null when the bell and the ticket page are the record. */
  template: string | null;
  /** The one service SMS of OD-25: a winning holder only. */
  sms: boolean;
  /** Who is told: the buyer of the act, every holder of the week, its winners, or its other holders. */
  to: "buyer" | "holders" | "winners" | "losers";
  /** The money file whose commit sends it — the one `afterCommit` or post-lock call, in that file. */
  trigger: string;
  /** The `maswali-notify.ts` function that file calls. */
  sender: string;
};

export const MILLIONEA_NOTICES: readonly MillioneaNoticeSpec[] = [
  { notice: "receipt", states: ["OPEN"],                        emitter: "notifyMillioneaTicketsCut",      template: null,                        sms: false, to: "buyer",   trigger: "src/lib/server/maswali-service.ts",       sender: "noticeTicketsBought" },
  { notice: "cancel",  states: ["OPEN"],                        emitter: "notifyMillioneaTicketCancelled", template: null,                        sms: false, to: "buyer",   trigger: "src/lib/server/maswali-money-service.ts", sender: "noticeTicketCancelled" },
  { notice: "closed",  states: ["CLOSED"],                      emitter: "notifyMillioneaSalesClosed",     template: null,                        sms: false, to: "holders", trigger: "src/lib/server/maswali-service.ts",       sender: "noticeSalesClosed" },
  { notice: "closeMoved", states: ["OPEN"],                     emitter: "notifyMillioneaCloseMoved",      template: null,                        sms: false, to: "holders", trigger: "src/lib/server/maswali-service.ts",       sender: "noticeCloseMoved" },
  { notice: "void",    states: ["OPEN", "CLOSED", "RESOLVING"], emitter: "notifyMillioneaQuestionVoided",  template: null,                        sms: false, to: "holders", trigger: "src/lib/server/maswali-service.ts",       sender: "noticeQuestionVoided" },
  { notice: "correction", states: ["CLOSED", "RESOLVING"],      emitter: "notifyMillioneaQuestionCorrected", template: null,                      sms: false, to: "holders", trigger: "src/lib/server/maswali-service.ts",       sender: "noticeQuestionCorrected" },
  { notice: "won",     states: ["SETTLED"],                     emitter: "notifyMillioneaWon",             template: "millioneaWinHtml",          sms: true,  to: "winners", trigger: "src/lib/server/maswali-settlement.ts",    sender: "noticeWeekSettled" },
  { notice: "wonHeld", states: ["SETTLED"],                     emitter: "notifyMillioneaWonHeld",         template: "millioneaWinHtml",          sms: true,  to: "winners", trigger: "src/lib/server/maswali-settlement.ts",    sender: "noticeWeekSettled" },
  { notice: "notWon",  states: ["SETTLED"],                     emitter: "notifyMillioneaNotWon",          template: "millioneaNotWonHtml",       sms: false, to: "losers",  trigger: "src/lib/server/maswali-settlement.ts",    sender: "noticeWeekSettled" },
  { notice: "refund",  states: ["VOIDED"],                      emitter: "notifyMillioneaWeekRefunded",    template: "millioneaWeekRefundedHtml", sms: false, to: "holders", trigger: "src/lib/server/maswali-void.ts",          sender: "noticeWeekRefunded" },
];
