"use client";

/**
 * BetConfirmModal — last-mile confirmation popup for placing a bet.
 *
 *   • Locked-quote countdown — the user has 5 seconds to confirm at the price
 *     they saw on the dial. After that, the modal closes and the dial timer
 *     restarts so they can re-aim. Mirrors how serious markets handle quote
 *     freshness without faking certainty.
 *   • Kit-faithful (border-border, bg-bg-elevated, gold confirm gradient,
 *     OKLCH hues, mono numerals).
 *   • Portal-rendered to escape any backdrop-filter containing-block trap.
 *   • Esc closes; Confirm + Enter submit; tab is trapped to within the modal.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ShieldCheck } from "lucide-react";
import { HouseLeanWarning } from "./house-lean-warning";
import type { LeanLevel } from "@/lib/server/market-config";

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const QUOTE_HOLD_MS = 5_000;

type Props = {
  open: boolean;
  side: "YES" | "NO";
  stake: number;
  multiplier: number;
  payout: number;
  ratio: number;
  lean: LeanLevel;
  pending: boolean;
  marketTitle?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function BetConfirmModal({
  open, side, stake, multiplier, payout, ratio, lean, pending, marketTitle, onConfirm, onCancel,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [remainingMs, setRemainingMs] = useState(QUOTE_HOLD_MS);
  const startedAtRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Quote-hold timer — runs while the modal is open.
  useEffect(() => {
    if (!open) return;
    startedAtRef.current = performance.now();
    setRemainingMs(QUOTE_HOLD_MS);
    const tick = () => {
      const elapsed = performance.now() - startedAtRef.current;
      const left = Math.max(0, QUOTE_HOLD_MS - elapsed);
      setRemainingMs(left);
      if (left <= 0) {
        rafRef.current = null;
        // Quote expired — close so the user re-aims; the dial keeps their
        // last position so they can confirm again immediately.
        onCancel();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [open, onCancel]);

  // Focus + keybinds.
  useEffect(() => {
    if (!open) return;
    const f = setTimeout(() => confirmRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      if (e.key === "Enter") { e.preventDefault(); if (!pending) onConfirm(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(f); window.removeEventListener("keydown", onKey); };
  }, [open, pending, onCancel, onConfirm]);

  if (!mounted || !open) return null;

  const sideTone = side === "YES"
    ? { fg: "oklch(78% 0.13 152)", bg: "oklch(40% 0.10 152 / 0.18)", brd: "oklch(45% 0.13 152)" }
    : { fg: "oklch(78% 0.16 22)",  bg: "oklch(40% 0.13 22 / 0.18)",  brd: "oklch(48% 0.15 22)" };
  const net = payout - stake;
  const netColor = lean === "negative" ? "var(--no-300)" : lean === "thin" ? "var(--warning-fg)" : "var(--gold-300)";
  const progressPct = Math.max(0, Math.min(1, remainingMs / QUOTE_HOLD_MS));
  const seconds = Math.ceil(remainingMs / 1000);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm prediction"
      className="fixed inset-0 z-[100] flex items-center justify-center px-3"
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity"
        style={{ animation: "bcm-fade 160ms ease-out" }}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-[440px] rounded-2xl border border-border bg-bg-elevated shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)]"
        style={{ animation: "bcm-rise 200ms cubic-bezier(.2,.8,.2,1)" }}
      >
        {/* Quote-hold progress strip */}
        <div className="absolute inset-x-0 top-0 h-1 overflow-hidden rounded-t-2xl">
          <div
            className="h-full origin-left"
            style={{
              width: "100%",
              transform: `scaleX(${progressPct})`,
              background: "linear-gradient(90deg, var(--gold-500), var(--gold-300))",
              transition: "transform 80ms linear",
            }}
          />
        </div>

        <div className="p-5 lg:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">
                Confirm prediction · Thibitisha utabiri
              </p>
              {marketTitle && (
                <p className="mt-1 font-display text-[15px] font-semibold text-text leading-snug line-clamp-2">
                  {marketTitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel"
              className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Side + stake summary */}
          <div className="rounded-lg border p-4" style={{ borderColor: sideTone.brd, background: sideTone.bg }}>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-subtle mb-1">You are picking</p>
                <p className="font-display font-bold text-[26px] leading-none" style={{ color: sideTone.fg, letterSpacing: "-0.025em" }}>
                  {side}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-subtle mb-1">Stake · dau</p>
                <p className="font-mono font-bold text-[22px] tabular-nums leading-none text-text">TZS {fmt(stake)}</p>
                <p className="mt-1 font-mono text-[10px] text-text-subtle">{multiplier.toFixed(2)}× conviction</p>
              </div>
            </div>
          </div>

          {/* Payout block */}
          <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg border border-border bg-bg-overlay p-3">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-subtle mb-1">If correct · Ukishinda</p>
              <p className="font-mono font-bold text-[18px] tabular-nums leading-none" style={{ color: netColor }}>
                TZS {fmt(payout)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-subtle mb-1">Net · Faida</p>
              <p className="font-mono font-bold text-[15px] tabular-nums leading-none" style={{ color: netColor }}>
                {net >= 0 ? "+" : "−"}TZS {fmt(Math.abs(net))}
              </p>
              <p className="mt-1 font-mono text-[10px] text-text-subtle">×{ratio.toFixed(2)} return</p>
            </div>
          </div>

          {/* Lean warning, only when sub-fair */}
          {lean !== "fair" && (
            <div className="mt-3">
              <HouseLeanWarning level={lean} payout={payout} stake={stake} />
            </div>
          )}

          {/* Quote-hold caption */}
          <div className="mt-4 flex items-center gap-2 text-[12px] text-text-subtle">
            <ShieldCheck size={14} className="text-gold-400" aria-hidden />
            <span>
              Price locked for <strong className="font-mono text-gold-300">{seconds}s</strong> · then re-aim on the dial.
            </span>
          </div>

          {/* CTAs */}
          <div className="mt-5 grid grid-cols-[1fr_1.4fr] gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="h-11 rounded-md border border-border bg-bg-elevated font-display font-semibold text-[13px] text-text hover:bg-bg-overlay transition-colors disabled:opacity-50"
            >
              Cancel · Ghairi
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={onConfirm}
              disabled={pending || remainingMs <= 0}
              className="h-11 rounded-md font-display font-bold text-[13.5px] transition-all border disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(180deg, var(--gold-400), var(--gold-600))",
                color: "var(--gold-fg)",
                borderColor: "var(--gold-700)",
                boxShadow: "0 1px 0 oklch(95% 0.08 80) inset, 0 8px 18px -10px oklch(78% 0.14 80 / 0.7)",
              }}
            >
              {pending ? "Placing…" : `Confirm ${side} · TZS ${fmt(stake)}`}
            </button>
          </div>
          <p className="mt-2.5 text-center text-[11px] text-text-subtle">
            Pool-share payout. Outcome may differ from current odds.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bcm-rise { from { transform: translateY(8px) scale(.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes bcm-fade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>,
    document.body,
  );
}
