/**
 * Mutation anchors for `red:kyc-gate` — the identity gate on money leaving (2026-09-13).
 *
 * ⛔ A SIDECAR, NOT AN INLINE ARRAY. `test:red-anchors` §3 re-resolves every anchor below on every run
 * WITHOUT executing the harness, so a rewritten source line is caught the day it lands rather than the
 * next time somebody runs the fleet. §4 holds a ceiling of undeclared harnesses that may only shrink.
 *
 * ── ⭐ WHAT THIS FLEET HAS TO PROVE (re-derived 2026-09-13, when the rule inverted) ──────────────
 *
 * The owner ruled that identity is required before WITHDRAWAL only (docs/COMPLIANCE-DECISIONS.md,
 * top 2026-09-13 entries). The fleet written on 2026-09-05 proved the opposite for deposit and bet —
 * its `deposit-gate-removed` and `bet-gate-removed` planted what is now the CORRECT product. So every
 * case below was re-derived from the current source, and the fleet now has four jobs:
 *
 *   1. the withdrawal gate cannot disappear, or quietly ask the wrong question;
 *   2. the first-approval stamp that question reads cannot be cleared or re-stamped;
 *   3. 🔴 the 2026-09-05 deposit and bet gates cannot come back unseen — the regression a reader of
 *      an older document is most likely to reintroduce "for safety";
 *   4. the RECORD that replaced those gates cannot be dropped, cannot grow into a second audit row per
 *      bet, and cannot itself start refusing money.
 *
 * 🔴 THE ONE THAT MATTERS MOST IS STILL `withdraw-asks-current-status`. It is not a missing gate — it
 * is the gate asking the WRONG QUESTION, and it reads as STRICTER than the real one. Every refusal in
 * §1 still fires and a reviewer would call it a tightening. What it does is lock a re-verifying player
 * out of money they already earned under an identity we accepted.
 *
 * ⚠️ AND NOTE WHICH FILE EACH MUTATION TARGETS. The suite runs against the IN-MEMORY store (no
 * DATABASE_URL), so a mutation of `prisma-dal.ts` would change nothing the suite can observe. Every
 * file below is product code the in-memory path really executes.
 *
 * ⚠️ `to` STRINGS ARE PLAIN JAVASCRIPT, NOT TYPESCRIPT. tsx strips types without checking them, but a
 * syntax error would crash the suite, and a crash prints no FAIL line — the harness would report the
 * mutation as red on the wrong assertion. Each injection therefore stays valid as written.
 */
const GATE = "src/lib/server/kyc-gate.ts";
const APPROVAL = "src/lib/kyc-approval.ts";
const KYC = "src/lib/server/kyc-service.ts";
const WALLET = "src/lib/server/wallet-service.ts";
const MARKET = "src/lib/server/market-service.ts";

