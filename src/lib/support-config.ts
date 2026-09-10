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

export const SUPPORT_DEFAULTS: SupportConfig = {
  // Must match the email service's ReplyTo so a user who replies to a 50pick email and a
  // user who taps "contact support" in the app reach the SAME inbox, on the licensed domain.
  email: "support@50pick.tz",
  phone: "+255 22 211 5811",
  phoneTel: "+255222115811",
};

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
