// S6 A8h RESULT DRIVE (written for A8h; NOT YET RUN when it was written) — the shell's host keeps a sale's result, a
// refused sale is as loud as the registry ranks it, focus comes back to something on the page, a move to another page
// closes the result, and a lost chunk leaves each Sell button drawing its own result. Real browser, Swahili, 390 px.
// usage (via run-with-server.sh): node result-drive.mjs <outDir> <main|extra|lost|expect-crash>
//   extra (the review of 2026-10-04, each on a fresh seed):
//     X  one refusal toast for the tab: ticket 4's aborted sale leaves its red toast up (sticky); a sale on ticket 1
//        dismisses it as it starts, so once ticket 1's result closes the success toast shows and the red one never
//        comes back (a per-button slot would bring it back from behind the result, §F1);
//     W  a win seal dispatched over a sale's result keeps its focus when the result closes under it.
//   main:
//     E  the host is listening: a 50pick:sell-result event comes back accepted, and its result shows;
//     K  KEYBOARD, classic /positions?tab=open, ticket 1: Enter on Sell, Enter to confirm; the result outlives the sold
//        ticket's row; Enter on "Sawa" closes it and focus is on a control in the main region, never on <body>;
//     U  classic /positions?tab=all, ticket 2: a sale left alone is still up at 4.5 s, gone by 7 s, then its toast
//        (role=status) shows, and focus is on a control in the main region;
//     H  the question page's holder block, ticket 3: the result is still up after the refresh took the Sell button away;
//     F  classic /positions?tab=open, ticket 4, the sale's request aborted (an answer that never comes, BUSY: a fault):
//        the ✗ result, with no toast shown behind it (§F1), still up at 6.5 s (a refusal never closes by itself); on
//        "Funga" the red toast (role=alert) shows and is still up 6 s on (sticky); focus on the ticket's Sell button;
//     N  from the open lens, the ticket's question link (a soft navigation), the holder block's sale aborted: the ✗
//        result; Back closes it (no dialog on the page before);
//     J  the journey look (staff pass), Tiketi zangu, the sale aborted: the ✗ result says "Tiketi haijabadilika." and
//        never "Nafasi haijabadilika." (the look the button handed the host).
//   lost: every request for the host's chunk aborted: the page stays up, at least one /api/client-error report, the event
//        comes back unanswered, and an aborted sale's ✗ result is drawn by the Sell button itself.
//   expect-crash (the CONTROL, run by a8h-crash-control.sh on a server whose LazySellResultHost line has NO
//        .catch(nothingIfLost)): the same abort must reach the critical-error screen, or "lost" could not tell the guard
//        from luck.
// ⛔ Local in-memory dev server only (premise refuses anything else). No backslash is typed in this file.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const repoRequire = createRequire("C:/kipindi-journey/package.json");
const { chromium } = repoRequire("playwright");
const { premise, mintStaffPass, demoSession, LOCALE_COOKIE } = await import("file:///C:/kipindi-journey/scripts/live/journey-pass.mjs");

const base = process.env.KP_BASE ?? "http://localhost:3041";
const OUT = process.argv[2] ?? "a8h-result-drive-out";
const MODE = process.argv[3] ?? "main";
mkdirSync(OUT, { recursive: true });
const p0 = await premise(base);
if (p0.refuse) { console.log(`REFUSED: ${p0.refuse}`); process.exit(2); }

