"use client";

/**
 * THE GLOBAL LIMITS FORM — the desk's FIRST typed control (C7-SPEC ruling 412; replan ruling 537).
 *
 * ⛔ **NOTHING HOUSE REACHES THIS FILE** (rulings 384, 401). No import from `@/lib/house-bot/**`,
 * `@/lib/server/house-bot/**`, the DAL or the gate module — by value OR by type. Every label, hint, caption and
 * refusal arrives as a finished string built on the server, and the one server module it names is `./actions`,
 * whose `"use server"` body the bundler never ships and the disclosure walker deliberately does not follow.
 *
 * ⛔ **EVERY FIELD NAME IS NEUTRAL, AND THAT IS NOT THE SAME CLAIM AS "EVERY LABEL IS NEUTRAL"** (owner ruling D19;
 * ruling 453). A `name` is not copy: it ships inside the client chunk, it is what the POST body carries, and it is
 * the address a refusal names. `name="gCapStaffChosenDailyTzs"` under a perfectly neutral label would be a leak
 * that 453's scan of RENDERED TEXT could never catch. So this file invents no name at all — `row.key` is the
 * console's own neutral key, built server-side, and it is the field's `name`, its `data-field` and the key a
 * refusal comes home by.
 *
 * ⛔ **ONE GUARDED FORM, AND THE TWO HALVES OF ONE TRUTH** (ruling 412). `PendingChangesBar` is proactive — it
 * states the condition while the officer is still on the page and puts Save in reach on a form taller than the
 * viewport — and `UnsavedChangesGuard` is the backstop for the two exits the bar cannot stop: an in-app link
 * (the section rail's own tabs included) and the tab closing. Not two mechanisms: one signal, two surfaces.
 *
 * ⛔ **A DIRTY FORM HOLDS THE PAGE'S POLLER** (ruling 316). The strip refreshes the whole page every 20 s while
 * anything can still change on its own; a `router.refresh()` under a half-typed limit would replace what the
 * officer is typing with the server's copy. The hold is a counted event, raised while dirty and dropped on save
 * or discard — the same mechanism a dialog will use at step 4, which is why `desk-live.tsx` already listens.
 *
 * ⛔ **THE REFUSAL TAKES THE OFFICER TO THE FIELD** (§K rule 7d). The server names ONE `data-field`;
 * `focusFirstInvalid` picks it in DOCUMENT order and its RESULT UNION is handled, never dropped — the helper's
 * own historical defect was an `if` with no `else`.
 *
 * ⛔ **THE ACT GATE IS NOT CONSULTED, AND THAT IS RULING 422, NOT AN OVERSIGHT.** `/admin/desk` is an Owner-only
 * route: `AdminSectionGate` gates ACT on `isAdmin(role)` there and the VIEW gate already requires exactly that, so
 * view-without-act is unreachable by construction and a `useMayAct()` here would be a branch that can never be
 * false — a control that renders itself disabled for nobody. `test:house-bot-console` 1.422 refuses `mayAct`
 * anywhere under this section for that reason. The SAVE still decides for itself, on the stored row, which is the
 * only gate ruling 523 leaves a server action.
 * ⚠️ That is also why the action arrives as a PROP rather than an import: `test:admin-act-gate`'s population is
 * every `"use client"` file under `src/app/admin` that imports an actions module, and a file in that population
 * must consult the gate. The page — a Server Component — owns the import; this file owns the form.
 *
 * @see src/app/admin/desk/actions.ts · src/lib/server/house-console-read.ts
 */
import { Fragment, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useDeferredToast } from "@/components/ui/toast";
import { PendingChangesBar, UnsavedChangesGuard, useFormDirty } from "@/components/ui/unsaved-changes";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { DESK_HOLD_EVENT, DESK_RELEASE_EVENT } from "./desk-live";

/**
 * One limit, painted on the server. ⛔ Declared HERE, structurally, rather than imported from the gate module:
 * a type import's SPECIFIER survives in this file's source, and ruling 384 refuses a house module specifier in a
 * client file in ANY import form. The page passes the server's own rows, so `tsc` still ties the two together —
 * a field that changes shape fails to compile at the page, which is where the two sides meet.
 */
export type DeskLimitRow = {
  key: string;
  section: string;
  name: string;
  /** The SAVED value, formatted for its unit, or "Not set" — what the field reads as until it is typed in. */
  value: string;
  money: boolean;
  input: string;
  hint: string | null;
  unit: "TZS" | "%" | "count";
  optional: boolean;
  unset: boolean;
  caption: string | null;
  firstUnset: boolean;
};

/**
 * ⛔ THE FIELDS ARE A PURE FUNCTION OF THE ROWS, AND THAT IS DELIBERATE. It lets a suite render the real view
 * model and READ the markup — every `name`, every `data-field`, every label and the anchor's placement — which is
 * the only way to prove the neutral-key rule on the thing that actually ships rather than on a regex over source.
 * It takes no hook, so it renders outside the admin shell and outside a router.
 */
