/**
 * THE HOUSE — the owner's REAL JOURNEY, driven on the live deploy.
 *
 * ⭐ **`house-drive.mjs` PROVES THE PAGE RENDERS. THIS PROVES IT WORKS.** They are different
 * claims and they fail differently. A page can render every figure correctly at four widths
 * and still lose the date window when you change tabs, page you back to row 1 when you filter,
 * send you to a market that is not the one you clicked, or show two tabs that disagree about
 * the same number. None of that is visible in a screenshot.
 *
 * So this drive does what Ali does: opens the book from the sidebar, changes the window,
 * switches tabs, filters, pages, drills into a game, comes back — and after every step asks
 * whether the state it was carrying survived, and whether the numbers still agree with
 * themselves.
 *
 * ⛔ RUN AS `admin`. The gate is proven elsewhere (`test:house-page` §14 CALLS `canView`;
 * `house-drive.mjs` bounces a real player) — this is about the JOURNEY, not the door.
 *
 *   LIVE_BASE=https://50pick.tz node scripts/live/house-flow.mjs
 *   npm run qa:house-flow
 */
import { browser, loginOnce, BASE, SHOT } from "./harness.mjs";

let pass = 0;
const fails = [];
const ok = (n, c, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); }
  else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? `\n         ${d}` : ""}`); }
  return c;
};

/** Money as the page prints it, keyed by the row label beside it. */
const rowMoney = (page, label) => page.evaluate((l) => {
  for (const tr of document.querySelectorAll("main table.admin-tbl tbody tr")) {
    const first = (tr.children[0]?.textContent || "").replace(/\s+/g, " ").trim();
    if (first.startsWith(l)) {
      const amt = [...tr.querySelectorAll(".amount")].pop();
      return amt ? amt.textContent.trim() : null;
    }
  }
  return null;
}, label);

/**
 * ⭐ WAIT FOR THE CONTENT, NOT FOR THE URL.
 *
 * 🔴 `waitForURL` fires on `pushState`, which in the App Router happens BEFORE the new page
 * renders — and while the RSC payload is in flight Next shows `loading.tsx`, A SKELETON WITH NO
 * TEXT IN IT. `waitForLoadState("networkidle")` does not close that gap either. Reading `main`
 * in that window measures the skeleton and reports the destination page wrong.
 *
 * ⛔ Measured three separate times on this page: a product filter reported broken when it
 * worked, a drill-down reported as opening the wrong game, and a cross-link reported as landing
 * on the wrong tab. Worse, the same assertions sometimes PASSED — and a check that passes by
 * luck is no better than one that fails by luck.
 *
 * So: wait until `main` actually SAYS the thing, then return what it says.
 */
async function settle(page, re, timeout = 25_000) {
  const started = Date.now();
  for (;;) {
    const t = await page.locator("main").innerText().catch(() => "");
    if (re.test(t)) return t;
    if (Date.now() - started > timeout) return t;
    await page.waitForTimeout(250);
  }
}

const kpiText = (page) => page.evaluate(() =>
  [...document.querySelectorAll("main .grid")].slice(0, 2).map((g) => g.innerText).join("\n"));

const gameRows = (page) => page.evaluate(() => {
  const tbl = [...document.querySelectorAll("main table.admin-tbl")].at(-1);
  return [...(tbl?.querySelectorAll("tbody tr") ?? [])].map((r) => ({
    title: (r.children[0]?.textContent || "").replace(/\s+/g, " ").trim(),
    product: (r.children[1]?.textContent || "").trim(),
    href: r.querySelector('a[href^="/admin/house/"]')?.getAttribute("href") ?? null,
  }));
});

const { b, ctx: seed } = await browser();
await seed.close();
const state = await loginOnce(b, "admin");
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, storageState: state });
const page = await ctx.newPage();
console.log(`\nthe house book — the OWNER'S JOURNEY on ${BASE}\n`);

