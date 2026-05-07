"use client";

/**
 * PhoneInput — kit-styled international phone field.
 *
 * Country-code <select> on the leading edge, mono digits-only input on
 * the trailing edge, single shared focus ring (aqua per kit). Posts the
 * raw national number under the form's `name` (default phone), and the
 * dial code under `name-cc` (default phone-cc) so the server can
 * normalise to E.164.
 *
 * Tanzania is the default country and sits at the top of the list.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const COUNTRIES = [
  { iso: "TZ", flag: "🇹🇿", dial: "+255", label: "Tanzania",  pattern: "[67]\\d{8}",         placeholder: "712 345 678" },
  { iso: "KE", flag: "🇰🇪", dial: "+254", label: "Kenya",     pattern: "(7|1)\\d{8}",        placeholder: "712 345 678" },
  { iso: "UG", flag: "🇺🇬", dial: "+256", label: "Uganda",    pattern: "7\\d{8}",            placeholder: "712 345 678" },
  { iso: "RW", flag: "🇷🇼", dial: "+250", label: "Rwanda",    pattern: "7\\d{8}",            placeholder: "788 123 456" },
  { iso: "GB", flag: "🇬🇧", dial: "+44",  label: "UK",        pattern: "7\\d{9}",            placeholder: "7700 900 123" },
  { iso: "US", flag: "🇺🇸", dial: "+1",   label: "US/Canada", pattern: "\\d{10}",            placeholder: "415 555 0100" },
  { iso: "AE", flag: "🇦🇪", dial: "+971", label: "UAE",       pattern: "5\\d{8}",            placeholder: "50 123 4567" },
  { iso: "IN", flag: "🇮🇳", dial: "+91",  label: "India",     pattern: "[6-9]\\d{9}",        placeholder: "98765 43210" },
] as const;

type Iso = typeof COUNTRIES[number]["iso"];

export function PhoneInput({
  name = "phone",
  ccName,
  defaultIso = "TZ",
  defaultValue = "",
  required,
  size = "lg",
  autoComplete = "tel",
  ariaLabel = "Phone number",
}: {
  name?: string;
  ccName?: string;
  defaultIso?: Iso;
  defaultValue?: string;
  required?: boolean;
  size?: "md" | "lg";
  autoComplete?: string;
  ariaLabel?: string;
}) {
  const [iso, setIso] = useState<Iso>(defaultIso);
  const country = COUNTRIES.find((c) => c.iso === iso) ?? COUNTRIES[0];
  const heightCls = size === "lg" ? "h-12" : "h-11";
  const fontCls = size === "lg" ? "text-[15px]" : "text-[14px]";

  return (
    <span
      className={`flex items-stretch overflow-hidden rounded-md border border-border bg-bg-overlay focus-within:border-aqua-300 focus-within:shadow-[0_0_0_3px_var(--aqua-glow)] transition-colors ${heightCls}`}
    >
      <span className="relative inline-flex items-center">
        <select
          aria-label="Country code"
          value={iso}
          onChange={(e) => setIso(e.target.value as Iso)}
          className={`appearance-none bg-bg-elevated border-r border-border pl-3 pr-8 ${fontCls} font-mono text-text outline-none cursor-pointer`}
        >
          {COUNTRIES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.flag} {c.dial}  {c.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={12}
          aria-hidden
          className="pointer-events-none absolute right-2 text-text-subtle"
        />
        <input type="hidden" name={ccName ?? `${name}-cc`} value={country.dial} />
      </span>
      <input
        name={name}
        type="tel"
        inputMode="numeric"
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        pattern={country.pattern}
        placeholder={country.placeholder}
        aria-label={ariaLabel}
        className={`flex-1 min-w-0 bg-transparent px-3 ${fontCls} font-mono tabular-nums text-text outline-none placeholder:text-text-subtle`}
      />
    </span>
  );
}
