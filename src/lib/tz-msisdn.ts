/**
 * ⭐ THE ONE PLACE THAT KNOWS WHAT A TANZANIAN PHONE NUMBER IS.
 *
 * Pure, zero server imports, client-safe — the same rule `phone-normalize.ts` and
 * `payment-providers.ts` state for themselves: a shared catalogue a `"use client"` component must be
 * able to reach cannot sit under `lib/server/`, or Prisma follows it into a browser chunk.
 *
 * ── WHAT THIS IS FOR, AND WHAT IT IS NOT FOR ─────────────────────────────────
 * `phone-normalize.ts` answers "can a gateway dial this at all" — twelve digits, `255` then `6` or
 * `7`, and nothing more. THIS module answers the questions an operator staring at an imported
 * address book actually has: is this a mobile or a landline, is it even Tanzanian, which range does
 * it fall in, and — when it is none of those — WHAT DO I TELL THE PERSON WHO PASTED IT. The split is
 * deliberate: the wire predicate must not carry a numbering table (see its own note), and this table
 * must not be on the wire.
 *
 * ══ THREE THINGS THE RESEARCH FORCED, NONE OF WHICH WERE OBVIOUS ══════════════
 *
 * 🔴 ① THE OPERATOR IS THE RANGE HOLDER. IT IS NOT "WHICH NETWORK THIS PERSON IS ON."
 * ⭐ MOBILE NUMBER PORTABILITY HAS BEEN LIVE IN TANZANIA SINCE MARCH 2017, under TCRA's own Mobile
 * Number Portability Regulations. A ported number KEEPS ITS NDC and CHANGES NETWORK, so an NDC tells
 * you which block a number was ISSUED from and nothing else, and it has been that way for nine years.
 *
 * ⚠️ AND THE INSTRUMENT THAT NEARLY SAID OTHERWISE IS WORTH REMEMBERING. The ITU's E.164
 * notification for Tanzania answers "sans objet" in its portability row, which reads like "not
 * applicable — no portability here". It is not: that row asks for a LINK to a public real-time
 * ported-number database, and TCRA simply supplied no URL. An empty answer to "where is your
 * database" was one careless reading away from becoming "there is no portability", which would have
 * licensed exactly the inference below. ⛔ A blank field is not a negative finding.
 * ⛔ SO `walletHint` IS DISPLAY-ONLY AND MUST NEVER CHOOSE A PAYOUT RAIL. Guessing "074… therefore
 * M-Pesa" and routing money on it is how a withdrawal lands at the wrong provider for a customer who
 * ported years ago. The player picks their wallet on the withdraw form; that choice is the only
 * input the money rails may read. `tz-msisdn.test.mts` §7 asserts no payment or wallet module
 * imports this file, so the rule is enforced rather than remembered.
 *
 * 🔴 ② WHEN THE REGULATOR AND THE CARRIERS DISAGREE, THIS PARSER ACCEPTS AND FLAGS.
 * The asymmetry decides it, and it is not close. A number wrongly REFUSED is dropped silently from
 * every campaign for ever and nobody finds out. A number wrongly ACCEPTED costs TZS 6 and produces a
 * delivery receipt that never arrives — which, since 2026-09-23, is a thing this platform can
 * actually see (`BLACKBALL-SMS.md`; receipts settle rows in about eleven seconds). One failure mode
 * is invisible and permanent, the other is cheap and instrumented. ⭐ NDC 60 is exactly this case
 * and is marked `disputed` below.
 *
 * 🔴 ③ A NUMBERING PLAN IS A DOCUMENT WITH AN EDITION, AND IT MOVES.
 * Five codes changed holder between the 2020 and 2026 editions — 63, 64, 66, 70 and 72 — and the
 * plan this programme was written from carried the 2020 answers. `TZ_NUMBERING_PLAN` therefore
 * records the edition, the publisher, the document number, the source and the date a human last
 * checked it. ⛔ The suite asserts that date PARSES and PRINTS its age; it never fails on a date. A
 * guard that goes red on a calendar boundary is a guard someone disables.
 *
 * ⚠️ AND REACH IS NOT UNIFORM ACROSS THE CODES THIS CALLS `ok`. Twilio's Tanzania guidelines: since
 * 2025-06-16 an UNREGISTERED alphanumeric sender ID is blocked outright on Vodacom, Airtel, Yas and
 * Zantel; Halotel and TTCL may REPLACE a registered sender ID with a generic one; numeric sender IDs
 * are supported by nobody. `ok` here means "this is a real Tanzanian mobile number", never "this
 * message will arrive looking the way you wrote it". That is the gateway's business, not this file's.
 *
 * ── PERFORMANCE IS A CORRECTNESS PROPERTY HERE ───────────────────────────────
 * The contacts importer is specified for ~150,000 rows, so `parseTzNumber` runs 150,000 times in one
 * job. Every regex is a module-level constant and the NDC index is built exactly ONCE at module
 * load. `tzTableBuildCount()` exists so that claim is falsifiable rather than asserted: the suite
 * parses a large corpus and requires the count to still read 1. Move the table inside the function
 * and it reads 150,001.
 *
 * Guard: `npm run test:tz-msisdn` · red: `npm run red:tz-msisdn`.
 */
