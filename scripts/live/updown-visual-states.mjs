/**
 * U43 · EVERY STATE OF THE UP & DOWN ROUND CARD (and the market card's), PHOTOGRAPHED ON A LOCAL DEV SERVER
 * (docs/MOBILE-VISUAL-PLAN.md §9 U43 — the eight-lens read must see every state, not only the ones production
 * happens to show at capture time).
 *
 *   BASE=http://localhost:3311 TAG=r0-states node scripts/live/updown-visual-states.mjs
 *
 * ⛔ LOCAL ONLY. It seeds through /api/dev-test/* and signs in through /auth/demo, all of which answer 404 in
 * production; it refuses to start against a BASE that is not localhost. Needs `next dev` on the in-memory store.
 *
 * ⚠️ START THE SERVER WITH `UPDOWN_SCHEDULER=false UPDOWN_HEALER=false` (2026-10-19, U43 release B). With the chain timer
 * running, the round under test (opened off the timer's grid by the handover endpoint) shares the board with a second
 * round the timer opens at the next grid boundary, newer by boundary — the board shows THAT one as current, and release
 * A's run photographed a fresh 4:36 round in place of the last 30 seconds and the lock. With the timer off, this driver
 * performs every handover itself (the settle fallback below), which is exactly production's shape: one settle closes the
 * round and opens its successor. The healer is off too, or it voids a round the timer was meant to close.
 *
 * ⭐ LOCAL TEST DATA, REAL SERVICE PATHS. The mock-bars feed and planted observations are synthetic and stay inside
 * this dev-only in-memory store. Rounds are opened, locked, closed and settled by the production service functions: one
 * prior round is armed and settled through /api/dev-test/updown-handover (the board gains a real result), the round under
 * test is the successor the last settle opened, and this driver settles it through the same endpoint after its close; a
 * moved price is a confirmed read planted through /api/dev-test/updown-observe; the demo player's stake is a real quick
 * bet clicked on the card.
 *
 * The phases, each photographed across every selected page through a bounded worker queue (the states are minutes
 * long, so the matrix is captured concurrently without overwhelming development chunk compilation):
 *   p1-open          the round under test, signed out and signed in (the stake controls)
 *   p2-receipt       one real demo quick bet (UP, the first chip) and receipt per selected player cell
 *   p3-youre-in      the open round after the bet ("You're in")
 *   p4-moved-up / p5-moved-down   a planted confirmed read above / below the open
 *   p6-last30        betting's last 30 seconds
 *   p7-locked        after the lock (the holder's "If it closes Up/Down" rows)
 *   p8-closed        after the close, before settlement (awaiting / reading the price)
 *   p9-settled       straight after settle (the hold) — the demo stake was one-sided, so it is a refund
 *   p10-handover     after the hold (the successor round)
 *   p11-round        the settled round's page and the successor's page
 *   p12-markets      /markets with seeded live, resolved and one-sided markets
 * Frames + index.json go to .qa-shots/u43/<TAG>/ (gitignored, DESIGN_AUTHORITY §0b).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mapLimited, PHOTOGRAPH_CONCURRENCY, verifiedScreenshot, frameReady, receiptParticipants, receiptReady, RECEIPT_EYEBROWS } from "../lib/u43-state-fanout.mjs";
import { sameCardFootprint } from "../lib/u43-card-height.mjs";

const REPO = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const PW_ROOT = process.env.PW_ROOT || REPO;
const { chromium } = await import(pathToFileURL(join(PW_ROOT, "node_modules/playwright/index.mjs")).href);

const BASE = (process.env.BASE || "http://localhost:3311").replace(/\/$/, "");
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  console.error(`REFUSING TO RUN against ${BASE}: this driver seeds and signs in through dev-only routes — local servers only.`);
  process.exit(2);
}
const TAG = process.env.TAG || "states";
const OUT = process.env.OUT || join(REPO, ".qa-shots", "u43", TAG);
const DUR = Number(process.env.DUR || 5);
const GOLD_DUR = 15; // XAU/USD's measured catalogue minimum; 5/10 are refused by createChain.
if (DUR !== 5) throw new Error("U43 state fixture uses the BTC 5-minute lifecycle and a separate Gold 15-minute chain");

mkdirSync(OUT, { recursive: true });

const UA = "Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Mobile Safari/537.36";
const UA_DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36";
const STILL = "*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}nextjs-portal{visibility:hidden!important}";
const HEIGHT_FOR = { 320: 640, 360: 740, 390: 844, 768: 1024, 1024: 768, 1280: 800, 1920: 1080 };

/** The matrix: every signed-in cell in Swahili across the phone widths, the other languages at a phone and a desktop. */
const QUICK_CELLS = [
  { who: "guest", locale: "sw", width: 360 }, { who: "guest", locale: "en", width: 360 }, { who: "guest", locale: "zh", width: 360 },
  { who: "guest", locale: "sw", width: 1280 },
  { who: "player", locale: "sw", width: 320 }, { who: "player", locale: "sw", width: 360 }, { who: "player", locale: "sw", width: 390 },
  { who: "player", locale: "sw", width: 768 }, { who: "player", locale: "sw", width: 1280 },
  { who: "player", locale: "en", width: 360 }, { who: "player", locale: "en", width: 1280 },
  { who: "player", locale: "zh", width: 360 }, { who: "player", locale: "zh", width: 1920 },
];
// The final read uses every requested width, language and player state. Run one language per
// invocation to keep Chromium's memory bounded while each time-sensitive phase is captured.
const FULL_WIDTHS = (process.env.WIDTHS || "320,360,390,768,1024,1280,1920").split(",").map(Number).filter((w) => w in HEIGHT_FOR);
const FULL_LOCALES = (process.env.LOCALES || "sw,en,zh").split(",").map((s) => s.trim()).filter((l) => ["sw", "en", "zh"].includes(l));
// A narrow local browser gate stops after p3: one real phone-width bet, then a
// measured held action above the fixed rail. It is also the browser red proof.
const heldClearanceOnly = process.env.HELD_CLEARANCE_ONLY === "1";
const lockHeightOnly = process.env.LOCK_HEIGHT_ONLY === "1";
// Keep this player out of the betting path: the open and locked no-stake cards
// must share the same signed-in footprint and leave visible choices above the rail.
const noBetParityOnly = process.env.NO_BET_PARITY_ONLY === "1";
const heldClearanceWidth = Number(process.env.HELD_CLEARANCE_WIDTH || 320);
if (heldClearanceOnly && ![320, 360, 390].includes(heldClearanceWidth)) {
  throw new Error("Held clearance probe supports only the three phone widths");
}
const CELLS = noBetParityOnly
  ? ["sw", "en", "zh"].map((locale) => ({ who: "player", locale, width: 360 }))
  : heldClearanceOnly
  ? [{ who: "player", locale: "sw", width: heldClearanceWidth }]
  : process.env.MATRIX === "full"
  ? FULL_LOCALES.flatMap((locale) => FULL_WIDTHS.flatMap((width) => [
      { who: "guest", locale, width }, { who: "player", locale, width },
    ]))
  : QUICK_CELLS;
const fullMatrix = process.env.MATRIX === "full" || heldClearanceOnly;
const inFullMatrix = (quickFilter) => (cell) => fullMatrix || quickFilter(cell);

