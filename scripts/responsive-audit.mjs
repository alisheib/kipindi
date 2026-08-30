/**
 * RESPONSIVE-AUDIT — the master full-platform responsiveness driver.
 *
 * For every surface (player + all 25 operator routes) it loads at EVERY
 * breakpoint (320 / 360 / 390 / 430 / landscape / 768 / 1024 / 1280 / 1920),
 * optionally in EN/SW/ZH, and asserts the pass-criteria in
 * .claude/skills/50pick-standards/references/responsiveness-and-visual.md:
 *   1. 0 horizontal overflow           (documentElement.scrollWidth ≤ clientWidth + 1)
 *   2. no clipped-not-scrolled content (overflow lives in an auto/scroll container)
 *   3. nothing off-screen              (fixed/sticky overlays fully within the viewport)
 *   4. touch targets ≥ 40×40           (buttons / nav / chips-as-buttons — reported)
 *   5. no console/page errors
 *   6. exactly ONE <main>, and it is #main-content   (B7 / WCAG landmarks, 2026-08-22)
 * It ALSO opens each overlay (notifications, avatar menu, language, bet dial +
 * confirm, admin filter/menu) at the phone + landscape widths and asserts the
 * dialog/menu fits the viewport with its primary action reachable.
 *
 * Screenshots → .50pick-shots/responsive/<surface>/<width>[-<locale>].png  (READ them).
 * Emits a per-surface PASS/FAIL table + a global summary; exit 1 on any hard fail.
 *
 * Run against a FRESH server (see the 50pick-standards skill → references/
 * responsiveness-and-visual.md; prefer `next build && next start` for CSS fidelity):
 *   BASE=http://localhost:3000 node scripts/responsive-audit.mjs
 *
 * Env:
 *   BASE      default http://localhost:3000
 *   SURFACE   player | admin | overlays | all   (default all)
 *   LOCALES   en | en,sw,zh                       (default en; overlays always en)
 *   WIDTHS    320,430,land                         (filter breakpoints by tag or width)
 *   ONLY      /markets,/wallet                     (filter surfaces by path substring)
 *   SHOTS_ALL 1                                     (screenshot every width, not just xs+desktop)
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3000";
const SURFACE = process.env.SURFACE || "all";
const LOCALES = (process.env.LOCALES || "en").split(",").map((s) => s.trim());
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const SHOTS_ALL = process.env.SHOTS_ALL === "1";
const SHOTS = ".50pick-shots/responsive";
mkdirSync(SHOTS, { recursive: true });

const BREAKPOINTS = [
  { tag: "xs", w: 320, h: 568 },
  { tag: "sm", w: 360, h: 740 },
  { tag: "md", w: 390, h: 844 },
  { tag: "lgph", w: 430, h: 932 },
  { tag: "land", w: 740, h: 360 },
  { tag: "tablet", w: 768, h: 1024 },
  { tag: "tabletL", w: 1024, h: 768 },
  { tag: "laptop", w: 1280, h: 800 },
  { tag: "desktop", w: 1920, h: 1080 },
  // DESIGN_AUTHORITY B7. The sweep used to stop at 1920, which is precisely why a
  // 2,344px-wide admin console passed every cycle: the widest cell it ever looked
  // at was narrower than the defect.
  { tag: "wide", w: 2560, h: 1440 },
];
/**
 * The measure tiers, mirrored from globals.css. This is the ONE place the numbers
 * are duplicated outside the stylesheet; `npm run test:measure` cross-checks the
 * stylesheet against the same values, so a drift here fails there.
 */
const TIER_MAX = {
  console: 1600, board: 1280, reading: 1080, form: 640, receipt: 560, auth: 1152,
};

const WIDTH_FILTER = process.env.WIDTHS
  ? process.env.WIDTHS.split(",").map((s) => s.trim())
  : null;
const widths = WIDTH_FILTER
  ? BREAKPOINTS.filter((b) => WIDTH_FILTER.includes(b.tag) || WIDTH_FILTER.includes(String(b.w)))
  : BREAKPOINTS;

