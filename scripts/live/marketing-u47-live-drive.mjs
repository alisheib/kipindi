/**
 * U47b-2 · /admin/campaigns/[id] — the LIVE SMS campaign page, driven and MEASURED, every state the unit names
 * (`npm run qa:marketing-live`). ⭐ U48a extends it with THE RESULTS card (ENGINE-SPEC §4.16): receipts POSTed at the LOCAL
 * webhook route for a finished campaign move "Delivered" (and nothing else does), the honesty line before and after, the stop by
 * link, the price line for the owner, the floor as GROWTH — at 1280 and 360, every capture asserted before it is photographed.
 *
 * WHAT THIS PROVES, at 1280x800 and 360x780 (+ reduced motion at 360), with HeadlessChrome in the UA. Every capture asserts
 * the page's heading and the sentence its state is about BEFORE it photographs (`stateShot`, the S7c lesson). ⛔ NO SMS IS EVER
 * SENT: the drive refuses to start unless the server's rail is the console stub (the composer's own sender line says so),
 * and every message the engine "sends" goes to that server's log.
 *   · THE LIST'S LINKS — a DRAFT row opens the composer at the draft's own address, every other row opens its live page;
 *   · A DRAFT's id opened at the live page's address goes to the composer; a campaign that is not there is said in words,
 *     with "Back to SMS campaigns"; a read that fails is "Couldn't load this SMS campaign" (U36's switch), never a zero;
 *   · LOADING — the page's OWN ghost while its chunk is held (the list's ghost never stands in), three blocks, the first
 *     card's top edge unmoved when the page swaps in (within 1px), the card-height differences RECORDED;
 *   · CONFIRMED — Ready to start, Start enabled, the other four controls drawn and disabled WITH their reasons; the Start
 *     dialog (GROWTH: "It uses up to N SMS", never a TZS figure; ADMIN: the frozen cost and limit), focus on CANCEL, Esc
 *     closes it; Start refused on a made-up audience — the sentence stays beside the controls, the status does not move;
 *   · THE RUN, REAL, on the console stub — a campaign of ten (eight who will receive, one who stopped by their link, one who
 *     never said yes), as GROWTH: Start → PREPARING → RUNNING (the send window held SHUT: the bar frozen, the wait said in
 *     words, "Keep this page open") → Pause (named: Paused by <officer> at HH:MM EAT) → Resume (toast) → the window opens →
 *     DONE: eight handed over, two not sent — the suppressed contact first — every KPI, reason and chip read, the driver
 *     STOPPED (no step call after the last), the controls disabled with their reasons, Make a copy → the composer;
 *   · A STOP mid-run — the dialog (focus on Cancel; the copy advice), "Stopped by <officer> at HH:MM EAT — 10 people were
 *     not messaged.", the driver stopped, nothing rewritten;
 *   · THE WAITS — the send window shut ("Waiting for the send window — sending resumes at 08:00 EAT."), and the platform
 *     busy with money ("money always goes first") through the platform's own admission gate, which the drive holds full;
 *   · OUT OF DATE — the step action made to throw (the request aborted): "This page is out of date or lost its connection —
 *     reload it to keep sending. Nothing is lost." with Reload, and NO further step call (the driver never retries blind);
 *   · WHO SEES WHAT — GROWTH, ADMIN and a role that may only LOOK (AUDITOR, given Growth VIEW without ACT): the watcher has
 *     every control disabled with the role's reason, makes NO step call, and its page still follows a campaign driven by
 *     another officer (the poll); E23's floor — a campaign of five shows GROWTH the count alone and its sentence, ADMIN the
 *     split; no "TZS" in any GROWTH view.
 *   · STAGED STATES (seeded rows, U36's way): PREPARING (600 of 1,604 written — the bar), RUNNING (every KPI, the five
 *     reasons dominant first, the chips), PAUSED by the engine and by an officer, DONE with a "No answer", a stopped one.
 *   · ⭐ U48a · THE RESULTS — a finished campaign of ten: Delivered 0 and Handed over, no receipt yet 8 with the honesty line
 *     ("No delivery receipt has arrived for this campaign yet — handed over is not delivered") and no "delivered" anywhere
 *     else on the page; receipts POSTed at the local `/api/webhooks/blackball` (three DELIVRD in one callback, then an UNDELIV)
 *     move Delivered to 3, the handed over to 4, Failed to 1 "Not delivered (receipt)", and the honesty line is GONE by itself; two
 *     of the people stop by their own link (the opt-out page's path) and "Stopped by their link since this campaign" reads 2;
 *     the staged RUNNING campaign reads Delivered 120 / Handed over 700 (680 of them over 15 minutes) / Failed 8 / Not sent 60 by
 *     reason / No answer 2 / Waiting 714, for the owner with the price line (and for GROWTH with no money word); a campaign of
 *     five shows GROWTH no results at all (the floor's sentence alone) and ADMIN every row; a stopped campaign says "Stopped
 *     before sending"; the ghost has the results block.
 *
 * Run (one boot, in-memory, zero prod risk; stop the last server and remove .next first — a stale .next 404s every
 * /api/dev-test route):
 *   SMS_PROVIDER=console SESSION_SECRET=<32+ chars> OTP_PEPPER=<16+ chars> DISABLE_ADMIN_TOTP=true npx next dev -p 3010
 *   BASE=http://localhost:3010 node scripts/live/marketing-u47-live-drive.mjs
 * ⭐ U48a · the receipts are POSTed at the server's own webhook route. With `BLACKBALL_WEBHOOK_SECRET` UNSET (and the stub rail) the
 *   route is open in development, as the vendor's callback is never sent here; with it SET (16+ characters — a made-up value, on
 *   the server AND in this process's environment) the drive posts it as `?token=`, exactly as the vendor's URL carries it. A
 *   secret shorter than 16 characters is refused by the route, and the card then says receipts are not set up (not driven here).
 * ⛔ A PC whose `.env.local` holds REAL Blackball keys (the office PC does): pin `SMS_PROVIDER=console` — never trust a
 *   default. The drive refuses to run on any other rail.
 * The drive moves the send window's clock and holds the admission gate; it puts the real clock back and lets the gate go
 * when it ends (and on a failure).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3010";
const SHOTS = join(".qa-shots", "marketing-setup", "u47b2");
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

/* ── the composer's sender line for the console stub — the drive's guard that no SMS can leave ── */
const SENDER_STUB = "Sender: this server's SMS rail is the console stub — messages go to the server log, never to a phone. It can't be changed here.";
const TITLE = "SMS campaign";
const COMPOSER_TITLE = "New SMS campaign";
const LOAD_ERROR = "Couldn't load this SMS campaign";
/** U13 · the instants the send window's clock is pinned at: 03:00 EAT (shut) and noon EAT (open), 7 October 2026. */
const NIGHT_EAT = "2026-10-07T00:00:00.000Z";
const NOON_EAT = "2026-10-07T09:00:00.000Z";

const VIEWPORTS = [
  { name: "1280x800", width: 1280, height: 800, reduced: "no-preference" },
  { name: "360x780", width: 360, height: 780, reduced: "no-preference" },
  { name: "360x780-reduced", width: 360, height: 780, reduced: "reduce" },
];
/** Unique per run: five digits, so a re-run on the same server meets no earlier officer and no earlier campaign. */
const RUN = String(Date.now() % 100000).padStart(5, "0");
const phoneFor = (nn) => `+25570${RUN}${String(nn).padStart(2, "0")}`;
const OFFICERS = {
  growth: { role: "GROWTH", phone: phoneFor(11), name: "Asha Mwita" },
  admin: { role: "ADMIN", phone: phoneFor(12), name: "Owner Ali" },
  auditor: { role: "AUDITOR", phone: phoneFor(13), name: "Neema Auditor" },
};

const SEL = {
  status: "[data-live-status]",
  headline: "[data-live-headline]",
  controls: "[data-live-controls]",
  blockStatus: '[data-block="live-status"]',
  blockControls: '[data-block="live-controls"]',
  blockProgress: '[data-block="live-progress"]',
  blockResults: '[data-block="live-results"]',
  ghostStatus: '[data-skeleton="live-status"]',
  ghostControls: '[data-skeleton="live-controls"]',
  ghostProgress: '[data-skeleton="live-progress"]',
  ghostResults: '[data-skeleton="live-results"]',
};
const ACTS = ["start", "pause", "resume", "stop", "copy"];
const ctl = (act) => `[data-live-control="${act}"]`;

const browser = await chromium.launch();
const measured = {};
let W = null;

/* ═══ THE HARNESS ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

async function staffCtx(who, viewport, reducedMotion = "no-preference") {
  const o = OFFICERS[who];
  const ctx = await browser.newContext({ viewport, reducedMotion });
  const page = await ctx.newPage();
  page.on("dialog", (d) => { d.accept().catch(() => {}); });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const r = await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { role: o.role, phone: o.phone, name: o.name } });
  if (!r.ok()) throw new Error(`seed-admin ${o.role} failed: ${r.status()}`);
  await page.evaluate(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  return { ctx, page };
}

const post = async (path) => {
  const ctx = await browser.newContext();
  try {
    const r = await ctx.request.post(`${BASE}${path}`);
    if (!r.ok()) throw new Error(`${path} failed: ${r.status()} ${await r.text()}`);
    return await r.json();
  } finally {
    await ctx.close().catch(() => {});
  }
};
const seedLive = (query) => post(`/api/dev-test/marketing-live-seed?${query}`);
const seedList = (query) => post(`/api/dev-test/marketing-campaigns-seed?${query}`);
/** U13 · the send window's clock on this server: an ISO instant, or "now" for the real clock. */
const pinWindow = (at) => post(`/api/dev-test/marketing-send-window?at=${encodeURIComponent(at)}`);
/** The platform's admission gate held full for <ms> (0 lets it go) — the engine then reads "money first". */
const holdMoney = (ms) => seedLive(`busy=${ms}`);

