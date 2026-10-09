/**
 * RewardBurst — the shared "earned peak" crest, remade under the material law
 * (2026-08-08, with the struck-seal win celebration).
 *
 * One calm medallion used at the NON-WIN earned peaks: proposal APPROVED
 * (`/proposals/[id]` — a real bonus, earned money), KYC VERIFIED
 * (`/profile/kyc` — earned status). A gilt-ringed medallion holding the context
 * glyph, an optional struck amount line, an optional Sora caption.
 *
 * ⛔ WHAT DIED HERE, AND WHY (INTAKE §3b — a delivery replaces, it never sits
 * beside): the 12 drawn rays, the corner brackets and the trophy-burst
 * choreography are GONE. M3 bans rays outright, and M7 reserves the celebration
 * vocabulary (seal, needle-sweep, mark-flip, strike) for a WIN — the win moment
 * is `markets/win-celebration.tsx`'s struck seal now, and this crest must never
 * grow back toward it. What earned-status keeps is gold ink and a quiet arrival.
 *
 * Motion is the kit's own: the medallion arrives on `.m-in-lift` (a raised
 * surface arriving), the glyph settles with `.g-settle` (M5 — the arrival
 * primitive, never bespoke keyframes), the amount follows one stagger step.
 * `animate={false}` renders the static end-frame; reduced-motion branches live
 * with the utilities in motion.css (M6).
 *
 * Presentational only (no hooks) so it renders in both server components
 * (the KYC / proposals pages) and client modals.
 *
 * HARD RULE for callers: only ever mount this AFTER the server has confirmed
 * the state (approval, verification) — never optimistically on money.
 *
 * ⭐ `tone` (R5-C, the second gold audit, 2026-10-09). The gilt medallion is for MONEY EARNED — the proposal bonus, which
 * is why it stays the default. KYC VERIFIED is not money: §B11's first correction decides "APPROVED is success-green
 * everywhere … an approval is not money, it is permission", and Q5 says gold is money and nothing else. So the verified
 * crest takes `tone="success"`, the app-state family the KYC rail's done nodes already wear — the same medallion, its
 * ring, face and glyph in success.
 */

import * as React from "react";
import { I } from "@/components/ui/glyphs";
import { cn } from "@/lib/utils";

export type RewardGlyph = "trophy" | "shieldcheck" | "resolved" | "star";

/** The medallion's paint per tone. `gold` = money earned (the default); `success` = an approval (§B11). */
const MEDALLION = {
  gold: {
    border: "2px solid var(--gold-500)",
    background:
      "radial-gradient(circle at 42% 30%, color-mix(in oklab, var(--gold-300) 25%, transparent), color-mix(in oklab, var(--gold-500) 6%, transparent))",
    boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--gold-300) 18%, transparent)",
    color: "var(--gold-300)",
  },
  success: {
    border: "2px solid var(--success)",
    background:
      "radial-gradient(circle at 42% 30%, color-mix(in oklab, var(--success-fg) 25%, transparent), color-mix(in oklab, var(--success) 6%, transparent))",
    boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--success-fg) 18%, transparent)",
    color: "var(--success-fg)",
  },
} as const;

export function RewardBurst({
  glyph = "shieldcheck",
  tone = "gold",
  amount,
  caption,
  captionSub,
  animate = true,
  size = 84,
  className,
}: {
  /** Context glyph inside the medallion. */
  glyph?: RewardGlyph;
  /** `gold` for money earned (the proposal bonus); `success` for an approval (KYC verified). See the header. */
  tone?: keyof typeof MEDALLION;
  /** Earned amount line, pre-formatted — e.g. "+TZS 20,000". Optional. */
  amount?: string;
  /** Sora caption — e.g. "Approved" / "Verified" (localized by the caller). */
  caption?: string;
  /** Muted sub-caption after a middot — e.g. a second-language gloss. */
  captionSub?: string;
  /** Play the entrance choreography. `false` = static end-frame. */
  animate?: boolean;
  /** Medallion diameter in px. The glyph scales from it. */
  size?: number;
  className?: string;
}) {
  const Glyph = I[glyph];
  const glyphSize = Math.round(size * 0.43); // 84 → 36

  return (
    <div className={cn("inline-flex flex-col items-center text-center", className)}>
      {/* The medallion — a ring on a quiet tinted face, in its tone. No rays, no
          brackets, no cast of its own: it sits IN its section, not above it. */}
      <div
        className={cn("grid place-items-center rounded-full", animate && "m-in-lift")}
        style={{
          width: size,
          height: size,
          ...MEDALLION[tone],
        }}
      >
        <span className={cn("inline-flex", animate && "g-settle")}>
          <Glyph s={glyphSize} />
        </span>
      </div>

      {amount && (
        <p
          className={cn("gilt-ink mt-4 font-bold", animate && "g-settle")}
          style={{ fontSize: Math.round(size * 0.26) }}
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