const report = [];
let failures = 0;
const say = (s) => { report.push(s); console.log(s); };
const ok = (label, cond, detail = "") => { if (!cond) failures += 1; say(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
// The critical-error screen in every language (src/app/global-error.tsx titles). ⚠️ 2026-10-07: matching the English
// title alone made C.1 FAIL on a Swahili page that DID crash (its diagnosis drew "Kitu kimevunjika kabla hata ya kuanza").
const CRASH_TITLES = /Something broke too early to recover|Kitu kimevunjika kabla hata ya kuanza|系统在启动前就出了问题/;
const shot = async (page, name) => { await page.screenshot({ path: `${OUT}/${name}.png` }).catch(() => {}); };

// Every change of the open dialogs' text, logged with its time (white space folded without a regex escape).
const RECORDER = () => {
  const WS = new RegExp("[" + String.fromCharCode(32, 9, 10, 13, 160) + "]+", "g");
  const rec = { dialogs: [] };
  window.__a8h = rec;
  let last = "";
  const tick = () => {
    const d = Array.from(document.querySelectorAll('[aria-modal="true"]')).map((x) => (x.textContent || "").replace(WS, " ").trim().slice(0, 300)).join(" | ");
    if (d !== last) { last = d; rec.dialogs.push({ t: Date.now(), text: d }); }
  };
  new MutationObserver(tick).observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-modal"] });
};

// The sale requests of a page: the next one passes, or is aborted (an answer that never comes, so the client reports BUSY).
// Every other request falls back to the context's own routes (the lost chunk's abort among them).
function saleRoute(page) {
  const plan = { next: null, seen: [] };
  page.route("**/*", async (route) => {
    const r = route.request();
    const h = r.headers();
    let body = "";
    try { body = r.postData() ?? ""; } catch { body = ""; }
    if (r.method() !== "POST" || !h["next-action"] || !body.includes("positionId")) return route.fallback();
    const step = plan.next;
    plan.next = null;
    plan.seen.push({ t: Date.now(), kind: step?.kind ?? "pass" });
    if (step?.kind === "abort") return route.abort("failed");
    return route.fallback();
  });
  return plan;
}

async function open(browser, cookies, tag, path, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: opts.width ?? 390, height: 780 } });
  await ctx.addCookies([...cookies, { name: LOCALE_COOKIE, value: opts.locale ?? "sw", url: base }]);
  const reports = { clientError: 0, aborted: 0 };
  if (opts.loseHost) {
    await ctx.route("**/*", async (route) => {
      const u = route.request().url();
      if (u.includes("/_next/") && u.includes("sell-result-host")) { reports.aborted += 1; return route.abort("failed"); }
      return route.continue();
    });
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on("request", (r) => {
    if (!r.url().includes("/api/client-error")) return;
    reports.clientError += 1;
    if (opts.crashOk) (reports.bodies ??= []).push(String(r.postData() ?? "").slice(0, 260));
  });
  if (!opts.crashOk) page.on("pageerror", (e) => { failures += 1; say(`FAIL script error on ${tag}: ${String(e?.message ?? e).slice(0, 200)}`); });
  else page.on("pageerror", (e) => errors.push(String(e?.message ?? e).slice(0, 200)));
  await page.addInitScript(RECORDER);
  const plan = saleRoute(page);
  await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 240_000 });
  await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {});
  await page.waitForTimeout(2500);
  return { ctx, page, plan, tag, reports, errors };
}

// The Sell button of one ticket (the A8c drive's rule): each Sell button's NEAREST ancestor that holds a question link must
// link to THIS question (a /positions row or a journey ticket card); on the question's own page, its first Sell button.
async function sellButton(page, marketId) {
  const found = await page.evaluate((id) => {
    document.querySelectorAll("[data-a8c-target]").forEach((el) => el.removeAttribute("data-a8c-target"));
    const isSell = (b) => /TZS|Uza bila ada|Toka bila gharama|Uza sasa|Sell|出售/.test(b.textContent || "")
      && !b.closest('[aria-modal="true"], header, nav, [data-testid="wallet-balance-pill"]');
    const rowOf = (b) => {
      let el = b.parentElement;
      while (el && !el.querySelector('a[href^="/markets/"]')) el = el.parentElement;
      if (!el) return null;
      const ids = new Set(Array.from(el.querySelectorAll('a[href^="/markets/"]')).map((a) => a.getAttribute("href").split("?")[0]));
      return ids.size === 1 ? [...ids][0] : null;
    };
    let hit = null;
    for (const b of Array.from(document.querySelectorAll("button"))) {
      if (!isSell(b)) continue;
      const row = rowOf(b);
      if (id === null ? row !== null : row === `/markets/${id}`) { hit = b; break; }
    }
    if (!hit && id !== null && location.pathname === `/markets/${id}`) hit = Array.from(document.querySelectorAll("button")).find(isSell) || null;
    if (hit) hit.setAttribute("data-a8c-target", "1");
    return hit ? (hit.textContent || "").trim().slice(0, 80) : null;
  }, marketId);
  if (!found) say(`note: no Sell button for ${marketId ?? "any ticket"} on ${page.url()}`);
  return page.locator('[data-a8c-target="1"]').first();
}

