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
import { normalizeTzLocalDigits } from "@/lib/phone-normalize";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "size"> & {
  size?: "sm" | "md" | "lg";
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

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

  /**
   * Count the DIGITS in the formatted string up to a caret offset.
   *
   * 🔴 THE BUG THIS FIXES. The old handler took `selectionStart` — an index into
   * the FORMATTED value, "712 345 678" — and sliced the RAW digits with it. Those
   * two strings only line up before the first space: paste into the middle of a
   * filled field and the splice landed one digit off for every space to its left,
   * so a corrected phone number silently became a different phone number. On a
   * withdrawal form that is the number the money goes to.
   */
  const digitsBefore = (formatted: string, caret: number) =>
    stripDigits(formatted.slice(0, caret)).length;

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text") ?? "";
    if (text === stripDigits(text)) return;       // already clean
    e.preventDefault();
    const cleaned = stripDigits(text);
    const target = e.currentTarget;
    const raw = stripDigits(target.value);
    const start = digitsBefore(target.value, target.selectionStart ?? target.value.length);
    const end = digitsBefore(target.value, target.selectionEnd ?? target.value.length);
    const merged = (raw.slice(0, start) + cleaned + raw.slice(end)).slice(0, 9);
    setV(merged);
    // ⛔ The old handler stopped at `setV`, so a CONTROLLED caller never heard
    // about a paste at all: its state kept the pre-paste number while the field
    // showed the pasted one. Same synthetic shape `handle` emits.
    const synthetic = { ...e, target: { ...target, value: merged, name: name ?? "" } };
    onChange?.(synthetic as unknown as React.ChangeEvent<HTMLInputElement>);
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
        /* 🔴 THE LEADING-DIGIT RULE LIVES HERE NOW, ON THE VISIBLE FIELD.
           It used to sit on the hidden input below as `pattern="[67]\d{8}"` — and
           a hidden input is *barred from constraint validation* per spec, so that
           attribute never ran. The rule the player was told about in
           `phoneInputTitle` ("…starting with 6 or 7") was, in fact, unenforced in
           the browser; only the server caught it, one round trip later.
           ⚠️ Written against the FORMATTED value, because that is what this input
           holds: "712 345 678". It now also enforces completeness, which the old
           `[0-9 ]{9,11}` did not — that one accepted "12 345 678" quite happily. */
        pattern="[67][0-9]{2} [0-9]{3} [0-9]{3}"
        title={t.common.phoneInputTitle}
        maxLength={11}
        mono
        prefix="+255"
        placeholder={visibleRest.placeholder ?? "712 345 678"}
        value={formatTzPhone(v)}
        onChange={handle}
        onPaste={handlePaste}
      />
      {/* Value carrier ONLY — the canonical raw 9 digits under the form's name.
          ⛔ No `required` / `pattern` here: both were inert (see above), and the
          appearance of validation where there is none is worse than none. The
          caller's own `required` reaches the VISIBLE input through `visibleRest`,
          which is where it can actually fire. */}
      {name && <input type="hidden" name={name} value={v} />}
    </>
  );
}

/**
 * Accept every shape the server's `tzPhone` accepts — `0…`, `255…`, `+255…` and
 * the bare 9 digits. The rule lives in `@/lib/phone-normalize` so this widget,
 * admin sign-in and any future caller cannot drift apart. See that file for the
 * defect this fixed.
 */
const stripDigits = normalizeTzLocalDigits;
