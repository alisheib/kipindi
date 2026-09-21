/**
 * qa:desk-rules-flow — THE ACCOUNT CONFIGURATION FLOW, DRIVEN END TO END (2026-09-21).
 *
 *   SESSION_SECRET=… OTP_PEPPER=… DISABLE_ADMIN_TOTP=true npx next dev -p 3031
 *   KP_BASE=http://localhost:3031 npm run qa:desk-rules-flow
 *
 * ── WHY IT EXISTS ────────────────────────────────────────────────────────────────────────────────────────────
 * The owner reported, from managers using the live desk: *"changing checkboxes does not trigger the
 * pending-change toolbar"* and *"sometimes, after they change several checkboxes and save, it says Couldn't
 * save"*. Both were real, both were reproduced here before they were fixed, and neither could have been caught
 * by any suite this repository had: every existing house-bot console gate reads SOURCE or renders a view model,
 * and both defects lived in the gap between a real pointer event and a real React tree.
 *
 * ⛔ THE FIRST CHECK IS THE ONE THAT MATTERS, AND IT MUST BE A REAL CLICK. `checkbox.tsx` used to answer the
 * click on its `<label>` with `preventDefault()` and a React state update, so the underlying `<input>` was never
 * clicked and no native `click`/`input`/`change` was ever raised — which is all `useFormDirty` listens for. The
 * SPACE BAR worked perfectly, and so did every programmatic `.check()` a naive test would use. Only a pointer
 * on the label reproduces it, which is why this drive clicks the label and never the input.
 *
 * ⛔ LOCAL ONLY. It designates an account and saves limits, so it refuses any base that is not a loopback
 * address — the same rule `qa:house-bots-visual` carries, for the same reason.
 *
 * ⚠️ `localhost`, NOT `127.0.0.1`. Next 16 blocks cross-origin dev resources, and a drive pointed at the dotted
 * form loads a page that NEVER HYDRATES: every control is inert, nothing throws, and every interaction check
 * fails for a reason that has nothing to do with the product. Measured on the day this was written.
 */
import { chromium } from "playwright";

const BASE = process.env.KP_BASE ?? "http://localhost:3031";
if (!/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(BASE)) {
  console.error(`REFUSED — local dev only. KP_BASE was ${JSON.stringify(BASE)}.`);
  process.exit(2);
}
const SHOTS = process.env.KP_SHOTS ?? ".qa-house-bots/rules-flow";
const HOLDER_PW = "Holder2026!";

let fail = 0;
let n = 0;
const ok = (name, pass, detail = "") => {
  n++;
  console.log(`  ${pass ? "PASS" : "FAIL"} ${name}${pass || !detail ? "" : ` — ${detail}`}`);
  if (!pass) fail++;
};

const { mkdirSync } = await import("node:fs");
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await ctx.newPage();

