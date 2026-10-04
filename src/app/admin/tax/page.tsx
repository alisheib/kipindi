import { Fragment } from "react";
import Link from "next/link";
import type { Route } from "next";
import { AdminPageHead, AdminKpi, AdminCard, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminBody, KpiGrid } from "@/components/admin/admin-body";
import { AdminRestricted } from "@/components/admin/admin-restricted";
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { FilterPill } from "@/components/ui/filter-pill";
import { LinkPending } from "@/components/ui/link-pending";
import { ScrollX } from "@/components/ui/scroll-x";
import { Callout } from "@/components/ui/callout";
import { I } from "@/components/ui/glyphs";
import { currentSession } from "@/lib/server/auth-service";
import { canView } from "@/lib/server/rbac";
import { db } from "@/lib/server/store";
import { loadTaxReportView } from "@/lib/server/tax-report-view";
import { recentLocks, seenFingerprint, type TaxLock } from "@/lib/server/tax-locks";
import { readTaxRates } from "@/lib/server/tax-config";
import { report1Rows, report2Rows, windowStatement } from "@/lib/server/tax-report-doc";
import type { ProductFigures } from "@/lib/server/tax-report-data";
import { adminCount, formatTzsCompact } from "@/lib/utils";
import { eatDayKey } from "@/lib/eat-day";
import {
  EXCEPTION_LABEL,
  GENESIS_DAY,
  LOCK_GRACE_MS,
  PRODUCT_LABEL,
  REFUND_REASONS,
  cutoffOf,
  eatDateTimeLabel,
  formatCents,
  formatWhole,
  isLockable,
  monthKeyOf,
  parseProduct,
  percentLabel,
  periodFromParams,
  periodOfKind,
  periodQuery,
  shiftPeriod,
  taxPageHref,
  taxQueryString,
  versionAt,
  type PeriodKind,
  type ProductFilter,
} from "@/lib/tax-report";
import { TaxExportButtons } from "./export-buttons";
import { PeriodJump } from "./period-jump";
import { TaxLockPanel } from "./lock-panel";
import { TaxRatesForm } from "./rates-form";

/**
 * /admin/tax — the GOVERNMENT TAX REPORT (`docs/TAX-REPORT.md`): the owner's plan "Government Tax
 * Reporting System" v1.0, built. Report 1 (Sales · Payout · On hold · Refunds and the check) and
 * Report 2 (Commission · TRA · GBT · Total tax) for any day, week, month or custom window, for all
 * products or one; exported as PDF, Excel and CSV; locked when Finance files it.
 *
 * ⛔ EVERY FIGURE ON THIS PAGE COMES FROM `loadTaxReportView`, and so does every export — the page
 * computes nothing. A locked period shows its locked snapshot, and says when the live books moved.
 * ⛔ A FAILED READ RENDERS A LOAD ERROR, NEVER A ZERO: a fabricated zero on a tax page is a false
 * all-clear (A-5). There is no `?? 0` on a figure anywhere below.
 * ⭐ MONEY COMES SECOND IN EVERY TABLE, PROSE LAST, AND NO TABLE CARRIES A MIN-WIDTH it does not
 * need: at 360 a card's inner width is 318px, and the figure must be what stays on screen.
 */
export const metadata = { title: "Admin · Tax report" };
export const dynamic = "force-dynamic";

type TaxSearch = { period?: string; month?: string; week?: string; day?: string; from?: string; to?: string; product?: string; xpage?: string };

const KINDS: readonly PeriodKind[] = ["month", "week", "day", "custom"];
const KIND_LABEL: Record<PeriodKind, string> = { month: "Month", week: "Week", day: "Day", custom: "Custom" };
const PRODUCTS: readonly ProductFilter[] = ["ALL", "MARKET", "UPDOWN"];

/** E-381 §6 item 10 — belt 2: the stored-row gate, re-read per page render. */
export default async function AdminTaxPage(props: { searchParams: Promise<TaxSearch> }) {
  return <AdminPageGate title="Tax report"><AdminTaxContent {...props} /></AdminPageGate>;
}

function Amt({ cents, className }: { cents: number; className?: string }) {
  return <span className={["amount", className].filter(Boolean).join(" ")}>{formatCents(cents)}</span>;
}

