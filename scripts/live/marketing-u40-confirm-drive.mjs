/**
 * U40b · /admin/campaigns/new — THE CONFIRM CARD and the dialog it opens, driven and MEASURED on a LOCAL in-memory server
 * (spec `docs/marketing-specs/ENGINE-SPEC.md` §4.6 "Drive"; OD27 · OD65 · OD67). `npm run qa:marketing-confirm`.
 *
 * WHAT THIS PROVES, as GROWTH (a viewer who may NOT read a number, nor money) and ADMIN (the owner: both), at 1280x800 and
 * 360x780 with motion on, and again at 360 with reduced motion — HeadlessChrome in the UA. Every capture asserts the page's
 * heading and the sentence its state is about BEFORE it photographs (`stateShot`), and frames the Confirm card or the
 * dialog; viewport tiles only, never a full page.
 *   · LOADING — every count held (dev switch): the card's own ghost under its title, then the card; the two heights are
 *     RECORDED (the line under the trigger wraps by width).
 *   · IDLE — a saved draft of the thirteen seeded player accounts: "Confirm audience…" enabled, the honesty line under it.
 *   · BLOCKED — unsaved text: the trigger disabled with "Save first — confirming freezes the saved message." in its title
 *     AND beside it; an audience on screen the draft does not store: the same, and Save offered (never "Nothing to save");
 *     the source line missing (before the owner saves one): the service's own sentence; over the campaign limit (the
 *     owner lowers it to TZS 100): the owner reads the cost and the limit, GROWTH the same refusal with NO figure — and no
 *     "TZS" anywhere in GROWTH's page, its trigger's title or its RSC payload (G5.3), while the owner's carries it.
 *   · COUNTING — with every count held 3 s, the trigger reads "Counting the audience…" (busy), then the dialog opens on the
 *     figures as they are now.
 *   · TYPED OPEN — thirteen people: "Confirm 13 people?", the box focused with the DIGIT keypad (inputmode numeric) and the
 *     count as its placeholder, Confirm disabled; GROWTH the count alone and no list, ADMIN the figures, the first five
 *     numbers masked and the money line. TYPED ARMED — "13" typed: Confirm enabled.
 *   · ENUMERATE — "U38b floor list" (three contacts): ADMIN gets the LIST tier ("Confirm these 3 people?", focus on
 *     Cancel, all three masked) — ⛔ OD67: GROWTH gets the TYPED tier on the same draft ("Confirm 3 people?", the box
 *     focused, the count alone, no list, no masked number anywhere in the dialog or in the page's RSC payload).
 *   · REFUSED · audience_moved — a dialog open on the "moved" tag, one more matching contact added (dev seed), Confirm: the
 *     dialog REMOUNTS on the fresh number with the server's sentence on top, the box cleared, the focus back on the box or
 *     on Cancel (an enumerate → typed crossing switches the tier); captured mid-entrance and settled (motion must be right).
 *   · REFUSED · other — a stale draft: the dialog open, the same draft saved in a second tab, Confirm: the dialog closes,
 *     "Not confirmed" with "This draft was edited since you opened it…", and the card says to reload.
 *   · ERROR — the action's request fails: a danger toast that never claims "nothing was confirmed", the dialog STILL OPEN
 *     with the typed text kept and Confirm armed for a retry.
 *   · CONFIRMING — the action's request held 2.5 s: the dialog busy (aria-busy), both buttons off, Escape and the scrim
 *     refused. CONFIRMED — the toast "Audience confirmed — 13 people. Nothing has been sent.", the dialog gone, the card's
 *     "Confirmed — nothing has been sent. Starting a campaign comes next in this release.", the Message card read-only, the
 *     trigger disabled "This campaign is already confirmed."
 *   · ⛔ FOCUS — `document.activeElement` is NEVER the dialog's Confirm button when it opens or after a refusal's remount.
 *   · FIT — no sideways scroll, nothing past the card's or the dialog panel's edge, at both widths; and no page threw an
 *     uncaught exception at any width or role (the dev overlay is hidden from the captures, so it is asserted).
 * ⚠️ DEPARTURES, recorded: (1) the ERROR state is forced by failing the action's REQUEST, so the toast says the honest
 * "may already be confirmed" sentence — the "nothing was confirmed" one needs a server failure while the row is still a
 * draft, which no dev switch can make; `test:campaign-gates` §UI holds the card's wiring for both; (2) the route's ghost
 * (`loading.tsx`) is not held here — U38b's drive holds the composer's chunks; this drive photographs the card's OWN ghost.
 *
 * Run (in-memory, zero prod risk; a FRESH server — the drive saves the source line, which nothing clears, and adds to the
 * "moved" tag every run; remove .next before the boot: a stale .next 404s every /api/dev-test route):
 *   SMS_PROVIDER=console SESSION_SECRET=<32+ chars> OTP_PEPPER=<16+ chars> DISABLE_ADMIN_TOTP=true npx next dev -p 3103
 *     (a worktree whose node_modules is a junction: `npx next dev --webpack -p 3103`)
 *   BASE=http://localhost:3103 node scripts/live/marketing-u40-confirm-drive.mjs
 * ⛔ A PC whose `.env.local` holds REAL Blackball keys: pin `SMS_PROVIDER=console` — nothing in this drive sends (CONFIRMED
 *   sends nothing), and the console stub reaches no phone even if something did. ⛔ No DATABASE_URL: the seeds write the
 *   in-memory store. ⛔ Never against production: every seed is a dev-test route that answers 404 there.
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
const nf = new Intl.NumberFormat("en-US");
const people = (n) => `${nf.format(n)} ${n === 1 ? "person" : "people"}`;

/* ── the page's own words (composer-copy.ts, campaign-confirm.ts, the confirmation service) ── */
const TITLE = "New SMS campaign";
const BODY_SW = "50pick: Mechi kubwa leo.";
const TRIGGER = "Confirm audience…";
const COUNTING = "Counting the audience…";
const HONESTY = "Confirming freezes this message and this audience. Nothing is sent until someone presses Start on the campaign's page.";
const SAVE_FIRST = "Save first — confirming freezes the saved message.";
const ALREADY = "This campaign is already confirmed.";
const STALE = "This draft was saved elsewhere after this page loaded — reload the page to see it, then confirm.";
const CONFIRMED_LINE = "Confirmed — nothing has been sent. Starting a campaign comes next in this release.";
const READ_ONLY = "This campaign is no longer a draft — its message can't change.";
const NOT_CONFIRMED = "Not confirmed";
const DRAFT_CHANGED = "This draft was edited since you opened it. Review it again. Nothing was confirmed.";
const UNFINISHED = "Couldn't confirm — the server stopped before it answered, so this campaign may already be confirmed. Nothing has been sent. Try again: a campaign is never confirmed twice.";
const NEEDS_SOURCE = "This audience can include people from the contact book, so the message must carry its source line — and this campaign has none yet. The owner sets it on Admin → System → Marketing wordings; then save this draft again. Nothing was confirmed.";
const OVER_LIMIT_GROWTH = "This campaign could cost more than one campaign may spend. Narrow the audience, or ask the owner to raise the limit. Nothing was confirmed.";
const OVER_LIMIT_OWNER_HEAD = "This campaign could cost up to TZS ";
const OVER_LIMIT_OWNER_LIMIT = "more than the TZS 100 one campaign may spend.";
const FLOOR = "Your role sees how many people match, not who will receive it.";
const SETTINGS_SAVED = "Saved — campaigns use these from their next step.";
const confirmedToast = (n) => `Audience confirmed — ${people(n)}. Nothing has been sent.`;
const movedNotice = (fresh, was) => `The audience changed while you were confirming. It is now ${people(fresh)} (was ${nf.format(was)}). Nothing was confirmed or sent.`;

