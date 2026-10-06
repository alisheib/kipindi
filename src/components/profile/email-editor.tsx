"use client";

/**
 * Contact-email editor for the account page. Lets any player add/update/clear
 * the email that receipts (deposit, withdraw, win, KYC, etc.) are sent to.
 * Backed by changeEmailAction (route audit 2026-10-06, A1): the address also
 * receives password-reset links, so adding, changing or removing it asks for the
 * current password. An account with no password (`hasPassword` false — the
 * dormant code-sign-in era) is not asked; the server records that.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { changeEmailAction, resendEmailVerificationAction } from "@/app/profile/actions";
import { errorCopy } from "@/lib/error-copy";
import { verifyErrorMessage } from "@/lib/verify-error";
import { FieldLegend } from "@/components/ui/field-legend";

export function EmailEditor({ currentEmail, verified, hasPassword }: { currentEmail: string | null; verified?: boolean; hasPassword: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentEmail ?? "");
  const [pw, setPw] = useState("");
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
    setPw("");
    setEditing(true);
  };

  const close = () => {
    returnFocusRef.current = true;
    setPw("");
    setEditing(false);
  };

  const cancel = () => { setValue(currentEmail ?? ""); setPw(""); close(); };
  // The password is asked only for a real change: saving the address already on file is a no-op that closes.
  const changing = value.trim().toLowerCase() !== (currentEmail ?? "");

  useEffect(() => {
    if (editing || !returnFocusRef.current) return;
    returnFocusRef.current = false;
    triggerRef.current?.focus();
  }, [editing]);

  const save = () => {
    if (savingRef.current) return;
    const v = value.trim().toLowerCase();
    if (v === (currentEmail ?? "")) { close(); return; }
    if (hasPassword && !pw) return;
    // Stays true through the success path: `currentEmail` only refreshes on the
    // next server render. `open()` clears it, and so does the refusal below.
    savingRef.current = true;
    start(async () => {
      const fd = new FormData();
      // This editor changes an email and nothing else — never the display name.
      fd.set("email", v); // "" clears it
      if (hasPassword) fd.set("currentPassword", pw);
      // B-12 — a flaky network mid-action throws inside the transition; uncaught,
      // React swaps the whole page for error.tsx. Same handling as a refusal.
      let r: Awaited<ReturnType<typeof changeEmailAction>>;
      try {
        r = await changeEmailAction(fd);
      } catch {
        r = { ok: false, error: t.error.somethingDidntWork };
      }
      // A refusal keeps the editor open with the address as typed; the password is cleared, never kept.
      if (!r.ok) { savingRef.current = false; setPw(""); toast({ title: t.toast.emailFailed, description: errorCopy(t, r), variant: "danger" }); return; }
      // A7 (route audit 2026-10-06) · THE ADDRESS SAVED, THE LINK DID NOT GO. "Check your inbox" over a send that failed
      // (or an address that bounced before) sent the player to wait for mail that was never coming. Say what is true and
      // name the way on — `factual`, a settled outcome: never success, and never the gold `warning`.
      if (v && !r.emailVerificationSent && r.deliveryIssue) {
        toast({
          title: t.toast.emailSaved,
          description: r.deliveryIssue === "suppressed" ? t.wallet.verifyErrSuppressed : t.wallet.verifyErrSendFailed,
          variant: "factual",
        });
      } else {
        toast({
          title: v ? t.toast.emailSaved : t.common.emailRemoved,
          description: v ? (r.emailVerificationSent ? t.toast.checkInbox : t.toast.receiptsHere) : undefined,
          variant: "success",
        });
      }
      close();
      router.refresh();
    });
  };

  // One handler for both fields: Enter saves, Escape cancels.
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); save(); }
    if (e.key === "Escape") { e.preventDefault(); cancel(); }
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
      // A7 / D-X4 (route audit 2026-10-06) · `sent: false` means the address is ALREADY CONFIRMED (in another tab, say)
      // and nothing was sent. This said "Confirmation sent" anyway. The deposit gate and the bar handle it the same way.
      if (!r.sent) { toast({ title: t.common.alreadyConfirmed, description: t.common.emailAlreadyConfirmedBody, variant: "success" }); router.refresh(); return; }
      toast({ title: t.toast.confirmationSent, description: t.toast.checkInbox, variant: "success" });
      router.refresh();
    });
  };

  return (
    <div className="rounded-lg border border-border bg-bg-inset/40 px-3.5 py-2.5">
      <FieldLegend as="p">{t.common.contactEmail}</FieldLegend>
      {editing ? (
        <div className="mt-1.5 space-y-2.5">
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
            onKeyDown={onKey}
            placeholder="you@example.com"
            aria-label={t.common.contactEmail}
            className="w-full min-w-0 bg-transparent border-b border-border-control transition-colors focus:border-brand-500 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[color:var(--brand-500)] focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand-500)_25%,transparent)] text-[14px] text-text px-0 py-0.5"
          />
          {hasPassword && (
            <div>
              <FieldLegend as="label" htmlFor="email-current-pw" className="block mb-1.5">{t.common.currentPassword}</FieldLegend>
              <PasswordInput id="email-current-pw" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" placeholder="••••••••" onKeyDown={onKey} />
              <p className="mt-1.5 text-body-sm text-text-subtle">{t.common.reauthHint}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="primary" size="sm" onClick={save} loading={pending} disabled={changing && hasPassword && !pw}>{t.common.save}</Button>
            <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={pending}>{t.common.cancel}</Button>
          </div>
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
              <span className="inline-flex items-center gap-1 rounded-pill border border-success-border bg-success-bg px-2 py-0.5 font-mono text-micro font-bold uppercase tracking-[0.1em] text-success-fg">
                <I.check s={10} /> {t.common.confirmed}
              </span>
            ) : (
              <span className="inline-flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-pill border border-gold-700 bg-gold-500/10 px-2 py-0.5 font-mono text-micro font-bold uppercase tracking-[0.1em] text-gold-300">
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
