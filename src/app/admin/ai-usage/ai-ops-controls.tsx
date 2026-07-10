"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { I } from "@/components/ui/glyphs";
import { setAiModelAction, setSentinelIntervalAction } from "./actions";

type ModelOption = { id: string; label: string; cost: string; tier: string };
type IntervalOption = { ms: number; label: string };

export function AiOpsControls({
  currentModel,
  currentIntervalMs,
  triageModel,
  models,
  intervals,
  liveMarketCount,
}: {
  currentModel: string;
  currentIntervalMs: number;
  triageModel: string;
  models: readonly ModelOption[];
  intervals: readonly IntervalOption[];
  liveMarketCount: number;
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
      else { router.refresh(); deferToast({ title: "Sweep interval updated — applies immediately", variant: "success" }); }
    });
  };

  const modelInfo = models.find((m) => m.id === currentModel);
  const intervalInfo = intervals.find((i) => i.ms === currentIntervalMs);
  const triageInfo = models.find((m) => m.id === triageModel);

  return (
    <div className="space-y-5">
      {/* ── Primary model (changeable) ── */}
      <div>
        <form onSubmit={onModelSubmit} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-muted">
              Primary model · Modeli kuu
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
        <div className="mt-2 rounded-md border border-border bg-bg-overlay px-3 py-2.5 text-[11px] text-text-muted leading-relaxed space-y-1">
          <p>
            <I.sparkle s={11} className="inline text-brand-300 mr-1" />
            <strong className="text-text">Affects poll generation</strong> — the AI that creates new market questions with web search.
          </p>
          <p>
            <I.shieldcheck s={11} className="inline text-brand-300 mr-1" />
            <strong className="text-text">Affects sentinel deep checks</strong> — the AI that web-searches flagged markets to verify if outcomes are settled.
          </p>
          <p className="text-text-subtle">
            Bigger model = better accuracy, higher cost per call. Sonnet 4.6 is the recommended default.
            {modelInfo && (
              <> Currently: <strong className="text-text-muted">{modelInfo.label}</strong> ({modelInfo.cost}).</>
            )}
          </p>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* ── Triage model (read-only) ── */}
      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-muted">
          Triage model · Modeli ya uchujaji
        </span>
        <div className="mt-1 flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-bg-overlay text-[14px] font-mono text-text-subtle">
          <I.lock s={12} className="text-text-subtle shrink-0" />
          {triageInfo ? triageInfo.label : triageModel}
          <span className="text-[11px] text-text-subtle ml-auto">{triageInfo?.cost ?? ""}</span>
        </div>
        <div className="mt-2 rounded-md border border-border bg-bg-overlay px-3 py-2.5 text-[11px] text-text-muted leading-relaxed space-y-1">
          <p>
            <I.search s={11} className="inline text-brand-300 mr-1" />
            <strong className="text-text">Used for sentinel triage only</strong> — the cheap quick-scan that runs on ALL live markets every sweep. No web search, pure reasoning.
          </p>
          <p className="text-text-subtle">
            Locked to Haiku 4.5 (~$0.002/market). Using a bigger model here would multiply cost with no accuracy benefit since triage only decides which markets need a deeper look.
          </p>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* ── Sweep interval (changeable) ── */}
      <div>
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
        <div className="mt-2 rounded-md border border-border bg-bg-overlay px-3 py-2.5 text-[11px] text-text-muted leading-relaxed space-y-1">
          <p>
            <I.clock s={11} className="inline text-brand-300 mr-1" />
            <strong className="text-text">How often the sentinel scans all live markets.</strong> Each sweep: Haiku triages every market (~$0.002 each), then flagged markets get a full deep check (~$0.05 each).
          </p>
          <p>
            <strong className="text-text">Only LIVE markets are scanned.</strong> Resolved, voided, and closed markets are skipped. Once a market leaves LIVE status, it stops costing you.
            Currently <strong className="text-text">{liveMarketCount} live market{liveMarketCount !== 1 ? "s" : ""}</strong> — triage cost per sweep: ~${(liveMarketCount * 0.002).toFixed(2)}.
          </p>
          <p className="text-no-300">
            Shorter intervals = faster detection of settled outcomes, but higher cost. With {liveMarketCount} markets at every-15-min, expect ~${(liveMarketCount * 0.002 * 96).toFixed(1)}/day in triage. At every-4-hours, ~${(liveMarketCount * 0.002 * 6).toFixed(2)}/day.
          </p>
          <p className="text-text-subtle">
            Changes apply immediately — no need to wait for the old timer.
            {intervalInfo && (
              <> Currently: <strong className="text-text-muted">{intervalInfo.label.toLowerCase()}</strong>.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
