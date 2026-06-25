"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { setCreditTopupAction } from "./actions";

export function TopupForm({ current }: { current: number | null }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await setCreditTopupAction(fd);
      if (!r.ok) {
        toast({ title: "Couldn't save", description: r.error, variant: "danger" });
      } else {
        router.refresh();
        deferToast({ title: "Top-up logged", variant: "success" });
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <Field label="Credit top-up (USD)" className="flex-1 min-w-[160px]">
        <Input
          name="amountUsd"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          defaultValue={current != null ? String(current) : ""}
          placeholder="e.g. 50"
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Log top-up"}
      </Button>
    </form>
  );
}
