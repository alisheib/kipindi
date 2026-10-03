/**
 * ONE definition of "reduce whatever a Tanzanian typed to the canonical 9 digits".
 *
 * The server's `tzPhone` (src/lib/server/validators.ts) accepts four shapes:
 *   0712 000 101 · 255712000101 · +255712000101 · 712000101
 * The sign-in / registration widget used to accept only the last one: it stripped
 * non-digits and truncated to 9, so `0712000101` silently became `071200010`
 * ("Enter a valid Tanzania mobile number", with no hint that the leading zero was
 * the problem) and a pasted `+255712000101` became `255712000` — a different
 * number. Four of the five natural entry shapes could not be typed at all, on the
 * two screens every player must pass through.
 *
 * Lives here rather than inside the component so the widget, the admin sign-in
 * and any future caller cannot drift apart — and so it is testable without React.
 *
 * A Tanzanian mobile subscriber number is `[67]\d{8}`, so neither a leading `0`
 * nor a leading `255` can be part of it; stripping them is unambiguous.
 *
 * ⭐ vb3 (2026-10-03) · ONE PHONE RULE FOR EVERY SPELLING. Two more spellings reduce here: the trunk zero
 * written after the country code (`+255 0712 345 678`, and the `+255 (0) 712…` a business card prints), and
 * digits from another keyboard (Arabic-Indic, full-width). The numbering plan reads the same text the same
 * way: `tz-msisdn.ts` imports `readAsciiDigits` from here — never the other way round, because this file
 * imports nothing (`test:read-tiers` 8.6). And the number box's paste rule lives here too: a paste that
 * holds a whole number, or that would push the box past nine digits, REPLACES the box (`pasteIntoBox`).
 */

/**
 * WHAT THE MONEY FORMS SHOULD SHOW IN THE NUMBER FIELD — Jay (Gaming Board) item #8.
 *
 * The deposit and withdraw pages used to open with an EMPTY field behind the placeholder
 * `712 345 678`, so every player retyped their own number every time. ⛔ A placeholder must
 * never become a value (finding A-5), so the fix is a real default, not a greyed hint.
 *
 * ⭐ THE SUBTLETY IS THE ERROR ROUND-TRIP, AND A NAIVE `??` GETS IT WRONG. Both actions
 * carry the submitted values back on failure, but only when they are truthy —
 * `withdraw/actions.ts:90` and `deposit/actions.ts:46` both omit an EMPTY msisdn. So
 * `sp.msisdn ?? account` would silently replace a field the player had deliberately
 * CLEARED with their account number, on the screen where the number decides where money
 * goes. Keying on the error instead is exact: a fresh visit prefills, a returning one shows
 * precisely what came back.
 *
 * ⚠️ WITHDRAWALS ARE THE SENSITIVE HALF. A defaulted payout destination is a CONVENIENCE,
 * never an assumption — this changes what is displayed and nothing else. Every destination
 * validation the action already runs still runs, and the field stays editable.
 *
 * PURE and EXPORTED so a suite can drive it; a decision inside a render is one nothing can
 * drive. Guard: `npm run test:msisdn-prefill`.
 */
export function moneyFormMsisdn(
  accountPhoneE164: string,
  submitted: string | undefined,
  hadError: boolean,
): string {
  if (hadError) return normalizeTzLocalDigits(submitted ?? "");
  return normalizeTzLocalDigits(accountPhoneE164);
}

/**
 * ⭐ EVERY DECIMAL DIGIT A KEYBOARD CAN WRITE, READ AS ASCII — the one digit reader (vb3, 2026-10-03).
 *
 * 🔴 `\D` IS ASCII-ONLY IN JAVASCRIPT, WHATEVER THE FLAGS. A phone set to Arabic types its number in
 * Arabic-Indic digits, a Chinese input method in full-width ones, and the strip below threw every one of those
 * digits away: the box stayed empty, and the parser called a real number "no digits". House-bot's whole-number
 * parser already read them with this table; it lives HERE now, its one home, and `house-bot/rules.ts` imports it
 * (its private copy is deleted, and `test:phone-normalize` §7b keeps it gone). This file imports nothing, so a
 * client component reaches it without dragging anything along.
 *
 * Returns null when a decimal digit comes from a block the table does not know; each caller decides what that
 * means (house-bot refuses the value, `readAsciiDigits` below leaves the text as it was). The text must be NFKC
 * first: full-width digits are compatibility characters, which NFKC maps and this table does not.
 */
