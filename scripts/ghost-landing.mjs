/**
 * TWO THINGS `qa:cls-budget` CANNOT SEE, AND BOTH WERE LIVE.
 *
 *   npm run qa:ghost-landing -- https://www.50pick.tz
 *   RED_GHOST=1 npm run qa:ghost-landing -- <base>   §A's fix is served back out
 *   RED_STACK=1 npm run qa:ghost-landing -- <base>   §B AND §C's fix is served back out
 *   ONLY=E npm run qa:ghost-landing -- <base>        §E alone (R5-L): every rebuilt ghost, box for box
 *   RED_BOXES=1 ONLY=E npm run qa:ghost-landing -- <base>   §E's ghosts' word boxes broken back out
 *   E_WIDTHS=360,390,1280 E_LOCALES=sw,en,zh …       §E's grid (default 390 and 1280, Swahili)
 *
 * ── §A · WHERE THE GHOST PROMISED THE CONTENT WOULD BE ───────────────────────────────────────
 * `layout-shift` only counts a node that is present BEFORE and AFTER a frame. A skeleton is
 * REMOVED and different nodes take its place, so a ghost can be wrong by half a screen and score
 * a perfect 0.0000. That is not a rounding artefact, it is the metric's definition — which means
 * a CLS budget certifies nothing at all about skeleton fidelity. Measured on production
 * 2026-09-24: `/live`'s ghost put the first market at y=160 and it arrived at y=698 (538px), and
 * `/markets`' ghost put it at y=557 against a real y=318 (239px the other way). CLS: 0.0000 on
 * both. So this section measures the LANDING POSITION instead of the score.
 *
 * ⚠️ IT MUST HOP, NOT NAVIGATE. `loading.tsx` renders only on a CLIENT-SIDE navigation; a hard
 * `goto` streams the real page and no skeleton ever paints. Every route here is reached by
 * clicking a visible link from `/`, which is also how a player reaches it. An instrument that
 * opens the URL directly is blind to every `loading.tsx` in the repo, and that is exactly how
 * both defects above survived a green board.
 *
 * ── §B · WHAT MOVES WHILE THE PLAYER SITS STILL ──────────────────────────────────────────────
 * `/live`'s hero is a carousel that auto-advances every 6s, and it was exactly as tall as
 * whichever question was showing. The hero cycled 388 ↔ 483px and took the search box and the
 * whole grid with it — **un-input CLS 0.0796 over 45 seconds of touching nothing**, against a
 * 0.05 budget, and climbing for as long as the page stayed open.
 *
 * ⛔ THE REASON NO GATE SAW IT IS THE LESSON. Every driver in this repo opens pages with
 * `reducedMotion: "reduce"` — correct for stable screenshots — and `featured-contest.tsx`
 * disables the auto-advance under reduced motion. The guard switched the defect OFF and then
 * reported it could not find one. §B runs with motion ON and dwells past four advances.
 *
 * ── §C · WHAT MOVES WHEN THE PLAYER TAPS A CAROUSEL DOT ──────────────────────────────────────
 * `/results`' notable carousel is `featured-contest.tsx`'s declared twin. It has no timer, so §B
 * cannot reach it — but it hid inactive slides with the `hidden` ATTRIBUTE (`display: none`), so
 * its box was the height of whichever slide was showing: 458 / 436 / 413px, moving the results
 * grid 919 → 874. **45px under the finger, every time a player asks to see the next result.**
 *
 * ⛔ CLS SCORES THAT EXACTLY ZERO AND ALWAYS WILL, because the move lands within 500ms of the tap
 * and `hadRecentInput` excludes it. That exclusion is right for a control whose PURPOSE is to
 * move the page. It is wrong for one whose purpose is to swap a card in place. ⚠️ So §C does not
 * read the metric at all — it taps every dot and asserts the BOARD BELOW does not move. A number
 * of 0.0000 from an excluded shift is indistinguishable from a number of 0.0000 from a page that
 * held still, and only one of those is the product working.
 *
 * ── §E · EVERY REBUILT GHOST, BOX FOR BOX (round 5's follow-up, R5-L) ──────────────────────────
 * §A's 120px tolerance was set for ghosts that were typed boxes. Since R5-L the ghosts on /agent, /agent/apply,
 * /agent/status, /leaderboard, /results, /markets and /live are built of their pages' own boxes with the pages' own
 * words set and not shown, and the generic loaders open on their pages' own back link and header (PageLoader's rule),
 * so the element each one promises lands on the page's pixel: §E hops to each route (a client move, so the loading file
 * paints), records where the ghost drew a shared element — the first grid card, the table's first row, the last glass
 * panel, the page's h1 — and where the page puts it, and fails anything more than BOX_TOL apart. §E2 does the same for
 * the two in-page Suspense skeletons on a DOCUMENT load (/results and /markets: their fallbacks are their loading
 * files' drawings). Signed in through a LOCAL server's dev door (`/auth/demo` — R5-K's rule in §D: no scripted sign-in
 * to a preview or to production) where the route needs a player; the page a route is reached from is one that links
 * to it. ⚠️ Not hopped: /agent/apply, /agent/status, /agent/invite/<token> and
 * /proposals/new — each is linked only in a state the dev door does not make (an application begun, one submitted, a
 * live invitation, proposals open), so a lock turn tiles them from a player in that state.
 * ⚠️ A route whose element never shows in a ghost frame, or never arrives, proved nothing and is reported as such.
 * ⚠️ And an element below a band the DATA sets (a bar's row 2, /results' carousel, /live's hero) is held only when the
 * page is the case its ghost drew; else its delta is printed, not held — `DATA_BANDS`. Today's QA board is not
 * /results' case (six results: one notable, no arrows, one-digit counts), nor /live's on a phone (four slides, its
 * questions two lines where the ghost holds three): there §E holds /results' row 2 and prints those grids' deltas.
 */
