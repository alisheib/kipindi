/**
 * Mutation anchors for `red:refused-funds` — five ways S1 (2026-09-13) could quietly stop protecting a refused
 * player's money. A SIDECAR so `test:red-anchors` §3 re-resolves every anchor on every run without executing the
 * harness. Each mutation must be caught on its OWN assertion in `scripts/refused-funds.test.mts`.
 *
 * ⛔ An anchor quotes SOURCE. Editing one of these lines must be paired with re-anchoring here, or the harness
 * reports STALE — loudly, by design.
 */
const KYC = "src/lib/server/kyc-service.ts";
const WALLET = "src/lib/server/wallet-service.ts";
const FUNDS = "src/lib/server/refused-funds.ts";

export const MUTATIONS = [
  {
    name: "refusal-written-before-freeze",
    why: "The refusal written first and the freeze after: a freeze that fails leaves a refusal on record with no "
       + "freeze behind it, and the retry is refused because a decided submission cannot be decided again.",
    file: KYC,
    from: `    const freeze = await freezeForFinalRefusal(userId, k.id, rejectCode, officerId);
    if (!freeze.ok) return { ok: false as const, error: freeze.error, code: "INVALID" as const };
    await db.kyc.upsert({ ...k, status: "REJECTED", rejectReason: rejectCode, rejectNote: officerNote, reviewerId: officerId, reviewedAt: now, updatedAt: now });`,
    to: `    await db.kyc.upsert({ ...k, status: "REJECTED", rejectReason: rejectCode, rejectNote: officerNote, reviewerId: officerId, reviewedAt: now, updatedAt: now });
    const freeze = await freezeForFinalRefusal(userId, k.id, rejectCode, officerId);
    if (!freeze.ok) return { ok: false as const, error: freeze.error, code: "INVALID" as const };`,
    check: "A.2 a final refusal whose freeze fails writes NO refusal",
  },
  {
    name: "forfeit-without-ledger-post",
    why: "The forfeit debits the wallet and writes its transaction but posts no ledger group — the trial balance "
       + "drifts by every forfeited shilling. Postgres-only, so the suite holds it by source.",
    file: WALLET,
    from: "      await postLedgerEntries(`forfeit_${txnId}`,",
    to: "      await Promise.resolve(`forfeit_${txnId}`,",
    check: "C.3 the forfeit posts its balanced ledger group inside the money transaction",
  },
  {
    name: "justification-floor-removed",
    why: "A decision that sends away or keeps a player's whole balance recorded with a one-word reason.",
    file: FUNDS,
    from: "  if (justification.length < REFUSED_FUNDS_JUSTIFICATION_MIN) {",
    to: "  if (false) {",
    check: "B.3 a justification under 20 characters is refused",
  },
  {
    name: "return-charged-a-fee",
    why: "Money the platform decided to give back quietly reduced by the withdrawal fee.",
    file: WALLET,
    from: "  const fee = refundReturn ? 0 : computeWithdrawalFee(amount, wcfg.withdrawalFeeRate);",
    to: "  const fee = computeWithdrawalFee(amount, wcfg.withdrawalFeeRate);",
    check: "C.5 the return pays out with fee 0",
  },
  {
    name: "return-identity-recheck-removed",
    why: "The refused-funds option skips the identity gate; without its stricter re-check an officer could pay out "
       + "ANY account through it — fee-free, from a frozen wallet, with no identity question asked.",
    file: WALLET,
    from: '    if (!(refused?.status === "REJECTED" && isFinalRefusal(refused.rejectReason))) {',
    to: "    if (false) {",
    check: "E.1 withdraw() with refusedFundsReturn is refused for an account that is not finally refused",
  },
];
