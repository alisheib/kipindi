/**
 * test:maswali-notify — A WEEK'S NOTICES, ON BOTH STORES (MASWALI-BUILD S6; MASWALI-PLAN §7b S6 item 2, MB-68, MB-11,
 * MB-24, MB-28, MB-44, MB-93, OD-25).
 *
 *   npx tsx scripts/maswali-notify.test.mts     (npm run test:maswali-notify)
 *
 * Every week and ticket goes through the product's own doors (the money world: `purchaseMaswaliTickets`, the free cancel,
 * `moveClose`, `closeWeek`, `sealQuestion`, `confirmSeal`, `correctSeal`, the release, `voidWeek`, the sunset), and every
 * notice is read back from the bell, the outbox and the SMS rows — never from the code that wrote it.
 * ⭐ EVERY SECOND RUN IS MADE OUTSIDE `notify()`'s 90-SECOND DUPLICATE WINDOW (the review's MEDIUM 4): the rows a first run
 * wrote are aged past it first (`ageNotices`), so "a second run sends nothing" proves the notice's own key, never the
 * window. Remove the key from `once()` and those cases go red.
 *   §1 the receipt, once per purchase — a replay sends none, a refused purchase none · a moved close, once per move
 *   §2 the free cancel, once
 *   §3 the close and a reserve's void, once to each holder and to nobody else · a reserve void corrected back to a result
 *      (reinstated) and a YES↔NO correction, each told once, the second correction of one question told again
 *   §4 ⭐ the result: winners first, each SMS right after its winner; a winner whose bell write failed still gets the SMS
 *      (its own key) and the reconcile then writes the bell, nothing else; the ladder (no review, no later week's figure);
 *      the letter to a confirmed address only; one SMS each; a second run sends nothing
 *   §5 ⭐ the desk list (MB-93): who no notice reached, with what was sent; the 24-hour alert; only recent weeks read; a
 *      seen mark and a delivered receipt each take a winner off
 *   §6 the credit before each winner's SMS (MB-93): a credit that would spend the codes' credit holds them, the bell and
 *      letter still go, the desk's recorded call (typed, Compliance) takes a winner off, and the reconcile sends the held
 *      SMS once the credit returns · the float check runs BEFORE the result is told (MB-11) · the SMS's own rules · two
 *      batches for one winner at once send ONE message (its row reserves it), and each store twin refuses a second row
 *   §7 the rollover, to holders only: its figure and the week it goes into — left out for a reader on a break and for an
 *      account that cannot sign in (MB-44)
 *   §8 ⭐ a week void sealed one void at a time: a two-officer void told once confirmed; told while gradable, silent once
 *      certain; a correction that makes the week gradable again catches the muted void up, and the reinstated question is
 *      told once its second officer confirms; the owed refund's own row, no notice before the money, one after
 *   §9 accounts that cannot sign in (OD-13): a paid winner told the team pays it, a held winner told as a VERDICT (never a
 *      gold WIN), a loser told plainly — each with its letter to the address on file and its SMS · a winner holding both
 *      paid and held shares · on Postgres, a week whose lease another process holds is told by nobody, then by the reconcile
 *   §10 CONTROL · a poll bet's own notice, exactly as the poll writes it — and no poll notice on any ticket holder
 *   §11 ⭐ never inside a money transaction: every run recorded, at its launch, that no lock was held — and the witness
 *      sees a run launched inside one
 *   §12 the final sunset week: the week's highest score shares the jackpot, and the notices say so (MR-30)
 *   §13 exactly once across the run, three languages, every Millionea row through its push tag, the registry against the
 *      code, the invariants
 * Round 4 (the independent review of round 3's head): 1.9 a move whose record never landed (L4) · 6.7b the float compared once
 * (L2) · 6.11b–c a batch's own rows told from another process's (L5) · 8.7b–c a letter that may have been delivered is
 * never sent again, a refusal by its kind (M6) · 8.10 a letters' read cut short read per holder (L1) · 9.0a2–c on
 * Postgres, a week skipped for another process's lease is tried again at the next tick, its float compared first (M5,
 * L2) · 9.8 the channel closed and NOT_CONFIGURED complete with their reason (A12) · 13.7 the lease read strictly (L3).
 * Round 5 (the independent review of round 4's head): 1.9 a stored close no record reaches tells nobody (L4) · 8.7d–f a letter's
 * attempt recorded before it is sent, the newest record deciding, no send without a recorded attempt (LOW 12) · 8.10c the
 * read limit a suite's seam only (LOW 15) · 9.0a2 no float read while another process holds the lease (L2 with M5) ·
 * 9.0d on Postgres, a lease read that fails tells nobody (L3) · 12.3 the final week's winner SMS on a rail that is not
 * configured completes with its reason (A12, beyond the unit).
 * Round 7 (the lead's decision on M2): 8.7b a letter the provider may have taken is not yet called gone · 8.11a–d the
 * provider's own search resolves it — unread (unresolved, listed on the console), absent (sent once more), absent again
 * (never again), found (confirmed, the run complete).
 * Round 17 (the independent review of rounds 13–16): 1.0 two launches of one week's result, and of its refund, hand back
 * one run and never throw (B1) · §11b a week's result and its refund each launched again in one process — by the commit, the
 * tick's reconcile and directly — send each holder's letter once (B1) · §11c a winner whose letter records cannot be read
 * gets no letter now and leaves the run owed; once they read, the reconcile sends it once (B2) · the child compiles again:
 * 8.7g's slice and 8.11d's run no longer reuse two names already taken in §8, and 8.7f reads round 8's send (H1) ·
 * 8.11g2 an officer's check closes the letter it listed on the holder's own record, so a later "absent" sends nothing
 * (M5) · §11d the check never runs beside the week's notice: refused while its run goes (11d.1), a launch while it holds
 * the week skipped (11d.2–3), an unreadable holder refusing it (11d.4), only uncertain letters closed (11d.5), and on
 * Postgres another process's lease refusing it (11d.6) (M5) · 13.7 re-pinned (the check's own strict lease) · 13.9 the
 * integrity card says what becomes of a listed letter (M5) · 13.8 the provider metadata's doc names the digest (L1).
 * S6-NOTICES (the lane-N merge review's LOWs, 2026-10-22): 8.11f2 a letter whose search can never be asked is counted by
 * that cause — on the run, on the card's row and in its opened list, and a run whose letters changed cause records so (L-3)
 * · 8.11g3 and 11d.5b the check's answer says how many letters it closed (L-4) · 11c.1b–2b the card lists a week whose
 * holders' letter records could not be read, until they read (L-2) · 11d.5b a resend still owed is listed by its cause (L-3)
 * · §11e the card's words rendered — one sentence a cause, each letter with its holder, tag and attempts, a page at a time;
 * the officer's action answers with the check's own note (L-2, L-3, L-4) · 13.9 re-pinned to the card's own words.
 * S6-NOTICES 6 (M-2, the lead's ruling 2): §11f a letter the provider refused as often as the cap allows is sent by no run
 * again, counted capped, the run complete, listed on the card and closed by the officer's check (11f.0–11f.3); the provider
 * down, a run sends one probe — never to a holder with no address — and holds the rest back with no attempt and none of
 * their refusals used, the run owed, until the reconcile sends each once (11f.4–11f.8); the card's two sentences (11f.9).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
process.env.SESSION_SECRET ??= "maswali-notify-session-secret-0123456789abcdef";
// The week timer stays off: every close, seal and release here is run on purpose.
process.env.MASWALI_SCHEDULER = "false";
// The letters are read back from the outbox (`emailOutbox`), never from the log.
process.env.EMAIL_OUTBOX_CAPTURE = "1";

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const { loadMaswaliWorld, SEALER, READER, OWNER, DRAFTER } = await import("./maswali-money-world.mts");
const W = await loadMaswaliWorld();
const { dal, money, acct, settle } = W;
// S6-INT · S5-FIX-SRV's reviewed-state guards: a move names the close it reviewed, a correction or a confirmation the seal
// it reviewed, and an attestation the draft it read — read here from the stores, as the officer's page reads them.
const reviewedClose = async (weekId: string) => ({ expectedClosesAt: (await dal.weekStore.get(weekId)).closesAt as string });
const reviewedSeal = async (weekId: string, slot: number) => {
  const q = (await dal.questionStore.listForWeek(weekId)).find((x: any) => x.slot === slot);
  return { expectedOutcome: q?.outcome, expectedSealedAt: q?.sealedAt };
};
const market = W.w.svc;
const notify = await import("../../src/lib/server/maswali-notify.ts");
const N = await import("../../src/lib/server/notification-service.ts");
const email = await import("../../src/lib/server/email.ts");
const consoleRead = await import("../../src/lib/server/maswali-console.ts");
const winnerSms = await import("../../src/lib/server/maswali-winner-sms.ts");
const registry = await import("../../src/lib/server/comms-registry.ts");
const locks = await import("../../src/lib/server/locks.ts");
const rg = await import("../../src/lib/server/responsible-gambling.ts");
const { audit, auditFlush, getAuditForTargetsDurable } = await import("../../src/lib/server/audit.ts");
const { saveConfigOrThrow } = await import("../../src/lib/server/config-store.ts");
const { SmsTargetTakenError } = await import("../../src/lib/sms-targets.ts");
const { checkMaswaliInvariants } = await import("../../src/lib/server/maswali-invariants.ts");
const { readMaswaliRulesSnapshot } = await import("../../src/lib/server/maswali-config.ts");
const { setRequireTwoOfficerResolution } = await import("../../src/lib/server/resolution-policy.ts");
const { WITHDRAW_MAX_TZS } = await import("../../src/lib/server/validators.ts");
const { sideWordIn } = await import("../../src/lib/side-label.ts");
const { formatTzs } = await import("../../src/lib/utils.ts");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
const J = (x: unknown) => JSON.stringify(x);
const LF = String.fromCharCode(10);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const iso = () => new Date().toISOString();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ── the reads ──────────────────────────────────────────────────────────────────────────────────────────
const rowsOf = async (u: string): Promise<any[]> => ((await W.db.notification.findByUser(u, 500)) as any[] | null) ?? [];
const mlnRows = async (u: string) => (await rowsOf(u)).filter((n) => String(n.href ?? "").startsWith("/millionea"));
const withHref = async (u: string, href: string) => (await mlnRows(u)).filter((n) => n.href === href);
/** Every launched notice finished, and the audit ring written through. */
const settleAll = async () => { await notify.settleMillioneaNotices(); await auditFlush(); };
/** A fire-and-forget write (the poll's own notice) given a moment to land. */
async function eventually(check: () => Promise<boolean>, ms = 3_000): Promise<boolean> {
  const until = Date.now() + ms;
  for (;;) {
    if (await check()) return true;
    if (Date.now() > until) return false;
    await sleep(25);
  }
}
/**
 * ⭐ AGE THESE PLAYERS' BELL ROWS PAST `notify()`'s 90-SECOND DUPLICATE WINDOW (MEDIUM 4), so a second run that sent
 * nothing proves the notice's own key (`existsWithHref`), never the window.
 */
async function ageNotices(users: readonly string[]): Promise<void> {
  if (W.onPostgres) {
    await W.prisma()!.$executeRawUnsafe(`UPDATE "Notification" SET "createdAt" = "createdAt" - interval '10 minutes' WHERE "userId" = ANY($1::text[])`, [...users]);
    return;
  }
  for (const u of users) for (const n of await rowsOf(u)) n.createdAt = new Date(Date.parse(n.createdAt) - 10 * 60_000).toISOString();
}
const millioneaLetters = () => email.emailOutbox().filter((m) => String(m.tag ?? "").startsWith("millionea-"));
/** A live credit reading the SMS rail confirms (the console provider reads none): set just before each release. */
const credit = (tzs: number) => { (globalThis as any).__50PICK_SMS_BALANCE = { tzs, at: Date.now() }; };
const winnerTargets = async (weekId: string) =>
  ((await W.db.smsMessage.listRecent(5_000)) as any[]).filter((m) => m.targetType === winnerSms.WINNER_SMS_TARGET && String(m.targetId ?? "").startsWith(`${weekId}:`));
/** The bodies the SMS rail was handed for one number (the dev ring; the stored row keeps no body). */
const smsBodiesTo = (phone: string): string[] => (((globalThis as any).__50PICK_LAST_SMS?.get(phone) ?? []) as Array<{ body: string }>).map((x) => x.body);
const resultRuns = async (weekId: string) => {
  const rows = await getAuditForTargetsDurable({ targetType: "MaswaliCycle", targetIds: [weekId], actions: ["maswali.notices.sent"], sinceIso: "1970-01-01T00:00:00.000Z", limit: 50 });
  return rows.entries.filter((e: any) => e.payload?.notice === "result").map((e: any) => e.payload);
};
const priceOf = (week: any) => {
  const r = readMaswaliRulesSnapshot(week.rulesSnapshot);
  return r.ok ? r.rules.ticketPriceTzs : NaN;
};
const href = (k: any) => N.millioneaNoticeHref(k);
const phoneOf = async (u: string) => ((await W.db.user.findById(u)) as any)?.phoneE164 as string;
const POLL_WORDS = /Bet placed|Dau limewekwa|exact amount you receive/;
/** Every ALARM line written while `body` ran (round 4: an ALARM is the outcome a case reads). */
async function alarmsDuring(body: () => Promise<void>): Promise<string[]> {
  const lines: string[] = [];
  const real = console.error;
  console.error = (...a: unknown[]) => { lines.push(a.map(String).join(" ")); real(...a); };
  try { await body(); } finally { console.error = real; }
  return lines.filter((l) => l.includes("ALARM"));
}
const GOLD_BAR = "linear-gradient(90deg,#c49a2e,#e8c05a,#c49a2e)";

/** A failure planted into ONE bell write (the review's MEDIUM 2): the next row written with this link throws, once. */
const failNext = new Set<string>();
{
  const n = W.db.notification as any;
  const real = n.create.bind(n);
  n.create = (row: any, ...rest: any[]) => {
    if (failNext.has(String(row?.href ?? ""))) { failNext.delete(String(row.href)); throw new Error("planted: the bell write failed"); }
    return real(row, ...rest);
  };
}

await W.setup({ guarantee: 20_000_000 });
let ahead = 2;
const A = await W.user({ balance: 500_000 }); // English, a confirmed address
const B = await W.user({ balance: 500_000 }); // Swahili, an address never confirmed
const C = await W.user({ balance: 500_000 }); // Chinese, no address
const D = await W.user({ balance: 500_000 }); // holds nothing, ever
const E = await W.user({ balance: 0 });       // cannot pay
const P = await W.user({ balance: 50_000 });  // bets on a poll only
const X = await W.user({ balance: 500_000 }); // a paid winner who will be self-excluded (§9)
const Z = await W.user({ balance: 500_000 }); // a winner who will be suspended: every share held (§9)
const Y = await W.user({ balance: 500_000 }); // a loser who will be self-excluded (§9)
const V = await W.user({ balance: 500_000 }); // a rollover holder who will be self-excluded (§7)
const Q = await W.user({ balance: 500_000 }); // a winner whose number the gateway can never dial (§9, round 3)
const aMail = `ntf_a_${process.pid}@notify.test`;
const bMail = `ntf_b_${process.pid}@notify.test`;
const mailOf = (u: string) => `ntf_${u.slice(-6)}_${process.pid}@notify.test`;
await W.setUserFields(A, { email: aMail, emailVerifiedAt: iso() });
await W.setUserFields(B, { email: bMail, emailVerifiedAt: null, locale: "SW" });
await W.setUserFields(C, { locale: "ZH" });
for (const u of [X, Z, Y, V]) await W.setUserFields(u, { email: mailOf(u), emailVerifiedAt: null });
const holdersOf1 = [A, B, C];

// ── §1.0 · ⭐ round 17 (B1) · one process shares a week's result run and its refund run ─────────────────────────
// The notices' set of running jobs sat under another module's global name, so every launch threw after its run had started
// and nothing was shared: a second launch of the same week's result or refund ran beside the first and sent every letter
// again (§11b drives it through the product's doors). Two launches must hand back ONE run, and neither may throw.
{
  const twice = (launch: () => Promise<any>) => {
    try {
      const first = launch();
      const second = launch();
      return { shared: first === second, threw: null as string | null, first: first as Promise<any> | null };
    } catch (e) {
      return { shared: false, threw: String((e as Error)?.message ?? e), first: null };
    }
  };
  const ghost = `mlw_none_${process.pid}`;
  const res = twice(() => notify.noticeWeekSettled(ghost));
  const ref = twice(() => notify.noticeWeekRefunded(ghost));
  await Promise.allSettled([res.first, ref.first].filter((p): p is Promise<any> => p !== null));
  ok("1.0 · ⭐ round 17 (B1) · two launches of one week's result in one process hand back ONE run, and so do two of its refund — and no launch throws",
    res.shared && ref.shared && res.threw === null && ref.threw === null,
    J({ result: { shared: res.shared, threw: res.threw }, refund: { shared: ref.shared, threw: ref.threw } }));
}

// ── §1 · the receipt; a moved close ─────────────────────────────────────────────────────────────────────
console.log(`${LF}§1 · the receipt — once per purchase, never for a replay or a refusal; a moved close, once per move`);
const { week: w1, start: s1 } = await W.openWeek({ weeksAhead: ahead++ });
const price1 = priceOf(w1);
const keyA = `ntf-a1-${process.pid}`;
const a1 = await W.buy(A, w1.id, [W.WIN, W.WIN], { key: keyA });
const b1 = await W.buy(B, w1.id, [W.LOSE]);
const b2 = await W.buy(B, w1.id, [W.LOSE]);
const c1 = await W.buy(C, w1.id, [W.WIN]);
const e1 = await W.buy(E, w1.id, [W.LOSE]);
await settleAll();
{
  const t = a1.data.maswali.tickets;
  const receiptA = href({ notice: "receipt", serial: t[0].serial, positionId: t[0].positionId });
  const rowA = await withHref(A, receiptA);
  ok("1.1 · ⭐ one receipt for a two-ticket purchase: one bell row, a BET_PLACED, keyed by the first ticket",
    a1.ok && b1.ok && b2.ok && c1.ok && rowA.length === 1 && rowA[0].kind === "BET_PLACED" && (await mlnRows(A)).length === 1, J(rowA));
  ok("1.2 · …stating the purchase's own total at the week's frozen price", rowA[0]?.bodyEn?.includes(formatTzs(2 * price1)), rowA[0]?.bodyEn);
  const again = await W.buy(A, w1.id, [W.WIN, W.WIN], { key: keyA });
  await settleAll();
  ok("1.3 · a replay of the same purchase moves nothing and sends nothing", again.ok && again.data.replayed === true && (await mlnRows(A)).length === 1, J(again.ok ? again.data.replayed : again));
  ok("1.4 · a purchase that is refused sends nothing", !e1.ok && (await mlnRows(E)).length === 0, J(e1.ok ? "bought" : e1.reason));
  ok("1.5 · each purchase its own receipt: two for B's two purchases, one for C", (await mlnRows(B)).length === 2 && (await mlnRows(C)).length === 1);
  // MB-28 · the close moves twice: each new close is told once, to every holder of a live ticket, and to nobody else.
  const firstMove = new Date(Date.parse(w1.closesAt) - HOUR).toISOString();
  const secondMove = new Date(Date.parse(w1.closesAt) - 2 * HOUR).toISOString();
  const m1 = await W.svc.moveClose({ weekId: w1.id, toCloseAt: firstMove, ...(await reviewedClose(w1.id)), officerId: DRAFTER });
  await settleAll();
  const moved1 = await Promise.all(holdersOf1.map(async (u) => (await withHref(u, href({ notice: "closeMoved", weekCode: w1.code, move: 1 }))).length));
  ok("1.6 · ⭐ MB-28 · a moved close is told once to each holder, as a SELECTION_CLOSED, naming the new close — and to nobody else",
    m1.ok && J(moved1) === J([1, 1, 1]) && (await withHref(A, href({ notice: "closeMoved", weekCode: w1.code, move: 1 })))[0]?.kind === "SELECTION_CLOSED" && (await mlnRows(D)).length === 0,
    J({ m1: m1.ok ? "ok" : m1, moved1 }));
  await ageNotices(holdersOf1);
  const rerun = await notify.noticeCloseMoved(w1.id);
  const m2 = await W.svc.moveClose({ weekId: w1.id, toCloseAt: secondMove, ...(await reviewedClose(w1.id)), officerId: DRAFTER });
  await settleAll();
  const moved2 = await Promise.all(holdersOf1.map(async (u) => (await withHref(u, href({ notice: "closeMoved", weekCode: w1.code, move: 2 }))).length));
  ok("1.7 · a second run of the same move sends nothing (outside the duplicate window); a second move is told once more",
    rerun.sent === 0 && rerun.alreadySent === 3 && m2.ok && J(moved2) === J([1, 1, 1]), J({ rerun, moved2 }));
  // Round 3 (A7) · the close moved BACK to the first move's instant: a third move, told once more (keyed by its instant, the
  // old key was the first move's own, so this move was never told).
  const m3 = await W.svc.moveClose({ weekId: w1.id, toCloseAt: firstMove, ...(await reviewedClose(w1.id)), officerId: DRAFTER });
  await settleAll();
  const moved3 = await Promise.all(holdersOf1.map(async (u) => (await withHref(u, href({ notice: "closeMoved", weekCode: w1.code, move: 3 }))).length));
  const closeRows = (await mlnRows(A)).filter((n) => String(n.href).includes(`${w1.code}-close-`));
  ok("1.8 · ⭐ round 3 · B→A→B: the close moved back to an instant it had before is a third move, told once more — each move once",
    m3.ok && J(moved3) === J([1, 1, 1]) && closeRows.length === 3, J({ m3: m3.ok ? "ok" : m3, moved3, rows: closeRows.map((n) => n.href) }));
  // Round 4 (L4) · A MOVE WHOSE RECORD NEVER LANDED (a record kept only in memory): the close moved through the store alone.
  // The notice reads the count and the close in ONE read of the records, sees the stored close is not the one a record set,
  // and raises an ALARM — and tells NOBODY (round 5): not the stored close, which no record names, nor the close a record
  // names, which is not the stored one. Then the close is put back.
  const stood = (await dal.weekStore.get(w1.id)).closesAt as string;
  const unrecorded = new Date(Date.parse(stood) - 30 * 60_000).toISOString();
  let lost: any = null;
  const alarmed = await alarmsDuring(async () => {
    await dal.weekStore.moveClose(w1.id, stood, unrecorded);
    lost = await notify.noticeCloseMoved(w1.id);
    await settleAll();
  });
  await dal.weekStore.moveClose(w1.id, unrecorded, stood);
  ok("1.9 · ⭐ rounds 4 and 5 (L4) · a stored close no record reaches raises an ALARM and tells NOBODY — never the close a record names",
    alarmed.some((l) => l.includes(w1.code) && l.includes("kept only in memory") && l.includes("nobody is told"))
      && lost?.recipients === 0 && lost?.sent === 0 && lost?.alreadySent === 0, J({ alarmed, lost }));
}

