#!/usr/bin/env node
/**
 * `npm run qa:tap-truth` — DOES A TAP LAND ON THE CONTROL THE PLAYER AIMED AT?
 *
 * 🔴 WHY THIS EXISTS, IN THE OWNER'S OWN WORDS (Ali, 2026-09-09, relaying real players):
 *   *"in up and down not all timings are clickable — they click a time, maybe 15mins, and it
 *    clicks something else."*
 *
 * ⛔ AND WHY NO EXISTING GATE COULD HAVE SEEN IT. `/updown` — the surface being complained
 * about — is in the population of NEITHER `qa:player-filters` NOR `qa:bar-geometry`. Every
 * filter gate this repo owns was green on the day the report came in, because none of them
 * looks at that route. ⚠️ Measuring the wrong population is this programme's most expensive
 * recurring error, and this is it again.
 *
 * ── WHAT THE OTHER GATES ASK, AND WHY IT IS NOT THIS QUESTION ────────────────────────────
 *   · `test:responsive`   — does the DOCUMENT overflow?        (a bar can be broken inside a
 *                                                               page that does not overflow)
 *   · `qa:filter-scan`    — is the radius/tap-floor CLASS present in the source?
 *                                                              (a class is not a rendered box)
 *   · `qa:bar-geometry`   — do two BARS occupy the same pixels? (says nothing about two
 *                                                               CONTROLS, or about a control
 *                                                               that is simply dead)
 *   · `qa:player-filters` — does the filter FILTER?             (asks nothing about the tap)
 *
 * ⭐ THIS ONE ASKS THE PLAYER'S QUESTION: for every filter control on every client-facing
 * surface, at every width and locale —
 *
 *   1. HIT      · `elementFromPoint` at the control's own centre resolves back to that control.
 *                 A gradient, mask, sticky sibling or ::after overlay on top of a rail steals
 *                 the tap and the control is simply dead. This is the ONLY arm that catches it.
 *   2. FLOOR    · the rendered box is >= 44x44 CSS px (the product's own documented floor;
 *                 `dense` admin chips are out of scope — this driver is player-only).
 *   3. DISJOINT · no two controls' boxes intersect. Overlapping targets are how a tap aimed at
 *                 one chip lands on its neighbour.
 *   4. ONSCREEN · the box is inside the viewport, or inside a scroller that can reach it.
 *                 A chip 162px off the right edge is not clickable however correct its markup.
 *   5. LIVE     · `pointer-events` is not `none` at rest. `.kp-fchip-waiting` sets exactly that,
 *                 and a stuck waiting state is "not all timings are clickable" verbatim.
 *
 * ⭐ AND THEN THE ARM THAT PROVES THE COMPLAINT'S SECOND HALF — `--click`:
 *   6. IDENTITY · CLICK each control at its centre and assert the state that comes back names
 *                 THE CONTROL THAT WAS CLICKED. This is the direct test of "I tap 15 min and it
 *                 picks something else": the driver records the chip's own label + href BEFORE
 *                 the tap, taps the geometric centre (never `.click()`, which Playwright routes
 *                 to the element by handle and would bypass the very hit-testing under
 *                 suspicion), then re-reads which chip is selected afterwards.
 *
 * ⛔ THE CLICK ARM MUST TAP COORDINATES, NOT ELEMENTS. `locator.click()` scrolls the element
 * into view and dispatches at ITS box — so it passes cheerfully through an overlay that a real
 * finger cannot get past. `page.mouse.click(x, y)` is what a player does.
 *
 * ⚠️ RUN IT AGAINST THE REFERENCE FIRST. `/markets` is the surface every other rail was
 * extracted from; if a new instrument reports defects there, suspect the instrument. That rule
 * is written down because a previous driver's first draft reported eighteen defects on
 * `/markets` and every one was an exemption this repo had already reasoned through.
 *
 * ⛔ LOCALHOST ONLY, and it needs the fixture: `npm run fixture:player` first, or the board has
 * no chains, the rails render empty and every arm passes over nothing at all.
 *
 *   node scripts/live/tap-truth-drive.mjs [baseUrl] [--only=/updown] [--click] [--widths=360,1280]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.argv.find((a) => a.startsWith("http")) || "http://localhost:3031";
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(BASE);
/**
 * ⭐ PRODUCTION IS ALLOWED, BEHIND AN EXPLICIT FLAG, AND THAT IS A DELIBERATE DECISION.
 *
 * 🔴 The complaint this driver exists for is about the REAL board, whose chain configuration
 * localhost only imitates: how many assets are enabled, how many durations each runs, and
 * therefore how long the rail is and where each chip sits. A fixture with two durations cannot
 * reproduce a defect that needs six. Measuring the real thing is the whole point.
 *
 * ⛔ AND IT IS SAFE, FOR ONE SPECIFIC REASON: every control this driver touches is a filter,
 * and on this platform a filter is a `<Link>` — a GET navigation that changes a query string.
 * It places no bet, moves no money and writes no row. ⚠️ The driver runs SIGNED OUT against
 * production (`/auth/demo` 404s there by design), so it cannot reach an authenticated action
 * even by accident.
 */
