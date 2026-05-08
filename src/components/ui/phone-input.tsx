"use client";

/**
 * PhoneInput — wraps the kit Input with a digits-only filter and a
 * 9-digit length cap so a Tanzanian local mobile number (after +255)
 * cannot ever contain letters, spaces, or symbols. Keeps the kit visual
 * (mono + +255 prefix) and works inside both controlled and uncontrolled
 * forms.
 *
 * Server-side validators still re-check the value — this component is
 * defensive UX, not the security gate.
 */

import * as React from "react";
import { Input } from "./input";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "size"> & {
  size?: "sm" | "md" | "lg";
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const DIGITS_ONLY = /\D+/g;

export function PhoneInput({ defaultValue, value, onChange, ...rest }: Props) {
  const [v, setV] = React.useState<string>(() => stripDigits(String(defaultValue ?? "")));

  // Keep controlled mode honoured when caller passes `value`.
  React.useEffect(() => {
    if (value !== undefined) setV(stripDigits(String(value)));
  }, [value]);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = stripDigits(e.target.value);
    e.target.value = cleaned;       // mutate so consumers see the cleaned value
    setV(cleaned);
    onChange?.(e);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text") ?? "";
    if (text === stripDigits(text)) return;       // already clean
    e.preventDefault();
    const cleaned = stripDigits(text);
    const target = e.target as HTMLInputElement;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const next = (target.value.slice(0, start) + cleaned + target.value.slice(end)).slice(0, 9);
    target.value = next;
    setV(next);
    onChange?.({ target } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <Input
      {...rest}
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      pattern="[0-9]{9}"
      maxLength={9}
      mono
      prefix="+255"
      placeholder={rest.placeholder ?? "712 345 678"}
      value={v}
      onChange={handle}
      onPaste={handlePaste}
    />
  );
}

function stripDigits(s: string): string {
  return s.replace(DIGITS_ONLY, "").slice(0, 9);
}