// ── §2 · the free cancel ──────────────────────────────────────────────────────────────────────────────
console.log(`${LF}§2 · the free cancel — once`);
{
  const pos = b2.data.maswali.tickets[0].positionId;
  const serial = b2.data.maswali.tickets[0].serial;
  const out = await market.cashOutPosition(B, pos);
  await settleAll();
  const cancelHref = href({ notice: "cancel", serial });
  const row = await withHref(B, cancelHref);
  ok("2.1 · ⭐ the cancel's one notice: a REFUND row stating the price returned (S5's refund kind)", out.ok && row.length === 1 && row[0].kind === "REFUND" && row[0].bodyEn.includes(formatTzs(price1)), J(out.ok ? row : out));
  const ticket = await dal.ticketStore.getByPositionId(pos);
  await ageNotices([B]);
  const rerun = await notify.noticeTicketCancelled(B, ticket.id);
  ok("2.2 · a second run, outside the duplicate window, finds it sent and sends nothing", rerun.sent === 0 && rerun.alreadySent === 1 && (await withHref(B, cancelHref)).length === 1, J(rerun));
}

// ── §3 · the close, a reserve's void, two corrections ─────────────────────────────────────────────────
console.log(`${LF}§3 · the close and a reserve's void — once; a void corrected back, a YES↔NO correction — each once`);
const outcomes1 = Array.from({ length: 15 }, (_, i) => (i === 10 ? { void: "not_played" } : "YES")) as Array<"YES" | { void: string }>;
let at1 = await W.closeAndSeal(w1, s1, outcomes1);
await settleAll();
const code1 = (await dal.weekStore.get(w1.id)).code as string;
{
  const closed = href({ notice: "closed", weekCode: code1 });
  const counts = await Promise.all(holdersOf1.map(async (u) => (await withHref(u, closed)).length));
  ok("3.1 · ⭐ the close: one SELECTION_CLOSED row for each holder of a live ticket", J(counts) === J([1, 1, 1]) && (await withHref(A, closed))[0]?.kind === "SELECTION_CLOSED", J(counts));
  ok("3.2 · …and nothing at all to an account that holds no ticket", (await mlnRows(D)).length === 0);
  const q11 = (await dal.questionStore.listForWeek(w1.id)).find((q: any) => q.slot === 11);
  const voided = href({ notice: "void", weekCode: code1, slot: 11, sealedAt: q11.sealedAt });
  const vc = await Promise.all(holdersOf1.map(async (u) => (await withHref(u, voided)).length));
  ok("3.3 · the reserve's void: one VERDICT row for each holder, keyed by its seal", J(vc) === J([1, 1, 1]) && (await withHref(A, voided))[0]?.kind === "VERDICT", J(vc));
  await ageNotices(holdersOf1);
  const r1 = await notify.noticeSalesClosed(w1.id);
  const r2 = await notify.noticeQuestionVoided(w1.id, 11);
  ok("3.4 · second runs of both, outside the duplicate window, find every holder told and send nothing", r1.sent === 0 && r1.alreadySent === 3 && r2.sent === 0 && r2.alreadySent === 3, J([r1, r2]));
  // Round 3 (A6) · the sealer corrects the reserve's void to a void on another ground: the void stands — told NOT AT ALL —
  // and a later catch-up keys it by when the question BECAME void, so it is never told a second time.
  const reground = await W.svc.correctSeal({ weekId: w1.id, slot: 11, outcome: "VOID", voidReason: "abandoned", evidence: "Corrected: the event was abandoned, not unplayed",
    ...(await reviewedSeal(w1.id, 11)), officerId: SEALER, now: new Date(s1 + 9 * DAY + 30 * 60_000) });
  await settleAll();
  await ageNotices(holdersOf1);
  const catchUp = await notify.noticeQuestionCorrected(w1.id, 12, "YES");
  await settleAll();
  const voidRows = (await mlnRows(A)).filter((n) => String(n.href).includes(`${code1}-void-11-`));
  ok("3.4b · ⭐ round 3 · a void re-grounded is not told again: no correction notice, and the catch-up finds the void already told (one row each)",
    reground.ok && voidRows.length === 1 && catchUp.sent === 0 && (await withHref(B, voided)).length === 1 && (await withHref(C, voided)).length === 1,
    J({ reground: reground.ok ? "ok" : reground, voidRows: voidRows.map((n) => n.href), catchUp }));
  // MB-24 · the sealer corrects: the reserve's void back to a result (reinstated), then a reserve's YES to NO, then back.
  const sealAt = new Date(s1 + 9 * DAY);
  const fix1 = await W.svc.correctSeal({ weekId: w1.id, slot: 11, outcome: "YES", evidence: "Corrected: the event was played after all", ...(await reviewedSeal(w1.id, 11)), officerId: SEALER, now: new Date(sealAt.getTime() + HOUR) });
  await settleAll();
  const q11b = (await dal.questionStore.listForWeek(w1.id)).find((q: any) => q.slot === 11);
  const reinst = href({ notice: "correction", weekCode: code1, slot: 11, sealedAt: q11b.sealedAt });
  const rc = await Promise.all(holdersOf1.map(async (u) => (await withHref(u, reinst)).length));
  const rRow = (await withHref(A, reinst))[0];
  ok("3.5 · ⭐ MB-24 · a void corrected to a result is told once to each holder: reinstated, as a VERDICT, the answer never named",
    fix1.ok && J(rc) === J([1, 1, 1]) && rRow?.kind === "VERDICT" && String(rRow?.bodyEn).includes("no longer void") && !/\b(YES|NO)\b/.test(`${rRow?.titleEn} ${rRow?.bodyEn}`),
    J({ fix: fix1.ok ? "ok" : fix1, rc, rRow: rRow?.bodyEn }));
  const fix2 = await W.svc.correctSeal({ weekId: w1.id, slot: 12, outcome: "NO", evidence: "Corrected: the source revised the result", ...(await reviewedSeal(w1.id, 12)), officerId: SEALER, now: new Date(sealAt.getTime() + 2 * HOUR) });
  await settleAll();
  const q12 = (await dal.questionStore.listForWeek(w1.id)).find((q: any) => q.slot === 12);
  const corr1 = href({ notice: "correction", weekCode: code1, slot: 12, sealedAt: q12.sealedAt });
  await ageNotices(holdersOf1);
  const rerun = await notify.noticeQuestionCorrected(w1.id, 12, "YES");
  const fix3 = await W.svc.correctSeal({ weekId: w1.id, slot: 12, outcome: "YES", evidence: "Corrected again: the first reading stood", ...(await reviewedSeal(w1.id, 12)), officerId: SEALER, now: new Date(sealAt.getTime() + 3 * HOUR) });
  await settleAll();
  const q12b = (await dal.questionStore.listForWeek(w1.id)).find((q: any) => q.slot === 12);
  const corr2 = href({ notice: "correction", weekCode: code1, slot: 12, sealedAt: q12b.sealedAt });
  const cRow = (await withHref(B, corr1))[0];
  ok("3.6 · ⭐ a YES↔NO correction is told once (corrected, not reinstated); a second run sends nothing; a second correction is told once more",
    fix2.ok && fix3.ok && (await withHref(A, corr1)).length === 1 && String(cRow?.bodyEn).includes("was corrected") && !String(cRow?.bodyEn).includes("no longer void")
      && rerun.sent === 0 && rerun.alreadySent === 3 && (await withHref(A, corr2)).length === 1 && (await withHref(C, corr2)).length === 1,
    J({ fix2: fix2.ok, fix3: fix3.ok, rerun }));
  // The corrections restarted the objection window (OD-09): the release waits for the new one.
  const after = await dal.weekStore.get(w1.id);
  at1 = new Date(Date.parse(after.objectionsCloseAt) + 60_000);
}

// ── §4 · the result ───────────────────────────────────────────────────────────────────────────────────
console.log(`${LF}§4 · the result — winners first, each SMS on its own key; a failed bell finished by the reconcile`);
email.clearEmailOutbox();
credit(5_000_000);
const leadA = [...a1.data.maswali.tickets.map((t: any) => t.serial as string)].sort()[0];
const leadC = c1.data.maswali.tickets[0].serial as string;
const winCHref = href({ notice: "result", weekCode: code1, winningSerial: leadC });
failNext.add(winCHref); // C's win bell fails to write, once
const rel1 = await W.release(w1.id, at1);
await settleAll();
{
  ok("4.0 · the week settled through the release", rel1.ok, J(rel1.ok ? "" : rel1));
  const winA = await withHref(A, href({ notice: "result", weekCode: code1, winningSerial: leadA }));
  const lossB = await withHref(B, href({ notice: "result", weekCode: code1, winningSerial: null }));
  const sms = await winnerTargets(w1.id);
  const smsA = sms.find((m) => m.targetId === winnerSms.winnerSmsTargetId(w1.id, A));
  ok("4.1 · ⭐ WINNERS FIRST: the winner's bell, then its SMS, both before the loser's bell (a stopped run has told its winners)",
    winA.length === 1 && lossB.length === 1 && !!smsA && Date.parse(winA[0].createdAt) <= Date.parse(smsA.createdAt) && Date.parse(smsA.createdAt) <= Date.parse(lossB[0].createdAt),
    J({ win: winA[0]?.createdAt, sms: smsA?.createdAt, loss: lossB[0]?.createdAt }));
  ok("4.2 · ⭐ a winner whose bell write failed still got the SMS — its own key (MaswaliWinner), never the bell's",
    (await withHref(C, winCHref)).length === 0 && sms.some((m) => m.targetId === winnerSms.winnerSmsTargetId(w1.id, C)), J(sms.map((m) => m.targetId)));
  const runs = await resultRuns(w1.id);
  ok("4.3 · …and the run says so: one failed write, not complete", runs.length === 1 && runs[0].failed === 1 && runs[0].complete === false, J(runs));
  await ageNotices([A, B, C]);
  const rec = await notify.reconcileMillioneaNotices(new Date(), { force: true });
  await settleAll();
  const runs2 = await resultRuns(w1.id);
  ok("4.4 · ⭐ MEDIUM 2 · the reconcile re-runs the incomplete week and writes ONLY what was missing: C's bell — no second bell, letter or SMS for anyone",
    rec.reran >= 1 && (await withHref(C, winCHref)).length === 1 && (await withHref(A, href({ notice: "result", weekCode: code1, winningSerial: leadA }))).length === 1
      && (await winnerTargets(w1.id)).length === 2 && millioneaLetters().length === 1 && runs2[0]?.complete === true, J({ rec, runs2: runs2[0] }));
  const again = await notify.reconcileMillioneaNotices(new Date(), { force: true });
  await settleAll();
  ok("4.5 · a week whose last record is complete is not re-run: the pass re-ran nothing, and no record was added",
    again.reran === 0 && (await resultRuns(w1.id)).length === runs2.length, J(again));
  const body = String(winA[0]?.bodyEn ?? "");
  ok("4.6 · ⭐ MB-11 · the win states the withdrawal ladder: a confirmed email, the typed identity, the cap per withdrawal, the fee",
    body.includes("confirmed email") && body.includes("typed identity") && body.includes(formatTzs(WITHDRAW_MAX_TZS)) && /fee \d/.test(body) && winA[0]?.kind === "WIN", body);
  const winC = await withHref(C, winCHref);
  const all = [winA[0], winC[0]].flatMap((n) => [n?.titleEn, n?.titleSw, n?.titleZh, n?.bodyEn, n?.bodySw, n?.bodyZh]).map(String);
  ok("4.7 · ⛔ …and no review, no AML word and no later week's figure (MB-11, MB-44), in any language",
    all.every((s) => !/\bAML\b|review|money laundering|uchunguzi|carried|imeletwa mbele|next week|wiki ijayo/i.test(s)), J(all));
  ok("4.8 · the loss says so plainly, with what the week cost the player", String(lossB[0]?.bodyEn ?? "").includes(formatTzs(price1)) && String(lossB[0]?.titleEn ?? "").includes("did not win"), lossB[0]?.bodyEn);
  const letters = millioneaLetters();
  ok("4.9 · ⭐ one letter: the win, to the confirmed address — none to the address never confirmed, none without one",
    letters.length === 1 && letters[0].to === aMail && letters[0].tag === "millionea-win" && !email.emailOutbox().some((m) => m.to === bMail), J(letters.map((m) => [m.to, m.tag])));
  const smsAll = await winnerTargets(w1.id);
  ok("4.10 · ⭐ OD-25 · one service SMS for each winning player, keyed to the week and the player — and none for the loser",
    smsAll.length === 2 && J(smsAll.map((m) => m.targetId).sort()) === J([winnerSms.winnerSmsTargetId(w1.id, A), winnerSms.winnerSmsTargetId(w1.id, C)].sort())
      && smsAll.every((m) => m.purpose === "OPS"), J(smsAll.map((m) => [m.targetId, m.purpose, m.status])));
  ok("4.11 · the first run's record counted its parts: three holders, two told and one failed, the SMS of both winners handed over",
    runs[0].recipients === 3 && runs[0].sent === 2 && runs[0].sms?.sent === 2 && Object.keys(runs[0].sms?.held ?? {}).length === 0, J(runs[0]));
  await ageNotices([A, B, C]);
  const twice = await notify.noticeWeekSettled(w1.id);
  await settleAll();
  ok("4.12 · ⭐ a second run, outside the duplicate window, sends nothing at all: no bell, no letter, no SMS",
    twice.sent === 0 && twice.alreadySent === 3 && twice.sms?.sent === 0 && twice.sms?.already === 2 && millioneaLetters().length === 1 && (await winnerTargets(w1.id)).length === 2, J(twice));
}

// ── §5 · the desk list and its alert ──────────────────────────────────────────────────────────────────
console.log(`${LF}§5 · MB-93 — the winners not yet reached, the 24-hour alert, and the desk's recorded call`);
{
  const settledAt = (await dal.weekStore.get(w1.id)).settledAt as string;
  const at = (h: number) => new Date(Date.parse(settledAt) + h * HOUR);
  const mine = async (h: number) => (await consoleRead.unreachedWinners(at(h))).filter((u: any) => u.weekId === w1.id);
  const listed = await mine(25);
  const rowA = listed.find((u: any) => u.userId === A);
  const rowC = listed.find((u: any) => u.userId === C);
  ok("5.1 · ⭐ both winners are listed, each with what was sent: the bell, where a letter could go, the SMS's own record",
    listed.length === 2 && !!rowA && !!rowC && rowA.bell && rowC.bell && rowA.emailState === "confirmed" && rowC.emailState === "none"
      && !!rowA.sms && rowA.sms.status !== "DELIVERED" && rowA.smsHeld === null && rowA.paidTzs > 0 && !rowA.held && !rowA.forfeited, J(listed));
  ok("5.2 · …and the holder who did not win is never on it", !listed.some((u: any) => u.userId === B));
  const late = (await consoleRead.consoleAlerts(at(25))).filter((x: any) => x.weekId === w1.id && /no notice reach/.test(String(x.text)));
  const early = (await consoleRead.consoleAlerts(at(1))).filter((x: any) => x.weekId === w1.id && /no notice reach/.test(String(x.text)));
  ok("5.3 · ⭐ the alert: raised once the winners are past a day, silent before", late.length === 1 && late[0].level === "warning" && String(late[0].text).includes("2 winners") && early.length === 0, J([late, early]));
  ok("5.4 · ⭐ the desk list reads only recent weeks: a week settled longer ago than the window is not read at all",
    (await consoleRead.unreachedWinners(at((consoleRead.UNREACHED_RECENT_DAYS + 1) * 24))).filter((u: any) => u.weekId === w1.id).length === 0);
  const view = await consoleRead.integrityView(at(25));
  ok("5.5 · the integrity view lists them, counted in full", !!view.unreachedPage && view.unreachedPage.total >= 2 && !!view.unreached?.some((u: any) => u.userId === A && u.weekId === w1.id), J(view.unreachedPage));
  // ⭐ S16 (S6-INT 14; lane R's round-6 rule carried to the notices) · a winner whose paid share is missing from its record is
  // never told TZS 0: the desk list says it is not on record, and a result run sends that winner no money notice at all.
  // A ticket's payout is no patchable column (the store refuses it), so the read itself answers the record as it would be:
  // the week's tickets as the notices and the desk list read them, A's winning ticket with no payout on record.
  const aWin = (await dal.ticketStore.listForWeek(w1.id, { status: "SETTLED", won: true })).find((t: any) => t.userId === A);
  const readTickets = dal.ticketStore.listForWeek;
  dal.ticketStore.listForWeek = async (...args: any[]) => (await readTickets.apply(dal.ticketStore, args as any)).map((t: any) => (t.id === aWin.id ? { ...t, payout: null } : t));
  try {
    const rowNull = (await mine(25)).find((u: any) => u.userId === A);
    const unread = await notify.noticeWeekSettled(w1.id);
    await settleAll();
    ok("5.5b · ⭐ S16 · a winner whose paid share is missing from its record: the desk list says it is not on record (null, never 0), and a result run tells them nothing about money — counted share_unread, the run still complete",
      rowNull?.paidTzs === null && unread.permanent?.share_unread === 1 && notify.millioneaRunComplete(unread), J({ paid: rowNull?.paidTzs, permanent: unread.permanent, letters: unread.letters }));
  } finally {
    dal.ticketStore.listForWeek = readTickets;
  }
  await dal.noticeStore.markSeen(C, w1.id, "RESULT", iso());
  const afterSeen = await mine(25);
  ok("5.6 · a winner who opened the result in the app is reached: off the list", afterSeen.length === 1 && afterSeen[0].userId === A, J(afterSeen.map((u: any) => u.userId)));
  const [msg] = (await W.db.smsMessage.findByTargets(winnerSms.WINNER_SMS_TARGET, [winnerSms.winnerSmsTargetId(w1.id, A)])) as any[];
  await W.db.smsMessage.recordDlr(msg.reference, { status: "DELIVERED", rawStatus: "DELIVRD", desc: null, at: iso() });
  const afterDlr = await mine(25);
  const quiet = (await consoleRead.consoleAlerts(at(25))).filter((x: any) => x.weekId === w1.id && /no notice reach/.test(String(x.text)));
  ok("5.7 · ⭐ a delivered receipt reaches the other: the list is empty and the alert is gone", afterDlr.length === 0 && quiet.length === 0, J([afterDlr, quiet]));
}

