import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { PageHero } from "@/components/ui/page-hero";
import { ProposalsStateBadge } from "@/components/ui/proposals-state-badge";
import { ProposalsBlockedComposer } from "@/components/proposals/proposals-state-views";
import { currentSession } from "@/lib/server/auth-service";
import { getProposalsConfig, isProposalsActive } from "@/lib/server/proposals-config";
import { db } from "@/lib/server/store";
import { CreateProposalForm } from "./create-form";
import { getServerT } from "@/lib/i18n-server";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.common.submitProposal };
}
export const dynamic = "force-dynamic";

export default async function NewProposalPage() {
  const { t } = await getServerT();
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/proposals/new");

  const cfg = getProposalsConfig();
  const state = cfg.state;
  // DISABLED: the composer is removed from the app — send direct links to the
  // board, which renders the honest "not available" state.
  if (state === "DISABLED") redirect("/proposals");
  const active = isProposalsActive(cfg);

  let proposals: Awaited<ReturnType<typeof db.proposal.listByProposer>> = [];
  if (active) {
    try { proposals = await db.proposal.listByProposer(session.userId); } catch { /* graceful */ }
  }
  const openCount = proposals.filter((p) => p.status === "REVIEW" || p.status === "CHANGES_REQUESTED").length;

  return (
    <main className="mx-auto max-w-[640px] px-3 lg:px-6 py-6 space-y-5">
      <BackLink fallbackHref="/proposals" label={t.proposals.title} />
      <PageHero glow="gold">
        <div className="flex flex-col items-start gap-2">
          <PageHeader eyebrow={t.common.submitProposal} title={t.common.suggestMarket} tone="gold" icon={<I.trophy s={18} />} />
          <ProposalsStateBadge state={state} comingSoonLabel={t.proposals.comingSoonTag} maintenanceLabel={t.proposals.maintenanceTag} />
        </div>
      </PageHero>
      {active ? (
        <CreateProposalForm rateLimit={cfg.rateLimit} openCount={openCount} />
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
    </main>
  );
}
