/**
 * DEV ONLY — THE ADMIN GUIDE'S WEEKS: one coherent Millionea story for the screenshots in `docs/maswali-operator-guide.html`
 * (MASWALI-BUILD S6-GUIDE 6; the lead's round 3 of 2026-10-23: "one capture now … every week's dates follow its own order …
 * a week's dates and state are the same in every picture … seed the demo names and the evidence text: realistic, plainly
 * fictional"). 404 in production; 409 on a configured database (it writes only to this process's in-memory store). It
 * changes no other seed: every week, ticket, seal, objection, settlement, hold and call goes through the product's own
 * services, exactly as `seed-maswali` makes its weeks.
 *
 *   POST { ownerId? }  →  { ok, storyNow, weeks: { settled, ready, objections, selling, draft }, lookup: { serial, phone } }
 *
 * THE STORY is told at `storyNow`: the Monday of the week on sale, 10:30 EAT. Every Millionea seed sits ahead of the real
 * clock — the one bet path sells only before a week's close on the real clock — so this story is four weeks ahead of the day
 * it is seeded, and a capture reads the console at `storyNow`. N is the week on sale:
 *   N−3  SETTLED: released the Monday after its close, 14:05, its window closed at 12:00 (two winners); Compliance holds one
 *        winner's share; the desk reached both winners by phone; their shares are not yet withdrawn (the payout float's
 *        alert stands).
 *   N−2  every result in; its objection window closed at 12:00 the Monday after its close, a week before `storyNow`; not
 *        released — the release waits, and its alert speaks. Under the rules' defaults (a 24-hour window that never closes
 *        before 12:00, weeks settled in order), a week ready to release and the next week's objections to rule stand at one
 *        instant only while a release waits.
 *   N−1  every main sealed by Sunday 09:40, so its objection window runs to Monday 12:00 and is open at `storyNow`; three
 *        objections to rule (two on M4, sealed by the results officer; one on M7, sealed by the Owner, `ownerId`); A4 and A5,
 *        reserves the graded set does not need, still to seal.
 *   N    on sale since Monday 00:00.
 *   N+1  drafted at 09:10 on `storyNow`'s Monday by a Trading officer, not yet attested (the capture attests it as the Owner).
 * Each week runs on the rules' own template (sales Monday 00:00 to Friday 18:00); its events run from Friday 19:30 to Saturday
 * 21:00; its seals come after their events; its void deadlines, final deadline and objection window are the product's own
 * computations from these instants.
 * Every week freezes the rules' defaults: this seed saves no rule.
 * ⚠️ DECLARED FIXTURES, as `seed-maswali` and `seed-maswali-register` declare theirs: each close is checked on its week's own
 *    clock (`__setMaswaliCloseClockForTests`); N−3's settled stamp is moved onto its release's instant (the settlement stamps
 *    the real clock, weeks before the week's own); tickets are bought, and the hold and the calls recorded, on the real clock —
 *    the stamps this story does not tell (no screen the guide shows prints them).
 * The people and the clubs are fictional: every account is "<name> Mfano" (Swahili for "example"), every club made up.
 * ⛔ ON A FRESH STORE ONLY, on a server whose rollout sells (FEATURE_MILLIONEA=ACTIVE), with the Millionea tick off
 *    (MASWALI_SCHEDULER=false, LIFECYCLE_TICKER=false): the tick would close, void or settle on the real clock.
 * Its guard: `npm run test:maswali-guide-seed` (the story's order, run in memory, with its plants) and its red twin
 * `npm run red:maswali-guide-seed`; the production refusal is `test:cert-devroutes`'.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import type { StoredUser, StoredWallet } from "@/lib/server/store";
import { hasDatabase } from "@/lib/server/prisma";
import {
  __setMaswaliCloseClockForTests, attestParity, closeWeek, createWeek, openWeek, purchaseMaswaliTickets, readDraftVersion, rolloutSells, sealQuestion,
  type DraftQuestionInput,
} from "@/lib/server/maswali-service";
import { fileMillioneaObjection } from "@/lib/server/maswali-objections";
import { holdMaswaliShare, previewMaswaliSettlement, settleMaswaliWeek } from "@/lib/server/maswali-settlement";
import { recordMillioneaWinnerReached, WINNER_REACHED_WORD } from "@/lib/server/maswali-console";
import { millioneaStateNow } from "@/lib/server/millionea-switch";
import { ticketStore, weekStore } from "@/lib/server/maswali-dal";
import { fundMaswaliGuarantee, guaranteeReader, GUARANTEE_FUND_WORD, maswaliAccountBalance } from "@/lib/server/maswali-money-service";
import { getLicenceBasis, recordLicenceBasis } from "@/lib/server/maswali-licence";
import { acct, depositEntries, postLedgerEntries } from "@/lib/server/ledger";
import { eatWeekStartMs } from "@/lib/eat-day";
import { utcToZonedLocal } from "@/lib/maswali-time";
import type { MaswaliPick } from "@/lib/maswali-score";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MINUTE = 60_000;
const ZONE = "Africa/Dar_es_Salaam";
/** An instant on a week's own EAT clock: `day` days after its Monday 00:00 (`mon`), at `hhmm`. */
const at = (mon: number, day: number, hhmm: string) => mon + day * DAY + Number(hhmm.slice(0, 2)) * HOUR + Number(hhmm.slice(3, 5)) * MINUTE;

