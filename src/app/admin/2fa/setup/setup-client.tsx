"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ShieldCheck, Trash2, KeyRound } from "lucide-react";
import { I } from "@/components/ui/glyphs";
import { provisionTotpAction, verifyTotpAction, removeTotpAction } from "./actions";

export function TotpSetupClient({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [provisioning, setProvisioning] = useState<{ secretBase32: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const start = async () => {
    setBusy(true);
    const r = await provisionTotpAction();
    if (r.ok) {
      setProvisioning({ secretBase32: r.secretBase32, otpauthUrl: r.otpauthUrl });
      toast({ title: "QR ready", description: "Scan it with your authenticator app, then enter the 6-digit code below.", variant: "success" });
    }
    setBusy(false);
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      toast({ title: "Enter 6 digits", variant: "warning" });
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.set("code", code);
    const r = await verifyTotpAction(fd);
    if (r?.ok) {
      setEnabled(true);
      setProvisioning(null);
      setCode("");
      toast({ title: "2FA enabled", description: "You'll be asked for the code on next admin sign-in.", variant: "success" });
    } else {
      toast({ title: "Code didn't match", description: r?.error, variant: "danger" });
    }
    setBusy(false);
  };

  const remove = async () => {
    setBusy(true);
    await removeTotpAction();
    setEnabled(false);
    setProvisioning(null);
    setCode("");
    toast({ title: "2FA removed", description: "Re-enable it to keep your admin account safe.", variant: "warning" });
    setBusy(false);
  };

  if (enabled && !provisioning) {
    return (
      <div className="space-y-3">
        <p className="text-body-sm text-text-secondary">
          Two-factor authentication is enabled on this account. Codes refresh every 30 seconds.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="md" leading={<KeyRound size={14} />} onClick={start} loading={busy}>
            Re-provision (new QR)
          </Button>
          <Button variant="danger" size="md" leading={<I.trash s={14} />} onClick={remove} loading={busy}>
            Remove 2FA
          </Button>
        </div>
      </div>
    );
  }

  if (provisioning) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-bg-sunken/40 border border-border p-3 space-y-2">
          <p className="text-body-sm font-semibold text-text">1. Scan with your authenticator app</p>
          <p className="text-caption text-text-secondary break-all font-mono">{provisioning.otpauthUrl}</p>
          <p className="text-caption text-text-tertiary">
            Or enter the secret manually:{" "}
            <span className="font-mono text-text">{provisioning.secretBase32.match(/.{1,4}/g)?.join(" ")}</span>
          </p>
        </div>
        <div className="space-y-2">
          <label className="block">
            <span className="block text-caption uppercase tracking-[0.14em] font-bold text-text-secondary mb-1.5">
              2. Enter the 6-digit code
            </span>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123 456"
              autoComplete="one-time-code"
              aria-label="6-digit verification code"
              className="w-40 h-12 px-3 rounded-md bg-surface border border-border text-text font-mono text-title-sm tabular tracking-[0.2em] focus:outline-none focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)] transition-colors"
            />
          </label>
          <Button variant="primary" size="lg" leading={<I.shieldcheck s={14} />} onClick={verify} loading={busy} disabled={code.length !== 6}>
            Verify and enable
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-body-sm text-text-secondary">
        Click below to provision a new QR code. Scan it with Google Authenticator, Authy, 1Password, or Bitwarden.
      </p>
      <Button variant="primary" size="lg" leading={<KeyRound size={14} />} onClick={start} loading={busy}>
        Provision authenticator
      </Button>
    </div>
  );
}
