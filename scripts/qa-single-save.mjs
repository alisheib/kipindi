/**
 * qa:single-save — ONE SAVE ON SCREEN, AND A "SAVED" THAT TELLS THE TRUTH, DRIVEN IN A REAL BROWSER.
 *                                                                              (2026-09-26 · Part A)
 *
 *   SESSION_SECRET=… OTP_PEPPER=… DISABLE_ADMIN_TOTP=true npx next dev -p 3031
 *   KP_BASE=http://localhost:3031 npm run qa:single-save
 *   ONLY=bonuses,staff W=390 …     a subset of the keys below, and/or one width
 *
 * ── WHY IT EXISTS ────────────────────────────────────────────────────────────────────────────────────────────
 * The owner, twice. 2026-09-22: *"we have 2 save buttons, one pending changes and one always there, I don't know
 * when should both be visible"*. 2026-09-26: *"when I change something the pending-changes bar appears but I also
 * have a Save button; users are confused whether the save worked or not."* Behind that: the bar's on-screen test
 * counted ONE PIXEL of the form's Save as "on screen", and counted a Save hidden BEHIND the bar as on screen too;
 * fourteen bars either had no anchor or offered a record's decision as a Save; and a landed save said nothing
 * in the bar at all. `test:single-save` reads the source. This reads the SCREEN, because every one of those
 * defects lives between a real scroll position and a real React tree, where no source read can reach.
 *
 * ── WHAT EVERY SAVE TARGET IS MEASURED ON, AT 1440×900 AND AT 390×844 ────────────────────────────────────────
 *   A1  a clean page draws no bar
 *   A2  an edit raises the bar in its dirty state, announced (role=status, aria-live=polite)
 *   A3  the form's Save centred → exactly one Save on screen, and it is the form's
 *   A4  the form's Save scrolled away → exactly one, the bar's, in the form's own words
 *   A5  the form's Save 10px above the bottom edge — BEHIND the bar → the bar offers its Save
 *   A6  the form's Save half on screen → the bar offers its Save
 *   A7  the form's Save is disabled while nothing has changed (the poll Edit form's is not: re-validate is a
 *       real action, so that one is asserted ENABLED)
 *   A8  a save — the form's button at 1440, the bar's at 390 — turns the bar to Saved with no buttons, it goes by
 *       itself, a success toast says so and nothing says "Couldn't"
 *   A9  under reduced motion the bar does not animate
 * then the four DECISION bars (Discard only, never a Save) and the Select probe (a pick alone must raise the bar).
 *
 * ⛔ SKIP IS NEVER PASS. A check whose precondition is missing — no poll waiting in review, a page too short to
 * scroll the Save away, the two-officer ceremony switched off — prints SKIP with its reason, is counted apart
 * and is listed again at the end under "not proven by this run". A green line here always measured something.
 *
 * ⛔ A FAILED CHECK MUST NOT END THE RUN (the rule `qa:desk-rules-flow` learned): every step is soft, and the
 * reason a step could not run is printed at the end rather than swallowed.
 *
 * ⛔ LOCAL ONLY, AND BY THE NAME `localhost`. It saves configuration, promotes a seeded player to staff, adds an
 * event and creates an invite campaign. ⚠️ `127.0.0.1` is refused too: Next 16 blocks cross-origin dev resources
 * there, the page NEVER HYDRATES, every control is inert and nothing throws — measured on this repo before.
 *
 * ⚠️ IT WAITS FOR HYDRATION, NOT FOR A CLOCK. Each form's field must carry React's own fiber key before the drive
 * touches it; a page that never hydrates is reported ONCE as that, instead of as twenty product failures.
 */
