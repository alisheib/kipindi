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
/**
 * ⛔ THE BAR HAS TWO STATES ON ONE ELEMENT (2026-09-26): "dirty" (unsaved work, Discard, maybe Save) and, for
 * 2.5 s after a save lands, "saved" (a word and no button). `bar()` reads ONLY the dirty state, so "the bar is
 * up" (5.2, 8.5) cannot pass on a Saved bar and "the bar went away" (7.2) is not failed by one.
 */
const bar = () => page.evaluate(() => {
  const el = document.querySelector('.kp-rail.fixed[data-pending-state="dirty"]');
  return el ? el.innerText.replace(/\s+/g, " ").trim() : null;
});
const savedBar = () => page.evaluate(() => {
  const el = document.querySelector('.kp-rail.fixed[data-pending-state="saved"]');
  return el ? { text: el.innerText.replace(/\s+/g, " ").trim(), buttons: el.querySelectorAll("button").length } : null;
});
/**
 * ⚠️ THE SAVED STATE DWELLS 2.5 s AND `submitForm` SPENDS OVER 1 s SETTLING, so a read after it can race the
 * dwell. This records the FIRST saved state the page paints; `savedSeen()` hands it back and stops recording.
 */
const watchSaved = () => page.evaluate(() => {
  window.__kpSavedSeen = null;
  const read = () => {
    const el = document.querySelector('.kp-rail.fixed[data-pending-state="saved"]');
    if (!el || window.__kpSavedSeen) return;
    window.__kpSavedSeen = {
      text: el.innerText.replace(/\s+/g, " ").trim(),
      buttons: el.querySelectorAll("button").length,
      role: el.getAttribute("role"),
      live: el.getAttribute("aria-live"),
    };
  };
  const mo = new MutationObserver(read);
  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-pending-state"] });
  window.__kpSavedStop = () => mo.disconnect();
});
const savedSeen = () => page.evaluate(() => { window.__kpSavedStop?.(); return window.__kpSavedSeen ?? null; });
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
/* ⛔ THE LIMITS, SCOPED TO THEIR OWN SECTION (2026-09-23). "Empty every limit" empties the CAPS — it has never
   touched the numeric rules, and nor should it: those are behaviour, not ceilings, and emptying a delay would
   leave an account that cannot be saved. A form-wide query started counting 51 boxes the day the editor landed. */
const capValues = () => page.evaluate(() =>
  Object.fromEntries([...document.querySelectorAll('main form [data-rules="limits"] input:not([type=checkbox])')].map((i) => [i.name, i.value])));
const invalidFields = () => page.evaluate(() =>
  [...document.querySelectorAll('main form input[aria-invalid="true"]')].map((i) => i.name));
/**
 * ⛔ SUBMIT, THEN WAIT FOR THE TRANSITION TO END — NEVER A FIXED DELAY (2026-09-22). The form's Save is the kit's
 * Button with `loading={pending}`, which sets `aria-busy` and `disabled` for exactly as long as the server action is
 * in flight. A fixed 3–4 s wait raced it: on a dev server compiling the action's chunk on its first call — measured
 * at 24.5 s under load — every check after the submit read the form MID-FLIGHT (no toast yet, every control
 * disabled), and the failures cascaded through the next four sections. A gate that fails for a reason that has
 * nothing to do with the product teaches people to ignore it.
 */
const submitForm = async (maxMs = 120_000) => {
  await soft("submit", () => page.locator("main form button[type=submit]").click({ timeout: 4000 }));
  await page.waitForTimeout(250);
  await page.waitForFunction(() => {
    const b = document.querySelector("main form button[type=submit]");
    return !!b && !b.disabled && b.getAttribute("aria-busy") !== "true";
  }, null, { timeout: maxMs }).catch(() => consoleErrors.push("soft(submit settle): the Save button stayed busy"));
  /* the toast paints on the next frame after the transition; the router refresh that follows a landed save may
     take a moment more, and the checks below read the toast first */
  await page.waitForTimeout(900);
};

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

/* ⭐ A FRESH ACCOUNT IS INERT, AND THE ROSTER SAYS SO ON ITS ROW (2026-09-22): no product, no mode — the row carries
   the first reason in the warning tone with the Rules tab as the way out, in the ACCOUNT cell under the handle (the
   first column, on screen at 360 without a sideways scroll — review finding 2026-09-22), while the status chip three
   columns on keeps saying what the lifecycle is. Read before the account is configured, so the line is measured in
   the state it exists for. */
console.log("\n§1b · the roster's own refusal on a fresh account");
await page.goto(`${BASE}/admin/desk`, { waitUntil: "load" });
await page.waitForTimeout(2200);
const freshRow = await page.evaluate((id) => {
  const link = document.querySelector(`main a[href^="/admin/desk/${id}"]`);
  const tr = link?.closest("tr");
  if (!tr) return null;
  const inert = tr.querySelector('a[href$="tab=rules"]');
  return { text: tr.innerText.replace(/\s+/g, " ").trim(), inert: inert ? inert.innerText.trim() : null, href: inert ? inert.getAttribute("href") : null };
}, ACCOUNT);
ok("1b.1 the fresh account's row carries `Can't bet — Choose at least one product.` as a link to its Rules tab",
  freshRow && freshRow.inert !== null && /^Can't bet — Choose at least one product\./.test(freshRow.inert) && freshRow.href === `/admin/desk/${ACCOUNT}?tab=rules`,
  JSON.stringify(freshRow));
ok("1b.2 …and the scope cell reads None rather than a product word", freshRow && /\bNone\b/.test(freshRow.text), freshRow?.text.slice(0, 160));

await page.goto(RULES, { waitUntil: "load" });
await page.waitForTimeout(3000);

// ── §2 · the form explains itself ────────────────────────────────────────────────────────────────────────────
console.log("\n§2 · every field says what it does");
/* ⛔ THE LIMITS ARE THE `[data-field]` WRAPPERS THAT HOLD A TYPED BOX (2026-09-22): the ten switches and the two
   pickers carry the same address now, so a refusal can mark them, and a count of every wrapper would read 26. */
