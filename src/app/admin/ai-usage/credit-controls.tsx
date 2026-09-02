"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UnsavedChangesGuard, PendingChangesBar, useFormDirty } from "@/components/ui/unsaved-changes";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { setCreditLimitAction, startTopUpWindowAction } from "./actions";

export function CreditControls({ limitUsd }: { limitUsd: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  /* ⚠️ ONE FIELD STILL COUNTS, and the bar still appears. The temptation here is to say a number
     typed beside its own visible "Set limit" button cannot be lost — but the officer who types a
     limit and then clicks a sidebar link loses it exactly as silently as on a five-field form,
     and a console that warns on some forms and not others teaches nobody when to trust it. The
     rule is uniform: every page-level form gets both surfaces. */
  const formRef = useRef<HTMLFormElement>(null);
  const { dirty, markSaved, formProps } = useFormDirty(formRef);

  const onSetLimit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    /* ⭐ The form element is captured before the async boundary: `e.currentTarget` is null by
       the time the transition resolves, and it is the container `focusFirstInvalid` searches. */
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const r = await setCreditLimitAction(fd);
      if (!r.ok) {
        toast({ title: "Couldn't update", description: r.error, variant: "danger" });
        // ⭐ DG-S-05/06 — and then take the operator to the field the server named.
        if (r.field) focusFirstInvalid(form, [r.field]);
      }
      else { markSaved(); router.refresh(); deferToast({ title: "Limit updated", variant: "success" }); }
    });
  };

  const onReset = () => {
    start(async () => {
      const r = await startTopUpWindowAction();
      if (!r.ok) toast({ title: "Couldn't start the window", description: r.error, variant: "danger" });
      else { router.refresh(); deferToast({ title: "New top-up window started", variant: "success" }); }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form ref={formRef} {...formProps} onSubmit={onSetLimit} className="flex items-center gap-3 flex-1 min-w-[200px]">
        <Field label="Spend limit per top-up window (USD)" className="flex-1 min-w-[140px]" dataField="limitUsd">
          <Input name="limitUsd" type="number" step="0.01" min="0.01" inputMode="decimal" defaultValue={String(limitUsd)} placeholder="20" mono />
        </Field>
        <Button type="submit" loading={pending}>Set limit</Button>
      </form>
      <ConfirmDialog
        tone="warning"
        title="Start a new top-up window?"
        body={
          <div className="space-y-2">
            <p>Use this right after you top up Anthropic credit — it resets &lsquo;spent this window&rsquo; to $0 and re-arms the 80% / 100% alerts.</p>
            <p>⛔ This is <strong>not</strong> a spend cycle. It does not touch the cycle ledger, and cycle numbering carries straight on.</p>
          </div>
        }
        confirmLabel="Start new window"
        cancelLabel="Cancel"
        onConfirm={onReset}
        trigger={
          <Button type="button" variant="secondary" disabled={pending}>
            New top-up window
          </Button>
        }
      />

      {/* One signal, two surfaces — the bar states it, the guard catches the exits. */}
      <PendingChangesBar
        dirty={dirty}
        saving={pending}
        detail="The spend limit governs every top-up window from here on."
        saveLabel="Set limit"
        onSave={() => formRef.current?.requestSubmit()}
        onDiscard={() => { formRef.current?.reset(); markSaved(); }}
      />
      <UnsavedChangesGuard dirty={dirty} body="The spend limit has been changed but not saved. Leaving now discards the change." />
    </div>
  );
}
