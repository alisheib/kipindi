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
 * Gold-discipline: the default is **primary** (royal) — auth, KYC, RG, source-of-funds
 * and other navigation-grade submits are royal.
 * ⛔ THERE IS NO `gold` (R5-C, the second gold audit, 2026-10-09). It was offered for
 * "genuine money-in surfaces (deposit)" — a micro-spec's reading (record, not rule) that
 * DESIGN_AUTHORITY §M3a D1 overturned: "a deposit or a withdrawal commit is brand — not
 * gold". It had ZERO call sites; out of the union, as Toggle's `gold` went, so no submit
 * can ask for it. A bet or a sell commits through its own confirm, never through this atom.
 */

import { useFormStatus } from "react-dom";
import { useT } from "@/lib/i18n";
import { Spinner } from "./spinner";

type Props = {
  label: string;
  pendingLabel?: string;
  variant?: "claret" | "primary" | "ghost";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Refuse the action outright, independently of the pending state — e.g. withdraw while
   *  payouts cannot be paid. The atom had no way to express this, so callers that needed a
   *  non-submittable form had to leave a live button beside a disabled fieldset. */
  disabled?: boolean;
  /** B-20 — leading glyph slot (the sessions sign-out wears `I.logOut`). The
   *  spinner REPLACES the icon while pending, so the row never grows. */
  icon?: React.ReactNode;
  /** Default true (the historical shape). Inline placements (e.g. a row-end
   *  destructive button) opt out. */
  fullWidth?: boolean;
  /** Inline style pass-through — for the claret text on destructive ghosts,
   *  where a class cannot beat `.btn-ghost`'s own `color: var(--text)`. */
  style?: React.CSSProperties;
  /** In flight, as the caller knows it. `useFormStatus()` sees only a submission made through the form's
   *  own `action`; a form submitted through `onSubmit` + `startTransition` (the sign-up form, so React's
   *  form reset never runs) passes its `useActionState` `isPending` here. Either one makes it pending. */
  pending?: boolean;
};

export function SubmitButton({
  label,
  pendingLabel,
  variant = "primary",
  size = "lg",
  className = "",
  disabled = false,
  icon,
  fullWidth = true,
  style,
  pending: pendingProp,
}: Props) {
  const { pending: formPending } = useFormStatus();
  const pending = formPending || pendingProp === true;
  const { t } = useT();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      style={style}
      className={`btn btn-${variant} btn-${size} ${fullWidth ? "w-full " : ""}inline-flex items-center justify-center gap-2 ${className}`}
    >
      {pending ? <Spinner size={14} /> : icon}
      <span>{pending ? (pendingLabel ?? t.common.working) : label}</span>
    </button>
  );
}
