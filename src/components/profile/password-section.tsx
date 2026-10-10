"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
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
    // FEEDBACK LAW F3 — a slip the player can fix is the `factual` toast, never `warning`, which is struck in GOLD
    // (`bg-gold-500`; DESIGN_AUTHORITY F3: "a refusal has earned nothing"). R5-C, the second gold audit, 2026-10-09.
    if (next.length < 8) { toast({ title: t.toast.passwordMin8, variant: "factual" }); return; }
    if (next !== confirm) { toast({ title: t.toast.passwordsDontMatch, variant: "factual" }); return; }
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
            {/* The setting's name is a FIELD LABEL, as the contact e-mail's beside it on /profile/account (`FieldLegend`,
                the Field atom's label — the form label's own ink, `--text-muted`, and its weight). It was the same recipe
                copied by hand without the bold, so the two rows of one card named their fields in two weights
                (2026-10-10, the census of Ali's ruling (3); test:visual-pass-r8b). */}
            <FieldLegend as="p">{t.common.passwordLabel}</FieldLegend>
            <p className="text-[13px] text-text-muted text-balance break-keep [overflow-wrap:anywhere]">
              {hasPassword ? t.common.passwordSetHint : t.common.passwordNotSetHint}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-[30px] px-3 rounded-md border border-border bg-bg-elevated font-mono text-[11px] font-bold text-text-muted hover:border-brand-400 hover:text-text transition-colors whitespace-nowrap inline-flex items-center"
        >
          {hasPassword ? t.common.change : t.common.setPassword}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ⛔ NOT GOLD (R5-C, the second gold audit, 2026-10-09). A password is never money (DESIGN_AUTHORITY Q5): the open
          form's key and eyebrow were gold, its Save a hand-rolled gold button and the closed row's hover gold. The eyebrow
          and its key take the ink every player eyebrow wears, the hover the text's own, and the two actions are the kit
          pair the e-mail editor beside this section already uses — primary Save, ghost Cancel, both `sm` (40px, §A2). */}
      <div className="flex items-center gap-2.5">
        <I.keyRound s={14} className="text-text-subtle shrink-0" />
        <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">
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
        <Button type="button" variant="primary" size="sm" onClick={submit} disabled={pending || next.length < 8}>
          {pending ? t.common.saving : hasPassword ? t.common.updatePassword : t.common.setPassword}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => { setOpen(false); setCurrent(""); setNext(""); setConfirm(""); }}>
          {t.common.cancel}
        </Button>
      </div>
    </div>
  );
}