/** The officers (fictional): the results officer who seals, a Trading officer who drafts and opens, the second reader who
 *  attests, Compliance (the hold, the calls), Finance (the release) and — unless the caller names its own — the Owner. */
const SEALER = "usr_guide_sealer";
const DRAFTER = "usr_guide_drafter";
const READER = "usr_guide_reader";
const COMPLIANCE = "usr_guide_compliance";
const FINANCE = "usr_guide_finance";
const OWNER = "usr_guide_owner";
const OFFICERS: Array<{ id: string; name: string; role: StoredUser["role"] }> = [
  { id: SEALER, name: "Amani Mfano", role: "MODERATOR" },
  { id: DRAFTER, name: "Faraja Mfano", role: "MODERATOR" },
  { id: READER, name: "Pendo Mfano", role: "MODERATOR" },
  { id: COMPLIANCE, name: "Saida Mfano", role: "COMPLIANCE" },
  { id: FINANCE, name: "Rashidi Mfano", role: "FINANCE" },
];
const PLAYERS = ["Neema Mfano", "Baraka Mfano", "Juma Mfano", "Zawadi Mfano", "Rehema Mfano", "Salim Mfano", "Upendo Mfano", "Hamisi Mfano",
  "Imani Mfano", "Mwanaidi Mfano", "Tumaini Mfano", "Khamisi Mfano"];
/** A plainly fictional number in a block no network issues: +255 700 000 1NN for players, 2NN for officers. */
const phoneOf = (block: 1 | 2, n: number) => `+255700000${block}${String(n).padStart(2, "0")}`;

const CLUBS = ["Kilima Stars", "Pwani United", "Mto Rovers", "Bahari FC", "Jiji Warriors", "Nyota City", "Upepo Athletic", "Mlima Rangers",
  "Ziwa Sharks", "Savana United", "Kisiwa FC", "Msitu Wanderers", "Mvua Strikers", "Jua Kali FC", "Kifaru Athletic", "Pembe United",
  "Mnara FC", "Bonde Rangers", "Tausi City", "Upinde Stars", "Kongwa Rovers", "Mawimbi FC"];

type Topic = "sports" | "crypto" | "macro" | "weather";
type Slot = { role: "MAIN" | "RESERVE"; ordinal: number; topic: Topic; source: string; day: number; time: string; sealDay: number; sealTime: string };
const NBC = "https://www.nbc.co.tz/results";
const TFF = "https://www.tff.or.tz/fixtures";
/** Each week's fifteen slots: kick-off (or reading) after Friday's 18:00 close, each seal after its event. M10's seal, on
 *  Sunday at 09:40, is the last a main needs: the graded set is final then, and the window runs 24 hours, to Monday 12:00. */
