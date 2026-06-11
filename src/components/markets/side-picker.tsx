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
import { ConvictionDial } from "./conviction-dial";
import { NotifyPrompt } from "./notify-prompt";

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
};

export function SidePicker({
  marketId, marketTitle, yesPool, noPool, yesPct, resolutionAt, balance, initialSide,
}: Props) {
  const [side, setSide] = useState<"YES" | "NO" | null>(initialSide ?? null);

  if (side) {
    return (
      <div className="space-y-3">
        {/* Side indicator + switch button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex h-7 items-center px-3 rounded-pill font-mono text-[12px] font-bold uppercase tracking-[0.06em] ${
                side === "YES"
                  ? "bg-yes-500/15 text-yes-300 border border-yes-700"
                  : "bg-no-500/15 text-no-300 border border-no-700"
              }`}
            >
              {side} {side === "YES" ? yesPct : 100 - yesPct}%
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Your pick</span>
          </div>
          <button
            type="button"
            onClick={() => setSide(null)}
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle hover:text-text transition-colors"
          >
            <I.chevronLeft s={10} />
            Change side
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
        />
        <NotifyPrompt marketId={marketId} marketTitle={marketTitle} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-5 lg:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle text-center">
        Pick your side · Chagua upande
      </p>
      <h3 className="mt-1.5 mb-4 font-display text-[17px] font-bold text-text leading-tight text-center">
        Which way will it resolve?
      </h3>
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setSide("YES")}
          className="btn btn-yes btn-lg"
          aria-label={`Back YES at ${yesPct}%`}
          style={{ borderRadius: "var(--r-pill)" }}
        >
          YES <span className="font-mono text-[12.5px] opacity-85">{yesPct}%</span>
        </button>
        <button
          type="button"
          onClick={() => setSide("NO")}
          className="btn btn-no btn-lg"
          aria-label={`Back NO at ${100 - yesPct}%`}
          style={{ borderRadius: "var(--r-pill)" }}
        >
          NO <span className="font-mono text-[12.5px] opacity-85">{100 - yesPct}%</span>
        </button>
      </div>
      <p className="mt-3 text-center text-[11px] text-text-subtle leading-snug">
        Choose a side to set your conviction and place your bet.
      </p>
    </div>
  );
}
