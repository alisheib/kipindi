/**
 * DEV ONLY — seed the Week register's every state (MASWALI-BUILD S5-DESIGN-REGISTER, 2026-10-21 — Ali's 10/10 pass), for
 * its tile read (`qa:maswali-register-shots`): the weeks a reader meets on `/millionea/register` and `/[week]`, each made
 * through the product's own services on injected week clocks, as `seed-maswali` makes the console's. 404 in production.
 *
 *   POST { scenario: "states" }  — nine public weeks, two to ten weeks ahead, in calendar order:
 *      1 · settled, a floor week (the house topped the jackpot up) with one 10/10 ticket, main 3 voided and A1 standing in;
 *      2 · settled, nobody at 10/10: the whole pool carried forward;
 *      3 · voided whole (six voided mains against five valid reserves), every refund landed, its carry handed on;
 *      4 · settled above the floor, the carry of week 2 in (across the void), seven winners and a rounding remainder;
 *      5 · settling — every result in, its objection window closed (a declared fixture of time), not yet settled;
 *      6 · in its objection window — every result in, the window open;
 *      7 · results coming in — six of fifteen sealed, main 2 voided and waiting for its reserve;
 *      8 · being voided — six voided mains sealed, the void certain, its window open;
 *      9 · on sale.
 *   POST { scenario: "sunset" }  — one settled week, then the FINAL week (MR-30, made final by the Owner's own act) settled
 *      on its highest score: no ticket at 10/10, two at 9 of 10, three at 8.
 *   POST { pause: true }         — after a seed: the sales paused (the selling week's chip, "Paused for now").
 * ⚠️ DECLARED FIXTURES: the "states" scenario lowers the floor for the weeks it opens to TZS 20,000 (`saveMaswaliConfig`,
 *    the rules' own writer) — so a week of a dozen players' tickets can stand above it, which the floor of TZS 1,000,000
 *    never lets a dev store show — and week 5's objection window is moved into the past (`objectionsCloseAt`, as
 *    seed-maswali moves its own, with its opening a day before). Shoot How to play from a store that did not take the
 *    lowered floor. In both scenarios a settled week's stamp is moved onto the week's own clock (`settle`): the weeks sit
 *    ahead of today so they can sell, and the real clock's stamp would read as settled before the sales closed.
 * ⛔ ON A FRESH STORE ONLY, on a server whose rollout sells (FEATURE_MILLIONEA=ACTIVE), and with MASWALI_SCHEDULER=false
 *    and LIFECYCLE_TICKER=false — or the tick voids the certain weeks itself.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import type { StoredUser, StoredWallet } from "@/lib/server/store";
import { randomId } from "@/lib/server/crypto";
import {
  __liftMillioneaOpenHoldForTests, __setMaswaliCloseClockForTests, attestParity, closeWeek, createWeek, openWeek, purchaseMaswaliTickets, readDraftVersion, rolloutSells, sealQuestion,
  sunsetMaswali, SUNSET_WORD, voidWeek, type DraftQuestionInput,
} from "@/lib/server/maswali-service";
import { millioneaStateNow } from "@/lib/server/millionea-switch";
import { weekStore } from "@/lib/server/maswali-dal";
import { fundMaswaliGuarantee, guaranteeReader, GUARANTEE_FUND_WORD, maswaliAccountBalance } from "@/lib/server/maswali-money-service";
import { previewMaswaliSettlement, settleMaswaliWeek } from "@/lib/server/maswali-settlement";
import { getLicenceBasis, recordLicenceBasis } from "@/lib/server/maswali-licence";
import { saveMaswaliConfig } from "@/lib/server/maswali-config";
import { pauseMaswaliSales } from "@/lib/server/maswali-pause";
import { acct, depositEntries, postLedgerEntries } from "@/lib/server/ledger";
import { eatWeekStartMs } from "@/lib/eat-day";
import { utcToZonedLocal } from "@/lib/maswali-time";
import type { MaswaliPick } from "@/lib/maswali-score";

const DAY = 86_400_000;
const OWNER = "usr_dev_owner";
/** The seals' officer: a real staff account (a MODERATOR, the role whose default grant seals), as seed-maswali's. */
const SEALER = "usr_dev_sealer";

