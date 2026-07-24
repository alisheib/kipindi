"use client";

/**
 * Up & Down admin controls.
 *
 * KIT-ONLY. Every control here is a kit primitive (`Input`, `Select`, `Toggle`,
 * `ConfirmDialog`, `.btn`, `.chip`) or the same hand-rolled idiom the neighbouring
 * admin pages already use. Nothing is invented locally — if a control is needed that
 * the kit lacks, it gets added to the kit and used everywhere, never forked here.
 *
 * Interaction contract, matching the rest of admin:
 *  · every mutation goes through useTransition + useDeferredToast, so success toasts
 *    fire on the falling edge of pending (when router.refresh() commits), not on a
 *    setTimeout;
 *  · a consequential action confirms through the kit `ConfirmDialog` — never the
 *    native browser confirm();
 *  · server refusals are shown VERBATIM. The service layer explains exactly why
 *    (e.g. "Stop this asset's 2 running chain(s) first"), and rewriting that into a
 *    generic "failed" would throw away the only useful part.
 */

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  createAssetAction, toggleAssetAction,
  createChainAction, setChainStateAction,
  updateThresholdsAction,
} from "./actions";

const DURATIONS = [5, 15, 30] as const;
const ICONS = ["gold", "silver", "platinum", "copper", "oil", "fx", "crypto"] as const;
const CATEGORIES = ["macro", "crypto", "other"] as const;

/** Shared label shell — one definition, used by every field on this page. */
function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-1">{label}</span>
      {children}
    </label>
  );
}

// ── Asset enable/disable ─────────────────────────────────────────────────────

export function ToggleAsset({ id, enabled, label }: { id: string; enabled: boolean; label: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const onClick = () => {
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("id", id);
        fd.set("enabled", String(!enabled));
        const r = await toggleAssetAction(fd);
        if (!r.ok) {
          // Verbatim: the service says WHY (source no longer trusted / chains still
          // running), and that reason is the actionable part.
          toast({ title: `Couldn't ${enabled ? "disable" : "enable"} ${label}`, description: r.error, variant: "danger" });
          return;
        }
        router.refresh();
        deferToast({ title: enabled ? `${label} disabled` : `${label} enabled`, variant: "success" });
      } catch {
        toast({ title: "Couldn't update asset", variant: "danger" });
      }
    });
  };
  return <Toggle on={enabled} onClick={onClick} disabled={pending} aria-label={`Toggle ${label} enabled`} />;
}

// ── Chain run / pause / stop ─────────────────────────────────────────────────

export function ChainStateControls({
  id, state, label,
}: { id: string; state: "RUNNING" | "PAUSED" | "STOPPED"; label: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);

  const go = (next: "RUNNING" | "PAUSED" | "STOPPED") => {
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("id", id);
        fd.set("state", next);
        const r = await setChainStateAction(fd);
        if (!r.ok) {
          toast({ title: `Couldn't change ${label}`, description: r.error, variant: "danger" });
          return;
        }
        router.refresh();
        deferToast({
          title: next === "RUNNING" ? `${label} started` : next === "PAUSED" ? `${label} paused` : `${label} stopped`,
          description: next === "RUNNING" ? undefined : "Rounds already open settle normally.",
          variant: next === "RUNNING" ? "success" : "warning",
        });
      } catch {
        toast({ title: "Couldn't change chain state", variant: "danger" });
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {state !== "RUNNING" && (
        <button type="button" onClick={() => go("RUNNING")} disabled={pending} className="btn btn-primary btn-sm">
          {pending ? "…" : state === "PAUSED" ? "Resume" : "Start"}
        </button>
      )}
      {state === "RUNNING" && (
        <button type="button" onClick={() => go("PAUSED")} disabled={pending} className="btn btn-ghost btn-sm">
          {pending ? "…" : "Pause"}
        </button>
      )}
      {state !== "STOPPED" && (
        <ConfirmDialog
          trigger={
            <button
              type="button"
              disabled={pending}
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-subtle hover:text-no-300 transition-colors px-2 py-1.5"
            >
              Stop
            </button>
          }
          title={`Stop ${label}?`}
          body="No new rounds will open. Rounds already open keep running and settle normally — no player is left holding an unsettled stake. You can start it again at any time."
          confirmLabel="Stop chain"
          tone="claret"
          onConfirm={() => go("STOPPED")}
        />
      )}
    </div>
  );
}

// ── Add asset ────────────────────────────────────────────────────────────────

