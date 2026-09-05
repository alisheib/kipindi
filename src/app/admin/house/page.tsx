/**
 * THE HOUSE — the owner's book. Four questions, one page.
 *
 *   what do we hold · what did we make · per game · and which rate applied when
 *
 * ── THE LAW THIS PAGE IS BUILT ON ─────────────────────────────────────────────────────
 *
 * ⭐ **THE LEDGER IS THE TRUTH; A RECOMPUTE IS ONLY A CHECK, SHOWN AS A VARIANCE.** Every
 * figure below is a booked sum read out of `LedgerEntry`. Nothing on this page is derived from
 * a rate — that is what `analytics.ts → settlementFeesByPoll()` does, and it is right only
 * while the formula, its rounding and the snapshot fallback all still agree with what the
 * settlement writer did on the day. The drill-down recomputes ONE fee and displays the
 * disagreement; it never substitutes it.
 *
 * ⛔ **`?? 0` IS BANNED IN THIS FILE.** A failed read must reach the reader as
 * `AdminKpi unavailable` or `AdminLoadError`, never as a fabricated zero — and no guard
 * catches this, so it is a rule kept by hand. A real zero is rendered as the real zero.
 * Where a derived figure has a null input, the figure is not computed at all.
 *
 * ⛔ **MONEY IS `<span className="amount">`, NOT `<Stat money>` AND NOT `<Cash>`.** Those route
 * through the player balance-privacy blur, and the console has no unmask control — an operator
 * who once hid balances in the player app would open the owner's book and read `TZS •••••`
 * with no way out.
 *
 * @see src/lib/house-book.ts · src/lib/server/house-ledger.ts · docs/SESSION-PROMPT-HOUSE-LEDGER.md
 */
import type { Route } from "next";
import Link from "next/link";
import { AdminPageHead, AdminKpi, AdminCard, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminBody, KpiGrid } from "@/components/admin/admin-body";
import { AdminRestricted } from "@/components/admin/admin-restricted";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { DateTimeRangeFilter } from "@/components/ui/datetime-range-filter";
import { FilterPill } from "@/components/ui/filter-pill";
import { Tabs } from "@/components/ui/tabs";
import { ScrollX } from "@/components/ui/scroll-x";
import { currentSession } from "@/lib/server/auth-service";
import { canView } from "@/lib/server/rbac";
import { resolveRange } from "@/lib/server/date-range";
import { formatTzs, formatNumber, adminCount } from "@/lib/utils";
import { eatDayKey } from "@/lib/eat-day";
import { outcomeWordIn } from "@/lib/side-label";
import { describeFeeModel } from "@/lib/payout";
import { ratesFor } from "@/lib/server/market-service";
import { hasOwnSnapshot } from "@/lib/server/market-config";
import { trialBalance } from "@/lib/server/ledger";
import { marketStore } from "@/lib/server/market-dal";
import { getFloatBalanceDetailed } from "@/lib/server/payments";
import { railFloat } from "@/lib/server/selcom-statement";
import { housePosition, gameBook, waterfall, type GameBook } from "@/lib/house-book";
import {
  readHouseAccounts, readCustodialCash, readWaterfall, readGameRows,
  readUnattributedFees, readFeeBySource, readPlayerLiability, readAdjustmentBackedLiability,
} from "@/lib/server/house-ledger";

export const metadata = { title: "Admin · House" };
export const dynamic = "force-dynamic";

/** What each house account actually holds. ⚠️ A key absent here still RENDERS — the note is a
 *  courtesy, not a filter, so an account nobody has described cannot vanish from the panel. */
const ACCOUNT_NOTE: Record<string, string> = {
  "HOUSE:COMMISSION": "our fee: pool + early-exit + withdrawal — already net of the levies",
  "HOUSE:AGGREGATOR": "the payment gateway's share — held, owed to them",
  "HOUSE:TRA_LEVY": "TRA, levied on our commission — held, owed",
  "HOUSE:GBT_LEVY": "GBT, levied on our commission — held, owed",
  "HOUSE:RG_SUSPENSE": "a self-excluded player's deposit — held, owed back",
  "HOUSE:TAX": "RETIRED — historical rows only",
  "HOUSE:RESERVE": "RETIRED — historical rows only",
};

const HOUSE_TABS = ["position", "earnings", "games"] as const;
type HouseTab = (typeof HOUSE_TABS)[number];

type SP = {
  range?: string; from?: string; to?: string; tab?: string; product?: string;
  gpage?: string; epage?: string;
};

/** A money cell. ⛔ `.amount` is the marker `.admin-tbl td.tabular` and §M4 both key on. */
function Amt({ v, className }: { v: number; className?: string }) {
  return <span className={["amount", className ?? ""].join(" ")}>{formatTzs(v)}</span>;
}

/** A signed money cell, so an owner can read a deduction as a deduction. */
function Signed({ v }: { v: number }) {
  return <span className="amount">{v > 0 ? "+" : ""}{formatTzs(v)}</span>;
}

