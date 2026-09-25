/**
 * U37 · THE MARKET DETAIL PAGE ON A PHONE — reading order (D40) and the money hints (D41).
 *
 *   npm run qa:detail-order-hints -- https://www.50pick.tz
 *   RED_ORDER=1  §1  puts the bet panel back AFTER the content column in the DOM
 *   RED_HEAD=1   §2  strips the bet panel's own heading and its accessible name
 *   RED_FIT=1    §3  restores `white-space: nowrap` on the explanation
 *   RED_TAP=1    §4  shrinks the trigger back to the bare 14x10 glyph box
 *
 * ⛔ SIGNED IN, AND WITH A SIDE ALREADY PICKED (`?side=YES`). Both defects live in the bet
 * panel, and the bet panel only renders the dial for a signed-in player on a LIVE market.
 * A signed-out run finds the guest CTA instead: §1 and §2 still hold there, §3 and §4 have
 * NOTHING TO MEASURE and would report a confident zero. So the cell asserts the three hints
 * are present before it believes anything they say.
 *
 * ── §1 · D40 · READING ORDER MATCHES VISUAL ORDER ────────────────────────────────────────────
 * The two-column layout is a flex column on a phone with `order-*` deciding what a player SEES.
 * `order` does not move the DOM, so what a screen reader, a keyboard and reader mode get is the
 * source order — and the bet panel was DOM child 1 while it painted FIRST. Measured on
 * production 2026-09-25 at 320/360/412 x sw/en/zh: DOM [0,1,2], visual [1,0,2], nine cells out
 * of nine. ⛔ THE GRID HAS THREE CHILDREN, NOT TWO — `similar markets` is `order-3` inside the
 * same grid (`page.tsx:925`), so a check written for a pair silently ignores a third of it.
 *
 * ── §2 · D40's SECOND HALF · THE PANEL HAS A NAME ────────────────────────────────────────────
 * Announced last was only half the defect. The `<aside>` carried NO accessible name and, for a
 * signed-in player, NO heading at all — its three state headings are `<h3>`, and in the dial
 * branch there is not even one. So the bet widget was read under whichever `<h2>` came last:
 * measured, "Kigezo cha utatuzi" / "Resolution criterion". The money control on the page sat
 * under the heading for the small print.
 * ⛔ ASSERT THE HEADING, NOT JUST THE NAME. `aria-label` alone satisfies a name check and leaves
 * the outline still broken, which is how a player navigating BY HEADING keeps missing it.
 *
 * ── §3 · D41 · THE MONEY EXPLANATION MUST FIT AND WRAP ───────────────────────────────────────
 * Measured on production 2026-09-25, signed in, 320 sw: the commission hint is ONE LINE 1392.8px
 * wide in a 320px viewport — **23% of it readable**. 26% at 360 sw, 25% at 360 en. The rest is
 * not merely off-screen: `body { overflow-x: clip }` means the page CANNOT be scrolled to it.
 * ⛔ AND IT RENDERS IN CAPITALS. `.kp-tooltip-popover` sets font, size and letter-spacing but
 * never `text-transform`, so it inherits `uppercase` from the eyebrow label it hangs off:
 * 201 characters of fee copy in 11px ALL-CAPS mono. The cell never named that.
 * ⚠️ NOT A §5 OVERFLOW BREACH, AND THIS NEARLY WENT IN THE REGISTER AS ONE. `body.scrollWidth`
 * reads 763 against a 320 viewport — 443px — and the control with the dial absent reads exactly
 * 320, so the popovers are unambiguously the cause. But `scrollX` stays **0** at both widths and
 * at both scroll positions: the clip means the page never actually moves. `qa:signup-funnel` §1
 * already warns that `body.scrollWidth` over-reports for clipped content; this is that.
 *
 * ── §4 · D41 · THE TRIGGER IS A CONTROL, SO IT OBEYS THE TAP FLOOR ───────────────────────────
 * Measured 14x10 at every width and locale — 140px of hit area against Law 9's `--tap-min` 40px
 * (1600px). ⛔ THE ASSERTION IS ELEMENTFROMPOINT, NOT THE BOX. A box can measure 40 and still be
 * unreachable, and `.kp-tooltip` is a `tabIndex=0` span whose own box is the glyph plus a
 * margin. The probe walks the four edges of a `--tap-min` square and requires each to land on
 * the trigger or inside it. ⛔ AND IT SCROLLS THE TRIGGER INTO VIEW FIRST: elementFromPoint
 * returns null for a point outside the viewport, and the hints sit at y 830-1046 on a 780px
 * screen, so an unscrolled probe reads five nulls and calls it a miss.
 *
 * ⛔ EVERY RED CONTROL MUST BREAK ITS OWN SECTION AND ONLY ITS OWN. A green RED run exits 2 as a
 * broken harness, because a control that cannot reproduce its defect certifies nothing.
 */
import { LOCALE_COOKIE, assertLang } from "./qa-locale.mjs";

