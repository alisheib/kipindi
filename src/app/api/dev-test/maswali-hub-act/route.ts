/**
 * DEV ONLY — move a seeded Millionea store through the hub's states, one act at a time, through the product's own services
 * (MASWALI-BUILD S5-DESIGN-HUB; the design lanes' brief: "shoot every state of your surface — extend the dev-test seeding").
 * 404 in production; refused on any server with a database configured (it writes, and only to the in-memory store).
 *
 *   POST { act, … }  →  { ok, … }  after `POST /api/dev-test/seed-maswali` built the weeks
 *
 * ⛔ FORWARD ONLY, AND ALWAYS THROUGH THE SERVICES: a purchase is `purchaseMaswaliTickets` (the one bet path), a close
 *    `closeWeek`, a result `sealQuestion`, a settlement `previewMaswaliSettlement` + `settleMaswaliWeek`, a void `voidWeek`,
 *    a pause the officer's own `pauseMaswaliSales`, a moved close `moveClose`, a final week the Owner's `sunsetMaswali`, a
 *    break the player's own `coolOff`. No row is written by hand, so every state the hub draws is a state the product
 *    produces. The one declared FIXTURE OF TIME is seed-maswali's own: a week's objection window moved (`window`), because a
 *    week weeks ahead can only close its window weeks ahead, and the hub reads the real clock.
 *
 * The acts (each answers what it did, or 409 with the service's refusal):
 *   · pause {on}            — sales paused or resumed (MB-62)
 *   · tickets {n, lose?, user?} — n tickets in the week on sale for the demo player (or `user`), every one 15 YES — or a
 *                             losing slip (`lose`) so a rollover can follow
 *   · moveClose {hours?}    — the week on sale's close moved earlier by `hours` (2), at that week's own clock (MB-28)
 *   · closeSoon {minutes?}  — the week on sale's close moved to `minutes` (40) from now on the real clock: its last hour
 *   · closeOpen             — the week on sale closed at its close
 *   · seal {slots, outcome} — results for the hub's lead week (the week on sale, else the newest being graded), at that
 *                             week's Sunday (after every event); a VOID on the "abandoned" ground
 *   · window {open}         — the lead week's objection window: its stamped end (open) or a minute ago (closed)
 *   · settle                — the lead week released (its window closed first)
 *   · catchUp               — every week graded BEFORE the lead, oldest first, sealed, then settled or voided (MR-3's order)
 *   · voidLead              — the lead week voided whole (its window closed first; its void must be certain)
 *   · openNext              — the newest drafted week attested and opened (only once no week sells: MR-3)
 *   · draftNext             — one more week drafted a week after the newest
 *   · sunsetDraft           — the newest drafted week made final, a full week ahead (OD-03); `sunsetOpen` — the week on sale
 *   · player {tickets, lose?} — a new player with `tickets` in the week on sale, signed in in this response's cookie (a
 *                             reader whose once-per-week notices are still unseen, one per language)
 *   · breakPlayer {tickets} — the same, then on the player's own one-hour cooling-off (the hub's break state; the demo
 *                             player stays free to play)
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import type { StoredUser, StoredWallet } from "@/lib/server/store";
import { randomId } from "@/lib/server/crypto";
import { createSession } from "@/lib/server/session";
import { coolOff } from "@/lib/server/responsible-gambling";
import {
  SUNSET_WORD, attestParity, closeWeek, createWeek, gradable, moveClose, openWeek, purchaseMaswaliTickets, sealQuestion, sunsetMaswali, voidWeek,
  type DraftQuestionInput,
} from "@/lib/server/maswali-service";
import { questionStore, weekStore, type StoredWeek } from "@/lib/server/maswali-dal";
import { weekVoidCertain } from "@/lib/maswali-score";
import { guaranteeReader } from "@/lib/server/maswali-money-service";
import { previewMaswaliSettlement, settleMaswaliWeek } from "@/lib/server/maswali-settlement";
import { pauseMaswaliSales, resumeMaswaliSales } from "@/lib/server/maswali-pause";
import { depositEntries, postLedgerEntries } from "@/lib/server/ledger";
import { eatWeekStartMs } from "@/lib/eat-day";
import { utcToZonedLocal } from "@/lib/maswali-time";

const DAY = 86_400_000;
const OWNER = "usr_dev_owner";
const SEALER = "usr_dev_sealer";
const DEMO_PHONE = "+255700000000";
const YES = Array.from({ length: 15 }, () => "YES" as const);
const LOSE = Array.from({ length: 15 }, (_, i) => (i === 0 ? "NO" as const : "YES" as const));

type Body = { act?: string; on?: boolean; n?: number; lose?: boolean; user?: string; hours?: number; minutes?: number; slots?: number[]; outcome?: "YES" | "NO" | "VOID"; open?: boolean; tickets?: number };
const refuse = (error: string) => NextResponse.json({ ok: false, error }, { status: 409 });

/** The week on sale, else the newest being graded in the calendar — the hub's own lead (`millioneaHub`). */
async function lead(): Promise<StoredWeek | null> {
  const open = await weekStore.openFor("PUBLIC");
  if (open) return open;
  const grading = await weekStore.list({ visibility: "PUBLIC", states: ["CLOSED", "RESOLVING"] });
  return grading.sort((a, b) => Date.parse(b.opensAt) - Date.parse(a.opensAt))[0] ?? null;
}
const weekStartOf = (w: StoredWeek) => eatWeekStartMs(Date.parse(w.opensAt));

