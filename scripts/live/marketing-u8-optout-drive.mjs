/**
 * U8 visual drive — the opt-out page's six states, photographed at both widths.
 *
 * ⭐ WHAT THIS DRIVE IS FOR. Nothing mints an opt-out token on production yet (that is U42), so
 * the token-bearing states have no live subject there. They are driven against a local
 * `next dev` with a token minted through `mintOptOutToken` — the same function production will
 * call. On production the drive proves what U8's §9 says it proves: the page serves, and a bad
 * token is refused with no false success.
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
 * ⛔ HeadlessChrome stays in the UA or `/api/pv` counts this drive as real visitors.
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

/** The shipped Swahili labels — the default player language (§5.13). */
const STOP = "Acha matangazo";
const RESUME = "Anza kupokea tena";

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

/* ⛔ BOTH WIDTHS ARE READ. `documentElement.scrollWidth` can be PINNED to the viewport while the
 * body overflows, so a measurement that reads only the document element reports a confident zero. */
const noHScroll = async (page, width) => {
  const [bodyW, docW, inner] = await page.evaluate(() => [document.body.scrollWidth, document.documentElement.scrollWidth, window.innerWidth]);
  return { okay: bodyW <= inner + 1 && docW <= inner + 1, detail: `body ${bodyW} · doc ${docW} · viewport ${inner} (${width})` };
};

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
  await page.screenshot({ path: `${SHOTS}/invalid-${tag}.png`, fullPage: true });
  const invalidText = await contentText(page);
  ok(`[${tag}] invalid · the page says plainly that NOTHING HAS CHANGED`,
    invalidText.includes("hakuna kilichobadilika"), invalidText.slice(0, 100));
  ok(`[${tag}] invalid · ⛔ NO STOP BUTTON AND NO RESUME BUTTON — counted, not searched for in the prose, because the page TITLE is the same string as the stop button's label`,
    (await buttonCount(page, STOP)) === 0 && (await buttonCount(page, RESUME)) === 0,
    `stop=${await buttonCount(page, STOP)} resume=${await buttonCount(page, RESUME)}`);
  ok(`[${tag}] invalid · ⛔ and no success sentence anywhere`,
    !/imekamilika|\butapokea tena/.test(invalidText));
  {
    const s = await noHScroll(page, w.width);
    ok(`[${tag}] invalid · ⛔ no horizontal scroll`, s.okay, s.detail);
  }

  if (!IS_PROD) {
    const token = await mintToken(w.phone);
    if (!token) { ok(`[${tag}] could not mint a token locally`, false); await ctx.close(); continue; }

    // ── STATE · VALID ────────────────────────────────────────────────────────────────────
    await page.goto(`${BASE}/s/${token}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SHOTS}/valid-${tag}.png`, fullPage: true });
    ok(`[${tag}] valid · EXACTLY ONE stop button is offered`, (await buttonCount(page, STOP)) === 1,
      `${await buttonCount(page, STOP)} stop button(s)`);
    ok(`[${tag}] valid · ⛔ and the resubscribe button is NOT beside it — one unambiguous action at a time`,
      (await buttonCount(page, RESUME)) === 0);
    ok(`[${tag}] valid · ⭐ the number is MASKED (§5.14) — whoever holds this phone can open this page`,
      /•{4}/.test(await page.locator("main, body").first().innerText()));
    {
      const s = await noHScroll(page, w.width);
      ok(`[${tag}] valid · ⛔ no horizontal scroll`, s.okay, s.detail);
    }

    // ── STATE · STOPPED — ONE CLICK, NO CONFIRMATION ─────────────────────────────────────
    await visibleButton(page, STOP).click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}/stopped-${tag}.png`, fullPage: true });
    const stoppedText = await contentText(page);
    ok(`[${tag}] ⭐ ONE CLICK STOPPED IT — no confirmation screen in between`,
      stoppedText.includes("imekamilika") && !/\butapokea tena/.test(stoppedText),
      stoppedText.slice(0, 100));
    ok(`[${tag}] stopped · the way BACK is offered, and the stop button is gone`,
      (await buttonCount(page, RESUME)) === 1 && (await buttonCount(page, STOP)) === 0,
      `stop=${await buttonCount(page, STOP)} resume=${await buttonCount(page, RESUME)}`);

    // ── STATE · RESUBSCRIBED ─────────────────────────────────────────────────────────────
    await visibleButton(page, RESUME).click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}/resumed-${tag}.png`, fullPage: true });
    const resumedText = await contentText(page);
    // 🔴 A WORD BOUNDARY, AND IT IS NOT PEDANTRY — THIS ASSERTION PASSED ON ITS OWN OPPOSITE.
    // Swahili `done` is "Imekamilika. HUTAPOKEA TENA matangazo kutoka 50pick" (you will NOT get
    // them again) and `resubscribed` is "UTAPOKEA TENA matangazo ya 50pick" (you WILL). The
    // negation is one leading letter, so `includes("utapokea tena")` was TRUE on the stopped
    // page and this check could not tell the two apart. `\b` fails inside "hutapokea", because
    // h and u are both word characters. ⛔ The suite now also asserts that NO state's sentence
    // is a substring of another's, in all three locales, so the next pair cannot do this again.
    ok(`[${tag}] ⭐ RESUBSCRIBED — the second button, never a condition of the first`,
      /\butapokea tena/.test(resumedText) && !resumedText.includes("imekamilika"),
      resumedText.slice(0, 100));
    ok(`[${tag}] resubscribed · the way OUT is one tap away again`,
      (await buttonCount(page, STOP)) === 1 && (await buttonCount(page, RESUME)) === 0);

    // ── STATE · ALREADY SUPPRESSED, ON A FRESH LOAD ──────────────────────────────────────
    await visibleButton(page, STOP).click();
    await page.waitForTimeout(1200);
    await page.goto(`${BASE}/s/${token}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SHOTS}/already-${tag}.png`, fullPage: true });
    const alreadyText = await contentText(page);
    ok(`[${tag}] ⭐ ALREADY SUPPRESSED on a FRESH LOAD — the page reads the DATABASE, not the click`,
      alreadyText.includes("ulikwisha acha"), alreadyText.slice(0, 100));
    ok(`[${tag}] already · only the way back is offered`,
      (await buttonCount(page, RESUME)) === 1 && (await buttonCount(page, STOP)) === 0);
    {
      const s = await noHScroll(page, w.width);
      ok(`[${tag}] already · ⛔ no horizontal scroll`, s.okay, s.detail);
    }
  }
  await ctx.close();
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
console.log(`\nu8-optout: ${pass} passed, ${fail} failed · shots in ${SHOTS}`);
process.exitCode = fail === 0 ? 0 : 1;
