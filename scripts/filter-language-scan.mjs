/**
 * BATCH 5 · the filter-language scan — measured, not asserted.
 *
 * Measures every player-facing FILTER control in a real browser, per surface, per width,
 * per locale: computed border-radius, painted height, font-size, whether it carries an
 * inline `style` attribute, and whether it is OUTLINED while unselected.
 *
 * ⛔ NEVER REGEX A CSS COLOUR. This design system's tokens are oklch() and Chrome hands
 *    `oklch(0.98 0.01 270)` straight back from getComputedStyle, so a `[\d.]+` scrape reads
 *    lightness/chroma/hue as R/G/B. Every colour here is painted into a 1x1 canvas and read
 *    back as real RGBA — which is also the only way to learn a border's ALPHA (the whole
 *    question behind "is this control outlined?").
 *
 * Usage:  node filter-scan.mjs [BASE] [--widths=360,1280] [--locales=en,sw,zh]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = (process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : process.env.BASE) || "http://localhost:3009";
const arg = (name, dflt) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
};
const WIDTHS = arg("widths", "360,1280").split(",").map(Number);
const LOCALES = arg("locales", "en").split(",");
const SHOTS = arg("shots", null);
const LANG_ATTR = { en: "en", sw: "sw", zh: "zh" };
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

/**
 * Every player filter surface, addressed through the ONE hook each rail carries:
 * `data-filter-rail`. ⭐ THE HOOK IS WHY THIS INSTRUMENT CAN BE TRUSTED. The first version
 * of this scan reached for `nav[aria-label] a[href^="/positions"]` and swept up a BOTTOM-NAV
 * link, reporting a 0px-tall "filter control" that was never a filter at all. A selector that
 * describes the shape of a thing finds things that merely have that shape.
 *
 * `count` is the number of rails each route must expose — the vacuity control. A surface that
 * matches zero rails is a broken instrument or a deleted feature, and either way it is not
 * a pass.
 */
const SURFACES = [
  { id: "/markets", path: "/markets", auth: false, rails: 1 },
  { id: "/results", path: "/results", auth: false, rails: 1 },
  { id: "/proposals", path: "/proposals", auth: false, rails: 1 },
  // Two rails: assets (primary) and durations (secondary).
  { id: "/updown", path: "/updown", auth: false, rails: 2 },
  { id: "/positions", path: "/positions", auth: true, rails: 1 },
  { id: "/profile/activity", path: "/profile/activity", auth: true, rails: 1 },
  { id: "/profile/account", path: "/profile/account", auth: true, rails: 1 },
  { id: "/updown/history", path: "/updown/history", auth: true, rails: 1 },
];

/** Inside a rail, these are the pressable controls. Menu triggers count; static keys do not. */
const CONTROLS = "a, button, summary";

/** Painted in the page: every colour goes through a canvas, never a regex. */
function MEASURE(sel) {
  const toRgba = (css) => {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = css;          // an unparseable value leaves the previous fillStyle
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2], a: +(d[3] / 255).toFixed(3) };
  };
  const rails = Array.from(document.querySelectorAll("[data-filter-rail]"));
  const els = rails.flatMap((rail) => Array.from(rail.querySelectorAll(sel)));
  const out = els.map((el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const bw = parseFloat(cs.borderTopWidth) || 0;
    const bc = toRgba(cs.borderTopColor);
    const selected =
      el.getAttribute("aria-pressed") === "true" ||
      el.getAttribute("aria-current") === "page" ||
      el.getAttribute("aria-selected") === "true";
    // ⚠️ ALL FOUR CORNERS, NOT ONE. /markets' direction button is the RIGHT half of a fused
    //    pair (`rounded-r-pill`), so its top-LEFT radius is 0 and reading that one corner
    //    reports a pill-shaped control as square. A control is "pill" if any corner is.
    const corners = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius];
    return {
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute("role"),
      // ⚠️ THREE KINDS OF CONTROL LIVE IN A FILTER RAIL, and only one of them is a pill.
      //    A PILL (`.kp-fchip`) is one option in a mutually-exclusive rail — the outline-only-
      //    when-selected rule is about these. A MENU TRIGGER (`<summary>`, and the direction
      //    button fused to its right edge) opens a panel; it must look like an affordance
      //    whether or not anything is chosen, so it is legitimately outlined at rest. A menu
      //    OPTION (`role="option"`) is a flat row inside that panel. Judging all three by the
      //    pill's rule would condemn two correct controls.
      pill: el.classList.contains("kp-fchip"),
      name: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 26),
      radius: [...new Set(corners)].join("/"),
      maxRadius: Math.max(...corners.map((c) => parseFloat(c) || 0)),
      h: +r.height.toFixed(1),
      w: +r.width.toFixed(1),
      font: cs.fontSize,
      inlineStyle: el.getAttribute("style"),
      borderW: bw,
      borderAlpha: bc.a,
      outlined: bw > 0 && bc.a > 0.02,
      selected,
      ariaPressed: el.getAttribute("aria-pressed"),
      ariaCurrent: el.getAttribute("aria-current"),
      chip: el.getAttribute("data-chip"),
      count: el.getAttribute("data-count"),
    };
  });
  return { rails: rails.length, controls: out };
}

