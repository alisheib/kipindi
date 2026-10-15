/** A restriction on an owned signed read, never payment/status authority supplied by a browser. */
import { canonicalDepositFunding, ownedDeposit, sameDepositFunding, type DepositFundingIntent, type DepositRow } from "./deposit-state";

export const DEPOSIT_RECHECK_MAX_BYTES = 4096;
const ID = /^[a-z0-9_-]{1,128}$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/**
 * A STORED funding key is opaque: it is only ever compared for equality with the row it came from, so its shape carries
 * no authority — bounded, printable text, the same rule as the withdrawal tuple (`payment-probe-binding.ts`).
 * ⛔ It used to be UUID-only here, which made `depositRecheckBinding` return null for a deposit stored under any other key
 * shape, and every automatic settle path (card return, owned status, the 15 s lane, the sweep) then refused that PAID
 * deposit for ever (S9 root review M4; `e2e:card` "double-submit · credited once only"). A UUID key is unaffected: the
 * comparison is the same byte equality as before.
 */
const STORED_KEY_MAX = 256;
const storedKey = (v: unknown): v is string | null =>
  v === null || (typeof v === "string" && v.length > 0 && v.length <= STORED_KEY_MAX && !/[\x00-\x1f\x7f]/.test(v));
/** `deposit()` refuses, before anything is reserved, a key this binding could not carry — so no stored deposit is ever
 *  outside the automatic settle paths because of its key's shape. One predicate, read by both. */
export function isStoredFundingKey(v: unknown): v is string {
  return typeof v === "string" && storedKey(v);
}
type FundingRow = DepositRow & { idempotencyKey?: string | null };
export type DepositRecheckBinding = {
  v: 1; owner: string; txnId: string; fundingKey: string | null; providerRef: string; funding: DepositFundingIntent;
};
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Only the complete canonical tuple is accepted. Explicit null preserves historic absence; it never mints a key. */
export function parseDepositRecheckBinding(raw: unknown): DepositRecheckBinding | null {
  if (!record(raw) || Object.keys(raw).sort().join(",") !== "funding,fundingKey,owner,providerRef,txnId,v" || raw.v !== 1
    || typeof raw.owner !== "string" || !ID.test(raw.owner) || typeof raw.txnId !== "string" || !ID.test(raw.txnId)
    || !storedKey(raw.fundingKey)
    || typeof raw.providerRef !== "string" || raw.providerRef.length === 0 || raw.providerRef.length > 128
    || raw.providerRef.trim() !== raw.providerRef || /[\x00-\x1f\x7f]/.test(raw.providerRef)
    || !record(raw.funding) || Object.keys(raw.funding).sort().join(",") !== "amount,currency,msisdn,pendingBet,provider,type,userId") return null;
  const funding = canonicalDepositFunding(raw.funding);
  if (!funding || funding.userId !== raw.owner || funding.msisdn !== raw.funding.msisdn || raw.funding.pendingBet === undefined) return null;
  return { v: 1, owner: raw.owner, txnId: raw.txnId, fundingKey: raw.fundingKey as string | null, providerRef: raw.providerRef, funding };
}

/**
 * The explicit recheck POST is the one door whose tuple ARRIVES FROM A BROWSER. Every key a player form mints is a UUID
 * (`IdempotencyKeyField`), so a posted capsule keeps the UUID-or-null shape and anything else is refused before any
 * lookup — as the recover route's `?key=` input is (`deposit-status.ts`). Server-built bindings use the stored rule above.
 */
export function parsePostedDepositRecheckBinding(raw: unknown): DepositRecheckBinding | null {
  const binding = parseDepositRecheckBinding(raw);
  return binding && (binding.fundingKey === null || UUID.test(binding.fundingKey)) ? binding : null;
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
