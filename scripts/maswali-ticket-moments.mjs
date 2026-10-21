/**
 * qa:maswali-ticket-moments — A TICKET'S MOMENTS PLAY WHERE ITS OWNER CAN SEE THEM, ONCE (MASWALI-BUILD S5-DESIGN-TICKETS;
 * the R1 tickets critic's M8 and the motion critic's H3, H4 and L2).
 *
 *   BASE=http://localhost:3570 node scripts/maswali-ticket-moments.mjs
 *
 * ⚠️ PREMISE: a FRESH in-memory `next dev` as `qa:maswali-ticket-shots` asks (FEATURE_MILLIONEA=ACTIVE, the Millionea tick
 *    off). The drive seeds the chain itself (`/api/dev-test/seed-maswali-tickets`, step "weeks") or, on a server the shots
 *    already seeded, reads it back (step "info"); it buys its own fresh tickets (step "fresh").
 * Asserted in a real browser, by value:
 *   1 · the cut waits for its stub: on a fresh ticket the stub's moment is unplayed and its animation PAUSED at its first
 *       frame while the stub is below the fold; scrolled into view it plays (`data-mln-played`, running)
 *   2 · the seen mark waits for the moment: a view that never scrolled to the stub leaves the cut unseen (it plays again on
 *       the next view); a view that saw it plays it no more
 *   3 · H4 · the free cancel's result survives the page's refresh: the result dialog stays up after the cancel's refresh
 *       until the player closes it, over the ticket now at rest; the undo plays when the stub comes into view
 *   4 · L2 · the live count dips and lands once when a result arrives (`.m-tick` on the new count, never on the first paint)
 *   5 · under the OS reduced-motion preference nothing waits and nothing moves: the stub is its end frame from the start
 * Frames: `.50pick-shots/maswali-ticket-moments/` (the cut before, during and after its play; the result after refresh).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { premise, demoSession, LOCALE_COOKIE } from "./live/journey-pass.mjs";

const BASE = process.env.BASE || "http://localhost:3570";
const OUT = process.env.MLN_OUT || ".50pick-shots/maswali-ticket-moments";
let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };
const pre = await premise(BASE);
if (pre.refuse) { console.error(`PREMISE ABSENT — ${pre.refuse}`); process.exit(2); }
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const session = await demoSession(browser, BASE);
const api = await browser.newContext();
const seed = async (data) => {
  const r = await api.request.post(`${BASE}/api/dev-test/seed-maswali-tickets`, { data, timeout: 300_000 });
  const body = await r.json().catch(() => null);
  if (!r.ok() || !body?.ok) throw new Error(`seed ${JSON.stringify(data)}: ${r.status()} ${JSON.stringify(body)}`);
  return body;
};
// The chain the shots seeded on this server — or, on a fresh server of its own, the chain seeded now (a held share holds
// the wallet, so a run after the shots' last state could not buy the fresh tickets this drive needs).
const info = await seed({ step: "info" }).catch(() => seed({ step: "weeks" }));
const ctxOf = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, ...opts });
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: "sw", url: BASE }, { ...session, url: BASE, domain: undefined, path: undefined }]);
  return ctx;
};
const open = async (page, serial) => {
  await page.goto(`${BASE}/millionea/tickets/${encodeURIComponent(serial)}`, { waitUntil: "load", timeout: 180_000 });
  await page.waitForLoadState("networkidle", { timeout: 2_000 }).catch(() => {});
  await page.waitForFunction(() => document.fonts.ready.then(() => true), null, { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(600);
};
/** The stub's moment: its wrapper's played state and the cut's own animation state. */
const stubState = (page) => page.evaluate(() => {
  const cut = document.querySelector(".maswali-cut, .maswali-cut-undo");
  const wrap = cut?.closest("[data-mln-moment]");
  const a = cut ? cut.getAnimations()[0] : null;
  return { hasCut: !!cut, wrapped: !!wrap, played: !!wrap?.hasAttribute("data-mln-played"), playState: a?.playState ?? null, currentTime: a ? Number(a.currentTime) : null, top: cut?.getBoundingClientRect().top ?? null };
});

