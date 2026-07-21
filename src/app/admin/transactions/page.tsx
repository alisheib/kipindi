/**
 * Admin → Transactions: the compliance home for every money movement.
 *
 * WHY THIS EXISTS: transaction rows were previously reachable only per-player, via
 * the AML queue, or as the unmatched list on /admin/payments. A regulator (GBT/FIU)
 * or a payment gateway (Selcom) reconciliation asks a different question — "show me
 * every movement in this window, with the gateway reference, and prove none is
 * unaccounted for." This page is that answer, and the CSV export is the artefact.
 *
 * ⚠️ REAL MONEY. Two rules hold this page honest:
 *  1. Every row carries an explicit operator signal (`attentionOf`) — a movement that
 *     is neither clean-terminal nor flagged would be money nobody is watching.
 *  2. The KPI totals are computed over the WHOLE filtered set, never the visible page,
 *     so a figure reconciled against a gateway statement is the real figure.
 * Both rules live in `src/lib/server/txn-filters.ts` — the single source this page,
 * the CSV route and both DALs read, so operator view and database can never drift.
 *
 * Access: MONEY_ROLES only (ADMIN, COMPLIANCE) — msisdn + gateway refs are PII and
 * settlement data. Exports are audited in the API route.
 */
import Link from "next/link";
import { AdminPageHead, AdminKpi, AdminCard } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { AdminRestricted } from "@/components/admin/admin-restricted";
import { ScrollX } from "@/components/ui/scroll-x";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip } from "@/components/ui/chip";
import { currentSession } from "@/lib/server/auth-service";
import { hasRole, MONEY_ROLES } from "@/lib/server/roles";
import { db } from "@/lib/server/store";
import { attentionOf, GATEWAY_TYPES, type TxnSearchFilters } from "@/lib/server/txn-filters";
import { formatTzs, formatDateTimeSafe } from "@/lib/utils";
import type { StoredTxn } from "@/lib/server/store";

export const dynamic = "force-dynamic";

const TYPES = ["DEPOSIT", "WITHDRAWAL", "BET_PLACED", "BET_PAYOUT", "BET_REFUND", "BONUS_CREDIT", "ADJUSTMENT_DEBIT", "ADJUSTMENT_CREDIT", "CASHOUT", "HOUSE_FEE"] as const;
const STATUSES = ["PENDING", "PROCESSING", "AML_REVIEW", "CONFIRMED", "FAILED", "REVERSED", "CANCELLED"] as const;
// Status → Chip variant, so the column reads as a badge like every other admin
// table (was plain grey text). Money semantics: CONFIRMED=success, in-flight=info,
// held-for-review=warning, did-not-complete/returned=danger.
const TXN_STATUS_VARIANT: Record<(typeof STATUSES)[number], "success" | "info" | "warning" | "danger" | "neutral"> = {
  CONFIRMED: "success",
  PENDING: "info",
  PROCESSING: "info",
  AML_REVIEW: "warning",
  FAILED: "danger",
  REVERSED: "danger",
  CANCELLED: "neutral",
};
const PROVIDERS = ["MPESA", "TIGO_PESA", "AIRTEL_MONEY", "HALO_PESA", "MIXX", "TTCL_PESA", "CARD", "BANK_TRANSFER", "INTERNAL"] as const;

/** Preset windows — deliberately a select, not a date input: the house rule is that
 *  date entry goes through DateSelect, and a filter bar does not need free dates. */
const RANGES = { today: "Today", "7d": "Last 7 days", "28d": "Last 28 days", all: "All time" } as const;
const RANGE_SW: Record<keyof typeof RANGES, string> = { today: "Leo", "7d": "Siku 7", "28d": "Siku 28", all: "Muda wote" };
type RangeKey = keyof typeof RANGES;

function rangeToFromMs(range: RangeKey, now = Date.now()): number | undefined {
  const DAY = 86_400_000;
  if (range === "today") return new Date(new Date(now).toISOString().slice(0, 10)).getTime();
  if (range === "7d") return now - 7 * DAY;
  if (range === "28d") return now - 28 * DAY;
  return undefined;
}

type SP = Record<string, string | undefined>;

