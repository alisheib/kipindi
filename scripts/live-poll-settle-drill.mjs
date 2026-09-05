#!/usr/bin/env node
/**
 * THE LONG-FORM POLL SETTLEMENT DRILL — resolve a QA poll and let it pay, on production.
 *
 *   OBJ=0  node scripts/live-poll-settle-drill.mjs window   # FINANCE sets the objection window
 *   MKT=mkt_x node scripts/live-poll-settle-drill.mjs resolve   # COMPLIANCE seals the verdict
 *   OBJ=1  node scripts/live-poll-settle-drill.mjs window   # …and puts it straight back
 *
 * ⛔ `OBJ` MUST BE THE VALUE THE WINDOW WAS BEFORE YOU TOUCHED IT — read it off the field, do
 * not copy it from this header. It was 24 until 2026-09-05 and is 1 now; the next change will
 * not update this comment either. `windowCmd()` prints the value it found before typing.
 *
 * ⭐ WHY THE WINDOW HAS TO MOVE AT ALL. `docs/RULES.md`'s definition of done needs a long-form
 * poll settling at 13% of the losing side on production. Up & Down rounds settle the instant
 * they resolve; a long-form market is HELD for `objectionWindowHours` — **read it live, never
 * assume; it moved 24 → 1 on 2026-09-05** —
 * so players can dispute a verdict while the pool is still intact. "Settle now" on
 * `/admin/settlement` deliberately cannot pay early: *"this button cannot pay a market early,
 * one under dispute, or one twice."* That is correct, and it means the only two ways to have a
 * settled long-form poll are to wait a day or to close the window for the moment of the seal.
 *
 * ⛔ AND THIS IS A REGULATOR-FACING CONTROL, so it is bracketed, minimal and audited:
 *   · exactly ONE market is awaiting an officer (this QA poll), verified before touching it,
 *     so no other market can be sealed under the temporary setting;
 *   · every stake in it is QA-fleet money, so no real player loses a window to object;
 *   · the change is made through the FINANCE officer's own screen — the role `requireStaff`
 *     names for this domain — never by writing the database;
 *   · and it is restored immediately, with `market-config-diff.cjs` proving the whole config
 *     is byte-identical afterwards. ⚠️ That diff is not ceremony: `/admin/config` posts EVERY
 *     field and `persist()` rewrites the whole snapshot, which is how an unrelated save once
 *     re-froze a retired stake floor for nineteen days (RULES.md §2.3).
 */
import { BASE, browser, login, bodyText, shot, recorder } from "./live/harness.mjs";

const CMD = process.argv[2] ?? "window";
const MKT = process.env.MKT ?? "";
// ⛔ NO DEFAULT WORTH TRUSTING. The restore value is whatever the field held BEFORE this run,
// and only the operator knows that. 1 matches the code default since 2026-09-05, but pass OBJ
// explicitly on the restore leg rather than relying on this line.
const OBJ = process.env.OBJ ?? "1";
const OUTCOME = process.env.OUTCOME ?? "YES";
// ⚠️ TRADING, NOT COMPLIANCE. The resolver screen refused the COMPLIANCE officer outright:
// "Your role cannot view this page. This surface exposes regulator-grade financial data and is
// limited to trading & markets access. Moderators are excluded by policy." RBAC working as
// designed, and the driver was the thing that was wrong.
const RESOLVER_ROLE = process.env.RESOLVER_ROLE ?? "trading";
const rec = recorder(`LIVE POLL SETTLE DRILL · ${CMD}`);

async function windowCmd() {
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  page.on("response", (r) => { if (r.request().method() === "POST") console.log(`  [POST ${r.status()}] ${r.url().slice(0, 70)}`); });
  try {
    // ⚠️ FINANCE, not ADMIN — `requireStaff("accounting")` is what guards this action.
    await login(page, "finance");
    await page.goto(`${BASE}/admin/config`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 45_000 });

    const box = page.locator('input[name="objectionWindowHours"]').first();
    await box.waitFor({ timeout: 30_000 });
    const was = await box.inputValue();
    await box.click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Delete");
    await page.keyboard.type(OBJ, { delay: 30 });
    await page.waitForTimeout(300);
    const now = await box.inputValue();
    rec.check(`the field reads ${OBJ} before saving`, now.trim() === OBJ, `was ${was}, reads ${now}`);

    // The form's own submit — whatever it is called on this screen.
    const save = page.getByRole("button", { name: /^(save|save changes|update)/i }).first();
    await save.waitFor({ state: "visible", timeout: 20_000 });
    await save.click({ timeout: 20_000 });
    await page.waitForTimeout(3_000);
    for (let i = 0; i < 30; i++) {
      const msg = await page.evaluate(() => {
        for (const el of document.querySelectorAll('div[role="region"], [role="alert"], [role="status"]')) {
          const s = (el.innerText || "").replace(/\s+/g, " ").trim();
          if (s) return s;
        }
        return "";
      });
      if (msg) { console.log(`  toast: "${msg}"`); break; }
      await page.waitForTimeout(250);
    }
    await shot(page, `config-objection-${OBJ}`);
    console.log(`\n  ⛔ Now DIFF the whole config, not just this field:\n     node scripts/live/ops/market-config-diff.cjs diff before live\n`);
  } finally { await ctx.close(); await b.close(); }
}

