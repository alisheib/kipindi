"use client";

/**
 * CoolOffConfirm — two-step confirmation for the cooling-off break,
 * matching the SelfExcludeConfirm pattern. A misclick on a plain submit
 * button should never lock a player out of their account for 24h+.
 */

import { useRef } from "react";
import { I } from "@/components/ui/glyphs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/lib/i18n";

export function CoolOffConfirm() {
  const { t } = useT();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const submitForm = () => {
    const form = buttonRef.current?.closest("form");
    form?.requestSubmit();
  };

  return (
    <ConfirmDialog
      tone="claret"
      title={t.common.startABreak}
      body={
        <p>
          {t.rg.breakDescription}
        </p>
      }
      confirmLabel={t.common.startABreak}
      onConfirm={submitForm}
      trigger={
        <button
          ref={buttonRef}
          type="button"
          className="btn btn-ghost btn-md inline-flex items-center gap-1.5"
        >
          <I.pause s={13} />
          {t.common.startABreak}
        </button>
      }
    />
  );
}
