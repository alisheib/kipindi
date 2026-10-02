/**
 * U37b · /admin/campaigns/new — the SMS campaign composer, driven and MEASURED, every state the unit names.
 *
 * WHAT THIS PROVES, at 1280x800 and 360x780 (+ reduced motion at 360), with HeadlessChrome in the UA. Every capture
 * asserts the page's heading and the sentence its state is about BEFORE it photographs (`stateShot`).
 *   PASS=console (the default boot — SMS_PROVIDER=console):
 *   · LOADING — the composer's own ghost while its page chunk is held (the list's ghost never stands in), the first
 *     card's top edge unmoved when the page swaps in (within 1px), and the three card-height differences RECORDED;
 *   · BLANK — Save off WITH its reason (beside it and in its title), the live counter at its full room, the source line's
 *     reserved room said, "No English text", the sender line the server's (the console stub, said honestly), the whole
 *     book as the audience, the test card naming the officer's own number masked and "Save first"; ⛔ no tel input, no
 *     number, sender or money control, no TZS;
 *   · REFUSED — no Swahili message; a message not starting "50pick"; a placeholder that is not {jina} — each said beside
 *     Save (and on its field), with Save off;
 *   · TYPING — the counter falls by exactly the characters typed, key by key, while the live region does not speak;
 *   · {jina} — the 12-character reserve (the counter falls by 12 for six typed characters), the fallback field appears,
 *     and Save says what it needs;
 *   · OVER-CAP — "N over · 2 messages · the limit is 1", announced once, Save off with the reason;
 *   · UNICODE — "Forced to Unicode by: ’ (curly apostrophe)", and "Replace with plain characters" puts it right;
 *   · SAVED — "Saved HH:MM", the address carries the draft (a reload reopens it), Save quiet with "Nothing to save" in
 *     its title, and the test card's exact preview (the stop link as xxxxxxxx until the first test);
 *   · TEST IDLE · TEST REFUSED (the ONE gate: no SMS consent, with the remedy link) · THE REMEDY (the officer's own
 *     consent switch, through that link) · TEST HANDED OVER — to the console stub, the exact text, NEVER "delivered" —
 *     the English test carrying the SAME stop link (one number, one link) · the budget (the 4th test refused);
 *   · EDIT AFTER SAVE (the test waits for the save) · STALE (a second tab saved first: refused with the time, Reload
 *     adopts theirs) · SAVE FAILED (the text kept, Try again lands) · TEST ERROR (the action failed in transit);
 *   · OD55 — an audience that is one phone number refused on the audience card (a name search is not);
 *   · MISSING (?draft= naming nothing) · READ-ONLY (a confirmed campaign) · ERROR (the read fault) · REFUSED (FINANCE).
 *   PASS=live-closed (SMS_PROVIDER=blackball with DUMMY keys and BLACKBALL_API_URL at a dead local port):
 *   · the sender line names the server's sender ID; the test card says up front that marketing SMS are not switched on;
 *     a test is refused live_sends_closed, and the preview still shows xxxxxxxx after a reload — no token was minted.
 *     ⛔ Nothing in this drive opens the switch or writes `marketing.sms.live`: opening it is the owner's act (G1).
 *   PASS=dead-rail (SMS_PROVIDER=blackball and NO keys):
 *   · the sender line speaks Admin → System's dead-rail words with both Railway names; a draft still saves; a test is
 *     refused rail_dead, pointing at that line.
 *   NOT DRIVEN: the test's "unconfirmed" state — it needs a carrier that took the request and lost the reply, which only a
 *   recorded switch could reach; `test:campaign-compose` §18.11 and §18.5's control hold it.
 *
 * The read-only campaign and the read fault come from U36's `/api/dev-test/marketing-campaigns-seed` (`?set=base`,
 * `?fault=1|0`); every officer is a fresh GROWTH account (`seed-admin`, a date of birth on file, NO SMS consent — the
 * remedy step gives it the way a person does). Officer numbers are unique per run, so a re-run needs no new boot —
 * but run U36's drive on its OWN fresh server: this one seeds campaigns, and U36's EMPTY state needs none.
 *
 * Run (three boots, one per pass, each in-memory, zero prod risk; stop the last server and remove .next before each —
 * a stale .next 404s every /api/dev-test route):
 *   SESSION_SECRET=<32+ chars> OTP_PEPPER=<16+ chars> DISABLE_ADMIN_TOTP=true npx next dev -p 3010
 *   BASE=http://localhost:3010 node scripts/live/marketing-compose-drive.mjs
 *   SMS_PROVIDER=blackball BLACKBALL_CLIENT_ID=dummy-not-a-key BLACKBALL_CLIENT_SECRET=dummy-not-a-key
 *     SMS_SENDER_ID=50pick BLACKBALL_API_URL=http://127.0.0.1:9/ SESSION_SECRET=… OTP_PEPPER=… DISABLE_ADMIN_TOTP=true
 *     npx next dev -p 3010
 *   PASS=live-closed BASE=http://localhost:3010 node scripts/live/marketing-compose-drive.mjs
 *   SMS_PROVIDER=blackball SESSION_SECRET=… OTP_PEPPER=… DISABLE_ADMIN_TOTP=true npx next dev -p 3010
 *   PASS=dead-rail BASE=http://localhost:3010 node scripts/live/marketing-compose-drive.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3010";
const PASS = process.env.PASS === "live-closed" || process.env.PASS === "dead-rail" ? process.env.PASS : "console";
const SHOTS = join(".qa-shots", "marketing-setup", "u37b", PASS);
mkdirSync(SHOTS, { recursive: true });

let pass = 0;
let fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? " -- " + detail : ""}`); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const NL = String.fromCharCode(10);
/** Whitespace runs, built from character codes (space, tab, LF, CR, no-break space) — no escape in this file. */
const WS = new RegExp("[" + String.fromCharCode(32, 9, 10, 13, 160) + "]+", "g");
const squash = (s) => (s || "").replace(WS, " ").trim();
const MID = String.fromCharCode(0xb7);
const DOT4 = String.fromCharCode(0x2022).repeat(4);
const RSQ = String.fromCharCode(0x2019);

