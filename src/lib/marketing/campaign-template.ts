/**
 * U37a · THE ONE CAMPAIGN RENDERER — what a campaign's two bodies become: for the officer's live counter, for the
 * officer's own test send, and for every recipient of the real send (U43). Pure and client-safe.
 *
 * ⭐ ONE FUNCTION FOR THE SCREEN AND THE WIRE. The counter an officer reads and the text a recipient receives come out
 * of the same `composeMarketing` call shape here, and this is the ONLY file in `src/` that calls it
 * (`test:campaign-compose` §16.1) — so a screen cannot promise one message while an engine sends another.
 *
 * ── WHY THE COUNTER SIZES A NAME NOBODY HAS ─────────────────────────────────
 * 🔴 `{jina}` CANNOT BE SIZED AS TYPED. `{` and `}` are GSM-7 EXTENSION characters, two septets each, so the
 * placeholder is 8 septets on screen — and a name longer than 8 letters turned an at-budget message into two
 * segments: twice the money, and only for the long names, so no short test name would ever show it. The counter
 * therefore sizes the body with `worstCaseJina()` (12 W's, one septet each), and the renderer prints only a name that
 * is at most that long and made only of single-septet letters (`isUsableJina`). Every real message is at most what
 * the counter said; §15.2 holds that bound over a written-out corpus of names.
 *
 * ── WHOSE NAME, AND NEVER RAW ────────────────────────────────────────────────
 * ⛔ `User.displayName` IS A HANDLE, NOT A NAME — 1 to 40 characters of anything (`profile/actions.ts`), so
 * "www.x.tz" or "Ali99" printed under our sender ID is an abuse vector. The name is folded onto GSM-7, its first word
 * kept, and printed only when it is letters (an inner ' or - allowed), 1–12 long; otherwise the officer's fallback.
 * ⛔ NEVER CUT: a name truncated to 12 is somebody else's name. ⛔ A BOOK CONTACT ALWAYS GETS THE FALLBACK, even when a
 * caller hands a name in — a recycled number would otherwise greet a stranger by the previous holder's name (U37
 * owner decision 3, taken on delegation). The renderer enforces it, so no caller has to remember it.
 *
 * ── ONE FALLBACK PER LANGUAGE ───────────────────────────────────────────────
 * A Swahili word inside an English SMS reads wrong, so each variant carries its own (`nameFallbackSw` /
 * `nameFallbackEn` — DECISIONS X12's column names). It is required only when that variant's body uses `{jina}`.
 *
 * ── THE SOURCE PHRASE — NOT PRINTED SINCE 2026-10-09 ─────────────────────────
 * ⛔ The owner's ruling (COMPLIANCE-DECISIONS § "2026-10-09 · Privacy v2026-10-09 — a marketing SMS is sent exactly as
 * the officer wrote it: no stop link, no 18+, no helpline, no source line (owner ruling)"): NOTHING is appended to a marketing SMS. The phrase
 * is still campaign data (`SmsCampaign.sourcePhrase`, stamped from the saved wording), but it is never printed, never
 * priced by the counter and never required: no recipient is refused for its absence, and its wording no longer judges
 * the template. (Until then — DECISIONS M5 · OQ3, owner gate G5 — the footer carried it for every recipient that was not
 * exactly an account, the counter reserved its longest form, and the renderer refused a book recipient while it was
 * blank.)
 *
 * ── WHO GETS ENGLISH ────────────────────────────────────────────────────────
 * OD42: English only to an account whose language is English AND only when an English body exists; everyone else —
 * a Chinese-language account included — gets Swahili. ⚠️ `User.locale` is not yet a live signal (OD42 amended): the
 * rule is still ONE function, `variantFor`, so the screen can state it in the same words.
 *
 * ── WHAT THE OFFICER TYPED, CLEANED THE WAY THE SAVE STORES IT (validation audit, 2026-10-03) ──
 * ⭐ The fallback word is TRIMMED before it is judged — a phone keyboard adds a space after a suggested word ("Mteja "),
 * and the save trims it anyway, so the screen refused what the server would store — and the renderer prints exactly
 * the trimmed word it judged. ⭐ The campaign's name is cleaned by the contact book's ONE name cleaner
 * (`cleanDisplayName`) before its checks: a name of zero-width characters is blank, and a direction override cannot
 * reverse it in the list. ⛔ A name holding a Tanzanian mobile number is refused HERE, in the verdict the screen and the
 * save share, by the contact book's ONE detector (`phoneNumberIn`) — a campaign row is never deleted — and ONLY such a
 * number: a date or a time is not one.
 * ⛔ A Unicode body is told so in ONE sentence that names what to replace, and never quotes a negative room (one pasted
 * curly quote used to say "you have -10 characters before the required footer").
 *
 * Guard: `npm run test:campaign-compose` §15–§16. Red: `npm run red:campaign-compose`.
 */
