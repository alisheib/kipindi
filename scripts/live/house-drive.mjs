/**
 * THE HOUSE — the owner's book, READ on the live deploy. 4 widths × 3 tabs + the drill-down.
 *
 * ⭐ **THIS DRIVE READS THE PAGE; IT DOES NOT MERELY PHOTOGRAPH IT.** A screenshot proves the
 * server answered 200. It does not prove a figure arrived, that nothing says `NaN`, that the
 * levy line is present, or that a 1,080px table did not push the console into horizontal
 * scroll. A drive on this platform has reported a working surface broken four separate times by
 * measuring the wrong element, so every assertion below names its control and reads its content.
 *
 * ⛔ RUN AS `admin`. `alpha` and `echo` are REJECTED on production (measured 2026-09-04); the
 * fleet is a PLAYER and cannot open the console at all. ⚠️ ADMIN bypasses every domain check, so
 * this drive proves the PAGE, not the RBAC — §6 drives a refused role separately and says so.
 *
 *   LIVE_BASE=https://50pick.tz SHOT_DIR=<dir> node scripts/live/house-drive.mjs
 *   npm run qa:house
 */
import { browser, loginOnce, login, BASE, SHOT, bodyText, measureClipping, describeClipping } from "./harness.mjs";

const WIDTHS = [360, 768, 1280, 1920];
const TABS = [
  { id: "position", q: "", must: ["free house cash", "house accounts", "custodial cash", "selcom payout float"] },
  { id: "earnings", q: "?tab=earnings", must: ["gross gaming revenue", "net retained", "levies", "bonus cost", "fee earned, by source"] },
  { id: "games", q: "?tab=games", must: ["variance", "by product", "rate applied", "net retained"] },
];

