"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { addSourceAction, removeSourceAction, toggleSourceAction, toggleCategoryAction } from "./actions";

const CATEGORIES = ["sports", "macro", "weather", "crypto", "culture", "tech", "other"] as const;

export function ToggleSource({ id, enabled }: { id: string; enabled: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const onClick = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("enabled", String(!enabled));
      await toggleSourceAction(fd);
      router.refresh();
    });
  };
  return <Toggle on={enabled} onClick={onClick} disabled={pending} aria-label="Toggle source enabled" />;
}

export function RemoveSource({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast } = useDeferredToast(pending);
  const doRemove = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      await removeSourceAction(fd);
      router.refresh();
      deferToast({ title: "Source removed", description: label, variant: "warning" });
    });
  };
  return (
    <ConfirmDialog
      trigger={
        <button
          type="button"
          disabled={pending}
          className="text-[11px] font-mono uppercase tracking-[0.12em] text-text-subtle hover:text-no-300 transition-colors"
        >
          Remove
        </button>
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
  const onClick = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("category", category);
      fd.set("enabled", String(!enabled));
      await toggleCategoryAction(fd);
      router.refresh();
    });
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`inline-flex h-7 items-center gap-1.5 rounded-pill border px-3 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
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

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await addSourceAction(fd);
      if (!r.ok) {
        toast({ title: "Could not add source", description: r.error, variant: "danger" });
      } else {
        (e.target as HTMLFormElement).reset();
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
        className="btn btn-gold btn-sm"
      >
        + Add source
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-border bg-bg-elevated p-4 space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">Add trusted source</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-1">Domain</span>
          <Input name="domain" required placeholder="bot.go.tz" size="sm" />
        </label>
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-1">Label</span>
          <Input name="label" required placeholder="Bank of Tanzania" size="sm" />
        </label>
        <div>
          <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-1">Category</span>
          <Select name="category" defaultValue={CATEGORIES[0]}
            options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
        </div>
        <label className="block md:col-span-2">
          <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-1">Rationale (≥ 1 line)</span>
          <textarea name="rationale" required rows={2} placeholder="Why this source is authoritative for this category." className="w-full rounded-lg border border-border bg-[var(--bg-inset)] px-3 py-2.5 text-[13px] text-text placeholder:text-text-subtle outline-none focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)] transition-colors resize-none" />
        </label>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn btn-gold btn-md">
          {pending ? "Adding…" : "Add source"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-md">
          Cancel
        </button>
      </div>
    </form>
  );
}
