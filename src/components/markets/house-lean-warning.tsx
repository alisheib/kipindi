/**
 * HouseLeanWarning — qualitative inline disclosure inside the ConvictionDial
 * when the projected payout/stake ratio is concerning.
 *
 * D3 decision: NO payout figure disclosed (payout is hidden until resolution
 * per license review 2026-05). Text-only warning so the player knows the pool
 * is lopsided without seeing a number that contradicts the "payout at
 * resolution" rule.
 *
 * Two visible states:
 *   thin      — warning tone. "This side is crowded."
 *   negative  — rose tone. "Heavy lean — winning share may be below your stake."
 *   fair      — hidden.
 */
import { I } from "@/components/ui/glyphs";
import type { LeanLevel } from "@/lib/payout";

export function HouseLeanWarning({ level }: { level: LeanLevel }) {
  if (level === "fair") return null;

  const neg = level === "negative";

  return (
    <div
      role={neg ? "alert" : "status"}
      className={`mt-3 flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-[12px] leading-snug ${
        neg
          ? "border-no-700/55 bg-no-500/[0.10]"
          : "border-warning-border bg-warning-bg/30"
      }`}
    >
      <span className={`shrink-0 mt-0.5 ${neg ? "text-no-300" : "text-warning-fg"}`}>
        <I.warning s={15} />
      </span>
      <div className="min-w-0">
        <p className={`text-[12px] font-semibold ${neg ? "text-no-300" : "text-warning-fg"}`}>
          {neg
            ? "Heavy lean on this side — a winning share may be below your stake."
            : "This side is crowded — a winning share may be small."}
        </p>
        <p className="mt-1 text-[11px] text-text-subtle italic">
          {neg
            ? "Upande huu umejaa — mshindi anaweza kupata chini ya dau lake."
            : "Upande huu una watu wengi — gawio linaweza kuwa dogo."}
        </p>
      </div>
    </div>
  );
}