if (!LOCAL && !process.argv.includes("--allow-prod")) {
  console.error(`REFUSED — ${BASE} is not localhost. Filter chips are GET links, so a read-only`);
  console.error(`         production measurement is safe; pass --allow-prod to say so on purpose.`);
  process.exit(1);
}
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const has = (n) => process.argv.includes(`--${n}`);
const ONLY = arg("only", null);
const DO_CLICK = has("click");
const SHOTS = arg("shots", "shots/tap-truth");
const DEBUG = has("debug");

/** The product's own player tap floor. Cited, not invented: `filterPillClass` writes
 *  `min-h-[44px]` for both player ranks (`src/components/ui/filter-pill.tsx`). */
const FLOOR = 44;

/**
 * ⚠️ 360 and 414 are the phones the product is actually used on; 768 is the tablet where
 * `/updown` switches from its sheet to its rails (`sm:`), and 1280 is the board tier.
 * The `sm` boundary is the interesting one — it is where a surface changes CONTROL, and a
 * width tested only either side of a breakpoint never sees the swap itself.
 */
const WIDTHS = (arg("widths", "360,414,768,1280")).split(",").map(Number);
const LOCALES = (arg("locales", "en,sw")).split(",");

/**
 * The CLIENT-FACING surfaces that filter. ⛔ `/updown` IS FIRST AND IS THE POINT — it is the
 * route the complaint names and the route no other gate covers.
 * ⛔ Admin is deliberately absent: `dense` chips have a documented 32px floor and this driver
 * asserts the player floor.
 */
const SURFACES = [
  { id: "/updown", path: "/updown" },
  { id: "/updown/history", path: "/updown/history" },
  { id: "/markets", path: "/markets" },
  { id: "/results", path: "/results" },
  { id: "/positions", path: "/positions" },
  { id: "/proposals", path: "/proposals" },
  { id: "/watchlist", path: "/watchlist" },
  { id: "/wallet", path: "/wallet" },
  { id: "/notifications", path: "/notifications" },
  { id: "/profile/activity", path: "/profile/activity" },
];
const surfaces = ONLY ? SURFACES.filter((s) => s.id === ONLY || s.path === ONLY) : SURFACES;
if (surfaces.length === 0) {
  console.error(`no surface matches --only=${ONLY}`);
  process.exit(1);
}

/**
 * Every player filter control, however it is built.
 *
 * ⚠️ `.kp-fchip` is the shared primitive, but a surface that HAND-ROLLED its control is exactly
 * the kind this driver must not miss — so the selector also takes anything inside a
 * `[data-filter-rail]`, plus the sheet trigger and the sort/direction controls. A control this
 * query does not see is a control that cannot fail, which is the vacuity trap.
 */
const CONTROL_SEL = [
  ".kp-fchip",
  "[data-filter-rail] a",
  "[data-filter-rail] button",
  "[data-chip]",
  /* ⭐ The chart's own range/style rail. It is a filter by every meaning a player has — and on
     a phone it is the ONLY time rail visible on `/updown`, because the durations are behind the
     sheet. It is not a `FilterPill`, which is exactly why it must be named here: a control this
     selector cannot see is a control that cannot fail. */
  ".pchart-range",
].join(",");

/**
 * ⛔ THE TWO EXEMPTIONS THIS REPO HAD ALREADY REASONED THROUGH, AND WHICH THIS DRIVER'S FIRST
 * DRAFT RE-DISCOVERED AS NINETEEN FALSE FAILURES ON `/markets`.
 *
 * 1. **A CLOSED DISCLOSURE STILL LAYS OUT.** `/markets`' sort and topic menus are `<details
 *    class="kp-menu">` whose panels are painted out rather than removed, so every option keeps
 *    a real 218x44 box — stacked at one x, all overlapping each other and whatever card is
 *    behind them. Measured as controls they produce a HIT failure and a DISJOINT failure each,
 *    on a page where nothing is wrong. A player cannot tap what is not disclosed.
 * 2. **A GLYPH INSIDE A CONTROL IS NOT A CONTROL.** `.kp-sortdir` is the direction ARROW —
 *    7.8x13px of icon inside a 44px button. Measuring it reports the button's own floor as
 *    broken. It is gone from the selector; the button that contains it is still measured.
 *
 * ⭐ AND THE GENERAL RULE BOTH ARE INSTANCES OF: measure only what a player can act on AT THIS
 * MOMENT. Anything inside a collapsed, hidden, `aria-hidden` or transparent subtree is out of
 * the population — not passed, not failed, absent. A gate that fails a correct page teaches
 * people to ignore it.
 */
