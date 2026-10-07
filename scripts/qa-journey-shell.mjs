/**
 * qa:journey-shell — THE JOURNEY SHELL AS A PREVIEW READER SEES IT, IN VIEWPORT TILES READ ONE BY ONE.
 * The Vodacom plan S6, `docs/design-system/v5-2026-09-29-simplified-journey/S6-PLAN.md`: WP6b step 5, the tile lines of
 * WP7 and WP9, the done-when “Tiles, read one by one”, WP12 step 4, and the G1 drive amendment A1 still owes.
 *
 *   KP_BASE=http://localhost:3041 npm run qa:journey-shell -- <outDir>
 *
 *   <outDir>        where the PNG tiles go. It must be OUTSIDE the repository (refused inside it, exit 2: an untracked
 *                   tile in a worktree is a file another session’s commit can sweep up). By default a new folder under
 *                   the OS temp directory, which the last line names.
 *   KP_ONLY         a comma list of sections (classic header sheet unread wallet focus tabs tickets hub overlays viewer
 *                   emailbar kyc), always run in that order because the demo player is one account. An unknown name
 *                   is refused.
 *   KP_BUDGET_MIN   the cells’ wall-clock budget in minutes, counted from the end of §0 (default 20). Once it is spent,
 *                   every section and page not yet opened prints a BLOCKED line, by name, instead of running.
 *   KP_WARM_MIN     §0’s warm-up budget in minutes (default 10). A just-started `next dev` compiles each route on its
 *                   first request; §0 pays that once per route, up front, and prints what each one cost.
 * A watchdog ends the run at KP_WARM_MIN + KP_BUDGET_MIN + 5 minutes whatever hangs (exit 3, or 1 after a FAIL), and
 * three page loads or requests in a row that the server does not answer block everything left.
 *
 * Every journey page is opened through a REAL staff preview pass (`live/journey-pass.mjs`: a SUPPORT officer turns
 * their preview on at /admin/journey), beside the session its cell is for. Every tile is the VIEWPORT, never the full
 * page. Before each shot the page’s h1 (the first `#main-content h1`) is held to the words that page’s source renders
 * for that route and language: a tile of the wrong page (a sign-in redirect, a not-found body, an error page) FAILS
 * its line and is written with a WRONG-PAGE suffix, and a tile over an open sheet holds the sheet to its own name.
 *
 * ── WHAT A MACHINE ASSERTS, ONE PASS OR FAIL LINE EACH ───────────────────────────────────────────────────────────
 *   · every page load: it opened (HTTP below 400), in the language asked for, with no Next.js error overlay or page;
 *   · the chrome: for a pass holder the journey header, the shell’s mark, the four tabs below 1024 and the desktop
 *     links from 1024, no classic bar; for a viewer WITHOUT a pass the classic bar, rail and coin and no journey
 *     trace, and /account answering HTTP 200 with the not-found page’s noindex, nofollow and no hub (A2, A3), beside
 *     a control: the same request with the pass is served the hub;
 *   · the active tab on every journey tile: one destination lit, the one `activeTabFor` names, aria-current page on
 *     the tab’s own href and true on the rest of its section (A12);
 *   · no control past the viewport edge (`live/clip.mjs`, CLIP_PROBE) in the journey header, the tabs, the page’s main
 *     landmark and an open sheet, or for the classic chrome anywhere in the body. The document’s own scrollWidth is
 *     only a backstop: html and body clip, so it reads 0 over a severed control;
 *   · at 320, the four tab labels whole and on screen (RAIL_PROBE, the reading A17 left owed to the 320 drive);
 *   · each header state landed: a guest’s Ingia and Jisajili; the capsule, its figure (TZS 999,999 and the compact
 *     TZS 9.9M among them), its hold, its mask; the gold + Weka pesa only where the wallet is not held and never on
 *     the deposit screen; a held wallet’s Wallet with its frozen notice and no money door;
 *   · the guest’s Tiketi sheet; the Wallet opened from the capsule (Pochi, offering Weka pesa and Toa pesa);
 *   · the Akaunti dot (on its own lit tab, and on an unlit one at 320) and the Arifa badge, judged only once the
 *     classic bell reads 1 unread or more (else BLOCKED), all three holding one count;
 *   · a :focus-visible ring after a real Tab on the capsule, the gold pill, a tab, a desktop link, a guest’s Ingia,
 *     the first hub row, the Wallet’s Toa pesa and Weka mipaka and the guest sheet’s first door, judged as a 2px solid
 *     outline at its rule’s offset (2px; -2px inside a hub card, which clips) that was not drawn at rest;
 *   · Tiketi zangu: cards on the open, settled, won and lost lenses; the first-ticket empty state; an empty Won lens
 *     with its own words and its way back; the Maswali | Juu/Chini switch (a nav, the page’s own kind current, no
 *     tablist) on both of its routes;
 *   · the hub for a member (identity, sign-out), a guest (the prompt) and staff (the console door), walked screen by
 *     screen at 390 and 1280 down to the sign-out row;
 *   · WP7: for a pass-holding player the Needle, the chat bubble and the channels panel stand down on / and
 *     /positions, with not one frame of the Needle or the bubble from the document’s first frame, and are on screen on
 *     /help and /account after the panel’s 45 s dwell; for a pass-holding guest the bubble and the panel the same
 *     way and no Needle anywhere (AppShell mounts it for a session only); and no email-verify bar for a journey reader
 *     whose address is unconfirmed, beside a classic control that shows it;
 *   · G1 (A1): on one phone, player A’s session ends through the E-381 path, B signs in through the header’s Ingia and
 *     the real form, and no frame of the Akaunti dot or the Arifa row shows A’s count once A’s shell is gone;
 *   · every hub door the plan names, tiled through some viewer’s hub, or BLOCKED by name;
 *   · no script error and no hydration warning on any page (React’s DEV-only measure error is listed, never failed).
 * WHAT IS LEFT TO THE READER: how each tile LOOKS (alignment, rhythm, colour, the ring, the sheet, how the words sit)
 * and whether the words are the right ones. A green run is not a read: open every tile, in the order of its number.
 *
 * ── CELLS: about 335 tiles over about 115 page loads ───────────────────────────────────────────────────────────────
 *   classic   a guest and the demo player WITHOUT a pass, on /, × 390 1280 × sw en zh                              12
 *   header    / for a guest and for TZS 999,999 × 320 360 390 412 768 1024 1150 1280; TZS 100,000 × 390 1280;
 *             TZS 9.9M × 320 1024; TZS 0, held and masked × 320 390 1024 1280; each × sw en zh. Then the held
 *             Wallet (sw 390) and the deposit screen at TZS 999,999 (sw × 320 390 1280)                            100
 *   sheet     the guest’s Tiketi sheet × 320 390 1280 × sw en zh                                                     9
 *   unread    Arifa at 1280 and 390 and the dot at 390, × sw en zh; the dot on / at 320 (sw)                          10
 *   wallet    the Wallet from the capsule × 390 1280 × sw en zh                                                       6
 *   focus     capsule, pill, Akaunti tab (390) and a desktop link (1280) × sw en zh; sw: the first hub row, the
 *             Wallet’s Toa pesa and Weka mipaka × 390 1280, a guest’s Ingia and the guest sheet’s first door         19
 *   tabs      sw: the player on every tab route and every door its hub lists × 390 1280; the guest on every route a
 *             guest can open and every door its hub lists × 390                                                about 55
 *   tickets   open, settled and the switch × 320 390 1280 × sw en zh; won and lost (sw 390); empty × 320 390 1280
 *             × sw en zh; the empty Won lens (sw × 320 390 1280)                                                   41
 *   hub       member, guest, staff × sw en zh: the top at 320 360 1024 (staff: its console card), and walked at
 *             390 and 1280, one tile per new screenful                                                         about 67
 *   overlays  / /positions /help /account for a pass-holding player; / /help /account for a guest (sw 390)        7
 *   viewer    G1: A before, A’s shell ended, B on /, B on /account (sw 390)                                         4
 *   emailbar  the journey without the bar, and the classic control with it (sw 390)                                 2
 *   kyc       the Verify ID row on the hub (sw 390), and /profile/kyc × 390 1280                                    3
 * About 12 minutes of cells on a warmed server, plus §0: about a minute on a warm server, five to eight just after
 * `rm -rf .next` (some thirty routes compile once). One browser context per viewer, navigated route to route, so a
 * viewer fetches the dev server’s scripts once, not once per page.
 *
 * ── PREMISES ─────────────────────────────────────────────────────────────────────────────────────────────────────
 * `premise` refuses (exit 2) anything but http://localhost:PORT on an IN-MEMORY dev server whose rollout a pass can
 * see: start one after `rm -rf .next`, with DISABLE_ADMIN_TOTP=true and no DATABASE_URL. Because this drive moves money
 * through the real service (seed-player-portfolio buys, sells, settles and voids), EVERY request that changes the
 * server asks the premise again first and holds /api/health’s uptime to the clock read at the start: a restarted
 * server, or another one now answering on the port, is refused (exit 2) before anything is sent to it.
 * Fixtures come only through dev-test routes that exist; no route is added: seed-admin (the pass’s officer, a SUPPORT
 * viewer, a fresh player, and player B with a password), seed-real-markets (six questions with Swahili and Chinese
 * titles), seed-markets (the real catalogue, so the portfolio reaches its won, lost and refunded tickets; those
 * questions carry no Chinese title and fall back to English, so a zh card of one may read English), updown-seed,
 * seed-player-portfolio and, through `demoSession`, seed-wallet. THE DEMO PLAYER IS ONE ACCOUNT: every /auth/demo ends
 * the last session, so each header state is set up and read before the next, the signed-in sections share one
 * session set up after them, G1 ends that session on purpose, and the unconfirmed-email and no-identity states come
 * last. A self-imposed break is reached only through the limits page’s form, so the header during a break is not
 * driven here. The drive writes nothing but the PNG tiles into <outDir>; never point it at a server another drive
 * is using.
 * EXIT 0 every line passed · 1 a FAIL · 2 REFUSED · 3 no FAIL, but something BLOCKED (not proven).
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { CLIP_PROBE } from './live/clip.mjs';
import { premise, mintStaffPass, demoSession, LOCALE_COOKIE, SESSION_COOKIE } from './live/journey-pass.mjs';
import { JOURNEY_BAR, RAIL_PROBE } from './live/journey-header-fit.mjs';

const BASE = process.env.KP_BASE ?? 'http://localhost:3041';
const NL = String.fromCharCode(10);
const STARTED = Date.now();
const SECTIONS = ['classic', 'header', 'sheet', 'unread', 'wallet', 'focus', 'tabs', 'tickets', 'hub', 'overlays', 'viewer', 'emailbar', 'kyc'];
/** The sections that read the demo player’s own session, its tickets, and the seeded questions and rounds. */
const PLAYER_SECTIONS = ['unread', 'wallet', 'focus', 'tabs', 'tickets', 'hub', 'overlays', 'viewer'];
const say = (s) => console.log(s);

// ── Refusals made before anything touches the server or the disk ───────────────────────────────────────────────────
function refuseEarly(text) {
  console.error(`REFUSED — ${text}`);
  process.exit(2);
}
const ONLY = (process.env.KP_ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const strangers = ONLY.filter((s) => !SECTIONS.includes(s));
if (strangers.length > 0) refuseEarly(`KP_ONLY names no section: ${strangers.join(', ')} (the sections are: ${SECTIONS.join(' ')})`);
const runs = (id) => ONLY.length === 0 || ONLY.includes(id);

function minutesFrom(name, fallback) {
  const raw = process.env[name];
  const n = raw === undefined || raw.trim() === '' ? fallback : Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 240) refuseEarly(`${name} must be a number of minutes above 0 and at most 240, not ${JSON.stringify(raw)}`);
  return n;
}
const BUDGET_MIN = minutesFrom('KP_BUDGET_MIN', 20);
const WARM_MIN = minutesFrom('KP_WARM_MIN', 10);

/** The repository this file lives in. A tile written inside it is an untracked file another session’s commit can take. */
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(process.argv[2] || join(tmpdir(), `qa-journey-shell-${Date.now()}`));
{
  const rel = relative(REPO, OUT);
  const outside = rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
  if (!outside) refuseEarly(`the outDir ${OUT} is inside the repository ${REPO}: name a folder outside it (by default the tiles go to a new folder under the OS temp directory)`);
}

const first = await premise(BASE);
if (first.refuse) refuseEarly(first.refuse);
/** STAFF_PREVIEW or ACTIVE (the premise refuses the rest): only under the first does a viewer without a pass stay classic. */
const ROLLOUT = first.health?.simpleJourney?.state ?? null;
/** The server’s uptime when this drive began, and the drive’s own clock then: every later guard holds the server to them. */
const BOOT_UPTIME = Number(first.health?.uptimeSec ?? 0);
const BOOT_AT = Date.now();
mkdirSync(OUT, { recursive: true });

// ── The matrix ──────────────────────────────────────────────────────────────────────────────────────────────────────
const LOCALES = ['sw', 'en', 'zh'];
/** WP6b step 5’s header widths. */
const HEADER_WIDTHS = [320, 360, 390, 412, 768, 1024, 1150, 1280];
/** The narrowest phone, a common phone, the first width with the desktop links (lg) and the lockup’s (xl). */
const EDGE_WIDTHS = [320, 390, 1024, 1280];
/** WP9’s Tiketi widths, which the guest sheet’s tiles share. */
const TICKET_WIDTHS = [320, 390, 1280];
/** The done-when’s hub widths, and the two of them the hub is walked at, screen by screen. */
const HUB_WIDTHS = [320, 360, 390, 1024, 1280];
const HUB_WALK = [390, 1280];
/** One phone (where the tabs show) and one desktop (where the links show). */
const PHONE_DESK = [390, 1280];
/** Phones 780 tall and desktops 900, as the other journey drives size them. */
const viewport = (width) => ({ width, height: width < 1024 ? 780 : 900 });
/** A page’s document, then its hydration: generous, because a route §0 did not warm compiles on its first request. */
const LOAD_MS = 120_000;
const HYDRATE_MS = 90_000;

// ── Selectors and storage keys, each from the code that renders or reads it (cited by symbol: line numbers drift) ──
/** journey-tabs.tsx, `JourneyTabs`: the rail’s nav. */
const RAIL = `nav[data-testid='journey-tabs']`;
/** wallet-balance-pill.tsx, `WalletBalanceCaptioned`: the capsule button (data-held, data-masked, its name). */
const CAPSULE = `[data-testid='journey-balance']`;
/** journey-top-bar.tsx, `JourneyTopBar`: the gilt + Weka pesa link. */
const PILL = `[data-testid='journey-deposit']`;
/** journey-top-bar.tsx: a guest’s Ingia, the first of its two `.kp-jhdr__auth` links. */
const SIGN_IN = `${JOURNEY_BAR} a.kp-jhdr__auth[href='/auth/login']`;
/** app/account/page.tsx, `AccountHubPage`: the hub. */
const HUB = `[data-testid='journey-account-hub']`;
/** unread-row.tsx, `UnreadRow`: Arifa, the hub’s notifications door. */
const ARIFA = `${HUB} a.kp-hub__row[href='/notifications']`;
/** ui/modal.tsx, `Modal`: its role=dialog root while it is open (a sheet included). */
const OPEN_DIALOG = `[role='dialog'][aria-modal='true']`;
/** lib/journey/shell-mark.ts, `JOURNEY_SHELL_MARK`: AppShell writes it for a journey request and no other. */
const SHELL_MARK_ID = 'kp-journey-shell';
/** first-visit-primer.tsx’s seen key (headless Chromium never sees the primer; set anyway, so no tile can catch it). */
const PRIMER_SEEN = '50pick-primer-seen';
/** channels-panel.tsx, `K_VISITS` and `K_DONE`: the panel shows on a second visit after 45 s, and never once done. */
const CHANNEL_VISITS = '50pick-channels-visits';
const CHANNELS_DONE = '50pick-channels-done';
/** ui/cash.tsx, `STORAGE_KEY`: the hidden-balances switch the capsule reads. */
const CASH_HIDDEN = 'cashHidden';
/** The Next.js dev indicator sits over the rail’s first tab on a phone; the repo’s tile drives hide it with this line. */
const DEV_OVERLAY_OFF = 'nextjs-portal,[data-nextjs-toast],[data-nextjs-dialog-overlay]{display:none!important}';
/** An error page’s own words (pre-deploy-live-check.mjs, `hasErrorOverlay`; its not-found line is the h1 check’s here). */
const NEXT_ERROR_SIGNS = ['Unhandled Runtime Error', 'Build Error', 'Failed to compile', 'Application error:'];
/** Player B’s password, handed to seed-admin, so the real sign-in form can be used. */
const B_PASSWORD = 'Shell-2026-pass';

