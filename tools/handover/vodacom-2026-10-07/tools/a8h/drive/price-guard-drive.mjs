// S6 A8h DRIVE (the A8c price-guard drive, written for A8h; NOT YET RUN when it was written) — a sale's result outlives its
// row, a moved price is told by its toast alone, and every refused sale is as loud as the registry ranks it, in a real
// browser, both looks. Every line A8h does not change is the A8c drive's own.
// usage (via run-with-server.sh): node price-guard-drive.mjs <outDir> <paid|current>
//   paid    — questions frozen with a 3-minute free window and a 10-minute paid window (a legacy paid poll):
//             A  classic /positions, ticket 1: the sale is confirmed 0.8 s before the window ends and the REQUEST is held
//                2.5 s (route.fetch after a wait, then fulfil), so the server prices it after the end → price_changed:
//                "Inauza…" across 0:00, then "Inapakia…" (A8c's repricing); a calm toast (role=status, never alert) names
//                the new price within a moment of the answer and NO dialog opens (A8h); the toast is still up 6 s on (it
//                stays until read), focus is back on the Sell button once it offers the new price, and the balance is
//                unchanged; then one more tap sells at the new price, its result outlives the row, and that sale
//                dismissed the moved price's toast.
//             C  the journey look (staff pass), ticket 3: the same, in the journey's words.
//             B  the question page's holder block, ticket 2, inside the window: the figure sent is "3,600", then "" →
//                refused with the generic line in a calm toast and no dialog (A8h: a broken figure is a warning),
//                nothing moved, no refresh asked.
//             D  classic /positions, ticket 4, inside the window: the figure field removed (a page from before the deploy)
//                → sold as before (no check); its result is still on screen after the open lens dropped the sold
//                ticket (A8h; the A8c run measured 388 ms), and, left alone, it closes at §F2's 5 s, then its toast shows.
//             /profile/account afterwards: the refusals read as records under "Madau", never as a raw token.
//             TILES: a forced price_changed (the figure sent is "1") at 280 to 1280 × sw/en/zh × classic/journey — the
//             confirm, then the toast with the waiting button (no result): "TZS" and its figure on one line in the toast.
//   current — questions with no paid window: A's held sale meets the shut exit → "Muda wa kuuza dau hili umefungwa…"
//             in a calm toast (role=status: the registry ranks it an info) and no dialog (A8h), no repricing state, no
//             record under "Madau".
// ⛔ Local in-memory dev server only (premise refuses anything else).
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const repoRequire = createRequire("C:/kipindi-journey/package.json");
const { chromium } = repoRequire("playwright");
const { premise, mintStaffPass, demoSession, LOCALE_COOKIE } = await import("file:///C:/kipindi-journey/scripts/live/journey-pass.mjs");

const base = process.env.KP_BASE ?? "http://localhost:3041";
const OUT = process.argv[2] ?? "a8c-drive-out";
const MODE = process.argv[3] ?? "paid";
mkdirSync(OUT, { recursive: true });
const p0 = await premise(base);
if (p0.refuse) { console.log(`REFUSED: ${p0.refuse}`); process.exit(2); }

