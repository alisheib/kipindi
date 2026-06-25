"use client";

/**
 * PasswordPair — renders password + confirm fields with real-time mismatch
 * feedback. Used on the registration form so users see "Passwords don't match"
 * before hitting submit.
 *
 * The confirm field uses a custom validity check so the browser blocks
 * form submission while the passwords don't match — no server round-trip
 * needed to catch this.
 */
import { useState, useRef, useEffect } from "react";
import { PasswordInput } from "@/components/ui/password-input";
import { Field } from "@/components/ui/input";

export function PasswordPair() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const confirmRef = useRef<HTMLInputElement>(null);
  const dirty = confirm.length > 0;
  const match = pw === confirm;

  // Sync custom validity so the browser blocks submit on mismatch
  useEffect(() => {
    confirmRef.current?.setCustomValidity(
      dirty && !match ? "Passwords don't match" : "",
    );
  }, [pw, confirm, dirty, match]);

  return (
    <>
      <Field label="Password · Nenosiri" hint="At least 8 characters.">
        <PasswordInput
          id="password"
          name="password"
          required
          autoComplete="new-password"
          minLength={8}
          size="lg"
          showStrength
          placeholder="••••••••"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
      </Field>

      <Field
        label="Confirm password · Thibitisha nenosiri"
        hint={
          dirty
            ? match
              ? <span className="text-yes-300">Passwords match · Nenosiri zinazolingana</span>
              : <span className="text-no-300">Passwords don&apos;t match · Nenosiri hazilingani</span>
            : undefined
        }
      >
        <PasswordInput
          ref={confirmRef}
          id="passwordConfirm"
          name="passwordConfirm"
          required
          autoComplete="new-password"
          minLength={8}
          size="lg"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>
    </>
  );
}
