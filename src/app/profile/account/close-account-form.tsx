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
          {t.common.type} <span className="font-mono text-danger-fg">CLOSE MY ACCOUNT</span> {t.common.typeToConfirm}
        </FieldLegend>
        <input
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          /* ⚠️ TOKEN, not `h-10` — spacing is overridden (tailwind.config.ts:200-215) so
             `h-10` rendered an 80px field. `--h-input` is the kit's 44px input height,
             which is what this hand-rolled input was always meant to match.

             §A3 / E-129 — the focus ring here is a `box-shadow`, and forced-colors
             (Windows high-contrast) STRIPS box-shadow while keeping `outline`; the
             border recolour goes too, since forced-colors paints every border the same
             system colour. So the claret ring — deliberate, this is the destructive
             confirm field, and it stays claret rather than borrowing the brand blue —
             needs a real `outline` beside it, the same shape `.gilt-metal:focus-visible`
             uses. ⛔ It is written out rather than left to `focus:outline-none`: in
             Tailwind 3 that utility silently EMITS `outline: 2px solid transparent`
             (corePlugins outlineStyle), which happens to be this bridge, but Tailwind 4
             redefines it as `outline-style: none` — so the accessibility of this field
             was resting on a version-specific implementation detail nobody had written
             down. Transparent, so forced-colors substitutes a real colour and normal
             rendering is unchanged.

             🔴 DG-A-21 (2026-08-30) — AND THE RING THIS NOTE DEFENDS IS NOT THE RING THAT
             SHIPPED. The paragraph above says "the claret ring — deliberate, this is the
             destructive confirm field, and it stays claret rather than borrowing the brand
             blue". The code underneath it read `focus:border-no-700` and a `--no-500` halo:
             the betting NO ink, which §B2a reserves for the side a stake is on and which D2
             minted `--danger-*` to stop app state wearing. So the intent was recorded, argued
             and then not implemented — a comment defending a colour the file never painted.
             ⭐ Resolved toward the NOTE, not toward the token, because two things agree with
             it: §B4a gives claret the act that cannot be taken back, and the `<ConfirmDialog>`
             on the very next element is already `tone="claret"`. The halo also goes 3px → 4px,
             which is the figure §A3 states for the one focus recipe. */
          className="w-full h-[var(--h-input)] px-3 rounded-md border border-border bg-bg-overlay font-mono text-[16px] tabular-nums text-text focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-transparent focus:border-claret-400 focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--claret-500)_25%,transparent)] transition-colors"
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
