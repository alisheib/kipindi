/**
 * U36 · /admin/campaigns — the SMS campaign list, driven and MEASURED, every state the unit names.
 *
 * WHAT THIS PROVES, at 1280x800 and 360x780 (+ reduced motion at 360), with HeadlessChrome in the UA:
 *   · EMPTY — before any campaign exists: the empty row ("No SMS campaigns yet" + its pointer to New campaign — U37b turned
 *     the composer on), NO rail, the head's one action (New campaign → /admin/campaigns/new), no nav badge, no sideways
 *     scroll;
 *   · LOADING — the ghost on screen while the page chunk is held, and the card's top edge does not move when the real
 *     page swaps in (equal by construction; asserted within 1px). The rail ghost's height against the real rail is
 *     RECORDED, not asserted (the real pills carry counts and wrap by label width at 360 — loading.tsx says why);
 *   · POPULATED — the rail with the server's whole-table counts (All · Drafts · Sending · Paused · Finished), every
 *     pill one size (the dense rank, recorded against --tap-min), a page of 20 and the pager past it, names as plain
 *     text (no campaign page until U47), a draft's audience "Not confirmed", an unnamed draft "Untitled campaign", no
 *     TZS anywhere on the page;
 *   · IN-PROGRESS — the RUNNING campaign's DETERMINATE bar (aria-valuenow/max = the seed's settled/rows) and its
 *     caption, the PREPARING campaign's "prepared" bar, a RUNNING campaign with no rows showing "—" and no bar, the
 *     "As of HH:MM EAT" line beside Refresh — and the nav badge "3" in the sidebar at 1280 and in the drawer at 360;
 *     ⚠️ the seeded rows never move (no pump until U44), and this drive says so rather than claiming liveness;
 *   · NO-MATCH — ?status=paused with no paused campaign: the rail STILL drawn with Paused in force, "No paused
 *     campaigns", and Show all (the app's own link) back to the whole list;
 *   · REFUSED — FINANCE and SUPPORT get the restricted panel titled "SMS campaigns" ("Growth & marketing access"), no
 *     SMS campaigns nav item, and — with attention at 3 — NO campaigns key in their page's HTML or flight payload, while
 *     GROWTH's payload carries it (the positive control);
 *   · PAUSED — the second seed: two PAUSED rows, the credit floor's sentence under one and "Engine reason: …" under the
 *     other (never the raw key), and the badge at 4;
 *   · ERROR — the read fault: "Couldn't load the SMS campaigns" inside the card, the rail still drawn with NO counts,
 *     and no badge (never "0").
 * The campaigns come from `/api/dev-test/marketing-campaigns-seed` (`?set=base`, `?set=paused`, `?fault=1|0`), through
 * the ONE campaign door; the seed's answer carries what is asserted here. Every capture asserts what it photographed.
 *
 * Run: BASE=http://localhost:3010 node scripts/live/marketing-campaigns-drive.mjs
 * Boot (in-memory, zero prod risk; remove .next first — a stale .next 404s every /api/dev-test route; start a FRESH
 * server, because the EMPTY state needs a campaign table with nothing in it):
 *   SESSION_SECRET=<32+ chars> OTP_PEPPER=<16+ chars> DISABLE_ADMIN_TOTP=true npx next dev -p 3010
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3010";
const SHOTS = join(".qa-shots", "marketing-setup", "u36");
mkdirSync(SHOTS, { recursive: true });

let pass = 0;
let fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? " -- " + detail : ""}`); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** Whitespace runs, built from character codes (space, tab, LF, CR, no-break space) — no escape in this file. */
const WS = new RegExp("[" + String.fromCharCode(32, 9, 10, 13, 160) + "]+", "g");
const squash = (s) => (s || "").replace(WS, " ").trim();
/** The badge object's key as React serialises it: plain in the flight body, and escaped inside the HTML's script tags. */
const BSL = String.fromCharCode(92);
const KEY_PLAIN = '"campaigns":"';
const KEY_ESCAPED = BSL + '"campaigns' + BSL + '":' + BSL + '"';
const hasKey = (body) => body.includes(KEY_PLAIN) || body.includes(KEY_ESCAPED);
/** The key WITH a value — the positive control asks for the count itself, in either spelling. */
const hasKeyWith = (body, v) => body.includes(KEY_PLAIN + v + '"') || body.includes(KEY_ESCAPED + v + BSL + '"');

