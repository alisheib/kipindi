import Link from "next/link";
import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { DateTimeRangeFilter } from "@/components/ui/datetime-range-filter";
import { AdminBarList } from "@/components/admin/admin-charts";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { RefreshButton } from "@/components/admin/refresh-button";
import { parseSort, applySort, SortTh } from "@/components/admin/admin-sort";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollX } from "@/components/ui/scroll-x";
import { Chip } from "@/components/ui/chip";
import { I, categoryGlyph } from "@/components/ui/glyphs";
import { getAuditPage } from "@/lib/server/audit";
import { GenerateButton } from "./generate-button";
import { ReportPackCard } from "./report-pack-card";
import { formatDateTime, formatTzs, formatTzsCompact } from "@/lib/utils";
import { reportSummary, dailyPnl, categoryBreakdown, moneyByGame, loadMoneyAttribution } from "@/lib/server/report-money";
import { resolveRange } from "@/lib/server/date-range";
import { currentSession } from "@/lib/server/auth-service";
import { canView } from "@/lib/server/rbac";
import { AdminRestricted } from "@/components/admin/admin-restricted";
import { AdminBody } from "@/components/admin/admin-body";
import { KpiGrid } from "@/components/admin/admin-body";

export const metadata = { title: "Admin · Reports" };
export const dynamic = "force-dynamic";

const CAT_LABEL: Record<string, string> = {
  sports: "Sports", macro: "Macro", weather: "Weather", crypto: "Crypto",
  culture: "Culture", tech: "Tech", other: "Other",
};

// EAT (Africa/Dar_es_Salaam, UTC+3) display helpers — reports are snapshots.
const eatDay = (ms: number) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Dar_es_Salaam", day: "2-digit", month: "short" }).format(new Date(ms));
const eatStamp = (ms: number) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Dar_es_Salaam", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })
    .format(new Date(ms)).replace(", ", " · ");

/** Compare-mode delta chip props for AdminKpi. `unit` picks % vs percentage-points. */
function deltaProps(cur: number, prior: number, compare: boolean, unit: "money" | "pct" | "count") {
  if (!compare) return {};
  if (unit === "pct") {
    const dpp = cur - prior;
    return { delta: `${dpp >= 0 ? "+" : "−"}${Math.abs(dpp).toFixed(1)}pp vs prior`, deltaDir: (dpp > 0.05 ? "up" : dpp < -0.05 ? "down" : "flat") as "up" | "down" | "flat" };
  }
  if (prior === 0) return { delta: cur === 0 ? "no prior data" : "new vs prior", deltaDir: "flat" as const };
  const p = ((cur - prior) / Math.abs(prior)) * 100;
  return { delta: `${p >= 0 ? "+" : "−"}${Math.abs(p).toFixed(1)}% vs prior`, deltaDir: (p >= 0 ? "up" : "down") as "up" | "down" };
}

