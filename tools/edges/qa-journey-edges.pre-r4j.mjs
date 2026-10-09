/**
 * qa-journey-edges — THE JOURNEY SHELL IN THE EDGE CASES A CRITICAL REVIEWER TRIES, AS VIEWPORT TILES, EACH WITH A LOG.
 * The owner's rule (Ali): "only perfect visual and logical results … scenarios expected and not expected".
 *
 *   cd <the repository checkout>
 *   KP_BASE=http://localhost:3074 node <path>/qa-journey-edges.mjs <outDir>
 *
 *   <outDir>        where the PNG tiles and the JSON log go. Refused inside the checkout (an untracked tile there is a
 *                   file another session's commit can sweep up). By default a new folder under the OS temp directory.
 *   KP_BASE         default http://localhost:3074. Refused unless loopback http, and then held to the repo's own
 *                   premise (scripts/live/journey-pass.mjs): http://localhost:PORT exactly, an IN-MEMORY dev server
 *                   (no DATABASE_URL), a rollout a preview pass can see. The server must run with DISABLE_ADMIN_TOTP=true
 *                   or no staff preview pass can be minted. This drive SIGNS PEOPLE IN, STARTS A BREAK, SELF-EXCLUDES A
 *                   PLAYER and RENAMES ONE: never point it at a server anything else is using.
 *   KP_ONLY         a comma list of scenarios, by number or name: 1 break, 2 exclude, 3 name, 4 title, 5 loading,
 *                   6 notfound, 7 viewports, 8 bigtext, 9 offline, 10 empty. Always run in that order. Unknown → refused.
 *   KP_BUDGET_MIN   minutes for the scenarios, counted after §0 (default 150). Once spent, every cell not yet tiled is
 *                   logged BLOCKED by name. KP_WARM_MIN: §0's warm-up budget (default 10). A watchdog ends the run at
 *                   KP_WARM_MIN + KP_BUDGET_MIN + 5 minutes whatever hangs.
 *
 * It resolves `playwright` and the repo's helpers from process.cwd() (createRequire for playwright, a dynamic import of
 * scripts/live/journey-pass.mjs), so the file itself may live anywhere. It adds no route and no test door: every state
 * is reached through the real UI or through dev-test doors that already exist (seed-admin, seed-wallet through
 * demoSession, seed-markets, seed-real-markets, reset-rate-limits) and /auth/demo.
 *
 * ── HOW EACH TILE IS TAKEN ───────────────────────────────────────────────────────────────────────────────────────────
 * Every journey tile goes through a REAL staff preview pass, minted the way an officer mints one (mintStaffPass: a
 * SUPPORT officer turns their preview on at /admin/journey), handed to every context beside the session it is for —
 * the journey shell shows only to a pass holder. The language is the kp-locale cookie. Each page is opened to its load
 * event, its header hydrated, its fonts in, the Next.js dev indicator hidden, then settled. A tile is the VIEWPORT,
 * never the full page (a header tile is the viewport's top band, clipped under the header). Mid-load tiles are taken
 * through CDP Page.captureScreenshot, which does not wait for fonts or for the page to settle.
 * Tile names: <seq>--<scenario>--<route>--<viewer>--<locale>--<width>.png (width is WxH for the odd viewports).
 *
 * ── THE LOG (qa-journey-edges.json, beside the tiles, rewritten after every line) ─────────────────────────────────────
 * One entry per tile: the file, what it SHOULD show (`expect`), the address asked for and the one landed on, the
 * document's HTTP status and its redirects, the last response the page saw (document, RSC or server action), whether
 * the header hydrated, html lang, the h1, the header's state (capsule and its words, gold pill, Ingia/Jisajili, lit
 * tab), live regions on screen (alerts, toasts, the offline banner), a Next.js error overlay, every page error and
 * console error since the last tile, and the OVERFLOW probe: document scrollWidth against clientWidth (html and body
 * clip, so that alone reads 0 over a severed control), every visible element whose right edge passes the viewport and
 * that no sideways-scrolling ancestor can bring back, and every control past the edge (live/clip.mjs's rule). `flags`
 * sums it up. A cell that cannot be reached is a BLOCKED entry with its reason, never a silent gap: when a scenario
 * ends, every planned cell it did not tile is logged BLOCKED.
 *
 * ── WHY SEPARATE PLAYERS FOR THE BREAK, THE EXCLUSION AND THE NAME ───────────────────────────────────────────────────
 * The demo player is ONE account and every /auth/demo ends its last session (live/journey-pass.mjs). A break lasts its
 * whole period and a self-exclusion is never lifted by itself (an officer restores it, and selfExclusionUntil is never
 * cleared), and /auth/demo would mint a session for an excluded account straight through createSession — a state no
 * real person can reach, since the sign-in gate refuses SELF_EXCLUDED. So scenarios 1-3 each seed a FRESH player
 * through seed-admin (role PLAYER, TZS 50,000, a password so the real sign-in form can be used), and the demo account
 * stays clean for 4-10. Each run uses new phone numbers; nothing is reused between runs.
 *
 * EXIT 0 every planned tile taken · 3 something BLOCKED (see the log) · 2 REFUSED · 1 the drive itself crashed.
 */
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const NL = String.fromCharCode(10);
const STARTED = Date.now();
const CWD = process.cwd();
const say = (s) => console.log(s);
function refuseEarly(text) {
  console.error(`REFUSED — ${text}`);
  process.exit(2);
}
const firstLine = (e) => String(e?.message ?? e).split(NL)[0].trim();
const msg = (e) => firstLine(e).slice(0, 260);

// ── The base: loopback only, because this signs people in and changes their state ─────────────────────────────────────
const BASE = String(process.env.KP_BASE ?? 'http://localhost:3074').replace(/\/+$/, '');
{
  let u = null;
  try {
    u = new URL(BASE);
  } catch {
    u = null;
  }
  const loopback = !!u && u.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  if (!loopback) refuseEarly(`KP_BASE must be a loopback http address — this drive signs players in, starts a break, self-excludes one and renames one. Got ${JSON.stringify(BASE)}`);
}

// ── The scenarios ─────────────────────────────────────────────────────────────────────────────────────────────────────
const SCENARIOS = [
  { n: 1, id: 'break', token: 's1-break', title: 'a player on a responsible-gambling BREAK (cooling-off), started through the real limits page',
    how: 'a fresh PLAYER (seed-admin, TZS 50,000, a password) opens /profile/responsible-gambling, presses Pumzika in #break (1 hour, the form default) and confirms in the claret dialog: coolOffAction starts the break, ends the session and lands on /auth/login?cooled=1. The player signs back in through the real sign-in form (auth-service keeps COOLED_OFF out of the sign-in gate on purpose), so every page after is drawn with onBreak = promoSuppressed = true' },
  { n: 2, id: 'exclude', token: 's2-selfexclude', title: 'a SELF-EXCLUDED player, through the real limits page',
    how: 'a second fresh PLAYER presses Jizuie in #exclude (24 hours, the form default) and confirms: selfExcludeAction freezes the wallet, revokes every session and lands on /auth/login?excluded=serving&until=…; the person then tries the real sign-in form once per language (refused at the gate), and every page is tiled as what they now see — signed out, still holding the pass' },
  { n: 3, id: 'name', token: 's3-longname', title: 'a very long display name, set through the real profile form at the longest it allows',
    how: 'a fresh PLAYER renames themselves three times through /profile’s inline name editor (the hero’s Hariri jina button; Enter saves through updateProfileBasicsAction): 40 characters each, the field’s maxLength and the server’s max(40) — a multi-word Swahili name, one unbroken 40-letter word, and 40 CJK characters; three past the limit are typed each time to read the limit the field enforces' },
  { n: 4, id: 'title', token: 's4-longtitle', title: 'the longest seeded market title (Swahili) on /, on /markets, and its market page',
    how: 'seed-markets and seed-real-markets; the longest Swahili title among the live seeded questions is picked at run time from a copy of both catalogues, found on / (lenses closing, pool, new) and /markets (pages 1-8), and opened; as the demo player (TZS 100,000)' },
  { n: 5, id: 'loading', token: 's5-slow3g', title: 'loading states under Slow 3G: /, /positions and /account mid-load, then loaded',
    how: 'the demo player. Cold: a new tab, cache off, CDP Network.emulateNetworkConditions at Slow 3G, the document asked for and polled every ~120 ms; the first frame with a skeleton and no content is captured (else the header with an empty page; else BLOCKED); the throttle lifted, the page loaded and hydrated, tiled. Tap: from a loaded page, the throttle on, the tab (or desktop link) tapped, the most telling frame before the content captured' },
  { n: 6, id: 'notfound', token: 's6-notfound', title: 'not-found inside the journey: /markets/mkt_doesnotexist, /updown/udr_doesnotexist, /does-not-exist',
    how: 'plain document loads of three addresses that do not exist, for a pass-holding guest and for the demo player' },
  { n: 7, id: 'viewports', token: 's7-viewports', title: 'odd viewports: landscape phone 740×360, tablet 768×1024, landscape tablet 1024×768',
    how: 'the demo player; /, /positions, /account and a seeded question, the viewport set to each size' },
  { n: 8, id: 'bigtext', token: 's8-text130', title: 'enlarged text: the root font size at 130%, at 360 and 390',
    how: 'the demo player; after load, document.documentElement.style.fontSize = 130%' },
  { n: 9, id: 'offline', token: 's9-offline', title: 'offline: loaded, the context set offline, a tab tapped, back online, offline and reloaded',
    how: 'the demo player in its own context: / loaded online, BrowserContext.setOffline(true), the Tiketi tab (or desktop link) tapped, back online without a reload, then offline again and reloaded' },
  { n: 10, id: 'empty', token: 's10-tzs0', title: 'an empty wallet (TZS 0) at 320 and 360: the header, home, the Wallet and the deposit page',
    how: '/auth/demo?deposit=0 empties the demo wallet (TZS 0) — the last use of the demo account in this drive, since it ends the session 4-9 used' },
];

const ONLY_RAW = (process.env.KP_ONLY ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const scenarioFor = (raw) => SCENARIOS.find((s) => raw === s.id || raw === String(s.n) || raw === `s${s.n}` || raw === s.token);
{
  const strangers = ONLY_RAW.filter((r) => !scenarioFor(r));
  if (strangers.length > 0) refuseEarly(`KP_ONLY names no scenario: ${strangers.join(', ')} (the scenarios: ${SCENARIOS.map((s) => `${s.n} ${s.id}`).join(', ')})`);
}
const ONLY = new Set(ONLY_RAW.map((r) => scenarioFor(r).id));
const runs = (id) => ONLY.size === 0 || ONLY.has(id);

function minutesFrom(name, fallback) {
  const raw = process.env[name];
  const n = raw === undefined || raw.trim() === '' ? fallback : Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 600) refuseEarly(`${name} must be a number of minutes above 0 and at most 600, not ${JSON.stringify(raw)}`);
  return n;
}
const BUDGET_MIN = minutesFrom('KP_BUDGET_MIN', 150);
const WARM_MIN = minutesFrom('KP_WARM_MIN', 10);

// ── The checkout's own tools, resolved from the working directory ──────────────────────────────────────────────────────
const PASS_HELPERS = join(CWD, 'scripts', 'live', 'journey-pass.mjs');
if (!existsSync(PASS_HELPERS)) refuseEarly(`run this with the repository checkout as the working directory: ${PASS_HELPERS} is missing`);
let chromium = null;
try {
  ({ chromium } = createRequire(join(CWD, 'package.json'))('playwright'));
} catch (e) {
  refuseEarly(`playwright does not resolve from ${CWD} (${msg(e)}): install the checkout's dependencies first`);
}
const { premise, mintStaffPass, demoSession, LOCALE_COOKIE, SESSION_COOKIE } = await import(pathToFileURL(PASS_HELPERS).href);

const OUT = resolve(process.argv[2] || join(tmpdir(), `qa-journey-edges-${Date.now()}`));
{
  const rel = relative(CWD, OUT);
  const outside = rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
  if (!outside) refuseEarly(`the outDir ${OUT} is inside the checkout ${CWD}: name a folder outside it`);
}

const first = await premise(BASE);
if (first.refuse) refuseEarly(first.refuse);
const ROLLOUT = first.health?.simpleJourney?.state ?? null;
const BOOT_UPTIME = Number(first.health?.uptimeSec ?? 0);
const BOOT_AT = Date.now();
mkdirSync(OUT, { recursive: true });

// ── The matrix ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const LOCALES = ['sw', 'en', 'zh'];
const WIDTHS = [360, 390, 1280];
/** Phones 780 tall and desktops 900, as the repo's other journey drives size them. */
const viewport = (width) => ({ width, height: width < 1024 ? 780 : 900 });
/** Scenario 7's viewports. */
const ODD = [{ width: 740, height: 360 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }];
const vpToken = (vp) => `${vp.width}x${vp.height}`;
const LOAD_MS = 120_000;
const HYDRATE_MS = 60_000;
const READY_MS = 10_000;
/** Scenario 5: how long a cold, throttled load and a throttled tap are watched before their mid-load frame is taken anyway. */
const COLD_MAX_MS = 120_000;
const TAP_MAX_MS = 60_000;
/**
 * Chrome DevTools' (and Puppeteer's PredefinedNetworkConditions) "Slow 3G": 500 kbit/s × 0.8 each way = 50,000 bytes/s,
 * and 400 ms × 5 = 2,000 ms of latency per request.
 */
const SLOW_3G = { offline: false, latency: 2000, downloadThroughput: 50_000, uploadThroughput: 50_000 };
const NO_THROTTLE = { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 };
/** The password every fresh player of scenarios 1-3 is seeded with, so the real sign-in form can be used. */
const PASSWORD = 'Edges-2026-pass';

// ── Selectors and storage keys, each from the code that renders or reads it (by symbol, not line) ────────────────────
/** journey-top-bar.tsx, `JourneyTopBar`. */
const BAR = "header[data-testid='journey-top-bar']";
/** journey-tabs.tsx, `JourneyTabs`. */
const RAIL = "nav[data-testid='journey-tabs']";
/** wallet-balance-pill.tsx, `WalletBalanceCaptioned`: the capsule. */
const CAPSULE = "[data-testid='journey-balance']";
/** app/account/page.tsx, `AccountHubPage`. */
const HUB = "[data-testid='journey-account-hub']";
/** wallet-sheet.tsx. */
const WALLET_SHEET = "[data-testid='wallet-sheet']";
/** markets/side-picker.tsx, `SidePicker`: both of its states carry this test id. */
const SIDE_PICKER = "[data-testid='side-picker']";
/** markets/[id]/page.tsx: the bet panel, an aside labelled by its heading. */
const BET_PANEL = 'aside[aria-labelledby]';
/** ui/modal.tsx, `Modal`: a dialog (or alertdialog) while it is open. */
const MODAL = "[aria-modal='true']";
/** first-visit-primer.tsx and channels-panel.tsx: set before any script, so neither lands on a tile by chance. */
const PRIMER_SEEN = '50pick-primer-seen';
const CHANNELS_DONE = '50pick-channels-done';
/** The Next.js dev indicator sits over the rail's first tab on a phone; the repo's tile drives hide it with this line. */
const DEV_OVERLAY_OFF = 'nextjs-portal,[data-nextjs-toast],[data-nextjs-dialog-overlay]{display:none!important}';
const NEXT_ERROR_SIGNS = ['Unhandled Runtime Error', 'Build Error', 'Failed to compile', 'Application error:'];
/** The tab (below 1024) or the desktop link (from 1024) to `path`. */
const tabTo = (path, width) => (width < 1024 ? `${RAIL} a[href='${path}']` : `${BAR} nav.kp-jnav a[href='${path}']`);

/** Words from src/lib/i18n-dict.ts (en, sw and zh blocks), by key. */
const W = {
  /** common.accountMenu: the avatar trigger's name (avatar-menu.tsx). */
  accountMenu: { sw: 'Menyu ya akaunti', en: 'Account menu', zh: '账户菜单' },
  /** common.editDisplayName: the name editor's read-mode button (profile/name-editor.tsx). */
  editName: { sw: 'Hariri jina', en: 'Edit display name', zh: '编辑显示名称' },
  /** common.offline: the OfflineBanner's first words (ui/offline-banner.tsx), and the offline document's h1. */
  offline: { sw: 'Hauko mtandaoni', en: 'You’re offline', zh: '您已离线' },
  /** error.tryAgain: the offline document's retry (lib/offline-document.ts). */
  tryAgain: { sw: 'Jaribu tena', en: 'Try again', zh: '再试一次' },
};

/** Scenario 3's names: 40 characters each, the most profile/name-editor.tsx (maxLength) and actions.ts (max 40) allow. */
const LONG_NAMES = [
  { id: 'words', name: 'Mwanaisha Khamis Abdalla Mwinyimkuu Juma' },
  { id: 'unbroken', name: 'Mwanaishakhamisabdallamwinyimkuujumasali' },
  { id: 'cjk', name: '欧阳慕容司马诸葛上官皇甫东方独孤令狐长孙宇文尉迟公孙轩辕西门南宫夏侯端木百里呼延' },
];
for (const n of LONG_NAMES) {
  if (Array.from(n.name).length !== 40) refuseEarly(`internal: the ${n.id} name is ${Array.from(n.name).length} characters, not 40`);
}

