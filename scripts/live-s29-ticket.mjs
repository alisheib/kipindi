/**
 * E-101 LIVE — click the ticket a real player sees, on production, and land ON THE ROW.
 *
 *   node scripts/live-s29-ticket.mjs
 *
 * ⛔ "THE ANCHOR ELEMENT EXISTS" IS NOT "THE PLAYER LANDED ON IT". `getElementById` returns a
 * node whether the browser scrolled to it or left it 4,000px below the fold, and a deep link
 * that lands at the top of the page is indistinguishable — to a source check — from the generic
 * href it replaced. So the assertion here is GEOMETRY: the anchored element's rect must be
 * inside the viewport. That is the same rule E-98 and E-100 arrived at from the other side.
 *
 * ⛔ AND IT MUST NOT PASS VACUOUSLY. No ticket link found ⇒ throw. A run that reports green
 * over an empty list is the shape of every check-that-lies in this campaign.
 *
 * Both product lines are driven, because the whole finding is that they go to DIFFERENT places:
 * proving one proves half.
 */
import { mkdirSync, readFileSync } from "node:fs";
import { BASE, SHOT, login, browser, recorder } from "./live/harness.mjs";

mkdirSync(SHOT, { recursive: true });

/**
 * ⛔ THE EXPECTATION COMES FROM THE DATABASE, NOT FROM THE PAGE. `scripts/s29-ticket-map.cjs`
 * writes `positionId → { line, path }` straight off the schema's relations, so this run
 * compares the browser against production's own rows rather than against itself.
 *
 * ⚠️ And the ticket is DISCOVERED, not demanded. The wallet paginates, so naming one position
 * up front made the first run throw on an account that holds three of them — the harness being
 * wrong about which page they were on, not the product being wrong.
 */
const EXPECT = JSON.parse(readFileSync(`${SHOT}/ticket-map.json`, "utf8"));
const SUBJECTS = [
  { who: "fleet:10", line: "UPDOWN" },
  { who: "alpha", line: "MARKET" },
];

const r = recorder("E-101 · the ticket link, driven on production");
const { b, ctx } = await browser({ viewport: { width: 1280, height: 900 } });

