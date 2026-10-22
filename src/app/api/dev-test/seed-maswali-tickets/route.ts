/**
 * DEV ONLY — ONE PLAYER'S MILLIONEA TICKETS IN EVERY STATE (MASWALI-BUILD S5-DESIGN-TICKETS; the R1 tickets critic's "Owed
 * frames": the ticket closed, results coming in, the objection window, settling; won — paid, held, forfeited, two tickets,
 * a floor top-up, the sunset; lost; a voided week's refund pending and landed; cancelled; the list in every lens). 404 in
 * production. It moves money only through the product's own services, exactly as `seed-maswali` does, and every fixture of
 * time it adds is declared where it is made.
 *
 *   POST { step: "weeks" }                → the chain below, the demo player's tickets in it    → { ok, tickets, weeks }
 *   POST { step: "info" }                 → the same answer again, for a drive that comes after the shots on the same
 *                                            server (this process's seed only)                   → { ok, tickets, weeks }
 *   POST { step: "fresh" }              → one more ticket for the demo player in the selling week, bought now, so its
 *                                            free cancel is open for the shot that follows      → { ok, serial }
 *   POST { step: "hold", serial }         → Compliance holds that won share (LAST: a held share holds the wallet)
 *   POST { step: "seal", week, slot, outcome } → seals one more result of a graded week, now (a result arriving while the
 *                                            player looks: the press and the live count's tick)
 *   POST { step: "break", userId }        → a 24-hour cooling-off for that account (the empty list on a break, P2)
 *   POST { step: "sunset" }               → INSTEAD of "weeks", on its own fresh store: a final week (MR-30) settled on
 *                                            its top score, the demo player holding the top ticket and one below it
 *
 * The demo player is `/auth/demo`'s account (sign it in first). ⛔ "weeks" and "sunset" run on a FRESH in-memory store only
 * (one public week sells at a time, MR-3), on a server whose rollout sells (`FEATURE_MILLIONEA=ACTIVE`), and with the
 * Millionea tick off (`MASWALI_SCHEDULER=false`, `LIFECYCLE_TICKER=false`): the tick would land the pending refunds this
 * seeds on purpose.
 *
 * THE CHAIN (calendar order is chain order; each week opens after the one before it closed, and settles in order, MR-3):
 *   wonPaid       floor 0 — no top-up: the demo player's single winning ticket, a second winner beside it, and their
 *                 lost ticket in a week with winners
 *   wonTwo        the default floor — a top-up: two of the demo player's winning tickets paid (one seal, a total), a third
 *                 held for review (step "hold") and a fourth held and forfeited (OD-07)
 *   wonBig        floor 2,000,000 — one winner, a share of seven digits (the seal's amount kept whole at 320)
 *   driveRolled   a private DRIVE week (OD-21, its own line's calendar — MR-3 holds per line) nobody won: its pool carried
 *   wonDrive      to the next drive week, which the demo player won beside another winner: the won ticket's ledger is the
 *                 one core's, its carry naming the drive week it came from, never a link
 *   rollover      no 10/10: the pool carried forward (the loss line names the week it went to)
 *   refunded      voided whole, its refunds landed (MR-18)
 *   refundPending voided whole, its refunds not landed — ⚠️ A DECLARED FIXTURE OF STATE: the week is stamped VOIDED
 *                 (`stampVoid`) and `refundVoidedWeek` is not run, the state a failed refund leaves until the tick retries
 *   results       results coming in: M1 YES, M2 NO, M4 YES and A1 YES sealed, M3 voided before the close (the slip filled
 *                 it, P10); one ticket that can no longer win, one that still can
 *   objections    every result in, the graded set final, its objection window open (MR-16)
 *   settling      the same, its window closed and the week not settled — ⚠️ A DECLARED FIXTURE OF TIME: its
 *                 `objectionsCloseAt` moved into the past, as `seed-maswali` does (a future week's window closes in the future)
 *   voiding       six mains voided against five reserves (MR-18), its window open: the week is being voided
 *   closed        its sales closed, no result yet
 *   selling       on sale: a ticket bought now (its free cancel runs out ten minutes later) and one cancelled at once
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import type { StoredUser, StoredWallet } from "@/lib/server/store";
import { randomId } from "@/lib/server/crypto";
import {
  attestParity, closeWeek, createWeek, openWeek, purchaseMaswaliTickets, readDraftVersion, rolloutSells, sealQuestion, sunsetMaswali, SUNSET_WORD,
  voidWeek, type DraftQuestionInput,
} from "@/lib/server/maswali-service";
import { millioneaStateNow } from "@/lib/server/millionea-switch";
import { ticketStore, weekStore } from "@/lib/server/maswali-dal";
import {
  cancelMaswaliTicket, fundMaswaliGuarantee, guaranteeReader, GUARANTEE_FUND_WORD, maswaliAccountBalance,
} from "@/lib/server/maswali-money-service";
import {
  FORFEIT_SHARE_WORD, forfeitMaswaliShare, holdMaswaliShare, previewMaswaliSettlement, settleMaswaliWeek,
} from "@/lib/server/maswali-settlement";
import { getMaswaliConfig, saveMaswaliConfig } from "@/lib/server/maswali-config";
import { getLicenceBasis, recordLicenceBasis } from "@/lib/server/maswali-licence";
import { coolOff } from "@/lib/server/responsible-gambling";
import { acct, depositEntries, postLedgerEntries } from "@/lib/server/ledger";
import { eatWeekStartMs } from "@/lib/eat-day";
import { utcToZonedLocal } from "@/lib/maswali-time";
import type { MaswaliOutcome, MaswaliPick } from "@/lib/maswali-score";

const DAY = 86_400_000;
const OWNER = "usr_dev_owner";
/** The seals' officer: a real staff account (a MODERATOR), as `seed-maswali` seals (S5 VIS R11). */
const SEALER = "usr_dev_sealer";
/** `/auth/demo`'s account. */
const DEMO_PHONE = "+255700000000";
const SOURCES = ["https://www.nbc.co.tz/results", "https://www.tff.or.tz/fixtures", "https://www.bot.go.tz/rates", "https://www.meteo.go.tz/bulletin", "https://www.coingecko.com/en/coins/bitcoin"];
const CATS = ["sports", "sports", "macro", "weather", "crypto"];

