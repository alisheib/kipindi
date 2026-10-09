/**
 * U33w · THE MARKETING WORDINGS — the keys, the suggestions, the rules, the append-only history every saved wording
 * keeps, and what a save may carry. Pure and client-safe: the "Marketing wordings" card on /admin/system runs these rules
 * on every keystroke and builds its request with them, and the server runs the SAME functions before it writes
 * (`src/lib/server/marketing/wordings.ts`), so the card and the save can never disagree about what may be saved.
 *
 * ⭐ WHY THIS EXISTS (OD57 · OD58 · S14 · the owner rule of 2026-10-03, "admins can change everything"). The words that
 * say WHY 50pick may message a person — a consent basis, the licence outreach basis — the 18+ confirmations staff tick,
 * the bought-list notice and the campaign source line were code constants an engineer had to change (owner gates G4
 * and G5). They are now persisted, validated, audited config (`marketing.wordings`), edited on one card. Code keeps the
 * KEYS, the RULES and the DEFAULTS; an admin's save is what makes a wording real — and the save IS the approval (G4).
 * ⭐ 2026-10-09 (the owner's ruling: nothing is appended to a marketing SMS): the source line has no box on the card any
 * more and nothing reads it — it stays a key, so its saved versions read whole as history, and the owner door's G5
 * still saves it.
 * ⭐ 2026-10-07 (Ali's ruling): he may instead approve a wording IN THE CLAUDE SESSION, and Claude saves it for him through
 * the audited ops door (`src/lib/server/marketing/owner-save.ts`) — never with his login. The door records his approval
 * (COMPLIANCE `marketing.owner_save_applying`) BEFORE it saves, builds the request with this file's own `wordingsToSave`
 * and `wordingsPostEntries`, and saves through the same server writer as the card, as `ops: <by>`.
 *
 * ⛔ W1 · A DEFAULT IS A SUGGESTION, NEVER EVIDENCE. Every basis writer takes its words from the SAVED history
 * (`currentWording`) and refuses when there is none, so nothing unsaved is ever recorded. `WORDING_DEFAULTS` exists to
 * PREFILL the card; `test:marketing-wordings` W1 (and `test:marketing-consent` U33.draft2) finds any basis writer that
 * names it — or reads a catalogue entry's `defaultWording` — itself, through a barrel or through a helper.
 *
 * ⛔ M2 · A SUGGESTION IS SAVED ONLY ON PURPOSE — AND THAT IS THE SERVER'S RULE, NOT THE CARD'S MANNERS. The card sends a
 * wording nobody has saved only when its "Approve and save this wording" box is ticked (`wordingsToSave`), and says so
 * in the request (`approve.<key>=1`); the server refuses a wording whose history is EMPTY without that field
 * (`admissionProblems`). So a hand-built POST of the nine suggestions approves nothing. Every wording sent also carries
 * the version count it was built on (`base.<key>`), and a stale page is refused rather than quietly superseding a
 * version somebody saved since it opened.
 *
 * ⛔ APPEND-ONLY. A save appends a version only when the text changed (`appendVersion`), the SERVER stamps who and when,
 * and a saved version is never rewritten or removed: the server runs `appendOnlyProblem` over the whole record before
 * every write and refuses one that would. A row recorded under version 2 keeps version 2's words verbatim whatever is
 * saved later, and an import attestation is recognised against ANY saved pair of versions (`savedBasisWordingsOf` →
 * `consent-basis.ts` `isAttestedImportWording`, S14). ⛔ And a row the reader could not read IN FULL is never rewritten
 * (`readWordingHistoriesReport` names what it dropped; the server refuses every save while anything was dropped).
 *
 * ⚠️ THE RECORD IS FLAT — one top-level key per wording — where the spec drew `{ versions: { … } }`. The factory's audit
 * row says which TOP-LEVEL keys moved (`configChanges`, the LEAD-B.1a lesson: "nothing on any screen could show which
 * field moved"), so one key per wording makes every save's `changes` name exactly the wordings it touched; under one
 * `versions` key every save would read "versions changed". The merge still replaces only the keys the server rebuilt.
 *
 * ⛔ ENGLISH, ON PURPOSE — the consent-basis precedent: staff read these in admin chrome and the ledger records locale
 * EN, so an evidence wording is held to the Latin alphabet (a look-alike letter from another alphabet is refused). The
 * refusal sentences are console copy (spec §7.7, reworded where the review asked); a wording's own words are the admin's.
 *
 * Guard: `npm run test:marketing-wordings` (W0–W14, in-process `--prove-red`). Pinned client-safe by
 * `test:client-graph-safe`: it imports only `consent-basis.ts`, `campaign-template.ts` and `contact-fields.ts`.
 */
import {
  ADULT_ATTESTATION_WORDING, CONSENT_BASES, THIRD_PARTY_NOTICE, normalizeProofNote,
  type ConsentBasisKey, type SavedBasisWordings,
} from "./consent-basis";
import { charCount, holdsPhoneRun } from "../contacts/contact-fields";
import { sourcePhraseProblems } from "./campaign-template";

/* ══ THE KEYS ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

/** ⭐ ONE KEY PER WORDING, in the card's order — the card edits every one but `source.phrase` (no box since the owner's
 *  ruling of 2026-10-09; it stays a key so its saved versions read whole). ⛔ Identifiers, never shown to staff (the
 *  card has its own labels). A basis key is `basis.` and the catalogue key, exactly — W0 holds the two lists to each
 *  other. */