import { chromium, request as pwRequest } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.KP_BASE ?? "http://localhost:3031";
if (!/^http:\/\/localhost(:\d+)?$/.test(BASE)) {
  console.error(`REFUSED — local dev only, addressed as http://localhost:PORT. KP_BASE was ${JSON.stringify(BASE)}.`);
  console.error("  (127.0.0.1 is refused as well: Next 16 blocks dev resources there and the page never hydrates.)");
  process.exit(2);
}
const SHOTS = process.env.KP_SHOTS ?? ".qa-single-save";
const ONLY = new Set((process.env.ONLY ?? "").split(",").map((s) => s.trim()).filter(Boolean));
const WIDTHS = [{ w: 1440, h: 900 }, { w: 390, h: 844 }].filter((v) => !process.env.W || Number(process.env.W) === v.w);
/** The player the staff form promotes. Re-seeded as a PLAYER before each width, so the promotion is real every time. */
const STAFF_PHONE = "+255710009390";
/** The kit shows Saved for 2.5 s; the drive allows 4 s before calling it stuck. */
const SAVED_GONE_MS = 4_000;
const DANGER = /couldn['’]t|could not|failed/i;
mkdirSync(SHOTS, { recursive: true });

// ── reporting ────────────────────────────────────────────────────────────────────────────────────────────────
let passN = 0;
const fails = [];
const skips = [];
let where = "setup";
const ok = (id, name, pass, detail = "") => {
  if (pass) passN++;
  else fails.push(`${where} · ${id} ${name}${detail ? ` — ${detail}` : ""}`);
  console.log(`  ${pass ? "PASS" : "FAIL"} ${id} ${name}${pass || !detail ? "" : ` — ${detail}`}`);
};
const skip = (id, name, why) => {
  skips.push(`${where} · ${id} ${name} — ${why}`);
  console.log(`  SKIP ${id} ${name} — ${why}`);
};
const note = (text) => console.log(`  note ${text}`);

// ── the browser ──────────────────────────────────────────────────────────────────────────────────────────────
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(30_000);
page.setDefaultNavigationTimeout(120_000);

/** ⛔ A console error is a failure of its own — a drive that ignores them measures half the page. */
const consoleErrors = [];
page.on("console", (m) => {
  const t = m.text();
  if (m.type() === "error" && !/webpack-hmr|Download the React DevTools/.test(t)) consoleErrors.push(`${where} · ${t.slice(0, 220)}`);
});
page.on("pageerror", (e) => consoleErrors.push(`${where} · pageerror: ${String(e).slice(0, 220)}`));
/* The unload guard is the product's; a drive that navigates on must be able to answer it. */
page.on("dialog", (d) => { (d.type() === "beforeunload" ? d.accept() : d.dismiss()).catch(() => {}); });

const softFailures = [];
const soft = async (what, fn, fallback = undefined) => {
  try { return await fn(); } catch (e) { softFailures.push(`${where} · ${what}: ${String(e).split("\n")[0].slice(0, 160)}`); return fallback; }
};
const post = (path, data = {}) => page.request.post(`${BASE}${path}`, { data, timeout: 180_000 });
const settle = (ms = 700) => page.waitForTimeout(ms);
const shot = (name) => soft(`shot ${name}`, () => page.screenshot({ path: `${SHOTS}/${name}.png` }));

// ── values the drive types ───────────────────────────────────────────────────────────────────────────────────
/** A number moved by one, alternating parity, so repeated runs stay within one of where they started. */
const flipNumber = (orig) => {
  const n = Number(String(orig).replace(/[^\d.]/g, "")) || 0;
  const next = n % 2 === 0 ? n + 1 : n - 1;
  return String(next < 1 ? n + 1 : next);
};
const QA_MARK = " (qa)";
const flipText = (seed) => (orig) => (orig.endsWith(QA_MARK) ? orig.slice(0, -QA_MARK.length) : `${orig || seed}${QA_MARK}`);

// ── in-page reads (each one is serialised into the page, so each carries its own helpers) ─────────────────────
/** The bar, as a person and a screen reader meet it. `host` is the announced element; the state sits on it. */
function barInPage() {
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  const all = [...document.querySelectorAll("[data-pending-state]")];
  const legacy = document.querySelectorAll('.kp-rail.fixed[role="status"]').length;
  const el = all[0];
  if (!el) return { count: 0, legacy, state: null, buttons: [], text: "" };
  const host = el.matches('[role="status"]') ? el : (el.closest('[role="status"]') ?? el);
  const r = host.getBoundingClientRect();
  const buttons = [...el.querySelectorAll("button")]
    .filter((b) => b.getBoundingClientRect().width > 0)
    .map((b) => ({ text: norm(b.innerText), busy: b.getAttribute("aria-busy") === "true" }));
  return {
    count: all.length, legacy, state: el.getAttribute("data-pending-state"),
    role: host.getAttribute("role"), live: host.getAttribute("aria-live"),
    top: Math.round(r.top), height: Math.round(r.height), text: norm(host.innerText),
    buttons, anim: getComputedStyle(host).animationName,
  };
}

/**
 * Which Saves a person can SEE. The form's counts only when ≥75% of it is inside the window AND above the bar —
 * a button behind a fixed bar is on the screen and out of reach, which is the whole of the second defect.
 */
function savesInPage(key) {
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  const vh = window.innerHeight;
  const bar = document.querySelector("[data-pending-state]");
  const barTop = bar ? bar.getBoundingClientRect().top : vh;
  const save = document.querySelector(`[data-qa-save="${key}"]`);
  let form = null;
  if (save) {
    const r = save.getBoundingClientRect();
    const top = Math.max(r.top, 0);
    const bottom = Math.min(r.bottom, barTop, vh);
    const ratio = r.height > 0 ? Math.max(0, bottom - top) / r.height : 0;
    form = {
      text: norm(save.innerText), top: Math.round(r.top), bottom: Math.round(r.bottom), ratio: Math.round(ratio * 100) / 100,
      visible: ratio >= 0.75 && r.width > 0, disabled: save.disabled,
    };
  }
  const barSaves = bar
    ? [...bar.querySelectorAll("button")]
      .filter((b) => b.getBoundingClientRect().width > 0 && !/^discard/i.test(norm(b.innerText)))
      .map((b) => norm(b.innerText))
    : [];
  return { form, barSaves, barTop: Math.round(barTop), vh };
}

/**
 * Find the target's field and the form's OWN Save, and mark both. The Save is the button with the form's words
 * in the NEAREST ancestor of the field that holds one — never inside the bar, which is portalled to <body>.
 */
function tagInPage({ key, field, fieldAfterText, labels }) {
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  document.querySelectorAll(`[data-qa-field="${key}"]`).forEach((e) => e.removeAttribute("data-qa-field"));
  document.querySelectorAll(`[data-qa-save="${key}"]`).forEach((e) => e.removeAttribute("data-qa-save"));
  let input = null;
  if (field) input = document.querySelector(field);
  else if (fieldAfterText) {
    const lbl = [...document.querySelectorAll("main span, main div, main p, main label")]
      .find((e) => e.childElementCount === 0 && norm(e.textContent) === fieldAfterText);
    if (lbl) {
      input = [...document.querySelectorAll("main input:not([type=hidden]), main textarea, main [role=combobox]")]
        .find((i) => lbl.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_FOLLOWING) ?? null;
    }
  }
  if (!input) return { field: false, save: false };
  input.setAttribute("data-qa-field", key);
  let box = input.parentElement;
  let save = null;
  while (box && box !== document.body && !save) {
    save = [...box.querySelectorAll("button")].find((b) => !b.closest("[data-pending-state]") && labels.includes(norm(b.innerText))) ?? null;
    box = box.parentElement;
  }
  if (save) save.setAttribute("data-qa-save", key);
  return { field: true, save: !!save, saveText: save ? norm(save.innerText) : null };
}

/** Scroll so the form's Save sits where a check needs it. Reports whether the page could put it there. */
function placeInPage([key, spot]) {
  const el = document.querySelector(`[data-qa-save="${key}"]`);
  if (!el) return null;
  const vh = window.innerHeight;
  const bar = document.querySelector("[data-pending-state]");
  const barTop = bar ? bar.getBoundingClientRect().top : vh;
  const r0 = el.getBoundingClientRect();
  const want = spot === "centre" ? (vh - r0.height) / 2
    : spot === "behind-bar" ? vh - 10 - r0.height
      : spot === "half-top" ? -r0.height / 2
        : barTop - r0.height / 2; // "half-bar"
  window.scrollBy({ top: r0.top - want, behavior: "instant" });
  const r = el.getBoundingClientRect();
  return { achieved: Math.abs(r.top - want) <= 3, top: Math.round(r.top), want: Math.round(want), vh, barTop: Math.round(barTop) };
}

/** Scroll the form's Save wholly out of the window, from either end. Null when the page cannot. */
function awayInPage(key) {
  const el = document.querySelector(`[data-qa-save="${key}"]`);
  if (!el) return null;
  const vh = window.innerHeight;
  const off = () => { const r = el.getBoundingClientRect(); return r.bottom <= 0 || r.top >= vh; };
  window.scrollTo({ top: 0, behavior: "instant" });
  if (off()) return "top of the page";
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
  if (off()) return "foot of the page";
  return null;
}

/** One sample of everything the save watch needs: the bar, whether a save is in flight, the toasts, the dialogs. */
function loopInPage(key) {
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  const el = document.querySelector("[data-pending-state]");
  const host = el ? (el.matches('[role="status"]') ? el : (el.closest('[role="status"]') ?? el)) : null;
  const busy = (b) => !!b && (b.getAttribute("aria-busy") === "true" || /…$/.test(norm(b.innerText)));
  const save = document.querySelector(`[data-qa-save="${key}"]`);
  const barButtons = el ? [...el.querySelectorAll("button")].filter((b) => b.getBoundingClientRect().width > 0) : [];
  const toasts = [...document.querySelectorAll('[role="region"]')]
    .filter((r) => getComputedStyle(r).position === "fixed")
    .flatMap((r) => [...r.querySelectorAll('[role="status"], [role="alert"]')])
    .map((e) => norm(e.innerText)).filter(Boolean);
  const dialogs = [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].map((d) => norm(d.innerText).slice(0, 240)).filter(Boolean);
  return {
    state: el ? el.getAttribute("data-pending-state") : null,
    role: host ? host.getAttribute("role") : null, live: host ? host.getAttribute("aria-live") : null,
    text: host ? norm(host.innerText) : "", buttons: barButtons.map((b) => norm(b.innerText)),
    inFlight: busy(save) || barButtons.some(busy), toasts, dialogs,
  };
}

/** A kit Select as its reader meets it: the words on the trigger and the value its hidden input would post. */
function selectInPage(sel) {
  const b = document.querySelector(sel);
  if (!b) return null;
  let hidden = b.nextElementSibling;
  while (hidden && !(hidden.tagName === "INPUT" && hidden.type === "hidden")) hidden = hidden.nextElementSibling;
  return { label: (b.innerText || "").replace(/\s+/g, " ").trim(), value: hidden ? hidden.value : null };
}

const readBar = () => page.evaluate(barInPage).catch(() => ({ count: 0, legacy: 0, state: null, buttons: [], text: "" }));
const readSaves = (key) => page.evaluate(savesInPage, key).catch(() => ({ form: null, barSaves: [], barTop: 0, vh: 0 }));
const describe = (s) => `form Save ${s.form ? `${Math.round(s.form.ratio * 100)}% reachable (top ${s.form.top}, bar at ${s.barTop})` : "not found"} · bar Saves ${JSON.stringify(s.barSaves)}`;
const barSave = () => page.locator("[data-pending-state] button").filter({ hasNotText: /^\s*Discard/i }).first();
const barDiscard = () => page.locator("[data-pending-state] button").filter({ hasText: /^\s*Discard/i }).first();
const formSave = (t) => page.locator(`[data-qa-save="${t.key}"]`);

/** ⚠️ React's own mark that it has taken this node over — the only honest "the page is live" signal. */
const hydrated = (sel) => page.waitForFunction((s) => {
  const el = document.querySelector(s);
  return !!el && Object.keys(el).some((k) => k.startsWith("__reactFiber") || k.startsWith("__reactProps"));
}, sel, { timeout: 60_000 }).then(() => true, () => false);

/** The states the bar passes through for `ms` — how a Discard is read, so a flash of Saved cannot slip past. */
const watchStates = async (ms) => {
  const seen = [];
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = (await readBar()).state;
    if (seen[seen.length - 1] !== s) seen.push(s);
    await page.waitForTimeout(100);
  }
  return seen;
};

