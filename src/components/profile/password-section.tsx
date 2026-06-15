"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
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

  const inputCls = "w-full h-10 px-3 rounded-md border border-border bg-inset text-text font-mono text-[13px] focus:outline-none focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)] transition-colors";

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <I.keyRound s={14} className="text-text-subtle shrink-0" />
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Password</p>
            <p className="text-[13px] text-text-muted">
              {hasPassword ? "Set · change anytime" : "Not set · add a password for extra security"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-8 px-3 rounded-md border border-border bg-bg-elevated font-mono text-[11px] font-bold text-text-muted hover:border-gold-700 hover:text-gold-300 transition-colors whitespace-nowrap"
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
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-gold-300">
          {hasPassword ? "Change password · Badilisha nenosiri" : "Set password · Weka nenosiri"}
        </p>
      </div>
      {hasPassword && (
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-1.5">
            Current password
          </label>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            className={inputCls}
          />
        </div>
      )}
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-1.5">
          New password (8+ characters)
        </label>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          placeholder="••••••••"
          className={inputCls}
        />
      </div>
      <div>
        <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-1.5">
          Confirm new password
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          placeholder="••••••••"
          className={inputCls}
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
