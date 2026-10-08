/**
 * U22 · THE NUMBER FIELD'S LIVE VERDICT — what the Add a contact dialog says while an officer types or pastes a
 * number.                                                                                   (S10, 2026-10-02)
 *
 * ⭐ EVERY SENTENCE IS parseTzNumber's OWN. `tz-msisdn.ts` is the one place that knows what a Tanzanian number is,
 * and it already writes one human sentence per verdict. This module decides only WHEN a sentence is said:
 *   · empty   — nothing typed: no chip, no sentence;
 *   · typing  — fewer than nine digits and the field not settled: "4 of 9 digits", never a refusal on every
 *               keystroke (a too-short sentence while somebody is still typing is a false alarm);
 *   · refused at TWO digits — a prefix whose row is allocated but NOT sendable (Telxer's 064): that row's own note,
 *               because a mobile verdict depends on the first two digits alone (`tz-msisdn.ts` §mobile);
 *   · settled short — the field left (blur) or Save pressed: parseTzNumber's too-short sentence;
 *   · nine digits — ok or refused, straight from parseTzNumber.
 * ⭐ THE OPERATOR CHIP AT TWO DIGITS, from the ONE table (`ndcRow`, decision C10) — never a hand-typed map. The chip
 * names the RANGE HOLDER, never "the network this person is on": a ported number keeps its prefix (`tz-msisdn.ts` ①).
 * ⭐ A PASTE IS JUDGED BEFORE TRUNCATION. PhoneInput keeps nine digits, so a pasted `+254 712 345 678` reaches the
 * field as `254712345` — which parseTzNumber would call a landline in Mbeya, a false sentence about a Kenyan number.
 * The raw paste (`PhoneInput`'s `onPasteRaw`) is judged first: a foreign or too-long paste is refused with ITS sentence.
 * ⛔ vb7 · A PASTE LONGER THAN ANY PHONE NUMBER IS REFUSED WHOLE (`contactNumberTooLong` — the importer's own limit,
 * `CONTACT_LIMITS.phone`, decision C12). "Amina Juma, Mlimani City stand, 0712 345 678" holds a valid number, so the box
 * showed it and the save kept forty characters of the paste, which did not even hold the number. Now it is refused with
 * one sentence (`CONTACT_PASTE_TOO_LONG`) and never sent, and `addContact` refuses the same text by the same rule.
 * ⭐ vb7 · THE SEARCH BOX READS A NUMBER HERE TOO (`contactSearchNumber`): "Whole number — matched exactly", the parser's
 * own reason for a number attempt it refuses, or nothing for a name — the contacts page's echo and its empty state.
 *
 * ⛔ DISPLAY ONLY. The server never trusts this verdict: `addContact` parses the submitted text again
 * (`src/lib/server/contacts/contact-write.ts`), and the unique index — not this module — is the duplicate check.
 *
 * Pure and client-safe: it imports `../tz-msisdn`, `../phone-normalize` and (vb7) `./contact-fields` — the ONE limits
 * table — all pinned, all server-free, and nothing else: no lib/server, no node:, no React. Pinned in
 * `test:client-graph-safe` (decision M3); guarded by `test:contacts-form` §1 and, for the search reading,
 * `test:contacts-page` 19 — each with in-process red plants.
 */
import { parseTzNumber, ndcRow, TZ_OPERATORS, TZ_COUNTRY_CODE } from "../tz-msisdn";
import type { TzVerdict } from "../tz-msisdn";
import { normalizeTzLocalDigits } from "../phone-normalize";
import { CONTACT_LIMITS, charCount } from "./contact-fields";

/** A Tanzanian number has nine digits after +255. */
export const NATIONAL_DIGITS = 9;

export type ContactNumberStage = "empty" | "typing" | "ok" | "refused";

/** The chip beside the number: the range holder of its first two digits. */
export type ContactOperatorChip = {
  /** The holder's brand ("Yas") — `TZ_OPERATORS[row.operator].brand`, so a rebrand changes one label. */
  brand: string;
  /** The two-digit prefix after +255 ("71"). */
  ndc: string;
  /** Set where the regulator and the carrier data disagree about this prefix (060) — accepted, and said. */
  disputed: string | null;
  /** False where the prefix is allocated on paper and reaches nobody (064). */
  sendable: boolean;
};