// ── §6 · the credit check before the batch; the float first ─────────────────────────────────────────
console.log(`${LF}§6 · MB-93 — the SMS credit before every winner's SMS; MB-11 — the float before the result`);
{
  const { week: w2, start: s2 } = await W.openWeek({ weeksAhead: ahead++ });
  const a = await W.buy(A, w2.id, [W.WIN]);
  const c = await W.buy(C, w2.id, [W.WIN]);
  const b = await W.buy(B, w2.id, [W.LOSE]);
  const at2 = await W.closeAndSeal(w2, s2);
  email.clearEmailOutbox();
  // Above the credit kept for codes by less than one SMS would cost (the owner's settings: TZS 20,000 kept, TZS 6 a segment).
  credit(20_005);
  // ⭐ MB-11 · the float read is slowed, and the result must wait for it: no winner is told before the float is compared.
  let floatAt = 0;
  const p = await settle.previewMaswaliSettlement(w2.id, at2);
  const rel = p.ok ? await settle.settleMaswaliWeek({ weekId: w2.id, releasedBy: "usr_mln_accounting", digest: p.preview.digest, now: at2,
    readFloat: async () => { await sleep(300); floatAt = Date.now(); return { balance: 1_000_000_000_000 }; } }) : p;
  // The result launches only once the slowed float read answered (round 3, A2): wait for the read, then for the run it
  // launched, and only then drain — a drain begun before the launch returns with nothing to wait for.
  await eventually(async () => floatAt > 0, 5_000);
  await eventually(async () => notify.millioneaNoticeRuns().some((x: any) => x.notice === "result" && x.weekId === w2.id), 5_000);
  await settleAll();
  const code2 = (await dal.weekStore.get(w2.id)).code as string;
  const leadA2 = a.data.maswali.tickets[0].serial as string;
  const winRows = [...(await withHref(A, href({ notice: "result", weekCode: code2, winningSerial: leadA2 }))),
    ...(await withHref(B, href({ notice: "result", weekCode: code2, winningSerial: null })))];
  ok("6.1 · ⭐ MB-11 · the float is compared BEFORE any holder is told: every result row of the week was written after the float read",
    a.ok && b.ok && c.ok && rel.ok && floatAt > 0 && winRows.length === 2 && winRows.every((n) => Date.parse(n.createdAt) >= floatAt), J({ floatAt, rows: winRows.map((n) => n.createdAt) }));
  const runs = await resultRuns(w2.id);
  ok("6.2 · ⭐ a credit that would spend the codes' credit holds every winner's SMS: nothing sent, the reason counted per winner",
    runs.length === 1 && runs[0].sms?.held?.credit_low === 2 && runs[0].sms?.sent === 0 && runs[0].complete === false && (await winnerTargets(w2.id)).length === 0, J(runs));
  ok("6.3 · …while the bell and the letter still go: the SMS never stands in for them",
    (await withHref(A, href({ notice: "result", weekCode: code2, winningSerial: leadA2 }))).length === 1 && millioneaLetters().filter((m) => m.to === aMail).length === 1);
  const settled2 = (await dal.weekStore.get(w2.id)).settledAt as string;
  const listed = (await consoleRead.unreachedWinners(new Date(Date.parse(settled2) + 25 * HOUR))).filter((u: any) => u.weekId === w2.id);
  ok("6.4 · ⭐ the desk list names both winners, with no SMS and the reason it was held",
    listed.length === 2 && listed.every((u: any) => u.sms === null && u.smsHeld === "credit_low"), J(listed));
  // LOW 8 · the desk's call, recorded: typed, Compliance's, never for a holder who did not win, and once.
  const at25 = new Date(Date.parse(settled2) + 25 * HOUR);
  const typo = await consoleRead.recordMillioneaWinnerReached({ weekId: w2.id, userId: C, officerId: "usr_mln_compliance", typed: "reached", note: "Phoned the registered number" });
  const loser = await consoleRead.recordMillioneaWinnerReached({ weekId: w2.id, userId: B, officerId: "usr_mln_compliance", typed: consoleRead.WINNER_REACHED_WORD, note: "Phoned the registered number" });
  const blank = await consoleRead.recordMillioneaWinnerReached({ weekId: w2.id, userId: C, officerId: "usr_mln_compliance", typed: consoleRead.WINNER_REACHED_WORD, note: "ok" });
  ok("6.5 · ⛔ the desk's record refuses an untyped call, a holder who did not win, and a call with no account of it", !typo.ok && !loser.ok && !blank.ok, J([typo, loser, blank]));
  const call = await consoleRead.recordMillioneaWinnerReached({ weekId: w2.id, userId: C, officerId: "usr_mln_compliance", typed: consoleRead.WINNER_REACHED_WORD, note: "Phoned the registered number; told of the win" });
  const callAgain = await consoleRead.recordMillioneaWinnerReached({ weekId: w2.id, userId: C, officerId: "usr_mln_compliance", typed: consoleRead.WINNER_REACHED_WORD, note: "Phoned again" });
  const afterCall = (await consoleRead.unreachedWinners(at25)).filter((u: any) => u.weekId === w2.id);
  const alertNow = (await consoleRead.consoleAlerts(at25)).filter((x: any) => x.weekId === w2.id && /no notice reach/.test(String(x.text)));
  ok("6.6 · ⭐ LOW 8 · a recorded call takes that winner off and the alert counts only the other; a second record writes nothing",
    call.ok && !call.already && callAgain.ok && callAgain.already && afterCall.length === 1 && afterCall[0].userId === A
      && alertNow.length === 1 && String(alertNow[0].text).includes("a winner has"), J({ call, callAgain, afterCall: afterCall.map((u: any) => u.userId), alertNow }));
  // Round 3 (A10) · the same call submitted twice AT ONCE writes ONE record; and a record that does not land says so.
  const reachedRows = async () => (await getAuditForTargetsDurable({ targetType: "MaswaliCycle", targetIds: [w2.id], actions: [consoleRead.WINNER_REACHED_ACTION],
    sinceIso: "1970-01-01T00:00:00.000Z", limit: 50 })).entries.filter((e: any) => e.payload?.userId === A);
  const reachA = () => consoleRead.recordMillioneaWinnerReached({ weekId: w2.id, userId: A, officerId: "usr_mln_compliance", typed: consoleRead.WINNER_REACHED_WORD, note: "Phoned the registered number" });
  const unrecorded = await consoleRead.recordMillioneaWinnerReached({ weekId: w2.id, userId: A, officerId: "usr_mln_compliance", typed: consoleRead.WINNER_REACHED_WORD,
    note: "Phoned the registered number" }, { audit: (async () => ({ recorded: false, unrecorded: "PERSIST_FAILED" })) as any });
  const stillListed = (await consoleRead.unreachedWinners(at25)).some((u: any) => u.weekId === w2.id && u.userId === A);
  const twice = await Promise.all([reachA(), reachA()]);
  await auditFlush();
  ok("6.6c · ⭐ round 3 · a record that did not land says so and the winner stays listed; the call submitted twice at once writes ONE record",
    !unrecorded.ok && unrecorded.error === consoleRead.WINNER_REACHED_UNRECORDED && stillListed
      && twice.every((x: any) => x.ok) && twice.filter((x: any) => !x.already).length === 1 && (await reachedRows()).length === 1,
    J({ unrecorded, stillListed, twice, rows: (await reachedRows()).length }));
  // Round 3 (A12) · a re-run that changes nothing writes no record: the credit is still low, so nothing goes and one record stands.
  await ageNotices([A, B, C]);
  const idle = await notify.reconcileMillioneaNotices(new Date(), { force: true });
  await settleAll();
  ok("6.6b · ⭐ round 3 · a re-run that changes nothing writes no record: still held, nothing sent, the week's one record stands",
    idle.reran >= 1 && (await resultRuns(w2.id)).length === 1 && (await winnerTargets(w2.id)).length === 0, J({ idle, runs: (await resultRuns(w2.id)).length }));
  credit(5_000_000);
  await ageNotices([A, B, C]);
  // Round 3 (A9) · the reconcile compares the float BEFORE it tells a winner, as the settlement's own run does — round 4 (L2):
  // ONCE, for a week with no run record yet. This week's own run recorded (and compared the float then), so it reads none.
  let reFloatAt = 0;
  await notify.reconcileMillioneaNotices(new Date(), { force: true, readFloat: async () => { await sleep(150); reFloatAt = Date.now(); return { balance: 1_000_000_000_000 }; } });
  await settleAll();
  const after = await winnerTargets(w2.id);
  ok("6.7 · ⭐ MEDIUM 2 · once the credit returns the reconcile sends every held SMS, once — and no second bell or letter",
    after.length === 2 && (await withHref(A, href({ notice: "result", weekCode: code2, winningSerial: leadA2 }))).length === 1
      && millioneaLetters().filter((m) => m.to === aMail).length === 1 && (await resultRuns(w2.id))[0]?.complete === true, J(after.map((m) => m.targetId)));
  ok("6.7b · ⭐ round 4 (L2) · …and it read no float: the week's own run compared it when it recorded — never once an hour for fourteen days",
    reFloatAt === 0 && after.length === 2, J({ reFloatAt, sms: after.map((m) => m.createdAt) }));

  // The SMS's own rules, through its injected reads (`WinnerSmsDeps`): every hold, the once rule and the message itself.
  const line = (userId: string, o: Partial<Record<string, unknown>> = {}) => ({
    userId, weekId: "mlw_week_x", weekCode: "MLN-2026-W44", tickets: 1, paidTzs: 870_000, held: false, cannotSignIn: false,
    phone: "+255712000001", locale: "EN", ...o,
  }) as any;
  const sent: any[] = [];
  const deps = (o: Partial<Record<string, unknown>> = {}) => ({
    credit: async () => ({ kind: "live", tzs: 1_000_000, at: Date.now() }),
    settings: async () => ({ pricePerSegmentTzs: 6, codesReserveTzs: 20_000 }),
    sentTargets: async () => new Map<string, string>(),
    send: async (m: any[]) => { sent.push(...m); return { results: m.map((x) => ({ ok: true, reference: `ref_${x.targetId}`, to: x.to, targetType: x.targetType, targetId: x.targetId })), refused: null }; },
    ...o,
  }) as any;
  const two = [line("u1"), line("u2", { locale: "SW" })];
  const happy = await winnerSms.sendMillioneaWinnerSms(two, deps());
  ok("6.8 · the SMS goes as one OPS message per winner, keyed, its body the winner's own",
    happy.kind === "sent" && happy.accepted === 2 && sent.length === 2 && sent.every((m) => m.purpose === "OPS" && m.targetType === winnerSms.WINNER_SMS_TARGET)
      && sent[0].targetId === winnerSms.winnerSmsTargetId("mlw_week_x", "u1") && sent[1].body === winnerSms.winnerSmsBody(two[1]), J(happy));
  sent.length = 0;
  const holds = await Promise.all([
    winnerSms.sendMillioneaWinnerSms(two, deps({ credit: async () => ({ kind: "unreadable", why: "unavailable", error: null }) })),
    winnerSms.sendMillioneaWinnerSms(two, deps({ settings: async () => null })),
    winnerSms.sendMillioneaWinnerSms(two, deps({ sentTargets: async () => { throw new Error("read failed"); } })),
    winnerSms.sendMillioneaWinnerSms(two, deps({ credit: async () => ({ kind: "live", tzs: 20_011, at: Date.now() }) })),
  ]);
  ok("6.9 · ⭐ every doubt holds: an unread credit, unread settings, unread past sends, a credit too low",
    J(holds.map((h: any) => h.kind === "held" ? h.reason : h.kind)) === J(["credit_unreadable", "settings_unreadable", "targets_unreadable", "credit_low"]) && sent.length === 0, J(holds));
  const enough = await winnerSms.sendMillioneaWinnerSms(two, deps({ credit: async () => ({ kind: "live", tzs: 20_012, at: Date.now() }) }));
  ok("6.10 · control · a credit that leaves exactly the codes' credit sends", enough.kind === "sent" && enough.accepted === 2, J(enough));
  sent.length = 0;
  const done = await winnerSms.sendMillioneaWinnerSms(two, deps({ sentTargets: async (ids: string[]) => new Map(ids.map((id) => [id, "ACCEPTED"])) }));
  const none = await winnerSms.sendMillioneaWinnerSms([line("u3", { phone: null })], deps());
  ok("6.11 · a winner already sent is never sent again, and a winner with no number is no send at all",
    done.kind === "sent" && done.accepted === 0 && done.alreadySent === 2 && done.notResent === 0 && sent.length === 0 && none.kind === "none", J([done, none]));
  // ⭐ M-1 (the lead's ruling 1) · a winner whose one message did not go — the gateway refused it (FAILED), or it was lost in
  // transport (UNKNOWN) — is never sent again: counted not resent, never as a message that went.
  const didNotGo = await winnerSms.sendMillioneaWinnerSms(two, deps({ sentTargets: async (ids: string[]) => new Map(ids.map((id, i) => [id, i === 0 ? "FAILED" : "UNKNOWN"])) }));
  ok("6.11d · ⭐ M-1 · a winner whose one message did not go (refused, or lost in transport) is never sent again, and is counted not resent — never as sent",
    didNotGo.kind === "sent" && didNotGo.accepted === 0 && didNotGo.notResent === 2 && didNotGo.alreadySent === 0 && sent.length === 0, J(didNotGo));
  // Round 4 (L5) · a batch that THREW: only a write refused because another process's row landed first makes a row there
  // another process's message. A throw after the batch's own rows were written leaves its own row — its own failure.
  let readsA = 0;
  const ownRows = await winnerSms.sendMillioneaWinnerSms([line("u5")], deps({
    sentTargets: async (ids: string[]) => (readsA++ === 0 ? new Map<string, string>() : new Map(ids.map((id) => [id, "QUEUED"]))),
    send: async () => { throw new Error("the request failed after the rows were written (fixture)"); },
  }));
  ok("6.11b · ⭐ round 4 (L5) · a batch that threw after writing its own rows counts its winner as its own failure — never as another process's message",
    ownRows.kind === "sent" && ownRows.failed === 1 && ownRows.alreadySent === 0, J(ownRows));
  let readsB = 0;
  const theirs = await winnerSms.sendMillioneaWinnerSms([line("u6")], deps({
    sentTargets: async (ids: string[]) => (readsB++ === 0 ? new Map<string, string>() : new Map(ids.map((id) => [id, "QUEUED"]))),
    send: async () => { throw new SmsTargetTakenError(winnerSms.WINNER_SMS_TARGET); },
  }));
  ok("6.11c · control · a batch whose write was refused because another process's row landed first counts that message as already sent",
    theirs.kind === "sent" && theirs.failed === 0 && theirs.alreadySent === 1, J(theirs));

  // Round 3 (A5) · RESERVE, THEN SEND: two batches for one winner at once — each read "not sent" — through the real rail.
  credit(5_000_000);
  const raceWeek = `mlw_race_${process.pid}`;
  const racer = { userId: A, weekId: raceWeek, weekCode: "MLN-2000-W01", tickets: 1, paidTzs: 870_000, held: false, cannotSignIn: false,
    phone: await phoneOf(A), locale: "EN" } as any;
  const raced = await Promise.all([winnerSms.sendMillioneaWinnerSms([racer]), winnerSms.sendMillioneaWinnerSms([racer])]);
  const raceRows = ((await W.db.smsMessage.listRecent(5_000)) as any[]).filter((m) => m.targetId === winnerSms.winnerSmsTargetId(raceWeek, A));
  ok("6.12 · ⭐ round 3 · two batches for one winner at once: ONE row, ONE message — the second's write is refused, and it counts the first's",
    raceRows.length === 1 && raced.filter((o: any) => o.kind === "sent" && o.accepted === 1).length === 1
      && raced.some((o: any) => o.kind === "sent" && o.accepted === 0 && o.failed === 0 && o.alreadySent === 1), J({ raced, rows: raceRows.length }));
  // …and the rule is each store twin's own: a second row for a winner target is refused; any other target keeps its rule.
  const row = (reference: string, targetType: string, targetId: string) => ({
    reference, msisdn: "255712000555", purpose: "OPS", provider: "console", senderId: "50PICK", bodyLen: 10, status: "QUEUED", providerMsg: null,
    dlrStatus: null, dlrDesc: null, balanceTzs: null, attempts: 1, targetType, targetId, createdAt: iso(), sentAt: null, deliveredAt: null, failedAt: null,
  });
  const twinTarget = `mlw_twin_${process.pid}:${A}`;
  await W.db.smsMessage.createMany([row(`sms_mlw_twin_a_${process.pid}_00000`, winnerSms.WINNER_SMS_TARGET, twinTarget)]);
  const second = await Promise.resolve().then(() => W.db.smsMessage.createMany([row(`sms_mlw_twin_b_${process.pid}_00000`, winnerSms.WINNER_SMS_TARGET, twinTarget)]))
    .then(() => "written", () => "refused");
  await W.db.smsMessage.createMany([row(`sms_mlw_twin_c_${process.pid}_00000`, "MaswaliNoticeProbe", twinTarget), row(`sms_mlw_twin_d_${process.pid}_00000`, "MaswaliNoticeProbe", twinTarget)]);
  const probes = ((await W.db.smsMessage.listRecent(5_000)) as any[]).filter((m) => m.targetId === twinTarget);
  ok(`6.13 · ⭐ round 3 · the ${STORE} twin refuses a second row for a winner's target — and control · two rows for any other target are kept`,
    second === "refused" && probes.filter((m) => m.targetType === winnerSms.WINNER_SMS_TARGET).length === 1 && probes.filter((m) => m.targetType === "MaswaliNoticeProbe").length === 2,
    J({ second, probes: probes.map((m) => m.targetType) }));
}

