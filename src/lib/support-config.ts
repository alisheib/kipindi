/**
 * Support contact — the CLIENT-SAFE half.
 *
 * This module is imported by client components, so it may not touch Prisma, the audit
 * chain or `defineConfig`. It holds two things and nothing else:
 *
 *   • the SHAPE and DEFAULTS of the operator-editable contact details, and
 *   • the STATUTORY helpline, PINNED — a constant, deliberately not configurable.
 *
 * ⛔ The operator-editable values are read through `@/lib/server/support-config`, which
 * hydrates them from `SystemConfig`. Do NOT read them from here: a `"use client"` module's
 * cache is the BROWSER bundle's, which no server-side load can ever reach, so a value read
 * here from a client component is stale by construction, for ever, however good the server
 * hydration is. `npm run test:support-contact` §4 enforces that.
 *
 * 🔴 WHY THE HELPLINE IS PINNED AND THE REST IS NOT (E-328).
 * The persisted `support_config` row on production carries `helpline: "+255769777877"` —
 * 50pick's OWN desk — because the admin form offered the field and somebody filled it in.
 * For three weeks that did no harm only because nothing read the row at all (E-226). The
 * moment a reader existed, the same row would have published the operator's number under
 * *"Tanzania Helpline"* on `/legal/responsible-gambling` — which is precisely the harm
 * session 91 fixed by hand in `email.ts`, where a private `HELPLINE = "+255 22 211 5811"`
 * was printed under *"Contact the Tanzania Gambling Helpline"* in the SELF-EXCLUSION email.
 * That fix corrected the constant and not the class.
 *
 * ⭐ So the split is the fix, not a precaution: the operator's own address and desk line are
 * theirs to change; the national problem-gambling number is not, and there is now no field
 * through which it could be changed. A person excluding themselves cannot be walked back to
 * the operator by an admin form, however it is filled in.
 */

/** The operator-editable contact details — the only part persisted in `SystemConfig`. */
export type SupportConfig = {
  email: string;
  phone: string;
  phoneTel: string;
};

/** SystemConfig key the durable copy is persisted under. ⛔ UNCHANGED from the pre-split
 *  module on purpose — the row an operator saved on 2026-08-19 and again on 2026-09-08 is
 *  found under this exact key, and renaming it would orphan their saves a second time. */
export const SUPPORT_CONFIG_KEY = "support_config";

/**
 * ⛔ THESE ARE NOT COSMETIC FALLBACKS. They are what the platform PUBLISHES whenever the row is
 * not in hand: a process between start and hydration, a de-hydrated process, a fresh database,
 * and **a restored backup that predates the row**. Nine surfaces read `SUPPORT_PHONE()`, so in
 * that state the app shows a support line the operator does not answer, on every one of them.
 *
 * 🔴 WHAT THEY USED TO BE, AND WHY IT MATTERED (owner's ruling, 2026-09-10):
 *   email    `support@50pick.tz`   — the live row has said `msaada@50pick.tz` since 2026-08-19
 *   phone    `+255 22 211 5811`    — ⛔ not a stale FORMAT, a DIFFERENT NUMBER: a landline that
 *                                    appears nowhere in the live row
 *   phoneTel `+255222115811`       — the same landline as the dial target
 *
 * ⭐ `phone` and `phoneTel` ARE TWO FACTS AND MUST NOT BE COLLAPSED INTO ONE. `phone` is what a
 * player READS — the local form a Tanzanian actually dials. `phoneTel` is what a TAP dials, and
 * stays E.164 so the same tap works from another carrier and from abroad. The console renders one
 * control and derives the other through `toDialTarget` above.
 *
 * ⚠️ The comment that stood here said these "must match the email service's ReplyTo" — a coupling
 * asserted in prose, pointing at a hardcoded literal in `server/email.ts` that did NOT match and
 * had not for weeks. The coupling is now real instead of described: `REPLY_TO` is a function over
 * `SUPPORT_EMAIL()`, so there is one value and nothing left to keep in step by hand.
 */
