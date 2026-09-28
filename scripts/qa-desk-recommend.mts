/**
 * qa:desk-recommend — "USE RECOMMENDED VALUES" ACTUALLY FILLS THE FORM, ON A REAL PAGE.
 *
 *   npm run db:scratch                        # terminal 1 — leave it running
 *   export DATABASE_URL='postgresql://postgres:scratch@127.0.0.1:5433/<db>'
 *   npx prisma migrate deploy && npm run db:seed-house-bots-local
 *   DISABLE_ADMIN_TOTP=true npx next start -p 3021
 *   KP_BASE=http://127.0.0.1:3021 npx tsx scripts/qa-desk-recommend.mts
 *
 * ── WHY A BROWSER AND NOT A UNIT CASE ──────────────────────────────────────────────────────────
 * ⛔ THE CONTROL IS A DOM WRITE THAT HAS TO REACH REACT, and no unit case can tell whether it does.
 * The limits form is UNCONTROLLED — fourteen `defaultValue` inputs — so the button sets `el.value` on
 * the node and dispatches `input`. Whether `useFormDirty` ever hears that dispatch is a fact about
 * React's event plumbing, not about this repo: React's `onChange` for an input runs through the
 * ChangeEventPlugin, which keeps a VALUE TRACKER on the node and SUPPRESSES its own event when the
 * tracker already holds the new value — which a direct `el.value =` assignment makes true. So the
 * textbook form of this control fires nothing, Save stays disarmed over a visibly full form, and
 * every assertion written in a test file still passes. `onInput` is a plain pass-through with no
 * tracker check, which is why the hook is wired to it — but "which plugin handles it" is exactly the
 * kind of claim that has to be EXECUTED rather than reasoned about.
 * ⭐ So the proof is THE DIRTY BAR APPEARING. That is React having heard the dispatch, observed from
 * outside the app, and no amount of reasoning in this docblock substitutes for it.
 *
 * ── THE POPULATION COMES FROM THE PAGE, NOT FROM A TABLE COPIED IN HERE ────────────────────────
 * ⛔ THE INPUT NAMES ARE NEUTRAL SLUGS, NOT COLUMN NAMES (453): `CONSOLE_LIMIT_KEY` maps
 * `gCapDailyStakeTzs` → "daily-stake" and is module-private on purpose, because a `name=` attribute
 * carrying a house-bot column would be a leak that a scan of rendered TEXT could never catch. Only
 * the eight pairs this file actually needs are restated below, and 1.m asserts every one of them
 * resolves on the page — so a renamed key fails loudly instead of silently skipping its assertion.
 * ⭐ EVERYTHING ELSE IS READ OFF THE FORM. The no-overwrite claim is checked against EVERY field that
 * held a value, not a hand-picked three, so a control that clobbered a field this script never
 * thought about still fails.
 *
 * ── WHAT IT PROVES ─────────────────────────────────────────────────────────────────────────────
 *   1  the eight limits the master switch requires start EMPTY, and the rest of the form is full
 *      (1.c is the CONTROL — without it "they filled" could be a page that never loaded its values)
 *   2  the control is on the page at all, and is ENABLED while something is empty
 *   3  one click fills all eight with the recommendation, as PLAIN DIGITS
 *   4  ⛔ it changes NO field that already held a value — checked across the whole form. A control
 *      that overwrote them would silently RAISE ceilings that stop money.
 *   4.b a field with no recommendation is left empty rather than filled with a fallback
 *   5  ⛔ it SAVES NOTHING — the control row is re-read and the eight are still null, version unmoved
 *   6  ⭐ React heard the DOM write: the unsaved-changes bar is up, so Save is armed
 *   7  Save then persists exactly those eight, touches nothing else, and the button then DISABLES
 *
 * ⛔ LOOPBACK ONLY, and it refuses a production URL. It clears eight global limits and presses Save
 * on the form that governs every stake the desk places.
 * ⛔ IT REFUSES A DESK WHOSE MASTER SWITCH IS ON. Clearing a required limit under a live switch is a
 * money act; this is a measurement.
 */
