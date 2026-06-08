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
import { I } from "@/components/ui/glyphs";
import { useModalLock } from "@/lib/use-modal-lock";

const SESSION_START_KEY  = "kp_session_started_at";
const LAST_PROMPT_KEY    = "kp_reality_check_last";
const DEFAULT_INTERVAL   = 30; // minutes

export function RealityCheckHost({ enabled, intervalMin = DEFAULT_INTERVAL }: { enabled: boolean; intervalMin?: number }) {
  const [open, setOpen] = React.useState(false);
  useModalLock(open);
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
        // Defer if a critical modal (bet confirm, sell confirm, etc.)
        // is open — slamming a reality check on top of a money-handling
        // confirmation is disorienting. The check fires on the next tick
        // (30s later) when the modal has likely been dismissed. The
        // lastPromptAt is NOT updated, so the check isn't lost.
        const hasOpenModal = document.querySelector('[role="dialog"][aria-modal="true"]');
        if (hasOpenModal) return;

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
        className="relative w-full max-w-md max-h-[calc(100dvh-env(safe-area-inset-bottom)-24px)] overflow-y-auto overscroll-contain rounded-xl bg-bg-elevated p-5 sm:p-6 space-y-4"
        style={{
          border: "1px solid var(--gilt)",
          boxShadow: "var(--shadow-royal), 0 0 0 1px color-mix(in oklab, var(--gilt) 30%, transparent) inset",
          animation: "win-burst 320ms cubic-bezier(.2,.8,.2,1) both",
        }}
      >
        {/* Kit WarnModal: 2px colored rail at top */}
        <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "var(--gold-300)", opacity: 0.7, borderRadius: "var(--r-lg) var(--r-lg) 0 0" }} />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              style={{
                width: 32, height: 32, borderRadius: "var(--r-sm)",
                background: "var(--bg-inset)", border: "1px solid var(--border)",
                display: "grid", placeItems: "center", color: "var(--gold-300)", flexShrink: 0,
              }}
            >
              <I.clock s={18} />
            </span>
            <div>
              <h2
                id="reality-check-title"
                className="font-display font-bold leading-tight text-text"
                style={{ fontSize: 15.5 }}
              >
                You&apos;ve been playing for{" "}
                <span className="font-mono" style={{ color: "var(--gold-300)" }}>{elapsedMin}</span>{" "}
                {elapsedMin === 1 ? "minute" : "minutes"}
              </h2>
              <p style={{ fontSize: 11.5, fontStyle: "italic", color: "var(--text-subtle)" }}>
                Umekuwa ukicheza kwa dakika {elapsedMin}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors shrink-0"
          >
            <I.x s={16} />
          </button>
        </div>

        <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.55 }}>
          Most people play for fun. If it stops feeling fun, take a break.
          <span className="block italic text-text-subtle" style={{ marginTop: 2 }}>Kama haifurahishi tena, pumzika.</span>
        </p>

        <div className="grid grid-cols-1 gap-2 pt-1">
          <button type="button" onClick={dismiss} className="btn btn-gold btn-lg w-full">
            Continue playing · Endelea
          </button>
          <Link href="/profile/responsible-gambling" onClick={dismiss} className="btn btn-ghost btn-lg w-full inline-flex">
            <I.clock s={14} />
            Set limits · Weka mipaka
          </Link>
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
            <Link href="/profile/responsible-gambling#break" onClick={dismiss} className="btn btn-ghost btn-md w-full inline-flex whitespace-normal h-auto min-h-[38px]">
              <I.pause s={13} />
              Take a break
            </Link>
            <Link href="/profile/responsible-gambling#exclude" onClick={dismiss} className="btn btn-claret btn-md w-full inline-flex whitespace-normal h-auto min-h-[38px]">
              <I.lock s={13} />
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
