"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { I } from "@/components/ui/glyphs";
import { Spinner } from "@/components/ui/spinner";
import { closeAccountAction } from "./actions";

/** Pending-aware confirm button — disabled until the phrase matches AND while
 *  the irreversible close action is in flight, so it can never fire twice. */
function CloseButton({ canSubmit }: { canSubmit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!canSubmit || pending}
      aria-busy={pending}
      className="btn btn-claret btn-md inline-flex items-center gap-1.5"
    >
      {pending ? <Spinner size={13} /> : <I.alertOctagon s={13} />}
      {pending ? "Closing…" : "Permanently close my account"}
    </button>
  );
}

export function CloseAccountForm() {
  const [confirm, setConfirm] = useState("");
  const canSubmit = confirm.trim() === "CLOSE MY ACCOUNT";
  return (
    <form action={closeAccountAction} className="space-y-3">
      <label className="block">
        <span className="block font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle mb-1.5">
          Reason (optional) · Sababu
        </span>
        <textarea
          name="reason"
          rows={2}
          maxLength={500}
          placeholder="Help us improve — what made you leave?"
          className="w-full p-3 rounded-md border border-border bg-bg-overlay text-text text-[13px] focus:outline-none brand-focus transition-colors"
        />
      </label>
      <label className="block">
        <span className="block font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle mb-1.5">
          Type <span className="font-mono text-no-300">CLOSE MY ACCOUNT</span> to confirm
        </span>
        <input
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full h-10 px-3 rounded-md border border-border bg-bg-overlay font-mono text-[13px] tabular-nums text-text focus:outline-none focus:border-no-700 focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--no-500)_25%,transparent)] transition-colors"
          autoComplete="off"
        />
      </label>
      <CloseButton canSubmit={canSubmit} />
    </form>
  );
}
