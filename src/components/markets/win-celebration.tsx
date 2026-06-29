"use client";

/**
 * WinCelebration — calm gilt celebration popup, fired when a position
 * resolves WIN (notify-poller listens for matches). Cash-out is an early
 * exit (stake returned, never a profit), so it deliberately does NOT fire
 * this — it gets a plain result modal instead.
 *
 * The component is mounted once via <WinCelebrationHost /> in AppShell. Any
 * client component can fire one with `dispatchWinCelebration({...})`. The
 * popup auto-dismisses after 4.5s; manual close + click-anywhere-outside
 * also work.
 *
 * Kit-faithful: the celebration is a still radial glow + a rolling counter
 * on the payout — calm, never a casino. No confetti / chips / dice / reels.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { I } from "@/components/ui/glyphs";
import { haptics } from "@/lib/haptics";
import { useModalLock } from "@/lib/use-modal-lock";
import { useT } from "@/lib/i18n";

const EVENT_NAME = "50pick:celebrate";

export type WinCelebrationPayload = {
  /** Heading row. Only WIN is used — cash-out doesn't celebrate. */
  kind: "WIN";
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
 *  (~900ms, ease-out-quart). Snaps instantly under prefers-reduced-motion. */
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
  const { t } = useT();
  const [open, setOpen] = useState(false);
  useModalLock(open);
  const [payload, setPayload] = useState<WinCelebrationPayload | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onCelebrate = (e: Event) => {
      const detail = (e as CustomEvent<WinCelebrationPayload>).detail;
      if (!detail) return;
      setPayload(detail);
      setOpen(true);
      haptics.celebrate();
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

  const heading = "Won!";
  const sub = "Umeshinda";

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
        aria-label={t.common.dismiss}
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        style={{ animation: "wc-fade 160ms ease-out" }}
      />

      {/* Card — matches OperationResultModal's glass surface */}
      <div
        className="relative z-10 w-full max-w-[380px] overflow-hidden rounded-xl border border-border-strong bg-bg-elevated shadow-[0_30px_80px_oklch(5%_0.05_264_/_0.65),inset_0_1px_0_rgba(255,255,255,0.06)]"
        style={{ animation: "wc-rise 240ms var(--ease-arrive)" }}
      >
        {/* Gold top strip */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: "linear-gradient(90deg, var(--gold-500), var(--gold-300), var(--gold-500))" }}
        />

        {/* Close button */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t.common.close}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"
        >
          <I.x s={16} />
        </button>

        <div className="p-6 lg:p-7 text-center">
          {/* Trophy crest — radial glow BEHIND, centered via grid */}
          <div className="relative mx-auto mb-4" style={{ width: 72, height: 72 }}>
            {/* Static radial glow — calm, no spinning */}
            <div
              aria-hidden
              className="absolute inset-[-16px] rounded-full"
              style={{
                background: "radial-gradient(circle, oklch(72% 0.14 78 / 0.25) 0%, oklch(72% 0.14 78 / 0.08) 50%, transparent 70%)",
                animation: "wc-glow 2s ease-out",
              }}
            />
            <div
              className="relative inline-flex items-center justify-center w-full h-full rounded-full"
              style={{
                background: "oklch(40% 0.10 78 / 0.20)",
                border: "2px solid oklch(58% 0.12 78)",
                boxShadow: "0 0 0 6px oklch(58% 0.12 78 / 0.18)",
                animation: "wc-pop 360ms cubic-bezier(.2,1.4,.4,1)",
              }}
            >
              <span className="text-gold-300"><I.trophy s={30} /></span>
            </div>
          </div>

          {/* Eyebrow */}
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-gold-300">
            {t.common.positionWon}
          </p>

          {/* Headline */}
          <h2 className="mt-1 font-display text-[22px] font-bold text-text leading-tight tracking-[-0.018em]">
            {heading} <span className="text-text-subtle italic font-normal text-[17px]">· {sub}</span>
          </h2>

          {/* Amount — the star of the show */}
          <p
            className="mt-4 font-mono font-bold text-[34px] tabular-nums leading-none"
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
            <p className="mt-1.5 font-mono text-[13px] tabular-nums text-gold-300">
              {payload.net >= 0 ? "+" : "\u2212"}TZS {fmt(Math.abs(payload.net))} <span className="text-text-subtle">net</span>
            </p>
          )}

          {payload.label && (
            <p className="mt-2 text-[12.5px] italic text-text-subtle line-clamp-2">{payload.label}</p>
          )}

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn btn-gold btn-md w-full mt-5"
          >
            {t.common.continue}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes wc-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes wc-rise { from { transform: translateY(8px) scale(.96); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes wc-pop  { 0% { transform: scale(.4); opacity: 0; } 60% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
        @keyframes wc-glow { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>,
    document.body,
  );
}