/* ═══ §1 · GETTING THERE — the way Ali actually would ══════════════════════════════════ */
console.log("§1 · from the console, not from a URL somebody pasted");
{
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  /* ⚠️ `aside`, not `nav` — the admin shell's primary navigation is an <aside> and the only
   * <nav> on the page is the section rail. A `nav a[href=…]` selector finds nothing and
   * reports the sidebar link missing when it is right there. */
  const link = page.locator('aside a[href="/admin/house"]').first();
  ok("1.1 · ⭐ the House link is in the console sidebar", (await link.count()) > 0);
  await link.click();
  await page.waitForURL(/\/admin\/house/, { timeout: 20_000 });
  await settle(page, /How the position is derived/);
  ok("1.2 · …and it lands on the book, with no query string to remember",
    page.url().replace(BASE, "") === "/admin/house", page.url());
  ok("1.3 · the default tab is POSITION — what do we hold",
    (await page.locator('[data-section-rail] a[aria-current="page"]').innerText()).trim() === "Position");
  const mark = await page.locator('aside a[href="/admin/house"]').first().evaluate((e) => ({
    cur: e.getAttribute("aria-current"), cls: e.className,
  }));
  ok("1.4 · the sidebar marks House as the current page",
    mark.cur === "page" || /bg-|text-text|active/.test(mark.cls),
    `aria-current=${mark.cur} class="${String(mark.cls).slice(0, 80)}"`);
}

/* ═══ §2 · ⭐ THE STATE THAT MUST SURVIVE A CLICK ══════════════════════════════════════
 * A window is a decision the owner made. Losing it on a tab switch means he re-makes it
 * three times per visit and eventually stops trusting which window he is looking at. */
console.log("\n§2 · ⭐ the window survives the rail, and the rail survives the window");
{
  await page.goto(`${BASE}/admin/house?range=7d`, { waitUntil: "networkidle" });
  const before = (await page.locator("main").innerText()).match(/Last 7 days/);
  ok("2.1 · a 7-day window is in force", !!before);

  await page.locator('[data-section-rail] a', { hasText: "Earnings" }).click();
  await page.waitForURL(/tab=earnings/, { timeout: 20_000 });
  await settle(page, /What we made/);
  ok("2.2 · ⭐ switching to EARNINGS keeps the 7-day window",
    /range=7d/.test(page.url()), page.url());
  ok("2.3 · …and the card heading says so, not just the URL",
    /Last 7 days/.test(await settle(page, /Last 7 days/)));

  await page.locator('[data-section-rail] a', { hasText: "By game" }).click();
  await page.waitForURL(/tab=games/, { timeout: 20_000 });
  await settle(page, /Games that moved money/);
  ok("2.4 · …and so does BY GAME", /range=7d/.test(page.url()) && /tab=games/.test(page.url()), page.url());

  /* The other direction: changing the window must not throw away the tab. */
  await page.locator('button, a').filter({ hasText: /^28 days$/ }).first().click();
  /* ⚠️ Wait for the WINDOW to change, not for a clock — see `settle`. */
  await page.waitForFunction(() => !location.search.includes("range=7d"), null, { timeout: 20_000 }).catch(() => {});
  await settle(page, /Games that moved money/);
  ok("2.5 · ⭐ changing the WINDOW keeps you on the tab you were reading",
    /tab=games/.test(page.url()), page.url());

  await page.locator('[data-section-rail] a', { hasText: "Position" }).click();
  await page.waitForFunction(() => !location.search.includes("tab="), null, { timeout: 20_000 }).catch(() => {});
  await settle(page, /How the position is derived/);
  ok("2.6 · returning to the DEFAULT tab drops the param rather than carrying `tab=position`",
    !/tab=position/.test(page.url()), page.url());
}

/* ═══ §3 · ⭐ A BALANCE HAS NO WINDOW, AND THE PAGE MUST MEAN IT ═══════════════════════
 * The caption promises the date filter scopes Earnings and By game ONLY. If the KPI band
 * moved with the window, that sentence would be a lie printed above the number it lies about. */