// ---- surfaces --------------------------------------------------------------
const PLAYER = [
  // 🔴 `/updown` AND `/updown/history` WERE NEVER IN THIS LIST — the PLAYER surface of an entire
  // second product line, unaudited at every width since it was built. Added 2026-08-24 (E-196).
  // ⚠️ THE EXACT SAME OMISSION WAS FOUND AND FIXED FOR THE ADMIN SIDE ON 2026-07-30 — the note
  // in the ADMIN list below says so in its own words — and the player half was left open, which
  // is why nobody has been looking at the board's card widths. The defect that surfaced it
  // (a bet button clipping its own payout figure at 320-390 and 980-1147) was found by a
  // DIFFERENT driver entirely, on a width this sweep does cover, purely by luck.
  // ⛔ A second product line is not an edge case; it is half the product.
  "/updown", "/updown/history",
  "/", "/markets", "/positions", "/positions/performance", "/leaderboard",
  "/proposals", "/proposals/new", "/results", "/live", "/wallet",
  "/wallet/deposit", "/wallet/withdraw", "/profile", "/profile/account",
  "/profile/kyc", "/profile/invite", "/profile/sessions",
  "/profile/source-of-funds", "/profile/responsible-gambling",
  "/fairness", "/help", "/legal/terms", "/legal/privacy", "/legal/aml",
  "/legal/responsible-gambling",
  "/auth/login", "/auth/register", "/auth/forgot-password",
];
/* 🔴 DG-A-08 (2026-08-30) — THIS FILE HELD THE SECOND COPY OF THE ADMIN ROUTE LIST, AND THE
   FILE IT DIVERGED FROM FORBIDS EXACTLY THAT IN WRITING. `scripts/design-gate/routes.mjs`
   opens with a dated DG-A-01 ruling (2026-08-29): *"the list lives here and nowhere else …
   Copying it into a second file would re-create the divergence (DESIGN_AUTHORITY §0a — one
   fact, one home)."* It had already re-created it: measured today, `ADMIN_ROUTES` held **38**
   and the copy here held **35** — a strict subset missing `/admin/markets/new`, `/admin/roles`
   and `/admin/staff`.
   ⛔ `/admin/roles` is the expensive one to have missed: it renders **84 permission switches**,
   the densest control grid in the console and the page `globals.css`'s own toggle ruling cites
   as its worst case — and the responsive audit, the one instrument that measures tap targets at
   360, had never opened it.
   ⭐ The divergence was invisible because BOTH lists were plausible and neither was short
   enough to look wrong. That is the shape this programme keeps paying for: not a list that is
   obviously incomplete, but two lists that are each *nearly* right.
   ⚠️ TWO ROUTES ARE IN NEITHER LIST AND STAY THAT WAY, NAMED RATHER THAN COUNTED CLEAN:
   `/admin/2fa/setup` and `/admin/totp-verify`. `totp-verify` REDIRECTS an already-verified
   admin to `/admin`, so a drive that visits it measures `/admin` twice and reports it as
   covered — the precise failure `qa:dg-shell` was repaired for on 2026-08-30. Reaching them
   needs an admin with TOTP who has not verified this session; until a drive can hold that
   state, adding them would buy a number instead of a measurement. */
import { ADMIN_ROUTES as ADMIN } from "./design-gate/routes.mjs";

let pass = 0, fail = 0, warn = 0;
const failures = [], warnings = [];
function ok(name, cond, detail = "") {
  if (cond) pass++;
  else { fail++; failures.push(`${name}${detail ? ` — ${detail}` : ""}`); }
}
function soft(name, cond, detail = "") {
  if (!cond) { warn++; warnings.push(`${name}${detail ? ` — ${detail}` : ""}`); }
}