// ── The words, copied from src/lib/i18n-dict.ts (its en, sw and zh blocks), by key ─────────────────────────────────
const W = {
  /** journey.ticketsGuestTitle */
  guestSheet: { sw: 'Ingia uone tiketi zako', en: 'Sign in to see your tickets', zh: '登录查看您的注单' },
  /** journey.ticketsEmptyOpenTitle */
  emptyOpen: { sw: 'Bado huna tiketi hai', en: 'No open tickets yet', zh: '您还没有进行中的注单' },
  /** journey.ticketsEmptyWon (tickets-view.tsx, `LENS_EMPTY`) */
  emptyWon: { sw: 'Hakuna yako iliyoshinda bado', en: 'Nothing of yours has won yet', zh: '您还没有获胜的注单' },
  /** journey.ticketsExitLens, which the exit link follows with its count */
  exitLens: { sw: 'Tiketi zote', en: 'All tickets', zh: '全部注单' },
  /** journey.ticketsBrowse */
  browse: { sw: 'Tazama maswali', en: 'See questions', zh: '查看问题' },
  /** journey.ticketsKindAria */
  kindAria: { sw: 'Aina ya tiketi', en: 'Ticket type', zh: '注单类型' },
  /** journey.depositAction */
  deposit: { sw: 'Weka pesa', en: 'Deposit', zh: '充值' },
  /** journey.withdrawAction */
  withdraw: { sw: 'Toa pesa', en: 'Withdraw', zh: '提现' },
  /** common.wallet: the Wallet’s name (wallet-sheet.tsx, `Modal`’s ariaLabel) */
  wallet: { sw: 'Pochi', en: 'Wallet', zh: '钱包' },
  /** kycGate.frozenTitle: a held Wallet’s notice (wallet-sheet.tsx, `.kp-wsheet__held`) */
  frozen: { sw: 'Pochi yako imegandishwa', en: 'Your wallet is frozen', zh: '您的钱包已被冻结' },
  /** journey.hubGuestPrompt */
  guestPrompt: { sw: 'Ingia au jisajili ili uone pochi na tiketi zako.', en: 'Sign in or sign up to see your wallet and tickets.', zh: '登录或注册以查看您的钱包和注单。' },
  /** common.staffConsole */
  staffConsole: { sw: 'Konsoli ya wafanyakazi', en: 'Staff console', zh: '员工控制台' },
  /** common.verifyId: the Profile card’s door to /profile/kyc */
  verifyId: { sw: 'Thibitisha ID', en: 'Verify ID', zh: '身份验证' },
  /** notif.unreadOne and notif.unreadN: the dot’s count in words (journey-tabs.tsx, `TabUnread`’s sr-only span) */
  unreadOne: { sw: '1 haijasomwa', en: '1 unread', zh: '1 条未读' },
  unreadN: { sw: '{n} hazijasomwa', en: '{n} unread', zh: '{n} 条未读' },
};

/** A page’s h1 as its source writes it: eq the whole heading, has a part of it; a list is any one of its words. */
const H = (mode, sw, en, zh) => ({ mode, words: { sw, en, zh } });
const HEAD = {
  /** landing-hero.tsx, `Ask`: home.heroAsk filled with common.yes and common.no (`sideWord`) */
  home: H('eq', 'NDIO au HAPANA?', 'YES or NO?', '是还是否？'),
  /** journey.tabTickets: `TicketsHead`’s PageHeader on both ticket routes (ticket-switch.tsx) */
  tickets: H('eq', 'Tiketi zangu', 'My tickets', '我的注单'),
  /** journey.tabAccount: `AccountHubPage`’s h1 */
  account: H('eq', 'Akaunti', 'Account', '账户'),
  /** updown/[roundId]/page.tsx: the asset’s name, then market.udTitle, then the duration chip */
  round: H('has', 'Juu na Chini', 'Up & Down', '涨跌'),
};
/** The h1 of every page a tile may open, by pathname: the page that renders it, then its dictionary key or words. */
const PAGE_HEADINGS = {
  '/': HEAD.home,
  '/positions': HEAD.tickets,
  '/updown/history': HEAD.tickets,
  '/account': HEAD.account,
  /** markets/page.tsx, its sr-only h1: market.title */
  '/markets': H('eq', 'Masoko', 'Markets', '市场'),
  /** updown/page.tsx, its PageHeader: market.udTitle */
  '/updown': H('eq', 'Juu na Chini', 'Up & Down', '涨跌'),
  /** wallet/wallet-client.tsx, its PageHeader: common.yourFunds */
  '/wallet': H('eq', 'Pesa zako', 'Your funds', '您的资金'),
  /** wallet/deposit/page.tsx, its PageHeader: common.deposit */
  '/wallet/deposit': H('eq', 'Amana', 'Deposit', '充值'),
  /** wallet/withdraw/page.tsx, its PageHeader: wallet.moveFundsOut */
  '/wallet/withdraw': H('eq', 'Toa fedha', 'Move funds out', '转出资金'),
  /** results/page.tsx, its sr-only h1: results.title */
  '/results': H('eq', 'Matokeo', 'Results', '结果'),
  /** live/page.tsx, its sr-only h1: common.live then common.markets */
  '/live': H('eq', 'Mubashara Masoko', 'Live Markets', '直播 市场'),
  /** leaderboard/page.tsx, its PageHeader: leaderboard.topPredictors */
  '/leaderboard': H('eq', 'Watabiri bora', 'Top predictors', '顶级预测者'),
  /** fairness/page.tsx, its PageHeader: common.howAMarketResolves */
  '/fairness': H('eq', 'Soko linatatuliwa vipi', 'How a market resolves', '市场如何结算'),
  /** help/page.tsx, its PageHeader: help.heading */
  '/help': H('eq', 'Tunaweza kukusaidiaje?', 'How can we help?', '我们能帮您什么？'),
  /** notifications/page.tsx, its PageHeader: notif.title */
  '/notifications': H('eq', 'Arifa', 'Notifications', '通知'),
  /** profile/page.tsx, its sr-only h1: profile.title, then the display name */
  '/profile': H('has', 'Wasifu', 'Profile', '个人资料'),
  /** profile/responsible-gambling/page.tsx, its PageHeader: profile.responsibleGambling */
  '/profile/responsible-gambling': H('eq', 'Vikomo', 'Responsible gambling', '负责任博彩'),
  /** profile/invite/page.tsx, its sr-only h1: profile.inviteEarn when paid, else profile.inviteFriends */
  '/profile/invite': H('eq', ['Alika na upate zawadi', 'Alika marafiki'], ['Invite & Earn', 'Invite friends'], ['邀请赚钱', '邀请朋友']),
  /** profile/kyc/page.tsx, its PageHeader before approval: profile.verifyIdentity */
  '/profile/kyc': H('eq', 'Thibitisha kitambulisho', 'Verify your identity', '验证您的身份'),
  /** proposals/page.tsx, its PageHeader while the programme is not DISABLED: proposals.voteForMarkets */
  '/proposals': H('eq', 'Pigia kura soko unayotaka', 'Vote for the markets you want to see', '为您想看到的市场投票'),
  /** agent/page.tsx, its PageHeader: agent.title */
  '/agent': H('eq', 'Kuwa Wakala wa 50pick', 'Become a 50pick Agent', '成为 50pick 代理'),
  /** legal/privacy/page.tsx, its TITLE through `LegalHeader` (legal/_components.tsx) */
  '/legal/privacy': H('eq', 'Sera ya Faragha', 'Privacy Policy', '隐私政策'),
  /** legal/aml/page.tsx, its TITLE */
  '/legal/aml': H('eq', 'Sera ya Kuzuia Uoshaji wa Fedha na KYC', 'AML & KYC Policy', '反洗钱与 KYC 政策'),
  /** legal/terms/page.tsx, its TITLE */
  '/legal/terms': H('eq', 'Masharti ya Huduma', 'Terms of Service', '服务条款'),
  /** legal/rules/page.tsx, its TITLE */
  '/legal/rules': H('eq', 'Kanuni za Michezo', 'Game Rules', '游戏规则'),
  /** legal/responsible-gambling/page.tsx, its TITLE */
  '/legal/responsible-gambling': H('eq', 'Sera ya Mchezo Salama', 'Responsible Gambling Policy', '负责任博彩政策'),
};

/** api/dev-test/seed-real-markets/route.ts, its seed list: a question’s h1 is its title in the reader’s language. */
const SEEDED_TITLES = [
  { en: 'Simba SC wins the NBC Premier League 2026-27', sw: 'Simba SC yashinda NBC Premier League 2026-27', zh: '辛巴俱乐部赢得2026-27赛季NBC超级联赛' },
  { en: 'Young Africans qualify for the CAF group stage', sw: 'Yanga wafuzu hatua ya makundi CAF', zh: '扬加晋级非洲冠军联赛小组赛' },
  { en: 'USD/TZS closes below 2,650 at end of Q2', sw: 'USD/TZS yafunga chini ya 2,650 mwisho wa robo ya pili', zh: '美元兑坦桑尼亚先令二季度末收于2,650以下' },
  { en: 'Bank of Tanzania holds the rate at the next MPC', sw: 'Benki Kuu yashikilia riba kikao kijacho', zh: '坦桑尼亚央行下次会议维持利率' },
  { en: 'Dar es Salaam rainfall exceeds 200mm in July', sw: 'Mvua Dar es Salaam yazidi 200mm Julai', zh: '达累斯萨拉姆七月降雨超过200毫米' },
  { en: 'Bitcoin closes above $100,000 on 1 August', sw: 'Bitcoin yafunga juu ya $100,000 tarehe 1 Agosti', zh: '比特币8月1日收于10万美元以上' },
];

/** lib/nav/active-tab.ts, `JOURNEY_TABS`: the four tabs’ own hrefs. */
const TAB_HREF = { questions: '/', updown: '/updown', tickets: '/positions', account: '/account' };
/**
 * lib/nav/active-tab.ts, `TAB_ROUTES`, row for row, with `routeMatches`: the first row that claims a path wins, and a
 * row claims its own path or one below it. A copy because this drive runs on plain node, as journey-header-fit.mjs
 * keeps its own: when the table moves, the active-tab lines FAIL until this copy follows, loudly.
 */
const TAB_ROUTES = [
  ['/', 'questions', true], ['/markets', 'questions'], ['/updown/history', 'tickets'], ['/updown', 'updown'],
  ['/positions', 'tickets'], ['/account', 'account'], ['/wallet', 'account'], ['/profile', 'account'],
  ['/notifications', 'account'], ['/results', 'account'], ['/live', 'account'], ['/leaderboard', 'account'],
  ['/fairness', 'account'], ['/help', 'account'], ['/legal', 'account'], ['/proposals', 'account'],
  ['/agent', 'account'], ['/watchlist', 'account'], ['/auth', null], ['/s', null], ['/offline', null, true],
];
/** The tab a pathname must light, and its aria-current (`tabAriaCurrent`): page on its own href, else true. */
function expectedTab(pathname) {
  for (const [prefix, tab, exact] of TAB_ROUTES) {
    if (pathname === prefix || (!exact && pathname.startsWith(`${prefix}/`))) {
      return tab === null ? null : { tab, href: TAB_HREF[tab], current: TAB_HREF[tab] === pathname ? 'page' : 'true' };
    }
  }
  return null;
}

/** S6-PLAN, Verification, its Hub line: the doors the hub must reach (some only for some readers). */
const PLAN_HUB_DOORS = ['/live', '/results', '/leaderboard', '/fairness', '/help', '/notifications', '/profile', '/profile/kyc', '/profile/invite', '/proposals', '/agent', '/wallet', '/wallet/withdraw'];

/**
 * The header’s states, in the order they are set up. ONE demo account (`live/journey-pass.mjs`), so each signed-in
 * state’s session ends the last one’s; /auth/demo lifts an officer’s hold on every visit that does not ask for one
 * (auth/demo/route.ts, `ensureDemoWallet`). `figure` is what the capsule’s name must carry (A11: its name is its words).
 */
const HEADER_STATES = [
  { id: 'pass', viewer: 'guest', signedIn: false, widths: HEADER_WIDTHS, what: 'a guest holding a pass: Ingia and Jisajili, no capsule' },
  { id: '100000', viewer: 'player', signedIn: true, query: '', balance: null, figure: 'TZS 100,000', widths: PHONE_DESK, what: 'the demo player signed in, at its own TZS 100,000' },
  { id: '999999', viewer: 'player', signedIn: true, query: '?deposit=0', balance: 999_999, figure: 'TZS 999,999', widths: HEADER_WIDTHS, depositScreen: true, what: 'a player at TZS 999,999, the widest figure a wallet prints whole' },
  { id: 'compact', viewer: 'player', signedIn: true, query: '?deposit=0', balance: 9_940_000, figure: 'TZS 9.9M', widths: [320, 1024], what: 'a player at TZS 9,940,000, the widest compact figure (TZS 9.9M)' },
  { id: 'zero', viewer: 'player', signedIn: true, query: '?deposit=0', balance: 0, figure: 'TZS 0', widths: EDGE_WIDTHS, what: 'a player at TZS 0' },
  { id: 'held', viewer: 'player', signedIn: true, query: '?hold=officer', balance: null, held: true, heldWallet: true, widths: EDGE_WIDTHS, what: 'a wallet an officer holds: the capsule held, no gold pill' },
  { id: 'masked', viewer: 'player', signedIn: true, query: '?deposit=0', balance: 999_999, masked: true, widths: EDGE_WIDTHS, what: 'a player at TZS 999,999 with balances hidden' },
];

/** The dev-test routes the helpers post to: a GET compiles each, and a POST-only route answers 405 and runs nothing. */
const DEV_ROUTES = ['/api/dev-test/seed-admin', '/api/dev-test/seed-wallet', '/api/dev-test/seed-real-markets', '/api/dev-test/seed-markets', '/api/dev-test/updown-seed', '/api/dev-test/seed-player-portfolio'];
/** Every page the cells open, asked for once in §0 so a cold dev server compiles each before its tiles. */
const WARM_PATHS = [
  '/', '/account', '/positions?tab=open', '/positions', '/updown', '/updown/history', '/results', '/markets', '/live',
  '/leaderboard', '/fairness', '/help', '/notifications', '/profile', '/profile/responsible-gambling', '/profile/kyc',
  '/profile/invite', '/proposals', '/agent', '/wallet', '/wallet/deposit', '/wallet/withdraw', '/auth/login',
  '/legal/privacy', '/legal/aml', '/legal/terms', '/legal/rules', '/legal/responsible-gambling', '/api/session/status',
];

// ── State the sections share ───────────────────────────────────────────────────────────────────────────────────────
let browser = null;
/** The staff preview pass (the kp_preview cookie), handed to every journey context. */
let pass = null;
/** The demo player’s session for the signed-in sections, its browser context, and whether both are set up. */
let main = null;
let mainV = null;
let mainReady = null;
/** What seed-player-portfolio answered: byStatus, marketIds, updownPlaced, refusals. */
let portfolio = {};
/** Why the settled, won and lost lenses cannot show their kind of ticket, or null when they can. */
let outcomeShortfall = 'the demo player’s portfolio was not seeded';
/** seed-real-markets’ live list: { id, cat, title } with the English title. */
let realMarkets = [];
/** The round the Up & Down board links first. */
let roundPath = null;
/** Every hub door some viewer’s hub offered, as a pathname. */
const hubDoorsSeen = new Set();
/** The tiles’ running number: they are read in this order. */
let seq = 0;

