/**
 * THE MATERIAL PROBE — the visual gate for the material-system merge.
 *
 *   SHOT_DIR=.qa-design node scripts/live-material-probe.mjs card
 *   SHOT_DIR=.qa-design node scripts/live-material-probe.mjs card modal --locales=en,sw,zh --widths=360,1280
 *   LIVE_BASE=http://localhost:3100 SHOT_DIR=.qa-design node scripts/live-material-probe.mjs card
 *
 * WHY THIS EXISTS AND WHY IT IS NOT `live-s29-sweep`. The sweep answers "does this
 * screen overflow, clip, or hide a control" across 4 widths and 3 locales. It cannot
 * answer the only question this merge asks: **is there light on that surface, and is
 * it the RIGHT light.** A 1px inner ring at 5.5% alpha is invisible in a 360-wide
 * viewport screenshot — you can photograph a completely unlit card and see nothing
 * wrong. So this probe does two things the sweep does not:
 *
 *   1. shoots at deviceScaleFactor 4 and CROPS THE CORNER, where a 1px edge is
 *      eight device pixels tall and a human can actually judge it;
 *   2. reads the COMPUTED value back and prints the shadow GEOMETRY, so
 *      "even ring" vs "top-only line" is a string comparison and not an opinion.
 *
 * ⛔ THE GEOMETRY IS THE ASSERTION, NEVER THE COLOUR. `getComputedStyle` hands back
 * `oklch(...)` verbatim on this design system, and the usual `[\d.]+` scrape reads
 * lightness, chroma and hue as R, G and B (SKILL §5b rule 12 — it once scored a bright
 * button at 1.24:1 and reported three failures that were entirely its own). This file
 * only ever compares the OFFSET/SPREAD run of a box-shadow layer:
 *      … 0px 0px 0px 1px inset   → an EVEN ring, all four sides   (M1 compliant)
 *      … 0px 1px 0px 0px inset   → a TOP-ONLY line                (M1 violation)
 * Both are pure geometry. No colour is parsed anywhere in this file.
 *
 * ⛔ AND NOTE WHERE `inset` SITS. The first version of this probe tested
 * `/inset 0px 0px 0px 1px/` — the order the CSS is AUTHORED in. Chrome's computed
 * value serialises the colour FIRST and the `inset` keyword LAST, so neither pattern
 * could ever match, and the probe printed "top-only line present: no" over a
 * production card whose shadow plainly read `0px 1px 0px 0px inset`. **It reported
 * M1 compliance on the exact surface the merge exists to fix.** The rule it broke is
 * SKILL §5b: assert the VALUE the platform hands back, not the symbol you wrote. The
 * matchers below are pinned to the computed serialisation and are proven to FIRE on
 * the pre-merge production state before being trusted to pass on the post-merge one.
 *
 * ⛔ locator.screenshot() and a viewport-clipped page.screenshot(), NEVER fullPage —
 * Playwright stitches a fullPage, so a sticky header paints mid-document and lands on
 * the content, which reads exactly like a z-index bug and is entirely the harness's.
 *
 * ⛔ Language comes from the `kp-locale` COOKIE, set on the CONTEXT before the first
 * request (E-106: `/api/locale` never existed and its 404 was swallowed, so every SW/ZH
 * shot taken before 2026-08-06 was English). We read `<html lang>` back and REFUSE to
 * capture on a mismatch — a sweep that silently shoots the wrong language is worse than
 * one that fails, because its output looks like evidence.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { BASE, login } from "./live/harness.mjs";

const SHOT = process.env.SHOT_DIR ?? ".qa-design";
const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
};
const WIDTHS = flag("widths", "1280").split(",").map(Number);
const LOCALES = flag("locales", "en").split(",");
const wanted = argv.filter((a) => !a.startsWith("--"));

/**
 * The surface registry. A surface names the ONE element it is about — never the page.
 * `props` are the computed properties whose geometry we print; `corner` is where the
 * lit edge is judged.
 */
