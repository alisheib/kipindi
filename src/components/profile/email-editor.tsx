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
import { updateProfileBasicsAction } from "@/app/profile/actions";

export function EmailEditor({ currentEmail, currentName }: { currentEmail: string | null; currentName: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentEmail ?? "");
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const save = () => {
    const v = value.trim().toLowerCase();
    if (v === (currentEmail ?? "")) { setEditing(false); return; }
    start(async () => {
      const fd = new FormData();
      fd.set("displayName", currentName || "Player"); // basics action requires a name
      fd.set("email", v); // "" clears it
      const r = await updateProfileBasicsAction(fd);
      if (!r.ok) { toast({ title: "Couldn't save email", description: r.error, variant: "danger" }); return; }
      toast({ title: v ? "Email saved" : "Email removed", description: v ? "Receipts will be sent here." : undefined, variant: "success" });
      setEditing(false);
      router.refresh();
    });
  };

  return (
    <div className="rounded-lg border border-border bg-bg-inset/40 px-3.5 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle">Contact email · Barua pepe</p>
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
          <button type="button" onClick={save} disabled={pending} className="btn btn-gold btn-sm shrink-0" style={{ borderRadius: 999 }}>
            {pending ? <Spinner size={14} /> : "Save"}
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => { setValue(currentEmail ?? ""); setEditing(true); }} className="mt-1 inline-flex items-center gap-2 text-left group" aria-label="Edit contact email">
          <span className={`text-[14px] ${currentEmail ? "text-text" : "text-text-subtle italic"}`}>
            {currentEmail || "Add your email for receipts"}
          </span>
          <I.edit s={12} />
        </button>
      )}
    </div>
  );
}
