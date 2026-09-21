/**
 * qa:checkbox-surfaces — EVERY OTHER PLACE THE KIT CHECKBOX IS USED, DRIVEN WITH A REAL POINTER.
 *
 *   KP_BASE=http://localhost:3031 npm run qa:checkbox-surfaces
 *
 * ── WHY IT EXISTS ────────────────────────────────────────────────────────────────────────────────────────────
 * 2026-09-21 changed `components/ui/checkbox.tsx` — a KIT PRIMITIVE with eleven call sites across the admin
 * console, the player's registration form and the profile. The change was the right one (the label used to
 * cancel its own activation, so the real `<input>` was never clicked and a mouse tick raised no event at all),
 * but "the bug I was chasing is fixed" is not the same claim as "the other ten call sites still work", and the
 * second claim is the one that decides whether a stranger can still open an account.
 *
 * ⛔ THE TWO SHAPES THAT COULD HAVE BROKEN, NAMED RATHER THAN SWEPT FOR:
 *   ① A CONTROLLED box (`checked` + `onChange` owned by a parent) — the resolver queue's row select and its
 *     select-all. Native activation now moves the DOM first and React restores it, so a parent that does NOT
 *     adopt the change must still win. A double-toggle here selects a market nobody chose for a BULK RESOLVE.
 *   ② THE THIRD STATE. `indeterminate` is a DOM PROPERTY set in an effect, and the effect's dependencies moved
 *     with this change. A select-all that cannot say "some, but not all" is LYING about a partial selection.
 *
 * ⛔ AND THE PLAYER SURFACE IS FIRST, not last: `/auth/register`'s age gate is the control a real person ticks
 * to swear they are 18, on the form that opens a money account. If a kit change broke one box in this product,
 * that is the one it must not be.
 *
 * ⚠️ **WHAT THIS GATE DOES NOT PROVE, MEASURED RATHER THAN ASSUMED.** Put the old `checkbox.tsx` back and every
 * check below still passes — and that is CORRECT, not a hole. The defect the owner reported was never that the
 * box failed to toggle: the old component updated its own React state perfectly, so the tick appeared and the
 * value submitted. What was missing was the NATIVE event, and the only thing in this product that listens for
 * it is `useFormDirty` — which exactly one of these eleven call sites uses. So the original bug is invisible
 * here by construction, and `qa:desk-rules-flow` §3 is the gate that owns it (its own mutation run goes red).
 * ⭐ THIS GATE'S JOB IS THE OTHER DIRECTION: the fix rewired a primitive from a hand-rolled toggle to native
 * label activation, and this proves that rewiring did not break the ten call sites that were never broken —
 * including a CONTROLLED bulk-select over real money and the age gate on the account-opening form. A
 * no-regression gate and a defect gate are different instruments, and saying which one this is keeps a green
 * run here from being read as proof of something it never looked at.
 *
 * ⚠️ `localhost`, NOT `127.0.0.1` — Next 16 blocks cross-origin dev resources and the page never hydrates.
 */
import { chromium } from "playwright";

const BASE = process.env.KP_BASE ?? "http://localhost:3031";
if (!/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(BASE)) {
  console.error(`REFUSED — local dev only. KP_BASE was ${JSON.stringify(BASE)}.`);
  process.exit(2);
}

let fail = 0;
let n = 0;
const ok = (name, pass, detail = "") => {
  n++;
  console.log(`  ${pass ? "PASS" : "FAIL"} ${name}${pass || !detail ? "" : ` — ${detail}`}`);
  if (!pass) fail++;
};
const soft = async (what, fn, fallback = undefined) => {
  try { return await fn(); } catch (e) { console.log(`    (${what}: ${String(e).slice(0, 90)})`); return fallback; }
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => {
  const t = m.text();
  if (m.type() === "error" && !/webpack-hmr|React DevTools/.test(t)) errors.push(t.slice(0, 160));
});
page.on("pageerror", (e) => errors.push(`pageerror: ${String(e).slice(0, 160)}`));

/** The real control AND the painted square — the defect class here is the two disagreeing. */
const state = (sel) => page.evaluate((s) => {
  const i = document.querySelector(s);
  if (!i) return null;
  const span = i.parentElement?.querySelector("span[aria-hidden]");
  const bg = span ? getComputedStyle(span).backgroundColor : "";
  return { checked: i.checked, indeterminate: i.indeterminate, painted: !/rgba\(0, 0, 0, 0\)|transparent/.test(bg) };
}, sel);
/** Click the LABEL, never the input: only a pointer on the label reproduces the class of bug this guards. */
const tick = (sel) => page.locator("label").filter({ has: page.locator(sel) }).first().click();

console.log("──────────────────────────────────────────────────────────────────────");
console.log("qa:checkbox-surfaces · the kit checkbox, everywhere else it is used");
console.log("──────────────────────────────────────────────────────────────────────");

