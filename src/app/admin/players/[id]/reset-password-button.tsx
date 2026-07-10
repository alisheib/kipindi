"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";
import { adminResetPasswordAction } from "./actions";

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [result, setResult] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const overlay = useActionOverlay();
  const { toast } = useToast();

  const reset = () => {
    if (pending) return;
    overlay.run("Resetting password…", "Generating a temporary password for this player.");
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("userId", userId);
        const r = await adminResetPasswordAction(fd);
        if (r.ok) {
          setResult(r.tempPassword);
          overlay.succeed("Password reset", "Copy the temporary password below.");
        } else {
          overlay.fail("Couldn't reset password", r.error);
        }
      } catch {
        overlay.fail("Couldn't reset password", "Server error — please try again.");
      }
    });
  };

  if (result) {
    return (
      <><ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
      <div className="inline-flex items-center gap-2 rounded-md border border-warning-fg/40 bg-warning/10 px-3 py-2">
        <I.keyRound s={14} className="text-warning-fg shrink-0" />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-warning-fg">Temporary password</p>
          <p className="font-mono text-[13px] font-bold text-text select-all">{result}</p>
        </div>
        <button
          type="button"
          onClick={() => { navigator.clipboard.writeText(result); toast({ title: "Copied", variant: "success" }); }}
          className="h-7 px-2 rounded border border-border bg-bg-elevated font-mono text-[10px] text-text-muted hover:text-text transition-colors"
        >
          Copy
        </button>
      </div>
      </>
    );
  }

  return (
    <><ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    <ConfirmDialog
      tone="warning"
      title="Reset password · Weka upya nenosiri"
      body="Generate a temporary password for this player? They'll need to change it after signing in."
      confirmLabel="Generate temporary password"
      onConfirm={reset}
      trigger={
        <button
          type="button"
          disabled={pending}
          className="font-mono text-micro tracking-[0.10em] uppercase px-2.5 py-1.5 rounded-sm border border-border bg-bg-elevated inline-flex items-center gap-1.5 text-text-muted hover:border-warning-fg/40 hover:text-warning-fg disabled:opacity-40 transition-colors"
        >
          <I.keyRound s={13} />
          {pending ? "Resetting…" : "Reset password"}
        </button>
      }
    />
    </>
  );
}
