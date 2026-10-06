/**
 * U49s · THE MARKETING SMS SETTINGS — the shape, the defaults, the bounds and the ONE rule that judges them (spec
 * `docs/marketing-specs/ENGINE-SPEC.md` §4.3 U49s; decisions E14 · OQ5). PURE AND CLIENT-SAFE: the "Marketing SMS" tab on
 * /admin/system validates every box live with `marketingSmsSettingsProblems`, and the server's verified setter
 * (`src/lib/server/marketing/sms-settings.ts`) runs the same function before it writes — so the card and the server can
 * never disagree about what is allowed. Pinned in `test:client-graph-safe`.
 *
 * ⭐ WHAT IT HOLDS — five numbers the owner sets, each a decision with money or a promise behind it:
 *   · the price of one SMS, used to estimate a campaign until our own sends measure it (G9: TZS 6);
 *   · the SMS credit always kept for login and withdrawal codes — marketing stops before the credit falls below it, so a
 *     campaign can never cost a player their login code (G3 / E16: TZS 20,000);
 *   · the most one campaign may spend (G3: TZS 10,000 — the first campaign's cap, E15);
 *   · the send window, 08:00–20:00 EAT by default (OQ5 — 50pick's own rule; no law sets these hours).
 *
 * ⛔ ONE WINDOW CONSTANT. `SEND_WINDOW_EAT` is OQ5's one named constant. U13's `window.ts` RE-EXPORTS it — it is never
 * written twice. (This module deliberately does not create `window.ts`: `test:rg-policy`'s late-night control holds on
 * that file existing, and it must appear only in the commit where the send path obeys a window — spec §4.3 Files.)
 *
 * ⛔ NO MONEY FIGURE IS EVER INFERRED HERE: every number is the owner's saved value or the documented default.
 */

/** OQ5 · the send window's default — 08:00 to 20:00 East Africa Time, as minutes after midnight. U13 re-exports it. */
export const SEND_WINDOW_EAT: Readonly<{ startMinute: 480; endMinute: 1200 }> = Object.freeze({ startMinute: 480, endMinute: 1200 });

/** The stored record. `v` is the shape's version: a row in any other shape is not read (it falls back to the defaults). */
export type MarketingSmsSettings = {
  v: 1;
  /** TZS per SMS segment — at most two decimals. */
  pricePerSegmentTzs: number;
  /** Whole TZS of SMS credit kept for login and withdrawal codes. */
  codesReserveTzs: number;
  /** Whole TZS — the most one campaign may spend. */
  campaignLimitTzs: number;
  /** Minutes after midnight EAT, on the quarter hour. */
  windowStartMinute: number;
  windowEndMinute: number;
};

/** The five settings an owner edits — every key but the shape's version. */
export type SettingsField = Exclude<keyof MarketingSmsSettings, "v">;

/** The fields in the order the form shows them (and the order every problem is listed in). */
export const SETTINGS_FIELDS: readonly SettingsField[] = Object.freeze([
  "pricePerSegmentTzs", "codesReserveTzs", "campaignLimitTzs", "windowStartMinute", "windowEndMinute",
] as const);

/** E14 · the defaults — G9 (TZS 6), G3 (TZS 10,000 per campaign), E16 (TZS 20,000 kept), OQ5 (08:00–20:00). */
export const MARKETING_SMS_SETTINGS_DEFAULTS: Readonly<MarketingSmsSettings> = Object.freeze({
  v: 1,
  pricePerSegmentTzs: 6,
  codesReserveTzs: 20_000,
  campaignLimitTzs: 10_000,
  windowStartMinute: SEND_WINDOW_EAT.startMinute,
  windowEndMinute: SEND_WINDOW_EAT.endMinute,
});

/** The bounds (spec §4.3 decision 5). The reserve's MINIMUM is the platform's SMS floor, read by the caller. */
export const MARKETING_SMS_BOUNDS = Object.freeze({
  price: Object.freeze({ min: 1, max: 1000 }),
  reserve: Object.freeze({ max: 10_000_000 }),
  limit: Object.freeze({ min: 100, max: 10_000_000 }),
  startEarliest: 420,
  startLatest: 1140,
  endEarliest: 540,
  endLatest: 1260,
  minWindow: 120,
  step: 15,
} as const);

const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Each refusal, in the words the card prints under its box (spec §4.3 "States and sentences"). */
export const SETTINGS_SENTENCE = Object.freeze({
  price: "Enter the price per SMS in TZS — from 1 to 1,000, at most two decimals.",
  reserve: (floorTzs: number): string =>
    `Enter the credit to keep for codes in TZS — at least ${grouped.format(floorTzs)} and at most 10,000,000.`,
  limit: "Enter a campaign limit from TZS 100 to TZS 10,000,000.",
  start: "The window must start between 07:00 and 19:00, on the quarter hour.",
  end: "The window must end between 09:00 and 21:00, on the quarter hour.",
  length: "The window must be at least 2 hours long.",
});

/** What one setting may arrive as: a number (a stored row) or the text of a form box. */
type Raw = unknown;

/** A whole number written plainly: digits only, no sign, no grouping, no decimals — or a number that is an integer. */
function wholeOf(raw: Raw): number | null {
  if (typeof raw === "number") return Number.isSafeInteger(raw) ? raw : null;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!/^[0-9]{1,9}$/.test(t)) return null;
  return Number(t);
}