const rows = [];
const notes = [];
const dayRail = { checked: false, why: "not reached", lines: [], fails: 0 };

const browser = await chromium.launch();
try {
  for (const locale of LOCALES) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 },
        deviceScaleFactor: 1,
      });
      // ⛔ E-106 · language comes from the `kp-locale` COOKIE, set on the CONTEXT so it is
      //    present on the very first request. There is no /api/locale route.
      await ctx.addCookies([
        { name: "kp-locale", value: locale, url: BASE },
      ]);
      const page = await ctx.newPage();

      // Local demo session for the two authed surfaces (404s in production).
      let authed = false;
      if (SURFACES.some((s) => s.auth)) {
        const res = await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => null);
        authed = !!res && res.status() < 400;
        if (!authed) notes.push(`[${locale} ${width}] /auth/demo unavailable (status ${res ? res.status() : "no response"}) — authed surfaces SKIPPED, not reported as empty`);
      }

      for (const s of SURFACES) {
        if (s.auth && !authed) continue;
        const res = await page.goto(`${BASE}${s.path}`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch((e) => ({ err: e }));
        if (res && res.err) { notes.push(`[${locale} ${width}] ${s.id} navigation FAILED: ${res.err.message}`); continue; }
        await page.waitForTimeout(700);

        // Refuse to measure the wrong language — a sweep that silently shoots `en` while
        // claiming `sw` produces output that LOOKS like evidence.
        const lang = await page.evaluate(() => document.documentElement.getAttribute("lang"));
        if (lang !== LANG_ATTR[locale]) {
          notes.push(`[${locale} ${width}] ${s.id} REFUSED: <html lang="${lang}">, expected "${LANG_ATTR[locale]}"`);
          continue;
        }

        const found = await page.evaluate(MEASURE, CONTROLS);
        // ⭐ THE VACUITY GUARD, and it is the whole reason this instrument can be believed.
        //    A surface reporting zero rails or zero controls is a broken selector or a deleted
        //    feature — never "clean". A scan that prints an empty table under a green heading
        //    is worse than one that fails, because its output looks like evidence.
        if (found.rails !== s.rails) {
          notes.push(`🔴 [${locale} ${width}] ${s.id} exposes ${found.rails} [data-filter-rail], expected ${s.rails}`);
        }
        if (found.controls.length === 0) {
          notes.push(`🔴 [${locale} ${width}] ${s.id} matched ZERO controls inside its rail(s) — the instrument, or the product`);
          continue;
        }
        for (const c of found.controls) rows.push({ locale, width, surface: s.id, ...c });

        if (SHOTS) {
          // ⭐ SCROLL THE RAIL INTO VIEW, THEN SHOOT THE VIEWPORT. A `fullPage` frame renders a
          //    sticky header mid-page — an artifact, not a screen — and `/profile/account`'s rail
          //    sits well below the fold, so a top-of-page frame would simply not contain it.
          //    This is what the player's screen actually holds when the control is in front of
          //    them, which is the only thing worth reading.
          await page.evaluate(() => document.querySelector("[data-filter-rail]")?.scrollIntoView({ block: "center" }));
          await page.waitForTimeout(350);
          const tag = `${s.id.replace(/[^a-z]+/gi, "-").replace(/^-|-$/g, "")}-${width}-${locale}`;
          await page.screenshot({ path: `${SHOTS}/${tag}.png` }).catch(() => {});
          // ⛔ AND OPEN EVERY CONTROL THAT OPENS. `/markets`' two <details> menus looked correct
          //    closed in every screenshot ever taken of them while their panels were FOUR PIXELS
          //    tall on a phone. Only opening the control found it.
          const menus = page.locator(".kp-discovery-bar details.kp-menu > summary");
          for (let i = 0; i < (await menus.count()); i++) {
            await menus.nth(i).scrollIntoViewIfNeeded().catch(() => {});
            await menus.nth(i).click().catch(() => {});
            await page.waitForTimeout(300);
            await page.screenshot({ path: `${SHOTS}/${tag}-menu${i}-open.png` }).catch(() => {});
            await page.keyboard.press("Escape").catch(() => {});
            await page.waitForTimeout(150);
          }
        }

        // The day rail's counts are derived in the page, so they are checked in the page.
        // Once is enough — it is a data property, not a geometric one.
        if (s.id === "/updown/history" && !dayRail.checked) {
          const days = found.controls.filter((c) => c.chip == null && c.count != null);
          if (days.length === 0) {
            dayRail.why = "the rail offered no day — this player has no Up & Down history";
          } else {
            dayRail.checked = true;
            const cardsOn = async (url) => {
              await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded", timeout: 45000 });
              await page.waitForTimeout(900);
              return page.evaluate(() => document.querySelectorAll('a[href^="/updown/udr_"]').length);
            };
            const hrefs = await page.evaluate(() =>
              Array.from(document.querySelectorAll('[data-filter-rail] a[href*="?day="]'))
                .map((a) => ({ href: a.getAttribute("href"), count: Number(a.getAttribute("data-count")) })));
            for (const d of hrefs) {
              const got = await cardsOn(d.href);
              const good = got === d.count;
              dayRail.lines.push(`${d.href}  promises ${d.count}, delivers ${got}  ${good ? "✓" : "🔴"}`);
              if (!good) dayRail.fails++;
            }
            // ⛔ AND THE DEAD END THE RAIL EXISTS TO CLOSE: an unparseable day must land on the
            //    unfiltered page WITH a working way out, not on an empty page with none.
            const junk = await cardsOn("/updown/history?day=lol");
            const all = await cardsOn("/updown/history");
            const out = await page.evaluate(() => !!document.querySelector('[data-filter-rail] a[href="/updown/history"][data-on]'));
            const good = junk === all && out;
            dayRail.lines.push(`?day=lol → ${junk} cards (unfiltered ${all}), "All days" selected ${out}  ${good ? "✓" : "🔴"}`);
            if (!good) dayRail.fails++;
          }
        }
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}

/* ───────────────────────────────── report ───────────────────────────────── */

const pad = (v, n) => String(v).padEnd(n);
console.log(`\nBASE ${BASE}   widths ${WIDTHS.join("/")}   locales ${LOCALES.join("/")}\n`);
console.log(
  pad("surface", 20) + pad("loc", 4) + pad("w", 6) + pad("control", 30) +
  pad("radius", 16) + pad("h", 7) + pad("font", 7) + pad("inline", 8) + pad("outlined", 10) + "sel",
);
console.log("-".repeat(120));
for (const r of rows) {
  console.log(
    pad(r.surface, 20) + pad(r.locale, 4) + pad(r.width, 6) + pad(`${r.tag}${r.role ? `[${r.role}]` : ""} ${r.name}`, 30) +
    pad(r.radius, 16) + pad(r.h, 7) + pad(r.font, 7) +
    pad(r.inlineStyle ? "YES" : "-", 8) + pad(r.outlined ? "YES" : "-", 10) +
    (r.selected ? "ON" : ""),
  );
}

/* ── the three defects, counted per surface ── */
const bySurface = new Map();
for (const r of rows) {
  const k = r.surface;
  if (!bySurface.has(k)) bySurface.set(k, []);
  bySurface.get(k).push(r);
}
console.log(`\n${"=".repeat(120)}\nVERDICT — per surface, judged over PILLS (worst case across every width x locale measured)\n`);
console.log(pad("surface", 20) + pad("pills", 8) + pad("other", 8) + pad("radii", 12) + pad("minH", 8) + pad("inline", 9) + pad("unsel-outlined", 16));
console.log("-".repeat(120));
let defects = 0;
for (const [surface, rs] of bySurface) {
  const pills = rs.filter((r) => r.pill);
  const other = rs.length - pills.length;
  const radii = [...new Set(pills.map((r) => r.radius))].join(",") || "—";
  const minH = pills.length ? Math.min(...pills.map((r) => r.h)) : -1;
  // Inline style is judged over EVERY control in the rail — law 82 has no pill exemption.
  const inline = rs.filter((r) => r.inlineStyle).length;
  const unselOutlined = pills.filter((r) => !r.selected && r.outlined).length;
  const bad = inline > 0 || unselOutlined > 0 || minH < 44 || radii !== "999px";
  if (bad) defects++;
  console.log(
    pad(surface, 20) + pad(pills.length, 8) + pad(other, 8) + pad(radii, 12) +
    pad(minH < 44 ? `${minH} 🔴` : minH, 8) +
    pad(inline ? `${inline} 🔴` : "0", 9) + pad(unselOutlined ? `${unselOutlined} 🔴` : "0", 16),
  );
}
console.log(`\n${defects === 0 ? "✓ every rail speaks ONE language" : `🔴 ${defects} surface(s) still diverge`}`);

if (notes.length) {
  console.log(`\n${"=".repeat(120)}\nNOTES\n`);
  for (const n of notes) console.log("  " + n);
}

/* ── promise == delivery, on the one rail that makes a numeric promise it derives itself ──
   ⭐ /updown/history's day rail is new in batch 5 and it is the only rail whose counts are
   computed in the page rather than by the shared discovery contract. A count that names a set
   is a promise; on this platform a promise a control does not keep is treated as money-adjacent
   even when no money moves. So it is checked here rather than reasoned about.
   ⚠️ It needs an authed session with Up & Down history, which production cannot give a
   read-only run — when the rail is absent the section SKIPS and says so. A skip is not a pass. */
if (dayRail.checked) {
  console.log(`\n${"=".repeat(120)}\nDAY RAIL — promise vs delivery\n`);
  for (const line of dayRail.lines) console.log("  " + line);
  if (dayRail.fails) { console.log(`\n🔴 ${dayRail.fails} day(s) promised a count they did not deliver`); process.exitCode = 1; }
  else console.log("\n✓ every day the rail offers delivers exactly the number it promises");
} else {
  console.log(`\n(day rail not exercised: ${dayRail.why})`);
}
console.log("");
