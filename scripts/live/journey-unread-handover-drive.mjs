/**
 * `qa:journey-unread-handover` — G1'S DRIVE: ON A SHARED PHONE, THE NEXT PLAYER NEVER SEES THE LAST PLAYER'S UNREAD
 * COUNT (the Vodacom plan S6, `docs/design-system/v5-2026-09-29-simplified-journey/S6-PLAN.md` amendment A1, "Still
 * owed (1)", after the critic's G1).
 *
 *   KP_BASE=http://localhost:3041 SESSION_SECRET=<the dev server's> npm run qa:journey-unread-handover
 *   … npm run qa:journey-unread-handover -- --prove-red     (the control: a stale count planted in the window is caught)
 *
 * ⭐ THE CASE. AppShell sits in the root layout, and a shared phone takes it through two doors without remounting it: a
 * session that ends mid-visit (E-381: on the next refresh the shell re-renders in place as a guest's, under the
 * session-ended notice) and a sign-in through the header's own link (a Server Action whose redirect is a soft
 * navigation). The journey's two unread counters — the Akaunti tab's dot (`components/journey/journey-tabs.tsx`, mode
 * "poll") and the hub's Arifa row (`components/journey/account/unread-row.tsx`, mode "once") — are keyed by the viewer's
 * id and drop everything the moment it changes (`lib/journey/unread-count.ts`). `test:journey-shell` §6 holds that rule
 * in process; this drive holds what the person holding the phone SEES, in a real browser, on that very path:
 *   §1 player A, signed in and holding a staff preview pass, on /account and then /markets: the dot and the row show
 *      A's count, and it is the server's;
 *   §2 A's session ends through the IDLE path: A's own cookie re-signed 25 h idle with the dev server's SESSION_SECRET
 *      (the way `test:revoked-deadend` §4 does it, with its control), then the refresh /markets' own poller runs on
 *      `50pick:refresh` — the shell re-renders in place as a guest's;
 *   §3 player B signs in through the journey header's "Sign in" link and the real form, and B's FIRST unread answer is
 *      HELD for G1_HOLD_MS (default 4000) — the response, never the request: `route.fetch`, wait, `fulfill` — so the
 *      window in which a stale count could show is seconds wide, not one frame;
 *   §4 B opens Akaunti by its tab, and the Arifa row's first answer is held the same way.
 * Every state the dot (its badge, and the words read with it) and the row (its words and its badge) pass through is
 * recorded by a MutationObserver installed before the page's own scripts, in every document, with the document it was
 * seen in: a one-frame stale render is seen, and a reload in the middle of the path is named.
 *
 * ⭐ THE VERDICT (`judge`, pure; its controls run on synthetic timelines before any browser starts): from A's end until
 * B's sign-in, and from B's sign-in until B's first answer is handed to the page, NO count shows — not A's, not any;
 * once each answer lands, the dot and the row show B's count and never A's; B's signed-in shell was on the page while
 * that answer was held (or the window measured nothing); and the whole path stayed in ONE document — a reload means
 * G1's case never arose, and the run is BLOCKED. A is given five questions and B six, so their counts differ; if they
 * ever agree the run is BLOCKED too, because two equal counts cannot be told apart.
 *
 * ⛔ LOCAL ONLY (`premise`, `live/journey-pass.mjs`): `http://localhost:PORT` exactly, an in-memory dev server started
 * with DISABLE_ADMIN_TOTP=true (the preview door), a rollout a pass can see. It seeds a SUPPORT officer and two password
 * players, gives each player a portfolio through the real money paths (`/api/dev-test/seed-real-markets`,
 * `/api/dev-test/seed-player-portfolio`) and resets the rate limits — never point it at a server another drive is
 * using. It writes no file. Exit 0 = every check holds (with --prove-red: the plant was caught by 3.held and nothing
 * else); 1 = a check failed (or the plant was missed); 2 = refused, blocked, or the verdict's own controls failed.
 */
import { chromium } from "playwright";
import { createHmac } from "node:crypto";
import { premise, mintStaffPass, LOCALE_COOKIE, SESSION_COOKIE } from "./journey-pass.mjs";

