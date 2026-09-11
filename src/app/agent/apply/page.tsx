import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { BackLink } from "@/components/ui/back-link";
import { getServerT } from "@/lib/i18n-server";
import { currentSession } from "@/lib/server/auth-service";
import { getAgentConfig } from "@/lib/server/agent-config";
import { lipaDisplay } from "@/lib/server/lipa-config";
import { LIPA_QR_RELEASED } from "@/lib/lipa";
import { applicantView, feeBreakdown, AGENT_REFEREE_DOC_HOLD_DAYS } from "@/lib/server/agent-application-service";
import { getKycStatus } from "@/lib/server/kyc-service";
import { db } from "@/lib/server/store";
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
  /**
   * ⭐ KYC IS NOW READ FOR EVERY APPLICANT, NOT ONLY AN INVITEE.
   *
   * ⚠️ It used to be fetched only for `OFFICER_INVITED`, because only they verify inside the
   * flow. That was complete while the fee was paid out of band. Since 2026-09-10 the fee is paid
   * from the WALLET, and depositing requires identity APPROVED — so the payment step has to know
   * the answer for everybody, or it offers a button that `payFeeFromWallet` is about to refuse.
   * A self-service applicant is already approved (`applicantEligibility` gates the door), so for
   * them this is a confirmation; for an invitee it is the gate that stops a dead end.
   */
  const kyc = await getKycStatus(session.userId);
  const kycGate = view.app.source === "OFFICER_INVITED" ? kycGateState(kyc?.status) : null;
  // The two preconditions DEPOSIT imposes, which the fee now inherits. Read here so the step can
  // render the gate AND the action that clears it, rather than refusing after a click.
  const payer = await db.user.findById(session.userId);
  const wallet = await db.wallet.findByUserId(session.userId);
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
          // ⭐ The fee is SETTLED — by either rail. `feePaid` drives the step's done-state and the
          // wizard's completeness list, so it reads the DISPOSITION and not the evidence of one
          // particular rail (a wallet payment writes no receipt and no reference).
          feePaid: view.app.feeDisposition === "COLLECTED",
          feePaidFromWallet: view.app.feeFundingSource === "WALLET",
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
        /* 🔴 THE DESTINATION CROSSES THE BOUNDARY ONLY WHILE THE QR IS RELEASED.
           `ApplyClient` is "use client", so every prop a SERVER component hands it is
           serialised into the RSC flight payload embedded in the HTML — whatever the component
           renders. The panel's gate at `apply-client.tsx` stops the RENDER and not the SEND, so
           this line published a WITHDRAWN programme's payable bank account to every applicant
           who opened the wizard. Exactly PSC-02, one surface along: "renders nothing" and
           "sends nothing" are different claims.
           ⛔ `destinationName` is gone entirely — nothing consumed it; it was pure payload.
           ⛔ The machinery is untouched and the flag is not tidied away (§0.6): flip
           LIPA_QR_RELEASED and both the prop and the panel come back on their own. */
        fee={{ totalTzs: fee.totalTzs, destinationAccount: LIPA_QR_RELEASED ? cfg.feeDestinationAccount : "" }}
        /* ⭐ THE WALLET RAIL'S THREE FACTS. Sent so the payment step can render a GATE with the
           action that clears it, instead of a button the server is about to refuse — the
           module's "gate the offer, never the refusal" law, and the same discipline
           `wallet/deposit/page.tsx` applies to its own two doors. */
        walletPay={{
          balanceTzs: wallet?.balance ?? 0,
          kycApproved: kyc?.status === "APPROVED",
          emailVerified: !!payer?.emailVerifiedAt,
        }}
        /* The merchant identity behind the QR. `lipaDisplay()` drops the pinned payload —
           that is a build-time assertion, not something a browser needs. The panel renders
           nothing unless this number IS `feeDestinationAccount` above, so the two can never
           name different destinations.
           ⛔ AND IT IS GATED FOR THE SAME REASON AS `fee.destinationAccount` ABOVE: dropping
           `qrPayload` kept the PINNED payload out of the browser, but the other five fields —
           merchant name, Lipa number, USSD code, asset path, `enabled: true` — still crossed
           into the flight payload of a withdrawn programme. `null` while the gate is shut. */
        lipa={LIPA_QR_RELEASED ? lipaDisplay() : null}
        limits={{ maxMb: Math.round(MAX_DOC_BYTES / (1024 * 1024)), refereeHoldDays: AGENT_REFEREE_DOC_HOLD_DAYS, reviewSlaDays: cfg.reviewSlaDays }}
      />
    </PageContainer>
  );
}
