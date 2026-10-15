"use client";

/** ⭐ A21 · THE FIRST TAP MEETS A WARM PAGE (2026-10-14).
 *  On one page the first sheet opening cost 296 ms at 4× CPU and the second 118 ms (OMEGA-COMPILE01, Chrome for Testing
 *  147): the first paid for what the page had never done — the body's code compiled on first call (V8: 126 functions,
 *  67 ms), the faces and sizes it draws in set up (35 ms, the `≈` glyph's system fallback face among them) and its words
 *  shaped (47 ms). Style was no first-use cost. So the host, once it is idle after mounting, draws the public first frame
 *  a tap would draw (the page's first bettable card, its preset stake, the viewer still loading) ONCE, in one task:
 *  rendered synchronously into a hidden, inert container that wears the sheet panel's own classes, laid out, unmounted
 *  and removed before the task ends. No frame is painted in between, so nothing is seen, focused, announced or matched
 *  by a selector; its element ids are its own; its root swallows its own errors (the real sheet reports its own). An
 *  idle-time rehearsal into a DETACHED root was measured first and refuted (no layout, so no faces or shaping — reverted
 *  83553cecd): the layout is the point. */
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import type { Dict, Locale } from "@/lib/i18n";
import { parseSheetSeed } from "@/lib/journey/sheet-seed";
import { clockOffset, sheetFrame, sheetPreset } from "@/lib/journey/sheet-state";
import { guestFrame } from "@/lib/journey/guest-sheet";
import { BetSheetBody } from "./bet-sheet";

const ignore = () => {};
/** S10 · the guest face's doors, for its rehearsal only: drawn, laid out and removed, never pressed. */
const WARM_DOORS = { signUp: "/auth/register", signIn: "/auth/login", onPress: ignore, onLeave: ignore };

/** Draws the sheet's first frame once, out of sight, in one synchronous task. True only when the heading was drawn and
 *  laid out; never throws, and leaves nothing behind. S10 · `{ guest: true }` rehearses the guest face's first frame
 *  instead (`guest-sheet-host.tsx`: no balance row, the doors in the commit's place), so a guest's first tap meets a warm
 *  page too. */
export function warmSheet(t: Dict, locale: Locale, opts: { guest?: boolean } = {}): boolean {
  let host: HTMLDivElement | null = null, root: Root | null = null;
  try {
    const box = document.querySelector<HTMLElement>("[data-sheet]");
    const seed = box ? parseSheetSeed(box.getAttribute("data-sheet")) : null;
    if (!box || !seed?.bettable) return false;
    host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.inert = true;
    host.style.cssText = "position:fixed;left:0;top:0;width:min(100vw,440px);visibility:hidden;pointer-events:none;contain:layout style paint;z-index:-1";
    // Modal's sheet panel without its entrance (modal.tsx): the body is laid out at the sheet's own width, in its faces.
    const panel = host.appendChild(document.createElement("div"));
    panel.className = "mat-modal relative w-full p-5 lg:p-6 kp-wsheet kp-bsheet";
    const shell = panel.appendChild(document.createElement("div"));
    shell.className = "kp-bsheet__shell";
    document.body.appendChild(host);
    root = createRoot(shell, { onUncaughtError: ignore, onCaughtError: ignore, onRecoverableError: ignore });
    // The frame a fresh tap draws first (bet-sheet-host.tsx `open`): preset stake, viewer loading, no intent, no answer.
    const nowMs = Date.now(), stakeText = String(sheetPreset(seed, null));
    const frame = opts.guest ? guestFrame({ seed, side: "YES", stakeText, nowMs, offsetMs: clockOffset(seed.serverNow, nowMs) })
      : sheetFrame({ seed, side: "YES", stakeText, viewer: { state: "loading" }, nowMs, offsetMs: clockOffset(seed.serverNow, nowMs), intent: null, settled: null, recoveryBlocked: false });
    const warm = root;
    flushSync(() => warm.render(<BetSheetBody seed={seed} side="YES" title={box.dataset.sheetTitle || t.common.temporarilyUnavailable} frame={frame} stakeText={stakeText}
      estimateUpdated={false} t={t} locale={locale} id="kp-sheet-warm" nowMs={nowMs} onStakeChange={ignore} onPlace={ignore} onBetInstead={ignore} onDeposit={ignore} onClose={ignore}
      guest={opts.guest ? WARM_DOORS : undefined} />));
    // A render that failed left the shell empty (React 19 reports, never rethrows): only a drawn heading counts.
    const heading = shell.querySelector("h2");
    // Style and layout now, inside this task: the faces are set up and the words shaped, and nothing is painted.
    return heading !== null && heading.getBoundingClientRect().height > 0;
  } catch {
    return false;
  } finally {
    try { root?.unmount(); } catch { /* the container goes regardless */ }
    try { host?.remove(); } catch { /* nothing else holds it */ }
  }
}
