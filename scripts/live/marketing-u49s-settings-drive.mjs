/**
 * U49s-2 · /admin/system — the "Marketing SMS sending" card above the rail and the "Marketing SMS" tab, driven and
 * MEASURED on a LOCAL server backed by a scratch PostgreSQL 18.3 (spec `docs/marketing-specs/ENGINE-SPEC.md` §4.3 U49s
 * "Drive"; OD62 · OD63). `npm run qa:marketing-settings`.
 *
 * ⭐ THE SWITCH IS OPENED AND CLOSED FOR REAL — through the card, the actions and the shipped writers, against a real
 * database — and every change is read back IN SQL (the row, and its COMPLIANCE rows), never only on the screen. No
 * injected reader, no faked state: the malformed, expired and stamped-ahead rows and the half-read settings record are
 * written into the scratch cluster's `SystemConfig` the way a broken or foreign writer would leave them, and the page reads
 * them like any other.
 *
 * WHAT THIS PROVES, at 1280x800 and 360x780 (+ reduced motion at 360), with HeadlessChrome in the UA. Every capture asserts
 * the page's heading and the sentence its state is about BEFORE it photographs (`stateShot`), and frames the card or the
 * dialog it is about:
 *   OWNER (ADMIN) — off (absent), the limits line in money; the switch-on dialog (six durations as radios inside it, 2
 *   hours by default — again after a Cancel — chosen by the arrow keys, the closing time in EAT following the choice in a
 *   polite live region, focus on Cancel); ON for real (the row's three keys and its "opening" + "opened" rows in SQL; with
 *   the action's request held 2.5 s, the dialog stays up, busy, its durations locked and Escape refused; then it closes
 *   with the answer and focus lands on the state sentence), the state on another tab too (above the rail); ALREADY OFF
 *   (the row gone before the click: "It was already off.", nothing recorded); a refusal still on screen after 6 s; and no
 *   uncaught exception in any page, at any width or role (the dev overlay is hidden from the captures, so it is asserted); OFF for real (the row gone, its
 *   "closed" row `was: open`); a MALFORMED row (both buttons; "Switch off now" clears it, recorded `was: malformed`); an
 *   EXPIRED row ("it switched itself off at"); an opening STAMPED AHEAD of this clock (Switch on… refused with how to clear
 *   it — never "already on" under a card that says off — nothing written or recorded); an opening that lands BEHIND a
 *   loaded page (refused "Switched on since this page loaded" over the writer's sentence, theirs untouched, nothing
 *   recorded, the card re-reading it on); the Marketing SMS tab — the defaults, every refusal at once under its own box, a save
 *   (read back in SQL, the card's limits line following it), a STALE save from a second page refused with nothing written,
 *   and a HALF-READ record (no values shown, every save refused, the card's line saying so).
 *   VIEWERS — by default ONLY the owner may open Admin → System (no other role holds the ops view), so the drive grants two
 *   in the scratch cluster BEFORE the server first reads its grants (rbac.ts caches them — hence a FRESH server per run):
 *   GROWTH may view (no money figures, no act) — the card's line names the window only, no TZS anywhere in the card or the
 *   tab; COMPLIANCE (the spec's viewer) may view and act, and reads money — the money line said for a viewer. Both see the
 *   buttons the state calls for DISABLED, with the reason beside them and in their title; both read the tab as text.
 *   LOADING — /admin/system reached from another admin page with the System PAGE's chunk held (never the section layout's,
 *   which wraps the loading boundary): the page's own ghost (the card's ghost among it) and not yet the card; then the
 *   card's ghost is the card's height at both widths. The top edges are RECORDED: the older ghosts above the card do not
 *   match today's page (owed in the plan, not this unit's).
 *   FIT — no sideways scroll at either width, nothing past a card's edge.
 * ⚠️ DEPARTURES FROM THE SPEC'S DRIVE, recorded: (1) no in-memory boot and no injected reader — the plan moved the drive to
 * a real database so the switch is opened for real; so (2) the no-database refusal is not driven here (no Postgres-backed
 * server can answer it) — `test:marketing-settings` S5b holds it; (3) an owner whose own money.figures cell hides money is
 * not driven (the grant cache would hold it for the whole run) — S11 holds it in the view.
 *
 * Run (the scratch cluster stays up for the dev server; stop both after; remove .next before the boot):
 *   npm run db:scratch -- --reset            (in its own terminal; it prints the URL — 127.0.0.1:5433)
 *   DATABASE_URL=postgresql://…@127.0.0.1:5433/… npx prisma migrate deploy
 *   DATABASE_URL=… SMS_PROVIDER=console SESSION_SECRET=<32+ chars> OTP_PEPPER=<16+ chars> DISABLE_ADMIN_TOTP=true
 *     npx next dev -p 3011
 *   DATABASE_URL=… BASE=http://localhost:3011 node scripts/live/marketing-u49s-settings-drive.mjs
 * ⛔ A PC whose `.env.local` holds REAL Blackball keys: pin `SMS_PROVIDER=console` — nothing in this drive sends, and the
 *   console stub reaches no phone even if something did. ⛔ LOOPBACK ONLY: the drive refuses any other database host
 *   before it connects (`test:marketing-settings` S7 allows it to name the switch's keys only while it does).
 */
import { chromium } from "playwright";
import pg from "pg";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3011";
const DB_URL = process.env.DATABASE_URL || "";
let dbHost = "";
try {
  const u = new URL(DB_URL);
  // ⛔ pg lets a `host` (or `hostaddr`) parameter override the address's host, so an address carrying one is refused.
  dbHost = u.searchParams.has("host") || u.searchParams.has("hostaddr") ? "" : u.hostname;
} catch { /* refused below */ }
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(dbHost)) {
  console.error("refusing: this drive writes rows into SystemConfig, and runs only against a loopback cluster (DATABASE_URL).");
  process.exit(2);
}
const SHOTS = join(".qa-shots", "marketing-setup", "u49s2");
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
const EAT_TIME = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Dar_es_Salaam", hour: "2-digit", minute: "2-digit", hour12: false });

