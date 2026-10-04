/**
 * U33w · THE MARKETING WORDINGS CARD, DRIVEN — Admin → System → Marketing wordings (`?tab=wordings`, its own tab since
 * the review's m7), at 1280 and at 360, on an in-memory dev boot (`DISABLE_ADMIN_TOTP=true`, `rm -rf .next` first).
 * What a suite cannot see:
 *   1280 — the card is on its own tab and no longer on Platform. Nothing saved: "0 of 10 wordings saved.", ten "Not
 *          saved — this is a suggestion" lines, an "Approve and save this wording" tick on every wording that cannot be
 *          left blank (nine; the source line may be blank), each tick naming its wording to a screen reader and each box
 *          naming its status line, and Save held WITH its reason. Ticking ONE wording and saving saves THAT ONE:
 *          version 1, by this admin — the other eight stay suggestions (W1 on the real page). It survives a reload, and
 *          its history opens. A wording given a phone number and an angle bracket says every problem under its own box
 *          at once, and Save waits with "Fix the problems shown under the wordings to save." An edited suggestion,
 *          unticked, then the bar's Save: "Nothing to save yet", never a silent no-op (m4). A second admin saves
 *          version 2 of a wording; the first admin's page, opened before it, is refused under the box in words, the
 *          cursor taken there, and nothing of it saved (m1 — the server's rule, through the real page).
 *    360 — no sideways scroll; editing an unsaved wording ticks its approval by itself; the pending-changes bar saves it.
 * Writes viewport tiles to .qa-shots/marketing-setup/u33w/ — open and read them; a pass here is not a look.
 * Usage: BASE=http://localhost:3010 node scripts/live/marketing-u33w-wordings-drive.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3010";
const SHOTS = join(".qa-shots", "marketing-setup", "u33w");
mkdirSync(SHOTS, { recursive: true });

let pass = 0;
let fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? " -- " + detail : ""}`); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const ADMIN_PHONE = "+255700000331";
const ADMIN_NAME = "QA U33w Owner";
/* A SECOND admin, a different account: one session per account, so a second context as the same admin would sign the
   first one out (repo memory, the single-session lesson). */
const SECOND_PHONE = "+255700000332";
const SECOND_NAME = "QA U33w Second";
const FORM = '[data-testid="marketing-wordings-form"]';
const WORDINGS_TAB = "/admin/system?tab=wordings";
const wording = (key) => `${FORM} [data-wording="${key}"]`;
const APPROVE = "Approve and save this wording";
const HELD_IDLE = "Change a wording, or tick";
const HELD_PROBLEMS = "Fix the problems shown under the wordings to save.";
const NOTHING_YET = "Nothing to save yet";
const STALE = "Someone saved this wording since you opened the page";

const browser = await chromium.launch();

