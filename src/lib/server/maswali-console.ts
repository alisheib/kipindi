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
import { questionStore, ticketStore, weekStore, type StoredQuestion, type StoredTicket, type StoredWeek } from "./maswali-dal";
import {
  calendarStartMs, deadlinesUnderRules, frozenRules, gradable, guaranteeProblem, NO_LICENCE_BASIS, openProblems, proposeVoidsAtDeadline, sunsetState,
} from "./maswali-service";
import { guaranteeReader, maswaliAccountBalance } from "./maswali-money-service";
import { FLOAT_ALERT_BUFFER_TZS, previewMaswaliSettlement, type MaswaliSettlementPreview } from "./maswali-settlement";
import { unrefundedVoids } from "./maswali-void";
import { getMaswaliConfig, snapshotMaswaliRules, type MaswaliRulesSnapshot } from "./maswali-config";
import { getLicenceBasis, licenceBasisAllowsOpen, type LicenceBasis } from "./maswali-licence";
import { holidayOn } from "./maswali-holidays";
import { getAuditForTargetsDurable } from "./audit";
import { getSalesPause, type SalesPause } from "./maswali-pause";
import { millioneaStateNow } from "./millionea-switch";
import { acct, maswaliJackpotOf } from "./ledger";
import { db } from "./store";
import { marketStore } from "./market-dal";
import { MAIN_COUNT, settlementGate, weekVoidCertain } from "@/lib/maswali-score";
import { guaranteeRequirement } from "@/lib/maswali-money";
import type { RolloutState } from "@/lib/millionea-rollout";
import { formatTzs } from "@/lib/utils";

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
export async function pageConsoleWeeks(askedPage: number, perPage: number): Promise<{ rows: ConsoleWeekRow[]; total: number; page: number }> {
  const weeks = await weekStore.list({});
  const page = clampPage(askedPage, weeks.length, perPage);
  return { rows: await Promise.all(weeks.slice((page - 1) * perPage, page * perPage).map(rowOf)), total: weeks.length, page };
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
    if (!rules) problems = ["The Millionea rules do not validate; fix them on the rules page first."];
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
      warnings.push(week.state === "DRAFT"
        ? `The sales close falls on ${holiday}, a public holiday on the Owner's list (the holiday review, MB-85). The week may still open: bring the close forward once it is open (R-WEEK), or skip the week with notice (OD-27).`
        : `The sales close falls on ${holiday}, a public holiday on the Owner's list (the holiday review, MB-85). Bring the close forward while it is still ahead (R-WEEK, MB-28).`);
    }
  }
  return { week, row: await rowOf(week), questions, rules, problems, warnings, proposedVoids: await proposeVoidsAtDeadline(week.id, now) };
}

/** An operator alert (MASWALI-PLAN §7b S4 item 5). Never a guess: each names the week and the fact behind it. */
export type ConsoleAlert = { level: "critical" | "warning"; text: string; weekId?: string };

/** `deps.readFloat` reads the payout float (the payments provider's by default; a suite hands its own). */
export async function consoleAlerts(now: Date = new Date(), deps: { readFloat?: FloatReader } = {}): Promise<ConsoleAlert[]> {
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
      out.push({ level: "critical", weekId: w.id, text: `${w.code}: sales should have closed at ${w.closesAt}, and the close is not stamped.` });
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
      if (proposed.length) out.push({ level: "warning", weekId: w.id, text: `${w.code}: ${proposed.length} question(s) passed their void deadline unsealed; seal each as VOID (MR-15).` });
      if (w.objectionsCloseAt && Date.parse(w.objectionsCloseAt) + cfg.releaseAlertHours * HOUR < nowMs) {
        out.push({ level: "critical", weekId: w.id, text: `${w.code}: its results are final and its window closed ${cfg.releaseAlertHours} h ago, and it is not settled. Accounting releases it.` });
      }
    }
  }
  out.push(...await floatShortAlerts(deps.readFloat));
  const held = await maswaliAccountBalance(acct.maswaliGuarantee);
  const need = requirementOf(weeks.filter(unsettled));
  if (held === null) out.push({ level: "critical", text: "The guarantee balance could not be read." });
  else if (held < need) out.push({ level: "critical", text: `The guarantee holds ${formatTzs(held)}; the unsettled weeks need ${formatTzs(need)} (OD-02).` });
  // The product's own standing speaks only once Millionea has a week — any week, settled ones included (`maxSeq` is 0
  // only before the first draft): before it, a missing licence basis is the plan's Gate A, not an alert for every officer.
  if ((await weekStore.maxSeq()) > 0) {
    if (!licenceBasisAllowsOpen(getLicenceBasis())) out.push({ level: "warning", text: "No licence basis is recorded; no week can open until the Owner records it (OD-01)." });
    const pause = getSalesPause();
    if (pause.paused) out.push({ level: "warning", text: `Sales are paused: ${pause.reason ?? "no reason recorded"}.` });
  }
  return out;
}

