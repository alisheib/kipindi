/**
 * MASWALI MILLIONEA — THE WEEK'S RULES, ADMIN-EDITABLE, FROZEN PER WEEK (MASWALI-BUILD S1; MASWALI-PLAN §7b S1 item 4).
 *
 * ⭐ OWNER RULE 2026-10-03: admins can change everything; safety by validation and audit, never a locked box. Every
 * number a player reads about Millionea — the ticket price, the floor, the fee, the cap, the close, the buffer, the
 * void deadline, the objection window — is a field here, validated before it is stored, saved with a read-back
 * (`setVerified`) and audited `{ before, after, changes }` by the factory. ⛔ No surface prints one of these numbers
 * from a literal: it prints this config (for the coming week) or the week's frozen `rulesSnapshot` (for a running one).
 *
 * ⛔ A CHANGE APPLIES FROM THE NEXT WEEK, NEVER TO A RUNNING ONE (MB-75). `snapshotMaswaliRules` freezes every field
 * into the week's `rulesSnapshot` when the week opens, and the week reads only its snapshot from then on — the same
 * rule every poll's `feeSnapshot` keeps. The form says so beside its fields (`/admin/maswali`, S7-F2, the Owner's).
 *
 * ⛔ THE FEE HAS ONE HOME PER WEEK. `jackpotFeeRate` is edited here, but a week freezes it into its market's
 * `feeSnapshot` (`feeModel: "jackpot-payout"`, `market-config.ts → snapshotFromConfig`) beside the TRA and GBT rates
 * that global config freezes for every product. The rules snapshot does NOT copy it: two frozen copies of one rate are
 * two answers to one question.
 *
 * ⛔ THE LICENCE BASIS IS NOT HERE. It is the Owner's own record and ceremony (`maswali-licence.ts`, on /pools), so a
 * save of the rules form can never touch it.
 */
import { defineConfig } from "./define-config";
import { MAX_JACKPOT_FEE_RATE } from "@/lib/payout";
import { formatTzs } from "@/lib/utils";

export const MASWALI_CONFIG_KEY = "maswali.config";

/** A local wall-clock time in East Africa Time, "HH:MM", 24-hour. EAT is UTC+3 all year (no daylight saving). */
export type EatClock = string;

/** 1 = Monday … 7 = Sunday (ISO 8601), the way `eat-day.ts` counts the week. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * OD-02 · how much guarantee must be in the account before a week may open.
 * - `FLOOR_LESS_CARRY_PER_OPEN_WEEK` (ruled): Σ (floor − confirmed carry-in) over every unsettled week, the new one
 *   included. Settlement aborts rather than pay less.
 */
export type GuaranteeReservePolicy = "FLOOR_LESS_CARRY_PER_OPEN_WEEK";
export const GUARANTEE_RESERVE_POLICIES: readonly GuaranteeReservePolicy[] = ["FLOOR_LESS_CARRY_PER_OPEN_WEEK"];

/** OD-14 · how the fifteen questions are built. Hard refusals, each overridable only by the Owner, typed. */
export type MaswaliQuestionCaps = {
  /** Every question carries an estimated probability inside [min, max], with its source. */
  probabilityMin: number;
  probabilityMax: number;
  /** At most this many of the fifteen from one competition. */
  maxPerCompetition: number;
  /** The five reserves are drawn from at least this many distinct sources. */
  minReserveSources: number;
};

