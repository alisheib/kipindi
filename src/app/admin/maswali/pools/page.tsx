import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminBody, KpiGrid } from "@/components/admin/admin-body";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollX } from "@/components/ui/scroll-x";
import { ControlLocked } from "@/components/admin/control-locked";
import { currentSession } from "@/lib/server/auth-service";
import { canUseControl, CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { consoleStanding, poolsView } from "@/lib/server/maswali-console";
import { readMillioneaSwitchFresh } from "@/lib/server/millionea-switch";
import { weekStore } from "@/lib/server/maswali-dal";
import { formatTzs } from "@/lib/utils";
import { fmtEat, weekStateChip } from "@/lib/maswali-admin-format";
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
export default async function AdminMaswaliPoolsPage() {
  return <AdminPageGate title="Millionea · Pools"><Content /></AdminPageGate>;
}

async function Content() {
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
  const sunsetCandidates = (await weekStore.list({ visibility: "PUBLIC", limit: 12 }).catch(() => [])).filter((w) => !w.isFinal && w.state !== "SETTLED" && w.state !== "VOIDED");

  if (!v) {
    return (<><AdminPageHead title="Millionea · Pools" sw="Mifuko" /><AdminBody><p className="text-body-sm text-danger-fg">The pools could not be read.</p></AdminBody></>);
  }
  const short = v.guarantee !== null && v.guarantee < v.requirement;
  const floatShort = v.float !== null && v.pendingPayout > v.float;
  return (
    <>
      <AdminPageHead title="Millionea · Pools" sw="Mifuko" />
      <AdminBody>
        <KpiGrid cols="4">
          <AdminKpi label="Jackpot carried" sw="Jackpot" value={money(v.jackpotPublic)} note="Players' money, for the next winning week" {...(v.jackpotPublic === null ? { tone: "danger" as const } : {})} />
          <AdminKpi label="Guarantee" sw="Dhamana" value={money(v.guarantee)} note={`Needed now: ${formatTzs(v.requirement)} (OD-02)`} {...(v.guarantee === null || short ? { tone: "danger" as const } : {})} />
          <AdminKpi label="Payout float" sw="Akiba ya malipo" value={money(v.float)} note={`Prepared payouts: ${formatTzs(v.pendingPayout)}`} {...(floatShort ? { tone: "warning" as const } : {})} />
          <AdminKpi label="Drive jackpot" sw="Jackpot ya majaribio" value={money(v.jackpotDrive)} note="The private drive's own (OD-21)" />
        </KpiGrid>

        <AdminCard title="Open weeks" sw="Wiki zilizo wazi" padding="p-0">
          {v.weeks.length === 0 ? <EmptyState title="No open week" body="A week appears here from its open until it settles." />
            : (
              <ScrollX>
                <table className="table min-w-[1000px]">
                  <thead><tr><th className="text-left">Week</th><th className="text-left">State</th><th className="text-right">Sales</th><th className="text-right">Carry claimed</th><th className="text-right">Coverage</th><th className="text-right">Worst top-up</th><th className="text-left">Settlement</th></tr></thead>
                  <tbody>
                    {v.weeks.map((w) => {
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
                                <p className="text-body-sm">{a?.kind === "ROLLOVER" ? `No 10 of 10: ${formatTzs(w.preview.sales)} rolls to the jackpot.`
                                  : `${a?.k} winner${a?.k === 1 ? "" : "s"} · ${formatTzs(a && a.kind === "PAYOUT" ? a.share : 0)} each · fee ${formatTzs(a && a.kind === "PAYOUT" ? a.F : 0)} · top-up ${formatTzs(w.preview.guaranteeNeeded)}${w.preview.basis === "TOP_SCORE" ? ` · final week, top score ${w.preview.winningScore} of 10` : ""}`}</p>
                                {w.preview.held > 0 && <p className="text-caption text-warning">{w.preview.held} winner(s) will be paid and held for Compliance (MB-43).</p>}
                                {canRelease ? <ReleaseControl weekId={w.row.id} code={w.row.code} digest={w.preview.digest} />
                                  : <ControlLocked what="Release" need={CONTROL_DOMAIN.releaseMaswaliSettlement} />}
                              </div>
                            ) : <span className="text-caption text-text-tertiary">{w.previewRefusal ?? (w.row.state === "RESOLVING" ? "Waiting on the objection window." : "Not ready.")}</span>}
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
          {v.trail.length === 0 ? <EmptyState title="No settled week yet" body="Each settled week appears here with what it claimed, paid and carried." />
            : (
              <ScrollX>
                <table className="table min-w-[980px]">
                  <thead><tr><th className="text-left">Week</th><th className="text-left">Settled</th><th className="text-right">Sales</th><th className="text-right">Carry in</th><th className="text-right">Winners</th><th className="text-right">Fee</th><th className="text-right">Top-up</th><th className="text-right">Paid</th><th className="text-right">Carried on</th><th className="text-right">Levy on own top-up</th></tr></thead>
                  <tbody>
                    {v.trail.map((t) => (
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