const capHelp = await page.evaluate(() =>
  [...document.querySelectorAll('main form [data-rules="limits"] [data-field]')]
    .filter((d) => d.querySelector("input:not([type=checkbox]):not([type=hidden])"))
    .map((d) => ({
      key: d.getAttribute("data-field"),
      text: d.innerText.replace(/\s+/g, " ").trim(),
    })));
ok("2.1 all fourteen limits render", capHelp.length === 14, `saw ${capHelp.length}`);
const helpless = capHelp.filter((c) => c.text.length < 60);
ok("2.2 every limit carries an explanation", helpless.length === 0, helpless.map((h) => h.key).join(", "));
/* ⛔ THE SWITCHES ARE THE BOXES OUTSIDE THE TWO PICKER GROUPS (2026-09-22): a picker box is a list member, not a
   switch, and a count that took every checkbox on the form would read the seven categories as seven switches. */
const flagHelp = await page.evaluate(() =>
  [...document.querySelectorAll("main form input[type=checkbox]")].filter((i) => !i.closest("[data-list]") && !i.closest('[data-rules="numbers"]')).map((i) => ({
    key: i.name,
    help: (i.closest("div")?.querySelector("p")?.innerText ?? "").trim(),
  })));
ok("2.3 all ten switches render", flagHelp.length === 10, `saw ${flagHelp.length}`);
ok("2.4 every switch carries an explanation", flagHelp.every((f) => f.help.length > 20),
  flagHelp.filter((f) => f.help.length <= 20).map((f) => f.key).join(", "));
/* The two switches nothing on this build can act on say so, above them. */
ok("2.5 the by-hand section warns that no screen can act on it yet",
  (await page.locator("main form").getByText(/No screen on this build can do that yet, so an account/).count()) > 0);

/**
 * ⭐ THE SCOPE PICKERS (prod finding 2026-09-22). An ACTIVE account on the live desk had matched no market, ever:
 * both products ticked, both scope lists EMPTY, and no screen able to set either — this form drew no picker. The
 * two groups now sit under the product switches; each stays on screen while its product is off and says so, each
 * carries a sentence, and the category group is the platform's own seven topics as words.
 */
console.log("\n§2b · the two scope pickers");
const pickers = await page.evaluate(() =>
  [...document.querySelectorAll("main form [data-list]")].filter((g) => !g.closest('[data-rules="numbers"]')).map((g) => ({
    key: g.getAttribute("data-list"),
    legend: (g.querySelector("legend")?.innerText ?? "").trim(),
    text: g.innerText.replace(/\s+/g, " ").trim(),
    boxes: [...g.querySelectorAll("input[type=checkbox]")].map((i) => ({ name: i.name, value: i.value, checked: i.checked })),
  })));
const catGroup = pickers.find((p) => p.key === "poll-categories");
const chainGroup = pickers.find((p) => p.key === "updown-chains");
ok("2b.1 both pickers render, chains first, each with a legend", pickers.length === 2 && pickers[0].key === "updown-chains" && !!catGroup && !!chainGroup
  && pickers.every((p) => p.legend.length > 3), JSON.stringify(pickers.map((p) => [p.key, p.legend])));
ok("2b.2 the category picker holds the platform's seven topics as WORDS, each valued by its key and none ticked",
  !!catGroup && catGroup.boxes.length === 7 && catGroup.boxes.every((b) => b.checked === false && /^poll-categories\./.test(b.name) && b.value === b.name.slice("poll-categories.".length))
    && /Sports/.test(catGroup.text) && !/\bsports\b/.test(catGroup.text.replace(/poll-categories\.\w+/g, "")),
  JSON.stringify(catGroup?.boxes.map((b) => b.value)));
ok("2b.3 while Polls is off, its picker stays on screen and says it applies once Polls is on",
  !!catGroup && /applies once Polls is switched on/.test(catGroup.text), catGroup?.text.slice(0, 120));
ok("2b.4 the chain picker either lists the platform's chains as `SYMBOL N-min` or says plainly that none is available yet — never an empty row of nothing",
  !!chainGroup && (chainGroup.boxes.length > 0
    ? chainGroup.boxes.every((b) => /^[^:]+:\d+$/.test(b.value)) && /\d+-min/.test(chainGroup.text)
    : /No Up & Down chain is available on this platform yet/.test(chainGroup.text)),
  chainGroup?.text.slice(0, 140));
ok("2b.5 no picker word names the feature", pickers.every((p) => !/\b(bots?|house|counter)\b/i.test(p.text)), "");

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
/**
 * ⛔ EXACTLY ONE SAVE IS ON SCREEN AT ANY SCROLL POSITION (owner, 2026-09-22: *"we have 2 save
 * buttons, one pending changes and one always there, I don't know when should both be visible"*).
 * The bar's Save is a shortcut to a button you cannot see; the moment you can see it, it is a
 * duplicate. Measured at BOTH ends of the page, because a rule that holds at one is not the rule.
 */
console.log("\n§3b · one Save, never two");
const visibleSaves = () => page.evaluate(() =>
  [...document.querySelectorAll(".kp-rail.fixed button, main form button")]
    .filter((b) => /Save/i.test(b.innerText))
    .filter((b) => { const r = b.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight && r.width > 0; })
    .map((b) => (b.closest(".kp-rail") ? "BAR" : "FORM")));
await soft("scroll top", () => page.evaluate(() => window.scrollTo(0, 0)));
await page.waitForTimeout(900);
const atTop = (await visibleSaves()) ?? [];
ok("3b.1 scrolled AWAY from the form's Save, the bar carries the only one", atTop.length === 1 && atTop[0] === "BAR", JSON.stringify(atTop));
await soft("scroll bottom", () => page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)));
await page.waitForTimeout(1200);
const atBottom = (await visibleSaves()) ?? [];
ok("3b.2 scrolled TO the form's Save, the bar drops its own and the form's is the only one",
  atBottom.length === 1 && atBottom[0] === "FORM", JSON.stringify(atBottom));
ok("3b.3 …and the bar still says there are unsaved changes, and still offers Discard",
  /UNSAVED CHANGES/i.test((await bar()) ?? "") && /Discard/.test((await bar()) ?? ""), (await bar() ?? "").slice(0, 80));

