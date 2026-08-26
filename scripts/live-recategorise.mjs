/**
 * JAY UNIT H (#14) DRIVEN ON PRODUCTION — a mis-filed market is corrected, and a client that
 * sends what the console never offered is REFUSED.
 *
 *   node scripts/live-recategorise.mjs
 *
 * ⛔ WHY THE HOSTILE-CLIENT LEG EXISTS. The console cannot express `politics`: the Select is
 * fed `MARKET_CATEGORIES`, which excludes it by licence. So driving the console proves only
 * that the WIDGET is safe. The licence is not protected by a widget. Leg 3 therefore lets the
 * real click happen, captures the server-action POST and replays it with the category rewritten
 * to `politics` — exactly the request a modified client would send — and asserts the SERVER
 * refuses it and the market does not move. The Select is manners; this is the seal.
 *
 * ⚠️ Signs in as ADMIN, and says so: re-categorisation is admin-gated, so ADMIN is the correct
 * persona here rather than a bypass of a domain check.
 *
 * ⛔ AND A MISSING CREDENTIAL MUST NEVER READ AS A PASS. This machine does not hold
 * `QA_ADMIN_PASSWORD` (Ali's own console login, which the harness forbids re-minting). Without
 * it the driver runs the leg it CAN prove live — that a non-admin officer is not handed the
 * control — reports the other five as NOT RUN, and exits 2. A skipped run is not a green one.
 *
 * ⚠️ IT PUTS THE MARKET BACK. Leg 5 restores the original category and re-reads it.
 */
import { readFileSync } from "node:fs";
import { BASE, browser, loginOnce } from "./live/harness.mjs";

const MARKET = process.env.RECAT_MARKET ?? "mkt_b143eb8a1724e5da0608";
const PERMITTED = ["sports", "crypto", "macro", "weather", "culture", "tech", "other"];
const BANNED = "politics";

let pass = 0, fail = 0;
const ok = (label, cond, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};

/**
 * ⛔ THE LOCATOR IS THE ARIA QUESTION, NOT THE DOM QUESTION — and getting that wrong made every
 * leg of this driver unrunnable while the one leg that DID run reported a vacuous PASS.
 *
 * This file used to locate the control with the attribute selector `[aria-label=…]`. That
 * attribute is never on the page. `Select` (src/components/ui/select.tsx) is an APG select-only
 * combobox: it takes its name from a REFERENCED label — `aria-labelledby` at a visually hidden
 * span — and deliberately never emits the inline one, because that would replace the trigger's
 * CONTENT, which is the control's VALUE. So the selector matched zero elements on a page where
 * the control was fully present and working. See E-225.
 *
 * 🔴 AND THE HALF THAT LIED. The RBAC leg asserts `!hasControl` — "a non-admin is not handed the
 * control". With a selector that can never match, that leg passes for EVERYBODY, an ADMIN holding
 * the control included. Ali's standard catches it in one question: would this still pass if the
 * feature were absent? Yes — and also if it were present and wide open. ⭐ So the RBAC leg now
 * carries its own POSITIVE CONTROL: the same locator must FIND the control for the ADMIN in the
 * same run, or the negative result is not evidence.
 *
 * ⭐ getByRole("combobox", { name }) is the right question because it is the ACCESSIBLE NAME —
 * what a screen-reader user actually gets. It fails when the name is wrong, which is exactly the
 * defect that hid here.
 */
const categoryBox = (page) => page.getByRole("combobox", { name: "Category" });

/** The category the admin page currently shows, read off the Select trigger's own text. */
async function readCategory(page) {
  const box = categoryBox(page);
  if (!(await box.count())) return null;
  return ((await box.first().innerText()) || "").replace(/\s+/g, " ").trim().toLowerCase();
}