/** Flat on purpose: `defineConfig` merges shallowly, and `questionCaps` is always replaced whole. */
export type MaswaliConfig = {
  /** MR-8: the fixed price of one ticket, in whole shillings. Inside RULES §2.3's stake range. */
  ticketPriceTzs: number;
  /** MR-20: the house floor J never falls below, counted BEFORE the fee. */
  floorTzs: number;
  /** MR-24: the fee share of J, taken only in a week with at least one 10/10. Frozen into the week's `feeSnapshot`. */
  jackpotFeeRate: number;
  /** MR-11: tickets per account per week. */
  ticketCapPerWeek: number;
  /** The default open: the weekday and EAT time a week starts selling. */
  openWeekday: IsoWeekday;
  openAt: EatClock;
  /** The default close (R-WEEK): the weekday and EAT time sales stop. A week may move it within the buffer (MB-28). */
  closeWeekday: IsoWeekday;
  closeAt: EatClock;
  /** OD-15: sales close at least this many minutes before the earliest of the fifteen events. */
  minLockBufferMinutes: number;
  /** OD-09b: a question voids if not played and settled within this many hours of its scheduled start… */
  voidDeadlineHours: number;
  /** …capped at the week's final deadline: this weekday and EAT time of the RESULTS week (the week after the close). */
  finalDeadlineWeekday: IsoWeekday;
  finalDeadlineAt: EatClock;
  /** OD-05: one objection window per week, opening when the graded set is final… */
  objectionWindowHours: number;
  /** …and never closing before this EAT time of day. */
  objectionNotBeforeAt: EatClock;
  /** OD-14. */
  questionCaps: MaswaliQuestionCaps;
  /** OD-02. */
  guaranteeReservePolicy: GuaranteeReservePolicy;
  /** OD-06: alert when a prepared settlement has waited this long for the accounting officer's release. */
  releaseAlertHours: number;
  /** MB-50: a Millionea ticket has no paid early exit. Pinned at 0 and frozen, so a week can never sell one. */
  paidExitWindowMinutes: 0;
  /**
   * MB-91 (S6 review R2-7): how many working days Compliance takes, usually, to answer a written Millionea complaint — the
   * support desk's scripts quote it (`maswali-support.ts`). ⛔ A support promise, not a week's rule: NO week freezes it
   * (`snapshotMaswaliRules` leaves it out, as it leaves the fee), so the desk always quotes the promise as it stands.
   */
  complaintAnswerDays: number;
};

/** The ruled values (Ali 2026-10-16 and the accepted batch, MASWALI-PLAN §9). */
export const MASWALI_DEFAULTS: MaswaliConfig = {
  ticketPriceTzs: 1_000,
  floorTzs: 1_000_000,
  jackpotFeeRate: 0.13,
  ticketCapPerWeek: 10,
  openWeekday: 1,
  openAt: "00:00",
  closeWeekday: 5,
  closeAt: "18:00",
  minLockBufferMinutes: 30,
  voidDeadlineHours: 48,
  finalDeadlineWeekday: 1,
  finalDeadlineAt: "23:59",
  objectionWindowHours: 24,
  objectionNotBeforeAt: "12:00",
  questionCaps: { probabilityMin: 0.3, probabilityMax: 0.7, maxPerCompetition: 4, minReserveSources: 3 },
  guaranteeReservePolicy: "FLOOR_LESS_CARRY_PER_OPEN_WEEK",
  releaseAlertHours: 4,
  paidExitWindowMinutes: 0,
  // ⚠️ Decided under the Owner's delegation (S6, 2026-10-18) and owed his confirmation: the platform's one review promise
  // counted in days is the agent programme's (RULES §2.10). A value, not a pin — admins change it here.
  complaintAnswerDays: 5,
};

/** RULES §2.3: the platform's stake range, which a ticket price must sit inside. */
const STAKE_MIN_TZS = 500;
const STAKE_MAX_TZS = 1_000_000;

const isWhole = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
const isRate = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const isWeekday = (v: unknown): v is IsoWeekday => isWhole(v, 1, 7);
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
const isClock = (v: unknown): v is EatClock => typeof v === "string" && CLOCK.test(v);
/** Minutes after Monday 00:00 EAT, for ordering a weekday and a time inside one week. */
const weekMinute = (d: IsoWeekday, c: EatClock) => (d - 1) * 1440 + Number(c.slice(0, 2)) * 60 + Number(c.slice(3, 5));

