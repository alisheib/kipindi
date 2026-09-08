import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { BackLink } from "@/components/ui/back-link";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { I } from "@/components/ui/glyphs";
import { getServerT } from "@/lib/i18n-server";
import { currentSession } from "@/lib/server/auth-service";
import { applicantView } from "@/lib/server/agent-application-service";
import { inviteViewerFor } from "@/lib/server/affiliate-service";
import { inviteIsLiveFor } from "@/lib/feature-state";
import { fill, formatTzs, formatDateShort } from "@/lib/utils";
import { STATUS_TONE, TONE_CHIP } from "@/lib/status-tone";
import type { AgentApplicationStatus, AgentRejectReason } from "@/lib/server/store";
import { startApplicationAction } from "../apply/actions";
import { fillNodes } from "@/lib/fill-nodes";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.agent.statusTitle };
}
export const dynamic = "force-dynamic";

/**
 * /agent/status — where the applicant stands, and WHAT HAPPENS NEXT AND WHEN. A timeline that
 * shows only where you are, not when you will move, reads as a dead end; the "usually within
 * N days" comes from config. `UNDER_REVIEW` reads "Awaiting Compliance Approval" — the
 * framework's own words. A rejection states the reason, the refund and its deadline, and when
 * they may apply again.
 *
 * ⛔ B-1: a failed read THROWS to the route's error boundary. This page never fabricates
 * "you have no application" on a degraded read — that is a paid registration fee it would be
 * denying.
 */