/** ⛔ A console error is a failure of its own — a drive that ignores them measures half the page. */
const consoleErrors = [];
page.on("console", (m) => {
  const t = m.text();
  if (m.type() === "error" && !/webpack-hmr|Download the React DevTools/.test(t)) consoleErrors.push(t.slice(0, 200));
});
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 200)}`));

/**
 * ⛔ A FAILED CHECK MUST NOT END THE RUN. The first mutation proof of this file stopped at §3 because the
 * pending bar never appeared, so the Discard button never existed and Playwright threw 30 s later — which
 * reported ONE defect for a mutation that breaks two. A gate that dies on its first finding hides the rest,
 * and the rest is what tells you how far the damage reaches.
 */
const soft = async (what, fn, fallback = undefined) => {
  try { return await fn(); } catch (e) { consoleErrors.push(`soft(${what}): ${String(e).slice(0, 120)}`); return fallback; }
};
const clickIfThere = (name) =>
  soft(`click ${name}`, () => page.getByRole("button", { name }).click({ timeout: 4000 }));

const post = (path, data) => page.request.post(`${BASE}${path}`, { data });
const bar = () => page.evaluate(() => {
  const el = document.querySelector(".kp-rail.fixed");
  return el ? el.innerText.replace(/\s+/g, " ").trim() : null;
});
const toasts = () => page.evaluate(() =>
  [...document.querySelectorAll("[role=region] [role=status], [role=region] [role=alert]")]
    .map((e) => e.innerText.replace(/\s+/g, " ").trim()).filter(Boolean));
const clearToasts = async () => {
  await page.evaluate(() => document.querySelectorAll("[role=region] button").forEach((b) => b.click()));
  await page.waitForTimeout(350);
};
/** The PAINTED square, not the input: the bug class here is a box that disagrees with what it will submit. */
const boxState = (name) => page.evaluate((nm) => {
  const i = document.querySelector(`main form input[name="${nm}"]`);
  if (!i) return null;
  const span = i.parentElement?.querySelector("span[aria-hidden]");
  const bg = span ? getComputedStyle(span).backgroundColor : "";
  return { checked: i.checked, painted: !/rgba\(0, 0, 0, 0\)|transparent/.test(bg) };
}, name);
/** Click the LABEL with a real pointer — see the header. */
const clickSwitch = (name) =>
  page.locator("main form label").filter({ has: page.locator(`input[name="${name}"]`) }).click();
const capValues = () => page.evaluate(() =>
  Object.fromEntries([...document.querySelectorAll("main form input:not([type=checkbox])")].map((i) => [i.name, i.value])));
const invalidFields = () => page.evaluate(() =>
  [...document.querySelectorAll('main form input[aria-invalid="true"]')].map((i) => i.name));

console.log("──────────────────────────────────────────────────────────────────────");
console.log("qa:desk-rules-flow · create an account, configure it, and try to lose work");
console.log("──────────────────────────────────────────────────────────────────────");

// ── §1 · designate, through the real wizard ──────────────────────────────────────────────────────────────────
const tag = String(Date.now()).slice(-6);
const holder = await (await post("/api/dev-test/seed-admin", {
  phone: `+2557100${tag.slice(-5)}`, name: `Holder ${tag}`, role: "PLAYER", password: HOLDER_PW, balance: 500000,
})).json();
await post("/api/dev-test/seed-admin", {});

/* ⛔ THE THROTTLE IS REAL AND CORRECT IN PRODUCTION, and it accumulates across repeated local runs — a drive
   that designates an account every time eventually meets it and reports a broken wizard. Cleared per run, the
   same way the regulator-audit suites do it between sections. */
await soft("reset rate limits", () => post("/api/dev-test/reset-rate-limits", {}));

console.log("\n§1 · the wizard");
await page.goto(`${BASE}/admin/desk/new?u=${holder.userId}&step=consent`, { waitUntil: "load" });
await page.waitForTimeout(2500);
const nameBox = page.locator("main input:not([type=password])").first();
const cont = page.getByRole("button", { name: "Continue" });
for (let i = 0; i < 25 && (await cont.isDisabled()); i++) {
  await nameBox.fill("");
  await nameBox.pressSequentially(`Desk ${tag}`, { delay: 15 });
  await page.waitForTimeout(200);
}
ok("1.1 the name field reaches React (the step arms)", !(await cont.isDisabled()));
await cont.click();
await page.waitForURL(/step=review/, { timeout: 20000 });
await page.waitForTimeout(1200);
await page.locator("main input[type=password]").fill(HOLDER_PW);
await page.getByRole("button", { name: "Designate" }).click();
await page.waitForURL(/\/admin\/desk\/(?!new)[^/?#]+/, { timeout: 25000 }).catch(() => {});
const ACCOUNT = (page.url().match(/\/admin\/desk\/((?!new)[^/?#]+)/) ?? [])[1] ?? "";
ok("1.2 designation lands on an account page", ACCOUNT !== "", page.url());
/* ⛔ A fresh account has THIRTEEN blockers and every one of them is on Rules. Landing on the overview made the
   first screen after creating an account a summary of nothing. */
ok("1.3 …and it lands on the RULES tab, where every blocker is", /[?&]tab=rules/.test(page.url()), page.url());

if (!ACCOUNT) { console.log("\nno account — cannot continue"); await browser.close(); process.exit(1); }
const RULES = `${BASE}/admin/desk/${ACCOUNT}?tab=rules`;
await page.goto(RULES, { waitUntil: "load" });
await page.waitForTimeout(3000);

// ── §2 · the form explains itself ────────────────────────────────────────────────────────────────────────────
console.log("\n§2 · every field says what it does");
const capHelp = await page.evaluate(() =>
  [...document.querySelectorAll("main form [data-field]")].map((d) => ({
    key: d.getAttribute("data-field"),
    text: d.innerText.replace(/\s+/g, " ").trim(),
  })));
ok("2.1 all fourteen limits render", capHelp.length === 14, `saw ${capHelp.length}`);
const helpless = capHelp.filter((c) => c.text.length < 60);
ok("2.2 every limit carries an explanation", helpless.length === 0, helpless.map((h) => h.key).join(", "));
const flagHelp = await page.evaluate(() =>
  [...document.querySelectorAll("main form input[type=checkbox]")].map((i) => ({
    key: i.name,
    help: (i.closest("div")?.querySelector("p")?.innerText ?? "").trim(),
  })));
ok("2.3 all ten switches render", flagHelp.length === 10, `saw ${flagHelp.length}`);
ok("2.4 every switch carries an explanation", flagHelp.every((f) => f.help.length > 20),
  flagHelp.filter((f) => f.help.length <= 20).map((f) => f.key).join(", "));
/* The two switches nothing on this build can act on say so, above them. */
ok("2.5 the by-hand section warns that no screen can act on it yet",
  (await page.locator("main form").getByText(/No screen on this build can do that yet, so an account/).count()) > 0);

// ── §3 · THE REPORTED BUG · a real pointer on a real checkbox ────────────────────────────────────────────────
console.log("\n§3 · a mouse click arms the pending bar (the owner's report)");
ok("3.1 nothing is pending before the click", (await bar()) === null);
await soft("switch product-updown", () => clickSwitch("product-updown"));
await page.waitForTimeout(500);
ok("3.2 a MOUSE click on a switch arms the pending bar", (await bar()) !== null, "this is the reported defect");
const afterClick = await boxState("product-updown");
ok("3.3 …and the painted box agrees with what will be submitted",
  afterClick && afterClick.checked === true && afterClick.painted === true, JSON.stringify(afterClick));

// ── §4 · Discard actually discards ───────────────────────────────────────────────────────────────────────────
console.log("\n§4 · Discard");
await clickIfThere("Discard");
await page.waitForTimeout(700);
const afterDiscard = await boxState("product-updown");
ok("4.1 Discard clears the pending bar", (await bar()) === null);
ok("4.2 …and puts the switch back, in the DOM AND in the paint",
  afterDiscard && afterDiscard.checked === false && afterDiscard.painted === false, JSON.stringify(afterDiscard));

// ── §5 · fill and empty ──────────────────────────────────────────────────────────────────────────────────────
console.log("\n§5 · the two controls that fill and empty");
await clearToasts();
await clickIfThere("Use starting values");
await page.waitForTimeout(900);
const filled = await capValues();
const filledCount = Object.values(filled).filter((v) => v !== "").length;
ok("5.1 starting values fill the empty limits", filledCount >= 13, `${filledCount} filled`);
ok("5.2 …and filling arms the pending bar (it is not a silent write)", (await bar()) !== null);
ok("5.3 …and it says nothing is saved yet", (await toasts()).some((t) => /Nothing is saved yet/.test(t)));

await clearToasts();
await clickIfThere("Empty every limit");
await page.waitForTimeout(600);
const dialog = await soft("dialog", () => page.locator("[role=alertdialog]").innerText({ timeout: 4000 }), "") ?? "";
ok("5.4 emptying asks first", /Empty every limit\?/.test(dialog), dialog.slice(0, 80));
await clickIfThere("Empty them");
await page.waitForTimeout(800);
ok("5.5 …and then every limit box is empty", Object.values(await capValues()).every((v) => v === ""));

// put the good values back for the save
await clickIfThere("Use starting values");
await page.waitForTimeout(900);

// ── §6 · a refusal names EVERY problem and goes to the first ─────────────────────────────────────────────────
console.log("\n§6 · a refusal");
await clearToasts();
for (const [k, v] of Object.entries({ "stake-min": "9000", "stake-max": "1000", "min-gap": "-5" })) {
  await soft(`fill ${k}`, () => page.locator(`main form input[name="${k}"]`).fill(v, { timeout: 4000 }));
}
await page.waitForTimeout(300);
await soft("submit", () => page.locator("main form button[type=submit]").click({ timeout: 4000 }));
await page.waitForTimeout(3000);
const refusal = (await toasts()).join(" ~~ ");
const marked = await invalidFields();
ok("6.1 the save is refused and says so", /Couldn't save/.test(refusal), refusal.slice(0, 160));
ok("6.2 EVERY wrong field is marked, not just the first", marked.length >= 2, JSON.stringify(marked));
ok("6.3 …and the message says how many", /\d+ fields need fixing/.test(refusal) || marked.length === 1, refusal.slice(0, 160));
ok("6.4 …and focus is taken to a marked field",
  marked.includes(await page.evaluate(() => document.activeElement?.getAttribute("name") ?? "")),
  await page.evaluate(() => document.activeElement?.tagName ?? ""));
/**
 * ⛔ NO FIELD MAY CONTRADICT ITSELF. 🔴 Read off a rendered refusal before this was fixed: a box reading
 * "200000" printed "Not set — this account cannot place a bet." directly underneath, because the box shows
 * what was typed and the sentence was chosen from what was stored. One field, two statements, opposite
 * meanings — on the panel whose whole job is to say which limits are missing.
 */
const contradictions = await page.evaluate(() =>
  [...document.querySelectorAll("main form [data-field]")]
    .map((d) => {
      const input = d.querySelector("input");
      const text = d.innerText.replace(/\s+/g, " ");
      return input && input.value.trim() !== "" && /Not set/.test(text)
        ? `${d.getAttribute("data-field")}="${input.value}" but says "Not set"` : null;
    }).filter(Boolean));
ok("6.5 no field says it is unset while holding a value", contradictions.length === 0, contradictions.join(" | "));
await page.screenshot({ path: `${SHOTS}/refusal-1440.png` });

// ── §7 · the save itself ─────────────────────────────────────────────────────────────────────────────────────
console.log("\n§7 · a save that lands");
await clearToasts();
await clickIfThere("Empty every limit");
await page.waitForTimeout(500);
await clickIfThere("Empty them");
await page.waitForTimeout(600);
await clickIfThere("Use starting values");
await page.waitForTimeout(900);
await soft("switch product-updown", () => clickSwitch("product-updown"));
await soft("switch updown-react", () => clickSwitch("updown-react"));
await page.waitForTimeout(400);
await clearToasts();
await soft("submit", () => page.locator("main form button[type=submit]").click({ timeout: 4000 }));
await page.waitForTimeout(4000);
const saved = (await toasts()).join(" ~~ ");
ok("7.1 the save lands", /Saved/.test(saved) && !/Couldn't save/.test(saved), saved.slice(0, 160));
ok("7.2 …and the pending bar goes away", (await bar()) === null);

// a SECOND save straight after the first must not meet a version conflict
await clearToasts();
await soft("fill bets-per-day", () => page.locator('main form input[name="bets-per-day"]').fill("180", { timeout: 4000 }));
await page.waitForTimeout(300);
await soft("submit", () => page.locator("main form button[type=submit]").click({ timeout: 4000 }));
await page.waitForTimeout(4000);
const saved2 = (await toasts()).join(" ~~ ");
ok("7.3 a second save straight after the first also lands", /Saved/.test(saved2) && !/Couldn't save/.test(saved2), saved2.slice(0, 160));

// ── §8 · the exit nobody can stand at ────────────────────────────────────────────────────────────────────────
console.log("\n§8 · work survives a sudden quit");
await clearToasts();
await soft("fill bets-per-hour", () => page.locator('main form input[name="bets-per-hour"]').fill("17", { timeout: 4000 }));
await soft("switch polls-fill", () => clickSwitch("polls-fill"));
await page.waitForTimeout(900); // let the draft debounce land
/* ⛔ A RELOAD IS THE HONEST STAND-IN FOR EVERY UNCATCHABLE EXIT: the tab is gone and nothing got to run. */
await page.goto(RULES, { waitUntil: "load" });
await page.waitForTimeout(3200);
const offered = await page.locator("main").getByText(/Unsaved changes from earlier/).count();
ok("8.1 the work left behind is OFFERED back after the page is gone", offered > 0);
ok("8.2 …and nothing was applied on its own", (await capValues())["bets-per-hour"] !== "17",
  `read back ${(await capValues())["bets-per-hour"]}`);
await clickIfThere("Put them back");
await page.waitForTimeout(900);
ok("8.3 …and it restores on request", (await capValues())["bets-per-hour"] === "17");
const restoredBox = await boxState("polls-fill");
ok("8.4 …including the switches, painted correctly", restoredBox && restoredBox.checked && restoredBox.painted,
  JSON.stringify(restoredBox));
ok("8.5 …and restoring arms the pending bar", (await bar()) !== null);

await clearToasts();
await soft("submit", () => page.locator("main form button[type=submit]").click({ timeout: 4000 }));
await page.waitForTimeout(4000);
await page.goto(RULES, { waitUntil: "load" });
await page.waitForTimeout(3000);
ok("8.6 a saved form offers nothing back — the draft is gone",
  (await page.locator("main").getByText(/Unsaved changes from earlier/).count()) === 0);

await page.screenshot({ path: `${SHOTS}/rules-1440.png` });
await page.setViewportSize({ width: 390, height: 900 });
await page.waitForTimeout(600);
await page.screenshot({ path: `${SHOTS}/rules-390.png` });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
ok("8.7 the form does not scroll sideways on a phone", !overflow);

console.log("\n§9 · the page itself");
const realErrors = consoleErrors.filter((e) => !e.startsWith("soft("));
ok("9.1 no console or page errors anywhere in the flow", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));
if (consoleErrors.length !== realErrors.length) {
  console.log(`  note · ${consoleErrors.length - realErrors.length} step(s) could not run (see FAILs above)`);
}

/**
 * ⛔ THE DRIVE PUTS THE ROSTER BACK, AND THAT IS NOT TIDINESS — IT IS WHAT MAKES THE GATE REPEATABLE.
 *
 * 🔴 `maxDesignatedBots` defaults to 5 and every run designates one more, so the sixth run met a perfectly
 * correct refusal — "The roster is full (5 of 5)" — and reported a broken wizard. It cost a mutation proof
 * before it was traced: a run with a deliberately broken checkbox failed at §1 and never reached §3, which was
 * the section the mutation existed to prove. A gate whose own residue makes it fail teaches people to ignore it.
 * ⭐ REMOVING ITS OWN ACCOUNT, NOT RAISING THE LIMIT. Raising it would edit a real global control to make a test
 * pass — and that limit is one of the eight the master switch needs, so a gate must never widen the thing it is
 * there to measure. This removes exactly the one account this run created.
 * ⚠️ Soft throughout: a cleanup that cannot run must never turn a green flow into a red one. If it fails the
 * next run's §1 will say the roster is full, in the product's own words, which is the honest signal.
 */
console.log("\n§10 · putting the roster back");
const removed = await soft("remove the drive's account", async () => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(`${BASE}/admin/desk/${ACCOUNT}`, { waitUntil: "load" });
  await page.waitForTimeout(2200);
  await page.getByRole("button", { name: /Remove/ }).first().click({ timeout: 5000 });
  await page.waitForTimeout(800);
  /* ⚠️ Remove is a HARD ceremony — a required reason AND the word typed out. That is correct for an act that
     cancels every queued stake and ends every target, and it is why this cleanup drives the real controls
     rather than reaching for a back door: a fixture that bypassed the ceremony would stop proving it works. */
  const dlg = page.locator("[role=dialog], [role=alertdialog]").last();
  await soft("reason", () => dlg.locator("textarea").first().fill("Cleared by the flow drive.", { timeout: 3000 }));
  /* ⚠️ `input`, not `input[type=text]`: the kit's Input sets no `type` attribute for a text field, so the
     attribute selector matches nothing while `el.type` still reads "text" in a probe. That mismatch cost a
     debugging round here and again in the wizard — the DOM property is not the attribute. */
  await soft("typed word", () => dlg.locator("input").first().fill("REMOVE", { timeout: 2500 }));
  await page.waitForTimeout(300);
  await dlg.getByRole("button", { name: /^Remove$/ }).last().click({ timeout: 4000 });
  await page.waitForTimeout(2500);
  await page.goto(`${BASE}/admin/desk`, { waitUntil: "load" });
  await page.waitForTimeout(1800);
  return page.evaluate((id) => !document.querySelector(`a[href^="/admin/desk/${id}"]`), ACCOUNT);
}, false);
ok("10.1 the drive leaves the roster as it found it", removed === true,
  "the next run will meet the product's own 'roster is full' refusal at §1");

console.log("\n──────────────────────────────────────────────────────────────────────");
console.log(`${n - fail}/${n} passed · account ${ACCOUNT} · tiles in ${SHOTS}`);
console.log("──────────────────────────────────────────────────────────────────────");
await browser.close();
process.exit(fail === 0 ? 0 : 1);
