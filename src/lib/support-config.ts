/**
 * Support contact and the public facts — the CLIENT-SAFE half.
 *
 * This module is imported by client components, so it may not touch Prisma, the audit
 * chain or `defineConfig`. It holds three things and nothing else:
 *
 *   • the SHAPE and DEFAULTS of every operator-editable public fact: the support desk
 *     (email, phone), Tanzania's national problem-gambling helpline, and the licence number;
 *   • the derivations (`toDialTarget`, `toHelplineDial`, `licenceProblem`) that the admin form
 *     previews and the server action stores, so what the console shows is what gets saved;
 *   • the readers `HELPLINE()`, `HELPLINE_TEL()` and `LICENCE_NUMBER()`, which return the SAVED
 *     value on the server AND in a browser bundle — see "HOW A SAVED VALUE REACHES A CLIENT
 *     COMPONENT" below.
 *
 * ⛔ The desk getters (`SUPPORT_EMAIL()`, `SUPPORT_PHONE()`) are read through
 * `@/lib/server/support-config` and reach client components as PROPS. Do NOT add them to the
 * <html> channel below without a reason: `npm run test:support-contact` §4 enforces that no
 * client component reads them.
 *
 * ⭐ OWNER'S RULE, 2026-10-03 (`docs/COMPLIANCE-DECISIONS.md`): "everything should be changeable —
 * admins can change anything, licence, numbers, everything … if in Tanzania anything changes we
 * should be capable of changing always." Until that day the helpline and the licence were pinned
 * constants shown as greyed-out boxes in /admin/system, and an admin read the console as broken.
 * They are now persisted, audited and validated exactly like the desk line.
 *
 * 🔴 WHAT THE PINNING PROTECTED, AND WHERE THAT PROTECTION LIVES NOW (E-328).
 * The persisted `support_config` row on production carries `helpline: "+255769777877"` —
 * 50pick's OWN desk — because an old admin form offered the field and somebody filled it in.
 * Published as the "Tanzania Helpline", that walks a player who is excluding themselves straight
 * back to the operator. Two things keep that from happening without a lock:
 *   1. the helpline is stored under NEW keys (`nationalHelpline`, `nationalHelplineTel`), so the
 *      stale `helpline` value in that row is never read — `server/support-config.ts` `migrate`
 *      drops it on the way in;
 *   2. validation REFUSES a helpline that dials the same number as the support phone.
 */

/** The operator-editable public facts — the only part persisted in `SystemConfig`. */
export type SupportConfig = {
  email: string;
  phone: string;
  phoneTel: string;
  /** Tanzania's national problem-gambling helpline as a player READS it, e.g. `0800 11 0011`.
   *  ⛔ Never the key `helpline`: that key in the live row holds our own desk number (E-328). */
  nationalHelpline: string;
  /** …and as a tap DIALS it. Always `toHelplineDial(nationalHelpline)` — derived, never typed. */
  nationalHelplineTel: string;
  /** The Gaming Board of Tanzania operating licence number, printed in every footer, the terms
   *  and the game rules. */
  licenceNumber: string;
};

/** SystemConfig key the durable copy is persisted under. ⛔ UNCHANGED from the pre-split
 *  module on purpose — the row an operator saved on 2026-08-19 and again on 2026-09-08 is
 *  found under this exact key, and renaming it would orphan their saves a second time. */
export const SUPPORT_CONFIG_KEY = "support_config";

/**
 * ⛔ THESE ARE NOT COSMETIC FALLBACKS. They are what the platform PUBLISHES whenever the row is
 * not in hand: a process between start and hydration, a de-hydrated process, a fresh database,
 * and **a restored backup that predates the row**. Every surface that prints a support line, the
 * helpline or the licence prints these in that state.
 *
 * 🔴 WHAT THE DESK DEFAULTS USED TO BE, AND WHY IT MATTERED (owner's ruling, 2026-09-10):
 *   email    `support@50pick.tz`   — the live row has said `msaada@50pick.tz` since 2026-08-19
 *   phone    `+255 22 211 5811`    — ⛔ not a stale FORMAT, a DIFFERENT NUMBER: a landline that
 *                                    appears nowhere in the live row
 *   phoneTel `+255222115811`       — the same landline as the dial target
 *
 * ⭐ `phone` and `phoneTel` ARE TWO FACTS AND MUST NOT BE COLLAPSED INTO ONE. `phone` is what a
 * player READS — the local form a Tanzanian actually dials. `phoneTel` is what a TAP dials, and
 * stays E.164 so the same tap works from another carrier and from abroad. The console renders one
 * control and derives the other through `toDialTarget` below. The helpline pair is the same shape,
 * derived through `toHelplineDial`.
 *
 * ⭐ The helpline and licence defaults are the values the owner ruled: the helpline 50pick already
 * publishes (OQ4, 2026-09-26) and the licence he supplied on 2026-09-10. `test:support-contact`
 * §12.1 pins the licence default against that ruling.
 */
