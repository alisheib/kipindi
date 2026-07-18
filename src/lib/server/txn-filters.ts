/**
 * Transaction search — the ONE definition of how money rows are filtered and how
 * a row is judged to "need attention".
 *
 * Both DALs (the in-memory twin in `store.ts` and the Prisma one in
 * `prisma-dal.ts`) and the admin surface read their rules from here, so the
 * meaning of "unreconciled" or "stuck" can never drift between what the operator
 * sees and what the database returns (audit C8/C9: two definitions of one truth).
 *
 * ⚠️ REAL MONEY: `attentionOf()` is the operator's early-warning system. Every
 * non-terminal or unreconciled state MUST raise a flag here — a silent row is a
 * shilling nobody is watching.
 */
import type { StoredTxn } from "./store";

/** Money movements that ride an external payment gateway (and therefore MUST
 *  carry a providerRef once confirmed, or they cannot be reconciled). */
export const GATEWAY_TYPES: ReadonlyArray<StoredTxn["type"]> = ["DEPOSIT", "WITHDRAWAL"];

/** Providers that are a real external rail. INTERNAL/null never hits a gateway. */
export const GATEWAY_PROVIDERS: ReadonlyArray<NonNullable<StoredTxn["provider"]>> = [
  "MPESA", "TIGO_PESA", "AIRTEL_MONEY", "HALO_PESA", "MIXX", "TTCL_PESA", "CARD", "BANK_TRANSFER",
];

/** A PROCESSING money movement older than this has outlived any sane gateway
 *  round-trip and must be looked at (the reconcile sweep re-queries it, but an
 *  operator should still see it). Matches the reconcile cutoff. */
export const STUCK_PROCESSING_MS = 30 * 60 * 1000;

export type TxnSortField = "createdAt" | "amount" | "type" | "status" | "provider";

export type TxnSearchFilters = {
  /** Free text — matches txn id, providerRef, msisdn or userId (case-insensitive). */
  q?: string;
  types?: ReadonlyArray<StoredTxn["type"]>;
  statuses?: ReadonlyArray<StoredTxn["status"]>;
  providers?: ReadonlyArray<NonNullable<StoredTxn["provider"]>>;
  /** Inclusive lower / exclusive upper bound on createdAt (epoch ms). */
  fromMs?: number;
  toMs?: number;
  /** Only rows that need an operator's eye (see `attentionOf`). */
  attentionOnly?: boolean;
  skip?: number;
  take?: number;
  sort?: { field: TxnSortField; dir: "asc" | "desc" };
};

/** Compliance totals over the WHOLE filtered set (not just the current page) —
 *  an operator reconciling against a gateway statement needs the full figure. */
export type TxnSummary = {
  depositsConfirmedTzs: number;
  withdrawalsConfirmedTzs: number;
  feesTzs: number;
  inFlightCount: number;
  amlCount: number;
  failedCount: number;
  unreconciledCount: number;
};

export type TxnSearchResult = { rows: StoredTxn[]; total: number; summary: TxnSummary };

export type AttentionLevel = "warn" | "info";
export type Attention = { level: AttentionLevel; code: string; label: string; sw: string };

/**
 * Why this row needs a human. Returns null when the row is terminal and clean.
 * Ordered by severity — the first match wins, so the operator sees the worst thing.
 */
export function attentionOf(t: StoredTxn, nowMs: number = Date.now()): Attention | null {
  const isGateway = GATEWAY_TYPES.includes(t.type);

  // Money that left/entered the platform but carries no gateway reference cannot
  // be matched to a settlement line — the single most important compliance gap.
  if (isGateway && t.status === "CONFIRMED" && !t.providerRef) {
    return { level: "warn", code: "unreconciled", label: "No gateway reference", sw: "Hakuna kumbukumbu ya lango" };
  }
  // A payout awaiting a second officer (POCA/AML ≥ 1,000,000 TZS).
  if (t.status === "AML_REVIEW") {
    return { level: "warn", code: "aml", label: "Awaiting AML review", sw: "Inasubiri ukaguzi wa AML" };
  }
  // In flight far longer than any gateway should take.
  if (t.status === "PROCESSING" && nowMs - Date.parse(t.createdAt) > STUCK_PROCESSING_MS) {
    return { level: "warn", code: "stuck", label: "In flight over 30 min", sw: "Inasubiri zaidi ya dakika 30" };
  }
  if (t.status === "PROCESSING" || t.status === "PENDING") {
    return { level: "info", code: "inflight", label: "In flight", sw: "Inaendelea" };
  }
  if (t.status === "REVERSED") {
    return { level: "info", code: "reversed", label: "Reversed", sw: "Imerudishwa" };
  }
  if (t.status === "FAILED") {
    return { level: "info", code: "failed", label: "Failed", sw: "Imeshindwa" };
  }
  return null;
}

