/**
 * MASWALI MILLIONEA — WHAT THE ADMIN CONSOLE READS (MASWALI-BUILD S4; MASWALI-PLAN §7b S4 items 1 and 5).
 *
 * Three pages, three domains, one read model:
 *   · `/admin/maswali` and `/admin/maswali/[weekId]` (trading) — the weeks, the builder's checklist, the seal console;
 *   · `/admin/maswali/pools` (accounting) — the jackpots, the guarantee and its requirement, the float, the exposure,
 *     the prepared settlements, the rollover trail;
 *   · `/admin/maswali/integrity` (compliance) — held shares, the sales pause, the seal log after the fact, the winners.
 *
 * ⛔ READS ONLY. Every act is a server action that calls the services (`maswali-service.ts`, `maswali-settlement.ts`,
 *    `maswali-money-service.ts`, `maswali-pause.ts`).
 * ⛔ THE TRADING READS CARRY NO TICKET DATA beyond counts (MR-14, MB-34): the officer who seals never sees picks, holders,
 *    serials or the exposure — what a week would cost the house is accounting's, and who holds what is compliance's.
 * ⛔ A BALANCE THAT COULD NOT BE READ IS `null`, NEVER 0: the page says it could not be read.
 */
import { noticeStore, questionStore, ticketStore, weekStore, type StoredQuestion, type StoredTicket, type StoredWeek } from "./maswali-dal";
import { settledWeekGaps, type SettlementField } from "./maswali-week-record";
import { audit, getAuditForTargetsDurable } from "./audit";
import { withLock } from "./locks";
import { millioneaNoticeHref } from "./notification-service";
import { winnerSmsRecords, winnerSmsTargetId } from "./maswali-winner-sms";
import {
  calendarStartMs, deadlinesUnderRules, frozenRules, gradable, guaranteeProblem, NO_LICENCE_BASIS, openProblems, proposeVoidsAtDeadline, stopNextActNow, sunsetState,
} from "./maswali-service";
import { guaranteeReader, maswaliAccountBalance } from "./maswali-money-service";
import { FLOAT_ALERT_BUFFER_TZS, previewMaswaliSettlement, type MaswaliSettlementPreview } from "./maswali-settlement";
import { unrefundedVoids } from "./maswali-void";
import { getMaswaliConfig, snapshotMaswaliRules, unsettledFloors, type MaswaliRulesSnapshot } from "./maswali-config";
import { getLicenceBasis, licenceBasisAllowsOpen, type LicenceBasis } from "./maswali-licence";
import { holidayOn } from "./maswali-holidays";
import { TAKEOVER_ALERT_MS, takeoverWatch, type TakeoverWatch } from "./maswali-takeover";
import { getSalesPause, type SalesPause } from "./maswali-pause";
import { millioneaStateNow } from "./millionea-switch";
import { acct, maswaliJackpotOf } from "./ledger";
import { db, type SmsStatus } from "./store";
import { marketStore } from "./market-dal";
import { consoleOfficerName } from "./maswali-integrity";
import { snapshotOrLegacy } from "./market-config";
import { MAIN_COUNT, settlementGate, weekVoidCertain } from "@/lib/maswali-score";
import { guaranteeRequirement } from "@/lib/maswali-money";
import type { RolloutState } from "@/lib/millionea-rollout";
import { formatTzs } from "@/lib/utils";
import { eatInText, fmtEat } from "@/lib/maswali-admin-format";
import { parseWeekListQuery, selectWeekPage, type WeekListQuery } from "@/lib/maswali-week-list";
import { parseIntegrityListQuery, selectHeldShares, selectWinnerTickets, selectSealWeeks, selectVoidableWeeks, type IntegrityListQuery } from "@/lib/maswali-integrity-list";

const HOUR = 3_600_000;

/** One week as the trading list shows it. */
export type ConsoleWeekRow = {
  id: string; code: string; visibility: StoredWeek["visibility"]; state: StoredWeek["state"]; isFinal: boolean;
  opensAt: string; closesAt: string; finalDeadlineAt: string; ticketCount: number; settledAt: string | null;
  /** How many of the fifteen carry a final result. */
  sealed: number;
  /** The slots the settlement gate still waits on (empty when ready). */
  needs: number[];
  voidCertain: boolean;
  objectionsCloseAt: string | null;
};

const unsettled = (w: StoredWeek) => w.state === "OPEN" || w.state === "CLOSED" || w.state === "RESOLVING";

async function rowOf(w: StoredWeek): Promise<ConsoleWeekRow> {
  const qs = gradable(await questionStore.listForWeek(w.id));
  const gate = settlementGate(qs);
  return {
    id: w.id, code: w.code, visibility: w.visibility, state: w.state, isFinal: w.isFinal,
    opensAt: w.opensAt, closesAt: w.closesAt, finalDeadlineAt: w.finalDeadlineAt, ticketCount: w.ticketCount, settledAt: w.settledAt,
    sealed: qs.filter((q) => q.outcome !== null).length, needs: gate.ready ? [] : gate.needs, voidCertain: weekVoidCertain(qs),
    objectionsCloseAt: w.objectionsCloseAt,
  };
}

/** The weeks, newest first. */
/** Every week, newest first. ⛔ No silent cap: a reader that needs them all (the heal) gets them all; `limit` is a glance. */
export async function listConsoleWeeks(limit?: number): Promise<ConsoleWeekRow[]> {
  const weeks = await weekStore.list(limit === undefined ? {} : { limit });
  return Promise.all(weeks.map(rowOf));
}

/**
 * One page of the week list (`test:grid-paging`: it grows a week at a time). Every week is COUNTED, so none falls off the
 * console; rows are built only for the page asked, clamped into range.
 */
export async function pageConsoleWeeks(askedPage: number, perPage: number, query: WeekListQuery = parseWeekListQuery({})): Promise<{ rows: ConsoleWeekRow[]; total: number; allTotal: number; page: number }> {
  const weeks = await weekStore.list({});
  const selected = selectWeekPage(weeks, askedPage, perPage, query);
  return { rows: await Promise.all(selected.weeks.map(rowOf)), total: selected.total, allTotal: selected.allTotal, page: selected.page };
}

/** A 1-based page inside [1, last], the pager's own rule. */
function clampPage(asked: number, total: number, perPage: number): number {
  const last = Math.max(1, Math.ceil(total / perPage));
  return Math.min(Math.max(1, Number.isFinite(asked) ? Math.floor(asked) : 1), last);
}

/** One week for the builder and the seal console. `problems` is the open's checklist, read as the open would read it. */
export type ConsoleWeekDetail = {
  week: StoredWeek;
  row: ConsoleWeekRow;
  questions: StoredQuestion[];
  /** The rules the week froze, or — while DRAFT — the rules it would freeze if opened now. */
  rules: MaswaliRulesSnapshot | null;
  /**
   * ⭐ S6-ADMIN · G2 · the fee the week takes at payout, as a rate (0.13 = 13% of the jackpot): the fee its market froze
   * (`weekFeeRate`), or — while DRAFT — the fee it would freeze if opened now. Null when it cannot be read: the page says
   * so, never 0.
   */
  feeRate: number | null;
  /** DRAFT only: every reason the open would refuse, in words; empty when it would open. */
  problems: string[] | null;
  /**
   * What the officer reviews while they can still act on it — a DRAFT, and an OPEN week whose close is still ahead —
   * never a refusal (MB-85: a public holiday the close falls on). Null once the close has passed.
   */
  warnings: string[] | null;
  /** Slots whose void deadline passed unsealed: the system proposes a void, an officer seals it (MR-15). */
  proposedVoids: number[];
};