const VIEWPORTS = [
  { name: "1280x800", width: 1280, height: 800 },
  { name: "360x780", width: 360, height: 780 },
];
const CARD = '[data-block="campaigns-card"]';
const RAIL = '[data-filter-rail="campaign-status"]';
const NAV_ITEM = 'a[href="/admin/campaigns"]';

const browser = await chromium.launch();

async function staffCtx(role, phone, viewport, reducedMotion = "no-preference") {
  const ctx = await browser.newContext({ viewport, reducedMotion });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const r = await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { role, phone, name: `QA ${role}` } });
  if (!r.ok()) throw new Error(`seed-admin ${role} failed: ${r.status()}`);
  await page.evaluate(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  return { ctx, page };
}

const seed = async (page, query) => {
  const r = await page.request.post(`${BASE}/api/dev-test/marketing-campaigns-seed?${query}`);
  if (!r.ok()) throw new Error(`campaign seed ${query} failed: ${r.status()} ${await r.text()}`);
  return r.json();
};

const boxOf = (page, selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: Math.round((r.top + window.scrollY) * 100) / 100, h: Math.round(r.height * 100) / 100, w: Math.round(r.width * 100) / 100 };
}, selector);
const mainText = async (page) => squash(await page.evaluate(() => document.querySelector("main#main-content")?.innerText ?? ""));
const heading = async (page) => squash(await page.locator("main#main-content h1").first().innerText().catch(() => ""));
const overflowOf = (page) => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
const tapMin = (page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--tap-min").trim());

async function openCampaigns(page, query = "") {
  await page.goto(`${BASE}/admin/campaigns${query}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main#main-content h1", { timeout: 30000 });
  await wait(800);
}

/** Viewport tiles only (never full-page): the top, or a block scrolled into view. */
async function shoot(page, name, scrollTo = null) {
  if (scrollTo) await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: "start" }), scrollTo);
  else await page.evaluate(() => window.scrollTo(0, 0));
  await wait(250);
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}
/** ⛔ Every capture asserts what it photographs FIRST: the page's own heading, and the sentence the state is about. */
async function stateShot(page, vp, name, wantText, scrollTo = null, wantHeading = "SMS campaigns") {
  const h1 = await heading(page);
  const text = await mainText(page);
  ok(`${vp} · ${name} · the capture shows the "${wantHeading}" heading and "${wantText}"`, h1 === wantHeading && text.includes(wantText),
    `h1="${h1}" text="${text.slice(0, 160)}"`);
  await shoot(page, `${vp}-${name}`, scrollTo);
}

/* ── the rail and the rows, read by their own stamps — never by a class string ── */
const railChips = (page) => page.$$eval(`${RAIL} a[data-chip]`, (els) => els.map((e) => ({
  chip: e.getAttribute("data-chip") || "", count: e.getAttribute("data-count"), current: e.getAttribute("aria-current"),
  h: Math.round(e.getBoundingClientRect().height * 100) / 100, href: e.getAttribute("href") || "",
})));
const rowIds = (page) => page.$$eval("tr[data-campaign-row]", (els) => els.map((e) => e.getAttribute("data-campaign-id") || ""));
const rowOf = (page, id) => page.locator(`tr[data-campaign-row][data-campaign-id="${id}"]`);
const textOfLoc = async (loc) => ((await loc.count()) > 0 ? squash(await loc.first().innerText()) : "");
/** The nav badge on the SMS campaigns item: the sidebar from lg, the drawer (opened, then closed) below it. */
async function navBadge(page, width) {
  if (width >= 1024) return textOfLoc(page.locator(`aside ${NAV_ITEM} .count-badge`));
  await page.locator('button[aria-label="Open admin navigation"]').first().click();
  await page.waitForSelector('[role="dialog"][aria-label="Admin navigation"]', { timeout: 10000 }).catch(() => {});
  await wait(300);
  const badge = await textOfLoc(page.locator(`[role="dialog"][aria-label="Admin navigation"] ${NAV_ITEM} .count-badge`));
  const itemThere = (await page.locator(`[role="dialog"][aria-label="Admin navigation"] ${NAV_ITEM}`).count()) > 0;
  await page.keyboard.press("Escape").catch(() => {});
  await wait(300);
  return itemThere ? badge : "(no nav item)";
}
/**
 * The raw page HTML — which carries the whole flight payload inline, in its `self.__next_f.push` script chunks, so it
 * is the primary evidence — and, when the server answers one, the flight body itself (text/x-component). ⚠️ A bare
 * `RSC: 1` request without the router's own cache-busting parameter may be redirected or answered with HTML; then
 * `flight` is "" and only the HTML is judged (`served` says which).
 */
async function payloads(page, path) {
  const html = await (await page.request.get(BASE + path)).text();
  const res = await page.request.get(BASE + path, { headers: { RSC: "1" } });
  const served = (res.headers()["content-type"] || "").includes("text/x-component");
  const flight = served ? await res.text() : "";
  return { html, flight, served };
}

// ── EMPTY — first, on a fresh server whose campaign table holds nothing ────────────────────────────────────────────
for (const vp of VIEWPORTS) {
  console.log(`${String.fromCharCode(10)}[u36] empty · ${vp.name}`);
  const { ctx, page } = await staffCtx("GROWTH", "+255700003601", { width: vp.width, height: vp.height });
  ok(`${vp.name} · UA carries HeadlessChrome`, /HeadlessChrome/.test(await page.evaluate(() => navigator.userAgent)));
  await openCampaigns(page);
  const text = await mainText(page);
  // ⭐ U37b · the composer exists (CAMPAIGN_SCREENS.compose is on): the empty row points at the head's one action.
  ok(`${vp.name} · EMPTY · the empty row says there is no campaign, and points at New campaign`,
    text.includes("No SMS campaigns yet") && text.includes("Write one with New campaign."), text.slice(0, 200));
  ok(`${vp.name} · EMPTY · no rail on an empty table (a whole-table fact), no table rows`,
    (await page.locator(RAIL).count()) === 0 && (await page.locator("tr[data-campaign-row]").count()) === 0);
  ok(`${vp.name} · EMPTY · the head's one action is New campaign, a link to the composer (CAMPAIGN_SCREENS.compose)`,
    (await page.locator('main#main-content header a.btn[href="/admin/campaigns/new"]').count()) === 1 && text.includes("New campaign"));
  ok(`${vp.name} · EMPTY · no nav badge on SMS campaigns`, (await navBadge(page, vp.width)) === "");
  ok(`${vp.name} · EMPTY · no horizontal page overflow`, (await overflowOf(page)) === 0, `${await overflowOf(page)}px`);
  await stateShot(page, vp.name, "empty", "No SMS campaigns yet");
  await ctx.close();
}

// ── SEED · the base set ─────────────────────────────────────────────────────────────────────────────────────────────
let base;
{
  const { ctx, page } = await staffCtx("GROWTH", "+255700003602", { width: 1280, height: 800 });
  base = await seed(page, "set=base");
  ok("seed · 22 campaigns, nine drafts, three in flight, none paused, ten finished — and three want attention",
    base.total === 22 && base.rail.drafts === 9 && base.rail.sending === 3 && base.rail.paused === 0 && base.rail.finished === 10 && base.attention === 3,
    JSON.stringify({ total: base.total, rail: base.rail, attention: base.attention }));
  await ctx.close();
}
const fx = (status, pick = (f) => true) => base.fixtures.find((f) => f.status === status && pick(f));
const running = fx("RUNNING", (f) => f.rows > 0);
const emptyRunning = fx("RUNNING", (f) => f.rows === 0);
const preparing = fx("PREPARING");
/** Confirmed, then cancelled before it started: an audience and no row ever written (the seed's "Halftime quiz"). */
const cancelledUnstarted = fx("CANCELLED", (f) => f.rows === 0 && f.audience !== null);
const untitled = base.fixtures.find((f) => f.name === "");
const nf = new Intl.NumberFormat("en-US");

const measured = {};
for (const vp of VIEWPORTS) {
  console.log(`${String.fromCharCode(10)}[u36] ${vp.name}`);
  const viewport = { width: vp.width, height: vp.height };
  const { ctx, page } = await staffCtx("GROWTH", "+255700003603", viewport);

  // ── LOADING — hold the page chunk, client-navigate in from another Growth page, measure the ghost, then the page ──
  // ⚠️ The held handler may wake after `unroute` released the request; the late continue is allowed to find it gone.
  await page.route("**src_app_admin_campaigns_page_tsx**", async (route) => { await wait(5000); await route.continue().catch(() => {}); });
  await page.goto(BASE + "/admin/bonuses", { waitUntil: "domcontentloaded" });
  await wait(2500);
  const anchor = await page.waitForSelector(NAV_ITEM, { state: "attached", timeout: 15000 }).catch(() => null);
  ok(`${vp.name} · the SMS campaigns nav anchor is in the DOM`, !!anchor);
  if (anchor) {
    // The app's own <Link>, clicked in the page (hidden in the closed drawer at 360, so a pointer click cannot reach it).
    await page.evaluate((sel) => document.querySelector(sel).click(), NAV_ITEM);
    await page.waitForSelector('[data-skeleton="campaigns-card"]', { timeout: 15000 }).catch(() => {});
    const ghostCard = await boxOf(page, '[data-skeleton="campaigns-card"]');
    const ghostRail = await boxOf(page, '[data-skeleton="campaigns-rail"]');
    const realYet = await boxOf(page, CARD);
    ok(`${vp.name} · LOADING · the ghost is on screen (its rail strip inside its card) and the real page is not yet`,
      !!ghostCard && ghostCard.h > 0 && !!ghostRail && ghostRail.top >= ghostCard.top && realYet === null, JSON.stringify({ ghostCard, ghostRail, realYet }));
    ok(`${vp.name} · LOADING · the ghost heads the page "SMS campaigns"`, (await heading(page)) === "SMS campaigns", await heading(page));
    await shoot(page, `${vp.name}-loading`);
    await page.unroute("**src_app_admin_campaigns_page_tsx**");
    await page.waitForSelector(CARD, { timeout: 30000 });
    await wait(800);
    const realCard = await boxOf(page, CARD);
    const realRail = await boxOf(page, RAIL);
    // ⚠️ RECORDED, NOT ASSERTED EQUAL: the real rail's pills carry counts and wrap by label width (loading.tsx).
    measured[vp.name] = { ghostTop: ghostCard?.top, realTop: realCard?.top, railGhostH: ghostRail?.h, railRealH: realRail?.h,
      railDelta: ghostRail && realRail ? Math.round((realRail.h - ghostRail.h) * 100) / 100 : null };
    ok(`${vp.name} · LOADING · the card's top edge does not move when the page swaps in (within 1px)`,
      !!ghostCard && !!realCard && Math.abs(ghostCard.top - realCard.top) <= 1, `${ghostCard?.top} vs ${realCard?.top}`);
  }

  // ── POPULATED ──────────────────────────────────────────────────────────────────────────────────────────────────
  await openCampaigns(page);
  const chips = await railChips(page);
  ok(`${vp.name} · POPULATED · the rail is All · Drafts · Sending · Paused · Finished with the WHOLE table's counts, All in force`,
    chips.map((c) => `${c.chip}=${c.count}`).join(",") === `status:=22,status:drafts=9,status:sending=3,status:paused=0,status:finished=10`
      && chips.filter((c) => c.current === "page").map((c) => c.chip).join(",") === "status:",
    chips.map((c) => `${c.chip}=${c.count}${c.current ? "*" : ""}`).join(","));
  const heights = [...new Set(chips.map((c) => c.h))];
  measured[vp.name] = { ...measured[vp.name], pillHeights: heights, tapMin: await tapMin(page) };
  ok(`${vp.name} · POPULATED · every pill is ONE size — the dense rank (its height recorded against --tap-min)`,
    heights.length === 1 && heights[0] >= 30 && heights[0] <= 34, `${heights.join("/")}px vs --tap-min ${await tapMin(page)}`);
  const ids = await rowIds(page);
  ok(`${vp.name} · POPULATED · a page of 20, newest first — the three in flight head it`,
    ids.length === 20 && ids[0] === "cmp_seed_22" && ids[1] === "cmp_seed_21" && ids[2] === "cmp_seed_20", ids.slice(0, 4).join(","));
  ok(`${vp.name} · POPULATED · the pager is there (22 campaigns, 2 pages)`, (await page.locator('a[href*="page=2"]').count()) > 0);
  // ⭐ A SAVED DRAFT REOPENS FROM THE LIST (the validation audit's blocker, 2026-10-03).
  const draftHref = await page.locator('tr[data-campaign-row]:has-text("DRAFT") td:first-child a').first().getAttribute("href").catch(() => null);
  const sendingLinks = await page.locator('tr[data-campaign-row]:has-text("SENDING") td:first-child a').count();
  ok(`${vp.name} · POPULATED · a DRAFT row's name opens the composer at its ?draft= address; a SENDING row stays plain`,
    typeof draftHref === "string" && draftHref.startsWith("/admin/campaigns/new?draft=") && sendingLinks === 0, `${draftHref} · sending links ${sendingLinks}`);
  // ⚖️ 1280 is the console's narrowest desktop. As first built, the seven columns ran 26px past the card there and 16 of
  // 20 names wrapped (measured 2026-10-02); 360 scrolls sideways by design, as the contacts table does.
  if (vp.width >= 1280) {
    const fit = await page.evaluate(() => {
      const table = document.querySelector('[data-block="campaigns-card"] table');
      const scroller = table?.parentElement;
      const wrapped = [...document.querySelectorAll("tbody tr[data-campaign-row] td:first-child")].filter((td) => {
        const el = td.querySelector("span, a");
        const lh = parseFloat(getComputedStyle(el).lineHeight) || 20;
        return el.getBoundingClientRect().height > lh * 1.5;
      }).length;
      return table && scroller ? { over: table.scrollWidth - scroller.clientWidth, wrapped } : null;
    });
    ok(`${vp.name} · POPULATED · the table fits its card — no column past the edge — and no campaign name wraps`,
      fit !== null && fit.over <= 0 && fit.wrapped === 0, JSON.stringify(fit));
  }
  // ⭐ Since the validation audit (2026-10-03) a DRAFT's name reopens it in the composer — a page that EXISTS. What must
  // still never appear is a link into the campaign page U47 has not built: every name link goes to the composer, and
  // only a DRAFT row carries one.
  const nameLinks = await page.$$eval("tr[data-campaign-row] td:first-child a", (els) => els.map((a) => ({
    href: a.getAttribute("href") || "", draft: (a.closest("tr")?.textContent || "").toUpperCase().includes("DRAFT"),
  })));
  ok(`${vp.name} · POPULATED · no name links into a campaign page that does not exist yet (U47) — only DRAFT rows link, and only to the composer`,
    nameLinks.length > 0 && nameLinks.every((l) => l.draft && l.href.startsWith("/admin/campaigns/new?draft=")),
    JSON.stringify(nameLinks.slice(0, 4)));
  const draftRow = await textOfLoc(rowOf(page, "cmp_seed_19"));
  // ⚠️ The kit Chip is `uppercase` in CSS, and innerText returns the RENDERED case — chip words are matched case-blind.
  ok(`${vp.name} · POPULATED · an unnamed draft reads "Untitled campaign" and its audience "Not confirmed"`,
    !!untitled && draftRow.includes("Untitled campaign") && /draft/i.test(draftRow) && draftRow.includes("Not confirmed"), draftRow);
  const text = await mainText(page);
  ok(`${vp.name} · POPULATED · ⛔ no TZS, budget or estimate anywhere on the page (OD24)`, !/TZS|budget|estimate/i.test(text));
  ok(`${vp.name} · POPULATED · no horizontal page overflow (the table scrolls inside its card)`, (await overflowOf(page)) === 0, `${await overflowOf(page)}px`);
  await stateShot(page, vp.name, "populated", "Weekend kick-off");
  // (The table head is `uppercase` in CSS too, so the rows capture asserts a cell, not a header.)
  await stateShot(page, vp.name, "populated-rows", "Untitled campaign", CARD);

  // ── IN-PROGRESS ──────────────────────────────────────────────────────────────────────────────────────────────────
  const bar = rowOf(page, running.id).locator('[role="progressbar"]');
  const now = await bar.first().getAttribute("aria-valuenow").catch(() => null);
  const max = await bar.first().getAttribute("aria-valuemax").catch(() => null);
  const runningText = await textOfLoc(rowOf(page, running.id));
  ok(`${vp.name} · IN-PROGRESS · the RUNNING campaign's bar is DETERMINATE at the server's count: ${running.settled} of ${running.rows} (HELD rows still outstanding)`,
    (await bar.count()) === 1 && now === String(running.settled) && max === String(running.rows)
      && runningText.includes(`${nf.format(running.settled)} of ${nf.format(running.rows)} processed`) && /sending/i.test(runningText),
    `${now}/${max} · ${runningText.slice(0, 160)}`);
  const preparingText = await textOfLoc(rowOf(page, preparing.id));
  ok(`${vp.name} · IN-PROGRESS · the PREPARING campaign's bar counts rows written over the confirmed audience`,
    preparingText.includes(`${nf.format(preparing.rows)} of ${nf.format(preparing.audience)} prepared`) && /preparing/i.test(preparingText), preparingText.slice(0, 160));
  ok(`${vp.name} · IN-PROGRESS · a RUNNING campaign with no rows shows "—" and NO bar (never a 0 % bar)`,
    (await rowOf(page, emptyRunning.id).locator('[role="progressbar"]').count()) === 0 && (await textOfLoc(rowOf(page, emptyRunning.id))).includes("—"));
  // ⛔ U36 review F1: before the fix this row read "0 of 300 prepared" — a preparation that never began, painted as one.
  const cancelledText = await textOfLoc(rowOf(page, cancelledUnstarted.id));
  ok(`${vp.name} · IN-PROGRESS · a campaign confirmed then cancelled before it started shows "—" and NO bar (never "0 of ${nf.format(cancelledUnstarted.audience)} prepared")`,
    (await rowOf(page, cancelledUnstarted.id).locator('[role="progressbar"]').count()) === 0 && cancelledText.includes("—") && !cancelledText.includes("prepared"),
    cancelledText.slice(0, 160));
  const asOf = await textOfLoc(page.locator('[data-block="campaigns-asof"]'));
  ok(`${vp.name} · IN-PROGRESS · a row in flight says when the list was read, beside Refresh — the list does not poll`,
    /^As of [0-9]{2}:[0-9]{2} EAT/.test(asOf) && (await page.locator('[data-block="campaigns-asof"] button').count()) === 1, asOf);
  ok(`${vp.name} · IN-PROGRESS · the nav badge on SMS campaigns reads "3" (${vp.width >= 1024 ? "sidebar" : "drawer"})`, (await navBadge(page, vp.width)) === "3");
  console.log("     note: the seeded rows do not move — no pump exists until U44; the list is a snapshot with its read time.");
  await stateShot(page, vp.name, "in-progress", `${nf.format(running.settled)} of ${nf.format(running.rows)} processed`, CARD);

  // ── PAGE 2 — through the app's own pager link ──
  await page.locator('a[href*="page=2"]').first().click();
  await page.waitForURL((u) => u.searchParams.get("page") === "2", { timeout: 30000 });
  await page.waitForSelector(CARD, { timeout: 30000 });
  await wait(800);
  ok(`${vp.name} · PAGE 2 · the last two campaigns, and no "As of" line (nothing in flight on this page)`,
    (await rowIds(page)).join(",") === "cmp_seed_02,cmp_seed_01" && (await page.locator('[data-block="campaigns-asof"]').count()) === 0,
    (await rowIds(page)).join(","));
  await stateShot(page, vp.name, "populated-page-2", "Welcome back offer", CARD);

  // ── NO-MATCH — ?status=paused with no paused campaign ──
  await openCampaigns(page, "?status=paused");
  const nmChips = await railChips(page);
  const nmText = await mainText(page);
  ok(`${vp.name} · NO-MATCH · the rail is STILL drawn with Paused in force, "No paused campaigns" and Show all`,
    nmChips.length === 5 && nmChips.filter((c) => c.current === "page").map((c) => c.chip).join(",") === "status:paused"
      && nmText.includes("No paused campaigns") && (await page.getByRole("link", { name: "Show all" }).count()) === 1,
    `${nmChips.map((c) => c.chip + (c.current ? "*" : "")).join(",")} · ${nmText.slice(0, 160)}`);
  await stateShot(page, vp.name, "no-match", "No paused campaigns", CARD);
  await page.getByRole("link", { name: "Show all" }).first().click();
  await page.waitForURL((u) => !u.searchParams.has("status"), { timeout: 30000 });
  await page.waitForSelector("tr[data-campaign-row]", { timeout: 30000 });
  await wait(800);
  ok(`${vp.name} · NO-MATCH → SHOW ALL · the whole list is back, All in force`,
    (await rowIds(page)).length === 20 && (await railChips(page)).filter((c) => c.current === "page").map((c) => c.chip).join(",") === "status:");
  await ctx.close();
}

// ── REFUSED — a role without growth: the panel, no nav item, and no campaign count in its payload ───────────────────
{
  const growth = await staffCtx("GROWTH", "+255700003604", { width: 1280, height: 800 });
  const control = await payloads(growth.page, "/admin/campaigns");
  ok("REFUSED · CONTROL · GROWTH's page payload DOES carry the campaigns badge key with its count while attention is 3 — so its absence below is a finding",
    hasKeyWith(control.html, "3") && (!control.served || hasKeyWith(control.flight, "3")),
    `html ${hasKeyWith(control.html, "3")} · flight served ${control.served} · flight ${hasKeyWith(control.flight, "3")}`);
  await growth.ctx.close();
}
for (const [role, phone] of [["FINANCE", "+255700003605"], ["SUPPORT", "+255700003606"]]) {
  for (const vp of VIEWPORTS) {
    const { ctx, page } = await staffCtx(role, phone, { width: vp.width, height: vp.height });
    await openCampaigns(page);
    const text = await mainText(page);
    ok(`${vp.name} · REFUSED · ${role} gets the restricted panel titled "SMS campaigns" (Growth & marketing access) — no table, no rail`,
      (await heading(page)) === "SMS campaigns" && text.includes("Restricted") && text.includes("Growth & marketing access")
        && (await page.locator(CARD).count()) === 0 && (await page.locator(RAIL).count()) === 0, text.slice(0, 200));
    ok(`${vp.name} · REFUSED · ${role} has no SMS campaigns nav item anywhere in the page`, (await page.locator(NAV_ITEM).count()) === 0);
    const { html, flight, served } = await payloads(page, "/admin/campaigns");
    ok(`${vp.name} · REFUSED · ⛔ ${role}'s HTML (its inline flight data) and flight body carry NO campaigns key (the badge is read only for growth)`,
      html.length > 1000 && html.includes("__next_f") && !hasKey(html) && !hasKey(flight),
      `html ${hasKey(html)} · flight served ${served} · flight ${hasKey(flight)}`);
    await stateShot(page, vp.name, `refused-${role.toLowerCase()}`, "Growth & marketing access");
    await ctx.close();
  }
}

// ── PAUSED — the second seed: two paused rows, each reason in words ──────────────────────────────────────────────────
let paused;
{
  const { ctx, page } = await staffCtx("GROWTH", "+255700003607", { width: 1280, height: 800 });
  paused = await seed(page, "set=paused");
  ok("seed · two PAUSED campaigns join (24 in all), and attention rises to 4 — one has work left, one does not",
    paused.total === 24 && paused.rail.paused === 2 && paused.attention === 4, JSON.stringify({ total: paused.total, rail: paused.rail, attention: paused.attention }));
  await ctx.close();
}
const known = paused.fixtures.find((f) => f.stopReason === "BALANCE_FLOOR");
const unknown = paused.fixtures.find((f) => f.stopReason && f.stopReason !== "BALANCE_FLOOR");
for (const vp of VIEWPORTS) {
  const { ctx, page } = await staffCtx("GROWTH", "+255700003608", { width: vp.width, height: vp.height });
  await openCampaigns(page, "?status=paused");
  const knownText = await textOfLoc(rowOf(page, known.id).locator("[data-stop-reason]"));
  const unknownText = await textOfLoc(rowOf(page, unknown.id).locator("[data-stop-reason]"));
  ok(`${vp.name} · PAUSED · two rows; the credit floor in words, and an unknown key labelled as the engine's own — never the raw key alone`,
    (await rowIds(page)).length === 2 && knownText === known.stopSentence && !knownText.includes(known.stopReason)
      && unknownText === `Engine reason: ${unknown.stopReason}`, `"${knownText}" · "${unknownText}"`);
  ok(`${vp.name} · PAUSED · the nav badge now reads "4"`, (await navBadge(page, vp.width)) === "4");
  await stateShot(page, vp.name, "paused", "Engine reason:", CARD);
  await ctx.close();
}

// ── ERROR — the read fault: the rail kept with no counts, no badge ─────────────────────────────────────────────────────
for (const vp of VIEWPORTS) {
  const { ctx, page } = await staffCtx("GROWTH", "+255700003609", { width: vp.width, height: vp.height });
  await seed(page, "fault=1");
  try {
    await openCampaigns(page, "?status=sending");
    const text = await mainText(page);
    const chips = await railChips(page);
    ok(`${vp.name} · ERROR · a failed read says so inside the card — never a zero — and the table is gone`,
      text.includes("Couldn't load the SMS campaigns") && (await page.locator("tr[data-campaign-row]").count()) === 0, text.slice(0, 200));
    ok(`${vp.name} · ERROR · the rail is STILL drawn from the address — Sending in force — with NO counts`,
      chips.length === 5 && chips.every((c) => c.count === null) && chips.filter((c) => c.current === "page").map((c) => c.chip).join(",") === "status:sending",
      chips.map((c) => `${c.chip}=${c.count}${c.current ? "*" : ""}`).join(","));
    ok(`${vp.name} · ERROR · no nav badge — never "0"`, (await navBadge(page, vp.width)) === "");
    const errPayload = await payloads(page, "/admin/campaigns");
    ok(`${vp.name} · ERROR · the payload carries no campaigns key while the read fails`,
      errPayload.html.includes("__next_f") && !hasKey(errPayload.html) && !hasKey(errPayload.flight));
    await stateShot(page, vp.name, "error", "Couldn't load the SMS campaigns");
  } finally {
    await seed(page, "fault=0");
    await ctx.close();
  }
}

// ── REDUCED MOTION at 360 — identical renders: U36 adds no keyframe, token or duration ──────────────────────────────
// ⚖️ The bar's ONE motion is the kit's motion-safe width transition (progress-bar.tsx). Under reduce that class does not
// apply AND motion.css's universal clamp holds every transition at 0.01ms, which a browser reads back as 1e-05s — so
// "off" is: no width transition, and every duration at or under the clamp. Never a literal 0s (the first run of this
// drive asserted 0s and failed on the clamp itself). The no-preference read comes first and is the CONTROL: without it,
// "the transition is gone" also passes on a bar that never had one.
{
  const readFill = (page) => page.evaluate((id) => {
    const bar = document.querySelector(`tr[data-campaign-id="${id}"] [role="progressbar"]`);
    const inner = bar?.firstElementChild;
    if (!inner) return null;
    const cs = getComputedStyle(inner);
    return { prop: cs.transitionProperty, dur: cs.transitionDuration };
  }, running.id);
  const props = (fill) => fill.prop.split(",").map((p) => p.trim());
  const secs = (fill) => fill.dur.split(",").map((d) => parseFloat(d));
  {
    console.log(`${String.fromCharCode(10)}[u36] the motion control: no preference (360x780)`);
    const { ctx, page } = await staffCtx("GROWTH", "+255700003611", { width: 360, height: 780 });
    await openCampaigns(page);
    const fill = await readFill(page);
    ok("motion control · with no preference the bar's fill carries the kit's width transition", fill !== null && props(fill).includes("width") && secs(fill).some((s) => s >= 0.1), JSON.stringify(fill));
    await ctx.close();
  }
  console.log(`${String.fromCharCode(10)}[u36] prefers-reduced-motion: reduce (360x780)`);
  const { ctx, page } = await staffCtx("GROWTH", "+255700003610", { width: 360, height: 780 }, "reduce");
  ok("reduced-motion · the context really is reduced-motion", await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches));
  await openCampaigns(page);
  const fill = await readFill(page);
  ok("reduced-motion · the bar's fill carries no width transition and no duration over the clamp's 0.01ms", fill !== null && !props(fill).includes("width") && secs(fill).every((s) => s <= 0.00001), JSON.stringify(fill));
  await stateShot(page, "360x780", "reduced-in-progress", `${nf.format(running.settled)} of ${nf.format(running.rows)} processed`, CARD);
  await ctx.close();
}

await browser.close();
console.log(`${String.fromCharCode(10)}MEASURED ${JSON.stringify(measured)}`);
console.log(`${String.fromCharCode(10)}u36-campaigns-drive: ${pass} passed, ${fail} failed`);
console.log(`shots: ${SHOTS}`);
if (fail) process.exitCode = 1;
