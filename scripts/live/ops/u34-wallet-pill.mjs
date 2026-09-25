/**
 * U34 / D31 · PRODUCTION — the signed-in wallet capsule, at phone widths.
 *
 *   LIVE_BASE=https://www.50pick.tz node scripts/live/ops/u34-wallet-pill.mjs
 *
 * ⭐ THE WHOLE POINT IS THAT IT IS SIGNED IN. D78's own record says it plainly: "the entire
 * signed-in header is outside every tap gate's population" — `qa:tap-truth` and `qa:tap-hit`
 * measure real boxes but run SIGNED OUT, and this control only exists for a signed-in player.
 * Every gate was green on a surface none of them opens.
 *
 * ⭐ AND TZS 0 IS THE WORST CASE, NOT A CONVENIENCE. D31 measured the hidden-balance mask
 * overflowing 27.2px at TZS 0 and 13.6 at TZS 500, because the box was sized from the REAL
 * figure while the hidden state paints a fixed nine-character mask. `mobile01` is funded with
 * nothing, so this account is the harshest one available for that half.
 */
import { chromium } from "playwright";

const BASE = process.env.LIVE_BASE;
if (!BASE) { console.error("⛔ set LIVE_BASE"); process.exit(2); }
console.log(`\n  TARGET: ${BASE}\n`);

const TAP_MIN = 40; // Law 9, globals.css — NOT 44, whatever several unit bodies still say.
const verdicts = [];
// Accepts a boolean (PROVED/REFUTED) or the literal "BLIND", so a check and an
// inconclusive read are written the same way at the call site.
const say = (v, name, detail) => {
  const word = v === true ? "PROVED" : v === false ? "REFUTED" : String(v);
  verdicts.push({ v: word, name });
  console.log(`  ${word.padEnd(8)} ${name}${detail ? ` — ${detail}` : ""}`);
};

const readPill = (page) => page.evaluate(() => {
  // The eye is the only button inside the wallet capsule; find it by its rounded right cap.
  const eye = document.querySelector('[class*="rounded-r-pill"]');
  const delta = document.querySelector(".wbp-delta");
  const pill = eye ? eye.closest("a,div,span")?.parentElement : null;
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
    return { w: +r.width.toFixed(2), h: +r.height.toFixed(2), right: +r.right.toFixed(2) }; };
  return {
    eye: box(eye),
    eyeName: eye ? (eye.getAttribute("aria-label") ?? eye.textContent.trim()) : null,
    deltaPresent: !!delta,
    deltaPosition: delta ? getComputedStyle(delta).position : null,
    header: box(document.querySelector("header")),
    docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
    pillOverflow: pill ? pill.scrollWidth - pill.clientWidth : null,
  };
});

const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const { loginOnce } = await import("../harness.mjs");
  let state = null;
  try { state = await loginOnce(b, "mobile01"); } catch (e) { say("BLIND", "U34", `sign-in failed: ${String(e).slice(0, 100)}`); }

  if (state) {
    for (const width of [320, 360, 412]) {
      const ctx = await b.newContext({ viewport: { width, height: 800 }, storageState: state });
      await ctx.addCookies([{ name: "kp-locale", value: "sw", domain: new URL(BASE).hostname, path: "/" }]);
      const page = await ctx.newPage();
      await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(1200);

      const before = await readPill(page);
      if (!before.eye) { say("BLIND", `U34 @${width}`, "the wallet capsule did not render — is the session live?"); await ctx.close(); continue; }
      console.log(`  @${width} eye=${JSON.stringify(before.eye)} name="${before.eyeName}"`);

      // D78 · the reach, in BOTH axes. A control is not a rung in one dimension.
      say(before.eye.w >= TAP_MIN && before.eye.h >= TAP_MIN, `U34 @${width} · the eye clears --tap-min in BOTH axes`,
        `${before.eye.w}×${before.eye.h} against ${TAP_MIN}`);

      // D31 · what it announces. The defect said "Hide password" on a balance toggle.
      const name = (before.eyeName ?? "").toLowerCase();
      say(!/password|nenosiri|密码/.test(name), `U34 @${width} · it does not announce a password`, `"${before.eyeName}"`);

      // D31 · toggling the mask must move NOTHING — the box is the MAX of both states.
      const w0 = before.header?.w;
      await page.locator('[class*="rounded-r-pill"]').first().evaluate((el) => el.click());
      await page.waitForTimeout(900);
      const after = await readPill(page);
      /* ⛔ A DELTA, NOT A TOTAL. The first version asserted `bodyOverflow <= 0` and went REFUTED at
         320 on a 12px body overflow that is ALREADY THERE before the toggle — measured identical
         before and after (bodyScrollWidth 332 vs client 320, the widest boxes past the edge being
         `.kp-fchip` rail chips). D31 is about whether TOGGLING THE MASK moves the layout, so the
         question is whether the number CHANGES. A pre-existing overflow is a separate finding and
         is recorded as one — not laundered through this unit. */
      say(after.header && w0 === after.header.w
          && after.docOverflow === before.docOverflow && after.bodyOverflow === before.bodyOverflow,
        `U34 @${width} · toggling the mask moves NOTHING`,
        `header ${w0} → ${after.header?.w}, document ${before.docOverflow} → ${after.docOverflow}px, body ${before.bodyOverflow} → ${after.bodyOverflow}px, capsule ${after.pillOverflow}px`);

      // D31 · the delta flash must not be in flow, or it shifts the header for 800ms.
      if (after.deltaPresent) {
        say(after.deltaPosition === "absolute", `U34 @${width} · the delta flash is out of flow`, `position: ${after.deltaPosition}`);
      } else {
        say("BLIND", `U34 @${width} · the delta flash`, "no .wbp-delta on screen — it paints only when the balance CHANGES, and this account's did not");
      }
      await ctx.close();
    }
  }
} finally { await b.close(); }

console.log("\n──────────────────────────────────────────────────────────────────────");
const fails = verdicts.filter((x) => x.v === "REFUTED").length;
const blind = verdicts.filter((x) => x.v === "BLIND").length;
console.log(`  ${verdicts.length - fails - blind} proved · ${blind} blind · ${fails} refuted`);
if (fails > 0) process.exit(1);
if (blind > 0) { console.log("  ⚠️ BLIND is not a pass."); process.exit(3); }
