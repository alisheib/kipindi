/**
 * `npm run qa:dg-rhythm` — the §S1 vertical-rhythm probe. DESIGN-GATE-2026-08-28, DG-P-04.
 *
 * ⭐ WHAT IT MEASURES, AND WHY A CODE SCAN COULD NOT. §S1: *"Layout space comes from the
 * `--sp-*` scale, applied as `gap` on flex/grid — not as margins sprinkled per element."*
 * The product's rhythm idiom is a `space-y-*` on `<PageContainer>` (35 of 41 containers), and
 * a code scan can see whether one is declared. What it CANNOT see is where the rung actually
 * lands, because `space-y` is not a gap — it is
 *
 *     .space-y-5 > :not([hidden]) ~ :not([hidden]) { margin-top: 24px }
 *
 * a SIBLING selector that does not care whether the sibling it counts occupies any space.
 *
 * 🔴 THE DEFECT THIS FOUND, AND IT IS INVISIBLE IN BOTH THE CODE AND A SCREENSHOT OF ONE PAGE.
 * `.sr-only` is `position:absolute; margin:-1px` (read out of the served sheet, not assumed).
 * A page that opens with an accessible-but-hidden `<h1 className="sr-only">` — the correct
 * WCAG 1.3.1/2.4.6 pattern, used deliberately on the slim content-first headers — therefore
 * has a FIRST child that takes no layout space but still matches `:not([hidden])`. So the
 * SECOND child, the first band anyone can see, receives the full rhythm rung as a margin-top
 * that nobody wrote and nothing accounts for:
 *   · `/live`        space-y-5 → its PageHero starts **24px** lower than `/watchlist`'s,
 *                     and the two are the same tier, the same rhythm and adjacent in the nav
 *   · `/profile`     space-y-6 → **32px**
 * ⭐ That is the register's *"vertical rhythm: seven section gaps across sibling pages"* with
 * a mechanism attached: the gaps differ not because anybody chose differently but because an
 * out-of-flow element silently consumed a rung.
 *
 * ⛔ WHY IT RUNS ON PRODUCTION AND NOT ON A STATIC HARNESS. The margin only exists once the
 * cascade has run over the REAL served sheet; `.sr-only`'s `position:absolute` comes from
 * Tailwind's preflight and the rung from a utility 130KB later. Reading either from source is
 * how this programme has been wrong before.
 *
 * ⛔ ITS CONTROLS, BOTH OF WHICH MUST BE ABLE TO GO RED:
 *   1. ZERO PROBES IS A SKIPPED RUN, NEVER A PASS — exit 3 if no container was measured.
 *      (`qa:toggle-hit` once printed `n=7 probed=0 ✓`.)
 *   2. A route that renders the sign-in page is not data — `finalUrl` is checked, not status.
 *      Every revoked page returns HTTP 200 and renders perfectly.
 *
 * Usage:
 *   node scripts/design-gate/rhythm-probe.mjs                 # all public routes, anonymous
 *   ONLY=/live,/results node scripts/design-gate/rhythm-probe.mjs
 *   STRICT=1 …                                                # exit 1 on any finding
 */
import { chromium } from "playwright";
import { BASE } from "../live/harness.mjs";
import { PLAYER_PUBLIC } from "./routes.mjs";

const ONLY = (process.env.ONLY || "").split(",").map((s) => s.trim()).filter(Boolean);
const STRICT = process.env.STRICT === "1";
const routes = ONLY.length ? ONLY : PLAYER_PUBLIC;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, colorScheme: "dark" });
const page = await ctx.newPage();

let probed = 0, findings = 0, skipped = 0;
const rows = [];

