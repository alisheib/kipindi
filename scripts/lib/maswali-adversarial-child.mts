/**
 * test:maswali-adversarial — S7'S ADVERSARIAL SUITE, ON BOTH STORES (MASWALI-BUILD S7; MASWALI-PLAN §7b S7).
 *
 *   npx tsx scripts/maswali-adversarial.test.mts     (npm run test:maswali-adversarial)
 *
 * Every case asserts what the plan's rules require (MR-*, OD-*, and the MB rows S7 closes or re-verifies), never what the
 * code happens to do. A rule the code still breaks, whose fix is not this lane's, stays in as `KNOWN-RED <id>`: booked
 * apart (it prints KNOWN-RED and counts in `known`, never in `pass` or `fail`), and the day it PASSES it fails the suite,
 * so its mark is struck and it is counted (a strict expected failure).
 *   §1  CS · clock skew past the close: a purchase, a cancel and a move of the close answer to the database clock (MB-84)
 *   §2  CH · a six-week chain — week 3 voided, week 4 skipped — each week opening while the last waits (MR-3, MR-21, MB-16)
 *   §3  RP · reserve patterns × late voids × a reinstatement: the money follows the FINAL record (MR-17, MR-19, MB-15)
 *   §4  OB · an objection during settlement (MR-16, MB-23)
 *   §5  SD · a source domain switched off mid-week (MB-22)
 *   §6  GU · an under-funded guarantee at k ≥ 1, to the shilling, and a short float (MR-22, MB-03, MB-11, MB-63)
 *   §7  WF · no winner floor: 950 winners at the floor, each paid below the ticket's price (MR-25, OD-19)
 *   §8  PL · an attempt to reclassify a week's productLine, through the store and in the database (MB-01)
 *   §8b FR · a purchase whose read of its week or its market fails: refused as busy, never thrown (L6)
 *   §9  IN · an insider promoted mid-week: the tickets they hold, what they may still do (MR-10, MR-14, OD-12, MB-43)
 *   §10 RD · a reversed deposit funding a winner (MB-74, OD-07)
 *   §11 TK · the winner-takeover pattern (MB-96)
 *   §12 CC · both clock-change weekends, through the open's close guard and the void deadline (MB-30, MR-4, OD-09b)
 *   §13 HF · a holiday Friday (MB-85, OD-27)
 *   §14 DL · a week's deadlines at the open are its frozen rules' (OD-09b, MB-75; lane L's review, finding 8)
 *   §14b SN · a refused stop names the Owner's next act, in every branch (MR-30, OD-03; the S7 review, round 2)
 *   §15 SU · the sunset after a close (MR-30, OD-03; the lead's decision of 2026-10-18)
 *   §16    · the invariants and the books over everything above
 * ⏱ THE WEEK'S CLOCK IS INJECTED, MONEY'S IS REAL (`maswali-money-world.mts`). A container whose clock disagrees with the
 *    database is exactly that split, so §1 makes it on the real clock: a week left OPEN past its close, as a slow
 *    container leaves it, and a week closed by a clock that runs fast. Every other section's close reads its week clock
 *    as the database's (the world's `weekCloseClock`); §1 takes that away and meets the database's own clock.
 * ⛔ Every week and ticket goes through the product's own doors. Each fixture that cannot is declared where it is made.
 * ⚠️ This file carries no backslash: line breaks are built from their code points, and patterns use character classes.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const STORE = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-adversarial-session-secret-0123456789abcdef";
// The week timer stays off: every tick here runs on purpose, at the instant its case names.
process.env.MASWALI_SCHEDULER = "false";

const { loadMaswaliWorld, DRAFTER, READER, SEALER, OWNER, RELEASER } = await import("./maswali-money-world.mts");
const { HOLDER_HASH } = await import("./house-bot-world.mts");
const W = await loadMaswaliWorld();
const { dal, money, settle, acct, ledger } = W;
const market = W.w.svc;
const scheduler = await import("../../src/lib/server/maswali-scheduler.ts");
const consoleRead = await import("../../src/lib/server/maswali-console.ts");
const { checkMaswaliInvariants } = await import("../../src/lib/server/maswali-invariants.ts");
const { eatWeekStartMs, eatWeekAt } = await import("../../src/lib/eat-day.ts");
const { merkleRoot } = await import("../../src/lib/maswali-commitment.ts");
const { displayMap } = await import("../../src/lib/maswali-score.ts");
const objections = await import("../../src/lib/server/objections-service.ts");
const sources = await import("../../src/lib/server/source-registry.ts");
const holidays = await import("../../src/lib/server/maswali-holidays.ts");
const { formatTzs } = await import("../../src/lib/utils.ts");
const { getAuditForTargetDurable, auditFlush } = await import("../../src/lib/server/audit.ts");
const { trialBalance } = await import("../../src/lib/server/ledger.ts");
const { setRequireTwoOfficerResolution } = await import("../../src/lib/server/resolution-policy.ts");
const { houseBotEligibility } = await import("../../src/lib/server/house-bot/eligibility.ts");
const wallet = await import("../../src/lib/server/wallet-service.ts");
const { changePassword } = await import("../../src/lib/server/password-reset.ts");
const { DEPOSIT_STATUS_REVIEW_MARK } = await import("../../src/lib/wallet/deposit-review.ts");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

process.exitCode = 1;
let pass = 0, fail = 0, known = 0;
const knownList: string[] = [];
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
/** A rule the code still breaks (see the header). Its label carries `KNOWN-RED <id>`. */
const knownRed = (id: string, label: string, cond: boolean, detail = "") => {
  if (cond) {
    fail++;
    console.log(`FAIL [${STORE}] ${label} — KNOWN-RED ${id} NOW PASSES: strike its mark, count it, and raise the floor`);
    return;
  }
  known++;
  knownList.push(label);
  console.log(`KNOWN-RED [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};

const LF = String.fromCharCode(10);
const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
/** The East Africa calendar date ("YYYY-MM-DD") an instant falls on. */
const eatDate = (ms: number) => new Date(ms + 3 * HOUR).toISOString().slice(0, 10);
const J = (x: unknown) => JSON.stringify(x);
const errOf = (r: { ok: boolean; error?: string }) => (r.ok ? "" : String(r.error));
const bal = async (u: string) => (await W.bal(u)).balance as number;
const jackpot = async () => (await W.balanceOf(acct.maswaliJackpot)) as number;
const driveJackpot = async () => (await W.balanceOf(acct.maswaliDriveJackpot)) as number;
const guarantee = async () => (await W.balanceOf(acct.maswaliGuarantee)) as number;
const pool = async (marketId: string) => (await W.balanceOf(acct.pool(marketId))) as number;
const commission = async () => (W.onPostgres ? ((await W.balanceOf(acct.commission)) as number) : null);
const heldOf = async (u: string) => (((await W.bal(u)).freezeReasons ?? []) as string[]).includes("MILLIONEA_SHARE");
/** Each section's buyers buy on purpose; the platform's per-account bet bucket is a separate suite's subject. */
const section = (title: string) => {
  (globalThis as any).__50PICK_RL_RESET_HOOK?.();
  console.log(`${LF}${title}`);
};
/**
 * `--only CS,PL` runs those sections alone (by the ids in the header) — how `red:maswali-money-path` drives one plant
 * against its own section in seconds. Each section stands on the world's setup alone: the one thing a section leaves the
 * next is an empty jackpot, and a filtered run starts with one. With no `--only` everything runs, as the suite always does.
 */
const ONLY = (process.argv.find((_, i) => process.argv[i - 1] === "--only") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const runs = (id: string) => ONLY.length === 0 || ONLY.includes(id);
if (ONLY.length > 0) console.log(`ONLY ${ONLY.join(", ")} — a filtered run (the red drive's); the suite itself runs every section`);
const FUND = 30_000_000;
let ahead = 2;
let serial = 0;
const ref = (what: string) => `TEST-ADV-${what}-${process.pid}-${++serial}`;

/** Fifteen answers, YES unless a slot (1–15) says otherwise. */
type Pick = "YES" | "NO";
const picks = (over: Record<number, Pick> = {}): Pick[] => Array.from({ length: 15 }, (_, i) => over[i + 1] ?? "YES");
const ALL_YES = picks();
const MISS_M1 = picks({ 1: "NO" });

async function people(n: number, balance = 200_000): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(await W.user({ balance }));
  return out;
}
/** One purchase through the one bet path; a case that expects a refusal calls `W.buy` itself. */
async function bought(u: string, weekId: string, slips: Pick[][]): Promise<Array<{ ticketId: string; positionId: string; serial: string }>> {
  const r = await W.buy(u, weekId, slips);
  if (!r.ok) throw new Error(`a purchase was refused: ${r.error} (${r.reason})`);
  return r.data.maswali.tickets;
}

// ── The week's acts, each at its own injected instant ────────────────────────────────────────────────────────────────
async function drafted(start: number, o: { visibility?: "PUBLIC" | "DRIVE"; qs?: any[] } = {}): Promise<any> {
  const c = await W.svc.createWeek({ weekStartMs: start, visibility: o.visibility ?? "PUBLIC", questions: o.qs ?? W.questions(start), officerId: DRAFTER, now: new Date(start - 3 * DAY) });
  if (!c.ok) throw new Error(`draft ${new Date(start).toISOString()}: ${c.error}`);
  const a = await W.svc.attestParity({ weekId: c.week.id, officerId: READER });
  if (!a.ok) throw new Error(`attest ${c.week.code}: ${a.error}`);
  return c.week;
}
async function opened(week: any, start: number): Promise<any> {
  const o = await W.svc.openWeek({ weekId: week.id, officerId: DRAFTER, guarantee: money.guaranteeReader, now: new Date(start + MIN) });
  if (!o.ok) throw new Error(`open ${week.code}: ${o.error}`);
  return o.week;
}
const openWeekAt = async (start: number, o: { visibility?: "PUBLIC" | "DRIVE"; qs?: any[] } = {}) => opened(await drafted(start, o), start);
async function closed(weekId: string): Promise<any> {
  const w = await dal.weekStore.get(weekId);
  const c = await W.svc.closeWeek({ weekId, now: new Date(Date.parse(w.closesAt) + MIN) });
  if (!c.ok) throw new Error(`close ${w.code}: ${c.error}`);
  return c.week;
}
type Outcome = "YES" | "NO" | { void: string };
async function sealSlots(weekId: string, slots: number[], outcomes: Record<number, Outcome>, at: Date): Promise<void> {
  for (const slot of slots) {
    const o = outcomes[slot] ?? "YES";
    const r = typeof o === "string"
      ? await W.svc.sealQuestion({ weekId, slot, outcome: o, evidence: `Official result for event ${slot}`, officerId: SEALER, now: at })
      : await W.svc.sealQuestion({ weekId, slot, outcome: "VOID", voidReason: o.void, evidence: `Event ${slot} did not run as drawn`, officerId: SEALER, now: at });
    if (!r.ok) throw new Error(`seal slot ${slot}: ${r.error}`);
  }
}
/** Seal every slot still unsealed, at `at` (by default the week's start + 9 days: past every void deadline). */
async function sealRest(weekId: string, start: number, outcomes: Record<number, Outcome> = {}, at = new Date(start + 9 * DAY)): Promise<any> {
  const open = (await dal.questionStore.listForWeek(weekId)).filter((q: any) => q.outcome === null).map((q: any) => q.slot as number);
  await sealSlots(weekId, open, outcomes, at);
  return dal.weekStore.get(weekId);
}
const SLOTS = Array.from({ length: 15 }, (_, i) => i + 1);
const ALL_VOID: Record<number, Outcome> = Object.fromEntries(SLOTS.map((s) => [s, { void: "not_played" }]));
const windowEndOf = async (weekId: string) => Date.parse((await dal.weekStore.get(weekId)).objectionsCloseAt);
const afterWindow = async (weekId: string) => new Date((await windowEndOf(weekId)) + MIN);
async function released(weekId: string): Promise<any> {
  const r = await W.release(weekId, await afterWindow(weekId));
  if (!r.ok) throw new Error(`release: ${r.error}`);
  return r;
}
async function voided(weekId: string): Promise<any> {
  const v = await W.svc.voidWeek({ weekId, now: await afterWindow(weekId) });
  if (!v.ok) throw new Error(`void: ${v.error}`);
  return v;
}
const mapOf = async (weekId: string) => displayMap(W.svc.gradable(await dal.questionStore.listForWeek(weekId)));
const rowAt = (m: any, slot: number) => (m ?? []).find((x: any) => x.slot === slot);
const winnersOf = async (weekId: string) => (await dal.ticketStore.listForWeek(weekId)).filter((t: any) => t.won === true).map((t: any) => t.id as string).sort();

/** A settled week's mirrored figures, and §5b's formulas re-derived here — never imported from the module under test. */
type Figures = { k: number; J: number | null; F: number; tra: number; gbt: number; share: number | null; paid: number; U: number; carry: number };
const cols = (w: any): Figures => ({ k: w.winningTickets, J: w.jackpot, F: w.fee, tra: w.traLevy, gbt: w.gbtLevy, share: w.sharePerTicket, paid: w.paidTotal, U: w.topUp, carry: w.carryOut });
const roll = (S: number): Figures => ({ k: 0, J: null, F: 0, tra: 0, gbt: 0, share: null, paid: 0, U: 0, carry: S });
const same = (a: Figures, b: Figures) => (Object.keys(b) as Array<keyof Figures>).every((k) => a[k] === b[k]);
async function frozenOf(week: any) {
  const rules = W.svc.frozenRules(week);
  const fs = ((await W.mdal.marketStore.get(week.marketId))?.feeSnapshot ?? {}) as any;
  return { floor: rules.floorTzs as number, rate: fs.jackpotFeeRate as number, tra: fs.traTaxOnCommissionRate as number, gbt: fs.gbtLevyOnCommissionRate as number };
}
function expect5b(R: number, S: number, k: number, f: { floor: number; rate: number; tra: number; gbt: number }): Figures {
  if (k === 0) return roll(S);
  const Jk = Math.max(f.floor, R + S), F = Math.round(f.rate * Jk), tra = Math.round(F * f.tra), gbt = Math.round(F * f.gbt);
  const share = Math.floor((Jk - F) / k), paid = k * share, U = Math.max(0, F + paid - (R + S));
  return { k, J: Jk, F, tra, gbt, share, paid, U, carry: R + S + U - F - paid };
}
/** The audit rows of one action on one target, waited for: a check after a commit records on its own turn. */
async function auditRows(targetType: string, targetId: string, action: string, tries = 40): Promise<any[]> {
  for (let i = 0; i < tries; i++) {
    await new Promise((res) => setTimeout(res, 50));
    await auditFlush();
    const rows = (await getAuditForTargetDurable(targetType, targetId, { limit: 100 })).entries.filter((e: any) => e.action === action);
    if (rows.length > 0) return rows;
  }
  return [];
}
const weekAudit = (weekId: string, action: string, tries = 40) => auditRows("MaswaliCycle", weekId, action, tries);

await W.setup({ guarantee: FUND });

// ═══ §1 · CS · clock skew past the close ═════════════════════════════════════════════════════════════════════════════
if (runs("CS")) section("§1 · CS · clock skew past the close: a purchase, a cancel, a move of the close and the close itself answer to the database clock (MB-84, MB-28, MR-12)");
if (runs("CS")) {
  // ⏱ §1 MEETS THE DATABASE'S OWN CLOCK: the world's close reads its week clock as the database's (`weekCloseClock`), so
  //    it is taken away here — the close then reads the database as production's does — and put back after CS.6.
  W.svc.__setMaswaliCloseClockForTests(null);
  // THE SKEW, MADE ON THE REAL CLOCK. A week opened now, its close brought to a minute ahead, and then left OPEN past it:
  // no tick runs here, which is exactly the state a container with a slow clock leaves — on its clock the close has not
  // come; on the database's it has. ⚠️ The week is frozen with no free-exit grace (the platform's own config, set and put
  // back around its open), so the close may move to a minute ahead (MB-28's lead is the grace plus one minute).
  const marketConfig = await import("../../src/lib/server/market-config.ts");
  const grace = (await marketConfig.getGlobalConfig()).freeExitGraceMinutes;
  const start = W.weekStartAhead(ahead++);
  const draft = await drafted(start);
  let wk: any;
  try {
    const g = await marketConfig.setGlobalConfig({ freeExitGraceMinutes: 0 }, OWNER);
    if (!g.ok) throw new Error(`CS: the grace could not be set: ${g.error}`);
    const o = await W.svc.openWeek({ weekId: draft.id, officerId: DRAFTER, guarantee: money.guaranteeReader, now: new Date() });
    if (!o.ok) throw new Error(`CS: the week did not open: ${o.error}`);
    wk = o.week;
  } finally {
    await marketConfig.setGlobalConfig({ freeExitGraceMinutes: grace }, OWNER);
  }
  const dbNow = async () => (await money.dbNowMs(null)) as number;
  const target = new Date((await dbNow()) + 75_000).toISOString();
  const moved = await W.svc.moveClose({ weekId: wk.id, toCloseAt: target, officerId: DRAFTER, now: new Date() });
  if (!moved.ok) throw new Error(`CS: the close could not be brought forward: ${moved.error}`);
  const closeMs = Date.parse(moved.week.closesAt);
  const [early, buyer] = await people(2, 50_000);
  await bought(early, wk.id, [MISS_M1]);
  for (let i = 0; i < 400 && (await dbNow()) <= closeMs + 1_000; i++) await new Promise((res) => setTimeout(res, 500));
  ok("CS.0 · the skew is made: the week is still OPEN, and its close has passed on the database's clock",
    (await dal.weekStore.get(wk.id)).state === "OPEN" && (await dbNow()) > closeMs, `closes ${moved.week.closesAt}`);
  const r = await W.buy(buyer, wk.id, [ALL_YES]);
  ok("CS.1 · ⭐ a purchase after the close on the database clock is refused as closed, though no tick has stamped the close (MB-84)",
    !r.ok && r.reason === "millionea_sales_closed", J(r.ok ? "sold" : r));
  ok("CS.1b · …and nothing moved: the buyer's balance, the week's count and its pool",
    (await bal(buyer)) === 50_000 && (await dal.weekStore.get(wk.id)).ticketCount === 1 && (await pool(wk.marketId)) === 1_000);
  const cutoff = (await W.mdal.marketStore.get(wk.marketId))?.selectionClosedAt;
  const mv = await W.svc.moveClose({ weekId: wk.id, toCloseAt: new Date(closeMs + 2 * HOUR).toISOString(), officerId: DRAFTER, now: new Date(closeMs - 30_000) });
  const after = await dal.weekStore.get(wk.id);
  ok("CS.3 · ⭐ a close already passed on the database clock can never move — not even for a container whose clock reads before it (MB-28: the move would reopen sales)",
    !mv.ok && /already passed/.test(errOf(mv)) && after.closesAt === moved.week.closesAt, errOf(mv) || `moved to ${after.closesAt}`);
  const again = await W.buy(buyer, wk.id, [ALL_YES]);
  ok("CS.3c · …so the week did not reopen: the market's cutoff stands and a purchase is still refused as closed",
    (await W.mdal.marketStore.get(wk.marketId))?.selectionClosedAt === cutoff && !again.ok && again.reason === "millionea_sales_closed", J(again.ok ? "sold" : again));
  const c = await W.svc.closeWeek({ weekId: wk.id, now: new Date() });
  const live = await dal.ticketStore.listForWeek(wk.id, { status: "LIVE" });
  ok("CS.5 · the close, once stamped, commits exactly the ticket bought before it: its count, its sales and its root",
    c.ok && c.week.ticketCount === 1 && c.week.salesAtClose === 1_000 && c.week.ticketMerkleRoot === merkleRoot(live.map((t: any) => ({ ticketId: t.id, leaf: t.selectionsHash }))), errOf(c));
  await sealRest(wk.id, start, ALL_VOID);
  const v = await voided(wk.id);
  ok("CS.5b · …and the week voids whole, refunding that ticket in full", v.week.state === "VOIDED" && v.refunded === 1 && (await bal(early)) === 50_000, errOf(v));
}
if (runs("CS")) {
  const start = W.weekStartAhead(ahead++);
  const fw = await openWeekAt(start);
  const [holder] = await people(1, 50_000);
  const [t1, t2] = await bought(holder, fw.id, [MISS_M1, MISS_M1]);
  // ⚠️ A FIXTURE OF TIME, DECLARED (the house world's `backdate`): the first ticket's purchase moved six minutes back.
  await W.backdate(t1.positionId, 6 * MIN);
  const late = await market.cashOutPosition(holder, t1.positionId);
  ok("CS.2 · ⭐ the free cancel ends on the database clock: a ticket bought longer ago than its free window is not cancelled (MR-12)",
    !late.ok && (late as any).reason === "exit_window_closed", J(late));
  const fresh = await market.cashOutPosition(holder, t2.positionId);
  ok("CS.2b · control: a ticket inside its free window cancels, refunded in full", fresh.ok && (await bal(holder)) === 50_000 - 1_000, J(fresh));
  const to = new Date(eatWeekAt(start, 5, "19:00")).toISOString();
  const moved = await W.svc.moveClose({ weekId: fw.id, toCloseAt: to, officerId: DRAFTER, now: new Date(start + HOUR) });
  ok("CS.3b · control: a close still ahead on both clocks moves later, inside its buffer", moved.ok && moved.week.closesAt === to, errOf(moved));
  // THE OTHER SKEW: a container whose clock runs FAST, reading the close as passed while the database is days before it.
  const fastAt = new Date(Date.parse((await dal.weekStore.get(fw.id)).closesAt) + MIN);
  const fast = await W.svc.closeWeek({ weekId: fw.id, now: fastAt });
  ok("CS.4 · ⭐ a container whose clock runs fast cannot stamp the close before the database's clock reaches it (MB-84, §6.2: the close is checked on the DB clock)",
    !fast.ok && /has not arrived/.test(errOf(fast)) && (await dal.weekStore.get(fw.id)).state === "OPEN",
    fast.ok ? `closed at the container's ${fastAt.toISOString()} while the database reads ${new Date().toISOString()}` : errOf(fast));
  if ((await dal.weekStore.get(fw.id)).state === "OPEN") await W.svc.closeWeek({ weekId: fw.id, early: true, now: new Date(start + 2 * HOUR) });
  await sealRest(fw.id, start, ALL_VOID);
  const v = await voided(fw.id);
  ok("CS.6 · the fast container's week, closed early in its stead, voids whole and refunds its one live ticket", v.week.state === "VOIDED" && v.refunded === 1 && (await bal(holder)) === 50_000, errOf(v));
  W.svc.__setMaswaliCloseClockForTests(W.weekCloseClock);
}

// ═══ §2 · CH · a six-week chain ══════════════════════════════════════════════════════════════════════════════════════
if (runs("CH")) section("§2 · CH · a six-week chain — week 3 voided, week 4 skipped — each week opening while the one before still waits to settle (MR-3, MR-18, MR-21, MB-16, OD-27)");
if (runs("CH")) {
  const crowd = await people(100);
  /** `k` winning tickets, one to an account (the crowd's first k), then losing tickets ten to an account. */
  const sellWeek = async (weekId: string, total: number, k: number) => {
    for (const u of crowd.slice(0, k)) await bought(u, weekId, [ALL_YES]);
    if (total > k) await W.sell(weekId, total - k, MISS_M1, crowd.slice(k));
  };
  const s0 = W.weekStartAhead(ahead++);
  ahead += 5;
  const st = [0, 1, 2, 3, 4, 5].map((i) => s0 + i * 7 * DAY);
  const g0 = await guarantee(), c0 = await commission();
  ok("CH.0 · the chain starts from an empty jackpot: R = 0 at its first week", (await jackpot()) === 0, `${await jackpot()}`);
  const w1 = await openWeekAt(st[0]);
  await sellWeek(w1.id, 300, 0);
  await closed(w1.id);
  const w2 = await openWeekAt(st[1]);
  ok("CH.1 · ⭐ week 2 opens while week 1 is closed and unsettled: the next round begins at once (MR-3)",
    w2.state === "OPEN" && (await dal.weekStore.get(w1.id)).state === "CLOSED");
  await sellWeek(w2.id, 400, 0);
  await closed(w2.id);
  await sealRest(w1.id, st[0]);
  await sealRest(w2.id, st[1]);
  const early = await W.release(w2.id, await afterWindow(w2.id));
  ok("CH.2 · ⛔ week 2 cannot settle before week 1, nor claim a carry: the chain is strict (MR-3)",
    !early.ok && /strictly in order/.test(errOf(early)) && (await dal.weekStore.get(w2.id)).rolloverIn === null, errOf(early));
  const r1 = await released(w1.id);
  ok("CH.3 · ⭐ week 1, no winner: its 300,000 rolls and the jackpot holds 300,000 (MR-21)",
    same(cols(r1.week), roll(300_000)) && r1.week.rolloverIn === 0 && (await jackpot()) === 300_000, J(cols(r1.week)));
  const r2 = await released(w2.id);
  ok("CH.4 · ⭐ week 2, no winner: it claims the 300,000 in order and rolls 400,000 more — the jackpot holds 700,000",
    r2.week.rolloverIn === 300_000 && same(cols(r2.week), roll(400_000)) && (await jackpot()) === 700_000, J({ R: r2.week.rolloverIn, f: cols(r2.week) }));
  const w3 = await openWeekAt(st[2]);
  await sellWeek(w3.id, 500, 0);
  await closed(w3.id);
  // The skipped week: drafted and attested, then never opened (OD-27: a week may be skipped with notice).
  const w4 = await drafted(st[3]);
  const w5 = await openWeekAt(st[4]);
  ok("CH.5 · ⭐ week 5 opens over the skipped week 4 while week 3 is still to be graded",
    w5.state === "OPEN" && (await dal.weekStore.get(w4.id)).state === "DRAFT" && (await dal.weekStore.get(w3.id)).state === "CLOSED");
  await sellWeek(w5.id, 600, 1);
  await closed(w5.id);
  await sealRest(w3.id, st[2], ALL_VOID);
  const v3 = await voided(w3.id);
  const w3t = await dal.ticketStore.listForWeek(w3.id);
  ok("CH.6 · ⭐ week 3 voids whole: every one of its 500 tickets refunded in full, its pool at exactly 0 (MR-18)",
    v3.week.state === "VOIDED" && v3.refunded === 500 && w3t.length === 500 && w3t.every((t: any) => t.status === "REFUNDED") && (await pool(w3.marketId)) === 0, errOf(v3));
  ok("CH.7 · ⭐ …and R is untouched: the jackpot still holds 700,000, and the voided week claimed nothing",
    (await jackpot()) === 700_000 && (await dal.weekStore.get(w3.id)).rolloverIn === null, `${await jackpot()}`);
  const reopen = await W.svc.openWeek({ weekId: w4.id, officerId: DRAFTER, guarantee: money.guaranteeReader, now: new Date(st[3] + MIN) });
  ok("CH.8 · ⛔ the skipped week can never open once a later week has: its calendar comes first (R3)",
    !reopen.ok && /can no longer open/.test(errOf(reopen)) && (await dal.weekStore.get(w4.id)).state === "DRAFT", errOf(reopen));
  await sealRest(w5.id, st[4]);
  const r5 = await released(w5.id);
  ok("CH.9 · ⭐ week 5 claims the whole carry the voided and skipped weeks left waiting (MB-16) and pays its winner: J 1,300,000, F 169,000, share 1,131,000, no top-up",
    r5.week.rolloverIn === 700_000 && same(cols(r5.week), { k: 1, J: 1_300_000, F: 169_000, tra: 16_900, gbt: 8_450, share: 1_131_000, paid: 1_131_000, U: 0, carry: 0 })
      && (await jackpot()) === 0, J({ R: r5.week.rolloverIn, f: cols(r5.week) }));
  const w6 = await openWeekAt(st[5]);
  await sellWeek(w6.id, 800, 3);
  await closed(w6.id);
  await sealRest(w6.id, st[5]);
  const r6 = await released(w6.id);
  ok("CH.10 · ⭐ week 6, three winners at the floor: J 1,000,000, share 290,000, a top-up of 200,000 from the guarantee, nothing carried",
    r6.week.rolloverIn === 0 && same(cols(r6.week), { k: 3, J: 1_000_000, F: 130_000, tra: 13_000, gbt: 6_500, share: 290_000, paid: 870_000, U: 200_000, carry: 0 })
      && (await jackpot()) === 0, J(cols(r6.week)));
  const weeks = [r1.week, r2.week, r5.week, r6.week];
  const sum = (f: (w: any) => number) => weeks.reduce((s, w) => s + f(w), 0);
  const sales = sum((w) => w.salesAtClose), U = sum((w) => w.topUp), paid = sum((w) => w.paidTotal), fee = sum((w) => w.fee);
  const net = sum((w) => w.fee - w.traLevy - w.gbtLevy);
  ok("CH.11 · ⭐ the chain closes to the shilling: sales 2,100,000 + top-up 200,000 = paid 2,001,000 + fee 299,000, and the house is +54,150",
    sales === 2_100_000 && U === 200_000 && paid === 2_001_000 && fee === 299_000 && sales + U === paid + fee && net - U === 54_150, J({ sales, U, paid, fee, net }));
  ok("CH.12 · …the guarantee gave exactly the one top-up, 200,000", g0 - (await guarantee()) === 200_000, `${g0 - (await guarantee())}`);
  if (W.onPostgres) ok("CH.13 · (Postgres) HOUSE:COMMISSION grew by exactly the net fee, 254,150", ((await commission()) ?? 0) - (c0 ?? 0) === 254_150, `${((await commission()) ?? 0) - (c0 ?? 0)}`);
  ok("CH.14 · every week of the chain ends with its pool at exactly 0",
    (await Promise.all([w1, w2, w3, w5, w6].map((w) => pool(w.marketId)))).every((x) => x === 0));
}

// ═══ §3 · RP · reserve patterns × late voids × a reinstatement ═══════════════════════════════════════════════════════
if (runs("RP")) section("§3 · RP · reserve patterns × late voids × a reinstatement: what pays is what the FINAL record grades (MR-17, MR-19, MB-14, MB-15, OD-09)");
if (runs("RP")) {
  // CV · a correction is a seal, and meets a seal's own rules.
  const start = W.weekStartAhead(ahead++);
  const wk = await openWeekAt(start);
  await closed(wk.id);
  // Saturday 20:00 EAT: M8's event (16:00) is over, and its void deadline (Monday) has not come.
  const early = new Date(start + 5 * DAY + 20 * HOUR);
  const s8 = await W.svc.sealQuestion({ weekId: wk.id, slot: 8, outcome: "YES", evidence: "Official result for event 8", officerId: SEALER, now: early });
  if (!s8.ok) throw new Error(`CV: the seal of M8 was refused: ${s8.error}`);
  const q8 = (await dal.questionStore.listForWeek(wk.id)).find((q: any) => q.slot === 8);
  const cv1 = await W.svc.correctSeal({ weekId: wk.id, slot: 8, outcome: "VOID", voidReason: "not_played", evidence: "Corrected: the match was postponed", officerId: SEALER, now: new Date(early.getTime() + MIN) });
  ok("CV.1 · ⭐ a correction to VOID on 'not played' before the question's void deadline is refused, as a seal is (MR-15)",
    !cv1.ok && /before its void deadline/.test(errOf(cv1)) && Date.parse(q8.voidDeadlineAt) > early.getTime() + MIN && (await dal.questionStore.get(q8.id)).outcome === "YES", errOf(cv1));
  const cv2 = await W.svc.correctSeal({ weekId: wk.id, slot: 8, outcome: "NO", evidence: "   ", officerId: SEALER, now: new Date(early.getTime() + 2 * MIN) });
  ok("CV.2 · ⭐ a correction carrying no evidence is refused, as a seal is (MR-14)",
    !cv2.ok && /evidence/.test(errOf(cv2)) && (await dal.questionStore.get(q8.id)).outcome === "YES", errOf(cv2));
  const cv3 = await W.svc.correctSeal({ weekId: wk.id, slot: 8, outcome: "VOID", voidReason: "abandoned", evidence: "Corrected: abandoned at half time, no official result", officerId: SEALER, now: new Date(early.getTime() + 3 * MIN) });
  const cv4 = await W.svc.correctSeal({ weekId: wk.id, slot: 8, outcome: "YES", evidence: "Corrected back: the federation published the official result", officerId: SEALER, now: new Date(early.getTime() + 4 * MIN) });
  ok("CV.3 · control: a correction to VOID on a ground available at any time lands, and so does the correction back (a reinstatement)",
    cv3.ok && cv4.ok && (await dal.questionStore.get(q8.id)).outcome === "YES", `${errOf(cv3)} ${errOf(cv4)}`);
  await sealRest(wk.id, start);
  await released(wk.id);
}
if (runs("RP")) {
  // VG · an objection is upheld only after the sales close (MR-16), so its ground is no ground while the week is on sale.
  const start = W.weekStartAhead(ahead++);
  const wk = await openWeekAt(start);
  const onSale = new Date(start + 2 * HOUR);
  const slotOf5 = async () => (await dal.questionStore.listForWeek(wk.id)).find((q: any) => q.slot === 5);
  const vg1 = await W.svc.sealQuestion({ weekId: wk.id, slot: 5, outcome: "VOID", voidReason: "criterion_objection", evidence: "The criterion names the wrong competition", officerId: SEALER, now: onSale });
  ok("VG.1 · ⛔ a void on 'objection upheld' while the week is on sale is refused, and the question stays unsealed (MR-15, MR-16)",
    !vg1.ok && /only after the sales close/.test(errOf(vg1)) && (await slotOf5()).outcome === null && (await dal.weekStore.get(wk.id)).state === "OPEN", errOf(vg1));
  const vg2 = await W.svc.sealQuestion({ weekId: wk.id, slot: 5, outcome: "VOID", voidReason: "criterion_wrong", evidence: "The criterion names the wrong competition", officerId: SEALER, now: onSale });
  ok("VG.2 · control: the same void on 'criterion wrong' lands while the week is on sale",
    vg2.ok && (await slotOf5()).voidReason === "criterion_wrong", errOf(vg2));
  await closed(wk.id);
  const vg3 = await W.svc.sealQuestion({ weekId: wk.id, slot: 6, outcome: "VOID", voidReason: "criterion_objection", evidence: "Objection upheld: the criterion was materially wrong", officerId: SEALER, now: new Date(Date.parse(wk.closesAt) + 2 * HOUR) });
  ok("VG.3 · control: after the close, a void on 'objection upheld' lands",
    vg3.ok && (await dal.questionStore.listForWeek(wk.id)).find((q: any) => q.slot === 6).voidReason === "criterion_objection", errOf(vg3));
  await sealRest(wk.id, start);
  await released(wk.id);
}
if (runs("RP")) {
  // RP-A · M3 void with A1 void (A2 stands in), then the sealer reinstates A1: A1 stands in, and the other ticket wins.
  const start = W.weekStartAhead(ahead++);
  const wk = await openWeekAt(start);
  const [a, b, filler] = await people(3, 50_000);
  const [tA] = await bought(a, wk.id, [picks({ 11: "NO" })]);
  const [tB] = await bought(b, wk.id, [picks({ 12: "NO" })]);
  await W.sell(wk.id, 8, MISS_M1, [filler]);
  await closed(wk.id);
  const sealAt = new Date(start + 9 * DAY);
  await sealSlots(wk.id, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], { 3: { void: "abandoned" }, 11: { void: "abandoned" } }, sealAt);
  const end0 = await windowEndOf(wk.id);
  await sealSlots(wk.id, [13, 14, 15], { 13: { void: "abandoned" } }, new Date(sealAt.getTime() + 30 * MIN));
  ok("RP.0 · a reserve voided after the graded set went final changes nothing graded, and the window does not move (MR-19)",
    (await windowEndOf(wk.id)) === end0);
  const m0 = await mapOf(wk.id);
  ok("RP.1 · ⭐ M3 voided and A1 voided: A1 is skipped and A2 stands in for M3 (MR-17)",
    rowAt(m0, 3)?.state === "REPLACED_BY" && rowAt(m0, 3)?.reserve === 12 && rowAt(m0, 11)?.state === "VOID" && rowAt(m0, 13)?.state === "VOID", J(m0));
  const pre = await settle.previewMaswaliSettlement(wk.id, new Date(end0 + MIN));
  ok("RP.1b · …and on that record exactly one ticket wins", pre.ok && pre.preview.winners === 1, pre.ok ? `${pre.preview.winners}` : errOf(pre));
  const fixAt = new Date(sealAt.getTime() + 13 * HOUR);
  const fix = await W.svc.correctSeal({ weekId: wk.id, slot: 11, outcome: "YES", evidence: "Corrected: the reserve match was completed, official result YES", officerId: SEALER, now: fixAt });
  const rules = W.svc.frozenRules(wk);
  const end1 = await windowEndOf(wk.id);
  ok("RP.2 · ⭐ the sealer reinstates A1 (VOID → YES) inside the window: it lands, and the window restarts from the correction (OD-09)",
    fix.ok && end1 === W.svc.objectionWindowEnd(fixAt.getTime(), rules.objectionWindowHours, rules.objectionNotBeforeAt) && end1 > end0
      && end1 >= fixAt.getTime() + rules.objectionWindowHours * HOUR, `${errOf(fix)} · ${new Date(end0).toISOString()} → ${new Date(end1).toISOString()}`);
  const m1 = await mapOf(wk.id);
  ok("RP.3 · ⭐ A1 usable again, A1 — not A2 — stands in for M3: the graded set follows the final record", rowAt(m1, 3)?.reserve === 11 && rowAt(m1, 12)?.state === "UNUSED", J(m1));
  const tooSoon = await W.release(wk.id, new Date(end0 + MIN));
  ok("RP.4 · ⛔ at the first window's end the week does not settle: the restarted window is still open", !tooSoon.ok && /objection window/.test(errOf(tooSoon)), errOf(tooSoon));
  const r = await W.release(wk.id, new Date(end1 + MIN));
  ok("RP.5 · ⭐ released on the final record: B's ticket (A1 right) wins and A's (A1 wrong) does not — one winner, paid the share",
    r.ok && J(await winnersOf(wk.id)) === J([tB.ticketId]) && (await dal.ticketStore.get(tA.ticketId)).won === false && (await dal.ticketStore.get(tB.ticketId)).payout === r.week.sharePerTicket,
    J({ won: await winnersOf(wk.id), A: tA.ticketId, B: tB.ticketId }));
}
if (runs("RP")) {
  // RP-B · a late void: M3 void (A1 stands in), then the sealer corrects M7 to VOID — A2 is pulled in for it.
  const start = W.weekStartAhead(ahead++);
  const wk = await openWeekAt(start);
  const [c, d, filler] = await people(3, 50_000);
  const [tC] = await bought(c, wk.id, [picks({ 12: "NO" })]);
  const [tD] = await bought(d, wk.id, [picks({ 7: "NO" })]);
  await W.sell(wk.id, 8, MISS_M1, [filler]);
  await closed(wk.id);
  const sealAt = new Date(start + 9 * DAY);
  await sealRest(wk.id, start, { 3: { void: "abandoned" } }, sealAt);
  const end0 = await windowEndOf(wk.id);
  const pre = await settle.previewMaswaliSettlement(wk.id, new Date(end0 + MIN));
  ok("LV.0 · M3 voided and A1 standing in: one ticket wins on that record (C's — its wrong A2 is never graded)", pre.ok && pre.preview.winners === 1, pre.ok ? `${pre.preview.winners}` : errOf(pre));
  const fixAt = new Date(sealAt.getTime() + 13 * HOUR);
  const late = await W.svc.correctSeal({ weekId: wk.id, slot: 7, outcome: "VOID", voidReason: "abandoned", evidence: "Corrected: abandoned in the second half, no official result", officerId: SEALER, now: fixAt });
  const end1 = await windowEndOf(wk.id);
  const m = await mapOf(wk.id);
  ok("LV.1 · ⭐ a late void (M7, corrected to VOID inside the window) pulls the next usable reserve in — A1 for M3, A2 for M7 — and restarts the window",
    late.ok && end1 > end0 && rowAt(m, 3)?.reserve === 11 && rowAt(m, 7)?.reserve === 12, `${errOf(late)} · ${J(m)}`);
  const r = await W.release(wk.id, new Date(end1 + MIN));
  ok("LV.2 · ⭐ …and the money follows: D's ticket (M7 wrong, no longer graded) wins; C's (A2 wrong, now graded) does not",
    r.ok && J(await winnersOf(wk.id)) === J([tD.ticketId]) && (await dal.ticketStore.get(tC.ticketId)).won === false, J({ won: await winnersOf(wk.id), C: tC.ticketId, D: tD.ticketId }));
}
if (runs("RP")) {
  // RP-C · a doomed week reinstated: six mains void against five reserves — certain — then the sealer reinstates M6.
  const start = W.weekStartAhead(ahead++);
  const wk = await openWeekAt(start);
  const [e, f, filler] = await people(3, 50_000);
  const [tE] = await bought(e, wk.id, [ALL_YES]);
  const [tF] = await bought(f, wk.id, [picks({ 15: "NO" })]);
  await W.sell(wk.id, 8, picks({ 7: "NO" }), [filler]);
  await closed(wk.id);
  const sealAt = new Date(start + 9 * DAY);
  await sealRest(wk.id, start, Object.fromEntries([1, 2, 3, 4, 5, 6].map((s) => [s, { void: "abandoned" }])), sealAt);
  const end0 = await windowEndOf(wk.id);
  const g0 = await W.svc.recomputeGate(wk.id, sealAt);
  const inWindow = await W.svc.voidWeek({ weekId: wk.id, now: new Date(end0 - MIN) });
  ok("RW.1 · six mains voided against five usable reserves: the week void is certain on the final record, and waits for its window (MR-18, MB-15)",
    g0.ok && g0.gate.ready && g0.gate.weekVoid && !inWindow.ok && /objection window/.test(errOf(inWindow)), errOf(inWindow));
  const fixAt = new Date(sealAt.getTime() + 13 * HOUR);
  const back = await W.svc.correctSeal({ weekId: wk.id, slot: 6, outcome: "YES", evidence: "Corrected: the match was played, official result YES", officerId: SEALER, now: fixAt });
  const end1 = await windowEndOf(wk.id);
  ok("RW.2 · the sealer reinstates M6 inside the window (VOID → YES): five voids against five reserves — the week grades, and the window restarts",
    back.ok && end1 > end0, errOf(back));
  const tick = await scheduler.runMaswaliTick(new Date(end0 + MIN));
  const notVoid = await W.svc.voidWeek({ weekId: wk.id, now: new Date(end0 + MIN) });
  ok("RW.3 · ⭐ at the first window's end nothing voids the week: the tick voids nothing and the week void is refused — a reinstatement stopped it (MB-15)",
    tick.voided === 0 && tick.failures === 0 && !notVoid.ok && (await dal.weekStore.get(wk.id)).state === "RESOLVING", J({ tick, v: errOf(notVoid) }));
  const r = await W.release(wk.id, new Date(end1 + MIN));
  ok("RW.4 · ⭐ settled with A1–A5 standing in for M1–M5: E's ticket (every reserve right) wins, F's (A5 wrong) loses, and no ticket is refunded",
    r.ok && J(await winnersOf(wk.id)) === J([tE.ticketId]) && (await dal.ticketStore.get(tF.ticketId)).won === false
      && (await dal.ticketStore.listForWeek(wk.id)).every((t: any) => t.status === "SETTLED"), errOf(r));
}

// ═══ §4 · OB · an objection during settlement ═══════════════════════════════════════════════════════════════════════
if (runs("OB")) section("§4 · OB · an objection during settlement: no week pays while one stands, however late it lands (MR-16, MB-23)");
if (runs("OB")) {
  const start = W.weekStartAhead(ahead++);
  const wk = await openWeekAt(start);
  const [holder, filler] = await people(2, 50_000);
  await bought(holder, wk.id, [ALL_YES]);
  await W.sell(wk.id, 9, MISS_M1, [filler]);
  await closed(wk.id);
  await sealRest(wk.id, start);
  // MR-16: any holder may object, per question, inside the week's own window. The platform has one objection door.
  const filed = await objections.fileObjection(holder, { marketId: wk.marketId, reason: "WRONG_OUTCOME", detail: "M3 was sealed against the result its source published" });
  knownRed("MB-23", "OB.0 · KNOWN-RED MB-23 · a ticket holder files an objection against one question inside the week's window (MR-16: per question, any holder; REVERSE, VOID or REINSTATE by an officer other than the sealer)",
    filed.ok, J(filed));
  if (filed.ok) await W.db.objection.update(filed.data.objectionId, { status: "REJECTED", reviewedBy: OWNER, reviewedAt: new Date().toISOString(), reviewNote: "decided" });
  const at = await afterWindow(wk.id);
  // ⚠️ A FIXTURE, DECLARED: the OPEN objection a Millionea door would write — none exists yet (OB.0) — as the row itself.
  const objection = (id: string) => ({
    id, marketId: wk.marketId, userId: holder, reason: "WRONG_OUTCOME", detail: "M3 sealed against its source (declared fixture)", status: "OPEN",
    createdAt: new Date().toISOString(), reviewedBy: null, reviewedAt: null, reviewNote: null, remedy: null, outcomeAtFiling: null,
  });
  const decide = (id: string) => W.db.objection.update(id, { status: "REJECTED", reviewedBy: OWNER, reviewedAt: new Date().toISOString(), reviewNote: "decided: the seal stands" });
  const o1 = `obj_adv_${process.pid}_${++serial}`;
  await W.db.objection.create(objection(o1));
  const p1 = await settle.previewMaswaliSettlement(wk.id, at);
  ok("OB.1 · ⭐ an objection standing after the window refuses the prepared settlement (MR-16: settlement fails closed)",
    !p1.ok && /objection is standing/.test(errOf(p1)), errOf(p1));
  await decide(o1);
  const p2 = await settle.previewMaswaliSettlement(wk.id, at);
  ok("OB.2 · …decided, the week prepares", p2.ok, errOf(p2));
  // ⭐ THE INTERLEAVE: an objection that lands AFTER the preview, while the release holds the chain lock.
  const o2 = `obj_adv_${process.pid}_${++serial}`;
  const before = { bal: await bal(holder), jackpot: await jackpot() };
  settle.__setMaswaliSettleSeamsForTests({ afterHolds: async () => { await W.db.objection.create(objection(o2)); } });
  let r: any;
  try {
    r = p2.ok ? await settle.settleMaswaliWeek({ weekId: wk.id, releasedBy: RELEASER, digest: p2.preview.digest, now: at }) : p2;
  } finally {
    settle.__setMaswaliSettleSeamsForTests(null);
  }
  const w = await dal.weekStore.get(wk.id);
  ok("OB.3 · ⭐ an objection landing DURING the release — after its preview, inside its chain lock — is read again under the lock: nothing pays, no carry is claimed",
    !r.ok && /objection is standing/.test(errOf(r)) && w.state === "RESOLVING" && w.rolloverIn === null && (await bal(holder)) === before.bal
      && (await jackpot()) === before.jackpot && (await dal.ticketStore.listForWeek(wk.id)).every((t: any) => t.status === "LIVE"), errOf(r));
  await decide(o2);
  const r2 = await W.release(wk.id, at);
  ok("OB.4 · …decided, the same week releases once and pays its winner", r2.ok && r2.week.state === "SETTLED" && (await bal(holder)) > before.bal, errOf(r2));
  const r3 = await W.release(wk.id, at);
  ok("OB.5 · …and a second release pays nothing (already)", r3.ok && r3.already === true);
}

// ═══ §5 · SD · a source domain switched off mid-week ═════════════════════════════════════════════════════════════════
if (runs("SD")) section("§5 · SD · a source domain switched off mid-week: the open week keeps the sources it froze; only a week not yet open meets the change (MB-22)");
if (runs("SD")) {
  const start = W.weekStartAhead(ahead++);
  const wk = await openWeekAt(start);
  const [winner, filler, late] = await people(3, 50_000);
  await bought(winner, wk.id, [ALL_YES]);
  await W.sell(wk.id, 5, MISS_M1, [filler]);
  const crypto = (await sources.listSources()).find((s) => s.domain === "coingecko.com");
  if (!crypto) throw new Error("SD: the seeded crypto source is missing");
  await sources.setSourceEnabled(crypto.id, false, OWNER);
  await sources.setCategoryEnabled("crypto", false, OWNER);
  const qs = await dal.questionStore.listForWeek(wk.id);
  ok("SD.0 · the week froze three questions on the source now switched off (M5, M10, A5)",
    qs.filter((q: any) => String(q.sourceDomain).endsWith("coingecko.com")).map((q: any) => q.slot).join(",") === "5,10,15", J(qs.map((q: any) => q.sourceDomain)));
  const buy = await W.buy(late, wk.id, [MISS_M1]);
  ok("SD.1 · ⭐ the open week keeps selling: a registry edit never touches an open week", buy.ok, J(buy.ok ? true : buy));
  await closed(wk.id);
  const sealed = await sealRest(wk.id, start);
  ok("SD.2 · ⭐ …its questions on the switched-off source seal on their frozen source, and the graded set goes final",
    !!sealed.gradedSetFinalAt && (await dal.questionStore.listForWeek(wk.id)).every((q: any) => q.outcome === "YES"));
  const start2 = W.weekStartAhead(ahead++);
  const next = await drafted(start2);
  const refused = await W.svc.openWeek({ weekId: next.id, officerId: DRAFTER, guarantee: money.guaranteeReader, now: new Date(start2 + MIN) });
  ok("SD.3 · ⛔ control: a new week drafted on the switched-off source does not open — the registry governs every week not yet frozen",
    !refused.ok && /not a trusted source/.test(errOf(refused)) && errOf(refused).includes("coingecko.com"), errOf(refused));
  const r = await released(wk.id);
  ok("SD.4 · ⭐ the frozen week settles and pays its one winner", r.week.state === "SETTLED" && r.week.winningTickets === 1, J(cols(r.week)));
  await sources.setSourceEnabled(crypto.id, true, OWNER);
  await sources.setCategoryEnabled("crypto", true, OWNER);
  const back = await W.svc.openWeek({ weekId: next.id, officerId: DRAFTER, guarantee: money.guaranteeReader, now: new Date(start2 + MIN) });
  ok("SD.5 · …and with the source switched back on, the same draft opens", back.ok, errOf(back));
  if (back.ok) {
    await closed(next.id);
    await sealRest(next.id, start2);
    await released(next.id);
  }
}

// ═══ §6 · GU · an under-funded guarantee at k ≥ 1, and a short float ═════════════════════════════════════════════════
if (runs("GU")) section("§6 · GU · an under-funded guarantee at k ≥ 1, to the shilling, and a short float (MR-22, MB-03, MB-11, MB-63)");
if (runs("GU")) {
  const topUp = async (amount: number) => {
    const f = await money.fundMaswaliGuarantee({ amount, reference: ref("FUND"), typed: money.GUARANTEE_FUND_WORD, ownerId: OWNER });
    if (!f.ok) throw new Error(`GU: the guarantee could not be funded: ${f.error}`);
  };
  // ⚠️ A FAULT THE PRODUCT CANNOT PRODUCE, DECLARED (the settle suite's §6): a guarantee return booked past the return
  //    ceremony's own requirement check — the product's builder, posted directly — to leave exactly `target` in it.
  const drainTo = async (target: number) => {
    const held = await guarantee();
    if (held > target) await money.postMaswaliLines(`test_drain_${ref("G")}`, ledger.maswaliGuaranteeReturnEntries({ amount: held - target, reference: ref("DRAIN"), actorId: OWNER }), null);
  };
  const fillers = await people(6, 100_000);
  // GU-A · one winner at the floor; the guarantee one shilling short of its top-up, then exactly enough.
  const start = W.weekStartAhead(ahead++);
  const a = await openWeekAt(start);
  const [w1] = await people(1, 50_000);
  await bought(w1, a.id, [ALL_YES]);
  await W.sell(a.id, 19, MISS_M1, fillers);
  await closed(a.id);
  await sealRest(a.id, start);
  const at = await afterWindow(a.id);
  const pa = await settle.previewMaswaliSettlement(a.id, at);
  const U = pa.ok && pa.preview.arithmetic.kind === "PAYOUT" ? pa.preview.arithmetic.U : -1;
  const exp = expect5b(pa.ok ? pa.preview.rolloverIn : 0, 20_000, 1, await frozenOf(a));
  ok("GU.0 · the prepared top-up is §5b's to the shilling: U = F + share − (R + S)", pa.ok && U === exp.U && U > 0, J({ U, expected: exp.U }));
  await drainTo(U - 1);
  const short = pa.ok ? await settle.settleMaswaliWeek({ weekId: a.id, releasedBy: RELEASER, digest: pa.preview.digest, now: at }) : pa;
  const aw = await dal.weekStore.get(a.id);
  ok("GU.1 · ⭐ a guarantee ONE shilling below the top-up refuses the week: never a smaller share — nothing moved, no carry claimed (MR-22)",
    !short.ok && /guarantee holds less/.test(errOf(short)) && aw.state === "RESOLVING" && aw.rolloverIn === null && (await guarantee()) === U - 1
      && (await bal(w1)) === 49_000, errOf(short));
  const crit = await weekAudit(a.id, "maswali.settlement.guarantee_short");
  ok("GU.2 · …recorded as a CRITICAL compliance row naming what the top-up needed",
    crit.length >= 1 && crit[0].payload?.severity === "CRITICAL" && Number(crit[0].payload?.need) === U, J(crit.map((e: any) => e.payload)));
  const alerts = await consoleRead.consoleAlerts(at);
  ok("GU.3 · …and the console raises the unfunded floor", alerts.some((x) => x.level === "critical" && /The guarantee holds/.test(x.text)), J(alerts.map((x) => x.text)));
  await topUp(1);
  const exact = await W.release(a.id, at);
  ok("GU.4 · ⭐ funded to EXACTLY the top-up, the same week releases: covered to the last shilling, the guarantee left at 0",
    exact.ok && exact.week.topUp === U && (await guarantee()) === 0 && (await bal(w1)) === 49_000 + exact.week.sharePerTicket, errOf(exact));
  const floatAlertFor = async (weekId: string, at: Date) => (await consoleRead.consoleAlerts(at)).find((x) => x.weekId === weekId && /float/i.test(x.text));
  ok("FL.0 · control: a payout whose float could not be read raises no float alert (the payments console shows an unreadable float)",
    !(await floatAlertFor(a.id, at)));
  await topUp(FUND);

  // GU-B and GU-C · two floor weeks of seven winners each, prepared side by side; the guarantee holds both top-ups less one.
  const sB = W.weekStartAhead(ahead++), sC = W.weekStartAhead(ahead++);
  const b = await openWeekAt(sB);
  const wB = await people(7, 50_000);
  for (const u of wB) await bought(u, b.id, [ALL_YES]);
  await W.sell(b.id, 13, MISS_M1, fillers);
  await closed(b.id);
  const c = await openWeekAt(sC);
  const wC = await people(7, 50_000);
  for (const u of wC) await bought(u, c.id, [ALL_YES]);
  await W.sell(c.id, 13, MISS_M1, fillers);
  await closed(c.id);
  await sealRest(b.id, sB);
  await sealRest(c.id, sC);
  // FL · one of week B's winners is suspended before the release: their share is paid and held, and still counts.
  await W.setUserFields(wB[0], { status: "SUSPENDED" });
  const atB = await afterWindow(b.id), atC = await afterWindow(c.id);
  const pb = await settle.previewMaswaliSettlement(b.id, atB), pc = await settle.previewMaswaliSettlement(c.id, atC);
  const ab: any = pb.ok ? pb.preview.arithmetic : null, ac: any = pc.ok ? pc.preview.arithmetic : null;
  ok("GU.5 · two floor weeks of seven winners each: share 124,285, U 979,995 each — the 5 of dust is not topped up (§5 worked example B)",
    ab?.share === 124_285 && ab?.U === 979_995 && ab?.carryOut === 0 && ac?.share === 124_285 && ac?.U === 979_995, J({ ab, ac }));
  const pools = await consoleRead.poolsView(atC);
  ok("FL.5 · before either release, accounting's page lists both prepared payouts beside the float — read as unknown (null), never 0, where no float can be read",
    pools.pendingPayout === 2 * 869_995 && pools.float === null, J({ pending: pools.pendingPayout, float: pools.float }));
  await drainTo((ab?.U ?? 0) + (ac?.U ?? 0) - 1);
  const balB = await Promise.all(wB.map(bal));
  const rB = pb.ok ? await settle.settleMaswaliWeek({ weekId: b.id, releasedBy: RELEASER, digest: pb.preview.digest, now: atB, readFloat: async () => ({ balance: 0 }) }) : pb;
  ok("GU.6 · ⭐ the first week takes its whole top-up and settles; the second's top-up is now one shilling short",
    rB.ok && rB.week.state === "SETTLED" && (await guarantee()) === (ac?.U ?? 0) - 1, errOf(rB));
  ok("FL.1 · ⭐ a float of 0 never stops or shrinks a payout: every one of the seven credited the full share, the held one included (MB-11: a read, never a block)",
    rB.ok && (await Promise.all(wB.map(bal))).every((v, i) => v - balB[i] === 124_285) && (await heldOf(wB[0])), J((await Promise.all(wB.map(bal))).map((v, i) => v - balB[i])));
  const floatRows = await weekAudit(b.id, "maswali.settlement.float_low");
  ok("FL.2 · ⭐ the float alert names the paid total the settlement committed — 869,995, the held share counted in it (MB-11)",
    floatRows.length === 1 && floatRows[0].payload?.paid === 869_995, J(floatRows.map((e: any) => e.payload)));
  const floatB = await floatAlertFor(b.id, atB);
  ok("FL.4 · ⭐ the console's alerts carry the short float after the release, beside its week, with the payout and the amount short (MB-11: alert the Owner and Finance; MB-63's 'float short')",
    !!floatB && floatB.level === "critical" && floatB.text.includes(formatTzs(869_995)) && /short of the payout/.test(floatB.text), J(floatB ?? "no float alert"));
  const rC = pc.ok ? await settle.settleMaswaliWeek({ weekId: c.id, releasedBy: RELEASER, digest: pc.preview.digest, now: atC }) : pc;
  ok("GU.7 · ⭐ …and the second, one shilling short, refuses whole: nothing paid, no carry claimed, the guarantee untouched",
    !rC.ok && /guarantee holds less/.test(errOf(rC)) && (await dal.weekStore.get(c.id)).rolloverIn === null && (await guarantee()) === (ac?.U ?? 0) - 1, errOf(rC));
  await topUp(1);
  const rC2 = await W.release(c.id, atC);
  ok("GU.8 · …the Owner funds the one shilling, and it releases with the whole top-up", rC2.ok && rC2.week.topUp === ac?.U && (await guarantee()) === 0, errOf(rC2));
  ok("FL.4c · …and B's float alert stands until the next week of its line pays: once C has paid (its own check, the float unreadable here, finds nothing to say), B's gives way",
    !(await floatAlertFor(b.id, atC)) && !(await floatAlertFor(c.id, atC)));
  await topUp(FUND);
  const heldTicket = (await dal.ticketStore.listForWeek(b.id)).find((t: any) => t.userId === wB[0] && t.won);
  await settle.releaseMaswaliShare({ ticketId: heldTicket.id, officerId: OWNER, note: "the account's review is closed" });
  await W.setUserFields(wB[0], { status: "ACTIVE" });
}

// ═══ §7 · WF · no winner floor ═══════════════════════════════════════════════════════════════════════════════════════
if (runs("WF")) section("§7 · WF · no winner floor: 950 winning tickets at the floor are each paid below the ticket's price, never lifted to it (MR-25, OD-19)");
if (runs("WF")) {
  const start = W.weekStartAhead(ahead++);
  const wk = await openWeekAt(start);
  const crowd = await people(95, 20_000);
  for (const u of crowd) await bought(u, wk.id, Array.from({ length: 10 }, () => ALL_YES));
  await closed(wk.id);
  await sealRest(wk.id, start);
  const before = await Promise.all(crowd.map(bal));
  const g0 = await guarantee();
  const r = await released(wk.id);
  const exp = expect5b(r.week.rolloverIn, 950_000, 950, await frozenOf(wk));
  ok("WF.0 · the jackpot was empty, so the week sits at the floor: J 1,000,000 shared by 950 winning tickets",
    r.week.rolloverIn === 0 && exp.J === 1_000_000 && exp.share === 915 && exp.U === 49_250, J({ R: r.week.rolloverIn, exp }));
  ok("WF.1 · ⭐ the settlement pays each winning ticket 915 — below its 1,000 price, never raised to it (no winner floor, OD-19)",
    same(cols(r.week), exp) && r.week.sharePerTicket === 915, J(cols(r.week)));
  ok("WF.2 · …so each player's ten winning tickets pay 9,150, less than the 10,000 they cost",
    (await Promise.all(crowd.map(bal))).every((v, i) => v - before[i] === 9_150));
  ok("WF.3 · ⭐ the top-up 49,250 came from the guarantee, and the 750 of dust is neither topped up nor carried: house money never carries",
    g0 - (await guarantee()) === 49_250 && r.week.carryOut === 0 && r.week.dustCarried === 0 && (await jackpot()) === 0, `${g0 - (await guarantee())} · ${await jackpot()}`);
  const positions = (await market.listPositionsForMarket(wk.marketId)) as any[];
  ok("WF.4 · 950 WIN positions at 915, each below its stake, and the pool at exactly 0",
    positions.length === 950 && positions.every((p) => p.status === "WIN" && p.finalPayout === 915 && p.finalPayout < p.stake) && (await pool(wk.marketId)) === 0);
}

// ═══ §8 · PL · an attempt to reclassify productLine ═════════════════════════════════════════════════════════════════
if (runs("PL")) section("§8 · PL · an attempt to reclassify a week's productLine, through the store and in the database (MB-01, the fence)");
if (runs("PL")) {
  const start = W.weekStartAhead(ahead++);
  const wk = await openWeekAt(start);
  const [buyer, late] = await people(2, 50_000);
  await bought(buyer, wk.id, [MISS_M1]);
  const lineOf = async () => (await W.mdal.marketStore.get(wk.marketId))?.productLine;
  let threw = "";
  try { await W.mdal.marketStore.stamp(wk.marketId, { productLine: "MARKET" } as never); } catch (err) { threw = String((err as Error)?.message ?? err); }
  ok("PL.1 · ⭐ the store refuses a stamp of the product line — on both stores (the Postgres allowlist, and the memory twin now the same)",
    /not a stampable column/.test(threw) && (await lineOf()) === "MASWALI", `${threw.slice(0, 100)} · ${await lineOf()}`);
  const row = await W.mdal.marketStore.get(wk.marketId);
  await W.mdal.marketStore.set({ ...row, productLine: "MARKET" });
  ok("PL.2 · ⭐ a full-row write from a copy naming MARKET keeps the week MASWALI — on both stores", (await lineOf()) === "MASWALI", `${await lineOf()}`);
  let dbRefused = false;
  /** ⚠️ A FIXTURE, DECLARED: the database's fence switched off for one statement — what a hand edit made with the trigger
   *  disabled presents — so PL.4 measures the application's own refusal on Postgres too. */
  const FENCE = `"PredictionMarket_productLine_maswali_fence"`;
  const relineFenceOff = async (line: string) => {
    await W.prisma()!.$executeRawUnsafe(`ALTER TABLE "PredictionMarket" DISABLE TRIGGER ${FENCE}`);
    try {
      await W.prisma()!.$executeRawUnsafe(`UPDATE "PredictionMarket" SET "productLine" = '${line}' WHERE "id" = $1`, wk.marketId);
    } finally {
      await W.prisma()!.$executeRawUnsafe(`ALTER TABLE "PredictionMarket" ENABLE TRIGGER ${FENCE}`);
    }
  };
  if (W.onPostgres) {
    try {
      await W.prisma()!.$executeRawUnsafe(`UPDATE "PredictionMarket" SET "productLine" = 'MARKET' WHERE "id" = $1`, wk.marketId);
    } catch {
      dbRefused = true;
    }
    ok("PL.3 · ⭐ (Postgres) the database refuses a raw reclassification of a Millionea week's market (a direct UPDATE of its productLine): the fence rests on the line, in the database too",
      dbRefused && (await lineOf()) === "MASWALI", `the row now reads ${await lineOf()}`);
    const poll = await W.poll();
    const pollLine = async () => (await W.mdal.marketStore.get(poll.id))?.productLine;
    let asRound = "", intoWeek = false;
    try {
      await W.prisma()!.$executeRawUnsafe(`UPDATE "PredictionMarket" SET "productLine" = 'UPDOWN' WHERE "id" = $1`, poll.id);
      asRound = String(await pollLine());
    } finally {
      await W.prisma()!.$executeRawUnsafe(`UPDATE "PredictionMarket" SET "productLine" = 'MARKET' WHERE "id" = $1`, poll.id);
    }
    ok("PL.3b · (Postgres) control: the fence is the Millionea line's alone — a poll still re-lines to a round and back, as the house suites' fixtures do",
      asRound === "UPDOWN" && (await pollLine()) === "MARKET", `${asRound} · ${await pollLine()}`);
    try {
      await W.prisma()!.$executeRawUnsafe(`UPDATE "PredictionMarket" SET "productLine" = 'MASWALI' WHERE "id" = $1`, poll.id);
    } catch {
      intoWeek = true;
    }
    ok("PL.3c · (Postgres) ⭐ …and no poll is ever re-lined INTO Millionea: the trigger refuses the move both ways", intoWeek && (await pollLine()) === "MARKET", `${await pollLine()}`);
    await relineFenceOff("MARKET");
  } else {
    // ⚠️ A FIXTURE, DECLARED: the memory store hands back its live row, and the line is written on it directly — the shape a
    //    database edit presents (as the house-bot suites plant a line).
    (await W.mdal.marketStore.get(wk.marketId)).productLine = "MARKET";
  }
  const reclassified = (await lineOf()) !== "MASWALI";
  const before = { bal: await bal(late), count: (await dal.weekStore.get(wk.id)).ticketCount, positions: ((await market.listPositionsForMarket(wk.marketId)) as any[]).length };
  const r = await W.buy(late, wk.id, [ALL_YES]);
  ok("PL.4 · ⭐ a week whose market no longer reads as a Millionea market sells nothing — never a one-sided Yes/No stake on its pool",
    !reclassified || (!r.ok && r.reason === "millionea_week_not_open" && (await bal(late)) === before.bal
      && ((await market.listPositionsForMarket(wk.marketId)) as any[]).length === before.positions && (await dal.weekStore.get(wk.id)).ticketCount === before.count),
    J({ reclassified, r: r.ok ? "sold" : r }));
  if (W.onPostgres) {
    await relineFenceOff("MASWALI");
  } else {
    (await W.mdal.marketStore.get(wk.marketId)).productLine = "MASWALI";
  }
  const again = await W.buy(late, wk.id, [ALL_YES]);
  ok("PL.5 · control: the line put back, the week sells again", again.ok, J(again.ok ? "sold" : again));
  await closed(wk.id);
  await sealRest(wk.id, start);
  await released(wk.id);
}

// ═══ §8b · FR · a purchase whose read fails ═════════════════════════════════════════════════════════════════════════
if (runs("FR")) section("§8b · FR · a purchase whose read of its week or its market fails is refused as busy, never thrown: nothing has moved (L6)");
if (runs("FR")) {
  const start = W.weekStartAhead(ahead++);
  const wk = await openWeekAt(start);
  const [buyer] = await people(1, 50_000);
  const stateOf = async () => ({
    bal: await bal(buyer), count: (await dal.weekStore.get(wk.id)).ticketCount,
    positions: ((await market.listPositionsForMarket(wk.marketId)) as any[]).length, pool: await pool(wk.marketId),
  });
  /** ⚠️ A FAULT, DECLARED: one store's `get` throws for one row during one purchase, then is put back — a read that failed
   *  (a dropped connection, a timeout), which no door of the product produces on purpose. */
  const failing = async (store: any, id: string): Promise<{ r: any; threw: string }> => {
    const real = store.get;
    store.get = async (x: string, tx?: unknown) => {
      if (x === id) throw new Error("FR · the read failed (a planted fault)");
      return real.call(store, x, tx);
    };
    try {
      return { r: await W.buy(buyer, wk.id, [MISS_M1]), threw: "" };
    } catch (err) {
      return { r: null, threw: String((err as Error)?.message ?? err) };
    } finally {
      store.get = real;
    }
  };
  const before = await stateOf();
  const m = await failing(W.mdal.marketStore, wk.marketId);
  ok("FR.1 · ⭐ a purchase whose market read fails is refused as busy — the stake never moved, the same key may retry — never a throw (L6)",
    !m.threw && !!m.r && !m.r.ok && m.r.reason === "system_busy" && m.r.code === "BUSY", m.threw || J(m.r));
  ok("FR.1b · …and nothing moved: the buyer's balance, the week's count, its positions and its pool", J(await stateOf()) === J(before),
    J({ before, after: await stateOf() }));
  const w = await failing(dal.weekStore, wk.id);
  ok("FR.2 · ⭐ a purchase whose week read fails is refused the same way, never a throw",
    !w.threw && !!w.r && !w.r.ok && w.r.reason === "system_busy" && w.r.code === "BUSY", w.threw || J(w.r));
  ok("FR.2b · …and nothing moved", J(await stateOf()) === J(before), J({ before, after: await stateOf() }));
  const fine = await W.buy(buyer, wk.id, [MISS_M1]);
  ok("FR.3 · control: the reads answering again, the same buyer buys the ticket",
    fine.ok && (await bal(buyer)) === 49_000 && (await dal.weekStore.get(wk.id)).ticketCount === 1, J(fine.ok ? "sold" : fine));
  // The books close behind the cases: the week voids whole and refunds its one ticket, so the jackpot is untouched.
  await closed(wk.id);
  await sealRest(wk.id, start, ALL_VOID);
  await voided(wk.id);
}

// ═══ §9 · IN · an insider promoted mid-week ═════════════════════════════════════════════════════════════════════════
if (runs("IN")) section("§9 · IN · an insider promoted mid-week: the tickets they hold, and what they may still do (MR-10, MR-14, OD-12, MB-43)");
if (runs("IN")) {
  const start = W.weekStartAhead(ahead++);
  const wk = await openWeekAt(start);
  const [p, q, filler] = await people(3, 100_000);
  const deskHolder = await W.user({ balance: 100_000, passwordHash: HOLDER_HASH });
  const [win, loss, spare] = await bought(p, wk.id, [ALL_YES, MISS_M1, MISS_M1]);
  await bought(deskHolder, wk.id, [MISS_M1]);
  await W.sell(wk.id, 5, MISS_M1, [filler]);
  const block = await W.svc.millioneaPromotionBlock(p);
  ok("IN.1 · ⭐ OD-12 · an account holding a ticket in a week that has not settled is not made staff: the refusal names the week",
    typeof block === "string" && block.includes(wk.code), String(block));
  const src = readFileSync(join(ROOT, "src/app/admin/staff/actions.ts"), "utf8");
  const body = src.slice(src.indexOf("async function applyRoleChange("), src.indexOf("export async function setStaffRoleAction("));
  const asked = body.indexOf("await millioneaPromotionBlock(target.id)"), writes = body.indexOf("db.user.update(target.id, { role: newRole })");
  ok("IN.1b · ⭐ …and the Owner's staff role change asks it before it writes the role (both staff actions pass through that one function)",
    asked > 0 && writes > asked, J({ asked, writes }));
  ok("IN.2 · control: an account holding no live ticket may be made staff", (await W.svc.millioneaPromotionBlock(q)) === null);
  const deskRowsOf = async (u: string): Promise<Array<{ code: string; message: string }>> => {
    try {
      return (await houseBotEligibility(u, { context: "designate", actorId: OWNER })).blocking;
    } catch (err) {
      return [{ code: "THREW", message: String((err as Error)?.message ?? err) }];
    }
  };
  const deskRows = await deskRowsOf(deskHolder);
  const deskRow = deskRows.find((x) => x.code === "MILLIONEA_TICKET");
  ok("IN.9 · ⭐ a desk designation of an account holding a ticket in a week that has not settled is refused (OD-12's other half: the house-bot eligibility), the refusal naming the week",
    !!deskRow && /Millionea/i.test(deskRow.message) && deskRow.message.includes(wk.code), J(deskRows.map((x) => x.code)));
  // ⚠️ A FIXTURE, DECLARED: a promotion that slipped through (a database edit, or one made before OD-12 was enforced), to
  //    one of the seven staff roles.
  await W.setUserFields(p, { role: "MODERATOR" });
  const more = await W.buy(p, wk.id, [ALL_YES]);
  ok("IN.3 · ⭐ a holder made staff can buy no more tickets: refused as staff, nothing moved (MR-10)",
    !more.ok && more.reason === "millionea_staff_barred" && (await dal.weekStore.get(wk.id)).ticketCount === 9, J(more.ok ? "sold" : more));
  const cancel = await market.cashOutPosition(p, spare.positionId);
  ok("IN.4 · …and may still take their own money back: a ticket inside its free window cancels in full (it leaves the insider one ticket fewer, OD-12's aim)",
    cancel.ok, J(cancel));
  await closed(wk.id);
  const sealAt = new Date(start + 9 * DAY);
  const seal = await W.svc.sealQuestion({ weekId: wk.id, slot: 1, outcome: "YES", evidence: "Official result for event 1", officerId: p, now: sealAt });
  ok("IN.5 · ⭐ …cannot seal a question of a week they hold a ticket in (MR-14)", !seal.ok && /holds a ticket/.test(errOf(seal)), errOf(seal));
  await setRequireTwoOfficerResolution(true, OWNER);
  let byHolder: any, byReader: any;
  try {
    const s11 = await W.svc.sealQuestion({ weekId: wk.id, slot: 11, outcome: "YES", evidence: "Official result for reserve 1", officerId: SEALER, now: sealAt });
    if (!s11.ok) throw new Error(`IN: the seal of A1 was refused: ${s11.error}`);
    byHolder = await W.svc.confirmSeal({ weekId: wk.id, slot: 11, officerId: p, now: sealAt });
    byReader = await W.svc.confirmSeal({ weekId: wk.id, slot: 11, officerId: READER, now: sealAt });
  } finally {
    await setRequireTwoOfficerResolution(false, OWNER);
  }
  ok("IN.6 · ⭐ …and cannot give a seal its second signature while their ticket runs (MR-14's bar on the confirmation)",
    !byHolder.ok && /holds a ticket/.test(errOf(byHolder)), errOf(byHolder));
  ok("IN.6b · control: an officer holding no ticket confirms it", byReader.ok, errOf(byReader));
  await sealRest(wk.id, start);
  const r = await released(wk.id);
  const tw = await dal.ticketStore.get(win.ticketId), tl = await dal.ticketStore.get(loss.ticketId);
  ok("IN.7 · ⭐ at settlement their winning ticket is paid its full share and held for Compliance as a staff account (MB-43)",
    tw.won === true && tw.payout === r.week.sharePerTicket && tw.frozenReason === "staff account" && (await heldOf(p)), J({ won: tw.won, payout: tw.payout, frozen: tw.frozenReason }));
  ok("IN.7b · …and their losing ticket settles as any other: LOSS, nothing paid, nothing held", tl.status === "SETTLED" && tl.won === false && tl.payout === 0 && tl.frozenReason === null);
  ok("IN.8 · once the week has settled, nothing stands in the way of the promotion", (await W.svc.millioneaPromotionBlock(p)) === null);
  ok("IN.9b · control: …nor of the desk designation — its ticket settled, the account meets no Millionea row",
    !(await deskRowsOf(deskHolder)).some((x) => x.code === "MILLIONEA_TICKET" || x.code === "MILLIONEA_UNREADABLE"));
  await settle.releaseMaswaliShare({ ticketId: win.ticketId, officerId: OWNER, note: "the promotion review is closed" });
  await W.setUserFields(p, { role: "PLAYER" });
}

// ═══ §10 · RD · a reversed deposit funding a winner ═════════════════════════════════════════════════════════════════
if (runs("RD")) section("§10 · RD · a reversed deposit funding a winner: the ticket stays in the week; its share is paid and held for Compliance (MB-74, OD-07)");
if (runs("RD")) {
  const deposited = async (amount: number) => {
    const u = await W.user({ balance: amount });
    const providerRef = ref("DEP");
    const txnId = `txn_adv_${process.pid}_${++serial}`;
    const at = new Date().toISOString();
    // ⚠️ A FIXTURE, DECLARED: the CONFIRMED deposit row behind the world's seeded balance (the wallet and its ledger lines
    //    already hold the money), so the provider's reversal has a credited deposit to contradict.
    await W.db.txn.create({
      id: txnId, walletId: `wal_${u}`, userId: u, type: "DEPOSIT", status: "CONFIRMED", amount, fee: 0, taxWithheld: 0, balanceAfter: amount,
      currency: "TZS", provider: "MPESA", providerRef, msisdn: null, description: "Deposit · M-Pesa", positionId: null, amlReason: null,
      createdAt: at, updatedAt: at, completedAt: at,
    });
    return { u, providerRef, txnId };
  };
  const start = W.weekStartAhead(ahead++);
  const wk = await openWeekAt(start);
  const rev = await deposited(20_000), clean = await deposited(20_000), late = await deposited(20_000);
  const [filler] = await people(1, 50_000);
  const [tRev] = await bought(rev.u, wk.id, [ALL_YES]);
  const [tClean] = await bought(clean.u, wk.id, [ALL_YES]);
  const [tLate] = await bought(late.u, wk.id, [ALL_YES]);
  await W.sell(wk.id, 7, MISS_M1, [filler]);
  const heard = await wallet.settlePaymentWebhook({ providerRef: rev.providerRef, status: "FAILED" });
  const marked = await W.db.txn.findById(rev.txnId);
  ok("RD.0 · the provider's reversal of a credited deposit is marked for review, and nothing is clawed back by itself (the platform's rule)",
    !heard.handled && /contradicted/.test(heard.reason) && marked?.status === "CONFIRMED" && marked?.providerStatus === DEPOSIT_STATUS_REVIEW_MARK && (await bal(rev.u)) === 19_000,
    J({ heard, status: marked?.status, mark: marked?.providerStatus }));
  await closed(wk.id);
  const shut = await dal.weekStore.get(wk.id);
  const live = await dal.ticketStore.listForWeek(wk.id, { status: "LIVE" });
  ok("RD.2 · ⭐ the ticket the reversed money bought stays in the committed set: in the close's count and its Merkle root (MB-74, the commitment holds)",
    shut.ticketCount === 10 && live.some((t: any) => t.id === tRev.ticketId)
      && shut.ticketMerkleRoot === merkleRoot(live.map((t: any) => ({ ticketId: t.id, leaf: t.selectionsHash }))));
  await sealRest(wk.id, start);
  const r = await released(wk.id);
  const share = r.week.sharePerTicket;
  const tr = await dal.ticketStore.get(tRev.ticketId), tc = await dal.ticketStore.get(tClean.ticketId), tl = await dal.ticketStore.get(tLate.ticketId);
  ok("RD.1 · ⭐ the winner whose deposit was reversed is graded and credited the full share, and the share is HELD for Compliance (MB-74, OD-07)",
    tr.won === true && tr.score === 10 && tr.payout === share && tr.frozenReason === "deposit under review" && (await bal(rev.u)) === 19_000 + share && (await heldOf(rev.u)),
    J({ won: tr.won, frozen: tr.frozenReason, held: await heldOf(rev.u) }));
  ok("RD.3 · control: the winners whose deposits stand are paid the same share free, nothing held",
    tc.payout === share && tc.frozenReason === null && !(await heldOf(clean.u)) && tl.payout === share && tl.frozenReason === null && !(await heldOf(late.u)));
  const j0 = await jackpot();
  const f = await settle.forfeitMaswaliShare({ ticketId: tRev.ticketId, officerId: OWNER, typed: settle.FORFEIT_SHARE_WORD, reason: "the funding deposit was reversed" });
  ok("RD.4 · ⭐ Compliance forfeits it: the whole share leaves the wallet for the JACKPOT, never the house (OD-07), and the hold lifts",
    f.ok && (await bal(rev.u)) === 19_000 && (await jackpot()) - j0 === share && !(await heldOf(rev.u)), errOf(f));
  await wallet.settlePaymentWebhook({ providerRef: late.providerRef, status: "FAILED" });
  const tl2 = await dal.ticketStore.get(tLate.ticketId);
  knownRed("MB-74", "RD.5 · KNOWN-RED MB-74 · a reversal arriving AFTER the payout holds the share the reversed money may have bought, at once (the reversal is the trigger)",
    !!tl2.frozenReason || (await heldOf(late.u)), J({ frozen: tl2.frozenReason, held: await heldOf(late.u) }));
}

// ═══ §11 · TK · the winner-takeover pattern ═════════════════════════════════════════════════════════════════════════
if (runs("TK")) section("§11 · TK · the winner-takeover pattern: a winner's money leaves only to the account's own number, and a takeover is watched (MB-96)");
if (runs("TK")) {
  const start = W.weekStartAhead(ahead++);
  const wk = await openWeekAt(start);
  const [winner, filler] = await people(2, 50_000);
  await bought(winner, wk.id, [ALL_YES]);
  await W.sell(wk.id, 5, MISS_M1, [filler]);
  await closed(wk.id);
  await sealRest(wk.id, start);
  await released(wk.id);
  const afterWin = await bal(winner);
  const mine = String((await W.db.user.findById(winner))?.phoneE164 ?? "");
  const other = mine.slice(0, -1) + String((Number(mine.slice(-1)) + 1) % 10);
  const away = await wallet.withdraw(winner, { provider: "MPESA", amount: 10_000, msisdn: other });
  ok("TK.1 · ⭐ a winner's withdrawal to a number other than the account's own is refused, and nothing moves (E-215: no payout number is changed at a withdrawal)",
    !away.ok && (away as any).reason === "payout_destination_not_registered" && (await bal(winner)) === afterWin, J(away));
  const pw = await changePassword(winner, "", "Mlw-adversarial-takeover-2026");
  const home = await wallet.withdraw(winner, { provider: "MPESA", amount: 10_000, msisdn: mine });
  const alerts = await consoleRead.consoleAlerts(new Date());
  knownRed("MB-96", "TK.2 · KNOWN-RED MB-96 · a password changed after a Millionea credit, then a withdrawal attempt, raises a takeover alert for Compliance (an alert only: 2026-10-10 removed withdrawal holds)",
    pw.ok && alerts.some((x) => /takeover|password|withdraw/i.test(x.text)), J({ password: pw.ok, attempt: home.ok ? "sent" : (home as any).reason ?? home.code, alerts: alerts.length }));
}

// ═══ §12 · CC · both clock-change weekends ══════════════════════════════════════════════════════════════════════════
// Europe falls back on the last Sunday of October, the United States a week later, on the first Sunday of November (in
// 2026: 25 October and 1 November). §12's weeks are the next such pair still ahead of today — an open creates a market,
// whose resolution must be in the future — and §13's holiday week comes after them on the same DRIVE line.
const sundayOf = (y: number, month: number, dayOfMonth: number, step: 1 | -1) => {
  const d = new Date(Date.UTC(y, month, dayOfMonth, 9, 0));
  while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() + step);
  return d.getTime();
};
let clockYear = new Date().getUTCFullYear();
while (eatWeekAt(eatWeekStartMs(sundayOf(clockYear, 9, 31, -1)) + 7 * DAY, 1, "23:59") < Date.now() + DAY) clockYear++;
const CLOCK_WEEKS = { ukStart: eatWeekStartMs(sundayOf(clockYear, 9, 31, -1)), usStart: eatWeekStartMs(sundayOf(clockYear, 10, 1, 1)) };

