/**
 * DEV ONLY — MILLIONEA OBJECTIONS TO RULE (MASWALI-BUILD S7-OB; MASWALI-PLAN §3 MR-16, MB-23): the officer queue's states for
 * `qa:maswali-objection-console`. 404 in production. Every week, ticket and objection goes through the product's own
 * services (the draft, the attestation, the open, the one bet path, the close, the seals, `fileMillioneaObjection`), and
 * every fixture of time it adds is declared where it is made.
 *
 *   POST { step: "queue", ownerId } → on a FRESH in-memory store: two weeks whose results are being decided, each with
 *                                     objections to rule                                       → { ok, weeks, objections }
 *
 *   closed   the earlier week: every result in, its check window CLOSED — ⚠️ A DECLARED FIXTURE OF TIME: `objectionsCloseAt`
 *            moved into the past, as `seed-maswali` does (a future week's window closes in the future) — and one OPEN
 *            objection still to rule, filed while the window was open;
 *   open     the later week, its check window open: M3 sealed by the Owner (`ownerId`, so the Owner reads why another
 *            officer rules it) with two objections, M5 sealed VOID by the Owner with one asking it back, and M7 sealed by the
 *            results officer with one.
 * ⛔ A fresh store (one public week sells at a time, MR-3), a server whose rollout sells (`FEATURE_MILLIONEA=ACTIVE`), and
 *    the Millionea tick off (`MASWALI_SCHEDULER=false`, `LIFECYCLE_TICKER=false`): the tick settles nothing here, by design.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import type { StoredUser, StoredWallet } from "@/lib/server/store";
import { randomId } from "@/lib/server/crypto";
import {
  __setMaswaliCloseClockForTests, attestParity, closeWeek, createWeek, openWeek, purchaseMaswaliTickets, readDraftVersion, sealQuestion, type DraftQuestionInput,
} from "@/lib/server/maswali-service";
import { weekStore } from "@/lib/server/maswali-dal";
import { fundMaswaliGuarantee, guaranteeReader, GUARANTEE_FUND_WORD, maswaliAccountBalance } from "@/lib/server/maswali-money-service";
import { fileMillioneaObjection } from "@/lib/server/maswali-objections";
import { getLicenceBasis, recordLicenceBasis } from "@/lib/server/maswali-licence";
import { acct, depositEntries, postLedgerEntries } from "@/lib/server/ledger";
import { eatWeekStartMs } from "@/lib/eat-day";
import { utcToZonedLocal } from "@/lib/maswali-time";
import type { MaswaliOutcome, MaswaliPick } from "@/lib/maswali-score";

const DAY = 86_400_000;
/** The results officer who seals what the Owner does not: a real staff account (a MODERATOR), as `seed-maswali` seals. */
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
const picks = (...no: number[]): MaswaliPick[] => Array.from({ length: 15 }, (_, i) => (no.includes(i + 1) ? "NO" : "YES"));

async function account(balance: number, role: "PLAYER" | "MODERATOR" = "PLAYER", id = `usr_${randomId(12)}`, name?: string): Promise<string> {
  const now = new Date().toISOString();
  await db.user.create({
    id, phoneE164: `+2557${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`, email: null, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role, status: "ACTIVE", locale: "EN", displayName: name ?? (role === "PLAYER" ? `Dev player ${id.slice(-4)}` : "Dev results officer"),
    dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    recruitedBy: null, createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null,
  } as unknown as StoredUser);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now } as unknown as StoredWallet);
  if (balance > 0) await postLedgerEntries(`seed_${id}`, depositEntries({ txnId: `seed_${id}`, userId: id, amount: balance, provider: "DEV_SEED" }));
  return id;
}
function must(what: string, r: { ok: boolean }): void {
  if (!r.ok) throw new Error(`${what}: ${(r as { error?: string }).error ?? "refused"}`);
}

/** A week drafted, attested, opened, sold to `buyers`, closed, and every result sealed on its results day (by `by[slot]`,
 *  else the results officer). */
