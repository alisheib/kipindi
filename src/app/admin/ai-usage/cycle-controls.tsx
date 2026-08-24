"use client";

/**
 * Cycle settings + the two cycle controls.
 *
 * ⛔ THE CLIENT VALIDATION HERE IS CONVENIENCE ONLY. It runs the SAME `parseCycleForm` the
 * server action runs, so the two can never disagree — but the server re-parses the raw
 * FormData and nothing on this page is trusted. That is why the rules live in
 * `src/lib/ai-cycle-rules.ts` rather than being written out twice.
 *
 * ⚠️ THE FORM IS READ THROUGH A REF, NOT SUBMITTED. The first version put a hidden
 * `<button type="submit">` behind the confirm dialog and clicked it programmatically —
 * `test:ui-consistency` flagged it as a bare text button, correctly: a control nobody can
 * see or focus is not a control. The dialog's confirm reads the form element directly, so
 * there is exactly one path and no invisible widget.
 *
 * ⚠️ CONTROL HEIGHTS ARE PX LITERALS. `tailwind.config.ts` overrides the spacing scale, so
 * `h-7` renders 40px — under the 44px tap target. Same trap `/notifications` documents.
 */

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { parseCycleForm, CYCLE_BOUNDS } from "@/lib/ai-cycle-rules";
import { setCycleConfigAction, startNextCycleAction, closeCycleNowAction } from "./actions";
/**
 * ⛔ THE SHELL'S GATE, NOT A SECOND ONE. These controls shipped reading a `canAct` prop the
 * page computed for itself with `canAct(role, "ops")` — a correct answer arrived at by a
 * private route, which is exactly what `test:admin-act-gate` §3 refuses: *"add a control to
 * the gate, never a name to the list."* The admin layout already resolves the viewer's right
 * to ACT on this route's domain and publishes it through `AdminActProvider`, keyed off the
 * same `domainForPath()` the VIEW gate uses. Two computations of one permission are two
 * chances to disagree the day a domain moves — and the disagreement would be silent, because
 * both would still render something plausible.
 *
 * ⭐ AND THE REFUSAL SENTENCE IMPROVES BY BEING SHARED. `useActDisabledReason()` names the
 * viewer's ROLE and the DOMAIN — *"the AUDITOR role can view operations but not change it"* —
 * where the hand-written copy said only "Only an operations officer can…", which does not
 * answer the officer's actual next question: then who can, and who changes that?
 */
import { useMayAct, useActDisabledReason } from "@/components/admin/act-gate";

type Props = {
  sizeUsd: number;
  autoRoll: boolean;
  targetMarginPct: number;
  fxTzsPerUsd: number;
  fxAsOfIso: string;
  minDaysForProjection: number;
};