const die = (why) => { console.error(`\n🔴 PREMISE ABSENT — ${why}\n   Refusing to photograph a page that cannot show the state.`); process.exit(2); };
if (CELLS.length === 0) die("capture matrix has no supported width or language");
const post = async (path, body) => {
  const r = await fetch(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const text = await r.text();
  if (!r.ok) die(`${path} → HTTP ${r.status} ${text.slice(0, 240)}`);
  try { return JSON.parse(text); } catch { die(`${path} returned non-JSON: ${text.slice(0, 200)}`); }
};
const waitUntil = async (ms, label) => {
  const left = ms - Date.now();
  if (left > 0) { console.log(`  … waiting ${(left / 1000).toFixed(0)}s for ${label}`); await new Promise((r) => setTimeout(r, left)); }
};

const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO }).toString().trim();
const trackedDirty = execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: REPO }).toString().trim() !== "";
const untrackedRunnable = execFileSync("git", ["status", "--porcelain", "--untracked-files=all", "--", "src", "scripts"],
  { cwd: REPO }).toString().split(/\r?\n/).some((line) => line.startsWith("?? "));
if (process.env.REQUIRE_CLEAN === "1" && (trackedDirty || untrackedRunnable)) {
  throw new Error("exact-source state capture requires committed source and scripts");
}
const index = { base: BASE, tag: TAG, dur: DUR, sourceHead, trackedDirty, untrackedRunnable,
  sourceClaim: "local checkout; require clean tree and fresh dev server for exact-source evidence",
  startedAt: new Date().toISOString(), phases: [] };

// ── Seed ──────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("=== seed");
// Seed Gold first at its REAL 15-minute minimum and 40-tick band. Then pause its
// chain through the seed service while starting BTC 5m. The chip is present for
// every board frame, but handover arms only BTC; Gold never gains a fake round.
const goldSeed = await post("/api/dev-test/updown-seed", {
  durations: [GOLD_DUR], assets: ["XAU"], minMoveTicks: 40, feedProvider: "mock-bars",
});
const goldChain = goldSeed.chains?.find((chain) => chain.durationMinutes === GOLD_DUR && chain.state === "RUNNING");
if (!goldSeed.ok || goldSeed.assets?.length !== 1 || goldSeed.assets[0]?.key !== "XAU" || !goldSeed.assets[0]?.enabled
  || goldSeed.chains?.length !== 1 || !goldChain || goldSeed.notes?.length) {
  die(`real Gold ${GOLD_DUR}m chain seed premise failed: ${JSON.stringify(goldSeed).slice(0, 220)}`);
}
const seed = await post("/api/dev-test/updown-seed", {
  durations: [DUR], assets: ["BTC"], pause: ["XAU"], feedProvider: "mock-bars",
});
const btcChain = seed.chains?.find((chain) => chain.durationMinutes === DUR && chain.state === "RUNNING"
  && chain.assetId !== goldChain.assetId);
if (!seed.ok || !seed.assets?.some((asset) => asset.key === "XAU" && asset.enabled)
  || !seed.assets?.some((asset) => asset.key === "BTC" && asset.enabled)
  || seed.chains?.length !== 2 || !btcChain
  || !seed.chains.some((chain) => chain.assetId === goldChain.assetId && chain.durationMinutes === GOLD_DUR && chain.state === "PAUSED")
  || seed.chains.filter((chain) => chain.state === "RUNNING").length !== 1
  || seed.notes?.length) die(`BTC ${DUR}m plus paused Gold ${GOLD_DUR}m seed premise failed: ${JSON.stringify(seed).slice(0, 240)}`);
index.chainSeed = { assets: seed.assets, btc: { assetId: btcChain.assetId, durationMinutes: DUR },
  gold: { assetId: goldChain.assetId, durationMinutes: GOLD_DUR, state: "PAUSED" },
  chainCount: seed.chains.length, notes: seed.notes };
const seededMarkets = await post("/api/dev-test/seed-markets");
if (!seededMarkets.ok || !Array.isArray(seededMarkets.ids) || seededMarkets.ids.length < 15) {
  die("generic market catalogue seed did not return enough live market IDs");
}
// The fixture defaults to cycling bets → stage1 → complete; `settle: true`
// cannot settle a row left at bets or stage1. Complete the first two so they
// leave the LIVE book before seeding the one-sided case from the next market.
const resolvedSeeds = await post("/api/dev-test/resolve-seed-markets", { markets: 2, bettors: 4, stake: 2000, outcome: "YES", stage: "complete", settle: true });
const oneSidedSeed = await post("/api/dev-test/resolve-seed-markets", { markets: 1, bettors: 2, stake: 1000, side: "YES", outcome: "NO", stage: "complete", settle: true });
if (!resolvedSeeds.ok || resolvedSeeds.resolved !== 2 || resolvedSeeds.markets?.length !== 2
  || !oneSidedSeed.ok || oneSidedSeed.resolved !== 1 || oneSidedSeed.markets?.length !== 1
  || resolvedSeeds.markets.some((m) => m.stakes <= 0)
  || oneSidedSeed.markets.some((m) => m.stakes <= 0)
  || resolvedSeeds.markets.some((m) => m.state !== "complete")
  || oneSidedSeed.markets.some((m) => m.state !== "complete")
  || new Set([...resolvedSeeds.markets.map((m) => m.id), ...oneSidedSeed.markets.map((m) => m.id)]).size !== 3) {
  die("resolved and one-sided market seed premises did not read back");
}
index.marketSeeds = { resolved: resolvedSeeds.markets, oneSided: oneSidedSeed.markets };

// ── Pages ─────────────────────────────────────────────────────────────────────────────────────────────────────
const browser = await chromium.launch();
const host = new URL(BASE).hostname;

// ⛔ ONE SIGN-IN, SHARED. The single-session rule revokes a player's older sessions at every new sign-in, so nine
// contexts each calling /auth/demo leave only the last one signed in (MEMORY: never two drives on one demo player).
// One context signs in; every player context is born with that context's cookies.
const authCtx = await browser.newContext();
const authPage = await authCtx.newPage();
// ⚠️ Not `networkidle`: /auth/demo redirects to the home page, whose live polling never lets the network go idle (the
// third run waited out 120 s on exactly that). The session cookie is the fact this step exists for, so wait for IT.
await authPage.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 120000 });
for (let i = 0; i < 60 && !(await authCtx.cookies()).some((c) => c.name === "kp_session"); i++) await authPage.waitForTimeout(500);
const playerState = await authCtx.storageState();
if (!playerState.cookies.some((c) => c.name === "kp_session")) die("the demo sign-in set no session cookie");
// This existing dev-only fixture uses real service paths on the disposable memory
// store. Its twelfth market is operator-VOID with a real refund; the state drive
// refuses a generic result card in place of that exact market.
const portfolioResponse = await authCtx.request.post(`${BASE}/api/dev-test/seed-player-portfolio`, {
  data: { markets: 12, stake: 1500 }, timeout: 120000,
});
const portfolio = await portfolioResponse.json().catch(() => null);
if (!portfolioResponse.ok() || !portfolio?.ok || portfolio.placed < 12
  || portfolio.intended?.VOID !== 1 || portfolio.byStatus?.VOID !== 1
  || portfolio.marketIds?.length < 12 || portfolio.refusals?.length) {
  die(`real local VOID market seed premise failed: ${JSON.stringify(portfolio).slice(0, 200)}`);
}
const occupiedIds = new Set([...resolvedSeeds.markets.map((m) => m.id), ...oneSidedSeed.markets.map((m) => m.id), ...portfolio.marketIds]);
const liveId = seededMarkets.ids.find((m) => !occupiedIds.has(m.id))?.id;
if (!liveId) die("no separate live generic market remains after the resolved and VOID fixtures");
const marketCases = {
  "p12-market-live": { id: liveId, surface: "markets", kind: "live" },
  "p12-market-resolved": { id: resolvedSeeds.markets[0].id, surface: "results", kind: "resolved" },
  "p12-market-one-sided": { id: oneSidedSeed.markets[0].id, surface: "results", kind: "one-sided" },
  "p12-market-void": { id: portfolio.marketIds[11], surface: "results", kind: "void" },
};
index.marketSeeds = { ...index.marketSeeds, portfolio: { placed: portfolio.placed, intended: portfolio.intended,
  byStatus: portfolio.byStatus, refusals: portfolio.refusals }, marketCases };