import {
  composeMarketing, marketingFooter, footerMeasurementToken,
  type MarketingCompose, type MarketingLocale,
} from "@/lib/marketing/footer";
import { encodingFor, foldToGsm7, offendingChars, unitsIn, GSM7_BASIC, type SmsEncoding } from "@/lib/sms-compose";
import { charCount, cleanDisplayName, phoneNumberIn } from "@/lib/contacts/contact-fields";

/* ══ THE SHAPES ══════════════════════════════════════════════════════════════ */

/** The ONE placeholder (OD42). ⛔ Lower case, exactly so — `{Jina}` and `{name}` are refused, never guessed at. */
export const JINA = "{jina}";

/** The longest name the renderer will print, and so the room the counter reserves for one. */
export const JINA_MAX_CHARS = 12;

/** The campaign's own label — staff-only, never sent. */
export const CAMPAIGN_NAME_MAX_CHARS = 80;

/**
 * The longest source phrase (M5 · OQ3), in septets — the `source.phrase` wording's own limit (`sourcePhraseProblems`, the
 * G5 door's rule). ⭐ Delegated call (U37a review, 2026-10-01): 30. ⛔ Since the owner's ruling of 2026-10-09 the line is
 * never printed, so the counter keeps NO room for it and no campaign's room depends on this figure.
 */
export const SOURCE_PHRASE_MAX_CHARS = 30;

/** ⛔ Swahili first, as everywhere (§5.13). */
export type CampaignVariant = MarketingLocale;

/**
 * What an OFFICER types. ⛔ No segments, coding or sender here — those are computed (`counterFor`) or set on the
 * server (`SMS_SENDER_ID`) — and no source phrase: that is OQ3's wording (owner gate G5), handed in by the server.
 */
export type CampaignDraftFields = {
  /** Staff-only label, never sent. */
  name: string;
  bodySw: string;
  /** Blank means everyone gets Swahili — stated on screen. */
  bodyEn: string;
  nameFallbackSw: string;
  nameFallbackEn: string;
};

/**
 * What a campaign SENDS, as stored (U35's columns, DECISIONS X12): the officer's bodies and fallbacks, plus the
 * source phrase (M5) the campaign was priced and validated with.
 */
export type CampaignTemplate = Omit<CampaignDraftFields, "name"> & {
  /** M5 · OQ3's phrase for every non-account recipient. Blank until G5 supplies the wording. */
  sourcePhrase: string;
};

/**
 * Where a recipient's number came from. `account` = the player's own account (their own name may print, no source
 * phrase); `book` = the contact book (fallback name, source phrase).
 */
export type RecipientOrigin = "account" | "book";

export type CampaignRecipient = {
  variant: CampaignVariant;
  /** The player's own first name (`firstNameFor`), or null. ⛔ Ignored for a book contact. */
  name: string | null;
  /** The recipient's opt-out token — the real one, `OPTOUT_TOKEN_CHARS` long. */
  token: string;
  origin: RecipientOrigin;
};

/* ══ THE NAME ════════════════════════════════════════════════════════════════ */

