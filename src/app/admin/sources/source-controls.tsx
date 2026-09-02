"use client";

import { useRef, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UnsavedChangesGuard, PendingChangesBar, useFormDirty } from "@/components/ui/unsaved-changes";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { addSourceAction, removeSourceAction, toggleSourceAction, toggleCategoryAction } from "./actions";

const CATEGORIES = ["sports", "macro", "weather", "crypto", "culture", "tech", "other"] as const;

export function ToggleSource({ id, enabled }: { id: string; enabled: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const onClick = () => {
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("id", id);
        fd.set("enabled", String(!enabled));
        const r = await toggleSourceAction(fd);
        if (!r.ok) {
          toast({ title: "Couldn't update source", description: r.error, variant: "danger" });
          return;
        }
        router.refresh();
        deferToast({ title: enabled ? "Source disabled" : "Source enabled", variant: "success" });
      } catch {
        toast({ title: "Couldn't update source", variant: "danger" });
      }
    });
  };
  return <Toggle on={enabled} onClick={onClick} disabled={pending} aria-label="Toggle source enabled" />;
}

export function RemoveSource({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const doRemove = () => {
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("id", id);
        const r = await removeSourceAction(fd);
        if (!r.ok) {
          toast({ title: "Couldn't remove source", description: r.error, variant: "danger" });
          return;
        }
        router.refresh();
        deferToast({ title: "Source removed", description: label, variant: "warning" });
      } catch {
        toast({ title: "Couldn't remove source", variant: "danger" });
      }
    });
  };
  return (
    <ConfirmDialog
      trigger={
        <Button type="button" size="sm" variant="ghost" disabled={pending}>
          Remove
        </Button>
      }
      title={`Remove "${label}"?`}
      body="Markets already published with this source stay resolved by it. This cannot be undone."
      confirmLabel="Remove source"
      tone="claret"
      onConfirm={doRemove}
    />
  );
}

export function ToggleCategory({ category, enabled }: { category: string; enabled: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const onClick = () => {
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("category", category);
        fd.set("enabled", String(!enabled));
        const r = await toggleCategoryAction(fd);
        if (!r.ok) {
          toast({ title: "Couldn't update category", description: r.error, variant: "danger" });
          return;
        }
        router.refresh();
        deferToast({ title: `Category ${enabled ? "disabled" : "enabled"} · ${category}`, variant: "success" });
      } catch {
        toast({ title: "Couldn't update category", variant: "danger" });
      }
    });
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`inline-flex h-7 items-center gap-1.5 rounded-pill border px-3 font-mono text-caption uppercase tracking-[0.14em] transition-colors ${
        enabled
          ? "border-yes-700 bg-yes-500/15 text-yes-300 hover:border-yes-500"
          : "border-border bg-bg-overlay text-text-subtle hover:border-border-strong"
      } ${pending ? "opacity-60" : ""}`}
    >
      <span className={`block h-1.5 w-1.5 rounded-full ${enabled ? "bg-yes-300" : "bg-text-subtle"}`} />
      {category}
    </button>
  );
}