if (runs("CC")) section("§12 · CC · both clock-change weekends: an event typed in its own zone is guarded on that day's offset (MB-30, MR-4, OD-09b)");
if (runs("CC")) {
  const { ukStart, usStart } = CLOCK_WEEKS;
  const day = (start: number, n: number) => eatDate(start + n * DAY);
  const withEvents = (start: number, over: Record<number, { local: string; zone: string }>) =>
    W.questions(start).map((q: any, i: number) => (over[i + 1] ? { ...q, eventLocalStart: over[i + 1].local, eventZone: over[i + 1].zone } : q));
  const slotOf = async (weekId: string, slot: number) => (await dal.questionStore.listForWeek(weekId)).find((q: any) => q.slot === slot);
  const openAt = (weekId: string, start: number) => W.svc.openWeek({ weekId, officerId: DRAFTER, guarantee: money.guaranteeReader, now: new Date(start + MIN) });
  ok("CC.0 · the two weeks are the European and the American fall-back weeks, a week apart", usStart === ukStart + 7 * DAY, `${day(ukStart, 6)} · ${day(usStart, 6)}`);
  const uk = await drafted(ukStart, { visibility: "DRIVE", qs: withEvents(ukStart, {
    1: { local: `${day(ukStart, 4)}T16:00`, zone: "Europe/London" }, 2: { local: `${day(ukStart, 5)}T15:00`, zone: "Europe/London" },
    11: { local: `${day(ukStart, 6)}T14:00`, zone: "Europe/London" },
  }) });
  ok("CC.1 · the Friday before Europe's change, 16:00 in London is read in BST: 15:00 UTC — 18:00 EAT, the close itself",
    (await slotOf(uk.id, 1)).eventStartsAt === `${day(ukStart, 4)}T15:00:00.000Z`, (await slotOf(uk.id, 1)).eventStartsAt);
  const ukRefused = await openAt(uk.id, ukStart);
  ok("CC.2 · ⭐ …so the open is refused: sales must close 30 minutes before it (a GMT reading, an hour later, would have passed)",
    !ukRefused.ok && /at least 30 minutes before the first event/.test(errOf(ukRefused)), errOf(ukRefused));
  ok("CC.3 · ⭐ a void deadline is 48 absolute hours across the change: Saturday 15:00 London (BST) → Monday 14:00 UTC",
    (await slotOf(uk.id, 2)).voidDeadlineAt === `${day(ukStart, 7)}T14:00:00.000Z`, (await slotOf(uk.id, 2)).voidDeadlineAt);
  ok("CC.3b · …and one that would pass the week's final deadline is capped there: Sunday 14:00 London (GMT) + 48 h → Monday 23:59 EAT",
    (await slotOf(uk.id, 11)).voidDeadlineAt === new Date(eatWeekAt(ukStart + 7 * DAY, 1, "23:59")).toISOString(), (await slotOf(uk.id, 11)).voidDeadlineAt);
  const ukEdit = await W.svc.editDraftQuestion({ weekId: uk.id, slot: 1, changes: { eventLocalStart: `${day(ukStart, 4)}T16:30`, eventZone: "Europe/London" }, officerId: DRAFTER });
  await W.svc.attestParity({ weekId: uk.id, officerId: READER });
  const ukOpen = await openAt(uk.id, ukStart);
  ok("CC.4 · …moved to 16:30 London (15:30 UTC: exactly the buffer), the week opens — the buffer is inclusive", ukEdit.ok && ukOpen.ok, `${errOf(ukEdit)} ${errOf(ukOpen)}`);
  if (ukOpen.ok) {
    await closed(uk.id);
    await sealRest(uk.id, ukStart, ALL_VOID);
    await voided(uk.id);
  }
  const us = await drafted(usStart, { visibility: "DRIVE", qs: withEvents(usStart, { 1: { local: `${day(usStart, 4)}T11:00`, zone: "America/New_York" } }) });
  ok("CC.5 · the Friday before the American change, 11:00 in New York is read in EDT: 15:00 UTC, the close itself",
    (await slotOf(us.id, 1)).eventStartsAt === `${day(usStart, 4)}T15:00:00.000Z`, (await slotOf(us.id, 1)).eventStartsAt);
  const usRefused = await openAt(us.id, usStart);
  ok("CC.6 · ⭐ …so that open is refused too (an EST reading would have passed)", !usRefused.ok && /at least 30 minutes before the first event/.test(errOf(usRefused)), errOf(usRefused));
  await W.svc.editDraftQuestion({ weekId: us.id, slot: 1, changes: { eventLocalStart: `${day(usStart, 4)}T11:30`, eventZone: "America/New_York" }, officerId: DRAFTER });
  await W.svc.editDraftQuestion({ weekId: us.id, slot: 2, changes: { eventLocalStart: `${day(usStart, 4)}T15:30`, eventZone: "Europe/London" }, officerId: DRAFTER });
  ok("CC.7 · ⭐ after Europe's change, that Friday's 15:30 in London is GMT: 15:30 UTC (a stale BST reading would put it before the close)",
    (await slotOf(us.id, 2)).eventStartsAt === `${day(usStart, 4)}T15:30:00.000Z`, (await slotOf(us.id, 2)).eventStartsAt);
  await W.svc.attestParity({ weekId: us.id, officerId: READER });
  const usOpen = await openAt(us.id, usStart);
  ok("CC.8 · …and the week opens with both events exactly the buffer after its close", usOpen.ok, errOf(usOpen));
  const twice = await W.svc.createWeek({ weekStartMs: usStart + 7 * DAY, visibility: "DRIVE", officerId: DRAFTER, now: new Date(usStart + 4 * DAY),
    questions: withEvents(usStart + 7 * DAY, { 1: { local: `${day(usStart, 6)}T01:30`, zone: "America/New_York" } }) });
  ok("CC.9 · ⛔ 01:30 in New York on the American change's Sunday happens twice: the draft is refused, never guessed", !twice.ok && /happens twice/.test(errOf(twice)), errOf(twice));
  if (usOpen.ok) {
    await closed(us.id);
    await sealRest(us.id, usStart, ALL_VOID);
    await voided(us.id);
  }
}