export const WORDING_KEYS = [
  "basis.OWN_FORM", "basis.OWN_EVENT", "basis.AGENT_ROSTER", "basis.THIRD_PARTY", "basis.LICENCE_OUTREACH",
  "adult.consent", "adult.list", "adult.test",
  "notice.thirdParty",
  "source.phrase",
] as const;
export type WordingKey = (typeof WORDING_KEYS)[number];

const KEY_SET: ReadonlySet<string> = new Set<string>(WORDING_KEYS);

/** One of the card's keys, exactly as spelled? ⛔ No folding, no trimming, no prototype keys: refused, never guessed. */
export function isWordingKey(key: unknown): key is WordingKey {
  return typeof key === "string" && KEY_SET.has(key);
}

/** The wording key of a catalogue basis — `basis.OWN_FORM` for `OWN_FORM`. */
export function basisWordingKey(key: ConsentBasisKey): WordingKey {
  return `basis.${key}` as WordingKey;
}

/** ⭐ The `data-field` a refusal names for a wording — ONE spelling, read by the action and the card alike, so the
 *  address a server refusal names is always one the card renders. */
export function wordingFieldName(key: WordingKey): string {
  return `wording-${key}`;
}

/* ══ THE SAVED VERSIONS ══════════════════════════════════════════════════════════════════════════════════════════ */

/** One SAVED version of a wording. ⛔ Built by the SERVER (`appendVersion`), never by the browser. */
export type WordingVersion = {
  /** 1, 2, 3 … in save order — the number a record names beside the words (`wordingVersion`). */
  readonly v: number;
  /** ⛔ VERBATIM, as normalised at the save (`normalizeWording`). For the source line a blank text means "no source line". */
  readonly text: string;
  /** The save's instant (ISO), set by the server. ⭐ The date evidence carries — a default has none (U33.draft1). */
  readonly savedAt: string;
  /** Who saved it, set by the server — never from the request: the card's admin (a staff id, from the session), or
   *  `ops: <by>` for a version the ops door saved on Ali's word in the Claude session (2026-10-07, `owner-save.ts`) —
   *  which the card names "the ops door (…)", never an admin. ⛔ So it is NOT always a user id: resolve a name only for
   *  a value that is not a door stamp (`savedByView`, `src/app/admin/system/marketing-sms-view.ts`). */
  readonly savedBy: string;
};

/** Every wording's saved versions, OLDEST FIRST (the newest is last); `[]` for a wording never saved. */
export type WordingHistories = { readonly [K in WordingKey]: readonly WordingVersion[] };

/** What a save hands the factory: the FULL rebuilt history of each wording it changed, and nothing else. */
export type WordingsUpdate = { readonly [K in WordingKey]?: readonly WordingVersion[] };

/** Who saved, and when — both from the server. */
export type VersionStamp = { readonly savedAt: string; readonly savedBy: string };

const NO_VERSIONS: readonly WordingVersion[] = Object.freeze([]);

/** ⭐ Nothing saved — the record's default, and what a process that could not load the record holds (it fails closed:
 *  every reader answers "not saved", and no writer can record anything). */
export const EMPTY_WORDINGS: WordingHistories = Object.freeze(
  Object.fromEntries(WORDING_KEYS.map((k) => [k, NO_VERSIONS])) as Record<WordingKey, readonly WordingVersion[]>,
);

/* ══ THE SUGGESTIONS ═════════════════════════════════════════════════════════════════════════════════════════════ */

function basisDefault(key: ConsentBasisKey): string {
  return CONSENT_BASES.find((b) => b.key === key)?.defaultWording ?? "";
}

const DEFAULTS: Record<WordingKey, string> = {
  "basis.OWN_FORM": basisDefault("OWN_FORM"),
  "basis.OWN_EVENT": basisDefault("OWN_EVENT"),
  "basis.AGENT_ROSTER": basisDefault("AGENT_ROSTER"),
  "basis.THIRD_PARTY": basisDefault("THIRD_PARTY"),
  "basis.LICENCE_OUTREACH": basisDefault("LICENCE_OUTREACH"),
  "adult.consent": ADULT_ATTESTATION_WORDING,
  "adult.list": "I confirm that every number on this list belongs to a person aged 18 or older, and I have recorded where the numbers came from.",
  "adult.test": "I confirm that the person who uses this number is 18 or older.",
  "notice.thirdParty": THIRD_PARTY_NOTICE,
  // ⛔ G5 · the source line's words are Ali's: no suggestion is invented, so it starts blank (no source line).
  "source.phrase": "",
};

/**
 * ⛔ THE SUGGESTIONS — what the card PREFILLS a wording nobody has saved with, and nothing else. A basis writer that
 * reads this records a wording nobody approved, which is exactly what W1 exists to find. Each one passes its own rules
 * (W4), so an admin can approve a suggestion as written — by ticking it and saving.
 */
export const WORDING_DEFAULTS: Readonly<Record<WordingKey, string>> = Object.freeze(DEFAULTS);

