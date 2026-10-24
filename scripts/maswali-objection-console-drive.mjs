/**
 * qa:maswali-objection-console — Compliance's Millionea objection queue, driven in a real browser (MASWALI-BUILD S7-OB;
 * MASWALI-PLAN §3 MR-16, MB-23): every ruling through the console's own controls, every outcome read off the page.
 *
 *   BASE=http://localhost:3530 node scripts/maswali-objection-console-drive.mjs
 *       (a FRESH in-memory `next dev`, 2FA off, FEATURE_MILLIONEA=ACTIVE, MASWALI_SCHEDULER=false, LIFECYCLE_TICKER=false)
 *
 *   1 · the Owner signs in (`/api/dev-test/seed-admin`); before any week exists the card says there is nothing to rule;
 *       FEE-TAX R1 · the Owner's "Second-officer checks" card on /admin/system reads OFF with nothing stored (his ruling of
 *       24 October 2026), so the Owner turns them ON there (a reason and a confirm): the queue's separation of duties
 *       below — the sealer's, the confirmer's, the present result's author's — is read as built;
 *   2 · the seed (`/api/dev-test/seed-maswali-objections`): an earlier week whose window has closed with one objection
 *       still to rule, and a later week, its window open, with M3 and M5 sealed by the Owner and M7 by the results officer;
 *   3 · the Owner reads the queue: on the questions the Owner sealed, the words that another officer rules (the service's
 *       own refusal, never a button that bounces); on M7, the rulings;
 *   4 · an AUDITOR (who may read the compliance page, never act on it) sees each ruling locked, naming who can;
 *   5 · a COMPLIANCE officer rules: REVERSE on M3's first objection through the typed confirmation — the gate stays
 *       unarmed on a wrong word, an empty note is refused at its field and nothing is recorded, then it lands and the
 *       window restarts once; REJECT on M3's second (the seal it reviews is the new one); REINSTATE on M5 with its result,
 *       the window no longer restarting; REJECT on the closed week's objection;
 *   6 · every state at 360 / 768 / 1280 / 1920: no horizontal overflow, no console error, a viewport tile each.
 * ⛔ The only routes it calls itself are the two dev-only seeds; everything else is a click, a key or a typed word.
 * ⛔ Localhost and the in-memory store only. Tiles in `.50pick-shots/maswali/objections/`, never full-page captures.
 * ⚠️ A chip, a status badge and a locked control paint their words in capitals (CSS), and `innerText` reads them as
 *    painted: their words are matched without regard to case.
 * ⚠️ No backslash escape for a slash, a word boundary or a control character anywhere in this file (`test:source-bytes`).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { moveSecondOfficerChecks } from "./lib/second-officer-card.mjs";

const BASE = process.env.BASE || "http://localhost:3530";
if (!/^http:[/][/]localhost(:[0-9]+)?$/.test(BASE)) { console.error("refusing: BASE must be a localhost dev server"); process.exit(2); }
{
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null);
  if (!health || health.database?.configured !== false) {
    console.error(`refusing: ${BASE} does not report the in-memory store (database.configured=${JSON.stringify(health?.database?.configured)})`);
    process.exit(2);
  }
}
const OUT = ".50pick-shots/maswali/objections";
mkdirSync(OUT, { recursive: true });
const WIDTHS = [360, 768, 1280, 1920];
const PAGE = "/admin/maswali/integrity";

let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) pass++; else fail++; console.log(`${c ? "PASS" : "FAIL"} ${n}${e ? ` — ${e}` : ""}`); return !!c; };
const clip = (s, n = 400) => String(s ?? "").replace(/[ ]+/g, " ").trim().slice(0, n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 30_000, every = 250) {
  const end = Date.now() + ms;
  for (;;) {
    try { const v = await fn(); if (v) return v; } catch { /* between renders */ }
    if (Date.now() > end) return null;
    await sleep(every);
  }
}

