#!/usr/bin/env node
/**
 * qa:implicit-submit — the real-browser half of `test:implicit-submit` (the Vodacom plan S6 A8j, 2026-10-07).
 *
 *   BASE=http://localhost:3061 npm run qa:implicit-submit                   (Chromium, the default)
 *   BASE=http://localhost:3061 ENGINE=webkit npm run qa:implicit-submit     (the engine of every iPhone browser)
 *   BASE=http://localhost:3061 ENGINE=firefox npm run qa:implicit-submit
 *
 * Drives a LOCAL in-memory dev server as a keyboard player (the demo player: 100,000 TZS of local money, identity
 * approved, email confirmed) and reads the WALLET from the server's own /wallet page to say whether money moved: a
 * dialog is evidence of intent, the balance is evidence of fact. ENGINE picks the browser (`playwright[ENGINE].launch()`);
 * each engine needs its build installed once (`npx playwright install webkit firefox`).
 *
 *   W1  /wallet/withdraw · 20,000 typed, Enter in the amount box          → "Confirm withdrawal" opens; no money moves
 *   W2  /wallet/withdraw · 5 typed (under the minimum), Enter              → no dialog, nothing sent: the button's pre-flight
 *   K1  /wallet/withdraw · 5 typed, Enter HELD a second                    → one warning toast at most; no dialog; nothing sent
 *   K2  /wallet/withdraw · 20,000, Enter opens the confirm, Enter HELD on Cancel → it closes and STAYS closed; nothing sent
 *   D1  /wallet/deposit  · 5,000 typed, Enter in the amount box            → "Confirm deposit" opens; nothing is sent
 *   P1  /wallet/withdraw, every script held back · 20,000, Enter           → nothing is posted; no money moves
 *   P1x (WebKit only) P1 again, the server's HTML with the second text field taken out → the form POSTS: P1 goes red
 *   W3  /wallet/withdraw · the button, Shift+Tab to "Send funds", Enter    → the withdrawal action runs: the confirm still sends
 *   D2  /wallet/deposit  · the button, Shift+Tab to "Deposit", Enter       → the deposit action runs: the deposit confirm sends
 *   R1  /profile/responsible-gambling · read only, nothing pressed         → in the break and the self-exclusion form, the
 *                                                                            guard's control is the only submit control
 *   C2  /profile/account · half the phrase, Enter                          → nothing: the button is disabled, and so is Enter
 *   C1  /profile/account · the phrase typed, Enter                         → "Close your account permanently" opens; it stays open
 *   P2  /profile/account, every script held back · the phrase, Enter       → nothing is posted; the account stays open
 *   C3  /profile/account · the phrase, the button, "Yes, close permanently" → /auth/login?closed=1: the classic confirm sends (LAST)
 *   Z   no page error on the main page during the drive
 *
 * In W1, D1, C1 and R1 (awake) and in P1 and P2 (asleep) the page itself is also asked for EVERY submit control of the
 * form, in `form.elements`: the guard's own hidden default control must be the ONLY one (disabled while asleep). WebKit
 * skips that disabled control and presses the first ENABLED submit control wherever it stands in the form, ahead of the
 * dialog or after it — `test:implicit-submit` §4.5 reads the host's own JSX, this reads what the browser built, the
 * components inside the form included (the amount field, the RG period Select). The hub's sign-out row is not driven.
 *
 * ⭐ ITS RED CONTROL, PER ENGINE: on a server built from the tree before A8j, W1 W2 K1 K2 P1 C2 C1 P2 fail — the form
 * submits: W1, K2 and P1 each WITHDRAW 20,000 with no dialog (P1 in all three engines, a native POST), and C1 CLOSES the
 * demo account — D1 fails harmlessly (Enter did nothing there), R1 fails as a reading (no guard control in either form),
 * W3 and D2 pass, and C3 is SKIPPED (C1 has already closed the account). C2 runs BEFORE C1 so that it still fails by its
 * own check (the server bounces back with ?reason=); P2 is SKIPPED behind C1's closure too, so its own old-tree result is
 * hidden. Under ENGINE=webkit P1x FAILS there as well — the old form has no second field to take out and no guard control
 * — and its Enter posts the old form natively: ANOTHER 20,000 leaves the demo wallet. An old-tree run can spend all of it.
 * ⚠️ K1 AND K2 NEED A8i-2's KEY GUARD (a held key's auto-repeat swallowed page-wide; a fresh Enter inert for ARMING_MS
 * after a dialog takes focus or gives it back). Without it every repeat is a fresh implicit submission the guard turns
 * into the dialog's pre-flight: a warning toast each (K1), or the dialog reopened over Cancel (K2). They fail on a tree
 * without A8i-2 and are written for A8j rebased onto it. ARMING_MS is read from `src/lib/modal-stack.ts` (A8i-2's), else
 * 400; every key pressed in a dialog waits until the dialog's first focus has landed, then ARMING_MS + 50 ms.
 * ⚠️ THE WEBKIT HALF OF THE FIX (the second text field) AND FIREFOX'S DEFAULT-CONTROL RULE ARE PROVEN BY THE SUITE'S
 * ENGINE MODEL ONLY until this drive has run with ENGINE=webkit and ENGINE=firefox: in Chromium the disabled default
 * control alone stops Enter, so a Chromium run of P1 and P2 says nothing about the field. P1x is the proof that the
 * FIELD, not the model, holds an iPhone: with it taken out of the HTML, WebKit must post. Playwright's WebKit follows
 * WebKit's main branch; WebKit before Safari 16.4 is the suite's model alone (§2.5: there Enter is inert, and Next 16
 * builds for Safari 16.4 on, so such a device may never wake the page at all).
 * ⚠️ FIREFOX AND WEBKIT RUNS: their user agents do not match the first-visit primer's automation check, so the primer is
 * marked seen before any page loads (it would open over the dialogs otherwise); and no case opens a second page while it
 * drives the first (in those engines a new page takes the focus): balances are read with the context's own requests.
 * ⛔ C3 LEAVES THE IN-MEMORY DEMO ACCOUNT CLOSED: restart the server before the next drive.
 * ⛔ It refuses any host but localhost — it withdraws, deposits and closes the demo account — and refuses 127.0.0.1 too:
 * `next dev` served there never hydrates on this machine (the standing notes), and every after-hydration case would read
 * as a before-hydration one.
 */