/* ══ THE RULES ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

type Need = "brand" | "sms" | "agreed" | "notAgreed" | "licence" | "stop" | "eighteen" | "list" | "sourceLine";

export type WordingRule = {
  /** Characters of the saved form (code points); `null` where another rule measures it — the source line's own rule
   *  counts septets. */
  readonly min: number | null;
  readonly max: number | null;
  /** May be saved blank. Only the source line: blank means "no source line" — and since the owner's ruling of 2026-10-09
   *  no message prints the line, so a blank one refuses nobody. */
  readonly clearable: boolean;
  /** ⛔ An EVIDENCE wording (a basis, an 18+ sentence) is held to the Latin alphabet: a look-alike letter from another
   *  alphabet (a Cyrillic letter drawn like "a", inside "agreed") reads as the word to an officer while no check can
   *  match it. */
  readonly latinOnly: boolean;
  /** What the words must say, in the order the card lists a missing one. */
  readonly needs: readonly Need[];
};

const BASIS_LENGTH = { min: 30, max: 400 } as const;
const ADULT_LENGTH = { min: 10, max: 200 } as const;

const RULES: Record<WordingKey, WordingRule> = {
  // A consent basis states the consent: who, that they agreed, and to what (§5.1).
  "basis.OWN_FORM": { ...BASIS_LENGTH, clearable: false, latinOnly: true, needs: ["brand", "sms", "agreed"] },
  "basis.OWN_EVENT": { ...BASIS_LENGTH, clearable: false, latinOnly: true, needs: ["brand", "sms", "agreed"] },
  "basis.AGENT_ROSTER": { ...BASIS_LENGTH, clearable: false, latinOnly: true, needs: ["brand", "sms", "agreed"] },
  // ⛔ A bought list, and the licence basis, say plainly that the person has NOT agreed — so neither can ever be saved
  // reading as a consent (W5 is the licence basis's own guard).
  "basis.THIRD_PARTY": { ...BASIS_LENGTH, clearable: false, latinOnly: true, needs: ["brand", "notAgreed"] },
  "basis.LICENCE_OUTREACH": { ...BASIS_LENGTH, clearable: false, latinOnly: true, needs: ["brand", "licence", "notAgreed", "stop"] },
  "adult.consent": { ...ADULT_LENGTH, clearable: false, latinOnly: true, needs: ["eighteen"] },
  "adult.list": { ...ADULT_LENGTH, clearable: false, latinOnly: true, needs: ["eighteen", "list"] },
  "adult.test": { ...ADULT_LENGTH, clearable: false, latinOnly: true, needs: ["eighteen"] },
  "notice.thirdParty": { min: 20, max: 400, clearable: false, latinOnly: false, needs: [] },
  // ⭐ The source line's OWN shape rule (`sourcePhraseProblems`, `campaign-template.ts`): at most 30 septets, GSM-7 only,
  // one line, no braces. Kept for the G5 door although no message prints the line since the owner's ruling of 2026-10-09.
  "source.phrase": { min: null, max: null, clearable: true, latinOnly: false, needs: ["sourceLine"] },
};

/** ⭐ THE ONE RULE TABLE — the card's hints and the server's refusals both read it. */
export const WORDING_RULE: Readonly<Record<WordingKey, WordingRule>> = Object.freeze(RULES);

/** What a refusal is about — one code per rule, so a test can ask for exactly the rule it planted. `not_approved` and
 *  `stale` are the SERVER's (they need the saved history, `admissionProblems`); every other code is `wordingProblems`'. */
export type WordingProblemCode =
  | "too_short" | "too_long" | "markup" | "has_phone" | "non_latin"
  | "consent_not_stated" | "consent_negated" | "not_agreed_missing" | "licence_missing" | "stop_missing"
  | "eighteen_missing" | "brand_missing" | "sms_missing" | "list_missing"
  | "source_line" | "unknown_key" | "not_approved" | "stale";

export type WordingProblem = { readonly code: WordingProblemCode; readonly sentence: string };

const NOT_AGREED_HOW = "use “has not agreed”, “never agreed” or “did not agree”, and claim no agreement, opt-in or permission anywhere else";

/** ⭐ THE CARD'S REFUSAL SENTENCES (spec §7.7, reworded where the review asked) — the card shows them under the box as it
 *  is typed, and the server answers with the same ones. The source line's are the renderer's own. Each reads right
 *  under its own box: it speaks of "this wording". */
export const WORDING_SENTENCE = {
  tooShort: (n: number): string => `Write at least ${n} characters.`,
  tooLong: (n: number): string => `Keep it to ${n} characters or fewer.`,
  hasPhone: "Remove the phone number — these words are kept as evidence.",
  markup: "Plain text only — remove < > { }.",
  nonLatin: "Use the ordinary Latin alphabet only — a letter here comes from another alphabet, even if it looks the same.",
  consentNotStated: "This wording must say plainly that the person agreed — a consent basis states the consent.",
  consentNegated: "This wording says the person did not agree, or agreed to nothing — a consent basis must say plainly what they agreed to.",
  notAgreedLicence: `Say plainly that the person has not agreed — ${NOT_AGREED_HOW}: a basis under the licence is never written as consent.`,
  // ⚠️ Not in §7.7, which wrote the licence sentence only: the bought-list basis is not "a basis under the licence".
  notAgreedThirdParty: `Say plainly that the person has not agreed — ${NOT_AGREED_HOW}: a bought or third-party list is never written as consent.`,
  licence: "Name the licence.",
  stop: "Say how the person stops the messages.",
  eighteen: "It must name 18.",
  brand: "It must name 50pick.",
  sms: "It must name SMS.",
  list: "It must refer to the list.",
  unknownKey: "That wording isn't one this card holds — reload the page.",
  notApproved: "Tick “Approve and save this wording” to save a suggestion.",
  stale: "Someone saved this wording since you opened the page — reload to see it.",
} as const;

