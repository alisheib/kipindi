/**
 * THE RG↔FOOTER SEAM PROBE — batch 4's instrument for the live regression Ali reported
 * ("this section now feels redundant"). It measures the two distinct defects separately, because
 * they have separate fixes and either could be fixed while the other survives:
 *
 *   A · DUPLICATION — the RG line and the footer's PLAY SAFE column render the SAME three
 *       destinations. Counted by HREF, not by localised text: the href is the stable identity, it
 *       does not change between en/sw/zh, and it keeps working after the labels are removed.
 *
 *   B · STACKED SPACING — four uncoordinated sources of vertical space meet at this seam, and
 *       NONE of them knows about the others:
 *         1. TrustBand's `.kp-band--closes`  padding-bottom : --rh-section (96)
 *         2. `.kp-rg`                        margin-top     : --rh-close   (48)
 *         3. `.kp-rg`                        padding-top    : --rh-close   (48)
 *         4. the RG wrapper's `.kp-band__inner` padding-bottom: --rh-close (48)
 *         5. `<footer>`                      margin-top     : mt-12        (48)
 *       The finding named 1+4+5 = 192. Items 2 and 3 were NOT in the finding — they add a further
 *       96 ABOVE the rule. So the probe measures the REAL geometry rather than re-deriving the sum:
 *       every gap is read off `getBoundingClientRect()` in document coordinates.
 *
 * Run: LOCALES=en,sw,zh node npm run qa:landing-seam <outDir> [baseUrl]
 * Read-only. Shots are EVIDENCE → gitignored dir only (DESIGN_AUTHORITY §0b).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { localisedContext, assertLang } from "./qa-locale.mjs";

const OUT = process.argv[2] || ".qa-design-seam/seam";
const BASE = process.argv[3] || "http://localhost:3009";
const LOCALES = (process.env.LOCALES || "en,sw,zh").split(",");
const WIDTHS = [
  { name: "360", w: 360, h: 780 },
  { name: "768", w: 768, h: 1024 },
  { name: "1280", w: 1280, h: 900 },
  { name: "1920", w: 1920, h: 1080 },
];

/** The three RG destinations, by href. The footer owns these; the RG line duplicated them. */
const RG_HREFS = ["/profile/responsible-gambling", "/legal/responsible-gambling", "tel:"];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const rows = [];
const failures = [];

