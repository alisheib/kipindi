/**
 * §3 · THE INSTALL INVITATION, DRIVEN ON PRODUCTION.
 *
 *   node scripts/live-install-invite.mjs first      # a first-ever visit is NOT interrupted
 *   node scripts/live-install-invite.mjs shown      # it appears, and it FITS, in 3 languages × 5 widths
 *   node scripts/live-install-invite.mjs gone       # it removes itself on a money-commit surface
 *   node scripts/live-install-invite.mjs installed  # already installed → NOTHING
 *
 * ⛔ THE OVERLAP CHECK IS THE POINT OF THIS FILE, AND A SCREENSHOT CANNOT MAKE IT.
 * Ali's rule is *"never over the bet button or the balance pill"*, and this repo has already
 * shipped a WhatsApp FAB sitting on top of a CTA — with screenshots taken — because nobody
 * compared two rectangles. So this driver reads the card's `getBoundingClientRect()` and the
 * **bottom nav's** and the **balance pill's**, and asserts the boxes DO NOT INTERSECT. A visual
 * sweep can miss a 4px overlap; arithmetic cannot.
 *
 * ⛔ AND THE FIT CHECK IS A RECTANGLE, NOT A SUBSTRING. `innerText` returns the full string
 * whatever the ellipsis paints, so every cell measures `scrollWidth > clientWidth`,
 * `scrollHeight > clientHeight` and that the box sits inside the viewport — because this platform
 * shipped a component 119px below the fold for its whole life while every grep was green.
 *
 * ⚠️ WHAT IS SIMULATED, STATED PLAINLY RATHER THAN HIDDEN.
 *  · `shown` SEEDS `50pick-install-visits` so the second-visit rule is already satisfied. That is
 *    simulating a RETURNING VISITOR, which is exactly what `MIN_VISITS` encodes; the alternative
 *    is loading the site twice for every one of fifteen cells. The 45-second engagement delay is
 *    NOT simulated — it is waited out, once per language.
 *  · `installed` overrides `matchMedia` before any script runs, because Playwright cannot emulate
 *    `display-mode: standalone`. ⭐ It is the only way to reach the case the work order calls the
 *    most obvious way this ships broken, and a case nobody can reach is a case nobody tests.
 */
import { readFileSync } from "node:fs";
import { BASE, browser, login, shot, recorder, fleetPersona } from "./live/harness.mjs";

const CMD = process.argv[2] ?? "shown";
const PLAYER = process.env.PLAYER ?? "01";
const me = fleetPersona(PLAYER);
const WIDTHS = (process.env.WIDTHS ?? "360,393,768,1024,1280").split(",").map(Number);
const LOCALES = (process.env.LOCALES ?? "en,sw,zh").split(",");
/** The component's own MIN_ENGAGE_MS is 45s; wait past it rather than around it. */
const WAIT_MS = Number(process.env.WAIT_MS ?? 50_000);

const rec = recorder(`LIVE INSTALL INVITE · ${CMD}`);
const SEL = '[data-testid="install-invite"]';

/** Seed a returning visitor. ⚠️ Runs BEFORE any page script, so the component's own read sees it. */
const seedReturning = (ctx) => ctx.addInitScript(() => {
  try { window.localStorage.setItem("50pick-install-visits", "5"); } catch { /* ignore */ }
  try { window.localStorage.removeItem("50pick-install-dismissed-at"); } catch { /* ignore */ }
  try { window.localStorage.removeItem("50pick-install-dismissals"); } catch { /* ignore */ }
  try { window.localStorage.removeItem("50pick-install-done"); } catch { /* ignore */ }
});

