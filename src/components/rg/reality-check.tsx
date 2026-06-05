"use client";

/**
 * Reality-check prompt — LCCP SR Code 3.4.1 / GLI-19 player protection.
 *
 * Surfaces a modal every `intervalMin` minutes (default 30) showing time on
 * platform this session and one-click links to: continue, set limits, take a
 * break, or self-exclude. After dismissal, the timer restarts.
 *
 * Session start is tracked in sessionStorage (per browser tab); the modal
 * does not fire for unauthed visitors. Respects prefers-reduced-motion.
 *
 * Direct port of the kit's player-protection prompt — gilt eyebrow, royal
 * card, kit btn-primary / btn-ghost / btn-claret.
 */
import * as React from "react";
import Link from "next/link";
import { Clock, Pause, Lock, X, ShieldCheck } from "lucide-react";

const SESSION_START_KEY  = "kp_session_started_at";
const LAST_PROMPT_KEY    = "kp_reality_check_last";
const DEFAULT_INTERVAL   = 30; // minutes

export function RealityCheckHost({ enabled, intervalMin = DEFAULT_INTERVAL }: { enabled: boolean; intervalMin?: number }) {
  const [open, setOpen] = React.useState(false);
  const [elapsedMin, setElapsedMin] = React.useState(0);

  React.useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    let startedAt = Number(sessionStorage.getItem(SESSION_START_KEY) ?? 0);
    if (!startedAt || Number.isNaN(startedAt)) {
      startedAt = Date.now();
      sessionStorage.setItem(SESSION_START_KEY, String(startedAt));
    }
    let lastPromptAt = Number(sessionStorage.getItem(LAST_PROMPT_KEY) ?? startedAt);
    if (!lastPromptAt || Number.isNaN(lastPromptAt)) lastPromptAt = startedAt;

    const intervalMs = Math.max(1, intervalMin) * 60_000;

    const tick = () => {
      const now = Date.now();
      const sinceLast = now - lastPromptAt;
      if (sinceLast >= intervalMs) {
        const sessionMin = Math.floor((now - startedAt) / 60_000);
        setElapsedMin(sessionMin);
        setOpen(true);
        lastPromptAt = now;
        sessionStorage.setItem(LAST_PROMPT_KEY, String(now));
      }
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [enabled, intervalMin]);

  const dismiss = React.useCallback(() => {
    setOpen(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(LAST_PROMPT_KEY, String(Date.now()));
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  if (!enabled || !open) return null;

  return (
    <div
      className="fixed inset-0 z-[1700] flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+12px)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reality-check-title"
      style={{ animation: "win-burst 200ms ease-out both" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "oklch(11% 0.06 268 / 0.68)", backdropFilter: "blur(12px)" }}
        onClick={dismiss}
        aria-hidden
      />
      <div
        className="relative w-full max-w-md max-h-[calc(100dvh-env(safe-area-inset-bottom)-24px)] overflow-y-auto rounded-2xl bg-bg-elevated p-5 sm:p-6 space-y-4"
        style={{
          border: "1px solid var(--gilt)",
          boxShadow: "var(--shadow-royal), 0 0 0 1px color-mix(in oklab, var(--gilt) 30%, transparent) inset",
          animation: "win-burst 320ms cubic-bezier(.2,.8,.2,1) both",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} style={{ color: "var(--gilt)" }} />
            <p className="gilt-eyebrow">Reality check · Tafakari</p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Gilt rule under the eyebrow — heraldic kit furniture */}
        <div aria-hidden className="claret-rule" style={{ margin: 0 }} />

        <div className="space-y-1.5">
          <h2
            id="reality-check-title"
            className="font-display font-bold leading-tight text-text"
            style={{ fontSize: "var(--type-h2)", letterSpacing: "-0.02em", margin: 0 }}
          >
            You&apos;ve been playing for{" "}
            <span className="gilt-num" style={{ fontSize: "var(--type-h2)" }}>
              {elapsedMin}
            </span>{" "}
            {elapsedMin === 1 ? "minute" : "minutes"}.
          </h2>
          <p className="text-text-muted italic" style={{ fontSize: "var(--type-small)" }}>
            Umekuwa ukicheza kwa dakika {elapsedMin}.
          </p>
        </div>

        <p className="text-text-muted" style={{ fontSize: "var(--type-small)", lineHeight: 1.6 }}>
          Most people play for fun. If it stops feeling fun, take a break.
          <span className="block italic text-text-subtle">Kama haifurahishi tena, pumzika.</span>
        </p>

        <div className="grid grid-cols-1 gap-2 pt-1">
          <button type="button" onClick={dismiss} className="btn btn-gold btn-lg w-full">
            Continue playing · Endelea
          </button>
          <Link href="/profile/responsible-gambling" onClick={dismiss} className="btn btn-ghost btn-lg w-full inline-flex">
            <Clock size={14} aria-hidden />
            Set limits · Weka mipaka
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/profile/responsible-gambling#break" onClick={dismiss} className="btn btn-ghost btn-md w-full inline-flex">
              <Pause size={13} aria-hidden />
              Take a break
            </Link>
            <Link href="/profile/responsible-gambling#exclude" onClick={dismiss} className="btn btn-claret btn-md w-full inline-flex">
              <Lock size={13} aria-hidden />
              Self-exclude
            </Link>
          </div>
        </div>

        <p className="text-center font-mono pt-1" style={{ fontSize: "var(--type-micro)", color: "var(--text-subtle)" }}>
          Tanzania Helpline · <span style={{ color: "var(--text-muted)" }}>+255 22 211 5811</span>
        </p>
      </div>
    </div>
  );
}
