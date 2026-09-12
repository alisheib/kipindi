/**
 * qa:footer-reachable — every link in the global footer must be TAPPABLE at the bottom of
 * the page, not merely present in the DOM.
 *
 * 🔴 WHY THIS EXISTS (2026-09-12). `app-shell.tsx` clears the fixed 88px `BottomNav` with
 * `pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-0` — but that padding sits on `<main>`,
 * and `PublicFooter` is main's SIBLING. So below `lg` the document ended flush against a
 * fixed bar, and whatever landed last in the footer was painted over and un-tappable.
 *
 * At 360, in EN and SW, the link that lost was **`Export / close my account`** — the
 * data-subject-rights door. A player on a phone could not reach the control that exports or
 * closes their account. It was live, and no existing gate could see it.
 *
 * ⛔ WHY NO EXISTING GATE COULD SEE IT, WHICH IS THE TRANSFERABLE PART:
 *   · `test:tap-target` reads the height a control DECLARES in source. This link declared a
 *     perfectly good height. Being covered is not a property of the element.
 *   · `qa:chaos` / the overflow sweeps measure `scrollWidth > clientWidth`. Nothing overflowed
 *     — the footer was the right size, in the right place, underneath something else.
 *   · A SCREENSHOT IS BLIND HERE. A `position: fixed` bar paints over the link, and the image
 *     is identical whether the link is reachable or buried.
 * The only instrument that separates "visible" from "reachable" is `elementFromPoint` at the
 * element's own centre, after scrolling as far as the document goes.
 *
 * ─── THE THREE THINGS A GUARD MUST STATE ───
 *  1. POPULATION — DISCOVERED, NEVER LISTED: every `<a>` inside `<footer>`, at each of five
 *     viewport/locale cells. Currently 17 links × 5 cells = 85 probes.
 *  2. HEAD COUNT OUTSIDE THE FLOOR — zero, once the footer carries the same bottom clearance
 *     as `<main>`. It was 4 before the fix.
 *  3. THE CONTROL — `--prove-red` re-zeroes the footer's bottom padding in the page, which is
 *     exactly the pre-fix state. If that still passes, this drive is decorative.
 *
 * Local only (drives a dev server):
 *   BASE=http://localhost:3011 node scripts/footer-reachable.mjs
 *   BASE=http://localhost:3011 node scripts/footer-reachable.mjs --prove-red
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3011";
const PROVE_RED = process.argv.includes("--prove-red");

/** Below `lg` (1024) the rail is fixed and the clearance matters; 1280 is the control cell. */
const CELLS = [
  ["en", 360], ["sw", 360], ["zh", 360],
  ["en", 768], ["sw", 768],
  ["en", 1280],
];

let pass = 0;
const failures = [];
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; } else { failures.push(`${label}${extra ? ` — ${extra}` : ""}`); }
};

const host = new URL(BASE).hostname;
const browser = await chromium.launch();
let totalProbes = 0;

for (const [locale, width] of CELLS) {
  const ctx = await browser.newContext({ viewport: { width, height: 780 } });
  // ⚠️ The locale switch is the `kp-locale` COOKIE, not `?lang=`.
  await ctx.addCookies([{ name: "kp-locale", value: locale, domain: host, path: "/" }]);
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 120000 });

  // ⛔ VACUITY FLOOR. An earlier run of this probe caught the dev server mid-recompile, found
  // zero footer links, and would have reported "all reachable" over an empty set.
  await page.waitForFunction(() => document.querySelectorAll("footer a").length >= 10, null, { timeout: 90000 });

  if (PROVE_RED) {
    // The pre-fix state, restored: the footer no longer clears the fixed rail.
    await page.addStyleTag({ content: "footer { padding-bottom: 0 !important; }" });
  }

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);

  const results = await page.evaluate(() => {
    /**
     * ⚠️ PROBE EVERY LINE BOX, NOT THE BOUNDING BOX'S CENTRE. An inline `<a>` that wraps onto
     * two lines has a bounding rect spanning both, and its centre can land in the GAP between
     * them — where `elementFromPoint` correctly returns the parent `<li>`. The first version of
     * this drive did exactly that and reported three Swahili contact links as "covered by li"
     * when they were perfectly tappable. `getClientRects()` returns one rect PER LINE BOX,
     * which is the shape a finger actually meets. A link counts as reachable if ANY of its
     * line boxes can be hit — that is the real user question.
     */
    const describeBlocker = (hit) => {
      let n = hit;
      while (n && n !== document.body) {
        const cs = getComputedStyle(n);
        if (cs.position === "fixed" || cs.position === "sticky") return `${n.tagName.toLowerCase()} (${cs.position})`;
        n = n.parentElement;
      }
      return hit.tagName.toLowerCase();
    };

    return [...document.querySelectorAll("footer a")].map((a) => {
      const rects = [...a.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
      let onScreen = false;
      let reachable = false;
      let blocker = null;
      for (const r of rects) {
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        if (cy < 0 || cy > window.innerHeight || cx < 0 || cx > window.innerWidth) continue;
        onScreen = true;
        const hit = document.elementFromPoint(cx, cy);
        if (hit && (hit === a || a.contains(hit))) { reachable = true; blocker = null; break; }
        if (hit) blocker = describeBlocker(hit);
      }
      return { text: (a.textContent || "").trim().slice(0, 42), onScreen, reachable, blocker };
    });
  });

  for (const r of results) {
    totalProbes++;
    // A link scrolled out of the viewport is not this guard's subject — it is reachable by
    // scrolling. The defect is a link that IS on screen and still cannot be hit.
    if (!r.onScreen) { pass++; continue; }
    ok(`${locale}@${width} · "${r.text}" is tappable`, r.reachable, r.blocker ? `covered by ${r.blocker}` : "");
  }

  await ctx.close();
}

await browser.close();

console.log(`\n[footer-reachable] ${totalProbes} link probes across ${CELLS.length} cells${PROVE_RED ? "  (--prove-red)" : ""}`);
for (const f of failures) console.log(`  ✗ ${f}`);
console.log(`\n[footer-reachable] ${pass} passed, ${failures.length} failed`);
process.exit(failures.length === 0 ? 0 : 1);
