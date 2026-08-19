/**
 * E-166 · E2E — a REAL settle, held, ticked, and handed over. Both surfaces.
 *
 *   LIVE_BASE=http://localhost:3011 SHOT_DIR=.50pick-shots/handover node scripts/live-updown-handover.mjs
 *   (npm run qa:updown-handover)
 *
 * ⛔ NOTHING HERE IS A FIXTURE. Every round is created and settled by the production service
 * functions through `/api/dev-test/updown-handover`, which only moves the CHAIN's next boundary
 * and injects `advanceChain`'s own `now` — the round rows' instants are never touched, because
 * `ROUND_PATCHABLE` refuses them and that refusal is a money guard.
 *
 * ⭐ THE SHAPE IT REPRODUCES IS THE MEASURED ONE. On production the successor is born 0.1s after
 * its predecessor settles, with an `opensAt` ~91s already in the past (1,186 of 1,203 settles in
 * 24h). `arm` opens a round almost all of whose window is already spent; the driver waits out
 * the last `LEAD` seconds — a REAL open · locked · closed sequence, not a shortcut — and then
 * one `settle` closes it and opens a successor whose `opensAt` is that same, now-past instant.
 *
 * ── WHAT IT REFUSES TO DO ───────────────────────────────────────────────────────────────────
 * ⛔ It THROWS when a premise is absent rather than reporting green over an empty page
 * (standards §5b.5). No live card, no settled card, no successor id → the run fails loudly.
 * ⛔ Every selector is scoped to the CARD or the BAR under test (§5b.4). A page-wide match
 * cannot tell "my control" from "a control", and this page has several of each.
 * ⛔ It asserts VALUES: the round id in the URL, the outcome word, the absence of `00:00`.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.LIVE_BASE ?? "http://localhost:3011";
const SHOT = process.env.SHOT_DIR ?? ".50pick-shots/handover";
const DUR = 3;                       // the shortest chain the platform offers → span 4 minutes
mkdirSync(SHOT, { recursive: true });

let pass = 0; const fails = [];
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const die = (why) => { console.error(`\n🔴 PREMISE ABSENT — ${why}\n   Refusing to report a result over a page that cannot show one.`); process.exit(2); };

const post = async (path, body) => {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}),
  });
  const text = await r.text();
  if (!r.ok) die(`${path} → HTTP ${r.status} ${text.slice(0, 200)}`);
  try { return JSON.parse(text); } catch { die(`${path} returned non-JSON: ${text.slice(0, 200)}`); }
};

/** Collapsed, lower-cased text — Chrome applies `text-transform`, so a CSS-uppercased caption
 *  reads "NEXT MATCH LIVE" while the dictionary says "Next match live". Never compare raw. */
const txt = async (loc) => (await loc.innerText()).replace(/\s+/g, " ").trim().toLowerCase();

const shot = async (page, name) => { await page.screenshot({ path: `${SHOT}/${name}.png`, fullPage: true }); console.log(`     ▸ ${SHOT}/${name}.png`); };

/** Seconds a freshly armed round has left before its close. Short, but REAL — see the endpoint. */
const LEAD = 80;

/**
 * WHICH ROUND IS THIS PAGE ON — the last path segment, never a substring of the whole URL.
 *
 * ⛔ The handover writes `?from=<the round we left>`, so `url.includes(oldRoundId)` stays TRUE
 * on the page it navigated TO. The first run of this driver reported a perfectly working resume
 * as a failure for exactly that reason. A harness that cannot tell the destination from the
 * provenance is a harness that will one day accuse the product of a bug it does not have.
 */
const onRound = (p) => new URL(p.url()).pathname.split("/").filter(Boolean).pop();

/** Arm a round that closes `LEAD` seconds from now, and hand back its instants. */
async function arm() {
  const r = await post("/api/dev-test/updown-handover", { phase: "arm", leadSeconds: LEAD });
  const round = r.out?.find((o) => o.durationMinutes === DUR)?.round;
  if (!round?.id) die(`arm produced no round: ${JSON.stringify(r.out?.slice(0, 2))}`);
  return round;
}

/**
 * Wait until an instant has genuinely passed, then settle.
 *
 * ⛔ NOT A FIXED `sleep`. The close is a real instant on the server's clock and the bar that
 * settles it does not exist before it — settling early would return `pending` and the run would
 * report a broken product over a harness that asked too soon.
 */