// ═══ §13 · HF · a holiday Friday ════════════════════════════════════════════════════════════════════════════════════
if (runs("HF")) section("§13 · HF · a holiday Friday: the week runs, its close falls on the holiday, and the officer may bring it forward (MB-85, OD-27; a skipped week is §2's week 4)");
if (runs("HF")) {
  /** The first fixed-date Tanzanian public holiday that falls on a Friday, in a week starting at least `fromMs`. */
  const holidayFriday = (fromMs: number): { date: string; noonMs: number } => {
    const fixed = ["01-01", "01-12", "04-07", "04-26", "05-01", "07-07", "08-08", "10-14", "12-09", "12-25", "12-26"];
    const y0 = new Date(fromMs).getUTCFullYear();
    for (let y = y0; y < y0 + 20; y++) {
      for (const md of fixed) {
        const noonMs = Date.parse(`${y}-${md}T09:00:00.000Z`);
        if (new Date(noonMs + 3 * HOUR).getUTCDay() === 5 && eatWeekStartMs(noonMs) >= fromMs) return { date: `${y}-${md}`, noonMs };
      }
    }
    throw new Error("HF: no holiday Friday found in twenty years");
  };
  // Three weeks ahead at least (its tickets are bought on the real clock), and after §12's weeks on the DRIVE line.
  const holiday = holidayFriday(Math.max(eatWeekStartMs(Date.now()) + 3 * 7 * DAY, CLOCK_WEEKS.usStart + 7 * DAY));
  const hs = eatWeekStartMs(holiday.noonMs);
  const hw = await drafted(hs, { visibility: "DRIVE" });
  ok("HF.1 · the holiday week drafts with its template close ON the holiday: Friday 18:00 EAT",
    hw.closesAt === new Date(eatWeekAt(hs, 5, "18:00")).toISOString() && eatDate(Date.parse(hw.closesAt)) === holiday.date, `${holiday.date} · ${hw.closesAt}`);
  // THE HOLIDAY REVIEW reads the Owner's list of public holidays (`maswali-holidays.ts`), which is empty until recorded.
  const reviewOf = () => consoleRead.consoleWeekDetail(hw.id, new Date(hs - DAY));
  const quiet = await reviewOf();
  ok("HF.2a · control: the Owner's holiday list is empty by default, so the checklist names no holiday",
    holidays.getMaswaliHolidays().dates.length === 0 && !(quiet?.warnings ?? []).some((x) => /holiday/i.test(x)), J(quiet?.warnings));
  const bad = await holidays.saveMaswaliHolidays([holiday.date, `${holiday.date.slice(0, 4)}-02-30`], OWNER);
  ok("HF.2b · ⛔ the list is validated: a date that is not on the calendar refuses the whole save, and nothing changes",
    !bad.ok && /not a calendar date/.test(errOf(bad)) && holidays.getMaswaliHolidays().dates.length === 0, errOf(bad));
  const saved = await holidays.saveMaswaliHolidays([holiday.date], OWNER);
  const detail = await reviewOf();
  ok("HF.2 · ⭐ the builder's pre-open checklist names the public holiday its close falls on (the holiday review, MB-85) — a warning, never one of the open's refusals",
    saved.ok && (detail?.warnings ?? []).some((x) => x.includes(holiday.date) && /holiday/i.test(x)) && !(detail?.problems ?? []).some((x) => /holiday/i.test(x)),
    J({ saved: errOf(saved), warnings: detail?.warnings, problems: detail?.problems }));
  const recorded = await auditRows("MaswaliHolidays", "global", "maswali.holidays.updated");
  ok("HF.2c · …and the Owner's edit is audited: the dates it set beside the ones it replaced",
    recorded.some((e: any) => J(e.payload?.after?.dates) === J([holiday.date]) && J(e.payload?.before?.dates) === J([])), J(recorded.map((e: any) => e.payload)));
  const o = await W.svc.openWeek({ weekId: hw.id, officerId: DRAFTER, guarantee: money.guaranteeReader, now: new Date(hs + MIN) });
  ok("HF.2d · ⭐ …and the week opens on its holiday close: the review warns, the open never refuses (OD-27: every week runs)", o.ok, errOf(o));
  if (!o.ok) throw new Error(`HF: the holiday week did not open: ${o.error}`);
  const wk = o.week;
  const [h1, h2] = await people(2, 50_000);
  const [early] = await bought(h1, wk.id, [MISS_M1]);
  const eve = new Date(eatWeekAt(hs, 4, "18:00")).toISOString();
  const mv = await W.svc.moveClose({ weekId: wk.id, toCloseAt: eve, officerId: DRAFTER, now: new Date(hs + HOUR) });
  const m = await W.mdal.marketStore.get(wk.marketId);
  ok("HF.3 · ⭐ the officer brings the close forward to the holiday's eve (Thursday 18:00 EAT): the week and its market's cutoff follow (R-WEEK)",
    mv.ok && mv.week.closesAt === eve && m?.selectionClosedAt === eve, errOf(mv));
  const c = await market.cashOutPosition(h1, early.positionId);
  ok("HF.3b · …and a ticket sold before the move keeps its free-cancel window: cancelled in full (MB-28)", c.ok, J(c));
  const sold = await W.buy(h2, wk.id, [MISS_M1]);
  ok("HF.3c · …the week sells on until its new close", sold.ok, J(sold.ok ? "sold" : sold));
  const tooLate = await W.svc.moveClose({ weekId: wk.id, toCloseAt: new Date(eatWeekAt(hs, 6, "12:00")).toISOString(), officerId: DRAFTER, now: new Date(hs + 2 * HOUR) });
  ok("HF.4 · ⛔ moving it past the first event less its buffer is refused, and the refusal names the question (MR-4)",
    !tooLate.ok && /before the first event[.] M1 starts at /.test(errOf(tooLate)), errOf(tooLate));
  const d0 = await driveJackpot();
  await closed(wk.id);
  await sealRest(wk.id, hs);
  const r = await released(wk.id);
  ok("HF.5 · the holiday week settles in its own line: no winner, its 1,000 of sales roll to the DRIVE jackpot", r.week.state === "SETTLED" && (await driveJackpot()) - d0 === 1_000, `${(await driveJackpot()) - d0}`);
  const cleared = await holidays.saveMaswaliHolidays([], OWNER);
  if (!cleared.ok) throw new Error(`HF: the holiday list could not be cleared: ${cleared.error}`);
}