/** The week's fifteen, as `seed-maswali` drafts them: mains on the Saturday from 09:00, reserves from 14:00. */
function questions(weekStart: number): DraftQuestionInput[] {
  return Array.from({ length: 15 }, (_, i) => {
    const main = i < 10;
    const at = weekStart + 5 * DAY + (main ? 9 : 14) * 3_600_000 + i * 3_600_000;
    return {
      role: main ? "MAIN" : "RESERVE", ordinal: main ? i + 1 : i - 9, category: CATS[i % 5],
      textEn: `Will event ${i + 1} happen this weekend?`, textSw: `Je, tukio la ${i + 1} litatokea wikendi hii?`, textZh: `本周末第 ${i + 1} 个事件会发生吗？`,
      criterionEn: `YES if event ${i + 1} is confirmed by the source.`, criterionSw: `NDIO ikiwa tukio la ${i + 1} litathibitishwa na chanzo.`, criterionZh: `如果第 ${i + 1} 个事件得到来源确认则为是。`,
      sourceUrl: SOURCES[i % 5], eventKind: "SPORT", eventLocalStart: utcToZonedLocal(at, "Africa/Dar_es_Salaam"), eventZone: "Africa/Dar_es_Salaam",
      probabilityEstimate: 0.5, probabilitySource: "dev seed",
    };
  });
}

/** Fifteen picks: NO at the given slots (1–15), YES everywhere else. Every seeded result is YES, so a NO on a main is a miss. */
const picks = (...no: number[]): MaswaliPick[] => Array.from({ length: 15 }, (_, i) => (no.includes(i + 1) ? "NO" : "YES"));
const WIN = picks();
const LOSE = picks(1);

/** A seeded account with `balance` deposited — or, given `role` and `id`, the staff account that seals, with none. */
async function account(balance: number, role: "PLAYER" | "MODERATOR" = "PLAYER", id = `usr_${randomId(12)}`): Promise<string> {
  const now = new Date().toISOString();
  await db.user.create({
    id, phoneE164: `+2557${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`, email: null, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role, status: "ACTIVE", locale: "EN", displayName: role === "PLAYER" ? `Dev player ${id.slice(-4)}` : "Dev results officer", dob: null,
    region: null, acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    recruitedBy: null, createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null,
  } as unknown as StoredUser);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now } as unknown as StoredWallet);
  if (balance > 0) await postLedgerEntries(`seed_${id}`, depositEntries({ txnId: `seed_${id}`, userId: id, amount: balance, provider: "DEV_SEED" }));
  return id;
}

