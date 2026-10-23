/**
 * qa:maswali-admin-drive — the Millionea console's S4 acceptance drive (MASWALI-BUILD S4; MASWALI-PLAN §7b S4
 * "Acceptance"): every act through the console's own controls, in a real browser, and every outcome read off the page.
 *
 *   BASE=http://localhost:3410 node scripts/maswali-admin-drive.mjs     (a FRESH in-memory `next dev`, 2FA off)
 *
 * ONCE PER SERVER: right after `qa:maswali-admin-shots` (whose seed call built the weeks), or on its own (step 6 seeds).
 *   1 · the Owner signs in (`/api/dev-test/seed-admin`, as the shots do) and reads the product's standing;
 *   3 · checks the trusted sources the draft cites, then drafts a DRIVE week in the builder — fifteen cards, each
 *       criterion from its kind's template with every {…} filled; seeds a local calendar fixture through the events
 *       console, checks that its suggestion fills M1, then edits M1 into the officer's reviewed question.
 *       A drive week, because the seeded public week is selling and one public week sells at a time (MR-3);
 *   4 · the drafter's own attestation is refused (MB-79); a second reader — a MODERATOR, in a browser context of their
 *       own (a second context for the SAME account would sign the first out) — attests; the Owner opens the week;
 *   2 · (inside 4) when the open refuses for want of a licence basis (every such refusal names "licence basis" — with
 *       nothing recorded the Owner's ruling of 2026-10-23 is the basis, so a fresh store needs none) or of guarantee, the
 *       Owner records the basis (typed RECORD) or pays in exactly what the refusal says is short (typed FUND GUARANTEE),
 *       then opens again;
 *   5 · a close after the first event is refused in the service's words; an earlier close is accepted (MB-28);
 *   6 · on the seeded weeks (`/api/dev-test/seed-maswali`; a 409 means the shots already seeded this store): enables the
 *       two-officer rule only after seeding, seals M1, has a different MODERATOR confirm its exact review, returns the
 *       local rule to single-admin, then seals the other fourteen; reads the ready week's prepared settlement and releases it (typed
 *       RELEASE); pauses and resumes sales (PAUSE / RESUME); voids the week that voids whole (VOID); holds, releases,
 *       holds again and forfeits a winning share (HOLD, RELEASE, FORFEIT SHARE); and, last, makes a week the final week
 *       (typed SUNSET MILLIONEA).
 * ⭐ S5-FIX-SRV · ONE TRUTH FOR EVERY ACT: the open (4.6), a move of the close (5.3), the week void (6.4c) and the stop
 *    (6.6) each run once with their audit row LOST (`/api/dev-test/maswali-audit-fault` arms one), and the page must say
 *    so in the console's own words, readable whole at 360 and at 1280, a tile at each.
 * After each act: what the page SAYS (the outcome sentence and the state chip), no console error since the act before,
 * and a viewport tile (never full-page) in `.50pick-shots/maswali/drive/`.
 * ⛔ The only routes it calls itself are those three dev-only ones; everything else is a click, a key or a typed word.
 * ⚠️ THE WEEK VOID NEEDS THE TICK OFF (`MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false` on the dev server): the Millionea
 *    tick voids a certain week as soon as its window has closed (`maswali-scheduler.ts`), so with it on, the seeded
 *    week is voided by the system first and 6.4 SKIPs, saying so.
 * ⛔ Localhost and the in-memory store only (`next dev` on 127.0.0.1 never hydrates on this machine).
 * ⚠️ No backslash escape for a slash, a word boundary or a control character anywhere in this file: the edit tools
 *    decode them (`test:source-bytes`). A slash in a pattern is written `[/]`.
 */
import { chromium } from "playwright";
import { checkOpenChecklist } from "./maswali-admin-checklist.mjs";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3410";
if (!/^http:[/][/]localhost(:\d+)?$/.test(BASE)) { console.error("refusing: BASE must be a localhost dev server"); process.exit(2); }
{
  // It moves (dev) money and stamps weeks: never against a server that reports a database.
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null);
  if (!health || health.database?.configured !== false) {
    console.error(`refusing: ${BASE} does not report the in-memory store (database.configured=${JSON.stringify(health?.database?.configured)})`);
    process.exit(2);
  }
}
const OUT = ".50pick-shots/maswali/drive";
mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0, skip = 0;
const ok = (n, c, e = "") => { if (c) pass++; else fail++; console.log(`${c ? "PASS" : "FAIL"} ${n}${e ? ` — ${e}` : ""}`); return !!c; };
const skipped = (n, why) => { skip++; console.log(`SKIP ${n} — ${why}`); };
const clip = (s, n = 4000) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const num = (s) => Number(String(s).replace(/,/g, ""));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Ask until it answers (truthy) or the time is up. Never throws: a read between two renders just asks again. */
async function until(fn, ms = 60_000, every = 250) {
  const end = Date.now() + ms;
  for (;;) {
    try { const v = await fn(); if (v) return v; } catch { /* the page is between renders */ }
    if (Date.now() > end) return null;
    await sleep(every);
  }
}

// ── The week's calendar, in EAT, exactly as the console prints it (`fmtEat`, maswali-admin-format.ts) ─────────────
const DAY = 86_400_000;
const EAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Dar_es_Salaam", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
const fmtEat = (ms) => EAT.format(new Date(ms));
const eatMs = (iso, hhmm) => Date.parse(`${iso}T${hhmm}:00+03:00`);
const plusDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const words = (iso) => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/** S6-ADMIN · G6 · the words the builder shows for each card's category and kind (the console's tables), in their order. */
const CATEGORY_WORD = { sports: "Sports", macro: "Macro", weather: "Weather", crypto: "Crypto", culture: "Culture", tech: "Tech", other: "Other" };
const KIND_WORD = { sport: "Match result", price: "Price or rate", weather: "Weather reading", announcement: "Announcement" };
/**
 * The fifteen cards. Every source is a trusted default for its category (`seedDefaultSources`), the reserves come from
 * five distinct sources (OD-14 asks three), every chance sits inside the 30–70% band, no two cards share an event, and
 * every start falls after the Friday close and its buffer — Saturday for the mains, Sunday for the reserves, all in EAT
 * (no clock change to step on). `fills` names the facts each kind's template asks for; `{date}` is added from the day.
 */
