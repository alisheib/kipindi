/**
 * DEV ONLY — seed Maswali Millionea weeks in every state, through the product's own services (MASWALI-BUILD S4), for the
 * console's acceptance drive (`qa:maswali-admin-drive`) and its screenshots (`qa:maswali-admin-shots`). 404 in production.
 *
 *   POST {}  →  { ok, weeks: { settled, ready, closed, voidable, selling, draft }, players }
 *
 * ⛔ ON A FRESH STORE ONLY (a fresh in-memory `next dev`): one public week may sell at a time (MR-3), so a second call
 *    answers 409 rather than build on whatever the first left.
 * ⛔ ON A SERVER WHOSE ROLLOUT SELLS (R10a): the ticket arm reads the real rollout itself, so start `next dev` with
 *    `FEATURE_MILLIONEA=ACTIVE` (a fresh store's switch is unset, so the ceiling decides); otherwise this answers 409.
 *
 * The weeks sit two to seven weeks ahead, in calendar order as in chain order (`seq`), and run on injected week clocks,
 * exactly as the S3 suites run them; money moves through `purchaseMaswaliTickets` and `settleMaswaliWeek`.
 *   · `closed` — its sales closed, all fifteen results still to seal: the seal console's own state, which no real clock
 *     reaches inside a drive (a week closes on its Friday).
 *   · `voidable` — six mains voided against five usable reserves (MR-18), its graded set final.
 * ⚠️ TWO FIXTURES OF TIME, declared: the release-ready and the voidable weeks' objection windows are moved into the past
 * (`objectionsCloseAt`, a patchable column), because a future week's window can only close in the future and the pools
 * and integrity pages read the real clock. ⚠️ The Millionea tick voids a certain week once its window has closed
 * (`maswali-scheduler.ts`), so the voidable week waits for the console's own void only while no tick runs
 * (`MASWALI_SCHEDULER=false` and `LIFECYCLE_TICKER=false` on the dev server); otherwise the system voids it first.
 * ⚠️ AND A THIRD (S7, MB-84): a close that is not early is checked on the database's clock, which no week here reaches, so
 * the seed hands each close its week's own clock as the database's (`__setMaswaliCloseClockForTests`, as the suites'
 * worlds do) and takes it back when it is done.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import type { StoredUser, StoredWallet } from "@/lib/server/store";
import { randomId } from "@/lib/server/crypto";
import {
  __setMaswaliCloseClockForTests, attestParity, closeWeek, createWeek, openWeek, purchaseMaswaliTickets, readDraftVersion, rolloutSells, sealQuestion,
  type DraftQuestionInput,
} from "@/lib/server/maswali-service";
import { millioneaStateNow } from "@/lib/server/millionea-switch";
import { weekStore } from "@/lib/server/maswali-dal";
import { fundMaswaliGuarantee, guaranteeReader, GUARANTEE_FUND_WORD, maswaliAccountBalance } from "@/lib/server/maswali-money-service";
import { previewMaswaliSettlement, settleMaswaliWeek } from "@/lib/server/maswali-settlement";
import { getLicenceBasis, recordLicenceBasis } from "@/lib/server/maswali-licence";
import { acct, depositEntries, postLedgerEntries } from "@/lib/server/ledger";
import { eatWeekStartMs } from "@/lib/eat-day";
import { utcToZonedLocal } from "@/lib/maswali-time";

const DAY = 86_400_000;
const OWNER = "usr_dev_owner";
/** The seals' officer (S5 VIS R11): a real staff account — a MODERATOR, the role whose default grant acts on `trading`, the
 *  domain `sealMaswaliQuestion` asks through `requireStaff` — so the public register reads its ROLE as it reads every real
 *  seal's, never "—" (a seal by an id with no account behind it is a state the product cannot produce). Created once,
 *  beside the players, with an empty wallet and no deposit. */
const SEALER = "usr_dev_sealer";
const SOURCES = ["https://www.nbc.co.tz/results", "https://www.tff.or.tz/fixtures", "https://www.bot.go.tz/rates", "https://www.meteo.go.tz/bulletin", "https://www.coingecko.com/en/coins/bitcoin"];
const CATS = ["sports", "sports", "macro", "weather", "crypto"];

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

