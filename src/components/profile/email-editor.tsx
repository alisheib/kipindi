"use client";

/**
 * Contact-email editor for the account page. Lets any player add/update/clear
 * the email that receipts (deposit, withdraw, win, KYC, etc.) are sent to.
 * Backed by updateProfileBasicsAction (passes the unchanged display name so
 * the single basics action handles both fields).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { updateProfileBasicsAction, resendEmailVerificationAction } from "@/app/profile/actions";

export function EmailEditor({ currentEmail, currentName, verified }: { currentEmail: string | null; currentName: string; verified?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentEmail ?? "");
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useT();

  const save = () => {
    const v = value.trim().toLowerCase();
    if (v === (currentEmail ?? "")) { setEditing(false); return; }
    start(async () => {
      const fd = new FormData();
      fd.set("displayName", currentName || "Player"); // basics action requires a name
      fd.set("email", v); // "" clears it
      const r = await updateProfileBasicsAction(fd);
      if (!r.ok) { toast({ title: t.toast.emailFailed, description: r.error, variant: "danger" }); return; }
      toast({
        title: v ? t.toast.emailSaved : "Email removed",
        description: v ? (r.emailVerificationSent ? t.toast.checkInbox : "Receipts will be sent here.") : undefined,
        variant: "success",
      });
      setEditing(false);
      router.refresh();
    });
  };

  const resend = () => {
    if (!currentEmail) return;
    start(async () => {
      const r = await resendEmailVerificationAction();
      if (!r.ok) { toast({ title: t.toast.couldntResend, description: r.error, variant: "danger" }); return; }
      toast({ title: t.toast.confirmationSent, description: t.toast.checkInbox, variant: "success" });
      router.refresh();
    });
  };

  return (
    <div className="rounded-lg border border-border bg-bg-inset/40 px-3.5 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted">Contact email · Barua pepe</p>
      {editing ? (
        <div className="mt-1.5 flex items-center gap-2">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } if (e.key === "Escape") { e.preventDefault(); setEditing(false); setValue(currentEmail ?? ""); } }}
            placeholder="you@example.com"
            aria-label="Contact email"
            className="flex-1 min-w-0 bg-transparent border-b border-gold-500 focus:outline-none text-[14px] text-text px-0 py-0.5"
          />
          <button type="button" onClick={save} disabled={pending} className="btn btn-gold btn-sm shrink-0">
            {pending ? <Spinner size={14} /> : "Save"}
          </button>
        </div>
      ) : (
        <div className="mt-1 space-y-1.5">
          <button type="button" onClick={() => { setValue(currentEmail ?? ""); setEditing(true); }} className="inline-flex items-center gap-2 text-left group" aria-label="Edit contact email">
            <span className={`text-[14px] ${currentEmail ? "text-text" : "text-text-subtle italic"}`}>
              {currentEmail || "Add your email for receipts"}
            </span>
            <I.edit s={12} />
          </button>
          {currentEmail && (
            verified ? (
              <span className="inline-flex items-center gap-1 rounded-pill border border-yes-700 bg-yes-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-yes-300">
                <I.check s={10} /> Confirmed · Imethibitishwa
              </span>
            ) : (
              <span className="inline-flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-pill border border-gold-700 bg-gold-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-gold-300">
                  <I.mail s={10} /> Unconfirmed · Haijathibitishwa
                </span>
                <button type="button" onClick={resend} disabled={pending} className="font-mono text-[11px] text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline disabled:opacity-60">
                  {pending ? "Sending…" : "Resend link"}
                </button>
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
}