/**
 * The letters a name may print with: the LATIN letters of GSM-7's BASIC table, derived from the table rather than
 * typed (a typed copy is the second table `test:campaign-compose` §2 exists to forbid). One septet each in GSM-7 and
 * one unit each in UCS-2, so a usable name never costs more than its length.
 * ⛔ The Greek capitals in the table are left out on purpose: a name in them is a disguise, not a name.
 */
const NAME_LETTERS: ReadonlySet<string> = new Set([...GSM7_BASIC].filter((c) => /^\p{Script=Latin}$/u.test(c)));

const NAME_JOINERS: ReadonlySet<string> = new Set(["'", "-"]);
const FALLBACK_JOINERS: ReadonlySet<string> = new Set(["'", "-", " "]);

/** 1..JINA_MAX_CHARS characters, every one a name letter, or a joiner with a letter on each side. */
function nameShaped(text: string, joiners: ReadonlySet<string>): boolean {
  const chars = [...text];
  if (chars.length < 1 || chars.length > JINA_MAX_CHARS) return false;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (NAME_LETTERS.has(c)) continue;
    if (!joiners.has(c) || i === 0 || i === chars.length - 1) return false;
    if (!NAME_LETTERS.has(chars[i - 1]) || !NAME_LETTERS.has(chars[i + 1])) return false;
  }
  return true;
}

/**
 * May this word be printed as `{jina}`, exactly as given? ⭐ A predicate on the PRINTED form: `jinaFor` folds first,
 * so "Zoë" arrives here as "Zoe".
 */
export function isUsableJina(word: string): boolean {
  return typeof word === "string" && nameShaped(word, NAME_JOINERS);
}

/** The officer's fallback: the same letters, plus single inner spaces ("Mteja wetu"), at most 12. */
export function isUsableFallback(text: string): boolean {
  return typeof text === "string" && nameShaped(text, FALLBACK_JOINERS);
}

/** Folded, trimmed, first word — and only if it is usable. ⛔ Never cut to fit: too long is unusable. */
function usableFirstWord(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const first = foldToGsm7(raw).trim().split(/\s+/)[0] ?? "";
  return isUsableJina(first) ? first : null;
}

/** What `{jina}` prints for this raw name: its usable first word, else the fallback. ⛔ Never truncates. */
export function jinaFor(rawName: string | null | undefined, fallback: string): string {
  return usableFirstWord(rawName) ?? fallback;
}

/**
 * The name a PLAYER's message may greet them by — from their OWN account and nothing else. ⛔ A book contact's stored
 * name is not an input here at all: the number may have been recycled since it was written down.
 */
export function firstNameFor(src: { userDisplayName: string | null | undefined }): string | null {
  return usableFirstWord(src?.userDisplayName);
}

/** An upper bound on every usable name: single-septet, and as long as the renderer allows. */
export function worstCaseJina(): string {
  return "W".repeat(JINA_MAX_CHARS);
}

export function renderBody(body: string, jina: string): string {
  return (body ?? "").split(JINA).join(jina);
}

/* ══ PLACEHOLDERS ════════════════════════════════════════════════════════════ */

export type PlaceholderScan = {
  /** How many `{jina}`. ⛔ More than one is refused (OD42: exactly one placeholder). */
  jina: number;
  /** Every other `{…}` token, as typed, de-duplicated — each is named back to the officer. */
  unknown: string[];
  /** Braces that belong to no token (`{ jina }`, `{jina`): sent literally to everyone if not caught. */
  stray: number;
};

export function scanPlaceholders(body: string): PlaceholderScan {
  let jina = 0;
  const unknown: string[] = [];
  const rest = (body ?? "").replace(/\{([^{}\s]{1,20})\}/g, (whole: string, inner: string) => {
    if (inner === "jina") jina++;
    else if (!unknown.includes(whole)) unknown.push(whole);
    return "";
  });
  let stray = 0;
  for (const ch of rest) if (ch === "{" || ch === "}") stray++;
  return { jina, unknown, stray };
}

