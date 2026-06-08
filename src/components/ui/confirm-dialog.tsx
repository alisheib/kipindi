"use client";

/**
 * ConfirmDialog — wraps a form's submit so a destructive action (self-
 * exclude, close account, large withdraw, irreversible state changes)
 * always asks for an explicit "Yes, do it" before the server action
 * runs.
 *
 *   <ConfirmDialog
 *     trigger={<button className="btn btn-claret btn-md">Self-exclude</button>}
 *     title="Self-exclude · Jizuie"
 *     body="This locks your account for the period you picked..."
 *     confirmLabel="Yes, self-exclude"
 *     onConfirm={() => formRef.current?.requestSubmit()}
 *   />
 *
 * Kit-faithful — same scrim + portal pattern as BetConfirmModal, with
 * an Esc-to-cancel keybind, focus trap, and a single Confirm button.
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { I } from "@/components/ui/glyphs";
import { haptics } from "@/lib/haptics";
import { useModalLock } from "@/lib/use-modal-lock";

type Tone = "claret" | "warning" | "gold";

type Props = {
  trigger: React.ReactElement;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Tone of the confirm button. claret = irreversible / destructive (default). */
  tone?: Tone;
  onConfirm: () => void;
};

export function ConfirmDialog({
  trigger,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel · Ghairi",
  tone = "claret",
  onConfirm,
}: Props) {
  const [open, setOpen] = React.useState(false);
  useModalLock(open);
  const [mounted, setMounted] = React.useState(false);
  const confirmBtn = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const prevFocus = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => { setMounted(true); }, []);

  React.useEffect(() => {
    if (!open) return;
    // Remember what had focus so we can hand it back when the dialog closes
    // (keyboard/screen-reader users land back on the trigger, not on <body>).
    prevFocus.current = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => confirmBtn.current?.focus(), 30);
    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); setOpen(false); return; }
      if (e.key !== "Tab") return;
      // Focus trap: keep Tab cycling inside the dialog instead of leaking to the
      // page behind the scrim.
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0], last = f[f.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault(); first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      prevFocus.current?.focus?.();
    };
  }, [open]);

  // Clone the trigger so clicking it opens the dialog, but it can't
  // submit the surrounding form directly.
  const triggerEl = React.cloneElement(trigger as React.ReactElement<Record<string, unknown>>, {
    type: "button",
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      setOpen(true);
    },
  });

  const confirmClass =
    tone === "gold" ? "btn btn-gold btn-md"
    : tone === "warning" ? "btn btn-claret btn-md"
    : "btn btn-claret btn-md";

  return (
    <>
      {triggerEl}
      {mounted && open && createPortal(
        <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] flex justify-center px-3 py-4 overflow-y-auto overscroll-contain">
          <button
            type="button"
            aria-label={cancelLabel}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            style={{ animation: "cd-fade 160ms ease-out" }}
          />
          <div
            ref={panelRef}
            className="relative my-auto w-full max-w-[360px] rounded-xl border border-border-strong bg-bg-elevated shadow-[0_30px_80px_oklch(5%_0.05_264_/_0.65),inset_0_1px_0_rgba(255,255,255,0.06)] p-5 lg:p-6"
            style={{ animation: "cd-rise 200ms var(--ease-arrive)" }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"
            >
              <I.x s={16} />
            </button>

            <div className="mb-3 flex items-start gap-2.5">
              <I.warning s={18} />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">
                  Confirm · Thibitisha
                </p>
                <h2 className="mt-0.5 font-display text-[18px] font-bold text-text leading-tight">
                  {title}
                </h2>
              </div>
            </div>

            <div className="text-[13.5px] text-text-muted leading-relaxed mb-4">
              {body}
            </div>

            <div className="flex flex-col gap-2">
              <button
                ref={confirmBtn}
                type="button"
                onClick={() => { haptics.warning(); setOpen(false); onConfirm(); }}
                className={confirmClass + " w-full"}
              >
                {confirmLabel}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn btn-ghost btn-md w-full"
              >
                {cancelLabel}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
      <style>{`
        @keyframes cd-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cd-rise { from { transform: translateY(8px) scale(.98); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
      `}</style>
    </>
  );
}