const GRACE_MIN = 3;
const PAID_MIN = MODE === "paid" ? 10 : 0;
const report = [];
let failures = 0;
const say = (s) => { report.push(s); console.log(s); };
const ok = (label, cond, detail = "") => { if (!cond) failures += 1; say(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
const until = (t) => sleep(t - Date.now());
const digits = (s) => { const m = /\d{1,3}(?:,\d{3})+|\d+/.exec(String(s ?? "")); return m ? Number(m[0].replace(/,/g, "")) : 0; };

const RECORDER = () => {
  const rec = { log: [], dialogs: [], refresh: 0 };
  window.__a8c = rec;
  window.addEventListener("50pick:refresh", () => { rec.refresh += 1; }, true);
  const last = new Map();
  let lastDlg = "";
  const tick = () => {
    const now = Date.now();
    let i = 0;
    for (const b of Array.from(document.querySelectorAll("button"))) {
      const text = (b.textContent || "").replace(/\s+/g, " ").trim();
      if (!/TZS|Inapakia|Kuuza kumefungwa|Inauza|Loading|Selling|加载中|出售中/.test(text) || b.closest('[aria-modal="true"]')) continue;
      const key = `${i++}`;
      const v = `${text}|${b.disabled}|${b.hasAttribute("data-a8c-target")}`;
      if (last.get(key) !== v) { last.set(key, v); rec.log.push({ t: now, key, text, disabled: b.disabled, target: b.hasAttribute("data-a8c-target") }); }
    }
    const d = Array.from(document.querySelectorAll('[aria-modal="true"]')).map((x) => (x.textContent || "").replace(/\s+/g, " ").trim().slice(0, 300)).join(" | ");
    if (d !== lastDlg) { lastDlg = d; rec.dialogs.push({ t: now, text: d }); }
  };
  new MutationObserver(tick).observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["disabled", "aria-modal"] });
};

// The one request a sale is: a server action whose form names the ticket. `plan.next` is consumed by the next sale.
function saleRoute(page, tag) {
  const plan = { next: null, seen: [] };
  page.route("**/*", async (route) => {
    const r = route.request();
    const h = r.headers();
    let body = "";
    try { body = r.postData() ?? ""; } catch { body = ""; }
    if (r.method() !== "POST" || !h["next-action"] || !body.includes("positionId")) return route.continue();
    const step = plan.next;
    plan.next = null;
    const ct = h["content-type"] ?? "";
    const boundary = (/boundary=([^;]+)/.exec(ct) || [])[1];
    plan.seen.push({ t: Date.now(), kind: step?.kind ?? "pass", hadFigure: body.includes("expectedValue") });
    if (!step || step.kind === "pass") return route.continue();
    if (step.kind === "abort") return route.abort("failed");
    if (step.kind === "delay") {
      await sleep(step.ms);
      const resp = await route.fetch();
      plan.seen[plan.seen.length - 1].answeredAt = Date.now();
      return route.fulfill({ response: resp });
    }
    if (!boundary) { say(`FAIL ${tag}: no multipart boundary on the sale request`); failures += 1; return route.continue(); }
    const sep = `--${boundary}`;
    const parts = body.split(sep);
    const out = [];
    for (const part of parts) {
      if (/name="(\d+_)?expectedValue"/.test(part)) {
        if (step.kind === "strip") continue;
        const m = /^([\s\S]*?\r\n\r\n)([\s\S]*?)(\r\n)$/.exec(part);
        out.push(m ? `${m[1]}${step.value}${m[3]}` : part);
      } else out.push(part);
    }
    const next = out.join(sep);
    const resp = await route.fetch({ postData: next });
    return route.fulfill({ response: resp });
  });
  return plan;
}

async function open(browser, cookies, tag, path, width = 390, locale = "sw") {
  const ctx = await browser.newContext({ viewport: { width, height: width < 1024 ? 780 : 900 } });
  await ctx.addCookies([...cookies, { name: LOCALE_COOKIE, value: locale, url: base }]);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { failures += 1; say(`FAIL script error on ${tag}: ${String(e?.message ?? e).slice(0, 200)}`); });
  page.on("console", (m) => { if (/hydrat/i.test(m.text())) { failures += 1; say(`FAIL hydration warning on ${tag}: ${m.text().slice(0, 200)}`); } });
  await page.addInitScript(RECORDER);
  const plan = saleRoute(page, tag);
  await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 240_000 });
  await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {});
  await page.waitForTimeout(1500);
  return { ctx, page, plan, tag };
}