/**
 * The seeded questions' titles, [en, sw, zh?]: market-service.ts `seedDemoMarkets` (no Chinese title: zh reads English)
 * and api/dev-test/seed-real-markets/route.ts (all three). The longest Swahili one that is LIVE is scenario 4's.
 */
const CATALOGUE = [
  ['Will the TZS strengthen against the USD by month-end?', 'Je, TZS itaimarika dhidi ya USD kufikia mwisho wa mwezi?'],
  ['Will the long rains begin in Dar es Salaam before April 15?', 'Je, masika yataanza Dar es Salaam kabla ya Aprili 15?'],
  ['Will Simba SC win the next Kariakoo Derby?', 'Je, Simba SC watashinda Derby ya Kariakoo ijayo?'],
  ['Will the BoT base rate change at the next MPC meeting?', 'Je, kiwango cha riba cha BoT kitabadilika kwenye mkutano ujao wa MPC?'],
  ['Will Bongo Star Search 2026 finale air on schedule?', 'Je, fainali ya Bongo Star Search 2026 itarushwa kwa wakati uliopangwa?'],
  ['Will Bitcoin close above $80,000 at end of week?', 'Je, Bitcoin itafungwa juu ya $80,000 mwishoni mwa wiki?'],
  ['Will Mount Kilimanjaro see snow at the summit by mid-June?', 'Je, Mlima Kilimanjaro utakuwa na theluji kileleni ifikapo katikati ya Juni?'],
  ['Will Yanga SC top the NBC Premier League at the next round?', 'Je, Yanga SC watakuwa juu ya jedwali la NBC ifikapo raundi ijayo?'],
  ['Will Taifa Stars qualify for the next AFCON?', 'Je, Taifa Stars wataitishwa AFCON ijayo?'],
  ['Will Azam FC reach the CAF Confederation Cup quarter-finals?', 'Je, Azam FC watafika robo-fainali ya Kombe la Shirikisho la CAF?'],
  ['Will Manchester City win the Premier League this season?', 'Je, Manchester City watashinda Premier League msimu huu?'],
  ['Will Real Madrid reach the Champions League final?', 'Je, Real Madrid watafika fainali ya Champions League?'],
  ['Will Tanzania win an Olympic medal at the next Summer Games?', 'Je, Tanzania itashinda medali ya Olimpiki kwenye michezo ya majira ya joto ijayo?'],
  ['Will TZS inflation print below 4.0% next NBS release?', 'Je, mfumuko wa bei wa TZS utakuwa chini ya 4.0% kwenye taarifa ijayo ya NBS?'],
  ['Will the BoT keep the policy rate unchanged at the next MPC?', 'Je, BoT itaiacha riba kuu bila mabadiliko kwenye MPC ijayo?'],
  ['Will the BoT FX reserves rise above $5.5 billion next monthly print?', 'Je, akiba ya BoT itazidi $5.5 bilioni kwenye taarifa ya kila mwezi ijayo?'],
  ['Will Tanzania GDP growth print above 5.5% in the next quarterly NBS release?', 'Je, ukuaji wa Pato la Taifa utazidi 5.5% kwenye taarifa ya robo mwaka ijayo ya NBS?'],
  ['Will the next US Fed FOMC keep rates unchanged?', 'Je, FOMC ijayo ya Fed itaiacha riba bila mabadiliko?'],
  ['Will Arusha get measurable rainfall on Saturday?', 'Je, Arusha kutapata mvua inayopimika Jumamosi?'],
  ['Will Mwanza max temperature exceed 32°C this Sunday?', 'Je, joto la juu Mwanza litazidi nyuzi 32 Jumapili?'],
  ['Will Zanzibar see a full sunny day this Friday?', 'Je, Zanzibar itakuwa na siku kamili ya jua Ijumaa hii?'],
  ['Will Dodoma exceed 35°C any day this week?', 'Je, Dodoma itazidi nyuzi 35 siku yoyote wiki hii?'],
  ['Will the masika season end before May 31 in Dar es Salaam?', 'Je, masika yataisha kabla ya Mei 31 Dar es Salaam?'],
  ['Will Bitcoin close above $90,000 next Sunday?', 'Je, Bitcoin itafungwa juu ya $90,000 Jumapili ijayo?'],
  ['Will Ethereum close above $3,500 next Sunday?', 'Je, Ethereum itafungwa juu ya $3,500 Jumapili ijayo?'],
  ['Will Solana close above $200 next Sunday?', 'Je, Solana itafungwa juu ya $200 Jumapili ijayo?'],
  ["Will Bitcoin's 7-day move be positive?", 'Je, mwendo wa Bitcoin wa siku 7 utakuwa chanya?'],
  ['Will Ethereum hit a new 30-day high before month-end?', 'Je, Ethereum itafikia kiwango kipya cha juu cha siku 30 kabla ya mwisho wa mwezi?'],
  ['Will the next Bitcoin daily close be green?', 'Je, kufungwa kwa kila siku kwa Bitcoin kutakuwa kijani kesho?'],
  ['Will the next Diamond Platnumz single chart top 5 on Boomplay TZ?', 'Je, wimbo ujao wa Diamond Platnumz utakuwa kati ya 5 bora kwenye Boomplay TZ?'],
  ['Will the next Wasafi-released video pass 1M views in its first week?', 'Je, video ijayo ya Wasafi itapita milioni 1 wiki ya kwanza?'],
  ['Will Bongo Movie Awards 2026 air on schedule?', 'Je, Tuzo za Filamu za Bongo 2026 zitarushwa kwa wakati?'],
  ['Will the next Marvel film open above $100M domestic box office?', 'Je, filamu ijayo ya Marvel itafungua juu ya $100M ndani ya nchi?'],
  ['Will Sauti Sol release a new single in the next 30 days?', 'Je, Sauti Sol watatoa wimbo mpya katika siku 30 zijazo?'],
  ['Will Hassan Mwakinyo win his next professional bout?', 'Je, Hassan Mwakinyo atashinda mechi yake ijayo ya kulipwa?'],
  ['Will a Tanzanian runner break 28:00 in the next World Athletics 10K?', 'Je, mkimbiaji wa Tanzania atavunja dakika 28:00 kwenye 10K ya World Athletics ijayo?'],
  ['Will the S&P 500 close higher this week?', 'Je, S&P 500 itafungwa juu wiki hii?'],
  ['Will gold close above $2,400/oz next Friday?', 'Je, dhahabu itafungwa juu ya $2,400/oz Ijumaa ijayo?'],
  ['Will Brent crude close above $80/bbl next Monday?', 'Je, Brent itafungwa juu ya $80/bbl Jumatatu ijayo?'],
  ['Will the next Indian Ocean tropical cyclone reach Category 3+?', 'Je, kimbunga kijacho cha Bahari ya Hindi kitafikia daraja la 3 au juu?'],
  ['Simba SC wins the NBC Premier League 2026-27', 'Simba SC yashinda NBC Premier League 2026-27', '辛巴俱乐部赢得2026-27赛季NBC超级联赛'],
  ['Young Africans qualify for the CAF group stage', 'Yanga wafuzu hatua ya makundi CAF', '扬加晋级非洲冠军联赛小组赛'],
  ['USD/TZS closes below 2,650 at end of Q2', 'USD/TZS yafunga chini ya 2,650 mwisho wa robo ya pili', '美元兑坦桑尼亚先令二季度末收于2,650以下'],
  ['Bank of Tanzania holds the rate at the next MPC', 'Benki Kuu yashikilia riba kikao kijacho', '坦桑尼亚央行下次会议维持利率'],
  ['Dar es Salaam rainfall exceeds 200mm in July', 'Mvua Dar es Salaam yazidi 200mm Julai', '达累斯萨拉姆七月降雨超过200毫米'],
  ['Bitcoin closes above $100,000 on 1 August', 'Bitcoin yafunga juu ya $100,000 tarehe 1 Agosti', '比特币8月1日收于10万美元以上'],
];
/** The question scenarios 1, 2 and 7 open: a seed-real-markets one (all three languages), the longest-lived first. */
const QUESTION_PREFERENCE = [
  'Simba SC wins the NBC Premier League 2026-27', 'Young Africans qualify for the CAF group stage', 'Bitcoin closes above $100,000 on 1 August',
  'Bank of Tanzania holds the rate at the next MPC', 'USD/TZS closes below 2,650 at end of Q2', 'Dar es Salaam rainfall exceeds 200mm in July',
];

// ── What each tile should show (the reader holds each tile to it) ─────────────────────────────────────────────────────
const E = {
  break: {
    before: 'The limits page (sw 390) scrolled to Pumzika (#break): the break-length select (1 hour, the default) and the Pumzika button, before anything is pressed.',
    confirm: 'The two-step claret confirm (RgConfirmSubmit / ConfirmDialog): Pumzika as title and confirm, the break description as body, Cancel focused first; nothing behind it pressable.',
    login: 'Where coolOffAction lands, /auth/login?cooled=1: signed out (Ingia and Jisajili in the header, no capsule), a warning panel auth.coolingOff with auth.coolingOffBody (you can still sign in to see your balance and withdraw; betting stops and starts again by itself).',
    header: 'Signed back in mid-break: the capsule with the balance (TZS 50,000, not held) and NO gold + Weka pesa (journeyHeaderState: pill is false while onBreak); below 1024 nothing else on the row but the mark and 18+; from 1024 the four links, language, bell and avatar.',
    home: 'Home for a player on a break: no deposit pill in the header. The board’s YES/NO still render (nothing on / reads the break) — judge whether that is right for a player who asked for a break.',
    wallet: 'The Wallet from the capsule (Pochi / Wallet / 钱包): Available and the balance, Toa pesa only, Weka mipaka. During a break (b88d1a75) there is NO Weka pesa: Toa pesa stands alone at the sheet’s full width, the label and figure above it as usual. Any Weka pesa here is a defect.',
    positions: 'Tiketi zangu for the break player (no tickets: the empty state with its way to the questions); header without the pill; Tiketi lit.',
    account: 'The Akaunti hub: identity card (Edge Break, the phone), the rows, the sign-out row; header without the pill; Akaunti lit.',
    deposit: '/wallet/deposit during the break: the break’s own sentence with its end date and time stands in place of the form (deposit/page.tsx, breakUntil), no amount field; the capsule stays, no pill on this screen.',
    rg: 'The limits page during the break: the warning callout rg.breakActive with the end date and time (East Africa time) at the top, saying it cannot be shortened; the break form still offered below.',
    market: 'A seeded question’s page with its bet panel in view: the YES/NO side picker as for any player (the market page reads no break).',
    yes: 'YES tapped: the conviction dial on YES, the stake within the TZS 50,000 balance, the place button.',
    betConfirm: 'The bet confirmation (BetConfirmModal): the side, the stake, Confirm · TZS … and Cancel.',
    betAttempt: 'What the player sees after confirming a bet during the break: a refusal (market-service refuses a cooled-off player) in the reader’s language, never "Bet placed" and no ticket.',
  },
  exclude: {
    before: 'The limits page (sw 390) scrolled to Jizuie (#exclude): the danger panel, the minimum-period chip, the period select (24 hours, the default) and the claret Jizuie button.',
    confirm: 'The claret two-step confirm for self-exclusion: Jizuie as title and confirm, the exclusion description as body, Cancel focused first.',
    login: 'Where selfExcludeAction lands, /auth/login?excluded=serving&until=YYYY-MM-DD: signed out; the danger panel auth.selfExclusionActive with the until date, and the support contact row.',
    refused: 'A sign-in attempt through the real form with the right password, in this language: refused at the gate, back on /auth/login with the exclusion panel and its date; still signed out (no capsule).',
    header: 'Signed out by the exclusion: the guest header (Ingia, Jisajili), no capsule, no pill.',
    home: 'Home as a signed-out visitor holding the pass.',
    wallet: 'Expected BLOCKED: no capsule to open the Wallet from, because the exclusion signed the person out. A capsule here would be a finding.',
    positions: '/positions signed out: proxy.ts sends it to sign-in (/auth/login?next=…).',
    account: 'The hub for a guest: the prompt (Ingia au jisajili …), no identity card, no sign-out row.',
    deposit: '/wallet/deposit signed out: redirected to /auth/login?next=/wallet/deposit.',
    rg: '/profile/responsible-gambling signed out: redirected to /auth/login?next=/profile/responsible-gambling.',
    market: 'A seeded question signed out: the bet panel offers sign-in to predict (market.signInToPredict) instead of the side picker.',
    yes: 'The bet panel’s first control tapped while signed out: where it leads (the sign-in page, with the question as next).',
  },
  name: {
    hero: '/profile after the save: the 40-character name in the hero (the field’s maxLength 40 and the server’s max(40)), wrapping or truncating inside its column, nothing pushed past the edge; the masked phone under it.',
    hub: 'The hub’s identity card (initials, name, phone) holding the 40-character name: it wraps or ends with an ellipsis inside the card, never past the card or the screen; the phone still readable.',
    menu: 'The 1280 header’s account menu open: the name on one line ending in an ellipsis (truncate), the phone under it, the rows below; the menu inside the screen.',
  },
  title: {
    home: 'The longest seeded Swahili title’s card on / (the featured card or a board row), centred: the whole title readable or clamped with an ellipsis, nothing clipped mid-letter, the YES/NO and figures in place. In zh it reads English (the catalogue has no Chinese title).',
    markets: 'The same question’s card on /markets.',
    page: 'Its market page from the top: the title as the h1 (text-balance), wrapped whole, then the bet panel.',
  },
  loading: {
    'mid-load': 'Document load under Slow 3G (2,000 ms latency, 50 kB/s each way), cache off: the first frame showing the page’s loading UI (loading.tsx: the root SectionLoader on / and /account, TicketsGhost on /positions) before any content; the header should already be drawn.',
    loaded: 'The same page once the throttle is lifted and it has loaded and hydrated: the content where the skeleton stood (the ghosts’ own rule: nothing moves when the data lands).',
    'tap-mid': 'A tap on the tab (or the desktop link) under Slow 3G from an already loaded page: the most telling frame before the content — the target’s skeleton if drawn, else the progress bar or the pending mark; if probe.kind says no loading UI after 1.5 s, the player saw a dead tap.',
  },
  notfound: {
    'markets-mkt_doesnotexist': 'The market not-found page (markets/[id]/not-found.tsx: the 404 code, error.notFoundBody, links to Markets, Home and Help) inside the journey shell: header and tabs, Maswali lit (the /markets section). HTTP 404 expected; a 200 here is a soft 404 (a loading.tsx streams before notFound fires).',
    'updown-udr_doesnotexist': 'An Up & Down round that does not exist: the global not-found page inside the journey shell, Juu/Chini lit. HTTP 404 expected.',
    'does-not-exist': 'The global not-found page (app/not-found.tsx) inside the journey shell, no tab lit, its three recovery links. HTTP 404 expected.',
  },
  viewports: 'The page at an odd viewport: 740×360 (a landscape phone: tabs, a very short screen — the sticky header and the bottom rail must leave room to read), 768×1024 (a tablet: still the tabs), 1024×768 (a landscape tablet: the desktop links from 1024).',
  bigtext: 'Root font size 130% (approximates a player’s larger default text): rem-sized text grows, px-sized text does not; nothing overlaps, clips or runs past the edge, and the four tab labels still fit.',
  offline: {
    offline: 'Loaded online, then offline: the offline notice (role=alert, the kit’s warning NoticeBar) in the flow UNDER the header — Hauko mtandaoni · Baadhi ya vipengele huenda visifanye kazi (in the reader’s language) — covering nothing: probe.notice has it below the header (overlapsHeader false) and every header control on top at its own centre (elementFromPoint).',
    'offline-tap': 'The Tiketi tab (or desktop link — nothing lies on it now; probe.linkOnTop) tapped while offline, 6 s later: the service worker’s offline document at the tapped address — the mark, the wifi-off disc, the title, the hint and the retry in the READER’S language (<html lang> = the cookie’s, though the worker was installed under the first locale: probe.installedUnder) and NO header, capsule, balance, name, sign-in pill or preview strip (probe.offlineDocument).',
    'back-online': 'Back online, no reload by the drive, 6 s later: the offline document has reloaded itself on the browser’s `online` event into the tapped page (the real /positions, hydrated), with no Next.js error dialog and no hydration warning in the console.',
    'offline-reload': 'Offline again and reloaded: the offline document again, in the reader’s language, holding no person — probe.cache reads what the worker keeps for /offline (one cache, all three languages, no capsule, no money, no shell, no Next.js runtime).',
  },
  empty: {
    header: 'The demo player at TZS 0: the capsule reads TZS 0 (zero is shown, never hidden) and the gold + Weka pesa shows; at 320 the + glyph is dropped (below 360) and nothing on the row is clipped.',
    home: 'Home at TZS 0 below the header.',
    wallet: 'The Wallet from the capsule at TZS 0: Available TZS 0, Weka pesa offered first.',
    deposit: '/wallet/deposit at TZS 0: the deposit form; the capsule stays and NO gold pill on this screen (journeyHeaderState).',
  },
};