export const SUPPORT_DEFAULTS: SupportConfig = {
  email: "msaada@50pick.tz",
  phone: "0769777877",
  phoneTel: "+255769777877",
  nationalHelpline: "0800 11 0011",
  nationalHelplineTel: "0800110011",
  licenceNumber: "OUS00000202602",
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
 * The HELPLINE's dial target. ⚠️ NOT `toDialTarget`, on purpose: a toll-free `0800` line is
 * dialled exactly as printed inside Tanzania, and rewriting it to `+255800…` produces a number
 * many carriers do not route. So this only tidies: it keeps a leading `+` and drops spaces,
 * dashes, brackets and dots.
 *
 * ⛔ Returns `""` — so the action refuses — for anything carrying a letter (`0800 11 0011 ext 2`
 * would dial a different number), fewer than 3 digits (short codes such as `116` are real
 * helplines, two digits are not), or more than 15 (E.164's ceiling).
 */
export function toHelplineDial(input: string): string {
  const trimmed = (input ?? "").trim();
  if (!trimmed || /[A-Za-z]/.test(trimmed)) return "";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 3 || digits.length > 15) return "";
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

/**
 * Why a licence number cannot be saved, or `null` when it can. Shape-only, deliberately: the
 * Gaming Board's format may change, which is the whole reason the field is editable. What must
 * not pass is a blank (every footer would print "Licence:" and nothing), a paragraph, or markup.
 */
export function licenceProblem(input: string): string | null {
  const v = (input ?? "").trim();
  if (!v) return "The licence number cannot be blank — it is printed in every footer, the terms and the game rules.";
  if (v.length > 40) return "That is too long for a licence number (40 characters at most).";
  if (!/^[A-Za-z0-9][A-Za-z0-9 ./-]*$/.test(v)) {
    return `"${v}" has characters a licence number does not carry. Use letters, digits, spaces, dots, dashes or slashes.`;
  }
  return null;
}

/**
 * 🔴 HOW A SAVED VALUE REACHES A CLIENT COMPONENT — the problem the old pinning side-stepped.
 *
 * A `"use client"` module's state is the BROWSER bundle's, which no server-side load can reach
 * (E-226), so a client component cannot read `defineConfig`. And the helpline is rendered from
 * client code: the footer, the reality-check modal, the landing hero, the sign-in shell.
 *
 * ⭐ So the root layout PUBLISHES the three facts as attributes on <html>, from the server's live
 * config, and in a browser the readers below take them from there. The <html> start tag is parsed
 * before any script runs, so the value is in place for the very first client render and hydration
 * agrees with the server HTML — no inline script, no ordering race, nothing for the CSP to allow.
 *
 * On the server, `server/support-config.ts` registers its live getter on `globalThis` when it
 * loads (the root layout imports it on every request) and the readers call that, so a server
 * component, an email and an SMS footer all read the saved row too.
 *
 * ⛔ `global-error.tsx` imports nothing, so it spells these attribute names itself;
 * `test:support-contact` §15 holds the two in step.
 */
export const PUBLIC_FACT_ATTRS = {
  nationalHelpline: "data-kp-helpline",
  nationalHelplineTel: "data-kp-helpline-tel",
  licenceNumber: "data-kp-licence",
} as const;

type PublicFact = keyof typeof PUBLIC_FACT_ATTRS;

/** The attributes the root layout spreads onto <html>. */
export function publicFactAttrs(c: Pick<SupportConfig, PublicFact>): Record<string, string> {
  return {
    [PUBLIC_FACT_ATTRS.nationalHelpline]: c.nationalHelpline,
    [PUBLIC_FACT_ATTRS.nationalHelplineTel]: c.nationalHelplineTel,
    [PUBLIC_FACT_ATTRS.licenceNumber]: c.licenceNumber,
  };
}

declare global {
  /** Set by `server/support-config.ts` on load: the live config getter, for the server-side readers. */
  // eslint-disable-next-line no-var
  var __50PICK_SUPPORT_READ: (() => SupportConfig) | undefined;
}

/** One public fact: the saved value where one can be read, else the default — never blank. */
function publicFact(name: PublicFact): string {
  if (typeof window === "undefined") {
    try {
      const v = globalThis.__50PICK_SUPPORT_READ?.()[name];
      if (typeof v === "string" && v) return v;
    } catch { /* a reader that throws must not take a page down — fall back to the default */ }
    return SUPPORT_DEFAULTS[name];
  }
  try {
    const v = window.document.documentElement.getAttribute(PUBLIC_FACT_ATTRS[name]);
    if (v) return v;
  } catch { /* no document (a worker) — fall back to the default */ }
  return SUPPORT_DEFAULTS[name];
}

/** Tanzania's national problem-gambling helpline, as a player reads it. Saved in /admin/system. */
export function HELPLINE() { return publicFact("nationalHelpline"); }
/** …and as a tap dials it. */
export function HELPLINE_TEL() { return publicFact("nationalHelplineTel"); }

/**
 * The Gaming Board of Tanzania operating licence issued to 50pick Ltd. Saved in /admin/system.
 *
 * 🔴 THE FIRST VALUE REPLACED A PLACEHOLDER THAT WAS LIVE. `/legal/terms` §1 read "(licence number
 * to be confirmed at launch)" in all three languages on a platform taking real money daily, until
 * the owner supplied the number on 2026-09-10. That number is the default above.
 */
export function LICENCE_NUMBER() { return publicFact("licenceNumber"); }

/**
 * THE EVIDENCE BEHIND THE WORD "FIRST" — the landing hero's claim gate (specs/hero-v3.md §8).
 *
 * The hero's claim has two states. State N, "Licensed prediction market · Tanzania", needs only
 * the licence above. State P, "Tanzania's first licensed prediction market", is a comparative
 * claim about every other operator, and it renders ONLY while this returns a record. Statutory
 * like the licence number: a constant, no setter, no persisted field, no admin control — a
 * "first" an operator could switch on from a form would be evidence of nothing.
 *
 * ⭐ SET 2026-09-27 BY THE OWNER'S RULING, INHERIT-MANIFEST R9 ("please say we're the first —
 * I'm the owner and we're the first"). What it rests on: the owner's attestation, plus the Gaming
 * Board of Tanzania's acknowledgement of the licence fee for operations under Sec. 51(2) of the
 * Gaming Act, paid 2026-09-05 (R8(1); the owner holds the document — it is not committed, it
 * carries a personal e-mail). Recorded in `docs/COMPLIANCE-DECISIONS.md` under 2026-09-27.
 * ⭐ "Licensed" is never dropped from the claim: it is what makes "first" true against offshore
 * sites that reach Tanzanians without a Board licence.
 * ⛔ IF THE BOARD OR A COMPETITOR EVER DISPUTES IT, set this to `null`. That one change returns
 * the hero to state N in every language — the claim key is read nowhere else
 * (`npm run test:hero-copy` §1 fails if it is).
 */
export type FirstLicensedEvidence = {
  /** The day the evidence was recorded (YYYY-MM-DD) — the COMPLIANCE-DECISIONS entry's date. */
  date: string;
  /** The ruling that recorded it — cited verbatim by that COMPLIANCE-DECISIONS entry. */
  ruling: string;
  /** What the claim rests on, in one line. */
  basis: string;
};

const FIRST_LICENSED_EVIDENCE_VALUE: FirstLicensedEvidence | null = {
  date: "2026-09-27",
  ruling: "INHERIT-MANIFEST R9",
  basis: "Owner's attestation (R9) + the Gaming Board of Tanzania's licence-fee acknowledgement, Gaming Act Sec. 51(2), paid 2026-09-05",
};

export function FIRST_LICENSED_EVIDENCE(): FirstLicensedEvidence | null { return FIRST_LICENSED_EVIDENCE_VALUE; }