/** Fifteen questions for a drafted week, seed-maswali's own shape (events from the Saturday after its Friday close). */
function questions(weekStart: number): DraftQuestionInput[] {
  const SOURCES = ["https://www.nbc.co.tz/results", "https://www.tff.or.tz/fixtures", "https://www.bot.go.tz/rates", "https://www.meteo.go.tz/bulletin", "https://www.coingecko.com/en/coins/bitcoin"];
  const CATS = ["sports", "sports", "macro", "weather", "crypto"];
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

/** A new player with `balance` deposited through the ledger (seed-maswali's own `player`). */
async function newPlayer(balance: number): Promise<{ id: string; phone: string }> {
  const now = new Date().toISOString();
  const id = `usr_${randomId(12)}`;
  const phone = `+2557${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
  await db.user.create({
    id, phoneE164: phone, email: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null, role: "PLAYER",
    status: "ACTIVE", locale: "EN", displayName: `Dev player ${id.slice(-4)}`, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, recruitedBy: null, createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null,
  } as unknown as StoredUser);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now } as unknown as StoredWallet);
  if (balance > 0) await postLedgerEntries(`seed_${id}`, depositEntries({ txnId: `seed_${id}`, userId: id, amount: balance, provider: "DEV_SEED" }));
  return { id, phone };
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  if (process.env.DATABASE_URL) return refuse("This route writes only to an in-memory dev store; this server has a database configured.");
  const b = ((await req.json().catch(() => null)) ?? {}) as Body;
  try {
    switch (b.act) {
      case "pause": {
        const r = b.on
          ? await pauseMaswaliSales({ officerId: OWNER, reason: "Dev drive: the hub's paused state, shot and resumed" })
          : await resumeMaswaliSales({ officerId: OWNER, note: "Dev drive: the paused state was shot; sales resume" });
        return r.ok ? NextResponse.json({ ok: true, paused: !!b.on }) : refuse(r.error);
      }
      case "tickets": {
        const week = await weekStore.openFor("PUBLIC");
        if (!week) return refuse("No week is on sale.");
        const userId = b.user ?? (await db.user.findByPhone(DEMO_PHONE))?.id;
        if (!userId) return refuse("The demo player does not exist yet: sign in at /auth/demo first.");
        const n = Math.max(1, Math.min(10, Math.floor(b.n ?? 1)));
        const r = await purchaseMaswaliTickets({ userId, weekId: week.id, slips: Array.from({ length: n }, () => (b.lose ? LOSE : YES)) });
        return r.ok ? NextResponse.json({ ok: true, week: week.code, bought: n }) : refuse(`buy: ${r.error}`);
      }
      case "moveClose": {
        const week = await weekStore.openFor("PUBLIC");
        if (!week) return refuse("No week is on sale.");
        const to = Date.parse(week.closesAt) - Math.max(1, b.hours ?? 2) * 3_600_000;
        const r = await moveClose({ weekId: week.id, toCloseAt: new Date(to).toISOString(), officerId: OWNER, now: new Date(Date.parse(week.opensAt) + DAY) });
        return r.ok ? NextResponse.json({ ok: true, from: week.closesAt, to: r.week.closesAt }) : refuse(r.error);
      }
      case "closeSoon": {
        // The last hour (M8, the countdown pill): the week on sale's close moved to `minutes` from NOW on the real clock —
        // the hub reads the real clock; the service still keeps every ticket's free-cancel window and the events' buffer.
        const week = await weekStore.openFor("PUBLIC");
        if (!week) return refuse("No week is on sale.");
        const to = Date.now() + Math.max(20, Math.min(59, b.minutes ?? 40)) * 60_000;
        const r = await moveClose({ weekId: week.id, toCloseAt: new Date(to).toISOString(), officerId: OWNER, now: new Date() });
        return r.ok ? NextResponse.json({ ok: true, from: week.closesAt, to: r.week.closesAt }) : refuse(r.error);
      }
      case "closeOpen": {
        const week = await weekStore.openFor("PUBLIC");
        if (!week) return refuse("No week is on sale.");
        const r = await closeWeek({ weekId: week.id, now: new Date(Date.parse(week.closesAt) + 60_000) });
        return r.ok ? NextResponse.json({ ok: true, closed: week.code }) : refuse(r.error);
      }
      case "seal": {
        const week = await lead();
        if (!week || week.state === "OPEN") return refuse("No week is being graded.");
        const at = new Date(weekStartOf(week) + 9 * DAY); // seed-maswali's own seal instant: every event and void deadline past
        const sealed: number[] = [];
        for (const slot of b.slots ?? []) {
          const v = b.outcome === "VOID";
          const r = await sealQuestion({
            weekId: week.id, slot, outcome: b.outcome ?? "YES", voidReason: v ? "abandoned" : null,
            evidence: v ? `Event ${slot} was abandoned with no official result (dev drive)` : `Official result for event ${slot} (dev drive)`, officerId: SEALER, now: at,
          });
          if (!r.ok) return refuse(`seal ${slot}: ${r.error}`);
          sealed.push(slot);
        }
        return NextResponse.json({ ok: true, week: week.code, sealed });
      }
      case "window": {
        const week = await lead();
        if (!week?.objectionsCloseAt) return refuse("The lead week has no objection window yet (its graded set is not final).");
        const end = b.open ? new Date(Date.now() + 2 * DAY) : new Date(Date.now() - 60_000);
        await weekStore.patch(week.id, { objectionsCloseAt: end.toISOString() }); // the declared fixture of time
        return NextResponse.json({ ok: true, week: week.code, objectionsCloseAt: end.toISOString() });
      }
      case "settle": {
        const week = await lead();
        if (!week || week.state === "OPEN") return refuse("No week is being graded.");
        if (!week.objectionsCloseAt) return refuse("The lead week's graded set is not final.");
        if (Date.parse(week.objectionsCloseAt) > Date.now()) await weekStore.patch(week.id, { objectionsCloseAt: new Date(Date.now() - 60_000).toISOString() });
        const at = new Date(Date.now());
        const p = await previewMaswaliSettlement(week.id, at);
        if (!p.ok) return refuse(`preview: ${p.error}`);
        const s = await settleMaswaliWeek({ weekId: week.id, releasedBy: OWNER, digest: p.preview.digest, now: at });
        return s.ok ? NextResponse.json({ ok: true, settled: week.code }) : refuse(`settle: ${s.error}`);
      }
      case "voidLead": {
        const week = await lead();
        if (!week || week.state === "OPEN") return refuse("No week is being graded.");
        if (!week.objectionsCloseAt) return refuse("The lead week's graded set is not final.");
        if (Date.parse(week.objectionsCloseAt) > Date.now()) await weekStore.patch(week.id, { objectionsCloseAt: new Date(Date.now() - 60_000).toISOString() });
        const r = await voidWeek({ weekId: week.id, now: new Date() });
        return r.ok ? NextResponse.json({ ok: true, voided: week.code, refunded: r.refunded ?? null }) : refuse(r.error);
      }
      case "catchUp": {
        // Every week being graded BEFORE the hub's lead, oldest first: its missing results sealed YES, its window closed,
        // then settled — or voided whole when its void is certain. Settlement runs strictly in order (MR-3), so a week can
        // settle only once every week before it has.
        const head = await lead();
        const behind = (await weekStore.list({ visibility: "PUBLIC", states: ["CLOSED", "RESOLVING"] }))
          .filter((w) => w.id !== head?.id).sort((a, b2) => Date.parse(a.opensAt) - Date.parse(b2.opensAt));
        const done: string[] = [];
        for (const w of behind) {
          const at = new Date(weekStartOf(w) + 9 * DAY);
          for (const q of await questionStore.listForWeek(w.id)) {
            if (q.outcome !== null) continue;
            const r = await sealQuestion({ weekId: w.id, slot: q.slot, outcome: "YES", voidReason: null, evidence: `Official result for event ${q.slot} (dev drive)`, officerId: SEALER, now: at });
            if (!r.ok) return refuse(`catch up ${w.code} seal ${q.slot}: ${r.error}`);
          }
          const sealed = await weekStore.get(w.id);
          if (!sealed?.objectionsCloseAt) return refuse(`catch up ${w.code}: its graded set is not final`);
          if (Date.parse(sealed.objectionsCloseAt) > Date.now()) await weekStore.patch(w.id, { objectionsCloseAt: new Date(Date.now() - 60_000).toISOString() });
          const certain = weekVoidCertain(gradable(await questionStore.listForWeek(w.id)));
          if (certain) {
            const v = await voidWeek({ weekId: w.id, now: new Date() });
            if (!v.ok) return refuse(`catch up ${w.code} void: ${v.error}`);
          } else {
            const p = await previewMaswaliSettlement(w.id, new Date());
            if (!p.ok) return refuse(`catch up ${w.code} preview: ${p.error}`);
            const s = await settleMaswaliWeek({ weekId: w.id, releasedBy: OWNER, digest: p.preview.digest, now: new Date() });
            if (!s.ok) return refuse(`catch up ${w.code} settle: ${s.error}`);
          }
          done.push(w.code);
        }
        return NextResponse.json({ ok: true, caughtUp: done });
      }
      case "openNext": {
        if (await weekStore.openFor("PUBLIC")) return refuse("A week is already on sale (MR-3).");
        const drafts = (await weekStore.list({ visibility: "PUBLIC", states: ["DRAFT"] })).sort((a, b2) => Date.parse(a.opensAt) - Date.parse(b2.opensAt));
        const next = drafts[0];
        if (!next) return refuse("No week is drafted.");
        const a = await attestParity({ weekId: next.id, officerId: "usr_dev_reader" });
        if (!a.ok) return refuse(`attest: ${a.error}`);
        const o = await openWeek({ weekId: next.id, officerId: OWNER, guarantee: guaranteeReader, now: new Date(Date.parse(next.opensAt) + 60_000) });
        return o.ok ? NextResponse.json({ ok: true, opened: o.week.code }) : refuse(`open: ${o.error}`);
      }
      case "draftNext": {
        const all = await weekStore.list({ visibility: "PUBLIC" });
        const newest = all.sort((a, b2) => Date.parse(b2.opensAt) - Date.parse(a.opensAt))[0];
        const start = (newest ? weekStartOf(newest) : eatWeekStartMs(Date.now())) + 7 * DAY;
        const c = await createWeek({ weekStartMs: start, questions: questions(start), officerId: OWNER, now: new Date(start - 3 * DAY) });
        return c.ok ? NextResponse.json({ ok: true, drafted: c.week.code }) : refuse(`draft: ${c.error}`);
      }
      case "sunsetDraft":
      case "sunsetOpen": {
        const week = b.act === "sunsetOpen"
          ? await weekStore.openFor("PUBLIC")
          : (await weekStore.list({ visibility: "PUBLIC", states: ["DRAFT"] })).sort((a, b2) => Date.parse(b2.opensAt) - Date.parse(a.opensAt))[0] ?? null;
        if (!week) return refuse(b.act === "sunsetOpen" ? "No week is on sale." : "No week is drafted.");
        const r = await sunsetMaswali({ weekId: week.id, ownerId: OWNER, typed: SUNSET_WORD, reason: "Dev drive: the hub's final-week states, shot on a dev store" });
        return r.ok ? NextResponse.json({ ok: true, final: week.code }) : refuse(r.error);
      }
      case "player": {
        const week = await weekStore.openFor("PUBLIC");
        if (!week) return refuse("No week is on sale.");
        const p = await newPlayer(50_000);
        const n = Math.max(0, Math.min(10, Math.floor(b.tickets ?? 1)));
        if (n > 0) {
          const r = await purchaseMaswaliTickets({ userId: p.id, weekId: week.id, slips: Array.from({ length: n }, () => (b.lose ? LOSE : YES)) });
          if (!r.ok) return refuse(`buy: ${r.error}`);
        }
        await createSession({ userId: p.id, phoneE164: p.phone, role: "PLAYER", kycStatus: "APPROVED" });
        return NextResponse.json({ ok: true, userId: p.id, tickets: n });
      }
      case "breakPlayer": {
        const week = await weekStore.openFor("PUBLIC");
        if (!week) return refuse("No week is on sale.");
        const p = await newPlayer(50_000);
        const n = Math.max(0, Math.min(10, Math.floor(b.tickets ?? 2)));
        if (n > 0) {
          const r = await purchaseMaswaliTickets({ userId: p.id, weekId: week.id, slips: Array.from({ length: n }, () => YES) });
          if (!r.ok) return refuse(`buy: ${r.error}`);
        }
        await coolOff(p.id, "1h");
        await createSession({ userId: p.id, phoneE164: p.phone, role: "PLAYER", kycStatus: "APPROVED" });
        return NextResponse.json({ ok: true, userId: p.id, tickets: n, onBreak: true });
      }
      default:
        return refuse(`Unknown act ${JSON.stringify(b.act)}.`);
    }
  } catch (err) {
    return NextResponse.json({ ok: false, error: String((err as Error).message ?? err) }, { status: 500 });
  }
}