await authCtx.close();

const pages = [];
for (const c of CELLS) {
  const phone = c.width < 640;
  const ctx = await browser.newContext({
    viewport: { width: c.width, height: HEIGHT_FOR[c.width] || 900 }, deviceScaleFactor: phone ? 2 : 1,
    userAgent: phone ? UA : UA_DESKTOP, isMobile: phone, hasTouch: phone,
    storageState: c.who === "player" ? playerState : undefined,
  });
  await ctx.addCookies([{ name: "kp-locale", value: c.locale, domain: host, path: "/" }]);
  await ctx.addInitScript((desktop) => { try { localStorage.setItem("50pick-primer-seen", "1"); localStorage.setItem("kp-updown-chart-open", desktop ? "open" : "closed"); } catch {} }, c.width >= 1024);
  const page = await ctx.newPage();
  pages.push({ ...c, ctx, page, id: `${c.who}-${c.width}-${c.locale}` });
}
const BOARD = `/updown?asset=BTC&d=${DUR}`;

// Compile and hydrate each browser context before the timed round begins. A cold
// 13-context fanout can otherwise spend the successor's open window loading dev
// chunks. This empty seeded board is unscored; the real predecessor and successor
// are still created only by the service endpoint below.
console.log("=== warm browser contexts");
const warmed = await mapLimited(pages, PHOTOGRAPH_CONCURRENCY, async (p) => {
  try {
    await p.page.goto(`${BASE}${BOARD}`, { waitUntil: "load", timeout: 90000 });
    await p.page.waitForFunction(() => !!document.querySelector("main") && document.readyState === "complete", null, { timeout: 20000 });
    const lang = await p.page.evaluate(() => document.documentElement.lang);
    return { cell: p.id, ok: lang === p.locale, lang };
  } catch (error) { return { cell: p.id, ok: false, error: String(error).slice(0, 180) }; }
});
index.warmup = warmed;
if (warmed.some((row) => !row.ok)) die(`browser warm-up failed: ${JSON.stringify(warmed.filter((row) => !row.ok)).slice(0, 500)}`);

// Start with a fresh chain and make ONE real predecessor. The old `updown-advance` plus six
// `arm` calls rewound a chain while its successor was still unresolved: Gold could then show
// an open card and a settled card covering the same minutes. A five-minute round cannot yield
// six honest results in 39 seconds. One short lead-in settle opens a full-span successor for
// the state sweep, with an adjacent settled card for the handover read.
const armed = await post("/api/dev-test/updown-handover", { phase: "arm", leadSeconds: 5 });
const armedTest = armed.out?.find((o) => o.durationMinutes === DUR && o.round)?.round;
if (!armedTest?.id || armed.chains !== 1 || armed.out?.length !== 1) {
  die(`only the BTC ${DUR}-minute chain may arm a lead-in round: ${JSON.stringify(armed).slice(0, 300)}`);
}
await waitUntil(Date.parse(armedTest.closesAt) + 1500, "the real lead-in close");
const lastSettle = await post("/api/dev-test/updown-handover", { phase: "settle" });
const testHandover = lastSettle.out?.find((o) => o.durationMinutes === DUR && o.closed?.id === armedTest.id);
if (!testHandover?.opened?.id || lastSettle.chains !== 1 || lastSettle.out?.length !== 1
  || testHandover.opened.opensAt !== testHandover.closed.closesAt) {
  die(`the lead-in did not hand over to an adjacent ${DUR}-minute round: ${JSON.stringify(testHandover).slice(0, 300)}`);
}
for (const row of lastSettle.out ?? []) {
  if (row.closed && row.opened && row.closed.closesAt !== row.opened.opensAt) {
    die(`chain ${row.chainId} handed over across overlapping or missing windows`);
  }
}
console.log("  one settled predecessor; successor starts at its exact close");

/** A card's own frame without the chrome floating over it (the twin of updown-visual-capture.mjs's helper). */
async function withoutChrome(page, fn) {
  const style = await page.addStyleTag({ content: ".app-topbar,.kp-rail,.cm-bubble,[data-toaster],nextjs-portal{visibility:hidden!important}" });
  try { return await fn(); }
  finally { await style.evaluate((el) => el.remove()).catch(() => {}); }
}