const browser = await chromium.launch();
/** One signed-in officer: their own context (a second sign-in in one context would sign the first out). */
async function officer(phone, role, name) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(180_000);
  page.setDefaultTimeout(30_000);
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(String(e)));
  const r = await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone, role, name } });
  const body = await r.json().catch(() => ({}));
  ok(`${name} (${role}) signs in`, r.ok() && !!body.userId, `${r.status()}`);
  return { ctx, page, errs, userId: body.userId, name };
}
async function open(o) {
  o.errs.length = 0;
  await o.page.setViewportSize({ width: 1280, height: 900 });
  const res = await o.page.goto(`${BASE}${PAGE}`, { waitUntil: "domcontentloaded" });
  await o.page.waitForLoadState("networkidle").catch(() => {});
  ok(`${o.name} · ${PAGE} answers 200`, res?.status() === 200, `${res?.status()}`);
  await until(() => o.page.locator("[data-section-heading]", { hasText: "Objections" }).count());
}
/** The objection's own row: the list item that carries its filer's words. */
const row = (o, detail) => o.page.locator("li").filter({ hasText: detail });
/** Every width: no horizontal overflow, a viewport tile scrolled to `focus` when given. */
async function tiles(o, name, focus) {
  for (const width of WIDTHS) {
    await o.page.setViewportSize({ width, height: 900 });
    await sleep(250);
    if (focus) await focus().scrollIntoViewIfNeeded().catch(() => {});
    const over = await o.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`${name} · no horizontal overflow @${width}`, over <= 1, `overflow=${over}px`);
    await o.page.screenshot({ path: `${OUT}/${name}-${width}.png`, fullPage: false, caret: "initial" });
  }
  await o.page.setViewportSize({ width: 1280, height: 900 });
}
const noErrors = (o, what) => ok(`${what} · no console error`, o.errs.length === 0, o.errs.slice(0, 3).join(" | "));

const DETAIL = {
  m3a: "The official match report shows event 3 did not happen: the result should be NO.",
  m3b: "The source named in the question published NO for event 3 on Saturday evening.",
  m5: "Event 5 was played in full and the source has its result; it should not be void.",
  m7: "The criterion does not say which source decides a tie, and two sources disagree.",
  closed: "The federation's site lists event 9 as postponed, not played; please check before this result is final.",
};

// ── 1 · the Owner, before any week ────────────────────────────────────────────────────────────────────────────────
const owner = await officer("+255700000001", "ADMIN", "Ali Admin");
await open(owner);
ok("1 · with no week being decided, the card says there is nothing to rule",
  (await owner.page.getByText("No objection to rule").count()) > 0);
await tiles(owner, "empty", () => owner.page.locator("[data-section-heading]", { hasText: "Objections" }));
noErrors(owner, "1 · the empty queue");
// FEE-TAX R1 · nothing stored reads OFF (the Owner's ruling of 24 October 2026); the separation of duties this drive reads
// is the setting's ON, so the Owner turns it ON through his card — the real door, an audited act with a written reason.
const SO_WHY = "Drive: second-officer checks on, to read the queue's separation of duties as built.";
const so = await moveSecondOfficerChecks(owner.page, { base: BASE, turnOn: true, reason: SO_WHY });
ok("1b · ⭐ the Owner's “Second-officer checks” card read OFF with nothing stored (his ruling), and his act turned them ON — the confirm dead until a reason was written, the reason on the record",
  so.before === "off" && so.sourceBefore === "absent" && so.gated && so.flipped && so.text.includes(SO_WHY), `${so.before} · ${so.sourceBefore} · ${clip(so.text, 200)}`);
noErrors(owner, "1b · the Owner's card");

// ── 2 · the seed ──────────────────────────────────────────────────────────────────────────────────────────────────
const seed = await owner.ctx.request.post(`${BASE}/api/dev-test/seed-maswali-objections`, { data: { step: "queue", ownerId: owner.userId }, timeout: 300_000 });
const seeded = await seed.json().catch(() => ({}));
ok("2 · two weeks seeded through the product's doors, five objections filed through the door", seed.ok() && seeded.ok === true, clip(JSON.stringify(seeded), 300));
if (!seeded.ok) { await browser.close(); console.log(`${String.fromCharCode(10)}maswali-objection-console: ${pass} passed, ${fail} failed`); process.exit(1); }
const W = seeded.weeks;