/** ⛔ The card, the bottom nav and the balance pill as RECTANGLES, plus a per-element clip scan. */
const measure = (page) => page.evaluate((sel) => {
  const card = document.querySelector(sel);
  if (!card) return null;
  const r = (el) => { const b = el.getBoundingClientRect(); return { t: Math.round(b.top), l: Math.round(b.left), rt: Math.round(b.right), b: Math.round(b.bottom) }; };
  const nav = document.querySelector('nav[aria-label="Primary"], [data-testid="bottom-nav"]');
  const pill = document.querySelector('[data-testid="wallet-balance-capsule"]');
  const clipped = [];
  for (const n of [card, ...card.querySelectorAll("*")]) {
    if (!(n instanceof HTMLElement)) continue;
    const cs = getComputedStyle(n);
    // ⚠️ Skip what is wide BY DESIGN — an ellipsis element's hidden tail IS the "…", and an
    // sr-only node is deliberately 1px. Reporting those is how a scan condemns correct code.
    if (cs.textOverflow === "ellipsis") continue;
    if (n.clientWidth <= 1 && n.clientHeight <= 1) continue;
    if (n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1) {
      clipped.push(`${n.tagName.toLowerCase()} ${n.scrollWidth}x${n.scrollHeight} in ${n.clientWidth}x${n.clientHeight}`);
    }
  }
  return {
    card: r(card), nav: nav ? r(nav) : null, pill: pill ? r(pill) : null,
    vw: window.innerWidth, vh: window.innerHeight, clipped,
    text: (card.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 200),
  };
}, SEL);

const overlaps = (a, b) => !!a && !!b && a.l < b.rt && b.l < a.rt && a.t < b.b && b.t < a.b;

// ─────────────────────────────────────────────────────────────────────────────
async function first() {
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    // ⛔ NO SEED. A genuinely fresh profile: this is a first-ever visit.
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 45_000 });
    rec.check("1: nothing appears on arrival", await page.locator(SEL).count() === 0, "");
    await page.waitForTimeout(WAIT_MS);
    rec.check(`2: ★★ and STILL nothing after ${Math.round(WAIT_MS / 1000)}s — a stranger's first visit is not interrupted`,
      await page.locator(SEL).count() === 0,
      "MIN_VISITS = 2 exists precisely so this cell is empty");
    await shot(page, "install-first-visit-quiet");
  } finally { await ctx.close(); await b.close(); }
}

async function installed() {
  const { b, ctx } = await browser();
  await seedReturning(ctx);
  // ⛔ THE CASE A DESKTOP DEV BROWSER NEVER SHOWS YOU, reached the only way it can be.
  await ctx.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = (q) => (String(q).includes("display-mode: standalone")
      ? { matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }
      : real(q));
  });
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 45_000 });
    rec.check("1: the standalone override is in effect (fixture)",
      await page.evaluate(() => window.matchMedia("(display-mode: standalone)").matches), "");
    await page.waitForTimeout(WAIT_MS);
    rec.check("2: ★★ ALREADY INSTALLED → NOTHING, even with every other rule satisfied",
      await page.locator(SEL).count() === 0,
      "inviting a player who is already inside the installed app is the most obvious way this ships broken");
    await shot(page, "install-already-installed-quiet");
  } finally { await ctx.close(); await b.close(); }
}