try {
  for (const s of SUBJECTS) {
    console.log(`
── ${s.line} · ${s.who} ──`);
    const fresh = await ctx.browser().newContext({ viewport: { width: 1280, height: 900 } });
    const page = await fresh.newPage();
    await login(page, s.who);
    // ⚠️ NOT `networkidle`. The wallet carries a 20s `RefreshPoller`, so the network never
    // goes idle and a 30s wait times out on a page that rendered in under a second — a
    // harness state that reads exactly like a broken wallet.
    await page.goto(`${BASE}/wallet`, { waitUntil: "domcontentloaded" });
    await page.locator("button[aria-expanded]").first().waitFor({ timeout: 40_000 });

    // Expand transaction rows until the one carrying THIS position id is open. The wallet
    // collapses details behind a click, so the ticket box does not exist until then.
    const rows = page.locator("button[aria-expanded]");
    const n = await rows.count();
    r.check(`${s.line} · the wallet renders expandable transactions`, n > 0, `${n} rows`);
    // ⚠️ EXPAND EVERY MONEY ROW AND LEAVE THEM OPEN. The first version clicked a row, queried,
    // and collapsed it again in the same tick — the React panel had not rendered yet, so it
    // reported "no ticket link in 8 rows" on a wallet where three were plainly there. A probe
    // that measures before the thing exists photographs an absence it created itself.
    // `aria-expanded` also matches an "add an email address" banner, so the indices shift as
    // panels open: filter to rows that carry an amount rather than trusting position.
    for (let i = 0; i < n; i++) {
      const txt = await rows.nth(i).innerText().catch(() => "");
      if (!/TZS/.test(txt)) continue;
      await rows.nth(i).click().catch(() => {});
      await page.waitForTimeout(250);
    }
    // ⛔ Scope to the ticket LINK, not to the page. A `href*=positions` match would also hit the
    // bottom nav and the avatar menu, and a page-wide selector cannot tell "my control" from "a
    // control" (standards §5b.4). The trailing slash in `^=/positions/` is load-bearing: it
    // excludes the LIST, which is precisely the href this finding removed.
    let link = null, positionId = null;
    const cands = page.locator(`a[href^="/positions/"]`);
    for (let i = 0, c = await cands.count(); i < c; i++) {
      const href = await cands.nth(i).getAttribute("href");
      const pid = (href ?? "").slice("/positions/".length);
      // Only accept a ticket the DATABASE knows about, so a stray link cannot pass this run.
      if (EXPECT[pid]?.line === s.line) { link = cands.nth(i); positionId = pid; break; }
    }
    // ⚠️ WHEN THE WALLET'S FIRST PAGE HOLDS NO TICKET OF THIS LINE, DRIVE THE PERMALINK ITSELF
    // AND SAY SO. The wallet paginates and alpha's long-form position is from 4 August, pages
    // back. Clicking through pagination would test the pager, not this finding — and silently
    // skipping the MARKET leg would leave half the defect unproven while the run looked green.
    // ⛔ What is NOT skipped is the wallet's own href: that is one shared line of code and the
    // UPDOWN leg above exercises it. What differs per product line is the RESOLVER and the
    // destination's anchor, and navigating the permalink tests exactly those.
    let via = "the wallet's TICKET box";
    if (!link) {
      positionId = Object.keys(EXPECT).find((k) => EXPECT[k].line === s.line && EXPECT[k].phone.endsWith(s.who === "alpha" ? "712000101" : ""));
      if (!positionId) throw new Error(`no ${s.line} ticket exists for ${s.who} in the DB map — refusing to report on something I cannot drive`);
      via = "the permalink route directly (no ticket of this line on wallet page 1)";
      r.note(`⚠️ ${s.line}: ${via}`);
    }

    const expect = EXPECT[positionId];
    if (link) {
      // ⛔ NOT `check(name, true)` — the first version of this line was literally that, a check
      // that cannot fail, which is the anti-pattern this whole campaign keeps paying for. The
      // real claim is that the href names a POSITION rather than the list, so assert that.
      const href = await link.getAttribute("href");
      r.check(`${s.line} · ⭐ the TICKET box links to THIS position, not to a list`,
        href === `/positions/${positionId}` && positionId.startsWith("pos_"), `href=${href}`);
    }
    r.check(`${s.line} · the ticket under test is the product line under test`,
      expect.line === s.line, `db says ${expect.line}`);
    const expectPath = expect.path;
    r.note(`ticket ${positionId} · via ${via} · the DB says it lives at ${expectPath}`);

    if (link) {
      await link.scrollIntoViewIfNeeded();
      await link.locator("..").screenshot({ path: `${SHOT}/s29-e101-${s.line}-ticketbox.png` }).catch(() => {});
      await Promise.all([page.waitForURL(/\/(updown|markets)\//, { timeout: 30_000 }), link.click()]);
    } else {
      await page.goto(`${BASE}/positions/${positionId}`, { waitUntil: "domcontentloaded" });
    }
    await page.waitForTimeout(1500);

    const url = new URL(page.url());
    r.check(`${s.line} · ⭐ it resolves to the surface that RENDERS the position`,
      url.pathname === expectPath, `landed on ${url.pathname}, db says ${expectPath}`);
    r.check(`${s.line} · …carrying the position id as the fragment`,
      url.hash === `#${positionId}`, `hash=${url.hash}`);
    // 🔴 THE ONE THAT MATTERS: /positions is MARKET-only, so an Up & Down ticket landing there
    // is the defect itself — a page that structurally cannot contain the bet.
    r.check(`${s.line} · ⛔ it did NOT land on the generic list`,
      !url.pathname.startsWith("/positions"), url.pathname);

    // ── LAND ON THE ROW — geometry, never presence ────────────────────────────────────
    const geo = await page.evaluate((id) => {
      const el = document.getElementById(id);
      if (!el) return { found: false };
      // The anchor on the Up & Down side is a zero-height span, so measure the CARD it marks.
      const box = el.getBoundingClientRect().height > 0 ? el : (el.closest(".ticket-scope") ?? el);
      const rect = box.getBoundingClientRect();
      const cs = getComputedStyle(box);
      // ⛔ "IN THE VIEWPORT" CAN BE TRUE WITHOUT ANYTHING HAVING SCROLLED, and on the first run
      // that is exactly what happened: the Up & Down panel sat above the fold, so the check
      // passed at `scrollY 0` while the market page — same code, same anchors — left the row
      // 166px below it. So record where the row is in the DOCUMENT, and let the caller demand a
      // scroll whenever the row is below the first screen.
      const absTop = rect.top + scrollY;
      return {
        found: true,
        inViewport: rect.top >= -4 && rect.top < innerHeight && rect.bottom > 0,
        belowFirstScreen: absTop > innerHeight,
        absTop: Math.round(absTop),
        top: Math.round(rect.top), height: Math.round(rect.height),
        scrollY: Math.round(scrollY),
        // ⛔ Never regex a CSS colour — but a box-shadow's PRESENCE is a safe string test, and
        // that is all the :target ring needs to be proven applied rather than merely written.
        ring: cs.boxShadow && cs.boxShadow !== "none",
        boxShadow: (cs.boxShadow || "").slice(0, 80),
      };
    }, positionId);

    r.check(`${s.line} · ⭐ the destination RENDERS an element with that id`, geo.found === true);
    r.check(`${s.line} · ⭐⭐ …and the player LANDS ON IT — the row is inside the viewport`,
      geo.inViewport === true, `top=${geo.top} height=${geo.height} scrollY=${geo.scrollY} absTop=${geo.absTop}`);
    // ⛔ THE NON-VACUOUS HALF. If the row sits below the first screen, arriving on it REQUIRES a
    // scroll — so `scrollY` must have moved. A row that happens to be above the fold proves
    // nothing about the deep link, and reporting it as proof is how E-101 shipped half-working.
    r.check(`${s.line} · …and where a scroll was REQUIRED, one happened`,
      !geo.belowFirstScreen || geo.scrollY > 0,
      geo.belowFirstScreen ? `row at absTop=${geo.absTop} but scrollY=${geo.scrollY} — the browser never scrolled` : "row was already on the first screen");
    r.check(`${s.line} · the row is visibly marked, so they can see which one they came for`,
      geo.ring === true, geo.boxShadow);

    await page.locator("main, body").first().screenshot({ path: `${SHOT}/s29-e101-${s.line}-landed.png` }).catch(() => {});
    r.note(`shot → ${SHOT}/s29-e101-${s.line}-landed.png · scrollY=${geo.scrollY}`);
    await page.close();
    await fresh.close();
  }
} finally {
  await b.close();
}

process.exit(r.done() ? 1 : 0);
