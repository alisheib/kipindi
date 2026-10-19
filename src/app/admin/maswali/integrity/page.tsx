import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollX } from "@/components/ui/scroll-x";
import { consoleShareNoteOf } from "@/lib/maswali-share-note";
import Link from "next/link";
import { parsePage } from "@/components/admin/admin-pagination";
import type { ClusterReport } from "@/lib/server/maswali-integrity";
import { ControlLocked } from "@/components/admin/control-locked";
import { currentSession } from "@/lib/server/auth-service";
import { houseConsoleAudience } from "@/lib/server/house-console-read";
import { canUseControl, CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { AdminPagination, buildBaseHref } from "@/components/admin/admin-pagination";
import { CONSOLE_PER_PAGE, SEAL_WEEKS_PER_PAGE, consoleStanding, integrityView } from "@/lib/server/maswali-console";
import { isMaswaliVoidReason, MASWALI_VOID_REASON_LABEL } from "@/lib/maswali-void-reason";
import { CLUSTER_LINE_PREVIEW, clusterReport, clusterRows, crowdedLineHolders, pickShifts, recentNewDeviceSeals } from "@/lib/server/maswali-integrity";
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
type IntegrityPageProps = { searchParams: Promise<{ wpage?: string; spage?: string }> };

export default async function AdminMaswaliIntegrityPage(props: IntegrityPageProps) {
  return <AdminPageGate title="Millionea · Integrity"><Content {...props} /></AdminPageGate>;
}

async function Content({ searchParams }: IntegrityPageProps) {
  const sp = await searchParams;
  const session = await currentSession();
  // ⛔ D19/259, guard 0.434: this page renders records read from the audit log (the new-device seals), so it decides its
  // audience on the STORED role before it reads anything; the section gate above decides what is painted, not what is sent.
  if (!(await houseConsoleAudience(session?.userId ?? null, "/admin/maswali/integrity"))) return null;
  const role = session?.role;
  const [v, standing, can] = await Promise.all([
    integrityView(new Date(), { winners: Number(sp.wpage ?? "1"), sealWeeks: Number(sp.spage ?? "1") }).catch(() => null),
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
            <ConnectedAccounts clusters={clusters} query={sp} />
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
          {v.held.length === 0 ? <EmptyState title="No share is held" body="A winner whose account changed, or one found later, is held here for a decision." /> : (
            <ScrollX label="Millionea held shares">
              <table className="admin-tbl min-w-[900px]">
                <thead><tr><th className="text-left">Ticket</th><th className="text-left">Holder</th><th className="text-right">Share</th><th className="text-left">Why</th><th className="text-left">Decision</th></tr></thead>
                <tbody>
                  {v.held.map((h) => (
                    <tr key={h.ticketId}>
                      <td className="text-left tabular">{h.serial}</td><td className="text-left">{h.holder}</td>
                      <td className="text-right tabular">{formatTzs(h.payout)}</td><td className="text-left max-w-[280px]">{consoleShareNoteOf(h.reason)}</td>
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
            <ScrollX label="Millionea winners">
              <table className="admin-tbl min-w-[960px]">
                <thead><tr><th className="text-left">Week</th><th className="text-left">Ticket</th><th className="text-left">Holder</th><th className="text-left">Role · status</th><th className="text-right">Account age</th><th className="text-right">Share</th><th className="text-left">Screening</th></tr></thead>
                <tbody>
                  {v.winners.map((w) => (
                    <tr key={w.serial}>
                      <td className="text-left tabular">{w.weekCode}</td><td className="text-left tabular">{w.serial}</td><td className="text-left">{w.holder}</td>
                      <td className="text-left">{w.role} · {w.status}</td><td className="text-right tabular">{w.accountAgeDays} d</td>
                      <td className="text-right tabular">{formatTzs(w.payout)}</td>
                      <td className="text-left">{w.frozenReason ? <span className="text-body-sm">{consoleShareNoteOf(w.frozenReason)}</span>
                        : canHold ? <HoldShareControl ticketId={w.ticketId} serial={w.serial} />
                        : <ControlLocked what="Hold the share" need={CONTROL_DOMAIN.holdMaswaliShare} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
          )}
          {v.winnersPage.total > CONSOLE_PER_PAGE && (
            <div className="border-t border-border-subtle px-4 py-2">
              <AdminPagination page={v.winnersPage.page} total={v.winnersPage.total} perPage={CONSOLE_PER_PAGE}
                baseHref={buildBaseHref("/admin/maswali/integrity", { wpage: sp.wpage, spage: sp.spage }, "wpage")} param="wpage" />
            </div>
          )}
        </AdminCard>

        <AdminCard title="Seal log" sw="Kumbukumbu ya muhuri" padding="p-0">
          {v.sealLog.length === 0 ? <EmptyState title="Nothing to show yet" body="A week's seals appear here once its results can no longer change (MB-34)." /> : (
            <ScrollX label="Millionea seal log">
              <table className="admin-tbl min-w-[960px]">
                <thead><tr><th className="text-left">Week</th><th className="text-left">Slot</th><th className="text-left">Result</th><th className="text-left">Sealed by</th><th className="text-left">At (EAT)</th><th className="text-left">Second officer</th><th className="text-left">Evidence</th></tr></thead>
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
          )}
          {v.sealWeeks.total > SEAL_WEEKS_PER_PAGE && (
            <div className="border-t border-border-subtle px-4 py-2">
              <AdminPagination page={v.sealWeeks.page} total={v.sealWeeks.total} perPage={SEAL_WEEKS_PER_PAGE}
                baseHref={buildBaseHref("/admin/maswali/integrity", { wpage: sp.wpage, spage: sp.spage }, "spage")} param="spage" />
            </div>
          )}
        </AdminCard>
      </AdminBody>
    </>
  );
}

/** How many of a line's holders its row names before it links to the whole list: the ones the report carries for a
 *  crowded line (R4). */
const HOLDERS_SHOWN = CLUSTER_LINE_PREVIEW;

/**
 * S6 review R2-18 · THE CLUSTER REPORT, A PAGE AT A TIME (`test:grid-paging`). Each report's line says what it read — its
 * holders, how much of the board the week's tickets cover (MB-35) and the window of records, which ends at the week's
 * close (R2-3). Its lines, groups and crowded places alike, come through the console's own pager in the report's one
 * order (R4), each keyed by its stable id (R3), and a line's accounts open whole, a page at a time, from its row — a
 * crowded place's read as its line is opened: never a list cut at N.
 */
async function ConnectedAccounts({ clusters, query }: { clusters: Array<ClusterReport | null>; query: Readonly<Record<string, string | undefined>> }) {
  // R6–R8 · the weeks not yet decided first — still to pay, then settled holding a share — then the decided ones, and
  // within each the report's one order (`clusterRows`, the lead's rulings), so the pager's first page holds what to look
  // at before a week pays. Each line keyed by its stable id, so "all N" opens the line clicked (R3).
  const rows = clusterRows(clusters).map(({ report: c, line: g }) => ({ c, g, key: `${c.weekId}.${g.id}` }));
  const cpage = parsePage(query.cpage, rows.length, CONSOLE_PER_PAGE);
  const shown = rows.slice((cpage - 1) * CONSOLE_PER_PAGE, cpage * CONSOLE_PER_PAGE);
  const open = rows.find((r) => r.key === query.cgroup) ?? null;
  const hpage = open ? parsePage(query.hpage, open.g.accountCount, CONSOLE_PER_PAGE) : 1;
  // R4 · a group's accounts are in its report; a crowded place's are read when its line is opened, one page at a time.
  const placePage = open?.g.basis === "crowded"
    ? await crowdedLineHolders(open.c.weekId, open.g.id, hpage, CONSOLE_PER_PAGE).catch(() => null)
    : null;
  const openAccounts = !open ? [] : open.g.basis === "crowded"
    ? placePage?.accounts ?? []
    : open.g.accounts.slice((hpage - 1) * CONSOLE_PER_PAGE, hpage * CONSOLE_PER_PAGE);
  const hrefWithout = (pageParam: string) => buildBaseHref("/admin/maswali/integrity", { ...query }, pageParam);
  const groupHref = (key: string) => buildBaseHref("/admin/maswali/integrity", { ...query, cgroup: key }, "hpage");
  return (
    <div className="divide-y divide-border-subtle">
      {clusters.map((c, i) => c === null ? <p key={i} className="p-4 text-body-sm text-danger-fg">A week&apos;s report could not be read.</p> : (
        <p key={c.weekId} className="px-4 py-3 text-body-sm text-text-secondary">
          <span className="font-semibold text-text tabular">{c.code}</span>
          {` · ${c.holders.toLocaleString("en")} holders · their tickets answer the ten mains ${c.combos.toLocaleString("en")} ways (${(c.coverage * 100).toFixed(1)}% of the board) · records read from ${fmtEat(c.window.from)} to the close, ${fmtEat(c.window.to)} EAT${c.readable ? "" : " · the records could not all be read"}`}
        </p>
      ))}
      {rows.length === 0 ? <p className="p-4 text-body-sm text-text-secondary">No group to look at.</p> : (
        <ScrollX label="Millionea connected accounts">
          <table className="admin-tbl min-w-[1080px]">
            <thead><tr><th className="text-left">Week</th><th className="text-left">What ties them</th><th className="text-right">Accounts</th><th className="text-right">Tickets</th><th className="text-right">Ways covered</th><th className="text-left">Winning tickets</th><th className="text-left">Holders</th></tr></thead>
            <tbody>
              {shown.map(({ c, g, key }) => (
                <tr key={key}>
                  <td className="text-left tabular">{c.code}</td>
                  <td className={g.basis === "answers" ? "text-left text-text-secondary" : "text-left text-warning"}>
                    {g.basis === "records" ? "The platform's records" : g.basis === "answers" ? "The same fifteen answers" : "One crowded place"}
                  </td>
                  <td className="text-right tabular">{g.accountCount.toLocaleString("en")}</td>
                  <td className="text-right tabular">{g.tickets.toLocaleString("en")}</td>
                  <td className="text-right tabular">{g.combos.toLocaleString("en")}</td>
                  <td className="text-left">{g.winners === null ? <span className="text-text-tertiary">Not final yet</span> : g.winners.toLocaleString("en")}</td>
                  <td className="text-left text-body-sm">
                    {g.accounts.slice(0, HOLDERS_SHOWN).map((a) => `${a.holder} (${a.tickets})`).join(" · ")}
                    {g.accountCount > HOLDERS_SHOWN
                      ? <>{" · "}<Link href={groupHref(key)} className="text-royal-300 hover:underline">{`all ${g.accountCount.toLocaleString("en")}`}</Link></>
                      : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollX>
      )}
      {rows.length > CONSOLE_PER_PAGE && (
        <div className="px-4 py-2">
          <AdminPagination page={cpage} total={rows.length} perPage={CONSOLE_PER_PAGE} baseHref={hrefWithout("cpage")} param="cpage" />
        </div>
      )}
      {open && (
        <section className="p-4 space-y-2">
          {/* R4 · a crowded line is a place its holders share, never a group of them. */}
          <h3 className="font-semibold text-body tabular">{open.g.basis === "crowded"
            ? `${open.c.code} · the ${open.g.accountCount.toLocaleString("en")} holders on one crowded place`
            : `${open.c.code} · one group's ${open.g.accountCount.toLocaleString("en")} accounts`}</h3>
          {open.g.basis === "crowded" && placePage === null ? <p className="text-body-sm text-danger-fg">This place&apos;s holders could not be read.</p> : (
            <ScrollX label={open.g.basis === "crowded" ? "One crowded place's holders" : "One group's accounts"}>
              <table className="admin-tbl min-w-[640px]">
                <thead><tr><th className="text-left">Holder</th><th className="text-left">Account</th><th className="text-right">Tickets</th></tr></thead>
                <tbody>
                  {openAccounts.map((a) => (
                    <tr key={a.userId}>
                      <td className="text-left">{a.holder}</td>
                      <td className="text-left font-mono break-all">{a.userId}</td>
                      <td className="text-right tabular">{a.tickets.toLocaleString("en")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
          )}
          {open.g.accountCount > CONSOLE_PER_PAGE && (
            <AdminPagination page={hpage} total={open.g.accountCount} perPage={CONSOLE_PER_PAGE} baseHref={hrefWithout("hpage")} param="hpage" />
          )}
        </section>
      )}
    </div>
  );
}
