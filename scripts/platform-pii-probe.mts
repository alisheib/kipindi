/**
 * WHAT AN ADMIN PAGE STREAMS TO AN ACCOUNT THAT IS NOT STAFF (W25; rulings 521-524).
 *
 *   npm run build && npm run qa:platform-pii-probe
 *
 * ⛔ A LAYOUT IS NOT A GATE. `src/proxy.ts:36` lists "/admin" in PROTECTED_PREFIXES, but the only question it asks of a
 * protected path is whether the session cookie's HMAC verifies and has not expired — a session-EXISTS gate, not a role
 * gate (`git grep -nE "role|isStaffRole|canView" -- src/proxy.ts` returns nothing). Behind it, of the 55 admin pages
 * only 5 gate themselves on the STORED row, 10 gate on `session.role` (the cookie's photograph, which a demoted account
 * still carries), and 40 decide nothing about the viewer at all — their only belt is a layout, and a flight whose
 * `Next-Router-State-Tree` names those layouts skips them, after which the page's own async function runs and streams.
 *
 * ⭐ WHY THIS EXISTS AT ALL, AND WHY IT EXISTS FIRST (ruling 524). Measured before it was written: NO suite or probe in
 * this repo would go red if another player's display name, phone or stake appeared in a non-staff response. The only
 * three-mode walk asserts the HOUSE vocabulary and a bot's label and id — it is blind to platform PII by construction.
 * So the recommended fix would have been "proven" by an instrument that could not see the class of defect in the first
 * place. This probe is therefore built and seen RED against the UNFIXED code before any belt lands. A fix that arrives
 * before its instrument cannot be shown to have fixed anything.
 *
 * ⛔ THE ECHO TRAP THIS PROBE HAS AND THE HOUSE PROBE DOES NOT. A PII probe puts the SUBJECT'S OWN USER ID in the URL
 * (`/admin/players/<victimId>`), so a 404 body, a `?next=` round trip or a router-state echo can carry that id back
 * without the page having disclosed anything. A naive "the id appeared" rule would report a leak that is really the
 * request coming home. Two defences below: (1) every form of the request path and query is blanked out of the body
 * before matching, and (2) a user ID is NOT a needle at all — the needles are values the request never carries: a
 * display name, a phone number, an email, a NIDA number and a stake amount. `4.1c` plants a control that proves the
 * strip cannot hide a real disclosure.
 *
 * ⭐ WHAT PASSES AND WHAT IS NOT MEASURED. A non-staff response carrying any seeded PII value FAILS. The ADMIN is the
 * control: it MUST carry that data on the pages that render it, and a route instance whose ADMIN response carries none
 * is printed NOT MEASURED — its silence for the other viewers proves nothing about that page. A page that shows nothing
 * to anybody is never counted as clean.
 *
 * ⛔ AND THE THIRD BLOCKER IS NOT A READ AT ALL (ruling 521). `/admin/players/[id]/page.tsx:96` writes a COMPLIANCE
 * audit row — `player.record_viewed`, `actorId` = whoever made the request — BEFORE the page asks anything about the
 * viewer (the row read is at `:89`, the viewer at `:93-94`, the capability questions only at `:102-107`). A player who
 * forces the flight writes THEMSELVES into the compliance trail as the officer who opened another player's record.
 * That is evidence corruption, not disclosure, and no response-body rule can see it — so `4.4` re-reads the AuditLog
 * after the walk and asserts no such row names a non-staff actor.
 *
 * ⛔ NEVER PORTS 3009, 3011, 3013, 3014 (other sessions own them) OR 3021 (the house console probe). This one uses 3022.
 * ⚠️ `qa:` is not part of `test:all`: it needs a fresh `next build`, a server and a scratch cluster. A build older than
 * any `src` file is refused, never measured.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import pgLib from "pg";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Any = any;
const ROOT = join(import.meta.dirname, "..");
const PORT = Number(process.env.PII_PROBE_PORT ?? 3022);
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = join(ROOT, ".qa-shots", "platform-pii-probe");
let pass = 0, fail = 0, unmeasured = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };
const notMeasured = (l: string, why: string) => { unmeasured++; console.log(`NOT MEASURED ${l} — ${why}`); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
if ([3009, 3011, 3013, 3014, 3021].includes(PORT)) { console.error(`!! refusing port ${PORT}: another session or probe owns it.`); process.exit(2); }

const RAW = process.env.VERIFY_DATABASE_URL ?? "";
if (!RAW) { console.error("\n!! NOT MEASURED — this needs a local cluster. Run `npm run qa:platform-pii-probe`, which boots one."); process.exit(3); }
const host = (() => { try { return new URL(RAW).hostname; } catch { return ""; } })();
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) { console.error("!! refusing: this creates and drops a database, so it runs only against a loopback cluster."); process.exit(2); }

// ── the build must be newer than every source file: a stale build measures yesterday's pages ──
const newestSrc = (() => {
  let newest = 0, file = "";
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else { const m = statSync(p).mtimeMs; if (m > newest) { newest = m; file = p; } }
    }
  };
  walk(join(ROOT, "src"));
  return { newest, file };
})();
const buildIdPath = join(ROOT, ".next", "BUILD_ID");
const buildAt = (() => { try { return statSync(buildIdPath).mtimeMs; } catch { return 0; } })();
if (!(buildAt > newestSrc.newest)) {
  console.error(`\n!! NOT MEASURED — the production build ${buildAt ? "is older than" : "does not exist for"} ${newestSrc.file}. Run \`npm run build\` first.`);
  process.exit(3);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "bodies"), { recursive: true });

const SECRETS = { SESSION_SECRET: "pii-probe-session-secret-00000000000000000", OTP_PEPPER: "pii-probe-otp-pepper-000000", AUDIT_CHAIN_SECRET: "pii-probe-audit-chain-secret-000000000000" };
Object.assign(process.env, SECRETS);
type PgClient = { connect(): Promise<void>; query(q: string, v?: unknown[]): Promise<Any>; end(): Promise<void> };
const pg = pgLib as unknown as { Client: new (o: { connectionString: string }) => PgClient };
const BASE_URL = RAW.replace(/\/[^/?]*(\?.*)?$/, "");
const DB = `platform_pii_probe_${process.pid}`;
{ const a = new pg.Client({ connectionString: RAW }); await a.connect(); await a.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`); await a.query(`CREATE DATABASE "${DB}"`); await a.end(); }
const DATABASE_URL = `${BASE_URL}/${DB}?connect_timeout=30`;
const childEnv = { ...process.env, DATABASE_URL, USE_PRISMA_DAL: "true", ...SECRETS };
const isWin = process.platform === "win32";
const mig = spawnSync("npx", ["prisma", "migrate", "deploy"], { cwd: ROOT, env: childEnv, encoding: "utf8", shell: isWin, timeout: 10 * 60_000 });
ok("0.migrate · every migration applies to the scratch database", mig.status === 0, (mig.stderr ?? "").split("\n").slice(-2).join(" "));
for (const seed of ["scripts/seed-admin-local.mts", "scripts/seed-staff-local.mts"]) {
  const r = spawnSync("npx", ["tsx", seed], { cwd: ROOT, env: childEnv, encoding: "utf8", shell: isWin, timeout: 5 * 60_000 });
  ok(`0.seed · ${seed} seeds the console's accounts`, r.status === 0, (r.stdout ?? "").split("\n").filter(Boolean).slice(-1).join(""));
}

// ── THE SEEDED PII. Every value here is a needle, and none of them is ever part of a request URL (see the echo trap
// in the header). The phone is deliberately clear of every reserved block in scripts/local-staff.mjs:11-13. ──
const PII = {
  displayName: "Zawadi Mwanjelwa Kihanga",
  phoneE164: "+255766540321",
  email: "zawadi.kihanga.w25@example.invalid",
  kycFullName: "Zawadi Mwanjelwa Kihanga",
  idNumber: "19900101000000773311",
  stakeTzs: 73_219,
};
/** The formatted shapes the same stake can reach a page in. A money figure is rendered, not printed raw. */
const STAKE_FORMS = [String(PII.stakeTzs), PII.stakeTzs.toLocaleString("en-US"), PII.stakeTzs.toLocaleString("en-GB")];
/** Benign look-alikes that must NOT fire — the classifier's own negative control (3.needles). */
const BENIGN = ["Zawadi", "Mwanjelwa", "+255766540", "example.invalid", "1990010100000077", "7321", "73,21"];

