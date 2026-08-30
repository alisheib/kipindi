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
import { SearchBox } from "@/components/ui/search-box";
import { fieldNames, TXN_SEARCH } from "@/lib/search";
import Link from "next/link";
import { AdminPageHead, AdminKpi, AdminCard } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { AdminRestricted } from "@/components/admin/admin-restricted";
import { ScrollX } from "@/components/ui/scroll-x";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip } from "@/components/ui/chip";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { currentSession } from "@/lib/server/auth-service";
import { canView } from "@/lib/server/rbac";
import { db } from "@/lib/server/store";
import { attentionOf, GATEWAY_TYPES, type TxnSearchFilters } from "@/lib/server/txn-filters";
import { resolveRange } from "@/lib/server/date-range";
import { DateTimeRangeFilter } from "@/components/ui/datetime-range-filter";
import { formatTzs, formatBalancePill, formatDateTimeSafe } from "@/lib/utils";
import { txnTypeLabel, txnStatusLabel, txnProviderLabel } from "@/components/admin/status-badge";
import type { StoredTxn } from "@/lib/server/store";
import { payoutRailLabel } from "@/lib/server/selcom";
import { AdminBody } from "@/components/admin/admin-body";
import { KpiGrid } from "@/components/admin/admin-body";

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

type SP = Record<string, string | undefined>;