function capsProblem(q: unknown): string | null {
  if (!q || typeof q !== "object") return "The question rules are unreadable.";
  const c = q as Record<string, unknown>;
  if (!isRate(c.probabilityMin, 0, 1) || !isRate(c.probabilityMax, 0, 1) || (c.probabilityMin as number) >= (c.probabilityMax as number)) {
    return "The probability band must be two percentages between 0 and 100, the lower one first.";
  }
  if (!isWhole(c.maxPerCompetition, 1, 15)) return "At most this many questions per competition must be a whole number from 1 to 15.";
  if (!isWhole(c.minReserveSources, 1, 5)) return "The reserves' distinct sources must be a whole number from 1 to 5.";
  return null;
}

/** Why a candidate config is refused, in words an officer can act on — or null when it is acceptable. */
export function maswaliConfigProblem(c: MaswaliConfig): string | null {
  if (!isWhole(c.ticketPriceTzs, STAKE_MIN_TZS, STAKE_MAX_TZS)) {
    return `The ticket price must be a whole number from ${formatTzs(STAKE_MIN_TZS)} to ${formatTzs(STAKE_MAX_TZS)}.`;
  }
  if (!isWhole(c.floorTzs, 0, 1_000_000_000)) return "The floor must be a whole number of shillings, 0 or more.";
  if (c.floorTzs > 0 && c.floorTzs < c.ticketPriceTzs) return "A floor below one ticket's price is not a floor — set it to 0 or at least the ticket price.";
  if (!isRate(c.jackpotFeeRate, 0, MAX_JACKPOT_FEE_RATE)) return `The fee at payout must be between 0% and ${MAX_JACKPOT_FEE_RATE * 100}% of the jackpot.`;
  if (!isWhole(c.ticketCapPerWeek, 1, 100)) return "The ticket cap must be a whole number from 1 to 100 a week.";
  if (!isWeekday(c.openWeekday) || !isClock(c.openAt)) return "The open must be a weekday and a time (HH:MM, East Africa Time).";
  if (!isWeekday(c.closeWeekday) || !isClock(c.closeAt)) return "The close must be a weekday and a time (HH:MM, East Africa Time).";
  if (weekMinute(c.closeWeekday, c.closeAt) <= weekMinute(c.openWeekday, c.openAt)) return "The close must come after the open, inside the same week.";
  if (!isWhole(c.minLockBufferMinutes, 5, 1440)) return "The close buffer must be a whole number of minutes from 5 to 1,440.";
  if (!isWhole(c.voidDeadlineHours, 1, 168)) return "The void deadline must be a whole number of hours from 1 to 168.";
  if (!isWeekday(c.finalDeadlineWeekday) || !isClock(c.finalDeadlineAt)) return "The final deadline must be a weekday and a time (HH:MM, East Africa Time).";
  if (!isWhole(c.objectionWindowHours, 1, 168)) return "The objection window must be a whole number of hours from 1 to 168.";
  if (!isClock(c.objectionNotBeforeAt)) return "The objection window's earliest close must be a time (HH:MM, East Africa Time).";
  const caps = capsProblem(c.questionCaps);
  if (caps) return caps;
  if (!(GUARANTEE_RESERVE_POLICIES as readonly unknown[]).includes(c.guaranteeReservePolicy)) return "The guarantee policy is not one the platform knows.";
  if (!isWhole(c.releaseAlertHours, 1, 72)) return "The release alert must be a whole number of hours from 1 to 72.";
  if (c.paidExitWindowMinutes !== 0) return "A Millionea ticket has no paid early exit; the window stays 0."; // MB-50
  if (!isWhole(c.complaintAnswerDays, 1, 30)) return "The complaint answer target must be a whole number of working days from 1 to 30.";
  return null;
}

/**
 * Hydration keeps the fields it can read, by name, and nothing else. A stored field of the wrong type falls back to its
 * default rather than half-applying, and the merged whole is validated again before any week freezes it.
 */