// ═══ §14 · DL · the week's deadlines at the open ════════════════════════════════════════════════════════════════════
if (runs("DL")) section("§14 · DL · a week's deadlines are its frozen rules': the open recomputes them from its snapshot (OD-09b, MB-75; lane L's review, finding 8)");
if (runs("DL")) {
  const cfgMod = await import("../../src/lib/server/maswali-config.ts");
  const { questionSetHash } = await import("../../src/lib/maswali-commitment.ts");
  const s1 = W.weekStartAhead(ahead++), s2 = W.weekStartAhead(ahead++);
  const d1 = await drafted(s1), d2 = await drafted(s2);
  const voidsOf = async (weekId: string) => (await dal.questionStore.listForWeek(weekId)).map((q: any) => q.voidDeadlineAt as string);
  const drafted1 = await voidsOf(d1.id);
  // The control first: drafted and opened on the same rules, a week keeps the deadlines it was drafted with.
  const o1 = await opened(d1, s1);
  ok("DL.0 · control: a week opened on the rules it was drafted with keeps every deadline it was drafted with, and records no re-freeze",
    o1.finalDeadlineAt === d1.finalDeadlineAt && J(await voidsOf(o1.id)) === J(drafted1) && (await weekAudit(o1.id, "maswali.week.deadlines_refrozen", 5)).length === 0,
    J({ drafted: d1.finalDeadlineAt, opened: o1.finalDeadlineAt }));
  await closed(o1.id);
  await sealRest(o1.id, s1, ALL_VOID);
  await voided(o1.id);
  // THE EDIT BETWEEN THE DRAFT AND THE OPEN: the Owner shortens the void deadline and moves the final deadline, after the
  // second week was drafted on the old rules. Put back whatever happens.
  const rules0 = cfgMod.getMaswaliConfig();
  const drafted2 = await voidsOf(d2.id);
  const edit = await cfgMod.saveMaswaliConfig({ voidDeadlineHours: 24, finalDeadlineWeekday: 2, finalDeadlineAt: "12:00" }, OWNER);
  if (!edit.ok) throw new Error(`DL: the rules could not be edited: ${edit.error}`);
  let o2: any;
  try {
    o2 = await opened(d2, s2);
  } finally {
    const back = await cfgMod.saveMaswaliConfig({ voidDeadlineHours: rules0.voidDeadlineHours, finalDeadlineWeekday: rules0.finalDeadlineWeekday, finalDeadlineAt: rules0.finalDeadlineAt }, OWNER);
    if (!back.ok) throw new Error(`DL: the rules could not be put back: ${back.error}`);
  }
  const frozen = W.svc.frozenRules(o2);
  const finalMs = eatWeekAt(s2 + 7 * DAY, 2, "12:00");
  const q2 = await dal.questionStore.listForWeek(o2.id);
  ok("DL.1 · ⭐ the opened week's final deadline is its snapshot's — Tuesday 12:00 EAT of the results week, not the Monday 23:59 it was drafted with",
    frozen?.finalDeadlineWeekday === 2 && frozen.finalDeadlineAt === "12:00" && o2.finalDeadlineAt === new Date(finalMs).toISOString() && d2.finalDeadlineAt !== o2.finalDeadlineAt,
    J({ drafted: d2.finalDeadlineAt, opened: o2.finalDeadlineAt }));
  const due = q2.map((q: any) => new Date(Math.min(Date.parse(q.eventStartsAt) + 24 * HOUR, finalMs)).toISOString());
  ok("DL.2 · ⭐ …and every question's void deadline is the snapshot's: 24 hours after its event, capped at that final deadline — never the drafted 48",
    frozen?.voidDeadlineHours === 24 && J(q2.map((q: any) => q.voidDeadlineAt)) === J(due) && J(drafted2) !== J(due), J({ drafted: drafted2.slice(0, 2), opened: q2.slice(0, 2).map((q: any) => q.voidDeadlineAt) }));
  ok("DL.3 · the week's market resolves at that same final deadline", (await W.mdal.marketStore.get(o2.marketId))?.resolutionAt === o2.finalDeadlineAt);
  ok("DL.4 · ⭐ the commitment covers the deadlines the week runs on: its question-set hash is the hash of its stored questions",
    o2.questionSetHash === questionSetHash(q2), `${o2.questionSetHash} · ${questionSetHash(q2)}`);
  const refrozen = await weekAudit(o2.id, "maswali.week.deadlines_refrozen");
  ok("DL.5 · the re-freeze is audited, naming what moved: the final deadline and all fifteen void deadlines",
    refrozen.length === 1 && refrozen[0].payload?.finalDeadlineAt?.to === o2.finalDeadlineAt && refrozen[0].payload?.voidDeadlines?.length === 15,
    J(refrozen.map((e: any) => ({ final: e.payload?.finalDeadlineAt, voids: e.payload?.voidDeadlines?.length }))));
  await closed(o2.id);
  await sealRest(o2.id, s2, ALL_VOID);
  await voided(o2.id);
}

