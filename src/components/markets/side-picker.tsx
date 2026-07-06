"use client";

/**
 * SidePicker — client wrapper that toggles between the "Pick your side"
 * buttons and the ConvictionDial. When the user clicks YES or NO, the
 * buttons fade out and the full dial reveals inline — no page navigation.
 *
 * This replaces the old flow where clicking YES/NO triggered
 * `window.location.href = /markets/{id}?side=YES` which reloaded the
 * entire page just to pass the `?side` query parameter.
 */

import { useState } from "react";
import { I } from "@/components/ui/glyphs";
import { Chip } from "@/components/ui/chip";
import { ConvictionDial } from "./conviction-dial";
import { NotifyPrompt } from "./notify-prompt";
import { useT } from "@/lib/i18n";

type Props = {
  marketId: string;
  marketTitle: string;
  yesPool: number;
  noPool: number;
  yesPct: number;
  resolutionAt: string;
  balance: number;
  /** Pre-selected side from URL ?side= param (if arriving from card). */
  initialSide?: "YES" | "NO";
  /** Total effective fee for this market — passed straight to the dial so its
   *  payout/lean projection matches server settlement. */
  feeRate?: number;
};

export function SidePicker({
  marketId, marketTitle, yesPool, noPool, yesPct, resolutionAt, balance, initialSide, feeRate,
}: Props) {
  const { t } = useT();
  const [side, setSide] = useState<"YES" | "NO" | null>(initialSide ?? null);

  if (side) {
    return (
      <div className="space-y-3">
        {/* Side indicator + switch button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Chip variant={side === "YES" ? "yes" : "no"} size="lg">
              {side} {side === "YES" ? yesPct : 100 - yesPct}%
            </Chip>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">{t.common.yourPick}</span>
          </div>
          <button
            type="button"
            onClick={() => setSide(null)}
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle hover:text-text transition-colors"
          >
            <I.chevronLeft s={10} />
            {t.market.changeSide}
          </button>
        </div>
        <ConvictionDial
          marketId={marketId}
          yesPool={yesPool}
          noPool={noPool}
          marketTitle={marketTitle}
          resolutionAt={resolutionAt}
          balance={balance}
          lockedSide={side}
          feeRate={feeRate}
        />
        <NotifyPrompt marketId={marketId} marketTitle={marketTitle} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-5 lg:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle text-center">
        {t.common.pickYourSide}
      </p>
      <h3 className="mt-1.5 mb-4 font-display text-[17px] font-bold text-text leading-tight text-center">
        {t.market.whichWay}
      </h3>
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setSide("YES")}
          className="btn btn-yes btn-lg"
          aria-label={t.market.backYesAria.replace("{pct}", String(yesPct))}
        >
          YES <span className="font-mono text-[12.5px] opacity-85">@ {yesPct}%</span>
        </button>
        <button
          type="button"
          onClick={() => setSide("NO")}
          className="btn btn-no btn-lg"
          aria-label={t.market.backNoAria.replace("{pct}", String(100 - yesPct))}
        >
          NO <span className="font-mono text-[12.5px] opacity-85">@ {100 - yesPct}%</span>
        </button>
      </div>
      <p className="mt-3 text-center text-[11px] text-text-subtle leading-snug">
        {t.market.chooseSideHelp}
      </p>
    </div>
  );
}