async function adminPage(viewport, who = { phone: ADMIN_PHONE, name: ADMIN_NAME }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("dialog", (d) => { d.accept().catch(() => {}); });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const r = await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { role: "ADMIN", phone: who.phone, name: who.name } });
  if (!r.ok()) throw new Error(`seed-admin ADMIN failed: ${r.status()}`);
  await page.evaluate(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  return { ctx, page };
}
async function openCard(page) {
  await page.goto(BASE + WORDINGS_TAB, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(FORM, { timeout: 60_000 });
  await page.locator(FORM).scrollIntoViewIfNeeded();
  await wait(400);
}
const textOf = async (page, sel) => ((await page.locator(sel).first().textContent().catch(() => "")) || "").replace(/ +/g, " ").trim();
const countLine = (page) => textOf(page, `${FORM} > p`);
const statusOf = (page, key) => page.locator(`${wording(key)} [data-wording-status]`).first();
async function tile(page, name) {
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}

// ── 1280 ─────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const { ctx, page } = await adminPage({ width: 1280, height: 800 });
  await openCard(page);
  ok("1280 · the card renders on the Marketing wordings tab", (await page.locator(FORM).count()) === 1);
  ok("1280 · the tab rail offers Marketing wordings", (await page.locator(`a[href="${WORDINGS_TAB}"]`).count()) >= 1);
  // ⛔ m7 · its own tab, and only there — the Platform tab's cards (and the figures recorded for them) are unchanged.
  await page.goto(BASE + "/admin/system?tab=platform", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(`a[href="${WORDINGS_TAB}"]`, { timeout: 60_000 }).catch(() => {});
  await wait(400);
  ok("1280 · ⛔ m7 — the Platform tab no longer carries the card", (await page.locator(FORM).count()) === 0);
  await openCard(page);
  ok("1280 · nothing saved: the count line says 0 of 10", (await countLine(page)) === "0 of 10 wordings saved.", await countLine(page));
  const statuses = await page.locator(`${FORM} [data-wording-status]`).evaluateAll((els) => els.map((e) => e.getAttribute("data-wording-status")));
  ok("1280 · ten wordings, every one a suggestion", statuses.length === 10 && statuses.every((s) => s === "unsaved"), JSON.stringify(statuses));
  const ticks = await page.locator(FORM).getByText(APPROVE, { exact: true }).count();
  ok("1280 · an approval tick on each of the nine wordings that cannot be blank", ticks === 9, String(ticks));
  const save = page.locator(FORM).getByRole("button", { name: "Save wordings" });
  ok("1280 · Save is held while nothing is approved or changed", await save.isDisabled());
  ok("1280 · …and says why beside it", (await page.locator(FORM).getByText(HELD_IDLE).count()) === 1);
  // A screen reader hears WHICH wording a tick approves, and each box's version line with the box.
  const tickName = (await page.locator(wording("basis.OWN_EVENT")).getByRole("checkbox").first().getAttribute("aria-label").catch(() => null)) || "";
  ok("1280 · each approval tick names its wording to a screen reader (its visible words unchanged)", tickName.startsWith(`${APPROVE}: Basis · `), tickName);
  const describedBy = (await page.locator(`${wording("basis.OWN_EVENT")} textarea`).first().getAttribute("aria-describedby").catch(() => null)) || "";
  const statusId = (await statusOf(page, "basis.OWN_EVENT").getAttribute("id").catch(() => null)) || "";
  ok("1280 · each box names its status line (aria-describedby)", statusId !== "" && describedBy.split(" ").includes(statusId), `${describedBy} · ${statusId}`);
  await tile(page, "1280-01-nothing-saved");

  // Approve ONE suggestion — a real mouse click on its tick's words (a label that swallows its click is mouse-broken
  // and invisible to .check(), the 2026 checkbox lesson).
  await page.locator(wording("basis.OWN_FORM")).getByText(APPROVE, { exact: true }).click();
  await wait(200);
  ok("1280 · ticking one approval releases Save", !(await save.isDisabled()));
  await save.click();
  await page.waitForSelector(`${wording("basis.OWN_FORM")} [data-wording-status="saved"]`, { timeout: 20_000 }).catch(() => {});
  await wait(500);
  const savedLine = await statusOf(page, "basis.OWN_FORM").textContent().catch(() => "");
  ok("1280 · the ticked wording is saved as version 1 by this admin", /^Version 1, saved .+ by QA U33w Owner\./.test((savedLine || "").trim()), savedLine);
  ok("1280 · the count line says 1 of 10", (await countLine(page)) === "1 of 10 wordings saved.", await countLine(page));
  const stillUnsaved = await page.locator(`${FORM} [data-wording-status="unsaved"]`).count();
  ok("1280 · ⛔ W1 on the page — the other nine stay suggestions (one save approved one wording)", stillUnsaved === 9, String(stillUnsaved));

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(FORM, { timeout: 60_000 });
  ok("1280 · the save survives a reload", (await page.locator(`${wording("basis.OWN_FORM")} [data-wording-status="saved"]`).count()) === 1);
  const history = page.locator(`${FORM} [data-wording-history="basis.OWN_FORM"]`);
  ok("1280 · the saved wording has a history", (await history.count()) === 1);
  if ((await history.count()) === 1) {
    await history.locator("summary").click();
    await wait(250);
    ok("1280 · …which opens on version 1", /Version 1/.test((await history.textContent()) || ""), ((await history.textContent()) || "").slice(0, 120));
    await history.scrollIntoViewIfNeeded();
    await tile(page, "1280-02-saved-history-open");
  }

  // Several problems at once, under the box they belong to.
  const box = page.locator(`${wording("basis.OWN_EVENT")} textarea`).first();
  const before = await box.inputValue();
  await box.click();
  await box.press("End");
  await box.type(" Call 0712 345 678 <b>");
  await wait(300);
  const alert = page.locator(`${wording("basis.OWN_EVENT")} [role="alert"]`).first();
  const alertText = ((await alert.textContent().catch(() => "")) || "").trim();
  ok("1280 · a wording with a phone number and an angle bracket is refused under its own box", alertText.length > 0, alertText);
  ok("1280 · …naming the phone number", /phone/i.test(alertText), alertText);
  ok("1280 · …and the bracket, in the same breath (every problem at once)", /[<>]|bracket|angle/i.test(alertText), alertText);
  ok("1280 · Save waits, saying to fix the problems shown", (await save.isDisabled()) && (await page.locator(FORM).getByText(HELD_PROBLEMS).count()) === 1);
  await page.locator(wording("basis.OWN_EVENT")).scrollIntoViewIfNeeded();
  await tile(page, "1280-03-problems-at-once");
  // The pending bar offers its own Save while the card's is off screen: pressed with a problem, it must take the admin
  // to the problem — an enabled button that silently does nothing reads as a broken console.
  const barSave = page.locator('[data-pending-state="dirty"] button').filter({ hasText: /save/i }).first();
  const offered = (await barSave.count()) === 1 && (await barSave.isVisible());
  ok("1280 · the pending bar offers its Save while the card's own is off screen", offered);
  if (offered) {
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
    await barSave.click();
    await wait(350);
    const focusedIn = await page.evaluate(() => !!document.activeElement?.closest('[data-wording="basis.OWN_EVENT"]'));
    ok("1280 · …and, pressed with a problem, it takes the admin to the problem (never a silent no-op)", focusedIn);
    ok("1280 · …and saves nothing", (await page.locator(`${wording("basis.OWN_EVENT")} [data-wording-status="saved"]`).count()) === 0);
  }
  await box.fill(before);
  await wait(300);
  ok("1280 · restoring the words clears the problem", (await page.locator(`${wording("basis.OWN_EVENT")} [role="alert"]`).count()) === 0);

  // ⚠️ A FRESH CARD FIRST. Typing into a suggestion ticks its approval, and putting the words back leaves the tick on —
  // so basis.OWN_EVENT is still ticked from the step above, and a save now would approve it. A reload starts clean (the
  // guard's leave-page dialog is accepted by the handler above).
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(FORM, { timeout: 60_000 });
  await wait(400);

  // ⛔ m4 · a save asked for with NOTHING to save is never silent: a suggestion edited (it ticks itself), then unticked —
  // the card is dirty but sends nothing — and the bar's Save. A wording near the top, so the card's own Save is off screen.
  const roster = page.locator(`${wording("basis.AGENT_ROSTER")} textarea`).first();
  const rosterBefore = await roster.inputValue();
  await roster.scrollIntoViewIfNeeded();
  await roster.click();
  await roster.press("Control+End");
  await roster.type(" Kept.");
  await wait(250);
  const rosterTick = page.locator(wording("basis.AGENT_ROSTER")).getByRole("checkbox").first();
  ok("1280 · editing a suggestion ticks its approval", (await rosterTick.count()) === 1 && (await rosterTick.isChecked()));
  await page.locator(wording("basis.AGENT_ROSTER")).getByText(APPROVE, { exact: true }).click();
  await wait(250);
  ok("1280 · …and the tick can be taken off again", !(await rosterTick.isChecked()));
  const barNothing = page.locator('[data-pending-state="dirty"] button').filter({ hasText: /save/i }).first();
  const barThere = (await barNothing.count()) === 1 && (await barNothing.isVisible());
  ok("1280 · the pending bar offers its Save while the card's own is off screen (m4 check)", barThere);
  if (barThere) {
    await barNothing.click();
    await wait(500);
    ok("1280 · ⛔ m4 — the bar's Save with nothing to save says so, never a silent no-op", (await page.getByText(NOTHING_YET).count()) >= 1);
    await tile(page, "1280-04-nothing-to-save");
  }
  ok("1280 · …and saves nothing", (await page.locator(`${wording("basis.AGENT_ROSTER")} [data-wording-status="saved"]`).count()) === 0);
  ok("1280 · …and the words typed were not lost", (await roster.inputValue()) !== rosterBefore);

  // ⛔ m1 · A PAGE OPENED BEFORE SOMEBODY ELSE'S SAVE IS REFUSED, NEVER A QUIET SUPERSEDE — the server's rule, through the
  // real page: this page is (re)loaded showing version 1 of basis.OWN_FORM, then a second admin saves version 2.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(FORM, { timeout: 60_000 });
  await wait(400);
  {
    const second = await adminPage({ width: 1280, height: 800 }, { phone: SECOND_PHONE, name: SECOND_NAME });
    await openCard(second.page);
    const theirs = second.page.locator(`${wording("basis.OWN_FORM")} textarea`).first();
    await theirs.scrollIntoViewIfNeeded();
    await theirs.click();
    await theirs.press("Control+End");
    await theirs.type(" Kept on file.");
    await wait(250);
    await second.page.locator(FORM).getByRole("button", { name: "Save wordings" }).click();
    // Already "saved" (version 1) before the click — so wait for the words of version 2, not for the attribute.
    await statusOf(second.page, "basis.OWN_FORM").filter({ hasText: "Version 2," }).waitFor({ timeout: 30_000 }).catch(() => {});
    await wait(300);
    const theirLine = ((await statusOf(second.page, "basis.OWN_FORM").textContent().catch(() => "")) || "").trim();
    ok("1280 · a second admin saves version 2 of basis.OWN_FORM", /^Version 2, saved .+ by QA U33w Second/.test(theirLine), theirLine);
    await second.ctx.close();

    const mine = page.locator(`${wording("basis.OWN_FORM")} textarea`).first();
    await mine.scrollIntoViewIfNeeded();
    await mine.click();
    await mine.press("Control+End");
    await mine.type(" Read back to them.");
    await wait(250);
    await page.locator(FORM).getByRole("button", { name: "Save wordings" }).click();
    await page.waitForSelector(`${wording("basis.OWN_FORM")} [role="alert"]`, { timeout: 20_000 }).catch(() => {});
    await wait(500);
    const said = ((await page.locator(`${wording("basis.OWN_FORM")} [role="alert"]`).first().textContent().catch(() => "")) || "").trim();
    ok("1280 · ⛔ m1 — the page opened before that save is refused under the box, in words", said.includes(STALE), said);
    ok("1280 · …and the cursor is taken there", await page.evaluate(() => !!document.activeElement?.closest('[data-wording="basis.OWN_FORM"]')));
    await page.locator(wording("basis.OWN_FORM")).scrollIntoViewIfNeeded();
    await tile(page, "1280-05-stale-page-refused");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector(FORM, { timeout: 60_000 });
    const after = ((await statusOf(page, "basis.OWN_FORM").textContent().catch(() => "")) || "").trim();
    ok("1280 · …and nothing of it was saved: after a reload the wording is the second admin's version 2", /^Version 2, saved .+ by QA U33w Second/.test(after), after);
  }
  await ctx.close();
}

// ── 360 ──────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const { ctx, page } = await adminPage({ width: 360, height: 780 });
  await openCard(page);
  ok("360 · the card renders", (await page.locator(FORM).count()) === 1);
  ok("360 · the count line carries the earlier save (1 of 10)", (await countLine(page)) === "1 of 10 wordings saved.", await countLine(page));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok("360 · no sideways scroll", overflow <= 1, `${overflow}px`);
  await tile(page, "360-01-card-top");
  // Editing an unsaved wording approves it by itself (an edit is a decision), and the bar can save it.
  const key = "adult.consent";
  const box = page.locator(`${wording(key)} textarea`).first();
  await box.scrollIntoViewIfNeeded();
  await box.click();
  await box.press("End");
  await box.type(" ");
  await box.press("Backspace");
  await box.type(".");
  await box.press("Backspace");
  await box.type(" Read aloud.");
  await wait(300);
  const tick = page.locator(wording(key)).getByRole("checkbox").first();
  ok("360 · editing an unsaved wording ticks its approval", (await tick.count()) === 1 && (await tick.isChecked()));
  await tile(page, "360-02-edited-pending");
  // The bar (`data-pending-state="dirty"`) offers its Save only while the form's own Save is off screen (saveAnchor).
  const barSave = page.locator('[data-pending-state="dirty"] button').filter({ hasText: /save/i }).first();
  const viaBar = (await barSave.count()) === 1;
  if (viaBar) await barSave.click();
  else await page.locator(FORM).getByRole("button", { name: "Save wordings" }).click();
  await page.waitForSelector(`${wording(key)} [data-wording-status="saved"]`, { timeout: 20_000 }).catch(() => {});
  await wait(400);
  ok(`360 · the edited wording saves${viaBar ? " (from the pending-changes bar)" : " (from the card's Save — no bar found)"}`, (await page.locator(`${wording(key)} [data-wording-status="saved"]`).count()) === 1);
  ok("360 · the count line says 2 of 10", (await countLine(page)) === "2 of 10 wordings saved.", await countLine(page));
  const overflowAfter = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok("360 · still no sideways scroll after the save", overflowAfter <= 1, `${overflowAfter}px`);
  await page.locator(wording(key)).scrollIntoViewIfNeeded();
  await tile(page, "360-03-saved");
  await ctx.close();
}

await browser.close();
console.log(`\nu33w-wordings-drive: ${pass} passed, ${fail} failed`);
console.log(`shots: ${SHOTS}`);
process.exit(fail > 0 ? 1 : 0);
