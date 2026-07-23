import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { getGlobalConfig } from "@/lib/server/market-config";
import { NewMarketWizard } from "./wizard";

export const metadata = { title: "Admin · New market" };
export const dynamic = "force-dynamic";

export default async function NewMarketPage() {
  // What this market WILL freeze at creation — shown read-only in the wizard so the
  // officer (and Jay) can see the fee model + estimate that new polls apply.
  const config = await getGlobalConfig();
  const feeInfo =
    config.feeModel === "loser-share"
      ? {
          model: "loser-share" as const,
          feePct: ((config.platformFeeRate + config.operatorFeeRate) * 100).toFixed(0),
          estMult: (1 + config.estimatedWinningsRate).toFixed(2),
          showEstimate: config.showEstimatedWinnings,
        }
      : {
          model: "capped-commission" as const,
          commissionPct: (config.commissionRate * 100).toFixed(0),
          ceilingPct: (config.feeCeilingRate * 100).toFixed(0),
        };
  return (
    <>
      <AdminPageHead title="New market" sw="Soko jipya" period={false} />
      <div className="px-4 lg:px-6 py-5">
        <AdminCard>
          <NewMarketWizard feeInfo={feeInfo} />
        </AdminCard>
      </div>
    </>
  );
}
