/**
 * `npm run qa:dg-rail` — DRIVE A SECTION RAIL ON PRODUCTION. §K rule 7, DG-S-03/07/08.
 *
 * ⛔ THIS FILE IS TRACKED, AND THAT IS THE POINT. The step-5 handover told the next session to
 * re-derive the rail's numbers with `node .qa-design-gate/verify-live.mjs` and the cn() blast
 * radius with `.qa-design-gate/cn-collision2.mjs` — both under a GITIGNORED directory. They
 * existed on exactly one machine and were gone the moment anyone else pulled. A document that
 * hands out a file nobody else can have cannot be acted on, so the instrument moved into
 * `scripts/` where it travels and where `test:orphans` can see it.
 *
 * ⭐ THE DEPLOY DETECTOR IS THE RAIL'S OWN GEOMETRY. `/api/health` reports no SHA on this
 * platform, so a drive cannot ask what is deployed. The kit rung is 44px and every hand-rolled
 * rail it replaced was taller (`players/[id]` was 52). A run that still measures the old height
 * SAYS SO and refuses to present its numbers as a result — this programme has already recorded
 * a drive that ran before its own deploy and filed the answer as a finding.
 *
 * ⛔ IT MEASURES IN TWO PHASES, AND BOTH POSSIBLE ORDERS PRODUCED A CONFIDENT WRONG NUMBER
 * BEFORE THIS ONE. Scrolling the rail into view and THEN reading `scrollLeft` reports 0 on a
 * rail that is plainly scrolled, because `scrollIntoView` resets horizontal scroll. Reading
 * everything without scrolling reports 0 of 6 reachable on a rail that is perfectly reachable,
 * because it sits ~400px down and every hit-test point is off screen. Neither order is the
 * "safe" one — see the note at the measurement. An instrument that contradicts itself inside a
 * single run is worse than no instrument, because its numbers look like findings.
 *
 * Usage:
 *   ROUTE=/admin/system npm run qa:dg-rail
 *   ROUTE="/admin/players/usr_x?tab=audit" W=390 npm run qa:dg-rail
 *   ⚠️ On Git Bash prefix with MSYS_NO_PATHCONV=1 or a leading-slash ROUTE is rewritten to a
 *      Windows path and the drive navigates to `https://host/c/Program%20Files/...`.
 */
import { chromium } from "playwright";
import { login, BASE } from "../live/harness.mjs";

const ROUTE = process.env.ROUTE;
const W = Number(process.env.W || 1440);
if (!ROUTE) { console.error("ROUTE is required, e.g. ROUTE=/admin/system"); process.exit(2); }

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: 844 } });
const page = await ctx.newPage();
/* Production needs longer than playwright's 30s default to reach `networkidle`, which
   `login()` waits for; a shorter timeout reads as a broken sign-in page on a page that is fine. */
page.setDefaultNavigationTimeout(120_000);
page.setDefaultTimeout(60_000);

