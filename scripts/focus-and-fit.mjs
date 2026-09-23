/**
 * PROVE the six phone defects S3 closed from the unseen-conditions pass — and prove each can still FAIL.
 *
 *   npm run qa:focus-and-fit -- https://www.50pick.tz
 *   RED_D56=1  npm run qa:focus-and-fit -- <base>    the card's ring goes back outside the clip
 *   RED_D57=1  npm run qa:focus-and-fit -- <base>    the scroll padding for the rail is removed
 *   RED_D63=1  npm run qa:focus-and-fit -- <base>    the chip's ring goes back outside the strip
 *   RED_FIT=1  npm run qa:focus-and-fit -- <base>    the card rows stop wrapping at large text (D35 + D65)
 *
 * ── WHY THESE NEED A BROWSER, AND WHY THE OBVIOUS PROBE LIES ──────────────────────────────
 * Every one of these is a thing the page DOES, not a thing the source SAYS, and the first
 * instrument I reached for was wrong in each case:
 *   · D56 — comparing whole-card screenshots reports ~58,000 bytes changed on focus whether or
 *     not a ring paints, because the sparkline and the live pulse animate. The card is never
 *     byte-identical to itself. The honest probe is a 6px strip down the card's own EDGE, where
 *     a ring must paint and nothing else moves: 0 of 919 bytes before the fix, ~590 of ~630 after.
 *   · D57 — counting "focused controls overlapping the chrome" without excluding the chrome's OWN
 *     children reports the header's logo and sign-in button as buried, every time, fix or no fix.
 *   · D63 — `getBoundingClientRect` on the chip cannot see a clipped ring at all. The ring's box
 *     is the chip's box grown by `outline-offset + outline-width`; that is what to compare
 *     against the scroller.
 *   · D35/D65 — a box measurement says the chip is "43px". `scrollWidth > clientWidth` is what
 *     says the WORD was cut.
 *
 * ⛔ THE 300px GATE IS MEASURED, NOT ROUND. Chips and pools are whole at 320 native and cut at
 * 277 and 246 (an effective 360 and 320 at Android's 130% text). A `max-width: 359.98px` rule
 * would have added ~20px to every card at 320 and 360 where nothing is wrong. So this guard
 * checks BOTH sides: cut must be 0 below the gate, AND the card height at 320 must not move.
 *
 * ⚠️ NOT COVERED HERE, deliberately: D54 (the landscape safe-area insets). Playwright reports
 * every inset as 0, so no driver can see that defect or its fix — it is U30's, on hardware.
 */
import { chromium } from "playwright";
import { localisedContext, assertLang } from "./qa-locale.mjs";

const BASE = process.argv[2] || process.env.BASE || "https://www.50pick.tz";
const RED = {
  D56: process.env.RED_D56 === "1",
  D57: process.env.RED_D57 === "1",
  D63: process.env.RED_D63 === "1",
  FIT: process.env.RED_FIT === "1",
};
const ANY_RED = Object.values(RED).some(Boolean);
/** Each control restores EXACTLY the state its fix replaced — nothing else. */
const RED_CSS = {
  D56: `.mcardp > .mcardp-open:focus-visible{outline-offset:2px !important;}`,
  D57: `html{scroll-padding-bottom:auto !important;}`,
  D63: `.kp-strip-fade :where(a,button):focus-visible{outline-offset:2px !important;}`,
  FIT: `@media (max-width:300px){.mcardp-top{flex-wrap:nowrap !important;}.mcardp-meta{flex-wrap:nowrap !important;}}`,
};

const failures = [];
const ctxFor = (b, w, h) => localisedContext(b, { locale: "sw", width: w, height: h, baseUrl: BASE, reducedMotion: "reduce" });
const open = async (b, w, h, path, redKey) => {
  const ctx = await ctxFor(b, w, h);
  const p = await ctx.newPage();
  await p.goto(BASE + path, { waitUntil: "load", timeout: 90000 });
  await p.waitForTimeout(2400);
  await assertLang(p, "sw");
  if (redKey && RED[redKey]) await p.addStyleTag({ content: RED_CSS[redKey] });
  return { ctx, p };
};

const b = await chromium.launch();

// ── §1 · D56 the card's own focus ring paints, measured on the card's EDGE ────────────────
for (const path of ["/markets", "/"]) {
  const { ctx, p } = await open(b, 360, 780, path, "D56");
  const edge = await p.evaluate(() => {
    const c = document.querySelector(".mcardp");
    if (!c) return null;
    c.scrollIntoView({ block: "center" });
    document.activeElement?.blur();
    const r = c.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top) + 40, width: 6, height: Math.round(r.height) - 80 };
  });
  if (!edge) { failures.push(`§1 ${path} no .mcardp on the page`); await ctx.close(); continue; }
  await p.waitForTimeout(350);
  const blur = await p.screenshot({ clip: edge });
  const landed = await p.evaluate(() => { const a = document.querySelector(".mcardp > .mcardp-open"); if (!a) return false; a.focus(); return document.activeElement === a; });
  if (!landed) failures.push(`§1 ${path} focus did not land on .mcardp-open — the probe proves nothing`);
  await p.waitForTimeout(450);
  const foc = await p.screenshot({ clip: edge });
  let d = 0; const n = Math.min(blur.length, foc.length);
  for (let i = 0; i < n; i++) if (blur[i] !== foc[i]) d++;
  if (d === 0) failures.push(`§1 ${path} the card's focus ring paints NOTHING — 0 of ${n} bytes changed on its own edge`);
  await ctx.close();
}