/* ── the page's own words ── */
const TITLE = "System";
const OFF_ABSENT = "Off — no marketing SMS can be sent. Campaigns can't start, and test sends to a phone are refused.";
const OFF_MALFORMED = "Off — the stored switch was not in a shape this version reads, so it is treated as off.";
const OFF_EXPIRED = "Off — it switched itself off at ";
const ON_PREFIX = "On until ";
const LIMITS_OWNER = "TZS 6 per SMS · TZS 20,000 kept for login and withdrawal codes · at most TZS 10,000 per campaign · sends 08:00–20:00 EAT — change them on the Marketing SMS tab.";
const LIMITS_HIDDEN = "Sends 08:00–20:00 EAT. The price, the credit kept for codes and the campaign limit are shown to roles that may read money figures.";
const LIMITS_HALF = "The saved Marketing SMS settings couldn't be read in full, so nothing that spends money uses them until a developer fixes the stored record.";
const NOT_OWNER = "Only an owner account (ADMIN) can switch marketing SMS on or off.";
const ON_TITLE = "Switch on marketing SMS?";
const OFF_TITLE = "Switch off marketing SMS now?";
const OFF_BODY = "Campaigns that are sending pause at their next step. Messages already handed to the network are not recalled.";
const CLEAR_FIRST_TITLE = "Clear the stored switch first";
const CLEAR_FIRST = "The stored switch is in a shape this version can't read, and it blocks switching on. Switch it off now to clear it, then switch on.";
const ON_SINCE_TITLE = "Switched on since this page loaded";
const ALREADY_ON = "Marketing SMS are already on — switch them off first if you want a different closing time.";
const DEFAULTS_NOTE = "Nothing has been saved yet — these are the defaults, and campaigns use them until you save.";
const SAVED = "Saved — campaigns use these from their next step.";
const STALE = "These settings were changed by someone else since you opened the page — reload, then save again.";
const IDLE = "Change a setting to save.";
const FIX = "Fix the problems shown under the boxes to save.";
const MONEY_HIDDEN = "The price, the credit kept for codes and the campaign limit are shown to roles that may read money figures.";
const NOT_OWNER_NOTE = "Only an owner account (ADMIN) can change these.";
const UNREADABLE_NOTE = "The saved settings couldn't be read in full, so nothing that spends money uses them, and nothing can be saved here until a developer fixes the stored record.";
const REFUSALS = {
  price: "Enter the price per SMS in TZS — from 1 to 1,000, at most two decimals.",
  limit: "Enter a campaign limit from TZS 100 to TZS 10,000,000.",
  length: "The window must be at least 2 hours long.",
};
const RESERVE_PREFIX = "Enter the credit to keep for codes in TZS";
const S = {
  card: "[data-live-switch]",
  state: "[data-live-switch-state]",
  limits: "[data-live-switch-limits]",
  on: "[data-live-switch-on]",
  off: "[data-live-switch-off]",
  reason: "[data-live-switch-reason]",
  closes: "[data-live-switch-closes]",
  form: '[data-sms-settings="form"]',
  readOnly: '[data-sms-settings="read-only"]',
  note: "[data-sms-settings-note]",
  save: "[data-sms-settings-save]",
  saveReason: "[data-sms-settings-reason]",
  rail: 'nav[aria-label="System sections"]',
  dialog: '[role="alertdialog"]',
};
const DLG = '[role="alertdialog"]:has([data-live-switch-dialog])';
/** The duration the switch-on dialog has checked, in ms (NaN when none is). */
const checkedMs = async (page) => Number(await page.locator(`${DLG} input[type="radio"]:checked`).first().getAttribute("value", { timeout: 3000 }).catch(() => "NaN"));

/* ── the scratch cluster ── */
const sql = new pg.Client({ connectionString: DB_URL });
await sql.connect();
const KEY = "marketing.sms.live";
const SKEY = "marketing.sms.settings";
const rowOf = async (key) => {
  const r = await sql.query('SELECT value FROM "SystemConfig" WHERE key = $1', [key]);
  return r.rows.length === 0 ? null : r.rows[0].value;
};
const setRow = (key, value) => sql.query(
  'INSERT INTO "SystemConfig" (key, value, "updatedAt") VALUES ($1, $2::jsonb, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = now()',
  [key, JSON.stringify(value)],
);
const dropRow = (key) => sql.query('DELETE FROM "SystemConfig" WHERE key = $1', [key]);
const auditCount = async (action) => Number((await sql.query('SELECT count(*)::int AS n FROM "AuditLog" WHERE action = $1', [action])).rows[0].n);
const lastAudit = async (action) => (await sql.query('SELECT payload FROM "AuditLog" WHERE action = $1 ORDER BY seq DESC LIMIT 1', [action])).rows[0]?.payload ?? null;
const iso = (ms) => new Date(ms).toISOString();

// ⛔ THE VIEWERS' GRANTS FIRST — the server hydrates its grant cache on its first admin request and keeps it (rbac.ts), so
// these land before any: GROWTH views System (no act), COMPLIANCE views and acts. Only the scratch cluster is touched.
await sql.query(
  `INSERT INTO "RoleDomainGrant" (role, domain, "canView", "canAct", "updatedAt") VALUES ('GROWTH', 'ops', true, false, now()), ('COMPLIANCE', 'ops', true, true, now())
   ON CONFLICT (role, domain) DO UPDATE SET "canView" = EXCLUDED."canView", "canAct" = EXCLUDED."canAct", "updatedAt" = now()`,
);
// A clean start: no switch row, no settings row (the drive is re-runnable on one cluster — with a fresh server).
await dropRow(KEY);
await dropRow(SKEY);

const browser = await chromium.launch();
const runId = String(Date.now()).slice(-5);
const ROLE_CODE = { ADMIN: 1, GROWTH: 2, COMPLIANCE: 3 };

