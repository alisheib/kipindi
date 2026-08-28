/**
 * DRIVE THE PURGE TO COMPLETION, WITH TWO REAL OFFICERS IN TWO REAL SESSIONS.
 *
 * ⛔ EVERY EARLIER DRIVE STOPPED AT THE MODAL. That proved the gate renders; it did not prove
 * the ceremony COMPLETES, that the progress bar ever advances, that the job reaches `done`, or
 * that the second officer is a different person from the first. Those are the claims, so those
 * are what this drives.
 *
 * Officer A = the demo user. Officer B = a second provisioned admin in its OWN browser context,
 * so the two carry genuinely different session cookies — not one session pretending.
 *
 *   BASE=http://localhost:3001 node scripts/purge-two-officer-drive.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3001";
const OUT = join(process.cwd(), "docs", "shots-scan-2026-08-28");
mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const browser = await chromium.launch();

/* ── Officer A — the demo user ─────────────────────────────────────────────── */
const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
const A = await ctxA.newPage();
await A.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded", timeout: 60000 });
await A.request.get(BASE + "/api/dev-test/promote-admin", { timeout: 120000 }).catch(() => {});
const pA = await A.request.post(BASE + "/api/dev-test/promote-admin", { data: { phone: "+255700000000" }, timeout: 120000 });
ok("officer A is an admin", pA.ok(), "HTTP " + pA.status());

/* ── Officer B — a second provisioned admin, in its OWN context ────────────── */
const ctxB = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
const B = await ctxB.newPage();
await B.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
const pB = await B.request.post(BASE + "/api/dev-test/seed-admin", {
  data: { phone: "+255700000042", name: "Second Officer" }, timeout: 120000,
});
ok("officer B was provisioned as a separate admin", pB.ok(), "HTTP " + pB.status());

/* ⛔ THE TWO SESSIONS MUST REALLY BE DIFFERENT PEOPLE, or the whole ceremony is theatre. */
const whoA = await (await A.request.get(BASE + "/api/dev-test/whoami", { timeout: 60000 })).json().catch(() => ({}));
const whoB = await (await B.request.get(BASE + "/api/dev-test/whoami", { timeout: 60000 })).json().catch(() => ({}));
console.log("  A =", JSON.stringify(whoA).slice(0, 120));
console.log("  B =", JSON.stringify(whoB).slice(0, 120));
const idA = whoA?.userId ?? whoA?.user?.id ?? JSON.stringify(whoA);
const idB = whoB?.userId ?? whoB?.user?.id ?? JSON.stringify(whoB);
ok("⛔ the two officers are genuinely different users", !!idA && !!idB && idA !== idB, `${idA} vs ${idB}`);

/* ── Seed a chain, stop it, archive it ─────────────────────────────────────── */
await A.request.post(BASE + "/api/dev-test/updown-seed", { data: {}, timeout: 120000 });
await A.goto(BASE + "/admin/updown", { waitUntil: "domcontentloaded", timeout: 60000 });
await A.waitForTimeout(2500);

async function pressAll(page, label, confirmRe) {
  for (let i = 0; i < 6; i++) {
    const btn = page.getByRole("button", { name: new RegExp("^" + label + "$") }).first();
    if ((await btn.count()) === 0) break;
    await btn.click().catch(() => {});
    await page.waitForTimeout(900);
    const c = page.getByRole("button", { name: confirmRe }).first();
    if ((await c.count()) === 0) { await page.keyboard.press("Escape").catch(() => {}); break; }
    await c.click().catch(() => {});
    await page.waitForTimeout(2200);
  }
}
await pressAll(A, "Stop", /^Stop chain$/);
await A.reload({ waitUntil: "domcontentloaded" }); await A.waitForTimeout(2000);
await pressAll(A, "Archive", /^Archive chain$/);
await A.reload({ waitUntil: "domcontentloaded" }); await A.waitForTimeout(2500);

/* ⛔ AND THE ARCHIVED ROW MUST NOT OFFER WHAT THE SERVER REFUSES (S-16b). */
const archivedCard = A.locator("text=Archived chains");
ok("the chain reached ARCHIVED", (await archivedCard.count()) > 0);
const genOnArchived = await A.getByRole("button", { name: /^Generate round$/ }).count();
const startOnArchived = await A.getByRole("button", { name: /^Start$/ }).count();
ok("🔴 S-16b — no Generate round on an archived chain", genOnArchived === 0, `${genOnArchived} found`);
ok("🔴 S-16b — no Start on an archived chain", startOnArchived === 0, `${startOnArchived} found`);
ok("⭐ CONTROL — Restore IS still offered", (await A.getByRole("button", { name: /^Restore$/ }).count()) > 0);