/**
 * ⭐ THE TEXT AS IT IS SAVED, COUNTED AND CHECKED — the proof note's ONE normaliser (`consent-basis.ts`): composed (NFC)
 * but never compatibility-folded, invisible format characters removed (a zero-width space between digits would hide a
 * number from the screen), composed AGAIN, every run of whitespace or control characters one space, trimmed. ⭐ It is
 * idempotent: normalising a normalised text changes nothing (W4).
 */
export function normalizeWording(raw: unknown): string {
  return normalizeProofNote(raw);
}

/* The words a check looks for, read on a lower-cased copy with a curly apostrophe read as the plain one. ⛔ No regex
   here is typed with a backslash: word edges are lookarounds over explicit classes, and the two Unicode property
   classes are built from their codes (an editing tool decodes typed escapes — repo memory, 2026-10-02). */
const BACKSLASH = String.fromCharCode(92);
const RIGHT_QUOTE = String.fromCharCode(0x2019);
const LEFT_QUOTE = String.fromCharCode(0x2018);
const folded = (text: string): string => text.toLowerCase().split(RIGHT_QUOTE).join("'").split(LEFT_QUOTE).join("'");
const BRAND = /(?<![a-z0-9])50pick(?![a-z0-9])/;
const SMS = /(?<![a-z])sms(?![a-z])/;
const AGREED = /(?<![a-z])agreed(?![a-z])/;
const LICENCE_WORD = /(?<![a-z])licen[cs]e[sd]?(?![a-z])/;
const STOP_WORD = /(?<![a-z])stop(?:s|ped|ping)?(?![a-z])/;
const LIST_WORD = /(?<![a-z])list(?:s|ed)?(?![a-z])/;
const EIGHTEEN = /(?<![0-9])18(?![0-9])/;
/** ⛔ The plain statements of NO agreement a non-consent basis must make (§5.1) — exactly these, case aside. */
const NOT_AGREED_PHRASES: readonly string[] = ["never agreed", "has not agreed", "did not agree"];
/** The words of an agreement itself. */
const AGREEMENT_WORDS = "agree[a-z]*|consent[a-z]*";
/** Everything a basis would CLAIM if it said it outright: agreement, consent, an opt-in, permission, acceptance, a
 *  sign-up, a request, a subscription (m3). */
const CLAIM_WORDS = `${AGREEMENT_WORDS}|opt(?:s|ed|ing)?[ -]?in(?![a-z])|permission[a-z]*|accept[a-z]*`
  + "|sign(?:s|ed|ing)?[ -]?up(?![a-z])|ask(?:s|ed|ing)? for(?![a-z])|subscri(?:b|ption)[a-z]*";
/** A negation up to two words BEFORE the words: "has not agreed", "never opted in", "gave no permission", "hasn't yet
 *  agreed", "without consent", "refused to sign up" — and "disagree". */
const NEGATIONS = "not|never|no|without|neither|nor|refused|declined|cannot|didnt|hasnt|havent|hadnt|wasnt|werent|doesnt|dont|wont|cant|isnt|arent";
const negatedBefore = (words: string): string =>
  `(?:(?<![a-z])(?:${NEGATIONS})|[a-z]n't)(?: +[a-z0-9']+){0,2} +(?:${words})|(?<![a-z])disagree[a-z]*`;