/** Fifteen questions of the shape a real week carries — long Swahili included — each with its criterion and its source. */
const BANK: Array<{ cat: string; url: string; en: string; sw: string; zh: string; cEn: string; cSw: string; cZh: string }> = [
  { cat: "sports", url: "https://www.nbc.co.tz/results", en: "Will Simba SC win their NBC Premier League match on Saturday?", sw: "Je, Simba SC itashinda mechi yake ya Ligi Kuu ya NBC Jumamosi?", zh: "Simba SC 能否赢得周六的 NBC 超级联赛比赛？", cEn: "YES if Simba SC win in normal time, per the league's official result; a draw or a loss is NO.", cSw: "NDIO ikiwa Simba SC itashinda katika muda wa kawaida, kwa matokeo rasmi ya ligi; sare au kupoteza ni HAPANA.", cZh: "若 Simba SC 在常规时间内获胜（以联赛官方结果为准）则为是；平局或输球为否。" },
  { cat: "crypto", url: "https://www.coingecko.com/en/coins/bitcoin", en: "Will Bitcoin trade above $120,000 at 23:59 on Sunday?", sw: "Je, bei ya Bitcoin itakuwa juu ya $120,000 Jumapili saa 23:59?", zh: "比特币在周日 23:59 的价格会高于 120,000 美元吗？", cEn: "YES if CoinGecko's BTC-USD price at 23:59 EAT on Sunday is above $120,000.", cSw: "NDIO ikiwa bei ya BTC-USD ya CoinGecko saa 23:59 EAT Jumapili iko juu ya $120,000.", cZh: "若周日 23:59 EAT 时 CoinGecko 的 BTC-USD 价格高于 120,000 美元则为是。" },
  { cat: "weather", url: "https://www.meteo.go.tz/bulletin", en: "Will at least 1 mm of rain fall in Dar es Salaam on Sunday (TMA gauge)?", sw: "Je, mvua ya angalau mm 1 itanyesha Dar es Salaam Jumapili (kipimo cha TMA)?", zh: "周日达累斯萨拉姆的降雨量会达到至少 1 毫米吗（以 TMA 测量为准）？", cEn: "YES if the TMA's daily bulletin records 1 mm or more at Dar es Salaam for Sunday.", cSw: "NDIO ikiwa taarifa ya kila siku ya TMA itaonyesha mm 1 au zaidi Dar es Salaam kwa Jumapili.", cZh: "若 TMA 每日公报记录达累斯萨拉姆周日降雨量达 1 毫米或以上则为是。" },
  { cat: "sports", url: "https://www.tff.or.tz/fixtures", en: "Will Young Africans score 2 or more goals in their match on Saturday?", sw: "Je, Young Africans watafunga magoli 2 au zaidi katika mechi yao ya Jumamosi?", zh: "Young Africans 周六的比赛会打进 2 个或以上的进球吗？", cEn: "YES if Young Africans score 2 or more goals in normal time, per the official result.", cSw: "NDIO ikiwa Young Africans watafunga magoli 2 au zaidi katika muda wa kawaida, kwa matokeo rasmi.", cZh: "若 Young Africans 在常规时间内打进 2 球或以上（以官方结果为准）则为是。" },
  { cat: "macro", url: "https://www.bot.go.tz/ExchangeRate", en: "Will the Bank of Tanzania's USD/TZS mean rate published for Monday be below 2,650?", sw: "Je, kiwango cha wastani cha BoT cha dola kwa shilingi kitakachochapishwa kwa Jumatatu kitakuwa chini ya 2,650?", zh: "坦桑尼亚央行公布的周一美元兑先令中间价会低于 2,650 吗？", cEn: "YES if the BoT's published USD/TZS mean rate for Monday is below 2,650.00.", cSw: "NDIO ikiwa kiwango cha wastani cha USD/TZS kilichochapishwa na BoT kwa Jumatatu kiko chini ya 2,650.00.", cZh: "若坦桑尼亚央行公布的周一美元兑先令中间价低于 2,650.00 则为是。" },
  { cat: "culture", url: "https://www.itv.co.tz/schedule", en: "Will ITV air the Bongo Star Search final at 21:00 on Saturday, as scheduled?", sw: "Je, ITV itarusha fainali ya Bongo Star Search Jumamosi saa 21:00 kama ilivyopangwa?", zh: "ITV 会按计划在周六 21:00 播出《Bongo Star Search》决赛吗？", cEn: "YES if ITV's published schedule shows the final aired from 21:00 EAT on Saturday.", cSw: "NDIO ikiwa ratiba iliyochapishwa na ITV inaonyesha fainali ilirushwa kuanzia saa 21:00 EAT Jumamosi.", cZh: "若 ITV 公布的节目表显示决赛于周六 21:00 EAT 开播则为是。" },
  { cat: "sports", url: "https://www.nbc.co.tz/results", en: "Will Coastal Union and KMC FC draw on Sunday?", sw: "Je, mechi ya Coastal Union na KMC FC Jumapili itaisha kwa sare?", zh: "Coastal Union 与 KMC FC 周日的比赛会以平局收场吗？", cEn: "YES if the match ends level after normal time, per the league's official result.", cSw: "NDIO ikiwa mechi itaisha kwa sare baada ya muda wa kawaida, kwa matokeo rasmi ya ligi.", cZh: "若常规时间结束时双方打平（以联赛官方结果为准）则为是。" },
  { cat: "weather", url: "https://www.meteo.go.tz/bulletin", en: "Will Arusha's high on Saturday be above 25°C (TMA)?", sw: "Je, joto la juu Arusha Jumamosi litazidi nyuzi 25°C (TMA)?", zh: "阿鲁沙周六的最高气温会超过 25°C 吗（以 TMA 为准）？", cEn: "YES if the TMA's bulletin records a maximum above 25°C at Arusha for Saturday.", cSw: "NDIO ikiwa taarifa ya TMA itaonyesha joto la juu zaidi ya 25°C Arusha kwa Jumamosi.", cZh: "若 TMA 公报记录阿鲁沙周六最高气温超过 25°C 则为是。" },
  { cat: "crypto", url: "https://www.coingecko.com/en/coins/ethereum", en: "Will Ethereum trade higher at 23:59 on Sunday than at 19:30 on Friday?", sw: "Je, bei ya Ethereum Jumapili saa 23:59 itakuwa juu kuliko Ijumaa saa 19:30?", zh: "以太坊周日 23:59 的价格会高于周五 19:30 的价格吗？", cEn: "YES if CoinGecko's ETH-USD price at 23:59 EAT on Sunday is above its price at 19:30 EAT on Friday.", cSw: "NDIO ikiwa bei ya ETH-USD ya CoinGecko saa 23:59 EAT Jumapili iko juu ya bei yake saa 19:30 EAT Ijumaa.", cZh: "若周日 23:59 EAT 时 CoinGecko 的 ETH-USD 价格高于周五 19:30 EAT 时则为是。" },
  { cat: "sports", url: "https://www.tff.or.tz/fixtures", en: "Will the Taifa Stars win or draw their friendly at Benjamin Mkapa Stadium on Sunday evening?", sw: "Je, Taifa Stars watapata ushindi au sare katika mechi yao ya kirafiki itakayochezwa Jumapili jioni kwenye Uwanja wa Benjamin Mkapa?", zh: "坦桑尼亚国家队（Taifa Stars）周日晚在本杰明·姆卡帕体育场的友谊赛会获胜或打平吗？", cEn: "YES if the Taifa Stars win or draw after normal time, per the official result.", cSw: "NDIO ikiwa Taifa Stars watashinda au kutoka sare baada ya muda wa kawaida, kwa matokeo rasmi.", cZh: "若坦桑尼亚国家队在常规时间结束时获胜或打平（以官方结果为准）则为是。" },
  // The reserves, A1–A5.
  { cat: "sports", url: "https://www.nbc.co.tz/results", en: "Will Azam FC win their match on Sunday?", sw: "Je, Azam FC itashinda mechi yake ya Jumapili?", zh: "Azam FC 能否赢得周日的比赛？", cEn: "YES if Azam FC win in normal time, per the league's official result.", cSw: "NDIO ikiwa Azam FC itashinda katika muda wa kawaida, kwa matokeo rasmi ya ligi.", cZh: "若 Azam FC 在常规时间内获胜（以联赛官方结果为准）则为是。" },
  { cat: "crypto", url: "https://www.coingecko.com/en/coins/bitcoin", en: "Will Bitcoin trade higher at 23:59 on Sunday than at 19:30 on Friday?", sw: "Je, bei ya Bitcoin Jumapili saa 23:59 itakuwa juu kuliko Ijumaa saa 19:30?", zh: "比特币周日 23:59 的价格会高于周五 19:30 的价格吗？", cEn: "YES if CoinGecko's BTC-USD price at 23:59 EAT on Sunday is above its price at 19:30 EAT on Friday.", cSw: "NDIO ikiwa bei ya BTC-USD ya CoinGecko saa 23:59 EAT Jumapili iko juu ya bei yake saa 19:30 EAT Ijumaa.", cZh: "若周日 23:59 EAT 时 CoinGecko 的 BTC-USD 价格高于周五 19:30 EAT 时则为是。" },
  { cat: "weather", url: "https://www.meteo.go.tz/bulletin", en: "Will at least 1 mm of rain fall in Mwanza on Saturday (TMA gauge)?", sw: "Je, mvua ya angalau mm 1 itanyesha Mwanza Jumamosi (kipimo cha TMA)?", zh: "周六姆万扎的降雨量会达到至少 1 毫米吗（以 TMA 测量为准）？", cEn: "YES if the TMA's daily bulletin records 1 mm or more at Mwanza for Saturday.", cSw: "NDIO ikiwa taarifa ya kila siku ya TMA itaonyesha mm 1 au zaidi Mwanza kwa Jumamosi.", cZh: "若 TMA 每日公报记录姆万扎周六降雨量达 1 毫米或以上则为是。" },
  { cat: "sports", url: "https://www.nbc.co.tz/results", en: "Will Singida Black Stars score 2 or more goals on Saturday?", sw: "Je, Singida Black Stars watafunga magoli 2 au zaidi Jumamosi?", zh: "Singida Black Stars 周六会打进 2 个或以上的进球吗？", cEn: "YES if Singida Black Stars score 2 or more goals in normal time, per the league's official result.", cSw: "NDIO ikiwa Singida Black Stars watafunga magoli 2 au zaidi katika muda wa kawaida, kwa matokeo rasmi ya ligi.", cZh: "若 Singida Black Stars 在常规时间内打进 2 球或以上（以联赛官方结果为准）则为是。" },
  { cat: "macro", url: "https://www.bot.go.tz/ExchangeRate", en: "Will the Bank of Tanzania's USD/TZS mean rate on Monday be higher than on Friday?", sw: "Je, kiwango cha wastani cha BoT cha dola kwa shilingi Jumatatu kitakuwa juu kuliko cha Ijumaa?", zh: "坦桑尼亚央行周一的美元兑先令中间价会高于周五吗？", cEn: "YES if the BoT's published USD/TZS mean rate for Monday is above Friday's.", cSw: "NDIO ikiwa kiwango cha wastani cha USD/TZS kilichochapishwa na BoT kwa Jumatatu kiko juu ya cha Ijumaa.", cZh: "若坦桑尼亚央行公布的周一美元兑先令中间价高于周五则为是。" },
];