// ── 3 · the Owner reads the queue ─────────────────────────────────────────────────────────────────────────────────
await open(owner);
const openWeek = owner.page.locator(`section[aria-label="${W.open} objections"]`);
const closedWeek = owner.page.locator(`section[aria-label="${W.closed} objections"]`);
ok("3.1 · both weeks are in the queue, the earlier first", (await openWeek.count()) === 1 && (await closedWeek.count()) === 1
  && await owner.page.evaluate(([a, b]) => {
    const s = [...document.querySelectorAll("section[aria-label]")].map((x) => x.getAttribute("aria-label"));
    return s.indexOf(`${a} objections`) < s.indexOf(`${b} objections`);
  }, [W.closed, W.open]));
ok("3.2 · the open week says its window is open and that four objections wait", /Objection window open until/.test(await openWeek.innerText()) && /4 to rule/i.test(await openWeek.innerText()), clip(await openWeek.innerText(), 200));
ok("3.3 · the closed week says its window closed and the week waits for the ruling", /Objection window closed .*the week settles once every objection here is ruled/.test(await closedWeek.innerText()) && /1 to rule/i.test(await closedWeek.innerText()), clip(await closedWeek.innerText(), 200));
ok("3.4 · M3's seal is shown with its officer: sealed YES by the Owner", /M3 · Will event 3 happen this weekend[?]/.test(await openWeek.innerText()) && /Sealed YES by Ali Admin on/.test(await openWeek.innerText()));
ok("3.5 · M5's seal is a void with its ground, as words", /Sealed VOID [(]Abandoned, no official result[)] by Ali Admin/.test(await openWeek.innerText()));
ok("3.6 · each objection shows its filer, the reason in words and the filer's own text",
  /Neema Mushi/.test(await row(owner, DETAIL.m3a).innerText()) && /Result is wrong/.test(await row(owner, DETAIL.m3a).innerText())
    && /Baraka Kweka/.test(await row(owner, DETAIL.m3b).innerText()) && /Source contradicts the verdict/.test(await row(owner, DETAIL.m3b).innerText())
    && /Criterion does not decide it/.test(await row(owner, DETAIL.m7).innerText()));
ok("3.7 · ⭐ on the questions the Owner sealed, the Owner reads that another officer rules — and no ruling button",
  /You sealed M3, so another officer rules on its objections[.]/.test(await row(owner, DETAIL.m3a).innerText())
    && (await row(owner, DETAIL.m3a).getByRole("button").count()) === 0
    && /You sealed M5, so another officer rules on its objections[.]/.test(await row(owner, DETAIL.m5).innerText()));
ok("3.8 · on M7 (sealed by the results officer) the Owner, the fallback, may rule: Reject, Reverse, Void",
  (await row(owner, DETAIL.m7).getByRole("button", { name: "Reject…" }).count()) === 1 && (await row(owner, DETAIL.m7).getByRole("button", { name: "Reverse…" }).count()) === 1
    && (await row(owner, DETAIL.m7).getByRole("button", { name: "Void…" }).count()) === 1);
await tiles(owner, "owner-queue", () => row(owner, DETAIL.m3a));
noErrors(owner, "3 · the Owner's queue");

// ── 4 · an AUDITOR reads it, locked ───────────────────────────────────────────────────────────────────────────────
const auditor = await officer("+255700000013", "AUDITOR", "Asha Auditor");
await open(auditor);
const lockedRow = row(auditor, DETAIL.m7);
ok("4.1 · an AUDITOR sees every objection, each ruling locked with who can rule — never a button that bounces",
  (await lockedRow.count()) === 1 && (await lockedRow.getByRole("button", { name: /Reject|Reverse|Void|Reinstate/ }).count()) === 0
    && /Rule on this objection/i.test(await lockedRow.innerText()), clip(await lockedRow.innerText().catch(() => ""), 300));
await tiles(auditor, "auditor-locked", () => row(auditor, DETAIL.m7));
noErrors(auditor, "4 · the auditor's queue");