const ROWS = [
  { label: "M1", category: "sports", kind: "sport", day: "sat", time: "10:00", pct: "50", url: "https://www.nbc.co.tz/results",
    en: "Will Simba SC beat Azam FC on Saturday?", sw: "Je, Simba SC watawafunga Azam FC Jumamosi?", zh: "辛巴队周六会击败阿扎姆队吗？",
    fills: { home: "Simba SC", away: "Azam FC" },
    critSw: "NDIO ikiwa Simba SC watawafunga Azam FC ndani ya dakika 90 na nyongeza, kama matokeo rasmi ya chanzo yanavyoonyesha; HAPANA kwa sare au ushindi wa Azam FC.",
    critZh: "如果来源公布的最终比分显示辛巴队在常规时间（90分钟加补时）击败阿扎姆队，则为是；平局或阿扎姆队获胜则为否。",
    psrc: "Bookmaker consensus, Friday prices" },
  { label: "M2", category: "sports", kind: "sport", day: "sat", time: "11:00", pct: "45", url: "https://www.tff.or.tz/fixtures",
    en: "Will Taifa Stars beat Harambee Stars on Saturday?", sw: "Je, Taifa Stars watawafunga Harambee Stars Jumamosi?", zh: "坦桑尼亚国家队周六会击败肯尼亚国家队吗？",
    fills: { home: "Taifa Stars", away: "Harambee Stars" },
    critSw: "NDIO ikiwa Taifa Stars watawafunga Harambee Stars ndani ya dakika 90 na nyongeza, kama matokeo rasmi ya chanzo yanavyoonyesha; HAPANA kwa sare au ushindi wa Harambee Stars.",
    critZh: "如果来源公布的最终比分显示坦桑尼亚国家队在常规时间击败肯尼亚国家队，则为是；平局或肯尼亚国家队获胜则为否。",
    psrc: "Bookmaker consensus, Friday prices" },
  { label: "M3", category: "macro", kind: "price", day: "sat", time: "12:00", pct: "55", url: "https://www.bot.go.tz/rates", tolerance: "Two decimals, as published",
    en: "Will the US dollar close above TZS 2,700 at the Bank of Tanzania on Saturday?", sw: "Je, dola ya Marekani itafunga juu ya TZS 2,700 Benki Kuu ya Tanzania Jumamosi?", zh: "周六坦桑尼亚央行公布的美元汇率会收于2,700先令以上吗？",
    fills: { asset: "the US dollar mid rate", level: "TZS 2,700", tolerance: "to two decimals, as published" },
    critSw: "NDIO ikiwa kiwango cha kati cha dola ya Marekani kitafunga juu ya TZS 2,700 siku hiyo, kama chanzo kinavyochapisha; HAPANA vinginevyo.",
    critZh: "如果来源公布的当日美元中间价收于2,700先令以上，则为是；否则为否。",
    psrc: "The rate's last twenty closes" },
  { label: "M4", category: "weather", kind: "weather", day: "sat", time: "13:00", pct: "40", url: "https://www.meteo.go.tz/bulletin",
    en: "Will Dar es Salaam record at least 5 mm of rain on Saturday?", sw: "Je, Dar es Salaam itapata angalau mm 5 za mvua Jumamosi?", zh: "达累斯萨拉姆周六的降雨量会达到至少5毫米吗？",
    fills: { amount: "5", station: "Julius Nyerere International Airport" },
    critSw: "NDIO ikiwa chanzo kitaripoti angalau mm 5 za mvua katika Uwanja wa Ndege wa Kimataifa wa Julius Nyerere siku hiyo; HAPANA vinginevyo.",
    critZh: "如果来源报告当日朱利叶斯尼雷尔国际机场的降雨量至少为5毫米，则为是；否则为否。",
    psrc: "TMA's seasonal outlook" },
  { label: "M5", category: "crypto", kind: "price", day: "sat", time: "14:00", pct: "60", url: "https://www.coingecko.com/en/coins/bitcoin", tolerance: "The daily close, in whole dollars",
    en: "Will Bitcoin close above USD 60,000 on Saturday?", sw: "Je, Bitcoin itafunga juu ya dola 60,000 Jumamosi?", zh: "比特币周六的收盘价会高于60,000美元吗？",
    fills: { asset: "Bitcoin in US dollars", level: "USD 60,000", tolerance: "the daily close, in whole dollars" },
    critSw: "NDIO ikiwa bei ya kufunga ya Bitcoin siku hiyo itakuwa juu ya dola 60,000, kama chanzo kinavyochapisha; HAPANA vinginevyo.",
    critZh: "如果来源公布的比特币当日收盘价高于60,000美元，则为是；否则为否。",
    psrc: "The price's last thirty closes" },
  { label: "M6", category: "culture", kind: "announcement", day: "sat", time: "15:00", pct: "35", url: "https://www.itv.co.tz/bss",
    en: "Will ITV announce the Bongo Star Search finalists on Saturday?", sw: "Je, ITV itatangaza washiriki wa fainali wa Bongo Star Search Jumamosi?", zh: "ITV周六会公布《邦戈之星》的决赛选手吗？",
    fills: { body: "ITV Tanzania", what: "the Bongo Star Search finalists", time: "20:00" },
    critSw: "NDIO ikiwa ITV Tanzania itatangaza washiriki wa fainali wa Bongo Star Search kwenye chaneli yake rasmi kufikia saa 20:00 EAT siku hiyo; HAPANA vinginevyo.",
    critZh: "如果ITV坦桑尼亚在当日东非时间20:00前通过官方渠道公布《邦戈之星》决赛选手，则为是；否则为否。",
    psrc: "The show's past seasons" },
  { label: "M7", category: "tech", kind: "announcement", day: "sat", time: "16:00", pct: "65", url: "https://www.tcra.go.tz/statistics",
    en: "Will TCRA publish its quarterly telecom statistics on Saturday?", sw: "Je, TCRA itachapisha takwimu zake za mawasiliano za robo mwaka Jumamosi?", zh: "坦桑尼亚通信管理局周六会发布季度电信统计吗？",
    fills: { body: "TCRA", what: "its quarterly telecom statistics", time: "21:00" },
    critSw: "NDIO ikiwa TCRA itachapisha takwimu zake za mawasiliano za robo mwaka kwenye chaneli yake rasmi kufikia saa 21:00 EAT siku hiyo; HAPANA vinginevyo.",
    critZh: "如果坦桑尼亚通信管理局在当日东非时间21:00前通过官方渠道发布季度电信统计，则为是；否则为否。",
    psrc: "TCRA's publication calendar" },
  { label: "M8", category: "sports", kind: "sport", day: "sat", time: "17:00", pct: "50", url: "https://www.nbc.co.tz/results",
    en: "Will Young Africans beat Coastal Union on Saturday?", sw: "Je, Young Africans watawafunga Coastal Union Jumamosi?", zh: "青年非洲队周六会击败海岸联队吗？",
    fills: { home: "Young Africans", away: "Coastal Union" },
    critSw: "NDIO ikiwa Young Africans watawafunga Coastal Union ndani ya dakika 90 na nyongeza, kama matokeo rasmi ya chanzo yanavyoonyesha; HAPANA kwa sare au ushindi wa Coastal Union.",
    critZh: "如果来源公布的最终比分显示青年非洲队在常规时间击败海岸联队，则为是；平局或海岸联队获胜则为否。",
    psrc: "Bookmaker consensus, Friday prices" },
  { label: "M9", category: "macro", kind: "announcement", day: "sat", time: "18:00", pct: "45", url: "https://www.tra.go.tz/notices",
    en: "Will the TRA announce new fuel levy rates on Saturday?", sw: "Je, TRA itatangaza viwango vipya vya tozo ya mafuta Jumamosi?", zh: "坦桑尼亚税务局周六会公布新的燃油税率吗？",
    fills: { body: "the TRA", what: "new fuel levy rates", time: "22:00" },
    critSw: "NDIO ikiwa TRA itatangaza viwango vipya vya tozo ya mafuta kwenye chaneli yake rasmi kufikia saa 22:00 EAT siku hiyo; HAPANA vinginevyo.",
    critZh: "如果坦桑尼亚税务局在当日东非时间22:00前通过官方渠道公布新的燃油税率，则为是；否则为否。",
    psrc: "The TRA's notice history" },
  { label: "M10", category: "weather", kind: "weather", day: "sat", time: "19:00", pct: "55", url: "https://www.meteo.go.tz/bulletin",
    en: "Will Arusha record at least 2 mm of rain on Saturday?", sw: "Je, Arusha itapata angalau mm 2 za mvua Jumamosi?", zh: "阿鲁沙周六的降雨量会达到至少2毫米吗？",
    fills: { amount: "2", station: "Arusha Airport" },
    critSw: "NDIO ikiwa chanzo kitaripoti angalau mm 2 za mvua katika Uwanja wa Ndege wa Arusha siku hiyo; HAPANA vinginevyo.",
    critZh: "如果来源报告当日阿鲁沙机场的降雨量至少为2毫米，则为是；否则为否。",
    psrc: "TMA's seasonal outlook" },
  { label: "A1", category: "sports", kind: "sport", day: "sun", time: "10:00", pct: "50", url: "https://www.nbc.co.tz/results",
    en: "Will Singida Black Stars beat KMC FC on Sunday?", sw: "Je, Singida Black Stars watawafunga KMC FC Jumapili?", zh: "辛吉达黑星队周日会击败KMC队吗？",
    fills: { home: "Singida Black Stars", away: "KMC FC" },
    critSw: "NDIO ikiwa Singida Black Stars watawafunga KMC FC ndani ya dakika 90 na nyongeza, kama matokeo rasmi ya chanzo yanavyoonyesha; HAPANA kwa sare au ushindi wa KMC FC.",
    critZh: "如果来源公布的最终比分显示辛吉达黑星队在常规时间击败KMC队，则为是；平局或KMC队获胜则为否。",
    psrc: "Bookmaker consensus, Friday prices" },
  { label: "A2", category: "macro", kind: "price", day: "sun", time: "11:00", pct: "40", url: "https://www.bot.go.tz/rates", tolerance: "Two decimals, as published",
    en: "Will the euro close above TZS 3,000 at the Bank of Tanzania on Sunday?", sw: "Je, yuro itafunga juu ya TZS 3,000 Benki Kuu ya Tanzania Jumapili?", zh: "周日坦桑尼亚央行公布的欧元汇率会收于3,000先令以上吗？",
    fills: { asset: "the euro mid rate", level: "TZS 3,000", tolerance: "to two decimals, as published" },
    critSw: "NDIO ikiwa kiwango cha kati cha yuro kitafunga juu ya TZS 3,000 siku hiyo, kama chanzo kinavyochapisha; HAPANA vinginevyo.",
    critZh: "如果来源公布的当日欧元中间价收于3,000先令以上，则为是；否则为否。",
    psrc: "The rate's last twenty closes" },
  { label: "A3", category: "weather", kind: "weather", day: "sun", time: "12:00", pct: "60", url: "https://www.meteo.go.tz/bulletin",
    en: "Will Mwanza record at least 3 mm of rain on Sunday?", sw: "Je, Mwanza itapata angalau mm 3 za mvua Jumapili?", zh: "姆万扎周日的降雨量会达到至少3毫米吗？",
    fills: { amount: "3", station: "Mwanza Airport" },
    critSw: "NDIO ikiwa chanzo kitaripoti angalau mm 3 za mvua katika Uwanja wa Ndege wa Mwanza siku hiyo; HAPANA vinginevyo.",
    critZh: "如果来源报告当日姆万扎机场的降雨量至少为3毫米，则为是；否则为否。",
    psrc: "TMA's seasonal outlook" },
  { label: "A4", category: "crypto", kind: "price", day: "sun", time: "13:00", pct: "45", url: "https://www.coingecko.com/en/coins/ethereum", tolerance: "The daily close, in whole dollars",
    en: "Will Ethereum close above USD 2,500 on Sunday?", sw: "Je, Ethereum itafunga juu ya dola 2,500 Jumapili?", zh: "以太坊周日的收盘价会高于2,500美元吗？",
    fills: { asset: "Ethereum in US dollars", level: "USD 2,500", tolerance: "the daily close, in whole dollars" },
    critSw: "NDIO ikiwa bei ya kufunga ya Ethereum siku hiyo itakuwa juu ya dola 2,500, kama chanzo kinavyochapisha; HAPANA vinginevyo.",
    critZh: "如果来源公布的以太坊当日收盘价高于2,500美元，则为是；否则为否。",
    psrc: "The price's last thirty closes" },
  { label: "A5", category: "tech", kind: "announcement", day: "sun", time: "14:00", pct: "55", url: "https://www.tcra.go.tz/statistics",
    en: "Will TCRA announce a new spectrum auction on Sunday?", sw: "Je, TCRA itatangaza mnada mpya wa masafa Jumapili?", zh: "坦桑尼亚通信管理局周日会宣布新的频谱拍卖吗？",
    fills: { body: "TCRA", what: "a new spectrum auction", time: "20:00" },
    critSw: "NDIO ikiwa TCRA itatangaza mnada mpya wa masafa kwenye chaneli yake rasmi kufikia saa 20:00 EAT siku hiyo; HAPANA vinginevyo.",
    critZh: "如果坦桑尼亚通信管理局在当日东非时间20:00前通过官方渠道宣布新的频谱拍卖，则为是；否则为否。",
    psrc: "TCRA's publication calendar" },
];