export async function consoleWeekDetail(weekId: string, now: Date = new Date()): Promise<ConsoleWeekDetail | null> {
  const week = await weekStore.get(weekId);
  if (!week) return null;
  const questions = await questionStore.listForWeek(week.id);
  let rules = frozenRules(week);
  let problems: string[] | null = null;
  let warnings: string[] | null = null;
  if (week.state === "DRAFT") {
    try { rules = snapshotMaswaliRules(getMaswaliConfig(), now); } catch { rules = null; }
    if (!rules) problems = ["The Millionea rules do not validate; the Owner fixes them under Rules for the next week, on the Millionea page, first."];
    else {
      // The week's own checks, then the two the open asks beside them, in its own words: without these the checklist said
      // every check passes while the open refused for want of a licence basis or the guarantee. ⭐ S7 · on the deadlines
      // the open would re-freeze (`deadlinesUnderRules`), never the draft's own, so the two can never disagree.
      const due = deadlinesUnderRules(week, questions, rules);
      problems = await openProblems(due.week, due.questions, rules, now.getTime());
      if (!licenceBasisAllowsOpen(getLicenceBasis())) problems.unshift(NO_LICENCE_BASIS);
      const short = await guaranteeProblem(week, rules, guaranteeReader);
      if (short) problems.push(short);
    }
  }
  // ⭐ S7 · THE HOLIDAY REVIEW (MB-85, OD-27): the Owner's list of public holidays, read against the day the sales close —
  //    WHEREVER AN OFFICER CAN STILL ACT ON IT: a draft (it opens, and the close is brought forward, or the week is
  //    skipped with notice) and an open week whose close is still ahead (brought forward, R-WEEK, MB-28). It used to end
  //    at the open, though the act it asks for, moving the close, is done only once the week is open. Once the close has
  //    passed nothing can move it (MR-13), so the review is silent there. A warning, never a refusal.
  if (week.state === "DRAFT" || (week.state === "OPEN" && Date.parse(week.closesAt) > now.getTime())) {
    warnings = [];
    const holiday = holidayOn(Date.parse(week.closesAt));
    if (holiday) {
      // MB-85 the holiday review · R-WEEK and MB-28 the close may move · OD-27 a week may be skipped with notice. ⛔ The
      // officer reads the rule in words, never its code (S6-ADMIN, DESIGN_AUTHORITY §M8a item 29).
      warnings.push(week.state === "DRAFT"
        ? `The sales close falls on ${holiday}, a public holiday on the Owner's list. The week may still open: bring the close forward once it is open, or skip the week with notice.`
        : `The sales close falls on ${holiday}, a public holiday on the Owner's list. Bring the close forward while it is still ahead.`);
    }
  }
  // G2 · a DRAFT's fee is the one the rules it would freeze carry (the same read as `rules` above, so the two agree);
  // a frozen week's is its market's own.
  const feeRate = week.state === "DRAFT" ? (rules ? getMaswaliConfig().jackpotFeeRate : null) : await weekFeeRate(week);
  return { week, row: await rowOf(week), questions, rules, feeRate, problems, warnings, proposedVoids: await proposeVoidsAtDeadline(week.id, now) };
}

/**
 * ⭐ S6-ADMIN · G2 · THE FEE A FROZEN WEEK TAKES AT PAYOUT, as the console reads it: its market's `feeSnapshot` — the fee's
 * one home per week (`maswali-config.ts`'s header; the player pages read the same field) — when that snapshot is the
 * jackpot-payout model with a finite rate. Null for a week with no market, a market that cannot be read, or a snapshot of
 * another model: unknown, never 0.
 */
export async function weekFeeRate(week: Pick<StoredWeek, "marketId">): Promise<number | null> {
  if (!week.marketId) return null;
  let market: Awaited<ReturnType<typeof marketStore.get>> | null = null;
  try { market = await marketStore.get(week.marketId); } catch { market = null; }
  if (!market) return null;
  const fees = snapshotOrLegacy(market.feeSnapshot);
  const rate = fees.jackpotFeeRate;
  return fees.feeModel === "jackpot-payout" && typeof rate === "number" && Number.isFinite(rate) ? rate : null;
}

/** An operator alert (MASWALI-PLAN §7b S4 item 5). Never a guess: each names the week and the fact behind it. */
export type ConsoleAlert = { level: "critical" | "warning"; text: string; weekId?: string };

/** `deps.readFloat` reads the payout float (the payments provider's by default; a suite hands its own); `deps.readTakeover`
 *  the winners' takeover watch (`maswali-takeover.ts` by default). */
export async function consoleAlerts(
  now: Date = new Date(), deps: { readFloat?: FloatReader; readTakeover?: () => Promise<TakeoverWatch> } = {},
): Promise<ConsoleAlert[]> {
  const nowMs = now.getTime();
  const out: ConsoleAlert[] = [];
  const cfg = getMaswaliConfig();
  // ⛔ EVERY WEEK AN ALERT CAN CONCERN, READ BY STATE — never the newest N, or the week stuck longest would be the one
  // that falls off the page and goes quiet: each non-terminal week, and each VOIDED week whose refunds have not landed by
  // R1's one truth (`maswali-void.ts`). Newest first, as before.
  const weeks = [...await weekStore.list({ states: ["DRAFT", "OPEN", "CLOSED", "RESOLVING"] }), ...await unrefundedVoids()]
    .sort((a, b) => b.seq - a.seq);
  for (const w of weeks) {
    if (w.state === "OPEN" && Date.parse(w.closesAt) + 5 * 60_000 < nowMs) {
      out.push({ level: "critical", weekId: w.id, text: `${w.code}: sales should have closed at ${eatInText(w.closesAt)}, and the close is not stamped.` });
    }
    // R1 · a VOIDED week is here only while it is owed: the void is decided, and the money is not back until its market
    // carries the settled stamp, written with the refunds.
    if (w.state === "VOIDED") {
      out.push({ level: "critical", weekId: w.id, text: `${w.code}: it voided whole, and its refunds have not landed. The tick retries them; the heal runs them now.` });
    }
    if (w.state === "CLOSED" || w.state === "RESOLVING") {
      const qs = await questionStore.listForWeek(w.id);
      for (const q of qs) {
        if (q.outcome !== null) continue;
        const since = nowMs - Date.parse(q.eventStartsAt);
        if (since >= 12 * HOUR) out.push({ level: "critical", weekId: w.id, text: `${w.code}: slot ${q.slot} is unsealed 12 hours after its event started.` });
        else if (since >= 2 * HOUR) out.push({ level: "warning", weekId: w.id, text: `${w.code}: slot ${q.slot} is unsealed 2 hours after its event started.` });
      }
      // A question drafted from a Yes/No market must seal the same way that market resolved: a mismatch is either a wrong
      // seal or a wrong resolution, and both are money (S4 item 5).
      for (const q of qs) {
        if (!q.linkedMarketId || (q.outcome !== "YES" && q.outcome !== "NO")) continue;
        const linked = await marketStore.get(q.linkedMarketId).catch(() => null);
        const theirs = linked?.resolvedOutcome;
        if ((theirs === "YES" || theirs === "NO") && theirs !== q.outcome) {
          out.push({ level: "critical", weekId: w.id, text: `${w.code}: slot ${q.slot} is sealed ${q.outcome}, but its linked Yes/No market resolved ${theirs}.` });
        }
      }
      const proposed = await proposeVoidsAtDeadline(w.id, now);
      // MR-15 · a question unsealed at its void deadline voids on a ground from the closed list, sealed by an officer.
      if (proposed.length) out.push({ level: "warning", weekId: w.id, text: `${w.code}: ${proposed.length} question(s) passed their void deadline unsealed; void each one, with its ground.` });
      if (w.objectionsCloseAt && Date.parse(w.objectionsCloseAt) + cfg.releaseAlertHours * HOUR < nowMs) {
        out.push({ level: "critical", weekId: w.id, text: `${w.code}: its results are final and its window closed ${cfg.releaseAlertHours} h ago, and it is not settled. Accounting releases it.` });
      }
    }
  }
  out.push(...await floatShortAlerts(deps.readFloat));
  out.push(...await takeoverAlerts(nowMs, deps.readTakeover));
  const held = await maswaliAccountBalance(acct.maswaliGuarantee);
  // ⛔ S7-F2 · FAIL CLOSED: a week whose frozen rules cannot be read has an unknown floor, so the guarantee cannot be shown
  //    to cover the unsettled weeks and the alert fires, naming the week. Counted as 0, its floor kept this alert silent.
  const floors = unsettledFloors(weeks.filter(unsettled));
  // OD-02 · the guarantee covers every unsettled week's floor less its confirmed carry.
  for (const w of floors.ok ? [] : floors.unreadable) {
    out.push({ level: "critical", weekId: w.id, text: `${w.code}: its frozen rules cannot be read, so its floor is unknown and the guarantee cannot be shown to cover the unsettled weeks.` });
  }
  const need = floors.ok ? guaranteeRequirement(floors.weeks) : null;
  if (held === null) out.push({ level: "critical", text: "The guarantee balance could not be read." });
  else if (need !== null && held < need) out.push({ level: "critical", text: `The guarantee holds ${formatTzs(held)}; the unsettled weeks need ${formatTzs(need)}.` });
  // The product's own standing speaks only once Millionea has a week — any week, settled ones included (`maxSeq` is 0
  // only before the first draft): before it, a missing licence basis is the plan's Gate A, not an alert for every officer.
  if ((await weekStore.maxSeq()) > 0) {
    // OD-01 · the licence basis is the Owner's record.
    if (!licenceBasisAllowsOpen(getLicenceBasis())) out.push({ level: "warning", text: "No licence basis is recorded; no week can open until the Owner records it." });
    const pause = getSalesPause();
    if (pause.paused) out.push({ level: "warning", text: `Sales are paused: ${pause.reason ?? "no reason recorded"}.` });
    // S6 · MB-93 · a winner nothing has reached a day after the settlement: the desk calls them (the integrity page lists
    // who, with what was sent). Silent before the first winner, as every line in this block is before the first week.
    const unreached = await unreachedWinners(now).catch(() => null);
    if (unreached === null) out.push({ level: "warning", text: "Whether every Millionea winner has been reached could not be read." });
    else {
      const late = new Map<string, UnreachedWinner[]>();
      for (const u of unreached) if (u.hoursSince >= UNREACHED_ALERT_HOURS) late.set(u.weekId, [...(late.get(u.weekId) ?? []), u]);
      for (const [weekId, rows] of late) {
        out.push({ level: "warning", weekId, text: `${rows[0].weekCode}: ${rows.length === 1 ? "a winner has" : `${rows.length} winners have`} had no notice reach them in ${UNREACHED_ALERT_HOURS} hours since the settlement. The integrity page lists them for a call.` });
      }
    }
  }
  return out;
}

