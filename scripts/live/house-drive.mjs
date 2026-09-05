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
  { id: "position", q: "", must: ["strict free cash", "house accounts", "custodial cash", "selcom payout float"] },
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

  /* ⭐ AND THE KPI TILES ARE CHECKED AT ZERO TOLERANCE, because the shared `measureClipping`
   * allows `scrollWidth > w + 1` — and "Free cash · strict" came in at content 127 against a
   * 126px box, a one-pixel ellipsis on the two most important labels on the page that BOTH
   * this drive and the screenshot-reader nearly missed. A 1px clip is still a clipped label. */
  const tiles = await page.evaluate(() =>
    [...document.querySelectorAll("main .grid")].slice(0, 2)
      .flatMap((g) => [...g.querySelectorAll("span,div")])
      .filter((el) => !el.children.length && (el.textContent || "").trim())
      .filter((el) => el.scrollWidth > el.clientWidth && el.clientWidth > 12)
      .map((el) => `"${(el.textContent || "").trim().slice(0, 30)}" ${el.clientWidth}<${el.scrollWidth}`));
  ok(`${tag} · ⭐ no KPI tile clips its label or its figure, to the pixel`,
    tiles.length === 0, tiles.join(" · "));
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
    /* ⚠️ SCOPED TO THE KPI BANDS, not to `main`. The first draft counted the label strings over
     * the whole page and reported a false failure on POSITION, where the derivation table names
     * both lines again — a drive measuring the wrong element, which is the failure mode this
     * file's header warns about, caught by reading the output instead of the exit code. */
    const kpi = await page.evaluate(() =>
      [...document.querySelectorAll("main .grid")].slice(0, 2).map((g) => g.innerText).join("\n"));
    ok(`${tag} · ⭐ both free-cash tiles are above the rail — on THIS tab`,
      /Strict free cash/i.test(kpi) && /Funded free cash/i.test(kpi),
      "a solvency line a tab can hide is a solvency line nobody reads");
    ok(`${tag} · …and each appears exactly once in the bands`,
      (kpi.match(/Strict free cash/gi) ?? []).length === 1
      && (kpi.match(/Funded free cash/gi) ?? []).length === 1);
    /* ⭐ THE REAL PROPERTY: neither figure has been substituted for the other. On production the
     * strict line is NEGATIVE and the funded one is positive, so if they ever print the same
     * string somebody has quietly swapped in the flattering one. */
    const kpiMoney = kpi.match(/TZS\s[−+]?[\d,.]+[KMB]?/g) ?? [];
    ok(`${tag} · ⛔ the strict and funded figures are DIFFERENT numbers`,
      new Set(kpiMoney).size >= 2 && kpiMoney.some((m) => m.includes("−")),
      `the strict line must still be able to read negative — got ${kpiMoney.join(" · ")}`);
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
      /* ⭐ THE FILTER NARROWS THE ROWS AND LEAVES THE SUBTOTALS WHOLE.
       * ⚠️ COUNTING `tbody tr` MEASURED THE WRONG THING and reported "26 → 26": that selector
       * spans every table on the tab (reconciliation, subtotals, games) and the games table is
       * paged at 20 either way. The property is what the PRODUCT COLUMN says, so read that. */
      const productCells = () => page.evaluate(() => {
        const tbl = [...document.querySelectorAll("table.admin-tbl")].at(-1);
        return [...(tbl?.querySelectorAll("tbody tr") ?? [])].map((r) => r.children[1]?.textContent?.trim() ?? "");
      });
      const before = await productCells();
      await page.locator('[data-filter-rail] a[href*="product=UPDOWN"]').click();
      /* ⚠️ `waitForLoadState("networkidle")` IS NOT ENOUGH AFTER A CLIENT-SIDE NAVIGATION, and
       * reading the table before the RSC payload lands reports the filter broken when it is
       * not — this drive did exactly that once. Wait for the URL the click is FOR. */
      await page.waitForURL(/product=UPDOWN/, { timeout: 20_000 });
      await page.waitForLoadState("networkidle");
      const after = await productCells();
      ok(`${tag} · the unfiltered book lists BOTH products`,
        new Set(before).size === 2, [...new Set(before)].join(" · "));
      ok(`${tag} · ⭐ the product filter narrows the rows to one product`,
        after.length > 0 && after.every((c) => c === "Up & Down"),
        [...new Set(after)].join(" · "));
      const filtered = await page.evaluate(() => (document.querySelector("main") ?? document.body).innerText);
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

/* ── §6 · THE REFUSAL ──────────────────────────────────────────────────────────────────
 *
 * ⛔ A GATE NOBODY HAS BEEN REFUSED BY IS NOT A GATE, and everything above ran as ADMIN, which
 * bypasses every domain check — so none of it says a word about RBAC.
 *
 * 🔴 **AND THE STAFF PERSONAS CANNOT PROVE IT ON PRODUCTION.** Measured 2026-09-05: all six —
 * `trading` (MODERATOR), `officer`, `finance`, `support`, `auditor`, `growth` — are REJECTED at
 * `/auth/admin`; their secrets in `.env.qa.local` no longer match the rows. That is a
 * pre-existing credential problem and it is not this page's to fix, but it MUST NOT be papered
 * over: a drive that quietly skipped the refusal would report a gate it never tested.
 *
 * ⭐ So the refusal is proven in TWO places, and each says what it does and does not cover:
 *   · here — a real signed-in PLAYER is bounced out of the console entirely (the outer door);
 *   · `test:house-page` §14 — `canView(MODERATOR, "accounting")` is CALLED against the real
 *     grant matrix and must be false, alongside SUPPORT and GROWTH, with ADMIN / FINANCE /
 *     COMPLIANCE / AUDITOR as the control (the page's own gate, exercised).
 */
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  try {
    await login(page, "fleet:07");
    /* ⚠️ `domcontentloaded`, NOT `networkidle`: a refused session is REDIRECTED, and the login
     * page it lands on polls, so `networkidle` never settles and the drive times out — reporting
     * a refusal that worked as a failure. What is being read is where the browser ended up. */
    await page.goto(`${BASE}/admin/house`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_000);
    const text = await page.evaluate(() => document.body.innerText);
    const url = page.url();
    ok("refusal · ⭐ a signed-in PLAYER never reaches the owner's book",
      !/\/admin\/house/.test(url) || /Admin or Compliance/i.test(text) || /do not have access/i.test(text),
      `landed on ${url}`);
    ok("refusal · …and no house figure reached them",
      !/Strict free cash/i.test(text) && !/Net retained/i.test(text),
      JSON.stringify(text.slice(0, 160)));
    await page.screenshot({ path: `${SHOT}/house-refused-player.png`, fullPage: true });
  } catch (e) {
    ok("refusal · the player session could be established", false, String(e?.message ?? e));
  } finally {
    await ctx.close();
  }
  console.log("\n  ⚠️ the MODERATOR refusal is proven by `npm run test:house-page` §14, which CALLS");
  console.log("     canView against the real grant matrix — the six staff QA personas are rejected");
  console.log("     on production (stale secrets in .env.qa.local), so it cannot be driven here.\n");
}

await b.close();
console.log(`\nhouse: ${pass} passed, ${fails.length} failed  (of ${pass + fails.length})`);
if (fails.length) {
  console.error("\nThe owner's book is not what the page claims it is:");
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
console.log("house: OK — the solvency line cannot hide, the identity closes, and a moderator is refused.");