/** A consent basis is refused for denying the AGREEMENT; it may say "no permission is needed to stop". */
const NEGATED_AGREEMENT = new RegExp(negatedBefore(AGREEMENT_WORDS));
const NEGATED_CLAIM_ALL = new RegExp(negatedBefore(CLAIM_WORDS), "g");
const ANY_CLAIM = new RegExp(`(?<![a-z])(?:${CLAIM_WORDS})`);
/** A negation up to two words AFTER "agreed": "agreed to nothing", "agreed to no offers", "agreed, not to SMS" (m3). */
const POST_NEGATION = /(?<![a-z])agreed(?:[ ,;:]+[a-z']+){0,2}[ ,;:]+(?:not|nothing|no|none|neither|nor|never)(?![a-z])/;
/** One letter, and one letter of the Latin script — tested one character at a time. */
const A_LETTER = new RegExp(`^${BACKSLASH}p{L}$`, "u");
const A_LATIN_LETTER = new RegExp(`^${BACKSLASH}p{Script=Latin}$`, "u");

/** A consent basis must SAY the person agreed (`consent_not_stated`) — and never in a negation, before the word or after
 *  it (`consent_negated`): "never agreed" and "agreed to nothing" both hold the word. */
const consentProblem = (t: string): "consent_not_stated" | "consent_negated" | null =>
  !AGREED.test(t) ? "consent_not_stated" : NEGATED_AGREEMENT.test(t) || POST_NEGATION.test(t) ? "consent_negated" : null;
/** A non-consent basis must say plainly that the person has NOT agreed, and claim nothing — no agreement, consent,
 *  opt-in, permission, acceptance, sign-up, request or subscription — anywhere else once its negations are read out. */
const deniesAgreement = (t: string): boolean =>
  NOT_AGREED_PHRASES.some((phrase) => t.includes(phrase)) && !ANY_CLAIM.test(t.replace(NEGATED_CLAIM_ALL, " "));
/** A letter from another alphabet — a Cyrillic letter drawn like "a" is not an "a" to any check, and looks like one to
 *  people. Accented Latin letters ("café") are Latin. */
const holdsOtherScript = (text: string): boolean => Array.from(text).some((ch) => A_LETTER.test(ch) && !A_LATIN_LETTER.test(ch));
/** ⭐ The ONE phone-run rule (`holdsPhoneRun`), and — for a wording only — a solidus and a comma join digits too
 *  ("0712/345/678", "0712,345,678", m6). The shared rule keeps them as separators on purpose, for a date range or a list
 *  of stand numbers in a contact's notes; an evidence wording has neither to protect. */
const holdsPhoneInWording = (text: string): boolean =>
  holdsPhoneRun(text) || holdsPhoneRun(text.split("/").join(" ").split(",").join(" "));

const MARKUP = /[<>{}]/;
/** The source line's own rules refuse a brace in the renderer's words; this keeps only the angle brackets for it. */
const ANGLES = /[<>]/;

/** ⭐ The source line's OWN sentences (`sourcePhraseProblems`). ⛔ Until the owner's ruling of 2026-10-09 they were the
 *  renderer's verdict on the phrase, re-run by every campaign save and send; the renderer no longer prints or judges the
 *  line, so the rule lives with the wording alone (G5 keeps working as it did). */
function sourceLineProblems(text: string): string[] {
  return sourcePhraseProblems(text);
}

/**
 * ⭐ EVERY PROBLEM WITH ONE WORDING, AT ONCE (W4) — the card shows them under the box as it is typed, and the server
 * refuses a save with the same list. The text is normalised first (`normalizeWording`), exactly as it is saved.
 * First every key's own base rules — its length, no `<` `>` `{` `}`, no phone number, and (an evidence wording) the
 * Latin alphabet only — then what its words must say (`WORDING_RULE[key].needs`). A blank source line has no problem:
 * blank means "no source line".
 */
export function wordingProblems(key: WordingKey, raw: string): WordingProblem[] {
  if (!isWordingKey(key)) return [{ code: "unknown_key", sentence: WORDING_SENTENCE.unknownKey }];
  const rule = WORDING_RULE[key];
  const text = normalizeWording(raw);
  if (text === "" && rule.clearable) return [];
  const out: WordingProblem[] = [];
  const add = (code: WordingProblemCode, sentence: string): void => { out.push({ code, sentence }); };
  const chars = charCount(text);
  if (rule.min !== null && chars < rule.min) add("too_short", WORDING_SENTENCE.tooShort(rule.min));
  if (rule.max !== null && chars > rule.max) add("too_long", WORDING_SENTENCE.tooLong(rule.max));
  if ((rule.needs.includes("sourceLine") ? ANGLES : MARKUP).test(text)) add("markup", WORDING_SENTENCE.markup);
  if (holdsPhoneInWording(text)) add("has_phone", WORDING_SENTENCE.hasPhone);
  if (rule.latinOnly && holdsOtherScript(text)) add("non_latin", WORDING_SENTENCE.nonLatin);
  const t = folded(text);
  for (const need of rule.needs) {
    switch (need) {
      case "brand": if (!BRAND.test(t)) add("brand_missing", WORDING_SENTENCE.brand); break;
      case "sms": if (!SMS.test(t)) add("sms_missing", WORDING_SENTENCE.sms); break;
      case "agreed": {
        const problem = consentProblem(t);
        if (problem === "consent_not_stated") add(problem, WORDING_SENTENCE.consentNotStated);
        if (problem === "consent_negated") add(problem, WORDING_SENTENCE.consentNegated);
        break;
      }
      case "notAgreed":
        if (!deniesAgreement(t)) {
          add("not_agreed_missing", key === "basis.LICENCE_OUTREACH" ? WORDING_SENTENCE.notAgreedLicence : WORDING_SENTENCE.notAgreedThirdParty);
        }
        break;
      case "licence": if (!LICENCE_WORD.test(t)) add("licence_missing", WORDING_SENTENCE.licence); break;
      case "stop": if (!STOP_WORD.test(t)) add("stop_missing", WORDING_SENTENCE.stop); break;
      case "eighteen": if (!EIGHTEEN.test(t)) add("eighteen_missing", WORDING_SENTENCE.eighteen); break;
      case "list": if (!LIST_WORD.test(t)) add("list_missing", WORDING_SENTENCE.list); break;
      case "sourceLine": for (const sentence of sourceLineProblems(text)) add("source_line", sentence); break;
    }
  }
  return out;
}

/* ══ THE HISTORY ═════════════════════════════════════════════════════════════════════════════════════════════════ */

/**
 * ⭐ THE ONE WAY A VERSION IS MADE — and only when the text CHANGED. `text` is the normalised text (`normalizeWording`);
 * the stamp comes from the server. An unchanged text answers the SAME array, so nothing is written for it; a wording
 * never saved and still blank (the source line) is unchanged too. ⛔ It never touches a version already there.
 */
export function appendVersion(history: readonly WordingVersion[], text: string, stamp: VersionStamp): readonly WordingVersion[] {
  const newest = history.length > 0 ? history[history.length - 1] : null;
  if (newest === null ? text === "" : newest.text === text) return history;
  return [...history, { v: history.length + 1, text, savedAt: stamp.savedAt, savedBy: stamp.savedBy }];
}

function sameVersion(a: WordingVersion, b: WordingVersion | undefined): boolean {
  return b !== undefined && a.v === b.v && a.text === b.text && a.savedAt === b.savedAt && a.savedBy === b.savedBy;
}

/** Two histories, version by version. */
export function sameHistory(a: readonly WordingVersion[], b: readonly WordingVersion[]): boolean {
  return a.length === b.length && a.every((v, i) => sameVersion(v, b[i]));
}

/** Why a proposed record is not an append to the current one. */
export type HistoryProblem = "unknown_key" | "dropped" | "rewritten" | "misnumbered" | "two_at_once";

/**
 * ⛔ W3 · THE APPEND-ONLY CHECK, run by the server over the WHOLE record before every write: every saved version of
 * every wording is still there, byte for byte, in its place; at most ONE version is added to a wording, numbered next;
 * and no key outside the card's appears. `null` when `after` is a clean append to `before`.
 */
export function appendOnlyProblem(before: WordingHistories, after: WordingHistories): HistoryProblem | null {
  if (!after || typeof after !== "object") return "dropped";
  for (const k of Object.keys(after)) if (!isWordingKey(k)) return "unknown_key";
  for (const k of WORDING_KEYS) {
    const was = before[k] ?? NO_VERSIONS;
    const now = after[k];
    if (!Array.isArray(now) || now.length < was.length) return "dropped";
    for (let i = 0; i < was.length; i++) if (!sameVersion(was[i], now[i])) return "rewritten";
    if (now.length > was.length + 1) return "two_at_once";
    if (now.length === was.length + 1 && now[was.length]?.v !== was.length + 1) return "misnumbered";
  }
  return null;
}

const ISO_INSTANT = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:[.][0-9]{1,3})?Z$/;
const isIsoInstant = (s: unknown): boolean => typeof s === "string" && ISO_INSTANT.test(s) && Number.isFinite(Date.parse(s));

function isVersionAt(x: unknown, v: number): boolean {
  if (!x || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  return Object.keys(o).length === 4 && o.v === v
    && typeof o.text === "string" && normalizeWording(o.text) === o.text
    && isIsoInstant(o.savedAt)
    && typeof o.savedBy === "string" && o.savedBy.trim() !== "";
}

/** A well-formed history: versions 1, 2, 3 … in order, each with its normalised text, an ISO instant and a non-blank
 *  author, and nothing else. ⭐ ONE predicate for hydration, the factory's validation and the read-back, so a record the
 *  factory stores is always one it can read back. */
export function isWordingHistory(raw: unknown): raw is readonly WordingVersion[] {
  return Array.isArray(raw) && raw.every((x, i) => isVersionAt(x, i + 1));
}

function copyHistory(list: unknown): readonly WordingVersion[] {
  return Array.isArray(list)
    ? list.map((x: WordingVersion) => ({ v: x.v, text: x.text, savedAt: x.savedAt, savedBy: x.savedBy }))
    : [];
}

/** What a read of the persisted row made of it: the histories the card may show, and every entry it had to DROP. */
export type RowReading = { readonly histories: WordingHistories; readonly dropped: readonly string[] };

/**
 * The record as hydration reads it from SystemConfig: each card key whose history is well-formed, copied; ⛔ a malformed
 * history reads as NEVER SAVED — readers fail closed (a reader answers "not saved", recognition refuses) and it is never
 * half-used; an unknown key is left out. ⛔ M1 · AND EVERY SUCH ENTRY IS NAMED in `dropped` (a row that is not an object
 * at all is named as "(the whole row)"), because the server must never rewrite what it could not read: while a read
 * dropped anything, every save is refused (`history_unreadable`) and the row is left exactly as it is for a developer.
 */
export function readWordingHistoriesReport(raw: unknown): RowReading {
  const isRecord = !!raw && typeof raw === "object" && !Array.isArray(raw);
  const o: Record<string, unknown> = isRecord ? (raw as Record<string, unknown>) : {};
  const dropped: string[] = [];
  if (!isRecord && raw !== null && raw !== undefined) dropped.push("(the whole row)");
  for (const k of Object.keys(o)) if (!isWordingKey(k)) dropped.push(k);
  const out = {} as Record<WordingKey, readonly WordingVersion[]>;
  for (const k of WORDING_KEYS) {
    const present = Object.prototype.hasOwnProperty.call(o, k);
    const list = present ? o[k] : undefined;
    const readable = present && isWordingHistory(list);
    if (present && !readable) dropped.push(k);
    out[k] = readable ? copyHistory(list) : NO_VERSIONS;
  }
  return { histories: out, dropped };
}

/** The histories alone (`readWordingHistoriesReport`). */
export function readWordingHistories(raw: unknown): WordingHistories {
  return readWordingHistoriesReport(raw).histories;
}

/** The factory's validation of a record about to be stored — its SHAPE only: the card's keys and nothing else, each a
 *  well-formed history. ⚠️ A saved version's words are not re-judged by today's rules: a rule tightened later must
 *  never make every future save fail. The words of the version being added were judged before the write. */
export function wordingsShapeProblem(c: unknown): string | null {
  if (!c || typeof c !== "object" || Array.isArray(c)) return "The saved wordings are unreadable, so nothing was saved.";
  const o = c as Record<string, unknown>;
  for (const k of Object.keys(o)) if (!isWordingKey(k)) return "The saved wordings hold a key this card does not, so nothing was saved.";
  for (const k of WORDING_KEYS) if (!isWordingHistory(o[k])) return "A wording's saved history is malformed, so nothing was saved.";
  return null;
}

/**
 * ⛔ THE RECORD'S OWN MERGE (spec §5: "each record passes its own merge"). Every card key takes the history the server
 * REBUILT for it, or keeps its current one; nothing outside the card's keys survives; every history is a fresh copy, so
 * the factory's cache, its `before` and its `after` never share an array.
 */
export function mergeWordings(current: WordingHistories, updates: WordingsUpdate): WordingHistories {
  const out = {} as Record<WordingKey, readonly WordingVersion[]>;
  for (const k of WORDING_KEYS) {
    const next = Object.prototype.hasOwnProperty.call(updates, k) ? updates[k] : undefined;
    out[k] = copyHistory(next ?? current[k] ?? NO_VERSIONS);
  }
  return out;
}

/** ⭐ What `consent-basis.ts` composes and recognises import attestations from: every SAVED version of each basis and of
 *  the 18+ sentence, oldest first. */
export function savedBasisWordingsOf(h: WordingHistories): SavedBasisWordings {
  const texts = (list: readonly WordingVersion[] | undefined): readonly string[] =>
    Array.isArray(list) ? list.map((x) => x.text).filter((t) => typeof t === "string" && t !== "") : [];
  const basis: Partial<Record<ConsentBasisKey, readonly string[]>> = {};
  for (const b of CONSENT_BASES) basis[b.key] = texts(h[basisWordingKey(b.key)]);
  return { basis, adult: texts(h["adult.consent"]) };
}

/* ══ WHAT THE CARD SENDS (M2 · m1) ═══════════════════════════════════════════════════════════════════════════════ */

/** The request field that approves a suggestion — sent as `1`, for a wording whose history is empty. */
export function approveFieldName(key: WordingKey): string {
  return `approve.${key}`;
}

/** The request field that names the version count a wording was edited from (m1 · a stale page is refused). */
export function baseFieldName(key: WordingKey): string {
  return `base.${key}`;
}

/** What the card knows when it saves: each box's text, each wording's saved versions, and the ticks. */
export type WordingCardState = {
  readonly texts: Readonly<Record<WordingKey, string>>;
  /** Each wording's newest SAVED text (`null` when never saved) and how many versions it has. */
  readonly saved: Readonly<Record<WordingKey, { readonly count: number; readonly text: string | null }>>;
  /** The suggestions an admin ticked "Approve and save this wording" on (an edit ticks it, `approvesOnEdit`). */
  readonly approved: Readonly<Partial<Record<WordingKey, boolean>>>;
};

/** One wording a save will send: its text, whether it approves a suggestion, and the version count it was edited from. */
export type WordingToSave = { readonly key: WordingKey; readonly text: string; readonly approve: boolean; readonly base: number };

/**
 * ⛔ M2 · WHAT A SAVE SENDS — and a suggestion only on purpose. A saved wording goes when its words changed (compared as
 * the server will store them, so a trailing space is no change). A wording nobody saved goes ONLY when its box is
 * ticked — never because some other box was saved — and the source line (no box: it starts blank) goes when it was
 * typed. Either of those approves a suggestion, and says so (`approve`). Every one carries its version count (`base`).
 */
export function wordingsToSave(state: WordingCardState): WordingToSave[] {
  const out: WordingToSave[] = [];
  for (const key of WORDING_KEYS) {
    const raw = state.texts[key] ?? "";
    const text = normalizeWording(raw);
    const saved = state.saved[key] ?? { count: 0, text: null };
    if (saved.count > 0) {
      if (text !== (saved.text ?? "")) out.push({ key, text: raw, approve: false, base: saved.count });
    } else if (WORDING_RULE[key].clearable) {
      if (text !== "") out.push({ key, text: raw, approve: true, base: 0 });
    } else if (state.approved[key] === true) {
      out.push({ key, text: raw, approve: true, base: 0 });
    }
  }
  return out;
}

/** ⭐ An edit to a suggestion nobody saved IS the decision to save it, so its box ticks itself — never for a wording
 *  already saved (an edit there is simply a change) and never for the source line (it has no box; typing is the act). */
export function approvesOnEdit(key: WordingKey, savedCount: number): boolean {
  return savedCount === 0 && !WORDING_RULE[key].clearable;
}

/** The request the card posts, field by field: the text, its `base.<key>`, and `approve.<key>=1` where it approves. */
export function wordingsPostEntries(list: readonly WordingToSave[]): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const w of list) {
    out.push([w.key, w.text]);
    out.push([baseFieldName(w.key), String(w.base)]);
    if (w.approve) out.push([approveFieldName(w.key), "1"]);
  }
  return out;
}

