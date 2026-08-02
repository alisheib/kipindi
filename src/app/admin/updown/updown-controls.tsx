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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ConfirmModal } from "@/components/ui/modal";
import {
  createAssetAction, toggleAssetAction, updateAssetAction,
  createChainAction, setChainStateAction, updateChainAction,
  updateThresholdsAction, updateReadingMethodAction,
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

// ── Asset EDIT — finding E-31 ────────────────────────────────────────────────

/**
 * Edit an existing asset: its symbol, names, precision and — the one that matters —
 * its PRICE SOURCE.
 *
 * 🔴 WHY THIS EXISTS (E-31, live QA campaign 2026-08-02). `updateAssetAction` was
 * written, gated on `accounting`, and audited — and `grep -rn` found exactly one
 * reference to it: its own definition. No form, no button, no route. So the link that
 * real money settles against **could not be changed through the product at all**.
 * That is E-23's shape exactly ("a remedy that only exists in a script is not a remedy
 * an operator has"), and it bit on the critical path: driving the price feed live, the
 * GOLD asset could not be moved off `goldprice.org` — an HTML page the feed reader can
 * never quote — and the only alternative would have been hand-writing the live database
 * on the control that decides what settles real money.
 *
 * ⚠️ THE SOURCE LOCK IS THE SERVICE'S JOB, NOT THIS FORM'S. `updateAsset` refuses while
 * any round on the asset is unresolved, because a round resolves against the link it
 * captured at open; the refusal names the rounds and the money riding on them, and it is
 * shown VERBATIM. Do not pre-empt it here — a client-side guess at that state would be a
 * second source of truth about money.
 */
export function EditAssetForm({
  id, symbol, nameEn, nameSw, priceSourceUrl, decimals, minMoveTicks, label,
}: {
  id: string; symbol: string; nameEn: string; nameSw: string;
  priceSourceUrl: string; decimals: number; minMoveTicks: number; label: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const [open, setOpen] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", id);
    start(async () => {
      const r = await updateAssetAction(fd);
      if (!r.ok) {
        toast({ title: `Couldn't update ${label}`, description: r.error, variant: "danger" });
        return;
      }
      setOpen(false);
      router.refresh();
      deferToast({
        title: `${label} updated`,
        description: "Rounds already open keep the source they captured; the next round captures the new one.",
        variant: "success",
      });
    });
  };

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)} variant="ghost" size="sm">
        Edit
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-border bg-bg-elevated p-4 space-y-3 text-left">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">Edit {label}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Symbol"><Input name="symbol" defaultValue={symbol} size="sm" /></Field>
        <Field label="Name (EN)"><Input name="nameEn" defaultValue={nameEn} size="sm" /></Field>
        <Field label="Name (SW)"><Input name="nameSw" defaultValue={nameSw} size="sm" /></Field>
        <Field label="Decimals"><Input name="decimals" type="number" defaultValue={String(decimals)} min="0" max="8" size="sm" /></Field>
        <Field label="Min move (ticks)"><Input name="minMoveTicks" type="number" defaultValue={String(minMoveTicks)} min="1" size="sm" /></Field>
        <Field label="Price source URL" className="sm:col-span-2">
          <Input name="priceSourceUrl" defaultValue={priceSourceUrl} size="sm" />
        </Field>
      </div>
      <p className="text-[11.5px] leading-[1.55] text-text-subtle max-w-[80ch]">
        The host must be an <strong>enabled trusted source in this asset&rsquo;s own category</strong> —
        the allowlist is per category, so one domain approved for <span className="font-mono text-[11px]">macro</span>{" "}
        does not cover a <span className="font-mono text-[11px]">crypto</span> asset. The source cannot be
        changed while any round on this asset is still unresolved; pause its chains and let them settle first.
      </p>
      <div className="flex gap-2">
        <Button type="submit" loading={pending} variant="primary" size="md">
          {pending ? "Saving…" : "Save asset"}
        </Button>
        <Button type="button" onClick={() => setOpen(false)} variant="ghost" size="md">Cancel</Button>
      </div>
    </form>
  );
}

// ── Chain EDIT — finding E-31, and the half that blocks E-32 ─────────────────

