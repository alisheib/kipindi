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
 */

import { useFormStatus } from "react-dom";
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
  pendingLabel = "Working…",
  variant = "gold",
  size = "lg",
  className = "",
}: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`btn btn-${variant} btn-${size} w-full inline-flex items-center justify-center gap-2 ${className}`}
    >
      {pending && <Spinner size={14} />}
      <span>{pending ? pendingLabel : label}</span>
    </button>
  );
}
