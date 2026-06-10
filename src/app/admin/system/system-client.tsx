"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { Input, Field } from "@/components/ui/input";
import { verifyChainAction, updateSupportConfigAction } from "./actions";
import type { SupportConfig } from "@/lib/support-config";

export function SystemActions({ kind }: { kind: "verify-chain" }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { toast } = useToast();
  const click = async () => {
    setLoading(true);
    try {
      const r = await verifyChainAction();
      if (r.valid) {
        setResult("Chain valid · all entries pass HMAC verification");
        toast({ title: "Chain valid", description: "Every audit entry verifies", variant: "success" });
      } else {
        setResult(`Chain broken at ${r.firstBreakAt} (index ${r.index})`);
        toast({ title: "Chain broken", description: `First break: ${r.firstBreakAt}`, variant: "danger" });
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-2">
      <Button variant="primary" size="lg" leading={<I.shieldcheck s={14} />} onClick={click} loading={loading}>
        Verify audit chain
      </Button>
      {result && (
        <p className="text-caption flex items-center gap-1.5 text-text-secondary">
          {result.startsWith("Chain valid") ? <I.checkCircle size={12} className="text-success" /> : <I.warning s={12} />}
          {result}
        </p>
      )}
    </div>
  );
}

export function SupportConfigForm({ config }: { config: SupportConfig }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await updateSupportConfigAction(fd);
      if (!r.ok) {
        toast({ title: "Couldn't update", description: r.error, variant: "danger" });
      } else {
        toast({ title: "Support info updated", variant: "success" });
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Support email" hint="Shown on help, login, legal, KYC pages">
          <Input name="email" defaultValue={config.email} required />
        </Field>
        <Field label="Support phone" hint="E.g. +255 22 211 5811">
          <Input name="phone" defaultValue={config.phone} />
        </Field>
        <Field label="Helpline number" hint="Shown in every page footer">
          <Input name="helpline" defaultValue={config.helpline} />
        </Field>
      </div>
      <Button type="submit" variant="yes" loading={pending}>
        Save · Hifadhi
      </Button>
    </form>
  );
}