/**
 * Edit a chain's stake bounds and its winning MARGIN.
 *
 * 🔴 The same orphan as `EditAssetForm` above, and this is the half that turned a
 * one-field change into a delete-and-recreate. `updateChainAction` existed with zero
 * callers, so a chain's margin was fixed **at creation, forever**.
 *
 * ⚠️ WHY THAT MATTERS RIGHT NOW (E-32). `defaultMarginBps` is 50 = 0.5% for every
 * duration and asset class. On BTC at ~63,250 that demands a ±$316 move inside five
 * minutes: measured on production, two real rounds that moved 0.168% and 0.047% both
 * resolved cleanly at margin 0 and would BOTH have voided at the default — i.e. a chain
 * on the default fills its history with `no-move` voids while the feed works perfectly,
 * which is indistinguishable from E-16. Tuning that per chain is the remedy, and until
 * this form existed there was no way to apply it.
 *
 * ⚠️ `marginPct` is sent even when blank, deliberately. `updateChainAction` only touches
 * the margin when the field is PRESENT (blank-but-present = inherit the default), so
 * omitting it would make "clear this override" unexpressible.
 */
export function EditChainForm({
  id, label, minStake, maxStake, marginBps, inheritMarginBps,
}: {
  id: string; label: string;
  minStake: number | null; maxStake: number | null;
  marginBps: number | null;
  /** What a BLANK margin box inherits for this chain — the E-32 ladder rung for its asset
   *  class and duration, else the flat product default. ⚠️ Not `cfg.defaultMarginBps`: on
   *  every chain the platform actually runs those two now differ (0.02-0.05% vs 0.50%), and
   *  a placeholder showing the wrong one tells an operator the band is 25x what it is. */
  inheritMarginBps: number;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const [open, setOpen] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", id);
    start(async () => {
      const r = await updateChainAction(fd);
      if (!r.ok) {
        toast({ title: `Couldn't update ${label}`, description: r.error, variant: "danger" });
        return;
      }
      setOpen(false);
      router.refresh();
      deferToast({
        title: `${label} updated`,
        description: "Rounds already open keep the margin and bounds they froze at open.",
        variant: "success",
      });
    });
  };

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)} variant="ghost" size="sm">
        Edit
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-border bg-bg-elevated p-4 space-y-3 text-left">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">Edit {label}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Margin % (blank = inherit)">
          <Input
            name="marginPct" type="number" step="0.01" min="0" max="20" size="sm"
            defaultValue={marginBps != null ? (marginBps / 100).toFixed(2) : ""}
            placeholder={`inherit (${(inheritMarginBps / 100).toFixed(2)})`}
          />
        </Field>
        <Field label="Min stake (blank = inherit)">
          <Input name="minStake" type="number" size="sm" defaultValue={minStake != null ? String(minStake) : ""} placeholder="inherit" />
        </Field>
        <Field label="Max stake (blank = inherit)">
          <Input name="maxStake" type="number" size="sm" defaultValue={maxStake != null ? String(maxStake) : ""} placeholder="inherit" />
        </Field>
      </div>
      <p className="text-[11.5px] leading-[1.55] text-text-subtle max-w-[80ch]">
        The margin is the winning band: <strong>UP at open + margin, DOWN at open − margin</strong>, and
        anything between VOIDs and refunds every stake. A band wider than the asset typically moves in one
        round voids nearly every round <em>even when the price feed is working perfectly</em> — measured on
        production, 0.50% needs a ±$316 move on BTC inside five minutes and voided 5 real rounds out of 5.
        Leaving this blank inherits the measured ladder for this asset class and duration (E-32), which is what
        the placeholder shows. <strong>0</strong> falls back to the source&rsquo;s minimum move, which lets a
        single tick decide real money. Changes affect FUTURE rounds only.
      </p>
      <div className="flex gap-2">
        <Button type="submit" loading={pending} variant="primary" size="md">
          {pending ? "Saving…" : "Save chain"}
        </Button>
        <Button type="button" onClick={() => setOpen(false)} variant="ghost" size="md">Cancel</Button>
      </div>
    </form>
  );
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
        <Button type="button" onClick={() => go("RUNNING")} loading={pending} variant="primary" size="sm">
          {state === "PAUSED" ? "Resume" : "Start"}
        </Button>
      )}
      {state === "RUNNING" && (
        <Button type="button" onClick={() => go("PAUSED")} loading={pending} variant="ghost" size="sm">
          Pause
        </Button>
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
      <Button type="button" onClick={() => setOpen(true)} variant="primary" size="md">
        + Add asset
      </Button>
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
      <p className="text-[11.5px] leading-[1.55] text-text-subtle max-w-[80ch]">
        Because a round resolves against the link it captured, <strong>the source cannot be changed while any round on
        the asset is still unresolved</strong>. To move it: pause the asset&rsquo;s chains, let the in-flight rounds
        settle, then edit — the next round captures the new link.
      </p>
      <div className="flex gap-2">
        <Button type="submit" loading={pending} variant="primary" size="md">
          {pending ? "Adding…" : "Add asset"}
        </Button>
        <Button type="button" onClick={() => setOpen(false)} variant="ghost" size="md">Cancel</Button>
      </div>
    </form>
  );
}