/** The settlement's float check's own rows (`floatCheck`, maswali-settlement.ts): what it found, at the payout. */
const FLOAT_LOW_ACTION = "maswali.settlement.float_low";
const FLOAT_UNREAD_ACTION = "maswali.settlement.float_unread";

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
 */
async function floatShortAlerts(readFloat?: FloatReader): Promise<ConsoleAlert[]> {
  const settled = await weekStore.list({ states: ["SETTLED"] });
  const payouts = (["PUBLIC", "DRIVE"] as const)
    .map((line) => settled.filter((w) => w.visibility === line && (w.paidTotal ?? 0) > 0).sort((a, b) => calendarStartMs(b) - calendarStartMs(a))[0])
    .filter((w): w is StoredWeek => !!w);
  if (payouts.length === 0) return [];
  const rows = await getAuditForTargetsDurable({ targetType: "MaswaliCycle", targetIds: payouts.map((w) => w.id), actions: [FLOAT_LOW_ACTION, FLOAT_UNREAD_ACTION], sinceIso: new Date(0).toISOString(), limit: 10 });
  const found = payouts.filter((w) => rows.entries.some((e) => e.targetId === w.id));
  if (found.length === 0) return [];
  const read: FloatReader = readFloat ?? (async () => (await import("./payments")).getFloatBalance());
  const float = await read().then((f) => (f && Number.isFinite(f.balance) ? f.balance : null)).catch(() => null);
  const out: ConsoleAlert[] = [];
  for (const w of found) {
    const paid = w.paidTotal ?? 0;
    if (float === null) {
      out.push({ level: "critical", weekId: w.id, text: `${w.code}: it paid ${formatTzs(paid)}, and the payout float cannot be read now. Finance checks the float before the winners withdraw (MB-11).` });
      continue;
    }
    const short = paid + FLOAT_ALERT_BUFFER_TZS - float;
    if (short <= 0) continue;
    out.push({ level: float < paid ? "critical" : "warning", weekId: w.id,
      text: `${w.code}: the payout float holds ${formatTzs(float)} against the ${formatTzs(paid)} this week paid — ${formatTzs(short)} short of the payout and its headroom. Finance tops the float up before the winners withdraw (MB-11).` });
  }
  return out;
}

/** OD-02 over a set of unsettled weeks, each at its own frozen floor. */
function requirementOf(weeks: StoredWeek[]): number {
  return guaranteeRequirement(weeks.map((w) => ({ floor: frozenRules(w)?.floorTzs ?? 0, confirmedCarryIn: w.rolloverIn })));
}

/** The product's switches at a glance — the head of every Millionea page. */
export type ConsoleStanding = { rollout: RolloutState | null; licence: LicenceBasis; pause: SalesPause; sunset: Awaited<ReturnType<typeof sunsetState>> };

export async function consoleStanding(): Promise<ConsoleStanding> {
  const rollout = await millioneaStateNow().catch(() => null);
  return { rollout, licence: getLicenceBasis(), pause: getSalesPause(), sunset: await sunsetState() };
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
  sales: number;
  rolloverIn: number | null;
  /** MB-36 · the share of the 1,024 ways to answer the ten mains that some live ticket holds, 0…1. */
  coverage: number;
  distinctCombos: number;
  /** The most this week could still draw from the guarantee: a single winner at the floor. */
  worstTopUp: number;
  /** A settlement ready to release (results final, window closed): its prepared figures, or why not. */
  preview: MaswaliSettlementPreview | null;
  previewRefusal: string | null;
};

