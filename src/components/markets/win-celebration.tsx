"use client";

/**
 * WinCelebration — gold-and-aqua confetti popup, fired when:
 *   • A position resolves WIN (notify-poller listens for matches)
 *   • A cash-out clears with net profit (sell-button fires on success)
 *
 * The component is mounted once via <WinCelebrationHost /> in AppShell. Any
 * client component can fire one with `dispatchWinCelebration({...})`. The
 * popup auto-dismisses after 4.5s; manual close + click-anywhere-outside
 * also work. Kit-faithful — gold gradient title, aqua finishing accent on
 * the divider, mono numerals for the payout.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trophy, X } from "lucide-react";

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

const CONFETTI_COUNT = 60;

/** Deterministic-but-spread confetti specs — gold + aqua + pearl. */
function buildConfetti(seed: number) {
  const tones = ["var(--gold-300)", "var(--gold-500)", "var(--aqua-300)", "oklch(96% 0.005 240)"];
  const out: Array<{ x: number; delay: number; color: string; size: number; rotate: number }> = [];
  let s = seed;
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    out.push({
      x: ((s % 1000) / 1000),
      delay: ((s >> 8) % 600),
      color: tones[(s >> 16) % tones.length],
      size: 6 + ((s >> 18) % 6),
      rotate: ((s >> 14) % 90) - 45,
    });
  }
  return out;
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

  const seed = (payload.amount * 31 + (payload.label?.length ?? 0)) >>> 0;
  const confetti = buildConfetti(seed);
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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{ animation: "win-burst 200ms ease-out both" }}
      />

      {/* Confetti layer — origin at top-center of card */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((c, i) => (
          <span
            key={i}
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              top: "20%",
              width: c.size,
              height: c.size * 0.4,
              borderRadius: 1,
              background: c.color,
              transform: `rotate(${c.rotate}deg)`,
              animation: `win-confetti 1800ms ${c.delay}ms cubic-bezier(.2,.8,.2,1) forwards`,
              ["--x" as string]: c.x,
              opacity: 0,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-[380px] overflow-hidden rounded-2xl border border-gold-700 bg-bg-elevated shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)]"
        style={{ animation: "win-burst 320ms cubic-bezier(.2,.8,.2,1) both" }}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1"
          style={{
            background: "linear-gradient(90deg, var(--gold-500), var(--aqua-300), var(--gold-500))",
          }}
        />
        <div className="p-6 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-pill border border-gold-700 bg-gold-500/15 text-gold-300 mb-3">
            <Trophy size={22} aria-hidden />
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
            TZS {fmt(payload.amount)}
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
            className="mt-5 inline-flex h-10 items-center px-5 rounded-pill font-display font-bold text-[13px] transition-all border"
            style={{
              background: "linear-gradient(180deg, var(--gold-400), var(--gold-600))",
              color: "var(--gold-fg)",
              borderColor: "var(--gold-700)",
              boxShadow: "0 1px 0 oklch(95% 0.08 80) inset",
            }}
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
          <X size={14} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
