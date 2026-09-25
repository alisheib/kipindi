/**
 * U8 visual drive — the opt-out page's six states, photographed at both widths.
 *
 * ⭐ WHAT THIS DRIVE IS FOR, AND WHAT IT IS NOT. Nothing mints an opt-out token on production
 * yet (that is U42), so the VALID, ALREADY, RESUBSCRIBED and ERROR states have no live subject
 * to photograph. They are driven HERE, against a local `next dev` with a token minted through
 * `mintOptOutToken` — the same function production will call — and the production half is
 * exactly what U8's §9 says it is: the page serves, and a bad token is refused with no false
 * success. ⛔ The rest belongs to U42/U52 and is not claimed.
 *
 * ⛔ HeadlessChrome stays in the UA or `/api/pv` counts this drive as real visitors.
 * ⭐ `prefers-reduced-motion: reduce` is driven too — a page whose whole job is one tap must
 * not depend on a transition to tell somebody the tap landed.
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

console.log(IS_PROD ? `⚠️  TARGET IS PRODUCTION: ${BASE}` : `target: ${BASE}`);

let pass = 0, fail = 0;
const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

/* ⛔ A PRODUCTION RUN REFUSES TO REPORT UNLESS IT REACHED THE COMMIT IT WAS TOLD TO PROVE.
 * A drive that measures whatever happens to be deployed can report a green it did not earn. */
if (IS_PROD) {
  if (!WANT) { console.error("!! production needs the sha: node scripts/live/marketing-u8-optout-drive.mjs <sha>"); process.exit(2); }
  const home = await fetch(`${BASE}/`, { headers: { "user-agent": UA }, cache: "no-store" });
  const html = await home.text();
  const dpl = (html.match(/data-dpl-id="([^"]+)"/) || html.match(/[?&]dpl=([a-z0-9]+)/) || [])[1] || "";
  if (!dpl) { console.error("!! could not read a deploy id from /. REFUSING to report."); process.exit(2); }
  if (!dpl.startsWith(WANT)) { console.error(`!! production is serving ${dpl.slice(0, 12)}, not ${WANT}. REFUSING to report.`); process.exit(2); }
  console.log(`build: ${dpl.slice(0, 12)} — matches ${WANT}\n`);
}

/** ⭐ Mint through the real service. ⛔ Local only — the seed route is 404 in production. */
async function mintToken(phone) {
  if (IS_PROD) return null;
  const r = await fetch(`${BASE}/api/dev-test/marketing-optout-seed?phone=${phone}`, { method: "POST", headers: { "user-agent": UA } });
  const j = await r.json().catch(() => ({}));
  return j.ok ? j.token : null;
}

const WIDTHS = [
  { name: "1280", width: 1280, height: 800 },
  { name: "360", width: 360, height: 780 },
];

const browser = await chromium.launch();

/** ⭐ The text is lowercased and whitespace-collapsed: Chrome applies `text-transform`, so a
 *  CSS-uppercased line reads differently from the dictionary it came from. */
const bodyText = async (page) => (await page.innerText("body")).replace(/\s+/g, " ").trim().toLowerCase();

