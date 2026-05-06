/**
 * Input atom — kit-faithful (kit/atoms.jsx → Input).
 * - prefix slot (e.g. "TZS", "+255") locked in a sub-cell with a divider
 * - mono variant (font-mono + tabular-nums) for amounts + numeric input
 * - error state — red border + tinted background
 * - controlled OR uncontrolled (defaultValue + value both supported)
 * - kit "input-group" semantic — works as a child of <label>
 */
import * as React from "react";
import { cn } from "@/lib/utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  prefix?: React.ReactNode;
  trailing?: React.ReactNode;
  mono?: boolean;
  error?: boolean | string;
  /** sm 36 · md 44 · lg 48 */
  size?: "sm" | "md" | "lg";
  containerClassName?: string;
};

const heightCls: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-9",
  md: "h-11",
  lg: "h-12",
};

const fontCls: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-[13px]",
  md: "text-[14px]",
  lg: "text-[15px]",
};

export const Input = React.forwardRef<HTMLInputElement, Props>(function Input(
  { prefix, trailing, mono, error, size = "md", className, containerClassName, ...rest },
  ref,
) {
  const errored = !!error;
  return (
    <span
      className={cn(
        "flex items-stretch rounded-md border bg-bg-overlay overflow-hidden focus-within:border-teal-300 transition-colors",
        heightCls[size],
        errored ? "border-no-500" : "border-border",
        containerClassName,
      )}
    >
      {prefix !== undefined && (
        <span
          className={cn(
            "inline-flex items-center px-3 bg-bg-elevated border-r border-border font-mono text-text-muted shrink-0",
            fontCls[size],
          )}
        >
          {prefix}
        </span>
      )}
      <input
        ref={ref}
        {...rest}
        className={cn(
          "flex-1 min-w-0 bg-transparent px-3 text-text outline-none placeholder:text-text-subtle",
          mono && "font-mono tabular-nums",
          fontCls[size],
          className,
        )}
      />
      {trailing !== undefined && (
        <span
          className={cn(
            "inline-flex items-center px-3 bg-bg-elevated border-l border-border font-mono text-text-subtle shrink-0",
            fontCls[size],
          )}
        >
          {trailing}
        </span>
      )}
    </span>
  );
});

/** Field label + Input + hint shorthand. */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted mb-1.5">
        {label}
      </span>
      {children}
      {error ? (
        <p className="mt-1.5 text-[11px] text-no-300">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[11px] text-text-subtle">{hint}</p>
      ) : null}
    </label>
  );
}