// ── The plan: every cell, decided before anything runs, so a cell never goes missing silently ──────────────────────────
const R1 = { before: 'rg-before', confirm: 'rg-confirm', login: 'auth-login-cooled', header: 'root-header', home: 'root', wallet: 'root-wallet-sheet', positions: 'positions', account: 'account', deposit: 'wallet-deposit', rg: 'profile-responsible-gambling', market: 'market', yes: 'market-yes', betConfirm: 'market-bet-confirm', betAttempt: 'market-bet-attempt' };
const R2 = { before: 'rg-before', confirm: 'rg-confirm', login: 'auth-login-excluded', refused: 'auth-login-signin-refused', header: 'root-header', home: 'root', wallet: 'root-wallet-sheet', positions: 'positions', account: 'account', deposit: 'wallet-deposit', rg: 'profile-responsible-gambling', market: 'market', yes: 'market-yes' };
const R3 = { hero: 'profile-hero', hub: 'account-hub-id', menu: 'account-avatar-menu' };
const R4 = { home: 'root-card', markets: 'markets-card', page: 'market' };
const R10 = { header: 'root-header', home: 'root', wallet: 'root-wallet-sheet', deposit: 'wallet-deposit' };
const V1 = 'player-on-break';
const V2 = 'excluded';
const S1_GRID = ['login', 'header', 'home', 'wallet', 'positions', 'account', 'deposit', 'rg', 'market', 'yes', 'betConfirm', 'betAttempt'];
const S2_GRID = ['login', 'refused', 'header', 'home', 'wallet', 'positions', 'account', 'deposit', 'rg', 'market', 'yes'];
/** Scenario 5's pages: what says the content has landed, and where its tap starts. */
const LOAD_ROUTES = [
  { path: '/', name: 'root', content: '#main-content h1', from: '/account' },
  { path: '/positions', name: 'positions', content: '#main-content article[data-row-id], #main-content [data-empty-state]', from: '/' },
  { path: '/account', name: 'account', content: HUB, from: '/' },
];
const NOT_FOUND = [
  { path: '/markets/mkt_doesnotexist', name: 'markets-mkt_doesnotexist' },
  { path: '/updown/udr_doesnotexist', name: 'updown-udr_doesnotexist' },
  { path: '/does-not-exist', name: 'does-not-exist' },
];
/** Scenarios 7 and 8: the pages ('market' is resolved once the questions are seeded). */
const PAGE_SET = [{ path: '/', name: 'root' }, { path: '/positions', name: 'positions' }, { path: '/account', name: 'account' }, { path: 'market', name: 'market' }];

const one = (scenario, route, viewer, locale, width, expect) => ({ scenario, route, viewer, locale, width, expect });
const grid = (scenario, route, viewer, expect, { locales = LOCALES, widths = WIDTHS } = {}) =>
  locales.flatMap((locale) => widths.map((width) => one(scenario, route, viewer, locale, width, expect)));

function cellsFor(sc) {
  const T = sc.token;
  switch (sc.id) {
    case 'break':
      return [
        one(T, R1.before, 'player', 'sw', 390, E.break.before),
        one(T, R1.confirm, 'player', 'sw', 390, E.break.confirm),
        ...S1_GRID.flatMap((k) => grid(T, R1[k], V1, E.break[k])),
      ];
    case 'exclude':
      return [
        one(T, R2.before, 'player', 'sw', 390, E.exclude.before),
        one(T, R2.confirm, 'player', 'sw', 390, E.exclude.confirm),
        ...S2_GRID.flatMap((k) => grid(T, R2[k], V2, E.exclude[k])),
      ];
    case 'name':
      return LONG_NAMES.flatMap((n) => [
        ...grid(T, R3.hero, `longname-${n.id}`, E.name.hero, { locales: ['sw'] }),
        ...grid(T, R3.hub, `longname-${n.id}`, E.name.hub),
        ...grid(T, R3.menu, `longname-${n.id}`, E.name.menu, { widths: [1280] }),
      ]);
    case 'title':
      return [...grid(T, R4.home, 'player', E.title.home), ...grid(T, R4.markets, 'player', E.title.markets), ...grid(T, R4.page, 'player', E.title.page)];
    case 'loading':
      return LOAD_ROUTES.flatMap((r) => ['mid-load', 'loaded', 'tap-mid'].flatMap((st) => grid(T, `${r.name}-${st}`, 'player', E.loading[st])));
    case 'notfound':
      return ['guest', 'player'].flatMap((viewer) => NOT_FOUND.flatMap((r) => grid(T, r.name, viewer, E.notfound[r.name])));
    case 'viewports':
      return LOCALES.flatMap((locale) => PAGE_SET.flatMap((p) => ODD.map((vp) => one(T, p.name, 'player', locale, vpToken(vp), E.viewports))));
    case 'bigtext':
      return PAGE_SET.filter((p) => p.name !== 'market').flatMap((p) => grid(T, `${p.name}-text130`, 'player', E.bigtext, { widths: [360, 390] }));
    case 'offline':
      return ['offline', 'offline-tap', 'back-online', 'offline-reload'].flatMap((st) => grid(T, `root-${st}`, 'player', E.offline[st]));
    case 'empty':
      return ['header', 'home', 'wallet', 'deposit'].flatMap((k) => grid(T, R10[k], 'player-tzs0', E.empty[k], { widths: [320, 360] }));
    default:
      return [];
  }
}
const cellKey = (m) => [m.scenario, m.route, m.viewer, m.locale, m.width].join('|');
for (const sc of SCENARIOS) {
  sc.cells = new Map();
  for (const meta of cellsFor(sc)) sc.cells.set(cellKey(meta), { meta, done: false });
  sc.lastReason = null;
  sc.counts = { tiles: 0, blocked: 0, extra: 0 };
}

// ── State ───────────────────────────────────────────────────────────────────────────────────────────────────────────
let browser = null;
let pass = null;
let main = null;
let mainV = null;
let mainReady = null;
let mainWhy = 'not set up yet';
let liveMarkets = [];
/** Scenarios 1, 2 and 7's question: { id, en, sw, zh }. */
let question = null;
/** Scenario 4's question: the longest live Swahili title. */
let longest = null;
let seq = 0;
/** The scenario running now: tile() and blocked() file their lines under it. */
let current = null;
const LOG_FILE = join(OUT, 'qa-journey-edges.json');
let lastFlush = 0;
const LOG = {
  tool: 'qa-journey-edges',
  base: BASE,
  out: OUT,
  cwd: CWD,
  startedAt: new Date(STARTED).toISOString(),
  rollout: ROLLOUT,
  locales: LOCALES,
  widths: WIDTHS,
  plan: SCENARIOS.map((s) => ({ n: s.n, scenario: s.token, title: s.title, how: s.how, plannedTiles: s.cells.size, runs: runs(s.id) })),
  entries: [],
};
/** Rewrites the whole log, at most every 3 s unless `force` (each scenario's end and the summary force it). */
function flushLog(force = false) {
  if (!force && Date.now() - lastFlush < 3_000) return;
  lastFlush = Date.now();
  try {
    writeFileSync(LOG_FILE, JSON.stringify(LOG, null, 2));
  } catch (e) {
    say(`  ! the log could not be written: ${msg(e)}`);
  }
}

// ── Bounds: the budget, the circuit breaker, the guard before every write, the watchdog ──────────────────────────────
let cellsFrom = null;
let failStreak = 0;
let serverGone = false;
function stopReason() {
  if (serverGone) return 'the server stopped answering: three page loads or requests in a row got no answer';
  if (cellsFrom !== null && Date.now() - cellsFrom > BUDGET_MIN * 60_000) return `the ${BUDGET_MIN}-minute budget for the scenarios (KP_BUDGET_MIN) is spent`;
  return null;
}
function noteLoad(answered) {
  if (answered) {
    failStreak = 0;
    return;
  }
  failStreak += 1;
  if (failStreak >= 3) serverGone = true;
}
const sleep = (ms) => new Promise((done) => setTimeout(done, Math.max(0, ms)));
const secs = (t0) => ((Date.now() - t0) / 1000).toFixed(1);
const fold = (s) => String(s ?? '').split(/\s+/).filter(Boolean).join(' ');
const pathOf = (url) => {
  const s = String(url ?? '');
  return s.startsWith(BASE) ? s.slice(BASE.length) || '/' : s;
};

function summary() {
  say(NL + 'qa-journey-edges — per scenario: planned · tiled · blocked · extra');
  let planned = 0;
  let tiles = 0;
  let blockedN = 0;
  for (const sc of SCENARIOS) {
    if (!runs(sc.id)) {
      say(`  §${sc.n} ${sc.token}: not run (KP_ONLY)`);
      continue;
    }
    planned += sc.cells.size;
    tiles += sc.counts.tiles;
    blockedN += sc.counts.blocked;
    say(`  §${sc.n} ${sc.token}: ${sc.cells.size} planned · ${sc.counts.tiles} tiled · ${sc.counts.blocked} blocked · ${sc.counts.extra} extra`);
  }
  const tileEntries = LOG.entries.filter((e) => e.kind === 'tile');
  const flagged = (f) => tileEntries.filter((e) => (e.flags ?? []).some((x) => x === f || x.startsWith(`${f}`))).length;
  say(`  ${tiles} tiles of ${planned} planned · ${blockedN} BLOCKED · flags: overflow ${flagged('overflow')}, page error ${flagged('pageerror')}, console error ${flagged('console-error')}, http>=400 ${flagged('http-')}, not hydrated ${flagged('not-hydrated')}, next error ${flagged('next-error')}`);
  say(`  the log: ${LOG_FILE}`);
  say(`  ${((Date.now() - STARTED) / 60_000).toFixed(1)} min. Every tile is read against its log entry's "expect", in the order of its number.`);
  LOG.finishedAt = new Date().toISOString();
  LOG.totals = { planned, tiles, blocked: blockedN };
  flushLog(true);
}
let finishing = false;
async function finish(code) {
  if (finishing) return;
  finishing = true;
  clearTimeout(watchdog);
  if (browser) await Promise.race([browser.close().catch(() => {}), sleep(10_000)]);
  process.exit(code);
}
async function refuseNow(text) {
  say(`REFUSED — ${text}`);
  LOG.refused = text;
  summary();
  await finish(2);
}
/**
 * Before anything that changes the server: the premise again (local, in memory, a rollout a pass can see), and its
 * uptime held to the one this drive began on, so a restarted server or another one on the port is refused first.
 */
async function guard(what) {
  const p = await premise(BASE);
  if (p.refuse) await refuseNow(`before ${what}: ${p.refuse}`);
  const up = Number(p.health?.uptimeSec);
  const floor = BOOT_UPTIME + Math.floor((Date.now() - BOOT_AT) / 1000) - 30;
  if (!Number.isFinite(up) || up < floor) {
    await refuseNow(`before ${what}: /api/health says the server has been up ${up} s, where the one this drive began on would say ${floor} s or more — it was restarted, or another server answers at ${BASE}; nothing is sent to it`);
  }
}
const watchdog = setTimeout(() => {
  say(`  BLOCKED the drive — the watchdog fired after ${WARM_MIN + BUDGET_MIN + 5} minutes (KP_WARM_MIN + KP_BUDGET_MIN + 5)`);
  for (const sc of SCENARIOS) {
    if (!runs(sc.id)) continue;
    current = sc;
    blockRest('the watchdog ended the drive before this cell');
  }
  summary();
  void finish(3);
}, (WARM_MIN + BUDGET_MIN + 5) * 60_000);

// ── Probes that run IN THE PAGE (real functions, never strings: live/clip.mjs records what a string costs) ───────────
/** The header that exists, the journey's or the classic one, has hydrated. */
const HYDRATED = () => {
  const el = document.querySelector("header[data-testid='journey-top-bar']") || document.querySelector('header.app-topbar');
  return !!el && Object.keys(el).some((k) => k.startsWith('__reactFiber$'));
};
const SEED_STORAGE = (pairs) => {
  try {
    for (const [key, value] of pairs) window.localStorage.setItem(key, value);
  } catch {
    // no storage in this context: nothing to seed
  }
};
const HEADING_PROBE = () => {
  const h = document.querySelector('#main-content h1') || document.querySelector('h1');
  return h ? (h.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160) : null;
};
const NEXT_ERROR_PROBE = (signs) => {
  const text = document.body ? document.body.innerText || '' : '';
  let dialog = !!document.querySelector('[data-nextjs-dialog]');
  for (const portal of Array.from(document.querySelectorAll('nextjs-portal'))) {
    if (portal.shadowRoot && portal.shadowRoot.querySelector('[data-nextjs-dialog]')) dialog = true;
  }
  return { dialog, sign: signs.find((s) => text.includes(s)) || null };
};
/** What the header shows: the facts journeyHeaderState decides, read off the page. */
const HEADER_PROBE = () => {
  const shown = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
  const bar = document.querySelector("header[data-testid='journey-top-bar']");
  const cap = document.querySelector("[data-testid='journey-balance']");
  const rail = document.querySelector("nav[data-testid='journey-tabs']");
  const lit = Array.from(document.querySelectorAll("nav[data-testid='journey-tabs'] [aria-current], header[data-testid='journey-top-bar'] nav.kp-jnav [aria-current]"))
    .map((a) => `${a.getAttribute('href')}=${a.getAttribute('aria-current')}`);
  return {
    journey: !!bar,
    classic: !!document.querySelector('header.app-topbar:not([data-testid])'),
    capsule: cap ? { label: cap.getAttribute('aria-label'), held: cap.hasAttribute('data-held'), masked: cap.hasAttribute('data-masked'), text: (cap.textContent || '').replace(/\s+/g, ' ').trim() } : null,
    goldPill: !!document.querySelector("[data-testid='journey-deposit']"),
    signInPills: bar ? bar.querySelectorAll('a.kp-jhdr__auth').length : 0,
    railShown: shown(rail),
    desktopLinksShown: shown(bar ? bar.querySelector('nav.kp-jnav') : null),
    lit,
    previewMarker: !!document.querySelector("[data-testid='journey-preview-marker']"),
    sessionEndedNotice: !!document.querySelector("[data-testid='session-ended-notice']"),
    openDialogs: Array.from(document.querySelectorAll("[aria-modal='true']")).filter(shown).length,
    rootFontSize: getComputedStyle(document.documentElement).fontSize,
  };
};
/** Alerts, statuses and toasts on screen, with their words (the offline banner, a refusal, a saved toast). */
const LIVE_PROBE = () => {
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
  };
  return Array.from(document.querySelectorAll("[role='alert'], [role='status'], [aria-live='assertive'], [aria-live='polite']"))
    .filter((el) => shown(el) && (el.textContent || '').trim() !== '' && el.getAttribute('aria-label') !== 'Loading')
    .map((el) => ({ role: el.getAttribute('role') || `live-${el.getAttribute('aria-live')}`, text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 220) }))
    .slice(0, 8);
};
/**
 * §9 · What the service worker keeps for /offline, read from INSIDE the page (the Cache API is the page's too): every
 * cache by name, and for each copy its size, the languages it carries and any sign of a person or of the app's runtime.
 * ⭐ This is the privacy finding measured at its source: before R4-G the copy was the shell rendered for the demo player
 * (its capsule, "Salio TZS 100,000"); after it, one cache (50pick-v5), three languages, no capsule, no money, no shell.
 */
const SW_CACHE_PROBE = async () => {
  if (!('caches' in window)) return { unavailable: true };
  const names = await caches.keys();
  const copies = {};
  for (const n of names) {
    const c = await caches.open(n);
    const r = await c.match('/offline');
    if (!r) continue;
    const t = await r.text();
    copies[n] = {
      bytes: t.length,
      langs: Array.from(new Set(Array.from(t.matchAll(/class="l" lang="([a-z]+)"/g), (m) => m[1]))),
      capsule: t.includes('journey-balance'),
      money: /TZS\s*[\d,]+/.test(t),
      shell: /kp-jhdr|app-topbar|journey-top-bar|journey-tabs|journey-preview-marker/.test(t),
      nextRuntime: t.includes('/_next/') || t.includes('__next_f'),
    };
  }
  return { names, copies };
};
/** §9 · The offline document as SHOWN: its language and its words as painted, and anything of a person on screen. */
const OFFLINE_DOC_PROBE = () => {
  const shown = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
  const painted = (el) => (el ? Array.from(el.querySelectorAll('.l')).filter(shown).map((s) => (s.textContent || '').trim()).join(' | ') : null);
  const text = document.body ? document.body.innerText || '' : '';
  return {
    isOfflineDocument: !!document.querySelector('main.kp-off'),
    lang: document.documentElement.getAttribute('lang'),
    title: document.title,
    h1: painted(document.querySelector('h1')),
    retry: painted(document.getElementById('kp-offline-retry')),
    shownLanguages: Array.from(new Set(Array.from(document.querySelectorAll('.l')).filter(shown).map((s) => s.getAttribute('lang')))),
    capsule: !!document.querySelector("[data-testid='journey-balance']"),
    money: /TZS\s*[\d,]+/.test(text),
    header: !!document.querySelector('header'),
    previewMarker: !!document.querySelector("[data-testid='journey-preview-marker']"),
    scripts: document.scripts.length,
    externalScripts: Array.from(document.scripts).filter((s) => !!s.src).length,
  };
};
/**
 * §9 · The offline notice on a live page against the header it used to lie on: both boxes, whether they overlap, and —
 * the 1280 BLOCKED tap's cause — what `elementFromPoint` finds at the centre of each header control: the control
 * itself, or something lying on it (before R4-G, the fixed banner: "the tap failed: locator.click: Timeout 10000ms").
 */