function questions(weekStart: number): DraftQuestionInput[] {
  return BANK.map((b, i) => {
    const main = i < 10;
    // Every event on the weekend after the close — Saturday from 09:00, an hour apart (seed-maswali's own spacing).
    const at = weekStart + 5 * DAY + (main ? 9 : 14) * 3_600_000 + i * 3_600_000;
    return {
      role: main ? "MAIN" : "RESERVE", ordinal: main ? i + 1 : i - 9, category: b.cat,
      textEn: b.en, textSw: b.sw, textZh: b.zh, criterionEn: b.cEn, criterionSw: b.cSw, criterionZh: b.cZh,
      sourceUrl: b.url, eventKind: "SPORT", eventLocalStart: utcToZonedLocal(at, "Africa/Dar_es_Salaam"), eventZone: "Africa/Dar_es_Salaam",
      probabilityEstimate: 0.5, probabilitySource: "dev seed",
    };
  });
}

/** A seeded account: a player with `balance` deposited — or, given `role` and `id`, the staff account that seals. */
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

async function opened(ms: number) {
  const c = await createWeek({ weekStartMs: ms, questions: questions(ms), officerId: OWNER, now: new Date(ms - 3 * DAY) });
  if (!c.ok) throw new Error(`draft: ${c.error}`);
  const a = await attestParity({ weekId: c.week.id, officerId: "usr_dev_reader", readVersion: await readDraftVersion(c.week.id) });
  if (!a.ok) throw new Error(`attest: ${a.error}`);
  // At its drafted open, the config's own time (DESIGN_AUTHORITY §M8a item 24), as seed-maswali opens.
  const o = await openWeek({ weekId: c.week.id, officerId: OWNER, guarantee: guaranteeReader, now: new Date(Date.parse(c.week.opensAt)) });
  if (!o.ok) throw new Error(`open: ${o.error}`);
  return o.week;
}