const boxOf = (page, selector) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: Math.round((r.top + window.scrollY) * 100) / 100, h: Math.round(r.height * 100) / 100, w: Math.round(r.width * 100) / 100 };
}, selector);
const mainText = async (page) => squash(await page.evaluate(() => document.querySelector("main#main-content")?.innerText ?? ""));
const heading = async (page) => squash(await page.locator("main#main-content h1").first().innerText().catch(() => ""));
const textOf = async (page, sel) => ((await page.locator(sel).count()) > 0 ? squash(await page.locator(sel).first().innerText().catch(() => "")) : "");
const has = async (page, sel) => (await page.locator(sel).count()) > 0;
const attr = (page, sel, name) => page.locator(sel).first().getAttribute(name).catch(() => null);

/** Everything the live page says about the campaign, read in one pass (the page's own `data-live-*` stamps). */
const readLive = (page) => page.evaluate(() => {
  const sq = (v) => String(v ?? "").replace(new RegExp("[" + String.fromCharCode(32, 9, 10, 13, 160) + "]+", "g"), " ").trim();
  const text = (sel) => sq(document.querySelector(sel)?.textContent);
  const one = (sel) => document.querySelector(sel);
  const controls = {};
  for (const act of ["start", "pause", "resume", "stop", "copy"]) {
    const b = one(`[data-live-control="${act}"]`);
    controls[act] = b ? { present: true, disabled: b.disabled === true, title: b.getAttribute("title"), text: (b.textContent ?? "").trim() } : { present: false };
  }
  const kpis = {};
  for (const el of document.querySelectorAll("[data-live-kpi]")) {
    const ps = el.querySelectorAll("p");
    kpis[el.getAttribute("data-live-kpi")] = { label: (ps[0]?.textContent ?? "").trim(), value: (ps[1]?.textContent ?? "").trim(), title: el.getAttribute("title") };
  }
  const reasons = [...document.querySelectorAll("[data-live-reasons] [title]")].map((el) => {
    const t = el.getAttribute("title") ?? "";
    const at = t.lastIndexOf(": ");
    return { label: t.slice(0, at), count: t.slice(at + 2) };
  });
  const chips = [...document.querySelectorAll("[data-live-chip-status]")].map((el) => ({ status: el.getAttribute("data-live-chip-status"), text: sq(el.textContent) }));
  const bar = one("[data-live-bar] [role='progressbar']");
  const root = one("[data-live-controls]");
  return {
    status: one("[data-live-status]")?.getAttribute("data-live-status") ?? null,
    chip: text("[data-live-chip]"),
    name: text("[data-live-name]"),
    headline: text("[data-live-headline]"),
    stop: text("[data-live-stop]"),
    audience: text("[data-live-audience]"),
    confirmed: text("[data-live-confirmed]"),
    controls,
    reason: text("[data-live-reason]"),
    refusal: text("[data-live-refusal]"),
    refusalReason: one("[data-live-refusal]")?.getAttribute("data-live-refusal-reason") ?? null,
    wait: text("[data-live-wait]"),
    nobody: text("[data-live-nobody]"),
    switchOff: text("[data-live-switch-off]"),
    keepOpen: text("[data-live-keep-open]"),
    stopped: one("[data-live-stopped]")?.getAttribute("data-live-stopped") ?? null,
    stoppedText: text("[data-live-stopped]"),
    kpis,
    reasons,
    chips,
    floor: text("[data-live-floor]"),
    bar: bar ? { now: Number(bar.getAttribute("aria-valuenow")), max: Number(bar.getAttribute("aria-valuemax")), caption: bar.getAttribute("aria-valuetext") } : null,
    driver: root ? { mode: root.getAttribute("data-live-driver"), steps: Number(root.getAttribute("data-live-steps")), polls: Number(root.getAttribute("data-live-polls")) } : null,
  };
});

/** ⭐ U48a · everything the results card says, in one pass (its own `data-results-*` stamps): each row's count, whether it could
 *  not be counted, its help line; which honesty lines stand; the reasons and the failed split as drawn; the price line. null when
 *  the page draws no results block. */
const readResults = (page) => page.evaluate(() => {
  const sq = (v) => String(v ?? "").replace(new RegExp("[" + String.fromCharCode(32, 9, 10, 13, 160) + "]+", "g"), " ").trim();
  const root = document.querySelector('[data-block="live-results"]');
  if (!root) return null;
  const rows = {};
  for (const el of root.querySelectorAll("[data-results-row]")) {
    rows[el.getAttribute("data-results-row")] = {
      value: sq(el.querySelector("[data-results-value]")?.textContent),
      unread: el.hasAttribute("data-results-unread"),
      help: sq(el.querySelector("[data-results-help]")?.textContent),
      label: sq(el.querySelector("[data-results-label]")?.textContent),
    };
  }
  const titles = (sel) => [...root.querySelectorAll(sel + " [title]")].map((e) => {
    const x = e.getAttribute("title") ?? "";
    const at = x.lastIndexOf(": ");
    return { label: x.slice(0, at), count: x.slice(at + 2) };
  });
  return {
    title: sq(root.querySelector("p.font-display")?.textContent),
    rows,
    honesty: [...root.querySelectorAll("[data-results-honesty]")].map((e) => e.getAttribute("data-results-honesty")),
    reasons: titles("[data-results-reasons]"),
    failed: titles("[data-results-failed]"),
    spend: sq(root.querySelector("[data-results-spend]")?.textContent),
  };
});
/** The page's text without one block's — "what the page says apart from the results". */
const mainTextOutside = async (page, selector) => squash(await page.evaluate((s) => {
  const m = document.querySelector("main#main-content");
  if (!m) return "";
  const c = m.cloneNode(true);
  c.querySelectorAll(s).forEach((e) => e.remove());
  return c.textContent ?? "";
}, selector));
/** ⭐ U48a · the callback body for N of a campaign's SENT rows (the seed route reads, writes nothing), as the vendor posts it. */
const receiptLines = async (campaignId, n, status, skip = 0) =>
  (await seedLive(`lines=${encodeURIComponent(campaignId)}&n=${n}&status=${status}&skip=${skip}`)).statuses ?? [];
/** POST a callback at the server's own webhook route — with the secret as `?token=` when this process's environment holds one. */
async function postReceipts(statuses) {
  const secret = process.env.BLACKBALL_WEBHOOK_SECRET || "";
  const ctx = await browser.newContext();
  try {
    const r = await ctx.request.post(`${BASE}/api/webhooks/blackball${secret ? `?token=${encodeURIComponent(secret)}` : ""}`, { data: { statuses } });
    return { status: r.status(), body: await r.text().catch(() => "") };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/** Viewport tiles only (never full-page): the top, or a block scrolled into view. */
async function shoot(page, name, scrollTo = null) {
  if (scrollTo) await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: "start" }), scrollTo);
  else await page.evaluate(() => window.scrollTo(0, 0));
  await wait(250);
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}
/** ⛔ Every capture asserts what it photographs FIRST: the page's own heading, and the sentence the state is about. The text is
 *  compared without case: `innerText` returns what the CSS renders, and a tile's label is drawn in capitals. */
async function stateShot(page, vp, name, wantText, scrollTo = null, wantHeading = TITLE) {
  const h1 = await heading(page);
  const text = await mainText(page);
  ok(`${vp} · ${name} · the capture shows the "${wantHeading}" heading and "${wantText.slice(0, 80)}"`,
    h1 === wantHeading && text.toLowerCase().includes(squash(wantText).toLowerCase()),
    `h1="${h1}" text="${text.slice(0, 240)}"`);
  await shoot(page, `${vp}-${name}`, scrollTo);
}

/** ⚖️ FIT: no sideways page scroll and nothing past a card's edge at either width; at 1280 no card past the content column. */
const fitOf = (page) => page.evaluate(() => {
  const blocks = [...document.querySelectorAll('[data-block^="live-"]')];
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
  return { overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth), pastMain, spill: spill.slice(0, 6), spillCount: spill.length };
});
async function fitCheck(page, vp, name) {
  const f = await fitOf(page);
  ok(`${vp} · ${name} · FIT — no sideways scroll, nothing past a card's edge, no card past the content column`,
    f.overflow === 0 && f.spillCount === 0 && f.pastMain.length === 0, JSON.stringify(f));
}

/** The campaigns list on its Paused rail, and the reason line of each campaign asked for (`{ key: id }` → `{ key: text }`). */
async function pausedLines(page, ids) {
  await page.goto(`${BASE}/admin/campaigns?status=paused`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-campaign-row]", { timeout: 90000 }).catch(() => {});
  await wait(700);
  const out = {};
  for (const [key, id] of Object.entries(ids)) out[key] = await textOf(page, `[data-campaign-id="${id}"] [data-stop-reason]`);
  return out;
}

