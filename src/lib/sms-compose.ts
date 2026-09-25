/**
 * ⭐ WHAT AN SMS COSTS, IN ONE PLACE — pure, zero imports, client-safe.
 *
 * 🔴 D4: THERE WAS NO SEGMENT ARITHMETIC ANYWHERE IN THIS CODEBASE, and the only GSM-7 table lived
 * inside `lib/server/sms-blackball.ts` — a server module a composer screen cannot import without
 * dragging the server graph into a browser chunk. So an officer typing a campaign had no way to be
 * told what they were about to spend, and the gateway's own coding decision was made from a table
 * nothing else could see.
 *
 * ── WHY THIS IS A MONEY FILE, NOT A FORMATTING FILE ──────────────────────────
 * A segment is the billed unit (`BLACKBALL-SMS.md`: the portal's `COUNT` column IS the segment
 * count). At TZS 6 a segment and the ~150,000-contact import this platform is being built for, **one
 * extra segment is TZS 900,000**. An em-dash or a curly quote pasted out of a document drops the
 * whole message from GSM-7 to UCS-2 — 160 characters become 70 — and silently triples the bill. The
 * arithmetic below is the only thing standing between that paste and an invoice.
 *
 * ⛔ AND THE ONE THING THIS FILE CANNOT KNOW, STATED PLAINLY. This is GSM 03.38 — the STANDARD. It is
 * not a measurement of what Blackball charges. Their `COUNT` column is documented as the segment
 * count, but no multi-segment message has ever been sent through this account, so the arithmetic
 * here is **unverified against the biller**. The two could differ in exactly one place worth naming:
 * whether they charge the extension characters (`€ [ ] { } \ ^ | ~` and form feed) at TWO septets as
 * the standard requires, or count characters. ⭐ Being right about the standard and wrong about the
 * biller prices every campaign wrongly and stays invisible until the invoice — so U52's capped live
 * drive cross-checks a deliberately multi-segment body against their portal's own COUNT, and until
 * it does, `SMS_ARITHMETIC_VERIFIED_AGAINST_BILLER` below is `false` and says so.
 *
 * Guard: `npm run test:campaign-compose`. Red: `npm run red:campaign-compose`.
 */

/* ══ THE CHARACTER SETS ══════════════════════════════════════════════════════ */

/**
 * GSM 03.38 basic set — one septet each.
 *
 * ⛔ MOVED HERE VERBATIM from `sms-blackball.ts`, split into basic and extension. The suite keeps a
 * byte-for-byte copy of the pre-move string and asserts `GSM7_BASIC ∪ GSM7_EXTENDED` is EXACTLY that
 * set — so the move cannot have quietly dropped a character, which would send a perfectly good
 * message as UCS-2 and double its price.
 */
export const GSM7_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

/**
 * The GSM 03.38 extension table. ⭐ THESE COST **TWO** SEPTETS EACH — they are sent as an escape
 * followed by the character — but they are representable, so they do NOT force UCS-2.
 *
 * ⚠️ That is the whole trap in this file. `€` looks like one character, counts as one character in
 * `String.length`, and occupies two. A 160-character body containing five of them is 165 septets and
 * bills as TWO segments, and `bodyLen` — the field `SmsMessage` has always stored — would have said
 * 160 and priced it as one.
 */
export const GSM7_EXTENDED = "\f^{}\\[~]|€";

const BASIC = new Set(GSM7_BASIC);
const EXTENDED = new Set(GSM7_EXTENDED);

/* ══ THE LIMITS ══════════════════════════════════════════════════════════════ */

export type SmsEncoding = "GSM7" | "UCS2";

/**
 * ⛔ THE CONCATENATED FIGURES ARE NOT THE SINGLE FIGURES. A multi-part message carries a User Data
 * Header in every segment: 7 septets of the 160 in GSM-7, 3 UTF-16 units of the 70 in UCS-2. This is
 * why 306 characters is two segments and 307 is three, and why "160 × n" is always wrong.
 */
export const SMS_LIMITS = {
  GSM7: { single: 160, concatenated: 153 },
  UCS2: { single: 70, concatenated: 67 },
} as const;

/**
 * ⛔ FALSE UNTIL A MULTI-SEGMENT MESSAGE HAS BEEN SENT AND RECONCILED AGAINST THE PROVIDER'S OWN
 * `COUNT` COLUMN (plan U52). It is exported so a screen can say "estimated" rather than "costs", and
 * so the claim has one home instead of being remembered. ⛔ Do not flip it from a reading of the
 * standard; flip it from an invoice.
 */
export const SMS_ARITHMETIC_VERIFIED_AGAINST_BILLER = false;

/**
 * The hardest ceiling a marketing body may reach, in SEGMENTS.
 *
 * ⭐ COMPUTED FROM MONEY, NOT TASTE. One segment to the ~150,000-contact list this platform is being
 * built for is 150,000 × TZS 6 = **TZS 900,000**. Two is TZS 1.8m. A campaign that needs three is a
 * campaign that needs an owner's signature, not a longer text box — so the composer stops here and
 * U49's budget gate is what may raise it.
 */