// Assertions run in the page: overflow, clipped-not-scrolled, off-screen fixed,
// small touch targets. Returns a plain object (no Playwright handles).
async function assertCell(page) {
  return await page.evaluate(() => {
    const root = document.documentElement;
    const vw = root.clientWidth, vh = window.innerHeight;
    const overflowPx = root.scrollWidth - root.clientWidth;

    // widest offending element (helps pin the overflow source)
    let widestName = "", widestRight = 0;
    if (overflowPx > 1) {
      for (const el of document.body.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > widestRight && r.right > vw + 1) {
          widestRight = r.right;
          widestName = `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${
            el.className && typeof el.className === "string"
              ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
              : ""}`;
        }
      }
    }

    // fixed / sticky overlays that run off the right/left/top edge.
    // A sticky element inside a horizontal scroll container (e.g. a sticky <thead>
    // in an overflow-x-auto table) is SUPPOSED to be as wide as its scroller and
    // scroll with it — not an off-screen overlay. Exclude those.
    const inXScroller = (el) => {
      let a = el.parentElement;
      while (a && a !== document.documentElement) {
        const cs = getComputedStyle(a);
        if (/auto|scroll/.test(cs.overflowX) && a.scrollWidth > a.clientWidth + 1) return true;
        a = a.parentElement;
      }
      return false;
    };
    // The Needle (#needle-root) is EXEMPT from the edge rules, by design — not a bug.
    // It is a draggable pause object that deliberately rests half-tucked against a
    // viewport edge ("Peek", NEEDLE-SPEC §"Presence"); the spec sizes the peek so the
    // exposed part still clears the 40px tap floor. Reading it as "off-screen fixed" /
    // "clipped control" produced 392 false failures on every surface × width the moment
    // the Needle shipped (2026-07-27), which is what took this sweep from 2175·0 to
    // 1780·392. Exempt the object, keep the rules honest for everything else.
    const inNeedle = (el) => !!el.closest?.("#needle-root");

    // 🔴 A CLOSED `<details>` STILL HAS LAYOUT BOXES, AND THIS SWEEP WAS READING THEM AS
    // CLIPPED CONTROLS. Measured on production 2026-08-19 at /results, 320/360/390:
    // `LanguageMenu`'s listbox rows report `getBoundingClientRect()` of 194×44 at left **-71**,
    // with `visibility: visible`, `display: flex`, `opacity: 1` — so every filter above passes
    // them through. But the `<details>` is CLOSED: `document.elementFromPoint()` at the row's
    // own centre returns `div.mb-4`, and Playwright's `isVisible()` returns **false**. Chrome
    // lays the subtree out and neither paints nor hit-tests it, so no player can see or reach it.
    //
    // ⛔ THAT PRODUCED ~200 FALSE FAILURES ON EVERY SURFACE × WIDTH — the whole reason this suite
    // reads red against a live server (3562·202 on production before this fix). It is the same
    // shape as the Needle exemption above, and the same shape as E-81: a harness manufacturing a
    // phantom defect. The OPEN state is measured for real, at 320/360/390/430/768, and the panel
    // fits the viewport at every one — `LanguageMenu` flips to left-anchored below 430 exactly as
    // its own comment says.
    //
    // ⚠️ NO COVERAGE IS LOST, and that is the only reason this exemption is allowed: the OPEN
    // state is what a player interacts with, and `overlaySweep` asserts it explicitly below.
    const inClosedDisclosure = (el) => !!el.closest?.("details:not([open])");

    const offscreen = [];
    for (const el of document.querySelectorAll("*")) {
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" && cs.position !== "sticky") continue;
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
      if (cs.position === "sticky" && inXScroller(el)) continue;
      if (inNeedle(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 2 || r.left < -2) {
        offscreen.push(`${el.tagName.toLowerCase()}.${
          (typeof el.className === "string" ? el.className.trim().split(/\s+/)[0] : "") || "?"
        } (l${Math.round(r.left)} r${Math.round(r.right)})`);
      }
    }

    // CLIPPED-NOT-SCROLLED controls (§5.2): interactive elements whose box runs
    // past the viewport edge with NO scrollable ancestor — genuinely unreachable.
    // This catches overflow that `overflow-x: clip/hidden` on body/html hides from
    // documentElement.scrollWidth (the trap that let the clipped avatar hide).
    const hasScrollableAncestor = (el) => {
      let a = el.parentElement;
      while (a && a !== document.documentElement) {
        const cs = getComputedStyle(a);
        if (/auto|scroll/.test(cs.overflowX) && a.scrollWidth > a.clientWidth + 1) return true;
        a = a.parentElement;
      }
      return false;
    };
    const clipped = [];
    for (const el of document.querySelectorAll('button, a[href], [role="button"], [role="menuitem"], input, select')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      if (inNeedle(el)) continue;   // deliberate edge-tuck — see the note above
      if (inClosedDisclosure(el)) continue;   // laid out but neither painted nor hit-tested
      if ((r.right > vw + 2 || r.left < -2) && !hasScrollableAncestor(el)) {
        const label = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 22);
        clipped.push(`${el.tagName.toLowerCase()}[${label}] l${Math.round(r.left)} r${Math.round(r.right)}>vw${vw}`);
      }
    }

    // DESIGN_AUTHORITY B7 — the UPPER bound. Every criterion in this file used to
    // be a lower/overflow bound (scrollWidth <= clientWidth), so "too wide" was
    // invisible by construction: a 2,400px form scored a clean pass. <PageContainer>
    // and the admin shell stamp data-measure, so the content column can be found
    // and measured rather than guessed at.
    const measured = [...document.querySelectorAll("[data-measure]")].map((el) => ({
      tier: el.getAttribute("data-measure"),
      w: Math.round(el.getBoundingClientRect().width),
    }));

    // DESIGN_AUTHORITY B7 / WCAG landmark navigation — EXACTLY ONE <main>, and it
    // is the shell's own #main-content.
    //
    // Measured on production 2026-08-22: SIX of eight sampled routes rendered TWO
    // <main> elements, one nested inside the other. `AppShell` renders
    // <main id="main-content"> in the ROOT layout, so every route inherits it, and
    // 44 files under src/app — plus `PageLoader` and `PageContainer`'s `as="main"`
    // default — rendered their own INSIDE it. Nested main is invalid HTML, it gives
    // a screen reader two "main content" landmarks to choose between, and the
    // skip-link (href="#main-content") resolves to the OUTER one while the page's
    // real content begins inside the inner one. The axe rules
    // `landmark-no-duplicate-main` and `landmark-main-is-top-level` both fire on it.
    //
    // ⭐ This reads the DOM, which is the whole point: the static guards in
    // `test:measure` read SOURCE, and source cannot see a <main> that arrives
    // through a shared component. That is exactly how `PageLoader` put one on 17
    // further routes that no grep of `src/app` would ever have found.
    const mains = [...document.querySelectorAll("main")].map((el) => ({
      id: el.id || "(no id)",
      nested: !!(el.parentElement && el.parentElement.closest("main")),
    }));

    // undersized touch targets — EVERY interactive control family, not just
    // buttons/links (UI-consistency program: also inputs, selects, textareas,
    // switches, options, filter chips, tabs). Threshold WAS <38 through Phase 0 —
    // deliberately detuned so .btn-md (38px then) would not warn on every surface
    // forever, with the raise written into this comment as a Phase-3 follow-on.
    // ⭐ PHASE 3 HAS LANDED (globals.css: --h-control-sm 40 · -md 44 · -lg 48), so
    // the threshold is now the real --tap-min 40px floor (Law 9 / DA §A2) and this
    // check finally means what its soft() label below already claimed ("≥40").
    // ⚠️ Expect NEW warnings from what is genuinely sub-40 and is NOT a .btn-*:
    // .ticket-chip (30px quick-stake pills — a real sub-floor money control),
    // .btn-xs (32px, the documented mouse-only admin rung) and the 23px status
    // chips. Soft-only — never a hard fail: soft() increments `warn` and the exit
    // code reads `fail` alone, so raising the bar records the debt without ever
    // blocking a deploy.
    const small = [];
    const sel = 'button, a[href], [role="button"], [role="tab"], [role="menuitem"], [role="option"], [role="switch"], input:not([type="hidden"]), select, textarea';
    const seen = new Set();
    for (const el of document.querySelectorAll(sel)) {
      if (seen.has(el)) continue; seen.add(el);
      const r = el.getBoundingClientRect();
      // <8px in either axis = visually-hidden/skip-link (expands on focus) — exempt
      if (r.width < 8 || r.height < 8) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      // inline text links inside prose are exempt (WCAG 2.5.8)
      const inlineLink = el.tagName === "A" && cs.display.includes("inline");
      if (inlineLink) continue;
      // multi-line text entry may legitimately exceed a control's min height — a
      // tall textarea is fine; only flag it when it's genuinely too SHORT.
      if (r.height < 40 || r.width < 24) {
        const label = (el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.textContent || "").trim().slice(0, 24);
        small.push(`${el.tagName.toLowerCase()}[${label}] ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
    }

    return { overflowPx, widestName, widestRight: Math.round(widestRight), vw, vh, offscreen, clipped: clipped.slice(0, 6), clippedCount: clipped.length, small: small.slice(0, 6), smallCount: small.length, measured, mains };
  });
}

// /auth/* pages must be viewed as a GUEST (real usage). An authenticated user
// hitting /auth/login is server-redirected home — a valid but off-path case that
// trips a documented Next.js 16 dev-mode hook-count console artifact (prod-clean).
const isGuestRoute = (path) => path.startsWith("/auth/");

async function sweep(browser, label, paths, contextFactory, guestContextFactory) {
  for (const locale of LOCALES) {
    const context = await contextFactory(locale);
    const guest = guestContextFactory ? await guestContextFactory(locale) : null;
    for (const path of paths) {
      if (ONLY && !ONLY.some((o) => path.includes(o))) continue;
      const surfName = (label + path).replace(/\W+/g, "_");
      mkdirSync(`${SHOTS}/${label}`, { recursive: true });
      const useCtx = guest && isGuestRoute(path) ? guest : context;
      for (const bp of widths) {
        const page = await useCtx.newPage();
        await page.setViewportSize({ width: bp.w, height: bp.h });
        const errs = [];
        page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
        page.on("pageerror", (e) => errs.push(String(e)));
        const cell = `${path}@${bp.tag}${locale !== "en" ? `·${locale}` : ""}`;
        try {
          const resp = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 40000 });
          const status = resp ? resp.status() : 0;
          if (status >= 400) { ok(`${cell} loads`, false, `HTTP ${status}`); await page.close(); continue; }
          await page.waitForLoadState("load", { timeout: 8000 }).catch(() => {});
          await page.waitForTimeout(500);
          const r = await assertCell(page);
          ok(`${cell} no h-overflow`, r.overflowPx <= 1,
            `+${r.overflowPx}px via ${r.widestName} (right ${r.widestRight} > vw ${r.vw})`);
          ok(`${cell} no off-screen fixed`, r.offscreen.length === 0, r.offscreen.slice(0, 3).join(" | "));
          ok(`${cell} no clipped controls`, r.clippedCount === 0, r.clipped.join(" | "));
          soft(`${cell} touch targets ≥40`, r.smallCount === 0, `${r.smallCount} small: ${r.small.join(", ")}`);

          // ── B7: the UPPER bound ────────────────────────────────────────────
          // Exactly one capped content column per page, and it must not exceed
          // its declared tier. Catches all three ways this breaks: the cap
          // removed, the cap set to the wrong number, and a page that forgot the
          // container entirely (which is what /admin/transactions had done).
          const over = r.measured.filter((m) => m.w > (TIER_MAX[m.tier] ?? Infinity) + 1);
          ok(`${cell} content column within its tier`, over.length === 0,
            over.map((m) => `${m.tier} ${m.w}px > ${TIER_MAX[m.tier]}px`).join(" | "));
          ok(`${cell} exactly one measure root`, r.measured.length <= 1,
            r.measured.length > 1 ? `${r.measured.length} nested: ${r.measured.map((m) => m.tier).join(",")}` : "");

          // ── The LANDMARK bound ─────────────────────────────────────────────
          // Exactly one <main>, and it is the shell's #main-content — the element
          // the skip-link actually points at. Three ways this breaks and all three
          // are caught: a page adding its own (the 2026-08-22 defect, 6 of 8
          // routes), the shell's disappearing so a route has NO landmark, and the
          // right count on the wrong element (a page's own <main> surviving while
          // the shell's is gone, which would leave the skip-link dangling).
          const nested = r.mains.filter((m) => m.nested);
          ok(`${cell} exactly one <main>`, r.mains.length === 1,
            r.mains.length === 0
              ? "no <main> at all — the skip-link target is gone"
              : `${r.mains.length} <main>: ${r.mains.map((m) => `#${m.id}${m.nested ? " NESTED" : ""}`).join(" | ")}`);
          ok(`${cell} the <main> is #main-content`,
            r.mains.length === 1 && r.mains[0].id === "main-content" && nested.length === 0,
            r.mains.length === 1 && r.mains[0].id !== "main-content"
              ? `the only <main> is #${r.mains[0].id}, not the skip-link target`
              : "");
          const real = errs.filter((e) => !/fonts\.googleapis|fonts\.gstatic|Failed to load resource.*font|vibrate|webpack-hmr|WebSocket connection|_next\/static|hot-reloader/i.test(e));
          ok(`${cell} zero console errors`, real.length === 0, real.slice(0, 2).join(" | "));
          if (SHOTS_ALL || bp.tag === "xs" || bp.tag === "desktop" || bp.tag === "land") {
            await page.screenshot({ path: `${SHOTS}/${label}/${surfName}-${bp.tag}${locale !== "en" ? "-" + locale : ""}.png` });
          }
        } catch (e) {
          ok(`${cell} loads`, false, String(e).split("\n")[0].slice(0, 90));
        }
        await page.close();
      }
    }
    await context.close();
    if (guest) await guest.close();
  }
}

