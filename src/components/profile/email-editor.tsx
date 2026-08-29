"use client";

/**
 * Contact-email editor for the account page. Lets any player add/update/clear
 * the email that receipts (deposit, withdraw, win, KYC, etc.) are sent to.
 * Backed by updateProfileBasicsAction (passes the unchanged display name so
 * the single basics action handles both fields).
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { updateProfileBasicsAction, resendEmailVerificationAction } from "@/app/profile/actions";
import { errorCopy } from "@/lib/error-copy";
import { verifyErrorMessage } from "@/lib/verify-error";
import { FieldLegend } from "@/components/ui/field-legend";

export function EmailEditor({ currentEmail, verified }: { currentEmail: string | null; verified?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentEmail ?? "");
  const [pending, start] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Enter and the Save button both reach `save()`, and only the button is
  // disabled while pending — so Enter could raise a second server action on top
  // of the first. A ref, not `pending`: useTransition's flag flips on the NEXT
  // render, so a call raised before that render still reads `false`.
  const savingRef = useRef(false);
  // §A3 — leaving edit mode unmounts the field and focus falls to <body>, so a
  // keyboard user has to tab from the top of the page again. There is no
  // blur-to-save here, so returning focus to the trigger is always the right
  // move: nothing else can have claimed it.
  const returnFocusRef = useRef(false);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useT();

  const open = () => {
    savingRef.current = false;
    setValue(currentEmail ?? "");
    setEditing(true);
  };

  const close = () => {
    returnFocusRef.current = true;
    setEditing(false);
  };

  useEffect(() => {
    if (editing || !returnFocusRef.current) return;
    returnFocusRef.current = false;
    triggerRef.current?.focus();
  }, [editing]);

  const save = () => {
    if (savingRef.current) return;
    const v = value.trim().toLowerCase();
    if (v === (currentEmail ?? "")) { close(); return; }
    // Stays true through the success path: `currentEmail` only refreshes on the
    // next server render. `open()` clears it, and so does the refusal below.
    savingRef.current = true;
    start(async () => {
      const fd = new FormData();
      // Deliberately do NOT send displayName — this editor changes an email and
      // nothing else. It used to send `currentName || "Player"`, which wrote the
      // literal string "Player" over the name of anyone who hadn't set one.
      fd.set("email", v); // "" clears it
      // B-12 — a flaky network mid-action throws inside the transition; uncaught,
      // React swaps the whole page for error.tsx. Same handling as a refusal.
      let r: Awaited<ReturnType<typeof updateProfileBasicsAction>>;
      try {
        r = await updateProfileBasicsAction(fd);
      } catch {
        r = { ok: false, error: t.error.somethingDidntWork };
      }
      if (!r.ok) { savingRef.current = false; toast({ title: t.toast.emailFailed, description: errorCopy(t, r), variant: "danger" }); return; }
      toast({
        title: v ? t.toast.emailSaved : t.common.emailRemoved,
        description: v ? (r.emailVerificationSent ? t.toast.checkInbox : t.toast.receiptsHere) : undefined,
        variant: "success",
      });
      close();
      router.refresh();
    });
  };

  const resend = () => {
    if (!currentEmail) return;
    start(async () => {
      // B-12 — guarded like the save path.
      let r: Awaited<ReturnType<typeof resendEmailVerificationAction>>;
      try {
        r = await resendEmailVerificationAction();
      } catch {
        toast({ title: t.toast.couldntResend, description: t.error.somethingDidntWork, variant: "danger" });
        return;
      }
      // B-7 — `r.error` here is a CODE (RATE_LIMITED, EMAIL_SUPPRESSED, …). It was
      // printed literally, machine token and all, and dropped `retryAfterSec`.
      // `verifyErrorMessage` is the existing mapper for exactly these codes.
      if (!r.ok) { toast({ title: t.toast.couldntResend, description: verifyErrorMessage(t, r.error, r.retryAfterSec), variant: "danger" }); return; }
      toast({ title: t.toast.confirmationSent, description: t.toast.checkInbox, variant: "success" });
      router.refresh();
    });
  };

  return (
    <div className="rounded-lg border border-border bg-bg-inset/40 px-3.5 py-2.5">
      <FieldLegend as="p">{t.common.contactEmail}</FieldLegend>
      {editing ? (
        <div className="mt-1.5 flex items-center gap-2">
          {/* §A3 — this field carried `focus:outline-none` with NO replacement, and a
              Tailwind `:focus` rule outranks the `:where(…)` catch-all in globals.css,
              so a keyboard user got NO focus change at all on the address every receipt
              is sent to. The constant underline is not a focus indicator: a decoration
              that never changes carries no state. So the ring is the §A3 recipe (2px
              --brand-500 outline at offset 2 + the 4px 25% halo), and the underline is
              re-toned off gold — §M3 reserves gold for earned money and status, which a
              contact preference is not — onto `--border-control`, the token `.input`
              already uses precisely because a control's only boundary must clear 3:1
              (WCAG 1.4.11). It now MOVES to brand on focus instead of standing still. */}
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } if (e.key === "Escape") { e.preventDefault(); setValue(currentEmail ?? ""); close(); } }}
            placeholder="you@example.com"
            aria-label={t.common.contactEmail}
            className="flex-1 min-w-0 bg-transparent border-b border-border-control transition-colors focus:border-brand-500 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[color:var(--brand-500)] focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand-500)_25%,transparent)] text-[14px] text-text px-0 py-0.5"
          />
          <button type="button" onClick={save} disabled={pending} className="btn btn-primary btn-sm shrink-0">
            {pending ? <Spinner size={14} /> : t.common.save}
          </button>
        </div>
      ) : (
        <div className="mt-1 space-y-1.5">
          <button ref={triggerRef} type="button" onClick={open} className="inline-flex items-center gap-2 text-left group" aria-label={t.common.editContactEmail}>
            <span className={`text-[14px] ${currentEmail ? "text-text" : "text-text-subtle italic"}`}>
              {currentEmail || t.profile.addEmailForReceipts}
            </span>
            <I.edit s={12} />
          </button>
          {currentEmail && (
            verified ? (
              <span className="inline-flex items-center gap-1 rounded-pill border border-yes-700 bg-yes-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-yes-300">
                <I.check s={10} /> {t.common.confirmed}
              </span>
            ) : (
              <span className="inline-flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-pill border border-gold-700 bg-gold-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-gold-300">
                  <I.mail s={10} /> {t.common.unconfirmed}
                </span>
                <button type="button" onClick={resend} disabled={pending} className="font-mono text-[11px] text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline disabled:opacity-60">
                  {pending ? t.common.sending : t.common.resendLink}
                </button>
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
}