/** The placeholder's and the fallback's refusals for one body — the counter's, and through it the renderer's. */
function templateChecks(body: string, fallback: string): { body: string[]; fallback: string[] } {
  const scan = scanPlaceholders(body);
  const bodyProblems: string[] = [];
  const fallbackProblems: string[] = [];
  if (scan.jina > 1) bodyProblems.push(`Use ${JINA} once — this message has it ${scan.jina} times.`);
  for (const token of scan.unknown) {
    bodyProblems.push(`“${token}” is not a placeholder — the only one is ${JINA}, written exactly so, in lower case.`);
  }
  if (scan.stray > 0) bodyProblems.push(`A “{” or “}” here is not part of ${JINA} — remove it, or write ${JINA} exactly.`);
  if (scan.jina > 0) {
    // ⭐ TRIMMED FIRST, as the save stores it and the renderer prints it: "Mteja " (a phone keyboard's space after a
    // suggested word) is the word "Mteja", never a refusal the server would not make.
    const fb = (fallback ?? "").trim();
    if (fb.length === 0) {
      fallbackProblems.push(`This message uses ${JINA}, so it needs a word to print when a name cannot be used.`);
    } else if (!isUsableFallback(fb)) {
      fallbackProblems.push(
        `The word for ${JINA} must be letters (an inner space, ' or - is fine), at most ${JINA_MAX_CHARS} characters — “${fb}” is not.`,
      );
    }
  }
  return { body: bodyProblems, fallback: fallbackProblems };
}

const LINE_BREAKS = [String.fromCharCode(10), String.fromCharCode(13)];

/**
 * ⭐ THE SOURCE LINE'S OWN SHAPE RULE — what the `source.phrase` wording may be saved as (the Marketing wordings record,
 * written by the G5 door). ⛔ Nothing in the renderer calls it since the owner's ruling of 2026-10-09: the line is neither
 * printed, priced nor required, and it no longer judges the template. It is kept so G5 works as it always has — a saved
 * line keeps the shape it always had: no placeholder or brace, one line, at most `SOURCE_PHRASE_MAX_CHARS` septets
 * (measured trimmed; an extension character costs two), and the GSM alphabet only. Read AS STORED (untrimmed), so a
 * trailing line break is refused. Blank is no line, and no problem.
 * Guard: `test:marketing-wordings` W4 · `test:marketing-owner-save` O8.
 */
export function sourcePhraseProblems(phrase: string): string[] {
  const p = phrase ?? "";
  if (p.trim().length === 0) return [];
  const out: string[] = [];
  if (p.includes("{") || p.includes("}")) out.push("The source line cannot carry a placeholder or a brace.");
  if (LINE_BREAKS.some((b) => p.includes(b))) out.push("The source line must be one line.");
  const septets = unitsIn(p.trim(), "GSM7");
  if (septets > SOURCE_PHRASE_MAX_CHARS) {
    out.push(`The source line is ${septets} characters — the limit is ${SOURCE_PHRASE_MAX_CHARS}.`);
  }
  if (encodingFor(p) === "UCS2") {
    // ⛔ It names what to replace and nothing it no longer does: no message carries the line since 2026-10-09.
    out.push(`The source line has a character outside the GSM alphabet (${describeOffenders(p).map((o) => o.label).join(", ")}) — use plain characters.`);
  }
  return out;
}

/* ══ WHICH CHARACTER COST THE MONEY ══════════════════════════════════════════ */

export type OffenderView = {
  ch: string;
  /** ⛔ Never the bare character: a no-break space printed bare is a blank on screen. */
  label: string;
  /** `foldToGsm7` has a plain twin for it — the screen offers "Replace with plain characters". */
  foldable: boolean;
};