const SLOTS: Slot[] = [
  { role: "MAIN", ordinal: 1, topic: "sports", source: NBC, day: 4, time: "19:30", sealDay: 4, sealTime: "22:10" },
  { role: "MAIN", ordinal: 2, topic: "sports", source: TFF, day: 4, time: "20:30", sealDay: 4, sealTime: "23:05" },
  { role: "MAIN", ordinal: 3, topic: "sports", source: NBC, day: 5, time: "13:00", sealDay: 5, sealTime: "15:10" },
  { role: "MAIN", ordinal: 4, topic: "sports", source: TFF, day: 5, time: "14:00", sealDay: 5, sealTime: "16:05" },
  { role: "MAIN", ordinal: 5, topic: "sports", source: NBC, day: 5, time: "15:00", sealDay: 5, sealTime: "17:10" },
  { role: "MAIN", ordinal: 6, topic: "sports", source: TFF, day: 5, time: "16:00", sealDay: 5, sealTime: "18:05" },
  { role: "MAIN", ordinal: 7, topic: "sports", source: NBC, day: 5, time: "16:30", sealDay: 5, sealTime: "18:40" },
  { role: "MAIN", ordinal: 8, topic: "sports", source: TFF, day: 5, time: "17:00", sealDay: 5, sealTime: "19:10" },
  { role: "MAIN", ordinal: 9, topic: "sports", source: NBC, day: 5, time: "18:00", sealDay: 5, sealTime: "20:10" },
  { role: "MAIN", ordinal: 10, topic: "crypto", source: "https://www.coingecko.com/en/coins/bitcoin", day: 5, time: "19:00", sealDay: 6, sealTime: "09:40" },
  { role: "RESERVE", ordinal: 1, topic: "macro", source: "https://www.bot.go.tz/rates", day: 5, time: "12:00", sealDay: 5, sealTime: "12:40" },
  { role: "RESERVE", ordinal: 2, topic: "sports", source: NBC, day: 5, time: "13:30", sealDay: 5, sealTime: "15:40" },
  { role: "RESERVE", ordinal: 3, topic: "sports", source: TFF, day: 5, time: "15:30", sealDay: 5, sealTime: "17:40" },
  { role: "RESERVE", ordinal: 4, topic: "weather", source: "https://www.meteo.go.tz/bulletin", day: 5, time: "18:00", sealDay: 6, sealTime: "09:50" },
  { role: "RESERVE", ordinal: 5, topic: "crypto", source: "https://www.coingecko.com/en/coins/bitcoin", day: 5, time: "21:00", sealDay: 6, sealTime: "09:55" },
];
const CATEGORY: Record<Topic, string> = { sports: "sports", crypto: "crypto", macro: "macro", weather: "weather" };
const DAY_NAME = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SW = ["Jumatatu", "Jumanne", "Jumatano", "Alhamisi", "Ijumaa", "Jumamosi", "Jumapili"];
const DAY_ZH = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

/** Week `k`'s fixture for slot index `i`: a pair of clubs, a Bitcoin price, a rate. */
function fixture(k: number, i: number) {
  const sportsIndex = SLOTS.slice(0, i).filter((s) => s.topic === "sports").length;
  const home = CLUBS[(2 * sportsIndex + 3 * k) % CLUBS.length], away = CLUBS[(2 * sportsIndex + 1 + 3 * k) % CLUBS.length];
  const price = 88_000 + 1_000 * ((k * 5 + i) % 7);
  const rate = 2_440 + 5 * ((k + i) % 4);
  return { home, away, price, rate };
}
const usd = (n: number) => n.toLocaleString("en-US");