const SURFACES = {
  card: {
    route: "/markets",
    selector: ".mcardp",
    persona: "fleet:07",
    label: "market card (rung 1)",
    props: ["boxShadow", "backgroundImage", "backgroundColor", "borderColor"],
    vars: ["--shadow-card-top", "--shadow-card", "--edge-lit", "--elev-raised", "--wash-raised", "--light-angle"],
  },
  updown: {
    route: "/updown",
    selector: ".mcardp",
    persona: "fleet:07",
    label: "up & down card (rung 1)",
    props: ["boxShadow", "backgroundImage", "backgroundColor", "borderColor"],
    vars: ["--shadow-card-top", "--edge-lit"],
  },
  /**
   * E-119 — the primary control, which is the one solid-family button painted
   * with a RAMP. ⛔ No persona: the hero CTA on `/` exists for a VISITOR
   * ("Create account" / "Jisajili" / "注册"); signed in, the same slot renders
   * the markets CTA instead, so a logged-in shot would photograph a different
   * button and call it evidence.
   * ⚠️ Its `boxShadow` carries the authored bevel pair (`0 1px 0` top light +
   * `0 -1px 0` bottom shade), so the M1 line below reports a one-sided line and
   * is RIGHT to: a control-family edge pass has not happened yet. E-119 is a
   * contrast atom and deliberately does not re-cut that bevel.
   */
  button: {
    route: "/",
    selector: ".btn-primary",
    label: "primary control, btn-sm — the header 'Sign up' (30px · 13px/600)",
    props: ["backgroundImage", "boxShadow", "color", "borderColor", "height", "fontSize"],
    vars: ["--pearl-50", "--light-angle"],
  },
  /**
   * ⭐ BOTH SIZES, AND THE SMALL ONE IS THE HARD CASE. The label's share of the
   * button's height is what decides how far down a 180deg ramp the glyphs sit,
   * so a 56px hero and a 30px header pill read DIFFERENT backgrounds off one
   * gradient: measured at the 60% light stop, 4.62 on the hero and 4.39 on the
   * pill. Shooting only the hero would have photographed the passing half.
   */
  "button-xl": {
    route: "/",
    selector: ".btn-primary.btn-xl",
    label: "primary control, btn-xl — the hero CTA (56px · 16.5px/600)",
    props: ["backgroundImage", "boxShadow", "color", "borderColor", "height", "fontSize"],
    vars: ["--pearl-50", "--light-angle"],
  },
};

const geom = (boxShadow) =>
  // Strip every colour function wholesale, then report what is left: the offsets,
  // the blur, the spread and the `inset` keyword. Pure geometry, no colour parsed.
  String(boxShadow)
    // Chrome does not hand back what you authored: `oklch()` in the stylesheet comes
    // out as `lab()` here. Strip every colour function we might meet, or the geometry
    // line is unreadable and nobody looks at it — which is how a probe stops working.
    .replace(/(oklch|oklab|lab|lch|rgba?|hsla?|color-mix|color)\([^()]*(\([^()]*\)[^()]*)*\)/g, "▢")
    .replace(/\s+/g, " ")
    .trim();