// ── §7 · the rollover ─────────────────────────────────────────────────────────────────────────────────
console.log(`${LF}§7 · the rollover — to holders only; its figure left out for a reader on a break or locked out`);
const { week: w3, start: s3 } = await W.openWeek({ weeksAhead: ahead++ });
const a3 = await W.buy(A, w3.id, [W.LOSE]);
const b3 = await W.buy(B, w3.id, [W.LOSE]);
const v3 = await W.buy(V, w3.id, [W.LOSE]);
await rg.coolOff(B, "1w");
await W.setUserFields(V, { status: "SELF_EXCLUDED" });
const at3 = await W.closeAndSeal(w3, s3);
// The next week of the line opens before the release, so the carry has a week to name.
const { week: w4, start: s4 } = await W.openWeek({ weeksAhead: ahead++ });
const a4 = await W.buy(A, w4.id, [W.LOSE, W.LOSE]);
const c4 = await W.buy(C, w4.id, [W.LOSE]);
{
  email.clearEmailOutbox();
  const rel = await W.release(w3.id, at3);
  await settleAll();
  const w3row = await dal.weekStore.get(w3.id);
  const code3 = w3row.code as string;
  const carried = (w3row.rolloverIn ?? 0) + (w3row.carryOut ?? 0);
  const code4 = (await dal.weekStore.get(w4.id)).code as string;
  const n4 = Number(/-W([0-9]{1,2})$/.exec(code4)?.[1] ?? "0");
  const resultHref = href({ notice: "result", weekCode: code3, winningSerial: null });
  const ra = await withHref(A, resultHref);
  const rb = await withHref(B, resultHref);
  const rv = await withHref(V, resultHref);
  ok("7.0 · the no-winner week settled, its pool carried", a3.ok && b3.ok && v3.ok && rel.ok && carried > 0, J({ rel: rel.ok, carried }));
  ok("7.1 · ⭐ the rollover, to a holder: the carried figure and the week it goes into, with no fee",
    ra.length === 1 && String(ra[0].bodyEn).includes(formatTzs(carried)) && String(ra[0].bodyEn).includes(`into Week ${n4}`) && String(ra[0].bodyEn).includes("no fee"), ra[0]?.bodyEn);
  const noFigure = (rows: any[]) => rows.length === 1 && [rows[0].bodyEn, rows[0].bodySw, rows[0].bodyZh].every((s: string) => !String(s).includes(formatTzs(carried))) && String(rows[0].bodyEn).startsWith("No ticket reached 10/10.");
  ok("7.2 · ⛔ R8-D · to a holder on a break, the same notice without the figure — left out, never reworded", noFigure(rb), rb[0]?.bodyEn);
  ok("7.3 · ⛔ MB-44 · …and to an account that cannot sign in (self-excluded), the same", noFigure(rv), rv[0]?.bodyEn);
  const letterV = email.emailOutbox().find((m) => m.to === mailOf(V) && m.tag === "millionea-result");
  ok("7.4 · …whose letter goes to the address on file (OD-13) and carries no figure either", !!letterV && !letterV.html.includes(formatTzs(carried)), J(email.emailOutbox().map((m) => [m.to, m.tag])));
  ok("7.5 · nobody but the week's holders is told: C held no ticket of it", (await withHref(C, resultHref)).length === 0 && (await withHref(D, resultHref)).length === 0);
  const letter = millioneaLetters().find((m) => m.to === aMail && m.tag === "millionea-result");
  ok("7.6 · the holder's letter carries the same carry", !!letter && letter.html.includes(formatTzs(carried)), J(millioneaLetters().map((m) => [m.to, m.tag])));
}

