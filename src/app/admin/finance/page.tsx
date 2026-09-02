import { AdminPageHead, AdminKpi, AdminCard, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminAreaChart, AdminStackedBars, AdminBarList } from "@/components/admin/admin-charts";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import {
  depositsTotal,
  withdrawalsTotal,
  grossGamingRevenue,
  netGamingRevenue,
  operatorMarginPct,
  walletLiabilityTotal,
  providerSummary,
  topNgrContributors,
  activePlayers,
  moneyFlowSeries,
  marginSeries,
  providerStackedSeries,
  listProvidersInPeriod,
  settlementFeesByPoll,
} from "@/lib/server/analytics";
import { dailyKpiSeries } from "@/lib/server/report-money";
import { resolveRange } from "@/lib/server/date-range";
import { DateTimeRangeFilter } from "@/components/ui/datetime-range-filter";
import { formatTzs, formatTzsCompact, formatNumber, adminCount } from "@/lib/utils";
import { txnProviderLabel } from "@/components/admin/status-badge";
import { eatDayKey } from "@/lib/eat-day";
import { ScrollX } from "@/components/ui/scroll-x";
import { GenerateButton } from "../reports/generate-button";
import { currentSession } from "@/lib/server/auth-service";
import { canView } from "@/lib/server/rbac";
import { getEffectiveConfig } from "@/lib/server/market-config";
import { houseAccountBalances, trialBalance } from "@/lib/server/ledger";
import { Stat } from "@/components/ui/stat";
import { AdminRestricted } from "@/components/admin/admin-restricted";
import { AdminBody } from "@/components/admin/admin-body";
import { KpiGrid } from "@/components/admin/admin-body";
import type { Route } from "next";
import { Tabs } from "@/components/ui/tabs";

/** What each house account actually holds — so the owner doesn't have to guess. */
const HOUSE_ACCOUNT_NOTE: Record<string, string> = {
  "HOUSE:COMMISSION": "our fee: pool + early-exit + withdrawal",
  "HOUSE:AGGREGATOR": "the payment gateway's share",
  "HOUSE:TRA_LEVY": "TRA, levied on our commission",
  "HOUSE:GBT_LEVY": "GBT, levied on our commission",
  "HOUSE:TAX": "RETIRED — historical rows only",
  "HOUSE:RESERVE": "RETIRED — historical rows only",
  "SYSTEM:BONUS": "bonus issuance",
  "SYSTEM:ADJUSTMENT": "admin adjustments",
  "SYSTEM:VOID": "expired bonus sink",
};
export const metadata = { title: "Admin · Finance" };
export const dynamic = "force-dynamic";

