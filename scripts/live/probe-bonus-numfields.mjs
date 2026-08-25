/**
 * Which numeric input is `nth(0)` on `/admin/bonuses`, really?
 *
 *   node scripts/live/probe-bonus-numfields.mjs
 *
 * ⛔ `live-bonus-live-proof.mjs`'s `grant` leg fills the grant AMOUNT and MULTIPLIER by
 * POSITION, with a PAGE-WIDE selector — `input[inputmode="numeric"]` nth(0) and nth(1). The
 * page also renders the platform's own bonus CONFIG editor, whose fields are NumFields too.
 * Read-only: it never clicks a money control and never saves anything.
 */
import { BASE, browser, login } from "./harness.mjs";

const { b, ctx } = await browser();
const page = await ctx.newPage();
try {
  await login(page, "growth");
  await page.goto(`${BASE}/admin/bonuses`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(9_000);
  console.log("URL:", page.url());
  console.log("TEXT:", (await page.evaluate(() => document.body.innerText)).replace(/s+/g, " ").slice(0, 400));

  const fields = await page.evaluate(() =>
    [...document.querySelectorAll('input[inputmode="numeric"]')].map((x, i) => ({
      i, aria: x.getAttribute("aria-label"), value: x.value,
      visible: (() => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; })(),
    })));
  console.log(`\n${fields.length} numeric input(s) on /admin/bonuses, in DOM order:\n`);
  for (const f of fields) console.log(`  nth(${f.i})  aria="${f.aria}"  value="${f.value}"  visible=${f.visible}`);
  console.log(`\n⛔ the grant leg fills nth(0) with AMOUNT and nth(1) with MULTIPLIER.`);
} finally { await ctx.close(); await b.close(); }