// ── Lines and counts ───────────────────────────────────────────────────────────────────────────────────────────────
const count = { pass: 0, fail: 0, blocked: 0, tiles: 0 };
/** Every script error and hydration warning a page raised; React’s DEV-only measure error is kept apart. */
const errors = [];
const devOnly = [];
const ok = (label, cond, detail = '') => {
  if (cond) count.pass += 1;
  else count.fail += 1;
  say(`  ${cond ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  return !!cond;
};
const blocked = (label, why) => {
  count.blocked += 1;
  say(`  BLOCKED ${label} — ${why}`);
};
const msg = (e) => String(e?.message ?? e).split(NL)[0].slice(0, 240);
const sleep = (ms) => new Promise((done) => setTimeout(done, Math.max(0, ms)));
const secs = (t0) => ((Date.now() - t0) / 1000).toFixed(1);
/** The words with every white space taken out, so a dropped or a doubled space, or an NBSP, cannot fail a match. */
const squeeze = (s) => Array.from(String(s ?? '')).filter((c) => c.trim() !== '').join('');
/** The words with every run of white space folded to one space, for printing. */
const fold = (s) => Array.from(String(s ?? '')).map((c) => (c.trim() === '' ? ' ' : c)).join('').split(' ').filter(Boolean).join(' ');
const slug = (path) => path.split('?')[0].split('#')[0].split('/').filter(Boolean).join('-') || 'root';
const tagOf = (c) => [c.section, c.route, c.viewer, c.state, c.locale, c.width].join('/');

/**
 * React 19’s DEV-only performance-track error, filed by its exact sentence as `qa:classic-shell-parity` files it: a
 * development build measures each render on the Performance timeline and throws when one is dated before the page’s
 * time origin. A production build has no such measure, so no player can meet it. It is listed beside the error line
 * and never failed; nothing else is set aside.
 */
const DEV_MEASURE = new RegExp(`^Failed to execute 'measure' on 'Performance': '` + String.fromCharCode(0x200b) + `?[A-Za-z0-9_$]+' cannot have a negative time stamp[.]$`);

// ── The bounds: the budget, the circuit breaker, the guard before every write, and the watchdog ────────────────────
/** When the cells began (the end of §0); the budget counts from here. */
let cellsFrom = null;
let failStreak = 0;
let serverGone = false;
/** Why nothing more may be opened, or null. */
function stopReason() {
  if (serverGone) return 'the server stopped answering: three page loads or requests in a row got no answer';
  if (cellsFrom !== null && Date.now() - cellsFrom > BUDGET_MIN * 60_000) return `the ${BUDGET_MIN}-minute budget for the cells (KP_BUDGET_MIN) is spent`;
  return null;
}
/** A page load or a request the server answered (whatever it said), or one it did not answer at all. */
function noteLoad(answered) {
  if (answered) {
    failStreak = 0;
    return;
  }
  failStreak += 1;
  if (failStreak >= 3) serverGone = true;
}

function summary() {
  say(NL + `qa:journey-shell — ${count.pass} passed · ${count.fail} failed · ${count.blocked} blocked · ${count.tiles} tiles in ${OUT} · ${((Date.now() - STARTED) / 60_000).toFixed(1)} min`);
  say('Green is not a read: open every tile, one by one, in the order of its number.');
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
  summary();
  await finish(2);
}
/**
 * Before anything that changes the server: the premise again (local, in memory, a rollout a pass can see), and the
 * server’s uptime held to the one this drive began on, so a restarted server, or another one now on the port, is
 * refused before the request is sent.
 */
async function guard(what) {
  const p = await premise(BASE);
  if (p.refuse) await refuseNow(`before ${what}: ${p.refuse}`);
  const up = Number(p.health?.uptimeSec);
  const floor = BOOT_UPTIME + Math.floor((Date.now() - BOOT_AT) / 1000) - 30;
  if (!Number.isFinite(up) || up < floor) {
    await refuseNow(`before ${what}: /api/health says the server has been up ${up} s, where the one this drive began on would say ${floor} s or more. It was restarted, or another server now answers at ${BASE}; nothing is sent to it`);
  }
}
const watchdog = setTimeout(() => {
  count.blocked += 1;
  say(`  BLOCKED the drive — the watchdog fired after ${WARM_MIN + BUDGET_MIN + 5} minutes (KP_WARM_MIN + KP_BUDGET_MIN + 5): a page, a request or the server stopped answering, and nothing after this line was read`);
  summary();
  void finish(count.fail > 0 ? 1 : 3);
}, (WARM_MIN + BUDGET_MIN + 5) * 60_000);

// ── Probes that run IN THE PAGE: real functions, never strings (live/clip.mjs records what a string costs, E-191) ───
/** The header that exists, the journey’s or the classic one, has hydrated: React has attached its fiber. */
const HYDRATED = () => {
  const el = document.querySelector(`header[data-testid='journey-top-bar']`) || document.querySelector('header.app-topbar');
  return !!el && Object.keys(el).some((k) => k.startsWith('__reactFiber$'));
};

/** Written before any script of the page runs, on every document of the context. */
const SEED_STORAGE = (pairs) => {
  try {
    for (const [key, value] of pairs) window.localStorage.setItem(key, value);
  } catch {
    // A context without storage: the checks that need a key report it themselves.
  }
};

/** The text of the page’s first h1 in its main landmark, or null when it has none. */
const HEADING_PROBE = () => {
  const h = document.querySelector('#main-content h1');
  return h ? h.textContent || '' : null;
};

/** A Next.js error dialog, in the page or inside the dev portal’s shadow root, or an error page’s own words. */
const NEXT_ERROR_PROBE = (signs) => {
  const text = document.body ? document.body.innerText || '' : '';
  let dialog = !!document.querySelector('[data-nextjs-dialog]');
  for (const portal of Array.from(document.querySelectorAll('nextjs-portal'))) {
    if (portal.shadowRoot && portal.shadowRoot.querySelector('[data-nextjs-dialog]')) dialog = true;
  }
  return { dialog, sign: signs.find((s) => text.includes(s)) || null };
};

/** Which chrome the page carries, whether the document scrolls sideways, and how many modal dialogs are drawn. */
const SHELL_PROBE = (markId) => {
  const shown = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
  };
  const n = (sel) => document.querySelectorAll(sel).length;
  const header = document.querySelector(`header[data-testid='journey-top-bar']`);
  return {
    journeyHeader: n(`header[data-testid='journey-top-bar']`),
    journeyTabs: n(`nav[data-testid='journey-tabs']`),
    railShown: shown(document.querySelector(`nav[data-testid='journey-tabs']`)),
    linksShown: shown(header ? header.querySelector('nav.kp-jnav') : null),
    mark: document.getElementById(markId) !== null,
    flag: document.documentElement.hasAttribute('data-journey'),
    marker: n(`[data-testid='journey-preview-marker']`),
    classicHeader: n('header.app-topbar') - n(`header.app-topbar[data-testid='journey-top-bar']`),
    classicCoin: n(`[data-testid='deposit-rail']`),
    docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    dialogs: Array.from(document.querySelectorAll(`[aria-modal='true']`)).filter(shown).length,
  };
};

/** Every destination of the tabs and of the desktop links, with what lights it. */
const TAB_PROBE = () => {
  const read = (el) => ({ tag: el.tagName, href: el.getAttribute('href'), on: el.hasAttribute('data-on'), current: el.getAttribute('aria-current') });
  const rail = document.querySelector(`nav[data-testid='journey-tabs']`);
  const links = document.querySelector(`header[data-testid='journey-top-bar'] nav.kp-jnav`);
  return {
    rail: rail ? Array.from(rail.querySelectorAll('li > .kp-rail__item')).map(read) : null,
    links: links ? Array.from(links.querySelectorAll('.kp-jnav__link')).map(read) : null,
  };
};

/** The computed ring of the element `sel` names, whether or not it has focus. */
const RING_PROBE = (sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const cs = getComputedStyle(el);
  return { style: cs.outlineStyle, width: cs.outlineWidth, offset: cs.outlineOffset, shadow: cs.boxShadow };
};

/** What has focus, whether it is the element `sel` names, and the ring it wears. */
const FOCUS_PROBE = (sel) => {
  const a = document.activeElement;
  if (!a || a === document.body) return null;
  const cs = getComputedStyle(a);
  return {
    isTarget: a === document.querySelector(sel),
    tag: a.tagName,
    testid: a.getAttribute('data-testid'),
    href: a.getAttribute('href'),
    visible: a.matches(':focus-visible'),
    style: cs.outlineStyle,
    width: cs.outlineWidth,
    offset: cs.outlineOffset,
    shadow: cs.boxShadow,
  };
};

/**
 * Puts focus, from script, on the control before `sel` in the tab order, so that ONE real Tab lands on `sel` with
 * keyboard focus (:focus-visible). Answers ok, or why it could not.
 */
const TAB_PREV = (sel) => {
  const target = document.querySelector(sel);
  if (!target) return 'no element matches';
  const tabbable = (el) => {
    if (el === target) return true;
    if (el.hasAttribute('disabled') || el.getAttribute('tabindex') === '-1') return false;
    if (el.tagName === 'INPUT' && el.getAttribute('type') === 'hidden') return false;
    if (el.closest('[inert]')) return false;
    const shut = el.closest('details:not([open])');
    if (shut && !(el.tagName === 'SUMMARY' && el.parentElement === shut)) return false;
    if (el.getClientRects().length === 0) return false;
    return getComputedStyle(el).visibility !== 'hidden';
  };
  const all = Array.from(document.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]')).filter(tabbable);
  const at = all.indexOf(target);
  if (at < 0) return 'the element is not in the tab order';
  for (let i = at - 1; i >= Math.max(0, at - 6); i -= 1) {
    all[i].focus();
    if (document.activeElement === all[i]) return 'ok';
  }
  return 'nothing before it takes focus';
};

const SHEET_OPEN = () => !!document.querySelector(`[role='dialog'][aria-modal='true'] .kp-jsheet__title`);

/** The guest’s Tiketi sheet: its title, whether the dialog is named by it, and its two doors. */
const SHEET_PROBE = () => {
  const d = Array.from(document.querySelectorAll(`[role='dialog'][aria-modal='true']`)).find((x) => x.querySelector('.kp-jsheet__title'));
  if (!d) return null;
  const title = d.querySelector('.kp-jsheet__title');
  const door = (id) => {
    const el = d.querySelector(`[data-testid='${id}']`);
    return el ? el.getAttribute('href') : null;
  };
  return { title: title.textContent || '', named: d.getAttribute('aria-labelledby') === title.id, signUp: door('tickets-guest-signup'), signIn: door('tickets-guest-signin') };
};

/** The Wallet: its name, its two money doors, and a held wallet’s notice. */
const WALLET_PROBE = () => {
  const sheet = document.querySelector(`[data-testid='wallet-sheet']`);
  const d = sheet ? sheet.closest(`[role='dialog']`) : null;
  if (!d) return null;
  const door = (id) => {
    const el = d.querySelector(`[data-testid='${id}']`);
    return el ? { href: el.getAttribute('href'), text: el.textContent || '' } : null;
  };
  const held = d.querySelector('.kp-wsheet__held');
  return {
    label: d.getAttribute('aria-label'),
    modal: d.getAttribute('aria-modal'),
    deposit: door('wallet-sheet-deposit'),
    withdraw: door('wallet-sheet-withdraw'),
    held: held ? { role: held.getAttribute('role'), text: held.textContent || '' } : null,
  };
};

/** The classic bell’s count (notifications-panel.tsx, its button’s data-unread): the journey header mounts it from 1024. */
const BELL_UNREAD = () => {
  const el = document.querySelector(`header[data-testid='journey-top-bar'] .kp-jhdr__bell [data-unread]`);
  return el ? Number(el.getAttribute('data-unread')) : null;
};
const BELL_AT_LEAST = (n) => {
  const el = document.querySelector(`header[data-testid='journey-top-bar'] .kp-jhdr__bell [data-unread]`);
  return !!el && Number(el.getAttribute('data-unread')) >= n;
};
const DOT_SHOWN = () => !!document.querySelector(`nav[data-testid='journey-tabs'] a[href='/account'] .kp-rail__badge`);
/** The Akaunti tab’s dot, and the count its sr-only words speak. */
const DOT_PROBE = () => {
  const tab = document.querySelector(`nav[data-testid='journey-tabs'] a[href='/account']`);
  if (!tab) return null;
  const spoken = tab.querySelector('.sr-only');
  const text = spoken ? spoken.textContent || '' : '';
  const digits = text.match(/[0-9]+/);
  return { dot: !!tab.querySelector('.kp-rail__badge'), text, n: digits ? Number(digits[0]) : null };
};
/** The Arifa row’s badge (count-badge.tsx, which renders nothing at 0 and reads 99+ above 99). */
const ARIFA_PROBE = (sel) => {
  const row = document.querySelector(sel);
  if (!row) return null;
  const badge = row.querySelector('.count-badge');
  const text = badge ? (badge.textContent || '').trim() : '';
  const digits = text.match(/[0-9]+/);
  return { badge: badge ? text : null, n: digits ? Number(digits[0]) : null, capped: text.endsWith('+') };
};

/** The Maswali | Juu/Chini switch: the section rail on the page that links both kinds. */
const SWITCH_PROBE = () => {
  const rail = Array.from(document.querySelectorAll('#main-content nav[data-section-rail]'))
    .find((nav) => nav.querySelector(`a[href='/positions']`) && nav.querySelector(`a[href='/updown/history']`));
  if (!rail) return null;
  return {
    label: rail.getAttribute('aria-label') || '',
    current: Array.from(rail.querySelectorAll(`a[aria-current='page']`)).map((a) => a.getAttribute('href')),
    tablist: rail.getAttribute('role') === 'tablist' || !!rail.querySelector(`[role='tablist']`),
  };
};

/** Tiketi zangu’s cards, and its empty state’s title, its link home and its exit links, white space taken out. */
const TICKETS_PROBE = () => {
  const page = document.getElementById('main-content');
  if (!page) return null;
  const squeezed = (s) => Array.from(String(s || '')).filter((c) => c.trim() !== '').join('');
  const empty = page.querySelector('[data-empty-state]');
  const title = empty ? empty.querySelector('p') : null;
  const links = empty ? Array.from(empty.querySelectorAll('a[href]')) : [];
  return {
    cards: page.querySelectorAll('article[data-row-id]').length,
    emptyTitle: title ? squeezed(title.textContent) : null,
    home: links.filter((a) => a.getAttribute('href') === '/').map((a) => squeezed(a.textContent)),
    exits: links.filter((a) => (a.getAttribute('href') || '').startsWith('/positions')).map((a) => squeezed(a.textContent)),
  };
};

/** The hub: who it is drawn for, and every door it lists. */
const HUB_PROBE = (sel) => {
  const hub = document.querySelector(sel);
  if (!hub) return null;
  const prompt = hub.querySelector('.kp-hub__prompt');
  const staff = hub.querySelector(`.kp-hub__card--staff a[href='/admin']`);
  return {
    id: !!hub.querySelector('.kp-hub__id'),
    exit: !!hub.querySelector('button.kp-hub__exit'),
    prompt: prompt ? prompt.textContent || '' : null,
    staff: staff ? staff.textContent || '' : null,
    rows: Array.from(hub.querySelectorAll('a.kp-hub__row')).map((a) => a.getAttribute('href') || ''),
  };
};

/** The hub walk: the first card (or the sign-out row) after block `after` that runs past what the viewport shows. */
const HUB_NEXT = ([sel, after]) => {
  const hub = document.querySelector(sel);
  if (!hub) return -1;
  const blocks = [...Array.from(hub.querySelectorAll('ul.kp-hub__card')), ...Array.from(hub.querySelectorAll('button.kp-hub__exit'))];
  const rail = document.querySelector(`nav[data-testid='journey-tabs']`);
  const railShown = !!rail && getComputedStyle(rail).display !== 'none';
  const bottom = railShown ? rail.getBoundingClientRect().top : window.innerHeight;
  for (let i = after + 1; i < blocks.length; i += 1) {
    const r = blocks[i].getBoundingClientRect();
    if (r.height > 0 && r.bottom > bottom + 1) return i;
  }
  return -1;
};
/** Scrolls the walk’s block `index` up under the sticky header; answers the page’s scroll offset afterwards. */
const HUB_SCROLL = ([sel, index]) => {
  const hub = document.querySelector(sel);
  if (!hub) return -1;
  const blocks = [...Array.from(hub.querySelectorAll('ul.kp-hub__card')), ...Array.from(hub.querySelectorAll('button.kp-hub__exit'))];
  const el = blocks[index];
  if (!el) return -1;
  const header = document.querySelector(`header[data-testid='journey-top-bar']`);
  const under = header ? header.getBoundingClientRect().height : 0;
  window.scrollTo({ top: Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY - under - 12)), left: 0, behavior: 'instant' });
  return Math.round(window.scrollY);
};

/** WP7’s three overlays at steady state: mounted, stood down, drawn. */
const OVERLAY_PROBE = (visitsKey) => {
  const drawn = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const root = document.getElementById('needle-root');
  const needle = root ? root.querySelector('#needle') : null;
  const bubble = document.querySelector('button.cm-bubble');
  const panel = document.querySelector(`[data-testid='channels-panel']`);
  let visits = null;
  try {
    visits = window.localStorage.getItem(visitsKey);
  } catch {
    visits = null;
  }
  return {
    needleRoot: !!root,
    needleMounted: !!needle,
    needleSuppressed: !!root && root.classList.contains('needle-suppressed'),
    needleShown: !!root && getComputedStyle(root).display !== 'none' && drawn(needle),
    bubble: !!bubble,
    bubbleShown: drawn(bubble),
    panel: !!panel,
    panelShown: drawn(panel),
    visits,
  };
};

/** From the document’s first frame: every frame that drew the Needle or the chat bubble (the flash WP7 measured). */
const FRAME_RECORDER = () => {
  const rec = { frames: 0, needle: 0, bubble: 0, firstNeedle: null, firstBubble: null };
  window.__kpFrames = rec;
  const drawn = (el) => {
    if (!el || el.getClientRects().length === 0) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0;
  };
  const tick = () => {
    rec.frames += 1;
    const root = document.getElementById('needle-root');
    const needle = root ? root.querySelector('#needle') : null;
    if (drawn(root) && drawn(needle)) {
      rec.needle += 1;
      if (rec.firstNeedle === null) rec.firstNeedle = rec.frames;
    }
    if (drawn(document.querySelector('button.cm-bubble'))) {
      rec.bubble += 1;
      if (rec.firstBubble === null) rec.firstBubble = rec.frames;
    }
    window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
};
const FRAMES_READ = () => window.__kpFrames || null;

/**
 * G1’s recorder: every frame from the document’s first, keeping each change of what the Akaunti dot and the Arifa
 * badge show, who the header is drawn for, and whether the session-ended notice is up. Soft navigations keep the
 * document, so one record spans A, the guest shell and B.
 */
const VIEWER_RECORDER = () => {
  const rec = { frames: 0, log: [], origin: performance.timeOrigin };
  window.__kpViewer = rec;
  let last = '';
  const num = (s) => {
    const m = String(s || '').match(/[0-9]+/);
    return m ? Number(m[0]) : null;
  };
  const tick = () => {
    rec.frames += 1;
    const tab = document.querySelector(`nav[data-testid='journey-tabs'] a[href='/account']`);
    const dot = tab ? tab.querySelector('.kp-rail__badge') : null;
    const spoken = tab ? tab.querySelector('.sr-only') : null;
    const badge = document.querySelector(`[data-testid='journey-account-hub'] a.kp-hub__row[href='/notifications'] .count-badge`);
    const capsule = document.querySelector(`[data-testid='journey-balance']`);
    const guest = document.querySelector(`header[data-testid='journey-top-bar'] .kp-jhdr__auth`);
    const spokenN = num(spoken ? spoken.textContent : '');
    const entry = {
      path: location.pathname,
      dot: dot ? (spokenN === null ? -1 : spokenN) : null,
      arifa: badge ? num(badge.textContent) : null,
      ended: !!document.querySelector(`[data-testid='session-ended-notice']`),
      who: capsule ? 'member' : guest ? 'guest' : 'none',
    };
    const key = JSON.stringify(entry);
    if (key !== last) {
      last = key;
      rec.log.push({ frame: rec.frames, t: Math.round(performance.now()), ...entry });
    }
    window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
};
const VIEWER_READ = () => window.__kpViewer || null;

// ── Pages ──────────────────────────────────────────────────────────────────────────────────────────────────────────
function watch(page, who) {
  page.on('pageerror', (e) => {
    const line = String(e?.message ?? e).split(NL)[0].trim();
    // A layout pass’s one benign browser notice; every other error a page throws is a finding.
    if (line.includes('ResizeObserver loop')) return;
    const where = `${who} ${page.url().split(BASE).join('')}`;
    if (DEV_MEASURE.test(line)) devOnly.push(`${where}: ${line.slice(0, 160)}`);
    else errors.push(`${where}: ${line.slice(0, 200)}`);
  });
  page.on('console', (m) => {
    const text = m.text();
    if (m.type() === 'error' && text.toLowerCase().includes('hydrat')) errors.push(`${who} ${page.url().split(BASE).join('')}, console: ${text.split(NL)[0].slice(0, 200)}`);
  });
}

/** Two frames and a beat: a resize’s layout, and what mounts on it, have landed. */
async function settle(page, ms = 300) {
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true)))));
  await page.waitForTimeout(ms);
}
async function resize(page, width) {
  const now = page.viewportSize();
  if (!now || now.width !== width) await page.setViewportSize(viewport(width));
  await settle(page, 320);
}
const toTop = (page) => page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
const intoView = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
  return !!el;
}, sel);

/**
 * A browser context for one viewer: its cookies, its storage seeds, and one page navigated route to route, so the dev
 * server’s scripts are fetched once per viewer and not once per page. `quiet` keeps the channels panel away (its 45 s
 * dwell would otherwise land on whichever tile happened to be on screen); §10 opens its own contexts without it.
 */
async function newViewer(name, cookies, { storage = [], quiet = true, recorder = null, width = 390 } = {}) {
  const ctx = await browser.newContext({ viewport: viewport(width), deviceScaleFactor: 1 });
  try {
    if (cookies.length > 0) await ctx.addCookies(cookies);
    await ctx.addInitScript(SEED_STORAGE, [[PRIMER_SEEN, '1'], ...(quiet ? [[CHANNELS_DONE, '1']] : []), ...storage]);
    if (recorder) await ctx.addInitScript(recorder);
    const page = await ctx.newPage();
    watch(page, name);
    return { name, ctx, page, locale: null };
  } catch (e) {
    await ctx.close().catch(() => {});
    throw e;
  }
}
const closeViewer = (v) => (v ? v.ctx.close().catch(() => {}) : Promise.resolve());

/**
 * Opens `path` for viewer `v` in `locale` at `width`: to its load event, its header hydrated, its fonts in, the dev
 * indicator hidden, `ready` attached. One PASS or FAIL line: it opened (below HTTP 400), in the language asked for,
 * with no Next.js error on it. Answers false, running nothing, when it did not open, and when the budget or the server
 * is gone (a BLOCKED line, by name).
 */
async function visit(v, path, { locale, width, ready = '#main-content h1', label }) {
  const why = stopReason();
  if (why) {
    blocked(`${label} · ${path}`, why);
    return false;
  }
  let status = 0;
  try {
    if (v.locale !== locale) {
      await v.ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }]);
      v.locale = locale;
    }
    await v.page.setViewportSize(viewport(width));
    const res = await v.page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: LOAD_MS });
    status = res ? res.status() : 0;
    noteLoad(true);
  } catch (e) {
    noteLoad(false);
    ok(`${label} · ${path} opens`, false, msg(e));
    return false;
  }
  try {
    await v.page.waitForFunction(HYDRATED, null, { timeout: HYDRATE_MS });
    await v.page.evaluate(() => document.fonts.ready.then(() => true));
    await v.page.addStyleTag({ content: DEV_OVERLAY_OFF }).catch(() => {});
    await v.page.waitForSelector(ready, { state: 'attached', timeout: 30_000 }).catch(() => {});
    await settle(v.page, 400);
  } catch (e) {
    ok(`${label} · ${path} hydrates (HTTP ${status})`, false, msg(e));
    return false;
  }
  const lang = await v.page.evaluate(() => (document.documentElement.getAttribute('lang') || '').toLowerCase());
  const broken = await v.page.evaluate(NEXT_ERROR_PROBE, NEXT_ERROR_SIGNS);
  ok(`${label} · ${path} opened (HTTP ${status}) in ${locale} (html lang ${lang || 'none'}), with no Next.js error overlay or error page`,
    status > 0 && status < 400 && lang.startsWith(locale) && !broken.dialog && !broken.sign,
    broken.dialog || broken.sign ? JSON.stringify(broken) : '');
  return true;
}

/** Escape closes a kit dialog (`Modal`’s onKey); the focus it hands back to its trigger is let go, so no later tile wears a ring nobody asked for. */
async function closeDialog(page) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForFunction(() => document.querySelectorAll(`[aria-modal='true']`).length === 0, null, { timeout: 10_000 }).catch(() => {});
  await page.evaluate(() => {
    const a = document.activeElement;
    if (a && a !== document.body && typeof a.blur === 'function') a.blur();
  });
  await settle(page, 250);
}

/** The capsule opens the Wallet (a bottom sheet below 1024, a panel under the capsule from 1024). */
async function openWallet(page) {
  try {
    await page.locator(CAPSULE).first().click({ timeout: 15_000 });
    await page.locator(`[data-testid='wallet-sheet']`).first().waitFor({ timeout: 15_000 });
    await settle(page, 600);
    return true;
  } catch {
    return false;
  }
}

/** A guest’s Tiketi zangu opens the guest sheet: the rail’s button below 1024, the desktop link’s from 1024. Answers the trigger, or null. */
async function openGuestSheet(page, width) {
  const trigger = width < 1024 ? `${RAIL} button[aria-haspopup='dialog']` : `${JOURNEY_BAR} nav.kp-jnav button[aria-haspopup='dialog']`;
  try {
    await page.locator(trigger).first().click({ timeout: 15_000 });
    await page.waitForFunction(SHEET_OPEN, null, { timeout: 15_000 });
    await settle(page, 600);
    return trigger;
  } catch {
    return null;
  }
}

// ── Fixtures, through dev-test routes that exist, each behind the guard ────────────────────────────────────────────
async function getStatus(path, cookies, timeout) {
  const ctx = await browser.newContext();
  try {
    if (cookies.length > 0) await ctx.addCookies(cookies);
    const res = await ctx.request.get(`${BASE}${path}`, { timeout, maxRedirects: 0 });
    return String(res.status());
  } catch (e) {
    return `no answer (${msg(e)})`;
  } finally {
    await ctx.close().catch(() => {});
  }
}

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

/** A session from POST /api/dev-test/seed-admin (roles ADMIN to PLAYER; a new phone gets `password`): it sets the cookie it returns. */
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

/** The demo player through /auth/demo (and seed-wallet for a balance), behind the guard: each call ends the last session. */
async function demo(query, balance, what) {
  await guard(`signing the demo player in: ${what}`);
  return demoSession(browser, BASE, { query, balance });
}

/** §0’s page warm-up, one GET per route, timed, until its budget is spent; it also reads the board’s first round. */
async function warmPages(cookies, warmLeft) {
  const ctx = await browser.newContext();
  try {
    await ctx.addCookies([...cookies, { name: LOCALE_COOKIE, value: 'sw', url: BASE }]);
    const Q = String.fromCharCode(34);
    const paths = [...WARM_PATHS];
    const held = realMarkets.find((m) => SEEDED_TITLES.some((s) => s.en === m.title));
    if (held) paths.push(`/markets/${held.id}`);
    for (let i = 0; i < paths.length; i += 1) {
      if (warmLeft() <= 0) {
        say(`  · the warm-up stopped at its ${WARM_MIN} minutes (KP_WARM_MIN): ${paths.slice(i).join(' ')} compile when a cell first opens them`);
        return;
      }
      const path = paths[i];
      const t0 = Date.now();
      const res = await ctx.request.get(`${BASE}${path}`, { timeout: 240_000, maxRedirects: 0 }).catch(() => null);
      say(`  · warm ${path}: ${res ? res.status() : 'no answer'} in ${secs(t0)} s`);
      if (path === '/updown' && res && !roundPath) {
        const html = await res.text().catch(() => '');
        const tail = html.split(`href=${Q}/updown/udr_`)[1];
        if (tail) {
          roundPath = `/updown/udr_${tail.split(Q)[0].split('?')[0].split('#')[0]}`;
          paths.push(roundPath);
        }
      }
    }
  } finally {
    await ctx.close().catch(() => {});
  }
}

/** A question this drive knows in all three languages: one the demo player holds open, else one no fixture settled. */
function heldQuestion() {
  const titleOf = new Map(realMarkets.map((m) => [m.id, m.title]));
  const settled = new Set((portfolio.marketIds ?? []).slice(6));
  const ids = [...(portfolio.marketIds ?? []).slice(0, 4), ...realMarkets.map((m) => m.id).filter((id) => !settled.has(id))];
  for (const id of ids) {
    const t = SEEDED_TITLES.find((s) => s.en === titleOf.get(id));
    if (t) return { id, ...t };
  }
  return null;
}

/**
 * The demo player for every signed-in section, set up ONCE and after the header’s states (one account): TZS 250,000,
 * then seed-player-portfolio through the real money paths. Its plan (seed-player-portfolio/route.ts) is 4 open, 2
 * sold, 3 won, 2 lost and 1 refunded over 12 live questions, which §0’s seed-markets provides; every bet writes a
 * bet-placed notification (market-service.ts, `buyPosition`’s inbox receipt), the inbox the dot and Arifa are judged on.
 */
async function ensureMain() {
  if (mainReady !== null) return mainReady;
  mainReady = false;
  say('  · the demo player for the signed-in sections: TZS 250,000, then seed-player-portfolio through the real money paths');
  try {
    main = await demo('?deposit=0', 250_000, 'the demo player at TZS 250,000');
  } catch (e) {
    ok('P.1 the demo player is signed in at TZS 250,000', false, msg(e));
    return false;
  }
  const sp = await post('/api/dev-test/seed-player-portfolio', {}, [main]);
  portfolio = sp.body ?? {};
  const by = portfolio.byStatus ?? {};
  ok(`P.1 seed-player-portfolio: tickets ${JSON.stringify(by)}, ${portfolio.updownPlaced ?? 0} on Up & Down, ${(portfolio.refusals ?? []).length} refusal(s)`,
    sp.ok && portfolio.ok === true && (by.OPEN ?? 0) >= 1, sp.ok ? (portfolio.refusals ?? []).slice(0, 3).join(' | ') : `HTTP ${sp.status} ${portfolio.error ?? sp.error ?? ''}`);
  const short = ['WIN', 'LOSS', 'VOID'].filter((s) => !((by[s] ?? 0) >= 1));
  if (short.length === 0) {
    outcomeShortfall = null;
    ok('P.2 the settled lens will hold a won, a lost and a refunded ticket', true, `WIN ${by.WIN} · LOSS ${by.LOSS} · VOID ${by.VOID}`);
  } else {
    outcomeShortfall = `seed-player-portfolio left no ${short.join(', no ')} ticket over ${(portfolio.marketIds ?? []).length} questions (a loss needs 10 live questions and a refund 12: did seed-markets run in §0?)`;
    say(`  · ${outcomeShortfall}`);
  }
  try {
    mainV = await newViewer('player', [pass, main]);
  } catch (e) {
    ok('P.3 a browser context for the demo player', false, msg(e));
    return false;
  }
  mainReady = true;
  return true;
}

// ── Checks ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** What is wrong with a header state on the page, or null: header-fit’s own expectations (`expectState`), plus the pill. */
async function stateProblem(page, st) {
  const capsule = page.locator(CAPSULE);
  if (!st.signedIn) {
    const pills = await page.locator(`${JOURNEY_BAR} .kp-jhdr__auth`).count();
    const capsules = await capsule.count();
    return pills === 2 && capsules === 0 ? null : `${pills} sign-in pill(s) and ${capsules} capsule(s), not Ingia and Jisajili and no capsule`;
  }
  await capsule.first().waitFor({ timeout: 60_000 }).catch(() => {});
  if ((await capsule.count()) !== 1) return 'no balance capsule in the journey header: did the session count?';
  if (st.held && (await capsule.first().getAttribute('data-held')) === null) return 'the capsule is not held: did ?hold=officer land?';
  if (st.masked) {
    await page.waitForFunction((sel) => {
      const el = document.querySelector(sel);
      return !!el && el.hasAttribute('data-masked');
    }, CAPSULE, { timeout: 30_000 }).catch(() => {});
    if ((await capsule.first().getAttribute('data-masked')) === null) return 'the capsule is not masked: did cashHidden land?';
  }
  if (st.figure && !st.masked) {
    const name = (await capsule.first().getAttribute('aria-label')) ?? '';
    if (!name.includes(st.figure)) return `the capsule is named ${name}, without ${st.figure}`;
  }
  const pills = await page.locator(PILL).count();
  if (st.held ? pills !== 0 : pills !== 1) return `${pills} gold pill(s): ${st.held ? 'none belongs on a held wallet' : 'one belongs here'}`;
  return null;
}

/** What is wrong with the page’s h1 against what its source renders for this locale, or null. */
function headingProblem(found, spec, locale) {
  if (found === null) return 'no h1 in #main-content';
  const words = [].concat(spec?.words?.[locale] ?? []);
  if (words.length === 0) return `no h1 is written down for ${locale}`;
  const got = squeeze(found);
  const hit = words.some((w) => (spec.mode === 'has' ? got.includes(squeeze(w)) : got === squeeze(w)));
  return hit ? null : `the h1 reads ${fold(found).slice(0, 80)}, not ${spec.mode === 'has' ? 'holding ' : ''}${words.join(' or ')}`;
}

/** What is wrong with the lit destination, or null. On the tabs the tabs’ own mark (data-on) must agree with aria-current. */
function judgeTabs(items, want, where, rail) {
  if (!Array.isArray(items)) return `no ${where} on the page`;
  if (items.length !== 4) return `${where} hold ${items.length} destinations, not 4`;
  const lit = items.filter((i) => i.on || i.current !== null);
  if (want === null) return lit.length === 0 ? null : `${where}: ${lit.length} lit on a page no tab owns`;
  if (lit.length !== 1) return `${where}: ${lit.length} lit (${lit.map((i) => i.href ?? i.tag).join(', ')}), not exactly one`;
  const it = lit[0];
  if (it.tag === 'BUTTON') return want.tab === 'tickets' ? null : `${where}: a guest’s Tiketi button is lit, not ${want.href}`;
  if (it.href !== want.href) return `${where}: ${it.href} is lit, not ${want.href}`;
  if (it.current !== want.current) return `${where}: ${it.href} says aria-current=${it.current}, not ${want.current}`;
  if (rail && !it.on) return `${where}: ${it.href} has aria-current but not the tabs’ data-on`;
  return null;
}

/**
 * The chrome, the active tab, the controls past the edge and, at 320, the tab labels, for one cell at its width.
 * The edge is CLIP_PROBE’s rule (a control past the viewport with nothing that scrolls it into view): over the
 * journey header, the tabs below 1024, the main landmark and an open sheet; over the whole body for the classic
 * chrome, as landmark-seal.mjs sweeps it. The document’s width is only a backstop, since html and body clip.
 */
async function checkShell(page, cell, { journey, dialog = false }) {
  const tag = tagOf(cell);
  const s = await page.evaluate(SHELL_PROBE, SHELL_MARK_ID);
  const seen = JSON.stringify({ header: s.journeyHeader, tabs: s.journeyTabs, mark: s.mark, flag: s.flag, marker: s.marker, classic: s.classicHeader, coin: s.classicCoin, railShown: s.railShown, linksShown: s.linksShown });
  const backstop = s.docOverflow > 0 ? `the document is ${s.docOverflow}px wider than the viewport` : '';
  if (!journey) {
    ok(`${tag} · the classic chrome: the classic bar, rail and coin; no journey header, tabs, mark, flag or preview marker`,
      s.journeyHeader === 0 && s.journeyTabs === 0 && !s.mark && !s.flag && s.marker === 0 && s.classicHeader === 1 && s.classicCoin === 1, seen);
    const clipped = await page.evaluate(CLIP_PROBE, 'body');
    ok(`${tag} · no control past the viewport edge anywhere in the body (the document’s own width is a backstop)`,
      clipped.length === 0 && s.docOverflow <= 0, [...clipped, backstop].filter(Boolean).join(' · '));
    return;
  }
  const below = cell.width < 1024;
  ok(`${tag} · the journey chrome: its header and the shell’s mark, ${below ? 'the four tabs on screen' : 'the desktop links on screen and the tabs not'}, no classic bar`,
    s.journeyHeader === 1 && s.journeyTabs === 1 && s.mark && s.classicHeader === 0 && (below ? s.railShown && !s.linksShown : s.linksShown && !s.railShown), seen);
  const want = expectedTab(cell.pathname);
  const t = await page.evaluate(TAB_PROBE);
  const wrongTab = judgeTabs(below ? t.rail : t.links, want, below ? 'the tabs' : 'the desktop links', below);
  ok(`${tag} · the active tab: ${want ? `${want.tab} lit, aria-current=${want.current}` : 'none lit'}`, wrongTab === null, wrongTab ?? '');
  const scopes = [JOURNEY_BAR, ...(below ? [RAIL] : []), '#main-content', ...(dialog ? [OPEN_DIALOG] : [])];
  const clipped = [];
  for (const scope of scopes) {
    if ((await page.locator(scope).count()) === 0) continue;
    for (const line of await page.evaluate(CLIP_PROBE, scope)) clipped.push(`${scope}: ${line}`);
  }
  ok(`${tag} · no control past the viewport edge in the header${below ? ', the tabs' : ''}, the main landmark${dialog ? ' or the open sheet' : ''} (the document’s own width is a backstop)`,
    clipped.length === 0 && s.docOverflow <= 0, [...clipped, backstop].filter(Boolean).join(' · '));
  if (cell.width === 320) {
    const labels = (await page.evaluate(RAIL_PROBE)) ?? [];
    const cut = labels.filter((l) => l.cut || l.offscreen);
    ok(`${tag} · the four tab labels whole at 320: ${labels.map((l) => `${l.text} (${l.lines} line${l.lines === 1 ? '' : 's'})`).join(', ')}`,
      labels.length === 4 && cut.length === 0, cut.map((l) => `${l.text}${l.cut ? ' cut' : ''}${l.offscreen ? ' off screen' : ''}`).join(' · '));
  }
}

/**
 * ONE TILE: the page’s h1 is read and held to `spec` FIRST (and, for a page under no dialog, nothing modal may cover
 * it); then the VIEWPORT is written, never the full page, named by its number, section, route, viewer, state, locale
 * and width. A wrong page fails the line and is still written, with a WRONG-PAGE suffix, so it can be looked at.
 */
async function shoot(page, cell, spec, { dialog = false, dialogProblem = null } = {}) {
  const found = await page.evaluate(HEADING_PROBE);
  const problems = [];
  const wrong = headingProblem(found, spec, cell.locale);
  if (wrong) problems.push(wrong);
  if (dialogProblem) problems.push(dialogProblem);
  if (!dialog) {
    const s = await page.evaluate(SHELL_PROBE, SHELL_MARK_ID);
    if (s.dialogs > 0) problems.push(`${s.dialogs} open dialog(s) cover the page`);
  }
  seq += 1;
  const file = `${[String(seq).padStart(3, '0'), cell.section, cell.route, cell.viewer, cell.state, cell.locale, cell.width].join('--')}${wrong ? '--WRONG-PAGE' : ''}.png`;
  await settle(page, 150);
  try {
    await page.screenshot({ path: join(OUT, file), fullPage: false, caret: 'initial', timeout: 30_000 });
    count.tiles += 1;
  } catch (e) {
    problems.push(`no screenshot: ${msg(e)}`);
  }
  ok(`${tagOf(cell)} · TILE ${file} (h1: ${fold(found ?? '').slice(0, 60)})`, problems.length === 0, problems.join('; '));
}

/**
 * A viewer without a pass is served no hub on /account: HTTP 200 (the root loader has streamed) with the not-found
 * page’s noindex, nofollow (A2, A3; the parity harness names it account-robots-noindex), and no hub, beside the
 * control that makes the absence mean something: the same request WITH the pass is served the hub.
 */
async function noHub(vw) {
  const get = async (cookies) => {
    const ctx = await browser.newContext();
    try {
      if (cookies.length > 0) await ctx.addCookies(cookies);
      const res = await ctx.request.get(`${BASE}/account`, { timeout: LOAD_MS });
      return { status: res.status(), html: await res.text() };
    } finally {
      await ctx.close().catch(() => {});
    }
  };
  try {
    const plain = await get(vw.cookies);
    const noindex = plain.html.includes('noindex, nofollow');
    const hub = plain.html.includes('journey-account-hub');
    ok(`classic/account/${vw.id} · /account without a pass: HTTP 200, the not-found page’s noindex, nofollow, and no hub`,
      plain.status === 200 && noindex && !hub, `HTTP ${plain.status}, noindex nofollow ${noindex}, hub ${hub}`);
    if (!pass) {
      blocked(`classic/account/${vw.id} · the control`, 'no staff preview pass (see 0.1)');
      return;
    }
    const control = await get([pass, ...vw.cookies]);
    ok(`classic/account/${vw.id} · the control: the same request WITH the pass is served the hub`, control.status === 200 && control.html.includes('journey-account-hub'), `HTTP ${control.status}`);
  } catch (e) {
    ok(`classic/account/${vw.id} · /account answers`, false, msg(e));
  }
}

/**
 * One focus cell: the target’s ring at rest, then focus on the control before it, one real Tab, and the ring it
 * wears: :focus-visible, a 2px solid outline at `offset` (globals.css: the `:where(a, button, …):focus-visible`
 * catch-all, `.btn:focus-visible` and motion.css’s `.gilt-metal:focus-visible` at 2px; `.kp-hub__card`’s rows at -2px),
 * and a ring that was not drawn at rest. A box-shadow alone is never a ring: the capsule and the gilt pill wear one at rest.
 */
async function focusStep(page, cell, step) {
  await page.mouse.move(2, Math.round(viewport(cell.width).height / 2)).catch(() => {});
  const rest = await page.evaluate(RING_PROBE, step.sel);
  const placed = await page.evaluate(TAB_PREV, step.sel);
  let f = null;
  if (placed === 'ok') {
    await page.keyboard.press('Tab');
    await settle(page, 260);
    f = await page.evaluate(FOCUS_PROBE, step.sel);
  }
  const changed = !!rest && !!f && (rest.style !== f.style || rest.width !== f.width || rest.offset !== f.offset || rest.shadow !== f.shadow);
  const ring = !!f && f.isTarget && f.visible && f.style === 'solid' && f.width === '2px' && f.offset === step.offset && changed;
  ok(`${tagOf(cell)} · Tab lands on ${step.what} with a :focus-visible ring, a 2px solid outline at ${step.offset} not drawn at rest`,
    ring, placed !== 'ok' ? `could not put focus before it: ${placed}` : ring ? `${f.style} ${f.width} at ${f.offset}` : JSON.stringify({ rest, focused: f }));
}

/** The Arifa row and its badge in view, judged and tiled; answers what the badge read. */
async function arifaTile(page, locale, width) {
  const cell = { section: 'unread', route: 'account', pathname: '/account', viewer: 'player', state: 'arifa', locale, width };
  await page.waitForFunction((sel) => !!document.querySelector(`${sel} .count-badge`), ARIFA, { timeout: 20_000 }).catch(() => {});
  const row = await page.evaluate(ARIFA_PROBE, ARIFA);
  ok(`${tagOf(cell)} · the Arifa row carries its unread badge (${row ? row.badge ?? 'no badge' : 'no Arifa row'})`, !!row && Number.isFinite(row.n) && row.n >= 1);
  await intoView(page, ARIFA);
  await settle(page, 250);
  await checkShell(page, cell, { journey: true });
  await shoot(page, cell, HEAD.account);
  return row;
}

/** The hub, screen by screen: its top, then each card (or the sign-out row) the last screen did not show whole. */
async function hubWalk(page, base) {
  await toTop(page);
  await settle(page, 200);
  const top = { ...base, state: 'hub-top' };
  await checkShell(page, top, { journey: true });
  await shoot(page, top, HEAD.account);
  let after = -1;
  let lastY = 0;
  for (let step = 2; step <= 7; step += 1) {
    const next = await page.evaluate(HUB_NEXT, [HUB, after]);
    if (next < 0) break;
    const y = await page.evaluate(HUB_SCROLL, [HUB, next]);
    await settle(page, 250);
    // The page cannot scroll further: the last screen already showed the rest.
    if (y <= lastY) break;
    lastY = y;
    after = next;
    const cell = { ...base, state: `hub-${step}` };
    await checkShell(page, cell, { journey: true });
    await shoot(page, cell, HEAD.account);
  }
}

/** A held wallet’s Wallet, opened from its capsule: the frozen notice, and neither money door (wallet-sheet.tsx, its held branch). */
async function heldWallet(page, st, locale) {
  await resize(page, 390);
  await toTop(page);
  const cell = { section: 'header', route: 'root', pathname: '/', viewer: st.viewer, state: 'held-wallet', locale, width: 390 };
  const w = (await openWallet(page)) ? await page.evaluate(WALLET_PROBE) : null;
  const frozen = !!w && !!w.held && squeeze(w.held.text).includes(squeeze(W.frozen[locale]));
  ok(`${tagOf(cell)} · the held capsule opens a Wallet that says ${W.frozen[locale]} (role=status) and offers neither Weka pesa nor Toa pesa`,
    frozen && w.held.role === 'status' && !w.deposit && !w.withdraw, JSON.stringify(w));
  await checkShell(page, cell, { journey: true, dialog: true });
  await shoot(page, cell, HEAD.home, { dialog: true, dialogProblem: w ? null : 'no Wallet is open' });
  await closeDialog(page);
}

/** The header on the deposit screen (`journeyHeaderState`: no gilt pill there), with Akaunti lit as the screen’s section. */
async function depositScreen(v, st) {
  const label = `header/wallet-deposit/${st.viewer}/${st.id}/sw`;
  if (!(await visit(v, '/wallet/deposit', { locale: 'sw', width: 320, label }))) return;
  const pills = await v.page.locator(PILL).count();
  const capsules = await v.page.locator(CAPSULE).count();
  ok(`${label} · the deposit screen keeps the capsule and draws no gold + Weka pesa`, pills === 0 && capsules === 1, `${pills} pill(s), ${capsules} capsule(s)`);
  for (const width of [320, 390, 1280]) {
    await resize(v.page, width);
    await toTop(v.page);
    const cell = { section: 'header', route: 'wallet-deposit', pathname: '/wallet/deposit', viewer: st.viewer, state: `${st.id}-deposit-screen`, locale: 'sw', width };
    await checkShell(v.page, cell, { journey: true });
    await shoot(v.page, cell, PAGE_HEADINGS['/wallet/deposit']);
  }
}

/** One Tiketi zangu state: the switch, the cards or the empty state it must show, and its tiles. */
async function ticketState(v, viewer, st) {
  if (st.why) {
    blocked(`tickets/${st.id}`, st.why);
    return;
  }
  const widths = st.widths ?? TICKET_WIDTHS;
  for (const locale of st.locales ?? LOCALES) {
    const label = `tickets/${st.route}/${viewer}/${st.id}/${locale}`;
    if (!(await visit(v, st.path, { locale, width: widths[0], ready: st.cards ? 'article[data-row-id]' : '#main-content h1', label }))) continue;
    const page = v.page;
    const rail = await page.evaluate(SWITCH_PROBE);
    ok(`${label} · the Maswali | Juu/Chini switch: a nav named ${W.kindAria[locale]}, ${st.kind} the current page, no tablist`,
      !!rail && squeeze(rail.label) === squeeze(W.kindAria[locale]) && rail.current.length === 1 && rail.current[0] === st.kind && !rail.tablist,
      JSON.stringify(rail));
    const tp = await page.evaluate(TICKETS_PROBE);
    if (st.cards) ok(`${label} · ${tp ? tp.cards : 0} ticket card(s) on the ${st.id} lens`, !!tp && tp.cards >= 1);
    if (st.empty === 'first') {
      ok(`${label} · no card, and the empty state says ${W.emptyOpen[locale]} with ${W.browse[locale]} back to /`,
        !!tp && tp.cards === 0 && tp.emptyTitle === squeeze(W.emptyOpen[locale]) && tp.home.includes(squeeze(W.browse[locale])), JSON.stringify(tp));
    }
    if (st.empty === 'lens') {
      ok(`${label} · no card; the empty Won lens says ${W.emptyWon[locale]} and offers ${W.exitLens[locale]} (n) back to the whole list`,
        !!tp && tp.cards === 0 && tp.emptyTitle === squeeze(W.emptyWon[locale]) && tp.exits.some((x) => x.startsWith(squeeze(W.exitLens[locale]))), JSON.stringify(tp));
    }
    for (const width of widths) {
      await resize(page, width);
      await toTop(page);
      const cell = { section: 'tickets', route: st.route, pathname: st.path.split('?')[0], viewer, state: st.id, locale, width };
      await checkShell(page, cell, { journey: true });
      await shoot(page, cell, HEAD.tickets);
    }
  }
}

/** The active tab, route by route, for one viewer (sw): a hub cell adds the hub’s doors to the list, a board cell reads its round. */
async function tabTour(v, viewer, widths, list) {
  const cells = [...list];
  const seen = new Set(cells.map((c) => (typeof c.path === 'string' ? c.path : c.route)));
  for (let i = 0; i < cells.length; i += 1) {
    const c = cells[i];
    const path = typeof c.path === 'function' ? c.path() : c.path;
    const name = `tabs/${c.route}/${viewer}/sw`;
    if (!path) {
      blocked(name, c.why ?? 'no path');
      continue;
    }
    const pathname = path.split('?')[0].split('#')[0];
    const heading = c.heading ?? PAGE_HEADINGS[pathname] ?? null;
    if (!heading) {
      blocked(name, `no h1 is written down for ${pathname}: read it from the page’s source and add it to PAGE_HEADINGS`);
      continue;
    }
    if (!(await visit(v, path, { locale: 'sw', width: widths[0], ready: c.discover === 'hub' ? HUB : '#main-content h1', label: name }))) continue;
    const page = v.page;
    if (c.discover === 'hub') {
      const hub = await page.evaluate(HUB_PROBE, HUB);
      const doors = [...new Set((hub ? hub.rows : []).map((r) => r.split('#')[0].split('?')[0]).filter((r) => r.startsWith('/') && r !== '/admin'))];
      for (const d of doors) hubDoorsSeen.add(d);
      ok(`${name} · the ${viewer}’s hub lists ${doors.length} doors, each tiled below: ${doors.join(' ')}`, doors.length > 0);
      for (const d of doors) {
        if (seen.has(d)) continue;
        seen.add(d);
        cells.push({ path: d, route: slug(d) });
      }
    }
    if (c.discover === 'round') {
      const href = await page.evaluate(() => {
        const a = document.querySelector(`#main-content a[href^='/updown/udr_']`);
        return a ? a.getAttribute('href') : null;
      });
      if (href) roundPath = href.split('?')[0].split('#')[0];
      say(`  · the board’s first round: ${roundPath ?? 'none'}`);
    }
    for (const width of widths) {
      await resize(page, width);
      await toTop(page);
      const cell = { section: 'tabs', route: c.route, pathname, viewer, state: 'active-tab', locale: 'sw', width };
      await checkShell(page, cell, { journey: true });
      await shoot(page, cell, heading);
    }
  }
}