const BASE = process.env.KP_BASE ?? "http://localhost:3041";
const ORIGIN = (() => {
  try {
    return new URL(BASE).origin;
  } catch {
    return "";
  }
})();
const PROVE_RED = process.argv.includes("--prove-red");
/** How long each first answer of B's is held before it is handed to the page. Never under 1.5 s: the plant needs room. */
const HOLD_MS = Math.max(1500, Number(process.env.G1_HOLD_MS ?? 4000) || 4000);
/** The dev server's own secret, or its development default: the idle path re-signs a real cookie with it. */
const SECRET = process.env.SESSION_SECRET || "dev-only-secret-replace-in-prod-32chars-minimum";
const NL = String.fromCharCode(10);
const msg = (e) => String(e?.message ?? e).split(NL)[0].slice(0, 240);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/** The shared phone's two players: local fixtures on a disposable in-memory store, each with questions of its own. */
const A = { phone: "+255700000061", name: "G1 Reader A", markets: 5 };
const B = { phone: "+255700000062", name: "G1 Reader B", markets: 6 };
const PASSWORD = "QaG1Reader2026!";
/** Past the 24-hour idle limit (`src/lib/server/session.ts`), with an hour to spare. */
const IDLE_MS = 25 * 3600_000;
const DEVICE_COPY = "signed in on another device";

class Blocked extends Error {}
/** A premise the drive cannot measure without: thrown, reported as BLOCKED (exit 2), never as a pass. */
const block = (why) => {
  throw new Blocked(why);
};

const results = [];
const ok = (id, name, pass, detail = "") => {
  results.push(!!pass);
  console.log(`  ${pass ? "PASS" : "FAIL"} ${id} ${name}${detail ? ` — ${detail}` : ""}`);
  return !!pass;
};