console.log("\n§4 · Discard");
await clickIfThere("Discard");
await page.waitForTimeout(700);
const afterDiscard = await boxState("product-updown");
ok("4.1 Discard clears the pending bar", (await bar()) === null);
/* ⛔ Discard is not a save, and a bar that said "Saved" here would be a lie about the officer's money rules. */
ok("4.1b …and it does not claim a save", (await savedBar()) === null, JSON.stringify(await savedBar()));
ok("4.2 …and puts the switch back, in the DOM AND in the paint",
  afterDiscard && afterDiscard.checked === false && afterDiscard.painted === false, JSON.stringify(afterDiscard));

/* ⭐ THE SAME REAL-POINTER RULE, ON A PICKER BOX: the label is the hit area and the click must reach the form. */
console.log("\n§4b · a mouse click on a picker box arms the bar, and Discard puts it back");
await soft("switch poll-categories.sports", () => clickSwitch("poll-categories.sports"));
await page.waitForTimeout(500);
ok("4b.1 a MOUSE click on a category label arms the pending bar", (await bar()) !== null);
const sportsOn = await boxState("poll-categories.sports");
ok("4b.2 …and the painted box agrees with what will be submitted", sportsOn && sportsOn.checked === true && sportsOn.painted === true, JSON.stringify(sportsOn));
await clickIfThere("Discard");
await page.waitForTimeout(700);
const sportsBack = await boxState("poll-categories.sports");
ok("4b.3 Discard puts the category box back, in the DOM and in the paint", (await bar()) === null && sportsBack && sportsBack.checked === false && sportsBack.painted === false, JSON.stringify(sportsBack));

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
await submitForm();
const refusal = (await toasts()).join(" ~~ ");
const marked = await invalidFields();
ok("6.1 the save is refused and says so", /Couldn't save/.test(refusal), refusal.slice(0, 160));
ok("6.1b …and the bar stays on the unsaved work — never \"Saved\" over a refusal",
  (await bar()) !== null && (await savedBar()) === null, JSON.stringify({ bar: await bar(), saved: await savedBar() }));
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
  [...document.querySelectorAll('main form [data-rules="limits"] [data-field]')]
    .map((d) => {
      const input = d.querySelector("input");
      const text = d.innerText.replace(/\s+/g, " ");
      return input && input.value.trim() !== "" && /Not set/.test(text)
        ? `${d.getAttribute("data-field")}="${input.value}" but says "Not set"` : null;
    }).filter(Boolean));
ok("6.5 no field says it is unset while holding a value", contradictions.length === 0, contradictions.join(" | "));
await page.screenshot({ path: `${SHOTS}/refusal-1440.png` });

// ── §6b · a product with nothing chosen is refused ON ITS PICKER ────────────────────────────────────────────
/**
 * ⛔ THE FINDING'S OWN SHAPE, AT THE SAVE (2026-09-22). Polls ticked with no category used to SAVE, START and match
 * nothing for ever. It is refused now — and the refusal must mark the GROUP, name the remedy and take focus there,
 * or it is a refusal naming a box the officer has to find by hand.
 */