/**
 * ⭐ MB-96 · A WINNING ACCOUNT THAT MAY HAVE CHANGED HANDS (S7-F9; the watch is `maswali-takeover.ts`). A paying week
 * with such accounts is named here with HOW MANY — never which (this strip is the trading console's, which carries no
 * holder: MR-14, MB-34); Compliance reviews the accounts on the integrity page and may hold the share there (OD-07). A
 * finding stands here for a while after it was last seen, and on the integrity page for the whole watch. ⛔ An alert
 * only: nothing is held. ⛔ Fail closed: a watch that could not be read says so, never silence. ⛔ The words say what
 * the control enforces, never what it watches for (the repository is public; the lead's ruling, 2026-10-22).
 */
async function takeoverAlerts(nowMs: number, read?: () => Promise<TakeoverWatch>): Promise<ConsoleAlert[]> {
  const watch = await (read ?? (() => takeoverWatch(new Date(nowMs))))().catch((): TakeoverWatch => ({ readable: false, findings: [] }));
  const out: ConsoleAlert[] = [];
  if (!watch.readable) {
    out.push({ level: "warning", text: "The winners' takeover watch could not be read in full, so a winning account taken over after its payout may go unseen. Compliance reviews the winners on the integrity page." }); // MB-96
  }
  const byWeek = new Map<string, { code: string; n: number }>();
  for (const f of watch.findings) {
    if (nowMs - Date.parse(f.flaggedAt) > TAKEOVER_ALERT_MS) continue;
    const x = byWeek.get(f.weekId) ?? { code: f.code, n: 0 };
    x.n++;
    byWeek.set(f.weekId, x);
  }
  for (const [weekId, { code, n }] of byWeek) {
    out.push({ level: "critical", weekId,
      text: `${code}: ${n} winning account${n === 1 ? "" : "s"} may have been taken over since this week's payout. Compliance reviews ${n === 1 ? "it" : "them"} on the integrity page and may hold the share.` }); // MB-96
  }
  return out;
}

// ── WINNERS NOT YET REACHED (S6; MB-93, MB-11) ──────────────────────────────────────────────────────

/** How long a winner may go unreached after the settlement before the desk is alerted (MB-93: "no notice for 24h"). */
export const UNREACHED_ALERT_HOURS = 24;

/**
 * The desk list reads the weeks SETTLED in this window, never every settled week on every console load (the review's
 * MEDIUM 7): a day-old alert concerns a recent week, and the card says the window aloud. A winner past it is still the
 * support desk's, through the per-ticket lookup.
 */
export const UNREACHED_RECENT_DAYS = 28;

/** The desk's own record that a winner was reached by phone (`recordMillioneaWinnerReached`, Compliance, typed). */
export const WINNER_REACHED_ACTION = "maswali.winner.reached";
/** The word an officer types to record it. */
export const WINNER_REACHED_WORD = "REACHED";

/** A winning player of a settled week whom no notice is KNOWN to have reached — the desk's list to call (MB-93). */
export type UnreachedWinner = {
  weekId: string;
  weekCode: string;
  userId: string;
  holder: string;
  serials: string[];
  /** The paid shares' sum — 0 when every share is held for Compliance, or forfeited to the jackpot; null when a paid share's
   *  record lacks its amount (R's rule: said "Not on record", never printed as 0). */
  paidTzs: number | null;
  /** Every share is held for a Compliance decision (MB-43). */
  held: boolean;
  /** Every share was forfeited to the jackpot (OD-07): nothing is the holder's, and the card says so — never "held". */
  forfeited: boolean;
  settledAt: string;
  hoursSince: number;
  /** The win's bell row was written (its key, `millioneaNoticeHref`, under any of the holder's winning tickets). */
  bell: boolean;
  /** Where the letter could go: a confirmed address, one never confirmed (sent only if the account cannot sign in), none.
   *  ⛔ A state, never the address: no player's contact reaches the console (read-tiers §7; S6-INT 23). */
  emailState: "confirmed" | "unconfirmed" | "none";
  /** The winner SMS's own record (`MaswaliWinner`) — its status and receipt — or null when none was sent. */
  sms: { status: SmsStatus; dlr: string | null } | null;
  /** Why the week's winner SMS batch was held, when it was (`maswali-winner-sms.ts`): no credit to spare for codes, etc. */
  smsHeld: string | null;
};

/**
 * Why the week's winner SMS was held, from the newest result run (`maswali.notices.sent`), whose tally counts each winner's
 * own outcome (`maswali-notify.ts` `WinnerSmsTally`) — the first reason it held any winner for, or null.
 */
async function smsHoldOf(weekId: string): Promise<string | null> {
  const rows = await getAuditForTargetsDurable({ targetType: "MaswaliCycle", targetIds: [weekId], actions: ["maswali.notices.sent"], sinceIso: "1970-01-01T00:00:00.000Z", limit: 50 });
  const run = rows.entries.find((e) => e.payload?.notice === "result" && e.payload?.sms != null);
  // A hold the next run may clear first, then a refusal that never will (round 3: counted apart, the run complete).
  const sms = run?.payload?.sms as { held?: Record<string, unknown>; permanent?: Record<string, unknown> } | null | undefined;
  for (const reasons of [sms?.held, sms?.permanent]) {
    if (!reasons || typeof reasons !== "object") continue;
    const k = Object.keys(reasons).find((x) => typeof reasons[x] === "number" && (reasons[x] as number) > 0);
    if (k) return k;
  }
  return null;
}

/** The winners of one week the desk recorded as reached by phone — its own records, reduced to their accounts. */
async function reachedByDeskOf(weekId: string): Promise<Set<string>> {
  const rows = await getAuditForTargetsDurable({ targetType: "MaswaliCycle", targetIds: [weekId], actions: [WINNER_REACHED_ACTION], sinceIso: "1970-01-01T00:00:00.000Z", limit: 500 });
  return new Set(rows.entries.map((e) => e.payload?.userId).filter((u): u is string => typeof u === "string"));
}