let pass = 0;
const fails = [];
const ok = (n, c, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); }
  else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? `\n         ${d}` : ""}`); }
  return c;
};

/** The three ways a template reaches a reader unrendered. Checked on every cell. */
async function assertNoGarbage(page, tag) {
  const text = await page.evaluate(() => (document.querySelector("main") ?? document.body).innerText);
  ok(`${tag} · no NaN, no undefined, no null reached the reader`,
    !/\bNaN\b|\bundefined\b|\bnull\b/.test(text),
    JSON.stringify((text.match(/.{0,40}(NaN|undefined|null).{0,40}/) ?? [""])[0]));
  ok(`${tag} · no unrendered template braces`,
    !/\{[a-zA-Z_$][\w.$]*\}/.test(text),
    JSON.stringify((text.match(/\{[a-zA-Z_$][\w.$]*\}/) ?? [""])[0]));
  ok(`${tag} · no bare "TZS TZS" (the doubled unit)`, !/TZS\s+TZS/.test(text));
  return text;
}

/** The page must never scroll sideways, and no leaf may clip its own content. */
async function assertFits(page, w, tag) {
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`${tag} · the console did not gain horizontal scroll`, overflow <= 1, `overflow ${overflow}px`);
  const clipped = await measureClipping(page, "main");
  // ⚠️ A `truncate`d game title is DELIBERATE (it carries a `title=` and links to the full
  // book), so a clip inside the game cell is expected. Anything else is not.
  const bad = clipped.filter((c) => !/^Will |Up or Down|Gold |Bitcoin /.test(c.text));
  ok(`${tag} · nothing clips its own content except the deliberately truncated titles`,
    bad.length === 0, describeClipping(bad));
}

const { b, ctx: seed } = await browser();
await seed.close();
const state = await loginOnce(b, "admin");
console.log(`\nthe house book — READ on ${BASE}\n`);

let firstGameHref = null;

for (const w of WIDTHS) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1000 }, storageState: state });
  const page = await ctx.newPage();

  for (const t of TABS) {
    const tag = `${w}/${t.id}`;
    const res = await page.goto(`${BASE}/admin/house${t.q}`, { waitUntil: "networkidle" });
    if (!ok(`${tag} · answered 200`, res?.status() === 200, `status ${res?.status()}`)) continue;
    if (!ok(`${tag} · did not fall through to the restricted panel`,
      !(await bodyText(page)).includes("you do not have access"))) continue;

    const text = await assertNoGarbage(page, tag);
    const lower = text.toLowerCase();

    /* ⭐ THE STATE THAT MAY NEVER HIDE. §K rule 7d — a tab may hide a detail, never a state.
     * Both free-cash tiles and both KPI bands sit above the rail, so they must be present on
     * EVERY tab, not only on POSITION. This is the assertion that would catch someone
     * "tidying" them into the position tab later. */
    ok(`${tag} · ⭐ both free-cash lines are above the rail — on THIS tab`,
      lower.includes("free house cash — strict") && lower.includes("free cash — ex-adjustments"),
      "a solvency line a tab can hide is a solvency line nobody reads");
    ok(`${tag} · …and neither has replaced the other`,
      (lower.match(/free house cash — strict/g) ?? []).length === 1
      && (lower.match(/free cash — ex-adjustments/g) ?? []).length === 1);
    ok(`${tag} · the window caption says the filter scopes Earnings and By game only`,
      lower.includes("scopes the") && lower.includes("earnings") && lower.includes("by game"));

    for (const m of t.must) {
      ok(`${tag} · states "${m}"`, lower.includes(m), JSON.stringify(text.slice(0, 120)));
    }

    /* Money actually arrived — `formatTzs` always prints the mark, so its absence is the
     * assertion. ⛔ And a page of `TZS 0` everywhere is what a fabricated zero looks like. */
    const money = text.match(/TZS\s[−+]?[\d,]+/g) ?? [];
    ok(`${tag} · real money figures are present`, money.length >= 6, `${money.length} figures`);
    ok(`${tag} · …and they are not all zero (a fabricated-zero page)`,
      money.some((s) => !/TZS\s[−+]?0$/.test(s)), money.slice(0, 6).join(" · "));

    ok(`${tag} · the section rail is a real rail`,
      (await page.locator("[data-section-rail] a").count()) === 3);

    await assertFits(page, w, tag);
    await page.screenshot({ path: `${SHOT}/house-${w}-${t.id}.png`, fullPage: true });

    if (t.id === "games" && w === 1280) {
      /* ⭐ THE RECONCILIATION IDENTITY, READ OFF THE SCREEN — not recomputed here. The card
       * ends in a variance and that variance must be zero; a page that printed a non-zero one
       * would still be CORRECT product (it displays rather than absorbs), so this assertion is
       * about the BOOKS, and it is the one that would catch fee booked somewhere unread. */
      ok(`${tag} · ⭐ the by-game identity closes — variance is zero`,
        /Variance — must be zero\s*TZS\s0\b/.test(text.replace(/\s+/g, " ")),
        JSON.stringify((text.replace(/\s+/g, " ").match(/Variance — must be zero\s*TZS\s[^\s]+/) ?? [""])[0]));
      ok(`${tag} · the reconciliation note is the FIRST card, before any total`,
        text.indexOf("Why this table does not add up") < text.indexOf("By product"),
        "an owner who reads the total first has already been misled once");
      /* The product filter narrows the ROWS and leaves the subtotals whole. */
      const before = (await page.locator("table.admin-tbl tbody tr").count());
      await page.locator('[data-filter-rail] a[href*="product=UPDOWN"]').click();
      await page.waitForLoadState("networkidle");
      const after = (await page.locator("table.admin-tbl tbody tr").count());
      const filtered = await page.evaluate(() => (document.querySelector("main") ?? document.body).innerText);
      ok(`${tag} · the product filter changes what is listed`, after !== before, `${before} → ${after}`);
      ok(`${tag} · …and the by-product subtotals still show BOTH products`,
        filtered.includes("Up & Down") && /Polls/.test(filtered),
        "a subtotal that moved with the filter would only ever agree with itself");
      await page.goto(`${BASE}/admin/house?tab=games`, { waitUntil: "networkidle" });
      firstGameHref ??= await page.locator('a[href^="/admin/house/mkt_"]').first().getAttribute("href");
    }
  }
  await ctx.close();
}

/* ── THE DRILL-DOWN ────────────────────────────────────────────────────────────────── */
if (ok("drill-down · the BY GAME table links to a per-game book", !!firstGameHref, String(firstGameHref))) {
  for (const w of WIDTHS) {
    const ctx = await b.newContext({ viewport: { width: w, height: 1000 }, storageState: state });
    const page = await ctx.newPage();
    const tag = `${w}/drill`;
    const res = await page.goto(`${BASE}${firstGameHref}`, { waitUntil: "networkidle" });
    ok(`${tag} · answered 200`, res?.status() === 200, `status ${res?.status()}`);
    const text = await assertNoGarbage(page, tag);
    const lower = text.toLowerCase();
    for (const m of ["the arithmetic", "booked against recomputed", "which rate applied", "the ledger behind these numbers"]) {
      ok(`${tag} · states "${m}"`, lower.includes(m));
    }
    /* ⛔ THE EVIDENCE PANEL MUST NOT LIST PLAYERS. The account string IS the user id, and this
     * page is open to FINANCE and AUDITOR. `PLAYER:*` is the collapsed line; `PLAYER:usr_…`
     * would be a leak. */
    ok(`${tag} · ⛔ no per-player ledger row — players are collapsed`,
      !/PLAYER(_BONUS)?:usr_/.test(text),
      JSON.stringify((text.match(/PLAYER(_BONUS)?:usr_\w+/) ?? [""])[0]));
    ok(`${tag} · …and the collapsed line IS there, so the check is not vacuous`,
      /PLAYER:\*/.test(text));
    ok(`${tag} · the rate provenance names which arm applies`,
      lower.includes("its own frozen rates") || lower.includes("no frozen rates of its own"));
    ok(`${tag} · the raw audit payload is never rendered`,
      !/"commissionRate"\s*:/.test(text), "a config payload is an unbounded blob");
    await assertFits(page, w, tag);
    await page.screenshot({ path: `${SHOT}/house-drill-${w}.png`, fullPage: true });
    await ctx.close();
  }
}

/* ── §6 · THE REFUSAL, PROVEN BY A SESSION THAT IS ACTUALLY REJECTED ───────────────── */
/* ⛔ A GATE NOBODY HAS BEEN REFUSED BY IS NOT A GATE. Everything above ran as ADMIN, which
 * bypasses every domain check, so none of it says anything about RBAC. `trading` is the
 * MODERATOR persona — a real staff account that can open the console and must NOT be able to
 * read the owner's net retained, his solvency line or his per-game revenue. */
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  try {
    await login(page, "trading");
    await page.goto(`${BASE}/admin/house`, { waitUntil: "networkidle" });
    const text = await page.evaluate(() => document.body.innerText);
    ok("refusal · ⭐ a MODERATOR is REFUSED the owner's book",
      /Admin or Compliance/i.test(text) || /do not have access/i.test(text),
      JSON.stringify(text.slice(0, 200)));
    ok("refusal · …and NO money figure reached them",
      !/TZS\s[−+]?[\d,]+/.test(text),
      JSON.stringify((text.match(/TZS\s[−+]?[\d,]+/) ?? [""])[0]));
    ok("refusal · …and the House link is not even in their sidebar",
      (await page.locator('a[href="/admin/house"]').count()) === 0);
    await page.screenshot({ path: `${SHOT}/house-refused-moderator.png`, fullPage: true });
  } catch (e) {
    ok("refusal · the MODERATOR session could be established", false, String(e?.message ?? e));
  } finally {
    await ctx.close();
  }
}

await b.close();
console.log(`\nhouse: ${pass} passed, ${fails.length} failed  (of ${pass + fails.length})`);
if (fails.length) {
  console.error("\nThe owner's book is not what the page claims it is:");
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
console.log("house: OK — the solvency line cannot hide, the identity closes, and a moderator is refused.");
