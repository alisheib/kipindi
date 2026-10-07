"use server";

import { redirect } from "next/navigation";
import { registerWithPassword } from "@/lib/server/auth-service";
import { landingAfterAuth } from "@/lib/auth-landing";
import { normalizeReferralCode } from "@/lib/server/affiliate-service";
import { getServerT } from "@/lib/i18n-server";
import { messagingLocaleOf, renderedLocaleOf } from "@/lib/server/marketing/consent-ledger";
import { sanitizeNext } from "@/lib/safe-next";
import { registerRefusalOf, type RegisterRefusal } from "./refusal";

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
 *
 * A refusal is RETURNED, never redirected (route audit C1, 2026-10-06): the form that posted is still mounted
 * (`register-form.tsx`, `useActionState`), so it shows the refusal over everything the player typed. `_prev` is the
 * previous refusal React hands back; nothing here reads it.
 */
export async function startRegisterAction(_prev: RegisterRefusal | null, formData: FormData): Promise<RegisterRefusal | null> {
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

  /**
   * ⭐ A REFUSAL RETURNS TO THE MOUNTED FORM (route audit C1, 2026-10-06), so the hidden ref / invite / next fields and
   * everything typed never leave the page. It used to be a redirect back to `/auth/register?…`, which remounted the
   * page: the date of birth, both passwords and the three ticks came back empty, and the redirect had to carry the
   * phone, email, next, ref and invite in the URL one by one (the ref was once forgotten, orphaning every inviter whose
   * recruit mistyped a password). Nothing needs carrying now. The refusal holds a code, a registry reason and a wait,
   * never the server's English sentence (`refusal.ts`; the form words it in the page's language).
   */
  if (!result.ok) return registerRefusalOf(result, { phone, email });

  // ⭐ A NEW PLAYER GOES WHERE THEY WERE GOING, OR HOME — owner ruling 2026-10-06.
  //
  // ⛔ NOT TO A GATE. From 2026-09-05 to 2026-09-13 every new player was sent to
  // `/profile/kyc?welcome=new` (the ID-upload form), and from 2026-09-13 to 2026-10-06 to
  // `/wallet/deposit?welcome=new` — which, for an account created seconds ago, renders NO form: its
  // email door (`EmailVerifyGate`) stands in the form's place until the address is confirmed. Both
  // made a locked door the first screen of a brand-new account.
  //
  // ⭐ SO: with a safe `next`, they land on the market they came from; without one, on the market
  // board — the same front door a returning player gets (`/?welcome=back`, login). The link to confirm the
  // email goes out at sign-up, and since 2026-10-07 (owner ruling) a deposit asks no email at all: the
  // confirmed address is asked quietly before the first WITHDRAWAL (`wallet-service.withdraw()`, the
  // withdraw screen's panel). The app-wide bar and the deposit door that once asked for it are deleted. A
  // `next` that IS `/wallet/deposit` still lands there: then the deposit was their intent.
  //
  // ⭐ THE ONE RULE is `landingAfterAuth` (src/lib/auth-landing.ts), shared by every sign-in and sign-up door: the
  // greeting set before any #fragment, and a bootstrap admin (staff) sent to the console. `test:kyc-at-withdrawal` §A
  // pins it.
  redirect(landingAfterAuth({ role: result.data?.role, next: safeNext, kind: "new" }) as never);
}