async function openAdminMarket(page) {
  await page.goto(`${BASE}/admin/markets/${MARKET}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await categoryBox(page).first().waitFor({ state: "visible", timeout: 45_000 });
  await page.waitForTimeout(1_500);
}

function haveAdminCredential() {
  if (process.env.QA_ADMIN_PASSWORD) return true;
  try { return /QA_ADMIN_PASSWORD/.test(readFileSync(".env.qa.local", "utf8")); } catch { return false; }
}

const { b } = await browser();
let notRun = 0;
try {
  if (!haveAdminCredential()) {
    console.log("⚠️  QA_ADMIN_PASSWORD absent — running the RBAC leg only; legs 1–5 NOT RUN.\n");
    const st = await loginOnce(b, "fleet:01");
    const c2 = await b.newContext({ storageState: st, viewport: { width: 1440, height: 1000 } });
    const p2 = await c2.newPage();
    const res = await p2.goto(`${BASE}/admin/markets/${MARKET}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await p2.waitForTimeout(2_500);
    const body = await p2.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " ").trim());
    const hasControl = (await categoryBox(p2).count()) > 0;
    // 🔴 A non-ADMIN must not be handed the control. Refusing the page outright and rendering
    // it without the control are both correct; being OFFERED it is not.
    ok("RBAC: 🔴 a non-admin is not handed the re-categorise control on production",
       !hasControl, `http=${res?.status()} · url=${p2.url()} · ${body.slice(0, 110)}`);
    notRun = 6;
  } else {
    const state = await loginOnce(b, "admin");
    const ctx = await b.newContext({ storageState: state, viewport: { width: 1440, height: 1000 } });
    const page = await ctx.newPage();

    // ── 1 · THE CONTROL IS REALLY ON PRODUCTION, offering exactly what the licence permits ──
    await openAdminMarket(page);
    const original = await readCategory(page);
    ok("1: the re-categorise control renders on production", original !== null, `current=${original}`);

    await categoryBox(page).first().click();
    await page.waitForTimeout(700);
    const offered = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[role="listbox"] [role="option"]'))
        .map((o) => (o.innerText || "").replace(/\s+/g, " ").trim().toLowerCase()));
    ok("1: the console offers exactly the categories the licence permits",
       offered.length === PERMITTED.length && PERMITTED.every((c) => offered.includes(c)), offered.join(","));
    ok(`1: 🔴 "${BANNED}" is not offerable`, !offered.includes(BANNED), offered.join(","));

    // ── 2 · ⭐ THE CORRECTION REALLY WORKS, on a real production market ─────────
    const target = PERMITTED.find((c) => c !== original);
    let actionHeaders = null, actionUrl = null, actionBody = null;
    page.on("request", (req) => {
      if (req.method() === "POST" && req.headers()["next-action"]) {
        actionHeaders = req.headers(); actionUrl = req.url(); actionBody = req.postData();
      }
    });
    await page.click(`[role="listbox"] [role="option"]:has-text("${target}")`);
    await page.waitForTimeout(400);
    await page.click('button:has-text("Save category")');
    await page.waitForTimeout(5_000);
    await openAdminMarket(page);
    ok("2: ⭐ the market really moved", (await readCategory(page)) === target, `${original} → ${target}`);
    ok("2: …and the action was a real server-action POST we can replay",
       Boolean(actionUrl && actionBody), actionUrl ?? "no POST captured");

    // ── 3 · 🔴 THE HOSTILE CLIENT — the console never offered this; the SERVER must refuse ──
    let hostile = { status: 0, text: "" };
    if (actionUrl && actionBody) {
      hostile = await page.evaluate(async ({ url, headers, body, target, banned }) => {
        const h = {};
        for (const [k, v] of Object.entries(headers)) {
          if (["host", "content-length", "connection"].includes(k.toLowerCase())) continue;
          h[k] = v;
        }
        const res = await fetch(url, { method: "POST", headers: h, body: body.split(target).join(banned), credentials: "include" });
        return { status: res.status, text: (await res.text()).slice(0, 4000) };
      }, { url: actionUrl, headers: actionHeaders, body: actionBody, target, banned: BANNED });
    }
    ok("3: 🔴 the server ANSWERED the hostile request rather than crashing", hostile.status === 200, `HTTP ${hostile.status}`);
    ok("3: 🔴 …and the answer is a REFUSAL naming the permitted categories",
       /not a category this licence permits/i.test(hostile.text) && PERMITTED.every((c) => hostile.text.includes(c)),
       hostile.text.slice(0, 200).replace(/\s+/g, " "));
    await openAdminMarket(page);
    const stillThere = await readCategory(page);
    ok("3: 🔴 …and the market did NOT move to the licence-excluded category",
       stillThere === target, `now=${stillThere}, expected still ${target}`);

    // ── 4 · A × H — the player board REGROUPS ─────────────────────────────────
    // ⛔ THIS LEG WAS WRONG TWICE, AND BOTH TIMES IT ACCUSED A PRODUCT THAT WAS CORRECT.
    // ① It queried `/markets?cat=…`. The board's category parameter is `topic` (parsed by
    //    `parseDiscoveryParams`, src/lib/markets/discovery.ts) — `cat` is not read at all, so
    //    every category returned byte-identical HTML and the leg could never pass. Measured:
    //    cat=culture and cat=sports both returned 24 ids, though culture holds ONE live market.
    // ② It then grepped page 1 for the id. The board pages at PLAYER_PER_PAGE server-side, so
    //    whether a market appears on page 1 is a fact about SORT ORDER, not about its category.
    // ⭐ So the leg now pages through `?topic=` until it finds the market, and — the part that
    // makes it about REGROUPING rather than mere presence — asserts it is GONE from the topic
    // it came from. A market that appears under both has not moved.
    const onTopic = async (topic) => await page.evaluate(async ({ base, t, id }) => {
      for (let p = 1; p <= 12; p++) {
        const html = await (await fetch(`${base}/markets?topic=${t}&page=${p}`, { credentials: "include" })).text();
        if (html.includes(id)) return p;
      }
      return 0;
    }, { base: BASE, t: topic, id: MARKET });
    const foundUnderNew = await onTopic(target);
    const foundUnderOld = await onTopic(original);
    ok("4: ⭐ the market appears under its NEW category on the player board",
       foundUnderNew > 0, `/markets?topic=${target} → page ${foundUnderNew || "not found in 12 pages"}`);
    ok("4: ⭐ …and it is GONE from the category it came from — it moved, it was not copied",
       foundUnderOld === 0, `/markets?topic=${original} → ${foundUnderOld ? `still on page ${foundUnderOld}` : "absent"}`);
    // ── 5 · PUT IT BACK ────────────────────────────────────────────────────────
    await categoryBox(page).first().click();
    await page.waitForTimeout(700);
    await page.click(`[role="listbox"] [role="option"]:has-text("${original}")`);
    await page.waitForTimeout(400);
    await page.click('button:has-text("Save category")');
    await page.waitForTimeout(5_000);
    await openAdminMarket(page);
    ok("5: the market is restored to where it started", (await readCategory(page)) === original, `back to ${original}`);

    // ── 6 · RBAC, WITH THE POSITIVE CONTROL THAT MAKES IT EVIDENCE ─────────────
    // 🔴 This leg used to run ONLY when the admin credential was missing, and it asserted the
    // ABSENCE of a control using a selector that could never match anything. It passed for
    // that reason alone. A negative assertion is worth nothing unless the same locator is
    // shown to FIND the thing in the same run — so the control is read for BOTH accounts here.
    const adminSees = (await categoryBox(page).count()) > 0;
    ok("6: POSITIVE CONTROL — the locator finds the control for ADMIN in this same run",
       adminSees, `admin count=${adminSees ? "≥1" : 0}`);

    const pState = await loginOnce(b, "fleet:01");
    const pCtx = await b.newContext({ storageState: pState, viewport: { width: 1440, height: 1000 } });
    const pPage = await pCtx.newPage();
    const pRes = await pPage.goto(`${BASE}/admin/markets/${MARKET}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await pPage.waitForTimeout(2_500);
    const playerSees = (await categoryBox(pPage).count()) > 0;
    // Refusing the page outright and rendering it without the control are both correct;
    // being OFFERED it is not.
    ok("6: 🔴 a non-admin is NOT handed the re-categorise control on production",
       adminSees && !playerSees, `http=${pRes?.status()} · url=${pPage.url()} · player count=${playerSees ? "≥1" : 0}`);
    await pCtx.close();
  }
} catch (err) {
  fail++;
  console.log(`FAIL driver threw — ${err?.message ?? err}`);
} finally {
  await b.close();
}

if (notRun) {
  console.log("\nNOT RUN (needs QA_ADMIN_PASSWORD): 1 control renders · 2 correction works · 3 hostile client refused · 4 player board regroups · 5 restore");
}
console.log(`\nlive-recategorise: ${pass} passed, ${fail} failed${notRun ? `, ${notRun} legs NOT RUN` : ""}`);
process.exit(fail > 0 ? 1 : notRun ? 2 : 0);