/* ── the page's own words (composer-copy.ts and the two services) — what each state must print ── */
const TITLE = "New SMS campaign";
const BLOCKED = "Can't save yet: ";
const NAME_PROBLEM = "Give the campaign a name — only staff see it.";
const SAVE_FIRST = "Save first — the test sends the saved text.";
const EN_NONE = "No English text — everyone gets the Swahili message.";
const EN_RULE = "English goes to players whose account language is English; everyone else gets Swahili.";
const SENDER_STUB = "Sender: this server's SMS rail is the console stub — messages go to the server log, never to a phone. It can't be changed here.";
const SENDER_LIVE = "Sender 50pick — set on the server; it can't be changed here.";
const EVERYONE = "Everyone in the contact book — no filter.";
const AUDIENCE_NOTE = "Nothing is counted or sent from this page.";
const AUDIENCE_HIDDEN = "This draft's audience uses a filter your role can't see — saving keeps it as it is.";
const JINA_RESERVE = "{jina} keeps 12 characters for the name.";
const FALLBACK_PROBLEM = "This message uses {jina}, so it needs a word to print when a name cannot be used.";
const FORCED = "Forced to Unicode by:";
const NO_CHANGES = "Nothing to save — no changes since the last save.";
const READ_ONLY = "This campaign is no longer a draft — its message can't change.";
const MISSING = "This draft wasn't found — it may have been removed, or the link is wrong.";
const TEST_NOT_DRAFT = "Only a draft can be tested.";
const TOKEN_NOTE = "Your stop link is made the first time you send a test; until then it shows as xxxxxxxx.";
const LIVE_NOTE = "Marketing SMS are not switched on yet — a test is refused until the owner switches them on.";
const NO_CONSENT = "Your number has no SMS offers consent on record — turn on SMS offers on your own profile, then test again.";
const LIVE_CLOSED = "Marketing SMS are not switched on yet. The owner switches them on before the first send.";
const HANDED_STUB = "Handed to this server's console stub at ";
const STUB_TAIL = " — it went to the server log, not to a phone.";
const STALE = "Someone else saved this draft at ";
const SAVE_FAILED = "Couldn't save — your text is still here. Try again.";
const ACTION_FAILED = "Server error — nothing may have applied.";
const ONE_NUMBER = "A campaign goes to a group, never to one phone number — take the number out of the audience. To see the message on a phone, use the test send: it goes to your own number.";
const LOAD_ERROR = "Couldn't load this SMS campaign";
const LDQ = String.fromCharCode(0x201c);
const RDQ = String.fromCharCode(0x201d);
const SW_REQUIRED = "The Swahili message is required — it is the one every recipient can be sent.";
const NO_PREFIX = `The message must begin with ${LDQ}50pick${RDQ} so the sender is identified, as the law requires.`;
const NOT_PLACEHOLDER = `${LDQ}{name}${RDQ} is not a placeholder — the only one is {jina}, written exactly so, in lower case.`;
const SENDER_DEAD = `Blackball keys not set ${MID} no SMS can send, login codes included ${MID} set both keys on Railway`;
const RAIL_DEAD = "No SMS can leave this server right now — the sender line above says why.";
const SOURCE_RE = /^[0-9]+ characters are kept for the source line a contact-book number needs — its wording is not set yet\.$/;
const RATE_RE = /^That is the test limit for now — try again in [0-9]+ min\.$/;
const CLOCK_RE = /[0-9]{2}:[0-9]{2}/;
const FITS = new RegExp(`^([0-9,]+) characters? left ${MID} 1 message ${MID} (GSM-7|Unicode)$`);
const OVER = new RegExp(`^([0-9,]+) over ${MID} ([0-9]+) messages? ${MID} the limit is 1$`);
const TOKEN_TAIL = /\/s\/([A-Za-z0-9_-]{8})$/;

/* ── what the officer types ── */
const OFFICER = "Asha Mwita";
const NAME = "Derby week";
const BODY_TYPED = "50pick: Mechi kubwa leo.";
const EXTRA = " Karibu";
const BODY_JINA = "50pick: Habari {jina}, mechi kubwa leo.";
/** Past one message's room, and well inside two (the footer and the source line's reserve ride on top). */
const BODY_OVER = "50pick: " + "a".repeat(150);
const BODY_UNICODE = `50pick: Leo ni siku ya Simba${RSQ}s.`;
const BODY_EN = "50pick: Hello {jina}, big match today.";
const BODY_EDIT = "50pick: Habari {jina}, mechi kubwa leo usiku.";
const FALLBACK_SW = "Rafiki";
const FALLBACK_EN = "Friend";
/** The worst case the counter prices: {jina} as twelve W's (the renderer's reserve), so a plain body costs its length. */
const worst = (body) => body.split("{jina}").join("W".repeat(12)).trim().length;

const VIEWPORTS = [
  { name: "1280x800", width: 1280, height: 800 },
  { name: "360x780", width: 360, height: 780 },
];
/** Unique per run: nine national digits, NDC 70 (sendable), so a re-run on the same server meets no earlier officer. */
const RUN = String(Date.now() % 100000).padStart(5, "0");
const phoneFor = (nn) => `+25570${RUN}${String(nn).padStart(2, "0")}`;
const maskedFor = (phone) => `+255${DOT4}${phone.slice(-2)}`;

const SEL = {
  form: "[data-compose-form]",
  name: 'label[data-field="name"] input',
  bodySw: 'label[data-field="bodySw"] textarea',
  fallbackSw: 'label[data-field="nameFallbackSw"] input',
  bodyEn: 'label[data-field="bodyEn"] textarea',
  fallbackEn: 'label[data-field="nameFallbackEn"] input',
  save: "[data-compose-save]",
  reason: "[data-compose-save-reason]",
  saved: "[data-compose-saved]",
  message: '[data-block="compose-message"]',
  audience: '[data-block="compose-audience"]',
  test: '[data-block="compose-test"]',
  newLink: 'main#main-content header a.btn[href="/admin/campaigns/new"]',
};

const browser = await chromium.launch();

async function staffCtx(role, phone, viewport, reducedMotion = "no-preference", name = `QA ${role}`) {
  const ctx = await browser.newContext({ viewport, reducedMotion });
  const page = await ctx.newPage();
  // ⛔ A dirty form asks before it unloads (UnsavedChangesGuard): every page in this drive answers "leave".
  page.on("dialog", (d) => { d.accept().catch(() => {}); });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const r = await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { role, phone, name } });
  if (!r.ok()) throw new Error(`seed-admin ${role} failed: ${r.status()}`);
  await page.evaluate(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  return { ctx, page };
}

const seed = async (page, query) => {
  const r = await page.request.post(`${BASE}/api/dev-test/marketing-campaigns-seed?${query}`);
  if (!r.ok()) throw new Error(`campaign seed ${query} failed: ${r.status()} ${await r.text()}`);
  return r.json();
};

const boxOf = (page, selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: Math.round((r.top + window.scrollY) * 100) / 100, h: Math.round(r.height * 100) / 100, w: Math.round(r.width * 100) / 100 };
}, selector);
const mainText = async (page) => squash(await page.evaluate(() => document.querySelector("main#main-content")?.innerText ?? ""));
const heading = async (page) => squash(await page.locator("main#main-content h1").first().innerText().catch(() => ""));
const overflowOf = (page) => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
const textOf = async (page, sel) => ((await page.locator(sel).count()) > 0 ? squash(await page.locator(sel).first().innerText().catch(() => "")) : "");
const rawOf = async (page, sel) => ((await page.locator(sel).count()) > 0 ? squash(await page.locator(sel).first().textContent().catch(() => "")) : "");
const has = async (page, sel) => (await page.locator(sel).count()) > 0;
const attr = (page, sel, name) => page.locator(sel).first().getAttribute(name).catch(() => null);
const isDisabled = (page, sel) => page.locator(sel).first().isDisabled().catch(() => null);