// ── §8 · a week void ──────────────────────────────────────────────────────────────────────────────────
console.log(`${LF}§8 · a week void — a two-officer void, the certainty rule, a correction's catch-up, the owed refund`);
{
  const closed4 = await W.svc.closeWeek({ weekId: w4.id, now: new Date(Date.parse(w4.closesAt) + 60_000) });
  await settleAll();
  const sealAt = new Date(s4 + 9 * DAY);
  const code4 = w4.code as string;
  const slotsOf = async (u: string) => [...new Set((await mlnRows(u)).map((n) => String(n.href)).filter((h) => h.startsWith(`/millionea/tickets#${code4}-void-`))
    .map((h) => Number(h.split("-void-")[1].split("-")[0])))].sort((x, y) => x - y);
  const seal = (slot: number) => W.svc.sealQuestion({ weekId: w4.id, slot, outcome: "VOID", voidReason: "not_played", evidence: `The event ${slot} did not take place as drawn`, officerId: SEALER, now: sealAt });
  // The first void is sealed while two officers are required (MR-14): final, and told, only once confirmed.
  await setRequireTwoOfficerResolution(true, OWNER);
  const s1v = await seal(1);
  await settleAll();
  const waiting = await slotsOf(A);
  const confirmed = await W.svc.confirmSeal({ weekId: w4.id, slot: 1, ...(await reviewedSeal(w4.id, 1)), officerId: READER });
  await settleAll();
  await setRequireTwoOfficerResolution(false, OWNER);
  ok("8.0 · ⭐ a void sealed while two officers are required is told only once the second officer confirms it",
    closed4.ok && s1v.ok && J(waiting) === "[]" && confirmed.ok && J(await slotsOf(A)) === "[1]", J({ waiting, confirmed, now: await slotsOf(A) }));
  for (let slot = 2; slot <= 6; slot++) { await seal(slot); await settleAll(); }
  ok("8.1 · ⭐ the voids that left the week gradable were told (1–5); the sixth, that made its void certain, was not",
    J(await slotsOf(A)) === J([1, 2, 3, 4, 5]) && J(await slotsOf(C)) === J([1, 2, 3, 4, 5]), J([await slotsOf(A), await slotsOf(C)]));
  // MEDIUM 5 · the sealer corrects slot 1 to a result: the week can grade again (5 voided mains, 5 reserves), so the muted
  // sixth void is caught up at once; slot 1 was sealed under the two-officer flag, so its correction is final — and told —
  // only once a second officer confirms it.
  const fix = await W.svc.correctSeal({ weekId: w4.id, slot: 1, outcome: "YES", evidence: "Corrected: event 1 was played", ...(await reviewedSeal(w4.id, 1)), officerId: SEALER, now: new Date(sealAt.getTime() + HOUR) });
  await settleAll();
  const q1 = (await dal.questionStore.listForWeek(w4.id)).find((q: any) => q.slot === 1);
  const reinst = href({ notice: "correction", weekCode: code4, slot: 1, sealedAt: q1.sealedAt });
  const caught = await slotsOf(A);
  const pending = (await withHref(A, reinst)).length;
  const confirm2 = await W.svc.confirmSeal({ weekId: w4.id, slot: 1, ...(await reviewedSeal(w4.id, 1)), officerId: READER });
  await settleAll();
  ok("8.2 · ⭐ MEDIUM 5 · a correction that makes the week gradable again catches the muted void up; the corrected question is told once its second officer confirms it",
    fix.ok && J(caught) === J([1, 2, 3, 4, 5, 6]) && pending === 0 && confirm2.ok && (await withHref(A, reinst)).length === 1 && (await withHref(C, reinst)).length === 1
      && String((await withHref(A, reinst))[0]?.bodyEn).includes("no longer void"), J({ fix: fix.ok ? "ok" : fix, caught, pending, confirm2 }));
  // Round 3 (A6) · a void sealed while two officers are required, CORRECTED before its confirmation, then confirmed: the
  // holders were never told the void, so nothing they were told is corrected — no "reinstated", no void notice at all.
  await setRequireTwoOfficerResolution(true, OWNER);
  const sealed7 = await seal(7);
  const fixed7 = await W.svc.correctSeal({ weekId: w4.id, slot: 7, outcome: "YES", evidence: "Corrected before its confirmation: event 7 was played", ...(await reviewedSeal(w4.id, 7)), officerId: SEALER, now: new Date(sealAt.getTime() + 2 * HOUR) });
  const conf7 = await W.svc.confirmSeal({ weekId: w4.id, slot: 7, ...(await reviewedSeal(w4.id, 7)), officerId: READER });
  await settleAll();
  await setRequireTwoOfficerResolution(false, OWNER);
  const told7 = (await mlnRows(A)).filter((n) => String(n.href).startsWith(`/millionea/tickets#${code4}-`) && /-(void|corrected)-7-/.test(String(n.href)));
  ok("8.2b · ⭐ round 3 · a two-officer void corrected before its confirmation is no correction to the holders: no reinstated notice, no void notice",
    sealed7.ok && fixed7.ok && conf7.ok && told7.length === 0, J({ sealed7: sealed7.ok ? "ok" : sealed7, fixed7: fixed7.ok ? "ok" : fixed7, conf7: conf7.ok ? "ok" : conf7, told7: told7.map((n) => n.href) }));
  for (let slot = 8; slot <= 15; slot++) { await seal(slot); await settleAll(); }
  const w4row = await dal.weekStore.get(w4.id);
  ok("8.3 · the voids past certainty again stay silent (8–15)", J(await slotsOf(A)) === J([1, 2, 3, 4, 5, 6]) && !!w4row.objectionsCloseAt, J(await slotsOf(A)));
  const at4 = new Date(Date.parse(w4row.objectionsCloseAt) + 60_000);
  // ⚠️ A FAULT THE PRODUCT CANNOT PRODUCE, DECLARED (the void suite's): one shilling booked into the POOL from outside, so the
  // refund refuses AFTER the stamp. Then booked back out.
  const fault = (sign: 1 | -1) => money.postMaswaliLines(`test_ntf_fault_${sign > 0 ? "in" : "out"}_${w4row.marketId}`, [
    { account: acct.pool(w4row.marketId), entryType: "ADJUSTMENT", amount: sign, marketId: w4row.marketId, memo: "test fault" },
    { account: acct.external("TEST_FAULT"), entryType: "ADJUSTMENT", amount: -sign, marketId: w4row.marketId, memo: "test fault" },
  ], null);
  await fault(1);
  email.clearEmailOutbox();
  const stuck = await W.svc.voidWeek({ weekId: w4.id, now: at4 });
  await settleAll();
  const owed = (await consoleRead.owedRefunds()).find((r: any) => r.weekId === w4.id);
  const viewOwed = (await consoleRead.integrityView(at4)).owedRefunds?.find((r: any) => r.weekId === w4.id);
  ok("8.4 · ⭐ the refund owed has its own row: the week's code, its tickets, when it was voided",
    !stuck.ok && !!owed && owed.code === code4 && owed.ticketCount === 3 && !!owed.voidedAt && !!viewOwed, J({ stuck: stuck.ok ? "ok" : stuck.error, owed }));
  const refundHref = href({ notice: "refund", weekCode: code4 });
  ok("8.5 · ⛔ …and no refund notice before the money lands", (await withHref(A, refundHref)).length === 0 && millioneaLetters().length === 0);
  await fault(-1);
  // Round 3 (A8) · A RUN THAT STOPPED BETWEEN A BELL AND ITS LETTER: A's refund bell is already there (written exactly as the
  // run writes it) and no letter's record says it went — so the refund's run owes A the letter, and sends it once.
  await N.notifyMillioneaWeekRefunded(A, { weekCode: code4, tickets: 2, refundedTzs: 2 * priceOf(w4row) });
  // Round 4 (M6) · A's letter goes out, and the provider's answer is AMBIGUOUS (its timeout, a 2xx with no MessageID): it
  // may have been delivered, so it is recorded as gone and never sent again — and the run is complete.
  // Round 5 (LOW 12) · …and each holder's own records are read AT the send: its attempt must already be there.
  const doneAtSend: Array<number | null> = [];
  // Round 7 (M2) · no search leaves this suite: until §8.11 answers it, every search is unread.
  const quietSearch = notify.withMillioneaLetterSearch(async () => null);
  const realLetters = notify.withMillioneaLetterSender(async (userId: string, build: any, opts: any) => {
    doneAtSend.push(await notify.millioneaLettersDone(w4.id, "refund", [userId]));
    const real = await email.sendEmailToUser(userId, build, opts);
    return userId === A ? { ok: false, reason: "failed", failure: "ambiguous" } : real;
  });
  const landed = await W.svc.voidWeek({ weekId: w4.id, now: at4 });
  await settleAll();
  realLetters();
  const ra = await withHref(A, refundHref);
  const rc = await withHref(C, refundHref);
  ok("8.6 · ⭐ the refund landed: one REFUND notice for each holder, stating their own refund",
    landed.ok && ra.length === 1 && rc.length === 1 && ra[0].kind === "REFUND" && String(ra[0].bodyEn).includes(formatTzs(2 * priceOf(w4row))) && String(rc[0].bodyEn).includes(formatTzs(priceOf(w4row))), J(landed.ok ? [ra, rc] : landed));
  ok("8.7 · ⭐ round 3 · the letter to the confirmed address only — sent although A's bell was already there: the letter it was owed",
    millioneaLetters().length === 1 && millioneaLetters()[0].to === aMail && millioneaLetters()[0].tag === "millionea-refund", J(millioneaLetters().map((m) => [m.to, m.tag])));
  const refundRun = (await getAuditForTargetsDurable({ targetType: "MaswaliCycle", targetIds: [w4.id], actions: ["maswali.notices.sent"], sinceIso: "1970-01-01T00:00:00.000Z", limit: 50 }))
    .entries.find((e: any) => e.payload?.notice === "refund")?.payload as any;
  ok("8.7b · ⭐ rounds 4 and 7 (M6, M2) · a letter the provider may have delivered is never sent again by the run, and not yet called gone: counted ambiguous and unresolved, the refund's run not complete",
    refundRun?.complete === false && refundRun?.letters?.ambiguous === 1 && refundRun?.letters?.unresolved === 1 && !refundRun?.letters?.failed, J(refundRun));
  const base = { notice: "refund", weekId: "mlw_unit", recipients: 1, sent: 1, alreadySent: 0, failed: 0, permanent: {}, sms: null,
    calledInLock: false, calledInTx: false, skipped: null } as any;
  ok("8.7c · ⭐ round 4 (M6) · a failure by its kind: a definite refusal is sent again (the run stays owed); one that may have been delivered, or can never go, is done",
    notify.letterOutcome({ ok: false, reason: "failed", failure: "refused" }) === "failed" && notify.letterOutcome({ ok: false, reason: "failed" }) === "failed"
      && notify.letterOutcome({ ok: false, reason: "failed", failure: "ambiguous" }) === "ambiguous" && notify.letterOutcome({ ok: false, reason: "failed", failure: "permanent" }) === "bounced"
      && notify.letterOutcome({ ok: true, reason: "sent" }) === "sent"
      && !notify.millioneaRunComplete({ ...base, letters: { failed: 1 } }) && notify.millioneaRunComplete({ ...base, letters: { ambiguous: 1, bounced: 1, "no-address": 1 } })
      && !notify.millioneaRunComplete({ ...base, letters: { ambiguous: 1, unresolved: 1 } }));
  ok("8.7c2 · ⭐ round 15 · the provider's own 5xx is a letter it may have taken for a MONEY letter (searched before any resend), and a refusal sent again for any other",
    notify.letterOutcome({ ok: false, reason: "failed", failure: "refused", serverError: true } as any, true) === "ambiguous"
      && notify.letterOutcome({ ok: false, reason: "failed", failure: "refused", serverError: true } as any) === "failed"
      && notify.letterOutcome({ ok: false, reason: "failed", failure: "refused" }, true) === "failed");
  ok("8.7d · ⭐ round 5 (LOW 12) · each letter's attempt is recorded BEFORE it is sent: at the send, its holder's own records already count it done — a run that dies mid-send never sends it twice",
    doneAtSend.length === 2 && doneAtSend.every((n) => n === 1), J(doneAtSend));
  const atMs = (ms: number) => new Date(Date.parse("2026-10-18T09:00:00.000Z") + ms).toISOString();
  const rec = (ms: number, outcome: string, notice = "refund") => ({ createdAt: atMs(ms), payload: { notice, outcome } });
  // The records newest first, as the read returns them.
  const done = (records: ReturnType<typeof rec>[]) => notify.millioneaLetterDone(records, "refund");
  ok("8.7e · ⭐ round 5 (LOW 12) · the newest record decides: an attempt with no outcome is done (never sent twice); a definite refusal after it is owed again, and a later attempt done once more",
    !done([]) && done([rec(0, "attempt")]) && !done([rec(5, "failed"), rec(0, "attempt")]) && done([rec(5, "sent"), rec(0, "attempt")])
      && done([rec(9, "attempt"), rec(5, "failed"), rec(0, "attempt")]) && !done([rec(0, "failed")])
      && !done([rec(0, "attempt", "result")]) && done([rec(0, "ambiguous"), rec(0, "attempt")]));
  ok("8.7e2 · ⭐ round 6 (L2) · two records that share an instant are decided by their order, never by the instant: an attempt read first is done, a refusal read first is owed again",
    done([rec(0, "attempt"), rec(0, "failed")]) && !done([rec(0, "failed"), rec(0, "attempt")])
      // round 7 (M2) · a search that found no such letter, its one resend not yet gone: owed.
      && !done([rec(5, "absent"), rec(0, "ambiguous"), rec(0, "attempt")]) && done([rec(9, "ambiguous"), rec(8, "attempt"), rec(5, "absent")]));
  const auditSrc8 = readFileSync(join(ROOT, "src/lib/server/audit.ts"), "utf8").replace(/\r\n/g, LF);
  // ⭐ Round 17 (H1) · this slice had the name of §8.4's owed-refund row in the same block, so the child never compiled.
  const stepFileSrc = readFileSync(join(ROOT, "src/lib/server/maswali-notify.ts"), "utf8").replace(/\r\n/g, LF);
  const stepSrc = stepFileSrc.slice(stepFileSrc.indexOf("async function letterStep("), stepFileSrc.indexOf("async function resolveLetter("));
  ok("8.7g · ⭐ round 6 (L1, L2) · a letter's records are read whenever its bell is there (only a failed bell owes nothing), and the durable read breaks a shared instant by insertion order",
    stepSrc.includes('if (bell === "failed") return;') && !stepSrc.includes('if (bell === "wrote")')
      && auditSrc8.includes('orderBy: [{ createdAt: "desc" }, { seq: "desc" }],'), `${stepSrc.length} chars`);
  const notifySrc8 = readFileSync(join(ROOT, "src/lib/server/maswali-notify.ts"), "utf8").replace(/\r\n/g, LF);
  const sender = notifySrc8.slice(notifySrc8.indexOf("async function sendLetter("), notifySrc8.indexOf("export function millioneaSmsTally("));
  const unrecorded = sender.indexOf("if (!attempt.recorded) {");
  const countedFailed = sender.indexOf("r.letters.failed = (r.letters.failed ?? 0) + 1;");
  ok("8.7f · ⭐ round 5 (LOW 12) · a letter whose attempt could not be recorded is not sent now — counted failed for the reconcile — and every money letter goes through that one door",
    // ⭐ Round 17 (H1) · re-pinned to round 8's send, which hands each letter the metadata that names it.
    sender.length > 200 && unrecorded > 0 && countedFailed > unrecorded && sender.indexOf("const res = await job.send({ letter: letterMetadata(target) });") > countedFailed
      && (notifySrc8.match(/send: \(metadata\) => LETTERS\.send\(/g) ?? []).length === 3 && (notifySrc8.match(/await sendLetter\(r, userId, job\)/g) ?? []).length === 2
      && !/[^a-zA-Z]letter\(r, /.test(notifySrc8),
    `${sender.length} chars`);
  ok("8.8 · ⭐ CONTROL · a landed refund shows no row: the week is off the integrity view",
    !(await consoleRead.owedRefunds()).some((r: any) => r.weekId === w4.id) && !(await consoleRead.integrityView(at4)).owedRefunds?.some((r: any) => r.weekId === w4.id));
  await ageNotices([A, C]);
  const rerun = await notify.noticeWeekRefunded(w4.id);
  const resumed = await W.svc.voidWeek({ weekId: w4.id, now: at4 });
  await settleAll();
  ok("8.9 · a second run (outside the duplicate window) and a second void send nothing", rerun.sent === 0 && rerun.alreadySent === 2 && resumed.ok && resumed.already === true
    && (await withHref(A, refundHref)).length === 1 && millioneaLetters().length === 1, J([rerun, resumed]));
  // Round 4 (L1) · A LETTERS' READ CUT SHORT: the run's own read of its holders' letter records is limited to one record, so
  // it is truncated — and answers "not known", never a list that may lack a holder. Each holder's own records are then read,
  // and no letter goes twice.
  (globalThis as any).__50PICK_MLN_LETTER_READ_LIMIT = 1;
  const cut = await notify.millioneaLettersDone(w4.id, "refund", [A, C]);
  await ageNotices([A, C]);
  const perHolder = await notify.noticeWeekRefunded(w4.id);
  await settleAll();
  delete (globalThis as any).__50PICK_MLN_LETTER_READ_LIMIT;
  const whole = await notify.millioneaLettersDone(w4.id, "refund", [A, C]);
  ok("8.10a · ⭐ round 4 (L1) · a letters' read cut short answers \"not known\" (null) — the whole read knows both holders' letters done",
    cut === null && whole === 2, J({ cut, whole }));
  ok("8.10b · ⭐ …and the run then reads each holder's own records: no letter goes twice",
    perHolder.sent === 0 && !perHolder.letters.sent && !perHolder.letters.ambiguous && !perHolder.letters.failed && millioneaLetters().length === 1, J(perHolder));
  // ⭐ Round 5 (LOW 15) · the read limit is a SUITE'S seam: under NODE_ENV=production it is never honoured — the same read,
  // with the same limit planted, is read whole. (The audit queue is drained first, so nothing is written while it is set.)
  (globalThis as any).__50PICK_MLN_LETTER_READ_LIMIT = 1;
  await auditFlush();
  const nodeEnv = process.env.NODE_ENV;
  let prodRead: number | null = null;
  try {
    (process.env as any).NODE_ENV = "production";
    prodRead = await notify.millioneaLettersDone(w4.id, "refund", [A, C]);
  } finally {
    if (nodeEnv === undefined) delete (process.env as any).NODE_ENV; else (process.env as any).NODE_ENV = nodeEnv;
    delete (globalThis as any).__50PICK_MLN_LETTER_READ_LIMIT;
  }
  ok("8.10c · ⭐ round 5 (LOW 15) · the read limit is a suite's seam only: in production the same read, with the limit planted, is read whole",
    prodRead === 2 && cut === null && process.env.NODE_ENV === nodeEnv, J({ prodRead, cut }));
  // ⭐ Round 7 (M2, the lead's decision) · A's refund letter may have been taken: before it is called gone, the provider's own
  // search is asked — unread: it stays unresolved (the run not complete, the console lists it), never resent; absent:
  // recorded, and sent ONCE more; absent again: never again; found: confirmed, and the run is complete.
  const searchedFor: any[] = [];
  let answer: "found" | "absent" | null = null;
  const putSearchBack = notify.withMillioneaLetterSearch(async (q: any) => { searchedFor.push(q); return answer; });
  let resent = 0;
  const sentMeta: any[] = [];
  const putSenderBack = notify.withMillioneaLetterSender(async (userId: string, build: any, opts: any) => {
    if (userId === A) { resent++; sentMeta.push(build(aMail, { onBreak: false })?.metadata); return { ok: false, reason: "failed", failure: "ambiguous" } as any; }
    return email.sendEmailToUser(userId, build, opts);
  });
  // ⭐ Round 8 (M2) · a letter attempted minutes ago is never searched for: the provider's own request may be in flight.
  const s0 = await notify.noticeWeekRefunded(w4.id);
  await settleAll();
  ok("8.11·m2 · ⭐ round 8 (M2) · a letter attempted within the search margin is not searched for — it stays unresolved this run",
    searchedFor.length === 0 && resent === 0 && s0.letters.unresolved === 1, J({ letters: s0.letters, searchedFor }));
  (globalThis as any).__50PICK_MLN_LETTER_SEARCH_MARGIN_MS = 0;
  const s1 = await notify.noticeWeekRefunded(w4.id);
  await settleAll();
  const listed = (await consoleRead.integrityView(at4)).unresolvedLetters;
  ok("8.11a · ⭐ round 7 (M2) · a refund letter the provider may have taken is searched for first, by its address and tag: an unread search leaves it unresolved — never resent, the run not complete — and the console lists the week",
    resent === 0 && s1.letters.unresolved === 1 && !notify.millioneaRunComplete(s1) && searchedFor.length === 1 && searchedFor[0]?.to === aMail
      && searchedFor[0]?.tag === "millionea-refund" && searchedFor[0]?.letter === notify.millioneaLetterMetadata(w4.id, A)
      && (listed?.rows ?? []).some((l: any) => l.weekId === w4.id && l.notice === "refund" && l.letters === 1) && listed?.truncated === false,
    J({ letters: s1.letters, searchedFor, listed }));
  answer = "absent";
  const s2 = await notify.noticeWeekRefunded(w4.id);
  await settleAll();
  ok("8.11b · ⭐ round 7 (M2) · the search found none: recorded, and the letter is sent ONCE more — that send's own outcome counted",
    resent === 1 && s2.letters.ambiguous === 1 && s2.letters.unresolved === 1, J({ letters: s2.letters, resent }));
  const s3 = await notify.noticeWeekRefunded(w4.id);
  await settleAll();
  ok("8.11c · ⭐ round 7 (M2) · none found again after that resend: never sent again — it stays unresolved for an officer",
    resent === 1 && s3.letters.unresolved === 1 && !s3.letters.sent, J({ letters: s3.letters, resent }));
  answer = "found";
  // ⭐ Round 17 (H1) · this run was named `s4`, the week's own start, which it hid for all of §8 (its first line read it).
  const s4run = await notify.noticeWeekRefunded(w4.id);
  await settleAll();
  const cleared = (await consoleRead.integrityView(at4)).unresolvedLetters;
  ok("8.11d · ⭐ round 7 (M2) · the search found it: recorded confirmed — the run is complete, and the console no longer lists the week",
    resent === 1 && s4run.letters.confirmed === 1 && !s4run.letters.unresolved && notify.millioneaRunComplete(s4run)
      && Array.isArray(cleared?.rows) && !cleared.rows.some((l: any) => l.weekId === w4.id), J({ letters: s4run.letters, cleared }));
  // ⭐ Round 8 (M3) · an attempt with no outcome after it (its outcome's row never landed) is resolved as an ambiguous letter
  // is — never counted done unseen.
  await audit({ category: "SYSTEM", action: "maswali.notice.letter", actorId: null, targetType: "MaswaliLetter",
    targetId: notify.millioneaLetterTarget(w4.id, A), payload: { notice: "refund", outcome: "attempt" } } as any);
  const s5 = await notify.noticeWeekRefunded(w4.id);
  await settleAll();
  ok("8.11e · ⭐ round 8 (M3) · a letter whose newest record is a bare attempt is searched for, and confirmed when the provider has it",
    resent === 1 && s5.letters.confirmed === 1 && searchedFor.length >= 4, J({ letters: s5.letters, searched: searchedFor.length }));
  // ⭐ S6-NOTICES (L-3) · the week's newest record must say the letter's cause, not only whether the run completed: one more
  // bare attempt whose search cannot answer leaves the run NOT complete (it may have gone) — so the run below, also not
  // complete, is recorded only because the letter's cause changed (8.11f2 reads that record).
  await audit({ category: "SYSTEM", action: "maswali.notice.letter", actorId: null, targetType: "MaswaliLetter",
    targetId: notify.millioneaLetterTarget(w4.id, A), payload: { notice: "refund", outcome: "attempt" } } as any);
  answer = null;
  const sA = await notify.noticeWeekRefunded(w4.id);
  await settleAll();
  answer = "found";
  // ⭐ Round 9 (L3) · an attempt recorded for another address than today's is never searched for, nor resent.
  const searchedBefore = searchedFor.length;
  await audit({ category: "SYSTEM", action: "maswali.notice.letter", actorId: null, targetType: "MaswaliLetter",
    targetId: notify.millioneaLetterTarget(w4.id, A), payload: { notice: "refund", outcome: "attempt", addr: "an-address-no-longer-on-file" } } as any);
  const s6 = await notify.noticeWeekRefunded(w4.id);
  await settleAll();
  ok("8.11f · ⭐ round 9 (L3) · a letter attempted to an address no longer on file stays unresolved — never searched, never resent",
    s6.letters.unresolved === 1 && searchedFor.length === searchedBefore && resent === 1, J({ letters: s6.letters, searched: searchedFor.length - searchedBefore }));
  // ⭐ S6-NOTICES (L-3) · that letter is counted by its own cause — its search can never be asked — and the integrity card says
  // so: the run's record, the card's row and the opened row's letter (its holder, provider tag and attempts) each name it.
  const rowF = (await consoleRead.unresolvedLetters()).rows.find((l: any) => l.weekId === w4.id && l.notice === "refund");
  const openF = await notify.millioneaOpenLetters(w4.id, "refund");
  const listF = await consoleRead.unresolvedLetterList(openF, 1);
  ok("8.11f2 · ⭐ S6-NOTICES (L-3) · a letter whose address changed since its attempt is counted apart — the run, the card's row and the opened list each say its search can never be asked, with its holder, tag and attempts",
    sA.letters.unresolved === 1 && !sA.letters.unmatched && !notify.millioneaRunComplete(sA)
      && s6.letters.unmatched === 1 && J(rowF?.causes) === J({ uncertain: 0, unmatched: 1, resendOwed: 0, capped: 0 }) && rowF?.letters === 1 && rowF?.unread === 0 && rowF?.deferred === 0
      && openF?.length === 1 && openF[0].userId === A && openF[0].cause === "unmatched" && openF[0].tag === notify.millioneaLetterMetadata(w4.id, A)
      && openF[0].attempts.length >= 2 && openF[0].attempts.every((x: string) => Number.isFinite(Date.parse(x)))
      && listF?.total === 1 && listF.rows[0].userId === A && typeof listF.rows[0].holder === "string" && listF.rows[0].holder.length > 0,
    J({ sA: sA.letters, letters: s6.letters, rowF, openF, listF }));
  // ⭐ Round 10 (L4) · an officer records the check: the row leaves the integrity card — and a later run of the notice lists
  // it again.
  const clearedBy = await consoleRead.clearUnresolvedLetter({ weekId: w4.id, notice: "refund", officerId: "usr_mln_notify_officer", typed: "CHECKED", note: "the provider's activity was checked" });
  const afterCheck = (await consoleRead.integrityView(at4)).unresolvedLetters;
  ok("8.11g · ⭐ round 10 (L4) · an officer's recorded check takes the week's row off the integrity card",
    clearedBy.ok && Array.isArray(afterCheck?.rows) && !afterCheck.rows.some((l: any) => l.weekId === w4.id && l.notice === "refund"), J({ clearedBy, afterCheck }));
  // ⭐ S6-NOTICES (L-4) · the check's answer says how many letters it closed — the officer's note the action passes on.
  ok("8.11g3 · ⭐ S6-NOTICES (L-4) · the check's answer says how many letters it closed, and that they are closed for good — never \"the letters were checked\" alone",
    (clearedBy as any).note === "Recorded: 1 letter closed — never searched for or sent again."
      && consoleRead.lettersClosedNote(3) === "Recorded: 3 letters closed — never searched for or sent again."
      && consoleRead.lettersClosedNote(1_200) === "Recorded: 1,200 letters closed — never searched for or sent again."
      && consoleRead.lettersClosedNote(0) === "Recorded. No letter of this week was open, so none was closed.",
    J(clearedBy));
  // ⭐ Round 17 (M5, the lead's ruling) · the check CLOSES the letter it listed, on the holder's own record: a later run whose
  // search reads "absent" — which would have sent it once more — searches nothing and sends nothing, and completes.
  await auditFlush();
  const closedRec = (await getAuditForTargetsDurable({ targetType: "MaswaliLetter", targetIds: [notify.millioneaLetterTarget(w4.id, A)],
    actions: ["maswali.notice.letter"], sinceIso: "1970-01-01T00:00:00.000Z", limit: 50 })).entries.find((e: any) => e.payload?.notice === "refund");
  const weekCheck = (await getAuditForTargetsDurable({ targetType: "MaswaliCycle", targetIds: [w4.id], actions: [consoleRead.LETTERS_CLEARED_ACTION],
    sinceIso: "1970-01-01T00:00:00.000Z", limit: 50 })).entries.find((e: any) => e.payload?.notice === "refund");
  answer = "absent";
  const searchedAtCheck = searchedFor.length;
  const resentAtCheck = resent;
  const afterClose = await notify.noticeWeekRefunded(w4.id);
  await settleAll();
  answer = "found";
  ok("8.11g2 · ⭐ round 17 (M5) · the officer's check closed the letter on its holder's own record — and a later run whose search would read \"absent\" searches nothing and sends nothing, and completes",
    clearedBy.ok && (clearedBy as any).closed === 1 && closedRec?.payload?.outcome === "cleared" && closedRec?.category === "COMPLIANCE"
      && closedRec?.actorId === "usr_mln_notify_officer" && weekCheck?.payload?.closed === 1
      && searchedFor.length === searchedAtCheck && resent === resentAtCheck && notify.millioneaRunComplete(afterClose) && !afterClose.letters.unresolved,
    J({ clearedBy, closed: closedRec?.payload, category: closedRec?.category, weekCheck: weekCheck?.payload, searched: searchedFor.length - searchedAtCheck,
      resent: resent - resentAtCheck, letters: afterClose.letters }));
  await audit({ category: "SYSTEM", action: "maswali.notices.sent", actorId: null, targetType: "MaswaliCycle", targetId: w4.id,
    payload: { notice: "refund", weekId: w4.id, letters: { unresolved: 1 }, complete: false } } as any);
  const listedAgain = (await consoleRead.integrityView(at4)).unresolvedLetters;
  const refused = await consoleRead.clearUnresolvedLetter({ weekId: w4.id, notice: "refund", officerId: "usr_mln_notify_officer", typed: "checked", note: "no" });
  ok("8.11h · control · a run recorded after the check lists the row again — and a check without its word is refused",
    (listedAgain?.rows ?? []).some((l: any) => l.weekId === w4.id && l.notice === "refund") && !refused.ok, J({ listedAgain, refused }));
  // ⭐ Round 12 (a) · the read takes weeks newest-ended first, whatever their line: a drive week's code never puts it behind
  // public ones.
  const ended = consoleRead.newestEndedFirst([
    { code: "MLN-2026-W40", settledAt: "2026-10-04T18:00:00.000Z", updatedAt: "2026-10-04T18:00:00.000Z" },
    { code: "MLD-2026-W41", settledAt: "2026-10-11T18:00:00.000Z", updatedAt: "2026-10-11T18:00:00.000Z" },
    { code: "MLN-2026-W39", settledAt: null, updatedAt: "2026-10-08T09:00:00.000Z" },
  ] as any).map((w: any) => w.code);
  ok("8.11i · ⭐ round 12 · the unresolved-letter read takes weeks newest-ended first: a drive week ahead of older public ones, a voided week by its last write",
    J(ended) === J(["MLD-2026-W41", "MLN-2026-W39", "MLN-2026-W40"]), J(ended));
  // ⭐ Round 12 (b) · a week whose own records outrun one read: the card says it read that week in part, never that every
  // letter is known.
  for (let i = 0; i < 50; i++) {
    await audit({ category: "COMPLIANCE", action: consoleRead.LETTERS_CLEARED_ACTION, actorId: "usr_mln_notify_officer", targetType: "MaswaliCycle",
      targetId: w4.id, payload: { code: w4.code, notice: "result", note: "a check of the other notice" } } as any);
  }
  const inPart = (await consoleRead.integrityView(at4)).unresolvedLetters;
  ok("8.11j · ⭐ round 12 · a week whose records outrun one read is reported as read in part, where before it was read whole",
    listedAgain?.partial === false && inPart?.partial === true, J({ before: listedAgain?.partial, inPart }));
  // ⭐ Round 13 (the lead's ruling) · a pepper rotation never resends a money letter: the letter's records stay readable
  // (their target is the week and the account), and an attempt made under another pepper is listed, never searched or
  // resent; back under its own pepper it is matched again; a confirmed letter and a completed run stay done.
  const pepperWas = process.env.OTP_PEPPER;
  const pepperTo = (v: string | undefined) => { if (v === undefined) delete (process.env as any).OTP_PEPPER; else (process.env as any).OTP_PEPPER = v; };
  try {
    await audit({ category: "SYSTEM", action: "maswali.notice.letter", actorId: null, targetType: "MaswaliLetter",
      targetId: notify.millioneaLetterTarget(w4.id, A), payload: { notice: "refund", outcome: "failed" } } as any);
    const resent0 = resent;
    const r7 = await notify.noticeWeekRefunded(w4.id);
    await settleAll();
    const searched0 = searchedFor.length;
    pepperTo(`${pepperWas ?? "the-suite-pepper"}-rotated`);
    const r8 = await notify.noticeWeekRefunded(w4.id);
    await settleAll();
    ok("8.11k · ⭐ round 13 · the pepper rotated between a money letter's attempt and the next run: the letter is listed for an officer — never searched, never resent",
      resent === resent0 + 1 && r7.letters.ambiguous === 1 && searchedFor.length === searched0 && r8.letters.unresolved === 1 && !r8.letters.sent,
      J({ r7: r7.letters, r8: r8.letters, resent: resent - resent0, searched: searchedFor.length - searched0 }));
    pepperTo(pepperWas);
    const r9 = await notify.noticeWeekRefunded(w4.id);
    await settleAll();
    const searched1 = searchedFor.length;
    pepperTo(`${pepperWas ?? "the-suite-pepper"}-rotated`);
    const r10 = await notify.noticeWeekRefunded(w4.id);
    await settleAll();
    ok("8.11l · ⭐ round 13 · under its own pepper again the attempt is matched and confirmed — and across a rotation the confirmed letter stays done: no search, no resend",
      r9.letters.confirmed === 1 && searched1 === searched0 + 1 && searchedFor.length === searched1 && resent === resent0 + 1 && !r10.letters.unresolved,
      J({ r9: r9.letters, r10: r10.letters, searched: searchedFor.length - searched0 }));
    ok("8.11m · ⭐ round 13 · a week whose run completed is not revisited into a resend under a rotated pepper: nothing is sent, the run still complete",
      notify.millioneaRunComplete(r9) && notify.millioneaRunComplete(r10) && !r10.letters.sent && !r10.letters.ambiguous && resent === resent0 + 1,
      J({ r9: r9.letters, r10: r10.letters }));
  } finally {
    pepperTo(pepperWas);
  }
  // ⭐ Round 14 (the lead's ruling) · no account id leaves for the provider: a money letter is sent, and searched for, by a
  // one-way digest of its letter — neither the account id nor the address.
  const meta = notify.millioneaLetterMetadata(w4.id, A);
  ok("8.11n · ⭐ round 14 · a money letter's provider metadata is a digest that carries neither the account id nor the address — and the search asks by the same digest",
    /^[0-9a-f]{32}$/.test(meta) && !meta.includes(A) && !meta.includes(aMail) && sentMeta.length >= 2 && sentMeta.every((m: any) => J(m) === J({ letter: meta }))
      && searchedFor.length > 0 && searchedFor.every((q: any) => q?.letter === meta), J({ meta, sentMeta, searched: searchedFor.map((q: any) => q?.letter) }));
  delete (globalThis as any).__50PICK_MLN_LETTER_SEARCH_MARGIN_MS;
  putSenderBack();
  putSearchBack();
  quietSearch();
}

// ── §9 · accounts that cannot sign in; paid and held shares ────────────────────────────────────────────
console.log(`${LF}§9 · accounts that cannot sign in (OD-13) — a paid winner, a held winner, a loser; paid beside held`);
{
  const { week: w5, start: s5 } = await W.openWeek({ weeksAhead: ahead++ });
  const x = await W.buy(X, w5.id, [W.WIN]);
  const z = await W.buy(Z, w5.id, [W.WIN]);
  const y = await W.buy(Y, w5.id, [W.LOSE]);
  const q = await W.buy(Q, w5.id, [W.WIN]);
  // Round 3 (A12) · a number this gateway can never dial (another country's): its SMS is refused for good, never retried.
  await W.setUserFields(Q, { phoneE164: "+254712000001" });
  await W.setUserFields(X, { status: "SELF_EXCLUDED" });
  await W.setUserFields(Z, { status: "SUSPENDED" });
  await W.setUserFields(Y, { status: "SELF_EXCLUDED" });
  const at5 = await W.closeAndSeal(w5, s5);
  email.clearEmailOutbox();
  credit(5_000_000);
  // Round 3 (A5) · ON POSTGRES, ANOTHER PROCESS HOLDS THIS WEEK'S RESULT LEASE: the release's own run must tell nobody, and
  // once that lease has lapsed the reconcile tells the week (the memory store is one process: its lease is always its own).
  const leaseKey = `__LEADER_${notify.noticeLeaseTask("result", w5.id)}__`;
  if (W.onPostgres) await saveConfigOrThrow(leaseKey, { holder: "another-instance", expiresAt: Date.now() + 10 * 60_000, renewedAt: Date.now() });
  const rel = await W.release(w5.id, at5);
  await settleAll();
  if (W.onPostgres) {
    await eventually(async () => notify.millioneaNoticeRuns().some((x: any) => x.notice === "result" && x.weekId === w5.id), 5_000);
    await settleAll();
    const skipped = notify.millioneaNoticeRuns().filter((x: any) => x.notice === "result" && x.weekId === w5.id);
    ok("9.0a · ⭐ round 3 · while another process holds the week's lease the release's own run tells nobody: no bell, no letter, no SMS",
      rel.ok && skipped.length === 1 && skipped[0].skipped === "lease" && skipped[0].recipients === 0 && (await winnerTargets(w5.id)).length === 0
        && (await withHref(X, href({ notice: "result", weekCode: w5.code, winningSerial: x.data.maswali.tickets[0].serial }))).length === 0
        && !email.emailOutbox().some((m) => m.to === mailOf(X)), J(skipped));
    // Round 4 (M5) · the tick's own pass (not forced) while the lease is still held: the week is skipped — and NOT marked as
    // reconciled, so the next tick tries it again (a deploy's overlap must not delay its notices by an hour).
    // Round 5 (L2 with M5) · …and the week's float is read by the process that holds its lease, once it holds it — never
    // once a tick while another process holds it.
    let heldFloats = 0;
    const held = await notify.reconcileMillioneaNotices(new Date(), { readFloat: async () => { heldFloats++; return { balance: 1_000_000_000_000 }; } });
    await settleAll();
    ok("9.0a2 · ⭐ rounds 4 and 5 (M5, L2) · the tick's pass while another process holds the lease skips the week, and says so — nobody told, and no float read",
      held.skipped >= 1 && (await winnerTargets(w5.id)).length === 0 && heldFloats === 0, J({ held, heldFloats }));
    await saveConfigOrThrow(leaseKey, { holder: "another-instance", expiresAt: Date.now() - 1, renewedAt: Date.now() });
    let floatAt5 = 0;
    const firstSmsBefore = Date.now();
    const rec = await notify.reconcileMillioneaNotices(new Date(), { readFloat: async () => { floatAt5 = Date.now(); return { balance: 1_000_000_000_000 }; } });
    await settleAll();
    ok("9.0b · ⭐ round 4 (M5) · …and once that lease has lapsed, the very next tick (not forced, within the hour) takes it and tells the week",
      rec.reran >= 1 && (await winnerTargets(w5.id)).length === 2, J(rec));
    ok("9.0c · ⭐ round 4 (L2) · …its float compared first: the week had no run record yet",
      floatAt5 >= firstSmsBefore && (await winnerTargets(w5.id)).every((m: any) => Date.parse(m.createdAt) >= floatAt5), J({ floatAt5 }));
    // ⭐ Round 5 (L3) · ON POSTGRES, A LEASE READ THAT FAILS takes no lease: with the config table out of reach for one run,
    // the week's run skips and tells nobody — and the table is put back at once.
    const pg: any = (await import("../../src/lib/server/prisma.ts")).prisma();
    await settleAll();
    let unreadLease: any = null;
    await pg.$executeRawUnsafe('ALTER TABLE "SystemConfig" RENAME TO "SystemConfig_l3_probe"');
    try {
      unreadLease = await notify.noticeWeekSettled(w5.id);
    } finally {
      await pg.$executeRawUnsafe('ALTER TABLE "SystemConfig_l3_probe" RENAME TO "SystemConfig"');
    }
    ok("9.0d · ⭐ round 5 (L3) · on Postgres, a lease read that FAILS takes no lease: the run skips and tells nobody",
      unreadLease?.skipped === "lease" && unreadLease?.recipients === 0 && unreadLease?.sent === 0, J(unreadLease));
  }
  const code5 = (await dal.weekStore.get(w5.id)).code as string;
  const wx = await withHref(X, href({ notice: "result", weekCode: code5, winningSerial: x.data.maswali.tickets[0].serial }));
  const wz = await withHref(Z, href({ notice: "result", weekCode: code5, winningSerial: z.data.maswali.tickets[0].serial }));
  const ly = await withHref(Y, href({ notice: "result", weekCode: code5, winningSerial: null }));
  ok("9.1 · ⭐ a paid winner who cannot sign in is told the team pays it when they ask — no withdrawal ladder",
    x.ok && z.ok && y.ok && rel.ok && wx.length === 1 && wx[0].kind === "WIN" && String(wx[0].bodyEn).includes("Our team pays it to your registered number when you ask")
      && !String(wx[0].bodyEn).includes("To withdraw"), wx[0]?.bodyEn);
  ok("9.2 · ⭐ LOW 9 · a winner whose every share is held is told as a VERDICT — never a gold WIN — with no figure",
    wz.length === 1 && wz[0].kind === "VERDICT" && String(wz[0].bodyEn).includes("is held for now") && !/TZS/.test(`${wz[0].titleEn} ${wz[0].bodyEn}`), J(wz[0]));
  ok("9.3 · a loser who cannot sign in is told plainly", ly.length === 1 && ly[0].kind === "LOSS" && String(ly[0].titleEn).includes("did not win"), ly[0]?.titleEn);
  const lx = email.emailOutbox().find((m) => m.to === mailOf(X));
  const lz = email.emailOutbox().find((m) => m.to === mailOf(Z));
  const lyl = email.emailOutbox().find((m) => m.to === mailOf(Y));
  ok("9.4 · ⭐ each letter goes to the address on file (it can never be confirmed now): the paid win gold, the held win royal, the loss royal",
    !!lx && lx.html.includes(GOLD_BAR) && lx.html.includes("reply to this letter") && !!lz && !lz.html.includes(GOLD_BAR) && !!lyl && !lyl.html.includes(GOLD_BAR),
    J(email.emailOutbox().map((m) => [m.to, m.tag])));
  const bx = smsBodiesTo(await phoneOf(X));
  const bz = smsBodiesTo(await phoneOf(Z));
  ok("9.5 · …and each winner's one SMS says the one true next step: support for the paid share, the team's call for the held one",
    bx.some((s) => s.includes("Contact 50pick support to receive it.")) && bz.some((s) => s.includes("The share is held for now")) && smsBodiesTo(await phoneOf(Y)).length === 0, J({ bx, bz }));
  // A winner holding both paid and held shares (a settlement holds by account, so the mix is driven on the notice itself).
  // ⛔ ON A WEEK CODE NO RUN CAN REACH (round 3, A3): a reachable code (the old MLN-2026-W50) became the final week's own
  // in a run between 19 and 25 October, and this row then stood in for that week's win — 12.1 read it and failed.
  const mix = await N.notifyMillioneaWon(A, { weekCode: "MLN-2000-W01", winningSerial: "MLN-2000-W01-000001", paidTickets: 1, paidTzs: 870_000, heldTickets: 1,
    shareTzs: 870_000, score: 10, maxPerWithdrawalTzs: WITHDRAW_MAX_TZS, withdrawalFeeRate: 0.015, cannotSignIn: false });
  const mixHtml = email.millioneaWinHtml({ weekNumber: 1, serials: ["MLN-2000-W01-000001", "MLN-2000-W01-000002"], paidTickets: 1, heldTickets: 1, shareTzs: 870_000,
    paidTzs: 870_000, score: 10, maxPerWithdrawalTzs: WITHDRAW_MAX_TZS, withdrawalFeeRate: 0.015, cannotSignIn: false, ticketHref: "/millionea/tickets/MLN-2000-W01-000001" });
  ok("9.6 · a winner holding paid and held shares: a WIN with the paid figure and the hold, the letter gold with both",
    !!mix && mix.kind === "WIN" && String(mix.bodyEn).includes(formatTzs(870_000)) && String(mix.bodyEn).includes("1 ticket is held for now")
      && mixHtml.includes(GOLD_BAR) && mixHtml.includes("held for now"), J(mix && mix.bodyEn));
  // Round 3 (A12) · Q's SMS was refused for good: counted with its reason, and the run is complete — so the reconcile
  // leaves the week (it re-ran such a week every hour for fourteen days, a record each time).
  const runs5 = await resultRuns(w5.id);
  await ageNotices([X, Z, Y, Q]);
  await notify.reconcileMillioneaNotices(new Date(), { force: true });
  await settleAll();
  ok("9.7 · ⭐ round 3 · a refusal that can never clear (a number the gateway cannot dial) is counted with its reason; the run is complete and the reconcile leaves the week",
    q.ok && runs5.length >= 1 && runs5[0]?.complete === true && runs5[0]?.sms?.permanent?.BAD_MSISDN === 1 && (await resultRuns(w5.id)).length === runs5.length,
    J(runs5[0]));
  // Round 4 (A12) · the other two refusals that can never clear, as a run tallies them: the SMS channel closed, and no rail.
  const closedCh = notify.millioneaSmsTally([{ kind: "held", reason: "channel_closed", winners: 1, costTzs: null }]);
  const noRail = notify.millioneaSmsTally([{ kind: "sent", accepted: 0, failed: 1, refused: "NOT_CONFIGURED", alreadySent: 0, notResent: 0, codes: { NOT_CONFIGURED: 1 } }]);
  ok("9.8 · ⭐ round 4 (A12) · the channel closed and NOT_CONFIGURED are refusals that can never clear: each counted with its reason, and the SMS is done",
    closedCh.done && closedCh.tally.permanent.channel_closed === 1 && noRail.done && noRail.tally.permanent.NOT_CONFIGURED === 1 && noRail.tally.notResent === 0,
    J({ closedCh, noRail }));
  const lowCredit = notify.millioneaSmsTally([{ kind: "held", reason: "credit_low", winners: 1, costTzs: 6 }]);
  const unknown = notify.millioneaSmsTally([{ kind: "sent", accepted: 0, failed: 1, refused: "UNKNOWN", alreadySent: 0, notResent: 0, codes: { UNKNOWN: 1 } }]);
  const rejected = notify.millioneaSmsTally([{ kind: "sent", accepted: 0, failed: 1, refused: "REJECTED", alreadySent: 0, notResent: 0, codes: { REJECTED: 1 } }]);
  const later = notify.millioneaSmsTally([{ kind: "sent", accepted: 0, failed: 0, refused: null, alreadySent: 0, notResent: 1, codes: {} }]);
  ok("9.8b · control · a credit too low leaves the SMS owed — ⭐ M-1 · a message lost in transport, or refused, is final: counted not resent, and the SMS is done; a later run counts it the same way, never as sent",
    !lowCredit.done && lowCredit.tally.held.credit_low === 1 && unknown.done && unknown.tally.notResent === 1 && rejected.done && rejected.tally.notResent === 1
      && later.done && later.tally.notResent === 1 && later.tally.already === 0, J({ lowCredit, unknown, rejected, later }));
}

// ── §10 · the control: a poll bet ─────────────────────────────────────────────────────────────────────
console.log(`${LF}§10 · CONTROL — a poll bet's own notice, as the poll writes it; no poll notice on a ticket`);
{
  const poll = await W.poll({ graceMin: 5 });
  const bet = await market.buyPosition(P, { marketId: poll.id, side: "YES", stake: 2_000 });
  const title = `Bet placed · ${sideWordIn("en", "YES", "MARKET")} ${formatTzs(2_000)}`;
  const landed = await eventually(async () => (await rowsOf(P)).some((n) => n.kind === "BET_PLACED" && n.titleEn === title));
  const pr = await rowsOf(P);
  ok("10.1 · ⭐ the poll bet's notice is the poll's own, exactly: \"Bet placed · YES TZS 2,000\", opening the poll's ticket",
    bet.ok && landed && pr.filter((n) => n.titleEn === title).length === 1 && pr.every((n) => !String(n.href ?? "").startsWith("/millionea")), J(pr.map((n) => [n.kind, n.titleEn, n.href])));
  const holderRows = (await Promise.all([A, B, C, X, Y, Z, V].map(rowsOf))).flat();
  ok("10.2 · ⛔ MB-68 · no poll notice ever reached a ticket holder: no \"Bet placed\", no \"the exact amount you receive\"",
    holderRows.length > 0 && holderRows.every((n) => ![n.titleEn, n.titleSw, n.bodyEn, n.bodySw].some((s: unknown) => POLL_WORDS.test(String(s ?? "")))),
    J(holderRows.filter((n) => POLL_WORDS.test(`${n.titleEn} ${n.bodyEn}`)).map((n) => n.titleEn)));
}

// ── §11 · never inside a money transaction ────────────────────────────────────────────────────────────
console.log(`${LF}§11 · never inside a money transaction — the witness is taken at each run's launch`);
{
  const runs = notify.millioneaNoticeRuns().slice();
  const inside = runs.filter((r) => r.calledInLock || r.calledInTx);
  ok(`11.1 · ⭐ MEDIUM 3 · every notice run (${runs.length}) was launched with no lock held and no transaction open — the witness read at its launch, before it escapes`,
    runs.length >= 25 && inside.length === 0 && ["receipt", "cancel", "closed", "closeMoved", "void", "correction", "result", "refund"].every((n) => runs.some((r) => r.notice === n)),
    J(inside.slice(0, 4).map((r) => [r.notice, r.weekId])));
  await locks.withLock("mlw_notify_probe", async () => { await notify.noticeSalesClosed(w1.id); });
  const probe = notify.millioneaNoticeRuns().slice(runs.length);
  ok("11.2 · control · the witness sees a lock: a run launched inside one is recorded as such", probe.length === 1 && probe[0].calledInLock === true, J(probe));
  // Round 3 (A4) · the three `afterCommit` triggers read the witness IN their hook, before it escapes every lock: the
  // reading must tell the hook (after the commit; on the memory store, still inside the lock that queued it) from a call
  // made inline inside the lock. `red:maswali-money-path` (N3) takes only `afterCommit(` away at the close, and 11.1 sees it.
  let inline: any = null;
  let hooked: any = null;
  await locks.withLock("mlw_notify_hook_probe", async (tx: any) => {
    inline = locks.hookContext();
    locks.afterCommit(tx, () => { hooked = locks.hookContext(); });
  });
  ok("11.3 · ⭐ round 3 · the hook's own reading: inline inside the lock it is in a lock; in the afterCommit hook it is not — on either store",
    inline?.inLock === true && inline?.inTx === W.onPostgres && hooked !== null && hooked.inLock === false && hooked.inTx === false, J({ inline, hooked }));
}

// ── §11b · ⭐ round 17 (B1) · a week's result and its refund, each launched twice in one process ─────────────────
console.log(`${LF}§11b · ⭐ round 17 (B1) · a week's result and its refund each launched again in one process — one run, one letter per holder`);
{
  const R1 = await W.user({ balance: 500_000 }); // wins the result week; holds a ticket of the void week
  const R2 = await W.user({ balance: 500_000 }); // loses the result week; holds a ticket of the void week
  for (const u of [R1, R2]) await W.setUserFields(u, { email: mailOf(u), emailVerifiedAt: iso() });
  const letters = new Map<string, string[]>();
  const putBack = notify.withMillioneaLetterSender(async (userId: string, build: any) => {
    letters.set(userId, [...(letters.get(userId) ?? []), String(build(mailOf(userId), { onBreak: false })?.tag)]);
    await sleep(100); // a provider's request takes a moment, so the launches overlap
    return { ok: true, reason: "sent" } as any;
  });
  try {
    // The result: the release's own run, the tick's reconcile (as the tick calls it) and a direct launch, in this process.
    const { week: wr, start: sr } = await W.openWeek({ weeksAhead: ahead++ });
    const r1 = await W.buy(R1, wr.id, [W.WIN]);
    const r2 = await W.buy(R2, wr.id, [W.LOSE]);
    const atR = await W.closeAndSeal(wr, sr);
    credit(100_000_000);
    const rel = await W.release(wr.id, atR);
    const p1 = notify.noticeWeekSettled(wr.id);
    const p2 = notify.noticeWeekSettled(wr.id);
    const rec = await notify.reconcileMillioneaNotices(new Date());
    await settleAll();
    ok("11b.1 · ⭐ round 17 (B1) · a week's result launched by its release, by the tick's reconcile and directly, in one process: one shared run, each holder's letter once",
      r1.ok && r2.ok && rel.ok && p1 === p2 && J(letters.get(R1)) === J(["millionea-win"]) && J(letters.get(R2)) === J(["millionea-result"]),
      J({ rel: rel.ok ? "ok" : rel, shared: p1 === p2, rec, letters: Object.fromEntries(letters) }));
    letters.clear();
    // The refund: the void's own commit, then the tick's reconcile and a direct launch.
    const { week: wv, start: sv } = await W.openWeek({ weeksAhead: ahead++ });
    const v1 = await W.buy(R1, wv.id, [W.WIN]);
    const v2 = await W.buy(R2, wv.id, [W.WIN]);
    const atV = await W.closeAndSeal(wv, sv, Array.from({ length: 15 }, (_, i) => (i < 6 ? { void: "not_played" } : "YES")));
    const voided = await W.svc.voidWeek({ weekId: wv.id, now: atV });
    const q1 = notify.noticeWeekRefunded(wv.id);
    const q2 = notify.noticeWeekRefunded(wv.id);
    const recV = await notify.reconcileMillioneaNotices(new Date());
    await settleAll();
    ok("11b.2 · ⭐ round 17 (B1) · a week void's refund launched by its commit, by the tick's reconcile and directly, in one process: one shared run, each holder's refund letter once",
      v1.ok && v2.ok && voided.ok && q1 === q2 && J(letters.get(R1)) === J(["millionea-refund"]) && J(letters.get(R2)) === J(["millionea-refund"]),
      J({ voided: voided.ok ? "ok" : voided, shared: q1 === q2, recV, letters: Object.fromEntries(letters) }));
  } finally {
    putBack();
  }
}

// ── §11c · ⭐ round 17 (B2) · a money letter whose holder's records cannot be read ──────────────────────────────
console.log(`${LF}§11c · ⭐ round 17 (B2) · a money letter whose records cannot be read is not sent now, and the run stays owed until it is`);
{
  const R3 = await W.user({ balance: 500_000 });
  await W.setUserFields(R3, { email: mailOf(R3), emailVerifiedAt: iso() });
  const sentTags: string[] = [];
  const putSender = notify.withMillioneaLetterSender(async (userId: string, build: any) => {
    if (userId === R3) sentTags.push(String(build(mailOf(userId), { onBreak: false })?.tag));
    return { ok: true, reason: "sent" } as any;
  });
  try {
    const { week: wu, start: su } = await W.openWeek({ weeksAhead: ahead++ });
    const bought = await W.buy(R3, wu.id, [W.WIN]);
    const targetU = notify.millioneaLetterTarget(wu.id, R3);
    // The holder's own letter records cannot be read — the week's batch read and the holder's own read both fail.
    const putRead = notify.withMillioneaLetterRecordsRead(async (q: any) => {
      if ((q?.targetIds ?? []).includes(targetU)) throw new Error("planted: the letters' records could not be read");
      return getAuditForTargetsDurable(q);
    });
    let rel: any = null;
    try {
      const atU = await W.closeAndSeal(wu, su);
      credit(100_000_000);
      rel = await W.release(wu.id, atU);
      await settleAll();
    } finally {
      putRead();
    }
    const first = (await resultRuns(wu.id))[0] ?? null;
    ok("11c.1 · ⭐ round 17 (B2) · a winner whose letter records cannot be read: no letter now, the holder counted unread, and the run recorded NOT complete",
      bought.ok && rel?.ok && sentTags.length === 0 && first?.complete === false && first?.letters?.unread === 1, J({ rel: rel?.ok ? "ok" : rel, first, sentTags }));
    // ⭐ S6-NOTICES (L-2) · that holder is never out of sight: the integrity card lists the week — one holder not read, no letter.
    const listedUnread = (await consoleRead.unresolvedLetters()).rows.find((l: any) => l.weekId === wu.id && l.notice === "result");
    ok("11c.1b · ⭐ S6-NOTICES (L-2) · …and the integrity card lists that week: one holder whose letter records could not be read, and no letter open",
      listedUnread?.unread === 1 && listedUnread?.letters === 0, J(listedUnread));
    // The records read again: the tick's reconcile comes back to the week and sends that letter, once.
    const rec = await notify.reconcileMillioneaNotices(new Date());
    await settleAll();
    const second = (await resultRuns(wu.id))[0] ?? null;
    ok("11c.2 · ⭐ round 17 (B2) · once the records read, the reconcile sends that letter once and the run completes",
      J(sentTags) === J(["millionea-win"]) && second?.complete === true && !second?.letters?.unread, J({ rec, second, sentTags }));
    ok("11c.2b · ⭐ S6-NOTICES (L-2) · …and the week leaves the integrity card",
      !(await consoleRead.unresolvedLetters()).rows.some((l: any) => l.weekId === wu.id));
  } finally {
    putSender();
  }
}

// ── §11d · ⭐ round 17 (M5) · an officer's check closes the letters it lists — and never runs beside the week's notice ─────
console.log(`${LF}§11d · ⭐ round 17 (M5) · an officer's check closes the letters it lists, and never runs beside the week's own notice`);
{
  const R4 = await W.user({ balance: 500_000 });
  await W.setUserFields(R4, { email: mailOf(R4), emailVerifiedAt: iso() });
  const OFFICER = "usr_mln_notify_officer";
  // Every refund letter to R4 is one the provider MAY have taken; every other letter goes as it would.
  const tags: string[] = [];
  const putSender = notify.withMillioneaLetterSender(async (userId: string, build: any, opts: any) => {
    if (userId !== R4) return email.sendEmailToUser(userId, build, opts);
    tags.push(String(build(mailOf(userId), { onBreak: false })?.tag));
    return { ok: false, reason: "failed", failure: "ambiguous" } as any;
  });
  // The provider's search: unread until a case answers it, and held open while a case keeps the week's run going.
  const searches: any[] = [];
  let answer: "found" | "absent" | null = null;
  let held: Promise<void> | null = null;
  let entered = () => {};
  const putSearch = notify.withMillioneaLetterSearch(async (q: any) => {
    searches.push(q);
    if (held) { entered(); await held; }
    return answer;
  });
  /** `p`, or a refusal to go on when it never comes (its timer cleared either way, so nothing fires after the case). */
  const within = async <T,>(p: Promise<T>, what: string): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([p, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(`11d: ${what} never came`)), 10_000); })]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
  try {
    const { week: wd, start: sd } = await W.openWeek({ weeksAhead: ahead++ });
    const bought = await W.buy(R4, wd.id, [W.WIN]);
    const atD = await W.closeAndSeal(wd, sd, Array.from({ length: 15 }, (_, i) => (i < 6 ? { void: "not_played" } : "YES")));
    const voided = await W.svc.voidWeek({ weekId: wd.id, now: atD });
    await settleAll();
    const targetD = notify.millioneaLetterTarget(wd.id, R4);
    const newestOf = async () => {
      await auditFlush();
      return (await getAuditForTargetsDurable({ targetType: "MaswaliLetter", targetIds: [targetD], actions: ["maswali.notice.letter"],
        sinceIso: "1970-01-01T00:00:00.000Z", limit: 50 })).entries.find((e: any) => e.payload?.notice === "refund");
    };
    const officerChecks = async () => {
      await auditFlush();
      return (await getAuditForTargetsDurable({ targetType: "MaswaliCycle", targetIds: [wd.id], actions: [consoleRead.LETTERS_CLEARED_ACTION],
        sinceIso: "1970-01-01T00:00:00.000Z", limit: 50 })).entries.length;
    };
    const checkD = (deps?: any) => consoleRead.clearUnresolvedLetter({ weekId: wd.id, notice: "refund", officerId: OFFICER, typed: "CHECKED",
      note: "the provider's activity was checked" }, deps);
    const premise = await newestOf();
    ok("11d.0 · round 17 (M5) · the premise: a voided week's refund letter the provider may have taken — its newest record ambiguous",
      bought.ok && voided.ok && J(tags) === J(["millionea-refund"]) && premise?.payload?.outcome === "ambiguous", J({ voided: voided.ok ? "ok" : voided, tags, premise: premise?.payload }));
    (globalThis as any).__50PICK_MLN_LETTER_SEARCH_MARGIN_MS = 0;

    // 11d.1 · the week's refund run is going (its search held open): a check now is refused, and closes nothing.
    let release = () => {};
    held = new Promise<void>((resolve) => { release = resolve; });
    const reached = new Promise<void>((resolve) => { entered = resolve; });
    const going = notify.noticeWeekRefunded(wd.id);
    await within(reached, "the run's search");
    const checksBefore = await officerChecks();
    const during = await checkD();
    held = null;
    release();
    const run1 = await going;
    await settleAll();
    ok("11d.1 · ⭐ round 17 (M5) · a check while the week's own run is going is refused — no letter closed, no check recorded — and the run goes on",
      !during.ok && (during as any).error === notify.LETTERS_BUSY && (await newestOf())?.payload?.outcome === "ambiguous"
        && (await officerChecks()) === checksBefore && run1.skipped === null && run1.letters.unresolved === 1 && J(tags) === J(["millionea-refund"]),
      J({ during, newest: (await newestOf())?.payload, run1: run1.letters, tags }));

    // 11d.2 · the check holds the week while it writes the officer's own record: a launch meanwhile tells nobody, skipped
    // as a held lease is (the next tick runs it again) — and the letter is already closed on its holder's record.
    let atRecord = () => {};
    let finish = () => {};
    const recording = new Promise<void>((resolve) => { atRecord = resolve; });
    const gate = new Promise<void>((resolve) => { finish = resolve; });
    const checking = checkD({ audit: async (entry: any) => {
      if (entry.action === consoleRead.LETTERS_CLEARED_ACTION) { atRecord(); await gate; }
      return audit(entry);
    } });
    await within(recording, "the officer's record");
    const closedFirst = (await newestOf())?.payload?.outcome;
    answer = "absent";
    const searchesAt = searches.length;
    const skippedRun = await within(notify.noticeWeekRefunded(wd.id), "the launch during the check");
    finish();
    const checked = await checking;
    await settleAll();
    ok("11d.2 · ⭐ round 17 (M5) · while the check holds the week, a launch tells nobody (skipped as a held lease, so the next tick runs it) — the letter already closed before the officer's record is written",
      closedFirst === "cleared" && skippedRun.skipped === "lease" && skippedRun.recipients === 0 && searches.length === searchesAt
        && J(tags) === J(["millionea-refund"]) && checked.ok && (checked as any).closed === 1,
      J({ closedFirst, skipped: skippedRun.skipped, recipients: skippedRun.recipients, searched: searches.length - searchesAt, checked, tags }));

    // 11d.3 · the run the hold skipped, run again: the closed letter is never searched for, nor sent — the run completes.
    const again = await notify.noticeWeekRefunded(wd.id);
    await settleAll();
    ok("11d.3 · ⭐ round 17 (M5) · run again after the check, with the search ready to read \"absent\": nothing searched, nothing sent, the run complete",
      again.skipped === null && searches.length === searchesAt && J(tags) === J(["millionea-refund"]) && notify.millioneaRunComplete(again),
      J({ letters: again.letters, searched: searches.length - searchesAt, tags }));

    // 11d.4 · a holder's records that cannot be read refuse the check: nothing closed, nothing recorded.
    await audit({ category: "SYSTEM", action: "maswali.notice.letter", actorId: null, targetType: "MaswaliLetter", targetId: targetD,
      payload: { notice: "refund", outcome: "attempt" } } as any);
    const putRead = notify.withMillioneaLetterRecordsRead(async (q: any) => {
      if ((q?.targetIds ?? []).includes(targetD)) throw new Error("planted: the letters' records could not be read");
      return getAuditForTargetsDurable(q);
    });
    let unreadCheck: any = null;
    const checksAt = await officerChecks();
    try { unreadCheck = await checkD(); } finally { putRead(); }
    ok("11d.4 · ⭐ round 17 (M5) · a holder whose letter records cannot be read refuses the check — nothing closed, nothing recorded",
      unreadCheck?.ok === false && String(unreadCheck?.error).includes("could not be read") && (await newestOf())?.payload?.outcome === "attempt"
        && (await officerChecks()) === checksAt, J({ unreadCheck, newest: (await newestOf())?.payload }));

    // 11d.5 · a bare attempt and an owed resend ("absent") are closed; a definite refusal ("failed") is the reconcile's to send.
    const bare = await checkD();
    const afterBare = (await newestOf())?.payload?.outcome;
    await audit({ category: "SYSTEM", action: "maswali.notice.letter", actorId: null, targetType: "MaswaliLetter", targetId: targetD,
      payload: { notice: "refund", outcome: "absent" } } as any);
    // ⭐ S6-NOTICES (L-3) · read as the card's opened row reads it, before the check closes it.
    const openAbsent = await notify.millioneaOpenLetters(wd.id, "refund");
    const owedResend = await checkD();
    const afterAbsent = (await newestOf())?.payload?.outcome;
    await audit({ category: "SYSTEM", action: "maswali.notice.letter", actorId: null, targetType: "MaswaliLetter", targetId: targetD,
      payload: { notice: "refund", outcome: "failed" } } as any);
    const refusedOne = await checkD();
    const afterFailed = (await newestOf())?.payload?.outcome;
    ok("11d.5 · ⭐ round 17 (M5) · the check closes a bare attempt and a resend still owed after \"absent\" — and never a letter the provider definitely refused (the reconcile sends that one)",
      bare.ok && (bare as any).closed === 1 && afterBare === "cleared" && owedResend.ok && (owedResend as any).closed === 1 && afterAbsent === "cleared"
        && refusedOne.ok && (refusedOne as any).closed === 0 && afterFailed === "failed",
      J({ bare, afterBare, owedResend, afterAbsent, refusedOne, afterFailed }));
    ok("11d.5b · ⭐ S6-NOTICES (L-3, L-4) · the card's opened row lists the resend still owed by that cause — the letter the check then closed — and a check that closed nothing says so",
      openAbsent?.length === 1 && openAbsent[0].userId === R4 && openAbsent[0].cause === "resendOwed" && openAbsent[0].tag === notify.millioneaLetterMetadata(wd.id, R4)
        && (owedResend as any).note === "Recorded: 1 letter closed — never searched for or sent again."
        && (refusedOne as any).note === "Recorded. No letter of this week was open, so none was closed."
        && J(await notify.millioneaOpenLetters(wd.id, "refund")) === "[]",
      J({ openAbsent, owed: (owedResend as any).note, refused: (refusedOne as any).note }));

    // 11d.6 · on PostgreSQL, another process holding the week's lease refuses the check before it reads or closes anything.
    if (W.onPostgres) {
      await audit({ category: "SYSTEM", action: "maswali.notice.letter", actorId: null, targetType: "MaswaliLetter", targetId: targetD,
        payload: { notice: "refund", outcome: "ambiguous" } } as any);
      const leaseKey = `__LEADER_${notify.noticeLeaseTask("refund", wd.id)}__`;
      await saveConfigOrThrow(leaseKey, { holder: "another-instance", expiresAt: Date.now() + 10 * 60_000, renewedAt: Date.now() });
      let leased: any = null;
      const checksLeased = await officerChecks();
      try { leased = await checkD(); } finally {
        await saveConfigOrThrow(leaseKey, { holder: "another-instance", expiresAt: Date.now() - 1, renewedAt: Date.now() });
      }
      ok("11d.6 · ⭐ round 17 (M5) · on PostgreSQL, another process holding the week's lease refuses the check — nothing closed, nothing recorded",
        leased?.ok === false && leased?.error === notify.LETTERS_BUSY && (await newestOf())?.payload?.outcome === "ambiguous"
          && (await officerChecks()) === checksLeased, J({ leased, newest: (await newestOf())?.payload }));
    }
  } finally {
    held = null;
    delete (globalThis as any).__50PICK_MLN_LETTER_SEARCH_MARGIN_MS;
    putSearch();
    putSender();
  }
}