import { readFileSync } from "node:fs";
import * as playwright from "playwright";

const ENGINE = (process.env.ENGINE || "chromium").toLowerCase();
if (!["chromium", "webkit", "firefox"].includes(ENGINE)) {
  console.error(`⛔ ENGINE=${ENGINE}: it is chromium, webkit or firefox.`);
  process.exit(2);
}
const BASE = (process.env.BASE || "http://localhost:3061").replace(/[/]$/, "");
if (!/^http:[/][/]localhost:[0-9]+$/.test(BASE)) {
  console.error(`⛔ REFUSING ${BASE}: this drive withdraws money and closes the demo account, so it runs only against a local in-memory server, `
    + "at http://localhost:<port> — never 127.0.0.1, where next dev never hydrates on this machine.");
  process.exit(2);
}
const NL = String.fromCharCode(10);
const AMOUNT = 20000;
const PHRASE = "CLOSE MY ACCOUNT";
const QUIET_MS = 1200;
/** A8i-2's arming beat — a fresh Enter in a dialog that has just taken focus presses nothing for this long. */
const ARMING_MS = (() => {
  try {
    const m = /export const ARMING_MS = ([0-9]+)/.exec(readFileSync(new URL("../src/lib/modal-stack.ts", import.meta.url), "utf8"));
    return m ? Number(m[1]) : 400;
  } catch { return 400; }
})();
const MONEY_URL = /[?&](withdrawal|error)=/;
const DEPOSIT_URL = /[?&](deposited|error)=/;

