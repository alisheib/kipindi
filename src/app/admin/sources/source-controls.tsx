"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
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
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      role="switch"
      aria-checked={enabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill transition-colors ${
        enabled ? "bg-yes-500" : "bg-bg-overlay border border-border"
      } ${pending ? "opacity-60" : ""}`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-pill bg-white shadow-e2 transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function RemoveSource({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const onClick = () => {
    if (!confirm(`Remove "${label}"? Markets already published with this source stay resolved by it.`)) return;
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      await removeSourceAction(fd);
      toast({ title: "Source removed", description: label, variant: "warning" });
      router.refresh();
    });
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-[11px] font-mono uppercase tracking-[0.12em] text-text-subtle hover:text-no-300 transition-colors"
    >
      Remove
    </button>
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
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await addSourceAction(fd);
      if (!r.ok) {
        toast({ title: "Could not add source", description: r.error, variant: "danger" });
      } else {
        toast({ title: "Source added", variant: "success" });
        (e.target as HTMLFormElement).reset();
        setOpen(false);
        router.refresh();
      }
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-teal-500 px-3.5 font-display font-semibold text-white text-[13px] hover:bg-teal-400 transition-colors"
      >
        + Add source
      </button>
    );
  }

  const inputCls =
    "w-full h-10 px-3 rounded-md border border-border bg-bg-overlay font-sans text-text outline-none focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)] transition-colors";

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-border bg-bg-elevated p-4 space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">Add trusted source</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-1">Domain</span>
          <input name="domain" required placeholder="bot.go.tz" className={inputCls} />
        </label>
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-1">Label</span>
          <input name="label" required placeholder="Bank of Tanzania" className={inputCls} />
        </label>
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-1">Category</span>
          <select name="category" required className={inputCls}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-1">Rationale (≥ 1 line)</span>
          <textarea name="rationale" required rows={2} placeholder="Why this source is authoritative for this category." className={`${inputCls} h-auto py-2 resize-none`} />
        </label>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="h-10 px-5 rounded-md bg-yes-500 font-display font-bold text-yes-950 hover:bg-yes-400 disabled:opacity-50 transition-colors">
          {pending ? "Adding…" : "Add source"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-10 px-4 rounded-md border border-border bg-bg-elevated font-display font-semibold text-text-muted hover:border-border-strong transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
