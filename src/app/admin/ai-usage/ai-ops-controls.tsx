"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { setAiModelAction, setSentinelIntervalAction } from "./actions";

type ModelOption = { id: string; label: string; cost: string; tier: string };
type IntervalOption = { ms: number; label: string };

export function AiOpsControls({
  currentModel,
  currentIntervalMs,
  models,
  intervals,
}: {
  currentModel: string;
  currentIntervalMs: number;
  models: readonly ModelOption[];
  intervals: readonly IntervalOption[];
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);

  const onModelSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await setAiModelAction(fd);
      if (!r.ok) toast({ title: "Couldn't update model", description: r.error, variant: "danger" });
      else { router.refresh(); deferToast({ title: "Model updated — takes effect on next AI call", variant: "success" }); }
    });
  };

  const onIntervalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await setSentinelIntervalAction(fd);
      if (!r.ok) toast({ title: "Couldn't update interval", description: r.error, variant: "danger" });
      else { router.refresh(); deferToast({ title: "Sweep interval updated — takes effect on next tick", variant: "success" }); }
    });
  };

  const modelLabel = models.find((m) => m.id === currentModel);
  const intervalLabel = intervals.find((i) => i.ms === currentIntervalMs);

  return (
    <div className="space-y-4">
      <form onSubmit={onModelSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-muted">
            Primary model · Modeli
          </span>
          <Select
            name="model"
            defaultValue={currentModel}
            size="xs"
            options={models.map((m) => ({
              value: m.id,
              label: `${m.label} — ${m.tier} (${m.cost})`,
            }))}
          />
        </div>
        <Button type="submit" size="sm" loading={pending}>Apply</Button>
      </form>
      <p className="text-[11px] text-text-tertiary leading-snug">
        Controls poll generation + sentinel deep checks. Triage always uses Haiku 4.5 (cheapest).
        {modelLabel && (
          <> Currently: <strong className="text-text-muted">{modelLabel.label}</strong> ({modelLabel.cost}).</>
        )}
      </p>

      <div className="border-t border-border pt-4" />

      <form onSubmit={onIntervalSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-muted">
            Sentinel sweep interval · Muda wa ukaguzi
          </span>
          <Select
            name="intervalMs"
            defaultValue={String(currentIntervalMs)}
            size="xs"
            options={intervals.map((o) => ({
              value: String(o.ms),
              label: o.label,
            }))}
          />
        </div>
        <Button type="submit" size="sm" loading={pending}>Apply</Button>
      </form>
      <p className="text-[11px] text-text-tertiary leading-snug">
        How often the sentinel scans live markets for early resolution triggers. Shorter = faster detection, higher cost.
        {intervalLabel && (
          <> Currently: <strong className="text-text-muted">{intervalLabel.label.toLowerCase()}</strong>.</>
        )}
      </p>
    </div>
  );
}
