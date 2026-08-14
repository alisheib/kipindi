/**
 * Re-learn the Up & Down CARD's quick-bet contract from the live page.
 *
 * ⛔ A DOM CONTRACT WRITTEN INTO A COMMENT IS A MEMORY, and this product's has already
 * gone stale twice (`live-bulk-play.mjs` documents six identical 30s timeouts against a
 * page that was working). A1 changed the stake floor from 500 to 1,000 on 2026-08-14, so
 * the preset ladder is derived from a bound that MOVED. Ask the page, do not assume.
 *
 *   node scripts/live/probe-updown-card.mjs [assetQuery]
 *   node scripts/live/probe-updown-card.mjs "asset=BTC&d=5"
 *
 * Read-only — it never clicks a money control.
 */
import { BASE, browser, login } from "./harness.mjs";

const QUERY = process.argv[2] ?? "asset=BTC&d=5";

const { b, ctx } = await browser();
const page = await ctx.newPage();
try {
  await login(page, "alpha");
  // ⚠️ NOT `networkidle` — /updown holds an open event stream, so it never fires.
  await page.goto(`${BASE}/updown?${QUERY}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForFunction(() => /up & down|juu na chini/i.test(document.body.innerText), null, { timeout: 45_000 });
  // The board hydrates, then streams its round in. 3s was not enough for the card's own
  // controls to exist — the previous probe reported five chrome buttons and no bet controls
  // on a perfectly working board, which reads exactly like a broken card.
  await page.waitForTimeout(9_000);

  const map = await page.evaluate(() => {
    const t = (el) => (el.innerText || "").replace(/\s+/g, " ").trim();
    return {
      url: location.pathname + location.search,
      // EVERY button, with BOTH its rendered text and its accessible name — they differ,
      // and `getByRole(…, {name})` matches the accessible name while `filter({hasText})`
      // matches textContent. A probe that reports only one of them cannot explain a miss.
      buttons: [...document.querySelectorAll("button")].map((e) => ({
        text: t(e),
        aria: e.getAttribute("aria-label"),
        disabled: e.disabled,
        visible: !!e.offsetParent,
      })),
      // The round card's own identity, if it carries one — needed to tie a bet to a row.
      dataAttrs: [...document.querySelectorAll("[data-market-id],[data-round-id],[data-testid]")]
        .map((e) => ({ tag: e.tagName.toLowerCase(), ...Object.fromEntries(
          [...e.attributes].filter((a) => a.name.startsWith("data-")).map((a) => [a.name, a.value]))
        })).slice(0, 25),
      bodyHead: t(document.body).slice(0, 1400),
    };
  });
  console.log(JSON.stringify(map, null, 1));
} finally {
  await b.close();
}