/** Names for the strays a pasted document brings. Keyed by code point: no invisible character is typed here. */
const CHARACTER_NAMES: ReadonlyMap<number, string> = new Map<number, string>([
  [0x2018, "curly opening quote"], [0x2019, "curly apostrophe"],
  [0x201C, "curly opening double quote"], [0x201D, "curly closing double quote"],
  [0x2013, "en dash"], [0x2014, "em dash"], [0x2212, "minus sign"], [0x2026, "ellipsis"],
  [0x2022, "bullet"], [0x00B7, "middle dot"], [0x00D7, "multiplication sign"],
  [0x00A0, "no-break space"], [0x202F, "narrow no-break space"], [0x2009, "thin space"],
  [0x2007, "figure space"], [0x200A, "hair space"], [0x2002, "en space"], [0x2003, "em space"],
  [0x200B, "zero-width space"], [0x200C, "zero-width non-joiner"], [0x200D, "zero-width joiner"],
  [0x2060, "word joiner"], [0xFEFF, "byte-order mark"], [0x0009, "tab"],
]);

/** Separators, controls, format characters and lone combining marks: nothing visible to quote. */
const INVISIBLE = /^[\p{Z}\p{C}\p{M}]$/u;

function codePoint(ch: string): string {
  return `U+${(ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`;
}

/**
 * Every character that forces UCS-2, in first-seen order, labelled for a human: an invisible one by its code point
 * and name ("U+00A0 no-break space"), a visible one as itself with its name ("’ (curly apostrophe)").
 */
export function describeOffenders(text: string): OffenderView[] {
  return offendingChars(text ?? "").map((ch) => {
    const name = CHARACTER_NAMES.get(ch.codePointAt(0) ?? -1);
    const label = INVISIBLE.test(ch) ? `${codePoint(ch)} ${name ?? "invisible character"}` : `${ch} (${name ?? codePoint(ch)})`;
    const folded = foldToGsm7(ch);
    return { ch, label, foldable: folded !== ch && encodingFor(folded) === "GSM7" };
  });
}

/** At most this many characters are named in the Unicode sentence; the rest are counted ("and 3 more"). */
const UNICODE_NAMED_MAX = 5;

/**
 * ⭐ A UNICODE BODY'S ONE SENTENCE — what to replace, named by `describeOffenders`' labels (an invisible character by
 * its code point, never a blank), and the room Unicode leaves. ⛔ It never quotes a negative room. Since nothing is
 * appended (the owner's ruling of 2026-10-09) Unicode keeps its whole 70, so the no-room branch guards only a future footer.
 */
function unicodeProblem(offenders: OffenderView[], room: number): string {
  const named = offenders.slice(0, UNICODE_NAMED_MAX).map((o) => o.label).join(", ");
  const more = offenders.length > UNICODE_NAMED_MAX ? ` and ${offenders.length - UNICODE_NAMED_MAX} more` : "";
  const why = room <= 0
    ? "Unicode leaves no room"
    : `Unicode cuts this message to ${room} characters`;
  return `${why} — replace: ${named}${more}.`;
}

/**
 * The envelope's refusals as the COUNTER says them. ⭐ For a Unicode body, `unicodeProblem` comes FIRST — the sentence the
 * field and the Save line show — and stands in for the envelope's own GSM sentence, which quotes each character bare (a
 * blank for a no-break space). ⛔ The over-cap sentence is dropped while Unicode leaves no room: its "you have N
 * characters" would be negative. `composeMarketing` is untouched — a recipient's own refusals stay the envelope's.
 */
function counterProblems(composed: MarketingCompose, offenders: OffenderView[]): string[] {
  if (composed.size.encoding !== "UCS2" || offenders.length === 0) return composed.problems;
  const noRoom = composed.budget <= 0;
  const rest = composed.problems.filter((p) =>
    !p.includes("is not in the GSM alphabet") && !(noRoom && p.includes("messages, and the limit is")));
  return [unicodeProblem(offenders, composed.budget), ...rest];
}

/* ══ THE COUNTER ═════════════════════════════════════════════════════════════ */