/**
 * G1’s verdict over the recorder’s states. A: before the guest shell drew (A’s own shell may show A’s count for as
 * long as it is on screen). G: from the guest shell to B’s first signed-in state, where no count at all belongs. B:
 * after it, where A’s count must never appear on the dot or the Arifa row.
 */
function judgeViewer(log, aCounts, tEnd) {
  const gIdx = log.findIndex((e) => e.t >= tEnd && e.who !== 'member');
  const bIdx = gIdx < 0 ? -1 : log.findIndex((e, i) => i > gIdx && e.who === 'member');
  const before = log.slice(0, gIdx < 0 ? log.length : gIdx);
  const guestPhase = gIdx < 0 ? [] : log.slice(gIdx, bIdx < 0 ? log.length : bIdx);
  const bPhase = bIdx < 0 ? [] : log.slice(bIdx);
  const showsA = (e) => aCounts.has(e.dot) || aCounts.has(e.arifa);
  const showsAny = (e) => e.dot !== null || e.arifa !== null;
  const shown = (list) => JSON.stringify(list.slice(0, 4));
  const aList = [...aCounts].join(' or ');
  ok(`viewer · the frames saw A’s ${aList} before the change (${before.length} states)`, before.some(showsA), shown(before.filter(showsA)));
  ok(`viewer · from A’s guest shell to B’s sign-in, no frame of the dot or the Arifa row shows any count (${guestPhase.length} states)`,
    gIdx >= 0 && !guestPhase.some(showsAny), gIdx < 0 ? 'the guest shell never drew' : shown(guestPhase.filter(showsAny)));
  const bShown = [...new Set(bPhase.flatMap((e) => [e.dot, e.arifa]).filter((n) => n !== null))];
  ok(`viewer · after B signs in, no frame shows A’s ${aList} on the dot or the Arifa row (B’s own count shown: ${bShown.length ? bShown.join(', ') : 'none'})`,
    bIdx >= 0 && !bPhase.some(showsA), bIdx < 0 ? 'B never showed as signed in' : shown(bPhase.filter(showsA)));
}