let pass = 0;
const fails = [];
const skips = [];
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${label}`); }
  else { fails.push(label); console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};
const skip = (id, why) => { skips.push(id); console.log(`  SKIP ${id} · ${why}`); };

const browser = await playwright[ENGINE].launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
// The first-visit primer skips automation by its user agent, which Firefox's and WebKit's do not match: mark it seen.
await ctx.addInitScript(() => { try { window.localStorage.setItem("50pick-primer-seen", "1"); } catch { /* storage refused */ } });
const page = await ctx.newPage();
const errs = [];
// Each page error with the address it happened on, so Z says where (a hydration error reads the same on every page).
page.on("pageerror", (e) => errs.push(`${new URL(page.url()).pathname}: ${String(e).slice(0, 200)}`));

/** The /wallet page as the server renders it for this session, read without opening a page (none steals the focus). */
async function walletHtml() {
  const res = await ctx.request.get(BASE + "/wallet");
  return { url: res.url(), html: await res.text() };
}
/** The balance in the server's own balance pill: the figure after "TZS". */
async function balance() {
  const { html } = await walletHtml();
  const at = html.indexOf('data-testid="wallet-balance-pill"');
  if (at < 0) return NaN;
  const end = html.indexOf("</a>", at);
  const text = html.slice(at, end > at ? end : at + 4000).replace(/<[^>]*>/g, " ");
  const m = /TZS[^0-9]*([0-9][0-9,]*)/.exec(text);
  return m ? Number(m[1].replace(/,/g, "")) : NaN;
}
/** Whether the demo player is still signed in: /wallet sends a signed-out reader to sign in. */
async function signedIn() {
  const { url, html } = await walletHtml();
  return !new URL(url).pathname.startsWith("/auth/") && html.includes('data-testid="wallet-balance-pill"');
}
/** The element that has focus, as `tag|name`. */
const focused = () => page.evaluate(() => {
  const a = document.activeElement;
  if (!a) return "";
  return `${a.tagName.toLowerCase()}|${(a.getAttribute("aria-label") || a.textContent || "").trim().slice(0, 40)}`;
});
const quiet = () => page.waitForTimeout(QUIET_MS);
/**
 * The balance once nothing is still moving: read after a settle and again two seconds later, and the later figure is
 * the one compared, so a case that moved money cannot pass on a read that came too early.
 */
async function settled() {
  await page.waitForTimeout(1500);
  const first = await balance();
  await page.waitForTimeout(2000);
  return { first, now: await balance() };
}
/** Runs one case; a case that cannot even be set up is a FAIL that says why, and the drive goes on to the next. */
async function runCase(id, words, body) {
  try { await body(); } catch (e) { ok(`${id} · ${words}`, false, `the case could not run: ${String(e?.message ?? e).split(NL)[0]}`); }
}
const seen = (loc, ms) => loc.waitFor({ state: "visible", timeout: ms }).then(() => true, () => false);
/** Holds `key` down on the focused element: one press, then `n` auto-repeats 33 ms apart (about a second), then the release. */
async function hold(key, n = 30) {
  await page.keyboard.down(key);
  await page.waitForTimeout(60);
  for (let i = 0; i < n; i++) { await page.keyboard.down(key); await page.waitForTimeout(33); }
  await page.keyboard.up(key);
}
/**
 * Waits until `dialog` has put the focus on its first target — its safe answer (`cancelName`: A5 opens a confirm on
 * Cancel) — and then past A8i-2's arming beat, so the next key pressed in it is the player's, never the opener's.
 */
async function armed(dialog, cancelName) {
  // ⚠️ The dialog's scrim is a button with an aria-label of "Cancel" too (Modal, tabIndex -1) and no text of its own:
  // only the button that SAYS its name is the dialog's Cancel.
  const cancel = dialog.getByRole("button", { name: cancelName, exact: true }).filter({ hasText: cancelName });
  await cancel.waitFor({ state: "visible", timeout: 15000 });
  const el = await cancel.elementHandle();
  await page.waitForFunction((b) => document.activeElement === b, el, { timeout: 10000 });
  await page.waitForTimeout(ARMING_MS + 50);
}
/** Starts counting the toasts the page paints from now on (each is a `.mat-toast`); read the count with toastsSince(). */
const countToasts = () => page.evaluate(() => {
  const w = window;
  w.__kpToasts = 0;
  const seenToasts = new WeakSet();
  const mark = (el) => { if (!seenToasts.has(el)) { seenToasts.add(el); w.__kpToasts++; } };
  w.__kpToastWatch?.disconnect();
  w.__kpToastWatch = new MutationObserver((records) => {
    for (const r of records) for (const n of r.addedNodes) {
      if (!(n instanceof Element)) continue;
      if (n.classList.contains("mat-toast")) mark(n);
      for (const el of n.querySelectorAll(".mat-toast")) mark(el);
    }
  });
  w.__kpToastWatch.observe(document.body, { childList: true, subtree: true });
});
const toastsSince = () => page.evaluate(() => (typeof window.__kpToasts === "number" ? window.__kpToasts : -1));
/**
 * Every submit control of `box`'s form, in `form.elements`: "guard" when the guard's own default control (a hidden,
 * unnamed submit input, out of the tab order, autocomplete off) is the ONLY one, "guard, disabled" while it is still
 * disabled; else what the form holds.
 */
const onlySubmit = (box) => box.evaluate((el) => {
  const f = el.form;
  if (!f) return "the box sits in no form";
  const all = [...f.elements].filter((c) => (c instanceof HTMLButtonElement && c.type === "submit")
    || (c instanceof HTMLInputElement && (c.type === "submit" || c.type === "image")));
  const isGuard = (c) => c instanceof HTMLInputElement && c.type === "submit" && c.hidden && c.tabIndex === -1
    && c.getAttribute("aria-hidden") === "true" && !c.name && c.getAttribute("autocomplete") === "off";
  if (all.length === 1 && isGuard(all[0])) return all[0].disabled ? "guard, disabled" : "guard";
  return all.length === 0 ? "the form has no submit control" : `${all.length} submit controls: ${all.map((c) => c.outerHTML.slice(0, 90)).join(" | ")}`;
});

const amountBox = page.locator("#amount");
const phraseBox = page.locator('input[name="confirm"]');
const withdrawDialog = page.getByRole("alertdialog", { name: "Confirm withdrawal" });
const depositDialog = page.getByRole("alertdialog", { name: "Confirm deposit" });
const closeDialog = page.getByRole("alertdialog", { name: "Close your account permanently" });

/**
 * Opens `path` and waits for the page to wake: on this tree until the form's guard listens (its default control is
 * enabled only then); on a tree without one, until Next's client has booted. ⛔ A page that never wakes THROWS, so the
 * case reports the real cause instead of passing as a before-it-wakes case, which only P1 and P2 are, on purpose.
 */
async function fresh(path, box) {
  await page.bringToFront();
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await box.waitFor({ state: "visible", timeout: 90000 });
  const el = await box.elementHandle();
  const woke = await page.waitForFunction((b) => {
    const control = b.form ? [...b.form.elements].find((c) => c instanceof HTMLInputElement && c.type === "submit" && c.hidden) : null;
    return control ? !control.disabled : !!window.next;
  }, el, { timeout: 90000 }).then(() => true, () => false);
  if (!woke) throw new Error("the page never woke (the form guard did not start listening)");
  await page.waitForTimeout(400);
}
/** Types `text` into `box` key by key, as a player does. */
async function typeInto(box, text) {
  await box.click();
  await box.fill("");
  await box.pressSequentially(text, { delay: 25 });
}
/**
 * The second text field taken out of the server's HTML (the hidden, unnamed text input the guard's dialog draws), and how
 * many were taken: the P1x control.
 */
function dropSecondField(html) {
  let dropped = 0;
  const out = html.replace(/<input[^>]*>/g, (tag) => {
    const second = / type="text"/.test(tag) && / hidden=""/.test(tag) && / aria-hidden="true"/.test(tag) && !/ name="/.test(tag);
    if (!second) return tag;
    dropped++;
    return "";
  });
  return { out, dropped };
}
/**
 * A page of the same session with every script held back: the form as a slow line delivers it, before it wakes — the
 * page under test for its case (the main page waits). With `rewrite`, the page's own HTML is passed through it on the
 * way in. ⛔ A page that cannot be set up is closed here, so it never outlives its case with every script held back.
 */
async function asleep(path, selector, rewrite = null) {
  // ⚠️ A CONTEXT OF ITS OWN, cookies copied: a page of the main context shares its memory cache, and WebKit served the
  // page's scripts from that cache past the abort below, so the page woke (2026-10-07 run) and the case tested the
  // after-wake path instead. A fresh context has nothing cached, so every script really is held back, in every engine.
  const actx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await actx.addCookies(await ctx.cookies());
  await actx.addInitScript(() => { try { window.localStorage.setItem("50pick-primer-seen", "1"); } catch { /* storage refused */ } });
  const p = await actx.newPage();
  const done = () => actx.close().catch(() => {});
  const posts = [];
  try {
    await p.route((u) => u.pathname.endsWith(".js"), (r) => r.abort());
    if (rewrite) {
      await p.route((u) => u.pathname === path, async (r) => {
        if (r.request().resourceType() !== "document") return r.continue();
        const res = await r.fetch();
        // The body is handed back decoded and whole: the length, the encoding and the chunking it came with no longer apply.
        const headers = { ...res.headers() };
        for (const h of ["content-length", "content-encoding", "transfer-encoding"]) delete headers[h];
        await r.fulfill({ status: res.status(), headers, body: rewrite(await res.text()) });
      });
    }
    p.on("request", (r) => { if (r.method() === "POST") posts.push(r.url()); });
    await p.goto(BASE + path, { waitUntil: "domcontentloaded" });
    const box = p.locator(selector);
    await box.waitFor({ state: "visible", timeout: 90000 });
    return { p, box, posts, done };
  } catch (e) {
    await done();
    throw e;
  }
}
/** P1's body: 20,000 and Enter on the withdraw form with every script held back, the HTML optionally passed through `rewrite`. */
async function enterAsleep(rewrite = null) {
  const before = await balance();
  const { p, box, posts, done } = await asleep("/wallet/withdraw", "#amount", rewrite);
  try {
    const woke = await p.evaluate(() => !!window.next);
    const only = await onlySubmit(box);
    await box.click();
    await box.pressSequentially(String(AMOUNT), { delay: 25 });
    await box.press("Enter");
    await p.waitForTimeout(3000);
    const url = p.url();
    const { first, now } = await settled();
    return { woke, only, posts: [...posts], url, before, first, now };
  } finally { await done(); }
}

console.log(`implicit-submit drive — ${BASE} · ${ENGINE} ${browser.version()} · arming beat ${ARMING_MS} ms`);
await page.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded" });

console.log("§ the withdraw and deposit forms");
await runCase("W1", "Enter in the amount box — the confirm opens and no money moves", async () => {
  await fresh("/wallet/withdraw", amountBox);
  const before = await balance();
  ok("0 · fixture · the demo player holds the money this drive withdraws", before >= AMOUNT * 2, String(before));
  const only = await onlySubmit(amountBox);
  await typeInto(amountBox, String(AMOUNT));
  await amountBox.press("Enter");
  const open = await seen(withdrawDialog, 15000);
  await page.keyboard.press("Escape");
  await quiet();
  const closed = !(await withdrawDialog.isVisible());
  const { first, now } = await settled();
  const url = page.url();
  ok("W1 · Enter in the amount box — the confirm opens and no money moves",
    only === "guard" && open && closed && now === before && !MONEY_URL.test(url) && new URL(url).pathname === "/wallet/withdraw",
    JSON.stringify({ only, open, closed, url, before, first, now }));
});
await runCase("W2", "5 typed (under the minimum), Enter — no dialog and nothing sent: the button's own pre-flight answers", async () => {
  await fresh("/wallet/withdraw", amountBox);
  const before = await balance();
  await typeInto(amountBox, "5");
  await amountBox.press("Enter");
  const open = await seen(withdrawDialog, 3000);
  await quiet();
  const { first, now } = await settled();
  const url = page.url();
  ok("W2 · 5 typed (under the minimum), Enter — no dialog and nothing sent: the button's own pre-flight answers",
    !open && !MONEY_URL.test(url) && now === before, JSON.stringify({ open, url, before, first, now }));
});
await runCase("K1", "5 typed, Enter HELD a second — one warning toast at most, no dialog, nothing sent (needs A8i-2)", async () => {
  await fresh("/wallet/withdraw", amountBox);
  const before = await balance();
  await typeInto(amountBox, "5");
  await countToasts();
  await hold("Enter");
  await page.waitForTimeout(2500);
  const toasts = await toastsSince();
  const open = await withdrawDialog.isVisible();
  const { first, now } = await settled();
  const url = page.url();
  ok("K1 · 5 typed, Enter HELD a second — one warning toast at most, no dialog, nothing sent (needs A8i-2)",
    toasts >= 0 && toasts <= 1 && !open && !MONEY_URL.test(url) && now === before, JSON.stringify({ toasts, open, url, before, first, now }));
});
await runCase("K2", "20,000 and Enter open the confirm; Enter HELD on Cancel — it closes and stays closed, nothing sent (needs A8i-2)", async () => {
  await fresh("/wallet/withdraw", amountBox);
  const before = await balance();
  await typeInto(amountBox, String(AMOUNT));
  await amountBox.press("Enter");
  const opened = await seen(withdrawDialog, 15000);
  await armed(withdrawDialog, "Cancel");
  const heldOn = await focused();
  await hold("Enter");
  await page.waitForTimeout(1500);
  const open = await withdrawDialog.isVisible();
  const { first, now } = await settled();
  const url = page.url();
  ok("K2 · 20,000 and Enter open the confirm; Enter HELD on Cancel — it closes and stays closed, nothing sent (needs A8i-2)",
    opened && /[|]Cancel$/.test(heldOn) && !open && !MONEY_URL.test(url) && now === before, JSON.stringify({ opened, heldOn, open, url, before, first, now }));
});
await runCase("D1", "Enter in the deposit amount box — the confirm opens and nothing is sent", async () => {
  await fresh("/wallet/deposit", amountBox);
  const before = await balance();
  const only = await onlySubmit(amountBox);
  await typeInto(amountBox, "5000");
  await amountBox.press("Enter");
  const open = await seen(depositDialog, 15000);
  await page.keyboard.press("Escape");
  await quiet();
  const closed = !(await depositDialog.isVisible());
  const { first, now } = await settled();
  const url = page.url();
  ok("D1 · Enter in the deposit amount box — the confirm opens and nothing is sent",
    only === "guard" && open && closed && new URL(url).pathname === "/wallet/deposit" && !DEPOSIT_URL.test(url) && now === before,
    JSON.stringify({ only, open, closed, url, before, first, now }));
});
await runCase("P1", "before the page wakes (scripts held back), 20,000 and Enter — nothing is posted and no money moves", async () => {
  const r = await enterAsleep();
  ok("P1 · before the page wakes (scripts held back), 20,000 and Enter — nothing is posted and no money moves",
    !r.woke && r.only === "guard, disabled" && r.posts.length === 0 && new URL(r.url).pathname === "/wallet/withdraw" && r.now === r.before,
    JSON.stringify(r));
});
if (ENGINE === "webkit") {
  await runCase("P1x", "control (WebKit) · the second text field taken out of the HTML — the same Enter now POSTS: P1 goes red", async () => {
    let dropped = -1;
    const r = await enterAsleep((html) => { const d = dropSecondField(html); dropped = d.dropped; return d.out; });
    const red = r.posts.length > 0 || r.now !== r.before || new URL(r.url).pathname !== "/wallet/withdraw";
    // ⭐ The guard's default control is still there, still the only submit control and still disabled, so the post can
    // only be the missing field's.
    ok("P1x · control (WebKit) · the second text field taken out of the HTML — the same Enter now POSTS: P1 goes red, so the field, not the model, is what holds an iPhone",
      dropped === 1 && !r.woke && r.only === "guard, disabled" && red, JSON.stringify({ dropped, ...r, moved: r.before - r.now }));
  });
} else {
  skip("P1x", `the second-field control is WebKit's (ENGINE=webkit); in ${ENGINE} the disabled default control alone stops Enter`);
}
await runCase("W3", "the confirm still sends: the button, Shift+Tab to Send funds, Enter — the withdrawal action runs", async () => {
  await fresh("/wallet/withdraw", amountBox);
  const before = await balance();
  await typeInto(amountBox, String(AMOUNT));
  await page.getByRole("button", { name: "Confirm withdrawal" }).click();
  await withdrawDialog.waitFor({ state: "visible", timeout: 15000 });
  await armed(withdrawDialog, "Cancel");
  await page.keyboard.press("Shift+Tab");
  const enterOn = await focused();
  await page.keyboard.press("Enter");
  await page.waitForURL((u) => MONEY_URL.test(u.search), { timeout: 45000 }).catch(() => {});
  const url = page.url();
  const { first, now } = await settled();
  ok("W3 · the confirm still sends: the button, Shift+Tab to Send funds, Enter — the withdrawal action runs",
    /[|]Send funds$/.test(enterOn) && MONEY_URL.test(new URL(url).search),
    JSON.stringify({ enterOn, url, before, first, now, moved: before - now }));
});
await runCase("D2", "the deposit confirm still sends: the button, Shift+Tab to Deposit, Enter — the deposit action runs", async () => {
  await fresh("/wallet/deposit", amountBox);
  await typeInto(amountBox, "5000");
  await page.getByRole("button", { name: "Confirm deposit" }).click();
  await depositDialog.waitFor({ state: "visible", timeout: 15000 });
  await armed(depositDialog, "Cancel");
  await page.keyboard.press("Shift+Tab");
  const enterOn = await focused();
  await page.keyboard.press("Enter");
  await page.waitForURL((u) => DEPOSIT_URL.test(u.search), { timeout: 45000 }).catch(() => {});
  const url = page.url();
  ok("D2 · the deposit confirm still sends: the button, Shift+Tab to Deposit, Enter — the deposit action runs",
    /[|]Deposit$/.test(enterOn) && DEPOSIT_URL.test(new URL(url).search), JSON.stringify({ enterOn, url }));
});