// Photograph the actual timed p6 card before the ordinary still-frame style is
// installed. The tier changes below are browser-only CSS-gate probes, explicitly
// recorded as such; the round, clock words and price still come from the server.
async function captureUrgencyMotion(p, roundId) {
  const original = await p.page.evaluate(() => ({
    tier: document.documentElement.getAttribute("data-motion"),
    userOff: document.documentElement.classList.contains("kp-reduce-motion"),
  }));
  const frames = [];
  const observe = () => p.page.evaluate((id) => {
    const card = [...document.querySelectorAll("article.mcardp")]
      .find((node) => node.querySelector(`a[href="/updown/${id}"]`));
    const clock = card?.querySelector(".ud-clock");
    const urgent = clock?.querySelector(".m-urgent");
    const dot = clock?.querySelector(".ud-clock-caption .live-dot");
    const style = urgent ? getComputedStyle(urgent) : null;
    const dotStyle = dot ? getComputedStyle(dot) : null;
    return {
      now: Date.now(), lang: document.documentElement.lang,
      phase: card?.getAttribute("data-phase") ?? null,
      caption: clock?.querySelector(".ud-clock-caption")?.textContent?.trim() ?? "",
      digits: urgent?.textContent?.trim() ?? "",
      urgentPresent: !!urgent, dotPresent: !!dot,
      urgentName: style?.animationName ?? null, urgentDuration: style?.animationDuration ?? null,
      urgentRunning: urgent?.getAnimations().some((animation) => animation.playState === "running") ?? false,
      dotName: dotStyle?.animationName ?? null, dotDuration: dotStyle?.animationDuration ?? null,
      tier: document.documentElement.getAttribute("data-motion"),
      userOff: document.documentElement.classList.contains("kp-reduce-motion"),
      osReduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    };
  }, roundId);
  try {
    for (const mode of ["full-a", "full-b", "reduced", "minimal", "os-reduce"]) {
      const osReduced = mode === "os-reduce";
      await p.page.emulateMedia({ reducedMotion: osReduced ? "reduce" : "no-preference" });
      await p.page.evaluate((tier) => {
        document.documentElement.setAttribute("data-motion", tier === "minimal" ? "minimal" : tier === "reduced" ? "reduced" : "full");
        document.documentElement.classList.toggle("kp-reduce-motion", tier === "minimal");
      }, mode);
      await p.page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      if (mode === "full-b") await p.page.waitForTimeout(420);
      const before = await observe();
      if (before.lang !== p.locale || before.phase !== "open" || !before.urgentPresent || !before.dotPresent
        || !before.caption || !/^\d+:\d\d$/.test(before.digits)) {
        throw new Error(`p6 urgency premise missing for ${p.id} ${mode}: ${JSON.stringify(before).slice(0, 250)}`);
      }
      if (mode.startsWith("full") && (before.urgentName !== "m-breathe" || !before.urgentRunning)) {
        throw new Error(`p6 full-motion digit pulse absent for ${p.id}: ${JSON.stringify(before).slice(0, 250)}`);
      }
      if (!mode.startsWith("full") && before.urgentName !== "none") {
        throw new Error(`p6 reduced-motion digit pulse still runs for ${p.id} ${mode}`);
      }
      if (mode === "reduced" && (before.dotName !== "m-breathe" || before.dotDuration !== "2.6s")) {
        throw new Error(`p6 reduced-tier live dot has wrong cadence for ${p.id}: ${JSON.stringify(before).slice(0, 250)}`);
      }
      const file = `p6-last30__${p.id}__motion-${mode}.png`;
      const image = await p.page.screenshot({ fullPage: true });
      const after = await observe();
      if (after.phase !== "open" || !after.urgentPresent || !after.caption) {
        throw new Error(`p6 motion frame crossed the lock for ${p.id} ${mode}`);
      }
      frames.push({ file, image, before, after, gate: mode === "minimal" ? "in-app user switch" : mode === "os-reduce" ? "OS emulation" : mode === "reduced" ? "low-end tier override" : "full tier override" });
    }
  } finally {
    await p.page.emulateMedia({ reducedMotion: "no-preference" });
    await p.page.evaluate(({ tier, userOff }) => {
      if (tier == null) document.documentElement.removeAttribute("data-motion");
      else document.documentElement.setAttribute("data-motion", tier);
      document.documentElement.classList.toggle("kp-reduce-motion", userOff);
    }, original).catch(() => {});
  }
  return frames;
}

const voidWord = { en: "Void", sw: "Batili", zh: "已作废" };
const stoppedGoldWords = {
  en: ["No further rounds are scheduled here right now.", "Market reopens at"],
  sw: ["Hakuna raundi nyingine iliyopangwa hapa kwa sasa.", "Soko litafunguliwa tena saa"],
  zh: ["此处暂无后续回合安排。", "市场于"],
};
function exactMarketReady(sample, requirement) {
  if (requirement.stoppedGold) return sample?.lang === requirement.locale
    && sample.signedIn === requirement.signedIn && sample.goldSelected && sample.goldDurationSelected
    && sample.cards === 0 && sample.emptyState && sample.bettableChoiceCount === 0
    && stoppedGoldWords[requirement.locale].some((words) => sample.emptyStateText?.includes(words));
  if (!frameReady(sample, requirement)) return false;
  if (!requirement.marketCase) return true;
  const card = sample.marketCards?.find((row) => row.id === requirement.marketCase.id);
  if (!card) return false;
  switch (requirement.marketCase.kind) {
    case "live": return card.choices === "open" && card.buttons === 2;
    case "resolved": return card.result === "final" && card.choices === "closed" && card.settledDate === true && card.oneSided === false;
    case "one-sided": return card.result === "final" && card.choices === "closed" && card.settledDate === true && card.oneSided === true;
    case "void": return card.result === "final" && card.choices === "closed"
      && card.text.includes(voidWord[requirement.locale]);
    default: return false;
  }
}

