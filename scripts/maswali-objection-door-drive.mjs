/**
 * qa:maswali-objection-door — THE TICKET PAGE'S OBJECTION DOOR, EVERY STATE, AT EVERY WIDTH, IN EVERY LANGUAGE
 * (MASWALI-BUILD S7-OB; MASWALI-PLAN §3 MR-16, MB-23).
 *
 *   BASE=http://localhost:3531 node scripts/maswali-objection-door-drive.mjs
 *       (a FRESH in-memory `next dev`, FEATURE_MILLIONEA=ACTIVE, MASWALI_SCHEDULER=false, LIFECYCLE_TICKER=false)
 *
 * The seed (`/api/dev-test/seed-maswali-objections`, step "door") gives the demo player three tickets:
 *   none    a week whose objection window is open, nothing objected to: the door's invitation and its dialog;
 *   mixed   a week whose window is open, the player's objections in every state — with an officer (M3), upheld with each
 *           remedy (M4 reversed, M5 voided, M7 reinstated) — and the dialog offering only the questions left;
 *   closed  a week whose window has closed (a declared fixture of time), the player's objection not upheld (M2), with the
 *           officer's note.
 * Driven on `none`, in English: the button waits for a question and ten characters; Enter in the words is a new line and
 * never files; the objection files, the toast says the week's payout waits, and the door then reads it "with an officer"
 * while its question leaves the picker.
 * Tiles: each state's door at 320 / 360 / 768 / 1280 / 1920 × sw / en / zh (scrolled to the door), and the dialog open at
 * each. Asserted, not eyeballed: 200, `<html lang>` = the cookie, no horizontal overflow, no page error, the door's own
 * words in the reader's language, and every instant it draws one kept run, its weekday with its clock and nothing invisible
 * slipped into the words (S7-SHIP, 2026-10-23). ⛔ Localhost and the in-memory store only. Tiles in `.50pick-shots/maswali/door/`.
 * ⚠️ No backslash escape for a slash, a word boundary or a control character anywhere in this file (`test:source-bytes`).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { demoSession, LOCALE_COOKIE } from "./live/journey-pass.mjs";

const BASE = process.env.BASE || "http://localhost:3531";
if (!/^http:[/][/]localhost(:[0-9]+)?$/.test(BASE)) { console.error("refusing: BASE must be a localhost dev server"); process.exit(2); }
{
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null);
  if (!health || health.database?.configured !== false) { console.error(`refusing: ${BASE} does not report the in-memory store`); process.exit(2); }
  if (health.millionea?.state !== "ACTIVE") { console.error(`refusing: /api/health says millionea = ${JSON.stringify(health.millionea)} — start it with FEATURE_MILLIONEA=ACTIVE`); process.exit(2); }
}
const OUT = ".50pick-shots/maswali/door";
mkdirSync(OUT, { recursive: true });
const WIDTHS = [320, 360, 768, 1280, 1920];
const LOCALES = ["sw", "en", "zh"];
const HEIGHT = 780;

let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) pass++; else fail++; console.log(`${c ? "PASS" : "FAIL"} ${n}${e ? ` — ${e}` : ""}`); return !!c; };
const clip = (s, n = 300) => String(s ?? "").replace(/[ ]+/g, " ").trim().slice(0, n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 30_000, every = 250) {
  const end = Date.now() + ms;
  for (;;) {
    try { const v = await fn(); if (v) return v; } catch { /* between renders */ }
    if (Date.now() > end) return null;
    await sleep(every);
  }
}

/** The door's own words in each language — the dictionary's, restated as what a reader must see. */
const WORDS = {
  en: { title: "Think a result is wrong?", mine: "Your objections", button: "Object to a result", closed: "The objection window closed",
    open: "With an officer", reversed: "Upheld · the result is now NO", voided: "Upheld · the question is void; a reserve takes its place",
    reinstated: "Upheld · the question counts again, with the result YES", rejected: "Not upheld · the result stands", note: "The officer's note:",
    dialog: "Object to a result", filed: "Objection filed — the week's payout waits until an officer decides." },
  sw: { title: "Unadhani matokeo fulani si sahihi?", mine: "Mapingamizi yako", button: "Pinga matokeo", closed: "Dirisha la pingamizi lilifungwa",
    open: "Liko kwa afisa", reversed: "Limekubaliwa · matokeo sasa ni HAPANA", voided: "Limekubaliwa · swali ni batili; akiba inachukua nafasi yake",
    reinstated: "Limekubaliwa · swali linahesabiwa tena, matokeo yakiwa NDIO", rejected: "Halikukubaliwa · matokeo yanabaki", note: "Maelezo ya afisa:",
    dialog: "Pinga matokeo" },
  zh: { title: "认为某个结果有误？", mine: "您的异议", button: "对结果提出异议", closed: "异议窗口已于", open: "审核中",
    reversed: "已采纳 · 结果现为否", voided: "已采纳 · 该题作废，由备选题替补", reinstated: "已采纳 · 该题重新计入，结果为是",
    rejected: "未采纳 · 结果维持不变", note: "审核官说明：", dialog: "对结果提出异议" },
};

