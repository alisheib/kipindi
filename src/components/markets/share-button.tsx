"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";

/**
 * Share button — popover with three native channels:
 *   1. Web Share (mobile only) — system share-sheet
 *   2. WhatsApp deep link — wa.me/?text=URL
 *   3. Copy link — clipboard fallback
 *
 * The OG image at /api/og/market/[id] gives every channel a clean preview.
 */
export function ShareButton({
  marketId,
  title,
  refCode,
}: {
  marketId: string;
  title: string;
  /** Player's referral code — appended as ?ref= so shares track referrals. */
  refCode?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { t } = useT();

  const base = (typeof window !== "undefined" ? window.location.origin : "") + `/markets/${marketId}`;
  const url = refCode ? `${base}?ref=${encodeURIComponent(refCode)}` : base;
  const shareText = t.market.shareText.replace("{title}", title);
  const waLink = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`;
  const hasWebShare = typeof navigator !== "undefined" && "share" in navigator;

  const onWebShare = async () => {
    setOpen(false);
    try {
      await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({ title, text: shareText, url });
    } catch {
      /* user cancelled */
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: t.toast.linkCopied, description: url, variant: "default" });
      setTimeout(() => { setCopied(false); setOpen(false); }, 1500);
    } catch {
      toast({ title: t.toast.couldntCopy, variant: "danger" });
      setOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.dialog.shareMarket}
        aria-haspopup="dialog"
        className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-border bg-bg-elevated px-3 text-[12px] font-mono uppercase tracking-[0.14em] text-text-muted hover:border-border-strong hover:text-text transition-colors"
      >
        {copied ? <I.check s={13} /> : <I.share s={13} />}
        {copied ? t.common.copied : t.common.share}
      </button>

      {/* DA-10 / DS-25 — the kit <Modal> replaced a hand-rolled portal + scrim +
          anchored sheet (own z-index, own ✕, no focus trap, no scroll lock).
          Chrome, a11y and the scrim recipe are all inherited now. */}
      <Modal open={open} onClose={() => setOpen(false)} ariaLabel={t.dialog.shareMarket} maxWidth={360}>
        <p className="mb-2 font-display text-[14px] font-semibold text-text">{t.dialog.shareMarket}</p>
        <div className="-mx-2">
              {hasWebShare && (
                <button
                  type="button"
                  onClick={onWebShare}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-bg-overlay text-left transition-colors"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-brand-500/15 text-brand-300">
                    <I.share s={16} />
                  </span>
                  <span>
                    <span className="block text-[14px] font-semibold text-text">{t.dialog.systemShare}</span>
                    <span className="block text-[12px] text-text-muted">{t.dialog.pickAnyApp}</span>
                  </span>
                </button>
              )}
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-bg-overlay text-left transition-colors"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-yes-500/15 text-yes-300">
                  <WhatsAppMark />
                </span>
                <span>
                  <span className="block text-[14px] font-semibold text-text">WhatsApp</span>
                  <span className="block text-[12px] text-text-muted">{t.dialog.sendToChat}</span>
                </span>
              </a>
              <button
                type="button"
                onClick={onCopy}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-bg-overlay text-left transition-colors"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-bg-overlay text-text-muted">
                  {copied ? <I.check s={16} /> : <LinkMark />}
                </span>
                <span>
                  <span className="block text-[14px] font-semibold text-text">{copied ? t.common.copied : t.common.copyLink}</span>
                  <span className="block font-mono text-[11px] text-text-subtle truncate max-w-full">{url.replace(/^https?:\/\//, "")}</span>
                </span>
              </button>
        </div>
      </Modal>
    </>
  );
}

function WhatsAppMark() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a9 9 0 1 1-3.6-7.2L21 4l-1.8 3.6A9 9 0 0 1 21 12Z" />
      <path d="M9 9c0 4 2 6 6 6 1 0 1.5-.5 1.5-1.5 0-.5-.3-.8-1-.8l-1 .2c-1.5-.4-2.4-1.3-2.8-2.8l.2-1c0-.7-.3-1-.8-1C9.5 8 9 8.5 9 9.5Z" />
    </svg>
  );
}

function LinkMark() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 15l6-6" />
      <path d="M10 6h2a4 4 0 0 1 4 4M14 18h-2a4 4 0 0 1-4-4" />
    </svg>
  );
}