import { type PaymentMethodId, paymentMethodName } from "./payment-providers";

/* ══ THE PLAN THIS FILE ENCODES ══════════════════════════════════════════════ */

/**
 * ⛔ `reviewed` IS A HUMAN'S SIGNATURE, NOT A CACHE KEY. It means "on this date a person compared
 * the table below against the regulator's current edition". Bump it only when that has happened.
 */
export const TZ_NUMBERING_PLAN = {
  title: "National Numbering and Signaling Point Codes Plan",
  publisher: "Tanzania Communications Regulatory Authority (TCRA)",
  documentNo: "TCRA/DICT/CRTM/PLA-NMSP/002",
  edition: "v1.16",
  issued: "2026-07-01",
  source: "https://www.tcra.go.tz/publications/guidebooks",
  /** Corroborated against Google libphonenumber's TZ ranges + carrier map, which carry GSMA IR21
   *  provenance per range — the filing international aggregators actually route from. */
  corroboration: "https://github.com/google/libphonenumber/blob/master/resources/metadata/255/ranges.csv",
  reviewed: "2026-09-25",
} as const;

export const TZ_COUNTRY_CODE = "255";

/* ══ OPERATORS ═══════════════════════════════════════════════════════════════ */

export type TzOperatorId = "VIETTEL" | "HONORA" | "AIRTEL" | "VODACOM" | "TTCL" | "TELXER";

export type TzOperatorSpec = {
  readonly id: TzOperatorId;
  /** The licensee as the regulator publishes it. */
  readonly licensee: string;
  /** What a customer calls it. ⛔ These drift: MIC Tanzania PLC became Honora, Tigo became Yas on
   *  2024-11-26, Zantel was absorbed. The licensee is the stable key; the brand is the label. */
  readonly brand: string;
  /**
   * ⛔ DISPLAY ONLY — see ① in the header. This is the wallet USUALLY associated with the range, for
   * showing a human a familiar word. It is never an instruction about where money goes.
   */
  readonly walletHint: PaymentMethodId | null;
};

export const TZ_OPERATORS: Readonly<Record<TzOperatorId, TzOperatorSpec>> = {
  VIETTEL: { id: "VIETTEL", licensee: "Viettel Tanzania PLC", brand: "Halotel", walletHint: "HALO_PESA" },
  HONORA: { id: "HONORA", licensee: "Honora Tanzania PLC", brand: "Yas", walletHint: "MIXX" },
  AIRTEL: { id: "AIRTEL", licensee: "Airtel Tanzania PLC", brand: "Airtel", walletHint: "AIRTEL_MONEY" },
  VODACOM: { id: "VODACOM", licensee: "Vodacom Tanzania PLC", brand: "Vodacom", walletHint: "MPESA" },
  TTCL: { id: "TTCL", licensee: "Tanzania Telecommunications Corporation", brand: "TTCL", walletHint: "TTCL_PESA" },
  // Holds 064 on paper and has no live network — see the row below.
  TELXER: { id: "TELXER", licensee: "Telxer Enterprise Limited", brand: "Telxer", walletHint: null },
} as const;