import { chromium } from "playwright";

const BASE = process.env.KP_BASE ?? "http://127.0.0.1:3021";
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE)) {
  console.error(`REFUSED — loopback only. KP_BASE was ${JSON.stringify(BASE)}.`);
  process.exit(2);
}
const dbUrl = process.env.DATABASE_URL ?? "";
if (!dbUrl) {
  console.error("REFUSED — DATABASE_URL is required; this script reads and clears the control row.");
  process.exit(2);
}
if (/rlwy\.net|railway\.app|50pick\.tz|railway\.internal/i.test(dbUrl)) {
  console.error("REFUSED — that DATABASE_URL is production.");
  process.exit(2);
}
if (!/@(localhost|127\.0\.0\.1)[:/]/i.test(dbUrl)) {
  console.error("REFUSED — loopback only (localhost or 127.0.0.1).");
  process.exit(2);
}
if (process.env.NODE_ENV === "production") {
  console.error("REFUSED — NODE_ENV=production.");
  process.exit(2);
}
process.env.USE_PRISMA_DAL = "true";

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = ""): void => {
  if (cond) { pass++; console.log(`  PASS ${name}${detail ? ` — ${detail}` : ""}`); }
  else { fails.push(name); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const j = (v: unknown): string => JSON.stringify(v);

const dal = await import("../src/lib/server/house-bot-dal.ts");
const RULES = await import("../src/lib/house-bot/rules.ts");
const META = RULES.FIELD_META as unknown as Record<string, { recommended: unknown }>;

/**
 * The eight the master switch requires, each paired with the neutral `name` the page gives it.
 * ⛔ RESTATED, NOT IMPORTED — `CONSOLE_LIMIT_KEY` is module-private by ruling 453 (see the docblock).
 * 1.m is what stops this table from drifting: every slug must resolve to exactly one input.
 */
const EIGHT: ReadonlyArray<{ field: string; name: string }> = [
  { field: "gCapDailyStakeTzs", name: "daily-stake" },
  { field: "gCapDailyLossTzs", name: "daily-loss" },
  { field: "gCapOpenExposureTzs", name: "open-exposure" },
  { field: "gCapPerMarketTzs", name: "per-market" },
  { field: "gMaxBetsPerMinute", name: "bets-per-minute" },
  { field: "gMaxBetsPerDay", name: "bets-per-day" },
  { field: "gCounterPerPlayerPerDay", name: "one-player-bets-per-day" },
  { field: "gCounterPerPlayerTzsPerDay", name: "one-player-tzs-per-day" },
];
/* ⛔ THE TABLE ABOVE MUST BE THE WHOLE REQUIRED SET, or this script would prove the button on seven
   limits and call the eighth green by omission. */
const REQUIRED = RULES.REQUIRED_FOR_MASTER_ON as readonly string[];
if (EIGHT.length !== REQUIRED.length || EIGHT.some((e) => !REQUIRED.includes(e.field))) {
  console.error(`REFUSED — the pairs in this file are not the required set: ${j({ here: EIGHT.map((e) => e.field), product: REQUIRED })}`);
  process.exit(2);
}
/** What the button must write into each, as the page will read it back: plain digits. */
const EXPECT = new Map(EIGHT.map((e) => [e.name, String(META[e.field].recommended)]));

/**
 * ⛔ THE LIMITS ARE FLAT COLUMNS ON THE CONTROL ROW — there is no `control.limits` object, and the
 * first form of this script read one. `undefined` came back for all eight, and because
 * `JSON.stringify` prints `undefined` inside an array AS `null`, the refusal it raised printed eight
 * nulls while complaining that nothing was null. A diagnostic that renders the two states
 * identically is worse than none, so every read below goes through the row itself.
 */
type Row = Record<string, number | null | undefined>;
const limitsOf = async (): Promise<Row> => (await dal.houseBotControlStore.get()) as unknown as Row;

// ── 0 · put the desk in the state a fresh install is in: the eight required limits UNSET ────────
const before = await dal.houseBotControlStore.get();
if (before.enabled) {
  console.error("REFUSED — the master switch is ON. This script clears required limits; it will not do that under a live switch.");
  process.exit(2);
}
/* ⛔ ONLY THE EIGHT ARE IN THE PATCH. `saveLimits` leaves an OMITTED field alone, so the other six
   keep the seed's values — and those are the population for assertion 4. A patch naming all fourteen
   would clear the very rows that prove the no-overwrite half. */
const clearedPatch: Record<string, number | null> = {};
for (const e of EIGHT) clearedPatch[e.field] = null;
const cleared = await dal.houseBotControlStore.saveLimits(before.limitsVersion, clearedPatch as never);
if (!cleared.ok) {
  console.error(`REFUSED — could not clear the eight required limits (CAS failed): ${j(cleared)}`);
  process.exit(3);
}
const afterClear = await dal.houseBotControlStore.get();
const clearedLimits = await limitsOf();
/* The PREMISE of every assertion below. If the clear did not land, "the fields were empty" would be
   measuring a page that merely failed to render its values. */
if (EIGHT.some((e) => clearedLimits[e.field] != null)) {
  console.error(`REFUSED — the clear did not land: ${EIGHT.map((e) => `${e.field}=${String(clearedLimits[e.field])}`).join(" ")}`);
  process.exit(3);
}
console.log(`\n══ qa:desk-recommend ══\n   base ${BASE}\n   eight cleared at version ${afterClear.limitsVersion}`);

// ── the browser ────────────────────────────────────────────────────────────────────────────────
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();
const clientErrors: string[] = [];
/* ⛔ A CLIENT THROW IS INVISIBLE FROM THE SERVER SIDE: the page answers 200, renders its shell, and
   the control simply never works. Collect them so a broken click reports its cause. */
page.on("pageerror", (e) => clientErrors.push(String(e?.message ?? e).slice(0, 300)));
page.on("console", (m) => { if (m.type() === "error") clientErrors.push(m.text().slice(0, 300)); });

/* 🔴 THE VISIBLE `#phone` NODE, AND WITHOUT THE `+255` — `PhoneInput` mirrors into a HIDDEN
   `input[name="phone"]`, so a `name`-based selector resolves to the mirror and `fill` times out. */
await page.goto(`${BASE}/auth/admin`, { waitUntil: "networkidle", timeout: 60_000 });
await page.waitForSelector("#phone", { state: "visible", timeout: 30_000 });
await page.waitForTimeout(1500);
await page.fill("#phone", "700000000");
await page.waitForTimeout(400);
const synced = await page.locator('input[name="phone"]').inputValue().catch(() => "");
if (synced !== "700000000") {
  console.error(`REFUSED — PhoneInput did not sync into the submitted field (hidden value ${j(synced)}).`);
  process.exit(3);
}
await page.fill('input[type="password"]', "QaAdmin2026!");
await Promise.all([
  page.waitForURL((u) => !/\/auth\//.test(u.toString()), { timeout: 60_000 }).catch(() => null),
  page.click('button[type="submit"]'),
]);
/* ⛔ HTTP 200 PROVES NOTHING: a refused sign-in renders perfectly. Only the URL tells it. */
if (/\/auth\//.test(page.url())) {
  console.error(`REFUSED — the local admin could not sign in (still at ${page.url()}). Seed with scripts/seed-admin-local.mts and serve with DISABLE_ADMIN_TOTP=true.`);
  process.exit(3);
}

/* ⚠️ `domcontentloaded`, NOT `networkidle` — the desk holds a live poller open, so networkidle never
   settles and a 60s timeout would read as a broken page. The response status is asserted instead. */
const openLimits = async (): Promise<void> => {
  const res = await page.goto(`${BASE}/admin/desk?tab=limits`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (!res || res.status() >= 400) throw new Error(`the limits tab answered ${res?.status() ?? "no response"}`);
  await page.waitForSelector('input[name="daily-stake"]', { state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1500); // hydration — the handler is a client one
};
/** Every limit input on the form, by its neutral name. The whole form, never a chosen few. */
const readForm = (): Promise<Record<string, string>> => page.evaluate(() => {
  const out: Record<string, string> = {};
  for (const el of Array.from(document.querySelectorAll("input"))) {
    const i = el as HTMLInputElement;
    if (!i.id.startsWith("desk-limit-")) continue;
    out[i.name] = i.value;
  }
  return out;
});
await openLimits();

// ── 1 · the eight are empty, and the form around them is NOT ───────────────────────────────────
const beforeForm = await readForm();
const missing = EIGHT.filter((e) => !(e.name in beforeForm));
ok("1.m · CONTROL · every neutral key this file names resolves on the page — a renamed key fails here instead of skipping its assertion in silence",
  missing.length === 0, missing.length === 0 ? `${Object.keys(beforeForm).length} limit inputs` : `missing: ${j(missing.map((e) => e.name))}`);
ok("1 · the eight limits the master switch requires start EMPTY — the state a fresh desk is actually in",
  EIGHT.every((e) => beforeForm[e.name] === ""), j(Object.fromEntries(EIGHT.map((e) => [e.name, beforeForm[e.name]]))));
const filledBefore = Object.entries(beforeForm).filter(([, v]) => v !== "");
ok("1.c · CONTROL · the page really did load its values — the limits the clear left alone are on screen, so the emptiness above is a state and not a failed render",
  filledBefore.length >= 3, j(Object.fromEntries(filledBefore)));

// ── 2 · the control is offered ─────────────────────────────────────────────────────────────────
const btn = page.getByRole("button", { name: "Use recommended values" });
ok("2 · the control is ON THE PAGE — for its whole life this function was described in three documents and rendered nowhere",
  (await btn.count()) === 1, `count ${await btn.count()}`);
ok("2.b · …and it is ENABLED while a required limit is empty", await btn.isEnabled());
const barBefore = await page.getByText("Unsaved changes", { exact: false }).count();
ok("2.c · CONTROL · nothing is dirty yet, so the bar asserted in 6 is not already on the page",
  barBefore === 0, `bar nodes ${barBefore}`);

// ── 3 + 4 · one click ──────────────────────────────────────────────────────────────────────────
await btn.click();
await page.waitForTimeout(800);
const afterForm = await readForm();

const wrong = EIGHT.filter((e) => afterForm[e.name] !== EXPECT.get(e.name));
ok("3 · one click fills ALL EIGHT with the recommendation, as PLAIN DIGITS — a formatted figure would read back wrong through the kit's numeric field",
  wrong.length === 0,
  wrong.length === 0
    ? j(Object.fromEntries(EIGHT.map((e) => [e.name, afterForm[e.name]])))
    : `wrong: ${j(wrong.map((e) => [e.name, afterForm[e.name], "want", EXPECT.get(e.name)]))}`);

const clobbered = filledBefore.filter(([k, v]) => afterForm[k] !== v);
ok("4 · ⛔ it changes NO field that already held a value — checked across the WHOLE form, so a ceiling this script never named is still protected",
  clobbered.length === 0,
  clobbered.length === 0 ? `${filledBefore.length} kept: ${j(Object.fromEntries(filledBefore))}` : `clobbered: ${j(clobbered.map(([k, v]) => [k, v, "became", afterForm[k]]))}`);

/* A limit with no recommendation must stay empty rather than take a fallback — `gTargetsMaxActive`
   is the one, and a control that invented a number for it would be choosing to bet. */
const noRec = Object.keys(beforeForm).filter((k) => beforeForm[k] === "" && !EXPECT.has(k));
ok("4.b · a limit with NO recommendation is left EMPTY — never filled from a fallback, because recommending a value it does not have would be inventing one",
  noRec.length > 0 && noRec.every((k) => afterForm[k] === ""), j(Object.fromEntries(noRec.map((k) => [k, afterForm[k]]))));

// ── 5 · it saves nothing ───────────────────────────────────────────────────────────────────────
const afterClick = await dal.houseBotControlStore.get();
const afterClickLimits = await limitsOf();
ok("5 · ⛔ the click SAVED NOTHING — the control row still holds null for all eight and the version has not moved, which is what all three documents promise and what keeps filling and committing separate decisions on a money form",
  EIGHT.every((e) => afterClickLimits[e.field] == null) && afterClick.limitsVersion === afterClear.limitsVersion,
  `eight=[${EIGHT.map((e) => String(afterClickLimits[e.field])).join(",")}] version=${afterClick.limitsVersion} (was ${afterClear.limitsVersion})`);

// ── 6 · React heard the DOM write ──────────────────────────────────────────────────────────────
const barAfter = await page.getByText("Unsaved changes", { exact: false }).count();
ok("6 · ⭐ REACT HEARD THE DOM WRITE — the unsaved-changes bar is up, so Save is armed over the filled form. A tracker-suppressed event would leave this at 0 while every unit assertion still passed",
  barAfter > 0, `bar nodes ${barAfter}`);

/**
 * ── 7 · SAVING FROM THIS STATE IS REFUSED, AND THAT IS THE RIGHT ANSWER ────────────────────────
 *
 * ⭐ THIS WAS FOUND BY RUNNING IT, and it is worth the assertion rather than the workaround. The
 * fields above were cleared on a desk whose TARGETED AND MANUAL DAILY limit the seed left at
 * 900,000,000. The recommended daily stake is 500,000, and the save holds a cross-field rule:
 * targeted-and-manual may not exceed the daily stake. So the eight fill, and the save is REFUSED
 * with the sentence that names the conflict.
 * ⛔ THE CONTROL IS NOT WRONG AND THE GUARD IS NOT WRONG. Filling never saves, so nothing unsafe
 * happened; the officer is told precisely which two limits disagree and reconciles them. What would
 * have been wrong is a fill that quietly LOWERED the targeted limit to fit, which is assertion 4.
 * ⚠️ So this state is asserted for what it is, and the state an officer on a FRESH desk actually
 * meets — every limit unset — is driven separately below, because that is the go-live path.
 */
await page.getByRole("button", { name: /^Save · Hifadhi$/ }).first().click();
await page.waitForTimeout(4000);

const refusedText = await page.evaluate(() => document.body.innerText);
ok("7 · saving RECOMMENDED eight under a pre-existing 900,000,000 targeted limit is REFUSED, and the refusal NAMES the two limits that disagree rather than failing in silence",
  /targeted and manual daily limit can't be above the daily stake limit/i.test(refusedText),
  refusedText.split("\n").find((l) => /can't be above/i.test(l))?.trim().slice(0, 120) ?? "(no such sentence on the page)");
const refusedLimits = await limitsOf();
ok("7.b · ⛔ …and a REFUSED save writes NOTHING — all eight are still null, so a rejected form never half-lands",
  EIGHT.every((e) => refusedLimits[e.field] == null),
  `eight=[${EIGHT.map((e) => String(refusedLimits[e.field])).join(",")}]`);

/**
 * ── 9 · THE GO-LIVE PATH: a FRESH desk, one click, one Save ────────────────────────────────────
 * ⭐ THIS IS THE PATH AN OFFICER TAKES ON THE LIVE DESK, where no global limit has ever been set. It
 * is driven separately because the state above cannot reach it: the seed's 900,000,000 is an artefact
 * of a fixture, not something a fresh install has.
 */
const fresh = await dal.houseBotControlStore.get();
const freshPatch: Record<string, number | null> = {};
for (const f of RULES.LIMIT_FIELDS as readonly string[]) {
  /* ⚠️ Only the NULLABLE limits. `maxDesignatedBots` and `bellAlertsPerHour` always hold a number —
     `recommendedLimits()` falls back to 5 and 20 for exactly that reason — and both already equal
     their recommendation, so leaving them is the fresh state rather than a gap in it. */
  if (f === "maxDesignatedBots" || f === "bellAlertsPerHour") continue;
  freshPatch[f] = null;
}
const wiped = await dal.houseBotControlStore.saveLimits(fresh.limitsVersion, freshPatch as never);
if (!wiped.ok) {
  console.error(`REFUSED — could not reach the fresh-desk state (CAS failed): ${j(wiped)}`);
  process.exit(3);
}
const freshVersion = (await dal.houseBotControlStore.get()).limitsVersion;
await openLimits();
const freshForm = await readForm();
const stillSet = Object.entries(freshForm).filter(([k, v]) => v !== "" && k !== "max-accounts" && k !== "alerts-per-hour");
ok("9 · CONTROL · the desk is now in the state a fresh install is in — every nullable global limit is empty on the form",
  stillSet.length === 0, stillSet.length === 0 ? "all empty" : j(Object.fromEntries(stillSet)));

const btnFresh = page.getByRole("button", { name: "Use recommended values" });
await btnFresh.click();
await page.waitForTimeout(800);
const freshFilled = await readForm();
ok("9.b · one click fills every limit that has a recommendation",
  EIGHT.every((e) => freshFilled[e.name] === EXPECT.get(e.name)) && freshFilled["targeted-daily-tzs"] !== "",
  j(freshFilled));

await page.getByRole("button", { name: /^Save · Hifadhi$/ }).first().click();
await page.waitForTimeout(4500);
const goLive = await limitsOf();
const goLiveMissing = EIGHT.filter((e) => String(goLive[e.field]) !== EXPECT.get(e.name));
ok("9.c · ⭐ SAVE LANDS — on a fresh desk the whole eight go in on one click and one Save, which is the sequence the switch-on sheet (deleted 2026-09-26) asked an officer to perform",
  goLiveMissing.length === 0 && goLive.limitsVersion !== freshVersion,
  goLiveMissing.length === 0
    ? `version ${freshVersion} → ${goLive.limitsVersion}; eight=[${EIGHT.map((e) => String(goLive[e.field])).join(",")}]`
    : `not saved: ${j(goLiveMissing.map((e) => [e.field, goLive[e.field], "want", EXPECT.get(e.name)]))}`);

await openLimits();
const doneText = await page.evaluate(() => document.body.innerText);
ok("9.d · …and the desk stops asking for them — the strip no longer sends the officer off to set eight limits",
  !/Set 8 global limits first/i.test(doneText),
  /Set 8 global limits first/i.test(doneText) ? "the strip still says 'Set 8 global limits first'" : "the strip has moved on");
ok("9.e · no required limit reads 'the master switch cannot be turned on' any more — the switch's own precondition is met",
  !/master switch cannot be turned on/i.test(doneText),
  (doneText.match(/master switch cannot be turned on/gi) ?? []).length + " such captions");

const btn2 = page.getByRole("button", { name: "Use recommended values" });
ok("9.f · with nothing left to fill the control is DISABLED rather than a button that does nothing when pressed",
  (await btn2.count()) === 1 && (await btn2.isDisabled()), `count ${await btn2.count()}`);

ok("10 · no client-side exception was thrown on any of it — a client throw answers 200 and simply breaks the control in silence",
  clientErrors.length === 0, clientErrors.slice(0, 3).join(" | "));

await browser.close();
console.log(`\n@@SUMMARY ${j({ pass, fail: fails.length })}`);
if (fails.length > 0) {
  console.log(`\nFAILED — qa:desk-recommend: ${pass} passed, ${fails.length} failed`);
  for (const f of fails) console.log(`  · ${f}`);
  process.exit(1);
}
console.log(`ALL PASS — qa:desk-recommend: ${pass} passed, 0 failed`);