/** A seeded account: a player with `balance` deposited — or, given `role` and `id`, the staff account that seals, with none. */
async function player(balance: number, role: "PLAYER" | "MODERATOR" = "PLAYER", id = `usr_${randomId(12)}`): Promise<string> {
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

async function draft(ms: number) {
  const c = await createWeek({ weekStartMs: ms, questions: questions(ms), officerId: OWNER, now: new Date(ms - 3 * DAY) });
  if (!c.ok) throw new Error(`draft: ${c.error}`);
  return c.week;
}
async function opened(ms: number) {
  const w = await draft(ms);
  const a = await attestParity({ weekId: w.id, officerId: "usr_dev_reader", readVersion: await readDraftVersion(w.id) });
  if (!a.ok) throw new Error(`attest: ${a.error}`);
  // At its drafted open, the config's own time (DESIGN_AUTHORITY §M8a item 24): the strip's sales start and the no-week
  // body's next open then read the same "Monday 00:00" — opened a minute late, the tiles drew 00:01 beside 00:00.
  const o = await openWeek({ weekId: w.id, officerId: OWNER, guarantee: guaranteeReader, now: new Date(Date.parse(w.opensAt)) });
  if (!o.ok) throw new Error(`open: ${o.error}`);
  return o.week;
}
const WIN = Array.from({ length: 15 }, () => "YES" as const);
const LOSE = Array.from({ length: 15 }, (_, i) => (i === 0 ? "NO" as const : "YES" as const));
async function sell(weekId: string, players: string[], winners: number) {
  for (let i = 0; i < players.length; i++) {
    const slips = i < winners ? [WIN] : Array.from({ length: 5 }, () => LOSE);
    const r = await purchaseMaswaliTickets({ userId: players[i], weekId, slips });
    if (!r.ok) throw new Error(`buy: ${r.error}`);
  }
}
/** Close the week, then seal all fifteen YES — or M1…M`voidedMains` VOID on the `abandoned` ground, a fact (MR-15). */
async function closeAndSeal(week: { id: string; closesAt: string }, ms: number, voidedMains = 0) {
  await closeWeek({ weekId: week.id, now: new Date(Date.parse(week.closesAt)) });
  for (let slot = 1; slot <= 15; slot++) {
    const voided = slot <= voidedMains;
    const r = await sealQuestion({
      weekId: week.id, slot, outcome: voided ? "VOID" : "YES", voidReason: voided ? "abandoned" : null,
      evidence: voided ? `Event ${slot} was abandoned with no official result (dev seed)` : `Official result for event ${slot} (dev seed)`,
      officerId: SEALER, now: new Date(ms + 9 * DAY),
    });
    if (!r.ok) throw new Error(`seal ${slot}: ${r.error}`);
  }
}

export async function POST() {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  __setMaswaliCloseClockForTests((weekClockMs) => weekClockMs);
  try {
    if (!rolloutSells(await millioneaStateNow(0), "PUBLIC")) {
      return NextResponse.json({ ok: false, error: "Start next dev with FEATURE_MILLIONEA=ACTIVE to seed Millionea weeks: the ticket arm reads the real rollout." }, { status: 409 });
    }
    if (getLicenceBasis().kind === "NONE") await recordLicenceBasis({ kind: "OWNER_RULING", ref: "Dev seed — the Owner's ruling of 2026-10-16" }, OWNER);
    if (((await maswaliAccountBalance(acct.maswaliGuarantee)) ?? 0) < 6_000_000) {
      await fundMaswaliGuarantee({ amount: 8_000_000, reference: "DEV-SEED-0001", typed: GUARANTEE_FUND_WORD, ownerId: OWNER });
    }
    if ((await weekStore.list({ visibility: "PUBLIC", limit: 1 })).length > 0) {
      return NextResponse.json({ ok: false, error: "Millionea weeks already exist on this store; restart the dev server to seed again." }, { status: 409 });
    }
    const players = await Promise.all(Array.from({ length: 12 }, () => player(200_000)));
    await player(0, "MODERATOR", SEALER);
    // A settled week (with one winner), a week ready to release, a closed week to seal, a week that voids whole, a selling
    // week, then a draft — each opened only once the one before it stopped selling (MR-3).
    const m1 = eatWeekStartMs(Date.now()) + 2 * 7 * DAY;
    const w1 = await opened(m1);
    await sell(w1.id, players, 1);
    await closeAndSeal(w1, m1);
    const at1 = new Date(Date.parse((await weekStore.get(w1.id))!.objectionsCloseAt!) + 60_000);
    const p1 = await previewMaswaliSettlement(w1.id, at1);
    if (!p1.ok) throw new Error(`preview 1: ${p1.error}`);
    const s1 = await settleMaswaliWeek({ weekId: w1.id, releasedBy: OWNER, digest: p1.preview.digest, now: at1 });
    if (!s1.ok) throw new Error(`settle 1: ${s1.error}`);

    const m2 = m1 + 7 * DAY;
    const w2 = await opened(m2);
    await sell(w2.id, players, 2);
    await closeAndSeal(w2, m2);
    await weekStore.patch(w2.id, { objectionsCloseAt: new Date(Date.now() - 60_000).toISOString() }); // the first declared fixture of time

    // Closed with every result still to seal. Its void deadlines lie weeks ahead, so the tick proposes nothing on it.
    const mc = m2 + 7 * DAY;
    const wc = await opened(mc);
    await sell(wc.id, players.slice(0, 6), 0);
    const closed = await closeWeek({ weekId: wc.id, now: new Date(Date.parse(wc.closesAt)) });
    if (!closed.ok) throw new Error(`close: ${closed.error}`);

    // Voids whole: six voided mains outnumber the five usable reserves (MR-18), and its window has closed.
    const mv = mc + 7 * DAY;
    const wv = await opened(mv);
    await sell(wv.id, players.slice(0, 6), 0);
    await closeAndSeal(wv, mv, 6);
    await weekStore.patch(wv.id, { objectionsCloseAt: new Date(Date.now() - 60_000).toISOString() }); // the second declared fixture of time

    const m3 = mv + 7 * DAY;
    const w3 = await opened(m3);
    await sell(w3.id, players.slice(0, 8), 0);

    const w4 = await draft(m3 + 7 * DAY);
    return NextResponse.json({
      ok: true, weeks: { settled: w1.id, ready: w2.id, closed: wc.id, voidable: wv.id, selling: w3.id, draft: w4.id }, players: players.length,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String((err as Error).message ?? err) }, { status: 500 });
  } finally {
    __setMaswaliCloseClockForTests(null);
  }
}