async function photograph(phase, path = BOARD, filter = () => true) {
  // Dev bundlers compile route chunks lazily. Unbounded page.goto() caused the 13-cell R8
  // sweep to reload /updown repeatedly before its clock effects could run. Keep all cells,
  // but let only a few load/paint at once; the result order stays the matrix's order.
  const shots = await mapLimited(pages.filter(filter), PHOTOGRAPH_CONCURRENCY, async (p) => {
    try {
      const detailPage = /^\/updown\/[^/?]+/.test(path);
      const needsLive = ["p1-open", "p3-youre-in", "p4-moved-up", "p5-moved-down", "p6-last30", "p7-locked", "p10-handover"].includes(phase);
      const roundPhase = ["p1-open", "p3-youre-in", "p4-moved-up", "p5-moved-down", "p6-last30"].includes(phase) ? "open"
        : phase === "p7-locked" ? "locked" : null;
      const requirement = {
        detailPage, marketPage: path.startsWith("/markets") || path.startsWith("/results"),
        marketCase: marketCases[phase] ?? null, stoppedGold: phase === "p13-gold-board", needsLive, roundPhase,
        roundId: path === BOARD && roundPhase ? round.id : null,
        last30LockMs: phase === "p6-last30" ? lockMs : null,
        heldActionClearance: phase === "p3-youre-in" && p.who === "player" && p.width <= 390
          && (fullMatrix || p.width === 360),
        heldCaptionHidden: phase === "p3-youre-in" && p.who === "player" && p.width === 320,
        locale: p.locale, signedIn: p.who === "player",
      };
      const proveDelayedLine = heldClearanceOnly && p.width === 360 && phase === "p3-youre-in"
        && process.env.HELD_LINE_DELAY === "1";
      let releaseLine;
      const lineGate = new Promise((resolve) => { releaseLine = resolve; });
      const roundLineRequest = proveDelayedLine
        ? p.page.waitForRequest((request) => {
            const url = new URL(request.url());
            return url.pathname === "/api/updown/history" && url.searchParams.get("scope") === "round";
          }, { timeout: 12000 })
        : null;
      const roundLineResponse = proveDelayedLine
        ? p.page.waitForResponse((response) => {
            const url = new URL(response.url());
            return url.pathname === "/api/updown/history" && url.searchParams.get("scope") === "round";
          }, { timeout: 12000 })
        : null;
      if (proveDelayedLine) {
        await p.page.route("**/api/updown/history?*", async (route) => {
          if (new URL(route.request().url()).searchParams.get("scope") === "round") await lineGate;
          await route.continue();
        });
      }
      const injectNoBetHeightRed = async () => {
        if (noBetParityOnly && process.env.NO_BET_HEIGHT_RED === "1" && phase === "p1-open") {
          // Browser-only reversal of the old 347px no-stake open floor.
          await p.page.addStyleTag({ content: '@media(min-width:360px){.ud-card[data-phase="open"][data-ud-layout="player"]{min-height:347px!important}}' });
        }
      };
      await p.page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 90000 });
      await injectNoBetHeightRed();
      // Browser-only red restores the old visible one-side caption without
      // touching shared CSS or the running server's source tree.
      if (heldClearanceOnly && process.env.HELD_CAPTION_RED === "1" && phase === "p3-youre-in") {
        await p.page.addStyleTag({ content: '@media(max-width:359px){.ud-card[data-ud-layout="held"] .ud-oneside-caption{display:flex!important}}' });
      }
      // Hydrated before the frame: the card clocks paint "--:--" until the client ticks, and the signed-in controls are
      // interactive only after hydration. Wait for a live clock (or give up after 12 s and say so in the index).
      const hydrated = await p.page.waitForFunction(({ detailPage, needsLive, stoppedGold }) => {
        // A round detail has no board card. Its title and settlement panel are
        // the premise; the board's ticking-card check cannot apply there.
        if (detailPage) return !!document.querySelector("main h1") && !!document.querySelector("main section");
        if (stoppedGold) return !!document.querySelector('[data-empty-state]')
          && document.querySelectorAll('article.mcardp').length === 0;
        const cards = document.querySelectorAll("article.mcardp");
        const running = [...document.querySelectorAll('article.mcardp[data-phase="open"],article.mcardp[data-phase="locked"]')];
        // Settled cards may truthfully say "awaiting result", and a stopped chain
        // may show an em dash. Only running clocks have to tick before capture.
        return cards.length > 0 && (!needsLive || running.length > 0) && running.every((card) => {
          // The caption also has `m-tick`; read the numeric digit leaf only.
          const tick = card.querySelector(".ud-clock > .m-tick.tabular-nums")?.textContent || "";
          return /\d/.test(tick) && !tick.includes("--:--") && !tick.includes("—:—");
        });
      }, { detailPage, needsLive, stoppedGold: requirement.stoppedGold }, { timeout: 12000 }).then(() => true).catch(() => false);
      const marksReady = await p.page.waitForFunction(() => [...document.querySelectorAll("article.mcardp svg")]
        .filter((el) => el.querySelector("use") && el.getClientRects().length > 0).every((el) => {
        try { return el.getBBox().width > 0; } catch { return false; }
      }), null, { timeout: 10000 }).then(() => true).catch(() => false);
      // On a fresh desktop load the chart is open, but its JS chunk and history
      // fetch finish after the card clock hydrates. Judge a painted canvas, not
      // the large temporary "Loading" rectangle beside the round.
      const chartReady = requirement.stoppedGold || await p.page.waitForFunction(() =>
        !document.querySelector('.ud-chart-trigger[aria-expanded="true"]')
          || !!document.querySelector('.ud-chart-slot [role="img"] > div[style*="opacity: 1"] canvas'),
      null, { timeout: 15000 }).then(() => true).catch(() => false);
      await p.page.waitForTimeout(900);
      const sampleFrame = () => p.page.evaluate(({ roundId }) => {
        const cards = [...document.querySelectorAll("article.mcardp")];
        const running = cards.filter((card) => ["open", "locked"].includes(card.getAttribute("data-phase")));
        const selected = roundId ? cards.find((card) => card.querySelector(`a[href="/updown/${roundId}"]`)) : null;
        const marksReady = [...document.querySelectorAll("article.mcardp svg")]
          .filter((el) => el.querySelector("use") && el.getClientRects().length > 0).every((el) => {
            try { return el.getBBox().width > 0; } catch { return false; }
          });
        return {
          now: Date.now(), cards: cards.length, roundPhase: selected?.getAttribute("data-phase") ?? null,
          runningTicks: running.map((card) => card.querySelector(".ud-clock > .m-tick.tabular-nums")?.textContent || ""),
          detailReady: !!document.querySelector("main h1") && !!document.querySelector("main section"),
          marketCards: cards.filter((card) => card.hasAttribute("data-row-id")).map((card) => ({
            id: card.getAttribute("data-row-id"), choices: card.getAttribute("data-market-choices"),
            result: card.getAttribute("data-market-result"),
            oneSided: !!card.querySelector(".mcardp-oneside"),
            settledDate: !!card.querySelector('time[data-market-part="settled-date"][datetime]'),
            buttons: card.querySelectorAll("button.btn-yes,button.btn-no").length,
            text: card.innerText.slice(0, 600),
          })),
          goldSelected: !!document.querySelector('nav[data-filter-rail] a[href*="asset=XAU"][aria-current="page"]'),
          goldDurationSelected: !!document.querySelector('nav[data-filter-rail] a[href*="asset=XAU&d=15"][aria-current="page"]'),
          emptyState: !!document.querySelector("[data-empty-state]"),
          emptyStateText: document.querySelector("[data-empty-state]")?.textContent?.trim().slice(0, 400) ?? null,
          bettableChoiceCount: document.querySelectorAll('article.mcardp[data-phase="open"] .ud-act button.btn-yes:not([disabled]),article.mcardp[data-phase="open"] .ud-act button.btn-no:not([disabled])').length,
          marksReady,
          chartReady: !document.querySelector('.ud-chart-trigger[aria-expanded="true"]')
            || !!document.querySelector('.ud-chart-slot [role="img"] > div[style*="opacity: 1"] canvas'),
          lang: document.documentElement.lang,
          signedIn: !!document.querySelector('[data-testid="wallet-balance-pill"], .kp-balance-pill, a[href="/wallet"]'),
          roundLinePresent: !!selected?.querySelector('[data-testid="round-live-line"]'),
          delayedLayoutBlockPresent: !!selected?.querySelector('[data-testid="u43-round-line-layout-block"]'),
          oneSideCaption: (() => {
            const caption = selected?.querySelector(".ud-oneside-caption");
            return { present: !!caption, visible: !!caption && caption.getClientRects().length > 0
              && getComputedStyle(caption).display !== "none" };
          })(),
          cardGeometry: (() => {
            if (!selected) return null;
            const action = selected.querySelector(":scope > .ud-act");
            // The local mock feed may truthfully render the unavailable sentence
            // or no visible line. Measure the next visible row in all three cases.
            const nextVisible = selected.querySelector(':scope > [data-testid="round-live-line"], :scope > [data-testid="round-live-line-unavailable"], :scope > .ud-foot');
            return {
              height: selected.getBoundingClientRect().height,
              layout: selected.getAttribute("data-ud-layout"),
              actionToNextVisible: action && nextVisible
                ? nextVisible.getBoundingClientRect().top - action.getBoundingClientRect().bottom : null,
            };
          })(),
          heldAction: (() => {
            if (!roundId) return null;
            const rail = document.querySelector(".kp-rail");
            const buttons = [...(selected?.querySelectorAll(".ud-act button.btn-yes, .ud-act button.btn-no") ?? [])]
              .filter((button) => button.getClientRects().length > 0);
            if (!rail || buttons.length !== 2) return null;
            const railTop = rail.getBoundingClientRect().top;
            const bounds = buttons.map((button) => button.getBoundingClientRect());
            return { layout: selected?.getAttribute("data-ud-layout"), railPosition: getComputedStyle(rail).position,
              buttons: bounds.length, minButtonHeight: Math.min(...bounds.map((rect) => rect.height)),
              clearance: railTop - Math.max(...bounds.map((rect) => rect.bottom)) };
          })(),
          // Read motion before STILL freezes it; a retry must report the accepted frame's pulse.
          pulses: [...document.querySelectorAll(".m-urgent")].map((el) => ({
            text: (el.textContent || "").trim(), name: getComputedStyle(el).animationName,
            running: el.getAnimations().some((x) => x.playState === "running" && x.animationName === "m-breathe"),
          })),
        };
      }, { roundId: requirement.roundId });
      let lineShift = null;
      if (proveDelayedLine) {
        try {
          await roundLineRequest;
          const before = await sampleFrame();
          if (before.roundLinePresent || !before.heldAction || before.heldAction.clearance < 24) {
            throw new Error(`delayed line premise failed before release: ${JSON.stringify({ line: before.roundLinePresent, action: before.heldAction }).slice(0, 220)}`);
          }
          releaseLine();
          const response = await roundLineResponse;
          if (!response.ok()) throw new Error(`round history returned HTTP ${response.status()}`);
          const feed = await response.json();
          if (feed.sourceTier !== "vendor" && feed.sourceTier !== "confirmed") {
            throw new Error("round history had no truthful source tier");
          }
          // A local mock-bars round normally has confirmed reads but no vendor bars.
          // Do not invent a price to make its line draw: insert an empty, aria-hidden
          // 72px browser-only layout block (56px SVG + one footer row) after the
          // genuine delayed response. This probes action stability, not price data.
          await p.page.evaluate(({ roundId }) => {
            const card = [...document.querySelectorAll("article.mcardp")]
              .find((node) => node.querySelector(`a[href="/updown/${roundId}"]`));
            const action = card?.querySelector(":scope > .ud-act");
            if (!action) throw new Error("the held action is absent before delayed layout injection");
            const block = document.createElement("div");
            block.dataset.testid = "u43-round-line-layout-block";
            block.setAttribute("aria-hidden", "true");
            block.style.height = "72px";
            block.style.pointerEvents = "none";
            action.after(block);
          }, { roundId: round.id });
          if (process.env.HELD_LINE_RED === "1") {
            // Recreate the old pre-action placement in this browser only.
            await p.page.evaluate(({ roundId }) => {
              const card = [...document.querySelectorAll("article.mcardp")]
                .find((node) => node.querySelector(`a[href="/updown/${roundId}"]`));
              const action = card?.querySelector(":scope > .ud-act");
              const block = card?.querySelector(':scope > [data-testid="u43-round-line-layout-block"]');
              if (!action || !block) throw new Error("the delayed layout block cannot be reversed");
              action.before(block);
            }, { roundId: round.id });
          }
          await p.page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const after = await sampleFrame();
          if (!after.delayedLayoutBlockPresent || !after.heldAction) throw new Error("the delayed layout block did not paint beside the held action");
          lineShift = { before: before.heldAction.clearance, after: after.heldAction.clearance,
            sourceTier: feed.sourceTier, simulation: true, height: 72 };
          if (after.heldAction.clearance < 24) {
            throw new Error(`delayed line held action clearance ${after.heldAction.clearance.toFixed(1)}px below 24px`);
          }
        } finally {
          releaseLine();
          await p.page.unroute("**/api/updown/history?*");
        }
      }
      if (requirement.heldActionClearance) {
        const measured = await sampleFrame();
        const action = measured.heldAction;
        if (!action) throw new Error("held action clearance could not be measured on the tested round");
        if (action.clearance < 24) throw new Error(`held action clearance ${action.clearance.toFixed(1)}px below 24px`);
        if (requirement.heldCaptionHidden && (!measured.oneSideCaption.present || measured.oneSideCaption.visible)) {
          throw new Error("held 320px one-side caption is absent or visible instead of hidden");
        }
      }
      if (phase === "p7-locked" && p.width === 320 && path === BOARD) {
        const gap = (await sampleFrame()).cardGeometry?.actionToNextVisible;
        if (!Number.isFinite(gap)) throw new Error("320px locked card/action-to-next-row gap could not be measured");
        if (gap > 24) throw new Error(`320px locked card leaves ${gap.toFixed(1)}px of blank space before its next visible row`);
      }
      const motionFrames = phase === "p6-last30" && p.who === "guest" && [320, 360].includes(p.width)
        ? await captureUrgencyMotion(p, round.id) : [];
      const file = `${phase}__${p.id}.png`;
      const accepted = await verifiedScreenshot({
        sample: sampleFrame,
        capture: async () => {
          await p.page.addStyleTag({ content: STILL });
          return p.page.screenshot({ fullPage: true });
        },
        valid: (sample) => exactMarketReady(sample, requirement),
        retry: async () => {
          await p.page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 90000 });
          await injectNoBetHeightRed();
          await p.page.waitForTimeout(1500);
        },
      });
      const cards = p.page.locator("article.mcardp");
      const n = Math.min(await cards.count(), 4);
      const cardFiles = [];
      const cardImages = [];
      await withoutChrome(p.page, async () => {
        for (let i = 0; i < n; i++) {
          if (!(await cards.nth(i).isVisible())) continue;
          const f = `${phase}__${p.id}__card${i}.png`;
          // A locator screenshot scrolls a lower market card into view and may catch the
          // composited YES/NO label before it paints. Scroll first, then wait for two
          // browser paint frames; a visible live choice must also have both words.
          await cards.nth(i).scrollIntoViewIfNeeded();
          await p.page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          if (requirement.marketPage) {
            const choices = cards.nth(i).locator("button.btn-yes, button.btn-no");
            if (await choices.count()) {
              if (await choices.count() !== 2 || !(await choices.nth(0).isVisible()) || !(await choices.nth(1).isVisible())
                || !(await choices.nth(0).textContent())?.trim() || !(await choices.nth(1).textContent())?.trim()) {
                throw new Error(`market card ${i} has an unreadable side choice`);
              }
            }
          }
          await p.page.waitForTimeout(120);
          // A board refresh or phase turnover during the crop cannot make a valid state frame.
          const cropped = await verifiedScreenshot({
            sample: sampleFrame,
            capture: () => cards.nth(i).screenshot(),
            valid: (sample) => exactMarketReady(sample, requirement),
            retry: async () => {
              await p.page.waitForTimeout(300);
              await cards.nth(i).scrollIntoViewIfNeeded();
              await p.page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            },
          });
          cardImages.push({ file: f, image: cropped.image });
          cardFiles.push({ file: f, phase: await cards.nth(i).getAttribute("data-phase"), beforeMs: cropped.before.now, afterMs: cropped.after.now });
        }
      });
      // Do not leave a plausible-looking invalid screenshot on disk: every crop must
      // survive its own before/after check before any file for this cell is written.
      writeFileSync(join(OUT, file), accepted.image);
      for (const card of cardImages) writeFileSync(join(OUT, card.file), card.image);
      for (const frame of motionFrames) writeFileSync(join(OUT, frame.file), frame.image);
      const final = accepted.after;
      return { cell: p.id, lang: final.lang, langOk: final.lang === p.locale,
        hydrated: hydrated || exactMarketReady(final, requirement), marksReady: final.marksReady,
        chartReady: requirement.stoppedGold || final.chartReady,
        signedIn: final.signedIn, signedInOk: (p.who === "player") === final.signedIn,
        file, beforeMs: accepted.before.now, afterMs: final.now, attempts: accepted.attempt,
        marketCase: requirement.marketCase, marketCards: final.marketCards,
        goldSelected: final.goldSelected, goldDurationSelected: final.goldDurationSelected,
        emptyStateText: requirement.stoppedGold ? final.emptyStateText : null,
        bettableChoiceCount: requirement.stoppedGold ? final.bettableChoiceCount : null,
        cards: cardFiles, heldAction: final.heldAction, oneSideCaption: final.oneSideCaption,
        cardGeometry: final.cardGeometry,
        lineShift, pulses: accepted.before.pulses,
        motionFrames: motionFrames.map(({ file, before, after, gate }) => ({ file, before, after, gate })) };
    } catch (e) {
      return { cell: p.id, error: String(e).slice(0, 200) };
    }
  });
  index.phases.push({ phase, path, at: new Date().toISOString(), shots });
  const bad = shots.filter((s) => s.error || s.langOk === false || s.signedInOk === false || s.hydrated === false || s.marksReady === false || s.chartReady === false).length;
  console.log(`  ▸ ${phase}: ${shots.length} cell(s)${bad ? ` · ${bad} problem(s)` : ""}`);
}