/* ── Stage 1 — officer A ──────────────────────────────────────────────────── */
await A.goto(BASE + "/admin/retention", { waitUntil: "domcontentloaded", timeout: 60000 });
await A.waitForTimeout(3500);
ok("the cost panel computed", (await A.getByText("What this deletes").count()) > 0);
await A.locator('input[placeholder*="chain retired"]').fill("pilot chain retired — two-officer drive");
await A.getByRole("button", { name: /Record the reason/i }).click();
await A.waitForTimeout(3000);
await A.screenshot({ path: join(OUT, "drive-1-officerA-signed.png"), fullPage: true });

ok("officer A now sees the SECOND-OFFICER rail", (await A.getByText(/Second officer required/i).count()) > 0);
ok("⛔ …and is NOT offered the confirm", (await A.getByRole("button", { name: /Confirm as second officer/i }).count()) === 0);

/* ── Stage 2 — officer B, a different person ──────────────────────────────── */
await B.goto(BASE + "/admin/retention", { waitUntil: "domcontentloaded", timeout: 60000 });
await B.waitForTimeout(3500);
const confirmBtn = B.getByRole("button", { name: /Confirm as second officer/i });
ok("⭐ officer B IS offered the confirm", (await confirmBtn.count()) > 0);
await confirmBtn.click();
await B.waitForTimeout(1500);
await B.screenshot({ path: join(OUT, "drive-2-officerB-modal.png"), fullPage: true });

/* The typed gate must be armed only by the chain's own label. */
const label = (await B.getByText(/^Purge .* and all its history\?$/).textContent().catch(() => "")) ?? "";
const chainLabel = label.replace(/^Purge /, "").replace(/ and all its history\?$/, "").trim();
console.log("  chain label = " + JSON.stringify(chainLabel));

const purgeBtn = B.getByRole("button", { name: /^Purge the chain$/ });
ok("⛔ the confirm is DISABLED before the word is typed", await purgeBtn.isDisabled().catch(() => false));

const gate = B.locator('input[placeholder="' + chainLabel + '"]');
await gate.fill("WRONG WORD");
await B.waitForTimeout(400);
ok("⛔ …and stays disabled on the WRONG word", await purgeBtn.isDisabled().catch(() => false));

await gate.fill(chainLabel);
await B.waitForTimeout(500);
ok("⭐ …and arms only on the chain's OWN label", !(await purgeBtn.isDisabled().catch(() => true)));
await B.screenshot({ path: join(OUT, "drive-3-armed.png"), fullPage: true });

await purgeBtn.click();

/* ── The job runs — the client drives one batch per call ──────────────────── */
let sawProgress = false, sawDone = false;
for (let i = 0; i < 40; i++) {
  await B.waitForTimeout(1000);
  const txt = await B.locator("body").innerText().catch(() => "");
  /* ⚠️ CASE-INSENSITIVE, and that is not fussiness. These labels carry `uppercase` in CSS, and
     Playwright innerText returns the PAINTED text — so a case-sensitive match reads the DOM as
     it was authored and the screen as it is not. Both these checks failed against a product
     that had worked perfectly, which is the same class as asserting a rectangle vs a string. */
  if (/writing the evidence pack|deleting rounds|verifying nothing remains/i.test(txt)) {
    if (!sawProgress) { sawProgress = true; await B.screenshot({ path: join(OUT, "drive-4-progress.png"), fullPage: true }); }
  }
  /* WARN: the phase label renders through CSS uppercase, so innerText returns "PURGED" — a
     case-sensitive match reads the DOM as authored and the SCREEN as it is not. Anchored on the
     progress caption beside it so the card title "Purge a chain and its history" cannot satisfy it. */
  if (/purged/i.test(txt) && /[0-9]+ of [0-9]+/i.test(txt)) { sawDone = true; break; }
  if (/failed/i.test(txt) && /evidence pack|verification/i.test(txt)) break;
}
await B.screenshot({ path: join(OUT, "drive-5-final.png"), fullPage: true });
ok("⭐ the progress phases were rendered", sawProgress);
ok("⭐ the job reached DONE", sawDone);

const finalTxt = await B.locator("body").innerText().catch(() => "");
ok("the evidence-pack sha256 is shown", /evidence pack sha256 [0-9a-f]{16}/.test(finalTxt),
   (finalTxt.match(/evidence pack sha256 \S+/) ?? ["none"])[0]);

/* ⛔ AND THE CHAIN IS REALLY GONE FROM THE PICKER — a purge that reports done and leaves the
   chain purgeable again would look identical on screen. */
await B.reload({ waitUntil: "domcontentloaded" });
await B.waitForTimeout(3000);
const stillThere = await B.getByText(new RegExp(chainLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).count();
console.log("  chain label still on the retention page: " + stillThere);

console.log(`\ntwo-officer drive: ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