/** A service's refusal stops the seed, naming the step and the service's own reason. */
function must(what: string, r: { ok: boolean }): void {
  if (!r.ok) throw new Error(`${what}: ${(r as { error?: string }).error ?? "refused"}`);
}

/** Drafts and opens a week whose Monday is `ms`, under the floor given (the rules freeze at the open), then puts it back. A
 *  DRIVE week (OD-21) runs its own chain beside the public one (MR-3 holds per line). */
async function opened(ms: number, floorTzs?: number, visibility: "PUBLIC" | "DRIVE" = "PUBLIC") {
  const before = getMaswaliConfig().floorTzs;
  if (floorTzs !== undefined && floorTzs !== before) must("floor", await saveMaswaliConfig({ floorTzs }, OWNER));
  try {
    const c = await createWeek({ weekStartMs: ms, visibility, questions: questions(ms), officerId: OWNER, now: new Date(ms - 3 * DAY) });
    if (!c.ok) throw new Error(`draft: ${c.error}`);
    must("attest", await attestParity({ weekId: c.week.id, officerId: "usr_dev_reader", readVersion: await readDraftVersion(c.week.id) }));
    // At its drafted open, the config's own time (DESIGN_AUTHORITY §M8a item 24), as seed-maswali opens.
    const o = await openWeek({ weekId: c.week.id, officerId: OWNER, guarantee: guaranteeReader, now: new Date(Date.parse(c.week.opensAt)) });
    if (!o.ok) throw new Error(`open: ${o.error}`);
    return o.week;
  } finally {
    if (floorTzs !== undefined && floorTzs !== before) must("floor back", await saveMaswaliConfig({ floorTzs: before }, OWNER));
  }
}

/** Buys `slips` for `userId` in the week, now (the buy path's own clock), and answers each ticket's serial and id. */
async function buy(userId: string, weekId: string, slips: MaswaliPick[][]): Promise<Array<{ serial: string; ticketId: string; positionId: string }>> {
  const r = await purchaseMaswaliTickets({ userId, weekId, slips });
  if (!r.ok) throw new Error(`buy: ${r.error}`);
  const tickets = (r.data as { maswali?: { tickets: Array<{ serial: string; ticketId: string; positionId: string }> } }).maswali?.tickets ?? [];
  if (tickets.length !== slips.length) throw new Error(`buy: ${tickets.length} tickets for ${slips.length} slips`);
  return tickets;
}

/** Closes the week at its own close, the config's time (DESIGN_AUTHORITY §M8a item 24). */
async function close(week: { id: string; closesAt: string }) {
  must("close", await closeWeek({ weekId: week.id, now: new Date(Date.parse(week.closesAt)) }));
}

/** Seals the slots given (outcome by slot; VOID on the `abandoned` ground, a fact, MR-15) on the week's results day. */
async function seal(weekId: string, ms: number, outcomes: Record<number, MaswaliOutcome>) {
  for (const [slot, outcome] of Object.entries(outcomes)) {
    const voided = outcome === "VOID";
    const r = await sealQuestion({
      weekId, slot: Number(slot), outcome, voidReason: voided ? "abandoned" : null,
      evidence: voided ? `Event ${slot} was abandoned with no official result (dev seed)` : `Official result for event ${slot} (dev seed)`,
      officerId: SEALER, now: new Date(ms + 9 * DAY),
    });
    if (!r.ok) throw new Error(`seal ${slot}: ${r.error}`);
  }
}
const allYes = (voidMains = 0): Record<number, MaswaliOutcome> =>
  Object.fromEntries(Array.from({ length: 15 }, (_, i) => [i + 1, i < voidMains ? "VOID" : "YES"]));

/** Settles the week a minute after its objection window closed (on that injected clock, as `seed-maswali` settles). */
async function settle(weekId: string) {
  const at = new Date(Date.parse((await weekStore.get(weekId))!.objectionsCloseAt!) + 60_000);
  const p = await previewMaswaliSettlement(weekId, at);
  if (!p.ok) throw new Error(`preview: ${p.error}`);
  const s = await settleMaswaliWeek({ weekId, releasedBy: OWNER, digest: p.preview.digest, now: at });
  if (!s.ok) throw new Error(`settle: ${s.error}`);
}

