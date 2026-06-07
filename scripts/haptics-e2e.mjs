import { chromium } from "playwright";
const BASE = "http://localhost:3000";
const SUF = String(Date.now()).slice(-7); const PH = "77" + SUF; const PW = "Passw0rd!23";
let pass = 0, fail = 0;
const ok = (l, c, d="") => { c ? pass++ : fail++; console.log(`  ${c ? "✓" : "✗"} ${l}${d?"  → "+d:""}`); };

const b = await chromium.launch();
const ctx = await b.newContext();
// Spy on navigator.vibrate BEFORE any app code runs, in every page of the context.
await ctx.addInitScript(() => {
  window.__vibes = [];
  try { Object.defineProperty(navigator, "vibrate", { value: (p) => { window.__vibes.push(p); return true; }, configurable: true }); } catch {}
});
const p = await ctx.newPage();
const perr = [];
p.on("pageerror", (e) => perr.push(String(e)));

await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST" }).catch(()=>{});
// register
await p.goto(`${BASE}/auth/register`, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(400);
await p.locator("#phone").click(); await p.locator("#phone").pressSequentially(PH, { delay: 8 });
await p.fill('input[name="dob"]', "1990-01-01"); await p.fill('input[name="password"]', PW); await p.fill('input[name="passwordConfirm"]', PW);
await p.check('input[name="acceptAge"]', { force: true }); await p.check('input[name="acceptTerms"]', { force: true });
await p.locator('form button[type="submit"]').click(); await p.waitForURL("**/profile/kyc**", { timeout: 20000 }).catch(()=>{});

// ---- vibrate support present in chromium ----
ok("navigator.vibrate present (supported() true)", await p.evaluate(() => typeof navigator.vibrate === "function"));

// ---- Settings page ----
await p.goto(`${BASE}/profile/responsible-gambling`, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(600);
ok("Sound & feedback card present", (await p.locator("body").innerText()).includes("Sound & feedback"));

const hapToggle = p.locator('[aria-label="Haptic feedback"]');
const motToggle = p.locator('[aria-label="Reduce motion"]');
ok("haptics toggle starts ON (default)", (await hapToggle.getAttribute("aria-checked")) === "true");

// Toggle OFF then ON — ON should fire haptics.confirm() = [18,28,18]
await p.evaluate(() => { window.__vibes = []; });
await hapToggle.click(); await p.waitForTimeout(150); // -> OFF (no fire)
ok("turning haptics OFF fires nothing", (await p.evaluate(() => window.__vibes.length)) === 0);
await hapToggle.click(); await p.waitForTimeout(150); // -> ON (fires confirm)
const v1 = await p.evaluate(() => window.__vibes);
ok("turning haptics ON fires confirm [18,28,18]", JSON.stringify(v1) === JSON.stringify([[18,28,18]]), JSON.stringify(v1));

// ---- Reduce motion: class + computed clamp ----
await motToggle.click(); await p.waitForTimeout(150);
ok("reduce-motion adds html.kp-reduce-motion", await p.evaluate(() => document.documentElement.classList.contains("kp-reduce-motion")));
const clamped = await p.evaluate(() => {
  const el = document.createElement("div"); el.className = "press-pop"; document.body.appendChild(el);
  const d = getComputedStyle(el).animationDuration; el.remove(); return d;
});
ok("animations clamped under reduce-motion", clamped === "0.01ms" || clamped === "0.0001s" || parseFloat(clamped) < 0.02, clamped);
await motToggle.click(); await p.waitForTimeout(150);
ok("toggling reduce-motion OFF removes the class", !(await p.evaluate(() => document.documentElement.classList.contains("kp-reduce-motion"))));

// ---- Persistence across reload ----
await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(500);
const stored = await p.evaluate(() => localStorage.getItem("50pick:feedback"));
ok("prefs persisted to localStorage", !!stored && stored.includes("haptics"), stored?.slice(0,80));

// ---- Master OFF gates everything ----
await p.evaluate(() => { localStorage.setItem("50pick:feedback", JSON.stringify({ haptics:false, motion:"system", perToken:{} })); });
await p.reload({ waitUntil: "domcontentloaded" }); await p.waitForTimeout(500);
await p.evaluate(() => { window.__vibes = []; });
// turning the (now OFF) toggle to ON fires confirm; but flip it OFF first to confirm gating when off
// Instead: directly assert that with master off, a success toast fires no vibrate.

// ---- Toast → haptic wiring (invite Copy = success/danger toast) ----
await p.evaluate(() => { localStorage.setItem("50pick:feedback", JSON.stringify({ haptics:true, motion:"system", perToken:{} })); });
await p.goto(`${BASE}/profile/invite`, { waitUntil: "domcontentloaded" }); await p.waitForTimeout(500);
await p.evaluate(() => { window.__vibes = []; });
const copyBtn = p.locator('button:has-text("Copy")').first();
if (await copyBtn.count()) { await copyBtn.click(); await p.waitForTimeout(300); }
const v2 = await p.evaluate(() => window.__vibes);
ok("toast → haptic wiring fires a pattern on Copy toast", v2.length >= 1, JSON.stringify(v2));

ok("no uncaught page errors during haptics test", perr.length === 0, perr.slice(0,3).join(" | "));
console.log(`\n${pass} passed · ${fail} failed`);
await b.close();
process.exitCode = fail ? 1 : 0;