const BASE = process.argv[2] || process.env.BASE || "https://www.50pick.tz";

/**
 * ⛔ THE HARNESS READS ITS TARGET FROM `LIVE_BASE`, AND THIS DRIVER READS ITS OWN FROM argv.
 * Two sources of truth for one address. Run without the env var and `loginOnce` signs in
 * against `http://localhost:3001` while every measurement is taken against production — and
 * §0a warns that failure "reads exactly like a bad password". It cost this run one attempt.
 * So the env var is set from the resolved BASE BEFORE the harness module is evaluated (a static
 * import is hoisted, which is why this one is dynamic), and then the two are asserted equal.
 */
process.env.LIVE_BASE = BASE;
const { loginOnce, browser: launch, BASE: HARNESS_BASE } = await import("./live/harness.mjs");
if (HARNESS_BASE !== BASE) {
  console.log(`
⛔ TARGET MISMATCH: this driver measures ${BASE} but the harness signs in against ${HARNESS_BASE}.`);
  process.exit(2);
}
const RED_ORDER = process.env.RED_ORDER === "1";
const RED_HEAD = process.env.RED_HEAD === "1";
const RED_FIT = process.env.RED_FIT === "1";
const RED_TAP = process.env.RED_TAP === "1";
const RED_FLOOR = process.env.RED_FLOOR === "1";
const RED = RED_ORDER || RED_HEAD || RED_FIT || RED_TAP || RED_FLOOR;
const SECTION = { RED_ORDER: "1", RED_HEAD: "2", RED_FIT: "3", RED_TAP: "4", RED_FLOOR: "5" };
const activeRed = Object.keys(SECTION).find((k) => process.env[k] === "1");

const WIDTHS = [320, 360, 412];
const LOCS = ["sw", "en", "zh"];
const failures = [];
const HINTS_EXPECTED = 3;

const LOCAL = /localhost|127\.0\.0\.1|\[::1\]/.test(BASE);
const { b } = await launch();

/**
 * ⭐ A GATE THAT CAN ONLY RUN AGAINST PRODUCTION CANNOT BE PROVEN RED BEFORE THE DEPLOY, and
 * that is the wrong way round: the four controls below must be shown to break their own sections
 * on a tree that is already FIXED, which on push day only exists locally. So the sign-in has two
 * doors — `mobile01` through the real form on production, `/auth/demo` on a dev server (where no
 * such player exists and the form would read as a bad password). ⛔ The dev door is dev-only by
 * the product's own rule: `/auth/demo` 404s under `next start` and in production.
 */
const state = await (async () => {
  if (!LOCAL) return loginOnce(b, "mobile01");
  const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const pg = await c.newPage();
  await pg.goto(BASE + "/auth/demo", { waitUntil: "load", timeout: 300000 });
  const st = await c.storageState();
  st.cookies = st.cookies.filter((k) => k.name !== "kp-locale");
  await c.close();
  console.log("  signed in through /auth/demo (local target)");
  return st;
})();

