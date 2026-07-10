"use client";

/**
 * ActionOverlay — full-page blocking overlay for admin async operations.
 *
 * Prevents double-clicks, shows clear progress, and gives an unambiguous
 * success/failure result. Critical for non-technical operators who might
 * otherwise click away mid-action.
 *
 * Usage:
 *   const overlay = useActionOverlay();
 *   overlay.run("Approving…", "Please wait.");
 *   // after async:
 *   overlay.succeed("Approved", "Ready to publish.");
 *   // or:
 *   overlay.fail("Could not approve", "Server error.");
 *
 *   return <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />;
 *
 * States: idle (hidden) → running (spinner) → success/error (result card)
 * Success auto-dismisses after 2s. Error stays until dismissed.
 * Escape key dismisses success/error, never during processing.
 */

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { I } from "@/components/ui/glyphs";

export type OverlayState =
  | { phase: "idle" }
  | { phase: "running"; label: string; sublabel?: string }
  | { phase: "success"; title: string; subtitle?: string }
  | { phase: "error"; title: string; message: string };

export function useActionOverlay() {
  const [state, setState] = useState<OverlayState>({ phase: "idle" });
  const dismiss = useCallback(() => setState({ phase: "idle" }), []);
  const run = useCallback((label: string, sublabel?: string) =>
    setState({ phase: "running", label, sublabel }), []);
  const succeed = useCallback((title: string, subtitle?: string) =>
    setState({ phase: "success", title, subtitle }), []);
  const fail = useCallback((title: string, message: string) =>
    setState({ phase: "error", title, message }), []);
  return { state, dismiss, run, succeed, fail };
}

export function ActionOverlay({ state, onDismiss }: { state: OverlayState; onDismiss: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Auto-dismiss success after 2s
  useEffect(() => {
    if (state.phase !== "success") return;
    const t = setTimeout(onDismiss, 2000);
    return () => clearTimeout(t);
  }, [state.phase, onDismiss]);

  // Escape dismisses success/error
  useEffect(() => {
    if (state.phase !== "success" && state.phase !== "error") return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onDismiss(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state.phase, onDismiss]);

  if (state.phase === "idle" || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={state.phase === "running" ? state.label : state.phase === "success" ? state.title : "Error"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-[90vw] max-w-[380px] rounded-xl border border-border bg-bg-elevated p-5 shadow-e4"
        style={{ animation: "np-rise 200ms cubic-bezier(.2,.8,.2,1)" }}
      >
        {state.phase === "running" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-block h-5 w-5 rounded-full border-2 border-brand-300 border-t-transparent animate-spin shrink-0" />
              <p className="font-display text-[15px] font-semibold text-text">{state.label}</p>
            </div>
            {state.sublabel && (
              <p className="text-[11px] text-text-subtle leading-relaxed">{state.sublabel}</p>
            )}
          </div>
        )}
        {state.phase === "success" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-yes-500/15 text-yes-300 shrink-0">
                <I.check s={18} />
              </span>
              <div>
                <p className="font-display text-[15px] font-semibold text-text">{state.title}</p>
                {state.subtitle && (
                  <p className="font-mono text-[11px] text-yes-300">{state.subtitle}</p>
                )}
              </div>
            </div>
            <button type="button" onClick={onDismiss} className="btn btn-ghost btn-sm rounded-pill w-full">
              Done · Sawa
            </button>
          </div>
        )}
        {state.phase === "error" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-no-500/15 text-no-300 shrink-0">
                <I.x s={18} />
              </span>
              <div>
                <p className="font-display text-[15px] font-semibold text-text">{state.title}</p>
                <p className="text-[11px] text-no-300 leading-snug">{state.message}</p>
              </div>
            </div>
            <button type="button" onClick={onDismiss} className="btn btn-ghost btn-sm rounded-pill w-full">
              Dismiss · Funga
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
