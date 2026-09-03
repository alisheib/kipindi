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
import { sideWord } from "@/lib/side-label";
import type { PollRates } from "@/lib/payout";

type Props = {
  marketId: string;
  marketTitle: string;
  yesPool: number;
  noPool: number;
  yesPct: number;
  resolutionAt: string;
  /** B-10 — the instant BETTING shuts (`selectionClosedAt ?? resolutionAt`),
   *  which is earlier than resolution. The dial flips itself on this one. */
  closesAt?: string;
  /** Server's Date.now() at render — the dial corrects device-clock skew with it. */
  serverNow?: number;
  /** Spendable balance, or undefined when the read failed / signed out — the
   *  dial suppresses its pre-flight "insufficient" warning on undefined (B-1). */
  balance?: number;
  /** Pre-selected side from URL ?side= param (if arriving from card). */
  initialSide?: "YES" | "NO";
  /** Total effective fee for this market — passed straight to the dial so its
   *  payout/lean projection matches server settlement. */
  /** THIS POLL'S frozen fee rates — see PollRates. */
  rates?: PollRates;
  /** Admin-configured stake bounds (getEffectiveConfig) — threaded to the dial
   *  so its range reflects the operator's min/max, not a hardcoded 500–100k. */
  minStake?: number;
  maxStake?: number;
  /** Board to return to after a successful bet — `/updown` for a round, `/markets`
   *  otherwise. Threaded to the dial. */
  boardHref?: string;
};

export function SidePicker({
  marketId, marketTitle, yesPool, noPool, yesPct, resolutionAt, closesAt, serverNow, balance, initialSide, rates, minStake, maxStake, boardHref,
}: Props) {
  const { t } = useT();
  const [side, setSide] = useState<"YES" | "NO" | null>(initialSide ?? null);
  // A crowd price exists only when money is in the pool — `impliedYesPct` returns a
  // hardcoded 50 otherwise. Hoisted out of the JSX deliberately: inline, the pool test
  // and the side test share a line, and `test:outcome` (rightly) flags any line that
  // compares a pool to a number and then yields a YES/NO literal — that is the shape of
  // inferring a settled OUTCOME from the crowd's money. This code does not do that, but
  // it should not have to be told apart from code that does.
  const hasPool = yesPool + noPool > 0;

  if (side) {
    return (
      <div className="space-y-3">
        {/* Side indicator + switch button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Same rule as the pick buttons: no percentage exists on an empty pool. */}
            <Chip variant={side === "YES" ? "yes" : "no"} size="lg">
              {/* §L2 — the word comes from the lexicon, never the stored token. This picker
                  is poll-only; `/markets/[id]` redirects an Up & Down round to `/updown`. */}
              {sideWord(t, side, "MARKET")}{hasPool ? ` ${side === "YES" ? yesPct : 100 - yesPct}%` : ""}
            </Chip>
            <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{t.common.yourPick}</span>
          </div>
          <button
            type="button"
            onClick={() => setSide(null)}
            aria-label={t.market.changeSide}
            /* L6: 44px tap target without growing the row — the negative margin
               absorbs the extra hit area so the layout is unchanged.
               ⚠️ 44 IS WRITTEN AS AN ARBITRARY LITERAL. The spacing scale is
               OVERRIDDEN (tailwind.config.ts:200-215): this said `min-h-11`, which
               is a 96px floor, and `-my-2` is −12px per side (24px total) — so the
               premise failed and the row grew by ~60px on the bet screen. At 44px
               the 24px pull-back genuinely covers it. ⛔ Never a scale token here. */
            className="inline-flex items-center gap-1 min-h-[44px] px-2 -mx-2 -my-2 font-mono text-micro uppercase tracking-[0.12em] text-text-subtle hover:text-text transition-colors"
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
          closesAt={closesAt}
          serverNow={serverNow}
          balance={balance}
          lockedSide={side}
          rates={rates}
          baseStake={minStake}
          maxStake={maxStake}
          boardHref={boardHref}
        />
        <NotifyPrompt marketId={marketId} marketTitle={marketTitle} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-5 lg:p-6">
      <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle text-center">
        {t.common.pickYourSide}
      </p>
      <h3 className="mt-1.5 mb-4 font-display text-[17px] font-bold text-text leading-tight text-center">
        {t.market.whichWay}
      </h3>
      {/* 🔴 NO PRICE ON AN EMPTY POOL — the same rule the card obeys.
          `impliedYesPct` returns a hardcoded 50 when both pools are zero
          (market-service.ts:223), so on a market nobody has bet these buttons read
          "YES @ 50% · NO @ 50%" and presented the default as a crowd price.
          ⛔ It was visible ON THIS PAGE that the two disagreed: the "Similar markets"
          rail below correctly showed "— · No bets yet · Be the first to predict" for
          markets in exactly the same state, while the primary money control above it
          quoted 50%. Found by driving the page, not by a suite.
          RULES law 5 — real data or nothing. */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setSide("YES")}
          className="btn btn-yes btn-lg"
          aria-label={hasPool ? t.market.backYesAria.replace("{pct}", String(yesPct)) : t.market.backYesAriaNoPrice}
        >
          {/* §L2 — the WORD comes from the lexicon, exactly as the chip at :75 and the
              board cards already do. It read the raw `YES` until 2026-09-03 (PV-04), so a
              Chinese player met "YES @ 51%" on the money control while the `.mcardp` cards
              three inches below the same page read "是 @ 56%" — one idea, two vocabularies,
              on one screen. The aria-label was always translated; only the visible word lied.
              PV-10 (same day) — the `@pct%` suffix WAS `opacity-85`, ~3.5:1 on production,
              under AA 4.5. Dropped, not re-hued; see market-card.tsx's PV-10 note. */}
          {sideWord(t, "YES", "MARKET")} {hasPool && <span className="font-mono text-[12.5px]">@ {yesPct}%</span>}
        </button>
        <button
          type="button"
          onClick={() => setSide("NO")}
          className="btn btn-no btn-lg"
          aria-label={hasPool ? t.market.backNoAria.replace("{pct}", String(100 - yesPct)) : t.market.backNoAriaNoPrice}
        >
          {sideWord(t, "NO", "MARKET")} {hasPool && <span className="font-mono text-[12.5px]">@ {100 - yesPct}%</span>}
        </button>
      </div>
      <p className="mt-3 text-center text-body-sm text-text-subtle leading-snug">
        {t.market.chooseSideHelp}
      </p>
    </div>
  );
}
