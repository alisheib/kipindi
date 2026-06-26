"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setCreditLimitAction, resetCreditCycleAction } from "./actions";

export function CreditControls({ limitUsd }: { limitUsd: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);

  const onSetLimit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await setCreditLimitAction(fd);
      if (!r.ok) toast({ title: "Couldn't update", description: r.error, variant: "danger" });
      else { router.refresh(); deferToast({ title: "Limit updated", variant: "success" }); }
    });
  };

  const onReset = () => {
    if (!confirm("Start a new spend cycle now? Use this right after you top up Anthropic credit \u2014 it resets \u2018spent this cycle\u2019 to $0 and re-arms the alerts.")) return;
    start(async () => {
      const r = await resetCreditCycleAction();
      if (!r.ok) toast({ title: "Couldn't reset", description: r.error, variant: "danger" });
      else { router.refresh(); deferToast({ title: "New cycle started", variant: "success" }); }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form onSubmit={onSetLimit} className="flex items-center gap-3 flex-1 min-w-[200px]">
        <Field label="Spend limit per cycle (USD)" className="flex-1 min-w-[140px]">
          <Input name="limitUsd" type="number" step="0.01" min="0.01" inputMode="decimal" defaultValue={String(limitUsd)} placeholder="20" mono />
        </Field>
        <Button type="submit" loading={pending}>Set limit</Button>
      </form>
      <Button type="button" variant="secondary" onClick={onReset} disabled={pending}>
        Reset cycle (after top-up)
      </Button>
    </div>
  );
}