/* ══ THE REQUEST, AS THE SERVER READS IT ═════════════════════════════════════════════════════════════════════════ */

/** What a save may carry: plain TEXT for some of the card's keys, each with the version count it was edited from, and
 *  the approval of a suggestion — ⛔ never a version, a history, a stamp or an author. */
export type WordingsRequest = {
  readonly texts: { readonly [K in WordingKey]?: string };
  readonly approved: { readonly [K in WordingKey]?: true };
  readonly base: { readonly [K in WordingKey]?: number };
};
export type RequestReading = { readonly ok: true; readonly request: WordingsRequest } | { readonly ok: false };

const APPROVE_PREFIX = "approve.";
const BASE_PREFIX = "base.";
const BASE_COUNT = /^[0-9]{1,6}$/;

/**
 * ⛔ W3 · THE REQUEST, READ AS HOSTILE. A plain object whose every field is one of: a card key with its text; that key's
 * `base.<key>` (a whole number); that key's `approve.<key>` (exactly `1`). Every wording sent carries its base, and no
 * base or approval is sent for a wording that is not. Anything else is not understood, and nothing is written: an array
 * or a version object posted for a key (an attempt to rewrite or drop a past version), an unknown field, a number, a
 * file, a prototype trick.
 */
export function readWordingsPatch(raw: unknown): RequestReading {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false };
  const proto = Object.getPrototypeOf(raw);
  if (proto !== Object.prototype && proto !== null) return { ok: false };
  const texts: Partial<Record<WordingKey, string>> = {};
  const approved: Partial<Record<WordingKey, true>> = {};
  const base: Partial<Record<WordingKey, number>> = {};
  for (const name of Object.keys(raw)) {
    const value = (raw as Record<string, unknown>)[name];
    if (typeof value !== "string") return { ok: false };
    if (isWordingKey(name)) {
      texts[name] = value;
    } else if (name.startsWith(APPROVE_PREFIX)) {
      const key = name.slice(APPROVE_PREFIX.length);
      if (!isWordingKey(key) || value !== "1") return { ok: false };
      approved[key] = true;
    } else if (name.startsWith(BASE_PREFIX)) {
      const key = name.slice(BASE_PREFIX.length);
      if (!isWordingKey(key) || !BASE_COUNT.test(value)) return { ok: false };
      base[key] = Number(value);
    } else {
      return { ok: false };
    }
  }
  for (const k of WORDING_KEYS) {
    const sent = texts[k] !== undefined;
    if (sent !== (base[k] !== undefined) || (approved[k] === true && !sent)) return { ok: false };
  }
  return { ok: true, request: { texts, approved, base } };
}

