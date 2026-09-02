"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { I } from "@/components/ui/glyphs";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { UnsavedChangesGuard, PendingChangesBar, useFormDirty } from "@/components/ui/unsaved-changes";
import { setAiModelAction } from "./actions";

type ModelOption = { id: string; label: string; cost: string; tier: string };

export function AiOpsControls({
  currentModel,
  triageModel,
  models,
}: {
  currentModel: string;
  triageModel: string;
  models: readonly ModelOption[];
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  /* ⛔ A `<select>` IS STAGED WORK WHEN THERE IS AN APPLY BUTTON. Nothing is typed here, which
     is exactly why it reads as exempt at a glance — but the model is not applied on change, it
     waits for Apply, so an officer who picks a different model and clicks away has silently
     lost the change and the AI keeps running on the old one. ⭐ This is why `useFormDirty`
     binds `change` as well as `input`: a select fires no `input` event in every engine. */
  const formRef = useRef<HTMLFormElement>(null);
  const { dirty, markSaved, formProps } = useFormDirty(formRef);

  const onModelSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    /* The form is captured before the async boundary — `e.currentTarget` is null once the
       transition resolves, and it is the container `focusFirstInvalid` searches. */
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const r = await setAiModelAction(fd);
      if (!r.ok) {
        toast({ title: "Couldn't update model", description: r.error, variant: "danger" });
        // ⭐ DG-S-05/06 — a <select> is a field like any other; the wrapper carries the address.
        if (r.field) focusFirstInvalid(form, [r.field]);
      }
      else { markSaved(); router.refresh(); deferToast({ title: "Model updated — takes effect on next AI call", variant: "success" }); }
    });
  };

  const modelInfo = models.find((m) => m.id === currentModel);
  const triageInfo = models.find((m) => m.id === triageModel);

  return (
    <div className="space-y-5">
      {/* ── Primary model (changeable) ── */}
      <div>
        <form ref={formRef} {...formProps} onSubmit={onModelSubmit} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]" data-field="model">
            <span className="font-mono text-micro uppercase eyebrow font-bold text-text-muted">
              Primary model · Modeli kuu
            </span>
            <Select
              name="model"
              defaultValue={currentModel}
              size="xs"
              options={models.map((m) => ({
                value: m.id,
                label: `${m.label} — ${m.tier} (${m.cost})`,
              }))}
            />
          </div>
          <Button type="submit" size="sm" loading={pending}>Apply</Button>
        </form>
        <div className="mt-2 rounded-md border border-border bg-bg-overlay px-3 py-2.5 text-body-sm text-text-muted leading-relaxed space-y-1">
          <p>
            <I.sparkle s={11} className="inline text-brand-300 mr-1" />
            <strong className="text-text">Affects poll generation</strong> — the AI that creates new market questions with web search.
          </p>
          <p>
            <I.shieldcheck s={11} className="inline text-brand-300 mr-1" />
            <strong className="text-text">Affects the resolution check</strong> — the AI that web-searches a market at its resolution time to verify whether the outcome is settled (per-market, scheduled — no sweep).
          </p>
          <p className="text-text-subtle">
            Bigger model = better accuracy, higher cost per call. Sonnet 4.6 is the recommended default.
            {modelInfo && (
              <> Currently: <strong className="text-text-muted">{modelInfo.label}</strong> ({modelInfo.cost}).</>
            )}
          </p>
        </div>
      </div>

      {triageInfo && (
        <>
          <div className="border-t border-border" />
          {/* ── Fast-scan model (read-only) — used for cheap classification tasks ── */}
          <div>
            <span className="font-mono text-micro uppercase eyebrow font-bold text-text-muted">
              Fast-scan model · Modeli ya haraka
            </span>
            {/* ⚠️ LITERAL, not `h-9` — spacing is overridden (tailwind.config.ts:200-215), so
                `h-9` was a 64px container around a single 14px mono line. */}
            <div className="mt-1 flex items-center gap-2 h-[40px] px-3 rounded-lg border border-border bg-bg-overlay text-[14px] font-mono text-text-subtle">
              <I.lock s={12} className="text-text-subtle shrink-0" />
              {triageInfo.label}
              <span className="text-[11px] text-text-subtle ml-auto">{triageInfo.cost}</span>
            </div>
            <p className="mt-2 rounded-md border border-border bg-bg-overlay px-3 py-2.5 text-body-sm text-text-subtle leading-relaxed">
              Locked to Haiku 4.5 (cheap) for lightweight classification. The heavy resolution check uses the primary model above.
            </p>
          </div>
        </>
      )}

      {/* One signal, two surfaces — the bar states it, the guard catches the exits. */}
      <PendingChangesBar
        dirty={dirty}
        saving={pending}
        detail="The AI keeps running on the current model until this is applied."
        saveLabel="Apply"
        onSave={() => formRef.current?.requestSubmit()}
        onDiscard={() => { formRef.current?.reset(); markSaved(); }}
      />
      <UnsavedChangesGuard dirty={dirty} body="A different AI model has been selected but not applied. Leaving now discards the change." />
    </div>
  );
}
