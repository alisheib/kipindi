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
import { I } from "@/components/ui/glyphs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n";

export function SelfExcludeConfirm() {
  const { t } = useT();
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
      title={t.common.selfExclude}
      body={
        <p>
          {t.rg.selfExcludeDescription}
        </p>
      }
      confirmLabel={t.common.selfExclude}
      onConfirm={submitForm}
      trigger={
        <button
          ref={buttonRef}
          type="button"
          className="btn btn-claret btn-md inline-flex items-center gap-1.5"
        >
          <I.lock s={13} />
          {t.common.selfExclude}
        </button>
      }
    />
  );
}
