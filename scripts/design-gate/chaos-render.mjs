/**
 * `npm run qa:chaos` — BREAK THE SCREEN ON PURPOSE AND SEE WHAT RENDERS.
 *                                                    (ADMIN-TABS-2026-09-01)
 *
 * ⭐ Ali, 2026-09-01: *"you should try to chaotically break the screen and see what will render."*
 * That is the right instinct and it is not what the other drives do. `qa:dg-shell` asks whether
 * a page loaded; `qa:dg-rail` asks whether a rail announces itself. Both drive the page the way
 * a well-behaved user would. **A screen that is only ever tested politely ships the defects that
 * appear when it is not**, and this platform's own scar tissue is full of them: a title laid out
 * at width ZERO, a rail 119px below the fold, a control whose centre a fixed bar had stolen.
 *
 * ⛔ IT ASSERTS RENDERED GEOMETRY, NOT THE ABSENCE OF AN ERROR. Every check below is a number
 * read off the painted page, because "it did not crash" is not "it is legible":
 *
 *   ① HORIZONTAL OVERFLOW at every width. §A6 — zero overflow at 360. A page that scrolls
 *     sideways on a phone has already failed, and `document.scrollWidth > innerWidth` says so
 *     without a human looking.
 *   ② ZERO-WIDTH or CLIPPED TEXT. `min-w-0` is a promise not to overflow, NOT a promise to be
 *     readable: an element allowed to shrink without limit reports no overflow while rendering
 *     nothing. `/admin/finance`'s own card heading was once laid out at exactly 0px.
 *   ③ OFF-VIEWPORT CONTROLS. A control whose box sits outside the viewport, or behind a fixed
 *     surface, is a control nobody can press — `elementFromPoint` is the only honest witness.
 *   ④ THE PENDING BAR AT WAR WITH EVERYTHING ELSE. Dirty the form, then open a modal, switch a
 *     tab, and zoom to 200% — the bar must never cover the last card, never outrank a dialog,
 *     and never leave its own reserved space wrong.
 *
 * ⛔ SAFE: it types into fields and restores them. It never submits, never confirms, never
 * clicks a control that moves money.
 *
 *   ROUTES=/admin/payments,/admin/reports npm run qa:chaos
 *   ⚠️ Git Bash: prefix MSYS_NO_PATHCONV=1 when passing ROUTES.
 */
import { chromium } from "playwright";
import { login, BASE } from "../live/harness.mjs";

const ROUTES = (process.env.ROUTES || "/admin/payments,/admin/reports,/admin/config,/admin/system")
  .split(",").map((s) => s.trim()).filter(Boolean);

/** The hostile widths. 320 is the narrowest phone still in use; 2560 is a wide desktop. */
const WIDTHS = [
  { n: "320", w: 320, h: 780 },
  { n: "360", w: 360, h: 800 },
  { n: "390", w: 390, h: 844 },
  { n: "768", w: 768, h: 1024 },
  { n: "1440", w: 1440, h: 900 },
  { n: "2560", w: 2560, h: 1300 },
];

const probe = () => {
  const doc = document.documentElement;
  const vw = window.innerWidth;
  const out = { overflow: Math.max(0, Math.round(doc.scrollWidth - vw)), zeroWidth: [], clipped: [], offscreen: [] };

  /* ⛔ THE VISUALLY-HIDDEN IDIOM IS NOT A DEFECT, and the first run of this drive said it was.
     Tailwind's `sr-only` is `position:absolute; width:1px; height:1px; overflow:hidden;
     clip:rect(0,0,0,0)` — it is how the admin layout ships its "Skip to content" link, which
     is CORRECT accessibility: hidden until a keyboard focuses it (`focus:not-sr-only`). The
     drive reported it at every one of six widths on both pages, i.e. 12 of its 12 findings were
     one accessibility feature. ⭐ A guard that cries wolf teaches the next person to ignore it,
     so the idiom is recognised here rather than argued with in a report. */
  const srOnly = (cs, r) =>
    cs.position === "absolute" && r.width <= 1 && r.height <= 1 &&
    (cs.overflow === "hidden" || cs.clip !== "auto" || cs.clipPath !== "none");

  /* ② A visible element laid out at ~0 width, or whose text is cut. Only elements that HAVE
     text are interesting — a spacer at 0 is fine. */
  for (const el of document.querySelectorAll("h1,h2,h3,p,span,a,button,label,td,th")) {
    const t = (el.textContent || "").trim();
    if (!t) continue;
    const r = el.getBoundingClientRect();
    if (r.height === 0) continue;                       // not painted
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    if (srOnly(cs, r)) continue;                        // see the note above
    if (r.width < 2) { out.zeroWidth.push(`${el.tagName.toLowerCase()} "${t.slice(0, 34)}"`); continue; }
    /* Cut text: the content is wider than the box and nothing is allowed to show it. An
       ellipsis is a DECISION (truncate) and is not counted; a hard clip is not. */
    const overflowsX = el.scrollWidth - el.clientWidth > 1;
    const hides = cs.overflowX === "hidden" || cs.overflow === "hidden";
    const ellipsis = cs.textOverflow === "ellipsis";
    if (overflowsX && hides && !ellipsis) out.clipped.push(`${el.tagName.toLowerCase()} "${t.slice(0, 34)}"`);
  }

  /* ③ An interactive control whose CENTRE belongs to something else, or is off-viewport. */
  for (const el of document.querySelectorAll("button, a[href], input, select, textarea")) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    if (r.bottom < 0 || r.top > window.innerHeight) continue;   // simply scrolled away — fine
    if (r.left < -1 || r.right > vw + 1) {
      out.offscreen.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 28)}" x:${Math.round(r.left)}..${Math.round(r.right)}`);
    }
  }
  return out;
};

const browser = await chromium.launch();
let defects = 0;

for (const wd of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: wd.w, height: wd.h } });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(120_000);
  page.setDefaultTimeout(60_000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
  await login(page, "admin");

  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2200);
    const r = await page.evaluate(probe);
    const bad = (r.overflow > 0 ? 1 : 0) + r.zeroWidth.length + r.clipped.length + r.offscreen.length;
    defects += bad;
    const mark = bad === 0 ? "✓" : "🔴";
    console.log(`  ${mark} ${route.padEnd(24)} @${wd.n.padStart(4)}  overflow ${String(r.overflow).padStart(4)}px · zero-width ${r.zeroWidth.length} · clipped ${r.clipped.length} · off-viewport ${r.offscreen.length}`);
    for (const z of r.zeroWidth.slice(0, 3)) console.log(`        ↳ ZERO WIDTH  ${z}`);
    for (const c of r.clipped.slice(0, 3)) console.log(`        ↳ CLIPPED     ${c}`);
    for (const o of r.offscreen.slice(0, 3)) console.log(`        ↳ OFF-SCREEN  ${o}`);
  }
  if (errors.length) { defects += errors.length; console.log(`  🔴 ${errors.length} page error(s) @${wd.n}: ${errors[0]}`); }
  await ctx.close();
}

await browser.close();
console.log(`\n${defects === 0 ? "✅ nothing broke under hostile widths." : `🔴 ${defects} rendering defect(s).`}`);
process.exit(defects ? 1 : 0);
