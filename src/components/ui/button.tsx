/**
 * Button — kit-faithful (kit/atoms.jsx → Btn).
 * 6 variants × 4 sizes. Tokens only — no hardcoded oklch outside the gold
 * gradient (which uses --gold-* directly, theme-adaptive automatically).
 *
 * variants: primary (teal) · yes (emerald) · no (rose) · ghost · danger · gold
 * sizes:    sm 30 · md 38 · lg 46 · xl 56 (xl uses --r-lg radius)
 *
 * Adds: leading + trailing icon slots, loading state (spinner replaces leading),
 * fullWidth, focus-visible ring (--teal-300, 2px offset).
 */
import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "yes" | "no" | "ghost" | "danger" | "gold" | "secondary";
type Size = "sm" | "md" | "lg" | "xl";

const sizeClass: Record<Size, string> = {
  sm: "h-[30px] px-3 text-[13px] rounded-md",
  md: "h-[38px] px-4 text-[14px] rounded-md",
  lg: "h-[46px] px-5 text-[15px] rounded-md",
  xl: "h-[56px] px-6 text-[16px] rounded-lg",
};

const variantClass: Record<Variant, string> = {
  primary:
    "bg-teal-500 text-white hover:bg-teal-400 disabled:bg-bg-overlay disabled:text-text-subtle",
  yes:
    "bg-yes-500 text-yes-950 font-bold hover:bg-yes-400 disabled:bg-bg-overlay disabled:text-text-subtle",
  no:
    "bg-no-500 text-white font-bold hover:bg-no-400 disabled:bg-bg-overlay disabled:text-text-subtle",
  ghost:
    "bg-transparent text-text border border-border hover:bg-bg-overlay hover:border-border-strong disabled:text-text-subtle",
  // Legacy alias — many existing call sites use 'secondary'; map to ghost.
  secondary:
    "bg-transparent text-text border border-border hover:bg-bg-overlay hover:border-border-strong disabled:text-text-subtle",
  danger:
    "bg-danger-500 text-white hover:brightness-110 disabled:bg-bg-overlay disabled:text-text-subtle",
  gold:
    "text-gold-fg font-bold border bg-gradient-to-b from-gold-400 to-gold-600 border-gold-700 shadow-[0_1px_0_oklch(95%_0.08_80)_inset] hover:from-gold-300 hover:to-gold-500 disabled:from-bg-overlay disabled:to-bg-overlay disabled:text-text-subtle disabled:border-border disabled:shadow-none",
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
        "inline-flex items-center justify-center gap-2 font-display whitespace-nowrap",
        "transition-all duration-100 ease-out",
        "active:translate-y-px",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0",
        sizeClass[size],
        variantClass[variant],
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
    <svg width={dim} height={dim} viewBox="0 0 24 24" className="animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
