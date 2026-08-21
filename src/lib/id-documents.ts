/**
 * THE FOUR WAYS TO PROVE WHO YOU ARE — one catalogue, one place, per document.
 *
 * ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
 * Until 2026-08-20 a 50pick player could prove identity with a **NIDA number** and
 * nothing else. Owner decision (Ali, 2026-08-19): **any ONE** of four Tanzanian
 * documents is enough — NIDA, passport, driving licence or voter's card. The two
 * controls that actually do the work are unchanged and must stay unchanged
 * (`docs/IDENTITY-POLICY.md`): **uniqueness — one document, one account** and
 * **document review by a human**. Widening *which* document is accepted must not
 * widen *how many accounts one human can hold*, and must not remove the human.
 *
 * ⛔ SO THE RULE IS: **one entry per type, and every surface reads this entry.**
 * The chooser, the field's own validation message, the required attachment slots,
 * whether an expiry is even asked for, the officer's checklist and the guards all
 * resolve from `ID_DOC_SPECS`. A fifth surface cannot come to disagree with the
 * other four, and tightening a format later is a one-line change *here* with its
 * citation beside it — never a refactor. That is the same discipline as
 * `side-label.ts` (one lexicon per enum family) and `updown-symbols.ts` (a measured
 * rule where a measurement exists; a stated absence where none does).
 *
 * ── 🔴 THE PART THIS FILE REFUSES TO GUESS ───────────────────────────────────
 * **A REGEX ON A NATIONAL ID IS A COMPLIANCE CONTROL, AND A WRONG ONE LOCKS A REAL
 * CITIZEN OUT OF THEIR OWN MONEY.** That failure is worse than a permissive field,
 * because human review is the real control and a format-rejected submission never
 * reaches a human at all. Researched 2026-08-19; two of the four are documented and
 * two are not, and this file says which is which rather than shipping four
 * confident regexes, three of them fiction:
 *
 *   · **NIDA**            🟢 published — 20 digits, `YYYYMMDD` + 5 + 5 + 2.
 *   · **Passport**        🟡 secondary sources only — 9 alphanumeric. Advisory.
 *   · **Driving licence** 🔴 TRA publishes the card, never the number's shape.
 *   · **Voter's card**    🔴 NEC/INEC confirm a number exists, never its shape.
 *
 * ⭐ **AND THE TWO OPEN ONES ARE AN OWNER DECISION, NOT A RECOMMENDATION.** Ali,
 * 2026-08-19: *"for now driving and voting, keep them open — later we change."* So
 * the permissive field is **instructed**, and a later session does not get to
 * tighten it on a guess. `kind: "unpublished"` says so in the type system; a
 * sourced rule replaces it by editing ONE object literal and citing the source in
 * `sourceNote`.
 *
 * ── WHY THE SANITY BAND IS NOT A FORMAT ──────────────────────────────────────
 * An "open" field is still bounded: a non-empty, trimmed, uppercased alphanumeric
 * string of 4–20 characters. That band exists so the column, the index and the
 * officer's screen hold something a human can read — it is NOT a claim about what a
 * Tanzanian licence number looks like, and nothing may present it as one.
 *
 * ── NO ENGLISH LIVES HERE ────────────────────────────────────────────────────
 * ⛔ Every player-facing word is a dictionary KEY resolved by the caller against
 * `i18n-dict.ts`. This module names rules; it never writes copy.
 */

/** The four documents a player may prove identity with. Storage vocabulary. */
export type IdDocType = "NIDA" | "PASSPORT" | "DRIVER_LICENSE" | "VOTER_CARD";

/**
 * ⛔ THE ORDER IS THE ORDER THE CHOOSER RENDERS IN, and NIDA is first because it is
 * the document nearly every Tanzanian holds. It is no longer *mandatory* — that is
 * the whole point of this unit — and nothing in the product may imply that it is.
 */