async function pickOther(trigger) {
  await trigger.click({ timeout: 5000 });
  const opt = page.locator('[role="listbox"] [role="option"][aria-selected="false"]:not([aria-disabled="true"])').first();
  await opt.waitFor({ state: "visible", timeout: 5000 });
  const label = (await opt.innerText()).replace(/\s+/g, " ").trim();
  await opt.click({ timeout: 5000 });
  await settle(400);
  return label;
}

async function dirtyIt(t) {
  const loc = page.locator(`[data-qa-field="${t.key}"]`);
  if (t.dirty === "select") return { picked: await pickOther(loc) };
  const orig = await loc.inputValue();
  const next = t.dirty(orig);
  await loc.fill(next);
  return { orig, next };
}

const tagArg = (t) => ({ key: t.key, field: t.field ?? null, fieldAfterText: t.fieldAfterText ?? null, labels: t.labels });

/** Open the form if it lives in a panel, find it, and wait until React owns it. */
async function ready(t) {
  let r = await page.evaluate(tagInPage, tagArg(t)).catch(() => null);
  if ((!r || !r.field) && t.open) {
    const opened = await soft("open the panel", () => t.open(), false);
    if (!opened) return { none: true };
  }
  for (let i = 0; i < 30; i++) {
    r = await page.evaluate(tagInPage, tagArg(t)).catch(() => null);
    if (r && r.field && r.save) break;
    await page.waitForTimeout(1000);
  }
  if (!r || !r.field || !r.save) return { missing: true, r };
  return { ok: true, hydrated: await hydrated(`[data-qa-field="${t.key}"]`), label: r.saveText };
}

/** Leave nothing pending and nothing open, so the next page is met clean. */
async function tidy() {
  for (let i = 0; i < 3; i++) {
    if ((await page.locator('[role="dialog"], [role="alertdialog"]').count()) > 0) await page.keyboard.press("Escape").catch(() => {});
    if ((await readBar()).state === "dirty") await soft("tidy discard", () => barDiscard().click({ timeout: 3000 }));
    await settle(400);
  }
}

const openFirst = (name) => async () => {
  const b = page.locator("main").getByRole("button", { name }).first();
  if (!(await b.count())) return false;
  await page.evaluate(() => document.querySelectorAll("[data-qa-open]").forEach((e) => e.removeAttribute("data-qa-open")));
  await b.evaluate((el) => el.setAttribute("data-qa-open", "1"));
  await hydrated("[data-qa-open]");
  await b.click({ timeout: 5000 });
  await settle(600);
  return true;
};

// ── fixtures ─────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * ⚠️ THE PLAYER IS SEEDED THROUGH ITS OWN REQUEST CONTEXT. `seed-admin` signs in whoever it seeds, and through
 * `page.request` it would replace this drive's admin cookie with a player's — every page after it would refuse.
 */
const seedPlayer = async () => {
  const api = await pwRequest.newContext({ baseURL: BASE });
  try {
    const r = await api.post("/api/dev-test/seed-admin", { data: { phone: STAFF_PHONE, name: "Single-save Player", role: "PLAYER" }, timeout: 120_000 });
    return r.ok() && (await r.json()).ok === true;
  } catch { return false; } finally { await api.dispose(); }
};
let playerReady = false;