// ── Add chain ────────────────────────────────────────────────────────────────

export function AddChainForm({
  assets, marginSchedule, defaultMarginBps,
}: {
  assets: Array<{ id: string; key: string; nameEn: string; category: string }>;
  /** The E-32 ladder, so the margin placeholder shows what THIS asset class and duration
   *  will actually inherit. It was a hard-coded "inherit (0.5)" before, which is now wrong
   *  for every combination the form can produce — and a chain created at 0.5% voids
   *  essentially every round it ever emits. */
  marginSchedule: Array<{ category: string; maxDurationMinutes: number; bps: number }>;
  defaultMarginBps: number;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const [open, setOpen] = useState(false);
  // Mirrors what the picker currently shows, so the placeholder tracks the selection.
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [dur, setDur] = useState("5");

  /** The same resolution the server does (`resolveScheduledMarginBps`): exact category
   *  before `"*"`, then the tightest window that still covers this duration. */
  const inherited = (() => {
    const cat = assets.find((a) => a.id === assetId)?.category ?? "";
    const minutes = Number(dur) || 0;
    const m = marginSchedule
      .filter((r) => (r.category === cat || r.category === "*") && minutes <= r.maxDurationMinutes)
      .sort((a, b) => (a.category === "*" ? 1 : 0) - (b.category === "*" ? 1 : 0) ||
        a.maxDurationMinutes - b.maxDurationMinutes)[0];
    return m?.bps ?? defaultMarginBps;
  })();

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
      <Button type="button" onClick={() => setOpen(true)} variant="primary" size="md">
        + Add chain
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-border bg-bg-elevated p-4 space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">Add chain</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Asset">
          <Select name="assetId" value={assetId} onChange={setAssetId}
            options={assets.map((a) => ({ value: a.id, label: `${a.key} · ${a.nameEn}` }))} />
        </Field>
        <Field label="Duration">
          <Select name="durationMinutes" value={dur} onChange={setDur}
            options={DURATIONS.map((d) => ({ value: String(d), label: `${d} min` }))} />
        </Field>
        <Field label="Margin % (optional)">
          <Input name="marginPct" type="number" step="0.01" min="0" max="20"
            placeholder={`inherit (${(inherited / 100).toFixed(2)})`} size="sm" />
        </Field>
        <Field label="Min stake (optional)"><Input name="minStake" type="number" placeholder="inherit" size="sm" /></Field>
        <Field label="Max stake (optional)"><Input name="maxStake" type="number" placeholder="inherit" size="sm" /></Field>
      </div>
      <p className="font-mono text-[9.5px] leading-[1.5] text-text-faint">
        Margin is the ± winning band for this chain — blank inherits the product default (0.5%). Frozen onto each round at open.
      </p>
      <div className="flex gap-2">
        <Button type="submit" loading={pending} variant="primary" size="md">
          {pending ? "Adding…" : "Add chain"}
        </Button>
        <Button type="button" onClick={() => setOpen(false)} variant="ghost" size="md">Cancel</Button>
      </div>
    </form>
  );
}

// ── Reading method — which reader produces the price money settles against ───

