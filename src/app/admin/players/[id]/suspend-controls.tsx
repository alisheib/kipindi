"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { I } from "@/components/ui/glyphs";
import { suspendPlayerAction, restorePlayerAction } from "./actions";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";

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
  // A1 — this control only ACTS, so a role holding VIEW without ACT is shown why rather
  // than being offered a button the server will refuse (and logged as a privilege
  // escalation for pressing it). See docs/ADMIN-CONSOLE-FINDINGS.md.
  const mayAct = useMayAct();
  if (!mayAct) return <ActReadOnly />;

  const router = useRouter();
  const [pending, start] = useTransition();
  const { deferToast, toast } = useDeferredToast(pending);
  const [mode, setMode] = useState<"suspend" | "restore" | null>(null);
  const [reason, setReason] = useState("");
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  const isSuspended = currentStatus === "SUSPENDED";
  const isClosed = currentStatus === "CLOSED";

  const submit = () => {
    if (!mode || reason.trim().length < 5) return;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("reason", reason.trim());
      const r = mode === "suspend"
        ? await runAdminAction(() => suspendPlayerAction(fd))
        : await runAdminAction(() => restorePlayerAction(fd));
      if (!r.ok) {
        toast({ title: `Could not ${mode}`, description: r.error, variant: "danger" });
        return;
      }
      setMode(null);
      setReason("");
      router.refresh();
      deferToast({
        title: mode === "suspend" ? "Player suspended" : "Player restored",
        description: mode === "suspend"
          ? "Account is locked — login + bet placement now blocked."
          : "Account active again — login + bet placement re-enabled.",
        variant: mode === "suspend" ? "warning" : "success",
      });
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

      <Modal
        open={!!mode}
        onClose={() => { if (!pending) setMode(null); }}
        role="alertdialog"
        ariaLabel={mode === "suspend" ? "Suspend player" : "Restore player"}
        maxWidth={420}
        closeOnScrim={!pending}
        showClose={!pending}
        ariaBusy={pending}
        initialFocus={reasonRef}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-text mb-1">
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
            ref={reasonRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you taking this action?"
            className="mt-1 w-full rounded-md border border-border bg-bg-overlay px-2.5 py-2 text-[13px] text-text outline-none admin-focus transition-colors"
            rows={3}
            maxLength={500}
          />
          <span className="font-mono text-[10px] text-text-subtle">
            {reason.trim().length} / 500
          </span>
        </label>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            type="button"
            variant={mode === "suspend" ? "no" : "yes"}
            size="lg"
            fullWidth
            loading={pending}
            disabled={reason.trim().length < 5}
            onClick={submit}
          >
            {mode === "suspend" ? "Suspend · Simamisha" : "Restore · Rejesha"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            fullWidth
            disabled={pending}
            onClick={() => { if (!pending) setMode(null); }}
          >
            Cancel · Ghairi
          </Button>
        </div>
      </Modal>
    </>
  );
}