/* ══ THE MOBILE NDC TABLE ════════════════════════════════════════════════════ */

export type TzNdcRow = {
  readonly ndc: string;
  readonly operator: TzOperatorId;
  /** False only where a code is allocated on paper but has no reachable network. */
  readonly sendable: boolean;
  /** Set where the regulator and the carrier data do not agree — accepted, and said out loud. */
  readonly disputed?: string;
  /** Why a row is not sendable, in words, for the person who pasted the number. */
  readonly note?: string;
};

/**
 * TCRA v1.16 Table 9 ("List of Numbering Resources blocks Assignment for telecoms services" — ⚠️ it is
 * Table 10 in the 2024 and v1.15 editions, and Table 10 in v1.16 is the customer-assistance short
 * codes, so a citation carried forward from the old edition points at the wrong table), cross-checked row by row against libphonenumber's TZ ranges and carrier map.
 * The two agree on every code except 60.
 */
export const TZ_MOBILE_NDCS: readonly TzNdcRow[] = [
  {
    ndc: "60",
    operator: "AIRTEL",
    sendable: true,
    disputed:
      "TCRA v1.16 still lists 060 as reserved, but libphonenumber added 25560 as Airtel on 2026-08-26 " +
      "with IR21 provenance — the operator's own GSMA roaming filing. Accepted rather than refused: " +
      "see ② in this file's header.",
  },
  { ndc: "61", operator: "VIETTEL", sendable: true },
  { ndc: "62", operator: "VIETTEL", sendable: true },
  { ndc: "63", operator: "VIETTEL", sendable: true },
  {
    ndc: "64",
    operator: "TELXER",
    sendable: false,
    note:
      "064 is allocated to Telxer Enterprise Limited but has no live network: TCRA marks it not " +
      "operational, it has had no entry in libphonenumber's carrier map since 2022-09-08, and Telxer " +
      "does not appear in TCRA's own quarterly subscriber table. Sending to it is billed and never arrives.",
  },
  { ndc: "65", operator: "HONORA", sendable: true },
  { ndc: "66", operator: "AIRTEL", sendable: true },
  { ndc: "67", operator: "HONORA", sendable: true },
  { ndc: "68", operator: "AIRTEL", sendable: true },
  { ndc: "69", operator: "AIRTEL", sendable: true },
  { ndc: "70", operator: "HONORA", sendable: true },
  { ndc: "71", operator: "HONORA", sendable: true },
  { ndc: "72", operator: "VODACOM", sendable: true },
  { ndc: "73", operator: "TTCL", sendable: true },
  { ndc: "74", operator: "VODACOM", sendable: true },
  { ndc: "75", operator: "VODACOM", sendable: true },
  { ndc: "76", operator: "VODACOM", sendable: true },
  { ndc: "77", operator: "HONORA", sendable: true },
  { ndc: "78", operator: "AIRTEL", sendable: true },
  { ndc: "79", operator: "VODACOM", sendable: true },
] as const;

/** Geographic fixed-line codes, TCRA v1.16 Table 3. Named so a landline gets a useful sentence. */
const TZ_FIXED_AREAS: Readonly<Record<string, string>> = {
  "22": "Dar es Salaam",
  "23": "Coast (Pwani), Lindi, Morogoro and Mtwara",
  "24": "Zanzibar, Pemba and Unguja",
  "25": "Katavi, Mbeya, Rukwa, Ruvuma and Songwe",
  "26": "Dodoma, Iringa, Njombe, Singida and Tabora",
  "27": "Arusha, Kilimanjaro, Manyara and Tanga",
  "28": "Geita, Kagera, Kigoma, Mara, Mwanza, Shinyanga and Simiyu",
};

/* ══ THE INDEX — BUILT ONCE ══════════════════════════════════════════════════ */

let tableBuilds = 0;

const NDC_INDEX: ReadonlyMap<string, TzNdcRow> = (() => {
  tableBuilds += 1;
  return new Map(TZ_MOBILE_NDCS.map((r) => [r.ndc, r]));
})();

/**
 * How many times the NDC index has been constructed in this process. It is 1, and the suite requires
 * it to still be 1 after parsing a large corpus. ⭐ It exists to make "the table is built once"
 * FALSIFIABLE — an invariant nothing can check is a comment, and §3c of the marketing plan turns on
 * this one: 150,000 rows per import.
 */
