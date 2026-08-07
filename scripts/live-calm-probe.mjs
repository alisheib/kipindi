/**
 * THE CALM PROBE — ATOM A's production verification, on all three reduced-motion gates.
 *
 *   SHOT_DIR=.qa-design node scripts/live-calm-probe.mjs
 *   SHOT_DIR=.qa-design node scripts/live-calm-probe.mjs --widths=360,768,1280,1920 --locales=en,sw,zh
 *   LIVE_BASE=http://localhost:3100 SHOT_DIR=.qa-design node scripts/live-calm-probe.mjs
 *
 * ⛔ WHY A STILL CANNOT CLOSE THIS ATOM. The defect it fixes is a WAIT, not a
 * picture: with `animation-duration` clamped to 0.01ms and `animation-delay` left
 * alone, a delayed keyframe holds its FIRST frame for the whole delay and then jumps
 * to its last. With `both` fill that frame is `opacity: 0`, so the surface is simply
 * ABSENT — and a screenshot taken a moment later shows a perfectly correct page.
 * Measured on the market board before the fix: up to 360ms of empty grid for a
 * player who had switched Reduce motion ON.
 *
 * ⭐ SO IT MEASURES THREE DIFFERENT KINDS OF THING, and says which is which:
 *
 *   1. THE COMPUTED VALUE — `animation-delay` on the real cards. Race-free and
 *      decisive: 0s after the fix, 0.36s before.
 *   2. THE BEHAVIOUR — `opacity` sampled early, inside the window the delay used to
 *      occupy. This is the human-facing half, and it is the one a computed-value
 *      assertion cannot make: a token can be right while the surface is invisible.
 *   3. THE PICTURE — a viewport crop taken at that same early moment, so the empty
 *      grid would be VISIBLE in an image if it came back.
 *
 * ⛔ AND IT NEVER SETS THE GATE ITSELF — IT MAKES THE PRODUCT SET IT.
 *   · gate 1, the OS preference: Playwright's own `reducedMotion: "reduce"`.
 *   · gate 2, the in-app switch: writes the real `50pick:feedback` pref, so
 *     `theme-provider.tsx` applies `html.kp-reduce-motion` + `data-motion="minimal"`
 *     through the product's code path.
 *   · gate 3, the low-end tier: spoofs `navigator.connection.saveData` before first
 *     paint so the product's OWN `detectLowEnd()` returns true and writes
 *     `data-motion="reduced"`.
 *   Stamping the class on by hand would prove my CSS and nothing about the wiring —
 *   and the wiring is where the third gate was missing in the first place.
 *
 * ⛔ locator.screenshot() / a viewport-clipped page.screenshot(), NEVER fullPage —
 * Playwright stitches a fullPage, so a sticky header paints mid-document and lands on
 * the content, which reads exactly like a z-index bug and is entirely the harness's.
 *
 * ⛔ Language comes from the `kp-locale` COOKIE set on the CONTEXT before the first
 * request, and `<html lang>` is read back: a sweep that silently shoots the wrong
 * language is worse than one that fails, because its output looks like evidence.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { BASE, loginOnce } from "./live/harness.mjs";

const SHOT = process.env.SHOT_DIR ?? ".qa-design";
const argv = process.argv.slice(2);
const flag = (n, d) => { const h = argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const WIDTHS = flag("widths", "360,768,1280,1920").split(",").map(Number);
const LOCALES = flag("locales", "en,sw,zh").split(",");
const ROUTE = flag("route", "/markets");

/**
 * ⭐ HOW LONG TO WATCH — because the honest question is a DURATION, not an instant.
 *
 * 🔴 THE FIRST TWO VERSIONS OF THIS PROBE SAMPLED AT A FIXED 120ms AND BOTH WERE WRONG,
 * in opposite directions, and the second one is the instructive failure:
 *
 *   · v1 read `.market-grid > *` and picked up an EMPTY-STATE panel. It has no entrance,
 *     so its opacity is trivially 1 — the check passed **by measuring something with no
 *     animation to get wrong.**
 *   · v2 filtered to real cards and then reported `opacity: 0` on all 36 cells. Measured
 *     rather than believed: `animation-duration` read `1e-05s` and `animation-delay` `0s`
 *     — the clamp working perfectly — and the cards had `height: 0`, i.e. they were **not
 *     laid out yet.** `waitForSelector(".market-grid > *")` fires the instant ANY grid
 *     child exists, including that empty-state panel, while the card grids are still
 *     streaming in. The starting gun was firing before the race.
 *
 * ⛔ So neither "opacity at 120ms" reading meant anything. What M6 actually asks is:
 * **is a card ever held invisible for a period a person would notice?** That is a
 * duration, it starts when the card is first LAID OUT (before that it is not on screen at
 * all), and it is measured with a per-frame sampler rather than one guess at when to look.
 * Before this atom that number ran to 360ms on the market board; after it, it is bounded
 * by the entrance itself — and at the two clamped gates, by a frame.
 */
