/**
 * E-219 · ONE FOCUS RING, COUNTED IN PIXELS, ON PRODUCTION.
 *
 * Ali, from the live product: *"in chatbot we got double borders on highlighting of input
 * text"*. The chat composer is a SHELL that draws the ring on `:focus-within` while the
 * field inside it is meant to draw nothing — the same shape as the kit's `.input-group`,
 * whose second half (`.input-group .input:focus { box-shadow: none }`) was never written
 * for the chat. Measured before the fix, the composer painted THREE brand rings, not two.
 *
 * ⭐ WHY THIS COUNTS PIXELS AND NOT COMPUTED STYLES, AND IT IS THE WHOLE DESIGN.
 * The obvious instrument walks the subtree and counts elements whose `box-shadow` /
 * `outline-color` change on focus. It reports the kit's OWN `.input-group` — the correct
 * one, the control — as a DOUBLE ring, because the inner field really does compute a solid
 * `--brand-500` outline and the group's `overflow: hidden` then clips it away. A computed
 * style is not a painted pixel, and a guard that cannot tell the difference would have
 * ordered a "fix" to the one component in the product that already had this right.
 *
 * So: screenshot the composer at rest, screenshot it focused, and count how many separate
 * bands of changed pixels lie in the GUTTER between the shell's outer edge and the field's
 * own left edge, along the field's horizontal centre-line. One ring = one band. Clipping,
 * transparency, overlap and the cascade are all somebody else's problem — the camera sees
 * what the player sees.
 *
 * THE CONTROLS, all three in the same run, because a refusal with no positive control is
 * an absent test:
 *   ① POSITIVE — the count must be ≥ 1. A "fix" that deleted every ring would satisfy
 *     "not 2" perfectly and leave the composer with no focus indicator at all.
 *   ② INSTRUMENT — the same counter is run against `.input-group.search-box` on /markets,
 *     the shell that already has the second half of the pattern. It must read exactly 1.
 *     A counter that cannot report 1 on a correct field is not measuring rings.
 *   ③ MUST-GO-RED — the defect is FORCED BACK with `addStyleTag` and the count must rise
 *     to 2. ⚠️ And the run asserts the injected rule actually took effect (E-218: a RED
 *     mutation that prepends a declaration the cascade ignores reports NOT CAUGHT and
 *     looks like a clean pass).
 *
 * ⚠️ THE PANEL AUTOFOCUSES THE COMPOSER when it opens, so a reading taken straight after
 * opening is the FOCUS state wearing the label "rest". This blurs explicitly and asserts
 * `document.activeElement` moved before it believes any resting measurement.
 *
 * ⚠️ AND THE CLIP BOX IS TAKEN ONCE AND ASSERTED UNCHANGED between the two shots. If focus
 * moved the layout by even a pixel, every pixel in the row would read as "changed" and the
 * band count would be meaningless — reported as a failure, never silently averaged away.
 *
 * Run: npm run qa:chat-focus-ring
 */
import { PNG } from "pngjs";
import { browser, login, BASE, recorder } from "./live/harness.mjs";

const SHOT = process.env.SHOT_DIR ?? "docs/shots/chat-focus-ring";
const WIDTHS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "phone", width: 393, height: 852 },
];
const LOCALES = ["en", "sw", "zh"];
/** Accessible name of the chat launcher, in the three languages it ships in. */
const OPEN_HELP = /open 50pick help|fungua msaada wa 50pick|打开 50pick 帮助/i;

/** A pixel differs if any channel moves by more than this. Antialiasing on a rounded
 *  corner moves a channel by a few units; a brand ring moves it by tens. Scanning the
 *  field's horizontal centre-line avoids the corners entirely, so this is slack, not a
 *  tuning knob — the measured deltas either side of it are ~0 and ~40+. */
const CHANNEL_EPS = 12;
/** Bands closer than this are one ring rendered as border + halo. Measured: the composer's
 *  1px border and its 3px halo are CONTIGUOUS (gap 0); the gap between the shell's ring and
 *  the field's ring is the shell's 14px padding-left. */
