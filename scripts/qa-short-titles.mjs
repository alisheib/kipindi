/**
 * LOCAL-ONLY end-to-end drive of S2 — short titles and competition (the Vodacom plan, `docs/VODACOM-PLAN.md`).
 * Reads every state from the PAGE, in a real browser, through the real controls, and leaves a viewport tile of each
 * state (never full-page) in KP_SHOTS for reading one by one:
 *   §1 the Owner saves three short titles on a seeded market → they persist across a reload;
 *   §2 a Swahili short title not in the "Je, …?" form is refused beside its own field, and nothing is saved;
 *   §3 a number the full question does not contain saves, with the warning UNDER the field it names (cleared by typing);
 *   §4 a STALE page (another officer saved meanwhile) is refused, naming the field — it never overwrites;
 *   §5 the create wizard offers the fields, and a counter over budget turns red;
 *   §6 the drafts tab: a run drafts short titles (mock AI); "Edit, then approve" relabels an edited language's verdict;
 *      Reject asks for a reason; Approve removes the draft from the queue;
 *   §7 players see NOTHING new: /markets and the market page keep the full titles (S2 changes no player surface);
 *   §8 no page error anywhere.
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
const DESK = { width: 1280, height: 900 };
const PHONE = { width: 390, height: 844 };

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: DESK });
const seeded = await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000001" } });
ok("0.1 the Owner is seeded and signed in", seeded.ok(), String(seeded.status()));
const sm = await ctx.request.post(`${BASE}/api/dev-test/seed-markets`);
ok("0.2 demo markets are seeded", sm.ok(), String(sm.status()));
const watch = (p, who) => {
  p.on("pageerror", (e) => errors.push(`${who}: ${e.message}`));
  p.on("console", (m) => { if (m.type() === "error" && !/favicon|404/.test(m.text())) errors.push(`${who} console: ${m.text().slice(0, 200)}`); });
  return p;
};
const page = watch(await ctx.newPage(), "owner");
const settle = async (p = page) => { await p.waitForLoadState("domcontentloaded"); await p.locator("main").first().waitFor({ timeout: 120_000 }); await p.waitForTimeout(1000); };
const tile = (name, p = page) => p.screenshot({ path: `${SHOTS}/${name}.png` });
const at = async (p, locator) => { await locator.first().scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(300); };
const fieldText = async (p, key) => (await p.locator(`[data-field="${key}"]`).innerText().catch(() => "")).replace(/\s+/g, " ");

console.log(`qa:short-titles — ${BASE}\n\n§1 · the Owner saves short titles`);
await page.goto(`${BASE}/admin/markets`, { waitUntil: "domcontentloaded" }); await settle();
const href = await page.locator('a[href^="/admin/markets/mkt_"]').first().getAttribute("href").catch(() => null);
ok("1.0 a seeded market is listed on /admin/markets", !!href, String(href));
const marketId = href ? href.split("/").pop() : "";
const openMarket = async (p = page) => { await p.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" }); await settle(p); await at(p, p.getByText("Card short titles")); };
await openMarket();
ok("1.1 the market page shows the 'Card short titles' control", (await page.getByText("Card short titles").count()) > 0);
await tile("1a-control-empty-1280");
await page.getByLabel("English short title").fill("Will it happen before the deadline?");
await page.getByLabel("Swahili short title").fill("Je, itatokea kabla ya muda kuisha?");
await page.getByLabel(/Chinese short title/).fill("会在截止前发生吗？");
await tile("1b-control-filled-1280");
await page.getByRole("button", { name: "Save card wording" }).click();
await page.waitForTimeout(3000);
await tile("1c-control-saved-with-verdicts-1280");
ok("1.2 after the save the sentinel's verdict is shown for each language (locally: not checked)", (await page.getByText(/Sentinel check/).count()) === 3);
ok("1.2b …and WHY it did not check is said ONCE for the save, not once per language",
  (await page.getByText(/Why the sentinel did not check them/).count()) === 1 && (await page.getByText(/Sentinel check: not checked —/).count()) === 0);
await openMarket();
ok("1.3 after a reload the English short title is stored", (await page.getByLabel("English short title").inputValue()) === "Will it happen before the deadline?");
ok("1.4 …and the Swahili one", (await page.getByLabel("Swahili short title").inputValue()) === "Je, itatokea kabla ya muda kuisha?");
ok("1.5 …and the Chinese one", (await page.getByLabel(/Chinese short title/).inputValue()) === "会在截止前发生吗？");

console.log("\n§2 · a Swahili short title not in the 'Je, …?' form is refused");
await page.getByLabel("Swahili short title").fill("Itatokea kabla ya muda?");
await page.getByRole("button", { name: "Save card wording" }).click();
await page.waitForTimeout(2500);
const swErr = await fieldText(page, "shortTitleSw");
ok("2.1 the refusal sits beside the Swahili field and names the form", /Je,/.test(swErr), swErr.slice(0, 160));
const NBSP = String.fromCharCode(0xa0);
ok("2.1b …with the pattern held on one line by a no-break space after \"Je,\"",
  ((await page.locator('[data-field="shortTitleSw"]').textContent().catch(() => "")) ?? "").includes(`Je,${NBSP}`));
ok("2.2 …and the refused field has the focus", (await page.evaluate(() => document.activeElement?.closest("[data-field]")?.getAttribute("data-field") ?? "")) === "shortTitleSw");
await tile("2a-refused-1280");
await page.setViewportSize(PHONE); await at(page, page.locator('[data-field="shortTitleSw"]'));
await tile("2b-refused-390");
await page.setViewportSize(DESK);
await openMarket();
ok("2.3 …and nothing was saved", (await page.getByLabel("Swahili short title").inputValue()) === "Je, itatokea kabla ya muda kuisha?");

console.log("\n§3 · a number the full question does not contain: saves, with a warning");
await page.getByLabel("English short title").fill("Will it happen by 2031?");
await page.getByRole("button", { name: "Save card wording" }).click();
await page.waitForTimeout(3000);
const enWarn = await fieldText(page, "shortTitleEn");
ok("3.1 the save lands and the warning sits UNDER the English field, naming the number", /has a number the full question does not/.test(enWarn), enWarn.slice(0, 200));
ok("3.1b …and the save's toast says to read the notes, not a plain success", (await page.getByText(/read the notes under the fields/).count()) > 0);
await at(page, page.locator('[data-field="shortTitleEn"]'));
await tile("3a-warning-1280");
await page.getByLabel("English short title").fill("Will it happen before the deadline?");
ok("3.2 typing into the field clears the warning about the saved words", !/has a number the full question does not/.test(await fieldText(page, "shortTitleEn")));
await page.getByRole("button", { name: "Save card wording" }).click();
await page.waitForTimeout(3000);

console.log("\n§4 · a stale page is refused, never overwrites");
const other = watch(await ctx.newPage(), "owner-2");
await openMarket(other);
await openMarket();
await other.getByLabel("Swahili short title").fill("Je, itatokea kabla ya mwisho?");
await other.getByRole("button", { name: "Save card wording" }).click();
await other.waitForTimeout(3000);
await page.getByLabel("Swahili short title").fill("Je, itatokea mapema?");
await page.getByRole("button", { name: "Save card wording" }).click();
await page.waitForTimeout(2500);
const stale = await fieldText(page, "shortTitleSw");
ok("4.1 the stale page is refused beside the Swahili field ('changed by someone else')", /someone else/i.test(stale), stale.slice(0, 160));
await tile("4a-stale-refused-1280");
await openMarket();
ok("4.2 …and the other officer's words stand", (await page.getByLabel("Swahili short title").inputValue()) === "Je, itatokea kabla ya mwisho?");
await other.close();
await page.setViewportSize(PHONE); await at(page, page.getByText("Card short titles"));
await tile("4b-control-390");
await page.setViewportSize(DESK);

console.log("\n§5 · the create wizard");
await page.goto(`${BASE}/admin/markets/new`, { waitUntil: "domcontentloaded" }); await settle();
const wizEn = page.getByText(/Short title \(EN\)/i);
ok("5.1 the wizard's first step has the short-title fields, as one group with its heading and the rule", (await wizEn.count()) > 0
  && (await page.getByText("Card short titles").count()) === 1 && (await page.getByText("Cards show the short title instead of the full question.").count()) === 1);
await at(page, wizEn);
await tile("5a-wizard-fields-1280");
const wizInput = page.locator('[data-field="shortTitleEn"] input').first();
if ((await wizInput.count()) > 0) {
  await wizInput.fill("Will the shilling strengthen against the dollar before the end of the month?");
  await page.waitForTimeout(500);
  await tile("5b-wizard-over-budget-1280");
  const wizText = await fieldText(page, "shortTitleEn");
  ok("5.2 a short title over budget shows its counter and the server's own sentence before Continue", /\/ 56/.test(wizText) && /Keep the English short title to 56 characters/.test(wizText) && !/optional/.test(wizText), wizText.slice(0, 200));
} else skip("5.2 the over-budget counter", "the wizard's English short-title input was not found by its data-field");
await page.setViewportSize(PHONE); await at(page, wizEn);
await tile("5c-wizard-390");
await page.setViewportSize(DESK);

console.log("\n§6 · the drafts tab");
await page.goto(`${BASE}/admin/ai-polls?tab=short-titles`, { waitUntil: "domcontentloaded" }); await settle();
await tile("6a-drafts-before-run-1280");
const draftBtn = page.getByRole("button", { name: "Draft short titles for open markets" });
if ((await draftBtn.count()) === 0 || (await draftBtn.isDisabled())) {
  skip("6.x the draft run", "the button is absent or disabled (AI generation off, or no market needs a short title)");
} else {
  await draftBtn.click();
  await page.waitForTimeout(9000);
  await page.reload({ waitUntil: "domcontentloaded" }); await settle();
  const approve = page.getByRole("button", { name: "Approve", exact: true });
  const n = await approve.count();
  ok("6.1 the run produced drafts to review", n > 0, `${n} drafts`);
  if (n > 0) {
    await at(page, approve);
    await tile("6b-drafts-list-1280");
    await page.getByRole("button", { name: "Edit, then approve" }).first().click();
    await page.waitForTimeout(700);
    const inputs = page.locator("main input");
    let edited = false;
    for (let i = 0; i < await inputs.count(); i++) {
      const v = await inputs.nth(i).inputValue().catch(() => "");
      if (v.startsWith("Je, ")) { await inputs.nth(i).fill(v.replace(/\?$/, " leo?")); edited = true; break; }
    }
    await page.waitForTimeout(500);
    ok("6.2 an edited language's verdict says what happens next: 'not checked yet — the sentinel reads your words when you approve'",
      edited && (await page.getByText(/the sentinel reads your words when you approve/).count()) > 0);
    const editRow = page.locator(".glass-panel", { has: page.getByRole("button", { name: "Approve these short titles" }) }).last();
    ok("6.2b in edit mode each language is on screen ONCE — the fields replace the read-only blocks",
      (await editRow.getByText("Swahili", { exact: true }).count()) === 0 && (await editRow.getByText("Swahili short title").count()) === 1);
    await at(page, page.getByText(/the sentinel reads your words when you approve/));
    await tile("6c-edit-mode-1280");
    await page.setViewportSize(PHONE); await page.waitForTimeout(400);
    await tile("6d-edit-mode-390");
    await page.setViewportSize(DESK);
    await page.getByRole("button", { name: "Cancel" }).first().click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Reject", exact: true }).first().click();
    await page.waitForTimeout(500);
    ok("6.3 Reject asks for a reason before it arms, and says its minimum", (await page.getByRole("button", { name: "Reject this draft" }).isDisabled())
      && (await page.getByText(/Required — at least 3 characters/).count()) > 0);
    await at(page, page.getByRole("button", { name: "Reject this draft" }));
    await tile("6e-reject-mode-1280");
    await page.getByRole("button", { name: "Cancel" }).first().click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Approve", exact: true }).first().click();
    await page.waitForTimeout(3500);
    await page.reload({ waitUntil: "domcontentloaded" }); await settle();
    const after = await page.getByRole("button", { name: "Approve", exact: true }).count();
    ok("6.4 approving one removes it from the queue", after === n - 1, `${n} → ${after}`);
    await tile("6f-after-approve-1280");
  }
}
await page.setViewportSize(PHONE); await page.goto(`${BASE}/admin/ai-polls?tab=short-titles`, { waitUntil: "domcontentloaded" }); await settle();
await tile("6g-drafts-390");
await page.setViewportSize(DESK);

console.log("\n§7 · players see nothing new");
const player = await b.newContext({ viewport: PHONE });
const pp = watch(await player.newPage(), "player");
await pp.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded" }); await settle(pp);
const html = await pp.content();
ok("7.1 no short title saved above appears on /markets (cards keep their full titles until S7)",
  !html.includes("Je, itatokea kabla ya mwisho?") && !html.includes("Will it happen before the deadline?") && !html.includes("会在截止前发生吗？"));
await tile("7a-markets-390", pp);
if (marketId) {
  await pp.goto(`${BASE}/markets/${marketId}`, { waitUntil: "domcontentloaded" }); await settle(pp);
  const h = (await pp.locator("main h1").first().innerText().catch(() => "")).trim();
  ok("7.2 the market page still leads with its full question", h.length > 0 && !/^Je, itatokea/.test(h), h.slice(0, 80));
  await tile("7b-market-page-390", pp);
}

console.log("\n§8 · no page error anywhere");
ok("8.1 no page errors or console errors", errors.length === 0, errors.slice(0, 4).join(" | "));
await b.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed — tiles in ${SHOTS}`);
process.exit(failed ? 1 : 0);
