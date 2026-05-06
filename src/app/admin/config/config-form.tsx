"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  updateGlobalConfigAction,
  setMarketOverrideAction,
  clearMarketOverrideAction,
} from "./actions";
import type { RateConfig } from "@/lib/server/market-config";

export function GlobalConfigForm({ config }: { config: RateConfig }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await updateGlobalConfigAction(fd);
      if (!r.ok) {
        toast({ title: "Couldn't update", description: r.error, variant: "danger" });
      } else {
        toast({ title: "Global config updated", variant: "success" });
        router.refresh();
      }
    });
  };

  const taxPct = (config.taxRate * 100).toFixed(1);
  const commPct = (config.commissionRate * 100).toFixed(1);

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field
          label="Tax rate (%)"
          hint={`Current ${taxPct}%. To TRA per Income Tax Act §80.`}
        >
          <Input name="taxRate" type="number" step="0.1" min="0" max="20" defaultValue={taxPct} mono />
        </Field>
        <Field
          label="Commission rate (%)"
          hint={`Current ${commPct}%. 50pick operator margin.`}
        >
          <Input name="commissionRate" type="number" step="0.1" min="0" max="20" defaultValue={commPct} mono />
        </Field>
        <Field label="Min stake (TZS)" hint={`Current ${config.minStake.toLocaleString()}`}>
          <Input name="minStake" type="number" step="100" min="100" defaultValue={config.minStake} mono />
        </Field>
        <Field label="Max stake (TZS)" hint={`Current ${config.maxStake.toLocaleString()}`}>
          <Input name="maxStake" type="number" step="1000" min="1000" defaultValue={config.maxStake} mono />
        </Field>
        <Field
          label="Thin-profit threshold"
          hint={`Currently ${config.thinProfitRatio.toFixed(2)}× — payout/stake below this shows the warning.`}
        >
          <Input name="thinProfitRatio" type="number" step="0.01" min="1" max="2" defaultValue={config.thinProfitRatio.toFixed(2)} mono />
        </Field>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" variant="yes" loading={pending}>
          Save · Hifadhi
        </Button>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
          Combined tax + commission must stay ≤ 30%
        </p>
      </div>
    </form>
  );
}

export function MarketOverrideForm({ globalConfig }: { globalConfig: RateConfig }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await setMarketOverrideAction(fd);
      if (!r.ok) {
        toast({ title: "Couldn't save override", description: r.error, variant: "danger" });
      } else {
        toast({ title: "Override saved", variant: "success" });
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Market id" hint="Get this from the markets table — starts with mkt_">
        <Input name="marketId" placeholder="mkt_abc123…" mono />
      </Field>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Tax (%)" hint={`Leave blank to inherit ${(globalConfig.taxRate * 100).toFixed(1)}%`}>
          <Input name="taxRate" type="number" step="0.1" min="0" max="20" placeholder="" mono />
        </Field>
        <Field label="Commission (%)" hint={`Leave blank to inherit ${(globalConfig.commissionRate * 100).toFixed(1)}%`}>
          <Input name="commissionRate" type="number" step="0.1" min="0" max="20" placeholder="" mono />
        </Field>
        <Field label="Min stake (TZS)" hint="Optional override">
          <Input name="minStake" type="number" step="100" min="100" placeholder="" mono />
        </Field>
        <Field label="Max stake (TZS)" hint="Optional override">
          <Input name="maxStake" type="number" step="1000" min="1000" placeholder="" mono />
        </Field>
      </div>
      <Button type="submit" variant="primary" loading={pending}>
        Save override
      </Button>
    </form>
  );
}

export function ClearOverrideButton({ marketId }: { marketId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const onClick = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("marketId", marketId);
      await clearMarketOverrideAction(fd);
      toast({ title: "Override cleared", variant: "warning" });
      router.refresh();
    });
  };
  return (
    <Button type="button" size="sm" variant="ghost" onClick={onClick} loading={pending}>
      Clear
    </Button>
  );
}