const LICENCE_REF = "The Owner's dated ruling, kept in the compliance binder (drive)";
const PAUSE_WHY = "Drive: a fixture moved; sales stop while it is checked.";
const RESUME_WHY = "Drive: the fixture is confirmed; sales start again.";
const HOLD_WHY = "Drive: the deposit that funded this ticket is under review.";
const RELEASE_WHY = "Drive: the review cleared the deposit; the player keeps the share.";
const FORFEIT_WHY = "Drive: the deposit was reversed; the share goes back to the jackpot.";
const STOP_WHY = "Drive: the Owner stops Millionea after this week.";
/** S5-FIX-SRV · what the console says when an act LANDED but its audit row was lost (the actions' own sentences). */
const UNRECORDED = {
  open: "The open landed, but its audit record could not be fully written. Tell an administrator; do not repeat the open.",
  move: "The move landed, but its audit record could not be fully written. Tell an administrator; do not repeat the move.",
  void: "The week void landed, but its audit record could not be fully written. Tell an administrator; do not repeat the void.",
  stop: "The stop landed, but its audit record could not be fully written. Tell an administrator; do not repeat the stop.",
};

// ── The browser: one context per account ───────────────────────────────────────────────────────────────────────────
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errs = [];
function watch(p, who) {
  p.setDefaultNavigationTimeout(180_000);
  p.setDefaultTimeout(30_000);
  p.on("console", (m) => { if (m.type() === "error") errs.push(`${who}: ${m.text().slice(0, 300)}`); });
  p.on("pageerror", (e) => errs.push(`${who}: ${String(e).slice(0, 300)}`));
}
watch(page, "owner");

