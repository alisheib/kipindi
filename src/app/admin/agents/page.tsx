import Link from "next/link";
import type { Route } from "next";
import { AdminPageHead, AdminCard, AdminKpi, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminBody, KpiGrid } from "@/components/admin/admin-body";
import { EmptyState } from "@/components/ui/empty-state";
import type { ComponentProps } from "react";
import { AdminPagination, parsePage, buildBaseHref, PER_PAGE } from "@/components/admin/admin-pagination";
import { SortTh } from "@/components/admin/admin-sort";
import { Select } from "@/components/ui/select";
import { parseQuery, matchesQuery, fieldNames, AGENT_SEARCH, AGENT_ROSTER_SEARCH } from "@/lib/search";
import { Tabs } from "@/components/ui/tabs";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Sensitive } from "@/components/ui/sensitive";
import { ScrollX } from "@/components/ui/scroll-x";
import { I } from "@/components/ui/glyphs";
import { db, type StoredAgentApplication, type StoredAgentInvitation, type StoredReferralReward, type StoredUser } from "@/lib/server/store";
import { getAgentConfig, PLATFORM_MAX_COMMISSION_PCT } from "@/lib/server/agent-config";
import { getLipaConfig } from "@/lib/server/lipa-config";
import { getAgentRoster, type AgentRosterRow } from "@/lib/server/affiliate-service";
import { feeBreakdown, invitationChannel, maskChannel } from "@/lib/server/agent-application-service";
import { AGENT_STATUS, AGENT_REJECT_REASON, AGENT_INVITATION_STATUS, AGENT_FEE_DISPOSITION } from "@/lib/admin-status-lexicon";
import { STATUS_TONE, TONE_CHIP } from "@/lib/status-tone";
import { displayLabel } from "@/lib/display-label";
import { formatDateShort, formatDateTime, formatTzs } from "@/lib/utils";
import { workingDaysBetween } from "@/lib/business-days";
import { SettlePayable, InviteComposer, RevokeInvitation, AgentSettingsForm, LipaSettingsForm } from "./agents-client";

export const metadata = { title: "Admin · Agents" };
export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;
const TABS = ["applications", "agents", "settings"] as const;
type Tab = (typeof TABS)[number];

/** Statuses that are still someone's turn — the applicant's, an invitee's, or the officer's. */
const IN_PROGRESS: readonly StoredAgentApplication["status"][] = ["DRAFT", "INVITED", "KYC_SUBMITTED", "PAYMENT_PENDING", "ADDITIONAL_INFO_REQUIRED"];
const CLOSED: readonly StoredAgentApplication["status"][] = ["APPROVED", "REJECTED", "DECLINED", "EXPIRED", "REVOKED"];
/** The closed-invitation HISTORY pages at this size; live invitations are never paged. */
const INVITATION_HISTORY_PAGE = 10;
/** The payables TABLE is a page of the newest rows; the KPI above it is a grouped total. */
const PAYABLES_PAGE = 5000;

/** One tone dictionary (§11a): the chip variant comes from `STATUS_TONE`, never a colour typed here. */
function statusVariant(status: StoredAgentApplication["status"]) {
  const key = status === "KYC_SUBMITTED" || status === "PAYMENT_PENDING" ? "DRAFT" : status;
  const tone = (STATUS_TONE as Record<string, Partial<Record<"admin", keyof typeof TONE_CHIP>>>)[key]?.admin;
  return tone ? TONE_CHIP[tone] : "pending";
}

type Read<T> = { ok: true; data: T } | { ok: false };
async function read<T>(fn: () => Promise<T> | T): Promise<Read<T>> {
  try { return { ok: true, data: await fn() }; } catch { return { ok: false }; }
}

/**
 * /admin/agents — the COMPLIANCE officer's console for the agent programme.
 *
 * Three sections, one URL fact each (`?tab=`): the review queue with the refunds-owed worklist
 * and invitations; the roster sorted by the revenue each agent generated, with the payables that
 * could not be credited; and the programme settings. ⛔ Every read is fenced on its own — a
 * failed roster read must not turn the queue into a blank page, and a blank must never be
 * mistaken for "nobody applied" (A-5).
 *
 * Agent money is this officer's, not the growth officer's: `/admin/affiliates` shows the player
 * promo only, so pausing the promo there cannot be mistaken for switching the agents off.
 */
type SP = {
  tab?: string;
  /** Applications tab: the search box and the status filter. */
  q?: string; status?: string;
  /** Agents tab: its own search box, so the two tabs do not fight over one param. */
  rq?: string;
  /** One page cursor per table — the three that can genuinely overflow. */
  dpage?: string; ipage?: string; ppage?: string;
  /** Roster ordering. `SortTh` preserves every other param and drops the page. */
  rsort?: string; rdir?: string;
};

