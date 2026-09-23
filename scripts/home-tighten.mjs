/**
 * PROVE the three home-page geometry facts U6 bought, at every phone width and in all three
 * locales — and prove each one can still FAIL.
 *
 *   npm run qa:home-tighten -- http://localhost:3042
 *   RED_D51=1  npm run qa:home-tighten -- <base>     the pip leads the figure again
 *   RED_D33=1  npm run qa:home-tighten -- <base>     the pool figure may break at its space again
 *   RED_TILE=1 npm run qa:home-tighten -- <base>     the topic tile is a wrapping flex row again
 *
 * ── WHY A BROWSER AND NOT A NODE SUITE ────────────────────────────────────────────────────
 * All three defects are things a laid-out page DOES, not things the source SAYS. D51 is a 16px
 * difference between two x-coordinates; D33 is a line break INSIDE a text node; the tile defect
 * is flex-wrap choosing to break a line rather than shrink a box. None of them can be read off
 * the CSS, and all three were invisible to every static guard in this repo — the tile one had a
 * `text-overflow: ellipsis` written for exactly the case that never reached it.
 *
 * ── WHAT THIS REFUSES TO DO ───────────────────────────────────────────────────────────────
 * ⛔ IT DOES NOT MEASURE ONLY WHAT IS ON SCREEN. The tiles render the top few topics, so the
 * labels that would break the layout are usually not among them — a check that measured the live
 * tiles alone would pass all year and fail the week `Teknolojia` got popular. Every label the
 * book can print is PLANTED into a real tile and measured there (§3).
 * ⛔ IT DOES NOT ASSERT "NO WRAP" ON MONEY AND CALL THAT SAFETY. A `nowrap` that overflows is a
 * CLIP, and §A5 forbids clipping money outright — so §2 plants the widest figure
 * `formatTzsCompact` can emit and requires it to FIT, not merely to stay on one line.
 * ⛔ IT DOES NOT TRUST A GREEN RUN ON ITS OWN. Each RED mode restores the pre-fix state in the
 * page and the run must go red; a green RED run is reported as a BROKEN HARNESS, because a check
 * that cannot fail is not evidence.
 *
 * ⚠️ PREMISE: a dev server on BASE serving THIS working tree.
 */
import { chromium } from "playwright";
import { localisedContext, assertLang } from "./qa-locale.mjs";

const BASE = process.argv[2] || process.env.BASE || "http://localhost:3042";
const RED_D51 = process.env.RED_D51 === "1";
const RED_D33 = process.env.RED_D33 === "1";
const RED_TILE = process.env.RED_TILE === "1";
const ANY_RED = RED_D51 || RED_D33 || RED_TILE;

/** Every category label the book can print, in all three locales, plus the tile's own "all". */
const LABELS = [
  "Zote", "Mada zote", "Michezo", "Uchumi", "Hali ya hewa", "Kripto", "Utamaduni", "Teknolojia", "Nyingine",
  "All", "All topics", "Sports", "Macro", "Weather", "Crypto", "Culture", "Tech", "Other",
  "全部", "所有主题", "体育", "宏观", "天气", "加密货币", "文化", "科技", "其他",
];
/** The widest figure `formatTzsCompact` can emit — ten characters. `test:money-format` §3 pins it. */
const WIDEST_MONEY = "TZS 999.9B";

const WIDTHS = [{ n: "320", w: 320, h: 640 }, { n: "360", w: 360, h: 780 }, { n: "412", w: 412, h: 892 }];
const failures = [];
let probes = 0;