let bad = 0;
try {
  await login(page, "admin");
  await page.goto(BASE + ROUTE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const m = await page.evaluate(() => {
    const nav = document.querySelector("[data-section-rail]");
    if (!nav) return { found: false, legacy: !!document.querySelector("nav[aria-label]") };
    /**
     * ⭐ TWO PHASES, AND BOTH ORDERS WERE WRONG ONCE.
     *
     * PHASE 1 — READ `scrollLeft` BEFORE ANYTHING TOUCHES THE PAGE. A draft that scrolled the
     * rail into view first and then read it reported **0** while the rail was demonstrably
     * scrolled, because `scrollIntoView` resets horizontal scroll. That number is the whole
     * proof of the 390 fix, so it is taken while the page is untouched.
     *
     * PHASE 2 — THEN bring the rail on screen before hit-testing. The opposite draft skipped
     * the scroll entirely and reported **0 of 6 reachable** on a rail that is perfectly
     * reachable: it sits ~400px down, so every option's centre was outside the viewport and
     * `elementFromPoint` was being asked about a point that is not on screen.
     * ⛔ Neither reading is "safer" — each is a confident wrong number, and one order cannot
     * serve both. So: horizontal truth first, then vertical reachability.
     */
    const scrollLeft = Math.round(nav.scrollLeft);
    const cs = getComputedStyle(nav);
    const nbPre = nav.getBoundingClientRect();
    const activePre = nav.querySelector('[data-tab-active="true"]');
    const abPre = activePre ? activePre.getBoundingClientRect() : null;
    const activeFullyVisiblePre = abPre
      ? abPre.left >= nbPre.left - 1 && abPre.right <= nbPre.right + 1
      : null;

    nav.scrollIntoView({ block: "center" });          // phase 2 begins
    const nb = nav.getBoundingClientRect();
    const active = nav.querySelector('[data-tab-active="true"]');
    const opts = [...nav.querySelectorAll("a")].map((a) => {
      const bb = a.getBoundingClientRect();
      const cx = bb.left + bb.width / 2, cy = bb.top + bb.height / 2;
      /* ⛔ `elementFromPoint`, never a bounding box. A box says "painted"; only a hit-test says
         "reachable", and this rail's whole 390 defect was options that painted and could not
         be reached. A centre outside the viewport is reported as such, never clamped. */
      const inView = cx >= 0 && cx <= innerWidth && cy >= 0 && cy <= innerHeight;
      const hit = inView ? document.elementFromPoint(cx, cy) : null;
      return {
        label: (a.textContent || "").trim().slice(0, 22),
        h: Math.round(bb.height),
        current: a.getAttribute("aria-current"),
        reachable: !!(hit && a.contains(hit)),
      };
    });
    const first = nav.querySelector("a");
    first?.focus();
    return {
      found: true,
      scrollLeft,
      scrollx: nav.className.includes("scrollx"),
      overflowX: cs.overflowX, overflowY: cs.overflowY,
      clientW: nav.clientWidth, scrollW: nav.scrollWidth,
      pct: Math.round((nav.scrollWidth / nav.clientWidth) * 100),
      itemH: opts[0]?.h ?? null,
      activeLabel: active ? (active.textContent || "").trim().slice(0, 22) : null,
      /* ⚠️ From PHASE 1 — measured before the page was touched, for the reason in the note above. */
      activeFullyVisible: activeFullyVisiblePre,
      ariaCurrent: opts.filter((o) => o.current === "page").length,
      reachable: opts.filter((o) => o.reachable).length,
      total: opts.length,
      outlineOffset: first ? getComputedStyle(first).outlineOffset : null,
      /* A VERTICAL SCROLLBAR ON A HORIZONTAL RAIL — see the assertion below. */
      vGutter: nav.offsetWidth - nav.clientWidth,
      vOverflow: nav.scrollHeight - nav.clientHeight,
      itemRadius: first ? getComputedStyle(first).borderRadius : null,
      opts,
    };
  });

  if (!m.found) {
    console.log(`🔴 no [data-section-rail] on ${ROUTE}${m.legacy ? " — a hand-rolled <nav> is still there, i.e. the OLD build" : ""}`);
    process.exit(1);
  }

  /**
   * ⛔ THE KIT HAS TWO RAIL RUNGS, AND THIS DETECTOR KNEW ONLY ONE — SO IT CRIED WOLF.
   *
   * 44px is the LINE variant (§K rule 7c's section rail, `--h-control-md`). The CAPSULE variant
   * is 40px on purpose: `--tap-min`, the chip language every filter rail in the console already
   * wears. When `/admin/sources` took a capsule filter on 2026-09-02 this printed *"🔴 OLD build
   * … the numbers below are NOT a result"* over a rail that was correctly deployed and whose
   * numbers were perfectly good — 8/8 reachable, one `aria-current`.
   *
   * ⭐ That is the worse failure of the two directions. A guard that cries wolf teaches the next
   * person to read past it, and the next thing they read past will be real. The rungs are named
   * here rather than widened to "any height": a rail at 32px is still an old build, and the
   * message now says WHICH rung it matched so the reader is never guessing.
   */
  const RAIL_RUNGS = { 44: "line · section rail", 40: "capsule · filter rail" };
  const rung = RAIL_RUNGS[m.itemH];
  const deployed = !!rung;
  console.log(`\n${ROUTE}  @${W}`);
  console.log(`  DEPLOY        item ${m.itemH}px → ${deployed ? `NEW build (${rung})` : "🔴 OLD build (the kit rungs are 44 line / 40 capsule) — the numbers below are NOT a result"}`);
  console.log(`  rail          ${m.scrollW}px in ${m.clientW}px (${m.pct}%) · overflow ${m.overflowX}/${m.overflowY} · scrollx ${m.scrollx}`);
  /* 🔴 A SCROLLBAR THAT MOVES NOTHING (Ali, 2026-09-02). `overflow-x: auto` makes CSS compute
     `overflow-y: auto` too, and the travelling underline used to sit ONE PIXEL below the content
     box — enough vertical overflow for the browser to paint a full vertical scrollbar that
     `.scrollx` then styles into visibility. A draggable control that moves nothing is worse than
     no affordance: it invites a gesture and answers with nothing. Both halves are asserted, so a
     revert of either is named rather than merely re-appearing on screen. */
  const vClean = m.vGutter === 0 && m.vOverflow <= 0;
  console.log(`  no v-scroller  gutter ${m.vGutter}px · vertical overflow ${m.vOverflow}px · overflow-y ${m.overflowY}  ${vClean ? "✓" : "🔴 A VERTICAL SCROLLBAR ON A HORIZONTAL RAIL"}`);
  if (!vClean) bad++;
  /* ⭐ AND THE HIGHLIGHT IS ROUNDED ON ALL FOUR CORNERS. A square-bottomed fill inside a rounded
     card collides with the card radius at the first option and reads as a rendering fault; the
     focus ring follows the same radius, so it was half-rounded with it. */
  const radii = (m.itemRadius || "").split(/[ /]/).filter(Boolean);
  const allRound = radii.length > 0 && radii.every((r) => parseFloat(r) > 0);
  console.log(`  item radius    ${m.itemRadius}  ${allRound ? "✓ rounded on all corners" : "🔴 a square corner inside a rounded card"}`);
  if (!allRound) bad++;
  console.log(`  active        "${m.activeLabel}" · scrollLeft ${m.scrollLeft} · fully visible ${m.activeFullyVisible}`);
  console.log(`  announced     aria-current="page" ×${m.ariaCurrent}`);
  console.log(`  reachable     ${m.reachable}/${m.total} by elementFromPoint`);
  console.log(`  focus ring    outline-offset ${m.outlineOffset}  (⛔ must be negative: the rail clips both axes)`);
  for (const o of m.opts) console.log(`     ${o.reachable ? "·" : "✗"} ${o.label.padEnd(24)} ${o.current === "page" ? "← current" : ""}`);

  if (!deployed) bad = 1;
  if (m.ariaCurrent !== 1) { console.log(`\n🔴 exactly one option must be current; found ${m.ariaCurrent}`); bad = 1; }
  if (m.activeFullyVisible === false) { console.log("\n🔴 the CURRENT section is not fully visible — an officer cannot see where they are"); bad = 1; }
  if (!String(m.outlineOffset).startsWith("-")) { console.log("\n🔴 the focus ring is OUTSET inside a clipping rail — it will be cut away"); bad = 1; }
  if (!bad) console.log("\n✅ the rail names the section in force, shows it, and can be focused.");
} catch (e) {
  console.log("FAILED:", String(e).slice(0, 250), "\nurl:", page.url());
  bad = 1;
} finally {
  await browser.close();
}
process.exit(bad);