export default async function AdminAgentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as Tab) : "applications";
  /**
   * ⛔ EVERY URL FACT IS CARRIED THROUGH THE TAB LINKS, or switching tabs would silently
   * discard the officer's search and show them a different set than the one they asked for
   * while the box still reads what they typed.
   */
  const tabHref = (t: Tab) => buildBaseHref("/admin/agents", {
    tab: t === "applications" ? undefined : t,
    q: sp.q, status: sp.status, rq: sp.rq, rsort: sp.rsort, rdir: sp.rdir,
  }) as Route;
  const query = (sp.q ?? "").trim();
  const statusFilter = (sp.status ?? "").trim();
  const rosterQuery = (sp.rq ?? "").trim();

  const cfg = getAgentConfig();
  const lipaCfg = getLipaConfig();
  const fee = feeBreakdown(cfg);
  const now = Date.now();

  const [appsR, invR, rosterR, rewardsR, totalsR] = await Promise.all([
    read(() => db.agentApplication.list()),
    read(() => db.agentInvitation.list()),
    read(() => getAgentRoster()),
    read(() => db.referralReward.list(PAYABLES_PAGE)),
    read(() => db.referralReward.totals()),
  ]);

  // ── Applications ──
  const allApps = appsR.ok ? appsR.data : [];
  /**
   * ⛔ THE KPI BAND AND THE TAB COUNTS MEASURE THE WHOLE PROGRAMME, NEVER THE SEARCH RESULT.
   * An officer who types a name must not see "Awaiting review: 1" and read it as the size of
   * the queue. These are deliberately computed over `allApps`; the CARDS below are the
   * filtered view and say so in their own captions.
   */
  const allReview = allApps.filter((a) => a.status === "UNDER_REVIEW");
  const allRefundsOwed = allApps.filter((a) => a.feeDisposition === "REFUND_DUE");
  // 🔴 WORKING DAYS, BECAUSE THAT IS WHAT THE APPLICANT WAS PROMISED. This measured CALENDAR
  // days against a promise management moved to working days on 2026-09-08, so an application
  // submitted on a Friday was chipped "Past SLA" on the following Wednesday while `/agent` had
  // promised the applicant until Friday. `workingDaysBetween` now decides both.
  const overdueReviews = allReview.filter((a) => a.submittedAt && workingDaysBetween(a.submittedAt, new Date(now)) > cfg.reviewSlaDays).length;
  const overdueRefunds = allRefundsOwed.filter((a) => a.feeRefundDueAt && Date.parse(a.feeRefundDueAt) < now).length;
  const refundsOwedTzs = allRefundsOwed.reduce((s, a) => s + (a.feeAmountTzs ?? 0), 0);

  // ── Invitations ──
  const invitations = invR.ok ? invR.data : [];
  const liveInvitations = invitations.filter((i) => i.status === "ISSUED").sort((x, y) => x.expiresAt.localeCompare(y.expiresAt));
  // ⭐ Live invitations always show in full — they are a worklist. Only the HISTORY pages,
  // and it now discloses its own size instead of silently cutting at ten.
  const pastAll = invitations.filter((i) => i.status !== "ISSUED").sort((x, y) => y.updatedAt.localeCompare(x.updatedAt));
  const iPage = parsePage(sp.ipage, pastAll.length);
  const pastInvitations = pastAll.slice((iPage - 1) * INVITATION_HISTORY_PAGE, iPage * INVITATION_HISTORY_PAGE);

  // ── Roster + payables ──
  const rosterAll = rosterR.ok ? rosterR.data : [];
  const rosterByUser = new Map(rosterAll.map((r) => [r.userId, r] as const));
  // ⛔ Over the WHOLE roster, like the other KPIs — not over a search result.
  const activeAgents = rosterAll.filter((r) => r.standing === "ACTIVE").length;
  const rosterParsed = parseQuery(rosterQuery, { fields: fieldNames(AGENT_ROSTER_SEARCH) });
  const rosterFiltered = rosterAll.filter((r) => matchesQuery(rosterParsed, r as unknown as Record<string, string | null | undefined>, AGENT_ROSTER_SEARCH));
  /**
   * ⭐ THE ROSTER IS SORTABLE, and the default stays what the caption has always claimed:
   * by net fee generated. ⚠️ Every comparator ends in a stable tie-break on `userId`, because
   * `sort.ts` is explicit that without one the order of two equal rows is whatever order they
   * arrived in — a list that reshuffles under the reader on every navigation for no reason
   * they can see.
   */
  const rsort = (["fee", "commission", "recruits", "name"] as const).includes(sp.rsort as never) ? (sp.rsort as "fee" | "commission" | "recruits" | "name") : "fee";
  const rdir: "asc" | "desc" = sp.rdir === "asc" ? "asc" : "desc";
  const rosterSorted = [...rosterFiltered].sort((x, y) => {
    const n = rsort === "name"
      ? String(x.handle || x.userId).localeCompare(String(y.handle || y.userId))
      : rsort === "recruits" ? x.recruits - y.recruits
      : rsort === "commission" ? x.commissionTzs - y.commissionTzs
      : x.revenueTzs - y.revenueTzs;
    return (rdir === "asc" ? n : -n) || x.userId.localeCompare(y.userId);
  });
  const roster = rosterSorted;

  const payablesAll = (rewardsR.ok ? rewardsR.data : [])
    .filter((r) => r.programme === "AGENT" && r.type === "COMMISSION" && r.status === "PENDING")
    .sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  const pPage = parsePage(sp.ppage, payablesAll.length);
  const payables = payablesAll.slice((pPage - 1) * PER_PAGE, pPage * PER_PAGE);
  // ⛔ The KPI is NOT the page summed — it is the grouped aggregate, which cannot truncate.
  const payableCell = (totalsR.ok ? totalsR.data : []).filter((c) => c.programme === "AGENT" && c.type === "COMMISSION" && c.status === "PENDING");
  const payableTzs = payableCell.reduce((s, c) => s + c.sumTzs, 0);
  const payableCount = payableCell.reduce((s, c) => s + c.count, 0);
  // The workstation is keyed by APPLICATION; the roster by user. One map joins them.
  // ⛔ Over `allApps`, NOT the filtered set: this join decides whether a roster row has a
  // "Rate · standing" link at all, and a row whose link vanished because the officer typed
  // something in the OTHER tab's search box would be unmanageable for no visible reason.
  const approvedAppByUser = new Map(allApps.filter((a) => a.status === "APPROVED").map((a) => [a.userId, a.id] as const));

  /**
   * ⭐ THE SEARCH FILTERS THE APPLICATIONS BEFORE THEY ARE PARTITIONED, so every card below
   * shows the same population and their counts cannot disagree with each other.
   *
   * ⛔ AND THE NAME AND PHONE ARE JOINED FIRST. `AGENT_SEARCH` is a VIEW-MODEL schema: an
   * officer searches for "Asha" or a phone number, neither of which is a column on
   * AgentApplication. Filtering before the join would have made the two most useful search
   * terms silently match nothing — the failure mode that looks exactly like "no results".
   */
  const ids = new Set<string>();
  for (const a of allApps) ids.add(a.userId);
  for (const r of payables) { ids.add(r.referrerUserId); ids.add(r.recruitUserId); }
  const usersR = await read(() => (ids.size ? db.user.findByIds(Array.from(ids)) : Promise.resolve([] as StoredUser[])));
  const userById = new Map((usersR.ok ? usersR.data : []).map((u) => [u.id, u] as const));
  const nameOf = (userId: string) => { const u = userById.get(userId); return u ? displayLabel({ id: u.id, displayName: u.displayName }) : "—"; };

  const parsed = parseQuery(query, { fields: fieldNames(AGENT_SEARCH) });
  const apps = allApps.filter((a) => {
    if (statusFilter && a.status !== statusFilter) return false;
    const u = userById.get(a.userId);
    return matchesQuery(parsed, {
      ...a,
      name: u ? displayLabel({ id: u.id, displayName: u.displayName }) : null,
      phone: u?.phoneE164 ?? null,
    } as unknown as Record<string, string | null | undefined>, AGENT_SEARCH);
  });
  const filtering = query !== "" || statusFilter !== "";

  // Partitioned by whose turn it is — over the FILTERED set.
  const review = apps.filter((a) => a.status === "UNDER_REVIEW").sort((x, y) => (x.submittedAt ?? x.updatedAt).localeCompare(y.submittedAt ?? y.updatedAt));
  const inProgress = apps.filter((a) => IN_PROGRESS.includes(a.status)).sort((x, y) => y.updatedAt.localeCompare(x.updatedAt));
  const closedAll = apps.filter((a) => CLOSED.includes(a.status)).sort((x, y) => (y.reviewedAt ?? y.updatedAt).localeCompare(x.reviewedAt ?? x.updatedAt));
  const refundsOwed = apps.filter((a) => a.feeDisposition === "REFUND_DUE").sort((x, y) => (x.feeRefundDueAt ?? "").localeCompare(y.feeRefundDueAt ?? ""));

  /**
   * 🔴 REAL PAGINATION, replacing three silent truncations.
   *
   * "Decided" was `closed.slice(0, 20)` with a caption reading "newest 20 of 143" and NO next
   * page — so application #21 onward was unreachable from this console at all, and the caption
   * was honest about a dead end rather than being an exit. Invitations were sliced to 10 with
   * the truncation not disclosed anywhere. Payables read 5,000 rows and rendered every match.
   *
   * ⛔ THE COUNT AND THE PAGER READ THE SAME VARIABLE. `counts.ts` records the 2026-08-10
   * incident — a board printing "40 live" over a grid of zero cards — and its rule is that a
   * count is never computed over a wider set than its control would show.
   */
  const dPage = parsePage(sp.dpage, closedAll.length);
  const closed = closedAll.slice((dPage - 1) * PER_PAGE, dPage * PER_PAGE);

  return (
    <>
      <AdminPageHead
        title="Agents"
        sw="Mawakala"
        actions={
          <span className="inline-flex items-center gap-2">
            <Chip variant={cfg.enabled ? "success" : "warning"}>{cfg.enabled ? "Accepting applications" : "Applications closed"}</Chip>
            <Link href="/agent"><Button variant="ghost" size="sm" trailing={<I.externalLink s={12} />}>Public page</Button></Link>
          </span>
        }
      />

      <AdminBody>
        <Tabs
          variant="line"
          value={tab}
          ariaLabel="Agent programme sections"
          tabs={[
            /* ⛔ THE TAB COUNT IS THE PROGRAMME'S, NOT THE SEARCH'S. A rail badge is
               navigation — it tells an officer where the work is — so it must not shrink to
               1 because they typed a name, which would read as "there is one application
               left to review". The filtered figures live in the cards' own captions. */
            { value: "applications", labelEn: "Applications", count: allReview.length, href: tabHref("applications") },
            { value: "agents", labelEn: "Agents", count: rosterAll.length, href: tabHref("agents") },
            { value: "settings", labelEn: "Settings", href: tabHref("settings") },
          ]}
        />

        {/* ⛔ THE "PROGRAMME IS OFF" WARNING BELONGS WHERE THE WORK IS. On the Settings tab
            it sat directly above the switch that causes it, restating what the toggle already
            shows — and the officer who needs the warning is the one looking at a queue they
            cannot act on, not the one already holding the switch. */}
        {!cfg.enabled && tab !== "settings" && (
          <Callout tone="warning" size="md">
            The programme is switched off: the public page shows no application button, invitations cannot be issued and drafts cannot be submitted. Approved agents keep recruiting and earning. Switch it on under Settings.
          </Callout>
        )}

        {/**
          * ⭐ THE BAND MEASURES THE PROGRAMME, AND IT IS NOT RENDERED ON SETTINGS.
          *
          * 🔴 Two defects here. It was drawn on all three tabs, including Settings, where
          * four programme totals are noise above a form about configuration. And every figure
          * was computed from the POST-FILTER lists, so an officer who searched a name would
          * have read "Awaiting review: 1" as the size of the queue — a true number over the
          * wrong population, which `counts.ts` records as the 2026-08-10 incident and treats
          * as a lie regardless of its arithmetic.
          */}
        {tab !== "settings" && (
          <KpiGrid cols="4">
            <AdminKpi label="Awaiting review" sw="Zinasubiri" value={allReview.length} unavailable={!appsR.ok}
              delta={allReview.length === 0 ? "queue clear" : overdueReviews > 0 ? `${overdueReviews} past the ${cfg.reviewSlaDays}-working-day SLA` : `all within ${cfg.reviewSlaDays} working days`} />
            <AdminKpi label="Active agents" sw="Mawakala hai" value={activeAgents} unavailable={!rosterR.ok}
              delta={rosterAll.length === activeAgents ? `${rosterAll.length} approved` : `${rosterAll.length - activeAgents} of ${rosterAll.length} not active`} />
            <AdminKpi label="Commission payable" sw="Kamisheni inayodaiwa" value={formatTzs(payableTzs)} gold unavailable={!totalsR.ok}
              delta={payableCount === 0 ? "nothing pending" : `${payableCount} accrual${payableCount === 1 ? "" : "s"} could not be credited`} />
            <AdminKpi label="Refunds owed" sw="Marejesho" value={formatTzs(refundsOwedTzs)} gold unavailable={!appsR.ok}
              delta={allRefundsOwed.length === 0 ? "none owed" : overdueRefunds > 0 ? `${overdueRefunds} past the ${cfg.refundDeadlineDays}-day deadline` : `${allRefundsOwed.length} within ${cfg.refundDeadlineDays} days`} />
          </KpiGrid>
        )}

        {/* ⭐ SEARCH — a plain GET form inside an AdminCard, the same shape /admin/players
            pioneered. No JavaScript: the officer's query is a URL fact, so a filtered queue is
            shareable, survives a refresh, and can be pasted into a ticket. */}
        {tab === "applications" && (
          <AdminCard>
            <form className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="tab" value="applications" />
              <div className="min-w-0 flex-1 sm:min-w-[280px]">
                <label htmlFor="agent-q" className="mb-1 block font-mono text-micro uppercase eyebrow text-text-tertiary">Search applications</label>
                <div className="relative">
                  <I.search s={14} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" />
                  {/* ⚠️ A LITERAL HEIGHT, not `h-8`. `theme.extend.spacing` is overridden in
                      tailwind.config.ts, so `h-8` renders 48px against a 32px contract — the
                      one admin-search height, matching the xs Select beside it. */}
                  <input id="agent-q" name="q" defaultValue={query} placeholder="Name, phone, application id, receipt reference, or 50PICK-AG code"
                    aria-label="Search agent applications"
                    className="h-[var(--h-control-xs)] w-full rounded-md border border-border bg-bg-overlay pl-9 pr-3 text-body-sm text-text outline-none admin-focus transition-colors placeholder:text-text-subtle" />
                </div>
              </div>
              <div className="w-full sm:w-[210px]">
                <label htmlFor="agent-status" className="mb-1 block font-mono text-micro uppercase eyebrow text-text-tertiary">Status</label>
                <Select name="status" defaultValue={statusFilter} size="xs" placeholder="All statuses" ariaLabel="Filter by application status"
                  options={[{ value: "", label: "All statuses" }, ...([...IN_PROGRESS, "UNDER_REVIEW" as const, ...CLOSED].map((st) => ({ value: st, label: AGENT_STATUS[st].en })))]} />
              </div>
              {/* ⛔ THE KIT BUTTON, not a hand-typed `.btn` — §K5, "extend the kit; never fork
                  it", and `test:ui-consistency` fails the build on a raw `.btn` class. It
                  submits the plain GET form, so search still works with JavaScript off. */}
              <Button type="submit" variant="primary" size="xs">Search</Button>
              {filtering && <a href="/admin/agents" className="btn btn-ghost btn-xs">Clear</a>}
            </form>
            {/* ⛔ THE COUNT IS OVER THE SAME SET THE CARDS BELOW RENDER — `counts.ts`, the
                2026-08-10 incident: a true number over the wrong population is still a lie. */}
            <p className="mt-2 text-body-sm text-text-tertiary">
              {filtering
                ? `${apps.length} of ${allApps.length} ${allApps.length === 1 ? "application" : "applications"} match`
                : `${allApps.length} ${allApps.length === 1 ? "application" : "applications"}`}
            </p>
          </AdminCard>
        )}

        {/* ═══════════════ APPLICATIONS ═══════════════ */}
        {tab === "applications" && (<>
          {!appsR.ok ? <AdminLoadError what="the application queue" /> : (<>
            <AdminCard title="Review queue" sw="Foleni ya mapitio" padding="p-0"
              action={<span className="font-mono text-body-sm text-text-subtle">oldest first · SLA {cfg.reviewSlaDays} working days</span>}>
              {review.length === 0 ? (
                <EmptyBlock kind="kyc" title="Nothing to review" body="Submitted applications appear here, oldest first." />
              ) : (
              <ScrollX label="Applications awaiting review">
                <table className="admin-tbl min-w-[720px]">
                  <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
                    <tr>
                      <th className="text-left p-3">Applicant</th>
                      <th className="text-left p-3">Source</th>
                      <th className="text-left p-3">Fee</th>
                      <th className="text-left p-3">Submitted</th>
                      <th className="text-left p-3">Waiting</th>
                      <th className="text-right p-3">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {review.map((a) => <ApplicationRow key={a.id} app={a} name={nameOf(a.userId)} phone={userById.get(a.userId)?.phoneE164 ?? null} waitingDays={a.submittedAt ? workingDaysBetween(a.submittedAt, new Date(now)) : null} slaDays={cfg.reviewSlaDays} />)}
                  </tbody>
                </table>
              </ScrollX>
              )}
            </AdminCard>

            {/* Money owed OUT — the refund clock is a promise made on the public page. */}
            <AdminCard title="Refunds owed" sw="Marejesho yanayodaiwa" padding="p-0"
              action={<span className="font-mono text-body-sm text-text-subtle">a rejected fee goes back within {cfg.refundDeadlineDays} days</span>}>
              {refundsOwed.length === 0 ? (
                <EmptyBlock kind="admin" title="No refunds owed" body="A rejected or withdrawn application whose fee was collected lands here until the refund is recorded." />
              ) : (
              <ScrollX label="Registration fee refunds owed">
                <table className="admin-tbl min-w-[720px]">
                  <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
                    <tr>
                      <th className="text-left p-3">Applicant</th>
                      <th className="text-left p-3">Outcome</th>
                      <th className="text-right p-3">Amount</th>
                      <th className="text-left p-3">Back to</th>
                      <th className="text-left p-3">Due</th>
                      <th className="text-right p-3">Record</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refundsOwed.map((a) => {
                      const overdue = !!a.feeRefundDueAt && Date.parse(a.feeRefundDueAt) < now;
                      return (
                        <tr key={a.id} className="border-b border-border-subtle">
                          <td className="p-3"><Link href={`/admin/players/${a.userId}` as Route} className="text-text hover:underline">{nameOf(a.userId)}</Link><span className="ml-2 font-mono text-body-sm text-text-subtle">{userById.get(a.userId) ? <Sensitive field="phone" subjectId={a.userId} value={userById.get(a.userId)!.phoneE164} /> : "—"}</span></td>
                          <td className="p-3"><Chip variant={statusVariant(a.status)}>{AGENT_STATUS[a.status].en}</Chip></td>
                          <td className="p-3 text-right tabular amount text-gold-300">{formatTzs(a.feeAmountTzs ?? 0)}</td>
                          <td className="p-3 font-mono text-body-sm text-text-secondary">{a.feeSourceAccount ?? "source not captured"}</td>
                          <td className="p-3 font-mono whitespace-nowrap">
                            {a.feeRefundDueAt ? formatDateShort(a.feeRefundDueAt) : "—"}
                            {overdue && <Chip variant="danger" className="ml-2">Overdue</Chip>}
                          </td>
                          <td className="p-3 text-right"><Link href={`/admin/agents/${a.id}` as Route} className="inline-flex min-h-[44px] items-center gap-1 text-brand-300 hover:underline">Record refund <I.chevronRight s={12} /></Link></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </ScrollX>
              )}
            </AdminCard>

            <AdminCard title="Invitations" sw="Mialiko"
              action={<span className="font-mono text-body-sm text-text-subtle">expire after {cfg.invitationExpiryDays} days · acceptance needs a code emailed to the invited address</span>}>
              <div className="space-y-4">
                {cfg.enabled ? <InviteComposer expiryDays={cfg.invitationExpiryDays} /> : (
                  <p className="text-body-sm text-text-secondary">Invitations cannot be issued while the programme is switched off.</p>
                )}
                {!invR.ok ? <AdminLoadError what="invitations" /> : liveInvitations.length === 0 && pastInvitations.length === 0 ? (
                    <EmptyBlock kind="admin" title="No invitations" body="An invitation you issue appears here until it is accepted, declined, withdrawn or expires." />
                  ) : (
                  <ScrollX label="Invitations">
                    <table className="admin-tbl min-w-[640px]">
                      <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle">
                        <tr>
                          <th className="text-left py-2 pr-3">Sent to</th>
                          <th className="text-left py-2 pr-3">Name</th>
                          <th className="text-left py-2 pr-3">Status</th>
                          <th className="text-left py-2 pr-3">Issued</th>
                          <th className="text-left py-2 pr-3">Expires</th>
                          <th className="text-right py-2 pl-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...liveInvitations, ...pastInvitations].map((i) => <InvitationRow key={i.id} inv={i} now={now} />)}
                      </tbody>
                    </table>
                  </ScrollX>
                  )}
                {/* ⭐ The history was `slice(0, 10)` with the truncation disclosed NOWHERE — an
                    officer looking for a withdrawn invitation from last month simply could not
                    see it and had no way to know it existed. */}
                {pastAll.length > INVITATION_HISTORY_PAGE && (
                  <div className="mt-2 border-t border-border-subtle pt-2">
                    <p className="mb-1.5 font-mono text-body-sm text-text-tertiary">{pastAll.length} closed invitations in total</p>
                    <AdminPagination page={iPage} total={pastAll.length} perPage={INVITATION_HISTORY_PAGE} baseHref={buildBaseHref("/admin/agents", { tab: "applications", q: sp.q, status: sp.status })} param="ipage" />
                  </div>
                )}
              </div>
            </AdminCard>

            <AdminCard title="In progress" sw="Zinaendelea" padding="p-0"
              action={<span className="font-mono text-body-sm text-text-subtle">the applicant&apos;s turn · drafts expire after {cfg.draftExpiryDays} days</span>}>
              {inProgress.length === 0 ? (
                <EmptyBlock kind="admin" title="Nothing in progress" body="Drafts, invited applicants and requests for more information show here." />
              ) : (
              <ScrollX label="Applications in progress">
                <table className="admin-tbl min-w-[720px]">
                  <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
                    <tr>
                      <th className="text-left p-3">Applicant</th>
                      <th className="text-left p-3">Stage</th>
                      <th className="text-left p-3">Source</th>
                      <th className="text-left p-3">Fee</th>
                      <th className="text-left p-3">Last activity</th>
                      <th className="text-right p-3">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inProgress.map((a) => (
                      <tr key={a.id} className="border-b border-border-subtle">
                        <td className="p-3"><Link href={`/admin/players/${a.userId}` as Route} className="text-text hover:underline">{nameOf(a.userId)}</Link><span className="ml-2 font-mono text-body-sm text-text-subtle">{userById.get(a.userId) ? <Sensitive field="phone" subjectId={a.userId} value={userById.get(a.userId)!.phoneE164} /> : "—"}</span></td>
                        <td className="p-3"><Chip variant={statusVariant(a.status)}>{AGENT_STATUS[a.status].en}</Chip></td>
                        <td className="p-3 text-text-secondary">{a.source === "OFFICER_INVITED" ? "Invited" : "Applied"}</td>
                        <td className="p-3"><FeeCell app={a} /></td>
                        <td className="p-3 font-mono whitespace-nowrap">{formatDateShort(a.updatedAt)}</td>
                        <td className="p-3 text-right"><Link href={`/admin/agents/${a.id}` as Route} className="inline-flex min-h-[44px] items-center gap-1 text-brand-300 hover:underline">Open <I.chevronRight s={12} /></Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollX>
              )}
            </AdminCard>

            <AdminCard title="Decided" sw="Zilizoamuliwa" padding="p-0"
              action={<span className="font-mono text-body-sm text-text-subtle">newest decision first · {closedAll.length} in total</span>}>
              {closedAll.length === 0 ? (
                <EmptyBlock kind="admin" title="No decisions yet" body="Approved, rejected, declined, expired and revoked applications are kept here." />
              ) : (
              <ScrollX label="Decided applications">
                <table className="admin-tbl min-w-[720px]">
                  <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
                    <tr>
                      <th className="text-left p-3">Applicant</th>
                      <th className="text-left p-3">Outcome</th>
                      <th className="text-left p-3">Reason</th>
                      <th className="text-left p-3">Fee</th>
                      <th className="text-left p-3">Decided</th>
                      <th className="text-right p-3">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closed.map((a) => (
                      <tr key={a.id} className="border-b border-border-subtle">
                        <td className="p-3"><Link href={`/admin/players/${a.userId}` as Route} className="text-text hover:underline">{nameOf(a.userId)}</Link>{a.agentCode && <span className="ml-2 font-mono text-body-sm text-text-subtle">{a.agentCode}</span>}</td>
                        <td className="p-3"><Chip variant={statusVariant(a.status)}>{AGENT_STATUS[a.status].en}</Chip></td>
                        <td className="p-3 text-text-secondary">{a.status === "APPROVED" && a.approvedRatePct != null ? `${a.approvedRatePct}% of net fee` : a.rejectReason ? AGENT_REJECT_REASON[a.rejectReason].en : "—"}</td>
                        <td className="p-3"><FeeCell app={a} /></td>
                        <td className="p-3 font-mono whitespace-nowrap">{formatDateShort(a.reviewedAt ?? a.updatedAt)}</td>
                        <td className="p-3 text-right"><Link href={`/admin/agents/${a.id}` as Route} className="inline-flex min-h-[44px] items-center gap-1 text-brand-300 hover:underline">Open <I.chevronRight s={12} /></Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollX>
              )}
              {/* ⭐ THE EXIT THAT WAS MISSING. Application #21 onward used to be unreachable. */}
              {closedAll.length > PER_PAGE && (
                <div className="border-t border-border-subtle px-3 py-2">
                  <AdminPagination page={dPage} total={closedAll.length} perPage={PER_PAGE} baseHref={buildBaseHref("/admin/agents", { tab: "applications", q: sp.q, status: sp.status })} param="dpage" />
                </div>
              )}
            </AdminCard>
          </>)}
        </>)}

        {/* ═══════════════ AGENTS ═══════════════ */}
        {tab === "agents" && (<>
          {/* ⭐ ITS OWN SEARCH PARAM. Sharing `?q=` with the Applications tab would mean
              switching tabs silently re-interpreted the officer's query against a different
              entity — a receipt reference matching nothing on a roster reads as "no agents". */}
          <AdminCard>
            <form className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="tab" value="agents" />
              <div className="min-w-0 flex-1 sm:min-w-[280px]">
                <label htmlFor="roster-q" className="mb-1 block font-mono text-micro uppercase eyebrow text-text-tertiary">Search agents</label>
                <div className="relative">
                  <I.search s={14} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" />
                  <input id="roster-q" name="rq" defaultValue={rosterQuery} placeholder="Agent handle or 50PICK-AG code"
                    aria-label="Search the agent roster"
                    className="h-[var(--h-control-xs)] w-full rounded-md border border-border bg-bg-overlay pl-9 pr-3 text-body-sm text-text outline-none admin-focus transition-colors placeholder:text-text-subtle" />
                </div>
              </div>
              <Button type="submit" variant="primary" size="xs">Search</Button>
              {rosterQuery && <a href="/admin/agents?tab=agents" className="btn btn-ghost btn-xs">Clear</a>}
            </form>
            <p className="mt-2 text-body-sm text-text-tertiary">
              {rosterQuery
                ? `${roster.length} of ${rosterAll.length} ${rosterAll.length === 1 ? "agent" : "agents"} match`
                : `${rosterAll.length} ${rosterAll.length === 1 ? "agent" : "agents"} · ${activeAgents} active`}
            </p>
          </AdminCard>
          {/* ⛔ THE ROSTER CAPTION NO LONGER ASSERTS AN ORDER THE HEADERS CAN CHANGE. It used
              to read "by net fee generated" as a flat statement; with sortable columns that
              becomes false the moment an officer clicks one. It now names the DERIVATION,
              which is the part that stays true — and the sorted column says the order. */}
          {!rosterR.ok ? <AdminLoadError what="the agent roster" /> : (
            <AdminCard title="Roster" sw="Orodha ya mawakala" padding="p-0"
              action={<span className="font-mono text-body-sm text-text-subtle">net fee derived from each accrual and its rate · ceiling {cfg.maxCommissionPct}%</span>}>
              {roster.length === 0 ? (
                <EmptyBlock kind="leaderboard" title="No approved agents" body="An agent appears here the moment an application is approved." />
              ) : (
              <ScrollX label="Approved agents">
                <table className="admin-tbl min-w-[1080px]">
                  <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
                    <tr>
                      <SortTh field="name" label="Agent" current={rsort} dir={rdir} sp={{ ...sp, tab: "agents" }} baseHref="/admin/agents" prefix="r" />
                      <th className="text-left p-3">Code</th>
                      <th className="text-left p-3">Standing</th>
                      <SortTh field="recruits" label="Recruits" current={rsort} dir={rdir} align="right" sp={{ ...sp, tab: "agents" }} baseHref="/admin/agents" prefix="r" />
                      <SortTh field="fee" label="Net fee generated" current={rsort} dir={rdir} align="right" sp={{ ...sp, tab: "agents" }} baseHref="/admin/agents" prefix="r" />
                      <SortTh field="commission" label="Commission" current={rsort} dir={rdir} align="right" sp={{ ...sp, tab: "agents" }} baseHref="/admin/agents" prefix="r" />
                      <th className="text-left p-3">Signal</th>
                      <th className="text-right p-3">Manage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((r) => <RosterRow key={r.userId} row={r} workstationId={approvedAppByUser.get(r.userId) ?? null} />)}
                  </tbody>
                </table>
              </ScrollX>
              )}
            </AdminCard>
          )}

          <AdminCard title="Payables" sw="Yanayodaiwa" padding="p-0"
            action={<span className="font-mono text-body-sm text-text-subtle">accrued but not credited · settle out of band with a bank reference</span>}>
            {!rewardsR.ok ? <div className="p-4"><AdminLoadError what="pending agent accruals" /></div> : payables.length === 0 ? (
                <EmptyBlock kind="admin" title="Nothing pending" body="Commission is credited to the agent's cash balance at settlement. A row lands here only when that credit was refused — a cooling-off period or a frozen wallet." />
              ) : (
              <ScrollX label="Pending agent commission accruals">
                <table className="admin-tbl min-w-[880px]">
                  <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
                    <tr>
                      <th className="text-left p-3">Agent</th>
                      <th className="text-left p-3">Recruit</th>
                      <th className="text-left p-3">Market</th>
                      <th className="text-right p-3">Amount</th>
                      <th className="text-left p-3">Accrued</th>
                      <th className="text-left p-3">Why not credited</th>
                      <th className="text-left p-3">Settle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payables.map((r) => <PayableRow key={r.id} reward={r} agent={rosterByUser.get(r.referrerUserId)?.handle ?? nameOf(r.referrerUserId)} recruit={nameOf(r.recruitUserId)} />)}
                  </tbody>
                </table>
              </ScrollX>
              )}
              {/* ⭐ The table read 5,000 rows and rendered every match with no pager — the KPI
                  above it is deliberately the grouped aggregate so IT cannot truncate, but the
                  table could, silently. */}
              {payablesAll.length > PER_PAGE && (
                <div className="border-t border-border-subtle px-3 py-2">
                  <AdminPagination page={pPage} total={payablesAll.length} perPage={PER_PAGE} baseHref={buildBaseHref("/admin/agents", { tab: "agents", rq: sp.rq, rsort: sp.rsort, rdir: sp.rdir })} param="ppage" />
                </div>
              )}
          </AdminCard>
        </>)}

        {/* ═══════════════ SETTINGS ═══════════════ */}
        {tab === "settings" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            <AdminCard title="Programme settings" sw="Mipangilio ya mpango">
              <AgentSettingsForm cfg={cfg} />
            </AdminCard>
            {/* Its own card, directly under the fee it is paid into. The form states
                whether the QR is actually live, because the rule that keeps it honest
                (it renders only when the Lipa number IS the fee destination) can
                otherwise hide it after a perfectly valid-looking save. */}
            <AdminCard title="Lipa payment (QR)" sw="Malipo kwa Lipa (QR)">
              <LipaSettingsForm cfg={lipaCfg} feeDestinationAccount={cfg.feeDestinationAccount} />
            </AdminCard>
            <AdminCard title="In force now" sw="Inayotumika sasa">
              <dl className="space-y-3 text-body-sm">
                <div>
                  <dt className="font-mono text-micro uppercase eyebrow text-text-faint">Registration fee</dt>
                  <dd className="mt-0.5 font-mono text-gold-300">{formatTzs(fee.totalTzs)}</dd>
                  <dd className="text-body-sm text-text-subtle">{cfg.feeVatTreatment === "INCLUSIVE" ? "includes" : "plus"} VAT {cfg.feeVatRatePct}% · <span className="amount">{formatTzs(fee.vatTzs)}</span> tax · <span className="amount">{formatTzs(fee.netTzs)}</span> net</dd>
                </div>
                <div>
                  <dt className="font-mono text-micro uppercase eyebrow text-text-faint">Paid to</dt>
                  <dd className="mt-0.5 text-text">{cfg.feeDestinationName}</dd>
                  <dd className="font-mono text-body-sm text-text-subtle">{cfg.feeDestinationAccount}</dd>
                </div>
                <div>
                  <dt className="font-mono text-micro uppercase eyebrow text-text-faint">Commission</dt>
                  <dd className="mt-0.5 font-mono text-text">{cfg.defaultCommissionPct}% default · {cfg.maxCommissionPct}% ceiling</dd>
                  <dd className="text-body-sm text-text-subtle">of the net fee after TRA and GBT · platform rule {PLATFORM_MAX_COMMISSION_PCT}% (RULES.md §2.10) — the ceiling cannot be set above it</dd>
                  {/* ⭐ THE WITHHOLDING LINE, BESIDE THE RATE IT REDUCES. Management added it on
                      2026-09-08 and it is the difference between what an agent EARNS and what
                      reaches their wallet — so an officer reading the commission rate has to see
                      it in the same breath, not two cards away. */}
                  <dd className="text-body-sm text-text-subtle">
                    {cfg.agentWithholdingTaxPct > 0
                      ? <>less {cfg.agentWithholdingTaxPct}% local withholding tax, deducted at accrual and remitted to HOUSE:TAX</>
                      : <>no withholding tax applies — the agent is credited their gross commission</>}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-micro uppercase eyebrow text-text-faint">Earning window</dt>
                  <dd className="mt-0.5 font-mono text-text">{cfg.commissionWindowMonths === 0 ? "lifetime" : `${cfg.commissionWindowMonths} months from the day each recruit is bound to the agent`}</dd>
                  <dd className="text-body-sm text-text-subtle">{cfg.capPerRecruitTzs === 0 ? "no cap per recruit" : <>capped at <span className="amount">{formatTzs(cfg.capPerRecruitTzs)}</span> per recruit</>}</dd>
                </div>
                <div>
                  <dt className="font-mono text-micro uppercase eyebrow text-text-faint">Clocks</dt>
                  <dd className="mt-0.5 font-mono text-text">review {cfg.reviewSlaDays} working d · refund {cfg.refundDeadlineDays}d</dd>
                  <dd className="font-mono text-body-sm text-text-subtle">invitation {cfg.invitationExpiryDays}d · draft {cfg.draftExpiryDays}d · re-apply after {cfg.reapplyCooldownDays}d</dd>
                </div>
              </dl>
            </AdminCard>
          </div>
        )}
      </AdminBody>
    </>
  );
}

/* ───────────────────────── rows ───────────────────────── */

/**
 * ⭐ An EMPTY list is not a table. At 360 a `min-w-[720px]` table scrolls, and an empty-state row
 * centred in 720px sits mostly off-screen — the officer read "Not…" and "Submitted app…" on the
 * first drive (qa:agent-drive, 2026-09-07). So the empty state renders in the card body, full
 * width, and the table (header included) exists only when there is a row to put in it.
 */
function EmptyBlock({ kind, title, body }: { kind: ComponentProps<typeof EmptyState>["kind"]; title: string; body: string }) {
  return <div className="px-4 py-8"><EmptyState kind={kind} title={title} body={body} /></div>;
}

function FeeCell({ app }: { app: StoredAgentApplication }) {
  const word = AGENT_FEE_DISPOSITION[app.feeDisposition].en;
  switch (app.feeDisposition) {
    case "WAIVED": return <Chip variant="neutral">{word}</Chip>;
    case "COLLECTED": return <span className="font-mono text-body-sm text-success">{word}</span>;
    case "REFUND_DUE": return <Chip variant="warning">{word}</Chip>;
    case "REFUNDED": return <span className="font-mono text-body-sm text-text-secondary">{word}</span>;
    default: return <span className="font-mono text-body-sm text-text-subtle">{app.feeReference ? "Receipt attached" : word}</span>;
  }
}

function ApplicationRow({ app, name, phone, waitingDays, slaDays }: { app: StoredAgentApplication; name: string; phone: string | null; waitingDays: number | null; slaDays: number }) {
  const late = waitingDays != null && waitingDays > slaDays;
  return (
    <tr className="border-b border-border-subtle">
      <td className="p-3"><Link href={`/admin/players/${app.userId}` as Route} className="text-text hover:underline">{name}</Link><span className="ml-2 font-mono text-body-sm text-text-subtle">{phone ? <Sensitive field="phone" subjectId={app.userId} value={phone} /> : "—"}</span></td>
      <td className="p-3 text-text-secondary">{app.source === "OFFICER_INVITED" ? "Invited" : "Applied"}</td>
      <td className="p-3"><FeeCell app={app} /></td>
      <td className="p-3 font-mono whitespace-nowrap">{app.submittedAt ? formatDateTime(app.submittedAt) : "—"}</td>
      <td className="p-3 font-mono whitespace-nowrap">
        {waitingDays == null ? "—" : `${waitingDays}d`}
        {late && <Chip variant="danger" className="ml-2">Past SLA</Chip>}
      </td>
      <td className="p-3 text-right"><Link href={`/admin/agents/${app.id}` as Route} className="inline-flex min-h-[44px] items-center gap-1 text-brand-300 hover:underline">Review <I.chevronRight s={12} /></Link></td>
    </tr>
  );
}

/** Tone from the ONE dictionary; the word from the lexicon (§11a). */
const invitationVariant = (status: StoredAgentInvitation["status"]) => TONE_CHIP[(STATUS_TONE as Record<string, { admin?: keyof typeof TONE_CHIP }>)[status]?.admin ?? "royal"];

function InvitationRow({ inv, now }: { inv: StoredAgentInvitation; now: number }) {
  const expiringSoon = inv.status === "ISSUED" && Date.parse(inv.expiresAt) - now < 2 * DAY_MS;
  /**
   * ⭐ THE ADDRESS COLUMN SHOWS WHICHEVER ADDRESS THE ROW CARRIES, and says which. Invitations
   * issued before 2026-09-08 are phone-bound; every one since is email-bound. ⛔ Rendering
   * `inv.phoneE164` unconditionally would print "null•••ull" on every new row.
   */
  const ch = invitationChannel(inv);
  return (
    <tr className="border-b border-border-subtle">
      <td className="py-2 pr-3 font-mono">
        {!ch ? <span className="text-text-subtle">—</span>
          : ch.kind === "PHONE"
            ? (inv.acceptedUserId
                ? <Sensitive field="phone" subjectId={inv.acceptedUserId} value={ch.address} />
                : maskChannel(ch))
            /* An email is shown masked to the same rule the invitation page uses — first
               character plus the whole domain. The officer typed it; this is confirmation,
               not disclosure, and the console is not the place to re-print a full address. */
            : <span title="Invited by email">{maskChannel(ch)}</span>}
      </td>
      <td className="py-2 pr-3 text-text-secondary">{inv.displayName ?? "—"}</td>
      <td className="py-2 pr-3"><Chip variant={invitationVariant(inv.status)}>{AGENT_INVITATION_STATUS[inv.status].en}</Chip></td>
      <td className="py-2 pr-3 font-mono whitespace-nowrap">{formatDateShort(inv.issuedAt)}</td>
      <td className="py-2 pr-3 font-mono whitespace-nowrap">{formatDateShort(inv.expiresAt)}{expiringSoon && <Chip variant="warning" className="ml-2">Soon</Chip>}</td>
      <td className="py-2 pl-3 text-right">
        {inv.status === "ISSUED" ? <RevokeInvitation invitationId={inv.id} />
          : inv.applicationId ? <Link href={`/admin/agents/${inv.applicationId}` as Route} className="inline-flex min-h-[44px] items-center gap-1 text-brand-300 hover:underline">Open <I.chevronRight s={12} /></Link>
          : <span className="font-mono text-body-sm text-text-subtle">—</span>}
      </td>
    </tr>
  );
}

/** The standing WORD (console English) — the tone comes from STATUS_TONE by the same key. */
const STANDING_WORD: Record<AgentRosterRow["standing"], string> = { ACTIVE: "Active", DEACTIVATED: "Deactivated", SUSPENDED: "Suspended", CLOSED: "Closed", EXCLUDED: "Self-excluded" };
const STANDING_KEY: Record<AgentRosterRow["standing"], string> = { ACTIVE: "ACTIVE", DEACTIVATED: "DEACTIVATED", SUSPENDED: "SUSPENDED", CLOSED: "CLOSED", EXCLUDED: "SELF_EXCLUDED" };
const standingVariant = (standing: AgentRosterRow["standing"]) => TONE_CHIP[(STATUS_TONE as Record<string, { admin?: keyof typeof TONE_CHIP }>)[STANDING_KEY[standing]]?.admin ?? "slate"];

function RosterRow({ row, workstationId }: { row: AgentRosterRow; workstationId: string | null }) {
  return (
    <tr className="border-b border-border-subtle align-top">
      <td className="p-3">
        <Link href={`/admin/players/${row.userId}` as Route} className="text-text hover:underline">{row.handle}</Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-body-sm text-text-subtle">
          <span>since {formatDateShort(row.approvedAt)}</span>
          {workstationId && <Link href={`/admin/agents/${workstationId}` as Route} className="inline-flex min-h-[44px] items-center text-brand-300 hover:underline">application</Link>}
        </div>
      </td>
      <td className="p-3 font-mono">{row.code}<div className="font-mono text-body-sm text-text-subtle">{row.commissionPct == null ? "no rate" : `${row.commissionPct}% of net fee`}</div></td>
      <td className="p-3"><Chip variant={standingVariant(row.standing)}>{STANDING_WORD[row.standing]}</Chip></td>
      <td className="p-3 text-right tabular">{row.recruits}</td>
      <td className="p-3 text-right tabular amount text-gold-300">{formatTzs(row.revenueTzs)}</td>
      <td className="p-3 text-right tabular amount text-gold-300">
        {formatTzs(row.commissionTzs)}
        {row.pendingTzs > 0 && <div className="amount text-body-sm text-warning-500">{formatTzs(row.pendingTzs)} pending</div>}
      </td>
      <td className="p-3">
        {row.marketSkewPct != null && row.skewMarketId ? (
          <Link href={`/admin/markets/${row.skewMarketId}` as Route} className="inline-flex min-h-[44px] items-center">
            <Chip variant="warning">{row.marketSkewPct}% from one market</Chip>
          </Link>
        ) : <span className="font-mono text-body-sm text-text-subtle">no concentration</span>}
      </td>
      <td className="p-3 text-right">{workstationId ? <Link href={`/admin/agents/${workstationId}` as Route} className="inline-flex min-h-[44px] items-center gap-1 text-brand-300 hover:underline">Rate · standing <I.chevronRight s={12} /></Link> : <span className="font-mono text-body-sm text-text-subtle">{row.commissionPct == null ? "no rate" : `${row.commissionPct}%`}</span>}</td>
    </tr>
  );
}

function PayableRow({ reward, agent, recruit }: { reward: StoredReferralReward; agent: string; recruit: string }) {
  return (
    <tr className="border-b border-border-subtle align-top">
      <td className="p-3"><Link href={`/admin/players/${reward.referrerUserId}` as Route} className="text-text hover:underline">{agent}</Link></td>
      <td className="p-3 text-text-secondary">{recruit}</td>
      <td className="p-3">{reward.marketId ? <Link href={`/admin/markets/${reward.marketId}` as Route} className="font-mono text-body-sm text-brand-300 hover:underline">{reward.marketId}</Link> : <span className="font-mono text-body-sm text-text-subtle">—</span>}</td>
      <td className="p-3 text-right tabular amount text-gold-300">{formatTzs(reward.amountTzs)}</td>
      <td className="p-3 font-mono whitespace-nowrap">{formatDateShort(reward.createdAt)}</td>
      <td className="p-3 text-body-sm text-text-secondary">{reward.note ?? "credit refused at settlement"}</td>
      <td className="p-3 min-w-[280px]"><SettlePayable rewardId={reward.id} /></td>
    </tr>
  );
}
