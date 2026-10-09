// S6 A8i DRIVE — Enter acts only where it is pressed (DESIGN_AUTHORITY §A8, VODACOM-PLAN §0h point 57): real keys in a
// real browser, Swahili, 390 px, on a local in-memory dev server; today's look, and the journey's with a staff pass.
// usage (via run-with-server.sh, a FRESH server for each mode): node enter-drive.mjs <outDir> <main|control>
//   main — the rule holds. Every decisive Enter on the Sell confirm is pressed inside its 10 s quote hold (checked: past
//   the hold the confirm's old listener stood down by itself, so a later press would prove nothing).
//     S  /positions?tab=open, ticket 1: Enter on Sell opens the confirm with focus on "Uza · TZS …"; Tab reaches "Hifadhi
//        nafasi" (today's keep button; the classic Sell confirm has no "Ghairi"); Enter → the confirm closes, no sale
//        request, the balance unchanged, the ticket still on the open lens.
//     J  the journey look (staff pass), /positions, ticket 1: the same, its keep button "Baki na tiketi".
//     K  /positions?tab=open, ticket 1: Enter HELD on "Hifadhi nafasi" → the confirm closes and STAYS closed: the held
//        key's repeats end with the dialog it was pressed in (without the hold they pressed the Sell button the confirm
//        gave focus back to, and the confirm opened again under the player's finger).
//     W  /positions?tab=open, ticket 2: the Sell confirm open, a win seal dispatched over it (window 50pick:celebrate,
//        { kind: "WIN", amount: 5000, net: 3500, label: "drive", ack }), focus in the seal on "Endelea"; Enter → the seal
//        closes, the Sell confirm is still open, no sale request, the balance unchanged.
//     W2 the same, and a second Enter about 60 ms after the first, while the seal is still leaving (its exit still drawn,
//        focus already back on "Uza · TZS …") → nothing sold, the confirm still open.
//     PW the same seal over the confirm, the seal's heading clicked (focus on the page itself, two dialogs on screen);
//        Enter → nothing: both dialogs still up, no sale request.
//     R  /positions?tab=open, ticket 4: Enter HELD on Sell — the first press opens the confirm, the browser's repeats land
//        on "Uza · TZS …" → nothing sold, the confirm still open (VODACOM-PLAN point 37 (d)).
//     P  /positions?tab=open, ticket 4: the confirm open, its question clicked (focus on the page itself, the one dialog
//        on screen); Enter sells, once: one sale request, "Imerudishwa", the balance up by exactly the confirmed figure,
//        the ticket gone from the open lens.
//     B  a live question the player holds no open ticket on, /markets/<id>?side=YES, stake 1,000: Enter on "Weka …"
//        opens the bet confirm with focus on "Thibitisha · TZS 1,000"; Tab reaches "Ghairi"; Enter → it closes, no bet
//        request, the balance unchanged.
//     F  the same question: the bet confirmed by a click and its request aborted (an answer that never comes: retryable)
//        → the result with "Jaribu tena" focused; Tab reaches "Funga"; Enter → the result closes and no second bet
//        request goes out (before A8i that Enter placed the bet again).
//     BE the same question: Enter on the confirm's own "Thibitisha · TZS 1,000" places the bet, once: one bet request,
//        and the receipt ("Endelea kutabiri").
//     E  /positions?tab=open, ticket 3: Enter on the confirm's own "Uza · TZS …" sells, once: one sale request, the result
//        "Imerudishwa", the balance up by exactly the confirmed figure, the ticket gone from the open lens.
//   control — the same cases in the same order, each with a defect planted IN THE PAGE by an init script (nothing in the
//   repository changes), and every sale or bet request the page sends counted and then ABORTED, so no ticket or
//   shilling moves and every case keeps its ticket: S, J, K, W, W2, PW, R, B and F under the rule before A8i (an Enter
//   pressed anywhere confirms the open money dialog — its "· TZS" confirm, else a failure's "Jaribu tena" — and cancels
//   the focused control's own Enter); E and BE with Enter on their confirm stopped before any listener hears it; P with
//   an Enter on the page itself stopped the same way. Every stage must hold and every check must FAIL, so each check is
//   shown able to see the defect it is there for (W2's stage then asks only that both Enters were pressed: the old rule
//   sells on the first).
// ⛔ Local in-memory dev server only (premise refuses anything else). No backslash is typed in this file.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const repoRequire = createRequire("C:/kipindi-journey/package.json");
const { chromium } = repoRequire("playwright");
const { premise, mintStaffPass, demoSession, LOCALE_COOKIE } = await import("file:///C:/kipindi-journey/scripts/live/journey-pass.mjs");

const base = process.env.KP_BASE ?? "http://localhost:3041";
const OUT = process.argv[2] ?? "a8i-enter-drive-out";
const MODE = process.argv[3] ?? "main";
if (MODE !== "main" && MODE !== "control") { console.log(`usage: node enter-drive.mjs <outDir> <main|control> — got ${MODE}`); process.exit(2); }
mkdirSync(OUT, { recursive: true });
const p0 = await premise(base);
if (p0.refuse) { console.log(`REFUSED: ${p0.refuse}`); process.exit(2); }

