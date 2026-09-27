/**
 * U8 visual drive — the opt-out page's states, photographed at both widths as VIEWPORT TILES.
 *
 * ⭐ WHAT THIS DRIVE IS FOR. Nothing mints an opt-out token on production yet (that is U42), so
 * the token-bearing states have no live subject there. They are driven against a local
 * `next dev` with a token minted through `mintOptOutToken` — the same function production will
 * call. On production the drive proves what U8's §9 says it proves: the page serves, a bad
 * token is refused with no false success, and the page carries no sales chrome.
 *
 * ⭐ WHAT IT PHOTOGRAPHS (D6, 2026-09-26): invalid · valid · stopped · resumed · already, at 1280, 360
 * and 360 under reduced motion; then, locally, LOADING (a dev-only `?qa_hold_ms` hold on the page) and
 * ERROR (the address's budget run dry by misses, then a real tap). ⛔ VIEWPORT TILES, NEVER FULL-PAGE:
 * a full-page capture painted the fixed rail mid-document and showed a page no phone ever shows. A
 * tall page gets a second tile scrolled to its end.
 *
 * ⛔ TWO TRAPS THIS FILE PAID FOR ON ITS OWN FIRST RUN, BOTH OF THEM IN THE INSTRUMENT:
 *
 *  · `page.locator("button").first()` RESOLVED TO THE SITE CHROME — a hidden language-picker
 *    option in the top bar, never visible — so every click timed out on a page that was fine.
 *    The page's own controls are reached BY ROLE AND ACCESSIBLE NAME, never by document order.
 *  · AND THE TEXT ASSERTIONS COULD NOT FAIL. `t.optout.title` is the SAME STRING as the stop
 *    button's label ("Acha matangazo"), and the invalid-token page renders that title — so
 *    "the stop button is on the page", asked of body text, was TRUE on a page carrying no
 *    button at all. Every control assertion below therefore COUNTS BUTTONS, not words.
 *
 * 🔴 AND A THIRD, FOUND BY THE D6 REVIEW: THE UA HID A DEFECT. HeadlessChrome stays in the UA (or `/api/pv`
 * counts this drive as real visitors) — but the first-visit primer refuses to open for that UA, so every
 * earlier photo was structurally blind to it opening over the stop button. The primer is now FORCED
 * (`?primer=1`) on `/s/…` and must stay shut, with a control on `/?primer=1` that must open.
 * ⭐ `prefers-reduced-motion: reduce` is driven too — a page whose whole job is one tap must not
 * depend on a transition to tell somebody the tap landed.
 *
 * Run:  node scripts/live/marketing-u8-optout-drive.mjs            (local, default :3043)
 *       LIVE_BASE=https://www.50pick.tz node scripts/live/marketing-u8-optout-drive.mjs <sha>
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.LIVE_BASE ?? "http://localhost:3043";
const WANT = (process.argv[2] || "").trim();
const IS_PROD = !/localhost|127\.0\.0\.1|\[::1\]/.test(BASE);
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.0.0 Safari/537.36";
const SHOTS = ".qa-shots/marketing-setup/u8";
mkdirSync(SHOTS, { recursive: true });

/** The shipped Swahili copy — the default player language (§5.13). ⚠️ Mirrors `i18n-dict.ts` sw.optout
 *  (D6 wording: `title`, `stoppedTitle`, `resumedTitle`, and a fragment of `done` / `already` /
 *  `resubscribed` / `invalid` / `error`); if the copy moves, move these with it — the suite's S7 checks
 *  guard the dictionary. ⛔ `RESUME` is also half of the pinned OPT_OUT_RESUME consent wording. */
const STOP = "Acha matangazo";
const RESUME = "Anza kupokea tena";
const H_IDLE = "Acha matangazo";
const H_STOPPED = "Matangazo yamesimamishwa";
const H_RESUMED = "Umechagua kupokea matangazo tena";
const SAYS_DONE = "imekamilika";
const SAYS_ALREADY = "yalikuwa tayari yamesimamishwa";
const SAYS_RESUMED = "kizuizi cha matangazo";
const SAYS_NOTHING_CHANGED = "hakuna kilichobadilika";
const SAYS_ERROR = "haikufanikiwa";
const PRIMER_LABEL = "Utangulizi wa 50pick";
const CHAT_LABEL = "Fungua Msaada wa 50pick";

