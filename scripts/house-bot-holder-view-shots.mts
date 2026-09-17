/**
 * WHAT A HOLDER SEES, AS SERVED (owner ruling D19c; C4 ruling 155).
 *
 *   npm run qa:house-bot-holder-view
 *
 * ⛔ House bots are never public, and "the holder sees nothing" is a claim about PAGES, not about functions. A static
 * scan cannot see an RSC payload a server page builds per request — a whole position object handed to a client
 * component would carry `houseBotId` into the HTML the holder's browser receives. So this pass builds a real holder
 * on a scratch database (a house stake beside their own, a settled house win, a house-only resolved market, the
 * money rows behind them), signs in AS that holder, fetches every page they can open, and reads the full HTML —
 * the RSC payload included — for the house vocabulary and for the bot's and intents' own ids. It photographs the
 * positions page and the market pages at 1280 and 360; each screenshot is opened and read.
 *
 * ⛔ NEVER PORTS 3009, 3011, 3013 OR 3014 (other sessions own them). This one uses 3021.
 * ⚠️ `qa:` is not part of `test:all`: it needs a browser, a server and a scratch cluster.
 *
 * house-bot: covered by L2 sweep — it sets the demo holder's password hash and wallet directly, as fixtures of consent and
 * money, with no in-app hook behind them; the holder sweep would apply anything that mattered.
 */
import pgLib from "pg";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { houseHits } from "./lib/house-bot-vocabulary.mjs";

