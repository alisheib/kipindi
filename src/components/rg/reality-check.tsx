"use client";

/**
 * Reality-check prompt — LCCP SR Code 3.4.1 / GLI-19 player protection.
 *
 * Surfaces a modal every `intervalMin` minutes (default 30) showing time on
 * platform this session and one-click links to: continue, set limits, take a
 * break, or self-exclude. After dismissal, the timer restarts.
 *
 * Session start is tracked in sessionStorage (per browser tab); the modal does
 * not fire for unauthed visitors. Respects prefers-reduced-motion.
 */
import * as React from "react";
import Link from "next/link";
import { Clock, Pause, Lock, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const SESSION_START_KEY  = "kp_session_started_at";
const LAST_PROMPT_KEY    = "kp_reality_check_last";
const DEFAULT_INTERVAL   = 30; // minutes

export function RealityCheckHost({ enabled, intervalMin = DEFAULT_INTERVAL }: { enabled: boolean; intervalMin?: number }) {
  const [open, setOpen] = React.useState(false);
  const [elapsedMin, setElapsedMin] = React.useState(0);

  React.useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    // Bootstrap session start time
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
    // Tick once on mount, then every 30s
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
    <div className="fixed inset-0 z-celebration flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+12px)] kp-slide-up" role="dialog" aria-modal="true" aria-labelledby="reality-check-title">
      <div className="absolute inset-0 bg-bg-overlay backdrop-blur-md" onClick={dismiss} aria-hidden />
      <div className="relative w-full max-w-md max-h-[calc(100dvh-env(safe-area-inset-bottom)-24px)] overflow-y-auto rounded-2xl border border-gold-subtleHover/40 bg-bg-elevated p-5 sm:p-6 shadow-e3 kp-pop-in space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-gold" />
            <p className="font-mono text-caption uppercase tracking-[0.32em] text-gold font-bold">Reality check</p>
          </div>
          <button type="button" onClick={dismiss} aria-label="Dismiss" className="text-text-tertiary hover:text-text">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-1.5">
          <h2 id="reality-check-title" className="font-display font-bold text-title-md text-text">
            You've been playing for <span className="text-gold tabular">{elapsedMin}</span> {elapsedMin === 1 ? "minute" : "minutes"}.
          </h2>
          <p className="text-body-sm text-text-secondary italic">Umekuwa ukicheza kwa dakika {elapsedMin}.</p>
        </div>

        <p className="text-body-sm text-text-secondary leading-relaxed">
          Most people play for fun. If it stops feeling fun, take a break.
          <br />
          <span className="italic text-text-tertiary">Kama haifurahishi tena, pumzika.</span>
        </p>

        <div className="grid grid-cols-1 gap-2 pt-1">
          <Button variant="primary" size="lg" onClick={dismiss} fullWidth>
            Continue playing · Endelea
          </Button>
          <Link href="/profile/responsible-gambling" className="block">
            <Button size="lg" variant="secondary" fullWidth leading={<Clock size={14} />}>Set limits · Weka mipaka</Button>
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/profile/responsible-gambling" className="block">
              <Button size="lg" variant="ghost" fullWidth leading={<Pause size={14} />}>Take a break</Button>
            </Link>
            <Link href="/profile/responsible-gambling" className="block">
              <Button size="lg" variant="ghost" fullWidth leading={<Lock size={14} />}>Self-exclude</Button>
            </Link>
          </div>
        </div>

        <p className="text-micro text-text-tertiary text-center pt-1">
          Tanzania Helpline · <span className="font-mono">+255 22 211 5811</span>
        </p>
      </div>
    </div>
  );
}
