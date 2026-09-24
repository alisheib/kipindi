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
  D3: process.env.RED_D3 === "1",
  D75: process.env.RED_D75 === "1",
  D67: process.env.RED_D67 === "1",
};
const ANY_RED = Object.values(RED).some(Boolean);
/** Each control restores EXACTLY the state its fix replaced — nothing else. */
const RED_CSS = {
  D56: `.mcardp > .mcardp-open:focus-visible{outline-offset:2px !important;}`,
  D57: `html{scroll-padding-bottom:auto !important;}`,
  D63: `.kp-strip-fade :where(a,button):focus-visible{outline-offset:2px !important;}`,
  FIT: `@media (max-width:300px){.mcardp-top{flex-wrap:nowrap !important;}.mcardp-meta{flex-wrap:nowrap !important;}}`,
  D3: `html[data-scrolling] .cm-fab:not(.cm-fab--open):not(:focus-within){opacity:1 !important;pointer-events:auto !important;transform:none !important;}`,
  D75: `html[data-fab-idle] .cm-fab:not(.cm-fab--open):not(:focus-within){opacity:1 !important;pointer-events:auto !important;transform:none !important;}`,
  // ⛔ D67's fix is a measured `translateX` applied as an INLINE style, so the control has to be
  // `!important` to beat it. That is legitimate here — the control's job is to restore the
  // pre-fix geometry, and the pre-fix geometry was "no transform at all".
  D67: `.kp-menu[open] > div[class*="top-["]{transform:none !important;}`,
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

// ── §5 · D3 the chat bubble leaves while the reader is moving, and comes back ────────────
/* ⛔ THREE SURFACES, NOT ONE. D3's own note records the bubble covering content on NINE, and a
   register line narrower than the defect is how it survived this long. The hide rule is global, so
   one surface would prove the MECHANISM — but the leaderboard and /results are two of the surfaces
   D3 actually names, and a rule that is global today can be scoped by someone tomorrow. */
for (const surface of ["/markets", "/leaderboard", "/results"]) {
  const { ctx, p } = await open(b, 360, 780, surface, "D3");
  const read = () => p.evaluate(() => {
    const R = (n) => Math.round(n * 10) / 10;
    const btn = document.querySelector(".cm-bubble");
    const fab = document.querySelector(".cm-fab");
    if (!btn || !fab) return null;
    const q = btn.getBoundingClientRect();
    const el = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
    return { w: R(q.width), h: R(q.height), opacity: Number(getComputedStyle(fab).opacity),
             scrolling: document.documentElement.hasAttribute("data-scrolling"),
             hits: !!(el && (el === btn || btn.contains(el) || el.contains(btn))) };
  });
  /* ⚠️ ROUSE FIRST, DELIBERATELY. Since D75 "at rest" has a clock on it: the bubble is up for
     `FAB_IDLE_MS` (3s) after the reader last touched the page, then sleeps. A bare read here
     would land 2.4s after load — 600ms from the nap — and this section would pass or fail on
     timing rather than on behaviour. One pixel of scroll restarts that clock, so what §5 asserts
     is what it means to assert: within the window, a still page shows a reachable bubble. */
  await p.evaluate(() => window.scrollBy(0, 1));
  await p.waitForTimeout(420);
  const rest = await read();
  if (!rest) failures.push(`§5 ${surface} no chat bubble on the page — the probe proves nothing`);
  else {
    // the phone bubble is the tap floor, not more: every extra pixel is spent on someone's content
    if (rest.w > 44 || rest.h > 44) failures.push(`§5 ${surface} the phone bubble is ${rest.w}×${rest.h}, over the 44px floor`);
    if (rest.w < 44 || rest.h < 44) failures.push(`§5 ${surface} the phone bubble is ${rest.w}×${rest.h}, UNDER the 44px floor`);
    if (!rest.hits || rest.opacity < 0.99) failures.push(`§5 ${surface} at rest the bubble is not reachable (opacity ${rest.opacity}, hits ${rest.hits})`);
    await p.evaluate(() => window.scrollBy(0, 400));
    await p.waitForTimeout(80);
    const during = await read();
    if (!during.scrolling) failures.push(`§5 ${surface} \`data-scrolling\` was never set — the probe cannot see the state it tests`);
    else if (during.opacity > 0.9 || during.hits) failures.push(`§5 ${surface} the bubble does NOT leave while the page is moving (opacity ${during.opacity}, still hittable ${during.hits})`);
    await p.waitForTimeout(900);
    const settled = await read();
    if (settled.opacity < 0.99 || !settled.hits) failures.push(`§5 ${surface} the bubble did not come back after the reader stopped (opacity ${settled.opacity}, hits ${settled.hits})`);
    // ⛔ and it must NEVER leave while its own panel is open, or the close control goes with it
    await p.evaluate(() => document.querySelector(".cm-bubble")?.click());
    await p.waitForTimeout(700);
    await p.evaluate(() => window.scrollBy(0, 300));
    await p.waitForTimeout(80);
    const whileOpen = await read();
    if (whileOpen.opacity < 0.99) failures.push(`§5 ${surface} the bubble hid while its own panel was open (opacity ${whileOpen.opacity}) — that takes the close control with it`);
  }
  await ctx.close();
}

/* ── §6 · D75 — AND IT LEAVES AT REST TOO, WITHOUT TAKING TAPS WITH IT ─────────────────
   §5 proves the bubble clears out while the page MOVES. Every measurement that mattered was taken
   with the page STILL: at 360 the bubble covered **100% of a market card's `NDIO` probability cap**
   and 37% of its `88%`; at 414 it covered **16% of a `HAPANA @ 12%` button**, a betting control.

   ⛔ SO THE ASSERTION IS NOT "IT FADED". It is that the point under its centre belongs to the PAGE
   — `elementFromPoint` must return content, not the bubble. A 44px square that is invisible and
   still takes taps is strictly worse than a visible one, and is D30's defect (a player aiming at a
   control and opening a support chat) wearing a disguise.

   ⭐ AND IT CHECKS THE WAKE IS DEFERRED. Rousing on the press would hand the bubble back mid-gesture
   and the click the browser then synthesises could land on it instead of the control the finger went
   for — D66 exactly. So a key is pressed and the bubble must STILL be out of hit-testing 100ms
   later, and back by 600ms. A fix that woke instantly would pass every other line here. */
console.log("");
for (const surface of ["/markets", "/"]) {
  const { ctx, p } = await open(b, 360, 780, surface, "D75");
  const read = () =>
    p.evaluate(() => {
      const btn = document.querySelector(".cm-bubble");
      const fab = document.querySelector(".cm-fab");
      if (!btn || !fab) return null;
      const q = btn.getBoundingClientRect();
      const el = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
      return {
        idle: document.documentElement.hasAttribute("data-fab-idle"),
        opacity: Number(getComputedStyle(fab).opacity),
        hits: !!(el && (el === btn || btn.contains(el) || el.contains(btn))),
        under: el ? el.tagName + "." + String(el.className || "").split(" ").slice(0, 2).join(".") : "(nothing)",
      };
    });

  // no interaction of any kind; `open()` already spent 2.4s, so this is ~6.6s of stillness
  await p.waitForTimeout(4200);
  const napping = await read();
  if (!napping) {
    failures.push(`§6 ${surface} no chat bubble on the page — the probe proves nothing`);
    await ctx.close();
    continue;
  }
  // ⛔ VACUITY: if the attribute never arrives, every line below is about a state that never happened
  if (!napping.idle) failures.push(`§6 ${surface} \`data-fab-idle\` was never set after 6.6s of stillness — the probe cannot see the state it tests`);
  else {
    if (napping.opacity > 0.05) failures.push(`§6 ${surface} the bubble is still painted at rest (opacity ${napping.opacity})`);
    if (napping.hits) failures.push(`§6 ${surface} the bubble STILL TAKES THE TAP at rest — the point under its centre is the bubble, not the page. An invisible control that steals taps is worse than a visible one.`);
  }

  // a key press must not hand it back until the click it may belong to has been and gone
  await p.keyboard.press("Escape");
  await p.waitForTimeout(100);
  const midWake = await read();
  if (napping.idle && (midWake.hits || midWake.opacity > 0.05)) {
    failures.push(`§6 ${surface} the bubble came back 100ms after a key — the wake is not deferred past the click, so a tap aimed at a control can be re-stolen on the way back (D66/D30)`);
  }
  await p.waitForTimeout(600);
  const awake = await read();
  if (awake.opacity < 0.99 || !awake.hits) failures.push(`§6 ${surface} the bubble did not come back after the reader touched the page (opacity ${awake.opacity}, hits ${awake.hits}) — the support entry point is unreachable`);

  console.log(`   §6 ${surface.padEnd(9)} still 6.6s → idle=${napping.idle} opacity=${napping.opacity} takesTap=${napping.hits} (under it: ${napping.under})  ·  +100ms after a key → takesTap=${midWake.hits}  ·  +700ms → opacity=${awake.opacity} takesTap=${awake.hits}`);
  await ctx.close();
}

/* ── §7 · D67 — AN OVERLAY PANEL MUST BE INSIDE THE SCREEN IT OPENS ON ──────────────────
   The language listbox measures its own geometry on open and flips from right- to left-anchored when
   right-anchoring would run off the LEFT edge. It then never looks again — and at 320 the flip put its
   right edge at **321.8 against a 320 viewport, 1.75px past**, where `overflow-clip` on the body slices
   the border and squares off one rounded corner while the other stays round.

   ⭐ A BINARY LEFT/RIGHT CHOICE CANNOT SOLVE A PANEL WIDER THAN THE ROOM ON EITHER SIDE, and at 320
   this one is: right-anchored puts it at left -64, left-anchored puts it at right +1.75. So the fix
   clamps it back with a measured translate, and this section asserts the thing that clamp moves — the
   panel's edges against the viewport — rather than the presence of a class.

   ⚠️ 320 IS THE WIDTH THAT MATTERS AND 360 WOULD HAVE PASSED THROUGHOUT. The panel sits 150px clear
   at 360; a sweep that only covered the common phone would have called this clean. It is also the
   control a Swahili-default platform gives players for leaving English, on the narrowest phone it
   supports. */
console.log("");
for (const w of [320, 360]) {
  const ctx = await ctxFor(b, w, 640);
  const p = await ctx.newPage();
  await p.goto(BASE + "/markets", { waitUntil: "load", timeout: 90000 });
  await p.waitForTimeout(2400);
  await assertLang(p, "sw");
  if (RED.D67) await p.addStyleTag({ content: RED_CSS.D67 });

  const sum = p.locator('summary[aria-label*="Badilisha"], summary[aria-label*="Switch"]').first();
  if (!(await sum.count())) {
    failures.push(`§7 ${w} no language control on the page — the probe proves nothing`);
    await ctx.close();
    continue;
  }
  await sum.click().catch(() => {});
  await p.waitForTimeout(800);

  const r = await p.evaluate(() => {
    const det = [...document.querySelectorAll("details[open]")].find((d) =>
      /Badilisha|Switch|language/i.test(d.querySelector("summary")?.getAttribute("aria-label") || ""));
    if (!det) return { closed: true };
    const panel = [...det.children].find((c) => c.tagName !== "SUMMARY");
    if (!panel) return { noPanel: true };
    const q = panel.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    return {
      left: Math.round(q.left * 100) / 100, right: Math.round(q.right * 100) / 100,
      w: Math.round(q.width), vw,
      pastRight: Math.round((q.right - vw) * 100) / 100,
      pastLeft: Math.round((0 - q.left) * 100) / 100,
      options: panel.querySelectorAll("button").length,
    };
  });

  // ⛔ VACUITY: a panel that never opened, or that holds no options, cannot fail the assertion below.
  if (r.closed) { failures.push(`§7 ${w} the language menu did not open — this width proved nothing`); await ctx.close(); continue; }
  if (r.noPanel) { failures.push(`§7 ${w} the open menu has no panel — this width proved nothing`); await ctx.close(); continue; }
  if (!r.options || r.options < 2) { failures.push(`§7 ${w} the panel holds ${r.options} option(s) — fewer than two, so nothing was really laid out`); await ctx.close(); continue; }

  if (r.pastRight > 0) failures.push(`§7 ${w} the language panel runs ${r.pastRight}px PAST THE RIGHT EDGE (right ${r.right} vs a ${r.vw}px viewport) — body overflow-clip slices its border there`);
  if (r.pastLeft > 0) failures.push(`§7 ${w} the language panel runs ${r.pastLeft}px past the LEFT edge (left ${r.left})`);
  console.log(`   §7 ${String(w).padStart(3)}px  panel ${r.w}px at ${r.left}..${r.right} in a ${r.vw}px viewport  ·  clear of right by ${-r.pastRight}px, of left by ${-r.pastLeft}px  · ${r.options} options`);
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
  const SECTION = { D56: "§1", D57: "§2", D63: "§3", FIT: "§4", D3: "§5", D75: "§6", D67: "§7" };
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