// ── §2 · D57 no control parks under the fixed rail ────────────────────────────────────────
for (const path of ["/", "/markets"]) {
  const { ctx, p } = await open(b, 360, 780, path, "D57");
  let buried = 0, touching = 0, probed = 0;
  for (let i = 0; i < 30; i++) {
    await p.keyboard.press("Tab");
    const s = await p.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return null;
      // the chrome's own children overlap the chrome by construction — not a defect
      if (a.closest("header, .kp-discovery-bar, .kp-rail, .cm-fab")) return null;
      const r = a.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return null;
      const rl = document.querySelector(".kp-rail");
      if (!rl) return null;
      const o = rl.getBoundingClientRect();
      const w = Math.max(0, Math.min(r.right, o.right) - Math.max(r.left, o.left));
      const h = Math.max(0, Math.min(r.bottom, o.bottom) - Math.max(r.top, o.top));
      return { pct: ((w * h) / (r.width * r.height)) * 100, tag: a.tagName };
    });
    if (s) { probed++; if (s.pct >= 99) buried++; if (s.pct > 0) touching++; }
  }
  if (probed < 5) failures.push(`§2 ${path} only ${probed} tab stops outside the chrome — too few to mean anything`);
  if (buried || touching) failures.push(`§2 ${path} ${buried} control(s) fully under the rail and ${touching} touching it`);
  await ctx.close();
}

// ── §3 · D63 the chip's focus ring is inside the strip that scrolls it ────────────────────
{
  const { ctx, p } = await open(b, 360, 780, "/markets", "D63");
  const r = await p.evaluate(() => {
    const strip = document.querySelector(".kp-strip-fade");
    const chip = strip && strip.querySelector("a,button");
    if (!chip) return null;
    chip.focus();
    const cs = getComputedStyle(chip), sr = strip.getBoundingClientRect(), cr = chip.getBoundingClientRect();
    const off = parseFloat(cs.outlineOffset) || 0, w = parseFloat(cs.outlineWidth) || 0;
    const ring = { top: cr.top - off - w, bottom: cr.bottom + off + w, left: cr.left - off - w };
    const lost = [ring.top < sr.top - 0.5 && "top", ring.bottom > sr.bottom + 0.5 && "bottom", ring.left < sr.left - 0.5 && "left"].filter(Boolean);
    return { lost, offset: cs.outlineOffset };
  });
  if (!r) failures.push("§3 no filter chip found — the probe proves nothing");
  else if (r.lost.length) failures.push(`§3 the chip's focus ring is cut on ${r.lost.join(", ")} by its own strip (outline-offset ${r.offset})`);
  await ctx.close();
}

// ── §4 · D35 + D65 the card keeps its word and its money at large text ────────────────────
for (const w of [320, 277, 246]) {
  const { ctx, p } = await open(b, w, 640, "/markets", "FIT");
  const r = await p.evaluate(() => {
    const R = (n) => Math.round(n * 10) / 10;
    const cats = [...document.querySelectorAll(".mcardp-cat")];
    const pools = [...document.querySelectorAll(".mcardp-meta")].map((m) => m.firstElementChild).filter(Boolean);
    const card = document.querySelector(".mcardp");
    return {
      cats: cats.length, catsCut: cats.filter((e) => e.scrollWidth > e.clientWidth + 1).length,
      pools: pools.length, poolsCut: pools.filter((e) => e.scrollWidth > e.clientWidth + 1).length,
      cardH: card ? R(card.getBoundingClientRect().height) : -1,
      sample: cats.filter((e) => e.scrollWidth > e.clientWidth + 1).slice(0, 2).map((e) => e.innerText.trim().slice(0, 12)),
    };
  });
  if (r.cats < 3) failures.push(`§4 ${w}px only ${r.cats} category chips on the board — too few to mean anything`);
  if (r.catsCut) failures.push(`§4 ${w}px ${r.catsCut} of ${r.cats} category chips are cut (${r.sample.join(", ")})`);
  if (r.poolsCut) failures.push(`§4 ${w}px ${r.poolsCut} of ${r.pools} pool figures are clipped — §A5 forbids clipping money`);
  // ⛔ the other half of the gate: the fix must NOT have cost anything at 320, where nothing was wrong
  if (w === 320 && r.cardH > 310) failures.push(`§4 320px the card grew to ${r.cardH}px — the 300px gate is leaking into a width that never needed it`);
  await ctx.close();
}

await b.close();

const which = Object.entries(RED).filter(([, v]) => v).map(([k]) => k).join("+");
console.log(`\nfocus and fit — ${ANY_RED ? `RED (${which})` : "GREEN"} — ${BASE}`);
if (failures.length) for (const f of failures) console.log(`  FAIL ${f}`);
else console.log("  no failures");

if (ANY_RED) {
  /* ⛔ "IT WENT RED" IS NOT ENOUGH, AND THIS COST A ROUND OF FALSE CONFIDENCE. While D35/D65 were
     written but not yet deployed, §4 failed on every run — so a RED_D56 run "went red" whether or not its
     own control did anything. A control must be shown to break THE SECTION IT TARGETS. */
  const SECTION = { D56: "§1", D57: "§2", D63: "§3", FIT: "§4" };
  const missed = Object.entries(RED).filter(([, on]) => on).filter(([k]) => !failures.some((f) => f.startsWith(SECTION[k])));
  if (missed.length) {
    console.error(`
🔴 BROKEN HARNESS — the RED control(s) ${missed.map(([k]) => k + " (" + SECTION[k] + ")").join(", ")} restored the defect and their own section still PASSED.`);
    console.error("   Any other failure above is a DIFFERENT problem and does not license this control.");
    process.exit(2);
  }
  console.log(`
RED control behaved: ${failures.length} failure(s), including one in each targeted section, as required.`);
  process.exit(0);
}
process.exit(failures.length ? 1 : 0);