const NOTICE_PROBE = ({ header, controls }) => {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) };
  };
  const name = (el) => (el ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.getAttribute('data-testid') ? `[data-testid=${el.getAttribute('data-testid')}]` : ''}${el.getAttribute('role') ? `[role=${el.getAttribute('role')}]` : ''}` : null);
  const at = (sel) => {
    const el = document.querySelector(sel);
    if (!el || el.getClientRects().length === 0) return null;
    const r = el.getBoundingClientRect();
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);
    const top = document.elementFromPoint(x, y);
    return { sel, x, y, onTop: !!top && (top === el || el.contains(top)), top: name(top) };
  };
  const notice = document.querySelector("[data-testid='offline-notice']") || Array.from(document.querySelectorAll("[role='alert']")).find((el) => /offline|mtandaoni|离线/i.test(el.textContent || '')) || null;
  const bar = document.querySelector(header) || document.querySelector('header.app-topbar');
  const n = box(notice);
  const h = box(bar);
  return {
    notice: n,
    header: h,
    noticeRole: notice ? notice.getAttribute('role') : null,
    noticePosition: notice ? getComputedStyle(notice).position : null,
    overlapsHeader: !!(n && h && n.top < h.bottom - 0.5 && n.bottom > h.top + 0.5),
    controls: controls.map(at).filter(Boolean),
  };
};
/**
 * THE OVERFLOW PROBE. The document's own scrollWidth against clientWidth (a backstop only: html and body clip, so it
 * reads 0 over a severed control — live/clip.mjs, E-190), then every visible element whose box passes the viewport's
 * right (or left) edge: one that an ancestor scrolls sideways is reachable (counted, not an offender); one an ancestor
 * inside the screen clips is not painted past the edge (counted); a fixed drawer parked wholly off-screen is counted;
 * everything else is an OFFENDER (outermost only). Controls past the edge with no sideways-scrolling ancestor are
 * listed apart, as live/clip.mjs's CLIP_PROBE lists them (the Needle and a closed <details> exempt, as there).
 */
const OVERFLOW_PROBE = () => {
  const de = document.documentElement;
  const vw = de.clientWidth || window.innerWidth;
  const res = {
    vw,
    innerWidth: window.innerWidth,
    docScrollWidth: de.scrollWidth,
    docClientWidth: de.clientWidth,
    bodyScrollWidth: document.body ? document.body.scrollWidth : null,
    docOverflowPx: de.scrollWidth - de.clientWidth,
    offenderCount: 0,
    offenders: [],
    reachableByScroll: 0,
    clippedByAncestor: 0,
    offscreenFixed: 0,
    controlsPastEdge: [],
    ok: true,
  };
  if (!document.body) return res;
  const describe = (el) => {
    const bits = [];
    let e = el;
    for (let i = 0; i < 3 && e && e !== document.body; i += 1) {
      const id = e.id ? `#${e.id}` : '';
      const tid = e.getAttribute && e.getAttribute('data-testid') ? `[data-testid=${e.getAttribute('data-testid')}]` : '';
      const raw = typeof e.className === 'string' ? e.className.trim() : '';
      const cls = raw ? `.${raw.split(/\s+/).slice(0, 2).join('.')}` : '';
      bits.unshift(`${e.tagName.toLowerCase()}${id}${tid}${cls}`);
      e = e.parentElement;
    }
    return bits.join(' > ');
  };
  const isControl = (el) => el.matches("button, a[href], input, select, textarea, [role='button'], [role='menuitem'], [role='tab'], [role='slider']");
  const scrollsSideways = (el) => {
    let a = el.parentElement;
    while (a && a !== de) {
      const cs = getComputedStyle(a);
      if (/(auto|scroll)/.test(cs.overflowX) && a.scrollWidth > a.clientWidth + 1) return true;
      a = a.parentElement;
    }
    return false;
  };
  const clippedInside = (el) => {
    let a = el.parentElement;
    while (a && a !== document.body && a !== de) {
      const cs = getComputedStyle(a);
      if (/(hidden|clip)/.test(cs.overflowX)) {
        const ar = a.getBoundingClientRect();
        if (ar.right <= vw + 1 && ar.left >= -1) return true;
      }
      a = a.parentElement;
    }
    return false;
  };
  const inFixed = (el) => {
    let a = el;
    while (a && a !== de) {
      if (getComputedStyle(a).position === 'fixed') return true;
      a = a.parentElement;
    }
    return false;
  };
  const handled = new Set();
  const underHandled = (el) => {
    let a = el.parentElement;
    while (a) {
      if (handled.has(a)) return true;
      a = a.parentElement;
    }
    return false;
  };
  for (const el of Array.from(document.body.querySelectorAll('*'))) {
    const tag = el.tagName;
    if (el instanceof SVGElement && tag.toLowerCase() !== 'svg') continue;
    if (['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'LINK', 'META', 'BR'].includes(tag)) continue;
    const shut = el.closest('details:not([open])');
    if (shut && !el.closest('summary')) continue;
    if (el.closest('#needle-root')) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    if (r.right <= vw + 1 && r.left >= -1) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    if (cs.clip && cs.clip !== 'auto') continue;
    const control = isControl(el);
    const scroll = scrollsSideways(el);
    if (control && !scroll) {
      const name = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 32);
      if (res.controlsPastEdge.length < 12) res.controlsPastEdge.push(`${tag.toLowerCase()}[${name}] ${Math.round(r.left)}..${Math.round(r.right)} > vw ${vw}`);
    }
    if (underHandled(el)) continue;
    handled.add(el);
    if (scroll) {
      res.reachableByScroll += 1;
      continue;
    }
    if (clippedInside(el)) {
      res.clippedByAncestor += 1;
      continue;
    }
    if (inFixed(el) && (r.left >= vw || r.right <= 0)) {
      res.offscreenFixed += 1;
      continue;
    }
    res.offenderCount += 1;
    if (res.offenders.length < 15) {
      res.offenders.push({
        el: describe(el),
        left: Math.round(r.left),
        right: Math.round(r.right),
        width: Math.round(r.width),
        control,
        ariaHidden: !!el.closest("[aria-hidden='true']"),
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
      });
    }
  }
  res.ok = res.docOverflowPx <= 0 && res.offenderCount === 0 && res.controlsPastEdge.length === 0;
  return res;
};
/** The Wallet: its name, its money doors, a held wallet's notice (as qa-journey-shell reads it). */
const WALLET_PROBE = () => {
  const sheet = document.querySelector("[data-testid='wallet-sheet']");
  const d = sheet ? sheet.closest("[role='dialog']") || sheet : null;
  if (!d) return null;
  const door = (id) => {
    const el = d.querySelector(`[data-testid='${id}']`);
    return el ? { href: el.getAttribute('href'), text: (el.textContent || '').replace(/\s+/g, ' ').trim() } : null;
  };
  const held = d.querySelector('.kp-wsheet__held');
  return {
    label: d.getAttribute('aria-label'),
    figure: (sheet.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160),
    deposit: door('wallet-sheet-deposit'),
    withdraw: door('wallet-sheet-withdraw'),
    held: held ? (held.textContent || '').replace(/\s+/g, ' ').trim() : null,
  };
};
/** The bet panel as drawn: the side picker's buttons, or what a signed-out reader is offered. */
const BETPANEL_PROBE = () => {
  const panel = document.querySelector('aside[aria-labelledby]');
  const picker = document.querySelector("[data-testid='side-picker']");
  return {
    panel: !!panel,
    sidePicker: picker ? Array.from(picker.querySelectorAll('button')).map((b) => (b.getAttribute('aria-label') || b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)).slice(0, 6) : null,
    dial: !!(picker && picker.querySelector("[role='slider']")),
    links: panel ? Array.from(panel.querySelectorAll('a[href]')).map((a) => a.getAttribute('href')).slice(0, 6) : [],
  };
};
/** The hub's identity card with a long name: does the name stay inside the card? */
const HUBID_PROBE = () => {
  const id = document.querySelector('.kp-hub__id');
  if (!id) return null;
  const name = id.querySelector('.kp-hub__name');
  const r = id.getBoundingClientRect();
  const n = name ? name.getBoundingClientRect() : null;
  const cs = name ? getComputedStyle(name) : null;
  return {
    name: name ? name.textContent : null,
    card: [Math.round(r.left), Math.round(r.right)],
    nameBox: n ? [Math.round(n.left), Math.round(n.right), Math.round(n.height)] : null,
    nameInsideCard: n ? n.right <= r.right + 0.5 : null,
    nameCutInside: name ? name.scrollWidth > name.clientWidth + 1 : null,
    textOverflow: cs ? cs.textOverflow : null,
    whiteSpace: cs ? cs.whiteSpace : null,
  };
};
/** The avatar menu's header: the name line and whether it is cut. */
const MENU_PROBE = () => {
  const menu = document.querySelector("[role='menu']");
  if (!menu) return null;
  const p = menu.querySelector('p');
  const r = menu.getBoundingClientRect();
  return {
    name: p ? p.textContent : null,
    nameTruncated: p ? p.scrollWidth > p.clientWidth + 1 : null,
    menuBox: [Math.round(r.left), Math.round(r.right), Math.round(r.top), Math.round(r.bottom)],
    insideScreen: r.left >= 0 && r.right <= document.documentElement.clientWidth,
  };
};
/** Scenario 5: what the page shows right now, as a loading reader sees it. */
const LOAD_PROBE = ({ content, target }) => {
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0 || r.bottom <= 0 || r.top >= window.innerHeight) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05;
  };
  const count = (sel) => Array.from(document.querySelectorAll(sel)).filter(shown).length;
  const links = Array.from(document.querySelectorAll("link[rel='stylesheet']"));
  return {
    path: location.pathname,
    readyState: document.readyState,
    cssReady: links.length > 0 ? links.every((l) => !!l.sheet) : document.styleSheets.length > 0,
    header: !!document.querySelector("header[data-testid='journey-top-bar'], div.kp-jhdr"),
    skeleton: count(".kp-shimmer-track, [role='status'][aria-label='Loading']"),
    pending: count('[data-link-pending]') + count("div.fixed[class*='z-[2000]']"),
    content: location.pathname === target && count(content) > 0,
  };
};

// ── Pages ───────────────────────────────────────────────────────────────────────────────────────────────────────────
/** React 19's DEV-only measure error (qa-journey-shell files it apart): a production build has no such measure. */
const DEV_MEASURE = new RegExp(`^Failed to execute 'measure' on 'Performance': '` + String.fromCharCode(0x200b) + `?[A-Za-z0-9_$]+' cannot have a negative time stamp[.]$`);
const freshErrs = () => ({ page: [], console: [], devOnly: [], failed: [] });
/**
 * The dev server's own traffic, which is not the page's and is left out of `failedRequests` BY NAME: the HMR socket
 * and its hot updates, the error overlay's stack-frame and source-map lookups, webpack's dev runtime files. ⛔ Nothing
 * else is filtered — every other subresource that answers ≥ 400 or fails is the page's, and is logged.
 */
const DEV_NOISE = [/\/_next\/webpack-hmr\b/, /\.hot-update\.(?:json|js)\b/, /\/__nextjs_original-stack-frames?\b/, /\/__nextjs_source-map\b/, /\/_next\/static\/webpack\//];
const devNoise = (url) => DEV_NOISE.some((re) => re.test(String(url)));
/** The page's own document request (the navigation in its main frame): left out of `failedRequests`, its status is the tile's. */
const isOwnDocument = (req, page) => {
  try {
    return req.isNavigationRequest() && req.frame() === page.mainFrame();
  } catch {
    return false;
  }
};

function watch(v, page) {
  page.on('pageerror', (e) => {
    const line = firstLine(e);
    if (line.includes('ResizeObserver loop')) return;
    (DEV_MEASURE.test(line) ? v.errs.devOnly : v.errs.page).push(line.slice(0, 300));
  });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text().split(NL)[0].slice(0, 300);
    (DEV_MEASURE.test(t) ? v.errs.devOnly : v.errs.console).push(t);
  });
  page.on('response', (r) => {
    try {
      const req = r.request();
      if (req.frame() !== page.mainFrame()) return;
      const h = req.headers();
      if (req.isNavigationRequest()) v.nav = { kind: 'document', url: pathOf(r.url()), status: r.status() };
      else if (h.rsc === '1' && !h['next-router-prefetch']) v.nav = { kind: 'rsc', url: pathOf(r.url()), status: r.status() };
      else if (h['next-action']) v.nav = { kind: 'server-action', url: pathOf(r.url()), status: r.status() };
    } catch {
      // a worker's request has no frame: not the page's own
    }
  });
  // ⭐ EVERY FAILED SUBRESOURCE, BY URL (the console's "Failed to load resource: … 404" never names one — tiles 378 380
  // 381 399): an answer ≥ 400, or a request that never got one, with its type; the document itself and DEV_NOISE aside.
  page.on('response', (r) => {
    try {
      if (r.status() < 400) return;
      const req = r.request();
      if (isOwnDocument(req, page) || devNoise(r.url())) return;
      v.errs.failed.push({ url: pathOf(r.url()), status: r.status(), type: req.resourceType() });
    } catch {
      // a response whose request is gone: nothing to record
    }
  });
  page.on('requestfailed', (req) => {
    try {
      if (isOwnDocument(req, page) || devNoise(req.url())) return;
      v.errs.failed.push({ url: pathOf(req.url()), status: null, type: req.resourceType(), failure: req.failure()?.errorText ?? null });
    } catch {
      // nothing to record
    }
  });
}

/** Two frames and a beat. Never throws: an error page or a navigation in flight just skips the frames. */
async function settle(page, ms = 300) {
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true))))).catch(() => {});
  await page.waitForTimeout(ms).catch(() => {});
}
async function resize(page, vp) {
  const now = page.viewportSize();
  if (!now || now.width !== vp.width || now.height !== vp.height) await page.setViewportSize(vp);
  await settle(page, 350);
}
const toTop = (page) => page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })).catch(() => {});
const intoView = (page, sel, block = 'center') => page.evaluate(([s, b]) => {
  const el = document.querySelector(s);
  if (el) el.scrollIntoView({ block: b, behavior: 'instant' });
  return !!el;
}, [sel, block]).catch(() => false);

async function newViewer(name, cookies, { vp = viewport(390) } = {}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  try {
    if (cookies.length > 0) await ctx.addCookies(cookies);
    await ctx.addInitScript(SEED_STORAGE, [[PRIMER_SEEN, '1'], [CHANNELS_DONE, '1']]);
    const page = await ctx.newPage();
    const v = { name, ctx, page, locale: null, errs: freshErrs(), nav: null, last: null };
    watch(v, page);
    return v;
  } catch (e) {
    await ctx.close().catch(() => {});
    throw e;
  }
}
/** Another tab of the same viewer (its own errors and responses, the same cookies). */
function tabOf(v, page, name) {
  const t = { name, ctx: v.ctx, page, locale: v.locale, errs: freshErrs(), nav: null, last: null };
  watch(t, page);
  return t;
}
const closeViewer = (v) => (v ? v.ctx.close().catch(() => {}) : Promise.resolve());
async function setLocale(v, locale) {
  if (v.locale === locale) return;
  await v.ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }]);
  v.locale = locale;
}

/**
 * Opens `path` for `v` in `locale` at `vp`: to its load event, the header hydrated (unless `hydrate` is false), fonts
 * in, the dev indicator hidden, `ready` attached, settled. Records what it asked for, the status and the redirects.
 */