const BAND_JOIN_PX = 2;

const png = (buf) => PNG.sync.read(buf);
const at = (img, x, y) => {
  const i = (img.width * y + x) << 2;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
};

/**
 * Count the separate bands of changed pixels in the gutter left of `field`, along the
 * field's horizontal centre-line, inside the clip `box`.
 */
function countBands(restImg, focusImg, box, field) {
  const rowY = Math.round(field.y + field.height / 2 - box.y);
  const gutter = Math.round(field.x - box.x);
  const changed = [];
  for (let x = 0; x < gutter; x++) {
    const a = at(restImg, x, rowY);
    const b = at(focusImg, x, rowY);
    const d = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
    changed.push(d > CHANNEL_EPS);
  }
  const bands = [];
  let start = -1;
  for (let x = 0; x <= changed.length; x++) {
    if (changed[x]) { if (start < 0) start = x; }
    else if (start >= 0) {
      const prev = bands[bands.length - 1];
      if (prev && start - prev.end <= BAND_JOIN_PX) prev.end = x;
      else bands.push({ start, end: x });
      start = -1;
    }
  }
  return { bands, rowY, gutter };
}

/**
 * Measure one field inside one shell. `shellSel` is the clip; `fieldSel` is what gets focus.
 * Returns the band list, or throws if the instrument itself could not stand up.
 */
async function ringsOf(page, shellSel, fieldSel, tag) {
  const field = page.locator(fieldSel).first();
  await field.waitFor({ state: "visible", timeout: 15_000 });

  // ── rest, and PROVE it is rest ────────────────────────────────────────────
  await page.evaluate((s) => document.querySelector(s)?.blur(), fieldSel);
  await page.waitForTimeout(450);
  const stillFocused = await page.evaluate(
    (s) => document.activeElement === document.querySelector(s), fieldSel);
  if (stillFocused) throw new Error(`${tag}: blur() did not move focus — the "rest" reading would be the focus state`);

  const box = await page.locator(shellSel).first().boundingBox();
  const fieldBoxRest = await field.boundingBox();
  const restBuf = await page.screenshot({ clip: box });

  // ── focus ─────────────────────────────────────────────────────────────────
  await field.focus();
  await page.waitForTimeout(450);
  const focusedNow = await page.evaluate(
    (s) => document.activeElement === document.querySelector(s), fieldSel);
  if (!focusedNow) throw new Error(`${tag}: focus() did not land on ${fieldSel}`);

  // ⛔ THE LAYOUT CONTROL. A reflow makes every pixel "changed" and the band count a fiction.
  const boxFocus = await page.locator(shellSel).first().boundingBox();
  const fieldBoxFocus = await field.boundingBox();
  const moved = ["x", "y", "width", "height"].some(
    (k) => Math.abs(box[k] - boxFocus[k]) > 0.6 || Math.abs(fieldBoxRest[k] - fieldBoxFocus[k]) > 0.6);
  if (moved) throw new Error(`${tag}: focus MOVED the layout (${JSON.stringify(box)} → ${JSON.stringify(boxFocus)}) — bands cannot be counted`);

  const focusBuf = await page.screenshot({ clip: box });
  const r = countBands(png(restBuf), png(focusBuf), box, fieldBoxFocus);
  return { ...r, restBuf, focusBuf, box };
}

const rec = recorder("E-219 · ONE FOCUS RING — counted in painted pixels, on production");

const { b } = await browser({ viewport: { width: 1440, height: 1000 } });
const state = await (async () => {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await login(page, "fleet:07");
  const s = await ctx.storageState();
  s.cookies = s.cookies.filter((c) => c.name !== "kp-locale");
  await ctx.close();
  return s;
})();

const { mkdirSync, writeFileSync } = await import("node:fs");
mkdirSync(SHOT, { recursive: true });