// ── The round, phase by phase ────────────────────────────────────────────────────────────────────────────────
// ⭐ THE ROUND UNDER TEST IS THE SUCCESSOR THE LAST SETTLE OPENED — the board's own "current" round. The board picks
// the newest-BOUNDARY started round (updown-board.ts), and `arm` opens a round whose boundary lies in the past, so an
// armed round sits behind any successor and the frames would show a different round from the one being timed (the
// first run's "locked" frame was an open round with 2:28 left). A settle's successor is both the newest by number and by
// boundary, so the board, the store's `latestForChain` and this driver all mean the same row.
const round = lastSettle?.out?.find((o) => o.durationMinutes === DUR && o.opened)?.opened;
if (!round?.id) die(`the last pre-roll settle opened no ${DUR}-minute successor: ${JSON.stringify(lastSettle?.out?.slice(0, 3)).slice(0, 300)}`);
const closeMs = Date.parse(round.closesAt);
const spanMs = DUR * 60_000;
const lockMs = closeMs - Math.max(30_000, spanMs * 0.2);
index.round = { ...round, lockAt: new Date(lockMs).toISOString() };
console.log(`  round ${round.id} opened ${round.opensAt}; lock ${new Date(lockMs).toISOString()}; closes ${round.closesAt}`);

await photograph("p1-open");
if (noBetParityOnly) {
  const openShots = new Map();
  for (const cell of pages) {
    const open = index.phases.find((entry) => entry.phase === "p1-open")?.shots.find((entry) => entry.cell === cell.id);
    if (!open || open.error || open.cardGeometry?.layout !== "player" || open.heldAction?.layout !== "player") {
      throw new Error(`360px no-stake open-card premise missing for ${cell.id}: ${JSON.stringify(open).slice(0, 220)}`);
    }
    if (Math.abs(open.cardGeometry.height - 381) > 1) {
      throw new Error(`360px no-stake open card must be 381px for ${cell.id}, measured ${open.cardGeometry.height.toFixed(1)}px`);
    }
    if (open.heldAction.buttons !== 2 || open.heldAction.minButtonHeight < 40 || open.heldAction.clearance < 24) {
      throw new Error(`360px no-stake choices are clipped or too small for ${cell.id}: ${JSON.stringify(open.heldAction)}`);
    }
    openShots.set(cell.id, open);
  }
  await waitUntil(lockMs + 2_000, "the no-stake lock");
  await photograph("p7-locked");
  index.noBetParity = [];
  for (const cell of pages) {
    const open = openShots.get(cell.id);
    const locked = index.phases.find((entry) => entry.phase === "p7-locked")?.shots.find((entry) => entry.cell === cell.id);
    if (!locked || locked.error || locked.cardGeometry?.layout !== "player"
      || !sameCardFootprint(open.cardGeometry.height, locked.cardGeometry.height)) {
      throw new Error(`360px no-stake open/locked card mismatch for ${cell.id}: ${JSON.stringify({ open: open.cardGeometry, locked: locked?.cardGeometry }).slice(0, 220)}`);
    }
    const result = { cell: cell.id, openHeight: open.cardGeometry.height, lockedHeight: locked.cardGeometry.height,
      delta: locked.cardGeometry.height - open.cardGeometry.height, choiceClearance: open.heldAction.clearance,
      minChoiceHeight: open.heldAction.minButtonHeight };
    index.noBetParity.push(result);
    console.log(`  ▸ ${cell.id}: open ${result.openHeight.toFixed(1)}px · locked ${result.lockedHeight.toFixed(1)}px · choice clearance ${result.choiceClearance.toFixed(1)}px`);
  }
  await finishCapture();
}