// ── 1 + 2 · the cut waits for its stub; the seen mark waits for the cut ──────────────────────────────────────────────
{
  const { serial } = await seed({ step: "fresh" });
  const ctx = await ctxOf();
  const page = await ctx.newPage();
  await open(page, serial);
  const before = await stubState(page);
  ok("1.1 · a fresh ticket's stub carries the cut, wrapped in its moment, unplayed and PAUSED at its first frame below the fold",
    before.hasCut && before.wrapped && !before.played && before.playState === "paused" && (before.currentTime ?? 1) === 0 && (before.top ?? 0) > 780, JSON.stringify(before));
  await page.screenshot({ path: `${OUT}/cut-sw-360-before.png` });
  // Leave without scrolling: the next view must play the cut again (the seen mark waited for it).
  await page.waitForTimeout(1_500);
  await open(page, serial);
  const again = await stubState(page);
  ok("2.1 · a view that never reached the stub leaves the cut unseen: the next view carries it again", again.hasCut && again.wrapped && !again.played, JSON.stringify(again));
  // Now scroll the stub into view: it plays.
  await page.evaluate(() => document.querySelector(".maswali-cut")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(60);
  const during = await stubState(page);
  await page.screenshot({ path: `${OUT}/cut-sw-360-during.png` });
  ok("1.2 · scrolled into view, the cut plays (`data-mln-played`, running or finished)", during.played && (during.playState === "running" || during.playState === "finished" || during.playState === null), JSON.stringify(during));
  await page.waitForTimeout(1_200);
  await page.screenshot({ path: `${OUT}/cut-sw-360-after.png` });
  await page.waitForTimeout(800);
  await open(page, serial);
  const seen = await stubState(page);
  ok("2.2 · once seen, the cut is put to rest: the next view draws the stub at its end frame, no moment", !seen.hasCut, JSON.stringify(seen));
  await ctx.close();
}

// ── 3 · H4 · the cancel's result survives the refresh; the undo plays on view ─────────────────────────────────────────
{
  const { serial } = await seed({ step: "fresh" });
  const ctx = await ctxOf();
  const page = await ctx.newPage();
  await open(page, serial);
  // See the cut first, so the undo is the only moment the cancel leaves.
  await page.evaluate(() => document.querySelector(".maswali-cut")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(1_500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByTestId("millionea-ticket-cancel").getByRole("button").click();
  const dialog = page.getByRole("alertdialog");
  await dialog.waitFor({ timeout: 10_000 });
  await dialog.getByRole("button", { name: /Ghairi tiketi/ }).click();
  const result = page.getByText(/Tiketi imeghairiwa/).first();
  const shown = await result.waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(2_500); // the cancel's own refresh has landed by now
  await page.screenshot({ path: `${OUT}/cancel-result-sw-360-after-refresh.png` });
  const stillUp = await result.isVisible().catch(() => false);
  // The ticket's own state chip under the dialog ("Imeghairiwa" alone — the result's title "Tiketi imeghairiwa" is not it).
  const rested = await page.getByText("Imeghairiwa", { exact: true }).first().isVisible().catch(() => false);
  ok("3.1 · H4 · the cancel's result is up and STAYS up after the page's refresh, over the ticket now at rest", shown && stillUp && rested, JSON.stringify({ shown, stillUp, rested }));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  const undoBefore = await stubState(page);
  await page.evaluate(() => document.querySelector(".maswali-cut-undo")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(60);
  const undo = await stubState(page);
  ok("3.2 · the stub's return (N3 reversed) waits below the fold and plays when it comes into view",
    undoBefore.hasCut && !undoBefore.played && undo.played, JSON.stringify({ undoBefore, undo }));
  await ctx.close();
}

// ── 4 · L2 · the live count dips and lands on a change ───────────────────────────────────────────────────────────────
{
  const ctx = await ctxOf();
  const page = await ctx.newPage();
  const serial = info.tickets.resultsAlive;
  await open(page, serial);
  const live = page.getByTestId("millionea-ticket-live");
  const first = await live.innerText();
  const tickedFirst = await page.evaluate(() => !!document.querySelector('[data-testid="millionea-ticket-live"] .m-tick'));
  await seed({ step: "seal", week: info.weeks.results, slot: 5, outcome: "YES" });
  await page.evaluate(() => window.dispatchEvent(new Event("50pick:refresh")));
  await page.waitForFunction((was) => document.querySelector('[data-testid="millionea-ticket-live"]')?.textContent !== was, first, { timeout: 30_000 }).catch(() => {});
  const second = await live.innerText();
  const ticked = await page.evaluate(() => document.querySelectorAll('[data-testid="millionea-ticket-live"] .m-tick').length);
  ok("4.1 · L2 · the count ticks once when a result arrives, and never on the first paint", !tickedFirst && second !== first && ticked === 1, JSON.stringify({ first, second, ticked, tickedFirst }));
  await ctx.close();
}

// ── 5 · reduced motion: nothing waits, nothing moves ─────────────────────────────────────────────────────────────────
{
  const { serial } = await seed({ step: "fresh" });
  const ctx = await ctxOf({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await open(page, serial);
  const s = await page.evaluate(() => {
    const cut = document.querySelector(".maswali-cut");
    const perf = document.querySelector(".m-axis-reveal");
    return { cut: cut ? getComputedStyle(cut).animationName : null, perfClip: perf ? getComputedStyle(perf).clipPath : null };
  });
  ok("5.1 · under reduced motion the stub is its end frame from the start (the N-block's `animation: none`, the reveal's end)", s.cut === "none" && (s.perfClip === "none" || /160%/.test(s.perfClip ?? "")), JSON.stringify(s));
  await ctx.close();
}

await browser.close();
console.log(`\nmaswali-ticket-moments: ${pass} passed, ${fail} failed · frames in ${OUT}/`);
process.exit(fail === 0 ? 0 : 1);