export const SUPPORT_DEFAULTS: SupportConfig = {
  email: "msaada@50pick.tz",
  phone: "0769777877",
  phoneTel: "+255769777877",
};

/** Tanzania's country calling code. The one place the `+255` prefix is written. */
const TZ_CC = "+255";

/**
 * 🔴 THE DIAL TARGET, DERIVED PROPERLY — AND THE REASON THIS FUNCTION HAD TO EXIST BEFORE THE
 * OWNER'S RULING COULD BE OBEYED.
 *
 * `phone` is what a player READS and `phoneTel` is what a tap DIALS. The admin console renders
 * ONE control and derives the other, and that derivation used to be
 * `phone.replace(/[\s\-()]/g, "")` — it stripped spaces, dashes and brackets and NOTHING ELSE.
 * So the owner's ruled local form `0769777877` would have been stored as the `tel:` target
 * verbatim, producing `tel:0769777877`, which dials from a Tanzanian handset and **fails from
 * abroad** — silently, behind a green success toast, with no field in the console that could
 * even show you the result.
 *
 * ⭐ So this converts a local number to E.164 rather than merely tidying it:
 *   `0769 777 877` → `+255769777877`      (the ruled local form — the case that was broken)
 *   `255769777877` → `+255769777877`
 *   `00255769777877` → `+255769777877`
 *   `769777877`    → `+255769777877`      (9-digit national significant number)
 *   `+255769777877` → unchanged            (already E.164)
 *
 * ⛔ It returns `""` for anything it cannot make dialable, and that is deliberate: an empty
 * string is a value a caller must decide about, whereas passing the junk through produces a live
 * `<a href="tel:">` wrapped around something no handset can call. `""` is what lets the admin
 * action REFUSE with an addressed error instead of saving a dead button.
 */
export function toDialTarget(input: string): string {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return "";
  // Keep a leading +, drop every other non-digit (spaces, dashes, brackets, dots).
  const plus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (plus) return digits.length >= 8 ? `+${digits}` : "";
  if (digits.startsWith("00")) { const r = digits.slice(2); return r.length >= 8 ? `+${r}` : ""; }
  if (digits.startsWith("255")) return digits.length === 12 ? `+${digits}` : "";
  // National formats: `0` + 9 digits, or the bare 9-digit national significant number.
  if (digits.startsWith("0")) return digits.length === 10 ? `${TZ_CC}${digits.slice(1)}` : "";
  if (digits.length === 9) return `${TZ_CC}${digits}`;
  return "";
}

/**
 * The Tanzania national problem-gambling helpline. A CONSTANT — there is no setter, no
 * persisted field, and no admin control. Safe to read from a client component precisely
 * because it is pinned: the browser bundle and the server agree by construction.
 */
const STATUTORY_HELPLINE = "0800 11 0011";
const STATUTORY_HELPLINE_TEL = "0800110011";

export function HELPLINE() { return STATUTORY_HELPLINE; }
export function HELPLINE_TEL() { return STATUTORY_HELPLINE_TEL; }

/**
 * The Gaming Board of Tanzania operating licence issued to 50pick Ltd, supplied by the
 * owner 2026-09-10.
 *
 * 🔴 IT REPLACES A PLACEHOLDER THAT WAS LIVE. `/legal/terms` §1 read "(licence number to be
 * confirmed at launch)" in English, "(namba ya leseni itathibitishwa wakati wa uzinduzi)" in
 * Swahili and "（牌照号将于上线时确认）" in Chinese — on a platform that launched, is taking
 * real money daily, and whose §1 is the first thing a Board reviewer opens.
 *
 * Statutory, exactly like the helpline above: a constant, no setter, no persisted field and
 * no admin control. A licence number an operator could retype through a form is not evidence
 * of anything.
 */
const LICENCE_NUMBER_VALUE = "OUS00000202602";

export function LICENCE_NUMBER() { return LICENCE_NUMBER_VALUE; }