console.log("\n§6b · Polls with no category is refused on the category picker");
await clearToasts();
await clickIfThere("Empty every limit");
await page.waitForTimeout(500);
await clickIfThere("Empty them");
await page.waitForTimeout(600);
await clickIfThere("Use starting values");
await page.waitForTimeout(900);
await soft("switch product-polls", () => clickSwitch("product-polls"));
await soft("switch polls-react", () => clickSwitch("polls-react"));
await page.waitForTimeout(400);
await clearToasts();
await submitForm();
const noCategory = (await toasts()).join(" ~~ ");
const groupMark = await page.evaluate(() => {
  const g = document.querySelector('main form [data-list="poll-categories"]');
  if (!g) return null;
  return {
    groupInvalid: g.getAttribute("aria-invalid"),
    boxesInvalid: [...g.querySelectorAll("input[type=checkbox]")].every((i) => i.getAttribute("aria-invalid") === "true"),
    sentence: (g.querySelector("[role=alert]")?.innerText ?? "").trim(),
    focusInside: g.contains(document.activeElement),
  };
});
ok("6b.1 the save is refused", /Couldn't save/.test(noCategory), noCategory.slice(0, 160));
ok("6b.2 the category GROUP is marked — aria-invalid on the fieldset and on every box in it", groupMark && groupMark.groupInvalid === "true" && groupMark.boxesInvalid, JSON.stringify(groupMark));
ok("6b.3 …and the sentence names the remedy, under the group", groupMark && /Choose at least one poll category, or turn Polls off/.test(groupMark.sentence), groupMark?.sentence);
ok("6b.4 …and focus is taken into the group", groupMark && groupMark.focusInside === true, JSON.stringify(groupMark));
ok("6b.5 …and no limit box is marked for a refusal that is not about it", (await invalidFields()).every((n) => /^poll-categories\./.test(n)), JSON.stringify(await invalidFields()));
await page.screenshot({ path: `${SHOTS}/picker-refused-1440.png` });

// ── §7 · the save itself ─────────────────────────────────────────────────────────────────────────────────────
console.log("\n§7 · a save that lands");
await clearToasts();
await soft("switch poll-categories.sports", () => clickSwitch("poll-categories.sports"));
await page.waitForTimeout(400);
await soft("watch for Saved", () => watchSaved());
await submitForm();
const saved = (await toasts()).join(" ~~ ");
const seenSaved = await soft("read Saved", () => savedSeen(), null);
ok("7.1 the save lands once a category is chosen", /Saved/.test(saved) && !/Couldn't save/.test(saved), saved.slice(0, 160));
ok("7.2 …and the pending bar goes away", (await bar()) === null);
ok("7.2a …and in its place the bar says Saved, with no button, as the same polite status",
  !!seenSaved && /^saved$/i.test(seenSaved.text) && seenSaved.buttons === 0 && seenSaved.role === "status" && seenSaved.live === "polite",
  JSON.stringify(seenSaved));
ok("7.2b …and the group's mark is gone", (await invalidFields()).length === 0, JSON.stringify(await invalidFields()));

// a SECOND save straight after the first must not meet a version conflict
await clearToasts();
await soft("fill bets-per-day", () => page.locator('main form input[name="bets-per-day"]').fill("180", { timeout: 4000 }));
await page.waitForTimeout(300);
await submitForm();
const saved2 = (await toasts()).join(" ~~ ");
ok("7.3 a second save straight after the first also lands", /Saved/.test(saved2) && !/Couldn't save/.test(saved2), saved2.slice(0, 160));

// ── §7b · the why-panel names a reason, Start refuses with it and a link, and the panel empties on the fix ──
/**
 * ⭐ WHY THIS ACCOUNT IS NOT BETTING (2026-09-22). With Polls on, a category chosen and its one mode switched
 * OFF again, the rules SAVE (that is not a save-time rule) and Start REFUSES (it is): the overview's panel names
 * the reason, the Start dialog's refusal carries the same sentence with an "Open Rules →" link that closes the
 * dialog on the way, and putting the mode back empties the panel to its one sentence — read on the page itself.
 */
console.log("\n§7b · the why-panel, the Start refusal and the way out");
await clearToasts();
await soft("switch polls-react off", () => clickSwitch("polls-react"));
await page.waitForTimeout(400);
await submitForm();
const savedNoMode = (await toasts()).join(" ~~ ");
ok("7b.1 a product with a category but no mode SAVES (it is a Start-time refusal, not a save-time one)", /Saved/.test(savedNoMode) && !/Couldn't save/.test(savedNoMode), savedNoMode.slice(0, 160));
const whyCard = () => page.evaluate(() => {
  const main = document.querySelector("main");
  /* The headline follows the lifecycle (review finding 2026-09-22): this account is PAUSED (fresh from designation),
     so with items it is headed "Why this account can't start"; with none, the topic heading "Rules and limits". */
  const titled = /Why this account can't start|Rules and limits/.test(main?.innerText ?? "");
  const items = [...document.querySelectorAll("main [data-why-item]")].map((li) => li.innerText.replace(/\s+/g, " ").trim());
  const empty = document.querySelector("main [data-why-empty]")?.innerText?.trim() ?? null;
  const link = [...document.querySelectorAll("main a")].find((a) => /Open Rules/.test(a.innerText));
  return { present: titled && (items.length > 0 || empty !== null), items, empty, link: link ? link.getAttribute("href") : null };
});
await page.goto(`${BASE}/admin/desk/${ACCOUNT}?tab=overview`, { waitUntil: "load" });
await page.waitForTimeout(2600);
const whyOverview = await whyCard();
/* RE-AIMED BY M7 (2026-09-23). It read the overview's WHY-PANEL, and the overview no longer draws one while the
   callout above the rail is naming the same blockers - one screen states them once. What the overview must still
   do is NAME the reason where an officer cannot miss it and offer the way to it; both are measured here, and the
   panel with its remedy sentence is measured on the Rules tab at 7b.7, where the form that fixes it is. */
const overviewStates = await page.evaluate(() => {
  const main = document.querySelector("main");
  const box = [...(main?.querySelectorAll("[role=status]") ?? [])].map((e) => e.innerText.replace(/\s+/g, " ").trim())
    .find((t) => /thing(s)? (to fix|stop)/.test(t)) ?? null;
  const badge = [...(main?.querySelectorAll('a[href*="tab=rules"]') ?? [])].map((a) => a.innerText.replace(/\s+/g, " ").trim());
  return { box, panels: main?.querySelectorAll("[data-why-item], [data-why-empty]").length ?? 0, badge };
});
/* With Polls the only product and its only mode now off, nothing is on at all - the rules' one global reason. */
ok("7b.2 the overview NAMES the reason above the rail - one blocker, `Entry modes` - and does NOT restate it in a panel below (M7, 432(n))",
  typeof overviewStates.box === "string" && /1 thing/.test(overviewStates.box) && /Entry modes/.test(overviewStates.box)
    && whyOverview.present === false && overviewStates.panels === 0,
  JSON.stringify(overviewStates).slice(0, 260));
ok("7b.3 ...and the way to it is the rail's own `Rules` tab, carrying the same count as a badge",
  overviewStates.badge.some((t) => /^Rules\b/.test(t) && /\b1\b/.test(t)), JSON.stringify(overviewStates.badge));
/* Start, on the strip. The dialog's confirm is also named "Start"; the refusal must stay in the dialog with its link. */
await clickIfThere("Start");
await page.waitForTimeout(600);
const startDlg = page.locator("[role=alertdialog]").last();
await soft("confirm start", () => startDlg.getByRole("button", { name: /^Start$/ }).click({ timeout: 4000 }));
/* the same rule as `submitForm`: the confirm is `loading` for as long as the action is in flight */
await page.waitForTimeout(250);
await page.waitForFunction(() => ![...document.querySelectorAll("[role=alertdialog] button")].some((b) => b.getAttribute("aria-busy") === "true"), null, { timeout: 120_000 })
  .catch(() => consoleErrors.push("soft(start settle): the confirm stayed busy"));
await page.waitForTimeout(900);
const startRefusal = await soft("read refusal", () => startDlg.locator("[role=alert]").innerText({ timeout: 4000 }), "") ?? "";
const startLink = await soft("read link", () => startDlg.locator("[role=alert] a").getAttribute("href", { timeout: 2000 }), null);
ok("7b.4 Start is refused IN the dialog with the reason's own sentence and the console's frame",
  /can't start yet/.test(startRefusal) && /Turn on at least one entry mode\./.test(startRefusal) && /Open Rules/.test(startRefusal), startRefusal.slice(0, 200));
ok("7b.5 …and the refusal carries a link to the Rules tab", typeof startLink === "string" && /tab=rules$/.test(startLink), JSON.stringify(startLink));
await soft("follow the link", () => startDlg.locator("[role=alert] a").click({ timeout: 4000 }));
await page.waitForTimeout(2500);
ok("7b.6 following it lands on the Rules tab and the dialog is gone", /[?&]tab=rules/.test(page.url()) && (await page.locator("[role=alertdialog]").count()) === 0, page.url());
const whyRules = await whyCard();
ok("7b.7 the same panel sits above the form, unlinked, naming the same reason", whyRules.present && whyRules.items.length === 1 && whyRules.link === null, JSON.stringify(whyRules));
await clearToasts();
await soft("switch polls-react on", () => clickSwitch("polls-react"));
await page.waitForTimeout(400);
await submitForm();
/* the panel above the form is server-rendered, so it moves on the `router.refresh()` the landed save issues */
let whyAfter = null;
for (let i = 0; i < 30; i++) {
  whyAfter = await whyCard();
  if (whyAfter.empty) break;
  await page.waitForTimeout(500);
}
ok("7b.8 putting the mode back and saving empties the panel to its one sentence, on the page, without a reload",
  whyAfter && whyAfter.items.length === 0 && /Nothing in the rules or limits stops this account from betting/.test(whyAfter.empty ?? ""), JSON.stringify(whyAfter));

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

/**
 * ⛔ THE OFFER MUST SURVIVE BEING LEFT ALONE, AND MUST NOT SURVIVE A SAVE. 🔴 Both of these were
 * WRONG when the draft first shipped, and 8.1/8.6 below passed over both of them:
 *   ① the entry was deleted from storage ON MOUNT (the write effect saw a clean form and removed
 *     what the read effect had just offered), so a second reload lost the work entirely — data loss
 *     inside the feature built to prevent it, hidden because the offer still appeared ONCE;
 *   ② `found` was React state cleared only by restore/discard, so an officer who ignored the offer,
 *     filled the form and saved was left looking at "Unsaved changes from earlier" over a form that
 *     had just saved — reported by the owner, and one click from undoing his own save.
 * 8.6a and 8.6b are the two checks that would have caught them.
 */
console.log("\n§8a · the draft survives being left alone, and dies on a save");
await soft("second reload", () => page.goto(RULES, { waitUntil: "load" }));
await page.waitForTimeout(3000);
ok("8.6a the offer is STILL there after a second visit — a draft is not consumed by being looked at",
  (await page.locator("main").getByText(/Unsaved changes from earlier/).count()) > 0,
  "the entry was deleted on mount; the work is gone");

/* ⛔ IGNORE the offer — fill and save around it. That is the owner's own path. */
await clearToasts();
await clickIfThere("Use starting values");
await page.waitForTimeout(800);
await submitForm();
ok("8.6b a clean save clears the offer ON SCREEN, with no reload",
  (await page.locator("main").getByText(/Unsaved changes from earlier/).count()) === 0,
  "the panel still offers to restore work that no longer exists — one click from undoing the save");

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
/* ⛔ THE PICKER'S CONTROLS ARE INSIDE THE PHONE VIEWPORT, AT THE TAP FLOOR, and the category group does not repeat
   the switch line above it — read off the geometry, not off the markup. */
const phonePicker = await page.evaluate(() => {
  const g = document.querySelector('main form [data-list="poll-categories"]');
  if (!g) return null;
  const labels = [...g.querySelectorAll("label")].map((l) => l.getBoundingClientRect());
  const tap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tap-min")) || 40;
  return { boxes: labels.length, inside: labels.every((r) => r.left >= 0 && r.right <= window.innerWidth + 1), tall: labels.every((r) => r.height >= tap - 0.5), tap };
});
ok("8.8 on a phone every category box sits inside the viewport and reaches the tap floor", phonePicker && phonePicker.boxes === 7 && phonePicker.inside && phonePicker.tall, JSON.stringify(phonePicker));

// ── §8c · the roster shows the words, not the switches ─────────────────────────────────────────────────────
/**
 * ⛔ THE ROSTER LINE THAT LIED (2026-09-22). "Up & Down · Polls" was true of the switches and false of the account.
 * It names what each product REACHES now — "Polls · Sports" for this account — and carries no refusal once the
 * rules reach a market.
 */
console.log("\n§8c · the roster names what the account reaches");
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(`${BASE}/admin/desk`, { waitUntil: "load" });
await page.waitForTimeout(2200);
const rosterRow = await page.evaluate((id) => {
  const link = document.querySelector(`main a[href^="/admin/desk/${id}"]`);
  const tr = link?.closest("tr");
  if (!tr) return null;
  const cells = [...tr.querySelectorAll("td")].map((td) => td.innerText.replace(/\s+/g, " ").trim());
  const inert = tr.querySelector('a[href$="tab=rules"]');
  return { cells, inert: inert ? inert.innerText.trim() : null };
}, ACCOUNT);
ok("8c.1 the roster row names the reach — `Polls · Sports` — as words, never the summary switches",
  rosterRow && rosterRow.cells.some((c) => /Polls\s*·\s*Sports/.test(c)) && !rosterRow.cells.some((c) => /Up & Down\s*·\s*Polls/.test(c)),
  JSON.stringify(rosterRow));
ok("8c.2 …and carries no refusal, because the rules reach a market", rosterRow && rosterRow.inert === null, JSON.stringify(rosterRow?.inert));
await page.goto(RULES, { waitUntil: "load" });
await page.waitForTimeout(2200);

/**
 * ⛔ AN ADDRESS THAT NAMES NOTHING MUST SAY SO. 🔴 Measured on a served build before this was fixed: signed in
 * as an owner, `/admin/desk/<an id that does not exist>` rendered the whole admin shell — nav, breadcrumbs
 * reading "Admin / Desk / Account", footer — with a COMPLETELY EMPTY main. No heading, no sentence, no way
 * back. The page did call `notFound()`; the route streams, so by then the shell was already flushed and the
 * ROOT boundary could no longer replace it, and there was no boundary under this segment to render into.
 * ⚠️ AND IT IS CHECKED IN A BROWSER, NOT WITH A FETCH. The panel arrives in the flight stream and is painted
 * after hydration, so the initial HTML does not contain it — a curl-shaped check reads an empty main and calls
 * a working page broken. That cost a debugging round on the day this was written.
 */
console.log("\n§8b · an address that names no account");
await page.setViewportSize({ width: 1440, height: 1000 });
for (const bad of ["not-an-id", "hb_000000000000000000000000"]) {
  await soft(`visit ${bad}`, () => page.goto(`${BASE}/admin/desk/${bad}`, { waitUntil: "load" }));
  await page.waitForTimeout(2600);
  const said = await soft("read main", () => page.evaluate(() => (document.querySelector("main")?.innerText ?? "").replace(/\s+/g, " ").trim()), "");
  const wayOut = await soft("way out", () => page.locator('main a[href="/admin/desk"]').count(), 0);
  ok(`8b.${bad === "not-an-id" ? "1" : "2"} "${bad}" says the account is not there, and offers a way back`,
    /not on the desk/.test(said ?? "") && (wayOut ?? 0) >= 1,
    said ? said.slice(0, 90) : "*** MAIN IS EMPTY ***");
}

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
/* ── §9b · THE NUMERIC EDITOR AND THE SCHEDULE, TYPED AND READ BACK (2026-09-23 · register A1) ───────────────
 *
 * ⛔ THIS IS THE HALF NO VIEW-MODEL CASE CAN REACH. `test:house-bot-console` proves the door: post these
 * values, the row stores them, the next read hands them back. What it cannot prove is that an officer can
 * PUT them there — that the boxes exist, that the kit's segmented time control posts what was typed, that
 * turning All day off leaves the window rows usable, and that a reload shows the officer their own numbers
 * rather than the defaults. Every one of those lived in the gap between a real pointer and a real React tree,
 * which is the gap this whole file exists for.
 * ⚠️ THE ENTER-NOW STAKE IS CHOSEN INSIDE THE ACCOUNT'S OWN BAND. Measured while writing this: 12,000 against
 * a 10,000 stake max is REFUSED, correctly, on that box — so a gate typing a round number would be measuring
 * the refusal path and calling it a round trip.
 */
console.log("\n§9b · the numeric rules and the schedule, typed and read back");
await page.setViewportSize({ width: 1440, height: 1100 });
await page.goto(RULES, { waitUntil: "load" });
await page.waitForTimeout(2200);

const ruleBoxes = await page.evaluate(() => ({
  numeric: document.querySelectorAll('main form [data-rules="numbers"] input:not([type=checkbox]):not([type=hidden])').length,
  days: document.querySelectorAll('main form fieldset[data-list="schedule-days"] input[type=checkbox]').length,
  windowRows: document.querySelectorAll('main form input[type=hidden][name^="schedule-windows."]').length,
  sections: [...document.querySelectorAll('main form [data-rules="numbers"] p')].map((p) => p.innerText.trim()).filter((t) => t.length > 0 && t.length < 40).slice(0, 12),
}));
ok("9b.1 the editor draws the numeric rules, seven day boxes and four window rows",
  ruleBoxes.numeric >= 25 && ruleBoxes.days === 7 && ruleBoxes.windowRows === 8, JSON.stringify(ruleBoxes));

const setBox = async (name, value) => {
  const el = page.locator(`main form input[name="${name}"]`);
  if ((await el.count()) === 0) return `absent:${name}`;
  await el.fill("");
  await el.pressSequentially(value, { delay: 8 });
  return el.inputValue();
};
const typedDelay = await setBox("answer-delay-min", "25");
const typedZone = await setBox("quiet-zone-polls", "7");
/* The account's stake max is 10,000 on this drive's caps, so 5,000 is inside the band on purpose. */
const typedThin = await setBox("enter-now-thin-stake", "5000");
ok("9b.2 a delay, a guard and an Enter-now stake all take what is typed into them",
  typedDelay === "25" && typedZone === "7" && typedThin === "5000",
  JSON.stringify({ typedDelay, typedZone, typedThin }));

const allDayBox = page.locator('main form input[name="schedule-all-day"]');
if (await allDayBox.isChecked()) {
  await page.locator("main form label").filter({ has: page.locator('input[name="schedule-all-day"]') }).click();
}
const segs = page.locator('main form fieldset[data-list="schedule-windows"] input:not([type=hidden])');
await soft("window 0 start hh", () => segs.nth(0).fill("09"));
await soft("window 0 start mm", () => segs.nth(1).fill("00"));
await soft("window 0 end hh", () => segs.nth(2).fill("17"));
await soft("window 0 end mm", () => segs.nth(3).fill("30"));
await page.waitForTimeout(400);
const posted = await page.evaluate(() =>
  [...document.querySelectorAll('main form input[type=hidden][name^="schedule-windows."]')].map((i) => `${i.name}=${i.value}`));
/* ⛔ THE KIT'S TIME CONTROL IS REACT-HELD: what it POSTS is a hidden input this form keeps in step. A control
   whose pixels moved and whose posted value did not is the defect class this whole file was written for. */
ok("9b.3 the segmented time control posts what was typed, as EAT text",
  posted.includes("schedule-windows.0.start=09:00") && posted.includes("schedule-windows.0.end=17:30"),
  JSON.stringify(posted.slice(0, 4)));
ok("9b.4 …and turning All day off makes the form dirty, so the pending bar stands",
  /UNSAVED/i.test((await bar()) ?? ""), (await bar()) ?? "no bar");

await submitForm();
const savedToasts = await toasts();
const stillInvalid = await invalidFields();
ok("9b.5 the whole form saves — no box is marked, and the toast says it landed",
  savedToasts.some((t) => /^Saved/.test(t)) && stillInvalid.length === 0,
  JSON.stringify({ savedToasts, stillInvalid }));
await clearToasts();

await page.goto(RULES, { waitUntil: "load" });
await page.waitForTimeout(2400);
const readBack = await page.evaluate(() => {
  const v = (n) => document.querySelector(`main form input[name="${n}"]`)?.value ?? null;
  return {
    delay: v("answer-delay-min"),
    zone: v("quiet-zone-polls"),
    thin: v("enter-now-thin-stake"),
    allDay: document.querySelector('main form input[name="schedule-all-day"]')?.checked ?? null,
    segs: [...document.querySelectorAll('main form fieldset[data-list="schedule-windows"] input:not([type=hidden])')].slice(0, 4).map((i) => i.value),
    saved: [...document.querySelectorAll("main form li")].map((li) => li.innerText.trim()).filter((t) => /→|all day/i.test(t)),
  };
});
ok("9b.6 ⭐ THE ROUND TRIP: a reload shows the officer their own numbers, All day still off, and the window in its boxes",
  readBack.delay === "25" && readBack.zone === "7" && readBack.thin === "5000"
    && readBack.allDay === false && readBack.segs.join(":") === "09:00:17:30",
  JSON.stringify(readBack).slice(0, 300));
ok("9b.7 …and the saved schedule is painted in words, per chosen day",
  readBack.saved.length > 0 && readBack.saved.every((s) => /09:00 → 17:30/.test(s)),
  JSON.stringify(readBack.saved.slice(0, 3)));

/* -- 9c - THREE MINORS THAT ONLY A REAL TREE CAN SHOW (2026-09-23 - registers D9 and A5) -------------------
 *
 * M5 an empty table scrolling sideways over nothing, M7 the same blockers stated twice on one screen, and M8 a
 * way out that stopped one click short. Not one of the three is visible to a view-model case: the first is a CSS
 * rule over a rendered table, the second is which of two panels a PAGE chose to draw, and the third is an effect
 * that runs on arrival in the browser. Each carries its own CONTROL, because "no scroller" and "no dialog" are
 * both satisfied by a screen that failed to render at all.
 */
console.log("\n\u00a79c \u00b7 the empty table, the one statement per screen, and the way out that lands");

/* -- M5 - a table with nothing in it does not scroll sideways, and one with rows still does ---------------- */
await page.setViewportSize({ width: 360, height: 900 });
const tableShape = async (tab) => {
  await page.goto(`${BASE}/admin/desk/${ACCOUNT}?tab=${tab}`, { waitUntil: "load" });
  await page.waitForTimeout(2200);
  return page.evaluate(() => {
    const t = document.querySelector("main table.admin-tbl");
    if (!t) return { table: false };
    const strip = t.closest(".scrollx, .overflow-x-auto");
    const head = t.querySelector("thead");
    const emptyRow = t.querySelector("tbody tr[data-table-empty]");
    return {
      table: true,
      empty: !!emptyRow,
      headShown: head ? getComputedStyle(head).display !== "none" : null,
      scrolls: strip ? strip.scrollWidth > strip.clientWidth + 1 : null,
      message: emptyRow ? emptyRow.innerText.replace(/\s+/g, " ").trim() : null,
    };
  });
};
const emptyTable = await tableShape("targets");
ok("9c.1 an EMPTY table at 360 does not scroll sideways over nothing - its column floors and its head are furniture for columns that hold nothing, and the message is still there",
  emptyTable.table === true && emptyTable.empty === true && emptyTable.scrolls === false
    && emptyTable.headShown === false && /No targets yet/.test(emptyTable.message ?? ""),
  JSON.stringify(emptyTable).slice(0, 240));
const fullTable = await tableShape("history");
ok("9c.2 CONTROL - a table WITH rows keeps its head at the same width, so the rule is scoped to the empty state and not a header removed everywhere",
  fullTable.table === true && fullTable.empty === false && fullTable.headShown === true,
  JSON.stringify(fullTable).slice(0, 240));

/* -- M7 - the blockers are named once per screen, and the two skins are one list --------------------------- */
await page.setViewportSize({ width: 1440, height: 1100 });
await page.goto(RULES, { waitUntil: "load" });
await page.waitForTimeout(2200);
await clearToasts();
/* A blocker state made on purpose: with every entry mode off, the rules raise their one global reason. */
for (const s of ["updown-react", "updown-fill", "updown-open", "polls-react", "polls-fill", "polls-open"]) {
  const box = page.locator(`main form input[name="${s}"]`);
  if ((await box.count()) === 1 && (await box.isChecked())) await soft(`switch ${s} off`, () => clickSwitch(s));
}
await page.waitForTimeout(400);
await submitForm();
await clearToasts();
const screenShape = async (tab) => {
  await page.goto(`${BASE}/admin/desk/${ACCOUNT}?tab=${tab}`, { waitUntil: "load" });
  await page.waitForTimeout(2400);
  return page.evaluate(() => {
    const main = document.querySelector("main");
    const box = [...(main?.querySelectorAll("[role=status]") ?? [])].find((e) => /thing(s)? (to fix|stop)/.test(e.innerText));
    return {
      callout: box ? box.innerText.replace(/\s+/g, " ").trim() : null,
      calloutItems: box ? [...box.querySelectorAll("li")].map((li) => li.innerText.trim()) : [],
      panelItems: [...(main?.querySelectorAll("[data-why-item]") ?? [])].map((li) => li.innerText.replace(/\s+/g, " ").trim()),
      panelEmpty: !!main?.querySelector("[data-why-empty]"),
    };
  });
};
const onOverviewM7 = await screenShape("overview");
const onRulesM7 = await screenShape("rules");
ok("9c.3 the OVERVIEW states the blockers ONCE - the callout above the rail names them, and no panel below restates them",
  onOverviewM7.callout !== null && onOverviewM7.calloutItems.length > 0
    && onOverviewM7.panelItems.length === 0 && onOverviewM7.panelEmpty === false,
  JSON.stringify(onOverviewM7).slice(0, 280));
ok("9c.4 the RULES tab states them ONCE too - the panel beside the form names them WITH the remedy, and the callout is not drawn there",
  onRulesM7.callout === null && onRulesM7.panelItems.length > 0
    && onRulesM7.panelItems.every((t) => t.split(" ").length > 2),
  JSON.stringify(onRulesM7).slice(0, 280));
ok("9c.5 ...and the two screens name the SAME blockers in the SAME order - one list, two skins",
  onOverviewM7.calloutItems.length === onRulesM7.panelItems.length
    && onRulesM7.panelItems.every((t, i) => t.startsWith(onOverviewM7.calloutItems[i])),
  JSON.stringify({ callout: onOverviewM7.calloutItems, panel: onRulesM7.panelItems }).slice(0, 300));

/* -- M8 - `?reverify=1` opens the dialog it names, on arrival ---------------------------------------------- */
const dialogText = async (url) => {
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(2600);
  return page.evaluate(() => {
    const d = document.querySelector("[role=dialog], [role=alertdialog]");
    return d ? d.innerText.replace(/\s+/g, " ").trim().slice(0, 160) : null;
  });
};
const arrivedOn = await dialogText(`${BASE}/admin/desk/${ACCOUNT}?reverify=1`);
ok("9c.6 the Start refusal's `Confirm permission` way out LANDS on the dialog it names - `?reverify=1` opens it on arrival",
  typeof arrivedOn === "string" && /Confirm the holder's permission/.test(arrivedOn), JSON.stringify(arrivedOn));
const bareArrival = await dialogText(`${BASE}/admin/desk/${ACCOUNT}`);
ok("9c.7 CONTROL - the same page without the parameter opens NO dialog, so 9c.6 measured the link and not a page that always opens one",
  bareArrival === null, JSON.stringify(bareArrival));

/* -- 9d - THE RANGE PICKER'S DAY BOUND IS EAT, AND ITS WHOLE-DAY END IS A WHOLE DAY (C8 minor M3) ---------
 *
 * Neither half is visible to a view-model case. `DateSelect` never renders its `max` as a DOM attribute - the
 * bound shows up only as DISABLED CELLS in the calendar an officer opens - and what `applyCustom` posts is
 * decided in the browser, by a "use client" component, from React state.
 *
 * THE CONTROL IS THE WHOLE POINT, and it is built from two extreme zones rather than argued. This laptop sits
 * in EAT, so a page rendered here agrees with EAT by accident and would prove nothing. Kiritimati (UTC+14) and
 * Niue (UTC-11) are 25 hours apart, so AT EVERY INSTANT at least one of them is on a different calendar day
 * from EAT - the case asserts that too, and would go red on a machine where it stopped being true.
 */
console.log("\n\u00a79d \u00b7 the range picker's day bound and its whole-day end");

const ACTIVITY = `${BASE}/admin/desk/${ACCOUNT}?tab=activity`;
const eatDayNow = () => new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);

const pickerIn = async (zone) => {
  const c = await browser.newContext({ viewport: { width: 1440, height: 1100 }, timezoneId: zone });
  const p = await c.newPage();
  try {
    await p.request.post(`${BASE}/api/dev-test/seed-admin`, { data: {} });
    await p.goto(ACTIVITY, { waitUntil: "load" });
    await p.waitForTimeout(2400);
    await p.getByRole("button", { name: /^Custom$/ }).first().click({ timeout: 6000 });
    await p.waitForTimeout(500);
    await p.getByRole("button", { name: /Open calendar/i }).first().click({ timeout: 6000 });
    await p.waitForTimeout(600);
    return await p.evaluate(() => {
      const dlg = document.querySelector('[role=dialog][aria-modal="true"]');
      const cells = [...(dlg?.querySelectorAll("button") ?? [])].filter((b) => /^\d{1,2}$/.test(b.textContent.trim()));
      const live = cells.filter((b) => !b.disabled).map((b) => Number(b.textContent.trim()));
      const head = dlg?.innerText?.split("\n").find((l) => /\d{4}/.test(l)) ?? "";
      return {
        lastEnabledDay: live.length ? Math.max(...live) : null,
        head: head.trim(),
        localDay: new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()),
      };
    });
  } finally { await c.close(); }
};

const far = await soft("picker in UTC+14", () => pickerIn("Pacific/Kiritimati"), null);
const near = await soft("picker in UTC-11", () => pickerIn("Pacific/Niue"), null);
const eatDay = eatDayNow();
const eatDom = Number(eatDay.slice(8, 10));
ok("9d.1 the calendar's last selectable day is the EAT day in BOTH extreme zones - the bound is the platform's clock, not the machine the officer is sitting at",
  !!far && !!near && far.lastEnabledDay === eatDom && near.lastEnabledDay === eatDom,
  JSON.stringify({ eatDay, far, near }));
ok("9d.2 CONTROL - the two zones really do disagree with EAT about what day it is, so 9d.1 measured the fix and not a coincidence of this laptop's own clock",
  !!far && !!near && (far.localDay !== eatDay || near.localDay !== eatDay),
  JSON.stringify({ eatDay, far: far?.localDay, near: near?.localDay }));

/* -- and the whole-day end is posted as a DATE, which `resolveRange` reads as the whole EAT day -------- */
await page.setViewportSize({ width: 1440, height: 1100 });
await page.goto(ACTIVITY, { waitUntil: "load" });
await page.waitForTimeout(2400);
const applied = await soft("apply a custom window", async () => {
  await page.getByRole("button", { name: /^Custom$/ }).first().click({ timeout: 6000 });
  await page.waitForTimeout(500);
  const segs = page.locator("main input[inputmode=numeric]");
  const nSeg = await segs.count();
  if (nSeg >= 6) {
    const d = eatDay.split("-");
    for (const [i, v] of [[0, d[2]], [1, d[1]], [2, d[0]]]) await segs.nth(i).fill(v);
    for (const [i, v] of [[0, d[2]], [1, d[1]], [2, d[0]]]) await segs.nth(nSeg >= 12 ? i + 6 : i).fill(v);
  }
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /^Apply$/ }).first().click({ timeout: 6000 });
  await page.waitForTimeout(2200);
  return page.url();
}, "");
const toParam = new URL(applied || ACTIVITY).searchParams.get("to");
ok("9d.3 the picker's untouched day-end posts `to` as a DATE with no time - `resolveRange` reads a date-only `to` as the whole EAT day, where `T23:59` dropped that day's last 59.999 seconds",
  typeof toParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(toParam) && !toParam.includes("T"),
  JSON.stringify({ url: applied, to: toParam }));

console.log("\n\u00a710 \u00b7 putting the roster back");
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

/**
 * ⛔ WHY A STEP COULD NOT RUN, PRINTED WHERE IT CAN BE READ (2026-09-23).
 *
 * 🔴 `soft()` records the exception into `consoleErrors` and returns a fallback, and §9's note counted those —
 * but §9 runs at line 611 and §9d and §10 run AFTER it. So a step that threw down there reported a bare FAIL
 * with its cause collected and never printed: the drive knew exactly why and said nothing. That is the same
 * shape as every other finding this programme met today — the fact existed, was correct, and was never read.
 * Printed at the END, after the last step, so no later step can hide behind an earlier summary.
 */
const softFailures = consoleErrors.filter((e) => e.startsWith("soft("));
if (softFailures.length > 0) {
  console.log("\n⚠ steps that could not run, and the reason each gave:");
  for (const s of softFailures) console.log(`  · ${s}`);
}

console.log("\n──────────────────────────────────────────────────────────────────────");
console.log(`${n - fail}/${n} passed · account ${ACCOUNT} · tiles in ${SHOTS}`);
console.log("──────────────────────────────────────────────────────────────────────");
await browser.close();
process.exit(fail === 0 ? 0 : 1);