// ── 5 · a COMPLIANCE officer rules ────────────────────────────────────────────────────────────────────────────────
const comp = await officer("+255700000012", "COMPLIANCE", "Amina Compliance");
await open(comp);
const m5Buttons = await row(comp, DETAIL.m5).getByRole("button").allInnerTexts();
ok("5.0 · a void question is offered Reject and Reinstate only; a YES question Reject, Reverse and Void",
  JSON.stringify(m5Buttons) === JSON.stringify(["Reject…", "Reinstate…"])
    && JSON.stringify(await row(comp, DETAIL.m3a).getByRole("button").allInnerTexts()) === JSON.stringify(["Reject…", "Reverse…", "Void…"]), JSON.stringify(m5Buttons));
await tiles(comp, "compliance-queue", () => row(comp, DETAIL.m3a));

// 5.1 · REVERSE on M3's first objection, through the typed confirmation.
const dialog = comp.page.getByRole("alertdialog");
/** Open a ruling's dialog from a row, once any dialog before it has gone. */
async function openRuling(o, detail, button) {
  await until(async () => (await o.page.getByRole("alertdialog").count()) === 0, 30_000);
  await row(o, detail).getByRole("button", { name: button }).click();
  await until(() => o.page.getByRole("alertdialog").count(), 30_000);
  return o.page.getByRole("alertdialog");
}
/** Confirm, then wait for the dialog to go and for the row to read `decided`. */
async function landed(o, d, confirmName, detail, decided) {
  await d.getByRole("button", { name: confirmName }).click();
  const gone = await until(async () => (await o.page.getByRole("alertdialog").count()) === 0, 60_000);
  return !!gone && !!(await until(async () => decided.test(await row(o, detail).innerText()), 60_000));
}
await openRuling(comp, DETAIL.m3a, "Reverse…");
ok("5.1 · the dialog names the ruling and the question, and says what it does before anything is typed",
  /MLN-[0-9]{4}-W[0-9]{2} · M3/.test(await dialog.innerText()) && /Reverse the result/.test(await dialog.innerText()) && /M3's result changes from YES to NO and the week is graded again[.]/.test(await dialog.innerText())
    && /the objection window restarts once, from now/.test(await dialog.innerText()), clip(await dialog.innerText(), 400));
const confirm = dialog.getByRole("button", { name: "Reverse the result" });
const gate = dialog.getByPlaceholder("REVERSE");
await gate.fill("REVERS");
ok("5.2 · a wrong word leaves the ruling unarmed", await confirm.isDisabled());
await gate.fill("REVERSE");
ok("5.3 · the ruling's own word arms it", await confirm.isEnabled());
await tiles(comp, "dialog-reverse", () => dialog);
await confirm.click();
ok("5.4 · ⭐ with no note the ruling is refused at its field, the dialog stays open, and nothing is recorded",
  (await until(() => dialog.getByText(/Write what you checked and what it showed/).count(), 10_000)) !== null && (await dialog.count()) === 1
    && (await row(comp, DETAIL.m3a).getByRole("button", { name: "Reverse…" }).count()) === 1);