async function run() {
  const keys = wanted.length ? wanted : Object.keys(SURFACES);
  for (const k of keys) if (!SURFACES[k]) throw new Error(`unknown surface "${k}" — have: ${Object.keys(SURFACES).join(", ")}`);

  mkdirSync(`${SHOT}/material`, { recursive: true });
  const report = [];
  const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });

  // ⛔ ONE CONTEXT PER LOCALE, NOT PER CELL — and this is a correctness rule, not a
  // speed one. The first version opened a fresh context for every (surface × locale ×
  // width) and signed in each time: 24 logins as ONE fleet account inside a few
  // minutes, against production. Eight of them failed, and the failure text gave the
  // game away — one read `跳到主要内容 50pick .tz 市场 涨跌 直播 结果`, which is the
  // signed-IN navigation. So the sign-in had worked and the harness said it had not.
  // A rate-limited or contended login photographs as a product defect, and a probe
  // that produces phantom failures gets ignored, which is worse than no probe.
  // Log in once per locale; change WIDTH by resizing the viewport, which keeps the
  // session and keeps deviceScaleFactor (it is fixed at context creation).
  for (const key of keys) {
    const s = SURFACES[key];
    for (const locale of LOCALES) {
      const ctx = await b.newContext({ viewport: { width: WIDTHS[0], height: 900 }, deviceScaleFactor: 4 });
      await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
      const page = await ctx.newPage();
      let signedIn = false;
      try {
        if (s.persona) { await login(page, s.persona); }
        signedIn = true;
      } catch (err) {
        // ⛔ Refuse the whole locale rather than shoot a logged-out page: an
        // unauthenticated screenshot looks exactly like evidence (§5b rule 5).
        for (const width of WIDTHS) report.push({ surface: key, locale, width, error: `login: ${err.message.slice(0, 120)}` });
        console.log(`\n── ${key}-*-${locale}  ⛔ SIGN-IN FAILED — every width for this locale refused`);
      }
      for (const width of signedIn ? WIDTHS : []) {
        const tag = `${key}-${width}-${locale}`;
        try {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(`${BASE}${s.route}`, { waitUntil: "domcontentloaded", timeout: 60_000 });

          const lang = await page.evaluate(() => document.documentElement.lang);
          if (!String(lang).toLowerCase().startsWith(locale)) {
            throw new Error(`locale mismatch: asked ${locale}, <html lang> says "${lang}" — refusing to capture`);
          }

          const el = page.locator(s.selector).first();
          await el.waitFor({ state: "visible", timeout: 60_000 });
          await page.waitForTimeout(600); // let entrance animations land on their end frame

          const measured = await el.evaluate((node, props) => {
            const cs = getComputedStyle(node);
            const out = {};
            for (const p of props) out[p] = cs[p];
            return out;
          }, s.props);

          const vars = await page.evaluate((names) => {
            const cs = getComputedStyle(document.documentElement);
            const out = {};
            for (const n of names) out[n] = cs.getPropertyValue(n).trim();
            return out;
          }, s.vars ?? []);

          // The whole surface…
          await el.screenshot({ path: `${SHOT}/material/${tag}.png` });
          // …and its top-left corner at 4x, which is where the lit edge is judged.
          const box = await el.boundingBox();
          if (box) {
            const size = Math.min(140, Math.floor(box.width), Math.floor(box.height));
            await page.screenshot({
              path: `${SHOT}/material/${tag}-corner.png`,
              clip: { x: box.x, y: box.y, width: size, height: size },
            });
          }

          const row = { surface: key, label: s.label, locale, width, lang, vars, geometry: {}, raw: measured };
          for (const [p, v] of Object.entries(measured)) {
            row.geometry[p] = p === "boxShadow" ? geom(v) : (String(v).slice(0, 90));
          }
          report.push(row);

          console.log(`\n── ${tag} · ${s.label}`);
          console.log(`   lang=${lang}  shot=${SHOT}/material/${tag}.png (+ -corner.png)`);
          for (const [n, v] of Object.entries(vars)) console.log(`   ${n.padEnd(20)} = ${v || "(unset)"}`);
          console.log(`   box-shadow GEOMETRY: ${row.geometry.boxShadow}`);
          // Split into layers first: a comma inside a colour function is already gone
          // (colours were replaced by ▢ above), so a plain split is safe here.
          const layers = row.geometry.boxShadow.split(",").map((l) => l.trim());
          const even = layers.some((l) => /0px 0px 0px 1px inset$/.test(l));
          const oneSided = layers.some((l) => /0px -?1px 0px 0px inset$/.test(l));
          row.m1 = { evenRing: even, oneSidedLine: oneSided };
          console.log(`   → even 1px ring: ${even ? "YES" : "no"}   ·   one-sided line: ${oneSided ? "YES ⛔ M1 violation" : "no"}`);
        } catch (err) {
          console.log(`\n── ${tag}  ⛔ FAILED: ${err.message}`);
          report.push({ surface: key, locale, width, error: err.message });
        }
      }
      await ctx.close();
    }
  }

  await b.close();
  writeFileSync(`${SHOT}/material/report.json`, JSON.stringify(report, null, 2));
  const failed = report.filter((r) => r.error);
  console.log(`\n${report.length - failed.length}/${report.length} surfaces captured → ${SHOT}/material/report.json`);
  if (failed.length) { console.log("⛔ failures above — a probe that cannot reach its surface proves nothing"); process.exit(1); }
  console.log("⭐ THE PROBE RANKS, IT DOES NOT JUDGE. Open the -corner.png files.");
}

run().catch((e) => { console.error(e); process.exit(1); });