export default async function AdminTransactionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await currentSession();
  if (!session || !hasRole(session.role, MONEY_ROLES)) {
    return <AdminRestricted title="Transactions" sw="Miamala" need="Admin or Compliance" />;
  }

  const sp = await searchParams;
  const range = (sp.range && sp.range in RANGES ? sp.range : "28d") as RangeKey;
  const type = TYPES.includes(sp.type as never) ? (sp.type as StoredTxn["type"]) : undefined;
  const status = STATUSES.includes(sp.status as never) ? (sp.status as StoredTxn["status"]) : undefined;
  const provider = PROVIDERS.includes(sp.provider as never) ? (sp.provider as NonNullable<StoredTxn["provider"]>) : undefined;
  const q = (sp.q ?? "").trim().slice(0, 120) || undefined;
  const attentionOnly = sp.attention === "1";

  const filters: TxnSearchFilters = {
    q, attentionOnly,
    types: type ? [type] : undefined,
    statuses: status ? [status] : undefined,
    providers: provider ? [provider] : undefined,
    fromMs: rangeToFromMs(range),
    take: PER_PAGE,
  };

  // Count-only pass first so the pager knows the real total before we page into it.
  // (The in-memory dev store returns sync values while tsc sees Prisma's async
  // types — hence Promise.resolve. See 50pick-standards §9.)
  const head = await Promise.resolve(db.txn.search({ ...filters, take: 1, skip: 0 }));
  const page = parsePage(sp.page, head.total);
  const result = await Promise.resolve(db.txn.search({ ...filters, skip: (page - 1) * PER_PAGE }));
  const { rows, total, summary } = result;

  const baseHref = buildBaseHref("/admin/transactions", sp, "page");
  const qs = new URLSearchParams(
    Object.entries({ range, type, status, provider, q, attention: attentionOnly ? "1" : undefined })
      .filter(([, v]) => v != null && v !== "") as [string, string][],
  ).toString();

  return (
    <>
      <AdminPageHead
        title="Transactions"
        sw="Miamala"
        // The window is one filter among several and lives in the Filter card —
        // showing the shell's period picker here too would be a dead control.
        period={false}
        actions={
          <a
            href={`/api/admin/transactions/export${qs ? `?${qs}` : ""}`}
            className="btn btn-ghost btn-md btn-pill admin-focus"
            data-testid="txn-export-csv"
          >
            Export CSV
          </a>
        }
      />

      {/* Compliance totals — over the WHOLE filtered set, not this page. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminKpi label="Deposits in" sw="Amana zilizoingia" value={formatTzs(summary.depositsConfirmedTzs)} />
        <AdminKpi label="Withdrawals out" sw="Malipo yaliyotoka" value={formatTzs(summary.withdrawalsConfirmedTzs)} />
        <AdminKpi label="Fees & commission" sw="Ada na tume" value={formatTzs(summary.feesTzs)} />
        <AdminKpi
          label="Unreconciled"
          sw="Hayajalinganishwa"
          value={summary.unreconciledCount.toLocaleString()}
          pulse={summary.unreconciledCount > 0}
        />
      </div>

      {/* The three states an operator must never miss. Each links into its filter. */}
      {(summary.unreconciledCount > 0 || summary.amlCount > 0 || summary.inFlightCount > 0) && (
        <div className="mt-3 flex flex-wrap gap-2" role="status" aria-live="polite">
          {summary.unreconciledCount > 0 && (
            <Link href="/admin/transactions?attention=1" className="admin-focus inline-flex min-h-[40px] items-center gap-2 rounded-pill border border-border bg-bg-overlay px-3 text-sm text-text-secondary">
              <Chip variant="warning" size="sm">{summary.unreconciledCount}</Chip>
              No gateway reference · hakuna kumbukumbu
            </Link>
          )}
          {summary.amlCount > 0 && (
            <Link href="/admin/transactions?status=AML_REVIEW" className="admin-focus inline-flex min-h-[40px] items-center gap-2 rounded-pill border border-border bg-bg-overlay px-3 text-sm text-text-secondary">
              <Chip variant="warning" size="sm">{summary.amlCount}</Chip>
              Awaiting AML review · ukaguzi wa AML
            </Link>
          )}
          {summary.inFlightCount > 0 && (
            <Link href="/admin/transactions?status=PROCESSING" className="admin-focus inline-flex min-h-[40px] items-center gap-2 rounded-pill border border-border bg-bg-overlay px-3 text-sm text-text-secondary">
              <Chip variant="info" size="sm">{summary.inFlightCount}</Chip>
              In flight · zinaendelea
            </Link>
          )}
        </div>
      )}

      <AdminCard title="Filter" sw="Chuja" className="mt-4">
        <form method="get" action="/admin/transactions" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="flex flex-col gap-1 lg:col-span-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">Search · Tafuta</span>
            <input
              type="search" name="q" defaultValue={q ?? ""} placeholder="Gateway ref, phone, txn or player id"
              className="admin-focus min-h-[40px] rounded-lg border border-border bg-bg-overlay px-3 text-sm text-text placeholder:text-text-subtle"
            />
          </label>
          <FilterSelect name="range" label="Window · Dirisha" value={range} options={Object.entries(RANGES).map(([v, l]) => [v, `${l} · ${RANGE_SW[v as RangeKey]}`])} />
          <FilterSelect name="type" label="Type · Aina" value={type ?? ""} options={[["", "All"], ...TYPES.map((t) => [t, t.replace(/_/g, " ")] as [string, string])]} />
          <FilterSelect name="status" label="Status · Hali" value={status ?? ""} options={[["", "All"], ...STATUSES.map((s) => [s, s.replace(/_/g, " ")] as [string, string])]} />
          <FilterSelect name="provider" label="Provider · Mtoa" value={provider ?? ""} options={[["", "All"], ...PROVIDERS.map((p) => [p, p.replace(/_/g, " ")] as [string, string])]} />
          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between lg:col-span-6">
            <label className="admin-focus flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg border border-border bg-bg-overlay px-3 text-sm text-text-secondary">
              <input type="checkbox" name="attention" value="1" defaultChecked={attentionOnly} className="shrink-0 accent-[var(--royal)]" />
              <span className="whitespace-nowrap">Attention only · Uangalizi</span>
            </label>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-ghost btn-md btn-pill admin-focus">Apply · Tumia</button>
              <Link href="/admin/transactions" className="btn btn-ghost btn-md btn-pill admin-focus">Reset</Link>
            </div>
          </div>
        </form>
      </AdminCard>

      <AdminCard
        title={`Movements · ${total.toLocaleString()}`}
        sw="Miamala"
        className="mt-4"
        action={<span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">{RANGES[range]}</span>}
      >
        {rows.length === 0 ? (
          <EmptyState
            kind="admin"
            title="No transactions match"
            body="No money movement matches these filters in this window. Widen the window or reset the filters."
          />
        ) : (
          <ScrollX label="Transactions" className="-mx-4 px-4">
            {/* Column order is deliberate: the operator-critical signals (amount,
                status, flag) sit left so they are readable at 1280 WITHOUT
                horizontal scrolling. The reconciliation detail (provider, gateway
                ref, phone, fee) scrolls into view inside ScrollX. */}
            <table className="admin-tbl min-w-[1100px]">
              <thead>
                <tr>
                  <th className="text-left">When</th>
                  <th className="text-left">Type</th>
                  <th className="text-right">Amount</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Flag</th>
                  <th className="text-left">Player</th>
                  <th className="text-left">Provider</th>
                  <th className="text-left">Gateway ref</th>
                  <th className="text-left">Phone</th>
                  <th className="text-right">Fee</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const flag = attentionOf(t);
                  const out = t.amount < 0;
                  return (
                    <tr key={t.id}>
                      <td className="whitespace-nowrap text-text-secondary">{formatDateTimeSafe(t.createdAt)}</td>
                      <td className="whitespace-nowrap text-text">{t.type.replace(/_/g, " ")}</td>
                      <td className={["whitespace-nowrap text-right font-mono tabular font-semibold", out ? "text-text-secondary" : "text-text"].join(" ")}>
                        {out ? "−" : "+"}{formatTzs(Math.abs(t.amount))}
                      </td>
                      <td className="whitespace-nowrap"><Chip size="sm" variant={TXN_STATUS_VARIANT[t.status] ?? "neutral"}>{t.status.replace(/_/g, " ")}</Chip></td>
                      <td className="whitespace-nowrap">
                        {flag
                          ? <span title={flag.sw}><Chip variant={flag.level === "warn" ? "warning" : "info"} size="sm">{flag.label}</Chip></span>
                          : <span className="text-text-tertiary">—</span>}
                      </td>
                      <td className="whitespace-nowrap">
                        <Link href={`/admin/players/${t.userId}`} className="admin-focus font-mono text-xs text-royal-300 underline-offset-2 hover:underline">
                          {t.userId.slice(0, 14)}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap text-text-secondary">{t.provider?.replace(/_/g, " ") ?? "—"}</td>
                      {/* Only a GATEWAY movement can be "missing" a reference. An
                          internal transfer (stake, payout, bonus) never touched a
                          gateway, so it shows a plain dash — flagging it would be a
                          false alarm, and rose is reserved for YES/NO money meaning. */}
                      <td className="whitespace-nowrap font-mono text-xs">
                        {t.providerRef
                          ? <span className="text-text-secondary">{t.providerRef}</span>
                          : GATEWAY_TYPES.includes(t.type)
                            ? <span className="text-[var(--gold-300)]" title="No gateway reference — this movement cannot be reconciled">missing</span>
                            : <span className="text-text-tertiary">—</span>}
                      </td>
                      <td className="whitespace-nowrap font-mono text-xs text-text-tertiary">{t.msisdn ?? "—"}</td>
                      <td className="whitespace-nowrap text-right font-mono tabular text-text-tertiary">{t.fee ? formatTzs(t.fee) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollX>
        )}
        <AdminPagination page={page} total={total} baseHref={baseHref} />
      </AdminCard>
    </>
  );
}

function FilterSelect({ name, label, value, options }: { name: string; label: string; value: string; options: [string, string][] }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-tertiary">{label}</span>
      <select
        name={name} defaultValue={value}
        className="admin-focus min-h-[40px] rounded-lg border border-border bg-bg-overlay px-3 text-sm text-text"
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