/**
 * ⭐ THE DESK'S LIST (MB-93): every winning player of a week settled in the last `UNREACHED_RECENT_DAYS` whom no notice is
 * KNOWN to have reached. Reached means proof the player has it: they opened the week's result in the app (its seen mark,
 * MB-38's own record) or a winning ticket's page after the settlement, their winner SMS has a DELIVERED receipt, or the desk
 * recorded a call (`recordMillioneaWinnerReached`). A letter is not proof — a mailbox says nothing back — and the bell is not
 * either until it is opened. Each row says what WAS sent, so the desk knows what to say. Winners are read at the query.
 */
export async function unreachedWinners(now: Date = new Date()): Promise<UnreachedWinner[]> {
  const out: UnreachedWinner[] = [];
  const since = now.getTime() - UNREACHED_RECENT_DAYS * 24 * HOUR;
  for (const w of await weekStore.list({ states: ["SETTLED"] })) {
    const settledAt = w.settledAt;
    if (!settledAt || Date.parse(settledAt) < since) continue;
    const won = await ticketStore.listForWeek(w.id, { status: "SETTLED", won: true });
    if (won.length === 0) continue;
    const players = new Map<string, StoredTicket[]>();
    for (const t of [...won].sort((a, b) => a.serial.localeCompare(b.serial))) players.set(t.userId, [...(players.get(t.userId) ?? []), t]);
    const sms = await winnerSmsRecords([...players.keys()].map((u) => winnerSmsTargetId(w.id, u)));
    const held = await smsHoldOf(w.id).catch(() => null);
    const byDesk = await reachedByDeskOf(w.id);
    for (const [userId, mine] of players) {
      if (byDesk.has(userId)) continue;
      const record = sms.get(winnerSmsTargetId(w.id, userId)) ?? null;
      if (record?.status === "DELIVERED") continue;
      if (mine.some((t) => t.lastViewedAt != null && Date.parse(t.lastViewedAt) >= Date.parse(settledAt))) continue;
      if ((await noticeStore.seenFor(userId, [w.id])).some((n) => n.notice === "RESULT")) continue;
      const paid = mine.filter((t) => t.frozenReason == null);
      const forfeited = mine.every((t) => (t.frozenReason ?? "").startsWith("forfeited · "));
      const h = await holderOf(userId);
      // The bell under any of the holder's winning tickets: a share forfeited after the notice changes which one leads.
      let bell = false;
      for (const t of mine) {
        if (await db.notification.existsWithHref(userId, millioneaNoticeHref({ notice: "result", weekCode: w.code, winningSerial: t.serial }))) { bell = true; break; }
      }
      out.push({
        weekId: w.id, weekCode: w.code, userId, holder: h.holder, serials: mine.map((t) => t.serial),
        paidTzs: paid.some((t) => shareOf(t) === null) ? null : paid.reduce((s, t) => s + (shareOf(t) ?? 0), 0), held: paid.length === 0 && !forfeited, forfeited, settledAt,
        hoursSince: Math.max(0, Math.floor((now.getTime() - Date.parse(settledAt)) / HOUR)),
        bell,
        emailState: h.emailState,
        sms: record, smsHeld: record ? null : held,
      });
    }
  }
  return out.sort((a, b) => Date.parse(a.settledAt) - Date.parse(b.settledAt));
}

/**
 * ⭐ THE DESK'S CALL, RECORDED (MB-93, the review's LOW 8): Compliance reached a winner by phone, and says how. One COMPLIANCE
 * record per winner and week — the desk list and its 24-hour alert read it, so the row and the alert clear. Typed
 * (`WINNER_REACHED_WORD`), never for a holder who did not win the week, and once: a second record of the same call is
 * answered `already` and writes nothing.
 */
export async function recordMillioneaWinnerReached(
  input: { weekId: string; userId: string; officerId: string; typed: string; note: string },
  deps: WinnerReachedDeps = { audit },
): Promise<{ ok: true; already: boolean } | { ok: false; error: string }> {
  if (input.typed !== WINNER_REACHED_WORD) return { ok: false, error: `Type ${WINNER_REACHED_WORD} to record the call.` };
  const note = input.note.trim();
  if (note.length < 5) return { ok: false, error: "Say how the winner was reached (the number called, what they were told)." };
  if (note.length > 500) return { ok: false, error: "Keep the note under 500 characters." };
  const week = await weekStore.get(input.weekId);
  if (!week) return { ok: false, error: "No such week." };
  if (week.state !== "SETTLED") return { ok: false, error: `Week ${week.code} is ${week.state}; only a settled week's winners are reached.` };
  const won = await ticketStore.listForWeek(week.id, { status: "SETTLED", won: true });
  if (!won.some((t) => t.userId === input.userId)) return { ok: false, error: `That account holds no winning ticket of ${week.code}.` };
  // ⭐ ONCE PER WINNER AND WEEK (round 3, A10): the check and the record under a lock of their own, so a double submit
  // writes one record — and the record is READ: one that did not land says so, and the winner stays on the list.
  return withLock(`maswali:winner-reached:${week.id}:${input.userId}`, async (): Promise<{ ok: true; already: boolean } | { ok: false; error: string }> => {
    if ((await reachedByDeskOf(week.id)).has(input.userId)) return { ok: true, already: true };
    const rec = await deps.audit({
      category: "COMPLIANCE", action: WINNER_REACHED_ACTION, actorId: input.officerId, targetType: "MaswaliCycle", targetId: week.id,
      payload: { code: week.code, userId: input.userId, channel: "phone", note },
    });
    // The record is landed — or not — once `audit` answers (round 4, L6: no flush of every other writer's rows here).
    if (!rec.recorded) return { ok: false, error: WINNER_REACHED_UNRECORDED };
    return { ok: true, already: false };
  });
}

/** The desk's record's one write, injectable for the suites (a record that does not land must say so). */
export type WinnerReachedDeps = { audit: typeof audit };

/** A call recorded only in part — the record did not land: the officer is told, and the winner stays listed. */
export const WINNER_REACHED_UNRECORDED = "The call could not be recorded, so the winner stays on the list. Try again.";

// ── REFUNDS OWED (R1; the integrity page's own rows) ────────────────────────────────────────────────

/** A voided week whose refunds have not landed — R1's one truth (`unrefundedVoids`), a row of its own until they land. */
export type OwedRefund = { weekId: string; code: string; ticketCount: number; voidedAt: string | null };

/** When a week was voided: its decision's own record (`maswali.week.voided`), else the row's last write — or null. */
async function voidedAtOf(w: StoredWeek): Promise<string | null> {
  try {
    const rows = await getAuditForTargetsDurable({ targetType: "MaswaliCycle", targetIds: [w.id], actions: ["maswali.week.voided"], sinceIso: "1970-01-01T00:00:00.000Z", limit: 5 });
    return rows.entries[0]?.createdAt ?? w.updatedAt ?? null;
  } catch {
    return w.updatedAt ?? null;
  }
}

/** Every voided week still owed its refunds, oldest first. The row is gone once the refunds land: the same one truth. */
export async function owedRefunds(): Promise<OwedRefund[]> {
  const out: OwedRefund[] = [];
  for (const w of await unrefundedVoids()) out.push({ weekId: w.id, code: w.code, ticketCount: w.ticketCount, voidedAt: await voidedAtOf(w) });
  const at = (r: OwedRefund) => (r.voidedAt ? Date.parse(r.voidedAt) : 0) || 0;
  return out.sort((a, b) => at(a) - at(b));
}

// ── LETTERS NOT KNOWN TO HAVE GONE (S6, the lane-N review's round 7, M2; the integrity page's own rows) ──────────────

/** A week whose newest money-notice run left letters the provider may have taken, and its search could not say — an
 *  officer's call: a later run asks the search again (an "absent" then sends the letter once more) until the officer's
 *  recorded check closes them (round 17, M5). Counts only: no holder is named. */
export type UnresolvedLetters = { weekId: string; code: string; notice: "result" | "refund"; letters: number };

/** An officer's record that a week's letters not known to have gone were checked (round 10, L4): the row leaves the card
 *  until a later run of that notice lists it again. */
