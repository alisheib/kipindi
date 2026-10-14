"use client";

/** ⭐ A21 · THE FIRST TAP IS AS FAST AS THE SECOND (2026-10-14).
 *  A sheet's first opening on a page paid for code the page had never run: the body's parts compiled on their first call,
 *  and React's first pass over them. Measured on OMEGA-COMPILE01 (i7-8700, Chrome for Testing 147, 4× CPU) on one page:
 *  the first opening 234–272 ms, the second and third 81–120 ms; laying the same markup out in advance bought only 20–45 ms
 *  of that, so most of the gap is code. So once the page is idle the host renders the sheet's public first frame ONCE —
 *  the frame a tap draws: the preset stake, the viewer still loading — in a React root of its own on an element that is
 *  never attached to the document, then unmounts it on the next animation frame. ⛔ Nothing of it reaches the document:
 *  no box is laid out or painted, nothing is focusable, announced or matched by a selector, no handler does anything, and
 *  a failure in it is dropped silently (the real sheet reports its own). The host never starts it while a sheet is open,
 *  and never twice (bet-sheet-host.tsx). */
import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import type { Dict, Locale } from "@/lib/i18n";
import { clockOffset, sheetFrame, sheetPreset, type SheetSeed } from "@/lib/journey/sheet-state";
import { BetSheetBody } from "./bet-sheet";

const ignore = () => {};

function SheetRehearsal({ seed, title, t, locale, onDone }: { seed: SheetSeed; title: string; t: Dict; locale: Locale; onDone: () => void }) {
  const nowMs = Date.now();
  const stakeText = String(sheetPreset(seed, null));
  const frame = sheetFrame({ seed, side: "YES", stakeText, viewer: { state: "loading" }, nowMs, offsetMs: clockOffset(seed.serverNow, nowMs), intent: null, settled: null, recoveryBlocked: false });
  useEffect(() => {
    const handle = requestAnimationFrame(onDone);
    return () => cancelAnimationFrame(handle);
  }, [onDone]);
  return <BetSheetBody seed={seed} side="YES" title={title} frame={frame} stakeText={stakeText} estimateUpdated={false} t={t} locale={locale}
    id="kp-sheet-rehearsal" nowMs={nowMs} onStakeChange={ignore} onPlace={ignore} onBetInstead={ignore} onDeposit={ignore} onClose={ignore} />;
}

/** Renders the rehearsal into a detached root; returns a cancel that is safe to call at any time, any number of times. */
export function rehearseSheet(seed: SheetSeed, title: string, t: Dict, locale: Locale): () => void {
  let root: ReturnType<typeof createRoot> | null = createRoot(document.createElement("div"), { onUncaughtError: ignore, onCaughtError: ignore, onRecoverableError: ignore });
  // Unmounted outside React's own render and commit: from a timer, never synchronously inside an effect.
  const finish = () => { const done = root; root = null; if (done) setTimeout(() => done.unmount(), 0); };
  root.render(<SheetRehearsal seed={seed} title={title} t={t} locale={locale} onDone={finish} />);
  return finish;
}
