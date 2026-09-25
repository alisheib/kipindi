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
  walletLiabilityByStatus,
  unverifiedLiability,
  providerSummary,
  topNgrContributors,
  activePlayers,
  moneyFlowSeries,
  marginSeries,
  providerStackedSeries,
  bucketGrain,
  settlementFeesByPoll,
} from "@/lib/server/analytics";
import { dailyKpiSeries, lastEatDays } from "@/lib/server/report-money";
import { resolveRange } from "@/lib/server/date-range";
import { DateTimeRangeFilter } from "@/components/ui/datetime-range-filter";
import { formatTzs, formatTzsCompact, formatNumber, adminCount } from "@/lib/utils";
import { walletLiabilityCaption } from "@/lib/wallet-liability";
import { txnProviderLabel } from "@/components/admin/status-badge";
import { eatDayKey } from "@/lib/eat-day";
import { ScrollX } from "@/components/ui/scroll-x";
import { GenerateButton } from "../reports/generate-button";
import { currentSession } from "@/lib/server/auth-service";
import { canView } from "@/lib/server/rbac";
import { getEffectiveConfig } from "@/lib/server/market-config";
import { houseAccountBalances, houseAccountMovement, trialBalance } from "@/lib/server/ledger";
import { Stat } from "@/components/ui/stat";
import { AdminRestricted } from "@/components/admin/admin-restricted";
import { AdminPageGate } from "@/components/admin/admin-section-gate";
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
  "HOUSE:TAX": "Statutory tax held — owed to the state, NOT ours",
  "HOUSE:RESERVE": "RETIRED — historical rows only",
  "SYSTEM:BONUS": "bonus issuance",
  "SYSTEM:ADJUSTMENT": "admin adjustments",
  "SYSTEM:VOID": "expired bonus sink",
};
export const metadata = { title: "Admin · Finance" };
export const dynamic = "force-dynamic";

type FinanceSearch = { range?: string; from?: string; to?: string; feepage?: string; tab?: string };

/** E-381 §6 item 10 — belt 2: the stored-row gate, re-read per page render (a flight request can skip the layouts). */
export default async function AdminFinancePage(props: { searchParams: Promise<FinanceSearch> }) {
  return <AdminPageGate title="Finance"><AdminFinanceContent {...props} /></AdminPageGate>;
}

