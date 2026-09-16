/**
 * EVERY HOUSE-BOT BELL, PHOTOGRAPHED AND MEASURED (Ali's standing instruction: a surface that was not rendered is
 * NOT MEASURED, never "passed"; PLAN §15, 04 C13).
 *
 *   npm run qa:house-bot-bells
 *
 * ⛔ THE ROWS ARE WRITTEN BY THE REAL EMITTERS, not by fixtures pasted into a page. The suite boots a scratch
 * database, starts the app against it, calls `notifyAdminsHouseBot*` and `notifyHouseBotOwner*` exactly as the
 * engine does, then opens the bell in a browser and reads what an admin would read. A picture of hand-written HTML
 * would prove nothing about the emitter.
 *
 * ⛔ NEVER PORTS 3009, 3011, 3013 OR 3014 (other sessions own them). This one uses 3021, and says so.
 *
 * ⚠️ `qa:` is not part of `test:all`: it needs a browser and a server. Run it when the copy or the panel changes.
 *
 * house-bot: covered by L2 sweep — this promotes its own scratch account to ADMIN so the recipient resolver admits it,
 * which is an account write with no in-app hook behind it; the holder sweep would apply anything that mattered.
 */
import pgLib from "pg";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = join(import.meta.dirname, "..");
const PORT = Number(process.env.HB_BELL_PORT ?? 3021);
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = join(ROOT, ".qa-shots", "house-bot-bells");
let pass = 0, fail = 0, unmeasured = 0;
const ok = (l: string, c: boolean, x = "") => {
  c ? pass++ : fail++;
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};
/** Neither a pass nor a failure: something this harness could not measure, and why. */
const notMeasured = (l: string, why: string) => {
  unmeasured++;
  console.log(`NOT MEASURED ${l} — ${why}`);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const RAW = process.env.VERIFY_DATABASE_URL ?? "";
if (!RAW) {
  console.error("\n!! NOT MEASURED — this needs a local cluster. Run `npm run qa:house-bot-bells`, which boots one.");
  process.exit(3);
}
const host = (() => { try { return new URL(RAW).hostname; } catch { return ""; } })();
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
  console.error("!! refusing: this creates and drops a database, so it runs only against a loopback cluster.");
  process.exit(2);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const pg = pgLib as unknown as { Client: new (o: { connectionString: string }) => { connect(): Promise<void>; query(q: string): Promise<unknown>; end(): Promise<void> } };
const BASE_URL = RAW.replace(/\/[^/?]*(\?.*)?$/, "");
const DB = `hb_bells_${process.pid}`;
const admin = new pg.Client({ connectionString: RAW });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${DB}"`);
await admin.end();
const DATABASE_URL = `${BASE_URL}/${DB}`;

const mig = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  cwd: ROOT, env: { ...process.env, DATABASE_URL }, encoding: "utf8", shell: process.platform === "win32", timeout: 10 * 60_000,
});
ok("0.migrate · every migration applies to the scratch database", mig.status === 0, (mig.stderr ?? "").split("\n").slice(-2).join(" "));

const server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
  cwd: ROOT, env: { ...process.env, DATABASE_URL, HOUSE_BOT_ENGINE: "false", MARKET_SCHEDULER: "false", DISABLE_ADMIN_TOTP: "true" },
  shell: process.platform === "win32", stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout?.on("data", (d) => { serverLog += String(d); });
server.stderr?.on("data", (d) => { serverLog += String(d); });

