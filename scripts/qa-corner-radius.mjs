/**
 * qa:corner-radius — THE CROPPED-CORNER MEASURE.
 *
 *   KP_BASE=http://127.0.0.1:3021 node scripts/qa-corner-radius.mjs
 *
 * ⛔ THE DEFECT, STATED SO IT CAN FAIL. A rounded container that does NOT clip (`overflow: visible`)
 * and a child laid FLUSH to its edge with a SMALLER radius paint two different corners in the same
 * place: the child's square-er corner covers the parent's arc, so the container reads as having a
 * CROPPED corner. `AdminCard` is `.glass-panel` at `--r-lg` (16px) with no `overflow-hidden`, and
 * `ScrollX` is `rounded-md` (8px in this repo's scale) — so every flush card wrapping a table shows it.
 *
 * ⛔ IT IS MEASURED FROM THE PAGE, never from the stylesheet: the radius that matters is the COMPUTED
 * one, after every cascade, and the flushness is read from `getBoundingClientRect` rather than assumed
 * from the markup. A source-only check would pass on a page whose cascade differs.
 *
 * ⛔ A CORNER IS ONLY A DEFECT WHERE THE CHILD IS ACTUALLY AT IT. A child flush to the BOTTOM edge can
 * only crop the BOTTOM corners, so each corner is judged on its own two edges. That is what keeps this
 * from reporting every nested box on the page.
 *
 * ⚠️ TOLERANCE: 0.5px on flushness (sub-pixel layout) and 0.5px on the radius comparison.
 * Loopback only — it signs in with the local seed's credentials.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.KP_BASE ?? "http://127.0.0.1:3021";
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE)) {
  console.error(`REFUSED — loopback only. KP_BASE was ${JSON.stringify(BASE)}.`);
  process.exit(2);
}
const WIDTHS = (process.env.KP_WIDTHS ?? "360,1280").split(",").map(Number).filter(Boolean);
const ROUTES = (process.env.KP_ROUTES ?? "/admin/desk,/admin/desk?tab=activity,/admin/desk?tab=limits,/admin/desk?tab=history").split(",");
const SHOTS = process.env.KP_SHOTS ?? ".qa-corners";
mkdirSync(SHOTS, { recursive: true });

let pass = 0;
const fails = [];
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}${detail ? ` — ${detail}` : ""}`); }
  else { fails.push(name); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

const MEASURE = () => {
  const px = (v) => parseFloat(String(v).replace("px", "")) || 0;
  const out = [];
  for (const panel of document.querySelectorAll(".glass-panel")) {
    const pcs = getComputedStyle(panel);
    const pr = panel.getBoundingClientRect();
    if (pr.width < 40 || pr.height < 40) continue;
    const clips = pcs.overflow !== "visible" || pcs.overflowX !== "visible" || pcs.overflowY !== "visible";
    const corners = {
      TL: [px(pcs.borderTopLeftRadius), "left", "top"],
      TR: [px(pcs.borderTopRightRadius), "right", "top"],
      BL: [px(pcs.borderBottomLeftRadius), "left", "bottom"],
      BR: [px(pcs.borderBottomRightRadius), "right", "bottom"],
    };
    for (const child of panel.querySelectorAll("*")) {
      const ccs = getComputedStyle(child);
      const cr = child.getBoundingClientRect();
      if (cr.width < 40 || cr.height < 20) continue;
      // Only a child that PAINTS can cover the parent's arc.
      const paints = ccs.backgroundColor !== "rgba(0, 0, 0, 0)"
        || ccs.borderTopWidth !== "0px" || ccs.borderLeftWidth !== "0px"
        || ccs.borderRightWidth !== "0px" || ccs.borderBottomWidth !== "0px";
      if (!paints) continue;
      const childR = {
        TL: px(ccs.borderTopLeftRadius), TR: px(ccs.borderTopRightRadius),
        BL: px(ccs.borderBottomLeftRadius), BR: px(ccs.borderBottomRightRadius),
      };
      /* ⛔ THE TOLERANCE IS PART OF THE CLAIM, AND 0.5px MADE THIS ASSERTION A NO-OP. The first form of
         this file used 0.5px and printed "0 cropped corners" over a desk whose table header is visibly
         square inside a 16px card — the header is flush within ~1px of sub-pixel layout, not within 0.5.
         A tolerance tighter than the layout it measures does not make a check strict, it makes it blind. */
      const flush = {
        left: cr.left <= pr.left + 1.5,
        right: cr.right >= pr.right - 1.5,
        top: cr.top <= pr.top + 1.5,
        bottom: cr.bottom >= pr.bottom - 1.5,
      };
      for (const [corner, [parentRadius, hEdge, vEdge]] of Object.entries(corners)) {
        if (parentRadius <= 0) continue;
        if (!flush[hEdge] || !flush[vEdge]) continue;       // not at this corner
        if (childR[corner] >= parentRadius - 0.5) continue; // child rounds at least as much
        /* ⭐ THE CLIPPING ANCESTOR DECIDES THE PAINTED CORNER, NOT THE CHILD'S OWN RADIUS — and leaving
           this out made the gate report a FALSE POSITIVE against its own fix. A `<thead>` keeps radius 0
           for ever; what changed when the defect was fixed is that the `ScrollX` between it and the card
           now rounds at the card's radius AND clips, so the square header is cut to the card's arc. A
           measure that reads only the child would demand every nested box be rounded, which is not the
           claim and is not achievable. Walk up to the panel and stop at the first ancestor that CLIPS:
           if it rounds at least as much as the panel, this corner is painted correctly. */
        let clippedToParent = false;
        for (let a = child.parentElement; a && a !== panel.parentElement; a = a.parentElement) {
          const acs = getComputedStyle(a);
          if (acs.overflow === "visible" && acs.overflowX === "visible" && acs.overflowY === "visible") continue;
          const key = corner === "TL" ? "borderTopLeftRadius" : corner === "TR" ? "borderTopRightRadius"
            : corner === "BL" ? "borderBottomLeftRadius" : "borderBottomRightRadius";
          if (px(acs[key]) >= parentRadius - 0.5) { clippedToParent = true; }
          break; // the FIRST clipper is the one that decides; a looser one above it cannot un-clip.
        }
        if (clippedToParent) continue;
        out.push({
          panel: panel.className.split(" ").slice(0, 3).join("."),
          child: (child.tagName.toLowerCase() + "." + String(child.className || "").split(" ").slice(0, 2).join(".")).slice(0, 60),
          corner, parentRadius, childRadius: childR[corner],
          parentClips: clips,
          rect: { x: Math.round(cr.left), y: Math.round(cr.top), w: Math.round(cr.width), h: Math.round(cr.height) },
        });
      }
    }
  }
  return out;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