const DIGIT_ZEROS = [
  0x0030, 0x0660, 0x06f0, 0x07c0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0x0de6,
  0x0e50, 0x0ed0, 0x0f20, 0x1040, 0x1090, 0x17e0, 0x1810, 0x1946, 0x19d0, 0x1a80, 0x1a90, 0x1b50, 0x1bb0, 0x1c40,
  0x1c50, 0xa620, 0xa8d0, 0xa900, 0xa9d0, 0xa9f0, 0xaa50, 0xabf0,
] as const;

const DECIMAL_DIGIT = /\p{Nd}/u;

export function toAsciiDigits(s: string): string | null {
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    if ((cp >= 0x30 && cp <= 0x39) || !DECIMAL_DIGIT.test(ch)) {
      out += ch;
      continue;
    }
    let zero = -1;
    for (const z of DIGIT_ZEROS) if (z <= cp && cp < z + 10) zero = z;
    if (zero < 0) return null;
    out += String(cp - zero);
  }
  return out;
}

/** Any character past 7-bit ASCII. Module-level and used with `.test` only, so it carries no `/g` state. */
const NON_ASCII = /[^\x00-\x7F]/;

/**
 * A phone text with every digit read as ASCII: NFKC first (full-width digits and the full-width plus become
 * ASCII), then the table above. ⭐ Plain ASCII — nearly every number — comes back untouched, after one test.
 * ⚠️ A digit from a block the table does not know leaves the text exactly as it was, so it falls away with the
 * other non-digits, as every digit outside 0-9 did before vb3. Never a guess.
 */
export function readAsciiDigits(raw: string): string {
  const s = raw ?? "";
  if (!NON_ASCII.test(s)) return s;
  const n = s.normalize("NFKC");
  return toAsciiDigits(n) ?? n;
}

/**
 * Canonical 9-digit local part, or as much of it as has been typed so far.
 *
 * 🔴 THE IDD PREFIX HAS TO COME OFF FIRST, AND UNTIL 2026-09-25 IT DID NOT. `00` is the
 * international dialling prefix; `0` is the national trunk prefix. Testing for the trunk prefix
 * first read the first zero of `00255712345678` as a trunk code, stripped every leading zero, and
 * returned `255712345` — nine digits that look canonical and are a DIFFERENT number. `toMsisdn255`
 * made the mirror-image mistake on the same input (see its own note), so the two rails disagreed in
 * opposite directions and each looked correct read alone.
 *
 * ⚠️ `00712345678` STILL MEANS WHAT IT ALWAYS DID. Stripping the IDD leaves `712345678`, which is
 * the same answer the old leading-zero strip gave — the "double-zero fat finger" vector this
 * module's suite has carried since August is unchanged, deliberately.
 *
 * ⭐ vb3 (2026-10-03) · ONE TRUNK ZERO AFTER THE COUNTRY CODE IS DROPPED. People write `+255 0712 345 678` —
 * the country code AND the zero they dial at home. A Tanzanian number never begins with `0` after `255`, so
 * when no more than ten digits follow, a leading zero there is that trunk zero, and it goes: a pasted
 * `+255 0712…` showed `071 234 567`, a number that is nobody's, and now shows `712 345 678`; with a digit lost
 * it shows `712 345 67`, eight of nine, never `071 234 567`. Exactly ONE zero — `+255 00712…` keeps its zeros.
 * It is the parser's own rule (`tz-msisdn.ts`), so the box and the verdict always drop the same zero. And every
 * digit is read through `readAsciiDigits` first, so an Arabic or Chinese keyboard's digits stay in the box.
 */
export function normalizeTzLocalDigits(raw: string): string {
  let d = readAsciiDigits(raw).replace(/\D+/g, "");
  if (d.startsWith("00")) d = d.slice(2);               // IDD prefix — before the trunk prefix
  if (d.startsWith("255")) {                            // +255 / 255 country code
    d = d.slice(3);
    if (d.startsWith("0") && d.length <= 10) d = d.slice(1); // vb3 · the one trunk zero written after the code
  } else if (d.startsWith("0")) d = d.replace(/^0+/, ""); // local trunk prefix
  return d.slice(0, 9);
}

