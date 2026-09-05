/**
 * Mutation anchors for `red:kyc-gate` — the identity gate on the money path (2026-09-05).
 *
 * ⛔ A SIDECAR, NOT AN INLINE ARRAY. `test:red-anchors` §3 re-resolves every anchor below on
 * every run WITHOUT executing the harness, so a rewritten source line is caught the day it
 * lands rather than the next time somebody runs the fleet. Three inline anchors in
 * `updown-push-red.mjs` went stale against rewritten code and the harness went on reporting
 * catches. §4 also holds a ceiling of undeclared harnesses that may only shrink — the first
 * draft of this fleet was inline, which raised that count from 67 to 68 and was correctly
 * refused.
 *
 * ── ⭐ WHAT THIS FLEET HAS TO PROVE, AND WHY THE OBVIOUS FLEET WOULD NOT ──────────────
 *
 * `test:kyc-gate` is almost all NEGATIVE assertions — "an unverified player is refused" —
 * and negative assertions pass for free. A `deposit()` that threw on every call, a
 * `buyPosition()` that always errored, a `withdraw()` deleted outright: all three leave the
 * refusal checks green. §2's positive controls catch the crude version of that.
 *
 * 🔴 THE ONE THAT MATTERS IS `withdraw-asks-current-status`. It is not a missing gate — it
 * is a gate asking the WRONG QUESTION, and it reads as STRICTER than the real one. Every §1
 * refusal still fires, §2 still passes, and a reviewer skimming the diff would call it a
 * tightening. What it actually does is lock a re-verifying player out of money they already
 * earned under an identity we accepted — the harm `docs/BOARD-DISCLOSURE-B-E.md` §6 named
 * when it recorded that force-reverify had stopped being a money control. §3.5 is the only
 * assertion in the suite that can see it.
 *
 * ⚠️ AND NOTE WHICH FILE EACH MUTATION TARGETS. The suite runs against the IN-MEMORY store
 * (no DATABASE_URL), so a mutation of `prisma-dal.ts` would change nothing the suite can
 * observe and the harness would honestly report a miss against a working platform. Both
 * files below are product code the in-memory path really executes.
 */
const GATE = "src/lib/server/kyc-gate.ts";
const KYC = "src/lib/server/kyc-service.ts";

export const MUTATIONS = [
  {
    name: "deposit-gate-removed",
    why: "The pre-2026-09-05 behaviour for depositing, restored: identity stops being asked "
       + "before money comes in. If §1 stays green here, the suite cannot tell the gate from "
       + "its own absence.",
    file: GATE,
    from: `  if (kycStatus === "APPROVED") return { eligible: true };`,
    to: `  if (action === "DEPOSIT") return { eligible: true };\n  if (kycStatus === "APPROVED") return { eligible: true };`,
    check: "1.NOT_STARTED.deposit · refused",
  },
  {
    name: "bet-gate-removed",
    why: "The pre-2026-09-05 behaviour for staking. `auth/register/actions.ts` used to say so "
       + "in as many words — \"a new player is PENDING_KYC but can already bet\" — so this is "
       + "the exact regression a future reader is most likely to reintroduce from an old doc.",
    file: GATE,
    from: `  if (kycStatus === "APPROVED") return { eligible: true };`,
    to: `  if (action === "BET") return { eligible: true };\n  if (kycStatus === "APPROVED") return { eligible: true };`,
    check: "1.NOT_STARTED.bet · refused",
  },
  {
    name: "withdraw-gate-removed",
    why: "The 2026-08-20 shape: identity recorded on a payout but never enforced. Correct then, "
       + "and a silent reversal of the owner's ruling now.",
    file: GATE,
    from: `    if (k?.approvedAt) return { eligible: true };`,
    to: `    return { eligible: true };\n    if (k?.approvedAt) return { eligible: true };`,
    check: "1.NOT_STARTED.withdraw · refused",
  },
  {
    name: "withdraw-asks-current-status",
    why: "🔴 THE ONE THAT LOOKS LIKE A TIGHTENING AND IS A MONEY TRAP. Withdrawal asks "
       + "`status === APPROVED` instead of `approvedAt != null`, so a player mid-re-verification "
       + "— who HOLDS REAL MONEY earned under an identity we accepted — can no longer reach it. "
       + "Every other assertion in the suite still passes. This mutation removes the FIX, not "
       + "the symptom, which is the property that makes the fleet a proof.",
    file: GATE,
    from: `    if (k?.approvedAt) return { eligible: true };`,
    to: `    if (kycStatus === "APPROVED") return { eligible: true };`,
    check: "3.5 · ★★ WITHDRAWAL STILL WORKS — money already earned is never trapped",
  },
  {
    name: "first-approval-stamp-cleared-on-restart",
    why: "The write half of the same trap. `startKyc` is the ONE upsert in the codebase that "
       + "rebuilds a submission from scratch rather than spreading `...k`, and it is reachable "
       + "as APPROVED → forceReverify → REJECTED → \"start again\". Dropping the column there "
       + "locks a previously-verified player out of their own balance, and nothing else in the "
       + "platform would go red.",
    file: KYC,
    from: `    approvedAt: existing?.approvedAt ?? null,`,
    to: `    approvedAt: null,`,
    check: "4.3 · ★ …and the first-approval stamp came through the reset intact",
  },
  {
    name: "re-approval-restamps-the-first-approval-date",
    why: "Subtler than clearing it: every re-approval overwrites the date, turning the column "
       + "into a duplicate of `reviewedAt`. Withdrawals keep working, so §1–§3 stay green — but "
       + "the platform loses the only record that a re-verified player had been trusted before, "
       + "which is exactly the fact an auditor asks for on a payout made during re-verification.",
    file: KYC,
    from: `approvedAt: k.approvedAt ?? now,`,
    to: `approvedAt: now,`,
    check: "4.5 · ★ re-approval did NOT move the first-approval date",
  },
];