/** The house's side of a fresh store: the licence basis, a funded guarantee, the sealing officer. */
async function groundwork() {
  if (getLicenceBasis().kind === "NONE") await recordLicenceBasis({ kind: "OWNER_RULING", ref: "Dev seed — the Owner's ruling of 2026-10-16" }, OWNER);
  if (((await maswaliAccountBalance(acct.maswaliGuarantee)) ?? 0) < 20_000_000) {
    must("fund", await fundMaswaliGuarantee({ amount: 24_000_000, reference: "DEV-SEED-TICKETS", typed: GUARANTEE_FUND_WORD, ownerId: OWNER }));
  }
  if (!(await db.user.findById(SEALER))) await account(0, "MODERATOR", SEALER);
}

async function demoId(): Promise<string> {
  const demo = await db.user.findByPhone(DEMO_PHONE);
  if (!demo) throw new Error("No demo player: sign in through /auth/demo first.");
  return demo.id;
}

async function seedWeeks() {
  const demo = await demoId();
  await groundwork();
  const others = await Promise.all(Array.from({ length: 6 }, () => account(200_000)));
  const tickets: Record<string, string> = {};
  const weeks: Record<string, string> = {};
  const name = (label: string, rows: Array<{ serial: string }>) => rows.forEach((r, i) => { tickets[rows.length === 1 ? label : `${label}${i + 1}`] = r.serial; });
  let ms = eatWeekStartMs(Date.now()) + 2 * 7 * DAY;
  const next = () => { const at = ms; ms += 7 * DAY; return at; };

  // wonPaid — floor 0, so no top-up: the demo player's one winning ticket, another player's beside it, and a lost ticket.
  {
    const at = next();
    const w = await opened(at, 0);
    weeks.wonPaid = w.code;
    const [win] = await buy(demo, w.id, [WIN]);
    const [lost] = await buy(demo, w.id, [LOSE]);
    tickets.wonPaid = win.serial; tickets.lostWithWinners = lost.serial;
    await buy(others[0], w.id, [WIN]);
    await buy(others[1], w.id, [LOSE, LOSE, LOSE]);
    await close(w); await seal(w.id, at, allYes()); await settle(w.id);
  }
  // wonTwo — the default floor (a top-up): two paid, one held at the end ("hold"), one held then forfeited (OD-07).
  let forfeit = "";
  {
    const at = next();
    const w = await opened(at);
    weeks.wonTwo = w.code;
    const mine = await buy(demo, w.id, [WIN, WIN, WIN, WIN]);
    tickets.wonTwo = mine[0].serial; tickets.wonTwoSecond = mine[1].serial; tickets.held = mine[2].serial; tickets.forfeited = mine[3].serial;
    forfeit = mine[3].ticketId;
    await buy(others[0], w.id, [WIN]);
    await buy(others[2], w.id, [LOSE, LOSE]);
    await close(w); await seal(w.id, at, allYes()); await settle(w.id);
    must("hold", await holdMaswaliShare({ ticketId: forfeit, officerId: OWNER, reason: "Dev seed: a disqualification found late" }));
    must("forfeit", await forfeitMaswaliShare({ ticketId: forfeit, officerId: OWNER, typed: FORFEIT_SHARE_WORD, reason: "Dev seed: the review upheld it" }));
  }
  // wonBig — floor 2,000,000 and one winner: a share of seven digits.
  {
    const at = next();
    const w = await opened(at, 2_000_000);
    weeks.wonBig = w.code;
    const [win] = await buy(demo, w.id, [WIN]);
    tickets.wonBig = win.serial;
    await buy(others[3], w.id, [LOSE, LOSE]);
    await close(w); await seal(w.id, at, allYes()); await settle(w.id);
  }
  // driveRolled, wonDrive — the private DRIVE line (OD-21) on its own calendar (MR-3 holds per line): a week nobody won,
  // its pool carried to the next drive week, which the demo player then won beside another winner. The won ticket's
  // ledger is the one core's (`millioneaWeekMoneyRecord`), and its carry names the drive week it came from, never a link
  // (the public register has no page for a drive week).
  {
    const at = eatWeekStartMs(Date.now()) + 7 * DAY;
    const w = await opened(at, 0, "DRIVE");
    weeks.driveRolled = w.code;
    const [lost] = await buy(demo, w.id, [LOSE]);
    tickets.driveLost = lost.serial;
    await buy(others[4], w.id, [LOSE, LOSE]);
    await close(w); await seal(w.id, at, allYes()); await settle(w.id);
  }
  {
    const at = eatWeekStartMs(Date.now()) + 14 * DAY;
    const w = await opened(at, 0, "DRIVE");
    weeks.wonDrive = w.code;
    const [win] = await buy(demo, w.id, [WIN]);
    tickets.wonDrive = win.serial;
    await buy(others[4], w.id, [WIN, LOSE]);
    await close(w); await seal(w.id, at, allYes()); await settle(w.id);
  }
  // rollover — nobody at 10/10: the pool carried forward.
  {
    const at = next();
    const w = await opened(at);
    weeks.rollover = w.code;
    const [lost] = await buy(demo, w.id, [picks(2, 7)]);
    tickets.lostRollover = lost.serial;
    await buy(others[1], w.id, [LOSE, LOSE]);
    await close(w); await seal(w.id, at, allYes()); await settle(w.id);
  }
  // refunded — voided whole, its refunds landed.
  {
    const at = next();
    const w = await opened(at);
    weeks.refunded = w.code;
    const [t] = await buy(demo, w.id, [WIN]);
    tickets.refunded = t.serial;
    await buy(others[2], w.id, [LOSE]);
    await close(w); await seal(w.id, at, allYes(6));
    await weekStore.patch(w.id, { objectionsCloseAt: new Date(Date.now() - 60_000).toISOString() }); // a declared fixture of time
    must("void", await voidWeek({ weekId: w.id, actorId: OWNER }));
  }
  // refundPending — voided whole, its refunds not landed (the declared fixture of state above).
  {
    const at = next();
    const w = await opened(at);
    weeks.refundPending = w.code;
    const [t] = await buy(demo, w.id, [WIN]);
    tickets.refundPending = t.serial;
    await buy(others[3], w.id, [LOSE]);
    await close(w); await seal(w.id, at, allYes(6));
    await weekStore.patch(w.id, { objectionsCloseAt: new Date(Date.now() - 60_000).toISOString() }); // a declared fixture of time
    if (!(await weekStore.stampVoid(w.id))) throw new Error("stampVoid refused");
  }
  // results — results coming in; M3 voided BEFORE the demo player bought (the slip filled it, P10).
  {
    const at = next();
    const w = await opened(at);
    weeks.results = w.code;
    const pre = await sealQuestion({ weekId: w.id, slot: 3, outcome: "VOID", voidReason: "criterion_wrong", evidence: "The question was wrong, found before the close (dev seed)", officerId: SEALER });
    if (!pre.ok) throw new Error(`pre-close void: ${pre.error}`);
    const [cannot, alive] = await buy(demo, w.id, [WIN, picks(2)]);
    tickets.resultsCannotWin = cannot.serial; tickets.resultsAlive = alive.serial;
    await buy(others[4], w.id, [LOSE]);
    await close(w); await seal(w.id, at, { 1: "YES", 2: "NO", 4: "YES", 11: "YES" });
  }
  // objections — every result in, the window open.
  {
    const at = next();
    const w = await opened(at);
    weeks.objections = w.code;
    const [t, lost] = await buy(demo, w.id, [WIN, LOSE]);
    tickets.objections = t.serial; tickets.objectionsLost = lost.serial;
    await close(w); await seal(w.id, at, allYes());
  }
  // settling — the window closed, not settled (the declared fixture of time above).
  {
    const at = next();
    const w = await opened(at);
    weeks.settling = w.code;
    const [t] = await buy(demo, w.id, [WIN]);
    tickets.settling = t.serial;
    await close(w); await seal(w.id, at, allYes());
    await weekStore.patch(w.id, { objectionsCloseAt: new Date(Date.now() - 60_000).toISOString() }); // a declared fixture of time
  }
  // voiding — six mains void against five reserves, the window open: the week is being voided.
  {
    const at = next();
    const w = await opened(at);
    weeks.voiding = w.code;
    const [t] = await buy(demo, w.id, [WIN]);
    tickets.voiding = t.serial;
    await close(w); await seal(w.id, at, allYes(6));
  }
  // closed — sales closed, no result yet.
  {
    const at = next();
    const w = await opened(at);
    weeks.closed = w.code;
    const [t] = await buy(demo, w.id, [WIN]);
    tickets.closed = t.serial;
    await close(w);
  }
  // selling — one ticket bought now (its free cancel ends ten minutes later), one cancelled at once.
  {
    const at = next();
    const w = await opened(at);
    weeks.selling = w.code;
    const [open, cancelled] = await buy(demo, w.id, [WIN, picks(5)]);
    tickets.open = open.serial; tickets.cancelled = cancelled.serial;
    const c = await cancelMaswaliTicket({ userId: demo, positionId: cancelled.positionId });
    if (!c.ok) throw new Error(`cancel: ${(c as { error: string }).error}`);
    await buy(others[5], w.id, [LOSE]);
  }
  void name;
  return { tickets, weeks };
}

