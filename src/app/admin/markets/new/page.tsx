import { AdminPageGate } from "@/components/admin/admin-section-gate";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { FormColumn } from "@/components/ui/form-column";
import { getGlobalConfig, readMarketConfigFresh } from "@/lib/server/market-config";
import { describeFeeModel } from "@/lib/payout";
import { getPlatformTimezone } from "@/lib/server/platform-config";
import { NewMarketWizard } from "./wizard";

export const metadata = { title: "Admin · New market" };
export const dynamic = "force-dynamic";

export default async function NewMarketPage() {
  return <AdminPageGate title="Markets"><NewMarketPageContent /></AdminPageGate>;
}

async function NewMarketPageContent() {
  // What this market WILL freeze at creation — shown read-only in the wizard so the
  // officer can see the fee model + estimate that new polls apply.
  // FEE-TAX-2026-10 (R2c) · read FRESH, as `createMarket` itself reads it, so the summary is what this market will freeze
  // — not this container's copy; a read that fails falls back to that copy for display only (creation reads fresh again).
  const fresh = await readMarketConfigFresh().catch(() => null);
  const config = fresh?.ok ? fresh.config : await getGlobalConfig();
  // The one caption every fee label reads — the model named and the rate it charges.
  const caption = (() => { try { return describeFeeModel(config).caption; } catch { return "unreadable rates"; } })();
  // FEE-TAX-2026-10 · every model the config can name gets its own summary — a stake-share platform must never be told
  // its new polls freeze a capped commission.
  const feeInfo =
    config.feeModel === "loser-share"
      ? {
          model: "loser-share" as const,
          caption,
          feePct: ((config.platformFeeRate + config.operatorFeeRate) * 100).toFixed(0),
          estMult: (1 + config.estimatedWinningsRate).toFixed(2),
          showEstimate: config.showEstimatedWinnings,
        }
      : config.feeModel === "stake-share"
        ? {
            model: "stake-share" as const,
            caption,
            feePct: String(Number(((config.platformFeeRate + config.operatorFeeRate) * 100).toFixed(2))),
            taxPct: config.winningsTaxRate === undefined ? null : String(Number((config.winningsTaxRate * 100).toFixed(2))),
          }
        : {
            model: "capped-commission" as const,
            caption,
            commissionPct: (config.commissionRate * 100).toFixed(0),
            ceilingPct: (config.feeCeilingRate * 100).toFixed(0),
          };
  return (
    <>
      <AdminPageHead title="New market" sw="Soko jipya" />
      <div className="px-4 lg:px-6 py-5">
        {/* DESIGN_AUTHORITY B7 — this is a single-column authoring form on the
            1600px console tier. Without a measure the title/criterion fields ran
            the full column: ~1,650px before the console was capped, ~1,490px
            after. `form` (640) rather than `field` (460) because these are
            sentence-length inputs (a market question in EN/SW/ZH), not a
            phone number or an amount. */}
        <FormColumn measure="form">
          <AdminCard>
            {/* The zone the wizard's wall clock is read on — the SAME one every other
                timestamp in this console is displayed in. Passed down so the review step
                can name it; the binding conversion still happens server-side. */}
            <NewMarketWizard feeInfo={feeInfo} platformTz={getPlatformTimezone()} />
          </AdminCard>
        </FormColumn>
      </div>
    </>
  );
}