/** Fifteen picks: YES everywhere but the mains named NO (main 1 → slot 1). */
const picks = (...no: number[]): MaswaliPick[] => Array.from({ length: 15 }, (_, i) => (no.includes(i + 1) ? "NO" : "YES"));
const WIN = picks(), LOSE = picks(1), EIGHT = picks(1, 2);

/** Each buyer's slips, in one purchase each (the cap is ten a week). */
async function sell(weekId: string, buys: Array<[string, MaswaliPick[][]]>) {
  for (const [userId, slips] of buys) {
    const r = await purchaseMaswaliTickets({ userId, weekId, slips });
    if (!r.ok) throw new Error(`buy: ${r.error}`);
  }
}
const times = (n: number, slip: MaswaliPick[]) => Array.from({ length: n }, () => slip);

/** Close the week, then seal `slots` (every slot by default) — YES, or VOID on the `abandoned` ground for `voided`. */
async function closeAndSeal(week: { id: string; closesAt: string }, ms: number, voided: number[] = [], slots: number[] = Array.from({ length: 15 }, (_, i) => i + 1)) {
  const c = await closeWeek({ weekId: week.id, now: new Date(Date.parse(week.closesAt)) });
  if (!c.ok) throw new Error(`close: ${c.error}`);
  for (const slot of slots) {
    const v = voided.includes(slot);
    const r = await sealQuestion({
      weekId: week.id, slot, outcome: v ? "VOID" : "YES", voidReason: v ? "abandoned" : null,
      evidence: v ? `Event ${slot} was abandoned with no official result (dev seed)` : `Official result for event ${slot} (dev seed)`,
      officerId: SEALER, now: new Date(ms + 9 * DAY + slot * 600_000),
    });
    if (!r.ok) throw new Error(`seal ${slot}: ${r.error}`);
  }
}

