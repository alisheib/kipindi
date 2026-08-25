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
  compact,
}: {
  marketId: string;
  title: string;
  /** Player's referral code — appended as ?ref= so shares track referrals. */
  refCode?: string;
  /**
   * ⭐ THE CARD VARIANT — a bare 13px glyph instead of a 40px labelled pill.
   *
   * Ali, 2026-08-25: *"a tiny share icon on each market card, not very bulky."* The
   * market card's footer row **paints 17px and must keep painting 17px** —
   * `MARKET_CARD_H` (card-geometry.ts) is derived from it and BOTH `/markets` skeletons
   * consume that number, so a 40px pill in that row would re-derive card geometry on
   * `/markets`, `/live`, `/watchlist` and the landing at once.
   *
   * ⛔ SO THIS IS A VARIANT, NOT A SECOND COMPONENT. Everything below the trigger — the
   * WhatsApp deep link, the native share sheet, the clipboard fallback, the referral
   * `?ref=` and the OG preview — is shared verbatim. A second share control would be
   * `E-196` again: one control with two implementations, where the defect lives in the
   * copy nobody is editing.
   *
   * The 40px tap reach comes from `.mcardp-share`, which uses the same out-of-flow
   * pseudo-element `.mcardp-details` uses, for the same reason: grow the TARGET, not the
   * box, so nothing moves.
   */
  compact?: boolean;
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
        /* ⛔ `stopPropagation` IS LOAD-BEARING IN THE COMPACT VARIANT. The market CARD is
           itself a click target that navigates to the market, so without this every share
           tap would open the market and the dialog would never be seen. Harmless on the
           detail page, where nothing is listening above it. */
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        aria-label={t.dialog.shareMarket}
        aria-haspopup="dialog"
        /* ⚠️ 40px (--tap-min, DA §A2) AS AN ARBITRARY LITERAL. This said `h-9`,
           which on the OVERRIDDEN spacing scale (tailwind.config.ts:200-215) is
           64px — and the 36px the author meant would have been UNDER the floor,
           so 40 is the target, not the original intent. Matches
           position-share.tsx. ⛔ Never a scale token here. */
        className={
          compact
            ? "mcardp-share"
            : "inline-flex h-[40px] items-center gap-1.5 rounded-pill border border-border bg-bg-elevated px-3 text-[12px] font-mono uppercase tracking-[0.14em] text-text-muted hover:border-border-strong hover:text-text transition-colors"
        }
      >
        {copied ? <I.check s={13} /> : <I.share s={13} />}
        {/* ⛔ NO LABEL IN THE COMPACT VARIANT — the row is 17px and a word would raise it.
            The control is still NAMED: `aria-label={t.dialog.shareMarket}` is on the button
            above, in all three locales, so an icon-only trigger is never an unnamed one. */}
        {!compact && (copied ? t.common.copied : t.common.share)}
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
                  {/* ⚠️ 36px AS ARBITRARY LITERALS on all three share-target tiles.
                      These said `h-9 w-9`, which is 64×64px on the OVERRIDDEN
                      spacing scale (tailwind.config.ts:200-215). They are decorative
                      plates behind a 16px glyph — the whole row is the tap target —
                      so 36px is right and no tap floor applies to the tile itself.
                      ⛔ Never scale tokens here. */}
                  <span className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-md bg-brand-500/15 text-brand-300">
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
                <span className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-md bg-yes-500/15 text-yes-300">
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
                <span className="inline-flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-md bg-bg-overlay text-text-muted">
                  {copied ? <I.check s={16} /> : <LinkMark />}
                </span>
                {/* ⚠️ `min-w-0` — a flex child defaults to `min-width: auto`, so an unbreakable
                    URL sets the FLOOR for this column and pushes the tile wider than the
                    dialog. The plate beside it is `shrink-0` for the same reason, from the
                    other direction: without it the 36px plate is what yields instead. */}
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-text">{copied ? t.common.copied : t.common.copyLink}</span>
                  {/* 🔴 WAS `truncate`, WHICH IS A CLIPPED LINK WEARING AN ELLIPSIS. Ali, on
                      the invite page's twin of this: *"the copy link gets out of the isolated
                      input field — maybe we should make it take multiple lines."* A link the
                      player is being shown so they can read it must be readable; `break-all`
                      wraps a URL, which has no spaces to wrap at. ⚠️ Nothing here is derived
                      from `MARKET_CARD_H` — that constant is the CARD's footer row, not this
                      dialog, so a tile that grows a line costs nothing. */}
                  <span className="block font-mono text-[11px] text-text-subtle break-all">{url.replace(/^https?:\/\//, "")}</span>
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
