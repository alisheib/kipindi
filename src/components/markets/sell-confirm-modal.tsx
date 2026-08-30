"use client";

/**
 * SellConfirmModal — kit-faithful "are you sure?" before cashing out a position.
 *
 * A11: the dialog chrome (portal, scrim, Android scroll/zoom lock, focus-trap,
 * focus-return, Esc, kit scrim/rise animation, ✕) is now the shared <Modal>
 * primitive. This component owns only the cash-out content and the bespoke
 * Enter-to-confirm keybind — the sell logic and money math are unchanged.
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
};

export function SellConfirmModal({ open, pending, stake, value, positionId, onConfirm, onCancel }: Props) {
  const { t } = useT();
  const confirmRef = useRef<HTMLButtonElement>(null);

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
  const quoteExpiredRef = useRef(quoteExpired);
  useEffect(() => { quoteExpiredRef.current = quoteExpired; }, [quoteExpired]);

  // Enter-to-confirm is bespoke to this flow; Esc / focus-trap / scroll-lock all
  // live in <Modal>. Refs keep the keybind stable without re-subscribing.
  const onConfirmRef = useRef(onConfirm);
  const pendingRef = useRef(pending);
  useEffect(() => { onConfirmRef.current = onConfirm; }, [onConfirm]);
  useEffect(() => { pendingRef.current = pending; }, [pending]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !pendingRef.current && !quoteExpiredRef.current) { e.preventDefault(); onConfirmRef.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
    >
      <div className="mb-4 min-w-0">
        <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">
          {t.dialog.cashOutTitle}
        </p>
        <p className="mt-1 font-display text-[16px] font-semibold text-text leading-snug">
          {t.dialog.sellPositionNow}
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
        <div className="flex items-baseline justify-between">
          <div>
            <p className="font-mono text-micro uppercase eyebrow text-text-subtle mb-1">{t.dialog.youReceive}</p>
            <p className="font-mono font-bold text-[24px] tabular-nums leading-none text-text">
              TZS {formatNumber(value)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-micro uppercase eyebrow text-text-subtle mb-1">{t.dialog.earlyExitFee}</p>
            <p
              className="font-bold text-title-sm amount leading-none"
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
          type="button"
          onClick={onCancel}
          disabled={pending}
          /* `btn-lg` matches the gold confirm above and the twin control in
             bet-confirm-modal.tsx, so the two core money dialogs read identically.
             It was `btn-md`. ⛔ No per-call height: the --h-control-* token owns it. */
          className="btn btn-ghost btn-lg w-full"
        >
          {t.dialog.keepPosition}
        </button>
      </div>
    </Modal>
  );
}