for (const locale of LOCALES) {
  for (const W of WIDTHS) {
    const ctx = await localisedContext(browser, {
      locale, width: W.w, height: W.h, baseUrl: BASE, reducedMotion: "reduce",
    });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 90000 });
    await assertLang(page, locale);
    // Reveal-on-scroll: every band must be revealed before anything is measured, or the seam is
    // measured against a band that has not taken its final height yet.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40));
      }
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 700));
    });

    const m = await page.evaluate((hrefs) => {
      const abs = (el) => { const r = el.getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY, h: r.height }; };
      const anchors = [...document.querySelectorAll("a[href]")];
      const footer = document.querySelector("footer");
      const rg = document.querySelector('[data-band="rg"]');
      const claret = document.querySelector("footer .claret-rule");
      const trust = document.querySelector('[data-band="trust"]');

      // ── A · duplication, counted by href ────────────────────────────────────────────────────
      const dup = {};
      for (const h of hrefs) {
        const hits = anchors.filter((a) => {
          const v = a.getAttribute("href") || "";
          return h === "tel:" ? v.startsWith("tel:") : v === h;
        });
        dup[h] = {
          total: hits.length,
          inRg: hits.filter((a) => rg && rg.contains(a)).length,
          inFooter: hits.filter((a) => footer && footer.contains(a)).length,
        };
      }

      // ── B · the real geometry of the seam ───────────────────────────────────────────────────
      const kids = (el) => (el ? [...el.children].filter((c) => c.getBoundingClientRect().height > 0) : []);
      const trustInner = trust ? trust.querySelector(".kp-band__inner") || trust : null;
      const trustKids = kids(trustInner);
      const trustLastBottom = trustKids.length ? Math.max(...trustKids.map((c) => abs(c).bottom)) : null;

      const rgBox = rg ? abs(rg) : null;                       // top edge == the 1px border-top rule
      const rgKids = kids(rg);
      const rgContentTop = rgKids.length ? Math.min(...rgKids.map((c) => abs(c).top)) : null;
      const rgContentBottom = rgKids.length ? Math.max(...rgKids.map((c) => abs(c).bottom)) : null;
      const claretTop = claret ? abs(claret).top : null;

      const cs = (el, p) => (el ? getComputedStyle(el)[p] : null);
      const rgWrapInner = rg ? rg.closest(".kp-band__inner") : null;

      return {
        dup,
        // ABSOLUTE document coordinates for the clip. ⚠️ `boundingBox()` + a non-fullPage `clip`
        // are BOTH viewport-relative, and this seam sits ABOVE the final scroll position at 360 —
        // so that combination clipped the sticky header instead of the seam and still produced a
        // plausible-looking frame. `fullPage: true` + document coords is the only pairing that
        // frames the thing being measured.
        docRgTop: rgBox ? Math.round(rgBox.top) : null,
        docClaretTop: claretTop != null ? Math.round(claretTop) : null,
        rgPresent: !!rg,
        rgHeight: rgBox ? Math.round(rgBox.h) : null,
        rgLinkCount: rg ? rg.querySelectorAll("a").length : null,
        // the blank band between the trust band's last content and the RG's own rule
        gapAboveRule: trustLastBottom != null && rgBox ? Math.round(rgBox.top - trustLastBottom) : null,
        // rule → first RG glyph (this is .kp-rg's padding-top)
        gapRuleToContent: rgBox && rgContentTop != null ? Math.round(rgContentTop - rgBox.top) : null,
        // last RG glyph → the footer's claret rule
        gapRgToClaret: rgContentBottom != null && claretTop != null ? Math.round(claretTop - rgContentBottom) : null,
        computed: {
          trustPadBottom: cs(trust, "paddingBottom"),
          rgMarginTop: cs(rg, "marginTop"),
          rgPadTop: cs(rg, "paddingTop"),
          rgWrapInnerPadBottom: cs(rgWrapInner, "paddingBottom"),
          footerMarginTop: cs(footer, "marginTop"),
        },
        docHeight: document.body.scrollHeight,
        overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      };
    }, RG_HREFS);

    // Clip a frame a human can actually read: the seam, from the trust band's tail to the footer.
    // Coordinates are ABSOLUTE (document), paired with fullPage — see docRgTop's comment above.
    const shot = `${OUT}/seam-${W.name}-${locale}.png`;
    try {
      const anchorTop = m.docRgTop ?? m.docClaretTop;
      if (anchorTop != null) {
        const top = Math.max(0, anchorTop - 300);
        const bottom = (m.docClaretTop ?? anchorTop) + 140;
        await page.screenshot({
          path: shot, fullPage: true,
          clip: { x: 0, y: top, width: W.w, height: Math.max(200, bottom - top) },
        });
      } else {
        failures.push(`${W.name}/${locale}: nothing to anchor the seam clip on`);
      }
    } catch (e) { failures.push(`${W.name}/${locale}: screenshot ${e.message}`); }

    const dupTotals = RG_HREFS.map((h) => m.dup[h].total);
    rows.push({ locale, width: W.name, ...m, consoleErrors: consoleErrors.length });

    if (m.overflowX > 0) failures.push(`${W.name}/${locale}: overflowX ${m.overflowX}px`);
    if (consoleErrors.length) failures.push(`${W.name}/${locale}: ${consoleErrors.length} console error(s): ${consoleErrors[0]}`);

    console.log(
      `${locale} ${W.name.padStart(4)} | dup(total/rg/footer) ` +
        RG_HREFS.map((h) => `${m.dup[h].total}/${m.dup[h].inRg}/${m.dup[h].inFooter}`).join(" ") +
        ` | rgLinks=${m.rgLinkCount} h=${m.rgHeight}` +
        ` | gaps above-rule=${m.gapAboveRule} rule→text=${m.gapRuleToContent} text→claret=${m.gapRgToClaret}` +
        ` | ovf=${m.overflowX} err=${consoleErrors.length}`,
    );
    if (locale === "en" && W.name === "1280") {
      console.log(`      computed: ${JSON.stringify(m.computed)}`);
    }
    await ctx.close();
  }
}

writeFileSync(`${OUT}/seam.json`, JSON.stringify({ base: BASE, rows, failures }, null, 2));
await browser.close();

console.log(`\n${rows.length} measurements · shots+json → ${OUT}`);
if (failures.length) { console.log(`FAILURES (${failures.length}):`); for (const f of failures) console.log(`  - ${f}`); process.exitCode = 1; }
else console.log("no overflow, no console errors");