async function open(v, path, { locale, vp, ready = '#main-content h1', hydrate = true }) {
  const why = stopReason();
  if (why) return { ok: false, reason: why };
  try {
    await setLocale(v, locale);
    await v.page.setViewportSize(vp);
    v.nav = null;
    const res = await v.page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: LOAD_MS });
    noteLoad(true);
    const redirects = [];
    let r = res ? res.request().redirectedFrom() : null;
    while (r) {
      redirects.unshift(pathOf(r.url()));
      r = r.redirectedFrom();
    }
    v.last = { requested: path, status: res ? res.status() : null, redirects, hydrated: null };
  } catch (e) {
    noteLoad(false);
    v.last = { requested: path, status: null, redirects: [], hydrated: null, error: msg(e) };
    return { ok: false, reason: `${path} did not open: ${msg(e)}` };
  }
  if (hydrate) v.last.hydrated = await v.page.waitForFunction(HYDRATED, null, { timeout: HYDRATE_MS }).then(() => true, () => false);
  await v.page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {});
  await v.page.addStyleTag({ content: DEV_OVERLAY_OFF }).catch(() => {});
  if (ready) await v.page.waitForSelector(ready, { state: 'attached', timeout: READY_MS }).catch(() => {});
  await settle(v.page, 400);
  return { ok: true, status: v.last.status };
}
/** After a navigation the page made itself (a form's redirect): hydrated, fonts, dev indicator hidden, settled. */
async function afterLanding(v, requested) {
  await v.page.waitForLoadState('load', { timeout: LOAD_MS }).catch(() => {});
  const hydrated = await v.page.waitForFunction(HYDRATED, null, { timeout: HYDRATE_MS }).then(() => true, () => false);
  await v.page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {});
  await v.page.addStyleTag({ content: DEV_OVERLAY_OFF }).catch(() => {});
  await settle(v.page, 500);
  v.last = { requested, status: v.nav?.status ?? null, redirects: [], hydrated };
}

// ── Lines: tiles, BLOCKED, notes ─────────────────────────────────────────────────────────────────────────────────────
/** The planned cell for these tokens in the running scenario, or an extra one. */
function cell(route, viewer, locale, width) {
  const key = [current.token, route, viewer, locale, width].join('|');
  const c = current.cells.get(key);
  return c ? c.meta : { scenario: current.token, route, viewer, locale, width, expect: null, extra: true };
}
function markDone(meta) {
  const c = current.cells.get(cellKey(meta));
  if (c) c.done = true;
  return !!c;
}
function note(text) {
  LOG.entries.push({ kind: 'note', scenario: current?.token ?? '§0', text });
  flushLog();
  say(`  · ${text}`);
}
function blocked(meta, reason) {
  const planned = markDone(meta);
  if (current) current.counts.blocked += 1;
  LOG.entries.push({ kind: 'BLOCKED', scenario: meta.scenario, route: meta.route, viewer: meta.viewer, locale: meta.locale, width: meta.width, planned, expect: meta.expect ?? null, reason });
  flushLog();
  say(`  BLOCKED ${meta.scenario}/${meta.route}/${meta.viewer}/${meta.locale}/${meta.width} — ${reason}`);
}
/** Every planned cell of the running scenario not yet tiled or blocked that `pred` names, BLOCKED with `reason`. */
function blockWhere(pred, reason) {
  for (const c of current.cells.values()) {
    if (!c.done && pred(c.meta)) blocked(c.meta, reason);
  }
}
const blockRest = (reason) => blockWhere(() => true, reason);
/** The cells of `routes` in `locale` (every locale when null) for `viewer` (every viewer when null). */
const blockRoutes = (routes, locale, reason, viewer = null) =>
  blockWhere((m) => routes.includes(m.route) && (!locale || m.locale === locale) && (!viewer || m.viewer === viewer), reason);

/** The viewport's top band under the journey header (and the preview marker under it), for a header tile. */
async function headerClip(page) {
  const r = await page.evaluate((sel) => {
    const h = document.querySelector(sel);
    if (!h) return null;
    const m = document.querySelector("[data-testid='journey-preview-marker']");
    return Math.max(h.getBoundingClientRect().bottom, m ? m.getBoundingClientRect().bottom : 0);
  }, BAR).catch(() => null);
  const vp = page.viewportSize();
  if (!r || !vp) return null;
  return { x: 0, y: 0, width: vp.width, height: Math.min(vp.height, Math.ceil(r) + 16) };
}

async function readFacts(page) {
  const safe = (fn, arg) => page.evaluate(fn, arg).catch((e) => ({ unreadable: msg(e) }));
  return {
    url: pathOf(page.url()),
    viewport: page.viewportSize(),
    lang: await safe(() => document.documentElement.getAttribute('lang')),
    title: await page.title().catch(() => null),
    h1: await safe(HEADING_PROBE),
    header: await safe(HEADER_PROBE),
    live: await safe(LIVE_PROBE),
    nextError: await safe(NEXT_ERROR_PROBE, NEXT_ERROR_SIGNS),
    overflow: await safe(OVERFLOW_PROBE),
    /** The service worker's offline document (lib/offline-document.ts) is on screen: it has no header, by design. */
    offlineDocument: await safe(() => !!document.querySelector('main.kp-off')),
  };
}

/**
 * THE POINTER LEAVES WHAT IT PRESSED — the repo's own tiles harness's technique, as it is written there
 * (scripts/qa-journey-shell.mjs, `focusStep` and the hub's Matokeo row; `test:visual-pass-r3c` §10): `mouse.move` to
 * x 2 at half the viewport's height, the page's left gutter, off every control. Read from the page's real viewport, so
 * an odd viewport (740×360) parks at its own middle.
 */
const parkPointer = (page) => page.mouse.move(2, Math.round((page.viewportSize()?.height ?? viewport(390).height) / 2)).catch(() => {});

/**
 * ONE TILE: the facts read, then the VIEWPORT written (or `clip`, or a `buffer` already captured through CDP), named
 * <seq>--<scenario>--<route>--<viewer>--<locale>--<width>.png, and its log entry. A screenshot that fails is BLOCKED.
 */
async function tile(v, meta, { clip = null, buffer = null, probe = null, noteText = null, page = null } = {}) {
  const p = page ?? v.page;
  const why = stopReason();
  if (why && !buffer) return blocked(meta, why);
  if (!buffer) {
    // ⭐ BEFORE EVERY SHOT the pointer is parked (`parkPointer`), then a beat longer than the hover transitions
    // (motion.css: --t-flick 90 ms, --t-quick 140 ms, --t-base 220 ms) and two frames, so nothing is shot in a hover
    // state it was left in: rows lit (140 141 142 166 190), the featured card's border and watermark (160 184), a
    // Sign up button 2px raised (151 175), a 是 button glowing (184), a rail label after a tap (455 459).
    await parkPointer(p);
    await settle(p, 260);
  }
  const facts = await readFacts(p);
  const errs = v.errs;
  v.errs = freshErrs();
  seq += 1;
  const file = `${String(seq).padStart(3, '0')}--${meta.scenario}--${meta.route}--${meta.viewer}--${meta.locale}--${meta.width}.png`;
  try {
    if (buffer) writeFileSync(join(OUT, file), buffer);
    else await p.screenshot({ path: join(OUT, file), fullPage: false, caret: 'initial', timeout: 30_000, ...(clip ? { clip } : {}) });
  } catch (e) {
    return blocked(meta, `the screenshot failed: ${msg(e)}`);
  }
  const httpStatus = v.last?.status ?? null;
  const flags = [];
  const ov = facts.overflow;
  if (ov && !ov.unreadable && ov.ok === false) flags.push('overflow');
  if (errs.page.length > 0) flags.push('pageerror');
  if (errs.console.length > 0) flags.push('console-error');
  if (httpStatus !== null && httpStatus >= 400) flags.push(`http-${httpStatus}`);
  if (v.last?.hydrated === false) flags.push('not-hydrated');
  if (typeof facts.lang === 'string' && !facts.lang.toLowerCase().startsWith(meta.locale)) flags.push('wrong-lang');
  if (facts.nextError && (facts.nextError.dialog || facts.nextError.sign)) flags.push('next-error');
  // The offline document has no header BY DESIGN (it holds no person): its tiles are judged by `offline-doc-shell`.
  // …and a classic reader's cell ('player-classic', §9's classic half) has the classic bar by design.
  if (facts.header && !facts.header.unreadable && facts.header.journey === false && facts.offlineDocument !== true && !String(meta.viewer).includes('classic')) flags.push('no-journey-header');
  if (facts.offlineDocument === true && facts.header && !facts.header.unreadable && (facts.header.journey || facts.header.classic || facts.header.capsule)) flags.push('offline-doc-shell');
  if (errs.failed.length > 0) flags.push('failed-request');
  const planned = markDone(meta);
  current.counts.tiles += 1;
  if (!planned) current.counts.extra += 1;
  LOG.entries.push({
    kind: 'tile',
    seq,
    file,
    scenario: meta.scenario,
    route: meta.route,
    viewer: meta.viewer,
    locale: meta.locale,
    width: meta.width,
    planned,
    expect: meta.expect ?? null,
    shot: buffer ? 'mid-load frame through CDP Page.captureScreenshot' : clip ? `viewport top band ${clip.width}x${clip.height}` : 'viewport',
    requested: v.last?.requested ?? null,
    httpStatus,
    redirects: v.last?.redirects ?? [],
    lastResponse: v.nav,
    hydrated: v.last?.hydrated ?? null,
    ...facts,
    pageErrors: errs.page,
    consoleErrors: errs.console,
    devOnlyErrors: errs.devOnly,
    /** Every subresource that answered ≥ 400 or failed since the last tile: url, status (null = no answer), type. */
    failedRequests: errs.failed,
    probe,
    note: noteText,
    flags,
  });
  flushLog();
  say(`  TILE ${file}${flags.length ? `  [${flags.join(' ')}]` : ''}`);
  return true;
}

/** The capsule opens the Wallet; tiled with its probe, then closed. No capsule, or no Wallet, is BLOCKED. */
async function walletTile(v, meta) {
  const page = v.page;
  if ((await page.locator(CAPSULE).count()) === 0) {
    const h = await page.evaluate(HEADER_PROBE).catch(() => null);
    return blocked(meta, `no capsule in the header to open the Wallet from (the header shows ${h ? `${h.signInPills} sign-in pill(s), gold pill ${h.goldPill}` : 'nothing readable'})`);
  }
  try {
    await page.locator(CAPSULE).first().click({ timeout: 15_000 });
    await page.locator(WALLET_SHEET).first().waitFor({ timeout: 15_000 });
    await settle(page, 600);
  } catch (e) {
    return blocked(meta, `the capsule opened no Wallet: ${msg(e)}`);
  }
  await tile(v, meta, { probe: { wallet: await page.evaluate(WALLET_PROBE).catch(() => null) } });
  await closeDialog(page);
}
async function closeDialog(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForFunction(() => document.querySelectorAll("[aria-modal='true']").length === 0, null, { timeout: 10_000 }).catch(() => {});
  await page.evaluate(() => {
    const a = document.activeElement;
    if (a && a !== document.body && typeof a.blur === 'function') a.blur();
  }).catch(() => {});
  await settle(page, 250);
}
async function capture(cdp) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  return Buffer.from(data, 'base64');
}

// ── Fixtures, through dev-test doors that exist, each behind the guard ────────────────────────────────────────────────
async function post(path, data, cookies = []) {
  await guard(`POST ${path}`);
  const ctx = await browser.newContext();
  try {
    if (cookies.length > 0) await ctx.addCookies(cookies);
    const res = await ctx.request.post(`${BASE}${path}`, { data, timeout: 300_000 });
    noteLoad(true);
    return { ok: res.ok(), status: res.status(), body: await res.json().catch(() => null), error: null };
  } catch (e) {
    noteLoad(false);
    return { ok: false, status: 0, body: null, error: msg(e) };
  } finally {
    await ctx.close().catch(() => {});
  }
}
/** A fresh account through POST /api/dev-test/seed-admin (role PLAYER here), which also sets its session cookie. */
async function seededSession(data, what) {
  await guard(`seeding ${what}`);
  const ctx = await browser.newContext();
  try {
    let res = null;
    try {
      res = await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data, timeout: 240_000 });
      noteLoad(true);
    } catch (e) {
      noteLoad(false);
      throw e;
    }
    if (!res.ok()) throw new Error(`/api/dev-test/seed-admin answered ${res.status()}`);
    const session = (await ctx.cookies(BASE)).find((c) => c.name === SESSION_COOKIE);
    if (!session) throw new Error('/api/dev-test/seed-admin set no session cookie');
    return session;
  } finally {
    await ctx.close().catch(() => {});
  }
}
async function demo(query, balance, what) {
  await guard(`signing the demo player in: ${what}`);
  return demoSession(browser, BASE, { query, balance });
}
const freshPhone = (prefix) => `+2557${prefix}${String(Date.now()).slice(-7)}`;

/** The demo player for scenarios 4-9, set up once: /auth/demo resets its wallet to TZS 100,000. */
async function ensureMain() {
  if (mainReady !== null) return mainReady;
  mainReady = false;
  try {
    main = await demo('', null, 'the demo player (TZS 100,000) for scenarios 4-9');
  } catch (e) {
    mainWhy = `the demo player could not be signed in: ${msg(e)}`;
    return false;
  }
  try {
    mainV = await newViewer('player', [pass, main]);
  } catch (e) {
    mainWhy = `no browser context for the demo player: ${msg(e)}`;
    return false;
  }
  mainReady = true;
  return true;
}

/**
 * The real sign-in form (#identifier, #password, its submit), as qa-journey-shell's G1 drives it. `want` 'in' waits for
 * a capsule; 'refused' waits for the address to change. Answers where it landed and whether a capsule shows.
 */
async function formSignIn(v, phone, locale, want) {
  const r = await open(v, '/auth/login', { locale, vp: v.page.viewportSize() ?? viewport(390), ready: '#identifier' });
  if (!r.ok) return { ok: false, why: r.reason };
  const page = v.page;
  try {
    await post('/api/dev-test/reset-rate-limits', {});
    await page.waitForSelector('#identifier', { state: 'visible', timeout: 60_000 });
    await page.locator('#identifier').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type(phone.slice(4));
    await page.locator('#password').fill(PASSWORD);
    await guard('signing in through the real form');
    const before = page.url();
    await page.locator("form:has(#password) button[type='submit']").first().click({ timeout: 15_000 });
    if (want === 'in') {
      await page.waitForFunction((sel) => !location.pathname.startsWith('/auth') && !!document.querySelector(sel), CAPSULE, { timeout: 90_000 }).catch(() => {});
    } else {
      await page.waitForFunction((b) => location.href !== b, before, { timeout: 60_000 }).catch(() => {});
    }
    await afterLanding(v, `the sign-in form (${locale})`);
    return { ok: true, where: pathOf(page.url()), signedIn: (await page.locator(CAPSULE).count()) > 0 };
  } catch (e) {
    return { ok: false, why: msg(e) };
  }
}

/**
 * The limits page's two-step RG action, as a player presses it: the section's own button (the form's direct child
 * button; the Select's trigger sits inside a div), the claret confirm, then the confirm pressed. Tiles the page before
 * and the confirm open (sw 390); answers where the server action's redirect landed.
 */
async function rgAction(v, sectionId, routes, what) {
  const rg = '/profile/responsible-gambling';
  const r = await open(v, rg, { locale: 'sw', vp: viewport(390) });
  if (!r.ok) return { ok: false, why: `the limits page did not open: ${r.reason}` };
  const page = v.page;
  await intoView(page, `#${sectionId}`, 'start');
  await page.evaluate(() => window.scrollBy(0, -90)).catch(() => {});
  await settle(page, 300);
  await tile(v, cell(routes.before, 'player', 'sw', 390), { probe: { section: `#${sectionId}` } });
  try {
    // rg-confirm-submit.tsx: ConfirmDialog draws its trigger as the form's own child; the last button is the fallback.
    const direct = page.locator(`#${sectionId} form > button`);
    const trigger = (await direct.count()) > 0 ? direct.first() : page.locator(`#${sectionId} form button`).last();
    await trigger.click({ timeout: 15_000 });
    const confirm = page.locator(`${MODAL} form button[type='submit']`).first();
    await confirm.waitFor({ state: 'visible', timeout: 15_000 });
    await settle(page, 600);
    await tile(v, cell(routes.confirm, 'player', 'sw', 390), { probe: { dialog: await page.evaluate(() => {
      const d = document.querySelector("[aria-modal='true']");
      return d ? { role: d.getAttribute('role'), label: d.getAttribute('aria-label'), focused: (document.activeElement && document.activeElement.textContent || '').trim().slice(0, 40) } : null;
    }).catch(() => null) } });
    await guard(what);
    await confirm.click({ timeout: 15_000 });
  } catch (e) {
    return { ok: false, why: `the ${sectionId} form could not be pressed and confirmed: ${msg(e)}` };
  }
  const landed = await page.waitForURL((u) => u.pathname.startsWith('/auth/login'), { timeout: 90_000 }).then(() => true, () => false);
  if (!landed) return { ok: false, why: `the confirm did not land on /auth/login (the page is at ${pathOf(page.url())})` };
  await afterLanding(v, `the ${sectionId} confirm's redirect`);
  return { ok: true, landing: pathOf(page.url()) };
}

