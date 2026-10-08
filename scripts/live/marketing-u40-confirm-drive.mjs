/**
 * U40b · /admin/campaigns/new — THE CONFIRM CARD and the dialog it opens, driven and MEASURED on a LOCAL in-memory server
 * (spec `docs/marketing-specs/ENGINE-SPEC.md` §4.6 "Drive"; OD27 · OD65 · OD67; the U40b review's fixes).
 * `npm run qa:marketing-confirm`.
 *
 * WHAT THIS PROVES, as GROWTH (a viewer who may NOT read a number, nor money) and ADMIN (the owner: both), at 1280x800 and
 * 360x780 with motion on, and the refusal again at BOTH widths with reduced motion — HeadlessChrome in the UA. Every
 * capture asserts the page's heading and the sentence its state is about BEFORE it photographs (`stateShot`), and frames
 * the Confirm card or the dialog; viewport tiles only, never a full page.
 *   · LOADING — the route's own ghost, reached from the campaign list with the composer's chunks held: the Confirm card's
 *     ghost is the card's height, whole and body (within 2px — ASSERTED), for a NEW composer (its reason "Write the Swahili
 *     message first.") and for a SAVED draft (the honesty line), at both widths.
 *   · IDLE — a saved draft of the thirteen seeded player accounts: "Confirm audience…" enabled, the honesty line on the
 *     card, and ⭐ NOTHING COUNTED AT REST: the page's RSC payload, fetched at the address the page stands at, carries no
 *     confirmation view (no watermark, no signed claim).
 *   · BLOCKED AT REST — unsaved text, a blank Swahili body, and an audience on screen the draft does not store (Save
 *     offered, never "Nothing to save"): the reason in the trigger's title AND on the card; a campaign past DRAFT (a seeded
 *     RUNNING and a DONE one) in words true of it, with no honesty line; a view-only role (AUDITOR) with the act gate's
 *     sentence.
 *   · COUNTED ON DEMAND — with every count held 3 s, the press reads "Counting the audience…" (busy), then the dialog
 *     opens on the figures counted for that press.
 *   · ⛔ NEVER OPENS BY ITSELF (the re-review's MINOR 1) — pressed, then the name typed while it counts: the answer lands
 *     on a form that says "Save first", and no dialog; the change undone, the card is back at rest and STILL no dialog.
 *   · BLOCKED BY THE READ — the source line missing (before the owner saves one), nobody matching, and over the campaign
 *     limit (the owner lowers it to TZS 100): the service's own sentence on the card WITHOUT "Nothing was confirmed", with
 *     "Check again"; the owner reads the cost and the limit, GROWTH the same refusal with NO figure — no "TZS" on GROWTH's
 *     page or in the read action's ANSWER to GROWTH, while the owner's answer carries it (G5.3).
 *   · A READ THAT FAILED — every count made to throw: "Couldn't count this audience just now." and "Count again"; the fault
 *     cleared, "Count again" opens the dialog.
 *   · TYPED OPEN — "Confirm 13 people?", the box focused with the DIGIT keypad, the count as its placeholder, Confirm
 *     disabled; GROWTH the count alone and no list, ADMIN the figures, the first five numbers masked and the money line.
 *     TYPED ARMED — "13" typed: Confirm enabled.
 *   · ENUMERATE — "U38b floor list" (three contacts): ADMIN gets the LIST tier ("Confirm these 3 people?", focus on Cancel,
 *     all three masked); ⛔ OD67: GROWTH gets the TYPED tier on the same draft (the count alone, no list) — and the read
 *     action's ANSWER to GROWTH carries no `"sample":[{` and none of the three masks a reader's answer lists. ⭐ The
 *     reader's answer is the positive control: the same check finds the list in it.
 *   · ⭐ REFUSED · audience_moved — NO BLINK: one more matching contact between the dialog and Confirm; the dialog STAYS (the
 *     same element, never removed — watched by a MutationObserver from the press to the re-arm) and RE-ARMS on the fresh
 *     number with the server's sentence on top, the box cleared and the focus back on the box or on Cancel — photographed
 *     the moment the sentence lands and settled, at 1280 and 360, with motion and with reduced motion; the panel does not
 *     move between the two (no entrance replayed).
 *   · ⭐ THE RE-READ IS CLOSABLE (the re-review's MINOR 3) — the refusal's figures read again with every count held 4 s:
 *     Confirm held (off, working), Cancel on, and Escape closes the dialog; the fresh figures land after — and open nothing.
 *   · REFUSED · a stale draft (saved in a second tab while the dialog is open): the dialog closes, "Not confirmed" with the
 *     server's sentence, and the card says to reload.
 *   · REFUSED · not_draft — the same draft confirmed in a second tab while this one's dialog is open: the dialog closes, the
 *     page is read again, and the toast is titled "Already confirmed" (from the row it then reads), never "Not confirmed".
 *   · ERROR — the confirmation's request lost on the wire: a toast that never claims "nothing was confirmed" and stays on
 *     screen, the dialog STILL OPEN with "13" kept and Confirm armed for a retry.
 *   · CONFIRMING — the request held 2.5 s: the dialog busy (aria-busy), both buttons off, Escape and the scrim refused.
 *     CONFIRMED — "Audience confirmed — 13 people. Nothing has been sent.", the dialog gone, the card's confirmed line, the
 *     Message card read-only, the trigger disabled "This campaign is already confirmed."
 *   · ⛔ FOCUS — `document.activeElement` is NEVER the dialog's Confirm button when it opens or after a refusal's re-arm.
 *   · FIT — no sideways scroll, nothing past the card's or the dialog panel's edge, at both widths; and no page threw an
 *     uncaught exception at any width or role (the dev overlay is hidden from the captures, so it is asserted).
 * ⚠️ DEPARTURES, recorded: (1) the ERROR state is forced by failing the confirmation's REQUEST, so the toast says the honest
 * "may already be confirmed" sentence — "nothing was confirmed" needs a server failure while the row is still a draft, which
 * no dev switch can make; `test:campaign-gates` §UI 13 and 14 hold both; (2) a confirmation whose audit record did not land
 * is not driven — no dev switch makes the audit chain refuse a row; §UI 13 holds its toast; (3) the action's own role
 * refusal (a grant taken away while the page is open) is not driven — the dev seed can only grant a view without the act,
 * which the page's act gate answers (driven); §UI 13 holds the refusal's toast; (4) PREPARING, PAUSED and CANCELLED are held
 * by §UI 8 — RUNNING and DONE are driven from the campaign seed; (5) "busy" (no slot of the split door's in
 * CONFIRM_SLOT_WAIT_MS) is not driven — no dev switch holds both slots for 15 s; §UI 17 holds the read's and the
 * confirmation's answers, and the bound; (6) nor is a READER's split that found no slot in time ("Couldn't work out who
 * will receive it just now…" where the four figures stand) — no switch fails the split alone; §UI 19 and 20 hold it.
 *
 * Run (in-memory, zero prod risk; a FRESH server — the drive saves the source line, which nothing clears, and adds to the
 * "moved" tag every run; remove .next before the boot: a stale .next 404s every /api/dev-test route):
 *   SMS_PROVIDER=console SESSION_SECRET=<32+ chars> OTP_PEPPER=<16+ chars> DISABLE_ADMIN_TOTP=true npx next dev -p 3103
 *     (a worktree whose node_modules is a junction: `npx next dev --webpack -p 3103`)
 *   BASE=http://localhost:3103 node scripts/live/marketing-u40-confirm-drive.mjs
 * ⛔ A PC whose `.env.local` holds REAL Blackball keys: pin `SMS_PROVIDER=console` — nothing in this drive sends (CONFIRMED
 *   sends nothing), and the console stub reaches no phone even if something did. ⛔ No DATABASE_URL: the seeds write the
 *   in-memory store. ⛔ Never against production: every seed is a dev-test route that answers 404 there.
 * ⛔ This file holds no backslash: every escape is built from character codes.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3103";
const SHOTS = join(".qa-shots", "marketing-setup", "u40b");
mkdirSync(SHOTS, { recursive: true });

let pass = 0;
let fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? " -- " + detail : ""}`); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** Whitespace runs, built from character codes (space, tab, LF, CR, no-break space) — no escape in this file. */
const WS = new RegExp("[" + String.fromCharCode(32, 9, 10, 13, 160) + "]+", "g");
const squash = (s) => (s || "").replace(WS, " ").trim();
const DOT = String.fromCharCode(0x2022);
const NL = String.fromCharCode(10);
/** A masked number as a JSON payload may spell it: its dots raw, or each written as its escape. */
const spellings = (masked) => [masked, masked.split(DOT).join(String.fromCharCode(92) + "u2022")];
const nf = new Intl.NumberFormat("en-US");
const people = (n) => `${nf.format(n)} ${n === 1 ? "person" : "people"}`;
/** How many people a dialog's title names — "Confirm 13 people?", "Confirm these 3 people?", "Confirm this person?". */
const countIn = (title) => {
  if (title.includes("this person")) return 1;
  const m = title.match(/[0-9][0-9,]*/);
  return m === null ? Number.NaN : Number(m[0].split(",").join(""));
};