/** The events form refuses a source that is not on the registry for its category — these are the seeded defaults. */
const SOURCE_FOR = {
  sports: "https://nbc.co.tz/fixtures", macro: "https://bot.go.tz/statistics", weather: "https://meteo.go.tz/bulletins",
  crypto: "https://coingecko.com/en/coins/bitcoin", culture: "https://itv.co.tz/schedule", tech: "https://tcra.go.tz/news",
};
const pad2 = (n) => String(n).padStart(2, "0");
const inThirtyDays = () => {
  const d = new Date(Date.now() + 30 * 86_400_000);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T18:00`;
};

let marketId = null;

// ── the save targets ─────────────────────────────────────────────────────────────────────────────────────────
/**
 * `save`: "plain" (A8 in full) · "overlay" (the result is the admin result dialog, the panel closes with it) ·
 * "navigates" (the page moves to what was created) · "dialog-cancel" (both Saves must open the same confirm, then
 * Cancel) · null with `why` (not saved by this drive, said so on its own line — never a PASS and never a SKIP).
 */
const TARGETS = [
  {
    key: "bonuses", title: "Bonus settings", url: "/admin/bonuses?tab=settings",
    field: 'main input[aria-label="Expiry"]', labels: ["Save"], dirty: flipNumber, disabledWhenClean: true,
    save: "plain", saved: "Saved", toast: /Bonus config saved/,
  },
  {
    key: "poll-config", title: "AI poll settings", url: "/admin/ai-polls?tab=generate",
    fieldAfterText: "Daily target", labels: ["Save settings"], dirty: flipNumber, disabledWhenClean: true,
    save: "plain", saved: "Saved", toast: /Settings saved/,
  },
  {
    key: "poll-edit", title: "AI poll · Edit, in the review queue", url: "/admin/ai-polls?tab=queue",
    open: openFirst(/^Edit…$/), none: "no poll is waiting in the review queue (seed-ai-polls left none in review)",
    fieldAfterText: "Title (EN)", labels: ["Save & re-validate"], dirty: flipText("Single-save check"),
    disabledWhenClean: false, save: "overlay", result: /Poll updated/,
  },
  {
    key: "cycle", title: "AI cycle settings", url: "/admin/ai-usage?tab=settings",
    field: 'input[name="targetMarginPct"]', labels: ["Save settings"], dirty: flipNumber, disabledWhenClean: true,
    save: "dialog-cancel", dialog: "Save cycle settings?",
  },
  {
    key: "credit", title: "AI credit budget", url: "/admin/ai-usage?tab=settings",
    field: 'input[name="limitUsd"]', labels: ["Set limit"], dirty: flipNumber, disabledWhenClean: true,
    save: null, why: "the credit limit gates every AI call on this server; its bar, anchor and words are what is measured here",
  },
  {
    key: "ai-model", title: "AI model — the Select probe", url: "/admin/ai-usage?tab=settings",
    field: '[data-field="model"] [role="combobox"]', labels: ["Apply"], dirty: "select", disabledWhenClean: true,
    selectProbe: '[data-qa-field="ai-model"]',
    save: null, why: "applying a model changes which Claude model every AI call on this server uses",
  },
  {
    key: "announcement", title: "Site announcement", url: "/admin/system",
    field: 'main input[placeholder^="e.g. New markets are live"]', labels: ["Save", "Publish banner"],
    dirty: flipText("Single-save check"), disabledWhenClean: true,
    save: "plain", saved: "Saved", toast: /Banner (published|taken down)/,
  },
  {
    key: "support", title: "Support contact", url: "/admin/system",
    field: 'main form input[name="email"]', labels: ["Save · Hifadhi"], dirty: flipText("support@example.com"),
    disabledWhenClean: true,
    save: null, why: "the support contact is printed on public help, login and legal pages",
  },
  {
    key: "staff", title: "Add staff", url: "/admin/staff",
    prepare: async () => { playerReady = await seedPlayer(); },
    field: 'main input[name="phone"]', labels: ["Add as staff"], dirty: () => STAFF_PHONE, disabledWhenClean: true,
    selectProbe: 'form:has([data-qa-field="staff"]) [data-field="role"] [role="combobox"]',
    beforeSave: async () => {
      if (!playerReady) return "the player to promote could not be seeded (POST /api/dev-test/seed-admin as PLAYER)";
      await page.locator('form:has([data-qa-field="staff"]) input[name="reason"]').fill("Single-save drive: promote a seeded player");
      return null;
    },
    confirm: { title: /Make this account/, typed: "SUPPORT", button: "Add as staff" },
    save: "plain", saved: "Staff added", toast: /Staff added/,
  },
  {
    key: "events", title: "Add an event", url: "/admin/events",
    pre: async () => ((await page.locator("main").getByText("No usable category").count()) > 0
      ? "no category has an enabled trusted source, so the page draws no form" : null),
    field: 'main form input[name="title"]', labels: ["Add event"], dirty: flipText("Single-save drive event"),
    disabledWhenClean: true, selectProbe: 'form:has([data-qa-field="events"]) [role="combobox"]',
    beforeSave: async () => {
      const f = 'form:has([data-qa-field="events"])';
      const cat = await page.locator(`${f} input[type="hidden"][name="category"]`).inputValue().catch(() => "");
      if (!SOURCE_FOR[cat]) return `no seeded trusted source is known for the category "${cat}"`;
      await page.locator(`${f} input[name="startsAt"]`).fill(inThirtyDays());
      await page.locator(`${f} input[name="sourceUrl"]`).fill(SOURCE_FOR[cat]);
      return null;
    },
    save: "plain", saved: "Event added", toast: /Event added/,
  },
  {
    key: "invites", title: "Invite campaign", url: "/admin/invites",
    field: 'main input[aria-label="Campaign name"]', labels: ["Create campaign"], dirty: flipText("Single-save drive"),
    disabledWhenClean: true, save: "navigates", toast: /Campaign created/, lands: /^\/admin\/invites\/[^/]+$/,
  },
  {
    key: "proposals", title: "Proposals config", url: "/admin/proposals?tab=settings",
    fieldAfterText: "Rate limit", labels: ["Save config"], dirty: flipNumber, disabledWhenClean: true,
    save: "plain", saved: "Saved", toast: /Proposals config saved/,
  },
];

/**
 * ⭐ THE DECISION BARS. Rejecting a poll or a candidate, recording a Stage-1 attestation, recording a purge reason:
 * each is a DECISION about one record, not a save. A primary button in a window-wide bar would take it without
 * naming the record, so these bars warn and offer Discard — and nothing else.
 */
const DECISIONS = [
  {
    key: "poll-reject", title: "AI poll · Reject", url: "/admin/ai-polls?tab=queue", open: /^Reject…$/,
    none: "no poll is waiting in the review queue", field: 'textarea[placeholder^="Optional note for the audit log"]',
    labels: [{ re: /Rejection not recorded/i, names: /\bReject\b/ }],
  },
  {
    key: "candidate-reject", title: "Market candidate · Reject", url: "/admin/candidates", open: /^Reject…$/,
    none: "no candidate is waiting in review (seed-candidates left none)", field: 'textarea[placeholder^="Optional note for the audit log"]',
    labels: [{ re: /Rejection not recorded/i, names: /\bReject\b/ }],
  },
  {
    key: "resolution", title: "Resolution ceremony", url: () => (marketId ? `/admin/resolver/${marketId}` : null),
    none: "no market to open — seed-markets returned none",
    field: 'textarea[placeholder^="Paste the exact quote"]',
    labels: [
      { re: /Attestation not recorded/i, names: /Record Stage-1 attestation/, stage1: true },
      { re: /Verdict not sealed/i, notStage1: "two-officer authorisation is OFF on this server, so the stage-1 ceremony is not rendered — the single-admin bar was checked above instead" },
      { re: /Evidence not sealed/i, notStage1: "this market is already past stage 1 — the countersign bar was checked above instead" },
    ],
  },
  {
    key: "retention-purge", title: "Retention · purge a chain", url: "/admin/retention?tab=purge",
    none: "no archived chain is open for a first signature on this server", field: 'main input[placeholder^="e.g. chain retired"]',
    labels: [{ re: /Reason not recorded/i, names: /Record the reason/ }],
  },
];

// ── A8 · the save itself ─────────────────────────────────────────────────────────────────────────────────────
/**
 * ⛔ WATCH THE BAR, NEVER A FIXED DELAY. A save's first call on a dev server compiles its action and has been
 * measured past 20 s; a fixed wait reads it mid-flight. This samples every 100 ms until the dirty state ends, then
 * times Saved from THAT moment — the promise is "the bar turns to Saved as the save lands", and a gap in between
 * (the bar vanishing and coming back) is recorded as the defect it is.
 */
async function watchSave(t, w) {
  const t0 = Date.now();
  const out = { dirtyEnd: null, savedAt: null, goneAt: null, savedButtons: 0, savedText: "", savedRole: null, savedLive: null, toasts: new Set(), trail: [], stalled: false };
  let last = "dirty";
  let idleSince = null;
  let dangerAt = null;
  let shotTaken = false;
  while (Date.now() - t0 < 120_000) {
    const s = await page.evaluate(loopInPage, t.key).catch(() => null);
    const now = Date.now() - t0;
    if (s) {
      s.toasts.forEach((x) => out.toasts.add(x));
      if (s.state !== last) { out.trail.push(`${s.state ?? "gone"}@${now}ms`); last = s.state; }
      if (out.dirtyEnd === null && s.state !== "dirty") out.dirtyEnd = now;
      if (s.state === "saved") {
        if (out.savedAt === null) Object.assign(out, { savedAt: now, savedText: s.text, savedRole: s.role, savedLive: s.live });
        out.savedButtons = Math.max(out.savedButtons, s.buttons.length);
        if (!shotTaken) { shotTaken = true; await shot(`${t.key}-${w}-a8-saved`); }
      }
      if (out.dirtyEnd !== null && s.state === null) { out.goneAt = now; break; }
      if (out.dirtyEnd !== null && now - out.dirtyEnd > 6_000) break;
      if (s.state === "dirty" && !s.inFlight) {
        idleSince ??= now;
        if (s.toasts.some((x) => DANGER.test(x))) dangerAt ??= now;
        if ((dangerAt !== null && now - dangerAt > 1_000) || now - idleSince > 12_000) { out.stalled = true; break; }
      } else idleSince = null;
    }
    await page.waitForTimeout(100);
  }
  /* a deferred toast fires on the falling edge of `pending`; keep listening a moment after the bar has gone */
  for (let i = 0; i < 10; i++) {
    const s = await page.evaluate(loopInPage, t.key).catch(() => null);
    s?.toasts.forEach((x) => out.toasts.add(x));
    await page.waitForTimeout(150);
  }
  return out;
}

async function cycleDialogProbe(t, w) {
  const dlg = () => page.locator('[role="dialog"], [role="alertdialog"]').filter({ hasText: t.dialog }).last();
  const readDlg = async () => (await soft("read dialog", () => dlg().innerText({ timeout: 3000 }), "") ?? "").replace(/\s+/g, " ").trim();
  const cancel = async () => {
    await soft("cancel", () => dlg().getByRole("button", { name: "Cancel", exact: true }).click({ timeout: 5000 }));
    await settle(600);
  };
  await dirtyIt(t);
  await settle();
  await page.evaluate(placeInPage, [t.key, "centre"]);
  await settle();
  await soft("form save", () => formSave(t).click({ timeout: 5000 }));
  const formOpened = await dlg().waitFor({ state: "visible", timeout: 10_000 }).then(() => true, () => false);
  const formText = formOpened ? await readDlg() : "";
  ok("A8c.1", `the form's Save asks "${t.dialog}" first`, formOpened);
  if (formOpened) await cancel();
  ok("A8c.2", "…Cancel closes it and the work is still pending — nothing was saved",
    (await dlg().count()) === 0 && (await readBar()).state === "dirty", JSON.stringify((await readBar()).state));
  const away = await page.evaluate(awayInPage, t.key);
  await settle();
  if (!away || (await readSaves(t.key)).barSaves.length !== 1) {
    skip("A8c.3", "the bar's Save opens the same dialog", away ? "the bar drew no Save (see A4)" : "the form's Save never leaves the screen at this width, so the bar never offers one");
  } else {
    await soft("bar save", () => barSave().click({ timeout: 5000 }));
    const barOpened = await dlg().waitFor({ state: "visible", timeout: 10_000 }).then(() => true, () => false);
    const barText = barOpened ? await readDlg() : "";
    await shot(`${t.key}-${w}-a8c-bar-dialog`);
    ok("A8c.3", "the BAR's Save opens the SAME dialog, word for word — one path, one ceremony",
      barOpened && formOpened && barText === formText, barOpened ? barText.slice(0, 120) : "no dialog opened");
    if (barOpened) await cancel();
    ok("A8c.4", "…and Cancel leaves the bar dirty — the bar never saved past the confirm", (await readBar()).state === "dirty");
  }
  await soft("discard", () => barDiscard().click({ timeout: 5000 }));
  await settle();
}