export type PoolsTrailRow = {
  code: string; visibility: StoredWeek["visibility"]; settledAt: string; sales: number; rolloverIn: number; winners: number;
  fee: number; topUp: number; paid: number; carryOut: number;
  /** MB-10 · the TRA and GBT levies on the fee the house's own top-up generated, paid from house money. */
  levyOnOwnTopUp: number;
};

export type PoolsView = {
  jackpotPublic: number | null; jackpotDrive: number | null; guarantee: number | null; requirement: number;
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
    const sales = live.length * (rules?.ticketPriceTzs ?? 0);
    const jackpot = w.rolloverIn ?? (w.visibility === "DRIVE" ? jackpotDrive : jackpotPublic) ?? 0;
    const worstTopUp = Math.max(0, (rules?.floorTzs ?? 0) - jackpot - sales);
    let preview: MaswaliSettlementPreview | null = null, previewRefusal: string | null = null;
    if (w.state === "RESOLVING" && w.objectionsCloseAt && Date.parse(w.objectionsCloseAt) <= now.getTime()) {
      const p = await previewMaswaliSettlement(w.id, now);
      if (p.ok) { preview = p.preview; if (p.preview.arithmetic.kind === "PAYOUT") pendingPayout += p.preview.arithmetic.paid; }
      else previewRefusal = p.error;
    }
    out.push({ row: await rowOf(w), sales, rolloverIn: w.rolloverIn, coverage: combos.size / 2 ** MAIN_COUNT, distinctCombos: combos.size, worstTopUp, preview, previewRefusal });
  }
  const { getFloatBalance } = await import("./payments");
  const float = await getFloatBalance().then((f) => f?.balance ?? null).catch(() => null);
  const trail: PoolsTrailRow[] = weeks.filter((w) => w.state === "SETTLED").map((w) => {
    const J = w.jackpot ?? 0, U = w.topUp ?? 0, levies = (w.traLevy ?? 0) + (w.gbtLevy ?? 0);
    return {
      code: w.code, visibility: w.visibility, settledAt: w.settledAt ?? "", sales: w.salesAtClose ?? 0, rolloverIn: w.rolloverIn ?? 0,
      winners: w.winningTickets ?? 0, fee: w.fee ?? 0, topUp: U, paid: w.paidTotal ?? 0, carryOut: w.carryOut ?? 0,
      levyOnOwnTopUp: J > 0 && U > 0 ? Math.round((levies * U) / J) : 0,
    };
  });
  return { jackpotPublic, jackpotDrive, guarantee, requirement: requirementOf(open), float, pendingPayout, weeks: out, trail };
}

// ── COMPLIANCE (/admin/maswali/integrity) ───────────────────────────────────────────────────────────

export type HeldShare = { ticketId: string; serial: string; weekCode: string; userId: string; holder: string; payout: number; reason: string; forfeited: boolean };
export type SealLogRow = { weekCode: string; slot: number; outcome: string; voidReason: string | null; sealedBy: string | null; sealedAt: string | null; evidence: string | null; stage2By: string | null };
export type WinnerRow = { ticketId: string; weekCode: string; serial: string; userId: string; holder: string; role: string; status: string; accountAgeDays: number; payout: number; frozenReason: string | null };

export type IntegrityView = {
  /** Every held share of every settled week: a decision waiting on an officer is never paged away. */
  held: HeldShare[];
  /** MB-34 · the seal log, shown only for weeks whose results can no longer change (settled or voided) — one page of weeks. */
  sealLog: SealLogRow[];
  /** How many weeks the seal log spans, and the page of them shown. */
  sealWeeks: { total: number; page: number };
  /** One page of every paid ticket, newest week first, to screen. */
  winners: WinnerRow[];
  winnersPage: { total: number; page: number };
  /** Weeks a compliance officer may void whole (MR-18): the void is certain and the window has closed. */
  voidable: ConsoleWeekRow[];
};

