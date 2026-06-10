import { getProposalsConfig } from "@/lib/server/proposals-config";
import { getAdminProposalStats, getAdminQueue } from "@/lib/server/proposals-service";
import { AdminProposalsClient } from "./admin-proposals-client";

export const metadata = { title: "Proposals · Admin" };
export const dynamic = "force-dynamic";

/**
 * /admin/proposals — player-proposal review console. The admin layout gates
 * the route (ADMIN / COMPLIANCE / MODERATOR + TOTP); each action re-checks
 * the role server-side. Votes only rank the queue — the officer decides.
 */
export default async function AdminProposalsPage() {
  const config = getProposalsConfig();
  const stats = await getAdminProposalStats();
  const queue = await getAdminQueue("all");
  return (
    <div className="px-4 lg:px-6 py-6">
      <AdminProposalsClient config={config} stats={stats} queue={queue} />
    </div>
  );
}