console.log(IS_PROD ? `!!  TARGET IS PRODUCTION: ${BASE}` : `target: ${BASE}`);

let pass = 0, fail = 0;
const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

if (IS_PROD) {
  if (!WANT) { console.error("!! production needs the sha: node scripts/live/marketing-u8-optout-drive.mjs <sha>"); process.exit(2); }
  const home = await fetch(`${BASE}/`, { headers: { "user-agent": UA }, cache: "no-store" });
  const html = await home.text();
  const dpl = (html.match(/data-dpl-id="([^"]+)"/) || html.match(/[?&]dpl=([a-z0-9]+)/) || [])[1] || "";
  if (!dpl) { console.error("!! could not read a deploy id from /. REFUSING to report."); process.exit(2); }
  if (!dpl.startsWith(WANT)) { console.error(`!! production is serving ${dpl.slice(0, 12)}, not ${WANT}. REFUSING to report.`); process.exit(2); }
  console.log(`build: ${dpl.slice(0, 12)} — matches ${WANT}\n`);
}

async function mintToken(phone) {
  if (IS_PROD) return null;
  const r = await fetch(`${BASE}/api/dev-test/marketing-optout-seed?phone=${phone}`, { method: "POST", headers: { "user-agent": UA } });
  const j = await r.json().catch(() => ({}));
  return j.ok ? j.token : null;
}

/* ⭐ EVERY CONTROL QUESTION IS ASKED OF *VISIBLE BUTTONS*, BY ACCESSIBLE NAME. A count is a fact
 * about the page; a substring of the body is a fact about the whole site. */
const visibleButton = (page, name) => page.getByRole("button", { name, exact: true }).locator("visible=true");
const buttonCount = async (page, name) => visibleButton(page, name).count();

/** The state message, read from the page's own content region, never from the site chrome. */
const contentText = async (page) => {
  const main = page.locator("main");
  const node = (await main.count()) > 0 ? main.first() : page.locator("body");
  return (await node.innerText()).replace(/\s+/g, " ").trim().toLowerCase();
};
const heading = async (page) => ((await page.locator("main h1").first().innerText().catch(() => "")) || "").trim();

/* ⛔ BOTH WIDTHS ARE READ. `documentElement.scrollWidth` can be PINNED to the viewport while the
 * body overflows, so a measurement that reads only the document element reports a confident zero. */
const noHScroll = async (page, width) => {
  const [bodyW, docW, inner] = await page.evaluate(() => [document.body.scrollWidth, document.documentElement.scrollWidth, window.innerWidth]);
  return { okay: bodyW <= inner + 1 && docW <= inner + 1, detail: `body ${bodyW} · doc ${docW} · viewport ${inner} (${width})` };
};

/** ⛔ VIEWPORT TILES, NEVER FULL-PAGE. The top of the page as a phone shows it, and — when the document
 *  is taller than the window — a second tile scrolled to its end. */
