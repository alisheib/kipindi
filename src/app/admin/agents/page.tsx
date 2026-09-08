import Link from "next/link";
import type { Route } from "next";
import { AdminPageHead, AdminCard, AdminKpi, AdminLoadError } from "@/components/admin/admin-shell";
import { AdminBody, KpiGrid } from "@/components/admin/admin-body";
import { EmptyState } from "@/components/ui/empty-state";
import type { ComponentProps } from "react";
import { buildBaseHref } from "@/components/admin/admin-pagination";
import { Tabs } from "@/components/ui/tabs";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Sensitive } from "@/components/ui/sensitive";
import { ScrollX } from "@/components/ui/scroll-x";
import { I } from "@/components/ui/glyphs";
import { db, type StoredAgentApplication, type StoredAgentInvitation, type StoredReferralReward, type StoredUser } from "@/lib/server/store";
import { getAgentConfig, PLATFORM_MAX_COMMISSION_PCT } from "@/lib/server/agent-config";
import { getAgentRoster, type AgentRosterRow } from "@/lib/server/affiliate-service";
import { feeBreakdown, invitationChannel, maskChannel } from "@/lib/server/agent-application-service";
import { AGENT_STATUS, AGENT_REJECT_REASON, AGENT_INVITATION_STATUS, AGENT_FEE_DISPOSITION } from "@/lib/admin-status-lexicon";
import { STATUS_TONE, TONE_CHIP } from "@/lib/status-tone";
import { displayLabel } from "@/lib/display-label";
import { formatDateShort, formatDateTime, formatTzs } from "@/lib/utils";
import { workingDaysBetween } from "@/lib/business-days";
import { SettlePayable, InviteComposer, RevokeInvitation, AgentSettingsForm } from "./agents-client";

export const metadata = { title: "Admin · Agents" };
export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;
const TABS = ["applications", "agents", "settings"] as const;
type Tab = (typeof TABS)[number];