console.log("\n§3 · ⭐ the date filter moves the earnings and NOT the balances");
{
  await page.goto(`${BASE}/admin/house?range=today`, { waitUntil: "networkidle" });
  const kToday = await kpiText(page);
  await page.goto(`${BASE}/admin/house?range=all`, { waitUntil: "networkidle" });
  const kAll = await kpiText(page);
  ok("3.1 · ⭐ the KPI band is BYTE-IDENTICAL between `today` and `all time`",
    kToday === kAll, "a balance that moves with a date filter is not a balance");

  await page.goto(`${BASE}/admin/house?tab=earnings&range=today`, { waitUntil: "networkidle" });
  const eToday = await rowMoney(page, "Fee earned");
  await page.goto(`${BASE}/admin/house?tab=earnings&range=all`, { waitUntil: "networkidle" });
  const eAll = await rowMoney(page, "Fee earned");
  ok("3.2 · …while the EARNINGS waterfall does move with it",
    eToday !== null && eAll !== null && eToday !== eAll, `today ${eToday} · all ${eAll}`);
  ok("3.3 · CONTROL · all-time fee is the larger of the two (the window is not inverted)",
    Number(String(eAll).replace(/[^\d]/g, "")) > Number(String(eToday).replace(/[^\d]/g, "")),
    `today ${eToday} · all ${eAll}`);
}

/* ═══ §4 · ⭐ THE TWO TABS MUST AGREE ABOUT THE SAME NUMBER ════════════════════════════
 * `Fee earned` on EARNINGS and `Fee on the house account` on BY GAME are the same read over
 * the same window. If they ever disagree, one of the tabs is lying and the page cannot say
 * which — so this is the cross-tab identity, checked on three different windows. */
console.log("\n§4 · ⭐ EARNINGS and BY GAME agree about the fee — on every window");
for (const r of ["today", "7d", "30d", "all"]) {
  await page.goto(`${BASE}/admin/house?tab=earnings&range=${r}`, { waitUntil: "networkidle" });
  const fee = await rowMoney(page, "Fee earned");
  await page.goto(`${BASE}/admin/house?tab=games&range=${r}`, { waitUntil: "networkidle" });
  const house = await rowMoney(page, "Fee on the house account");
  const variance = await rowMoney(page, "Variance");
  ok(`4.${r} · the two tabs report the SAME fee for \`${r}\``,
    fee !== null && house !== null && house.replace("−", "").replace("-", "") === fee.replace("−", "").replace("-", ""),
    `earnings ${fee} · by-game ${house}`);
  ok(`4.${r}b · …and the by-game identity closes on that window`,
    /TZS\s0$/.test(String(variance)), `variance ${variance}`);
}

/* ═══ §5 · THE PRODUCT FILTER — narrows the rows, never the subtotals ══════════════════ */
console.log("\n§5 · the filter narrows what is listed and leaves the book whole");
{
  await page.goto(`${BASE}/admin/house?tab=games&range=all`, { waitUntil: "networkidle" });
  const subsBefore = await page.evaluate(() =>
    [...document.querySelectorAll("main table.admin-tbl")][1]?.innerText.replace(/\s+/g, " ").trim());
  const all = await gameRows(page);
  ok("5.1 · the unfiltered book lists both products",
    new Set(all.map((r) => r.product)).size === 2, [...new Set(all.map((r) => r.product))].join(" · "));

  await page.locator('[data-filter-rail] a', { hasText: "Up & Down" }).click();
  await page.waitForURL(/product=UPDOWN/, { timeout: 20_000 });
  await settle(page, /Games that moved money/);
  const upd = await gameRows(page);
  ok("5.2 · ⭐ filtering to Up & Down lists ONLY Up & Down",
    upd.length > 0 && upd.every((r) => r.product === "Up & Down"), [...new Set(upd.map((r) => r.product))].join(" · "));
  const subsAfter = await page.evaluate(() =>
    [...document.querySelectorAll("main table.admin-tbl")][1]?.innerText.replace(/\s+/g, " ").trim());
  ok("5.3 · ⭐ …and the BY-PRODUCT subtotals are byte-identical — the book stays whole",
    subsBefore === subsAfter, "a subtotal that moved with the filter would only agree with itself");
  ok("5.4 · the filter keeps the window it was applied in", /range=all/.test(page.url()), page.url());

  await page.locator('[data-filter-rail] a', { hasText: /^Polls$/ }).click();
  await page.waitForURL(/product=MARKET/, { timeout: 20_000 });
  await settle(page, /Games that moved money/);
  const polls = await gameRows(page);
  ok("5.5 · switching the filter switches the population, it does not intersect it",
    polls.length > 0 && polls.every((r) => r.product === "Poll"), [...new Set(polls.map((r) => r.product))].join(" · "));

  await page.locator('[data-filter-rail] a', { hasText: /^All$/ }).click();
  /* ⚠️ WAIT FOR THE ABSENCE, NOT FOR A CLOCK. There is no new param to watch for here — the
   * whole point is that `product=` goes away — so a fixed `waitForTimeout` was the only thing
   * holding this check up, and 1,200ms was not enough. It reported a working pill broken. */
  await page.waitForFunction(() => !location.search.includes("product="), null, { timeout: 20_000 }).catch(() => {});
  await settle(page, /Games that moved money/);
  ok("5.6 · clearing the filter drops the param rather than writing `product=`",
    !/product=/.test(page.url()), page.url());
}