/** The first number in a text, or null. */
const numberIn = (text) => {
  const m = /(\d+)/.exec(String(text ?? ""));
  return m ? Number(m[1]) : null;
};
/** What a recorded state shows: the dot's count (its badge, or its words) and the row's (its words, or its badge). */
const countsOf = (s) => {
  const out = [];
  if (s.dot || s.dotWords) out.push(`dot ${numberIn(s.dotWords) ?? "?"}`);
  if (s.rowWords || s.rowBadge) out.push(`row ${numberIn(s.rowWords) ?? numberIn(s.rowBadge) ?? "?"}`);
  return out;
};
/** The unread total in a Server Action answer of `fetchMyNotifications`, or null when the body is not that answer. */
const unreadIn = (body) => {
  const text = String(body ?? "");
  if (!text.includes('"items":[')) return null;
  const m = /"unread":(\d+)/.exec(text);
  return m ? Number(m[1]) : null;
};
/** A session cookie as the server signs one (`signSession`, `src/lib/server/crypto.ts`). */
const sign = (payload) => {
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${b64}.${createHmac("sha256", SECRET).update(b64).digest("base64url")}`;
};

/**
 * THE VERDICT, pure: what the recorded states must show. `marks` are ms epochs the drive sets — `refreshed` (A's idle
 * refresh dispatched), `submitted` (B's sign-in sent), `dotLanded` and `rowLanded` (the moment each first answer of B's
 * is handed to the page). A's end is read from the states themselves: the first one after the refresh that shows the
 * session-ended notice over a guest's journey header. One { id, name, pass, detail } per check.
 */
function judge({ samples, nA, nB, marks }) {
  const list = [...samples].sort((x, y) => x.t - y.t);
  const ended = list.find((s) => marks.refreshed !== null && s.t >= marks.refreshed && s.notice && s.journey && !s.signedIn) ?? null;
  const rel = (s) => `+${s.t - (ended?.t ?? marks.refreshed ?? s.t)}ms ${s.path}`;
  const within = (from, to) => (from === null || from === undefined ? [] : list.filter((s) => s.t >= from && (to === null || to === undefined || s.t < to)));
  const showing = (states) => states.filter((s) => countsOf(s).length > 0).map((s) => `${rel(s)} ${countsOf(s).join(", ")}`);
  const out = [];
  const add = (id, name, pass, detail = "") => out.push({ id, name, pass: !!pass, detail: pass ? "" : detail });

  add("1.end", "A's session ended through the idle path, in place: the session-ended notice over a guest's journey header, naming the 24-hour rule and not another device",
    !!ended && ended.noticeText.includes("24") && !ended.noticeText.toLowerCase().includes(DEVICE_COPY),
    ended ? `notice: "${ended.noticeText.slice(0, 120)}"` : "no state after the refresh showed the notice over a guest's journey header");

  const guest = showing(within(ended?.t ?? null, marks.submitted));
  add("2.guest", "from A's end until B's sign-in was sent, no count showed — not on the Akaunti tab, not on the Arifa row",
    !!ended && guest.length === 0, guest.slice(0, 6).join(" · "));

  const heldStates = within(marks.submitted, marks.dotLanded);
  const held = showing(heldStates);
  add("3.held", `from B's sign-in until B's first answer was handed to the page, no count showed — never A's (${nA})`,
    marks.dotLanded !== null && held.length === 0, held.slice(0, 6).join(" · "));
  add("3.seen", "B's signed-in journey shell was on the page while that answer was held — the window measured something",
    heldStates.some((s) => s.path === "/" && s.journey && s.signedIn && s.rail),
    `${heldStates.length} state(s) recorded in the window, none of them B's signed-in shell on /`);

  const afterDot = within(marks.dotLanded, null).filter((s) => s.dot || s.dotWords);
  const wrongDot = afterDot.filter((s) => numberIn(s.dotWords) !== nB).map((s) => `${rel(s)} dot ${numberIn(s.dotWords) ?? "?"}`);
  add("4.dot", `once B's answer landed, the Akaunti dot showed B's count (${nB}) and never A's (${nA})`,
    marks.dotLanded !== null && afterDot.length > 0 && wrongDot.length === 0,
    afterDot.length === 0 ? "the dot never showed B's count" : wrongDot.slice(0, 6).join(" · "));

  const firstAccount = list.find((s) => marks.submitted !== null && s.t >= marks.submitted && s.path === "/account") ?? null;
  const rowHeld = within(firstAccount?.t ?? null, marks.rowLanded).filter((s) => s.path === "/account");
  const rowEarly = rowHeld.filter((s) => s.rowWords || s.rowBadge).map((s) => `${rel(s)} row ${numberIn(s.rowWords) ?? numberIn(s.rowBadge) ?? "?"}`);
  add("5.row.held", "on /account, until the row's first answer was handed over, the Arifa row was drawn and showed no count",
    marks.rowLanded !== null && rowHeld.some((s) => s.row) && rowEarly.length === 0,
    !rowHeld.some((s) => s.row) ? "the row was never seen before its answer landed" : rowEarly.slice(0, 6).join(" · "));

  const afterRow = within(marks.rowLanded, null).filter((s) => s.path === "/account" && (s.rowWords || s.rowBadge));
  const wrongRow = afterRow
    .filter((s) => (numberIn(s.rowWords) ?? numberIn(s.rowBadge)) !== nB || (!!s.rowBadge && numberIn(s.rowBadge) !== nB))
    .map((s) => `${rel(s)} row ${numberIn(s.rowWords) ?? "?"}/${s.rowBadge || "-"}`);
  add("5.row", `once it landed, the Arifa row showed B's count (${nB}) and never A's (${nA})`,
    marks.rowLanded !== null && afterRow.length > 0 && wrongRow.length === 0,
    afterRow.length === 0 ? "the row never showed B's count" : wrongRow.slice(0, 6).join(" · "));

  const docA = marks.refreshed === null ? null : (list.filter((s) => s.t < marks.refreshed && s.path === "/markets").at(-1)?.doc ?? null);
  const strays = within(marks.refreshed, null).filter((s) => s.doc !== docA).map((s) => `${rel(s)} in another document`);
  add("6.doc", "the whole path, from A's /markets to B's /account, stayed in ONE document — the case G1 names (no reload)",
    docA !== null && strays.length === 0, docA === null ? "A's /markets document was never recorded" : strays.slice(0, 3).join(" · "));
  return out;
}

/**
 * The verdict's own controls: a clean synthetic timeline passes every check, and each planted defect fails its own
 * check and no other. Returns what is wrong (empty = the verdict can be trusted).
 */