function questionsFor(k: number, mon: number): DraftQuestionInput[] {
  return SLOTS.map((s, i) => {
    const { home, away, price, rate } = fixture(k, i);
    const eventAt = at(mon, s.day, s.time);
    const base = { role: s.role, ordinal: s.ordinal, category: CATEGORY[s.topic], sourceUrl: s.source, eventKind: "SPORT" as const,
      eventLocalStart: utcToZonedLocal(eventAt, ZONE), eventZone: ZONE, probabilityEstimate: 0.4 + 0.05 * ((k + i) % 5) };
    if (s.topic === "sports") return { ...base, probabilitySource: "Trading desk estimate from both clubs' recent form",
      textEn: `Will ${home} beat ${away} on ${DAY_NAME[s.day]}?`, textSw: `Je, ${home} wataifunga ${away} siku ya ${DAY_SW[s.day]}?`,
      textZh: `${home}会在${DAY_ZH[s.day]}击败${away}吗？`,
      criterionEn: `YES if ${home} win in normal time, as the official match report records.`,
      criterionSw: `NDIO ikiwa ${home} watashinda ndani ya muda wa kawaida, kama ripoti rasmi ya mechi inavyoonyesha.`,
      criterionZh: `如果${home}在常规时间内获胜（以官方比赛报告为准），则为“是”。` };
    if (s.topic === "crypto") return { ...base, probabilitySource: "Trading desk estimate from the week's price range",
      textEn: `Will Bitcoin trade above USD ${usd(price)} at ${s.time} on Saturday?`, textSw: `Je, bei ya Bitcoin itazidi USD ${usd(price)} saa ${s.time} Jumamosi?`,
      textZh: `周六${s.time}比特币价格会高于${usd(price)}美元吗？`,
      criterionEn: `YES if CoinGecko's Bitcoin price at ${s.time} EAT on Saturday is above USD ${usd(price)}.`,
      criterionSw: `NDIO ikiwa bei ya Bitcoin kwenye CoinGecko saa ${s.time} (EAT) Jumamosi itazidi USD ${usd(price)}.`,
      criterionZh: `如果CoinGecko显示周六东非时间${s.time}比特币价格高于${usd(price)}美元，则为“是”。` };
    if (s.topic === "macro") return { ...base, probabilitySource: "Trading desk estimate from the month's published rates",
      textEn: `Will the Bank of Tanzania's US dollar rate for Saturday be above TZS ${usd(rate)}?`,
      textSw: `Je, kiwango cha dola ya Marekani cha Benki Kuu ya Tanzania kwa Jumamosi kitazidi TZS ${usd(rate)}?`,
      textZh: `坦桑尼亚央行周六的美元汇率会高于${usd(rate)}先令吗？`,
      criterionEn: `YES if the rate the Bank of Tanzania publishes for Saturday is above TZS ${usd(rate)} to the dollar.`,
      criterionSw: `NDIO ikiwa kiwango ambacho Benki Kuu ya Tanzania itachapisha kwa Jumamosi kitazidi TZS ${usd(rate)} kwa dola.`,
      criterionZh: `如果坦桑尼亚央行公布的周六美元汇率高于${usd(rate)}先令，则为“是”。` };
    return { ...base, probabilitySource: "Trading desk estimate from the seasonal forecast",
      textEn: "Will Dar es Salaam record rain on Saturday evening?", textSw: "Je, Dar es Salaam itapata mvua Jumamosi jioni?",
      textZh: "达累斯萨拉姆周六晚上会下雨吗？",
      criterionEn: "YES if the Tanzania Meteorological Authority's bulletin records rain in Dar es Salaam between 18:00 and 24:00 on Saturday.",
      criterionSw: "NDIO ikiwa taarifa ya Mamlaka ya Hali ya Hewa Tanzania itaonyesha mvua Dar es Salaam kati ya saa 12 jioni na saa 6 usiku Jumamosi.",
      criterionZh: "如果坦桑尼亚气象局公报显示周六18:00至24:00达累斯萨拉姆有降雨，则为“是”。" };
  });
}

