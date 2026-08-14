/**
 * Batch-4 local bootstrap — ONE reproducible sequence for the in-memory dev store (:3009).
 *
 * Order matters and each step is verified by reading state BACK, never by trusting a status code:
 *   1. seed the markets
 *   2. set `objectionWindowHours` = 0 through the REAL /admin/config form (needs
 *      DISABLE_ADMIN_TOTP=true at boot, or /admin/* client-redirects to /admin/2fa/setup)
 *   3. fund a deliberately VARIED spread, leaving a tail cold so the cold-start branch stays live
 *   4. build ONE market at EXACTLY 8,000/8,000 — a REAL 50%, distinguishable from an empty one
 *   5. resolve, and assert on the per-market `state`, because the response's own `resolved: N`
 *      counts ATTEMPTS: it reported 6 while only 2 markets reached `complete`.
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3009";
const post = async (p, b) => {
  const r = await fetch(`${BASE}${p}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: b === undefined ? undefined : JSON.stringify(b),
  });
  const t = await r.text();
  try { return { status: r.status, json: JSON.parse(t) }; } catch { return { status: r.status, text: t.slice(0, 300) }; }
};

// ── 1 · markets ───────────────────────────────────────────────────────────────────────────────
await post("/api/dev-test/seed-real-markets");
const seed = await post("/api/dev-test/seed-markets");
const ids = (seed.json?.ids ?? []).map((x) => x.id);
console.log(`1 · markets seeded: ${ids.length}`);
if (ids.length < 14) throw new Error(`too few markets (${ids.length}) to fund a spread and keep a cold tail`);

// ── 2 · objection window = 0, through the real form ───────────────────────────────────────────
const adm = await fetch(`${BASE}/api/dev-test/seed-admin`, { method: "POST" });
const sc = adm.headers.getSetCookie?.() ?? [];
const raw = sc.map((c) => c.split(";")[0]).find((c) => c.startsWith("kp_session="));
if (!raw) throw new Error("no kp_session from seed-admin");
const cname = raw.slice(0, raw.indexOf("=")), cval = raw.slice(raw.indexOf("=") + 1);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addCookies([{ name: cname, value: cval, url: BASE }]);
const page = await ctx.newPage();
await page.goto(`${BASE}/admin/config`, { waitUntil: "load" });
await page.waitForTimeout(1500);
if (!page.url().includes("/admin/config")) {
  throw new Error(`redirected to ${page.url()} — boot with DISABLE_ADMIN_TOTP=true`);
}
const field = page.locator('input[name="objectionWindowHours"]');
await field.waitFor({ state: "visible", timeout: 20000 });
const before = await field.inputValue();
await field.fill("0");
const form = page.locator("form").filter({ has: page.locator('input[name="objectionWindowHours"]') }).first();
const submit = form.locator('button[type="submit"]').first();
if (await submit.isDisabled()) throw new Error(`submit disabled: ${await submit.getAttribute("title")}`);
await submit.click();
await page.waitForTimeout(2500);
await page.goto(`${BASE}/admin/config`, { waitUntil: "load" });
await page.waitForTimeout(1200);
const after = await page.locator('input[name="objectionWindowHours"]').inputValue();
if (after !== "0") throw new Error(`objection window did NOT persist: "${before}" -> "${after}"`);
console.log(`2 · objectionWindowHours: ${before} -> ${after} (read back from a fresh render)`);
await browser.close();

// ── 3 · a varied spread, cold tail preserved ──────────────────────────────────────────────────
const spread = [
  { n: 24, yesRatio: 0.71, stake: 5000 }, { n: 18, yesRatio: 0.28, stake: 2000 },
  { n: 12, yesRatio: 0.55, stake: 10000 }, { n: 31, yesRatio: 0.84, stake: 1000 },
  { n: 9, yesRatio: 0.12, stake: 25000 }, { n: 15, yesRatio: 0.63, stake: 3000 },
  { n: 21, yesRatio: 0.39, stake: 1500 }, { n: 6, yesRatio: 0.5, stake: 50000 },
  { n: 27, yesRatio: 0.77, stake: 2500 }, { n: 11, yesRatio: 0.22, stake: 8000 },
  { n: 19, yesRatio: 0.91, stake: 1000 }, { n: 14, yesRatio: 0.46, stake: 4000 },
];
// Fund from the END of the list so the markets resolve-seed-markets consumes (it takes the first N)
// are not the ones carrying the spread — otherwise the spread is destroyed by settlement.
const fundIds = ids.slice(-spread.length - 1);

// ⚠️ `userPrefix` IS TRUNCATED TO TWO CHARACTERS. `ensureStressUsers` does
// `safePrefix.padEnd(2,"0").slice(0,2)` before building the phone number, so `b4s0`…`b4s11` ALL
// collapse to "b4" and share ONE pool of synthetic users — they then run out of wallet and later
// bets are REJECTED. Measured: the 8,000/8,000 control's NO pass landed 0 because its users had
// already spent their balance on the YES pass. So every call gets a prefix unique in its FIRST
// TWO characters, and `accepted` is asserted — `poolMath: "PASS"` only proves the delta matches
// the bets that WERE accepted, so it stays green while half the bets are silently refused.
const TAG = "0123456789ab";
let funded = 0, total = 0;
for (let i = 0; i < spread.length; i++) {
  const s = spread[i];
  const r = await post("/api/dev-test/stress-bulk-bet", { marketId: fundIds[i], n: s.n, yesRatio: s.yesRatio, stake: s.stake, userPrefix: `s${TAG[i]}` });
  const j = r.json ?? {};
  if (r.status !== 200 || j.poolMath !== "PASS") throw new Error(`[${i}] HTTP ${r.status} poolMath=${j.poolMath}`);
  if (j.accepted !== s.n) throw new Error(`[${i}] only ${j.accepted}/${s.n} bets accepted — top errors: ${JSON.stringify(j.topErrors)}`);
  funded++; total += Number(j.marketYesPool) + Number(j.marketNoPool);
}
console.log(`3 · funded ${funded}/${spread.length} markets · Σ pool on them ${total.toLocaleString()} TZS · cold tail kept`);
if (funded !== spread.length) throw new Error("not every spread market funded");

// ── 4 · the 8,000 / 8,000 control ─────────────────────────────────────────────────────────────
// ⚠️ `yesRatio` is PROBABILISTIC (`Math.random() < yesRatio`, route.ts:138), so 0.5 does NOT split
// 8 bets 4/4 — measured, it gave 6000/10000. Only the extremes are deterministic: `1` is always
// YES, `0` always NO (random() is [0,1)). So the control is built as two one-sided passes.
const controlId = fundIds[spread.length];
const cy = await post("/api/dev-test/stress-bulk-bet", { marketId: controlId, n: 4, yesRatio: 1, stake: 2000, userPrefix: "yc" });
if (cy.json?.accepted !== 4) throw new Error(`control YES pass accepted ${cy.json?.accepted}/4`);
const ctl = await post("/api/dev-test/stress-bulk-bet", { marketId: controlId, n: 4, yesRatio: 0, stake: 2000, userPrefix: "nc" });
if (ctl.json?.accepted !== 4) throw new Error(`control NO pass accepted ${ctl.json?.accepted}/4`);
const cj = ctl.json ?? {};
console.log(`4 · control ${controlId}: yes=${cj.marketYesPool} no=${cj.marketNoPool} poolMath=${cj.poolMath}`);
if (Number(cj.marketYesPool) !== 8000 || Number(cj.marketNoPool) !== 8000) {
  throw new Error(`control is NOT exactly 8000/8000 — got ${cj.marketYesPool}/${cj.marketNoPool}`);
}
console.log("    → a REAL 50%, not an absent one");

// ── 5 · settle, and assert on state, not on `resolved` ────────────────────────────────────────
const res = await post("/api/dev-test/resolve-seed-markets", { markets: 8, bettors: 8, stake: 5000 });
const ms = res.json?.markets ?? [];
const byState = {};
for (const m of ms) byState[m.state] = (byState[m.state] ?? 0) + 1;
const complete = ms.filter((m) => m.state === "complete").length;
console.log(`5 · resolve claims resolved=${res.json?.resolved} · ACTUAL states ${JSON.stringify(byState)} · complete=${complete}/${ms.length}`);
if (complete === 0) throw new Error("no market reached `complete` — the settled strip would be empty");

console.log(`\nBOARD READY · control=${controlId}`);