/** `expect` — what the page must settle on: the form, the missing state, or anything (a refused or failed page). */
async function openComposer(page, query = "", expect = "form") {
  await page.goto(`${BASE}/admin/campaigns/new${query}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main#main-content h1", { timeout: 90000 });
  if (expect === "form") await page.waitForSelector(SEL.form, { timeout: 60000 }).catch(() => {});
  if (expect === "missing") await page.waitForSelector("[data-compose-missing]", { timeout: 60000 }).catch(() => {});
  await wait(expect === "any" ? 1500 : 900);
}

/** Viewport tiles only (never full-page): the top, or a block scrolled into view. */
async function shoot(page, name, scrollTo = null) {
  if (scrollTo) await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: "start" }), scrollTo);
  else await page.evaluate(() => window.scrollTo(0, 0));
  await wait(250);
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}
/** ⛔ Every capture asserts what it photographs FIRST: the page's own heading, and the sentence the state is about. */
async function stateShot(page, vp, name, wantText, scrollTo = null, wantHeading = TITLE) {
  const h1 = await heading(page);
  const text = await mainText(page);
  ok(`${vp} · ${name} · the capture shows the "${wantHeading}" heading and "${wantText}"`, h1 === wantHeading && text.includes(wantText),
    `h1="${h1}" text="${text.slice(0, 200)}"`);
  await shoot(page, `${vp}-${name}`, scrollTo);
}

/** ⚖️ FIT: no sideways page scroll and nothing past a card's edge at either width; at 1280 (the console's narrowest
 *  desktop) also no card past the content column, and no field label or counter line wrapped. */
const fitOf = (page) => page.evaluate(() => {
  const blocks = [...document.querySelectorAll('[data-block^="compose-"]')];
  const main = document.querySelector("main#main-content");
  const mainRight = main ? main.getBoundingClientRect().right : document.documentElement.clientWidth;
  const pastMain = blocks.filter((b) => b.getBoundingClientRect().right > mainRight + 1).map((b) => b.getAttribute("data-block"));
  const spill = [];
  for (const b of blocks) {
    const br = b.getBoundingClientRect();
    for (const el of b.querySelectorAll("*")) {
      if (el.classList.contains("sr-only")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > br.right + 1 || r.left < br.left - 1) spill.push(`${b.getAttribute("data-block")} > ${el.tagName.toLowerCase()}`);
    }
  }
  const wrapped = (el) => {
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 20;
    return el.getBoundingClientRect().height > lh * 1.5;
  };
  const legends = [...document.querySelectorAll("label[data-field] > :first-child")].filter(wrapped).map((el) => (el.textContent || "").trim());
  const counters = [...document.querySelectorAll("[data-counter-line]")].filter(wrapped).map((el) => (el.textContent || "").trim());
  return {
    overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    pastMain, spill: spill.slice(0, 6), spillCount: spill.length, legends, counters,
  };
});
async function fitCheck(page, vp, name) {
  const f = await fitOf(page);
  const desk = vp.startsWith("1280");
  const good = f.overflow === 0 && f.spillCount === 0 && (!desk || (f.pastMain.length === 0 && f.legends.length === 0 && f.counters.length === 0));
  ok(`${vp} · ${name} · FIT — no sideways scroll, nothing past a card's edge${desk ? ", no card past the content column, no label or counter line wrapped" : ""}`,
    good, JSON.stringify(f));
}

/* ── the counter, read by its own stamps ── */
const num = (s) => Number(String(s).replace(/,/g, ""));
async function counterOf(page, v = "SW") {
  const line = await textOf(page, `[data-counter="${v}"] [data-counter-line]`);
  const state = await attr(page, `[data-counter="${v}"]`, "data-counter-state");
  const live = await rawOf(page, `[data-counter-live="${v}"]`);
  const fits = FITS.exec(line);
  const over = OVER.exec(line);
  return {
    line, state, live,
    left: fits ? num(fits[1]) : null,
    over: over ? num(over[1]) : null,
    segments: over ? Number(over[2]) : fits ? 1 : null,
    encoding: fits ? fits[2] : null,
  };
}

/* ── the test card ── */
async function outcomeOf(page) {
  return page.evaluate(() => {
    const el = document.querySelector("[data-test-outcome]");
    if (!el) return null;
    const card = el.closest('[data-block="compose-test"]') || document;
    const kind = el.getAttribute("data-test-outcome");
    const first = kind === "handed_over" ? el.querySelector("p") : kind === "unconfirmed" ? el.querySelector("span") : el;
    const sent = card.querySelector("[data-test-sent]");
    return {
      outcome: kind,
      reason: el.getAttribute("data-test-reason"),
      sentence: (first?.textContent || "").trim(),
      sent: sent ? sent.textContent : null,
      consentLink: card.querySelector("[data-test-consent-link]")?.getAttribute("href") ?? null,
      sig: `${kind}|${el.getAttribute("data-test-reason") || ""}|${el.textContent || ""}`,
    };
  });
}
async function sendTest(page, variant) {
  const before = (await outcomeOf(page))?.sig ?? "";
  await page.locator(`[data-test-send="${variant}"]`).first().click();
  await page.waitForFunction((prev) => {
    const el = document.querySelector("[data-test-outcome]");
    if (!el) return false;
    return `${el.getAttribute("data-test-outcome")}|${el.getAttribute("data-test-reason") || ""}|${el.textContent || ""}` !== prev;
  }, before, { timeout: 30000 }).catch(() => {});
  await wait(500);
  return outcomeOf(page);
}
/** The preview is fresh — rendered from the revision this form last saved — and the test card is ready. */
async function waitReady(page) {
  await page.waitForSelector('[data-test-card="ready"]', { timeout: 30000 }).catch(() => {});
  await wait(300);
}
const previewOf = (page, v = "SW") => rawOf(page, `[data-test-preview="${v}"]`);

/** The next server-action POST from this page fails in transit — the action never reaches the server. */
async function armActionAbort(page) {
  let hits = 0;
  const pattern = "**/admin/campaigns/new**";
  const handler = async (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.headers()["next-action"]) {
      hits++;
      await route.abort("failed").catch(() => {});
      return;
    }
    await route.fallback().catch(() => {});
  };
  await page.route(pattern, handler);
  return { hits: () => hits, disarm: () => page.unroute(pattern, handler).catch(() => {}) };
}

async function save(page) {
  await page.locator(SEL.save).first().click();
  await page.waitForSelector(SEL.saved, { timeout: 30000 }).catch(() => {});
  await wait(600);
}

const measured = {};

