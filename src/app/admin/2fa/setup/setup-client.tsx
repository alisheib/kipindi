"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { provisionTotpAction, verifyTotpAction, removeTotpAction } from "./actions";
import QRCode from "qrcode";

export function TotpSetupClient({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [provisioning, setProvisioning] = useState<{ secretBase32: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const start = async () => {
    setBusy(true);
    try {
      const r = await provisionTotpAction();
      if (r.ok) {
        setProvisioning({ secretBase32: r.secretBase32, otpauthUrl: r.otpauthUrl });
        toast({ title: "QR ready", description: "Scan it with your authenticator app, then enter the 6-digit code below.", variant: "success" });
      } else {
        toast({ title: "Couldn't start setup", description: r.error, variant: "danger" });
      }
    } catch {
      toast({ title: "Couldn't start setup", description: "Something went wrong. Try again.", variant: "danger" });
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      toast({ title: "Enter 6 digits", variant: "warning" });
      return;
    }
    setBusy(true);
    try {
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
    } catch {
      toast({ title: "Verification failed", description: "Something went wrong. Try again.", variant: "danger" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      // Only flip the UI to "off" once the server confirms removal — otherwise
      // a rejected call would falsely tell the admin 2FA is gone while it's live.
      const r = await removeTotpAction();
      if (r.ok) {
        setEnabled(false);
        setProvisioning(null);
        setCode("");
        toast({ title: "2FA removed", description: "Re-enable it to keep your admin account safe.", variant: "warning" });
      } else {
        toast({ title: "Couldn't remove 2FA", description: r.error, variant: "danger" });
      }
    } catch {
      toast({ title: "Couldn't remove 2FA", description: "Something went wrong — 2FA is still active. Try again.", variant: "danger" });
    } finally {
      setBusy(false);
    }
  };

  if (enabled && !provisioning) {
    return (
      <div className="space-y-3">
        <p className="text-body-sm text-text-secondary">
          Two-factor authentication is enabled on this account. Codes refresh every 30 seconds.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="md" leading={<I.keyRound size={14} />} onClick={start} loading={busy}>
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
        <div className="rounded-md bg-bg-sunken/40 border border-border p-3 space-y-3">
          <p className="text-body-sm font-semibold text-text">1. Scan with your authenticator app</p>
          <QrImage url={provisioning.otpauthUrl} />
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
              className="w-40 h-12 px-3 rounded-md bg-bg-inset border border-border text-text font-mono text-title-sm tabular tracking-[0.2em] focus:outline-none admin-focus transition-colors"
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
      <Button variant="primary" size="lg" leading={<I.keyRound size={14} />} onClick={start} loading={busy}>
        Provision authenticator
      </Button>
    </div>
  );
}

function QrImage({ url }: { url: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(url, { width: 200, margin: 2, color: { dark: "#ffffffee", light: "#00000000" } })
      .then(setSrc)
      .catch(() => {});
  }, [url]);
  if (!src) return <div className="w-[200px] h-[200px] rounded-md bg-bg-overlay animate-pulse" />;
  return <img src={src} alt="TOTP QR code" width={200} height={200} className="rounded-md" />;
}