async function saveFlow(t, w, wide) {
  if (!t.save) { note(`A8 — not saved by this drive: ${t.why}.`); return; }
  if (t.save === "dialog-cancel") { await cycleDialogProbe(t, w); return; }
  await dirtyIt(t);
  if (t.beforeSave) {
    const why = await soft("fill the rest of the form", () => t.beforeSave(), "the rest of the form could not be filled");
    if (why) { skip("A8", "the save", why); return; }
  }
  await settle(400);

  let via = "the form's Save";
  let clicked = false;
  const pressForm = async () => {
    await page.evaluate(placeInPage, [t.key, "centre"]);
    await settle();
    return soft("press the form's Save", () => formSave(t).click({ timeout: 5000 }).then(() => true), false);
  };
  if (wide) clicked = await pressForm();
  else {
    const away = await page.evaluate(awayInPage, t.key);
    await settle();
    if (away && (await readSaves(t.key)).barSaves.length === 1) {
      via = "the bar's Save";
      clicked = await soft("press the bar's Save", () => barSave().click({ timeout: 5000 }).then(() => true), false);
    } else {
      note(`A8 — the bar offers no Save here (${away ? "it drew none, see A4" : "the form's Save never leaves the screen"}), so the form's is pressed.`);
      clicked = await pressForm();
    }
  }
  if (!clicked) { ok("A8", `${via} can be pressed`, false); return; }

  if (t.confirm) {
    const dlg = page.locator('[role="alertdialog"], [role="dialog"]').filter({ hasText: t.confirm.title }).last();
    const opened = await dlg.waitFor({ state: "visible", timeout: 15_000 }).then(() => true, () => false);
    ok("A8.0", "the save asks first, as it always has", opened);
    if (!opened) return;
    if (t.confirm.typed) await soft("type the word", () => dlg.locator("input").first().fill(t.confirm.typed));
    await soft("confirm", () => dlg.getByRole("button", { name: t.confirm.button, exact: true }).click({ timeout: 5000 }));
  }

  if (t.save === "navigates") {
    const t0 = Date.now();
    const toasts = new Set();
    let movedAt = null;
    while (Date.now() - t0 < 120_000) {
      const s = await page.evaluate(loopInPage, t.key).catch(() => null);
      s?.toasts.forEach((x) => toasts.add(x));
      if (movedAt === null && t.lands.test(new URL(page.url()).pathname)) movedAt = Date.now();
      const list = [...toasts];
      if (list.some((x) => DANGER.test(x))) break;
      if (movedAt !== null && (list.some((x) => t.toast.test(x)) || Date.now() - movedAt > 10_000)) break;
      await page.waitForTimeout(150);
    }
    await settle(1200);
    const list = [...toasts];
    ok("A8.1", `${via} creates it and the page moves to what was created`, movedAt !== null, page.url());
    ok("A8.4", "a success toast says so, and nothing says Couldn't", list.some((x) => t.toast.test(x)) && !list.some((x) => DANGER.test(x)), JSON.stringify(list).slice(0, 200));
    const b = await readBar();
    ok("A8.5", "…and the page it lands on carries no pending bar", b.count === 0, b.state ?? "");
    await shot(`${t.key}-${w}-a8-landed`);
    return;
  }

  if (t.save === "overlay") {
    const t0 = Date.now();
    const toasts = new Set();
    let result = null;
    while (Date.now() - t0 < 120_000) {
      const s = await page.evaluate(loopInPage, t.key).catch(() => null);
      if (s) {
        s.toasts.forEach((x) => toasts.add(x));
        result = s.dialogs.find((x) => t.result.test(x) || DANGER.test(x)) ?? null;
        if (result) break;
        if (s.state === "dirty" && !s.inFlight && Date.now() - t0 > 12_000) break;
      }
      await page.waitForTimeout(150);
    }
    await shot(`${t.key}-${w}-a8-result`);
    const b = await readBar();
    ok("A8.1", `${via} saves, and the result says so`, !!result && t.result.test(result), result ?? "no result dialog — the panel refused (a date or translation rule), or nothing happened");
    ok("A8.2", "…the panel closed with the save, so no pending bar is left behind", b.state !== "dirty", b.state ?? "no bar");
    ok("A8.4", "nothing says Couldn't or failed", !DANGER.test(result ?? "") && ![...toasts].some((x) => DANGER.test(x)), (result ?? "").slice(0, 120));
    await soft("dismiss the result", () => page.getByRole("button", { name: /Done · Sawa|Dismiss · Funga/ }).first().click({ timeout: 4000 }));
    await settle(600);
    return;
  }

  const out = await watchSave(t, w);
  const trail = out.trail.join(" → ") || "no change";
  const toasts = [...out.toasts];
  const danger = toasts.filter((x) => DANGER.test(x));
  ok("A8.1", `${via} lands the save and the bar turns to Saved as it lands (≤ 2 s after the dirty state ends, no gap)`,
    out.dirtyEnd !== null && out.savedAt !== null && out.savedAt - out.dirtyEnd <= 2_000,
    `${trail}${out.stalled ? " · stalled: still dirty with nothing in flight" : ""}${danger.length ? ` · ${danger[0]}` : ""}`);
  ok("A8.2", `Saved reads "${t.saved}", is announced (role=status, polite), and carries no buttons`,
    out.savedAt !== null && out.savedText.toLowerCase().includes(t.saved.toLowerCase()) && out.savedButtons === 0
      && out.savedRole === "status" && out.savedLive === "polite",
    JSON.stringify({ text: out.savedText.slice(0, 80), buttons: out.savedButtons, role: out.savedRole, live: out.savedLive }));
  ok("A8.3", `…and it leaves by itself within ${SAVED_GONE_MS / 1000} s`,
    out.savedAt !== null && out.goneAt !== null && out.goneAt - out.savedAt <= SAVED_GONE_MS, trail);
  ok("A8.4", "a success toast says so, and nothing says Couldn't", toasts.some((x) => t.toast.test(x)) && danger.length === 0, JSON.stringify(toasts).slice(0, 200));
  if (t.disabledWhenClean) {
    await page.evaluate(tagInPage, tagArg(t)).catch(() => null);
    const s = await readSaves(t.key);
    ok("A8.5", "…and the form's Save is disabled again, because nothing is left to save", s.form?.disabled === true, JSON.stringify(s.form));
  }
}

