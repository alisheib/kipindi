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
import { Modal } from "@/components/ui/modal";
import { RewardBurst } from "@/components/brand/reward-burst";
import { haptics } from "@/lib/haptics";
import { useT } from "@/lib/i18n";
import { formatNumber, formatTzs } from "@/lib/utils";

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
  return <>{formatTzs(n)}</>;
}

export function WinCelebrationHost() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<WinCelebrationPayload | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onCelebrate = (e: Event) => {
      const detail = (e as CustomEvent<WinCelebrationPayload>).detail;
      if (!detail) return;
      setPayload(detail);
      setOpen(true);
      if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        haptics.celebrate();
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setOpen(false), 4_500);
    };
    window.addEventListener(EVENT_NAME, onCelebrate as EventListener);
    return () => {
      window.removeEventListener(EVENT_NAME, onCelebrate as EventListener);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!payload) return null;

  const heading = t.market.wonHeading;
  const sub = t.market.wonSub;

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      ariaLabel={heading}
      maxWidth={380}
      zIndex={1700}
      panelClassName="overflow-hidden !p-0"
    >
      {/* Gold top strip */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: "linear-gradient(90deg, var(--gold-500), var(--gold-300), var(--gold-500))" }}
      />

      <div className="p-6 lg:p-7 text-center">
          {/* Shared A5 reward-burst crest — 12 gilt rays + bracketed trophy
              medallion — unifies the win with proposal-approved and KYC-verified
              (B7 completes the A5-deferred win pairing; pure SVG, no bitmap). */}
          <div className="mb-4 flex justify-center">
            <RewardBurst glyph="trophy" size={72} />
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
              {payload.net >= 0 ? "+" : "\u2212"}TZS {formatNumber(Math.abs(payload.net))} <span className="text-text-subtle">{t.common.net}</span>
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
    </Modal>
  );
}