import { chromium } from "playwright";
import { localisedContext, assertLang } from "./qa-locale.mjs";

// NO PRODUCTION DEFAULT (live-target-safe.test.mjs §1b). This used to fall back to the live site, so a run with no
// target measured production without anyone choosing it. Loopback is the default now; production is reached by
// NAMING it, as the examples at the top do.
const BASE = process.argv[2] || process.env.BASE || "http://localhost:3001";
const RED_GHOST = process.env.RED_GHOST === "1";
const RED_STACK = process.env.RED_STACK === "1";
const RED_BOXES = process.env.RED_BOXES === "1";
const RED = RED_GHOST || RED_STACK || RED_BOXES;
/** `ONLY=E` runs §E alone (a lock turn's budget); otherwise §A–§C run and §E after them. */
const ONLY = (process.env.ONLY ?? "").toUpperCase();

/** Which sections each RED control is required to break — a control that breaks the OTHER
 *  section proves nothing about the one it is named for.
 *  ⭐ `RED_STACK` owns BOTH §B and §C and must break BOTH: one `.kp-slide-stack` mechanism now
 *  serves `/live`'s timed carousel and `/results`' tapped one, so a control that reaches only
 *  one of them would leave the other's fix unproven while reading green. */
const SECTION = { RED_GHOST: ["A"], RED_STACK: ["B", "C"], RED_BOXES: ["E"] };

/** How far a ghost may miss where the content lands. A card is ~180–300px, so 120 is well
 *  inside "the reader's eye does not have to re-find the board", and both live defects were
 *  2–4× this. */
const LAND_TOL = 120;
const IDLE_BUDGET = 0.05; // §9 U25's own CLS line, applied to sitting still
const IDLE_SINGLE = 0.02;
const DWELL_MS = 27_000; // AUTO_ADVANCE_MS is 6000 — four advances plus slack

const failures = [];
const b = await chromium.launch();

