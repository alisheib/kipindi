import { AdminPageHead, AdminKpi } from "@/components/admin/admin-shell";
import { Chip } from "@/components/ui/chip";
import { getProposalsConfig, type ProposalsState } from "@/lib/server/proposals-config";
import { getAdminProposalStats, getAdminQueue } from "@/lib/server/proposals-service";
import { formatTzs, formatNumber } from "@/lib/utils";
import { AdminProposalsClient } from "./admin-proposals-client";
import { currentSession } from "@/lib/server/auth-service";
import { canUseControl, CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { AdminBody } from "@/components/admin/admin-body";
import { KpiGrid } from "@/components/admin/admin-body";

export const metadata = { title: "Proposals · Admin" };
export const dynamic = "force-dynamic";

/** Header status chip per feature state — tones mirror the player aesthetic. */
const STATE_CHIP: Record<ProposalsState, { variant: "active" | "gold" | "warning" | "neutral"; label: string }> = {
  ACTIVE: { variant: "active", label: "Active" },
  COMING_SOON: { variant: "gold", label: "Coming soon" },
  MAINTENANCE: { variant: "warning", label: "Maintenance" },
  DISABLED: { variant: "neutral", label: "Disabled" },
};

/**
 * /admin/proposals — player-proposal review console, on the shared admin shell.
 * The route is gated by the admin layout (role + TOTP); each action re-checks
 * the role server-side. Votes only rank the queue — the officer decides.
 */
export default async function AdminProposalsPage() {
  const config = getProposalsConfig();
  const stats = await getAdminProposalStats();
  const queue = await getAdminQueue("all");

  // ⛔ E-27. Two controls on this `trading` page demand other domains — prize config is
  // `accounting`, approving is `growth` (it credits a real bonus). Ask the same question
  // the actions will ask, rather than offering controls that can only bounce.
  const role = (await currentSession())?.role;
  const [canSaveConfig, canApprove] = await Promise.all([
    canUseControl(role, "saveProposalsConfig"),
    canUseControl(role, "approveProposal"),
  ]);

  return (
    <>
      <AdminPageHead
        title="Market proposals"
        sw="Mapendekezo ya masoko"
        actions={<Chip size="sm" variant={STATE_CHIP[config.state].variant}>{STATE_CHIP[config.state].label}</Chip>}
      />

      <AdminBody>
        {/* KPIs */}
        <KpiGrid>
          <AdminKpi label="Pending review"         sw="Yanasubiri"   value={formatNumber(stats.pending)} delta="awaiting review" deltaDir="flat" />
          <AdminKpi label="Approved · to publish"  sw="Yamekubaliwa" value={formatNumber(stats.approvedAwaitingLive)} delta="ready to go live" deltaDir="flat" />
          <AdminKpi label="Bonuses granted"        sw="Bonasi zilizolipwa" value={formatTzs(stats.bonusesGrantedTzs)} delta="all-time" />
          <AdminKpi label="Top proposer"           sw="Bingwa"       value={stats.topProposer?.handle ?? "—"} delta={stats.topProposer ? `${stats.topProposer.listed} listed` : "none yet"} deltaDir="flat" />
        </KpiGrid>

        {/* Interactive queue + review + config editor */}
        <AdminProposalsClient
          config={config}
          queue={queue}
          canSaveConfig={canSaveConfig}
          canApprove={canApprove}
          needSaveConfig={CONTROL_DOMAIN.saveProposalsConfig}
          needApprove={CONTROL_DOMAIN.approveProposal}
        />
      </AdminBody>
    </>
  );
}
