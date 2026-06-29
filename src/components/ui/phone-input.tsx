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
import { useT } from "@/lib/i18n";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "size"> & {
  size?: "sm" | "md" | "lg";
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const DIGITS_ONLY = /\D+/g;

/**
 * Formats a 9-digit Tanzanian local number as "ABC DEF GHI" while
 * keeping the underlying form value as the raw 9 digits (so the server
 * receives the canonical shape).
 */
function formatTzPhone(digits: string): string {
  const d = digits.slice(0, 9);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

export function PhoneInput({ defaultValue, value, onChange, name, ...rest }: Props) {
  const { t } = useT();
  const [v, setV] = React.useState<string>(() => stripDigits(String(defaultValue ?? "")));

  // Keep controlled mode honoured when caller passes `value`.
  React.useEffect(() => {
    if (value !== undefined) setV(stripDigits(String(value)));
  }, [value]);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = stripDigits(e.target.value);
    setV(cleaned);
    // Synthesize a change event with the cleaned value for any outer listener.
    const synthetic = { ...e, target: { ...e.target, value: cleaned, name: name ?? "" } };
    onChange?.(synthetic as unknown as React.ChangeEvent<HTMLInputElement>);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text") ?? "";
    if (text === stripDigits(text)) return;       // already clean
    e.preventDefault();
    const cleaned = stripDigits(text);
    const target = e.target as HTMLInputElement;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const merged = (stripDigits(target.value).slice(0, start) + cleaned + stripDigits(target.value).slice(end)).slice(0, 9);
    setV(merged);
  };

  // The visible input must NOT carry the form name — otherwise it
  // submits the formatted "712 345 678" string. The hidden input below
  // owns the canonical name + raw-9-digit value.
  const { id, ...visibleRest } = rest;
  return (
    <>
      <Input
        {...visibleRest}
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        pattern="[0-9 ]{9,11}"
        maxLength={11}
        mono
        prefix="+255"
        placeholder={visibleRest.placeholder ?? "712 345 678"}
        value={formatTzPhone(v)}
        onChange={handle}
        onPaste={handlePaste}
      />
      {name && <input type="hidden" name={name} value={v} required pattern="[67]\d{8}" title={t.common.phoneInputTitle} />}
    </>
  );
}

function stripDigits(s: string): string {
  return s.replace(DIGITS_ONLY, "").slice(0, 9);
}