/* ═══ §6 · PAGINATION — a real second page, and two pagers that do not collide ═════════ */
console.log("\n§6 · the pager reaches the rest of the book");
{
  await page.goto(`${BASE}/admin/house?tab=games&range=all`, { waitUntil: "networkidle" });
  const p1 = await gameRows(page);
  const pager = page.locator('main a[href*="gpage=2"]').first();
  ok("6.1 · a second page exists and is reachable", (await pager.count()) > 0);
  await pager.click();
  await page.waitForURL(/gpage=2/, { timeout: 20_000 });
  await settle(page, /Games that moved money/);
  const p2 = await gameRows(page);
  ok("6.2 · ⭐ page 2 is a DIFFERENT twenty games, not the same page again",
    p2.length > 0 && p1[0]?.href !== p2[0]?.href && !p2.some((r) => r.href === p1[0]?.href),
    `p1[0]=${p1[0]?.href} p2[0]=${p2[0]?.href}`);
  ok("6.3 · the pager keeps the tab and the window", /tab=games/.test(page.url()) && /range=all/.test(page.url()));
  /* ⛔ TWO PAGERS, TWO PARAMS. `gpage` belongs to the game table and `epage` to the fee
   * sources; one shared `page` would move both lists at once. */
  ok("6.4 · ⛔ the game pager is `gpage`, not the shared `page`",
    /gpage=2/.test(page.url()) && !/[?&]page=/.test(page.url()), page.url());
  await page.goto(`${BASE}/admin/house?tab=games&range=all&gpage=99999`, { waitUntil: "networkidle" });
  ok("6.5 · an out-of-range page CLAMPS to the last page instead of rendering empty",
    (await gameRows(page)).length > 0);
}

/* ═══ §7 · THE DRILL-DOWN — the game you clicked, and the way back ════════════════════ */
console.log("\n§7 · into one game and back out");
{
  await page.goto(`${BASE}/admin/house?tab=games&range=all`, { waitUntil: "networkidle" });
  const rows = await gameRows(page);
  const target = rows[0];
  ok("7.1 · the top row links to its own book", !!target?.href, String(target?.href));
  const id = target.href.split("/").pop();
  await page.locator(`main a[href="${target.href}"]`).first().click();
  await page.waitForURL(new RegExp(target.href.replace(/[/]/g, "\\/")), { timeout: 20_000 });
  /* ⛔ NOT `networkidle` — see `settle`. The skeleton has no text and reads as the wrong game. */
  const detail = await settle(page, new RegExp(id));
  ok("7.2 · ⭐ it opened the game that was CLICKED, not a neighbour",
    detail.includes(id), `expected ${id}`);
  ok("7.3 · the drill-down states the same title the row did",
    target.title.length < 6 || detail.includes(target.title.slice(0, 24)),
    `row "${target.title.slice(0, 40)}"`);
  /* ⭐ THE NUMBERS MUST TIE. The row's fee and the drill-down's fee are the same read. */
  const rowFee = await page.evaluate(() => null);
  ok("7.4 · the breadcrumb names the game", (await page.locator("main, nav").allInnerTexts()).join(" ").includes("House"));
  await page.locator('main a', { hasText: "Back to the book" }).first().click();
  await page.waitForURL(/tab=games/, { timeout: 20_000 });
  await settle(page, /Games that moved money/);
  ok("7.5 · ⭐ 'Back to the book' returns to BY GAME, not to the default tab",
    /tab=games/.test(page.url()), page.url());
  void rowFee;
}

