"use server";

import { redirect } from "next/navigation";
import { registerWithPassword } from "@/lib/server/auth-service";
import { landingAfterAuth } from "@/lib/auth-landing";
import { normalizeReferralCode } from "@/lib/server/affiliate-service";
import { getServerT } from "@/lib/i18n-server";
import { messagingLocaleOf, renderedLocaleOf } from "@/lib/server/marketing/consent-ledger";
import { sanitizeNext } from "@/lib/safe-next";
import { signFlash } from "@/lib/server/flash-message";

/**
 * D2 · THE LANGUAGE THE FORM WAS SHOWN IN — it decides which sentence the consent ledger stores as
 * evidence of what this person read, and it is the account's `User.locale` from the first day.
 * 🔴 This read only the `kp-locale` cookie AT SUBMIT, and the cookie can change after the page is drawn:
 * the language provider adopts a stored choice on mount and rewrites the cookie without redrawing the
 * server's page (Safari drops script-set cookies after 7 days; localStorage survives), so a person who
 * ticked the Swahili box was recorded as having read the English sentence.
 * ⭐ So the form posts the language it was DRAWN in (the hidden `shownLocale` field, page.tsx), validated
 * to exactly en/sw/zh by `renderedLocaleOf`; it only chooses which of the dictionary's own sentences is
 * stored, never any text. The cookie remains the fallback for a form that posted none (a page served
 * before this deploy).
 */
async function shownLocale(formData: FormData) {
  return renderedLocaleOf(formData.get("shownLocale")) ?? messagingLocaleOf((await getServerT()).locale);
}

/**
 * Phone + password registration: the ONE door that creates a player account. The one-time-code sign-up that stood beside
 * it was deleted on 2026-10-06: it made accounts with no email and no password, never bound ref/invite, skipped the
 * per-network cap and kept its state in process memory. If the number ever needs proving at sign-up, add a code step to
 * THIS door (docs/FLOWS.md section 8a).
 */
export async function startRegisterAction(formData: FormData) {
  const phone = String(formData.get("phone") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const dob = String(formData.get("dob") ?? "");
  const acceptTerms = formData.get("acceptTerms") === "on" || formData.get("acceptTerms") === "true";
  const acceptAge = formData.get("acceptAge") === "on" || formData.get("acceptAge") === "true";
  const marketingOptIn = formData.get("marketingOptIn") === "on";
  // ⛔ NEVER `.slice(0, 16)` — see `MAX_REFERRAL_CODE_LEN` in affiliate-service. Refuse, never
  // truncate: a cut prefix can match a different partner's code.
  const referralCode = normalizeReferralCode(String(formData.get("ref") ?? "")) ?? undefined;
  const inviteCode = String(formData.get("invite") ?? "").trim().slice(0, 24) || undefined;
  // Safe post-auth destination (the market the player tapped, etc.). Validated
  // same-origin relative, never an /auth/* loop.
  const nextRaw = String(formData.get("next") ?? "").trim();
  const safeNext = sanitizeNext(nextRaw);

  const result = await registerWithPassword({
    phone, email, password, passwordConfirm, dob,
    acceptTerms, acceptAge, marketingOptIn, referralCode, inviteCode,
    locale: await shownLocale(formData),
  });

  if (!result.ok) {
    const params = new URLSearchParams({
      phone,
      // Carry the email back so a failed sign-up doesn't make the player retype it.
      email,
      error: result.code === "ALREADY_EXISTS" ? "exists"
        : result.code === "EMAIL_EXISTS" ? "email_exists"
        : result.code === "RATE_LIMITED" ? "rate_limited"
        : "invalid",
    });
    if (result.error && result.code !== "ALREADY_EXISTS" && result.code !== "EMAIL_EXISTS" && result.code !== "RATE_LIMITED") {
      // ⛔ SIGNED (2026-10-06) — the page shows only words THIS server wrote (`flash-message.ts`); a hand-made
      // `?message=` put an attacker's sentence on 50pick.tz's own sign-up page.
      params.set("message", signFlash("register-error", result.error));
    }
    if (safeNext) params.set("next", safeNext); // don't lose intent on a retry
    /**
     * 🔴 AND DON'T LOSE THE INVITER ON A RETRY EITHER. This redirect carried the phone, the email
     * and the destination back — everything except the referral code — so the FIRST failed attempt
     * (a mistyped password, a rate limit, an email already in use) silently orphaned the
     * attribution: the hidden `ref` field re-rendered empty, the player corrected one character,
     * succeeded, and nobody was ever credited with bringing them. A validation failure is the most
     * common event on this form, so this was not an edge case; it was the common path.
     * ⛔ Nothing is logged when it happens, either — an attribution that never existed leaves no
     * trace to notice, which is why this survived unseen.
     * ⭐ Already NORMALISED above (`normalizeReferralCode`), so a malformed code stays dropped and
     * only a well-formed one is carried; the same value the successful branch would have used.
     */
    if (referralCode) params.set("ref", referralCode);
    if (inviteCode) params.set("invite", inviteCode);
    redirect(`/auth/register?${params.toString()}`);
  }

  // ⭐ A NEW PLAYER GOES WHERE THEY WERE GOING, OR HOME — owner ruling 2026-10-06.
  //
  // ⛔ NOT TO A GATE. From 2026-09-05 to 2026-09-13 every new player was sent to
  // `/profile/kyc?welcome=new` (the ID-upload form), and from 2026-09-13 to 2026-10-06 to
  // `/wallet/deposit?welcome=new` — which, for an account created seconds ago, renders NO form: its
  // email door (`EmailVerifyGate`) stands in the form's place until the address is confirmed. Both
  // made a locked door the first screen of a brand-new account.
  //
  // ⭐ SO: with a safe `next`, they land on the market they came from; without one, on the market
  // board — the same front door a returning player gets (`/?welcome=back`, login). The email is still
  // asked: the welcome toast names it, the app-wide bar (`EmailVerifyBanner`) carries Resend, and the
  // deposit page + `wallet-service.deposit()` still refuse money until it is confirmed — asked when
  // the player reaches for the deposit, not before they have seen a market. A `next` that IS
  // `/wallet/deposit` still lands there: then the deposit was their intent.
  //
  // ⭐ THE ONE RULE is `landingAfterAuth` (src/lib/auth-landing.ts), shared by every sign-in and sign-up door: the
  // greeting set before any #fragment, and a bootstrap admin (staff) sent to the console. `test:kyc-at-withdrawal` §A
  // pins it.
  redirect(landingAfterAuth({ role: result.data?.role, next: safeNext, kind: "new" }) as never);
}
