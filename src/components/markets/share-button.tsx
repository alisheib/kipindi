"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";

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
}: {
  marketId: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const url = (typeof window !== "undefined" ? window.location.origin : "") + `/markets/${marketId}`;
  const shareText = `${title} — predict on 50pick`;
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
      toast({ title: "Link copied", description: url, variant: "default" });
      setTimeout(() => { setCopied(false); setOpen(false); }, 1500);
    } catch {
      toast({ title: "Couldn't copy", variant: "danger" });
      setOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Share this market"
        aria-haspopup="dialog"
        className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-border bg-bg-elevated px-3 text-[12px] font-mono uppercase tracking-[0.14em] text-text-muted hover:border-border-strong hover:text-text transition-colors"
      >
        {copied ? <I.check s={13} /> : <I.share s={13} />}
        {copied ? "Copied" : "Share"}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-popover bg-black/60 backdrop-blur-md"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Share options"
            className="fixed left-3 right-3 bottom-3 sm:left-auto sm:right-6 sm:top-20 sm:bottom-auto sm:w-[320px] z-popover rounded-xl border border-border bg-bg-elevated shadow-e5 overflow-hidden kp-slide-up"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="font-display text-[14px] font-semibold text-text">Share market</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-bg-overlay"
              >
                <I.x s={14} />
              </button>
            </div>
            <div className="p-2">
              {hasWebShare && (
                <button
                  type="button"
                  onClick={onWebShare}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-bg-overlay text-left transition-colors"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-teal-500/15 text-teal-300">
                    <I.share s={16} />
                  </span>
                  <span>
                    <span className="block text-[14px] font-semibold text-text">System share</span>
                    <span className="block text-[12px] text-text-muted">Pick any app</span>
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
                  <span className="block text-[12px] text-text-muted">Send to chat or group</span>
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
                  <span className="block text-[14px] font-semibold text-text">{copied ? "Copied" : "Copy link"}</span>
                  <span className="block font-mono text-[11px] text-text-subtle truncate max-w-full">{url.replace(/^https?:\/\//, "")}</span>
                </span>
              </button>
            </div>
          </div>
        </>,
        document.body,
      )}
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