function judgeControls() {
  const st = (t, path, o = {}) => ({ t, doc: "d1", path, notice: false, noticeText: "", journey: true, signedIn: true, rail: true, dot: false, dotWords: "", row: false, rowWords: "", rowBadge: "", ...o });
  const idle = "Signed out. For your security, a sign-in ends after 24 hours without activity, and after 7 days at most.";
  const clean = () => [
    st(-500, "/account", { doc: "d0", dot: true, dotWords: ", 6 unread", row: true, rowWords: ", 6 unread", rowBadge: "6" }),
    st(10, "/markets", { dot: true, dotWords: ", 6 unread" }),
    st(100, "/markets", { signedIn: false, notice: true, noticeText: idle }),
    st(200, "/auth/login", { signedIn: false }),
    st(300, "/"),
    st(500, "/", { dot: true, dotWords: ", 8 unread" }),
    st(600, "/account", { dot: true, dotWords: ", 8 unread", row: true }),
    st(800, "/account", { dot: true, dotWords: ", 8 unread", row: true, rowWords: ", 8 unread", rowBadge: "8" }),
  ];
  const marks = { refreshed: 50, submitted: 250, dotLanded: 450, rowLanded: 700 };
  const failing = (samples) => judge({ samples, nA: 6, nB: 8, marks }).filter((c) => !c.pass).map((c) => c.id);
  const plants = [
    ["a clean timeline", (s) => s, []],
    ["A's count on the dot while B's answer is held", (s) => [...s, st(350, "/", { dot: true, dotWords: ", 6 unread" })], ["3.held"]],
    ["A's count on the dot after A's end", (s) => [...s, st(150, "/markets", { signedIn: false, dot: true, dotWords: ", 6 unread" })], ["2.guest"]],
    ["no signed-in shell while the answer is held", (s) => s.filter((x) => x.t !== 300), ["3.seen"]],
    ["A's count on the dot after B's answer", (s) => [...s, st(520, "/", { dot: true, dotWords: ", 6 unread" })], ["4.dot"]],
    ["a row badge before the row's answer", (s) => [...s, st(650, "/account", { dot: true, dotWords: ", 8 unread", row: true, rowBadge: "6" })], ["5.row.held"]],
    ["A's count on the row after its answer", (s) => s.map((x) => (x.t === 800 ? { ...x, rowWords: ", 6 unread", rowBadge: "6" } : x)), ["5.row"]],
    ["a reload in the middle of the path", (s) => s.map((x) => (x.t >= 300 ? { ...x, doc: "d2" } : x)), ["6.doc"]],
    ["the displaced notice instead of the idle one", (s) => s.map((x) => (x.t === 100 ? { ...x, noticeText: "Signed out. Your account was signed in on another device." } : x)), ["1.end"]],
  ];
  const wrong = [];
  for (const [what, plant, expect] of plants) {
    const got = failing(plant(clean()));
    if (got.join(",") !== expect.join(",")) wrong.push(`${what}: failed [${got.join(", ") || "nothing"}], expected [${expect.join(", ") || "nothing"}]`);
  }
  return wrong;
}

/** In every document of the page, before its own scripts: records each state the dot and the row pass through. */
const RECORDER = () => {
  if (window.top !== window) return;
  const doc = Math.random().toString(36).slice(2, 10);
  const words = (el) => (el ? [...el.querySelectorAll(".sr-only")].map((x) => x.textContent || "").join(" ").trim() : "");
  const snap = () => {
    if (!document.body) return null;
    const tab = document.querySelector('nav[data-testid="journey-tabs"] a[href="/account"]');
    const row = document.querySelector('a.kp-hub__row[href="/notifications"]');
    const notice = document.querySelector('[data-testid="session-ended-notice"]');
    const badge = row ? [...row.querySelectorAll("span[aria-hidden]")].map((x) => (x.textContent || "").trim()).find((x) => /^\d+\+?$/.test(x)) || "" : "";
    return {
      doc,
      path: location.pathname,
      notice: !!notice,
      noticeText: notice ? (notice.textContent || "").replace(/\s+/g, " ").trim().slice(0, 240) : "",
      journey: !!document.querySelector('header[data-testid="journey-top-bar"]'),
      signedIn: !!document.querySelector('[data-testid="journey-balance"]'),
      rail: !!document.querySelector('nav[data-testid="journey-tabs"]'),
      dot: !!(tab && tab.querySelector(".kp-rail__badge")),
      dotWords: words(tab),
      row: !!row,
      rowWords: words(row),
      rowBadge: badge,
    };
  };
  window.__kpG1Snap = snap;
  const queue = [];
  let last = "";
  const flush = () => {
    if (typeof window.__kpG1Record !== "function") return;
    while (queue.length) {
      try {
        window.__kpG1Record(queue.shift());
      } catch {
        return;
      }
    }
  };
  const send = () => {
    flush();
    const s = snap();
    if (!s) return;
    const key = JSON.stringify(s);
    if (key === last) return;
    last = key;
    queue.push({ ...s, t: Date.now() });
    flush();
  };
  const start = () => {
    if (!document.documentElement || !document.body) {
      setTimeout(start, 10);
      return;
    }
    new MutationObserver(send).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
    send();
    setInterval(send, 50);
  };
  start();
};