async function section(id, title, fn) {
  if (!runs(id)) return;
  say(NL + title);
  const why = stopReason();
  if (why) {
    blocked(id, why);
    return;
  }
  if (id !== 'classic' && !pass) {
    blocked(id, 'no staff preview pass (see 0.1)');
    return;
  }
  const t0 = Date.now();
  try {
    await fn();
  } catch (e) {
    ok(`${id} · the section ran to its end`, false, msg(e));
  }
  say(`  · ${id}: ${Math.round((Date.now() - t0) / 1000)} s`);
}

// ── §0 · the warm-up, the pass, the seeds ──────────────────────────────────────────────────────────────────────────
async function setup() {
  say(NL + '§0 · the server warmed, a staff preview pass, and the questions and rounds the signed-in sections read');
  const warmFrom = Date.now();
  const warmLeft = () => warmFrom + WARM_MIN * 60_000 - Date.now();
  for (const route of DEV_ROUTES) {
    if (warmLeft() <= 0) break;
    const t0 = Date.now();
    say(`  · warm ${route}: ${await getStatus(route, [], 300_000)} in ${secs(t0)} s (a POST-only route answers 405 and runs nothing)`);
  }
  try {
    await guard('minting the staff preview pass');
    pass = await mintStaffPass(browser, BASE);
    ok('0.1 a SUPPORT officer turned their preview on at /admin/journey, and the pass is in hand', true);
  } catch (e) {
    ok('0.1 a staff preview pass', false, msg(e));
  }
  if (PLAYER_SECTIONS.some(runs)) {
    const rm = await post('/api/dev-test/seed-real-markets', {});
    realMarkets = Array.isArray(rm.body?.live) ? rm.body.live : [];
    ok(`0.2 seed-real-markets: ${realMarkets.length} live questions, six of them with Swahili and Chinese titles`, rm.ok && realMarkets.length >= 5, rm.ok ? '' : `HTTP ${rm.status} ${rm.error ?? ''}`);
    const cat = await post('/api/dev-test/seed-markets', {});
    const live = Number(cat.body?.live ?? 0);
    ok(`0.3 seed-markets: the real catalogue (no Demo prefix), ${live} live questions, at least the 12 a won, a lost and a refunded ticket need`, cat.ok && live >= 12, cat.ok ? '' : `HTTP ${cat.status} ${cat.error ?? ''}`);
    const ud = await post('/api/dev-test/updown-seed', { durations: [5, 15], assets: ['BTC'] });
    ok('0.4 updown-seed: a running Bitcoin chain, 5 and 15 minutes', ud.ok && ud.body?.ok === true, ud.ok ? (ud.body?.notes ?? []).join(' · ') : `HTTP ${ud.status} ${ud.error ?? ''}`);
  }
  if (!pass) return;
  let warmSession = null;
  try {
    warmSession = await demo('', null, 'a throwaway session, so the warm-up compiles the protected pages instead of their redirects');
  } catch (e) {
    say(`  · no demo session for the warm-up (${msg(e)}): the protected pages compile when a cell first opens them`);
  }
  await warmPages([pass, ...(warmSession ? [warmSession] : [])], warmLeft);
}

