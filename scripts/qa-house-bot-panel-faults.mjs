/**
 * qa:house-bot-panel-faults — the three states `qa:house-bot-panel-states` CANNOT reach, and the asymmetry
 * between the two activity panels, settled with a measurement instead of a sentence.
 *
 *   DATABASE_URL=postgresql://postgres:scratch@127.0.0.1:5433/<your own scratch db> \
 *   KP_BASE=http://127.0.0.1:3021 KP_ACTIVE_ID=<bot id> npm run qa:house-bot-panel-faults
 *
 * ── WHY IT EXISTS BESIDE THE STATES DRIVER ───────────────────────────────────────────────────────────────────
 * That driver addresses states through the URL, so every state it can reach is one a query string can ask for.
 * Three of the states these panels can reach are not addressable at all:
 *
 *   1. **A READ THAT FAILED.** Ruling 355 says a failed read paints `AdminLoadError` and 312 says a count that
 *      failed shows NO badge — a `CountBadge` renders nothing at zero, so a missing badge may never be the way a
 *      reader learns a count is unknown. Both halves are reachable only by breaking the database under the render.
 *      ⛔ It is broken the way a real outage breaks it — a relation the app may no longer SELECT — and NOT by
 *      dropping the table: `houseBotSchemaReady()` checks the table's EXISTENCE, so a dropped table lands on
 *      421's "not on this database" Callout, which is a DIFFERENT state and would have been photographed under
 *      this one's name. The view keeps the relation present and makes every SELECT on it raise.
 *   2. **THE CANCEL CEREMONY.** `Modal` returns null until it is mounted, so no static render and no URL reaches
 *      the dialog: it has to be OPENED. Ruling 415 fixes what it must then do — armed only inside the reason's
 *      own bounds, scrim-proof once anything is typed, its live count beside its basis.
 *   3. **THE CONTROL COLUMN, ON BOTH PANELS AT ONCE.** The landing feed offers a stop on every QUEUED row; the
 *      account page's feed offers none. Two tiles side by side show it and neither one alone does, so the
 *      comparison is COUNTED here — queued rows and stop controls, per panel — rather than left to the eye.
 *
 * ⛔ VIEWPORT TILES, NEVER `fullPage`, written under `KP_SHOTS` (default `.qa-house-bots/faults/`, gitignored by
 * the `.qa-` prefix rule). D19: this feature is never public and the repository is PUBLIC (W20) — the DRIVER is
 * committed so anyone can re-shoot; a tile never is.
 * ⛔ LOOPBACK ONLY, on the BASE and on the DATABASE, and it refuses either otherwise. It BREAKS a database on
 * purpose; pointed anywhere but a scratch cluster on this machine that is an outage somebody else is paged for.
 * ⛔ THE FAULT IS REMOVED IN A `finally`, and the removal is VERIFIED by a read that had to fail and then work.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import pg from "pg";

const BASE = process.env.KP_BASE ?? "http://127.0.0.1:3021";
if (!/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(BASE)) {
  console.error(`REFUSED — local next start only. KP_BASE was ${JSON.stringify(BASE)}.`);
  process.exit(2);
}
const DB = process.env.DATABASE_URL ?? "";
if (!DB || !/@(localhost|127\.0\.0\.1)[:/]/i.test(DB) || /rlwy\.net|railway\.app|50pick\.tz|railway\.internal/i.test(DB)) {
  console.error("REFUSED — DATABASE_URL must be a loopback scratch database. This driver breaks it on purpose.");
  process.exit(2);
}
const SHOTS = process.env.KP_SHOTS ?? ".qa-house-bots/faults";
const WIDTHS = (process.env.KP_WIDTHS ?? "360,640,768,1024,1280,1920").split(",").map(Number).filter(Boolean);
const PHONE = "+255700000000";
const PASSWORD = process.env.KP_ADMIN_PASSWORD ?? "QaAdmin2026!";
const ACTIVE = process.env.KP_ACTIVE_ID ?? "";
if (!ACTIVE) {
  console.error("REFUSED — KP_ACTIVE_ID is required (the seed prints it).");
  process.exit(2);
}
mkdirSync(SHOTS, { recursive: true });

const report = [];
let pass = 0, fail = 0;
const ok = (label, cond, extra = "") => {
  cond ? pass++ : fail++;
  console.log((cond ? "PASS " : "FAIL ") + label + (extra ? " — " + extra : ""));
};

/* ── the fault, and its removal ───────────────────────────────────────────────────────────────────────────────
   The relation stays PRESENT (so the schema probe still reports ready and the page renders its panels rather
   than 421's Callout) and every SELECT on it raises. `count(*)` over the view raises too, because the predicate
   is volatile and the table is not empty — which is the point: the badge's count and the panel's rows fail
   TOGETHER, exactly as one unreachable table would fail them. */