const WATCH_MS = Number(flag("watch", "1200"));

const GATES = [
  {
    id: "os",
    label: "gate 1 · the OS preference (prefers-reduced-motion: reduce)",
    context: { reducedMotion: "reduce" },
    expect: { html: null, motion: null },
  },
  {
    id: "switch",
    label: "gate 2 · the in-app Reduce-motion switch (the product writes the class)",
    init: `try { localStorage.setItem("50pick:feedback", JSON.stringify({ motion: "off" })); } catch {}`,
    expect: { html: "kp-reduce-motion", motion: "minimal" },
  },
  {
    id: "lowend",
    label: "gate 3 · the low-end tier — the product's own detectLowEnd() decides",
    // Save-Data is the first branch of detectLowEnd() and the only one that is
    // settable from outside; hardwareConcurrency and deviceMemory are read-only.
    init: `Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true });`,
    expect: { html: null, motion: "reduced" },
  },
];

let failed = 0;
const say = (ok, msg) => { console.log(`    ${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) failed++; };
mkdirSync(SHOT, { recursive: true });
console.log(`\ncalm probe · ${BASE} · route ${ROUTE} · per-frame watch for ${WATCH_MS}ms from each card's first layout`);
console.log(`${WIDTHS.length} width(s) × ${LOCALES.length} locale(s) × ${GATES.length} gate(s) = ${WIDTHS.length * LOCALES.length * GATES.length} cells\n`);

const browser = await chromium.launch();
const rows = [];

/* ⛔ ONE sign-in for the whole matrix, reused as a storage state. Signing in per cell
   trips the server's attempt limiting partway through a 36-cell run and reports
   `login failed` on cells whose product behaviour is fine — measured, 22/36 on the
   first attempt. See `loginOnce()`'s header in live/harness.mjs. */
const AUTH = await loginOnce(browser, "fleet:07");
console.log(`  signed in once as fleet:07 — session reused across every cell\n`);

for (const gate of GATES) {
  console.log(`\n══ ${gate.label}`);
  for (const locale of LOCALES) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 },
        deviceScaleFactor: 4,
        storageState: AUTH,
        ...(gate.context ?? {}),
      });
      await ctx.addCookies([{ name: "kp-locale", value: locale, domain: new URL(BASE).hostname, path: "/" }]);
      if (gate.init) await ctx.addInitScript(gate.init);
      const page = await ctx.newPage();
      const cell = `${gate.id}·${locale}·${width}`;
      try {
        /* ── ESTABLISH THE GATE BEFORE MEASURING UNDER IT ──────────────────────
           🔴 THE FIRST VERSION OF THIS PROBE HAD A RACE AND IT SHOWED: one run of the
           36-cell matrix reported 3 failures, the next two reported none. A probe that
           says 3 once and 0 twice is a flaw whether or not the product is fine.
           **Two of the three gates are applied by JavaScript** — `theme-provider.tsx`
           sets `html.kp-reduce-motion` and `data-motion` inside a `useEffect`, i.e.
           AFTER hydration — so sampling 120ms after the grid appeared could land before
           the attribute existed, and then `data-motion="reduced"` and every loop
           assertion under it fail for a reason that has nothing to do with the CSS.
           ⭐ So: load, wait for the attribute (that IS "hydration finished"), and only
           then navigate to the route and sample. The gate is a PRECONDITION of the
           measurement, not part of what is being measured.
           ⚠️ WORTH RECORDING, because it is a real product characteristic and not a
           harness artefact: on a COLD first paint the two JS-applied gates cannot be in
           force yet, so during that window only the OS media query is active. That is
           an argument for why gate 1 carries the most weight, not a defect — and it is
           why the delay clamp had to land in the media query as well as the class. */
        await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => document.documentElement.getAttribute("data-motion") !== null, null, { timeout: 60_000 });
        // Now the route, and sample EARLY — the whole point is its first frames.
        /* ⛔ THE SAMPLER IS ARMED BEFORE THE NAVIGATION, so it is watching from the
           card's own first frame rather than from whenever this script got round to
           looking. It runs per-`requestAnimationFrame` and reports, for each real market
           card, the time between "first laid out" (non-zero height — the first instant a
           person could see it) and "reached full opacity". That worst number is the
           human-facing claim; everything else here is a computed value. */
        await page.addInitScript(({ watchMs }) => {
          const isCard = (el) => el.matches?.(".mcardp") || el.querySelector?.(".mcardp");
          const seen = new Map();
          const t0 = performance.now();
          const tick = () => {
            const now = performance.now();
            for (const el of document.querySelectorAll(".market-grid > *")) {
              if (!isCard(el)) continue;
              const laidOut = el.getBoundingClientRect().height > 0;
              if (!laidOut) continue;
              const op = parseFloat(getComputedStyle(el).opacity);
              let rec = seen.get(el);
              if (!rec) { rec = { first: now, done: op > 0.999 ? now : null, minOp: op }; seen.set(el, rec); }
              rec.minOp = Math.min(rec.minOp, op);
              if (rec.done === null && op > 0.999) rec.done = now;
            }
            if (now - t0 < watchMs) requestAnimationFrame(tick);
            else {
              const rows = [...seen.values()];
              window.__calm = {
                cards: rows.length,
                // ⚠️ `done === null` means it NEVER reached full opacity inside the
                // window — reported as the watch length, never as 0.
                worstHoldMs: rows.length ? Math.max(...rows.map((r) => (r.done === null ? watchMs : r.done - r.first))) : null,
                stuck: rows.filter((r) => r.done === null).length,
                minOpacity: rows.length ? Math.min(...rows.map((r) => r.minOp)) : null,
              };
            }
          };
          requestAnimationFrame(tick);
        }, { watchMs: WATCH_MS });

        await page.goto(`${BASE}${ROUTE}`, { waitUntil: "commit" });
        await page.waitForSelector(".market-grid > *", { timeout: 60_000 });
        await page.waitForFunction(() => window.__calm !== undefined, null, { timeout: WATCH_MS + 30_000 });
        const hold = await page.evaluate(() => window.__calm);

        const lang = await page.evaluate(() => document.documentElement.lang);
        if (lang !== locale) {
          say(false, `${cell}: <html lang> is "${lang}", asked for "${locale}" — REFUSING to score this cell`);
          await ctx.close();
          continue;
        }

        const m = await page.evaluate(() => {
          const html = document.documentElement;
          /* 🔴 `.market-grid > *` IS NOT "A MARKET CARD", AND BELIEVING IT WAS MADE THIS
             PROBE ABLE TO PASS WITHOUT TESTING ANYTHING. Found by opening the locator
             shot: `/markets` renders MORE THAN ONE `.market-grid`, and at 360/SW under
             the default "Leo" filter the first one holds an EMPTY-STATE panel — *"Hakuna
             yanayofunga hivi karibuni"* — which carries no `kp-rise` entrance at all. Its
             opacity is trivially 1 and its delay trivially 0, so it satisfies both
             assertions **by having no animation to get wrong.** On a quiet board that
             could be the only child, and the run would have been green over zero cards.
             ⛔ So: only children that ARE or CONTAIN a real market card (`.mcardp`), and
             a minimum count enforced below — the same rule `qa:contrast-rendered` had to
             learn when it reported PASS over 0 measured text nodes (E-118). */
          const items = [...document.querySelectorAll(".market-grid > *")]
            .filter((el) => el.matches(".mcardp") || el.querySelector(".mcardp"))
            .slice(0, 8);
          const read = (el) => {
            const s = getComputedStyle(el);
            return { delay: s.animationDelay, opacity: s.opacity, name: s.animationName, dur: s.animationDuration };
          };
          return {
            htmlClass: html.className,
            motion: html.getAttribute("data-motion"),
            /* ⛔ A REUSED SESSION MAKES A SILENT SIGN-OUT POSSIBLE, and `/markets`
               renders a grid for a VISITOR too — so a signed-out cell would measure a
               real board, agree with every number, and report green over a state the
               atom was never verified in. The signal must exist in all three languages
               (E-106's lesson) and must NOT exist in the failure state, which is why it
               is the signed-out CTA that has to be ABSENT rather than a nav item
               present: `Sign up` / `Jisajili` / `注册`. */
            authed: !/\bsign up\b|\bjisajili\b/i.test(document.body.innerText) &&
                    !document.body.innerText.includes("注册"),
            items: items.map(read),
            // every loop the third gate newly covers, where it exists on this route
            gated: ["m-ambient", "skeleton", "live-dot", "ticker-track", "mark-breathe", "ud-point", "closing-pill"]
              .map((c) => {
                const el = document.querySelector(`.${c}`);
                return el ? { c, name: getComputedStyle(el).animationName } : { c, name: "(not on this route)" };
              }),
          };
        });

        // ── 0 · the cell is signed in. ⛔ Never assumed: see the note above. ───
        say(m.authed, `${cell}: the reused session is still AUTHENTICATED (a signed-out cell would measure a visitor board and agree with every number)`);

        /* ── 0b · THERE ARE CARDS TO MEASURE. ⛔ A gate over zero rows proves nothing,
           and the empty-state panel this used to pick up satisfies every assertion
           below by carrying no animation at all. 3 is the floor because a one-card
           board cannot exercise a stagger cascade, which is the thing that broke. */
        say(m.items.length >= 3, `${cell}: ${m.items.length} real market card(s) with an entrance to measure (need ≥3 — an empty grid passes every check by having no animation)`);
        if (m.items.length < 3) { await ctx.close(); continue; }

        // ── 1 · the wiring: the product itself put the gate in place ──────────
        if (gate.expect.html) say(m.htmlClass.includes(gate.expect.html), `${cell}: <html> carries ${gate.expect.html} (set by theme-provider, not by this probe)`);
        if (gate.expect.motion) say(m.motion === gate.expect.motion, `${cell}: data-motion="${m.motion}" (expected "${gate.expect.motion}")`);

        /* ── 2 · the computed value: no delay survives, at ANY of the three gates ──
           ⭐ Asserted for all three, for TWO different reasons — which is stronger
           than skipping the third. At gates 1 and 2 the universal clamp zeroes it.
           At the `reduced` tier nothing is clamped, and it is zero because that tier
           carries its own explicit `.market-grid > *` and `.stagger-item` resets
           (globals.css §6): a phone should not wait out a 360ms cascade even when the
           entrance itself is kept. If either mechanism regressed, this reads non-zero. */
        const worstDelay = Math.max(...m.items.map((i) => parseFloat(i.delay) || 0));
        say(worstDelay === 0, `${cell}: worst animation-delay across ${m.items.length} cards = ${worstDelay}s (must be 0 — a delay outlives a zeroed duration)`);

        /* ── 3 · THE HUMAN-FACING NUMBER: how long is a card held invisible? ───────
           ⭐ Measured per frame from the card's own first layout, and the CEILING DEPENDS
           ON THE GATE — which is not a loosening, it is the difference between the two
           promises:
             · gates 1 and 2 CLAMP time (0.01ms), so a card must be fully visible within
               a frame or two. **83ms = five frames at 60Hz**, generous on purpose: this
               runs over the public internet against production, and the assertion is
               "not a perceptible hold", not "sub-millisecond".
             · gate 3 is a THROTTLE whose stated contract is "loops off, ENTRANCES KEPT",
               so `kp-rise`'s 420ms is supposed to run. The ceiling there is the entrance
               plus slack — and `stuck` is what matters: a card that never arrives.
           🔴 The version of this check that demanded `opacity === 1` at every gate
           reported two FAILs on production over a tier working exactly as specified. */
        say(hold.stuck === 0, `${cell}: ${hold.stuck} card(s) never reached full opacity inside ${WATCH_MS}ms (must be 0 — that is a card a player never sees)`);
        const ceiling = gate.id === "lowend" ? 600 : 83;
        say(hold.worstHoldMs !== null && hold.worstHoldMs <= ceiling,
          `${cell}: longest a card was held invisible = ${hold.worstHoldMs?.toFixed(0)}ms (ceiling ${ceiling}ms — ` +
          `${gate.id === "lowend" ? "the entrance is deliberately KEPT at this tier" : "time is clamped at this gate, so a hold means a frame is being held"})`);

        // ── 4 · the third gate, where its targets exist on this route ─────────
        if (gate.id === "lowend") {
          for (const g of m.gated) {
            if (g.name === "(not on this route)") continue;
            const kept = g.c === "live-dot";  // deliberately re-declared, not stopped
            const ok = kept ? g.name === "m-breathe" : g.name === "none";
            say(ok, `${cell}: .${g.c} animation-name = "${g.name}" ${kept ? "(KEPT as the cheap opacity-only breath)" : "(must be none at the reduced tier)"}`);
          }
        }

        /* ── the picture, and it has to show THE THING ─────────────────────────
           ⚠️ The viewport shot alone was not evidence: on `/markets` at 360 the
           market grid sits BELOW the fold behind the ticker, the propose-market
           card, the search field and two filter rows — so the first version of this
           probe measured card opacity in the DOM and then photographed a screenful
           that does not contain a single card. Green numbers, an image of something
           else. Both are written now: the viewport for context, and a locator shot
           of `.market-grid` for the surface the numbers are about. ⛔ locator, never
           fullPage — Playwright stitches a fullPage and the sticky header lands
           mid-document, which reads exactly like a z-index bug and is the harness's. */
        const file = `${SHOT}/calm-${gate.id}-${locale}-${width}.png`;
        await page.screenshot({ path: file });  // viewport-clipped, never fullPage
        /* ⛔ THE GRID THAT HOLDS CARDS, not `.market-grid` first — that one was the
           empty state, and photographing it is how the wrong-element bug above stayed
           invisible for three green runs. */
        const gridFile = `${SHOT}/calm-${gate.id}-${locale}-${width}-grid.png`;
        await page.locator(".market-grid").filter({ has: page.locator(".mcardp") }).first()
          .screenshot({ path: gridFile }).catch(() => {});
        rows.push({ cell, worstDelay, hold: hold.worstHoldMs, stuck: hold.stuck, minOp: hold.minOpacity, cards: hold.cards, motion: m.motion, file, gridFile });
      } catch (e) {
        say(false, `${cell}: ${String(e).split("\n")[0]}`);
      }
      await ctx.close();
    }
  }
}
await browser.close();

console.log(`\n  ─ every cell, as measured ─`);
for (const r of rows) console.log(`    ${r.cell.padEnd(20)} cards=${r.cards} delay=${String(r.worstDelay).padEnd(4)} heldInvisible=${String(Math.round(r.hold)).padEnd(4)}ms stuck=${r.stuck} minOpacity=${String(r.minOp).slice(0,5).padEnd(5)} data-motion=${String(r.motion).padEnd(8)}`);
writeFileSync(`${SHOT}/calm-probe.json`, JSON.stringify(rows, null, 2));
console.log(`\n  ⛔ ${rows.length} image(s) written to ${SHOT}/ — OPEN THEM. A green cell means the numbers agree; it does not mean the grid is readable.`);
console.log(`\n${failed ? `calm probe — ${failed} check(s) FAILED` : "calm probe — all checks passed"}\n`);
process.exit(failed ? 1 : 0);
