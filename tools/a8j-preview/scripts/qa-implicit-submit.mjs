#!/usr/bin/env node
/**
 * qa:implicit-submit — the real-browser half of `test:implicit-submit` (the Vodacom plan S6 A8j, 2026-10-07).
 *
 *   BASE=http://localhost:3061 npm run qa:implicit-submit
 *
 * Drives a LOCAL in-memory dev server as a keyboard player (the demo player: 100,000 TZS of local money, identity
 * approved, email confirmed) and reads the WALLET on a page of its own to say whether money moved: a dialog is evidence
 * of intent, the balance is evidence of fact.
 *
 *   W1  /wallet/withdraw · 20,000 typed, Enter in the amount box        → "Confirm withdrawal" opens; no money moves
 *   W2  /wallet/withdraw · 5 typed (under the minimum), Enter            → no dialog, nothing sent: the button's pre-flight
 *   D1  /wallet/deposit  · 5,000 typed, Enter in the amount box          → "Confirm deposit" opens; nothing is sent
 *   P1  /wallet/withdraw, every script held back · 20,000, Enter         → nothing is posted; no money moves
 *   W3  /wallet/withdraw · the button, Shift+Tab to "Send funds", Enter  → the withdrawal action runs: the confirm still sends
 *   C1  /profile/account · the phrase typed, Enter                       → "Close your account permanently" opens; the account stays open
 *   C2  /profile/account · half the phrase, Enter                        → nothing: the button is disabled, and so is Enter
 *   P2  /profile/account, every script held back · the phrase, Enter     → nothing is posted; the account stays open
 *
 * ⭐ ITS RED CONTROL: on a server built from the tree before A8j, W1 W2 P1 C1 C2 P2 fail (the form submits: the money
 * leaves, the account closes, so the close-account cases run last), D1 fails harmlessly (Enter did nothing there) and W3
 * passes on both trees.
 * ⛔ It refuses any host but localhost: it withdraws, and on an unfixed tree it closes the demo account.
 */
import { chromium } from "playwright";

const BASE = (process.env.BASE || "http://localhost:3061").replace(/[/]$/, "");
if (!/^http:[/][/](localhost|127[.]0[.]0[.]1):[0-9]+$/.test(BASE)) {
  console.error(`⛔ REFUSING ${BASE}: this drive withdraws money and, on an unfixed tree, closes the demo account, so it runs only against a local in-memory server.`);
  process.exit(2);
}
const NL = String.fromCharCode(10);
const AMOUNT = 20000;
const PHRASE = "CLOSE MY ACCOUNT";
const QUIET_MS = 1200;