console.log("§ the responsible-gambling forms (read only: nothing is pressed there, so no break or exclusion can start)");
await runCase("R1", "the break and the self-exclusion form — in each, the guard's control is the only submit control", async () => {
  await page.bringToFront();
  await page.goto(BASE + "/profile/responsible-gambling", { waitUntil: "domcontentloaded" });
  // The two forms are the ones holding a kit Select named "period": a component the suite's §4.5 cannot read into.
  const woke = await page.waitForFunction(() => {
    const forms = [...document.forms].filter((f) => f.querySelector('input[name="period"]'));
    return forms.length === 2 && forms.every((f) => {
      const c = [...f.elements].find((x) => x instanceof HTMLInputElement && x.type === "submit" && x.hidden);
      return c ? !c.disabled : !!window.next;
    });
  }, null, { timeout: 90000 }).then(() => true, () => false);
  if (!woke) throw new Error("the two RG forms never woke (or are not both on the page)");
  const only = await page.evaluate(() => [...document.forms].filter((f) => f.querySelector('input[name="period"]')).map((f) => {
    const all = [...f.elements].filter((c) => (c instanceof HTMLButtonElement && c.type === "submit")
      || (c instanceof HTMLInputElement && (c.type === "submit" || c.type === "image")));
    const isGuard = (c) => c instanceof HTMLInputElement && c.type === "submit" && c.hidden && c.tabIndex === -1
      && c.getAttribute("aria-hidden") === "true" && !c.name && c.getAttribute("autocomplete") === "off";
    if (all.length === 1 && isGuard(all[0])) return "guard";
    return all.length === 0 ? "the form has no submit control" : `${all.length} submit controls: ${all.map((c) => c.outerHTML.slice(0, 90)).join(" | ")}`;
  }));
  ok("R1 · the break and the self-exclusion form — in each, the guard's control is the only submit control (nothing pressed)",
    only.length === 2 && only.every((x) => x === "guard"), JSON.stringify(only));
});