/** Drawn AND hydrated — a fiber on <main> — before the first click (qa:journey-preview's `settle`). */
async function settle(p) {
  await p.waitForLoadState("domcontentloaded");
  await p.locator("main").first().waitFor({ timeout: 120_000 });
  await p.waitForFunction(() => {
    const m = document.querySelector("main");
    return !!m && Object.keys(m).some((k) => k.startsWith("__reactFiber$"));
  }, null, { timeout: 120_000 });
  // The dev server's own badge sits over the page's corner: out of the tiles and out of the way of a click.
  await p.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
  await p.waitForTimeout(900);
}
async function go(p, path) { await p.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" }); await settle(p); }
// ⛔ caret "initial": Playwright's caret hiding writes an inline style onto every input, which React then reports as a
// hydration mismatch that is the harness's, never the app's (qa:tax-report's note).
const shot = (p, name) => p.screenshot({ path: `${OUT}/${name}.png`, fullPage: false, caret: "initial" });
/** The end of one act: its tile, and no console error since the act before. */
async function checkpoint(p, label, name) {
  await p.waitForTimeout(400); // a console error raised by the act's last render lands first
  await shot(p, name);
  ok(`${label} · no console error`, errs.length === 0, errs.slice(0, 3).join(" | "));
  errs.length = 0;
}

// ── Locators: roles, labels and words; the cards by their own title hook, never by a class ──────────────────────────
/** An AdminCard by its title (`data-section-heading`). The titles used here carry no pattern characters. */
const card = (p, title) => p.locator("[data-card-pad]").filter({ has: p.locator("[data-section-heading]").filter({ hasText: new RegExp(`^${title}$`) }) });
/** A ScrollX table region by its label. */
const region = (p, name) => p.getByRole("region", { name, exact: true });
/** The week page's state chip: the last block of its head (`AdminPageHead` actions). */
const chipOf = async (p) => clip(await p.locator("main header").filter({ has: p.locator("h1") }).first().locator(":scope > div").last().textContent().catch(() => ""));
/** A week's state chip in the weeks list on /admin/maswali. */
async function listChip(p, code) {
  const row = region(p, "Millionea weeks").getByRole("row").filter({ has: p.getByRole("link", { name: code, exact: true }) });
  return clip(await row.getByRole("cell").nth(2).textContent().catch(() => ""));
}
const alertText = async (loc) => clip((await loc.allTextContents()).join(" "));

/** Pick an option of the kit Select (an APG combobox whose listbox is portalled to <body>), then read the choice back. */
async function choose(p, combo, label) {
  if (clip(await combo.textContent()) === label) return;
  await combo.click();
  await p.getByRole("option", { name: label, exact: true }).click();
  await until(async () => clip(await combo.textContent()) === label, 10_000);
}
/**
 * Type into a kit DateSelect / TimeSelect segment as a person does. ⛔ Never `fill`: the segment moves its caret to the
 * end on focus and holds two digits, so a filled value is refused without a word (the tax drive's `typeSeg`).
 */
async function typeSeg(seg, value) { await seg.click(); await seg.press("Control+a"); await seg.pressSequentially(value); }
async function typeDate(scope, iso) {
  const [y, m, d] = iso.split("-");
  await typeSeg(scope.getByRole("textbox", { name: "Day", exact: true }), d);
  await typeSeg(scope.getByRole("textbox", { name: "Month", exact: true }), m);
  await typeSeg(scope.getByRole("textbox", { name: "Year", exact: true }), y);
}
async function typeTime(group, hhmm) {
  const [h, m] = hhmm.split(":");
  await typeSeg(group.getByRole("textbox").nth(0), h);
  await typeSeg(group.getByRole("textbox").nth(1), m);
}

/**
 * Drive one kit ConfirmModal to its end. `fields` fills the dialog's own body; a hard tier then types its word — its
 * confirm must be dead until then (`gated`) — and the confirm is pressed. The controls close their dialog only when the
 * act went through (`closed`); a refusal leaves it open and prints the service's sentence in `alert`.
 * `alert` can be a locator for a page alert or a function that scopes an alert to the open dialog.
 */
async function confirmDialog(p, title, { word, confirm, alert, fields }) {
  const dlg = p.getByRole("alertdialog", { name: title, exact: true });
  await dlg.waitFor({ timeout: 30_000 });
  if (fields) await fields(dlg);
  const press = dlg.getByRole("button", { name: confirm, exact: true });
  let gated = true;
  if (word) {
    gated = await press.isDisabled();
    await dlg.getByPlaceholder(word, { exact: true }).fill(word);
  }
  await press.click();
  const end = await until(async () => {
    if ((await dlg.count()) === 0) return { closed: true };
    const busy = (await dlg.getAttribute("aria-busy", { timeout: 1_000 }).catch(() => null)) === "true";
    const said = alert ? await alertText(typeof alert === "function" ? alert(dlg) : alert) : "";
    return said && !busy ? { closed: false, refusal: said } : null;
  }, 120_000);
  const cancel = async () => {
    // The scrim is a "Cancel" button too; the dialog's own Cancel comes last.
    if ((await dlg.count()) > 0) await dlg.getByRole("button", { name: "Cancel", exact: true }).last().click();
    await dlg.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  };
  return { gated, closed: !!end?.closed, refusal: end?.refusal ?? (end ? "" : "the dialog neither closed nor said why"), cancel };
}

/** S5-FIX-SRV · arm ONE lost audit write: the next row with `action` an act owes is reported unrecorded and not written. */
async function loseNextAuditRow(action) {
  const res = await ctx.request.post(`${BASE}/api/dev-test/maswali-audit-fault`, { data: { action } });
  return res.ok();
}
/**
 * The act's warning, read off the page in the console's own words, then measured where an officer reads it: whole inside
 * the viewport and no sideways scroll, at 360 and at 1280, with a tile at each width.
 */
async function auditWarningReads(tag, scope, words, tile) {
  const warning = scope.getByRole("alert").filter({ hasText: words });
  const shown = await until(async () => (await warning.count()) > 0, 30_000);
  ok(`${tag} the page says the act landed without its audit record, in the console's words`, !!shown, await alertText(scope.getByRole("alert")));
  if (!shown) return;
  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await warning.first().scrollIntoViewIfNeeded();
    const fit = await warning.first().evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, width: r.width, root: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    ok(`${tag} …and it reads whole at ${width}px: inside the viewport, with no sideways scroll`,
      fit.left >= 0 && fit.right <= width + 1 && fit.width > 0 && fit.root <= 1, JSON.stringify(fit));
    await shot(page, `${tile}-${width}`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

/** Run one part; a throw is that part's failure, and the drive goes on to the next part. */
async function part(name, fn) {
  try { await fn(); } catch (e) { ok(`${name} · ran to its end`, false, clip(e?.message ?? e, 300)); errs.length = 0; }
}

// ── State the parts hand on ──────────────────────────────────────────────────────────────────────────────────────────
let standing = { licence: "?", guarantee: "?", requirement: "?" };
let weekPath = null, driveCode = null, opened = false;
let SAT = null, SUN = null, THU = null;

// ── 1 · the Owner ────────────────────────────────────────────────────────────────────────────────────────────────────
await part("1 · sign in", async () => {
  const admin = await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000000" } });
  ok("1.1 signed in as the Owner", admin.ok(), String(admin.status()));
  await go(page, "/admin/maswali");
  ok("1.2 the Owner reaches the Millionea console", (await page.getByRole("heading", { level: 1, name: "Millionea", exact: true }).count()) > 0);
  const head = clip(await page.locator("main").textContent());
  standing = {
    licence: /Licence basis[\s\S]{0,80}?(None|Board letter|Owner ruling|Unreadable)/.exec(head)?.[1] ?? "?",
    guarantee: /Guarantee[\s\S]{0,40}?(TZS [\d,]+|Unreadable)/.exec(head)?.[1] ?? "?",
  };
  ok(`1.3 the standing reads: licence basis ${standing.licence}, guarantee ${standing.guarantee}`, standing.licence !== "?" && standing.guarantee !== "?");
  await checkpoint(page, "1", "01-weeks");
  await go(page, "/admin/maswali/pools");
  standing.requirement = /Needed now:\s*(TZS [\d,]+)/.exec(await page.locator("main").textContent())?.[1] ?? "?";
  ok(`1.4 the pools page states the guarantee needed now: ${standing.requirement}`, standing.requirement !== "?");
});

// ── 3 · the draft ────────────────────────────────────────────────────────────────────────────────────────────────────
await part("3 · draft", async () => {
  // The registry the open's checklist asks (`isSourceTrusted`); its page seeds the defaults on first use.
  await go(page, "/admin/sources");
  const listed = await page.locator("main").textContent();
  const domains = [...new Set(ROWS.map((r) => new URL(r.url).hostname.replace(/^www[.]/, "")))];
  const missing = domains.filter((d) => !listed.includes(d));
  ok(`3.0 every source the draft cites is on the trusted list (${domains.length} domains)`, missing.length === 0, missing.join(", "));
  await checkpoint(page, "3.0", "02-sources");

  await go(page, "/admin/maswali/new");
  ok("3.1 the builder opens", (await page.getByRole("heading", { level: 1, name: "Draft a week", exact: true }).count()) > 0);
  const startField = page.locator("label").filter({ hasText: "The Monday the week starts" });
  const seg = (name) => startField.getByRole("textbox", { name, exact: true }).inputValue();
  const monday = `${await seg("Year")}-${await seg("Month")}-${await seg("Day")}`;
  ok(`3.1b it offers the next Monday (${monday})`, /^\d{4}-\d{2}-\d{2}$/.test(monday) && new Date(`${monday}T00:00:00Z`).getUTCDay() === 1, monday);
  SAT = plusDays(monday, 5); SUN = plusDays(monday, 6); THU = plusDays(monday, 3);
  for (const r of ROWS) {
    r.date = r.day === "sat" ? SAT : SUN;
    r.fills.date = words(r.date);
    r.expectEat = fmtEat(eatMs(r.date, r.time));
  }

  // The fresh memory store has no operator-authored calendar rows. Add one through the real admin form, only on this
  // localhost store, inside the builder's upcoming event window. The suggestion is a starting point, not a publishable
  // question: after checking it fills M1, the officer edits that question before saving the draft.
  const fixtureTitle = `Drive test fixture: a Saturday result for ${SAT}`;
  await go(page, "/admin/events");
  const eventForm = page.locator("form").filter({ has: page.getByText("Add a real event", { exact: true }) });
  await eventForm.getByRole("textbox", { name: "What happens", exact: true }).fill(fixtureTitle);
  await eventForm.locator('input[name="startsAt"]').fill(`${SAT}T10:00`);
  await eventForm.getByRole("textbox", { name: "Official source URL", exact: true }).fill("https://www.nbc.co.tz/results");
  await eventForm.getByRole("button", { name: "Add event", exact: true }).click();
  const seededFixture = await until(async () => (await page.getByText(fixtureTitle, { exact: true }).count()) > 0, 30_000);
  ok("3.1c the Owner adds one named local calendar fixture through the events console", !!seededFixture, fixtureTitle);
  await go(page, "/admin/maswali/new");

  const line = page.getByRole("combobox", { name: "Line", exact: true });
  await choose(page, line, "Drive (private)");
  ok("3.2 the line is the private drive (a public week is selling, and one sells at a time, MR-3)", clip(await line.textContent()) === "Drive (private)", clip(await line.textContent()));

  // §7b S4 item 7 · the event suggestion fills a card; the officer then edits it into a reviewed question.
  const calendar = page.locator("details").filter({ hasText: "Start from the calendar" });
  if (ok("3.3 a local calendar suggestion appears in the builder", (await calendar.count()) === 1)) {
    await calendar.locator("summary").click();
    const fillSel = calendar.getByRole("combobox", { name: `Fill a slot with ${fixtureTitle}`, exact: true });
    const named = await fillSel.evaluate((el) => document.getElementById(el.getAttribute("aria-labelledby") ?? "")?.textContent ?? "");
    const sgText = clip(named.replace(/^Fill a slot with /, ""));
    await fillSel.click();
    await page.getByRole("option", { name: "M1", exact: true }).click();
    const m1 = page.locator('section[aria-label="Question M1"]').getByRole("textbox", { name: "Question · English", exact: true });
    const took = await until(async () => clip(await m1.inputValue()) === sgText, 10_000);
    ok(`3.3b the calendar suggestion fills M1 with its words ("${clip(sgText, 60)}")`, !!took && sgText === fixtureTitle, clip(await m1.inputValue(), 120));
    await m1.fill(ROWS[0].en);
    ok("3.3c the officer edits M1 to the reviewed question before saving", (await m1.inputValue()) === ROWS[0].en);
  }

  // S6-ADMIN · G6 · the builder offers its categories and kinds as words, never codes: read every option of M1's two lists.
  {
    const m1 = page.locator('section[aria-label="Question M1"]');
    const optionsOf = async (name) => {
      await m1.getByRole("combobox", { name, exact: true }).click();
      const all = (await page.getByRole("option").allTextContents()).map((l) => clip(l));
      await page.keyboard.press("Escape");
      return all;
    };
    const cats = await optionsOf("M1 category"), kinds = await optionsOf("M1 kind");
    ok("3.3g ⭐ G6 · the builder's categories and kinds are words, never codes",
      cats.join("|") === Object.values(CATEGORY_WORD).join("|") && kinds.join("|") === Object.values(KIND_WORD).join("|"),
      `categories: ${cats.join(", ")} · kinds: ${kinds.join(", ")}`);
  }
  const cards = [];
  for (const r of ROWS) {
    const sec = page.locator(`section[aria-label="Question ${r.label}"]`);
    const field = (name) => sec.getByRole("textbox", { name, exact: true });
    await sec.scrollIntoViewIfNeeded();
    await choose(page, sec.getByRole("combobox", { name: `${r.label} category`, exact: true }), CATEGORY_WORD[r.category]);
    await choose(page, sec.getByRole("combobox", { name: `${r.label} kind`, exact: true }), KIND_WORD[r.kind]);
    await field("Question · English").fill(r.en);
    await field("Question · Kiswahili").fill(r.sw);
    await field("Question · 中文").fill(r.zh);
    // MB-21 · the kind's own template, read back from the box, then every {…} filled from the card's facts.
    await sec.getByRole("button", { name: `Use the ${KIND_WORD[r.kind].toLowerCase()} template`, exact: true }).click();
    const crit = field("How it resolves · English");
    const warn = sec.getByText(/^Fill every .+ before saving[.]$/);
    const template = (await until(async () => { const v = await crit.inputValue(); return /[{}]/.test(v) ? v : null; }, 10_000)) ?? "";
    const flagged = (await warn.count()) > 0;
    const filled = template.replace(/[{](\w+)[}]/g, (m, k) => r.fills[k] ?? m);
    await crit.fill(filled);
    const cleared = !!(await until(async () => (await warn.count()) === 0, 10_000));
    await field("How it resolves · Kiswahili").fill(r.critSw);
    await field("How it resolves · 中文").fill(r.critZh);
    await typeDate(sec, r.date);
    await typeTime(sec.getByRole("group", { name: `${r.label} start time`, exact: true }), r.time);
    await field("Source (the official result)").fill(r.url);
    await field("Estimated chance of YES (%)").fill(r.pct);
    await field("Where the estimate comes from").fill(r.psrc);
    if (r.tolerance) await sec.getByRole("textbox", { name: /^Reading tolerance/ }).fill(r.tolerance);
    cards.push({ label: r.label, template: template.length > 0, flagged, cleared, braceFree: !/[{}]/.test(filled) });
  }
  const off = cards.filter((c) => !(c.template && c.flagged && c.cleared && c.braceFree));
  ok(`3.4 every card took its kind's template, the builder flagged its {…}, and every one was filled (${cards.length - off.length} of 15)`, cards.length === 15 && off.length === 0, JSON.stringify(off).slice(0, 300));

  const save = page.getByRole("button", { name: "Save the draft", exact: true });
  await save.scrollIntoViewIfNeeded();
  await shot(page, "03-builder-filled");
  const saveBar = page.locator("div").filter({ has: save }).last();
  await save.click();
  const landed = await until(async () => {
    if (/^[/]admin[/]maswali[/]mlw_[^/]+$/.test(new URL(page.url()).pathname)) return "week";
    const said = await alertText(saveBar.getByRole("alert"));
    return said ? `refused: ${said}` : null;
  }, 120_000);
  if (!ok("3.5 the draft saves and the builder hands over to the week's own page", landed === "week", landed ?? "nothing happened")) return;
  weekPath = new URL(page.url()).pathname;
  const h1 = page.getByRole("heading", { level: 1 }).first();
  await until(async () => /^MLD-\d{4}-W\d{2}$/.test(clip(await h1.textContent())), 120_000);
  driveCode = clip(await h1.textContent());
  ok(`3.6 the week is ${driveCode}, on the drive line, its chip Draft`, /^MLD-\d{4}-W\d{2}$/.test(driveCode) && (await chipOf(page)) === "Draft", `${driveCode} · ${await chipOf(page)}`);
  // Pools' "Needed now" covers already open weeks, so a draft must not change it. The draft's
  // prospective floor appears in its own opening checklist and is checked separately below.
  const beforeRequirement = standing.requirement;
  await go(page, "/admin/maswali/pools");
  standing.requirement = /Needed now:\s*(TZS [\d,]+)/.exec(await page.locator("main").textContent())?.[1] ?? "?";
  ok(`3.6b the pools page still needs ${standing.requirement} for already open weeks`, standing.requirement === beforeRequirement);
  await go(page, weekPath);
  const problems = (await card(page, "Before it can open").getByRole("listitem").allTextContents()).map((t) => clip(t).replace(/^•\s*/, ""));
  const checklist = checkOpenChecklist(standing, problems);
  ok("3.7 the open's checklist matches the live licence, guarantee and second-reader state (MB-79)",
    checklist.ok, `${checklist.reason}; ${problems.join(" | ").slice(0, 400)}`);
  const qs = region(page, "Millionea week questions");
  const off2 = [];
  for (const r of ROWS) {
    const cells = qs.getByRole("row").filter({ has: page.getByRole("cell", { name: r.label, exact: true }) }).getByRole("cell");
    const got = { en: clip(await cells.nth(1).textContent()), eat: clip(await cells.nth(3).textContent()), chance: clip(await cells.nth(5).textContent()) };
    if (got.en !== r.en || got.eat !== r.expectEat || got.chance !== `${r.pct}%`) off2.push({ slot: r.label, ...got, want: r.expectEat });
  }
  ok("3.8 the week page holds the fifteen as typed: the English words, each start in EAT, each chance (15 of 15)", off2.length === 0, JSON.stringify(off2).slice(0, 300));
  await checkpoint(page, "3", "04-draft");
});

// ── 4 · attest, then open (with 2 · the Owner's ceremonies when the open asks for them) ─────────────────────────────
async function recordLicence() {
  await go(page, "/admin/maswali/pools");
  const sec = page.locator("section").filter({ has: page.getByRole("heading", { name: "Licence basis", exact: true }) });
  // The basis stays the Owner's dated ruling, the ceremony's own default.
  await sec.getByRole("textbox", { name: "Where it is kept", exact: true }).fill(LICENCE_REF);
  await sec.getByRole("button", { name: "Record", exact: true }).click();
  const r = await confirmDialog(page, "Record the licence basis?", { word: "RECORD", confirm: "Record it", alert: sec.getByRole("alert") });
  const now = r.closed && await until(async () => clip(await sec.textContent()).includes(`Now: the Owner's ruling · ${LICENCE_REF}`), 60_000);
  ok("2a · the open needed a licence basis: the Owner records the dated ruling (the confirm armed only on RECORD)", r.gated && !!now, r.refusal || clip(await sec.textContent(), 200));
  await checkpoint(page, "2a", "02a-licence-recorded");
}
async function fundGuarantee(amount) {
  await go(page, "/admin/maswali/pools");
  const sec = page.locator("section").filter({ has: page.getByRole("heading", { name: "Guarantee", exact: true }) });
  await sec.getByRole("textbox", { name: "Amount (TZS)", exact: true }).fill(String(amount));
  await sec.getByRole("textbox", { name: "Bank or rail reference", exact: true }).fill(`DRIVE-FUND-${Date.now()}`);
  await sec.getByRole("button", { name: "Pay in", exact: true }).click();
  const r = await confirmDialog(page, "Pay into the guarantee?", { word: "FUND GUARANTEE", confirm: "Pay it in", alert: sec.getByRole("alert") });
  const note = r.closed ? await until(async () => (await alertText(sec.getByRole("status"))).match(/The guarantee now holds TZS [\d,]+[.]/)?.[0] ?? null, 60_000) : null;
  ok(`2b · the open needed TZS ${amount.toLocaleString("en")} more guarantee: the Owner pays it in (the confirm armed only on FUND GUARANTEE) — "${note ?? ""}"`, r.gated && !!note, r.refusal);
  await checkpoint(page, "2b", "02b-guarantee-funded");
}

await part("4 · attest and open", async () => {
  if (!weekPath) { ok("4 · a drafted week to attest and open", false, "step 3 left no week"); return; }
  const own = card(page, "Before it can open");
  await own.getByRole("button", { name: "I read all three languages: they agree", exact: true }).click();
  const ownReview = await confirmDialog(page, `Attest ${driveCode}'s three languages?`, {
    word: "ATTEST", confirm: "Record the attestation", alert: (dlg) => dlg.getByRole("alert"),
  });
  ok("4.1 the drafter's own attestation is refused after the hard confirm: a second reader must attest (MB-79)",
    ownReview.gated && !ownReview.closed && /cannot attest its translations/.test(ownReview.refusal), ownReview.refusal);
  await ownReview.cancel();
  ok("4.1b …and the week stays an unattested draft", (await chipOf(page)) === "Draft" && (await own.getByText("The three languages are attested.", { exact: true }).count()) === 0);
  await checkpoint(page, "4.1", "05-attest-refused");

  const readerCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const reader = await readerCtx.newPage();
    watch(reader, "reader");
    const seeded = await readerCtx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { role: "MODERATOR", phone: "+255700000072", name: "Mo Second Reader" } });
    ok("4.2 a second reader signs in: a MODERATOR (trading attests), in a context of their own", seeded.ok(), String(seeded.status()));
    await go(reader, weekPath);
    const theirs = card(reader, "Before it can open");
    await theirs.getByRole("button", { name: "I read all three languages: they agree", exact: true }).click();
    const secondReview = await confirmDialog(reader, `Attest ${driveCode}'s three languages?`, {
      word: "ATTEST", confirm: "Record the attestation", alert: (dlg) => dlg.getByRole("alert"),
    });
    const attested = secondReview.closed && await until(async () => (await theirs.getByText("The three languages are attested.", { exact: true }).count()) > 0, 30_000);
    ok("4.2b the second reader attests after the hard confirm: the page says the three languages are attested",
      secondReview.gated && !!attested, secondReview.refusal || await alertText(theirs.getByRole("alert")));
    await checkpoint(reader, "4.2", "06-attested-by-second-reader");
    // S6-ADMIN · G8 · the lock chip a Trading officer reads names who works the control in the roles' own words.
    await go(reader, "/admin/maswali");
    const lock = card(reader, "Rules for the next week").locator("[title]").filter({ hasText: "Change the rules" }).first();
    const lockText = clip(await lock.textContent().catch(() => ""));
    const lockTitle = (await lock.getAttribute("title").catch(() => null)) ?? "";
    ok("4.2c ⭐ G8 · a Trading officer's lock chip reads “Change the rules · The Owner only” and says whom to ask",
      lockText.split("·").map((s) => s.trim()).join(" · ") === "Change the rules · The Owner only" && lockTitle === "Change the rules — The Owner only. Ask the Owner.", `${lockText} | ${lockTitle}`);
  } finally {
    await readerCtx.close();
  }

  // The checklist names the open's two standing conditions in the open's own words — the licence basis (OD-01) and the
  // guarantee (OD-02) — so the Owner's ceremonies run when the CHECKLIST asks for them, and the open then goes through at
  // the first press. (It once said every check passes while the open refused for both.)
  const needed = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    await go(page, weekPath);
    const list = clip(await card(page, "Before it can open").textContent());
    if (/licence basis/.test(list)) { needed.push("licence"); await recordLicence(); continue; }
    const short = /The guarantee holds TZS ([\d,]+); TZS ([\d,]+) is needed to open/.exec(list);
    if (short) { needed.push("guarantee"); await fundGuarantee(Math.max(1, num(short[2]) - num(short[1]))); continue; }
    break;
  }
  await go(page, weekPath);
  const ready = card(page, "Before it can open");
  ok(`4.3 back on the Owner's page: every check passes and the attestation stands${needed.length ? ` (the checklist asked for: ${needed.join(", ")})` : ""}`,
    (await ready.getByText("Every check passes: the week can open.", { exact: true }).count()) > 0
      && (await ready.getByText("The three languages are attested.", { exact: true }).count()) > 0, clip(await ready.textContent(), 300));
  await checkpoint(page, "4.3", "07-open-ready");

  // S5-FIX-SRV · this open's own audit row is lost (one armed fault): the week still opens, and the page says so (4.6).
  const armedOpen = await loseNextAuditRow("maswali.week.opened");
  ok("4.4a the open's audit row is armed to be lost (the dev-only fault route)", armedOpen);
  await ready.getByRole("button", { name: "Open the week", exact: true }).click();
  const r = await confirmDialog(page, "Open the week for sale?", { confirm: "Open the week", alert: ready.getByRole("alert") });
  opened = r.closed;
  if (!opened) await r.cancel();
  if (!ok("4.4 ⭐ the week opens at the first press: the checklist named everything the open needed", opened, r.refusal)) return;
  if (needed.length === 0) ok(`2 · the open needed no ceremony: the licence basis (${standing.licence}) and the guarantee (${standing.guarantee}) were in place`, true);
  const selling = await until(async () => (await chipOf(page)) === "Selling", 60_000);
  ok("4.5 the open shows: the chip reads Selling and the close can be moved", !!selling && (await card(page, "Move the sales close").count()) > 0, await chipOf(page));
  await checkpoint(page, "4.4", "08-opened");
  await auditWarningReads("4.6", page.locator("main"), UNRECORDED.open, "08b-open-unrecorded");
});