/* ── §A ─────────────────────────────────────────────────────────────────────────────────── */
if (ONLY !== "E") console.log("\n§A · does the content land where the ghost promised?");
for (const target of ONLY === "E" ? [] : ["/live", "/markets", "/results"]) {
  const ctx = await localisedContext(b, { locale: "sw", width: 360, height: 780, baseUrl: BASE, reducedMotion: "reduce" });
  const p = await ctx.newPage();

  if (RED_GHOST) {
    // Serve §A's fix back out: collapse the hero and the search wrap the ghost now reserves, so
    // `/live`'s skeleton is the slim header it used to be.
    await p.route(/\/_next\/static\/.*\.css(\?.*)?$/, async (route) => {
      const res = await route.fetch();
      const css = (await res.text()) + "\nheader[aria-hidden],.search-box-wrap[aria-hidden]{display:none}\n";
      await route.fulfill({ response: res, body: css, headers: { ...res.headers(), "content-length": String(Buffer.byteLength(css)) } });
    });
  }

  const cdp = await ctx.newCDPSession(p);
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  await p.goto(BASE + "/", { waitUntil: "load", timeout: 180000 });
  await p.waitForTimeout(6000);
  await assertLang(p, "sw");

  const link = p.locator(`a[href="${target}"]:visible`).first();
  if (!(await link.count())) {
    failures.push(`A ${target} has no visible link from / — the hop could not be made, so nothing was measured`);
    await ctx.close();
    continue;
  }

  // remember the last frame on which a ghost was still on screen AND we were already on target
  await p.evaluate((t) => {
    window.__snap = null;
    const probe = () => {
      if (location.pathname === t && document.querySelector(".kp-shimmer-track")) {
        const e = document.querySelector(".market-grid > *");
        if (e) window.__snap = { y: Math.round(e.getBoundingClientRect().top + scrollY) };
      }
      requestAnimationFrame(probe);
    };
    requestAnimationFrame(probe);
  }, target);

  await link.click();
  await p.waitForURL(`**${target}`, { timeout: 120000 }).catch(() => {});
  await p.waitForTimeout(9000);

  const r = await p.evaluate(() => {
    const e = document.querySelector(".market-grid > *");
    return {
      snap: window.__snap,
      real: e ? Math.round(e.getBoundingClientRect().top + scrollY) : null,
      ghosts: document.querySelectorAll(".kp-shimmer-track").length,
    };
  });

  // ⛔ VACUITY: a hop where no ghost was ever caught, or no grid ever arrived, measured nothing.
  if (!r.snap) {
    failures.push(`A ${target} no skeleton frame was ever captured — this route proved nothing`);
    await ctx.close();
    continue;
  }
  if (r.real == null) {
    failures.push(`A ${target} no grid item arrived — this route proved nothing`);
    await ctx.close();
    continue;
  }

  const delta = r.real - r.snap.y;
  const bad = Math.abs(delta) > LAND_TOL;
  if (bad) failures.push(`A ${target} ghost promised the board at y=${r.snap.y}, it landed at y=${r.real} — out by ${delta}px (tolerance ${LAND_TOL})`);
  console.log(`   ${target.padEnd(9)} ghost y=${String(r.snap.y).padStart(4)}  real y=${String(r.real).padStart(4)}  out by ${String(delta).padStart(5)}px  ${bad ? "FAIL" : "ok"}`);
  await ctx.close();
}

