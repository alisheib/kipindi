/**
 * LOCAL drive of the kit `<Select>`'s KEYBOARD (2026-09-27) — the behaviour `test:select-keyboard` can only
 * read from source. On /profile/responsible-gambling (the break length: 1h · 24h · 1w, none disabled) it
 * presses real keys and reads, after each one, whether the list is open, which row is highlighted and the
 * form's hidden value.
 *
 *   KP_BASE=http://localhost:3031 npm run qa:select-keyboard
 *
 * Until 2026-09-27 a keyboard could not choose ANY option: the trigger re-opened the list on every key,
 * resetting the highlight, and the opening key also moved it. What must hold (APG, select-only combobox):
 *   · ArrowDown / ArrowUp / Enter / Space OPEN the list on the current value, without moving it;
 *   · while open, the arrows move one row, and Enter or Space choose it and close the list;
 *   · Escape closes it and changes nothing.
 * ⛔ Local only: it signs in through /auth/demo (404 on production), and it never submits the form — every
 * non-GET request to the page is aborted, and one would fail the run.
 */
import { chromium } from "playwright";

const BASE = process.env.KP_BASE ?? "http://localhost:3000";
if (!/^http:\/\/localhost(:\d+)?$/.test(BASE)) {
  console.error(`REFUSED — local dev only, addressed as http://localhost:PORT. KP_BASE was ${JSON.stringify(BASE)}.`);
  process.exit(2);
}
const results = [];
const ok = (name, pass, detail = "") => { results.push(!!pass); console.log(`  ${pass ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); };

const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const signIn = await b.newContext();
await (await signIn.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded" });
const state = await signIn.storageState();
await signIn.close();

for (const [w, h] of [[1280, 900], [390, 844]]) {
  console.log(`\n§ ${w}px`);
  const ctx = await b.newContext({ storageState: state, viewport: { width: w, height: h } });
  await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  /* Every non-GET to the page is aborted. ⚠️ Not every one is a submit: the page's own background server
     actions (the notifications poll among them) post to the page URL too, so only a body carrying THIS
     form's field (`period`) counts as the form being submitted — the rest are listed, not failed. */
  const submits = [], background = [];
  await ctx.route("**/*", (route) => {
    const r = route.request();
    if (r.method() !== "GET" && r.url().includes("/profile/responsible-gambling")) {
      const body = (r.postData() ?? "").slice(0, 600);
      (/(^|[^a-z])period([^a-z]|$)/i.test(body) ? submits : background).push(body.slice(0, 120));
      return route.abort();
    }
    return route.continue();
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}/profile/responsible-gambling`, { waitUntil: "domcontentloaded" });
  await page.locator("main h1, h1").first().waitFor({ timeout: 90_000 });
  await page.waitForTimeout(1500);
  const form = page.locator('form:has(input[type="hidden"][name="period"])').first();
  const combo = form.locator('[role="combobox"]').first();
  const hidden = form.locator('input[type="hidden"][name="period"]').first();
  await combo.scrollIntoViewIfNeeded();

  /** The list state as the trigger announces it: open?, the highlighted row's index, the hidden value. */
  const read = async () => ({
    ...(await combo.evaluate((el) => {
      const id = el.getAttribute("aria-activedescendant");
      const active = id ? document.getElementById(id) : null;
      const list = el.getAttribute("aria-controls") ? document.getElementById(el.getAttribute("aria-controls")) : null;
      const rows = list ? Array.from(list.querySelectorAll('[role="option"]')) : [];
      return { open: el.getAttribute("aria-expanded") === "true", row: active ? rows.indexOf(active) : -1, focused: document.activeElement === el };
    })),
    value: await hidden.inputValue(),
  });
  const press = async (key) => { await page.keyboard.press(key); await page.waitForTimeout(350); return read(); };
  const VALUES = ["1h", "24h", "1w"];

  await combo.focus();
  let s = await read();
  ok("the break length starts at 1h, closed, with the trigger focused", s.value === "1h" && !s.open && s.focused, JSON.stringify(s));

  s = await press("ArrowDown");
  ok("ArrowDown OPENS the list on the current value — it does not also move", s.open && s.row === 0, JSON.stringify(s));
  s = await press("ArrowDown");
  ok("the next ArrowDown moves one row", s.open && s.row === 1, JSON.stringify(s));
  s = await press("Enter");
  ok("Enter chooses it (1h → 24h), closes the list and keeps focus on the trigger", s.value === "24h" && !s.open && s.focused, JSON.stringify(s));

  s = await press("ArrowDown"); s = await press("ArrowDown");
  s = await press(" ");
  ok("Space chooses too (24h → 1w), and the list stays closed afterwards", s.value === "1w" && !s.open, JSON.stringify(s));
  await page.waitForTimeout(400);
  s = await read();
  ok("…still closed after the key is released (Space does not re-open it)", !s.open && s.value === "1w", JSON.stringify(s));

  s = await press("ArrowUp");
  ok("ArrowUp OPENS the list on the current value", s.open && s.row === VALUES.indexOf("1w"), JSON.stringify(s));
  s = await press("ArrowUp");
  ok("the next ArrowUp moves one row up", s.open && s.row === 1, JSON.stringify(s));
  s = await press("Escape");
  ok("Escape closes it and changes nothing (still 1w)", !s.open && s.value === "1w", JSON.stringify(s));

  s = await press("Enter");
  ok("Enter OPENS a closed list on the current value", s.open && s.row === 2, JSON.stringify(s));
  s = await press("Home");
  s = await press("Enter");
  ok("Home then Enter chooses the first option (1w → 1h)", s.value === "1h" && !s.open, JSON.stringify(s));

  ok("the form was never submitted (no request carried its `period` field)", submits.length === 0, submits.join(" | "));
  if (background.length) console.log(`  (info) ${background.length} background request(s) to the page aborted, none carrying the form`);
  ok("no page errors", errors.length === 0, errors.slice(0, 2).join(" · "));
  await ctx.close();
}
await b.close();
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
