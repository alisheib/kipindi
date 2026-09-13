/**
 * Two-person review threshold — LCCP / FATF-aligned.
 *
 * ⚠️ WHAT IT DRIVES SINCE 2026-09-13. The owner ruling of that date switched the
 * withdrawal AML hold off (`WITHDRAWAL_AML_HOLD` in payments.ts), so no new
 * withdrawal is held. This constant now sets only two things:
 *   · the balance-adjustment two-person bar (`adjustBalanceAction`), and
 *   · the release rule for rows ALREADY in AML_REVIEW (a withdrawal held before
 *     the ruling, a deposit owed back to an excluded player): at or above it,
 *     two different officers must approve.
 * ⛔ Keep it equal to AML_REVIEW_THRESHOLD_TZS. It had to match the hold line so
 * every held withdrawal needed two officers (the audit found holds at 1M but
 * two-person only at 5M); if the hold is ever switched back on, that gap returns.
 */
export const TWO_PERSON_THRESHOLD_TZS = 1_000_000;