/** Open a campaign's live page and wait for its status stamp (or the missing / error / draft outcome named by `expect`). */
async function openLive(page, id, expect = "live") {
  await page.goto(`${BASE}/admin/campaigns/${encodeURIComponent(id)}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main#main-content h1", { timeout: 90000 });
  if (expect === "live") await page.waitForSelector(SEL.status, { timeout: 60000 }).catch(() => {});
  if (expect === "missing") await page.waitForSelector("[data-live-missing]", { timeout: 60000 }).catch(() => {});
  await wait(expect === "any" ? 1500 : 800);
}
const waitStatus = (page, status, timeout = 60000) =>
  page.waitForSelector(`[data-live-status="${status}"]`, { timeout }).then(() => true).catch(() => false);
/** A condition on the page's own stamps, as a function body over `readLive`'s shape — polled in the page itself. */
const waitFor = (page, fn, timeout = 30000) => page.waitForFunction(fn, undefined, { timeout }).then(() => true).catch(() => false);

/** Count the server-action POSTs this page makes (the driver's calls, the acts) — the drive's proof of what it did NOT do. */
function countActions(page) {
  const seen = { n: 0 };
  page.on("request", (req) => { if (req.method() === "POST" && req.headers()["next-action"]) seen.n++; });
  return seen;
}
/** Hold every server-action response of this page (the request is fetched at once, handed over never): the page stays as it
 *  rendered. The drive closes the context instead of releasing it. */
async function holdActions(page) {
  let held = 0;
  const pattern = "**/admin/campaigns/**";
  const handler = async (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.headers()["next-action"]) { held++; return; }
    await route.fallback().catch(() => {});
  };
  await page.route(pattern, handler);
  return { held: () => held, off: () => page.unroute(pattern, handler).catch(() => {}) };
}
/** Make every server-action request of this page fail in transit — the action never reaches the server. */
async function abortActions(page) {
  let hits = 0;
  const pattern = "**/admin/campaigns/**";
  const handler = async (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.headers()["next-action"]) { hits++; await route.abort("failed").catch(() => {}); return; }
    await route.fallback().catch(() => {});
  };
  await page.route(pattern, handler);
  return { hits: () => hits, off: () => page.unroute(pattern, handler).catch(() => {}) };
}

/** A toast that says `sentence` is on screen (the kit's toast region). */
const toastShown = (page, sentence) => page.locator('[role="status"]', { hasText: sentence.slice(0, 40) }).count().then((n) => n > 0);

/** Press a control and wait for the page to answer: the press settles when no control is in flight. */
async function press(page, act) {
  await page.locator(ctl(act)).first().click();
  await wait(400);
}
/** The Start / Stop dialog (the kit's alertdialog): its title, its body and where focus landed. */
const dialogOf = (page) => page.evaluate(() => {
  const d = document.querySelector('[role="alertdialog"]');
  if (!d) return null;
  const sq = (v) => String(v ?? "").replace(new RegExp("[" + String.fromCharCode(32, 9, 10, 13, 160) + "]+", "g"), " ").trim();
  const buttons = [...d.querySelectorAll("button")].map((b) => sq(b.textContent));
  return {
    title: (d.querySelector("h2")?.textContent ?? "").trim(),
    text: sq(d.textContent),
    focus: sq(document.activeElement?.textContent),
    buttons,
  };
});

/** ⛔ A capture of an OPEN dialog asserts the page's heading and the dialog's own title first, like every other capture. */
async function dialogShot(page, vp, name, title) {
  const h1 = await heading(page);
  const dlg = await dialogOf(page);
  ok(`${vp} · ${name} · the capture shows the "${TITLE}" heading with the dialog "${title.slice(0, 60)}" open`, h1 === TITLE && !!dlg && dlg.title === title,
    `h1="${h1}" dialog=${JSON.stringify(dlg?.title ?? null)}`);
  await shoot(page, `${vp}-${name}`);
}

const num = (s) => Number(String(s).replace(/,/g, ""));

/* ═══ THE DRIVE ═════════════════════════════════════════════════════════════════════════════════════════════════════ */

async function checkRail(page) {
  await page.goto(`${BASE}/admin/campaigns/new`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-sender-line]", { timeout: 90000 }).catch(() => {});
  const sender = await textOf(page, "[data-sender-line]");
  return sender === SENDER_STUB ? null : sender;
}

async function main() {
  console.log(`[u47b2] words and the world (run ${RUN})`);
  const words = await seedLive("words=1");
  W = words.words;
  ok("the seed route answers the page's own sentences (live-copy.ts) — the drive asserts against these, never a copy", !!W && typeof W.title === "string" && W.title === TITLE);
  await pinWindow(NOON_EAT);
  await seedList("set=base");
  const stages = await seedLive(`stages=${RUN}`);
  const stage = Object.fromEntries(stages.stages.map((s) => [s.key, s]));
  ok("the staged states are seeded (confirmed · confirmed on an unreadable audience · preparing · running · paused ×2 · done · stopped · floor · paused below the floor)", stages.stages.length === 10, JSON.stringify(stages.stages.map((s) => s.key)));
  await holdMoney(0);
  await post("/api/dev-test/marketing-contacts-seed?u23grant=view-only");
  ok("the AUDITOR role is given Growth VIEW without ACT (U23's switch) — the watcher the page must serve", true);

  for (const [i, vp] of VIEWPORTS.entries()) {
    console.log(`${NL}[u47b2] ${vp.name}`);
    const viewport = { width: vp.width, height: vp.height };
    await drivePass(vp, viewport, i, stage);
  }
}

async function drivePass(vp, viewport, i, stage) {
  const name = vp.name;
  const run = (k) => `${RUN}${k}${i}`;
  // ⭐ U48a · the staged RUNNING campaign's recent hand-overs are "a moment ago" again (a drive of three widths outlasts 15 minutes)
  await seedLive(`restamp=${RUN}`);
  const g = await staffCtx("growth", viewport, vp.reduced);
  const growth = g.page;
  ok(`${name} · UA carries HeadlessChrome`, /HeadlessChrome/.test(await growth.evaluate(() => navigator.userAgent)));
  if (i === 0) {
    const wrong = await checkRail(growth);
    if (wrong !== null) {
      ok("PASS needs the CONSOLE boot — the sender line must be the stub's sentence (no SMS may leave)", false, `sender line "${wrong}"`);
      await g.ctx.close();
      throw new Error("not the console rail — nothing was run");
    }
  }

  /* ── THE LIST'S LINKS, and the draft and the missing campaign ── */
  await growth.goto(`${BASE}/admin/campaigns`, { waitUntil: "domcontentloaded" });
  await growth.waitForSelector("[data-campaign-row]", { timeout: 90000 }).catch(() => {});
  await wait(900);
  const links = await growth.evaluate(() => [...document.querySelectorAll("[data-campaign-row]")].map((tr) => ({
    id: tr.getAttribute("data-campaign-id"), href: tr.querySelector("td a")?.getAttribute("href") ?? null,
  })));
  const draftLink = links.find((l) => l.id === "cmp_seed_01");
  const liveLink = links.find((l) => l.id === "cmp_seed_02");
  ok(`${name} · LIST · a DRAFT row's name opens the composer at the draft's own address — never the live page`,
    !!draftLink && typeof draftLink.href === "string" && draftLink.href.startsWith("/admin/campaigns/new?draft=cmp_seed_01"), JSON.stringify(draftLink));
  ok(`${name} · LIST · every other row's name opens its live page`,
    !!liveLink && liveLink.href === "/admin/campaigns/cmp_seed_02" && links.filter((l) => l.href !== null && !l.href.includes("?draft=")).every((l) => l.href === `/admin/campaigns/${l.id}`),
    JSON.stringify(links.slice(0, 4)));
  // A paused row says its reason as the live page does (one function): the engine's reason in its own words, an officer's pause
  // in its own, and — below E23's floor, for a role that may act — the one neutral sentence ("press Resume").
  const lines = await pausedLines(growth, { engine: stage.paused_engine.id, officer: stage.paused_officer.id, floor: stage.paused_floor.id });
  ok(`${name} · LIST · a PAUSED row says why in words, as the live page does — "${W.pausedList.gateway_refused.slice(0, 50)}…" for an engine reason (never its key), the officer's own, and below the floor the one neutral sentence for GROWTH (who may act)`,
    lines.engine === W.pausedList.gateway_refused && !/gateway_refused/.test(lines.engine) && lines.officer === W.pausedList.officer_paused && lines.floor === W.pausedHidden,
    JSON.stringify(lines));
  await stateShot(growth, name, "list-paused", W.pausedHidden.slice(0, 60), null, "SMS campaigns");
  const fitList = await fitOf(growth);
  ok(`${name} · LIST · the paused rail with its long reason sentences: no sideways scroll of the page`, fitList.overflow === 0, JSON.stringify(fitList));

  await openLive(growth, "cmp_seed_01", "any");
  await wait(1200);
  ok(`${name} · DRAFT · a draft's id opened at the live page's address goes to the composer, with the draft in its address`,
    new URL(growth.url()).pathname === "/admin/campaigns/new" && new URL(growth.url()).searchParams.get("draft") === "cmp_seed_01" && (await heading(growth)) === COMPOSER_TITLE,
    `${growth.url()} · ${await heading(growth)}`);

  await openLive(growth, "cmp_nobody_made_this", "missing");
  const missing = await textOf(growth, "[data-live-missing]");
  ok(`${name} · MISSING · a campaign that is not there is said in words, with one way on`,
    missing === W.missing && (await textOf(growth, "[data-live-back]")) === W.back && (await heading(growth)) === TITLE, missing);
  await stateShot(growth, name, "missing", W.missing, SEL.blockStatus);
  await growth.locator("[data-live-back]").first().click();
  await growth.waitForURL((u) => u.pathname === "/admin/campaigns", { timeout: 60000 }).catch(() => {});
  ok(`${name} · MISSING · "${W.back}" goes back to the list`, new URL(growth.url()).pathname === "/admin/campaigns", growth.url());

  await seedList("fault=1");
  await openLive(growth, stage.confirmed.id, "any");
  await wait(1200);
  const errorText = await mainText(growth);
  ok(`${name} · ERROR · a read that fails is "${LOAD_ERROR}" — never a zero, never "not found"`, errorText.includes(LOAD_ERROR) && !errorText.includes(W.missing), errorText.slice(0, 160));
  await stateShot(growth, name, "error", LOAD_ERROR, SEL.blockStatus);
  await seedList("fault=0");

  /* ── LOADING — the page's own ghost while its chunk is held ── */
  // A list that holds the staged RUNNING campaign on its first page (the Sending rail), so the way in is a soft navigation.
  await growth.goto(`${BASE}/admin/campaigns?status=sending`, { waitUntil: "domcontentloaded" });
  await growth.waitForSelector("[data-campaign-row]", { timeout: 90000 }).catch(() => {});
  await wait(1200);
  let release = () => {};
  const gate = new Promise((r) => { release = r; });
  let heldChunks = 0;
  // The live page's own chunk, whatever the bundler spells its brackets as: a page chunk of this section that is neither
  // the list's (src_app_admin_campaigns_page_tsx) nor the composer's (campaigns_new_). Webpack's dev chunk names the route.
  const HOLD = (url) => {
    const h = decodeURIComponent(url.href);
    return (h.includes("src_app_admin_campaigns_") && h.includes("_page_tsx") && !h.includes("campaigns_new_") && !h.includes("src_app_admin_campaigns_page_tsx"))
      || h.includes("campaigns/[id]/page");
  };
  // ⭐ HOLD THE RESPONSE, NEVER THE REQUEST: fetched at once, handed over when the ghost has been measured.
  const holder = async (route) => {
    heldChunks++;
    const response = await route.fetch().catch(() => null);
    await gate;
    if (response) await route.fulfill({ response }).catch(() => {});
    else await route.continue().catch(() => {});
  };
  await growth.route(HOLD, holder);
  const link = growth.locator(`[data-campaign-id="${stage.running.id}"] td a`).first();
  ok(`${name} · LOADING · the staged RUNNING campaign's name is a link on the Sending rail`, (await link.count()) === 1);
  await link.click();
  await growth.waitForSelector(SEL.ghostStatus, { timeout: 90000 }).catch(() => {});
  const ghost = {
    status: await boxOf(growth, SEL.ghostStatus), controls: await boxOf(growth, SEL.ghostControls), progress: await boxOf(growth, SEL.ghostProgress),
    results: await boxOf(growth, SEL.ghostResults),
  };
  const realYet = await has(growth, SEL.status);
  ok(`${name} · LOADING · the live page's OWN ghost is on screen — four blocks, status first, the results last — and the real page is not yet (chunks held: ${heldChunks})`,
    !!ghost.status && !!ghost.controls && !!ghost.progress && !!ghost.results && ghost.status.top < ghost.controls.top && ghost.controls.top < ghost.progress.top
      && ghost.progress.top < ghost.results.top && !realYet,
    JSON.stringify({ ghost, realYet, heldChunks }));
  ok(`${name} · LOADING · the ghost heads the page "${TITLE}" — never the list's ghost`, (await heading(growth)) === TITLE && !(await has(growth, '[data-skeleton="campaigns-card"]')), await heading(growth));
  await shoot(growth, `${name}-loading`);
  release();
  await growth.waitForSelector(SEL.status, { timeout: 60000 }).catch(() => {});
  await growth.unroute(HOLD, holder).catch(() => {});
  await wait(900);
  const real = {
    status: await boxOf(growth, SEL.blockStatus), controls: await boxOf(growth, SEL.blockControls), progress: await boxOf(growth, SEL.blockProgress),
    results: await boxOf(growth, SEL.blockResults),
  };
  const delta = (k) => (ghost[k] && real[k] ? Math.round((real[k].h - ghost[k].h) * 100) / 100 : null);
  // ⚠️ RECORDED, NOT ASSERTED EQUAL: the blocks' heights depend on the campaign (loading.tsx says why).
  measured[name] = {
    ghostTop: ghost.status?.top, realTop: real.status?.top,
    heightDelta: { status: delta("status"), controls: delta("controls"), progress: delta("progress"), results: delta("results") },
  };
  ok(`${name} · LOADING · the first card's top edge does not move when the page swaps in (within 1px)`,
    !!ghost.status && !!real.status && Math.abs(ghost.status.top - real.status.top) <= 1, `${ghost.status?.top} vs ${real.status?.top}`);

  /* ── CONFIRMED — the controls, the Start dialog, a refusal ── */
  await openLive(growth, stage.confirmed.id);
  let s = await readLive(growth);
  ok(`${name} · CONFIRMED · "${W.headline.CONFIRMED}" under the chip, a name that is the campaign's own`,
    s.status === "CONFIRMED" && s.headline === W.headline.CONFIRMED && s.name === stage.confirmed.name, JSON.stringify({ status: s.status, headline: s.headline, name: s.name }));
  ok(`${name} · CONFIRMED · ⭐ all five controls are DRAWN; Start, Stop and Make a copy are on; Pause and Resume are off WITH their reasons in title`,
    ACTS.every((a) => s.controls[a].present)
      && s.controls.start.disabled === false && s.controls.stop.disabled === false && s.controls.copy.disabled === false
      && s.controls.pause.disabled === true && s.controls.pause.title === W.disabled.pause
      && s.controls.resume.disabled === true && s.controls.resume.title === W.disabled.resume,
    JSON.stringify(s.controls));
  ok(`${name} · CONFIRMED · no figures card: nobody is on the list yet, so nothing is counted — and no "TZS" for GROWTH`,
    !(await has(growth, SEL.blockProgress)) && !/TZS/.test(await mainText(growth)));
  await fitCheck(growth, name, "confirmed");
  await stateShot(growth, name, "confirmed", W.headline.CONFIRMED);
  await press(growth, "start");
  const dlg = await dialogOf(growth);
  ok(`${name} · START DIALOG · title and body are the view's (GROWTH: SMS, never TZS); focus opens on CANCEL, never on the action`,
    !!dlg && dlg.title === W.startDialog.growth.title && dlg.text.includes(W.startDialog.growth.body) && !/TZS/.test(dlg.text) && dlg.focus === W.dialog.cancel
      && dlg.buttons.includes(W.dialog.start) && dlg.buttons.includes(W.dialog.cancel),
    JSON.stringify(dlg));
  await dialogShot(growth, name, "start-dialog", W.startDialog.growth.title);
  await growth.keyboard.press("Escape");
  await wait(500);
  ok(`${name} · START DIALOG · Esc closes it, nothing was started`, (await dialogOf(growth)) === null && (await readLive(growth)).status === "CONFIRMED");
  // Start on an audience that cannot be read: refused in the service's words, beside the controls, and the status does not move.
  await openLive(growth, stage.confirmed_bad.id);
  await press(growth, "start");
  await growth.getByRole("button", { name: W.dialog.start }).first().click();
  await growth.waitForSelector("[data-live-refusal]", { timeout: 30000 }).catch(() => {});
  await wait(500);
  s = await readLive(growth);
  ok(`${name} · START REFUSED · the service's sentence (${W.startRefusals.audience_unreadable.slice(0, 40)}…) stays beside the controls — a refusal is not a toast — the dialog is gone and the campaign is still CONFIRMED`,
    s.refusal === W.startRefusals.audience_unreadable && s.status === "CONFIRMED" && (await dialogOf(growth)) === null && s.refusalReason === "audience_unreadable",
    JSON.stringify({ refusal: s.refusal, reason: s.refusalReason, status: s.status }));
  await stateShot(growth, name, "start-refused", s.refusal.slice(0, 60), SEL.blockControls);
  await g.ctx.close();

  /* ── ADMIN (a reader, with money) — the same dialog says the frozen cost and limit ── */
  const a = await staffCtx("admin", viewport, vp.reduced);
  await openLive(a.page, stage.confirmed.id);
  await press(a.page, "start");
  const adlg = await dialogOf(a.page);
  ok(`${name} · START DIALOG · ADMIN (money) · the frozen cost and the limit, in TZS`,
    !!adlg && adlg.title === W.startDialog.admin.title && adlg.text.includes(W.startDialog.admin.body) && /TZS/.test(adlg.text) && adlg.focus === W.dialog.cancel, JSON.stringify(adlg));
  await dialogShot(a.page, name, "start-dialog-admin", W.startDialog.admin.title);
  await a.page.keyboard.press("Escape");
  // ⭐ U48a · the owner reads the results of the staged RUNNING campaign — every row, and the price line (OD24: money for a money reader)
  await openLive(a.page, stage.running.id);
  const ar = await readResults(a.page);
  ok(`${name} · RESULTS (staged RUNNING) · ADMIN · Delivered 120 (receipts), Handed over, no receipt yet 700 of which 680 were handed over more than 15 minutes ago, Failed 8, Not sent 60, No answer 2, Waiting 714 — and NO honesty line (a receipt has arrived)`,
    !!ar && ar.title === W.results.title && ar.rows.delivered?.value === "120" && ar.rows.handedOver?.value === "700" && ar.rows.noReceipt?.value === "680"
      && ar.rows.failed?.value === "8" && ar.rows.notSent?.value === "60" && ar.rows.noAnswer?.value === "2" && ar.rows.waiting?.value === "714"
      && ar.rows.stoppedByLink?.value === "0" && ar.honesty.length === 0,
    JSON.stringify(ar && { rows: Object.fromEntries(Object.entries(ar.rows).map(([k, v]) => [k, v.value])), honesty: ar.honesty }));
  ok(`${name} · RESULTS (staged RUNNING) · ADMIN · the failed split (the network refused 8, receipts 0) and the five reasons, dominant first, protected ONE line — the figures card's own list`,
    !!ar && ar.failed.length === 2 && ar.failed[0].label === W.results.failed.wire && ar.failed[0].count === "8" && ar.failed[1].label === W.results.failed.receipt && ar.failed[1].count === "0"
      && ar.reasons.length === 6 && ar.reasons[0].label === W.reasons.suppressed && ar.reasons[0].count === "24"
      && ar.reasons.some((x) => x.label === W.reasons.protected && x.count === "13") && ar.reasons.reduce((n, x) => n + num(x.count), 0) === 60,
    JSON.stringify(ar && { failed: ar.failed, reasons: ar.reasons }));
  ok(`${name} · RESULTS (staged RUNNING) · ADMIN · the price line, exactly: "${W.results.spendStaged.slice(0, 90)}…" (820 handed over × TZS 6)`,
    !!ar && ar.spend === W.results.spendStaged, ar?.spend);
  await fitCheck(a.page, name, "results-admin");
  await stateShot(a.page, name, "results-admin", W.results.spendStaged.slice(0, 60), SEL.blockResults);
  await a.ctx.close();

  /* ── the staged states, read as the AUDITOR (who cannot act — the page never steps) ── */
  const w = await staffCtx("auditor", viewport, vp.reduced);
  await openLive(w.page, stage.running.id);
  s = await readLive(w.page);
  const k = s.kpis;
  ok(`${name} · RUNNING (staged) · every KPI is a view field, read as written: 1,604 on the campaign, 820 handed over, 8 failed, 60 not sent, 2 no answer, 714 waiting`,
    s.status === "RUNNING" && k.onCampaign?.value === "1,604" && k.handedOver?.value === "820" && k.failed?.value === "8" && k.notSent?.value === "60"
      && k.noAnswer?.value === "2" && k.waiting?.value === "714", JSON.stringify(k));
  ok(`${name} · RUNNING (staged) · the bar is the view's: 890 of 1,604 settled (HELD is not done); the headline says the same`,
    !!s.bar && s.bar.now === 890 && s.bar.max === 1604 && s.headline === "Sending — 890 of 1,604 done.", JSON.stringify({ bar: s.bar, headline: s.headline }));
  ok(`${name} · RUNNING (staged) · the hover titles the spec gives: Handed over, and No answer ("never re-sent automatically")`,
    k.handedOver?.title === W.kpi.handedOver.title && k.noAnswer?.title === W.kpi.noAnswer.title && !!k.noAnswer?.title && /never re-sent/.test(k.noAnswer.title), JSON.stringify({ a: k.handedOver?.title, b: k.noAnswer?.title }));
  const counts = s.reasons.map((r) => num(r.count));
  ok(`${name} · RUNNING (staged) · "Not sent" by reason — U38b's five words ALWAYS (zeros too), then "${W.notSentExtra.unsendable}" because there are three, dominant first, adding up to the 60 not sent; protected is ONE line (13)`,
    s.reasons.length === 6 && counts.every((c, j) => j === 0 || counts[j - 1] >= c) && counts.reduce((n, c) => n + c, 0) === 60
      && s.reasons[0].label === W.reasons.suppressed && s.reasons[0].count === "24"
      && s.reasons.some((r) => r.label === W.reasons.protected && num(r.count) === 13)
      && s.reasons.some((r) => r.label === W.notSentExtra.unsendable && num(r.count) === 3),
    JSON.stringify(s.reasons));
  ok(`${name} · RUNNING (staged) · the chips: each status with rows, in the schema's order, with its count`,
    s.chips.map((c) => c.status).join(",") === "PENDING,HELD,SENT,DELIVERED,FAILED,SKIPPED,UNCONFIRMED", JSON.stringify(s.chips));
  ok(`${name} · RUNNING (staged) · the watcher's controls are all drawn and all off, each with the role's reason — and its page made NO step call`,
    ACTS.every((x) => s.controls[x].present && s.controls[x].disabled === true && s.controls[x].title === W.disabled.role) && s.driver?.mode === "watch" && s.driver.steps === 0,
    JSON.stringify({ controls: s.controls, driver: s.driver }));
  await fitCheck(w.page, name, "running-staged");
  await stateShot(w.page, name, "running-staged", "Sending — 890 of 1,604 done.");
  await stateShot(w.page, name, "running-staged-figures", W.kpi.handedOver.label, SEL.blockProgress);
  // ⭐ U48a · the watcher reads the same results (the numbers are the view's, whoever looks), and the card agrees with the figures card
  const wr = await readResults(w.page);
  ok(`${name} · RESULTS (staged RUNNING) · the watcher · Delivered + Handed over, no receipt yet IS the figures card's "Handed over" (120 + 700 = 820), Failed 8, Not sent 60, No answer 2, Waiting 714`,
    !!wr && num(wr.rows.delivered.value) + num(wr.rows.handedOver.value) === num(k.handedOver?.value) && wr.rows.failed.value === k.failed?.value
      && wr.rows.notSent.value === k.notSent?.value && wr.rows.noAnswer.value === k.noAnswer?.value && wr.rows.waiting.value === k.waiting?.value,
    JSON.stringify(wr && Object.fromEntries(Object.entries(wr.rows).map(([key, v]) => [key, v.value]))));
  await stateShot(w.page, name, "results-staged-running", W.results.title, SEL.blockResults);
  for (const [key, want, shot] of [
    ["preparing", "Preparing the list — 600 of 1,604 people written.", "preparing-staged"],
    ["paused_engine", null, "paused-engine-staged"],
    ["paused_officer", null, "paused-officer-staged"],
    ["done", W.headline.DONE, "done-staged"],
    ["stopped", null, "stopped-staged"],
  ]) {
    await openLive(w.page, stage[key].id);
    const t = await readLive(w.page);
    const headline = want ?? t.headline;
    ok(`${name} · ${key.toUpperCase()} (staged) · the watcher's page made no step call (mode ${t.driver?.mode}, steps ${t.driver?.steps})`, (t.driver?.steps ?? 1) === 0, JSON.stringify(t.driver));
    if (key === "preparing") {
      ok(`${name} · PREPARING (staged) · the bar is rows written over the confirmed count: 600 of 1,604 prepared`,
        t.status === "PREPARING" && !!t.bar && t.bar.now === 600 && t.bar.max === 1604 && /prepared/.test(t.bar.caption ?? ""), JSON.stringify({ status: t.status, bar: t.bar }));
    }
    if (key === "paused_engine") {
      ok(`${name} · PAUSED (staged, the engine) · "Paused." and the engine's reason in words — a reader of the split sees it as the list does`,
        t.status === "PAUSED" && t.headline === W.headline.PAUSED && t.stop.length > 20 && !/gateway_refused/.test(t.stop), JSON.stringify({ stop: t.stop }));
    }
    if (key === "paused_officer") {
      ok(`${name} · PAUSED (staged, an officer) · no audit row to name them, so the page says "an officer" — never a stale name`,
        t.status === "PAUSED" && /^Paused by an officer/.test(t.stop), t.stop);
    }
    if (key === "done") {
      ok(`${name} · DONE (staged) · "${W.headline.DONE}" — true beside a "No answer"`, t.status === "DONE" && t.headline === W.headline.DONE && t.kpis.noAnswer?.value === "2", JSON.stringify(t.kpis));
      const dr = await readResults(w.page);
      ok(`${name} · DONE (staged) · RESULTS · Delivered 6, Handed over, no receipt yet 30, Failed 1, Not sent 1, No answer 2 — and nobody left to message, so no Waiting or Stopped row`,
        !!dr && dr.rows.delivered?.value === "6" && dr.rows.handedOver?.value === "30" && dr.rows.failed?.value === "1" && dr.rows.notSent?.value === "1"
          && dr.rows.noAnswer?.value === "2" && !dr.rows.waiting && !dr.rows.stopped, JSON.stringify(dr && Object.fromEntries(Object.entries(dr.rows).map(([key2, v]) => [key2, v.value]))));
    }
    if (key === "stopped") {
      ok(`${name} · STOPPED (staged) · "Stopped by …" with how many were not messaged, said once (no stop sentence beside it)`,
        t.status === "CANCELLED" && /^Stopped by /.test(t.headline) && t.headline.endsWith("12 people were not messaged.") && t.stop === "", JSON.stringify({ headline: t.headline, stop: t.stop }));
      const sr = await readResults(w.page);
      ok(`${name} · STOPPED (staged) · RESULTS · "${W.results.rows.stopped.label}" 12 — the headline's own figure — and no "Waiting" row`,
        !!sr && sr.rows.stopped?.value === "12" && sr.rows.stopped.label === W.results.rows.stopped.label && !sr.rows.waiting && sr.rows.handedOver?.value === "8",
        JSON.stringify(sr && Object.fromEntries(Object.entries(sr.rows).map(([key2, v]) => [key2, v.value]))));
    }
    await stateShot(w.page, name, shot, headline.slice(0, 80));
  }
  // A pause below E23's floor, read by a role that may only LOOK: the neutral sentence WITHOUT "press Resume" — on the page and
  // on the list.
  await openLive(w.page, stage.paused_floor.id);
  const pf = await readLive(w.page);
  ok(`${name} · PAUSED below the floor (staged) · a role that may only look reads the neutral sentence — the reason is hidden for its role — without "press Resume"`,
    pf.status === "PAUSED" && pf.stop === W.pausedHiddenView && !/Resume/.test(pf.stop), pf.stop);
  await stateShot(w.page, name, "paused-floor-view-only", W.pausedHiddenView.slice(0, 80));
  const watcherLines = await pausedLines(w.page, { floor: stage.paused_floor.id });
  ok(`${name} · LIST · the same pause on the campaigns list reads the same view-only sentence for the watcher`, watcherLines.floor === W.pausedHiddenView, watcherLines.floor);
  await w.ctx.close();

  /* ── E23's floor: a campaign of five ── */
  const gf = await staffCtx("growth", viewport, vp.reduced);
  const held = await holdActions(gf.page);
  await openLive(gf.page, stage.floor.id);
  s = await readLive(gf.page);
  ok(`${name} · FLOOR · GROWTH on a campaign of five sees "On campaign 5" and NOTHING split — no other tile, no reasons, no chips — and the floor's sentence`,
    s.kpis.onCampaign?.value === "5" && Object.keys(s.kpis).length === 1 && s.reasons.length === 0 && s.chips.length === 0 && s.floor === W.floor, JSON.stringify({ kpis: s.kpis, floor: s.floor }));
  await fitCheck(gf.page, name, "floor");
  await stateShot(gf.page, name, "floor-growth", W.floor, SEL.blockProgress);
  // ⛔ U48a · E23 · below the floor there are NO results: no block, no honesty line, nothing that names a split — the floor's sentence alone
  const floorText = await mainText(gf.page);
  ok(`${name} · FLOOR · GROWTH on a campaign of five · NO results block, no honesty line, no price, and the page never says "delivered"`,
    !(await has(gf.page, SEL.blockResults)) && !(await has(gf.page, "[data-results]")) && !/deliver/i.test(floorText.replace(W.kpi.handedOver.title, "")) && !/TZS/.test(floorText),
    floorText.slice(0, 200));
  await openLive(gf.page, stage.paused_floor.id);
  s = await readLive(gf.page);
  ok(`${name} · PAUSED below the floor (staged) · GROWTH, who may act, reads the one neutral sentence — "press Resume" and all`,
    s.status === "PAUSED" && s.stop === W.pausedHidden, s.stop);
  await stateShot(gf.page, name, "paused-floor-growth", W.pausedHidden.slice(0, 80));
  await held.off();
  await gf.ctx.close();
  const af = await staffCtx("admin", viewport, vp.reduced);
  await holdActions(af.page);
  await openLive(af.page, stage.floor.id);
  s = await readLive(af.page);
  ok(`${name} · FLOOR · ADMIN (a reader) on the same five sees every tile, the reasons and the chips — and no floor sentence`,
    Object.keys(s.kpis).length === 6 && s.reasons.length === 5 && s.chips.length > 0 && s.floor === "", JSON.stringify({ kpis: Object.keys(s.kpis), floor: s.floor }));
  const fr = await readResults(af.page);
  ok(`${name} · FLOOR · ADMIN on the same five · the results: Delivered 0, Handed over, no receipt yet 2, Failed 0, Not sent 2 — and the honesty line, since two were handed over and no receipt has come`,
    !!fr && fr.rows.delivered?.value === "0" && fr.rows.handedOver?.value === "2" && fr.rows.failed?.value === "0" && fr.rows.notSent?.value === "2" && fr.honesty.join() === "no_receipt_yet",
    JSON.stringify(fr && { rows: Object.fromEntries(Object.entries(fr.rows).map(([k2, v]) => [k2, v.value])), honesty: fr.honesty }));
  await stateShot(af.page, name, "floor-admin", "On campaign", SEL.blockProgress);
  await stateShot(af.page, name, "floor-admin-results", W.results.honesty.noReceiptYet, SEL.blockResults);
  await af.ctx.close();

  /* ── THE RUN, REAL — Start → PREPARING → RUNNING (window shut) → Pause → Resume → the window opens → DONE ── */
  await realRun(vp, viewport, i, run("a"));
  await stopMidRun(vp, viewport, i, run("b"));
  await moneyWait(vp, viewport, i, run("c"));
  await outOfDate(vp, viewport, i, run("d"));
  await watcherFollows(vp, viewport, i, run("e"));
}