// ── §1 · classic ───────────────────────────────────────────────────────────────────────────────────────────────────
async function classicSection() {
  if (ROLLOUT !== 'STAFF_PREVIEW') {
    blocked('classic', `the rollout is ${ROLLOUT}: only under STAFF_PREVIEW does a viewer without a pass keep the classic chrome`);
    return;
  }
  const viewers = [{ id: 'nopass-guest', cookies: [] }];
  try {
    viewers.push({ id: 'nopass-player', cookies: [await demo('', null, 'the demo player, with no pass')] });
  } catch (e) {
    ok('classic · the demo player is signed in, with no pass', false, msg(e));
  }
  for (const vw of viewers) {
    await noHub(vw);
    const v = await newViewer(vw.id, vw.cookies);
    try {
      for (const locale of LOCALES) {
        if (!(await visit(v, '/', { locale, width: PHONE_DESK[0], label: `classic/root/${vw.id}/${locale}` }))) continue;
        for (const width of PHONE_DESK) {
          await resize(v.page, width);
          await toTop(v.page);
          const cell = { section: 'classic', route: 'root', pathname: '/', viewer: vw.id, state: 'no-pass', locale, width };
          await checkShell(v.page, cell, { journey: false });
          await shoot(v.page, cell, HEAD.home);
        }
      }
    } finally {
      await closeViewer(v);
    }
  }
}

// ── §2 · the header ────────────────────────────────────────────────────────────────────────────────────────────────
async function headerSection() {
  for (const st of HEADER_STATES) {
    const why = stopReason();
    if (why) {
      blocked(`header/${st.id}`, why);
      continue;
    }
    let cookies = [pass];
    if (st.signedIn) {
      try {
        cookies = [pass, await demo(st.query, st.balance, st.what)];
      } catch (e) {
        ok(`header/${st.id} · the state is set up: ${st.what}`, false, msg(e));
        continue;
      }
    }
    const v = await newViewer(`header ${st.id}`, cookies, { storage: st.masked ? [[CASH_HIDDEN, '1']] : [] });
    try {
      for (const locale of LOCALES) {
        const label = `header/root/${st.viewer}/${st.id}/${locale}`;
        if (!(await visit(v, '/', { locale, width: st.widths[0], label }))) continue;
        const wrong = await stateProblem(v.page, st);
        ok(`${label} · the state landed: ${st.what}`, wrong === null, wrong ?? '');
        for (const width of st.widths) {
          await resize(v.page, width);
          await toTop(v.page);
          const cell = { section: 'header', route: 'root', pathname: '/', viewer: st.viewer, state: st.id, locale, width };
          await checkShell(v.page, cell, { journey: true });
          await shoot(v.page, cell, HEAD.home);
        }
        if (st.heldWallet && locale === 'sw') await heldWallet(v.page, st, locale);
      }
      if (st.depositScreen) await depositScreen(v, st);
    } finally {
      await closeViewer(v);
    }
  }
}

// ── §3 · the guest’s sheet ─────────────────────────────────────────────────────────────────────────────────────────
async function sheetSection() {
  const v = await newViewer('guest sheet', [pass]);
  try {
    for (const locale of LOCALES) {
      if (!(await visit(v, '/', { locale, width: TICKET_WIDTHS[0], label: `sheet/root/guest/${locale}` }))) continue;
      for (const width of TICKET_WIDTHS) {
        await resize(v.page, width);
        await toTop(v.page);
        const cell = { section: 'sheet', route: 'root', pathname: '/', viewer: 'guest', state: 'tickets-sheet', locale, width };
        const trigger = await openGuestSheet(v.page, width);
        const sheet = trigger ? await v.page.evaluate(SHEET_PROBE) : null;
        const expanded = trigger ? await v.page.locator(trigger).first().getAttribute('aria-expanded') : null;
        const want = W.guestSheet[locale];
        const titled = !!sheet && squeeze(sheet.title) === squeeze(want);
        ok(`${tagOf(cell)} · the guest’s Tiketi opens the sheet ${want}, named by its title, Jisajili and Ingia both back to /positions, its trigger expanded`,
          titled && sheet.named && sheet.signUp === '/auth/register?next=%2Fpositions' && sheet.signIn === '/auth/login?next=%2Fpositions' && expanded === 'true',
          JSON.stringify({ ...(sheet ?? {}), expanded, opened: !!trigger }));
        await checkShell(v.page, cell, { journey: true, dialog: true });
        await shoot(v.page, cell, HEAD.home, { dialog: true, dialogProblem: titled ? null : `the open sheet is not ${want}` });
        await closeDialog(v.page);
      }
    }
  } finally {
    await closeViewer(v);
  }
}

// ── §4 · unread ────────────────────────────────────────────────────────────────────────────────────────────────────
async function unreadSection() {
  if (!(await ensureMain())) return blocked('unread', 'no demo player (see P.1)');
  let gate = null;
  for (const locale of LOCALES) {
    const label = `unread/account/player/${locale}`;
    if (!(await visit(mainV, '/account', { locale, width: 1280, ready: HUB, label }))) continue;
    const page = mainV.page;
    await page.waitForFunction(BELL_AT_LEAST, 1, { timeout: 30_000 }).catch(() => {});
    const b1 = await page.evaluate(BELL_UNREAD);
    if (gate === null) {
      gate = b1;
      if (!(b1 >= 1)) {
        blocked('unread', `the classic bell reads ${b1 === null ? 'no count' : b1} unread for the demo player, so the dot and the Arifa badge are not judged over an empty inbox (did seed-player-portfolio place its bets?)`);
        return;
      }
      ok(`unread · the classic bell, which the journey leaves alone (A1), reads ${b1} unread before the dot and the badge are judged`, true);
    }
    const a = await arifaTile(page, locale, 1280);
    await resize(page, 390);
    await toTop(page);
    const dotSeen = await page.waitForFunction(DOT_SHOWN, null, { timeout: 30_000 }).then(() => true).catch(() => false);
    const dot = await page.evaluate(DOT_PROBE);
    const words = dot && dot.n !== null ? (dot.n === 1 ? W.unreadOne[locale] : W.unreadN[locale].split('{n}').join(String(dot.n))) : null;
    const spoken = !!words && squeeze(dot.text).includes(squeeze(words));
    const cell = { section: 'unread', route: 'account', pathname: '/account', viewer: 'player', state: 'dot', locale, width: 390 };
    ok(`${tagOf(cell)} · the Akaunti tab wears the unread dot and says the count in words`, dotSeen && !!dot && dot.dot && spoken, JSON.stringify({ dot: dot ? dot.dot : null, text: fold(dot ? dot.text : '') }));
    await toTop(page);
    await checkShell(page, cell, { journey: true });
    await shoot(page, cell, HEAD.account);
    await arifaTile(page, locale, 390);
    await resize(page, 1280);
    await page.waitForFunction(BELL_AT_LEAST, 1, { timeout: 30_000 }).catch(() => {});
    const b2 = await page.evaluate(BELL_UNREAD);
    const lo = Math.min(b1 ?? 0, b2 ?? 0);
    const hi = Math.max(b1 ?? 0, b2 ?? 0);
    const within = (n, capped) => Number.isFinite(n) && (capped ? n >= Math.min(lo, 99) && n <= Math.min(hi, 99) : n >= lo && n <= hi);
    ok(`unread/account/player/${locale} · one count everywhere: the Arifa badge ${a?.badge ?? 'none'} and the dot’s spoken ${dot?.n ?? 'none'} sit within the bell’s ${b1} and ${b2}, all three read from the same endpoint`,
      !!a && within(a.n, a.capped) && !!dot && within(dot.n, false));
  }
  if (!(gate >= 1)) return;
  if (!(await visit(mainV, '/', { locale: 'sw', width: 320, label: 'unread/root/player/sw' }))) return;
  const page = mainV.page;
  const seen = await page.waitForFunction(DOT_SHOWN, null, { timeout: 30_000 }).then(() => true).catch(() => false);
  const cell = { section: 'unread', route: 'root', pathname: '/', viewer: 'player', state: 'dot-unlit-tab', locale: 'sw', width: 320 };
  ok(`${tagOf(cell)} · the dot on Akaunti while Maswali is the lit tab, at the narrowest width`, seen);
  await toTop(page);
  await checkShell(page, cell, { journey: true });
  await shoot(page, cell, HEAD.home);
}