/* ── the page's own words (composer-copy.ts, audience-copy.ts, the confirmation service, the act gate) ── */
const TITLE = "New SMS campaign";
const BODY_SW = "50pick: Mechi kubwa leo.";
const TRIGGER = "Confirm audience…";
const COUNTING = "Counting the audience…";
const HONESTY = "Confirming freezes this message and this audience. Nothing is sent until someone presses Start on the campaign's page.";
const SAVE_FIRST = "Save first — confirming freezes the saved message.";
const WRITE_SW = "Write the Swahili message first.";
const NOBODY = "Nobody matches this audience yet.";
const UNCOUNTED = "Couldn't count this audience just now.";
const COUNT_AGAIN = "Count again";
const CHECK_AGAIN = "Check again";
const ALREADY = "This campaign is already confirmed.";
const CLOSED = {
  RUNNING: "This campaign is sending — nothing here can change it.",
  DONE: "This campaign has finished sending.",
};
const STALE = "This draft was saved elsewhere after this page loaded — reload the page to see it, then confirm.";
const CONFIRMED_LINE = "Confirmed — nothing has been sent. Starting a campaign comes next in this release.";
const READ_ONLY = "This campaign is no longer a draft — its message can't change.";
const NOT_CONFIRMED = "Not confirmed";
const ALREADY_TITLE = "Already confirmed";
const DRAFT_CHANGED = "This draft was edited since you opened it. Review it again. Nothing was confirmed.";
const NOT_DRAFT = "This campaign is no longer a draft. It has already been confirmed or closed. Nothing was changed.";
const UNFINISHED = "Couldn't confirm — the server stopped before it answered, so this campaign may already be confirmed. Nothing has been sent. Try again: a campaign is never confirmed twice.";
/** The service's sentences as the CARD says them — without a refused confirmation's "Nothing was confirmed." */
const NEEDS_SOURCE = "This audience can include people from the contact book, so the message must carry its source line — and this campaign has none yet. The owner sets it on Admin → System → Marketing wordings; then save this draft again.";
const OVER_LIMIT_GROWTH = "This campaign could cost more than one campaign may spend. Narrow the audience, or ask the owner to raise the limit.";
const OVER_LIMIT_OWNER_HEAD = "This campaign could cost up to TZS ";
const OVER_LIMIT_OWNER_LIMIT = "more than the TZS 100 one campaign may spend.";
const FLOOR = "Your role sees how many people match, not who will receive it.";
const SETTINGS_SAVED = "Saved — campaigns use these from their next step.";
/** The act gate's own sentence names the role by its LABEL (`roleLabel` — admin-section-gate.tsx), never its enum key. */
const ACT_GATE_HEAD = "Read-only: the Auditor role";
const confirmedToast = (n) => `Audience confirmed — ${people(n)}. Nothing has been sent.`;
const movedNotice = (fresh, was) => `The audience changed while you were confirming. It is now ${people(fresh)} (was ${nf.format(was)}). Nothing was confirmed or sent.`;

/* ── the audiences (the dev seeds' worlds) ── */
const PLAYERS13 = "?pop=players&op=TELXER,TTCL";
const FLOOR_LIST = "?pop=book&list=lst_u38b_floor";
const MOVED = "?pop=book&tag=moved";
const WHOLE_BOOK = "?pop=book";
/** A tag no seed writes: nobody matches it. */
const NOBODY_TAG = "?pop=book&tag=u40b-nobody";
const SEEDED = { RUNNING: "cmp_seed_21", DONE: "cmp_seed_02" };

const S = {
  card: '[data-block="compose-confirm"]',
  state: '[data-block="compose-confirm"] [data-confirm-card]',
  ghost: '[data-skeleton="compose-confirm"]',
  ghostBody: '[data-skeleton="compose-confirm"] [data-confirm-card="loading"]',
  trigger: "[data-confirm-trigger]",
  again: "[data-confirm-again]",
  blocked: "[data-confirm-blocked]",
  honestyCard: '[data-confirm-honesty="card"]',
  confirmed: "[data-confirm-confirmed]",
  form: "[data-compose-form]",
  name: 'label[data-field="name"] input',
  bodySw: 'label[data-field="bodySw"] textarea',
  save: "[data-compose-save]",
  saved: "[data-compose-saved]",
  readOnly: "[data-compose-read-only]",
  newLink: 'main#main-content header a.btn[href="/admin/campaigns/new"]',
};
/** The confirmation dialog: the kit's alertdialog holding the card's body. */
const DLG = '[role="alertdialog"]:has([data-confirm-body])';
const D = {
  panel: `${DLG} [data-rung="modal"]`,
  notice: `${DLG} [data-confirm-notice]`,
  figures: `${DLG} [data-confirm-figures]`,
  floor: `${DLG} [data-confirm-floor]`,
  list: `${DLG} [data-confirm-list]`,
  row: `${DLG} [data-confirm-row]`,
  money: `${DLG} [data-confirm-money]`,
  estimate: `${DLG} [data-confirm-estimate]`,
  honesty: `${DLG} [data-confirm-honesty="dialog"]`,
  input: `${DLG} input`,
  confirm: `${DLG} button[type="submit"]`,
  cancel: `${DLG} form button[type="button"]`,
};
const TOAST_ITEMS = "button[data-toast-dismiss]";
/** The composer's chunks — held while the route's ghost is measured (U38b's hold, the card's own chunk added). */
const COMPOSER_CHUNKS = /src_app_admin_campaigns_new_(page_tsx|composer|audience|campaign-confirm)/;

const browser = await chromium.launch();
const runId = String(Date.now()).slice(-5);
const ROLE_CODE = { GROWTH: 2, ADMIN: 1, AUDITOR: 3 };
/** Every uncaught exception a page throws in the browser, with its role — the drive ends red on any. */
const pageErrors = [];

async function staffCtx(role, viewport, reducedMotion, n) {
  const ctx = await browser.newContext({ viewport, reducedMotion });
  // The dev server's own badge (a corner bubble production never has) is hidden from every capture — nothing else.
  await ctx.addInitScript(() => {
    const hide = () => {
      const st = document.createElement("style");
      st.textContent = "nextjs-portal { display: none !important; }";
      document.head.appendChild(st);
    };
    if (document.head) hide(); else document.addEventListener("DOMContentLoaded", hide);
  });
  const page = await ctx.newPage();
  // ⛔ A dirty form asks before it unloads (UnsavedChangesGuard): every page in this drive answers "leave".
  page.on("dialog", (d) => { d.accept().catch(() => {}); });
  page.on("pageerror", (e) => { pageErrors.push(`${role} ${viewport.width}: ${String(e?.message ?? e).slice(0, 200)}`); });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  // Every officer's budgets full again — the save's (`marketing.campaignSave`, 30 then 10 a minute) and the Confirm card's
  // read (`marketing.campaignConfirmRead`, 20 then 6 a minute): this drive saves a dozen drafts and presses a dozen times.
  await seed(page, "reset-rate-limits");
  // E.164, as every house drive seeds: +255, then 70, five run digits, the role's code and a slot.
  const phone = `+25570${runId}${ROLE_CODE[role]}${n}`;
  const r = await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { role, phone, name: `QA ${role}` } });
  if (!r.ok()) throw new Error(`seed-admin ${role} failed: ${r.status()}`);
  await page.evaluate(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  return { ctx, page };
}

/** A dev-only seed or switch; refuses to go on when it did not answer `ok`. */
async function seed(page, path) {
  const r = await page.request.post(`${BASE}/api/dev-test/${path}`);
  const body = await r.json().catch(() => ({}));
  if (!r.ok() || body.ok !== true) throw new Error(`seed ${path} failed: ${r.status()} ${JSON.stringify(body).slice(0, 200)}`);
  return body;
}