let pass = 0;
const fails = [];
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${label}`); }
  else { fails.push(label); console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));

/** The balance as the server renders it, on a page of its own, so the page under test is never disturbed. */
async function balance() {
  const p = await ctx.newPage();
  try {
    await p.goto(BASE + "/wallet", { waitUntil: "domcontentloaded" });
    const pill = p.locator('[data-testid="wallet-balance-pill"]').first();
    await pill.waitFor({ state: "attached", timeout: 30000 });
    const n = (await pill.innerText()).replace(/[^0-9]/g, "");
    return n ? Number(n) : NaN;
  } finally { await p.close(); }
}
/** Whether the demo player is still signed in: /wallet sends a signed-out reader to sign in. */
async function signedIn() {
  const p = await ctx.newPage();
  try {
    await p.goto(BASE + "/wallet", { waitUntil: "domcontentloaded" });
    if (new URL(p.url()).pathname.startsWith("/auth/")) return false;
    return await p.locator('[data-testid="wallet-balance-pill"]').first().waitFor({ state: "attached", timeout: 30000 }).then(() => true, () => false);
  } finally { await p.close(); }
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

const amountBox = page.locator("#amount");
const phraseBox = page.locator('input[name="confirm"]');
const withdrawDialog = page.getByRole("alertdialog", { name: "Confirm withdrawal" });
const depositDialog = page.getByRole("alertdialog", { name: "Confirm deposit" });
const closeDialog = page.getByRole("alertdialog", { name: "Close your account permanently" });

/**
 * Opens `path` and waits for the page to wake: on this tree until the form's guard listens (its hidden default button
 * is enabled only then); on a tree without one, until Next's client has booted. Enter pressed earlier would be the
 * before-it-wakes case, which P1 and P2 drive on purpose.
 */
async function fresh(path, box) {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await box.waitFor({ state: "visible", timeout: 90000 });
  await page.waitForFunction(() => {
    const b = document.querySelector('form button[type="submit"][hidden]');
    return b ? !b.disabled : !!window.next;
  }, null, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(400);
}
/** Types `text` into `box` key by key, as a player does. */
async function typeInto(box, text) {
  await box.click();
  await box.fill("");
  await box.pressSequentially(text, { delay: 25 });
}
/** A page of the same session with every script held back: the form as a slow line delivers it, before it wakes. */
async function asleep(path, selector) {
  const p = await ctx.newPage();
  const posts = [];
  await p.route((u) => u.pathname.endsWith(".js"), (r) => r.abort());
  p.on("request", (r) => { if (r.method() === "POST") posts.push(r.url()); });
  await p.goto(BASE + path, { waitUntil: "domcontentloaded" });
  const box = p.locator(selector);
  await box.waitFor({ state: "visible", timeout: 90000 });
  return { p, box, posts };
}

console.log(`implicit-submit drive — ${BASE}`);
await page.goto(BASE + "/auth/demo", { waitUntil: "domcontentloaded" });

console.log("§ the withdraw and deposit forms");
await runCase("W1", "Enter in the amount box — the confirm opens and no money moves", async () => {
  await fresh("/wallet/withdraw", amountBox);
  const before = await balance();
  ok("0 · fixture · the demo player holds the money this drive withdraws", before >= AMOUNT * 2, String(before));
  await typeInto(amountBox, String(AMOUNT));
  await amountBox.press("Enter");
  const open = await seen(withdrawDialog, 15000);
  const url = page.url();
  await page.keyboard.press("Escape");
  await quiet();
  const closed = !(await withdrawDialog.isVisible());
  const { first, now } = await settled();
  ok("W1 · Enter in the amount box — the confirm opens and no money moves",
    open && closed && now === before && !/[?&]withdrawal=/.test(url), JSON.stringify({ open, closed, url, before, first, now }));
});
await runCase("W2", "5 typed (under the minimum), Enter — no dialog and nothing sent: the button's own pre-flight answers", async () => {
  await fresh("/wallet/withdraw", amountBox);
  const before = await balance();
  await typeInto(amountBox, "5");
  await amountBox.press("Enter");
  const open = await seen(withdrawDialog, 3000);
  await quiet();
  const url = page.url();
  const { first, now } = await settled();
  ok("W2 · 5 typed (under the minimum), Enter — no dialog and nothing sent: the button's own pre-flight answers",
    !open && !/[?&](withdrawal|error)=/.test(url) && now === before, JSON.stringify({ open, url, before, first, now }));
});
await runCase("D1", "Enter in the deposit amount box — the confirm opens and nothing is sent", async () => {
  await fresh("/wallet/deposit", amountBox);
  const before = await balance();
  await typeInto(amountBox, "5000");
  await amountBox.press("Enter");
  const open = await seen(depositDialog, 15000);
  await page.keyboard.press("Escape");
  await quiet();
  const closed = !(await depositDialog.isVisible());
  const url = page.url();
  const { first, now } = await settled();
  ok("D1 · Enter in the deposit amount box — the confirm opens and nothing is sent",
    open && closed && new URL(url).pathname === "/wallet/deposit" && now === before, JSON.stringify({ open, closed, url, before, first, now }));
});
await runCase("P1", "before the page wakes (scripts held back), 20,000 and Enter — nothing is posted and no money moves", async () => {
  const before = await balance();
  const { p, box, posts } = await asleep("/wallet/withdraw", "#amount");
  try {
    const woke = await p.evaluate(() => !!window.next);
    await box.click();
    await box.pressSequentially(String(AMOUNT), { delay: 25 });
    await box.press("Enter");
    await p.waitForTimeout(3000);
    const url = p.url();
    const { first, now } = await settled();
    ok("P1 · before the page wakes (scripts held back), 20,000 and Enter — nothing is posted and no money moves",
      !woke && posts.length === 0 && new URL(url).pathname === "/wallet/withdraw" && now === before, JSON.stringify({ woke, posts, url, before, first, now }));
  } finally { await p.close(); }
});
await runCase("W3", "the confirm still sends: the button, Shift+Tab to Send funds, Enter — the withdrawal action runs", async () => {
  await fresh("/wallet/withdraw", amountBox);
  const before = await balance();
  await typeInto(amountBox, String(AMOUNT));
  await page.getByRole("button", { name: "Confirm withdrawal" }).click();
  await withdrawDialog.waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(400);
  await page.keyboard.press("Shift+Tab");
  const enterOn = await focused();
  await page.keyboard.press("Enter");
  await page.waitForURL((u) => /[?&](withdrawal|error)=/.test(u.search), { timeout: 45000 }).catch(() => {});
  const url = page.url();
  const { first, now } = await settled();
  ok("W3 · the confirm still sends: the button, Shift+Tab to Send funds, Enter — the withdrawal action runs",
    /Send funds/.test(enterOn) && /[?&](withdrawal|error)=/.test(new URL(url).search),
    JSON.stringify({ enterOn, url, before, first, now, moved: before - now }));
});

console.log("§ the close-account form (last: on an unfixed tree it closes the demo account)");
await runCase("C1", "the phrase typed, Enter — the confirm opens and the account stays open", async () => {
  await fresh("/profile/account", phraseBox);
  await typeInto(phraseBox, PHRASE);
  await phraseBox.press("Enter");
  const open = await seen(closeDialog, 15000);
  await page.keyboard.press("Escape");
  await quiet();
  const closed = !(await closeDialog.isVisible());
  const url = page.url();
  const still = await signedIn();
  ok("C1 · the phrase typed, Enter — the confirm opens and the account stays open",
    open && closed && new URL(url).pathname === "/profile/account" && still, JSON.stringify({ open, closed, url, signedIn: still }));
});
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
await runCase("P2", "before the page wakes (scripts held back), the phrase and Enter — nothing is posted and the account stays open", async () => {
  const { p, box, posts } = await asleep("/profile/account", 'input[name="confirm"]');
  try {
    const woke = await p.evaluate(() => !!window.next);
    await box.click();
    await box.pressSequentially(PHRASE, { delay: 25 });
    await box.press("Enter");
    await p.waitForTimeout(3000);
    const url = p.url();
    const still = await signedIn();
    ok("P2 · before the page wakes (scripts held back), the phrase and Enter — nothing is posted and the account stays open",
      !woke && posts.length === 0 && new URL(url).pathname === "/profile/account" && still, JSON.stringify({ woke, posts, url, signedIn: still }));
  } finally { await p.close(); }
});

ok("Z · no page error during the drive", errs.length === 0, errs.slice(0, 3).join(" | "));
await browser.close();
console.log(`${NL}IMPLICIT SUBMIT (drive) — ${pass} passed, ${fails.length} failed${fails.length ? `: ${fails.map((f) => f.split(" ")[0]).join(" ")}` : ""}${NL}`);
process.exit(fails.length ? 1 : 0);