// ---- overlay section -------------------------------------------------------
async function fitsViewport(page, locator, name, safeBottom = 0) {
  const box = await locator.boundingBox().catch(() => null);
  if (!box) { ok(name, false, "no bounding box (did not open)"); return; }
  const vp = page.viewportSize();
  const tol = 2;
  const fits = box.x >= -tol && box.y >= -tol &&
    box.x + box.width <= vp.width + tol &&
    box.y + box.height <= vp.height - safeBottom + tol;
  ok(name, fits, `box=(${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.width)},${Math.round(box.height)}) vp=${vp.width}×${vp.height}`);
}

async function overlaySweep(browser, playerCtxFactory, adminCtxFactory) {
  const OV_WIDTHS = [
    { tag: "xs", w: 320, h: 568 },
    { tag: "land", w: 740, h: 360 },
    { tag: "tablet", w: 768, h: 1024 },
  ];
  mkdirSync(`${SHOTS}/overlays`, { recursive: true });
  const ctx = await playerCtxFactory("en");

  for (const bp of OV_WIDTHS) {
    // ---- notifications inbox ----
    {
      const p = await ctx.newPage();
      await p.setViewportSize({ width: bp.w, height: bp.h });
      await p.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(600);
      const bell = p.locator('button[aria-label^="Notifications"]').first();
      if (await bell.isVisible().catch(() => false)) {
        await bell.click().catch(() => {});
        await p.waitForTimeout(400);
        const dlg = p.locator('[role="dialog"][aria-label="Notifications"]').first();
        // safeBottom 0: this is a backdrop overlay (z-61, full-screen scrim) that
        // legitimately covers the bottom nav — it only must fit the viewport.
        await fitsViewport(p, dlg, `overlay notifications @${bp.tag}`, 0);
        await p.screenshot({ path: `${SHOTS}/overlays/notifications-${bp.tag}.png` });
      } else soft(`overlay notifications @${bp.tag}`, true, "bell not visible");
      await p.close();
    }
    // ---- avatar menu ----
    {
      const p = await ctx.newPage();
      await p.setViewportSize({ width: bp.w, height: bp.h });
      await p.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(600);
      const av = p.getByRole("button", { name: "Account menu" }).first();
      if (await av.isVisible().catch(() => false)) {
        await av.click().catch(() => {});
        await p.waitForTimeout(300);
        const menu = p.locator('[role="menu"]').first();
        // safeBottom 0: backdrop overlay (z-61 scrim over the nav) — fits-viewport only.
        await fitsViewport(p, menu, `overlay avatar-menu @${bp.tag}`, 0);
        await p.screenshot({ path: `${SHOTS}/overlays/avatar-${bp.tag}.png` });
      } else soft(`overlay avatar-menu @${bp.tag}`, true, "avatar not visible");
      await p.close();
    }
    // ---- language menu ----
    {
      const p = await ctx.newPage();
      await p.setViewportSize({ width: bp.w, height: bp.h });
      await p.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(600);
      // 🔴 THIS CHECK HAD BEEN MEASURING NOTHING, AND PASSING. Its selectors described
      // `LanguageToggle` — a `<button aria-label="Language: …">` opening a `div[role="menu"]`.
      // That component was REPLACED by `LanguageMenu`: a `<details>` whose trigger is a
      // `<summary aria-label="Switch to …">` and whose panel is `[role="listbox"]`. Neither old
      // selector can match, so `isVisible()` was false on every run and the `else` branch
      // recorded a SOFT PASS — "lang toggle not visible" — as though absence were acceptable.
      //
      // ⛔ SO THE ONE PIECE OF LOGIC THAT MAKES THIS CONTROL CORRECT WAS NEVER GUARDED.
      // `LanguageMenu` measures on open and flips from right- to left-anchored when right would
      // run off the viewport; below 430 it must flip. Nothing checked that. Measured by hand on
      // production 2026-08-19 — 320 l66, 360 l73, 390 l103 (left-anchored), 430 l6, 768 l336
      // (right-anchored), all inside the viewport — and now asserted here every run.
      //
      // ⚠️ The trigger's ABSENCE is a defect, not a skip: the component's contract is "ONE 44×44
      // control, at EVERY width". A missing trigger means no way to change language at all.
      const lang = p.locator("details.kp-menu > summary").first();
      const langThere = await lang.isVisible().catch(() => false);
      ok(`overlay language trigger present @${bp.tag}`, langThere,
         "LanguageMenu's summary is the only way to change language; it must exist at every width");
      if (langThere) {
        await lang.click().catch(() => {});
        await p.waitForTimeout(350);
        const menu = p.locator('details.kp-menu[open] [role="listbox"]').first();
        await fitsViewport(p, menu, `overlay language @${bp.tag}`, 56);
        // ⭐ Fit is not enough — the rows must be REACHABLE. A panel can satisfy the box test and
        // still sit under something, which is precisely how the closed-panel false positive read
        // as a real defect for so long.
        const row = p.locator('details.kp-menu[open] [role="option"]').last();
        ok(`overlay language rows reachable @${bp.tag}`,
           await row.isVisible().catch(() => false),
           "the last language row must be visible and hit-testable once the menu is open");
      }
      await p.close();
    }
    // ---- bet dial + confirm on a market detail ----
    {
      const p = await ctx.newPage();
      await p.setViewportSize({ width: bp.w, height: bp.h });
      await p.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(700);
      const card = p.locator('a[href^="/markets/mkt_"]').first();
      if (await card.count()) {
        await card.click().catch(() => {});
        await p.waitForTimeout(1200);
        const cell = await assertCell(p);
        ok(`overlay market-detail(dial) @${bp.tag} no h-overflow`, cell.overflowPx <= 1,
          `+${cell.overflowPx}px via ${cell.widestName}`);
        // unlock the dial if present, then look for a place-bet / confirm CTA
        const unlock = p.getByRole("button", { name: /Unlock|Fungua/i }).first();
        if (await unlock.isVisible().catch(() => false)) await unlock.click().catch(() => {});
        await p.waitForTimeout(300);
        await p.screenshot({ path: `${SHOTS}/overlays/market-detail-${bp.tag}.png` });
        // open the confirm modal if a place-bet button is enabled
        const placeBtn = p.getByRole("button", { name: /Place|Weka|下注|Confirm/i }).first();
        if (await placeBtn.isEnabled().catch(() => false)) {
          await placeBtn.click().catch(() => {});
          await p.waitForTimeout(500);
          const modal = p.locator('[role="dialog"], [role="alertdialog"]').first();
          if (await modal.isVisible().catch(() => false)) {
            await fitsViewport(p, modal, `overlay bet-confirm @${bp.tag}`);
            await p.screenshot({ path: `${SHOTS}/overlays/bet-confirm-${bp.tag}.png` });
          }
        }
      } else soft(`overlay market-detail(dial) @${bp.tag}`, true, "no market card");
      await p.close();
    }
  }
  await ctx.close();

  // ---- admin filter bar + one grid at mobile ----
  const actx = await adminCtxFactory("en");
  for (const bp of OV_WIDTHS) {
    const p = await actx.newPage();
    await p.setViewportSize({ width: bp.w, height: bp.h });
    await p.goto(`${BASE}/admin/players`, { waitUntil: "domcontentloaded" });
    await p.waitForTimeout(800);
    const cell = await assertCell(p);
    ok(`overlay admin/players @${bp.tag} no h-overflow`, cell.overflowPx <= 1,
      `+${cell.overflowPx}px via ${cell.widestName}`);
    ok(`overlay admin/players @${bp.tag} no off-screen fixed`, cell.offscreen.length === 0, cell.offscreen.slice(0, 2).join(" | "));
    await p.screenshot({ path: `${SHOTS}/overlays/admin-players-${bp.tag}.png` });
    await p.close();
  }
  await actx.close();
}

