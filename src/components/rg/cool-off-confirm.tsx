"use client";

/**
 * CoolOffConfirm — two-step confirmation for the cooling-off break,
 * matching the SelfExcludeConfirm pattern. A misclick on a plain submit
 * button should never lock a player out of their account for 24h+.
 */

import { useRef } from "react";
import { I } from "@/components/ui/glyphs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function CoolOffConfirm() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const submitForm = () => {
    const form = buttonRef.current?.closest("form");
    form?.requestSubmit();
  };

  return (
    <ConfirmDialog
      tone="claret"
      title="Start a break · Pumzika"
      body={
        <>
          <p className="mb-2">
            You will be <strong className="text-text">signed out immediately</strong> and
            cannot sign in, bet, or deposit until the break ends.
          </p>
          <p className="text-text-subtle italic text-[12.5px]">
            Utatoka mara moja na huwezi kuingia hadi muda uishe.
          </p>
        </>
      }
      confirmLabel="Yes, start break"
      cancelLabel="Cancel · Ghairi"
      onConfirm={submitForm}
      trigger={
        <button
          ref={buttonRef}
          type="button"
          className="btn btn-ghost btn-md inline-flex items-center gap-1.5"
        >
          <I.pause s={13} />
          Start break
        </button>
      }
    />
  );
}