export const LETTERS_CLEARED_ACTION = "maswali.letters.cleared";
/** The word an officer types to record the check. */
export const LETTERS_CLEARED_WORD = "CHECKED";

/** ⭐ Round 10 (L4) · an officer records that one week's notice's unresolved letters were checked — a COMPLIANCE record,
 *  read back: one that did not land says so, and the row stays. ⭐ Round 17 (M5, the lead's ruling) · the check first
 *  CLOSES those letters, each on its holder's own record (`closeUnresolvedLetters`): never searched for, never sent again —
 *  and the officer's record is written while the week is still held. Refused while the week's letters are being sent. */
export async function clearUnresolvedLetter(
  input: { weekId: string; notice: string; officerId: string; typed: string; note: string },
  deps: { audit: typeof audit } = { audit },
): Promise<{ ok: true; closed: number } | { ok: false; error: string }> {
  if (input.typed !== LETTERS_CLEARED_WORD) return { ok: false, error: `Type ${LETTERS_CLEARED_WORD} to record the check.` };
  const notice = input.notice;
  if (notice !== "result" && notice !== "refund") return { ok: false, error: "No such notice." };
  const note = input.note.trim();
  if (note.length < 5) return { ok: false, error: "Say what was checked (the provider's activity, what the holder was told)." };
  if (note.length > 500) return { ok: false, error: "Keep the note under 500 characters." };
  const week = await weekStore.get(input.weekId);
  if (!week) return { ok: false, error: "No such week." };
  // The notices module loads only when a check is recorded, as it loads for the money files only when they fire.
  const { closeUnresolvedLetters } = await import("./maswali-notify");
  return closeUnresolvedLetters(week.id, notice, input.officerId, async (closed) => (await deps.audit({
    category: "COMPLIANCE", action: LETTERS_CLEARED_ACTION, actorId: input.officerId, targetType: "MaswaliCycle", targetId: week.id,
    payload: { code: week.code, notice, note, closed },
  })).recorded);
}

/** How many of the newest settled or voided weeks the read covers (round 9, L4). */
export const UNRESOLVED_LETTER_WEEKS = 26;

/** When a week ended: its settlement, else (a voided week) its row's last write. */
function endedAt(w: Pick<StoredWeek, "settledAt" | "updatedAt">): number {
  return Date.parse(w.settledAt ?? w.updatedAt) || 0;
}

/** Weeks newest-ended first, whatever their line: a drive week never waits behind public ones (round 12). */
export function newestEndedFirst<T extends Pick<StoredWeek, "settledAt" | "updatedAt" | "code">>(weeks: T[]): T[] {
  return [...weeks].sort((a, b) => endedAt(b) - endedAt(a) || b.code.localeCompare(a.code));
}

/** The read: its rows, whether older weeks were left unread, and whether a week's own records outran its read (the page
 *  says each). */
export type UnresolvedLettersRead = { rows: UnresolvedLetters[]; truncated: boolean; partial: boolean };

/** The newest `UNRESOLVED_LETTER_WEEKS` settled or voided weeks whose newest result or refund run record counts letters
 *  unresolved, one row a notice — and whether there were older weeks it did not read (round 9, L4). */
export async function unresolvedLetters(): Promise<UnresolvedLettersRead> {
  const weeks = newestEndedFirst((await weekStore.list({})).filter((w) => w.state === "SETTLED" || w.state === "VOIDED"));
  const rows: UnresolvedLetters[] = [];
  let partial = false;
  for (const w of weeks.slice(0, UNRESOLVED_LETTER_WEEKS)) {
    const read = await getAuditForTargetsDurable({
      targetType: "MaswaliCycle", targetIds: [w.id], actions: ["maswali.notices.sent", LETTERS_CLEARED_ACTION], sinceIso: "1970-01-01T00:00:00.000Z", limit: 50,
    });
    for (const notice of ["result", "refund"] as const) {
      const run = read.entries.find((e) => e.action === "maswali.notices.sent" && e.payload?.notice === notice);
      const cleared = read.entries.find((e) => e.action === LETTERS_CLEARED_ACTION && e.payload?.notice === notice);
      // ⭐ Round 12 (b) · the read is newest first: a notice whose newest run lies past a cut read is not known, and the page
      // says so. A check past the cut is older than the run it found, so it never takes a row off.
      if (!run && read.truncated) partial = true;
      // ⭐ Round 10 (L4) · a check recorded after the newest run leaves the row out; a later run lists it again.
      if (run && cleared && read.entries.indexOf(cleared) < read.entries.indexOf(run)) continue;
      const n = (run?.payload?.letters as { unresolved?: unknown } | null | undefined)?.unresolved;
      if (typeof n === "number" && Number.isSafeInteger(n) && n > 0) rows.push({ weekId: w.id, code: w.code, notice, letters: n });
    }
  }
  return { rows, truncated: weeks.length > UNRESOLVED_LETTER_WEEKS, partial };
}

/** The settlement's float check's own rows (`floatCheck`, maswali-settlement.ts): what it found, at the payout. */
const FLOAT_LOW_ACTION = "maswali.settlement.float_low";
const FLOAT_UNREAD_ACTION = "maswali.settlement.float_unread";

/**
 * S7-F4 · what a paying week's winners have not yet withdrawn of it: each winner's share (a held share is paid and counts,
 * MB-11) less the withdrawals that winner COMPLETED since the payout, drawn on the share first, never below 0. A
 * withdrawal still in flight has not yet drawn on the float, so it is not counted; a sum that cannot be read counts the
 * whole share (fail closed).
 * ⛔ S7-F9 · A SHARE ITS RECORD LACKS IS OWED, NEVER 0 (S6-R's rule: a figure a record lacks is "not on record", never
 *    0). The week's own share per ticket stands in for it; with that not on record too, what the winners can still
 *    withdraw is unknown — null — and the float check says so as its own alert, never judging the float against less.
 */
async function sharesNotWithdrawn(week: StoredWeek): Promise<number | null> {
  const shares = new Map<string, number>();
  for (const t of await ticketStore.listForWeek(week.id, { won: true })) {
    const share = Number.isFinite(t.payout) ? (t.payout as number) : week.sharePerTicket;
    if (share == null || !Number.isFinite(share)) return null;
    if (share > 0) shares.set(t.userId, (shares.get(t.userId) ?? 0) + share);
  }
  const sinceMs = Date.parse(week.settledAt ?? "");
  let left = 0;
  for (const [userId, share] of shares) {
    let withdrawn = 0;
    if (Number.isFinite(sinceMs)) {
      try {
        const sum = Math.abs(Number(await db.txn.sumUserByTypesSince(userId, sinceMs, ["WITHDRAWAL"])));
        withdrawn = Number.isFinite(sum) ? sum : 0;
      } catch { withdrawn = 0; }
    }
    left += Math.max(0, share - withdrawn);
  }
  return left;
}

/** The disbursement float as it stands, or null when it cannot be read (the payments console says why). */
export type FloatReader = () => Promise<{ balance: number } | null>;

/**
 * ⭐ S7 · A SHORT PAYOUT FLOAT, ON THE CONSOLE (MB-11, MB-63; FL.4). The settlement's float check is a read after the
 * commit, never a block: it records what it found when a week's paid total leaves the disbursement float short of the
 * payout and its headroom — or, S7-F2, when it could not read the float at all. Each line's newest week that PAID is the
 * payout its winners are withdrawing, so a finding on it stands here, beside it, until the next week of that line pays
 * and its own check speaks.
 * ⭐ S7-F2 · JUDGED ON THE FLOAT AS IT STANDS, read once, only when a finding stands (the S7 review, round 2): it clears
 * once the float covers that payout and its headroom — it used to outlive Finance's top-up — and shows what is still
 * short while it does not, critical below the payout itself. ⛔ A float that cannot be read is its own critical alert,
 * fail closed: the finding used to vanish when the next paying week's check could not read the float, leaving silence.
 * ⭐ S7-F4 · JUDGED AGAINST THE WEEK'S SHARES NOT YET WITHDRAWN (the review of S7-F3, LOW), never latched. The float is
 * every platform withdrawal's, so S7-F3's latch — one covering reading, written only by a console render, ending the
 * alert for good — went quiet when OTHER withdrawals drained the float before the winners had theirs. A finding is judged
 * on each read against what the winners can still withdraw of the payout (`sharesNotWithdrawn`) plus its headroom: their
 * own withdrawals lower it with the float, so it never returns over money already withdrawn (S7-F3's concern), while
 * anything else that drains the float brings it back. A week whose shares are all withdrawn is ended. Nothing is
 * written: the read is the whole judgement.
 */