export function AddAssetForm() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const [open, setOpen] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const r = await createAssetAction(fd);
      if (!r.ok) {
        toast({ title: "Could not add asset", description: r.error, variant: "danger" });
        return;
      }
      form.reset();
      setOpen(false);
      router.refresh();
      deferToast({ title: "Asset added", description: "It starts disabled — enable it when the source is confirmed.", variant: "success" });
    });
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary btn-md">
        + Add asset
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-border bg-bg-elevated p-4 space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">Add tradable asset</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Key (never renamed)"><Input name="key" required placeholder="XAU" size="sm" /></Field>
        <Field label="Symbol"><Input name="symbol" required placeholder="XAU/USD" size="sm" /></Field>
        <Field label="Icon">
          <Select name="iconKey" defaultValue="gold" options={ICONS.map((i) => ({ value: i, label: i }))} />
        </Field>
        <Field label="Name (EN)"><Input name="nameEn" required placeholder="Gold" size="sm" /></Field>
        <Field label="Name (SW)"><Input name="nameSw" required placeholder="Dhahabu" size="sm" /></Field>
        <Field label="Name (ZH) — optional"><Input name="nameZh" placeholder="黄金" size="sm" /></Field>
        <Field label="Category">
          <Select name="category" defaultValue="macro" options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
        </Field>
        <Field label="Decimals"><Input name="decimals" type="number" defaultValue="2" min="0" max="8" size="sm" /></Field>
        <Field label="Min move (ticks)"><Input name="minMoveTicks" type="number" defaultValue="1" min="1" size="sm" /></Field>
        <Field label="Price source URL" className="sm:col-span-2 lg:col-span-3">
          <Input name="priceSourceUrl" required placeholder="https://www.kitco.com/price/precious-metals" size="sm" />
        </Field>
      </div>
      <p className="text-[11.5px] leading-[1.55] text-text-subtle max-w-[80ch]">
        The source domain must already be an <strong>enabled trusted source</strong> in the matching category — a round
        captures this exact link when it opens and resolves against the same link. Add it at{" "}
        <span className="font-mono text-[11px]">/admin/sources</span> first if it is not there yet.
      </p>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary btn-md">
          {pending ? "Adding…" : "Add asset"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-md">Cancel</button>
      </div>
    </form>
  );
}

// ── Add chain ────────────────────────────────────────────────────────────────

export function AddChainForm({ assets }: { assets: Array<{ id: string; key: string; nameEn: string }> }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const [open, setOpen] = useState(false);

  if (assets.length === 0) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
        add an asset first
      </span>
    );
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const r = await createChainAction(fd);
      if (!r.ok) {
        toast({ title: "Could not add chain", description: r.error, variant: "danger" });
        return;
      }
      form.reset();
      setOpen(false);
      router.refresh();
      deferToast({ title: "Chain added", description: "It starts stopped — start it when you are ready.", variant: "success" });
    });
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary btn-md">
        + Add chain
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-border bg-bg-elevated p-4 space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">Add chain</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Asset">
          <Select name="assetId" defaultValue={assets[0].id}
            options={assets.map((a) => ({ value: a.id, label: `${a.key} · ${a.nameEn}` }))} />
        </Field>
        <Field label="Duration">
          <Select name="durationMinutes" defaultValue="5"
            options={DURATIONS.map((d) => ({ value: String(d), label: `${d} min` }))} />
        </Field>
        <Field label="Min stake (optional)"><Input name="minStake" type="number" placeholder="inherit" size="sm" /></Field>
        <Field label="Max stake (optional)"><Input name="maxStake" type="number" placeholder="inherit" size="sm" /></Field>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary btn-md">
          {pending ? "Adding…" : "Add chain"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-md">Cancel</button>
      </div>
    </form>
  );
}

// ── Thresholds ───────────────────────────────────────────────────────────────

export function ThresholdsForm({
  maxStalenessSeconds, confidenceThreshold, maxObservationAttempts, defaultMinStake, defaultMaxStake,
}: {
  maxStalenessSeconds: number; confidenceThreshold: number; maxObservationAttempts: number;
  defaultMinStake: number; defaultMaxStake: number;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await updateThresholdsAction(fd);
      if (!r.ok) {
        toast({ title: "Could not save thresholds", description: r.error, variant: "danger" });
        return;
      }
      router.refresh();
      deferToast({ title: "Thresholds saved", description: r.warn, variant: r.warn ? "warning" : "success" });
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Staleness (s)">
          <Input name="maxStalenessSeconds" type="number" defaultValue={String(maxStalenessSeconds)} min="5" max="300" size="sm" />
        </Field>
        <Field label="Confidence floor">
          <Input name="confidenceThreshold" type="number" defaultValue={String(confidenceThreshold)} min="50" max="100" size="sm" />
        </Field>
        <Field label="Max attempts">
          <Input name="maxObservationAttempts" type="number" defaultValue={String(maxObservationAttempts)} min="1" max="10" size="sm" />
        </Field>
        <Field label="Default min stake">
          <Input name="defaultMinStake" type="number" defaultValue={String(defaultMinStake)} min="1" size="sm" />
        </Field>
        <Field label="Default max stake">
          <Input name="defaultMaxStake" type="number" defaultValue={String(defaultMaxStake)} min="1" size="sm" />
        </Field>
      </div>
      <p className="text-[11.5px] leading-[1.55] text-text-subtle max-w-[80ch]">
        <strong>Staleness</strong>{" "}is how far the source&rsquo;s own quoted time may sit from the round boundary
        before a reading is refused. A refused reading is retried; a boundary that never confirms voids its rounds and
        refunds every stake in full — we never settle on a guessed price.
      </p>
      <button type="submit" disabled={pending} className="btn btn-primary btn-md">
        {pending ? "Saving…" : "Save thresholds"}
      </button>
    </form>
  );
}