/* ═══ PASS · console ═══════════════════════════════════════════════════════════════════════════════════════════ */
async function consolePass() {
  let base = null;
  for (const [i, vp] of VIEWPORTS.entries()) {
    console.log(`${NL}[u37b] ${vp.name}`);
    const viewport = { width: vp.width, height: vp.height };
    const phone = phoneFor(11 + i);
    const { ctx, page } = await staffCtx("GROWTH", phone, viewport, "no-preference", OFFICER);
    ok(`${vp.name} · UA carries HeadlessChrome`, /HeadlessChrome/.test(await page.evaluate(() => navigator.userAgent)));

    // ── LOADING — the list's head action, followed with the composer's page chunk held ─────────────────────────
    await page.goto(BASE + "/admin/campaigns", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(SEL.newLink, { timeout: 90000 }).catch(() => {});
    await wait(1500);
    let release = () => {};
    const gate = new Promise((r) => { release = r; });
    let held = 0;
    const HOLD = (url) => /src_app_admin_campaigns_new_(page_tsx|composer)/.test(url.href);
    // ⭐ HOLD THE RESPONSE, NEVER THE REQUEST: fetched at once, handed over when the ghost has been measured.
    const holder = async (route) => {
      held++;
      const response = await route.fetch().catch(() => null);
      await gate;
      if (response) await route.fulfill({ response }).catch(() => {});
      else await route.continue().catch(() => {});
    };
    await page.route(HOLD, holder);
    const link = page.locator(SEL.newLink).first();
    ok(`${vp.name} · the list's head action New campaign is there (CAMPAIGN_SCREENS.compose)`, (await link.count()) === 1);
    if ((await link.count()) === 1) {
      await link.click();
      await page.waitForSelector('[data-skeleton="compose-message"]', { timeout: 90000 }).catch(() => {});
      const ghost = {
        message: await boxOf(page, '[data-skeleton="compose-message"]'),
        audience: await boxOf(page, '[data-skeleton="compose-audience"]'),
        test: await boxOf(page, '[data-skeleton="compose-test"]'),
      };
      const realYet = await has(page, SEL.form);
      ok(`${vp.name} · LOADING · the composer's OWN ghost is on screen — three cards, message first — and the real form is not yet (chunks held: ${held})`,
        !!ghost.message && !!ghost.audience && !!ghost.test && ghost.message.top < ghost.audience.top && ghost.audience.top < ghost.test.top && !realYet,
        JSON.stringify({ ghost, realYet, held }));
      ok(`${vp.name} · LOADING · the ghost heads the page "${TITLE}" — never the list's ghost`,
        (await heading(page)) === TITLE && !(await has(page, '[data-skeleton="campaigns-card"]')), await heading(page));
      await shoot(page, `${vp.name}-loading`);
      release();
      await page.waitForSelector(SEL.form, { timeout: 60000 }).catch(() => {});
      await page.unroute(HOLD, holder).catch(() => {});
      await wait(900);
      const real = { message: await boxOf(page, SEL.message), audience: await boxOf(page, SEL.audience), test: await boxOf(page, SEL.test) };
      const delta = (k) => (ghost[k] && real[k] ? Math.round((real[k].h - ghost[k].h) * 100) / 100 : null);
      // ⚠️ RECORDED, NOT ASSERTED EQUAL: the cards' heights depend on what the draft holds (loading.tsx says why).
      measured[vp.name] = { ghostTop: ghost.message?.top, realTop: real.message?.top, heightDelta: { message: delta("message"), audience: delta("audience"), test: delta("test") } };
      ok(`${vp.name} · LOADING · the first card's top edge does not move when the page swaps in (within 1px)`,
        !!ghost.message && !!real.message && Math.abs(ghost.message.top - real.message.top) <= 1, `${ghost.message?.top} vs ${real.message?.top}`);
    } else {
      release();
      await page.unroute(HOLD, holder).catch(() => {});
      await openComposer(page);
    }

    // ── BLANK ───────────────────────────────────────────────────────────────────────────────────────────────────
    await page.waitForSelector(SEL.form, { timeout: 60000 }).catch(() => {});
    await wait(600);
    const sender = await textOf(page, "[data-sender-line]");
    if (i === 0 && sender !== SENDER_STUB) {
      ok(`PASS=console needs the CONSOLE boot — the sender line must be the stub's sentence`, false, `sender line "${sender}" — boot without SMS_PROVIDER, or run PASS=live-closed`);
      await ctx.close();
      return;
    }
    const blank = await counterOf(page);
    const reason = await textOf(page, SEL.reason);
    ok(`${vp.name} · BLANK · Save is off WITH its reason, beside it and in its title — the first problem in field order (the name)`,
      (await isDisabled(page, SEL.save)) === true && reason === BLOCKED + NAME_PROBLEM && (await attr(page, SEL.save, "title")) === BLOCKED + NAME_PROBLEM, reason);
    ok(`${vp.name} · BLANK · the live counter stands at its full room in one GSM-7 message, and says nothing yet`,
      blank.left !== null && blank.left > 0 && blank.encoding === "GSM-7" && blank.state === "fits" && blank.live === "Fits in one message.", JSON.stringify(blank));
    ok(`${vp.name} · BLANK · the source line's reserved room is said (its wording is not set — OQ3, G5)`,
      SOURCE_RE.test(await textOf(page, '[data-counter="SW"] [data-counter-source]')), await textOf(page, '[data-counter="SW"] [data-counter-source]'));
    ok(`${vp.name} · BLANK · no English body: everyone gets the Swahili message`, (await textOf(page, "[data-compose-en-rule]")) === EN_NONE);
    ok(`${vp.name} · BLANK · ⛔ OD45 · the sender is a line of text — the console stub, said as what it is — and no control names a sender`,
      sender === SENDER_STUB && (await attr(page, "[data-sender-line]", "data-sender-line")) === "ok"
        && (await page.locator('main#main-content input[name*="sender" i], main#main-content select, main#main-content [aria-label*="sender" i]').count()) === 0, sender);
    ok(`${vp.name} · BLANK · the audience is the whole book, in words, and nothing is counted here`,
      (await attr(page, "[data-audience]", "data-audience")) === "everyone" && (await textOf(page, "[data-audience-line]")) === EVERYONE
        && (await textOf(page, SEL.audience)).includes(AUDIENCE_NOTE));
    ok(`${vp.name} · BLANK · the test card names the officer's OWN number, masked, says "Save first", and its button is off`,
      (await textOf(page, "[data-test-to]")) === `To ${maskedFor(phone)} (your own number)` && (await textOf(page, "[data-test-blocked]")) === SAVE_FIRST
        && (await attr(page, "[data-test-card]", "data-test-card")) === "blocked" && (await isDisabled(page, '[data-test-send="SW"]')) === true
        && !(await has(page, "[data-test-live-note]")),
      `${await textOf(page, "[data-test-to]")} · ${await textOf(page, "[data-test-blocked]")}`);
    ok(`${vp.name} · BLANK · ⛔ no number control — no tel input, nothing named phone, msisdn, number or to — and ⛔ OD24 no TZS on the page`,
      (await page.locator('main#main-content input[type="tel"], main#main-content [inputmode="tel"], main#main-content input[name="phone"], main#main-content input[name="msisdn"], main#main-content input[name="number"], main#main-content input[name="to"]').count()) === 0
        && !/TZS/.test(await mainText(page)));
    await fitCheck(page, vp.name, "blank");
    await stateShot(page, vp.name, "blank", BLOCKED + NAME_PROBLEM);

    // ── REFUSED — the template's own refusals, each said beside Save and on its field ──────────────────────────────
    await page.locator(SEL.name).fill(NAME);
    await wait(250);
    ok(`${vp.name} · REFUSED · a name and no Swahili message — Save says the Swahili message is required`,
      (await isDisabled(page, SEL.save)) === true && (await textOf(page, SEL.reason)) === BLOCKED + SW_REQUIRED, await textOf(page, SEL.reason));
    await stateShot(page, vp.name, "refused-no-swahili", BLOCKED + SW_REQUIRED, SEL.message);
    await page.locator(SEL.bodySw).fill("Mechi kubwa leo.");
    await wait(250);
    ok(`${vp.name} · REFUSED · a message not starting "50pick" — the law's sender identity, said on the field and beside Save`,
      (await textOf(page, SEL.reason)) === BLOCKED + NO_PREFIX && (await textOf(page, 'label[data-field="bodySw"] p.text-danger-fg')) === NO_PREFIX,
      await textOf(page, SEL.reason));
    await stateShot(page, vp.name, "refused-no-sender-name", NO_PREFIX, SEL.message);
    await page.locator(SEL.bodySw).fill("50pick: Habari {name}.");
    await wait(250);
    ok(`${vp.name} · REFUSED · a placeholder that is not {jina} is named back`,
      (await textOf(page, SEL.reason)) === BLOCKED + NOT_PLACEHOLDER && (await isDisabled(page, SEL.save)) === true, await textOf(page, SEL.reason));
    await stateShot(page, vp.name, "refused-placeholder", NOT_PLACEHOLDER, SEL.message);

    // ── TYPING — the counter falls by exactly what was typed, key by key; the live region keeps still ─────────────
    await page.locator(SEL.bodySw).fill(BODY_TYPED);
    await wait(250);
    const typed = await counterOf(page);
    await page.locator(SEL.bodySw).press("End");
    await page.locator(SEL.bodySw).pressSequentially(EXTRA, { delay: 40 });
    await wait(250);
    const more = await counterOf(page);
    ok(`${vp.name} · TYPING · the counter falls by exactly the characters typed (${BODY_TYPED.length}, then ${EXTRA.length} more, key by key)`,
      blank.left !== null && typed.left === blank.left - worst(BODY_TYPED) && more.left === typed.left - EXTRA.length,
      `${blank.left} → ${typed.left} → ${more.left}`);
    ok(`${vp.name} · TYPING · the live region did not speak a number on every key — it still says the message fits`,
      typed.live === "Fits in one message." && more.live === "Fits in one message.");
    ok(`${vp.name} · TYPING · a valid draft can be saved (no reason shown), and the test still waits for a save`,
      (await isDisabled(page, SEL.save)) === false && !(await has(page, SEL.reason)) && (await textOf(page, "[data-test-blocked]")) === SAVE_FIRST);
    await fitCheck(page, vp.name, "typing");
    await stateShot(page, vp.name, "typing", more.line, SEL.message);

    // ── {jina} — the 12-character reserve, the fallback field, and what Save needs ───────────────────────────────
    await page.locator(SEL.bodySw).fill(BODY_JINA);
    await wait(300);
    const jina = await counterOf(page);
    const jinaReason = await textOf(page, SEL.reason);
    ok(`${vp.name} · {jina} · the counter prices the name at 12 characters (six typed, twelve kept) and says so`,
      blank.left !== null && jina.left === blank.left - worst(BODY_JINA) && (await textOf(page, '[data-counter="SW"] [data-counter-jina]')) === JINA_RESERVE,
      `${blank.left} → ${jina.left} (worst case ${worst(BODY_JINA)} for ${BODY_JINA.length} typed)`);
    ok(`${vp.name} · {jina} · the Swahili fallback field appears, and Save says it needs the word`,
      (await has(page, SEL.fallbackSw)) && (await isDisabled(page, SEL.save)) === true && jinaReason === BLOCKED + FALLBACK_PROBLEM, jinaReason);
    await page.locator(SEL.fallbackSw).fill(FALLBACK_SW);
    await wait(250);
    ok(`${vp.name} · {jina} · with the fallback written, Save is on`, (await isDisabled(page, SEL.save)) === false && !(await has(page, SEL.reason)));
    await stateShot(page, vp.name, "jina", JINA_RESERVE, SEL.message);

    // ── OVER-CAP ────────────────────────────────────────────────────────────────────────────────────────────────
    await page.locator(SEL.bodySw).fill(BODY_OVER);
    await wait(300);
    const over = await counterOf(page);
    const overReason = await textOf(page, SEL.reason);
    ok(`${vp.name} · OVER-CAP · "N over · 2 messages · the limit is 1", N the worst case past the room, announced once`,
      blank.left !== null && over.state === "over" && over.over === worst(BODY_OVER) - blank.left && over.segments === 2
        && over.live === "Over the limit — this is 2 messages.",
      JSON.stringify(over));
    ok(`${vp.name} · OVER-CAP · Save is off with the reason, and the Swahili field carries the problem`,
      (await isDisabled(page, SEL.save)) === true && overReason.startsWith(BLOCKED)
        && (await page.locator('label[data-field="bodySw"] p.text-danger-fg').count()) === 1, overReason);
    await fitCheck(page, vp.name, "over-cap");
    await stateShot(page, vp.name, "over-cap", over.line, SEL.message);

    // ── UNICODE — the offender named, and put right in one press ───────────────────────────────────────────────────
    await page.locator(SEL.bodySw).fill(BODY_UNICODE);
    await wait(300);
    const uni = await counterOf(page);
    const offenders = await textOf(page, '[data-counter="SW"] [data-counter-unicode]');
    ok(`${vp.name} · UNICODE · refused with the offender named — "${FORCED} ${RSQ} (curly apostrophe)" — and announced`,
      uni.state === "unicode" && offenders.startsWith(`${FORCED} ${RSQ} (curly apostrophe)`) && uni.live === "Unicode — refused until the marked characters are replaced."
        && (await isDisabled(page, SEL.save)) === true, `${offenders} · ${uni.live}`);
    await stateShot(page, vp.name, "unicode", FORCED, SEL.message);
    await page.locator('[data-counter="SW"] [data-counter-fold]').first().click();
    await wait(300);
    const folded = await counterOf(page);
    ok(`${vp.name} · UNICODE · "Replace with plain characters" puts it right — back to one GSM-7 message, the apostrophe plain`,
      folded.state === "fits" && folded.encoding === "GSM-7" && (await page.locator(SEL.bodySw).inputValue()) === BODY_UNICODE.split(RSQ).join("'"),
      `${folded.line} · "${await page.locator(SEL.bodySw).inputValue()}"`);

    // ── SAVED — the draft and its English, saved; the address carries it ─────────────────────────────────────────
    await page.locator(SEL.bodySw).fill(BODY_JINA);
    await page.locator(SEL.fallbackSw).fill(FALLBACK_SW);
    await page.locator(SEL.bodyEn).fill(BODY_EN);
    await wait(250);
    await page.locator(SEL.fallbackEn).fill(FALLBACK_EN);
    await wait(250);
    ok(`${vp.name} · ENGLISH · an English body brings its own counter and its rule`,
      (await has(page, '[data-counter="EN"]')) && (await textOf(page, "[data-compose-en-rule]")) === EN_RULE);
    await save(page);
    await waitReady(page);
    const url = new URL(page.url());
    const draftId = url.searchParams.get("draft") ?? "";
    const savedLine = await textOf(page, SEL.saved);
    ok(`${vp.name} · SAVED · "Saved HH:MM", and the address now names the draft (?draft=${draftId})`,
      /^cmp_[A-Za-z0-9_-]+$/.test(draftId) && /^Saved [0-9]{2}:[0-9]{2}$/.test(savedLine), `${savedLine} · ${page.url()}`);
    ok(`${vp.name} · SAVED · Save is quiet — no reason beside it, "Nothing to save" in its title`,
      (await isDisabled(page, SEL.save)) === true && !(await has(page, SEL.reason)) && (await attr(page, SEL.save, "title")) === NO_CHANGES);
    const pSw = await previewOf(page, "SW");
    const pEn = await previewOf(page, "EN");
    ok(`${vp.name} · SAVED · the test card previews the EXACT texts a test sends — the officer's own first name, the footer, the stop link as xxxxxxxx until the first test`,
      pSw.startsWith("50pick: Habari Asha, mechi kubwa leo.") && pSw.includes("18+") && pSw.endsWith("/s/xxxxxxxx")
        && pEn.startsWith("50pick: Hello Asha, big match today.") && pEn.endsWith("/s/xxxxxxxx") && (await textOf(page, SEL.test)).includes(TOKEN_NOTE),
      `SW "${pSw}" · EN "${pEn}"`);
    await fitCheck(page, vp.name, "saved");
    await stateShot(page, vp.name, "saved", savedLine, SEL.message);
    ok(`${vp.name} · TEST IDLE · the card is ready — both tests on, nothing sent yet`,
      (await attr(page, "[data-test-card]", "data-test-card")) === "ready" && (await isDisabled(page, '[data-test-send="SW"]')) === false
        && (await isDisabled(page, '[data-test-send="EN"]')) === false && !(await has(page, "[data-test-outcome]")));
    await stateShot(page, vp.name, "test-idle", "Swahili, as it will be sent to you", SEL.test);
    await openComposer(page, `?draft=${draftId}`);
    ok(`${vp.name} · SAVED · a reload reopens the draft from its address — the same name and text`,
      (await page.locator(SEL.name).inputValue()) === NAME && (await page.locator(SEL.bodySw).inputValue()) === BODY_JINA
        && (await page.locator(SEL.bodyEn).inputValue()) === BODY_EN);
    await waitReady(page);

    // ── TEST REFUSED — the ONE gate: this officer has given no SMS consent ───────────────────────────────────────
    const refused = await sendTest(page, "SW");
    ok(`${vp.name} · TEST REFUSED · the one gate refuses the officer's own number — no SMS consent — with the remedy named and linked`,
      refused?.outcome === "refused" && refused.reason === "no_consent" && refused.sentence === NO_CONSENT && refused.consentLink === "/profile/notifications",
      JSON.stringify(refused));
    await stateShot(page, vp.name, "test-refused-consent", NO_CONSENT, SEL.test);

    // ── THE REMEDY — the officer's own consent switch, through that link (the way a person gives it) ────────────────
    await page.locator("[data-test-consent-link]").first().click();
    await page.waitForURL((u) => u.pathname === "/profile/notifications", { timeout: 60000 }).catch(() => {});
    const toggle = page.locator('[data-testid="marketing-consent"] button[role="switch"]').first();
    await toggle.waitFor({ timeout: 60000 }).catch(() => {});
    const before = await toggle.getAttribute("aria-checked").catch(() => null);
    await toggle.click().catch(() => {});
    await page.waitForFunction(() => document.querySelector('[data-testid="marketing-consent"] button[role="switch"]')?.getAttribute("aria-checked") === "true",
      null, { timeout: 30000 }).catch(() => {});
    await wait(2000);
    const after = await toggle.getAttribute("aria-checked").catch(() => null);
    ok(`${vp.name} · REMEDY · the link opened the officer's own SMS consent switch, off; switched on, it holds`,
      new URL(page.url()).pathname === "/profile/notifications" && before === "false" && after === "true", `${page.url()} · ${before} → ${after}`);
    await openComposer(page, `?draft=${draftId}`);
    await waitReady(page);

    // ── TEST HANDED OVER — to the console stub; the exact text; never "delivered" ──────────────────────────────────
    const handed = await sendTest(page, "SW");
    const sentSw = squash(handed?.sent ?? "");
    const token = TOKEN_TAIL.exec(sentSw)?.[1] ?? "";
    ok(`${vp.name} · HANDED OVER · "Handed to this server's console stub at HH:MM — it went to the server log", the exact text shown, a real stop link`,
      handed?.outcome === "handed_over" && handed.sentence.startsWith(HANDED_STUB) && handed.sentence.endsWith(STUB_TAIL) && CLOCK_RE.test(handed.sentence)
        && sentSw.startsWith("50pick: Habari Asha, mechi kubwa leo.") && token !== "" && token !== "xxxxxxxx",
      JSON.stringify(handed));
    ok(`${vp.name} · HANDED OVER · ⛔ OD41 · never "delivered" — nowhere on the page`, !/deliver/i.test(await mainText(page)));
    await page.waitForFunction((t) => (document.querySelector('[data-test-preview="SW"]')?.textContent ?? "").trim().endsWith(`/s/${t}`), token, { timeout: 20000 }).catch(() => {});
    ok(`${vp.name} · HANDED OVER · the preview now carries that same stop link, and is the text that was sent`,
      (await previewOf(page, "SW")) === sentSw && !(await textOf(page, SEL.test)).includes(TOKEN_NOTE), `"${await previewOf(page, "SW")}"`);
    await fitCheck(page, vp.name, "handed-over");
    await stateShot(page, vp.name, "test-handed-over", HANDED_STUB, SEL.test);

    // ── THE ENGLISH TEST — one number, one link ────────────────────────────────────────────────────────────────────
    await waitReady(page);
    const english = await sendTest(page, "EN");
    const sentEn = squash(english?.sent ?? "");
    ok(`${vp.name} · ENGLISH TEST · handed over in English, carrying the SAME stop link (one number, one link)`,
      english?.outcome === "handed_over" && sentEn.startsWith("50pick: Hello Asha, big match today.") && token !== "" && sentEn.endsWith(`/s/${token}`),
      JSON.stringify(english));

    // ── THE BUDGET — three tests at once, then one every ten minutes ─────────────────────────────────────────────
    await waitReady(page);
    const limited = await sendTest(page, "SW");
    ok(`${vp.name} · BUDGET · the 4th test inside the window is refused with when to try again`,
      limited?.outcome === "refused" && limited.reason === "rate_limited" && RATE_RE.test(limited.sentence), JSON.stringify(limited));
    await stateShot(page, vp.name, "test-rate-limited", "That is the test limit for now", SEL.test);

    // ── EDIT AFTER SAVE — the test waits for the save, then previews the new text ─────────────────────────────────
    await page.locator(SEL.bodySw).fill(BODY_EDIT);
    await wait(300);
    ok(`${vp.name} · EDIT · an unsaved edit turns the test off — "Save first" — and Save on`,
      (await textOf(page, "[data-test-blocked]")) === SAVE_FIRST && (await isDisabled(page, '[data-test-send="SW"]')) === true && (await isDisabled(page, SEL.save)) === false);
    await save(page);
    await page.waitForFunction(() => (document.querySelector('[data-test-preview="SW"]')?.textContent ?? "").includes("usiku"), null, { timeout: 20000 }).catch(() => {});
    ok(`${vp.name} · EDIT · saved, and the preview follows the saved text`,
      (await previewOf(page, "SW")).startsWith("50pick: Habari Asha, mechi kubwa leo usiku.") && (await has(page, SEL.saved)));

    // ── STALE — a second tab saved first ──────────────────────────────────────────────────────────────────────────
    const pageB = await ctx.newPage();
    pageB.on("dialog", (d) => { d.accept().catch(() => {}); });
    await openComposer(pageB, `?draft=${draftId}`);
    await pageB.locator(SEL.name).fill(`${NAME} B`);
    await save(pageB);
    await page.locator(SEL.name).fill(`${NAME} A`);
    await page.locator(SEL.save).first().click();
    await page.waitForSelector('[data-compose-refusal="stale"]', { timeout: 30000 }).catch(() => {});
    const staleText = await textOf(page, '[data-compose-refusal="stale"]');
    ok(`${vp.name} · STALE · refused with when the other save happened — and every character typed is still here`,
      staleText.startsWith(STALE) && CLOCK_RE.test(staleText) && (await page.locator(SEL.name).inputValue()) === `${NAME} A`, staleText);
    await fitCheck(page, vp.name, "refused-stale");
    await stateShot(page, vp.name, "refused-stale", STALE, SEL.message);
    await page.getByRole("button", { name: "Reload" }).first().click().catch(() => {});
    await page.waitForFunction((n) => document.querySelector('label[data-field="name"] input')?.value === n, `${NAME} B`, { timeout: 30000 }).catch(() => {});
    ok(`${vp.name} · STALE · Reload puts the other tab's version on screen, and the refusal goes`,
      (await page.locator(SEL.name).inputValue()) === `${NAME} B` && !(await has(page, '[data-compose-refusal="stale"]')));
    await pageB.close();

    // ── SAVE FAILED — the action lost in transit: the text kept, Try again lands ──────────────────────────────────
    await page.locator(SEL.name).fill(`${NAME} final`);
    const cut = await armActionAbort(page);
    await page.locator(SEL.save).first().click();
    await page.waitForSelector('[data-compose-refusal="failed"]', { timeout: 30000 }).catch(() => {});
    const failText = await textOf(page, '[data-compose-refusal="failed"]');
    ok(`${vp.name} · SAVE FAILED · "Couldn't save — your text is still here", with Try again, and the text IS still there`,
      cut.hits() >= 1 && failText.startsWith(SAVE_FAILED) && failText.includes(ACTION_FAILED) && (await page.locator(SEL.name).inputValue()) === `${NAME} final`
        && (await page.getByRole("button", { name: "Try again" }).count()) === 1, failText);
    await stateShot(page, vp.name, "save-failed", SAVE_FAILED, SEL.message);
    await cut.disarm();
    await page.getByRole("button", { name: "Try again" }).first().click().catch(() => {});
    await page.waitForSelector(SEL.saved, { timeout: 30000 }).catch(() => {});
    await wait(600);
    ok(`${vp.name} · SAVE FAILED · Try again lands — saved, the refusal gone`,
      (await has(page, SEL.saved)) && !(await has(page, '[data-compose-refusal="failed"]')));

    // ── TEST ERROR — the test action lost in transit ────────────────────────────────────────────────────────────────
    await waitReady(page);
    const cut2 = await armActionAbort(page);
    const lost = await sendTest(page, "SW");
    ok(`${vp.name} · TEST ERROR · a test lost in transit says so — never "handed over"`,
      cut2.hits() >= 1 && lost?.outcome === "error" && lost.sentence.startsWith(ACTION_FAILED), JSON.stringify(lost));
    await stateShot(page, vp.name, "test-error", ACTION_FAILED, SEL.test);
    await cut2.disarm();

    // ── OD55 — an audience that is one phone number ───────────────────────────────────────────────────────────────
    await openComposer(page, "?q=0712345678");
    await page.locator(SEL.name).fill(NAME);
    await page.locator(SEL.bodySw).fill(BODY_TYPED);
    await wait(300);
    ok(`${vp.name} · OD55 · a whole phone number as the audience is refused ON the audience card, and Save says why`,
      (await textOf(page, "[data-audience-problem]")) === ONE_NUMBER && (await isDisabled(page, SEL.save)) === true
        && (await textOf(page, SEL.reason)) === BLOCKED + ONE_NUMBER, await textOf(page, "[data-audience-problem]"));
    await fitCheck(page, vp.name, "refused-one-number");
    await stateShot(page, vp.name, "refused-one-number", "never to one phone number", SEL.audience);
    await openComposer(page, "?q=Asha");
    ok(`${vp.name} · OD55 · a NAME search is a filter like any other — described, never refused`,
      (await attr(page, "[data-audience]", "data-audience")) === "filtered" && (await textOf(page, SEL.audience)).includes("Contacts matching:")
        && (await page.locator("[data-audience-line]").count()) >= 1 && !(await has(page, "[data-audience-problem]")));

    // ── MISSING — ?draft= naming nothing ────────────────────────────────────────────────────────────────────────────
    await openComposer(page, "?draft=cmp_nobody_here", "missing");
    ok(`${vp.name} · MISSING · said in words, with one way on — never a blank form posing as that draft`,
      (await textOf(page, "[data-compose-missing]")) === MISSING && (await has(page, "[data-compose-start]")) && !(await has(page, SEL.form)));
    await fitCheck(page, vp.name, "missing");
    await stateShot(page, vp.name, "missing", MISSING);
    await page.locator("[data-compose-start]").first().click();
    await page.waitForSelector(SEL.form, { timeout: 30000 }).catch(() => {});
    await wait(600);
    ok(`${vp.name} · MISSING · "Start a new SMS campaign" opens a blank composer`,
      (await has(page, SEL.form)) && !new URL(page.url()).searchParams.has("draft") && (await page.locator(SEL.name).inputValue()) === "");

    // ── READ-ONLY — a campaign that left DRAFT ─────────────────────────────────────────────────────────────────────
    if (base === null) base = await seed(page, "set=base");
    const confirmed = base.fixtures.find((f) => f.status === "CONFIRMED");
    await openComposer(page, `?draft=${confirmed?.id ?? "cmp_seed_05"}`);
    ok(`${vp.name} · READ-ONLY · a confirmed campaign opens read-only: said, every field off, Save off with the reason, no test`,
      (await attr(page, SEL.form, "data-compose-form")) === "read-only" && (await textOf(page, "[data-compose-read-only]")) === READ_ONLY
        && (await isDisabled(page, SEL.name)) === true && (await isDisabled(page, SEL.bodySw)) === true
        && (await isDisabled(page, SEL.save)) === true && (await attr(page, SEL.save, "title")) === READ_ONLY
        && (await textOf(page, "[data-test-blocked]")) === TEST_NOT_DRAFT && (await page.locator("[data-test-preview]").count()) === 0);
    ok(`${vp.name} · READ-ONLY · a stored filter this role may not have described is NOTED, never described (A1.1)`,
      (await attr(page, "[data-audience]", "data-audience")) === "hidden" && (await textOf(page, "[data-audience-note]")) === AUDIENCE_HIDDEN
        && !(await has(page, "[data-audience-problem]")));
    await fitCheck(page, vp.name, "read-only");
    await stateShot(page, vp.name, "read-only", READ_ONLY);

    // ── ERROR — the read fails ───────────────────────────────────────────────────────────────────────────────────────
    await seed(page, "fault=1");
    try {
      await openComposer(page, `?draft=${draftId}`, "any");
      const text = await mainText(page);
      ok(`${vp.name} · ERROR · a failed read says so inside the card — never a blank form`,
        text.includes(LOAD_ERROR) && text.includes("A data read failed") && !(await has(page, SEL.form)), text.slice(0, 200));
      await stateShot(page, vp.name, "error", LOAD_ERROR);
    } finally {
      await seed(page, "fault=0");
    }
    await ctx.close();
  }

  // ── REFUSED — a role without growth ──────────────────────────────────────────────────────────────────────────────
  for (const [i, vp] of VIEWPORTS.entries()) {
    const { ctx, page } = await staffCtx("FINANCE", phoneFor(31 + i), { width: vp.width, height: vp.height });
    await openComposer(page, "", "any");
    const text = await mainText(page);
    ok(`${vp.name} · REFUSED · FINANCE gets the section's restricted panel (Growth & marketing access) — no composer`,
      (await heading(page)) === "SMS campaigns" && text.includes("Restricted") && text.includes("Growth & marketing access") && !(await has(page, SEL.form)),
      text.slice(0, 200));
    await stateShot(page, vp.name, "refused-finance", "Growth & marketing access", null, "SMS campaigns");
    await ctx.close();
  }

  // ── REDUCED MOTION at 360 — the kit's transitions held at the clamp ─────────────────────────────────────────────
  // ⚖️ U37b adds no keyframe, token or duration; its motion is the kit's (the button's raise, the field's colour fade).
  // Under reduce, motion.css's universal clamp holds every transition at 0.01ms, which a browser reads back as 1e-05s —
  // so "off" is every duration at or under the clamp, never a literal 0s. The no-preference read comes first and is the
  // CONTROL: without it, "no transition" also passes on a control that never had one.
  {
    const readMotion = (page) => page.evaluate(() => {
      const pick = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const cs = getComputedStyle(el);
        return { prop: cs.transitionProperty, dur: cs.transitionDuration };
      };
      return { save: pick("[data-compose-save]"), body: pick('label[data-field="bodySw"] textarea') };
    });
    const secs = (m) => (m ? m.dur.split(",").map((d) => parseFloat(d)) : []);
    console.log(`${NL}[u37b] the motion control: no preference (360x780)`);
    {
      const { ctx, page } = await staffCtx("GROWTH", phoneFor(41), { width: 360, height: 780 }, "no-preference", OFFICER);
      await openComposer(page);
      const m = await readMotion(page);
      ok("motion control · with no preference the Save button and the message field carry the kit's transitions",
        m.save !== null && m.body !== null && secs(m.save).some((s) => s >= 0.05) && secs(m.body).some((s) => s >= 0.05), JSON.stringify(m));
      await ctx.close();
    }
    console.log(`${NL}[u37b] prefers-reduced-motion: reduce (360x780)`);
    const { ctx, page } = await staffCtx("GROWTH", phoneFor(42), { width: 360, height: 780 }, "reduce", OFFICER);
    ok("reduced-motion · the context really is reduced-motion", await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches));
    await openComposer(page);
    const m = await readMotion(page);
    ok("reduced-motion · every transition on the Save button and the message field is at or under the clamp's 0.01ms",
      m.save !== null && m.body !== null && [...secs(m.save), ...secs(m.body)].every((s) => s >= 0 && s <= 0.00001), JSON.stringify(m));
    await stateShot(page, "360x780", "reduced-blank", BLOCKED + NAME_PROBLEM);
    await ctx.close();
  }
}