// ── §5 · the Wallet ────────────────────────────────────────────────────────────────────────────────────────────────
async function walletSection() {
  if (!(await ensureMain())) return blocked('wallet', 'no demo player (see P.1)');
  for (const locale of LOCALES) {
    if (!(await visit(mainV, '/', { locale, width: PHONE_DESK[0], label: `wallet/root/player/${locale}` }))) continue;
    const page = mainV.page;
    for (const width of PHONE_DESK) {
      await resize(page, width);
      await toTop(page);
      const cell = { section: 'wallet', route: 'root', pathname: '/', viewer: 'player', state: 'wallet-sheet', locale, width };
      const w = (await openWallet(page)) ? await page.evaluate(WALLET_PROBE) : null;
      const named = !!w && w.label === W.wallet[locale];
      const depositOk = !!w && !!w.deposit && w.deposit.href === '/wallet/deposit' && squeeze(w.deposit.text).includes(squeeze(W.deposit[locale]));
      const withdrawOk = !!w && !!w.withdraw && w.withdraw.href === '/wallet/withdraw' && squeeze(w.withdraw.text).includes(squeeze(W.withdraw[locale]));
      ok(`${tagOf(cell)} · the capsule opens the Wallet ${W.wallet[locale]}, offering ${W.deposit[locale]} and ${W.withdraw[locale]}`, named && depositOk && withdrawOk, JSON.stringify(w));
      await checkShell(page, cell, { journey: true, dialog: true });
      await shoot(page, cell, HEAD.home, { dialog: true, dialogProblem: named ? null : `the open dialog is not the Wallet ${W.wallet[locale]}` });
      await closeDialog(page);
    }
  }
}

// ── §6 · focus ─────────────────────────────────────────────────────────────────────────────────────────────────────
async function focusSection() {
  if (!(await ensureMain())) return blocked('focus', 'no demo player (see P.1)');
  const steps = [
    { width: 390, state: 'focus-capsule', sel: CAPSULE, offset: '2px', what: 'the captioned balance' },
    { width: 390, state: 'focus-pill', sel: PILL, offset: '2px', what: 'the gold + Weka pesa' },
    { width: 390, state: 'focus-tab', sel: `${RAIL} a.kp-rail__item[href='/account']`, offset: '2px', what: 'the Akaunti tab' },
    { width: 1280, state: 'focus-link', sel: `${JOURNEY_BAR} nav.kp-jnav .kp-jnav__link`, offset: '2px', what: 'the first desktop link' },
  ];
  for (const locale of LOCALES) {
    if (!(await visit(mainV, '/', { locale, width: 390, label: `focus/root/player/${locale}` }))) continue;
    for (const step of steps) {
      const cell = { section: 'focus', route: 'root', pathname: '/', viewer: 'player', state: step.state, locale, width: step.width };
      await resize(mainV.page, step.width);
      await toTop(mainV.page);
      await focusStep(mainV.page, cell, step);
      await checkShell(mainV.page, cell, { journey: true });
      await shoot(mainV.page, cell, HEAD.home);
    }
  }
  // sw · the first hub row: a hub card clips its corners, so its ring is drawn INSIDE the row (globals.css, .kp-hub__card).
  if (await visit(mainV, '/account', { locale: 'sw', width: 390, ready: HUB, label: 'focus/account/player/sw' })) {
    const sel = `${HUB} ul.kp-hub__card a.kp-hub__row`;
    const cell = { section: 'focus', route: 'account', pathname: '/account', viewer: 'player', state: 'focus-hub-row', locale: 'sw', width: 390 };
    await focusStep(mainV.page, cell, { sel, offset: '-2px', what: 'the first hub row' });
    await intoView(mainV.page, sel);
    await settle(mainV.page, 200);
    await checkShell(mainV.page, cell, { journey: true });
    await shoot(mainV.page, cell, HEAD.account);
  }
  // sw · inside the Wallet: Toa pesa and the Weka mipaka link, on a phone and on a desktop.
  if (await visit(mainV, '/', { locale: 'sw', width: 390, label: 'focus/root/player/sw/wallet' })) {
    const page = mainV.page;
    for (const width of PHONE_DESK) {
      await resize(page, width);
      await toTop(page);
      if (!(await openWallet(page))) {
        ok(`focus/root/player/wallet/sw/${width} · the capsule opens the Wallet`, false);
        continue;
      }
      for (const step of [
        { state: 'focus-wallet-withdraw', sel: `[data-testid='wallet-sheet-withdraw']`, offset: '2px', what: 'the Wallet’s Toa pesa' },
        { state: 'focus-wallet-limits', sel: `${OPEN_DIALOG} a.kp-wsheet__link[href='/profile/responsible-gambling']`, offset: '2px', what: 'the Wallet’s Weka mipaka link' },
      ]) {
        const cell = { section: 'focus', route: 'root', pathname: '/', viewer: 'player', state: step.state, locale: 'sw', width };
        await focusStep(page, cell, step);
        await checkShell(page, cell, { journey: true, dialog: true });
        await shoot(page, cell, HEAD.home, { dialog: true });
      }
      await closeDialog(page);
    }
  }
  // sw · a guest: Ingia, then the guest sheet’s first door.
  const g = await newViewer('guest focus', [pass]);
  try {
    if (await visit(g, '/', { locale: 'sw', width: 390, label: 'focus/root/guest/sw' })) {
      const cell = { section: 'focus', route: 'root', pathname: '/', viewer: 'guest', state: 'focus-signin', locale: 'sw', width: 390 };
      await toTop(g.page);
      await focusStep(g.page, cell, { sel: SIGN_IN, offset: '2px', what: 'a guest’s Ingia' });
      await checkShell(g.page, cell, { journey: true });
      await shoot(g.page, cell, HEAD.home);
      const door = { ...cell, state: 'focus-sheet-door' };
      if (await openGuestSheet(g.page, 390)) {
        await focusStep(g.page, door, { sel: `[data-testid='tickets-guest-signup']`, offset: '2px', what: 'the guest sheet’s Jisajili' });
        await checkShell(g.page, door, { journey: true, dialog: true });
        await shoot(g.page, door, HEAD.home, { dialog: true });
        await closeDialog(g.page);
      } else {
        ok(`${tagOf(door)} · the guest’s Tiketi opens the sheet`, false);
      }
    }
  } finally {
    await closeViewer(g);
  }
}

// ── §7 · the active tab ────────────────────────────────────────────────────────────────────────────────────────────
async function tabsSection() {
  if (!(await ensureMain())) return blocked('tabs', 'no demo player (see P.1)');
  const held = heldQuestion();
  const question = held
    ? { path: `/markets/${held.id}`, route: 'markets-id', heading: H('eq', held.sw, held.en, held.zh) }
    : { path: null, route: 'markets-id', why: 'none of seed-real-markets’ questions is live' };
  const round = { path: () => roundPath, route: 'updown-id', heading: HEAD.round, why: 'the Up & Down board links no round (updown-card.tsx, its round link): did updown-seed start a chain?' };
  await tabTour(mainV, 'player', PHONE_DESK, [
    { path: '/account', route: 'account', discover: 'hub' },
    { path: '/', route: 'root' },
    question,
    { path: '/updown', route: 'updown', discover: 'round' },
    round,
    { path: '/updown/history', route: 'updown-history' },
    { path: '/positions', route: 'positions' },
    { path: '/results', route: 'results' },
    { path: '/wallet', route: 'wallet' },
  ]);
  const why = stopReason();
  if (why) return blocked('tabs/guest', why);
  // A guest meets proxy.ts’s sign-in on /positions, /updown/history and /wallet: a guest’s Tiketi zangu is the sheet.
  const g = await newViewer('guest tabs', [pass]);
  try {
    await tabTour(g, 'guest', [390], [
      { path: '/account', route: 'account', discover: 'hub' },
      { path: '/', route: 'root' },
      question,
      { path: '/updown', route: 'updown' },
      round,
      { path: '/results', route: 'results' },
    ]);
  } finally {
    await closeViewer(g);
  }
}

// ── §8 · Tiketi zangu ──────────────────────────────────────────────────────────────────────────────────────────────
async function ticketsSection() {
  if (!(await ensureMain())) return blocked('tickets', 'no demo player (see P.1)');
  const states = [
    { id: 'open', route: 'positions-open', path: '/positions?tab=open', kind: '/positions', cards: true },
    { id: 'settled', route: 'positions-settled', path: '/positions?tab=settled', kind: '/positions', cards: true, why: outcomeShortfall },
    { id: 'won', route: 'positions-win', path: '/positions?tab=win', kind: '/positions', cards: true, locales: ['sw'], widths: [390], why: outcomeShortfall },
    { id: 'lost', route: 'positions-loss', path: '/positions?tab=loss', kind: '/positions', cards: true, locales: ['sw'], widths: [390], why: outcomeShortfall },
    { id: 'switch', route: 'updown-history', path: '/updown/history', kind: '/updown/history' },
  ];
  for (const st of states) {
    await ticketState(mainV, 'player', st);
  }
  let fresh = null;
  try {
    fresh = await seededSession({ role: 'PLAYER', phone: `+25571${String(Date.now()).slice(-7)}`, name: 'Shell Empty', balance: 50_000 }, 'a fresh player for the empty states');
    ok('8.0 a fresh player, who holds no ticket, is signed in (seed-admin, role PLAYER)', true);
  } catch (e) {
    ok('8.0 a fresh player for the empty states', false, msg(e));
    blocked('tickets/empty', 'no fresh player (see 8.0)');
    blocked('tickets/empty-won', 'no fresh player (see 8.0)');
    return;
  }
  const fv = await newViewer('new player', [pass, fresh]);
  try {
    await ticketState(fv, 'new-player', { id: 'empty', route: 'positions', path: '/positions', kind: '/positions', empty: 'first' });
    const sp = await post('/api/dev-test/seed-player-portfolio', { markets: 5 }, [fresh]);
    const by = sp.body?.byStatus ?? {};
    const total = Object.values(by).reduce((n, k) => n + (Number(k) || 0), 0);
    const usable = sp.ok && total >= 1 && !((by.WIN ?? 0) >= 1);
    ok(`8.1 the fresh player bought through seed-player-portfolio (markets 5): ${JSON.stringify(by)}, none of it won`, usable, sp.ok ? '' : `HTTP ${sp.status} ${sp.body?.error ?? sp.error ?? ''}`);
    if (usable) await ticketState(fv, 'new-player', { id: 'empty-won', route: 'positions-win', path: '/positions?tab=win', kind: '/positions', empty: 'lens', locales: ['sw'] });
    else blocked('tickets/empty-won', 'the fresh player holds no ticket, or holds a won one, so its Won lens cannot read as an empty lens of a reader who has tickets');
  } finally {
    await closeViewer(fv);
  }
}

// ── §9 · the hub ───────────────────────────────────────────────────────────────────────────────────────────────────
async function hubSection() {
  if (!(await ensureMain())) return blocked('hub', 'no demo player (see P.1)');
  let staff = null;
  try {
    staff = await seededSession({ role: 'SUPPORT', phone: '+255700000086', name: 'Shell Staff' }, 'a SUPPORT officer for the staff hub');
    ok('9.0 a SUPPORT officer is signed in for the staff hub (seed-admin)', true);
  } catch (e) {
    ok('9.0 a SUPPORT officer for the staff hub', false, msg(e));
  }
  const viewers = [
    { id: 'player', v: mainV, what: () => 'the member’s name and phone, and the sign-out row', judge: (h) => h.id && h.exit },
    { id: 'guest', cookies: [pass], what: (l) => `the prompt ${W.guestPrompt[l]} and no sign-out`, judge: (h, l) => h.prompt !== null && squeeze(h.prompt) === squeeze(W.guestPrompt[l]) && !h.exit },
    { id: 'staff', cookies: staff ? [pass, staff] : null, what: (l) => `the console door ${W.staffConsole[l]} to /admin`, judge: (h, l) => h.staff !== null && squeeze(h.staff).includes(squeeze(W.staffConsole[l])) },
  ];
  for (const vw of viewers) {
    if (!vw.v && !vw.cookies) {
      blocked(`hub/${vw.id}`, 'no SUPPORT officer (see 9.0)');
      continue;
    }
    const v = vw.v ?? (await newViewer(`hub ${vw.id}`, vw.cookies));
    try {
      for (const locale of LOCALES) {
        const label = `hub/account/${vw.id}/${locale}`;
        if (!(await visit(v, '/account', { locale, width: HUB_WIDTHS[0], ready: HUB, label }))) continue;
        const h = await v.page.evaluate(HUB_PROBE, HUB);
        ok(`${label} · the hub shows ${vw.what(locale)}`, !!h && !!vw.judge(h, locale),
          JSON.stringify(h ? { id: h.id, exit: h.exit, prompt: h.prompt && fold(h.prompt), staff: h.staff && fold(h.staff), rows: h.rows.length } : null));
        for (const width of HUB_WIDTHS) {
          await resize(v.page, width);
          const base = { section: 'hub', route: 'account', pathname: '/account', viewer: vw.id, state: 'hub', locale, width };
          if (HUB_WALK.includes(width)) {
            await hubWalk(v.page, base);
            continue;
          }
          if (vw.id === 'staff') await intoView(v.page, `${HUB} .kp-hub__card--staff`);
          else await toTop(v.page);
          await settle(v.page, 200);
          const cell = { ...base, state: vw.id === 'staff' ? 'staff-card' : 'hub-top' };
          await checkShell(v.page, cell, { journey: true });
          await shoot(v.page, cell, HEAD.account);
        }
      }
    } finally {
      if (!vw.v) await closeViewer(v);
    }
  }
}

// ── §10 · WP7’s overlays ───────────────────────────────────────────────────────────────────────────────────────────
async function overlaysSection() {
  if (!(await ensureMain())) return blocked('overlays', 'no demo player (see P.1)');
  // isJourneySurface (surfaces.ts, `JOURNEY_ROUTE`) names / and /positions; /help and /account keep every overlay.
  // A guest’s Tiketi zangu is the sheet: /positions is behind proxy.ts’s sign-in, so it is not opened for a guest.
  const pages = [
    { viewer: 'player', cookies: [pass, main], path: '/', route: 'root', on: false, heading: HEAD.home },
    { viewer: 'player', cookies: [pass, main], path: '/positions', route: 'positions', on: false, heading: HEAD.tickets },
    { viewer: 'player', cookies: [pass, main], path: '/help', route: 'help', on: true, heading: PAGE_HEADINGS['/help'] },
    { viewer: 'player', cookies: [pass, main], path: '/account', route: 'account', on: true, heading: HEAD.account },
    { viewer: 'guest', cookies: [pass], path: '/', route: 'root', on: false, heading: HEAD.home },
    { viewer: 'guest', cookies: [pass], path: '/help', route: 'help', on: true, heading: PAGE_HEADINGS['/help'] },
    { viewer: 'guest', cookies: [pass], path: '/account', route: 'account', on: true, heading: HEAD.account },
  ];
  // One context each, opened together, every one primed as a SECOND visit (the panel never shows on a first), and
  // each recording from its document’s first frame.
  const opened = await Promise.all(pages.map(async (o) => {
    const label = `overlays/${o.route}/${o.viewer}/sw`;
    let v = null;
    try {
      v = await newViewer(`overlays ${o.viewer}`, o.cookies, { quiet: false, storage: [[CHANNEL_VISITS, '1']], recorder: FRAME_RECORDER });
      return { o, v, label, opened: await visit(v, o.path, { locale: 'sw', width: 390, label }) };
    } catch (e) {
      ok(`${label} · a browser context for the page`, false, msg(e));
      return { o, v, label, opened: false };
    }
  }));
  const t0 = Date.now();
  say('  · seven pages open, each a second visit; waiting out the channels panel’s 45 s dwell before anything is judged');
  await Promise.all(opened.filter((x) => x.opened && x.o.on).map((x) =>
    x.v.page.waitForFunction(() => !!document.querySelector(`[data-testid='channels-panel']`), null, { timeout: 80_000 }).catch(() => {})));
  await sleep(Math.max(3_000, 48_000 - (Date.now() - t0)));
  for (const x of opened) {
    try {
      if (!x.opened) continue;
      const page = x.v.page;
      const s = await page.evaluate(OVERLAY_PROBE, CHANNEL_VISITS);
      const fr = await page.evaluate(FRAMES_READ);
      const seen = JSON.stringify({ ...s, frames: fr });
      if (x.o.viewer === 'guest') {
        ok(`${x.label} · no Needle at all, in any frame: AppShell mounts it for a session only`, !s.needleRoot && !!fr && fr.needle === 0, seen);
      } else if (x.o.on) {
        ok(`${x.label} · the Needle is on screen`, s.needleShown && !s.needleSuppressed, seen);
      } else {
        ok(`${x.label} · the Needle stands down: mounted, needle-suppressed, and not one frame drawn since the document began (${fr ? fr.frames : 0} frames)`,
          s.needleMounted && s.needleSuppressed && !s.needleShown && !!fr && fr.frames > 0 && fr.needle === 0, seen);
      }
      if (x.o.on) {
        ok(`${x.label} · the chat bubble is on screen`, s.bubbleShown, seen);
        ok(`${x.label} · the channels panel is on screen after its dwell (visit ${s.visits})`, s.panelShown, seen);
      } else {
        ok(`${x.label} · no chat bubble, and not one frame of it since the document began`, !s.bubble && !!fr && fr.bubble === 0, seen);
        ok(`${x.label} · no channels panel after the same dwell (visit ${s.visits})`, !s.panel, seen);
      }
      const cell = { section: 'overlays', route: x.o.route, pathname: x.o.path, viewer: x.o.viewer, state: x.o.on ? 'overlays-on' : 'overlays-off', locale: 'sw', width: 390 };
      await checkShell(page, cell, { journey: true });
      await shoot(page, cell, x.o.heading);
    } catch (e) {
      ok(`${x.label} · the cell ran to its end`, false, msg(e));
    } finally {
      await closeViewer(x.v);
    }
  }
}

