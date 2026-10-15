/** Server-only original-payment restrictions for signed background reads. No dispatch, status or refund authority. */
import { matchesDepositRecheckBinding, parseDepositRecheckBinding, type DepositRecheckBinding } from "@/lib/journey/deposit-recheck-binding";
import type { StoredTxn } from "./store";
import { isPayoutRail } from "./selcom";

export type WithdrawalProbeBinding = {
  kind: "withdrawal-probe"; owner: string; txnId: string; walletId: string; providerRef: string;
  amount: number; fee: number; currency: "TZS"; provider: string | null; msisdn: string | null;
  payoutRail: string | null; fundingKey: string | null;
};
export type ProcessingProbeBinding = DepositRecheckBinding | WithdrawalProbeBinding;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const id = (v: unknown): v is string => typeof v === "string" && /^[a-z0-9_-]{1,128}$/i.test(v);
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max && !/[\x00-\x1f\x7f]/.test(v);
const optionalText = (v: unknown, max: number) => v === null || text(v, max);

/** Preserve historical signed amount and non-UUID internal refund keys; never normalize a withdrawal into DEPOSIT. */
export function parseWithdrawalProbeBinding(raw: unknown): WithdrawalProbeBinding | null {
  if (!record(raw) || Object.keys(raw).sort().join(",") !== "amount,currency,fee,fundingKey,kind,msisdn,owner,payoutRail,provider,providerRef,txnId,walletId"
    || raw.kind !== "withdrawal-probe" || !id(raw.owner) || !id(raw.txnId) || !id(raw.walletId)
    || !text(raw.providerRef, 128) || raw.providerRef.trim() !== raw.providerRef || raw.currency !== "TZS"
    || typeof raw.amount !== "number" || !Number.isSafeInteger(raw.amount) || raw.amount === 0
    || typeof raw.fee !== "number" || !Number.isFinite(raw.fee) || raw.fee < 0 || raw.fee > Math.abs(raw.amount)
    || !optionalText(raw.provider, 64) || !optionalText(raw.msisdn, 64) || (raw.payoutRail !== null && !isPayoutRail(raw.payoutRail))
    || !optionalText(raw.fundingKey, 256)) return null;
  return { kind: "withdrawal-probe", owner: raw.owner, txnId: raw.txnId, walletId: raw.walletId, providerRef: raw.providerRef,
    amount: raw.amount, fee: raw.fee, currency: "TZS", provider: raw.provider as string | null, msisdn: raw.msisdn as string | null,
    payoutRail: raw.payoutRail as string | null, fundingKey: raw.fundingKey as string | null };
}

/** Snapshot only the known stored withdrawal; its current status/detail is allowed to change during verification. */
export function withdrawalProbeBinding(row: StoredTxn | null): WithdrawalProbeBinding | null {
  if (!row || row.type !== "WITHDRAWAL" || row.houseBotId != null || row.pendingBet != null) return null;
  return parseWithdrawalProbeBinding({ kind: "withdrawal-probe", owner: row.userId, txnId: row.id, walletId: row.walletId,
    providerRef: row.providerRef, amount: row.amount, fee: row.fee, currency: row.currency, provider: row.provider ?? null,
    msisdn: row.msisdn ?? null, payoutRail: row.payoutRail ?? null, fundingKey: row.idempotencyKey ?? null });
}

export function parseProcessingProbeBinding(raw: unknown): ProcessingProbeBinding | null {
  return record(raw) && raw.kind === "withdrawal-probe" ? parseWithdrawalProbeBinding(raw) : parseDepositRecheckBinding(raw);
}

/** Every claim rereads the original owner/type/id/ref/key/amount/fee/rail. The reference must also remain globally unique. */
export function matchesProcessingProbeBinding(binding: ProcessingProbeBinding, row: StoredTxn | null): boolean {
  if (!("kind" in binding)) return matchesDepositRecheckBinding(binding.owner, binding.txnId, binding, row);
  const fresh = withdrawalProbeBinding(row);
  return !!fresh && Object.keys(binding).every(key => fresh[key as keyof WithdrawalProbeBinding] === binding[key as keyof WithdrawalProbeBinding]);
}