for (const w of WIDTHS) {
  for (const motion of ["no-preference", "reduce"]) {
    if (motion === "reduce" && w.name !== "360") continue; // reduced motion driven once, at the hard width
    const ctx = await browser.newContext({
      viewport: { width: w.width, height: w.height },
      userAgent: UA,
      reducedMotion: motion === "reduce" ? "reduce" : "no-preference",
    });
    const page = await ctx.newPage();
    const tag = motion === "reduce" ? `${w.name}-reduce` : w.name;

    // ── STATE · INVALID TOKEN ────────────────────────────────────────────────────────────
    await page.goto(`${BASE}/s/ZZZZZZZZ`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${SHOTS}/invalid-${tag}.png`, fullPage: true });
    const invalidText = await bodyText(page);
    ok(`[${tag}] invalid token · the page says plainly that NOTHING HAS CHANGED`,
      invalidText.includes("hakuna kilichobadilika") || invalidText.includes("nothing has changed"),
      invalidText.slice(0, 90));
    ok(`[${tag}] invalid token · ⛔ and it shows NO success and NO stop button — a refusal that offers the action is a false success waiting to happen`,
      !/imekamilika|utapokea tena|you will not get|done\./i.test(invalidText));
    ok(`[${tag}] ⛔ no horizontal scroll at ${w.width}px`,
      await page.evaluate(() => document.body.scrollWidth <= window.innerWidth + 1),
      `body ${await page.evaluate(() => document.body.scrollWidth)} vs viewport ${w.width}`);

    if (!IS_PROD) {
      const token = await mintToken(`07120005${w.name === "360" ? (motion === "reduce" ? "13" : "12") : "11"}`);
      if (!token) { ok(`[${tag}] could not mint a token locally`, false); await ctx.close(); continue; }

      // ── STATE · VALID ──────────────────────────────────────────────────────────────────
      await page.goto(`${BASE}/s/${token}`, { waitUntil: "networkidle" });
      await page.screenshot({ path: `${SHOTS}/valid-${tag}.png`, fullPage: true });
      const validText = await bodyText(page);
      ok(`[${tag}] valid · the stop button is on the page`,
        validText.includes("acha matangazo") || validText.includes("stop marketing"), validText.slice(0, 90));
      ok(`[${tag}] valid · ⭐ the number is MASKED (§5.14) — whoever holds this phone can open this page`,
        /••••/.test(await page.innerText("body")), (await page.innerText("body")).slice(0, 120).replace(/\n/g, " "));
      ok(`[${tag}] valid · ⛔ the RESUBSCRIBE button is NOT shown beside the stop button — one unambiguous action at a time`,
        !validText.includes("anza kupokea tena") && !validText.includes("start them again"));
      ok(`[${tag}] ⛔ no horizontal scroll at ${w.width}px (valid)`,
        await page.evaluate(() => document.body.scrollWidth <= window.innerWidth + 1));

      // ── STATE · STOPPED — ONE CLICK ────────────────────────────────────────────────────
      const buttonsBefore = await page.locator("button").count();
      await page.locator("button").first().click();
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${SHOTS}/stopped-${tag}.png`, fullPage: true });
      const stoppedText = await bodyText(page);
      ok(`[${tag}] ⭐ ONE CLICK STOPPED IT — no confirmation screen in between`,
        stoppedText.includes("imekamilika") || stoppedText.includes("done."), stoppedText.slice(0, 90));
      ok(`[${tag}] stopped · ⛔ and exactly ONE button is offered afterwards — the way back, not two opposite actions`,
        (await page.locator("button").count()) === buttonsBefore,
        `${await page.locator("button").count()} buttons`);
      ok(`[${tag}] stopped · the button offered is START THEM AGAIN`,
        stoppedText.includes("anza kupokea tena") || stoppedText.includes("start them again"));

      // ── STATE · RESUBSCRIBED ───────────────────────────────────────────────────────────
      await page.locator("button").first().click();
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${SHOTS}/resumed-${tag}.png`, fullPage: true });
      const resumedText = await bodyText(page);
      ok(`[${tag}] ⭐ RESUBSCRIBED — and it is the second button, never a condition of the first`,
        resumedText.includes("utapokea tena") || resumedText.includes("you will get"), resumedText.slice(0, 90));
      ok(`[${tag}] resubscribed · the way out is one tap away again`,
        resumedText.includes("acha matangazo") || resumedText.includes("stop marketing"));

      // ── STATE · ALREADY SUPPRESSED (a fresh load of a stopped number) ──────────────────
      await page.locator("button").first().click();
      await page.waitForTimeout(900);
      await page.goto(`${BASE}/s/${token}`, { waitUntil: "networkidle" });
      await page.screenshot({ path: `${SHOTS}/already-${tag}.png`, fullPage: true });
      const alreadyText = await bodyText(page);
      ok(`[${tag}] ⭐ ALREADY SUPPRESSED on a fresh load — the page reads the DATABASE, not the click`,
        alreadyText.includes("ulikwisha acha") || alreadyText.includes("already stopped"), alreadyText.slice(0, 90));
      ok(`[${tag}] ⛔ no horizontal scroll at ${w.width}px (already)`,
        await page.evaluate(() => document.body.scrollWidth <= window.innerWidth + 1));
    }
    await ctx.close();
  }
}

// ── THE NO-LOGIN PROMISE, DRIVEN RATHER THAN ASSERTED ─────────────────────────────────────
// ⛔ A 200 from `curl` is not proof a BROWSER reaches a page — a streamed redirect answers 200
// on a page the browser is sent away from. So this follows a real navigation and reads where it
// LANDED, signed out.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, userAgent: UA });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/s/ZZZZZZZZ`, { waitUntil: "networkidle" });
  ok("⭐ SIGNED OUT, A REAL BROWSER LANDS ON /s/ AND IS NOT SENT TO SIGN IN — an opt-out behind a login is one an imported contact can never use",
    new URL(page.url()).pathname.startsWith("/s/"), `landed on ${new URL(page.url()).pathname}`);
  // the control: a protected page DOES redirect, so the assertion above is measuring something
  await page.goto(`${BASE}/wallet`, { waitUntil: "networkidle" });
  ok("⭐ CONTROL · /wallet DOES send a signed-out browser away, so the check above can fail",
    !new URL(page.url()).pathname.startsWith("/wallet"), `landed on ${new URL(page.url()).pathname}`);
  await ctx.close();
}

await browser.close();
console.log(`\nu8-optout: ${pass} passed, ${fail} failed · shots in ${SHOTS}`);
process.exitCode = fail === 0 ? 0 : 1;