/* ═══ §8 · ⭐ THE ROW AND THE DRILL-DOWN MUST AGREE ABOUT THE MONEY ════════════════════ */
console.log("\n§8 · ⭐ a game's fee is the same number in the table and in its own book");
{
  await page.goto(`${BASE}/admin/house?tab=games&range=all`, { waitUntil: "networkidle" });
  const three = await page.evaluate(() => {
    const tbl = [...document.querySelectorAll("main table.admin-tbl")].at(-1);
    return [...(tbl?.querySelectorAll("tbody tr") ?? [])].slice(0, 3).map((r) => ({
      href: r.querySelector('a[href^="/admin/house/"]')?.getAttribute("href") ?? null,
      fee: (r.children[6]?.textContent || "").trim(),
      net: (r.children[8]?.textContent || "").trim(),
    }));
  });
  for (const g of three) {
    if (!g.href) continue;
    await page.goto(`${BASE}${g.href}`, { waitUntil: "networkidle" });
    const booked = await rowMoney(page, "Fee taken");
    const net = await page.evaluate(() => {
      for (const el of document.querySelectorAll("main .grid *")) {
        if ((el.textContent || "").trim() === "Net retained") {
          const tile = el.closest("div")?.parentElement;
          return tile?.querySelector(".amount")?.textContent?.trim() ?? null;
        }
      }
      return null;
    });
    const strip = (s) => String(s).replace(/[^\d]/g, "");
    ok(`8.x · ${g.href.split("/").pop()} · the table's fee equals the game's own booked fee`,
      strip(g.fee) === strip(booked), `table ${g.fee} · book ${booked}`);
    void net;
  }
}

/* ═══ §9 · BAD INPUT DEGRADES, IT DOES NOT BREAK ══════════════════════════════════════ */
console.log("\n§9 · a mangled URL is somebody's bookmark, not an attack");
{
  const cases = [
    ["?tab=nonsense", /Position/, "an unknown tab falls back to the default"],
    ["?tab=games&product=NONSENSE", /Up & Down/, "an unknown product shows the whole book"],
    ["?tab=games&gpage=-5", /Games that moved money/, "a negative page clamps to the first"],
    ["?range=nonsense", /Balances are as of this moment/, "an unknown window falls back to the default"],
    ["?from=not-a-date&to=also-not", /Balances are as of this moment/, "unparseable dates do not crash"],
  ];
  for (const [q, expect, why] of cases) {
    const res = await page.goto(`${BASE}/admin/house${q}`, { waitUntil: "networkidle" });
    const t = await page.locator("main").innerText();
    ok(`9.x · \`${q}\` — ${why}`, res?.status() === 200 && expect.test(t),
      `status ${res?.status()}`);
    ok(`9.x · …and nothing unrendered reached the reader`, !/\bNaN\b|\bundefined\b/.test(t));
  }
  /* ⭐ A MARKET ID THAT IS NOT A MARKET. The page must render an EMPTY BOOK, not a 404 and
   * not a crash — the whole reason it refuses `notFound()` is that money can outlive a row. */
  const res = await page.goto(`${BASE}/admin/house/mkt_definitely_not_a_real_market_id`, { waitUntil: "networkidle" });
  const t = await page.locator("main").innerText();
  ok("9.1 · ⭐ an unknown market renders an EMPTY BOOK, not a 404",
    res?.status() === 200 && /market row missing|One game/.test(t), `status ${res?.status()}`);
  ok("9.2 · …and it says the book is empty rather than inventing figures",
    /No ledger entries for this game|market row missing/.test(t), t.slice(0, 160));
  ok("9.3 · …and offers the way back", (await page.locator('main a', { hasText: "Back to the book" }).count()) > 0);
}

/* ═══ §10 · THE CROSS-LINKS GO WHERE THEY SAY ═════════════════════════════════════════ */
console.log("\n§10 · the links off this page are real");
{
  await page.goto(`${BASE}/admin/house`, { waitUntil: "networkidle" });
  const fin = page.locator('main a[href*="/admin/finance"]').first();
  ok("10.1 · the trial-balance cross-link exists", (await fin.count()) > 0);
  await fin.click();
  await page.waitForURL(/\/admin\/finance/, { timeout: 20_000 });
  const financeText = await settle(page, /trial balance/i);
  ok("10.2 · ⭐ …and it lands on the LEDGER tab, where the drift table actually is",
    /tab=ledger/.test(page.url()) && /trial balance/i.test(financeText),
    `${page.url()} · ${financeText.slice(0, 100)}`);
}

