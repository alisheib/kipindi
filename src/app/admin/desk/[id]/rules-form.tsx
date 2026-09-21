"use client";

/**
 * ONE ACCOUNT'S RULES AND ITS FOURTEEN LIMITS, AS A FORM (2026-09-21).
 *
 * ⛔ WHY IT EXISTS, MEASURED ON PRODUCTION. Until today this tab drew VALUES and no inputs, and its own caption
 * said editing was not ready on this build. So designation created every account with all fourteen limits NULL
 * and no product and no entry mode; `Start` refused on exactly those; and the refusal told the officer to open
 * this tab and save — where there was nothing to save with. An owner and a manager spent half an hour obeying
 * it on the live desk. The validator was green at 529/0 and the CAS write existed in both twins; only the door
 * and this form were missing.
 *
 * ⛔ THIS FILE NAMES NO SERVER MODULE, NOT EVEN FOR A TYPE (1.330, 1.384). `import type` is erased at build
 * time, and the guard refuses it anyway — in ANY import form — because the specifier itself is the leak. So
 * the props below are declared STRUCTURALLY here and the server's shape is checked against them where the two
 * meet, in the page, which is a server file.
 *
 * ⛔ AND NO PROP NAME IS HOUSE-SHAPED (1.384, 401): the account arrives as `accountId`. The column's own name
 * would cross this boundary as a prop name, which is the one thing that guard exists to refuse.
 *
 * ⛔ IT OWNS NO SENTENCE. `CLIENT_OWNED_COPY` holds the console's client files to a CLOSED set of six strings
 * of 25 characters or more and asserts its size, and 1.385 refuses any sentence the gate module can also emit.
 * Every sentence here arrives in `copy`; the literals below are short labels the kit needs.
 *
 * ⛔ IT DRAWS ITS OWN `PendingChangesBar`, AND ONE DRAFT WRONGLY DROPPED IT (peer review, read at source).
 * `unsaved-changes.tsx` runs a REGISTRY: every instance registers, the lowest id paints, and what it paints is
 * the entry dirtied most recently — the form the officer just touched (`:173-174`, `:208`). Two bars never land
 * in the same pixels, which is why `/admin/ai-usage` and `/admin/bonuses` render two. What dropping it cost was
 * the PROACTIVE half: `UnsavedChangesGuard` catches an officer leaving, while the bar is the only thing that
 * stands on screen saying there is unsaved work — not the half to give up on the form that sets what an
 * account may stake. The section's guard now asserts one bar PER FORM FILE rather than one per section.
 *
 * ⛔ IT IS UNCONTROLLED — fourteen `defaultValue` inputs and ten `defaultChecked` boxes, with `useFormDirty`
 * snapshotting the form so a value typed back to what it was stops being dirty rather than warning over
 * nothing.
 *
 * ⛔ AND IT POSTS THE WHOLE FORM, ALWAYS. An unchecked checkbox submits NOTHING in `FormData`, so the ten
 * switches are read off their own DOM nodes as explicit booleans. Reading absence as "off" is how a form that
 * failed to render a control silently turns a mode off on save; the server refuses a missing key rather than
 * guessing, and the two are halves of one decision.
 */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input } from "@/components/ui/input";
import { FormColumn } from "@/components/ui/form-column";
import { useDeferredToast } from "@/components/ui/toast";
import { PendingChangesBar, UnsavedChangesGuard, useFormDirty } from "@/components/ui/unsaved-changes";

/** The rows and sentences the server hands down. ⛔ Declared here, never imported (see the block above). */
export type RulesFormModel = {
  baseVersion: number;
  caps: readonly {
    key: string; label: string; value: string;
    /** The same figure formatted, for the hint — the input is seeded from `value`, never from this. */
    saved: string;
    caption: string | null;
    unit: "TZS" | "count"; required: boolean;
  }[];
  flags: readonly { key: string; section: string; label: string; on: boolean }[];
  copy: { barDetail: string; guardBody: string };
};

type SaveAnswer =
  | { ok: true; rulesVersion: number; changed: number; rulesChanged: boolean; recorded: boolean; warnings: string[] }
  | { ok: false; error: string; field?: string };

