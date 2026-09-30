/**
 * LOCAL-ONLY end-to-end drive of S2 — short titles and competition (the Vodacom plan, `docs/VODACOM-PLAN.md`).
 * Reads every state from the PAGE, in a real browser, through the real controls:
 *   §1 the Owner saves three short titles on a seeded market → they persist across a reload;
 *   §2 a Swahili short title not in the "Je, …?" form is refused beside its own field, and nothing is saved;
 *   §3 the create wizard offers the short-title fields;
 *   §4 the drafts tab on /admin/ai-polls drafts short titles for open markets (mock AI) and one is approved;
 *   §5 players see NOTHING new: the market's card on /markets still shows its full title (S2 changes no player surface);
 *   §6 no page error anywhere.
 * Viewport tiles (never full-page) go to KP_SHOTS.
 *
 *   KP_BASE=http://localhost:PORT KP_SHOTS=<dir> npm run qa:short-titles
 *
 * ⛔ Refuses anything but `http://localhost:PORT` on an IN-MEMORY dev server (`DISABLE_ADMIN_TOTP=true`).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.KP_BASE ?? "http://localhost:3000";
if (!/^http:\/\/localhost(:\d+)?$/.test(BASE)) {
  console.error(`REFUSED — local dev only, addressed as http://localhost:PORT. KP_BASE was ${JSON.stringify(BASE)}.`);
  process.exit(2);
}
{
  const body = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null);
  if (!body || body.database?.configured !== false) {
    console.error(`REFUSED — ${BASE} reports a configured database; this drive runs only against an in-memory dev server.`);
    process.exit(2);
  }
}
const SHOTS = process.env.KP_SHOTS ?? ".qa-short-titles";
mkdirSync(SHOTS, { recursive: true });
const results = [];
const ok = (name, pass, detail = "") => { results.push(!!pass); console.log(`  ${pass ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };
const skip = (name, why) => console.log(`  ⚠ SKIP ${name} — ${why}`);
const errors = [];

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const seeded = await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000001" } });
ok("0.1 the Owner is seeded and signed in", seeded.ok(), String(seeded.status()));
const sm = await ctx.request.post(`${BASE}/api/dev-test/seed-markets`);
ok("0.2 demo markets are seeded", sm.ok(), String(sm.status()));
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(`owner: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error" && !/favicon|404/.test(m.text())) errors.push(`owner console: ${m.text().slice(0, 200)}`); });
const settle = async (p = page) => { await p.waitForLoadState("domcontentloaded"); await p.locator("main").first().waitFor({ timeout: 120_000 }); await p.waitForTimeout(1000); };
const tile = (name, p = page) => p.screenshot({ path: `${SHOTS}/${name}.png` });

console.log(`qa:short-titles — ${BASE}\n\n§1 · the Owner saves short titles`);
await page.goto(`${BASE}/admin/markets`, { waitUntil: "domcontentloaded" }); await settle();
const href = await page.locator('a[href^="/admin/markets/mkt_"]').first().getAttribute("href").catch(() => null);
ok("1.0 a seeded market is listed on /admin/markets", !!href, String(href));
const marketId = href ? href.split("/").pop() : "";
await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" }); await settle();
const fullTitle = (await page.locator("main h1").first().innerText().catch(() => "")).trim();
const control = page.getByText("Card short titles").first();
ok("1.1 the market page shows the 'Card short titles' control", (await control.count()) > 0);
await control.scrollIntoViewIfNeeded().catch(() => {});
await tile("1-control-empty-1280");
const en = page.getByLabel("English short title");
const sw = page.getByLabel("Swahili short title");
const zh = page.getByLabel(/Chinese short title/);
await en.fill("Will it happen before the deadline?");
await sw.fill("Je, itatokea kabla ya muda kuisha?");
await zh.fill("会在截止前发生吗？");
await page.getByRole("button", { name: "Save short titles" }).click();
await page.waitForTimeout(2500);
await page.reload({ waitUntil: "domcontentloaded" }); await settle();
ok("1.2 after a reload the English short title is stored", (await page.getByLabel("English short title").inputValue()) === "Will it happen before the deadline?");
ok("1.3 …and the Swahili one", (await page.getByLabel("Swahili short title").inputValue()) === "Je, itatokea kabla ya muda kuisha?");
ok("1.4 …and the Chinese one", (await page.getByLabel(/Chinese short title/).inputValue()) === "会在截止前发生吗？");
await page.getByText("Card short titles").first().scrollIntoViewIfNeeded().catch(() => {});
await tile("1-control-saved-1280");

console.log("\n§2 · a Swahili short title not in the 'Je, …?' form is refused");
await page.getByLabel("Swahili short title").fill("Itatokea kabla ya muda?");
await page.getByRole("button", { name: "Save short titles" }).click();
await page.waitForTimeout(2000);
const swErr = (await page.locator('[data-field="shortTitleSw"]').innerText().catch(() => "")).replace(/\s+/g, " ");
ok("2.1 the refusal sits beside the Swahili field and names the form", /Je,/.test(swErr), swErr.slice(0, 160));
await tile("2-refused-1280");
await page.reload({ waitUntil: "domcontentloaded" }); await settle();
ok("2.2 …and nothing was saved", (await page.getByLabel("Swahili short title").inputValue()) === "Je, itatokea kabla ya muda kuisha?");
await page.setViewportSize({ width: 390, height: 844 });
await page.getByText("Card short titles").first().scrollIntoViewIfNeeded().catch(() => {});
await page.waitForTimeout(500);
await tile("2-control-390");
await page.setViewportSize({ width: 1280, height: 900 });

console.log("\n§3 · the create wizard offers the fields");
await page.goto(`${BASE}/admin/markets/new`, { waitUntil: "domcontentloaded" }); await settle();
ok("3.1 the wizard's first step has the English short-title field", (await page.getByText(/Short title \(EN\)/i).count()) > 0);
await page.getByText(/Short title \(EN\)/i).first().scrollIntoViewIfNeeded().catch(() => {});
await tile("3-wizard-1280");

console.log("\n§4 · drafts for open markets, then approve one");
await page.goto(`${BASE}/admin/ai-polls?tab=short-titles`, { waitUntil: "domcontentloaded" }); await settle();
await tile("4-drafts-empty-1280");
const draftBtn = page.getByRole("button", { name: "Draft short titles for open markets" });
if ((await draftBtn.count()) === 0 || (await draftBtn.isDisabled())) {
  skip("4.x the draft run", "the button is absent or disabled (AI generation switched off, or no market needs a short title)");
} else {
  await draftBtn.click();
  await page.waitForTimeout(8000);
  await page.reload({ waitUntil: "domcontentloaded" }); await settle();
  const approve = page.getByRole("button", { name: "Approve", exact: true });
  const n = await approve.count();
  if (n === 0) {
    const text = (await page.locator("main").innerText()).replace(/\s+/g, " ");
    skip("4.x approve a draft", `no draft appeared — the page says: ${text.slice(0, 220)}`);
  } else {
    ok("4.1 the draft run produced drafts to review", n > 0, `${n} drafts`);
    await tile("4-drafts-1280");
    await approve.first().click();
    await page.waitForTimeout(3000);
    await page.reload({ waitUntil: "domcontentloaded" }); await settle();
    ok("4.2 approving one removes it from the queue", (await page.getByRole("button", { name: "Approve", exact: true }).count()) === n - 1, `${n} → ${await page.getByRole("button", { name: "Approve", exact: true }).count()}`);
    await tile("4-drafts-after-approve-1280");
  }
}

console.log("\n§5 · players see nothing new");
const player = await b.newContext({ viewport: { width: 390, height: 844 } });
const pp = await player.newPage();
pp.on("pageerror", (e) => errors.push(`player: ${e.message}`));
await pp.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded" }); await settle(pp);
const html = await pp.content();
ok("5.1 the short titles saved in §1 appear nowhere on /markets (cards keep their full titles until S7)",
  !html.includes("Je, itatokea kabla ya muda kuisha?") && !html.includes("Will it happen before the deadline?"));
if (marketId) {
  await pp.goto(`${BASE}/markets/${marketId}`, { waitUntil: "domcontentloaded" }); await settle(pp);
  const h = (await pp.locator("main h1").first().innerText().catch(() => "")).trim();
  ok("5.2 the market's own page still leads with its full question", h.length > 0 && !/^Je, itatokea/.test(h), h.slice(0, 80));
  await tile("5-market-page-390", pp);
}

console.log("\n§6 · no page error anywhere");
ok("6.1 no page errors or console errors", errors.length === 0, errors.slice(0, 4).join(" | "));
await b.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed — tiles in ${SHOTS} — the market's full title was: ${fullTitle.slice(0, 80)}`);
process.exit(failed ? 1 : 0);