/** What the source said, in the words an officer writes under Evidence. */
function evidenceFor(k: number, i: number, outcome: MaswaliPick): string {
  const s = SLOTS[i];
  const { home, away, price, rate } = fixture(k, i);
  if (s.topic === "sports") return outcome === "YES" ? `Official match report: ${home} 2–1 ${away}.` : `Official match report: ${home} 1–1 ${away}.`;
  if (s.topic === "crypto") return `CoinGecko: Bitcoin at USD ${usd(outcome === "YES" ? price + 1_240 : price - 1_590)} at ${s.time} EAT on Saturday.`;
  if (s.topic === "macro") return `Bank of Tanzania: TZS ${(outcome === "YES" ? rate + 6.3 : rate - 4.85).toFixed(2)} to the dollar for Saturday.`;
  return outcome === "YES" ? "TMA bulletin: 4.2 mm of rain at Dar es Salaam on Saturday evening." : "TMA bulletin: no rain at Dar es Salaam on Saturday evening.";
}

/** Each week's results, slot by slot (M1…M10, A1…A5). */
const RESULTS: MaswaliPick[][] = [
  ["YES", "NO", "YES", "YES", "NO", "YES", "NO", "YES", "YES", "NO", "YES", "NO", "YES", "NO", "YES"],
  ["NO", "YES", "YES", "NO", "YES", "NO", "YES", "YES", "NO", "YES", "NO", "YES", "YES", "YES", "NO"],
  ["YES", "YES", "NO", "YES", "NO", "YES", "NO", "NO", "YES", "YES", "YES", "NO", "YES", "NO", "YES"],
];
const losing = (r: MaswaliPick[]): MaswaliPick[] => r.map((p, i) => (i === 0 ? (p === "YES" ? "NO" : "YES") : p));

async function account(id: string, name: string, role: StoredUser["role"], phone: string, balance: number): Promise<string> {
  const now = new Date().toISOString();
  await db.user.create({
    id, phoneE164: phone, email: null, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null, role, status: "ACTIVE",
    locale: "EN", displayName: name, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null, recruitedBy: null, createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null,
  } as unknown as StoredUser);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now } as unknown as StoredWallet);
  if (balance > 0) await postLedgerEntries(`guide_${id}`, depositEntries({ txnId: `guide_${id}`, userId: id, amount: balance, provider: "MPESA" }));
  return id;
}

async function draftWeek(k: number, mon: number, now: number) {
  const c = await createWeek({ weekStartMs: mon, questions: questionsFor(k, mon), officerId: DRAFTER, now: new Date(now) });
  if (!c.ok) throw new Error(`draft: ${c.error}`);
  return c.week;
}
async function openedWeek(k: number, mon: number) {
  const w = await draftWeek(k, mon, at(mon, -4, "11:00"));
  const a = await attestParity({ weekId: w.id, officerId: READER, readVersion: await readDraftVersion(w.id) });
  if (!a.ok) throw new Error(`attest: ${a.error}`);
  const o = await openWeek({ weekId: w.id, officerId: DRAFTER, guarantee: guaranteeReader, now: new Date(Date.parse(w.opensAt)) });
  if (!o.ok) throw new Error(`open: ${o.error}`);
  return o.week;
}
async function buy(weekId: string, userId: string, slip: MaswaliPick[], n: number) {
  const r = await purchaseMaswaliTickets({ userId, weekId, slips: Array.from({ length: n }, () => slip) });
  if (!r.ok) throw new Error(`buy: ${r.error}`);
}
async function closed(week: { id: string; closesAt: string }) {
  const c = await closeWeek({ weekId: week.id, now: new Date(Date.parse(week.closesAt)) });
  if (!c.ok) throw new Error(`close: ${c.error}`);
}
/** Seal week `k`'s slots (indices into SLOTS) at their own seal times, in the order of those times, each by the results
 *  officer unless `by` names another. */
