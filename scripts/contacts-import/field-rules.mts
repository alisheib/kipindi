/**
 * test:contacts-import · section "field-rules" — vb5: THE SHARED FIELD RULES in `src/lib/contacts/contact-fields.ts`.
 *                                                                                          (S10, 2026-10-03)
 *
 * ⭐ WHAT IT HOLDS, EXECUTED. The one phone-run rule — `holdsPhoneRun` refuses, `scrubPhoneRuns` masks, one scanner
 * under both (V1, V2); a phone number refused as a TAG by every writer's door (V3) and as a NAME by the importer and the
 * form (V4); the ONE email rule and the two doors that word it (V5); the form's every-problem verdict, moved out of
 * `contact-write.ts` so the browser can ask it (V6); and the filter's tag reader — the write rule minus the phone rule
 * (V7). Every vector is a LITERAL typed here: the spellings vb5 names, built from their codes where a character is
 * invisible or not ASCII (repo memory: an editing tool decodes typed escapes).
 *
 * ⭐ PROVED BY MUTATION. Every label is named by at least one red plant, and each plant swaps ONE member of the bundle,
 * so the label it must break is its own: where a label compares two doors, the second door is read from the module
 * itself, not from the bundle, so a plant on one door cannot turn a neighbour red first.
 *
 * ⛔ IN-PROCESS. Every plant is a replacement bundle built in memory; this module reads no file and makes no
 * file-writing call.
 */
import type { ImportSection, RedPlant, SectionContext } from "../contacts-import.test.mts";
import {
  CONTACT_LIMITS,
  EMAIL_SHAPE_SENTENCE,
  EMAIL_TOO_LONG_SENTENCE,
  NAME_HAS_PHONE_SENTENCE,
  NOTES_TOO_LONG_SENTENCE,
  TAG_CHARACTERS_SENTENCE,
  TAG_HAS_PHONE_SENTENCE,
  checkContactEmail,
  checkTags,
  contactFormProblems,
  draftContactRow,
  holdsPhoneRun,
  parseFilterTag,
  parseOneTag,
  parseTags,
  phoneNumberIn,
  scrubPhoneRuns,
  tagKey,
  type ColumnMapping,
  type ContactDraft,
  type ContactFormInput,
  type ContactFormProblem,
  type EmailVerdict,
  type OneTagVerdict,
  type TagsVerdict,
} from "../../src/lib/contacts/contact-fields.ts";

/* ══ THE BUNDLE UNDER TEST ══════════════════════════════════════════════════════════════════════ */

export type RulesImpl = {
  readonly holds: (text: string) => boolean;
  readonly scrub: (text: string) => string;
  readonly check: (tags: readonly string[]) => string | null;
  readonly parse: (raw: string) => TagsVerdict;
  readonly one: (raw: string) => OneTagVerdict;
  readonly filter: (raw: string) => OneTagVerdict;
  readonly draft: (cells: readonly string[], mapping: ColumnMapping) => ContactDraft;
  readonly email: (raw: unknown) => EmailVerdict;
  readonly form: (input: ContactFormInput) => readonly ContactFormProblem[];
};

/** The SHIPPED bundle: the module's own exports. */
function real(): RulesImpl {
  return {
    holds: holdsPhoneRun,
    scrub: scrubPhoneRuns,
    check: (tags) => checkTags(tags),
    parse: parseTags,
    one: parseOneTag,
    filter: parseFilterTag,
    draft: draftContactRow,
    email: checkContactEmail,
    form: contactFormProblems,
  };
}

/* ══ THE VECTORS — literals, every invisible or non-ASCII character built from its code ═════════════ */