const mainText = async (page) => squash(await page.evaluate(() => document.querySelector("main#main-content")?.innerText ?? ""));
const heading = async (page) => squash(await page.locator("main#main-content h1").first().innerText().catch(() => ""));
const textOf = async (page, sel) => ((await page.locator(sel).count()) > 0 ? squash(await page.locator(sel).first().innerText().catch(() => "")) : "");
const has = async (page, sel) => (await page.locator(sel).count()) > 0;
const attr = (page, sel, name) => page.locator(sel).first().getAttribute(name).catch(() => null);
const isDisabled = (page, sel) => page.locator(sel).first().isDisabled().catch(() => null);
const cardState = (page) => attr(page, S.state, "data-confirm-card");
const dialogText = async (page) => ((await has(page, DLG)) ? squash(await page.locator(DLG).first().innerText().catch(() => "")) : "");
const dialogTitle = async (page) => squash((await attr(page, DLG, "aria-label")) ?? "");
const boxOf = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: Math.round((r.top + window.scrollY) * 100) / 100, h: Math.round(r.height * 100) / 100 };
}, sel);
/** The heights of an element's parts, two levels down (its children's children, in order) — a red's diagnosis. */
const partsOf = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return [];
  return [...el.children].flatMap((c) => [...c.children]).map((c) => Math.round(c.getBoundingClientRect().height * 100) / 100);
}, sel);

/** Where the focus is, in the dialog's terms. ⛔ `confirm` must never be true when it opens or after a re-arm. */
const focusOf = (page) => page.evaluate((dlg) => {
  const a = document.activeElement;
  const d = document.querySelector(dlg);
  const inDialog = Boolean(a && d && d.contains(a));
  return {
    inDialog,
    confirm: Boolean(inDialog && a.matches('button[type="submit"]')),
    input: Boolean(inDialog && a.tagName === "INPUT"),
    cancel: Boolean(inDialog && a.matches('form button[type="button"]')),
    inputMode: inDialog && a.tagName === "INPUT" ? a.getAttribute("inputmode") : null,
  };
}, DLG);

/** ⭐ A response's bytes read AS UTF-8 (the first full run, 2026-10-08): an RSC answer comes as `text/x-component` with no
 *  charset, and Playwright's `text()` then read the mask's "•" (E2 80 A2) as three Latin-1 characters — the masks the
 *  screen showed rightly could not be found in the answer, and the controls failed on the reading, not on the page. */
const utf8 = async (r) => Buffer.from(await r.body()).toString("utf8");
/** The page's RSC payload at the address it STANDS at — `new URL(page.url())`, its canonical one (a bare ?draft= redirects). */
async function pagePayload(page) {
  const u = new URL(page.url());
  const r = await page.request.get(`${BASE}${u.pathname}${u.search}`, { headers: { RSC: "1" } });
  return r.ok() ? await utf8(r) : "";
}
/** The next server action's answer, as the browser receives it. ⛔ Asked for BEFORE the press that sends it. */
function nextActionAnswer(page) {
  return page.waitForResponse((r) => r.request().method() === "POST" && Boolean(r.request().headers()["next-action"]), { timeout: 90000 })
    .then((r) => utf8(r)).catch(() => "");
}
/** The masks an answer lists (`"masked":"…"`), each ONCE and with its dots raw — an RSC answer can carry one row in more
 *  than one place (the first full run read six masks for three people), and may write a dot as its escape. */