/** One wording's request beside its saved history: the approval, and the version count it was edited from. */
export type KeyRequest = { readonly approved: boolean; readonly base: number };

/**
 * ⛔ THE SERVER'S OWN RULES FOR ONE WORDING (they need the saved history the card cannot vouch for):
 *  · m1 · a stale page — the count it was edited from is not the count saved now — is refused, never a quiet supersede;
 *  · M2 · a wording whose history is EMPTY is a suggestion, saved only with its approval: a POST of suggestions with no
 *    `approve.<key>` approves nothing, whoever built it.
 */
export function admissionProblems(req: KeyRequest, history: readonly WordingVersion[]): WordingProblem[] {
  if (req.base !== history.length) return [{ code: "stale", sentence: WORDING_SENTENCE.stale }];
  if (history.length === 0 && !req.approved) return [{ code: "not_approved", sentence: WORDING_SENTENCE.notApproved }];
  return [];
}

/**
 * ⭐ THE ACTION'S FORM, AS A PLAIN OBJECT — each field name once (a name posted twice is a request no card sends, and
 * reading either value would be a guess); React's own `$ACTION_…` fields (a form posted without JavaScript) left out;
 * every value passed on AS IT CAME, so a file is refused where every value is judged (`readWordingsPatch`). A
 * prototype-free object, so a field called `__proto__` is just an unknown field.
 */