export default async function AdminTransactionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const session = await currentSession();
  if (!session || !(session.role === "ADMIN" || (await canView(session.role, "accounting")))) {
    return <AdminRestricted title="Transactions" sw="Miamala" need="Admin or Compliance" />;
  }

  const sp = await searchParams;
  // ONE platform window resolver (presets + custom date+hour+minute, EAT-safe). Default 28d.
  const range = resolveRange({ range: sp.range, from: sp.from, to: sp.to }, Date.now(), "28d");
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
    // "All time" (start 0) means no lower bound; otherwise the resolved window.
    fromMs: range.start > 0 ? range.start : undefined,
    toMs: range.end,
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
    Object.entries({ range: sp.range, from: sp.from, to: sp.to, type, status, provider, q, attention: attentionOnly ? "1" : undefined })
      .filter(([, v]) => v != null && v !== "") as [string, string][],
  ).toString();

  return (
    <>
      <AdminPageHead
        title="Transactions"
        sw="Miamala"
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

      {/* B7 — this page was the ONE admin route with no body wrapper at all: it
          went straight from AdminPageHead to the KPI grid, so every row sat flush
          against the sidebar with zero left padding while all 42 sibling routes
          had `px-4 lg:px-6 py-5`. */}
      <AdminBody>
      {/* Compliance totals — over the WHOLE filtered set, not this page. */}
      <KpiGrid>
        <AdminKpi label="Deposits in" sw="Amana zilizoingia" value={formatBalancePill(summary.depositsConfirmedTzs)} />
        <AdminKpi label="Withdrawals out" sw="Malipo yaliyotoka" value={formatBalancePill(summary.withdrawalsConfirmedTzs)} />
        <AdminKpi label="Fees & commission" sw="Ada na tume" value={formatBalancePill(summary.feesTzs)} />
        <AdminKpi
          label="Unreconciled"
          sw="Hayajalinganishwa"
          value={summary.unreconciledCount.toLocaleString()}
          pulse={summary.unreconciledCount > 0}
        />
      </KpiGrid>

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
        {/* Window — the platform date+hour+minute filter (presets + custom). It drives
            ?range/?from/?to directly; the form below keeps them via hidden inputs so a
            field change (type/status/…) preserves the window. */}
        <div className="mb-3">
          <span className="mb-1.5 block font-mono text-micro uppercase eyebrow text-text-tertiary">Window · Dirisha</span>
          <DateTimeRangeFilter defaultPreset="28d" presetIds={["today", "yesterday", "24h", "7d", "28d", "30d", "mtd", "all"]} />
        </div>
        {/* Search sits ABOVE the form and drives ?q directly (same pattern as the
            window filter above it), with a hidden mirror INSIDE the form so that
            changing type/status/provider and pressing Apply preserves the query.
            Without the mirror, Apply would submit the form's fields only and
            silently drop ?q — on a compliance browser that reads as "no such
            transaction". */}
        <div className="mb-3">
          <span className="mb-1.5 block font-mono text-micro uppercase eyebrow text-text-tertiary">Search · Tafuta</span>
          <SearchBox
            placeholder="Gateway ref, phone, txn or player id"
            ariaLabel="Search transactions"
            helpFields={fieldNames(TXN_SEARCH)}
          />
        </div>
        <form method="get" action="/admin/transactions" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {sp.range ? <input type="hidden" name="range" value={sp.range} /> : null}
          {sp.from ? <input type="hidden" name="from" value={sp.from} /> : null}
          {sp.to ? <input type="hidden" name="to" value={sp.to} /> : null}
          {q ? <input type="hidden" name="q" value={q} /> : null}
          {/* The three dropdowns offer WORDS and submit the stored token. They used to
              offer `value.replace(/_/g, " ")`, so an officer chose between "ADJUSTMENT
              DEBIT", "AML REVIEW" and "TIGO PESA" — database spelling on the page a
              gateway reconciliation is done from, and a misspelling of two real MNO
              brands besides. One lexicon now answers here and in the rows below. */}
          <FilterSelect name="type" label="Type · Aina" value={type ?? ""} options={[["", "All"], ...TYPES.map((t) => [t, txnTypeLabel(t)] as [string, string])]} />
          <FilterSelect name="status" label="Status · Hali" value={status ?? ""} options={[["", "All"], ...STATUSES.map((s) => [s, txnStatusLabel(s)] as [string, string])]} />
          <FilterSelect name="provider" label="Provider · Mtoa" value={provider ?? ""} options={[["", "All"], ...PROVIDERS.map((p) => [p, txnProviderLabel(p)] as [string, string])]} />
          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between lg:col-span-6">
            <label className="flex min-h-[40px] cursor-pointer items-center gap-2 rounded-lg border border-border bg-bg-overlay px-3 text-sm text-text-secondary">
              <Checkbox name="attention" value="1" defaultChecked={attentionOnly} />
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
        action={<span className="font-mono text-micro uppercase eyebrow text-text-tertiary">{range.label}</span>}
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
                      <td className="whitespace-nowrap text-text">{txnTypeLabel(t.type)}</td>
                      <td className={["whitespace-nowrap text-right font-mono tabular font-semibold", out ? "text-text-secondary" : "text-text"].join(" ")}>
                        {out ? "−" : "+"}{formatTzs(Math.abs(t.amount))}
                      </td>
                      <td className="whitespace-nowrap"><Chip size="sm" variant={TXN_STATUS_VARIANT[t.status] ?? "neutral"}>{txnStatusLabel(t.status)}</Chip></td>
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
                      <td className="whitespace-nowrap text-text-secondary">{t.provider ? txnProviderLabel(t.provider) : "—"}</td>
                      {/* Only a GATEWAY movement can be "missing" a reference. An
                          internal transfer (stake, payout, bonus) never touched a
                          gateway, so it shows a plain dash — flagging it would be a
                          false alarm, and rose is reserved for YES/NO money meaning. */}
                      {/* `providerStatus` is what the gateway said in its own words.
                          It hangs off the reference because that is where an operator
                          already looks when a movement is stuck, and it is a `title`
                          rather than a column because it is a full sentence — the
                          table must not grow a 400px cell for the 1% of rows that
                          are being investigated. Before 2026-07-29 this was never
                          recorded at all, and a stalled payout was unexplainable. */}
                      <td className="whitespace-nowrap font-mono text-xs">
                        {t.providerRef
                          ? <span className="text-text-secondary" title={t.providerStatus ?? undefined}>
                              {t.providerRef}{t.providerStatus ? " ⓘ" : ""}
                              {/* Which rail carried it. Shown only when it is NOT the
                                  default mobile-money rail, so ordinary rows stay quiet
                                  and the exceptions stand out — an officer reconciling a
                                  payout has to know which endpoint actually holds it. */}
                              {payoutRailLabel(t.payoutRail) && (
                                <span className="ml-1.5 text-micro uppercase tracking-[0.1em] text-[var(--gold-300)]">
                                  {t.payoutRail === "SELCOM_PESA" ? "pesa" : "agent"}
                                </span>
                              )}
                            </span>
                          : GATEWAY_TYPES.includes(t.type)
                            ? <span className="text-[var(--gold-300)]" title={t.providerStatus ?? "No gateway reference — this movement cannot be reconciled"}>missing</span>
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
      </AdminBody>
    </>
  );
}

function FilterSelect({ name, label, value, options }: { name: string; label: string; value: string; options: [string, string][] }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-micro uppercase eyebrow text-text-tertiary">{label}</span>
      <Select
        name={name}
        defaultValue={value}
        ariaLabel={label}
        options={options.map(([v, l]) => ({ value: v, label: l }))}
      />
    </label>
  );
}
