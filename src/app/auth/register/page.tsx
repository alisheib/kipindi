import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { Checkbox } from "@/components/ui/checkbox";
import { FiftyMark } from "@/components/brand";
import { AuthShell } from "@/components/auth/auth-shell";
import { Field, Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { PasswordPair } from "@/components/auth/password-pair";
import { DateSelect } from "@/components/ui/date-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { resolveReferralPreview } from "@/lib/server/affiliate-service";
import { getInvitePreview } from "@/lib/server/invite-service";
import { startRegisterAction } from "./actions";
import { HELPLINE } from "@/lib/support-config";
import { getServerT } from "@/lib/i18n-server";
import { formatTzs } from "@/lib/utils";
import { appUrl } from "@/lib/app-url";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ ref?: string; invite?: string }> }) {
  const { t } = await getServerT();
  const sp = await searchParams;
  const invited = !!((sp.ref ?? "").trim() || (sp.invite ?? "").trim());
  // A shared invite/registration link now unfurls with a branded card instead of
  // the site-default OG. Reuses the generic OG route + existing trilingual copy —
  // no new strings, no fabricated reward figure.
  const ogTitle = invited ? t.common.youveBeenInvited : t.auth.signUpTitle;
  const ogSub = t.auth.railTagline;
  const ogImage = `${appUrl()}/api/og/page?title=${encodeURIComponent(ogTitle)}&sub=${encodeURIComponent(ogSub)}`;
  return {
    title: t.auth.signUpTitle,
    openGraph: { title: ogTitle, description: ogSub, images: [{ url: ogImage, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: ogTitle, description: ogSub, images: [ogImage] },
  };
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; email?: string; error?: string; message?: string; ref?: string; invite?: string; next?: string }>;
}) {
  // Bounce-authed-users guard lives in src/app/auth/layout.tsx so the
  // redirect happens before any page hooks run (avoids a Next.js 16
  // dev-mode hook-count mismatch on hot reload).
  const { t } = await getServerT();
  const sp = await searchParams;
  const phoneDefault = (sp.phone ?? "").replace(/^\+255/, "").replace(/\D+/g, "").slice(0, 9);
  const emailDefault = (sp.email ?? "").trim().slice(0, 254);
  const refCode = (sp.ref ?? "").trim().slice(0, 16);
  // Carry the post-auth destination (e.g. the market the player tapped YES on)
  // through registration so they land back on it — new players are PENDING_KYC
  // but can still bet with the starter balance, so we honor their intent.
  const nextRaw = (sp.next ?? "").trim();
  const nextOk = /^\/(?![/\\])/.test(nextRaw) ? nextRaw : "";
  const referral = refCode ? await resolveReferralPreview(refCode).catch(() => null) : null;
  const inviteCode = (sp.invite ?? "").trim().slice(0, 24);
  const invite = inviteCode ? await getInvitePreview(inviteCode).catch(() => null) : null;

  const errorPanel = (() => {
    if (!sp.error) return null;
    if (sp.error === "exists") {
      return {
        tone: "warning" as const,
        title: t.auth.accountExists,
        body: t.auth.accountExistsBody,
        cta: { href: `/auth/login?phone=${encodeURIComponent(phoneDefault)}`, label: t.auth.signInTitle },
      };
    }
    // A duplicate EMAIL is a different problem with a different remedy from a
    // duplicate PHONE, and conflating them sent the player to sign in with a
    // phone that has no account — an endless loop with the real cause never
    // stated. Point them at the address, and at password recovery.
    if (sp.error === "email_exists") {
      return {
        tone: "warning" as const,
        title: t.auth.emailExists,
        body: t.auth.emailExistsBody,
        cta: { href: `/auth/login?identifier=${encodeURIComponent(emailDefault)}`, label: t.auth.signInTitle },
      };
    }
    if (sp.error === "rate_limited") {
      return {
        tone: "warning" as const,
        title: t.auth.tooManyTries,
        body: t.auth.tooManyTriesBody,
        cta: null,
      };
    }
    const msg = (sp as { message?: string }).message;
    return {
      tone: "danger" as const,
      title: t.auth.couldNotCreate,
      body: msg ? decodeURIComponent(msg) : t.auth.checkFormFields,
      cta: null,
    };
  })();

  return (
    <AuthShell>

        <section
          className="rounded-xl glass-panel p-6 space-y-5"
        >
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-gold-300">
              {t.auth.signUpTitle}
            </p>
            <h1 className="mt-1.5 font-display text-[28px] font-bold leading-tight text-text tracking-[-0.02em]">
              {t.auth.welcomeTo50pick}
            </h1>
            <p className="mt-1.5 text-[13.5px] text-text-muted">
              {t.auth.tanzaniaMobile18}
            </p>
          </div>

          {referral && (
            <div
              className="overflow-hidden rounded-xl border"
              style={{
                borderColor: "color-mix(in oklab, var(--gold-500) 36%, transparent)",
                background: "linear-gradient(135deg, color-mix(in oklab, var(--gold-500) 16%, var(--bg-elevated)), var(--bg-elevated))",
              }}
            >
              <div className="flex items-center gap-3 p-3.5">
                <FiftyMark size={40} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-text">{t.auth.invitedBy} {referral.referrerName}</p>
                  {referral.newPlayerBonusTzs > 0 && (
                    <p className="mt-1 text-[12.5px] font-semibold text-gold-300">
                      {referral.bonusTrigger === "SIGNUP"
                        ? `${t.auth.signUpAndGet} ${formatTzs(referral.newPlayerBonusTzs)} ${t.auth.toStart}`
                        : `${t.auth.getOnFirstDeposit} ${formatTzs(referral.newPlayerBonusTzs)}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {invite && (
            <div
              className="overflow-hidden rounded-xl border"
              style={{
                borderColor: "color-mix(in oklab, var(--gold-500) 36%, transparent)",
                background: "linear-gradient(135deg, color-mix(in oklab, var(--gold-500) 16%, var(--bg-elevated)), var(--bg-elevated))",
              }}
            >
              <div className="flex items-center gap-3 p-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-gold-500/15 text-gold-300">
                  <I.gift s={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-text">{t.auth.claimBonus} {formatTzs(invite.bonusAmountTzs)}</p>
                  <p className="mt-1 text-[12px] font-semibold text-gold-300">{t.auth.bonusWalletHint}</p>
                </div>
              </div>
            </div>
          )}

          {errorPanel && (
            <div
              role="alert"
              className={
                "flex items-start gap-2.5 rounded-md border px-3.5 py-3 " +
                (errorPanel.tone === "danger"
                  ? "border-no-700/60 bg-no-500/[0.10]"
                  : "border-warning-border bg-warning-bg/30")
              }
            >
              <span className={"mt-0.5 shrink-0 " + (errorPanel.tone === "danger" ? "text-no-300" : "text-gold-300")}>
                <I.alertCircle s={16} />
              </span>
              <div className="text-[12.5px] leading-snug">
                <p className="font-display font-semibold text-text">{errorPanel.title}</p>
                <p className="mt-0.5 text-text-muted">{errorPanel.body}</p>
                {errorPanel.cta && (
                  <Link
                    href={errorPanel.cta.href as never}
                    className="mt-2 inline-flex h-9 items-center px-3.5 rounded-pill border border-gold-700 bg-gold-500/10 font-display font-bold text-[12.5px] text-gold-300 hover:bg-gold-500/20 transition-colors"
                  >
                    {errorPanel.cta.label} →
                  </Link>
                )}
              </div>
            </div>
          )}

          <form action={startRegisterAction} className="space-y-4">
            {referral && <input type="hidden" name="ref" value={refCode} />}
            {invite && <input type="hidden" name="invite" value={inviteCode} />}
            {nextOk && <input type="hidden" name="next" value={nextOk} />}
            {referral && (
              <Field label={t.auth.referralCode}>
                <Input
                  readOnly
                  value={refCode.toUpperCase()}
                  prefix="REF"
                  mono
                  aria-label="Referral code"
                  className="text-gold-300 font-semibold"
                />
              </Field>
            )}
            <Field label={t.auth.phone} hint={t.auth.phonePlaceholder}>
              <PhoneInput
                id="phone"
                name="phone"
                required
                defaultValue={phoneDefault}
                size="lg"
                aria-invalid={sp.error === "exists" ? "true" : undefined}
              />
            </Field>

            {/* Email is REQUIRED at sign-up: it is where the confirmation link and
                every deposit receipt go, and confirming it is what unlocks the
                first deposit. `type="email"` gives mobile keyboards the right
                layout and the browser its own format check before submit; the
                server re-validates with the same `emailAddress` schema regardless. */}
            <Field label={t.auth.emailLabel} hint={t.auth.emailSignupHint}>
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
                placeholder={t.auth.emailPlaceholder}
                size="lg"
                aria-invalid={sp.error === "exists" ? "true" : undefined}
              />
            </Field>

            <Field label={t.auth.dobLabel} hint={t.auth.dobHint}>
              {(() => {
                const today = new Date();
                const maxDob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
                const maxStr = `${maxDob.getFullYear()}-${String(maxDob.getMonth() + 1).padStart(2, "0")}-${String(maxDob.getDate()).padStart(2, "0")}`;
                return (
                  <DateSelect
                    name="dob"
                    id="dob"
                    required
                    min="1930-01-01"
                    max={maxStr}
                  />
                );
              })()}
            </Field>

            <PasswordPair />

            <fieldset className="space-y-2.5 pt-1">
              <Checkbox
                name="acceptAge"
                required
                label={<span className="text-[13px] text-text-muted">{t.auth.age18Confirm}</span>}
              />
              <Checkbox
                name="acceptTerms"
                required
                label={<span className="text-[13px] text-text-muted">{t.auth.termsAccept}</span>}
              />
              <Checkbox
                name="marketingOptIn"
                label={<span className="text-[13px] text-text-muted">{t.auth.optionalUpdates}</span>}
              />
              {/* The binding documents must be reachable at the consent point. */}
              <p className="pt-0.5 text-[11.5px] text-text-subtle">
                <Link href={"/legal/terms" as never} className="text-brand-300 underline-offset-2 hover:underline">{t.footer.terms}</Link>
                {" · "}
                <Link href={"/legal/privacy" as never} className="text-brand-300 underline-offset-2 hover:underline">{t.footer.privacy}</Link>
                {" · "}
                <Link href={"/legal/responsible-gambling" as never} className="text-brand-300 underline-offset-2 hover:underline">{t.common.responsibleGambling}</Link>
              </p>
            </fieldset>

            <SubmitButton label={t.auth.signUpTitle} pendingLabel={t.common.creatingAccount} />
          </form>

          <p className="border-t border-border pt-3 text-center text-[13px] text-text-muted">
            {t.auth.alreadyHaveAccount}{" "}
            <Link
              href={"/auth/login" as never}
              className="font-semibold text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline"
            >
              {t.auth.signInTitle}
            </Link>
          </p>
        </section>

    </AuthShell>
  );
}