// A LIVE poll market, read off the board rather than pinned: a pinned id resolves and the
// whole driver then measures a settled page with no dial in it.
let marketId = process.env.MARKET_ID ?? null;
if (!marketId) {
  const ctx = await b.newContext({ storageState: state, viewport: { width: 390, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + "/markets", { waitUntil: "load", timeout: 120000 });
  await p.waitForTimeout(1500);
  const hrefs = await p.$$eval('a[href^="/markets/mkt_"]', (as) => as.map((a) => a.getAttribute("href")));
  const ids = [...new Set(hrefs.filter((h) => /^\/markets\/mkt_[a-z0-9]+$/i.test(h)).map((h) => h.split("/")[2]))];
  await ctx.close();
  if (!ids.length) {
    console.log("\n⛔ THE BOARD OFFERED NO MARKET LINK. Nothing was measured — this is not a pass.");
    process.exit(2);
  }
  // pick the first id whose detail page actually renders the dial
  for (const id of ids) {
    const c = await b.newContext({ storageState: state, viewport: { width: 360, height: 780 } });
    await c.addCookies([{ name: LOCALE_COOKIE, value: "sw", url: BASE }]);
    const pg = await c.newPage();
    await pg.goto(BASE + "/markets/" + id + "?side=YES", { waitUntil: "load", timeout: 120000 });
    await pg.waitForTimeout(1200);
    const ok = await pg.evaluate(() => !!document.querySelector('[data-testid="side-picker"]'));
    await c.close();
    if (ok) { marketId = id; break; }
  }
  if (!marketId) {
    console.log("\n⛔ NONE OF " + ids.length + " MARKETS RENDERED A BET PANEL. Nothing was measured.");
    process.exit(2);
  }
}
console.log("\n  market under test: " + marketId + "  ·  base " + BASE + (RED ? "  ·  RED " + activeRed : ""));

/** Reads everything both defects need, in one page evaluate. */
const READ = async (p) =>
  p.evaluate(async (args) => {
    const { TAPFALLBACK } = args;
    const r = { notes: [] };
    const main = document.querySelector("main") ?? document.body;
    r.clientWidth = document.documentElement.clientWidth;
    r.tapMin = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tap-min")) || TAPFALLBACK;
    r.picker = !!document.querySelector('[data-testid="side-picker"]');

    // ── the layout grid and its children ──
    const grid = [...main.querySelectorAll("div")].find((d) => String(d.className).includes("lg:grid-cols-[1fr_360px]"));
    r.gridFound = !!grid;
    if (grid) {
      const kids = [...grid.children].map((k, i) => ({
        domIndex: i,
        tag: k.tagName.toLowerCase(),
        top: Math.round(k.getBoundingClientRect().top + window.scrollY),
        order: getComputedStyle(k).order,
        holdsAside: k.tagName.toLowerCase() === "aside" || !!k.querySelector("aside"),
      }));
      r.kids = kids;
      r.visualOrder = [...kids].sort((a, z) => a.top - z.top).map((k) => k.domIndex);
      r.domOrder = kids.map((k) => k.domIndex);
    }

    // ── the bet panel's name and its place in the heading outline ──
    const aside = main.querySelector("aside");
    r.asideFound = !!aside;
    if (aside) {
      const labelledby = aside.getAttribute("aria-labelledby");
      const target = labelledby ? document.getElementById(labelledby) : null;
      const own = aside.querySelector("h1,h2,h3,h4,h5,h6");
      r.panel = {
        ariaLabel: aside.getAttribute("aria-label"),
        labelledby,
        labelledbyResolves: !!target,
        labelledbyText: target ? (target.textContent || "").trim() : null,
        headingLevel: own ? +own.tagName[1] : null,
        headingText: own ? (own.textContent || "").trim() : null,
      };
    }
    const hs = [...main.querySelectorAll("h1,h2,h3,h4,h5,h6")];
    r.outline = hs.map((h) => ({ lvl: +h.tagName[1], text: (h.textContent || "").trim().slice(0, 40), inAside: !!h.closest("aside") }));
    const firstAside = r.outline.findIndex((h) => h.inAside);
    const firstOutsideH2 = r.outline.findIndex((h) => !h.inAside && h.lvl === 2);
    /** null when the panel has no heading at all — that is §2's finding, not §1's. */
    r.panelHeadingBeforeContent = firstAside < 0 || firstOutsideH2 < 0 ? null : firstAside < firstOutsideH2;
    // a level skip: any heading more than one level below the deepest seen so far
    r.skips = [];
    let prev = null;
    for (const h of r.outline) {
      if (prev !== null && h.lvl > prev + 1) r.skips.push("h" + prev + " -> h" + h.lvl + " at " + JSON.stringify(h.text));
      prev = h.lvl;
    }

    // ── the hints: trigger reach and the explanation's fit ──
    const picker = document.querySelector('[data-testid="side-picker"]') ?? main;
    const triggers = [...picker.querySelectorAll("[data-hint-trigger], .kp-tooltip")];
    r.hintCount = triggers.length;
    r.hints = [];
    for (const [i, trig] of triggers.entries()) {
      trig.scrollIntoView({ block: "center" });
      await new Promise((res) => setTimeout(res, 220));
      const tb0 = trig.getBoundingClientRect();
      const half = r.tapMin / 2;
      const cx = tb0.left + tb0.width / 2;
      const cy = tb0.top + tb0.height / 2;
      const edges = [["c", cx, cy], ["L", cx - half + 1, cy], ["R", cx + half - 1, cy], ["U", cx, cy - half + 1], ["D", cx, cy + half - 1]];
      const reach = edges.map(([n, x, y]) => {
        if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) return { n, hit: "OFF-VIEWPORT" };
        const el = document.elementFromPoint(x, y);
        if (!el) return { n, hit: "NULL" };
        return { n, hit: el === trig || trig.contains(el) ? "HINT" : "<" + el.tagName.toLowerCase() + ">" };
      });

      // open it: a real button answers a click, the legacy span answers focus
      if (trig.tagName.toLowerCase() === "button") trig.click();
      else trig.focus();
      await new Promise((res) => setTimeout(res, 760));

      const panel =
        (trig.getAttribute("aria-controls") && document.getElementById(trig.getAttribute("aria-controls"))) ||
        trig.parentElement.querySelector("[data-hint-panel]") ||
        picker.querySelector("[data-hint-panel]") ||
        trig.querySelector(".kp-tooltip-popover");
      let pan = null;
      if (panel) {
        const pb1 = panel.getBoundingClientRect();
        await new Promise((res) => setTimeout(res, 260));
        const pb = panel.getBoundingClientRect();
        const cs = getComputedStyle(panel);
        const visible = Math.max(0, Math.min(r.clientWidth, pb.right) - Math.max(0, pb.left));
        pan = {
          w: +pb.width.toFixed(1),
          h: +pb.height.toFixed(1),
          left: Math.round(pb.left),
          right: Math.round(pb.right),
          stable: pb1.width.toFixed(1) === pb.width.toFixed(1),
          whiteSpace: cs.whiteSpace,
          textTransform: cs.textTransform,
          fontSize: cs.fontSize,
          opacity: cs.opacity,
          visibility: cs.visibility,
          chars: (panel.textContent || "").trim().length,
          readablePct: pb.width > 0 ? Math.round((visible / pb.width) * 100) : 0,
          clipsOwnText: panel.scrollWidth > panel.clientWidth + 1,
        };
      }
      r.hints.push({
        i,
        kind: trig.tagName.toLowerCase(),
        trigW: +tb0.width.toFixed(1),
        trigH: +tb0.height.toFixed(1),
        expanded: trig.getAttribute("aria-expanded"),
        reach,
        panel: pan,
      });
      // shut it again so the next hint measures its own state
      if (trig.tagName.toLowerCase() === "button") trig.click();
      else trig.blur();
      await new Promise((res) => setTimeout(res, 300));
    }
    // the panel's height, so the tap floor's cost in pixels is recorded rather than guessed
    const asideBox = aside ? aside.getBoundingClientRect() : null;
    r.panelHeight = asideBox ? Math.round(asideBox.height) : null;

    // §5 · EVERY control on the page against the tap floor.
    const SEL = 'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';
    r.controls = [];
    for (const el of main.querySelectorAll(SEL)) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      // ⛔ ONE POPULATION PER SECTION, OR NO CONTROL CAN EVER CERTIFY ONE. §4 and §5 both police the
      // tap floor, and §4's three hint triggers are a SUBSET of §5's whole page — so RED_TAP broke
      // §5 as well (27 checks) and RED_FLOOR broke §4 as well (54), and the harness refused both.
      // The rule was unsatisfiable, not the controls. §4 keeps the hints because its test is
      // STRICTER: it probes reach by `elementFromPoint`, which is what guards the `relative z-10`
      // the trigger needs — measured, a 40px square's bottom edge lands on the stake input, a later
      // sibling that wins the overlap without it. ⚠️ Nothing falls through: §4 asserts its population
      // is exactly HINTS_EXPECTED, so a missing trigger fails there rather than going unmeasured.
      if (el.hasAttribute("data-hint-trigger")) { r.hintTriggersSkipped = (r.hintTriggersSkipped || 0) + 1; continue; }
      // ⛔ SCROLL IT INTO VIEW FIRST, AND THIS IS NOT A REFINEMENT. `elementFromPoint` answers
      // null outside the viewport, and a rect read at the wrong scroll position puts the probe
      // point over WHATEVER HAPPENS TO BE THERE. The first version of this section skipped the
      // scroll: 32 of the page's controls were never measured at all, and the one "failure" it
      // did report was the conviction dial, whose centre resolved to an unrelated <a> because the
      // dial was below the fold. A guard that measures the wrong pixels is worse than one that
      // measures none, because its output reads like evidence.
      el.scrollIntoView({ block: "center" });
      await new Promise((res) => setTimeout(res, 60));
      const bx = el.getBoundingClientRect();
      if (bx.width === 0 && bx.height === 0) continue;
      // Law 9's own written exemption: a disabled control is not a tap target.
      const disabled = el.disabled === true || el.getAttribute("aria-disabled") === "true";
      // ⛔ THE ONE EXEMPTION THIS GATE ADDS, AND WHY IT IS NOT A LOOPHOLE. An `<a>` that sits
      // INSIDE a sentence is phrasing content: its box IS the line it is part of, and forcing it
      // to 40px would either break the paragraph or silently overlap the lines above and below.
      // Law 9 is written about CONTROLS. So a link with text on either side of it inside a <p>
      // is exempt and SAID SO in the output, never silently dropped — an exemption nobody can
      // see is how a gate stops policing the thing it was written for.
      const inProse = (() => {
        if (el.tagName !== "A") return false;
        const p = el.closest("p, li, summary");
        if (!p) return false;
        const text = (p.innerText || "").trim().length;
        const own = (el.innerText || "").trim().length;
        return text > own + 8; // the paragraph says more than the link does
      })();
      // ⛔ THE HIT AREA IS THE ELEMENT'S BOX **UNION ITS PSEUDO-ELEMENTS**, and getting this wrong
      // made this section convict a closed, shipped fix in all nine cells, twice.
      //   · First it judged `getBoundingClientRect` alone. That convicted the similar-markets
      //     cards' Details and share controls at 13x17 and 64x17 — but D28 gave each of those a
      //     40px `::after` reach, which is this project's sanctioned pattern, and §6 of the plan
      //     records that the card footer's gap and padding exist precisely to hold it. The reach
      //     is real; the ELEMENT's rect simply cannot see it.
      //   · Then it probed a 40px square by `elementFromPoint`. That convicted the same two
      //     controls again, for a reason that is not a defect either: they are NEIGHBOURS about
      //     20px apart, so a 40px square centred on one must overlap the other. Two adjacent
      //     controls cannot both own a clear 40px square, and Law 9 does not ask them to — it
      //     asks each to BE 40px.
      // So: read the pseudo-elements' own dimensions, the same accounting D28 used, and judge the
      // union. No neighbour can make this fail and no `::after` can hide from it.
      const pseudoBox = (which) => {
        const p = getComputedStyle(el, which);
        if (!p || p.content === "none" || p.content === "normal") return { w: 0, h: 0 };
        const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
        // A pseudo positioned by insets spans the element plus the (usually negative) insets.
        const w = num(p.width) || (bx.width - num(p.left) - num(p.right));
        const h = num(p.height) || (bx.height - num(p.top) - num(p.bottom));
        return { w: Math.max(0, w), h: Math.max(0, h) };
      };
      const pa = pseudoBox("::after"), pb = pseudoBox("::before");
      const hitW = Math.max(bx.width, pa.w, pb.w);
      const hitH = Math.max(bx.height, pa.h, pb.h);
      const viaPseudo = hitW > bx.width + 0.5 || hitH > bx.height + 0.5;
      // The centre probe is kept for ONE thing only: proving the control is not buried under a
      // non-interactive overlay. It is reported, never asserted — see the note in §5.
      const cx = bx.left + bx.width / 2, cy = bx.top + bx.height / 2;
      const centre = (() => {
        if (cx < 0 || cy < 0 || cx >= window.innerWidth || cy >= window.innerHeight) return "OFF";
        const hitEl = document.elementFromPoint(cx, cy);
        if (!hitEl) return "NULL";
        return hitEl === el || el.contains(hitEl) ? "OK" : "<" + hitEl.tagName.toLowerCase() + ">";
      })();
      r.controls.push({
        tag: el.tagName.toLowerCase(),
        name: (el.getAttribute("aria-label") || (el.innerText || "").trim() || el.getAttribute("href") || "").replace(/\s+/g, " ").slice(0, 34),
        w: +bx.width.toFixed(1), h: +bx.height.toFixed(1),
        disabled, inProse,
        cls: String(el.className).slice(0, 40),
        hitW: +hitW.toFixed(1), hitH: +hitH.toFixed(1), viaPseudo, centre,
        offscreen: centre === "OFF",
      });
    }
    return r;
  }, { TAPFALLBACK: 40 });