const ch = (...codes: number[]): string => String.fromCharCode(...codes);
const NUL = ch(0);
const NBSP = ch(0xa0);
const EN_DASH = ch(0x2013);
const ZWSP = ch(0x200b);
/** The full-width full stop — NFKC reads it as a full stop. */
const FW_STOP = ch(0xff0e);
const E_ACUTE = ch(0xe9);
/** Digits in their full-width forms (U+FF10 onward) — what a phone keyboard in CJK mode types. */
const fullWidth = (s: string): string => s.replace(/[0-9]/g, (d) => ch(0xff10 + Number(d)));
/** Digits in their Arabic-Indic forms (U+0660 onward) — another keyboard's digits, which NFKC leaves as they are. */
const arabicIndic = (s: string): string => s.replace(/[0-9]/g, (d) => ch(0x660 + Number(d)));
/** "Hindi" in Devanagari: two vowel signs and an anusvara are combining marks. */
const HINDI = ch(0x939, 0x93f, 0x902, 0x926, 0x940);
/** "VIP" in full-width letters — NFKC stores it as "vip". */
const FULL_VIP = ch(0xff36, 0xff29, 0xff30);
/** The keycap one: a digit, a variation selector and the enclosing keycap — both marks. */
const KEYCAP_ONE = ch(0x31, 0xfe0f, 0x20e3);
const MASK = "••••";
/** A sample sheet number — it appears in no fixture, so it never collides with a vector. */
const SAMPLE_PHONE = "0745 100 200";

/** ⭐ The spellings vb5 names — each a phone number, each refused as a tag and as a name. */
const PHONE_SPELLINGS: readonly string[] = [
  "0712 345 678",
  "0712.345.678",
  "(0712) 345 678",
  `0712${EN_DASH}345${EN_DASH}678`,
  `0712${NBSP}345${NBSP}678`,
  fullWidth("0712345678"),
];
/** More joins the one rule reads: the low line (new for the consent screen), a plus with brackets, square brackets, a
 *  zero-width space, and full-width full stops (only NFKC reads those as full stops). */
const MORE_PHONES: readonly string[] = [
  "0712_345_678",
  "+255 (712) 345-678",
  "[0712] 345 678",
  `0712${ZWSP}345${ZWSP}678`,
  `${fullWidth("0712")}${FW_STOP}${fullWidth("345")}${FW_STOP}${fullWidth("678")}`,
  // vb3 · another keyboard's digits are READ (readAsciiDigits) — refused as the number they spell, masked to 0–9.
  arabicIndic("0712 345 678"),
];
const ALL_PHONES: readonly string[] = [...PHONE_SPELLINGS, ...MORE_PHONES];
/** ⛔ Not numbers: a slash or a comma never joins, eight digits are not nine, and a short number in a name stays. */
const NOT_PHONES: readonly string[] = ["12/03/2026", "stand 12, 14", "1234 5678", "0712/345/678", "0712,345,678", "mteja 2026", "Juma 0712"];
/** ⭐ vb5 review m3 · runs of nine or more digits that hold NO Tanzanian mobile number — a deposit band, a photo's name, a
 *  dotted date with a time, a long reference, nine digits whose prefix no operator holds: MASKED in a masked file (a run is
 *  a run — the safe direction), never REFUSED. */
const MASKED_NOT_REFUSED: readonly string[] = [
  "5000-10000", "10000-50000", "IMG_20261003_143052", "01.11.2026 7.30 am", "123.456.789", "TCK-2026100312345",
  // vb3 · read, so judged like any figure: a band in Arabic-Indic digits holds no number.
  arabicIndic("5000-10000"),
];

/** The importer's own sentences for a name holding a number — typed as LITERALS, never computed by the code under test. */
const NAME_CELL_HOLDS_PHONE = "The Name cell holds a phone number — remove the number (a name can be left empty).";
const PARTS_HOLD_PHONE = "First name and Last name together hold a phone number — remove the number (a name can be left empty).";

const REFUSED_EMAILS: readonly string[] = [
  "amina@example.com.", "mailto:a@b.tz", "<a@b.tz>", "a@b.tz,", `a${ZWSP}@b.tz`, "a@.b.tz", "a@b..tz", "a@b.tz;",
  "a b@c.tz", "a@b@c.tz", '"a"@b.tz', "a@b", "@b.tz", `a@b.tz${NUL}`,
];
const ACCEPTED_EMAILS: readonly string[] = [
  `jos${E_ACUTE}@x.tz`, "Amina.Juma@Example.com", "a@b.co.tz", "  a@b.tz  ", `${"a".repeat(242)}@example.com`,
  "first.last+news@sub.example.co.tz", "o'neil@example.com",
];

const ROW: ColumnMapping = { phone: 0, name: 1, email: 2, tags: 3, notes: 4 };
const blankForm = (patch: Partial<ContactFormInput>): ContactFormInput => ({ displayName: "", email: "", notes: "", tags: "", ...patch });
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
/** A detail line with every control, space-like and format character spelled out, so a failure never prints one raw. */
const visible = (s: string): string =>
  Array.from(s)
    .map((c) => {
      const n = c.codePointAt(0) ?? 0;
      return n < 32 || n === 127 || n === 0xa0 || (n >= 0x2000 && n <= 0x206f) || n === 0xfeff ? `<U+${n.toString(16).toUpperCase()}>` : c;
    })
    .join("");
