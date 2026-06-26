"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { PasswordInput } from "@/components/ui/password-input";
import { changePasswordAction } from "@/app/profile/account/actions";

export function PasswordSection({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const submit = () => {
    if (pending) return;
    if (next.length < 8) { toast({ title: "Password must be at least 8 characters", variant: "warning" }); return; }
    if (next !== confirm) { toast({ title: "Passwords don't match", variant: "warning" }); return; }
    start(async () => {
      const fd = new FormData();
      fd.set("current", current);
      fd.set("new", next);
      const r = await changePasswordAction(fd);
      if (r.ok) {
        toast({ title: hasPassword ? "Password updated" : "Password set", variant: "success" });
        setOpen(false);
        setCurrent("");
        setNext("");
        setConfirm("");
        router.refresh();
      } else {
        toast({ title: "Failed", description: r.error, variant: "danger" });
      }
    });
  };

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <I.keyRound s={14} className="text-text-subtle shrink-0" />
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">Password</p>
            <p className="text-[13px] text-text-muted">
              {hasPassword ? "Set · change anytime" : "Not set · add a password for extra security"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-[30px] px-3 rounded-md border border-border bg-bg-elevated font-mono text-[11px] font-bold text-text-muted hover:border-gold-700 hover:text-gold-300 transition-colors whitespace-nowrap inline-flex items-center"
        >
          {hasPassword ? "Change" : "Set password"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <I.keyRound s={14} className="text-gold-300 shrink-0" />
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-gold-300">
          {hasPassword ? "Change password · Badilisha nenosiri" : "Set password · Weka nenosiri"}
        </p>
      </div>
      {hasPassword && (
        <div>
          <label
            htmlFor="pw-current"
            className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted mb-1.5"
          >
            Current password · Nenosiri la sasa
          </label>
          <PasswordInput
            id="pw-current"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>
      )}
      <div>
        <label
          htmlFor="pw-new"
          className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted mb-1.5"
        >
          New password (8+) · Nenosiri jipya
        </label>
        <PasswordInput
          id="pw-new"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          placeholder="••••••••"
          showStrength
        />
      </div>
      <div>
        <label
          htmlFor="pw-confirm"
          className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted mb-1.5"
        >
          Confirm · Thibitisha
        </label>
        <PasswordInput
          id="pw-confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          placeholder="••••••••"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending || next.length < 8}
          className="h-9 px-4 rounded-md border border-gold-700 bg-gold-500/10 font-mono text-[11px] font-bold text-gold-300 hover:bg-gold-500/20 disabled:opacity-40 transition-colors"
        >
          {pending ? "Saving…" : hasPassword ? "Update password" : "Set password"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setCurrent(""); setNext(""); setConfirm(""); }}
          className="h-9 px-4 rounded-md border border-border font-mono text-[11px] text-text-subtle hover:text-text transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