/* ── §B ─────────────────────────────────────────────────────────────────────────────────── */
if (ONLY !== "E") console.log(`\n§B · /live with MOTION ON — what moves over ${DWELL_MS / 1000}s of sitting still?`);
if (ONLY !== "E") {
  const ctx = await localisedContext(b, { locale: "sw", width: 360, height: 780, baseUrl: BASE, reducedMotion: "no-preference" });
  const p = await ctx.newPage();

  if (RED_STACK) {
    // Serve §B's fix back out: `display: none` on the inactive questions collapses the grid
    // track to the active one, which is precisely the pre-fix hero.
    await p.route(/\/_next\/static\/.*\.css(\?.*)?$/, async (route) => {
      const res = await route.fetch();
      const css = (await res.text()) + "\n.kp-slide-stack>*:not([data-slide-active]){display:none}\n";
      await route.fulfill({ response: res, body: css, headers: { ...res.headers(), "content-length": String(Buffer.byteLength(css)) } });
    });
  }

  await p.addInitScript(() => {
    window.__cls = 0;
    window.__worst = 0;
    window.__src = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        if (e.hadRecentInput) continue;
        window.__cls += e.value;
        if (e.value > window.__worst) window.__worst = e.value;
        for (const s of e.sources || []) {
          const n = s.node;
          window.__src.push({
            v: Number(e.value.toFixed(5)),
            el: n ? (n.tagName || "") + "." + (typeof n.className === "string" ? n.className.split(" ").slice(0, 2).join(".") : "") : "?",
          });
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  });

  await p.goto(BASE + "/live", { waitUntil: "load", timeout: 180000 });
  await p.waitForTimeout(6000);
  await assertLang(p, "sw");

  const heroH = () =>
    p.evaluate(() => {
      const h = [...document.querySelectorAll("header")].find((e) => /relative overflow-hidden rounded-xl border/.test(String(e.className)));
      const g = document.querySelector(".market-grid");
      return {
        h: h ? Math.round(h.getBoundingClientRect().height) : -1,
        g: g ? Math.round(g.getBoundingClientRect().top + scrollY) : -1,
        dots: document.querySelectorAll('button[aria-current], button[aria-label*="soko"], button[aria-label*="market"]').length,
        carousel: !!document.querySelector("[aria-roledescription='carousel']"),
      };
    });

  const base = await p.evaluate(() => window.__cls);
  const seen = [];
  const t0 = Date.now();
  while (Date.now() - t0 < DWELL_MS) {
    await p.waitForTimeout(1500);
    seen.push(await heroH());
  }
  const r = await p.evaluate(() => ({ cls: window.__cls, worst: window.__worst, src: window.__src }));

  const last = seen[seen.length - 1] || {};
  // ⛔ VACUITY: if there is no multi-slide carousel on the page, this section tested nothing.
  if (!last.carousel || (last.dots || 0) < 2) {
    failures.push(`B /live has no multi-slide carousel right now (${last.dots || 0} controls) — §B proved nothing; re-run when the board has two or more contested markets`);
  } else {
    const hs = [...new Set(seen.map((x) => x.h))].sort((a, z) => a - z);
    const gs = [...new Set(seen.map((x) => x.g))].sort((a, z) => a - z);
    const hSpread = hs[hs.length - 1] - hs[0];
    const gSpread = gs[gs.length - 1] - gs[0];
    const drift = r.cls - base;
    if (hSpread > 0) failures.push(`B /live hero changes height while idle: ${hs.join(" / ")}px — spread ${hSpread}px, and the grid below moves ${gSpread}px with it`);
    if (drift > IDLE_BUDGET) failures.push(`B /live accrues ${drift.toFixed(4)} un-input CLS in ${DWELL_MS / 1000}s of sitting still (budget ${IDLE_BUDGET})`);
    if (r.worst > IDLE_SINGLE) failures.push(`B /live single un-input shift ${r.worst.toFixed(4)} over the ${IDLE_SINGLE} limit`);
    console.log(`   hero heights ${hs.join(" / ")}px  (spread ${hSpread}px)`);
    console.log(`   grid top     ${gs.join(" / ")}px  (spread ${gSpread}px)`);
    console.log(`   un-input CLS after settle ${base.toFixed(4)} -> ${r.cls.toFixed(4)}  (drift ${drift.toFixed(4)}, worst single ${r.worst.toFixed(4)})`);
    for (const s of r.src.sort((a, z) => z.v - a.v).slice(0, 3)) console.log(`      ${String(s.v).padStart(8)}  ${s.el}`);
  }
  await ctx.close();
}

/* ── §C ─────────────────────────────────────────────────────────────────────────────────── */
if (ONLY !== "E") console.log("\n§C · tapping a carousel dot must not move the board below it");
for (const surface of ONLY === "E" ? [] : [
  { path: "/results", dot: "Onyesha tokeo maarufu" },
  { path: "/live", dot: "Onyesha soko" },
]) {
  const ctx = await localisedContext(b, { locale: "sw", width: 360, height: 780, baseUrl: BASE, reducedMotion: "reduce" });
  const p = await ctx.newPage();

  if (RED_STACK) {
    await p.route(/\/_next\/static\/.*\.css(\?.*)?$/, async (route) => {
      const res = await route.fetch();
      const css = (await res.text()) + "\n.kp-slide-stack>*:not([data-slide-active]){display:none}\n";
      await route.fulfill({ response: res, body: css, headers: { ...res.headers(), "content-length": String(Buffer.byteLength(css)) } });
    });
  }

  await p.goto(BASE + surface.path, { waitUntil: "load", timeout: 180000 });
  await p.waitForTimeout(6000);
  await assertLang(p, "sw");

  const probe = () =>
    p.evaluate(() => {
      const g = document.querySelector(".market-grid");
      const st = document.querySelector(".kp-slide-stack");
      return {
        gridY: g ? Math.round(g.getBoundingClientRect().top + scrollY) : -1,
        visible: st ? [...st.children].filter((c) => getComputedStyle(c).visibility !== "hidden" && getComputedStyle(c).display !== "none").length : -1,
        slides: st ? st.children.length : 0,
      };
    });

  const dots = p.locator(`button[aria-label^="${surface.dot}"]`);
  const n = await dots.count();
  // ⛔ VACUITY: one slide, or no dots, means nothing was exercised on this surface.
  if (n < 2) {
    failures.push(`C ${surface.path} has ${n} carousel dot(s) — §C proved nothing here; re-run when the board carries two or more`);
    await ctx.close();
    continue;
  }

  const seen = [await probe()];
  for (let i = 2; i <= n; i++) {
    await p.locator(`button[aria-label="${surface.dot} ${i}"]`).first().click({ timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(1200);
    seen.push(await probe());
  }

  const ys = seen.map((x) => x.gridY).filter((y) => y > 0);
  if (!ys.length) {
    failures.push(`C ${surface.path} no grid was found to measure against — §C proved nothing here`);
    await ctx.close();
    continue;
  }
  const spread = Math.max(...ys) - Math.min(...ys);
  const badVis = seen.filter((x) => x.visible !== 1).length;
  if (spread > 0) failures.push(`C ${surface.path} the board moves ${spread}px as the carousel is tapped through its ${n} slides (${[...new Set(ys)].join(" / ")})`);
  // ⛔ a stack showing none or several slides is a broken fix that would still score spread 0
  if (badVis) failures.push(`C ${surface.path} ${badVis} of ${seen.length} steps showed ${seen.map((x) => x.visible).join("/")} visible slides — exactly one must be`);
  console.log(`   ${surface.path.padEnd(9)} ${n} dots  board at ${[...new Set(ys)].join(" / ")}  spread ${spread}px  visible-per-step ${seen.map((x) => x.visible).join("/")}`);
  await ctx.close();
}

/* ── §E ─────────────────────────────────────────────────────────────────────────────────── */
/** How far a rebuilt ghost's element may stand from the page's: its boxes ARE the page's, so the remainder is sub-pixel
 *  rounding and a web font's swap. Every typed box §A tolerated was 2–30× this. */
const BOX_TOL = 4;
const E_WIDTHS = (process.env.E_WIDTHS ?? "390,1280").split(",").map(Number).filter((n) => n > 0);
const E_LOCALES = (process.env.E_LOCALES ?? "sw").split(",").map((x) => x.trim()).filter(Boolean);
/** The bands a ghost draws in ONE case of the data (its note says which), found the same way in the ghost and on the
 *  page: a bar's row 2, whose lines the counts' digits set (the ghosts hold two, "00"); the band over /results' grid,
 *  its notable carousel — arrows and dots only for an archive of eight or more (`results/page.tsx`; one notable below
 *  that), the card as tall as its title; and /live's hero — its stack as tall as the tallest contested question, a dot
 *  per slide. */
const DATA_BANDS = {
  row2: { name: "row 2", sel: ".kp-discovery-bar .kp-qbar-row", why: "the counts' digits set its lines; the ghost holds two" },
  overGrid: { name: "the carousel", sel: ".market-grid", prev: true, why: "arrows and dots for an archive of eight or more; the card as tall as its title" },
  hero: { name: "the hero", sel: "main header.overflow-hidden", why: "the tallest contested question's lines; a dot per slide" },
};
/** Each route: where it is reached from (a page that links to it), the element measured in BOTH the ghost and the page
 *  (`el`, the first match, or the last with `last`), and whether it needs a player.
 *  ⚠️ `drawn`: the DATA_BANDS above the element. It is held only when the page IS the case its ghost drew — each of
 *  those bands as tall as the ghost's; otherwise its delta is printed as the data's, not held. /results' row 2 is held
 *  always: its top stands above every band the data sets. */
const E_ROUTES = [
  { target: "/live", from: "/", el: ".market-grid > *", drawn: ["hero"] },
  { target: "/markets", from: "/", el: ".market-grid > *", drawn: ["row2"] },
  { target: "/results", name: "/results row 2", from: "/", el: ".kp-discovery-bar .kp-qbar-row" },
  { target: "/results", from: "/", el: ".market-grid > *", drawn: ["row2", "overGrid"] },
  { target: "/leaderboard", from: "/account", el: "table.admin-tbl tbody tr", auth: true },
  { target: "/agent", from: "/account", el: "main .glass-panel", last: true, auth: true },
  { target: "/fairness", from: "/account", el: "main h1", auth: true },
  { target: "/help", from: "/account", el: "main h1", auth: true },
  { target: "/notifications", from: "/account", el: "main h1", auth: true },
  { target: "/proposals", from: "/account", el: "main h1", auth: true },
  { target: "/profile/kyc", from: "/account", el: "main h1", auth: true },
  { target: "/profile/invite", from: "/account", el: "main .font-display", auth: true },
  { target: "/profile/responsible-gambling", from: "/account", el: "main h1", auth: true },
  { target: "/profile/security", from: "/profile", el: "main h1", auth: true },
  { target: "/profile/sessions", from: "/profile", el: "main h1", auth: true },
  { target: "/profile/source-of-funds", from: "/profile", el: "main h1", auth: true },
  { target: "/profile/activity", from: "/profile", el: "main h1", auth: true },
  { target: "/profile/notifications", from: "/profile", el: "main h1", auth: true },
  { target: "/profile/account", from: "/profile", el: "main h1", auth: true },
  { target: "/watchlist", from: "/", el: "main h1", auth: true },
];
/** The dev door's session cookie (qa-classic-shell-parity's `signIn`): a local server only (R5-K's rule), never a
 *  preview and never production. */
async function demoSession() {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const p = await ctx.newPage();
    await p.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 180000 });
    await p.waitForTimeout(900);
    return (await ctx.cookies(BASE)).filter((c) => c.name === "kp_session");
  } catch { return []; } finally { await ctx.close().catch(() => {}); }
}
/** The heights of `bands` (DATA_BANDS entries) on the landed page — run in the page; the probes measure the ghost frame
 *  the same way. */