const migrate = (p: Record<string, unknown>): Partial<MaswaliConfig> => {
  const out: Partial<MaswaliConfig> = {};
  const num = (k: keyof MaswaliConfig) => { if (typeof p[k] === "number") (out as Record<string, unknown>)[k] = p[k]; };
  const str = (k: keyof MaswaliConfig) => { if (typeof p[k] === "string") (out as Record<string, unknown>)[k] = p[k]; };
  for (const k of ["ticketPriceTzs", "floorTzs", "jackpotFeeRate", "ticketCapPerWeek", "openWeekday", "closeWeekday",
    "minLockBufferMinutes", "voidDeadlineHours", "finalDeadlineWeekday", "objectionWindowHours", "releaseAlertHours", "complaintAnswerDays"] as const) num(k);
  for (const k of ["openAt", "closeAt", "finalDeadlineAt", "objectionNotBeforeAt", "guaranteeReservePolicy"] as const) str(k);
  if (!capsProblem(p.questionCaps)) {
    const q = p.questionCaps as MaswaliQuestionCaps;
    out.questionCaps = { probabilityMin: q.probabilityMin, probabilityMax: q.probabilityMax, maxPerCompetition: q.maxPerCompetition, minReserveSources: q.minReserveSources };
  }
  return out;
};

const cfg = defineConfig<MaswaliConfig>({
  key: MASWALI_CONFIG_KEY,
  defaults: MASWALI_DEFAULTS,
  migrate,
  validate: (c) => {
    const why = maswaliConfigProblem(c);
    return why ? { ok: false, reason: why } : { ok: true };
  },
  audit: { action: "maswali.config.updated", targetType: "MaswaliConfig" },
});

/** The rules the NEXT week will freeze. Sync, for screens; a week opening reads `readMaswaliConfigFresh`. */
export function getMaswaliConfig(): MaswaliConfig {
  const c = cfg.get();
  return { ...c, questionCaps: { ...c.questionCaps } };
}

/**
 * The rules read FRESH from the row, for the one moment they matter: a week opening. ⛔ Fails closed — a week never
 * opens on whatever this container booted with, and never on a row that no longer validates.
 */
export async function readMaswaliConfigFresh(): Promise<{ ok: true; config: MaswaliConfig } | { ok: false; error: string }> {
  const r = await cfg.reload();
  if (!r.ok) return { ok: false, error: r.error };
  const why = maswaliConfigProblem(r.config);
  if (why) return { ok: false, error: `The stored Millionea rules do not validate: ${why}` };
  return { ok: true, config: { ...r.config, questionCaps: { ...r.config.questionCaps } } };
}

/**
 * The rules read FRESH for the Owner's form (`/admin/maswali`, S7-F2): the stored row as the next open would read it,
 * with the validator's words when it no longer validates — the form shows it anyway, or rules that stopped validating
 * could never be corrected where they are kept. ⛔ A read that could not ask answers why, and the form is not drawn.
 */
export async function readMaswaliConfigForForm(): Promise<{ ok: true; config: MaswaliConfig; problem: string | null } | { ok: false; error: string }> {
  const r = await cfg.reload();
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, config: { ...r.config, questionCaps: { ...r.config.questionCaps } }, problem: maswaliConfigProblem(r.config) };
}

/**
 * Save the rules for the coming weeks. The ONE writer, and it VERIFIES the write (`setVerified`): the officer is told
 * "saved" only after the row was read back. A running week is untouched — it reads its snapshot.
 */
export async function saveMaswaliConfig(
  updates: Partial<Omit<MaswaliConfig, "paidExitWindowMinutes">>,
  officerId: string,
): Promise<{ ok: true; config: MaswaliConfig } | { ok: false; error: string }> {
  const fresh = await cfg.reload();
  if (!fresh.ok) return { ok: false, error: "The current Millionea rules could not be read, so nothing was changed. Please try again." };
  return cfg.setVerified(updates, officerId);
}

/**
 * The week's frozen rules: every field of `maswali.config` as it stood at the open — but the fee (its home is the
 * market's `feeSnapshot`) and the desk's complaint answer target (a support promise, read live) — with the version of
 * this shape.
 */
export type MaswaliRulesSnapshot = Omit<MaswaliConfig, "jackpotFeeRate" | "complaintAnswerDays"> & {
  /** The shape's version. A reader refuses a version it does not know rather than guess at its fields. */
  v: 1;
  /** When the week froze it (ISO 8601). */
  frozenAt: string;
};