const b = await chromium.launch();
for (const W of WIDTHS) {
  for (const locale of ["sw", "en", "zh"]) {
    const ctx = await localisedContext(b, { locale, width: W.w, height: W.h, baseUrl: BASE, reducedMotion: "reduce" });
    const p = await ctx.newPage();
    await p.goto(BASE + "/", { waitUntil: "load", timeout: 90000 });
    await p.waitForTimeout(2500);
    await assertLang(p, locale);

    // ── the RED controls: each restores EXACTLY the state the fix replaced, nothing else ──
    if (RED_D33) {
      await p.addStyleTag({ content: ".kp-topic__pool { white-space: normal !important; }" });
    }
    if (RED_TILE) {
      await p.addStyleTag({ content:
        ".kp-topic { display: flex !important; }" +
        ".kp-topic__glyph { grid-area: auto !important; }" +
        ".kp-topic__n { grid-area: auto !important; flex: 1 1 auto !important; display: block !important;" +
        "  white-space: nowrap !important; -webkit-line-clamp: none !important; }" +
        ".kp-topic__m { grid-area: auto !important; flex-basis: 100% !important;" +
        "  padding-left: calc(18px + var(--sp-3)) !important; }" });
    }
    if (RED_D51) {
      // D51's fix is DOM ORDER, not CSS — so the control puts the pip back in front of the figure.
      await p.evaluate(() => {
        for (const n of document.querySelectorAll(".kp-proof__num")) {
          const pip = n.querySelector(".kp-proof__pip");
          if (pip) n.insertBefore(pip, n.firstChild);
        }
      });
    }
    await p.waitForTimeout(250);

    const r = await p.evaluate((args) => {
      const LABELS = args.LABELS, WIDEST_MONEY = args.WIDEST_MONEY;
      const R = (n) => Math.round(n * 10) / 10;
      const out = { d51: null, d33: [], tiles: [], planted: [], money: [] };

      // ── §1 · the three proof figures share one left edge ──────────────────────────────
      // The pip is an ELEMENT, so measuring the number's BOX would report 16 either way and
      // could never see this defect. Only the TEXT's own client rects answer it.
      const digits = [];
      for (const el of document.querySelectorAll(".kp-proof__num")) {
        const xs = [];
        for (const n of el.childNodes) {
          if (n.nodeType !== 3 || !n.textContent.trim()) continue;
          const rg = document.createRange(); rg.selectNodeContents(n);
          for (const q of rg.getClientRects()) if (q.width > 0) xs.push(R(q.left));
        }
        if (xs.length) digits.push({ x: Math.min(...xs), txt: el.innerText.trim().slice(0, 12) });
      }
      out.d51 = { digits, spread: digits.length ? R(Math.max(...digits.map((z) => z.x)) - Math.min(...digits.map((z) => z.x))) : null };

      // ── §2 · the pool figure is one token, and it FITS ────────────────────────────────
      const pools = [...document.querySelectorAll(".kp-topic__pool")];
      const rectsOf = (el) => { const rg = document.createRange(); rg.selectNodeContents(el); return [...rg.getClientRects()].filter((q) => q.width > 0); };
      for (const el of pools) {
        const tile = el.closest(".kp-topic");
        const tb = tile.getBoundingClientRect(), pb = el.getBoundingClientRect();
        out.d33.push({ txt: el.innerText.trim(), lines: rectsOf(el).length, overflow: pb.right > tb.right + 0.5 || pb.left < tb.left - 0.5 });
      }
      const saved = pools.map((el) => el.textContent);
      for (const el of pools) el.textContent = WIDEST_MONEY;
      void document.body.offsetHeight;
      for (const el of pools) {
        const tile = el.closest(".kp-topic");
        const tb = tile.getBoundingClientRect(), pb = el.getBoundingClientRect();
        out.money.push({ w: R(pb.width), slack: R(tb.right - pb.right), lines: rectsOf(el).length, overflow: pb.right > tb.right + 0.5 });
      }
      pools.forEach((el, i) => { el.textContent = saved[i]; });

      // ── §3 · no topic name is cut, and the glyph never leaves the meta's row ──────────
      const tiles = [...document.querySelectorAll(".kp-topic")];
      for (const t of tiles) {
        const n = t.querySelector(".kp-topic__n"), g = t.querySelector(".kp-topic__glyph"), m = t.querySelector(".kp-topic__m");
        const nb = n.getBoundingClientRect(), gb = g ? g.getBoundingClientRect() : null, mb = m ? m.getBoundingClientRect() : null;
        out.tiles.push({
          L: n.innerText.trim(),
          h: R(t.getBoundingClientRect().height),
          cut: n.scrollWidth > n.clientWidth + 1,
          glyphOrphaned: !!(gb && mb && gb.bottom <= nb.top + 1),
        });
      }
      const nameEl = tiles[0] ? tiles[0].querySelector(".kp-topic__n") : null;
      if (nameEl) {
        const orig = nameEl.textContent;
        for (const L of LABELS) {
          nameEl.textContent = L; void nameEl.offsetWidth;
          out.planted.push({ L, cut: nameEl.scrollWidth > nameEl.clientWidth + 1, w: R(nameEl.scrollWidth), box: R(nameEl.clientWidth) });
        }
        nameEl.textContent = orig;
      }
      return out;
    }, { LABELS, WIDEST_MONEY });

    const at = W.n + "/" + locale;
    probes++;

    if (r.d51.digits.length !== 3) failures.push(at + " §1 expected 3 proof figures, saw " + r.d51.digits.length);
    else if (r.d51.spread > 1) failures.push(at + " §1 the proof figures do not share a left edge — spread " + r.d51.spread + "px (" + r.d51.digits.map((z) => z.txt + "@" + z.x).join(" ") + ")");

    if (!r.d33.length) failures.push(at + " §2 no .kp-topic__pool on the page — the figure is not a node, so it cannot be protected");
    for (const m of r.d33) {
      if (m.lines > 1) failures.push(at + " §2 the pool figure \"" + m.txt + "\" is broken across " + m.lines + " lines");
      if (m.overflow) failures.push(at + " §2 the pool figure \"" + m.txt + "\" is clipped by its tile (§A5)");
    }
    for (const m of r.money) {
      if (m.lines > 1) failures.push(at + " §2 planted \"" + WIDEST_MONEY + "\" broke across " + m.lines + " lines");
      if (m.overflow) failures.push(at + " §2 planted \"" + WIDEST_MONEY + "\" (" + m.w + "px) is CLIPPED — slack " + m.slack + "px (§A5)");
    }

    for (const t of r.tiles) {
      if (t.cut) failures.push(at + " §3 the topic name \"" + t.L + "\" is cut");
      if (t.glyphOrphaned) failures.push(at + " §3 the glyph on \"" + t.L + "\" sits on a row of its own above the name");
    }
    for (const t of r.planted) if (t.cut) failures.push(at + " §3 planted label \"" + t.L + "\" is cut — needs " + t.w + "px, box is " + t.box + "px");

    await ctx.close();
  }
}
await b.close();

const which = [RED_D51 ? "D51" : null, RED_D33 ? "D33" : null, RED_TILE ? "TILE" : null].filter(Boolean).join("+");
console.log("\nhome tighten — " + probes + " width × locale combinations — " + (ANY_RED ? "RED (" + which + ")" : "GREEN"));
if (failures.length) { for (const f of failures) console.log("  FAIL " + f); }
else console.log("  no failures");

if (ANY_RED) {
  // ⛔ THE POINT OF A RED RUN IS THAT IT GOES RED. A green one means the check is decorative.
  if (!failures.length) {
    console.error("\n🔴 BROKEN HARNESS — the RED control restored the defect and the check still PASSED.\n   This check proves nothing; fix the check before trusting any green run of it.");
    process.exit(2);
  }
  console.log("\nRED control behaved: " + failures.length + " failure(s), as required.");
  process.exit(0);
}
process.exit(failures.length ? 1 : 0);
