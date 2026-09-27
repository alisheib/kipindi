/**
 * LOCAL-ONLY end-to-end drive of the Owner's switch on /admin/affiliate (docs/PLAYER-INVITE-UNPAID.md §12):
 * Not payable (locked) → "Make payable…" ceremony → Payable (editable) → arm the prize and Save → "Stop paying…"
 * → Not payable (locked again). Each state is read from the PAGE and from /api/health.
 *
 *   KP_BASE=http://localhost:3031 npm run qa:invite-ceremony
 *
 * ⛔ IT REALLY SWITCHES PAYMENT ON — so it refuses anything but `http://localhost:PORT` (an in-memory dev server,
 * `DISABLE_ADMIN_TOTP=true`, the session from POST /api/dev-test/seed-admin). The production drive is
 * `qa:invite-admin`, which never confirms anything.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.KP_BASE ?? "http://localhost:3000";
if (!/^http:\/\/localhost(:\d+)?$/.test(BASE)) {
  console.error(`REFUSED — local dev only, addressed as http://localhost:PORT. KP_BASE was ${JSON.stringify(BASE)}.`);
  process.exit(2);
}
const SHOTS = process.env.KP_SHOTS ?? ".qa-invite-ceremony";
mkdirSync(SHOTS, { recursive: true });
const results = [];
const ok = (name, pass, detail = "") => { results.push(!!pass); console.log(`  ${pass ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); };
const health = async (ctx) => (await (await ctx.request.get(`${BASE}/api/health`)).json())?.inviteRewards ?? null;

/* ⛔ AND ONLY AGAINST AN IN-MEMORY SERVER. `localhost` alone is not enough: a dev server started with a real
   DATABASE_URL would pass the URL check, and this drive would then promote an ADMIN there, switch payment on,
   arm the prize and leave it armed. The server's own health says whether a database is configured. */
{
  const res = await fetch(`${BASE}/api/health`).catch(() => null);
  const body = res ? await res.json().catch(() => null) : null;
  if (!body || body.database?.configured !== false) {
    console.error(`REFUSED — the server at ${BASE} reports a configured database (database.configured=${JSON.stringify(body?.database?.configured)}). This drive runs only against an in-memory dev server.`);
    process.exit(2);
  }
}

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const seeded = await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: {} });
if (!seeded.ok()) { console.error(`seed-admin failed: ${seeded.status()}`); process.exit(1); }
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
// ⚠️ The Chip is CSS-uppercase, so `innerText` reads "NOT PAYABLE" — match without case, report in the page's words.
const chip = async () => {
  const head = (await page.locator("main header").first().innerText().catch(() => "")).replace(/\s+/g, " ");
  return /\bnot payable\b/i.test(head) ? "Not payable" : /\bpayable\b/i.test(head) ? "Payable" : "";
};
const load = async () => { await page.goto(`${BASE}/admin/affiliate`, { waitUntil: "domcontentloaded" }); await page.locator("main h1").first().waitFor({ timeout: 90_000 }); await page.waitForTimeout(1200); };
const toggle = (label) => page.locator(`[role="switch"][aria-label="${label}"]`).first();

console.log(`qa:invite-ceremony — ${BASE}\n\n§1 · Not payable, locked`);
await load();
let h = await health(ctx);
ok("1.1 health reads Not payable under the Owner ceiling", h && h.payable === false && h.ceiling === "OWNER", JSON.stringify(h));
ok("1.2 the chip says Not payable", (await chip()) === "Not payable");
ok("1.3 the reward toggles are locked", await toggle("Prize enabled").isDisabled());
ok("1.4 no Save while locked", (await page.getByRole("button", { name: /^Save changes$/ }).count()) === 0);
await page.screenshot({ path: `${SHOTS}/1-not-payable.png` });