/** Every uncaught exception a page throws in the browser, with its role — the drive ends red on any. */
const pageErrors = [];
const watchErrors = (p, role) => p.on("pageerror", (e) => { pageErrors.push(`${role}: ${String(e?.message ?? e).slice(0, 200)}`); });

async function staffCtx(role, viewport, reducedMotion = "no-preference", n = 1) {
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
  // ⛔ The dev overlay is hidden from the captures, so a client exception is collected here instead — and the drive
  // fails on any (the last check).
  watchErrors(page, role);
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  // E.164, as every house drive seeds: +255, then 70, five run digits, the role's code and a slot.
  const phone = `+25570${runId}${ROLE_CODE[role]}${n}`;
  const r = await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { role, phone, name: `QA ${role}` } });
  if (!r.ok()) throw new Error(`seed-admin ${role} failed: ${r.status()}`);
  await page.evaluate(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  return { ctx, page };
}

const mainText = async (page) => squash(await page.evaluate(() => document.querySelector("main#main-content")?.innerText ?? ""));
const heading = async (page) => squash(await page.locator("main#main-content h1").first().innerText().catch(() => ""));
const textOf = async (page, sel) => ((await page.locator(sel).count()) > 0 ? squash(await page.locator(sel).first().innerText().catch(() => "")) : "");
const has = async (page, sel) => (await page.locator(sel).count()) > 0;
const attr = (page, sel, name) => page.locator(sel).first().getAttribute(name).catch(() => null);
const isDisabled = (page, sel) => page.locator(sel).first().isDisabled().catch(() => null);
const panelBox = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  const box = el ? (el.closest(".glass-panel") ?? el) : null;
  if (!box) return null;
  const r = box.getBoundingClientRect();
  return { top: Math.round((r.top + window.scrollY) * 100) / 100, h: Math.round(r.height * 100) / 100 };
}, sel);