const browser = await chromium.launch();
const session = await demoSession(browser, BASE);
const seedCtx = await browser.newContext();
const seed = await seedCtx.request.post(`${BASE}/api/dev-test/seed-maswali-objections`, { data: { step: "door" }, timeout: 300_000 });
const seeded = await seed.json().catch(() => ({}));
ok("0 · the demo player's three tickets, seeded through the product's doors", seed.ok() && seeded.ok === true, clip(JSON.stringify(seeded), 300));
if (!seeded.ok) { await browser.close(); console.log(`${String.fromCharCode(10)}maswali-objection-door: ${pass} passed, ${fail} failed`); process.exit(1); }
const T = seeded.tickets;

async function reader(locale) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: HEIGHT } });
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }, { ...session, url: BASE, domain: undefined, path: undefined }]);
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(180_000);
  page.setDefaultTimeout(30_000);
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  return { ctx, page, errs };
}
async function open(r, serial) {
  const res = await r.page.goto(`${BASE}/millionea/tickets/${serial}`, { waitUntil: "load" });
  await r.page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {});
  await r.page.evaluate(async () => { await document.fonts.ready; }).catch(() => {});
  return res;
}
const door = (r) => r.page.getByTestId("maswali-objection-door");
async function tiles(r, name, focus) {
  for (const width of WIDTHS) {
    await r.page.setViewportSize({ width, height: HEIGHT });
    await sleep(300);
    await focus().scrollIntoViewIfNeeded().catch(() => {});
    const over = await r.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`${name} @${width} · no horizontal overflow`, over <= 1, `overflow=${over}px`);
    await r.page.screenshot({ path: `${OUT}/${name}-${width}.png`, fullPage: false, caret: "initial" });
  }
  await r.page.setViewportSize({ width: 1280, height: HEIGHT });
}

for (const locale of LOCALES) {
  const w = WORDS[locale];
  const r = await reader(locale);
  for (const state of ["none", "mixed", "closed"]) {
    const res = await open(r, T[state]);
    ok(`${state} · ${locale} · answers 200`, res?.status() === 200, `${res?.status()}`);
    ok(`${state} · ${locale} · html lang is ${locale}`, (await r.page.locator("html").getAttribute("lang")) === locale);
    const text = (await door(r).count()) === 1 ? await door(r).innerText() : "";
    if (state === "none") {
      ok(`none · ${locale} · the invitation: its title, the window's end and the button, and no objection listed`,
        text.includes(w.title) && text.includes(w.button) && !text.includes(w.mine), clip(text));
    } else if (state === "mixed") {
      ok(`mixed · ${locale} · every state of the player's objections, in the reader's words`,
        text.includes(w.title) && text.includes(w.open) && text.includes(w.reversed) && text.includes(w.voided) && text.includes(w.reinstated) && text.includes(w.note), clip(text, 600));
    } else {
      ok(`closed · ${locale} · the window closed, no button, the objection not upheld with the officer's note`,
        text.includes(w.mine) && text.includes(w.closed) && text.includes(w.rejected) && text.includes(w.note) && !text.includes(w.button), clip(text, 400));
    }
    // ⭐ Every instant the door draws is ONE kept run (DESIGN_AUTHORITY §M8a item 24: a clock with its day): each
    // "<weekday> <clock>" sits whole inside one `.whitespace-nowrap` run, and nothing invisible is slipped into the words to
    // hold it (`test:visual-pass-r5e` 6.5) — the window's end in every state, and M3's filing time beside it in "mixed".
    const instants = (await door(r).count()) === 1 ? await door(r).evaluate((el) => {
      const words = el.textContent ?? "";
      const clocks = (words.match(/[0-9]{1,2}:[0-9]{2}/g) ?? []).length;
      const whole = [...el.querySelectorAll(".whitespace-nowrap")]
        .reduce((n, run) => n + ((run.textContent ?? "").match(/[^ ]+ [0-9]{1,2}:[0-9]{2}/g) ?? []).length, 0);
      const slipped = [0xa0, 0x2060, 0x200b, 0x202f].filter((c) => words.includes(String.fromCharCode(c))).map((c) => c.toString(16));
      return { clocks, whole, slipped };
    }) : null;
    const drawn = state === "mixed" ? 2 : 1;
    ok(`${state} · ${locale} · every instant the door draws (${drawn}) is one kept run — its weekday held to its clock, nothing slipped into the words`,
      instants !== null && instants.clocks === drawn && instants.whole === drawn && instants.slipped.length === 0, JSON.stringify(instants));
    await tiles(r, `door-${state}-${locale}`, () => door(r));
    if (state !== "closed") {
      await r.page.getByRole("button", { name: w.button }).click();
      const dialog = r.page.getByRole("dialog");
      await until(() => dialog.count());
      ok(`${state} · ${locale} · the dialog opens on its title`, (await dialog.innerText()).includes(w.dialog));
      await dialog.getByRole("combobox").first().click();
      const options = await r.page.getByRole("option").allInnerTexts();
      ok(`${state} · ${locale} · the picker offers the questions left: ${state === "none" ? 15 : 11}`, options.length === (state === "none" ? 15 : 11),
        JSON.stringify(options.slice(0, 4)));
      await r.page.keyboard.press("Escape");
      await tiles(r, `dialog-${state}-${locale}`, () => dialog);
      await r.page.keyboard.press("Escape");
      await until(async () => (await r.page.getByRole("dialog").count()) === 0, 10_000);
    }
  }
  ok(`${locale} · no page error`, r.errs.length === 0, r.errs.slice(0, 3).join(" | "));
  await r.ctx.close();
}

