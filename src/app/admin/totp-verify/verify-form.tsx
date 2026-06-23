"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { verifyAdminTotpAction } from "./actions";

export function TotpVerifyForm({ next }: { next?: string }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    if (!/^\d{6}$/.test(code)) {
      toast({ title: "Enter 6 digits", variant: "warning" });
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.set("code", code);
    if (next) fd.set("next", next);
    const r = await verifyAdminTotpAction(fd);
    if (r && !r.ok) {
      toast({ title: "Invalid code", description: r.error, variant: "danger" });
      setCode("");
      setBusy(false);
      return;
    }
    // success → redirect happens server-side
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && code.length === 6 && !busy) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="block text-caption uppercase tracking-[0.16em] font-bold text-text-secondary mb-1.5">
          6-digit code · Msimbo
        </span>
        <input
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={onKeyDown}
          placeholder="123 456"
          autoComplete="one-time-code"
          autoFocus
          aria-label="6-digit verification code"
          className="w-full h-14 px-4 rounded-md bg-surface border border-border text-text font-mono text-display-3 tabular tracking-[0.3em] text-center focus:outline-none admin-focus transition-colors"
        />
      </label>
      <Button
        type="button"
        variant="primary"
        size="xl"
        fullWidth
        leading={<I.shieldcheck s={16} />}
        onClick={submit}
        loading={busy}
        disabled={code.length !== 6}
      >
        Verify and continue · Endelea
      </Button>
    </div>
  );
}