export const ID_DOC_TYPES = ["NIDA", "PASSPORT", "DRIVER_LICENSE", "VOTER_CARD"] as const;

/** A slot on `KycDocument.docType`. These are ATTACHMENTS, not identity types. */
export type KycDocSlot =
  | "NIDA_FRONT"
  | "NIDA_BACK"
  | "PASSPORT"
  | "DRIVER_LICENSE"
  | "VOTER_CARD"
  | "SELFIE";

/**
 * Max DECODED size of one document image, in bytes. 3 MB — legible ID photos,
 * bounded.
 *
 * ⛔ ONE HOME, AND THIS IS IT. This number was written twice: the browser
 * compressor (`lib/client/kyc-image.ts`) stepped JPEG quality down until it fit,
 * and the server (`server/kyc-service.ts`) refused anything over it. Two literals
 * on the two ends of one upload is a drift bomb — raise the client's and every
 * photo it lets through is rejected by the server after the player has waited for
 * the encode; raise the server's and the client keeps degrading photos it no
 * longer needs to. The server module cannot be the home because it is not
 * importable from a client component (it pulls `./store`, `./locks` and
 * `./crypto`, i.e. Prisma and `node:` builtins, into the browser graph — the same
 * break CLAUDE.md records for `hashKey64`). This file is already imported by both
 * ends and has no imports of its own, so it is.
 */
export const MAX_DOC_BYTES = 3 * 1024 * 1024;

/**
 * What we know about a number's shape, and how sure we are.
 *
 * ⭐ THE THREE ARMS ARE THE WHOLE HONESTY OF THIS UNIT, and they behave differently:
 *
 *  · `published`   — a documented rule. **Refuses** a value that fails it.
 *  · `secondary`   — a shape from non-government sources. **Never refuses**; a value
 *                    outside it is accepted, normalised, and FLAGGED to the officer.
 *                    A hard refusal on an unofficial shape would turn a rumour into a
 *                    lockout.
 *  · `unpublished` — no authoritative format exists. Only the sanity band applies,
 *                    and `absenceNote` states the absence in the officer's own words.
 */
export type IdFormatRule =
  | {
      kind: "published";
      /** Tested against the NORMALISED value. */
      pattern: RegExp;
      /** Where the rule comes from. Shown to the officer; kept with the rule. */
      sourceNote: string;
    }
  | {
      kind: "secondary";
      /** Advisory only — failing it produces a REVIEWER FLAG, never a refusal. */
      pattern: RegExp;
      sourceNote: string;
    }
  | {
      kind: "unpublished";
      /** Why there is no rule. This sentence reaches the officer's screen. */
      absenceNote: string;
    };

/** The sanity band every identity number is held to, whatever its type. */
export const ID_NUMBER_MIN_LEN = 4;
export const ID_NUMBER_MAX_LEN = 20;

export interface IdDocSpec {
  type: IdDocType;
  /** `t.profile.*` key for the document's name (chooser pill, labels, headings). */
  labelKey: string;
  /** `t.profile.*` key for the number field's label. */
  numberLabelKey: string;
  /** `t.profile.*` key for the field hint — the shape, in the player's language. */
  hintKey: string;
  /**
   * `t.profile.*` key for the RULE, stated as a sentence. This is what a refused
   * player reads, so it must name the real rule and never say "invalid".
   */
  ruleKey: string;
  /**
   * An HTML `pattern` attribute for the input, or `null` where there is no format.
   * ⛔ Never synthesise one from the sanity band — a browser-enforced pattern that
   * is not a real rule is a lockout wearing a tooltip.
   */
  htmlPattern: string | null;
  /** `numeric` only where the document really is digits-only. */
  inputMode: "numeric" | "text";
  /** Attachment slots that MUST be present before the player may submit. */
  requiredSlots: readonly KycDocSlot[];
  /** Does this document carry an expiry date we capture and check? */
  expires: boolean;
  format: IdFormatRule;
}