async function waitPast(iso, label) {
  const left = Date.parse(iso) - Date.now();
  if (left > 0) { console.log(`  waiting ${Math.ceil(left / 1000)}s for ${label}…`); await new Promise((r) => setTimeout(r, left + 1500)); }
}

(async () => {
  console.log(`\n── 0 · stand up a real chain on ${BASE} ──`);
  // `mock-bars` gives a DIFFERENT price per boundary, so rounds DECIDE. The default `mock` quotes
  // one constant per symbol and every round would void on no-move — a green run about nothing.
  await post("/api/dev-test/updown-seed", { durations: [DUR], feedProvider: "mock-bars" });
  const armed = await arm();
  const R1 = armed.id;
  console.log(`  round 1 = ${R1}  opens ${armed.opensAt}  closes ${armed.closesAt}`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

  // ── 1 · the round page, BEFORE the settle. This is what seeds the observed-transition gate.
  console.log("\n── 1 · the round page while the result is still landing ──");
  await page.goto(`${BASE}/updown/${R1}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(1500);
  const bodyBefore = await txt(page.locator("body"));
  ok("1.1 the page is on round 1", onRound(page) === R1, page.url());
  ok("1.2 ⛔ and it is NOT already settled — the handover must fire on an OBSERVED transition, "
    + "so a run that starts settled proves nothing",
    !bodyBefore.includes("round settled"), "page already reads 'round settled'");
  ok("1.3 no handover bar yet — nothing has happened", !bodyBefore.includes("already under way"));
  const histBefore = await page.evaluate(() => history.length);
  await shot(page, "01-round-awaiting-1280");

  // ── 2 · SETTLE. One call: closes round 1, opens round 2 already-live. The production shape.
  console.log("\n── 2 · settle round 1 — and watch the page hand over by itself ──");
  await waitPast(armed.closesAt, "round 1 to reach its close");
  const settled = await post("/api/dev-test/updown-handover", { phase: "settle" });
  const chain = settled.out?.find((o) => o.durationMinutes === DUR);
  // ⛔ THE IDS THE ENDPOINT ACTED ON, not a guess from a list. See its own comment: the store can
  // carry rounds from an earlier run whose BOUNDARY sorts newer than this run's.
  const r1 = chain?.closed, r2 = chain?.opened;
  if (r1?.id !== R1) die(`settle acted on ${r1?.id}, not the round this run armed (${R1})`);
  if (!r1?.resolvedAt) die(`round 1 did not settle: ${JSON.stringify(chain?.result)}`);
  if (!r2) die(`no successor was opened: ${JSON.stringify(chain?.result)}`);
  const R2 = r2.id;
  console.log(`  round 1 resolved ${r1.resolvedAt} outcome ${r1.outcome}`);
  console.log(`  round 2 = ${R2} opens ${r2.opensAt}`);
  ok("2.1 ⭐ THE MEASURED PRODUCTION SHAPE · the successor opens exactly where its predecessor "
    + "closed, and that instant is already in the past",
    r2.opensAt === r1.closesAt && Date.parse(r2.opensAt) <= Date.now(),
    `opens ${r2.opensAt} vs closes ${r1.closesAt}`);

  // Poll the DOM and record WHEN each thing first appears — an ordering assertion, not a race.
  // ⛔ `null` IS THE SENTINEL, NOT `0`. A thing genuinely first seen on the opening iteration has
  // an elapsed time of 0, and with 0 as "never seen" that is indistinguishable from absence —
  // the first run of this driver reported `bar +0` and it was ambiguous which had happened.
  const seenAt = { result: null, bar: null, url: null };
  const t0 = Date.now();
  while (Date.now() - t0 < 45_000) {
    if (seenAt.url == null && onRound(page) === R2) { seenAt.url = Date.now() - t0; break; }
    const b = await txt(page.locator("body")).catch(() => "");
    if (seenAt.result == null && /up wins|down wins|round settled|refund/.test(b)) seenAt.result = Date.now() - t0;
    if (seenAt.bar == null && /already under way|next match|no next match/.test(b)) seenAt.bar = Date.now() - t0;
    await page.waitForTimeout(120);
  }
  console.log(`  observed: result +${seenAt.result}ms · handover +${seenAt.bar}ms · redirect +${seenAt.url}ms`);
  ok("2.2 ⭐ THE RESULT ARRIVED ON THE SCREEN with no reload — E-102's promise, still kept",
    seenAt.result != null, "the settle never reached the page");
  ok("2.3 ⭐ THE PAGE HANDED OVER BY ITSELF — no reload, no dead end", seenAt.url != null,
    `still on ${page.url()}`);
  // ⛔ THE ORDER IS THE FEATURE. The result is on screen first; the move comes after. A redirect
  // that beats the result is the "yanked off my win" failure this whole hold exists to prevent.
  ok("2.4 ⭐ …and IN ORDER: the result was on screen BEFORE the page moved",
    seenAt.result != null && seenAt.url != null && seenAt.url > seenAt.result,
    `result +${seenAt.result} url +${seenAt.url}`);
  // ⚠️ THE TICKER IS CORRECTLY INSTANTANEOUS HERE, AND THAT IS NOT A GAP. When the successor is
  // already open — 98.6% of real settles — there is nothing to tick to, so the hold ends and the
  // navigation fires in the same frame; the pod's handover state may never be painted at all.
  // The ticker earns its place when there IS something to wait for (`counting` / `waiting` /
  // `unavailable`) or when the move is deferred, and §5.2 is the check that covers that.
  // So this asserts a CONSISTENCY, not a duration: if the bar was seen, it was in the right place.
  ok("2.5 ⛔ if the handover bar was painted at all, it was after the result and not after the move",
    seenAt.bar == null || (seenAt.bar >= seenAt.result && seenAt.bar <= seenAt.url),
    `result +${seenAt.result} bar +${seenAt.bar} url +${seenAt.url}`);
  // ⛔ AND THE HOLD IS REAL, MEASURED ON THE SCREEN. This is the check that caught the
  // effect-ordering defect on the first run: the redirect fired **155ms** after the result
  // appeared, because the hold was computed one commit too late and read as already spent.
  //
  // ⚠️ WHAT IS MEASURED IS A LOWER BOUND, AND THE THRESHOLD RESPECTS THAT. The hold starts at the
  // RENDER that first carries the result; this loop cannot see it until that render has painted
  // and the next 120ms poll comes round, so the observed gap is systematically short of
  // `HANDOVER_HOLD_MS` — 2,091ms against a 2,500ms hold on the run that set this number. A tight
  // threshold would make the suite flaky about latency rather than strict about the product, so
  // it is set where it still separates a real hold from the 155ms defect by an order of
  // magnitude, and no tighter.
  ok("2.6 ⭐ THE RESULT WAS HELD — the player had the beat before the screen moved",
    seenAt.result != null && seenAt.url != null && seenAt.url - seenAt.result >= 1_500,
    `only ${seenAt.url - seenAt.result}ms between the result appearing and the redirect`);

  await page.waitForTimeout(1200);
  await shot(page, "02-round-after-handover-1280");

  // ── 3 · where the player LANDED.
  console.log("\n── 3 · the round the player was handed to ──");
  ok("3.1 ⭐ the page IS the successor (path, not a substring — `?from=` carries the old id)",
    onRound(page) === R2, page.url());
  ok("3.2 ⭐ …and it carries `?from=` so the last result travels with them",
    page.url().includes(`from=${R1}`), page.url());
  const histAfter = await page.evaluate(() => history.length);
  // ⛔ `replace`, not `push` — a chain emits a round every few minutes for ever, and `push` would
  // make Back walk the player backwards through dead rounds one at a time.
  ok("3.3 ⭐ the back-stack did NOT grow — `replace`, never `push`",
    histAfter === histBefore, `${histBefore} → ${histAfter}`);
  const body3 = await txt(page.locator("body"));
  ok("3.4 ⭐ THE RESULT WAS NOT STOLEN — the last-round strip names the outcome",
    body3.includes("last round") || body3.includes("raundi iliyopita"), "no last-round strip");
  const outWord = r1.outcome === "UP" ? "up wins" : r1.outcome === "DOWN" ? "down wins" : "void";
  ok("3.5 ⭐ …and it names the RIGHT outcome, read from the database",
    body3.includes(outWord), `expected "${outWord}"`);
  ok("3.6 ⛔ the old round's URL is still valid for ever — nothing was hidden",
    (await (await ctx.newPage()).goto(`${BASE}/updown/${R1}`)).status() === 200);
  // ⛔ E-99 rule 3, on the surface that was breaking it on production this morning.
  ok("3.7 ⭐ NO DEAD `00:00` anywhere on the page", !body3.includes("00:00"), "a dead 00:00 is on screen");
  await shot(page, "03-successor-with-strip-1280");

  // ── 4 · the BOARD.
  console.log("\n── 4 · the board: the settled card names what comes next ──");
  await page.goto(`${BASE}/updown?asset=BTC&d=${DUR}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(4000);   // past the hold
  const cards = page.locator("article.mcardp");
  const n = await cards.count();
  if (n < 2) die(`the board shows ${n} card(s); the handover needs the live round AND the settled one`);
  // ⛔ FIND THE SETTLED CARD, NEVER ASSUME SLOT 1. The board renders `[current, justClosed,
  // lastDone]` and `justClosed` is real — a round that has closed and is still reading its price
  // legitimately sits between them, making THREE cards. This driver asserted `nth(1)` and, the
  // first time a leftover confirming round appeared, reported the handover broken while it was
  // working two slots down. The live round IS always first; the settled one has to be located.
  const live = cards.nth(0);
  const done = cards.filter({ hasText: /resolved|imekamilika|已结算|void|batili/i }).first();
  if (await done.count() === 0) die(`no settled card on a board of ${n} — the handover has nothing to describe`);
  const liveTxt = await txt(live), doneTxt = await txt(done);
  ok("4.1 ⭐ the LIVE round took the first slot", liveTxt.includes("live ·"), liveTxt.slice(0, 70));
  ok("4.2 ⭐ the settled card no longer says CLOSED — closed is not a result",
    !doneTxt.includes("closed ·"), doneTxt.slice(0, 70));
  ok("4.3 ⭐ …it says what actually happened", /resolved|void|imekamilika|已/.test(doneTxt), doneTxt.slice(0, 70));
  ok("4.4 ⭐ and its pod is the HANDOVER, not a frozen clock",
    /next match|mechi ijayo|下一场/.test(doneTxt), doneTxt.slice(0, 120));
  ok("4.5 ⛔ with NO dead 00:00 on the settled card", !doneTxt.includes("00:00"), doneTxt.slice(0, 120));
  // ⛔ SCOPED TO THE SETTLED CARD. A page-wide link check would match the live card's own chrome.
  const go = done.locator("button", { hasText: /go to it|nenda|前往/i });
  ok("4.6 ⭐ the settled card offers a way to the next match", await go.count() > 0);
  await shot(page, "04-board-handover-1280");

  // ── 5 · the DEFERRAL. A handover must never move a player mid-decision.
  console.log("\n── 5 · an open overlay defers the handover ──");
  // A fresh unsettled round to sit on, so the observed-transition gate is seeded again.
  const arm3 = await arm();
  const R3 = arm3.id;
  const p2 = await ctx.newPage();
  await p2.goto(`${BASE}/updown/${R3}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  // ⛔ FRONT THE TAB, OR 5.1 PASSES FOR THE WRONG REASON — and it did, on the first run.
  // Chrome throttles `setInterval` in a hidden tab, and every phase in this feature is driven by
  // a one-second clock, so a BACKGROUND tab does not hand over whether or not an overlay is up.
  // "It did not navigate" would then have proved nothing about the overlay gate. A player
  // closing a modal is by definition looking at the page, so the test looks at it too.
  await p2.bringToFront();
  await p2.waitForTimeout(1200);
  // ⛔ SET THE REAL LOCK, the one `useModalLock` sets — not a flag invented for the test. If the
  // product ever stops using `body.style.overflow`, this check must break, not quietly pass.
  await p2.evaluate(() => { document.body.style.overflow = "hidden"; });
  await waitPast(arm3.closesAt, "round 3 to reach its close");
  await post("/api/dev-test/updown-handover", { phase: "settle" });
  await p2.waitForTimeout(14_000);
  ok("5.1 ⭐ WITH AN OVERLAY OPEN the page did NOT navigate — a stake sheet is a decision in "
    + "flight, and half the decisions here are about money",
    onRound(p2) === R3, p2.url());
  const deferTxt = await txt(p2.locator("body"));
  ok("5.2 ⛔ …but it still SAYS what is next, so the deferral is not a new dead end",
    /next match|mechi ijayo|下一场/.test(deferTxt), deferTxt.slice(0, 140));
  await shot(p2, "05-deferred-by-overlay-1280");
  // Release it — the handover must resume, not be cancelled.
  await p2.evaluate(() => { document.body.style.overflow = ""; });
  await p2.waitForTimeout(9_000);
  // ⛔ COMPARE THE PATH, NEVER THE WHOLE URL. The handover writes `?from=<the round we left>`,
  // so `url.includes(R3)` is TRUE on the page we navigated TO — this check reported a working
  // resume as a failure on its first run, which is a harness lying about the product.
  ok("5.3 ⭐ and the moment the overlay closes it RESUMES — deferred, never cancelled",
    onRound(p2) !== R3, p2.url());
  await shot(p2, "06-resumed-after-overlay-1280");

  // ── 6 · A PLAYER READING THEIR PROOF IS NOT MOVED ────────────────────────────────────────
  console.log("\n── 6 · scrolled into the settlement proof — the handover waits ──");
  const arm4 = await arm();
  const R4 = arm4.id;
  // ⛔ A SHORT VIEWPORT, DELIBERATELY. A round still reading its price has no settlement proof
  // yet, so at 1400px tall the page does not scroll at all and `scrollTo(0, 600)` silently
  // clamps to 0 — which is how the first run of this check reported the gate broken while it
  // was simply never engaged. 700px is a real phone-shaped window and the page scrolls in it.
  const shortCtx = await browser.newContext({ viewport: { width: 1280, height: 700 } });
  const p3 = await shortCtx.newPage();
  await p3.goto(`${BASE}/updown/${R4}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await p3.bringToFront();               // a hidden tab does not hand over at all — see §5
  await p3.waitForTimeout(1200);
  await waitPast(arm4.closesAt, "round 4 to reach its close");
  // Scroll into the detail BEFORE the settle lands, exactly as a player watching the price would.
  await p3.evaluate(() => window.scrollTo(0, 400));
  const scrolledTo = await p3.evaluate(() => window.scrollY);
  // ⛔ REFUSE TO CONTINUE IF THE PREMISE IS ABSENT (§5b.5). A page that did not scroll cannot
  // test a scroll gate, and "it did not navigate" would then prove nothing.
  if (scrolledTo <= 120) die(`the round page did not scroll (scrollY=${scrolledTo}) — the deferral gate cannot be exercised`);
  await post("/api/dev-test/updown-handover", { phase: "settle" });
  await p3.waitForTimeout(14_000);
  ok("6.1 ⭐ SCROLLED INTO THE DETAIL, the page did NOT move — the settlement proof is the trust "
    + "artefact and replacing it mid-sentence is the discourtesy this feature is about",
    onRound(p3) === R4, p3.url());
  const scrolledTxt = await txt(p3.locator("body"));
  ok("6.2 ⛔ …and it still says what is next, so waiting is not a new dead end",
    /next match|mechi ijayo|下一场/.test(scrolledTxt));
  await shot(p3, "07-deferred-by-scroll-1280");
  // Back to the top — they have finished reading, and the next clock tick takes them.
  await p3.evaluate(() => window.scrollTo(0, 0));
  await p3.waitForTimeout(9_000);
  ok("6.3 ⭐ back at the top, it RESUMES within a tick — deferred, never cancelled",
    onRound(p3) !== R4, p3.url());
  await shot(p3, "08-resumed-after-scroll-1280");

  console.log("\n── 7 · the console stayed clean ──");
  const real = consoleErrors.filter((e) => !/favicon|net::ERR_|Download the React DevTools/.test(e));
  ok("7.1 no console errors during the whole handover", real.length === 0, real.slice(0, 3).join(" | "));

  await browser.close();
  console.log(`\n${fails.length === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fails.length} failed`);
  for (const f of fails) console.log(`  · ${f}`);
  process.exit(fails.length === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