let server: Any = null;
let w: Any = null;
try {
  if (fail > 0) throw new Error("the scratch database was not prepared");
  process.env.DATABASE_URL = DATABASE_URL;
  process.env.USE_PRISMA_DAL = "true";
  process.env.MARKET_SCHEDULER = "false";
  const { loadWorld } = await import("./lib/house-bot-world.mts");
  w = await loadWorld();
  const CRYPTO: Any = await import("../src/lib/server/crypto.ts");
  const REG: Any = await import("../src/lib/server/session-registry.ts");
  const KYC: Any = await import("../src/lib/server/kyc-service.ts");
  const AUD: Any = await import("../src/lib/server/audit.ts");

  // ── the ADMIN control account (seeded by seed-admin-local at the reserved phone) ──
  const A: string = (await w.db.user.findByPhone("+255700000000"))?.id;
  ok("1.admin · the seeded QA Owner exists and is the control", !!A);

  // ── THE VICTIM: a real player carrying every needle, through the real services ──
  const victim: string = await w.user({ balance: 2_500_000 });
  await w.setUserFields(victim, { displayName: PII.displayName, phoneE164: PII.phoneE164, email: PII.email, region: "TZ", dob: "1990-01-01" });
  const vRow = await w.db.user.findById(victim);
  ok("1.victim · the victim carries the seeded name, phone and email",
    vRow?.displayName === PII.displayName && vRow?.phoneE164 === PII.phoneE164 && vRow?.email === PII.email,
    `${vRow?.displayName} · ${vRow?.phoneE164}`);

  // a real stake through the real service, so a money figure exists on the pages that render money
  const market = await w.poll();
  const bought = await w.svc.buyPosition(victim, { marketId: market.id, side: "YES", stake: PII.stakeTzs, idempotencyKey: `pii_probe_${Date.now()}` });
  ok("1.stake · the victim's stake is placed through the real bet service", !!bought?.ok, JSON.stringify(bought).slice(0, 180));

  // the victim's KYC case, so the identity submission exists to be leaked
  const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  await KYC.startKyc(victim);
  await KYC.submitIdentityStep(victim, { idType: "NIDA", idNumber: PII.idNumber, fullName: PII.kycFullName, dob: "1990-01-01" });
  for (const slot of ["NIDA_FRONT", "NIDA_BACK", "SELFIE"]) await KYC.attachDocument(victim, slot, PNG);
  const kycSubmitted = await KYC.submitForReview(victim);
  ok("1.kyc · the victim's KYC case is submitted", !!kycSubmitted?.ok, JSON.stringify(kycSubmitted).slice(0, 160));
  await AUD.auditFlush();

  // ── the viewers. NON-STAFF ONLY as subjects; the ADMIN is the control, never a subject. ──
  const attacker: string = await w.user({ balance: 10_000 });
  const bystander: string = await w.user({ balance: 10_000 });
  const mint = async (userId: string) => {
    const u = await w.db.user.findById(userId);
    const sessionId = `sess_${CRYPTO.randomId(16)}`;
    await REG.setActiveSessionId(userId, sessionId);
    const now = Date.now();
    return `kp_session=${CRYPTO.signSession({ userId, sessionId, phoneE164: u.phoneE164, role: u.role, kycStatus: u.kycStatus ?? "NOT_STARTED", iat: now, exp: now + 6 * 86_400_000, lastSeenAt: now, playStartedAt: now })}`;
  };
  const viewers: Array<[string, string]> = [["attacker", attacker], ["bystander", bystander], ["victim", victim], ["admin", A]];
  const cookies: Record<string, string> = {};
  for (const [k, id] of viewers) cookies[k] = await mint(id);
  const idOf: Record<string, string> = Object.fromEntries(viewers);

  // ── every admin page from disk; every dynamic segment filled; every tab the page names; every audit filter ──
  const pageRoutes: Array<{ route: string; file: string }> = [];
  const walk = (dir: string, rel: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(dir, e.name), `${rel}/${e.name}`);
      else if (e.name === "page.tsx" || e.name === "page.ts") pageRoutes.push({ route: rel, file: join(dir, e.name) });
    }
  };
  walk(join(ROOT, "src", "app", "admin"), "/admin");
  pageRoutes.sort((x, y) => (x.route < y.route ? -1 : 1));
  const FILL: Record<string, Array<[string, string]>> = {
    "/admin/agents/[id]": [["unknown", "zz_not_a_record_000000000000"]],
    "/admin/ai-polls/[id]": [["unknown", "zz_not_a_record_000000000000"]],
    "/admin/invites/[id]": [["unknown", "zz_not_a_record_000000000000"]],
    "/admin/house/[marketId]": [["market", market.id]],
    "/admin/kyc/[id]": [["victim", victim]],
    "/admin/markets/[id]": [["market", market.id]],
    "/admin/players/[id]": [["victim", victim], ["A", A]],
    "/admin/resolver/[id]": [["market", market.id]],
    "/admin/staff/[id]": [["A", A]],
  };
  const AUDIT_CATEGORIES = [...(readFileSync(join(ROOT, "src/lib/server/audit.ts"), "utf8").match(/export type AuditCategory = ([^;]+);/)?.[1].matchAll(/"([A-Z]+)"/g) ?? [])].map((m) => m[1]);
  const queriesFor = (route: string, file: string) => {
    const code = readFileSync(file, "utf8");
    const tabs = [...new Set([...code.matchAll(/tab === "([a-z-]+)"/g)].map((m) => m[1]))];
    const q = ["", ...tabs.map((t) => `?tab=${t}`)];
    if (route === "/admin/audit") q.push(...AUDIT_CATEGORIES.map((c) => `?category=${c}`), `?actorId=${victim}`);
    if (route === "/admin/resolver-queue") q.push("?window=all");
    return q;
  };
  type RouteRow = { name: string; path: string; segs: unknown[] };
  const ROUTES: RouteRow[] = [];
  const unfilled: string[] = [];
  for (const { route, file } of pageRoutes) {
    const parts = route.split("/").filter(Boolean);
    const dyn = parts.filter((p) => p.startsWith("["));
    const values: Array<[string, string] | null> = dyn.length === 0 ? [null] : (FILL[route] ?? []);
    if (dyn.length > 1 || values.length === 0) { unfilled.push(route); continue; }
    for (const v of values) {
      for (const q of queriesFor(route, file)) {
        ROUTES.push({
          name: `${route}${v ? `<${v[0]}>` : ""}${q.replace(victim, "<victim>")}`,
          path: `/${parts.map((p) => (p.startsWith("[") ? v![1] : p)).join("/")}${q}`,
          segs: parts.map((p) => (p.startsWith("[") ? [p.slice(1, -1), v![1], "d", null] : p)),
        });
      }
    }
  }
  if (unfilled.length) notMeasured("2.routes · dynamic admin routes with no fixture value", unfilled.join(", "));
  ok("2.routes · every admin page is enumerated from disk and requested", pageRoutes.length >= 50 && ROUTES.length >= pageRoutes.length, `${pageRoutes.length} pages · ${ROUTES.length} route instances`);
  const apiRoutes: string[] = [];
  const walkApi = (dir: string, rel: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walkApi(join(dir, e.name), `${rel}/${e.name}`);
      else if (e.name === "route.ts" && /export (async function|const) GET\b/.test(readFileSync(join(dir, e.name), "utf8"))) apiRoutes.push(rel);
    }
  };
  walkApi(join(ROOT, "src", "app", "api", "admin"), "/api/admin");
  const API_FILL: Record<string, string> = {
    "/api/admin/agent-doc": "?app=zz_not_a_record&type=ID",
    "/api/admin/kyc-doc": `?user=${victim}&type=NIDA_FRONT`,
    "/api/admin/updown/symbol-check": "?symbol=BTC/USD",
  };
  const API_PATHS = apiRoutes.flatMap((r) => r === "/api/admin/reports/[id]"
    ? ["/api/admin/reports/audit-trail-export?format=xlsx"]
    : [`${r}${API_FILL[r] ?? ""}`]);

  // ── the server over the fresh build ──
  server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    cwd: ROOT, shell: isWin, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...SECRETS, DATABASE_URL, USE_PRISMA_DAL: "true", DISABLE_ADMIN_TOTP: "true", HOUSE_BOT_ENGINE: "false", MARKET_SCHEDULER: "false", UPDOWN_SCHEDULER: "false", NODE_ENV: "production" },
  });
  let serverLog = "";
  server.stdout?.on("data", (d: unknown) => { serverLog += String(d); });
  server.stderr?.on("data", (d: unknown) => { serverLog += String(d); });
  let up = false;
  for (let i = 0; i < 120 && !up; i++) { await sleep(1_000); try { up = (await fetch(`${BASE}/api/health`)).status < 600; } catch { up = false; } }
  ok("3.server · next start answers on the port this pass owns", up, `port ${PORT}${up ? "" : ` · ${serverLog.slice(-300)}`}`);
  if (!up) throw new Error("the server never came up");

  // ── THE NEEDLES, and the echo strip that keeps them honest ──
  // A needle is a PII VALUE the request never carries. A user id is deliberately NOT a needle: it IS in the URL.
  const NEEDLES: Array<[string, string]> = [
    ["name", PII.displayName], ["phone", PII.phoneE164], ["email", PII.email],
    ["nida", PII.idNumber], ...STAKE_FORMS.map((s, i) => [`stake${i}`, s] as [string, string]),
  ];
  const rootForms = [ROOT, ROOT.replace(/\\/g, "/"), ROOT.replace(/\\/g, "\\\\")];
  /** Blank the host path and THIS request's own path+query out of the body, then look for values the request never sent. */
  const needles = (body: string, requestPath = "") => {
    let text = body;
    for (const r of rootForms) text = text.split(r).join("<root>");
    if (requestPath) {
      for (const form of [requestPath, encodeURIComponent(requestPath), requestPath.split("?")[0], encodeURIComponent(requestPath.split("?")[0])]) {
        if (form) text = text.split(form).join("<req>");
      }
    }
    return [...new Set(NEEDLES.filter(([, v]) => text.includes(v)).map(([k]) => k))];
  };
  ok("3.needles · CONTROL · each PII family is found, and a benign look-alike is not",
    needles(`name ${PII.displayName}`).length === 1
    && needles(`phone ${PII.phoneE164}`).length === 1
    && needles(`nida ${PII.idNumber}`).length === 1
    && needles(`money ${STAKE_FORMS[1]} TZS`).length >= 1
    && BENIGN.every((b) => needles(`benign ${b}`).length === 0),
    `benign checked: ${BENIGN.length}`);
  // ⭐ THE STRIP MUST NOT BE ABLE TO HIDE A REAL DISCLOSURE (4.1c's sibling, proven before the walk, not after).
  ok("3.strip · the echo strip blanks the request but still sees a value the request did not carry",
    needles(`<div>/admin/players/${victim}</div>`, `/admin/players/${victim}`).length === 0
    && needles(`<div>/admin/players/${victim} ${PII.phoneE164}</div>`, `/admin/players/${victim}`).length === 1);

  const treeOf = (segs: unknown[]) => {
    let node: unknown[] = [segs[segs.length - 1], {}];
    for (let i = segs.length - 2; i >= 0; i--) node = [segs[i], { children: node }];
    return ["", { children: node }];
  };
  const fetchFollowingRsc = async (path: string, headers: Record<string, string>) => {
    let url = `${BASE}${path}`;
    let r: Any = null;
    for (let hop = 0; hop < 4; hop++) {
      r = await fetch(url, { headers, redirect: "manual" });
      const loc = r.headers.get("location");
      if (r.status === 307 && loc && /[?&]_rsc=/.test(loc)) { url = new URL(loc, BASE).href; await r.text().catch(() => ""); continue; }
      break;
    }
    return { status: r.status as number, body: await r.text() };
  };
  const fileName = (s: string) => s.replace(/[^A-Za-z0-9_.-]+/g, "_").slice(0, 150);

  const rows: Any[] = [];
  for (const route of ROUTES) {
    for (const [viewer] of viewers) {
      const modes: Array<[string, Record<string, string>]> = [
        ["document", { cookie: cookies[viewer], "sec-fetch-mode": "navigate" }],
        ["flight", { cookie: cookies[viewer], RSC: "1" }],
        ["flight+tree", { cookie: cookies[viewer], RSC: "1", "Next-Router-State-Tree": encodeURIComponent(JSON.stringify(treeOf(route.segs))) }],
      ];
      for (const [mode, headers] of modes) {
        try {
          const r = await fetchFollowingRsc(route.path, headers);
          const hits = needles(r.body, route.path);
          if (hits.length > 0 && viewer !== "admin") writeFileSync(join(OUT, "bodies", `${viewer}-${fileName(route.name)}-${mode.replace("+", "_")}.txt`), r.body);
          rows.push({ viewer, route: route.name, mode, status: r.status, hits });
        } catch (e) { rows.push({ viewer, route: route.name, mode, error: String(e).slice(0, 200) }); }
      }
    }
  }
  for (const path of API_PATHS) {
    for (const [viewer] of viewers) {
      try {
        const r = await fetchFollowingRsc(path, { cookie: cookies[viewer] });
        const hits = needles(r.body, path);
        if (hits.length > 0 && viewer !== "admin") writeFileSync(join(OUT, "bodies", `${viewer}-${fileName(path)}-api.txt`), r.body);
        rows.push({ viewer, route: path, mode: "api", status: r.status, hits });
      } catch (e) { rows.push({ viewer, route: path, mode: "api", error: String(e).slice(0, 200) }); }
    }
  }
  writeFileSync(join(OUT, "results.json"), JSON.stringify(rows, null, 2));

  // ── the verdicts ──
  // The VICTIM is not a subject of 4.1: their own name on their own record is not a disclosure. The subjects are the
  // two unrelated non-staff accounts.
  const SUBJECTS = new Set(["attacker", "bystander"]);
  const nonStaff = rows.filter((r) => SUBJECTS.has(r.viewer));
  const leaks = nonStaff.filter((r) => (r.hits?.length ?? 0) > 0);
  const errored = rows.filter((r) => r.error);
  ok("4.0 · every request completed without a transport error", errored.length === 0, errored.slice(0, 4).map((r) => `${r.viewer} ${r.route} ${r.mode}: ${r.error}`).join(" | "));
  ok(`4.1 · NO non-staff response carries another player's PII (${nonStaff.length} responses, ${leaks.length} carrying)`,
    nonStaff.length > 0 && leaks.length === 0,
    leaks.slice(0, 12).map((r) => `${r.viewer} ${r.route} ${r.mode} ${r.status}: ${r.hits.join("|")}`).join(" | "));
  const apiNonStaff = rows.filter((r) => r.mode === "api" && SUBJECTS.has(r.viewer));
  ok("4.2 · every admin API route refuses a non-staff session outright", apiNonStaff.every((r) => (r.status ?? 0) >= 400),
    apiNonStaff.filter((r) => (r.status ?? 0) < 400).slice(0, 6).map((r) => `${r.viewer} ${r.route} ${r.status}`).join(" | "));

  // 4.3 — THE POSITIVE CONTROL. Only surfaces where the data provably exists may be named here: a control that can
  // never fire makes 4.1 unfalsifiable (the house probe learned this the expensive way, its rulings 315 and D20).
  const adminHitRoutes = new Set(rows.filter((r) => r.viewer === "admin" && (r.hits?.length ?? 0) > 0).map((r) => r.route));
  const MUST_CARRY = ["/admin/players/[id]<victim>", "/admin/kyc/[id]<victim>", "/admin/players"];
  ok("4.3 · CONTROL · the ADMIN does carry the victim's PII on the pages that render it",
    MUST_CARRY.every((r) => adminHitRoutes.has(r)),
    `missing: ${MUST_CARRY.filter((r) => !adminHitRoutes.has(r)).join(", ") || "none"} · ADMIN carries PII on ${adminHitRoutes.size} route instances`);
  const silent = [...new Set(rows.map((r) => r.route))].filter((r) => !adminHitRoutes.has(r)).sort();
  for (const r of silent) notMeasured(`4.nm · ${r}`, "the ADMIN control carries no seeded PII there, so its absence for the other viewers proves nothing about that page");

  // 4.4 — THE COMPLIANCE-TRAIL ASSERTION (blocker 3). No response-body rule can see this one.
  await AUD.auditFlush();
  const pgc = new pg.Client({ connectionString: DATABASE_URL });
  await pgc.connect();
  const forged = await pgc.query(
    `SELECT "actorId", COUNT(*)::int AS n FROM "AuditLog" WHERE action = 'player.record_viewed' AND "actorId" = ANY($1::text[]) GROUP BY "actorId"`,
    [[idOf.attacker, idOf.bystander]],
  );
  await pgc.end();
  const forgedRows: Any[] = forged?.rows ?? [];
  ok("4.4 · no non-staff account wrote itself into the COMPLIANCE trail as the officer who opened a record",
    forgedRows.length === 0,
    forgedRows.map((r) => `${r.actorId} wrote ${r.n} player.record_viewed row(s)`).join(" | "));

  writeFileSync(join(OUT, "summary.json"), JSON.stringify({
    pass, fail, unmeasured, responses: rows.length, nonStaffResponses: nonStaff.length,
    leaks: leaks.map((r) => ({ viewer: r.viewer, route: r.route, mode: r.mode, status: r.status, hits: r.hits })),
    forgedAuditRows: forgedRows, adminCarries: [...adminHitRoutes].sort(), notMeasured: silent,
  }, null, 2));
} catch (e) {
  ok("9.run · the probe completed", false, String((e as Error)?.stack ?? e).slice(0, 400));
} finally {
  if (server?.pid) {
    try { spawnSync("taskkill", ["/T", "/F", "/PID", String(server.pid)], { shell: isWin }); } catch { /* best effort */ }
    await sleep(2_000);
    let stillUp = true;
    try { await fetch(`${BASE}/api/health`); } catch { stillUp = false; }
    ok("5.port · the probe's server is stopped and the port released", !stillUp, `port ${PORT}`);
  }
  try { await w?.prisma?.()?.$disconnect?.(); } catch { /* best effort */ }
  try { const a = new pg.Client({ connectionString: RAW }); await a.connect(); await a.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`); await a.end(); } catch { /* best effort */ }
}
console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — qa:platform-pii-probe: ${pass} passed, ${fail} failed, ${unmeasured} NOT MEASURED`);
process.exit(fail === 0 ? 0 : 1);
