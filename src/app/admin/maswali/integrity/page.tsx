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
import { consoleShareNoteOf } from "@/lib/maswali-share-note";
import { parsePage } from "@/components/admin/admin-pagination";
import type { ClusterReport } from "@/lib/server/maswali-integrity";
import { ControlLocked } from "@/components/admin/control-locked";
import { currentSession } from "@/lib/server/auth-service";
import { houseConsoleAudience } from "@/lib/server/house-console-read";
import { canUseControl, CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { AdminPagination, buildBaseHref } from "@/components/admin/admin-pagination";
import { SortTh } from "@/components/admin/admin-sort";
import { CONSOLE_PER_PAGE, SEAL_WEEKS_PER_PAGE, UNREACHED_ALERT_HOURS, UNREACHED_RECENT_DAYS, consoleStanding, integrityView } from "@/lib/server/maswali-console";
import { parseIntegrityListQuery, integrityListParams } from "@/lib/maswali-integrity-list";
import { isMaswaliVoidReason, MASWALI_VOID_REASON_LABEL } from "@/lib/maswali-void-reason";
import { CLUSTER_LINE_PREVIEW, clusterReport, clusterRows, crowdedLineHolders, pickShifts, recentNewDeviceSeals } from "@/lib/server/maswali-integrity";
import { takeoverWatch, type TakeoverWatch } from "@/lib/server/maswali-takeover";
import { millioneaApprovedWordings } from "@/lib/server/maswali-marketing";
import { weekStore } from "@/lib/server/maswali-dal";
import type { SmsStatus } from "@/lib/server/store";
import { slotLabel } from "@/lib/maswali-score";
import { adminCount, formatNumber, formatTzs } from "@/lib/utils";
import { fmtEat } from "@/lib/maswali-admin-format";
import { displayLabel } from "@/lib/display-label";
import { roleLabel } from "@/lib/server/roles";
import { accountStatusLabel } from "@/components/admin/status-badge";
import { HeldShareControls, HoldShareControl, MarkReachedControl, PauseControl, VoidWeekControl, ClearLettersControl } from "./integrity-controls";
import { StandingAuditWarning } from "../audit-warning";
import { MillioneaObjectionQueue } from "./objection-queue";

export const metadata = { title: "Admin · Millionea · Integrity" };
export const dynamic = "force-dynamic";

/** S6 · a winner SMS's own record, in the campaign page's words (OD41: handed over is not delivered). A full Record, so a
 *  status added to the store is a compile error here. DELIVERED never reaches this list: a delivered winner is reached. */
const SMS_STATE: Readonly<Record<SmsStatus, string>> = {
  QUEUED: "Waiting", ACCEPTED: "Handed over · no receipt yet", DELIVERED: "Delivered", FAILED: "Failed", UNKNOWN: "No answer",
};
/** S6 · why a week's winner SMS batch was held (`maswali-winner-sms.ts`), in the desk's words. */
const SMS_HELD: Record<string, string> = {
  credit_low: "Held · it would spend the credit kept for codes",
  credit_unreadable: "Held · the SMS credit could not be read",
  settings_unreadable: "Held · the SMS settings could not be read",
  targets_unreadable: "Held · earlier sends could not be read",
  channel_closed: "Not sent · the channel policy refuses it",
  BAD_MSISDN: "Not sent · the number on file cannot be dialled",
  NOT_CONFIGURED: "Not sent · no SMS provider is configured",
  PROVIDER_UNRECOGNISED: "Not sent · the SMS provider is not one this build knows",
};

/**
 * /admin/maswali/integrity — COMPLIANCE's page (MASWALI-BUILD S4; MASWALI-PLAN §7b S4 item 1, MB-34, MB-43, MB-62,
 * MB-78, OD-07).
 *
 *   · the SALES PAUSE (sales only; never a cancel, a settlement or a refund);
 *   · the OBJECTIONS to one question (MR-16, MB-23; S7-OB), by week and question, to rule (`objection-queue.tsx`);
 *   · weeks whose whole-week void is certain and whose window has closed, to void;
 *   · S6 · each VOIDED week still owed its refunds, a row of its own until they land (R1's one truth, `unrefundedVoids`);
 *   · S6 · the WINNERS NOT YET REACHED (MB-93), among the weeks settled in the last `UNREACHED_RECENT_DAYS`: no seen mark,
 *     no ticket opened since the settlement, no delivered SMS, no call recorded — with what was sent, for the desk to call
 *     and then record (`MarkReachedControl`, typed); past `UNREACHED_ALERT_HOURS` the console raises it too;
 *   ⛔ THE SALES PAUSE ALWAYS RENDERS. Each card reads on its own and says when its read failed; a failure of the integrity
 *     view takes its own cards, never the pause (the review's MEDIUM 7).
 *   · HELD SHARES, to release or forfeit to the jackpot; and every winner, to screen and hold;
 *   · the SEAL LOG, shown only for weeks whose results can no longer change (MB-34: the counterfactual is read after
 *     the fact, never while an officer could still be steered);
 *   · S6 · the approved MARKETING WORDINGS, with the public week's fee filled in (MB-47): what a campaign may say.
 */
type IntegrityPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const INTEGRITY_HREF = "/admin/maswali/integrity";

function OtherListState({ params, list }: { params: Record<string, string | undefined>; list: "h" | "w" | "s" | "v" }) {
  return Object.entries(params).filter(([key, value]) => value && !key.startsWith(list)).map(([key, value]) =>
    <input key={key} type="hidden" name={key} value={value} />);
}

function clearListHref(params: Record<string, string | undefined>, list: "h" | "w" | "s" | "v") {
  return buildBaseHref(INTEGRITY_HREF, Object.fromEntries(Object.entries(params).filter(([key]) => !key.startsWith(list))));
}

export default async function AdminMaswaliIntegrityPage(props: IntegrityPageProps) {
  return <AdminPageGate title="Millionea · Integrity"><Content {...props} /></AdminPageGate>;
}

async function Content({ searchParams }: IntegrityPageProps) {
  const sp = await searchParams;
  const query = parseIntegrityListQuery(sp);
  // S6-INT · the cluster report's own parameters (cpage, cgroup, gpage) read one value each, as every list here does.
  const clusterQuery = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])) as Readonly<Record<string, string | undefined>>;
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
      canUseControl(role, "markMillioneaWinnerReached"), canUseControl(role, "clearUnresolvedLetter"),
    ]),
  ]);
  const [canPause, canResume, canVoid, canHold, canRelease, canForfeit, canReach, canClearLetters] = can;
  // S7-OB · the objection queue's ruling (MR-16): Compliance's, the Owner the fallback.
  const canRule = await canUseControl(role, "ruleMaswaliObjection");
  // The cluster report for the latest weeks whose ticket set is fixed (closed, being sealed, or just settled).
  const closed = (await weekStore.list({ states: ["CLOSED", "RESOLVING", "SETTLED"], limit: 3 }).catch(() => []));
  const clusters = await Promise.all(closed.map((w) => clusterReport(w).catch(() => null)));
  const shifts = await pickShifts().catch(() => null);
  const newDevices = await recentNewDeviceSeals().catch(() => null);
  const takeover = await takeoverWatch().catch((): TakeoverWatch => ({ readable: false, findings: [] }));
  const wordings = await millioneaApprovedWordings().catch(() => null);
  // ⛔ THE SALES PAUSE ALWAYS RENDERS (lane N's MEDIUM 7): a view that could not be read takes its own cards, never the
  // page. The lists' links then keep the pages the query asked for.
  const linkQuery = {
    held: { ...query.held, page: v?.heldPage.page ?? query.held.page },
    winners: { ...query.winners, page: v?.winnersPage.page ?? query.winners.page },
    seals: { ...query.seals, page: v?.sealWeeks.page ?? query.seals.page },
    voidable: { ...query.voidable, page: v?.voidablePage.page ?? query.voidable.page },
    cluster: query.cluster,
    unreached: { page: v?.unreachedPage?.page ?? query.unreached.page },
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

        <MillioneaObjectionQueue viewerId={session?.userId ?? null} viewerIsOwner={role === "ADMIN"} canRule={canRule} />

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
                  <li key={i}><span className="tabular">{fmtEat(d.at)}</span> · officer {d.officer ?? "not on record"} · week {d.weekCode ?? "not on record"}{d.kind === "unchecked"
                    ? <span className="text-warning"> · the device could not be checked against their earlier seals</span>
                    : d.firstSeal ? <span className="text-text-tertiary"> · their first seal on the platform</span> : <span className="text-warning"> · not a device they sealed from before</span>}</li>
                ))}
              </ul>
            )}
        </AdminCard>

        {/* ⭐ MB-96 · the winners' takeover watch (S7-F9, `maswali-takeover.ts`): an alert, never a hold — a winner's share is
            held from the winners below (OD-07); nothing else is ever held (2026-10-10). The card says what the control
            enforces, never what it watches for (the repository is public; the lead's ruling, 2026-10-22). */}
        <AdminCard title="Possible account takeovers after a payout" sw="Akaunti za washindi za kukagua">
          {!takeover.readable && <p role="alert" className="text-body-sm text-danger-fg mb-2">The takeover watch could not be read in full; a winning account may be missing from this list.</p>}
          {takeover.findings.length === 0
            ? (takeover.readable && <p className="text-body-sm text-text-secondary">No winning account is flagged for review.</p>)
            : (
              <ul className="space-y-1.5 text-body-sm">
                {takeover.findings.map((f) => (
                  <li key={`${f.userId}-${f.weekId}`}>
                    <span className="tabular">{f.code}</span> · {f.holder} · flagged <span className="tabular">{fmtEat(f.flaggedAt)}</span>
                    <span className="text-text-tertiary"> (paid <span className="tabular">{fmtEat(f.creditAt)}</span>). Review the account with its owner before its money leaves; hold the share from Winners below if it is not theirs.</span>
                  </li>
                ))}
              </ul>
            )}
        </AdminCard>

        <AdminCard title="Connected accounts" sw="Akaunti zinazohusiana" padding="p-0">
          {clusters.length === 0 ? <EmptyState title="No closed week yet" body="Each week's report appears once its sales close and its ticket set is fixed." /> : (
            <ConnectedAccounts clusters={clusters} query={clusterQuery} />
          )}
        </AdminCard>

        {!v ? (
          <AdminCard title="Weeks, shares and seals" sw="Wiki, zawadi na mihuri">
            <p className="text-body-sm text-danger-fg">The integrity view could not be read. The sales pause above still works.</p>
          </AdminCard>
        ) : (<>
        <AdminCard title="Weeks that void whole" sw="Wiki zinazobatilishwa" padding="p-0">
          <div className="border-b border-border-subtle p-4">
            <SearchBox mode="form" formId="maswali-voidable-filters" param="vq" pageParam="vpage" placeholder="Search week code" ariaLabel="Search weeks waiting to be voided" helpFields={["week"]} />
            <form id="maswali-voidable-filters" method="get" action={INTEGRITY_HREF} className="mt-3 flex flex-wrap items-end gap-3">
              <OtherListState params={listParams} list="v" />
              <div className="min-w-[130px] flex-1 text-body-sm text-text-secondary"><span>Line</span>
                <Select key={query.voidable.line} name="vline" ariaLabel="Voidable week line" defaultValue={query.voidable.line} className="mt-1"
                  options={[{ value: "", label: "All lines" }, { value: "PUBLIC", label: "Public" }, { value: "DRIVE", label: "Drive" }]} />
              </div>
              <div className="min-w-[130px] flex-1 text-body-sm text-text-secondary"><span>Sort by</span>
                <Select key={query.voidable.sort} name="vsort" ariaLabel="Voidable week sort by" defaultValue={query.voidable.sort} className="mt-1"
                  options={[{ value: "week", label: "Week" }, { value: "tickets", label: "Tickets to refund" }]} />
              </div>
              <div className="min-w-[130px] flex-1 text-body-sm text-text-secondary"><span>Order</span>
                <Select key={query.voidable.dir} name="vdir" ariaLabel="Voidable week order" defaultValue={query.voidable.dir} className="mt-1"
                  options={[{ value: "desc", label: "Newest or most first" }, { value: "asc", label: "Oldest or least first" }]} />
              </div>
              <Button type="submit" size="sm">Apply</Button>
              {(query.voidable.q || query.voidable.line || query.voidable.sort !== "week" || query.voidable.dir !== "desc")
                && <Link href={clearListHref(listParams, "v") as never} className="btn btn-ghost btn-sm">Clear</Link>}
            </form>
          </div>
          {/* S5-FIX-SRV · a voided week leaves this list as it lands: its audit warning stands here instead. */}
          <div className="px-4 pt-3 empty:hidden"><StandingAuditWarning slot="integrity:weekVoid" /></div>
          {v.voidablePage.allTotal === 0 ? <div className="p-4 text-body-sm text-text-secondary">No week is waiting to be voided.</div>
            : v.voidablePage.total === 0 ? <EmptyState title="No voidable weeks match these filters" body="Try another week code or line." /> : (
            <><p className="px-4 pt-3 font-mono text-micro uppercase tracking-widest text-text-subtle">{formatNumber(v.voidablePage.total)} of {adminCount(v.voidablePage.allTotal, "week")} waiting</p>
            <ul className="space-y-2 p-4">
              {v.voidable.map((w) => (
                <li key={w.id} className="flex items-center gap-3 flex-wrap">
                  <span className="tabular">{w.code}</span><span className="text-body-sm text-text-tertiary">{adminCount(w.ticketCount, "ticket")} to refund in full</span>
                  {canVoid ? <VoidWeekControl weekId={w.id} code={w.code} /> : <ControlLocked what="Void the week" need={CONTROL_DOMAIN.voidMaswaliWeek} />}
                </li>
              ))}
            </ul></>
          )}
          {v.voidablePage.total > CONSOLE_PER_PAGE && <AdminPagination page={v.voidablePage.page} total={v.voidablePage.total} perPage={CONSOLE_PER_PAGE}
            baseHref={buildBaseHref(INTEGRITY_HREF, listParams, "vpage")} param="vpage" />}
        </AdminCard>

        <AdminCard title="Refunds owed" sw="Marejesho yanayodaiwa">
          {v.owedRefunds === null ? <p className="text-body-sm text-danger-fg">The owed refunds could not be read.</p>
            : v.owedRefunds.length === 0 ? <p className="text-body-sm text-text-secondary">No voided week is waiting for its refunds.</p> : (
            <ul className="space-y-2">
              {v.owedRefunds.map((r) => (
                <li key={r.weekId} className="text-body-sm">
                  <span className="tabular">{r.code}</span> · {r.ticketCount.toLocaleString("en")} {r.ticketCount === 1 ? "ticket" : "tickets"} · voided {fmtEat(r.voidedAt)}
                  <span className="block text-text-tertiary">Its refunds have not landed. The tick retries them; the heal runs them now.</span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard title="Letters not known to have gone" sw="Barua zisizojulikana kama zimefika">
          {v.unresolvedLetters?.truncated ? <p className="text-body-sm text-text-tertiary">Only the newest weeks were read; older weeks are not shown here.</p> : null}
          {v.unresolvedLetters?.partial ? <p className="text-body-sm text-text-tertiary">Some weeks hold more records than one read covers, so a letter of theirs may be missing here; the week&apos;s audit trail has the rest.</p> : null}
          {v.unresolvedLetters === null ? <p className="text-body-sm text-danger-fg">The letters not known to have gone could not be read.</p>
            : v.unresolvedLetters.rows.length === 0 ? <p className="text-body-sm text-text-secondary">{v.unresolvedLetters.partial ? "No letter is listed from the records read." : "Every win and refund letter is known to have gone or to need nothing."}</p> : (
            <ul className="space-y-2">
              {v.unresolvedLetters.rows.map((l) => (
                <li key={`${l.weekId}-${l.notice}`} className="text-body-sm">
                  <span className="tabular">{l.code}</span> · {l.letters.toLocaleString("en")} {l.notice === "refund" ? "refund" : "win"} {l.letters === 1 ? "letter" : "letters"}
                  <span className="block text-text-tertiary">The email provider may have taken {l.letters === 1 ? "it" : "them"}, and its own search could not say. Until the check is recorded, a later search that finds no such message may send {l.letters === 1 ? "it" : "any of them"} once more; the recorded check closes {l.letters === 1 ? "it" : "them"} for good. Check the provider&apos;s activity, and record the check before anyone writes to the holder.</span>
                  {canClearLetters ? <ClearLettersControl weekId={l.weekId} notice={l.notice} code={l.code} />
                    : <ControlLocked what="Record the check" need={CONTROL_DOMAIN.clearUnresolvedLetter} />}
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard title={v.unreachedPage ? `Winners not yet reached · ${v.unreachedPage.total.toLocaleString("en")}` : "Winners not yet reached"} sw="Washindi ambao hawajafikiwa" padding="p-0">
          <p className="px-4 pb-2 text-body-sm text-text-tertiary">Weeks settled in the last {UNREACHED_RECENT_DAYS} days.</p>
          {v.unreached === null ? <p className="px-4 pb-4 text-body-sm text-danger-fg">The winners not yet reached could not be read.</p>
            : v.unreached.length === 0 ? <EmptyState title="Every winner has been reached" body="A winner is listed here until they open their result in the app, their SMS is delivered, or the desk records a call. A letter or an unopened bell is not proof." /> : (
            <ScrollX label="Millionea winners not yet reached">
              <table className="admin-tbl min-w-[1180px]">
                <thead><tr><th className="text-left">Week</th><th className="text-left">Holder</th><th className="text-left">Tickets</th><th className="text-right">Paid</th><th className="text-left">Settled (EAT)</th><th className="text-left">Bell</th><th className="text-left">Email</th><th className="text-left">SMS</th><th className="text-left">Desk</th></tr></thead>
                <tbody>
                  {v.unreached.map((u) => (
                    <tr key={`${u.weekId}-${u.userId}`}>
                      <td className="text-left tabular">{u.weekCode}</td><td className="text-left">{u.holder}</td>
                      <td className="text-left tabular max-w-[240px]">{u.serials.join(", ")}</td>
                      <td className="text-right tabular">{u.forfeited ? "Forfeited" : u.held ? "Held" : u.paidTzs === null ? "Not on record" : formatTzs(u.paidTzs)}</td>
                      <td className="text-left tabular">{fmtEat(u.settledAt)} · {u.hoursSince} h{u.hoursSince >= UNREACHED_ALERT_HOURS ? <span className="text-warning"> · past {UNREACHED_ALERT_HOURS} h</span> : null}</td>
                      <td className="text-left">{u.bell ? "Written · not opened" : "Not written"}</td>
                      <td className="text-left">{u.emailState === "confirmed" ? "Confirmed address" : u.emailState === "unconfirmed" ? "Unconfirmed address" : "No address"}</td>
                      <td className="text-left">{u.sms ? SMS_STATE[u.sms.status] : u.smsHeld ? (SMS_HELD[u.smsHeld] ?? "Held") : "Not sent"}</td>
                      <td className="text-left">{canReach ? <MarkReachedControl weekId={u.weekId} userId={u.userId} holder={u.holder} />
                        : <ControlLocked what="Record a call" need={CONTROL_DOMAIN.markMillioneaWinnerReached} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
          )}
          {v.unreachedPage && v.unreachedPage.total > CONSOLE_PER_PAGE && (
            <div className="border-t border-border-subtle px-4 py-2">
              <AdminPagination page={v.unreachedPage.page} total={v.unreachedPage.total} perPage={CONSOLE_PER_PAGE}
                baseHref={buildBaseHref(INTEGRITY_HREF, listParams, "npage")} param="npage" />
            </div>
          )}
        </AdminCard>

        <AdminCard title="Held shares" sw="Zawadi zilizozuiliwa" padding="p-0">
          <div className="border-b border-border-subtle p-4">
            <SearchBox mode="form" formId="maswali-held-filters" param="hq" pageParam="hpage" placeholder="Week, ticket or holder" ariaLabel="Search held shares" helpFields={["week", "ticket", "holder"]} />
            <form id="maswali-held-filters" method="get" action={INTEGRITY_HREF} className="mt-3 flex flex-wrap items-end gap-3">
              <OtherListState params={listParams} list="h" />
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
            <p className="px-4 pt-3 font-mono text-micro uppercase tracking-widest text-text-subtle">{formatNumber(v.heldPage.total)} of {adminCount(v.heldPage.allTotal, "held share")}</p>
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
                      <td className="text-right tabular">{h.payout === null ? "Not on record" : formatTzs(h.payout)}</td>
                      <td className="text-left max-w-[280px]">{consoleShareNoteOf(h.reason)}{h.provenance && <span className="block text-body-sm text-text-tertiary">{h.provenance}</span>}</td>
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
            <SearchBox mode="form" formId="maswali-winners-filters" param="wq" pageParam="wpage" placeholder="Week or ticket serial" ariaLabel="Search Millionea winners" helpFields={["week", "ticket"]} />
            <form id="maswali-winners-filters" method="get" action={INTEGRITY_HREF} className="mt-3 flex flex-wrap items-end gap-3">
              <OtherListState params={listParams} list="w" />
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
            <p className="px-4 pt-3 font-mono text-micro uppercase tracking-widest text-text-subtle">{formatNumber(v.winnersPage.total)} of {adminCount(v.winnersPage.allTotal, "winner")}</p>
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
                      <td className="text-left">{roleLabel(w.role)} · {accountStatusLabel(w.status)}{/* G8 · the role's and the account's words, never their enums */}</td><td className="text-right tabular">{w.accountAgeDays} d</td>
                      <td className="text-right tabular">{w.payout === null ? "Not on record" : formatTzs(w.payout)}</td>
                      <td className="text-left">{w.frozenReason ? <span className="text-body-sm">{consoleShareNoteOf(w.frozenReason)}</span>
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
            <SearchBox mode="form" formId="maswali-seals-filters" param="sq" pageParam="spage" placeholder="Search sealed week code" ariaLabel="Search seal log weeks" helpFields={["week"]} />
            <form id="maswali-seals-filters" method="get" action={INTEGRITY_HREF} className="mt-3 flex flex-wrap items-end gap-3">
              <OtherListState params={listParams} list="s" />
              <input type="hidden" name="sdir" value={query.seals.dir} />
              <div className="min-w-[160px] flex-1 text-body-sm text-text-secondary"><span>Week state</span>
                <Select key={query.seals.state} name="sstate" ariaLabel="Sealed week state" defaultValue={query.seals.state} className="mt-1"
                  options={[{ value: "", label: "All sealed weeks" }, { value: "SETTLED", label: "Settled" }, { value: "VOIDED", label: "Voided" }]} />
              </div>
              <Button type="submit" size="sm">Apply</Button>
              {(query.seals.q || query.seals.state) && <Link href={clearListHref(listParams, "s") as never} className="btn btn-ghost btn-sm">Clear</Link>}
            </form>
          </div>
          {/* MB-34 · the seal log is read after the fact, never while an officer could still be steered. */}
          {v.sealWeeks.allTotal === 0 ? <EmptyState title="Nothing to show yet" body="A week's seals appear here once its results can no longer change." />
            : v.sealWeeks.total === 0 ? <EmptyState title="No sealed weeks match these filters" body="Try another week code or state." /> : (
            <>
            <p className="px-4 pt-3 font-mono text-micro uppercase tracking-widest text-text-subtle">{formatNumber(v.sealWeeks.total)} of {adminCount(v.sealWeeks.allTotal, "sealed week")}</p>
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
                      <td className="text-left">{s.outcome}{s.voidReason ? ` · ${isMaswaliVoidReason(s.voidReason) ? MASWALI_VOID_REASON_LABEL[s.voidReason] : s.voidReason}` : ""}</td><td className="text-left">{s.sealer ?? "—"}</td>
                      <td className="text-left tabular">{fmtEat(s.sealedAt)}</td><td className="text-left">{s.secondOfficer ?? "—"}</td>
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
        </>)}

        <AdminCard title="Marketing wordings" sw="Maneno ya matangazo">
          {!wordings ? <p className="text-body-sm text-text-secondary">The approved wordings could not be read: the week&apos;s fee at payout could not be read.</p> : (
            <>
              <p className="text-body-sm text-text-secondary mb-3">
                {wordings.facts.live ? null : <span className="text-warning">Millionea is not public yet, so no campaign may be about it. </span>}
                {/* MB-47 · the campaign lint · OD-30 · no wording names a winner. */}
                A Millionea campaign is one whose name begins with &ldquo;Millionea&rdquo;: it carries its headline&apos;s three facts and the week&apos;s own fee, and the composer refuses an amount, a win or a winner, a sum, an income, a guarantee, a rank or a chance; any other campaign that uses Millionea&apos;s words is refused until it is tagged or reworded, and no wording names a winner.
                {" "}The fee below is {wordings.facts.source === "WEEK" ? `${wordings.facts.weekCode ?? "this week"}'s own` : "the one the next week will freeze"}.
              </p>
              <ul className="space-y-2">
                {[...wordings.SW, ...wordings.EN].map((w) => <li key={w} className="text-body-sm">{w}</li>)}
              </ul>
            </>
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
  // S6-INT · its own page parameter: `hpage` is the held shares' pager on this page (S5).
  const hpage = open ? parsePage(query.gpage, open.g.accountCount, CONSOLE_PER_PAGE) : 1;
  // R4 · a group's accounts are in its report; a crowded place's are read when its line is opened, one page at a time.
  const placePage = open?.g.basis === "crowded"
    ? await crowdedLineHolders(open.c.weekId, open.g.id, hpage, CONSOLE_PER_PAGE).catch(() => null)
    : null;
  const openAccounts = !open ? [] : open.g.basis === "crowded"
    ? placePage?.accounts ?? []
    : open.g.accounts.slice((hpage - 1) * CONSOLE_PER_PAGE, hpage * CONSOLE_PER_PAGE);
  const hrefWithout = (pageParam: string) => buildBaseHref("/admin/maswali/integrity", { ...query }, pageParam);
  const groupHref = (key: string) => buildBaseHref("/admin/maswali/integrity", { ...query, cgroup: key }, "gpage");
  return (
    <div className="divide-y divide-border-subtle">
      {clusters.map((c, i) => c === null ? <p key={i} className="p-4 text-body-sm text-danger-fg">A week&apos;s report could not be read.</p> : (
        <div key={c.weekId} className="px-4 py-3 space-y-1">
          <p className="text-body-sm text-text-secondary">
            <span className="font-semibold text-text tabular">{c.code}</span>
            {` · ${c.holders.toLocaleString("en")} holders · their tickets answer the ten mains ${c.combos.toLocaleString("en")} ways (${(c.boardCoverage * 100).toFixed(1)}% of the board) · records read from ${fmtEat(c.window.from)} to the close, ${fmtEat(c.window.to)} EAT${c.readable ? "" : " · the records could not all be read"}`}
          </p>
          {/* S5 (ad96345b6) · a bounded read says exactly how much it considered and showed (`ClusterCoverage`). */}
          {c.coverage.limited && <p role="alert" className="text-body-sm text-warning">
            Limited report. Connection checks considered {c.coverage.connectedHoldersChecked.toLocaleString("en")} of {c.coverage.holdersTotal.toLocaleString("en")} holders.
            {c.coverage.connectionSourceLimitReached && " The connection-source scan reached its limit; more links may exist."}
            {c.coverage.groupsShown < c.coverage.groupsFound && ` Showing ${c.coverage.groupsShown.toLocaleString("en")} of ${c.coverage.groupsFound.toLocaleString("en")} groups.`}
            {" Review the underlying records before treating this as complete."}
          </p>}
        </div>
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
                      {/* S6-ADMIN · G3 · the account's stable handle (`displayLabel`'s "Player #…"), never its raw id. */}
                      <td className="text-left tabular">{displayLabel({ id: a.userId, displayName: null })}</td>
                      <td className="text-right tabular">{a.tickets.toLocaleString("en")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
          )}
          {open.g.accountCount > CONSOLE_PER_PAGE && (
            <AdminPagination page={hpage} total={open.g.accountCount} perPage={CONSOLE_PER_PAGE} baseHref={hrefWithout("gpage")} param="gpage" />
          )}
        </section>
      )}
    </div>
  );
}