/**
 * ⛔ 4. THE SHEET'S CHROME IS NOT A FILTER, AND MEASURING IT SLANDERS EVERY CHIP BEHIND IT.
 *
 * `[data-filter-rail] button` legitimately catches hand-rolled chips, but inside an open
 * `FilterSheet` it also catches the SCRIM — a deliberately full-viewport `<button>` whose whole
 * job is to cover the page and close on tap. Measured as a control it "overlaps" all eighteen
 * chips and "steals" their taps, producing a page of failures on a sheet that works perfectly.
 * The close ✕ and the "Show N markets" apply button are the same kind of thing: sheet chrome,
 * not axes. ⚠️ None of them changes a filter, which is the test for belonging in this population.
 */
function IS_CHROME(el) {
  if (el.closest(".m-scrim, .kp-fsheet-scrim, .kp-fsheet-foot, .kp-fsheet-head")) return true;
  // A "control" the size of the page is a scrim by any other name.
  const r = el.getBoundingClientRect();
  if (r.width * r.height > window.innerWidth * window.innerHeight * 0.5) return true;
  return false;
}

function REACHABLE(el) {
  if (window.__IS_CHROME(el)) return false;
  /* ⛔ 3. A MODAL MAKES EVERYTHING BEHIND IT UNREACHABLE, AND THE MARKUP DOES NOT SAY SO.
     When the phone `FilterSheet` is open, the page's own discovery bar is still laid out
     underneath it — not hidden, just covered by `.kp-fsheet-scrim`. Measuring both populations
     at once reports every sheet chip as overlapping the bar chip behind it, and every bar chip
     as failing to hit itself because the scrim is on top. That is 40+ failures on three correct
     pages. ⚠️ The product is right here: with the sheet open, the sheet's controls ARE the
     filters, and the ones behind the scrim are correctly untappable. So when a sheet is open the
     population is the sheet. */
  const sheet = document.querySelector("details.kp-fsheet[open], dialog[open], [data-modal-open]");
  if (sheet && !sheet.contains(el)) return false;
  for (let n = el; n; n = n.parentElement) {
    if (n.nodeType !== 1) continue;
    // A closed native disclosure: its panel is laid out but undisclosed.
    if (n.tagName === "DETAILS" && !n.hasAttribute("open")) return false;
    if (n.hasAttribute("hidden")) return false;
    if (n.getAttribute("aria-hidden") === "true") return false;
    const cs = getComputedStyle(n);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.visibility === "collapse") return false;
    if (Number(cs.opacity) === 0) return false;
    // A panel painted out but still in flow (the kit's menus do exactly this).
    if (cs.contentVisibility === "hidden") return false;
  }
  return true;
}

/**
 * Is this control inside a scroller that could bring it into view?
 * ⚠️ A chip in a horizontally scrolling strip is NOT clipped — this repo wrote that exemption
 * down after a previous instrument reported a whole strip as off-screen. ONSCREEN only means
 * something when nothing can scroll the control into reach.
 */
function IN_SCROLLER(el) {
  for (let n = el.parentElement; n; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if ((/(auto|scroll)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 1) ||
        (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1)) return true;
  }
  return false;
}

/**
 * Is this control's own centre parked OUTSIDE the strip that holds it?
 *
 * ⛔ THIS IS THE DIFFERENCE BETWEEN "SCROLLED OUT" AND "COVERED", AND CONFLATING THEM RE-OPENS AN
 * EXEMPTION THIS REPO HAD ALREADY SETTLED: *a control in a scrolling strip is not clipped.* A chip
 * half-way out of its own horizontal strip has a bounding box that extends past the strip's clip,
 * so `elementFromPoint` at its centre returns whatever is painted BESIDE the strip — on `/markets`
 * that is the result count. Reported as a covered control it looks like a dead filter; it is a
 * chip you scroll to, which is exactly what the strip's fade exists to advertise.
 * ⚠️ A chip sitting fully INSIDE its scroller and still failing its centre is a different animal
 * — something is genuinely on top of it — and that is what ATREST must keep catching.
 */
function SCROLLED_OUT(el) {
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let n = el.parentElement; n; n = n.parentElement) {
    const cs = getComputedStyle(n);
    const scrolls = (/(auto|scroll|clip|hidden)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 1) ||
                    (/(auto|scroll|clip|hidden)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1);
    if (!scrolls) continue;
    const b = n.getBoundingClientRect();
    if (cx < b.left - 0.5 || cx > b.right + 0.5 || cy < b.top - 0.5 || cy > b.bottom + 0.5) return true;
  }
  return false;
}

/**
 * Close every disclosure, then open the one that actually holds filter chips, by CLICKING its
 * own summary the way a player would. Returns the number opened (0 or 1).
 *
 * ⛔ It clicks rather than setting `open` in script, because the trigger being tappable is
 * itself part of the claim — a sheet whose trigger cannot be reached is the defect, not a
 * setup step to be worked around.
 */