export type VariantCounter = {
  variant: CampaignVariant;
  empty: boolean;
  encoding: SmsEncoding;
  /** Of the WORST-CASE whole message — the body with the reserved name; nothing is appended (2026-10-09). */
  segments: number;
  units: number;
  /** The officer's part, the reserved name included (septets in GSM-7, UTF-16 units in UCS-2). */
  bodyUnits: number;
  /** What the officer may write: the whole message's cap, since nothing is appended (2026-10-09). */
  budget: number;
  /** `budget − bodyUnits`. Negative is "over". */
  left: number;
  /** The footer alone — 0 since the owner's ruling of 2026-10-09 (nothing is appended). */
  footerUnits: number;
  /** The source phrase's room — 0 since the owner's ruling of 2026-10-09 (the phrase is not printed). */
  sourceUnits: number;
  /** The room `{jina}` keeps for a name — `JINA_MAX_CHARS` per placeholder, 0 without one. */
  jinaReserve: number;
  offenders: OffenderView[];
  /** The body's refusals: the envelope's (identity, empty, over the cap, UCS-2) and the placeholder's. */
  problems: string[];
  /** The fallback field's refusals, kept apart so the screen puts each sentence beside its own field. */
  fallbackProblems: string[];
  ok: boolean;
};

/**
 * ⭐ THE LIVE COUNTER FOR ONE VARIANT — the worst case of every message this body can become.
 *
 * It composes `renderBody(body, worstCaseJina())` through the same `composeMarketing` the renderer uses, and sizes THAT
 * — ⛔ never the placeholder as typed (4 short per name: the U37 defect). Nothing is appended (the owner's ruling of
 * 2026-10-09), so the message priced is the message sent. `sourcePhrase` is still taken, so every caller keeps one
 * signature; it is no longer printed or priced.
 */
export function counterFor(body: string, variant: CampaignVariant, fallback: string, sourcePhrase: string): VariantCounter {
  const v: CampaignVariant = variant === "EN" ? "EN" : "SW";
  const raw = body ?? "";
  void sourcePhrase;
  const scan = scanPlaceholders(raw);
  const rendered = renderBody(raw, worstCaseJina());
  const token = footerMeasurementToken();
  const composed = composeMarketing(rendered, token, v);
  const encoding = composed.size.encoding;
  const bodyUnits = unitsIn(rendered.trim(), encoding);
  const checks = templateChecks(raw, fallback);
  const offenders = describeOffenders(composed.text);
  const problems = [...counterProblems(composed, offenders), ...checks.body];
  return {
    variant: v,
    empty: raw.trim().length === 0,
    encoding,
    segments: composed.size.segments,
    units: composed.size.units,
    bodyUnits,
    budget: composed.budget,
    left: composed.budget - bodyUnits,
    footerUnits: unitsIn(marketingFooter(token, v), encoding),
    sourceUnits: 0,
    jinaReserve: scan.jina * unitsIn(worstCaseJina(), encoding),
    offenders,
    problems,
    fallbackProblems: checks.fallback,
    ok: problems.length === 0 && checks.fallback.length === 0,
  };
}

/* ══ THE CAMPAIGN'S NAME ═════════════════════════════════════════════════════ */

/**
 * OD55 for the label — a campaign row is never deleted, so a number typed into its name would be kept for good. The
 * sentence names the number by its last two digits only (so the officer can find it) and says how to write other figures.
 */
export function campaignNameHoldsNumber(digits: string): string {
  return `A campaign name can't hold a phone number — the digits ending ${digits.slice(-2)} read as one, and campaigns are ` +
    "kept for good. Name the group it is for, or write other figures with a comma or a slash.";
}

/* ══ THE WHOLE DRAFT ═════════════════════════════════════════════════════════ */

/** A field the verdict can speak about: the officer's five, and the server-supplied source phrase (no longer judged, 2026-10-09). */
export type TemplateField = keyof CampaignDraftFields | "sourcePhrase";

export type TemplateVerdict = {
  ok: boolean;
  /** One list per field, each entry one sentence. Absent = that field is fine. */
  problems: Partial<Record<TemplateField, string[]>>;
  /** ⭐ EN is null when there is no English body — the screen then says everyone gets Swahili. */
  counters: { SW: VariantCounter; EN: VariantCounter | null };
};