/** A fresh runnable campaign of ten, CONFIRMED. */
async function freshRun(id) {
  const r = await seedLive(`run=${id}`);
  if (!r.ok) throw new Error(`run seed failed: ${JSON.stringify(r)}`);
  return r;
}

async function realRun(vp, viewport, i, id) {
  const name = vp.name;
  const seeded = await freshRun(id);
  const { ctx, page } = await staffCtx("growth", viewport, vp.reduced);
  const calls = countActions(page);
  await pinWindow(NIGHT_EAT);
  // The quiet-hours wait names when the window opens (as the engine's step does), so its words are asked with the window shut.
  W.waits = (await seedLive("words=1")).words.waits;
  await openLive(page, seeded.campaignId);
  let s = await readLive(page);
  ok(`${name} · RUN · a CONFIRMED campaign of ${seeded.people}: Start is on, the page is not yet driving anything`,
    s.status === "CONFIRMED" && s.controls.start.disabled === false && s.driver?.mode === "watch" && s.driver.steps === 0, JSON.stringify({ status: s.status, driver: s.driver }));
  await press(page, "start");
  await page.getByRole("button", { name: W.dialog.start }).first().click();
  const sawPreparing = await waitFor(page, "document.querySelector('[data-live-status]')?.getAttribute('data-live-status') !== 'CONFIRMED'", 30000);
  s = await readLive(page);
  ok(`${name} · RUN · Start landed: the page left CONFIRMED at once (PREPARING or already RUNNING) and the toast said "${W.done.start}"`,
    sawPreparing && (s.status === "PREPARING" || s.status === "RUNNING") && (await toastShown(page, W.done.start)), JSON.stringify({ status: s.status, headline: s.headline }));
  const running = await waitStatus(page, "RUNNING", 45000);
  ok(`${name} · RUN · the list is written and the campaign is RUNNING (the enqueue step ran on this page's own driver)`, running);
  await waitFor(page, "(document.querySelector('[data-live-wait]')?.textContent ?? '').length > 0", 30000);
  s = await readLive(page);
  ok(`${name} · RUN · RUNNING with the send window SHUT: the bar is frozen at 0 of ${seeded.people}, the wait is said in words, and "keep this page open" stands`,
    s.status === "RUNNING" && !!s.bar && s.bar.now === 0 && s.bar.max === seeded.people && s.wait === W.waits.quiet_hours && s.keepOpen === W.keepOpen,
    JSON.stringify({ bar: s.bar, wait: s.wait, keep: s.keepOpen }));
  ok(`${name} · RUN · the page's own driver is stepping (mode drive, at least one step made) so "nobody driving" is NOT said`,
    s.driver?.mode === "drive" && s.driver.steps >= 1 && s.nobody === "", JSON.stringify({ driver: s.driver, nobody: s.nobody }));
  await fitCheck(page, name, "run-running");
  await stateShot(page, name, "run-running-window-shut", W.waits.quiet_hours);
  await stateShot(page, name, "run-running-figures", W.kpi.handedOver.label, SEL.blockProgress);
  // PAUSE — at once, a toast, named
  await press(page, "pause");
  await waitStatus(page, "PAUSED", 20000);
  s = await readLive(page);
  const pausedSentence = /^Paused by Asha Mwita at [0-9]{2}:[0-9]{2} EAT[.]$/;
  ok(`${name} · RUN · Pause acts at once: PAUSED, "${W.done.pause}", and the page names who and when from the act's own audit row`,
    s.status === "PAUSED" && pausedSentence.test(s.stop) && (await toastShown(page, W.done.pause)), JSON.stringify({ status: s.status, stop: s.stop }));
  const stepsAtPause = (await readLive(page)).driver?.steps ?? -1;
  await wait(7000);
  ok(`${name} · RUN · while PAUSED the driver makes no step call (it watches: one poll every ten seconds, no step)`,
    ((await readLive(page)).driver?.steps ?? -2) === stepsAtPause, `steps ${stepsAtPause} → ${(await readLive(page)).driver?.steps}`);
  await stateShot(page, name, "run-paused", s.stop);
  // RESUME — at once, a toast
  await press(page, "resume");
  await waitStatus(page, "RUNNING", 20000);
  s = await readLive(page);
  ok(`${name} · RUN · Resume acts at once: RUNNING again and the toast says "${W.done.resume}"`, s.status === "RUNNING" && (await toastShown(page, W.done.resume)), JSON.stringify({ status: s.status }));
  // the window opens — the page is reloaded so its driver steps at once (a reload is a mount)
  await pinWindow(NOON_EAT);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(SEL.status, { timeout: 60000 }).catch(() => {});
  const done = await waitStatus(page, "DONE", 90000);
  s = await readLive(page);
  ok(`${name} · RUN · DONE — "${W.headline.DONE}" (${seeded.expected.handedOver} handed over, the two who cannot be messaged skipped)`, done && s.headline === W.headline.DONE, JSON.stringify({ status: s.status, headline: s.headline }));
  const k = s.kpis;
  ok(`${name} · RUN · the KPIs read as the engine left them: ${seeded.people} on the campaign, ${seeded.expected.handedOver} handed over, 0 failed, 2 not sent, 0 no answer, 0 waiting`,
    k.onCampaign?.value === String(seeded.people) && k.handedOver?.value === String(seeded.expected.handedOver) && k.failed?.value === "0" && k.notSent?.value === "2"
      && k.noAnswer?.value === "0" && k.waiting?.value === "0", JSON.stringify(k));
  ok(`${name} · RUN · a SUPPRESSED contact was skipped — "${W.reasons.suppressed}" 1 and "${W.reasons.no_consent}" 1 under Not sent, the other three words 0`,
    s.reasons.length === 5 && s.reasons.some((r) => r.label === W.reasons.suppressed && r.count === "1") && s.reasons.some((r) => r.label === W.reasons.no_consent && r.count === "1")
      && s.reasons.filter((r) => r.count === "0").length === 3, JSON.stringify(s.reasons));
  ok(`${name} · RUN · the bar is full: ${seeded.people} of ${seeded.people}`, !!s.bar && s.bar.now === seeded.people && s.bar.max === seeded.people, JSON.stringify(s.bar));
  ok(`${name} · RUN · ⛔ never "delivered" for a hand-over: the chip says "Handed over", and the words "delivered" and "Delivery" appear nowhere outside the results card but the Handed over tile's hover`,
    s.chips.some((c) => c.status === "SENT" && /Handed over/.test(c.text)) && !/deliver/i.test((await mainTextOutside(page, SEL.blockResults)).replace(W.kpi.handedOver.title, "")));
  ok(`${name} · RUN · no money word for GROWTH in the whole page`, !/TZS/.test(await mainText(page)));
  ok(`${name} · RUN · DONE: Start, Pause, Resume and Stop are off with their reasons; Make a copy is on`,
    s.controls.start.disabled && s.controls.pause.disabled && s.controls.resume.disabled && s.controls.stop.disabled && s.controls.stop.title === W.disabled.stop && !s.controls.copy.disabled,
    JSON.stringify(s.controls));
  const before = calls.n;
  await wait(8000);
  ok(`${name} · RUN · the driver STOPPED on the terminal status: no server-action call in eight quiet seconds`, calls.n === before, `${before} → ${calls.n}`);
  await fitCheck(page, name, "run-done");
  await stateShot(page, name, "run-done", W.headline.DONE);
  await stateShot(page, name, "run-done-figures", W.kpi.handedOver.label, SEL.blockProgress);
  // ── ⭐ U48a · THE RESULTS: the gateway ACCEPTED eight messages — and not one is "delivered" until a RECEIPT says so ──
  let rs = await readResults(page);
  ok(`${name} · RESULTS · ${seeded.expected.handedOver} messages handed over and NO receipt: Delivered 0, "${W.results.rows.handedOver.label}" ${seeded.expected.handedOver}, Failed 0, Not sent 2, and the honesty line stands (the other one, "not set up", does not: this server takes receipts)`,
    !!rs && rs.title === W.results.title && rs.rows.delivered?.value === "0" && rs.rows.handedOver?.value === String(seeded.expected.handedOver) && rs.rows.failed?.value === "0"
      && rs.rows.notSent?.value === "2" && rs.honesty.join() === "no_receipt_yet" && rs.rows.stoppedByLink?.value === "0" && rs.spend === "",
    JSON.stringify(rs && { rows: Object.fromEntries(Object.entries(rs.rows).map(([k2, v]) => [k2, v.value])), honesty: rs.honesty, spend: rs.spend }));
  ok(`${name} · RESULTS · the honesty line is the spec's words and the "Delivered" row says nothing else: "${W.results.honesty.noReceiptYet}"`,
    (await textOf(page, "[data-results-honesty]")) === W.results.honesty.noReceiptYet && rs?.rows.delivered?.label === W.results.rows.delivered.label && rs?.rows.delivered?.help === W.results.rows.delivered.help);
  await fitCheck(page, name, "run-results");
  await stateShot(page, name, "run-results-before-receipts", W.results.honesty.noReceiptYet, SEL.blockResults);
  // three DELIVRD in ONE callback (the vendor batches), through the local route — then the page is asked again
  const batch = await receiptLines(seeded.campaignId, 3, "DELIVRD");
  const posted = await postReceipts(batch);
  ok(`${name} · RESULTS · three DELIVRD receipts POSTed at the local route in one callback: it answers 200 and {"status":"Ok"}`,
    batch.length === 3 && posted.status === 200 && posted.body.includes('"Ok"'), JSON.stringify({ lines: batch.length, status: posted.status, body: posted.body.slice(0, 80) }));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(SEL.blockResults, { timeout: 60000 }).catch(() => {});
  await wait(800);
  rs = await readResults(page);
  ok(`${name} · RESULTS · ⭐ the receipts moved EXACTLY their rows: Delivered 3, Handed over, no receipt yet ${seeded.expected.handedOver - 3} — and the honesty line is GONE by itself (a receipt has arrived)`,
    !!rs && rs.rows.delivered?.value === "3" && rs.rows.handedOver?.value === String(seeded.expected.handedOver - 3) && rs.honesty.length === 0 && rs.rows.failed?.value === "0",
    JSON.stringify(rs && { rows: Object.fromEntries(Object.entries(rs.rows).map(([k2, v]) => [k2, v.value])), honesty: rs.honesty }));
  const kpisNow = (await readLive(page)).kpis;
  ok(`${name} · RESULTS · the figures card still says Handed over ${seeded.expected.handedOver} (Delivered + the rest) — one number on two cards`,
    kpisNow.handedOver?.value === String(seeded.expected.handedOver), JSON.stringify(kpisNow.handedOver));
  await stateShot(page, name, "run-results-after-receipts", W.results.rows.delivered.label, SEL.blockResults);
  // an UNDELIV: a failure's receipt is a receipt too — Failed 1, "Not delivered (receipt)" 1
  const bad = await receiptLines(seeded.campaignId, 1, "UNDELIV");
  const postedBad = await postReceipts(bad);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(SEL.blockResults, { timeout: 60000 }).catch(() => {});
  await wait(800);
  rs = await readResults(page);
  ok(`${name} · RESULTS · an UNDELIV receipt: Failed 1 split as "${W.results.failed.receipt}" 1 and "${W.results.failed.wire}" 0, Delivered 3, Handed over, no receipt yet ${seeded.expected.handedOver - 4}`,
    postedBad.status === 200 && !!rs && rs.rows.failed?.value === "1" && rs.failed.length === 2 && rs.failed[0].label === W.results.failed.wire && rs.failed[0].count === "0"
      && rs.failed[1].label === W.results.failed.receipt && rs.failed[1].count === "1" && rs.rows.delivered?.value === "3" && rs.rows.handedOver?.value === String(seeded.expected.handedOver - 4),
    JSON.stringify(rs && { failed: rs.failed, delivered: rs.rows.delivered?.value, handedOver: rs.rows.handedOver?.value, status: postedBad.status }));
  // two of the people stop by their own link — the opt-out page's path — and the page reads it. ⭐ The stop count is kept for a
  // short time per campaign (the results' walk is the one expensive figure — campaign-results.ts), so the page is asked again
  // once that time has passed; a stop is never read stale for longer.
  const stoppedNow = await seedLive(`stop=${encodeURIComponent(seeded.campaignId)}&n=2`);
  await wait(W.results.linkTtlMs + 1500);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(SEL.blockResults, { timeout: 60000 }).catch(() => {});
  await wait(800);
  rs = await readResults(page);
  ok(`${name} · RESULTS · two people stopped by their own link after the message: "${W.results.rows.stoppedByLink.label}" 2`,
    stoppedNow.stopped === 2 && !!rs && rs.rows.stoppedByLink?.value === "2" && rs.rows.stoppedByLink.label === W.results.rows.stoppedByLink.label && !rs.rows.stoppedByLink.unread,
    JSON.stringify({ stop: stoppedNow, row: rs?.rows.stoppedByLink }));
  ok(`${name} · RESULTS · no money word for GROWTH on the whole page, results included`, !/TZS/.test(await mainText(page)));
  await fitCheck(page, name, "run-results-final");
  await stateShot(page, name, "run-results-final", W.results.rows.stoppedByLink.label, SEL.blockResults);
  // MAKE A COPY — a toast, then the composer
  await press(page, "copy");
  await page.waitForURL((u) => u.pathname === "/admin/campaigns/new", { timeout: 60000 }).catch(() => {});
  ok(`${name} · RUN · Make a copy: the officer lands in the composer on the new draft, and the toast "${W.copy.done}" came with them`,
    new URL(page.url()).pathname === "/admin/campaigns/new" && !!new URL(page.url()).searchParams.get("draft") && (await heading(page)) === COMPOSER_TITLE
      && (await toastShown(page, W.copy.done)), page.url());
  await ctx.close();
}