const show = (xs: readonly string[]): string => (xs.length === 0 ? "none" : xs.map((x) => JSON.stringify(visible(x))).join(", "));

/* ══ THE ASSERTION LABELS — one place, so a plant names exactly the line it must turn red ═══════════ */

export const RULES_LABELS = {
  V1: "V1 · ⭐ ONE PHONE-RUN RULE — a Tanzanian mobile number written with whitespace (no-break too), a full stop, brackets, a plus, a low line or any dash between its digits, read through NFKC and through invisible characters, is refused; a slash or a comma never joins, eight digits are not one, and (vb5 review m3) a run holding no such number — a deposit band, a photo's name, a dotted date with a time, a long reference — is not refused; another keyboard's digits are read (vb3), and phoneNumberIn names the digits it found (vb4)",
  V2: "V2 · ⛔ scrubPhoneRuns masks EVERY run holdsPhoneRun refuses — the bracketed, dotted, no-break-space, en-dash and full-width spellings each as four bullets and the last two digits — and, the safe direction, the runs it does not refuse too; it leaves a date, a list and a short number as written",
  V3: "V3 · ⛔ a TAG holding a phone number is refused by every writer's door — checkTags, parseTags (the form), parseOneTag (the bulk box) and an imported row — with ONE sentence that never echoes it",
  V4: "V4 · ⛔ a NAME holding a phone number is refused — an imported Name cell, First + Last composed, and the form, each in its own words and never echoed — while a name with a date or a short number is kept",
  V5: "V5 · ⭐ ONE EMAIL RULE — checkContactEmail refuses a trailing, leading or doubled dot in the domain, a mailto link, angle brackets, a trailing comma, a zero-width space and a NUL, accepts an accented local part, holds 254 characters, and the importer and the form answer exactly as it does",
  V6: "V6 · contactFormProblems returns EVERY problem, one per field in the form's order and words — a bad email plus a phone-number tag is two problems, all four fields wrong is four, a clean form none",
  V7: "V7 · parseFilterTag reads a tag as the book stores it — a full-width VIP is vip, Devanagari and a keycap keep their marks — refuses what no writer could store, and still READS a phone-number tag (the write rule refuses it; a stored one stays addressable, and OD55 refuses it in a campaign)",
} as const;
const L = RULES_LABELS;

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════════════════════════ */

