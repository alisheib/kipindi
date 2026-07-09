"use client";

/**
 * SubmitButton — kit-faithful submit that flips to a "pending" label
 * + spinner while the parent <form action={serverAction}> is in flight.
 *
 * Why: server actions redirect on success which means React never
 * unmounts the page — but for the few hundred ms of network round-trip
 * the user gets no feedback. useFormStatus() gives us that cheaply.
 *
 * Also disables itself while pending so a double-click cannot fire two
 * register / login / withdraw / deposit submissions.
 *
 * Gold-discipline (micro-spec §1): gold is money-in / earned-money ONLY.
 * The default is therefore **primary** (royal) — auth, KYC, RG, source-of-funds
 * and other navigation-grade submits are royal. Only genuine money-in surfaces
 * (deposit) opt into `variant="gold"`.
 */

import { useFormStatus } from "react-dom";
import { useT } from "@/lib/i18n";
import { Spinner } from "./spinner";

type Props = {
  label: string;
  pendingLabel?: string;
  variant?: "gold" | "claret" | "primary" | "ghost";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

export function SubmitButton({
  label,
  pendingLabel,
  variant = "primary",
  size = "lg",
  className = "",
}: Props) {
  const { pending } = useFormStatus();
  const { t } = useT();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`btn btn-${variant} btn-${size} w-full inline-flex items-center justify-center gap-2 ${className}`}
    >
      {pending && <Spinner size={14} />}
      <span>{pending ? (pendingLabel ?? t.common.working) : label}</span>
    </button>
  );
}
