"use client";

/**
 * SellConfirmModal — kit-faithful "are you sure?" before cashing out a position.
 *
 * A11: the dialog chrome (portal, scrim, Android scroll/zoom lock, focus-trap,
 * focus-return, Esc, kit scrim/rise animation, ✕) is now the shared <Modal>
 * primitive. This component owns only the cash-out content — the sell logic and
 * money math are unchanged.
 *
 * S6 A8i (2026-10-06): Enter acts only where it is pressed. The dialog opens with focus on the sell button, so Enter
 * there sells — the button's own press; Enter on the keep button keeps the ticket, and Enter in a dialog opened on top
 * acts in that dialog. Its window Enter listener is gone (see the note at its old place).
 *
 * S6 WP10: two optional words, the journey's question and keep button (`titleLabel`, `keepLabel`), which only
 * SellButton's journey look passes. Without them every word here is today's.
 *
 * S6 A8f: every money figure here is one object, and the receive row reflows (for every player, in both looks). The
 * figure under "Utapokea" is an amount (DESIGN_AUTHORITY §M4), so "TZS 1,500" never breaks between its currency and its
 * number; when the fee column cannot share its line, the row wraps and the fee column moves below the figure, kept at the
 * right edge. Until A8f the row squeezed the figure's column instead, and a phone drew "TZS" over "1,500" (Swahili, at
 * 360 and at 390). `test:sell-grace-truth` §6 models both dialogs over every width, language, stake and fee.
 */

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { I } from "@/components/ui/glyphs";
import { Callout } from "@/components/ui/callout";
import { haptics } from "@/lib/haptics";
import { useT } from "@/lib/i18n";
import { formatTzs, formatNumber } from "@/lib/utils";

type Props = {
  open: boolean;
  pending: boolean;
  stake: number;
  value: number;
  /** Position reference (pos_*) — shown as ticket number for traceability. */
  positionId?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * The journey's question, "Uza tiketi hii sasa?" (S6 WP10: `journey.sellConfirmTitle`, from SellButton's journey look)
   * — a ticket, where today's `dialog.sellPositionNow` says a position. Without it, today's words.
   */
  titleLabel?: string;
  /** The journey's keep button, "Baki na tiketi" (`journey.sellKeep`); without it, today's `dialog.keepPosition`. */
  keepLabel?: string;
};