/** Settle at the window's close (the injected clock): the preview's digest, released by the Owner. ⚠️ DECLARED FIXTURE OF
 *  TIME: the settlement stamps the real clock, which in this seed lies weeks BEFORE the week's own (its weeks sit ahead of
 *  today so they can sell), so the stamp is moved to the release's own instant on the week's clock — the register would
 *  otherwise print a week settled before its sales closed. */
async function settle(weekId: string) {
  const at = new Date(Date.parse((await weekStore.get(weekId))!.objectionsCloseAt!) + 60_000);
  const p = await previewMaswaliSettlement(weekId, at);
  if (!p.ok) throw new Error(`preview: ${p.error}`);
  const s = await settleMaswaliWeek({ weekId, releasedBy: OWNER, digest: p.preview.digest, now: at });
  if (!s.ok) throw new Error(`settle: ${s.error}`);
  await weekStore.patch(weekId, { settledAt: at.toISOString() });
}

async function states(): Promise<Record<string, string>> {
  const fixture = await saveMaswaliConfig({ floorTzs: 20_000 }, OWNER);
  if (!fixture.ok) throw new Error(`floor: ${fixture.error}`);
  const p = await Promise.all(Array.from({ length: 14 }, () => player(200_000)));
  await player(0, "MODERATOR", SEALER);
  const m1 = eatWeekStartMs(Date.now()) + 2 * 7 * DAY;
  const at = (n: number) => m1 + (n - 1) * 7 * DAY;
  const ids: Record<string, string> = {};

  // 1 · a floor week with one 10/10: main 3 voided, A1 standing in, A2–A5 not used; the house topped it up to the floor.
  const w1 = await opened(at(1));
  await sell(w1.id, [[p[0], [WIN]], ...p.slice(1, 6).map((u): [string, MaswaliPick[][]] => [u, times(2, LOSE)])]);
  await closeAndSeal(w1, at(1), [3]);
  await settle(w1.id);
  ids.toppedWon = w1.code;

  // 2 · nobody at 10/10: the whole pool carried forward, no fee.
  const w2 = await opened(at(2));
  await sell(w2.id, p.slice(0, 6).map((u): [string, MaswaliPick[][]] => [u, times(3, LOSE)]));
  await closeAndSeal(w2, at(2));
  await settle(w2.id);
  ids.rolled = w2.code;

  // 3 · voided whole: six voided mains against five valid reserves (MR-18); every refund landed; week 2's carry waits on.
  const w3 = await opened(at(3));
  await sell(w3.id, p.slice(0, 6).map((u): [string, MaswaliPick[][]] => [u, times(2, LOSE)]));
  await closeAndSeal(w3, at(3), [1, 2, 3, 4, 5, 6]);
  const v = await voidWeek({ weekId: w3.id, actorId: OWNER, now: new Date(Date.parse((await weekStore.get(w3.id))!.objectionsCloseAt!) + 60_000) });
  if (!v.ok) throw new Error(`void: ${v.error}`);
  ids.voided = w3.code;

  // 4 · above the floor, week 2's carry in across the void: seven 10/10 tickets and a rounding remainder carried on.
  const w4 = await opened(at(4));
  await sell(w4.id, [[p[0], times(4, WIN)], [p[1], times(3, WIN)], ...p.slice(2, 7).map((u): [string, MaswaliPick[][]] => [u, times(5, LOSE)])]);
  await closeAndSeal(w4, at(4));
  await settle(w4.id);
  ids.won = w4.code;

  // 5 · settling: every result in, its window closed (the declared fixture of time), not yet released. The whole window is
  // moved — its opening with its close, a day apart as the rules draw it — so the log never prints a window that closes
  // before it opens.
  const w5 = await opened(at(5));
  await sell(w5.id, p.slice(0, 5).map((u): [string, MaswaliPick[][]] => [u, times(2, LOSE)]));
  await closeAndSeal(w5, at(5));
  const closedAt = Date.now() - 60_000;
  await weekStore.patch(w5.id, { gradedSetFinalAt: new Date(closedAt - DAY).toISOString(), objectionsCloseAt: new Date(closedAt).toISOString() });
  ids.settling = w5.code;

  // 6 · in its objection window: every result in, the window still open.
  const w6 = await opened(at(6));
  await sell(w6.id, p.slice(0, 5).map((u): [string, MaswaliPick[][]] => [u, times(2, LOSE)]));
  await closeAndSeal(w6, at(6));
  ids.objections = w6.code;

  // 7 · results coming in: six of fifteen sealed, main 2 voided and waiting for its reserve.
  const w7 = await opened(at(7));
  await sell(w7.id, p.slice(0, 5).map((u): [string, MaswaliPick[][]] => [u, times(2, LOSE)]));
  await closeAndSeal(w7, at(7), [2], [1, 2, 3, 4, 5, 11]);
  ids.resolving = w7.code;

  // 8 · being voided: six voided mains sealed — the void certain — its window still open.
  const w8 = await opened(at(8));
  await sell(w8.id, p.slice(0, 5).map((u): [string, MaswaliPick[][]] => [u, times(2, LOSE)]));
  await closeAndSeal(w8, at(8), [1, 2, 3, 4, 5, 6]);
  ids.voiding = w8.code;

  // 9 · on sale.
  const w9 = await opened(at(9));
  await sell(w9.id, p.slice(0, 4).map((u): [string, MaswaliPick[][]] => [u, times(2, LOSE)]));
  ids.selling = w9.code;
  return ids;
}