async function openSystem(page, tab = "platform") {
  await page.goto(`${BASE}/admin/system?tab=${tab}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main#main-content h1", { timeout: 120000 });
  await page.waitForSelector(S.card, { timeout: 60000 }).catch(() => {});
  await wait(800);
}
/** Viewport tiles only: the top, or the card/dialog/form a capture is about, scrolled into view. */
async function shoot(page, name, frame = null) {
  if (frame) {
    await page.evaluate((s) => {
      const el = document.querySelector(s);
      (el?.closest(".glass-panel") ?? el)?.scrollIntoView({ block: "start" });
    }, frame);
  } else {
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await wait(250);
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}
/** A tile centred on one node ITSELF (not its card) — the parts of a long card a capture framed on its top cannot reach. */
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
/** ⛔ Every capture asserts what it photographs FIRST — the page's heading, and the sentence the state is about, read from
 *  `textSel` (the dialog, portalled outside main) or from main — and then that the framed node is on screen. */
async function stateShot(page, vp, name, wantText, frame = null, textSel = null) {
  const h1 = await heading(page);
  const text = textSel ? squash(await page.evaluate((s) => document.querySelector(s)?.innerText ?? "", textSel)) : await mainText(page);
  ok(`${vp} · ${name} · the capture shows the "${TITLE}" heading and "${wantText.slice(0, 70)}"`, h1 === TITLE && text.includes(wantText),
    `h1="${h1}" text="${text.slice(0, 220)}"`);
  await shoot(page, `${vp}-${name}`, frame);
  if (frame) {
    const inView = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.top >= -1 && r.top < window.innerHeight && r.height > 0;
    }, frame);
    ok(`${vp} · ${name} · the capture frames what it is about`, inView);
  }
}
const fitOf = (page) => page.evaluate(() => {
  const cards = [...document.querySelectorAll("[data-live-switch], [data-sms-settings]")];
  const spill = [];
  for (const c of cards) {
    const box = c.closest(".glass-panel") ?? c;
    const br = box.getBoundingClientRect();
    for (const el of c.querySelectorAll("*")) {
      if (el.classList.contains("sr-only")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > br.right + 1 || r.left < br.left - 1) spill.push(el.tagName.toLowerCase() + "." + (el.className || "").toString().slice(0, 30));
    }
  }
  return { overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth), spill: spill.slice(0, 5), spillCount: spill.length };
});
async function fitCheck(page, vp, name) {
  const f = await fitOf(page);
  ok(`${vp} · ${name} · FIT — no sideways scroll, nothing past a card's edge`, f.overflow === 0 && f.spillCount === 0, JSON.stringify(f));
}
/** The toast that holds `expected` — a toast item is the parent of its dismiss button (role status OR alert: a danger
 *  toast is role="alert") — then every toast's words, for the detail. Never throws: a missing toast is a FAIL. */
const TOAST_ITEMS = "button[data-toast-dismiss]";
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

const VPS = [
  { name: "1280", width: 1280, height: 800 },
  { name: "360", width: 360, height: 780 },
];

/* ══ THE OWNER ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
for (const vp of VPS) {
  console.log(`\n── OWNER (ADMIN) at ${vp.name} ──`);
  await dropRow(KEY);
  await dropRow(SKEY);
  const { ctx, page } = await staffCtx("ADMIN", { width: vp.width, height: vp.height });
  ok(`${vp.name} · UA carries HeadlessChrome`, /HeadlessChrome/.test(await page.evaluate(() => navigator.userAgent)));

  // OFF (absent), the limits line in money, Switch on… offered.
  await openSystem(page);
  ok(`${vp.name} · off (absent) · the state sentence`, (await textOf(page, S.state)) === OFF_ABSENT, await textOf(page, S.state));
  ok(`${vp.name} · off · the limits line in money for the owner`, (await textOf(page, S.limits)) === LIMITS_OWNER, await textOf(page, S.limits));
  ok(`${vp.name} · off · Switch on… offered and enabled, no Switch off, no reason line`, (await has(page, S.on)) && (await isDisabled(page, S.on)) === false && !(await has(page, S.off)) && !(await has(page, S.reason)));
  await stateShot(page, vp.name, "off-absent", OFF_ABSENT, S.card);
  await fitCheck(page, vp.name, "off-absent");

  // The switch-on dialog: 2 hours by default, the closing time in EAT, focus on Cancel.
  const tOpen = Date.now();
  await page.locator(S.on).click();
  await page.waitForSelector('[data-live-switch-dialog="on"]', { timeout: 15000 });
  await wait(400);
  const focused = squash(await page.evaluate(() => document.activeElement?.textContent ?? ""));
  ok(`${vp.name} · switch-on dialog · focus on Cancel`, /^Cancel$/i.test(focused), focused);
  const dlg = squash(await page.evaluate((s) => document.querySelector(s)?.textContent ?? "", DLG));
  const twoH = [tOpen, Date.now()].map((t) => `${EAT_TIME.format(t + 2 * 3600_000)} EAT`);
  // ⭐ The six durations are RADIOS inside the dialog — a list portalled outside an aria-modal dialog is hidden from
  // VoiceOver — with 2 hours checked; and the closing time sits in a polite live region, so it is read out as it changes.
  const radios = await page.locator(DLG).getByRole("radio").count();
  ok(`${vp.name} · switch-on dialog · the title, six durations as radios inside it, 2 hours checked`,
    dlg.includes(ON_TITLE) && radios === 6 && (await checkedMs(page)) === 2 * 3600_000, `${dlg.slice(0, 160)} · radios ${radios} · checked ${await checkedMs(page)}`);
  ok(`${vp.name} · switch-on dialog · the closing time is in a polite live region`,
    await page.evaluate((s) => document.querySelector(s)?.closest('[aria-live="polite"]') != null, S.closes));
  const closes2h = await textOf(page, S.closes);
  ok(`${vp.name} · switch-on dialog · the closing time is now + 2 hours, in EAT`, twoH.some((x) => closes2h.startsWith(x)), `${closes2h} vs ${twoH.join(" or ")}`);
  await stateShot(page, vp.name, "switch-on-dialog", ON_TITLE, null, DLG);
  // Choose 30 minutes BY KEYBOARD — the group is one tab stop, and the arrow moves the choice: 2 hours → 1 hour → 30
  // minutes. The closing time follows (bracketed: the dialog stamps "now" when it opens).
  await page.locator(DLG).getByRole("radio", { name: "2 hours" }).focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await wait(300);
  const closes30 = (await textOf(page, S.closes)).slice(0, 5);
  const thirty = [tOpen, Date.now()].map((t) => EAT_TIME.format(t + 30 * 60_000));
  ok(`${vp.name} · switch-on dialog · the arrows chose 30 minutes, and the closing time follows (${thirty.join(" or ")})`,
    (await checkedMs(page)) === 30 * 60_000 && thirty.includes(closes30), `checked ${await checkedMs(page)} · ${closes30}`);
  // Cancel, then open again: the duration is back to 2 hours (never the last choice left in the dialog).
  // The visible Cancel button (the scrim behind the dialog is a button labelled "Cancel" too).
  await page.locator(DLG).locator("button.btn", { hasText: /^Cancel$/ }).click();
  await wait(400);
  await page.locator(S.on).click();
  await page.waitForSelector('[data-live-switch-dialog="on"]', { timeout: 15000 });
  await wait(300);
  ok(`${vp.name} · switch-on dialog · after a Cancel it opens on 2 hours again`, (await checkedMs(page)) === 2 * 3600_000, `checked ${await checkedMs(page)}`);
  await page.locator(DLG).getByRole("radio", { name: "30 minutes" }).check();
  await wait(300);

  // ON — for real. ⭐ THE DIALOG HOLDS UNTIL THE SERVER ANSWERS: the action's request is held 2.5 s here, and meanwhile
  // the dialog stays up and busy, its durations locked (the instant it names stays the one asked for), Escape refused.
  const openingBefore = await auditCount("marketing.live_switch_opening");
  const openedBefore = await auditCount("marketing.live_switch_opened");
  const holdAction = async (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.headers()["next-action"]) await wait(2500);
    await route.continue().catch(() => {});
  };
  await page.route(`${BASE}/admin/system**`, holdAction);
  await page.locator(DLG).getByRole("button", { name: "Switch on", exact: true }).click();
  await wait(700);
  const busy = await page.evaluate((s) => document.querySelector(s)?.getAttribute("aria-busy") ?? null, DLG);
  const locked = await page.evaluate((s) => document.querySelector(`${s} input[type="radio"]`)?.matches(":disabled") ?? null, DLG);
  await page.keyboard.press("Escape");
  await wait(250);
  const heldUp = await has(page, DLG);
  ok(`${vp.name} · switching on · the dialog holds while the server works — busy, its durations locked, Escape refused`,
    busy === "true" && locked === true && heldUp, `busy ${busy} · locked ${locked} · still up ${heldUp}`);
  const tOn = await toastText(page, "Marketing SMS are on until ");
  await page.unroute(`${BASE}/admin/system**`, holdAction).catch(() => {});
  ok(`${vp.name} · switched on · the toast names the closing time`, tOn.includes("Marketing SMS are on until "), tOn);
  // ⭐ The dialog closed with the answer, and focus is on the state sentence — which the refresh has made say "on".
  await page.waitForSelector(DLG, { state: "detached", timeout: 15000 }).catch(() => {});
  const focusOnState = await page.evaluate(() => document.activeElement?.hasAttribute("data-live-switch-state") === true);
  ok(`${vp.name} · switched on · the dialog is gone, and focus is on the state sentence, which reads on`,
    focusOnState && (await textOf(page, S.state)).startsWith(ON_PREFIX), `${focusOnState} · ${await textOf(page, S.state)}`);
  await dismissToasts(page);
  await openSystem(page);
  const row = await rowOf(KEY);
  ok(`${vp.name} · ON · the row in SQL is exactly the three keys, 30 minutes long`, row !== null
    && Object.keys(row).sort().join(",") === "closesAt,enabledAt,enabledBy"
    && Date.parse(row.closesAt) - Date.parse(row.enabledAt) === 30 * 60_000, JSON.stringify(row));
  ok(`${vp.name} · ON · its "opening" and "opened" COMPLIANCE rows in SQL`,
    (await auditCount("marketing.live_switch_opening")) === openingBefore + 1 && (await auditCount("marketing.live_switch_opened")) === openedBefore + 1);
  const onText = await textOf(page, S.state);
  ok(`${vp.name} · ON · the card says on until, by whom, at what time`, onText.startsWith(ON_PREFIX) && onText.includes("switched on by QA ADMIN"), onText);
  ok(`${vp.name} · ON · Switch off now offered, no Switch on…`, (await has(page, S.off)) && !(await has(page, S.on)));
  await stateShot(page, vp.name, "on", ON_PREFIX, S.card);
  await fitCheck(page, vp.name, "on");
  // ⭐ ABOVE THE RAIL: the state is on another tab too.
  await openSystem(page, "diagnostics");
  ok(`${vp.name} · ON · the card is above the rail on the Diagnostics tab too`, (await textOf(page, S.state)).startsWith(ON_PREFIX));
  await stateShot(page, vp.name, "on-diagnostics-tab", ON_PREFIX, S.card);
  // …and it IS the Diagnostics tab: the rail marks it, and the card stands above the rail (its own tile shows the rail).
  const current = squash(await page.evaluate((s) => document.querySelector(s)?.querySelector('[aria-current="page"]')?.textContent ?? "", S.rail));
  const cardAt = await panelBox(page, S.card);
  const railAt = await panelBox(page, S.rail);
  ok(`${vp.name} · ON · the rail marks Diagnostics, and the card stands above it`, /^Diagnostics/.test(current) && cardAt !== null && railAt !== null && cardAt.top < railAt.top,
    `current="${current}" card ${cardAt?.top} rail ${railAt?.top}`);
  await tileOn(page, vp.name, "on-diagnostics-rail", S.rail);

  // OFF — for real.
  await openSystem(page);
  const closedBefore = await auditCount("marketing.live_switch_closed");
  await page.locator(S.off).click();
  await page.waitForSelector('[data-live-switch-dialog="off"]', { timeout: 15000 });
  const offDlg = squash(await page.evaluate((s) => document.querySelector(s)?.textContent ?? "", DLG));
  ok(`${vp.name} · switch-off dialog · its title and body`, offDlg.includes(OFF_TITLE) && offDlg.includes(OFF_BODY), offDlg.slice(0, 200));
  await stateShot(page, vp.name, "switch-off-dialog", OFF_TITLE, null, DLG);
  await page.locator(DLG).getByRole("button", { name: "Switch off", exact: true }).click();
  const tOff = await toastText(page, "Marketing SMS are off.");
  ok(`${vp.name} · switched off · the toast`, tOff.includes("Marketing SMS are off."), tOff);
  await dismissToasts(page);
  await openSystem(page);
  ok(`${vp.name} · OFF · the row is gone in SQL, and its "closed" row says was:open`,
    (await rowOf(KEY)) === null && (await auditCount("marketing.live_switch_closed")) === closedBefore + 1 && (await lastAudit("marketing.live_switch_closed"))?.was === "open");
  ok(`${vp.name} · OFF · the card reads off again`, (await textOf(page, S.state)) === OFF_ABSENT);

  // ALREADY OFF: the card read it on, but the row went before the click — "It was already off.", said as the read after
  // it finds the switch (nothing stored), and nothing recorded.
  await setRow(KEY, { enabledBy: "usr_somebody", enabledAt: iso(Date.now() - 60_000), closesAt: iso(Date.now() + 3600_000) });
  await openSystem(page);
  await dropRow(KEY);
  const closedBeforeAlready = await auditCount("marketing.live_switch_closed");
  await page.locator(S.off).click();
  await page.waitForSelector('[data-live-switch-dialog="off"]', { timeout: 15000 });
  await page.locator(DLG).getByRole("button", { name: "Switch off", exact: true }).click();
  const tAlready = await toastText(page, "It was already off.");
  ok(`${vp.name} · already off · "It was already off." — nothing stored, nothing recorded`,
    tAlready.includes("It was already off.") && (await auditCount("marketing.live_switch_closed")) === closedBeforeAlready, tAlready);
  await dismissToasts(page);

  // A MALFORMED row: both buttons, the instruction for the owner; Switch off now clears it and records was:malformed.
  await setRow(KEY, { enabledBy: "usr_somebody", enabledAt: iso(Date.now() - 60_000) });
  await openSystem(page);
  ok(`${vp.name} · malformed · the sentence with the owner's instruction, both buttons`,
    (await textOf(page, S.state)) === `${OFF_MALFORMED} Switch it off now to clear it.` && (await has(page, S.on)) && (await has(page, S.off)), await textOf(page, S.state));
  await stateShot(page, vp.name, "malformed", OFF_MALFORMED, S.card);
  await page.locator(S.off).click();
  await page.waitForSelector('[data-live-switch-dialog="off"]', { timeout: 15000 });
  await page.locator(DLG).getByRole("button", { name: "Switch off", exact: true }).click();
  await toastText(page, "Marketing SMS are off.");
  await dismissToasts(page);
  ok(`${vp.name} · malformed cleared · the row is gone, recorded was:malformed`, (await rowOf(KEY)) === null && (await lastAudit("marketing.live_switch_closed"))?.was === "malformed");

  // An EXPIRED row: "it switched itself off at".
  await setRow(KEY, { enabledBy: "usr_somebody", enabledAt: iso(Date.now() - 3 * 3600_000), closesAt: iso(Date.now() - 3600_000) });
  await openSystem(page);
  ok(`${vp.name} · expired · it switched itself off at its closing time`, (await textOf(page, S.state)).startsWith(OFF_EXPIRED), await textOf(page, S.state));
  await stateShot(page, vp.name, "expired", OFF_EXPIRED, S.card);

  // An opening STAMPED AHEAD of this clock: Switch on… is refused with how to clear it — never "already on" under a card
  // that says off — and nothing is written or recorded.
  const ahead = { enabledBy: "usr_other_clock", enabledAt: iso(Date.now() + 2 * 60_000), closesAt: iso(Date.now() + 2 * 3600_000) };
  await setRow(KEY, ahead);
  await openSystem(page);
  const openingAhead = await auditCount("marketing.live_switch_opening");
  await page.locator(S.on).click();
  await page.waitForSelector('[data-live-switch-dialog="on"]', { timeout: 15000 });
  await page.locator(DLG).getByRole("button", { name: "Switch on", exact: true }).click();
  const tAhead = await toastText(page, CLEAR_FIRST);
  const stillAhead = await rowOf(KEY);
  ok(`${vp.name} · stamped ahead · refused under "${CLEAR_FIRST_TITLE}" with how to clear it, never "already on"; the row untouched, nothing recorded`,
    tAhead.includes(CLEAR_FIRST_TITLE) && tAhead.includes(CLEAR_FIRST) && !/already on/i.test(tAhead) && stillAhead?.enabledBy === "usr_other_clock"
      && (await auditCount("marketing.live_switch_opening")) === openingAhead,
    `${tAhead} · ${JSON.stringify(stillAhead)}`);
  await stateShot(page, vp.name, "stamped-ahead-refused", OFF_MALFORMED, S.card);
  // ⛔ A refusal stays until it is dismissed (UD-3): still there long after an ordinary toast's 4.5 s.
  await wait(6000);
  const stillShown = squash(await page.evaluate((s) => [...document.querySelectorAll(s)].map((b) => b.parentElement?.textContent ?? "").join(" | "), TOAST_ITEMS));
  ok(`${vp.name} · stamped ahead · the refusal stays on screen until it is dismissed (still there after 6 s)`, stillShown.includes(CLEAR_FIRST_TITLE), stillShown.slice(0, 160));
  await dismissToasts(page);
  await dropRow(KEY);

  // An opening that lands BEHIND a loaded page (the card read the switch off): Switch on… is refused "switched on since
  // this page loaded" over the writer's own sentence — the title never repeats it — theirs stays untouched, nothing is
  // recorded, and the card re-reads the switch as on.
  await openSystem(page);
  const theirs = { enabledBy: "usr_somebody", enabledAt: iso(Date.now() - 60_000), closesAt: iso(Date.now() + 3600_000) };
  await setRow(KEY, theirs);
  const openingBehind = await auditCount("marketing.live_switch_opening");
  await page.locator(S.on).click();
  await page.waitForSelector('[data-live-switch-dialog="on"]', { timeout: 15000 });
  await page.locator(DLG).getByRole("button", { name: "Switch on", exact: true }).click();
  const tBehind = await toastText(page, ALREADY_ON);
  const stillTheirs = await rowOf(KEY);
  ok(`${vp.name} · opened behind the page · refused under "${ON_SINCE_TITLE}" over the writer's sentence, said once; theirs untouched, nothing recorded`,
    tBehind.includes(ON_SINCE_TITLE) && tBehind.includes(ALREADY_ON) && tBehind.split("already on").length === 2
      && stillTheirs?.enabledBy === "usr_somebody" && stillTheirs?.closesAt === theirs.closesAt
      && (await auditCount("marketing.live_switch_opening")) === openingBehind,
    `${tBehind} · ${JSON.stringify(stillTheirs)}`);
  await page.waitForFunction((s) => (document.querySelector(s)?.textContent ?? "").startsWith("On until "), S.state, { timeout: 20000 }).catch(() => {});
  ok(`${vp.name} · opened behind the page · the card re-reads the switch as on`, (await textOf(page, S.state)).startsWith(ON_PREFIX), await textOf(page, S.state));
  await stateShot(page, vp.name, "opened-behind-refused", ON_PREFIX, S.card);
  await dismissToasts(page);
  await dropRow(KEY);

  /* ── THE MARKETING SMS TAB ── */
  await openSystem(page, "marketing-sms");
  await page.waitForSelector(S.form, { timeout: 60000 });
  ok(`${vp.name} · settings · the defaults note, Save off with its reason`, (await mainText(page)).includes(DEFAULTS_NOTE) && (await isDisabled(page, S.save)) === true && (await textOf(page, S.saveReason)) === IDLE,
    `${await textOf(page, S.saveReason)}`);
  await stateShot(page, vp.name, "settings-defaults", DEFAULTS_NOTE, S.form);
  await fitCheck(page, vp.name, "settings-defaults");
  // On a phone the form runs past one screen: its window row and its Save row get tiles of their own.
  if (vp.width < 640) {
    await tileOn(page, vp.name, "settings-defaults-window", '[data-field="windowStartMinute"]');
    await tileOn(page, vp.name, "settings-defaults-save", S.save);
  }

  // Every refusal at once, each under its own box.
  const box = (field) => page.locator(`[data-field="${field}"] input`).first();
  const pickTime = async (field, label) => {
    await page.locator(`[data-field="${field}"] [role="combobox"]`).first().click();
    await page.getByRole("option", { name: label, exact: true }).click();
    await wait(150);
  };
  await box("pricePerSegmentTzs").fill("0.999");
  await box("codesReserveTzs").fill("10");
  await box("campaignLimitTzs").fill("50");
  await pickTime("windowStartMinute", "19:00");
  await pickTime("windowEndMinute", "20:00");
  await wait(300);
  const t = await mainText(page);
  const wanted = [REFUSALS.price, RESERVE_PREFIX, REFUSALS.limit, REFUSALS.length];
  ok(`${vp.name} · settings · every problem at once, Save off with "${FIX}"`, wanted.every((s) => t.includes(s)) && (await textOf(page, S.saveReason)) === FIX,
    wanted.filter((s) => !t.includes(s)).join(" | "));
  await stateShot(page, vp.name, "settings-refusals", REFUSALS.length, S.form);
  if (vp.width < 640) {
    await tileOn(page, vp.name, "settings-refusals-window", '[data-field="windowStartMinute"]');
    await tileOn(page, vp.name, "settings-refusals-save", S.save);
  }

  // "6.0" is the price 6: not a change.
  await box("pricePerSegmentTzs").fill("6.0");
  await box("codesReserveTzs").fill("20000");
  await box("campaignLimitTzs").fill("10000");
  await pickTime("windowStartMinute", "08:00");
  await pickTime("windowEndMinute", "20:00");
  await wait(300);
  ok(`${vp.name} · settings · the same numbers typed differently are not a change`, (await isDisabled(page, S.save)) === true && (await textOf(page, S.saveReason)) === IDLE);

  // A save, read back in SQL; the card's limits line follows it.
  await box("pricePerSegmentTzs").fill("7.50");
  await box("codesReserveTzs").fill("25000");
  await box("campaignLimitTzs").fill("12000");
  await pickTime("windowStartMinute", "08:30");
  await pickTime("windowEndMinute", "19:00");
  await page.locator(S.save).click();
  const tSaved = await toastText(page, SAVED);
  ok(`${vp.name} · settings · saved`, tSaved.includes(SAVED), tSaved);
  await dismissToasts(page);
  const srow = await rowOf(SKEY);
  ok(`${vp.name} · settings · the record in SQL is exactly what was saved`, srow?.v === 1 && srow.pricePerSegmentTzs === 7.5 && srow.codesReserveTzs === 25000
    && srow.campaignLimitTzs === 12000 && srow.windowStartMinute === 510 && srow.windowEndMinute === 1140, JSON.stringify(srow));
  await openSystem(page, "marketing-sms");
  ok(`${vp.name} · settings · the card's limits line follows the save`, (await textOf(page, S.limits)).startsWith("TZS 7.50 per SMS · TZS 25,000 kept for login and withdrawal codes · at most TZS 12,000 per campaign · sends 08:30–19:00 EAT"),
    await textOf(page, S.limits));
  await stateShot(page, vp.name, "settings-saved", "TZS 7.50 per SMS", S.card);

  // A STALE save: a second page saves first (proved in SQL); this one is refused and writes nothing.
  const second = await ctx.newPage();
  second.on("dialog", (d) => { d.accept().catch(() => {}); });
  watchErrors(second, "ADMIN (second page)");
  await openSystem(second, "marketing-sms");
  await second.waitForSelector(S.form, { timeout: 60000 });
  await second.locator('[data-field="campaignLimitTzs"] input').first().fill("13000");
  await second.locator(S.save).click();
  await toastText(second, SAVED);
  for (let k = 0; k < 40 && (await rowOf(SKEY))?.campaignLimitTzs !== 13000; k++) await wait(250);
  await box("pricePerSegmentTzs").fill("8");
  await page.locator(S.save).click();
  const tStale = await toastText(page, STALE);
  const afterStale = await rowOf(SKEY);
  ok(`${vp.name} · settings · a stale save is refused and writes nothing`, tStale.includes(STALE) && afterStale?.pricePerSegmentTzs === 7.5 && afterStale?.campaignLimitTzs === 13000,
    `${tStale} · ${JSON.stringify(afterStale)}`);
  // (A box's hint, not its label: labels are set in capitals, and innerText reads them that way.)
  await stateShot(page, vp.name, "settings-stale-refused", "Used to estimate a campaign's cost", S.form);
  await dismissToasts(page);
  await second.close();

  // A HALF-READ record: no values, every save refused, the card's line says so.
  await setRow(SKEY, { v: 1, pricePerSegmentTzs: "x", codesReserveTzs: 20000, campaignLimitTzs: 10000, windowStartMinute: 480, windowEndMinute: 1200 });
  await openSystem(page, "marketing-sms");
  const half = squash(await page.evaluate(() => document.querySelector("[data-sms-settings]")?.innerText ?? ""));
  ok(`${vp.name} · half-read · the tab says it could not be read, shows no value, offers no form`,
    (await has(page, S.readOnly)) && !(await has(page, S.form)) && half.includes(UNREADABLE_NOTE) && !half.includes("TZS") && !half.includes("EAT"), half.slice(0, 220));
  ok(`${vp.name} · half-read · the card's limits line says it too`, (await textOf(page, S.limits)) === LIMITS_HALF, await textOf(page, S.limits));
  await stateShot(page, vp.name, "settings-half-read", UNREADABLE_NOTE, S.readOnly);
  await dropRow(SKEY);
  await ctx.close();
}

