"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
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
    // B-28 — a transport failure here used to wedge a PERMANENT spinner (the
    // await threw, setBusy(false) never ran, and the redirect-on-success path
    // masked it). Catch → release the button so the officer can retry.
    let r: Awaited<ReturnType<typeof verifyAdminTotpAction>>;
    try {
      r = await verifyAdminTotpAction(fd);
    } catch (err) {
      // NEXT_REDIRECT is the SUCCESS path (server-side redirect) — rethrow it.
      if (err && typeof err === "object" && String((err as { digest?: string }).digest ?? "").startsWith("NEXT_REDIRECT")) throw err;
      toast({ title: "Couldn't verify", description: "Network hiccup — nothing was applied. Try again.", variant: "danger" });
      setBusy(false);
      return;
    }
    if (r && !r.ok) {
      toast({ title: "Invalid code", description: r.error, variant: "danger" });
      setCode("");
      setBusy(false);
      /* ⭐ DG-S-05/06 — and then TAKE THEM THERE. The field is cleared above, so without this
         the officer reads a toast and the caret is still wherever it was. `r.field` is the
         address the action returned; it is absent on the rate-limit refusal, which is correct
         — there is no field to go to when the answer is "wait". */
      if ("field" in r && r.field) focusFirstInvalid(document.body, [r.field]);
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
      {/* ⭐ DG-S-05/06 — `data-field` is the ADDRESS the server's refusal names. The wrapper
          carries it, not the <input>, so `focusFirstInvalid` can find the field in document
          order and then focus whatever control it contains (§K rule 7d). */}
      <label className="block" data-field="totp-code">
        <span className="block text-caption uppercase eyebrow font-bold text-text-secondary mb-1.5">
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
          className="w-full h-14 px-4 rounded-md bg-bg-inset border border-border text-text font-mono text-display-3 tabular tracking-[0.3em] text-center focus:outline-none admin-focus transition-colors"
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
