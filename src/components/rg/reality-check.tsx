"use client";

/**
 * Reality-check prompt — LCCP SR Code 3.4.1 / GLI-19 player protection.
 *
 * Surfaces a modal every `intervalMin` minutes (default 30) showing time on
 * platform this session and one-click links to: continue, set limits, take a
 * break, or self-exclude. After dismissal, the timer restarts.
 *
 * Session start is tracked in sessionStorage (per browser tab), KEYED BY USER
 * so two accounts on the same device/tab never share an elapsed timer; the
 * modal does not fire for unauthed visitors. Respects prefers-reduced-motion.
 *
 * Direct port of the kit's player-protection prompt — gilt eyebrow, royal
 * card, kit btn-primary / btn-ghost / btn-claret.
 */
import * as React from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { I } from "@/components/ui/glyphs";
import { SUPPORT_PHONE } from "@/lib/support-config";
import { useT } from "@/lib/i18n";

const DEFAULT_INTERVAL   = 30; // minutes

export function RealityCheckHost({ enabled, intervalMin = DEFAULT_INTERVAL, userId }: { enabled: boolean; intervalMin?: number; userId?: string | null }) {
  const [open, setOpen] = React.useState(false);
  const [elapsedMin, setElapsedMin] = React.useState(0);

  React.useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    // Scope the session timer to THIS user. Without this, logging out of one
    // account and into another in the same tab inherited the first account's
    // session-start time, so the new user saw "you've been playing for N min"
    // for time they never spent. Per-user keys give each account its own clock.
    const who = userId || "anon";
    const SESSION_START_KEY = `kp_session_started_at:${who}`;
    const LAST_PROMPT_KEY = `kp_reality_check_last:${who}`;

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
    // `userId` MUST be a dependency: AppShell is preserved across login/logout
    // soft-navigation, so this host re-renders with a new userId WITHOUT
    // remounting. Without userId here the effect keeps the previous account's
    // storage keys (the exact cross-account leak this is meant to prevent).
  }, [enabled, intervalMin, userId]);

  const dismiss = React.useCallback(() => {
    setOpen(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`kp_reality_check_last:${userId || "anon"}`, String(Date.now()));
    }
  }, [userId]);

  const { t } = useT();

  if (!enabled) return null;

  return (
    <Modal
      open={open}
      onClose={dismiss}
      sheet
      zIndex={1700}
      maxWidth={448}
      labelledBy="reality-check-title"
      panelClassName="overflow-hidden"
    >
      {/* Gold rail at top */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-[2px]" style={{ background: "linear-gradient(90deg, var(--gold-500), var(--gold-300), var(--gold-500))" }} />

      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-bg-inset border border-border text-gold-300">
            <I.clock s={18} />
          </span>
          <h2
            id="reality-check-title"
            className="font-display text-[15.5px] font-bold leading-tight text-text"
          >
            {t.rg.playingFor}{" "}
            <span className="font-mono text-gold-300">{elapsedMin}</span>{" "}
            {elapsedMin === 1 ? t.rg.minute : t.rg.minutes}
          </h2>
        </div>

        <p className="text-[12.5px] text-text-muted leading-snug">
          {t.rg.mostPlayForFun}
        </p>

        <div className="grid grid-cols-1 gap-2 pt-1">
          <button type="button" onClick={dismiss} className="btn btn-ghost btn-lg w-full">
            {t.rg.continuePlaying}
          </button>
          <Link href="/profile/responsible-gambling" onClick={dismiss} className="btn btn-ghost btn-lg w-full inline-flex">
            <I.clock s={14} />
            {t.rg.setLimits}
          </Link>
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
            <Link href="/profile/responsible-gambling#break" onClick={dismiss} className="btn btn-ghost btn-md w-full inline-flex whitespace-normal h-auto min-h-[38px]">
              <I.pause s={13} />
              {t.rg.takeABreak}
            </Link>
            <Link href="/profile/responsible-gambling#exclude" onClick={dismiss} className="btn btn-claret btn-md w-full inline-flex whitespace-normal h-auto min-h-[38px]">
              <I.lock s={13} />
              {t.rg.selfExclude}
            </Link>
          </div>
        </div>

        <p className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle pt-1">
          {t.rg.helpline} · <span className="text-text-muted">{SUPPORT_PHONE()}</span>
        </p>
      </div>
    </Modal>
  );
}