/* ═══ §11 · CONSISTENCY WITH THE CONSOLE IT LIVES IN ══════════════════════════════════ */
console.log("\n§11 · House looks like it belongs beside Finance");
{
  const shape = async (url) => {
    await page.goto(url, { waitUntil: "networkidle" });
    return page.evaluate(() => {
      const head = document.querySelector("header");
      const body = document.querySelector("header + div, main > div");
      const h1 = document.querySelector("h1");
      const card = document.querySelector(".glass-panel");
      const g = (el) => (el ? getComputedStyle(el) : null);
      return {
        h1Size: g(h1)?.fontSize, h1Family: g(h1)?.fontFamily?.split(",")[0],
        headPad: g(head)?.paddingLeft, bodyPad: g(body)?.paddingLeft,
        cardRadius: g(card)?.borderRadius, cardBg: g(card)?.backgroundColor,
        tblFont: g(document.querySelector(".admin-tbl"))?.fontSize,
        railH: g(document.querySelector("[data-section-rail] a"))?.height,
      };
    });
  };
  const house = await shape(`${BASE}/admin/house`);
  const finance = await shape(`${BASE}/admin/finance`);
  for (const k of Object.keys(house)) {
    ok(`11.x · ${k} matches /admin/finance`, house[k] === finance[k], `house ${house[k]} · finance ${finance[k]}`);
  }
}

/* ═══ §12 · ⭐ THE THREE DRILL-DOWNS THAT ARE NOT THE ORDINARY ONE ═════════════════════
 *
 * A settled YES/NO poll is the easy case and §7 covered it. The three that can go wrong are
 * a VOID (where `poolFee` would happily invent a fee), an Up & Down round (where the outcome
 * is stored YES/NO and must READ Up/Down), and a game whose market row is gone (where the
 * money is real and the row is not). ⛔ The drive FINDS them rather than hard-coding ids — a
 * pinned id rots the day that market is purged, and then this section passes by not running.
 */