for (const route of routes) {
  let url = "";
  try {
    await page.goto(BASE + route, { waitUntil: "load", timeout: 60_000 });
    await page.waitForTimeout(700);
    url = page.url();
  } catch {
    console.log(`   ⚠️  ${route} — did not load, skipped`);
    skipped++; continue;
  }
  /* ⛔ HTTP 200 proves nothing. A signed-out redirect renders the sign-in page perfectly. */
  if (/\/auth\//.test(url) && !/^\/auth\//.test(route)) {
    console.log(`   ⚠️  ${route} — landed on ${url}, not data`);
    skipped++; continue;
  }

  const found = await page.evaluate(() => {
    const out = [];
    for (const c of document.querySelectorAll("[data-measure]")) {
      const cs = getComputedStyle(c);
      const kids = [...c.children].map((k) => {
        const ks = getComputedStyle(k);
        return {
          tag: k.tagName.toLowerCase(),
          cls: (k.getAttribute("class") || "").slice(0, 70),
          marginTop: Math.round(parseFloat(ks.marginTop) * 100) / 100,
          position: ks.position,
          h: Math.round(k.getBoundingClientRect().height * 100) / 100,
          inFlow: ks.position !== "absolute" && ks.position !== "fixed",
        };
      });
      out.push({
        tier: c.getAttribute("data-measure"),
        cls: (c.getAttribute("class") || "").slice(0, 90),
        rowGap: cs.rowGap,
        display: cs.display,
        kids,
      });
    }
    return out;
  });

  for (const c of found) {
    probed++;
    const rhythm = (c.cls.match(/space-y-[\w.]+/) || [])[0] || null;
    const firstVisible = c.kids.findIndex((k) => k.inFlow && k.h > 0);
    const ghosts = c.kids.slice(0, firstVisible).filter((k) => !k.inFlow || k.h === 0);
    const lead = firstVisible > -1 ? c.kids[firstVisible] : null;
    const bad = !!(lead && ghosts.length && lead.marginTop > 0);
    if (bad) findings++;
    rows.push({ route, tier: c.tier, rhythm, ghosts: ghosts.length, ghostTags: ghosts.map((g) => `${g.tag}.${(g.cls.split(" ")[0] || "")}`).join(","), leadTag: lead?.tag, leadMargin: lead?.marginTop, bad, noRhythm: !rhythm && c.display !== "flex" && c.display !== "grid" });
    /* VERBOSE=1 prints the whole band stack. A histogram of "gaps" cannot say WHERE a gap
       came from; this can, and that is the difference between the register's un-actionable
       "seven section gaps" and a line number. */
    if (process.env.VERBOSE === "1") {
      console.log(`\n   ── ${route} [${c.tier}] display=${c.display} rowGap=${c.rowGap} class="${c.cls}"`);
      c.kids.forEach((k, i) => console.log(
        `      ${String(i).padStart(2)} <${k.tag}> mt=${String(k.marginTop).padStart(5)} h=${String(k.h).padStart(7)} pos=${k.position}  ${k.cls}`,
      ));
    }
  }
}

await browser.close();

console.log(`\n📐 §S1 RHYTHM PROBE — ${probed} container(s) on ${routes.length - skipped} route(s) (${skipped} skipped)\n`);
for (const r of rows) {
  const flag = r.bad ? "🔴" : r.noRhythm ? "⚠️ " : "✅";
  console.log(
    `${flag} ${r.route.padEnd(30)} tier=${String(r.tier).padEnd(8)} rhythm=${String(r.rhythm || "(none)").padEnd(11)}` +
    ` lead=<${r.leadTag}> margin-top=${r.leadMargin}px` +
    (r.ghosts ? `  ⟵ ${r.ghosts} out-of-flow sibling(s) before it: ${r.ghostTags}` : ""),
  );
}
console.log(`\n🔴 ${findings} container(s) where an OUT-OF-FLOW first child hands the rhythm rung to the first VISIBLE band.`);
console.log(`⚠️  ${rows.filter((r) => r.noRhythm).length} container(s) declaring NO rhythm at all (§S1: the gap falls to per-element margins).`);

/* ⛔ CONTROL 1 — zero probes is a skipped run, never a pass. */
if (!probed) {
  console.error("\n🔴 ZERO containers probed — a skipped run, not a clean result.");
  process.exit(3);
}
if (STRICT && findings) process.exit(1);