export type ContactNumberVerdict = {
  stage: ContactNumberStage;
  /** The national digits the field holds (at most nine) — PhoneInput's own value. */
  digits: string;
  /** From two digits on, when the ONE table holds the prefix. */
  operator: ContactOperatorChip | null;
  /** parseTzNumber's verdict once the number has been judged (ok / refused); null while empty or typing, and for a
   *  paste refused by its length before the parser was asked (vb7). */
  verdict: TzVerdict | null;
  /** parseTzNumber's sentence (ok / refused), the progress line (typing), or null (empty). */
  sentence: string | null;
};

/** The typing line — progress, never a refusal. */
export function contactTypingLine(n: number): string {
  return `${n} of ${NATIONAL_DIGITS} digits`;
}

/** ⛔ vb7 · the one sentence for a paste longer than any phone number — it is never sent, and never cut into one. */
export const CONTACT_PASTE_TOO_LONG = "That paste is longer than a phone number — paste the number alone.";

/**
 * ⛔ vb7 · IS THIS TEXT LONGER THAN A PHONE NUMBER IS EVER WRITTEN? More than `CONTACT_LIMITS.phone` characters once
 * trimmed — the importer's own limit for a Phone cell (decision C12), counted as a person counts them (`charCount`). The
 * dialog refuses such a paste before the lookup, and `addContact` refuses the same text on the server.
 */
export function contactNumberTooLong(raw: string): boolean {
  return charCount(String(raw ?? "").trim()) > CONTACT_LIMITS.phone;
}

/**
 * The chip for the first two digits, from the ONE table — null below two digits, and null for a prefix no operator
 * holds (a landline's 22 is not a mobile range, so it has no holder to name).
 */
export function contactOperatorChip(digits: string): ContactOperatorChip | null {
  const d = String(digits ?? "");
  if (d.length < 2) return null;
  const row = ndcRow(d.slice(0, 2));
  if (row === null) return null;
  return { brand: TZ_OPERATORS[row.operator].brand, ndc: row.ndc, disputed: row.disputed ?? null, sendable: row.sendable };
}

/**
 * The live verdict for the number field.
 * · `value` — what the field holds (PhoneInput hands over nine digits at most; any spelling is reduced here too);
 * · `pasted` — the RAW text of the paste that produced `value`, when the last edit was a paste;
 * · `settled` — the field was left (blur) or Save was pressed, so a short number is now a refusal.
 */
/**
 * ⭐ WHICH TEXT THE SERVER PARSES AFTER A PASTE (the U22 review, S10). A paste is judged on the text that was pasted —
 * so a +254… is refused as foreign before the box truncates it to nine digits — but ONLY when that paste produced the
 * WHOLE field. PhoneInput merges a SHORT paste that fits at the caret into digits already there (a whole number, or a
 * paste that would push the box past nine digits, REPLACES the box — vb3); the merged box is then the number, and the
 * clipboard text is not: saving it would save a number the screen never showed (and refuse a valid box whose pasted
 * tail alone is short). Null means "use the box".
 */
export function governingPaste(paste: string | null, fieldValue: string): string | null {
  return paste !== null && normalizeTzLocalDigits(paste) === fieldValue ? paste : null;
}

/**
 * ⭐ C2 (2026-10-09) · A NUMBER TYPED WITH ITS OWN "+" IS JUDGED AS WRITTEN. The box keeps digits only, so a "+" typed
 * first vanished on the keystroke and `+254 712 345 678` reached the box as `254 712 345` — and the dialog told the
 * officer it was "a landline in Katavi, Mbeya, Rukwa, Ruvuma and Songwe" (measured on the contacts audit at 360 and 1280).
 * The paste path never had this defect (1.5); typing did. So the form reports `typedPlus` — the box was empty when a "+"
 * was typed — and once the digits after it cannot be Tanzania's own code, the number is judged as international,
 * with parseTzNumber's own foreign sentence. `+2` and `+25` are still on their way to `+255` and read as typing; `+255`
 * itself is stripped by the box (`normalizeTzLocalDigits`), and the form clears the flag when that empties the box.
 */