async function stopMidRun(vp, viewport, i, id) {
  const name = vp.name;
  const seeded = await freshRun(id);
  const { ctx, page } = await staffCtx("growth", viewport, vp.reduced);
  const calls = countActions(page);
  await pinWindow(NIGHT_EAT);
  await openLive(page, seeded.campaignId);
  await press(page, "start");
  await page.getByRole("button", { name: W.dialog.start }).first().click();
  await waitStatus(page, "RUNNING", 45000);
  await waitFor(page, "(document.querySelector('[data-live-wait]')?.textContent ?? '').length > 0", 30000);
  await press(page, "stop");
  const dlg = await dialogOf(page);
  ok(`${name} · STOP · the dialog asks first — "${W.stopDialog.none.title}" — with focus on CANCEL and the campaign's own advice`,
    !!dlg && dlg.title === W.stopDialog.none.title && dlg.text.includes(W.stopDialog.none.body) && dlg.focus === W.dialog.cancel && dlg.buttons.includes(W.dialog.stop), JSON.stringify(dlg));
  await dialogShot(page, name, "stop-dialog", W.stopDialog.none.title);
  await page.getByRole("button", { name: W.dialog.cancel }).first().click();
  await wait(500);
  ok(`${name} · STOP · Cancel keeps it running`, (await dialogOf(page)) === null && (await readLive(page)).status === "RUNNING");
  await press(page, "stop");
  await page.getByRole("button", { name: W.dialog.stop }).first().click();
  await waitStatus(page, "CANCELLED", 30000);
  const s = await readLive(page);
  ok(`${name} · STOP · "Stopped by Asha Mwita at HH:MM EAT — ${seeded.people} people were not messaged." — said once, and the toast "${W.done.stop}"`,
    s.status === "CANCELLED" && new RegExp(`^Stopped by Asha Mwita at [0-9]{2}:[0-9]{2} EAT — ${seeded.people} people were not messaged[.]$`).test(s.headline) && s.stop === ""
      && (await toastShown(page, W.done.stop)), JSON.stringify({ status: s.status, headline: s.headline, stop: s.stop }));
  ok(`${name} · STOP · every control is off with its reason except Make a copy — a stopped campaign cannot restart`,
    s.controls.start.disabled && s.controls.pause.disabled && s.controls.resume.disabled && s.controls.stop.disabled && !s.controls.copy.disabled && s.controls.stop.title === W.disabled.stop, JSON.stringify(s.controls));
  const before = calls.n;
  await wait(8000);
  ok(`${name} · STOP · the driver STOPPED: no server-action call in eight quiet seconds`, calls.n === before, `${before} → ${calls.n}`);
  await fitCheck(page, name, "stopped");
  await stateShot(page, name, "run-stopped", "people were not messaged");
  // ⭐ U48a · a campaign stopped before it sent anything: nothing handed over, so no honesty line; everybody "Stopped before sending"
  const xr = await readResults(page);
  ok(`${name} · STOP · RESULTS · "${W.results.rows.stopped.label}" ${seeded.people} — the headline's figure — Delivered 0, nothing handed over, and no honesty line (nothing to caution about)`,
    !!xr && xr.rows.stopped?.value === String(seeded.people) && xr.rows.stopped.label === W.results.rows.stopped.label && !xr.rows.waiting && xr.rows.delivered?.value === "0"
      && xr.rows.handedOver?.value === "0" && !xr.rows.noReceipt && xr.honesty.length === 0,
    JSON.stringify(xr && { rows: Object.fromEntries(Object.entries(xr.rows).map(([k2, v]) => [k2, v.value])), honesty: xr.honesty }));
  await stateShot(page, name, "run-stopped-results", W.results.rows.stopped.label, SEL.blockResults);
  await stateShot(page, name, "run-stopped-figures", W.kpi.handedOver.label, SEL.blockProgress);
  await ctx.close();
}

