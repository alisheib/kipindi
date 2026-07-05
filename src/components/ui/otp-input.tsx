"use client";

/**
 * OtpInput — centered 6-digit one-time-code field. Shares the Input atom's
 * shell (sunken --bg-inset, rounded-lg, brand focus) with OTP-specific
 * defaults: numeric keypad, 6-char cap, one-time-code autofill, wide tracking.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export const OtpInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">
>(function OtpInput({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      pattern="\d{6}"
      maxLength={6}
      autoComplete="one-time-code"
      {...rest}
      className={cn(
        "w-full h-[52px] text-center font-mono font-semibold text-[20px] tracking-[0.3em] rounded-lg bg-bg-inset border border-border text-text outline-none transition-colors brand-focus placeholder:text-text-subtle",
        className,
      )}
    />
  );
});
