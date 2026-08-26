/**
 * THE SENSITIVE-FIELD REGISTRY — which player field belongs to which READ class, how it looks
 * masked, and how to re-read its raw value when a reveal is permitted.
 *
 * Design + rulings: docs/READ-TIERS.md (§3.1 the classes, §4a the rulings, §4c the cell).
 *
 * ⭐ THE RAW VALUE NEVER TRAVELS TO THE CLIENT AT REST, AND THAT IS THE WHOLE POINT OF A
 * REGISTRY. §5.4 is explicit: "the figure must be absent from the server's response, asserted on
 * the HTML, not on the rendered box" — because `innerText` returns text a `display:none` wrapper
 * still contains, and a `visibility:hidden` balance is a balance that shipped. So the server
 * renders ONLY the masked string, and a reveal is a round trip that re-reads the value here.
 *
 * ⛔ DO NOT COPY `src/components/profile/ip-reveal.tsx`. It masks an IP and unhides it
 * client-side, which is correct for a player looking at their OWN address (§6 puts that out of
 * scope) and is exactly the mistake §5.4 forbids for a staff member looking at a PLAYER.
 * It is the right thing to copy the LOOK from and the wrong thing to copy the MECHANISM from.
 *
 * ⚠️ A field added here without a class is a field nobody classified — `test:read-tiers` ratchets
 * on that, per §5.5: the count that matters is of UNCLASSIFIED fields, because a count of masked
 * ones passes by never growing.
 */
import { db } from "./store";
import type { ReadClass } from "./roles";

export type SensitiveField = {
  /** Which class governs it — the ONLY place this mapping lives. */
  readClass: ReadClass;
  /** Human label, used by the audit payload and the reveal control's accessible name. */
  label: string;
  /**
   * The masked rendering. ⚠️ It must preserve enough SHAPE for a support agent to CONFIRM a
   * detail the player reads out to them, and not enough to HARVEST it — that difference is the
   * entire reason `masked` exists as a cell rather than just `read`/`none` (§3.2).
   */
  mask: (raw: string) => string;
  /** Re-read the raw value for a permitted reveal. Server-only; never called from a page. */
  read: (subjectId: string) => Promise<string | null>;
};

/**
 * ⭐ MASKED EMAIL KEEPS THE FIRST CHARACTER AND THE DOMAIN. "a••••@gmail.com" lets an agent
 * confirm "yes, that's the gmail one starting with a" against what the player just told them,
 * while a list of these is worthless for takeover. ⚠️ A single-character local part must not
 * become a bare "@domain" — that leaks that the local part is one character.
 */
export function maskEmail(raw: string): string {
  const at = raw.lastIndexOf("@");
  if (at <= 0) return "••••";
  const local = raw.slice(0, at);
  const domain = raw.slice(at);
  return `${local[0]}••••${domain}`;
}

/**
 * A region is a small closed set, so ANY partial reveal identifies it — "D••••" is "Dar es
 * Salaam" to anyone who has seen the list. ⛔ There is no useful shape to preserve, so the mask
 * is opaque. ⚠️ This is the honest answer, not a lazy one: pretending to mask a value from a
 * 30-item vocabulary would be theatre, and theatre is what §4a ruled out for D2.
 */
export function maskRegion(): string {
  return "••••";
}

/**
 * A date of birth masks to its YEAR only. ⭐ That is the useful shape: it still answers the
 * question an officer actually has — "is this person plausibly the age they claim?" — while a
 * year alone is not the identity token a full DOB is. ⚠️ Not the year of a null/garbage value:
 * an unparseable date masks to dots rather than to "NaN", which would read as data.
 */
export function maskDob(raw: string): string {
  const y = /^(\d{4})-\d{2}-\d{2}/.exec(raw)?.[1] ?? (/(\d{4})/.exec(raw)?.[1] ?? null);
  return y ? `${y}-••-••` : "••••";
}

export const SENSITIVE_FIELDS = {
  email: {
    readClass: "identity.contact",
    label: "Email address",
    mask: maskEmail,
    read: async (subjectId) => (await db.user.findById(subjectId))?.email ?? null,
  },
  region: {
    readClass: "identity.personal",
    label: "Region",
    mask: maskRegion,
    read: async (subjectId) => (await db.user.findById(subjectId))?.region ?? null,
  },
  dob: {
    readClass: "identity.personal",
    label: "Date of birth",
    mask: maskDob,
    // ⚠️ DOB lives on the KYC submission, not on the user row — the registry is the one place
    // that difference is allowed to matter, so no page has to know it.
    read: async (subjectId) => (await db.kyc.findByUserId(subjectId))?.dob ?? null,
  },
} as const satisfies Record<string, SensitiveField>;

export type SensitiveFieldKey = keyof typeof SENSITIVE_FIELDS;

export const SENSITIVE_FIELD_KEYS = Object.keys(SENSITIVE_FIELDS) as SensitiveFieldKey[];

export function isSensitiveFieldKey(k: string): k is SensitiveFieldKey {
  return Object.prototype.hasOwnProperty.call(SENSITIVE_FIELDS, k);
}