const masksIn = (body) => [...new Set([...body.matchAll(/"masked":"([^"]+)"/g)].map((m) => m[1].split(String.fromCharCode(92) + "u2022").join(DOT)))];
/** Does an answer carry this mask, in either spelling? */
const carries = (body, masked) => spellings(masked).some((s) => body.includes(s));

/** Every toast's text, waited for until it holds `expected` (20 s). */
async function toastText(page, expected) {
  const deadline = Date.now() + 20000;
  let all = "";
  while (Date.now() < deadline) {
    all = squash(await page.evaluate((s) => [...document.querySelectorAll(s)].map((b) => b.parentElement?.textContent ?? "").join(" | "), TOAST_ITEMS));
    if (all.includes(expected)) break;
    await wait(250);
  }
  return all;
}
const dismissToasts = (page) => page.evaluate((s) => { for (const b of document.querySelectorAll(s)) b.click(); }, TOAST_ITEMS).catch(() => {});

/** The composer settled: its Confirm card drawn and the audience card's count landed. */
async function settle(page, timeout = 60000) {
  await page.waitForSelector(S.state, { timeout }).catch(() => {});
  await page.waitForFunction(() => document.querySelector('[data-audience-count="computing"]') === null, null, { timeout }).catch(() => {});
  await wait(500);
}
/** The composer at `query`, settled. */
async function openComposer(page, query = "") {
  await page.goto(`${BASE}/admin/campaigns/new${query}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main#main-content h1", { timeout: 120000 });
  await settle(page);
}
/** A draft saved THROUGH THE COMPOSER for `query`'s audience — its id, read from the address it lands on (its canonical one). */
async function saveDraft(page, query, name) {
  await openComposer(page, query);
  await page.locator(S.name).fill(name);
  await page.locator(S.bodySw).fill(BODY_SW);
  await wait(300);
  await page.locator(S.save).click();
  await page.waitForFunction(() => new URL(location.href).searchParams.has("draft"), null, { timeout: 45000 }).catch(() => {});
  await page.waitForSelector(S.saved, { timeout: 30000 }).catch(() => {});
  await settle(page);
  return new URL(page.url()).searchParams.get("draft") ?? "";
}
/** A saved DRAFT reopened at its own address (a bare ?draft= is sent on to its canonical one, which carries `pop`). */
async function reopen(page, id) {
  await openComposer(page, `?draft=${encodeURIComponent(id)}`);
  await page.waitForFunction(() => new URL(location.href).searchParams.has("pop"), null, { timeout: 30000 }).catch(() => {});
  await settle(page);
}

/** Press the trigger (or "Count again") — the press counts — and wait for the dialog, or for the card to say why not. */
async function press(page, sel = S.trigger) {
  await page.locator(sel).first().click();
  await page.waitForFunction(([dlg, state]) => {
    const s = document.querySelector(state)?.getAttribute("data-confirm-card") ?? null;
    return document.querySelector(dlg) !== null || (s !== null && s !== "counting");
  }, [DLG, S.state], { timeout: 90000 }).catch(() => {});
  // The kit focuses the dialog's first target 30 ms after it opens; the entrance is one beat.
  await wait(600);
}
async function closeDialog(page) {
  if (await has(page, D.cancel)) await page.locator(D.cancel).first().click().catch(() => {});
  await page.waitForFunction((s) => !document.querySelector(s), DLG, { timeout: 15000 }).catch(() => {});
  await wait(300);
}
/** The typed tier gets the count its title names; a list needs nothing typed. */
async function typeCount(page) {
  if (await has(page, D.input)) await page.locator(D.input).fill(String(countIn(await dialogTitle(page))));
  await wait(200);
}

/** Viewport tiles only: the frame's top scrolled into view, or the viewport as it stands (a dialog). */
async function shoot(page, name, frame = S.card) {
  if (frame !== null) {
    await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "start" }), frame);
    await wait(250);
  }
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}
/** A tile centred on one node — the part of a long dialog a capture of its top cannot reach. */
async function tileOn(page, vp, name, sel) {
  await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: "center" }), sel);
  await wait(250);
  const inView = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight && r.height > 0;
  }, sel);
  ok(`${vp} · ${name} · the tile frames ${sel}`, inView);
  await page.screenshot({ path: join(SHOTS, `${vp}-${name}.png`) });
}
/** ⛔ Every capture asserts what it photographs FIRST — the heading, and the sentence the state is about. */
async function stateShot(page, vp, name, wantText, frame = S.card) {
  const h1 = await heading(page);
  const text = `${await mainText(page)} ${await dialogText(page)}`;
  ok(`${vp} · ${name} · the capture shows the "${TITLE}" heading and "${wantText.slice(0, 70)}"`, h1 === TITLE && text.includes(wantText),
    `h1="${h1}" text="${text.slice(0, 240)}"`);
  await shoot(page, `${vp}-${name}`, frame);
}
/** FIT: no sideways scroll; nothing past the Confirm card's edge, nor the dialog panel's when one is open. */
async function fitCheck(page, vp, name) {
  const f = await page.evaluate(([card, panel]) => {
    const spillOf = (box) => {
      const out = [];
      if (!box) return out;
      const br = box.getBoundingClientRect();
      for (const el of box.querySelectorAll("*")) {
        if (el.classList.contains("sr-only") || el.classList.contains("invisible")) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > br.right + 1 || r.left < br.left - 1) out.push(el.tagName.toLowerCase() + "." + String(el.className || "").slice(0, 30));
      }
      return out;
    };
    const c = document.querySelector(card);
    const spill = [...spillOf(c ? (c.querySelector(".glass-panel") ?? c) : null), ...spillOf(document.querySelector(panel))];
    return { overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth), spill: spill.slice(0, 5), spillCount: spill.length };
  }, [S.card, D.panel]);
  ok(`${vp} · ${name} · FIT — no sideways scroll, nothing past the card's or the dialog's edge`, f.overflow === 0 && f.spillCount === 0, JSON.stringify(f));
}

/** The confirmation's request, held `ms` before it is let through (the dialog's CONFIRMING state). */
async function holdAction(page, ms) {
  const hold = async (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.headers()["next-action"]) await wait(ms);
    await route.continue().catch(() => {});
  };
  await page.route(`${BASE}/admin/campaigns/new**`, hold);
  return () => page.unroute(`${BASE}/admin/campaigns/new**`, hold).catch(() => {});
}
/** The confirmation's request refused on the wire (the ERROR state: an answer that never comes back). */
async function failAction(page) {
  const refuse = async (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.headers()["next-action"]) { await route.abort("failed").catch(() => {}); return; }
    await route.continue().catch(() => {});
  };
  await page.route(`${BASE}/admin/campaigns/new**`, refuse);
  return () => page.unroute(`${BASE}/admin/campaigns/new**`, refuse).catch(() => {});
}

/** The owner's campaign limit, set through Admin → System → Marketing SMS (the U49s tab) and read back by its toast;
 *  answers whether it saved and the value the box held before. */
async function setLimit(page, tzs) {
  await page.goto(`${BASE}/admin/system?tab=marketing-sms`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-sms-settings="form"]', { timeout: 90000 });
  const box = page.locator('[data-field="campaignLimitTzs"] input').first();
  const was = await box.inputValue().catch(() => "");
  await box.fill(String(tzs));
  await wait(300);
  await page.locator("[data-sms-settings-save]").first().click();
  const t = await toastText(page, SETTINGS_SAVED);
  await dismissToasts(page);
  return { saved: t.includes(SETTINGS_SAVED), was };
}

/** ⭐ NO BLINK: watch the open dialog through a refusal — the element must stay in the document from the press to the
 *  re-arm. Answers a reader of what was seen. */
async function watchDialog(page) {
  await page.evaluate((dlg) => {
    const w = window;
    w.__u40bDlg = document.querySelector(dlg);
    w.__u40bGone = 0;
    if (w.__u40bObs) w.__u40bObs.disconnect();
    w.__u40bObs = new MutationObserver(() => {
      if (w.__u40bDlg === null || !document.contains(w.__u40bDlg)) w.__u40bGone++;
    });
    w.__u40bObs.observe(document.body, { childList: true, subtree: true });
  }, DLG);
  return () => page.evaluate((dlg) => {
    const w = window;
    if (w.__u40bObs) w.__u40bObs.disconnect();
    return { gone: w.__u40bGone, same: w.__u40bDlg !== null && document.querySelector(dlg) === w.__u40bDlg };
  }, DLG);
}

/**
 * ⭐ THE REFUSAL, RE-ARMED: one more matching contact between the dialog and Confirm. The dialog must stay (never removed),
 * re-arm on the fresh number with the server's sentence on top, clear its box, give the focus back to the box or Cancel,
 * and hold still once the sentence has landed — a remount would replay the entrance (or draw nothing for a commit).
 */
async function refusalRearms(page, tag, label) {
  await saveDraft(page, MOVED, `U40b moved ${label} ${runId}`);
  await press(page);
  const was = countIn(await dialogTitle(page));
  ok(`${tag} · REFUSED · audience_moved · the dialog opened on the "moved" tag`, (await has(page, DLG)) && Number.isFinite(was), await dialogTitle(page));
  await seed(page, "marketing-contacts-seed?u23moved=1");
  await typeCount(page);
  // ⭐ Every web font in BEFORE the measured moment (the first full run read the panel +16 px taller 700 ms after the
  // sentence, below the fold, in ONE of its four reduced-motion contexts — a late font swap re-wrapping a line is the
  // likeliest cause, and that is the browser's, not the dialog's). The check's detail now names which part moved.
  await page.evaluate(async () => { await document.fonts.ready; });
  const seen = await watchDialog(page);
  await page.locator(D.confirm).click();
  await page.waitForSelector(D.notice, { timeout: 90000 }).catch(() => {});
  const box1 = await boxOf(page, D.panel);
  const parts1 = await partsOf(page, D.panel);
  // ⭐ Photographed the moment the sentence lands — a remount would show its entrance, or nothing, here.
  await shoot(page, `${tag}-moved-rearmed-at-once`, null);
  await wait(700);
  const box2 = await boxOf(page, D.panel);
  const parts2 = await partsOf(page, D.panel);
  const watched = await seen();
  const f = await focusOf(page);
  const typed = await has(page, D.input);
  ok(`${tag} · REFUSED · audience_moved · ⭐ NO BLINK — the dialog stayed in the page throughout (the same element, never removed)`,
    watched.gone === 0 && watched.same === true, JSON.stringify(watched));
  ok(`${tag} · REFUSED · audience_moved · RE-ARMED on ${was + 1} with the server's sentence on top`,
    (await textOf(page, D.notice)) === movedNotice(was + 1, was) && countIn(await dialogTitle(page)) === was + 1,
    `${await textOf(page, D.notice)} · ${await dialogTitle(page)}`);
  ok(`${tag} · REFUSED · audience_moved · ⛔ the focus is back on the box (cleared) or on Cancel — never on Confirm`,
    !f.confirm && (typed ? f.input && (await page.locator(D.input).inputValue().catch(() => "x")) === "" : f.cancel), JSON.stringify(f));
  // On a red, the detail names WHICH part of the panel moved (each direct child's height, before and after).
  const moved = parts1.map((h, i) => (Math.abs(h - (parts2[i] ?? -1)) > 1 ? `#${i}:${h}→${parts2[i]}` : "")).filter(Boolean);
  ok(`${tag} · REFUSED · audience_moved · the panel holds still once the sentence lands (top and height within 1px) — no entrance replayed`,
    box1 !== null && box2 !== null && Math.abs(box1.top - box2.top) <= 1 && Math.abs(box1.h - box2.h) <= 1, `${JSON.stringify({ box1, box2 })} · moved [${moved.join(" ")}]`);
  await stateShot(page, tag, "moved-rearmed", movedNotice(was + 1, was), null);
  await fitCheck(page, tag, "moved-rearmed");
  await closeDialog(page);
}

/**
 * ⭐ THE RE-READ IS CLOSABLE (the re-review's MINOR 3): no request of the dialog's is in flight while a refusal's figures are
 * read again — Confirm is held (off, working), Cancel is on, and Escape closes it; the fresh figures land after the officer
 * has gone, and open nothing (MINOR 1).
 */
async function rereadClosable(page, tag, label) {
  await saveDraft(page, MOVED, `U40b closable ${label} ${runId}`);
  await press(page);
  ok(`${tag} · THE RE-READ IS CLOSABLE · the dialog opened on the "moved" tag`, await has(page, DLG), await dialogTitle(page));
  await seed(page, "marketing-contacts-seed?u23moved=1");
  await typeCount(page);
  // Every count held 4 s: the confirmation answers at once (refused — one more person), and its figures are read again, held.
  await seed(page, "marketing-audience-seed?delayMs=4000");
  try {
    await page.locator(D.confirm).click();
    await page.waitForFunction(([confirmSel, cancelSel]) => {
      const c = document.querySelector(confirmSel);
      const x = document.querySelector(cancelSel);
      return c !== null && x !== null && c.hasAttribute("disabled") && c.getAttribute("aria-busy") === "true" && !x.hasAttribute("disabled");
    }, [D.confirm, D.cancel], { timeout: 30000 }).catch(() => {});
    const held = {
      confirmOff: (await isDisabled(page, D.confirm)) === true,
      cancelOn: (await isDisabled(page, D.cancel)) === false,
      busy: (await attr(page, DLG, "aria-busy")) === "true",
    };
    await shoot(page, `${tag}-reread-held`, null);
    await page.keyboard.press("Escape");
    await page.waitForFunction((s) => !document.querySelector(s), DLG, { timeout: 5000 }).catch(() => {});
    const closed = !(await has(page, DLG));
    ok(`${tag} · THE RE-READ IS CLOSABLE · ⭐ while a refusal's figures are read again: Confirm held (off, working), Cancel on — and Escape closes the dialog`,
      held.confirmOff && held.cancelOn && held.busy && closed, JSON.stringify({ ...held, closed }));
  } finally {
    await seed(page, "marketing-audience-seed?delayMs=0");
  }
  await wait(5000);
  ok(`${tag} · THE RE-READ IS CLOSABLE · ⛔ the fresh figures landed after the officer closed it — and opened nothing`,
    !(await has(page, DLG)), `card ${await cardState(page)}`);
  await dismissToasts(page);
}

const VPS = [
  { name: "1280", width: 1280, height: 800 },
  { name: "360", width: 360, height: 780 },
];

/* ══ THE WORLD — through the dev seeds (404 in production), each through the platform's own writers ═══════════════ */
const drafts = { sourceless: "", book: "", floor: "" };
/** The masks a READER's read of the floor list carries — the positive control for OD67's payload check. */
let readerFloorMasks = [];
{
  const { ctx, page } = await staffCtx("ADMIN", VPS[0], "no-preference", 9);
  const world = await seed(page, "marketing-audience-seed?world=1");
  await seed(page, "marketing-contacts-seed?count=45");
  await seed(page, "marketing-contacts-seed?u23moved=1");
  await seed(page, "marketing-campaigns-seed?set=base");
  await seed(page, "marketing-audience-seed?delayMs=0");
  await seed(page, "marketing-audience-seed?fault=0");
  ok("WORLD · the audience seed answers its fixture: thirteen player accounts and a list of three",
    world.expected?.matching === 13 && world.listMembers === 3, JSON.stringify({ expected: world.expected, listMembers: world.listMembers }));
  // ⭐ BEFORE ANY SOURCE LINE IS SAVED: a book draft stamped with none — the source-line block, for both roles below.
  drafts.sourceless = await saveDraft(page, FLOOR_LIST, `U40b no source line ${runId}`);
  ok("WORLD · a book draft is saved before any source line exists", /^cmp_[A-Za-z0-9_-]+$/.test(drafts.sourceless), drafts.sourceless);
  await ctx.close();
}

/* ══ THE SOURCE-LINE BLOCK — learned on the press, before the owner's line exists ═════════════════════════════════ */
for (const role of ["GROWTH", "ADMIN"]) {
  for (const vp of VPS) {
    const tag = `${vp.name}-${role.toLowerCase()}`;
    const { ctx, page } = await staffCtx(role, { width: vp.width, height: vp.height }, "no-preference", vp.width === 1280 ? 3 : 4);
    await reopen(page, drafts.sourceless);
    ok(`${tag} · AT REST · nothing counted yet: the trigger enabled, the honesty line on the card`,
      (await isDisabled(page, S.trigger)) === false && (await textOf(page, S.honestyCard)) === HONESTY, `${await cardState(page)}`);
    await press(page);
    ok(`${tag} · BLOCKED BY THE READ · no source line: the service's sentence WITHOUT "Nothing was confirmed", in the title and on the card, with "${CHECK_AGAIN}"`,
      !(await has(page, DLG)) && (await isDisabled(page, S.trigger)) === true && (await attr(page, S.trigger, "title")) === NEEDS_SOURCE
        && (await textOf(page, S.blocked)) === NEEDS_SOURCE && (await textOf(page, S.again)) === CHECK_AGAIN
        && (await attr(page, S.again, "data-confirm-again")) === "check",
      `${await cardState(page)} · ${await textOf(page, S.blocked)}`);
    await stateShot(page, tag, "blocked-source-line", NEEDS_SOURCE);
    await fitCheck(page, tag, "blocked-source-line");
    await ctx.close();
  }
}
{
  const { ctx, page } = await staffCtx("ADMIN", VPS[0], "no-preference", 8);
  await seed(page, "marketing-typed-test-seed?source=1");
  // The whole contact book, saved once the line exists — the limit block's draft (≈50 people × TZS 6 > TZS 100).
  drafts.book = await saveDraft(page, WHOLE_BOOK, `U40b whole book ${runId}`);
  // The floor list (three contacts), saved once the line exists — every viewer's ENUMERATE draft.
  drafts.floor = await saveDraft(page, FLOOR_LIST, `U40b floor ${runId}`);
  ok("WORLD · the source line is saved, then a whole-book and a floor-list draft", [drafts.book, drafts.floor].every((d) => /^cmp_[A-Za-z0-9_-]+$/.test(d)), JSON.stringify(drafts));
  // ⭐ THE POSITIVE CONTROL: a reader's read of the floor list — the payload check must find the list in it.
  const answer = nextActionAnswer(page);
  await press(page);
  const body = await answer;
  readerFloorMasks = masksIn(body);
  ok(`WORLD · CONTROL · a reader's read of the floor list carries its list — "sample":[{ and three masks (the check can see one)`,
    body.includes('"sample":[{') && readerFloorMasks.length === 3 && readerFloorMasks.every((m) => m.includes(DOT)),
    `answer ${body.length} chars · masks ${JSON.stringify(readerFloorMasks)}`);
  await closeDialog(page);
  await ctx.close();
}

/* ══ EACH VIEWER, AT EACH WIDTH — motion on ════════════════════════════════════════════════════════════════════════ */
const measured = {};
for (const role of ["GROWTH", "ADMIN"]) {
  const reads = role === "ADMIN";
  for (const vp of VPS) {
    const tag = `${vp.name}-${role.toLowerCase()}`;
    console.log(`${NL}── ${role} at ${vp.name} ──`);
    const { ctx, page } = await staffCtx(role, { width: vp.width, height: vp.height }, "no-preference", vp.width === 1280 ? 1 : 2);
    ok(`${tag} · UA carries HeadlessChrome`, /HeadlessChrome/.test(await page.evaluate(() => navigator.userAgent)));

    // ── IDLE — a saved draft of the thirteen players; ⭐ NOTHING COUNTED AT REST ──────────────────────────────────────
    const typedId = await saveDraft(page, PLAYERS13, `U40b typed ${role} ${vp.name} ${runId}`);
    const restPayload = await pagePayload(page);
    ok(`${tag} · IDLE · "${TRIGGER}" enabled, no reason, the honesty line on the card`,
      (await cardState(page)) === "ready" && (await isDisabled(page, S.trigger)) === false && (await textOf(page, S.trigger)) === TRIGGER
        && !(await has(page, S.blocked)) && (await textOf(page, S.honestyCard)) === HONESTY,
      `${await cardState(page)} · ${await textOf(page, S.trigger)}`);
    ok(`${tag} · IDLE · ⭐ the review's MAJOR · nothing is counted at rest — the page's payload at ${new URL(page.url()).search.slice(0, 40)}… carries no confirmation view (no "watermark", no signed claim)`,
      restPayload.length > 1000 && !restPayload.includes('"watermark"') && !restPayload.includes("aw1."), `payload ${restPayload.length} chars`);
    await stateShot(page, tag, "idle", HONESTY);
    await fitCheck(page, tag, "idle");

    // ── LOADING — the route's ghost, from the campaign list, for a NEW composer and for the SAVED draft ──────────────
    for (const [label, opener, want, wantSel] of [
      ["new", S.newLink, WRITE_SW, S.blocked],
      ["saved", `tr[data-campaign-row][data-campaign-id="${typedId}"] td:first-child a`, HONESTY, S.honestyCard],
    ]) {
      await page.goto(`${BASE}/admin/campaigns`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(opener, { timeout: 90000 }).catch(() => {});
      await wait(600);
      let release = () => {};
      const gate = new Promise((r) => { release = r; });
      let held = 0;
      const HOLD = (url) => COMPOSER_CHUNKS.test(url.href);
      // ⭐ HOLD THE RESPONSE, NEVER THE REQUEST: fetched at once, handed over when the ghost has been measured.
      const holder = async (route) => {
        held++;
        const response = await route.fetch().catch(() => null);
        await gate;
        if (response) await route.fulfill({ response }).catch(() => {});
        else await route.continue().catch(() => {});
      };
      await page.route(HOLD, holder);
      let ghost = null;
      let ghostBody = null;
      let pageUp = true;
      try {
        await page.locator(opener).first().click().catch(() => {});
        await page.waitForSelector(S.ghostBody, { timeout: 90000 }).catch(() => {});
        await wait(300);
        ghost = await boxOf(page, S.ghost);
        ghostBody = await boxOf(page, S.ghostBody);
        pageUp = await has(page, S.form);
        await shoot(page, `${tag}-loading-${label}`, S.ghost);
      } finally {
        release();
      }
      await page.waitForSelector(S.state, { timeout: 90000 }).catch(() => {});
      await page.unroute(HOLD, holder).catch(() => {});
      await settle(page);
      const real = await boxOf(page, S.card);
      const realBody = await boxOf(page, S.state);
      const said = await textOf(page, wantSel);
      measured[`${tag}-${label}`] = { ghost: ghost?.h ?? null, card: real?.h ?? null, ghostBody: ghostBody?.h ?? null, body: realBody?.h ?? null, held };
      ok(`${tag} · LOADING · ${label} · the route's ghost is up, and not yet the page (the composer's chunks held: ${held})`,
        held > 0 && ghost !== null && ghostBody !== null && !pageUp, JSON.stringify({ ghost, ghostBody, held, pageUp }));
      ok(`${tag} · LOADING · ${label} · ⭐ the Confirm card's ghost is the card's height — the whole card and its body, within 2px — the card saying "${want.slice(0, 40)}"`,
        ghost !== null && real !== null && ghostBody !== null && realBody !== null
          && Math.abs(ghost.h - real.h) <= 2 && Math.abs(ghostBody.h - realBody.h) <= 2 && said === want,
        `${JSON.stringify(measured[`${tag}-${label}`])} · "${said}"`);
    }
    await reopen(page, typedId);

    // ── BLOCKED AT REST — unsaved text, a blank Swahili body, an audience on screen the draft does not store ──────────
    const savedName = await page.locator(S.name).inputValue().catch(() => "");
    await page.locator(S.name).fill(`${savedName} (edited)`);
    await wait(300);
    ok(`${tag} · BLOCKED · unsaved text: "${SAVE_FIRST}" in the trigger's title and on the card`,
      (await isDisabled(page, S.trigger)) === true && (await attr(page, S.trigger, "title")) === SAVE_FIRST && (await textOf(page, S.blocked)) === SAVE_FIRST,
      `${await textOf(page, S.blocked)}`);
    await stateShot(page, tag, "blocked-unsaved", SAVE_FIRST);
    await page.locator(S.name).fill(savedName);
    const savedBody = await page.locator(S.bodySw).inputValue().catch(() => "");
    await page.locator(S.bodySw).fill("");
    await wait(300);
    ok(`${tag} · BLOCKED · a blank Swahili body: "${WRITE_SW}" in the trigger's title and on the card`,
      (await isDisabled(page, S.trigger)) === true && (await attr(page, S.trigger, "title")) === WRITE_SW && (await textOf(page, S.blocked)) === WRITE_SW,
      await textOf(page, S.blocked));
    await stateShot(page, tag, "blocked-blank-swahili", WRITE_SW);
    await page.locator(S.bodySw).fill(savedBody);
    await wait(300);
    await openComposer(page, `?draft=${encodeURIComponent(typedId)}&pop=players&op=TTCL`);
    ok(`${tag} · BLOCKED · an audience on screen the draft does not store: "${SAVE_FIRST}", and Save is offered (never "Nothing to save")`,
      (await textOf(page, S.blocked)) === SAVE_FIRST && (await isDisabled(page, S.save)) === false, `${await textOf(page, S.blocked)} · save off ${await isDisabled(page, S.save)}`);
    await stateShot(page, tag, "blocked-audience-unsaved", SAVE_FIRST);
    await reopen(page, typedId);

    // ── ⛔ NEVER OPENS BY ITSELF (the re-review's MINOR 1) — typed while it counts, then undone: no dialog nobody pressed for ──
    await seed(page, "marketing-audience-seed?delayMs=3000");
    try {
      const nameNow = await page.locator(S.name).inputValue().catch(() => "");
      await page.locator(S.trigger).first().click();
      await wait(400);
      await page.locator(S.name).fill(`${nameNow} (typed while it counted)`);
      await page.waitForFunction((state) => document.querySelector(state)?.getAttribute("data-confirm-card") !== "counting", S.state, { timeout: 60000 }).catch(() => {});
      await wait(600);
      ok(`${tag} · NEVER OPENS BY ITSELF · the answer landed while the name was being typed: no dialog, "${SAVE_FIRST}" on the card`,
        !(await has(page, DLG)) && (await textOf(page, S.blocked)) === SAVE_FIRST, `${await cardState(page)} · ${await textOf(page, S.blocked)}`);
      await page.locator(S.name).fill(nameNow);
      await wait(1500);
      ok(`${tag} · NEVER OPENS BY ITSELF · ⛔ the change undone: the dialog does NOT pop open on the figures from before — the card at rest, the trigger enabled`,
        !(await has(page, DLG)) && (await isDisabled(page, S.trigger)) === false && (await textOf(page, S.honestyCard)) === HONESTY,
        `${await cardState(page)} · dialog ${await has(page, DLG)}`);
      await stateShot(page, tag, "never-opens-by-itself", HONESTY);
    } finally {
      await seed(page, "marketing-audience-seed?delayMs=0");
    }

    // ── COUNTED ON DEMAND → TYPED OPEN ───────────────────────────────────────────────────────────────────────────────
    await seed(page, "marketing-audience-seed?delayMs=3000");
    try {
      await page.locator(S.trigger).first().click();
      await wait(500);
      ok(`${tag} · COUNTING · the press reads "${COUNTING}" and is busy while the view is counted`,
        (await textOf(page, S.trigger)) === COUNTING && (await attr(page, S.trigger, "aria-busy")) === "true" && (await cardState(page)) === "counting",
        `${await textOf(page, S.trigger)} · ${await cardState(page)}`);
      await stateShot(page, tag, "counting", COUNTING);
      await page.waitForSelector(DLG, { timeout: 60000 }).catch(() => {});
      await wait(600);
    } finally {
      await seed(page, "marketing-audience-seed?delayMs=0");
    }
    const f1 = await focusOf(page);
    const dText = await dialogText(page);
    ok(`${tag} · TYPED OPEN · "Confirm 13 people?", the box focused with the DIGIT keypad, the count as its placeholder, Confirm disabled`,
      (await dialogTitle(page)) === "Confirm 13 people?" && f1.input && f1.inputMode === "numeric"
        && (await attr(page, D.input, "placeholder")) === "13" && (await isDisabled(page, D.confirm)) === true,
      `${await dialogTitle(page)} · ${JSON.stringify(f1)}`);
    ok(`${tag} · TYPED OPEN · ⛔ the Confirm button is not the focused element as the dialog opens`, !f1.confirm, JSON.stringify(f1));
    ok(`${tag} · TYPED OPEN · the estimate's segments for every role, and the honesty line`,
      (await textOf(page, D.estimate)).startsWith("Up to 13 SMS") && (await textOf(page, D.honesty)) === HONESTY, await textOf(page, D.estimate));
    if (reads) {
      ok(`${tag} · TYPED OPEN · a reader: the four figures, the first five numbers masked, the money line in TZS`,
        (await attr(page, D.figures, "data-confirm-figures")) === "full" && (await attr(page, D.list, "data-confirm-list")) === "first"
          && (await page.locator(D.row).count()) === 5 && (await textOf(page, D.money)).startsWith("Up to TZS"),
        `${await attr(page, D.figures, "data-confirm-figures")} · rows ${await page.locator(D.row).count()} · ${await textOf(page, D.money)}`);
    } else {
      ok(`${tag} · TYPED OPEN · ⛔ OD65 · GROWTH: the count alone and why — no list, no money line, no "TZS" in the dialog`,
        (await attr(page, D.figures, "data-confirm-figures")) === "count-alone" && (await textOf(page, D.floor)) === FLOOR
          && !(await has(page, D.list)) && !(await has(page, D.money)) && !dText.includes("TZS"), dText.slice(0, 240));
    }
    await stateShot(page, tag, "typed-open", "Confirm 13 people?", null);
    await fitCheck(page, tag, "typed-open");
    if (vp.width < 640) await tileOn(page, tag, "typed-open-honesty", D.honesty);

    // ── TYPED ARMED ──────────────────────────────────────────────────────────────────────────────────────────────────
    await page.locator(D.input).fill("13");
    await wait(300);
    ok(`${tag} · TYPED ARMED · "13" typed: Confirm is enabled`, (await isDisabled(page, D.confirm)) === false);
    await stateShot(page, tag, "typed-armed", "Confirm 13 people?", null);

    // ── ERROR — the confirmation's request lost on the wire: the dialog stays open, the typing kept, the toast honest ──
    {
      const release = await failAction(page);
      try {
        await page.locator(D.confirm).click();
        const t = await toastText(page, UNFINISHED);
        await wait(400);
        ok(`${tag} · ERROR · a toast that never claims nothing was confirmed; the dialog stays OPEN with "13" kept and Confirm armed again`,
          t.includes(UNFINISHED) && (await has(page, DLG)) && (await page.locator(D.input).inputValue().catch(() => "")) === "13"
            && (await isDisabled(page, D.confirm)) === false, `${t.slice(0, 160)} · open ${await has(page, DLG)}`);
        await stateShot(page, tag, "error", "Confirm 13 people?", null);
        await wait(6000);
        ok(`${tag} · ERROR · the uncertain answer stays on screen until it is read (still there after 6 s)`, (await toastText(page, UNFINISHED)).includes(UNFINISHED));
      } finally {
        await release();
        await dismissToasts(page);
      }
    }

    // ── CONFIRMING → CONFIRMED ───────────────────────────────────────────────────────────────────────────────────────
    {
      const release = await holdAction(page, 2500);
      try {
        await page.locator(D.confirm).click();
        await wait(600);
        const busy = await attr(page, DLG, "aria-busy");
        const buttonsOff = (await isDisabled(page, D.confirm)) === true && (await isDisabled(page, D.cancel)) === true;
        await page.keyboard.press("Escape");
        await wait(250);
        await page.mouse.click(5, 5);
        await wait(250);
        ok(`${tag} · CONFIRMING · the dialog is busy, both buttons off, and Escape and the scrim are refused`,
          busy === "true" && buttonsOff && (await has(page, DLG)), `busy ${busy} · off ${buttonsOff} · still open ${await has(page, DLG)}`);
        await stateShot(page, tag, "confirming", "Confirm 13 people?", null);
      } finally {
        await release();
      }
    }
    const tDone = await toastText(page, confirmedToast(13));
    await page.waitForFunction((s) => !document.querySelector(s), DLG, { timeout: 30000 }).catch(() => {});
    await settle(page);
    ok(`${tag} · CONFIRMED · the toast "${confirmedToast(13)}", the dialog gone`, tDone.includes(confirmedToast(13)) && !(await has(page, DLG)), tDone.slice(0, 160));
    ok(`${tag} · CONFIRMED · the card's confirmed line, the trigger disabled "${ALREADY}", the Message card read-only`,
      (await textOf(page, S.confirmed)) === CONFIRMED_LINE && (await cardState(page)) === "confirmed" && (await attr(page, S.trigger, "title")) === ALREADY
        && (await textOf(page, S.readOnly)) === READ_ONLY, `${await textOf(page, S.confirmed)} · ${await cardState(page)}`);
    await stateShot(page, tag, "confirmed", CONFIRMED_LINE);
    await fitCheck(page, tag, "confirmed");
    await dismissToasts(page);

    // ── PAST DRAFT — a seeded RUNNING and a DONE campaign, in words true of each, with no honesty line ───────────────
    for (const [status, id] of Object.entries(SEEDED)) {
      await openComposer(page, `?draft=${id}`);
      ok(`${tag} · PAST DRAFT · ${status}: "${CLOSED[status]}" in the title and on the card, the honesty line not said`,
        (await isDisabled(page, S.trigger)) === true && (await attr(page, S.trigger, "title")) === CLOSED[status] && (await textOf(page, S.blocked)) === CLOSED[status]
          && !(await has(page, S.honestyCard)) && (await cardState(page)) === "closed", `${await cardState(page)} · ${await textOf(page, S.blocked)}`);
      await stateShot(page, tag, `closed-${status.toLowerCase()}`, CLOSED[status]);
    }

    // ── ENUMERATE — the floor list of three: a reader's list tier; ⛔ OD67 · GROWTH's typed tier, its ANSWER listless ──
    await reopen(page, drafts.floor);
    const answer = nextActionAnswer(page);
    await press(page);
    const body = await answer;
    const f2 = await focusOf(page);
    if (reads) {
      ok(`${tag} · ENUMERATE · "Confirm these 3 people?", no box to type in, focus on Cancel, all three listed and masked`,
        (await dialogTitle(page)) === "Confirm these 3 people?" && !(await has(page, D.input)) && f2.cancel && !f2.confirm
          && (await attr(page, D.list, "data-confirm-list")) === "everyone" && (await page.locator(D.row).count()) === 3
          && (await page.locator(D.row).allInnerTexts()).every((t) => t.includes(DOT)),
        `${await dialogTitle(page)} · ${JSON.stringify(f2)} · rows ${await page.locator(D.row).count()}`);
      ok(`${tag} · ENUMERATE · CONTROL · the reader's answer carries the list ("sample":[{ and the three masks) — the payload check can see one`,
        body.includes('"sample":[{') && readerFloorMasks.length === 3 && readerFloorMasks.every((m) => carries(body, m)), `answer ${body.length} chars`);
      await stateShot(page, tag, "enumerate-open", "Confirm these 3 people?", null);
    } else {
      const leaked = readerFloorMasks.filter((m) => carries(body, m));
      ok(`${tag} · ENUMERATE · ⛔ OD67 · GROWTH types the count on the same three people — "Confirm 3 people?", the box focused, the count alone, no list`,
        (await dialogTitle(page)) === "Confirm 3 people?" && f2.input && !f2.confirm && (await attr(page, D.input, "placeholder")) === "3"
          && !(await has(page, D.list)) && (await attr(page, D.figures, "data-confirm-figures")) === "count-alone",
        `${await dialogTitle(page)} · ${JSON.stringify(f2)}`);
      ok(`${tag} · ENUMERATE · ⛔ OD67 · the read action's ANSWER to GROWTH carries no list — no "sample":[{ and none of the three masks the reader's answer lists`,
        body.length > 200 && body.includes('"tier":"typed"') && !body.includes('"sample":[{') && readerFloorMasks.length === 3 && leaked.length === 0,
        `answer ${body.length} chars · masks leaked ${leaked.length} · control masks ${readerFloorMasks.length}`);
      await stateShot(page, tag, "enumerate-as-typed", "Confirm 3 people?", null);
    }
    await fitCheck(page, tag, "enumerate-open");
    await closeDialog(page);

    // ── ⭐ REFUSED · audience_moved — re-armed, never remounted ─────────────────────────────────────────────────────
    await refusalRearms(page, tag, `${role} ${vp.name}`);

    // ── ⭐ THE RE-READ IS CLOSABLE — no request of the dialog's in flight ──────────────────────────────────────────────
    await rereadClosable(page, tag, `${role} ${vp.name}`);
    // The officer's read budget (`marketing.campaignConfirmRead`, 20 at once) full again for the steps that follow.
    await seed(page, "reset-rate-limits");

    // ── REFUSED · a stale draft — saved in a second tab while this one's dialog is open ─────────────────────────────
    await saveDraft(page, PLAYERS13, `U40b stale ${role} ${vp.name} ${runId}`);
    await press(page);
    {
      const second = await ctx.newPage();
      second.on("dialog", (d) => { d.accept().catch(() => {}); });
      await second.goto(page.url(), { waitUntil: "domcontentloaded" });
      await second.waitForSelector(S.name, { timeout: 90000 }).catch(() => {});
      await settle(second);
      await second.locator(S.name).fill(`U40b stale ${role} ${vp.name} ${runId} (saved elsewhere)`);
      await wait(300);
      await second.locator(S.save).click();
      await second.waitForSelector(S.saved, { timeout: 30000 }).catch(() => {});
      await second.close();
    }
    await typeCount(page);
    await page.locator(D.confirm).click();
    const tStale = await toastText(page, DRAFT_CHANGED);
    await page.waitForFunction((s) => !document.querySelector(s), DLG, { timeout: 30000 }).catch(() => {});
    await wait(500);
    ok(`${tag} · REFUSED · a stale draft: the dialog closes, "${NOT_CONFIRMED}" with the server's sentence, and the card says to reload`,
      tStale.includes(NOT_CONFIRMED) && tStale.includes(DRAFT_CHANGED) && !(await has(page, DLG)) && (await textOf(page, S.blocked)) === STALE,
      `${tStale.slice(0, 200)} · ${await textOf(page, S.blocked)}`);
    await stateShot(page, tag, "refused-stale", STALE);
    await dismissToasts(page);

    // ── REFUSED · not_draft — the same draft confirmed in a second tab while this one's dialog is open ─────────────────
    await saveDraft(page, PLAYERS13, `U40b twice ${role} ${vp.name} ${runId}`);
    await press(page);
    {
      const second = await ctx.newPage();
      second.on("dialog", (d) => { d.accept().catch(() => {}); });
      await second.goto(page.url(), { waitUntil: "domcontentloaded" });
      await second.waitForSelector("main#main-content h1", { timeout: 120000 }).catch(() => {});
      await settle(second);
      await press(second);
      await typeCount(second);
      await second.locator(D.confirm).click();
      const tSecond = await toastText(second, confirmedToast(13));
      ok(`${tag} · REFUSED · not_draft · the second tab confirmed the same draft first`, tSecond.includes(confirmedToast(13)), tSecond.slice(0, 160));
      await second.close();
    }
    await typeCount(page);
    await page.locator(D.confirm).click();
    const tTwice = await toastText(page, NOT_DRAFT);
    await page.waitForFunction((s) => !document.querySelector(s), DLG, { timeout: 30000 }).catch(() => {});
    await settle(page);
    ok(`${tag} · REFUSED · not_draft · titled "${ALREADY_TITLE}" from the row the page then reads, with the server's sentence — never "${NOT_CONFIRMED}"; the card's confirmed line`,
      tTwice.includes(ALREADY_TITLE) && tTwice.includes(NOT_DRAFT) && !tTwice.includes(NOT_CONFIRMED) && (await textOf(page, S.confirmed)) === CONFIRMED_LINE,
      tTwice.slice(0, 200));
    await stateShot(page, tag, "refused-not-draft", CONFIRMED_LINE);
    await dismissToasts(page);

    // ── A READ THAT FAILED — "Count again" ───────────────────────────────────────────────────────────────────────────
    await saveDraft(page, PLAYERS13, `U40b unread ${role} ${vp.name} ${runId}`);
    await seed(page, "marketing-audience-seed?fault=1");
    try {
      await press(page);
      ok(`${tag} · A READ THAT FAILED · "${UNCOUNTED}" on the card and "${COUNT_AGAIN}" beside the trigger — never a zero`,
        !(await has(page, DLG)) && (await textOf(page, S.blocked)) === UNCOUNTED && (await textOf(page, S.again)) === COUNT_AGAIN
          && (await attr(page, S.again, "data-confirm-again")) === "count" && (await cardState(page)) === "error",
        `${await cardState(page)} · ${await textOf(page, S.blocked)} · ${await textOf(page, S.again)}`);
      await stateShot(page, tag, "read-failed", UNCOUNTED);
      await fitCheck(page, tag, "read-failed");
    } finally {
      await seed(page, "marketing-audience-seed?fault=0");
    }
    await press(page, S.again);
    ok(`${tag} · A READ THAT FAILED · "${COUNT_AGAIN}" counts again and opens the dialog`, await has(page, DLG), await dialogTitle(page));
    await closeDialog(page);

    // ── NOBODY — a tag nobody carries ────────────────────────────────────────────────────────────────────────────────
    await saveDraft(page, NOBODY_TAG, `U40b nobody ${role} ${vp.name} ${runId}`);
    await press(page);
    ok(`${tag} · BLOCKED BY THE READ · nobody: "${NOBODY}" with "${CHECK_AGAIN}"`,
      !(await has(page, DLG)) && (await textOf(page, S.blocked)) === NOBODY && (await textOf(page, S.again)) === CHECK_AGAIN,
      `${await cardState(page)} · ${await textOf(page, S.blocked)}`);
    await stateShot(page, tag, "blocked-nobody", NOBODY);

    ok(`${tag} · no page threw an uncaught exception`, pageErrors.length === 0, pageErrors.join(" | "));
    await ctx.close();
  }
}

/* ══ THE LIMIT — the owner lowers it to TZS 100; the whole book (≈50 × TZS 6) is over it ══════════════════════════ */
{
  const owner = await staffCtx("ADMIN", VPS[0], "no-preference", 7);
  const lowered = await setLimit(owner.page, 100);
  ok("LIMIT · the owner saves a campaign limit of TZS 100", lowered.saved, `was "${lowered.was}"`);
  try {
    for (const role of ["ADMIN", "GROWTH"]) {
      for (const vp of VPS) {
        const tag = `${vp.name}-${role.toLowerCase()}`;
        const { ctx, page } = await staffCtx(role, { width: vp.width, height: vp.height }, "no-preference", vp.width === 1280 ? 5 : 6);
        await reopen(page, drafts.book);
        const answer = nextActionAnswer(page);
        await press(page);
        const body = await answer;
        const title = (await attr(page, S.trigger, "title")) ?? "";
        const said = await textOf(page, S.blocked);
        if (role === "ADMIN") {
          ok(`${tag} · BLOCKED BY THE READ · over the limit: the owner reads the cost and the limit in TZS, and the read's answer carries them`,
            (await isDisabled(page, S.trigger)) === true && said.startsWith(OVER_LIMIT_OWNER_HEAD) && said.includes(OVER_LIMIT_OWNER_LIMIT) && title === said
              && !said.includes("Nothing was") && body.includes("TZS"), said);
          await stateShot(page, tag, "blocked-limit", OVER_LIMIT_OWNER_LIMIT);
        } else {
          ok(`${tag} · BLOCKED BY THE READ · over the limit: ⛔ G5.3 · GROWTH reads the refusal with NO figure — no "TZS" on the page, in the title or in the read's answer`,
            (await isDisabled(page, S.trigger)) === true && said === OVER_LIMIT_GROWTH && title === OVER_LIMIT_GROWTH
              && !(await mainText(page)).includes("TZS") && body.length > 200 && !body.includes("TZS"), `${said} · answer has TZS ${body.includes("TZS")}`);
          await stateShot(page, tag, "blocked-limit", OVER_LIMIT_GROWTH);
        }
        await fitCheck(page, tag, "blocked-limit");
        await ctx.close();
      }
    }
  } finally {
    const back = /^[0-9]+$/.test(lowered.was) ? Number(lowered.was) : 10000;
    ok(`LIMIT · the owner puts the limit back to TZS ${back}`, (await setLimit(owner.page, back)).saved);
    await owner.ctx.close();
  }
}

/* ══ A VIEW-ONLY ROLE — the act gate's own sentence (the dev seed grants AUDITOR the view without the act) ════════════ */
{
  const admin = await staffCtx("ADMIN", VPS[0], "no-preference", 6);
  await seed(admin.page, "marketing-contacts-seed?u23grant=view-only");
  try {
    for (const vp of VPS) {
      const tag = `${vp.name}-auditor`;
      const { ctx, page } = await staffCtx("AUDITOR", { width: vp.width, height: vp.height }, "no-preference", vp.width === 1280 ? 1 : 2);
      await reopen(page, drafts.floor);
      const title = (await attr(page, S.trigger, "title")) ?? "";
      ok(`${tag} · BLOCKED · a view-only role: the trigger disabled with the act gate's sentence, in the title and on the card`,
        (await isDisabled(page, S.trigger)) === true && title.startsWith(ACT_GATE_HEAD) && (await textOf(page, S.blocked)) === title, title);
      await stateShot(page, tag, "blocked-view-only", ACT_GATE_HEAD);
      await fitCheck(page, tag, "blocked-view-only");
      await ctx.close();
    }
  } finally {
    await seed(admin.page, "marketing-contacts-seed?u23grant=reset");
    await admin.ctx.close();
  }
}

/* ══ REDUCED MOTION — both widths, both roles: the refusal re-armed at once, with no blink and no jump ═════════════════ */
for (const role of ["GROWTH", "ADMIN"]) {
  for (const vp of VPS) {
    const tag = `${vp.name}-${role.toLowerCase()}-reduced`;
    console.log(`${NL}── ${role} at ${vp.name}, reduced motion ──`);
    const { ctx, page } = await staffCtx(role, { width: vp.width, height: vp.height }, "reduce", vp.width === 1280 ? 7 : 8);
    await refusalRearms(page, tag, `${role} ${vp.name} reduced`);
    ok(`${tag} · no page threw an uncaught exception`, pageErrors.length === 0, pageErrors.join(" | "));
    await ctx.close();
  }
}

await browser.close();
console.log(`${NL}RECORDED · the Confirm card's ghost against the card (whole and body heights), per width, role and composer: ${JSON.stringify(measured)}`);
console.log(`${NL}qa:marketing-confirm: ${pass} passed, ${fail} failed · tiles in ${SHOTS}`);
process.exitCode = fail === 0 ? 0 : 1;
