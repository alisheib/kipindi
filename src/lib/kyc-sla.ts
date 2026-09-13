/**
 * HOW LONG OUR IDENTITY REVIEW TAKES — one number, quoted wherever the wait is stated.
 *
 * ⭐ WHY IT IS A SHARED CONSTANT (2026-09-13). Until then the 24-hour target lived as a private
 * `SLA_HOURS` inside `/admin/kyc/[id]`, visible only once an officer had opened a case, while players
 * were told "usually within a day" in words no code tied to it. From 2026-09-13 the review stands
 * between a player and money they already hold, so the wait is a number on the withdrawal screen and
 * the officer's clock is the same number. A wait with a number is a queue; a wait without one is a void.
 *
 * ⛔ NEVER PUBLISH LIVE QUEUE DEPTH beside it: it fluctuates, it invites gaming, and on a bad day it is
 * the operator confessing in real time. This is a target, stated as "usually".
 * ⛔ PURE AND IMPORT-FREE — server pages and client panels both read it.
 */
export const KYC_REVIEW_SLA_HOURS = 24;