/** The sunset (MR-30): one final week, no 10/10 — its top score (9) shares the jackpot, with no floor top-up. */
async function seedSunset() {
  const demo = await demoId();
  await groundwork();
  const other = await account(200_000);
  const at = eatWeekStartMs(Date.now()) + 2 * 7 * DAY;
  const w = await opened(at);
  must("sunset", await sunsetMaswali({ weekId: w.id, ownerId: OWNER, typed: SUNSET_WORD, reason: "Dev seed: the final week of Millionea" }));
  const [top, below] = await buy(demo, w.id, [picks(4), picks(4, 8)]);
  await buy(other, w.id, [picks(1, 2), picks(3, 6, 9)]);
  await close(w); await seal(w.id, at, allYes()); await settle(w.id);
  return { tickets: { sunsetTop: top.serial, sunsetLost: below.serial }, weeks: { sunset: w.code } };
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { step?: string; serial?: string; week?: string; slot?: number; outcome?: string; userId?: string };
  try {
    switch (body.step) {
      case "weeks":
      case "sunset": {
        if (!rolloutSells(await millioneaStateNow(0), "PUBLIC")) {
          return NextResponse.json({ ok: false, error: "Start next dev with FEATURE_MILLIONEA=ACTIVE: the ticket arm reads the real rollout." }, { status: 409 });
        }
        if ((await weekStore.list({ visibility: "PUBLIC", limit: 1 })).length > 0) {
          return NextResponse.json({ ok: false, error: "Millionea weeks already exist on this store; restart the dev server to seed again." }, { status: 409 });
        }
        const seeded = body.step === "weeks" ? await seedWeeks() : await seedSunset();
        // Kept for the drives that come after the shots on the same server (step "info"): this process's store only.
        (globalThis as { __mlnTicketSeed?: unknown }).__mlnTicketSeed = seeded;
        return NextResponse.json({ ok: true, ...seeded });
      }
      case "info": {
        const seeded = (globalThis as { __mlnTicketSeed?: { tickets: Record<string, string>; weeks: Record<string, string> } }).__mlnTicketSeed;
        return seeded ? NextResponse.json({ ok: true, ...seeded }) : NextResponse.json({ ok: false, error: "Nothing seeded on this server yet." }, { status: 409 });
      }
      case "fresh": {
        const demo = await demoId();
        const w = await weekStore.openFor("PUBLIC");
        if (!w) return NextResponse.json({ ok: false, error: "No week is on sale." }, { status: 409 });
        const [t] = await buy(demo, w.id, [WIN]);
        return NextResponse.json({ ok: true, serial: t.serial });
      }
      case "hold": {
        const t = body.serial ? await ticketStore.getBySerial(body.serial) : null;
        if (!t) return NextResponse.json({ ok: false, error: "No such ticket." }, { status: 404 });
        must("hold", await holdMaswaliShare({ ticketId: t.id, officerId: OWNER, reason: "Dev seed: a reversed deposit funded it" }));
        return NextResponse.json({ ok: true });
      }
      case "seal": {
        const w = body.week ? await weekStore.getByCode(body.week) : null;
        const outcome = body.outcome === "YES" || body.outcome === "NO" || body.outcome === "VOID" ? body.outcome : null;
        if (!w || !outcome || !Number.isInteger(body.slot)) return NextResponse.json({ ok: false, error: "week, slot and outcome" }, { status: 400 });
        const r = await sealQuestion({
          weekId: w.id, slot: body.slot as number, outcome, voidReason: outcome === "VOID" ? "abandoned" : null,
          evidence: `Official result for event ${body.slot} (dev seed, sealed live)`, officerId: SEALER,
        });
        return NextResponse.json(r.ok ? { ok: true } : { ok: false, error: r.error }, { status: r.ok ? 200 : 409 });
      }
      case "break": {
        if (!body.userId) return NextResponse.json({ ok: false, error: "userId" }, { status: 400 });
        await coolOff(body.userId, "24h");
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ ok: false, error: "step: weeks | sunset | info | fresh | hold | seal | break" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ ok: false, error: String((err as Error).message ?? err) }, { status: 500 });
  }
}
