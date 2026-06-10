// Live browser QA against a LOCAL in-memory dev server (no prod data touched).
import { chromium } from "playwright";
const BASE = process.env.BASE || "http://localhost:3009";

let pass = 0, fail = 0;
const ok = (label, cond, extra = "") => { if (cond) { pass++; console.log(`PASS ${label}`); } else { fail++; console.log(`FAIL ${label} ${extra}`); } };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); // mobile
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text();
  // React dev-mode emits an eval()/CSP warning that is not a real app error.
  if (t.includes("eval()") || t.includes("unsafe-eval") || t.includes("React will never use eval")) return;
  consoleErrors.push(t);
});
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));

// ── 1. Date field: type into DOB on /auth/register ──────────────────
await page.goto(`${BASE}/auth/register`, { waitUntil: "domcontentloaded" });
const day = page.getByLabel("Day");
await day.waitFor({ state: "visible", timeout: 20000 });
await page.waitForTimeout(500); // let hydration attach handlers
await day.click();
await page.keyboard.type("10051990", { delay: 60 }); // d=10 m=05 y=1990 with auto-advance
const dval = await page.getByLabel("Day").inputValue();
const mval = await page.getByLabel("Month").inputValue();
const yval = await page.getByLabel("Year").inputValue();
ok(`DOB typed "10051990" -> ${dval}/${mval}/${yval}`, dval === "10" && mval === "05" && yval === "1990");

// reset and test the exact reported bug: type "1" then "0" -> must be "10"
await page.getByLabel("Day").click();
await page.keyboard.press("Control+A"); await page.keyboard.press("Backspace");
await page.getByLabel("Month").click(); await page.keyboard.press("Control+A"); await page.keyboard.press("Backspace");
await page.getByLabel("Year").click(); await page.keyboard.press("Control+A"); await page.keyboard.press("Backspace");
await page.getByLabel("Day").click();
await page.keyboard.type("1", { delay: 80 });
const after1 = await page.getByLabel("Day").inputValue();
await page.keyboard.type("0", { delay: 80 });
const after10 = await page.getByLabel("Day").inputValue();
ok(`type "1" shows "1" (not "01")`, after1 === "1", `got "${after1}"`);
ok(`type "1" then "0" shows "10" (not "01")`, after10 === "10", `got "${after10}"`);

// Clear all, then test backspace deterministically.
for (const lbl of ["Day", "Month", "Year"]) { await page.getByLabel(lbl).click(); await page.keyboard.press("Control+A"); await page.keyboard.press("Backspace"); }
// Type a single non-advancing digit into Day (caret ends at end), backspace deletes it.
await page.getByLabel("Day").click();
await page.keyboard.type("1");
await page.keyboard.press("Backspace");
ok(`backspace deletes within segment -> ""`, (await page.getByLabel("Day").inputValue()) === "");
// Hop: type "10" (auto-advances to Month), backspace on empty Month hops back to Day.
await page.keyboard.type("10");
const monthFocused = await page.getByLabel("Month").evaluate((el) => document.activeElement === el);
await page.keyboard.press("Backspace"); // empty Month -> hop to Day
const dayFocusedAfterHop = await page.getByLabel("Day").evaluate((el) => document.activeElement === el);
ok(`"10" auto-advances to Month`, monthFocused);
ok(`backspace on empty Month hops to Day`, dayFocusedAfterHop && (await page.getByLabel("Day").inputValue()) === "10");

// ── 2. Markets page: default + New tab, demo hidden ─────────────────
await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded" });
const bodyDefault = await page.locator("body").innerText();
ok(`/markets renders (has 'Markets')`, bodyDefault.includes("Markets") || bodyDefault.includes("Soko"));
ok(`/markets hides demo polls`, !bodyDefault.includes("Demo ·"), `found Demo ·`);
ok(`/markets shows 'New' tab`, bodyDefault.includes("New") && bodyDefault.includes("Mpya"));

await page.goto(`${BASE}/markets?when=new`, { waitUntil: "domcontentloaded" });
const bodyNew = await page.locator("body").innerText();
ok(`/markets?when=new renders, no demos`, !bodyNew.includes("Demo ·"));
// New pill active (aria-current or active styling) — check it exists & is a link
const newPill = page.getByRole("link", { name: /New/ }).first();
ok(`New pill present`, await newPill.count() > 0);

// ── 3. Footer support email present on a public page ────────────────
ok(`footer shows msaada@50pick.co.tz`, bodyNew.includes("msaada@50pick.co.tz"));

// ── 4. Console errors ───────────────────────────────────────────────
ok(`no console/page errors (${consoleErrors.length})`, consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

console.log(`\n${fail === 0 ? "ALL LIVE CHECKS PASS" : "SOME FAILED"} — ${pass} passed, ${fail} failed`);
await browser.close();
if (fail) process.exit(1);
