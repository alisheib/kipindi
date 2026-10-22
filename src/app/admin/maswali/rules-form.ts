/**
 * /admin/maswali · THE MILLIONEA RULES FORM, as one list of fields (MASWALI-BUILD S7-F2; the S7 review, round 2).
 *
 * The page draws each field from this list, the form posts each by its key, and the action reads them back here, so the
 * three can never disagree. ⛔ NO RULE IS JUDGED HERE: the parser only turns the posted strings into the config's own
 * shape (a percentage into a rate, digits into a whole number); every bound is `maswaliConfigProblem`'s, on the server,
 * in its own words. The one refusal of its own is an emptied field — a box cleared by accident is never stored as 0.
 * ⛔ Client-safe: the server module is reached by `import type` alone (erased at build; `test:client-graph-safe`).
 */
import type { GuaranteeReservePolicy, IsoWeekday, MaswaliConfig } from "@/lib/server/maswali-config";

/** What one field holds, which decides the control that draws it and how it is read back. */
export type RulesFieldKind = "tzs" | "whole" | "percent" | "weekday" | "clock" | "policy";

/** The fields, in the order the form shows them, with the group each sits in. */
export const RULES_FIELDS = [
  { key: "ticketPriceTzs", label: "Ticket price (TZS)", kind: "tzs", group: "money" },
  { key: "floorTzs", label: "Jackpot floor (TZS)", kind: "tzs", group: "money" },
  { key: "jackpotFeeRate", label: "Fee at payout (% of the jackpot)", kind: "percent", group: "money" },
  { key: "ticketCapPerWeek", label: "Tickets per account per week", kind: "whole", group: "money" },
  { key: "guaranteeReservePolicy", label: "Guarantee before a week opens", kind: "policy", group: "money" },
  { key: "openWeekday", label: "Sales open on", kind: "weekday", group: "week" },
  { key: "openAt", label: "Sales open at (EAT)", kind: "clock", group: "week" },
  { key: "closeWeekday", label: "Sales close on", kind: "weekday", group: "week" },
  { key: "closeAt", label: "Sales close at (EAT)", kind: "clock", group: "week" },
  { key: "minLockBufferMinutes", label: "Close before the first event (minutes)", kind: "whole", group: "week" },
  { key: "voidDeadlineHours", label: "Void deadline after an event (hours)", kind: "whole", group: "results" },
  { key: "finalDeadlineWeekday", label: "Final deadline (results week)", kind: "weekday", group: "results" },
  { key: "finalDeadlineAt", label: "Final deadline at (EAT)", kind: "clock", group: "results" },
  { key: "objectionWindowHours", label: "Objection window (hours)", kind: "whole", group: "results" },
  { key: "objectionNotBeforeAt", label: "Objection window closes no earlier than (EAT)", kind: "clock", group: "results" },
  { key: "releaseAlertHours", label: "Alert when a release waits (hours)", kind: "whole", group: "results" },
  { key: "probabilityMin", label: "Each question's probability, at least (%)", kind: "percent", group: "questions" },
  { key: "probabilityMax", label: "Each question's probability, at most (%)", kind: "percent", group: "questions" },
  { key: "maxPerCompetition", label: "Questions from one competition, at most", kind: "whole", group: "questions" },
  { key: "minReserveSources", label: "Distinct sources among the reserves, at least", kind: "whole", group: "questions" },
  // MASWALI-BUILD S6 (MB-91): the desk's complaint answer target — a support promise, not a week's rule: no week freezes it,
  // so a change applies at once (the card says so), and the desk's scripts quote it live.
  { key: "complaintAnswerDays", label: "Complaint answer target (working days)", kind: "whole", group: "desk" },
] as const satisfies ReadonlyArray<{ key: string; label: string; kind: RulesFieldKind; group: string }>;

export type RulesFieldKey = (typeof RULES_FIELDS)[number]["key"];
/** The form's values: every field as the text its control holds. */
export type RulesFormValues = Record<RulesFieldKey, string>;

/** The groups, in order, with the heading each is shown under. */
export const RULES_GROUPS = [
  { id: "money", title: "Money" },
  { id: "week", title: "The week" },
  { id: "results", title: "Results" },
  { id: "questions", title: "The questions" },
  { id: "desk", title: "The support desk" },
] as const;

