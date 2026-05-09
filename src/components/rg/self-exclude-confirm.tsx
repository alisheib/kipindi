"use client";

/**
 * SelfExcludeConfirm — wraps the kit submit button for the self-
 * exclusion form so a misclick can never put a player into a 1-month or
 * permanent self-exclusion. Works against the surrounding <form
 * action={selfExcludeAction}> by letting the parent set the period
 * <select> and submitting via requestSubmit() only after confirmation.
 *
 * Player-protection (Tanzania Gaming Board / UK LCCP equivalent):
 * destructive RG actions must require a deliberate two-step confirmation.
 */

import { useRef } from "react";
import { Lock } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function SelfExcludeConfirm() {
  // The form is server-action-bound; we look it up by walking up the DOM
  // from the rendered button. This keeps the page server-rendered.
  const buttonRef = useRef<HTMLButtonElement>(null);

  const submitForm = () => {
    const form = buttonRef.current?.closest("form");
    form?.requestSubmit();
  };

  return (
    <ConfirmDialog
      tone="claret"
      title="Self-exclude · Jizuie"
      body={
        <>
          <p className="mb-2">
            You will be locked out of betting and your wallet for the period you
            selected. <strong className="text-text">This cannot be reversed</strong> until
            the period ends.
          </p>
          <p className="text-text-subtle italic text-[12.5px]">
            Hii haiwezi kubatilishwa kabla ya muda kuisha.
          </p>
        </>
      }
      confirmLabel="Yes, self-exclude"
      cancelLabel="Cancel · Ghairi"
      onConfirm={submitForm}
      trigger={
        <button
          ref={buttonRef}
          type="button"
          className="btn btn-claret btn-md inline-flex items-center gap-1.5"
        >
          <Lock size={13} aria-hidden />
          Self-exclude · Jizuie
        </button>
      }
    />
  );
}
