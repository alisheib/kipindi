"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";
import { setPlayerEmailAction } from "./actions";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";
import { UnsavedChangesGuard, PendingChangesBar } from "@/components/ui/unsaved-changes";

export function SetEmailForm({ userId }: { userId: string }) {
  // A1 — this control only ACTS, so a role holding VIEW without ACT is shown why rather
  // than being offered a button the server will refuse (and logged as a privilege
  // escalation for pressing it). See docs/ADMIN-CONSOLE-FINDINGS.md.
  const mayAct = useMayAct();

  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();
  const overlay = useActionOverlay();
  const router = useRouter();

  // Rules of hooks: read the gate as a hook at the top, ACT on it below every other hook.
  // Revoking an ACT grant mid-session flips `mayAct` on the next router.refresh(); an early
  // return above these hooks would render fewer hooks than the last pass and crash the page.
  if (!mayAct) return <ActReadOnly />;

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
          // DG-S-05/06 — the address the action returned, resolved to this page's email input.
          if ("field" in r && r.field) focusFirstInvalid(document.body, [r.field]);
        }
      } catch {
        overlay.fail("Couldn't set email", "Server error — please try again.");
      }
    });
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        data-field="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="player@example.com"
        /* ⚠️ LITERAL, not `h-8` — spacing is overridden (tailwind.config.ts:200-215) so `h-8`
           was 48px. 40px = --tap-min; keep this and the Save button beside it identical.

           §A3 / E-129 — focus used to be a 1px BORDER recolour and nothing else: no 2px
           ring, no halo, and in forced-colors (Windows high-contrast) not even that,
           because every border there is painted one system colour. This is the field an
           officer retypes a player's contact address into, so it takes the full house
           recipe — a real 2px --brand-500 `outline` at offset 2 (outline survives
           forced-colors where box-shadow does not, same reason `.gilt-metal:focus-visible`
           keeps one) plus the 4px 25% halo that `.admin-focus` draws. ⛔ Written out
           rather than left to `focus:outline-none`: Tailwind 3 quietly emits
           `outline: 2px solid transparent` for that utility and Tailwind 4 emits
           `outline-style: none`, so relying on it hides the intent and breaks on upgrade. */
        className="flex-1 min-w-0 h-[40px] px-2.5 rounded-md border border-border bg-bg-inset text-text font-mono text-[12px] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[color:var(--brand-500)] focus:border-[var(--brand-500)] focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand-500)_25%,transparent)] transition-colors"
      />
      <ConfirmDialog
        trigger={
          <button
            type="button"
            disabled={pending || !email.trim()}
            /* ⚠️ LITERAL, not `h-8` (48px on the overridden scale) — 40px, matching the
               email field beside it. */
            className="h-[40px] px-3 rounded-md border border-warning-fg/40 bg-warning/10 font-mono text-[11px] font-bold text-warning-fg hover:bg-warning/20 disabled:opacity-40 transition-colors"
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

      {/**
        * ⛔ NO `useFormDirty` HERE, AND NOT AN OVERSIGHT. That hook snapshots `FormData`, and
        * this control is a CONTROLLED `<input>` with no `<form>` around it at all — the hook
        * would find no form, return a null snapshot, and report clean for ever. The typed
        * address IS the state, so `email` is the honest dirty signal and reading it directly is
        * the shorter true answer.
        *
        * ⭐ THE BAR OFFERS NO SAVE, DELIBERATELY. Setting a player's address re-points their KYC
        * notices, receipts and account recovery, so it is gated behind a confirmation on purpose
        * — and a second Save on the bar would either duplicate that dialog or, worse, skip it.
        * The bar's job here is to say the work exists and offer the safe way out of it.
        */}
      <PendingChangesBar
        dirty={email.trim().length > 0}
        label="Email not set"
        detail="Use “Set email” to save it — it asks you to confirm first."
        onDiscard={() => setEmail("")}
      />
      <UnsavedChangesGuard
        dirty={email.trim().length > 0}
        body="An email address has been typed for this player but not set. Leaving now discards it."
      />
    </div>
  );
}