/** True when the row is unreconciled — confirmed gateway money with no provider ref. */
export function isUnreconciled(t: StoredTxn): boolean {
  return GATEWAY_TYPES.includes(t.type) && t.status === "CONFIRMED" && !t.providerRef;
}

/** Predicate used by the in-memory DAL. The Prisma DAL builds the equivalent
 *  `where` clause; keep the two in step (the search tests assert parity). */
export function matchesFilters(t: StoredTxn, f: TxnSearchFilters, nowMs: number = Date.now()): boolean {
  if (f.types?.length && !f.types.includes(t.type)) return false;
  if (f.statuses?.length && !f.statuses.includes(t.status)) return false;
  if (f.providers?.length && !(t.provider && f.providers.includes(t.provider))) return false;
  const created = Date.parse(t.createdAt);
  if (f.fromMs != null && created < f.fromMs) return false;
  if (f.toMs != null && created >= f.toMs) return false;
  if (f.q) {
    const q = f.q.trim().toLowerCase();
    const hay = [t.id, t.providerRef, t.msisdn, t.userId].filter(Boolean).join(" ").toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (f.attentionOnly && attentionOf(t, nowMs)?.level !== "warn") return false;
  return true;
}

/** Compliance totals for a filtered set. Shared by both DALs so the figures an
 *  operator reconciles against are computed one way only. */
export function summarise(rows: ReadonlyArray<StoredTxn>, nowMs: number = Date.now()): TxnSummary {
  const s: TxnSummary = {
    depositsConfirmedTzs: 0, withdrawalsConfirmedTzs: 0, feesTzs: 0,
    inFlightCount: 0, amlCount: 0, failedCount: 0, unreconciledCount: 0,
  };
  for (const t of rows) {
    if (t.type === "DEPOSIT" && t.status === "CONFIRMED") s.depositsConfirmedTzs += Math.abs(t.amount);
    if (t.type === "WITHDRAWAL" && t.status === "CONFIRMED") s.withdrawalsConfirmedTzs += Math.abs(t.amount);
    if (t.status === "CONFIRMED") s.feesTzs += t.fee ?? 0;
    if (t.status === "PROCESSING" || t.status === "PENDING") s.inFlightCount++;
    if (t.status === "AML_REVIEW") s.amlCount++;
    if (t.status === "FAILED") s.failedCount++;
    if (isUnreconciled(t)) s.unreconciledCount++;
  }
  void nowMs;
  return s;
}

/** Apply sort + pagination to an already-filtered set (in-memory DAL path). */
export function sortAndPage(rows: StoredTxn[], f: TxnSearchFilters): StoredTxn[] {
  const { field = "createdAt", dir = "desc" } = f.sort ?? {};
  const mul = dir === "asc" ? 1 : -1;
  const sorted = [...rows].sort((a, b) => {
    switch (field) {
      case "amount": return (Math.abs(a.amount) - Math.abs(b.amount)) * mul;
      case "type": return a.type.localeCompare(b.type) * mul;
      case "status": return a.status.localeCompare(b.status) * mul;
      case "provider": return String(a.provider ?? "").localeCompare(String(b.provider ?? "")) * mul;
      default: return (Date.parse(a.createdAt) - Date.parse(b.createdAt)) * mul;
    }
  });
  const skip = Math.max(0, f.skip ?? 0);
  const take = Math.max(1, Math.min(f.take ?? 50, 500));
  return sorted.slice(skip, skip + take);
}