export function CycleSettings(p: Props) {
  // ⛔ FROM THE SHELL, NOT FROM A PROP. See the import note above.
  const mayAct = useMayAct();
  const actReason = useActDisabledReason();
  const [pending, start] = useTransition();
  // ⛔ THE SWITCH IS PHRASED AS THE SAFE STATE. It asks "pause when a cycle ends?", which is
  // ON by default, rather than "run continuously?", which would be OFF by default. A toggle
  // whose ON position removes a safeguard reads as healthy while the guard is gone — the
  // exact trap `toggle.tsx` records for /admin/system's maintenance lever.
  const [pauseOnEnd, setPauseOnEnd] = useState(!p.autoRoll);
  const [err, setErr] = useState<{ field?: string; message: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);

  /** The form as FormData, with the toggle's real value. One reader, two callers. */
  const readForm = (): FormData | null => {
    const form = formRef.current;
    if (!form) return null;
    const fd = new FormData(form);
    fd.set("autoRoll", pauseOnEnd ? "false" : "true");
    return fd;
  };

  /**
   * 🔴 THE PRE-FLIGHT GATE, AND IT IS NOT OPTIONAL — found by driving the real page.
   *
   * Validation used to run inside `onConfirm`. Passing `pending` to `ConfirmDialog` opts into
   * its HOLD-OPEN contract: confirm no longer closes the dialog, the falling edge of `pending`
   * does. So a confirm that rejected client-side and returned WITHOUT starting a transition
   * left the dialog open for ever — and `confirm-dialog.tsx` also disables the trigger while
   * `awaiting`, so the Save button became permanently dead until a reload.
   *
   * `openGuard` is the kit's answer: refuse to OPEN on invalid input and surface the error
   * inline. Never ask "are you sure?" about something already known to be refused.
   */
  const guard = (): boolean => {
    const fd = readForm();
    if (!fd) return false;
    // Same parser as the server. A failure here never reaches the network; a failure THERE
    // is still the one that decides.
    const check = parseCycleForm(
      {
        sizeUsd: String(fd.get("sizeUsd") ?? ""),
        autoRoll: String(fd.get("autoRoll") ?? ""),
        targetMarginPct: String(fd.get("targetMarginPct") ?? ""),
        fxTzsPerUsd: String(fd.get("fxTzsPerUsd") ?? ""),
        fxAsOfIso: String(fd.get("fxAsOfIso") ?? ""),
        minDaysForProjection: String(fd.get("minDaysForProjection") ?? ""),
      },
      Date.now(),
    );
    if (!check.ok) {
      setErr({ field: check.field, message: check.error });
      toast({ title: "Couldn't save", description: check.error, variant: "danger" });
      return false;
    }
    setErr(null);
    return true;
  };

  /** Runs only past `guard`, so it ALWAYS starts a transition and the dialog always closes. */
  const save = () => {
    const fd = readForm();
    if (!fd) return;

    start(async () => {
      const r = await setCycleConfigAction(fd);
      if (!r.ok) {
        setErr({ field: r.field, message: r.error ?? "Save failed" });
        toast({ title: "Couldn't save", description: r.error, variant: "danger" });
        return;
      }
      router.refresh();
      deferToast({
        title: "Cycle settings saved",
        description: r.warnings?.length
          ? r.warnings[0]
          : "The new size applies to the next cycle opened — closed cycles keep the size they were opened with.",
        variant: "success",
      });
    });
  };

  const fieldErr = (name: string) => (err?.field === name ? err.message : undefined);

  return (
    <form ref={formRef} onSubmit={(e) => { e.preventDefault(); }} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field
          label="Cycle size (USD)"
          hint={`One cycle = this much Claude spend. $${CYCLE_BOUNDS.sizeUsd.min}–$${CYCLE_BOUNDS.sizeUsd.max.toLocaleString()}.`}
          error={fieldErr("sizeUsd")}
        >
          <Input name="sizeUsd" inputMode="decimal" defaultValue={String(p.sizeUsd)} placeholder="100" mono disabled={!mayAct} error={!!fieldErr("sizeUsd")} />
        </Field>

        <Field
          label="Target margin (%)"
          hint="100 = the suggested price is twice the AI cost."
          error={fieldErr("targetMarginPct")}
        >
          <Input name="targetMarginPct" inputMode="decimal" defaultValue={String(p.targetMarginPct)} placeholder="100" mono disabled={!mayAct} error={!!fieldErr("targetMarginPct")} />
        </Field>

        <Field
          label="Min days before projecting"
          hint="A yearly figure is withheld until there is at least this much history."
          error={fieldErr("minDaysForProjection")}
        >
          <Input name="minDaysForProjection" inputMode="numeric" defaultValue={String(p.minDaysForProjection)} placeholder="14" mono disabled={!mayAct} error={!!fieldErr("minDaysForProjection")} />
        </Field>

        <Field
          label="USD → TZS rate"
          hint={`${CYCLE_BOUNDS.fxTzsPerUsd.min.toLocaleString()}–${CYCLE_BOUNDS.fxTzsPerUsd.max.toLocaleString()}. Leave blank and shilling figures show “—”.`}
          error={fieldErr("fxTzsPerUsd")}
        >
          <Input name="fxTzsPerUsd" inputMode="decimal" defaultValue={p.fxTzsPerUsd > 0 ? String(p.fxTzsPerUsd) : ""} placeholder="e.g. 2600" mono disabled={!mayAct} error={!!fieldErr("fxTzsPerUsd")} />
        </Field>

        <Field
          label="Rate taken on"
          hint="Shown beside every shilling figure, so a stale rate is visible."
          error={fieldErr("fxAsOfIso")}
        >
          <Input name="fxAsOfIso" type="text" defaultValue={p.fxAsOfIso ? p.fxAsOfIso.slice(0, 10) : ""} placeholder="YYYY-MM-DD" mono disabled={!mayAct} error={!!fieldErr("fxAsOfIso")} />
        </Field>

        {/* ⛔ THE REAL `Field` ATOM, not a hand-built copy of its label. A second label style
            beside five real ones is a drift nobody would notice until the two disagreed. */}
        <Field
          label="When a cycle ends"
          hint={pauseOnEnd ? "Recommended — this is the checkpoint." : "⚠️ The AI will never pause."}
        >
          <span className="flex items-center gap-3 rounded-lg border border-border bg-bg-overlay px-3 min-h-[44px]">
            <Toggle
              on={pauseOnEnd}
              onClick={mayAct ? () => setPauseOnEnd((v) => !v) : undefined}
              disabled={!mayAct}
              aria-label="Pause the AI when a cycle ends"
            />
            <span className="text-label text-text-secondary leading-snug py-2">
              {pauseOnEnd
                ? "Pause and wait — poll posting and AI resolving stop until you start the next cycle."
                : "Continue automatically — the next cycle opens itself and the AI never pauses."}
            </span>
          </span>
        </Field>
      </div>

      {err && !err.field && <p className="text-caption text-no-300">{err.message}</p>}

      {mayAct ? (
        <ConfirmDialog
          tone="warning"
          title="Save cycle settings?"
          pending={pending}
          body={
            <div className="space-y-2">
              <p>Changing the cycle size changes what &ldquo;a cycle&rdquo; means from here on.</p>
              <p>
                ⛔ It is <strong>not retroactive</strong>. Every cycle already closed keeps the size it was
                opened with, so past counts and &ldquo;cycles per year&rdquo; do not move. The new size is
                stamped on the <strong>next</strong> cycle opened.
              </p>
            </div>
          }
          confirmLabel="Save settings"
          cancelLabel="Cancel"
          openGuard={guard}
          onConfirm={save}
          trigger={<Button type="button" disabled={pending}>Save settings</Button>}
        />
      ) : (
        // ⭐ The shared sentence names the ROLE and the DOMAIN, so the reader's next question
        // ("then who can?") is answered rather than raised. The fallback keeps the control
        // explained even if the provider is ever absent — an unexplained dead form is worse
        // than a wrong explanation, because nothing tells the operator to go and ask.
        <p className="text-caption text-text-tertiary">{actReason ?? "You can view these settings but not change them."}</p>
      )}
    </form>
  );
}

