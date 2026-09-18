/**
 * REPRODUCE THE TRANSLATOR CRASH, AND PROVE THE GUARD STOPS IT.
 *
 * 🔴 THE REAL EXCEPTION, captured off the player's handset 2026-09-18 via `/api/client-error`
 * (Android 10, Chrome 152 Mobile) after a bet that had already succeeded:
 *
 *   NotFoundError: Failed to execute 'removeChild' on 'Node':
 *   The node to be removed is not a child of this node.
 *
 *   node scripts/live/translate-crash-repro.mjs            # localhost:3019
 *   LOCAL_BASE=… BOARD_PATH=/updown node scripts/live/translate-crash-repro.mjs
 *
 * ── 🔴 WHAT THIS MEASURED, 2026-09-18 — IT DOES **NOT** REPRODUCE, AND THAT IS THE FINDING ───
 *
 *   A · guard UNINSTALLED (control): triggers=5 · textNodesTranslated=171 · NotFoundError=no
 *   B · guard ACTIVE               : triggers=5 · textNodesTranslated=171 · NotFoundError=no
 *   ⛔ CONTROL DID NOT CRASH — so B proves nothing, and the script SAYS SO and exits 3.
 *
 * ⛔ **DO NOT READ A GREEN RUN OF THIS FILE AS "THE BUG IS GONE".** It has never gone red. It is
 * kept because the negative is worth knowing, and because the next person will otherwise write it
 * again from scratch.
 *
 * ⭐ WHY THE SIMULATION IS WEAKER THAN THE REAL THING. This wraps every text node once, the way
 * Translate does — but the real Translate also installs a **MutationObserver and re-translates
 * continuously**, so it is racing React's commits rather than sitting still between them. React
 * 19 absorbs a one-shot swap (a text-only change is written via `nodeValue`, which touches no
 * re-parented node); what it does not absorb is a swap landing *between* a render and its commit.
 * Reproducing that faithfully needs real Google Translate on a real device, not a DOM imitation.
 *
 * ⚠️ THREE TRIGGERS WERE TRIED AND NONE SUFFICED: the one-second countdown (text-only, so React
 * never removes anything); mounting/unmounting the Raundi↔Chati subtree; and a full client-side
 * route change, the heaviest unmount there is. The run above landed all five interactions —
 * `triggers=5` — so this is a measured negative, not a probe that missed.
 *
 * ⭐ WHAT *IS* PROVEN LIVES ELSEWHERE, and is what the fix rests on:
 *   · the REAL exception, off the real handset, via `/api/client-error` (quoted above);
 *   · `npm run test:translation-safety` §3 — the guard's BEHAVIOUR, with a control proving the
 *     unguarded DOM does throw on exactly this condition.
 * ⛔ THIS FILE IS NOT A GATE and is deliberately not wired into `predeploy`.
 *
 * ⛔ THE CONTROL IS STILL THE POINT. Cell A restores the NATIVE `removeChild`/`insertBefore`
 * (lifted off a fresh iframe, which is unpatched). If it ever DOES crash, this file becomes the
 * end-to-end proof it was written to be — and B then means something.
 * ⛔ It gates on the board having RENDERED and on an unmount having been TRIGGERED: translating
 * an empty page, or clicking nothing, and seeing no crash is a skipped run, not a pass.
 */
import { chromium } from "playwright";

const BASE = process.env.LOCAL_BASE ?? "http://localhost:3019";
const PATH = process.env.BOARD_PATH ?? "/updown";
const CRASH = ["that page hit a snag", "encountered a problem", "ukurasa huu umekumbana"];

/** Exactly what Google Translate does to the DOM, in the DOM. */
const SIMULATE_TRANSLATE = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const texts = [];
  let n;
  while ((n = walker.nextNode())) {
    const s = n.nodeValue ?? "";
    if (s.trim().length > 0 && n.parentElement && !["SCRIPT", "STYLE"].includes(n.parentElement.tagName)) texts.push(n);
  }
  let swapped = 0;
  for (const t of texts) {
    try {
      // Translate wraps the replacement in its own <font> and DISCARDS the original node —
      // which is precisely why React's stored reference goes stale.
      const font = document.createElement("font");
      font.setAttribute("style", "vertical-align: inherit;");
      font.appendChild(document.createTextNode((t.nodeValue ?? "") + "​"));
      t.parentNode?.replaceChild(font, t);
      swapped++;
    } catch { /* a node already detached — skip */ }
  }
  return swapped;
};

/** Lift the untouched natives off a fresh iframe and put them back — i.e. uninstall our guard. */
const UNINSTALL_GUARD = () => {
  const f = document.createElement("iframe");
  f.style.display = "none";
  document.body.appendChild(f);
  const w = f.contentWindow;
  if (!w) return false;
  Node.prototype.removeChild = w.Node.prototype.removeChild;
  Node.prototype.insertBefore = w.Node.prototype.insertBefore;
  return true;
};

