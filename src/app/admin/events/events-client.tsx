"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ScrollX } from "@/components/ui/scroll-x";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { UnsavedChangesGuard, PendingChangesBar, useFormDirty } from "@/components/ui/unsaved-changes";
import { formatDateTime } from "@/lib/utils";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { CATEGORY_LABEL } from "@/lib/ai/poll-vocabulary";
import { addEventAction, removeEventAction, generateFromEventAction } from "./actions";

type Ev = {
  id: string; title: string; category: string; startsAt: string; sourceUrl: string;
  note: string | null; generatedAt: string | null; aiPollId: string | null;
};

export function EventsClient({
  categories, events, listOnly,
}: {
  categories: readonly string[];
  events?: Ev[];
  listOnly?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  /* ⛔ FIVE FIELDS AND NOTHING WATCHING THEM. This is the longest hand-typed form in the console
     after the market wizard — a title, a source URL and a note for the AI, all uncontrolled —
     and until now an officer who typed the lot and then clicked away in the sidebar lost every
     character silently. The snapshot hook owns all five, because they are uncontrolled and
     `FormData` is the only thing that can see them. */
  const formRef = useRef<HTMLFormElement>(null);
  const { dirty, markSaved, formProps } = useFormDirty(formRef);
  /** The form's own "Add event" — the bar's `saveAnchor`, so the two are never on screen together. */
  const saveRef = useRef<HTMLButtonElement>(null);

  /* ⭐ THE CATEGORY OUTLIVES AN ADD. Officers enter fixtures in runs of one category, and a reset
     that put the dropdown back to the first category made them re-pick it for every event. So it
     is CONTROLLED, and `keptCategory` is what a clean form holds: the first category, then the
     last one added. A successful add keeps it, and Discard goes back to it. */
  const [category, setCategory] = useState(categories[0] ?? "");
  const keptCategory = useRef(category);

  /** ⚠️ The hidden input is written HERE, not after a render: `markSaved()` snapshots the DOM on
      the next line, and it must already read this value. The kit Select's own reset does the same. */
  function restoreCategory(to: string) {
    setCategory(to);
    const el = formRef.current?.elements.namedItem("category");
    if (el instanceof HTMLInputElement) el.value = to;
  }

  /* ⛔ `runAdminAction`: `requireOfficer` THROWS, and a throw otherwise ends the spinner with no
     word said. It rethrows a redirect and turns anything else into the `{ ok:false, error }` the
     toast renders. On a refusal the form is left exactly as typed, and the bar stays up. */
  function add(fd: FormData) {
    start(async () => {
      const r = await runAdminAction(() => addEventAction(fd));
      if (!r.ok) { toast({ title: "Could not add event", description: r.error, variant: "danger" }); return; }
      /* ⚠️ RESET BEFORE `markSaved`, IN THAT ORDER. The baseline is re-snapshotted off the live
         DOM, so a reset that ran afterwards would leave the baseline holding the values just
         submitted and the now-empty form reading as dirty. The category just added stays. */
      const added = fd.get("category");
      if (typeof added === "string" && added) keptCategory.current = added;
      formRef.current?.reset();
      restoreCategory(keptCategory.current);
      markSaved();
      toast({ title: "Event added", variant: "success" });
      router.refresh();
    });
  }

  /* 🔴 `onSubmit`, NOT A FUNCTION `action`. React 19 resets an uncontrolled form once a function
     `action` settles, and it cannot see `r.ok` — so a REFUSED event (a source domain not on the
     registry is the common one) came back with every field emptied under a "Could not add event"
     toast: work lost, on a screen that looked saved. The reset now happens on success only,
     above. No other admin form submits through a function `action`. */
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    add(new FormData(e.currentTarget));
  }

  function remove(id: string) {
    const fd = new FormData(); fd.set("id", id);
    setBusyId(id);
    start(async () => {
      await removeEventAction(fd);
      setBusyId(null);
      toast({ title: "Event removed", variant: "success" });
      router.refresh();
    });
  }

  function generate(id: string) {
    const fd = new FormData(); fd.set("id", id);
    setBusyId(id);
    start(async () => {
      const r = await generateFromEventAction(fd);
      setBusyId(null);
      if (!r.ok) { toast({ title: "Generation failed", description: r.error, variant: "danger" }); return; }
      toast({ title: "Poll drafted — review it under AI polls", variant: "success" });
      router.refresh();
    });
  }

  if (listOnly) {
    return (
      <ScrollX label="Scheduled events">
        <table className="admin-tbl min-w-[720px]">
          <thead>
            <tr className="text-left font-mono text-micro uppercase eyebrow text-text-faint">
              <th className="py-2 pr-3 font-semibold">Event</th>
              <th className="py-2 pr-3 font-semibold">Category</th>
              <th className="py-2 pr-3 font-semibold">Starts</th>
              <th className="py-2 pr-3 font-semibold">Source</th>
              <th className="py-2 pl-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {(events ?? []).map((e) => (
              <tr key={e.id} className="border-t border-border/50 align-top">
                <td className="py-2.5 pr-3">
                  <p className="font-semibold text-text">{e.title}</p>
                  {e.note && <p className="mt-0.5 text-body-sm text-text-subtle">{e.note}</p>}
                </td>
                <td className="py-2.5 pr-3"><Chip size="sm" variant="cat">{CATEGORY_LABEL[e.category] ?? e.category}</Chip></td>
                <td className="py-2.5 pr-3 font-mono tabular-nums text-text-muted">{formatDateTime(e.startsAt)}</td>
                <td className="py-2.5 pr-3">
                  <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1 text-accent-400 hover:text-text underline break-all">
                    {new URL(e.sourceUrl).hostname}<I.ext s={11} />
                  </a>
                </td>
                <td className="py-2.5 pl-3 text-right">
                  {/* ⛔ `?tab=queue`, NOT the bare route. This link means "the poll drafted from
                      this event is over there" — and a drafted poll is PENDING_REVIEW, which
                      lives on the review queue. `/admin/ai-polls` landed on `generate`, a form
                      for making a NEW poll: the officer is shown the opposite of what they
                      asked for. §K rule 7d ③, on a cross-page link.
                      ⚠️ This comment sits ABOVE the ternary rather than inside its branch: a JSX
                      comment as the first token of a `? (` branch is a parse error, not a
                      comment. ⛔ And it does not SPELL the delimiter while saying so — writing
                      the closing sequence inside prose ends the comment right there. */}
                  {e.generatedAt ? (
                    <Link href={"/admin/ai-polls?tab=queue" as never} className="inline-flex items-center gap-1 font-mono text-[11px] text-yes-300 hover:text-text underline">
                      <I.check s={12} /> drafted
                    </Link>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="primary" loading={pending && busyId === e.id}
                              disabled={pending} onClick={() => generate(e.id)} leading={<I.sparkle s={13} />}>
                        Draft poll
                      </Button>
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => remove(e.id)} aria-label="Remove">
                        <I.trash s={13} />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollX>
    );
  }

  return (
    <form ref={formRef} {...formProps} onSubmit={onSubmit} className="rounded-xl border border-border bg-bg-elevated p-4">
      <p className="mb-3 font-mono text-micro uppercase eyebrow font-bold text-text-subtle">Add a real event</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11.5px] text-text-muted">What happens</span>
          <Input name="title" required placeholder="Simba SC vs Yanga — Kariakoo Derby" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] text-text-muted">Category</span>
          {/* ⛔ `label: c` OFFERED THE RAW SLUGS — the listbox read "sports", "macro". A
              filter/chooser option is a label (§L1), and §L2's definition site for the
              category word is `CATEGORY_LABEL`. The VALUE stays the slug: it is what the
              server action stores. */}
          <Select name="category" required options={categories.map((c) => ({ value: c, label: CATEGORY_LABEL[c] ?? c }))} value={category} onChange={setCategory} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] text-text-muted">Starts (local)</span>
          <Input name="startsAt" type="datetime-local" required />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] text-text-muted">Official source URL</span>
          <Input name="sourceUrl" required placeholder="https://tff.or.tz/fixtures/..." />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-[11.5px] text-text-muted">Note for the AI (optional)</span>
          <Input name="note" placeholder="Draft a market on the result, not the scoreline" />
        </label>
      </div>
      <p className="mt-2 text-body-sm text-text-subtle">
        The source domain must already be on the trusted registry for this category, or the event is rejected.
      </p>
      <div className="mt-3">
        {/* ⭐ Disabled while the form is empty — nothing has been typed, so there is nothing to add. */}
        <Button ref={saveRef} type="submit" variant="primary" size="sm" loading={pending} disabled={!dirty} leading={<I.plus s={14} />}>Add event</Button>
      </div>

      {/* One signal, two surfaces — the bar states it, the guard catches the exits.
          ⛔ ONE SAVE ON SCREEN (Ali, 2026-09-26): the bar's "Add event" shows only while the form's
          own is out of sight, and both submit the form, so both run `add`. */}
      <PendingChangesBar
        dirty={dirty}
        saving={pending}
        detail="An event that is not added cannot be drafted into a poll."
        saveLabel="Add event"
        savedLabel="Event added"
        onSave={() => formRef.current?.requestSubmit()}
        onDiscard={() => { formRef.current?.reset(); restoreCategory(keptCategory.current); markSaved(); }}
        saveAnchor={saveRef}
      />
      <UnsavedChangesGuard dirty={dirty} body="This event has been typed but not added. Leaving now discards it." />
    </form>
  );
}