// ── the Select probe ─────────────────────────────────────────────────────────────────────────────────────────
/**
 * ⛔ A PICK MUST REACH ITS FORM. The kit Select moved a hidden input by a React re-render alone, which raises no
 * event, so a Select-only change never raised the bar — and a Save disabled while clean could never have been
 * pressed for it. And Discard's `form.reset()` left the trigger showing the choice it had just thrown away.
 */
async function selectProbe(t, w) {
  const sel = t.selectProbe;
  const before = await page.evaluate(selectInPage, sel).catch(() => null);
  if (!before) { skip("S", "the Select probe", `no kit Select at ${sel}`); return; }
  const picked = await soft("pick another option", () => pickOther(page.locator(sel).first()), null);
  await settle();
  const mid = await page.evaluate(selectInPage, sel).catch(() => null);
  const b = await readBar();
  ok("S1", "a pick alone — nothing typed — raises the bar", b.state === "dirty", `picked ${JSON.stringify(picked)} · bar ${b.state ?? "absent"}`);
  /* an option row may carry more than the trigger repeats (a tick, a hint), so the words are compared by containment */
  const shows = !!mid && !!picked && !!mid.label && (picked.includes(mid.label) || mid.label.includes(picked));
  ok("S2", "…and the form would post the pick", shows && (before.value === null || mid.value !== before.value),
    JSON.stringify({ before, mid }));
  await shot(`${t.key}-${w}-select`);
  await soft("discard", () => barDiscard().click({ timeout: 5000 }));
  await settle();
  const after = await page.evaluate(selectInPage, sel).catch(() => null);
  const b2 = await readBar();
  ok("S3", "Discard puts the choice back — on the trigger AND in what the form would post — and the bar goes",
    !!after && after.label === before.label && after.value === before.value && b2.count === 0, JSON.stringify({ before, after, bar: b2.state }));
}