// ── 5 · move the close ───────────────────────────────────────────────────────────────────────────────────────────────
await part("5 · move the close", async () => {
  if (!opened) { ok("5 · an open week whose close can move", false, "step 4 opened no week"); return; }
  const mv = card(page, "Move the sales close");
  const nowCloses = async () => /Now closes (.+?) [(]EAT[)][.]/.exec(clip(await mv.textContent()))?.[1] ?? null;
  const time = mv.getByRole("group", { name: "New close time", exact: true });
  const was = await nowCloses();
  // Two hours after the first event (Saturday 10:00 EAT): past "the first event less its buffer" (MB-28).
  await typeDate(mv, SAT);
  await typeTime(time, "12:00");
  await mv.getByRole("button", { name: "Move the close", exact: true }).click();
  const lateReview = await confirmDialog(page, `Move ${driveCode}'s sales close?`, {
    word: "MOVE CLOSE", confirm: "Move the close", alert: (dlg) => dlg.getByRole("alert"),
    fields: async (dlg) => {
      const text = clip(await dlg.textContent());
      ok("5.1a the late-move dialog shows both EAT close values", text.includes(`Current close: ${was} (EAT)`) && text.includes(`New close: ${SAT} 12:00 (EAT)`), text);
    },
  });
  ok("5.1 a close after the first event is refused after the hard confirm, in the service's words",
    lateReview.gated && !lateReview.closed && /The close must stay at least \d+ minutes before the first event[.]/.test(lateReview.refusal), lateReview.refusal);
  await lateReview.cancel();
  ok("5.1b …and the close did not move", (await nowCloses()) === was && was !== null && (await chipOf(page)) === "Selling", `${await nowCloses()} (was ${was})`);
  await checkpoint(page, "5.1", "09-close-refused");

  const want = fmtEat(eatMs(THU, "17:00"));
  await typeDate(mv, THU);
  await typeTime(time, "17:00");
  await mv.getByRole("button", { name: "Move the close", exact: true }).click();
  const earlyReview = await confirmDialog(page, `Move ${driveCode}'s sales close?`, {
    word: "MOVE CLOSE", confirm: "Move the close", alert: (dlg) => dlg.getByRole("alert"),
    fields: async (dlg) => {
      const text = clip(await dlg.textContent());
      ok("5.2a the earlier-move dialog shows both EAT close values", text.includes(`Current close: ${was} (EAT)`) && text.includes(`New close: ${THU} 17:00 (EAT)`), text);
    },
  });
  const moved = earlyReview.closed && await until(async () => (await nowCloses()) === want, 30_000);
  ok(`5.2 an earlier close is accepted after the hard confirm: the page now says it closes ${want} (EAT)`,
    earlyReview.gated && !!moved && (await mv.getByRole("alert").count()) === 0, earlyReview.refusal || `${await nowCloses()} ${await alertText(mv.getByRole("alert"))}`);
  ok("5.2b …and the week still sells", (await chipOf(page)) === "Selling", await chipOf(page));
  await checkpoint(page, "5.2", "10-close-moved");

  // S5-FIX-SRV · one more move, its audit row lost (one armed fault): the close still moves, and the form says so.
  const armedMove = await loseNextAuditRow("maswali.week.close_moved");
  const wantAgain = fmtEat(eatMs(THU, "16:00"));
  await typeDate(mv, THU);
  await typeTime(time, "16:00");
  await mv.getByRole("button", { name: "Move the close", exact: true }).click();
  const unrecordedMove = await confirmDialog(page, `Move ${driveCode}'s sales close?`, { word: "MOVE CLOSE", confirm: "Move the close", alert: (dlg) => dlg.getByRole("alert") });
  const movedAgain = unrecordedMove.closed && await until(async () => (await nowCloses()) === wantAgain, 30_000);
  ok(`5.3 a move whose audit row is lost still lands: the page now says it closes ${wantAgain} (EAT)`,
    armedMove && unrecordedMove.gated && !!movedAgain, unrecordedMove.refusal || `${await nowCloses()}`);
  await checkpoint(page, "5.3", "10b-close-moved-unrecorded");
  await auditWarningReads("5.3b", mv, UNRECORDED.move, "10c-move-unrecorded");
});