// ═══ §14b · SN · a refused stop names the Owner's next act ══════════════════════════════════════════════════════════
if (runs("SN")) section("§14b · SN · a refused stop names the Owner's next act — here no week is on sale and none is being decided, so the short-notice exception is closed (MR-30, OD-03; the S7 review, round 2)");
if (runs("SN")) {
  // P runs and its results are decided whole (it sells nothing and voids), so no week is on sale and none is being
  // decided; Q is the next week to open, asked inside its week of notice. Every earlier PUBLIC week is terminal: LIVE.
  const sP = W.weekStartAhead(ahead++), sQ = sP + 7 * DAY, sR = sP + 14 * DAY;
  ahead += 2;
  const P = await openWeekAt(sP);
  const Q = await drafted(sQ);
  const stop = (weekId: string, now: Date) =>
    W.svc.sunsetMaswali({ weekId, ownerId: OWNER, typed: W.svc.SUNSET_WORD, reason: "the Owner stops Millionea (adversarial suite)", now });
  const isFinal = async (weekId: string) => (await dal.weekStore.get(weekId)).isFinal === true;
  await closed(P.id);
  await sealRest(P.id, sP, ALL_VOID);
  await voided(P.id);
  const inNotice = new Date(Date.parse(Q.opensAt) - 2 * DAY);
  ok("SN.0 · the line is LIVE: P has voided, nothing is on sale or being decided, and Q is the next week to open, inside its week of notice",
    (await W.svc.sunsetState()).kind === "LIVE" && (await dal.weekStore.get(P.id)).state === "VOIDED" && Date.parse(Q.opensAt) - inNotice.getTime() < 7 * DAY);
  const shortNotice = await stop(Q.id, inNotice);
  ok("SN.1 · ⭐ the next week inside its week of notice is refused, and the refusal names the Owner's next act: make it final once it opens, or a week a full week ahead",
    !shortNotice.ok && /full week ahead/.test(errOf(shortNotice)) && /To stop Millionea, make week /.test(errOf(shortNotice)) && /once it opens/.test(errOf(shortNotice))
      && errOf(shortNotice).includes(Q.code) && !(await isFinal(Q.id)), errOf(shortNotice));
  const decided = await stop(P.id, inNotice);
  ok("SN.1b · ⭐ …and a week already decided is refused the same way: the refusal names the next week to make final, never stops at the week's state",
    !decided.ok && /already VOIDED/.test(errOf(decided)) && /To stop Millionea/.test(errOf(decided)) && errOf(decided).includes(Q.code), errOf(decided));
  // The first act it named, taken: Q opens, and the week on sale is made final at once.
  const o = await W.svc.openWeek({ weekId: Q.id, officerId: DRAFTER, guarantee: money.guaranteeReader, now: new Date(Date.parse(Q.opensAt) + MIN) });
  if (!o.ok) throw new Error(`SN: week Q did not open: ${o.error}`);
  const atOnce = await stop(Q.id, new Date(Date.parse(Q.opensAt) + 2 * MIN));
  ok("SN.2 · control: the act it named lands — Q, open, is made final at once as the week on sale", atOnce.ok && atOnce.week.isFinal === true && atOnce.week.state === "OPEN", errOf(atOnce));
  const R = await drafted(sR);
  const another = await stop(R.id, new Date(Date.parse(Q.opensAt) + 3 * MIN));
  ok("SN.3 · ⭐ while a final week stands, another stop is answered with that first — nothing more is needed — never a rule or a week on sale it no longer concerns",
    !another.ok && /already the final week/.test(errOf(another)) && /nothing more is needed/.test(errOf(another)) && errOf(another).includes(Q.code) && !(await isFinal(R.id)),
    errOf(another));
  // ⚠️ A FIXTURE, DECLARED (as §15's): the Owner's order withdrawn, which no act can do, so the line is LIVE again for §15.
  //    R stays a draft that can never open once a later week has (MR-3), as §2's skipped week.
  await dal.weekStore.patch(Q.id, { isFinal: false });
  await closed(Q.id);
  await sealRest(Q.id, sQ, ALL_VOID);
  await voided(Q.id);
}