// ── one save target at one width ─────────────────────────────────────────────────────────────────────────────
async function runTarget(t, { w, h }) {
  where = `${t.key} @${w}`;
  /* the design's split: the form's own button is pressed on the desk, the bar's on the phone */
  const wide = w >= 1024;
  console.log(`\n── ${t.title} · ${t.url} @${w}×${h}`);
  await page.setViewportSize({ width: w, height: h });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  if (t.prepare) await soft("prepare", () => t.prepare());
  const loaded = await soft("load the page", () => page.goto(`${BASE}${t.url}`, { waitUntil: "load" }).then(() => true), false);
  if (!loaded) { ok("A0", "the page loads", false, "navigation failed — see the steps listed at the end"); return; }
  await settle(1500);
  if (t.pre) {
    const why = await soft("precondition", () => t.pre(), null);
    if (why) { skip("A1–A9", "every check on this form", why); return; }
  }
  const rd = await ready(t);
  if (rd.none) { skip("A1–A9", "every check on this form", t.none); return; }
  if (rd.missing) { ok("A0", "the form and its own Save are on the page", false, JSON.stringify(rd.r)); return; }
  if (!rd.hydrated) { ok("A0", "the page hydrates (an inert page would fail every check below for a reason that is not the product)", false); return; }
  const label = rd.label;

  // A1 · A7
  const b0 = await readBar();
  ok("A1", "a clean page draws no pending bar", b0.count === 0 && b0.legacy === 0, JSON.stringify({ state: b0.state, legacy: b0.legacy }));
  const s0 = await readSaves(t.key);
  if (t.disabledWhenClean) ok("A7", `the form's "${label}" is disabled while nothing has changed`, s0.form?.disabled === true, JSON.stringify(s0.form));
  else ok("A7", `the form's "${label}" stays ENABLED while clean — re-validating is a real action`, s0.form?.disabled === false, JSON.stringify(s0.form));

  // A2
  const d1 = await soft("dirty the form", () => dirtyIt(t), null);
  await settle();
  const b1 = await readBar();
  ok("A2", "the edit raises ONE bar, in its dirty state, announced (role=status, aria-live=polite)",
    b1.count === 1 && b1.state === "dirty" && b1.role === "status" && b1.live === "polite",
    JSON.stringify({ edit: d1, count: b1.count, state: b1.state, role: b1.role, live: b1.live }));
  const animNormal = b1.anim;
  if (t.disabledWhenClean) {
    const s1 = await readSaves(t.key);
    ok("A7b", "…and the form's Save is enabled once there is something to save (A7's control)", s1.form?.disabled === false, JSON.stringify(s1.form));
  }

  if (b1.state !== "dirty") {
    skip("A3–A6", "the one-Save geometry", "there is no bar to measure (A2 failed)");
  } else {
    // A3
    await page.evaluate(placeInPage, [t.key, "centre"]);
    await settle();
    const s3 = await readSaves(t.key);
    ok("A3", "the form's Save centred → exactly one Save on screen, and it is the form's",
      !!s3.form && s3.form.visible && s3.barSaves.length === 0, describe(s3));
    await shot(`${t.key}-${w}-a3-form-save`);

    // A4
    const away = await page.evaluate(awayInPage, t.key);
    await settle();
    if (!away) skip("A4", "the Save scrolled away", "the form's Save never leaves the screen at this width — the page is too short to scroll it off");
    else {
      const s4 = await readSaves(t.key);
      ok("A4", `scrolled to the ${away}, the form's Save out of view → exactly one Save, the bar's, in the form's own words`,
        !!s4.form && !s4.form.visible && s4.barSaves.length === 1 && s4.barSaves[0] === s4.form.text, `${describe(s4)} · form says ${JSON.stringify(s4.form?.text)}`);
      await shot(`${t.key}-${w}-a4-bar-save`);
    }

    // A5
    const p5 = await page.evaluate(placeInPage, [t.key, "behind-bar"]);
    await settle();
    if (!p5) skip("A5", "the Save behind the bar", "the form's Save is no longer on the page");
    else if (!p5.achieved) skip("A5", "the Save behind the bar", `the page cannot scroll it there (wanted top ${p5.want}px, it sits at ${p5.top}px) — it is too near the top of the document`);
    else {
      const s5 = await readSaves(t.key);
      ok("A5", "the form's Save 10px above the bottom edge — BEHIND the bar — is out of reach: the bar offers its Save",
        !!s5.form && !s5.form.visible && s5.barSaves.length === 1, describe(s5));
    }

    // A6 — from centred, so the move crosses the threshold whichever way the observer last fired
    await page.evaluate(placeInPage, [t.key, "centre"]);
    await settle();
    let p6 = await page.evaluate(placeInPage, [t.key, "half-top"]);
    let edge = "the window's top edge";
    if (!p6?.achieved) { p6 = await page.evaluate(placeInPage, [t.key, "half-bar"]); edge = "the bar's top edge"; }
    await settle();
    if (!p6?.achieved) skip("A6", "the Save half on screen", "the page cannot scroll it across either edge at this width");
    else {
      const s6 = await readSaves(t.key);
      ok("A6", `the form's Save half on screen (across ${edge}) is not "in reach": the bar offers its Save`,
        s6.barSaves.length === 1, describe(s6));
    }

    // A2d · Discard
    await soft("discard", () => barDiscard().click({ timeout: 5000 }));
    const trail = await watchStates(1500);
    ok("A2d", "Discard clears the bar at once and never claims Saved", !trail.includes("saved") && trail[trail.length - 1] === null, trail.join(" → "));
  }
  await tidy();

  // the Select probe
  if (t.selectProbe) {
    const r = await ready(t);
    if (r.ok) await selectProbe(t, w);
    else skip("S", "the Select probe", "the form could not be found again after Discard");
    await tidy();
  }

  // A9
  const r9 = await ready(t);
  if (!r9.ok) skip("A9", "reduced motion", "the form could not be found again after Discard");
  else {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await soft("dirty under reduced motion", () => dirtyIt(t));
    await settle();
    const b9 = await readBar();
    ok("A9", "under reduced motion the bar does not animate (animation-name none)", b9.state === "dirty" && b9.anim === "none", `animation-name ${b9.anim ?? "?"}`);
    ok("A9b", "…and without the preference it does, so A9 measured the preference and not a bar with no motion at all",
      !!animNormal && animNormal !== "none", `animation-name ${animNormal ?? "?"}`);
    await soft("discard", () => barDiscard().click({ timeout: 5000 }));
    await settle();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await tidy();
  }

  // A8
  const r8 = await ready(t);
  if (!r8.ok) { skip("A8", "the save", "the form could not be found again after Discard"); return; }
  await saveFlow(t, w, wide);
  await tidy();
}