// A full matrix makes one actual local bet per player width, sequentially: each
// receipt then proves its own stake, locale and viewport. The quick sweep keeps
// one 360px bet. The p1 pages are already hydrated on this board, so no cold
// reload consumes the five-second success modal or the round's open window.
const receiptPlayers = receiptParticipants(pages, fullMatrix);
if (receiptPlayers.length === 0) die("state capture needs a signed-in cell for a real quick bet");
const bettor = receiptPlayers.find((p) => p.width === 360) ?? receiptPlayers[0];
const receiptShots = [];
for (const p of receiptPlayers) {
  try {
    const card = p.page.locator(`article.mcardp[data-phase="open"]:has(a[href="/updown/${round.id}"])`).first();
    await card.locator('[role="radiogroup"] button').first().waitFor({ state: "visible", timeout: 12000 });
    if (await p.page.evaluate(() => document.documentElement.lang) !== p.locale) throw new Error(`wrong locale before bet: ${p.locale}`);
    await card.locator('[role="radiogroup"] button').first().click();
    await card.locator("button.btn-yes").first().click();
    await p.page.waitForFunction((expected) => [...document.querySelectorAll('[role="dialog"] p.eyebrow')]
      .some((node) => node.textContent?.trim() === expected), RECEIPT_EYEBROWS[p.locale], { timeout: 8000 });
    const sampleReceipt = () => p.page.evaluate(({ roundId }) => {
      const card = [...document.querySelectorAll("article.mcardp")].find((node) => node.querySelector(`a[href="/updown/${roundId}"]`));
      const dialog = [...document.querySelectorAll('[role="dialog"]')].find((node) => node.querySelector("p.eyebrow"));
      const box = dialog?.getBoundingClientRect();
      return {
        now: Date.now(), lang: document.documentElement.lang,
        signedIn: !!document.querySelector('[data-testid="wallet-balance-pill"], .kp-balance-pill, a[href="/wallet"]'),
        roundPhase: card?.getAttribute("data-phase") ?? null,
        dialogVisible: dialog?.getAttribute("aria-modal") === "true" && !dialog.hasAttribute("inert")
          && !!box && box.width > 0 && box.height > 0 && getComputedStyle(dialog).visibility !== "hidden",
        eyebrow: dialog?.querySelector("p.eyebrow")?.textContent?.trim() ?? null,
        title: dialog?.querySelector("h2")?.textContent?.trim() ?? null,
        text: dialog?.textContent ?? "",
      };
    }, { roundId: round.id });
    const accepted = await verifiedScreenshot({
      sample: sampleReceipt,
      capture: () => p.page.screenshot(),
      valid: (sample) => receiptReady(sample, { locale: p.locale }),
      attempts: 1, // A failed frame never repeats a money action.
    });
    const file = `p2-receipt__${p.id}.png`;
    writeFileSync(join(OUT, file), accepted.image);
    receiptShots.push({ cell: p.id, file, lang: accepted.after.lang, langOk: true, receiptOk: true,
      beforeMs: accepted.before.now, afterMs: accepted.after.now });
  } catch (error) {
    receiptShots.push({ cell: p.id, receiptOk: false, error: String(error).slice(0, 200) });
  } finally {
    await p.page.keyboard.press("Escape").catch(() => {});
  }
}
index.phases.push({ phase: "p2-receipt", shots: receiptShots });
console.log(`  ▸ p2-receipt: ${receiptShots.filter((shot) => shot.receiptOk).length}/${receiptPlayers.length} real local receipts`);

