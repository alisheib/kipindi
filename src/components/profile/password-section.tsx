"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { I } from "@/components/ui/glyphs";
import { PasswordInput } from "@/components/ui/password-input";
import { FieldLegend } from "@/components/ui/field-legend";
import { changePasswordAction } from "@/app/profile/account/actions";
import { errorCopy } from "@/lib/error-copy";

export function PasswordSection({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useT();

  const submit = () => {
    if (pending) return;
    if (next.length < 8) { toast({ title: t.toast.passwordMin8, variant: "warning" }); return; }
    if (next !== confirm) { toast({ title: t.toast.passwordsDontMatch, variant: "warning" }); return; }
    start(async () => {
      const fd = new FormData();
      fd.set("current", current);
      fd.set("new", next);
      // B-12 — a flaky network mid-action throws inside the transition; uncaught,
      // React nukes the page (and the typed passwords) to error.tsx.
      let r: Awaited<ReturnType<typeof changePasswordAction>>;
      try {
        r = await changePasswordAction(fd);
      } catch {
        r = { ok: false, error: t.error.somethingDidntWork };
      }
      if (r.ok) {
        toast({ title: hasPassword ? t.toast.passwordUpdated : t.toast.passwordSet, variant: "success" });
        setOpen(false);
        setCurrent("");
        setNext("");
        setConfirm("");
        router.refresh();
      } else {
        // FEEDBACK LAW (DESIGN_AUTHORITY §F) — the title used to be the bare word
        // "Failed", which names neither what failed nor what survived. `errorCopy` was
        // already carrying the reason in the body; the title now says which action did
        // not happen, so the pair reads as reason + state without opening the description.
        toast({ title: t.toast.passwordFailed, description: errorCopy(t, r), variant: "danger" });
      }
    });
  };

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <I.keyRound s={14} className="text-text-subtle shrink-0" />
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">{t.common.passwordLabel}</p>
            <p className="text-[13px] text-text-muted">
              {hasPassword ? t.common.passwordSetHint : t.common.passwordNotSetHint}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-[30px] px-3 rounded-md border border-border bg-bg-elevated font-mono text-[11px] font-bold text-text-muted hover:border-brand-400 hover:text-gold-300 transition-colors whitespace-nowrap inline-flex items-center"
        >
          {hasPassword ? t.common.change : t.common.setPassword}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <I.keyRound s={14} className="text-gold-300 shrink-0" />
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-gold-300">
          {hasPassword ? t.common.updatePassword : t.common.setPassword}
        </p>
      </div>
      {hasPassword && (
        <div>
          <FieldLegend as="label" htmlFor="pw-current" className="block mb-1.5">
            {t.common.currentPassword}
          </FieldLegend>
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
        <FieldLegend as="label" htmlFor="pw-new" className="block mb-1.5">
          {t.common.newPassword8}
        </FieldLegend>
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
        <FieldLegend as="label" htmlFor="pw-confirm" className="block mb-1.5">
          {t.common.confirm}
        </FieldLegend>
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
          /* ⛔ LITERAL, NOT `h-9` — the spacing scale is overridden
             (tailwind.config.ts:200-215) and `h-9` renders 64px. 40px = --tap-min, the
             §A2 floor these two hand-rolled buttons must still clear. */
          className="h-[40px] px-4 rounded-md border border-gold-700 bg-gold-500/10 font-mono text-[11px] font-bold text-gold-300 hover:bg-gold-500/20 disabled:opacity-40 transition-colors"
        >
          {pending ? t.common.saving : hasPassword ? t.common.updatePassword : t.common.setPassword}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setCurrent(""); setNext(""); setConfirm(""); }}
          className="h-[40px] px-4 rounded-md border border-border font-mono text-[11px] text-text-subtle hover:text-text transition-colors"
        >
          {t.common.cancel}
        </button>
      </div>
    </div>
  );
}