/** Nine national digits after +255 — a whole Tanzanian number, and everything the number box holds. */
const NATIONAL_DIGITS = 9;

/** The box's digits and its selection as the paste rule reads them: digits only, nine at most, the selection
 *  clamped to them and in order — a caret past the end, or one that is not a number, is at the end. */
function boxSelection(boxDigits: string, selStart: number, selEnd: number): { box: string; from: number; to: number } {
  const box = (boxDigits ?? "").replace(/\D+/g, "").slice(0, NATIONAL_DIGITS);
  const at = (n: number) => (Number.isFinite(n) ? Math.min(Math.max(Math.trunc(n), 0), box.length) : box.length);
  return { box, from: Math.min(at(selStart), at(selEnd)), to: Math.max(at(selStart), at(selEnd)) };
}

/**
 * ⭐ vb3 (2026-10-03) · DOES THIS PASTE REPLACE THE BOX? Yes when the clipboard holds a whole number (it reduces to
 * nine national digits), and yes when inserting it at the selection would push the box past nine digits — cut to
 * nine, that insert kept the head of one number and the start of another, a number nobody wrote. `PhoneInput`
 * asks this BEFORE its clean-paste shortcut, and `pasteIntoBox` asks it to choose between replacing and
 * inserting — one decision, so the component and the rule can never disagree about it.
 */
export function pasteReplacesBox(boxDigits: string, selStart: number, selEnd: number, clipboard: string): boolean {
  const pasted = normalizeTzLocalDigits(clipboard);
  if (pasted.length === NATIONAL_DIGITS) return true;
  const { box, from, to } = boxSelection(boxDigits, selStart, selEnd);
  return box.length - (to - from) + pasted.length > NATIONAL_DIGITS;
}

/**
 * ⭐ vb3 (2026-10-03) · WHAT THE NUMBER BOX HOLDS AFTER A PASTE — pure, so a suite drives it without React.
 *
 * 🔴 THE DEFECT. `PhoneInput` spliced every paste into the digits already in the box, at the caret, and kept
 * nine. So a different whole number pasted into a FULL box either kept the OLD number without a word (caret
 * at the end — or any plain-digit paste, which the "already clean" shortcut left to the browser and the
 * field's `maxLength` then dropped) or built a THIRD number from the two (caret in the middle); and a number
 * missing its last digit, pasted the same way, was cut to nine as a mix of both. The add-contact dialog saved
 * it; the sign-in form sent it.
 * ⭐ THE RULE. A paste that replaces the box (`pasteReplacesBox`: a whole number, or one that would overflow it)
 * BECOMES the box, whatever the caret and the selection — a number missing a digit then reads "8 of 9 digits",
 * which the officer can see and fix. A shorter paste that fits keeps the insert it always had: its digits at the
 * caret, the selection replaced.
 *
 * @param boxDigits the digits the box holds now (already reduced — `PhoneInput`'s own value)
 * @param selStart the selection's start, counted in DIGITS, not in the formatted "712 345 678"
 * @param selEnd the selection's end, in digits — equal to `selStart` for a caret
 * @param clipboard the pasted text, exactly as pasted
 */
export function pasteIntoBox(boxDigits: string, selStart: number, selEnd: number, clipboard: string): string {
  const pasted = normalizeTzLocalDigits(clipboard);
  if (pasteReplacesBox(boxDigits, selStart, selEnd, clipboard)) return pasted;
  const { box, from, to } = boxSelection(boxDigits, selStart, selEnd);
  return box.slice(0, from) + pasted + box.slice(to); // it fits: pasteReplacesBox has just said so
}