function run(ctx: SectionContext<RulesImpl>): void {
  const { impl, ok, log } = ctx;
  log(`${ALL_PHONES.length} phone spellings · ${NOT_PHONES.length} non-numbers · ${MASKED_NOT_REFUSED.length} masked, not refused · ${REFUSED_EMAILS.length} refused and ${ACCEPTED_EMAILS.length} accepted addresses`);

  // ── V1 · THE ONE PHONE-RUN RULE ──────────────────────────────────────────────────────────────
  const missed = ALL_PHONES.filter((v) => !impl.holds(v));
  const overReach = [...NOT_PHONES, ...MASKED_NOT_REFUSED].filter((v) => impl.holds(v));
  // vb4 · the finding itself, for the door that names the number (a campaign's name): the digits of the stretch it read.
  const finds = [["Week 40 0712 345 678", "0712345678"], ["List 1 0712345678", "0712345678"], ["5000-10000", null]] as const;
  const misread = finds.filter(([text, want]) => phoneNumberIn(text) !== want).map(([text]) => text);
  ok(L.V1, missed.length === 0 && overReach.length === 0 && misread.length === 0,
    `missed ${show(missed)} · flagged wrongly ${show(overReach)} · phoneNumberIn misread ${show(misread)}`);

  // ── V2 · THE MASK IS THE SAME RULE ───────────────────────────────────────────────────────────
  // ⚠️ The agreement is read against the MODULE's detector, so a plant on `holds` (V1) cannot turn V2 red.
  const masked = ALL_PHONES.map((v) => ({ v, out: impl.scrub(`call ${v} today`) }));
  const unmasked = masked.filter(({ out }) => holdsPhoneRun(out) || !out.includes(`${MASK}78`)).map(({ v }) => v);
  const touched = NOT_PHONES.filter((v) => impl.scrub(v) !== v);
  const disagree = [...ALL_PHONES, ...NOT_PHONES].filter((v) => (impl.scrub(v) !== v) !== holdsPhoneRun(v));
  const unstable = masked.filter(({ out }) => impl.scrub(out) !== out).map(({ v }) => v);
  // vb5 review m3 · masking more than is refused is the safe direction: a run holding no number is still masked.
  const figuresBare = MASKED_NOT_REFUSED.filter((v) => impl.scrub(v) === v);
  ok(L.V2, unmasked.length === 0 && touched.length === 0 && disagree.length === 0 && unstable.length === 0 && figuresBare.length === 0,
    `not masked ${show(unmasked)} · changed ${show(touched)} · disagree with holdsPhoneRun ${show(disagree)} · not stable ${show(unstable)} · figures left bare ${show(figuresBare)} · e.g. ${JSON.stringify(visible(masked[2]?.out ?? ""))}`);

  // ── V3 · A TAG NEVER HOLDS A NUMBER ──────────────────────────────────────────────────────────
  const tagLeaks = ALL_PHONES.filter((v) => {
    const viaCheck = impl.check([tagKey(v)]);
    const viaParse = impl.parse(`vip, ${v}`);
    const viaOne = impl.one(v);
    const viaRow = impl.draft([SAMPLE_PHONE, "", "", v, ""], ROW).problems.filter((p) => p.field === "tags");
    return !(viaCheck === TAG_HAS_PHONE_SENTENCE
      && !viaParse.ok && viaParse.sentence === TAG_HAS_PHONE_SENTENCE
      && !viaOne.ok && viaOne.sentence === TAG_HAS_PHONE_SENTENCE
      && viaRow.length === 1 && viaRow[0].sentence === TAG_HAS_PHONE_SENTENCE);
  });
  const tagControls = impl.check(["vip", "mteja 2026", "a-b_c"]) === null && impl.parse("stand 12, 14").ok && impl.one("vip2026").ok
    && impl.one("5000-10000").ok && impl.check(["10000-50000", "deposit 5000-10000"]) === null;
  ok(L.V3, tagLeaks.length === 0 && tagControls && !/[0-9]/.test(TAG_HAS_PHONE_SENTENCE),
    `accepted somewhere: ${show(tagLeaks)} · controls ${tagControls ? "pass" : "REFUSED"}`);

  // ── V4 · A NAME NEVER HOLDS A NUMBER ─────────────────────────────────────────────────────────
  const nameLeaks = ALL_PHONES.filter((v) => {
    const row = impl.draft([SAMPLE_PHONE, v], { phone: 0, name: 1 }).problems;
    const form = impl.form(blankForm({ displayName: v }));
    return !(same(row, [{ field: "name", sentence: NAME_CELL_HOLDS_PHONE }]) && same(form, [{ field: "displayName", sentence: NAME_HAS_PHONE_SENTENCE }]));
  });
  const parts = impl.draft(["0712", "345 678", SAMPLE_PHONE], { first_name: 0, last_name: 1, phone: 2 }).problems;
  const KEPT = ["12/03/2026", "stand 12, 14", "Juma 0712", "Asha Mwakalinga", "Kikundi 5000-10000", "Promo 01.11.2026 7.30 am"];
  const notKept = KEPT.filter((v) => impl.draft([SAMPLE_PHONE, v], { phone: 0, name: 1 }).problems.length !== 0
    || impl.form(blankForm({ displayName: v })).length !== 0);
  ok(L.V4, nameLeaks.length === 0 && same(parts, [{ field: "name", sentence: PARTS_HOLD_PHONE }]) && notKept.length === 0
    && !/[0-9]/.test(NAME_CELL_HOLDS_PHONE + PARTS_HOLD_PHONE + NAME_HAS_PHONE_SENTENCE),
    `accepted somewhere: ${show(nameLeaks)} · First + Last ${JSON.stringify(parts)} · refused though fine: ${show(notKept)}`);

  // ── V5 · THE ONE EMAIL RULE, AND THE TWO DOORS THAT WORD IT ──────────────────────────────────
  const emailLeaks = REFUSED_EMAILS.filter((v) => {
    const r = impl.email(v);
    return r.ok || r.sentence !== EMAIL_SHAPE_SENTENCE;
  });
  const emailWrong = ACCEPTED_EMAILS.filter((v) => {
    const r = impl.email(v);
    return !r.ok || r.email !== v.trim().toLowerCase();
  });
  const tooLong = impl.email(`${"a".repeat(243)}@example.com`);
  const blank = impl.email("   ");
  const doorsDisagree = [...REFUSED_EMAILS, ...ACCEPTED_EMAILS].filter((v) => {
    const r = impl.email(v);
    const row = draftContactRow([SAMPLE_PHONE, v], { phone: 0, email: 1 }).problems.filter((p) => p.field === "email");
    const form = contactFormProblems(blankForm({ email: v })).filter((p) => p.field === "email");
    return r.ok ? row.length + form.length !== 0 : row.length !== 1 || form.length !== 1 || form[0].sentence !== r.sentence;
  });
  ok(L.V5, emailLeaks.length === 0 && emailWrong.length === 0 && !tooLong.ok && tooLong.sentence === EMAIL_TOO_LONG_SENTENCE
    && blank.ok && blank.email === null && doorsDisagree.length === 0,
    `accepted though malformed: ${show(emailLeaks)} · refused though fine: ${show(emailWrong)} · 255 characters ${tooLong.ok ? "ACCEPTED" : "refused"} · the doors disagree on ${show(doorsDisagree)}`);

  // ── V6 · EVERY PROBLEM, IN THE FORM'S ORDER AND WORDS ────────────────────────────────────────
  const two = impl.form({ displayName: "Amina", email: "amina@example.com.", notes: "", tags: "vip, 0712 345 678" });
  const four = impl.form({ displayName: "Juma 0712 345 678", email: "a@b..tz", notes: "n".repeat(CONTACT_LIMITS.notes + 1), tags: "dar!" });
  const none = impl.form({ displayName: "Amina Juma", email: "amina@example.com", notes: "Met at the stand.", tags: "vip, dar" });
  ok(L.V6, same(two, [{ field: "email", sentence: EMAIL_SHAPE_SENTENCE }, { field: "tags", sentence: TAG_HAS_PHONE_SENTENCE }])
    && same(four, [
      { field: "displayName", sentence: NAME_HAS_PHONE_SENTENCE },
      { field: "email", sentence: EMAIL_SHAPE_SENTENCE },
      { field: "notes", sentence: NOTES_TOO_LONG_SENTENCE },
      { field: "tags", sentence: TAG_CHARACTERS_SENTENCE },
    ])
    && none.length === 0,
    `two → ${JSON.stringify(two)} · four → ${four.map((p) => p.field).join(",")} · clean → ${none.length}`);

  // ── V7 · THE FILTER READS WHAT THE BOOK STORES ───────────────────────────────────────────────
  const fw = impl.filter(FULL_VIP);
  const hi = impl.filter(HINDI);
  const kc = impl.filter(KEYCAP_ONE);
  const storedNumber = impl.filter("0712345678");
  const writeRefuses = !parseOneTag("0712345678").ok;
  const readsWrongly = ["bad!", "-", "a,b", "", "a".repeat(CONTACT_LIMITS.tag + 1)].filter((v) => impl.filter(v).ok);
  ok(L.V7, same(fw, { ok: true, tag: "vip" }) && same(hi, { ok: true, tag: HINDI }) && same(kc, { ok: true, tag: KEYCAP_ONE })
    && same(storedNumber, { ok: true, tag: "0712345678" }) && writeRefuses && readsWrongly.length === 0,
    `full-width VIP → ${JSON.stringify(fw)} · Devanagari ${hi.ok ? "read" : "REFUSED"} · keycap ${kc.ok ? "read" : "REFUSED"} · a stored number ${storedNumber.ok ? "read" : "REFUSED"} · read though unstorable: ${show(readsWrongly)}`);
}

