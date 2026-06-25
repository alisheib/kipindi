"use client";

/**
 * ResendOtpButton — client wrapper around the resend-code form so we can
 * show a pending state (spinner + "Sending…") via useFormStatus. Without
 * this, the plain <button> inside a server-action <form> gives zero
 * visual feedback during the network round-trip, and a player on a slow
 * connection may fire multiple resend requests.
 */

import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/ui/spinner";

export function ResendOtpButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.14em] text-brand-300 hover:text-brand-200 transition-colors disabled:opacity-60 disabled:cursor-wait"
    >
      {pending && <Spinner size={11} />}
      {pending ? "Sending…" : "Resend code"}
    </button>
  );
}
