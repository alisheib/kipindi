"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";
import { adminResetPasswordAction } from "./actions";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";

export function ResetPasswordButton({ userId }: { userId: string }) {
  // A1 — this control only ACTS, so a role holding VIEW without ACT is shown why rather
  // than being offered a button the server will refuse (and logged as a privilege
  // escalation for pressing it). See docs/ADMIN-CONSOLE-FINDINGS.md.
  const mayAct = useMayAct();

  const [result, setResult] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const overlay = useActionOverlay();
  const { toast } = useToast();

  // Rules of hooks: read the gate as a hook at the top, ACT on it below every other hook.
  // Revoking an ACT grant mid-session flips `mayAct` on the next router.refresh(); an early
  // return above these hooks would render fewer hooks than the last pass and crash the page.
  // ⛔ It also has to sit ABOVE the `if (result)` panel below, so a viewer downgraded to
  // read-only mid-ceremony is never shown the temporary password.
  if (!mayAct) return <ActReadOnly />;

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
          <p className="font-mono text-micro uppercase eyebrow text-warning-fg">Temporary password</p>
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
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          leading={<I.keyRound s={13} />}
        >
          {pending ? "Resetting…" : "Reset password"}
        </Button>
      }
    />
    </>
  );
}