// ── one decision bar at one width ────────────────────────────────────────────────────────────────────────────
async function decisionProbe(d, { w, h }) {
  where = `${d.key} @${w}`;
  const url = typeof d.url === "function" ? d.url() : d.url;
  console.log(`\n── ${d.title} · decision bar · ${url ?? "(no page)"} @${w}×${h}`);
  if (!url) { skip("D1–D4", "the decision bar", d.none); return; }
  await page.setViewportSize({ width: w, height: h });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const loaded = await soft("load the page", () => page.goto(`${BASE}${url}`, { waitUntil: "load" }).then(() => true), false);
  if (!loaded) { ok("D0", "the page loads", false); return; }
  await settle(1500);
  if (d.open) {
    const opened = await soft("open the panel", async () => {
      const b = page.locator("main").getByRole("button", { name: d.open }).first();
      if (!(await b.waitFor({ state: "visible", timeout: 20_000 }).then(() => true, () => false))) return false;
      return openFirst(d.open)();
    }, false);
    if (!opened) { skip("D1–D4", "the decision bar", d.none); return; }
  }
  const field = page.locator(d.field).first();
  if (!(await field.waitFor({ state: "visible", timeout: 20_000 }).then(() => true, () => false))) { skip("D1–D4", "the decision bar", d.none); return; }
  await field.evaluate((el) => el.setAttribute("data-qa-decision", "1"));
  if (!(await hydrated("[data-qa-decision]"))) { ok("D0", "the page hydrates", false); return; }
  ok("D0", "nothing is pending before the edit", (await readBar()).count === 0);
  await soft("type into the panel", () => field.fill("Single-save drive: a decision bar carries no Save."));
  await settle();
  const b = await readBar();
  const hit = d.labels.find((l) => l.re.test(b.text));
  ok("D1", "the edit raises the bar, dirty, under the decision's own label", b.state === "dirty" && !!hit, b.text.slice(0, 120));
  ok("D2", "the bar offers Discard and NOTHING else — the decision is taken in its panel, beside its record",
    b.buttons.length === 1 && /^Discard/i.test(b.buttons[0]?.text ?? ""), JSON.stringify(b.buttons.map((x) => x.text)));
  if (hit?.names) ok("D3", "…and it names the panel's own button, so the officer knows where the decision is taken", hit.names.test(b.text), b.text.slice(0, 180));
  if (hit?.notStage1) skip("D3", "the Stage-1 attestation bar", hit.notStage1);
  await shot(`${d.key}-${w}-decision`);
  await soft("discard", () => barDiscard().click({ timeout: 5000 }));
  const trail = await watchStates(1500);
  ok("D4", "Discard clears it and never claims Saved", !trail.includes("saved") && trail[trail.length - 1] === null, trail.join(" → "));
  await tidy();
}

// ── run ──────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("──────────────────────────────────────────────────────────────────────");
console.log("qa:single-save · one Save on screen, and a Saved that tells the truth");
console.log("──────────────────────────────────────────────────────────────────────");

const admin = await soft("seed the admin", async () => (await post("/api/dev-test/seed-admin", {})).json(), null);
ok("0.1", "an admin session is seeded (POST /api/dev-test/seed-admin)", admin?.ok === true, JSON.stringify(admin).slice(0, 160));
if (admin?.ok !== true) { await browser.close(); process.exit(1); }
/* ⚠️ THE THROTTLE IS REAL IN PRODUCTION and accumulates across local runs; cleared the way the other drives do it. */
await soft("reset rate limits", () => post("/api/dev-test/reset-rate-limits", {}));
/**
 * ⚠️ `seed-resolver-verdicts` IS NOT CALLED, deliberately. It stamps EVERY live unresolved market in the store as
 * CLOSED with an AI verdict — a wide change for a drive that needs one market page — and the ceremony renders for
 * any unsettled market anyway. `seed-markets` is idempotent and hands back live ids; the first one is enough.
 */
const seeded = {};
for (const name of ["seed-ai-polls", "seed-candidates", "seed-markets"]) {
  const r = await soft(name, () => post(`/api/dev-test/${name}`, {}), null);
  seeded[name] = r ? r.status() : "error";
  if (name === "seed-markets" && r?.ok()) marketId = (await r.json().catch(() => null))?.ids?.[0]?.id ?? null;
}
console.log(`  seeders · ${JSON.stringify(seeded)} · market for the ceremony ${marketId ?? "none"}`);

for (const t of TARGETS) {
  if (ONLY.size && !ONLY.has(t.key)) continue;
  for (const v of WIDTHS) {
    try { await runTarget(t, v); } catch (e) { ok("X", "the target ran to its end", false, String(e).split("\n")[0].slice(0, 200)); }
  }
}
for (const d of DECISIONS) {
  if (ONLY.size && !ONLY.has(d.key)) continue;
  for (const v of WIDTHS) {
    try { await decisionProbe(d, v); } catch (e) { ok("X", "the decision probe ran to its end", false, String(e).split("\n")[0].slice(0, 200)); }
  }
}

where = "whole run";
console.log("\n── the page itself");
ok("Z1", "no console or page error anywhere in the run", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));

/* ⛔ PRINTED LAST, so no later step can hide behind an earlier summary. */
if (softFailures.length) {
  console.log("\n⚠ steps that could not run, and the reason each gave:");
  for (const s of softFailures) console.log(`  · ${s}`);
}
if (consoleErrors.length > 3) {
  console.log("\n⚠ every console error:");
  for (const e of consoleErrors) console.log(`  · ${e}`);
}
if (skips.length) {
  console.log("\n⚠ SKIPPED — NOT PROVEN BY THIS RUN:");
  for (const s of skips) console.log(`  · ${s}`);
}
if (fails.length) {
  console.log("\n✗ FAILED:");
  for (const f of fails) console.log(`  · ${f}`);
}
console.log("\n──────────────────────────────────────────────────────────────────────");
console.log(`${passN} passed · ${fails.length} failed · ${skips.length} skipped · viewport tiles in ${SHOTS}`);
console.log("──────────────────────────────────────────────────────────────────────");
await browser.close();
process.exit(fails.length === 0 ? 0 : 1);