await photograph("p3-youre-in", BOARD, (p) => p.who === "player");
if (heldClearanceOnly) await finishCapture();

const obsUp = await fetch(`${BASE}/api/dev-test/updown-observe`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ asset: "BTC", roundId: round.id, delta: 41.37 }) }).then((r) => r.json()).catch(() => null);
index.observeUp = obsUp;
await photograph("p4-moved-up", BOARD, inFullMatrix((p) => p.width === 360 || p.width === 1280));
const obsDown = await fetch(`${BASE}/api/dev-test/updown-observe`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ asset: "BTC", roundId: round.id, delta: -63.12 }) }).then((r) => r.json()).catch(() => null);
index.observeDown = obsDown;
await photograph("p5-moved-down", BOARD, inFullMatrix((p) => p.width === 360 || p.width === 1280));

await waitUntil(lockMs - 30_000, "betting's last 30 seconds");
await photograph("p6-last30", BOARD, inFullMatrix((p) => p.width === 360));

await waitUntil(lockMs + 2_000, "the lock");
await photograph("p7-locked");
if (pages.some((page) => page.width === 360 && page.who === "guest")) {
  const shot = (phase, cell) => index.phases.find((entry) => entry.phase === phase)?.shots.find((entry) => entry.cell === cell);
  const pairs = [...new Set(pages.filter((page) => page.width === 360 && page.who === "guest").map((page) => page.locale))]
    .flatMap((locale) => [[`guest-360-${locale}`, "p1-open"], [`player-360-${locale}`, "p3-youre-in"]]);
  index.lockedParity = pairs.map(([cell, openPhase]) => {
    const openHeight = shot(openPhase, cell)?.cardGeometry?.height;
    const lockedHeight = shot("p7-locked", cell)?.cardGeometry?.height;
    if (!Number.isFinite(openHeight) || !Number.isFinite(lockedHeight)) {
      throw new Error(`360px card-height premise missing for ${cell}`);
    }
    return { cell, openPhase, openHeight, lockedHeight, delta: lockedHeight - openHeight };
  });
  for (const pair of index.lockedParity) console.log(`  ▸ ${pair.cell}: open ${pair.openHeight.toFixed(1)}px · locked ${pair.lockedHeight.toFixed(1)}px · delta ${pair.delta.toFixed(1)}px`);
  for (const pair of index.lockedParity) {
    if (!sameCardFootprint(pair.openHeight, pair.lockedHeight)) {
      throw new Error(`360px open/locked card-height mismatch for ${pair.cell}: ${pair.delta.toFixed(1)}px`);
    }
  }
}
if (lockHeightOnly) await finishCapture();

await waitUntil(closeMs + 3_000, "the close");
await photograph("p8-closed");

// The settle: with the chain timer off (the header's run mode, UPDOWN_SCHEDULER=false) the driver performs it 40 s after
// the close — the confirming state stays on screen for p8 — through the handover endpoint, whose one advanceChain call
// closes the round and opens its successor exactly as production's settle does. With the timer on, it waits for the
// timer's own settle first (the board's card leaving the live phases) and only then falls back.
console.log("=== settle");
const settledOnBoard = async () => bettor.page.evaluate((id) => {
  const card = document.querySelector(`article.mcardp:has(a[href="/updown/${id}"])`);
  const ph = card?.getAttribute("data-phase") || "";
  // `spent` means the deadline passed while the close is still being read; it
  // is not a payout. Only a resolved/void card or the settlement handover can
  // prove the scheduler actually settled the round.
  return ph === "resolved" || ph === "void";
}, round.id).catch(() => false);
let byScheduler = false;
for (let t = 0; t < 8; t++) {
  await bettor.page.goto(`${BASE}${BOARD}`, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
  await bettor.page.waitForTimeout(2500);
  if (await settledOnBoard()) { byScheduler = true; break; }
  if (Date.now() > closeMs + 40_000) break;
  await new Promise((r) => setTimeout(r, 2500));
}
if (!byScheduler) {
  const settled = await post("/api/dev-test/updown-handover", { phase: "settle" });
  index.settle = settled.out?.find((o) => o.durationMinutes === DUR) ?? null;
  if (index.settle?.closed?.id !== round.id || !index.settle.closed.resolvedAt) {
    die(`the handover did not settle the round under test: ${JSON.stringify(index.settle).slice(0, 300)}`);
  }
}
index.settledBy = byScheduler ? "scheduler" : "driver";
await photograph("p9-settled");
await new Promise((r) => setTimeout(r, 4000));
await photograph("p10-handover");

await photograph("p11-round-settled", `/updown/${round.id}`, inFullMatrix((p) => p.width === 360 || p.width === 1280));
const succ = await fetch(`${BASE}/api/dev-test/updown-observe`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ asset: "BTC", dryRun: true }) }).then((r) => r.json()).catch(() => null);
if (succ?.round?.roundId) await photograph("p11-round-successor", `/updown/${succ.round.roundId}`, inFullMatrix((p) => p.width === 360 || p.width === 1280));

await photograph("p12-markets", "/markets", inFullMatrix((p) => p.who === "guest" || p.width === 1280));
for (const [phase, marketCase] of Object.entries(marketCases)) {
  const path = `/${marketCase.surface}?q=${encodeURIComponent(`id:${marketCase.id}`)}`;
  await photograph(phase, path, inFullMatrix((p) => p.who === "guest" || p.width === 1280));
}
const stoppedChains = await post("/api/dev-test/updown-handover", { phase: "stop" });
if (!stoppedChains.ok || stoppedChains.phase !== "stop" || stoppedChains.chains !== 2
  || stoppedChains.out?.length !== 2
  || !stoppedChains.out.some((row) => row.durationMinutes === DUR && row.ok)
  || !stoppedChains.out.some((row) => row.durationMinutes === GOLD_DUR && row.ok)
  || stoppedChains.out.some((row) => !row.ok)) {
  die(`Gold stopped-chain premise did not read back: ${JSON.stringify(stoppedChains).slice(0, 220)}`);
}
index.goldStopped = { goldDurationMinutes: GOLD_DUR, chains: stoppedChains.chains, out: stoppedChains.out };
await photograph("p13-gold-board", `/updown?asset=XAU&d=${GOLD_DUR}`);

await finishCapture();

async function finishCapture() {
  await browser.close();
  index.finishedAt = new Date().toISOString();
  writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 2));
  const problems = index.phases.flatMap((ph) => (ph.shots || []).filter((s) => s.error || s.receiptOk === false || s.langOk === false || s.signedInOk === false || s.hydrated === false || s.marksReady === false || s.chartReady === false)
    .map((s) => `${ph.phase} ${s.cell} ${s.error || (s.receiptOk === false ? "receipt missing" : s.langOk === false ? "lang" : s.signedInOk === false ? "sign-in" : s.hydrated === false ? "not hydrated" : s.marksReady === false ? "asset mark missing" : "chart not painted")}`));
  console.log(`U43 states → ${OUT} · ${index.phases.length} phases · ${problems.length} problem(s)`);
  for (const p of problems) console.log("  ✗", p);
  process.exit(problems.length ? 1 : 0);
}