/** --prove-red: A's count drawn onto the Akaunti tab inside the held window, and taken away before the answer lands. */
async function plantStale(page, n) {
  await page.evaluate((count) => {
    const tab = document.querySelector('nav[data-testid="journey-tabs"] a[href="/account"]');
    if (!tab) return;
    const dot = document.createElement("span");
    dot.className = "kp-rail__badge";
    dot.setAttribute("data-kp-g1-plant", "");
    (tab.querySelector(".kp-rail__pip") ?? tab).appendChild(dot);
    const said = document.createElement("span");
    said.className = "sr-only";
    said.setAttribute("data-kp-g1-plant", "");
    said.textContent = `, ${count} unread`;
    tab.appendChild(said);
  }, n).catch(() => {});
  await sleep(400);
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("[data-kp-g1-plant]")) el.remove();
  }).catch(() => {});
  await sleep(200);
}

console.log(`qa:journey-unread-handover — ${BASE}${PROVE_RED ? "  (--prove-red)" : ""}`);
{
  const { refuse } = await premise(BASE);
  if (refuse) {
    console.error(`REFUSED — ${refuse}`);
    process.exit(2);
  }
}

console.log(`${NL}§0 · the verdict's own controls (synthetic timelines, in process)`);
{
  const wrong = judgeControls();
  ok("0.1", "a clean timeline passes every check, and each planted defect fails its own check and no other", wrong.length === 0, wrong.join(" · "));
  if (wrong.length) {
    console.log(`${NL}BLOCKED — the verdict cannot be trusted, so no browser was started.`);
    process.exit(2);
  }
}

const samples = [];
const marks = { refreshed: null, submitted: null, dotLanded: null, toAccount: null, rowLanded: null };
/** Every unread answer A's page was given (learned by listening, never intercepted). */
const answersA = [];
/** Every answer of B's that was held, with what it said and when it was handed over. */
const heldAnswers = [];
const pageErrors = [];
const routeErrors = [];
/** The Server Action id of the unread read, learned from A's answers: only that action is ever held. */
let unreadAction = null;
let nA = null;
let nB = null;
let stopped = null;

/** Learns the unread read's action id from the answers A's page is given, and keeps what each said. */
async function learn(res) {
  try {
    const req = res.request();
    if (req.method() !== "POST") return;
    const action = req.headers()["next-action"];
    if (!action) return;
    const unread = unreadIn(await res.text());
    if (unread === null) return;
    if (!unreadAction) unreadAction = action;
    if (marks.submitted === null) answersA.push({ t: Date.now(), path: new URL(req.url()).pathname, unread });
  } catch {
    // a response that closed early teaches nothing
  }
}