async function seal(k: number, weekId: string, mon: number, slots: number[], by: Record<number, string> = {}) {
  const sealAt = (i: number) => at(mon, SLOTS[i].sealDay, SLOTS[i].sealTime);
  for (const i of [...slots].sort((a, b) => sealAt(a) - sealAt(b))) {
    const s = SLOTS[i];
    const outcome = RESULTS[k % RESULTS.length][i];
    const r = await sealQuestion({ weekId, slot: i + 1, outcome, voidReason: null, evidence: evidenceFor(k, i, outcome), officerId: by[i] ?? SEALER,
      now: new Date(at(mon, s.sealDay, s.sealTime)) });
    if (!r.ok) throw new Error(`seal ${i + 1}: ${r.error}`);
  }
}
const ALL = SLOTS.map((_, i) => i);

export async function POST(req?: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  if (process.env.DATABASE_URL || hasDatabase()) return NextResponse.json({ ok: false, error: "In-memory local evidence only" }, { status: 409 });
  const body = (await req?.json().catch(() => null)) as { ownerId?: unknown } | null;
  __setMaswaliCloseClockForTests((weekClockMs) => weekClockMs);
  try {
    if (!rolloutSells(await millioneaStateNow(0), "PUBLIC")) {
      return NextResponse.json({ ok: false, error: "Start next dev with FEATURE_MILLIONEA=ACTIVE: the ticket arm reads the real rollout." }, { status: 409 });
    }
    if ((await weekStore.list({ visibility: "PUBLIC", limit: 1 })).length > 0) {
      return NextResponse.json({ ok: false, error: "Millionea weeks already exist on this store; restart the dev server to seed again." }, { status: 409 });
    }
    for (const [n, o] of OFFICERS.entries()) await account(o.id, o.name, o.role, phoneOf(2, n + 1), 0);
    const owner = typeof body?.ownerId === "string" && body.ownerId ? body.ownerId : await account(OWNER, "Halima Mfano", "ADMIN", phoneOf(2, 9), 0);
    if (getLicenceBasis().kind === "NONE") await recordLicenceBasis({ kind: "OWNER_RULING", ref: "The Owner's dated ruling, filed with the Gaming Board correspondence" }, owner);
    if (((await maswaliAccountBalance(acct.maswaliGuarantee)) ?? 0) < 9_000_000) {
      await fundMaswaliGuarantee({ amount: 9_000_000, reference: "BANK-TT-0417", typed: GUARANTEE_FUND_WORD, ownerId: owner });
    }
    const players: string[] = [];
    for (const [n, name] of PLAYERS.entries()) players.push(await account(`usr_guide_p${String(n + 1).padStart(2, "0")}`, name, "PLAYER", phoneOf(1, n + 1), 200_000));
    const [neema, baraka, juma, zawadi, rehema] = players;

    // N−3 · settled: two winners, then released the Monday after its close at 14:05 (its window closed at 12:00).
    const m3 = eatWeekStartMs(Date.now()) + 7 * DAY;
    const w3 = await openedWeek(0, m3);
    await buy(w3.id, baraka, RESULTS[0], 1);
    await buy(w3.id, rehema, RESULTS[0], 1);
    for (const p of players.filter((u) => u !== baraka && u !== rehema).slice(0, 9)) await buy(w3.id, p, losing(RESULTS[0]), 6);
    await closed(w3);
    await seal(0, w3.id, m3, ALL);
    const released = new Date(at(m3, 7, "14:05"));
    const preview = await previewMaswaliSettlement(w3.id, released);
    if (!preview.ok) throw new Error(`preview: ${preview.error}`);
    const settled = await settleMaswaliWeek({ weekId: w3.id, releasedBy: FINANCE, digest: preview.preview.digest, now: released });
    if (!settled.ok) throw new Error(`settle: ${settled.error}`);
    await weekStore.patch(w3.id, { settledAt: released.toISOString() }); // the declared fixture of the settled stamp
    const won = await ticketStore.listForWeek(w3.id, { status: "SETTLED", won: true });
    const held = won.find((t) => t.userId === baraka);
    if (!held || won.length !== 2) throw new Error(`winners: expected Baraka's and Rehema's tickets, found ${won.length}`);
    const h = await holdMaswaliShare({ ticketId: held.id, officerId: COMPLIANCE, reason: "Checking the winner's identity documents before paying." });
    if (!h.ok) throw new Error(`hold: ${h.error}`);
    for (const userId of [baraka, rehema]) {
      const r = await recordMillioneaWinnerReached({ weekId: w3.id, userId, officerId: COMPLIANCE, typed: WINNER_REACHED_WORD,
        note: "Called the number on the account; told the winner of the share and how to withdraw it." });
      if (!r.ok) throw new Error(`reached: ${r.error}`);
    }

    // N−2 · every result in, its window closed the Monday after its close; not released — the release waits.
    const m2 = m3 + 7 * DAY;
    const w2 = await openedWeek(1, m2);
    await buy(w2.id, players[6], RESULTS[1], 1);
    await buy(w2.id, players[9], RESULTS[1], 1);
    // Baraka's wallet is held from here on (his N−3 share): he buys nothing more.
    const free = players.filter((u) => u !== baraka);
    for (const p of free.filter((u) => u !== players[6] && u !== players[9])) await buy(w2.id, p, losing(RESULTS[1]), 5);
    await closed(w2);
    await seal(1, w2.id, m2, ALL);

    // N−1 · the mains and A1–A3 sealed (M7 by the Owner); A4 and A5 still to seal; three objections in its window.
    const m1 = m2 + 7 * DAY;
    const w1 = await openedWeek(2, m1);
    await buy(w1.id, players[10], RESULTS[2], 1);
    for (const p of free.filter((u) => u !== players[10]).slice(0, 9)) await buy(w1.id, p, losing(RESULTS[2]), 5);
    await closed(w1);
    await seal(2, w1.id, m1, ALL.slice(0, 13), { 6: owner });
    const m4 = fixture(2, 3), m7 = fixture(2, 6);
    const filings: Array<{ userId: string; slot: number; reason: string; detail: string; when: number }> = [
      { userId: neema, slot: 4, reason: "SOURCE_CONTRADICTS", detail: `The federation's report shows ${m4.home} and ${m4.away} drew 1–1, so the result should be NO.`, when: at(m1, 6, "18:20") },
      { userId: juma, slot: 4, reason: "WRONG_OUTCOME", detail: `${m4.away} equalised in added time; ${m4.home} did not win in normal time.`, when: at(m1, 6, "21:05") },
      { userId: zawadi, slot: 7, reason: "WRONG_OUTCOME", detail: `${m7.home} won 2–1 according to the official match report, so this should be YES.`, when: at(m1, 7, "08:15") },
    ];
    for (const f of filings) {
      const r = await fileMillioneaObjection({ userId: f.userId, weekId: w1.id, slot: f.slot, reason: f.reason, detail: f.detail, now: new Date(f.when) });
      if (!r.ok) throw new Error(`objection ${f.slot}: ${r.error}`);
    }

    // N · on sale since Monday 00:00.
    const mn = m1 + 7 * DAY;
    const wn = await openedWeek(3, mn);
    for (const p of free.slice(0, 7)) await buy(wn.id, p, losing(RESULTS[0]), 5);
    await buy(wn.id, free[7], RESULTS[0], 2);

    // N+1 · drafted this morning, not yet attested.
    const wd = await draftWeek(4, mn + 7 * DAY, at(mn, 0, "09:10"));

    const storyNow = new Date(at(mn, 0, "10:30")).toISOString();
    return NextResponse.json({
      ok: true, storyNow,
      weeks: { settled: w3.id, ready: w2.id, objections: w1.id, selling: wn.id, draft: wd.id },
      lookup: { serial: held.serial, phone: phoneOf(1, 2) },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String((err as Error).message ?? err) }, { status: 500 });
  } finally {
    __setMaswaliCloseClockForTests(null);
  }
}