async function shot(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  const [h, vh] = await page.evaluate(() => [document.documentElement.scrollHeight, window.innerHeight]);
  if (h > vh + 4) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${SHOTS}/${name}-end.png` });
    await page.evaluate(() => window.scrollTo(0, 0));
  }
}

/** ⭐ D6 · RULING 5 — no upsell on the way out. Asked of VISIBLE things, by role and href. */
async function noSalesChrome(page, tag, state) {
  const auth = await page.locator('a[href^="/auth/login"], a[href^="/auth/register"]').locator("visible=true").count();
  const navs = await page.locator("nav").locator("visible=true").count();
  const chat = await page.getByRole("button", { name: CHAT_LABEL }).locator("visible=true").count();
  const invite = await page.getByText("Pendekeza masoko upate pesa").locator("visible=true").count();
  ok(`[${tag}] ${state} · ⛔ NO sign-in/sign-up link, NO nav or bottom rail, NO chat bubble, NO "propose markets" — somebody who came to leave is not sold to`,
    auth === 0 && navs === 0 && chat === 0 && invite === 0, `auth=${auth} nav=${navs} chat=${chat} propose=${invite}`);
  const lang = await page.locator("summary").locator("visible=true").count();
  const helpline = await page.locator('a[href^="tel:"]').locator("visible=true").count();
  ok(`[${tag}] ${state} · …and the language menu and the helpline line ARE there`, lang >= 1 && helpline >= 1,
    `summary=${lang} tel=${helpline}`);
}

/** ⭐ D6 · the answer is announced, and focus went to it rather than falling to <body>. */
async function announced(page, role, needle) {
  const r = await page.evaluate(([role, needle]) => {
    const a = document.activeElement;
    const inBody = !a || a === document.body;
    const region = a && a !== document.body ? (a.matches(`[role="${role}"]`) ? a : a.querySelector(`[role="${role}"]`)) : null;
    return { inBody, text: (region?.textContent || "").toLowerCase(), has: region?.textContent?.toLowerCase().includes(needle) ?? false };
  }, [role, needle]);
  return { okay: !r.inBody && r.has, detail: r.inBody ? "focus fell to <body>" : `focused region says: ${r.text.slice(0, 80)}` };
}

/* ⚠️ EVERY RUN TAKES ITS OWN NUMBERS, AND THE FIRST VERSION DID NOT.
 * `next dev` with no DATABASE_URL keeps the store IN THE SERVER PROCESS, so a second run of
 * this drive found the number the FIRST run had already stopped: the "valid" state opened as
 * "already suppressed", and the drive reported a page defect that was really its own fixture
 * carrying yesterday's state. ⛔ A drive that cannot be run twice is a drive whose green is a
 * fact about when it last ran. */
const RUN = Date.now() % 100000;
const phoneFor = (i) => `07${String(30000000 + RUN * 10 + i).slice(0, 8)}`;
const WIDTHS = [
  { name: "1280", width: 1280, height: 800, reduce: false, phone: phoneFor(1) },
  { name: "360", width: 360, height: 780, reduce: false, phone: phoneFor(2) },
  { name: "360-reduce", width: 360, height: 780, reduce: true, phone: phoneFor(3) },
];
console.log(`run ${RUN} · numbers ${WIDTHS.map((w) => w.phone).join(", ")}`);

const browser = await chromium.launch();

for (const w of WIDTHS) {
  const ctx = await browser.newContext({
    viewport: { width: w.width, height: w.height },
    userAgent: UA,
    reducedMotion: w.reduce ? "reduce" : "no-preference",
  });
  const page = await ctx.newPage();
  const tag = w.name;

  // ── STATE · INVALID TOKEN ──────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/s/ZZZZZZZZ`, { waitUntil: "networkidle" });
  await shot(page, `invalid-${tag}`);
  const invalidText = await contentText(page);
  ok(`[${tag}] invalid · the page says plainly that NOTHING HAS CHANGED`,
    invalidText.includes(SAYS_NOTHING_CHANGED), invalidText.slice(0, 100));
  ok(`[${tag}] invalid · ⛔ it never calls a genuine-but-broken link "not ours" (it read as a phishing warning)`,
    !invalidText.includes("si chetu"));
  ok(`[${tag}] invalid · ⛔ NO STOP BUTTON AND NO RESUME BUTTON — counted, not searched for in the prose, because the page TITLE is the same string as the stop button's label`,
    (await buttonCount(page, STOP)) === 0 && (await buttonCount(page, RESUME)) === 0,
    `stop=${await buttonCount(page, STOP)} resume=${await buttonCount(page, RESUME)}`);
  ok(`[${tag}] invalid · ⛔ and no success sentence anywhere`,
    !invalidText.includes(SAYS_DONE) && !invalidText.includes(SAYS_RESUMED));
  {
    const settings = await page.locator('main a[href="/profile/notifications"]').locator("visible=true").count();
    const desk = await page.locator('main a[href^="tel:"], main a[href^="mailto:"]').locator("visible=true").count();
    ok(`[${tag}] invalid · ⭐ D6 — NOT A DEAD END: it offers the notification settings and our desk`,
      settings === 1 && desk >= 2, `settings=${settings} desk=${desk}`);
  }
  await noSalesChrome(page, tag, "invalid");
  {
    const s = await noHScroll(page, w.width);
    ok(`[${tag}] invalid · ⛔ no horizontal scroll`, s.okay, s.detail);
  }

  if (!IS_PROD) {
    const token = await mintToken(w.phone);
    if (!token) { ok(`[${tag}] could not mint a token locally`, false); await ctx.close(); continue; }

    // ── STATE · VALID ────────────────────────────────────────────────────────────────────
    await page.goto(`${BASE}/s/${token}`, { waitUntil: "networkidle" });
    await shot(page, `valid-${tag}`);
    ok(`[${tag}] valid · EXACTLY ONE stop button is offered`, (await buttonCount(page, STOP)) === 1,
      `${await buttonCount(page, STOP)} stop button(s)`);
    ok(`[${tag}] valid · ⛔ and the resubscribe button is NOT beside it — one unambiguous action at a time`,
      (await buttonCount(page, RESUME)) === 0);
    ok(`[${tag}] valid · ⭐ the number is MASKED in the shared \`+255••••NN\` form (§5.14) — whoever holds this phone can open this page`,
      /\+255•{4}\d{2}/.test(await page.locator("main").first().innerText()));
    ok(`[${tag}] valid · ⭐ D6 — the heading names the act on offer`, (await heading(page)) === H_IDLE, await heading(page));
    await noSalesChrome(page, tag, "valid");
    {
      const s = await noHScroll(page, w.width);
      ok(`[${tag}] valid · ⛔ no horizontal scroll`, s.okay, s.detail);
    }

    // ── STATE · STOPPED — ONE CLICK, NO CONFIRMATION ─────────────────────────────────────
    await visibleButton(page, STOP).click();
    await page.waitForTimeout(1200);
    await shot(page, `stopped-${tag}`);
    const stoppedText = await contentText(page);
    ok(`[${tag}] ⭐ ONE CLICK STOPPED IT — no confirmation screen in between`,
      stoppedText.includes(SAYS_DONE) && !stoppedText.includes(SAYS_RESUMED), stoppedText.slice(0, 100));
    ok(`[${tag}] stopped · ⭐ D6 — the HEADING changed with it (it used to keep saying "stop" above a button that re-subscribes)`,
      (await heading(page)) === H_STOPPED, await heading(page));
    {
      const a = await announced(page, "status", SAYS_DONE);
      ok(`[${tag}] stopped · ⭐ D6 — the confirmation is ANNOUNCED (role=status) and focus moved to it`, a.okay, a.detail);
    }
    ok(`[${tag}] stopped · the way BACK is offered, and the stop button is gone`,
      (await buttonCount(page, RESUME)) === 1 && (await buttonCount(page, STOP)) === 0,
      `stop=${await buttonCount(page, STOP)} resume=${await buttonCount(page, RESUME)}`);

    // ── STATE · RESUBSCRIBED ─────────────────────────────────────────────────────────────
    await visibleButton(page, RESUME).click();
    await page.waitForTimeout(1200);
    await shot(page, `resumed-${tag}`);
    const resumedText = await contentText(page);
    // ⚠️ D6 · the resumed sentence states what was DONE (the stop lifted, the choice recorded) and makes
    // no delivery promise — the gate may still refuse this number. The old matcher (`\butapokea tena`)
    // went with the sentence that promised delivery.
    ok(`[${tag}] ⭐ RESUBSCRIBED — the second button, never a condition of the first`,
      resumedText.includes(SAYS_RESUMED) && !resumedText.includes(SAYS_DONE), resumedText.slice(0, 100));
    ok(`[${tag}] resumed · ⭐ D6 — the heading states the recorded choice`, (await heading(page)) === H_RESUMED, await heading(page));
    {
      const a = await announced(page, "status", SAYS_RESUMED);
      ok(`[${tag}] resumed · ⭐ D6 — announced, and focus moved to it`, a.okay, a.detail);
    }
    ok(`[${tag}] resubscribed · the way OUT is one tap away again`,
      (await buttonCount(page, STOP)) === 1 && (await buttonCount(page, RESUME)) === 0);

    // ── STATE · ALREADY SUPPRESSED, ON A FRESH LOAD ──────────────────────────────────────
    await visibleButton(page, STOP).click();
    await page.waitForTimeout(1200);
    await page.goto(`${BASE}/s/${token}`, { waitUntil: "networkidle" });
    await shot(page, `already-${tag}`);
    const alreadyText = await contentText(page);
    ok(`[${tag}] ⭐ ALREADY SUPPRESSED on a FRESH LOAD — the page reads the DATABASE, not the click`,
      alreadyText.includes(SAYS_ALREADY), alreadyText.slice(0, 100));
    ok(`[${tag}] already · 🔴 D6 — the heading says STOPPED, never "tap once to stop" above a button that re-subscribes`,
      (await heading(page)) === H_STOPPED && !alreadyText.includes("bonyeza mara moja kuacha"), await heading(page));
    ok(`[${tag}] already · only the way back is offered`,
      (await buttonCount(page, RESUME)) === 1 && (await buttonCount(page, STOP)) === 0);
    {
      const s = await noHScroll(page, w.width);
      ok(`[${tag}] already · ⛔ no horizontal scroll`, s.okay, s.detail);
    }

    // ── D6 · A LOWER-CASE LINK IS THE SAME LINK ──────────────────────────────────────────
    await page.goto(`${BASE}/s/${token.toLowerCase()}`, { waitUntil: "networkidle" });
    const lowerText = await contentText(page);
    ok(`[${tag}] ⭐ D6 — the token typed in LOWER CASE resolves to the same number (URL bars do not capitalise)`,
      (await buttonCount(page, RESUME)) === 1 && !lowerText.includes(SAYS_NOTHING_CHANGED), lowerText.slice(0, 80));
  }
  await ctx.close();
}