// The Sell button of one ticket: each Sell button's NEAREST ancestor that holds a question link must link to THIS
// question (a /positions row or a journey ticket card); on the question's own page, its first Sell button. The match is
// tagged and returned as a locator.
async function sellButton(page, marketId) {
  // A Sell button lives in ONE ticket's row: its nearest ancestor that holds question links must link to exactly one
  // question (a /positions row or a journey ticket card). The header, the navigation and dialogs are never a row —
  // the wallet pill reads "TZS", and walking up from it reaches the page, which links every question.
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
    return hit ? (hit.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80) : null;
  }, marketId);
  if (!found) say(`note: no Sell button for ${marketId ?? "any ticket"} on ${page.url()}`);
  return page.locator('[data-a8c-target="1"]').first();
}

async function balance(page) {
  const pill = page.locator('[data-testid="wallet-balance-pill"], [data-testid="journey-balance"]').first();
  if (!(await pill.count())) return null;
  return digits(await pill.textContent());
}

async function confirmSale(page) {
  const confirm = page.locator('[aria-modal="true"]:visible button').filter({ hasText: /·\s*TZS/ }).first();
  try { await confirm.waitFor({ timeout: 8000 }); }
  catch (e) { await page.screenshot({ path: `${OUT}/confirm-missing-${Date.now()}.png` }).catch(() => {}); throw new Error(`no confirm opened on ${page.url()}: ${String(e?.message ?? e).slice(0, 80)}`); }
  await confirm.click();
}

async function closeDialogs(page) {
  for (let i = 0; i < 3; i++) {
    const d = page.locator('[aria-modal="true"]:visible');
    if (!(await d.count())) return;
    const btn = d.locator("button").filter({ hasText: /^(Sawa|OK|Done|好的|确定|Funga|Close|关闭)$/ }).first();
    if (await btn.count()) await btn.click().catch(() => {});
    else await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(500);
  }
}

// A sale's result, read from the recorder's dialog log: it sees a result even if it leaves the screen at once (on /positions'
// open lens the sold ticket's row — which owns the dialog — leaves the list when the page refreshes: A8h's finding).
async function soldResult(page, figure, word) {
  await page.waitForTimeout(2500);
  const rec = await page.evaluate(() => window.__a8c).catch(() => null);
  const dl = rec?.dialogs ?? [];
  const i = dl.findIndex((d) => d.text.includes(figure) && word.test(d.text));
  if (i < 0) return { shown: false, ms: 0 };
  const gone = dl.slice(i + 1).find((d) => !(d.text.includes(figure) && word.test(d.text)));
  return { shown: true, ms: gone ? gone.t - dl[i].t : null };
}
const shot = async (page, name) => { await page.screenshot({ path: `${OUT}/${name}.png` }).catch(() => {}); };
// A8h · the dialogs that opened after a moment (the confirm closing logs an empty entry), from the recorder's own log.
async function dialogsSince(page, t) {
  const rec = await page.evaluate(() => window.__a8c).catch(() => null);
  return (rec?.dialogs ?? []).filter((d) => d.t > t + 300 && d.text);
}
// A8h · wait until the dialog naming a figure has gone (at most ms), and read how long it stood, whether the sale's toast
// then shows, and where focus is. ⚠️ 2026-10-06 (D.3's clock): the RESULT is the entry holding the figure AND the result's
// word — the confirm before it holds the same figure, so timing "the first entry with the figure" timed the CONFIRM
// (753 ms = the drive's own press), never the result. Timed from the result's own entry in the recorder's log.
async function untilGone(page, figure, ms, word) {
  const isIt = (d) => d.text.includes(figure) && (!word || word.test(d.text));
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (!(await page.locator('[aria-modal="true"]:visible').filter({ hasText: figure }).count())) break;
    await page.waitForTimeout(200);
  }
  const rec = await page.evaluate(() => window.__a8c).catch(() => null);
  const dl = rec?.dialogs ?? [];
  const i = dl.findIndex(isIt);
  const gone = i < 0 ? null : dl.slice(i + 1).find((d) => !isIt(d));
  const toast = await page.locator('[role="status"]').filter({ hasText: /imerejeshwa/ }).first().waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
  const focus = await page.evaluate(() => {
    const a = document.activeElement;
    const main = document.getElementById("main-content");
    return { body: !a || a === document.body, inMain: !!(a && main && main.contains(a)), tag: a ? a.tagName : null };
  });
  return { closedAfterMs: gone ? gone.t - dl[i].t : null, toast, focus };
}
// A8h · a money figure in a toast: "TZS" and its number on one line (a no-break space joins them since A8h).
const TOAST_FIGURE_SPLIT = () => {
  for (const box of Array.from(document.querySelectorAll('[role="status"] p'))) {
    const node = Array.from(box.childNodes).find((n) => n.nodeType === 3 && (n.textContent || "").includes("TZS"));
    if (!node) continue;
    const s = node.textContent || "";
    const at = s.indexOf("TZS");
    let end = at + 4;
    while (end < s.length && "0123456789,".includes(s[end])) end += 1;
    const r = document.createRange();
    r.setStart(node, at);
    r.setEnd(node, end);
    const tops = new Set(Array.from(r.getClientRects()).filter((x) => x.width > 0).map((x) => Math.round(x.top)));
    if (tops.size > 1) return s.slice(at, end);
  }
  return null;
};

