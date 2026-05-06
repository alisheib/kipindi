"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { useToast } from "@/components/ui/toast";

/**
 * Share button — uses the browser Web Share API on mobile (one-tap to system
 * share-sheet → WhatsApp/SMS/etc.) and falls back to clipboard-copy on
 * desktop. The OG image at /api/og/market/[id] gives every platform a clean
 * preview card.
 */
export function ShareButton({
  marketId,
  title,
}: {
  marketId: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const onClick = async () => {
    const url = `${window.location.origin}/markets/${marketId}`;
    const text = `${title} — predict on 50pick`;
    if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share) {
      try {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({ title, text, url });
        return;
      } catch {
        /* user cancelled — fall through */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "Link copied", description: url, variant: "default" });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Couldn't copy", variant: "danger" });
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Share this market"
      className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-border bg-bg-elevated px-3 text-[12px] font-mono uppercase tracking-[0.14em] text-text-muted hover:border-border-strong hover:text-text transition-colors"
    >
      {copied ? <Check size={13} aria-hidden /> : <Share2 size={13} aria-hidden />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}