async function sunset(): Promise<Record<string, string>> {
  const p = await Promise.all(Array.from({ length: 6 }, () => player(200_000)));
  await player(0, "MODERATOR", SEALER);
  const m1 = eatWeekStartMs(Date.now()) + 2 * 7 * DAY;
  const ids: Record<string, string> = {};
  // A week before the end: nobody at 10/10, its pool carried into the final week.
  const w1 = await opened(m1);
  await sell(w1.id, p.slice(0, 4).map((u): [string, MaswaliPick[][]] => [u, times(3, LOSE)]));
  await closeAndSeal(w1, m1);
  await settle(w1.id);
  ids.beforeFinal = w1.code;
  // The final week (MR-30, the Owner's own act on the week on sale): no ticket at 10/10 — two at 9, three at 8 — so its
  // highest score shares the jackpot.
  const m2 = m1 + 7 * DAY;
  const w2 = await opened(m2);
  const f = await sunsetMaswali({ weekId: w2.id, ownerId: OWNER, typed: SUNSET_WORD, reason: "Dev seed: the register's sunset week" });
  if (!f.ok) throw new Error(`sunset: ${f.error}`);
  await sell(w2.id, [[p[0], times(2, LOSE)], [p[1], times(3, EIGHT)]]);
  await closeAndSeal(w2, m2);
  await settle(w2.id);
  ids.sunset = w2.code;
  return ids;
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  // S7 (MB-84) · a close that is not early waits for the database's clock; the seeded weeks run on their own week clock,
  // so this request hands the close that clock as the database's — as `seed-maswali` does — and puts it back after.
  __setMaswaliCloseClockForTests((weekClockMs) => weekClockMs);
  // FEE-TAX R1 · the S8 hold lifted for this seed's own opens, and put back in the `finally` (`seed-maswali`'s note).
  const heldBefore = __liftMillioneaOpenHoldForTests(true);
  try {
    const body = (await req.json().catch(() => ({}))) as { scenario?: string; pause?: boolean };
    if (body.pause) {
      const r = await pauseMaswaliSales({ officerId: OWNER, reason: "Dev seed: the register's paused week" });
      return NextResponse.json(r.ok ? { ok: true } : { ok: false, error: r.error }, { status: r.ok ? 200 : 409 });
    }
    if (!rolloutSells(await millioneaStateNow(0), "PUBLIC")) {
      return NextResponse.json({ ok: false, error: "Start next dev with FEATURE_MILLIONEA=ACTIVE: the ticket arm reads the real rollout." }, { status: 409 });
    }
    if ((await weekStore.list({ visibility: "PUBLIC", limit: 1 })).length > 0) {
      return NextResponse.json({ ok: false, error: "Millionea weeks already exist on this store; restart the dev server to seed again." }, { status: 409 });
    }
    if (getLicenceBasis().kind === "NONE") await recordLicenceBasis({ kind: "OWNER_RULING", ref: "Dev seed — the Owner's ruling of 2026-10-16" }, OWNER);
    if (((await maswaliAccountBalance(acct.maswaliGuarantee)) ?? 0) < 10_000_000) {
      await fundMaswaliGuarantee({ amount: 12_000_000, reference: "DEV-SEED-REG1", typed: GUARANTEE_FUND_WORD, ownerId: OWNER });
    }
    const weeks = body.scenario === "sunset" ? await sunset() : await states();
    return NextResponse.json({ ok: true, scenario: body.scenario === "sunset" ? "sunset" : "states", weeks });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String((err as Error).message ?? err) }, { status: 500 });
  } finally {
    __setMaswaliCloseClockForTests(null);
    __liftMillioneaOpenHoldForTests(heldBefore);
  }
}
