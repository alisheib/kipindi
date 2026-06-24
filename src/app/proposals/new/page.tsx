import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { getProposalsConfig } from "@/lib/server/proposals-config";
import { db } from "@/lib/server/store";
import { CreateProposalForm } from "./create-form";

export const metadata = { title: "Propose a market · Pendekeza" };
export const dynamic = "force-dynamic";

export default async function NewProposalPage() {
  const session = await currentSession();
  if (!session) redirect("/auth/login?next=/proposals/new");

  const cfg = getProposalsConfig();
  const proposals = await db.proposal.listByProposer(session.userId);
  const openCount = proposals.filter((p) => p.status === "REVIEW" || p.status === "CHANGES_REQUESTED").length;

  return (
    <main className="mx-auto max-w-[640px] px-3 lg:px-6 py-6">
      <div className="mb-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">Propose a market · Pendekeza</p>
        <h1 className="mt-1 font-display text-[22px] font-bold leading-tight">Suggest a market to list</h1>
      </div>
      <CreateProposalForm enabled={cfg.enabled} prizeTzs={cfg.prizeTzs} rateLimit={cfg.rateLimit} openCount={openCount} />
    </main>
  );
}