/* ══ REDUCED MOTION, 360 ═════════════════════════════════════════════════════════════════════════════════════════════ */
{
  console.log("\n── OWNER at 360, reduced motion ──");
  const { ctx, page } = await staffCtx("ADMIN", { width: 360, height: 780 }, "reduce", 2);
  await openSystem(page);
  await stateShot(page, "360-reduced", "off-absent", OFF_ABSENT, S.card);
  await page.locator(S.on).click();
  await page.waitForSelector('[data-live-switch-dialog="on"]', { timeout: 15000 });
  await stateShot(page, "360-reduced", "switch-on-dialog", ON_TITLE, null, DLG);
  await ctx.close();
}

/* ══ THE VIEWERS ═════════════════════════════════════════════════════════════════════════════════════════════════════ */
for (const vp of VPS) {
  for (const role of ["GROWTH", "COMPLIANCE"]) {
    console.log(`\n── ${role} at ${vp.name} ──`);
    const { ctx, page } = await staffCtx(role, { width: vp.width, height: vp.height }, "no-preference", 4);
    await openSystem(page);
    const cardText = squash(await page.evaluate(() => document.querySelector("[data-live-switch]")?.innerText ?? ""));
    if (role === "GROWTH") {
      ok(`${vp.name} · ${role} · the limits line names the window only — no TZS anywhere in the card`, (await textOf(page, S.limits)) === LIMITS_HIDDEN && !cardText.includes("TZS"), cardText.slice(0, 220));
    } else {
      ok(`${vp.name} · ${role} · the limits line in money, said for a viewer`, (await textOf(page, S.limits)).startsWith("TZS 6 per SMS") && (await textOf(page, S.limits)).endsWith("they are set on the Marketing SMS tab."), await textOf(page, S.limits));
    }
    ok(`${vp.name} · ${role} · Switch on… disabled WITH the reason beside it and in its title`,
      (await has(page, S.on)) && (await isDisabled(page, S.on)) === true && (await attr(page, S.on, "title")) === NOT_OWNER && (await textOf(page, S.reason)) === NOT_OWNER,
      `${await isDisabled(page, S.on)} · ${await attr(page, S.on, "title")} · ${await textOf(page, S.reason)}`);
    await stateShot(page, `${vp.name}-${role.toLowerCase()}`, "card", OFF_ABSENT, S.card);
    await fitCheck(page, `${vp.name}-${role.toLowerCase()}`, "card");
    await openSystem(page, "marketing-sms");
    const tabText = squash(await page.evaluate(() => document.querySelector("[data-sms-settings]")?.innerText ?? ""));
    if (role === "GROWTH") {
      ok(`${vp.name} · ${role} · the tab as text: who may change it, the window, no TZS, the sentence why`,
        (await has(page, S.readOnly)) && tabText.includes(NOT_OWNER_NOTE) && tabText.includes("08:00–20:00 EAT") && !tabText.includes("TZS") && tabText.includes(MONEY_HIDDEN), tabText.slice(0, 260));
    } else {
      ok(`${vp.name} · ${role} · the tab as text with the money, and who may change it`, (await has(page, S.readOnly)) && tabText.includes("TZS 6") && tabText.includes(NOT_OWNER_NOTE), tabText.slice(0, 260));
    }
    await stateShot(page, `${vp.name}-${role.toLowerCase()}`, "settings", NOT_OWNER_NOTE, S.readOnly);
    await ctx.close();
  }
}