/** ISO weekdays (1 = Monday … 7 = Sunday), as `eat-day.ts` counts the week. */
export const WEEKDAY_OPTIONS = [
  { value: "1", label: "Monday" }, { value: "2", label: "Tuesday" }, { value: "3", label: "Wednesday" }, { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" }, { value: "6", label: "Saturday" }, { value: "7", label: "Sunday" },
];

/** The guarantee policies' words (OD-02), by the config's own keys. */
export const GUARANTEE_POLICY_LABEL: Readonly<Record<string, string>> = {
  FLOOR_LESS_CARRY_PER_OPEN_WEEK: "Each unsettled week's floor less its confirmed carry",
};

/** A rate as the percentage the form shows ("0.13" → "13"), kept to two decimals of a percent. */
const asPercent = (rate: number) => String(Math.round(rate * 10_000) / 100);

/**
 * The chance of YES a question may carry under these rules (OD-14, `questionCaps`), in percents to two decimals — what the
 * week builder's hint states (S6-ADMIN: the officer reads the band, never the rule's code).
 */
export function chanceBand(c: Pick<MaswaliConfig, "questionCaps">): { min: number; max: number } {
  return { min: Number(asPercent(c.questionCaps.probabilityMin)), max: Number(asPercent(c.questionCaps.probabilityMax)) };
}
/** A percentage as the rate the config stores ("13" → 0.13). Not a number stays not a number: the validator says so. */
const asRate = (text: string) => Math.round(Number(text) * 100) / 10_000;
/** Digits as a number; the thousands groups a box may show are dropped first. */
const asWhole = (text: string) => Number(text.replace(/[,\s]/g, ""));

/** The value a field shows when read: its option's words for a weekday or the policy, an amount in groups, else its text. */
export function rulesValueText(key: RulesFieldKey, value: string, policies: ReadonlyArray<{ value: string; label: string }>): string {
  const field = RULES_FIELDS.find((f) => f.key === key);
  if (field?.kind === "weekday") return WEEKDAY_OPTIONS.find((o) => o.value === value)?.label ?? value;
  if (field?.kind === "policy") return policies.find((o) => o.value === value)?.label ?? value;
  if (field?.kind === "tzs" && value !== "" && Number.isFinite(asWhole(value))) return asWhole(value).toLocaleString("en");
  return value;
}

/** The rules as the form shows them: every field of `maswali.config` but the pinned paid-exit window (MB-50). */
export function rulesFormValues(c: MaswaliConfig): RulesFormValues {
  return {
    ticketPriceTzs: String(c.ticketPriceTzs), floorTzs: String(c.floorTzs), jackpotFeeRate: asPercent(c.jackpotFeeRate),
    ticketCapPerWeek: String(c.ticketCapPerWeek), guaranteeReservePolicy: c.guaranteeReservePolicy,
    openWeekday: String(c.openWeekday), openAt: c.openAt, closeWeekday: String(c.closeWeekday), closeAt: c.closeAt,
    minLockBufferMinutes: String(c.minLockBufferMinutes), voidDeadlineHours: String(c.voidDeadlineHours),
    finalDeadlineWeekday: String(c.finalDeadlineWeekday), finalDeadlineAt: c.finalDeadlineAt,
    objectionWindowHours: String(c.objectionWindowHours), objectionNotBeforeAt: c.objectionNotBeforeAt,
    releaseAlertHours: String(c.releaseAlertHours),
    probabilityMin: asPercent(c.questionCaps.probabilityMin), probabilityMax: asPercent(c.questionCaps.probabilityMax),
    maxPerCompetition: String(c.questionCaps.maxPerCompetition), minReserveSources: String(c.questionCaps.minReserveSources),
    complaintAnswerDays: String(c.complaintAnswerDays),
  };
}

/**
 * Everything the form saves: the whole config but the paid-exit window, which no save may set (`saveMaswaliConfig`) — the
 * desk's complaint answer target included (MASWALI-BUILD S6, MB-91), the one field no week freezes: it applies at once.
 */
export type MaswaliRulesUpdate = Omit<MaswaliConfig, "paidExitWindowMinutes">;

/**
 * The posted form, read back into the config's shape — every field, so the save replaces the rules whole (the question
 * rules included: `defineConfig` merges shallowly). An emptied field is refused at that field; anything else, however
 * wrong, is handed on for the config's own validator to refuse in its own words.
 */
export function parseRulesForm(read: (key: string) => string | null): { ok: true; updates: MaswaliRulesUpdate } | { ok: false; error: string; field: RulesFieldKey } {
  const text = (k: RulesFieldKey) => String(read(k) ?? "").trim();
  for (const f of RULES_FIELDS) {
    if (text(f.key) === "") return { ok: false, error: `${f.label}: give a value. An emptied box is never saved as 0.`, field: f.key };
  }
  const weekday = (k: RulesFieldKey) => asWhole(text(k)) as IsoWeekday;
  return {
    ok: true,
    updates: {
      ticketPriceTzs: asWhole(text("ticketPriceTzs")), floorTzs: asWhole(text("floorTzs")), jackpotFeeRate: asRate(text("jackpotFeeRate")),
      ticketCapPerWeek: asWhole(text("ticketCapPerWeek")), guaranteeReservePolicy: text("guaranteeReservePolicy") as GuaranteeReservePolicy,
      openWeekday: weekday("openWeekday"), openAt: text("openAt"), closeWeekday: weekday("closeWeekday"), closeAt: text("closeAt"),
      minLockBufferMinutes: asWhole(text("minLockBufferMinutes")), voidDeadlineHours: asWhole(text("voidDeadlineHours")),
      finalDeadlineWeekday: weekday("finalDeadlineWeekday"), finalDeadlineAt: text("finalDeadlineAt"),
      objectionWindowHours: asWhole(text("objectionWindowHours")), objectionNotBeforeAt: text("objectionNotBeforeAt"),
      releaseAlertHours: asWhole(text("releaseAlertHours")),
      questionCaps: {
        probabilityMin: asRate(text("probabilityMin")), probabilityMax: asRate(text("probabilityMax")),
        maxPerCompetition: asWhole(text("maxPerCompetition")), minReserveSources: asWhole(text("minReserveSources")),
      },
      complaintAnswerDays: asWhole(text("complaintAnswerDays")),
    },
  };
}

/** The holiday list as the form posts it (a JSON list of "YYYY-MM-DD"), or null when it is not one. */
export function parseHolidayList(raw: string): string[] | null {
  let v: unknown;
  try { v = JSON.parse(raw); } catch { return null; }
  return Array.isArray(v) && v.every((d) => typeof d === "string") ? (v as string[]) : null;
}