const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });

async function cell(label, { uninstall }) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "sw-TZ" });
  await ctx.addInitScript(() => { try { localStorage.setItem("kp-updown-viz", "cubes"); } catch { /* ignore */ } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errs.push(`[console] ${m.text()}`); });

  await page.goto(`${BASE}${PATH}`, { waitUntil: "domcontentloaded", timeout: 240_000 });
  await page.waitForTimeout(6000);

  // ⛔ GATE — translating nothing and surviving is not a pass.
  const nodes = await page.locator("main *").count();
  if (nodes < 20) {
    console.log(`  ${label}: ⚠️ board did not render (main descendants=${nodes}) — MEASURED NOTHING`);
    await ctx.close();
    return { measured: false, crashed: false };
  }

  if (uninstall) {
    const ok = await page.evaluate(UNINSTALL_GUARD);
    if (!ok) { console.log(`  ${label}: could not uninstall the guard — control invalid`); await ctx.close(); return { measured: false, crashed: false }; }
  }

  const swapped = await page.evaluate(SIMULATE_TRANSLATE);

  /**
   * ⛔ TRANSLATING IS NOT THE TRIGGER — UNMOUNTING IS, and the first version of this file got
   * that wrong and reported "survived" for both cells. React updates a text-only change by
   * writing `nodeValue`, which touches nothing a translator has re-parented. The throw needs
   * React to REMOVE or REPLACE a node it believes it owns.
   *
   * ⭐ Which is exactly what the player's tap did: placing a bet MOUNTS a toast and the receipt
   * modal, and then UNMOUNTS them. The board's Raundi/Chati toggle is the same shape with no
   * money involved — `board-viz.tsx` mounts the chart body only while it is selected — so
   * toggling it twice makes React tear down a subtree whose text nodes have been swapped.
   */
  let triggers = 0;
  for (const label of ["Chati", "Raundi", "Chati", "Raundi"]) {
    const hit = await page.getByRole("button", { name: label, exact: false }).first()
      .click({ timeout: 4000 }).then(() => true).catch(() => false);
    if (hit) triggers++;
    await page.waitForTimeout(600);
  }
  /**
   * ⭐ AND THE HEAVIEST UNMOUNT THERE IS: a client-side route change tears down the entire page
   * subtree at once. If a re-parented text node anywhere in it is going to make React throw,
   * this is where it happens.
   */
  const navd = await page.getByRole("link", { name: /Masoko|Markets/i }).first()
    .click({ timeout: 5000 }).then(() => true).catch(() => false);
  if (navd) triggers++;
  await page.waitForTimeout(4000);

  // ⛔ GATE ON THE TRIGGER, not just on the translation. A probe whose interactions all missed
  // reports "survived" about a re-render that never happened — which this file did, twice.
  if (triggers === 0) {
    console.log(`  ${label}: ⚠️ no unmount was triggered (0 interactions landed) — MEASURED NOTHING`);
    await ctx.close();
    return { measured: false, crashed: false };
  }

  const body = ((await page.locator("body").textContent().catch(() => "")) ?? "").toLowerCase();
  const boundary = CRASH.some((c) => body.includes(c));
  const notFound = errs.some((e) => /not a child of this node|NotFoundError/i.test(e));
  const crashed = boundary || notFound;

  console.log(
    `  ${label}: triggers=${triggers} · textNodesTranslated=${swapped} · NotFoundError=${notFound ? "YES" : "no"} · ` +
    `errorBoundary=${boundary ? "YES" : "no"} → ${crashed ? "🔴 CRASHED" : "✅ survived"}`,
  );
  for (const e of errs.filter((x) => /not a child|NotFound/i.test(x)).slice(0, 2)) console.log(`      ${e}`);
  await ctx.close();
  return { measured: true, crashed };
}

console.log(`\nTranslator crash — ${BASE}${PATH}\n`);
const control = await cell("A · guard UNINSTALLED (control — MUST crash)", { uninstall: true });
const guarded = await cell("B · guard ACTIVE   (the fix — must survive)", { uninstall: false });
await b.close();

console.log("");
if (!control.measured || !guarded.measured) {
  console.log("⛔ NOTHING WAS MEASURED — skipped run, not a pass."); process.exit(3);
}
if (!control.crashed) {
  // ⭐ The control failing to crash means the repro no longer reproduces — the result below
  // would be meaningless, so it is a FAILURE of this instrument, not a success of the fix.
  console.log("⛔ CONTROL DID NOT CRASH — the repro is not reproducing; B proves nothing."); process.exit(3);
}
if (guarded.crashed) { console.log("🔴 THE GUARD DID NOT HOLD — the fix does not work."); process.exit(1); }
console.log("✅ Control crashed, guarded run survived — the guard is doing the work.");
process.exit(0);
