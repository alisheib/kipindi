/**
 * qa:auth-loss-mid-bet — A SESSION THAT ENDS MID-BET IS A SIGN-IN, NEVER A FAILED BET (live fix L3; the real-browser half
 * of `test:action-redirect`).
 *
 *   KP_BASE=http://localhost:<port> npm run qa:auth-loss-mid-bet
 *
 * For each money control — the classic dial (`/markets/<id>?side=YES`), the sell button (a held ticket's market page) and
 * Up & Down's quick bet (a round's page) — the demo player:
 *   1. CONTROL: commits with the session alive, and the wallet moves by exactly the stake (or the sale), so the drive's
 *      clicks are proven to reach the money action;
 *   2. reaches the same commit again (the confirm open, or the button ready), then the session is ENDED from a second
 *      sign-in of the same account (one session per account), then commits;
 *   3. for 8 s after the commit, every toast and dialog on the page is read: none may be a failure (an alert toast, or the
 *      controls' own failure titles), the page must reach the sign-in door, and no page error may be thrown;
 *   4. reads the wallet as the session that ended it (the second sign-in), before the commit and after: nothing moved.
 *      ⚠️ Never through a third sign-in: `/auth/demo` resets the demo wallet to TZS 100,000 on every visit
 *      (`ensureDemoUser`), which would hide a bet placed in between.
 * Before L3 (measured at `6da7f936`) step 3 showed "Could not place — Something went wrong at our end", "Couldn't cash
 * out — We're busy right now" with its "CASH-OUT FAILED" result, and "Bet not placed — The game is busy right now".
 *
 * ⛔ LOCAL ONLY: `http://localhost:PORT` exactly, an in-memory dev server (no DATABASE_URL), English. It seeds markets,
 * a portfolio and an Up & Down chain through the dev routes, and it places and sells with the demo player's money.
 */
import { chromium } from "playwright";
import { localBase, demoSession, LOCALE_COOKIE } from "./live/journey-pass.mjs";

const BASE = process.env.KP_BASE ?? "http://localhost:3041";
if (!localBase(BASE)) { console.error(`REFUSED — local dev only, addressed as http://localhost:PORT — got ${JSON.stringify(BASE)}`); process.exit(2); }
const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null);
if (!health) { console.error(`REFUSED — no server answered at ${BASE}/api/health`); process.exit(2); }
if (health.database?.configured !== false) { console.error(`REFUSED — the server at ${BASE} reports a configured database: this drive runs only in memory`); process.exit(2); }

const HOST = new URL(BASE).hostname;
const asCookie = (c) => ({ name: c.name, value: c.value, domain: HOST, path: c.path || "/" });
/** The controls' own failure titles (en), any one of which on screen after a redirect is the defect. */
const FAILURE_WORDS = /Could not place|Couldn't cash out|CASH-OUT FAILED|Bet not placed/i;

const browser = await chromium.launch();
let failures = 0;
let passes = 0;
const ok = (label, cond, extra = "") => {
  if (cond) passes++; else failures++;
  console.log(`  ${cond ? "PASS" : "FAIL"} ${label}${!cond && extra ? ` — ${extra}` : ""}`);
};

/** An English context holding `session`, or a fresh demo session (which resets the demo wallet to TZS 100,000). */
async function signedIn(session = null, viewport = { width: 390, height: 844 }) {
  const s = session ?? (await demoSession(browser, BASE));
  const ctx = await browser.newContext({ viewport });
  await ctx.addCookies([asCookie(s), { name: LOCALE_COOKIE, value: "en", domain: HOST, path: "/" }]);
  return ctx;
}
/** The wallet's balance as /wallet draws it, in whole shillings. */
async function balance(ctx) {
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/wallet`, { waitUntil: "load", timeout: 240_000 });
    const el = page.locator('[data-testid="wallet-balance"]').first();
    await el.waitFor({ timeout: 120_000 });
    await page.waitForTimeout(800);
    const digits = ((await el.textContent()) ?? "").replace(/[^0-9]/g, "");
    return digits ? Number(digits) : null;
  } finally {
    await page.close();
  }
}
/** Every toast and visible dialog for `ms` after a commit, the addresses passed through, and page errors. */
async function watch(page, errors, ms = 8000) {
  const seen = { alerts: new Set(), toasts: new Set(), dialogs: new Set(), urls: new Set() };
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const snap = await page.evaluate(() => ({
      alerts: [...document.querySelectorAll("[data-toaster] [role=alert]")].map((n) => n.innerText.replace(/\s+/g, " ").trim()),
      toasts: [...document.querySelectorAll("[data-toaster] [role=status]")].map((n) => n.innerText.replace(/\s+/g, " ").trim()),
      dialogs: [...document.querySelectorAll("[role=dialog], [role=alertdialog]")].filter((n) => n.getBoundingClientRect().height > 0).map((n) => n.innerText.replace(/\s+/g, " ").trim().slice(0, 140)),
      url: location.pathname + location.search,
    })).catch(() => null);
    if (snap) {
      snap.alerts.forEach((t) => seen.alerts.add(t)); snap.toasts.forEach((t) => seen.toasts.add(t));
      snap.dialogs.forEach((d) => seen.dialogs.add(d)); seen.urls.add(snap.url);
    }
    await page.waitForTimeout(200);
  }
  return { alerts: [...seen.alerts], toasts: [...seen.toasts], dialogs: [...seen.dialogs], urls: [...seen.urls], errors: [...errors] };
}

/**
 * One control: `open(page, round)` reaches the commit (round 0 the control, 1 the test), `commit(page)` presses it; `moves`
 * is how the control's commit moves the wallet (−stake for a bet, + the sale for a sell, null when the figure is read).
 */
async function control(name, { open, commit, moves }) {
  console.log(`\n■ ${name}`);
  // 1 · the control: the session alive, the commit lands
  {
    const ctx = await signedIn();
    const before = await balance(ctx);
    const page = await ctx.newPage();
    await open(page, 0);
    await commit(page);
    await page.waitForTimeout(4000);
    const after = await balance(ctx);
    const want = typeof moves === "function" ? moves(before) : before + moves;
    ok(`${name} · CONTROL: with the session alive the commit lands (wallet ${before} → ${after})`, before !== null && after !== null && (want === null ? after !== before : after === want),
      `wanted ${want === null ? "a change" : want}`);
    await ctx.close();
  }
  // 2-3 · the session ended between reaching the commit and pressing it
  const ctx = await signedIn();
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e?.message ?? e).slice(0, 200)));
  await open(page, 1);
  // A second sign-in of the same account ends this page's session; the wallet is read as that second session (step 4).
  const witness = await signedIn(await demoSession(browser, BASE));
  const before = await balance(witness);
  await commit(page);
  const r = await watch(page, errors);
  await ctx.close();
  const failed = [...r.alerts, ...r.toasts, ...r.dialogs].filter((t) => FAILURE_WORDS.test(t));
  ok(`${name} · no failure is said: no alert toast, none of the controls' failure titles`, r.alerts.length === 0 && failed.length === 0,
    [...r.alerts.map((a) => `alert: ${a}`), ...failed].join(" | "));
  ok(`${name} · the page goes to the sign-in door`, r.urls.some((u) => u.startsWith("/auth/login")), r.urls.join(" → "));
  ok(`${name} · no page error`, r.errors.length === 0, r.errors.join(" | "));
  if (r.toasts.length || r.dialogs.length) console.log(`    seen (not failures): ${[...r.toasts.map((t) => `toast: ${t}`), ...r.dialogs.map((d) => `dialog: ${d}`)].join(" | ")}`);
  // 4 · nothing moved
  const after = await balance(witness);
  await witness.close();
  ok(`${name} · nothing moved: the wallet reads ${after} after, ${before} before`, before !== null && after === before);
}

