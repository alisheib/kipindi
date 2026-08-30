"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ScrollX } from "@/components/ui/scroll-x";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
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

  function add(fd: FormData) {
    start(async () => {
      const r = await addEventAction(fd);
      if (!r.ok) { toast({ title: "Could not add event", description: r.error, variant: "danger" }); return; }
      toast({ title: "Event added", variant: "success" });
      router.refresh();
    });
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
                  {e.generatedAt ? (
                    <Link href={"/admin/ai-polls" as never} className="inline-flex items-center gap-1 font-mono text-[11px] text-yes-300 hover:text-text underline">
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
    <form action={add} className="rounded-xl border border-border bg-bg-elevated p-4">
      <p className="mb-3 font-mono text-micro uppercase eyebrow font-bold text-text-subtle">Add a real event</p>
      <div className="grid gap-3 md:grid-cols-2">
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
          <Select name="category" required options={categories.map((c) => ({ value: c, label: CATEGORY_LABEL[c] ?? c }))} defaultValue={categories[0]} />
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
        <Button type="submit" variant="primary" size="sm" loading={pending} leading={<I.plus s={14} />}>Add event</Button>
      </div>
    </form>
  );
}