async function floatShortAlerts(readFloat?: FloatReader): Promise<ConsoleAlert[]> {
  const settled = await weekStore.list({ states: ["SETTLED"] });
  const payouts = (["PUBLIC", "DRIVE"] as const)
    .map((line) => settled.filter((w) => w.visibility === line && (w.paidTotal ?? 0) > 0).sort((a, b) => calendarStartMs(b) - calendarStartMs(a))[0])
    .filter((w): w is StoredWeek => !!w);
  if (payouts.length === 0) return [];
  const rows = await getAuditForTargetsDurable({ targetType: "MaswaliCycle", targetIds: payouts.map((w) => w.id),
    actions: [FLOAT_LOW_ACTION, FLOAT_UNREAD_ACTION], sinceIso: new Date(0).toISOString(), limit: 50 });
  const owed: Array<{ w: StoredWeek; left: number }> = [];
  const out: ConsoleAlert[] = [];
  for (const w of payouts.filter((x) => rows.entries.some((e) => e.targetId === x.id))) {
    const left = await sharesNotWithdrawn(w);
    // S7-F9 · fail closed: shares not on record are their own critical alert, never a float judged against less.
    if (left === null) {
      out.push({ level: "critical", weekId: w.id, text: `${w.code}: a winner's share of what it paid is not on record, nor is the week's share per ticket, so what its winners can still withdraw is unknown and the payout float cannot be judged against it. Finance checks the float before the winners withdraw.` }); // MB-11
      continue;
    }
    if (left > 0) owed.push({ w, left });
  }
  if (owed.length === 0) return out;
  const read: FloatReader = readFloat ?? (async () => (await import("./payments")).getFloatBalance());
  const float = await read().then((f) => (f && Number.isFinite(f.balance) ? f.balance : null)).catch(() => null);
  for (const { w, left } of owed) {
    if (float === null) {
      out.push({ level: "critical", weekId: w.id, text: `${w.code}: its winners can still withdraw ${formatTzs(left)} of what it paid, and the payout float cannot be read now. Finance checks the float before the winners withdraw.` });
      continue;
    }
    const short = left + FLOAT_ALERT_BUFFER_TZS - float;
    if (short <= 0) continue;
    out.push({ level: float < left ? "critical" : "warning", weekId: w.id,
      text: `${w.code}: the payout float holds ${formatTzs(float)} against the ${formatTzs(left)} of this week's payout its winners can still withdraw — ${formatTzs(short)} short of the payout and its headroom. Finance tops the float up before the winners withdraw.` });
  }
  return out;
}

/**
 * OD-02 over a set of unsettled weeks, each at its own frozen floor — or null, unknown, when a week's frozen rules cannot
 * be read (S7-F2, fail closed: such a floor was counted as 0, and "Needed now" understated the requirement).
 */
function requirementOf(weeks: StoredWeek[]): number | null {
  const floors = unsettledFloors(weeks);
  return floors.ok ? guaranteeRequirement(floors.weeks) : null;
}

/**
 * The product's switches at a glance — the head of every Millionea page. `stopNextAct` is the Owner's next act to stop
 * Millionea, as a stop reads the line (`stopNextActNow`; S7-F4): the stop control names it when it offers no week. Null
 * when it cannot be read — shown as unknown, never as a control that names no act.
 */
export type ConsoleStanding = {
  rollout: RolloutState | null; licence: LicenceBasis; pause: SalesPause; sunset: Awaited<ReturnType<typeof sunsetState>>; stopNextAct: string | null;
};

export async function consoleStanding(now?: Date): Promise<ConsoleStanding> {
  const rollout = await millioneaStateNow().catch(() => null);
  const stopNextAct = await stopNextActNow(now).catch(() => null);
  return { rollout, licence: getLicenceBasis(), pause: getSalesPause(), sunset: await sunsetState(), stopNextAct };
}

// ── DRAFTING HELP (MASWALI-PLAN §7b S4 item 7) ──────────────────────────────────────────────────────

/**
 * What the builder may START a question from: the event calendar's fixtures, and the AI-drafted polls the platform's
 * own generation produced (`ai-poll-generation.ts`, reviewed or approved — never a rejected or failed one), in the
 * week's event window. ⛔ Nothing here publishes: a suggestion only fills a card the officer then edits and saves, and
 * every row still passes the open's checklist (OD-14, the trusted sources, the banned topics).
 */
export type DraftSuggestion = {
  kind: "event" | "ai";
  id: string;
  category: string;
  startsAt: string;
  sourceUrl: string;
  textEn: string; textSw: string; textZh: string;
  criterionEn: string; criterionSw: string; criterionZh: string;
};

export async function draftSuggestions(fromMs: number, toMs: number, limit = 40): Promise<DraftSuggestion[]> {
  const inWindow = (iso: string) => { const t = Date.parse(iso); return t >= fromMs && t <= toMs; };
  const out: DraftSuggestion[] = [];
  const { listUpcomingEvents } = await import("./events-service");
  for (const e of (await listUpcomingEvents(500).catch(() => [])).filter((x) => inWindow(x.startsAt))) {
    out.push({ kind: "event", id: e.id, category: e.category, startsAt: e.startsAt, sourceUrl: e.sourceUrl,
      textEn: e.title, textSw: "", textZh: "", criterionEn: e.note ?? "", criterionSw: "", criterionZh: "" });
  }
  const { listAIPolls } = await import("./ai-poll-generation");
  const polls = await listAIPolls().catch(() => []);
  for (const p of polls) {
    if (!["PENDING_REVIEW", "EDITING", "APPROVED", "PUBLISHED"].includes(p.state) || !inWindow(p.resolutionAt)) continue;
    out.push({ kind: "ai", id: p.id, category: p.category, startsAt: p.resolutionAt, sourceUrl: p.sources[0]?.url ?? "",
      textEn: p.titleEn, textSw: p.titleSw, textZh: p.titleZh, criterionEn: p.resolutionCriterion,
      criterionSw: p.resolutionCriterionSw ?? "", criterionZh: p.resolutionCriterionZh ?? "" });
  }
  return out.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)).slice(0, limit);
}

// ── ACCOUNTING (/admin/maswali/pools) ───────────────────────────────────────────────────────────────

export type PoolsWeek = {
  row: ConsoleWeekRow;
  /** ⛔ S6 · null when the week's frozen rules cannot be read (no ticket price on record) — never 0 (S7-F3's rule too). */
  sales: number | null;
  rolloverIn: number | null;
  /** MB-36 · the share of the 1,024 ways to answer the ten mains that some live ticket holds, 0…1. */
  coverage: number;
  distinctCombos: number;
  /**
   * The most this week could still draw from the guarantee: a single winner at the floor. ⛔ S6 · null when a figure it
   * stands on cannot be read — the frozen rules (the floor, the sales) or the jackpot it would claim — never a guess
   * (S7-F3's rule too).
   */
  worstTopUp: number | null;
  /** ⭐ S6-ADMIN · G2 · the fee the week froze, taken at payout (`weekFeeRate`): Finance reads it here, beside the week's
   *  money, since it cannot open the week's own page. Null when it cannot be read — never 0. */
  feeRate: number | null;
  /** A settlement ready to release (results final, window closed): its prepared figures, or why not. */
  preview: MaswaliSettlementPreview | null;
  previewRefusal: string | null;
};

/**
 * A settled week as its settlement left it. ⛔ S6 · A FIGURE ITS RECORD LACKS IS NULL AND NAMED in `lacks` (`settledWeekGaps`,
 * the reports' one rule) — the page prints it as missing, never as 0. A whole record has every figure and `lacks` empty.
 */