/**
 * ⭐ THE ONE DEFINITION OF A GATEWAY MSISDN — the wire format every Tanzanian
 * provider we talk to actually wants: `255XXXXXXXXX`, twelve digits, no `+`, no
 * leading zero.
 *
 * ⛔ IT IS NOT THE SAME THING AS `normalizeTzLocalDigits` ABOVE, AND THE TWO
 * POINT IN OPPOSITE DIRECTIONS. That one REDUCES to the nine-digit subscriber
 * number a player types into a form field; this one EXPANDS to the twelve-digit
 * international form a machine reads. Both are needed. Conflating them is exactly
 * how a `+255…` ends up on a wire that was promised `255…`.
 *
 * 🔴 THE TWO RAILS DISAGREED, AND NOTHING CAUGHT IT BECAUSE ONE OF THEM HAD
 * NEVER RUN. `selcom.ts` normalised its payment MSISDNs to this shape from the
 * start; `sms.ts` posted the stored `+255…` through untouched. No SMS had yet left
 * this platform, so the mismatch was latent. It was fixed in the same change that
 * wired the Blackball gateway (2026-09-16), before the first real send. Both rails
 * now come through here: `sendBatch` in `sms.ts`, and `selcom.ts`.
 * (corrected 2026-09-25 — this said no SMS had ever left the platform)
 *
 * Lives in this module because it is pure and imports nothing, so a client
 * component can reach it — see the boundary note on `maskPhone` below.
 *
 * ⚠️ vb3 (2026-10-03) · IT DOES NOT LEARN `+255 0712…`, ON PURPOSE — this rail is unchanged. The box above and
 * the numbering plan now read that spelling as the same person's number; here it stays thirteen digits, which
 * `isGatewayMsisdn` refuses, so the spelling fails CLOSED on the money wire. And no production caller hands it
 * that spelling: each passes a number `tzPhone` accepted (its pattern cannot match a zero after `255`) or a key
 * `parseTzNumber` minted — the marketing dispatch included, which puts the gate's own key on the wire, never
 * the row's text (`dispatch.ts`, vb3). `phone-normalize.test.mts` §4 is unchanged.
 *
 * Guard: `npm run test:phone-normalize`.
 */
export function toMsisdn255(raw: string): string {
  let d = (raw ?? "").replace(/\D/g, "");
  // 🔴 D1, FIXED 2026-09-25. `00` is the INTERNATIONAL dialling prefix and has to come off before
  // anything reads the next character as a national trunk zero. Without this line the branch below
  // turned `00255712345678` into `255` + `0255712345678` — a SIXTEEN-digit msisdn, past the
  // fifteen-digit E.164 maximum, which `sendBatch` then billed as a send attempt that could never
  // deliver. Latent until 2026-09-25 only because every caller stood behind `tzPhone`, whose regex
  // cannot pass a `00…` string; the contacts importer is the first caller that will not.
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("255")) return d;
  if (d.startsWith("0")) return "255" + d.replace(/^0+/, "");
  if (d.length === 9) return "255" + d;
  return d;
}

/**
 * ⭐ MAY THE GATEWAY BE ASKED TO DIAL THIS AT ALL? Added 2026-09-25 (marketing plan U1, D2).
 *
 * 🔴 NOTHING REFUSED A MALFORMED NUMBER BEFORE THIS. `sendBatch` normalised whatever it was given,
 * wrote the `SmsMessage` row, and POSTed it. Every Tanzanian gateway failure is an HTTP 400 with no
 * per-message detail, so a malformed number came back as an indistinguishable batch refusal — and
 * it had already been counted as a send attempt. Measured on the twelve vectors in
 * `phone-normalize.test.mts`: a Kenyan `+254…`, a Dar es Salaam landline, a truncated nine-digit
 * string and the sixteen-digit output of the `00…` defect all reached the wire.
 *
 * ── WHAT IT IS, AND WHAT IT DELIBERATELY IS NOT ──────────────────────────────
 * TWELVE digits, `255` then `6` or `7`. That is the whole rule, and the narrowness is the point:
 * this predicate answers "can a gateway dial this", not "is this a real subscriber".
 *
 * ⛔ IT IS NOT A NUMBERING PLAN AND MUST NEVER GROW INTO ONE. `255701234567` passes here, and this
 * module has no opinion about whether anyone holds NDC 70 — deliberately. ⭐ THAT IS NOT A
 * HYPOTHETICAL RISK: NDC 70 was spare in the TCRA plan's 2020, 2024 and 2025 editions and is
 * allocated in the 2026 one, and 63, 64, 66 and 72 all changed holder over the same period. A
 * numbering table on the money wire would go stale on the regulator's schedule, not ours, and the
 * failure mode is refusing to text a real customer. Which NDCs are allocated, to whom, and under
 * which edition is the single job of the numbering-plan module and its own suite, where the edition
 * and its review date are recorded in the file. `phone-normalize.test.mts` §4 asserts this gap out
 * loud so it cannot be mistaken for coverage.
 *
 * Lives in this module because it is pure and imports nothing, so the client may reach it too.
 *
 * Guard: `npm run test:phone-normalize`.
 */