// ── D6 · THE FIRST-VISIT PRIMER, FORCED OPEN, MUST STAY OFF THE WAY OUT ──────────────────────
// ⛔ Each in a FRESH context: the primer opens only when this browser has never dismissed it, which
// is exactly the browser an SMS recipient arrives in.
{
  const token = IS_PROD ? null : await mintToken(phoneFor(4));
  const targets = [`/s/ZZZZZZZZ?primer=1`, ...(token ? [`/s/${token}?primer=1`] : [])];
  for (const path of targets) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, userAgent: UA });
    const page = await ctx.newPage();
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const dialogs = await page.getByRole("dialog").locator("visible=true").count();
    await shot(page, `primer-forced-${path.startsWith("/s/ZZ") ? "invalid" : "valid"}-360`);
    ok(`⛔ D6 — with the primer FORCED, ${path.split("?")[0].replace(/\/s\/[A-Z0-9]{8}$/, "/s/<token>")} shows NO dialog after 2s (the betting tutorial used to dock over the stop button)`,
      dialogs === 0, `${dialogs} visible dialog(s)`);
    await ctx.close();
  }
  // ⚠️ CONTROL — the same forcing DOES open the primer on the board, so the assertion above can fail.
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, userAgent: UA });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?primer=1`, { waitUntil: "networkidle" });
  const opened = await page.getByRole("dialog", { name: PRIMER_LABEL }).first().waitFor({ state: "visible", timeout: 6000 }).then(() => true, () => false);
  ok("⚠️ CONTROL · …and the SAME forcing opens the primer on `/`, so the check above is capable of failing", opened);
  await ctx.close();
}

if (!IS_PROD) {
  // ── STATE · LOADING — held by the dev-only `qa_hold_ms`, so the skeleton is on screen long enough ──
  const token = await mintToken(phoneFor(5));
  if (token) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, userAgent: UA });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/s/${token}?qa_hold_ms=3500`, { waitUntil: "commit" });
    const busy = await page.locator('[aria-busy="true"]').first().waitFor({ state: "visible", timeout: 3000 }).then(() => true, () => false);
    await page.screenshot({ path: `${SHOTS}/loading-360.png` });
    const busyTop = busy ? await page.locator('[aria-busy="true"] [data-skeleton="action"]').first().boundingBox() : null;
    ok("⭐ LOADING · the skeleton is on screen and says so to a screen reader", busy
      && (await page.locator('[aria-busy="true"] .sr-only').first().innerText().catch(() => "")).length > 0);
    await visibleButton(page, STOP).waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    const realTop = await visibleButton(page, STOP).boundingBox();
    ok("⭐ LOADING · D6 — the stop button lands where the skeleton drew it (a button that moves under a thumb is a tap somewhere else)",
      !!busyTop && !!realTop && Math.abs(busyTop.y - realTop.y) <= 8,
      `skeleton ${busyTop ? Math.round(busyTop.y) : "?"} → real ${realTop ? Math.round(realTop.y) : "?"}`);
    await ctx.close();
  }

  // ── STATE · ERROR — the address's budget run dry by MISSES, then a real tap ──────────────
  // ⛔ LOCAL ONLY. On production this would throttle a real bucket for everybody behind our address.
  const errToken = await mintToken(phoneFor(6));
  if (errToken) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, userAgent: UA });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/s/${errToken}`, { waitUntil: "networkidle" });
    // ⚠️ Drained FROM THE PAGE, not from Playwright's own HTTP client: the budget is keyed on the client
    // address, and Node and Chromium can resolve `localhost` to different families (::1 vs 127.0.0.1).
    await page.evaluate(async () => { for (let i = 0; i < 45; i++) await fetch("/s/ZZZZZZZZ", { cache: "no-store" }).catch(() => null); });
    await visibleButton(page, STOP).click();
    await page.waitForTimeout(1500);
    await shot(page, "error-360");
    const errText = await contentText(page);
    const a = await announced(page, "alert", SAYS_ERROR);
    ok("⭐ ERROR · a refused tap says so — announced as an ALERT, focus on it — and never claims a success",
      a.okay && !errText.includes(SAYS_DONE), a.detail);
    ok("🔴 ERROR · D6 — the page keeps offering THE SAME act (it used to offer the opposite one under 'try again')",
      (await buttonCount(page, STOP)) === 1 && (await buttonCount(page, RESUME)) === 0 && (await heading(page)) === H_IDLE,
      `stop=${await buttonCount(page, STOP)} resume=${await buttonCount(page, RESUME)} heading=${await heading(page)}`);
    // A dry address answers a VALID link with the same refusal an invalid one gets — never an oracle.
    await page.goto(`${BASE}/s/${errToken}`, { waitUntil: "networkidle" });
    const dryText = await contentText(page);
    ok("⭐ ERROR · a dry address reads a valid link as the plain refusal, with no lookup and no oracle",
      dryText.includes(SAYS_NOTHING_CHANGED) && (await buttonCount(page, STOP)) === 0, dryText.slice(0, 80));
    await ctx.close();
  }
}

// ── THE NO-LOGIN PROMISE, DRIVEN RATHER THAN ASSERTED ─────────────────────────────────────
// ⛔ A 200 from `curl` is not proof a BROWSER reaches a page — a streamed redirect answers 200
// on a page the browser is sent away from. This follows a real navigation and reads where it
// LANDED, signed out, and pairs it with a control that must go the other way.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, userAgent: UA });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/s/ZZZZZZZZ`, { waitUntil: "networkidle" });
  ok("⭐ SIGNED OUT, A REAL BROWSER LANDS ON /s/ AND IS NOT SENT TO SIGN IN — an opt-out behind a login is one an imported contact can never use (ETA s.32(1)(c))",
    new URL(page.url()).pathname.startsWith("/s/"), `landed on ${new URL(page.url()).pathname}`);
  await page.goto(`${BASE}/wallet`, { waitUntil: "networkidle" });
  ok("⭐ CONTROL · /wallet DOES send a signed-out browser away, so the assertion above is capable of failing",
    !new URL(page.url()).pathname.startsWith("/wallet"), `landed on ${new URL(page.url()).pathname}`);
  await ctx.close();
}

await browser.close();
console.log(`\nu8-optout: ${pass} passed, ${fail} failed · viewport tiles in ${SHOTS}`);
process.exitCode = fail === 0 ? 0 : 1;
