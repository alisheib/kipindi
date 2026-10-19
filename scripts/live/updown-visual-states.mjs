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
 * ⭐ NOTHING IS A FIXTURE. Rounds are opened, locked, closed and settled by the production service functions: a few
 * pre-roll rounds are armed and settled through /api/dev-test/updown-handover (the board gains history), the round under
 * test is the successor the last settle opened, and the dev server's own chain timer settles it at its close; a moved price is a confirmed read planted
 * through /api/dev-test/updown-observe; the demo player's stake is a real quick bet clicked on the card.
 *
 * The phases, each photographed in every open page at once (the states are minutes long, so the matrix is shot in
 * parallel rather than one cell after another):
 *   p1-open          the round under test, signed out and signed in (the stake controls)
 *   p2-receipt       the demo player's quick bet (UP, the first chip) and its receipt
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
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

mkdirSync(OUT, { recursive: true });

const UA = "Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Mobile Safari/537.36";
const UA_DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/153.0.0.0 Safari/537.36";
const STILL = "*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}";
const HEIGHT_FOR = { 320: 640, 360: 780, 390: 844, 768: 1024, 1280: 800, 1920: 1080 };

/** The matrix: every signed-in cell in Swahili across the phone widths, the other languages at a phone and a desktop. */
const CELLS = [
  { who: "guest", locale: "sw", width: 360 }, { who: "guest", locale: "en", width: 360 }, { who: "guest", locale: "zh", width: 360 },
  { who: "guest", locale: "sw", width: 1280 },
  { who: "player", locale: "sw", width: 320 }, { who: "player", locale: "sw", width: 360 }, { who: "player", locale: "sw", width: 390 },
  { who: "player", locale: "sw", width: 768 }, { who: "player", locale: "sw", width: 1280 },
  { who: "player", locale: "en", width: 360 }, { who: "player", locale: "en", width: 1280 },
  { who: "player", locale: "zh", width: 360 }, { who: "player", locale: "zh", width: 1920 },
];

const die = (why) => { console.error(`\n🔴 PREMISE ABSENT — ${why}\n   Refusing to photograph a page that cannot show the state.`); process.exit(2); };
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

const index = { base: BASE, tag: TAG, dur: DUR, startedAt: new Date().toISOString(), phases: [] };

// ── Seed ──────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("=== seed");
const seed = await post("/api/dev-test/updown-seed", { durations: [5, 10, 15], assets: ["BTC", "XAU"], feedProvider: "mock-bars" });
if (!seed.ok) die(`updown-seed: ${JSON.stringify(seed).slice(0, 200)}`);
await post("/api/dev-test/seed-markets");
await fetch(`${BASE}/api/dev-test/resolve-seed-markets`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ markets: 2, bettors: 4, stake: 2000, outcome: "YES", settle: true }) }).catch(() => {});
await fetch(`${BASE}/api/dev-test/resolve-seed-markets`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ markets: 1, bettors: 2, stake: 1000, side: "YES", outcome: "NO", settle: true }) }).catch(() => {});
await post("/api/dev-test/updown-advance");

// A board with history, as production has: a few REAL rounds armed and settled (5 s each), so the last-rounds strip
// carries outcomes instead of the board falling back to the chart alone.
const PREROLL = Math.max(1, Number(process.env.PREROLL || 6));
let lastSettle = null;
for (let i = 0; i < PREROLL; i++) {
  await post("/api/dev-test/updown-handover", { phase: "arm", leadSeconds: 5 });
  await new Promise((r) => setTimeout(r, 6500));
  lastSettle = await post("/api/dev-test/updown-handover", { phase: "settle" });
}
console.log(`  pre-rolled ${PREROLL} settled round(s)`);

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
await authCtx.close();
if (!playerState.cookies.some((c) => c.name === "kp_session")) die(`the demo sign-in set no session cookie: ${playerState.cookies.map((c) => c.name).join(", ")}`);