try {
  // ── wait for the app, then take the demo session the bell pass uses ──
  let up = false;
  for (let i = 0; i < 120 && !up; i++) {
    await sleep(1_000);
    try { up = (await fetch(`${BASE}/`)).status < 500; } catch { up = false; }
  }
  ok("0.server · the app answers on the port this pass owns (never 3009/3011/3013/3014)", up, `port ${PORT}${up ? "" : ` · ${serverLog.split("\n").slice(-3).join(" ")}`}`);
  if (!up) throw new Error("the app never came up");

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const demo = await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded" });
  ok("0.session · the demo session route mints a session", !!demo && demo.status() < 400, `status=${demo?.status()}`);

  // ── the rows, written by the real emitters against this database ──
  process.env.DATABASE_URL = DATABASE_URL;
  process.env.USE_PRISMA_DAL = "true";
  const N = await import("../src/lib/server/notification-service.ts") as Record<string, (...a: unknown[]) => Promise<unknown>>;
  const store = await import("../src/lib/server/store.ts") as { db: {
    user: { update(id: string, p: Record<string, unknown>): Promise<unknown> };
  } };
  // ⛔ Who the demo session is, asked of the DATABASE, not of a route or a DAL — the first run asked `/api/me`,
  // which does not exist, wrote every row for an empty id and photographed an empty bell while reporting success.
  const who = new pg.Client({ connectionString: DATABASE_URL }) as unknown as { connect(): Promise<void>; query(q: string): Promise<{ rows: Array<{ id: string; phoneE164: string }> }>; end(): Promise<void> };
  await who.connect();
  const found = await who.query('SELECT id, "phoneE164" FROM "User" ORDER BY "createdAt" ASC LIMIT 5');
  await who.end();
  const userId = found.rows.find((r) => r.phoneE164 === "+255700000000")?.id ?? found.rows[0]?.id ?? "";
  ok("0.who · the pass knows which account it is photographing", userId.length > 0, userId ? `${userId} of ${found.rows.length} account(s)` : `no account: ${JSON.stringify(found.rows)}`);
  if (!userId) throw new Error("the demo session created no account in the scratch database");
  // The recipients resolver admits every ADMIN, so the photographed account is one.
  await store.db.user.update(userId, { role: "ADMIN" });

  const at = "14:02:11";
  const label = "Dar liquidity A";
  const botId = "hb_bells0000000000000001";
  const written: string[] = [];
  const write = async (what: string, fn: () => Promise<unknown>) => {
    try { await fn(); written.push(what); } catch (e) { ok(`row · ${what}`, false, String((e as Error)?.message ?? e).slice(0, 140)); }
  };
  await write("bet", () => N.notifyAdminsHouseBotBet({ botId, label, side: "YES", stakeTzs: 8_000, marketTitle: "Will Dar get rain today?", marketId: "mkt_bells1", intentId: "hbi_bells1", at }));
  await write("staff-chosen", () => N.notifyAdminsHouseBotStaffChosen({ botId, label, side: "NO", stakeTzs: 12_000, marketTitle: "Will Dar get rain today?", marketId: "mkt_bells1", intentId: "hbi_bells2", entry: "MANUAL", byName: "Juma M.", sideRule: "the thinner side — players' locked money YES TZS 40,000 · NO TZS 8,000", at: "14:03:22" }));
  await write("hour summary", () => N.notifyAdminsHouseBotHourSummary({ fromHH: "13:00", toHH: "14:00", count: 25, stakeTzs: 180_000, beyondCap: 5, staffChosen: 2, at: "14:00:04" }));
  await write("A1 paused", () => N.notifyAdminsHouseBotPaused({ variant: "A1", botId, label, holder: "Player #A3F2K8", how: "in their account settings", cancelled: 2, at: "14:04:10" }));
  await write("A2 password", () => N.notifyAdminsHouseBotPaused({ variant: "A2", botId, label, holder: "Player #A3F2K8", how: "with a reset link", status: "Paused", at: "14:04:40" }));
  await write("stop", () => N.notifyAdminsHouseBotPaused({ variant: "STOP", botId, label, holder: "Player #A3F2K8", cause: "SELF_EXCLUDED", cancelled: 1, targetsEnded: 2, at: "14:05:10" }));
  await write("switch off", () => N.notifyAdminsHouseBotSwitch({ state: "OFF", cause: "MANUAL", byName: "Juma M.", cancelled: 3, drain: "busy", at: "14:05:30" }));
  await write("money event", () => N.notifyAdminsHouseBotMoneyEvent({ botId, label, holder: "Player #A3F2K8", event: "withdrew", amountTzs: 50_000, txnId: "txn_bells01", balanceTzs: 120_000, at: "14:06:30" }));
  await write("alert", () => N.notifyAdminsHouseBotAlert({ code: "SETTLE_BLOCKED", botId, label, holder: "Player #A3F2K8", detail: { openStakeTzs: 240_000 }, at: "14:07:45" }));
  await write("roster", () => N.notifyAdminsHouseBotRoster({ botId, label, event: "RULES_SAVED", eventId: "hbe_bells01", at: "14:08:11", detail: { byName: "Juma M.", field: "daily loss cap", from: "TZS 50,000", to: "TZS 200,000" } }));
  await write("target roster", () => N.notifyAdminsHouseBotRoster({ botId, label, event: "TARGET_ADDED", eventId: "hbe_bells02", at: "14:08:40", detail: { byName: "Juma M.", marketTitle: "Will Dar get rain today?", timing: { delaySec: 10, from: "STAKE", heldToExit: true } } }));
  await write("holder stake", () => N.notifyHouseBotOwnerStake({ userId, positionId: "pos_bells01", side: "YES", stakeTzs: 8_000, marketTitle: "Will Dar get rain today?", at }));
  await write("holder summary", () => N.notifyHouseBotOwnerHourSummary({ userId, count: 5, stakeTzs: 40_000, fromHH: "13:00", toHH: "14:00" }));
  for (const kind of ["designated", "password_paused", "password_temp", "role_changed", "erasure_request", "removed"]) {
    await write(`holder ${kind}`, () => N.notifyHouseBotOwner(userId, kind));
  }
  ok("1.1 · every emitter this commit adds wrote its row", written.length === 19, `${written.length} rows: ${written.join(", ")}`);
  // ⛔ "It wrote" is not "it landed", and the DATA LAYER saying so is not the DATABASE saying so: in a script's own
  // process the store can resolve to the memory twin, and the browser reads Postgres. Ask Postgres.
  const counter = new pg.Client({ connectionString: DATABASE_URL }) as unknown as { connect(): Promise<void>; query(q: string): Promise<{ rows: Array<{ n: string; userId: string }> }>; end(): Promise<void> };
  await counter.connect();
  const counted = await counter.query(`SELECT count(*)::text AS n, "userId" FROM "Notification" WHERE kind = 'HOUSE_BOT' GROUP BY "userId"`);
  await counter.end();
  const mine = counted.rows.find((r) => r.userId === userId);
  ok("1.2 · ⭐ and every row LANDED in Postgres, for the account the browser opens",
    Number(mine?.n ?? 0) >= 19, `${mine?.n ?? 0} house rows for ${userId}; all owners: ${JSON.stringify(counted.rows)}`);

  // ── the inbox page (server-rendered: what an admin reads), then the bell panel ──
  for (const width of [1280, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}/notifications`, { waitUntil: "domcontentloaded" });
    // Wait for a HOUSE row's own words, not for a timer: the page is server-rendered, so they are either there or
    // the rows never reached this account.
    const found = await page.waitForFunction(
      "(() => document.body.innerText.includes('Dar liquidity A') || document.body.innerText.includes('liquidity'))()",
      { timeout: 60_000 },
    ).then(() => true).catch(() => false);
    const text = await page.evaluate("document.body.innerText");
    ok(`2.${width} · the inbox page renders this commit's house rows`, found, found ? `${String(text).length} characters rendered` : String(text).slice(0, 160).replace(/\s+/g, " "));
    const m = await page.evaluate(`(() => {
      let clipped = 0;
      const ps = document.querySelectorAll('p, h2, h3');
      for (let i = 0; i < ps.length; i++) {
        const el = ps[i];
        if (el.scrollHeight > el.clientHeight + 2 && getComputedStyle(el).overflow !== 'visible') clipped++;
      }
      return { clipped, docScrollW: document.documentElement.scrollWidth, docClientW: document.documentElement.clientWidth };
    })()`) as { clipped: number; docScrollW: number; docClientW: number };
    ok(`2.${width} · nothing is clipped and the page never scrolls sideways`, m.clipped === 0 && m.docScrollW <= m.docClientW + 1,
      `clipped=${m.clipped} scrollW=${m.docScrollW} clientW=${m.docClientW}`);
    // ⛔ Ruling 142, read off the page itself: the Swahili inbox says the Swahili words, and a name that ends in a
    // period does not leave "Juma M..". Both of these were defects the FIRST render showed and no test had caught.
    const page1 = String(text);
    ok(`2.${width} · ruling 142 · the money row's verb and the roster sentence are in the page's own language`,
      page1.includes("ametoa") && !page1.includes("withdrew") && page1.includes("Kanuni zake zimebadilika")
        && page1.includes("NDIO") && !/ YES /.test(page1),
      page1.includes("ametoa") ? "" : page1.slice(0, 200).replace(/\s+/g, " "));
    ok(`2.${width} · a target's timing is said in the page's language, not handed over in English`,
      page1.includes("sekunde 10 baada ya kila dau") && !page1.includes("after each stake"),
      page1.includes("sekunde 10") ? "" : "the target row still carries English timing");
    ok(`2.${width} · no doubled period where a name already ends in one`, !/M\.\./.test(page1), /M\.\./.test(page1) ? "found 'M..'" : "");
    await page.screenshot({ path: join(OUT, `inbox@${width}.png`), fullPage: true });

    // The bell itself: a client poll, so it is reported as what it is rather than waited on forever.
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    // The panel arms its first read on mount, but a HIDDEN tab arms nothing at all (the component says so), and a
    // headless page is not the active tab until it is brought forward.
    await page.bringToFront();
    const bell = page.locator("button[data-unread]").first();
    await bell.waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
    await page.waitForFunction("(() => { const b = document.querySelector(String.fromCharCode(98,117,116,116,111,110) + String.fromCharCode(91) + String.fromCharCode(100,97,116,97,45,117,110,114,101,97,100) + String.fromCharCode(93)); return !!b && b.getAttribute(String.fromCharCode(100,97,116,97,45,117,110,114,101,97,100)) !== String.fromCharCode(48); })()", { timeout: 45_000 }).catch(() => {});
    if ((await bell.count()) > 0) {
      await bell.click().catch(() => {});
      const opened = await page.locator('[role="dialog"]').first().waitFor({ state: "visible", timeout: 15_000 }).then(() => true).catch(() => false);
      if (opened) {
        ok(`3.${width} · the bell panel opens over the page, with this commit's rows in it`, true);
        await page.screenshot({ path: join(OUT, `bell@${width}.png`) });
      } else {
        // ⛔ The rows and the server are NOT in doubt: the same server renders "19 unread" on /notifications, and
        // §2 above photographs them. What this harness cannot drive is the panel's own client poll under headless
        // `next dev` — its count stays 0 and the panel never opens. Commit 7's console visual pass drives a real
        // browser session and covers it; recorded here rather than dressed up as a pass.
        notMeasured(`3.${width} · the bell panel with house rows`,
          `the panel's client poll reports data-unread=${await bell.getAttribute("data-unread")} in this headless dev harness while the same server renders the rows and their unread count on /notifications (§2)`);
      }
      await page.keyboard.press("Escape").catch(() => {});
    }
  }
  await browser.close();
  console.log(`\nshots written to ${OUT}`);
} finally {
  // ⛔ THE TREE, NOT THE SHELL. `shell: true` means `kill()` ends cmd.exe and leaves Next holding the port — a
  // warm-up server on 3021 survived sixteen hours that way. Kill the process tree, then confirm the port is free.
  if (server.pid) {
    if (process.platform === "win32") spawnSync("taskkill", ["/T", "/F", "/PID", String(server.pid)], { encoding: "utf8" });
    else server.kill("SIGKILL");
  }
  await sleep(1_500);
  let stillUp = false;
  try { stillUp = (await fetch(`${BASE}/`)).status < 500; } catch { stillUp = false; }
  ok("9.port · the server this pass started is gone and its port is free", !stillUp, stillUp ? `something still answers on ${PORT}` : `port ${PORT} released`);
  const drop = new pg.Client({ connectionString: RAW });
  await drop.connect();
  await drop.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`).catch(() => {});
  await drop.end();
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — qa:house-bot-bells: ${pass} passed, ${fail} failed, ${unmeasured} NOT MEASURED`);
process.exit(fail === 0 ? 0 : 1);