const TEMPLATES = [
  {
    id: "daily-ops",
    title: "Daily operations report",
    sw: "Ripoti ya kila siku",
    body: "Total sales (stakes), number of tickets, GGR (net of refunds), TRA 10% + GBT 5% levy on operator commission, operator margin, hourly breakdown, deposits/withdrawals. One-page operational snapshot.",
    formats: ["Excel", "PDF"],
    cadence: "Daily",
    severity: "medium",
    target: "Internal · ops",
  },
  {
    id: "gbt-monthly",
    title: "Monthly report",
    sw: "Ripoti ya kila mwezi",
    body: "Tanzania Gaming Board · 12-sheet workbook covering player register changes, GGR, NGR, deposit/withdraw flows, AML triggers, self-exclusion roster, integrity alerts, audit-chain proof. Signed JSON + accompanying PDF.",
    formats: ["JSON (signed)", "PDF"],
    cadence: "Monthly · 5th of each month",
    severity: "high",
    target: "Regulator",
  },
  // The per-player "TRA Withholding Tax Remittance" report was REMOVED (2026-07).
  // 50pick no longer withholds any tax from a player's winnings or withdrawals —
  // that 15% withholding was deleted (Ali's decision). Our real TRA obligation is
  // the 10% levy on OUR commission, and it is filed in the Daily Operations report
  // (which also carries the GBT 5% levy). Filing a per-player "we withheld nothing"
  // return under Income Tax Act Cap 332 would misrepresent a scheme we abolished.
  {
    id: "fiu-sar",
    title: "Suspicious activity report (FIU)",
    sw: "Ripoti ya tuhuma · FIU",
    body: "Financial Intelligence Unit · suspicious activity flagged by AML triggers (single transaction ≥ TZS 1M, structuring, rapid-cycle pattern, sanctions match). Filed within 7 days of identification per POCA Cap 423.",
    formats: ["FIU-format encrypted bundle"],
    cadence: "On-trigger · within 7 days",
    severity: "critical",
    target: "FIU",
  },
  {
    id: "iso-audit",
    title: "ISO 27001 audit log export",
    sw: "Kumbukumbu · ISO",
    body: "Audit-log dump for ISO 27001 A.12.4 compliance. Includes HMAC chain proof so an external auditor can verify the log is intact end-to-end.",
    formats: ["CSV", "JSON (signed)"],
    cadence: "Quarterly · or on demand",
    severity: "medium",
    target: "ISO 27001 auditor",
  },
  {
    id: "kyc-reverify",
    title: "KYC re-verification roster",
    sw: "Orodha · uthibitisho upya",
    body: "Players whose KYC is due for re-verification (every 24 months or on phone/region change). Drives the customer-comms team's outreach queue.",
    formats: ["CSV"],
    cadence: "Weekly",
    severity: "medium",
    target: "Internal · customer comms",
  },
  {
    id: "sx-register",
    title: "Cross-operator self-exclusion register",
    sw: "Sajili · kujizuia",
    body: "Anonymised + hashed list of currently self-excluded players, in the cross-operator format the GBT will adopt in Q3 2026. Blocks players from registering at any other licensed operator while excluded.",
    formats: ["GBT cross-operator CSV"],
    cadence: "Daily SFTP",
    severity: "high",
    target: "GBT cross-operator register",
  },
  {
    id: "rg-engagement",
    title: "Responsible-gambling engagement",
    sw: "Hali ya wachezaji",
    body: "Reality-check fire counts and player responses (continued / break / self-exclude), limit-change history, deferred increases. Used for LCCP-style RG audits.",
    formats: ["CSV", "PDF"],
    cadence: "Monthly",
    severity: "medium",
    target: "Internal · RG audit",
  },
  {
    id: "match-integrity",
    title: "Match-integrity quarterly review",
    sw: "Uadilifu wa mechi",
    body: "Aggregated Sportradar Integrity Services alerts, voided bets, refunded stakes, voided pools, with case file per alert.",
    formats: ["PDF"],
    cadence: "Quarterly",
    severity: "high",
    target: "Sportradar + GBT integrity unit",
  },
];

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string; dir?: string; range?: string; from?: string; to?: string; cmp?: string }>;
}) {
  // Reports/exports expose regulator-grade data → CONFIG_ROLES only, NEVER
  // MODERATOR (roles.ts). The admin layout only gates ADMIN_CONSOLE_ROLES (which
  // DOES include MODERATOR), so without this a moderator could read + export the
  // statutory pack. Return BEFORE any report aggregate is computed.
  const session = await currentSession();
  if (!session || !(session.role === "ADMIN" || (await canView(session.role, "accounting")))) {
    return <AdminRestricted title="Reports" sw="Ripoti" need="Admin or Compliance" />;
  }

  const sp = await searchParams;

  // ── Reporting console (Batch 3 §1) — real aggregates on the normative money
  //    definitions (report-money.ts). "vs prior" is opt-in via ?cmp=1.
  const compare = sp.cmp === "1";
  const generatedAt = Date.now();
  // ONE platform-wide window resolver — presets + custom date+hour+minute, EAT-safe.
  const range = resolveRange(sp, generatedAt);
  const win = { start: range.start, end: range.end };
  // 🔴 DG-A-01. These four used to be four SEQUENTIAL awaits, and two of them each read the
  // whole market table and the whole position table for themselves — so this page did that
  // pair of whole-table reads TWICE per render. Measured on production 2026-08-29, best of
  // three: `/admin/roles` (shell only) 292 ms · `/admin/insights` (ONE such read) 2,534 ms ·
  // this page (TWO) 4,615 ms. ⭐ And it did not care about the window — `?range=today` read
  // 4,759 ms against `?range=30d` at 5,012 — which is what proves the cost is the table reads
  // and not `listInRange`. Load the attribution ONCE, hand it to both, and run the four in
  // parallel. See `loadMoneyAttribution` for why this is a parameter and not a cache.
  const attribution = await loadMoneyAttribution();
  const [{ current, prior }, { rows: pnlRows, totals }, categories, byGame] = await Promise.all([
    reportSummary(win, generatedAt),
    dailyPnl(win, generatedAt),
    categoryBreakdown(win, generatedAt, attribution),
    // Per-game split (Up & Down vs long-form polls). The KPI strip + statutory pack stay
    // COMBINED (TRA/GBT is levied on total commission); this is an additive breakdown so
    // management sees which game earns what.
    moneyByGame(range.start, range.end, attribution).catch(() => null),
  ]);
  const activeRows = pnlRows.filter((r) => r.stakes !== 0 || r.payouts !== 0 || r.bonus !== 0 || r.fees !== 0);
  // KPI sparklines — real daily series (AdminSpark hides <2 pts, e.g. "today").
  const ggrSpark = pnlRows.map((r) => r.ggr);
  const ngrSpark = pnlRows.map((r) => r.ngr);
  const holdSpark = pnlRows.map((r) => r.holdPct);
  const cmpHref = (() => {
    const p = new URLSearchParams();
    if (sp.range) p.set("range", sp.range);
    if (sp.from) p.set("from", sp.from);
    if (sp.to) p.set("to", sp.to);
    if (!compare) p.set("cmp", "1");
    const qs = p.toString();
    return qs ? `/admin/reports?${qs}` : "/admin/reports";
  })();

  // Generation log = audit entries from ADMIN with action starting "report."
  // Pull the whole in-memory window (was capped at 30) so pagination owns the slicing.
  const generated = getAuditPage({ category: "ADMIN", limit: 10000 }).filter((e) => e.action.startsWith("report."));

  // Sort (URL-driven), then paginate — newest first by default.
  const { sort, dir } = parseSort(sp, ["time", "report", "reviewer"] as const, "time", "desc");
  const sorted = applySort(generated, sort, dir, {
    time: (e) => e.createdAt,
    report: (e) => e.action,
    reviewer: (e) => e.actorId ?? "",
  });
  const page = parsePage(sp.page, sorted.length);
  const paged = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const baseHref = buildBaseHref("/admin/reports", { sort: sp.sort, dir: sp.dir });

  return (
    <>
      <AdminPageHead
        title="Reports"
        sw="Ripoti"
        actions={
          <>
            <DateTimeRangeFilter defaultPreset="7d" />
            <Link
              href={cmpHref as never}
              scroll={false}
              className={[
                // ⚠️ LITERAL, not `h-8` — spacing is overridden (tailwind.config.ts:200-215) so
                // `h-8` was 48px on a 10px micro-type chip, 8px above the 40px admin chip standard.
                "font-mono text-micro px-2.5 h-[40px] inline-flex items-center rounded-lg border transition-colors",
                compare ? "border-brand-500 text-brand-300 bg-brand-500/10" : "border-border-strong text-text-subtle hover:text-text",
              ].join(" ")}
            >
              vs prior
            </Link>
            <GenerateButton id="gbt-monthly" />
          </>
        }
      />

      <AdminBody>
        {/* Freshness stamp + normative money definitions (one source of truth) */}
        <div className="flex flex-wrap items-center justify-between gap-2 -mt-1">
          <p className="font-mono text-[10.5px] text-text-tertiary">generated {eatStamp(generatedAt)} EAT · {range.label}</p>
          <p className="font-mono text-[10px] text-text-tertiary tracking-tight">GGR = Stakes − Payouts · NGR = GGR − Bonus − Fees · Hold % = GGR / Stakes</p>
        </div>

        {/* KPI strip — 6 tiles, real aggregates, spark-fed (no gold in admin) */}
        <KpiGrid cols="lg3-xl6">
          <AdminKpi label="GGR" sw="Mapato ya jumla" value={formatTzsCompact(current.ggr)} tone={current.ggr < 0 ? "danger" : undefined} series={ggrSpark} spark {...deltaProps(current.ggr, prior.ggr, compare, "money")} />
          <AdminKpi label="NGR" sw="Mapato halisi" value={formatTzsCompact(current.ngr)} tone={current.ngr < 0 ? "danger" : undefined} series={ngrSpark} spark {...deltaProps(current.ngr, prior.ngr, compare, "money")} />
          <AdminKpi label="Deposits" sw="Amana" value={formatTzsCompact(current.deposits)} spark={false} {...deltaProps(current.deposits, prior.deposits, compare, "money")} />
          <AdminKpi label="Withdrawals" sw="Utoaji" value={formatTzsCompact(current.withdrawals)} spark={false} {...deltaProps(current.withdrawals, prior.withdrawals, compare, "money")} />
          <AdminKpi label="Hold %" sw="Ushikaji" value={`${current.holdPct.toFixed(1)}%`} series={holdSpark} spark {...deltaProps(current.holdPct, prior.holdPct, compare, "pct")} />
          <AdminKpi label="Active players" sw="Wachezaji" value={current.activePlayers.toLocaleString()} spark={false} {...deltaProps(current.activePlayers, prior.activePlayers, compare, "count")} />
        </KpiGrid>

        {/* Daily P&L + category breakdown. minmax(0,1fr) lets the P&L track
            shrink so its inner overflow-x-auto scrolls instead of pushing the
            category card off-canvas (a plain 1fr won't shrink below min-content).
            With no category data the P&L takes the full width (no empty column). */}
        <div className={`grid grid-cols-1 gap-3 ${categories.length ? "xl:grid-cols-[minmax(0,1fr)_360px]" : ""}`}>
          <AdminCard title="Daily P&amp;L" sw="Faida na hasara · kila siku" padding={activeRows.length ? "p-0" : "p-4"}>
            {activeRows.length === 0 ? (
              <EmptyState kind="admin" title="No settled activity in this period" body="Stakes, payouts and GGR appear here once markets settle in the selected window." />
            ) : (
              <ScrollX label="Daily P&L">
                <table className="admin-tbl min-w-[680px]">
                  <thead>
                    <tr>
                      <th className="text-left">Date</th>
                      <th className="text-right">Stakes</th>
                      <th className="text-right">Payouts</th>
                      <th className="text-right">GGR</th>
                      <th className="text-right">Bonus</th>
                      <th className="text-right">Fees</th>
                      <th className="text-right">NGR</th>
                      <th className="text-right">Hold%</th>
                    </tr>
                  </thead>
                  <tbody className="text-text-muted">
                    {activeRows.map((r) => (
                      <tr key={r.dayMs}>
                        <td className="font-mono whitespace-nowrap text-text-subtle">{eatDay(r.dayMs)}</td>
                        <td className="font-mono tabular text-right">{formatTzs(r.stakes)}</td>
                        <td className="font-mono tabular text-right">{formatTzs(r.payouts)}</td>
                        <td className={["font-mono tabular text-right font-semibold", r.ggr < 0 ? "text-danger" : "text-text"].join(" ")}>{formatTzs(r.ggr)}</td>
                        <td className="font-mono tabular text-right text-text-tertiary">{formatTzs(r.bonus)}</td>
                        <td className="font-mono tabular text-right text-text-tertiary">{formatTzs(r.fees)}</td>
                        <td className={["font-mono tabular text-right font-semibold", r.ngr < 0 ? "text-danger" : "text-text"].join(" ")}>{formatTzs(r.ngr)}</td>
                        <td className="font-mono tabular text-right text-text-secondary">{r.holdPct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border-strong">
                      <td className="font-mono text-text uppercase text-[10px] tracking-wider font-bold">Total</td>
                      <td className="font-mono tabular text-right text-text font-bold">{formatTzs(totals.stakes)}</td>
                      <td className="font-mono tabular text-right text-text font-bold">{formatTzs(totals.payouts)}</td>
                      <td className={["font-mono tabular text-right font-bold", totals.ggr < 0 ? "text-danger" : "text-text"].join(" ")}>{formatTzs(totals.ggr)}</td>
                      <td className="font-mono tabular text-right text-text-secondary font-bold">{formatTzs(totals.bonus)}</td>
                      <td className="font-mono tabular text-right text-text-secondary font-bold">{formatTzs(totals.fees)}</td>
                      <td className={["font-mono tabular text-right font-bold", totals.ngr < 0 ? "text-danger" : "text-text"].join(" ")}>{formatTzs(totals.ngr)}</td>
                      <td className="font-mono tabular text-right text-text font-bold">{totals.holdPct.toFixed(1)}%</td>
                    </tr>
                  </tfoot>
                </table>
              </ScrollX>
            )}
          </AdminCard>

          {/* 🔴 A FAILED READ IS NOT AN EMPTY WINDOW (DG-A-01, 2026-08-29).
              `moneyByGame` is wrapped in `.catch(() => null)`, and the condition below used to
              begin `byGame && …` — so when the read threw, this whole card silently VANISHED
              and the page read exactly as it does when nobody staked anything. On a
              regulator-facing reporting console that is a money statement made by omission,
              and the same file already argues the principle 20 lines down: *"DISCLOSED, NEVER
              FOLDED … added to Markets, which overstated long-form GGR by an amount no reader
              could see"*. `/admin/insights` (insights/page.tsx:173) already discloses this exact
              failure for `categoryBreakdown` — the sibling call to the sibling function — in
              these words. It says them here too now.
              ⛔ A genuinely empty window still renders nothing: that is not a false statement,
              because every other card on the page is reporting the same window. */}
          {byGame === null && (
            <AdminCard title="By game" sw="Kwa mchezo · Markets vs Up &amp; Down">
              {/* `text-body-sm` (13px), not a hand-typed `text-[13px]` — the sibling
                  disclosure on /admin/insights still hand-types it and DG-A-12's sweep will
                  move it; a new line does not join the backlog it is being written beside. */}
              <p className="text-body-sm text-warning-fg">
                Couldn&apos;t load the per-game split — a data read failed, so this is not a real zero.
                Refresh to retry.
              </p>
            </AdminCard>
          )}

          {byGame && (byGame.market.stakes > 0 || byGame.updown.stakes > 0 || byGame.unattributed.stakes > 0) && (
            <AdminCard title="By game" sw="Kwa mchezo · Markets vs Up &amp; Down" padding="p-0">
              <ScrollX label="Money by game">
                {/* `admin-table` was a typo — that class does not exist anywhere,
                    so this table rendered with no cell padding, no header styling
                    and no row borders. The real one is `.admin-tbl`. */}
                <table className="admin-tbl w-full min-w-[560px]">
                  <thead>
                    <tr>
                      <th className="text-left">Game</th>
                      <th className="text-right">Staked</th>
                      <th className="text-right">Paid out</th>
                      <th className="text-right">Refunds</th>
                      <th className="text-right">GGR</th>
                      <th className="text-right">Hold %</th>
                      <th className="text-right">Bets</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Markets · long-form polls", g: byGame.market, unknown: false },
                      { label: "Up & Down · price rounds", g: byGame.updown, unknown: false },
                      // 🔴 DISCLOSED, NEVER FOLDED. Bet money whose Position row no longer
                      // resolves, so the game cannot be determined. This line used to be
                      // added to "Markets", which overstated long-form GGR by an amount no
                      // reader could see (audit F-03). Hidden only when it is genuinely zero.
                      ...(byGame.unattributed.stakes > 0 || byGame.unattributed.payouts > 0 || byGame.unattributed.refunds > 0
                        ? [{ label: "Unattributed · game not determinable", g: byGame.unattributed, unknown: true }]
                        : []),
                    ].map(({ label, g, unknown }) => (
                      <tr key={g.game}>
                        <td className={["text-left font-semibold", unknown ? "text-warning-fg" : "text-text"].join(" ")}>{label}</td>
                        <td className="font-mono tabular text-right text-text">{formatTzs(g.stakes)}</td>
                        <td className="font-mono tabular text-right text-text">{formatTzs(g.payouts)}</td>
                        <td className="font-mono tabular text-right text-text-tertiary">{formatTzs(g.refunds)}</td>
                        <td className={["font-mono tabular text-right font-semibold", g.ggr < 0 ? "text-danger" : "text-text"].join(" ")}>{formatTzs(g.ggr)}</td>
                        <td className="font-mono tabular text-right text-text">{g.holdPct.toFixed(1)}%</td>
                        <td className="font-mono tabular text-right text-text-tertiary">{g.bets.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      {/* ⭐ Combined includes the unattributed line. That money is real
                          bet-derived revenue and IS levied, so leaving it out would make the
                          statutory total understate by exactly the amount F-03 moved off the
                          MARKET line. Combined is therefore unchanged by that fix — only the
                          per-game attribution above it became honest. */}
                      <td className="text-left font-bold text-text">Combined</td>
                      <td className="font-mono tabular text-right font-bold text-text">{formatTzs(byGame.market.stakes + byGame.updown.stakes + byGame.unattributed.stakes)}</td>
                      <td className="font-mono tabular text-right font-bold text-text">{formatTzs(byGame.market.payouts + byGame.updown.payouts + byGame.unattributed.payouts)}</td>
                      <td className="font-mono tabular text-right font-bold text-text-tertiary">{formatTzs(byGame.market.refunds + byGame.updown.refunds + byGame.unattributed.refunds)}</td>
                      <td className="font-mono tabular text-right font-bold text-text">{formatTzs(byGame.market.ggr + byGame.updown.ggr + byGame.unattributed.ggr)}</td>
                      <td className="font-mono tabular text-right font-bold text-text">—</td>
                      <td className="font-mono tabular text-right font-bold text-text-tertiary">{(byGame.market.bets + byGame.updown.bets + byGame.unattributed.bets).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </ScrollX>
              <p className="px-4 py-3 text-[11px] text-text-tertiary leading-snug">
                Bet-derived money only. Deposits, withdrawals, bonuses and payment fees belong to neither game and stay in
                the platform totals above. The statutory pack and the TRA/GBT levy read the COMBINED commission.
                {(byGame.unattributed.stakes > 0 || byGame.unattributed.payouts > 0 || byGame.unattributed.refunds > 0) && (
                  <>
                    {" "}
                    <span className="text-warning-fg">
                      &ldquo;Unattributed&rdquo; is bet money whose position record no longer resolves, so the game cannot be
                      determined ({byGame.unattributed.bets.toLocaleString()} staking {byGame.unattributed.bets === 1 ? "bet" : "bets"} in
                      this window). It is disclosed rather than assigned to a game, and is included in Combined.
                    </span>
                  </>
                )}
              </p>
            </AdminCard>
          )}

          {categories.length > 0 && (
            <AdminCard title="GGR by category" sw="Mapato kwa aina · share of GGR">
              <AdminBarList
                rows={categories.map((c) => {
                  const Glyph = I[categoryGlyph(c.category)];
                  return {
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        <Glyph s={13} className="text-text-tertiary" />
                        {CAT_LABEL[c.category] ?? c.category}
                        <span className="text-text-tertiary font-mono text-[10px]">· {c.holdPct.toFixed(0)}% hold</span>
                      </span>
                    ),
                    value: Math.max(0, c.ggr),
                    title: `${CAT_LABEL[c.category] ?? c.category} · GGR ${formatTzsCompact(c.ggr)} · ${c.sharePct.toFixed(0)}% share`,
                  };
                })}
                format={(n) => formatTzsCompact(n)}
              />
            </AdminCard>
          )}
        </div>

        {/* ── Regulator pack — maker-checker signing chain (ADM1 §1) ── */}
        <ReportPackCard />

        {/* ── Report library — statutory + operational templates ── */}
        <div className="pt-3 border-t border-dashed border-border-subtle">
          <p className="font-display font-semibold text-body-sm text-text">Report library</p>
          <p className="text-caption text-text-tertiary italic">Maktaba ya ripoti · statutory + operational templates</p>
        </div>

        {/* Templates list */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {TEMPLATES.map((t) => (
            <AdminCard key={t.id} className="hover:border-border-strong transition-colors">
              <div className="flex items-start gap-3">
                <span
                  className={[
                    // ⚠️ LITERALS, not `h-9 w-9` (64px on the overridden scale) — a severity
                    // glyph tile around a 16px glyph.
                    "h-[36px] w-[36px] rounded-md inline-flex items-center justify-center shrink-0",
                    t.severity === "critical" ? "bg-danger/15 text-danger-fg" :
                    t.severity === "high"     ? "bg-warning/15 text-warning" :
                                                "bg-royal/15 text-royal-300",
                  ].join(" ")}
                >
                  <I.download s={16} aria-hidden />
                </span>
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <p className="font-display font-bold text-[14px] text-text leading-snug">{t.title}</p>
                    <p className="text-[11px] text-text-tertiary italic mt-0.5">{t.sw}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {/* ⭐ G-7 IS NOW FIXED IN THE SHARED `Chip` ITSELF, so this call site no
                        longer opts out of anything. It kept the evidence that found it:
                        "Sportradar + GBT integrity unit" is 206px of glyphs and at 360
                        the column is 198px, so the chip was drawn 8px outside it with no
                        ellipsis. `Chip` now sizes with `minHeight` instead of a fixed
                        `height` and wraps, which is a no-op at every width where a chip
                        already fitted. */}
                    <Chip
                      size="sm"
                      variant={t.severity === "critical" ? "danger" : t.severity === "high" ? "warning" : "neutral"}
                    >
                      {t.target}
                    </Chip>
                    <span className="font-mono text-[10px] tracking-wider text-text-tertiary self-center">{t.cadence}</span>
                  </div>
                  <p className="text-[12px] text-text-secondary leading-relaxed">{t.body}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 mt-1 border-t border-border-subtle">
                    <div className="flex flex-wrap gap-1">
                      {t.formats.map((f) => (
                        <span key={f} className="font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded-sm bg-bg-sunken text-text-tertiary whitespace-nowrap">
                          {f}
                        </span>
                      ))}
                    </div>
                    <GenerateButton id={t.id} />
                  </div>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>

        {/* Generation log */}
        <AdminCard title="Generation log" sw="Kumbukumbu ya kuzalisha" padding={generated.length > 0 ? "p-0" : "p-4"}
          /* ⛔ NO SIZE OVERRIDE — see admin-proposals-client.tsx. The `!h-7 !w-7` bandage
             existed only because `variant="icon"` used to render 80×80; it is 40×40 on its
             own now. */
          action={<RefreshButton variant="icon" />}>
          {generated.length === 0 ? (
            <EmptyState
              kind="audit"
              title="No reports generated yet"
              body="Each generated report is logged here with its reviewer, timestamp, period covered, and a signed receipt the regulator can verify."
            />
          ) : (
            <ScrollX label="Report library">
              <table className="admin-tbl">
                <thead>
                  <tr>
                    <SortTh field="time" label="Timestamp" current={sort} dir={dir} sp={sp} baseHref="/admin/reports" />
                    <SortTh field="report" label="Report" current={sort} dir={dir} sp={sp} baseHref="/admin/reports" />
                    <SortTh field="reviewer" label="Reviewer" current={sort} dir={dir} sp={sp} baseHref="/admin/reports" />
                  </tr>
                </thead>
                <tbody className="text-text-muted">
                  {paged.map((e) => (
                    <tr key={e.id}>
                      <td className="font-mono whitespace-nowrap text-text-subtle">{formatDateTime(e.createdAt)}</td>
                      <td className="font-medium text-text">{e.action}</td>
                      <td className="font-mono">{e.actorId ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <AdminPagination total={sorted.length} page={page} baseHref={baseHref} />
            </ScrollX>
          )}
        </AdminCard>

        <AdminCard className="border-info-border bg-info-bg">
          <div className="text-caption text-text-secondary space-y-1">
            <p className="text-text font-bold">Generation pipeline (production)</p>
            <p>
              Each template runs against Postgres aggregations, signs the output with HMAC-chained envelopes
              (matching the audit-chain scheme), and uploads to the regulator&apos;s endpoint via SFTP / mTLS.
              Failed generations alert on-call. Every download is recorded under{" "}
              <code>ADMIN</code>{" "}with the reviewer&apos;s user-id, IP, and reason.
            </p>
          </div>
        </AdminCard>
      </AdminBody>
    </>
  );
}