/** Tiles the page `v` stands on at every width (resizing the same document), top first. */
async function widthsHere(v, route, viewer, locale, widths = WIDTHS, opts = {}) {
  for (const width of widths) {
    await resize(v.page, viewport(width));
    await toTop(v.page);
    await tile(v, cell(route, viewer, locale, width), opts);
  }
}
/** Opens `path` and tiles it at every width; a page that does not open BLOCKS its cells for this language. */
async function pageAtWidths(v, path, route, viewer, locale, { widths = WIDTHS, ready } = {}) {
  const r = await open(v, path, { locale, vp: viewport(widths[0]), ...(ready !== undefined ? { ready } : {}) });
  if (!r.ok) return blockRoutes([route], locale, r.reason, viewer);
  await widthsHere(v, route, viewer, locale, widths);
}

/** The first YES control: the side picker's first button, else (signed out) the bet panel's first link. */
async function tapYes(page) {
  const picker = page.locator(`${SIDE_PICKER} button`).first();
  if ((await picker.count()) > 0) {
    const text = fold(await picker.getAttribute('aria-label').catch(() => '') || await picker.textContent().catch(() => ''));
    await picker.click({ timeout: 10_000 });
    const dial = await page.waitForSelector(`${SIDE_PICKER} [role='slider']`, { state: 'visible', timeout: 15_000 }).then(() => true, () => false);
    await intoView(page, SIDE_PICKER);
    await settle(page, 600);
    return { ok: true, control: `the side picker's first button (${text})`, dial };
  }
  const link = page.locator(`${BET_PANEL} a[href]`).first();
  if ((await link.count()) > 0) {
    const href = await link.getAttribute('href');
    const from = page.url();
    await link.click({ timeout: 10_000 });
    await page.waitForFunction((b) => location.href !== b, from, { timeout: 30_000 }).catch(() => {});
    await page.waitForLoadState('load', { timeout: LOAD_MS }).catch(() => {});
    await page.waitForFunction(HYDRATED, null, { timeout: HYDRATE_MS }).catch(() => {});
    await settle(page, 800);
    return { ok: true, control: `the bet panel's first link (${href})`, landed: pathOf(page.url()) };
  }
  return { ok: false, why: 'the market page drew neither a side picker nor a link in its bet panel' };
}
/** With YES picked: the dial's place button (arrow keys move the dial if it is still neutral), pressed, its confirm open. */
async function prepareBet(page) {
  const placeSel = `${SIDE_PICKER} button.btn-yes:not([disabled]), ${SIDE_PICKER} button.btn-no:not([disabled])`;
  let moved = 'not needed';
  if ((await page.locator(placeSel).count()) === 0) {
    const slider = page.locator(`${SIDE_PICKER} [role='slider']`).first();
    if ((await slider.count()) === 0) return { ok: false, why: 'no dial to set a stake on after YES' };
    await slider.focus().catch(() => {});
    for (let i = 0; i < 3; i += 1) await page.keyboard.press('ArrowRight');
    await settle(page, 400);
    moved = 'ArrowRight ×3';
    if ((await page.locator(placeSel).count()) === 0) {
      for (let i = 0; i < 6; i += 1) await page.keyboard.press('ArrowLeft');
      await settle(page, 400);
      moved = 'ArrowRight ×3, then ArrowLeft ×6';
    }
    if ((await page.locator(placeSel).count()) === 0) return { ok: false, why: `the dial's place button stayed disabled after YES (${moved}): the dial reads neutral, or the stake is above the balance` };
  }
  const place = page.locator(placeSel).first();
  const label = await place.getAttribute('aria-label').catch(() => null);
  await place.click({ timeout: 10_000 });
  const opened = await page.waitForSelector(`${MODAL} button.btn-gold`, { state: 'visible', timeout: 10_000 }).then(() => true, () => false);
  if (!opened) return { ok: false, why: `pressing "${label}" opened no confirmation` };
  await settle(page, 500);
  return { ok: true, place: label, moved };
}

/**
 * A question's page at one width, a fresh load: the bet panel in view; YES tapped; and with `bet`, a bet prepared,
 * its confirm tiled, confirmed (behind the guard) and what follows tiled. Missing steps are BLOCKED by name.
 */
async function marketFlow(v, { locale, width, viewer, routes, bet }) {
  const steps = [routes.market, routes.yes, ...(bet ? [routes.betConfirm, routes.betAttempt] : [])];
  const meta = (route) => cell(route, viewer, locale, width);
  if (!question) {
    for (const s of steps) blocked(meta(s), 'none of seed-real-markets’ questions is live, so there is no question to open');
    return;
  }
  const r = await open(v, `/markets/${question.id}`, { locale, vp: viewport(width) });
  if (!r.ok) {
    for (const s of steps) blocked(meta(s), r.reason);
    return;
  }
  const page = v.page;
  await intoView(page, BET_PANEL);
  await settle(page, 300);
  await tile(v, meta(routes.market), { probe: { question: question.en, betPanel: await page.evaluate(BETPANEL_PROBE).catch(() => null) } });
  let yes = null;
  try {
    yes = await tapYes(page);
  } catch (e) {
    yes = { ok: false, why: `the tap failed: ${msg(e)}` };
  }
  if (!yes.ok) {
    for (const s of steps.slice(1)) blocked(meta(s), `no YES to tap: ${yes.why}`);
    return;
  }
  v.last = { ...(v.last ?? {}), requested: `/markets/${question.id} → ${yes.control}` };
  await tile(v, meta(routes.yes), { probe: { ...yes, betPanel: await page.evaluate(BETPANEL_PROBE).catch(() => null) } });
  if (!bet) return;
  let prepared = null;
  try {
    prepared = await prepareBet(page);
  } catch (e) {
    prepared = { ok: false, why: msg(e) };
  }
  if (!prepared.ok) {
    blocked(meta(routes.betConfirm), prepared.why);
    blocked(meta(routes.betAttempt), `no confirmation to press: ${prepared.why}`);
    return;
  }
  await tile(v, meta(routes.betConfirm), { probe: prepared });
  await guard('a bet attempt during the break');
  try {
    await page.locator(`${MODAL} button.btn-gold`).first().click({ timeout: 10_000 });
  } catch (e) {
    blocked(meta(routes.betAttempt), `the confirmation's Confirm could not be pressed: ${msg(e)}`);
    await closeDialog(page);
    return;
  }
  // The confirm is disabled while the bet is in flight (bet-confirm-modal.tsx, `pending`): wait it out, then a beat
  // for the answer (a refusal toast, an inline error, or a success card) to be drawn.
  await page.waitForFunction(() => !document.querySelector("[aria-modal='true'] button.btn-gold[disabled]"), null, { timeout: 20_000 }).catch(() => {});
  await sleep(3_000);
  await settle(page, 400);
  v.last = { ...(v.last ?? {}), requested: `/markets/${question.id} → a bet confirmed during the break` };
  await tile(v, meta(routes.betAttempt), { probe: { lastResponse: v.nav, live: await page.evaluate(LIVE_PROBE).catch(() => null) } });
  await closeDialog(page);
}

// ── §0 · the warm-up, the pass, the questions ──────────────────────────────────────────────────────────────────────────
const DEV_ROUTES = ['/api/dev-test/seed-admin', '/api/dev-test/seed-wallet', '/api/dev-test/seed-real-markets', '/api/dev-test/seed-markets'];
const WARM_PATHS = ['/', '/account', '/positions', '/markets', '/wallet/deposit', '/profile', '/profile/responsible-gambling', '/auth/login', '/does-not-exist', '/markets/mkt_doesnotexist', '/updown/udr_doesnotexist', '/offline'];

async function setup() {
  say(NL + '§0 · the warm-up, a staff preview pass, the seeded questions');
  current = { token: '§0', cells: new Map(), counts: { tiles: 0, blocked: 0, extra: 0 } };
  const warmFrom = Date.now();
  const warmLeft = () => warmFrom + WARM_MIN * 60_000 - Date.now();
  for (const route of DEV_ROUTES) {
    if (warmLeft() <= 0) break;
    const t0 = Date.now();
    const ctx = await browser.newContext();
    const status = await ctx.request.get(`${BASE}${route}`, { timeout: 300_000, maxRedirects: 0 }).then((r) => r.status(), (e) => `no answer (${msg(e)})`);
    await ctx.close().catch(() => {});
    say(`  · warm ${route}: ${status} in ${secs(t0)} s (a POST-only route answers 405 and runs nothing)`);
  }
  try {
    await guard('minting the staff preview pass');
    pass = await mintStaffPass(browser, BASE);
    note('a SUPPORT officer turned their preview on at /admin/journey: the staff preview pass is in hand');
  } catch (e) {
    note(`NO staff preview pass: ${msg(e)} — every scenario is BLOCKED`);
    return;
  }
  const cat = await post('/api/dev-test/seed-markets', {});
  note(`seed-markets: HTTP ${cat.status}, ${cat.body?.live ?? '?'} live questions${cat.ok ? '' : ` (${cat.error ?? cat.body?.error ?? ''})`}`);
  const rm = await post('/api/dev-test/seed-real-markets', {});
  liveMarkets = Array.isArray(rm.body?.live) ? rm.body.live : [];
  note(`seed-real-markets: HTTP ${rm.status}, ${liveMarkets.length} live questions in all${rm.ok ? '' : ` (${rm.error ?? rm.body?.error ?? ''})`}`);
  const idOf = new Map(liveMarkets.map((m) => [m.title, m.id]));
  const row = (en) => CATALOGUE.find((c) => c[0] === en);
  for (const en of QUESTION_PREFERENCE) {
    if (idOf.has(en)) {
      const c = row(en);
      question = { id: idOf.get(en), en, sw: c[1], zh: c[2] ?? en };
      break;
    }
  }
  note(question ? `the question scenarios 1, 2 and 7 open: ${question.id} — ${question.en}` : 'no seed-real-markets question is live: the market cells of scenarios 1, 2 and 7 will be BLOCKED');
  const candidates = CATALOGUE.filter((c) => idOf.has(c[0])).sort((a, b) => Array.from(b[1]).length - Array.from(a[1]).length);
  if (candidates.length > 0) {
    const c = candidates[0];
    longest = { id: idOf.get(c[0]), en: c[0], sw: c[1], zh: c[2] ?? null, swLength: Array.from(c[1]).length };
    note(`scenario 4's question, the longest live Swahili title (${longest.swLength} characters): ${longest.id} — "${longest.sw}" (en "${longest.en}"${longest.zh ? '' : '; no Chinese title, so zh reads English'})`);
  } else {
    note('none of the catalogue’s questions is live: scenario 4 will be BLOCKED');
  }
  let warmSession = null;
  try {
    warmSession = await demo('', null, 'a throwaway session, so the warm-up compiles the signed-in pages rather than their redirects');
  } catch (e) {
    say(`  · no demo session for the warm-up (${msg(e)}): the signed-in pages compile when a cell first opens them`);
  }
  const ctx = await browser.newContext();
  try {
    await ctx.addCookies([pass, ...(warmSession ? [warmSession] : []), { name: LOCALE_COOKIE, value: 'sw', url: BASE }]);
    const paths = [...WARM_PATHS, ...(question ? [`/markets/${question.id}`] : []), ...(longest ? [`/markets/${longest.id}`] : [])];
    for (let i = 0; i < paths.length; i += 1) {
      if (warmLeft() <= 0) {
        say(`  · the warm-up stopped at its ${WARM_MIN} minutes: ${paths.slice(i).join(' ')} compile when first opened`);
        break;
      }
      const t0 = Date.now();
      const res = await ctx.request.get(`${BASE}${paths[i]}`, { timeout: 240_000, maxRedirects: 0 }).catch(() => null);
      say(`  · warm ${paths[i]}: ${res ? res.status() : 'no answer'} in ${secs(t0)} s`);
    }
  } finally {
    await ctx.close().catch(() => {});
  }
}

// ── §1 · a break (cooling-off) ────────────────────────────────────────────────────────────────────────────────────────
async function breakScenario(sc) {
  const phone = freshPhone('5');
  let session = null;
  try {
    session = await seededSession({ role: 'PLAYER', phone, name: 'Edge Break', balance: 50_000, password: PASSWORD }, 'the break player');
  } catch (e) {
    sc.lastReason = `no player for the break (seed-admin): ${msg(e)}`;
    return;
  }
  note(`the break player: ${phone} ("Edge Break", TZS 50,000), a fresh account — not the demo account, whose break would outlive this drive and colour scenarios 4-10`);
  const v = await newViewer('break', [pass, session]);
  try {
    const act = await rgAction(v, 'break', R1, 'starting a break through the limits page');
    if (!act.ok) {
      sc.lastReason = act.why;
      return;
    }
    note(`the break's confirm landed on ${act.landing}`);
    // Where the break leaves the player: the sw tiles are the real landing, resized; en and zh open the same address.
    for (const locale of LOCALES) {
      if (locale !== 'sw') {
        const r = await open(v, act.landing, { locale, vp: viewport(WIDTHS[0]) });
        if (!r.ok) {
          blockRoutes([R1.login], locale, r.reason);
          continue;
        }
      }
      await widthsHere(v, R1.login, V1, locale);
    }
    // Back in, through the real form: a cooling-off player may sign in.
    const back = await formSignIn(v, phone, 'sw', 'in');
    note(`signing back in through the form: ${JSON.stringify(back)}`);
    if (!back.ok || !back.signedIn) {
      sc.lastReason = `the break player could not sign back in through the sign-in form (${back.why ?? `landed on ${back.where} with no capsule`}), so the journey during a break could not be drawn`;
      return;
    }
    for (const locale of LOCALES) {
      const r = await open(v, '/', { locale, vp: viewport(WIDTHS[0]) });
      if (!r.ok) {
        blockRoutes([R1.header, R1.home, R1.wallet], locale, r.reason);
      } else {
        for (const width of WIDTHS) {
          await resize(v.page, viewport(width));
          await toTop(v.page);
          await tile(v, cell(R1.header, V1, locale, width), { clip: await headerClip(v.page) });
          await tile(v, cell(R1.home, V1, locale, width));
          await walletTile(v, cell(R1.wallet, V1, locale, width));
        }
      }
      await pageAtWidths(v, '/positions', R1.positions, V1, locale);
      await pageAtWidths(v, '/account', R1.account, V1, locale, { ready: HUB });
      await pageAtWidths(v, '/wallet/deposit', R1.deposit, V1, locale);
      await pageAtWidths(v, '/profile/responsible-gambling', R1.rg, V1, locale);
      for (const width of WIDTHS) {
        await marketFlow(v, { locale, width, viewer: V1, routes: R1, bet: true });
      }
    }
  } finally {
    await closeViewer(v);
  }
}

// ── §2 · self-exclusion ─────────────────────────────────────────────────────────────────────────────────────────────
async function excludeScenario(sc) {
  const phone = freshPhone('4');
  let session = null;
  try {
    session = await seededSession({ role: 'PLAYER', phone, name: 'Edge Exclude', balance: 50_000, password: PASSWORD }, 'the self-excluding player');
  } catch (e) {
    sc.lastReason = `no player for the self-exclusion (seed-admin): ${msg(e)}`;
    return;
  }
  note(`the self-excluding player: ${phone} ("Edge Exclude"), a fresh account — the demo account must never be excluded (it is not lifted by itself, and /auth/demo would sign an excluded account in through createSession, a state no real person reaches)`);
  const v = await newViewer('exclude', [pass, session]);
  try {
    const act = await rgAction(v, 'exclude', R2, 'self-excluding through the limits page');
    if (!act.ok) {
      sc.lastReason = act.why;
      return;
    }
    note(`the exclusion's confirm landed on ${act.landing}`);
    for (const locale of LOCALES) {
      if (locale !== 'sw') {
        const r = await open(v, act.landing, { locale, vp: viewport(WIDTHS[0]) });
        if (!r.ok) {
          blockRoutes([R2.login], locale, r.reason);
          continue;
        }
      }
      await widthsHere(v, R2.login, V2, locale);
    }
    // The person tries to come back in, through the real form, in each language.
    for (const locale of LOCALES) {
      await v.page.setViewportSize(viewport(WIDTHS[0])).catch(() => {});
      const tried = await formSignIn(v, phone, locale, 'refused');
      if (!tried.ok) {
        blockRoutes([R2.refused], locale, `the sign-in form could not be tried: ${tried.why}`);
        continue;
      }
      note(`${locale}: the sign-in attempt landed on ${tried.where}, signed in: ${tried.signedIn}${tried.signedIn ? ' — A FINDING: a self-excluded account was let in' : ''}`);
      await widthsHere(v, R2.refused, V2, locale, WIDTHS, { probe: tried });
    }
    for (const locale of LOCALES) {
      const r = await open(v, '/', { locale, vp: viewport(WIDTHS[0]) });
      if (!r.ok) {
        blockRoutes([R2.header, R2.home, R2.wallet], locale, r.reason);
      } else {
        for (const width of WIDTHS) {
          await resize(v.page, viewport(width));
          await toTop(v.page);
          await tile(v, cell(R2.header, V2, locale, width), { clip: await headerClip(v.page) });
          await tile(v, cell(R2.home, V2, locale, width));
          await walletTile(v, cell(R2.wallet, V2, locale, width));
        }
      }
      await pageAtWidths(v, '/positions', R2.positions, V2, locale);
      await pageAtWidths(v, '/account', R2.account, V2, locale, { ready: HUB });
      await pageAtWidths(v, '/wallet/deposit', R2.deposit, V2, locale);
      await pageAtWidths(v, '/profile/responsible-gambling', R2.rg, V2, locale);
      for (const width of WIDTHS) {
        await marketFlow(v, { locale, width, viewer: V2, routes: R2, bet: false });
      }
    }
  } finally {
    await closeViewer(v);
  }
}