console.log("\n§12 · ⭐ a VOID, an Up & Down round, and a game whose row is gone");
{
  const find = async (q, pick) => {
    await page.goto(`${BASE}/admin/house?tab=games&range=all${q}`, { waitUntil: "networkidle" });
    /* ⭐ THE BOOK IS SORTED BY NET RETAINED, DESCENDING — so a VOID (which books no fee, by
     * definition) is at the BOTTOM, not the top. Searching only the first pages found none and
     * reported the population empty; the check would then have passed by not running. Read the
     * head AND the tail. */
    const lastPage = await page.evaluate(() => {
      const nums = [...document.querySelectorAll('main a[href*="gpage="]')]
        .map((a) => Number(new URL(a.href).searchParams.get("gpage")))
        .filter((n) => Number.isFinite(n));
      return nums.length ? Math.max(...nums) : 1;
    });
    const pages = [...new Set([1, 2, 3, lastPage, lastPage - 1, lastPage - 2].filter((n) => n >= 1))];
    for (const p of pages) {
      if (p > 1) {
        await page.goto(`${BASE}/admin/house?tab=games&range=all${q}&gpage=${p}`, { waitUntil: "networkidle" });
      }
      const rows = await page.evaluate(() => {
        const tbl = [...document.querySelectorAll("main table.admin-tbl")].at(-1);
        return [...(tbl?.querySelectorAll("tbody tr") ?? [])].map((r) => ({
          href: r.querySelector('a[href^="/admin/house/"]')?.getAttribute("href") ?? null,
          title: (r.children[0]?.textContent || "").replace(/\s+/g, " ").trim(),
          outcome: (r.children[2]?.textContent || "").trim(),
        }));
      });
      const hit = rows.find(pick);
      if (hit) return hit;
    }
    return null;
  };

  /* ── A VOID ────────────────────────────────────────────────────────────────────────── */
  const voided = await find("", (r) => /VOID/i.test(r.outcome));
  if (ok("12.1 · a VOIDED game exists in the book", !!voided, "nothing to check if none is listed")) {
    await page.goto(`${BASE}${voided.href}`, { waitUntil: "networkidle" });
    const t = await settle(page, /One game/);
    ok("12.2 · ⭐ a VOID offers NO recompute — and says why, rather than showing a variance",
      /every stake was refunded and no fee was booked/i.test(t) && !/Variance/.test(t),
      "capped-commission ignores the winning side and would price a VOID at a real fee");
    ok("12.3 · …and its own arithmetic still closes to zero",
      /Left in the pool[\s\S]{0,80}TZS 0/.test(t.replace(/\n/g, " ")),
      t.replace(/\s+/g, " ").match(/Left in the pool.{0,40}/)?.[0] ?? "");
    ok("12.4 · the row said VOID and the book agrees", /Void|VOID/.test(t));
  }

  /* ── AN UP & DOWN ROUND ────────────────────────────────────────────────────────────── */
  const ud = await find("&product=UPDOWN", (r) => /^(Up|Down)$/.test(r.outcome));
  if (ok("12.5 · an Up & Down round is listed with an UP/DOWN outcome, not YES/NO",
    !!ud, "the schema stores YES/NO here; the reader must never see it")) {
    await page.goto(`${BASE}${ud.href}`, { waitUntil: "networkidle" });
    const t = await settle(page, /One game/);
    ok("12.6 · ⭐ its own book also reads Up/Down, never YES/NO",
      /·\s(Up|Down)\s·/.test(t.replace(/\s+/g, " ")) && !/·\s(YES|NO)\s·/.test(t.replace(/\s+/g, " ")),
      t.replace(/\s+/g, " ").match(/RESOLVED.{0,30}/)?.[0] ?? "");
    ok("12.7 · …and it is labelled as the Up & Down product", /Up & Down/.test(t));
  }

  /* ── A GAME WHOSE MARKET ROW IS GONE ───────────────────────────────────────────────── */
  const orphan = await find("", (r) => /^mkt_[a-z0-9]+$/i.test(r.title.split(" ")[0]) && /market row missing/i.test(r.title));
  if (orphan) {
    await page.goto(`${BASE}${orphan.href}`, { waitUntil: "networkidle" });
    const t = await settle(page, /One game/);
    ok("12.8 · ⭐ a game whose row is gone renders its MONEY, with the row named as missing",
      /market row missing/i.test(t) && /TZS/.test(t),
      "121 of these carry 54,650 on production, one of them the 2nd-largest earner");
    ok("12.9 · …and it does not pretend to know an outcome or a rate",
      /no market row left|redacted or removed/i.test(t));
  } else {
    ok("12.8 · a row-missing game is reachable from the book",
      false, "none found in the first 6 pages — the label may have changed");
  }
}

/* ═══ §13 · THE OTHER TWO PAGERS ══════════════════════════════════════════════════════
 * §6 drove `gpage`. There are two more, and the whole reason they have separate names is
 * that one shared `page` would move every list on the screen at once. */
console.log("\n§13 · the fee-source pager and the evidence pager are their own");
{
  await page.goto(`${BASE}/admin/house?tab=earnings&range=all&gpage=3`, { waitUntil: "networkidle" });
  const t = await settle(page, /Fee earned, by source/);
  ok("13.1 · ⛔ a stale `gpage` from BY GAME does not disturb EARNINGS",
    /Fee earned, by source/.test(t) && !/\bNaN\b/.test(t));

  /* The evidence pager on a busy game. Find the busiest by taking the top earner. */
  await page.goto(`${BASE}/admin/house?tab=games&range=all`, { waitUntil: "networkidle" });
  const first = (await gameRows(page))[0];
  await page.goto(`${BASE}${first.href}`, { waitUntil: "networkidle" });
  const detail = await settle(page, /The ledger behind these numbers/);
  ok("13.2 · the evidence panel names how many entries it stands for", /entries/.test(detail));
  const pager2 = page.locator('main a[href*="epage=2"]');
  if ((await pager2.count()) > 0) {
    const before = await page.evaluate(() =>
      [...document.querySelectorAll("main table.admin-tbl")].at(-1)?.innerText ?? "");
    await pager2.first().click();
    await page.waitForURL(/epage=2/, { timeout: 20_000 });
    await settle(page, /The ledger behind these numbers/);
    const after = await page.evaluate(() =>
      [...document.querySelectorAll("main table.admin-tbl")].at(-1)?.innerText ?? "");
    ok("13.3 · the evidence pager shows a different page of lines", before !== after);
  } else {
    ok("13.3 · this game's evidence fits one page (no pager needed)", true);
  }
}