async function confirmSale(page) {
  const confirm = page.locator('[aria-modal="true"]:visible button').filter({ hasText: /·.{0,2}TZS/ }).first();
  try { await confirm.waitFor({ timeout: 8000 }); }
  catch (e) { await shot(page, `confirm-missing-${Date.now()}`); throw new Error(`no confirm opened on ${page.url()}: ${String(e?.message ?? e).slice(0, 80)}`); }
  await confirm.click();
}

async function closeDialogs(page) {
  for (let i = 0; i < 3; i++) {
    const d = page.locator('[aria-modal="true"]:visible');
    if (!(await d.count())) return;
    const btn = d.locator("button").filter({ hasText: /^(Sawa|OK|Done|好的|确定|Funga|Close|关闭|完成)$/ }).first();
    if (await btn.count()) await btn.click().catch(() => {});
    else await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(500);
  }
}

const focusOf = (page) => page.evaluate(() => {
  const a = document.activeElement;
  const main = document.getElementById("main-content");
  return {
    body: !a || a === document.body,
    inMain: !!(a && main && main.contains(a)),
    target: !!(a && a.hasAttribute && a.hasAttribute("data-a8c-target")),
    field: !!(a && a.matches && a.matches("input, select, textarea")),
    tag: a ? a.tagName : null,
    text: a ? (a.textContent || "").trim().slice(0, 60) : null,
  };
});
const visibleResult = (page, text) => page.locator('[aria-modal="true"]:visible').filter({ hasText: text });
const dismissToasts = async (page) => {
  for (const b of await page.locator("button[data-toast-dismiss]").all()) await b.click().catch(() => {});
};