async function week(ms: number, ownerId: string, buyers: Array<[string, MaswaliPick[]]>, outcomes: Record<number, MaswaliOutcome>, by: Record<number, string>) {
  const c = await createWeek({ weekStartMs: ms, visibility: "PUBLIC", questions: questions(ms), officerId: ownerId, now: new Date(ms - 3 * DAY) });
  if (!c.ok) throw new Error(`draft: ${c.error}`);
  must("attest", await attestParity({ weekId: c.week.id, officerId: "usr_dev_reader", readVersion: await readDraftVersion(c.week.id) }));
  const o = await openWeek({ weekId: c.week.id, officerId: ownerId, guarantee: guaranteeReader, now: new Date(ms + 60_000) });
  if (!o.ok) throw new Error(`open: ${o.error}`);
  for (const [userId, slip] of buyers) must("buy", await purchaseMaswaliTickets({ userId, weekId: o.week.id, slips: [slip] }));
  must("close", await closeWeek({ weekId: o.week.id, now: new Date(Date.parse(o.week.closesAt) + 60_000) }));
  for (let slot = 1; slot <= 15; slot++) {
    const outcome = outcomes[slot] ?? "YES";
    const voided = outcome === "VOID";
    must(`seal ${slot}`, await sealQuestion({
      weekId: o.week.id, slot, outcome, voidReason: voided ? "abandoned" : null,
      evidence: voided ? `Event ${slot} was abandoned with no official result (dev seed)` : `Official result for event ${slot} (dev seed)`,
      officerId: by[slot] ?? SEALER, now: new Date(ms + 9 * DAY),
    }));
  }
  return (await weekStore.get(o.week.id))!;
}
/** One objection through the door, at the given instant (inside the week's window). */
async function file(userId: string, weekId: string, slot: number, reason: string, detail: string, now: Date): Promise<string> {
  const r = await fileMillioneaObjection({ userId, weekId, slot, reason, detail, now });
  if (!r.ok) throw new Error(`file ${slot}: ${r.error}`);
  return r.objectionId;
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { step?: string; ownerId?: string } | null;
  if (body?.step !== "queue") return NextResponse.json({ ok: false, error: "step must be \"queue\"" }, { status: 400 });
  const ownerId = String(body?.ownerId ?? "");
  // Each close reads its week's own clock as the database's (the seeds' and the suites' seam): these weeks close in the future.
  __setMaswaliCloseClockForTests((weekClockMs) => weekClockMs);
  try {
    const owner = await db.user.findById(ownerId);
    if (!owner || owner.role !== "ADMIN") throw new Error("ownerId must name an ADMIN account (sign in through /api/dev-test/seed-admin first).");
    if ((await weekStore.list({ limit: 1 })).length > 0) throw new Error("This store already has Millionea weeks: start a fresh in-memory server.");
    if (getLicenceBasis().kind === "NONE") await recordLicenceBasis({ kind: "OWNER_RULING", ref: "Dev seed — the Owner's ruling of 2026-10-16" }, ownerId);
    if (((await maswaliAccountBalance(acct.maswaliGuarantee)) ?? 0) < 10_000_000) {
      must("fund", await fundMaswaliGuarantee({ amount: 12_000_000, reference: "DEV-SEED-OBJECTIONS", typed: GUARANTEE_FUND_WORD, ownerId }));
    }
    if (!(await db.user.findById(SEALER))) await account(0, "MODERATOR", SEALER);
    const [p1, p2, p3, p4] = [
      await account(50_000, "PLAYER", undefined, "Neema Mushi"), await account(50_000, "PLAYER", undefined, "Baraka Kweka"),
      await account(50_000, "PLAYER", undefined, "Zawadi Said"), await account(50_000, "PLAYER", undefined, "Juma Haji"),
    ];
    const start = eatWeekStartMs(Date.now()) + 2 * 7 * DAY;

    // closed — the earlier week: one objection filed inside its window, then the window moved into the past.
    const closed = await week(start, ownerId, [[p4, picks(9)], [p1, picks()]], {}, {});
    const objClosed = await file(p4, closed.id, 9, "SOURCE_CONTRADICTS", "The federation's site lists event 9 as postponed, not played; please check before this result is final.",
      new Date(Date.parse(closed.gradedSetFinalAt!) + 60 * 60_000));
    await weekStore.patch(closed.id, { objectionsCloseAt: new Date(Date.now() - 60_000).toISOString() }); // the declared fixture of time

    // open — the later week, its window open: M3 and M5 sealed by the Owner, M7 by the results officer.
    const open = await week(start + 7 * DAY, ownerId, [[p1, picks(3)], [p2, picks(3, 5)], [p3, picks(7)], [p4, picks()]],
      { 5: "VOID" }, { 3: ownerId, 5: ownerId });
    const at = (m: number) => new Date(Date.parse(open.gradedSetFinalAt!) + m * 60_000);
    const objections = {
      m3a: await file(p1, open.id, 3, "WRONG_OUTCOME", "The official match report shows event 3 did not happen: the result should be NO.", at(30)),
      m3b: await file(p2, open.id, 3, "SOURCE_CONTRADICTS", "The source named in the question published NO for event 3 on Saturday evening.", at(45)),
      m5: await file(p2, open.id, 5, "OTHER", "Event 5 was played in full and the source has its result; it should not be void.", at(50)),
      m7: await file(p3, open.id, 7, "AMBIGUOUS_CRITERION", "The criterion does not say which source decides a tie, and two sources disagree.", at(60)),
      closed: objClosed,
    };
    return NextResponse.json({ ok: true, weeks: { closed: closed.code, open: open.code, closedId: closed.id, openId: open.id }, objections, sealer: SEALER });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error)?.message ?? e) }, { status: 500 });
  } finally {
    __setMaswaliCloseClockForTests(null);
  }
}
