import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { FormColumn } from "@/components/ui/form-column";
import { getGlobalConfig } from "@/lib/server/market-config";
import { NewMarketWizard } from "./wizard";

export const metadata = { title: "Admin · New market" };
export const dynamic = "force-dynamic";

export default async function NewMarketPage() {
  // What this market WILL freeze at creation — shown read-only in the wizard so the
  // officer can see the fee model + estimate that new polls apply.
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
        {/* DESIGN_AUTHORITY B7 — this is a single-column authoring form on the
            1600px console tier. Without a measure the title/criterion fields ran
            the full column: ~1,650px before the console was capped, ~1,490px
            after. `form` (640) rather than `field` (460) because these are
            sentence-length inputs (a market question in EN/SW/ZH), not a
            phone number or an amount. */}
        <FormColumn measure="form">
          <AdminCard>
            <NewMarketWizard feeInfo={feeInfo} />
          </AdminCard>
        </FormColumn>
      </div>
    </>
  );
}