console.log("§ the close-account form (C2 first: on an unfixed tree C1 closes the demo account; C3, which closes it on purpose, last)");
await runCase("C2", "half the phrase, Enter — nothing: the button is disabled, and so is Enter", async () => {
  await fresh("/profile/account", phraseBox);
  await typeInto(phraseBox, PHRASE.slice(0, 8));
  await phraseBox.press("Enter");
  const open = await seen(closeDialog, 3000);
  await quiet();
  const url = page.url();
  const still = await signedIn();
  ok("C2 · half the phrase, Enter — nothing: the button is disabled, and so is Enter",
    !open && new URL(url).pathname === "/profile/account" && !new URL(url).search.includes("reason=") && still, JSON.stringify({ open, url, signedIn: still }));
});
await runCase("C1", "the phrase typed, Enter — the confirm opens and the account stays open", async () => {
  if (!(await signedIn())) { skip("C1", "the account was closed by an earlier case"); return; }
  await fresh("/profile/account", phraseBox);
  const only = await onlySubmit(phraseBox);
  await typeInto(phraseBox, PHRASE);
  await phraseBox.press("Enter");
  const open = await seen(closeDialog, 15000);
  await page.keyboard.press("Escape");
  await quiet();
  const closed = !(await closeDialog.isVisible());
  const url = page.url();
  const still = await signedIn();
  ok("C1 · the phrase typed, Enter — the confirm opens and the account stays open",
    only === "guard" && open && closed && new URL(url).pathname === "/profile/account" && !new URL(url).search.includes("reason=") && still,
    JSON.stringify({ only, open, closed, url, signedIn: still }));
});
await runCase("P2", "before the page wakes (scripts held back), the phrase and Enter — nothing is posted and the account stays open", async () => {
  if (!(await signedIn())) { skip("P2", "the account was closed by an earlier case (on an unfixed tree, C1)"); return; }
  const { p, box, posts, done } = await asleep("/profile/account", 'input[name="confirm"]');
  try {
    const woke = await p.evaluate(() => !!window.next);
    const only = await onlySubmit(box);
    await box.click();
    await box.pressSequentially(PHRASE, { delay: 25 });
    await box.press("Enter");
    await p.waitForTimeout(3000);
    const url = p.url();
    const still = await signedIn();
    ok("P2 · before the page wakes (scripts held back), the phrase and Enter — nothing is posted and the account stays open",
      !woke && only === "guard, disabled" && posts.length === 0 && new URL(url).pathname === "/profile/account" && still,
      JSON.stringify({ woke, only, posts, url, signedIn: still }));
  } finally { await done(); }
});
await runCase("C3", "the classic confirm still sends: the phrase, the button, Yes, close permanently — the account closes (LAST)", async () => {
  if (!(await signedIn())) { skip("C3", "the account was closed by an earlier case (on an unfixed tree, C1)"); return; }
  await fresh("/profile/account", phraseBox);
  await typeInto(phraseBox, PHRASE);
  await page.getByRole("button", { name: "Permanently close my account", exact: true }).click();
  await closeDialog.waitFor({ state: "visible", timeout: 15000 });
  await armed(closeDialog, "Keep my account");
  await closeDialog.getByRole("button", { name: "Yes, close permanently", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/auth/login" && u.searchParams.get("closed") === "1", { timeout: 45000 }).catch(() => {});
  const url = new URL(page.url());
  ok("C3 · the classic confirm still sends: the phrase, the button, Yes, close permanently — the account closes (LAST)",
    url.pathname === "/auth/login" && url.searchParams.get("closed") === "1", JSON.stringify({ url: url.href }));
  console.log("     ⛔ the in-memory demo account is now CLOSED: restart the server before the next drive");
});

/**
 * Two page errors this drive meets that are not A8j's and fail the same on the tree before it — each named, so that any
 * OTHER page error still fails Z:
 *  · /profile/responsible-gambling's hydration mismatch (the kit Input draws its hint and aria-describedby on the client
 *    only; found by A8i on 2026-10-07 and recorded for its owner, VODACOM-PLAN §0i "A8i");
 *  · the dev server's hot-reload client chunk failing to load in Firefox and WebKit on Windows (Turbopack `next dev`
 *    only; it fails the same on live main's code, VODACOM-PLAN §0i "A8i-2").
 */
const KNOWN_ERRORS = [
  (e) => e.startsWith("/profile/responsible-gambling:") && e.includes("Hydration failed"),
  (e) => e.includes("ChunkLoadError") && e.includes("hmr-client"),
];
const unknownErrs = errs.filter((e) => !KNOWN_ERRORS.some((k) => k(e)));
ok(`Z · no page error during the drive${errs.length > unknownErrs.length ? ` (${errs.length - unknownErrs.length} known, not A8j's: the RG page's hydration mismatch, the dev server's hot-reload chunk)` : ""}`,
  unknownErrs.length === 0, unknownErrs.slice(0, 3).join(" | "));
await browser.close();
console.log(`${NL}IMPLICIT SUBMIT (drive, ${ENGINE}) — ${pass} passed, ${fails.length} failed${fails.length ? `: ${fails.map((f) => f.split(" ")[0]).join(" ")}` : ""}${skips.length ? ` · skipped: ${skips.join(" ")}` : ""}${NL}`);
process.exit(fails.length ? 1 : 0);
