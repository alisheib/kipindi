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
  /**
   * ⭐ THE MONEY-IN CTA ON STRUCK GILT — added 2026-08-07 (ATOM D-2), and it is the
   * falsifiable check for that atom that no CSS-reading gate can be.
   *
   * The adoption is a className in `top-app-bar.tsx`, so `qa:bundle-css` cannot see
   * it: that probe reads the shipped stylesheet, and the stylesheet is identical
   * whether or not any element ever takes the class. **What proves the adoption is
   * the computed style of the REAL element on the REAL page** — the two-layer
   * `backgroundImage` (sheen over metal) is the signature, and it can only appear if
   * `.gilt-metal` actually applies to this control.
   *
   * ⛔ A PERSONA IS REQUIRED and that is not incidental: the deposit pill renders
   * only for `user.isAuthed`, and only when the route is not already
   * `/wallet/deposit`. Shot as a visitor this surface does not exist, and the probe
   * would report "not found" over a control that is working.
   */
  gilt: {
    route: "/markets",
    persona: "fleet:07",
    selector: "a.gilt-metal",
    label: "money-in CTA, struck gilt (M3) — the top-bar Deposit pill",
    props: ["backgroundImage", "backgroundSize", "boxShadow", "color", "height"],
    vars: ["--gilt-metal", "--gilt-sheen", "--gilt-metal-edge", "--gold-fg", "--light-angle"],
  },
  /**
   * ⭐ THE THREE FLOATING RUNGS (ATOM 2c-b). `--shadow-modal`, `--shadow-overlay`
   * and `--shadow-overlay-up` each carried `inset 0 1px 0 oklch(100% 0 0 / 0.06)` —
   * a PURE-WHITE line on the top edge only, banned twice over by M1 ("an EVEN 1px
   * inner ring … carrying a 4% royal tint, never pure white — and never a
   * one-sided line").
   *
   * ⛔ EACH OF THESE NEEDS A CLICK, WHICH IS WHY THEY DID NOT EXIST BEFORE. A
   * floating surface is not on the page at load; `qa:contrast-rendered` says so
   * itself ("cannot see a state it cannot reach"). So a surface may now declare
   * `open` — the controls to press, by a LOCALE-INDEPENDENT selector, before the
   * surface is located. ⛔ Never an aria-label: this probe iterates EN/SW/ZH and a
   * label lookup would silently miss on two of the three and photograph nothing.
   */
  /**
   * 🔴 RE-AIMED TWICE OVER, 2026-08-07 (ATOM D-2), AND BOTH REASONS ARE WORTH KEEPING.
   *
   * ① **The trigger depended on production DATA and quietly stopped existing.** It
   * clicked `.mcardp-info`, which `market-card.tsx` renders as `{live && <HowItWorks/>}`
   * — only on an OPEN market. Session 34 reached it 36/36 times because the board had
   * open markets; on 2026-08-07 the board held three RESOLVED cards, the count was
   * **0**, and the probe reported a 60s timeout that reads exactly like a broken
   * surface. ⛔ **A probe whose reachability depends on live content will eventually
   * report a data state as a defect.** The first-visit primer is the kit `Modal` too,
   * it is NOT feature-flagged (unlike the chat — see E-123), and it renders on any
   * route for any context with empty `localStorage` — which every cell here has,
   * because each opens a fresh context. So there is nothing to click.
   *
   * ② **The selector was a Tailwind class the merge removed.** It matched
   * `.shadow-modal`, and ATOM D-2 replaced that on the kit Modal with `mat-modal` —
   * so the instrument went stale the moment the product improved. It now anchors on
   * `[data-rung]`, an attribute whose whole purpose is to say which rung a surface
   * picked, and which therefore survives restyling. ⭐ That is the same rule the M1
   * probe learned the hard way: **assert the structure, not the spelling.**
   */
  modal: {
    route: "/markets",
    persona: "fleet:07",
    selector: '[data-rung="modal"]',
    label: "centred dialog (rung 3) — the kit Modal, via the first-visit primer",
    props: ["boxShadow", "backgroundImage", "backgroundColor", "borderColor"],
    vars: ["--elev-modal", "--wash-modal", "--edge-lit-strong"],
  },
  dropdown: {
    route: "/markets",
    persona: "fleet:07",
    // `data-unread` is on the bell itself and is the same in every language.
    open: [{ click: "button[data-unread]", why: "the notifications bell" }],
    selector: ".shadow-overlay",
    label: "attached panel (rung 2) — --shadow-overlay",
    props: ["boxShadow", "backgroundColor", "borderColor"],
    vars: ["--shadow-overlay", "--edge-lit-strong"],
  },
  /**
   * ⚠️ THE NEEDLE DRAWER IS TWO SURFACES IN ONE RULE: `shadow-overlay-up
   * sm:shadow-modal`. Below 640 it is a bottom sheet casting UPWARD; at and above
   * 640 it becomes a centred panel on the dialog rung. The class `.shadow-overlay-up`
   * is in the DOM at every width, so the SELECTOR matches throughout — but the
   * COMPUTED value is `--shadow-overlay-up` only at 360. Read the report that way:
   * 360 is the only cell that proves the up-cast token.
   */
  /**
   * ── ATOM 2c-c's LIVE surfaces ────────────────────────────────────────────
   * ⛔ AND THE ONES THAT ARE NOT HERE ARE NOT HERE FOR A REASON. Three of that
   * atom's ten converted sites are DEAD CSS with zero consumers in `src/` —
   * `.pbar-yes`, `.pbar-no` (the live probability bar is `.tipbar-*`) and the kit
   * `.toast` (the live toast is the React component, which paints
   * `shadow-[var(--shadow-card)]` and never takes the class). No probe can shoot
   * them because nothing renders them, and inventing a surface to photograph
   * would be evidence of a fixture, not of the product.
   */
  "glass-panel": {
    route: "/auth/login",
    selector: ".glass-panel",
    label: "glass panel (rung 1) — the sign-in card",
    props: ["boxShadow", "backgroundColor", "borderColor"],
    vars: ["--edge-lit"],
  },
  /**
   * 🔴 THE THREE `chat-*` SURFACES CANNOT BE REACHED ON PRODUCTION TODAY, and
   * that is a product fact, not a broken probe — E-123. `layout.tsx:101` gates the
   * whole widget behind `isChatbotEnabled()`, an operator switch, and measured
   * 2026-08-06 `.cm-bubble` count is **0** on `/`, `/help` AND `/markets`. They
   * are kept here, defined and failing loudly, because the CSS they photograph is
   * live in the bundle and the day the switch flips these are the shots to take.
   * ⛔ Do not "fix" the timeout by pointing them at a fixture: a screenshot of a
   * surface the product does not serve is evidence of a fixture.
   */
  "chat-bubble": {
    route: "/help",
    selector: ".cm-bubble",
    label: "support-chat launcher (rung 1) — --edge-lit, and --edge-lit-strong on hover",
    props: ["boxShadow", "backgroundImage", "borderColor"],
    vars: ["--edge-lit", "--edge-lit-strong"],
  },
  "chat-panel": {
    route: "/help",
    open: [{ click: ".cm-bubble", why: "the support-chat launcher" }],
    selector: ".cm-panel",
    label: "support-chat panel (rung 2/3) — --edge-lit-strong",
    props: ["boxShadow", "backgroundColor", "borderColor"],
    vars: ["--edge-lit-strong"],
  },
  "chat-send": {
    route: "/help",
    open: [{ click: ".cm-bubble", why: "the support-chat launcher" }],
    selector: ".cm-send",
    label: "support-chat send control — the E-121 glyph, 36×36",
    props: ["boxShadow", "backgroundColor", "color", "borderColor"],
    vars: ["--brand-500", "--brand-400", "--btn-hover-gain"],
  },
  sheet: {
    route: "/profile/responsible-gambling",
    persona: "fleet:07",
    open: [{ click: "button[aria-haspopup='dialog']", why: "Manage the Needle (settings variant)" }],
    selector: ".shadow-overlay-up",
    label: "bottom sheet (rung 2, cast UP) — --shadow-overlay-up @360; --shadow-modal at sm:",
    props: ["boxShadow", "backgroundColor", "borderColor"],
    vars: ["--shadow-overlay-up", "--shadow-modal", "--edge-lit-strong"],
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
      // 🔴 THE THIRD REASON THE `modal` SURFACE WAS UNREACHABLE — 0/6, found 2026-08-10.
      // The block above this loop records two re-aimings of that surface (a trigger that
      // depended on live data, and a selector the merge renamed). Both were fixed, the
      // comment concluded the primer "renders on any route for any context with empty
      // localStorage — so there is nothing to click", and the probe still timed out on
      // every cell. The reason is in the PRODUCT, not the probe:
      // `first-visit-primer.tsx:232` — `if (/HeadlessChrome|Playwright/i.test(
      // navigator.userAgent)) return;` — the primer deliberately refuses to open for
      // automation, so the one Modal instance reachable without money or operator state
      // is the one instance a Playwright context can never see.
      //
      // ⭐ Overriding the UA here is honest, and it is the narrow kind. That check exists
      // to keep an onboarding dialog away from crawlers and screenshot bots in the wild;
      // it is not a product behaviour this probe is meant to measure. We photograph the
      // real component, rendered by the real page, with real CSS — only the string the
      // page uses to decide "is this a bot" is changed. ⛔ Nothing else about the context
      // is faked, and no other surface needs this.
      //
      // ⚠️ THE LESSON, because it cost 6 timeouts and a wrong "the blocker is dead":
      // **a surface can have more than one reason to be unreachable, and fixing the two
      // you found does not make it reachable.** The two earlier re-aimings were correct
      // and the conclusion drawn from them was still false — reachability is a property
      // to MEASURE by running the probe, never to infer from having fixed the last cause.
      const ctx = await b.newContext({
        viewport: { width: WIDTHS[0], height: 900 },
        deviceScaleFactor: 4,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/131.0.0.0 Safari/537.36 50pick-design-probe",
      });
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

          // ⛔ OPEN THE SURFACE BEFORE LOOKING FOR IT, and FAIL LOUDLY if the
          // control is not there. A missing trigger must never degrade into
          // "selector not found on the page" — that reads as the surface being
          // unstyled when it was never opened, which is a phantom finding.
          for (const step of s.open ?? []) {
            const trigger = page.locator(step.click).first();
            await trigger.waitFor({ state: "visible", timeout: 60_000 });
            await trigger.click();
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