export function SellConfirmModal({ open, pending, stake, value, positionId, onConfirm, onCancel, titleLabel, keepLabel }: Props) {
  const { t } = useT();
  const confirmRef = useRef<HTMLButtonElement>(null);
  /** The way out, "Hifadhi nafasi": where focus lands when a dialog drawn over this one closes (`safeFocus`, S6 A8i-2). */
  const keepRef = useRef<HTMLButtonElement>(null);

  // B-21 — the quote hold. The bet path locks its quote for 10s; the exit path
  // (same pool volatility) let the player consent to a figure that could be a
  // whole poll interval stale. The rendered value now has a 10s life: a fresh
  // `value` (poll tick while open) re-arms it; past the hold the confirm
  // disables and the modal says to reopen. Server execution is unchanged —
  // this stops the CONSENT going stale, which is the informed-consent defect.
  const QUOTE_HOLD_MS = 10_000;
  const [quoteExpired, setQuoteExpired] = useState(false);
  useEffect(() => {
    if (!open) { setQuoteExpired(false); return; }
    setQuoteExpired(false);
    const id = window.setTimeout(() => setQuoteExpired(true), QUOTE_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [open, value]);

  // ⛔ S6 A8i · NO ENTER LISTENER ON THE WINDOW. One stood here, and it sold on Enter pressed ANYWHERE: it cancelled the
  // press of whatever had focus, so Enter on the keep button sold the ticket, and Enter on the win seal — opened on top
  // when another ticket wins — sold in this dialog underneath. Enter is now the focused button's own press: the dialog
  // opens with focus on the sell button (`initialFocus`), so Enter there still sells, through the same click a mouse
  // makes, which refuses a lapsed quote and is `disabled` while a sale is in flight. A key held down presses once
  // (`key-guard.tsx`, `held-key.ts`).
  // ⭐ S6 A8i-2 · and the win seal closing over this dialog hands focus to "Hifadhi nafasi" (`safeFocus`), never back to the
  // sell button: a second Enter meant for the seal (W2, which SOLD the ticket in a real browser), or for a second seal still
  // on its way, can at worst keep the ticket. `test:enter-where-pressed` holds every dialog to this.

  // Cash-out is an early exit, never a profit. `value` is the stake returned —
  // full inside the free-exit window, stake − fee outside it.
  const fee = Math.max(0, stake - value);
  const isFree = fee <= 0;
  const feePct = stake > 0 ? Math.round((fee / stake) * 100) : 0;

  return (
    <Modal
      open={open}
      onClose={() => { if (!pending) onCancel(); }}
      ariaLabel={t.dialog.cashOutTitle}
      maxWidth={440}
      closeOnScrim={!pending}
      initialFocus={confirmRef}
      safeFocus={keepRef}
    >
      <div className="mb-4 min-w-0">
        <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">
          {t.dialog.cashOutTitle}
        </p>
        <p className="mt-1 font-display text-[16px] font-semibold text-text leading-snug">
          {titleLabel ?? t.dialog.sellPositionNow}
        </p>
      </div>

      {/* E-100 · same rule again. This one sits inside a modal, which is the narrowest place
          the ticket is ever shown, and it is on the screen where a player commits money. */}
      {positionId && (
        <p className="mb-3 font-mono text-[10px] tracking-[0.06em] text-text-muted break-all">
          <I.ticket s={10} className="inline -mt-px mr-1 opacity-60" />
          {positionId}
        </p>
      )}

      {/* DS-6 — composed from the semantic families (YES green for the free
          window, royal for the fee'd exit), not hand-typed oklch. */}
      <div
        className="rounded-lg border p-4"
        style={{
          borderColor: isFree ? "color-mix(in oklab, var(--yes-500) 62%, transparent)" : "color-mix(in oklab, var(--royal-500) 62%, transparent)",
          background:  isFree ? "color-mix(in oklab, var(--yes-500) 18%, transparent)" : "color-mix(in oklab, var(--royal-500) 16%, transparent)",
        }}
      >
        {/* S6 A8f · the figure is one amount and never splits. When the fee column cannot share its line, the row wraps:
            the fee column moves below the figure and takes the box's width, so its words stay at the right edge. Beside
            the figure the fee keeps a clear space before it, so two figures never run together. Where the two columns
            fit side by side with that space, nothing moves. */}
        <div className="flex flex-wrap items-baseline justify-between gap-y-2">
          <div>
            <p className="font-mono text-micro uppercase eyebrow text-text-subtle mb-1">{t.dialog.youReceive}</p>
            <p className="amount font-bold text-[24px] leading-none text-text">
              TZS {formatNumber(value)}
            </p>
          </div>
          <div className="grow text-right">
            <p className="font-mono text-micro uppercase eyebrow text-text-subtle mb-1">{t.dialog.earlyExitFee}</p>
            <p
              className="pl-3 font-bold text-title-sm amount leading-none"
              style={{ color: isFree ? "var(--yes-300)" : "var(--text)" }}
            >
              {isFree ? t.dialog.noFee : `−${formatTzs(fee)}`}
            </p>
            <p className="mt-1 amount text-micro text-text-subtle">{isFree ? t.dialog.freeExitWindow : `${feePct}% · ${formatTzs(stake)}`}</p>
          </div>
        </div>
      </div>

      {/* DS-6 — the kit Callout (this is the exact box callout.tsx absorbed
          from this file), not a hand-rolled warning panel. */}
      <Callout tone="warning" className="mt-3">
        {isFree ? t.dialog.freeExitExplain : t.dialog.earlyExitExplain}
        <span className="block italic text-text-subtle text-[11px] mt-0.5">
          {t.dialog.stakeWillLeavePool}
        </span>
      </Callout>

      {quoteExpired && !pending && (
        <Callout tone="warning" live className="mt-3">{t.dialog.quoteExpired}</Callout>
      )}

      <div className="mt-5 flex flex-col gap-2">
        <button
          ref={confirmRef}
          type="button"
          onClick={() => { if (quoteExpired) return; haptics.confirm(); onConfirm(); }}
          disabled={pending || quoteExpired}
          className="btn btn-gold btn-lg w-full"
        >
          {pending ? t.dialog.selling : `${t.dialog.sellLabel} · ${formatTzs(value)}`}
        </button>
        <button
          ref={keepRef}
          type="button"
          onClick={onCancel}
          disabled={pending}
          /* `btn-lg` matches the gold confirm above and the twin control in
             bet-confirm-modal.tsx, so the two core money dialogs read identically.
             It was `btn-md`. ⛔ No per-call height: the --h-control-* token owns it. */
          className="btn btn-ghost btn-lg w-full"
        >
          {keepLabel ?? t.dialog.keepPosition}
        </button>
      </div>
    </Modal>
  );
}