const ROOT = join(import.meta.dirname, "..");
const PORT = Number(process.env.HB_VIEW_PORT ?? 3021);
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = join(ROOT, ".qa-shots", "house-bot-holder-view");
let pass = 0, fail = 0, unmeasured = 0;
const ok = (l: string, c: boolean, x = "") => {
  c ? pass++ : fail++;
  console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`);
};
const notMeasured = (l: string, why: string) => { unmeasured++; console.log(`NOT MEASURED ${l} — ${why}`); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * ⛔ The vocabulary is not declared here (C5-SPEC ruling 175): `houseHits` is the one module `test:house-bot-disclosure`,
 * `verify:house-bot-bundle` and every other absence proof import — words in any case, identifiers exactly, bounded ids.
 */

const RAW = process.env.VERIFY_DATABASE_URL ?? "";
if (!RAW) {
  console.error("\n!! NOT MEASURED — this needs a local cluster. Run `npm run qa:house-bot-holder-view`, which boots one.");
  process.exit(3);
}
const host = (() => { try { return new URL(RAW).hostname; } catch { return ""; } })();
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
  console.error("!! refusing: this creates and drops a database, so it runs only against a loopback cluster.");
  process.exit(2);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

type PgClient = { connect(): Promise<void>; query(q: string, v?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>; end(): Promise<void> };
const pg = pgLib as unknown as { Client: new (o: { connectionString: string }) => PgClient };
const BASE_URL = RAW.replace(/\/[^/?]*(\?.*)?$/, "");
const DB = `hb_view_${process.pid}`;
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
  cwd: ROOT, env: { ...process.env, DATABASE_URL, HOUSE_BOT_ENGINE: "false", MARKET_SCHEDULER: "false" },
  shell: process.platform === "win32", stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout?.on("data", (d) => { serverLog += String(d); });
server.stderr?.on("data", (d) => { serverLog += String(d); });

/** Opened inside the try; closed in `finally` BEFORE the database is dropped (a FORCE drop kills an open connection, and an
 *  unhandled `error` event then crashed the pass and hid the fixture's own error — measured on the first run). */
let who: PgClient | null = null;
try {
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

  who = new pg.Client({ connectionString: DATABASE_URL });
  (who as unknown as { on(e: string, f: (err: unknown) => void): void }).on("error", () => { /* the drop in finally ends it */ });
  await who.connect();
  const found = await who.query('SELECT id, "phoneE164" FROM "User" ORDER BY "createdAt" ASC LIMIT 5');
  const holderId = String(found.rows.find((r) => r.phoneE164 === "+255700000000")?.id ?? found.rows[0]?.id ?? "");
  ok("0.who · the pass knows which account is the holder", holderId.length > 0, holderId || JSON.stringify(found.rows));
  if (!holderId) throw new Error("the demo session created no account in the scratch database");

  // ── the holder's world, written through the real services against this database ──
  process.env.DATABASE_URL = DATABASE_URL;
  process.env.USE_PRISMA_DAL = "true";
  process.env.MARKET_SCHEDULER = "false";
  const { loadWorld, HOLDER_HASH, OFFICER } = await import("./lib/house-bot-world.mts");
  const w = await loadWorld();
  await w.user({ id: OFFICER, role: "ADMIN" });
  await w.limits();
  await w.switchOn();
  // Consent is the holder's password (D5): the bot's fingerprint must match their stored hash.
  await w.setUserFields(holderId, { passwordHash: HOLDER_HASH });
  const wallet = await w.db.wallet.findByUserId(holderId);
  await w.db.wallet.update(wallet.id, { balance: 2_000_000 });
  const bot = await w.bot({ holderId });
  const intentIds: string[] = [];
  /** A poll with a neutral, readable title (the world's default names the suite), and a locked NO from a player. */
  const pollFor = async (title: string) => {
    const market = await w.poll({ graceMin: 0 });
    await who!.query('UPDATE "PredictionMarket" SET "titleEn" = $1, "titleSw" = $2, "sourceUrl" = $3 WHERE id = $4', [title, title, "https://www.meteo.go.tz", market.id]);
    const player = await w.user({ balance: 1_000_000 });
    const r = await w.svc.buyPosition(player, { marketId: market.id, side: "NO", stake: 10_000, idempotencyKey: crypto.randomUUID() });
    if (!r.ok) throw new Error(`fixture: the player's bet was refused ${JSON.stringify(r)}`);
    await w.backdate(r.data.positionId, 10_000);
    return market;
  };
  const houseStake = async (marketId: string, stakeTzs: number) => {
    const i = await w.intent(bot, marketId, { kind: "FILL", side: "YES", stakeTzs });
    intentIds.push(i.id);
    const r = await w.place(bot, i);
    if (!r.ok) throw new Error(`fixture: the house stake was refused ${JSON.stringify(r)}`);
    return r.data.positionId as string;
  };
  const mOpen = await pollFor("Will it rain in Dar es Salaam on Friday?");
  const houseOpen = await houseStake(mOpen.id, 5_000);
  const own = await w.svc.buyPosition(holderId, { marketId: mOpen.id, side: "NO", stake: 2_000, idempotencyKey: crypto.randomUUID() });
  const mWon = await pollFor("Will Simba SC win on Saturday?");
  const houseWon = await houseStake(mWon.id, 3_000);
  await w.svc.resolveMarket({ marketId: mWon.id, outcome: "YES", officerId: OFFICER });
  await w.svc.settleMarket(mWon.id, { force: true });
  const mOnly = await pollFor("Will the ferry run on time on Sunday?");
  const houseOnly = await houseStake(mOnly.id, 2_000);
  await w.svc.resolveMarket({ marketId: mOnly.id, outcome: "NO", officerId: OFFICER });
  await sleep(800);
  ok("1.0 · fixture · a house stake beside the holder's own, a settled house win, and a house-only resolved market",
    own.ok === true && !!houseOpen && !!houseWon && !!houseOnly, JSON.stringify({ own: own.ok, houseOpen, houseWon, houseOnly }));

  const SECRETS = [bot.botId, ...intentIds];
  // ⚠️ `next dev` writes stack traces with ABSOLUTE FILE PATHS into the HTML, and this checkout's folder is named
  // `kipindi-house-bots` — 142 "house-bots" hits on the first run, none of them product text (a production build carries
  // no such path). Only this checkout's own root, in the spellings a trace uses, is taken out before the scan.
  // Measured spellings: `F:\kipindi-house-bots` in a trace and `F:%5Ckipindi-house-bots` in a URL — so one pattern: a
  // drive, then any run of separators in any escaping, then EXACTLY this checkout's folder name, and nothing else.
  const CHECKOUT = ROOT.split(/[\\/]/).filter(Boolean).pop()!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const ROOT_PATH = new RegExp(String.raw`[A-Za-z](?::|%3A)(?:\\|/|%5C|%2F)+` + CHECKOUT, "gi");
  const withoutRoot = (html: string) => html.replace(ROOT_PATH, () => "<ROOT>");
  const leaks = (raw: string): string[] => {
    const html = withoutRoot(raw);
    const out = houseHits(html);
    for (const s of SECRETS) if (html.includes(s)) out.push(`id:${s}`);
    return out;
  };

  const folder = ROOT.split(/[\\/]/).filter(Boolean).pop() ?? "";
  const trace = `at X (${ROOT}${String.fromCharCode(92)}x.js) · /Server/F:%5C${folder}`;
  ok("2.c · CONTROL · the checkout path is taken out of a trace, and a product sentence beside it is still caught",
    folder.length > 0 && leaks(trace).length === 0 && leaks(`${trace} · 50pick house-bots desk`).includes("house-bots"), JSON.stringify(leaks(trace)));
  // ── §2 · every page the holder can open, read whole (RSC payload included) ──
  const pages = [
    ["positions (open)", "/positions"],
    ["positions (settled)", "/positions?tab=settled"],
    ["a house position's own page", `/positions/${houseOpen}`],
    ["the settled house win's page", `/positions/${houseWon}`],
    ["performance", "/positions/performance"],
    ["profile", "/profile"],
    ["the market with a house stake and an own stake", `/markets/${mOpen.id}`],
    ["the house-only resolved market", `/markets/${mOnly.id}`],
    ["notifications", "/notifications"],
    ["wallet", "/wallet"],
  ] as const;
  for (const [what, path] of pages) {
    // The SERVED document through the browser's own cookie jar (redirects followed); the live DOM separately, because a
    // page may abort its own navigation (measured: ERR_ABORTED on a settled position's permalink) and that is not a leak.
    const resp = await ctx.request.get(`${BASE}${path}`, { maxRedirects: 5 });
    const served = await resp.text().catch(() => "");
    const finalUrl = new URL(resp.url());
    const signedOut = /\/auth(\/|\?|$)/.test(finalUrl.pathname + finalUrl.search);
    let dom = "";
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    } catch (e) {
      console.log(`note · ${path}: the browser navigation did not settle (${String((e as Error).message).split("\n")[0]}); the DOM is read as it stands`);
    }
    dom = await page.content().catch(() => "");
    if (signedOut || resp.status() >= 400) {
      ok(`2 · ${what} (${path}) is served to the holder`, false, `status=${resp.status()} url=${resp.url()}`);
      continue;
    }
    const found = [...new Set([...leaks(served), ...leaks(dom)])];
    ok(`2 · ⛔ D19c · ${what} (${path}) — served HTML and live DOM carry no house word and no bot or intent id`,
      found.length === 0 && served.length > 2_000, found.length ? found.slice(0, 8).join(", ") : `${served.length} + ${dom.length} chars read`);
    writeFileSync(join(OUT, `${what.replace(/[^a-z0-9]+/gi, "-")}.html`), served);
  }

  // The positions page lists all three house stakes as the holder's bets (the absence above is not an empty page).
  await page.goto(`${BASE}/positions`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  const positionsText = String(await page.evaluate("document.body.innerText"));
  ok("3.1 · CONTROL · the positions page shows the house stake's market like any bet (the absence is not an empty page)",
    positionsText.includes("Will it rain in Dar es Salaam on Friday?"), positionsText.slice(0, 200).replace(/\s+/g, " "));

  // The house-only resolved market shows the neutral objection state (ruling 146) in the page's language.
  await page.goto(`${BASE}/markets/${mOnly.id}`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  const onlyText = String(await page.evaluate("document.body.innerText"));
  const neutral = ["Huwezi kupinga matokeo haya", "You can’t object to this result", "您无法对此结果提出异议"];
  if (neutral.some((s) => onlyText.includes(s))) {
    ok("3.2 · ruling 146 · the house-only holder's resolution panel says, neutrally, that they cannot object", true);
    // Ruling 158 — found by reading this page's screenshot: the payout-held box above must not invite the objection.
    const invitation = ["unaweza kupinga wakati fedha bado ziko kwenye dimbwi", "you can object while the pool is still intact"];
    const heldBox = ["Malipo yamesimamishwa", "Payout is on hold"].some((s) => onlyText.includes(s));
    ok("3.2b · ruling 158 · …and the payout-held box above it (present) does not invite an objection", heldBox && !invitation.some((s) => onlyText.includes(s)),
      heldBox ? invitation.find((s) => onlyText.includes(s)) ?? "" : "the payout-held box was not rendered, so the check would be vacuous");
  } else if (/pinga|object|异议/i.test(onlyText)) {
    ok("3.2 · ruling 146 · the house-only holder's resolution panel says, neutrally, that they cannot object", false, onlyText.slice(0, 300).replace(/\s+/g, " "));
  } else {
    notMeasured("3.2 · the neutral objection line", "the resolution panel did not render an objection state on this page");
  }

  // ── §4 · the export action's payload (ruling 154), read the same way ──
  const { exportUserData } = await import("../src/lib/server/user-service.ts");
  const exported = JSON.stringify(await exportUserData(holderId));
  const exportLeaks = leaks(exported);
  ok("4.1 · ⛔ ruling 154 · the holder's data export carries no house word and no bot or intent id",
    exportLeaks.length === 0 && exported.length > 500,
    exportLeaks.slice(0, 8).join(", ") || `${exported.length} chars`);

  // ── §5 · photographs, each opened and read ──
  for (const width of [1280, 360]) {
    await page.setViewportSize({ width, height: width === 360 ? 780 : 900 });
    for (const [name, path] of [["positions", "/positions"], ["market-open", `/markets/${mOpen.id}`], ["market-house-only", `/markets/${mOnly.id}`]] as const) {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
      await page.screenshot({ path: join(OUT, `${name}@${width}.png`), fullPage: true });
      const m = await page.evaluate("({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth })") as { w: number; c: number };
      ok(`5.${width} · ${name} never scrolls sideways`, m.w <= m.c + 1, `scrollW=${m.w} clientW=${m.c}`);
    }
  }
  await browser.close();
  console.log(`\nshots and served HTML written to ${OUT}`);
} catch (e) {
  ok("x · the pass ran to the end (a thrown fixture or page error is a failure, never a silent stop)", false, String((e as Error)?.stack ?? e).split("\n").slice(0, 4).join(" | "));
} finally {
  await who?.end().catch(() => {});
  // ⛔ THE TREE, NOT THE SHELL (a shell-spawned `next dev` survives `kill()` on Windows and keeps the port).
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
  await drop.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`).catch(() => ({ rows: [] }));
  await drop.end();
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — qa:house-bot-holder-view: ${pass} passed, ${fail} failed, ${unmeasured} NOT MEASURED`);
process.exit(fail === 0 ? 0 : 1);