const REDCSS = {
  RED_FIT: "[data-hint-panel],.kp-tooltip-popover{white-space:nowrap !important;max-width:none !important;width:max-content !important;}",
  RED_TAP: "[data-hint-trigger]{min-width:0 !important;min-height:0 !important;margin:0 !important;padding:0 !important;display:inline !important;}",
  // §5's control collapses the two controls D85 and D86 fixed back to the boxes they had. It is a
  // faithful restoration — both declared NO height at all, which is exactly what this removes.
  // ⛔ `:not([data-hint-trigger])` IS NOT COSMETIC. Without it this control also collapses §4's three
  // triggers, breaks §4, and the harness refuses to certify §5 — a control must touch its own
  // section's population and nothing else.
  RED_FLOOR: "a[target=_blank]:not([data-hint-trigger]),[aria-label]:not([data-hint-trigger]),button:not([data-hint-trigger]){min-height:0 !important;margin-top:0 !important;margin-bottom:0 !important;padding-top:0 !important;padding-bottom:0 !important;}",
};

for (const w of WIDTHS) {
  for (const loc of LOCS) {
    const ctx = await b.newContext({
      storageState: state,
      viewport: { width: w, height: 780 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
      reducedMotion: "reduce",
    });
    await ctx.addCookies([{ name: LOCALE_COOKIE, value: loc, url: BASE }]);
    const p = await ctx.newPage();
    const cell = w + "/" + loc;
    const resp = await p.goto(BASE + "/markets/" + marketId + "?side=YES", { waitUntil: "load", timeout: 120000 }).catch(() => null);

    if (!resp || resp.status() !== 200) {
      failures.push(`1 ${cell} returned ${resp ? resp.status() : "no response"} — this cell proved nothing`);
      await ctx.close();
      continue;
    }
    try { await assertLang(p, loc); } catch (e) {
      failures.push(`1 ${cell} ${e.message}`);
      await ctx.close();
      continue;
    }
    await p.waitForTimeout(1400);

    if (RED_ORDER) {
      // ⛔ A CSS MUTATION, NOT A DOM MOVE, AND THE FIRST VERSION WAS THE DOM MOVE. It did
      // `content.after(aside)` on a React-rendered tree — faithful to the pre-fix SOURCE order, and
      // it made §4 report `trigger is 0x0` in one cell of nine, because React reconciled and the
      // nodes the reader was holding were detached. The harness refused to certify it, correctly:
      // a control that breaks a section it is not named for proves nothing about the one it is.
      // (Same class as the Google-Translate crash this product already carries a fix for — raw DOM
      // surgery on a React tree detaches what you are measuring.)
      // ⭐ §1's assertion is "DOM order equals VISUAL order", so inverting the VISUAL order breaks
      // exactly that property and touches nothing React owns. The grid is a flex column on a phone,
      // so `order` is the whole of visual order.
      const flipped = await p.evaluate(() => {
        const grid = [...document.querySelectorAll("main div")].find((d) => String(d.className).includes("lg:grid-cols-[1fr_360px]"));
        if (!grid) return "no grid";
        const kids = [...grid.children];
        const aside = kids.find((k) => k.tagName.toLowerCase() === "aside" || k.querySelector("aside"));
        const content = kids.find((k) => k !== aside && !String(k.className).includes("order-3"));
        if (!aside || !content) return "no pair";
        // The pre-fix painting: content first, bet panel second.
        aside.style.setProperty("order", "2", "important");
        content.style.setProperty("order", "1", "important");
        return "flipped";
      });
      if (flipped !== "flipped") { failures.push(`1 ${cell} RED_ORDER could not invert the visual order (${flipped}) — the harness is stale, not the gate`); await ctx.close(); continue; }
      await p.waitForTimeout(250);
    }
    if (RED_HEAD) {
      // ⛔ ATTRIBUTE-ONLY, AND THE FIRST VERSION REMOVED THE HEADING NODE. `h.remove()` is faithful
      // to the pre-fix markup, and it made §4 report ten failures: this page re-renders on a timer
      // (the countdown and the poller), so React reconciles against a tree the harness has cut a
      // node out of, and what the reader then measures is not laid out. Two controls in a row broke
      // a section they are not named for, both by DOM surgery — so neither does it any more.
      // ⭐ §2's own assertions are about a NAME that resolves; breaking the wiring breaks them without
      // removing anything. The heading-LEVEL half of §2 is proven by the strongest control there is
      // and it is already on the record: the whole gate run against the UNFIXED production tree, on
      // 2026-09-25, reported "the bet panel's own heading is ABSENT" in all nine cells.
      const stripped = await p.evaluate(() => {
        const a = document.querySelector("main aside");
        if (!a) return "no aside";
        a.removeAttribute("aria-labelledby");
        a.removeAttribute("aria-label");
        const h = a.querySelector("h1,h2,h3,h4,h5,h6");
        if (h) h.removeAttribute("id");
        return "stripped";
      });
      if (stripped !== "stripped") { failures.push(`2 ${cell} RED_HEAD could not unwire the heading (${stripped}) — the harness is stale, not the gate`); await ctx.close(); continue; }
      await p.waitForTimeout(150);
    }
    if (RED_FIT || RED_TAP || RED_FLOOR) {
      const css = RED_FIT ? REDCSS.RED_FIT : RED_TAP ? REDCSS.RED_TAP : REDCSS.RED_FLOOR;
      await p.addStyleTag({ content: css });
      await p.waitForTimeout(120);
    }

    const r = await READ(p);

    // ── vacuity: a cell that could not read the page must not report zeros ──
    if (!r.gridFound) { failures.push(`1 ${cell} the layout grid was not found — nothing was measured`); await ctx.close(); continue; }
    if (!r.asideFound) { failures.push(`2 ${cell} no <aside> on the page — nothing was measured`); await ctx.close(); continue; }
    if (!r.picker) { failures.push(`3 ${cell} no bet panel rendered — §3 and §4 would report a confident zero`); await ctx.close(); continue; }
    if (r.hintCount !== HINTS_EXPECTED) {
      failures.push(`3 ${cell} found ${r.hintCount} hint triggers, expected ${HINTS_EXPECTED} — §3 and §4 measured the wrong population`);
      await ctx.close();
      continue;
    }

    // ── §1 · reading order ──
    if (JSON.stringify(r.domOrder) !== JSON.stringify(r.visualOrder)) {
      failures.push(`1 ${cell} DOM order ${JSON.stringify(r.domOrder)} but visual order ${JSON.stringify(r.visualOrder)} — the bet panel is DOM #${r.kids.find((k) => k.holdsAside)?.domIndex} and paints at position ${r.visualOrder.indexOf(r.kids.find((k) => k.holdsAside)?.domIndex)}`);
    }

    // ── §2 · the panel's name and heading ──
    const pn = r.panel ?? {};
    const named = (pn.labelledby && pn.labelledbyResolves) || (pn.ariaLabel && pn.ariaLabel.trim());
    if (!named) failures.push(`2 ${cell} the bet panel has no accessible name (aria-label=${JSON.stringify(pn.ariaLabel)} aria-labelledby=${JSON.stringify(pn.labelledby)} resolves=${pn.labelledbyResolves})`);
    if (pn.headingLevel !== 2) failures.push(`2 ${cell} the bet panel's own heading is ${pn.headingLevel ? "h" + pn.headingLevel : "ABSENT"} — it must be an h2 so its state headings nest under it`);
    if (r.skips.length) failures.push(`2 ${cell} heading level skipped: ${r.skips.join("; ")}`);
    // ⛔ WHERE the panel's heading falls is a READING-ORDER fact and belongs to §1, not here. It
    // sat in §2 first, and RED_ORDER then broke both sections and the harness refused to certify
    // it — which is the "each control breaks its OWN section" rule earning its keep. `null` means
    // the panel has no heading to place, and that is §2's failure above, reported once.
    if (r.panelHeadingBeforeContent === false) failures.push(`1 ${cell} the bet panel's heading is announced AFTER the content column's first h2 — outline: ${r.outline.map((h) => "h" + h.lvl + (h.inAside ? "*" : "")).join(" ")}`);

    // ── §3 · the explanation fits and wraps ──
    for (const h of r.hints) {
      const pa = h.panel;
      if (!pa) { failures.push(`3 ${cell} hint#${h.i} opened nothing — no explanation was measured`); continue; }
      if (pa.visibility === "hidden" || pa.opacity === "0") { failures.push(`3 ${cell} hint#${h.i} stayed hidden after being opened (opacity ${pa.opacity}, visibility ${pa.visibility}) — it cannot be read at all`); continue; }
      if (!pa.stable) { failures.push(`3 ${cell} hint#${h.i} was still changing width 260ms apart — measured mid-flight, refusing to report it`); continue; }
      if (pa.whiteSpace === "nowrap") failures.push(`3 ${cell} hint#${h.i} explanation is white-space:nowrap — ${pa.chars} characters on one ${pa.w}px line`);
      if (pa.left < 0 || pa.right > r.clientWidth) failures.push(`3 ${cell} hint#${h.i} explanation spans ${pa.left}..${pa.right} outside the ${r.clientWidth}px viewport — only ${pa.readablePct}% of it is readable, and body{overflow-x:clip} means the rest cannot be scrolled to`);
      if (pa.clipsOwnText) failures.push(`3 ${cell} hint#${h.i} explanation clips its own text (scrollWidth past clientWidth)`);
      if (pa.textTransform === "uppercase") failures.push(`3 ${cell} hint#${h.i} explanation renders text-transform:uppercase at ${pa.fontSize} — ${pa.chars} characters of fee copy in capitals, inherited from the eyebrow it hangs off`);
    }

    // ── §5 · EVERY control on the page obeys the tap floor ──
    // 🔴 WHY THIS SECTION EXISTS. D85 and D86 were 24px and 22px under the floor, on the page
    // D41 had just been fixed on, and NO GATE IN THE REPOSITORY COULD SEE EITHER. The static gate
    // skips any interactive tag that declares no height — `tap-target.test.mts:344`, "declares
    // nothing — the rendered half's job" — which is an honest deferral to a rendered gate whose
    // population never included the comment thread or this header row. §4 above cannot see them
    // either: its population is `[data-hint-trigger], .kp-tooltip` inside the side-picker, with
    // HINTS_EXPECTED = 3, so it reports a confident zero for every other control on the page.
    // ⛔ SO THE POPULATION HERE IS THE PAGE, not a list of known controls. A list would have to be
    // maintained by the same people who forget, and the next control added under the floor would
    // be invisible again.
    if (!r.controls || r.controls.length < 8) {
      failures.push(`5 ${cell} found ${r.controls ? r.controls.length : 0} controls on the page — too few to be the real population, so §5 measured nothing`);
    } else {
      // ⛔ `offscreen` MUST NOT EXCUSE A CONTROL FROM THE SIZE ASSERTION. It only means the CENTRE
      // probe could not be read — and the centre probe is reported, never asserted. Excluding those
      // controls from `judged` (as this line first did) would let anything whose centre happened to
      // fall outside the viewport escape the tap floor entirely, which is the blind population this
      // whole section exists to close.
      const judged = r.controls.filter((c) => !c.disabled && !c.inProse);
      const exempt = r.controls.filter((c) => c.disabled || c.inProse);
      // ⛔ ONE ASSERTION: the hit area, box union pseudo-elements, in both axes. Nothing about
      // neighbours, nothing about paint order — both of those produced false convictions above.
      for (const c of judged) {
        if (c.hitW < r.tapMin || c.hitH < r.tapMin) {
          failures.push(`5 ${cell} <${c.tag}> "${c.name}" has a ${c.hitW}x${c.hitH} hit area (box ${c.w}x${c.h}${c.viaPseudo ? ", pseudo included" : ", no pseudo"}), under the --tap-min ${r.tapMin} floor (Law 9) · ${c.cls}`);
        }
      }
      // Reported, never asserted: a control whose own centre resolves to something outside it is
      // either genuinely buried or a composite whose children legitimately fill it. The one time
      // this fired it was the conviction dial, read at the wrong scroll position — so it informs
      // a reader and decides nothing.
      const buried = judged.filter((c) => c.centre !== "OK" && c.centre !== "OFF");
      if (buried.length) console.log(`         §5 FYI, centre resolves elsewhere (not asserted): ${buried.map((c) => `<${c.tag}>"${c.name}" -> ${c.centre}`).join(", ")}`);
      const viaAfter = judged.filter((c) => c.viaPseudo && (c.w < r.tapMin || c.h < r.tapMin));
      if (viaAfter.length) console.log(`         §5 at the floor only because of a pseudo-element (touch their padding and this breaks): ${viaAfter.map((c) => `<${c.tag}>"${c.name}" box ${c.w}x${c.h} -> hit ${c.hitW}x${c.hitH}`).join(", ")}`);
      // ⚠️ Exemptions are PRINTED, never silent. An exemption nobody reads is how a gate stops
      // policing what it was written for.
      if (exempt.length) console.log(`         §5 exempt: ${exempt.map((c) => `<${c.tag}>"${c.name}"${c.disabled ? " disabled" : ""}${c.inProse ? " in-prose" : ""}`).join(", ")}`);
      const off = r.controls.filter((c) => c.offscreen).length;
      if (off) console.log(`         §5 ${off} control(s) sat outside the viewport even after scrolling, so their reach could not be read — elementFromPoint returns null there, and a null is not a miss`);
      console.log(`         §5 ${judged.length} controls judged, ${exempt.length} exempt, ${r.hintTriggersSkipped || 0} hint trigger(s) left to §4 (stricter: reach, not just size), floor ${r.tapMin}px`);
    }

    // ── §4 · the trigger obeys the tap floor ──
    for (const h of r.hints) {
      const missed = h.reach.filter((x) => x.hit !== "HINT");
      // ⛔ 0x0 IS NOT A SMALL CONTROL, IT IS AN UNMEASURED ONE. A detached or unlaid-out node has no
      // box; reporting it as "under the floor" turns a harness accident into a product finding, which
      // is how the DOM-move version of RED_ORDER convicted §4 in one cell of nine.
      if (h.trigW === 0 && h.trigH === 0) {
        failures.push(`4 ${cell} hint#${h.i} measured 0x0 — the node is not laid out, so NOTHING was measured here. This is an instrument failure, not a tap-floor finding.`);
        continue;
      }
      if (h.trigW < r.tapMin || h.trigH < r.tapMin) failures.push(`4 ${cell} hint#${h.i} trigger is ${h.trigW}x${h.trigH}, under the --tap-min ${r.tapMin} floor (Law 9)`);
      if (missed.length) failures.push(`4 ${cell} hint#${h.i} a ${r.tapMin}px square centred on the trigger does not reach it at ${missed.map((x) => x.n + "=" + x.hit).join(" ")}`);
      if (h.kind === "button" && h.expanded === null) failures.push(`4 ${cell} hint#${h.i} trigger is a button with no aria-expanded — a disclosure that never says whether it is open`);
    }

    console.log(`  ${cell.padEnd(8)} order dom ${JSON.stringify(r.domOrder)} vis ${JSON.stringify(r.visualOrder)} · panel h${pn.headingLevel ?? "-"} ${JSON.stringify((pn.headingText ?? pn.labelledbyText ?? pn.ariaLabel ?? "").slice(0, 26))} · aside ${r.panelHeight}px · hints ` +
      r.hints.map((h) => `#${h.i} ${h.trigW}x${h.trigH}` + (h.panel ? ` panel ${h.panel.w}x${h.panel.h} ${h.panel.readablePct}%` : " panel NONE")).join(" | "));

    await ctx.close();
  }
}
await b.close();

// ── the verdict ──
const bySection = {};
for (const f of failures) (bySection[f[0]] ??= []).push(f.slice(2));
console.log("\n" + "=".repeat(92));
for (const s of ["1", "2", "3", "4", "5"]) {
  const n = (bySection[s] ?? []).length;
  console.log(`§${s} · ${n === 0 ? "ok" : n + " failure(s)"}`);
  for (const line of bySection[s] ?? []) console.log("     " + line);
}

if (RED) {
  const want = SECTION[activeRed];
  const own = (bySection[want] ?? []).length;
  const other = Object.entries(bySection).filter(([s]) => s !== want).flatMap(([, v]) => v);
  if (own === 0) {
    console.log(`\n⛔ BROKEN HARNESS: ${activeRed} reproduced nothing in §${want}. A control that cannot recreate its own defect certifies nothing.`);
    process.exit(2);
  }
  if (other.length) {
    console.log(`\n⛔ BROKEN HARNESS: ${activeRed} also broke ${other.length} check(s) outside §${want}. A control that breaks a different section cannot certify the one it is named for.`);
    process.exit(2);
  }
  console.log(`\n✅ RED CONTROL ${activeRed} broke §${want} and only §${want} — ${own} failure(s).`);
  process.exit(0);
}

console.log(`\nDETAIL ORDER AND HINTS — ${failures.length === 0 ? "GREEN" : failures.length + " FAILURES"} over ${WIDTHS.length * LOCS.length} cells`);
process.exit(failures.length === 0 ? 0 : 1);