const browser = await chromium.launch({ headless: true });
try {
  console.log(`${NL}§0 · the doors: a staff preview pass, and two players with questions of their own`);
  await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST" }).catch(() => null);
  const pass = await mintStaffPass(browser, BASE).catch((e) => block(`no staff preview pass: ${msg(e)}`));
  const post = async (ctx, path, data) => {
    const res = await ctx.request.post(`${BASE}${path}`, { data, timeout: 240_000 });
    const body = await res.json().catch(() => null);
    if (!res.ok() || !body || body.ok === false) block(`${path} answered ${res.status()}: ${JSON.stringify(body).slice(0, 200)}`);
    return body;
  };
  // B first, in a context of its own (seeding signs that context in as B), with SIX questions.
  const seedB = await browser.newContext();
  try {
    await post(seedB, "/api/dev-test/seed-admin", { role: "PLAYER", phone: B.phone, password: PASSWORD, name: B.name });
    await post(seedB, "/api/dev-test/seed-real-markets", {});
    const pb = await post(seedB, "/api/dev-test/seed-player-portfolio", { markets: B.markets });
    console.log(`  B: ${pb.placed} question(s)${pb.refusals?.length ? ` · ${pb.refusals.length} refusal(s): ${pb.refusals.slice(0, 2).join(" | ")}` : ""}`);
  } finally {
    await seedB.close().catch(() => {});
  }
  // A in the context the whole path runs in — the shared phone: the pass, English, a 360 phone — with FIVE questions.
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  await ctx.addCookies([pass, { name: LOCALE_COOKIE, value: "en", url: BASE }]);
  await post(ctx, "/api/dev-test/seed-admin", { role: "PLAYER", phone: A.phone, password: PASSWORD, name: A.name });
  const pa = await post(ctx, "/api/dev-test/seed-player-portfolio", { markets: A.markets });
  console.log(`  A: ${pa.placed} question(s)${pa.refusals?.length ? ` · ${pa.refusals.length} refusal(s): ${pa.refusals.slice(0, 2).join(" | ")}` : ""}`);

  const page = await ctx.newPage();
  page.on("pageerror", (e) => pageErrors.push(msg(e)));
  await page.exposeBinding("__kpG1Record", (_source, state) => {
    if (state && typeof state === "object") samples.push(state);
  });
  await page.addInitScript(RECORDER);
  page.on("response", (res) => {
    void learn(res);
  });
  const snapNow = () => page.evaluate(() => (window.__kpG1Snap ? window.__kpG1Snap() : null)).catch(() => null);
  const shows = (field, n) => page.waitForFunction(([key, want]) => {
    const s = window.__kpG1Snap ? window.__kpG1Snap() : null;
    const m = s ? /(\d+)/.exec(s[key]) : null;
    return !!m && Number(m[1]) === want;
  }, [field, n], { timeout: 30_000 }).then(() => true).catch(() => false);

  console.log(`${NL}§1 · player A, signed in through the pass: the dot and the row show A's count`);
  await page.goto(`${BASE}/account`, { waitUntil: "domcontentloaded", timeout: 240_000 });
  await page.waitForFunction(() => {
    const s = window.__kpG1Snap ? window.__kpG1Snap() : null;
    return !!s && s.dot && !!s.dotWords && !!s.rowWords;
  }, null, { timeout: 120_000 }).catch(() => {});
  const a = await snapNow();
  nA = numberIn(a?.dotWords);
  const rowA = numberIn(a?.rowWords);
  const served = answersA.filter((x) => x.path === "/account").map((x) => x.unread);
  ok("1.a", "A's count shows on the Akaunti dot and on the Arifa row, one number, and it is the server's answer",
    nA !== null && nA >= 1 && rowA === nA && served.includes(nA), `dot ${nA ?? "-"} · row ${rowA ?? "-"} · server ${served.join("/") || "-"}`);
  if (!(nA !== null && nA >= 1 && rowA === nA)) block(`A's count never showed (dot ${nA ?? "-"}, row ${rowA ?? "-"}) — the seed left A nothing unread, or the journey's counters never mounted`);
  if (!unreadAction) block("the unread read was never seen as a Server Action answer, so B's first answer could not be held");
  await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 240_000 });
  const onMarkets = await shows("dotWords", nA);
  ok("1.b", "on /markets — whose poller ends the session in place — A's dot shows A's count", onMarkets);
  if (!onMarkets) block("A's dot never showed on /markets, so nothing could have been left over for B");
  await sleep(800);

  console.log(`${NL}§2 · A's session ends through the idle path, in place`);
  const real = (await ctx.cookies(BASE)).find((c) => c.name === SESSION_COOKIE);
  if (!real) block(`A holds no ${SESSION_COOKIE} cookie`);
  const payload = JSON.parse(Buffer.from(real.value.split(".")[0], "base64url").toString("utf8"));
  await ctx.addCookies([{ ...real, value: sign(payload) }]);
  const who = await ctx.request.get(`${BASE}/api/dev-test/whoami`).then((r) => r.json()).catch(() => null);
  const secretOk = who?.ok === true && who?.session?.userId === payload.userId;
  ok("2.0", "control · A's own cookie, re-signed unchanged, is still A's session: SESSION_SECRET is the dev server's", secretOk, secretOk ? "" : "run with the dev server's SESSION_SECRET");
  if (!secretOk) block("the re-signed cookie was refused, so the idle path cannot be driven — pass the dev server's SESSION_SECRET");
  await ctx.addCookies([{ ...real, value: sign({ ...payload, lastSeenAt: Date.now() - IDLE_MS }) }]);
  marks.refreshed = Date.now();
  await page.evaluate(() => window.dispatchEvent(new Event("50pick:refresh")));
  const endedSeen = await page.waitForFunction(() => {
    const s = window.__kpG1Snap ? window.__kpG1Snap() : null;
    return !!s && s.notice && s.journey && !s.signedIn;
  }, null, { timeout: 60_000 }).then(() => true).catch(() => false);
  if (!endedSeen) block("the idle refresh never re-rendered the shell as a guest's under the session-ended notice");
  // The guest interval: a count left over from A has time to show itself here.
  await sleep(1500);

  console.log(`${NL}§3 · player B signs in through the header's own link; B's first answer is held ${HOLD_MS} ms`);
  const windows = new Map();
  await page.route((url) => url.origin === ORIGIN, async (route) => {
    const req = route.request();
    try {
      if (marks.submitted === null || req.method() !== "POST" || req.headers()["next-action"] !== unreadAction) {
        await route.fallback();
        return;
      }
      // The row's window opens once B has gone to /account by the tab; every earlier read is the dot's, whatever URL the
      // router had reached when the counter mounted.
      const kind = marks.toAccount !== null && new URL(req.url()).pathname === "/account" ? "row" : "dot";
      const first = !windows.has(kind);
      if (first) windows.set(kind, { until: Date.now() + HOLD_MS });
      const held = windows.get(kind);
      if (Date.now() >= held.until) {
        await route.fallback();
        return;
      }
      const res = await route.fetch();
      const body = await res.text();
      if (first && PROVE_RED && kind === "dot") await plantStale(page, nA);
      await sleep(Math.max(0, held.until - Date.now()));
      const handedAt = Date.now();
      if (kind === "dot" && marks.dotLanded === null) marks.dotLanded = handedAt;
      if (kind === "row" && marks.rowLanded === null) marks.rowLanded = handedAt;
      heldAnswers.push({ kind, path: new URL(req.url()).pathname, unread: unreadIn(body), handedAt });
      await route.fulfill({ response: res, body });
    } catch (e) {
      routeErrors.push(msg(e));
      await route.continue().catch(() => {});
    }
  });
  await page.locator('header[data-testid="journey-top-bar"] a[href="/auth/login"]').first().click();
  await page.waitForURL((url) => url.pathname === "/auth/login", { timeout: 120_000 });
  const field = page.locator("#identifier");
  await field.waitFor({ timeout: 120_000 });
  const local = B.phone.replace("+255", "");
  let synced = false;
  for (let round = 0; round < 8 && !synced; round++) {
    await field.fill(local);
    synced = await page.waitForFunction((want) => document.querySelector('input[name="identifier"]')?.value === want, local, { timeout: 1500 })
      .then(() => true).catch(() => false);
  }
  if (!synced) block("the sign-in form's phone field never synced its hidden value");
  await page.fill('input[type="password"]', PASSWORD);
  marks.submitted = Date.now();
  await page.locator('form:has(input[type="password"]) button[type="submit"]').first().click();
  await page.waitForURL((url) => url.pathname === "/", { timeout: 120_000 }).catch(() => {});
  for (const t0 = Date.now(); marks.dotLanded === null && Date.now() - t0 < 60_000; ) await sleep(100);
  if (marks.dotLanded === null) block("B's shell never asked for B's count on / — after the sign-in the journey's rail did not mount B's counter");
  nB = heldAnswers.find((h) => h.kind === "dot")?.unread ?? null;
  if (nB === null || nB < 1) block(`B's first answer carried no unread count (${nB ?? "none"}) — the seed left B nothing unread`);
  if (nB === nA) block(`A and B both have ${nA} unread — two equal counts cannot be told apart`);
  await shows("dotWords", nB);
  await sleep(800);

  console.log(`${NL}§4 · B opens Akaunti by its tab; the Arifa row's first answer is held the same way`);
  marks.toAccount = Date.now();
  await page.locator('nav[data-testid="journey-tabs"] a[href="/account"]').first().click();
  await page.waitForURL((url) => url.pathname === "/account", { timeout: 120_000 }).catch(() => {});
  for (const t0 = Date.now(); marks.rowLanded === null && Date.now() - t0 < 60_000; ) await sleep(100);
  if (marks.rowLanded === null) block("the Arifa row never asked for B's count on /account");
  await shows("rowWords", nB);
  await sleep(800);
} catch (e) {
  stopped = e instanceof Blocked ? { blocked: true, why: e.message } : { blocked: false, why: msg(e) };
} finally {
  await browser.close().catch(() => {});
}