const FAULT_ON = [
  `CREATE OR REPLACE FUNCTION kp_qa_boom() RETURNS boolean LANGUAGE plpgsql VOLATILE AS $$ BEGIN RAISE EXCEPTION 'kp qa fault injection'; END; $$`,
  `ALTER TABLE "HouseBotIntent" RENAME TO "HouseBotIntent_kpqa"`,
  `CREATE VIEW "HouseBotIntent" AS SELECT * FROM "HouseBotIntent_kpqa" WHERE kp_qa_boom()`,
];
const FAULT_OFF = [
  `DROP VIEW IF EXISTS "HouseBotIntent"`,
  `ALTER TABLE IF EXISTS "HouseBotIntent_kpqa" RENAME TO "HouseBotIntent"`,
  `DROP FUNCTION IF EXISTS kp_qa_boom()`,
];

const client = new pg.Client({ connectionString: DB });
await client.connect();
const run = async (stmts) => { for (const s of stmts) await client.query(s); };
/** The fault is not believed, it is PROVED: the same SELECT must raise with it on and answer with it off. */
const selectWorks = async () => {
  try { await client.query(`SELECT count(*) FROM "HouseBotIntent"`); return true; } catch { return false; }
};

/** Everything read out of ONE render, in the page. */
const PROBE = `() => {
  const main = document.querySelector("main") || document.body;
  const text = main.innerText;
  const tabs = [...document.querySelectorAll("main [role='tablist'] a, main [role='tablist'] button")].map((a) => ({
    t: (a.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 40),
    current: a.getAttribute("aria-current") || a.getAttribute("aria-selected") || "",
  }));
  const rows = [...document.querySelectorAll("main .admin-tbl tbody tr")];
  const heads = [...document.querySelectorAll("main .admin-tbl thead th")].map((th) => (th.textContent || "").trim());
  const chips = [...document.querySelectorAll("main .admin-tbl tbody tr td")].map((td) => (td.textContent || "").trim());
  const queued = rows.filter((tr) => /Queued/.test(tr.textContent || "")).length;
  const lastCellButtons = rows.map((tr) => tr.lastElementChild ? tr.lastElementChild.querySelectorAll("button").length : 0)
    .reduce((a, b) => a + b, 0);
  const alerts = [...document.querySelectorAll("main [role='alert'], main [role='status']")]
    .map((c) => (c.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 160));
  const pageBtn = [...document.querySelectorAll("main button[aria-label], main a[aria-label]")]
    .filter((b) => /page|ukurasa/i.test(b.getAttribute("aria-label") || ""));
  const rail = document.querySelector("[data-filter-rail]");
  return {
    url: location.pathname + location.search,
    tabs, heads, rowCount: rows.length, queued, stopButtons: lastCellButtons,
    alerts, hasTable: !!document.querySelector("main .admin-tbl"),
    hasPager: pageBtn.length > 0, hasRail: !!rail,
    cells: chips.slice(0, 10),
    loadError: /could not|couldn't|unavailable|not be read|try again/i.test(text) ? text.split("\\n").filter((l) => /could not|couldn't|unavailable|not be read|try again/i.test(l)).slice(0, 3) : [],
    h1: (document.querySelector("main h1") || {}).textContent || "",
  };
}`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
let faulted = false;
try {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/auth/admin`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.fill("#phone", PHONE.replace("+255", ""));
  await page.fill('input[type="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !/\/auth\//.test(u.toString()), { timeout: 60_000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  if (/\/auth\//.test(page.url())) { console.error("REFUSED — the local admin could not sign in."); process.exit(3); }
  await page.close();

  const shoot = async (id, route, note) => {
    for (const width of WIDTHS) {
      const p = await ctx.newPage();
      await p.setViewportSize({ width, height: 900 });
      await p.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 60_000 });
      await p.waitForTimeout(400);
      const m = await p.evaluate(eval(`(${PROBE})`)).catch((e) => ({ probeError: String(e).slice(0, 200) }));
      await p.screenshot({ path: join(SHOTS, `${id}-${width}.png`) });
      report.push({ id, width, note, route, ...m });
      await p.close();
    }
    console.log(`shot ${id.padEnd(6)} ${WIDTHS.length} widths · ${note}`);
  };

  /* ── 1 · HEALTHY FIRST, so the fault's tiles have a control taken minutes apart on the same build ── */
  await shoot("H-L", "/admin/desk?tab=activity", "landing activity · HEALTHY (the control for the fault)");
  await shoot("H-A", `/admin/desk/${ACTIVE}?tab=activity`, "ACCOUNT activity · HEALTHY (the control for the fault)");

  /* ── 2 · THE READ THAT FAILED ─────────────────────────────────────────────────────────────────── */
  ok("§F0 CONTROL · the table reads normally BEFORE the fault", await selectWorks());
  await run(FAULT_ON); faulted = true;
  ok("§F0 CONTROL · and every SELECT on it raises once the fault is in", !(await selectWorks()));
  await shoot("F-L", "/admin/desk?tab=activity", "landing activity · the read FAILED");
  await shoot("F-A", `/admin/desk/${ACTIVE}?tab=activity`, "ACCOUNT activity · the read FAILED");
  await run(FAULT_OFF); faulted = false;
  ok("§F0 CONTROL · the fault is OUT and the table reads again", await selectWorks());

  /* ── 3 · THE CANCEL CEREMONY, OPENED ──────────────────────────────────────────────────────────── */
  for (const width of WIDTHS) {
    const p = await ctx.newPage();
    await p.setViewportSize({ width, height: 900 });
    await p.goto(`${BASE}/admin/desk?tab=activity`, { waitUntil: "load", timeout: 60_000 });
    await p.waitForTimeout(400);
    const trigger = p.locator("main .admin-tbl tbody tr td:last-child button").first();
    const found = await trigger.count();
    if (!found) { report.push({ id: "C-D", width, note: "cancel ceremony", noTrigger: true }); await p.close(); continue; }
    const triggerLabel = (await trigger.textContent())?.trim() ?? "";
    await trigger.click();
    await p.waitForTimeout(350);
    await p.screenshot({ path: join(SHOTS, `C-D-${width}.png`) });
    const empty = await p.evaluate(() => {
      const d = document.querySelector("[role='alertdialog']");
      if (!d) return null;
      const btns = [...d.querySelectorAll("button")].map((b) => ({ t: (b.textContent || "").trim(), disabled: b.disabled }));
      const r = d.getBoundingClientRect();
      return {
        heading: (d.querySelector("h1,h2,h3") || {}).textContent || "",
        body: (d.querySelector("p") || {}).textContent || "",
        text: (d.textContent || "").replace(/\s+/g, " ").trim().slice(0, 400),
        btns, width: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right),
        focused: (document.activeElement || {}).tagName || "",
        labels: [...d.querySelectorAll("label")].map((l) => (l.textContent || "").trim()),
        live: [...d.querySelectorAll("[aria-live]")].map((l) => (l.textContent || "").replace(/\s+/g, " ").trim()),
      };
    });
    /* ⛔ THE ARMING IS MEASURED ON BOTH SIDES OF ITS OWN BOUND, never on one. */
    await p.fill("[role='alertdialog'] textarea", "no");
    await p.waitForTimeout(150);
    const shortState = await p.evaluate(() => {
      const d = document.querySelector("[role='alertdialog']");
      return d ? [...d.querySelectorAll("button")].map((b) => ({ t: (b.textContent || "").trim(), disabled: b.disabled })) : null;
    });
    await p.fill("[role='alertdialog'] textarea", "stopped while the ferry story settles");
    await p.waitForTimeout(150);
    const armedState = await p.evaluate(() => {
      const d = document.querySelector("[role='alertdialog']");
      return d ? {
        btns: [...d.querySelectorAll("button")].map((b) => ({ t: (b.textContent || "").trim(), disabled: b.disabled })),
        live: [...d.querySelectorAll("[aria-live]")].map((l) => (l.textContent || "").replace(/\s+/g, " ").trim()),
      } : null;
    });
    await p.screenshot({ path: join(SHOTS, `C-D-${width}-typed.png`) });
    /* ⛔ NOTHING IS SUBMITTED HERE. The stop that really lands is driven once, at the end, at one width. */
    await p.keyboard.press("Escape");
    await p.waitForTimeout(200);
    const afterEsc = await p.evaluate(() => !!document.querySelector("[role='alertdialog']"));
    report.push({ id: "C-D", width, note: "cancel ceremony", triggerLabel, empty, shortState, armedState, stillOpenAfterEsc: afterEsc });
    await p.close();
  }
  console.log(`shot C-D    ${WIDTHS.length} widths · the cancel ceremony, opened and typed into`);

  /* ── 4 · THE STOP THAT REALLY LANDS, ONCE ─────────────────────────────────────────────────────── */
  {
    const p = await ctx.newPage();
    await p.setViewportSize({ width: 1280, height: 900 });
    await p.goto(`${BASE}/admin/desk?tab=activity`, { waitUntil: "load", timeout: 60_000 });
    await p.waitForTimeout(400);
    const before = await p.evaluate(eval(`(${PROBE})`));
    const trigger = p.locator("main .admin-tbl tbody tr td:last-child button").first();
    if (await trigger.count()) {
      await trigger.click();
      await p.waitForTimeout(300);
      await p.fill("[role='alertdialog'] textarea", "stopped by the ops lane's own drive, end to end");
      const confirm = p.locator("[role='alertdialog'] button").last();
      await confirm.click();
      await p.waitForTimeout(1800);
      await p.screenshot({ path: join(SHOTS, `C-DONE-1280.png`) });
      const after = await p.evaluate(eval(`(${PROBE})`));
      const toast = await p.evaluate(() => [...document.querySelectorAll("[role='status'],[role='alert']")]
        .map((n) => (n.textContent || "").replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 4));
      report.push({ id: "C-DONE", width: 1280, note: "the stop, driven end to end", before, after, toast });
    }
    await p.close();
  }
} finally {
  if (faulted) { try { await run(FAULT_OFF); } catch (e) { console.error("!! THE FAULT COULD NOT BE REMOVED:", e); } }
  const clean = await selectWorks();
  console.log(clean ? "\nfault removed — the table reads normally" : "\n!! THE DATABASE IS STILL FAULTED");
  await client.end();
  await ctx.close();
  await browser.close();
}
writeFileSync(join(SHOTS, "faults.json"), JSON.stringify(report, null, 1));

/* ── THE ASSERTIONS ──────────────────────────────────────────────────────────────────────────────── */
console.log("");
const at = (id, w) => report.find((r) => r.id === id && r.width === w);
for (const width of WIDTHS) {
  for (const [id, who] of [["F-L", "landing"], ["F-A", "the account page"]]) {
    const r = at(id, width); if (!r) continue;
    /* 355 · a failed read is the kit's failure treatment, never an empty table and never a table at all. */
    ok(`§F1 ${id} @${width} · ${who}'s activity paints a failure, not a table`,
      r.hasTable === false && r.loadError.length > 0, `table=${r.hasTable} says=${JSON.stringify(r.loadError).slice(0, 90)}`);
    /* 312 · a count that failed shows NO badge — a badge is never how "unknown" is said. */
    const activityTab = (r.tabs || []).find((t) => /activit/i.test(t.t));
    ok(`§F2 ${id} @${width} · and the tab carries no count beside it`,
      !!activityTab && !/\d/.test(activityTab.t), `tab="${activityTab ? activityTab.t : "(none)"}"`);
    /* 432(a) · no pager over a list nobody could read. */
    ok(`§F3 ${id} @${width} · no pager is drawn over a read that failed`, r.hasPager === false);
  }
  const h = at("H-L", width);
  if (h) ok(`§F0 CONTROL ${width} · the healthy landing render DID paint a table (so §F1 measures a change)`, h.hasTable === true);
}
/* ── the asymmetry, counted ───────────────────────────────────────────────────────────────────────── */
for (const width of WIDTHS) {
  const l = at("H-L", width), a = at("H-A", width);
  if (!l || !a) continue;
  ok(`§X1 @${width} · the landing feed offers a stop on every QUEUED row it paints`,
    l.queued > 0 && l.stopButtons === l.queued, `queued=${l.queued} controls=${l.stopButtons}`);
  ok(`§X2 @${width} · THE ASYMMETRY, COUNTED · the account page paints QUEUED rows and offers no control over them`,
    a.queued > 0 && a.stopButtons === 0, `queued=${a.queued} controls=${a.stopButtons}`);
}
for (const width of WIDTHS) {
  const c = report.find((r) => r.id === "C-D" && r.width === width);
  if (!c || !c.empty) continue;
  ok(`§C1 @${width} · the dialog opens with its confirm DISARMED (an empty reason is not a reason)`,
    c.empty.btns.some((b) => b.disabled === true), JSON.stringify(c.empty.btns));
  ok(`§C2 @${width} · a reason under the bound leaves it disarmed`,
    (c.shortState || []).some((b) => b.disabled === true), JSON.stringify(c.shortState));
  ok(`§C3 @${width} · a reason inside the bound ARMS it`,
    !!c.armedState && c.armedState.btns.every((b) => b.disabled === false), JSON.stringify(c.armedState && c.armedState.btns));
  ok(`§C4 @${width} · the dialog fits the viewport with a gutter on both sides`,
    c.empty.left >= 8 && c.empty.right <= width - 8, `left=${c.empty.left} right=${c.empty.right} vw=${width}`);
  ok(`§C5 @${width} · Escape does NOT throw away a typed reason`, c.stillOpenAfterEsc === true);
}
const done = report.find((r) => r.id === "C-DONE");
if (done) {
  ok("§C6 · the stop LANDS on a served page — the queued count falls by exactly one",
    done.after.queued === done.before.queued - 1, `before=${done.before.queued} after=${done.after.queued}`);
  ok("§C7 · and the officer is TOLD, in words, that it landed", (done.toast || []).join(" ").length > 0,
    JSON.stringify(done.toast));
}
ok("§Z0 COVERAGE · every state this driver owes was actually reached",
  ["H-L", "H-A", "F-L", "F-A", "C-D"].every((id) => report.filter((r) => r.id === id).length === WIDTHS.length),
  JSON.stringify(Object.fromEntries(["H-L", "H-A", "F-L", "F-A", "C-D"].map((id) => [id, report.filter((r) => r.id === id).length]))));

console.log(`\n${report.length} renders under ${SHOTS} · measurements in ${join(SHOTS, "faults.json")}`);
console.log(`qa:house-bot-panel-faults: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