/** A price: digits with at most two decimals ("6", "6.5", "6.50") — or a finite number with at most two decimals. */
function priceOf(raw: Raw): number | null {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    const cents = raw * 100;
    return Math.abs(Math.round(cents) - cents) < 1e-6 ? Math.round(cents) / 100 : null;
  }
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!/^[0-9]{1,4}(?:[.][0-9]{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100) / 100;
}

const onTheQuarter = (m: number): boolean => m % MARKETING_SMS_BOUNDS.step === 0;

/**
 * ⭐ THE ONE RULE — every field judged, EVERY problem at once, each against its own field (the card prints each under its
 * own box). `raw` is hostile: a form's text or a stored row; anything that is not an object is a problem on every field.
 * `platformFloorTzs` is the platform's own SMS floor (`smsBalanceThresholds().floorTzs`) — the credit kept for codes may
 * never be set below the floor the rail already holds back.
 * ⛔ The shape's version is not judged here: a save writes `v: 1` itself, and the row reader checks a stored `v`.
 */
export function marketingSmsSettingsProblems(
  raw: unknown,
  platformFloorTzs: number,
): { ok: true; value: MarketingSmsSettings } | { ok: false; problems: Partial<Record<SettingsField, string>> } {
  const o = raw !== null && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const B = MARKETING_SMS_BOUNDS;
  const floor = Number.isFinite(platformFloorTzs) && platformFloorTzs > 0 ? Math.ceil(platformFloorTzs) : 0;
  const problems: Partial<Record<SettingsField, string>> = {};

  const price = priceOf(o.pricePerSegmentTzs);
  if (price === null || price < B.price.min || price > B.price.max) problems.pricePerSegmentTzs = SETTINGS_SENTENCE.price;

  const reserve = wholeOf(o.codesReserveTzs);
  if (reserve === null || reserve < floor || reserve > B.reserve.max) problems.codesReserveTzs = SETTINGS_SENTENCE.reserve(floor);

  const limit = wholeOf(o.campaignLimitTzs);
  if (limit === null || limit < B.limit.min || limit > B.limit.max) problems.campaignLimitTzs = SETTINGS_SENTENCE.limit;

  const start = wholeOf(o.windowStartMinute);
  const startOk = start !== null && start >= B.startEarliest && start <= B.startLatest && onTheQuarter(start);
  if (!startOk) problems.windowStartMinute = SETTINGS_SENTENCE.start;

  const end = wholeOf(o.windowEndMinute);
  const endOk = end !== null && end >= B.endEarliest && end <= B.endLatest && onTheQuarter(end);
  if (!endOk) problems.windowEndMinute = SETTINGS_SENTENCE.end;
  // The length is judged only between two readable ends, and said under the END — the box an officer moves to fix it.
  else if (startOk && (end as number) - (start as number) < B.minWindow) problems.windowEndMinute = SETTINGS_SENTENCE.length;

  if (Object.keys(problems).length > 0) return { ok: false, problems };
  return {
    ok: true,
    value: {
      v: 1,
      pricePerSegmentTzs: price as number,
      codesReserveTzs: reserve as number,
      campaignLimitTzs: limit as number,
      windowStartMinute: start as number,
      windowEndMinute: end as number,
    },
  };
}

/** Minutes after midnight as "HH:MM". */
export function minuteLabel(minute: number): string {
  const m = Math.max(0, Math.min(24 * 60, Math.trunc(minute)));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** The window as people read it: "08:00–20:00 EAT". */
export function formatWindow(s: Pick<MarketingSmsSettings, "windowStartMinute" | "windowEndMinute">): string {
  return `${minuteLabel(s.windowStartMinute)}–${minuteLabel(s.windowEndMinute)} EAT`;
}

/** The quarter hours a window may start at, and end at — what the card's two selects offer, so no bad hour can be chosen. */
export function windowStartChoices(): number[] {
  const out: number[] = [];
  for (let m = MARKETING_SMS_BOUNDS.startEarliest; m <= MARKETING_SMS_BOUNDS.startLatest; m += MARKETING_SMS_BOUNDS.step) out.push(m);
  return out;
}
export function windowEndChoices(): number[] {
  const out: number[] = [];
  for (let m = MARKETING_SMS_BOUNDS.endEarliest; m <= MARKETING_SMS_BOUNDS.endLatest; m += MARKETING_SMS_BOUNDS.step) out.push(m);
  return out;
}

/** A price as money is written: whole shillings bare ("TZS 6"), a part shilling with both decimals ("TZS 6.50").
 *  ⛔ Not `formatTzs`, which rounds to whole shillings — a TZS 6.50 price would print as TZS 7. */
export function formatPriceTzs(value: number): string {
  if (!Number.isFinite(value)) return "TZS —";
  return Number.isInteger(value)
    ? `TZS ${grouped.format(value)}`
    : `TZS ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
}

/**
 * ⭐ THE FINGERPRINT A PAGE POSTS BACK (`base`) — the five values it was rendered from, in one fixed order. A save whose
 * base is not the record's fingerprint NOW is refused `stale`, and nothing is written: two officers editing at once
 * can never silently overwrite each other (U33w's m1 precedent).
 */
export function settingsFingerprint(s: MarketingSmsSettings): string {
  return [s.v, s.pricePerSegmentTzs, s.codesReserveTzs, s.campaignLimitTzs, s.windowStartMinute, s.windowEndMinute].join("|");
}