const pages = [];
for (const c of CELLS) {
  const phone = c.width < 640;
  const ctx = await browser.newContext({
    viewport: { width: c.width, height: HEIGHT_FOR[c.width] || 900 }, deviceScaleFactor: phone ? 2 : 1,
    userAgent: phone ? UA : UA_DESKTOP, isMobile: phone, hasTouch: phone,
    storageState: c.who === "player" ? playerState : undefined,
  });
  await ctx.addCookies([{ name: "kp-locale", value: c.locale, domain: host, path: "/" }]);
  await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); localStorage.setItem("kp-updown-viz", "cubes"); } catch {} });
  const page = await ctx.newPage();
  pages.push({ ...c, ctx, page, id: `${c.who}-${c.width}-${c.locale}` });
}
const BOARD = `/updown?asset=BTC&d=${DUR}`;

/** A card's own frame without the chrome floating over it (the twin of updown-visual-capture.mjs's helper). */
async function withoutChrome(page, fn) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("body *")) {
      if (el.closest("article.mcardp")) continue;
      const p = getComputedStyle(el).position;
      if (p === "fixed" || (p === "sticky" && el.matches("header, .app-topbar"))) {
        el.setAttribute("data-u43-hid", el.style.visibility || "");
        el.style.visibility = "hidden";
      }
    }
  });
  try { return await fn(); }
  finally {
    await page.evaluate(() => {
      for (const el of document.querySelectorAll("[data-u43-hid]")) { el.style.visibility = el.getAttribute("data-u43-hid"); el.removeAttribute("data-u43-hid"); }
    }).catch(() => {});
  }
}

async function photograph(phase, path = BOARD, filter = () => true) {
  const shots = [];
  await Promise.all(pages.filter(filter).map(async (p) => {
    try {
      await p.page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 90000 });
      // Hydrated before the frame: the card clocks paint "--:--" until the client ticks, and the signed-in controls are
      // interactive only after hydration. Wait for a live clock (or give up after 12 s and say so in the index).
      const hydrated = await p.page.waitForFunction(() => {
        const digits = [...document.querySelectorAll("article.mcardp .m-tick")].map((e) => e.textContent || "");
        return digits.length === 0 || digits.every((t) => !t.includes("--:--"));
      }, null, { timeout: 12000 }).then(() => true).catch(() => false);
      await p.page.waitForTimeout(900);
      await p.page.addStyleTag({ content: STILL });
      const lang = await p.page.evaluate(() => document.documentElement.lang);
      const signedIn = await p.page.evaluate(() => !!document.querySelector('[data-testid="wallet-balance-pill"], .kp-balance-pill, a[href="/wallet"]'));
      const file = `${phase}__${p.id}.png`;
      await p.page.screenshot({ path: join(OUT, file), fullPage: true });
      const cards = p.page.locator("article.mcardp");
      const n = Math.min(await cards.count(), 4);
      const cardFiles = [];
      await withoutChrome(p.page, async () => {
        for (let i = 0; i < n; i++) {
          if (!(await cards.nth(i).isVisible())) continue;
          const f = `${phase}__${p.id}__card${i}.png`;
          await cards.nth(i).screenshot({ path: join(OUT, f) });
          cardFiles.push({ file: f, phase: await cards.nth(i).getAttribute("data-phase") });
        }
      });
      shots.push({ cell: p.id, lang, langOk: lang === p.locale, hydrated, signedIn, signedInOk: (p.who === "player") === signedIn, file, cards: cardFiles });
    } catch (e) {
      shots.push({ cell: p.id, error: String(e).slice(0, 200) });
    }
  }));
  index.phases.push({ phase, path, at: new Date().toISOString(), shots });
  const bad = shots.filter((s) => s.error || s.langOk === false || s.signedInOk === false || s.hydrated === false).length;
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

