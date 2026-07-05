"use client";

import { useRef, useState } from "react";
import { I } from "@/components/ui/glyphs";
import { Textarea } from "@/components/ui/textarea";
import { FieldLegend } from "@/components/ui/field-legend";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { closeAccountAction } from "./actions";
import { useT } from "@/lib/i18n";

export function CloseAccountForm() {
  const { t } = useT();
  const [confirm, setConfirm] = useState("");
  const canSubmit = confirm.trim() === "CLOSE MY ACCOUNT";
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={closeAccountAction} className="space-y-3">
      <label className="block">
        <FieldLegend className="block mb-1.5">{t.common.reasonOptional}</FieldLegend>
        <Textarea
          name="reason"
          rows={2}
          maxLength={500}
          placeholder={t.common.helpUsImprove}
        />
      </label>
      <label className="block">
        <FieldLegend className="block mb-1.5">
          {t.common.type} <span className="font-mono text-no-300">CLOSE MY ACCOUNT</span> {t.common.typeToConfirm}
        </FieldLegend>
        <input
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-border bg-bg-overlay font-mono text-[16px] tabular-nums text-text focus:outline-none focus:border-no-700 focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--no-500)_25%,transparent)] transition-colors"
          autoComplete="off"
        />
      </label>
      <ConfirmDialog
        tone="claret"
        title={t.common.closeAccountPermanently}
        body={
          <p>
            {t.common.closeIrreversibleBody}
          </p>
        }
        confirmLabel={t.common.yesClosePermanently}
        cancelLabel={t.common.keepMyAccount}
        onConfirm={() => formRef.current?.requestSubmit()}
        trigger={
          <button
            type="button"
            disabled={!canSubmit}
            className="btn btn-claret btn-md inline-flex items-center gap-1.5 disabled:opacity-40"
          >
            <I.alertOctagon s={13} />
            {t.common.permanentlyCloseAccount}
          </button>
        }
      />
    </form>
  );
}
