import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type Size = "sm" | "md" | "lg" | "xl";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-royal text-onBrand hover:bg-royal-hover active:bg-royal-active shadow-e1 hover:shadow-e2 disabled:bg-surface-disabled disabled:text-disabled disabled:shadow-e0",
  secondary:
    "border border-royal text-royal hover:bg-royal-subtle active:bg-royal-subtleHover disabled:border-border disabled:text-disabled",
  ghost:
    "text-royal hover:bg-royal-subtle active:bg-royal-subtleHover disabled:text-disabled",
  danger:
    "bg-danger text-onBrand hover:opacity-90 active:opacity-80 shadow-e1 disabled:bg-surface-disabled disabled:text-disabled",
  gold:
    "bg-gold text-gold-fg hover:bg-gold-hover active:bg-gold-active shadow-e1 hover:shadow-glow-gold disabled:bg-surface-disabled disabled:text-disabled",
};

const sizeClass: Record<Size, string> = {
  sm: "h-7 px-2 text-label",
  md: "h-9 px-3 text-label",
  lg: "h-10 px-4 text-body-sm font-semibold",
  xl: "h-11 px-5 text-body font-semibold",
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
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all duration-micro ease-standard whitespace-nowrap",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--border-focus)]",
        sizeClass[size],
        variantClass[variant],
        fullWidth && "w-full",
        loading && "opacity-70 cursor-progress",
        disabled && "cursor-not-allowed",
        className,
      )}
      {...rest}
    >
      {loading ? <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" /> : leading}
      {children}
      {trailing}
    </button>
  );
});