export function tzTableBuildCount(): number {
  return tableBuilds;
}

/* ══ THE VERDICTS ════════════════════════════════════════════════════════════ */

export type TzVerdict =
  | "ok"
  | "not_a_number"
  | "too_short"
  | "too_long"
  | "landline"
  | "foreign"
  | "unallocated_prefix";

export type TzNumber = {
  readonly verdict: TzVerdict;
  /** ⛔ SET ONLY WHEN `verdict === "ok"`. A landline has a perfectly good E.164 form, and handing it
   *  out here would invite exactly the send this module exists to prevent. */
  readonly e164: string | null;
  /** The gateway wire form, `255…`. Same rule: only when `ok`. */
  readonly msisdn: string | null;
  readonly ndc: string | null;
  readonly operator: TzOperatorSpec | null;
  /** The 3-3-3 grouping, for a screen. Present whenever there are nine national digits to group. */
  readonly display: string | null;
  /** ⭐ ONE SENTENCE, IN WORDS, FOR A HUMAN — never a code. This is what an importer shows beside a
   *  row it refused, and "UNALLOCATED_PREFIX" tells the person who pasted it nothing at all. */
  readonly reason: string;
};

/* ⛔ MODULE-LEVEL, NOT PER CALL — 150,000 calls per import (§3c). A `/g` regex carries `lastIndex`
 * state, so these are only ever used with `String.replace`, never with `.test`. */
