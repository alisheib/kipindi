import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { BackLink } from "@/components/ui/back-link";
import { getServerT } from "@/lib/i18n-server";
import { currentSession } from "@/lib/server/auth-service";
import { getAgentConfig } from "@/lib/server/agent-config";
import { lipaDisplay } from "@/lib/server/lipa-config";
import { applicantView, feeBreakdown, AGENT_REFEREE_DOC_HOLD_DAYS } from "@/lib/server/agent-application-service";
import { getKycStatus } from "@/lib/server/kyc-service";
import { kycGateState } from "@/lib/kyc-gate-state";
import { MAX_DOC_BYTES } from "@/lib/id-documents";
import { ApplyClient } from "./apply-client";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.agent.applyTitle };
}
export const dynamic = "force-dynamic";

/**
 * /agent/apply — the form. Server half: load the applicant's view and refuse the page to
 * anyone it does not belong to. ⛔ A GET never creates an application; "Apply now" on /agent
 * is a POST that does. No application ⇒ back to /agent, which explains why.
 */
export default async function AgentApplyPage() {
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/agent/apply");
  const view = await applicantView(session.userId);
  // Only an editable application belongs here.
  if (view.state !== "in_progress" && view.state !== "info_required") {
    redirect(view.state === "under_review" || view.state === "rejected" ? "/agent/status" : "/agent");
  }
  const { t } = await getServerT();
  const cfg = getAgentConfig();
  const fee = feeBreakdown(cfg);
  // ⭐ An INVITED applicant verifies their own identity inside this flow (their ID + selfie); the
  // form shows the kit gate until it is at least submitted, instead of a refusal at the end.
  const kyc = view.app.source === "OFFICER_INVITED" ? await getKycStatus(session.userId) : null;
  const kycGate = view.app.source === "OFFICER_INVITED" ? kycGateState(kyc?.status) : null;
  return (
    <PageContainer tier="form" className="space-y-5">
      <BackLink fallbackHref="/agent" label={t.agent.title} />
      <h1 className="sr-only">{t.agent.applyTitle}</h1>
      <ApplyClient
        app={{
          id: view.app.id,
          status: view.app.status,
          source: view.app.source,
          feeReference: view.app.feeReference,
          feeWaived: view.app.feeDisposition === "WAIVED",
          infoRequestNote: view.app.infoRequestNote,
          referees: {
            oneName: view.app.refereeOneName ?? "", oneContact: view.app.refereeOneContact ?? "",
            twoName: view.app.refereeTwoName ?? "", twoContact: view.app.refereeTwoContact ?? "",
            consented: !!view.app.refereeConsentAt,
          },
        }}
        documents={view.documents}
        missing={view.missing}
        kycGate={kycGate}
        fee={{ totalTzs: fee.totalTzs, destinationName: cfg.feeDestinationName, destinationAccount: cfg.feeDestinationAccount }}
        /* The merchant identity behind the QR. `lipaDisplay()` drops the pinned payload —
           that is a build-time assertion, not something a browser needs. The panel renders
           nothing unless this number IS `feeDestinationAccount` above, so the two can never
           name different destinations. */
        lipa={lipaDisplay()}
        limits={{ maxMb: Math.round(MAX_DOC_BYTES / (1024 * 1024)), refereeHoldDays: AGENT_REFEREE_DOC_HOLD_DAYS, reviewSlaDays: cfg.reviewSlaDays }}
      />
    </PageContainer>
  );
}