const browser = await chromium.launch();
try {
  // ── setup, as the A8c drive does: the poll config, the questions, the player (and a staff pass), four open tickets ──
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
  await (await browser.newContext()).request.post(`${base}/api/dev-test/seed-real-markets`, { data: {} });
  const pass = await mintStaffPass(browser, base);
  const session = await demoSession(browser, base, { query: "?deposit=0", balance: 250_000 });
  {
    const ctx = await browser.newContext();
    await ctx.addCookies([session]);
    for (const path of ["/positions?tab=open", "/positions?tab=all", "/positions"]) await ctx.request.get(`${base}${path}`, { timeout: 240_000 }).catch(() => {});
    await ctx.close();
  }
  const seedCtx = await browser.newContext();
  await seedCtx.addCookies([session]);
  const sp = await seedCtx.request.post(`${base}/api/dev-test/seed-player-portfolio`, { data: {} });
  const spBody = await sp.json().catch(() => ({}));
  await seedCtx.close();
  const ids = (spBody.marketIds ?? []).slice(0, 4);
  ok("0 four open tickets", spBody.byStatus?.OPEN === 4 && ids.length === 4, JSON.stringify(spBody.byStatus));
  const player = [session];

  if (MODE === "extra") {
    // ── X: one refusal toast for the tab — a sale on ANOTHER ticket dismisses the last refusal (the review of 2026-10-04) ──
    {
      const X = await open(browser, player, "X one slot", "/positions?tab=open");
      await (await sellButton(X.page, ids[3])).click();
      X.plan.next = { kind: "abort" };
      await confirmSale(X.page);
      const fault = await X.page.locator('[role="alertdialog"]:visible').filter({ hasText: /Haikufanikiwa kutoa/ }).first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
      await closeDialogs(X.page);
      const red = X.page.locator('[role="alert"]').filter({ hasText: /Imeshindikana kutoa/ });
      const redUp = await red.first().waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
      await X.page.waitForTimeout(1500);
      const redStill = (await red.count()) > 0;
      ok("X.0 ticket 4's aborted sale leaves its red toast up (the control: it is sticky, and nothing else would take it away)", fault && redUp && redStill, JSON.stringify({ fault, redUp, redStill }));
      await (await sellButton(X.page, ids[0])).click();
      await confirmSale(X.page);
      const sold = await visibleResult(X.page, /Imerudishwa/).first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
      await shot(X.page, "X-other-ticket-result-390");
      await closeDialogs(X.page);
      await X.page.waitForTimeout(1200);
      const back = await red.count();
      const success = await X.page.locator('[role="status"]').filter({ hasText: /imerejeshwa/ }).first().waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
      ok("X.1 a sale on ANOTHER ticket dismissed ticket 4's refusal as it started: once that sale's result closes, its success toast shows and the red 'Imeshindikana kutoa' does not come back (one refusal toast for the tab, the latest)", sold && back === 0 && success, JSON.stringify({ sold, back, success }));
      await shot(X.page, "X-after-390");
      await dismissToasts(X.page);
      await X.ctx.close();
    }
    // ── W: a win seal that opens over a sale's result keeps its focus when the result closes (the review of 2026-10-04) ──
    {
      const W = await open(browser, player, "W seal", "/positions?tab=open");
      await (await sellButton(W.page, ids[1])).click();
      await confirmSale(W.page);
      const result = await visibleResult(W.page, /Imerudishwa/).first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
      await W.page.mouse.move(2, 2);
      const taken = await W.page.evaluate(() => {
        const ack = { accepted: false };
        window.dispatchEvent(new CustomEvent("50pick:celebrate", { detail: { kind: "WIN", amount: 5000, net: 3500, label: "drive", ack } }));
        return ack.accepted;
      });
      const seal = W.page.locator('[aria-modal="true"]:visible').filter({ hasText: /5,000/ }).first();
      const sealUp = await seal.waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
      await W.page.waitForTimeout(400);
      const inSealFirst = await W.page.evaluate(() => {
        const a = document.activeElement;
        const d = a && a.closest('[aria-modal="true"]');
        return !!(d && /5,000/.test(d.textContent || ""));
      });
      const t0 = Date.now();
      let resultGoneAt = null;
      while (Date.now() - t0 < 9000) {
        if (!(await visibleResult(W.page, /Imerudishwa/).count())) { resultGoneAt = Date.now() - t0; break; }
        await W.page.waitForTimeout(100);
      }
      await W.page.waitForTimeout(400);
      const sealStill = await seal.isVisible().catch(() => false);
      const f = await W.page.evaluate(() => {
        const a = document.activeElement;
        const d = a && a.closest('[aria-modal="true"]');
        return { inSeal: !!(d && /5,000/.test(d.textContent || "")), body: !a || a === document.body, tag: a ? a.tagName : null, text: a ? (a.textContent || "").trim().slice(0, 40) : null };
      });
      await shot(W.page, "W-seal-after-result-390");
      if (!(result && taken && sealUp && inSealFirst && resultGoneAt !== null && sealStill)) {
        ok("W.0 the stage: a result up, the seal taken and drawn over it with focus, the result closing while the seal is still up", false, JSON.stringify({ result, taken, sealUp, inSealFirst, resultGoneAt, sealStill }));
      } else {
        ok("W.1 when the sale's result closes under a win seal, focus stays in the seal (it is not taken behind the seal's scrim)", f.inSeal, JSON.stringify({ resultGoneAt, ...f }));
      }
      await closeDialogs(W.page);
      await W.ctx.close();
    }
  } else if (MODE === "lost" || MODE === "expect-crash") {
    const crash = MODE === "expect-crash";
    const L = await open(browser, player, "L lost", "/positions?tab=open", { loseHost: true, crashOk: crash });
    await L.page.waitForTimeout(6000);
    const crashed = (await L.page.getByText(CRASH_TITLES).count()) > 0;
    const shellUp = (await L.page.locator("#main-content").count()) > 0;
    if (crash) {
      // ⚠️ 2026-10-06: the 10-04 control saw no critical-error screen. Say WHY before judging it: did the import really
      // fail (the host must then NOT answer the event), what the page threw, and what it drew.
      const answered = await L.page.evaluate(() => {
        const ack = { accepted: false };
        window.dispatchEvent(new CustomEvent("50pick:sell-result", { detail: { resultData: { variant: "danger", value: 1, net: 0, error: "drive" }, positionId: "drive", journey: false, from: null, ack } }));
        return ack.accepted;
      }).catch((e) => `evaluate failed: ${String(e).slice(0, 120)}`);
      const drawn = await L.page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " ").slice(0, 300)).catch(() => "?");
      await L.page.screenshot({ path: `${OUT}/C-crash-control.png` }).catch(() => {});
      say(`C.diag host answered the event: ${JSON.stringify(answered)} · page errors: ${JSON.stringify(L.errors ?? [])} · drawn: ${drawn}`);
      ok("C.0 the host's chunk was really aborted", L.reports.aborted > 0, JSON.stringify(L.reports));
      ok("C.1 CONTROL: without the guard, the same lost chunk reaches the critical-error screen", crashed, JSON.stringify(L.reports));
    } else {
      ok("L.0 the host's chunk was really aborted", L.reports.aborted > 0, JSON.stringify(L.reports));
      ok("L.1 a lost chunk leaves the page up (no critical-error screen, the shell is there)", !crashed && shellUp, JSON.stringify({ crashed, shellUp }));
      ok("L.2 …and is reported to /api/client-error", L.reports.clientError >= 1, JSON.stringify(L.reports));
      const accepted = await L.page.evaluate(() => {
        const ack = { accepted: false };
        window.dispatchEvent(new CustomEvent("50pick:sell-result", { detail: { resultData: { variant: "danger", value: 1, net: 0, error: "drive" }, positionId: "drive", journey: false, from: null, ack } }));
        return ack.accepted;
      });
      ok("L.3 …no host answers the event", accepted === false, `accepted=${accepted}`);
      const btn = await sellButton(L.page, null);
      if (await btn.count()) {
        await btn.click();
        L.plan.next = { kind: "abort" };
        await confirmSale(L.page);
        const own = await L.page.locator('[role="alertdialog"]:visible').filter({ hasText: /Haikufanikiwa kutoa/ }).first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
        ok("L.4 …and a refused sale's ✗ result is drawn by the Sell button itself (the fallback)", own);
        await shot(L.page, "L-fallback-result-390");
        await closeDialogs(L.page);
      } else ok("L.4 an open Sell button to try the fallback on", false);
    }
    await L.ctx.close();
  } else {
    // ── E: the host answers the event ──
    {
      const E = await open(browser, player, "E event", "/positions?tab=open");
      const accepted = await E.page.evaluate(() => {
        const ack = { accepted: false };
        window.dispatchEvent(new CustomEvent("50pick:sell-result", { detail: { resultData: { variant: "danger", value: 1000, net: 0, error: "drive" }, positionId: "drive", journey: false, from: null, ack } }));
        return ack.accepted;
      });
      const shown = await visibleResult(E.page, "drive").first().waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
      ok("E.1 the host answers the event (accepted) and draws its result", accepted === true && shown, `accepted=${accepted} shown=${shown}`);
      await closeDialogs(E.page);
      await E.ctx.close();
    }

    // ── K: a keyboard sale on the classic open lens ──
    {
      const K = await open(browser, player, "K keyboard", "/positions?tab=open");
      const btn = await sellButton(K.page, ids[0]);
      await btn.focus();
      await K.page.keyboard.press("Enter");
      await K.page.locator('[aria-modal="true"]:visible').first().waitFor({ timeout: 8000 });
      await K.page.waitForTimeout(400);
      await K.page.keyboard.press("Enter");
      const result = await visibleResult(K.page, /Imerudishwa/).first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
      await K.page.waitForTimeout(3000);
      const rowGone = (await (await sellButton(K.page, ids[0])).count()) === 0;
      const still = await visibleResult(K.page, /Imerudishwa/).count();
      ok("K.1 a keyboard sale's result outlives its row: on screen 3 s on, the sold ticket gone from the open lens", result && still > 0 && rowGone, JSON.stringify({ result, still, rowGone }));
      await shot(K.page, "K-result-390");
      await K.page.keyboard.press("Enter");
      await K.page.waitForTimeout(800);
      const f = await focusOf(K.page);
      ok("K.2 Enter on Sawa closes it, and focus is on a control in the main region (the next ticket or the list's own), never <body>, never a field", !f.body && f.inMain && !f.field, JSON.stringify(f));
      await K.ctx.close();
    }

    // ── U: a sale left alone, on the all lens ──
    {
      const U = await open(browser, player, "U untouched", "/positions?tab=all");
      await (await sellButton(U.page, ids[1])).click();
      await confirmSale(U.page);
      const appeared = await visibleResult(U.page, /Imerudishwa/).first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
      const t0 = Date.now();
      await U.page.mouse.move(2, 2);
      await sleep(t0 + 4500 - Date.now());
      const at45 = await visibleResult(U.page, /Imerudishwa/).count();
      let goneAt = null;
      while (Date.now() - t0 < 8000) {
        if (!(await visibleResult(U.page, /Imerudishwa/).count())) { goneAt = Date.now() - t0; break; }
        await U.page.waitForTimeout(150);
      }
      const toast = await U.page.locator('[role="status"]').filter({ hasText: /imerejeshwa/ }).first().waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
      const f = await focusOf(U.page);
      ok("U.1 a sale left alone keeps its result past 4.5 s, closes by itself by 7 s (§F2's shared 5 s), then its toast shows (role=status), and focus is on a control in the main region", appeared && at45 > 0 && goneAt !== null && goneAt <= 7000 && toast && !f.body && f.inMain, JSON.stringify({ appeared, at45, goneAt, toast, f }));
      await U.ctx.close();
    }

    // ── H: the question page's holder block ──
    {
      const H = await open(browser, player, "H holder", `/markets/${ids[2]}`);
      await (await sellButton(H.page, ids[2])).click();
      await confirmSale(H.page);
      const result = await visibleResult(H.page, /Imerudishwa/).first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
      await H.page.waitForTimeout(3000);
      const still = await visibleResult(H.page, /Imerudishwa/).count();
      const sellGone = (await (await sellButton(H.page, ids[2])).count()) === 0;
      ok("H.1 a sale from the question page's holder block keeps its result after the refresh took the Sell button away", result && still > 0 && sellGone, JSON.stringify({ result, still, sellGone }));
      await shot(H.page, "H-result-390");
      await closeDialogs(H.page);
      await H.ctx.close();
    }

    // ── F: a fault (the sale's request aborted) on the classic open lens ──
    {
      const F = await open(browser, player, "F fault", "/positions?tab=open");
      await (await sellButton(F.page, ids[3])).click();
      F.plan.next = { kind: "abort" };
      await confirmSale(F.page);
      const result = await F.page.locator('[role="alertdialog"]:visible').filter({ hasText: /Haikufanikiwa kutoa/ }).first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
      const t0 = Date.now();
      await F.page.mouse.move(2, 2);
      const heldToast = await F.page.locator('[role="alert"]').filter({ hasText: /Imeshindikana kutoa/ }).count();
      await sleep(t0 + 6500 - Date.now());
      const still = await F.page.locator('[role="alertdialog"]:visible').count();
      ok("F.1 a request that never answers (BUSY: a fault) opens the ✗ result, with no toast shown behind it (§F1), and it is still up at 6.5 s (a refusal never closes by itself)", result && heldToast === 0 && still > 0, JSON.stringify({ result, heldToast, still }));
      await shot(F.page, "F-fault-result-390");
      await closeDialogs(F.page);
      const red = F.page.locator('[role="alert"]').filter({ hasText: /Imeshindikana kutoa/ }).first();
      const redShown = await red.waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
      const tRed = Date.now();
      const f = await focusOf(F.page);
      await sleep(tRed + 6000 - Date.now());
      const redStill = await red.isVisible().catch(() => false);
      ok("F.2 on Funga the red toast (role=alert) shows and is still up 6 s on (kept until it is read, on a money path); focus is back on the ticket's Sell button", redShown && redStill && f.target, JSON.stringify({ redShown, redStill, f }));
      await shot(F.page, "F-fault-toast-390");
      await dismissToasts(F.page);
      await F.ctx.close();
    }

    // ── N: Back closes the result ──
    {
      const N = await open(browser, player, "N back", "/positions?tab=open");
      await N.page.locator(`a[href^="/markets/${ids[3]}"]`).first().click();
      await N.page.waitForURL((u) => u.pathname === `/markets/${ids[3]}`, { timeout: 60_000 });
      await N.page.waitForTimeout(2500);
      await (await sellButton(N.page, ids[3])).click();
      N.plan.next = { kind: "abort" };
      await confirmSale(N.page);
      const result = await N.page.locator('[role="alertdialog"]:visible').first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
      await N.page.goBack();
      await N.page.waitForURL((u) => u.pathname === "/positions", { timeout: 60_000 }).catch(() => {});
      await N.page.waitForTimeout(1500);
      const left = await N.page.locator('[aria-modal="true"]:visible').count();
      ok("N.1 Back with the ✗ result open closes it: the page before shows no dialog (a move to another page closes the result)", result && left === 0 && new URL(N.page.url()).pathname === "/positions", JSON.stringify({ result, left, url: N.page.url() }));
      await dismissToasts(N.page);
      await N.ctx.close();
    }

    // ── J: the journey look's word, in the host's result ──
    {
      const J = await open(browser, [...player, pass], "J journey", "/positions");
      await (await sellButton(J.page, ids[3])).click();
      J.plan.next = { kind: "abort" };
      await confirmSale(J.page);
      const dlg = J.page.locator('[role="alertdialog"]:visible').first();
      const shown = await dlg.waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
      const text = shown ? ((await dlg.textContent().catch(() => "")) ?? "") : "";
      ok("J.1 the journey look's ✗ result says Tiketi haijabadilika. and never Nafasi haijabadilika. (the look the button handed the host)", shown && text.includes("Tiketi haijabadilika.") && !text.includes("Nafasi haijabadilika."), text.slice(0, 200));
      await shot(J.page, "J-fault-result-390");
      await closeDialogs(J.page);
      await dismissToasts(J.page);
      await J.ctx.close();
    }
  }
} catch (e) {
  failures += 1;
  say(`FAIL the drive stopped: ${String(e?.stack ?? e).slice(0, 600)}`);
} finally {
  await browser.close().catch(() => {});
}
writeFileSync(`${OUT}/report-${MODE}.txt`, report.join(String.fromCharCode(10)) + String.fromCharCode(10));
console.log(failures ? `a8h result drive (${MODE}): ${failures} failure(s)` : `a8h result drive (${MODE}): all passed`);
process.exit(failures ? 1 : 0);