export type PoolsTrailRow = {
  code: string; visibility: StoredWeek["visibility"]; settledAt: string | null; sales: number | null; rolloverIn: number | null;
  winners: number | null; fee: number | null; topUp: number | null; paid: number | null; carryOut: number | null;
  /** MB-10 · the TRA and GBT levies on the fee the house's own top-up generated, paid from house money. */
  levyOnOwnTopUp: number | null;
  /** The settlement columns this week's record lacks, of those the trail reads; empty when it is whole. */
  lacks: SettlementField[];
};

/**
 * ⭐ S6 · ONE OPEN WEEK'S MONEY, with nothing guessed (round 5): no frozen rules on record → no sales and no worst top-up;
 * no jackpot the week would claim (its own carry, else the line's jackpot balance) → no worst top-up. Pure, so a suite
 * can hold each missing figure to its own answer.
 */
export function openWeekMoney(x: { liveTickets: number; ticketPriceTzs: number | null; floorTzs: number | null; jackpot: number | null }): { sales: number | null; worstTopUp: number | null } {
  const sales = x.ticketPriceTzs === null ? null : x.liveTickets * x.ticketPriceTzs;
  const worstTopUp = sales === null || x.floorTzs === null || x.jackpot === null ? null : Math.max(0, x.floorTzs - x.jackpot - sales);
  return { sales, worstTopUp };
}

export type PoolsView = {
  /** `requirement` is null when a week's frozen rules cannot be read: unknown, never 0 (S7-F2). */
  jackpotPublic: number | null; jackpotDrive: number | null; guarantee: number | null; requirement: number | null;
  float: number | null; pendingPayout: number;
  weeks: PoolsWeek[];
  trail: PoolsTrailRow[];
};

export async function poolsView(now: Date = new Date()): Promise<PoolsView> {
  // Every week: the open ones by state, and the whole trail (the page pages it; week rows are cheap to read).
  const weeks = await weekStore.list({});
  const open = weeks.filter(unsettled);
  const [jackpotPublic, jackpotDrive, guarantee] = await Promise.all([
    maswaliAccountBalance(maswaliJackpotOf("PUBLIC")), maswaliAccountBalance(maswaliJackpotOf("DRIVE")), maswaliAccountBalance(acct.maswaliGuarantee),
  ]);
  const out: PoolsWeek[] = [];
  let pendingPayout = 0;
  for (const w of open) {
    const rules = frozenRules(w);
    const live = await ticketStore.listForWeek(w.id, { status: "LIVE" });
    const combos = new Set(live.map((t) => t.selections.slice(0, MAIN_COUNT).join("")));
    // ⛔ S6 · no `?? 0` (round 5): an unreadable rule or jackpot balance is said on the row, never priced as nothing.
    const { sales, worstTopUp } = openWeekMoney({
      liveTickets: live.length, ticketPriceTzs: rules?.ticketPriceTzs ?? null, floorTzs: rules?.floorTzs ?? null,
      jackpot: w.rolloverIn ?? (w.visibility === "DRIVE" ? jackpotDrive : jackpotPublic),
    });
    let preview: MaswaliSettlementPreview | null = null, previewRefusal: string | null = null;
    if (w.state === "RESOLVING" && w.objectionsCloseAt && Date.parse(w.objectionsCloseAt) <= now.getTime()) {
      const p = await previewMaswaliSettlement(w.id, now);
      if (p.ok) { preview = p.preview; if (p.preview.arithmetic.kind === "PAYOUT") pendingPayout += p.preview.arithmetic.paid; }
      else previewRefusal = p.error;
    }
    out.push({ row: await rowOf(w), sales, rolloverIn: w.rolloverIn, coverage: combos.size / 2 ** MAIN_COUNT, distinctCombos: combos.size, worstTopUp, feeRate: await weekFeeRate(w), preview, previewRefusal });
  }
  const { getFloatBalance } = await import("./payments");
  const float = await getFloatBalance().then((f) => f?.balance ?? null).catch(() => null);
  const trail: PoolsTrailRow[] = weeks.filter((w) => w.state === "SETTLED").map((w) => {
    // ⛔ S6 · no `?? 0`: a figure the record lacks stays null and is named (round 3, the reports' rule) — of the columns
    // the trail reads (round 5): the levies and the jackpot only where its own top-up needs them.
    const U = w.topUp;
    const lacks = settledWeekGaps(w, [
      "settledAt", "salesAtClose", "rolloverIn", "winningTickets", "fee", "topUp", "paidTotal", "carryOut",
      ...(U !== null && U > 0 ? (["traLevy", "gbtLevy", "jackpot"] as const) : []),
    ]);
    const J = w.jackpot, levies = w.traLevy !== null && w.gbtLevy !== null ? w.traLevy + w.gbtLevy : null;
    // No own top-up, no levy on it (a no-winner week's null jackpot included); otherwise it needs J, U and both levies.
    const levyOnOwnTopUp = U === 0 ? 0 : U === null || J === null || levies === null ? null : J > 0 ? Math.round((levies * U) / J) : 0;
    return {
      code: w.code, visibility: w.visibility, settledAt: w.settledAt, sales: w.salesAtClose, rolloverIn: w.rolloverIn,
      winners: w.winningTickets, fee: w.fee, topUp: U, paid: w.paidTotal, carryOut: w.carryOut, levyOnOwnTopUp, lacks,
    };
  });
  return { jackpotPublic, jackpotDrive, guarantee, requirement: requirementOf(open), float, pendingPayout, weeks: out, trail };
}

// ── COMPLIANCE (/admin/maswali/integrity) ───────────────────────────────────────────────────────────

/** ⛔ S6 round 6 · `payout` null: the ticket's record lacks its share — said "Not on record", never printed as 0 TZS. */
export type HeldShare = {
  ticketId: string; serial: string; weekCode: string; weekSeq: number; userId: string; holder: string; payout: number | null; reason: string; forfeited: boolean;
  /** MB-74 · for a share held for a deposit under review, which deposit the provider contradicted (S7-F9). */
  provenance?: string | null;
};
/** ⭐ S6-ADMIN · G3 · `sealer` and `secondOfficer` are the officers' NAMES (`consoleOfficerName`), never their ids. */
export type SealLogRow = { weekCode: string; slot: number; outcome: string; voidReason: string | null; sealer: string | null; sealedAt: string | null; evidence: string | null; secondOfficer: string | null };
export type WinnerRow = { ticketId: string; weekCode: string; serial: string; userId: string; holder: string; role: string; status: string; accountAgeDays: number; payout: number | null; frozenReason: string | null };
/** A paid ticket's share as its record holds it: null when the record lacks it (never `?? 0`). */
const shareOf = (t: StoredTicket): number | null => (t.payout === null ? null : Math.round(t.payout));

export type IntegrityView = {
  /** One reachable page of held shares, selected from every settled winner. */
  held: HeldShare[];
  heldPage: { total: number; allTotal: number; page: number };
  /** MB-34 · the seal log, shown only for weeks whose results can no longer change (settled or voided) — one page of weeks. */
  sealLog: SealLogRow[];
  /** How many weeks the seal log spans, and the page of them shown. */
  sealWeeks: { total: number; allTotal: number; page: number };
  /** One page of every paid ticket, newest week first, to screen. */
  winners: WinnerRow[];
  winnersPage: { total: number; allTotal: number; page: number };
  /** Weeks a compliance officer may void whole (MR-18): the void is certain and the window has closed. */
  voidable: ConsoleWeekRow[];
  voidablePage: { total: number; allTotal: number; page: number };
  /** S6 · voided weeks whose refunds have not landed — each its own row until they do (R1's one truth); null: unread. */
  owedRefunds: OwedRefund[] | null;
  /** S6 (round 7, M2) · weeks with win or refund letters not known to have gone — an officer's call; null: unread. */
  unresolvedLetters: UnresolvedLettersRead | null;
  /** S6 · MB-93 · one page of the winners no notice is known to have reached — the desk's list to call — counted in full;
   *  null when the read failed (its own card says so, and nothing else on the page goes with it). */
  unreached: UnreachedWinner[] | null;
  unreachedPage: { total: number; page: number } | null;
};