export function DeskRulesForm({
  accountId,
  model,
  onSave,
}: {
  accountId: string;
  model: RulesFormModel;
  onSave: (input: {
    accountId: string;
    baseVersion: number;
    values: Record<string, string>;
    flags: Record<string, boolean>;
  }) => Promise<SaveAnswer>;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const [errors, setErrors] = useState<Record<string, string>>({});
  /**
   * ⚠️ THE VALIDATOR'S WARNINGS, WHICH ARE ADVICE AND NEVER A REFUSAL. The one that matters is "no automatic
   * mode": an account can be saved legally, completely, and silently unable to do anything by itself.
   * ⚠️ IT CLEARS ON THE NEXT SAVE, INCLUDING A FAILED ONE — a warning about the state before an edit reads as
   * a warning about the state after it, which is worse than none.
   */
  const [warnings, setWarnings] = useState<string[]>([]);

  const formRef = useRef<HTMLFormElement>(null);
  const { dirty, markSaved, formProps } = useFormDirty(formRef);

  /* Sections in the order the server puts them in — derived from the rows, never a second list here. */
  const sections: Array<{ name: string; rows: RulesFormModel["flags"][number][] }> = [];
  for (const flag of model.flags) {
    const last = sections[sections.length - 1];
    if (last && last.name === flag.section) last.rows.push(flag);
    else sections.push({ name: flag.section, rows: [flag] });
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    const values: Record<string, string> = {};
    for (const cap of model.caps) {
      const node = el.elements.namedItem(cap.key);
      values[cap.key] = node instanceof HTMLInputElement ? node.value.trim() : "";
    }
    /* ⛔ READ OFF THE NODES, NOT OFF `FormData` — an unchecked box submits nothing at all. */
    const flags: Record<string, boolean> = {};
    for (const flag of model.flags) {
      const node = el.elements.namedItem(flag.key);
      flags[flag.key] = node instanceof HTMLInputElement ? node.checked : false;
    }
    start(async () => {
      /* ⛔ A THROWN SERVER ACTION MUST NOT END THE SPINNER IN SILENCE. The action maps every server failure
         onto the union already, so what is left here is the TRANSPORT — a dropped POST, a serialisation
         failure — and a throw out of `startTransition` clears the pending state and shows nothing at all. */
      let result: SaveAnswer;
      try {
        result = await onSave({ accountId, baseVersion: model.baseVersion, values, flags });
      } catch {
        result = { ok: false, error: "Not saved — try again." };
      }
      if (!result.ok) {
        setWarnings([]);
        setErrors(result.field ? { [result.field]: result.error } : {});
        toast({ title: "Couldn't save", description: result.error, variant: "danger" });
        return;
      }
      setErrors({});
      setWarnings(result.warnings);
      markSaved();
      router.refresh();
      /* ⛔ A SAVE THAT LANDED WITHOUT ITS COMPLIANCE ROW SAYS SO. The change is real either way, and telling
         the officer it was not saved is the most expensive sentence this console can print. */
      deferToast({
        title: result.recorded ? "Saved" : "Saved · not recorded",
        variant: result.recorded ? "success" : "warning",
      });
    });
  };

  return (
    <form ref={formRef} {...formProps} onSubmit={onSubmit} className="space-y-5">
      <FormColumn measure="form">
        <div className="space-y-5">
          {sections.map((section) => (
            <div key={section.name} className="space-y-3">
              <p className="text-body-sm font-semibold text-text">{section.name}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.rows.map((flag) => (
                  <Checkbox key={flag.key} name={flag.key} label={flag.label} defaultChecked={flag.on} />
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-3">
            <p className="text-body-sm font-semibold text-text">Limits</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {model.caps.map((cap) => (
                <Field
                  key={cap.key}
                  label={cap.label}
                  dataField={cap.key}
                  error={errors[cap.key]}
                  /* ⛔ THE SAVED VALUE OPENS THE HINT, AND THE FIGURE WEARS THE ROW'S OWN FACE (401, 409).
                     🔴 The first draft printed the bare word "TZS" here: loose currency text with no money
                     atom on the surface at all, which the visual gate reported at both widths. An
                     uncontrolled field shows what is being TYPED, so an officer who has typed over a ceiling
                     that stops money still has to be able to read what it WAS.
                     ⛔ A COUNT IS NOT MONEY: it gets the mono/tabular face without `.amount`, which is
                     `white-space: nowrap` and MEANS money everywhere else in this kit.
                     ⛔ AND AN UNSET CAP SAYS WHAT IT COSTS INSTEAD (364) — the server's sentence, chosen by
                     the field's own membership, never a blanket one typed here. */
                  hint={
                    cap.value === "" ? (
                      <span className="text-warning-fg">{cap.caption}</span>
                    ) : (
                      <>
                        Saved{" "}
                        <span className={cap.unit === "TZS" ? "amount tabular-nums" : "font-mono tabular-nums"}>{cap.saved}</span>.
                      </>
                    )
                  }
                >
                  <Input
                    name={cap.key}
                    size="md"
                    mono
                    defaultValue={cap.value}
                    inputMode="numeric"
                    autoComplete="off"
                    prefix={cap.unit === "TZS" ? "TZS" : undefined}
                    aria-label={cap.label}
                  />
                </Field>
              ))}
            </div>
          </div>
        </div>
      </FormColumn>

      {warnings.length > 0 && (
        <Callout tone="warning" size="md" surface="panel" role="status" title="Saved — check these">
          <ul className="space-y-1">
            {warnings.map((w) => (
              <li key={w} className="max-w-[72ch]">{w}</li>
            ))}
          </ul>
        </Callout>
      )}

      {/**
       * ⛔ IT DOES DRAW THE BAR, AND THE FIRST DRAFT WRONGLY DROPPED IT (peer review, verified at source
       * 2026-09-21). `unsaved-changes.tsx` runs a REGISTRY: every instance registers, the lowest id paints,
       * and what it paints is the entry dirtied most recently — the form the officer just touched (`:173-174`,
       * `:208`). So two bars never land in the same pixels; the hazard the singleton work fixed is gone, and
       * `/admin/ai-usage` and `/admin/bonuses` are the two-form pages it was built for.
       * ⚠️ WHAT DROPPING IT COST WAS THE PROACTIVE HALF. `UnsavedChangesGuard` catches an officer LEAVING; the
       * bar is the only thing that stands on screen saying there is unsaved work — on the form that sets what
       * an account may stake, that is not the half to give up.
       */}
      <PendingChangesBar
        dirty={dirty}
        saving={pending}
        detail={model.copy.barDetail}
        onSave={() => formRef.current?.requestSubmit()}
        onDiscard={() => {
          formRef.current?.reset();
          setErrors({});
          markSaved();
        }}
        saveLabel="Save · Hifadhi"
      />
      <UnsavedChangesGuard dirty={dirty} body={model.copy.guardBody} />

      <div className="flex flex-col items-start sm:flex-row sm:items-center gap-2 pt-1">
        <Button type="submit" size="md" variant="primary" loading={pending}>
          Save · Hifadhi
        </Button>
        <p className="text-body-sm text-text-subtle">{model.copy.barDetail}</p>
      </div>
    </form>
  );
}