/**
 * The most consequential control on this page, so it is the most explicit one.
 *
 * Three UX obligations, all deliberate:
 *  1. **The consequence is shown before the save, not after.** The panel below the selects
 *     restates, in plain words, what the current selection means for a live round — because
 *     "feed / mock" tells an operator nothing about whether prices are real.
 *  2. **Choosing the simulated feed is a typed confirmation**, matching the payment-provider
 *     switch. Not a second gate for its own sake: the code refuses a simulated feed in
 *     production outright, and this stops a mis-click putting invented prices on a TEST-mode
 *     round that real staff are reading.
 *  3. **The AI method carries its measured warning inline.** It is not a hypothetical
 *     downside — it is why the feed is the default.
 */
export function ReadingMethodForm({
  observationMethod, feedProvider, twelveDataKeyPresent, maxStalenessSeconds,
}: {
  observationMethod: "feed" | "ai";
  feedProvider: "mock" | "twelvedata";
  twelveDataKeyPresent: boolean;
  maxStalenessSeconds: number;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const [method, setMethod] = useState<"feed" | "ai">(observationMethod);
  const [provider, setProvider] = useState<"mock" | "twelvedata">(feedProvider);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const dirty = method !== observationMethod || provider !== feedProvider;
  const simulated = method === "feed" && provider === "mock";
  const keyMissing = method === "feed" && provider === "twelvedata" && !twelveDataKeyPresent;

  const save = () => {
    const fd = new FormData();
    fd.set("observationMethod", method);
    fd.set("feedProvider", provider);
    // The server demands this word independently; the modal's type-to-arm gate is the UX,
    // not the authority. A crafted POST without it is refused there.
    if (simulated) fd.set("confirm", "SIMULATED");
    start(async () => {
      const r = await updateReadingMethodAction(fd);
      setConfirmOpen(false);
      if (!r.ok) {
        toast({ title: "Could not change the reading method", description: r.error, variant: "danger" });
        return;
      }
      router.refresh();
      deferToast({
        title: "Reading method saved",
        description: r.warn ?? (simulated
          ? "Prices are SIMULATED — new rounds will not settle against a real market."
          : "Takes effect at the next grid boundary. Rounds already open keep their captured source."),
        variant: r.warn || simulated ? "warning" : "success",
      });
    });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (simulated) { setConfirmOpen(true); return; }
    save();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Reading method">
          <Select
            value={method}
            onChange={(v) => setMethod(v as "feed" | "ai")}
            ariaLabel="Price reading method"
            size="sm"
            options={[
              { value: "feed", label: "Market data feed (recommended)" },
              { value: "ai", label: "AI reads the source page" },
            ]}
          />
        </Field>
        <Field label="Feed provider">
          <Select
            value={provider}
            onChange={(v) => setProvider(v as "mock" | "twelvedata")}
            ariaLabel="Feed provider"
            size="sm"
            options={[
              { value: "twelvedata", label: "Twelve Data — real quotes" },
              { value: "mock", label: "Simulated — invented prices" },
            ]}
          />
        </Field>
      </div>

      {/* ── What the current selection MEANS, stated before the save, not after.
             "feed / mock" tells an operator nothing about whether prices are real. ── */}
      <div
        className={
          "rounded-lg border p-3 text-[11.5px] leading-[1.55] max-w-[80ch] " +
          (simulated || keyMissing || method === "ai"
            ? "border-warning-border bg-warning-bg text-warning-fg"
            : "border-border bg-[var(--bg-inset)] text-text-subtle")
        }
      >
        {method === "ai" ? (
          <>
            <strong>AI page reading refuses almost every short round.</strong> Measured, not
            theoretical: across seven approved gold and index pages the AI returned no quoted
            timestamp at all, or a quote 9–12 hours old — one was 7.3 days old — because those
            pages render their price in JavaScript the fetch tool does not execute. At{" "}
            {maxStalenessSeconds}s staleness every 5- and 15-minute round will refuse, retry, then{" "}
            <strong>void and refund in full</strong>. Use it only for an asset no feed carries, and
            only with a staleness window that suits it.
          </>
        ) : simulated ? (
          <>
            <strong>Prices would be invented, not observed.</strong> A simulated feed is for local
            development and test money mode. It is <strong>refused outright in production</strong> —
            a live round fails its reading, then voids and refunds rather than settle on a made-up
            number.
          </>
        ) : keyMissing ? (
          <>
            <strong>TWELVEDATA_API_KEY is not set</strong>, so this provider cannot quote — and it
            will <strong>not</strong> fall back to simulated prices. Every reading refuses by name
            and rounds void and refund in full until the key is added to the Railway service
            variables.
          </>
        ) : (
          <>
            Real quotes, each carrying the provider&rsquo;s own timestamp, with the endpoint checked
            against the asset&rsquo;s approved domain and refused if further than{" "}
            {maxStalenessSeconds}s from the round boundary. This is the production setting.
          </>
        )}
      </div>

      <p className="text-[11.5px] leading-[1.55] text-text-subtle max-w-[80ch]">
        A change takes effect at the <strong>next grid boundary</strong>. Rounds already open keep
        the source link they captured and resolve against it — changing the reader never changes the
        terms of a round players have already staked on.
      </p>

      <div className="flex items-center gap-2">
        <Button type="submit" loading={pending} disabled={!dirty} variant="primary" size="md">
          {dirty ? "Save reading method" : "Saved"}
        </Button>
        {dirty && !pending && (
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => { setMethod(observationMethod); setProvider(feedProvider); }}
          >
            Discard
          </Button>
        )}
      </div>

      {/* Kit type-to-arm gate — the same one the payment provider switch uses for MOCK. */}
      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={save}
        title="Switch to simulated prices?"
        tone="claret"
        tier="hard"
        typedWord="SIMULATED"
        confirmLabel="Use simulated prices"
        body={
          <>
            <p>
              Every new round would open and close on an <strong>invented</strong> price. This is
              for development and test money mode only — production refuses it outright.
            </p>
            <p className="mt-2">
              Rounds already open are unaffected: they keep the source they captured.
            </p>
          </>
        }
      />
    </form>
  );
}

