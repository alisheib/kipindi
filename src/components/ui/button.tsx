/**
 * Button — kit-faithful (kit/atoms.jsx → Btn). Direct port: every variant
 * just composes the kit's `.btn` + `.btn-<variant>` + `.btn-<size>` classes
 * defined in globals.css. No bespoke gradients here — the kit owns the
 * shadow/text-shadow/inset stack.
 *
 * variants: primary (royal) · yes (emerald) · no (rose) · ghost · danger ·
 *           gold · claret · aqua-ghost · secondary (alias for ghost)
 * sizes:    sm 30 · md 38 · lg 46 · xl 56 (xl uses --r-lg radius)
 *
 * Adds: leading + trailing icon slots, loading state (spinner replaces
 * leading), fullWidth.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "primary"
  | "yes"
  | "no"
  | "ghost"
  | "danger"
  | "gold"
  | "claret"
  | "aqua-ghost"
  | "secondary"; // legacy alias
type Size = "sm" | "md" | "lg" | "xl";

const sizeCls: Record<Size, string> = {
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
  xl: "btn-xl",
};

const variantCls: Record<Variant, string> = {
  primary:      "btn-primary",
  yes:          "btn-yes",
  no:           "btn-no",
  ghost:        "btn-ghost",
  danger:       "btn-danger",
  gold:         "btn-gold",
  claret:       "btn-claret",
  "aqua-ghost": "btn-aqua-ghost",
  secondary:    "btn-ghost",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", leading, trailing, fullWidth, loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "btn",
        variantCls[variant],
        sizeCls[size],
        fullWidth && "w-full",
        loading && "cursor-progress",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={size} /> : leading}
      {children}
      {!loading && trailing}
    </button>
  );
});

function Spinner({ size }: { size: Size }) {
  const dim = size === "xl" ? 16 : size === "lg" ? 14 : size === "md" ? 13 : 12;
  return (
    <svg width={dim} height={dim} viewBox="0 0 24 24" className="animate-spin" style={{ animationDuration: "0.7s" }} aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