// ═══ §15 · SU · the sunset after a close ═══════════════════════════════════════════════════════════════════════════
if (runs("SU")) section("§15 · SU · the sunset after a close: a week whose results are being decided is never made final; the next week may be, inside its week (MR-30, OD-03)");
if (runs("SU")) {
  // THE LEAD'S DECISION OF 2026-10-18: the 13% fee is taken from a sunset payout and never from a rollover, so a stop
  // ordered once a week's results are in view could choose who is paid. Every earlier PUBLIC week of this run has settled
  // or voided (§2's and §14b's skipped drafts can never open), so no final week stands and A is the newest week to open.
  const sA = W.weekStartAhead(ahead++), sB = sA + 7 * DAY, sC = sA + 14 * DAY;
  ahead += 2;
  const A = await openWeekAt(sA);
  const B = await drafted(sB), C = await drafted(sC);
  const stop = (weekId: string, now: Date) =>
    W.svc.sunsetMaswali({ weekId, ownerId: OWNER, typed: W.svc.SUNSET_WORD, reason: "the Owner stops Millionea (adversarial suite)", now });
  const isFinal = async (weekId: string) => (await dal.weekStore.get(weekId)).isFinal === true;
  ok("SU.0 · the line is LIVE: no final week stands", (await W.svc.sunsetState()).kind === "LIVE");
  const pastClose = new Date(Date.parse(A.closesAt) + MIN);
  const unstamped = await stop(A.id, pastClose);
  ok("SU.1 · ⛔ a week left OPEN past its close (no tick has stamped it) is not on sale: refused as closed, and not made final",
    !unstamped.ok && /sales have closed/.test(errOf(unstamped)) && !(await isFinal(A.id)), errOf(unstamped));
  const c = await W.svc.closeWeek({ weekId: A.id, now: pastClose });
  if (!c.ok) throw new Error(`SU: week A did not close: ${c.error}`);
  const shut = await stop(A.id, new Date(Date.parse(A.closesAt) + HOUR));
  ok("SU.2 · ⭐ a CLOSED week is refused: its results are being decided, so a stop could choose who is paid with them in view — it settles under its own rules, and the refusal names the next week to make final instead",
    !shut.ok && /results are being decided/.test(errOf(shut)) && /rolls over as always/.test(errOf(shut)) && errOf(shut).includes(B.code) && !(await isFinal(A.id)), errOf(shut));
  const sealAt = new Date(sA + 5 * DAY + 12 * HOUR);
  await sealSlots(A.id, [1], {}, sealAt);
  const grading = await stop(A.id, new Date(sealAt.getTime() + MIN));
  ok("SU.3 · ⭐ a RESOLVING week is refused the same way",
    (await dal.weekStore.get(A.id)).state === "RESOLVING" && !grading.ok && /results are being decided/.test(errOf(grading)) && !(await isFinal(A.id)), errOf(grading));
  // Wednesday of B's week: B has not opened yet, and C — the week after it — opens inside a week.
  const midB = new Date(sB + 2 * DAY);
  const laterDraft = await stop(C.id, midB);
  ok("SU.4 · ⛔ a later draft inside its week of notice is still refused: only the next week to open may be made final at shorter notice (OD-03)",
    Date.parse(C.opensAt) - midB.getTime() < 7 * DAY && !laterDraft.ok && /full week ahead/.test(errOf(laterDraft)) && errOf(laterDraft).includes(B.code) && !(await isFinal(C.id)),
    errOf(laterDraft));
  const nextDraft = await stop(B.id, midB);
  ok("SU.5 · ⭐ …and after the refusals the next week to open is made final inside its week: the Owner's stop takes effect from it",
    nextDraft.ok && nextDraft.week.isFinal === true && (await W.svc.sunsetState()).kind === "ENDING", errOf(nextDraft));
  const ordered = await weekAudit(B.id, "maswali.sunset.ordered");
  ok("SU.5b · …recorded as a compliance row naming its basis: the next week, after a close", ordered.length === 1 && ordered[0].payload?.basis === "NEXT_AFTER_CLOSE",
    J(ordered.map((e: any) => e.payload)));
  // ⭐ (the lead, 2026-10-18; the S6 legal review, round 2): a FINAL week opens no earlier than the time it was announced
  //    with — the hub and the home card name it from the moment it is set, and an early press would cut that notice.
  const early = await W.svc.openWeek({ weekId: B.id, officerId: DRAFTER, guarantee: money.guaranteeReader, now: new Date(Date.parse(B.opensAt) - HOUR) });
  ok("SU.5c · ⛔ the final week cannot open before its announced time, and stays a draft",
    !early.ok && /final week, announced to open/.test(errOf(early)) && (await dal.weekStore.get(B.id)).state === "DRAFT", errOf(early));
  // ⚠️ A FIXTURE, DECLARED: the Owner's order withdrawn, which no act can do, so the line is LIVE again for the last case:
  //    a week on sale with no final week standing.
  await dal.weekStore.patch(B.id, { isFinal: false });
  const onSale = await W.svc.openWeek({ weekId: B.id, officerId: DRAFTER, guarantee: money.guaranteeReader, now: new Date(midB.getTime() + MIN) });
  if (!onSale.ok) throw new Error(`SU: week B did not open: ${onSale.error}`);
  const atOnce = await stop(B.id, new Date(midB.getTime() + 2 * MIN));
  ok("SU.6 · control: the week ON SALE, no result known, is made final at once", atOnce.ok && atOnce.week.isFinal === true && atOnce.week.state === "OPEN", errOf(atOnce));
  // The books close behind the cases: both weeks sold nothing and void whole, so the line's jackpot is untouched.
  await sealRest(A.id, sA, ALL_VOID);
  await voided(A.id);
  await closed(B.id);
  await sealRest(B.id, sB, ALL_VOID);
  await voided(B.id);
}