async function AdminTaxContent({ searchParams }: { searchParams: Promise<TaxSearch> }) {
  // Money data is accounting VIEW or the Owner — decided on the STORED role, before any read.
  const session = await currentSession();
  const viewer = session ? await db.user.findById(session.userId) : null;
  if (!session || !viewer || !(viewer.role === "ADMIN" || (await canView(viewer.role, "accounting")))) {
    return <AdminRestricted title="Tax report" sw="Kodi za kisheria" need="Admin, Finance, Compliance or Auditor" />;
  }
  const isOwner = viewer.role === "ADMIN";

  const sp = await searchParams;
  const nowMs = Date.now();
  const { period, fellBack } = periodFromParams(sp, nowMs);
  const product = parseProduct(sp.product);
  // The cut-off the reader will use (a running period stops a minute before now) — the window line prints THIS.
  const cut = cutoffOf(period, nowMs);
  const qs = taxQueryString(period, product);
  const todayKey = eatDayKey(nowMs);
  const monthKeys: string[] = [];
  for (let k = monthKeyOf(nowMs); k >= GENESIS_DAY.slice(0, 7);) {
    monthKeys.push(k);
    const [y, m] = k.split("-").map(Number);
    k = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  }
  // A month opened by its link that the list does not offer (one not started yet) is still the month on screen:
  // without it the month list read "Select…" beside "November 2026" (measured 2026-10-04).
  if (period.kind === "month" && !monthKeys.includes(period.key)) monthKeys.unshift(period.key);
  const prev = shiftPeriod(period, -1);
  const next = shiftPeriod(period, 1);
  const nextAllowed = next !== null && next.startMs < nowMs;

  const loaded = await loadTaxReportView({ period, product, nowMs }).catch((err: unknown) => ({ ok: false as const, error: String((err as Error)?.message ?? err) }));
  const rates = await readTaxRates().catch(() => null);
  const recent = await recentLocks(8).catch(() => null);

  // Display names for every officer a lock or a rate version names — read once, never per row.
  const officerIds = new Set<string>();
  if (loaded.ok) for (const l of loaded.view.history) { officerIds.add(l.lockedBy); if (l.unlockedBy) officerIds.add(l.unlockedBy); }
  for (const l of recent ?? []) officerIds.add(l.lockedBy);
  if (rates && rates.ok) for (const v of rates.versions) if (v.recordedBy) officerIds.add(v.recordedBy);
  const names = new Map<string, string>();
  for (const id of officerIds) {
    // ⛔ try/await, never `.catch` on the call: the in-memory store answers synchronously, and `.catch` of a plain
    // object is undefined — the page would crash for the first officer it named (measured 2026-10-03).
    let u: { displayName?: string | null } | null = null;
    try { u = await db.user.findById(id); } catch { u = null; }
    names.set(id, u?.displayName?.trim() || id);
  }
  const who = (id: string | null) => (id ? names.get(id) ?? id : "—");

  const head = (
    <AdminPageHead
      title="Tax report"
      sw="Kodi za kisheria"
      actions={
        <TaxExportButtons
          query={qs}
          title={`Government Tax Report — ${period.label} · ${PRODUCT_LABEL[product]}`}
          disabledReason={period.startMs >= nowMs ? "This period has not started yet." : undefined}
        />
      }
    />
  );

  const filters = (
    <AdminCard>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div data-filter-rail className="flex flex-wrap items-center gap-2" role="group" aria-label="Reporting period">
            {KINDS.map((k) => (
              <FilterPill key={k} href={taxPageHref(periodOfKind(period, k), product)} label={KIND_LABEL[k]} on={period.kind === k} rank="dense" semantics="tab" testId={`tax-kind:${k}`} />
            ))}
          </div>
          <div data-filter-rail className="flex flex-wrap items-center gap-2" role="group" aria-label="Product">
            {PRODUCTS.map((p) => (
              <FilterPill key={p} href={taxPageHref(period, p)} label={p === "ALL" ? "All" : PRODUCT_LABEL[p]} on={product === p} rank="dense" semantics="tab" testId={`tax-product:${p}`} />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {period.kind !== "custom" && (
            <div className="flex items-center gap-2">
              {prev ? (
                <Link href={taxPageHref(prev, product) as Route} aria-label={`Previous — ${prev.label}`} title={prev.label} className="btn btn-ghost btn-xs rounded-pill" data-testid="tax-prev">
                  <I.chevronLeft s={14} aria-hidden /><LinkPending />
                </Link>
              ) : null}
              <span className="min-w-0 font-display text-title-sm font-semibold text-text" data-testid="tax-period-label">{period.label}</span>
              {next && nextAllowed ? (
                <Link href={taxPageHref(next, product) as Route} aria-label={`Next — ${next.label}`} title={next.label} className="btn btn-ghost btn-xs rounded-pill" data-testid="tax-next">
                  <I.chevronRight s={14} aria-hidden /><LinkPending />
                </Link>
              ) : (
                <span className="btn btn-ghost btn-xs rounded-pill opacity-40" aria-disabled="true" title="The next period has not started"><I.chevronRight s={14} aria-hidden /></span>
              )}
            </div>
          )}
          {/* Keyed by the period, so the picker's own state (a custom window's From/To) is rebuilt from the
              period on screen after Back/Forward, never left on the previous one. */}
          <PeriodJump
            key={`${period.kind}:${period.key}:${product}`}
            kind={period.kind}
            periodKey={period.key}
            startMs={period.startMs}
            endMs={period.endMs}
            product={product}
            todayKey={todayKey}
            monthKeys={monthKeys}
          />
        </div>
        <p className="text-body-sm text-text-tertiary" data-testid="tax-window">
          {eatDateTimeLabel(period.startMs)} → {eatDateTimeLabel(cut.notStarted || !cut.inProgress ? period.endMs : cut.cutoffMs)} EAT
          {cut.notStarted ? " · not started yet" : cut.inProgress ? " (period in progress)" : ""} · <span className="whitespace-nowrap">{PRODUCT_LABEL[product]}</span>
        </p>
      </div>
    </AdminCard>
  );

  if (!loaded.ok) {
    return (
      <>
        {head}
        <AdminBody>
          {filters}
          <AdminCard title="Government tax report"><AdminLoadError what="the tax report" /><p className="mt-2 text-body-sm text-text-subtle">{loaded.error}</p></AdminCard>
        </AdminBody>
      </>
    );
  }

  const { data, lock, history, drift } = loaded.view;
  const f = data.main;
  const rec = f.reconciliation;
  const lockable = isLockable(period, nowMs);
  // A single-product view balances on its own while the whole book behind it may not — sign-off reads both.
  const wholeOut = data.wholeBook !== null && !data.wholeBook.balanced;
  const lockState: "ready" | "out-of-balance" | "locked" = lock ? "locked" : rec.balanced && !wholeOut ? "ready" : "out-of-balance";
  // The difference that blocks sign-off: this view's own, else the whole book's (never a zero made up for the gap).
  const blockingCents = !rec.balanced || data.wholeBook === null ? rec.differenceCents : data.wholeBook.differenceCents;
  const lockFields: Record<string, string> = { ...periodQuery(period), product };
  const seen = seenFingerprint(data);
  const xPage = parsePage(sp.xpage, data.exceptions.length);
  const xRows = data.exceptions.slice((xPage - 1) * PER_PAGE, xPage * PER_PAGE);
  const xBase = buildBaseHref("/admin/tax", { ...periodQuery(period), product: product === "ALL" ? undefined : product }, "xpage");
  const segments = f.tax.segments;
  const commissionCaption = segments.length === 0 ? "nothing yet" : segments.length === 1 ? `${percentLabel(segments[0].rates.commissionBp)} × Payout` : `${segments.length} rates`;
  const nowVersion = rates && rates.ok ? versionAt(nowMs, rates.versions) : null;

  // ── The status line: what this page is, before any figure. ──────────────────────────────────
  let status: React.ReactNode;
  if (data.notStarted) {
    status = <Callout tone="neutral" size="md" title="This period has not started yet.">There is nothing to report until it does.</Callout>;
  } else if (lock) {
    status = drift.length > 0 ? (
      <Callout tone="warning" size="md" title={`Locked ${eatDateTimeLabel(lock.lockedAtMs)} EAT by ${who(lock.lockedBy)} — and the live books have moved since.`}>
        The figures below are the locked snapshot, exactly as filed. {adminCount(drift.length, "line")} now read differently from the live books: {drift.map((d) => d.line).join(", ")}. See the Lock card for both figures.
      </Callout>
    ) : (
      <Callout tone="success" size="md" title={`Locked ${eatDateTimeLabel(lock.lockedAtMs)} EAT by ${who(lock.lockedBy)}.`}>
        The figures below are frozen exactly as filed{lock.exceptionsAcknowledged ? `, out of balance with the exceptions acknowledged: “${lock.exceptionsAcknowledged}”` : ""}. The live books still agree with them.
      </Callout>
    );
  } else if (data.inProgress) {
    status = (
      <Callout tone="warning" size="md" title="Period in progress — not for filing.">
        Figures run to {eatDateTimeLabel(data.cutoffMs)} EAT and will change before {period.label} closes. {rec.balanced ? "The check closes so far." : <>The check is out by <span className="amount">TZS {formatCents(rec.differenceCents)}</span> so far.</>}
      </Callout>
    );
  } else if (!rec.balanced) {
    status = (
      <Callout tone="danger" size="md" title={<>Out of balance by <span className="amount">TZS {formatCents(rec.differenceCents)}</span> — sign-off is blocked.</>}>
        {adminCount(data.exceptionCount, "exception")} below {data.exceptionCount === 1 ? "names" : "name"} every shilling of the difference (<span className="amount">{formatCents(data.explainedCents)}</span> explained).
      </Callout>
    );
  } else if (wholeOut) {
    status = (
      <Callout tone="danger" size="md" title={<>{PRODUCT_LABEL[product]} balances — but the whole book is out by <span className="amount">TZS {formatCents(data.wholeBook!.differenceCents)}</span>, so sign-off is blocked.</>}>
        {data.unattributedRecords > 0 ? `${adminCount(data.unattributedRecords, "money record")} in this period ${data.unattributedRecords === 1 ? "names no bet or round, so it belongs" : "name no bet or round, so they belong"} to no product. ` : ""}Open All products to see every exception, and resolve it there.
      </Callout>
    );
  } else if (period.kind === "custom") {
    status = <Callout tone="success" size="md" title="Balanced — the check closes to the shilling.">A custom window can be viewed and exported; only a day, a week or a month can be locked for filing.</Callout>;
  } else if (!lockable) {
    status = <Callout tone="success" title="Balanced — the check closes to the shilling.">This period closed moments ago; it can be locked from {eatDateTimeLabel(period.endMs + LOCK_GRACE_MS)} EAT.</Callout>;
  } else {
    status = <Callout tone="success" size="md" title="Balanced — the check closes to the shilling. Ready to lock and file.">Sales equals Payout + On hold + Refunds once the platform fee kept and the stakes brought forward are counted.</Callout>;
  }

  const r1 = report1Rows(f);
  const r2 = report2Rows(f);

  return (
    <>
      {head}
      <AdminBody>
        {fellBack && (
          <Callout tone="warning" title="The period in this link could not be read.">
            The page shows <strong className="text-text">{period.label}</strong> instead. Use the controls below to choose a period.
          </Callout>
        )}
        {filters}
        <div data-testid="tax-status">{status}</div>

        <KpiGrid cols="lg3-xl6">
          <AdminKpi label="Sales" value={formatTzsCompact(f.report1.salesCents / 100)} delta={adminCount(f.counts.betsPlaced, "bet")} spark={false} />
          <AdminKpi label="Payout" value={formatTzsCompact(f.report1.payoutCents / 100)} delta={adminCount(f.counts.payoutRecords, "payment")} spark={false} />
          <AdminKpi label="On hold" value={formatTzsCompact(f.report1.onHoldCents / 100)} delta="at cut-off" spark={false} />
          <AdminKpi label="Refunds" value={formatTzsCompact(f.report1.refundsCents / 100)} delta={adminCount(f.counts.refundRecords, "refund")} spark={false} />
          <AdminKpi label="Commission" value={formatTzsCompact(f.tax.commission)} delta={commissionCaption} spark={false} />
          <AdminKpi label="Total tax payable" value={formatTzsCompact(f.tax.total)} delta="TRA + GBT" spark={false} />
        </KpiGrid>

        {/* `lg:items-start`: a card keeps its own height — stretched to its tall neighbour it was a mostly empty panel. */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          <AdminCard title="Report 1 — Total Reporting System">
            <p className="mb-3 text-body-sm text-text-subtle">Every stake placed in the period, and where it stood at the cut-off. The first four lines are the plan&apos;s; the two reconciling items make its rule hold on live books.</p>
            <ScrollX label="Report 1" className="-mx-4 px-4">
              <table className="admin-tbl" data-testid="tax-report-1">
                <thead><tr><th className="text-left">Line</th><th className="text-right">Amount<br />(TZS)</th></tr></thead>
                <tbody>
                  {r1.map((r, i) => (
                    <Fragment key={r.line}>
                    {r.kind === "item" && r1[i - 1]?.kind === "line" && (
                      <tr aria-hidden="true" data-divider="">
                        <td colSpan={2} className="pt-3 text-left font-mono text-micro uppercase eyebrow text-text-tertiary">Reconciling items</td>
                      </tr>
                    )}
                    <tr className={r.kind === "check" || r.kind === "difference" ? "font-semibold" : undefined} data-line={r.kind}>
                      <td className="text-left align-top">
                        <span className="block text-text">{r.line}</span>
                        <span className="block text-body-sm font-normal text-text-tertiary">{r.basis}</span>
                      </td>
                      <td className={["tabular text-right align-top", r.kind === "difference" ? (rec.balanced ? "text-success" : "text-danger") : ""].join(" ")}>
                        {r.kind === "difference" && <span className="mr-1.5" aria-label={rec.balanced ? "balanced" : "out of balance"}>{rec.balanced ? "✓" : "✗"}</span>}
                        <Amt cents={r.cents} />
                      </td>
                    </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </ScrollX>
          </AdminCard>

          <AdminCard title="Report 2 — Taxation">
            <p className="mb-3 text-body-sm text-text-subtle">The approved model: each line rounded to the nearest shilling at each step — Commission on Payout, then TRA and GBT on the rounded Commission.</p>
            <ScrollX label="Report 2" className="-mx-4 px-4">
              <table className="admin-tbl" data-testid="tax-report-2">
                <thead><tr><th className="text-left">Line</th><th className="text-right">Amount<br />(TZS)</th></tr></thead>
                <tbody>
                  {r2.map((r) => (
                    <tr key={r.line} className={r.kind === "total" ? "font-semibold" : undefined}>
                      <td className="text-left align-top">
                        <span className="block text-text">{r.label}</span>
                        {r.segment && (
                          <span className="block text-body-sm font-normal text-text-subtle">
                            <span className="whitespace-nowrap">{eatDateTimeLabel(r.segment.startMs)}</span> → <span className="whitespace-nowrap">{eatDateTimeLabel(r.segment.endMs)}</span>
                          </span>
                        )}
                        <span className="block text-body-sm font-normal text-text-tertiary">{r.basis}</span>
                      </td>
                      <td className="tabular text-right align-top">{r.cents ? <Amt cents={r.amount} /> : <span className="amount">{formatWhole(r.amount)}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
            <p className="mt-3 text-body-sm text-text-tertiary">Tax owed is the state&apos;s money, not ours. Rates are admin settings with effective dates — see Rates below.</p>
          </AdminCard>
        </div>

        {/* Side by side only from 1536px: By product's four figure columns did not fit half of a 1024px console and cut
            "Up & Down" at the card edge (measured 2026-10-03). Below that the two cards stack, each full width. */}
        <div className={["grid grid-cols-1 gap-4", data.byProduct ? "2xl:grid-cols-2" : ""].join(" ")}>
          <AdminCard title="Refunds by reason" sw="Marejesho">
            <p className="mb-3 text-body-sm text-text-subtle">Every refund carries the reason its round records and the authority that produced it.</p>
            <ScrollX label="Refunds by reason" className="-mx-4 px-4">
              {/* ⭐ TWO COLUMNS, MONEY SECOND: the count rides the reason's caption. A third column was clipped
                  at the card edge on a 360px phone (measured 2026-10-03), and what scrolls away must be prose. */}
              <table className="admin-tbl" data-testid="tax-refunds">
                <thead><tr><th className="text-left">Reason</th><th className="text-right">Amount<br />(TZS)</th></tr></thead>
                <tbody>
                  {f.refundsByReason.map((r) => (
                    <tr key={r.code}>
                      <td className="text-left align-top">
                        <span className="block text-text">{REFUND_REASONS[r.code].label}</span>
                        <span className="block font-mono text-micro uppercase eyebrow text-text-tertiary">{REFUND_REASONS[r.code].planCode} · <span className="whitespace-nowrap">{adminCount(r.count, "refund")}</span></span>
                        <span className="block text-body-sm text-text-tertiary">{REFUND_REASONS[r.code].approval}</span>
                      </td>
                      <td className="tabular text-right align-top"><Amt cents={r.cents} /></td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="text-left">
                      <span className="block">Total — equals Refunds</span>
                      <span className="block font-mono text-micro font-normal uppercase eyebrow text-text-tertiary">{adminCount(f.refundsByReason.reduce((t, r) => t + r.count, 0), "refund")}</span>
                    </td>
                    <td className="tabular text-right align-top"><Amt cents={f.refundsByReason.reduce((t, r) => t + r.cents, 0)} /></td>
                  </tr>
                </tbody>
              </table>
            </ScrollX>
          </AdminCard>

          {data.byProduct && <ByProductCard all={f} parts={data.byProduct} unattributed={data.unattributedRecords} />}
        </div>

        {data.exceptionCount > 0 && (
          <AdminCard title={`Exceptions — ${adminCount(data.exceptionCount, "item")}`} className="border-danger-border">
            <p className="mb-3 text-body-sm text-text-subtle">
              Together they explain <span className="amount text-text">TZS {formatCents(data.explainedCents)}</span> of the <span className="amount text-text">TZS {formatCents(rec.differenceCents)}</span> difference — the list adds up to the check by construction.
              {data.exceptions.length < data.exceptionCount ? ` The ${data.exceptions.length} largest are listed; the exports carry the same list.` : ""}
            </p>
            <ScrollX label="Exceptions" className="-mx-4 px-4">
              <table className="admin-tbl" data-testid="tax-exceptions">
                {/* ⭐ TWO COLUMNS, as the refunds: a third (Reference) was cut at the card edge on a 360px phone, the record id
                    with it (measured 2026-10-03). The id rides the exception's own cell, on a line of its own. */}
                <thead><tr><th className="text-left">Exception</th><th className="text-right">Difference<br />(TZS)</th></tr></thead>
                <tbody>
                  {xRows.map((e) => (
                    <tr key={`${e.kind}:${e.ref}`}>
                      <td className="text-left align-top">
                        <span className="block text-text">{EXCEPTION_LABEL[e.kind]}</span>
                        <span className="block break-all font-mono text-body-sm text-text-secondary">{e.ref}{e.product ? <span className="font-sans text-body-sm text-text-tertiary"> · {PRODUCT_LABEL[e.product]}</span> : null}</span>
                        <span className="block text-body-sm text-text-tertiary">{e.note}</span>
                      </td>
                      <td className="tabular text-right align-top text-danger"><Amt cents={e.contributionCents} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
            <AdminPagination total={data.exceptions.length} page={xPage} perPage={PER_PAGE} baseHref={xBase} param="xpage" />
          </AdminCard>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          <AdminCard title="Lock & filing">
            <LockSummary lock={lock} history={history} drift={drift} who={who} />
            <div className="mt-4">
              {period.kind === "custom" ? (
                <p className="text-body-sm text-text-subtle">A custom window can be viewed and exported. Only a day, a week or a month can be locked for filing.</p>
              ) : !lock && (data.inProgress || data.notStarted) ? (
                <p className="text-body-sm text-text-subtle">{period.label} {data.notStarted ? "has not started yet" : "is still running"}. It can be locked once it has closed.</p>
              ) : !lock && !lockable ? (
                <p className="text-body-sm text-text-subtle">It can be locked from {eatDateTimeLabel(period.endMs + LOCK_GRACE_MS)} EAT, so every bet stamped inside the period has settled into the books.</p>
              ) : (
                <TaxLockPanel
                  key={`${period.kind}:${period.key}:${product}`}
                  fields={lockFields}
                  seen={seen}
                  periodLabel={`${period.label} · ${PRODUCT_LABEL[product]}`}
                  state={lockState}
                  isOwner={isOwner}
                  lockId={lock?.id ?? null}
                  differenceCents={blockingCents}
                  differenceIsWholeBook={rec.balanced}
                />
              )}
            </div>
            <RecentLocks recent={recent} who={who} />
          </AdminCard>

          <AdminCard title="Rates">
            {!rates || !rates.ok ? <AdminLoadError what="the tax rates" /> : (
              <>
                <p className="mb-3 text-body-sm text-text-subtle">
                  In force today: Commission <strong className="text-text">{percentLabel(nowVersion!.rates.commissionBp)}</strong> of Payout · TRA <strong className="text-text">{percentLabel(nowVersion!.rates.traBp)}</strong> and GBT <strong className="text-text">{percentLabel(nowVersion!.rates.gbtBp)}</strong> of Commission — since <span className="whitespace-nowrap">{nowVersion!.effectiveFrom}</span>.
                </p>
                {/* ⭐ A LIST, not a five-column table: the table was cut at a 360px card edge ("AUTHO") and squeezed its
                    authority to one word a line in a half-width card (measured 2026-10-03). One line of figures, its
                    authority beneath, each figure-pair unbreakable. */}
                <ul className="divide-y divide-border-subtle rounded-md border border-border-subtle" data-testid="tax-rates">
                  {[...rates.versions].reverse().map((v) => (
                    <li key={v.id} className="px-3 py-2">
                      <p className="flex flex-wrap gap-x-4 gap-y-0.5 text-body-sm text-text">
                        <span className="whitespace-nowrap"><span className="text-text-tertiary">From</span> <span className="font-mono">{v.effectiveFrom}</span></span>
                        <span className="whitespace-nowrap"><span className="text-text-tertiary">Commission</span> <span className="tabular">{percentLabel(v.rates.commissionBp)}</span></span>
                        <span className="whitespace-nowrap"><span className="text-text-tertiary">TRA</span> <span className="tabular">{percentLabel(v.rates.traBp)}</span></span>
                        <span className="whitespace-nowrap"><span className="text-text-tertiary">GBT</span> <span className="tabular">{percentLabel(v.rates.gbtBp)}</span></span>
                      </p>
                      <p className="mt-0.5 text-body-sm text-text-tertiary">{v.note}{v.recordedBy ? ` — ${who(v.recordedBy)}` : ""}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  {isOwner ? <TaxRatesForm current={nowVersion!.rates} todayKey={todayKey} /> : <p className="text-body-sm text-text-subtle">Only the Owner can record new rates.</p>}
                </div>
              </>
            )}
          </AdminCard>
        </div>

        <AdminCard title="How these figures are made">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-body-sm md:grid-cols-2">
            <div><dt className="font-semibold text-text">Sales</dt><dd className="text-text-subtle">Every stake placed in the period — the confirmed stake records, plus any bonus-funded part of a stake.</dd></div>
            <div><dt className="font-semibold text-text">Payout</dt><dd className="text-text-subtle">Winnings paid on rounds resulted in the period. Withdrawals are wallet movements and are never part of Payout or of any tax line.</dd></div>
            <div><dt className="font-semibold text-text">On hold</dt><dd className="text-text-subtle">Stakes still waiting for a result at the cut-off. A round resulted after the cut-off stays on hold for this period and is reclassified in the period it results in.</dd></div>
            <div><dt className="font-semibold text-text">Refunds</dt><dd className="text-text-subtle">Stakes returned: one-sided bets, cancelled or voided rounds, and players&apos; early exits — each with the reason its round records.</dd></div>
            <div><dt className="font-semibold text-text">Platform fee kept</dt><dd className="text-text-subtle">Our fee on each resulted round (a share of the losing side, at the round&apos;s own frozen rate; an older round keeps the fee model it froze), recomputed from the round&apos;s own frozen rates exactly as settlement took it, with the shilling of rounding a fractional fee leaves in the pool.</dd></div>
            <div><dt className="font-semibold text-text">On hold brought forward</dt><dd className="text-text-subtle">Stakes placed before the period that were still waiting for a result when it opened. Their results land in this period&apos;s Payout and Refunds.</dd></div>
            <div><dt className="font-semibold text-text">The check</dt><dd className="text-text-subtle">Sales + brought forward = Payout + Refunds + Platform fee kept + On hold, to the shilling. With nothing brought forward and no fee it is exactly the plan&apos;s rule, Sales = Payout + On hold + Refunds.</dd></div>
            <div><dt className="font-semibold text-text">Tax</dt><dd className="text-text-subtle">Commission = rate × Payout; TRA and GBT = their rates × the rounded Commission; Total = TRA + GBT. Every line rounded to the nearest shilling at each step. All times East Africa Time.</dd></div>
          </dl>
          <p className="mt-3 text-body-sm text-text-tertiary">Generated {eatDateTimeLabel(data.generatedAtMs)} EAT · {windowStatement(data)}</p>
        </AdminCard>
      </AdminBody>
    </>
  );
}

function ByProductCard({ all, parts, unattributed }: { all: ProductFigures; parts: ProductFigures[]; unattributed: number }) {
  // ⭐ ALL FIRST — it is the answer; the products are its parts. With All last, a 360px phone showed the two
  // parts and scrolled the total out of view (measured 2026-10-03).
  const cols = [all, ...parts];
  const colLabel = (x: ProductFigures) => (x.product === "ALL" ? "All" : PRODUCT_LABEL[x.product]);
  const lines: Array<{ label: string; get: (x: ProductFigures) => number; cents: boolean; strong: boolean }> = [
    { label: "Sales", get: (x) => x.report1.salesCents, cents: true, strong: false },
    { label: "Payout", get: (x) => x.report1.payoutCents, cents: true, strong: false },
    { label: "On hold", get: (x) => x.report1.onHoldCents, cents: true, strong: false },
    { label: "Refunds", get: (x) => x.report1.refundsCents, cents: true, strong: false },
    { label: "Fee kept", get: (x) => x.report1.feeKeptCents, cents: true, strong: false },
    // Subtracted, as Report 1 prints it: one screen showed −100,000 there and 100,000 here (2026-10-03). `|| 0`: never "−0".
    { label: "Less: brought fwd", get: (x) => -x.report1.broughtForwardCents || 0, cents: true, strong: false },
    { label: "Difference", get: (x) => x.reconciliation.differenceCents, cents: true, strong: true },
    { label: "Total tax", get: (x) => x.tax.total, cents: false, strong: true },
  ];
  const figure = (ln: (typeof lines)[number], x: ProductFigures) =>
    ln.cents ? <Amt cents={ln.get(x)} /> : <span className="amount">{formatWhole(ln.get(x))}</span>;
  return (
    <AdminCard title="By product" sw="Kwa bidhaa">
      <p className="mb-3 text-body-sm text-text-subtle">
        Polls and Up &amp; Down side by side. Every money line adds up to All. Each product&apos;s tax is computed on its own
        Payout and rounded at each step, so the products&apos; tax can differ from the All column by a shilling — file the
        column that matches how you file.
        {unattributed > 0 ? ` ${adminCount(unattributed, "money record")} ${unattributed === 1 ? "names no bet or round, so it appears" : "name no bet or round, so they appear"} only under All.` : ""}
      </p>
      {/* ⭐ A PHONE READS EACH LINE AS ITS THREE LABELLED FIGURES: four columns do not fit 360px, and an "Up & Down"
          scrolled out of the card read as a product that was missing (measured 2026-10-03). */}
      <dl className="space-y-2 sm:hidden" data-testid="tax-by-product-stacked">
        {lines.map((ln) => (
          <div key={ln.label} className="rounded-md border border-border-subtle px-3 py-2">
            <dt className={ln.strong ? "text-body-sm font-semibold text-text" : "text-body-sm text-text"}>{ln.label}</dt>
            <dd className="mt-1 grid grid-cols-3 gap-2">
              {cols.map((x) => (
                <span key={x.product} className="min-w-0">
                  <span className="block font-mono text-micro uppercase eyebrow text-text-tertiary">{colLabel(x)}</span>
                  <span className="block tabular text-body-sm text-text">{figure(ln, x)}</span>
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <ScrollX label="By product" className="-mx-4 hidden px-4 sm:block">
        <table className="admin-tbl" data-testid="tax-by-product">
          <thead><tr><th className="text-left">Line</th>{cols.map((x) => <th key={x.product} className="text-right">{colLabel(x)}</th>)}</tr></thead>
          <tbody>
            {lines.map((ln) => (
              <tr key={ln.label} className={ln.strong ? "font-semibold" : undefined}>
                <td className="text-left">{ln.label}</td>
                {cols.map((x) => <td key={x.product} className="tabular text-right">{figure(ln, x)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollX>
    </AdminCard>
  );
}

function LockSummary({ lock, history, drift, who }: {
  lock: TaxLock | null;
  history: TaxLock[];
  drift: Array<{ line: string; locked: number; live: number; unit: "cents" | "tzs" }>;
  who: (id: string | null) => string;
}) {
  const fmt = (v: number, unit: "cents" | "tzs") => (unit === "cents" ? formatCents(v) : formatWhole(v));
  return (
    <div className="space-y-3">
      {lock ? (
        <div className="space-y-1">
          <p className="text-body-sm text-text">
            <I.lock s={13} aria-hidden className="mr-1.5 inline align-[-2px]" />
            Locked {eatDateTimeLabel(lock.lockedAtMs)} EAT by <strong>{who(lock.lockedBy)}</strong>
          </p>
          <p className="font-mono text-body-sm text-text-tertiary">
            <span className="block break-all">{lock.id}</span>
            <span className="block">sha256 {lock.sha256.slice(0, 16)}…</span>
          </p>
          {lock.note && <p className="text-body-sm text-text-subtle">Note: {lock.note}</p>}
          {lock.exceptionsAcknowledged && <p className="text-body-sm text-danger-fg">Locked out of balance — {lock.exceptionsAcknowledged}</p>}
        </div>
      ) : (
        <p className="text-body-sm text-text-subtle">Not locked. The figures follow the live books.</p>
      )}
      {/* ⭐ A LIST OF MOVED LINES, not a three-column table: the table ran 23px past a 360px card, and its live figures
          were painted gold, which this console keeps for earned money (measured 2026-10-03). */}
      {drift.length > 0 && (
        <ul className="space-y-1.5" data-testid="tax-drift" aria-label="Changed since the lock">
          {drift.map((d) => (
            <li key={d.line} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-md border border-border-subtle px-3 py-2 text-body-sm">
              <span className="text-text">{d.line}</span>
              <span className="flex flex-wrap justify-end gap-x-2 text-text-subtle">
                <span className="whitespace-nowrap">locked <span className="amount text-text">{fmt(d.locked, d.unit)}</span></span>
                <span className="whitespace-nowrap">→ live <span className="amount font-semibold text-text">{fmt(d.live, d.unit)}</span></span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {history.filter((l) => l.unlockedAtMs !== null).length > 0 && (
        <div>
          <p className="mb-1 font-mono text-micro uppercase eyebrow text-text-tertiary">Earlier locks of this period</p>
          <ul className="space-y-1 text-body-sm text-text-subtle">
            {history.filter((l) => l.unlockedAtMs !== null).map((l) => (
              <li key={l.id}>Locked {eatDateTimeLabel(l.lockedAtMs)} by {who(l.lockedBy)} · reopened {eatDateTimeLabel(l.unlockedAtMs!)} by {who(l.unlockedBy)} — {l.unlockReason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RecentLocks({ recent, who }: { recent: TaxLock[] | null; who: (id: string | null) => string }) {
  if (recent === null) return <div className="mt-4"><AdminLoadError what="the filing history" /></div>;
  if (recent.length === 0) return <p className="mt-4 text-body-sm text-text-tertiary">No period has been locked yet.</p>;
  return (
    <div className="mt-4">
      <p className="mb-1 font-mono text-micro uppercase eyebrow text-text-tertiary">Recent locks</p>
      <ScrollX label="Recent locks" className="-mx-4 px-4">
        <table className="admin-tbl" data-testid="tax-recent-locks">
          <thead><tr><th className="text-left">Period</th><th className="text-right">Total tax</th></tr></thead>
          <tbody>
            {recent.map((l) => (
              <tr key={l.id}>
                <td className="text-left align-top">
                  <Link href={taxPageHref(l.snapshot.period, l.product) as Route} className="inline-flex min-h-[var(--tap-min)] items-center text-text underline-offset-2 hover:underline">{l.snapshot.period.label}</Link>
                  <span className="block text-body-sm text-text-tertiary">{PRODUCT_LABEL[l.product]}{l.unlockedAtMs !== null ? " · reopened" : ""}</span>
                  <span className="block text-body-sm text-text-tertiary">Locked <span className="whitespace-nowrap">{eatDateTimeLabel(l.lockedAtMs)}</span> · {who(l.lockedBy)}</span>
                </td>
                <td className="tabular text-right align-top"><span className="amount">{formatWhole(l.snapshot.main.tax.total)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollX>
    </div>
  );
}