async function moneyWait(vp, viewport, i, id) {
  const name = vp.name;
  const seeded = await freshRun(id);
  const { ctx, page } = await staffCtx("growth", viewport, vp.reduced);
  await pinWindow(NOON_EAT);
  // The platform busy with money BEFORE the first slice: the enqueue step runs (it waits for nothing), the slice waits.
  await holdMoney(40000);
  await openLive(page, seeded.campaignId);
  await press(page, "start");
  await page.getByRole("button", { name: W.dialog.start }).first().click();
  await waitStatus(page, "RUNNING", 45000);
  const said = await waitFor(page, "(document.querySelector('[data-live-wait]')?.textContent ?? '').length > 0", 45000);
  const s = await readLive(page);
  ok(`${name} · WAIT · the platform busy with money: "${W.waits.money_busy}" — and nothing was handed over while it waited`,
    said && s.wait === W.waits.money_busy && s.kpis.handedOver?.value === "0", JSON.stringify({ wait: s.wait, kpis: s.kpis.handedOver }));
  await stateShot(page, name, "wait-money-busy", W.waits.money_busy);
  await holdMoney(0);
  const done = await waitStatus(page, "DONE", 90000);
  ok(`${name} · WAIT · the gate let go and the campaign went on by itself to DONE`, done);
  await ctx.close();
}

