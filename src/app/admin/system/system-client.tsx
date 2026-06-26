"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useDeferredToast, useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { Input, Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { verifyChainAction, updateSupportConfigAction, updatePlatformTimezoneAction } from "./actions";
import type { SupportConfig } from "@/lib/support-config";

const TIMEZONES = [
  { value: "Africa/Dar_es_Salaam", label: "Africa/Dar es Salaam (EAT, UTC+3)" },
  { value: "Africa/Nairobi",      label: "Africa/Nairobi (EAT, UTC+3)" },
  { value: "Africa/Lagos",        label: "Africa/Lagos (WAT, UTC+1)" },
  { value: "Africa/Johannesburg", label: "Africa/Johannesburg (SAST, UTC+2)" },
  { value: "Africa/Cairo",        label: "Africa/Cairo (EET, UTC+2)" },
  { value: "Africa/Casablanca",   label: "Africa/Casablanca (WET, UTC+0/+1)" },
  { value: "Asia/Dubai",          label: "Asia/Dubai (GST, UTC+4)" },
  { value: "Asia/Riyadh",         label: "Asia/Riyadh (AST, UTC+3)" },
  { value: "Asia/Kolkata",        label: "Asia/Kolkata (IST, UTC+5:30)" },
  { value: "Asia/Singapore",      label: "Asia/Singapore (SGT, UTC+8)" },
  { value: "Asia/Tokyo",          label: "Asia/Tokyo (JST, UTC+9)" },
  { value: "Asia/Shanghai",       label: "Asia/Shanghai (CST, UTC+8)" },
  { value: "Europe/London",       label: "Europe/London (GMT/BST, UTC+0/+1)" },
  { value: "Europe/Paris",        label: "Europe/Paris (CET, UTC+1/+2)" },
  { value: "Europe/Istanbul",     label: "Europe/Istanbul (TRT, UTC+3)" },
  { value: "America/New_York",    label: "America/New York (EST, UTC-5/-4)" },
  { value: "America/Chicago",     label: "America/Chicago (CST, UTC-6/-5)" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (PST, UTC-8/-7)" },
  { value: "America/Sao_Paulo",   label: "America/Sao Paulo (BRT, UTC-3)" },
  { value: "Australia/Sydney",    label: "Australia/Sydney (AEST, UTC+10/+11)" },
  { value: "Pacific/Auckland",    label: "Pacific/Auckland (NZST, UTC+12/+13)" },
  { value: "UTC",                 label: "UTC (Coordinated Universal Time)" },
];

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
  const { deferToast, toast } = useDeferredToast(pending);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await updateSupportConfigAction(fd);
      if (!r.ok) {
        toast({ title: "Couldn't update", description: r.error, variant: "danger" });
      } else {
        router.refresh();
        deferToast({ title: "Support info updated", variant: "success" });
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

export function TimezoneForm({ current }: { current: string }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useState(current);
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const changed = value !== current;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!value || !changed) return;
    const fd = new FormData();
    fd.set("timezone", value);
    start(async () => {
      const r = await updatePlatformTimezoneAction(fd);
      if (!r.ok) {
        toast({ title: "Invalid timezone", description: r.error, variant: "danger" });
      } else {
        router.refresh();
        deferToast({ title: "Timezone updated", variant: "success" });
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-3 flex-wrap">
      <div className="flex-1 min-w-[280px]">
        <Select
          name="timezone"
          value={value}
          onChange={setValue}
          options={TIMEZONES}
          placeholder="Select timezone…"
          size="xs"
        />
      </div>
      <Button type="submit" loading={pending} disabled={!changed || !value}>
        Set timezone
      </Button>
    </form>
  );
}
