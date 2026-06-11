"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { topUpAction, withdrawAction, updateHousePoolConfigAction } from "./actions";
import type { HousePoolConfig } from "@/lib/server/house-pool";

/** Lightweight card — mirrors AdminCard's visual without importing the
 *  server-coupled admin-shell module into this client component. */
function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg glass-panel p-4">
      {title && <p className="font-display font-semibold text-body-sm text-text leading-tight mb-3">{title}</p>}
      {children}
    </div>
  );
}

export function HousePoolForms({ config }: { config: HousePoolConfig }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TopUpForm />
        <WithdrawForm />
      </div>
      <PoolConfigForm config={config} />
    </>
  );
}

function TopUpForm() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await topUpAction(fd);
      if (!r.ok) {
        toast({ title: "Top-up failed", description: r.error, variant: "danger" });
      } else {
        (e.target as HTMLFormElement).reset();
        router.refresh();
        setTimeout(() => toast({ title: `Topped up · TZS ${r.balance.toLocaleString()}`, variant: "success" }), 400);
      }
    });
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <I.arrowDownToLine size={14} className="text-yes-300" />
        <p className="font-display text-body-sm font-semibold text-text">Top up reserve</p>
      </div>
      <form onSubmit={onSubmit} className="flex gap-2">
        <div className="flex-1">
          <Input name="amount" type="number" min={1000} step={1000} required placeholder="e.g. 500000" mono size="md" />
        </div>
        <Button type="submit" variant="yes" size="md" loading={pending}>
          Top up
        </Button>
      </form>
    </Card>
  );
}

function WithdrawForm() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await withdrawAction(fd);
      if (!r.ok) {
        toast({ title: "Withdrawal failed", description: r.error, variant: "danger" });
      } else {
        (e.target as HTMLFormElement).reset();
        router.refresh();
        setTimeout(() => toast({ title: `Withdrawn · TZS ${r.balance.toLocaleString()} remaining`, variant: "warning" }), 400);
      }
    });
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <I.arrowUpFromLine size={14} className="text-no-300" />
        <p className="font-display text-body-sm font-semibold text-text">Withdraw from reserve</p>
      </div>
      <form onSubmit={onSubmit} className="flex gap-2">
        <div className="flex-1">
          <Input name="amount" type="number" min={1000} step={1000} required placeholder="e.g. 100000" mono size="md" />
        </div>
        <Button type="submit" variant="danger" size="md" loading={pending}>
          Withdraw
        </Button>
      </form>
    </Card>
  );
}

function PoolConfigForm({ config }: { config: HousePoolConfig }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await updateHousePoolConfigAction(fd);
      if (!r.ok) {
        toast({ title: "Config update failed", description: r.error, variant: "danger" });
      } else {
        router.refresh();
        setTimeout(() => toast({ title: "Pool config saved", variant: "success" }), 400);
      }
    });
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <I.settings size={14} className="text-text-tertiary" />
        <p className="font-display font-semibold text-body-sm text-text">Pool configuration</p>
      </div>
      <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Seed per side (TZS)" hint={`Currently ${config.seedPerSide.toLocaleString()}`}>
          <Input name="seedPerSide" type="number" min={0} step={10000} defaultValue={config.seedPerSide} mono size="md" />
        </Field>
        <Field label="Min reserve (TZS)" hint={`Currently ${config.minReserve.toLocaleString()}`}>
          <Input name="minReserve" type="number" min={0} step={10000} defaultValue={config.minReserve} mono size="md" />
        </Field>
        <label className="flex items-center gap-2 self-end h-11">
          <input
            name="pauseMarketsOnLowReserve"
            type="checkbox"
            defaultChecked={config.pauseMarketsOnLowReserve}
            className="h-4 w-4 rounded border-border bg-bg-overlay accent-gold-500"
          />
          <span className="font-mono text-caption text-text-muted">Pause markets on low reserve</span>
        </label>
        <div className="sm:col-span-3 pt-1">
          <Button type="submit" variant="primary" size="md" loading={pending}>
            Save pool config
          </Button>
        </div>
      </form>
    </Card>
  );
}