export function DeskLimitFields({
  rows,
  anchorId,
  errors,
}: {
  rows: DeskLimitRow[];
  /** The fragment the strip's "Set N global limits first →" points at. The PAGE owns this literal. */
  anchorId: string;
  errors: Record<string, string>;
}) {
  /* Sections in the order `LIMIT_FIELDS` puts them in — the form's own order, and the order a refusal is
     reported in. ⛔ Derived from the rows, never a second list: a section list typed here would stop covering
     the day a field moved between sections, which is the population trap this project keeps paying for. */
  const sections: Array<{ name: string; rows: DeskLimitRow[] }> = [];
  for (const row of rows) {
    const last = sections[sections.length - 1];
    if (last && last.name === row.section) last.rows.push(row);
    else sections.push({ name: row.section, rows: [row] });
  }

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <div key={section.name} className="space-y-3">
          {/* ⛔ `text-body-sm`, NOT an eyebrow rung. §T4's reading floor is 12.5px and `test:type-scale` §3 counts
              every sub-floor prose site into a ratchet that may only shrink; this section made the same choice for
              its disabled-reason sentences (ruling 310, corrected). 13px semibold reads as a heading without
              spending a rung the ratchet is trying to reclaim. */}
          <p className="text-body-sm font-semibold text-text">{section.name}</p>
          {/* 412 · numeric caps lay out as `grid grid-cols-1 sm:grid-cols-2 gap-3`. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {section.rows.map((row) => {
              const error = errors[row.key];
              /* ⛔ THE SAVED VALUE OPENS THE HINT, WHICH IS `/admin/config`'s OWN SHAPE ("Current 3.0%. …") — an
                 uncontrolled field shows what is being TYPED, and an officer who has typed over a limit that stops
                 money still has to be able to read what it WAS.
                 ⛔ THE FIGURE IS `.amount` AT ITS OWN CALL SITE (ruling 401), and only when the row says it is money
                 (409): the server hands this page an already-formatted STRING, so `test:type-scale`'s money detector
                 is blind to the whole section and the face has to be chosen from the row's own flag. A count never
                 lands in `.amount`, which is `white-space: nowrap` and MEANS money everywhere else in this kit.
                 ⛔ AN UNSET LIMIT SAYS WHAT IT COSTS INSTEAD (364): "Not set" is a state, and the sentence naming its
                 consequence is the server's, chosen by the field's own membership — never a blanket sentence. */
              const field = (
                <Field
                  label={row.name}
                  dataField={row.key}
                  error={error}
                  hint={
                    <>
                      {row.unset ? (
                        <span className="text-warning-fg">{row.caption}</span>
                      ) : (
                        <>
                          Saved{" "}
                          <span className={row.money ? "amount tabular-nums" : "font-mono tabular-nums"}>{row.value}</span>.
                        </>
                      )}
                      {row.hint ? <> {row.hint}</> : null}
                    </>
                  }
                >
                  {/* ⛔ THE NAME IS THE SERVER'S NEUTRAL KEY, AT ITS OWN CALL SITE. Nothing here derives a name,
                      abbreviates one or falls back to one: a field with no key would post nothing and be refused
                      by the save, which is the correct failure. */}
                  <Input
                    name={row.key}
                    id={`desk-limit-${row.key}`}
                    size="md"
                    mono
                    inputMode="numeric"
                    defaultValue={row.input}
                    placeholder={row.optional ? "Not set" : undefined}
                    prefix={row.unit === "TZS" ? "TZS" : undefined}
                    trailing={row.unit === "%" ? "%" : undefined}
                    error={!!error}
                  />
                </Field>
              );
              /* ⛔ THE ANCHOR SITS ON THE FIRST UNSET REQUIRED LIMIT, which is what the strip's sentence promises.
                 The id LITERAL is written in `page.tsx` and passed down, because `test:tab-anchors` reads that file
                 as text and decides which tab owns an id by the tab group above it — a literal written here would
                 be invisible to it, and the strip's link would be proved by nothing. */
              return row.firstUnset ? (
                <div key={row.key} id={anchorId}>
                  {field}
                </div>
              ) : (
                <Fragment key={row.key}>{field}</Fragment>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DeskLimitsForm({
  rows,
  baseVersion,
  id,
  onSave,
}: {
  rows: DeskLimitRow[];
  /** The version this render was built from. The save is conditional on it and REFUSES a second writer. */
  baseVersion: number;
  /** The anchor id, named by the page (see `DeskLimitFields`). */
  id: string;
  /**
   * The server action, handed down by the page. ⛔ Typed structurally, so the gated writer's own result type is
   * checked against this where the two meet — at the page — without a house module specifier ever entering this
   * file (384). A refusal carries the sentence AND, when there is one to fix, the field's neutral key.
   */
  onSave: (input: { baseVersion: number; values: Record<string, string> }) => Promise<
    { ok: true; limitsVersion: number; changed: number; recorded: boolean } | { ok: false; error: string; field?: string }
  >;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* This form is UNCONTROLLED — fourteen `defaultValue` inputs — so React state never sees an edit. `useFormDirty`
     snapshots the form and compares, so a value typed back to what it was stops being dirty rather than warning
     over nothing. */
  const formRef = useRef<HTMLFormElement>(null);
  const { dirty, markSaved, formProps } = useFormDirty(formRef);
  const armed = dirty;

  /* ⛔ 316's DIRTY-FORM HOLD. Raised while the form is armed and dropped when it is not, in one effect, so the
     count can never be left standing by an early return or an unmount mid-save. */
  useEffect(() => {
    if (!armed) return undefined;
    window.dispatchEvent(new Event(DESK_HOLD_EVENT));
    return () => {
      window.dispatchEvent(new Event(DESK_RELEASE_EVENT));
    };
  }, [armed]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const values: Record<string, string> = {};
    for (const [key, value] of fd.entries()) values[key] = typeof value === "string" ? value : "";
    start(async () => {
      /* ⛔ A THROWN SERVER ACTION MUST NOT END THE SPINNER IN SILENCE (B-8). The action itself already maps every
         server failure onto the same union, so what is left here is the TRANSPORT — a dropped POST, a
         serialisation failure — and a throw out of `startTransition` clears the pending state and shows the
         officer nothing at all, on a control that sets the limits which stop money.
         ⚠️ `@/lib/client/run-admin-action` is the platform's wrapper for exactly this and is NOT used here, for a
         measured reason: `test:admin-act-gate`'s population is every client component under `src/app/admin` whose
         imports match `[a-z0-9-]*actions?`, which that helper's own FILENAME matches — so importing it puts this
         file in a population that must consult `useMayAct()`. On an Owner-only route `mayAct` IS `mayView`
         (`AdminSectionGate` gates act on `isAdmin`), so that call would be a branch that can never be false, which
         is the dead control 432(a) refuses and which `test:house-bot-console` 1.422 bans under this section by
         name. The two rules cannot both be satisfied through that import; the four lines below satisfy both. */
      let result: Awaited<ReturnType<typeof onSave>> | { ok: false; error: string; field?: string };
      try {
        result = await onSave({ baseVersion, values });
      } catch {
        result = { ok: false, error: "The change did not reach the server. Nothing was saved — try again." };
      }
      if (!result.ok) {
        setErrors(result.field ? { [result.field]: result.error } : {});
        toast({ title: "Couldn't save", description: result.error, variant: "danger" });
        if (!result.field) return;
        /* ⛔ THE RESULT UNION IS HANDLED, NOT DROPPED (§K rule 7d). `data-field` is rendered whether or not the
           field is in error, so nothing here races a re-render; and when a field genuinely is not on screen the
           helper NAMES the tab that owns it and this navigates there rather than refusing in silence. */
        const landed = focusFirstInvalid(form, [result.field]);
        if (!landed.ok && landed.reason === "not-rendered" && landed.ownedByTab) router.push(landed.ownedByTab);
        return;
      }
      setErrors({});
      markSaved();
      router.refresh();
      /* ⛔ A SAVE THAT LANDED WITHOUT ITS COMPLIANCE ROW SAYS SO. The change is real either way — telling the
         officer it failed would send them to type it a second time — but a permanent record that did not write
         is not a success, so the tone and the sentence are the warning ones. */
      const changed = result.changed === 1 ? "1 limit changed." : `${result.changed} limits changed.`;
      deferToast({
        title: "Limits saved",
        description: result.recorded ? changed : `${changed} The permanent record could not be written — tell an administrator.`,
        variant: result.recorded ? "success" : "warning",
      });
    });
  };

  return (
    <form ref={formRef} {...formProps} onSubmit={onSubmit} className="space-y-4">
      <DeskLimitFields rows={rows} anchorId={id} errors={errors} />

      <PendingChangesBar
        dirty={armed}
        saving={pending}
        detail="These limits govern every stake the desk places."
        onSave={() => formRef.current?.requestSubmit()}
        onDiscard={() => {
          formRef.current?.reset();
          setErrors({});
          markSaved();
        }}
        saveLabel="Save · Hifadhi"
      />
      <UnsavedChangesGuard
        dirty={armed}
        body="These limits have been changed but not saved. Leaving now discards the change."
      />

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" size="md" variant="primary" loading={pending}>
          Save · Hifadhi
        </Button>
        {/* Reading copy, not an eyebrow: it tells the officer what the save will do. */}
        <p className="font-mono text-body-sm text-text-subtle">Every limit is saved together, or none is</p>
      </div>
    </form>
  );
}