/* 🔴 THE VISIBLE `#phone` NODE, AND WITHOUT THE `+255` — `qa-house-bots-visual.mjs:119-126` paid for
   this once already: `PhoneInput` mirrors into a HIDDEN `input[name="phone"]` of the same name, so a
   selector like `input[type="tel"], input[name="phone"]` resolves to the hidden mirror and `fill`
   times out after 30s. The sign-in route is `/auth/admin`, not `/signin` (404). */
await page.goto(`${BASE}/auth/admin`, { waitUntil: "networkidle", timeout: 60_000 });
/* ⚠️ THE MIRROR ONLY SYNCS AFTER HYDRATION — filling before it posts a blank identifier, which the server
   reads as a wrong password. Wait for the controlled field to exist and settle, then fill, then PROVE the
   value reached the hidden input the form actually submits. */
await page.waitForSelector("#phone", { state: "visible", timeout: 30_000 });
await page.waitForTimeout(1500);
await page.fill("#phone", "700000000");
await page.waitForTimeout(400);
const synced = await page.locator('input[name="phone"]').inputValue().catch(() => "");
if (synced !== "700000000") {
  console.error(`REFUSED — PhoneInput did not sync into the submitted field (hidden value ${JSON.stringify(synced)}). A blank sign-in would measure a signed-OUT page and print 0 mismatches.`);
  process.exit(3);
}
await page.fill('input[type="password"]', "QaAdmin2026!");
await Promise.all([
  page.waitForURL((u) => !/\/auth\//.test(u.toString()), { timeout: 60_000 }).catch(() => null),
  page.click('button[type="submit"]'),
]);
/* ⛔ HTTP 200 PROVES NOTHING: a refused sign-in lands on /auth/ and renders perfectly. Only the URL tells it. */
if (/\/auth\//.test(page.url())) {
  console.error(`REFUSED — the local admin could not sign in (still at ${page.url()}). Seed with scripts/seed-admin-local.mts and serve with DISABLE_ADMIN_TOTP=true.`);
  process.exit(3);
}

const all = [];
for (const route of ROUTES) {
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    /* ⛔ `domcontentloaded`, NOT `networkidle`: the desk runs a live poller, so networkidle NEVER settles,
       the goto throws at 30s, and a `.catch(() => {})` around it turns a page that never loaded into a
       confident "0 cropped corners". The navigation is asserted below instead of swallowed. */
    const resp = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 45_000 });
    if (!resp || resp.status() >= 400) { console.error(`REFUSED — ${route} answered ${resp ? resp.status() : "nothing"}`); process.exit(3); }
    await page.waitForSelector(".glass-panel", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(500);
    const panelCount = await page.evaluate(() => document.querySelectorAll(".glass-panel").length);
    if (panelCount === 0) { console.error(`REFUSED — ${route} @${w} rendered ZERO panels; a sweep over nothing passes.`); process.exit(3); }
    const found = await page.evaluate(MEASURE);
    const tag = `${route.replace(/[^a-z0-9]+/gi, "_")}_${w}`;
    writeFileSync(`${SHOTS}/${tag}.png`, await page.screenshot());
    if (found.length) {
      // A close-up of the first offending corner, so the number has a picture beside it.
      const f = found[0];
      const clip = {
        x: Math.max(0, f.rect.x - 8), y: Math.max(0, f.rect.y + f.rect.h - 40),
        width: Math.min(180, w), height: 60,
      };
      writeFileSync(`${SHOTS}/${tag}_corner.png`, await page.screenshot({ clip }));
    }
    all.push({ route, w, found });
    console.log(`  ${route} @${w}: ${found.length} cropped corner(s)`);
    for (const f of found.slice(0, 4)) {
      console.log(`      ${f.corner} parent ${f.parentRadius}px vs child ${f.childRadius}px · clips=${f.parentClips} · ${f.child}`);
    }
  }
}

