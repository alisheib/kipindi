/**
 * ONE GAME'S BOOK — the arithmetic as a derivation, with the game's OWN frozen rates.
 *
 * ⭐ **THE RECOMPUTE IS A CHECK, AND IT IS DISPLAYED AS A VARIANCE.** The booked fee is what
 * settlement actually wrote. `poolFee()` re-prices the pool from this game's own snapshot; the
 * two agree only while the formula, its rounding and the snapshot fallback all still agree with
 * what the settlement writer did on the day. When they diverge, the honest product is a visible,
 * investigable number — ⛔ never a quietly corrected one, and ⛔ never absorbed by a tolerance.
 *
 * @see src/lib/house-book.ts · src/lib/server/house-ledger.ts
 */
import type { Route } from "next";
import Link from "next/link";
import { AdminPageHead, AdminKpi, AdminCard, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminBody, KpiGrid } from "@/components/admin/admin-body";
import { AdminRestricted } from "@/components/admin/admin-restricted";
import { AdminTableEmpty } from "@/components/admin/admin-table-empty";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { ScrollX } from "@/components/ui/scroll-x";
import { I } from "@/components/ui/glyphs";
import { currentSession } from "@/lib/server/auth-service";
import { canView } from "@/lib/server/rbac";
import { formatTzs, formatTzsCompact, formatNumber, adminCount } from "@/lib/utils";
import { eatDayKey } from "@/lib/eat-day";
import { outcomeWordIn } from "@/lib/side-label";
import { describeFeeModel, poolFee } from "@/lib/payout";
import { ratesFor } from "@/lib/server/market-service";
import { hasOwnSnapshot } from "@/lib/server/market-config";
import { officerLabel } from "@/lib/server/actor-label";
import { marketStore } from "@/lib/server/market-dal";
import { gameBook, reconcile } from "@/lib/house-book";
import { readGameTotals, readGameEntries, countGameEntryLines, readRateChangesBefore } from "@/lib/server/house-ledger";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ marketId: string }> }) {
  const { marketId } = await params;
  // ⚠️ Title garnish only — a failed read here must never decide whether the page renders.
  const meta = await marketStore.bookByIds([marketId]).catch(() => null);
  const title = meta?.get(marketId)?.titleEn;
  return { title: title ? `Admin · House — ${title.slice(0, 50)}` : "Admin · House — one game" };
}

function Amt({ v }: { v: number }) {
  return <span className="amount">{formatTzs(v)}</span>;
}
function Signed({ v }: { v: number }) {
  return <span className="amount">{v > 0 ? "+" : ""}{formatTzs(v)}</span>;
}

