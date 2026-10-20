import Link from "next/link";
import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/ui/search-box";
import { Select } from "@/components/ui/select";
import { ScrollX } from "@/components/ui/scroll-x";
import { ControlLocked } from "@/components/admin/control-locked";
import { currentSession } from "@/lib/server/auth-service";
import { houseConsoleAudience } from "@/lib/server/house-console-read";
import { canUseControl, CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { AdminPagination, buildBaseHref } from "@/components/admin/admin-pagination";
import { SortTh } from "@/components/admin/admin-sort";
import { CONSOLE_PER_PAGE, SEAL_WEEKS_PER_PAGE, consoleStanding, integrityView } from "@/lib/server/maswali-console";
import { parseIntegrityListQuery, integrityListParams } from "@/lib/maswali-integrity-list";
import { isMaswaliVoidReason, MASWALI_VOID_REASON_LABEL } from "@/lib/maswali-void-reason";
import { clusterReport, pickShifts, recentNewDeviceSeals } from "@/lib/server/maswali-integrity";
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
type IntegrityPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const INTEGRITY_HREF = "/admin/maswali/integrity";

function OtherListState({ params, list }: { params: Record<string, string | undefined>; list: "h" | "w" | "s" }) {
  return Object.entries(params).filter(([key, value]) => value && !key.startsWith(list)).map(([key, value]) =>
    <input key={key} type="hidden" name={key} value={value} />);
}

function clearListHref(params: Record<string, string | undefined>, list: "h" | "w" | "s") {
  return buildBaseHref(INTEGRITY_HREF, Object.fromEntries(Object.entries(params).filter(([key]) => !key.startsWith(list))));
}

export default async function AdminMaswaliIntegrityPage(props: IntegrityPageProps) {
  return <AdminPageGate title="Millionea · Integrity"><Content {...props} /></AdminPageGate>;
}

async function Content({ searchParams }: IntegrityPageProps) {
  const sp = await searchParams;
  const query = parseIntegrityListQuery(sp);
  const session = await currentSession();
  // ⛔ D19/259, guard 0.434: this page renders records read from the audit log (the new-device seals), so it decides its
  // audience on the STORED role before it reads anything; the section gate above decides what is painted, not what is sent.
  if (!(await houseConsoleAudience(session?.userId ?? null, "/admin/maswali/integrity"))) return null;
  const role = session?.role;
  const [v, standing, can] = await Promise.all([
    integrityView(new Date(), {}, query).catch(() => null),
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
  const newDevices = await recentNewDeviceSeals().catch(() => null);
  if (!v) return (<><AdminPageHead title="Millionea · Integrity" sw="Uadilifu" /><AdminBody><p className="text-body-sm text-danger-fg">The integrity view could not be read.</p></AdminBody></>);
  const linkQuery = {
    held: { ...query.held, page: v.heldPage.page },
    winners: { ...query.winners, page: v.winnersPage.page },
    seals: { ...query.seals, page: v.sealWeeks.page },
  };
  const listParams = integrityListParams(linkQuery);

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

        <AdminCard title="Seals from a new device" sw="Muhuri kutoka kifaa kipya">
          {newDevices === null ? <p className="text-body-sm text-danger-fg">The seal records could not be read.</p>
            : newDevices.length === 0 ? <p className="text-body-sm text-text-secondary">Every recent seal came from a device its officer had sealed from before.</p>
            : (
              <ul className="space-y-1.5 text-body-sm">
                {newDevices.map((d, i) => (
                  <li key={i}><span className="tabular">{fmtEat(d.at)}</span> · officer {d.officerId ?? "?"} · week {d.weekId ?? "?"}{d.firstSeal ? <span className="text-text-tertiary"> · their first seal on the platform</span> : <span className="text-warning"> · not a device they sealed from before</span>}</li>
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
                          <span className="block text-body-sm text-text-tertiary">{g.accounts.map((a) => `${a.holder} (${a.tickets})`).join(" · ")}</span>
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
                  <span className="tabular">{w.code}</span><span className="text-body-sm text-text-tertiary">{w.ticketCount.toLocaleString("en")} tickets to refund in full</span>
                  {canVoid ? <VoidWeekControl weekId={w.id} code={w.code} /> : <ControlLocked what="Void the week" need={CONTROL_DOMAIN.voidMaswaliWeek} />}
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard title="Held shares" sw="Zawadi zilizozuiliwa" padding="p-0">
          <div className="border-b border-border-subtle p-4">
            <SearchBox param="hq" pageParam="hpage" placeholder="Week, ticket or holder" ariaLabel="Search held shares" helpFields={["week", "ticket", "holder"]} />
            <form method="get" action={INTEGRITY_HREF} className="mt-3 flex flex-wrap items-end gap-3">
              <OtherListState params={listParams} list="h" />
              {query.held.q && <input type="hidden" name="hq" value={query.held.q} />}
              <input type="hidden" name="hsort" value={query.held.sort} /><input type="hidden" name="hdir" value={query.held.dir} />
              <div className="min-w-[160px] flex-1 text-body-sm text-text-secondary"><span>Decision</span>
                <Select key={query.held.decision} name="hdecision" ariaLabel="Held share decision" defaultValue={query.held.decision} className="mt-1"
                  options={[{ value: "", label: "All decisions" }, { value: "pending", label: "Pending" }, { value: "forfeited", label: "Forfeited" }]} />
              </div>
              <Button type="submit" size="sm">Apply</Button>
              {(query.held.q || query.held.decision) && <Link href={clearListHref(listParams, "h") as never} className="btn btn-ghost btn-sm">Clear</Link>}
            </form>
          </div>
          {v.heldPage.allTotal === 0 ? <EmptyState title="No share is held" body="A winner whose account changed, or one found later, is held here for a decision." />
            : v.heldPage.total === 0 ? <EmptyState title="No held shares match these filters" body="Try another week, ticket, holder or decision." /> : (
            <>
            <p className="px-4 pt-3 font-mono text-micro uppercase tracking-widest text-text-subtle">{v.heldPage.total} of {v.heldPage.allTotal} held shares</p>
            <ScrollX label="Millionea held shares">
              <table className="admin-tbl min-w-[900px]">
                <thead><tr>
                  <SortTh field="week" label="Week" current={query.held.sort} dir={query.held.dir} sp={listParams} baseHref={INTEGRITY_HREF} prefix="h" />
                  <SortTh field="ticket" label="Ticket" current={query.held.sort} dir={query.held.dir} sp={listParams} baseHref={INTEGRITY_HREF} prefix="h" />
                  <SortTh field="holder" label="Holder" current={query.held.sort} dir={query.held.dir} sp={listParams} baseHref={INTEGRITY_HREF} prefix="h" />
                  <SortTh field="share" label="Share" current={query.held.sort} dir={query.held.dir} sp={listParams} baseHref={INTEGRITY_HREF} prefix="h" align="right" />
                  <th scope="col" className="text-left">Why</th>
                  <SortTh field="decision" label="Decision" current={query.held.sort} dir={query.held.dir} sp={listParams} baseHref={INTEGRITY_HREF} prefix="h" />
                </tr></thead>
                <tbody>
                  {v.held.map((h) => (
                    <tr key={h.ticketId}>
                      <td className="text-left tabular">{h.weekCode}</td><td className="text-left tabular">{h.serial}</td><td className="text-left">{h.holder}</td>
                      <td className="text-right tabular">{formatTzs(h.payout)}</td><td className="text-left max-w-[280px]">{h.reason}</td>
                      <td className="text-left">{h.forfeited ? <Chip variant="danger" size="sm">Forfeited</Chip>
                        : <HeldShareControls ticketId={h.ticketId} serial={h.serial} canRelease={canRelease} canForfeit={canForfeit}
                            releaseNeed={CONTROL_DOMAIN.releaseMaswaliShare} forfeitNeed={CONTROL_DOMAIN.forfeitMaswaliShare} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
            </>
          )}
          {v.heldPage.total > CONSOLE_PER_PAGE && <div className="border-t border-border-subtle px-4 py-2">
            <AdminPagination page={v.heldPage.page} total={v.heldPage.total} perPage={CONSOLE_PER_PAGE}
              baseHref={buildBaseHref(INTEGRITY_HREF, listParams, "hpage")} param="hpage" />
          </div>}
        </AdminCard>

        <AdminCard title="Winners" sw="Washindi" padding="p-0">
          <div className="border-b border-border-subtle p-4">
            <SearchBox param="wq" pageParam="wpage" placeholder="Week or ticket serial" ariaLabel="Search Millionea winners" helpFields={["week", "ticket"]} />
            <form method="get" action={INTEGRITY_HREF} className="mt-3 flex flex-wrap items-end gap-3">
              <OtherListState params={listParams} list="w" />
              {query.winners.q && <input type="hidden" name="wq" value={query.winners.q} />}
              <input type="hidden" name="wsort" value={query.winners.sort} /><input type="hidden" name="wdir" value={query.winners.dir} />
              <div className="min-w-[160px] flex-1 text-body-sm text-text-secondary"><span>Screening</span>
                <Select key={query.winners.review} name="wreview" ariaLabel="Winner screening" defaultValue={query.winners.review} className="mt-1"
                  options={[{ value: "", label: "All winners" }, { value: "flagged", label: "Flagged" }, { value: "clear", label: "Not flagged" }]} />
              </div>
              <Button type="submit" size="sm">Apply</Button>
              {(query.winners.q || query.winners.review) && <Link href={clearListHref(listParams, "w") as never} className="btn btn-ghost btn-sm">Clear</Link>}
            </form>
          </div>
          {v.winnersPage.allTotal === 0 ? <EmptyState title="No winner yet" body="Every paid ticket appears here with its account, to screen." />
            : v.winnersPage.total === 0 ? <EmptyState title="No winners match these filters" body="Try another week, ticket or screening state." /> : (
            <>
            <p className="px-4 pt-3 font-mono text-micro uppercase tracking-widest text-text-subtle">{v.winnersPage.total} of {v.winnersPage.allTotal} winners</p>
            <ScrollX label="Millionea winners">
              <table className="admin-tbl min-w-[960px]">
                <thead><tr>
                  <SortTh field="week" label="Week" current={query.winners.sort} dir={query.winners.dir} sp={listParams} baseHref={INTEGRITY_HREF} prefix="w" />
                  <SortTh field="ticket" label="Ticket" current={query.winners.sort} dir={query.winners.dir} sp={listParams} baseHref={INTEGRITY_HREF} prefix="w" />
                  <th scope="col" className="text-left">Holder</th><th scope="col" className="text-left">Role · status</th><th scope="col" className="text-right">Account age</th>
                  <SortTh field="share" label="Share" current={query.winners.sort} dir={query.winners.dir} sp={listParams} baseHref={INTEGRITY_HREF} prefix="w" align="right" />
                  <th scope="col" className="text-left">Screening</th>
                </tr></thead>
                <tbody>
                  {v.winners.map((w) => (
                    <tr key={w.serial}>
                      <td className="text-left tabular">{w.weekCode}</td><td className="text-left tabular">{w.serial}</td><td className="text-left">{w.holder}</td>
                      <td className="text-left">{w.role} · {w.status}</td><td className="text-right tabular">{w.accountAgeDays} d</td>
                      <td className="text-right tabular">{formatTzs(w.payout)}</td>
                      <td className="text-left">{w.frozenReason ? <span className="text-body-sm">{w.frozenReason}</span>
                        : canHold ? <HoldShareControl ticketId={w.ticketId} serial={w.serial} />
                        : <ControlLocked what="Hold the share" need={CONTROL_DOMAIN.holdMaswaliShare} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
            </>
          )}
          {v.winnersPage.total > CONSOLE_PER_PAGE && (
            <div className="border-t border-border-subtle px-4 py-2">
              <AdminPagination page={v.winnersPage.page} total={v.winnersPage.total} perPage={CONSOLE_PER_PAGE}
                baseHref={buildBaseHref(INTEGRITY_HREF, listParams, "wpage")} param="wpage" />
            </div>
          )}
        </AdminCard>

        <AdminCard title="Seal log" sw="Kumbukumbu ya muhuri" padding="p-0">
          <div className="border-b border-border-subtle p-4">
            <SearchBox param="sq" pageParam="spage" placeholder="Search sealed week code" ariaLabel="Search seal log weeks" helpFields={["week"]} />
            <form method="get" action={INTEGRITY_HREF} className="mt-3 flex flex-wrap items-end gap-3">
              <OtherListState params={listParams} list="s" />
              {query.seals.q && <input type="hidden" name="sq" value={query.seals.q} />}
              <input type="hidden" name="sdir" value={query.seals.dir} />
              <div className="min-w-[160px] flex-1 text-body-sm text-text-secondary"><span>Week state</span>
                <Select key={query.seals.state} name="sstate" ariaLabel="Sealed week state" defaultValue={query.seals.state} className="mt-1"
                  options={[{ value: "", label: "All sealed weeks" }, { value: "SETTLED", label: "Settled" }, { value: "VOIDED", label: "Voided" }]} />
              </div>
              <Button type="submit" size="sm">Apply</Button>
              {(query.seals.q || query.seals.state) && <Link href={clearListHref(listParams, "s") as never} className="btn btn-ghost btn-sm">Clear</Link>}
            </form>
          </div>
          {v.sealWeeks.allTotal === 0 ? <EmptyState title="Nothing to show yet" body="A week's seals appear here once its results can no longer change (MB-34)." />
            : v.sealWeeks.total === 0 ? <EmptyState title="No sealed weeks match these filters" body="Try another week code or state." /> : (
            <>
            <p className="px-4 pt-3 font-mono text-micro uppercase tracking-widest text-text-subtle">{v.sealWeeks.total} of {v.sealWeeks.allTotal} sealed weeks</p>
            <ScrollX label="Millionea seal log">
              <table className="admin-tbl min-w-[960px]">
                <thead><tr>
                  <SortTh field="week" label="Week" current={query.seals.sort} dir={query.seals.dir} sp={listParams} baseHref={INTEGRITY_HREF} prefix="s" />
                  <th scope="col" className="text-left">Slot</th><th scope="col" className="text-left">Result</th><th scope="col" className="text-left">Sealed by</th>
                  <th scope="col" className="text-left">At (EAT)</th><th scope="col" className="text-left">Second officer</th><th scope="col" className="text-left">Evidence</th>
                </tr></thead>
                <tbody>
                  {v.sealLog.map((s, i) => (
                    <tr key={i}>
                      <td className="text-left tabular">{s.weekCode}</td><td className="text-left tabular">{slotLabel(s.slot)}</td>
                      <td className="text-left">{s.outcome}{s.voidReason ? ` · ${isMaswaliVoidReason(s.voidReason) ? MASWALI_VOID_REASON_LABEL[s.voidReason] : s.voidReason}` : ""}</td><td className="text-left">{s.sealedBy ?? "—"}</td>
                      <td className="text-left tabular">{fmtEat(s.sealedAt)}</td><td className="text-left">{s.stage2By ?? "—"}</td>
                      <td className="text-left max-w-[320px]">{s.evidence ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
            </>
          )}
          {v.sealWeeks.total > SEAL_WEEKS_PER_PAGE && (
            <div className="border-t border-border-subtle px-4 py-2">
              <AdminPagination page={v.sealWeeks.page} total={v.sealWeeks.total} perPage={SEAL_WEEKS_PER_PAGE}
                baseHref={buildBaseHref(INTEGRITY_HREF, listParams, "spage")} param="spage" />
            </div>
          )}
        </AdminCard>
      </AdminBody>
    </>
  );
}
