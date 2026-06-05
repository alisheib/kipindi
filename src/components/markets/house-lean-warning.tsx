/**
 * HouseLeanWarning — subtle inline disclosure inside the ConvictionDial
 * when the projected payout/stake ratio is concerning.
 *
 * Three states (categorised by `houseLean()` in market-config.ts):
 *   fair      — payout ≥ thinProfitRatio × stake (default 1.05). Hidden.
 *   thin      — 1.0 ≤ payout/stake < threshold. Amber tint, "thin profit"
 *               copy. Inform but don't block.
 *   negative  — payout < stake (winner takes a loss after fees). Rose
 *               tint, "net loss" copy + the actual delta.
 *
 * The kit voice forbids hyperbole — this is a calm, factual disclosure.
 */
import { I } from "@/components/ui/glyphs";
import type { LeanLevel } from "@/lib/server/market-config";

export function HouseLeanWarning({
  level,
  payout,
  stake,
}: {
  level: LeanLevel;
  payout: number;
  stake: number;
}) {
  if (level === "fair") return null;
  const delta = payout - stake;
  const sign = delta >= 0 ? "+" : "−";
  const fmt = Math.abs(delta).toLocaleString("en-US");
  const ratio = stake > 0 ? Math.round((payout / stake) * 100) : 0;

  if (level === "thin") {
    return (
      <div
        role="status"
        className="mt-3 flex items-start gap-2.5 rounded-md border border-warning-border bg-warning-bg/30 px-3 py-2.5 text-[12px] leading-snug"
      >
        <I.warning s={14} />
        <div className="min-w-0">
          <p className="font-display font-semibold text-text">
            Heavy lean — thin profit
            <span className="ml-1.5 font-mono text-[11px] text-warning-fg">{ratio}% of stake</span>
          </p>
          <p className="mt-0.5 text-text-muted">
            Most predictors are on this side. Even if you&apos;re right, your share of the net pool is small.
            <span className="block italic text-text-subtle text-[11px]">
              Wengi wameunga upande huu — faida yako ikishinda ni ndogo.
            </span>
          </p>
          <p className="mt-1 font-mono text-[11px] text-text-muted">
            Net if right · {sign}TZS {fmt}
          </p>
        </div>
      </div>
    );
  }

  // negative
  return (
    <div
      role="alert"
      className="mt-3 flex items-start gap-2.5 rounded-md border border-no-700 bg-no-500/[0.10] px-3 py-2.5 text-[12px] leading-snug"
    >
      <I.alertCircle s={14} />
      <div className="min-w-0">
        <p className="font-display font-semibold text-text">
          Heavy lean — net loss after fees
          <span className="ml-1.5 font-mono text-[11px] text-no-300">{ratio}% of stake</span>
        </p>
        <p className="mt-0.5 text-text-muted">
          The winning pool is so dominant that tax + commission outweigh your share. You&apos;d <strong>still
          lose money</strong> on this side at the current pool — even if YES wins.
          <span className="block italic text-text-subtle text-[11px]">
            Bwawa lina mwelekeo mkubwa upande huu, bado utapoteza baada ya kodi.
          </span>
        </p>
        <p className="mt-1 font-mono text-[11px] text-text-muted">
          Net if right · {sign}TZS {fmt}
        </p>
      </div>
    </div>
  );
}
