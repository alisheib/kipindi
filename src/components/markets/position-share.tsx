"use client";

/**
 * PositionShare (F5) — share a pick, or share a WIN, from the positions list.
 * WhatsApp-first (Tanzania's default channel), with Web Share + copy fallbacks.
 *
 * HONESTY: the win amount rendered on the share card is NOT taken from this
 * client. We ask the server to mint a signed token for the position; the card
 * re-reads `finalPayout` from the ledger. So a player can only ever share the
 * amount they actually won — and only for a position they actually own.
 *
 * (This is why the share lives here, on the positions list, and NOT on the
 * win-celebration popup: that popup's figure is a place-time projection held in
 * localStorage, which would misstate the settled payout.)
 */
import { useState, useTransition } from "react";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { sideWord } from "@/lib/side-label";
import { cn, formatTzs } from "@/lib/utils";
import { mintWinShareTokenAction } from "@/app/markets/actions";

export function PositionShare({
  marketId,
  marketTitle,
  side,
  positionId,
  won,
  payout,
  refCode,
  className,
}: {
  marketId: string;
  marketTitle: string;
  side: "YES" | "NO";
  positionId?: string;
  /** True only for a settled WIN with a real payout. */
  won?: boolean;
  payout?: number;
  refCode?: string;
  className?: string;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);

  async function buildShare(): Promise<{ url: string; text: string } | null> {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams();
    if (refCode) params.set("ref", refCode);

    if (won && positionId) {
      const r = await mintWinShareTokenAction(positionId);
      if (!r.ok || !r.token) {
        // FEEDBACK LAW (DESIGN_AUTHORITY §F) — warning severity: the mint failed, nothing
        // about the player's position changed, and tapping Share again is the whole remedy.
        toast({ title: t.share.errGeneric, description: t.share.errGenericBody, variant: "factual" });
        return null;
      }
      params.set("w", r.token);
      const url = `${origin}/markets/${marketId}?${params.toString()}`;
      const text = t.share.wonText
        .replace("{amount}", formatTzs(payout ?? 0))
        .replace("{title}", marketTitle);
      return { url, text };
    }

    const qs = params.toString();
    const url = `${origin}/markets/${marketId}${qs ? `?${qs}` : ""}`;
    // §L3 — the share sentence is the reader's language, so the side inside it must be too.
    // This is the one label that leaves the product: it lands in someone else's WhatsApp.
    const text = t.share.pickedText.replace("{side}", sideWord(t, side, "MARKET")).replace("{title}", marketTitle);
    return { url, text };
  }

  function go(e: React.MouseEvent) {
    // The whole card is a <Link> — never let a share click navigate.
    e.preventDefault();
    e.stopPropagation();
    if (busy || pending) return;
    setBusy(true);
    start(async () => {
      try {
        const s = await buildShare();
        if (!s) return;
        const payload = `${s.text}\n${s.url}`;
        // 1. Native share sheet where available (mobile).
        if (typeof navigator !== "undefined" && "share" in navigator) {
          try {
            await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({ text: s.text, url: s.url });
            return;
          } catch { /* user dismissed → fall through to WhatsApp */ }
        }
        // 2. WhatsApp — the default channel in TZ.
        window.open(`https://wa.me/?text=${encodeURIComponent(payload)}`, "_blank", "noopener,noreferrer");
      } finally {
        setBusy(false);
      }
    });
  }

  const label = won ? t.share.shareWin : t.share.sharePick;

  return (
    <button
      type="button"
      onClick={go}
      disabled={busy || pending}
      aria-label={label}
      title={label}
      className={cn(
        // ⚠️ 40px (--tap-min, DA §A2) AS AN ARBITRARY LITERAL: the spacing scale is
        // OVERRIDDEN (tailwind.config.ts:200-215), so `h-10` is 80px, not 40.
        // Matches share-button.tsx's trigger. ⛔ Never a scale token here.
        "inline-flex h-[40px] items-center gap-1.5 rounded-pill border px-3 text-[12px] font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        // GOLD DISCIPLINE: gilt only on the WIN share — that is an earned-money
        // moment. A plain pick share stays neutral.
        won
          ? "border-gold-700/60 bg-gold-500/10 text-gold-300 hover:bg-gold-500/15"
          : "border-border bg-bg-elevated text-text-muted hover:border-brand-400 hover:text-text",
        (busy || pending) && "opacity-60",
        className,
      )}
    >
      <I.messageWhatsapp s={14} />
      {label}
    </button>
  );
}
