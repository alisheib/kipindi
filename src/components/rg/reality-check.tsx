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
 * Direct port of the kit's player-protection prompt, as R4-I and R5-C left it: a clock badge beside the title (no
 * eyebrow and no gilt — the kit's gilt eyebrow left with R5-C's gold audit), the sheet's own edge, and four doors of one
 * size — the kit's ghost buttons and the claret self-exclusion (2026-10-10: this note said "gilt eyebrow, royal card,
 * btn-primary", none of which the prompt draws).
 */
import * as React from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import { isModalDialogOpen } from "@/lib/modal-open";

const DEFAULT_INTERVAL   = 30; // minutes

/**
 * Storage is a CONVENIENCE here, never a dependency. A browser with storage
 * blocked (Chrome "block all cookies", some in-app webviews) throws on the
 * FIRST `sessionStorage` touch — and this host is mounted in the root
 * AppShell, so an unguarded throw took the whole signed-in app to the root
 * error page on EVERY route.
 *
 * ⛔ The check itself must NOT be conditional on storage. It is an RG /
 * compliance control (LCCP SR Code 3.4.1), so it keeps firing on schedule
 * with storage gone: the fallback map holds the same per-user keys for the
 * life of the tab's JS context, which covers soft navigation and remounts.
 * What a storage-blocked browser loses is persistence across a HARD reload —
 * the clock restarts, the prompt does not stop.
 */
const memStore = new Map<string, string>();

function readStore(key: string): string | null {
  try {
    const v = window.sessionStorage.getItem(key);
    if (v !== null) return v;
  } catch { /* storage blocked — fall through to memory */ }
  return memStore.get(key) ?? null;
}

function writeStore(key: string, value: string): void {
  memStore.set(key, value);
  try { window.sessionStorage.setItem(key, value); } catch { /* storage blocked — memory already holds it */ }
}

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

    let startedAt = Number(readStore(SESSION_START_KEY) ?? 0);
    if (!startedAt || Number.isNaN(startedAt)) {
      startedAt = Date.now();
      writeStore(SESSION_START_KEY, String(startedAt));
    }
    let lastPromptAt = Number(readStore(LAST_PROMPT_KEY) ?? startedAt);
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
        // 🔴 A VISIBLE modal only (2026-09-13). The bare selector matched the markets filter sheet's CLOSED
        // dialog, which stays in the DOM — so on /markets this reminder deferred every 30 seconds for as long as
        // the player stayed there, and never fired. `isModalDialogOpen` also counts the money confirmations,
        // which are alert dialogs the old selector did not match.
        if (isModalDialogOpen()) return;

        const sessionMin = Math.floor((now - startedAt) / 60_000);
        setElapsedMin(sessionMin);
        setOpen(true);
        lastPromptAt = now;
        writeStore(LAST_PROMPT_KEY, String(now));
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
      writeStore(`kp_reality_check_last:${userId || "anon"}`, String(Date.now()));
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
      {/* ⛔ NO GOLD ON THE REALITY CHECK (R5-C, the second gold audit, 2026-10-09). It wore a gold rail across its top, a
          gold clock and the minutes in gold: the ink of money earned (DESIGN_AUTHORITY §M3; Q5 "gold is money, and nothing
          else") on the one prompt whose job is to make a player stop and think. It is an RG notice, and R4-I gave every RG
          notice the neutral treatment: the sheet's own edge, the clock in the subtle ink of the disc it sits on, and the
          minutes in the heading's own ink (mono, §T5). The words and the four doors are unchanged. */}
      <div className="space-y-4">
        {/* ⭐ THE TITLE'S FIRST LINE ON THE CORNER ✕ (round 5 of the visual pass, 2026-10-09, F20 — the one convention,
            `CloseX` in modal.tsx; a position only, no word of this RG notice changes). Modal pins the ✕ 40px under the
            panel's padding edge; this row started at the padding (24px, 32px from 1024) and centred a one-line title on the
            40px badge, so the title's capitals stood 43.6px down — the ✕ 3.6px above them on a phone and 11.6px from 1024
            — and a title that wrapped lifted its first line further. The title now hangs from the badge's centre (its
            first line centred on it, 20px less half its 1.25 line), so a second line grows downward, and the row rises to
            put those capitals — 20 − 0.025em = 19.6px down it — on the ✕. The row keeps 48px clear of the ✕ on its right,
            as every dialog title does (`.kp-modal-title`), so a long title wraps before it instead of running under it. */}
        <div className="-mt-[3.6px] lg:-mt-[11.6px] flex items-start gap-2.5 pr-8">
          {/* ⛔ LITERALS, NOT `h-8 w-8` — the spacing scale is overridden
              (tailwind.config.ts:200-215) and that pair is 48×48px. 40px = --tap-min, the
              badge disc every other section heading in the product uses. */}
          <span className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-md bg-bg-inset border border-border text-text-subtle">
            <I.clock s={18} />
          </span>
          <h2
            id="reality-check-title"
            className="mt-[calc(20px-0.625em)] font-display text-[15.5px] font-bold leading-tight text-text"
          >
            {t.rg.playingFor}{" "}
            <span className="font-mono">{elapsedMin}</span>{" "}
            {elapsedMin === 1 ? t.rg.minute : t.rg.minutes}
          </h2>
        </div>

        <p className="text-body-sm text-text-muted leading-snug">
          {t.rg.mostPlayForFun}
        </p>

        {/* 🔴 LCCP SR CODE 3.4.1 — THE HARM-REDUCTION EXITS ARE NOT THE SMALL PRINT.
            "Take a break" and "Self-exclude" were `btn-md` at HALF width in a nested
            `xs:grid-cols-2`, while "Continue playing" was `btn-lg` full width. On a
            reality-check prompt that is a compliance defect, not a layout preference:
            the control that CONTINUES the session was the largest target in the dialog
            and the two that STOP it were the smallest — and btn-md sat under --tap-min.
            All four are now one rung and one width; the player chooses on the copy, not
            on the pixel count.
            ⛔ Do NOT reintroduce a size or width difference between these four. */}
        <div className="grid grid-cols-1 gap-2 pt-1">
          <button type="button" onClick={dismiss} className="btn btn-ghost btn-lg w-full">
            {t.rg.continuePlaying}
          </button>
          <Link href="/profile/responsible-gambling" onClick={dismiss} className="btn btn-ghost btn-lg w-full inline-flex">
            <I.clock s={14} />
            {t.rg.setLimits}
          </Link>
          <Link href="/profile/responsible-gambling#break" onClick={dismiss} className="btn btn-ghost btn-lg w-full inline-flex">
            <I.pause s={14} />
            {t.rg.takeABreak}
          </Link>
          <Link href="/profile/responsible-gambling#exclude" onClick={dismiss} className="btn btn-claret btn-lg w-full inline-flex">
            <I.lock s={14} />
            {t.rg.selfExclude}
          </Link>
        </div>
        {/* ⛔ No helpline line under the doors since the owner's ruling of 2026-10-06 (docs/COMPLIANCE-DECISIONS.md). */}
      </div>
    </Modal>
  );
}