await dialog.locator("textarea").fill("The federation's published match report lists event 3 as not held; the result is NO.");
await gate.fill("REVERSE");
const toast = until(() => comp.page.getByText("Upheld: the result is reversed. The week's objection window restarted from now.").count(), 60_000);
const reversed = await landed(comp, dialog, "Reverse the result", DETAIL.m3a, /Upheld · result reversed by Amina Compliance on .*: The federation's published match report/);
ok("5.5 · ⭐ the REVERSE lands: the console says so, and that the window restarted from now (a toast: the decided case replaces its control)", !!(await toast));
ok("5.6 · the ruled objection reads as decided — upheld, the result reversed, by whom and why — with no ruling button",
  reversed && (await row(comp, DETAIL.m3a).getByRole("button").count()) === 0, clip(await row(comp, DETAIL.m3a).innerText(), 300));
const compOpen = comp.page.locator(`section[aria-label="${W.open} objections"]`);
const restartedLine = await until(async () => {
  const text = await compOpen.innerText();
  return /Now NO, on an objection upheld by Amina Compliance on .*[.] Sealed by Ali Admin[.]/.test(text)
    && /It has restarted once; a further change does not restart it[.]/.test(text) && /3 to rule/i.test(text);
}, 60_000);
ok("5.7 · M3 now reads NO on the objection Amina upheld, its seal still Ali's, and the week says its window restarted once", !!restartedLine, clip(await compOpen.innerText(), 400));
ok("5.8 · ⭐ MR-16 held absolute: on M3's next objection the officer who set its present result reads that another officer rules — no button",
  /You set M3's present result on an earlier objection, so another officer rules on its objections — the Owner, if no other compliance officer can[.]/.test(await row(comp, DETAIL.m3b).innerText())
    && (await row(comp, DETAIL.m3b).getByRole("button").count()) === 0, clip(await row(comp, DETAIL.m3b).innerText(), 300));
await tiles(comp, "after-reverse", () => row(comp, DETAIL.m3b));

// 5.9 · a second COMPLIANCE officer rejects M3's second objection, reviewing the result as it now stands.
const comp2 = await officer("+255700000014", "COMPLIANCE", "Kassim Compliance");
await open(comp2);
const d2 = await openRuling(comp2, DETAIL.m3b, "Reject…");
ok("5.9 · the second case on M3 is reviewed against the result as it now stands (NO), by an officer who neither sealed nor changed it",
  /M3 keeps its result [(]NO[)]/.test(await d2.innerText()), clip(await d2.innerText(), 300));
await d2.locator("textarea").fill("Already reversed on the first objection; the source reads NO.");
await d2.getByPlaceholder("REJECT").fill("REJECT");
ok("5.10 · the REJECT lands and the case reads as rejected, by Kassim",
  await landed(comp2, d2, "Reject · the result stands", DETAIL.m3b, /Rejected by Kassim Compliance on .*: Already reversed on the first objection/));
noErrors(comp2, "5.9–5.10 · the second officer's ruling");

// 5.11 · REINSTATE M5 with its result: the window does not restart a second time.
await open(comp);
const d3 = await openRuling(comp, DETAIL.m5, "Reinstate…");
ok("5.11 · the reinstatement says the window has already restarted once", /has already restarted once, so it does not restart again/.test(await d3.innerText()), clip(await d3.innerText(), 300));
await d3.getByRole("combobox", { name: "Reinstated result" }).click();
await comp.page.getByRole("option", { name: "YES" }).click();
await d3.locator("textarea").fill("The source published event 5's result; it was played in full.");
await d3.getByPlaceholder("REINSTATE").fill("REINSTATE");
const toast2 = until(() => comp.page.getByText("Upheld: the question is reinstated. The week is graded again; its objection window stays as it was.").count(), 60_000);
const reinstated = await landed(comp, d3, "Reinstate it", DETAIL.m5, /Upheld · question reinstated by Amina Compliance on/);
ok("5.12 · ⭐ the REINSTATE lands, re-grades the week and keeps its window", reinstated && !!(await toast2));
ok("5.13 · M5 now reads YES on the objection Amina upheld", !!(await until(async () =>
  /Now YES, on an objection upheld by Amina Compliance on/.test(await compOpen.locator("div").filter({ hasText: "M5 ·" }).first().innerText()), 60_000)));

// 5.14 · REJECT the closed week's objection.
const d4 = await openRuling(comp, DETAIL.closed, "Reject…");
await d4.locator("textarea").fill("The federation lists event 9 as played on Saturday; the seal stands.");
await d4.getByPlaceholder("REJECT").fill("REJECT");
const closedRuled = await landed(comp, d4, "Reject · the result stands", DETAIL.closed, /Rejected by Amina Compliance on/);
ok("5.14 · the closed week's last objection is ruled: its week says all ruled", closedRuled && !!(await until(async () =>
  /All ruled/i.test(await comp.page.locator(`section[aria-label="${W.closed} objections"]`).innerText()), 60_000)));
await tiles(comp, "after-rulings", () => comp.page.locator(`section[aria-label="${W.closed} objections"]`));
noErrors(comp, "5 · the compliance officer's rulings");

await browser.close();
console.log(`${String.fromCharCode(10)}maswali-objection-console: ${pass} passed, ${fail} failed · tiles in ${OUT}/`);
process.exit(fail === 0 ? 0 : 1);
