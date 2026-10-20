import Link from "next/link";
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminBody, KpiGrid } from "@/components/admin/admin-body";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollX } from "@/components/ui/scroll-x";
import { ControlLocked } from "@/components/admin/control-locked";
import { currentSession } from "@/lib/server/auth-service";
import { canUseControl, CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { AdminPagination, buildBaseHref, parsePage } from "@/components/admin/admin-pagination";
import { parseSort, SortTh } from "@/components/admin/admin-sort";
import { Button } from "@/components/ui/button";
import { FilterPill } from "@/components/ui/filter-pill";
import { Input } from "@/components/ui/input";
import { CONSOLE_PER_PAGE, consoleStanding, poolsView } from "@/lib/server/maswali-console";
import { readMillioneaSwitchFresh } from "@/lib/server/millionea-switch";
import { weekStore } from "@/lib/server/maswali-dal";
import { formatTzs } from "@/lib/utils";
import { fmtEat, weekStateChip } from "@/lib/maswali-admin-format";
import { openState, poolsLine, poolsSearchParams, queryOpenWeeks, queryRolloverTrail, type OpenSort, type TrailSort } from "@/lib/maswali-admin-pools-query";
import { GuaranteeCeremony, LicenceCeremony, ReleaseControl, RolloutCeremony, SunsetCeremony } from "./pools-controls";

export const metadata = { title: "Admin · Millionea · Pools" };
export const dynamic = "force-dynamic";

const money = (v: number | null) => (v === null ? "Unreadable" : formatTzs(v));

/**
 * /admin/maswali/pools — ACCOUNTING's page (MASWALI-BUILD S4; MASWALI-PLAN §7b S4 item 1, OD-06, OD-02, MB-03, MB-11,
 * MB-36, MB-10), and the OWNER's ceremonies.
 *
 * ⛔ A BALANCE THAT COULD NOT BE READ SAYS SO; it is never shown as 0. The exposure is a share of the 1,024 ways to
 *    answer the ten mains that some live ticket holds — a count, never a list of who holds what.
 */
type PoolsSearch = Record<string, string | undefined>;
type PoolsPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function withQuery(sp: PoolsSearch, changes: Record<string, string | null>, page?: keyof PoolsSearch): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) if (value && key !== page) next.set(key, value);
  for (const [key, value] of Object.entries(changes)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  const query = next.toString();
  return `/admin/maswali/pools${query ? `?${query}` : ""}`;
}

export default async function AdminMaswaliPoolsPage(props: PoolsPageProps) {
  return <AdminPageGate title="Millionea · Pools"><Content {...props} /></AdminPageGate>;
}