console.log("\n§2 · the ceremony");
await page.getByRole("button", { name: /Make payable…/ }).first().click();
const dlg = page.locator('[role="alertdialog"]').last();
await dlg.waitFor({ timeout: 10_000 });
const confirm = dlg.getByRole("button", { name: /^Make payable$/ });
ok("2.1 Confirm is disarmed on an empty ceremony", await confirm.isDisabled());
await dlg.getByLabel(/making invites payable/).fill("Local ceremony drive: proving the switch end to end.");
ok("2.2 …still disarmed with a reason but no typed word", await confirm.isDisabled());
await dlg.getByLabel(/Type MAKE PAYABLE/).fill("make payable");
ok("2.3 …still disarmed when the words are not exactly MAKE PAYABLE", await confirm.isDisabled());
await dlg.getByLabel(/Type MAKE PAYABLE/).fill("MAKE PAYABLE");
const nothingYet = dlg.getByRole("radio", { name: /Nothing yet/ });
ok("2.4 'Nothing yet' is the default choice", (await nothingYet.count()) > 0 && (await nothingYet.isChecked()));
ok("2.5 Confirm arms once everything is complete", await confirm.isEnabled());
await page.screenshot({ path: `${SHOTS}/2-ceremony.png` });
await confirm.click();
await page.waitForTimeout(2500);
await load();

console.log("\n§3 · Payable, editable, one Save");
h = await health(ctx);
ok("3.1 health reads Payable", h && h.payable === true, JSON.stringify(h));
ok("3.1b …but nothing pays yet — 'Nothing yet' left paying false", h && h.paying === false, JSON.stringify(h));
ok("3.2 the chip says Payable", (await chip()) === "Payable");
ok("3.3 'Nothing yet' left every reward off", !(await toggle("Prize enabled").isChecked()) && !(await toggle("Commission enabled").isChecked()) && !(await toggle("Bonus / discount enabled").isChecked()));
ok("3.4 the settings are unlocked", await toggle("Prize enabled").isEnabled());
const save = page.getByRole("button", { name: /^Save changes$/ }).first();
ok("3.5 Save is disabled while nothing has changed", (await save.count()) === 1 && (await save.isDisabled()));
await toggle("Prize enabled").click();
await page.waitForTimeout(500);
ok("3.6 arming the prize makes the form saveable", await save.isEnabled());
const pay = (await page.locator("main").innerText()).replace(/\s+/g, " ");
ok("3.7 the preview prices the armed prize — a 'This will pay' line naming a TZS amount", /This will pay[^\n]{0,200}?TZS\s?[\d,]+/i.test(pay), pay.match(/This will pay[^\n]{0,120}/i)?.[0] ?? "no 'This will pay' line");
await save.click();
await page.waitForTimeout(2500);
await load();
ok("3.8 the armed prize survived a reload (the save landed)", await toggle("Prize enabled").isChecked());
await page.waitForTimeout(10_500); // health reads the screens' <=10 s cache
h = await health(ctx);
ok("3.9 health now reads paying — the armed prize pays", h && h.payable === true && h.paying === true, JSON.stringify(h));
await page.screenshot({ path: `${SHOTS}/3-payable.png` });

console.log("\n§4 · Stop paying");
await page.getByRole("button", { name: /Stop paying…/ }).first().click();
const stop = page.locator('[role="alertdialog"]').last();
await stop.waitFor({ timeout: 10_000 });
const stopBtn = stop.getByRole("button", { name: /^Stop paying$/ });
ok("4.1 Stop needs a reason", await stopBtn.isDisabled());
await stop.getByLabel(/stopping payment/).fill("Local ceremony drive: switching it back off.");
ok("4.2 …and only a reason", await stopBtn.isEnabled());
await stopBtn.click();
await page.waitForTimeout(2500);
await load();
h = await health(ctx);
ok("4.3 health reads Not payable again, and nothing paying", h && h.payable === false && h.paying === false, JSON.stringify(h));
ok("4.4 the chip says Not payable", (await chip()) === "Not payable");
ok("4.5 the settings are locked again", await toggle("Prize enabled").isDisabled());
ok("4.6 no page errors anywhere", errors.length === 0, errors.slice(0, 2).join(" · "));
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
await page.screenshot({ path: `${SHOTS}/4-not-payable-390.png` });
await b.close();
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