const holderOf = async (userId: string) => {
  // ⚠️ The memory store answers synchronously: never `.catch` the call itself, catch the awaited read.
  let u: Awaited<ReturnType<typeof db.user.findById>> | null = null;
  try { u = await db.user.findById(userId); } catch { u = null; }
  return { holder: u ? (u.displayName?.trim() || `…${u.phoneE164.slice(-4)}`) : "(closed account)", role: u?.role ?? "?", status: u?.status ?? "?", createdAt: u?.createdAt ?? null };
};

/** The console's page size (the platform pager's own, `PER_PAGE`). */
export const CONSOLE_PER_PAGE = 20;
/** The seal log pages by WEEK, each week its fifteen seals. */
export const SEAL_WEEKS_PER_PAGE = 4;

/**
 * ⛔ NO SILENT CAP (`test:grid-paging`; the console used to read the newest 40 weeks, so an older held share fell off the
 * page an officer decides it on). Every week is read; the paid tickets are read at the query (`won`), never every ticket;
 * every held share is listed whole; the winners and the seal log come a page at a time, counted in full.
 */
export async function integrityView(now: Date = new Date(), pages: { winners?: number; sealWeeks?: number } = {}): Promise<IntegrityView> {
  const weeks = await weekStore.list({});
  const held: HeldShare[] = [], winners: WinnerRow[] = [], sealLog: SealLogRow[] = [], voidable: ConsoleWeekRow[] = [];
  const won: Array<{ ticket: StoredTicket; code: string }> = [];
  for (const w of weeks) {
    if (w.state === "SETTLED") {
      for (const ticket of await ticketStore.listForWeek(w.id, { status: "SETTLED", won: true })) won.push({ ticket, code: w.code });
    }
    if ((w.state === "CLOSED" || w.state === "RESOLVING") && w.objectionsCloseAt && Date.parse(w.objectionsCloseAt) <= now.getTime()) {
      const gate = settlementGate(gradable(await questionStore.listForWeek(w.id)));
      if (gate.ready && gate.weekVoid) voidable.push(await rowOf(w));
    }
  }
  for (const { ticket: t, code } of won) {
    if (!t.frozenReason) continue;
    const h = await holderOf(t.userId);
    held.push({ ticketId: t.id, serial: t.serial, weekCode: code, userId: t.userId, holder: h.holder, payout: Math.round(t.payout ?? 0), reason: t.frozenReason, forfeited: t.frozenReason.startsWith("forfeited · ") });
  }
  const winnersAt = clampPage(pages.winners ?? 1, won.length, CONSOLE_PER_PAGE);
  for (const { ticket: t, code } of won.slice((winnersAt - 1) * CONSOLE_PER_PAGE, winnersAt * CONSOLE_PER_PAGE)) {
    const h = await holderOf(t.userId);
    const ageDays = h.createdAt ? Math.floor((now.getTime() - Date.parse(h.createdAt)) / 86_400_000) : 0;
    winners.push({ ticketId: t.id, weekCode: code, serial: t.serial, userId: t.userId, holder: h.holder, role: h.role, status: h.status, accountAgeDays: ageDays, payout: Math.round(t.payout ?? 0), frozenReason: t.frozenReason });
  }
  const sealed = weeks.filter((w) => w.state === "SETTLED" || w.state === "VOIDED");
  const sealAt = clampPage(pages.sealWeeks ?? 1, sealed.length, SEAL_WEEKS_PER_PAGE);
  for (const w of sealed.slice((sealAt - 1) * SEAL_WEEKS_PER_PAGE, sealAt * SEAL_WEEKS_PER_PAGE)) {
    for (const q of await questionStore.listForWeek(w.id)) {
      sealLog.push({ weekCode: w.code, slot: q.slot, outcome: q.outcome ?? "—", voidReason: q.voidReason, sealedBy: q.sealedBy, sealedAt: q.sealedAt, evidence: q.evidence, stage2By: q.stage2By });
    }
  }
  return { held, sealLog, sealWeeks: { total: sealed.length, page: sealAt }, winners, winnersPage: { total: won.length, page: winnersAt }, voidable };
}
