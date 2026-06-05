"use client";

/**
 * WinCelebration — calm gilt celebration popup, fired when:
 *   • A position resolves WIN (notify-poller listens for matches)
 *   • A cash-out clears with net profit (sell-button fires on success)
 *
 * The component is mounted once via <WinCelebrationHost /> in AppShell. Any
 * client component can fire one with `dispatchWinCelebration({...})`. The
 * popup auto-dismisses after 4.5s; manual close + click-anywhere-outside
 * also work.
 *
 * Kit-faithful (DEVELOPER_REFERENCE invariant #7 + WinCelebration spec):
 * the celebration is ONE gilt ray + a rolling counter on the payout — calm,
 * never a casino. **No confetti / chips / dice / slot reels.** (v2 removed the
 * old 60-piece confetti burst to comply with the kit.)
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { I } from "@/components/ui/glyphs";
import { haptics } from "@/lib/haptics";

const EVENT_NAME = "50pick:celebrate";

export type WinCelebrationPayload = {
  /** Heading row, e.g. "WIN" or "Cashed out". */
  kind: "WIN" | "CASHOUT";
  /** Amount in TZS — the headline figure. */
  amount: number;
  /** "Net" delta to display under the amount. Positive numbers get a "+". */
  net?: number;
  /** Market title or short context line. */
  label?: string;
};

export function dispatchWinCelebration(p: WinCelebrationPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<WinCelebrationPayload>(EVENT_NAME, { detail: p }));
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** Rolling counter for the payout headline — counts up 0 → value on mount
 *  (~900ms, ease-out-quart). Snaps instantly under prefers-reduced-motion.
 *  Mirrors the WalletBalancePill tween so the "money landed" beat is
 *  consistent across the app. Mounts fresh each time the popup opens. */
function RollingAmount({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const reduce = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setN(value); return; }
    const dur = 900;
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / dur);
      const eased = 1 - Math.pow(1 - t, 4);
      setN(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>TZS {n.toLocaleString("en-US")}</>;
}

export function WinCelebrationHost() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<WinCelebrationPayload | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onCelebrate = (e: Event) => {
      const detail = (e as CustomEvent<WinCelebrationPayload>).detail;
      if (!detail) return;
      setPayload(detail);
      setOpen(true);
      haptics.celebrate(); // the peak — fires with the gilt ray + counter roll
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setOpen(false), 4_500);
    };
    window.addEventListener(EVENT_NAME, onCelebrate as EventListener);
    return () => {
      window.removeEventListener(EVENT_NAME, onCelebrate as EventListener);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (typeof document === "undefined" || !open || !payload) return null;

  const heading = payload.kind === "WIN" ? "Won!" : "Cashed out";
  const sub = payload.kind === "WIN" ? "Umeshinda" : "Umetoa";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      className="fixed inset-0 z-[1700] flex items-center justify-center px-3"
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        style={{ animation: "win-burst 200ms ease-out both" }}
      />

      {/* Card — calm gilt celebration (no confetti, per kit invariant #7) */}
      <div
        className="relative z-10 w-full max-w-[380px] overflow-hidden rounded-xl border border-gold-700 bg-bg-elevated shadow-[0_30px_80px_oklch(5%_0.05_264_/_0.65)]"
        style={{ animation: "win-burst 320ms cubic-bezier(.2,.8,.2,1) both" }}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1"
          style={{
            background: "linear-gradient(90deg, var(--gold-500), var(--aqua-300), var(--gold-500))",
          }}
        />
        <div className="p-6 text-center relative">
          {/* Gilt spotlight rays behind the trophy — slow rotation,
              respects reduced-motion. Adds the "earned" prestige read
              without going over the top. */}
          <div
            aria-hidden
            className="absolute left-1/2 -translate-x-1/2 wc-rays"
            style={{
              top: 18,
              width: 140,
              height: 140,
              background:
                "conic-gradient(from 0deg, transparent 0deg, color-mix(in oklab, var(--gold-300) 22%, transparent) 8deg, transparent 16deg, transparent 90deg, color-mix(in oklab, var(--gold-300) 18%, transparent) 98deg, transparent 106deg, transparent 180deg, color-mix(in oklab, var(--gold-300) 22%, transparent) 188deg, transparent 196deg, transparent 270deg, color-mix(in oklab, var(--gold-300) 18%, transparent) 278deg, transparent 286deg, transparent 360deg)",
              borderRadius: "50%",
              filter: "blur(2px)",
              opacity: 0.7,
              animation: "wc-ray-spin 14s linear infinite",
            }}
          />
          <div
            className="relative inline-flex items-center justify-center h-12 w-12 rounded-pill border border-gold-700 bg-gold-500/15 text-gold-300 mb-3"
            style={{
              boxShadow: "0 0 0 6px color-mix(in oklab, var(--gold-300) 18%, transparent)",
              animation: "wc-trophy-pulse 2.4s ease-in-out infinite",
            }}
          >
            <I.trophy s={22} />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-gold-300">
            {payload.kind === "WIN" ? "Position won · Madau yamefanikiwa" : "Cashed out · Umetoa kabla"}
          </p>
          <h2 className="mt-1 font-display text-[34px] font-bold text-text leading-none tracking-[-0.02em]">
            {heading} <span className="text-text-subtle italic font-normal text-[18px]">· {sub}</span>
          </h2>
          <div aria-hidden className="claret-rule" />
          <p
            className="font-mono font-bold text-[40px] tabular-nums leading-none"
            style={{
              background: "linear-gradient(180deg, var(--gold-300), var(--gold-500))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              letterSpacing: "-0.02em",
            }}
          >
            <RollingAmount value={payload.amount} />
          </p>
          {typeof payload.net === "number" && (
            <p className="mt-1.5 font-mono text-[13px] tabular-nums text-aqua-200">
              {payload.net >= 0 ? "+" : "−"}TZS {fmt(Math.abs(payload.net))} <span className="text-text-subtle">net</span>
            </p>
          )}
          {payload.label && (
            <p className="mt-2 text-[12.5px] italic text-text-subtle line-clamp-2">{payload.label}</p>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn btn-gold btn-md mt-5"
            style={{ borderRadius: "var(--r-pill)" }}
          >
            Continue · Endelea
          </button>
        </div>

        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"
        >
          <I.x s={14} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
