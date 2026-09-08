import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { db } from "@/lib/server/store";
import { currentSession } from "@/lib/server/auth-service";
import { getKycStatus } from "@/lib/server/kyc-service";
import { getAgentConfig } from "@/lib/server/agent-config";
import { feeBreakdown, missingForSubmit, ALL_DOC_SLOTS, AGENT_REFEREE_DOC_HOLD_DAYS } from "@/lib/server/agent-application-service";
import { isApprovedAgent } from "@/lib/server/affiliate-service";
import { isStaffRole } from "@/lib/server/roles";
import { AGENT_STATUS, AGENT_INVITATION_STATUS, AGENT_FEE_DISPOSITION, auditActionLabel } from "@/lib/admin-status-lexicon";
import { Sensitive } from "@/components/ui/sensitive";
import { kycStatusLabel, accountStatusLabel } from "@/components/admin/status-badge";
import { roleLabel } from "@/lib/server/roles";
import { STATUS_TONE, TONE_CHIP } from "@/lib/status-tone";
import { displayLabel } from "@/lib/display-label";
import { formatDateTime, formatTzs } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { getAuditForTargetDurable } from "@/lib/server/audit";
import type { Route } from "next";
import { DocGrid, type DocTile } from "./doc-grid";
import { DecisionRail, type RailState } from "./decision-rail";
import type { AgentDocType } from "@/lib/server/store";

export const metadata = { title: "Admin · Agent application" };
export const dynamic = "force-dynamic";

const DOC_LABEL: Record<AgentDocType, string> = {
  CV: "Curriculum vitae", REQUEST_LETTER: "Request letter", SERIKALI_LETTER: "Serikali ya Mtaa letter",
  REFEREE_ONE_LETTER: "Referee 1 · letter", REFEREE_ONE_ID: "Referee 1 · national ID",
  REFEREE_TWO_LETTER: "Referee 2 · letter", REFEREE_TWO_ID: "Referee 2 · national ID", FEE_RECEIPT: "Fee receipt",
};

/**
 * /admin/agents/[id] — the workstation. Documents in a GRID, the fee panel (gold — money), and
 * the decision rail STICKY-RIGHT above the fold at console width. ⭐ Every disabled action on
 * the rail says WHY: the server computes the preconditions once, here, and the rail renders
 * the reasons rather than a mute button.
 */
