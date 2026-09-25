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
 */
export function normalizeTzLocalDigits(raw: string): string {
  let d = (raw ?? "").replace(/\D+/g, "");
  if (d.startsWith("00")) d = d.slice(2);               // IDD prefix — before the trunk prefix
  if (d.startsWith("255")) d = d.slice(3);              // +255 / 255 country code
  else if (d.startsWith("0")) d = d.replace(/^0+/, ""); // local trunk prefix
  return d.slice(0, 9);
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
 * start; `sms.ts:71` posted the stored `+255…` through untouched. No SMS has ever
 * left this platform, so the mismatch was latent — the first real send is what
 * would have found it. Both rails now come through here.
 *
 * Lives in this module because it is pure and imports nothing, so a client
 * component can reach it — see the boundary note on `maskPhone` below.
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
 * ⛔ IT IS NOT A NUMBERING PLAN AND MUST NEVER GROW INTO ONE. `255701234567` passes here, yet no
 * licensee holds NDC 70. Which NDCs are allocated, to whom, and under which edition of the TCRA
 * plan is `tz-msisdn.ts`'s single job. A second copy of that table living on the wire would drift
 * from the first the week an operator is licensed, and the two would disagree about who can be
 * texted. `phone-normalize.test.mts` §4 asserts this gap out loud so it cannot be mistaken for
 * coverage.
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
  return `${raw.slice(0, 4)}••••${raw.slice(-2)}`;
}