// ── §11 · G1: one phone changes hands ──────────────────────────────────────────────────────────────────────────────
/**
 * A1’s owed drive. Player A (the demo player, unread 1 or more) reads Akaunti on a 390 phone; A’s session ends
 * mid-visit (the idle timeout is 24 h, so A ends through a second sign-in of the same account, which takes the same
 * E-381 branch: the next refresh renders the guest shell in place, with the session-ended notice); player B signs in
 * through the header’s Ingia and the real form, a Server Action redirect, so the document never reloads. One
 * recorder, installed before any page script, keeps every change of the dot and the Arifa badge for the whole visit.
 */
async function viewerSection() {
  if (!(await ensureMain())) return blocked('viewer', 'no demo player (see P.1)');
  const bPhone = `+25576${String(Date.now()).slice(-7)}`;
  try {
    await seededSession({ role: 'PLAYER', phone: bPhone, name: 'Shell Second', balance: 50_000, password: B_PASSWORD }, 'player B, with a password and an empty inbox');
    ok(`11.0 player B is seeded with a password (seed-admin, role PLAYER, ${bPhone})`, true);
  } catch (e) {
    ok('11.0 player B for the change of hands', false, msg(e));
    return;
  }
  const v = await newViewer('viewer change', [pass, main], { recorder: VIEWER_RECORDER });
  try {
    const page = v.page;
    // 1 · A on Akaunti: the dot on the tab and the Arifa badge, A’s count.
    if (!(await visit(v, '/account', { locale: 'sw', width: 390, ready: HUB, label: 'viewer/account/A/sw' }))) return;
    await page.waitForFunction((sel) => !!document.querySelector(`${sel} .count-badge`), ARIFA, { timeout: 30_000 }).catch(() => {});
    await page.waitForFunction(DOT_SHOWN, null, { timeout: 30_000 }).catch(() => {});
    const a = await page.evaluate(ARIFA_PROBE, ARIFA);
    const d = await page.evaluate(DOT_PROBE);
    const counts = [a?.n, d?.n].filter((n) => Number.isFinite(n) && n >= 1);
    if (counts.length === 0) {
      blocked('viewer', `A shows no unread count (Arifa ${a?.badge ?? 'none'}, dot ${d?.n ?? 'none'}), so nothing of A’s could reach B`);
      return;
    }
    ok(`viewer · A’s count is on screen before the change: the Arifa badge ${a?.badge ?? 'none'} and the dot’s ${d?.n ?? 'none'} agree`, a?.n === d?.n);
    const aCell = { section: 'viewer', route: 'account', pathname: '/account', viewer: 'A', state: 'before', locale: 'sw', width: 390 };
    await toTop(page);
    await checkShell(page, aCell, { journey: true });
    await shoot(page, aCell, HEAD.account);
    const origin = (await page.evaluate(VIEWER_READ))?.origin ?? null;
    // 2 · a soft move to /results: a page a guest may read, whose RefreshPoller answers 50pick:refresh.
    await page.locator(`${HUB} a.kp-hub__row[href='/results']`).first().click({ timeout: 15_000 });
    await page.waitForFunction(() => location.pathname === '/results', null, { timeout: 60_000 });
    await page.waitForSelector('#main-content h1', { state: 'attached', timeout: 60_000 });
    await settle(page, 600);
    // 3 · A’s session ends: the same account signs in elsewhere (one session per account).
    await demo('', null, 'a second sign-in of the demo account, which ends A’s session');
    const tEnd = await page.evaluate(() => performance.now());
    // 4 · the next refresh renders the guest shell in place (E-381): no navigation.
    await page.evaluate(() => window.dispatchEvent(new Event('50pick:refresh')));
    const guestShell = await page.waitForFunction((sel) => !!document.querySelector(sel), SIGN_IN, { timeout: 30_000 }).then(() => true).catch(() => false);
    await settle(page, 500);
    const where = await page.evaluate(() => location.pathname);
    const notice = await page.locator(`[data-testid='session-ended-notice']`).count();
    ok('viewer · A’s session ended in place: the guest header and the session-ended notice on /results, with no navigation', guestShell && where === '/results' && notice === 1, `path ${where}, notice ${notice}, guest header ${guestShell}`);
    const gCell = { section: 'viewer', route: 'results', pathname: '/results', viewer: 'A', state: 'ended', locale: 'sw', width: 390 };
    await toTop(page);
    await checkShell(page, gCell, { journey: true });
    await shoot(page, gCell, PAGE_HEADINGS['/results']);
    // 5 · B signs in through the header’s Ingia (a soft link) and the real form.
    await page.locator(SIGN_IN).first().click({ timeout: 15_000 });
    await page.waitForSelector('#identifier', { state: 'visible', timeout: 60_000 });
    await page.locator('#identifier').click();
    await page.keyboard.type(bPhone.slice(4));
    await page.locator('#password').fill(B_PASSWORD);
    await guard('signing player B in through the form');
    await page.locator(`form:has(#password) button[type='submit']`).first().click({ timeout: 15_000 });
    const bIn = await page.waitForFunction((sel) => location.pathname === '/' && !!document.querySelector(sel), CAPSULE, { timeout: 60_000 }).then(() => true).catch(() => false);
    const sameDoc = (await page.evaluate(VIEWER_READ))?.origin === origin;
    ok('viewer · B signed in through the form and landed on / with a capsule, in the same document (no reload)', bIn && sameDoc, `signed in ${bIn}, same document ${sameDoc}`);
    // The dot reads B’s count at mount; give that answer time to land before the tile.
    await sleep(6_000);
    const bCell = { section: 'viewer', route: 'root', pathname: '/', viewer: 'B', state: 'signed-in', locale: 'sw', width: 390 };
    await toTop(page);
    await checkShell(page, bCell, { journey: true });
    await shoot(page, bCell, HEAD.home);
    // 6 · B opens Akaunti (a soft navigation): the Arifa row reads B’s count, once.
    await page.locator(`${RAIL} a[href='/account']`).first().click({ timeout: 15_000 });
    await page.waitForFunction((sel) => location.pathname === '/account' && !!document.querySelector(sel), HUB, { timeout: 60_000 }).catch(() => {});
    await sleep(5_000);
    const hCell = { section: 'viewer', route: 'account', pathname: '/account', viewer: 'B', state: 'signed-in', locale: 'sw', width: 390 };
    await toTop(page);
    await checkShell(page, hCell, { journey: true });
    await shoot(page, hCell, HEAD.account);
    // 7 · every frame, from the first: what the dot and the Arifa row showed, and for whom.
    const rec = await page.evaluate(VIEWER_READ);
    if (!rec || rec.origin !== origin) {
      blocked('viewer · the frames', 'the visit left its document (a reload), so the frames of the change are not on one record');
      return;
    }
    judgeViewer(rec.log, new Set(counts), tEnd);
  } finally {
    await closeViewer(v);
    // A’s session is over: nothing after this section may use it.
    main = null;
    mainReady = false;
  }
}

// ── §12 · WP7’s email-bar rule ─────────────────────────────────────────────────────────────────────────────────────
async function emailbarSection() {
  let session = null;
  try {
    session = await demo('?email=unverified', null, 'the demo player with an unconfirmed address');
  } catch (e) {
    ok('12.0 the demo player with an unconfirmed address (/auth/demo?email=unverified)', false, msg(e));
    return;
  }
  const BAR = `[data-testid='email-verify-banner']`;
  const j = await newViewer('email journey', [pass, session]);
  try {
    if (await visit(j, '/', { locale: 'sw', width: 390, label: 'emailbar/root/player/sw' })) {
      const n = await j.page.locator(BAR).count();
      const cell = { section: 'emailbar', route: 'root', pathname: '/', viewer: 'player-unconfirmed', state: 'journey-no-bar', locale: 'sw', width: 390 };
      ok(`${tagOf(cell)} · no email-verify bar for a journey reader whose address is unconfirmed (AppShell’s EmailVerifyBanner condition)`, n === 0, `${n} bar(s)`);
      await toTop(j.page);
      await checkShell(j.page, cell, { journey: true });
      await shoot(j.page, cell, HEAD.home);
    }
  } finally {
    await closeViewer(j);
  }
  if (ROLLOUT !== 'STAFF_PREVIEW') {
    blocked('emailbar/control', `the rollout is ${ROLLOUT}: without STAFF_PREVIEW no viewer is classic, so the bar has no control`);
    return;
  }
  const c = await newViewer('email classic', [session]);
  try {
    if (await visit(c, '/', { locale: 'sw', width: 390, label: 'emailbar/root/player/sw/control' })) {
      const n = await c.page.locator(BAR).count();
      const cell = { section: 'emailbar', route: 'root', pathname: '/', viewer: 'player-unconfirmed', state: 'classic-bar', locale: 'sw', width: 390 };
      ok(`${tagOf(cell)} · the control: the same reader without a pass is shown the bar, so the reader and the selector are real`, n === 1, `${n} bar(s)`);
      await toTop(c.page);
      await checkShell(c.page, cell, { journey: false });
      await shoot(c.page, cell, HEAD.home);
    }
  } finally {
    await closeViewer(c);
  }
}

// ── §13 · the Verify ID door ───────────────────────────────────────────────────────────────────────────────────────
async function kycSection() {
  let session = null;
  try {
    session = await demo('?kyc=none', null, 'the demo player with no identity on file');
  } catch (e) {
    ok('13.0 the demo player with no identity on file (/auth/demo?kyc=none)', false, msg(e));
    return;
  }
  const v = await newViewer('kyc', [pass, session]);
  try {
    if (await visit(v, '/account', { locale: 'sw', width: 390, ready: HUB, label: 'kyc/account/player/sw' })) {
      const row = `${HUB} a.kp-hub__row[href='/profile/kyc']`;
      const h = await v.page.evaluate(HUB_PROBE, HUB);
      const has = !!h && h.rows.includes('/profile/kyc');
      if (has) hubDoorsSeen.add('/profile/kyc');
      const words = has ? ((await v.page.locator(row).first().textContent()) ?? '') : '';
      const cell = { section: 'kyc', route: 'account', pathname: '/account', viewer: 'player-no-kyc', state: 'kyc-row', locale: 'sw', width: 390 };
      ok(`${tagOf(cell)} · the Profile card offers ${W.verifyId.sw} to /profile/kyc (hub-rows.ts, kycOffered)`, has && squeeze(words).includes(squeeze(W.verifyId.sw)), fold(words));
      if (has) await intoView(v.page, row);
      await settle(v.page, 200);
      await checkShell(v.page, cell, { journey: true });
      await shoot(v.page, cell, HEAD.account);
    }
    if (await visit(v, '/profile/kyc', { locale: 'sw', width: 390, label: 'kyc/profile-kyc/player/sw' })) {
      for (const width of PHONE_DESK) {
        await resize(v.page, width);
        await toTop(v.page);
        const cell = { section: 'kyc', route: 'profile-kyc', pathname: '/profile/kyc', viewer: 'player-no-kyc', state: 'active-tab', locale: 'sw', width };
        await checkShell(v.page, cell, { journey: true });
        await shoot(v.page, cell, PAGE_HEADINGS['/profile/kyc']);
      }
    }
  } finally {
    await closeViewer(v);
  }
}

// ── §14 and §15 · the plan’s hub doors, and the pages themselves ───────────────────────────────────────────────────
function doorsCheck() {
  say(NL + '§14 · every hub door the plan names (S6-PLAN, Verification, its Hub line), reached through some viewer’s hub');
  for (const door of PLAN_HUB_DOORS) {
    if (hubDoorsSeen.has(door)) ok(`doors · ${door}: offered by a hub on this run, and tiled`, true);
    else blocked(`doors · ${door}`, 'no viewer’s hub offered it on this run (invite, proposals and the agent door follow this server’s own state; Verify ID needs the kyc section)');
  }
}
function pagesCheck() {
  say(NL + '§15 · the pages themselves');
  ok(`15.1 no script error and no hydration warning on any page the drive opened (${errors.length})`, errors.length === 0);
  for (const e of errors) say(`      ${e}`);
  say(`  · React’s DEV-only measure error, listed and never failed (a production build has no such measure): ${devOnly.length}`);
  for (const e of devOnly) say(`      ${e}`);
}

// ── The drive ──────────────────────────────────────────────────────────────────────────────────────────────────────
browser = await chromium.launch({ headless: true });
const headerTiles = HEADER_STATES.reduce((n, s) => n + s.widths.length, 0) * LOCALES.length + 1 + 3;
say(`qa:journey-shell — ${BASE} · the rollout is ${ROLLOUT} · tiles into ${OUT}`);
say(`sections: ${SECTIONS.filter(runs).join(' ')} · ${BUDGET_MIN} min for the cells after at most ${WARM_MIN} min of warm-up`);
say(`planned tiles: classic 12 · header ${headerTiles} · sheet 9 · unread 10 · wallet 6 · focus 19 · tabs about 55 · tickets 41 · hub about 67 · overlays 7 · viewer 4 · emailbar 2 · kyc 3 · about 335 in all`);
try {
  await setup();
  cellsFrom = Date.now();
  await section('classic', '§1 · no pass: a guest and the demo player keep the classic chrome, and /account is not theirs (WP6b’s flag gating; A2, A3)', classicSection);
  await section('header', '§2 · the journey header, state by state (WP6b step 5; SJ-15; A5’s compact figure; the deposit screen)', headerSection);
  await section('sheet', '§3 · a guest’s Tiketi zangu is a sheet, not a page (SJ-16; WP6a step 5; WP9)', sheetSection);
  await section('unread', '§4 · the Akaunti dot and the Arifa badge, once the inbox holds something (WP3 as A1 amends it)', unreadSection);
  await section('wallet', '§5 · the Wallet, opened from the captioned balance, with Toa pesa (SJ-15)', walletSection);
  await section('focus', '§6 · the keyboard focus ring after a real Tab (s4-12-focus)', focusSection);
  await section('tabs', '§7 · the active tab on every tab and hub route (sw): the player at 390 and 1280, a pass-holding guest at 390', tabsSection);
  await section('tickets', '§8 · Tiketi zangu: open, settled, won, lost, empty, an empty Won lens, and the switch on /updown/history (WP9)', ticketsSection);
  await section('hub', '§9 · the Akaunti hub for a member, a guest and staff, walked screen by screen at 390 and 1280 (WP5)', hubSection);
  await section('overlays', '§10 · WP7: the Needle, the chat bubble and the channels panel, for a pass-holding player and guest (sw, 390)', overlaysSection);
  await section('viewer', '§11 · G1, owed by A1: one phone changes hands, A ending through the E-381 path and B signing in through the header', viewerSection);
  await section('emailbar', '§12 · WP7’s email-bar rule: no email-verify bar for a journey reader', emailbarSection);
  await section('kyc', '§13 · the Verify ID door: the demo player with no identity on file (the last use of the demo account)', kycSection);
  if (runs('tabs')) doorsCheck();
  pagesCheck();
} catch (e) {
  ok('the drive ran to its end', false, msg(e));
} finally {
  await closeViewer(mainV);
}
summary();
await finish(count.fail > 0 ? 1 : count.blocked > 0 ? 3 : 0);