// ── Thresholds ───────────────────────────────────────────────────────────────

export function ThresholdsForm({
  maxStalenessSeconds, confidenceThreshold, maxObservationAttempts, defaultMinStake, defaultMaxStake, defaultMarginBps,
}: {
  maxStalenessSeconds: number; confidenceThreshold: number; maxObservationAttempts: number;
  defaultMinStake: number; defaultMaxStake: number; defaultMarginBps: number;
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Fallback margin (%)">
          <Input name="defaultMarginPct" type="number" step="0.01" min="0" max="20" defaultValue={(defaultMarginBps / 100).toFixed(2)} size="sm" />
        </Field>
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
        <strong>The margin</strong>{" "}is the ± band around each round&rsquo;s opening price. UP wins if the price
        reaches <em>open + margin</em>, DOWN if it reaches <em>open − margin</em>; a smaller move voids the round and
        refunds every stake in full. ⚠️ The box above is the <strong>fallback only</strong>: every duration this
        platform actually runs is priced by the measured ladder (E-32) — <strong>0.02%</strong> at 5 min,
        <strong>0.03%</strong> at 15, <strong>0.05%</strong> at 30 — and the fallback applies solely to a window
        longer than the ladder&rsquo;s top rung. Measured on real provider data, 0.5% voids 96&ndash;100% of rounds at
        every duration offered here; it is roughly right for a <em>one-day</em> round, because the typical move grows
        with the square root of the window. The margin is frozen onto each round at open, so a change affects only{" "}
        <strong>new</strong> rounds; override it per chain with <em>Edit</em> to tune a single asset or duration.
      </p>
      <p className="text-[11.5px] leading-[1.55] text-text-subtle max-w-[80ch]">
        <strong>Staleness</strong>{" "}is how far the source&rsquo;s own quoted time may sit from the round boundary
        before a reading is refused. A refused reading is retried; a boundary that never confirms voids its rounds and
        refunds every stake in full — we never settle on a guessed price.
      </p>
      <Button type="submit" loading={pending} variant="primary" size="md">
        {pending ? "Saving…" : "Save thresholds"}
      </Button>
    </form>
  );
}
