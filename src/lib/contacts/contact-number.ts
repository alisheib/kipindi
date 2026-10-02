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
 *
 * ⛔ DISPLAY ONLY. The server never trusts this verdict: `addContact` parses the submitted text again
 * (`src/lib/server/contacts/contact-write.ts`), and the unique index — not this module — is the duplicate check.
 *
 * Pure and client-safe: it imports `../tz-msisdn` and `../phone-normalize` (both pinned, both server-free) and
 * nothing else — no lib/server, no node:, no React. Pinned in `test:client-graph-safe` (decision M3); guarded by
 * `test:contacts-form` §1, with in-process red plants (`red:contacts-form`).
 */
import { parseTzNumber, ndcRow, TZ_OPERATORS } from "../tz-msisdn";
import type { TzVerdict } from "../tz-msisdn";
import { normalizeTzLocalDigits } from "../phone-normalize";

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
  /** parseTzNumber's verdict once the number has been judged (ok / refused); null while empty or typing. */
  verdict: TzVerdict | null;
  /** parseTzNumber's sentence (ok / refused), the progress line (typing), or null (empty). */
  sentence: string | null;
};

/** The typing line — progress, never a refusal. */
export function contactTypingLine(n: number): string {
  return `${n} of ${NATIONAL_DIGITS} digits`;
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
 * WHOLE field. PhoneInput MERGES a paste at the caret into digits already there; the merged box is then the number,
 * and the clipboard text is not: saving it would save a number the screen never showed (and refuse a valid box whose
 * pasted tail alone is short). Null means "use the box".
 */
export function governingPaste(paste: string | null, fieldValue: string): string | null {
  return paste !== null && normalizeTzLocalDigits(paste) === fieldValue ? paste : null;
}

export function contactNumberVerdict(input: { value: string; pasted?: string | null; settled?: boolean }): ContactNumberVerdict {
  const digits = normalizeTzLocalDigits(String(input.value ?? ""));

  // ⭐ THE PASTE FIRST: judged before the field's nine-digit cap could make it lie.
  const pasted = input.pasted ?? null;
  if (pasted !== null && pasted !== "") {
    const p = parseTzNumber(pasted);
    if (p.verdict === "foreign" || p.verdict === "too_long") {
      return { stage: "refused", digits, operator: null, verdict: p.verdict, sentence: p.reason };
    }
  }

  if (digits === "") return { stage: "empty", digits, operator: null, verdict: null, sentence: null };
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