export function contactNumberVerdict(input: { value: string; pasted?: string | null; settled?: boolean; typedPlus?: boolean }): ContactNumberVerdict {
  const digits = normalizeTzLocalDigits(String(input.value ?? ""));

  // ⭐ THE PASTE FIRST: judged before the field's nine-digit cap could make it lie.
  const pasted = input.pasted ?? null;
  if (pasted !== null && pasted !== "") {
    // ⛔ vb7 · longer than any phone number: refused whole, before the parser is asked — the box may show a valid number
    // read out of it, and the paste is still not one number.
    if (contactNumberTooLong(pasted)) {
      return { stage: "refused", digits, operator: null, verdict: null, sentence: CONTACT_PASTE_TOO_LONG };
    }
    const p = parseTzNumber(pasted);
    if (p.verdict === "foreign" || p.verdict === "too_long") {
      return { stage: "refused", digits, operator: null, verdict: p.verdict, sentence: p.reason };
    }
  }

  if (digits === "") return { stage: "empty", digits, operator: null, verdict: null, sentence: null };
  // ⭐ C2 · typed after its own "+": once the digits leave Tanzania's code, the number is foreign — said at once.
  if (input.typedPlus === true && !TZ_COUNTRY_CODE.startsWith(digits.slice(0, TZ_COUNTRY_CODE.length))) {
    const written = parseTzNumber(`+${digits}`);
    return { stage: "refused", digits, operator: null, verdict: written.verdict, sentence: written.reason };
  }
  const operator = contactOperatorChip(digits);

  if (digits.length < NATIONAL_DIGITS) {
    // ⛔ A prefix that reaches nobody is refused at once, with the sentence parseTzNumber gives EVERY number on it:
    // a mobile verdict is decided by the first two digits, so the padded number's verdict is this number's verdict.
    if (operator !== null && !operator.sendable) {
      const early = parseTzNumber(digits.padEnd(NATIONAL_DIGITS, "0"));
      return { stage: "refused", digits, operator, verdict: early.verdict, sentence: early.reason };
    }
    if (input.settled !== true) {
      return { stage: "typing", digits, operator, verdict: null, sentence: contactTypingLine(digits.length) };
    }
    const short = parseTzNumber(digits);
    return { stage: "refused", digits, operator, verdict: short.verdict, sentence: short.reason };
  }

  const judged = parseTzNumber(digits);
  return { stage: judged.verdict === "ok" ? "ok" : "refused", digits, operator, verdict: judged.verdict, sentence: judged.reason };
}

/* ═══ vb7 · THE SEARCH BOX'S READING OF A NUMBER ═══════════════════════════════════════════════════════════ */

/** The echo for a whole number: the contacts search matches its 255… key exactly (`contactsSearch`, audience.ts). */
export const SEARCH_WHOLE_NUMBER = "Whole number — matched exactly";

/** Only digits — any keyboard's — spaces and the punctuation a phone number is written with, any dash included. */
const NUMBER_ATTEMPT = /^[\s'+().\p{Nd}\p{Pd}]+$/u;
/** One decimal digit, any keyboard's. Global, and only ever used with `String.match` (which resets it). */
const ANY_DIGIT = /\p{Nd}/gu;
/** A number attempt has at least this many digits: "2026" in a name search is a year, "071234" a part of a number. */
const NUMBER_ATTEMPT_DIGITS = 6;

export type ContactSearchNumber = { whole: true; sentence: string } | { whole: false; sentence: string };

/**
 * ⭐ vb7 · THE SEARCH BOX'S TEXT, READ AS A NUMBER — for the echo under the box and for the page's empty state:
 *   · a whole sendable number in any spelling — `parseTzNumber` says ok, the very test `contactsSearch` runs — is
 *     `SEARCH_WHOLE_NUMBER`: the search matches that number's key exactly;
 *   · a NUMBER ATTEMPT the parser refuses — only digits and a phone number's punctuation, at least six digits — is the
 *     parser's own sentence (a ten-digit typo is told it has ten), because such text is searched as a name and finds
 *     nobody;
 *   · anything else — a name, a year — is null, and the grammar's own echo stands.
 * ⛔ It never repeats the text: the parser's sentences do not (vb3). Pure — the page asks it on the server, the box in
 * the browser.
 */
export function contactSearchNumber(text: string): ContactSearchNumber | null {
  const t = String(text ?? "").trim();
  if (t === "") return null;
  const parsed = parseTzNumber(t);
  if (parsed.verdict === "ok") return { whole: true, sentence: SEARCH_WHOLE_NUMBER };
  if (!NUMBER_ATTEMPT.test(t) || (t.match(ANY_DIGIT) ?? []).length < NUMBER_ATTEMPT_DIGITS) return null;
  return { whole: false, sentence: parsed.reason };
}

/** The echo row's text (`SearchBox`'s `describe`): the reading's sentence, or null for the grammar's own echo. */
export function contactSearchEcho(text: string): string | null {
  return contactSearchNumber(text)?.sentence ?? null;
}