export const MUTATIONS = [
  {
    name: "withdraw-gate-removed",
    why: "The 2026-08-20 shape: identity recorded on a payout but never enforced. The refusal branch "
       + "in withdraw() stops being taken, so a never-approved account's money leaves. After "
       + "2026-09-13 this is the ONLY identity question on any money path — losing it loses all of it.",
    file: WALLET,
    from: `  } else if (!withdrawGate.eligible) {`,
    to: `  } else if (false) {`,
    check: "1.NOT_STARTED.withdraw · REFUSED",
  },
  {
    name: "withdraw-asks-current-status",
    why: "🔴 THE ONE THAT LOOKS LIKE A TIGHTENING AND IS A MONEY TRAP. `approvedEver` drops its "
       + "`approvedAt` half and asks only `status === APPROVED`, so an account mid-re-verification — "
       + "which HOLDS REAL MONEY earned under an identity we accepted — can no longer reach it. Every "
       + "never-approved refusal still fires. It mutates the ONE predicate the gate and the withdraw "
       + "page share, which removes the fix rather than the symptom.",
    file: APPROVAL,
    from: `  return !!facts?.approvedAt || facts?.status === "APPROVED";`,
    to: `  return facts?.status === "APPROVED";`,
    check: "3.4 · ★★ WITHDRAWAL STILL WORKS mid-re-verification",
  },
  {
    name: "first-approval-stamp-cleared-on-restart",
    why: "The write half of the same trap. `restartedSubmission` rebuilds a submission from scratch "
       + "rather than spreading `...k`, and it is reachable as APPROVED → forceReverify → REJECTED → "
       + "\"start again\" (and from an officer's reopening of a final refusal). Dropping the column "
       + "there locks a previously-verified account out of its own balance.",
    file: KYC,
    from: `    approvedAt: existing?.approvedAt ?? null,`,
    to: `    approvedAt: null,`,
    check: "4.3 · ★ …and the first-approval stamp came through the reset intact",
  },
  {
    name: "re-approval-restamps-the-first-approval-date",
    why: "Subtler than clearing it: every re-approval overwrites the date, turning the column into a "
       + "duplicate of `reviewedAt`. Withdrawals keep working, so §1–§3 stay green — but the platform "
       + "loses the only record that a re-verified account had been trusted before, which is the fact "
       + "an auditor asks for on a payout made during re-verification.",
    file: KYC,
    from: `approvedAt: k.approvedAt ?? now,`,
    to: `approvedAt: now,`,
    check: "4.5 · ★ re-approval did NOT move the first-approval date",
  },
  {
    name: "deposit-gate-restored",
    why: "🔴 The 2026-09-05 deposit gate, put back exactly where it stood — between the RG lockout and "
       + "the email gate, asking the withdrawal question. It reads as prudence and it is a reversal of "
       + "the owner's ruling: a player who has confirmed their email is told to verify identity before "
       + "they may add money. `deposit()` still imports the gate, so this is one line away.",
    file: WALLET,
    from: `  if (!depositor?.emailVerifiedAt) {`,
    to: `  const identityGate = await assertIdentityForPayout(userId);\n`
      + `  if (!identityGate.eligible) return { ok: false, error: "Identity not verified.", code: "INVALID", reason: identityGate.reason };\n`
      + `  if (!depositor?.emailVerifiedAt) {`,
    check: "1.NOT_STARTED.deposit · goes through with a confirmed email",
  },
  {
    name: "bet-gate-restored",
    why: "🔴 The 2026-09-05 stake gate, rebuilt from what `buyPosition` still imports: the RECORD's own "
       + "reader used as a decision. `readIdentityStanding`'s header forbids exactly this (\"nothing it "
       + "returns may be used to decide one\"), and the structural census in §8 cannot see it because "
       + "it never names `assertIdentityForPayout` — only the driven stake can.",
    file: MARKET,
    from: `  const market = await marketStore.get(opts.marketId);`,
    to: `  const identityStanding = await readIdentityStanding(userId);\n`
      + `  if (!identityStanding.everApproved) return { ok: false, error: "Identity not verified.", code: "INVALID", reason: "kyc_not_verified" };\n`
      + `  const market = await marketStore.get(opts.marketId);`,
    check: "1.NOT_STARTED.bet · accepted",
  },
  {
    name: "deposit-record-dropped",
    why: "The deposit gate's replacement, deleted. Money in keeps working, so every behavioural check "
       + "stays green — and the compliance record of which deposits arrived before identity was ever "
       + "checked silently stops being written, on the row the 2026-09-13 ruling relies on.",
    file: WALLET,
    from: `amount: parse.data.amount, kycStatus: standing.kycStatus, everApproved: standing.everApproved } });`,
    to: `amount: parse.data.amount } });`,
    check: "7.2 · deposit.initiated carries kycStatus AND everApproved",
  },
  {
    name: "bet-record-dropped",
    why: "The bet gate's replacement, deleted — the same silent loss on the stake path. Nothing a "
       + "player can see changes.",
    file: MARKET,
    // Re-anchored 2026-09-14 (house bots build commit 2): the payload became a multi-line object when the
    // house marker fields were added beside these two; the injected defect is unchanged.
    from: `payoutIfWin: c.payoutIfWin, kycStatus: standing.kycStatus, everApproved: standing.everApproved,`,
    to: `payoutIfWin: c.payoutIfWin,`,
    check: "7.5 · one bet writes EXACTLY ONE market.position.opened row, with kycStatus AND everApproved",
  },
  {
    name: "bet-record-becomes-its-own-event",
    why: "The record promoted to a row of its own — the \"cleaner\" design `readIdentityStanding`'s "
       + "header rejects: every audit append is serialised through one database-global writer, and a "
       + "second row per bet doubles the load on it on the hottest path in the repo. ⭐ The fields are "
       + "deliberately LEFT on `market.position.opened` too, so the row-count assertion is the only "
       + "check in the suite that can see this — proving it is not dead weight.",
    file: MARKET,
    from: `    const standing = await readIdentityStanding(userId);\n    audit({\n      category: "BET",\n      action: "market.position.opened",`,
    to: `    const standing = await readIdentityStanding(userId);\n`
      + `    audit({ category: "COMPLIANCE", action: "bet.identity_standing", actorId: userId, targetType: "Position", targetId: c.positionId, payload: { kycStatus: standing.kycStatus, everApproved: standing.everApproved } });\n`
      + `    audit({\n      category: "BET",\n      action: "market.position.opened",`,
    check: "7.6 · ⛔ …and the bet wrote NO other identity row",
  },
  {
    name: "record-refuses",
    why: "The record starts refusing: `readIdentityStanding` rethrows a failed KYC read instead of "
       + "stamping UNREADABLE. It reads as \"fail loudly\", and it turns a database hiccup on the KYC "
       + "table into a deposit that dies after its PROCESSING row was reserved and a stake that throws "
       + "after it committed — the identity question back on money in, by the side door.",
    file: GATE,
    from: `  } catch {\n    return { kycStatus: "UNREADABLE", everApproved: null };`,
    to: `  } catch (err) {\n    throw err;`,
    check: "6.4 · ★ a deposit still goes through when the identity read fails",
  },
];