/**
 * ⭐ THE TEMPLATE'S OWN VERDICT — every field but the staff-only name: the Swahili body (required), the English body
 * (optional, checked in full when present), both fallbacks. ONE function: `validateCampaignTemplate`
 * shows it on the screen and on save, and `renderForRecipient` re-runs it, whole, on the stored row — so the verdict an
 * officer saved and the verdict a send obeys cannot disagree.
 */
function templateFieldVerdict(t: CampaignTemplate): Pick<TemplateVerdict, "problems" | "counters"> {
  const problems: TemplateVerdict["problems"] = {};
  const add = (k: TemplateField, list: string[]) => {
    if (list.length > 0) problems[k] = [...(problems[k] ?? []), ...list];
  };

  // The source phrase is no longer printed (the owner's ruling of 2026-10-09), so it no longer judges the template.
  const phrase = t.sourcePhrase ?? "";

  const sw = counterFor(t.bodySw ?? "", "SW", t.nameFallbackSw ?? "", phrase);
  if (sw.empty) add("bodySw", ["The Swahili message is required — it is the one every recipient can be sent."]);
  else {
    add("bodySw", sw.problems);
    add("nameFallbackSw", sw.fallbackProblems);
  }

  const en = (t.bodyEn ?? "").trim().length === 0 ? null : counterFor(t.bodyEn, "EN", t.nameFallbackEn ?? "", phrase);
  if (en) {
    add("bodyEn", en.problems);
    add("nameFallbackEn", en.fallbackProblems);
  }

  return { problems, counters: { SW: sw, EN: en } };
}

/**
 * The verdict the screen shows AND the server re-runs on save (U37b) — one function, so the two cannot disagree; the
 * renderer re-runs its template part (`templateFieldVerdict`) on every stored row.
 * ⛔ Swahili is required; English is optional, and validated in full when present.
 * `sourcePhrase` is still taken (one signature for every caller); since the owner's ruling of 2026-10-09 it is neither
 * printed, priced nor required.
 */
export function validateCampaignTemplate(f: CampaignDraftFields, sourcePhrase: string): TemplateVerdict {
  const problems: TemplateVerdict["problems"] = {};
  // ⭐ The contact book's ONE name cleaner, as the save stores it: invisible format characters (zero-width spaces,
  // direction overrides) and controls dropped, spaces collapsed, trimmed — so a name of zero-width characters is blank.
  const name = cleanDisplayName(f.name ?? "") ?? "";
  const nameChars = charCount(name);
  if (nameChars === 0) problems.name = ["Give the campaign a name — only staff see it."];
  else {
    const said: string[] = [];
    if (nameChars > CAMPAIGN_NAME_MAX_CHARS) said.push(`The name is ${nameChars} characters — the limit is ${CAMPAIGN_NAME_MAX_CHARS}.`);
    // ⛔ OD55 for the label, in the ONE verdict — so Save is off on the screen before it is pressed, and the save agrees.
    const phone = phoneNumberIn(name);
    if (phone !== null) said.push(campaignNameHoldsNumber(phone));
    if (said.length > 0) problems.name = said;
  }

  const template = templateFieldVerdict({
    bodySw: f.bodySw, bodyEn: f.bodyEn, nameFallbackSw: f.nameFallbackSw, nameFallbackEn: f.nameFallbackEn, sourcePhrase,
  });
  Object.assign(problems, template.problems);

  return { ok: Object.keys(problems).length === 0, problems, counters: template.counters };
}

/* ══ PER RECIPIENT ═══════════════════════════════════════════════════════════ */

/**
 * OD42's rule, the ONE copy: English only for an account whose language is English, and only when an English body
 * exists; everyone else gets Swahili. (Chinese-language accounts get Swahili — the literal "defaulting to Swahili";
 * a one-line change here if the owner prefers English for them.)
 */