export default async function HouseGamePage({
  params, searchParams,
}: {
  params: Promise<{ marketId: string }>;
  searchParams: Promise<{ epage?: string }>;
}) {
  const session = await currentSession();
  if (!session || !(session.role === "ADMIN" || (await canView(session.role, "accounting")))) {
    return <AdminRestricted title="House" sw="Nyumba" need="Admin or Compliance" />;
  }

  const { marketId } = await params;
  const sp = await searchParams;

  const totals = await readGameTotals(marketId).catch(() => null);
  const meta = (await marketStore.bookByIds([marketId]).catch(() => null))?.get(marketId) ?? null;

  const back = (
    <Link href={"/admin/house?tab=games" as Route} className="btn btn-ghost btn-sm rounded-pill inline-flex items-center gap-1.5 admin-focus">
      <I.chevronLeft s={14} />
      Back to the book
    </Link>
  );

  if (totals === null) {
    return (
      <>
        <AdminPageHead title="One game" sw="Mchezo mmoja" actions={back} />
        <AdminBody><AdminLoadError what="this game's ledger" /></AdminBody>
      </>
    );
  }

  /* ⛔ NO `notFound()` WHEN THE MARKET ROW IS GONE BUT THE MONEY IS NOT. 121 of the ledger's
   * marketIds have no market row on production and between them they carry 54,650 of real fees.
   * Telling an owner his money does not exist is a worse failure than an unnamed row. The book
   * renders; the heading says the row is missing. A market with NO ledger rows at all is a
   * different thing and is stated as an empty book, not as a 404 either. */
  const rowMissing = meta === null;
  const title = meta?.titleEn ?? marketId;
  const productLine = meta?.productLine ?? "MARKET";
  const outcome = (meta?.resolvedOutcome as "YES" | "NO" | "VOID" | null) ?? null;

  const g = gameBook({ ...totals, outcome });

  /* ── THE RATES THIS GAME WAS PRICED AT ─────────────────────────────────────────────── */
  const rates = meta ? ratesFor({ feeSnapshot: meta.feeSnapshot }) : null;
  /* ⛔ NOT `stampedAt === "legacy"`. That string is produced by TWO paths — a genuine snapshot
   * that merely predates the `stampedAt` field, and the true fallback — so badging off it would
   * tell the owner a correctly frozen game was never frozen. */
  const own = meta ? hasOwnSnapshot(meta.feeSnapshot) : false;
  const caption = rates ? describeFeeModel(rates).caption : null;

  /* ── THE RECONCILIATION ────────────────────────────────────────────────────────────── */
  /* ⛔ NARROW THE OUTCOME TO A WINNING SIDE BEFORE CALLING `poolFee`. Under
   * `capped-commission` it does not look at the winning side at all — it is
   * `min(commissionRate × pool, ceilingRate × smaller)` — so a VOID market, whose every stake
   * was refunded and which booked nothing, would come back with a real non-zero fee and
   * manufacture a variance on a correct book. `analytics.ts` guards this the same way. */
  const winner = outcome === "YES" || outcome === "NO" ? outcome : null;
  const settled = meta?.settledAt != null;
  const computed = rates && meta && winner && settled
    ? Math.round(poolFee(meta.yesPool, meta.noPool, rates, winner).fee)
    : null;
  /* ⛔ THE SETTLEMENT SLICE ONLY. `poolFee` does not model an early exit, and the early-exit fee
   * is booked per exit against the pool as it stood then — including it would report a variance
   * equal to every cash-out fee the game ever charged. */
  const rec = computed === null ? null : reconcile(totals.settlementFee, computed);

  /* ── THE RATE-CHANGE TRAIL ─────────────────────────────────────────────────────────── */
  /* ⛔ AT OR BEFORE THIS GAME'S SETTLEMENT — a later change cannot have priced it. */
  const changes = await readRateChangesBefore(
    meta?.settledAt ? new Date(meta.settledAt) : new Date(), 8,
  ).catch(() => null);
  const actors = new Map<string, string>();
  for (const c of changes ?? []) {
    if (c.actor && !actors.has(c.actor)) {
      actors.set(c.actor, (await officerLabel(c.actor).catch(() => null)) ?? c.actor);
    }
  }

  /* ── THE EVIDENCE ──────────────────────────────────────────────────────────────────── */
  const lines = await countGameEntryLines(marketId).catch(() => null);
  const epage = parsePage(sp.epage, lines ?? 0);
  const evidence = await readGameEntries(marketId, PER_PAGE, (epage - 1) * PER_PAGE).catch(() => null);
  const evidenceBase = buildBaseHref(`/admin/house/${marketId}`, {}, "epage");

  return (
    <>
      <AdminPageHead
        title={rowMissing ? "One game — market row missing" : "One game"}
        sw="Mchezo mmoja"
        actions={back}
      />
      <AdminBody>
        <AdminCard title={title} sw={rowMissing ? undefined : (productLine === "UPDOWN" ? "Up & Down" : "Poll")}>
          {rowMissing ? (
            <p className="text-body-sm text-text-secondary">
              There is no market row for <span className="font-mono">{marketId}</span> any more —
              it was redacted or removed. Its ledger entries survive untouched, so the money below
              is real and is still counted in the house book. Nothing about it is invented; there
              is simply no title, product or outcome left to show.
            </p>
          ) : (
            <p className="text-body-sm text-text-secondary">
              <span className="font-mono">{marketId}</span> · {meta.status}
              {" · "}
              {outcome === null
                ? "not settled"
                : outcomeWordIn("en", outcome, productLine)}
              {meta.settledAt ? ` · settled ${eatDayKey(Date.parse(meta.settledAt))}` : ""}
            </p>
          )}
        </AdminCard>

        <KpiGrid cols="4">
          {/* ⛔ COMPACT, for the reason recorded on `/admin/house` — `AdminKpi` truncates and
              the kit forbids clipping money. The exact figures are in the table directly below. */}
          <AdminKpi label="Handle" sw="Jumla ya dau" value={formatTzsCompact(g.handle)} delta="real + bonus" deltaDir="flat" />
          <AdminKpi label="Paid out" sw="Kilicholipwa" value={formatTzsCompact(g.paidOut + g.bonusRefunded)} delta="to players" deltaDir="flat" />
          <AdminKpi label="Fee booked" sw="Ada" value={formatTzsCompact(g.feeBooked)} delta="gross, pre-levy" deltaDir="flat" />
          <AdminKpi label="Net retained" sw="Faida halisi" gold value={formatTzsCompact(g.netRetained)} delta="after its levies" deltaDir="flat" />
        </KpiGrid>

        <AdminCard title="The arithmetic" sw="Hesabu">
          <ScrollX label="This game's derivation" className="-mx-4 px-4">
            <table className="admin-tbl min-w-[320px]">
              <thead><tr><th className="text-left">Line</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                <tr><td className="text-left">Real stake into the pool</td><td className="tabular text-right"><Signed v={g.poolIn} /></td></tr>
                <tr><td className="text-left">Bonus stake into the pool</td><td className="tabular text-right"><Signed v={g.bonusIn} /></td></tr>
                <tr><td className="text-left">Paid to players</td><td className="tabular text-right"><Signed v={-g.paidOut} /></td></tr>
                <tr><td className="text-left">Bonus returned to players</td><td className="tabular text-right"><Signed v={-g.bonusRefunded} /></td></tr>
                <tr><td className="text-left">Fee taken</td><td className="tabular text-right"><Signed v={-g.feeBooked} /></td></tr>
                <tr className="font-semibold">
                  <td className="text-left">Left in the pool</td>
                  <td className={["tabular text-right font-semibold", g.closesTo !== 0 && settled ? "text-danger" : ""].join(" ")}>
                    <Amt v={g.closesTo} />
                  </td>
                </tr>
              </tbody>
            </table>
          </ScrollX>
          <p className="mt-3 text-body-sm text-text-secondary">
            {/* ⚠️ A LIVE MARKET HOLDING ITS POOL IS NOT A BROKEN BOOK, and must not be coloured
                like one. A settled market's pool should be empty; an unsettled one's should not. */}
            {settled
              ? g.closesTo === 0
                ? "This game's pool closed to exactly zero — every shilling staked was paid out, refunded or taken as fee."
                : "This game's pool did not close to zero. That is a real disagreement about real money and it is shown rather than absorbed; there is no tolerance here."
              : "This game has not settled, so it is still holding its pool. That is by design, not a discrepancy."}
          </p>
          <p className="mt-2 text-body-sm text-text-subtle">
            Then the levies: <Amt v={g.leviesBooked} /> of the fee went to TRA and GBT, leaving{" "}
            <Amt v={g.netRetained} /> retained.
          </p>
        </AdminCard>

        <AdminCard
          title="Booked against recomputed"
          sw="Iliyoandikwa dhidi ya iliyohesabiwa"
          action={
            rec && (
              <span className={["font-mono text-body-sm", rec.clean ? "text-success" : "text-danger-fg"].join(" ")}>
                {rec.clean ? "agrees exactly" : "disagrees"}
              </span>
            )
          }
        >
          {rec === null || !meta ? (
            <p className="text-body-sm text-text-secondary">
              {/* ⛔ NO RECONCILIATION IS OFFERED WHERE IT WOULD BE MEANINGLESS — a number nobody
                  can act on is worse than no number. Each case says which one applies. */}
              {rowMissing
                ? "There is no market row left, so there are no pools and no frozen rates to re-price against. The booked figures above stand on their own."
                : outcome === "VOID"
                  ? "This game was voided: every stake was refunded and no fee was booked. There is nothing to re-price — and re-pricing it anyway would invent one, because the capped-commission formula ignores the winning side and returns a fee for a market that charged none."
                  : !settled
                    ? "This game has not settled yet, so there is no settlement fee to check."
                    : "The rates for this game could not be resolved, so no recompute was attempted."}
            </p>
          ) : (
            <>
              <ScrollX label="Reconciliation" className="-mx-4 px-4">
                <table className="admin-tbl min-w-[320px]">
                  <thead><tr><th className="text-left">Line</th><th className="text-right">Amount</th></tr></thead>
                  <tbody>
                    <tr><td className="text-left">Settlement fee, as booked</td><td className="tabular text-right"><Amt v={rec.booked} /></td></tr>
                    <tr>
                      <td className="text-left">
                        Re-priced from this game&rsquo;s own rates
                        <span className="block text-text-tertiary">
                          pools {formatTzs(meta.yesPool)} / {formatTzs(meta.noPool)} at {caption}
                        </span>
                      </td>
                      <td className="tabular text-right"><Amt v={rec.computed} /></td>
                    </tr>
                    <tr className="font-semibold">
                      <td className="text-left">Variance</td>
                      <td className={["tabular text-right font-semibold", rec.clean ? "text-success" : "text-danger"].join(" ")}>
                        <Signed v={rec.variance} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </ScrollX>
              {!rec.clean && (
                <p className="mt-3 text-body-sm text-danger-fg">
                  The books and the formula disagree by <Amt v={Math.abs(rec.variance)} />. The
                  booked figure is what actually moved and is the one every total on this platform
                  uses; the recompute is only a check. ⛔ No epsilon absorbs this — an
                  &ldquo;a shilling is fine&rdquo; tolerance is exactly how seven production pools
                  finished negative unnoticed.
                </p>
              )}
              {/* ⛔ THE EARLY-EXIT FEE SITS BESIDE THE RECONCILIATION, NOT INSIDE IT. It is booked
                  per exit against the pool as it stood at that moment, and `poolFee` does not
                  model an early exit at all — folding it in would report a variance on a
                  perfectly correct book. */}
              {totals.earlyExitFee !== 0 && (
                <p className="mt-3 text-body-sm text-text-secondary">
                  This game also charged <Amt v={totals.earlyExitFee} /> in early-exit fees. Those
                  are booked per exit, against the pool as it stood at the time, and the formula
                  above does not model them — so they are counted in the fee total but stay
                  outside this check.
                </p>
              )}
            </>
          )}
        </AdminCard>

        <AdminCard title="Which rate applied, and where it came from" sw="Kiwango kilichotumika">
          {!meta ? (
            <p className="text-body-sm text-text-secondary">
              The market row is gone, so its frozen rates went with it. What was booked is above.
            </p>
          ) : (
            <>
              {/* ⭐ THE TWO ARMS, STATED PLAINLY. Which one applies is decided by the same
                  predicate `snapshotOrLegacy` itself uses, so the badge and the maths cannot
                  disagree — and never by the resolved `stampedAt`, which two paths produce. */}
              <p className="text-body-sm text-text-secondary">
                {own ? (
                  <>
                    This game carries <strong>its own frozen rates</strong>, stamped when it was
                    created. It was priced at <span className="font-mono">{caption}</span>, and a
                    rate change made after it was created did not and cannot move it.
                  </>
                ) : (
                  <>
                    This game has <strong>no frozen rates of its own</strong>{" "}— it predates rate
                    snapshotting. It was therefore priced by the legacy reconstruction,{" "}
                    <span className="font-mono">{caption}</span>, which is what those players were
                    quoted. ⚠️ This is a reconstruction, not a record: it is what the rules say
                    applied, not a rate anyone wrote down at the time.
                  </>
                )}
              </p>
              <p className="mt-3 text-body-sm text-text-subtle">
                Configuration changes recorded at or before this game settled. A change made after
                it settled could not have priced it and is not listed.
              </p>
              {changes === null ? (
                <AdminLoadError what="the configuration history" />
              ) : (
                <ScrollX label="Configuration changes" className="-mx-4 px-4 mt-2">
                  <table className="admin-tbl min-w-[520px]">
                    <thead><tr><th className="text-left">When</th><th className="text-left">Change</th><th className="text-left">By</th><th className="text-left">Touched a rate?</th></tr></thead>
                    <tbody>
                      {changes.map((c, i) => (
                        <tr key={`${c.at}-${i}`}>
                          <td className="text-left whitespace-nowrap">{eatDayKey(new Date(c.at).getTime())}</td>
                          <td className="text-left font-mono">{c.action}</td>
                          <td className="text-left">{c.actor ? actors.get(c.actor) ?? c.actor : "—"}</td>
                          {/* ⛔ THE RAW PAYLOAD IS NEVER RENDERED — it is an unbounded JSON blob
                              that can carry any setting the console holds. Only whether it
                              touched a rate field, which is the question being asked. */}
                          <td className="text-left">
                            {c.payload && /"(commissionRate|feeCeilingRate|cashOutFeeRate|traTaxOnCommissionRate|gbtLevyOnCommissionRate|platformFeeRate|operatorFeeRate)"/.test(c.payload)
                              ? "yes"
                              : <span className="text-text-tertiary">no</span>}
                          </td>
                        </tr>
                      ))}
                      {changes.length === 0 && (
                        <AdminTableEmpty colSpan={4} kind="admin" title="No configuration change on record"
                          body="Nothing was changed at or before this game settled." />
                      )}
                    </tbody>
                  </table>
                </ScrollX>
              )}
            </>
          )}
        </AdminCard>

        <AdminCard
          title="The ledger behind these numbers"
          sw="Daftari lenyewe"
          action={<span className="font-mono text-body-sm text-text-tertiary">{adminCount(totals.entries, "entry", "entries")}</span>}
        >
          {evidence === null || lines === null ? <AdminLoadError what="this game's ledger" /> : (
            <>
              <p className="text-body-sm text-text-subtle mb-3">
                {/* ⛔ NO PER-PLAYER ROWS. The account string IS the user id, and this page is open
                    to FINANCE and AUDITOR; a full dump would be a player-identity list on a
                    revenue page. It is also unreadable — this market alone has{" "}
                    {totals.entries} rows. A person's own ledger belongs on their player page. */}
                House and pool movements in full. Player movements are collapsed to one line per
                kind, with a count — this is the house&rsquo;s book, and a player&rsquo;s own ledger
                belongs on their page.
              </p>
              <ScrollX label="Ledger evidence" className="-mx-4 px-4">
                <table className="admin-tbl min-w-[640px]">
                  <thead><tr><th className="text-left">Account</th><th className="text-left">Kind</th><th className="text-right">Entries</th><th className="text-right">Net</th></tr></thead>
                  <tbody>
                    {evidence.map((r) => (
                      <tr key={`${r.account}-${r.entryType}`}>
                        <td className="text-left font-mono break-all">{r.account}</td>
                        <td className="text-left font-mono">{r.entryType}</td>
                        <td className="tabular text-right text-text-secondary">
                          {formatNumber(r.entries)}
                          {r.aggregated && <span className="block text-text-tertiary">collapsed</span>}
                        </td>
                        <td className="tabular text-right"><Signed v={r.amount} /></td>
                      </tr>
                    ))}
                    {evidence.length === 0 && (
                      <AdminTableEmpty colSpan={4} kind="admin" title="No ledger entries for this game"
                        body="Nothing has moved money against this market. The book is empty, not missing." />
                    )}
                  </tbody>
                </table>
              </ScrollX>
              <AdminPagination total={lines} page={epage} baseHref={evidenceBase} param="epage" />
            </>
          )}
        </AdminCard>
      </AdminBody>
    </>
  );
}