/** Start the next cycle — the control that un-pauses the AI. */
export function StartCycleControl({ nextIndex, sizeUsd }: { nextIndex: number; sizeUsd: number }) {
  // ⛔ FROM THE SHELL, NOT FROM A PROP. See the import note above.
  const canAct = useMayAct();
  const actReason = useActDisabledReason();
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  // ⚠️ THIS CONTROL EXPLAINS ITSELF RATHER THAN DISAPPEARING, deliberately: the AI is PAUSED
  // when this renders, and a viewer who cannot see why the platform has stopped posting has no
  // way to know who to ask. `useActDisabledReason()` names the role and the domain.
  if (!canAct) return <p className="text-caption text-text-tertiary">{actReason ?? "Only an operations officer can start the next cycle."}</p>;

  const go = () => {
    start(async () => {
      const r = await startNextCycleAction(new FormData());
      if (!r.ok) { toast({ title: "Couldn't start the cycle", description: r.error, variant: "danger" }); return; }
      router.refresh();
      deferToast({ title: `Cycle ${r.index} started`, description: "AI poll posting and AI resolving have resumed.", variant: "success" });
    });
  };

  return (
    <ConfirmDialog
      tone="warning"
      pending={pending}
      title={`Start cycle ${nextIndex}?`}
      body={
        <div className="space-y-2">
          <p>This opens a new ${sizeUsd.toLocaleString()} cycle and <strong>resumes AI poll posting and AI resolving</strong>.</p>
          <p>The AI is paused right now because the previous cycle spent its full size.</p>
        </div>
      }
      confirmLabel={`Start cycle ${nextIndex}`}
      cancelLabel="Not yet"
      onConfirm={go}
      trigger={<Button type="button" loading={pending}>Start cycle {nextIndex}</Button>}
    />
  );
}

/** Close the open cycle early. Deliberately pauses the AI. */
export function CloseCycleControl({ index, costUsd, sizeUsd }: { index: number; costUsd: number; sizeUsd: number }) {
  // ⛔ FROM THE SHELL, NOT FROM A PROP. See the import note above.
  const canAct = useMayAct();
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  // ⚠️ THIS ONE RETURNS NULL RATHER THAN EXPLAINING, and the asymmetry with `StartCycleControl`
  // above is on purpose: closing a cycle early is an OPTIONAL bookkeeping action, so a
  // read-only viewer loses nothing by not being told it exists. Starting one un-pauses the
  // platform's AI, which is a state they can see and need explained.
  if (!canAct) return null;

  const go = () => {
    start(async () => {
      const r = await closeCycleNowAction(new FormData());
      if (!r.ok) { toast({ title: "Couldn't close the cycle", description: r.error, variant: "danger" }); return; }
      router.refresh();
      deferToast({ title: `Cycle ${r.index} closed`, description: "AI is paused until you start the next cycle.", variant: "success" });
    });
  };

  return (
    <ConfirmDialog
      tone="claret"
      pending={pending}
      title={`Close cycle ${index} now?`}
      body={
        <div className="space-y-2">
          <p>
            Cycle {index} has spent <strong>${costUsd.toFixed(2)}</strong> of its ${sizeUsd.toLocaleString()}.
            Closing it now records that as its final cost and its full duration.
          </p>
          <p>⛔ <strong>The AI pauses immediately.</strong> Poll posting and AI resolving stop until you start the next cycle.</p>
        </div>
      }
      confirmLabel="Close and pause AI"
      cancelLabel="Keep it running"
      onConfirm={go}
      trigger={<Button type="button" variant="secondary" disabled={pending}>Close cycle early</Button>}
    />
  );
}
