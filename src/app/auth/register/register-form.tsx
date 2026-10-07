"use client";

/**
 * THE SIGN-UP FORM, HELD BY THE CLIENT SO A REFUSAL LOSES NOTHING (route audit C1 / C2 / C3 / C-X1, 2026-10-06).
 *
 * 🔴 THE REMOUNT, MEASURED. Every refusal used to be an action redirect back to `/auth/register?error=…`, and Next
 * remounts the page after an action redirect: the date of birth, both passwords and all three ticks came back EMPTY
 * (the SMS-offers tick silently), while the phone and the email rode back in the URL. ⭐ Now the action RETURNS the
 * refusal (`refusal.ts`) to THIS still-mounted form through `useActionState`: nothing is restored because nothing is
 * lost, and nothing personal rides in a URL.
 *
 * ⛔ WHY `onSubmit`, AND WHY `action` STAYS. React 19 RESETS a form once an action passed as its `action` completes
 * (the automatic form reset), which would empty the very fields this file exists to keep. Submitting through
 * `onSubmit` + `preventDefault()` + `startTransition(() => formAction(fd))` never runs that reset. `action={formAction}`
 * stays beside it: it is what a browser without the script posts. ⛔ No `noValidate`: the browser's own checks still
 * run before `onSubmit` fires.
 *
 * ⛔ THE LANGUAGE RULE: NO `useT()` IN THIS FILE. Every sentence arrives in `copy`, drawn by the server in the language
 * the page was drawn in - the language the hidden `shownLocale` field posts, so the consent sentence the ledger stores
 * is the one on screen (actions.ts `shownLocale`). A client lookup could disagree with it once the language provider
 * rewrites the cookie. The refusal's own reason is worded from the registry (`copy.reasons`), never the server's
 * English sentence: "That password is in the public breach list" reached Swahili and Chinese players here (C-X1).
 *
 * ⭐ THE SCROLL. The panel sits ABOVE the form and the player submitted from its bottom, so a refusal brings the panel
 * into view at once (instant: a smooth scroll on a slow phone lands late). `key={refusal.at}` makes each refusal a new
 * panel, so the same refusal twice is announced twice (role="alert") and a new wait counts down from its own start.
 */
import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { PasswordPair } from "@/components/auth/password-pair";
import { DateSelect } from "@/components/ui/date-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { RateLimitBanner } from "@/components/auth/rate-limit-banner";
import { startRegisterAction } from "./actions";
import { refusalField, type RegisterInvalidReason } from "./refusal";

/** Every sentence the form can show, in the language the page was drawn in (page.tsx builds it from the dictionary). */
export type RegisterCopy = {
  phone: string;
  phoneHint: string;
  email: string;
  emailHint: string;
  emailPlaceholder: string;
  dob: string;
  dobHint: string;
  age18Confirm: string;
  termsAccept: string;
  optionalUpdates: string;
  terms: string;
  privacy: string;
  responsibleGambling: string;
  submit: string;
  submitting: string;
  signIn: string;
  accountExists: string;
  accountExistsBody: string;
  emailExists: string;
  emailExistsBody: string;
  tooManyTries: string;
  tooManyTriesBody: string;
  couldNotCreate: string;
  checkFormFields: string;
  /** The registry's sentence for each reason the service names (`t.error` through `bannerFor`). */
  reasons: Record<RegisterInvalidReason, string>;
};