/* ══ THE RED PLANTS — each a defect somebody could plausibly write, built in memory ═════════════════ */

/** The email shape this module kept before vb5 — no format characters, no punctuation, no domain-dot rule. */
const OLD_EMAIL_SHAPE = /^[^\s@\p{Cc}]+@[^\s@\p{Cc}]+\.[^\s@\p{Cc}]+$/u;
const oldEmail = (raw: unknown): EmailVerdict => {
  const e = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (e === "") return { ok: true, email: null };
  if (Array.from(e).length > CONTACT_LIMITS.email) return { ok: false, reason: "too_long", sentence: EMAIL_TOO_LONG_SENTENCE };
  return OLD_EMAIL_SHAPE.test(e) ? { ok: true, email: e } : { ok: false, reason: "shape", sentence: EMAIL_SHAPE_SENTENCE };
};

/** The tag reader `audience.ts` kept before vb5 — no NFKC, no combining marks, its length in UTF-16 units. */
const OLD_TAG_SHAPE = /^[\p{L}\p{N} _-]{1,32}$/u;
const oldTagOf = (raw: string): OneTagVerdict => {
  const t = String(raw ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  return OLD_TAG_SHAPE.test(t) ? { ok: true, tag: t } : { ok: false, sentence: TAG_CHARACTERS_SENTENCE };
};

const PLANTS: readonly RedPlant<RulesImpl>[] = [
  {
    name: "vb5 review m3 · the first build's broad rule — any run of nine digits refuses: a deposit band and a photo's name are refused as phone numbers",
    expect: L.V1,
    impl: () => ({ ...real(), holds: (t: string) => scrubPhoneRuns(String(t)) !== String(t) }),
  },
  {
    name: "the phone-run detector without NFKC — a number written with full-width full stops passes",
    expect: L.V1,
    impl: () => ({ ...real(), holds: (t: string) => /\p{Nd}{9,}/u.test(String(t).replace(/[\s.()\[\]+_\p{Pd}\p{Cf}\p{M}]/gu, "")) }),
  },
  {
    name: "the consent screen's own copy, where the low line never joined — 0712_345_678 passes",
    expect: L.V1,
    impl: () => ({ ...real(), holds: (t: string) => /\p{Nd}{9,}/u.test(String(t).normalize("NFKC").replace(/[\s.()\[\]+\p{Pd}\p{Cf}\p{M}]/gu, "")) }),
  },
  {
    name: "M7 · the audience file's single-separator mask — bracketed, dotted, no-break-space and en-dash numbers ride into a masked export whole",
    expect: L.V2,
    impl: () => ({
      ...real(),
      scrub: (s: string) => String(s).replace(/[0-9](?:[ _-]?[0-9]){8,}/g, (m) => `${MASK}${m.replace(/[^0-9]/g, "").slice(-2)}`),
    }),
  },
  {
    name: "checkTags without the phone rule — a tag of 0712 345 678 prints in full to a masked role",
    expect: L.V3,
    impl: () => ({
      ...real(),
      check: (tags: readonly string[]) => {
        const r = checkTags(tags);
        // The rule as it ran before vb5: the same tags with every digit a letter meet every other rule the same way.
        return r === TAG_HAS_PHONE_SENTENCE ? checkTags(tags.map((t) => t.replace(/\p{Nd}/gu, "x"))) : r;
      },
    }),
  },
  {
    name: "draftContactRow without the name rule — an imported Name cell keeps the number",
    expect: L.V4,
    impl: () => ({
      ...real(),
      draft: (cells: readonly string[], mapping: ColumnMapping) => {
        const d = draftContactRow(cells, mapping);
        return { ...d, problems: d.problems.filter((p) => !(p.field === "name" && p.sentence.includes("phone number"))) };
      },
    }),
  },
  {
    name: "the old email shape — a trailing dot, a mailto link, angle brackets and a zero-width space all pass",
    expect: L.V5,
    impl: () => ({ ...real(), email: oldEmail }),
  },
  {
    name: "the form answers with its FIRST problem only (contact-write's shape before vb5) — the browser cannot mark every field",
    expect: L.V6,
    impl: () => ({ ...real(), form: (input: ContactFormInput) => contactFormProblems(input).slice(0, 1) }),
  },
  {
    name: "the address's old tag copy — no NFKC and no combining marks: a Devanagari tag has no address, a full-width one misses",
    expect: L.V7,
    impl: () => ({ ...real(), filter: oldTagOf }),
  },
  {
    name: "the phone rule applied to READS — a stored phone tag cannot be addressed or taken off, and OD55's own sentence is pre-empted",
    expect: L.V7,
    impl: () => ({ ...real(), filter: parseOneTag }),
  },
];

export const fieldRulesSection: ImportSection<RulesImpl> = {
  name: "field-rules",
  owner: "vb5",
  real,
  run,
  plants: PLANTS,
};
