import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { IconPlate } from "@/components/ui/icon-plate";
import { FiftyMark } from "@/components/brand";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthPanel, AuthHeader } from "@/components/auth/auth-panel";
import { Field, Input } from "@/components/ui/input";
import { resolveReferralPreview } from "@/lib/server/affiliate-service";
import { normalizeReferralCode } from "@/lib/referral-code";
import { VerifiedAgentBadge } from "@/components/agent/verified-agent-badge";
import { bounceIfAuthed } from "../bounce-authed";
import { getInvitePreview } from "@/lib/server/invite-service";
import { RegisterForm, type RegisterCopy } from "./register-form";
import { REGISTER_INVALID_REASONS, type RegisterInvalidReason } from "./refusal";
import { getServerT } from "@/lib/i18n-server";
import { formatTzs, fill } from "@/lib/utils";
import { appUrl } from "@/lib/app-url";
import { ROOT_OPEN_GRAPH } from "../../layout";
import { isSafePath } from "@/lib/safe-next";
import { bannerFor } from "@/lib/failure-banner";

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
    /* 🔴 SPREADING THE ROOT IS NOT COSMETIC — WITHOUT IT THIS ROUTE HAD NO og:locale,
       og:site_name OR og:type. Next merges `metadata` PER FIELD, not deeply: a partial
       `openGraph` here REPLACES the layout object whole. `images` and `title` survived only
       because this file happens to set them, which is exactly why the loss reads as fine in
       the diff and in the browser. Measured on production 2026-09-24: `/` and `/markets`
       emitted 1/1/1, this route 0/0/0. The same edit deleted the landing page’s share card
       once already (`openGraph: { url: "/" }`). ⛔ Never write a bare `openGraph` object here. */
    openGraph: { ...ROOT_OPEN_GRAPH, title: ogTitle, description: ogSub, images: [{ url: ogImage, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: ogTitle, description: ogSub, images: [ogImage] },
  };
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; email?: string; ref?: string; invite?: string; next?: string }>;
}) {
  // ⛔ IN THE PAGE, NOT THE LAYOUT — a layout is not re-executed on a soft navigation, so the
  // old placement stopped bouncing anyone who reached this page from another `/auth` route.
  // `bounce-authed.ts` carries the measurement and the middleware loop it rules out.
  await bounceIfAuthed();
  const { t, locale } = await getServerT();
  const sp = await searchParams;
  const phoneDefault = (sp.phone ?? "").replace(/^\+255/, "").replace(/\D+/g, "").slice(0, 9);
  const emailDefault = (sp.email ?? "").trim().slice(0, 254);
  // 🔴 THIS WAS `.slice(0, 16)`, and `50PICK-AG-` is ten characters: every agent code was cut
  // to a prefix, matched nothing, rendered no ribbon and bound nobody — with no error anywhere.
  // ⭐ ONE normaliser, shared with the bind: an over-length or malformed code is REFUSED (an
  // empty string here), never shortened to something that might match somebody else.
  const refCode = normalizeReferralCode(sp.ref) ?? "";
  // Carry the post-auth destination (e.g. the market the player tapped YES on)
  // through registration so they land back on it, and honour their intent.
  // ⭐ 2026-09-13: a new account is created ACTIVE and identity is asked before a withdrawal
  // and nothing else, so the market they came from is somewhere they can act once their email
  // is confirmed and money is in. The action honours a safe `next`, else sends them to add money
  // (`auth/register/actions.ts`).
  // ⚠️ This note used to say "new players are PENDING_KYC but can still bet with the starter
  // balance" — false twice: the starter balance is clamped to 0 on live money
  // (`clampStarterBalanceForLiveMoney`), and from 2026-09-05 to 2026-09-13 an unverified
  // account could not bet at all.
  const nextRaw = (sp.next ?? "").trim();
  const nextOk = isSafePath(nextRaw) ? nextRaw : "";
  // B-1 — no swallow: the hidden ref/invite form inputs render only when these
  // previews resolve, so a FAILED read silently dropped the player's referral
  // binding (and its bonus). Throw to auth/error.tsx instead; a genuinely
  // invalid code still resolves null and simply shows no banner.
  const referral = refCode ? await resolveReferralPreview(refCode) : null;
  const inviteCode = (sp.invite ?? "").trim().slice(0, 24);
  const invite = inviteCode ? await getInvitePreview(inviteCode) : null;

  // The latest date of birth that is 18 today: the date box refuses anything later.
  const today = new Date();
  const maxDob = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  const dobMax = `${maxDob.getFullYear()}-${String(maxDob.getMonth() + 1).padStart(2, "0")}-${String(maxDob.getDate()).padStart(2, "0")}`;

  // ⭐ EVERY SENTENCE THE FORM CAN SHOW, drawn HERE in the page's language — the language the hidden `shownLocale`
  // field posts — and handed to the client form, which never looks a word up itself (register-form.tsx). A refusal's
  // reason is worded by the failure registry (`bannerFor` over `t.error`), never by the server's English sentence.
  const copy: RegisterCopy = {
    phone: t.auth.phone,
    phoneHint: t.auth.phonePlaceholder,
    email: t.auth.emailLabel,
    emailHint: t.auth.emailSignupHint,
    emailPlaceholder: t.auth.emailPlaceholder,
    dob: t.auth.dobLabel,
    dobHint: t.auth.dobHint,
    age18Confirm: t.auth.age18Confirm,
    termsAccept: t.auth.termsAccept,
    optionalUpdates: t.auth.optionalUpdates,
    terms: t.footer.terms,
    privacy: t.footer.privacy,
    responsibleGambling: t.common.responsibleGambling,
    submit: t.auth.signUpTitle,
    submitting: t.common.creatingAccount,
    signIn: t.auth.signInTitle,
    accountExists: t.auth.accountExists,
    accountExistsBody: t.auth.accountExistsBody,
    emailExists: t.auth.emailExists,
    emailExistsBody: t.auth.emailExistsBody,
    tooManyTries: t.auth.tooManyTries,
    tooManyTriesBody: t.auth.tooManyTriesBody,
    couldNotCreate: t.auth.couldNotCreate,
    checkFormFields: t.auth.checkFormFields,
    reasons: Object.fromEntries(REGISTER_INVALID_REASONS.map((r) => [r, bannerFor(r, t.error as unknown as Record<string, string>)?.body ?? t.auth.checkFormFields])) as Record<RegisterInvalidReason, string>,
  };

  // B3 · "Already have an account? Sign in" keeps where they were going AND who invited them: a player who signs in
  // instead, fails, and taps "Create one" there arrives back here with the code (the login page carries it).
  const signInQs = new URLSearchParams();
  if (nextOk) signInQs.set("next", nextOk);
  if (refCode) signInQs.set("ref", refCode);

  return (
    <AuthShell>

        <AuthPanel>
          <AuthHeader
            eyebrow={t.auth.signUpTitle}
            title={t.auth.welcomeTo50pick}
            subtitle={t.auth.tanzaniaMobile18}
          />

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
                  {/* ⭐ THE TRUST MARK — one component, derived from the same standing check that
                      decides whether this code binds. A deactivated agent's ribbon does not render
                      at all (the preview is null), so this can never vouch for a dead partner. */}
                  {referral.verifiedAgent && <VerifiedAgentBadge label={t.agent.verifiedBadge} size="sm" className="mb-1" />}
                  <p className="text-[14px] font-bold text-text">{referral.verifiedAgent ? fill(t.agent.invitedBy, { name: referral.referrerName }) : `${t.auth.invitedBy} ${referral.referrerName}`}</p>
                  {/* A sign-up offer only: the ribbon never carries a deposit-tied bonus (RG policy, 2026-09-26). */}
                  {referral.newPlayerBonusTzs > 0 && (
                    <p className="mt-1 text-body-sm font-semibold text-gold-300">
                      {`${t.auth.signUpAndGet} ${formatTzs(referral.newPlayerBonusTzs)} ${t.auth.toStart}`}
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
                <IconPlate size={40} className="bg-gold-500/15 text-gold-300">
                  <I.gift s={20} />
                </IconPlate>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-text">{t.auth.claimBonus} {formatTzs(invite.bonusAmountTzs)}</p>
                  <p className="mt-1 text-body-sm font-semibold text-gold-300">{t.auth.bonusWalletHint}</p>
                </div>
              </div>
            </div>
          )}

          {/* ⭐ The refusal panel and the form live in ONE client component, so a refusal returns to the form the
              player is looking at and loses nothing (register-form.tsx). These are its first children. */}
          <RegisterForm copy={copy} phoneDefault={phoneDefault} emailDefault={emailDefault} nextOk={nextOk} dobMax={dobMax}>
            {/* D2 · the language THIS form was drawn in, so the consent ledger stores the sentence the person
                actually ticked, even if the cookie changes before they submit (actions.ts `shownLocale`). */}
            <input type="hidden" name="shownLocale" value={locale} />
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
          </RegisterForm>

          <p className="border-t border-border pt-3 text-center text-[13px] text-text-muted">
            {t.auth.alreadyHaveAccount}{" "}
            <Link
              href={(signInQs.toString() ? `/auth/login?${signInQs.toString()}` : "/auth/login") as never}
              className="font-semibold text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline"
            >
              {t.auth.signInTitle}
            </Link>
          </p>
        </AuthPanel>

    </AuthShell>
  );
}