/**
 * ⭐ FREEZE THE RULES FOR ONE WEEK — called once, by the week's open, inside its transaction. Refuses a config that does
 * not validate. `jackpotFeeRate` is deliberately absent: it freezes into the market's `feeSnapshot` (header); and so is
 * `complaintAnswerDays`, which no week freezes (R2-7).
 */
export function snapshotMaswaliRules(c: MaswaliConfig, frozenAt: Date): MaswaliRulesSnapshot {
  const why = maswaliConfigProblem(c);
  if (why) throw new Error(`[maswali-config] refusing to freeze rules that do not validate: ${why}`);
  const { jackpotFeeRate: _fee, complaintAnswerDays: _desk, ...rest } = c;
  void _fee;
  void _desk;
  return { ...rest, questionCaps: { ...c.questionCaps }, v: 1, frozenAt: frozenAt.toISOString() };
}

/**
 * ⛔ S7-F4 · VERSION 1'S MONEY CEILING: 10^12 TZS. A frozen ticket price, a floor, or one purchase at the cap (the price
 * times the cap) above it is not a v1 week's money. Under it every sum the engine makes of them stays exact: 9,007 such
 * amounts still sum below 2^53 (`Number.MAX_SAFE_INTEGER` + 1), and the engine adds far fewer — a purchase is one price
 * times at most the cap, a top-up is a floor less a jackpot, the guarantee's requirement one floor per unsettled week. It
 * is also the range the platform prints money in (`formatTzs`, `test:money-format` §3). A bound of the shape, never a
 * public value: the config's own ranges (`maswaliConfigProblem`) sit far inside it.
 */
const V1_MONEY_CEILING_TZS = 1_000_000_000_000;

/**
 * ⛔ VERSION 1'S OWN SHAPE, FROZEN WITH THE VERSION (MASWALI-BUILD S7-F3; the review's LOW-3, taken as MEDIUM). A week's
 * rules are read against the version they froze, never against today's validator: `maswaliConfigProblem` decides what
 * the NEXT week may freeze, and a later change to its ranges (a lower cap, a narrower price range, a longer buffer) must
 * never make a running week unreadable — its open, the Owner's return and the alarms all refuse a week they cannot read.
 * So this asks only what a v1 week's code needs to read each field: present, with its type; whole where it is money or
 * a count; a weekday and a clock where it is a time; the close after the open; the fifteen questions' own limits; the one
 * guarantee policy v1 knows; no paid exit (MB-50). ⛔ Never edited to follow the config validator: a field or a meaning
 * version 1 cannot carry is a new version, with its own reader beside this one.
 */