// ── ② THE INSTRUMENT CONTROL, run FIRST ───────────────────────────────────────
// The kit's own `.input-group` is the shell that already carries the second half of this
// pattern. Its inner field computes a solid --brand-500 outline on focus which the group's
// `overflow: hidden` clips away — so a computed-style counter reads 2 here and a pixel
// counter reads 1. Running it first means a broken instrument is caught before it is used
// to make a claim about the chat.
{
  const ctx = await b.newContext({ storageState: state, viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded" });
  await page.locator(".input-group.search-box input").first().waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(1200);
  const r = await ringsOf(page, ".input-group.search-box", ".input-group.search-box input", "control:input-group");
  rec.check("② INSTRUMENT CONTROL — the kit's .input-group paints exactly ONE ring",
    r.bands.length === 1, `bands=${r.bands.length} ${JSON.stringify(r.bands)} gutter=${r.gutter}px`);
  rec.note(`the group's overflow:hidden clips the inner field's computed --brand-500 outline; a computed-style counter would call this 2`);
  writeFileSync(`${SHOT}/control-input-group-focus.png`, r.focusBuf);
  await ctx.close();
}

// ── the matrix ────────────────────────────────────────────────────────────────
for (const w of WIDTHS) {
  for (const loc of LOCALES) {
    const ctx = await b.newContext({ storageState: state, viewport: { width: w.width, height: w.height } });
    await ctx.addCookies([{ name: "kp-locale", value: loc, url: BASE }]);
    const page = await ctx.newPage();
    const cell = `${w.name}/${loc}`;
    try {
      await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: OPEN_HELP }).click({ timeout: 20_000 });
      await page.locator(".cm-composer textarea").waitFor({ state: "visible", timeout: 20_000 });
      await page.waitForTimeout(900);

      const r = await ringsOf(page, ".cm-composer-wrap", ".cm-composer textarea", cell);

      // ① POSITIVE CONTROL — the ring must EXIST. "Not two" is satisfied by none.
      rec.check(`① ${cell} · the focus ring exists at all`, r.bands.length >= 1,
        `bands=${r.bands.length}`);
      rec.check(`   ${cell} · exactly ONE ring in the gutter`, r.bands.length === 1,
        `bands=${r.bands.length} ${JSON.stringify(r.bands)} row=${r.rowY} gutter=${r.gutter}px`);
      writeFileSync(`${SHOT}/${w.name}-${loc}-rest.png`, r.restBuf);
      writeFileSync(`${SHOT}/${w.name}-${loc}-focus.png`, r.focusBuf);

      // ── ③ MUST-GO-RED, in this cell, on the real page ───────────────────────
      // Force the defect back at a specificity that wins, then require the counter to see
      // it. ⚠️ And assert the injection APPLIED before trusting what the count says.
      if (w.name === "desktop" && loc === "en") {
        await page.addStyleTag({
          content: `.cm-composer textarea:focus, .cm-composer textarea:focus-visible {
            box-shadow: 0 0 0 3px oklch(63% 0.18 262 / 0.25) !important;
            outline-color: var(--brand-500) !important; }`,
        });
        await page.locator(".cm-composer textarea").focus();
        await page.waitForTimeout(300);
        const applied = await page.evaluate(() => {
          const ta = document.querySelector(".cm-composer textarea");
          const cs = getComputedStyle(ta);
          return { shadow: cs.boxShadow, outline: cs.outlineColor };
        });
        rec.check("③ RED CONTROL · the forced defect actually applied",
          applied.shadow !== "none" && !/rgba\(0, 0, 0, 0\)|transparent/.test(applied.outline),
          JSON.stringify(applied));
        const red = await ringsOf(page, ".cm-composer-wrap", ".cm-composer textarea", `${cell}:RED`);
        rec.check("③ RED CONTROL · with the defect forced back the counter sees TWO rings",
          red.bands.length === 2, `bands=${red.bands.length} ${JSON.stringify(red.bands)}`);
        writeFileSync(`${SHOT}/RED-forced-defect-focus.png`, red.focusBuf);
      }
    } catch (e) {
      rec.check(`${cell} · measured`, false, String(e.message ?? e));
    } finally {
      await ctx.close();
    }
  }
}

await b.close();
const failed = rec.done();
console.log(`shots → ${SHOT}`);
process.exit(failed ? 1 : 0);