async function shown() {
  for (const loc of LOCALES) {
    const { b, ctx } = await browser();
    await seedReturning(ctx);
    await ctx.addCookies([{ name: "kp-locale", value: loc, url: BASE }]);
    const page = await ctx.newPage();
    try {
      // Signed in, because the bottom nav and the balance pill only exist for a player — and
      // those are the two boxes the card must not touch.
      await login(page, `fleet:${PLAYER}`);
      await page.setViewportSize({ width: WIDTHS[0], height: 780 });
      await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("main", { timeout: 45_000 });
      await page.waitForTimeout(WAIT_MS);
      const present = await page.locator(SEL).count() > 0;
      rec.check(`1: ${loc} · ★★ the invitation appeared for a returning visitor after the engagement delay`,
        present, present ? "" : "nothing rendered — the card, its mount, or the eligibility rules");
      if (!present) { await shot(page, `install-missing-${loc}`); continue; }

      // ⭐ FIVE WIDTHS WITHOUT RELOADING. The card is fixed-position and its copy is already in
      // the DOM, so resizing measures the same card at every width — and it does not spend the
      // 45-second delay five more times.
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: w < 500 ? 780 : 900 });
        await page.waitForTimeout(700);
        const m = await measure(page);
        if (!m) { rec.check(`2: ${loc}@${w} · the card is still on screen at this width`, false, "vanished on resize"); continue; }
        rec.check(`2: ${loc}@${w} · ⛔ no text escapes the card, horizontally or vertically`,
          m.clipped.length === 0, m.clipped.join(" · "));
        rec.check(`2: ${loc}@${w} · ⛔ the card is INSIDE the viewport — rendered is not visible`,
          m.card.t >= -1 && m.card.b <= m.vh + 1 && m.card.l >= -1 && m.card.rt <= m.vw + 1,
          `card ${JSON.stringify(m.card)} viewport ${m.vw}x${m.vh}`);
        // ⛔ ALI'S RULE, AS ARITHMETIC.
        rec.check(`3: ${loc}@${w} · ★★ it does NOT overlap the bottom nav`,
          !overlaps(m.card, m.nav), m.nav ? `card ${JSON.stringify(m.card)} nav ${JSON.stringify(m.nav)}` : "no bottom nav at this width (desktop)");
        rec.check(`3: ${loc}@${w} · ★★ …and it does NOT overlap the balance pill`,
          !overlaps(m.card, m.pill), m.pill ? `card ${JSON.stringify(m.card)} pill ${JSON.stringify(m.pill)}` : "no pill found — check the testid before trusting this");
        await shot(page, `install-${loc}-${w}`);
      }
      rec.note(`${loc} copy: ${(await measure(page))?.text ?? ""}`);
    } finally { await ctx.close(); await b.close(); }
  }
}

async function gone() {
  const { b, ctx } = await browser();
  await seedReturning(ctx);
  const page = await ctx.newPage();
  try {
    await login(page, `fleet:${PLAYER}`);
    await page.setViewportSize({ width: 393, height: 780 });
    await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 45_000 });
    await page.waitForTimeout(WAIT_MS);
    rec.check("1: the invitation is on the board (the precondition for this leg)",
      await page.locator(SEL).count() > 0, "");

    // ⛔ A REAL <Link>, SO THIS IS A SOFT NAVIGATION. The gate is applied at render on every
    // route change; a `page.goto` would remount the whole tree and prove nothing about that.
    await page.evaluate(() => { window.__inv = "soft"; });
    const card = page.locator('a[href^="/markets/"]').first();
    await card.waitFor({ state: "visible", timeout: 20_000 });
    await card.click({ timeout: 20_000 });
    await page.waitForTimeout(3_000);
    rec.check("2: ⛔ the navigation was SOFT — the tree was preserved, which is the condition",
      await page.evaluate(() => window.__inv === "soft"), `url ${page.url().replace(BASE, "")}`);
    rec.check("3: ★★ the invitation REMOVED ITSELF on a money-commit surface",
      await page.locator(SEL).count() === 0,
      "it can sit over the gold confirm — this repo has shipped a FAB on a CTA before");
    await shot(page, "install-gone-on-bet-card");

    // ⭐ AND IT COMES BACK when the player leaves the commit surface — otherwise "gone" could be
    // satisfied by a card that simply died.
    await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForTimeout(3_000);
    rec.check("4: ⭐ CONTROL · and it returns once the money control is gone — so check 3 measured suppression, not death",
      await page.locator(SEL).count() > 0, `url ${page.url().replace(BASE, "")}`);
  } finally { await ctx.close(); await b.close(); }
}

const CMDS = { first, shown, gone, installed };
if (!CMDS[CMD]) throw new Error(`unknown command "${CMD}" — ${Object.keys(CMDS).join(" | ")}`);
await CMDS[CMD]();
rec.done();