export function AddSourceForm() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const [open, setOpen] = useState(false);
  /* ⛔ THE FORM IS COLLAPSIBLE, AND "CANCEL" IS NOT THE ONLY WAY OUT. `setOpen(false)` throws
     the four fields away deliberately, which is fine — the officer asked. Navigating away threw
     them away too, silently, which is not. */
  const formRef = useRef<HTMLFormElement>(null);
  const { dirty, markSaved, formProps } = useFormDirty(formRef);
  /* E-254 · the standing refusal an operator may overrule. Held as STATE rather than shown as
     a toast, because a toast is gone in four seconds and this one ends in an audit row. */
  const [unreachable, setUnreachable] = useState<{ message: string; form: HTMLFormElement } | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    /* ⛔ DG-S-06 — CAPTURE THE FORM BEFORE THE ASYNC BOUNDARY. React nulls `currentTarget` once
       the handler returns, and everything below runs inside `start(async …)`, i.e. after that.
       Read there it would be `null`, `focusFirstInvalid` would answer `{ reason: "no-form" }`,
       and the address the server just took the trouble to send would go nowhere. */
    const form = e.currentTarget;
    const fd = new FormData(form);
    submitWith(form, fd);
  };

  /* E-254 · the add, and the deliberate second attempt.
     ⛔ THE ACKNOWLEDGEMENT IS NEVER CARRIED IN THE FORM. It lives here, passed explicitly to
     one call, so it cannot survive into a LATER add of a DIFFERENT domain — a hidden input
     set once would do exactly that, and the operator would never see it happen. */
  const submitWith = (form: HTMLFormElement, fd: FormData) => {
    start(async () => {
      const r = await addSourceAction(fd);
      if (!r.ok) {
        if (r.needsAck) {
          // Not a toast. A toast disappears, and this is a decision that gets written to the
          // audit chain against the operator's name.
          setUnreachable({ message: r.error, form });
          if (r.field) focusFirstInvalid(form, [r.field]);
          return;
        }
        toast({ title: "Could not add source", description: r.error, variant: "danger" });
        /* ⭐ DG-S-06 — and then TAKE THEM THERE. The toast says three fields are required;
           `r.field` is the one the server found empty FIRST in form order, and this puts the
           cursor in it. ⛔ SCOPED TO `form`, not `document.body`: "domain" and "label" are
           generic names, this component also renders per-row controls and a ConfirmDialog on
           the same page, and a second add form would be indistinguishable to a body-wide query.
           Scoping costs nothing here because the form element is already in hand. */
        if (r.field) focusFirstInvalid(form, [r.field]);
      } else {
        // ⛔ `form`, NOT `e.target` — `e` belongs to the handler this was lifted out of and is
        // not in scope here. The old line read the event; this one reads the element that was
        // captured before the async boundary, which is the same object the comment above is about.
        form.reset();
        setUnreachable(null);
        markSaved();
        setOpen(false);
        router.refresh();
        deferToast({ title: "Source added", variant: "success" });
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-primary btn-sm"
      >
        + Add source
      </button>
    );
  }

  return (
    <form ref={formRef} {...formProps} onSubmit={onSubmit} className="rounded-lg border border-border bg-bg-elevated p-4 space-y-3">
      <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">Add trusted source</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* ⭐ DG-S-05/06 — `data-field` is the ADDRESS `addSourceAction` names. It goes on the
            wrapping <label>, which CONTAINS its control, so `focusFirstInvalid` finds the anchor
            and then focuses the <input>/<textarea>/<select> inside it. ⛔ Never on a label that
            is only a SIBLING of its control (htmlFor) — the query would scroll to the caption and
            focus nothing. This form hand-rolls its labels rather than using the kit <Field>, so
            the attribute is written out here; <Field dataField="…"> does exactly this. ⚠️ The
            three names must match the strings in `actions.ts` (domain · label · rationale) — a
            typo degrades to today's behaviour (toast, no focus), not to a jump somewhere wrong.
            The category <select> gets none: it defaults, so no refusal ever names it. */}
        <label className="block" data-field="domain">
          <span className="block font-mono text-micro uppercase eyebrow text-text-subtle mb-1">Domain</span>
          <Input name="domain" required placeholder="bot.go.tz" size="sm" />
        </label>
        <label className="block" data-field="label">
          <span className="block font-mono text-micro uppercase eyebrow text-text-subtle mb-1">Label</span>
          <Input name="label" required placeholder="Bank of Tanzania" size="sm" />
        </label>
        <div>
          <span className="block font-mono text-micro uppercase eyebrow text-text-subtle mb-1">Category</span>
          <Select name="category" defaultValue={CATEGORIES[0]}
            options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
        </div>
        <label className="block md:col-span-2" data-field="rationale">
          {/* DG-A-14: "Rationale (≥ 1 line)" was a control label with its requirement welded on,
              and the whole string was wearing the eyebrow recipe — uppercase, tracked, 10px. The
              label keeps that recipe, because it is still the name of the control; the "(≥ 1 line)"
              is a hint the admin has to READ, so it moves to its own line on the reading floor. */}
          <span className="block font-mono text-micro uppercase eyebrow text-text-subtle mb-1">Rationale</span>
          <span className="block text-body-sm text-text-subtle mb-1">(≥ 1 line)</span>
          <textarea name="rationale" required rows={2} placeholder="Why this source is authoritative for this category." className="w-full rounded-lg border border-border bg-[var(--bg-inset)] px-3 py-2.5 text-[13px] text-text placeholder:text-text-subtle outline-none admin-focus transition-colors resize-none" />
        </label>
      </div>
      {/* E-254 · THE AI CANNOT READ THIS SITE — said here, once, before it is added.
          ⛔ IT IS NOT AN ERROR AND MUST NOT DRESS LIKE ONE. Nothing has gone wrong: the source
          is legitimate, markets naming it still work, and the operator may well want it. What
          the panel buys is that the consequence is stated BEFORE the decision instead of
          surfacing weeks later on somebody else's settlement. */}
      {unreachable && (
        <div role="status" className="rounded-md border border-warning/50 bg-warning/5 p-3">
          <p className="mb-1.5 font-mono text-body-sm text-warning">
            This source cannot be read directly by the AI
          </p>
          <p className="font-mono text-caption leading-relaxed text-text-subtle">{unreachable.message}</p>
          <div className="mt-2.5 flex gap-2">
            {/* ⛔ `claret`, a REAL kit variant. The first draft typed `btn-warning`, which does
                not exist in `globals.css` — it would have rendered an unstyled button that
                looked like a bug and `test:ui-consistency` counts raw `btn-` classes for
                exactly this reason. Claret is what this console already wears for an override. */}
            <Button
              type="button"
              disabled={pending}
              variant="claret"
              size="sm"
              onClick={() => {
                /* ⛔ A FRESH FormData OFF THE LIVE FORM, never the one the refusal was raised
                   with. The operator may have corrected a typo in the domain while reading
                   this panel, and re-sending the captured copy would add a host they had just
                   changed their mind about — while the audit row named the corrected one. */
                const fd = new FormData(unreachable.form);
                fd.set("acknowledgeUnreachable", "true");
                setUnreachable(null);
                submitWith(unreachable.form, fd);
              }}
            >
              Add it anyway
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setUnreachable(null)}>
              Choose another source
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary btn-md">
          {pending ? "Adding…" : "Add source"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-md">
          Cancel
        </button>
      </div>

      {/* One signal, two surfaces — the bar states it, the guard catches the exits. */}
      <PendingChangesBar
        dirty={dirty}
        saving={pending}
        detail="A source that is not added cannot be cited by any market."
        saveLabel="Add source"
        onSave={() => formRef.current?.requestSubmit()}
        onDiscard={() => { formRef.current?.reset(); markSaved(); setOpen(false); }}
      />
      <UnsavedChangesGuard dirty={dirty} body="This trusted source has been typed but not added. Leaving now discards it." />
    </form>
  );
}
