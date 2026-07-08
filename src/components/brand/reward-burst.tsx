/**
 * RewardBurst — the shared "earned peak" crest (spec A5).
 *
 * One composable celebration used at every earned-money / earned-status
 * high point: proposal APPROVED (`/proposals/[id]`), KYC VERIFIED
 * (`/profile/kyc`), market-create success, and win payout. A direct port of
 * the kit's living standard (`specimens/50pick-refinement-mockups.html` §A5):
 *
 *   • 12 gilt rays (`--gold-300` → transparent, 1.5px strokes) radiating from
 *   • a corner-bracketed medallion holding the context glyph
 *     (trophy / shieldcheck / resolved star), over
 *   • an optional amount line (JetBrains Mono, `--gold-300`) and
 *   • an optional Sora caption + muted sub-caption.
 *
 * Gold is legitimate on EVERY one of these — each is an earned-money or
 * earned-status peak, the one place the palette permits it.
 *
 * Motion (`animate`): medallion pops (280ms spring) → rays stagger in
 * (420ms) → amount pops. Reduced-motion + `animate={false}` both render the
 * static end-frame (rays at 40%, everything final) — the reduced-motion
 * fallback lives with the `.reward-burst__*` classes in `state-tokens.css`.
 *
 * Presentational only (no hooks) so it renders in both server components
 * (the KYC / proposals pages) and client modals (OperationResultModal).
 *
 * HARD RULE for callers: only ever mount this AFTER the server has confirmed
 * the state (approval, verification, settlement) — never optimistically on
 * money.
 */

import * as React from "react";
import { I } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";

export type RewardGlyph = "trophy" | "shieldcheck" | "resolved" | "star";

export function RewardBurst({
  glyph = "trophy",
  amount,
  caption,
  captionSub,
  animate = true,
  size = 84,
  className,
}: {
  /** Context glyph inside the medallion. */
  glyph?: RewardGlyph;
  /** Earned amount line, pre-formatted — e.g. "+TZS 20,000". Optional. */
  amount?: string;
  /** Sora caption — e.g. "Approved" / "Verified" (localized by the caller). */
  caption?: string;
  /** Muted sub-caption after a middot — e.g. a second-language gloss. */
  captionSub?: string;
  /** Play the entrance choreography. `false` = static end-frame. */
  animate?: boolean;
  /** Medallion diameter in px. Rays + glyph scale from it. */
  size?: number;
  className?: string;
}) {
  const Glyph = I[glyph];
  const raysSize = Math.round(size * 2.619); // 84 → 220 (kit native ray box)
  const glyphSize = Math.round(size * 0.43); // 84 → 36
  const bracket = Math.round(size * 0.167); // 84 → 14
  const inset = -(size * 0.083); // 84 → -7

  return (
    <div className={cn("inline-flex flex-col items-center text-center", className)}>
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        {/* 12 gilt rays — kit A5 geometry (viewBox 0 0 220 220) */}
        <svg
          aria-hidden
          className={animate ? "reward-burst__rays" : undefined}
          width={raysSize}
          height={raysSize}
          viewBox="0 0 220 220"
          style={{
            // Centre with negative margins, NOT translate: the `.reward-burst__rays`
            // entrance animation drives `transform: scale()`, which would clobber a
            // centering translate and shove the starburst off the medallion.
            position: "absolute",
            left: "50%",
            top: "50%",
            marginLeft: -raysSize / 2,
            marginTop: -raysSize / 2,
            overflow: "visible",
            opacity: animate ? undefined : 0.4,
          }}
        >
          <g stroke="var(--gold-300)" strokeWidth={1.5} strokeLinecap="round" opacity={0.8}>
            <path d="M110 26v22" />
            <path d="M110 172v22" />
            <path d="M26 110h22" />
            <path d="M172 110h22" />
            <path d="M51 51l15 15" />
            <path d="M154 154l15 15" />
            <path d="M169 51l-15 15" />
            <path d="M66 154l-15 15" />
            <path d="M76 32l8 20" opacity={0.5} />
            <path d="M144 32l-8 20" opacity={0.5} />
            <path d="M76 188l8-20" opacity={0.5} />
            <path d="M144 188l-8-20" opacity={0.5} />
          </g>
        </svg>

        {/* Corner-bracketed medallion */}
        <div
          className={cn("relative grid place-items-center rounded-full", animate && "reward-burst__medal")}
          style={{
            width: size,
            height: size,
            border: "2px solid var(--gold-500)",
            background:
              "radial-gradient(circle at 35% 30%, color-mix(in oklab, var(--gold-300) 25%, transparent), color-mix(in oklab, var(--gold-500) 6%, transparent))",
            color: "var(--gold-300)",
          }}
        >
          {/* Heraldic gilt corner brackets (top-left + bottom-right) */}
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: inset,
              left: inset,
              width: bracket,
              height: bracket,
              borderTop: "1.5px solid var(--gold-500)",
              borderLeft: "1.5px solid var(--gold-500)",
              borderRadius: "4px 0 0 0",
            }}
          />
          <span
            aria-hidden
            style={{
              position: "absolute",
              bottom: inset,
              right: inset,
              width: bracket,
              height: bracket,
              borderBottom: "1.5px solid var(--gold-500)",
              borderRight: "1.5px solid var(--gold-500)",
              borderRadius: "0 0 4px 0",
            }}
          />
          <Glyph s={glyphSize} />
        </div>
      </div>

      {amount && (
        <p
          className={cn("mt-4 font-mono font-bold tabular-nums", animate && "reward-burst__medal")}
          style={{
            fontSize: Math.round(size * 0.26),
            color: "var(--gold-300)",
            letterSpacing: "-0.01em",
            animationDelay: animate ? "150ms" : undefined,
          }}
        >
          {amount}
        </p>
      )}

      {caption && (
        <p className="mt-1 font-display text-[14px] font-semibold text-text">
          {caption}
          {captionSub && <span className="ml-1 text-[11.5px] font-normal text-text-subtle">· {captionSub}</span>}
        </p>
      )}
    </div>
  );
}