/* ══ LOADING — the page's own ghost, reached from another admin page with the System chunks held ══════════════════════ */
const measured = {};
for (const vp of VPS) {
  console.log(`\n── LOADING at ${vp.name} ──`);
  const { ctx, page } = await staffCtx("ADMIN", { width: vp.width, height: vp.height }, "no-preference", 5);
  await page.goto(BASE + "/admin", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main#main-content h1", { timeout: 120000 });
  await wait(1500);
  let release = () => {};
  const gate = new Promise((r) => { release = r; });
  let held = 0;
  // The PAGE's chunk only: the section's layout chunk (`src_app_admin_system_layout_tsx`) wraps the loading boundary, and
  // holding it would hold the ghost too (measured: a navigation /admin → /admin/system fetches exactly these two).
  const HOLD = (url) => /src_app_admin_system_page_tsx/.test(url.href);
  // ⭐ HOLD THE RESPONSE, NEVER THE REQUEST: fetched at once, handed over when the ghost has been measured.
  const holder = async (route) => {
    held++;
    const response = await route.fetch().catch(() => null);
    await gate;
    if (response) await route.fulfill({ response }).catch(() => {});
    else await route.continue().catch(() => {});
  };
  await page.route(HOLD, holder);
  if (vp.width >= 1024) {
    await page.locator('aside a[href="/admin/system"]').first().click();
  } else {
    await page.locator('button[aria-label="Open admin navigation"]').first().click();
    await page.locator('[role="dialog"][aria-label="Admin navigation"] a[href="/admin/system"]').first().click();
  }
  await page.waitForSelector('[data-ghost="marketing-sms-card"]', { timeout: 90000 }).catch(() => {});
  const ghostCard = await panelBox(page, '[data-ghost="marketing-sms-card"]');
  const ghostRail = await panelBox(page, '[data-ghost="system-rail"]');
  const realYet = await has(page, S.card);
  ok(`${vp.name} · LOADING · the page's own ghost is up — the card's ghost among it — and the card is not yet (chunks held: ${held})`,
    ghostCard !== null && ghostRail !== null && ghostCard.top < ghostRail.top && !realYet, JSON.stringify({ ghostCard, ghostRail, realYet, held }));
  // At 1280 the card's ghost is in the first screen; on a phone the capture frames it.
  await shoot(page, `${vp.name}-loading`, vp.width < 640 ? '[data-ghost="marketing-sms-card"]' : null);
  release();
  await page.waitForSelector(S.card, { timeout: 90000 }).catch(() => {});
  await page.unroute(HOLD, holder).catch(() => {});
  await wait(900);
  const card = await panelBox(page, S.card);
  const rail = await panelBox(page, S.rail);
  measured[vp.name] = { ghostCard, card, ghostRail, rail };
  // ⭐ What this unit owns is the CARD's ghost: equal height by construction (spec §4.3 Files), at both widths.
  ok(`${vp.name} · LOADING · the card's ghost is the card's height (within 2px)`,
    ghostCard !== null && card !== null && Math.abs(ghostCard.h - card.h) <= 2, `${ghostCard?.h} vs ${card?.h}`);
  // ⚠️ RECORDED, NOT ASSERTED: the ghosts ABOVE the card (the KPI row, Maintenance mode) and between it and the rail (Bet
  // queue, Settlement) predate this unit and do not match today's page — their heights depend on what the tiles hold (the SMS
  // credit tile's provenance and note lines, which differ on a dev box). The plan records the shift as owed.
  console.log(`  · RECORDED · ${vp.name} · top edge: card ${ghostCard?.top} → ${card?.top} (the ghosts above it), rail ${ghostRail?.top} → ${rail?.top}`);
  await ctx.close();
}
console.log(`\n  · RECORDED · ${JSON.stringify(measured)}`);

ok("no page threw an uncaught exception in the browser, at any width or role", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));

await browser.close();
await sql.end();
console.log(`\nPASS=${pass} FAIL=${fail} · shots in ${SHOTS}`);
process.exit(fail === 0 ? 0 : 1);