export default async function AgentStatusPage() {
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/agent/status");
  const { t } = await getServerT();
  const view = await applicantView(session.userId);
  const d = (iso: string) => formatDateShort(iso);

  // An approved agent's home is the dashboard — through the ONE gate every /profile/invite link
  // sits beside (`test:withdrawn-features` §7). A paused agent goes back to /agent, which says so.
  if (view.state === "agent") redirect(inviteIsLiveFor(await inviteViewerFor(session.userId)) ? "/profile/invite" : "/agent");
  if (view.state === "invited") redirect("/agent");

  const statusWord: Record<AgentApplicationStatus, string> = {
    DRAFT: t.agent.statusDraft, INVITED: t.agent.statusInvited, KYC_SUBMITTED: t.agent.statusKycSubmitted, PAYMENT_PENDING: t.agent.statusPaymentPending,
    UNDER_REVIEW: t.agent.statusUnderReview, ADDITIONAL_INFO_REQUIRED: t.agent.statusInfoRequired, APPROVED: t.agent.statusApproved,
    REJECTED: t.agent.statusRejected, DECLINED: t.agent.statusDeclined, EXPIRED: t.agent.statusExpired, REVOKED: t.agent.statusRevoked,
  };
  const reasonWord: Record<AgentRejectReason, string> = {
    INCOMPLETE_DOCUMENTS: t.agent.reasonIncompleteDocuments, DOCUMENT_NOT_LEGIBLE: t.agent.reasonDocumentNotLegible, UNSATISFACTORY_REFEREE: t.agent.reasonUnsatisfactoryReferee,
    DETAILS_MISMATCH: t.agent.reasonDetailsMismatch, FEE_NOT_RECONCILED: t.agent.reasonFeeNotReconciled, STAFF_CONFLICT: t.agent.reasonStaffConflict, OTHER: t.agent.reasonOther,
    SANCTIONED: t.agent.reasonSanctioned, IDENTITY_MISMATCH: t.agent.reasonIdentityMismatch, FRAUD: t.agent.reasonFraud,
  };
  const toneFor = (s: AgentApplicationStatus) => {
    const key = s === "KYC_SUBMITTED" || s === "PAYMENT_PENDING" ? "DRAFT" : s === "APPROVED" ? "APPROVED" : s;
    const entry = (STATUS_TONE as Record<string, Partial<Record<"player" | "admin", keyof typeof TONE_CHIP>>>)[key];
    return TONE_CHIP[entry?.player ?? entry?.admin ?? "royal"];
  };

  return (
    <PageContainer tier="reading" className="space-y-5">
      <BackLink fallbackHref="/agent" label={t.agent.title} />
      <PageHeader eyebrow={t.agent.eyebrow} title={t.agent.statusTitle} />

      {view.state === "none" ? (
        <EmptyState kind="default" title={t.agent.noApplication} body={t.agent.noApplicationBody}
          action={<Link href={"/agent" as never}><Button variant="primary" size="md">{t.agent.title}</Button></Link>} />
      ) : (
        <>
          {/* Where you are */}
          <section className="rounded-xl glass-panel p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">{t.agent.statusReference}</p>
                <p className="font-mono text-body-sm text-text break-all">{view.app.id}</p>
              </div>
              <Chip variant={toneFor(view.app.status)}>{statusWord[view.app.status]}</Chip>
            </div>
            {/* The status chip already carries "Awaiting Compliance Approval" — the same sentence as a
                heading two lines below it read as a stutter on the first drive, so the card says it once. */}
            {view.app.submittedAt && <p className="text-body-sm text-text-muted">{fill(t.agent.submittedOn, { date: d(view.app.submittedAt) })}</p>}
            {view.app.reviewedAt && (view.app.status === "REJECTED" || view.app.status === "APPROVED") && <p className="text-body-sm text-text-muted">{fill(t.agent.decidedOn, { date: d(view.app.reviewedAt) })}</p>}
          </section>

          {/* What happens next — and WHEN */}
          {(view.state === "under_review" || view.state === "info_required" || view.state === "in_progress") && (
            <section className="rounded-xl glass-panel p-4 space-y-2">
              <p className="font-display text-title-sm font-bold leading-tight">{t.agent.nextTitle}</p>
              <ul className="space-y-1.5 text-body-sm leading-snug text-text-muted list-disc pl-4">
                {view.state === "info_required" ? <li>{t.agent.nextInfo}</li> : <li>{fill(t.agent.nextReview, { days: String(view.reviewSlaDays) })}</li>}
                <li>{t.agent.nextDecision}</li>
              </ul>
              {(view.state === "info_required" || view.state === "in_progress") && (
                <Link href={"/agent/apply" as never}><Button variant="primary" size="md" leading={<I.arrowRight s={14} />}>{t.agent.ctaContinue}</Button></Link>
              )}
            </section>
          )}

          {/* A decision */}
          {view.state === "rejected" && (
            <section className="rounded-xl glass-panel p-4 space-y-3">
              <div>
                <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">{t.agent.decisionReason}</p>
                <p className="mt-1 text-body-sm leading-relaxed text-text">{view.app.rejectReason ? reasonWord[view.app.rejectReason] : t.agent.reasonOther}</p>
              </div>
              {/* ⭐ The officer's note reaches the applicant HERE as well as by email — a phone-only applicant never read it otherwise. */}
              {view.app.rejectNote && (
                <div>
                  <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">{t.agent.officerNote}</p>
                  <p className="mt-1 text-body-sm leading-relaxed text-text">{view.app.rejectNote}</p>
                </div>
              )}
              {/* The money — gold + mono */}
              {view.refund && view.refund.amountTzs !== null && (
                <div className="rounded-md border border-gold-700 px-3 py-2" style={{ background: "color-mix(in oklab, var(--gold-500) 8%, transparent)" }}>
                  <p className="font-mono text-body-sm tabular-nums text-gold-300">
                    {view.refund.refundedAt
                      ? fillNodes(t.agent.refunded, { amount: <span className="amount">{formatTzs(view.refund.amountTzs)}</span>, date: d(view.refund.refundedAt), ref: view.refund.reference ?? "—" })
                      : fillNodes(t.agent.refundDue, { amount: <span className="amount">{formatTzs(view.refund.amountTzs)}</span>, date: view.refund.dueAt ? d(view.refund.dueAt) : "—" })}
                  </p>
                </div>
              )}
              <p className="text-body-sm text-text-muted">{view.reapplyAt ? fill(t.agent.reapplyOn, { date: d(view.reapplyAt) }) : t.agent.finalDecision}</p>
              {view.reapplyAt && new Date(view.reapplyAt).getTime() <= Date.now() && (
                <form action={startApplicationAction}><Button type="submit" variant="primary" size="md">{t.agent.startOver}</Button></form>
              )}
            </section>
          )}
          {view.state === "revoked" && (
            <section className="rounded-xl glass-panel p-4 space-y-3">
              <p className="text-body-sm leading-relaxed text-text">{fill(t.agent.revokedBody, { date: view.reapplyAt ? d(view.reapplyAt) : "—" })}</p>
              {view.app.rejectNote && (
                <div>
                  <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">{t.agent.officerNote}</p>
                  <p className="mt-1 text-body-sm leading-relaxed text-text">{view.app.rejectNote}</p>
                </div>
              )}
              {/* The door opens on the date the authority promises — not the same afternoon. */}
              {view.reapplyAt && new Date(view.reapplyAt).getTime() <= Date.now() && (
                <form action={startApplicationAction}><Button type="submit" variant="primary" size="md">{t.agent.startOver}</Button></form>
              )}
            </section>
          )}
          {(view.state === "expired" || view.state === "declined") && (
            <section className="rounded-xl glass-panel p-4 space-y-3">
              <p className="text-body-sm text-text-muted">{statusWord[view.app.status]}</p>
              <form action={startApplicationAction}><Button type="submit" variant="primary" size="md">{t.agent.startOver}</Button></form>
            </section>
          )}
        </>
      )}
    </PageContainer>
  );
}