const NON_DIGITS = /\D/g;
const LEADING_QUOTES = /^['\s]+/;
const LEADING_ZEROS = /^0+/;

/* ══ THE PARSER ══════════════════════════════════════════════════════════════ */

export function parseTzNumber(raw: string): TzNumber {
  const none = (verdict: TzVerdict, reason: string, extra?: Partial<TzNumber>): TzNumber => ({
    verdict, e164: null, msisdn: null, ndc: null, operator: null, display: null, reason, ...extra,
  });

  // ⭐ The leading apostrophe is ours: the CSV export writes `'+255…` so a spreadsheet does not read
  // the number as a formula. Our own round trip must survive it.
  const trimmed = (raw ?? "").replace(LEADING_QUOTES, "");
  if (trimmed === "") return none("not_a_number", "This row has no phone number in it.");

  const hadPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(NON_DIGITS, "");
  if (digits === "") {
    return none("not_a_number", `“${clip(raw)}” has no digits in it, so it is not a phone number.`);
  }

  const hadIdd = digits.startsWith("00");
  if (hadIdd) digits = digits.slice(2);

  // Written internationally but not Tanzanian — the one case we can be certain about.
  if ((hadPlus || hadIdd) && !digits.startsWith(TZ_COUNTRY_CODE)) {
    return none(
      "foreign",
      `This is an international number outside Tanzania (country code +${digits.slice(0, 3)}…). ` +
        `50pick sends only to Tanzanian mobile numbers.`,
    );
  }

  let national: string;
  if (digits.startsWith(TZ_COUNTRY_CODE) && digits.length > 9) national = digits.slice(3);
  else if (digits.startsWith("0")) national = digits.replace(LEADING_ZEROS, "");
  else national = digits;

  if (national.length < 9) {
    return none(
      "too_short",
      `A Tanzanian number has nine digits after +255; this one has ${national.length}. ` +
        `Check whether some digits were cut off.`,
    );
  }
  if (national.length > 9) {
    return none(
      "too_long",
      `A Tanzanian number has nine digits after +255; this one has ${national.length}. ` +
        `If it is an international number, write it with a + and its country code.`,
    );
  }

  const display = formatTzPhone(national);
  const lead = national.slice(0, 2);

  // ── mobile ──────────────────────────────────────────────────────────────
  if (national[0] === "6" || national[0] === "7") {
    const row = NDC_INDEX.get(lead);
    if (!row) {
      return none("unallocated_prefix", `No Tanzanian operator holds numbers beginning 0${lead}.`, { ndc: lead, display });
    }
    if (!row.sendable) {
      return none("unallocated_prefix", row.note ?? `Numbers beginning 0${lead} are not reachable.`, {
        ndc: lead, display, operator: TZ_OPERATORS[row.operator],
      });
    }
    const operator = TZ_OPERATORS[row.operator];
    const wallet = operator.walletHint ? paymentMethodName(operator.walletHint) : null;
    return {
      verdict: "ok",
      e164: `+${TZ_COUNTRY_CODE}${national}`,
      msisdn: `${TZ_COUNTRY_CODE}${national}`,
      ndc: lead,
      operator,
      display,
      // ⛔ "issued by", not "is on" — see ① in the header. A ported number keeps its NDC.
      reason: `A Tanzanian mobile number, issued from ${operator.brand}'s range${wallet ? ` (${wallet})` : ""}.`,
    };
  }

  // ── everything else that is nine digits and Tanzanian ───────────────────
  if (TZ_FIXED_AREAS[lead]) {
    return none("landline", `This is a landline in ${TZ_FIXED_AREAS[lead]}. A landline cannot receive an SMS.`, { ndc: lead, display });
  }
  if (lead === "20" || lead === "21" || lead === "29") {
    return none("landline", `Numbers beginning 0${lead} are a fixed-line range the regulator has reserved and nobody uses yet.`, { ndc: lead, display });
  }
  if (national[0] === "5") {
    return none("landline", `Numbers beginning 0${lead} are corporate data lines, not mobile numbers.`, { ndc: lead, display });
  }
  if (national.startsWith("800") || national.startsWith("808") || national.startsWith("840") || national.startsWith("86")) {
    return none("landline", `This is a toll-free or shared-cost service number, not a mobile number.`, { ndc: lead, display });
  }
  if (national[0] === "9") {
    return none("landline", `This is a premium-rate service number, not a mobile number.`, { ndc: lead, display });
  }
  if (national.startsWith("41")) {
    return none("landline", `Numbers beginning 041 are internet telephone lines, not mobile numbers.`, { ndc: lead, display });
  }
  if (national.startsWith("30")) {
    return none("landline", `Numbers beginning 030 are machine-to-machine lines, not mobile numbers.`, { ndc: lead, display });
  }

  return none("unallocated_prefix", `Numbers beginning 0${lead} are not part of Tanzania's numbering plan.`, { ndc: lead, display });
}

/** True only for a number this platform may put on the wire. */
export function isSendableTzNumber(raw: string): boolean {
  return parseTzNumber(raw).verdict === "ok";
}

/* ══ THE DISPLAY FORMATTER — ONE HOME ════════════════════════════════════════ */

/**
 * ⭐ "ABC DEF GHI", the way a Tanzanian writes their own number.
 *
 * 🔴 IT LIVES HERE BECAUSE THERE WERE TWO OF IT. `phone-input.tsx` held this exact function,
 * module-private; `wallet/withdraw/page.tsx:273` rendered the same shape with
 * `.replace(/(\d{3})(?=\d)/g, "$1 ")`. They AGREE on every nine-digit input and disagree on
 * everything else — the regex has no nine-digit cap, so a stored `255712345678` renders
 * "255 712 345 678", and it groups every run of three rather than 3-3-3 specifically. Two functions
 * that agree on the happy path and diverge on the malformed one are the pair that never gets caught,
 * because the malformed input is the one nobody screenshots.
 *
 * ⚠️ NO TRAILING SPACE AT A GROUP BOUNDARY — "712", not "712 ". The caret would otherwise sit after
 * a space the user did not type, and the next keystroke lands in the wrong place.
 *
 * ⚠️ It does NOT strip non-digits: callers hand it the canonical digits. `phone-input.tsx` pairs it
 * with `maxLength={11}` and `pattern="[67][0-9]{2} [0-9]{3} [0-9]{3}"`, both written against the
 * FORMATTED string — those stay on the component, because they are about that field, not about this
 * grouping.
 */
export function formatTzPhone(digits: string): string {
  const d = (digits ?? "").slice(0, 9);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

/** Keeps a quoted echo of bad input short enough for one line of a table cell. */
function clip(s: string): string {
  const t = (s ?? "").trim();
  return t.length <= 24 ? t : `${t.slice(0, 24)}…`;
}