export default async function AdminHousePage({ searchParams }: { searchParams: Promise<SP> }) {
  /* ⛔ THE GATE COMES FIRST, BEFORE ANY MONEY READ. Verbatim from `/admin/finance`: the admin
   * layout gates ADMIN_CONSOLE_ROLES, which INCLUDES MODERATOR, so without this a moderator
   * could read the owner's net retained, his solvency line and his per-game revenue. */
  const session = await currentSession();
  if (!session || !(session.role === "ADMIN" || (await canView(session.role, "accounting")))) {
    return <AdminRestricted title="House" sw="Nyumba" need="Admin or Compliance" />;
  }

  const sp = await searchParams;
  const range = resolveRange(sp, Date.now(), "30d");
  const start = new Date(range.start);
  const end = new Date(range.end);

  const tabRaw = sp.tab ?? "";
  const tab: HouseTab = (HOUSE_TABS as readonly string[]).includes(tabRaw) ? (tabRaw as HouseTab) : "position";
  /* ⛔ THE TAB IS A URL FACT (DG-S-03) — it survives a refresh, a Back and a shared link. The
   * href is built from an explicit object rather than from `sp`, because a param omitted here is
   * a param the rail silently drops. ⚠️ Both pagers are dropped on a tab switch: `gpage` means
   * nothing on EARNINGS and `epage` means nothing on BY GAME. */
  const tabHref = (t: HouseTab) =>
    buildBaseHref("/admin/house", {
      range: sp.range, from: sp.from, to: sp.to, product: sp.product,
      tab: t === "position" ? undefined : t,
    }) as Route;

  /* ── THE READS. Every one fails to `null`, never to 0 or []. ───────────────────────── */
  const accounts = await readHouseAccounts().catch(() => null);
  const cash = await readCustodialCash().catch(() => null);
  const liability = await readPlayerLiability().catch(() => null);
  const adjBacked = await readAdjustmentBackedLiability().catch(() => null);
  const wRead = await readWaterfall(start, end).catch(() => null);
  const gameRows = await readGameRows(start, end).catch(() => null);
  const unattributed = await readUnattributedFees(start, end).catch(() => null);
  const feeBySource = await readFeeBySource(start, end).catch(() => null);
  const tb = await trialBalance().catch(() => null);

  /* ⭐ EVERY INPUT OR NOTHING. `housePosition` is an identity between four reads; computing it
   * with a missing one would print a confident figure built on an invented zero. A-5. */
  const position = accounts && cash && liability !== null && adjBacked !== null
    ? housePosition({
        accounts,
        playerLiability: liability,
        // ⛔ `railBacked`, not `total`: EXTERNAL:INTERNAL never crossed a payment boundary,
        // so counting it as cash held would offset a liability with money that never arrived.
        custodialCash: cash.railBacked,
        adjustmentBackedLiability: adjBacked,
      })
    : null;
  const flow = wRead ? waterfall(wRead) : null;

  /* ── THE JOIN. The LEDGER is the left side; the market table only supplies names. ──── */
  const ids = (gameRows ?? []).map((r) => r.marketId);
  const meta = gameRows ? await marketStore.bookByIds(ids).catch(() => null) : null;
  type Row = GameBook & {
    title: string | null;
    productLine: "MARKET" | "UPDOWN";
    settledAt: string | null;
    rateCaption: string | null;
    ownSnapshot: boolean;
  };
  const rows: Row[] | null = gameRows && meta
    ? gameRows.map((r) => {
        const m = meta.get(r.marketId);
        /* ⛔ A MISSING MARKET ROW IS RENDERED, NOT DROPPED. On production 121 of the ledger's
         * marketIds have no market row (the purge ceremony redacts, and a 2026-07/08 teardown
         * deleted some outright) and between them they carry 54,650 of real fees — one of them
         * is the SECOND-largest earner in the whole book. Dropping them would break the
         * reconciliation identity below by exactly that much, silently. */
        const rates = m ? ratesFor({ feeSnapshot: m.feeSnapshot }) : null;
        return {
          ...gameBook({
            ...r,
            // ⛔ Never a literal. `null` is a real arm — see `GameBookInput.outcome`.
            outcome: (m?.resolvedOutcome as "YES" | "NO" | "VOID" | null) ?? null,
          }),
          title: m?.titleEn ?? null,
          productLine: m?.productLine ?? "MARKET",
          settledAt: m?.settledAt ?? null,
          /* ⛔ THE CAPTION IS DESCRIBED, NEVER HAND-WRITTEN. A recorded defect on this
           * platform hard-coded a caption beside a number from a DIFFERENT fee model —
           * a correct figure under a retired law. `describeFeeModel` is the one author. */
          rateCaption: rates ? describeFeeModel(rates).caption : null,
          /* ⛔ NOT `stampedAt === "legacy"` — that string comes from two different facts and
           * would label a genuinely-frozen game as un-frozen. See `hasOwnSnapshot`. */
          ownSnapshot: m ? hasOwnSnapshot(m.feeSnapshot) : false,
        };
      })
    : null;

  /* ⭐ THE RECONCILIATION, AS LIVE ARITHMETIC. Withdrawal fees carry NO `marketId` — a
   * withdrawal is not a game — so the per-game column can never equal the house column. The
   * honest product is to state the gap and show the two sides adding up. Measured on
   * production 2026-09-05: 366,371 + 760 = 367,131, variance 0. */
  /* ⛔ ONE OBJECT OR NOTHING — and this is not style. Carrying the variance as a nullable
   * number meant rendering it as `variance ?? 0`, which prints "TZS 0 · the books reconcile"
   * on a window where the check could not be RUN AT ALL. That is the exact A-5 failure this
   * page is written against, and it survived review until a structural guard read the file. */
  const recon = rows !== null && unattributed !== null && flow !== null
    ? (() => {
        const perGameFee = rows.reduce((s, r) => s + r.feeBooked, 0);
        return { perGameFee, unattributed, houseFee: flow.feeEarned, variance: perGameFee + unattributed.total - flow.feeEarned };
      })()
    : null;

  /* Per-product subtotals over the UNFILTERED set — always. A filter narrows what is
   * rendered, never what is summed, or the subtotals would agree only with themselves. */
  const byProduct = rows
    ? (["MARKET", "UPDOWN"] as const).map((pl) => {
        const set = rows.filter((r) => r.productLine === pl);
        return {
          pl,
          n: set.length,
          fee: set.reduce((s, r) => s + r.feeBooked, 0),
          net: set.reduce((s, r) => s + r.netRetained, 0),
          handle: set.reduce((s, r) => s + r.handle, 0),
        };
      })
    : null;

  const product = sp.product === "MARKET" || sp.product === "UPDOWN" ? sp.product : null;
  const shown = rows ? (product ? rows.filter((r) => r.productLine === product) : rows) : null;
  const sorted = shown ? [...shown].sort((a, b) => b.netRetained - a.netRetained) : null;
  const gpage = parsePage(sp.gpage, sorted?.length ?? 0);
  const gameSlice = (sorted ?? []).slice((gpage - 1) * PER_PAGE, gpage * PER_PAGE);
  const gameBase = buildBaseHref("/admin/house", { range: sp.range, from: sp.from, to: sp.to, tab: sp.tab, product: sp.product }, "gpage");
  const productHref = (p: "MARKET" | "UPDOWN" | null) =>
    buildBaseHref("/admin/house", { range: sp.range, from: sp.from, to: sp.to, tab: sp.tab, product: p ?? undefined }, "gpage");

  const epage = parsePage(sp.epage, feeBySource?.length ?? 0);
  const feeSlice = (feeBySource ?? []).slice((epage - 1) * PER_PAGE, epage * PER_PAGE);
  const feeBase = buildBaseHref("/admin/house", { range: sp.range, from: sp.from, to: sp.to, tab: sp.tab, product: sp.product }, "epage");

  /* ⭐ THE ONLY `rail`-SOURCED FIGURE ON THE PAGE, and it is minted through `railFloat` so its
   * provenance travels with it. ⛔ Never summed with a ledger figure: the Selcom float is the
   * DISBURSEMENT account alone, deposits never touch it, and Selcom publishes no collections
   * balance at all. On failure it prints the REASON — never a zero, and never a ledger number
   * under a rail heading. */
  const floatDetail = await getFloatBalanceDetailed().catch(() => null);
  const float = railFloat(floatDetail?.balance?.balance ?? null);
  const floatReason = floatDetail?.reason ?? null;

  return (
    <>
      <AdminPageHead
        title="House"
        sw="Nyumba"
        actions={
          <DateTimeRangeFilter rank="dense" defaultPreset="30d" presetIds={["today", "yesterday", "7d", "28d", "30d", "mtd", "qtd", "all"]} />
        }
      />

      <AdminBody>
        {/* ⭐ §K RULE 7d — A TAB MAY HIDE A DETAIL, NEVER A STATE. The two KPI bands and the
            out-of-balance banner sit ABOVE the rail on every tab: what we hold and whether the
            books balance are the frame the rest of the page is read against, not a section of
            it. Hiding the solvency line behind a tab is how an owner stops seeing it. */}
        <KpiGrid cols="4">
          <AdminKpi label="Net retained" sw="Faida halisi" gold
            value={position ? formatTzs(position.netRetained) : ""} unavailable={position === null}
            delta="the commission balance — levies already out" deltaDir="flat" />
          <AdminKpi label="Gross fee earned" sw="Ada jumla"
            value={position ? formatTzs(position.grossFeeEarned) : ""} unavailable={position === null}
            delta="before the levies came out" deltaDir="flat" />
          <AdminKpi label="Levies payable" sw="Kodi za kulipa"
            value={position ? formatTzs(position.leviesPayable) : ""} unavailable={position === null}
            delta="TRA + GBT — held, owed" deltaDir="flat" />
          <AdminKpi label="Gateway payable" sw="Ada ya lango"
            value={position ? formatTzs(position.aggregatorPayable) : ""} unavailable={position === null}
            delta="held, owed to the gateway" deltaDir="flat" />
        </KpiGrid>
        <KpiGrid cols="4">
          <AdminKpi label="Custodial cash" sw="Fedha tulizonazo"
            value={cash ? formatTzs(cash.railBacked) : ""} unavailable={cash === null}
            delta="ledger view, through a payment rail" deltaDir="flat" />
          <AdminKpi label="Player liability" sw="Tunachodaiwa"
            value={liability === null ? "" : formatTzs(liability)} unavailable={liability === null}
            delta={position ? `${formatTzs(position.playerLiabilityAdjusted)} admin-credited` : undefined}
            deltaDir="flat" />
          {/* ⭐ BOTH FREE-CASH TILES ALWAYS RENDER AND NEITHER REPLACES THE OTHER. The strict
              line is arithmetically correct and is never softened; on its own it currently
              reads about minus nineteen million, because the liability is seeded ADJUSTMENT
              money with no deposit behind it. ⛔ A false alarm is as serious as a missed one —
              an owner who learns this line cries wolf stops reading it, and then it cannot
              warn him on the day it matters. So the explanation ships BESIDE the alarm. */}
          <AdminKpi label="Free house cash — strict" sw="Fedha huru"
            value={position ? formatTzs(position.freeHouseCash) : ""} unavailable={position === null}
            tone={position && position.freeHouseCash < 0 ? "danger" : undefined}
            delta="cash − everything owed" deltaDir="flat" />
          <AdminKpi label="Free cash — ex-adjustments" sw="Bila marekebisho"
            value={position ? formatTzs(position.freeHouseCashExAdjustments) : ""} unavailable={position === null}
            delta="if only funded balances were owed" deltaDir="flat" />
        </KpiGrid>

        <p className="text-body-sm text-text-subtle">
          Balances are as of this moment and are not filtered by the date window — a balance has
          no window. The window ({range.label}) scopes the <strong>Earnings</strong> and{" "}
          <strong>By game</strong> tabs only.{" "}
          {position && position.freeHouseCash < 0 && position.playerLiabilityAdjusted > 0 && (
            <>
              The strict line is negative because{" "}
              <span className="amount">{formatTzs(position.playerLiabilityAdjusted)}</span> of what
              we owe players was credited by an admin with no deposit behind it. Both figures are
              shown; neither stands in for the other.
            </>
          )}
        </p>

        {tb && !tb.ok && (
          <AdminCard
            title="The books do not balance"
            sw="Daftari halilingani"
            className="border-danger-border bg-danger-bg"
            action={<span className="font-mono text-body-sm text-danger-fg">drift detected</span>}
          >
            <p className="text-body-sm text-text-secondary">
              {adminCount(tb.driftingWallets, "wallet")} disagree with the ledger by{" "}
              <span className="amount">{formatTzs(tb.totalAbsDrift)}</span> in total
              {tb.globalBalanced ? "" : `, and the global sum is ${formatTzs(tb.globalSum)} rather than zero`}
              {tb.imbalancedGroups.length > 0 ? `, across ${adminCount(tb.imbalancedGroups.length, "imbalanced group")}` : ""}.
              Every figure on this page is read from those same books.{" "}
              <Link href={"/admin/finance?tab=ledger" as Route} className="underline">
                The per-wallet drift table is on Finance
              </Link>.
            </p>
          </AdminCard>
        )}

        <Tabs
          variant="line"
          value={tab}
          ariaLabel="House sections"
          tabs={[
            { value: "position", labelEn: "Position", href: tabHref("position") },
            { value: "earnings", labelEn: "Earnings", href: tabHref("earnings") },
            { value: "games", labelEn: "By game", href: tabHref("games") },
          ]}
        />

        {/* ═══ TAB 1 · POSITION — what do we hold, right now ═══════════════════════════ */}
        {tab === "position" && (<>
          <AdminCard
            title="Selcom payout float"
            sw="Salio la malipo"
            action={<span className="font-mono text-body-sm text-text-tertiary">read from the rail, not the ledger</span>}
          >
            {/* ⛔ A RAIL FIGURE AND A LEDGER FIGURE ARE NEVER SUMMED AND NEVER SHARE A HEADING.
                This is the disbursement account alone: deposits never touch it and Selcom
                publishes no collections balance at all. It answers "can we pay a withdrawal
                today?" — nothing else — and it is never added to the position above. */}
            {float.available ? (
              <p className="text-title-sm text-text"><span className="amount">{formatTzs(float.balance)}</span></p>
            ) : (
              /* ⛔ THE REASON, NEVER A ZERO. `selcomFloatBalanceDetailed` distinguishes five
                 failures — PIN missing, network, HTTP error, rejected, unparseable — and on
                 2026-07-29 collapsing them to a bare null made an operator read "Selcom refused
                 our IP" as "the PIN is missing" while a real payout stalled. */
              <p className="text-body-sm text-text-secondary">
                Unavailable — {floatReason ?? float.reason}
              </p>
            )}
            <p className="mt-2 text-body-sm text-text-subtle">
              This is what the payout rail can disburse now. It is not a bank balance, it is not
              custodial cash, and it is never added to either.
            </p>
          </AdminCard>

          <AdminCard title="House accounts" sw="Akaunti za nyumba"
            action={<span className="font-mono text-body-sm text-text-tertiary">summed from ledger entries</span>}>
            {accounts === null ? <AdminLoadError what="the house accounts" /> : (
              <ScrollX label="House accounts" className="-mx-4 px-4">
                <table className="admin-tbl min-w-[560px]">
                  <thead>
                    <tr><th className="text-left">Account</th><th className="text-left">What it holds</th><th className="text-right">Balance</th></tr>
                  </thead>
                  <tbody>
                    {/* ⛔ EVERY `HOUSE:%` ACCOUNT, read as a group. A named list forgets an
                        account it has never heard of — which is how RG suspense and the two
                        retired accounts would have gone missing from the owner's own book. */}
                    {Object.entries(accounts.all).map(([acct, amount]) => (
                      <tr key={acct}>
                        <td className="text-left font-mono whitespace-nowrap">{acct}</td>
                        <td className="text-left text-text-secondary">{ACCOUNT_NOTE[acct] ?? "—"}</td>
                        <td className="tabular text-right"><Amt v={amount} /></td>
                      </tr>
                    ))}
                    {Object.keys(accounts.all).length === 0 && (
                      <AdminTableEmpty colSpan={3} kind="admin" title="No ledger entries yet"
                        body="This panel shows real balances only. It stays empty rather than show a number we cannot substantiate." />
                    )}
                  </tbody>
                </table>
              </ScrollX>
            )}
          </AdminCard>

          <AdminCard title="Custodial cash, by counterparty" sw="Fedha kwa mtoa huduma">
            {cash === null ? <AdminLoadError what="custodial cash" /> : (
              <ScrollX label="Custodial cash by counterparty" className="-mx-4 px-4">
                <table className="admin-tbl min-w-[480px]">
                  <thead><tr><th className="text-left">Counterparty</th><th className="text-right">Cash held</th></tr></thead>
                  <tbody>
                    {cash.byAccount.map((r) => (
                      <tr key={r.account}>
                        <td className="text-left font-mono whitespace-nowrap">
                          {r.account}
                          {/* ⛔ THE SYNTHETIC COUNTERPARTY GETS ITS OWN LABEL. `acct.external()`
                              falls back to INTERNAL when no provider is given, so money booked
                              there never crossed a payment boundary at all. */}
                          {r.account === "EXTERNAL:INTERNAL" && (
                            <span className="ml-2 text-text-tertiary">no rail — booked without a provider</span>
                          )}
                        </td>
                        <td className="tabular text-right"><Amt v={r.cashHeld} /></td>
                      </tr>
                    ))}
                    {cash.byAccount.length === 0 && (
                      <AdminTableEmpty colSpan={2} kind="admin" title="No external movements"
                        body="No money has crossed a payment rail in either direction." />
                    )}
                  </tbody>
                </table>
              </ScrollX>
            )}
            {cash && cash.total !== cash.railBacked && (
              <p className="mt-2 text-body-sm text-text-subtle">
                The position above uses <span className="amount">{formatTzs(cash.railBacked)}</span> —
                cash that actually arrived through a rail. Including the internal counterparty
                would give <span className="amount">{formatTzs(cash.total)}</span>, which counts
                money that never crossed a payment boundary.
              </p>
            )}
          </AdminCard>

          <AdminCard title="How the position is derived" sw="Hesabu yenyewe">
            {position === null || cash === null ? <AdminLoadError what="the position" /> : (
              <>
                <ScrollX label="Position derivation" className="-mx-4 px-4">
                  <table className="admin-tbl min-w-[520px]">
                    <thead><tr><th className="text-left">Line</th><th className="text-right">Amount</th></tr></thead>
                    <tbody>
                      <tr><td className="text-left">Custodial cash (through a rail)</td><td className="tabular text-right"><Signed v={cash.railBacked} /></td></tr>
                      <tr><td className="text-left">Owed to players</td><td className="tabular text-right"><Signed v={-position.playerLiability} /></td></tr>
                      <tr><td className="text-left">Owed to TRA and GBT</td><td className="tabular text-right"><Signed v={-position.leviesPayable} /></td></tr>
                      <tr><td className="text-left">Owed to the payment gateway</td><td className="tabular text-right"><Signed v={-position.aggregatorPayable} /></td></tr>
                      <tr><td className="text-left">Held for a self-excluded player</td><td className="tabular text-right"><Signed v={-position.rgSuspensePayable} /></td></tr>
                      <tr>
                        <td className="text-left font-semibold">Free house cash — strict</td>
                        <td className={["tabular text-right font-semibold", position.freeHouseCash < 0 ? "text-danger" : ""].join(" ")}>
                          <Amt v={position.freeHouseCash} />
                        </td>
                      </tr>
                      <tr>
                        <td className="text-left font-semibold">Free house cash — ex-adjustments</td>
                        <td className="tabular text-right font-semibold"><Amt v={position.freeHouseCashExAdjustments} /></td>
                      </tr>
                    </tbody>
                  </table>
                </ScrollX>
                <p className="mt-3 text-body-sm text-text-secondary">
                  The strict line is the honest arithmetic and is never softened. The
                  ex-adjustments line removes the{" "}
                  <span className="amount">{formatTzs(position.playerLiabilityAdjusted)}</span> of
                  player balances an admin credited without a deposit behind them, leaving{" "}
                  <span className="amount">{formatTzs(position.playerLiabilityFunded)}</span> that
                  real money funded. Both are shown because a solvency line that cries wolf stops
                  being read, and one that is quietly flattered stops being true.
                </p>
              </>
            )}
          </AdminCard>

          <AdminCard title="Do the books prove themselves?" sw="Je, daftari linajithibitisha?"
            action={
              <span className={["font-mono text-body-sm", tb === null ? "text-text-tertiary" : tb.ok ? "text-success" : "text-danger-fg"].join(" ")}>
                {tb === null ? "unavailable" : tb.ok ? "reconciles" : "drift detected"}
              </span>
            }>
            {tb === null ? <AdminLoadError what="the trial balance" /> : (
              <p className="text-body-sm text-text-secondary">
                {formatNumber(tb.checkedWallets)} wallets checked against the ledger;{" "}
                {tb.driftingWallets === 0 ? "every one reconciles" : `${adminCount(tb.driftingWallets, "wallet")} drift`}.
                Global conservation {tb.globalBalanced ? "holds" : `is off by ${formatTzs(tb.globalSum)}`}.{" "}
                {/* ⛔ The per-wallet drift table lives on Finance and stays there — one home per
                    surface. This page links to it rather than growing a second copy. */}
                <Link href={"/admin/finance?tab=ledger" as Route} className="underline">
                  The per-wallet drift table is on Finance
                </Link>.
              </p>
            )}
          </AdminCard>
        </>)}

        {/* ═══ TAB 2 · EARNINGS — what did we make, in this window ═════════════════════ */}
        {tab === "earnings" && (<>
          <AdminCard title={`What we made · ${range.label}`} sw="Tulichopata"
            action={<span className="font-mono text-body-sm text-text-tertiary">every step is a booked sum</span>}>
            {flow === null ? <AdminLoadError what="the earnings waterfall" /> : (
              <>
                <ScrollX label="Earnings waterfall" className="-mx-4 px-4">
                  <table className="admin-tbl min-w-[560px]">
                    <thead><tr><th className="text-left">Step</th><th className="text-left">What it is</th><th className="text-right">Amount</th></tr></thead>
                    <tbody>
                      <tr><td className="text-left">Handle — real stake</td><td className="text-left text-text-secondary">money staked into pools</td><td className="tabular text-right"><Amt v={flow.stakeIn} /></td></tr>
                      {/* ⛔ THE BONUS LEG STAYS ITS OWN LINE. It is real turnover and it is not
                          real cash; collapsing the two would report promotional stake as money
                          that came in. It is also why a bonus-funded game's book can close. */}
                      <tr><td className="text-left">Handle — bonus stake</td><td className="text-left text-text-secondary">turnover, but not cash we received</td><td className="tabular text-right"><Amt v={flow.bonusIn} /></td></tr>
                      <tr><td className="text-left">Winnings paid</td><td className="text-left text-text-secondary">payouts, refunds and cash-outs to players</td><td className="tabular text-right"><Signed v={-flow.winningsPaid} /></td></tr>
                      <tr className="font-semibold"><td className="text-left">Gross gaming revenue</td><td className="text-left text-text-secondary">handle minus winnings paid</td><td className="tabular text-right"><Amt v={flow.ggr} /></td></tr>
                      <tr><td className="text-left">Fee earned</td><td className="text-left text-text-secondary">what we actually charged, gross</td><td className="tabular text-right"><Amt v={flow.feeEarned} /></td></tr>
                      <tr><td className="text-left">Levies</td><td className="text-left text-text-secondary">TRA + GBT, taken out of our fee</td><td className="tabular text-right"><Signed v={-flow.leviesOut} /></td></tr>
                      {/* ⛔ BONUS COST IS ITS OWN STEP, NEVER NETTED INTO GGR — netting it there
                          would flatter the gaming result with money that left the platform. */}
                      <tr><td className="text-left">Bonus cost</td><td className="text-left text-text-secondary">bonus that became withdrawable cash, net of re-locks</td><td className="tabular text-right"><Signed v={-flow.bonusCost} /></td></tr>
                      <tr className="font-semibold"><td className="text-left">Net retained</td><td className="text-left text-text-secondary">what this window left the owner</td><td className="tabular text-right"><Amt v={flow.netRetained} /></td></tr>
                    </tbody>
                  </table>
                </ScrollX>
                {/* ⭐ THE GATEWAY IS A PASS-THROUGH, OUTSIDE THE SUBTRACTION — this is the
                    defect this page shipped with. `withdrawalEntries` credits the gateway's
                    share STRAIGHT to its own account and only the remainder ever reaches
                    HOUSE:COMMISSION, so it was never inside "fee earned" to be taken out. */}
                <p className="mt-3 text-body-sm text-text-secondary">
                  The payment gateway took{" "}
                  <span className="amount">{formatTzs(flow.aggregatorOut)}</span> in this window.
                  It is <strong>not</strong> subtracted above: it is charged to the player at
                  withdrawal and credited straight to the gateway&rsquo;s own account, so it never
                  passed through our fee. Subtracting it here would charge the owner for it twice.
                </p>
              </>
            )}
          </AdminCard>

          <AdminCard title="Fee earned, by source" sw="Ada kwa chanzo">
            {feeBySource === null ? <AdminLoadError what="the fee breakdown" /> : (
              <>
                <ScrollX label="Fee earned by source" className="-mx-4 px-4">
                  <table className="admin-tbl min-w-[480px]">
                    <thead><tr><th className="text-left">Source</th><th className="text-right">Entries</th><th className="text-right">Fee</th></tr></thead>
                    <tbody>
                      {/* ⛔ NOTHING IS ENUMERATED HERE. Whatever entry types the books return are
                          the rows — so a retired type keeps being counted and a new one appears
                          without an edit. A hard-coded list would have shown a confident,
                          permanent zero for early-exit fees, which have never yet been booked. */}
                      {feeSlice.map((r) => (
                        <tr key={r.entryType}>
                          <td className="text-left font-mono whitespace-nowrap">{r.entryType}</td>
                          <td className="tabular text-right text-text-secondary">{formatNumber(r.entries)}</td>
                          <td className="tabular text-right"><Amt v={r.amount} /></td>
                        </tr>
                      ))}
                      {feeBySource.length === 0 && (
                        <AdminTableEmpty colSpan={3} kind="admin" title="No fee booked in this window"
                          body="Nothing was charged between these dates. Widen the window to see earlier activity." />
                      )}
                    </tbody>
                  </table>
                </ScrollX>
                <AdminPagination total={feeBySource.length} page={epage} baseHref={feeBase} param="epage" />
              </>
            )}
          </AdminCard>
        </>)}

        {/* ═══ TAB 3 · BY GAME — per game, and which rate applied ══════════════════════ */}
        {tab === "games" && (<>
          {/* ⛔ THE RECONCILIATION NOTE IS THE FIRST CARD, BEFORE ANY TOTAL. An owner who reads
              the per-game total first and the explanation second has already been misled once. */}
          <AdminCard title="Why this table does not add up to the fee above" sw="Kwa nini hazilingani">
            {recon === null ? (
              <AdminLoadError what="the reconciliation" />
            ) : (
              <>
                <p className="text-body-sm text-text-secondary mb-3">
                  A withdrawal is not a game, so the fee we charge on one carries no market
                  against it. Those shillings are real revenue and appear in{" "}
                  <strong>Earnings</strong>, but they cannot appear in a per-game table. The two
                  sides are shown adding up rather than left to disagree.
                </p>
                <ScrollX label="Per-game reconciliation" className="-mx-4 px-4">
                  <table className="admin-tbl min-w-[520px]">
                    <thead><tr><th className="text-left">Line</th><th className="text-right">Amount</th></tr></thead>
                    <tbody>
                      <tr><td className="text-left">Fee attributed to a game</td><td className="tabular text-right"><Amt v={recon.perGameFee} /></td></tr>
                      {recon.unattributed.byType.map((t) => (
                        <tr key={t.entryType}>
                          <td className="text-left">Fee with no game — {t.entryType} ({adminCount(t.entries, "entry", "entries")})</td>
                          <td className="tabular text-right"><Amt v={t.amount} /></td>
                        </tr>
                      ))}
                      {recon.unattributed.byType.length === 0 && (
                        <tr><td className="text-left text-text-secondary">Fee with no game</td><td className="tabular text-right"><Amt v={0} /></td></tr>
                      )}
                      <tr><td className="text-left">Fee on the house account</td><td className="tabular text-right"><Signed v={-recon.houseFee} /></td></tr>
                      <tr className="font-semibold">
                        <td className="text-left">Variance — must be zero</td>
                        <td className={["tabular text-right font-semibold", recon.variance !== 0 ? "text-danger" : "text-success"].join(" ")}>
                          <Amt v={recon.variance} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </ScrollX>
                {recon.variance !== 0 && (
                  <p className="mt-3 text-body-sm text-danger-fg">
                    These do not reconcile. Fee is being booked somewhere this page does not
                    read, or a market row moved underneath it. The figure is shown rather than
                    absorbed — there is no tolerance here on purpose.
                  </p>
                )}
              </>
            )}
          </AdminCard>

          <AdminCard title="By product" sw="Kwa bidhaa">
            {byProduct === null ? <AdminLoadError what="the product subtotals" /> : (
              <ScrollX label="Subtotals by product" className="-mx-4 px-4">
                <table className="admin-tbl min-w-[560px]">
                  <thead><tr><th className="text-left">Product</th><th className="text-right">Games</th><th className="text-right">Handle</th><th className="text-right">Fee</th><th className="text-right">Net retained</th></tr></thead>
                  <tbody>
                    {/* ⚠️ These are over the WHOLE window, never the filtered view. A subtotal
                        that moved with the filter would only ever agree with itself. */}
                    {byProduct.map((p) => (
                      <tr key={p.pl}>
                        <td className="text-left">{p.pl === "UPDOWN" ? "Up & Down" : "Polls"}</td>
                        <td className="tabular text-right text-text-secondary">{formatNumber(p.n)}</td>
                        <td className="tabular text-right"><Amt v={p.handle} /></td>
                        <td className="tabular text-right"><Amt v={p.fee} /></td>
                        <td className="tabular text-right font-semibold"><Amt v={p.net} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollX>
            )}
          </AdminCard>

          <AdminCard
            title={`Games that moved money · ${range.label}`}
            sw="Michezo iliyosogeza pesa"
            action={
              /* ⚠️ THE HEADING IS THE HONEST ONE. The window is ENTRY-TIME, not settlement-time:
                 a market appears here because its LEDGER ROWS fall in the window, so a live
                 poll that took an early exit is listed and a game settled today whose stakes
                 were placed last month may not be. */
              <div data-filter-rail className="flex flex-wrap items-center gap-2">
                <FilterPill href={productHref(null)} label="All" on={product === null} rank="dense" semantics="tab" testId="product:all" />
                <FilterPill href={productHref("MARKET")} label="Polls" on={product === "MARKET"} rank="dense" semantics="tab" testId="product:MARKET" />
                <FilterPill href={productHref("UPDOWN")} label="Up & Down" on={product === "UPDOWN"} rank="dense" semantics="tab" testId="product:UPDOWN" />
              </div>
            }
          >
            {rows === null ? <AdminLoadError what="the per-game book" /> : (
              <>
                <p className="text-body-sm text-text-subtle mb-3">
                  A game is listed because its ledger entries fall inside this window, not because
                  it settled inside it. A game still running shows the pool it is holding.
                  {product !== null && <> The filter narrows what is listed; the subtotals above stay whole.</>}
                </p>
                <ScrollX label="Games that moved money" className="-mx-4 px-4">
                  <table className="admin-tbl min-w-[1080px]">
                    <thead>
                      <tr>
                        <th className="text-left">Game</th>
                        <th className="text-left">Product</th>
                        <th className="text-left">Outcome</th>
                        <th className="text-left">Settled</th>
                        <th className="text-right">Pool in</th>
                        <th className="text-right">Paid out</th>
                        <th className="text-right">Fee</th>
                        <th className="text-right">Levies</th>
                        <th className="text-right">Net retained</th>
                        <th className="text-left">Rate applied</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gameSlice.map((r) => (
                        <tr key={r.marketId}>
                          <td className="text-left max-w-[260px]">
                            <Link href={`/admin/house/${r.marketId}` as Route} className="underline" title={r.title ?? r.marketId}>
                              {/* ⛔ A MISSING MARKET ROW IS LABELLED AND KEPT, WITH ITS RAW ID.
                                  Dropping it would hide real money and break the identity above. */}
                              {r.title ? <span className="block truncate">{r.title}</span>
                                : <span className="font-mono">{r.marketId}</span>}
                            </Link>
                            {!r.title && <span className="block text-text-tertiary">market row missing — the money is still ours</span>}
                          </td>
                          <td className="text-left whitespace-nowrap">{r.productLine === "UPDOWN" ? "Up & Down" : "Poll"}</td>
                          <td className="text-left whitespace-nowrap">
                            {/* ⛔ THE WORD COMES FROM THE LEXICON AND IS PRODUCT-AWARE. Up & Down
                                stores YES/NO and a reader must see Up and Down; a VOID is never
                                any of the four. This is a mixed book, so the product matters. */}
                            {r.outcome === null
                              ? <span className="text-text-tertiary">not settled</span>
                              : <>{outcomeWordIn("en", r.outcome, r.productLine)}{r.noFee && <span className="text-text-tertiary"> · no fee</span>}</>}
                          </td>
                          <td className="text-left whitespace-nowrap">{r.settledAt ? eatDayKey(Date.parse(r.settledAt)) : "—"}</td>
                          <td className="tabular text-right"><Amt v={r.handle} /></td>
                          <td className="tabular text-right"><Amt v={r.paidOut + r.bonusRefunded} /></td>
                          <td className="tabular text-right"><Amt v={r.feeBooked} /></td>
                          <td className="tabular text-right text-text-secondary"><Amt v={r.leviesBooked} /></td>
                          <td className="tabular text-right font-semibold"><Amt v={r.netRetained} /></td>
                          <td className="text-left whitespace-nowrap">
                            {/* ⛔ DESCRIBED, NEVER HAND-WRITTEN — and the legacy marker is a
                                SEPARATE element, because the caption has a measured 17-character
                                budget it must not be pushed past. */}
                            {r.rateCaption === null ? <span className="text-text-tertiary">—</span> : (
                              <>
                                <span className="font-mono">{r.rateCaption}</span>
                                {!r.ownSnapshot && <span className="block text-text-tertiary">legacy — reconstructed</span>}
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                      {sorted !== null && sorted.length === 0 && (
                        <AdminTableEmpty colSpan={10} kind="admin" title="No game moved money in this window"
                          body="Widen the date window, or clear the product filter, to see earlier activity." />
                      )}
                    </tbody>
                  </table>
                </ScrollX>
                <AdminPagination total={sorted?.length ?? 0} page={gpage} baseHref={gameBase} param="gpage" />
              </>
            )}
          </AdminCard>
        </>)}
      </AdminBody>
    </>
  );
}