const bandHeights = (bands) => bands.map((b) => {
  const x = document.querySelector(b.sel);
  const e = b.prev ? x?.previousElementSibling : x;
  return e ? Math.round(e.getBoundingClientRect().height) : null;
});
/** Why the page is not the case its ghost drew, or "" when it is: each band of `keys` as tall in both, within 1px. */
function dataCase(keys, ghost, page) {
  const why = (keys ?? []).map((k, i) => (ghost?.[i] != null && page?.[i] != null && Math.abs(page[i] - ghost[i]) <= 1 ? ""
    : `${DATA_BANDS[k].name} is ${page?.[i]}px, the ghost's ${ghost?.[i]} (${DATA_BANDS[k].why})`)).filter(Boolean);
  return why.length ? `not the drawn case: ${why.join("; ")}` : "";
}
/** Serve §E's fix back out: the ghosts' word boxes become 40px blocks, so no ghost lands where its page does. */
async function redBoxes(p) {
  await p.route(/\/_next\/static\/.*\.css(\?.*)?$/, async (route) => {
    const res = await route.fetch();
    const css = (await res.text()) + "\n[aria-hidden] .box-decoration-clone,[aria-busy] .box-decoration-clone,.box-decoration-clone[aria-hidden]{display:block;min-height:40px}\n";
    await route.fulfill({ response: res, body: css, headers: { ...res.headers(), "content-length": String(Buffer.byteLength(css)) } });
  });
}
if (ONLY === "E" || RED_BOXES || !RED) {
  console.log(`\n§E · every rebuilt ghost lands box for box (±${BOX_TOL}px) — ${E_WIDTHS.join("/")} · ${E_LOCALES.join("/")}`);
  // R5-K's rule (§D): a scripted sign-in only through a LOCAL server's demo door — never a preview, never production.
  const LOOPBACK = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/.test(BASE);
  const jar = LOOPBACK ? await demoSession() : [];
  if (LOOPBACK && !jar.length) failures.push("E no player session (the local demo door signed nobody in) — the routes that need one were not measured");
  if (!LOOPBACK) console.log(`   (${BASE} is not a local server: no scripted sign-in — the routes that need a player are not measured here)`);
  for (const r of E_ROUTES) for (const width of E_WIDTHS) for (const locale of E_LOCALES) {
    if (r.auth && !jar.length) continue;
    const ctx = await localisedContext(b, { locale, width, height: 900, baseUrl: BASE, reducedMotion: "reduce" });
    if (r.auth) await ctx.addCookies(jar);
    const p = await ctx.newPage();
    if (RED_BOXES) await redBoxes(p);
    const cdp = await ctx.newCDPSession(p);
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const tag = `E ${r.name ?? r.target} @${width} ${locale}`;
    try {
      await p.goto(BASE + r.from, { waitUntil: "load", timeout: 180000 });
      await p.waitForTimeout(4000);
      const link = p.locator(`a[href="${r.target}"]:visible`).first();
      if (!(await link.count())) { failures.push(`${tag}: no visible link from ${r.from} — nothing was measured`); continue; }
      const bands = (r.drawn ?? []).map((k) => DATA_BANDS[k]);
      await p.evaluate(({ t, sel, last, bands }) => {
        window.__dsnap = null;
        window.__dbands = null;
        const probe = () => {
          if (location.pathname === t && document.querySelector(".kp-shimmer-track")) {
            const all = document.querySelectorAll(sel);
            const e = last ? all[all.length - 1] : all[0];
            if (e) {
              window.__dsnap = Math.round(e.getBoundingClientRect().top + scrollY);
              window.__dbands = bands.map((b) => {
                const x = document.querySelector(b.sel);
                const y = b.prev ? x?.previousElementSibling : x;
                return y ? Math.round(y.getBoundingClientRect().height) : null;
              });
            }
          }
          requestAnimationFrame(probe);
        };
        requestAnimationFrame(probe);
      }, { t: r.target, sel: r.el, last: !!r.last, bands });
      await link.click();
      await p.waitForURL(`**${r.target}`, { timeout: 120000 }).catch(() => {});
      await p.waitForTimeout(9000);
      const got = await p.evaluate(({ sel, last }) => {
        const all = document.querySelectorAll(sel);
        const e = last ? all[all.length - 1] : all[0];
        return { snap: window.__dsnap, real: e ? Math.round(e.getBoundingClientRect().top + scrollY) : null, bands: window.__dbands };
      }, { sel: r.el, last: !!r.last });
      const pageBands = await p.evaluate(bandHeights, bands);
      if (got.snap == null) { failures.push(`${tag}: no ghost frame was captured — this case proved nothing`); continue; }
      if (got.real == null) { failures.push(`${tag}: ${r.el} never arrived — this case proved nothing`); continue; }
      const delta = got.real - got.snap;
      const other = dataCase(r.drawn, got.bands, pageBands);
      if (!other && Math.abs(delta) > BOX_TOL) failures.push(`${tag}: the ghost drew ${r.el} at y=${got.snap}, the page put it at y=${got.real} — ${delta}px (tolerance ${BOX_TOL})`);
      console.log(`   ${tag.slice(2).padEnd(40)} ghost y=${String(got.snap).padStart(5)}  page y=${String(got.real).padStart(5)}  ${String(delta).padStart(5)}px  ${other ? `not held — ${other}` : Math.abs(delta) > BOX_TOL ? "FAIL" : "ok"}`);
    } catch (e) {
      failures.push(`${tag}: ${String(e).slice(0, 120)}`);
    } finally {
      await ctx.close().catch(() => {});
    }
  }

  // §E2 — the in-page skeletons, on a DOCUMENT load: the first card of the fallback against the first card of the page.
  for (const target of ["/results", "/markets"]) for (const width of E_WIDTHS) for (const locale of E_LOCALES) {
    const ctx = await localisedContext(b, { locale, width, height: 900, baseUrl: BASE, reducedMotion: "reduce" });
    const p = await ctx.newPage();
    if (RED_BOXES) await redBoxes(p);
    const tag = `E ${target} (document) @${width} ${locale}`;
    try {
      const keys = target === "/results" ? ["row2", "overGrid"] : ["row2"], bands = keys.map((k) => DATA_BANDS[k]);
      await p.addInitScript(({ t, bands }) => {
        window.__dsnap = null;
        window.__dbands = null;
        const probe = () => {
          if (location.pathname === t && document.querySelector(".kp-shimmer-track")) {
            const e = document.querySelector(".market-grid > *");
            if (e) {
              window.__dsnap = Math.round(e.getBoundingClientRect().top + scrollY);
              window.__dbands = bands.map((b) => {
                const x = document.querySelector(b.sel);
                const y = b.prev ? x?.previousElementSibling : x;
                return y ? Math.round(y.getBoundingClientRect().height) : null;
              });
            }
          }
          requestAnimationFrame(probe);
        };
        requestAnimationFrame(probe);
      }, { t: target, bands });
      const cdp = await ctx.newCDPSession(p);
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
      await p.goto(BASE + target, { waitUntil: "load", timeout: 180000 });
      await p.waitForTimeout(8000);
      const got = await p.evaluate(() => {
        const e = document.querySelector(".market-grid > *");
        return { snap: window.__dsnap, real: e ? Math.round(e.getBoundingClientRect().top + scrollY) : null, bands: window.__dbands };
      });
      const pageBands = await p.evaluate(bandHeights, bands);
      if (got.snap == null) { failures.push(`${tag}: the document never painted its fallback — this case proved nothing (a fast server streams the page at once)`); continue; }
      if (got.real == null) { failures.push(`${tag}: no card arrived — this case proved nothing`); continue; }
      const delta = got.real - got.snap;
      const other = dataCase(keys, got.bands, pageBands);
      if (!other && Math.abs(delta) > BOX_TOL) failures.push(`${tag}: the fallback drew the first card at y=${got.snap}, the page at y=${got.real} — ${delta}px`);
      console.log(`   ${tag.slice(2).padEnd(40)} ghost y=${String(got.snap).padStart(5)}  page y=${String(got.real).padStart(5)}  ${String(delta).padStart(5)}px  ${other ? `not held — ${other}` : Math.abs(delta) > BOX_TOL ? "FAIL" : "ok"}`);
    } catch (e) {
      failures.push(`${tag}: ${String(e).slice(0, 120)}`);
    } finally {
      await ctx.close().catch(() => {});
    }
  }
}

