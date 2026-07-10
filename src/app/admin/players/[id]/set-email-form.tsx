"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";
import { setPlayerEmailAction } from "./actions";

export function SetEmailForm({ userId }: { userId: string }) {
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();
  const overlay = useActionOverlay();
  const router = useRouter();

  const submit = () => {
    if (!email.trim() || pending) return;
    overlay.run("Saving email…", "Updating this player's contact address.");
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("userId", userId);
        fd.set("email", email.trim());
        const r = await setPlayerEmailAction(fd);
        if (r.ok) {
          overlay.succeed("Email saved", `Set to ${email.trim()}`);
          setEmail("");
          router.refresh();
        } else {
          overlay.fail("Couldn't set email", r.error);
        }
      } catch {
        overlay.fail("Couldn't set email", "Server error — please try again.");
      }
    });
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="player@example.com"
        className="flex-1 min-w-0 h-8 px-2.5 rounded-md border border-border bg-bg-inset text-text font-mono text-[12px] focus:outline-none focus:border-[var(--brand-500)] transition-colors"
      />
      <ConfirmDialog
        trigger={
          <button
            type="button"
            disabled={pending || !email.trim()}
            className="h-8 px-3 rounded-md border border-warning-fg/40 bg-warning/10 font-mono text-[11px] font-bold text-warning-fg hover:bg-warning/20 disabled:opacity-40 transition-colors"
          >
            {pending ? "Saving…" : "Set email"}
          </button>
        }
        title="Change player email"
        body={<>All KYC notifications, payment receipts, and account recovery will go to <strong className="font-mono text-text">{email || "…"}</strong>. This cannot be undone without another manual change.</>}
        confirmLabel="Yes, set email"
        tone="warning"
        onConfirm={submit}
      />
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </div>
  );
}
