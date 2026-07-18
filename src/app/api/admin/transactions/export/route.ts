/**
 * GET /api/admin/transactions/export — the compliance CSV.
 *
 * The artefact handed to a regulator (GBT/FIU) or used to reconcile against a
 * payment gateway's settlement statement (Selcom). One row per money movement,
 * carrying the gateway reference and the operator flag, so every line can be
 * matched — or explicitly shown as unmatched.
 *
 * ⚠️ This exports money data AND PII (msisdn). Therefore:
 *  - MONEY_ROLES only (ADMIN, COMPLIANCE), same gate as the page;
 *  - every export is COMPLIANCE-audited with the exact filter set and row count,
 *    so who pulled which data, when, is provable;
 *  - values are CSV-injection-escaped (a leading =, +, -, @ becomes text) so an
 *    exported cell can never execute in Excel.
 */
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { hasRole, MONEY_ROLES } from "@/lib/server/roles";
import { audit } from "@/lib/server/audit";
import { db } from "@/lib/server/store";
import { attentionOf, type TxnSearchFilters } from "@/lib/server/txn-filters";
import type { StoredTxn } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Hard ceiling so one click can never try to stream the whole table into memory. */
const MAX_ROWS = 50_000;

const TYPES = ["DEPOSIT", "WITHDRAWAL", "BET_PLACED", "BET_PAYOUT", "BET_REFUND", "BONUS_CREDIT", "ADJUSTMENT_DEBIT", "ADJUSTMENT_CREDIT", "CASHOUT", "HOUSE_FEE"];
const STATUSES = ["PENDING", "PROCESSING", "AML_REVIEW", "CONFIRMED", "FAILED", "REVERSED", "CANCELLED"];
const PROVIDERS = ["MPESA", "TIGO_PESA", "AIRTEL_MONEY", "HALO_PESA", "MIXX", "TTCL_PESA", "CARD", "BANK_TRANSFER", "INTERNAL"];

function rangeToFromMs(range: string, now = Date.now()): number | undefined {
  const DAY = 86_400_000;
  if (range === "today") return new Date(new Date(now).toISOString().slice(0, 10)).getTime();
  if (range === "7d") return now - 7 * DAY;
  if (range === "28d") return now - 28 * DAY;
  return undefined;
}

/** RFC-4180 quoting + spreadsheet-formula neutralisation. */
function cell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

const HEADERS = [
  "txn_id", "created_at", "completed_at", "player_id", "type", "status",
  "provider", "gateway_ref", "msisdn", "amount_tzs", "fee_tzs", "currency",
  "balance_after_tzs", "flag", "description",
] as const;

function toRow(t: StoredTxn): string {
  const flag = attentionOf(t);
  return [
    cell(t.id), cell(t.createdAt), cell(t.completedAt), cell(t.userId), cell(t.type), cell(t.status),
    cell(t.provider), cell(t.providerRef), cell(t.msisdn), cell(t.amount), cell(t.fee), cell(t.currency),
    cell(t.balanceAfter), cell(flag?.code ?? "ok"), cell(t.description),
  ].join(",");
}

export async function GET(req: Request) {
  const session = await currentSession();
  if (!session || !hasRole(session.role, MONEY_ROLES)) {
    // Same shape as any other missing route — don't confirm the endpoint exists.
    return new NextResponse("Not Found", { status: 404 });
  }

  const url = new URL(req.url);
  const g = (k: string) => url.searchParams.get(k) ?? undefined;
  const range = g("range") ?? "28d";
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
    fromMs: rangeToFromMs(range),
    take: MAX_ROWS,
    sort: { field: "createdAt", dir: "desc" },
  };

  const { rows, total, summary } = await Promise.resolve(db.txn.search(filters));
  const truncated = total > rows.length;

  audit({
    category: "COMPLIANCE",
    action: "transactions.exported",
    actorId: session.userId,
    targetType: "Transaction",
    targetId: null,
    payload: {
      filters: { range, type: type ?? null, status: status ?? null, provider: provider ?? null, q: q ?? null, attentionOnly },
      rows: rows.length, matched: total, truncated,
      depositsConfirmedTzs: summary.depositsConfirmedTzs,
      withdrawalsConfirmedTzs: summary.withdrawalsConfirmedTzs,
      unreconciledCount: summary.unreconciledCount,
    },
  });

  const body = [HEADERS.join(","), ...rows.map(toRow)].join("\r\n") + "\r\n";
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