const NL = String.fromCharCode(10);
const HOLD_MS = 8000;
const report = [];
let failures = 0;
const say = (s) => { report.push(s); console.log(s); };
const ok = (label, cond, detail = "") => { if (!cond) failures += 1; say(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`); };
const shot = async (page, name) => { await page.screenshot({ path: `${OUT}/${MODE}-${name}.png` }).catch(() => {}); };
const amountIn = (s) => { const m = /[0-9][0-9,]*/.exec(String(s ?? "")); return m ? Number(m[0].split(",").join("")) : null; };
const missing = (why) => ({ stage: false, why, pass: false, got: "" });

// Every keydown the page sees, at the window before anything else: its key, whether the keyboard repeated it, where it
// was pressed, and whether a dialog was then still leaving (its role kept, aria-hidden taken, its exit still drawn).
const RECORDER = () => {
  const WS = new RegExp("[" + String.fromCharCode(32, 9, 10, 13, 160) + "]+", "g");
  const rec = { keys: [] };
  window.__a8i = rec;
  window.addEventListener("keydown", (e) => {
    const t = e.target;
    const inDialog = !!(t && t.closest && t.closest('[aria-modal="true"]'));
    const text = t && t !== document.body ? (t.textContent || "").replace(WS, " ").trim().slice(0, 40) : "<body>";
    const leaving = !!document.querySelector('[role="dialog"][aria-hidden="true"], [role="alertdialog"][aria-hidden="true"]');
    rec.keys.push({ key: e.key, repeat: e.repeat, inDialog, text, leaving });
  }, true);
};

// CONTROL · the rule before A8i, planted in the page: a window listener that acts wherever focus is, as the dialogs' did.
const OLD_RULE = () => {
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const buttons = Array.from(document.querySelectorAll('[aria-modal="true"] button')).filter((b) => !b.disabled);
    const confirm = buttons.find((b) => /·.{0,3}TZS/.test(b.textContent || "")) || buttons.find((b) => (b.textContent || "").trim() === "Jaribu tena");
    if (!confirm) return;
    e.preventDefault();
    confirm.click();
  });
};
// CONTROL · a confirm that never hears its own Enter: stopped at the window before any listener, its click cancelled.
const DEAF_CONFIRM = () => {
  window.addEventListener("keydown", (e) => {
    const t = e.target;
    if (e.key !== "Enter" || !t || !t.closest || !t.closest('[aria-modal="true"]') || !/·.{0,3}TZS/.test(t.textContent || "")) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
};
// CONTROL · the page itself deaf to Enter: an Enter with focus on the body stopped at the window before any listener.
const DEAF_PAGE = () => {
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.target !== document.body) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
};

// A page at 390 in Swahili that counts the sale and bet requests it sends (a server action whose form names a ticket, or
// a bet's idempotency key). In the control run every one is counted and then ABORTED, so no ticket or shilling moves;
// in the main run only the bet marked for it is aborted (an answer that never comes).
async function open(browser, cookies, tag, path, plants) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
  await ctx.addCookies([...cookies, { name: LOCALE_COOKIE, value: "sw", url: base }]);
  const page = await ctx.newPage();
  const sent = { sales: 0, bets: 0, abortNextBet: false };
  await page.route("**/*", async (route) => {
    const r = route.request();
    if (r.method() !== "POST" || !r.headers()["next-action"]) return route.fallback();
    let body = "";
    try { body = r.postData() ?? ""; } catch { body = ""; }
    if (body.includes("positionId")) {
      sent.sales += 1;
      if (MODE === "control") return route.abort("failed");
    } else if (body.includes("idempotencyKey")) {
      sent.bets += 1;
      if (MODE === "control" || sent.abortNextBet) { sent.abortNextBet = false; return route.abort("failed"); }
    }
    return route.fallback();
  });
  page.on("pageerror", (e) => { failures += 1; say(`FAIL script error on ${tag}: ${String(e?.message ?? e).slice(0, 200)}`); });
  await page.addInitScript(RECORDER);
  for (const plant of plants) await page.addInitScript(plant);
  await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 240_000 });
  await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {});
  await page.waitForTimeout(2500);
  return { ctx, page, sent };
}

// The Sell button of one ticket (the A8c drive's rule): its nearest ancestor that holds question links links to THIS one.
async function sellButton(page, marketId) {
  await page.evaluate((id) => {
    document.querySelectorAll("[data-a8i-target]").forEach((el) => el.removeAttribute("data-a8i-target"));
    const isSell = (b) => /TZS|Uza bila ada|Toka bila gharama|Uza sasa|Sell|出售/.test(b.textContent || "")
      && !b.closest('[aria-modal="true"], header, nav, [data-testid="wallet-balance-pill"]');
    const rowOf = (b) => {
      let el = b.parentElement;
      while (el && !el.querySelector('a[href^="/markets/"]')) el = el.parentElement;
      if (!el) return null;
      const ids = new Set(Array.from(el.querySelectorAll('a[href^="/markets/"]')).map((a) => a.getAttribute("href").split("?")[0]));
      return ids.size === 1 ? [...ids][0] : null;
    };
    for (const b of Array.from(document.querySelectorAll("button"))) {
      if (isSell(b) && rowOf(b) === `/markets/${id}`) { b.setAttribute("data-a8i-target", "1"); return; }
    }
  }, marketId);
  return page.locator('[data-a8i-target="1"]').first();
}

async function balance(page) {
  const pill = page.locator('[data-testid="wallet-balance-pill"], [data-testid="journey-balance"]').first();
  if (!(await pill.count())) return null;
  return amountIn(await pill.textContent());
}

const focusNow = (page) => page.evaluate(() => {
  const WS = new RegExp("[" + String.fromCharCode(32, 9, 10, 13, 160) + "]+", "g");
  const a = document.activeElement;
  const text = a && a !== document.body ? (a.textContent || "").replace(WS, " ").trim().slice(0, 60) : "";
  return {
    body: !a || a === document.body,
    inDialog: !!(a && a.closest && a.closest('[aria-modal="true"]')),
    text,
    name: a && a.getAttribute ? (a.getAttribute("aria-label") || text) : text,
  };
});

const sellConfirm = (page) => page.locator('[aria-modal="true"]:visible button').filter({ hasText: /Uza · TZS/ }).first();
const betConfirm = (page) => page.locator('[aria-modal="true"]:visible button').filter({ hasText: /Thibitisha · TZS/ }).first();
const seal = (page) => page.locator('[aria-modal="true"]:visible').filter({ hasText: "Umeshinda!" }).first();

async function closeDialogs(page) {
  for (let i = 0; i < 4; i++) {
    const d = page.locator('[aria-modal="true"]:visible');
    if (!(await d.count())) return;
    const btn = d.locator("button").filter({ hasText: /^(Sawa|Funga|Endelea|Hifadhi nafasi|Baki na tiketi|Ghairi)$/ }).first();
    if (await btn.count()) await btn.click().catch(() => {});
    else await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(500);
  }
}

// S and J — Tab to the keep button, Enter: kept.
async function keepCase(browser, cookies, tag, path, marketId, keepWord, plants) {
  const X = await open(browser, cookies, tag, path, plants);
  try {
    const b0 = await balance(X.page);
    const sell = await sellButton(X.page, marketId);
    if (!(await sell.count())) return missing(`no Sell button for ticket ${marketId}`);
    await sell.focus();
    await X.page.keyboard.press("Enter");
    const opened = await sellConfirm(X.page).waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
    const t0 = Date.now();
    await X.page.waitForTimeout(400);
    const onConfirm = await focusNow(X.page);
    await X.page.keyboard.press("Tab");
    await X.page.waitForTimeout(150);
    const onKeep = await focusNow(X.page);
    const inHold = Date.now() - t0 < HOLD_MS;
    await shot(X.page, `${tag}-focus-on-keep-390`);
    await X.page.keyboard.press("Enter");
    await X.page.waitForTimeout(2500);
    const confirmLeft = await sellConfirm(X.page).count();
    const b1 = await balance(X.page);
    const ticketThere = (await (await sellButton(X.page, marketId)).count()) > 0;
    await shot(X.page, `${tag}-after-enter-390`);
    return {
      stage: opened && onConfirm.inDialog && onConfirm.text.includes("Uza · TZS") && onKeep.inDialog && onKeep.text === keepWord && inHold,
      why: JSON.stringify({ opened, onConfirm: onConfirm.text, onKeep: onKeep.text, inHold }),
      pass: confirmLeft === 0 && X.sent.sales === 0 && b0 !== null && b1 === b0 && ticketThere,
      got: JSON.stringify({ confirmLeft, sales: X.sent.sales, b0, b1, ticketThere }),
    };
  } finally {
    await closeDialogs(X.page).catch(() => {});
    await X.ctx.close().catch(() => {});
  }
}

// K — Enter held on the keep button: the confirm closes and stays closed; the repeats press nothing after it.
async function heldKeepCase(browser, cookies, tag, marketId, plants) {
  const X = await open(browser, cookies, tag, "/positions?tab=open", plants);
  try {
    const b0 = await balance(X.page);
    const sell = await sellButton(X.page, marketId);
    if (!(await sell.count())) return missing(`no Sell button for ticket ${marketId}`);
    await sell.focus();
    await X.page.keyboard.press("Enter");
    const opened = await sellConfirm(X.page).waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
    const t0 = Date.now();
    await X.page.waitForTimeout(400);
    await X.page.keyboard.press("Tab");
    await X.page.waitForTimeout(150);
    const onKeep = await focusNow(X.page);
    const inHold = Date.now() - t0 < HOLD_MS;
    await X.page.evaluate(() => { window.__a8i.keys.length = 0; });
    await X.page.keyboard.down("Enter");
    await X.page.waitForTimeout(500);
    for (let i = 0; i < 10; i++) { await X.page.keyboard.down("Enter"); await X.page.waitForTimeout(35); }
    await X.page.keyboard.up("Enter");
    await X.page.waitForTimeout(2500);
    const keys = await X.page.evaluate(() => window.__a8i.keys.slice());
    const first = keys.find((k) => k.key === "Enter" && !k.repeat) ?? null;
    const repeats = keys.filter((k) => k.key === "Enter" && k.repeat).length;
    const confirmLeft = await sellConfirm(X.page).count();
    const dialogs = await X.page.locator('[aria-modal="true"]:visible').count();
    const b1 = await balance(X.page);
    const ticketThere = (await (await sellButton(X.page, marketId)).count()) > 0;
    await shot(X.page, `${tag}-after-held-enter-390`);
    return {
      stage: opened && onKeep.inDialog && onKeep.text === "Hifadhi nafasi" && inHold && !!first && first.inDialog && first.text === "Hifadhi nafasi" && repeats >= 8,
      why: JSON.stringify({ opened, onKeep: onKeep.text, inHold, first, repeats }),
      pass: confirmLeft === 0 && dialogs === 0 && X.sent.sales === 0 && b0 !== null && b1 === b0 && ticketThere,
      got: JSON.stringify({ confirmLeft, dialogs, sales: X.sent.sales, b0, b1, ticketThere }),
    };
  } finally {
    await closeDialogs(X.page).catch(() => {});
    await X.ctx.close().catch(() => {});
  }
}

// The Sell confirm opened by a click, then a win seal dispatched over it; ready once the seal is drawn with focus in it,
// inside the confirm's quote hold.
async function sealOverConfirm(X, marketId) {
  const sell = await sellButton(X.page, marketId);
  if (!(await sell.count())) return { ready: false, why: `no Sell button for ticket ${marketId}`, focus: "" };
  await sell.click();
  const opened = await sellConfirm(X.page).waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
  const t0 = Date.now();
  await X.page.waitForTimeout(300);
  await X.page.mouse.move(2, 2);
  const taken = await X.page.evaluate(() => {
    const ack = { accepted: false };
    window.dispatchEvent(new CustomEvent("50pick:celebrate", { detail: { kind: "WIN", amount: 5000, net: 3500, label: "drive", ack } }));
    return ack.accepted;
  });
  const sealUp = await seal(X.page).waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
  await X.page.waitForTimeout(500);
  const f = await focusNow(X.page);
  const inHold = Date.now() - t0 < HOLD_MS;
  return {
    ready: opened && taken && sealUp && f.inDialog && inHold,
    why: JSON.stringify({ opened, taken, sealUp, focus: f.text, inHold }),
    focus: f.text,
  };
}

// W — the win seal over the Sell confirm, Enter on its "Endelea": the seal's.
async function sealCase(browser, cookies, tag, marketId, plants) {
  const X = await open(browser, cookies, tag, "/positions?tab=open", plants);
  try {
    const b0 = await balance(X.page);
    const s = await sealOverConfirm(X, marketId);
    await shot(X.page, `${tag}-seal-over-confirm-390`);
    if (!s.ready) return missing(s.why);
    await X.page.keyboard.press("Enter");
    await X.page.waitForTimeout(1500);
    const sealLeft = await seal(X.page).count();
    const confirmStill = await sellConfirm(X.page).count();
    await shot(X.page, `${tag}-after-enter-390`);
    const b1 = await balance(X.page);
    return {
      stage: s.focus === "Endelea",
      why: s.why,
      pass: sealLeft === 0 && confirmStill > 0 && X.sent.sales === 0 && b0 !== null && b1 === b0,
      got: JSON.stringify({ sealLeft, confirmStill, sales: X.sent.sales, b0, b1 }),
    };
  } finally {
    await closeDialogs(X.page).catch(() => {});
    await X.ctx.close().catch(() => {});
  }
}

// W2 — two Enters on the seal's "Endelea" about 60 ms apart: the second lands under the seal's exit, and is nobody's.
async function sealTwiceCase(browser, cookies, tag, marketId, plants) {
  const X = await open(browser, cookies, tag, "/positions?tab=open", plants);
  try {
    const b0 = await balance(X.page);
    const s = await sealOverConfirm(X, marketId);
    if (!s.ready) return missing(s.why);
    await X.page.evaluate(() => { window.__a8i.keys.length = 0; });
    await X.page.keyboard.press("Enter");
    await X.page.waitForTimeout(60);
    await X.page.keyboard.press("Enter");
    await X.page.waitForTimeout(1500);
    const presses = (await X.page.evaluate(() => window.__a8i.keys.slice())).filter((k) => k.key === "Enter" && !k.repeat);
    const second = presses[1] ?? null;
    const underExit = !!second && second.inDialog && second.text.includes("Uza · TZS") && second.leaving;
    const sealLeft = await seal(X.page).count();
    const confirmStill = await sellConfirm(X.page).count();
    const b1 = await balance(X.page);
    await shot(X.page, `${tag}-after-two-enters-390`);
    return {
      stage: s.focus === "Endelea" && presses.length === 2 && (MODE === "control" || underExit),
      why: JSON.stringify({ seal: s.why, presses: presses.length, second }),
      pass: sealLeft === 0 && confirmStill > 0 && X.sent.sales === 0 && b0 !== null && b1 === b0,
      got: JSON.stringify({ sealLeft, confirmStill, sales: X.sent.sales, b0, b1 }),
    };
  } finally {
    await closeDialogs(X.page).catch(() => {});
    await X.ctx.close().catch(() => {});
  }
}

// PW — the seal over the confirm, focus on the page itself (a click on the seal's heading): Enter is neither dialog's.
async function sealBodyCase(browser, cookies, tag, marketId, plants) {
  const X = await open(browser, cookies, tag, "/positions?tab=open", plants);
  try {
    const b0 = await balance(X.page);
    const s = await sealOverConfirm(X, marketId);
    if (!s.ready) return missing(s.why);
    await seal(X.page).locator("h2").first().click();
    await X.page.waitForTimeout(200);
    const f = await focusNow(X.page);
    await shot(X.page, `${tag}-page-focus-under-seal-390`);
    await X.page.keyboard.press("Enter");
    await X.page.waitForTimeout(1500);
    const sealStill = await seal(X.page).count();
    const confirmStill = await sellConfirm(X.page).count();
    const b1 = await balance(X.page);
    return {
      stage: s.focus === "Endelea" && f.body,
      why: JSON.stringify({ seal: s.why, body: f.body, focus: f.text }),
      pass: sealStill > 0 && confirmStill > 0 && X.sent.sales === 0 && b0 !== null && b1 === b0,
      got: JSON.stringify({ sealStill, confirmStill, sales: X.sent.sales, b0, b1 }),
    };
  } finally {
    await closeDialogs(X.page).catch(() => {});
    await X.ctx.close().catch(() => {});
  }
}

// R — Enter held on Sell: the first press opens the confirm, the repeats land on its Uza and sell nothing.
async function heldCase(browser, cookies, tag, marketId, plants) {
  const X = await open(browser, cookies, tag, "/positions?tab=open", plants);
  try {
    const b0 = await balance(X.page);
    const sell = await sellButton(X.page, marketId);
    if (!(await sell.count())) return missing(`no Sell button for ticket ${marketId}`);
    await sell.focus();
    await X.page.evaluate(() => { window.__a8i.keys.length = 0; });
    await X.page.keyboard.down("Enter");
    const opened = await sellConfirm(X.page).waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
    await X.page.waitForTimeout(500);
    for (let i = 0; i < 8; i++) { await X.page.keyboard.down("Enter"); await X.page.waitForTimeout(35); }
    await X.page.keyboard.up("Enter");
    await X.page.waitForTimeout(2500);
    const keys = await X.page.evaluate(() => window.__a8i.keys.slice());
    const repeats = keys.filter((k) => k.key === "Enter" && k.repeat);
    const onConfirm = repeats.filter((k) => k.inDialog && k.text.includes("Uza · TZS")).length;
    const confirmStill = await sellConfirm(X.page).count();
    const b1 = await balance(X.page);
    await shot(X.page, `${tag}-after-held-enter-390`);
    return {
      stage: opened && repeats.length >= 8 && onConfirm >= 1,
      why: JSON.stringify({ opened, repeats: repeats.length, onConfirm }),
      pass: confirmStill > 0 && X.sent.sales === 0 && b0 !== null && b1 === b0,
      got: JSON.stringify({ confirmStill, sales: X.sent.sales, b0, b1 }),
    };
  } finally {
    await closeDialogs(X.page).catch(() => {});
    await X.ctx.close().catch(() => {});
  }
}

// P — the confirm the one dialog on screen, focus on the page itself (a click on its question): Enter sells, once.
async function pageEnterCase(browser, cookies, tag, marketId, plants) {
  const X = await open(browser, cookies, tag, "/positions?tab=open", plants);
  try {
    const b0 = await balance(X.page);
    const sell = await sellButton(X.page, marketId);
    if (!(await sell.count())) return missing(`no Sell button for ticket ${marketId}`);
    await sell.focus();
    await X.page.keyboard.press("Enter");
    const opened = await sellConfirm(X.page).waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
    const t0 = Date.now();
    await X.page.waitForTimeout(400);
    const figure = amountIn(await sellConfirm(X.page).textContent().catch(() => ""));
    await X.page.locator('[aria-modal="true"]:visible p').filter({ hasText: "Uza nafasi hii sasa?" }).first().click();
    await X.page.waitForTimeout(200);
    const f = await focusNow(X.page);
    const inHold = Date.now() - t0 < HOLD_MS;
    await shot(X.page, `${tag}-page-focus-390`);
    await X.page.keyboard.press("Enter");
    const result = await X.page.locator('[aria-modal="true"]:visible').filter({ hasText: /Imerudishwa/ }).first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
    await shot(X.page, `${tag}-result-390`);
    await X.page.waitForTimeout(3000);
    const b1 = await balance(X.page);
    const ticketGone = (await (await sellButton(X.page, marketId)).count()) === 0;
    return {
      stage: opened && f.body && inHold && figure !== null && figure > 0,
      why: JSON.stringify({ opened, body: f.body, focus: f.text, inHold, figure }),
      pass: result && X.sent.sales === 1 && b0 !== null && figure !== null && b1 === b0 + figure && ticketGone,
      got: JSON.stringify({ result, sales: X.sent.sales, b0, b1, figure, ticketGone }),
    };
  } finally {
    await closeDialogs(X.page).catch(() => {});
    await X.ctx.close().catch(() => {});
  }
}

// The bet confirm on a question page, opened from the keyboard: the stake typed (the dial is neutral until a value is
// typed), then Enter on the dial's "Weka …" button.
async function openBetConfirm(page) {
  const box = page.locator('input[inputmode="numeric"]').first();
  if (!(await box.waitFor({ timeout: 30_000 }).then(() => true).catch(() => false))) return false;
  await box.click();
  await box.fill("1000");
  await box.press("Enter");
  await page.waitForTimeout(600);
  const place = page.locator('button[aria-label^="Weka "]').first();
  if (!(await place.count()) || !(await place.isEnabled().catch(() => false))) return false;
  await place.focus();
  await page.keyboard.press("Enter");
  return betConfirm(page).waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
}

// B — Tab to Ghairi, Enter: cancelled.
async function betCancelCase(browser, cookies, tag, marketId, plants) {
  const X = await open(browser, cookies, tag, `/markets/${marketId}?side=YES`, plants);
  try {
    const b0 = await balance(X.page);
    const opened = await openBetConfirm(X.page);
    const t0 = Date.now();
    await X.page.waitForTimeout(400);
    const onConfirm = await focusNow(X.page);
    await X.page.keyboard.press("Tab");
    await X.page.waitForTimeout(150);
    const onCancel = await focusNow(X.page);
    const inHold = Date.now() - t0 < HOLD_MS;
    await shot(X.page, `${tag}-focus-on-ghairi-390`);
    await X.page.keyboard.press("Enter");
    await X.page.waitForTimeout(2500);
    const confirmLeft = await betConfirm(X.page).count();
    const dialogs = await X.page.locator('[aria-modal="true"]:visible').count();
    const b1 = await balance(X.page);
    return {
      stage: opened && onConfirm.inDialog && onConfirm.text.includes("Thibitisha · TZS") && onCancel.inDialog && onCancel.name === "Ghairi" && inHold,
      why: JSON.stringify({ opened, onConfirm: onConfirm.text, onCancel: onCancel.name, inHold }),
      pass: confirmLeft === 0 && dialogs === 0 && X.sent.bets === 0 && b0 !== null && b1 === b0,
      got: JSON.stringify({ confirmLeft, dialogs, bets: X.sent.bets, b0, b1 }),
    };
  } finally {
    await closeDialogs(X.page).catch(() => {});
    await X.ctx.close().catch(() => {});
  }
}

// F — a retryable failure's result: Tab to Funga, Enter: closed, and the bet is not placed again.
async function betRetryCase(browser, cookies, tag, marketId, plants) {
  const X = await open(browser, cookies, tag, `/markets/${marketId}?side=YES`, plants);
  try {
    const b0 = await balance(X.page);
    const opened = await openBetConfirm(X.page);
    await X.page.waitForTimeout(400);
    X.sent.abortNextBet = true;
    if (opened) await betConfirm(X.page).click();
    const result = X.page.locator('[aria-modal="true"]:visible').filter({ has: X.page.locator("button", { hasText: "Jaribu tena" }) }).first();
    const shown = opened && (await result.waitFor({ timeout: 15_000 }).then(() => true).catch(() => false));
    await X.page.waitForTimeout(500);
    const onRetry = await focusNow(X.page);
    await X.page.keyboard.press("Tab");
    await X.page.waitForTimeout(150);
    const onClose = await focusNow(X.page);
    const betsBefore = X.sent.bets;
    await shot(X.page, `${tag}-focus-on-funga-390`);
    await X.page.keyboard.press("Enter");
    await X.page.waitForTimeout(2500);
    const resultLeft = await result.count();
    const b1 = await balance(X.page);
    return {
      stage: shown && betsBefore === 1 && onRetry.inDialog && onRetry.text === "Jaribu tena" && onClose.inDialog && onClose.text === "Funga",
      why: JSON.stringify({ opened, shown, betsBefore, onRetry: onRetry.text, onClose: onClose.text }),
      pass: resultLeft === 0 && X.sent.bets === 1 && b0 !== null && b1 === b0,
      got: JSON.stringify({ resultLeft, bets: X.sent.bets, b0, b1 }),
    };
  } finally {
    await closeDialogs(X.page).catch(() => {});
    await X.ctx.close().catch(() => {});
  }
}

// BE — Enter on the bet confirm's own "Thibitisha · TZS 1,000": the bet is placed, once.
async function betOnceCase(browser, cookies, tag, marketId, plants) {
  const X = await open(browser, cookies, tag, `/markets/${marketId}?side=YES`, plants);
  try {
    const opened = await openBetConfirm(X.page);
    await X.page.waitForTimeout(400);
    const f = await focusNow(X.page);
    await X.page.keyboard.press("Enter");
    const receipt = await X.page.locator('[aria-modal="true"]:visible').filter({ has: X.page.locator("button", { hasText: "Endelea kutabiri" }) }).first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
    await X.page.waitForTimeout(1500);
    await shot(X.page, `${tag}-receipt-390`);
    return {
      stage: opened && f.inDialog && f.text.includes("Thibitisha · TZS"),
      why: JSON.stringify({ opened, focus: f.text }),
      pass: receipt && X.sent.bets === 1,
      got: JSON.stringify({ receipt, bets: X.sent.bets }),
    };
  } finally {
    await closeDialogs(X.page).catch(() => {});
    await X.ctx.close().catch(() => {});
  }
}

// E — Enter on the confirm's own Uza: sold, once.
async function onceCase(browser, cookies, tag, marketId, plants) {
  const X = await open(browser, cookies, tag, "/positions?tab=open", plants);
  try {
    const b0 = await balance(X.page);
    const sell = await sellButton(X.page, marketId);
    if (!(await sell.count())) return missing(`no Sell button for ticket ${marketId}`);
    await sell.focus();
    await X.page.keyboard.press("Enter");
    const opened = await sellConfirm(X.page).waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
    await X.page.waitForTimeout(400);
    const f = await focusNow(X.page);
    const figure = amountIn(f.text);
    await X.page.keyboard.press("Enter");
    const result = await X.page.locator('[aria-modal="true"]:visible').filter({ hasText: /Imerudishwa/ }).first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
    await shot(X.page, `${tag}-result-390`);
    await X.page.waitForTimeout(3000);
    const b1 = await balance(X.page);
    const ticketGone = (await (await sellButton(X.page, marketId)).count()) === 0;
    return {
      stage: opened && f.inDialog && f.text.includes("Uza · TZS") && figure !== null && figure > 0,
      why: JSON.stringify({ opened, focus: f.text, figure }),
      pass: result && X.sent.sales === 1 && b0 !== null && figure !== null && b1 === b0 + figure && ticketGone,
      got: JSON.stringify({ result, sales: X.sent.sales, b0, b1, figure, ticketGone }),
    };
  } finally {
    await closeDialogs(X.page).catch(() => {});
    await X.ctx.close().catch(() => {});
  }
}

async function judge(id, stage, check, fn) {
  let r;
  try { r = await fn(); } catch (e) { r = { stage: false, why: `threw: ${String(e?.message ?? e).slice(0, 240)}`, pass: false, got: "" }; }
  if (MODE === "main") {
    ok(`${id}.0 the stage — ${stage}`, r.stage, r.why);
    if (r.stage) ok(`${id}.1 ${check}`, r.pass, r.got);
  } else {
    ok(`C${id}.0 the stage, with the defect planted — ${stage}`, r.stage, r.why);
    if (r.stage) ok(`C${id}.1 CONTROL — with the defect planted this check FAILS, so it can see the defect: ${check}`, !r.pass, r.got);
  }
}

const browser = await chromium.launch();
try {
  // ── setup, as the A8c and A8h drives do: the poll config, the questions, a staff pass, the player, four open tickets ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const seeded = await ctx.request.post(`${base}/api/dev-test/seed-admin`, { data: {} });
    if (!seeded.ok()) throw new Error(`seed-admin answered ${seeded.status()}`);
    const page = await ctx.newPage();
    await page.goto(`${base}/admin/config`, { waitUntil: "domcontentloaded", timeout: 240_000 });
    const grace = page.locator('input[name="freeExitGraceMinutes"]');
    await grace.waitFor({ timeout: 120_000 });
    await grace.fill("3");
    await page.locator('input[name="paidExitWindowMinutes"]').fill("10");
    await page.getByRole("button", { name: "Save · Hifadhi" }).first().click();
    await page.getByText("Global config updated").first().waitFor({ timeout: 60_000 });
    await ctx.close();
  }
  // The live questions: seed-real-markets skips titles it already made, and answers with every LIVE question now.
  const listLive = async () => {
    const ctx = await browser.newContext();
    try {
      const res = await ctx.request.post(`${base}/api/dev-test/seed-real-markets`, { data: {} });
      return ((await res.json().catch(() => ({}))).live ?? []).map((m) => m.id);
    } finally {
      await ctx.close().catch(() => {});
    }
  };
  const live = await listLive();
  const pass = await mintStaffPass(browser, base);
  const session = await demoSession(browser, base, { query: "?deposit=0", balance: 250_000 });
  {
    const ctx = await browser.newContext();
    await ctx.addCookies([session]);
    const warm = ["/positions?tab=open", "/positions", "/markets", ...(live[0] ? [`/markets/${live[0]}?side=YES`] : [])];
    for (const path of warm) await ctx.request.get(`${base}${path}`, { timeout: 240_000 }).catch(() => {});
    await ctx.close();
  }
  const seedCtx = await browser.newContext();
  await seedCtx.addCookies([session]);
  const sp = await seedCtx.request.post(`${base}/api/dev-test/seed-player-portfolio`, { data: {} });
  const spBody = await sp.json().catch(() => ({}));
  await seedCtx.close();
  const placed = spBody.marketIds ?? [];
  const ids = placed.slice(0, 4);
  // The question for the bet confirm, read AFTER the portfolio (which settles some of the questions it bets on): a live
  // one the player holds nothing on, else one whose ticket is no longer open.
  const liveNow = await listLive();
  const betMarket = liveNow.find((id) => !placed.includes(id)) ?? liveNow.find((id) => !ids.includes(id)) ?? null;
  const staged = spBody.byStatus?.OPEN === 4 && ids.length === 4 && betMarket !== null;
  ok("0.1 the stage: four open tickets, and a live question the player holds no open ticket on (for the bet confirm)", staged, JSON.stringify({ byStatus: spBody.byStatus, ids, betMarket }));

  if (staged) {
    const player = [session];
    const journey = [session, pass];
    const old = MODE === "control" ? [OLD_RULE] : [];
    const deaf = MODE === "control" ? [DEAF_CONFIRM] : [];
    const deafPage = MODE === "control" ? [DEAF_PAGE] : [];
    const KEEP_STAGE = (word) => `Enter on Sell opened the confirm with focus on its "Uza · TZS …", and Tab reached "${word}", inside the quote hold`;
    const KEEP_CHECK = (word) => `Enter on "${word}" keeps the ticket: the confirm closes, no sale request, the balance unchanged, the ticket still on the open lens`;
    const SEAL_STAGE = `the Sell confirm open, the win seal taken and drawn over it with focus on "Endelea", inside the quote hold`;
    await judge("S", KEEP_STAGE("Hifadhi nafasi"), KEEP_CHECK("Hifadhi nafasi"),
      () => keepCase(browser, player, "S", "/positions?tab=open", ids[0], "Hifadhi nafasi", old));
    await judge("J", `the journey look: ${KEEP_STAGE("Baki na tiketi")}`, KEEP_CHECK("Baki na tiketi"),
      () => keepCase(browser, journey, "J", "/positions", ids[0], "Baki na tiketi", old));
    await judge("K", `the confirm open with focus on "Hifadhi nafasi" inside the quote hold, and Enter held there: its first press and at least 8 repeats reached the page`,
      `a held Enter on "Hifadhi nafasi" keeps the ticket and its repeats press nothing after: the confirm closed and still closed, no dialog left, no sale request, the balance unchanged, the ticket still on the open lens`,
      () => heldKeepCase(browser, player, "K", ids[0], old));
    await judge("W", SEAL_STAGE,
      `Enter on the seal's "Endelea" is the seal's: the seal closes, the Sell confirm is still open, no sale request, the balance unchanged`,
      () => sealCase(browser, player, "W", ids[1], old));
    await judge("W2", `${SEAL_STAGE}, and two Enters pressed about 60 ms apart (in main, the second landed on the confirm's "Uza · TZS …" while the seal was still leaving)`,
      `the second Enter, under the seal's exit, sells nothing: the seal gone, the Sell confirm still open, no sale request, the balance unchanged`,
      () => sealTwiceCase(browser, player, "W2", ids[1], old));
    await judge("PW", `${SEAL_STAGE}, and a click on the seal's heading left focus on the page itself`,
      `Enter on the page itself, two dialogs on screen, is neither's: the seal and the confirm both still up, no sale request, the balance unchanged`,
      () => sealBodyCase(browser, player, "PW", ids[1], old));
    await judge("R", `a held Enter: the first press opened the confirm and at least 8 repeats reached the page, on its "Uza · TZS …"`,
      `a held Enter never sells: no sale request, the confirm still open, the balance unchanged`,
      () => heldCase(browser, player, "R", ids[3], old));
    await judge("P", `the confirm open, its question clicked so focus is on the page itself, the one dialog on screen, inside the quote hold (the figure read from its "Uza · TZS …")`,
      `Enter on the page itself sells once: one sale request, the result "Imerudishwa", the balance up by exactly the confirmed figure, the ticket gone from the open lens`,
      () => pageEnterCase(browser, player, "P", ids[3], deafPage));
    await judge("B", `Enter on "Weka …" opened the bet confirm with focus on "Thibitisha · TZS 1,000", and Tab reached "Ghairi", inside the quote hold`,
      `Enter on "Ghairi" cancels: the confirm closes, no dialog is left, no bet request, the balance unchanged`,
      () => betCancelCase(browser, player, "B", betMarket, old));
    await judge("F", `a bet confirmed by a click, its request aborted: the result with "Jaribu tena" focused, one bet request so far, and Tab reached "Funga"`,
      `Enter on "Funga" closes the result and places nothing: no second bet request, the balance unchanged`,
      () => betRetryCase(browser, player, "F", betMarket, old));
    await judge("BE", `Enter on "Weka …" opened the bet confirm with focus on its "Thibitisha · TZS 1,000"`,
      `Enter on "Thibitisha · TZS 1,000" places the bet once: one bet request, and the receipt with "Endelea kutabiri"`,
      () => betOnceCase(browser, player, "BE", betMarket, deaf));
    await judge("E", `Enter on Sell opened the confirm with focus on its "Uza · TZS …" (the figure read from it)`,
      `Enter on the confirm's own "Uza · TZS …" sells once: one sale request, the result "Imerudishwa", the balance up by exactly the confirmed figure, the ticket gone from the open lens`,
      () => onceCase(browser, player, "E", ids[2], deaf));
  }
} catch (e) {
  failures += 1;
  say(`FAIL the drive stopped: ${String(e?.stack ?? e).slice(0, 600)}`);
} finally {
  await browser.close().catch(() => {});
}
writeFileSync(`${OUT}/report-${MODE}.txt`, report.join(NL) + NL);
console.log(failures ? `a8i enter drive (${MODE}): ${failures} failure(s)` : `a8i enter drive (${MODE}): all passed`);
process.exit(failures ? 1 : 0);