/* ═══ PASS · live-closed — a real carrier selected, the ONE live switch absent ═════════════════════════════════════ */
async function liveClosedPass() {
  for (const [i, vp] of VIEWPORTS.entries()) {
    console.log(`${NL}[u37b] live sends closed · ${vp.name}`);
    const phone = phoneFor(21 + i);
    const { ctx, page } = await staffCtx("GROWTH", phone, { width: vp.width, height: vp.height }, "no-preference", OFFICER);
    await openComposer(page);
    const sender = await textOf(page, "[data-sender-line]");
    if (i === 0 && sender !== SENDER_LIVE) {
      ok(`PASS=live-closed needs the BLACKBALL boot (dummy keys, SMS_SENDER_ID=50pick) — the sender line must name the sender ID`, false,
        `sender line "${sender}" — see the boot line in this file's header`);
      await ctx.close();
      return;
    }
    ok(`${vp.name} · LIVE CLOSED · the sender line names the server's sender ID (a real carrier is selected) — a line, never a control`,
      sender === SENDER_LIVE && (await attr(page, "[data-sender-line]", "data-sender-line")) === "ok", sender);
    ok(`${vp.name} · LIVE CLOSED · the test card says UP FRONT that marketing SMS are not switched on`,
      (await textOf(page, "[data-test-live-note]")) === LIVE_NOTE);
    await page.locator(SEL.name).fill(NAME);
    await page.locator(SEL.bodySw).fill(BODY_JINA);
    await wait(250);
    await page.locator(SEL.fallbackSw).fill(FALLBACK_SW);
    await wait(250);
    await save(page);
    await waitReady(page);
    const draftId = new URL(page.url()).searchParams.get("draft") ?? "";
    ok(`${vp.name} · LIVE CLOSED · saved; the preview's stop link is still xxxxxxxx`,
      /^cmp_/.test(draftId) && (await previewOf(page, "SW")).endsWith("/s/xxxxxxxx"));
    await stateShot(page, vp.name, "live-closed-saved", LIVE_NOTE, SEL.test);
    const refused = await sendTest(page, "SW");
    ok(`${vp.name} · LIVE CLOSED · ⛔ X14 · the test is refused live_sends_closed, in words — never handed over`,
      refused?.outcome === "refused" && refused.reason === "live_sends_closed" && refused.sentence === LIVE_CLOSED, JSON.stringify(refused));
    await fitCheck(page, vp.name, "test-refused-live-closed");
    await stateShot(page, vp.name, "test-refused-live-closed", LIVE_CLOSED, SEL.test);
    await openComposer(page, `?draft=${draftId}`);
    await waitReady(page);
    ok(`${vp.name} · LIVE CLOSED · after a reload the stop link is STILL xxxxxxxx — the refusal minted no token — and the switch still reads closed`,
      (await previewOf(page, "SW")).endsWith("/s/xxxxxxxx") && (await textOf(page, SEL.test)).includes(TOKEN_NOTE)
        && (await textOf(page, "[data-test-live-note]")) === LIVE_NOTE);
    await ctx.close();
  }
}