async function openFilterDisclosure(page) {
  // Start from a known state: nothing open, nothing overlaying anything.
  await page.evaluate(() => {
    for (const d of document.querySelectorAll("details[open]")) d.removeAttribute("open");
  });
  await page.waitForTimeout(150);
  const idx = await page.evaluate(() => {
    const ds = Array.from(document.querySelectorAll("details"));
    return ds.findIndex((d) => d.querySelectorAll(".kp-fchip,[data-chip]").length > 0);
  });
  if (idx < 0) {
    if (DEBUG) {
      const d = await page.evaluate(() => ({
        url: location.pathname,
        chips: document.querySelectorAll(".kp-fchip").length,
        details: document.querySelectorAll("details").length,
        bar: !!document.querySelector(".kp-discovery-bar"),
        body: document.body.innerText.replace(/\s+/g, " ").slice(0, 100),
      }));
      console.error(`  [disclose] no details holds chips — ${JSON.stringify(d)}`);
    }
    return 0;
  }
  const sm = page.locator("details").nth(idx).locator("> summary");
  try {
    if (!(await sm.isVisible())) { if (DEBUG) console.error(`  [disclose] details#${idx} summary not visible`); return 0; }
    await sm.click({ timeout: 5000 });
  } catch (e) {
    if (DEBUG) console.error(`  [disclose] details#${idx} click threw: ${String(e).slice(0, 200)}`);
    return 0;
  }
  await page.waitForTimeout(600);
  const isOpen = await page.evaluate((i) => document.querySelectorAll("details")[i]?.hasAttribute("open") ?? false, idx);
  return isOpen ? 1 : 0;
}

const results = [];
const record = (r) => {
  results.push(r);
  const tag = r.ok ? "  ok" : "FAIL";
  console.log(`${tag}  ${r.surface} ${r.width} ${r.locale}  ${r.arm.padEnd(9)}  ${r.detail}`);
};

/**
 * Is `el` reachable by a tap at (x, y)? Walks the composed ancestor chain from whatever
 * `elementFromPoint` returns, because a tap that lands on a chip's own `<span>` label IS a tap
 * on the chip — but a tap that lands on a sibling overlay is not.
 */
/* ⛔ A REAL FUNCTION, NOT A STRING. `evaluate("(el) => …")` treats the string as an EXPRESSION,
   so Playwright evaluates it to the function object, returns `undefined` (unserializable) and
   never calls it with the element — every measurement comes back empty and the driver crashes
   on the first field it reads. Cost one run to find. */
function HIT_PROBE(el, opts) {
  if (!window.__REACHABLE(el)) return { skip: "undisclosed" };
  if (opts && opts.scroll) {
    // What a finger does before tapping something parked under a sticky footer.
    try { el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" }); } catch { el.scrollIntoView(); }
  }
  const r = el.getBoundingClientRect();
  const cx = Math.round(r.left + r.width / 2);
  const cy = Math.round(r.top + r.height / 2);
  const vw = window.innerWidth, vh = window.innerHeight;
  const onscreen = r.left >= -0.5 && r.top >= -0.5 && r.right <= vw + 0.5 && r.bottom <= vh + 0.5;
  const cs = getComputedStyle(el);
  const top = document.elementFromPoint(cx, cy);
  let hit = false;
  const chain = [];
  for (let n = top; n; n = n.parentElement) {
    const cls = typeof n.className === "string" && n.className.trim()
      ? "." + n.className.trim().split(/\s+/).slice(0, 2).join(".")
      : "";
    chain.push(n.tagName.toLowerCase() + cls);
    if (n === el) { hit = true; break; }
  }
  return {
    x: cx, y: cy,
    w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
    left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom),
    onscreen,
    inScroller: window.__IN_SCROLLER(el),
    scrolledOut: window.__SCROLLED_OUT(el),
    pointerEvents: cs.pointerEvents,
    visibility: cs.visibility,
    opacity: cs.opacity,
    /* Is whatever covers this control a FIXED overlay on a page that can still scroll?
       ⛔ THE BOTTOM NAV IS FIXED, AND EVERY LONG PAGE PASSES CONTENT BEHIND IT WHILE SCROLLING.
       Measured on `/positions` at 414 in Swahili: the sort control's natural position at
       scroll 0 is y=825, and `nav.lg:hidden.fixed` occupies 836→900, so its centre resolves to
       a nav item. ⚠️ That is not a covered control — it is a control you have not scrolled to.
       The product already answers the real version of this hazard with `pb-[88px]` on `main`,
       so the END of the document clears the bar; transient mid-scroll overlap is what a fixed
       bottom bar IS. A control genuinely trapped under it would fail the scrolled `hit` too. */
    coveredByFixed: (() => {
      const t = document.elementFromPoint(cx, cy);
      const canScroll = document.documentElement.scrollHeight > window.innerHeight + 1;
      for (let n = t; n; n = n.parentElement) {
        if (n.nodeType !== 1) continue;
        if (getComputedStyle(n).position === "fixed") return canScroll;
      }
      return false;
    })(),
    ...(() => {
      /* Sample a 7x3 lattice inset 2px from the edges — the area a finger can plausibly land
         on while aiming at this control — and count the points that resolve to a DIFFERENT
         filter control. ⛔ Points that hit nothing, or hit an ancestor, are NOT counted: a
         rounded corner that falls through to the page is cosmetic, while one that falls
         through to the neighbouring chip is the reported defect. */
      const SEL = ".kp-fchip,[data-filter-rail] a,[data-filter-rail] button,[data-chip],.pchart-range";
      let steal = 0, samples = 0, stealWho = null;
      for (let ix = 0; ix < 7; ix++) {
        for (let iy = 0; iy < 3; iy++) {
          const px = Math.round(r.left + 2 + ((r.width - 4) * ix) / 6);
          const py = Math.round(r.top + 2 + ((r.height - 4) * iy) / 2);
          if (px < 0 || py < 0 || px > window.innerWidth || py > window.innerHeight) continue;
          samples++;
          const t = document.elementFromPoint(px, py);
          if (!t) continue;
          const ctl = t.closest ? t.closest(SEL) : null;
          if (ctl && ctl !== el && !el.contains(ctl) && !ctl.contains(el)) {
            steal++;
            if (!stealWho) stealWho = (ctl.textContent || "").replace(/\s+/g, " ").trim().slice(0, 24);
          }
        }
      }
      return { steal, samples, stealWho };
    })(),
    hit,
    topEl: top ? chain[0] : "(nothing)",
    chain: chain.slice(0, 6).join(" < "),
    label: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
    chip: el.getAttribute("data-chip") || null,
    on: el.hasAttribute("data-on"),
    href: el.getAttribute("href") || null,
  };
}