// ── Driven, in English: an objection filed from the door ─────────────────────────────────────────────────────────
{
  const r = await reader("en");
  await open(r, T.none);
  await r.page.getByRole("button", { name: WORDS.en.button }).click();
  const dialog = r.page.getByRole("dialog");
  await until(() => dialog.count());
  const submit = dialog.getByRole("button", { name: "Submit objection" });
  ok("F.1 · the button waits for a question and the words", await submit.isDisabled());
  await dialog.getByRole("combobox").first().click();
  await r.page.getByRole("option", { name: /^M6 · / }).click();
  const words = dialog.locator("textarea");
  await words.fill("Too short");
  ok("F.2 · nine characters are not enough", await submit.isDisabled());
  await words.press("Enter");
  ok("F.3 · Enter in the words is a new line: nothing is filed, the dialog stays", (await dialog.count()) === 1 && (await words.inputValue()).includes(String.fromCharCode(10)));
  await words.fill("The official source lists event 6 as postponed to next week, not played.");
  ok("F.4 · the button arms on a question and ten characters", await submit.isEnabled());
  await submit.click();
  ok("F.5 · ⭐ it files: the toast says the week's payout waits until an officer decides", !!(await until(() => r.page.getByText(WORDS.en.filed).count(), 30_000)));
  const after = await until(async () => {
    const t = await door(r).innerText();
    return t.includes(WORDS.en.mine) || /M6 · With an officer/.test(t) ? t : null;
  }, 60_000);
  ok("F.6 · the door now reads M6 with an officer", !!after && /M6 · With an officer · filed/.test(after), clip(after ?? "", 300));
  await r.page.getByRole("button", { name: WORDS.en.button }).click();
  await until(() => r.page.getByRole("dialog").count());
  await r.page.getByRole("dialog").getByRole("combobox").first().click();
  const left = await r.page.getByRole("option").allInnerTexts();
  ok("F.7 · M6 has left the picker: one objection per question", left.length === 14 && !left.some((x) => x.startsWith("M6 ")), JSON.stringify(left.slice(0, 6)));
  await r.page.keyboard.press("Escape");
  await r.page.keyboard.press("Escape");
  await tiles(r, "door-filed-en", () => door(r));
  ok("F · no page error", r.errs.length === 0, r.errs.slice(0, 3).join(" | "));
  await r.ctx.close();
}

await browser.close();
console.log(`${String.fromCharCode(10)}maswali-objection-door: ${pass} passed, ${fail} failed · tiles in ${OUT}/`);
process.exit(fail === 0 ? 0 : 1);