export const SMS_MAX_SEGMENTS = 2;

/* ══ SIZING ══════════════════════════════════════════════════════════════════ */

export type SmsSize = {
  encoding: SmsEncoding;
  /** Septets for GSM-7, UTF-16 code units for UCS-2. ⛔ NEVER `String.length`. */
  units: number;
  segments: number;
  /** What one segment holds at this segment count — the single limit when `segments === 1`. */
  perSegment: number;
  /** Units left before the next segment starts. */
  remaining: number;
  /** The characters that forced UCS-2, if any — for telling an officer WHICH character cost them. */
  offending: string[];
};

/** The coding a text needs, chosen from the text and never assumed. */
export function encodingFor(text: string): SmsEncoding {
  for (const ch of text) if (!BASIC.has(ch) && !EXTENDED.has(ch)) return "UCS2";
  return "GSM7";
}

/** The characters that push a text out of GSM-7 — de-duplicated, in first-seen order. */
export function offendingChars(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const ch of text) {
    if (BASIC.has(ch) || EXTENDED.has(ch) || seen.has(ch)) continue;
    seen.add(ch);
    out.push(ch);
  }
  return out;
}

/**
 * ⭐ SEGMENTS ARE PACKED, NOT DIVIDED. `ceil(total / perSegment)` is the answer everyone writes and
 * it is wrong, because a two-septet extension character and a surrogate pair may not be SPLIT across
 * a segment boundary — the encoder moves the whole character into the next segment and wastes the
 * unit it left behind.
 *
 * 🔴 IT IS NOT A CURIOSITY. 152 plain characters followed by 77 euro signs is 306 septets, which
 * `ceil(306 / 153)` prices as TWO segments and which actually sends as THREE. At 150,000 recipients
 * that single unit of slack is TZS 900,000. The suite carries that exact vector.
 */
function packSegments(costs: number[], single: number, concatenated: number): number {
  let total = 0;
  for (const c of costs) total += c;
  if (total <= single) return 1;
  let segments = 1;
  let used = 0;
  for (const c of costs) {
    if (used + c > concatenated) {
      segments += 1;
      used = c;
    } else {
      used += c;
    }
  }
  return segments;
}

/** The cost of each character in order, in the units of the chosen encoding. */
function costsOf(text: string, encoding: SmsEncoding): number[] {
  const out: number[] = [];
  // ⛔ `for…of` walks CODE POINTS, so an emoji arrives as one iteration — and then counts as the TWO
  // UTF-16 units it actually occupies. Indexing by `text[i]` would split it and count it as two
  // characters, which is right by accident and wrong for every other purpose.
  for (const ch of text) {
    if (encoding === "UCS2") out.push(ch.length);          // 2 for a surrogate pair, else 1
    else out.push(EXTENDED.has(ch) ? 2 : 1);
  }
  return out;
}

/** What a message costs. ⛔ The one function anything may price from. */
export function sizeSms(text: string): SmsSize {
  const body = text ?? "";
  const encoding = encodingFor(body);
  const limits = SMS_LIMITS[encoding];
  const costs = costsOf(body, encoding);
  let units = 0;
  for (const c of costs) units += c;
  const segments = packSegments(costs, limits.single, limits.concatenated);
  const perSegment = segments === 1 ? limits.single : limits.concatenated;
  return {
    encoding,
    units,
    segments,
    perSegment,
    remaining: Math.max(0, segments * perSegment - units),
    offending: encoding === "UCS2" ? offendingChars(body) : [],
  };
}

/* ══ PLANNING — what a screen shows before anyone spends ═════════════════════ */

export type SmsPlan = SmsSize & {
  /** ⛔ `false` when the message exceeds `SMS_MAX_SEGMENTS`. */
  withinCap: boolean;
  recipients: number;
  /** Segments × recipients — the billed quantity, not a currency amount. */
  billableSegments: number;
  /** ⛔ ESTIMATED while `SMS_ARITHMETIC_VERIFIED_AGAINST_BILLER` is false. */
  estimated: boolean;
};

/**
 * What a send would cost, in segments. ⛔ IT RETURNS QUANTITY, NOT MONEY — the price per segment is
 * the provider's and belongs with the ledger (plan U49), not in a pure module that would go stale
 * the day a rate changes and would then be a fabricated promise about money (§7.5).
 */
export function planSms(text: string, recipients: number): SmsPlan {
  const size = sizeSms(text);
  const n = Math.max(0, Math.floor(recipients || 0));
  return {
    ...size,
    withinCap: size.segments <= SMS_MAX_SEGMENTS,
    recipients: n,
    billableSegments: size.segments * n,
    estimated: !SMS_ARITHMETIC_VERIFIED_AGAINST_BILLER,
  };
}