await b.close();

const label = RED_GHOST ? "RED_GHOST (§A's fix served back out)" : RED_STACK ? "RED_STACK (§B and §C's fix served back out)" : RED_BOXES ? "RED_BOXES (§E's word boxes broken back out)" : "GREEN";
console.log(`\nghost landing — ${label} — ${BASE}`);
if (failures.length) for (const f of failures) console.log("  FAIL " + f);
else console.log("  no failures");

if (RED) {
  const want = SECTION[RED_GHOST ? "RED_GHOST" : RED_STACK ? "RED_STACK" : "RED_BOXES"];
  // ⛔ EVERY section the control owns must fail. Requiring only "at least one" would let a
  // control that reaches §B but not §C certify §C's fix while never having tested it — the
  // shape this guard exists to refuse, one level up.
  const silent = want.filter((sec) => !failures.some((f) => f.startsWith(sec + " ")));
  if (silent.length) {
    console.error(
      `\n🔴 BROKEN HARNESS — the control was applied and §${silent.join(", §")} still PASSED.` +
        `\n   A control that does not break every section it is named for certifies nothing about the ones it missed.` +
        `\n   ${failures.length ? "What it DID break: §" + [...new Set(failures.map((f) => f.slice(0, 1)))].join(", §") : "Nothing failed at all."}`,
    );
    process.exit(2);
  }
  console.log(`\nRED control behaved: §${want.join(" and §")} failed, as required (${failures.length} failure(s) total).`);
  process.exit(0);
}
process.exit(failures.length ? 1 : 0);
