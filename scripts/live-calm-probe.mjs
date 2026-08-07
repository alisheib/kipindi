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
import { BASE, login } from "./live/harness.mjs";

const SHOT = process.env.SHOT_DIR ?? ".qa-design";
const argv = process.argv.slice(2);
const flag = (n, d) => { const h = argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
const WIDTHS = flag("widths", "360,768,1280,1920").split(",").map(Number);
const LOCALES = flag("locales", "en,sw,zh").split(",");
const ROUTE = flag("route", "/markets");

/** The moment to look. Long enough that the page has painted, well inside the
 *  window the old cascade occupied (`.market-grid > *` ran to 360ms). */
const SAMPLE_MS = Number(flag("sample", "120"));

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
console.log(`\ncalm probe · ${BASE} · route ${ROUTE} · sample at ${SAMPLE_MS}ms`);
console.log(`${WIDTHS.length} width(s) × ${LOCALES.length} locale(s) × ${GATES.length} gate(s) = ${WIDTHS.length * LOCALES.length * GATES.length} cells\n`);

const browser = await chromium.launch();
const rows = [];

for (const gate of GATES) {
  console.log(`\n══ ${gate.label}`);
  for (const locale of LOCALES) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 },
        deviceScaleFactor: 4,
        ...(gate.context ?? {}),
      });
      await ctx.addCookies([{ name: "kp-locale", value: locale, domain: new URL(BASE).hostname, path: "/" }]);
      if (gate.init) await ctx.addInitScript(gate.init);
      const page = await ctx.newPage();
      const cell = `${gate.id}·${locale}·${width}`;
      try {
        await login(page, "fleet:07");
        // Navigate and sample EARLY — the whole point is the first frames.
        await page.goto(`${BASE}${ROUTE}`, { waitUntil: "commit" });
        await page.waitForSelector(".market-grid > *", { timeout: 60_000 });
        const t0 = Date.now();
        await page.waitForTimeout(Math.max(0, SAMPLE_MS - (Date.now() - t0)));

        const lang = await page.evaluate(() => document.documentElement.lang);
        if (lang !== locale) {
          say(false, `${cell}: <html lang> is "${lang}", asked for "${locale}" — REFUSING to score this cell`);
          await ctx.close();
          continue;
        }

        const m = await page.evaluate(() => {
          const html = document.documentElement;
          const items = [...document.querySelectorAll(".market-grid > *")].slice(0, 8);
          const read = (el) => {
            const s = getComputedStyle(el);
            return { delay: s.animationDelay, opacity: s.opacity, name: s.animationName, dur: s.animationDuration };
          };
          return {
            htmlClass: html.className,
            motion: html.getAttribute("data-motion"),
            items: items.map(read),
            // every loop the third gate newly covers, where it exists on this route
            gated: ["m-ambient", "skeleton", "live-dot", "ticker-track", "mark-breathe", "ud-point", "closing-pill"]
              .map((c) => {
                const el = document.querySelector(`.${c}`);
                return el ? { c, name: getComputedStyle(el).animationName } : { c, name: "(not on this route)" };
              }),
          };
        });

        // ── 1 · the wiring: the product itself put the gate in place ──────────
        if (gate.expect.html) say(m.htmlClass.includes(gate.expect.html), `${cell}: <html> carries ${gate.expect.html} (set by theme-provider, not by this probe)`);
        if (gate.expect.motion) say(m.motion === gate.expect.motion, `${cell}: data-motion="${m.motion}" (expected "${gate.expect.motion}")`);

        // ── 2 · the computed value: no delay survives a clamped duration ──────
        const delays = m.items.map((i) => i.delay);
        const worstDelay = Math.max(...delays.map((d) => parseFloat(d) || 0));
        const clamped = gate.id !== "lowend"; // the `reduced` TIER keeps full durations by design
        if (clamped) {
          say(worstDelay === 0, `${cell}: worst animation-delay across ${m.items.length} cards = ${worstDelay}s (must be 0 — a delay outlives a zeroed duration)`);
        }

        // ── 3 · the behaviour: nothing is invisible at the sampled moment ─────
        const worstOpacity = Math.min(...m.items.map((i) => parseFloat(i.opacity)));
        say(worstOpacity > 0.99, `${cell}: faintest card opacity at ${SAMPLE_MS}ms = ${worstOpacity} (must be 1 — an invisible grid is the defect)`);

        // ── 4 · the third gate, where its targets exist on this route ─────────
        if (gate.id === "lowend") {
          for (const g of m.gated) {
            if (g.name === "(not on this route)") continue;
            const kept = g.c === "live-dot";  // deliberately re-declared, not stopped
            const ok = kept ? g.name === "m-breathe" : g.name === "none";
            say(ok, `${cell}: .${g.c} animation-name = "${g.name}" ${kept ? "(KEPT as the cheap opacity-only breath)" : "(must be none at the reduced tier)"}`);
          }
        }

        const file = `${SHOT}/calm-${gate.id}-${locale}-${width}.png`;
        await page.screenshot({ path: file });  // viewport-clipped, never fullPage
        rows.push({ cell, worstDelay, worstOpacity, motion: m.motion, file });
      } catch (e) {
        say(false, `${cell}: ${String(e).split("\n")[0]}`);
      }
      await ctx.close();
    }
  }
}
await browser.close();

console.log(`\n  ─ every cell, as measured ─`);
for (const r of rows) console.log(`    ${r.cell.padEnd(20)} delay=${String(r.worstDelay).padEnd(5)} opacity=${String(r.worstOpacity).padEnd(5)} data-motion=${String(r.motion).padEnd(8)} ${r.file}`);
writeFileSync(`${SHOT}/calm-probe.json`, JSON.stringify(rows, null, 2));
console.log(`\n  ⛔ ${rows.length} image(s) written to ${SHOT}/ — OPEN THEM. A green cell means the numbers agree; it does not mean the grid is readable.`);
console.log(`\n${failed ? `calm probe — ${failed} check(s) FAILED` : "calm probe — all checks passed"}\n`);
process.exit(failed ? 1 : 0);
