"use client";

/**
 * QuickBetModal — inline YES/NO dialog for market cards.
 *
 * Instead of redirecting to `/markets/{id}?side=YES`, the card pops
 * this portal-rendered dialog. The user sees market info, enters a
 * stake, and the bet is placed via server action without navigation.
 * After success/failure, the result shows in-place.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { I } from "@/components/ui/glyphs";
import { useModalLock } from "@/lib/use-modal-lock";
import { buyPositionAction } from "@/app/markets/actions";

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

type Props = {
  open: boolean;
  marketId: string;
  marketTitle: string;
  side: "YES" | "NO";
  yesPct: number;
  volume: number;
  predictors: number;
  timeLeft: string;
  onClose: () => void;
};

type Phase = "input" | "success" | "error";

export function QuickBetModal({
  open, marketId, marketTitle, side, yesPct, volume, predictors, timeLeft, onClose,
}: Props) {
  useModalLock(open);
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("input");
  const [stake, setStake] = useState("");
  const [error, setError] = useState("");
  const [resultMsg, setResultMsg] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (open) {
      setPhase("input");
      setStake("");
      setError("");
      setResultMsg("");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted || typeof document === "undefined") return null;

  const stakeNum = Math.max(0, parseInt(stake, 10) || 0);
  const pctSide = side === "YES" ? yesPct : 100 - yesPct;
  // Simple implied payout: if your side has X%, payout ~ stake / (X/100)
  const impliedPayout = pctSide > 0 ? Math.round(stakeNum / (pctSide / 100)) : stakeNum * 2;

  const handleSubmit = () => {
    if (stakeNum < 100) { setError("Min stake: TZS 100"); return; }
    setError("");
    const fd = new FormData();
    fd.set("marketId", marketId);
    fd.set("side", side);
    fd.set("stake", String(stakeNum));
    startTransition(async () => {
      const r = await buyPositionAction(fd);
      if (r.ok) {
        setPhase("success");
        setResultMsg(`Bet placed · TZS ${fmt(stakeNum)} on ${side}`);
      } else {
        setPhase("error");
        setResultMsg(r.error ?? "Something went wrong.");
      }
    });
  };

  const sideColor = side === "YES" ? "var(--yes-400)" : "var(--no-400)";
  const sideBg = side === "YES" ? "oklch(55% 0.20 152 / 0.12)" : "oklch(55% 0.20 22 / 0.12)";

  return createPortal(
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ background: "oklch(6% 0.08 264 / 0.7)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
        onClick={onClose}
      />
      {/* Dialog */}
      <div
        className="fixed z-[101] w-[min(380px,calc(100vw-32px))] rounded-xl border border-border-strong"
        style={{
          top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          background: "var(--bg-elevated)",
          boxShadow: "0 24px 60px -12px oklch(6% 0.08 264 / 0.8)",
          animation: "orm-rise 180ms ease-out",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="inline-flex h-7 items-center px-2.5 rounded-md font-mono text-[12px] font-bold uppercase tracking-[0.08em]"
              style={{ background: sideBg, color: sideColor, border: `1px solid ${sideColor}` }}
            >
              {side} {pctSide}%
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">Quick bet</span>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-subtle hover:text-text hover:bg-bg-overlay transition-colors" aria-label="Close">
            <I.x s={14} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Market title */}
          <p className="font-display text-[15px] font-semibold text-text leading-snug line-clamp-2">{marketTitle}</p>

          {/* Market stats */}
          <div className="flex gap-3 text-[11px] font-mono text-text-subtle">
            <span>{predictors} predictors</span>
            <span className="text-border-strong">·</span>
            <span>TZS {fmt(volume)}</span>
            <span className="text-border-strong">·</span>
            <span>{timeLeft}</span>
          </div>

          {phase === "input" && (
            <>
              {/* Stake input */}
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-1.5">
                  Stake (TZS) · Kiasi
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[12px] text-text-subtle">TZS</span>
                  <input
                    ref={inputRef}
                    type="number"
                    min="100"
                    step="100"
                    value={stake}
                    onChange={(e) => { setStake(e.target.value); setError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                    placeholder="1,000"
                    className="w-full h-11 pl-12 pr-3 rounded-lg bg-bg-inset border border-border text-text font-mono text-[16px] tabular-nums focus:outline-none focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)] transition-colors"
                    style={{ appearance: "textfield", MozAppearance: "textfield", WebkitAppearance: "none" } as React.CSSProperties}
                  />
                </div>
                {error && <p className="mt-1 text-[11px] font-mono text-danger">{error}</p>}
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2">
                {[500, 1000, 5000, 10000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => { setStake(String(amt)); setError(""); }}
                    className="flex-1 h-8 rounded-md border border-border bg-bg-overlay font-mono text-[11px] text-text-muted hover:border-brand-400 hover:text-text transition-colors"
                  >
                    {amt >= 1000 ? `${amt / 1000}K` : fmt(amt)}
                  </button>
                ))}
              </div>

              {/* Payout estimate */}
              {stakeNum >= 100 && (
                <div className="rounded-lg border border-border bg-bg-overlay/50 p-3 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">Est. payout</span>
                  <span className="font-mono text-[16px] font-bold tabular-nums" style={{ color: "var(--gold)" }}>
                    TZS {fmt(impliedPayout)}
                  </span>
                </div>
              )}

              {/* Confirm */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || stakeNum < 100}
                className={`w-full h-11 rounded-lg font-semibold text-[14px] transition-all ${
                  side === "YES"
                    ? "btn btn-yes"
                    : "btn btn-no"
                }`}
                style={{ opacity: isPending || stakeNum < 100 ? 0.5 : 1 }}
              >
                {isPending ? "Placing..." : `Place ${side} · TZS ${stakeNum >= 100 ? fmt(stakeNum) : "—"}`}
              </button>

              <p className="text-center text-[10px] text-text-subtle leading-snug">
                Payout depends on the final pool. Only stake what you can afford. 18+.
              </p>
            </>
          )}

          {phase === "success" && (
            <div className="text-center py-3 space-y-3">
              <div className="mx-auto h-14 w-14 rounded-full inline-flex items-center justify-center" style={{ background: sideBg }}>
                <I.check s={28} style={{ color: sideColor }} />
              </div>
              <p className="font-display text-[17px] font-bold text-text">{resultMsg}</p>
              <p className="text-[12px] text-text-muted">Your position is live. Track it in Positions.</p>
              <div className="flex gap-2 pt-1">
                <a href={`/markets/${marketId}`} className="flex-1 btn btn-ghost btn-md" style={{ justifyContent: "center" }}>
                  View market
                </a>
                <button type="button" onClick={onClose} className="flex-1 btn btn-primary btn-md" style={{ justifyContent: "center" }}>
                  Done
                </button>
              </div>
            </div>
          )}

          {phase === "error" && (
            <div className="text-center py-3 space-y-3">
              <div className="mx-auto h-14 w-14 rounded-full inline-flex items-center justify-center bg-danger/15">
                <I.x s={28} style={{ color: "var(--danger)" }} />
              </div>
              <p className="font-display text-[17px] font-bold text-text">Bet not placed</p>
              <p className="text-[12px] text-text-muted">{resultMsg}</p>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setPhase("input")} className="flex-1 btn btn-ghost btn-md" style={{ justifyContent: "center" }}>
                  Try again
                </button>
                <button type="button" onClick={onClose} className="flex-1 btn btn-primary btn-md" style={{ justifyContent: "center" }}>
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
