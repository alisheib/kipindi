/**
 * GET /api/admin/transactions/export — the compliance CSV.
 *
 * The artefact handed to a regulator (GBT/FIU) or used to reconcile against a
 * payment gateway's settlement statement (Selcom). One row per money movement,
 * carrying the gateway reference and the operator flag, so every line can be
 * matched — or explicitly shown as unmatched.
 *
 * ⚠️ This exports money data AND PII (msisdn). Therefore:
 *  - the `accounting` domain reaches it, same gate as the page;
 *  - ⛔ but the msisdn COLUMN is governed separately, by the READ axis: full only for a role
 *    whose `identity.contact` cell is `read`, masked otherwise, and the header says which.
 *    ⚠️ CORRECTED 2026-09-06 — this block used to claim "MONEY_ROLES only (ADMIN, COMPLIANCE)"
 *    and the code said `canView(role, "accounting")`, which is also FINANCE and AUDITOR. Both of
 *    those sit at the `masked` ceiling, so the doc named a narrower gate than the one that ran
 *    and the file handed out fifty thousand unmasked handsets to roles forbidden a single one;
 *  - a FULL pull additionally writes `pii.revealed` with the row count, because
 *    `transactions.exported` alone does not record that PII left the building;
 *  - values are CSV-injection-escaped (a leading =, +, -, @ becomes text) so an
 *    exported cell can never execute in Excel.
 */
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { canView, mayReveal } from "@/lib/server/rbac";
import { maskPhone } from "@/lib/phone-normalize";
import { audit } from "@/lib/server/audit";
import { db, TXN_TYPES } from "@/lib/server/store";
import { attentionOf, type TxnSearchFilters } from "@/lib/server/txn-filters";
import { resolveRange } from "@/lib/server/date-range";
import type { StoredTxn } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Hard ceiling so one click can never try to stream the whole table into memory. */
const MAX_ROWS = 50_000;

// ⭐ Derived from the store — a type absent here is silently dropped from the officer's CSV.
const TYPES: readonly string[] = TXN_TYPES;
const STATUSES = ["PENDING", "PROCESSING", "AML_REVIEW", "CONFIRMED", "FAILED", "REVERSED", "CANCELLED"];
const PROVIDERS = ["MPESA", "TIGO_PESA", "AIRTEL_MONEY", "HALO_PESA", "MIXX", "TTCL_PESA", "CARD", "BANK_TRANSFER", "INTERNAL"];

/** RFC-4180 quoting + spreadsheet-formula neutralisation. */
function cell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * ⭐ THE COLUMN NAMES ITSELF `msisdn_masked` WHEN IT IS MASKED, AND THAT IS NOT COSMETIC. A CSV
 * has no eye and no tooltip; a reconciler matching our file against Selcom's statement would
 * otherwise read `+255••••01` as a corrupt number and open an incident. The header is the only
 * place a spreadsheet can say which of the two artefacts this is.
 */
const headers = (full: boolean) => [
  "txn_id", "created_at", "completed_at", "player_id", "type", "status",
  "provider", "gateway_ref", full ? "msisdn" : "msisdn_masked", "amount_tzs", "fee_tzs", "currency",
  "balance_after_tzs", "flag", "description",
];

function toRow(t: StoredTxn, full: boolean): string {
  const flag = attentionOf(t);
  return [
    cell(t.id), cell(t.createdAt), cell(t.completedAt), cell(t.userId), cell(t.type), cell(t.status),
    cell(t.provider), cell(t.providerRef), cell(t.msisdn == null ? null : full ? t.msisdn : maskPhone(t.msisdn)),
    cell(t.amount), cell(t.fee), cell(t.currency),
    cell(t.balanceAfter), cell(flag?.code ?? "ok"), cell(t.description),
  ].join(",");
}