try {
  console.log(`qa:auth-loss-mid-bet — ${BASE} · Chromium ${browser.version()}`);
  // ── fixtures: live questions, a portfolio with open tickets, a running Up & Down round ──
  const seeder = await signedIn();
  const post = async (route, data = {}) => {
    const res = await seeder.request.post(`${BASE}/api/dev-test/${route}`, { data, timeout: 240_000 });
    return { status: res.status(), body: await res.json().catch(() => null) };
  };
  const real = await post("seed-real-markets");
  const portfolio = await post("seed-player-portfolio", { markets: 12 });
  const held = portfolio.body?.marketIds ?? [];
  // The dial's question: any live one, best one the sell button's two tickets are not on (a player may hold any number).
  const liveIds = (real.body?.live ?? []).map((m) => m.id);
  const live = liveIds.find((id) => !held.slice(0, 2).includes(id)) ?? liveIds[0];
  await post("updown-seed", { durations: [15], feedProvider: "mock-bars", assets: ["BTC"] });
  const adv = await post("updown-advance");
  const round = adv.body?.rounds?.flatMap((c) => c.rounds ?? []).find((x) => Date.parse(x.closesAt) - Date.now() > 6 * 60_000)?.id;
  await seeder.close();
  console.log(`  live question ${live} · open tickets on ${held.slice(0, 2).join(", ")} (${JSON.stringify(portfolio.body?.byStatus)}) · round ${round}`);
  if (!live || held.length < 2 || !round) { console.error("REFUSED — the fixtures are incomplete (a live question, two held tickets and an open round are needed)"); process.exit(2); }

  await control("classic dial", {
    moves: -1000,
    open: async (page) => {
      await page.goto(`${BASE}/markets/${live}?side=YES`, { waitUntil: "load", timeout: 240_000 });
      await page.waitForTimeout(2500);
      const box = page.locator('input[inputmode="numeric"]').first();
      await box.click(); await box.fill("1000"); await box.press("Enter");
      await page.waitForTimeout(600);
      await page.getByRole("button", { name: /Place YES/ }).first().click();
      await page.locator('[role="dialog"], [role="alertdialog"]').first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(800);
    },
    commit: async (page) => {
      await page.locator('[role="dialog"] button, [role="alertdialog"] button').filter({ hasText: /^(Confirm|Place)/ }).last().click();
    },
  });

  await control("sell button", {
    moves: () => null, // the sale's figure is the ticket's price: the wallet must change, by whatever it is
    open: async (page, n) => {
      await page.goto(`${BASE}/markets/${held[n]}`, { waitUntil: "load", timeout: 240_000 });
      await page.waitForTimeout(2500);
      await page.locator("#main-content .ticket-target > button").first().click();
      await page.locator('[role="dialog"], [role="alertdialog"]').first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(800);
    },
    commit: async (page) => {
      await page.locator('[role="dialog"] button, [role="alertdialog"] button').filter({ hasText: /^(Sell|Confirm)/ }).last().click();
    },
  });

  await control("quick bet", {
    moves: -500,
    open: async (page) => {
      await page.goto(`${BASE}/updown/${round}`, { waitUntil: "load", timeout: 240_000 });
      await page.waitForTimeout(3000);
      await page.locator("button.btn-yes:not([disabled])").first().waitFor({ timeout: 60_000 });
    },
    commit: async (page) => {
      await page.locator("button.btn-yes:not([disabled])").first().click();
    },
  });
} finally {
  await browser.close();
}
console.log(`\nqa:auth-loss-mid-bet — ${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