/* ⛔ THE GATE MUST PROVE IT CAN STILL FAIL, OR IT IS A GREEN LIGHT WITH NO BULB. Plant the PRE-FIX radius
   back on the live page — `rounded-md` (8px) on the scroll surface of a 16px card, which is exactly what
   shipped before 2026-09-21 — and require the mismatch to REAPPEAR. Then remove the plant and require it
   to go again, so the control cannot leave the page dirty for the assertion above. */
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(BASE + ROUTES[0], { waitUntil: "domcontentloaded", timeout: 45_000 });
await page.waitForSelector(".glass-panel", { timeout: 20_000 }).catch(() => {});
await page.waitForTimeout(400);
const cleanAgain = await page.evaluate(MEASURE);
const plant = await page.addStyleTag({ content: ".glass-panel.p-0 .scrollx{border-radius:8px !important}" });
await page.waitForTimeout(250);
const planted = await page.evaluate(MEASURE);
await page.evaluate((el) => el.remove(), plant);
await page.waitForTimeout(250);
const afterRemoval = await page.evaluate(MEASURE);
ok("3.control · ⛔ PLANTED CONTROL · restoring the PRE-FIX 8px radius on the scroll surface makes the cropped corner REAPPEAR, and removing it makes it go — so the assertion above is a measurement and not a green light with no bulb",
  cleanAgain.length === 0 && planted.length > 0 && afterRemoval.length === 0,
  JSON.stringify({ clean: cleanAgain.length, withPre8pxRadius: planted.length, afterRemoval: afterRemoval.length, firstPlanted: planted[0] ?? null }));

await browser.close();

const total = all.reduce((n, a) => n + a.found.length, 0);
console.log("");
ok("1.pop · the page was really walked — panels were found at every width",
  all.length === ROUTES.length * WIDTHS.length, `${all.length} route/width pairs`);
ok("2.corners · ⛔ no rounded panel has a flush child that rounds LESS at a corner it touches — a child with a smaller radius paints over the panel's arc and the corner reads as CROPPED",
  total === 0, total === 0 ? "0 mismatches" : JSON.stringify(all.filter((a) => a.found.length).map((a) => ({ route: a.route, w: a.w, n: a.found.length, first: a.found[0] })), null, 1).slice(0, 1800));

console.log(`\nqa-corner-radius: ${pass} passed, ${fails.length} failed · tiles in ${SHOTS}/`);
process.exit(fails.length ? 1 : 0);