export default async function AgentApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = await db.agentApplication.findById(id);
  if (!app) notFound();
  const session = await currentSession();
  const [applicant, docs, kyc, acct, inv, history] = await Promise.all([
    db.user.findById(app.userId),
    db.agentApplicationDoc.listByApplication(app.id),
    getKycStatus(app.userId),
    db.affiliate.findByUserId(app.userId),
    // ⛔ `await`, never `.then` — the memory DAL's `list` is SYNCHRONOUS and `.then` is not a
    // function on an array. The browser drive found this as a route error boundary on the
    // workstation (qa:agent-drive §3, 2026-09-07); Prisma's async twin hid it from every suite.
    (async () => (await db.agentInvitation.list()).find((i) => i.applicationId === app.id) ?? null)(),
    // ⭐ IN THE SAME PARALLEL BLOCK, not awaited after it — this page already fans five reads
    // out at once and a sixth in series would add a round trip to every open of the workstation.
    getAuditForTargetDurable("AgentApplication", app.id, { limit: 40 }),
  ]);
  const cfg = getAgentConfig();
  const fee = feeBreakdown(cfg);
  // ⭐ Once a fee is stamped (reconciled, refund owed, refunded) the panel shows THAT figure — the
  // config fee can change after the money moved, and the record must not follow it.
  const feeShownTzs = app.feeAmountTzs != null && app.feeDisposition !== "NONE" ? app.feeAmountTzs : fee.totalTzs;
  const label = displayLabel({ id: app.userId, displayName: applicant?.displayName ?? null });
  /**
   * ⭐ ONE BATCHED LOOKUP FOR EVERY ACTOR IN THE HISTORY, so a forty-row case file is one
   * query rather than forty. ⚠️ An id that does not resolve renders as the id itself rather
   * than as a blank: an officer whose account was since closed still DID the thing, and
   * printing nothing there would quietly un-attribute a decision.
   */
  const actorIds = Array.from(new Set(history.entries.map((e) => e.actorId).filter((x): x is string => !!x)));
  const actors = actorIds.length ? await db.user.findByIds(actorIds) : [];
  const actorById = new Map(actors.map((u) => [u.id, u] as const));
  const officerLabel = (id: string) => {
    const u = actorById.get(id);
    return u ? displayLabel({ id: u.id, displayName: u.displayName }) : id;
  };
  const tone = (STATUS_TONE as Record<string, Partial<Record<"admin", keyof typeof TONE_CHIP>>>)[app.status === "KYC_SUBMITTED" || app.status === "PAYMENT_PENDING" ? "DRAFT" : app.status]?.admin ?? "royal";

  const tiles: DocTile[] = ALL_DOC_SLOTS.map((s) => {
    const d = docs.find((x) => x.docType === s);
    return {
      docType: s, label: DOC_LABEL[s], uploadedAt: d?.uploadedAt ?? null,
      suppliedBy: d ? (d.suppliedById === app.userId ? "applicant" : "officer") : null,
      rejected: !!d?.rejected, rejectReason: d?.rejectReason ?? null, thirdParty: !!d?.thirdParty, purged: !!d?.purgedAt,
    };
  });
  const missing = await missingForSubmit(app);

  // ── The preconditions, computed ONCE, so every disabled control names its reason ──
  const blocks: string[] = [];
  if (session?.userId === app.userId) blocks.push("This is your own application.");
  if (app.status === "INVITED") blocks.push("The invitee has not accepted the invitation.");
  const invitationWord = inv ? AGENT_INVITATION_STATUS[inv.status].en.toLowerCase() : "";
  if (app.source === "OFFICER_INVITED" && inv && inv.status !== "ACCEPTED") blocks.push(`The invitation is ${invitationWord} — the invitee's acceptance is the second party.`);
  if (app.status === "ADDITIONAL_INFO_REQUIRED") blocks.push("More information was requested and has not been resubmitted.");
  if (app.status === "APPROVED") blocks.push("Already approved.");
  const closedWord = AGENT_STATUS[app.status].en.toLowerCase();
  if (["REJECTED", "DECLINED", "EXPIRED", "REVOKED"].includes(app.status)) blocks.push(`Closed as ${closedWord}.`);
  if (["DRAFT", "KYC_SUBMITTED", "PAYMENT_PENDING"].includes(app.status)) blocks.push("Not submitted yet.");
  if (applicant && isStaffRole(applicant.role)) blocks.push("The applicant is staff — approving would strip their admin access. Reject as a staff conflict.");
  if (isApprovedAgent(acct)) blocks.push("Already an approved agent.");
  const accountWord = applicant ? accountStatusLabel(applicant.status).toLowerCase() : "";
  if (applicant && applicant.status !== "ACTIVE") blocks.push(`The account is ${accountWord}.`);
  if (app.feeDisposition !== "COLLECTED" && app.feeDisposition !== "WAIVED") blocks.push("The fee is neither reconciled nor waived.");
  if (!kyc) blocks.push("No identity verification on file.");
  else if (kyc.status !== "APPROVED" && !(app.source === "OFFICER_INVITED" && kyc.status === "PENDING_REVIEW")) { const kycWord = kycStatusLabel(kyc.status).toLowerCase(); blocks.push(`Identity verification is ${kycWord}.`); }
  // In words, never slot enums (labels §11): the officer reads "Referee 1 · letter", not REFEREE_ONE_LETTER.
  const MISSING_WORD: Record<string, string> = { REFEREES: "both referees and the consent", FEE_RECEIPT: "the fee receipt", FEE_REFERENCE: "the receipt reference", IDENTITY: "the applicant's own identity verification" };
  const missingWords = missing.map((m) => (DOC_LABEL as Record<string, string>)[m] ?? MISSING_WORD[m] ?? m);
  if (missing.length > 0 && app.status === "UNDER_REVIEW") blocks.push(`Missing: ${missingWords.join(", ")}.`);

  const rail: RailState = {
    applicationId: app.id, userId: app.userId, status: app.status, source: app.source,
    approveBlocks: blocks,
    canDecide: (app.status === "UNDER_REVIEW" || app.status === "ADDITIONAL_INFO_REQUIRED") && session?.userId !== app.userId,
    canRequestInfo: app.status === "UNDER_REVIEW" && session?.userId !== app.userId,
    fee: {
      disposition: app.feeDisposition, expectedTzs: feeShownTzs, reference: app.feeReference, attestedTzs: app.feeAttestedTzs,
      statementRef: app.feeStatementRef, reconciledAt: app.feeReconciledAt, waivedAt: app.feeWaivedAt, waiverReason: app.feeWaiverReason,
      refundDueAt: app.feeRefundDueAt, refundedAt: app.feeRefundedAt, refundReference: app.feeRefundReference, sourceAccount: app.feeSourceAccount,
      canReconcile: ["PAYMENT_PENDING", "UNDER_REVIEW", "ADDITIONAL_INFO_REQUIRED"].includes(app.status) && app.feeDisposition === "NONE" && !!app.feeReference && session?.userId !== app.userId,
      canWaive: !["APPROVED", "REJECTED", "DECLINED", "EXPIRED", "REVOKED"].includes(app.status) && app.feeDisposition === "NONE" && session?.userId !== app.userId,
      canRefund: app.feeDisposition === "REFUND_DUE" && session?.userId !== app.userId,
      whyNoReconcile: app.feeDisposition === "WAIVED" ? "Waived." : app.feeDisposition === "COLLECTED" ? "Reconciled." : !app.feeReference ? "The applicant has not recorded a receipt reference." : null,
    },
    defaultRatePct: cfg.defaultCommissionPct, maxRatePct: cfg.maxCommissionPct,
    docSlots: ALL_DOC_SLOTS.map((s) => ({ value: s, label: DOC_LABEL[s] })),
    kycStatus: kyc?.status ?? null,
    invitation: inv ? { id: inv.id, status: inv.status, expiresAt: inv.expiresAt } : null,
    agent: acct && isApprovedAgent(acct) ? { code: acct.code, commissionPct: acct.commissionPct, active: acct.active } : null,
  };

  return (
    <>
      <AdminPageHead
        title={`Agent application · ${label}`}
        sw="Maombi ya uwakala"
        actions={<>
          <Chip variant={TONE_CHIP[tone]}>{AGENT_STATUS[app.status].en}</Chip>
          <Chip variant="neutral">{app.source === "OFFICER_INVITED" ? "Officer-invited" : "Self-service"}</Chip>
          <Link href={"/admin/agents" as never} className="text-body-sm text-brand-300 underline-offset-2 hover:underline">← Queue</Link>
        </>}
      />
      <AdminBody>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4 min-w-0">
            {/* Applicant */}
            <AdminCard title="Applicant" sw="Mwombaji">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-body-sm md:grid-cols-4">
                {/* 🔴 THE APPLICANT'S OWN CONTACT DETAILS WERE THE ONE THING THIS CARD DID NOT
                    SHOW. Both REFEREES' contacts were rendered, and the person under review had
                    a plain unlinked handle — so an officer who needed to call the applicant, or
                    to look at their account, had to go back to the queue and find them again.
                    Every list page on this console already links the handle. */}
                <div><dt className="font-mono text-micro uppercase eyebrow text-text-faint">Account</dt>
                  <dd className="font-mono text-text">
                    <Link href={`/admin/players/${app.userId}` as Route} className="text-brand-300 underline-offset-2 hover:underline">{label}</Link>
                  </dd>
                </div>
                <div><dt className="font-mono text-micro uppercase eyebrow text-text-faint">Phone</dt>
                  <dd className="font-mono text-text">{applicant ? <Sensitive field="phone" subjectId={app.userId} value={applicant.phoneE164} /> : "—"}</dd>
                </div>
                <div><dt className="font-mono text-micro uppercase eyebrow text-text-faint">Email</dt>
                  {/* ⚠️ `break-all`: an address longer than the cell must wrap, not push the
                      four-column grid wider than the console measure. */}
                  <dd className="font-mono text-text break-all">{applicant?.email ? <Sensitive field="email" subjectId={app.userId} value={applicant.email} /> : "—"}</dd>
                </div>
                <div><dt className="font-mono text-micro uppercase eyebrow text-text-faint">Role</dt><dd className="text-text">{applicant ? roleLabel(applicant.role) : "—"}</dd></div>
                {/* ⭐ THE KYC STATUS IS A LINK NOW. `approveAgent` decides identity in the same
                    step for an invitee, and the officer could read the WORD "Approved" here but
                    not the documents behind it without hunting for the player. */}
                <div><dt className="font-mono text-micro uppercase eyebrow text-text-faint">Identity (KYC)</dt>
                  <dd className="text-text">
                    {kyc
                      ? <Link href={`/admin/kyc/${kyc.id}` as Route} className="text-brand-300 underline-offset-2 hover:underline">{kycStatusLabel(kyc.status)}</Link>
                      : "None"}
                  </dd>
                </div>
                <div><dt className="font-mono text-micro uppercase eyebrow text-text-faint">Submitted</dt><dd className="font-mono text-text">{app.submittedAt ? formatDateTime(app.submittedAt) : "—"}</dd></div>
                <div><dt className="font-mono text-micro uppercase eyebrow text-text-faint">Referee 1</dt><dd className="text-text">{app.refereeOneName ?? "—"}{app.refereeOneContact ? <> · <Sensitive field="phone" subjectId={app.userId} value={app.refereeOneContact} /></> : null}</dd></div>
                <div><dt className="font-mono text-micro uppercase eyebrow text-text-faint">Referee 2</dt><dd className="text-text">{app.refereeTwoName ?? "—"}{app.refereeTwoContact ? <> · <Sensitive field="phone" subjectId={app.userId} value={app.refereeTwoContact} /></> : null}</dd></div>
                <div><dt className="font-mono text-micro uppercase eyebrow text-text-faint">Referee consent</dt><dd className="text-text">{app.refereeConsentAt ? formatDateTime(app.refereeConsentAt) : "not attested"}</dd></div>
                <div><dt className="font-mono text-micro uppercase eyebrow text-text-faint">Terms</dt><dd className="font-mono text-text">{app.acceptedTermsVersion ?? "—"}</dd></div>
              </dl>
              {app.infoRequestNote && <p className="mt-3 text-body-sm text-warning-500"><I.info s={12} className="inline mr-1" />Requested: {app.infoRequestNote}</p>}
              {app.rejectNote && <p className="mt-3 text-body-sm text-text-muted">Decision note: {app.rejectNote}</p>}
            </AdminCard>

            {/* Documents — a grid */}
            <AdminCard title="Documents" sw="Nyaraka" action={<span className="font-mono text-body-sm text-text-subtle">Referee IDs are third-party data · held {AGENT_REFEREE_DOC_HOLD_DAYS}d after the decision</span>}>
              <DocGrid applicationId={app.id} tiles={tiles} thirdPartyHoldDays={AGENT_REFEREE_DOC_HOLD_DAYS} />
            </AdminCard>

            {/* Fee panel — gold, money only */}
            <div className="rounded-xl border border-gold-700 p-4" style={{ background: "color-mix(in oklab, var(--gold-500) 8%, var(--bg-elevated))" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-micro uppercase eyebrow font-bold text-gold-300">Registration fee</p>
                  <p className="mt-1 amount text-title-lg font-bold text-gold-300">{formatTzs(feeShownTzs)}</p>
                  <p className="font-mono text-body-sm text-text-subtle">{cfg.feeVatTreatment === "INCLUSIVE" ? "VAT inclusive" : "plus VAT"} · VAT <span className="amount">{formatTzs(fee.vatTzs)}</span></p>
                </div>
                <Chip variant={app.feeDisposition === "COLLECTED" ? "success" : app.feeDisposition === "WAIVED" ? "neutral" : app.feeDisposition === "REFUND_DUE" ? "warning" : app.feeDisposition === "REFUNDED" ? "resolved" : "pending"}>
                  {AGENT_FEE_DISPOSITION[app.feeDisposition].en}
                </Chip>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-body-sm md:grid-cols-4">
                <div><dt className="font-mono text-micro uppercase eyebrow text-text-faint">Receipt ref</dt><dd className="font-mono text-text">{app.feeReference ?? "—"}</dd></div>
                <div><dt className="font-mono text-micro uppercase eyebrow text-text-faint">Attested</dt><dd className="font-mono tabular-nums text-text">{app.feeAttestedTzs !== null ? formatTzs(app.feeAttestedTzs) : "—"}</dd></div>
                <div><dt className="font-mono text-micro uppercase eyebrow text-text-faint">Statement line</dt><dd className="font-mono text-text">{app.feeStatementRef ?? "—"}</dd></div>
                <div><dt className="font-mono text-micro uppercase eyebrow text-text-faint">Reconciled</dt><dd className="font-mono text-text">{app.feeReconciledAt ? formatDateTime(app.feeReconciledAt) : "—"}</dd></div>
                {/* ⚠️ THE SEPARATOR IS CONDITIONAL ON WHAT PRECEDES IT. This read
                    `{ts ? fmt(ts) : ""} · {reason}` and rendered a dangling " · reason" whenever
                    the timestamp was null — a leading punctuation mark with nothing before it,
                    which reads as a missing value rather than as an absent one. */}
                {app.feeDisposition === "WAIVED" && (
                  <div className="col-span-2 md:col-span-4">
                    <dt className="font-mono text-micro uppercase eyebrow text-text-faint">Waived</dt>
                    <dd className="text-text">
                      {[app.feeWaivedAt ? formatDateTime(app.feeWaivedAt) : null, app.feeWaiverReason || null]
                        .filter(Boolean).join(" · ") || "—"}
                    </dd>
                  </div>
                )}
                {(app.feeDisposition === "REFUND_DUE" || app.feeDisposition === "REFUNDED") && (
                  <>
                    <div><dt className="font-mono text-micro uppercase eyebrow text-text-faint">Refund due by</dt><dd className="font-mono text-text">{app.feeRefundDueAt ? formatDateTime(app.feeRefundDueAt) : "—"}</dd></div>
                    <div><dt className="font-mono text-micro uppercase eyebrow text-text-faint">Refunded</dt><dd className="font-mono text-text">{app.feeRefundedAt ? `${formatDateTime(app.feeRefundedAt)} · ${app.feeRefundReference ?? ""}` : "—"}</dd></div>
                    <div><dt className="font-mono text-micro uppercase eyebrow text-text-faint">To</dt><dd className="font-mono text-text">{app.feeSourceAccount ?? "—"}</dd></div>
                  </>
                )}
              </dl>
            </div>

            {/**
              * 🔴 THE WORKSTATION SHOWED NO HISTORY AT ALL.
              *
              * Every mutation on this application writes a COMPLIANCE audit row — the fee
              * reconciliation, the waiver, the info request, the rejection, the approval, each
              * rate change and each standing change — and none of it was rendered. `reviewerId`
              * was even loaded onto the model and never displayed. So an officer could not see
              * who reconciled the fee, who last changed the rate, or whether a colleague had
              * already acted; the only history on the page was `rejectNote` as a single
              * unlabelled line. On a two-party control that is the one thing a case file is for.
              *
              * ⛔ READ DURABLY. The in-memory ring empties on every deploy, so a ring-backed
              * history would show a full record on a warm instance and an empty one an hour
              * later — and an officer reading a blank history concludes nothing happened.
              */}
            <AdminCard title="History" sw="Historia"
              action={<span className="font-mono text-body-sm text-text-subtle">
                {history.total === 0 ? "no recorded actions" : `${history.total} recorded action${history.total === 1 ? "" : "s"}`}
                {history.truncated ? ` · newest ${history.entries.length} shown` : ""}
              </span>}>
              {history.entries.length === 0 ? (
                <EmptyState kind="admin" title="Nothing recorded yet"
                  body="Every decision on this application — the fee, a request for more information, the outcome — is written to the audit chain and appears here." />
              ) : (
                <ol className="space-y-2">
                  {history.entries.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-border-subtle pb-2 last:border-0 last:pb-0">
                      <span className="font-mono text-body-sm tabular-nums whitespace-nowrap text-text-subtle">{formatDateTime(e.createdAt)}</span>
                      <span className="text-body-sm font-semibold text-text">{auditActionLabel(e.action)}</span>
                      {/* ⭐ WHO. The whole point of a two-party control is that the second party
                          is identifiable, so an unattributed row says "the system" rather than
                          rendering a blank — a system action and a missing actor are different
                          facts, and a blank would let one be read as the other. */}
                      <span className="text-body-sm text-text-muted">
                        {e.actorId
                          ? <>by <Link href={`/admin/players/${e.actorId}` as Route} className="text-brand-300 underline-offset-2 hover:underline">{officerLabel(e.actorId)}</Link></>
                          : "by the system"}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </AdminCard>
          </div>

          {/* The decision rail — sticky-right at console width, above the fold */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <DecisionRail state={rail} />
          </div>
        </div>
      </AdminBody>
    </>
  );
}