// ── §3 · a very long display name ─────────────────────────────────────────────────────────────────────────────────────
/** Renames through /profile's inline editor: three characters past the limit are typed, to read the limit it enforces. */
async function rename(v, name) {
  const page = v.page;
  await page.getByRole('button', { name: W.editName.sw, exact: true }).first().click({ timeout: 15_000 });
  const input = page.locator("input[maxlength='40']").first();
  await input.waitFor({ state: 'visible', timeout: 15_000 });
  await input.press('Control+A');
  await page.keyboard.type(`${name}XYZ`, { delay: 4 });
  const typed = await input.inputValue();
  let note2 = 'the field stopped the typing at its maxLength';
  if (Array.from(typed).length > 40) {
    note2 = `the field took ${Array.from(typed).length} characters (maxLength not enforced on typing); cut back to the 40`;
    await input.press('Control+A');
    await page.keyboard.type(name, { delay: 4 });
  }
  const accepted = await input.inputValue();
  await guard('saving a display name through the profile form');
  await input.press('Enter');
  const saved = await page.waitForFunction(([label, want]) => Array.from(document.querySelectorAll(`button[aria-label='${label}']`)).some((b) => (b.textContent || '').includes(want)),
    [W.editName.sw, accepted], { timeout: 30_000 }).then(() => true, () => false);
  await settle(page, 600);
  return { typedLength: Array.from(typed).length, accepted, acceptedLength: Array.from(accepted).length, saved, note: note2, live: await page.evaluate(LIVE_PROBE).catch(() => null) };
}

async function nameScenario(sc) {
  const phone = freshPhone('3');
  let session = null;
  try {
    session = await seededSession({ role: 'PLAYER', phone, name: 'Edge Name', balance: 50_000, password: PASSWORD }, 'the long-name player');
  } catch (e) {
    sc.lastReason = `no player for the long names (seed-admin): ${msg(e)}`;
    return;
  }
  note(`the long-name player: ${phone}, a fresh account (renaming the demo account would outlive this drive)`);
  const v = await newViewer('long name', [pass, session]);
  try {
    for (const n of LONG_NAMES) {
      const viewer = `longname-${n.id}`;
      const mine = (m) => m.viewer === viewer;
      const r = await open(v, '/profile', { locale: 'sw', vp: viewport(390) });
      if (!r.ok) {
        blockWhere(mine, r.reason);
        continue;
      }
      let res = null;
      try {
        res = await rename(v, n.name);
      } catch (e) {
        res = { saved: false, error: msg(e) };
      }
      note(`${n.id}: ${JSON.stringify({ typedLength: res.typedLength, acceptedLength: res.acceptedLength, saved: res.saved, note: res.note, error: res.error })}`);
      if (!res.saved) {
        blockWhere(mine, `the profile form did not save the ${n.id} name: ${res.error ?? JSON.stringify(res.live ?? [])}`);
        continue;
      }
      v.last = { ...(v.last ?? {}), requested: `/profile → renamed to the ${n.id} name` };
      await widthsHere(v, R3.hero, viewer, 'sw', WIDTHS, { probe: res });
      for (const locale of LOCALES) {
        const h = await open(v, '/account', { locale, vp: viewport(WIDTHS[0]), ready: HUB });
        if (!h.ok) {
          blockRoutes([R3.hub, R3.menu], locale, h.reason, viewer);
          continue;
        }
        for (const width of WIDTHS) {
          await resize(v.page, viewport(width));
          await toTop(v.page);
          await tile(v, cell(R3.hub, viewer, locale, width), { probe: await v.page.evaluate(HUBID_PROBE).catch(() => null) });
        }
        const trigger = v.page.locator(`${BAR} button[aria-label='${W.accountMenu[locale]}']`).first();
        const menuMeta = cell(R3.menu, viewer, locale, 1280);
        try {
          await trigger.click({ timeout: 10_000 });
          await v.page.waitForSelector("[role='menu']", { state: 'visible', timeout: 10_000 });
          await settle(v.page, 500);
          await tile(v, menuMeta, { probe: await v.page.evaluate(MENU_PROBE).catch(() => null) });
        } catch (e) {
          blocked(menuMeta, `the 1280 header's account menu (${W.accountMenu[locale]}) did not open: ${msg(e)}`);
        }
        await closeDialog(v.page);
      }
    }
  } finally {
    await closeViewer(v);
  }
}

// ── §4 · the longest seeded title ─────────────────────────────────────────────────────────────────────────────────────
async function titleScenario(sc) {
  if (!(await ensureMain())) {
    sc.lastReason = mainWhy;
    return;
  }
  if (!longest) {
    sc.lastReason = 'none of the seeded catalogue’s questions is live, so there is no longest title to show';
    return;
  }
  const link = `#main-content a[href^='/markets/${longest.id}']`;
  const v = mainV;
  for (const locale of LOCALES) {
    // On /: the default lens (closing), then pool and new.
    let foundOn = null;
    for (const lens of ['/', '/?sort=pool', '/?sort=new']) {
      const r = await open(v, lens, { locale, vp: viewport(WIDTHS[0]) });
      if (r.ok && (await v.page.locator(link).count()) > 0) {
        foundOn = lens;
        break;
      }
    }
    if (foundOn) {
      for (const width of WIDTHS) {
        await resize(v.page, viewport(width));
        await intoView(v.page, link);
        await settle(v.page, 300);
        await tile(v, cell(R4.home, 'player', locale, width), { probe: { question: longest, foundOn } });
      }
    } else {
      blockRoutes([R4.home], locale, `the question is not on / under any lens (closing, pool, new — the featured card and 7 board rows each); the longest title / does show is tiled instead as root-card-longest-shown`);
      const r = await open(v, '/', { locale, vp: viewport(WIDTHS[0]) });
      if (r.ok) {
        const href = await v.page.evaluate(() => {
          let best = null;
          for (const a of Array.from(document.querySelectorAll("#main-content a[href^='/markets/']"))) {
            const t = (a.textContent || '').replace(/\s+/g, ' ').trim();
            if (!best || t.length > best.t.length) best = { href: a.getAttribute('href'), t };
          }
          return best ? best.href : null;
        }).catch(() => null);
        if (href) {
          for (const width of WIDTHS) {
            await resize(v.page, viewport(width));
            await intoView(v.page, `#main-content a[href='${href}']`);
            await settle(v.page, 300);
            await tile(v, cell('root-card-longest-shown', 'player', locale, width), { probe: { href } });
          }
        }
      }
    }
    // On /markets: page by page.
    let foundPage = 0;
    let openWhy = null;
    for (let pageNo = 1; pageNo <= 8 && !foundPage; pageNo += 1) {
      const r = await open(v, pageNo === 1 ? '/markets' : `/markets?page=${pageNo}`, { locale, vp: viewport(WIDTHS[0]) });
      if (!r.ok) {
        openWhy = r.reason;
        break;
      }
      if ((await v.page.locator(link).count()) > 0) foundPage = pageNo;
    }
    if (foundPage) {
      for (const width of WIDTHS) {
        await resize(v.page, viewport(width));
        await intoView(v.page, link);
        await settle(v.page, 300);
        await tile(v, cell(R4.markets, 'player', locale, width), { probe: { question: longest, page: foundPage } });
      }
    } else {
      blockRoutes([R4.markets], locale, openWhy ?? 'the question is not on /markets pages 1-8');
    }
    await pageAtWidths(v, `/markets/${longest.id}`, R4.page, 'player', locale);
  }
}

// ── §5 · loading under Slow 3G ───────────────────────────────────────────────────────────────────────────────────────
/**
 * A cold document load, throttled and uncached, in a new tab: the first frame with the skeleton and no content
 * (else the header over an empty page) captured through CDP; then the throttle lifted and the loaded page tiled.
 */
async function coldCycle(route, locale, width) {
  const midMeta = cell(`${route.name}-mid-load`, 'player', locale, width);
  const loadedMeta = cell(`${route.name}-loaded`, 'player', locale, width);
  const why = stopReason();
  if (why) {
    blocked(midMeta, why);
    blocked(loadedMeta, why);
    return;
  }
  await setLocale(mainV, locale);
  const page = await mainV.ctx.newPage();
  const tv = tabOf(mainV, page, 'player cold tab');
  let cdp = null;
  try {
    await page.setViewportSize(viewport(width));
    cdp = await mainV.ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', SLOW_3G);
    const t0 = Date.now();
    const times = {};
    let docStatus = null;
    const nav = page.goto(`${BASE}${route.path}`, { waitUntil: 'commit', timeout: 180_000 }).then((res) => {
      docStatus = res ? res.status() : null;
      times.commit = Date.now() - t0;
      noteLoad(true);
      return true;
    }, (e) => {
      times.error = msg(e);
      noteLoad(false);
      return false;
    });
    let best = null;
    let fallback = null;
    let last = null;
    while (Date.now() - t0 < COLD_MAX_MS && times.error === undefined) {
      const st = await page.evaluate(LOAD_PROBE, { content: route.content, target: route.path }).catch(() => null);
      if (st) {
        last = st;
        if (st.cssReady && times.css === undefined) times.css = Date.now() - t0;
        if (st.content) {
          times.content = Date.now() - t0;
          break;
        }
        if (st.cssReady && st.skeleton > 0) {
          times.skeleton = Date.now() - t0;
          best = { buf: await capture(cdp), st, kind: 'skeleton' };
          break;
        }
        if (st.cssReady && st.header && !fallback) {
          times.header = Date.now() - t0;
          fallback = { buf: await capture(cdp), st, kind: 'the header drawn, no skeleton yet and no content' };
        }
      }
      await sleep(120);
    }
    if (!best && times.content === undefined && times.error === undefined) {
      best = { buf: await capture(cdp), st: last, kind: `still loading ${Math.round(COLD_MAX_MS / 1000)} s in (no content yet)` };
    }
    const pick = best ?? fallback;
    tv.last = { requested: `${route.path} (Slow 3G, cache off)`, status: docStatus, redirects: [], hydrated: false };
    if (times.error !== undefined) {
      blocked(midMeta, `the throttled document did not load: ${times.error}`);
    } else if (pick) {
      await tile(tv, midMeta, { buffer: pick.buf, page, probe: { kind: pick.kind, at: pick.st, timingsMs: { ...times }, throttle: SLOW_3G, cache: 'disabled' } });
    } else {
      blocked(midMeta, `no mid-load frame: the content arrived ${times.content} ms in, before any frame showed a skeleton or the header over an empty page (timings ${JSON.stringify(times)})`);
    }
    await cdp.send('Network.emulateNetworkConditions', NO_THROTTLE).catch(() => {});
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: false }).catch(() => {});
    if (!(await nav)) {
      blocked(loadedMeta, `the document did not load: ${times.error}`);
      return;
    }
    await page.waitForLoadState('load', { timeout: LOAD_MS }).catch(() => {});
    const hydrated = await page.waitForFunction(HYDRATED, null, { timeout: HYDRATE_MS }).then(() => true, () => false);
    await page.waitForSelector(route.content, { state: 'visible', timeout: 30_000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {});
    await page.addStyleTag({ content: DEV_OVERLAY_OFF }).catch(() => {});
    await toTop(page);
    await settle(page, 500);
    tv.last = { requested: route.path, status: docStatus, redirects: [], hydrated };
    await tile(tv, loadedMeta, { page, probe: { timingsMs: { ...times, loaded: Date.now() - t0 } } });
  } catch (e) {
    if (!current.cells.get(cellKey(midMeta))?.done) blocked(midMeta, `the cold cycle failed: ${msg(e)}`);
    if (!current.cells.get(cellKey(loadedMeta))?.done) blocked(loadedMeta, `the cold cycle failed: ${msg(e)}`);
  } finally {
    if (cdp) await cdp.detach().catch(() => {});
    await page.close().catch(() => {});
  }
}

/**
 * A tap under Slow 3G from a loaded page: the target's skeleton if one is drawn before the content; else the first
 * frame with the progress bar or a pending mark; else the frame 1.5 s after the tap (a dead tap, said in the probe).
 */
async function tapCycle(route, locale, width) {
  const meta = cell(`${route.name}-tap-mid`, 'player', locale, width);
  const r = await open(mainV, route.from, { locale, vp: viewport(width) });
  if (!r.ok) return blocked(meta, `the page the tap starts from (${route.from}) did not open: ${r.reason}`);
  const page = mainV.page;
  const link = tabTo(route.path, width);
  if ((await page.locator(link).count()) === 0) return blocked(meta, `no ${width < 1024 ? 'tab' : 'desktop link'} to ${route.path} on ${route.from}`);
  const cdp = await mainV.ctx.newCDPSession(page);
  try {
    await cdp.send('Network.enable');
    const before = await page.evaluate(LOAD_PROBE, { content: route.content, target: route.path });
    await cdp.send('Network.emulateNetworkConditions', SLOW_3G);
    const t0 = Date.now();
    const times = {};
    await page.locator(link).first().click({ timeout: 10_000 });
    let best = null;
    let early = null;
    let last = null;
    while (Date.now() - t0 < TAP_MAX_MS) {
      const st = await page.evaluate(LOAD_PROBE, { content: route.content, target: route.path }).catch(() => null);
      if (st) {
        last = st;
        if (st.content) {
          times.content = Date.now() - t0;
          break;
        }
        if (st.skeleton > before.skeleton || (st.path === route.path && st.skeleton > 0)) {
          times.skeleton = Date.now() - t0;
          best = { buf: await capture(cdp), st, kind: 'the target’s skeleton' };
          break;
        }
        if (!early && st.pending > 0) {
          times.pending = Date.now() - t0;
          early = { buf: await capture(cdp), st, kind: 'the progress bar or a pending mark (no skeleton yet)' };
        }
        if (!early && Date.now() - t0 > 1500) {
          early = { buf: await capture(cdp), st, kind: 'NO loading UI 1.5 s after the tap (no skeleton, no progress bar, no pending mark)' };
        }
      }
      await sleep(100);
    }
    let pick = best ?? early;
    if (!pick && times.content === undefined) pick = { buf: await capture(cdp), st: last, kind: `nothing landed ${Math.round(TAP_MAX_MS / 1000)} s after the tap` };
    mainV.last = { requested: `${route.from} → tap ${route.path} (Slow 3G)`, status: null, redirects: [], hydrated: true };
    if (pick) await tile(mainV, meta, { buffer: pick.buf, probe: { kind: pick.kind, before, at: pick.st, timingsMs: times, throttle: SLOW_3G } });
    else blocked(meta, `the content arrived ${times.content} ms after the tap, before any frame could be taken`);
  } catch (e) {
    if (!current.cells.get(cellKey(meta))?.done) blocked(meta, `the tap cycle failed: ${msg(e)}`);
  } finally {
    await cdp.send('Network.emulateNetworkConditions', NO_THROTTLE).catch(() => {});
    await page.waitForFunction(({ content, target }) => location.pathname === target && !!document.querySelector(content), { content: route.content, target: route.path }, { timeout: 60_000 }).catch(() => {});
    await cdp.detach().catch(() => {});
  }
}

async function loadingScenario(sc) {
  if (!(await ensureMain())) {
    sc.lastReason = mainWhy;
    return;
  }
  for (const locale of LOCALES) {
    for (const width of WIDTHS) {
      for (const route of LOAD_ROUTES) {
        await coldCycle(route, locale, width);
        await tapCycle(route, locale, width);
      }
    }
  }
}

// ── §6 · not found ──────────────────────────────────────────────────────────────────────────────────────────────────
async function notFoundScenario(sc) {
  const viewers = [];
  try {
    viewers.push({ id: 'guest', v: await newViewer('not-found guest', [pass]), own: true });
  } catch (e) {
    blockWhere((m) => m.viewer === 'guest', `no browser context for a guest: ${msg(e)}`);
  }
  if (await ensureMain()) viewers.push({ id: 'player', v: mainV, own: false });
  else blockWhere((m) => m.viewer === 'player', mainWhy);
  for (const vw of viewers) {
    try {
      for (const locale of LOCALES) {
        for (const r of NOT_FOUND) await pageAtWidths(vw.v, r.path, r.name, vw.id, locale, { ready: 'h1' });
      }
    } finally {
      if (vw.own) await closeViewer(vw.v);
    }
  }
}

