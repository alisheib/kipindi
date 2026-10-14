/** A restriction on an owned signed read, never payment/status authority supplied by a browser. */
import { canonicalDepositFunding, ownedDeposit, sameDepositFunding, type DepositFundingIntent, type DepositRow } from "./deposit-state";

export const DEPOSIT_RECHECK_MAX_BYTES = 4096;
const ID = /^[a-z0-9_-]{1,128}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type FundingRow = DepositRow & { idempotencyKey?: string | null };
export type DepositRecheckBinding = {
  v: 1; owner: string; txnId: string; fundingKey: string | null; providerRef: string; funding: DepositFundingIntent;
};
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Only the complete canonical tuple is accepted. Explicit null preserves historic absence; it never mints a UUID. */
export function parseDepositRecheckBinding(raw: unknown): DepositRecheckBinding | null {
  if (!record(raw) || Object.keys(raw).sort().join(",") !== "funding,fundingKey,owner,providerRef,txnId,v" || raw.v !== 1
    || typeof raw.owner !== "string" || !ID.test(raw.owner) || typeof raw.txnId !== "string" || !ID.test(raw.txnId)
    || (raw.fundingKey !== null && (typeof raw.fundingKey !== "string" || !UUID.test(raw.fundingKey)))
    || typeof raw.providerRef !== "string" || raw.providerRef.length === 0 || raw.providerRef.length > 128
    || raw.providerRef.trim() !== raw.providerRef || /[\x00-\x1f\x7f]/.test(raw.providerRef)
    || !record(raw.funding) || Object.keys(raw.funding).sort().join(",") !== "amount,currency,msisdn,pendingBet,provider,type,userId") return null;
  const funding = canonicalDepositFunding(raw.funding);
  if (!funding || funding.userId !== raw.owner || funding.msisdn !== raw.funding.msisdn || raw.funding.pendingBet === undefined) return null;
  return { v: 1, owner: raw.owner, txnId: raw.txnId, fundingKey: raw.fundingKey as string | null, providerRef: raw.providerRef, funding };
}

/** Only an authenticated owned row can supply the original identity to a return/controller; an incoming URL cannot. */
export function depositRecheckBinding(owner: string, row: FundingRow | null): DepositRecheckBinding | null {
  if (!ownedDeposit(owner, row)) return null;
  const funding = canonicalDepositFunding(row);
  return funding ? parseDepositRecheckBinding({ v: 1, owner, txnId: row.id, fundingKey: row.idempotencyKey ?? null,
    providerRef: row.providerRef, funding }) : null;
}

/** The posted tuple can only narrow the authenticated row. Every fresh reread asks the same original restriction. */
export function matchesDepositRecheckBinding(owner: string, txnId: string, binding: DepositRecheckBinding, row: FundingRow | null): boolean {
  return binding.owner === owner && binding.txnId === txnId && ownedDeposit(owner, row) && row.id === txnId
    && (row.idempotencyKey ?? null) === binding.fundingKey && row.providerRef === binding.providerRef
    && sameDepositFunding(binding.funding, row);
}