export function patchFromForm(entries: Iterable<readonly [string, unknown]>): { readonly ok: true; readonly patch: Record<string, unknown> } | { readonly ok: false } {
  const patch = Object.create(null) as Record<string, unknown>;
  for (const [name, value] of entries) {
    if (typeof name !== "string") return { ok: false };
    if (name.startsWith("$ACTION_")) continue;
    if (Object.prototype.hasOwnProperty.call(patch, name)) return { ok: false };
    patch[name] = value;
  }
  return { ok: true, patch };
}

/* ══ ONE BUNDLE FOR THE SERVER ═══════════════════════════════════════════════════════════════════════════════════ */

/** The pieces the server's setter and readers are built from — so `test:marketing-wordings` builds the REAL store with
 *  one piece planted, and never a re-implementation of it (the `support-config` "one shape, two instances" lesson). */
export type WordingRules = {
  readonly readPatch: (raw: unknown) => RequestReading;
  readonly normalize: (raw: unknown) => string;
  readonly problems: (key: WordingKey, text: string) => readonly WordingProblem[];
  readonly admit: (req: KeyRequest, history: readonly WordingVersion[]) => readonly WordingProblem[];
  readonly append: (history: readonly WordingVersion[], text: string, stamp: VersionStamp) => readonly WordingVersion[];
  readonly appendOnly: (before: WordingHistories, after: WordingHistories) => HistoryProblem | null;
  readonly saved: (h: WordingHistories) => SavedBasisWordings;
  readonly readRow: (raw: unknown) => RowReading;
};

export const WORDING_RULES: WordingRules = Object.freeze({
  readPatch: readWordingsPatch,
  normalize: normalizeWording,
  problems: wordingProblems,
  admit: admissionProblems,
  append: appendVersion,
  appendOnly: appendOnlyProblem,
  saved: savedBasisWordingsOf,
  readRow: readWordingHistoriesReport,
});