/* ── the audiences (the dev seeds' worlds) ── */
const PLAYERS13 = "?pop=players&op=TELXER,TTCL";
const FLOOR_LIST = "?pop=book&list=lst_u38b_floor";
const MOVED = "?pop=book&tag=moved";
const WHOLE_BOOK = "?pop=book";

const S = {
  card: '[data-block="compose-confirm"]',
  state: '[data-block="compose-confirm"] [data-confirm-card]',
  trigger: "[data-confirm-trigger]",
  blocked: "[data-confirm-blocked]",
  honestyCard: '[data-confirm-honesty="card"]',
  confirmed: "[data-confirm-confirmed]",
  name: 'label[data-field="name"] input',
  bodySw: 'label[data-field="bodySw"] textarea',
  save: "[data-compose-save]",
  saved: "[data-compose-saved]",
  readOnly: "[data-compose-read-only]",
  panel: '[data-rung="modal"]',
};
/** The confirmation dialog: the kit's alertdialog holding the card's body. */
const DLG = '[role="alertdialog"]:has([data-confirm-body])';
const D = {
  body: `${DLG} [data-confirm-body]`,
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

const browser = await chromium.launch();
const runId = String(Date.now()).slice(-5);
const ROLE_CODE = { GROWTH: 2, ADMIN: 1 };
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

/** Where the focus is, in the dialog's terms. ⛔ `confirm` must never be true when it opens or after a remount. */
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

/** The page's RSC payload, fetched as the router fetches it — what reaches the browser, rendered or not. */
async function flightOf(page, pathAndQuery) {
  const r = await page.request.get(`${BASE}${pathAndQuery}`, { headers: { RSC: "1" } });
  return r.ok() ? await r.text() : "";
}

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

/** The Confirm card counted (its ghost gone) and the audience card's count landed. */
async function settle(page, timeout = 60000) {
  await page.waitForSelector(S.state, { timeout }).catch(() => {});
  await page.waitForFunction(() => {
    const c = document.querySelector('[data-block="compose-confirm"] [data-confirm-card]');
    const counting = document.querySelector('[data-audience-count="computing"]');
    return c !== null && c.getAttribute("data-confirm-card") !== "loading" && counting === null;
  }, null, { timeout }).catch(() => {});
  await wait(500);
}
/** The composer at `query`, settled. */
async function openComposer(page, query = "") {
  await page.goto(`${BASE}/admin/campaigns/new${query}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main#main-content h1", { timeout: 120000 });
  await settle(page);
}
/** A draft saved THROUGH THE COMPOSER for `query`'s audience — its id, read from the address it lands on. */
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
const draftQuery = (id) => `?draft=${encodeURIComponent(id)}`;
const draftPath = (id) => `/admin/campaigns/new${draftQuery(id)}`;
/** How many people a dialog's title names — "Confirm 13 people?", "Confirm these 3 people?", "Confirm this person?". */
const countIn = (title) => {
  if (title.includes("this person")) return 1;
  const m = title.match(/[0-9][0-9,]*/);
  return m === null ? Number.NaN : Number(m[0].split(",").join(""));
};

/** Press the trigger and wait for the dialog (the page is read again first). */
async function openDialog(page) {
  await page.locator(S.trigger).first().click();
  await page.waitForSelector(DLG, { timeout: 60000 }).catch(() => {});
  // The kit focuses the dialog's first target 30 ms after it opens; the entrance is one beat.
  await wait(600);
}
async function closeDialog(page) {
  if (await has(page, D.cancel)) await page.locator(D.cancel).first().click().catch(() => {});
  await page.waitForFunction((s) => !document.querySelector(s), DLG, { timeout: 15000 }).catch(() => {});
  await wait(300);
}

/** Viewport tiles only: the card's top scrolled into view, or the viewport as it stands (a dialog). */
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
        if (el.classList.contains("sr-only")) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > br.right + 1 || r.left < br.left - 1) out.push(el.tagName.toLowerCase() + "." + String(el.className || "").slice(0, 30));
      }
      return out;
    };
    const c = document.querySelector(card);
    const spill = [...spillOf(c ? (c.querySelector(".glass-panel") ?? c) : null), ...spillOf(document.querySelector(panel))];
    return { overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth), spill: spill.slice(0, 5), spillCount: spill.length };
  }, [S.card, S.panel]);
  ok(`${vp} · ${name} · FIT — no sideways scroll, nothing past the card's or the dialog's edge`, f.overflow === 0 && f.spillCount === 0, JSON.stringify(f));
}

/** The confirmation action's request, held `ms` before it is let through (the dialog's CONFIRMING state). */
async function holdAction(page, ms) {
  const hold = async (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.headers()["next-action"]) await wait(ms);
    await route.continue().catch(() => {});
  };
  await page.route(`${BASE}/admin/campaigns/new**`, hold);
  return () => page.unroute(`${BASE}/admin/campaigns/new**`, hold).catch(() => {});
}
/** The confirmation action's request refused on the wire (the ERROR state: an answer that never comes back). */
async function failAction(page) {
  const refuse = async (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.headers()["next-action"]) { await route.abort("failed").catch(() => {}); return; }
    await route.continue().catch(() => {});
  };
  await page.route(`${BASE}/admin/campaigns/new**`, refuse);
  return () => page.unroute(`${BASE}/admin/campaigns/new**`, refuse).catch(() => {});
}

/** The owner's campaign limit, set through Admin → System → Marketing SMS (the U49s tab), and read back by its toast. */
async function setLimit(page, tzs) {
  await page.goto(`${BASE}/admin/system?tab=marketing-sms`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-sms-settings="form"]', { timeout: 90000 });
  await page.locator('[data-field="campaignLimitTzs"] input').first().fill(String(tzs));
  await wait(300);
  await page.locator("[data-sms-settings-save]").first().click();
  const t = await toastText(page, SETTINGS_SAVED);
  await dismissToasts(page);
  return t.includes(SETTINGS_SAVED);
}

const VPS = [
  { name: "1280", width: 1280, height: 800 },
  { name: "360", width: 360, height: 780 },
];

/* ══ THE WORLD — through the dev seeds (404 in production), each through the platform's own writers ═══════════════ */
const drafts = { sourceless: "", book: "" };
{
  const { ctx, page } = await staffCtx("ADMIN", VPS[0], "no-preference", 9);
  const world = await seed(page, "marketing-audience-seed?world=1");
  await seed(page, "marketing-contacts-seed?count=45");
  await seed(page, "marketing-contacts-seed?u23moved=1");
  await seed(page, "marketing-audience-seed?delayMs=0");
  await seed(page, "marketing-audience-seed?fault=0");
  ok("WORLD · the audience seed answers its fixture: thirteen player accounts and a list of three",
    world.expected?.matching === 13 && world.listMembers === 3, JSON.stringify({ expected: world.expected, listMembers: world.listMembers }));
  // ⭐ BEFORE ANY SOURCE LINE IS SAVED: a book draft stamped with none — the source-line block, for both roles below.
  drafts.sourceless = await saveDraft(page, FLOOR_LIST, `U40b no source line ${runId}`);
  ok("WORLD · a book draft is saved before any source line exists", /^cmp_[A-Za-z0-9_-]+$/.test(drafts.sourceless), drafts.sourceless);
  await ctx.close();
}

/* ══ THE SOURCE-LINE BLOCK — each role, each width, before the owner's line exists ═════════════════════════════════ */
for (const role of ["GROWTH", "ADMIN"]) {
  for (const vp of VPS) {
    const tag = `${vp.name}-${role.toLowerCase()}`;
    const { ctx, page } = await staffCtx(role, { width: vp.width, height: vp.height }, "no-preference", vp.width === 1280 ? 3 : 4);
    await openComposer(page, `?draft=${encodeURIComponent(drafts.sourceless)}`);
    ok(`${tag} · BLOCKED · no source line: the trigger is disabled with the service's own sentence, in its title and beside it`,
      (await isDisabled(page, S.trigger)) === true && (await attr(page, S.trigger, "title")) === NEEDS_SOURCE && (await textOf(page, S.blocked)) === NEEDS_SOURCE,
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
  ok("WORLD · the source line is saved, then a whole-book draft", /^cmp_[A-Za-z0-9_-]+$/.test(drafts.book), drafts.book);
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

    // ── IDLE — a saved draft of the thirteen players ──────────────────────────────────────────────────────────────
    const typedId = await saveDraft(page, PLAYERS13, `U40b typed ${role} ${vp.name} ${runId}`);
    ok(`${tag} · IDLE · "${TRIGGER}" enabled, no reason beside it, the honesty line under it`,
      (await cardState(page)) === "ready" && (await isDisabled(page, S.trigger)) === false && (await textOf(page, S.trigger)) === TRIGGER
        && !(await has(page, S.blocked)) && (await textOf(page, S.honestyCard)) === HONESTY,
      `${await cardState(page)} · ${await textOf(page, S.trigger)}`);
    await stateShot(page, tag, "idle", TRIGGER);
    await fitCheck(page, tag, "idle");

    // ── LOADING — every count held: the card's own ghost, then the card ──────────────────────────────────────────
    await seed(page, "marketing-audience-seed?delayMs=4000");
    try {
      await page.goto(`${BASE}${draftPath(typedId)}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-confirm-card="loading"]', { timeout: 30000 }).catch(() => {});
      const ghost = await boxOf(page, '[data-confirm-card="loading"]');
      ok(`${tag} · LOADING · the card's ghost stands under its title while the view is counted`, ghost !== null, JSON.stringify(ghost));
      await shoot(page, `${tag}-loading`);
      await settle(page);
      measured[tag] = { ghost, card: await boxOf(page, S.state) };
    } finally {
      await seed(page, "marketing-audience-seed?delayMs=0");
    }

    // ── BLOCKED — unsaved text, then an audience on screen the draft does not store ───────────────────────────────
    const savedName = await page.locator(S.name).inputValue().catch(() => "");
    await page.locator(S.name).fill(`${savedName} (edited)`);
    await wait(300);
    ok(`${tag} · BLOCKED · unsaved text: "${SAVE_FIRST}" in the trigger's title and beside it`,
      (await isDisabled(page, S.trigger)) === true && (await attr(page, S.trigger, "title")) === SAVE_FIRST && (await textOf(page, S.blocked)) === SAVE_FIRST,
      `${await textOf(page, S.blocked)}`);
    await stateShot(page, tag, "blocked-unsaved", SAVE_FIRST);
    await page.locator(S.name).fill(savedName);
    await wait(300);
    await openComposer(page, `${draftQuery(typedId)}&pop=players&op=TTCL`);
    ok(`${tag} · BLOCKED · an audience on screen the draft does not store: "${SAVE_FIRST}", and Save is offered (never "Nothing to save")`,
      (await textOf(page, S.blocked)) === SAVE_FIRST && (await isDisabled(page, S.save)) === false, `${await textOf(page, S.blocked)} · save off ${await isDisabled(page, S.save)}`);
    await stateShot(page, tag, "blocked-audience-unsaved", SAVE_FIRST);
    // Back to the stored audience: a bare draft address is sent on to the address that carries it (STD-1).
    await openComposer(page, draftQuery(typedId));
    await page.waitForFunction(() => new URL(location.href).searchParams.has("pop"), null, { timeout: 30000 }).catch(() => {});
    await settle(page);

    // ── COUNTING → TYPED OPEN — the page read again, then the dialog on the figures as they are now ───────────────
    await seed(page, "marketing-audience-seed?delayMs=3000");
    try {
      await page.locator(S.trigger).first().click();
      await wait(500);
      ok(`${tag} · COUNTING · the trigger says "${COUNTING}" and is busy while the page is read again`,
        (await textOf(page, S.trigger)) === COUNTING && (await attr(page, S.trigger, "aria-busy")) === "true" && (await cardState(page)) === "counting",
        `${await textOf(page, S.trigger)} · ${await cardState(page)}`);
      await stateShot(page, tag, "counting", COUNTING);
      await page.waitForSelector(DLG, { timeout: 60000 }).catch(() => {});
      await wait(600);
    } finally {
      await seed(page, "marketing-audience-seed?delayMs=0");
    }
    const f1 = await focusOf(page);
    const typedWord = await attr(page, D.input, "placeholder");
    const dText = await dialogText(page);
    ok(`${tag} · TYPED OPEN · "Confirm 13 people?", the box focused with the DIGIT keypad, the count as its placeholder, Confirm disabled`,
      (await dialogTitle(page)) === "Confirm 13 people?" && f1.input && !f1.confirm && f1.inputMode === "numeric" && typedWord === "13"
        && (await isDisabled(page, D.confirm)) === true, `${await dialogTitle(page)} · ${JSON.stringify(f1)} · word ${typedWord}`);
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

    // ── TYPED ARMED — the count typed, as the figures write it ───────────────────────────────────────────────────
    await page.locator(D.input).fill("13");
    await wait(300);
    ok(`${tag} · TYPED ARMED · "13" typed: Confirm is enabled`, (await isDisabled(page, D.confirm)) === false);
    await stateShot(page, tag, "typed-armed", "Confirm 13 people?", null);

    // ── ERROR — the action's request fails: the dialog stays open, the typing kept, the toast honest ─────────────
    {
      const release = await failAction(page);
      try {
        await page.locator(D.confirm).click();
        const t = await toastText(page, UNFINISHED);
        await wait(400);
        ok(`${tag} · ERROR · a danger toast that never claims nothing was confirmed; the dialog stays OPEN with "13" kept and Confirm armed again`,
          t.includes(UNFINISHED) && (await has(page, DLG)) && (await page.locator(D.input).inputValue().catch(() => "")) === "13"
            && (await isDisabled(page, D.confirm)) === false, `${t.slice(0, 160)} · open ${await has(page, DLG)}`);
        await stateShot(page, tag, "error", "Confirm 13 people?", null);
      } finally {
        await release();
        await dismissToasts(page);
      }
    }

    // ── CONFIRMING → CONFIRMED — the request held 2.5 s: busy, both buttons off, Escape and the scrim refused ───────
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

    // ── ENUMERATE — the floor list of three: a reader's list tier; ⛔ OD67 · GROWTH's typed tier on the same people ─
    const listId = await saveDraft(page, FLOOR_LIST, `U40b list ${role} ${vp.name} ${runId}`);
    await openDialog(page);
    const f2 = await focusOf(page);
    if (reads) {
      ok(`${tag} · ENUMERATE · "Confirm these 3 people?", no box to type in, focus on Cancel, all three listed and masked`,
        (await dialogTitle(page)) === "Confirm these 3 people?" && !(await has(page, D.input)) && f2.cancel && !f2.confirm
          && (await attr(page, D.list, "data-confirm-list")) === "everyone" && (await page.locator(D.row).count()) === 3
          && (await page.locator(D.row).allInnerTexts()).every((t) => t.includes(DOT)),
        `${await dialogTitle(page)} · ${JSON.stringify(f2)} · rows ${await page.locator(D.row).count()}`);
      await stateShot(page, tag, "enumerate-open", "Confirm these 3 people?", null);
    } else {
      const flight = await flightOf(page, draftPath(listId));
      ok(`${tag} · ENUMERATE · ⛔ OD67 · GROWTH types the count on the same three people — "Confirm 3 people?", the box focused, the count alone, no list`,
        (await dialogTitle(page)) === "Confirm 3 people?" && f2.input && !f2.confirm && (await attr(page, D.input, "placeholder")) === "3"
          && !(await has(page, D.list)) && (await attr(page, D.figures, "data-confirm-figures")) === "count-alone",
        `${await dialogTitle(page)} · ${JSON.stringify(f2)}`);
      ok(`${tag} · ENUMERATE · ⛔ OD67 · no masked number in GROWTH's dialog, nor in its page's RSC payload`,
        !(await dialogText(page)).includes(DOT) && flight.length > 1000 && !flight.includes(DOT), `payload ${flight.length} chars`);
      await stateShot(page, tag, "enumerate-as-typed", "Confirm 3 people?", null);
    }
    await fitCheck(page, tag, "enumerate-open");
    await closeDialog(page);

    // ── REFUSED · audience_moved — one more matching contact between the dialog and Confirm: the dialog remounts ──
    await saveDraft(page, MOVED, `U40b moved ${role} ${vp.name} ${runId}`);
    await openDialog(page);
    const was = countIn(await dialogTitle(page));
    const wasTyped = await has(page, D.input);
    await seed(page, "marketing-contacts-seed?u23moved=1");
    if (wasTyped) await page.locator(D.input).fill(String(was));
    await wait(200);
    await page.locator(D.confirm).click();
    await page.waitForSelector(D.notice, { timeout: 60000 }).catch(() => {});
    await wait(60);
    await shoot(page, `${tag}-moved-remount-entering`, null);
    await wait(700);
    const f3 = await focusOf(page);
    const nowTyped = await has(page, D.input);
    ok(`${tag} · REFUSED · audience_moved · the dialog REMOUNTED on ${was + 1} with the server's sentence on top`,
      (await textOf(page, D.notice)) === movedNotice(was + 1, was) && (await dialogTitle(page)).includes(nf.format(was + 1)),
      `${await textOf(page, D.notice)} · ${await dialogTitle(page)}`);
    ok(`${tag} · REFUSED · audience_moved · ⛔ the focus is back on the box (cleared) or on Cancel — never on Confirm`,
      !f3.confirm && (nowTyped ? f3.input && (await page.locator(D.input).inputValue().catch(() => "x")) === "" : f3.cancel), JSON.stringify(f3));
    await stateShot(page, tag, "moved-remounted", movedNotice(was + 1, was), null);
    await fitCheck(page, tag, "moved-remounted");
    await closeDialog(page);

    // ── REFUSED · other — a stale draft: saved in a second tab while this tab's dialog is open ────────────────────
    const staleId = await saveDraft(page, PLAYERS13, `U40b stale ${role} ${vp.name} ${runId}`);
    await openDialog(page);
    const second = await ctx.newPage();
    second.on("dialog", (d) => { d.accept().catch(() => {}); });
    await second.goto(`${BASE}${draftPath(staleId)}`, { waitUntil: "domcontentloaded" });
    await second.waitForSelector(S.name, { timeout: 90000 }).catch(() => {});
    await settle(second);
    await second.locator(S.name).fill(`U40b stale ${role} ${vp.name} ${runId} (saved elsewhere)`);
    await wait(300);
    await second.locator(S.save).click();
    await second.waitForSelector(S.saved, { timeout: 30000 }).catch(() => {});
    await second.close();
    await page.locator(D.input).fill("13");
    await wait(200);
    await page.locator(D.confirm).click();
    const tStale = await toastText(page, DRAFT_CHANGED);
    await page.waitForFunction((s) => !document.querySelector(s), DLG, { timeout: 30000 }).catch(() => {});
    await wait(500);
    ok(`${tag} · REFUSED · a stale draft: the dialog closes, "${NOT_CONFIRMED}" with the server's sentence, and the card says to reload`,
      tStale.includes(NOT_CONFIRMED) && tStale.includes(DRAFT_CHANGED) && !(await has(page, DLG)) && (await textOf(page, S.blocked)) === STALE,
      `${tStale.slice(0, 200)} · ${await textOf(page, S.blocked)}`);
    await stateShot(page, tag, "refused-stale", STALE);
    await dismissToasts(page);

    ok(`${tag} · no page threw an uncaught exception`, pageErrors.length === 0, pageErrors.join(" | "));
    await ctx.close();
  }
}

/* ══ THE LIMIT — the owner lowers it to TZS 100; the whole book (≈50 × TZS 6) is over it ══════════════════════════ */
{
  const owner = await staffCtx("ADMIN", VPS[0], "no-preference", 7);
  ok("LIMIT · the owner saves a campaign limit of TZS 100", await setLimit(owner.page, 100));
  try {
    for (const role of ["ADMIN", "GROWTH"]) {
      for (const vp of VPS) {
        const tag = `${vp.name}-${role.toLowerCase()}`;
        const { ctx, page } = await staffCtx(role, { width: vp.width, height: vp.height }, "no-preference", vp.width === 1280 ? 5 : 6);
        await openComposer(page, draftQuery(drafts.book));
        await page.waitForFunction(() => new URL(location.href).searchParams.has("pop"), null, { timeout: 30000 }).catch(() => {});
        await settle(page);
        const title = (await attr(page, S.trigger, "title")) ?? "";
        const said = await textOf(page, S.blocked);
        const flight = await flightOf(page, draftPath(drafts.book));
        if (role === "ADMIN") {
          ok(`${tag} · BLOCKED · over the limit: the owner reads the cost and the limit in TZS`,
            (await isDisabled(page, S.trigger)) === true && said.startsWith(OVER_LIMIT_OWNER_HEAD) && said.includes(OVER_LIMIT_OWNER_LIMIT) && title === said
              && flight.includes("TZS"), said);
          await stateShot(page, tag, "blocked-limit", OVER_LIMIT_OWNER_LIMIT);
        } else {
          ok(`${tag} · BLOCKED · over the limit: ⛔ G5.3 · GROWTH reads the refusal with NO figure — no "TZS" in the page, the title or the RSC payload`,
            (await isDisabled(page, S.trigger)) === true && said === OVER_LIMIT_GROWTH && title === OVER_LIMIT_GROWTH
              && !(await mainText(page)).includes("TZS") && flight.length > 1000 && !flight.includes("TZS"), `${said} · payload has TZS ${flight.includes("TZS")}`);
          await stateShot(page, tag, "blocked-limit", OVER_LIMIT_GROWTH);
        }
        await fitCheck(page, tag, "blocked-limit");
        await ctx.close();
      }
    }
  } finally {
    ok("LIMIT · the owner puts the limit back to TZS 10,000", await setLimit(owner.page, 10000));
    await owner.ctx.close();
  }
}

/* ══ REDUCED MOTION — 360, both roles: the dialog and its remount arrive at once, with no jump ═════════════════════ */
for (const role of ["GROWTH", "ADMIN"]) {
  const vp = VPS[1];
  const tag = `${vp.name}-${role.toLowerCase()}-reduced`;
  console.log(`${NL}── ${role} at ${vp.name}, reduced motion ──`);
  const { ctx, page } = await staffCtx(role, { width: vp.width, height: vp.height }, "reduce", 7);
  await saveDraft(page, MOVED, `U40b reduced ${role} ${runId}`);
  await openDialog(page);
  const f = await focusOf(page);
  ok(`${tag} · OPEN · ⛔ the Confirm button is not focused as the dialog opens`, !f.confirm && (f.input || f.cancel), JSON.stringify(f));
  await stateShot(page, tag, "open", HONESTY, null);
  const was = countIn(await dialogTitle(page));
  await seed(page, "marketing-contacts-seed?u23moved=1");
  if (await has(page, D.input)) await page.locator(D.input).fill(String(was));
  await page.locator(D.confirm).click();
  await page.waitForSelector(D.notice, { timeout: 60000 }).catch(() => {});
  await wait(60);
  const box1 = await boxOf(page, S.panel);
  await shoot(page, `${tag}-moved-remount-at-once`, null);
  await wait(500);
  const box2 = await boxOf(page, S.panel);
  ok(`${tag} · REMOUNT · with reduced motion the remounted dialog is where it ends up at once (no entrance to wait for)`,
    box1 !== null && box2 !== null && Math.abs(box1.top - box2.top) <= 1 && Math.abs(box1.h - box2.h) <= 1, JSON.stringify({ box1, box2 }));
  const f2 = await focusOf(page);
  ok(`${tag} · REMOUNT · ⛔ the focus is back on the box or on Cancel — never on Confirm`, !f2.confirm && (f2.input || f2.cancel), JSON.stringify(f2));
  await closeDialog(page);
  ok(`${tag} · no page threw an uncaught exception`, pageErrors.length === 0, pageErrors.join(" | "));
  await ctx.close();
}

await browser.close();
console.log(`${String.fromCharCode(10)}RECORDED · the card's ghost against the card (top · height), per width and role: ${JSON.stringify(measured)}`);
console.log(`${String.fromCharCode(10)}qa:marketing-confirm: ${pass} passed, ${fail} failed · tiles in ${SHOTS}`);
process.exitCode = fail === 0 ? 0 : 1;
