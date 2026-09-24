/**
 * TWO THINGS `qa:cls-budget` CANNOT SEE, AND BOTH WERE LIVE.
 *
 *   npm run qa:ghost-landing -- https://www.50pick.tz
 *   RED_GHOST=1 npm run qa:ghost-landing -- <base>   §A's fix is served back out
 *   RED_STACK=1 npm run qa:ghost-landing -- <base>   §B's fix is served back out
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
 */
import { chromium } from "playwright";
import { localisedContext, assertLang } from "./qa-locale.mjs";

const BASE = process.argv[2] || process.env.BASE || "https://www.50pick.tz";
const RED_GHOST = process.env.RED_GHOST === "1";
const RED_STACK = process.env.RED_STACK === "1";
const RED = RED_GHOST || RED_STACK;

/** Which section each RED control is required to break — a control that breaks the OTHER
 *  section proves nothing about the one it is named for. */
const SECTION = { RED_GHOST: "A", RED_STACK: "B" };

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
console.log("\n§A · does the content land where the ghost promised?");
for (const target of ["/live", "/markets", "/results"]) {
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
console.log(`\n§B · /live with MOTION ON — what moves over ${DWELL_MS / 1000}s of sitting still?`);
{
  const ctx = await localisedContext(b, { locale: "sw", width: 360, height: 780, baseUrl: BASE, reducedMotion: "no-preference" });
  const p = await ctx.newPage();

  if (RED_STACK) {
    // Serve §B's fix back out: `display: none` on the inactive questions collapses the grid
    // track to the active one, which is precisely the pre-fix hero.
    await p.route(/\/_next\/static\/.*\.css(\?.*)?$/, async (route) => {
      const res = await route.fetch();
      const css = (await res.text()) + "\n.kp-contest-q>h2:not([data-q-active]){display:none}\n";
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

await b.close();

const label = RED_GHOST ? "RED_GHOST (§A's fix served back out)" : RED_STACK ? "RED_STACK (§B's fix served back out)" : "GREEN";
console.log(`\nghost landing — ${label} — ${BASE}`);
if (failures.length) for (const f of failures) console.log("  FAIL " + f);
else console.log("  no failures");

if (RED) {
  const want = SECTION[RED_GHOST ? "RED_GHOST" : "RED_STACK"];
  const hit = failures.filter((f) => f.startsWith(want + " "));
  if (!hit.length) {
    console.error(
      `\n🔴 BROKEN HARNESS — the control was applied and §${want} still PASSED.` +
        `\n   A control that does not break the section it is named for certifies nothing.` +
        `\n   ${failures.length ? "It broke a DIFFERENT section, which is worse than silence: " + failures[0] : "Nothing failed at all."}`,
    );
    process.exit(2);
  }
  console.log(`\nRED control behaved: §${want} failed ${hit.length} time(s), as required.`);
  process.exit(0);
}
process.exit(failures.length ? 1 : 0);