export function RegisterForm({
  copy,
  phoneDefault,
  emailDefault,
  nextOk,
  dobMax,
  children,
}: {
  copy: RegisterCopy;
  phoneDefault: string;
  emailDefault: string;
  /** The safe destination after sign-up, or "" - the panel's sign-in links carry it. */
  nextOk: string;
  /** The latest birth date an adult can have today, YYYY-MM-DD. */
  dobMax: string;
  /** The page's hidden fields (shownLocale, ref, invite, next) and the read-only referral code: first in the form. */
  children?: ReactNode;
}) {
  const [refusal, formAction, isPending] = useActionState(startRegisterAction, null);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (refusal) panelRef.current?.scrollIntoView({ block: "center" });
  }, [refusal]);
  const bad = refusalField(refusal);
  const nextQs = nextOk ? `&next=${encodeURIComponent(nextOk)}` : "";

  const errorPanel = (() => {
    if (!refusal) return null;
    if (refusal.code === "exists") {
      return {
        tone: "warning" as const,
        title: copy.accountExists,
        body: copy.accountExistsBody,
        cta: { href: `/auth/login?phone=${encodeURIComponent(refusal.phone)}${nextQs}`, label: copy.signIn },
      };
    }
    // A duplicate EMAIL is a different problem with a different remedy from a
    // duplicate PHONE, and conflating them sent the player to sign in with a
    // phone that has no account — an endless loop with the real cause never
    // stated. Point them at the address, and at password recovery.
    if (refusal.code === "email_exists") {
      return {
        tone: "warning" as const,
        title: copy.emailExists,
        body: copy.emailExistsBody,
        cta: { href: `/auth/login?identifier=${encodeURIComponent(refusal.email)}${nextQs}`, label: copy.signIn },
      };
    }
    // C2 · the real wait, counting down; without one, the sentence that says to wait.
    if (refusal.code === "rate_limited") {
      return {
        tone: "warning" as const,
        title: copy.tooManyTries,
        body: refusal.retryAfterSec ? <RateLimitBanner seconds={refusal.retryAfterSec} /> : copy.tooManyTriesBody,
        cta: null,
      };
    }
    // ⛔ The registry's sentence for the reason, in the page's language — never the server's English.
    return {
      tone: "danger" as const,
      title: copy.couldNotCreate,
      body: (refusal.reason && copy.reasons[refusal.reason]) || copy.checkFormFields,
      cta: null,
    };
  })();

  return (
    <>
      {refusal && errorPanel && (
        <div
          key={refusal.at}
          ref={panelRef}
          data-refusal={refusal.code}
          role="alert"
          className={
            "flex items-start gap-2.5 rounded-md border px-3.5 py-3 " +
            /* D2 (2026-08-21): `--danger-*`, not `--no-*`. Twin of
               auth/login/page.tsx — keep the two in step. */
            (errorPanel.tone === "danger"
              ? "border-danger-500/45 bg-danger-500/[0.10]"
              : "border-warning-border bg-warning-bg")
          }
        >
          <span className={"mt-0.5 shrink-0 " + (errorPanel.tone === "danger" ? "text-danger-fg" : "text-gold-300")}>
            <I.alertCircle s={16} />
          </span>
          <div className="text-body-sm leading-snug">
            <p className="font-display font-semibold text-text">{errorPanel.title}</p>
            <p className="mt-0.5 text-text-muted">{errorPanel.body}</p>
            {errorPanel.cta && (
              <Link
                href={errorPanel.cta.href as never}
                /* ⚠️ LITERAL, not `h-9` — spacing is overridden (tailwind.config.ts:200-215),
                   so `h-9` was a 64px capsule around 12.5px type. 40px = --tap-min. */
                className="mt-2 inline-flex h-[40px] items-center px-3.5 rounded-pill border border-gold-700 bg-gold-500/10 font-display font-bold text-[12.5px] text-gold-300 hover:bg-gold-500/20 transition-colors"
              >
                {errorPanel.cta.label} →
              </Link>
            )}
          </div>
        </div>
      )}

      <form
        action={formAction}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => formAction(fd));
        }}
        className="space-y-4"
      >
        {children}
        <Field label={copy.phone} hint={copy.phoneHint}>
          <PhoneInput
            id="phone"
            name="phone"
            required
            defaultValue={phoneDefault}
            size="lg"
            error={bad === "phone"}
          />
        </Field>

        {/* Email is REQUIRED at sign-up: it is where the confirmation link and
            every deposit receipt go, and confirming it is what unlocks the
            first deposit. `type="email"` gives mobile keyboards the right
            layout and the browser its own format check before submit; the
            server re-validates with the same `emailAddress` schema regardless. */}
        <Field label={copy.email} hint={copy.emailHint}>
          <Input
            id="email"
            name="email"
            type="email"
            required
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={254}
            defaultValue={emailDefault}
            placeholder={copy.emailPlaceholder}
            size="lg"
            error={bad === "email"}
          />
        </Field>

        <Field label={copy.dob} hint={copy.dobHint}>
          <DateSelect
            name="dob"
            id="dob"
            required
            min="1930-01-01"
            max={dobMax}
          />
        </Field>

        <PasswordPair />

        {/* 2026-09-13: a COLUMN, not vertical margins. Each Checkbox label is inline-flex, so
            in Chinese two short consents fit and sat side by side on one line. `items-start`
            keeps each tap area on its own words rather than the full row width. */}
        {/* ⛔ No box is ever pre-ticked, and a refusal never ticks one: the form stays mounted, so each box holds
            exactly what the player did (test:marketing-consent-ledger 7g). */}
        <fieldset className="flex flex-col items-start gap-[10px] pt-1">
          <Checkbox
            name="acceptAge"
            required
            label={<span className="text-[13px] text-text-muted">{copy.age18Confirm}</span>}
          />
          <Checkbox
            name="acceptTerms"
            required
            label={<span className="text-[13px] text-text-muted">{copy.termsAccept}</span>}
          />
          <Checkbox
            name="marketingOptIn"
            label={<span className="text-[13px] text-text-muted">{copy.optionalUpdates}</span>}
          />
          {/* The binding documents must be reachable at the consent point. */}
          {/* No separator dots in the flow: on a phone the row wraps, and a dot ends up stranded at a line start
              or end either way (visual passes 2 and 2b). The gap separates the three links instead. */}
          <p className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5 text-body-sm text-text-subtle">
            <Link href={"/legal/terms" as never} className="whitespace-nowrap text-brand-300 underline-offset-2 hover:underline">{copy.terms}</Link>
            <Link href={"/legal/privacy" as never} className="whitespace-nowrap text-brand-300 underline-offset-2 hover:underline">{copy.privacy}</Link>
            <Link href={"/legal/responsible-gambling" as never} className="whitespace-nowrap text-brand-300 underline-offset-2 hover:underline">{copy.responsibleGambling}</Link>
          </p>
        </fieldset>

        <SubmitButton label={copy.submit} pendingLabel={copy.submitting} pending={isPending} />
      </form>
    </>
  );
}