// ── §7 · odd viewports ──────────────────────────────────────────────────────────────────────────────────────────────
async function viewportsScenario(sc) {
  if (!(await ensureMain())) {
    sc.lastReason = mainWhy;
    return;
  }
  for (const locale of LOCALES) {
    for (const p of PAGE_SET) {
      const path = p.path === 'market' ? (question ? `/markets/${question.id}` : null) : p.path;
      if (!path) {
        blockRoutes([p.name], locale, 'none of seed-real-markets’ questions is live');
        continue;
      }
      const r = await open(mainV, path, { locale, vp: ODD[0], ...(p.name === 'account' ? { ready: HUB } : {}) });
      if (!r.ok) {
        blockRoutes([p.name], locale, r.reason);
        continue;
      }
      for (const vp of ODD) {
        await resize(mainV.page, vp);
        await toTop(mainV.page);
        await tile(mainV, cell(p.name, 'player', locale, vpToken(vp)));
      }
    }
  }
}

// ── §8 · enlarged text ──────────────────────────────────────────────────────────────────────────────────────────────
async function bigTextScenario(sc) {
  if (!(await ensureMain())) {
    sc.lastReason = mainWhy;
    return;
  }
  for (const locale of LOCALES) {
    for (const p of PAGE_SET.filter((x) => x.name !== 'market')) {
      const route = `${p.name}-text130`;
      const r = await open(mainV, p.path, { locale, vp: viewport(360), ...(p.name === 'account' ? { ready: HUB } : {}) });
      if (!r.ok) {
        blockRoutes([route], locale, r.reason);
        continue;
      }
      // ⭐ This APPROXIMATES a player's larger-text setting (the browser's default font size, or a phone's text-size
      // preference where the browser maps it onto the root font size): rem- and em-sized text grows by 30%, while a
      // size written in px does not — which is itself what the tiles are for. It is not the OS-level zoom of a whole page.
      await mainV.page.evaluate(() => {
        document.documentElement.style.fontSize = '130%';
      });
      await settle(mainV.page, 500);
      const size = await mainV.page.evaluate(() => getComputedStyle(document.documentElement).fontSize).catch(() => null);
      await widthsHere(mainV, route, 'player', locale, [360, 390], { probe: { rootFontSize: size, set: 'document.documentElement.style.fontSize = 130%' } });
    }
  }
}

// ── §9 · offline ────────────────────────────────────────────────────────────────────────────────────────────────────
async function offlineScenario(sc) {
  if (!(await ensureMain())) {
    sc.lastReason = mainWhy;
    return;
  }
  // Its own context, so offline never touches the demo player's other pages.
  const v = await newViewer('offline', [pass, main]);
  // ⭐ THE WORKER INSTALLS ONCE PER CONTEXT, under the first locale this loop opens (LOCALES[0]), and every later locale
  // meets the copy that install made: installed in one language, shown in another — finding 1's switch, on purpose.
  // Each tile records `installedUnder` beside the cookie's locale, and `cache` reads what the worker keeps (SW_CACHE_PROBE).
  let installedUnder = null;
  /** The header controls the old fixed banner lay on: the capsule, the gold pill, and the link the tap uses. */
  const controlsFor = (width) => [CAPSULE, "[data-testid='journey-deposit']", tabTo('/positions', width)];
  /** The offline document reloads itself on `online`; wait until it has gone (and its replacement has loaded). */
  const documentGone = async () => {
    const gone = await v.page.waitForFunction(() => !document.querySelector('main.kp-off'), null, { timeout: 30_000 }).then(() => true, () => false);
    await v.page.waitForLoadState('load', { timeout: LOAD_MS }).catch(() => {});
    return gone;
  };
  try {
    for (const locale of LOCALES) {
      for (const width of WIDTHS) {
        const m = (st) => cell(`root-${st}`, 'player', locale, width);
        const r = await open(v, '/', { locale, vp: viewport(width) });
        if (!r.ok) {
          for (const st of ['offline', 'offline-tap', 'back-online', 'offline-reload']) blocked(m(st), r.reason);
          continue;
        }
        // The service worker registers on mount (lazy-overlays.tsx) and claims the page (public/sw.js).
        await sleep(2_000);
        const sw = await v.page.evaluate(() => (navigator.serviceWorker ? (navigator.serviceWorker.controller ? 'a worker controls the page' : 'no worker controls the page yet') : 'no service worker support')).catch(() => null);
        if (installedUnder === null && sw === 'a worker controls the page') installedUnder = locale;
        const cache = await v.page.evaluate(SW_CACHE_PROBE).catch((e) => ({ unreadable: msg(e) }));
        await v.ctx.setOffline(true);
        const banner = await v.page.waitForFunction((words) => Array.from(document.querySelectorAll("[role='alert']")).some((el) => (el.textContent || '').includes(words)), W.offline[locale], { timeout: 8_000 }).then(() => true, () => false);
        await settle(v.page, 300);
        // ⭐ The notice against the header: below it, overlapping nothing, and every header control on top at its centre.
        const notice = await v.page.evaluate(NOTICE_PROBE, { header: BAR, controls: controlsFor(width) }).catch((e) => ({ unreadable: msg(e) }));
        v.last = { ...v.last, requested: '/ then the context set offline' };
        await tile(v, m('offline'), { probe: { bannerSeen: banner, serviceWorker: sw, installedUnder, cookieLocale: locale, notice, cache } });
        const link = tabTo('/positions', width);
        let tapped = null;
        let linkOnTop = null;
        if ((await v.page.locator(link).count()) === 0) {
          tapped = `no ${width < 1024 ? 'tab' : 'desktop link'} to /positions`;
        } else {
          // ⭐ BEFORE THE TAP, what is on top at the link's centre: the link, or something lying on it. At 1280 before
          // R4-G it was the fixed offline banner (z 200, y 0–37 over the 56px header), so Playwright's actionability
          // check found the link covered and the tap was BLOCKED three times ("locator.click: Timeout 10000ms").
          linkOnTop = await v.page.evaluate(NOTICE_PROBE, { header: BAR, controls: [link] }).then((p) => p.controls[0] ?? null).catch((e) => ({ unreadable: msg(e) }));
          // A navigation the tap starts may fail offline (the router can fall back to a document load): the tap still
          // happened, and what it left on screen is the tile.
          await v.page.locator(link).first().click({ timeout: 10_000, noWaitAfter: true }).then(() => {
            tapped = 'tapped';
          }, (e) => {
            tapped = /net::ERR|navigat/i.test(msg(e)) ? `tapped (the navigation it started failed: ${msg(e)})` : `the tap failed: ${msg(e)}`;
          });
        }
        await sleep(6_000);
        await v.page.addStyleTag({ content: DEV_OVERLAY_OFF }).catch(() => {});
        await settle(v.page, 300);
        // ⭐ What the worker answered the tap with: the offline document, in the cookie's language, holding no person.
        const shown = await v.page.evaluate(OFFLINE_DOC_PROBE).catch((e) => ({ unreadable: msg(e) }));
        v.last = { requested: '/ → the Tiketi tab tapped while offline', status: null, redirects: [], hydrated: null };
        const covered = linkOnTop && linkOnTop.onTop === false ? ` — at the link's centre (${linkOnTop.x}, ${linkOnTop.y}) the top element is ${linkOnTop.top}, not the link` : '';
        if (tapped.startsWith('tapped')) await tile(v, m('offline-tap'), { probe: { tapped, linkOnTop, landed: pathOf(v.page.url()), installedUnder, cookieLocale: locale, offlineDocument: shown } });
        else blocked(m('offline-tap'), `${tapped}${covered}`);
        await v.ctx.setOffline(false);
        // ⭐ BACK ONLINE, NOTHING RELOADED BY THE DRIVE: the document reloads itself on the browser's `online` event into
        // the page it stood in for, which must hydrate with no Next.js error dialog (tile 455 before R4-G: a mismatch).
        const recovered = await documentGone();
        const hydrated = await v.page.waitForFunction(HYDRATED, null, { timeout: HYDRATE_MS }).then(() => true, () => false);
        await sleep(6_000);
        await v.page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {});
        await v.page.addStyleTag({ content: DEV_OVERLAY_OFF }).catch(() => {});
        await settle(v.page, 300);
        v.last = { requested: 'back online, no reload by the drive', status: v.nav?.status ?? null, redirects: [], hydrated };
        await tile(v, m('back-online'), { probe: { landed: pathOf(v.page.url()), offlineDocumentGone: recovered } });
        await v.ctx.setOffline(true);
        let reload = 'reloaded';
        await v.page.reload({ waitUntil: 'load', timeout: 20_000 }).catch((e) => {
          reload = `the reload failed: ${msg(e)}`;
        });
        await sleep(1_500);
        await v.page.addStyleTag({ content: DEV_OVERLAY_OFF }).catch(() => {});
        await settle(v.page, 300);
        const again = await v.page.evaluate(OFFLINE_DOC_PROBE).catch((e) => ({ unreadable: msg(e) }));
        const kept = await v.page.evaluate(SW_CACHE_PROBE).catch((e) => ({ unreadable: msg(e) }));
        v.last = { requested: 'a reload while offline', status: null, redirects: [], hydrated: null };
        await tile(v, m('offline-reload'), { probe: { reload, serviceWorker: sw, landed: pathOf(v.page.url()), installedUnder, cookieLocale: locale, offlineDocument: again, cache: kept } });
        await v.ctx.setOffline(false);
        // The document reloads itself on `online`: let that finish before the next open() navigates.
        await documentGone();
      }
    }
  } finally {
    await v.ctx.setOffline(false).catch(() => {});
    await closeViewer(v);
  }
  // ⭐ AND THE CLASSIC SHELL — the other half of "both shells" (R4-G): the same signed-in player with NO preview pass,
  // so a classic reader. The notice must sit under the classic bar covering none of its links, and the offline
  // document must be the very same one (no classic header, no balance). Extra cells: sw, a phone and a desktop.
  if (stopReason()) return;
  const c = await newViewer('offline-classic', [main]);
  const CLASSIC_BAR = 'header.app-topbar';
  try {
    for (const width of [360, 1280]) {
      const m = (st) => cell(`root-${st}-classic`, 'player-classic', 'sw', width);
      const r = await open(c, '/', { locale: 'sw', vp: viewport(width) });
      if (!r.ok) {
        blocked(m('offline'), r.reason);
        blocked(m('offline-reload'), r.reason);
        continue;
      }
      await sleep(2_000);
      await c.ctx.setOffline(true);
      const banner = await c.page.waitForFunction((words) => Array.from(document.querySelectorAll("[role='alert']")).some((el) => (el.textContent || '').includes(words)), W.offline.sw, { timeout: 8_000 }).then(() => true, () => false);
      await settle(c.page, 300);
      const notice = await c.page.evaluate(NOTICE_PROBE, { header: CLASSIC_BAR, controls: [`${CLASSIC_BAR} a[href='/markets']`, `${CLASSIC_BAR} a[href='/positions']`, `${CLASSIC_BAR} a[href='/wallet']`, `${CLASSIC_BAR} button[aria-haspopup]`] }).catch((e) => ({ unreadable: msg(e) }));
      c.last = { ...c.last, requested: '/ (classic, no preview pass) then the context set offline' };
      await tile(c, m('offline'), { probe: { bannerSeen: banner, notice } });
      let reload = 'reloaded';
      await c.page.reload({ waitUntil: 'load', timeout: 20_000 }).catch((e) => {
        reload = `the reload failed: ${msg(e)}`;
      });
      await sleep(1_500);
      await c.page.addStyleTag({ content: DEV_OVERLAY_OFF }).catch(() => {});
      await settle(c.page, 300);
      const shown = await c.page.evaluate(OFFLINE_DOC_PROBE).catch((e) => ({ unreadable: msg(e) }));
      const kept = await c.page.evaluate(SW_CACHE_PROBE).catch((e) => ({ unreadable: msg(e) }));
      c.last = { requested: 'a reload while offline (classic)', status: null, redirects: [], hydrated: null };
      await tile(c, m('offline-reload'), { probe: { reload, landed: pathOf(c.page.url()), offlineDocument: shown, cache: kept } });
      await c.ctx.setOffline(false);
      await c.page.waitForFunction(() => !document.querySelector('main.kp-off'), null, { timeout: 30_000 }).catch(() => {});
      await c.page.waitForLoadState('load', { timeout: LOAD_MS }).catch(() => {});
    }
  } finally {
    await c.ctx.setOffline(false).catch(() => {});
    await closeViewer(c);
  }
}

// ── §10 · an empty wallet ───────────────────────────────────────────────────────────────────────────────────────────
async function emptyScenario(sc) {
  let session = null;
  try {
    session = await demo('?deposit=0', null, 'the demo player at TZS 0 (the last use of the demo account)');
  } catch (e) {
    sc.lastReason = `/auth/demo?deposit=0 failed: ${msg(e)}`;
    return;
  }
  // That sign-in ended the session scenarios 4-9 used.
  if (mainV) await closeViewer(mainV);
  main = null;
  mainV = null;
  mainReady = false;
  mainWhy = 'the demo session was handed to scenario 10';
  const v = await newViewer('tzs0', [pass, session]);
  try {
    for (const locale of LOCALES) {
      const r = await open(v, '/', { locale, vp: viewport(320) });
      if (!r.ok) {
        blockRoutes([R10.header, R10.home, R10.wallet], locale, r.reason);
      } else {
        for (const width of [320, 360]) {
          await resize(v.page, viewport(width));
          await toTop(v.page);
          await tile(v, cell(R10.header, 'player-tzs0', locale, width), { clip: await headerClip(v.page) });
          await tile(v, cell(R10.home, 'player-tzs0', locale, width));
          await walletTile(v, cell(R10.wallet, 'player-tzs0', locale, width));
        }
      }
      await pageAtWidths(v, '/wallet/deposit', R10.deposit, 'player-tzs0', locale, { widths: [320, 360] });
    }
  } finally {
    await closeViewer(v);
  }
}

// ── The drive ───────────────────────────────────────────────────────────────────────────────────────────────────────
const RUNNERS = { break: breakScenario, exclude: excludeScenario, name: nameScenario, title: titleScenario, loading: loadingScenario, notfound: notFoundScenario, viewports: viewportsScenario, bigtext: bigTextScenario, offline: offlineScenario, empty: emptyScenario };

async function runScenario(sc) {
  if (!runs(sc.id)) {
    LOG.entries.push({ kind: 'not-run', scenario: sc.token, reason: 'KP_ONLY leaves it out' });
    return;
  }
  say(NL + `§${sc.n} · ${sc.token} — ${sc.title}`);
  current = sc;
  const why = stopReason() ?? (pass ? null : 'no staff preview pass (see §0): the journey shell shows only to a pass holder');
  if (why) {
    blockRest(why);
    return;
  }
  const t0 = Date.now();
  try {
    await RUNNERS[sc.id](sc);
  } catch (e) {
    sc.lastReason = `the scenario stopped on an error: ${msg(e)}`;
    say(`  ERROR ${sc.token} — ${msg(e)}`);
  }
  blockRest(sc.lastReason ?? stopReason() ?? 'not reached: the scenario ended before this cell (see the lines above it in the log)');
  flushLog(true);
  say(`  · ${sc.token}: ${secs(t0)} s, ${sc.counts.tiles} tiles, ${sc.counts.blocked} blocked`);
}

say(`qa-journey-edges — ${BASE} · the rollout is ${ROLLOUT} · tiles and log into ${OUT}`);
say(`PLAN — locales ${LOCALES.join(' ')}, widths ${WIDTHS.join(' ')} unless a scenario says otherwise; every tile through a real staff preview pass:`);
let plannedAll = 0;
for (const sc of SCENARIOS) {
  const on = runs(sc.id);
  if (on) plannedAll += sc.cells.size;
  say(`  §${sc.n} ${sc.token.padEnd(15)} ${on ? String(sc.cells.size).padStart(3) : '  -'} tiles${on ? '' : ' (not run: KP_ONLY)'} — ${sc.title}`);
  if (on) say(`       reached: ${sc.how}`);
}
say(`  ${plannedAll} planned tiles in all (scenario 4 adds up to 9 more if its question is not on /). Budget ${BUDGET_MIN} min after a warm-up of at most ${WARM_MIN} min.`);
flushLog(true);

let crashed = false;
try {
  browser = await chromium.launch({ headless: true });
  await setup();
  cellsFrom = Date.now();
  for (const sc of SCENARIOS) await runScenario(sc);
} catch (e) {
  crashed = true;
  say(`CRASH — ${msg(e)}`);
  LOG.crash = msg(e);
  for (const sc of SCENARIOS) {
    if (!runs(sc.id)) continue;
    current = sc;
    blockRest(`the drive crashed: ${msg(e)}`);
  }
} finally {
  await closeViewer(mainV);
}
summary();
const anyBlocked = SCENARIOS.some((s) => runs(s.id) && s.counts.blocked > 0);
await finish(crashed ? 1 : anyBlocked ? 3 : 0);
