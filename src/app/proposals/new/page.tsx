import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { ProposalsStateBadge } from "@/components/ui/proposals-state-badge";
import { ProposalsBlockedComposer } from "@/components/proposals/proposals-state-views";
import { currentSession } from "@/lib/server/auth-service";
import { getProposalsConfig, isProposalsActive } from "@/lib/server/proposals-config";
import { getPlatformTimezone } from "@/lib/server/platform-config";
import { db } from "@/lib/server/store";
import { CreateProposalForm } from "./create-form";
import { getServerT } from "@/lib/i18n-server";
import { PageContainer } from "@/components/layout/page-container";
import { isLockedOut } from "@/lib/server/responsible-gambling";
import { breakSentence, breakStateOf } from "@/lib/break-end";
import { BetBreakNotice } from "@/components/rg/bet-break-notice";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.common.submitProposal };
}
export const dynamic = "force-dynamic";

export default async function NewProposalPage() {
  const { t, locale } = await getServerT();
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/proposals/new");

  const cfg = getProposalsConfig();
  const state = cfg.state;
  // DISABLED: the composer is removed from the app — send direct links to the
  // board, which renders the honest "not available" state.
  if (state === "DISABLED") redirect("/proposals");
  const active = isProposalsActive(cfg);
  /* ⭐ R8-C (2026-10-10, the owner's ruling (4); owner items 16 and 56) · DURING A BREAK, NO OFFER TO PROPOSE AND EARN. A
     reader on a break reaches no door to this composer; a direct visit keeps the page's head and is answered, calmly, where
     the form stood — the break's own approved sentence with its end (`BetBreakNotice`, R6-A's form and words). Read only
     while the programme is open (a closed one draws its own blocked composer), failing OPEN: a failed read is no break. */
  const breakEnd = active
    ? await Promise.resolve().then(() => isLockedOut(session.userId)).then(breakStateOf).catch(() => null)
    : null;
  const breakBody = breakEnd
    ? breakSentence(breakEnd.exclusion ? t.rg.exclusionActive : t.rg.breakActive, breakEnd.until, Date.now(), t.common.monthsShort, locale)
    : null;

  let proposals: Awaited<ReturnType<typeof db.proposal.listByProposer>> = [];
  if (active && !breakBody) {
    try { proposals = await db.proposal.listByProposer(session.userId); } catch { /* graceful */ }
  }
  const openCount = proposals.filter((p) => p.status === "REVIEW" || p.status === "CHANGES_REQUESTED").length;

  return (
    <PageContainer tier="form" className="space-y-5">
      <BackLink fallbackHref="/proposals" label={t.proposals.title} />
      {/* The hero and its eyebrow take the page defaults, not gold (R5-C's gold audit, Q5): proposing a market is not money. */}
      <PageHero>
        <div className="flex flex-col items-start gap-2">
          <PageHeader eyebrow={t.common.submitProposal} title={t.common.suggestMarket} icon={<I.trophy s={18} />} />
          <ProposalsStateBadge state={state} comingSoonLabel={t.proposals.comingSoonTag} maintenanceLabel={t.proposals.maintenanceTag} />
        </div>
      </PageHero>
      {active ? (
        breakBody ? <BetBreakNotice body={breakBody} testId="proposal-new-break" />
        : <CreateProposalForm rateLimit={cfg.rateLimit} openCount={openCount} platformTz={getPlatformTimezone()} />
      ) : (
        <ProposalsBlockedComposer
          state={state}
          title={state === "MAINTENANCE" ? t.proposals.maintenanceTitle : t.proposals.comingSoonTitle}
          body={state === "MAINTENANCE" ? t.proposals.maintenanceBody : t.proposals.comingSoonBody}
          comingSoonLabel={t.proposals.comingSoonTag}
          maintenanceLabel={t.proposals.maintenanceTag}
          backHref="/proposals"
          backLabel={t.common.backToProposals}
        />
      )}
    </PageContainer>
  );
}