// ── §11e · ⭐ S6-NOTICES (L-2, L-3) · the integrity card's words, rendered ─────────────────────────────────────────────────
console.log(`${LF}§11e · ⭐ S6-NOTICES (L-2, L-3) · the integrity card says one true sentence a cause, and lists each letter for Compliance`);
{
  const { createElement: h } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const card = await import("../../src/app/admin/maswali/integrity/letters-card.tsx");
  const { fmtEat } = await import("../../src/lib/maswali-admin-format.ts");
  /** The card's text as a reader reads it: the markup's words, entities decoded, spaces collapsed. */
  const textOf = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, "\"").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const row = (o: Record<string, unknown>) => ({ weekId: "mlw_card_a", code: "MLN-2026-W44", notice: "refund", letters: 0,
    causes: { uncertain: 0, unmatched: 0, resendOwed: 0 }, unread: 0, ...o }) as any;
  const render = (read: any, opened: any = null) => renderToStaticMarkup(h(card.LettersCardBody as any, {
    read, reconcileDays: notify.NOTICE_RECONCILE_DAYS, opened, query: { wpage: "2" }, control: () => h("span", null, "[the check]"),
  }));
  const rows = [
    row({ letters: 4, causes: { uncertain: 2, unmatched: 1, resendOwed: 1 } }),
    row({ weekId: "mlw_card_b", code: "MLN-2026-W45", notice: "result", unread: 3 }),
  ];
  const html = render({ rows, truncated: false, partial: false });
  const text = textOf(html);
  const days = notify.NOTICE_RECONCILE_DAYS;
  const SAYS = {
    head: "MLN-2026-W44 · 4 refund letters open",
    uncertain: "2 letters may have been taken by the email provider, and their search has not said so. Each run asks again: a letter the search finds is done, and one it finds no trace of is sent once more, never a third time.",
    unmatched: "1 letter may have been taken by the email provider, but its search can never be asked: the account's address, or the key its attempt was recorded under, has changed since. It is never searched for or sent again.",
    resendOwed: "1 letter was not found by the provider's search: its one resend is owed, and the next run sends it.",
    check: "Check the provider's activity for each letter, by its tag and attempt time, before anyone writes to the holder. Recording the check closes every open letter of this week for good: never searched for, never sent again.",
    unreadHead: "MLN-2026-W45 · 3 holders' records not read",
    unread: `3 holders' letter records could not be read, so nothing was sent to them. Each run reads them again for ${days} days after the week ended; the check cannot be recorded until they read.`,
  };
  ok("11e.1 · ⭐ S6-NOTICES (L-3) · each cause the run counted is said in its own sentence, true of the letters it counts, with what the check does",
    Object.entries(SAYS).filter(([k]) => !k.startsWith("unread")).every(([, s]) => text.includes(s)) && (text.match(/Recording the check closes/g) ?? []).length === 1,
    text.slice(0, 600));
  ok("11e.2 · ⭐ S6-NOTICES (L-2) · a week whose holders' letter records could not be read is listed with that cause — and no letter to open, and no word of a check it cannot take",
    text.includes(SAYS.unreadHead) && text.includes(SAYS.unread) && (text.match(/Show the letter/g) ?? []).length === 1 && (text.match(/\[the check\]/g) ?? []).length === 2,
    text.slice(text.indexOf("MLN-2026-W45")));
  const single = textOf(render({ rows: [row({ letters: 1, causes: { uncertain: 1, unmatched: 0, resendOwed: 0 } })], truncated: false, partial: false }));
  const empty = textOf(render({ rows: [], truncated: false, partial: false }));
  ok("11e.3 · ⭐ S6-NOTICES (L-3) · one letter is said in the singular; no sentence claims what the run did not find (\"its own search could not say\", \"never sent again by themselves\"); the empty card overclaims nothing",
    single.includes("1 letter may have been taken by the email provider, and its search has not said so.") && single.includes("Show the letter ")
      && ![text, single, empty].some((s) => /its own search could not say|never sent again by themselves|known to have gone or to need nothing/.test(s))
      && empty === "No win or refund letter is waiting on an officer's check.",
    J({ single: single.slice(0, 200), empty }));
  const attemptAt = "2026-10-18T09:00:00.000Z";
  const opened = { key: card.letterRowKey(rows[0]), list: { rows: [{ userId: "usr_card_holder", holder: "Asha M.", cause: "unmatched", tag: "0123456789abcdef0123456789abcdef", attempts: [attemptAt] }], total: 1, page: 1 } };
  const openText = textOf(render({ rows, truncated: false, partial: false }, opened));
  ok("11e.4 · ⭐ S6-NOTICES (L-3) · an opened row lists each open letter for Compliance: its holder, account, cause, provider tag and attempt time (EAT) — and the link closes it",
    ["Asha M.", "usr_card_holder", "Search cannot be asked", "0123456789abcdef0123456789abcdef", fmtEat(attemptAt), "Hide the letters"].every((s) => openText.includes(s))
      && !openText.includes("Show the letters"),
    openText.slice(openText.indexOf("Hide"), openText.indexOf("Hide") + 300));
  // The opened list a page at a time (no list cut at N), ordered by cause, then holder.
  const many = Array.from({ length: 25 }, (_, i) => ({ userId: `usr_card_${String(i).padStart(2, "0")}`, cause: i % 3 === 0 ? "resendOwed" : "uncertain",
    tag: `tag${i}`, attempts: [attemptAt] })) as any[];
  const p1 = await consoleRead.unresolvedLetterList(many, 1);
  const p2 = await consoleRead.unresolvedLetterList(many, 9);
  const causesInOrder = [...(p1?.rows ?? []), ...(p2?.rows ?? [])].map((r: any) => r.cause);
  ok("11e.5 · ⭐ S6-NOTICES (L-3) · the opened list pages every open letter — 25 as 20 and 5, a page asked past the end clamped to the last — the uncertain ones first",
    p1?.total === 25 && p1.rows.length === 20 && p1.page === 1 && p2?.total === 25 && p2.rows.length === 5 && p2.page === 2
      && causesInOrder.indexOf("resendOwed") === causesInOrder.filter((c) => c === "uncertain").length
      && J(await consoleRead.unresolvedLetterList(null, 1)) === "null",
    J({ p1: p1 && { total: p1.total, page: p1.page, n: p1.rows.length }, p2: p2 && { total: p2.total, page: p2.page, n: p2.rows.length } }));
  // ⭐ S6-NOTICES (L-4) · the officer's action needs a signed-in session, so it is read: it hands back the check's own answer
  // (8.11g3 holds its words), never a sentence of its own.
  const actionsSrc = readFileSync(join(ROOT, "src/app/admin/maswali/integrity/actions.ts"), "utf8").replace(/\r\n/g, LF);
  const clearAct = actionsSrc.slice(actionsSrc.indexOf("export async function clearUnresolvedLetterAction("), actionsSrc.indexOf("export async function holdMaswaliShareAction("));
  ok("11e.6 · ⭐ S6-NOTICES (L-4) · the officer's action answers with the check's own note — how many it closed — and with no sentence of its own",
    clearAct.length > 200 && clearAct.includes("return { ok: true, note: r.note };") && !clearAct.includes("the letters were checked"), clearAct.slice(0, 160));
}