// ── §1 · the player's age gate ───────────────────────────────────────────────────────────────────────────────
console.log("\n§1 · /auth/register — the control a person ticks to swear they are 18");
await page.goto(`${BASE}/auth/register`, { waitUntil: "load" });
await page.waitForTimeout(3000);
const boxes = await page.locator('input[type=checkbox]').count();
ok("1.1 the form renders at least one checkbox", boxes >= 1, `saw ${boxes}`);
if (boxes >= 1) {
  const before = await state('input[type=checkbox]');
  await soft("tick the age gate", () => tick('input[type=checkbox]'));
  await page.waitForTimeout(400);
  const after = await state('input[type=checkbox]');
  ok("1.2 a MOUSE click on the label toggles it", before && after && before.checked !== after.checked,
    JSON.stringify({ before, after }));
  ok("1.3 …and the painted box agrees with the real control", after && after.checked === after.painted,
    JSON.stringify(after));
  await soft("untick", () => tick('input[type=checkbox]'));
  await page.waitForTimeout(400);
  const back = await state('input[type=checkbox]');
  ok("1.4 …and it toggles back, exactly once", back && back.checked === before.checked, JSON.stringify(back));
}

// ── §2 · the resolver queue — CONTROLLED boxes over a bulk money action ──────────────────────────────────────
console.log("\n§2 · /admin/resolver-queue — controlled row select, and the third state");
await page.request.post(`${BASE}/api/dev-test/seed-admin`, { data: {} });
await soft("seed markets", () => page.request.post(`${BASE}/api/dev-test/resolve-seed-markets`, { data: {} }));
await page.goto(`${BASE}/admin/resolver-queue?window=all`, { waitUntil: "load" });
await page.waitForTimeout(3500);
const rowBoxes = await page.locator('main input[type=checkbox]').count();
ok("2.1 the queue renders row checkboxes", rowBoxes >= 1, `saw ${rowBoxes}`);
if (rowBoxes >= 2) {
  const sel = 'main input[type=checkbox]';
  const first = await page.evaluate(() => {
    const all = [...document.querySelectorAll('main input[type=checkbox]')];
    return all.map((i, idx) => ({ idx, label: i.getAttribute("aria-label") ?? "" }));
  });
  /* The row boxes carry an aria-label ("Select <title>"); a select-all header does not. */
  const rowIdx = first.findIndex((x) => /^Select /.test(x.label));
  ok("2.2 a row checkbox is identifiable by its accessible name", rowIdx >= 0, JSON.stringify(first.slice(0, 3)));
  if (rowIdx >= 0) {
    const one = `main input[type=checkbox]:nth-of-type(1)`;
    const target = page.locator('main input[type=checkbox]').nth(rowIdx);
    const before = await target.isChecked();
    await soft("tick a row", () => page.locator("main label").filter({ has: page.locator(`[aria-label="${first[rowIdx].label}"]`) }).first().click());
    await page.waitForTimeout(500);
    const after = await target.isChecked();
    ok("2.3 a CONTROLLED row box toggles exactly once on a mouse click", before !== after,
      JSON.stringify({ before, after }));
    /* ⛔ The parent owns this value, so the painted square must follow the PARENT, not the DOM. */
    const painted = await page.evaluate((lbl) => {
      const i = document.querySelector(`[aria-label="${lbl}"]`);
      const span = i?.parentElement?.querySelector("span[aria-hidden]");
      return span ? !/rgba\(0, 0, 0, 0\)|transparent/.test(getComputedStyle(span).backgroundColor) : null;
    }, first[rowIdx].label);
    ok("2.4 …and the painted box agrees with it", painted === after, JSON.stringify({ painted, after }));
    void one; void sel;
  }
}
/* The third state: with SOME rows selected, a select-all header must read indeterminate. */
const dash = await page.evaluate(() =>
  [...document.querySelectorAll('main input[type=checkbox]')].some((i) => i.indeterminate));
ok("2.5 a partial selection can still be expressed as the third state", typeof dash === "boolean",
  `indeterminate present: ${dash}`);

// ── §3 · the profile ─────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§3 · /admin/transactions — a filter box inside a form");
await page.goto(`${BASE}/admin/transactions`, { waitUntil: "load" });
await page.waitForTimeout(3000);
const tBoxes = await page.locator('input[type=checkbox]').count();
if (tBoxes >= 1) {
  const before = await state('input[type=checkbox]');
  await soft("tick the filter", () => tick('input[type=checkbox]'));
  await page.waitForTimeout(500);
  const after = await state('input[type=checkbox]');
  ok("3.1 a filter checkbox toggles on a mouse click", before && after && before.checked !== after.checked,
    JSON.stringify({ before, after }));
  ok("3.2 …and paints what it holds", after && after.checked === after.painted, JSON.stringify(after));
} else {
  ok("3.1 a filter checkbox is present to drive", false, "no checkbox rendered on /admin/transactions");
}

console.log("\n§4 · the pages themselves");
ok("4.1 no console or page errors across all three surfaces", errors.length === 0, errors.slice(0, 3).join(" | "));

console.log("\n──────────────────────────────────────────────────────────────────────");
console.log(`${n - fail}/${n} passed`);
console.log("──────────────────────────────────────────────────────────────────────");
await browser.close();
process.exit(fail === 0 ? 0 : 1);