// ---- context factories -----------------------------------------------------
async function main() {
  const browser = await chromium.launch({
  ...(process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {}),
});

  const localeCookie = (locale) => ([{ name: "kp-locale", value: locale, url: BASE }]);

  const playerCtxFactory = async (locale) => {
    const c = await browser.newContext();
    await c.request.get(`${BASE}/auth/demo`);
    await c.addCookies(localeCookie(locale));
    // ⛔ `/auth/demo` IS DEV-ONLY AND 404s IN ANY PRODUCTION BUILD — its own header
    // says so (`src/app/auth/demo/route.ts`). So this factory silently yields a
    // GUEST context against production AND against a local `next build && next
    // start` — which is the boot this file's own header recommends for CSS
    // fidelity. Every gated route then redirects to /auth/login and the sweep
    // measures THE AUTH SHELL while reporting a green cell named `/wallet`.
    // Measured 2026-08-22 on production: /wallet, /profile, /positions,
    // /notifications, /profile/security and /wallet/deposit all landed on
    // /auth/login with a clean pass.
    //
    // ⚠️ That is not a fail — a guest hitting /wallet SHOULD see the sign-in page,
    // and auditing it is worth doing. It is a COVERAGE claim the run must not make
    // silently, which is the same defect the admin probe below already guards
    // against. For real signed-in coverage on production use the QA fleet
    // (`scripts/live/harness.mjs` → `loginOnce(b, "fleet:07")`).
    try {
      const probe = await c.request.get(`${BASE}/wallet`);
      const p = new URL(probe.url()).pathname;
      if (/\/auth\//.test(p)) {
        console.warn(`\n  ⚠️  PLAYER COVERAGE IS GUEST-ONLY — /wallet redirected to ${p}.`);
        console.warn(`      /auth/demo is dev-only and 404s in any production build, so every`);
        console.warn(`      gated route below is measuring the AUTH SHELL, not the page.`);
        console.warn(`      A green /wallet cell here is a green /auth/login cell.`);
        console.warn(`      For signed-in coverage use the QA fleet:`);
        console.warn(`        scripts/live/harness.mjs → loginOnce(b, "fleet:07")\n`);
      }
    } catch { /* server down / probe failed — the sweep itself will surface it */ }
    return c;
  };
  const adminCtxFactory = async (locale) => {
    const c = await browser.newContext();
    await c.request.post(`${BASE}/api/dev-test/seed-admin`);
    await c.addCookies(localeCookie(locale));
    // Admin pages sit behind TOTP. REAL admin coverage requires the SERVER to run
    // with DISABLE_ADMIN_TOTP=true (audit F1) — otherwise every /admin/* renders
    // the 2FA gate and an "admin PASS" is FALSE coverage (+ a redirect race that
    // reads as a hard fail). Probe once and warn loudly if coverage is gated, so a
    // green admin run can be trusted.
    try {
      const probe = await c.request.get(`${BASE}/admin/finance`);
      const p = new URL(probe.url()).pathname;
      if (/\/auth|\/2fa/.test(p)) {
        console.warn(`\n  ⚠️  ADMIN COVERAGE GATED — /admin/finance redirected to ${p}.`);
        console.warn(`      Restart the server with DISABLE_ADMIN_TOTP=true for real admin coverage (audit F1).\n`);
      }
    } catch { /* server down / probe failed — the sweep itself will surface it */ }
    return c;
  };

  const guestCtxFactory = async (locale) => {
    const c = await browser.newContext();
    await c.addCookies(localeCookie(locale));
    return c;
  };

  if (SURFACE === "all" || SURFACE === "player") await sweep(browser, "player", PLAYER, playerCtxFactory, guestCtxFactory);
  if (SURFACE === "all" || SURFACE === "admin") await sweep(browser, "admin", ADMIN, adminCtxFactory, guestCtxFactory);
  if (SURFACE === "all" || SURFACE === "overlays") await overlaySweep(browser, playerCtxFactory, adminCtxFactory);

  await browser.close();

  if (warnings.length) {
    console.log(`\n--- touch-target / soft warnings (${warn}) ---`);
    warnings.slice(0, 60).forEach((w) => console.log("  ⚠ " + w));
    if (warnings.length > 60) console.log(`  … +${warnings.length - 60} more`);
  }
  if (failures.length) {
    console.log(`\n--- HARD FAILURES (${fail}) ---`);
    failures.forEach((f) => console.log("  ✗ " + f));
  }
  console.log(`\n${"=".repeat(64)}`);
  console.log(`responsive-audit: ${pass} passed · ${fail} failed · ${warn} warnings`);
  console.log(`surfaces=${SURFACE} locales=${LOCALES.join("/")} widths=${widths.map((w) => w.tag).join(",")}`);
  console.log(`shots → ${SHOTS}/`);
  console.log("=".repeat(64));
  process.exit(fail ? 1 : 0);
}

main();