// ═══ §16 · the invariants and the books ═════════════════════════════════════════════════════════════════════════════
if (runs("INV")) section("§16 · the invariants and the books, over everything above");
if (runs("INV")) {
  const inv = await checkMaswaliInvariants();
  ok("INV.1 · ⭐ every pool at 0, every week's columns close, each jackpot equals its weeks and forfeits, the guarantee covers", inv.ok, J(inv.problems));
  if (W.onPostgres) {
    const tb = await trialBalance();
    ok("INV.2 · ⭐ (Postgres) the trial balance reconciles: no drifting wallet, no imbalanced group",
      tb.ok && tb.driftingWallets === 0 && tb.imbalancedGroups.length === 0, J({ ok: tb.ok, drift: tb.driftingWallets, groups: tb.imbalancedGroups.length }));
    // ⚠️ `strpos`, not LIKE: an underscore in a LIKE pattern matches any character, and escaping it needs a backslash.
    const groups = (await W.prisma()!.$queryRawUnsafe(
      `SELECT COUNT(DISTINCT "groupId")::int AS n FROM "LedgerEntry" WHERE strpos("groupId", 'maswali_') = 1`)) as any[];
    const rows = (await W.prisma()!.$queryRawUnsafe(
      `SELECT "groupId", SUM("amount")::text AS s FROM "LedgerEntry" WHERE strpos("groupId", 'maswali_') = 1 GROUP BY "groupId" HAVING SUM("amount") <> 0`)) as any[];
    ok("INV.3 · (Postgres) every Millionea ledger group — and there are many — sums to exactly 0", Number(groups[0]?.n) > 50 && rows.length === 0, J({ groups: groups[0]?.n, bad: rows.slice(0, 3) }));
  }
}

console.log(`${LF}KNOWN-RED (${known}) on ${STORE}:${knownList.map((x) => `${LF}  · ${x}`).join("")}`);
console.log(`${LF}@@SUMMARY ${JSON.stringify({ pass, fail, known, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
