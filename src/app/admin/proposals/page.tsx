import { AdminPageHead, AdminKpi } from "@/components/admin/admin-shell";
import { Chip } from "@/components/ui/chip";
import { getProposalsConfig } from "@/lib/server/proposals-config";
import { getAdminProposalStats, getAdminQueue } from "@/lib/server/proposals-service";
import { formatTzs, formatNumber } from "@/lib/utils";
import { AdminProposalsClient } from "./admin-proposals-client";

export const metadata = { title: "Proposals · Admin" };
export const dynamic = "force-dynamic";

/**
 * /admin/proposals — player-proposal review console, on the shared admin shell.
 * The route is gated by the admin layout (role + TOTP); each action re-checks
 * the role server-side. Votes only rank the queue — the officer decides.
 */
export default async function AdminProposalsPage() {
  const config = getProposalsConfig();
  const stats = await getAdminProposalStats();
  const queue = await getAdminQueue("all");

  return (
    <>
      <AdminPageHead
        title="Market proposals"
        sw="Mapendekezo ya masoko"
        period={false}
        actions={<Chip size="sm" variant={config.enabled ? "active" : "paused"}>{config.enabled ? "Active" : "Paused"}</Chip>}
      />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Pending review"         sw="Yanasubiri"   value={formatNumber(stats.pending)} delta="awaiting review" deltaDir="flat" />
          <AdminKpi label="Approved · to publish"  sw="Yamekubaliwa" value={formatNumber(stats.approvedAwaitingLive)} delta="ready to go live" deltaDir="flat" />
          <AdminKpi label="Bonuses granted"        sw="Bonasi zilizolipwa" value={formatTzs(stats.bonusesGrantedTzs)} delta="all-time" />
          <AdminKpi label="Top proposer"           sw="Bingwa"       value={stats.topProposer?.handle ?? "—"} delta={stats.topProposer ? `${stats.topProposer.listed} listed` : "none yet"} deltaDir="flat" />
        </div>

        {/* Interactive queue + review + config editor */}
        <AdminProposalsClient config={config} queue={queue} />
      </div>
    </>
  );
}