export function isGatewayMsisdn(msisdn: string): boolean {
  return /^255[67]\d{8}$/.test(msisdn ?? "");
}

/**
 * ⭐ THE ONE DEFINITION OF A MASKED PHONE NUMBER. Added 2026-09-06.
 *
 * 🔴 There were SEVEN hand-written masks across the admin console before this, in THREE
 * different shapes — `+255****01`, `+255*****01` and `+255••••01` — so the same player's number
 * read differently on the roster, the drill-down and the KYC workstation, and nothing could
 * assert that any of them masked at all. `docs/READ-TIERS.md` §7's drift ratchet was blind to
 * every one of them because `phoneE164` was not in its governed set.
 *
 * ⛔ IT LIVES HERE, IN A MODULE WITH NO IMPORTS, AND NOT IN `sensitive-fields.ts`. That file
 * imports the store; client components mask phones too (`app-shell.tsx`, `auth/otp`), and
 * importing a server module from them drags Prisma into a browser chunk. This is the same
 * client/server boundary that took down every page once — a `"use client"` helper reached from
 * a server graph, invisible to both `tsc` and `next build`.
 *
 * ── THE SHAPE, AND WHY EXACTLY THIS MUCH ─────────────────────────────────────
 * `+255••••01` — the country code, four dots, the last two digits.
 *
 * · DOTS, NOT STARS. `maskEmail`, `maskRegion` and `maskDob` (`sensitive-fields.ts`) all use
 *   `••••`; `*` is this codebase's AUDIT-LOG vocabulary (`maskPhoneForAudit`, `sms.ts`,
 *   `payments.ts`) and stays there. A reader should be able to tell a masked FIELD from a
 *   redacted LOG at a glance.
 * · FIRST FOUR AND LAST TWO — deliberately EXACTLY what the console already exposed, so this is
 *   a change of vocabulary and not a change of policy. READ_TIERS §3.2's test is that a mask
 *   preserve enough shape to CONFIRM a number a caller reads out, and not enough to HARVEST a
 *   list of them: `+255` is a country code carrying no discriminating information at all, and
 *   two trailing digits is one in a hundred.
 * · FIXED-WIDTH DOTS. Four regardless of length, so the mask does not leak how long the number
 *   is — the same reason `maskEmail` refuses to let a one-character local part become a bare
 *   `@domain`.
 *
 * ⛔ A SHORT OR MALFORMED VALUE MASKS TO DOTS AND IS NEVER ECHOED. Six of the seven hand-written
 * masks read `phone.length > 6 ? masked : phone` — so the one input class most likely to be
 * junk, a truncated or corrupt row, was the one printed IN FULL. A mask whose failure mode is
 * "show everything" is not a mask.
 */
export function maskPhone(raw: string | null | undefined): string {
  // ⛔ THE FLOOR IS 10, NOT 7, AND IT IS MEASURED. The mask shows six characters (four + two), so
  // a value shorter than ten hides fewer than four — at length 7 it would hide exactly ONE, which
  // is a mask in name only. Measured on production 2026-09-06: **every** stored value is exactly
  // 13 characters (146 `Transaction.msisdn`, 108 `User.phoneE164`), so nothing real is affected
  // and the only inputs this refuses are malformed — which is precisely the class that must not
  // be echoed.
  if (!raw || raw.length < 10) return "••••";
  // ⭐ ONE SHAPE FOR EVERY SPELLING (U19, S10 2026-10-01). The gateway and every marketing store keep
  // the number BARE (`255…`, `toMsisdn255`); the account keeps `+255…`. Masked as typed, the bare key
  // read `2557••••01` — the operator digit — in the SMS refusal audit, the delivery-receipt audit and
  // the contact book. It is read as the `+` form first, so every caller prints `+255••••01`.
  const v = /^255\d{9}$/.test(raw) ? `+${raw}` : raw;
  return `${v.slice(0, 4)}••••${v.slice(-2)}`;
}