// ── §11f · ⭐ M-2 (the lead's ruling 2) · a letter refused as often as the cap allows; the email provider down ─────────
console.log(`${LF}§11f · ⭐ M-2 · a letter the provider refused ${notify.LETTER_REFUSALS_CAP} times is sent by no run again; while the provider is down a run sends one letter and holds the rest back`);
{
  /** One holder's letter records on a week, newest first — the attempts and outcomes a run writes. */
  const lettersOf = async (weekId: string, userId: string) => (await getAuditForTargetsDurable({
    targetType: "MaswaliLetter", targetIds: [notify.millioneaLetterTarget(weekId, userId)], actions: ["maswali.notice.letter"],
    sinceIso: "1970-01-01T00:00:00.000Z", limit: 200,
  })).entries as any[];
  const outcomes = (rows: any[], outcome: string) => rows.filter((e) => e.payload?.outcome === outcome).length;
  const OFFICER = "usr_mln_notify_officer";

  // (a) and (b) · a winner whose letter the provider definitely refuses, every time it is sent.
  const R5 = await W.user({ balance: 500_000 });
  await W.setUserFields(R5, { email: mailOf(R5), emailVerifiedAt: iso() });
  let sendsR5 = 0;
  const putRefuse = notify.withMillioneaLetterSender(async (userId: string) => {
    if (userId === R5) { sendsR5++; return { ok: false, reason: "failed", failure: "refused" } as any; }
    return { ok: true, reason: "sent" } as any;
  });
  try {
    const { week: wr, start: sr } = await W.openWeek({ weeksAhead: ahead++ });
    const bought = await W.buy(R5, wr.id, [W.WIN]);
    const atR = await W.closeAndSeal(wr, sr);
    credit(100_000_000);
    const rel = await W.release(wr.id, atR);
    await settleAll();
    // The first run and its reconciles: each definite refusal is sent again, until the cap.
    for (let i = 1; i < notify.LETTER_REFUSALS_CAP; i++) { await notify.reconcileMillioneaNotices(new Date(), { force: true }); await settleAll(); }
    const atCap = await lettersOf(wr.id, R5);
    ok(`11f.0 · premise · the provider refused the winner's letter ${notify.LETTER_REFUSALS_CAP} times: ${notify.LETTER_REFUSALS_CAP} attempts, ${notify.LETTER_REFUSALS_CAP} refusals, each recorded`,
      bought.ok && rel?.ok && sendsR5 === notify.LETTER_REFUSALS_CAP && outcomes(atCap, "attempt") === notify.LETTER_REFUSALS_CAP && outcomes(atCap, "failed") === notify.LETTER_REFUSALS_CAP,
      J({ rel: rel?.ok ? "ok" : rel, sendsR5, attempts: outcomes(atCap, "attempt"), failed: outcomes(atCap, "failed") }));
    await notify.reconcileMillioneaNotices(new Date(), { force: true });
    await settleAll();
    const capRun = (await resultRuns(wr.id))[0] ?? null;
    const afterCap = await lettersOf(wr.id, R5);
    ok(`11f.1 · ⭐ M-2 (a) · refused ${notify.LETTER_REFUSALS_CAP} times, the letter is not attempted again: no fourth attempt record, no send, counted capped — and the run is complete`,
      sendsR5 === notify.LETTER_REFUSALS_CAP && outcomes(afterCap, "attempt") === notify.LETTER_REFUSALS_CAP && capRun?.letters?.capped === 1 && capRun?.complete === true,
      J({ sendsR5, attempts: outcomes(afterCap, "attempt"), run: capRun }));
    const row = (await consoleRead.unresolvedLetters()).rows.find((l: any) => l.weekId === wr.id && l.notice === "result");
    const open = await notify.millioneaOpenLetters(wr.id, "result");
    ok("11f.2 · ⭐ M-2 (a) · …and the integrity card lists it: one letter open, its cause capped — on the row and in its opened list",
      row?.letters === 1 && row?.causes?.capped === 1 && J(open?.map((x: any) => x.cause)) === J(["capped"]), J({ row, open }));
    const cleared = await consoleRead.clearUnresolvedLetter({ weekId: wr.id, notice: "result", officerId: OFFICER, typed: "CHECKED", note: "the holder's address and the provider's activity were checked" });
    await settleAll();
    await notify.reconcileMillioneaNotices(new Date(), { force: true });
    await settleAll();
    ok("11f.3 · ⭐ M-2 (b) · the officer's recorded check closes the capped letter: one closed, the week off the card, and no run sends it again",
      cleared.ok && (cleared as any).closed === 1 && !(await consoleRead.unresolvedLetters()).rows.some((l: any) => l.weekId === wr.id)
        && sendsR5 === notify.LETTER_REFUSALS_CAP && outcomes(await lettersOf(wr.id, R5), "attempt") === notify.LETTER_REFUSALS_CAP,
      J({ cleared, sendsR5 }));
  } finally {
    putRefuse();
  }

  // (c) and (d) · the email provider DOWN: one probe a run, every other letter held back with no attempt; the provider back,
  //    the reconcile sends each held letter once. A holder with no address on file is never the probe.
  const [D1, D2, DN] = [await W.user({ balance: 500_000 }), await W.user({ balance: 500_000 }), await W.user({ balance: 500_000 })];
  await W.setUserFields(D1, { email: mailOf(D1), emailVerifiedAt: iso() });
  await W.setUserFields(D2, { email: mailOf(D2), emailVerifiedAt: iso() });
  await W.setUserFields(DN, { email: null, emailVerifiedAt: null });
  const sent: string[] = [];
  const putSent = notify.withMillioneaLetterSender(async (userId: string) => {
    if (userId === DN) return { ok: false, reason: "no-address" } as any;
    sent.push(userId);
    return { ok: true, reason: "sent" } as any;
  });
  const healthBefore = (globalThis as any).__50PICK_EMAIL_HEALTH;
  try {
    const { week: wd, start: sd } = await W.openWeek({ weeksAhead: ahead++ });
    const b1 = await W.buy(DN, wd.id, [W.WIN]), b2 = await W.buy(D1, wd.id, [W.WIN]), b3 = await W.buy(D2, wd.id, [W.WIN]);
    const atD = await W.closeAndSeal(wd, sd);
    credit(100_000_000);
    // The provider down: this process's last sends all failed (`emailHealth()` reads DOWN).
    email.resetEmailHealth();
    (globalThis as any).__50PICK_EMAIL_HEALTH = { consecutiveFailures: email.EMAIL_DOWN_AFTER_FAILURES, totalFailures: email.EMAIL_DOWN_AFTER_FAILURES,
      totalSent: 0, lastFailureAt: iso(), lastFailureReason: "TEST · the provider is not answering", alertedAt: iso() };
    const down = email.emailHealth().status;
    const relD = await W.release(wd.id, atD);
    await settleAll();
    const runD = (await resultRuns(wd.id))[0] ?? null;
    const [l1, l2, ln] = [await lettersOf(wd.id, D1), await lettersOf(wd.id, D2), await lettersOf(wd.id, DN)];
    const probe = sent.length === 1 ? sent[0] : null;
    const heldBack = probe === D1 ? l2 : probe === D2 ? l1 : null;
    ok("11f.4 · ⭐ M-2 (c) · while the provider is down a run sends ONE letter that would reach it — its probe — and holds the other back: no attempt record for it, counted deferred, the run owed",
      down === "DOWN" && b1.ok && b2.ok && b3.ok && relD?.ok && !!probe && heldBack !== null && heldBack.length === 0
        && runD?.letters?.deferred === 1 && runD?.complete === false,
      J({ down, sent, run: runD, probeRecords: (probe === D1 ? l1 : l2).map((e: any) => e.payload?.outcome) }));
    ok("11f.5 · ⭐ M-2 (c) · a holder with no address on file is never the probe: that letter is not held back, and the probe went to an address",
      !!probe && probe !== DN && ln.every((e: any) => e.payload?.outcome !== "deferred") && runD?.letters?.["no-address"] === 1, J({ probe, ln: ln.map((e: any) => e.payload?.outcome), run: runD }));
    ok("11f.6 · ⭐ M-2 (d) · the held-back letter used none of its refusals: its records hold no attempt and no refusal",
      heldBack !== null && outcomes(heldBack, "failed") === 0 && outcomes(heldBack, "attempt") === 0);
    const rowD = (await consoleRead.unresolvedLetters()).rows.find((l: any) => l.weekId === wd.id && l.notice === "result");
    ok("11f.7 · M-2 · the integrity card says one letter was held back for the provider — not open, so the check does not close it",
      rowD?.deferred === 1 && rowD?.letters === 0, J(rowD));
    // The provider answers again.
    email.resetEmailHealth();
    await notify.reconcileMillioneaNotices(new Date(), { force: true });
    await settleAll();
    const runBack = (await resultRuns(wd.id))[0] ?? null;
    const [m1, m2] = [await lettersOf(wd.id, D1), await lettersOf(wd.id, D2)];
    ok("11f.8 · ⭐ M-2 (c) · the provider back, the reconcile sends the held-back letter once and the probe's never again: each winner one attempt, one send — the run complete",
      J([...sent].sort()) === J([D1, D2].sort()) && outcomes(m1, "attempt") === 1 && outcomes(m2, "attempt") === 1 && runBack?.complete === true && !runBack?.letters?.deferred,
      J({ sent, run: runBack }));
  } finally {
    putSent();
    (globalThis as any).__50PICK_EMAIL_HEALTH = healthBefore;
  }
}
// The card's words for the two, as values (one true sentence a cause).
{
  const card = await import("../../src/app/admin/maswali/integrity/letters-card.tsx");
  const words = card.letterCauseSentences({ causes: { uncertain: 0, unmatched: 0, resendOwed: 0, capped: 1 }, unread: 0, deferred: 2 }, notify.NOTICE_RECONCILE_DAYS);
  ok("11f.9 · ⭐ M-2 · the card says one true sentence for each: a letter refused as often as the cap allows is sent by no run again and the check closes it; letters held back go once the provider answers, and the check does not close them",
    words.length === 2 && words[0].includes(`refused by the email provider ${notify.LETTER_REFUSALS_CAP} times: no run sends it again`) && words[0].includes("recording the check closes it")
      && words[1].startsWith("2 letters were held back") && words[1].includes("the check does not close them"), J(words));
}