// The demo player's quick bet: the first stake chip, then Up, on the Swahili 360 card.
const bettor = pages.find((p) => p.id === "player-360-sw");
try {
  await bettor.page.goto(`${BASE}${BOARD}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await bettor.page.waitForFunction(() => !!document.querySelector('article.mcardp[data-phase="open"] [role="radiogroup"] button'), null, { timeout: 20000 });
  await bettor.page.waitForTimeout(800);
  const card = bettor.page.locator('article.mcardp[data-phase="open"]').first();
  await card.locator('[role="radiogroup"] button').first().click();
  await card.locator("button.btn-yes").first().click();
  await bettor.page.waitForTimeout(2500);
  await bettor.page.screenshot({ path: join(OUT, "p2-receipt__player-360-sw.png") });
  index.phases.push({ phase: "p2-receipt", shots: [{ cell: "player-360-sw", file: "p2-receipt__player-360-sw.png" }] });
  console.log("  ▸ p2-receipt: 1 cell");
  await bettor.page.keyboard.press("Escape").catch(() => {});
} catch (e) {
  index.phases.push({ phase: "p2-receipt", error: String(e).slice(0, 200) });
  console.log(`  ✗ p2-receipt: ${String(e).slice(0, 120)}`);
}

await photograph("p3-youre-in", BOARD, (p) => p.who === "player");

const obsUp = await fetch(`${BASE}/api/dev-test/updown-observe`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ asset: "BTC", roundId: round.id, delta: 41.37 }) }).then((r) => r.json()).catch(() => null);
index.observeUp = obsUp;
await photograph("p4-moved-up", BOARD, (p) => p.width === 360 || p.width === 1280);
const obsDown = await fetch(`${BASE}/api/dev-test/updown-observe`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ asset: "BTC", roundId: round.id, delta: -63.12 }) }).then((r) => r.json()).catch(() => null);
index.observeDown = obsDown;
await photograph("p5-moved-down", BOARD, (p) => p.width === 360 || p.width === 1280);

await waitUntil(lockMs - 22_000, "betting's last 30 seconds");
await photograph("p6-last30", BOARD, (p) => p.width === 360);

await waitUntil(lockMs + 2_000, "the lock");
await photograph("p7-locked");

await waitUntil(closeMs + 3_000, "the close");
await photograph("p8-closed");

// The settle is the SCHEDULER's, as on production: the dev server runs the same chain timer, which settles the round at
// its close and opens the successor. Watch the board for the round's card leaving the live phases; only if the
// scheduler has not settled it 40 s after the close does the driver settle it itself (the handover endpoint).
console.log("=== settle");
const settledOnBoard = async () => bettor.page.evaluate((id) => {
  const card = document.querySelector(`article.mcardp:has(a[href="/updown/${id}"])`);
  const ph = card?.getAttribute("data-phase") || "";
  return /result|spent|settled|idle|^h:/.test(ph);
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
}
index.settledBy = byScheduler ? "scheduler" : "driver";
await photograph("p9-settled");
await new Promise((r) => setTimeout(r, 4000));
await photograph("p10-handover");

await photograph("p11-round-settled", `/updown/${round.id}`, (p) => p.width === 360 || p.width === 1280);
const succ = await fetch(`${BASE}/api/dev-test/updown-observe`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ asset: "BTC", dryRun: true }) }).then((r) => r.json()).catch(() => null);
if (succ?.round?.roundId) await photograph("p11-round-successor", `/updown/${succ.round.roundId}`, (p) => p.width === 360 || p.width === 1280);

await photograph("p12-markets", "/markets", (p) => p.who === "guest" || p.width === 1280);
await photograph("p13-gold-board", "/updown?asset=XAU", (p) => p.width === 360 && p.locale === "sw");

await browser.close();
index.finishedAt = new Date().toISOString();
writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 2));
const problems = index.phases.flatMap((ph) => (ph.shots || []).filter((s) => s.error || s.langOk === false || s.signedInOk === false || s.hydrated === false)
  .map((s) => `${ph.phase} ${s.cell} ${s.error || (s.langOk === false ? "lang" : s.signedInOk === false ? "sign-in" : "not hydrated")}`));
if (index.phases.some((ph) => ph.phase === "p2-receipt" && ph.error)) problems.push("p2-receipt: the demo bet did not land");
console.log(`U43 states → ${OUT} · ${index.phases.length} phases · ${problems.length} problem(s)`);
for (const p of problems) console.log("  ✗", p);
process.exit(problems.length ? 1 : 0);
