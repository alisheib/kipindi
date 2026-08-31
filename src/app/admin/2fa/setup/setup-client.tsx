"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { provisionTotpAction, verifyTotpAction, removeTotpAction } from "./actions";
import QRCode from "qrcode";

export function TotpSetupClient({ initiallyEnabled, next }: { initiallyEnabled: boolean; next?: string }) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [provisioning, setProvisioning] = useState<{ secretBase32: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  // Step-up ceremony state (B-3): removing or rotating an existing secret needs
  // the CURRENT code + (for removal) a typed hard confirm, like the kill-switch.
  const [removeOpen, setRemoveOpen] = useState(false);
  const [reprovOpen, setReprovOpen] = useState(false);
  const [stepCode, setStepCode] = useState("");
  const { toast } = useToast();

  const start = async (currentCode?: string) => {
    setBusy(true);
    try {
      const fd = new FormData();
      if (currentCode) fd.set("code", currentCode);
      const r = await provisionTotpAction(fd);
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
        /* ⭐ DG-S-06 — and then TAKE THEM THERE. A toast says what is wrong; it does not move
           the cursor, and on a long form it can be off-screen from the field it describes.
           `r.field` is the address the action returned; `focusFirstInvalid` resolves it to the
           control and focuses it without racing a smooth scroll (§M6).
           ⚠️ `document.body` IS SAFE AS THE CONTAINER, and that was CHECKED rather than assumed —
           three ways. (a) This handler only runs from the `provisioning` branch, which is an
           early return, so the two step-up `ConfirmModal`s are not rendered at all while it is
           on screen. (b) `/admin/2fa/setup` is in the layout's TOTP_EXEMPT set, so
           `admin/layout.tsx:110-112` returns a bare `<main>` — no sidebar, no nav form beside it.
           (c) The only other `data-field="totp-code"` in `src/` is on a different route
           (`admin/totp-verify/verify-form.tsx:63`). Exactly one `[data-field]` exists
           document-wide when this fires, so the search cannot stray into another form's copy. */
        if (r && "field" in r && r.field) focusFirstInvalid(document.body, [r.field]);
      }
    } catch {
      toast({ title: "Verification failed", description: "Something went wrong. Try again.", variant: "danger" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (currentCode: string) => {
    setBusy(true);
    try {
      // Only flip the UI to "off" once the server confirms removal — otherwise
      // a rejected call would falsely tell the admin 2FA is gone while it's live.
      const fd = new FormData();
      fd.set("code", currentCode);
      const r = await removeTotpAction(fd);
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

  /* ⛔ DG-S-05 — NO `data-field` ON THIS ONE, ON PURPOSE, AND DO NOT ADD ONE.
     It is the obvious-looking home for the two step-up refusals ("Enter a valid current 6-digit
     code to re-provision / remove 2FA"), and an attribute here would be a wire with nothing on
     the other end: BOTH ceremonies below close their `ConfirmModal` before awaiting the action
     (L173-174, L199-200), and `Modal` returns null once closed (`modal.tsx:249`) — so this whole
     subtree is unmounted before the server answers and a `focusFirstInvalid` aimed at it would
     report `not-rendered` on every failure instead of taking anyone anywhere. The server keeps
     both refusals plain for the same reason; the argument is written out in full at
     `provisionTotpAction` in `actions.ts`.
     ⚠️ If these dialogs are ever held open across the mutation (`ConfirmModal` already takes
     `loading`), the control survives the round-trip and both halves become wireable — that is
     the remainder, and it is a control-flow change, not this row's.
     ⚠️ It is also ONE element shared by both modals, so an address here would name a control
     that can appear in two different ceremonies — a second reason to give it its own name
     rather than reusing `totp-code`, if it is ever wired at all. */
  const stepCodeInput = (
    <label className="block mt-3">
      <span className="block text-caption uppercase eyebrow font-bold text-text-secondary mb-1.5">
        Current 6-digit code
      </span>
      <input
        type="text"
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        value={stepCode}
        onChange={(e) => setStepCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="123 456"
        autoComplete="one-time-code"
        aria-label="Current 6-digit verification code"
        /* ⚠️ HEIGHT IS A LITERAL, not `h-11` — spacing is overridden (tailwind.config.ts:200-215)
           so `h-11` was 96px here while the identical field at L253 was `h-12` = 128px: the same
           control at two heights. 48px, matching the enrolment field. (`w-40` is NOT an
           overridden key — it is Tailwind's default 160px and is correct as written.) */
        className="w-40 h-[48px] px-3 rounded-md bg-bg-inset border border-border text-text font-mono text-title-sm tabular tracking-[0.2em] focus:outline-none admin-focus transition-colors"
      />
    </label>
  );

  if (enabled && !provisioning) {
    return (
      <div className="space-y-3">
        <p className="text-body-sm text-text-secondary">
          Two-factor authentication is enabled on this account. Codes refresh every 30 seconds.
        </p>
        {/* B-28 — the way back. An officer sent here by the enrolment gate used
            to finish set-up and… stay, with no path to where they were going.
            The next hop still passes through /admin/totp-verify (a fresh code
            proves possession), which itself round-trips this destination. */}
        {next && (
          <a href={next} className="btn btn-primary btn-md inline-flex items-center gap-1.5">
            Continue to where you were <I.chevronRight s={13} />
          </a>
        )}
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="md" leading={<I.keyRound s={14} />} onClick={() => { setStepCode(""); setReprovOpen(true); }} loading={busy}>
            Re-provision (new QR)
          </Button>
          <Button variant="danger" size="md" leading={<I.trash s={14} />} onClick={() => { setStepCode(""); setRemoveOpen(true); }} loading={busy}>
            Remove 2FA
          </Button>
        </div>

        {/* Hard-tier removal ceremony (B-3): current code + typed REMOVE, mirroring the kill-switch. */}
        <ConfirmModal
          open={removeOpen}
          onClose={() => setRemoveOpen(false)}
          onConfirm={() => {
            if (stepCode.length !== 6) { toast({ title: "Enter your current 6-digit code", variant: "warning" }); return; }
            setRemoveOpen(false);
            void remove(stepCode);
          }}
          title="Remove two-factor authentication"
          eyebrow="Step-up required"
          tone="claret"
          tier="hard"
          typedWord="REMOVE"
          confirmLabel="Remove 2FA"
          body={
            <div>
              <p>
                Removing 2FA takes the step-up gate off every privileged money action for this
                account. Prove possession of the current authenticator to continue.
              </p>
              {stepCodeInput}
            </div>
          }
        />

        {/* Rotation also needs the current code — a new QR replaces the old secret. */}
        <ConfirmModal
          open={reprovOpen}
          onClose={() => setReprovOpen(false)}
          onConfirm={() => {
            if (stepCode.length !== 6) { toast({ title: "Enter your current 6-digit code", variant: "warning" }); return; }
            setReprovOpen(false);
            void start(stepCode);
          }}
          title="Re-provision authenticator"
          eyebrow="Step-up required"
          tone="brand"
          confirmLabel="Generate new QR"
          body={
            <div>
              <p>
                A new QR replaces your current secret. Enter a valid code from the CURRENT
                authenticator first — after scanning, verify the new one to complete the swap.
              </p>
              {stepCodeInput}
            </div>
          }
        />
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
          {/* ⭐ DG-S-05/06 (2026-08-31) — `data-field` is the ADDRESS the server's refusal names.
              `verifyTotpAction` returns `fieldError("totp-code", …)`, and the handler hands that
              name to `focusFirstInvalid`, which is what turns "the code is wrong" into a cursor
              sitting in the box. ⛔ The two strings must match; a typo degrades to today's
              behaviour (a toast and no focus) rather than to a jump somewhere wrong. */}
          <label className="block" data-field="totp-code">
            <span className="block text-caption uppercase eyebrow font-bold text-text-secondary mb-1.5">
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
              /* ⚠️ LITERAL, not `h-12` (128px on the overridden scale) — see the step-up field
                 above. Both TOTP inputs are the same control and now the same height. */
              className="w-40 h-[48px] px-3 rounded-md bg-bg-inset border border-border text-text font-mono text-title-sm tabular tracking-[0.2em] focus:outline-none admin-focus transition-colors"
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
      <Button variant="primary" size="lg" leading={<I.keyRound s={14} />} onClick={() => start()} loading={busy}>
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