async function outOfDate(vp, viewport, i, id) {
  const name = vp.name;
  const seeded = await freshRun(id);
  const { ctx, page } = await staffCtx("growth", viewport, vp.reduced);
  await pinWindow(NIGHT_EAT);
  await openLive(page, seeded.campaignId);
  await press(page, "start");
  await page.getByRole("button", { name: W.dialog.start }).first().click();
  await waitStatus(page, "RUNNING", 45000);
  await waitFor(page, "(document.querySelector('[data-live-wait]')?.textContent ?? '').length > 0", 30000);
  // From here every server action of this page fails in transit — a deploy's skewed ids, a lost connection.
  const abort = await abortActions(page);
  await waitFor(page, "document.querySelector('[data-live-stopped]') !== null", 60000);
  const s = await readLive(page);
  ok(`${name} · OUT OF DATE · a thrown call stops the loop: "${W.outOfDate}" with a ${W.reload} button`,
    s.stopped === "out_of_date" && s.stoppedText.includes(W.outOfDate) && (await page.locator("[data-live-reload]").count()) === 1, JSON.stringify({ stopped: s.stopped, text: s.stoppedText }));
  const hits = abort.hits();
  await wait(9000);
  ok(`${name} · OUT OF DATE · and it never retries blind: no further call in nine seconds (${hits} made, ${abort.hits()} after)`, abort.hits() === hits && hits >= 1, `${hits} → ${abort.hits()}`);
  await fitCheck(page, name, "out-of-date");
  await stateShot(page, name, "out-of-date", W.outOfDate, SEL.blockControls);
  await abort.off();
  await page.locator("[data-live-reload]").first().click();
  await page.waitForSelector(SEL.status, { timeout: 60000 }).catch(() => {});
  await wait(1500);
  ok(`${name} · OUT OF DATE · Reload brings the page back: the campaign where it is, no stop sentence, the driver running again`,
    (await readLive(page)).stopped === null && (await readLive(page)).driver?.mode === "drive", JSON.stringify((await readLive(page)).driver));
  await ctx.close();
}