/**
 * Run every geometry/hit arm over one VIEW of a surface.
 *
 * ⭐ THERE ARE TWO VIEWS AND BOTH ARE REAL. Below `sm` a page shows a BAR with the sheet
 * closed, and shows the SHEET once the player opens it. They contain different controls in
 * different boxes, and a defect in one is invisible in the other:
 *   · the `/markets` 360 defect that opened this driver's account — the `New` status chip
 *     sitting under the result count, tap-proven to do nothing — exists ONLY in the closed
 *     view, because opening the sheet correctly makes the bar behind it unreachable;
 *   · every duration chip on `/updown` at phone width exists ONLY in the sheet view.
 * ⛔ Measuring one and calling it "the surface" is the wrong-population error in miniature.
 */
async function runView(page, base, s, view, attempt = 1) {
  /* ⭐ TWO PASSES, AND THE SPLIT IS FORCED BY THE SHEET'S OWN SCROLLER.
     PASS 1 measures every control at ONE shared scroll position, because DISJOINT compares
     boxes and boxes measured at different scroll offsets cannot be compared — a chip
     scrolled 200px since its neighbour was read will "overlap" it arithmetically while
     sitting nowhere near it.
     PASS 2 asks the hit questions, and those need the opposite: the sheet body scrolls, so
     a chip currently under the sticky "Show N markets" footer is reachable by a player who
     scrolls to it, and hit-testing it where it happens to be parked reports a defect that
     does not exist. So pass 2 scrolls each control into view first, exactly as a finger
     would, and only then asks what is on top of it. */
  const els = await page.locator(CONTROL_SEL).all();
  const seen = [];
  const pairs = [];
  for (const el of els) {
    let m;
    try { m = await el.evaluate(HIT_PROBE, { scroll: false }); } catch { continue; }
    if (!m || m.skip) continue;
    if (m.w === 0 || m.h === 0 || m.visibility === "hidden") continue;
    seen.push(m);
    pairs.push({ el, m });
  }
  // PASS 2 — scroll-then-hit, per control.
  for (const pr of pairs) {
    try {
      const m2 = await pr.el.evaluate(HIT_PROBE, { scroll: true });
      /* ⭐ KEEP BOTH ANSWERS — THEY ARE DIFFERENT QUESTIONS ABOUT THE SAME CHIP.
         `hitRest` is where the control SITS when the page settles, which is what a player meets
         without being told to scroll; `hit` is whether it can be reached at all once scrolled to.
         ⛔ Overwriting the first with the second hid the very defect this driver first proved by
         tapping: the `/markets` `New` chip at 360 sits under the result count, a tap at its centre
         does nothing, and scrolling the strip cures it — so "after scrolling" reports a clean page
         about a control that is dead where the player finds it. */
      if (m2 && !m2.skip) {
        pr.m.hitRest = pr.m.hit; pr.m.stealRest = pr.m.steal; pr.m.stealWhoRest = pr.m.stealWho;
        pr.m.hit = m2.hit; pr.m.topEl = m2.topEl; pr.m.chain = m2.chain;
        pr.m.steal = m2.steal; pr.m.samples = m2.samples; pr.m.stealWho = m2.stealWho;
        pr.m.x = m2.x; pr.m.y = m2.y;
      }
    } catch { /* keep pass-1 answer */ }
  }

  if (seen.length === 0) {
    /* ⚠️ NOT a failure in the CLOSED view of a phone: below `sm` every filter legitimately lives
       inside the sheet, so an empty closed bar is the design. It IS a failure anywhere else —
       a surface that renders no reachable filter at all is the thing this driver exists to catch. */
    if (view === "closed" && base.width < 640) return [];
    /* 🔴 RETRY ONCE BEFORE CALLING A SURFACE EMPTY — A FLAKY GATE IS AN IGNORED GATE.
       This driver has twice reported "no filter control rendered at all" across a RUN of
       consecutive surfaces, and both times the product was fine: `next dev` compiles on demand
       and this machine degrades under sustained Playwright load, so a late surface can be asked
       for its controls while the server is still producing them. ⚠️ A cascade of identical
       PRESENT failures at the tail of a run is that signature, not four simultaneous defects —
       and it is indistinguishable from a catastrophic product failure, which is the most
       expensive kind of false finding there is. One reload settles it: a surface that is really
       empty is empty twice. */
    if (attempt === 1) {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 45_000 }).catch(() => {});
      await page.waitForSelector(CONTROL_SEL, { state: "attached", timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(1200);
      if (view === "sheet") await openFilterDisclosure(page);
      return runView(page, base, s, view, 2);
    }
    record({ ...base, arm: "PRESENT", ok: false, detail: `no filter control rendered at all (view: ${view}, 2 attempts)` });
    return [];
  }
  record({ ...base, arm: "PRESENT", ok: true, detail: `${seen.length} control(s) — view: ${view}` });

  for (const m of seen) {
    const who = `"${m.label}"${m.chip ? ` [${m.chip}]` : ""}`;
    if (!m.onscreen) {
      // ⚠️ A chip inside a scroller is reachable — the strip exemption. Only a control
      // that NOTHING can scroll into view is genuinely unreachable.
      /* ⚠️ VERTICAL IS NOT THE QUESTION. A control below the fold is reached by scrolling the
           PAGE — every long page has them, and `/positions`' sort arrow at y=1025 in a 900px
           viewport is not a defect. What cannot be reached is a control drawn outside its
           container HORIZONTALLY with nothing able to scroll to it. */
      const offHoriz = m.left < -0.5 || m.right > base.width + 0.5;
      if (!m.inScroller && offHoriz) {
        record({ ...base, arm: "ONSCREEN", ok: false, detail: `${who} box ${m.left}->${m.right} x ${m.top}->${m.bottom} vs viewport ${base.width}x900` });
      }
      continue; // either way it cannot meaningfully be hit-tested where it now sits
    }
    if (m.pointerEvents === "none") {
      record({ ...base, arm: "LIVE", ok: false, detail: `${who} pointer-events:none at rest` });
    }
    if (m.h + 0.5 < FLOOR || m.w + 0.5 < FLOOR) {
      record({ ...base, arm: "FLOOR", ok: false, detail: `${who} ${m.w}x${m.h} < ${FLOOR}` });
    }
    if (!m.hit) {
      record({ ...base, arm: "HIT", ok: false, detail: `${who} centre (${m.x},${m.y}) hits ${m.topEl} — chain: ${m.chain}` });
    } else if (m.hitRest === false && !m.scrolledOut && !m.coveredByFixed) {
      /* Reachable, but not where the player finds it: something covers its centre at rest and
         only scrolling moves it clear. A control you must discover a scroll to use reads as a
         control that ignored you. */
      record({ ...base, arm: "ATREST", ok: false, detail: `${who} is covered where it sits — a tap at its resting centre lands elsewhere; only scrolling frees it` });
    }
    /* ⭐ THE ARM THAT MEASURES THE COMPLAINT ITSELF. A centre that hits is not enough:
       the player aims at a LABEL, not at a centroid. This samples the control's visible
       box and asks how many of those points land on a DIFFERENT filter control.
       🔴 It is the only arm that can see a rounded-corner steal — hit-testing respects
       `border-radius`, and `.pchart-range` is an 11px-mono chip carrying `--r-pill`
       (999px) at 30–37px wide, so its corners belong to whatever is behind them. With a
       1–2px gap to its neighbour, "behind them" is the next chip along. */
    if (m.steal > 0) {
      record({ ...base, arm: "STEAL", ok: false, detail: `${who} — ${m.steal}/${m.samples} taps inside its own box select "${m.stealWho}" instead` });
    }
  }

  // DISJOINT — no two control boxes may intersect.
  for (let i = 0; i < seen.length; i++) {
    for (let j = i + 1; j < seen.length; j++) {
      const a = seen[i], b = seen[j];
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 1 && oy > 1) {
        record({ ...base, arm: "DISJOINT", ok: false, detail: `"${a.label}" and "${b.label}" overlap by ${Math.round(ox)}x${Math.round(oy)}px` });
      }
    }
  }

  await page.screenshot({ path: `${SHOTS}/${s.id.replace(/\W+/g, "-").replace(/^-|-$/g, "")}-${base.width}-${base.locale}-${view}.png` });
  return seen;
}

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();

  for (const width of WIDTHS) {
    for (const locale of LOCALES) {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 },
        deviceScaleFactor: 1,
        // The product reads its locale from a cookie; setting it here avoids a click-through
        // that would itself be a navigation this driver has to reason about.
        locale: locale === "sw" ? "sw-TZ" : "en-US",
      });
      /* 🔴 `kp-locale`, NOT `locale` — AND THE `<html lang>` ASSERTION BELOW IS WHY THIS WAS
         CAUGHT. The driver spent an entire session setting a cookie this product does not read,
         so every run labelled `sw` was measuring ENGLISH and reporting it green. ⚠️ Swahili is
         where a wrap defect shows FIRST — this repo measures its short labels at 1.74x p90 and
         2.25x p95 against English — so the locale that mattered most was the one never tested,
         and nothing in the output looked wrong. A screenshot caught it: the header read "EN"
         on a page the log called `sw`.
         ⛔ A LOCALE THE DRIVER CANNOT PROVE IT SET IS A LOCALE IT DID NOT TEST.
         `qa:bar-geometry` had both the right cookie name and the `lang` check already; this
         driver now borrows both rather than trusting a cookie to have worked. */
      await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
      const page = await ctx.newPage();
      // The two exemption predicates, installed before any document script runs so they
      // survive every navigation in this context.
      await page.addInitScript(`window.__IS_CHROME = ${IS_CHROME.toString()}; window.__REACHABLE = ${REACHABLE.toString()}; window.__IN_SCROLLER = ${IN_SCROLLER.toString()}; window.__SCROLLED_OUT = ${SCROLLED_OUT.toString()};`);
      /* ⛔ PIN `/updown` TO ITS CHART VIEW, OR ITS SECOND TIME RAIL IS INVISIBLE TO THIS GATE.
         `BoardViz` opens on CUBES whenever the board has recent outcomes, and the chart's
         range rail (`.pchart-range`) only exists in the CHART view — so whether this driver
         measures it depends on the FIXTURE'S DATA, not on the code under test. It was measured
         on one run and absent on the next, which is how a control comes to have no gate at all.
         ⚠️ That rail is exactly where the reported confusion lives: it offers `15M/30M/1H`
         beside a board whose durations are `15 min/30 min/60 min`. Pinning the view makes its
         geometry a fact this gate always checks. (Measured before pinning: the chips rendered
         30.1–37.1px wide against the platform's own 44px floor.) */
      await page.addInitScript(() => { try { localStorage.setItem("kp-updown-viz", "chart"); } catch {} });

      // One signed-in demo session per context — the rails differ for a signed-out viewer.
      await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded" });

      for (const s of surfaces) {
        try {
          await page.goto(`${BASE}${s.path}`, { waitUntil: "networkidle", timeout: 45_000 });
        } catch {
          // networkidle can never settle on a page that polls; domcontentloaded + a settle beat
          // is the honest fallback rather than recording a failure the product did not cause.
          await page.goto(`${BASE}${s.path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
        }
        /* ⛔ WAIT FOR THE CONTROLS, DO NOT GUESS AT A DELAY. `/markets` streams its board through
           a Suspense boundary, so a fixed settle beat races the render: a run that looked one
           beat early reported "no filter control rendered at all" on TEN correct surfaces at once
           — an instrument failure that reads exactly like a catastrophic product failure, which
           is the most expensive kind of false finding there is. ⚠️ `state: "attached"`, not
           "visible": below `sm` every chip lives inside a CLOSED sheet and is attached but not
           visible, so waiting for visibility would time out on precisely the phone widths this
           driver exists to measure. */
        await page.waitForSelector(CONTROL_SEL, { state: "attached", timeout: 20_000 }).catch(() => {});
        await page.waitForTimeout(900);

        /* ⛔ PROVE THE LOCALE BEFORE MEASURING IN ITS NAME. See the cookie note above. */
        const lang = await page.evaluate(() => document.documentElement.lang);
        const wantLang = { en: "en", sw: "sw", zh: "zh" }[locale] ?? locale;
        if (lang !== wantLang) {
          record({ surface: s.id, width, locale, arm: "LOCALE", ok: false, detail: `asked for ${locale}, page rendered <html lang="${lang}"> — every measurement under this label would be about the wrong language` });
          continue;
        }

        const base = { surface: s.id, width, locale };

        /* ⭐ DISCLOSE THE FILTERS — THIS IS WHERE THE PHONE PLAYER ACTUALLY TAPS.
           🔴 Under `sm` the product deliberately swaps its rails for a `FilterSheet`, which is a
           `<details>`. Its options are therefore UNDISCLOSED, `REACHABLE` correctly drops them,
           and a survey of the CLOSED page reports "no filter control rendered at all" for
           `/updown` at 360 and 414 — the two widths this product is mostly used at.
           ⛔ A gate that cannot see the phone's filters is a gate over the wrong population,
           which is exactly how the reported defect survived every existing check.

           ⛔ AND IT MUST BE DISCLOSED DELIBERATELY, NOT BY OPENING EVERY `<details>` ON THE PAGE.
           The first `<details>` in this document is the LANGUAGE menu ("EN"); opening it throws a
           panel over the page, Playwright then finds the sheet's own trigger obscured, the click
           times out, and the run reports "1 disclosure opened" having opened the wrong one and
           measured nothing. ⚠️ That false pass cost a cycle. So: close everything, then open the
           ONE disclosure that actually contains filter chips. */
        /* VIEW 1 — the bar exactly as the page loads it, sheet CLOSED. What a player sees first. */
        const seenClosed = await runView(page, { ...base, view: "closed" }, s, "closed");

        /* VIEW 2 — the sheet disclosed, which is where a phone's filters actually live. */
        const opened = await openFilterDisclosure(page);
        const seenSheet = opened ? await runView(page, { ...base, surface: `${base.surface}[sheet]`, view: "sheet" }, s, "sheet") : [];

        // ── IDENTITY · tap the centre and check the state names the chip that was tapped ────
        if (DO_CLICK) {
          /* ⛔ DO NOT SKIP THE CHIPS THAT FAILED `HIT`. They are the entire point: a control
             whose centre resolves to something else is the claim, and tapping it is the proof.
             Filtering them out here would make the arm confirm only what already works — the
             vacuity trap, pointed at the one case that matters. Already-selected chips are
             skipped because re-tapping them asserts nothing. */
          /* ⭐ BOTH VIEWS' CONTROLS ARE TAPPED. On a phone the durations exist only inside the
             sheet, so an identity arm fed the closed bar alone would prove nothing about the
             very chips the complaint names. De-duplicated by href, because a chip that appears
             in both views is one control. */
          const merged = [...seenClosed, ...(seenSheet ?? [])];
          const byHref = new Map();
          for (const m of merged) if (m.href && !m.on && m.onscreen && !byHref.has(m.href)) byHref.set(m.href, m);
          const tappable = [...byHref.values()];
          for (const m of tappable) {
            try {
              await page.goto(`${BASE}${s.path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
              await page.waitForTimeout(1000);
              // ⛔ The navigation CLOSED the sheet, and a chip inside a closed sheet is not
              // tappable — re-disclose before aiming, or the arm silently measures nothing on
              // exactly the widths it was added for.
              await openFilterDisclosure(page);
              // Re-measure: the box must be read on THIS load, not the survey load.
              const live = await page.locator(CONTROL_SEL).all();
              let target = null;
              for (const el of live) {
                let mm; try { mm = await el.evaluate(HIT_PROBE); } catch { continue; }
                if (mm.w === 0 || mm.h === 0) continue;
                if (mm.href === m.href && mm.label === m.label) { target = mm; break; }
              }
              if (!target || !target.onscreen) continue;
              await page.mouse.click(target.x, target.y);
              await page.waitForTimeout(1400);
              const after = await page.evaluate(() => ({
                url: location.pathname + location.search,
                on: Array.from(document.querySelectorAll("[data-on]")).map((n) => ({
                  label: (n.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
                  href: n.getAttribute("href"),
                })),
              }));
              const want = m.href.startsWith("http") ? new URL(m.href).pathname + new URL(m.href).search : m.href;
              const urlOk = after.url === want;
              const selOk = after.on.some((o) => o.href === m.href || o.label === m.label);
              record({
                ...base, arm: "IDENTITY", ok: urlOk && selOk,
                detail: urlOk && selOk
                  ? `tapping "${m.label}" selects "${m.label}"`
                  : `TAPPED "${m.label}" (${want}) -> url ${after.url}${selOk ? "" : `, selected [${after.on.map((o) => o.label).join(", ")}]`}`,
              });
            } catch (e) {
              record({ ...base, arm: "IDENTITY", ok: false, detail: `"${m.label}" threw: ${String(e).slice(0, 120)}` });
            }
          }
        }
      }
      await ctx.close();
    }
  }

  await browser.close();

  const fails = results.filter((r) => !r.ok);
  console.log(`\n${"=".repeat(78)}`);
  console.log(`tap-truth — ${results.length} checks, ${fails.length} FAILED`);
  if (fails.length) {
    const byArm = {};
    for (const f of fails) byArm[f.arm] = (byArm[f.arm] ?? 0) + 1;
    console.log(`by arm: ${Object.entries(byArm).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
    const bySurface = {};
    for (const f of fails) bySurface[f.surface] = (bySurface[f.surface] ?? 0) + 1;
    console.log(`by surface: ${Object.entries(bySurface).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
  }
  console.log(`shots: ${SHOTS}`);
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