const holderOf = async (userId: string) => {
  // ⚠️ The memory store answers synchronously: never `.catch` the call itself, catch the awaited read.
  let u: Awaited<ReturnType<typeof db.user.findById>> | null = null;
  try { u = await db.user.findById(userId); } catch { u = null; }
  const emailState: UnreachedWinner["emailState"] = u?.email ? (u.emailVerifiedAt ? "confirmed" : "unconfirmed") : "none";
  return { holder: u ? (u.displayName?.trim() || `…${u.phoneE164.slice(-4)}`) : "(closed account)", role: u?.role ?? "?", status: u?.status ?? "?", createdAt: u?.createdAt ?? null, emailState };
};

/**
 * ⭐ MB-74 · WHERE A SHARE HELD FOR A DEPOSIT UNDER REVIEW CAME FROM (S7-F9; MASWALI-PLAN §8 MB-74: "show the provenance in
 * the cluster/integrity report"): the account's credited deposit the provider has contradicted, as accounting books it — the
 * newest, and how many. A read that fails says so, never nothing; a review resolved since the hold says that.
 */
async function depositProvenance(userId: string): Promise<string> {
  try {
    const { hasDepositStatusReview } = await import("@/lib/wallet/deposit-review");
    const marked = (await db.txn.findByUserTypes(userId, ["DEPOSIT"], 500)).filter((t) => t.status === "CONFIRMED" && hasDepositStatusReview(t));
    if (marked.length === 0) return "No deposit of this account is under review now: its review was resolved after the hold.";
    const d = marked[0];
    const ref = d.providerRef ? ` (reference …${d.providerRef.slice(-4)})` : "";
    const lead = marked.length === 1 ? "A deposit" : `${marked.length} deposits are under review; the newest, a deposit`;
    return `${lead} of ${formatTzs(Math.abs(d.amount))}${d.provider ? ` by ${d.provider}` : ""}${ref}, credited ${fmtEat(d.completedAt ?? d.createdAt)}, which the provider has since contradicted.`;
  } catch {
    return "The account's deposits could not be read.";
  }
}

/** The console's page size (the platform pager's own, `PER_PAGE`). */
export const CONSOLE_PER_PAGE = 20;
/** The seal log pages by WEEK, each week its fifteen seals. */
export const SEAL_WEEKS_PER_PAGE = 4;

/**
 * ⛔ NO SILENT CAP (`test:grid-paging`; the console used to read the newest 40 weeks, so an older held share fell off the
 * page an officer decides it on). Every week is read; paid tickets are read at the query (`won`), never every ticket;
 * the held shares, winners and seal weeks are all filtered and sorted over their complete sets before paging.
 */
export async function integrityView(now: Date = new Date(), pages: { held?: number; winners?: number; sealWeeks?: number; voidable?: number; unreached?: number } = {}, query: IntegrityListQuery = parseIntegrityListQuery({})): Promise<IntegrityView> {
  const weeks = await weekStore.list({});
  const allHeld: HeldShare[] = [], winners: WinnerRow[] = [], sealLog: SealLogRow[] = [], voidable: StoredWeek[] = [];
  const won: Array<{ ticket: StoredTicket; code: string; seq: number }> = [];
  const holderCache = new Map<string, ReturnType<typeof holderOf>>();
  const holderFor = (userId: string) => {
    let found = holderCache.get(userId);
    if (!found) { found = holderOf(userId); holderCache.set(userId, found); }
    return found;
  };
  for (const w of weeks) {
    if (w.state === "SETTLED") {
      for (const ticket of await ticketStore.listForWeek(w.id, { status: "SETTLED", won: true })) won.push({ ticket, code: w.code, seq: w.seq });
    }
    if ((w.state === "CLOSED" || w.state === "RESOLVING") && w.objectionsCloseAt && Date.parse(w.objectionsCloseAt) <= now.getTime()) {
      const gate = settlementGate(gradable(await questionStore.listForWeek(w.id)));
      if (gate.ready && gate.weekVoid) voidable.push(w);
    }
  }
  for (const { ticket: t, code, seq } of won) {
    if (!t.frozenReason) continue;
    const h = await holderFor(t.userId);
    allHeld.push({ ticketId: t.id, serial: t.serial, weekCode: code, weekSeq: seq, userId: t.userId, holder: h.holder, payout: shareOf(t), reason: t.frozenReason, forfeited: t.frozenReason.startsWith("forfeited · ") });
  }
  const selectedHeld = selectHeldShares(allHeld, { ...query.held, page: pages.held ?? query.held.page }, CONSOLE_PER_PAGE);
  // MB-74 · the provenance of a share held for a deposit under review, on the page shown (S7-F9, RD.5).
  for (const h of selectedHeld.rows) if (!h.forfeited && h.reason === "deposit under review") h.provenance = await depositProvenance(h.userId);
  const selectedWinners = selectWinnerTickets(won, { ...query.winners, page: pages.winners ?? query.winners.page }, CONSOLE_PER_PAGE);
  const selectedVoidable = selectVoidableWeeks(voidable, { ...query.voidable, page: pages.voidable ?? query.voidable.page }, CONSOLE_PER_PAGE);
  for (const { ticket: t, code } of selectedWinners.rows) {
    const h = await holderFor(t.userId);
    const ageDays = h.createdAt ? Math.floor((now.getTime() - Date.parse(h.createdAt)) / 86_400_000) : 0;
    winners.push({ ticketId: t.id, weekCode: code, serial: t.serial, userId: t.userId, holder: h.holder, role: h.role, status: h.status, accountAgeDays: ageDays, payout: shareOf(t), frozenReason: t.frozenReason });
  }
  const sealed = weeks.filter((w) => w.state === "SETTLED" || w.state === "VOIDED");
  const selectedSeals = selectSealWeeks(sealed, { ...query.seals, page: pages.sealWeeks ?? query.seals.page }, SEAL_WEEKS_PER_PAGE);
  // G3 · each officer named once per view, never printed by id.
  const officerNames = new Map<string, Promise<string | null>>();
  const officerName = (id: string | null) => (id ? (officerNames.get(id) ?? officerNames.set(id, consoleOfficerName(id)).get(id)!) : Promise.resolve(null));
  for (const w of selectedSeals.rows) {
    for (const q of await questionStore.listForWeek(w.id)) {
      sealLog.push({ weekCode: w.code, slot: q.slot, outcome: q.outcome ?? "—", voidReason: q.voidReason, sealer: await officerName(q.sealedBy), sealedAt: q.sealedAt, evidence: q.evidence, secondOfficer: await officerName(q.stage2By) });
    }
  }
  const unreached = await unreachedWinners(now).catch((err: unknown) => {
    console.error("[maswali-console] the winners not yet reached could not be read:", (err as Error)?.message ?? err);
    return null;
  });
  const unreachedAt = unreached ? clampPage(pages.unreached ?? query.unreached.page, unreached.length, CONSOLE_PER_PAGE) : 1;
  const owed = await owedRefunds().catch((err: unknown) => {
    console.error("[maswali-console] the owed refunds could not be read:", (err as Error)?.message ?? err);
    return null;
  });
  const unresolved = await unresolvedLetters().catch((err: unknown) => {
    console.error("[maswali-console] the letters not known to have gone could not be read:", (err as Error)?.message ?? err);
    return null;
  });
  return {
    held: selectedHeld.rows, heldPage: { total: selectedHeld.total, allTotal: selectedHeld.allTotal, page: selectedHeld.page },
    sealLog, sealWeeks: { total: selectedSeals.total, allTotal: selectedSeals.allTotal, page: selectedSeals.page },
    winners, winnersPage: { total: selectedWinners.total, allTotal: selectedWinners.allTotal, page: selectedWinners.page },
    voidable: await Promise.all(selectedVoidable.rows.map(rowOf)),
    voidablePage: { total: selectedVoidable.total, allTotal: selectedVoidable.allTotal, page: selectedVoidable.page },
    owedRefunds: owed,
    unresolvedLetters: unresolved,
    unreached: unreached ? unreached.slice((unreachedAt - 1) * CONSOLE_PER_PAGE, unreachedAt * CONSOLE_PER_PAGE) : null,
    unreachedPage: unreached ? { total: unreached.length, page: unreachedAt } : null,
  };
}
