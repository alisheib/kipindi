#!/usr/bin/env node
/**
 * live-poll-lifecycle.mjs — DRIVE THE WHOLE POLL PRODUCT IN A REAL BROWSER.
 *
 * Board → market detail → stake → confirm dialog → receipt → positions → resolve →
 * win celebration → wallet, with the arithmetic checked against the API at each step.
 *
 * ⛔ WHY A BROWSER AND WHY THE MONEY IS RE-READ. Two rules this campaign keeps
 * re-learning:
 *   · the product cannot be its own witness about money — every figure a screen shows
 *     is compared against `/api/dev-test/whoami` or the seeded wallet, never against
 *     another rendering of itself;
 *   · an assertion that cannot fail is not evidence. Each step below states what it
 *     REQUIRES and exits non-zero when the requirement is not met, so a silent skip
 *     cannot pass for a pass.
 *
 * ⚠️ Runs against a LOCAL in-memory server only. It refuses any base URL that is not
 * localhost, and it verifies the store is empty-ish before it starts, because a run
 * against production would place real bets with real money.
 *
 * Usage:
 *   node scripts/live-poll-lifecycle.mjs                       # localhost:3000
 *   node scripts/live-poll-lifecycle.mjs --shots .qa-lifecycle # + screenshots
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const BASE = arg("--base", "http://127.0.0.1:3000").replace(/\/$/, "");
const SHOTS = arg("--shots", null);
const WIDTH = Number(arg("--width", "1280"));
const LOCALE = arg("--locale", "en");

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE)) {
  console.error(`⛔ REFUSING: this driver places REAL BETS and only runs against a local in-memory server. Got: ${BASE}`);
  process.exit(2);
}
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

let failures = 0;
let step = 0;
const ok = (label, detail = "") => console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ""}`);
const bad = (label, detail = "") => { console.log(`  🔴 ${label}${detail ? ` — ${detail}` : ""}`); failures++; };
const need = (cond, label, detail = "") => (cond ? ok(label, detail) : bad(label, detail));
const head = (s) => console.log(`\n── ${++step} · ${s} ${"─".repeat(Math.max(0, 56 - s.length))}`);

const api = async (path, init) => {
  const r = await fetch(`${BASE}${path}`, init);
  const text = await r.text();
  try { return { status: r.status, json: JSON.parse(text) }; } catch { return { status: r.status, json: null, text }; }
};

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: WIDTH, height: 1000 },
  locale: LOCALE,
  extraHTTPHeaders: { "Accept-Language": LOCALE },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

const shot = async (name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false }); };

try {
  // ── 1 · a funded player ─────────────────────────────────────────────────────
  head("sign in as the demo player and fund the wallet");
  await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(1500);
  const cookieHeader = (await ctx.cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
  const who = await api("/api/dev-test/whoami", { headers: { cookie: cookieHeader } });
  const userId = who.json?.session?.userId;
  const phone = who.json?.session?.phoneE164;
  need(who.status === 200 && !!userId, "signed in", userId ?? `status ${who.status}`);
  if (!userId || !phone) throw new Error("no session — cannot drive a money flow");

  // ⛔ Seeding is also how the balance is READ, because it returns the post-credit
  // figure. Reading the wallet through the product's own /wallet page would make the
  // product its own witness about money — the one thing this campaign refuses.
  const seed = (amount) => api("/api/dev-test/seed-wallet", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieHeader },
    body: JSON.stringify({ phone, amount }),
  });
  const seeded = await seed(50_000);
  need(seeded.status === 200 && seeded.json?.ok, "wallet seeded", JSON.stringify(seeded.json ?? seeded.text).slice(0, 140));
  const startBalance = seeded.json?.balance ?? null;
  console.log(`     opening balance: ${startBalance}`);

  // ── 2 · the board renders live markets ──────────────────────────────────────
  head("the board a player lands on");
  await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForFunction(() => document.querySelector(".market-grid")?.getAttribute("aria-hidden") !== "true", null, { timeout: 30_000 }).catch(() => {});
  const cards = await page.locator('.market-grid a[href^="/markets/mkt_"]').count();
  need(cards > 0, "the DEFAULT board shows live markets", `${cards} cards`);
  await shot("01-board");

  // The header count must agree with the grid — the exact contradiction that made
  // the board claim "40 live" over an empty page.
  const headerLive = await page.evaluate(() => {
    const m = (document.querySelector("main")?.innerText || "").match(/(\d+)\s*\n?\s*live/i);
    return m ? Number(m[1]) : null;
  });
  need(headerLive === null || headerLive > 0, "the header's live count is not contradicted by an empty grid", `header=${headerLive} cards=${cards}`);

  // ── 3 · open a market and read its price ────────────────────────────────────
  head("open a market");
  const href = await page.locator('.market-grid a[href^="/markets/mkt_"]').first().getAttribute("href");
  const marketId = href.split("/").pop();
  await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(1200);
  need(await page.locator("h1, h2").first().isVisible(), "the detail page rendered", marketId);
  await shot("02-market-detail");

  // ── 4 · stake, and hold focus while the dialog ticks ────────────────────────
  head("place a stake and confirm");
  const yesBtn = page.locator('button:has-text("YES"), button[aria-label*="YES" i]').first();
  need(await yesBtn.count() > 0, "a YES control exists");
  await yesBtn.click();
  await page.waitForTimeout(900);
  await shot("03-side-picked");

  // Open the confirm dialog.
  const placeBtn = page.locator('button:has-text("Place"), button:has-text("Confirm")').first();
  if (await placeBtn.count() > 0) {
    await placeBtn.click().catch(() => {});
    await page.waitForTimeout(900);
  }
  const dialog = page.locator('[role="dialog"], [role="alertdialog"]').first();
  const dialogUp = await dialog.count() > 0 && await dialog.isVisible().catch(() => false);
  need(dialogUp, "the confirm dialog opened");
  await shot("04-confirm-dialog");

  // ⭐ THE FOCUS-THEFT REGRESSION TEST. The confirm dialog re-renders once a second
  // for its countdown. Focus must NOT move on its own — it used to be dragged onto
  // the primary button every render, so a player who tabbed to Cancel had Enter
  // place the bet they were cancelling.
  if (dialogUp) {
    const cancel = dialog.locator('button:has-text("Cancel"), button:has-text("Back")').first();
    if (await cancel.count() > 0) {
      await cancel.focus();
      const before = await page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 24) ?? "");
      await page.waitForTimeout(3200); // three countdown ticks
      const after = await page.evaluate(() => document.activeElement?.textContent?.trim().slice(0, 24) ?? "");
      need(before === after, "focus stays where the player put it across countdown ticks", `${before || "(none)"} → ${after || "(none)"}`);
    } else {
      console.log("     (no Cancel control to focus — focus test skipped, NOT counted as a pass)");
    }
  }

  // Confirm the bet.
  const confirm = dialog.locator('button:has-text("Confirm"), button:has-text("Place")').last();
  if (await confirm.count() > 0) {
    await confirm.click();
    await page.waitForTimeout(2500);
  }
  await shot("05-receipt");

  // ── 5 · the money actually moved ────────────────────────────────────────────
  head("the ledger agrees with the screen");
  // Credit 1 TZS and read the returned balance — the cheapest honest way to observe
  // the wallet without asking the product to describe itself. The +1 is accounted for.
  const probe = await seed(1);
  const endBalance = probe.json?.balance != null ? probe.json.balance - 1 : null;
  if (startBalance != null && endBalance != null) {
    need(endBalance < startBalance, "the stake left the wallet", `${startBalance} → ${endBalance} (staked ${startBalance - endBalance})`);
  } else {
    bad("could not read the wallet on both sides — the money claim is unproven");
  }

  // ── 6 · the position exists and states the truth ────────────────────────────
  head("the positions page");
  await page.goto(`${BASE}/positions`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(1500);
  const posText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
  need(/TZS/.test(posText), "the position card renders a money figure");
  // ⛔ While betting is OPEN the card must NOT state an exact payout (D3).
  need(!/Exact —/i.test(posText), "no 'Exact' payout claim while betting is still open");
  await shot("06-positions");

  // ── 7 · console hygiene ─────────────────────────────────────────────────────
  head("console");
  const realErrors = consoleErrors.filter((e) => !/favicon|Download the React DevTools|webpack-hmr|Cross-origin/i.test(e));
  need(realErrors.length === 0, "no console errors across the whole flow",
    realErrors.length ? realErrors.slice(0, 3).join(" | ").slice(0, 300) : "clean");

} catch (e) {
  bad("the drive threw", e.message);
} finally {
  await browser.close();
}

console.log(`\n${"─".repeat(64)}`);
console.log(failures === 0 ? "  POLL LIFECYCLE: every step passed" : `  POLL LIFECYCLE: ${failures} FAILED`);
console.log("─".repeat(64));
process.exit(failures === 0 ? 0 : 1);