export default async function AdminFinancePage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string; feepage?: string; tab?: string }> }) {
  // Money data is MONEY_ROLES only — NEVER MODERATOR (roles.ts). The admin layout
  // only gates ADMIN_CONSOLE_ROLES (which DOES include MODERATOR), so without this
  // a moderator could read owner-grade GGR/NGR and the top-contributor list.
  // Return BEFORE any money aggregate is computed.
  const session = await currentSession();
  if (!session || !(session.role === "ADMIN" || (await canView(session.role, "accounting")))) {
    return <AdminRestricted title="Finance" sw="Fedha" need="Admin or Compliance" />;
  }

  const sp = await searchParams;
  // ONE platform window resolver — presets + custom date+hour+minute, EAT-safe (default 7d).
  const range = resolveRange(sp, Date.now(), "7d");
  const period = { start: range.start, end: range.end };

  // A-5: money figures resolve to null (not 0) on a failed read, so the tile
  // renders an explicit "n/a · couldn't compute" instead of a fabricated "TZS 0".
  const dep = await depositsTotal(period).catch(() => null);
  const wd  = await withdrawalsTotal(period).catch(() => null);
  const ggr = await grossGamingRevenue(period).catch(() => null);
  const ngr = await netGamingRevenue(period).catch(() => null);
  const margin = await operatorMarginPct(period).catch(() => null);
  const liability = await walletLiabilityTotal().catch(() => null);
  // B-1: list/series reads fail to null (rendered as AdminLoadError), never to
  // [] — a failed read shown as "no provider activity" fabricates an all-clear.
  const provs = await providerSummary(period).catch(() => null);
  const top = await topNgrContributors(10).catch(() => null);
  const activePeriod = await activePlayers(period).catch(() => null);
  const flow = await moneyFlowSeries(period, 28).catch(() => null);
  const margins = await marginSeries(period, 28).catch(() => null);
  const provBars = await providerStackedSeries(period, 14).catch(() => null);
  // ⛔ THE LEGEND IS A LABEL (§L1), SO IT IS SPELLED BY THE LEXICON — the chart printed
  // `AIRTEL_MONEY` / `TIGO_PESA` beside its swatches while the transactions, payments and
  // player pages four clicks away all render the same enum through `txnProviderLabel`.
  // ⚠️ Only the LEGEND is mapped. `listProvidersInPeriod`'s raw keys are also the stack keys
  // that `providerStackedSeries` bins by, so the read itself must stay untouched.
  const providers = (await listProvidersInPeriod(period).catch(() => null))?.map(txnProviderLabel) ?? null;
  // Read-only 7-day daily trend for the GGR/NGR/active tile sparklines — each
  // point is that day's REAL metric (canonical `summarise`), the metric's own
  // recent history, not a proxy series. `spark()` hides an all-zero line.
  const trends = await dailyKpiSeries("7d").catch(() => ({ ggr: [], ngr: [], active: [] }));
  const spark = (s: number[]) => (s.some((v) => v !== 0) ? s : undefined);

  // Tax accrued — the REAL statutory levies, at the admin-configured rates, on
  // the same basis the Daily Operations report files with (TRA + GBT levied on
  // the operator's commission/GGR — see market-config.ts).
  //
  // This previously showed a FABRICATED `ggr * 0.05` "placeholder formula" and
  // presented it to the owner as fact. Never ship an invented money figure: if we
  // can't compute it, we show nothing. Negative GGR accrues no levy (you cannot
  // owe tax on a loss), which matches reports/catalogue.ts's Math.max(0, ggr).
  const rates = await getEffectiveConfig().catch(() => null);
  // Real balances from the double-entry ledger. Empty object without a DB.
  const houseBalances = await houseAccountBalances().catch(() => ({} as Record<string, number>));
  // Wallet↔ledger trial balance (audit C3) — proves the books match the money.
  // Read-only; guarded so a slow/failed scan never takes the finance page down.
  const tb = await trialBalance().catch(() => null);
  // Per-poll settlement commission WITH the fee model each poll used — so an
  // accountant can reconcile which model applied to which poll over the period.
  const pollFees = await settlementFeesByPoll(period).catch(() => null);
  // Paging for the settlement-fee grid (G-1e). `feepage`, not `page`, because this screen
  // hosts several lists and one shared param would move all of them at once.
  const feePage = parsePage(sp.feepage, pollFees?.rows.length ?? 0);
  const feeRows = (pollFees?.rows ?? []).slice((feePage - 1) * PER_PAGE, feePage * PER_PAGE);
  /** ⛔ THE TAB IS A URL FACT (DG-S-03) — it survives a refresh, a Back and a shared link. */
  const FIN_TABS = ["ledger", "trends", "providers"] as const;
  const tabRaw = sp.tab ?? "";
  const tab: (typeof FIN_TABS)[number] = (FIN_TABS as readonly string[]).includes(tabRaw) ? (tabRaw as (typeof FIN_TABS)[number]) : "ledger";
  /* ⛔ `tab` RIDES THE FEE PAGER TOO. This href is built from an explicit object rather than
     from `sp`, so a param omitted here is a param the pager silently drops — turning to page
     2 of the settlement fees would have bounced the officer back to the default section.
     ⚠️ `DateTimeRangeFilter` needs no such change: it copies `sp.toString()` wholesale and
     mutates only the window keys, so it carries the tab already (checked, not assumed). */
  const feeBaseHref = buildBaseHref("/admin/finance", { range: sp.range, from: sp.from, to: sp.to, tab: sp.tab }, "feepage");
  const tabHref = (t: (typeof FIN_TABS)[number]) =>
    buildBaseHref("/admin/finance", { range: sp.range, from: sp.from, to: sp.to, tab: t === "ledger" ? undefined : t }, "feepage") as Route;
  const feeModelLabel = rates?.feeModel === "loser-share" ? "loser-share (new polls)" : "capped-fee (new polls)";
  const taxAccrued = rates && ggr !== null
    ? Math.round(Math.max(0, ggr) * (rates.traTaxOnCommissionRate + rates.gbtLevyOnCommissionRate))
    : null;

  return (
    <>
      <AdminPageHead
        title="Finance"
        sw="Fedha"
        actions={
          <>
            {/* Platform date+hour+minute window (presets + custom), EAT-safe. */}
            <DateTimeRangeFilter rank="dense" defaultPreset="7d" presetIds={["today", "yesterday", "24h", "7d", "28d", "30d", "mtd", "qtd"]} />
            {/* Branded Excel + PDF export — the GBT monthly statutory pack. */}
            <GenerateButton id="gbt-monthly" />
          </>
        }
      />

      <AdminBody>
        {/* KPI 8-up */}
        <KpiGrid>
          {/* ⭐ ONE COUNT-LINE RECIPE — `adminCount` (src/lib/utils.ts). It carries the same
              fixed en-US grouping the note beside the trial-balance counts below already
              rules for, AND the singular, which every count line on this page was missing:
              a window holding one deposit read "1 txns". */}
          <AdminKpi label="Deposits in"     sw="Amana"             value={dep ? formatTzsCompact(dep.amount) : ""} unavailable={dep === null} delta={dep ? adminCount(dep.count, "txn") : undefined} />
          <AdminKpi label="Withdrawals out" sw="Utoaji"            value={wd ? formatTzsCompact(wd.amount) : ""}  unavailable={wd === null}  delta={wd ? adminCount(wd.count, "txn") : undefined} />
          <AdminKpi label="GGR"             sw="Mapato ya jumla"    value={ggr === null ? "" : formatTzsCompact(ggr)}        unavailable={ggr === null} delta={range.label} series={spark(trends.ggr)} />
          <AdminKpi label="NGR"             sw="Mapato halisi"      value={ngr === null ? "" : formatTzsCompact(ngr)}        unavailable={ngr === null} delta="net of bonus + fees" series={spark(trends.ngr)} />
        </KpiGrid>
        <KpiGrid>
          <AdminKpi
            label="Statutory levies"
            sw="Kodi za kisheria"
            value={taxAccrued === null ? "—" : formatTzsCompact(taxAccrued)}
            delta={taxAccrued === null ? "rates unavailable" : "TRA + GBT on commission"}
            deltaDir="flat"
          />
          <AdminKpi label="Operator margin"  sw="Faida"         value={margin === null ? "" : `${margin.toFixed(1)}%`} unavailable={margin === null} delta={feeModelLabel} deltaDir="flat" />
          <AdminKpi label="Wallet liability" sw="Madeni"        value={liability === null ? "" : formatTzsCompact(liability)} unavailable={liability === null} delta="real-time" />
          <AdminKpi label="Active players"   sw="Wachezaji"     value={activePeriod === null ? "" : formatNumber(activePeriod)} unavailable={activePeriod === null} delta={range.label} series={spark(trends.active)} />
        </KpiGrid>


        {/* ⭐ §K rule 7a — THE RAIL, AND IT REVERSES A REFUSAL THIS PROGRAMME MADE.
            `/admin/finance` was refused on test ② (2026-09-01): *"wallet liability is read
            AGAINST house accounts, and tabs would put the two compared things on different
            screens."* That objection was right about the COMPARISON and wrong about the
            remedy — it assumed any split would separate them. The books stay together on
            `ledger`: house accounts, settlement fees and the trial balance are one document
            read against itself, so they share a tab. What leaves are the TRENDS and the
            PROVIDER breakdown, which are read on their own and were never compared to it.
            ⛔ The KPI strip stays above the rail on every tab — it is the frame, not a
            section, and it is what the charts are read against. */}
        <Tabs
          variant="line"
          value={tab}
          ariaLabel="Finance sections"
          tabs={[
            { value: "ledger", labelEn: "Ledger", href: tabHref("ledger") },
            { value: "trends", labelEn: "Trends", href: tabHref("trends") },
            { value: "providers", labelEn: "Providers", href: tabHref("providers") },
          ]}
        />

        {tab === "ledger" && (<>
        {/* THE HOUSE ACCOUNTS — straight from the double-entry ledger.
            `houseAccountBalances()` has existed in ledger.ts since the ledger was
            built and had ZERO call sites: the books were being kept and nobody was
            shown them. These are the real balances, summed from the real entries —
            not derived from analytics, not a formula, not an estimate.
            An empty state is shown rather than a fabricated number. */}
        <AdminCard
          title="House accounts (double-entry ledger)"
          sw="Akaunti za nyumba"
          action={
            /* DG-A-14: "summed from ledger entries" is a sentence about where these balances come
               from — reading copy, not an identifier — so it drops the eyebrow's uppercase and
               tracking and moves up to `text-body-sm`, the smallest rung above §T4's 12.5px
               reading floor. The tone stays; §A1's contrast gate owns that, not this pass. */
            <span className="font-mono text-body-sm text-text-tertiary">
              summed from ledger entries
            </span>
          }
        >
          {Object.keys(houseBalances).length === 0 ? (
            <p className="text-caption text-text-tertiary">
              No ledger entries yet. This panel shows real balances only — it will stay empty rather than show a
              number we cannot substantiate.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Object.entries(houseBalances)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([account, amount]) => (
                  <Stat
                    key={account}
                    label={account.replace(/^(HOUSE|SYSTEM):/, "")}
                    value={formatTzsCompact(amount)}
                    tone={account === "HOUSE:COMMISSION" ? "gold" : "default"}
                    money
                    hint={HOUSE_ACCOUNT_NOTE[account]}
                  />
                ))}
            </div>
          )}
        </AdminCard>

        {/* SETTLEMENT FEES BY POLL — which fee model each settled poll used and the
            commission taken, so an accountant can reconcile per poll and per period.
            The fee is recomputed from each poll's OWN frozen snapshot + outcome (the
            same inputs settlement used ⇒ equals the booked commission). VOID /
            one-sided polls refund in full at 0 fee and are not listed. */}
        <AdminCard
          title="Settlement fees by poll"
          sw="Ada za malipo kwa kila soko"
          action={
            pollFees ? (
              <span className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">
                loser-share {pollFees.byModel["loser-share"].count} · {formatTzsCompact(pollFees.byModel["loser-share"].fee)} — capped {pollFees.byModel["capped-commission"].count} · {formatTzsCompact(pollFees.byModel["capped-commission"].fee)}
              </span>
            ) : null
          }
        >
          {!pollFees || pollFees.rows.length === 0 ? (
            <p className="text-caption text-text-tertiary">
              No polls settled with a fee in this period. VOID and one-sided polls refund in full at zero fee, so
              they are not listed here.
            </p>
          ) : (
            <>
              <ScrollX label="Settlement fees by poll" className="-mx-4 px-4">
                <table className="admin-tbl min-w-[720px]">
                  <thead>
                    <tr>
                      <th className="text-left">Poll</th>
                      <th className="text-left">Settled</th>
                      <th className="text-left">Fee model</th>
                      <th className="text-left">Outcome</th>
                      <th className="text-right">Pool</th>
                      <th className="text-right">Fee taken</th>
                      <th className="text-right">Operator net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeRows.map((r) => (
                      <tr key={r.marketId}>
                        <td className="text-left max-w-[280px] truncate" title={r.title}>{r.title}</td>
                        {/* ⛔ Was `new Date(r.settledAt).toISOString().slice(0, 10)` — a UTC
                            day stamp on a STATUTORY fee table. EAT is UTC+3, so anything
                            settled after 21:00 EAT fell on the previous calendar day here
                            and a period total reconciled against the wrong day. `eatDayKey`
                            is the platform's single definition of a calendar day (see
                            `src/lib/eat-day.ts`) and is what the rest of the reporting
                            stack bins by, so this column now agrees with the report packs.
                            Kept in `YYYY-MM-DD` so the column stays sortable and compact. */}
                        <td className="text-left whitespace-nowrap">{eatDayKey(Date.parse(r.settledAt))}</td>
                        <td className="text-left">
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 font-mono text-micro uppercase tracking-[0.08em] ${
                              r.feeModel === "loser-share" ? "bg-brand-500/15 text-brand-300" : "bg-bg-inset text-text-muted"
                            }`}
                          >
                            {r.feeModel === "loser-share" ? "Loser-share" : "Capped"}
                          </span>
                        </td>
                        <td className="text-left">{r.outcome}</td>
                        <td className="text-right">{formatTzs(r.pool)}</td>
                        <td className="text-right">{formatTzs(r.fee)}</td>
                        <td className="text-right">{formatTzs(r.operatorNet)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollX>
              {/* ⛔ WAS `.slice(0, 50)` with a note admitting the cap (campaign finding
                  G-1e). The note was honest — unlike the rounds console, this page never
                  pretended — but an accountant reconciling a period cannot act on a number
                  they are told about and cannot reach. The date-range filter above already
                  narrows the period; this pages what the period contains. `feepage` rather
                  than `page` so it cannot collide with another list on this screen. */}
              <AdminPagination
                total={pollFees.rows.length}
                page={feePage}
                baseHref={feeBaseHref}
                param="feepage"
              />
              <p className="mt-2 text-body-sm text-text-subtle">
                {/* ⛔ NO LITERAL `TZS ` HERE. `formatTzs` already returns "TZS 45,630"
                    (src/lib/utils.ts), so the unit was printed twice — "TZS TZS 45,630" —
                    on a money page an accountant reconciles against. The same mistake is
                    named in the dated note at wallet/deposit/deposit-confirm.tsx:69-72
                    ("`formatTzs` here would read 'TZS TZS 1,000'"). §C1: the prefix, once. */}
                Total commission this period: {formatTzs(pollFees.totalFee)}.
              </p>
            </>
          )}
        </AdminCard>

        {/* LEDGER TRIAL BALANCE — the books proving themselves (audit C3).
            Compares each wallet's real money (balance + in-flight hold) and bonus
            against the double-entry ledger, plus global conservation (Σ = 0) and
            the bonus-grant invariant. A nightly sweep re-runs this and raises a
            COMPLIANCE alert on any drift; this panel is the live view. */}
        {tb && (
          <AdminCard
            title="Ledger trial balance"
            sw="Ulinganifu wa daftari"
            className={tb.ok ? undefined : "border-danger-border bg-danger-bg"}
            action={
              <span className={["font-mono text-micro tracking-[0.10em] uppercase", tb.ok ? "text-success" : "text-danger-fg"].join(" ")}>
                {tb.ok ? "✓ reconciles" : "✗ drift detected"}
              </span>
            }
          >
            <p className="text-caption text-text-secondary mb-3">
              Every wallet&rsquo;s money reconciled to the double-entry ledger:{" "}
              <code className="font-mono">ledger(PLAYER) = balance + hold</code>,{" "}
              <code className="font-mono">ledger(BONUS) = bonusBalance = Σ active grants</code>, and{" "}
              <code className="font-mono">Σ all entries = 0</code>. Re-checked nightly; drift raises a compliance alert.
            </p>
            <KpiGrid>
              {/* Counts go through `formatNumber`, the same fixed en-US grouping
                  `formatTzs` uses. A bare `toLocaleString()` takes the RUNTIME's default
                  locale, so a count could group with dots while the money beside it
                  grouped with commas on the very same KPI row. */}
              <AdminKpi label="Wallets checked" sw="Pochi zilizokaguliwa" value={formatNumber(tb.checkedWallets)} />
              <AdminKpi
                label="Drifting wallets"
                sw="Pochi zenye tofauti"
                value={formatNumber(tb.driftingWallets)}
                delta={tb.driftingWallets === 0 ? "all reconcile" : `${formatTzs(tb.totalAbsDrift)} total`}
                deltaDir={tb.driftingWallets === 0 ? "up" : "down"}
                pulse={tb.driftingWallets > 0}
              />
              <AdminKpi
                label="Global conservation"
                sw="Uhifadhi wa jumla"
                value={tb.globalBalanced ? "Σ = 0" : `Σ = ${formatTzs(tb.globalSum)}`}
                delta={tb.globalBalanced ? "balanced" : "NOT balanced"}
                deltaDir={tb.globalBalanced ? "up" : "down"}
                pulse={!tb.globalBalanced}
              />
              <AdminKpi
                label="Imbalanced groups"
                sw="Makundi yasiyolingana"
                value={formatNumber(tb.imbalancedGroups.length)}
                deltaDir={tb.imbalancedGroups.length === 0 ? "up" : "down"}
                pulse={tb.imbalancedGroups.length > 0}
              />
            </KpiGrid>
            {tb.drift.length > 0 && (
              <ScrollX label="Drifting wallets" className="-mx-4 px-4 mt-3">
                <table className="admin-tbl min-w-[560px]">
                  <thead>
                    <tr>
                      <th className="text-left">Player</th>
                      <th className="text-right">Wallet (bal+hold)</th>
                      <th className="text-right">Ledger</th>
                      <th className="text-right">Real drift</th>
                      <th className="text-right">Bonus drift</th>
                      <th className="text-right">Grant drift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tb.drift.slice(0, 20).map((r) => (
                      <tr key={r.userId}>
                        <td className="font-mono text-text-tertiary whitespace-nowrap">p_{r.userId.slice(-6)}</td>
                        <td className="font-mono tabular text-right">{formatTzs(r.walletReal)}</td>
                        <td className="font-mono tabular text-right text-text-secondary">{formatTzs(r.ledgerReal)}</td>
                        <td className={["font-mono tabular text-right font-semibold", Math.abs(r.realDrift) > 0.5 ? "text-danger" : "text-text-tertiary"].join(" ")}>{r.realDrift >= 0 ? "+" : ""}{formatTzs(r.realDrift)}</td>
                        <td className={["font-mono tabular text-right", Math.abs(r.bonusDrift) > 0.5 ? "text-danger" : "text-text-tertiary"].join(" ")}>{r.bonusDrift >= 0 ? "+" : ""}{formatTzs(r.bonusDrift)}</td>
                        <td className={["font-mono tabular text-right", Math.abs(r.grantDrift) > 0.5 ? "text-danger" : "text-text-tertiary"].join(" ")}>{r.grantDrift >= 0 ? "+" : ""}{formatTzs(r.grantDrift)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tb.drift.length > 20 && (
                  <p className="text-caption text-text-tertiary mt-2">Showing the 20 largest of {tb.drift.length} drifting wallets.</p>
                )}
              </ScrollX>
            )}
          </AdminCard>
        )}
        </>)}

        {tab === "trends" && (<>
        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <AdminCard title="Net flow over time" sw="Mtiririko wa pesa · 28-day daily series">
            {flow === null ? <AdminLoadError what="the money-flow series" /> : (
              <AdminAreaChart series={flow} xLabels={flow.map((p) => p.label)} height={240} fillVar="var(--royal)" strokeVar="var(--royal)" />
            )}
          </AdminCard>
          {/* A6 — the subtitle says WHAT IS PLOTTED, because the series changed meaning.
              It read "28-day · band 7–10%" while the chart plotted a PER-DAY hold that
              printed 100% on any day nothing had settled and −1183% on a day whose refunds
              were 12.8× its stakes. Inviting an officer to read those points against a
              7–10% band was the compounding half of the defect. Now cumulative, so the last
              point IS the KPI tile above. */}
          <AdminCard title="Operator margin" sw="Faida ya mfumo · cumulative to date · 28-day window">
            {margins === null ? <AdminLoadError what="the margin series" /> : (
              <AdminAreaChart series={margins} xLabels={margins.map((p) => p.label)} height={240} fillVar="var(--royal)" strokeVar="var(--royal)" />
            )}
          </AdminCard>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <AdminCard title="Provider mix over time" sw="Mchanganyiko wa watoa huduma · 14-day daily">
            {provBars === null || providers === null ? <AdminLoadError what="the provider mix" /> : (
              <AdminStackedBars bars={provBars} legend={providers} height={240} />
            )}
          </AdminCard>
          <AdminCard title="Top-10 player concentration" sw="Wachezaji 10 wakubwa">
            {top === null ? (
              <AdminLoadError what="the concentration list" />
            ) : top.length === 0 ? (
              <p className="text-caption text-text-tertiary">No active players yet in this window.</p>
            ) : (
              // AdminBarList (royal fill) — replaces the hand-rolled gold bar
              // (admin gold-discipline) and adopts the A8 distribution primitive.
              <AdminBarList
                rows={top.map((t, i) => ({
                  label: (
                    <span className="font-mono">
                      <span className="text-text-tertiary">#{i + 1}</span>{" "}
                      <span className="text-text">p_{t.userId.slice(-6)}</span>
                    </span>
                  ),
                  value: t.ngr,
                  title: t.userId,
                }))}
                format={(n) => formatTzsCompact(n)}
              />
            )}
          </AdminCard>
        </div>
        </>)}

        {tab === "providers" && (<>
        {/* Provider summary table */}
        <AdminCard
          title="Provider summary"
          sw="Muhtasari wa watoa huduma"
        >
          <ScrollX label="Provider summary" className="-mx-4 px-4">
            <table className="admin-tbl min-w-[640px]">
              <thead>
                <tr>
                  <th className="text-left">Provider</th>
                  <th className="text-right">Deposits</th>
                  <th className="text-right">Dep #</th>
                  <th className="text-right">Withdrawals</th>
                  <th className="text-right">WD #</th>
                  <th className="text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {provs === null && (
                  <tr><td colSpan={6} className="py-3"><AdminLoadError what="the provider summary" /></td></tr>
                )}
                {(provs ?? []).map((p) => (
                  <tr key={p.provider}>
                    <td className="font-medium text-text whitespace-nowrap">{txnProviderLabel(p.provider)}</td>
                    <td className="font-mono tabular text-right">{formatTzs(p.deposits)}</td>
                    <td className="font-mono tabular text-right text-text-secondary">{formatNumber(p.depositCount)}</td>
                    <td className="font-mono tabular text-right">{formatTzs(p.withdrawals)}</td>
                    <td className="font-mono tabular text-right text-text-secondary">{formatNumber(p.withdrawalCount)}</td>
                    <td className={["font-mono tabular text-right font-semibold", p.net >= 0 ? "text-text" : "text-text-tertiary"].join(" ")}>
                      {p.net >= 0 ? "+" : ""}{formatTzsCompact(p.net)}
                    </td>
                  </tr>
                ))}
                {provs !== null && provs.length === 0 && (
                  <AdminTableEmpty colSpan={6} kind="admin" title="No provider data" body="No provider activity in this window." />
                )}
              </tbody>
            </table>
          </ScrollX>
        </AdminCard>
        </>)}
      </AdminBody>
    </>
  );
}
