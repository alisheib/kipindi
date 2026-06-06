"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { suspendPlayerAction, restorePlayerAction } from "./actions";

/**
 * Suspend / Restore controls — the "ban hammer" pair on the player
 * detail page. Each click opens a small reason-prompt modal so the
 * audit log always has a justification attached.
 *
 * If the player is currently SUSPENDED the only useful action is
 * Restore; otherwise the only useful action is Suspend. Keeping
 * both buttons mounted (with the inactive one greyed-out) makes the
 * state shift obvious to a second officer reviewing the queue.
 */
export function SuspendControls({
  userId,
  currentStatus,
}: {
  userId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"suspend" | "restore" | null>(null);
  const [reason, setReason] = useState("");

  const isSuspended = currentStatus === "SUSPENDED";
  const isClosed = currentStatus === "CLOSED";

  const submit = () => {
    if (!mode || reason.trim().length < 5) return;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("reason", reason.trim());
      const r = mode === "suspend"
        ? await suspendPlayerAction(fd)
        : await restorePlayerAction(fd);
      if (!r.ok) {
        toast({ title: `Could not ${mode}`, description: r.error, variant: "danger" });
        return;
      }
      toast({
        title: mode === "suspend" ? "Player suspended" : "Player restored",
        description: mode === "suspend"
          ? "Account is locked — login + bet placement now blocked."
          : "Account active again — login + bet placement re-enabled.",
        variant: mode === "suspend" ? "warning" : "success",
      });
      setMode(null);
      setReason("");
      router.refresh();
    });
  };

  const btnBase =
    "font-mono text-micro tracking-[0.10em] uppercase px-2.5 py-1.5 rounded-sm border inline-flex items-center gap-1.5";

  return (
    <>
      {!isSuspended && !isClosed && (
        <button
          type="button"
          onClick={() => { setMode("suspend"); setReason(""); }}
          disabled={pending}
          className={`${btnBase} border-no-700 bg-no-500/15 text-no-300 hover:bg-no-500/25 transition-colors`}
        >
          <I.shieldOff size={11} aria-hidden />
          Suspend player
        </button>
      )}
      {isSuspended && (
        <button
          type="button"
          onClick={() => { setMode("restore"); setReason(""); }}
          disabled={pending}
          className={`${btnBase} border-yes-700 bg-yes-500/15 text-yes-300 hover:bg-yes-500/25 transition-colors`}
        >
          <I.shieldcheck s={11} />
          Restore player
        </button>
      )}

      {mode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={mode === "suspend" ? "Suspend player" : "Restore player"}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
        >
          <button
            type="button"
            aria-label="Cancel"
            onClick={() => { if (!pending) setMode(null); }}
            className="dialog-scrim-anim absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="dialog-anim relative z-10 w-full max-w-[420px] rounded-xl border border-border bg-bg-elevated p-5 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-gold-300 mb-1">
              {mode === "suspend" ? "Suspend · Simamisha" : "Restore · Rejesha"}
            </p>
            <h3 className="font-display text-[18px] font-bold text-text leading-tight">
              {mode === "suspend"
                ? "Lock this account?"
                : "Restore account access?"}
            </h3>
            <p className="mt-1 text-[12.5px] italic text-text-subtle">
              {mode === "suspend"
                ? "Login + bets + deposits will be blocked until restored."
                : "Login + bets + deposits will be re-enabled."}
            </p>
            <label className="mt-3 block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle">
                Reason · Sababu (required, audit-logged)
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you taking this action?"
                className="mt-1 w-full rounded-md border border-border bg-bg-overlay px-2.5 py-2 text-[13px] text-text outline-none focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)] transition-colors"
                rows={3}
                maxLength={500}
                autoFocus
              />
              <span className="font-mono text-[10px] text-text-subtle">
                {reason.trim().length} / 500
              </span>
            </label>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { if (!pending) setMode(null); }}
                className="btn btn-ghost btn-md"
                disabled={pending}
              >
                Cancel · Ghairi
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending || reason.trim().length < 5}
                className={mode === "suspend" ? "btn btn-no btn-md" : "btn btn-gold btn-md"}
              >
                {pending
                  ? "Working…"
                  : mode === "suspend" ? "Suspend · Simamisha" : "Restore · Rejesha"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