async function resolveCmd() {
  if (!MKT) throw new Error("MKT=mkt_… is required");
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  page.on("response", (r) => { if (r.request().method() === "POST") console.log(`  [POST ${r.status()}] ${r.url().slice(0, 70)}`); });
  try {
    // ⚠️ The role that owns this surface — see RESOLVER_ROLE above.
    await login(page, RESOLVER_ROLE);
    await page.goto(`${BASE}/admin/resolver/${MKT}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 45_000 });
    await page.waitForTimeout(1_500);
    await shot(page, "resolver-before");

    // ⛔ TWO STEPS, AND THE SECOND IS DISABLED UNTIL THE FIRST. The ceremony offers
    // `YES NDIO` / `NO HAPANA` / `VOID BATILISHA` as a side PICKER, and `Resolve & seal`
    // starts DISABLED — measured with the `probe` command. A driver that looked for
    // "Resolve YES" (the resolver-QUEUE's control, which is a different screen) found nothing
    // and sealed nothing, while the run reported no failure at all.
    // ⚠️ The labels are bilingual in one button: "YES NDIO", not "YES".
    const pick = page.getByRole("button", { name: new RegExp(`^${OUTCOME}\\b`, "i") }).first();
    await pick.waitFor({ state: "visible", timeout: 30_000 });
    await pick.click({ timeout: 20_000 });
    await page.waitForTimeout(700);

    const seal = page.getByRole("button", { name: /resolve & seal/i }).first();
    await seal.waitFor({ state: "visible", timeout: 20_000 });
    // ⛔ PICKING A SIDE IS NOT ENOUGH, AND THAT IS THE POINT OF THE CEREMONY. The gate is
    //     canSeal = !!verdict && (verdict !== "VOID" || !!voidReason) && sealText === "SEAL"
    // so the officer must also DECLARE THE EVIDENCE and TYPE `SEAL`. A driver that clicked the
    // verdict and expected the button to arm found it disabled and sealed nothing — and the
    // first version of this check asserted the wrong precondition, so it reported the product
    // as broken. The refusal was correct.
    rec.check("the seal is REFUSED on a verdict alone — the ceremony is not a single click",
              (await seal.isEnabled().catch(() => true)) === false);

    // The officer's own record of WHY. This is the text a regulator reads.
    await page.locator("textarea").first().fill(
      "QA MARKET - NOT A REAL EVENT. Session-3 rules programme: resolved YES by operator " +
      "decision at the stated time, to prove that a long-form poll settles at 13 percent of " +
      "the losing side on production. Every stake is QA-fleet money.");
    await page.waitForTimeout(300);

    const sealBox = page.locator('input[placeholder="SEAL"]').first();
    await sealBox.waitFor({ state: "visible", timeout: 15_000 });
    await sealBox.fill("SEAL");
    await page.waitForTimeout(500);
    rec.check("…and ARMS once the evidence is declared and SEAL is typed",
              await seal.isEnabled().catch(() => false));
    await shot(page, "resolver-armed");

    // ⚠️ Single-admin fires directly — there is NO confirm modal on this path.
    await seal.click({ timeout: 20_000 });
    await page.waitForTimeout(8_000);
    await shot(page, "resolver-after");
    const txt = await bodyText(page);
    rec.check(`the verdict ${OUTCOME} was recorded`, /verdict recorded|resolved|settled/i.test(txt), txt.slice(0, 200));
    console.log(`\n  ⛔ The DOM is not the proof — read the row and the ledger.\n`);
  } finally { await ctx.close(); await b.close(); }
}

/**
 * Look at the resolver screen WITHOUT sealing anything.
 *
 * ⛔ WHY A DRY MODE EXISTS. The seal is irreversible and it stamps the objection window that
 * is open AT THAT MOMENT. Debugging the driver by re-running `resolve` would either seal the
 * market under the full window (wasting the bracket) or force the window to be re-opened for
 * every attempt. Look first, act once.
 */
async function probeCmd() {
  if (!MKT) throw new Error("MKT=mkt_… is required");
  const { b, ctx } = await browser();
  const page = await ctx.newPage();
  try {
    await login(page, RESOLVER_ROLE);
    await page.goto(`${BASE}/admin/resolver/${MKT}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("main", { timeout: 45_000 });
    await page.waitForTimeout(2_000);
    await shot(page, "resolver-probe");
    console.log("  url:", page.url());
    const btns = await page.evaluate(() => [...document.querySelectorAll("button")].map((x, i) => ({
      i, text: (x.innerText || "").replace(/\s+/g, " ").trim().slice(0, 46),
      aria: x.getAttribute("aria-label"), disabled: x.disabled,
    })).filter((x) => x.text || x.aria));
    for (const x of btns) console.log(`  [${String(x.i).padStart(2)}] ${JSON.stringify(x.text)} aria=${JSON.stringify(x.aria)}${x.disabled ? " DISABLED" : ""}`);
    console.log("\n  page text:\n", (await bodyText(page)).slice(0, 900));
  } finally { await ctx.close(); await b.close(); }
}

if (CMD === "window") await windowCmd();
else if (CMD === "resolve") await resolveCmd();
else if (CMD === "probe") await probeCmd();
else throw new Error(`unknown command "${CMD}" — window | resolve | probe`);
rec.done();
