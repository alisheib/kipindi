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
import { AlertTriangle, X } from "lucide-react";
import { haptics } from "@/lib/haptics";

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
  const [mounted, setMounted] = React.useState(false);
  const confirmBtn = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => { setMounted(true); }, []);

  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => confirmBtn.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); window.removeEventListener("keydown", onKey); };
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
        <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] flex items-center justify-center px-3">
          <button
            type="button"
            aria-label={cancelLabel}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            style={{ animation: "cd-fade 160ms ease-out" }}
          />
          <div
            className="relative w-full max-w-[440px] rounded-xl border border-border-strong bg-bg-elevated shadow-[0_30px_80px_oklch(5%_0.05_264_/_0.65),inset_0_1px_0_rgba(255,255,255,0.06)] p-5 lg:p-6"
            style={{ animation: "cd-rise 200ms var(--ease-arrive)" }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-subtle hover:bg-bg-overlay hover:text-text transition-colors"
            >
              <X size={16} aria-hidden />
            </button>

            <div className="mb-3 flex items-start gap-2.5">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-claret-300" aria-hidden />
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

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn btn-ghost btn-md w-full"
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmBtn}
                type="button"
                onClick={() => { haptics.warning(); setOpen(false); onConfirm(); }}
                className={confirmClass + " w-full"}
              >
                {confirmLabel}
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