/* ═══ PASS · dead-rail — a carrier selected with no keys: Admin → System's words, and the test refused ═════════════ */
async function deadRailPass() {
  for (const [i, vp] of VIEWPORTS.entries()) {
    console.log(`${NL}[u37b] dead rail · ${vp.name}`);
    const { ctx, page } = await staffCtx("GROWTH", phoneFor(51 + i), { width: vp.width, height: vp.height }, "no-preference", OFFICER);
    await openComposer(page);
    const sender = await textOf(page, "[data-sender-line]");
    if (i === 0 && sender !== SENDER_DEAD) {
      ok(`PASS=dead-rail needs the KEYLESS Blackball boot (SMS_PROVIDER=blackball, no keys) — the sender line must say the keys are not set`, false,
        `sender line "${sender}" — see the boot line in this file's header`);
      await ctx.close();
      return;
    }
    ok(`${vp.name} · DEAD RAIL · the sender line speaks Admin → System's own words — why, the consequence, the fix — in the danger colour, both Railway names under it`,
      sender === SENDER_DEAD && (await attr(page, "[data-sender-line]", "data-sender-line")) === "dead"
        && (await textOf(page, SEL.message)).includes("BLACKBALL_CLIENT_ID") && (await textOf(page, SEL.message)).includes("BLACKBALL_CLIENT_SECRET"), sender);
    await page.locator(SEL.name).fill(NAME);
    await page.locator(SEL.bodySw).fill(BODY_TYPED);
    await wait(250);
    await save(page);
    await waitReady(page);
    ok(`${vp.name} · DEAD RAIL · a draft still saves — the rail is about sending, never about writing`, await has(page, SEL.saved));
    const refused = await sendTest(page, "SW");
    ok(`${vp.name} · DEAD RAIL · the test is refused rail_dead, pointing at the sender line — never handed over`,
      refused?.outcome === "refused" && refused.reason === "rail_dead" && refused.sentence === RAIL_DEAD, JSON.stringify(refused));
    await fitCheck(page, vp.name, "test-refused-dead-rail");
    await stateShot(page, vp.name, "test-refused-dead-rail", RAIL_DEAD, SEL.test);
    await ctx.close();
  }
}

try {
  if (PASS === "console") await consolePass();
  else if (PASS === "live-closed") await liveClosedPass();
  else await deadRailPass();
} finally {
  await browser.close();
}
console.log(`${NL}MEASURED ${JSON.stringify(measured)}`);
console.log(`${NL}u37b-compose-drive (${PASS}): ${pass} passed, ${fail} failed`);
console.log(`shots: ${SHOTS}`);
if (fail) process.exitCode = 1;