// ── §12 · the final sunset week ───────────────────────────────────────────────────────────────────────
console.log(`${LF}§12 · the final week (MR-30) — the highest score shares the jackpot, and the notices say so`);
{
  const startF = W.weekStartAhead(ahead++);
  const drafted = await W.svc.createWeek({ weekStartMs: startF, questions: W.questions(startF), officerId: DRAFTER, now: new Date(startF - 3 * DAY) });
  if (!drafted.ok) throw new Error(`§12: the final week's draft was refused: ${drafted.error}`);
  await W.svc.attestParity({ weekId: drafted.week.id, officerId: READER, readVersion: await W.svc.readDraftVersion(drafted.week.id) });
  const sunset = await W.svc.sunsetMaswali({ weekId: drafted.week.id, ownerId: OWNER, typed: W.svc.SUNSET_WORD, reason: "the notice suite's final week" });
  const opened = await W.svc.openWeek({ weekId: drafted.week.id, officerId: DRAFTER, guarantee: money.guaranteeReader, now: new Date(startF + 60_000) });
  if (!opened.ok) throw new Error(`§12: the final week did not open: ${opened.error}`);
  const nine = await W.buy(A, opened.week.id, [W.LOSE]);                                       // 9 of 10: misses slot 1
  const eight = await W.buy(C, opened.week.id, [W.slip("YES", 1).map((x: string, i: number) => (i === 0 ? "NO" : x))]); // 8 of 10
  const atF = await W.closeAndSeal(opened.week, startF);
  credit(5_000_000);
  // ⭐ Round 5 (A12, beyond the unit) · the final week is released while the SMS rail is not configured — Blackball named and
  // its keys absent, so no request can leave: the winner's SMS is refused NOT_CONFIGURED for good, and the run completes.
  const railEnv = { provider: process.env.SMS_PROVIDER, id: process.env.BLACKBALL_CLIENT_ID, secret: process.env.BLACKBALL_CLIENT_SECRET };
  const putBack = (k: string, v: string | undefined) => { if (v === undefined) delete process.env[k]; else process.env[k] = v; };
  let rel: any;
  try {
    process.env.SMS_PROVIDER = "blackball";
    delete process.env.BLACKBALL_CLIENT_ID;
    delete process.env.BLACKBALL_CLIENT_SECRET;
    rel = await W.release(opened.week.id, atF);
    await settleAll();
  } finally {
    putBack("SMS_PROVIDER", railEnv.provider);
    putBack("BLACKBALL_CLIENT_ID", railEnv.id);
    putBack("BLACKBALL_CLIENT_SECRET", railEnv.secret);
  }
  const codeF = (await dal.weekStore.get(opened.week.id)).code as string;
  const winA = await withHref(A, href({ notice: "result", weekCode: codeF, winningSerial: nine.data.maswali.tickets[0].serial }));
  const lossC = await withHref(C, href({ notice: "result", weekCode: codeF, winningSerial: null }));
  ok("12.1 · ⭐ the final week's top score (9 of 10) wins, and the win says the week's highest score — never 10/10",
    sunset.ok && nine.ok && eight.ok && rel.ok && winA.length === 1 && winA[0].kind === "WIN" && String(winA[0].bodyEn).includes("the week's highest score, 9 of 10") && !String(winA[0].bodyEn).includes("at 10/10"),
    J({ sunset: sunset.ok ? "ok" : sunset, rel: rel.ok ? "ok" : rel, body: winA[0]?.bodyEn }));
  ok("12.2 · …and the loss names the winning score the same way", lossC.length === 1 && String(lossC[0].bodyEn).includes("reached the week's highest score, 9 of 10"), lossC[0]?.bodyEn);
  const runsF = await resultRuns(opened.week.id);
  ok("12.3 · ⭐ round 5 (A12, beyond the unit) · the winner's SMS on a rail that is not configured is refused for good: counted NOT_CONFIGURED, no SMS row, the run complete",
    rel.ok && runsF.length >= 1 && runsF[0]?.complete === true && runsF[0]?.sms?.permanent?.NOT_CONFIGURED === 1 && !runsF[0]?.sms?.notResent
      && (await winnerTargets(opened.week.id)).length === 0 && process.env.SMS_PROVIDER === railEnv.provider, J(runsF[0]));
}

// ── §13 · exactly once; three languages; push tags; the registry; the invariants ─────────────────────
console.log(`${LF}§13 · exactly once across the run, in three languages; the push tag; the registry against the code`);
{
  const people = [A, B, C, D, E, P, X, Y, Z, V, Q];
  const rows = (await Promise.all(people.map(async (u) => (await mlnRows(u)).map((n) => ({ u, ...n }))))).flat();
  const keys = rows.map((n) => `${n.u} ${n.href}`);
  ok(`13.1 · ⭐ no player was sent any Millionea notice twice (${rows.length} rows)`, rows.length >= 40 && new Set(keys).size === keys.length,
    J(keys.filter((k, i) => keys.indexOf(k) !== i)));
  const blank = rows.filter((n) => ![n.titleEn, n.titleSw, n.titleZh, n.bodyEn, n.bodySw, n.bodyZh].every((s) => typeof s === "string" && s.trim() !== "")
    || n.titleSw === n.titleEn || n.titleZh === n.titleEn);
  ok("13.2 · ⭐ every one in three languages: English, Swahili and Chinese, each its own", blank.length === 0, J(blank.slice(0, 3)));
  ok("13.3 · every kind is the registry's: BET_PLACED, REFUND, SELECTION_CLOSED, VERDICT, WIN, LOSS",
    rows.every((n) => ["BET_PLACED", "REFUND", "SELECTION_CLOSED", "VERDICT", "WIN", "LOSS"].includes(n.kind)), J([...new Set(rows.map((n) => n.kind))]));
  // LOW 10 · every Millionea row goes through `millioneaNotify`, which hands its link to the push as its tag.
  const src = readFileSync(join(ROOT, "src/lib/server/notification-service.ts"), "utf8").replace(/\r\n/g, LF);
  const section = src.slice(src.indexOf("export async function notifyMillioneaTicketsCut("), src.indexOf("/* ---- House bots (build commit 3) ---- */"));
  ok("13.4 · ⭐ LOW 10 · every Millionea emitter writes through millioneaNotify, which passes the row's link as its push tag — no bare notify() left",
    section.length > 2_000 && !/\breturn notify\(\{/.test(section) && (section.match(/return millioneaNotify\(\{/g) ?? []).length >= 10
      && /function millioneaNotify\(input: NotifyInput\) \{\s*return notify\(input, \{ pushTag: input\.href \}\);/.test(src)
      // round 3, A1 · a row's link is nullable, so the option the wrapper hands it takes null (TS2322 on the old option).
      && src.includes("pushTag?: string | null;"), `${(section.match(/return millioneaNotify\(\{/g) ?? []).length} emitters`);
  // The registry against the code: every registered notice has its emitter, its sender and its trigger's call.
  const problems: string[] = [];
  for (const spec of registry.MILLIONEA_NOTICES as any[]) {
    if (typeof (N as any)[spec.emitter] !== "function") problems.push(`${spec.notice}: no emitter ${spec.emitter}`);
    if (!registry.NOTIFICATION_EMITTERS.some((e: any) => e.fn === spec.emitter)) problems.push(`${spec.notice}: ${spec.emitter} unregistered`);
    if (typeof (notify as any)[spec.sender] !== "function") problems.push(`${spec.notice}: no sender ${spec.sender}`);
    if (!readFileSync(join(ROOT, spec.trigger), "utf8").includes(`m.${spec.sender}(`)) problems.push(`${spec.notice}: ${spec.trigger} never calls ${spec.sender}`);
  }
  ok("13.5 · the registered set is the code's: every notice's emitter exists and is registered, its sender exists, and its trigger file calls it",
    (registry.MILLIONEA_NOTICES as any[]).length === 10 && problems.length === 0, J(problems));
  const inv = await checkMaswaliInvariants();
  ok("13.6 · the nightly invariants hold over every week of the run: no notice moved money", inv.ok, J(inv));
  // Round 4 (L3) · the week's lease is taken only on a lease READ that happened: a read that fails throws inside the lease,
  // whose own catch fails closed — so the run skips (the memory store has no lease to read; this is the code, read).
  const notifySrc = readFileSync(join(ROOT, "src/lib/server/maswali-notify.ts"), "utf8").replace(/\r\n/g, LF);
  const leaderSrc = readFileSync(join(ROOT, "src/lib/server/leader.ts"), "utf8").replace(/\r\n/g, LF);
  // ⭐ Round 17 (M5) · re-pinned openly: an officer's check of the letters takes the same lease the same way (its third use).
  const checkSrc = notifySrc.slice(notifySrc.indexOf("export async function closeUnresolvedLetters("), notifySrc.indexOf("// ── A QUESTION'S OWN SEAL RECORDS"));
  ok("13.7 · ⭐ round 4 (L3) · the week's lease is claimed and renewed with a strict read and a strict write — by a run, and (round 17, M5) by an officer's check of its letters; a strict read that fails throws, and the lease's catch answers false",
    (notifySrc.match(/strictWrite: true, strictRead: true/g) ?? []).length === 3 && checkSrc.length > 500
      && checkSrc.includes("const lease = { leaseMs: NOTICE_LEASE_MS, strictWrite: true, strictRead: true };") && checkSrc.includes("held = await acquireLeadership(task, lease);")
      && leaderSrc.includes("if (!read.ok) throw new Error(") && leaderSrc.includes("const current = await leaseOf(task, opts.strictRead === true);"));
  // ⭐ Round 17 (L1) · the provider metadata's own doc says what leaves with a money letter — a one-way digest of its letter's
  // target (8.11n holds the value) — where it still said the letter carries its record's target, which round 14 had stopped.
  const emailSrc = readFileSync(join(ROOT, "src/lib/server/email.ts"), "utf8").replace(/\r\n/g, LF);
  const sendInput = emailSrc.slice(emailSrc.indexOf("type SendInput = {"), emailSrc.indexOf("metadata?: Record<string, string>;"));
  const metaDoc = sendInput.slice(sendInput.lastIndexOf("/**"));
  ok("13.8 · ⭐ round 17 (L1) · the provider metadata's doc says a money letter carries a one-way digest of its letter's target — no longer its record's target",
    metaDoc.length > 40 && metaDoc.includes("a one-way digest of its letter's target") && !metaDoc.includes("carries its record's target"), metaDoc);
  // ⭐ Round 17 (M5) · the integrity card says what becomes of a listed letter: a later search may send it once more until the
  // check is recorded, and the recorded check closes it — where it said such letters are never sent again by themselves.
  // ⭐ S6-NOTICES (L-3) · re-pinned to the card's own words (`letters-card.tsx`), read as values: one sentence a cause.
  const cardWords = await import("../../src/app/admin/maswali/integrity/letters-card.tsx");
  const said = [...cardWords.letterCauseSentences({ causes: { uncertain: 2, unmatched: 0, resendOwed: 0 }, unread: 0 }, notify.NOTICE_RECONCILE_DAYS),
    cardWords.LETTERS_CHECK_SENTENCE].join(" ");
  ok("13.9 · ⭐ round 17 (M5) · the integrity card says a listed letter may still go once more until the check is recorded, and that the recorded check closes it — never that it is never sent again",
    said.includes("one it finds no trace of is sent once more") && said.includes("Recording the check closes every open letter of this week for good")
      && !said.includes("never sent again by themselves"), said);
}

console.log(`${LF}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