if (stopped?.blocked) {
  console.log(`${NL}BLOCKED — ${stopped.why}${NL}  Nothing about G1's case was measured; this is not a pass.`);
  process.exit(2);
}
if (stopped) {
  console.log(`${NL}FAIL — the drive stopped before its verdict: ${stopped.why}`);
  process.exit(1);
}

console.log(`${NL}§5 · the verdict over ${samples.length} recorded state(s) — A's count ${nA}, B's ${nB}`);
const checks = judge({ samples, nA, nB, marks });
for (const c of checks) ok(c.id, c.name, c.pass, c.detail);
ok("7.errors", "no uncaught page error on the path", pageErrors.length === 0, pageErrors.slice(0, 2).join(" | "));
ok("7.route", "every held answer was handed over intact", routeErrors.length === 0, routeErrors.slice(0, 2).join(" | "));

console.log(`${NL}§R · the recorded path, in ms from the idle refresh (only where what is shown changes)`);
{
  const zero = marks.refreshed ?? 0;
  const lines = [];
  let previous = "";
  for (const s of [...samples].sort((x, y) => x.t - y.t)) {
    if (s.t < zero - 3000) continue;
    const said = `${s.path} · ${s.journey ? (s.signedIn ? "a signed-in journey shell" : "a guest's journey shell") : "no journey shell"}${s.notice ? " · the session-ended notice" : ""}${countsOf(s).length ? ` · ${countsOf(s).join(", ")}` : ""}`;
    if (said === previous) continue;
    previous = said;
    lines.push([s.t, said]);
  }
  for (const [name, t] of Object.entries(marks)) if (t !== null) lines.push([t, `← ${name}`]);
  for (const [t, said] of lines.sort((x, y) => x[0] - y[0]).slice(0, 60)) console.log(`  ${String(t - zero).padStart(7)}  ${said}`);
}

const doc = checks.find((c) => c.id === "6.doc");
if (doc && !doc.pass) {
  console.log(`${NL}BLOCKED — the path left its document (${doc.detail}): G1's case, a shell that survives the sign-out and the sign-in, never arose.`);
  process.exit(2);
}
if (PROVE_RED) {
  const failedIds = checks.filter((c) => !c.pass).map((c) => c.id);
  const caught = failedIds.includes("3.held");
  const alone = failedIds.every((id) => id === "3.held") && pageErrors.length === 0 && routeErrors.length === 0;
  const others = failedIds.filter((id) => id !== "3.held");
  console.log(`${NL}RED · journey-unread-handover — A's count (${nA}) drawn on the Akaunti dot while B's first answer was held: ${
    caught ? (alone ? "CAUGHT by 3.held, and by nothing else" : `caught by 3.held, but the run also failed ${others.join(", ") || "on a page or route error"}`) : "MISSED"}`);
  process.exit(caught && alone ? 0 : 1);
}
const failedCount = results.filter((r) => !r).length;
console.log(`${NL}${results.length - failedCount}/${results.length} passed — qa:journey-unread-handover`);
process.exit(failedCount ? 1 : 0);