export async function GET(req: Request) {
  const session = await currentSession();
  if (!session || !(session.role === "ADMIN" || (await canView(session.role, "accounting")))) {
    // Same shape as any other missing route — don't confirm the endpoint exists.
    return new NextResponse("Not Found", { status: 404 });
  }

  const url = new URL(req.url);
  const g = (k: string) => url.searchParams.get(k) ?? undefined;
  // ONE window resolver — same as the page, so the CSV matches the on-screen filter
  // exactly (presets + custom date+hour+minute, EAT-safe). Default 28d.
  const range = resolveRange({ range: g("range"), from: g("from"), to: g("to") }, Date.now(), "28d");
  const type = TYPES.includes(g("type") ?? "") ? (g("type") as StoredTxn["type"]) : undefined;
  const status = STATUSES.includes(g("status") ?? "") ? (g("status") as StoredTxn["status"]) : undefined;
  const provider = PROVIDERS.includes(g("provider") ?? "") ? (g("provider") as NonNullable<StoredTxn["provider"]>) : undefined;
  const q = (g("q") ?? "").trim().slice(0, 120) || undefined;
  const attentionOnly = g("attention") === "1";

  const filters: TxnSearchFilters = {
    q, attentionOnly,
    types: type ? [type] : undefined,
    statuses: status ? [status] : undefined,
    providers: provider ? [provider] : undefined,
    // "All time" (preset all → start 0) means no lower bound; else the resolved window.
    fromMs: range.start > 0 ? range.start : undefined,
    toMs: range.end,
    take: MAX_ROWS,
    sort: { field: "createdAt", dir: "desc" },
  };

  const { rows, total, summary } = await Promise.resolve(db.txn.search(filters));
  const truncated = total > rows.length;

  /**
   * 🔴 THE EXPOSURE THIS CLOSES (found 2026-09-06, live since the export shipped). The gate above
   * is `accounting`, which FINANCE and AUDITOR both hold — and both sit at `identity.contact:
   * masked`, the ceiling meaning "may never reveal". So two roles the matrix forbids from reading
   * one unmasked phone could pull FIFTY THOUSAND of them into a file, in a single click, and
   * nothing anywhere said no. It is the same shape §7 already found for GROWTH reading emails:
   * a role scoped to one domain handed another domain's facts because they share a route.
   *
   * ⛔ THE ANSWER IS NOT TO REFUSE THE EXPORT. Its purpose is reconciling our ledger against
   * Selcom's settlement statement, which needs the amounts and the gateway refs, not the
   * handsets — so the artefact stays, and the ONE column the matrix governs is masked for a role
   * that may not reveal it. READ_TIERS only ever subtracts (§2.2), and a masked cell is exactly
   * what the `masked` cell means; nobody loses a reconciliation they could do yesterday.
   *
   * ⭐ AND A FULL PULL IS RECORDED AS WHAT IT IS: a bulk PII read, under the same `pii.revealed`
   * action a single eye-click writes, carrying the ROW COUNT. "Support did read it, at 14:02,
   * for player X" is D4's whole point; an export is that sentence multiplied, and it was
   * previously recorded only as `transactions.exported`, which does not say PII left the
   * building. ⚠️ Awaited BEFORE the file is returned, for the same reason the single reveal is.
   */
  const fullMsisdn = await mayReveal(session.role, "identity.contact");
  const msisdnRows = rows.filter((t) => t.msisdn != null).length;
  if (fullMsisdn && msisdnRows > 0) {
    await audit({
      category: "COMPLIANCE",
      action: "pii.revealed",
      actorId: session.userId,
      targetType: "Transaction",
      targetId: null,
      // ⛔ The COUNT and the CLASS, never a value — the same rule the single-field reveal obeys.
      payload: { field: "msisdn", readClass: "identity.contact", role: session.role, bulk: true, rows: msisdnRows },
    });
  }

  audit({
    category: "COMPLIANCE",
    action: "transactions.exported",
    actorId: session.userId,
    targetType: "Transaction",
    targetId: null,
    payload: {
      filters: { range: range.preset, from: range.from ?? null, to: range.to ?? null, window: range.label, type: type ?? null, status: status ?? null, provider: provider ?? null, q: q ?? null, attentionOnly },
      rows: rows.length, matched: total, truncated,
      depositsConfirmedTzs: summary.depositsConfirmedTzs,
      withdrawalsConfirmedTzs: summary.withdrawalsConfirmedTzs,
      unreconciledCount: summary.unreconciledCount,
    },
  });

  const body = [headers(fullMsisdn).join(","), ...rows.map((t) => toRow(t, fullMsisdn))].join("\r\n") + "\r\n";
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="50pick-transactions-${stamp}.csv"`,
      "Cache-Control": "no-store",
      // Tell the operator plainly if the ceiling clipped the export.
      "X-Rows-Exported": String(rows.length),
      "X-Rows-Matched": String(total),
      "X-Export-Truncated": String(truncated),
    },
  });
}