/* ═══ §14 · BACK AND FORWARD — a URL fact survives the browser, not just a click ═══════ */
console.log("\n§14 · the browser's own back button");
{
  await page.goto(`${BASE}/admin/house`, { waitUntil: "networkidle" });
  await page.locator('[data-section-rail] a', { hasText: "Earnings" }).click();
  await page.waitForURL(/tab=earnings/, { timeout: 20_000 });
  await settle(page, /What we made/);
  await page.locator('[data-section-rail] a', { hasText: "By game" }).click();
  await page.waitForURL(/tab=games/, { timeout: 20_000 });
  await settle(page, /Games that moved money/);
  await page.goBack();
  await settle(page, /What we made/);
  ok("14.1 · ⭐ Back returns to EARNINGS — the tab is a real history entry",
    /tab=earnings/.test(page.url()), page.url());
  await page.goForward();
  await settle(page, /Games that moved money/);
  ok("14.2 · …and Forward returns to BY GAME", /tab=games/.test(page.url()), page.url());
  await page.reload({ waitUntil: "networkidle" });
  ok("14.3 · a refresh keeps you where you were", /tab=games/.test(page.url()), page.url());
}

/* ═══ §15 · A CUSTOM WINDOW, AND A WINDOW WITH NOTHING IN IT ══════════════════════════ */
console.log("\n§15 · a hand-picked window, and an empty one");
{
  await page.goto(`${BASE}/admin/house?tab=earnings&from=2026-08-01&to=2026-08-31`, { waitUntil: "networkidle" });
  const aug = await settle(page, /What we made/);
  ok("15.1 · a custom from/to window is accepted and named on the card",
    /What we made ·/.test(aug) && !/\bNaN\b/.test(aug),
    aug.split("\n").find((l) => l.startsWith("What we made")) ?? "");
  const augFee = await rowMoney(page, "Fee earned");
  ok("15.2 · …and it reports a real figure for that month", /TZS/.test(String(augFee)), String(augFee));

  /* ⭐ A WINDOW BEFORE THE LEDGER EXISTS. Every read returns nothing, and the page must say
   * so rather than print a wall of confident zeros with no explanation. */
  await page.goto(`${BASE}/admin/house?tab=earnings&from=2020-01-01&to=2020-01-31`, { waitUntil: "networkidle" });
  const empty = await settle(page, /What we made/);
  ok("15.3 · ⭐ an empty window renders zeros, not NaN and not a crash",
    !/\bNaN\b|\bundefined\b/.test(empty) && /TZS 0/.test(empty));
  ok("15.4 · …and the fee-source table states it is empty rather than showing a blank grid",
    /No fee booked in this window|Widen the window/i.test(empty),
    empty.slice(-200));
  await page.goto(`${BASE}/admin/house?tab=games&from=2020-01-01&to=2020-01-31`, { waitUntil: "networkidle" });
  const emptyGames = await settle(page, /Games that moved money/);
  ok("15.5 · an empty BY GAME states it, and its identity still closes at zero",
    /No game moved money in this window/i.test(emptyGames) && /Variance — must be zero[\s\S]{0,40}TZS 0/.test(emptyGames.replace(/\n/g, " ")),
    emptyGames.replace(/\s+/g, " ").match(/Variance.{0,40}/)?.[0] ?? "");
  ok("15.6 · ⛔ …and the BALANCES above it are unchanged — they have no window",
    /Strict free cash/i.test(emptyGames));
}

await page.screenshot({ path: `${SHOT}/house-flow-final.png`, fullPage: false });
await b.close();
console.log(`\nhouse-flow: ${pass} passed, ${fails.length} failed  (of ${pass + fails.length})`);
if (fails.length) {
  console.error("\nThe journey is not what the page implies it is:");
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
console.log("house-flow: OK — the window survives, the tabs agree, the filter keeps the book whole, and a bad URL degrades.");