/**
 * ⛔ ONE ENTRY PER TYPE. Adding a fifth document means adding a row here and the
 * matching enum member — never a parallel column, never a second validator.
 */
export const ID_DOC_SPECS: Readonly<Record<IdDocType, IdDocSpec>> = {
  /**
   * 🟢 PUBLISHED, AND ALREADY SHIPPED. 20 digits. The published example
   * `19950101-12345-67890-12` decomposes 8-5-5-2: `YYYYMMDD` date of birth, a
   * 5-digit registration/centre block, a 5-digit serial and 2 check digits. The
   * repo has enforced `^\d{20}$` since the first KYC release and the example
   * agrees with it, so the length rule is not new — what is new is that the first
   * eight digits are checked as a REAL CALENDAR DATE (see `nidaDateOfBirth`).
   */
  NIDA: {
    type: "NIDA",
    labelKey: "idTypeNida",
    numberLabelKey: "nationalId",
    hintKey: "nidaHint",
    ruleKey: "nidaValidation",
    htmlPattern: "\\d{20}",
    inputMode: "numeric",
    requiredSlots: ["NIDA_FRONT", "NIDA_BACK", "SELFIE"],
    expires: false,
    format: {
      kind: "published",
      pattern: /^\d{20}$/,
      sourceNote:
        "20 digits, published shape YYYYMMDD-#####-#####-##. Digits 1-8 are the holder's date of birth and are validated as a real calendar date.",
    },
  },

  /**
   * 🟡 SECONDARY SOURCES ONLY — so ADVISORY, by instruction. Tanzania has issued
   * the EAC-format ICAO e-passport since January 2018 and those booklets carry a
   * 9-character alphanumeric number with a leading letter; older booklets remain
   * valid until they expire and are not guaranteed to match. No TRA / Immigration
   * specification was found. ⛔ So a value outside the shape is ACCEPTED and
   * flagged for the officer, never refused — the bio-page image and the human are
   * the control here. Find a government source and this arm becomes `published`.
   */
  PASSPORT: {
    type: "PASSPORT",
    labelKey: "idTypePassport",
    numberLabelKey: "passportNumber",
    hintKey: "passportHint",
    ruleKey: "passportValidation",
    htmlPattern: null,
    inputMode: "text",
    requiredSlots: ["PASSPORT", "SELFIE"],
    expires: true,
    format: {
      kind: "secondary",
      pattern: /^[A-Z]{1,2}[0-9]{7,8}$/,
      sourceNote:
        "9 alphanumeric characters, letter-leading, per the EAC/ICAO booklet issued since January 2018. Secondary sources only — no TRA or Immigration specification was found, so this shape is ADVISORY and a value outside it is accepted and flagged, never refused. Older booklets are still valid until they expire.",
    },
  },

  /**
   * 🔴 NOT PUBLICLY DOCUMENTED. TRA's own driver's-licence guide describes the card
   * — name, photograph, licence number, categories, validity dates — and does not
   * publish the number's shape. ⛔ DO NOT INVENT ONE. Ali, 2026-08-19: *"for now
   * driving and voting, keep them open — later we change."*
   */
  DRIVER_LICENSE: {
    type: "DRIVER_LICENSE",
    labelKey: "idTypeDriverLicence",
    numberLabelKey: "driverLicenceNumber",
    hintKey: "openIdHint",
    ruleKey: "openIdValidation",
    htmlPattern: null,
    inputMode: "text",
    requiredSlots: ["DRIVER_LICENSE", "SELFIE"],
    expires: true,
    format: {
      kind: "unpublished",
      absenceNote:
        "No authoritative TRA format for a driving-licence number was found, and the owner has instructed that this field stay open for now. Only a sanity band applies. The licence image and this officer's reading of it are the control.",
    },
  },

  /**
   * 🔴 NOT PUBLICLY DOCUMENTED. NEC/INEC material confirms the card carries a voter
   * ID number alongside the holder's data and the enrolment station; the number's
   * format is not published. Same instruction as the licence.
   */
  VOTER_CARD: {
    type: "VOTER_CARD",
    labelKey: "idTypeVoterCard",
    numberLabelKey: "voterCardNumber",
    hintKey: "openIdHint",
    ruleKey: "openIdValidation",
    htmlPattern: null,
    inputMode: "text",
    requiredSlots: ["VOTER_CARD", "SELFIE"],
    expires: false,
    format: {
      kind: "unpublished",
      absenceNote:
        "No authoritative NEC/INEC format for a voter's-card number was found, and the owner has instructed that this field stay open for now. Only a sanity band applies. The card image and this officer's reading of it are the control.",
    },
  },
};