function rulesV1Problem(s: Record<string, unknown>): string | null {
  const ANY = Number.MAX_SAFE_INTEGER;
  if (!isWhole(s.ticketPriceTzs, 1, ANY)) return "the ticket price is not a whole number of shillings";
  if (!isWhole(s.floorTzs, 0, ANY)) return "the floor is not a whole number of shillings";
  if (!isWhole(s.ticketCapPerWeek, 1, ANY)) return "the ticket cap is not a whole number of tickets";
  const price = s.ticketPriceTzs as number, floor = s.floorTzs as number, cap = s.ticketCapPerWeek as number;
  if (price > V1_MONEY_CEILING_TZS || floor > V1_MONEY_CEILING_TZS || price * cap > V1_MONEY_CEILING_TZS) {
    return `its money passes version 1's ceiling of ${formatTzs(V1_MONEY_CEILING_TZS)} (the price, the floor, or one purchase at the cap), under which every sum stays exact`;
  }
  if (!isWeekday(s.openWeekday) || !isClock(s.openAt) || !isWeekday(s.closeWeekday) || !isClock(s.closeAt)) return "the open or the close is not a weekday and a time";
  if (weekMinute(s.closeWeekday as IsoWeekday, s.closeAt as EatClock) <= weekMinute(s.openWeekday as IsoWeekday, s.openAt as EatClock)) return "the close does not come after the open";
  if (!isWhole(s.minLockBufferMinutes, 0, ANY)) return "the close buffer is not a whole number of minutes";
  if (!isWhole(s.voidDeadlineHours, 1, ANY) || !isWhole(s.objectionWindowHours, 1, ANY) || !isWhole(s.releaseAlertHours, 1, ANY)) return "a window is not a whole number of hours";
  if (!isWeekday(s.finalDeadlineWeekday) || !isClock(s.finalDeadlineAt) || !isClock(s.objectionNotBeforeAt)) return "the final deadline or the objection window's earliest close is not a weekday and a time";
  const q = s.questionCaps as Record<string, unknown> | null | undefined;
  if (!q || typeof q !== "object" || !isRate(q.probabilityMin, 0, 1) || !isRate(q.probabilityMax, 0, 1) || (q.probabilityMin as number) >= (q.probabilityMax as number)
    || !isWhole(q.maxPerCompetition, 1, 15) || !isWhole(q.minReserveSources, 1, 5)) return "the question rules are unreadable";
  if (s.guaranteeReservePolicy !== "FLOOR_LESS_CARRY_PER_OPEN_WEEK") return "the guarantee policy is not one version 1 knows";
  if (s.paidExitWindowMinutes !== 0) return "it carries a paid early exit, which a Millionea ticket never has"; // MB-50
  return null;
}

/** Read a stored `rulesSnapshot` back, or refuse it. ⛔ Never defaulted: a week's rules are what it froze, or nothing. */
export function readMaswaliRulesSnapshot(raw: unknown): { ok: true; rules: MaswaliRulesSnapshot } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "The week has no frozen rules." };
  const s = raw as Record<string, unknown>;
  if (s.v !== 1) return { ok: false, error: `The week's rules are version ${JSON.stringify(s.v)}, which this build cannot read.` };
  if (typeof s.frozenAt !== "string" || Number.isNaN(Date.parse(s.frozenAt))) return { ok: false, error: "The week's rules carry no freeze time." };
  // S7-F3 · against version 1's own shape, never `maswaliConfigProblem` (above).
  const why = rulesV1Problem(s);
  if (why) return { ok: false, error: `The week's frozen rules do not read as version 1: ${why}.` };
  const r = s as unknown as MaswaliRulesSnapshot;
  return { ok: true, rules: { ...r, questionCaps: { ...r.questionCaps } } };
}

/**
 * ⭐ OD-02 · EACH UNSETTLED WEEK AT ITS OWN FROZEN FLOOR, as `guaranteeRequirement` counts them — or the weeks whose frozen
 * rules cannot be read. ⛔ FAIL CLOSED (MASWALI-BUILD S7-F2): such a week's floor is unknown, so the requirement is, and
 * the readers that counted it as 0 understated what the guarantee must hold — the console's "Needed now" and its
 * alert stayed quiet, and the Owner's return could take back money a week still needed. The open, the return, the
 * console and the nightly invariants ask here, as the settlement aborts rather than pay less and the player's floor line
 * shows no floor (`maswali-player.ts`).
 */
export function unsettledFloors(weeks: ReadonlyArray<{ id: string; code: string; rulesSnapshot: unknown; rolloverIn: number | null }>):
  { ok: true; weeks: Array<{ floor: number; confirmedCarryIn: number | null }> } | { ok: false; unreadable: Array<{ id: string; code: string }> } {
  const counted: Array<{ floor: number; confirmedCarryIn: number | null }> = [];
  const unreadable: Array<{ id: string; code: string }> = [];
  for (const w of weeks) {
    const r = readMaswaliRulesSnapshot(w.rulesSnapshot);
    if (r.ok) counted.push({ floor: r.rules.floorTzs, confirmedCarryIn: w.rolloverIn });
    else unreadable.push({ id: w.id, code: w.code });
  }
  return unreadable.length > 0 ? { ok: false, unreadable } : { ok: true, weeks: counted };
}