const browser = await chromium.launch();
try {
  // ── setup: the poll config, the questions, the player (and a staff pass for the journey look), four tickets ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const seeded = await ctx.request.post(`${base}/api/dev-test/seed-admin`, { data: {} });
    if (!seeded.ok()) throw new Error(`seed-admin answered ${seeded.status()}`);
    const page = await ctx.newPage();
    await page.goto(`${base}/admin/config`, { waitUntil: "domcontentloaded", timeout: 240_000 });
    const grace = page.locator('input[name="freeExitGraceMinutes"]');
    await grace.waitFor({ timeout: 120_000 });
    await grace.fill(String(GRACE_MIN));
    await page.locator('input[name="paidExitWindowMinutes"]').fill(String(PAID_MIN));
    await page.getByRole("button", { name: "Save · Hifadhi" }).first().click();
    await page.getByText("Global config updated").first().waitFor({ timeout: 60_000 });
    await ctx.close();
  }
  const rm = await (await browser.newContext()).request.post(`${base}/api/dev-test/seed-real-markets`, { data: {} });
  const rmBody = await rm.json().catch(() => ({}));
  const pass = await mintStaffPass(browser, base);
  const session = await demoSession(browser, base, { query: "?deposit=0", balance: 250_000 });
  {
    const ctx = await browser.newContext();
    await ctx.addCookies([session]);
    for (const path of ["/positions?tab=open", `/markets/${rmBody.live?.[0]?.id}`, "/profile/account"]) await ctx.request.get(`${base}${path}`, { timeout: 240_000 }).catch(() => {});
    await ctx.close();
  }
  const seedCtx = await browser.newContext();
  await seedCtx.addCookies([session]);
  const T0a = Date.now();
  const sp = await seedCtx.request.post(`${base}/api/dev-test/seed-player-portfolio`, { data: {} });
  const spBody = await sp.json().catch(() => ({}));
  await seedCtx.close();
  const ids = (spBody.marketIds ?? []).slice(0, 4);
  ok("0 four open tickets under the drive's config", spBody.byStatus?.OPEN === 4 && ids.length === 4, JSON.stringify(spBody.byStatus));
  // The first ticket is bet ~0.1 s after T0a and the last ~0.4 s after: the windows end at T0a + 3 min + 0.1…0.4 s. The
  // drive confirms 0.6 s before this estimate (before every true end, so the confirm is still open) and holds the request
  // 2.5 s (so the server prices it ~2 s after every true end).
  const end = T0a + GRACE_MIN * 60_000 + 300;
  const player = [session];

  const A = await open(browser, player, "A classic", "/positions?tab=open");
  const balA0 = await balance(A.page);

  if (MODE === "paid") {
    const B = await open(browser, player, "B holder", `/markets/${ids[1]}`);
    const D = await open(browser, player, "D classic skew", "/positions?tab=open");
    const C = await open(browser, [...player, pass], "C journey", "/positions");

    // ── B: broken figures, inside the window ──
    for (const bad of ["3,600", ""]) {
      const before = await balance(B.page);
      B.plan.next = { kind: "figure", value: bad };
      await B.page.locator("button").filter({ hasText: /Toka bila gharama|Uza sasa/ }).first().click();
      await confirmSale(B.page);
      const sentAt = Date.now();
      const refusal = await B.page.locator('[role="status"]').filter({ hasText: "Hitilafu imetokea" }).first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
      await shot(B.page, `${MODE}-B-broken-${bad === "" ? "empty" : "comma"}-390`);
      await B.page.waitForTimeout(2000);
      const opened = await dialogsSince(B.page, sentAt + 1500);
      ok(`B.1 a figure of ${JSON.stringify(bad)} is refused with the generic line, in a calm toast (role=status) and no dialog (A8h: a warning)`, refusal && opened.length === 0, JSON.stringify(opened.slice(0, 1)));
      await closeDialogs(B.page);
      await B.page.waitForTimeout(1500);
      const after = await balance(B.page);
      ok(`B.2 …and nothing moved (balance ${before} → ${after}, the button still offers the free exit)`, before === after && (await B.page.locator("button").filter({ hasText: "Toka bila gharama" }).count()) > 0);
    }

    // ── D: no figure at all (a page from before the deploy) → sold as before ──
    {
      const before = await balance(D.page);
      D.plan.next = { kind: "strip" };
      await (await sellButton(D.page, ids[3])).click();
      await confirmSale(D.page);
      const res = await soldResult(D.page, "TZS 3,600", /Imeuzwa|Imerudishwa/);
      const sold = res.shown;
      const rowGone = (await (await sellButton(D.page, ids[3])).count()) === 0;
      ok("D.0 the sale's result outlives its ticket's row: still on screen 2.5 s on, the open lens having dropped the sold ticket (A8h; the A8c run read 388 ms)", sold && res.ms === null && rowGone, JSON.stringify({ res, rowGone }));
      await shot(D.page, `${MODE}-D-skew-sold-390`);
      // A8h · left alone (the pointer off the panel), a sale that went through closes at §F2's shared 5 s, then its toast shows.
      await D.page.mouse.move(2, 2);
      const auto = await untilGone(D.page, "TZS 3,600", 9000, /Imeuzwa|Imerudishwa/);
      ok("D.3 …left alone it closes by itself at §F2's 5 s (not before 4.5 s, by 7 s), then its toast (role=status) shows, and focus is on a control in the main region, never the page's start", auto.closedAfterMs !== null && auto.closedAfterMs >= 4500 && auto.closedAfterMs <= 7000 && auto.toast && !auto.focus.body && auto.focus.inMain, JSON.stringify(auto));
      writeFileSync(`${OUT}/${MODE}-D-rec.json`, JSON.stringify(await D.page.evaluate(() => window.__a8c).catch(() => null), null, 1));
      await closeDialogs(D.page);
      await D.page.waitForTimeout(2500);
      const after = await balance(D.page);
      ok("D.1 a sale with no figure (an old page) is sold as before", sold && D.plan.seen.some((s) => s.kind === "strip" && s.hadFigure), JSON.stringify(D.plan.seen));
      ok("D.2 …and the balance gains the whole stake", after === before + 3600, `${before} → ${after}`);
    }

    // ── A (classic) and C (journey): the sale confirmed 0.8 s before the end, its request held 2.5 s ──
    const heldSale = async (P, marketId, stake, paid) => {
      const before = await balance(P.page);
      await until(end - 4000);
      const target = await sellButton(P.page, marketId);
      const tagged = await target.evaluate((b) => ({ text: (b.textContent || "").replace(/ +/g, " ").trim(), disabled: b.disabled })).catch((e) => ({ error: String(e?.message ?? e).slice(0, 80) }));
      const clickedAt = Date.now();
      await target.click();
      try { await P.page.locator('[aria-modal="true"]:visible').first().waitFor({ timeout: 5000 }); }
      catch (e) {
        await P.page.screenshot({ path: `${OUT}/${MODE}-${P.tag.split(" ")[0]}-no-confirm.png` }).catch(() => {});
        const after = await P.page.locator('[data-a8c-target="1"]').first().evaluate((b) => ({ text: (b.textContent || "").replace(/ +/g, " ").trim(), disabled: b.disabled })).catch(() => null);
        const rec = await P.page.evaluate(() => window.__a8c).catch(() => null);
        writeFileSync(`${OUT}/${MODE}-${P.tag.split(" ")[0]}-no-confirm-rec.json`, JSON.stringify({ clickedAt, end, tagged, rec }, null, 1));
        throw new Error(`${P.tag}: no confirm after clicking ${JSON.stringify(tagged)} (now ${JSON.stringify(after)}) on ${P.page.url()}`);
      }
      await until(end - 600);
      P.plan.next = { kind: "delay", ms: 2500 };
      const confirmedAt = Date.now();
      await confirmSale(P.page);
      // A8h · a moved price opens NO result: its calm toast is the whole answer, on screen at once, and it stays until read.
      // (Matched by its words and its digits: "TZS" and the figure are joined by a no-break space since A8h.)
      const digitsOf = paid.toLocaleString("en-US");
      const toast = P.page.locator('[role="status"]').filter({ hasText: /Bei imebadilika/ }).first();
      const seenToast = await toast.waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
      const toastAt = Date.now();
      await shot(P.page, `${MODE}-${P.tag.split(" ")[0]}-refused-toast-390`);
      const answered = P.plan.seen.find((s) => s.kind === "delay")?.answeredAt ?? confirmedAt;
      const named = seenToast && ((await toast.textContent().catch(() => "")) ?? "").includes(digitsOf);
      const alarm = await P.page.locator('[role="alert"]').filter({ hasText: /Bei imebadilika/ }).count();
      ok(`${P.tag}.1 the held sale is priced after the end and REFUSED: a calm toast (role=status, never alert) names the new price ${digitsOf}, ${toastAt - answered} ms after the answer`, named && alarm === 0 && toastAt - answered < 2500, `toast=${seenToast} named=${named} alarms=${alarm}`);
      await P.page.waitForTimeout(3000);
      const opened = await dialogsSince(P.page, answered);
      ok(`${P.tag}.2 …and opens NO dialog within 3 s (A8h: no result for a refusal one tap fixes)`, opened.length === 0, JSON.stringify(opened.slice(0, 2)));
      const rec = await P.page.evaluate(() => window.__a8c);
      // The TARGET ticket's button only: every other open ticket on the page lapses to "Inapakia…" at 0:00 (A8b).
      const mine = rec.log.filter((r) => r.target);
      const waiting = mine.filter((r) => r.t >= answered - 200 && r.t <= answered + 4000 && r.text.includes("Inapakia"));
      const sellingAcross = mine.filter((r) => r.t >= end - 1000 && r.t < answered - 50 && r.text.includes("Inapakia")).length === 0;
      ok(`${P.tag}.3 …"Inauza…" holds across 0:00, then the button waits ("Inapakia…", no figure) while the new price comes`, sellingAcross && waiting.length > 0 && waiting.every((r) => !/TZS/.test(r.text)), JSON.stringify(waiting.slice(0, 2)));
      const newPrice = await P.page.locator("button").filter({ hasText: digitsOf }).first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
      ok(`${P.tag}.5 …and the button now offers the new price`, newPrice);
      await P.page.waitForTimeout(500);
      const focus = await P.page.evaluate(() => { const a = document.activeElement; return { target: !!(a && a.hasAttribute && a.hasAttribute("data-a8c-target")), tag: a ? a.tagName : null }; });
      ok(`${P.tag}.6 …with focus back on the Sell button (A8h), its name now the new price`, focus.target, JSON.stringify(focus));
      await P.page.waitForTimeout(Math.max(0, toastAt + 6500 - Date.now()));
      ok(`${P.tag}.7 …and the toast is still up 6 s on (it stays until it is read)`, await toast.isVisible().catch(() => false));
      const after = await balance(P.page);
      ok(`${P.tag}.4 …nothing moved (balance ${before} → ${after})`, before === after);
      return { before, after, stake, paid };
    };
    const [ra] = await Promise.all([heldSale(A, ids[0], 1500, 1350), heldSale(C, ids[2], 2900, 2610)]);

    // ── A: one more tap sells at the new price ──
    {
      await (await sellButton(A.page, ids[0])).click();
      await confirmSale(A.page);
      const res = await soldResult(A.page, "TZS 1,350", /Imeuzwa/);
      const sold = res.shown;
      const rowGone = (await (await sellButton(A.page, ids[0])).count()) === 0;
      ok("A.7 the second sale's result outlives its row: still on screen 2.5 s on, the sold ticket gone from the open lens", sold && res.ms === null && rowGone, JSON.stringify({ res, rowGone }));
      await closeDialogs(A.page);
      await A.page.waitForTimeout(800);
      const stale = await A.page.locator('[role="status"]').filter({ hasText: /Bei imebadilika/ }).count();
      ok("A.8 …and the moved price's toast is gone: the new sale dismissed it (never shown again beside the sale's own answer)", stale === 0, `stale=${stale}`);
      await A.page.waitForTimeout(2500);
      const after = await balance(A.page);
      ok("A.6 one more tap sells at the new price, and the balance gains exactly it", sold && after === ra.after + 1350, `${ra.after} → ${after}`);
    }

    // ── the record: /profile/account under "Madau" ──
    {
      const R = await open(browser, player, "R account", "/profile/account");
      const text = (await R.page.locator("main").textContent().catch(() => "")) ?? "";
      await shot(R.page, `${MODE}-R-account-390`);
      ok("R.1 the account page names no raw token", !/sell_refused|market\.position/.test(text));
      ok("R.2 …and shows its bets section", /Madau/.test(text));
      await R.ctx.close();
    }

    // ── TILES: a forced price_changed (the figure sent is "1") at 3 widths × 3 languages × both looks ──
    const LOOKS = [["classic", player, "/positions?tab=open"], ["journey", [...player, pass], "/positions"]];
    for (const [look, cookies, path] of LOOKS) for (const locale of ["sw", "en", "zh"]) for (const width of [280, 320, 360, 390, 412, 1280]) {
      await (await browser.newContext()).request.post(`${base}/api/dev-test/reset-rate-limits`, { data: {} }).catch(() => {});
      const P = await open(browser, cookies, `T ${look}`, path, width, locale);
      const btn = await sellButton(P.page, null);
      if (!(await btn.count())) { say(`tiles ${look} ${locale} ${width}: no open Sell button`); await P.ctx.close(); continue; }
      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.click();
      await P.page.locator('[aria-modal="true"]:visible').first().waitFor({ timeout: 8000 }).catch(() => {});
      await P.page.waitForTimeout(600);
      await shot(P.page, `tile-${look}-confirm--${locale}-${width}`);
      // A8f: the confirm's "you receive" figure is ONE line — "TZS" never parted from its number.
      const split = await P.page.evaluate(() => {
        const d = document.querySelector('[aria-modal="true"]');
        if (!d) return null;
        const bad = [];
        for (const el of Array.from(d.querySelectorAll("p, span, div"))) {
          const t = (el.textContent || "").trim();
          if (!/^(TZS\s[\d,]+|−?TZS\s[\d,]+)$/.test(t) || el.children.length) continue;
          const r = document.createRange(); r.selectNodeContents(el);
          const tops = new Set(Array.from(r.getClientRects()).filter((x) => x.width > 0).map((x) => Math.round(x.top)));
          if (tops.size > 1) bad.push(t);
        }
        return bad;
      });
      if (split && split.length) { failures += 1; say(`FAIL tiles ${look} ${locale} ${width}: a money figure splits over lines in the confirm — ${JSON.stringify(split)}`); }
      P.plan.next = { kind: "figure", value: "1" };
      await confirmSale(P.page).catch(() => {});
      await P.page.waitForTimeout(700);
      await shot(P.page, `tile-${look}-toast--${locale}-${width}`);
      await P.page.waitForTimeout(1800);
      await shot(P.page, `tile-${look}-after--${locale}-${width}`);
      // A8h: no result for a moved price, and the toast keeps "TZS" with its figure at every width.
      if (await P.page.locator('[aria-modal="true"]:visible').count()) { failures += 1; say(`FAIL tiles ${look} ${locale} ${width}: a dialog is open after a moved price (A8h: none)`); }
      const toastSplit = await P.page.evaluate(TOAST_FIGURE_SPLIT);
      if (toastSplit) { failures += 1; say(`FAIL tiles ${look} ${locale} ${width}: the moved price's toast splits its figure — ${toastSplit}`); }
      const overflow = await P.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) { failures += 1; say(`FAIL tiles ${look} ${locale} ${width}: the page is ${overflow}px wider than the viewport`); }
      await P.ctx.close();
    }
    say("tiles: drawn (read them one by one)");
  } else {
    // ── current poll: the held sale meets the shut exit, exactly as before A8c ──
    await until(end - 4000);
    await (await sellButton(A.page, ids[0])).click();
    await A.page.locator('[aria-modal="true"]:visible').first().waitFor({ timeout: 5000 });
    await until(end - 600);
    A.plan.next = { kind: "delay", ms: 2500 };
    await confirmSale(A.page);
    const shutToast = await A.page.locator('[role="status"]').filter({ hasText: /Muda wa kuuza|umefungwa/ }).first().waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
    await shot(A.page, `${MODE}-A-shut-390`);
    await A.page.waitForTimeout(3000);
    const answeredS = A.plan.seen.find((s) => s.kind === "delay")?.answeredAt ?? Date.now();
    const openedS = await dialogsSince(A.page, answeredS);
    const alarm = await A.page.locator('[role="alert"]').filter({ hasText: /Muda wa kuuza|umefungwa/ }).count();
    const calm = await A.page.locator('[role="status"]').filter({ hasText: /Bei imebadilika/ }).count();
    ok("S.1 the held sale meets the shut exit: a calm toast (role=status, never alert) says the window has closed, and no dialog opens (A8h: the registry ranks it an info)", shutToast && alarm === 0 && calm === 0 && openedS.length === 0, `toast=${shutToast} alarm=${alarm} calm=${calm} dialogs=${openedS.length}`);
    await A.page.waitForTimeout(3000);
    ok("S.2 …nothing moved", (await balance(A.page)) === balA0);
    const R = await open(browser, player, "R account", "/profile/account");
    const text = (await R.page.locator("main").textContent().catch(() => "")) ?? "";
    ok("S.3 …and nothing about it is recorded as a moved price", !/Bei imebadilika|sell_refused/.test(text));
    await R.ctx.close();
  }
} catch (e) {
  failures += 1;
  say(`FAIL the drive stopped: ${String(e?.stack ?? e).slice(0, 600)}`);
} finally {
  await browser.close().catch(() => {});
}
writeFileSync(`${OUT}/report-${MODE}.txt`, report.join("\n") + "\n");
console.log(failures ? `a8c price-guard drive (${MODE}): ${failures} failure(s)` : `a8c price-guard drive (${MODE}): all passed`);
process.exit(failures ? 1 : 0);