async function AdminFinanceContent({ searchParams }: { searchParams: Promise<FinanceSearch> }) {
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
  /* ⭐ ONE `now` FOR THE PAGE AND FOR THE EXPORT. A rolling preset ("7d") is `now − 7 days`, so
     if the export resolved its own `now` a few seconds later the workbook would cover a window
     a few seconds after the screen's — different by any transaction that landed in between, on
     a money document. The buttons below carry this instant as `asof`, so the two agree by
     construction rather than by luck. */
  const now = Date.now();
  const range = resolveRange(sp, now, "7d");
  const period = { start: range.start, end: range.end };

  // A-5: money figures resolve to null (not 0) on a failed read, so the tile
  // renders an explicit "n/a · couldn't compute" instead of a fabricated "TZS 0".
  const dep = await depositsTotal(period).catch(() => null);
  const wd  = await withdrawalsTotal(period).catch(() => null);
  const ggr = await grossGamingRevenue(period).catch(() => null);
  const ngr = await netGamingRevenue(period).catch(() => null);
  const margin = await operatorMarginPct(period).catch(() => null);
  /**
   * ⭐ THE TILE SAYS ITS BASIS (2026-09-14, register E-400 ⑦e). "Wallet liability" counts ACTIVE wallets — the
   * basis "Held for unverified" is a subset of — and its caption said only "real-time", so a frozen, still
   * undecided balance (a final identity refusal, an officer's hold, a self-exclusion) vanished from the headline
   * with nothing to say so. `walletLiabilityByStatus` reads ONE snapshot: the headline, plus the frozen and closed
   * money the basis leaves out, which the caption names. ⛔ The headline's basis is unchanged (test:kyc-stage §9, §12).
   */
  const liability = await walletLiabilityByStatus().catch(() => null);
  /**
   * ⭐ HELD FOR UNVERIFIED (2026-09-13) — what we owe accounts whose identity was never approved.
   * From that date identity is asked before a withdrawal and nothing else, so any account can hold
   * money we hold no identity for, and "how much?" is the regulator's first question about the
   * ruling. `unverifiedLiability()` is on the SAME basis as the tile beside it (ACTIVE wallets,
   * balance + hold), so it is a subset of "Wallet liability" and reconciles against it.
   * ⛔ A failed read is `unavailable`, never TZS 0 — that would be a false compliance all-clear.
   * `unverifiedLiability` never throws by construction; the `.catch` is for the unforeseen.
   * ⚠️ Frozen and closed never-approved balances are OUTSIDE that basis (a final identity refusal
   * freezes the wallet), so they ride the caption rather than vanishing from the page.
   */
  const unverified = await unverifiedLiability().catch(() => null);
  const held = unverified && unverified.ok ? unverified : null;
  const heldCaption = held
    ? [
        adminCount(held.accounts, "account"),
        held.frozen.accounts > 0 ? `+${formatTzsCompact(held.frozen.tzs)} frozen` : null,
        held.closed.accounts > 0 ? `+${formatTzsCompact(held.closed.tzs)} closed` : null,
      ].filter(Boolean).join(" · ")
    : undefined;
  // B-1: list/series reads fail to null (rendered as AdminLoadError), never to
  // [] — a failed read shown as "no provider activity" fabricates an all-clear.
  const provs = await providerSummary(period).catch(() => null);
  const top = await topNgrContributors(10).catch(() => null);
  const activePeriod = await activePlayers(period).catch(() => null);
  const flow = await moneyFlowSeries(period, 28).catch(() => null);
  const margins = await marginSeries(period, 28).catch(() => null);
  /**
   * ⛔ THE LEGEND IS A LABEL (§L1), SO IT IS SPELLED BY THE LEXICON — the chart printed
   * `AIRTEL_MONEY` / `TIGO_PESA` beside its swatches while the transactions, payments and
   * player pages four clicks away all render the same enum through `txnProviderLabel`.
   * 🔴 AND IT USED TO BE READ FROM A SECOND QUERY. `listProvidersInPeriod` listed providers over
   * EVERY txn type and EVERY status while the bars binned CONFIRMED DEPOSITS only, and the chart
   * paired them by INDEX — so a provider seen only on a withdrawal, or only on a failed deposit,
   * took a swatch with no stack behind it and shifted every label after it onto the wrong bar.
   * `providerStackedSeries` now returns the keys it actually binned by; there is no second list
   * to disagree with. The raw keys stay the bin keys — only this line maps them for display.
   */
  const provSeries = await providerStackedSeries(period, 14).catch(() => null);
  const provBars = provSeries?.bars ?? null;
  const providers = provSeries?.providers.map(txnProviderLabel) ?? null;
  // Read-only 7-day daily trend for the GGR/NGR/active tile sparklines — each
  // point is that day's REAL metric (canonical `summarise`), the metric's own
  // recent history, not a proxy series. `spark()` hides an all-zero line.
  /**
   * 🔴 THE SPARKLINE IGNORED THE PICKER, UNDER A CAPTION THAT NAMED IT. These tiles caption
   * themselves `range.label` — "Last 28 days" — while the line beneath was hard-coded to 7 days,
   * so the number, the caption and the line described three different windows.
   * ⭐ `lastEatDays` makes the window WHOLE EAT DAYS, which also fixes a second defect: the `7d`
   * preset is `now − 7×DAY_MS`, not a day boundary, so a "7-day" series returned EIGHT points
   * with a short first bar. The spark follows the selected window when that window spans at
   * least two whole days, and otherwise falls back to a 7-day trend — a single intraday bucket
   * is not a trend, and drawing one point as a line would be a shape with nothing in it.
   * ⛔ The caption below says which of the two it is. A spark on a different window from its
   * own tile is only honest if it says so.
   */
  // What a bucket on each Trends card actually is, for the subtitles below.
  const flowGrain = bucketGrain(range.start, range.end, 28);
  const provGrain = bucketGrain(range.start, range.end, 14);
  const sparkDays = Math.max(1, Math.round((range.end - range.start) / 86_400_000));
  const sparkWindow = sparkDays >= 2 ? lastEatDays(Math.min(sparkDays, 90)) : lastEatDays(7);
  const sparkLabel = sparkDays >= 2 ? `${Math.min(sparkDays, 90)}d trend` : "7d trend";
  const trends = await dailyKpiSeries(sparkWindow).catch(() => ({ ggr: [], ngr: [], active: [] }));
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
  /** ⛔ A VERDICT NEEDS A POPULATION (2026-09-14). `trialBalance()` answers `ok: true` over ZERO wallets when
   *  there is no database, and an empty database reads the same, so a green "✓ reconciles" was printed for
   *  a check that looked at nothing while Wallet liability above read TZS 1.0M. Nothing checked is "not
   *  measured", never an all-clear. A report that found drift is measured whatever it counted. */
  const tbMeasured = tb !== null && (tb.checkedWallets > 0 || !tb.ok);
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
  /**
   * 🔴 THIS TILE HAS NOW BEEN WRONG TWICE, IN OPPOSITE DIRECTIONS, AND BOTH TIMES BECAUSE IT
   * COMPUTED A TAX INSTEAD OF READING ONE.
   *
   * ① It accrued `GGR × (TRA + GBT)`. The rates are defined throughout this codebase as a
   *   fraction OF OUR FEE — `levySplit` (payout.ts) applies them to the settlement fee, the agent
   *   waterfall to the gross fee — and the house standard is explicit that taxes are only ever on
   *   50pick's commission, never on a player's money. GGR is stakes − payouts − refunds, so while
   *   positions are open it also holds money not yet earned. Production, Sept 2026 EAT: GGR
   *   803,675 against 8,796 of levy actually booked. The tile printed **120,551 — 14× the real
   *   liability**, on the screen an owner reads tax off.
   * ② So it was changed to `HOUSE:COMMISSION movement × (TRA + GBT)` — and that was wrong too.
   *   **`HOUSE:COMMISSION` IS ALREADY NET OF THE LEVIES.** Read one settlement group: commission
   *   `+130`, then `SETTLEMENT_TRA_LEVY −13` and `SETTLEMENT_GBT_LEVY −7` DEBITED OUT OF THE SAME
   *   ACCOUNT and credited to the levy accounts. Across all time the account's credits are 63,651
   *   and its debits −9,523, and 6,320 (TRA) + 3,203 (GBT) = 9,523 exactly. Levying the balance
   *   therefore taxes the post-tax figure: 54,128 × 15% = **8,119 against 9,523 booked, 15% low**.
   *
   * ⭐ NO FORMULA REPRODUCES THE BOOKED NUMBER, AND THAT IS THE POINT. Gross settlement commission
   * × 15% = 9,447.75, not 9,523: each settlement rounds its own levy (GBT on a 130 fee is 6.5 →
   * 7). And `WITHDRAWAL_FEE` (666) sits in the same account carrying NO levy at all — 251 levy
   * entries against 251 settlement-commission entries. Any base we pick is a reconstruction.
   * ⛔ SO THE TILE READS WHAT THE LEDGER BOOKED, and computes nothing. `HOUSE:TRA_LEVY` +
   * `HOUSE:GBT_LEVY` movement in the window IS the liability this period accrued. It reconciles
   * to the books by construction, cannot drift with per-settlement rounding, and is the figure a
   * regulator would reconcile against. It also needs no rate config, so one less thing to fail.
   * ⚠️ These accounts are credit-only (0 debits in 251 entries) — nothing has been remitted yet,
   * so movement-in-window is accrual, which is what "levies" on a period screen means.
   */
  const houseMoved = await houseAccountMovement(period.start, period.end).catch(() => null);
  const taxAccrued = houseMoved === null
    ? null
    : Math.round((houseMoved["HOUSE:TRA_LEVY"] ?? 0) + (houseMoved["HOUSE:GBT_LEVY"] ?? 0));
  const levyBasisCaption = "TRA + GBT as booked to the ledger";

  return (
    <>
      <AdminPageHead
        title="Finance"
        sw="Fedha"
        actions={
          <>
            {/* Platform date+hour+minute window (presets + custom), EAT-safe.
                ⭐ `panel="overlay"` because this rail lives in the page head's ACTIONS slot. Inline,
                opening Custom grew the control to ~180px and the export buttons beside it slid down
                with it (`items-center`), while the header's `items-end` hauled the whole block up to
                the title baseline — the buttons moved twice for a panel opened next to them. Out of
                flow, this control's height never changes and nothing around it reflows. */}
            <DateTimeRangeFilter rank="dense" panel="overlay" defaultPreset="7d" presetIds={["today", "yesterday", "24h", "7d", "28d", "30d", "mtd", "qtd"]} />
            {/* 🔴 TWO EXPORTS, AND THEY COVER DIFFERENT WINDOWS — WHICH IS EXACTLY WHY THEY ARE
                LABELLED. Until now this rail held ONE pair that always built the GBT statutory
                pack for the previous complete calendar month, sitting inches from a date picker
                it ignored: choose "today", press Excel, receive last month. The figures were
                never wrong, they were never the ones on screen.
                ⛔ The statutory pack STAYS fixed to its calendar month — following a picker is
                precisely what a filing must not do. So the fix is not to change it but to stop
                it standing in for the other document, and to say on the rail which is which. */}
            <span className="inline-flex items-center gap-1.5">
              <span className="font-mono text-micro uppercase tracking-[0.10em] text-text-tertiary">This view</span>
              <GenerateButton
                id="finance-window"
                size="xs"
                title={`Finance for the window on screen — ${range.label}`}
                query={`range=${encodeURIComponent(range.preset)}${sp.from ? `&from=${encodeURIComponent(sp.from)}` : ""}${sp.to ? `&to=${encodeURIComponent(sp.to)}` : ""}&asof=${now}`}
              />
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="font-mono text-micro uppercase tracking-[0.10em] text-text-tertiary">Statutory</span>
              {/* ⭐ `size="xs"` on both pairs so they sit at the same 32px as the window pills
                  they share a row with. This page is a DECLARED dense admin filter rail
                  (filter-language ADMIN_SURFACES) and is NOT on the tap-floor list, so the dense
                  rung is the correct one here — at 40px the row carried one control language at
                  two heights. */}
              <GenerateButton
                id="gbt-monthly"
                size="xs"
                title="GBT monthly pack — the previous complete calendar month, NOT the window on screen"
              />
            </span>
          </>
        }
      />

      <AdminBody>
        {/* 🔴 A WINDOW THAT SUBSTITUTED ITSELF USED TO DO IT IN SILENCE. `resolveRange` reads
            `from`/`to` as EAT wall-clock through an ANCHORED pattern, so a full ISO instant —
            exactly what `toISOString()` produces, and what a pasted or generated link carries —
            fails to parse and the resolver quietly falls back to the last 24 hours while STILL
            labelling the window "custom". Every figure below is then computed over a window
            nobody chose. The numbers were never wrong for the window they used; what was missing
            was any way to know which window that was. */}
        {range.unreadable && (
          <div className="flex items-start gap-3 rounded-md border border-warning-border bg-warning-bg px-4 py-3">
            <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-pill" style={{ background: "var(--warning-500)" }} />
            <p className="text-caption text-text-secondary">
              The <span className="font-mono">{range.unreadable.join(" and ")}</span>{" "}
              {range.unreadable.length > 1 ? "values" : "value"} in this link could not be read as a date,
              so the figures below cover{" "}
              <strong className="text-text">{range.label}</strong> instead of the window that was asked for.
              Dates are East Africa Time and must be written{" "}
              <code className="font-mono">YYYY-MM-DD</code> or <code className="font-mono">YYYY-MM-DDTHH:MM</code>.
            </p>
          </div>
        )}
        {/* KPI 9-up — THREE ROWS OF THREE since 2026-09-13, each one question an owner asks:
            what moved · what we earned · what we owe. ⭐ The regroup exists so "Held for
            unverified" sits BESIDE "Wallet liability", the figure it is a subset of: the two
            are read against each other, and a ninth tile wrapping alone onto a row of its own
            would have put them on different lines. The tiles themselves are unchanged.
            ⚠️ BELOW `lg` EACH BAND IS TWO COLUMNS, so three tiles are 2 + 1 (2026-09-14). The odd tile
            spans both columns through its wrapper: the LAST tile of the first two bands, and the FIRST
            of the third, which is what keeps "Held for unverified" beside "Wallet liability" on a
            phone instead of leaving three half-empty rows. The wrapper is a grid, so the tile still
            fills the row's height. */}
        <KpiGrid cols="3">
          {/* ⭐ ONE COUNT-LINE RECIPE — `adminCount` (src/lib/utils.ts). It carries the same
              fixed en-US grouping the note beside the trial-balance counts below already
              rules for, AND the singular, which every count line on this page was missing:
              a window holding one deposit read "1 txns". */}
          <AdminKpi label="Deposits in"     sw="Amana"             value={dep ? formatTzsCompact(dep.amount) : ""} unavailable={dep === null} delta={dep ? adminCount(dep.count, "txn") : undefined} />
          <AdminKpi label="Withdrawals out" sw="Utoaji"            value={wd ? formatTzsCompact(wd.amount) : ""}  unavailable={wd === null}  delta={wd ? adminCount(wd.count, "txn") : undefined} />
          <div className="col-span-2 grid lg:col-span-1">
            <AdminKpi label="Active players"   sw="Wachezaji"     value={activePeriod === null ? "" : formatNumber(activePeriod)} unavailable={activePeriod === null} delta={`${range.label} · ${sparkLabel}`} series={spark(trends.active)} />
          </div>
        </KpiGrid>
        <KpiGrid cols="3">
          <AdminKpi label="GGR"             sw="Mapato ya jumla"    value={ggr === null ? "" : formatTzsCompact(ggr)}        unavailable={ggr === null} delta={`${range.label} · ${sparkLabel}`} series={spark(trends.ggr)} />
          <AdminKpi label="NGR"             sw="Mapato halisi"      value={ngr === null ? "" : formatTzsCompact(ngr)}        unavailable={ngr === null} delta={`net of bonus + fees · ${sparkLabel}`} series={spark(trends.ngr)} />
          <div className="col-span-2 grid lg:col-span-1">
            <AdminKpi label="Operator margin"  sw="Faida"         value={margin === null ? "" : `${margin.toFixed(1)}%`} unavailable={margin === null} delta={feeModelLabel} deltaDir="flat" />
          </div>
        </KpiGrid>
        <KpiGrid cols="3">
          <div className="col-span-2 grid lg:col-span-1">
            {/* ⛔ A-5, AND IT WAS THE ONE TILE ON THIS PAGE WITHOUT IT. A failed rates or ledger
                read rendered a bare "—", which on a tax figure reads as ZERO — the fabricated
                all-clear every sibling tile here already refuses. It now takes the same explicit
                "n/a · couldn't compute" treatment as the eight tiles around it. */}
            <AdminKpi
              label="Statutory levies"
              sw="Kodi za kisheria"
              value={taxAccrued === null ? "" : formatTzsCompact(taxAccrued)}
              unavailable={taxAccrued === null}
              delta={levyBasisCaption}
              deltaDir="flat"
            />
          </div>
          <AdminKpi
            label="Wallet liability"
            sw="Madeni"
            value={liability === null ? "" : formatTzsCompact(liability.activeTzs)}
            unavailable={liability === null}
            delta={liability === null ? undefined : walletLiabilityCaption(liability)}
          />
          {/* ⭐ HELD FOR UNVERIFIED (2026-09-13) — the part of the tile beside it owed to accounts
              never identity-approved; same basis (ACTIVE wallets, balance + hold). The caption
              is the account count, plus any frozen or closed never-approved money that the
              basis leaves out (a final identity refusal freezes the wallet).
              ⛔ `unavailable` on a failed read — never TZS 0. ⛔ No `sw`: there is no shipped
              Swahili for this label and the lexicon forbids inventing one. */}
          <AdminKpi
            label="Held for unverified"
            value={held === null ? "" : formatTzsCompact(held.tzs)}
            unavailable={held === null}
            delta={heldCaption}
            deltaDir="flat"
          />
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
            /* ⛔ AND IT IS ALL-TIME. These are cumulative ledger balances, not a window — the
               settlement-fee table directly below IS filtered by the picker, so two cards on one
               tab answer to different clocks and only one of them used to say which. */
            <span className="font-mono text-body-sm text-text-tertiary">
              summed from all ledger entries · all time
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
                        {/* 🔴 THESE THREE CARRIED NO MONEY TREATMENT AT ALL — just `text-right`.
                            Every sibling money cell in this file is `font-mono tabular`, which is
                            §M4 (money is mono, figures are tabular); these rendered `formatTzs`
                            output in the body face with proportional digits, so columns of
                            figures did not line up. ⛔ AND IT MADE THEM INVISIBLE TO THE NOWRAP
                            RULE: `.admin-tbl td.tabular` keys on that marker, so `TZS 0` here
                            kept folding onto two lines after the fix for folding money shipped.
                            A cell that is not MARKED as money does not get treated as money. */}
                        <td className="font-mono tabular text-right">{formatTzs(r.pool)}</td>
                        <td className="font-mono tabular text-right">{formatTzs(r.fee)}</td>
                        <td className="font-mono tabular text-right">{formatTzs(r.operatorNet)}</td>
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
              <span className={["font-mono text-micro tracking-[0.10em] uppercase", !tbMeasured ? "text-text-tertiary" : tb.ok ? "text-success" : "text-danger-fg"].join(" ")}>
                {!tbMeasured ? "not measured" : tb.ok ? "✓ reconciles" : "✗ drift detected"}
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
                delta={!tbMeasured ? "no wallets checked" : tb.driftingWallets === 0 ? "all reconcile" : `${formatTzs(tb.totalAbsDrift)} total`}
                deltaDir={!tbMeasured ? "flat" : tb.driftingWallets === 0 ? "up" : "down"}
                pulse={tb.driftingWallets > 0}
              />
              <AdminKpi
                label="Global conservation"
                sw="Uhifadhi wa jumla"
                value={!tbMeasured ? "—" : tb.globalBalanced ? "Σ = 0" : `Σ = ${formatTzs(tb.globalSum)}`}
                delta={!tbMeasured ? "not measured" : tb.globalBalanced ? "balanced" : "NOT balanced"}
                deltaDir={!tbMeasured ? "flat" : tb.globalBalanced ? "up" : "down"}
                pulse={!tb.globalBalanced}
              />
              <AdminKpi
                label="Imbalanced groups"
                sw="Makundi yasiyolingana"
                value={formatNumber(tb.imbalancedGroups.length)}
                deltaDir={!tbMeasured ? "flat" : tb.imbalancedGroups.length === 0 ? "up" : "down"}
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
          {/* 🔴 THESE SUBTITLES NAMED A WINDOW THE CHART DOES NOT PLOT. All three series slice the
              SELECTED range into N buckets — they never plotted 28 or 14 days — so at the 7-day
              default an officer was reading six-hour buckets under the words "28-day daily
              series". `bucketGrain` reports what a bucket actually is, and the subtitle is
              rendered from the live window instead of a remembered number. */}
          <AdminCard title="Net flow over time" sw={`Mtiririko wa pesa · ${range.label} · ${flowGrain.buckets} × ${flowGrain.grain}`}>
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
          <AdminCard title="Operator margin" sw={`Faida ya mfumo · cumulative to date · ${range.label}`}>
            {margins === null ? <AdminLoadError what="the margin series" /> : (
              <AdminAreaChart series={margins} xLabels={margins.map((p) => p.label)} height={240} fillVar="var(--royal)" strokeVar="var(--royal)" />
            )}
          </AdminCard>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <AdminCard
            title="Provider mix over time"
            sw={`Mchanganyiko wa watoa huduma · ${range.label} · ${provGrain.buckets} × ${provGrain.grain}`}
            /* ⛔ A CAPPED VIEW SAYS SO. The stack keeps the five largest providers by deposit
               volume; anything beyond that is named here rather than silently dropped. */
            action={provSeries && provSeries.otherCount > 0 ? (
              <span className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">
                top 5 of {provSeries.providers.length + provSeries.otherCount} by deposit volume
              </span>
            ) : null}
          >
            {provBars === null || providers === null ? <AdminLoadError what="the provider mix" /> : (
              <AdminStackedBars bars={provBars} legend={providers} height={240} />
            )}
          </AdminCard>
          {/* ⛔ THIS ONE IS ALL-TIME AND THE CARD NOW SAYS SO. `topNgrContributors` is a GROUP BY
              over the whole transactions table — it takes no window, by design — yet it sat under
              the page's window filter with an empty state that read "No active players yet in
              this window". Every other card on this tab moves with the picker; this one never
              did, and the copy claimed otherwise. The basis is stated instead of implied. */}
          <AdminCard
            title="Top-10 player concentration"
            sw="Wachezaji 10 wakubwa · all time"
            action={
              <span className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">
                all time · not this window
              </span>
            }
          >
            {top === null ? (
              <AdminLoadError what="the concentration list" />
            ) : top.length === 0 ? (
              <p className="text-caption text-text-tertiary">No player activity recorded yet.</p>
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