/** Statuses that are still someone's turn — the applicant's, an invitee's, or the officer's. */
const IN_PROGRESS: readonly StoredAgentApplication["status"][] = ["DRAFT", "INVITED", "KYC_SUBMITTED", "PAYMENT_PENDING", "ADDITIONAL_INFO_REQUIRED"];
const CLOSED: readonly StoredAgentApplication["status"][] = ["APPROVED", "REJECTED", "DECLINED", "EXPIRED", "REVOKED"];
const CLOSED_PAGE = 20;
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
export default async function AdminAgentsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as Tab) : "applications";
  const tabHref = (t: Tab) => buildBaseHref("/admin/agents", { tab: t === "applications" ? undefined : t }) as Route;

  const cfg = getAgentConfig();
  const fee = feeBreakdown(cfg);
  const now = Date.now();

  const [appsR, invR, rosterR, rewardsR, totalsR] = await Promise.all([
    read(() => db.agentApplication.list()),
    read(() => db.agentInvitation.list()),
    read(() => getAgentRoster()),
    read(() => db.referralReward.list(PAYABLES_PAGE)),
    read(() => db.referralReward.totals()),
  ]);

  // ── Applications, partitioned by whose turn it is ──
  const apps = appsR.ok ? appsR.data : [];
  const review = apps.filter((a) => a.status === "UNDER_REVIEW").sort((x, y) => (x.submittedAt ?? x.updatedAt).localeCompare(y.submittedAt ?? y.updatedAt));
  const inProgress = apps.filter((a) => IN_PROGRESS.includes(a.status)).sort((x, y) => y.updatedAt.localeCompare(x.updatedAt));
  const closed = apps.filter((a) => CLOSED.includes(a.status)).sort((x, y) => (y.reviewedAt ?? y.updatedAt).localeCompare(x.reviewedAt ?? x.updatedAt));
  const refundsOwed = apps.filter((a) => a.feeDisposition === "REFUND_DUE").sort((x, y) => (x.feeRefundDueAt ?? "").localeCompare(y.feeRefundDueAt ?? ""));
  // 🔴 WORKING DAYS, BECAUSE THAT IS WHAT THE APPLICANT WAS PROMISED. This measured
  // CALENDAR days against a promise management moved to working days on 2026-09-08, so an
  // application submitted on a Friday was chipped "Past SLA" on the following Wednesday while
  // `/agent` had promised the applicant until Friday. One function decides both.
  const overdueReviews = review.filter((a) => a.submittedAt && workingDaysBetween(a.submittedAt, new Date(now)) > cfg.reviewSlaDays).length;
  const overdueRefunds = refundsOwed.filter((a) => a.feeRefundDueAt && Date.parse(a.feeRefundDueAt) < now).length;
  const refundsOwedTzs = refundsOwed.reduce((s, a) => s + (a.feeAmountTzs ?? 0), 0);

  // ── Invitations ──
  const invitations = invR.ok ? invR.data : [];
  const liveInvitations = invitations.filter((i) => i.status === "ISSUED").sort((x, y) => x.expiresAt.localeCompare(y.expiresAt));
  const pastInvitations = invitations.filter((i) => i.status !== "ISSUED").sort((x, y) => y.updatedAt.localeCompare(x.updatedAt)).slice(0, INVITATION_HISTORY_PAGE);

  // ── Roster + payables ──
  const roster = rosterR.ok ? rosterR.data : [];
  const rosterByUser = new Map(roster.map((r) => [r.userId, r] as const));
  const activeAgents = roster.filter((r) => r.standing === "ACTIVE").length;
  const payables = (rewardsR.ok ? rewardsR.data : [])
    .filter((r) => r.programme === "AGENT" && r.type === "COMMISSION" && r.status === "PENDING")
    .sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  // ⛔ The KPI is NOT the page summed — it is the grouped aggregate, which cannot truncate.
  const payableCell = (totalsR.ok ? totalsR.data : []).filter((c) => c.programme === "AGENT" && c.type === "COMMISSION" && c.status === "PENDING");
  const payableTzs = payableCell.reduce((s, c) => s + c.sumTzs, 0);
  const payableCount = payableCell.reduce((s, c) => s + c.count, 0);
  // The workstation is keyed by APPLICATION; the roster by user. One map joins them.
  const approvedAppByUser = new Map(apps.filter((a) => a.status === "APPROVED").map((a) => [a.userId, a.id] as const));

  // ── One batched user lookup for every row on the page ──
  const ids = new Set<string>();
  for (const a of apps) ids.add(a.userId);
  for (const r of payables) { ids.add(r.referrerUserId); ids.add(r.recruitUserId); }
  const usersR = await read(() => (ids.size ? db.user.findByIds(Array.from(ids)) : Promise.resolve([] as StoredUser[])));
  const userById = new Map((usersR.ok ? usersR.data : []).map((u) => [u.id, u] as const));
  const nameOf = (userId: string) => { const u = userById.get(userId); return u ? displayLabel({ id: u.id, displayName: u.displayName }) : "—"; };

  const ageDays = (iso: string | null) => (iso ? Math.floor((now - Date.parse(iso)) / DAY_MS) : null);

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
            { value: "applications", labelEn: "Applications", count: review.length, href: tabHref("applications") },
            { value: "agents", labelEn: "Agents", count: roster.length, href: tabHref("agents") },
            { value: "settings", labelEn: "Settings", href: tabHref("settings") },
          ]}
        />

        {!cfg.enabled && (
          <Callout tone="warning" size="md">
            The programme is switched off: the public page shows no application button, invitations cannot be issued and drafts cannot be submitted. Approved agents keep recruiting and earning. Switch it on under Settings.
          </Callout>
        )}

        <KpiGrid cols="4">
          <AdminKpi label="Awaiting review" sw="Zinasubiri" value={review.length} unavailable={!appsR.ok}
            delta={review.length === 0 ? "queue clear" : overdueReviews > 0 ? `${overdueReviews} past the ${cfg.reviewSlaDays}-working-day SLA` : `all within ${cfg.reviewSlaDays} working days`} />
          <AdminKpi label="Active agents" sw="Mawakala hai" value={activeAgents} unavailable={!rosterR.ok}
            delta={roster.length === activeAgents ? `${roster.length} approved` : `${roster.length - activeAgents} of ${roster.length} not active`} />
          <AdminKpi label="Commission payable" sw="Kamisheni inayodaiwa" value={formatTzs(payableTzs)} gold unavailable={!totalsR.ok}
            delta={payableCount === 0 ? "nothing pending" : `${payableCount} accrual${payableCount === 1 ? "" : "s"} could not be credited`} />
          <AdminKpi label="Refunds owed" sw="Marejesho" value={formatTzs(refundsOwedTzs)} gold unavailable={!appsR.ok}
            delta={refundsOwed.length === 0 ? "none owed" : overdueRefunds > 0 ? `${overdueRefunds} past the ${cfg.refundDeadlineDays}-day deadline` : `${refundsOwed.length} within ${cfg.refundDeadlineDays} days`} />
        </KpiGrid>

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
              action={<span className="font-mono text-body-sm text-text-subtle">expire after {cfg.invitationExpiryDays} days · acceptance needs an OTP to the invited number</span>}>
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
              action={<span className="font-mono text-body-sm text-text-subtle">newest {Math.min(closed.length, CLOSED_PAGE)} of {closed.length}</span>}>
              {closed.length === 0 ? (
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
                    {closed.slice(0, CLOSED_PAGE).map((a) => (
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
            </AdminCard>
          </>)}
        </>)}

        {/* ═══════════════ AGENTS ═══════════════ */}
        {tab === "agents" && (<>
          {!rosterR.ok ? <AdminLoadError what="the agent roster" /> : (
            <AdminCard title="Roster" sw="Orodha ya mawakala" padding="p-0"
              action={<span className="font-mono text-body-sm text-text-subtle">by net fee generated (derived from each accrual and its rate) · ceiling {cfg.maxCommissionPct}%</span>}>
              {roster.length === 0 ? (
                <EmptyBlock kind="leaderboard" title="No approved agents" body="An agent appears here the moment an application is approved." />
              ) : (
              <ScrollX label="Approved agents">
                <table className="admin-tbl min-w-[1080px]">
                  <thead className="font-mono text-micro eyebrow uppercase text-text-tertiary border-b border-border-subtle bg-bg-sunken/50">
                    <tr>
                      <th className="text-left p-3">Agent</th>
                      <th className="text-left p-3">Code</th>
                      <th className="text-left p-3">Standing</th>
                      <th className="text-right p-3">Recruits</th>
                      <th className="text-right p-3">Net fee generated</th>
                      <th className="text-right p-3">Commission</th>
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
          </AdminCard>
        </>)}

        {/* ═══════════════ SETTINGS ═══════════════ */}
        {tab === "settings" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            <AdminCard title="Programme settings" sw="Mipangilio ya mpango">
              <AgentSettingsForm cfg={cfg} />
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
