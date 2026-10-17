import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollX } from "@/components/ui/scroll-x";
import { ControlLocked } from "@/components/admin/control-locked";
import { currentSession } from "@/lib/server/auth-service";
import { canUseControl, CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { consoleStanding, integrityView } from "@/lib/server/maswali-console";
import { clusterReport, pickShifts } from "@/lib/server/maswali-integrity";
import { weekStore } from "@/lib/server/maswali-dal";
import { slotLabel } from "@/lib/maswali-score";
import { formatTzs } from "@/lib/utils";
import { fmtEat } from "@/lib/maswali-admin-format";
import { HeldShareControls, HoldShareControl, PauseControl, VoidWeekControl } from "./integrity-controls";

export const metadata = { title: "Admin · Millionea · Integrity" };
export const dynamic = "force-dynamic";

/**
 * /admin/maswali/integrity — COMPLIANCE's page (MASWALI-BUILD S4; MASWALI-PLAN §7b S4 item 1, MB-34, MB-43, MB-62,
 * MB-78, OD-07).
 *
 *   · the SALES PAUSE (sales only; never a cancel, a settlement or a refund);
 *   · weeks whose whole-week void is certain and whose window has closed, to void;
 *   · HELD SHARES, to release or forfeit to the jackpot; and every winner, to screen and hold;
 *   · the SEAL LOG, shown only for weeks whose results can no longer change (MB-34: the counterfactual is read after
 *     the fact, never while an officer could still be steered).
 */
export default async function AdminMaswaliIntegrityPage() {
  return <AdminPageGate title="Millionea · Integrity"><Content /></AdminPageGate>;
}

async function Content() {
  const session = await currentSession();
  const role = session?.role;
  const [v, standing, can] = await Promise.all([
    integrityView().catch(() => null),
    consoleStanding().catch(() => null),
    Promise.all([
      canUseControl(role, "pauseMaswaliSales"), canUseControl(role, "resumeMaswaliSales"), canUseControl(role, "voidMaswaliWeek"),
      canUseControl(role, "holdMaswaliShare"), canUseControl(role, "releaseMaswaliShare"), canUseControl(role, "forfeitMaswaliShare"),
    ]),
  ]);
  const [canPause, canResume, canVoid, canHold, canRelease, canForfeit] = can;
  // The cluster report for the latest weeks whose ticket set is fixed (closed, being sealed, or just settled).
  const closed = (await weekStore.list({ states: ["CLOSED", "RESOLVING", "SETTLED"], limit: 3 }).catch(() => []));
  const clusters = await Promise.all(closed.map((w) => clusterReport(w).catch(() => null)));
  const shifts = await pickShifts().catch(() => null);
  if (!v) return (<><AdminPageHead title="Millionea · Integrity" sw="Uadilifu" /><AdminBody><p className="text-body-sm text-danger-fg">The integrity view could not be read.</p></AdminBody></>);

  return (
    <>
      <AdminPageHead title="Millionea · Integrity" sw="Uadilifu" />
      <AdminBody>
        <AdminCard title="Sales" sw="Mauzo">
          <p className="text-body-sm text-text-secondary mb-3">{standing ? (standing.pause.paused ? `Paused since ${fmtEat(standing.pause.at)}: ${standing.pause.reason}` : "Selling normally.") : "The pause record could not be read."} A pause stops sales only; settlements, refunds and cancels go on.</p>
          {(standing?.pause.paused ? canResume : canPause)
            ? <PauseControl paused={!!standing?.pause.paused} />
            : <ControlLocked what={standing?.pause.paused ? "Resume sales" : "Pause sales"} need={CONTROL_DOMAIN.pauseMaswaliSales} block />}
        </AdminCard>

        <AdminCard title="Answers moving while a week sells" sw="Mabadiliko ya majibu">
          {shifts === null ? <p className="text-body-sm text-danger-fg">The pick shifts could not be read.</p>
            : shifts.length === 0 ? <p className="text-body-sm text-text-secondary">No question's answers have swung among the latest tickets.</p>
            : (
              <ul className="space-y-1.5 text-body-sm">
                {shifts.map((x) => (
                  <li key={`${x.weekId}-${x.slot}`}>
                    <span className="tabular">{x.code} · {x.label}</span>: YES went from {Math.round(x.before * 100)}% to {Math.round(x.recent * 100)}% over the last {x.recentTickets} tickets.
                    <span className="text-text-tertiary"> Check the event before the close; pausing sales stops new tickets.</span>
                  </li>
                ))}
              </ul>
            )}
        </AdminCard>

        <AdminCard title="Connected accounts" sw="Akaunti zinazohusiana" padding="p-0">
          {clusters.length === 0 ? <EmptyState title="No closed week yet" body="Each week's report appears once its sales close and its ticket set is fixed." /> : (
            <div className="divide-y divide-border-subtle">
              {clusters.map((c, i) => c === null ? <p key={i} className="p-4 text-body-sm text-danger-fg">A week's report could not be read.</p> : (
                <section key={c.weekId} className="p-4 space-y-2">
                  <h3 className="font-semibold text-body tabular">{c.code} · {c.holders.toLocaleString("en")} holders{c.readable ? "" : " · the records could not all be read"}</h3>
                  {c.groups.length === 0 ? <p className="text-body-sm text-text-secondary">No group to look at.</p> : (
                    <ul className="space-y-2 text-body-sm">
                      {c.groups.map((g, j) => (
                        <li key={j}>
                          <span className={g.basis === "records" ? "text-warning" : "text-text-secondary"}>{g.detail}</span>
                          <span className="block text-caption text-text-tertiary">{g.accounts.map((a) => `${a.holder} (${a.tickets})`).join(" · ")}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          )}
        </AdminCard>

        <AdminCard title="Weeks that void whole" sw="Wiki zinazobatilishwa">
          {v.voidable.length === 0 ? <p className="text-body-sm text-text-secondary">No week is waiting to be voided.</p> : (
            <ul className="space-y-2">
              {v.voidable.map((w) => (
                <li key={w.id} className="flex items-center gap-3 flex-wrap">
                  <span className="tabular">{w.code}</span><span className="text-caption text-text-tertiary">{w.ticketCount.toLocaleString("en")} tickets to refund in full</span>
                  {canVoid ? <VoidWeekControl weekId={w.id} code={w.code} /> : <ControlLocked what="Void the week" need={CONTROL_DOMAIN.voidMaswaliWeek} />}
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard title="Held shares" sw="Zawadi zilizozuiliwa" padding="p-0">
          {v.held.length === 0 ? <EmptyState title="No share is held" body="A winner whose account changed, or one found later, is held here for a decision." /> : (
            <ScrollX>
              <table className="table min-w-[900px]">
                <thead><tr><th className="text-left">Ticket</th><th className="text-left">Holder</th><th className="text-right">Share</th><th className="text-left">Why</th><th className="text-left">Decision</th></tr></thead>
                <tbody>
                  {v.held.map((h) => (
                    <tr key={h.ticketId}>
                      <td className="text-left tabular">{h.serial}</td><td className="text-left">{h.holder}</td>
                      <td className="text-right tabular">{formatTzs(h.payout)}</td><td className="text-left max-w-[280px]">{h.reason}</td>
                      <td className="text-left">{h.forfeited ? <Chip variant="danger" size="sm">Forfeited</Chip>
                        : <HeldShareControls ticketId={h.ticketId} serial={h.serial} canRelease={canRelease} canForfeit={canForfeit}
                            releaseNeed={CONTROL_DOMAIN.releaseMaswaliShare} forfeitNeed={CONTROL_DOMAIN.forfeitMaswaliShare} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
          )}
        </AdminCard>

        <AdminCard title="Winners" sw="Washindi" padding="p-0">
          {v.winners.length === 0 ? <EmptyState title="No winner yet" body="Every paid ticket appears here with its account, to screen." /> : (
            <ScrollX>
              <table className="table min-w-[960px]">
                <thead><tr><th className="text-left">Week</th><th className="text-left">Ticket</th><th className="text-left">Holder</th><th className="text-left">Role · status</th><th className="text-right">Account age</th><th className="text-right">Share</th><th className="text-left">Screening</th></tr></thead>
                <tbody>
                  {v.winners.map((w) => (
                    <tr key={w.serial}>
                      <td className="text-left tabular">{w.weekCode}</td><td className="text-left tabular">{w.serial}</td><td className="text-left">{w.holder}</td>
                      <td className="text-left">{w.role} · {w.status}</td><td className="text-right tabular">{w.accountAgeDays} d</td>
                      <td className="text-right tabular">{formatTzs(w.payout)}</td>
                      <td className="text-left">{w.frozenReason ? <span className="text-caption">{w.frozenReason}</span>
                        : canHold ? <HoldShareControl ticketId={w.ticketId} serial={w.serial} />
                        : <ControlLocked what="Hold the share" need={CONTROL_DOMAIN.holdMaswaliShare} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
          )}
        </AdminCard>

        <AdminCard title="Seal log" sw="Kumbukumbu ya muhuri" padding="p-0">
          {v.sealLog.length === 0 ? <EmptyState title="Nothing to show yet" body="A week's seals appear here once its results can no longer change (MB-34)." /> : (
            <ScrollX>
              <table className="table min-w-[960px]">
                <thead><tr><th className="text-left">Week</th><th className="text-left">Slot</th><th className="text-left">Result</th><th className="text-left">Sealed by</th><th className="text-left">At (EAT)</th><th className="text-left">Second officer</th><th className="text-left">Evidence</th></tr></thead>
                <tbody>
                  {v.sealLog.map((s, i) => (
                    <tr key={i}>
                      <td className="text-left tabular">{s.weekCode}</td><td className="text-left tabular">{slotLabel(s.slot)}</td>
                      <td className="text-left">{s.outcome}{s.voidReason ? ` · ${s.voidReason}` : ""}</td><td className="text-left">{s.sealedBy ?? "—"}</td>
                      <td className="text-left tabular">{fmtEat(s.sealedAt)}</td><td className="text-left">{s.stage2By ?? "—"}</td>
                      <td className="text-left max-w-[320px]">{s.evidence ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
          )}
        </AdminCard>
      </AdminBody>
    </>
  );
}