async function Content({ searchParams }: PoolsPageProps) {
  const sp = poolsSearchParams(await searchParams);
  const session = await currentSession();
  const role = session?.role;
  const [v, standing, sw, can] = await Promise.all([
    poolsView().catch(() => null),
    consoleStanding().catch(() => null),
    readMillioneaSwitchFresh().catch(() => null),
    Promise.all([
      canUseControl(role, "releaseMaswaliSettlement"), canUseControl(role, "fundMaswaliGuarantee"), canUseControl(role, "returnMaswaliGuarantee"),
      canUseControl(role, "sunsetMaswali"), canUseControl(role, "setMaswaliLicenceBasis"), canUseControl(role, "setMillioneaRollout"),
    ]),
  ]);
  const [canRelease, canFund, canReturn, canSunset, canLicence, canRollout] = can;
  // Every public week by its state, never the newest few: a drafted week far ahead can still be made the final one.
  const sunsetCandidates = (await weekStore.list({ visibility: "PUBLIC" }).catch(() => [])).filter((w) => !w.isFinal && w.state !== "SETTLED" && w.state !== "VOIDED");

  if (!v) {
    return (<><AdminPageHead title="Millionea · Pools" sw="Mifuko" /><AdminBody><p className="text-body-sm text-danger-fg">The pools could not be read.</p></AdminBody></>);
  }
  const openLine = poolsLine(sp.oline);
  const state = openState(sp.ostate);
  const openSort = parseSort<OpenSort>(sp, ["week", "state", "sales", "coverage", "topUp"], "week", "desc", "o");
  const openRows = queryOpenWeeks(v.weeks, { line: openLine, state, ...openSort });
  const trailLine = poolsLine(sp.tline);
  const trailCode = (sp.tcode ?? "").trim();
  const trailSort = parseSort<TrailSort>(sp, ["week", "settled", "sales", "winners", "paid", "carried"], "settled", "desc", "t");
  const trail = queryRolloverTrail(v.trail, { code: trailCode, line: trailLine, ...trailSort });
  const trailPage = parsePage(sp.tpage, trail.length, CONSOLE_PER_PAGE);
  const trailRows = trail.slice((trailPage - 1) * CONSOLE_PER_PAGE, trailPage * CONSOLE_PER_PAGE);
  const short = v.guarantee !== null && v.guarantee < v.requirement;
  const floatShort = v.float !== null && v.pendingPayout > v.float;
  return (
    <>
      <AdminPageHead title="Millionea · Pools" sw="Mifuko" />
      <AdminBody>
        <KpiGrid cols="1-sm2-xl4">
          <AdminKpi label="Jackpot carried" sw="Jackpot" value={money(v.jackpotPublic)} note="Players' money, for the next winning week" {...(v.jackpotPublic === null ? { tone: "danger" as const } : {})} />
          <AdminKpi label="Guarantee" sw="Dhamana" value={money(v.guarantee)} note={`Needed now: ${formatTzs(v.requirement)} (OD-02)`} {...(v.guarantee === null || short ? { tone: "danger" as const } : {})} />
          <AdminKpi label="Payout float" sw="Akiba ya malipo" value={money(v.float)} note={`Prepared payouts: ${formatTzs(v.pendingPayout)}`} {...(floatShort ? { tone: "warning" as const } : {})} />
          <AdminKpi label="Drive jackpot" sw="Jackpot ya majaribio" value={money(v.jackpotDrive)} note="The private drive's own (OD-21)" />
        </KpiGrid>

        <AdminCard title="Open weeks" sw="Wiki zilizo wazi" padding="p-0">
          {v.weeks.length > 0 && <div className="space-y-2 border-b border-border-subtle p-4">
            <div className="flex flex-wrap gap-1" aria-label="Open week line">
              {([ ["ALL", "All lines"], ["PUBLIC", "Public"], ["DRIVE", "Drive"] ] as const).map(([value, label]) =>
                <FilterPill key={value} href={withQuery(sp, { oline: value === "ALL" ? null : value })} label={label} on={openLine === value} replace scroll={false} />)}
            </div>
            <div className="flex flex-wrap gap-1" aria-label="Open week state">
              {([ ["ALL", "All states"], ["OPEN", "Selling"], ["CLOSED", "Closed"], ["RESOLVING", "Sealing"] ] as const).map(([value, label]) =>
                <FilterPill key={value} href={withQuery(sp, { ostate: value === "ALL" ? null : value })} label={label} on={state === value} replace scroll={false} />)}
            </div>
            <p className="text-body-sm text-text-secondary" data-result-count={openRows.length}>{openRows.length} matching open week{openRows.length === 1 ? "" : "s"}</p>
          </div>}
          {v.weeks.length === 0 ? <EmptyState title="No open week" body="A week appears here from its open until it settles." />
            : openRows.length === 0 ? <div className="space-y-2 p-4 text-body-sm"><p>No open week matches these filters.</p><Link className="link" href={withQuery(sp, { oline: null, ostate: null })}>Clear open-week filters</Link></div>
            : (
              <ScrollX label="Millionea open weeks">
                <table className="admin-tbl min-w-[1000px]">
                  <thead><tr>
                    <SortTh field="week" label="Week" current={openSort.sort} dir={openSort.dir} sp={sp} baseHref="/admin/maswali/pools" prefix="o" />
                    <SortTh field="state" label="State" current={openSort.sort} dir={openSort.dir} sp={sp} baseHref="/admin/maswali/pools" prefix="o" />
                    <SortTh field="sales" label="Sales" current={openSort.sort} dir={openSort.dir} sp={sp} baseHref="/admin/maswali/pools" prefix="o" align="right" />
                    <th className="text-right">Carry claimed</th>
                    <SortTh field="coverage" label="Coverage" current={openSort.sort} dir={openSort.dir} sp={sp} baseHref="/admin/maswali/pools" prefix="o" align="right" />
                    <SortTh field="topUp" label="Worst top-up" current={openSort.sort} dir={openSort.dir} sp={sp} baseHref="/admin/maswali/pools" prefix="o" align="right" />
                    <th className="text-left">Settlement</th>
                  </tr></thead>
                  <tbody>
                    {openRows.map((w) => {
                      const chip = weekStateChip(w.row.state);
                      const a = w.preview?.arithmetic;
                      return (
                        <tr key={w.row.id}>
                          <td className="text-left tabular">{w.row.code}{w.row.visibility === "DRIVE" ? " · drive" : ""}</td>
                          <td className="text-left"><Chip variant={chip.variant} size="sm">{chip.label}</Chip></td>
                          <td className="text-right tabular">{formatTzs(w.sales)}</td>
                          <td className="text-right tabular">{w.rolloverIn === null ? "Not yet" : formatTzs(w.rolloverIn)}</td>
                          <td className="text-right tabular">{w.distinctCombos.toLocaleString("en")} of 1,024 · {(w.coverage * 100).toFixed(1)}%</td>
                          <td className="text-right tabular">{formatTzs(w.worstTopUp)}</td>
                          <td className="text-left align-top min-w-[280px]">
                            {w.preview ? (
                              <div className="space-y-1">
                                <p className="text-body-sm">{a?.kind === "ROLLOVER" ? <>No 10 of 10: <span className="font-mono tabular-nums">{formatTzs(w.preview.sales)}</span> rolls to the jackpot.</>
                                  : <>{a?.k} winner{a?.k === 1 ? "" : "s"} · <span className="font-mono tabular-nums">{formatTzs(a && a.kind === "PAYOUT" ? a.share : 0)}</span> each · fee <span className="font-mono tabular-nums">{formatTzs(a && a.kind === "PAYOUT" ? a.F : 0)}</span> · top-up <span className="font-mono tabular-nums">{formatTzs(w.preview.guaranteeNeeded)}</span>{w.preview.basis === "TOP_SCORE" ? ` · final week, top score ${w.preview.winningScore} of 10` : ""}</>}</p>
                                {w.preview.held > 0 && <p className="text-body-sm text-warning">{w.preview.held} winner(s) will be paid and held for Compliance (MB-43).</p>}
                                {canRelease ? <ReleaseControl weekId={w.row.id} code={w.row.code} digest={w.preview.digest} />
                                  : <ControlLocked what="Release" need={CONTROL_DOMAIN.releaseMaswaliSettlement} />}
                              </div>
                            ) : <span className="text-body-sm text-text-tertiary">{w.previewRefusal ?? (w.row.state === "RESOLVING" ? "Waiting on the objection window." : "Not ready.")}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollX>
            )}
        </AdminCard>

        <AdminCard title="Rollover trail" sw="Historia ya jackpot" padding="p-0">
          {v.trail.length > 0 && <div className="space-y-3 border-b border-border-subtle p-4">
            <form action="/admin/maswali/pools" method="get" role="search" className="flex flex-wrap items-end gap-2">
              {Object.entries(sp).filter(([key, value]) => key !== "tcode" && key !== "tpage" && value).map(([key, value]) =>
                <input key={key} type="hidden" name={key} value={value} />)}
              <label className="min-w-[180px] flex-1 text-body-sm">Find a week by code
                <Input className="mt-1" size="sm" name="tcode" defaultValue={trailCode} maxLength={32} placeholder="MLN-2026-W01" />
              </label>
              <Button type="submit" size="sm">Find week</Button>
            </form>
            <div className="flex flex-wrap gap-1" aria-label="Rollover trail line">
              {([ ["ALL", "All lines"], ["PUBLIC", "Public"], ["DRIVE", "Drive"] ] as const).map(([value, label]) =>
                <FilterPill key={value} href={withQuery(sp, { tline: value === "ALL" ? null : value }, "tpage")} label={label} on={trailLine === value} replace scroll={false} />)}
            </div>
            <p className="text-body-sm text-text-secondary" data-result-count={trail.length}>{trail.length} matching settled week{trail.length === 1 ? "" : "s"}</p>
          </div>}
          {v.trail.length === 0 ? <EmptyState title="No settled week yet" body="Each settled week appears here with what it claimed, paid and carried." />
            : trail.length === 0 ? <div className="space-y-2 p-4 text-body-sm"><p>No settled week matches this search and line.</p><Link className="link" href={withQuery(sp, { tcode: null, tline: null }, "tpage")}>Clear trail filters</Link></div>
            : (
              <ScrollX label="Millionea rollover trail">
                <table className="admin-tbl min-w-[980px]">
                  <thead><tr>
                    <SortTh field="week" label="Week" current={trailSort.sort} dir={trailSort.dir} sp={sp} baseHref="/admin/maswali/pools" prefix="t" />
                    <SortTh field="settled" label="Settled" current={trailSort.sort} dir={trailSort.dir} sp={sp} baseHref="/admin/maswali/pools" prefix="t" />
                    <SortTh field="sales" label="Sales" current={trailSort.sort} dir={trailSort.dir} sp={sp} baseHref="/admin/maswali/pools" prefix="t" align="right" />
                    <th className="text-right">Carry in</th>
                    <SortTh field="winners" label="Winners" current={trailSort.sort} dir={trailSort.dir} sp={sp} baseHref="/admin/maswali/pools" prefix="t" align="right" />
                    <th className="text-right">Fee</th><th className="text-right">Top-up</th>
                    <SortTh field="paid" label="Paid" current={trailSort.sort} dir={trailSort.dir} sp={sp} baseHref="/admin/maswali/pools" prefix="t" align="right" />
                    <SortTh field="carried" label="Carried on" current={trailSort.sort} dir={trailSort.dir} sp={sp} baseHref="/admin/maswali/pools" prefix="t" align="right" />
                    <th className="text-right">Levy on own top-up</th>
                  </tr></thead>
                  <tbody>
                    {trailRows.map((t) => (
                      <tr key={t.code}>
                        <td className="text-left tabular">{t.code}</td><td className="text-left tabular">{fmtEat(t.settledAt)}</td>
                        <td className="text-right tabular">{formatTzs(t.sales)}</td><td className="text-right tabular">{formatTzs(t.rolloverIn)}</td>
                        <td className="text-right tabular">{t.winners}</td><td className="text-right tabular">{formatTzs(t.fee)}</td>
                        <td className="text-right tabular">{formatTzs(t.topUp)}</td><td className="text-right tabular">{formatTzs(t.paid)}</td>
                        <td className="text-right tabular">{formatTzs(t.carryOut)}</td><td className="text-right tabular">{formatTzs(t.levyOnOwnTopUp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollX>
            )}
          {trail.length > CONSOLE_PER_PAGE && (
            <div className="border-t border-border-subtle px-4 py-2">
              <AdminPagination page={trailPage} total={trail.length} perPage={CONSOLE_PER_PAGE} baseHref={buildBaseHref("/admin/maswali/pools", sp, "tpage")} param="tpage" />
            </div>
          )}
        </AdminCard>

        <AdminCard title="Owner" sw="Mmiliki">
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-2">
              <h3 className="font-semibold text-body">Guarantee</h3>
              {canFund || canReturn ? <GuaranteeCeremony canFund={canFund} canReturn={canReturn} />
                : <ControlLocked what="Fund or return the guarantee" need={CONTROL_DOMAIN.fundMaswaliGuarantee} block />}
            </section>
            <section className="space-y-2">
              <h3 className="font-semibold text-body">Licence basis</h3>
              <p className="text-body-sm text-text-secondary">Now: {standing ? (standing.licence.kind === "NONE" ? "none recorded — no week can open" : `${standing.licence.kind === "GBT_WRITTEN" ? "the Board's letter" : "the Owner's ruling"} · ${standing.licence.ref}`) : "unreadable"}</p>
              {canLicence ? <LicenceCeremony /> : <ControlLocked what="Record the licence basis" need={CONTROL_DOMAIN.setMaswaliLicenceBasis} block />}
            </section>
            <section className="space-y-2">
              <h3 className="font-semibold text-body">Rollout</h3>
              <p className="text-body-sm text-text-secondary">Visible to: {standing?.rollout ?? "unreadable"}. The switch controls who SEES Millionea; selling needs the licence, the guarantee and an open week too.</p>
              {canRollout ? (sw && sw.kind !== "UNREAD"
                  ? <RolloutCeremony expectSeq={sw.kind === "SET" ? sw.seq : 0} current={standing?.rollout ?? "WITHDRAWN"} />
                  : <p className="text-body-sm text-danger-fg">The switch could not be read, so it cannot be moved now.</p>)
                : <ControlLocked what="Move the rollout" need={CONTROL_DOMAIN.setMillioneaRollout} block />}
            </section>
            <section className="space-y-2">
              <h3 className="font-semibold text-body">Stop the product</h3>
              <p className="text-body-sm text-text-secondary">{standing?.sunset.kind === "ENDING" ? `Week ${standing.sunset.week.code} is the final week.` : standing?.sunset.kind === "RETIRED" ? "Millionea has ended." : "The final week runs normally; if no ticket gets 10 of 10, the top score shares the jackpot (MR-30)."}</p>
              {canSunset ? <SunsetCeremony weeks={sunsetCandidates.map((w) => ({ id: w.id, label: `${w.code} · ${w.state.toLowerCase()}` }))} />
                : <ControlLocked what="Make a week the final week" need={CONTROL_DOMAIN.sunsetMaswali} block />}
            </section>
          </div>
        </AdminCard>
      </AdminBody>
    </>
  );
}
