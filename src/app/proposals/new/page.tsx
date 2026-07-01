import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { currentSession } from "@/lib/server/auth-service";
import { getProposalsConfig } from "@/lib/server/proposals-config";
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
  let proposals: Awaited<ReturnType<typeof db.proposal.listByProposer>> = [];
  try { proposals = await db.proposal.listByProposer(session.userId); } catch { /* graceful */ }
  const openCount = proposals.filter((p) => p.status === "REVIEW" || p.status === "CHANGES_REQUESTED").length;

  return (
    <main className="mx-auto max-w-[640px] px-3 lg:px-6 py-6 space-y-4">
      <Link
        href={"/proposals" as never}
        className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.16em] text-text-subtle hover:text-text"
      >
        <I.chevronLeft s={14} />
        {t.proposals.title}
      </Link>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">{t.common.submitProposal}</p>
        <h1 className="mt-1 font-display text-[22px] font-bold leading-tight">{t.common.suggestMarket}</h1>
      </div>
      <CreateProposalForm enabled={cfg.enabled} prizeTzs={cfg.prizeTzs} rateLimit={cfg.rateLimit} openCount={openCount} />
    </main>
  );
}
