/**
 * Two-person review threshold — LCCP / FATF-aligned.
 *
 * MUST match the AML-hold threshold in payments.ts (withdrawals >= this go to
 * AML_REVIEW). If the two-person bar were higher than the hold bar, every
 * withdrawal in the gap would be single-officer released — the exact gap the
 * audit flagged (holds at 1M, two-person only at 5M). Keep them equal so EVERY
 * AML-held withdrawal needs two different officers.
 */
export const TWO_PERSON_THRESHOLD_TZS = 1_000_000;