/** Narrow an untrusted string (a query param, a form field) to a real type. */
export function isIdDocType(v: unknown): v is IdDocType {
  return typeof v === "string" && (ID_DOC_TYPES as readonly string[]).includes(v);
}

/** The spec for a type, or `null` for anything that is not one of the four. */
export function idDocSpec(v: unknown): IdDocSpec | null {
  return isIdDocType(v) ? ID_DOC_SPECS[v] : null;
}

/**
 * Normalise a typed identity number to its CANONICAL form — the one that is stored,
 * indexed and compared.
 *
 * ⛔ THIS IS A UNIQUENESS CONTROL, NOT A TIDY-UP. `AB 123456`, `ab-123456` and
 * `AB123456` are one passport; if they normalise differently the partial unique
 * index sees three documents and one human holds three accounts. So: strip every
 * separator, uppercase, and do it in exactly one place. A caller that lowercases
 * somewhere else has re-opened the hole.
 */
export function normaliseIdNumber(raw: string): string {
  return (raw ?? "").replace(/[\s\-/.]/g, "").toUpperCase();
}

/**
 * The date of birth encoded in a NIDA number's first eight digits, or `null` if
 * those digits are not a real calendar date.
 *
 * ⚠️ Returns `null` for `19993101…` (month 31) and for `19990230…` (30 February) —
 * `new Date("1999-02-30")` in JS rolls forward to 2 March rather than failing, so the
 * round-trip comparison below is load-bearing and must not be "simplified" away.
 *
 * ⛔ NIDA ONLY. The other three documents do not carry a date of birth, which is
 * exactly why the age gate cannot live here — see `docs/IDENTITY-POLICY.md`.
 */
export function nidaDateOfBirth(nida: string): string | null {
  if (!/^\d{20}$/.test(nida)) return null;
  const y = Number(nida.slice(0, 4));
  const m = Number(nida.slice(4, 6));
  const d = Number(nida.slice(6, 8));
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const iso = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  // The round-trip is what catches 30 February: JS rolled it to 2 March, and the
  // ISO string it prints back no longer equals the one we asked for.
  return parsed.toISOString().slice(0, 10) === iso ? iso : null;
}