export function variantFor(
  t: Pick<CampaignTemplate, "bodyEn">,
  userLocale: "EN" | "SW" | "ZH" | null | undefined,
): CampaignVariant {
  return userLocale === "EN" && (t?.bodyEn ?? "").trim().length > 0 ? "EN" : "SW";
}

/** The fields as the composer screen names them — for the sentences that refuse a stale template. */
const FIELD_LABELS: Record<TemplateField, string> = {
  name: "campaign name",
  bodySw: "Swahili message",
  bodyEn: "English message",
  nameFallbackSw: `Swahili word for ${JINA}`,
  nameFallbackEn: `English word for ${JINA}`,
  sourcePhrase: "source line",
};

/**
 * ⛔ ONE CAMPAIGN, ONE VERDICT — what every recipient of a stale template is refused with: first that the stored
 * template no longer passes its own check (naming the fields), then each field's own sentence, labelled with its field
 * so an English-body sentence on a Swahili recipient's refusal says which message it is about.
 */
function staleTemplateProblems(stale: TemplateVerdict["problems"]): string[] {
  const fields = Object.keys(stale) as TemplateField[];
  if (fields.length === 0) return [];
  const out = [
    `The stored campaign template no longer passes its own check (${fields.map((k) => `the ${FIELD_LABELS[k]}`).join(", ")}), ` +
      "so it is refused for every recipient — nothing is sent until it is corrected and saved again.",
  ];
  for (const k of fields) {
    const label = FIELD_LABELS[k];
    for (const p of stale[k] ?? []) out.push(`${label.charAt(0).toUpperCase()}${label.slice(1)}: ${p}`);
  }
  return out;
}

/**
 * ⭐ THE ONE PER-RECIPIENT RENDERER — the officer's test send and every real recipient (U43) call this and nothing
 * else. An EN recipient of a campaign with no English body gets the Swahili message (and the Swahili fallback).
 *
 * ⛔ ONE CAMPAIGN, ONE VERDICT. It re-runs the stored template's WHOLE verdict (`templateFieldVerdict` — everything
 * `validateCampaignTemplate` checks but the staff-only name): both languages' worst-case counters, both fallbacks, and
 * the source line AS STORED (untrimmed). A fault ANYWHERE refuses EVERY recipient, whatever their language or origin,
 * with a sentence saying the stored template no longer passes its own check. So a stale or hand-edited row is never
 * half-sent — not to the Swahili readers while the English body is broken, not to the short names while the long ones
 * are refused — and U38/U40's counts never disagree with what went out (`test:campaign-compose` §15.13). The
 * recipient's own message is checked too (its text as sent).
 *
 * ⛔ Since the owner's ruling of 2026-10-09 nothing is appended: no source phrase is printed and none is required, for
 * any origin. A book contact still gets the fallback word for `{jina}`, never a name.
 */
export function renderForRecipient(t: CampaignTemplate, r: CampaignRecipient): MarketingCompose {
  const english = r?.variant === "EN" && (t.bodyEn ?? "").trim().length > 0;
  const variant: CampaignVariant = english ? "EN" : "SW";
  const body = (english ? t.bodyEn : t.bodySw) ?? "";
  // ⭐ The word the verdict judged — trimmed, exactly as `templateChecks` reads it — is the word that prints.
  const fallback = ((english ? t.nameFallbackEn : t.nameFallbackSw) ?? "").trim();
  // ⛔ ONLY exactly "account" counts as the person's own: anything else is treated as a book contact.
  const fromAccount = r?.origin === "account";
  const jina = fromAccount ? jinaFor(r.name, fallback) : fallback;
  const composed = composeMarketing(renderBody(body, jina), r?.token ?? "", variant);
  // The template's whole verdict first (the cause), then this message's own — each sentence once.
  const problems: string[] = [];
  for (const p of [...staleTemplateProblems(templateFieldVerdict(t).problems), ...composed.problems]) {
    if (!problems.includes(p)) problems.push(p);
  }
  return { ...composed, problems, ok: problems.length === 0 };
}
