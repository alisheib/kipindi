"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { adminResetPasswordAction } from "./actions";

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [result, setResult] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { toast } = useToast();

  const reset = () => {
    if (pending) return;
    if (!confirm("Generate a temporary password for this player? They'll need to change it after signing in.")) return;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      const r = await adminResetPasswordAction(fd);
      if (r.ok) {
        setResult(r.tempPassword);
        toast({ title: "Password reset", description: "Copy the temporary password and share it with the player.", variant: "success" });
      } else {
        toast({ title: "Failed", description: r.error, variant: "danger" });
      }
    });
  };

  if (result) {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-gold-700 bg-gold-500/10 px-3 py-2">
        <I.keyRound s={14} className="text-gold-300 shrink-0" />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gold-300">Temporary password</p>
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
    );
  }

  return (
    <button
      type="button"
      onClick={reset}
      disabled={pending}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-bg-elevated font-mono text-[11px] font-semibold text-text-muted hover:border-gold-700 hover:text-gold-300 disabled:opacity-40 transition-colors"
    >
      <I.keyRound s={13} />
      {pending ? "Resetting…" : "Reset password"}
    </button>
  );
}