/** Whole years between an ISO date and `now`. Calendar-correct, not 365.25-ish. */
export function ageOn(isoDate: string, now: Date): number {
  const dob = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return NaN;
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < dob.getUTCMonth() ||
    (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** The minimum age to hold a 50pick account. Mirrored by `validators.dateOfBirth`. */
export const MIN_AGE_YEARS = 18;

/**
 * Why a number was refused. ⛔ Each arm is a DIFFERENT sentence to the player —
 * "invalid" is never an acceptable answer on an identity field.
 */
export type IdNumberRefusal =
  | "empty"
  /** Outside the sanity band, or carrying characters no document number uses. */
  | "charset"
  | "length"
  /** Failed a PUBLISHED rule. Only reachable for a type that has one. */
  | "pattern"
  /** NIDA only: digits 1-8 are not a real calendar date. */
  | "nida_date";

/** A non-blocking observation for the officer. Never shown as a refusal. */
export type IdNumberFlag =
  /** The value is outside a `secondary` (advisory) shape — accepted, flagged. */
  | "unofficial_shape"
  /** The type has no published format at all, so nothing beyond the band was checked. */
  | "no_published_format";

export type IdNumberVerdict =
  | { ok: true; value: string; flags: readonly IdNumberFlag[]; nidaDob: string | null }
  | { ok: false; refusal: IdNumberRefusal };

/**
 * Validate a typed identity number. **The single entry point** — the form, the
 * server action, the service and the guards all call this and nothing else.
 *
 * ⛔ It deliberately does NOT check age, uniqueness or expiry. Age comes from the
 * declared date of birth for all four types (`validators.dateOfBirth`), uniqueness
 * comes from the database, and expiry is a separate field. Folding them in here
 * would make one of them silently NIDA-only, which is the exact defect
 * `docs/SESSION-PROMPT-KYC-ID-OPTIONS.md` §3 ④ names.
 */
export function validateIdNumber(type: IdDocType, raw: string): IdNumberVerdict {
  const spec = ID_DOC_SPECS[type];
  const value = normaliseIdNumber(raw);
  if (!value) return { ok: false, refusal: "empty" };
  if (!/^[A-Z0-9]+$/.test(value)) return { ok: false, refusal: "charset" };
  if (value.length < ID_NUMBER_MIN_LEN || value.length > ID_NUMBER_MAX_LEN) {
    return { ok: false, refusal: "length" };
  }

  const flags: IdNumberFlag[] = [];
  if (spec.format.kind === "published") {
    if (!spec.format.pattern.test(value)) return { ok: false, refusal: "pattern" };
  } else if (spec.format.kind === "secondary") {
    // ⛔ ADVISORY. A miss is a FLAG, never a refusal — see the type's comment.
    if (!spec.format.pattern.test(value)) flags.push("unofficial_shape");
  } else {
    flags.push("no_published_format");
  }

  let nidaDob: string | null = null;
  if (type === "NIDA") {
    nidaDob = nidaDateOfBirth(value);
    // Only reachable once the published 20-digit rule has passed, so this is
    // genuinely "those eight digits are not a date", not "wrong length".
    if (!nidaDob) return { ok: false, refusal: "nida_date" };
  }

  return { ok: true, value, flags, nidaDob };
}

/**
 * Is a captured expiry date in the past? `null` expiry answers `false` — a missing
 * date is a REQUIRED-FIELD question, not an expiry one, and conflating the two told
 * a player their in-date passport had expired.
 */
export function isExpired(expiryIso: string | null | undefined, now: Date): boolean {
  if (!expiryIso) return false;
  const t = Date.parse(`${expiryIso.slice(0, 10)}T23:59:59Z`);
  return Number.isFinite(t) && t < now.getTime();
}

/** Does this submission still need an attachment before it can be reviewed? */
export function missingSlots(
  type: IdDocType,
  present: readonly string[],
): readonly KycDocSlot[] {
  const have = new Set(present);
  return ID_DOC_SPECS[type].requiredSlots.filter((s) => !have.has(s));
}

/** Every slot any of the four types can ask for — the API's accept-list. */
export const ALL_DOC_SLOTS: readonly KycDocSlot[] = Array.from(
  new Set(ID_DOC_TYPES.flatMap((t) => ID_DOC_SPECS[t].requiredSlots)),
) as readonly KycDocSlot[];

/** `t.profile.*` key naming an attachment slot, for the uploader and the reviewer. */
export const DOC_SLOT_LABEL_KEY: Readonly<Record<KycDocSlot, string>> = {
  NIDA_FRONT: "idFront",
  NIDA_BACK: "idBack",
  PASSPORT: "passportBioPage",
  DRIVER_LICENSE: "licenceFront",
  VOTER_CARD: "voterCardImage",
  SELFIE: "selfie",
};
