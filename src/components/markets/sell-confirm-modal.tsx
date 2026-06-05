"use client";

/**
 * SellConfirmModal — kit-faithful "are you sure?" before cashing out a
 * position. Replaces the native browser confirm() that used to gate the
 * Sell flow (off-brand, no Swahili copy, no dismissal animation).
 *
 * Mirrors the BetConfirmModal pattern: portaled to body to escape any
 * backdrop-filter containing-block trap, scrim + raised card, gold CTA
 * for the action, ghost CTA for the dismissal, Esc + Enter keybinds.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { I } from "@/components/ui/glyphs";
import { haptics } from "@/lib/haptics";

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

type Props = {
  open: boolean;
  pending: boolean;
  stake: number;
  value: number;
  onConfirm: () => void;
  onCancel: () => void;
};

export function SellConfirmModal({ open, pending, stake, value, onConfirm, onCancel }: Props) {
  const [mounted, setMounted] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const onCancelRef = useRef(onCancel);
  const onConfirmRef = useRef(onConfirm);
  const pendingRef  = useRef(pending);
  useEffect(() => { onCancelRef.current = onCancel; }, [onCancel]);
  useEffect(() => { onConfirmRef.current = onConfirm; }, [onConfirm]);
  useEffect(() => { pendingRef.current = pending; }, [pending]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const f = setTimeout(() => confirmRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pendingRef.current) { e.preventDefault(); onCancelRef.current(); }
      if (e.key === "Enter"  && !pendingRef.current) { e.preventDefault(); onConfirmRef.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(f); window.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!mounted || !open) return null;

  const net = value - stake;
  const profit = net >= 0;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm cash-out"
      className="fixed inset-0 z-[100] flex items-center justify-center px-3"
    >
      <button
        type="button"
        aria-label="Cancel"
        onClick={() => { if (!pending) onCancel(); }}
        disabled={pending}
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity disabled:cursor-wait"
        style={{ animation: "scm-fade 160ms ease-out" }}
      />

      <div
        className="relative w-full max-w-[440px] rounded-xl border border-border-strong bg-bg-elevated shadow-[0_30px_80px_oklch(5%_0.05_264_/_0.65),inset_0_1px_0_rgba(255,255,255,0.06)]"
        style={{ animation: "scm-rise 200ms cubic-bezier(.2,.8,.2,1)" }}
      >
        <div className="p-5 lg:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">
                Cash out · Toa sasa
              </p>
              <p className="mt-1 font-display text-[16px] font-semibold text-text leading-snug">
                Sell this position now?
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel"
              className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"
            >
              <I.x s={16} />
            </button>
          </div>

          <div
            className="rounded-lg border p-4"
            style={{
              borderColor: profit ? "oklch(45% 0.13 152)" : "oklch(48% 0.15 22)",
              background:  profit ? "oklch(40% 0.10 152 / 0.18)" : "oklch(40% 0.13 22 / 0.18)",
            }}
          >
            <div className="flex items-baseline justify-between">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-subtle mb-1">Sellback · Pesa sasa</p>
                <p
                  className="font-mono font-bold text-[24px] tabular-nums leading-none text-text"
                >
                  TZS {fmt(value)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-subtle mb-1">Net · Faida / hasara</p>
                <p
                  className="font-mono font-bold text-[18px] tabular-nums leading-none"
                  style={{ color: profit ? "oklch(78% 0.13 152)" : "oklch(78% 0.16 22)" }}
                >
                  {profit ? "+" : "−"}TZS {fmt(Math.abs(net))}
                </p>
                <p className="mt-1 font-mono text-[10px] text-text-subtle">on TZS {fmt(stake)} stake</p>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-md border border-warning-border bg-warning-bg/30 p-3">
            <I.warning s={14} />
            <p className="text-[12px] text-text-muted leading-snug">
              {profit
                ? <>Locking in <strong className="text-text">TZS {fmt(net)} profit</strong> now means you give up any further upside if the market resolves your way.</>
                : <>Selling now <strong className="text-text">crystallises a TZS {fmt(Math.abs(net))} loss</strong>. The position would still pay full odds if the market resolves your way.</>
              }
              <span className="block italic text-text-subtle text-[11px] mt-0.5">
                Stake itatoka kwenye bwawa baada ya kuthibitisha.
              </span>
            </p>
          </div>

          <div className="mt-5 grid grid-cols-[1fr_1.4fr] gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="btn btn-ghost btn-md"
            >
              Keep position · Endelea
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={() => { haptics.confirm(); onConfirm(); }}
              disabled={pending}
              className={`btn ${profit ? "btn-gold" : "btn-no"} btn-md`}
            >
              {pending ? "Selling…" : `Sell · TZS ${fmt(value)}`}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scm-rise { from { transform: translateY(8px) scale(.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes scm-fade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>,
    document.body,
  );
}
