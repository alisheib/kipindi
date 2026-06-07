"use client";

/**
 * WalletBalancePill — the top-bar TZS balance with rolling counter
 * + delta flash on change.
 *
 * Why this exists: previously the pill silently jumped from
 * TZS 100,000 → TZS 86,800 the moment a bet debited the wallet. No
 * confirmation that the action landed beyond the toast. Now the
 * number rolls + the pill outline pulses gilt for ~700 ms, giving
 * the player a calm "yes, your money moved" affordance. Reduced-
 * motion users see the number snap with no pulse — same visual end
 * state, no motion.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useCashHidden } from "@/components/ui/cash";

const TWEEN_DURATION = 600;     // ms — full rolling-counter run
const FLASH_DURATION = 800;     // ms — gilt outline pulse decay

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function WalletBalancePill({ balance }: { balance: number }) {
  const [display, setDisplay] = useState(balance);
  const [flashing, setFlashing] = useState(false);
  // The signed change from the previous balance, captured when a flash starts.
  // Held in state (not derived at render) because previousRef is advanced to the
  // new balance inside the effect, so a render-time `balance - previousRef` is
  // always 0 by the time the flash paints.
  const [delta, setDelta] = useState(0);
  const previousRef = useRef(balance);
  const rafRef = useRef<number | null>(null);
  const hidden = useCashHidden();

  // Detect prefers-reduced-motion once. The tween + flash respect it
  // by collapsing to an instant snap with no outline pulse.
  const reducedMotion = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    reducedMotion.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);

  useEffect(() => {
    const from = previousRef.current;
    const to = balance;
    if (from === to) return;
    previousRef.current = to;
    setDelta(to - from);

    if (reducedMotion.current) {
      setDisplay(to);
      return;
    }

    // Trigger the gilt outline pulse — CSS transition handles the
    // decay back to the resting border.
    setFlashing(true);
    const flashTimer = window.setTimeout(() => setFlashing(false), FLASH_DURATION);

    // Cancel any in-flight tween so a rapid second update doesn't
    // double-count.
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / TWEEN_DURATION);
      const eased = easeOutQuart(t);
      const v = Math.round(from + (to - from) * eased);
      setDisplay(v);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => window.clearTimeout(flashTimer);
  }, [balance]);

  // Cleanup any in-flight RAF on unmount.
  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return (
    <Link
      href="/wallet"
      aria-label={hidden ? "Wallet · balance hidden" : `Wallet · TZS ${balance.toLocaleString("en-US")}`}
      className={cn(
        "inline-flex items-center rounded-pill font-mono tabular-nums font-bold text-text transition-colors transition-shadow",
        flashing
          ? "text-gold-300 shadow-[0_0_0_3px_color-mix(in_oklab,var(--gold-300)_22%,transparent)]"
          : "hover:text-gold-300",
      )}
      style={{
        height: 32,
        padding: "0 12px",
        gap: 7,
        background: "var(--bg-inset)",
        border: flashing ? "1px solid var(--gold-300)" : "1px solid oklch(78% 0.13 80 / 0.35)",
        fontSize: 12.5,
        transitionDuration: "260ms",
      }}
      data-testid="wallet-balance-pill"
    >
      {hidden ? "TZS •••••" : `TZS ${display.toLocaleString("en-US")}`}
      {/* Tiny delta indicator that fades out alongside the flash —
          appears next to the number for ~800 ms with the actual
          +/- amount. Helps the player connect the visual to the
          recent transaction. Suppressed while balances are masked. */}
      {!hidden && flashing && delta !== 0 && (
        <span
          aria-hidden
          className="ml-1.5 font-mono text-[9.5px] tabular-nums"
          style={{
            color: delta > 0 ? "var(--yes-300)" : "var(--no-300)",
            animation: "wbp-delta-fade 800ms ease-out forwards",
          }}
        >
          {delta > 0 ? "+" : ""}
          {delta.toLocaleString("en-US")}
        </span>
      )}
      <style>{`
        @keyframes wbp-delta-fade {
          0%   { opacity: 0; transform: translateY(-2px); }
          15%  { opacity: 1; transform: translateY(0); }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-2px); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes wbp-delta-fade {
            from, to { opacity: 0; }
          }
        }
      `}</style>
    </Link>
  );
}
