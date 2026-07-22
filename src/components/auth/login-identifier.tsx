"use client";

/**
 * LoginIdentifier — the player sign-in credential field with an aesthetic
 * Phone / Email switcher.
 *
 * A segmented control picks the method; the field below morphs to match:
 *   - Phone → the kit <PhoneInput> (mono, +255 prefix, digits-only, 9-digit cap,
 *     "712 345 678" grouping) — the SAME pretty control the admin sign-in uses.
 *   - Email → a plain email <Input> (email keyboard, no autocapitalise).
 * Label, placeholder and hint all swap with the method.
 *
 * Both modes submit under the SAME field name `identifier`, exactly what
 * `startLoginAction` → `resolveLoginIdentifier` expects: a literal `@` routes
 * to the email branch, anything else through `tzPhone` (which normalises a bare
 * 9-digit MSISDN to +255…). So there is NO server change — phone mode submits
 * the raw 9 digits (via PhoneInput's hidden input), email mode submits the address.
 */

import * as React from "react";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Method = "phone" | "email";

export function LoginIdentifier({
  defaultMethod = "phone",
  defaultValue = "",
  invalid = false,
}: {
  defaultMethod?: Method;
  defaultValue?: string;
  invalid?: boolean;
}) {
  const { t } = useT();
  const [method, setMethod] = React.useState<Method>(defaultMethod);

  // Split the round-tripped value so a refill lands in the right field.
  const isEmailDefault = defaultValue.includes("@");
  const emailDefault = isEmailDefault ? defaultValue : "";
  const phoneDefault = isEmailDefault ? "" : defaultValue;

  const options: { id: Method; label: string; icon: React.ReactNode }[] = [
    { id: "phone", label: t.auth.phone, icon: <I.smartphone s={15} /> },
    { id: "email", label: t.auth.email, icon: <I.mail s={15} /> },
  ];

  // Arrow keys move between the two segments (radiogroup semantics).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      setMethod((m) => (m === "phone" ? "email" : "phone"));
    }
  };

  return (
    <div className="space-y-3">
      {/* Method switcher */}
      <div
        role="radiogroup"
        aria-label={t.auth.signInMethod}
        onKeyDown={onKeyDown}
        className="grid grid-cols-2 gap-1 rounded-lg border border-border p-1"
        style={{ background: "var(--bg-inset)" }}
      >
        {options.map((o) => {
          const active = method === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setMethod(o.id)}
              className={cn(
                "brand-focus inline-flex h-10 items-center justify-center gap-2 rounded-md border text-[13.5px] font-display font-semibold transition-colors duration-100",
                active
                  ? "border-brand-500/60 bg-brand-500/15 text-brand-200"
                  : "border-transparent text-text-muted hover:text-text",
              )}
            >
              <span className={active ? "text-brand-300" : "text-text-subtle"} aria-hidden>{o.icon}</span>
              {o.label}
            </button>
          );
        })}
      </div>

      {/* Morphing field */}
      <div>
        <label
          htmlFor="identifier"
          className="block font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted mb-1.5"
        >
          {method === "phone" ? t.auth.phone : t.auth.emailLabel}
        </label>

        {method === "phone" ? (
          <PhoneInput
            key="phone"
            id="identifier"
            name="identifier"
            required
            autoComplete="tel-national"
            size="lg"
            defaultValue={phoneDefault}
            aria-invalid={invalid || undefined}
          />
        ) : (
          <Input
            key="email"
            id="identifier"
            name="identifier"
            type="email"
            required
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={254}
            size="lg"
            defaultValue={emailDefault}
            placeholder={t.auth.emailPlaceholder}
            aria-invalid={invalid || undefined}
          />
        )}

        <p className="mt-1.5 text-[11px] text-text-subtle">
          {method === "phone" ? t.common.phoneInputTitle : t.auth.emailSignInHint}
        </p>
      </div>
    </div>
  );
}