async function watcherFollows(vp, viewport, i, id) {
  const name = vp.name;
  const seeded = await freshRun(id);
  const driver = await staffCtx("growth", viewport, vp.reduced);
  const watch = await staffCtx("auditor", viewport, vp.reduced);
  const watcherCalls = countActions(watch.page);
  await pinWindow(NOON_EAT);
  await openLive(watch.page, seeded.campaignId);
  const before = await readLive(watch.page);
  ok(`${name} · WATCHER · an officer who may only LOOK sees the CONFIRMED campaign with every control off and the role's reason`,
    before.status === "CONFIRMED" && ACTS.every((x) => before.controls[x].disabled === true && before.controls[x].title === W.disabled.role), JSON.stringify(before.controls));
  await openLive(driver.page, seeded.campaignId);
  await press(driver.page, "start");
  await driver.page.getByRole("button", { name: W.dialog.start }).first().click();
  // The watcher's page follows by itself — its poll runs every ten seconds — and the campaign reaches DONE on the other page.
  const followed = await waitStatus(watch.page, "DONE", 120000);
  const after = await readLive(watch.page);
  ok(`${name} · WATCHER · ⭐ the watcher's page followed the campaign from CONFIRMED to DONE with no reload and made ZERO step calls (mode ${after.driver?.mode}, polls ${after.driver?.polls})`,
    followed && after.driver?.steps === 0 && (after.driver?.polls ?? 0) >= 1 && after.headline === W.headline.DONE, JSON.stringify({ driver: after.driver, status: after.status }));
  ok(`${name} · WATCHER · "Nobody is driving" was never said at the end, and nothing the watcher sees is a button it can press`,
    after.nobody === "" && ACTS.every((x) => after.controls[x].present), JSON.stringify(after.controls));
  await stateShot(watch.page, name, "watcher-done", W.headline.DONE);
  await driver.ctx.close();
  await watch.ctx.close();
  void watcherCalls;
}

/* ═══ RUN ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */

let failed = null;
try {
  await main();
} catch (err) {
  failed = err;
  ok(`the drive ran to its end`, false, String(err?.message ?? err).slice(0, 300));
} finally {
  // The real clock back, the gate let go, the AUDITOR's grant taken away — whatever happened.
  await pinWindow("now").catch(() => {});
  await holdMoney(0).catch(() => {});
  await post("/api/dev-test/marketing-contacts-seed?u23grant=reset").catch(() => {});
  await browser.close().catch(() => {});
}

console.log(`${NL}measured (recorded, not asserted equal): ${JSON.stringify(measured)}`);
console.log(`${NL}u47b2 live drive: ${pass} passed, ${fail} failed${failed ? " (stopped early)" : ""}`);
process.exitCode = fail === 0 && failed === null ? 0 : 1;
