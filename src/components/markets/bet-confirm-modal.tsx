"use client";

/**
 * BetConfirmModal — last-mile confirmation popup for placing a bet.
 *
 *   • Locked-quote countdown — the user has 10 seconds to confirm at the
 *     price they saw on the dial. After that, the modal closes and the
 *     dial timer restarts so they can re-aim. Mirrors how serious
 *     markets handle quote freshness without faking certainty. 10 s
 *     gives a player time to read the side + stake + payout block
 *     without rushing; 5 s was too tight (Ali's report).
 *   • Kit-faithful (border-border, bg-bg-elevated, gold confirm gradient,
 *     OKLCH hues, mono numerals).
 *   • Portal-rendered to escape any backdrop-filter containing-block trap.
 *   • Esc closes; Confirm + Enter submit; tab is trapped to within the modal.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { I } from "@/components/ui/glyphs";
import { haptics } from "@/lib/haptics";
import { HouseLeanWarning } from "./house-lean-warning";
import type { LeanLevel } from "@/lib/server/market-config";

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const QUOTE_HOLD_MS = 10_000;

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
  // Direct-DOM target for the gilt countdown strip. Driving its
  // transform through React state caused stair-stepping: every RAF
  // triggered a full modal re-render AND a CSS transition that
  // interpolated between values, so overlapping 80ms transitions
  // fought the next frame's setState. Now we mutate the ref in the
  // RAF loop and let React state only update the seconds label
  // (~1Hz) — animation is smooth, label is correct.
  const stripRef = useRef<HTMLDivElement>(null);
  const lastSecLabelRef = useRef<number>(Math.ceil(QUOTE_HOLD_MS / 1000));

  // Pin the latest callbacks + pending flag so the timer effect only
  // restarts when `open` actually flips. Otherwise the parent re-creating
  // its onCancel arrow each render would restart the countdown forever
  // and the quote would never auto-expire.
  const onCancelRef = useRef(onCancel);
  const onConfirmRef = useRef(onConfirm);
  const pendingRef = useRef(pending);
  useEffect(() => { onCancelRef.current = onCancel; }, [onCancel]);
  useEffect(() => { onConfirmRef.current = onConfirm; }, [onConfirm]);
  useEffect(() => { pendingRef.current = pending; }, [pending]);

  useEffect(() => { setMounted(true); }, []);

  // Quote-hold timer — runs while the modal is open.
  useEffect(() => {
    if (!open) return;
    startedAtRef.current = performance.now();
    setRemainingMs(QUOTE_HOLD_MS);
    lastSecLabelRef.current = Math.ceil(QUOTE_HOLD_MS / 1000);
    if (stripRef.current) stripRef.current.style.transform = "scaleX(1)";
    const tick = () => {
      const elapsed = performance.now() - startedAtRef.current;
      const left = Math.max(0, QUOTE_HOLD_MS - elapsed);
      // Direct DOM transform — no React render, no CSS transition.
      // Each frame paints the exact instantaneous scale, no overlap.
      if (stripRef.current) {
        const pct = Math.max(0, Math.min(1, left / QUOTE_HOLD_MS));
        stripRef.current.style.transform = `scaleX(${pct})`;
      }
      // React state only when the seconds label would change — once
      // per second instead of once per frame. Keeps the modal stable.
      const nextSec = Math.ceil(left / 1000);
      if (nextSec !== lastSecLabelRef.current) {
        lastSecLabelRef.current = nextSec;
        setRemainingMs(left);
      }
      if (left <= 0) {
        rafRef.current = null;
        if (!pendingRef.current) onCancelRef.current();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    // Belt-and-braces: a setTimeout backstop in case RAF is throttled
    // (e.g. backgrounded tab, headless test runners). Fires at the same
    // 10 s mark and dismisses if the RAF loop somehow missed it.
    const backstop = setTimeout(() => {
      if (!pendingRef.current) onCancelRef.current();
    }, QUOTE_HOLD_MS + 50);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      clearTimeout(backstop);
    };
  }, [open]);

  // Focus + keybinds. Esc cannot fire while a submit is in flight.
  useEffect(() => {
    if (!open) return;
    const f = setTimeout(() => confirmRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pendingRef.current) { e.preventDefault(); onCancelRef.current(); }
      if (e.key === "Enter" && !pendingRef.current) { e.preventDefault(); onConfirmRef.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(f); window.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!mounted || !open) return null;

  const sideTone = side === "YES"
    ? { fg: "oklch(78% 0.13 152)", bg: "oklch(40% 0.10 152 / 0.18)", brd: "oklch(45% 0.13 152)" }
    : { fg: "oklch(78% 0.16 22)",  bg: "oklch(40% 0.13 22 / 0.18)",  brd: "oklch(48% 0.15 22)" };
  const net = payout - stake;
  const netColor = lean === "negative" ? "var(--no-300)" : lean === "thin" ? "var(--warning-fg)" : "var(--gold-300)";
  const seconds = Math.ceil(remainingMs / 1000);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirm prediction"
      className="fixed inset-0 z-[100] flex justify-center px-3 py-4 overflow-y-auto overscroll-contain"
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label="Cancel"
        onClick={() => { if (!pending) onCancel(); }}
        disabled={pending}
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity disabled:cursor-wait"
        style={{ animation: "bcm-fade 160ms ease-out" }}
      />

      {/* Card — `overflow-hidden` clips the gold countdown strip to
          the popup's rounded corners. Without it, subpixel mismatch
          between the strip's `rounded-t-2xl` and the popup's
          `rounded-xl` + 1px border lets the strip's ends protrude
          past the popup's curved corners (Ali's report). */}
      <div
        className="relative my-auto w-full max-w-[440px] rounded-xl border border-border-strong bg-bg-elevated shadow-[0_30px_80px_oklch(5%_0.05_264_/_0.65),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden"
        // Kit `--ease-arrive` — same entry curve as the result modal,
        // so the pre-confirm and post-place beats feel like one
        // continuous motion language.
        style={{ animation: "bcm-rise 240ms var(--ease-arrive)" }}
      >
        {/* Quote-hold progress strip — driven directly via stripRef
            from the RAF loop. No CSS transition (would overlap with
            the next frame's render and stair-step). */}
        <div className="absolute inset-x-0 top-0 h-1 overflow-hidden rounded-t-2xl">
          <div
            ref={stripRef}
            className="h-full origin-left"
            style={{
              width: "100%",
              transform: "scaleX(1)",
              background: "linear-gradient(90deg, var(--gold-500), var(--gold-300))",
              willChange: "transform",
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
              <I.x s={16} />
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

          {/* Payout disclosure — per management spec (license review · 2026-05)
              the potential winning is NOT shown until the event has resolved.
              Player commits on stake + multiplier + side; final payout
              communicated post-resolution. */}
          <div className="mt-3 rounded-lg border border-border bg-bg-overlay p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-text-subtle mb-1">
              Payout · Lipo
            </p>
            <p className="text-[12px] leading-relaxed text-text-muted">
              Calculated at resolution from the final pool share.
              <br />
              <span className="text-text-subtle">Itahesabiwa baada ya tukio kukamilika.</span>
            </p>
          </div>

          {/* Quote-hold caption */}
          <div className="mt-4 flex items-center gap-2 text-[12px] text-text-subtle">
            <I.shieldcheck s={14} />
            <span>
              Price locked for <strong className="font-mono text-gold-300">{seconds}s</strong> · then re-aim on the dial.
            </span>
          </div>

          {/* CTAs — kit btn-ghost + btn-gold */}
          <div className="mt-5 grid grid-cols-[1fr_1.4fr] gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="btn btn-ghost btn-md"
            >
              Cancel · Ghairi
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={() => { haptics.confirm(); onConfirm(); }}
              disabled={pending || remainingMs <= 0}
              className="btn btn-gold btn-md"
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