// ── 6 · the seeded weeks ─────────────────────────────────────────────────────────────────────────────────────────────
await part("6.0 · seed", async () => {
  const seed = await ctx.request.post(`${BASE}/api/dev-test/seed-maswali`, { data: {}, timeout: 300_000 });
  const body = await seed.json().catch(() => ({}));
  if (seed.status() === 409) ok("6.0 the seeded weeks are already on this store (409: qa:maswali-admin-shots seeded them)", true);
  else ok("6.0 seeded a week in every state", seed.ok() && body.ok === true, clip(JSON.stringify(body), 300));
});

await part("6.1 · seal", async () => {
  await go(page, "/admin/maswali");
  const closedRow = region(page, "Millionea weeks").getByRole("row").filter({ has: page.getByRole("cell", { name: "Closed", exact: true }) }).first();
  if ((await closedRow.count()) === 0) { ok("6.1 a seeded week waits with its sales closed and its fifteen results unsealed", false, "no week reads Closed on /admin/maswali (the seed's weeks.closed)"); return; }
  const link = closedRow.getByRole("link").first();
  const code = clip(await link.textContent());
  await link.click(); // the list's own link: a client navigation
  await until(async () => clip(await page.getByRole("heading", { level: 1 }).first().textContent()) === code, 120_000);
  ok(`6.1 the list's link opens ${code}: its chip Closed, the seal console ready`, (await chipOf(page)) === "Closed" && (await card(page, "Seal the results").count()) > 0, await chipOf(page));
  const closedPath = new URL(page.url()).pathname;
  await go(page, "/admin/resolver-queue");
  const single = page.getByRole("switch", { name: "Two-admin authorization: off", exact: true });
  ok("6.1a the local resolution policy starts with single-admin authorization", (await single.count()) === 1 && (await single.getAttribute("aria-checked")) === "false");
  await single.click();
  const twoOn = await until(async () => (await page.getByRole("switch", { name: "Two-admin authorization: on", exact: true }).getAttribute("aria-checked")) === "true", 30_000);
  ok("6.1b the Owner enables the local two-officer ceremony after the seed finishes", !!twoOn);
  await go(page, closedPath);
  const sc = card(page, "Seal the results");
  const plan = ROWS.map((r, i) => ({ label: r.label, outcome: i < 10 && i % 2 === 1 ? "NO" : "YES" }));
  const first = plan[0];
  const firstRow = sc.getByRole("row").filter({ has: page.getByRole("combobox", { name: `${first.label} result`, exact: true }) });
  await firstRow.getByRole("textbox", { name: `${first.label} seal evidence`, exact: true }).fill(`The source's official result for ${first.label}: ${first.outcome}.`);
  await choose(page, firstRow.getByRole("combobox", { name: `${first.label} result`, exact: true }), first.outcome);
  await sc.getByRole("button", { name: "Seal 1 result", exact: true }).click();
  const firstSeal = await confirmDialog(page, "Seal 1 result?", { word: "SEAL", confirm: "Seal", alert: sc.getByRole("alert") });
  const awaitingSecond = firstSeal.closed && await until(async () => {
    const row = region(page, "Millionea results to seal").getByRole("row").filter({ has: page.getByRole("cell", { name: "M1", exact: true }) });
    return clip(await row.textContent()).includes("awaits a second officer");
  }, 60_000);
  ok("6.1c M1 was sealed under the two-officer rule and now awaits a second officer", firstSeal.gated && !!awaitingSecond, firstSeal.refusal);
  await checkpoint(page, "6.1c", "11a-awaits-second");
  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const pendingResult = region(page, "Millionea results to seal").getByRole("combobox", { name: "M2 result", exact: true });
    await pendingResult.scrollIntoViewIfNeeded();
    const fit = await pendingResult.evaluate((button) => {
      const label = button.querySelector("span");
      const text = document.createRange();
      if (label) text.selectNodeContents(label);
      const row = button.closest("tr");
      const voidButton = Array.from(row?.querySelectorAll("button") ?? []).find((el) => el.textContent?.trim() === "Void…");
      const secondButton = Array.from(button.closest("tbody")?.querySelectorAll("button") ?? []).find((el) => el.textContent?.trim() === "Confirm as second officer");
      return { trigger: button.getBoundingClientRect().width, triggerHeight: button.getBoundingClientRect().height,
        voidHeight: voidButton?.getBoundingClientRect().height ?? 0, secondHeight: secondButton?.getBoundingClientRect().height ?? 0,
        lines: label ? text.getClientRects().length : 0,
        root: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    ok(`6.1c the pending result stays one readable line after first seal at ${width}px`,
      fit.trigger >= 99 && fit.triggerHeight >= 40 && fit.voidHeight >= 40 && fit.secondHeight >= 40
        && fit.lines === 1 && fit.root <= 1, JSON.stringify(fit));
    await shot(page, `11a-awaits-second-${width}`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });

  const confirmerCtx = await browser.newContext({ viewport: { width: 360, height: 900 } });
  try {
    await confirmerCtx.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
    const confirmer = await confirmerCtx.newPage();
    watch(confirmer, "confirmer");
    const seeded = await confirmerCtx.request.post(`${BASE}/api/dev-test/seed-admin`, {
      data: { role: "MODERATOR", phone: "+255700000074", name: "Mo Second Seal Officer" },
    });
    ok("6.1d a distinct MODERATOR signs in to confirm the seal", seeded.ok(), String(seeded.status()));
    await go(confirmer, closedPath);
    const sealRow = region(confirmer, "Millionea results to seal").getByRole("row").filter({ has: confirmer.getByRole("cell", { name: "M1", exact: true }) });
    await sealRow.getByRole("button", { name: "Confirm as second officer", exact: true }).click();
    const title = `Confirm ${code} M1 as second officer?`;
    const dialog = confirmer.getByRole("alertdialog", { name: title, exact: true });
    await dialog.waitFor();
    const reviewText = clip(await dialog.textContent());
    ok("6.1e the second officer sees the exact week, slot, question and sealed result",
      reviewText.includes(`Week: ${code}`) && reviewText.includes("Slot: M1") && reviewText.includes("Sealed result: YES")
        && reviewText.includes("Will event 1 happen this weekend?"), reviewText);
    for (const width of [360, 1280]) {
      await confirmer.setViewportSize({ width, height: 900 });
      await confirmer.waitForTimeout(400);
      const fit = await confirmer.evaluate(() => {
        const dlg = document.querySelector('[role="alertdialog"]')?.getBoundingClientRect();
        return { lang: document.documentElement.lang, overflow: document.documentElement.scrollWidth - innerWidth,
          left: dlg?.left ?? -1, right: dlg?.right ?? innerWidth + 1 };
      });
      ok(`6.1f the second-officer review fits at ${width}px and html lang is English`,
        fit.lang === "en" && fit.overflow <= 1 && fit.left >= -1 && fit.right <= width + 1, JSON.stringify(fit));
      await shot(confirmer, `11b-second-officer-${width}`);
    }
    const secondSeal = await confirmDialog(confirmer, title, { word: "CONFIRM", confirm: "Confirm this seal", alert: (dlg) => dlg.getByRole("alert") });
    const confirmed = secondSeal.closed && await until(async () => !clip(await sealRow.textContent()).includes("awaits a second officer"), 60_000);
    ok("6.1g the distinct officer confirms M1 after its hard typed-word review", secondSeal.gated && !!confirmed, secondSeal.refusal);
    await checkpoint(confirmer, "6.1g", "11c-second-confirmed");
  } finally {
    await confirmerCtx.close();
  }

  await go(page, "/admin/resolver-queue");
  await page.getByRole("switch", { name: "Two-admin authorization: on", exact: true }).click();
  const relaxed = await confirmDialog(page, "Allow single-admin resolution?", { confirm: "Yes, single admin can resolve" });
  const twoOff = relaxed.closed && await until(async () => (await page.getByRole("switch", { name: "Two-admin authorization: off", exact: true }).getAttribute("aria-checked")) === "false", 30_000);
  ok("6.1h the Owner returns the local policy to its initial single-admin state", !!twoOff, relaxed.refusal);
  await go(page, closedPath);
  const remaining = card(page, "Seal the results");
  for (const s of plan.slice(1)) {
    const combo = remaining.getByRole("combobox", { name: `${s.label} result`, exact: true });
    // ⚠️ A `has` locator is re-run inside each candidate row, so it is rooted at the page, never at the card.
    const row = remaining.getByRole("row").filter({ has: page.getByRole("combobox", { name: `${s.label} result`, exact: true }) });
    await row.getByRole("textbox", { name: `${s.label} seal evidence`, exact: true }).fill(`The source's official result for ${s.label}: ${s.outcome}.`);
    await choose(page, combo, s.outcome);
  }
  await shot(page, "11-seal-console-filled");
  await remaining.getByRole("button", { name: "Seal 14 results", exact: true }).click();
  const r = await confirmDialog(page, "Seal 14 results?", { word: "SEAL", confirm: "Seal", alert: remaining.getByRole("alert") });
  const results = region(page, "Millionea results to seal");
  const sealedAll = r.closed && await until(async () => {
    for (const s of plan) {
      const cells = results.getByRole("row").filter({ has: page.getByRole("cell", { name: s.label, exact: true }) }).getByRole("cell");
      if (!clip(await cells.nth(3).textContent()).startsWith(s.outcome)) return false;
    }
    return true;
  }, 60_000);
  ok("6.1i all fifteen results are sealed, including M1's second-officer confirmation", r.gated && !!sealedAll, r.refusal);
  const chip = await until(async () => ((await chipOf(page)) === "Sealing" ? "Sealing" : null), 30_000);
  ok("6.1j the week is being sealed: its chip reads Sealing and its objection window is open", chip === "Sealing" && (await page.getByText(/^Objection window to /).count()) > 0, await chipOf(page));
  await checkpoint(page, "6.1", "12-sealed");
  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const correction = region(page, "Millionea results to seal").getByRole("button", { name: "Correct…", exact: true }).first();
    await correction.scrollIntoViewIfNeeded();
    const fit = await correction.evaluate((button) => ({ height: button.getBoundingClientRect().height,
      root: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
    ok(`6.1k the sealed result's correction target is touch-sized at ${width}px`,
      fit.height >= 40 && fit.root <= 1, JSON.stringify(fit));
    await shot(page, `12-sealed-correct-${width}`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
});

await part("6.2 · preview and release", async () => {
  await go(page, "/admin/maswali/pools");
  const open = region(page, "Millionea open weeks");
  const rel = open.getByRole("button", { name: /^Release MLN-/ }).first();
  if ((await rel.count()) === 0) { ok("6.2 a prepared settlement waits on the pools page", false, clip(await open.textContent().catch(() => "no open weeks"), 300)); return; }
  const code = clip(await rel.textContent()).replace(/^Release /, "");
  const row = open.getByRole("row").filter({ has: page.getByRole("button", { name: `Release ${code}`, exact: true }) });
  const prepared = clip(await row.textContent(), 400);
  ok(`6.2 accounting reads ${code}'s prepared settlement first`,
    /\d+ winners? · TZS [\d,]+ each · fee TZS [\d,]+ · top-up TZS [\d,]+/.test(prepared) || /No 10 of 10: TZS [\d,]+ rolls to the jackpot[.]/.test(prepared), prepared);
  await shot(page, "13-pools-prepared");
  await rel.click();
  const r = await confirmDialog(page, `Release ${code}?`, { word: "RELEASE", confirm: "Release the settlement", alert: row.getByRole("alert") });
  const left = r.closed && await until(async () => (await open.getByRole("row").filter({ hasText: code }).count()) === 0, 60_000);
  const trail = region(page, "Millionea rollover trail").getByRole("row").filter({ has: page.getByRole("cell", { name: code, exact: true }) });
  ok(`6.2b released (the confirm armed only on RELEASE): ${code} leaves the open weeks and enters the rollover trail`, r.gated && !!left && (await trail.count()) > 0,
    r.refusal || clip(await trail.textContent().catch(() => ""), 200));
  await checkpoint(page, "6.2", "14-released");
  await go(page, "/admin/maswali");
  const chip = await listChip(page, code);
  ok(`6.2c the weeks list says ${code} is Settled`, chip === "Settled", chip);
});

await part("6.3 · pause and resume", async () => {
  await go(page, "/admin/maswali/integrity");
  const sales = card(page, "Sales");
  ok("6.3 the integrity page says sales run", /Selling normally[.]/.test(clip(await sales.textContent())), clip(await sales.textContent(), 200));
  await sales.getByRole("textbox", { name: "Why sales pause", exact: true }).fill(PAUSE_WHY);
  await sales.getByRole("button", { name: "Pause sales", exact: true }).click();
  const p1 = await confirmDialog(page, "Pause Millionea sales?", { word: "PAUSE", confirm: "Pause", alert: sales.getByRole("alert") });
  const paused = p1.closed && await until(async () => { const t = clip(await sales.textContent()); return /Paused since .+: /.test(t) && t.includes(PAUSE_WHY); }, 60_000);
  ok("6.3b compliance pauses sales (the confirm armed only on PAUSE): the page says since when and why", p1.gated && !!paused, p1.refusal || clip(await sales.textContent(), 200));
  ok("6.3c …and the control turns to Resume", (await sales.getByRole("button", { name: "Resume sales", exact: true }).count()) > 0);
  await checkpoint(page, "6.3", "15-paused");

  await go(page, "/admin/maswali");
  const raised = card(page, "Needs attention").getByRole("listitem").filter({ hasText: `Sales are paused: ${PAUSE_WHY}` });
  const kpi = /Sales[\s\S]{0,40}?(Paused|Running)/.exec(clip(await page.locator("main").textContent()))?.[1] ?? "?";
  ok("6.3d the weeks page raises it under Soon, and its Sales tile reads Paused",
    (await raised.count()) > 0 && clip(await raised.first().textContent()).startsWith("Soon") && kpi === "Paused", `tile ${kpi}`);
  await checkpoint(page, "6.3d", "16-paused-overview");

  await go(page, "/admin/maswali/integrity");
  const again = card(page, "Sales");
  await again.getByRole("textbox", { name: "Why sales resume", exact: true }).fill(RESUME_WHY);
  await again.getByRole("button", { name: "Resume sales", exact: true }).click();
  const p2 = await confirmDialog(page, "Resume Millionea sales?", { word: "RESUME", confirm: "Resume", alert: again.getByRole("alert") });
  const running = p2.closed && await until(async () => /Selling normally[.]/.test(clip(await again.textContent())), 60_000);
  ok("6.3e compliance resumes sales (the confirm armed only on RESUME): the page says sales run again",
    p2.gated && !!running && (await again.getByRole("button", { name: "Pause sales", exact: true }).count()) > 0, p2.refusal || clip(await again.textContent(), 200));
  await checkpoint(page, "6.3e", "17-resumed");
});

await part("6.4 · void a week", async () => {
  await go(page, "/admin/maswali/integrity");
  const vw = card(page, "Weeks that void whole");
  const btn = vw.getByRole("button", { name: /^Void MLN-/ }).first();
  if ((await btn.count()) === 0) {
    await go(page, "/admin/maswali");
    const voids = region(page, "Millionea weeks").getByRole("row").filter({ has: page.getByRole("cell", { name: "Voids whole", exact: true }) });
    const already = [];
    for (let i = 0; i < (await voids.count()); i++) {
      const cells = voids.nth(i).getByRole("cell");
      if (clip(await cells.nth(2).textContent()) === "Voided") already.push(clip(await cells.nth(0).textContent()));
    }
    skipped("6.4 void a week", already.length > 0
      ? `no week waits to be voided: ${already.join(", ")} already reads Voided — the Millionea tick voided it on its own once its window had closed (maswali-scheduler.ts, runMaswaliTick: a certain week void, its window closed). Start next dev with MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false to drive the console's own void.`
      : "no seeded week's void is certain on this store (the seed's weeks.voidable)");
    return;
  }
  const code = clip(await btn.textContent()).replace(/^Void /, "");
  // S5-FIX-SRV · this void's audit row is lost (one armed fault): the week still voids and refunds, and the card says so.
  const armedVoid = await loseNextAuditRow("maswali.week.voided");
  ok("6.4a the void's audit row is armed to be lost (the dev-only fault route)", armedVoid);
  await btn.click();
  const r = await confirmDialog(page, `Void ${code} whole?`, { word: "VOID", confirm: "Void and refund", alert: vw.getByRole("alert") });
  const gone = r.closed && await until(async () => (await vw.getByRole("button", { name: `Void ${code}`, exact: true }).count()) === 0, 60_000);
  ok(`6.4 compliance voids ${code} whole (the confirm armed only on VOID): it leaves the weeks to void`, r.gated && !!gone, r.refusal || clip(await vw.textContent(), 200));
  await checkpoint(page, "6.4", "18-voided");
  await auditWarningReads("6.4c", vw, UNRECORDED.void, "18b-void-unrecorded");
  await go(page, "/admin/maswali");
  const chip = await listChip(page, code);
  ok(`6.4b the weeks list says ${code} is Voided`, chip === "Voided", chip);
});

await part("6.5 · hold, release and forfeit a share", async () => {
  await go(page, "/admin/maswali/integrity");
  const winners = region(page, "Millionea winners");
  const winnerRow = (serial) => winners.getByRole("row").filter({ has: page.getByRole("cell", { name: serial, exact: true }) });
  const heldRow = (serial) => region(page, "Millionea held shares").getByRole("row").filter({ has: page.getByRole("cell", { name: serial, exact: true }) });
  const screening = async (serial) => clip(await winnerRow(serial).getByRole("cell").nth(6).textContent().catch(() => ""));
  const holdable = winners.getByRole("row").filter({ has: page.getByRole("button", { name: /^Hold/ }) });
  const n = await holdable.count();
  if (n === 0) { ok("6.5 a paid winner waits to be screened", false, "no winner with a Hold control on /admin/maswali/integrity"); return; }
  const info = async (i) => { const cells = holdable.nth(i).getByRole("cell"); return { serial: clip(await cells.nth(1).textContent()), holder: clip(await cells.nth(2).textContent()) }; };
  const A = await info(0);
  let B = null;
  for (let i = 1; i < n; i++) { const x = await info(i); if (!B || (B.holder === A.holder && x.holder !== A.holder)) B = x; }
  B ??= A; // a single winner is held twice: released the first time, forfeited the second

  async function hold(s, tag, tile) {
    await winnerRow(s.serial).getByRole("button", { name: /^Hold/ }).click();
    const r = await confirmDialog(page, `Hold the share on ${s.serial}?`, {
      word: "HOLD", confirm: "Hold it", alert: winnerRow(s.serial).getByRole("alert"),
      fields: (d) => d.getByRole("textbox", { name: /^Why [(]a reversed deposit/ }).fill(HOLD_WHY),
    });
    const held = r.closed && await until(async () => (await heldRow(s.serial).count()) > 0, 60_000);
    const said = await screening(s.serial);
    ok(`${tag} compliance holds the share on ${s.serial} (the confirm armed only on HOLD): it is listed under Held shares and the winner's screening reads its reason`,
      r.gated && !!held && said === HOLD_WHY, r.refusal || said); // R2-1: the console reads the reason, never the raw mark
    await checkpoint(page, tag, tile);
  }
  await hold(A, "6.5", "19-held");

  await heldRow(A.serial).getByRole("button", { name: /^Release/ }).click();
  const r1 = await confirmDialog(page, `Release the share on ${A.serial}?`, {
    word: "RELEASE", confirm: "Release it", alert: heldRow(A.serial).getByRole("alert"),
    fields: (d) => d.getByRole("textbox", { name: "The decision", exact: true }).fill(RELEASE_WHY),
  });
  const off = r1.closed && await until(async () => (await heldRow(A.serial).count()) === 0, 60_000);
  ok(`6.5b compliance releases it (the confirm armed only on RELEASE): ${A.serial} leaves Held shares and can be held again`,
    r1.gated && !!off && (await winnerRow(A.serial).getByRole("button", { name: /^Hold/ }).count()) > 0, r1.refusal);
  await checkpoint(page, "6.5b", "20-share-released");

  await hold(B, "6.5c", "21-held-again");
  await heldRow(B.serial).getByRole("button", { name: /^Forfeit/ }).click();
  const r2 = await confirmDialog(page, `Forfeit the share on ${B.serial}?`, {
    word: "FORFEIT SHARE", confirm: "Forfeit to the jackpot", alert: heldRow(B.serial).getByRole("alert"),
    fields: (d) => d.getByRole("textbox", { name: "The decision", exact: true }).fill(FORFEIT_WHY),
  });
  const forfeited = r2.closed && await until(async () => (await heldRow(B.serial).getByText("Forfeited", { exact: true }).count()) > 0, 60_000);
  const said = await screening(B.serial);
  ok(`6.5d compliance forfeits ${B.serial} to the jackpot (the confirm armed only on FORFEIT SHARE): its row reads Forfeited and the winner's screening reads its reason`,
    r2.gated && !!forfeited && said === FORFEIT_WHY, r2.refusal || said); // R2-1: the reason, never the raw mark
  await checkpoint(page, "6.5d", "22-forfeited");
});

// ── 6.5g · S6-ADMIN · the console in plain words: the fee a week froze (G2), a draft discarded (G5), the archive's list (G7) ──
await part("6.5g · the console in plain words", async () => {
  await go(page, "/admin/maswali/pools");
  const fees = (await page.locator("[data-fee-rate]").allTextContents()).map((t) => clip(t));
  ok("6.5g.1 ⭐ G2 · Pools shows the fee each open week froze, as a percentage", fees.length > 0 && fees.every((f) => /^[0-9]+(?:[.][0-9]+)?%$/.test(f)), fees.join(", "));
  await go(page, "/admin/maswali?state=DRAFT");
  const link = region(page, "Millionea weeks").getByRole("link", { name: /^ML[ND]-/ }).first();
  if ((await link.count()) === 0) { skipped("6.5g.2 a draft's rules and its discard", "no draft on this store"); }
  else {
    const code = clip(await link.textContent());
    await link.click();
    await settle(page);
    const rules = clip(await card(page, "Rules if it opened now").textContent().catch(() => ""), 4000);
    ok("6.5g.2 ⭐ G2 · a draft's page reads the rules its open would freeze, the fee at payout among them",
      /Fee at payout [(]% of the jackpot[)] ?[0-9]/.test(rules) && rules.includes("Ticket price (TZS)") && !rules.includes("Complaint answer target"), rules.slice(0, 240));
    await page.getByRole("button", { name: "Discard draft", exact: true }).click();
    const r = await confirmDialog(page, `Discard ${code}?`, { word: "DISCARD", confirm: "Discard the draft", alert: (dlg) => dlg.getByRole("alert") });
    const landed = r.closed && await until(async () => new URL(page.url()).pathname === "/admin/maswali", 60_000);
    await checkpoint(page, "6.5g", "23-draft-discarded");
    await go(page, `/admin/maswali?q=${encodeURIComponent(code)}`);
    const listed = await region(page, "Millionea weeks").getByRole("link", { name: code, exact: true }).count().catch(() => -1);
    ok(`6.5g.3 ⭐ G5 · the draft ${code} is discarded on DISCARD (the confirm armed only by the word) and leaves the list`,
      r.gated && !!landed && listed === 0, r.refusal || `landed ${landed} · still listed ${listed}`);
  }
  await go(page, "/admin/maswali/evidence?state=SETTLED");
  const shown = Number(await page.locator("[data-result-count]").getAttribute("data-result-count").catch(() => "-1"));
  const chips = (await region(page, "Millionea weeks and their evidence").getByRole("row").locator("td:nth-child(2)").allTextContents().catch(() => [])).map((t) => clip(t));
  ok("6.5g.4 ⭐ G7 · the evidence archive filters by state: every week it lists reads Settled",
    shown >= 1 && chips.length === Math.min(shown, 20) && chips.every((c) => c === "Settled"), `${shown} · ${chips.join(", ")}`);
  await checkpoint(page, "6.5g", "24-evidence-filtered");
});

// ── 6.6 · LAST: the Owner stops the product, its audit row lost (S5-FIX-SRV) ─────────────────────────────────────────
// Last, because a final week changes what may open after it. The week chosen is the one on sale (it becomes final at once)
// or else a draft a full week out — an earlier week is refused once a later one has opened (MR-30).
await part("6.6 · stop the product", async () => {
  await go(page, "/admin/maswali/pools");
  const stop = page.locator("section").filter({ has: page.getByRole("heading", { name: "Stop the product", exact: true }) });
  const pick = stop.getByRole("combobox", { name: "Final week", exact: true });
  if ((await pick.count()) === 0) { skipped("6.6 stop the product", clip(await stop.textContent().catch(() => "no stop section"), 200)); return; }
  await pick.click();
  const labels = (await page.getByRole("option").allTextContents()).map((l) => clip(l));
  const label = labels.find((l) => l.endsWith("· open")) ?? labels.find((l) => l.endsWith("· draft"));
  if (!label) { await page.keyboard.press("Escape"); skipped("6.6 stop the product", `no week on sale or drafted to make final: ${labels.join(", ")}`); return; }
  await page.getByRole("option", { name: label, exact: true }).click();
  const code = label.split(" · ")[0];
  await stop.getByRole("textbox", { name: "Why Millionea is stopping", exact: true }).fill(STOP_WHY);
  const armed = await loseNextAuditRow("maswali.sunset.ordered");
  await stop.getByRole("button", { name: "Make it the final week", exact: true }).click();
  const r = await confirmDialog(page, `Make ${code} the final week?`, { word: "SUNSET MILLIONEA", confirm: "Make it final", alert: (dlg) => dlg.getByRole("alert") });
  const named = r.closed && await until(async () => clip(await stop.textContent()).includes(`Week ${code} is the final week.`), 60_000);
  ok(`6.6 the Owner makes ${code} the final week (the confirm armed only on SUNSET MILLIONEA), its audit row lost: the page names it`,
    armed && r.gated && !!named, r.refusal || clip(await stop.textContent(), 300));
  await checkpoint(page, "6.6", "23-stopped");
  await auditWarningReads("6.6b", stop, UNRECORDED.stop, "23b-stop-unrecorded");
});

await browser.close();
if (skip > 0) console.log(`(${skip} skipped, each with its reason above)`);
console.log(`tiles in ${OUT}/`);
console.log(`maswali-admin-drive: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
