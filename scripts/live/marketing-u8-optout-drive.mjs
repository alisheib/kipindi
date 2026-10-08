/**
 * U8 visual drive — the opt-out page's states, photographed as VIEWPORT TILES, in all three languages.
 *
 * ⭐ WHAT THIS DRIVE IS FOR. Nothing mints an opt-out token on production yet (that is U42), so
 * the token-bearing states have no live subject there. They are driven against a local
 * `next dev` with a token minted through `mintOptOutToken` — the same function production will
 * call. On production the drive proves what U8's §9 says it proves: the page serves, a bad
 * token is refused with no false success, and the page carries no sales chrome.
 *
 * ⭐ WHAT IT PHOTOGRAPHS: invalid · valid · stopped · resumed · already, in Swahili at 1280, 360 and 360
 * under reduced motion, and in English and Chinese at 1280 and 360 (the `kp-locale` cookie — the page
 * records the language it showed into the consent ledger, so every language is a state). Then, locally:
 * LOADING in every language at both widths (a dev-only `?qa_hold_ms` hold), the PENDING button (a
 * dev-only act hold), the READ-FAILURE refusal (`?qa_fail_read=1`), bare `/s`, a deeper `/s/…/x`, and
 * last the ERROR tap and the BUSY refusal (the address's budget run dry by misses).
 * ⛔ VIEWPORT TILES, NEVER FULL-PAGE: a full-page capture painted the fixed rail mid-document and showed
 * a page no phone ever shows. A tall page gets a second tile scrolled to its end. Swahili tiles keep
 * their old names (`valid-360`); English and Chinese carry the language (`valid-zh-360`).
 *
 * ⭐ THE EXPECTED WORDS ARE READ FROM THE DICTIONARY, NEVER TYPED HERE (2026-09-27). A copy of the
 * Swahili sentences went stale the moment the copy moved, and a copy in three languages would be three
 * ways to go stale. `i18n-dict.ts` is read as TEXT (this is plain `node`, which cannot import it), each
 * needed block parsed per language, and the drive refuses to run if a key it needs is missing.
 *
 * ⛔ TWO TRAPS THIS FILE PAID FOR ON ITS OWN FIRST RUN, BOTH OF THEM IN THE INSTRUMENT:
 *
 *  · `page.locator("button").first()` RESOLVED TO THE SITE CHROME — a hidden language-picker
 *    option in the top bar, never visible — so every click timed out on a page that was fine.
 *    The page's own controls are reached BY ROLE AND ACCESSIBLE NAME, never by document order.
 *  · AND THE TEXT ASSERTIONS COULD NOT FAIL. `t.optout.title` is the SAME STRING as the stop
 *    button's label, and the invalid-token page renders that title — so "the stop button is on
 *    the page", asked of body text, was TRUE on a page carrying no button at all. Every control
 *    assertion below therefore COUNTS BUTTONS, not words.
 *
 * 🔴 AND A THIRD, FOUND BY THE D6 REVIEW: THE UA HID A DEFECT. HeadlessChrome stays in the UA (or `/api/pv`
 * counts this drive as real visitors) — but the first-visit primer refuses to open for that UA, so every
 * earlier photo was structurally blind to it opening over the stop button. The primer is now FORCED
 * (`?primer=1`) on `/s/…` and must stay shut, with a control on `/?primer=1` that must open.
 * ⭐ `prefers-reduced-motion: reduce` is driven too — a page whose whole job is one tap must not
 * depend on a transition to tell somebody the tap landed.
 *
 * Run:  node scripts/live/marketing-u8-optout-drive.mjs            (local, default :3043)
 *       LIVE_BASE=https://www.50pick.tz node scripts/live/marketing-u8-optout-drive.mjs <sha>
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { decomment } from "../lib/decomment.mts";

const BASE = process.env.LIVE_BASE ?? "http://localhost:3043";
const WANT = (process.argv[2] || "").trim();
const IS_PROD = !/localhost|127\.0\.0\.1|\[::1\]/.test(BASE);
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.0.0 Safari/537.36";
const SHOTS = ".qa-shots/marketing-setup/u8";
mkdirSync(SHOTS, { recursive: true });

/* ══ THE COPY, FROM THE DICTIONARY ══════════════════════════════════════════════════════════════ */
const DICT_SRC = readFileSync(new URL("../../src/lib/i18n-dict.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
/** One language's section: from `  sw: {` to the next language's opening line. */
function localeSection(loc) {
  const starts = [...DICT_SRC.matchAll(/^ {2}(en|sw|zh): \{$/gm)].map((m) => ({ loc: m[1], at: m.index ?? 0 }));
  const i = starts.findIndex((s) => s.loc === loc);
  if (i < 0) throw new Error(`no "${loc}" section in i18n-dict.ts`);
  return DICT_SRC.slice(starts[i].at, i + 1 < starts.length ? starts[i + 1].at : DICT_SRC.length);
}
/** One top-level block of a section (`    optout: {` … `    },`), its double-quoted strings parsed. */
function block(section, name) {
  const m = section.match(new RegExp(`^ {4}${name}: \\{\\n([\\s\\S]*?)^ {4}\\},?$`, "m"));
  if (!m) throw new Error(`no "${name}" block in i18n-dict.ts`);
  const out = {};
  // Comments out first (the repo's one stripper, so a trailing or block comment counts too, and a `//` inside a
  // string never does), so a `key: "…"` quoted in a comment can never stand in for the real one.
  const body = decomment(m[1]);
  for (const kv of body.matchAll(/(\w+): ("(?:[^"\\]|\\.)*")/g)) {
    try { out[kv[1]] = JSON.parse(kv[2]); } catch { /* not JSON-shaped; never one this drive needs (NEED guards) */ }
  }
  return out;
}
const LOCALES = ["sw", "en", "zh"];
const NEED = {
  optout: ["title", "stoppedTitle", "resumedTitle", "body", "stopButton", "done", "already", "resubscribeButton", "resubscribed", "invalid", "error", "busy", "retry", "loading"],
  footer: ["stopGambling", "proposeGetPaid"],
  chat: ["openHelp"],
  primer: ["primerLabel"],
};
const COPY = {};
for (const L of LOCALES) {
  const s = localeSection(L);
  COPY[L] = { o: block(s, "optout"), footer: block(s, "footer"), chat: block(s, "chat"), primer: block(s, "primer") };
  for (const [b, keys] of Object.entries(NEED)) {
    const have = b === "optout" ? COPY[L].o : COPY[L][b];
    const missing = keys.filter((k) => typeof have[k] !== "string" || have[k].length === 0);
    if (missing.length) { console.error(`!! ${L}.${b} is missing ${missing.join(", ")} — REFUSING to run on guessed copy.`); process.exit(2); }
  }
}
/** Page text and dictionary text, compared in one form: whitespace (NBSP included) folded, lower case, and
 *  the zh zero-width break hints (U+200B) dropped — they are layout, not words, and `\s` does not match them. */
const ZWSP = new RegExp(String.fromCharCode(0x200b), "g");
const norm = (s) => String(s).replace(ZWSP, "").replace(/\s+/g, " ").trim().toLowerCase();
const NOT_OURS = /si chetu|not (one of )?ours|不是我们的/i;

console.log(IS_PROD ? `!!  TARGET IS PRODUCTION: ${BASE}` : `target: ${BASE}`);

let pass = 0, fail = 0;
const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

if (IS_PROD) {
  if (!WANT) { console.error("!! production needs the sha: node scripts/live/marketing-u8-optout-drive.mjs <sha>"); process.exit(2); }
  const home = await fetch(`${BASE}/`, { headers: { "user-agent": UA }, cache: "no-store" });
  const html = await home.text();
  const dpl = (html.match(/data-dpl-id="([^"]+)"/) || html.match(/[?&]dpl=([a-z0-9]+)/) || [])[1] || "";
  if (!dpl) { console.error("!! could not read a deploy id from /. REFUSING to report."); process.exit(2); }
  if (!dpl.startsWith(WANT)) { console.error(`!! production is serving ${dpl.slice(0, 12)}, not ${WANT}. REFUSING to report.`); process.exit(2); }
  console.log(`build: ${dpl.slice(0, 12)} — matches ${WANT}\n`);
}

async function mintToken(phone) {
  if (IS_PROD) return null;
  const r = await fetch(`${BASE}/api/dev-test/marketing-optout-seed?phone=${phone}`, { method: "POST", headers: { "user-agent": UA } });
  const j = await r.json().catch(() => ({}));
  return j.ok ? j.token : null;
}

/** A fresh context in one language. ⭐ The language is the `kp-locale` cookie, exactly as the menu sets it. */
async function newContext(browser, { width, height, reduce = false, loc = "sw", cookies = [] }) {
  const ctx = await browser.newContext({ viewport: { width, height }, userAgent: UA, reducedMotion: reduce ? "reduce" : "no-preference" });
  await ctx.addCookies([{ name: "kp-locale", value: loc, url: BASE }, ...cookies.map((c) => ({ ...c, url: BASE }))]);
  return ctx;
}

/* ⭐ EVERY CONTROL QUESTION IS ASKED OF *VISIBLE BUTTONS*, BY ACCESSIBLE NAME. A count is a fact
 * about the page; a substring of the body is a fact about the whole site. */
const visibleButton = (page, name) => page.getByRole("button", { name, exact: true }).locator("visible=true");
const buttonCount = async (page, name) => visibleButton(page, name).count();

/** The state message, read from the page's own content region, never from the site chrome. */
const contentText = async (page) => {
  const main = page.locator("main");
  const node = (await main.count()) > 0 ? main.first() : page.locator("body");
  return norm(await node.innerText());
};
const heading = async (page) => ((await page.locator("main h1").first().innerText().catch(() => "")) || "").trim();
/** ⭐ The heading compared as TEXT: the sw/en titles carry a no-break space and the zh ones zero-width
 *  hints, and whether `innerText` keeps either is the browser's business, not the page's. */
const headingIs = async (page, want) => norm(await heading(page)) === norm(want);

/* ⛔ BOTH WIDTHS ARE READ. `documentElement.scrollWidth` can be PINNED to the viewport while the
 * body overflows, so a measurement that reads only the document element reports a confident zero. */
const noHScroll = async (page, width) => {
  const [bodyW, docW, inner] = await page.evaluate(() => [document.body.scrollWidth, document.documentElement.scrollWidth, window.innerWidth]);
  return { okay: bodyW <= inner + 1 && docW <= inner + 1, detail: `body ${bodyW} · doc ${docW} · viewport ${inner} (${width})` };
};

/** ⛔ VIEWPORT TILES, NEVER FULL-PAGE. The top of the page as a phone shows it, and — when the document
 *  is taller than the window — a second tile scrolled to its end. */
async function shot(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  const [h, vh] = await page.evaluate(() => [document.documentElement.scrollHeight, window.innerHeight]);
  if (h > vh + 4) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${SHOTS}/${name}-end.png` });
    await page.evaluate(() => window.scrollTo(0, 0));
  }
}

/** ⭐ D6 · RULING 5 — no upsell on the way out. Asked of VISIBLE things, by role and href. */
async function noSalesChrome(page, tag, state, C) {
  const auth = await page.locator('a[href^="/auth/login"], a[href^="/auth/register"]').locator("visible=true").count();
  const navs = await page.locator("nav").locator("visible=true").count();
  const chat = await page.getByRole("button", { name: C.chat.openHelp }).locator("visible=true").count();
  const invite = await page.getByText(C.footer.proposeGetPaid).locator("visible=true").count();
  ok(`[${tag}] ${state} · ⛔ NO sign-in/sign-up link, NO nav or bottom rail, NO chat bubble, NO "propose markets" — somebody who came to leave is not sold to`,
    auth === 0 && navs === 0 && chat === 0 && invite === 0, `auth=${auth} nav=${navs} chat=${chat} propose=${invite}`);
  const lang = await page.locator("summary").locator("visible=true").count();
  // ⭐ 2026-10-06 · the owner's ruling took the helpline off every player surface — this footer's included.
  const helpline = await page.locator('[data-testid="optout-footer"] a[href^="tel:"]').count();
  ok(`[${tag}] ${state} · …and the language menu IS there, and no helpline line`, lang >= 1 && helpline === 0,
    `summary=${lang} tel=${helpline}`);
  // ⭐ 2026-09-27 · the responsible-gambling line stays, and the 18+ roundel carries no aria-label (ARIA prohibits
  // one on a generic span).
  const footer = norm(await page.locator('[data-testid="optout-footer"]').innerText().catch(() => ""));
  const labelled18 = await page.locator('[data-testid="optout-footer"] .kp-rg__18[aria-label]').count();
  ok(`[${tag}] ${state} · ⭐ the responsible-gambling line is there, and the 18+ has no aria-label`,
    footer.includes(norm(C.footer.stopGambling)) && labelled18 === 0, `rg line ${footer.includes(norm(C.footer.stopGambling))} · labelled 18+ ${labelled18}`);
}

/** ⭐ D6 · the answer is announced, and focus went to it rather than falling to <body>. */
async function announced(page, role, needle) {
  const r = await page.evaluate(([role, needle]) => {
    // The same fold as `norm`, zero-width hints dropped (built from a char code: the page has no `norm`).
    const fold = (s) => String(s).replace(new RegExp(String.fromCharCode(0x200b), "g"), "").replace(/\s+/g, " ").trim().toLowerCase();
    const a = document.activeElement;
    const inBody = !a || a === document.body;
    const region = a && a !== document.body ? (a.matches(`[role="${role}"]`) ? a : a.querySelector(`[role="${role}"]`)) : null;
    return { inBody, text: fold(region?.textContent || ""), has: fold(region?.textContent || "").includes(needle) };
  }, [role, needle]);
  return { okay: !r.inBody && r.has, detail: r.inBody ? "focus fell to <body>" : `focused region says: ${r.text.slice(0, 80)}` };
}

/* ⚠️ EVERY RUN TAKES ITS OWN NUMBERS, AND THE FIRST VERSION DID NOT.
 * `next dev` with no DATABASE_URL keeps the store IN THE SERVER PROCESS, so a second run of
 * this drive found the number the FIRST run had already stopped: the "valid" state opened as
 * "already suppressed", and the drive reported a page defect that was really its own fixture
 * carrying yesterday's state. ⛔ A drive that cannot be run twice is a drive whose green is a
 * fact about when it last ran. ⚠️ `RUN * 100 + i`: room for 100 numbers a run without touching the next.
 */
const RUN = Date.now() % 100000;
const phoneFor = (i) => `07${String(30000000 + RUN * 100 + i).slice(0, 8)}`;
const RUNS = [
  { loc: "sw", name: "1280", width: 1280, height: 800, reduce: false },
  { loc: "sw", name: "360", width: 360, height: 780, reduce: false },
  { loc: "sw", name: "360-reduce", width: 360, height: 780, reduce: true },
  { loc: "en", name: "1280", width: 1280, height: 800, reduce: false },
  { loc: "en", name: "360", width: 360, height: 780, reduce: false },
  { loc: "zh", name: "1280", width: 1280, height: 800, reduce: false },
  { loc: "zh", name: "360", width: 360, height: 780, reduce: false },
].map((r, i) => ({ ...r, phone: phoneFor(i + 1), tag: r.loc === "sw" ? r.name : `${r.loc}-${r.name}` }));
console.log(`run ${RUN} · numbers ${RUNS.map((w) => w.phone).join(", ")}`);

const browser = await chromium.launch();

for (const w of RUNS) {
  const C = COPY[w.loc];
  const ctx = await newContext(browser, w);
  const page = await ctx.newPage();
  const tag = w.tag;

  // ── STATE · INVALID TOKEN ──────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/s/ZZZZZZZZ`, { waitUntil: "networkidle" });
  await shot(page, `invalid-${tag}`);
  const invalidText = await contentText(page);
  ok(`[${tag}] invalid · the page says the link does not work and that NOTHING HAS CHANGED (its whole sentence)`,
    invalidText.includes(norm(C.o.invalid)), invalidText.slice(0, 100));
  ok(`[${tag}] invalid · ⛔ it never calls a genuine-but-broken link "not ours" (it read as a phishing warning)`,
    !NOT_OURS.test(invalidText));
  ok(`[${tag}] invalid · ⛔ NO STOP BUTTON AND NO RESUME BUTTON — counted, not searched for in the prose, because the page TITLE is the same string as the stop button's label`,
    (await buttonCount(page, C.o.stopButton)) === 0 && (await buttonCount(page, C.o.resubscribeButton)) === 0,
    `stop=${await buttonCount(page, C.o.stopButton)} resume=${await buttonCount(page, C.o.resubscribeButton)}`);
  ok(`[${tag}] invalid · ⛔ and no success sentence anywhere`,
    !invalidText.includes(norm(C.o.done)) && !invalidText.includes(norm(C.o.resubscribed)));
  {
    const settings = await page.locator('main a[href="/profile/notifications"]').locator("visible=true").count();
    const desk = await page.locator('main a[href^="tel:"], main a[href^="mailto:"]').locator("visible=true").count();
    const retry = await page.getByRole("link", { name: C.o.retry, exact: true }).locator("visible=true").count();
    ok(`[${tag}] invalid · ⭐ D6 — NOT A DEAD END: it offers the notification settings and our desk (and no retry: retrying a broken link cannot help)`,
      settings === 1 && desk >= 2 && retry === 0, `settings=${settings} desk=${desk} retry=${retry}`);
  }
  await noSalesChrome(page, tag, "invalid", C);
  {
    const s = await noHScroll(page, w.width);
    ok(`[${tag}] invalid · ⛔ no horizontal scroll`, s.okay, s.detail);
  }

  if (!IS_PROD) {
    const token = await mintToken(w.phone);
    if (!token) { ok(`[${tag}] could not mint a token locally`, false); await ctx.close(); continue; }

    // ── STATE · VALID ────────────────────────────────────────────────────────────────────
    await page.goto(`${BASE}/s/${token}`, { waitUntil: "networkidle" });
    await shot(page, `valid-${tag}`);
    ok(`[${tag}] valid · EXACTLY ONE stop button is offered`, (await buttonCount(page, C.o.stopButton)) === 1,
      `${await buttonCount(page, C.o.stopButton)} stop button(s)`);
    ok(`[${tag}] valid · ⛔ and the resubscribe button is NOT beside it — one unambiguous action at a time`,
      (await buttonCount(page, C.o.resubscribeButton)) === 0);
    ok(`[${tag}] valid · ⭐ the number is MASKED in the shared \`+255••••NN\` form (§5.14) — whoever holds this phone can open this page`,
      /\+255•{4}\d{2}/.test(await page.locator("main").first().innerText()));
    ok(`[${tag}] valid · ⭐ the heading names the act on offer, in the consent's own words`, await headingIs(page, C.o.title), await heading(page));
    if (w.loc === "zh") {
      // 🔴 2026-09-27 · the zh headings broke mid-word (接|收). The title keeps its words whole and breaks at
      // the zero-width hints its string carries (`test:marketing-optout` S7h checks the hints are there).
      const wb = await page.evaluate(() => { const s = document.querySelector("main h1 span"); return s ? getComputedStyle(s).wordBreak : null; });
      ok(`[${tag}] valid · ⭐ zh keeps its words whole in the heading (keep-all, breaking only at its hints)`, wb === "keep-all", `word-break ${wb}`);
    }
    await noSalesChrome(page, tag, "valid", C);
    {
      const s = await noHScroll(page, w.width);
      ok(`[${tag}] valid · ⛔ no horizontal scroll`, s.okay, s.detail);
    }

    // ── STATE · STOPPED — ONE CLICK, NO CONFIRMATION ─────────────────────────────────────
    await visibleButton(page, C.o.stopButton).click();
    await page.waitForTimeout(1200);
    await shot(page, `stopped-${tag}`);
    const stoppedText = await contentText(page);
    ok(`[${tag}] ⭐ ONE CLICK STOPPED IT — no confirmation screen in between`,
      stoppedText.includes(norm(C.o.done)) && !stoppedText.includes(norm(C.o.resubscribed)), stoppedText.slice(0, 100));
    ok(`[${tag}] stopped · ⭐ D6 — the HEADING changed with it (it used to keep saying "stop" above a button that re-subscribes)`,
      await headingIs(page, C.o.stoppedTitle), await heading(page));
    {
      const a = await announced(page, "status", norm(C.o.done));
      ok(`[${tag}] stopped · ⭐ D6 — the confirmation is ANNOUNCED (role=status) and focus moved to it`, a.okay, a.detail);
    }
    ok(`[${tag}] stopped · the way BACK is offered, and the stop button is gone`,
      (await buttonCount(page, C.o.resubscribeButton)) === 1 && (await buttonCount(page, C.o.stopButton)) === 0,
      `stop=${await buttonCount(page, C.o.stopButton)} resume=${await buttonCount(page, C.o.resubscribeButton)}`);

    // ── STATE · RESUBSCRIBED ─────────────────────────────────────────────────────────────
    await visibleButton(page, C.o.resubscribeButton).click();
    await page.waitForTimeout(1200);
    await shot(page, `resumed-${tag}`);
    const resumedText = await contentText(page);
    // ⚠️ D6 · the resumed sentence states what was DONE (the stop lifted, the choice recorded) and makes
    // no delivery promise — the gate may still refuse this number.
    ok(`[${tag}] ⭐ RESUBSCRIBED — the second button, never a condition of the first`,
      resumedText.includes(norm(C.o.resubscribed)) && !resumedText.includes(norm(C.o.done)), resumedText.slice(0, 100));
    ok(`[${tag}] resumed · ⭐ D6 — the heading states the recorded choice`, await headingIs(page, C.o.resumedTitle), await heading(page));
    {
      const a = await announced(page, "status", norm(C.o.resubscribed));
      ok(`[${tag}] resumed · ⭐ D6 — announced, and focus moved to it`, a.okay, a.detail);
    }
    ok(`[${tag}] resubscribed · the way OUT is one tap away again`,
      (await buttonCount(page, C.o.stopButton)) === 1 && (await buttonCount(page, C.o.resubscribeButton)) === 0);

    // ── STATE · ALREADY SUPPRESSED, ON A FRESH LOAD ──────────────────────────────────────
    await visibleButton(page, C.o.stopButton).click();
    await page.waitForTimeout(1200);
    await page.goto(`${BASE}/s/${token}`, { waitUntil: "networkidle" });
    await shot(page, `already-${tag}`);
    const alreadyText = await contentText(page);
    ok(`[${tag}] ⭐ ALREADY SUPPRESSED on a FRESH LOAD — the page reads the DATABASE, not the click`,
      alreadyText.includes(norm(C.o.already)), alreadyText.slice(0, 100));
    ok(`[${tag}] already · 🔴 D6 — the heading says STOPPED, never "tap once to stop" above a button that re-subscribes`,
      (await headingIs(page, C.o.stoppedTitle)) && !alreadyText.includes(norm(C.o.body)), await heading(page));
    ok(`[${tag}] already · only the way back is offered`,
      (await buttonCount(page, C.o.resubscribeButton)) === 1 && (await buttonCount(page, C.o.stopButton)) === 0);
    {
      const s = await noHScroll(page, w.width);
      ok(`[${tag}] already · ⛔ no horizontal scroll`, s.okay, s.detail);
    }

    // ── D6 · A LOWER-CASE LINK IS THE SAME LINK ──────────────────────────────────────────
    await page.goto(`${BASE}/s/${token.toLowerCase()}`, { waitUntil: "networkidle" });
    const lowerText = await contentText(page);
    ok(`[${tag}] ⭐ D6 — the token typed in LOWER CASE resolves to the same number (URL bars do not capitalise)`,
      (await buttonCount(page, C.o.resubscribeButton)) === 1 && !lowerText.includes(norm(C.o.invalid)), lowerText.slice(0, 80));
  }
  await ctx.close();
}

// ── D6 · THE FIRST-VISIT PRIMER, FORCED OPEN, MUST STAY OFF THE WAY OUT ──────────────────────
// ⛔ Each in a FRESH context: the primer opens only when this browser has never dismissed it, which
// is exactly the browser an SMS recipient arrives in.
{
  const token = IS_PROD ? null : await mintToken(phoneFor(10));
  const targets = [`/s/ZZZZZZZZ?primer=1`, ...(token ? [`/s/${token}?primer=1`] : [])];
  for (const path of targets) {
    const ctx = await newContext(browser, { width: 360, height: 780 });
    const page = await ctx.newPage();
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const dialogs = await page.getByRole("dialog").locator("visible=true").count();
    await shot(page, `primer-forced-${path.startsWith("/s/ZZ") ? "invalid" : "valid"}-360`);
    ok(`⛔ D6 — with the primer FORCED, ${path.split("?")[0].replace(/\/s\/[A-Z0-9]{8}$/, "/s/<token>")} shows NO dialog after 2s (the betting tutorial used to dock over the stop button)`,
      dialogs === 0, `${dialogs} visible dialog(s)`);
    await ctx.close();
  }
  // ⚠️ CONTROL — the same forcing DOES open the primer on the board, so the assertion above can fail.
  const ctx = await newContext(browser, { width: 360, height: 780 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?primer=1`, { waitUntil: "networkidle" });
  const opened = await page.getByRole("dialog", { name: COPY.sw.primer.primerLabel }).first().waitFor({ state: "visible", timeout: 6000 }).then(() => true, () => false);
  ok("⚠️ CONTROL · …and the SAME forcing opens the primer on `/`, so the check above is capable of failing", opened);
  await ctx.close();
}

if (!IS_PROD) {
  // ── STATE · LOADING, IN EVERY LANGUAGE AT BOTH WIDTHS — held by the dev-only `qa_hold_ms` ──
  // ⭐ The skeleton is the page's own parts with its text as bars, so the stop button must land exactly
  // where it was drawn — 🔴 it was drawn 24px low at 360. The heading and sentence blocks are compared
  // too, so a mismatch names WHICH line wrapped differently.
  let k = 20;
  for (const loc of LOCALES) {
    for (const w of [{ name: "1280", width: 1280, height: 800 }, { name: "360", width: 360, height: 780 }]) {
      const C = COPY[loc];
      const tag = loc === "sw" ? w.name : `${loc}-${w.name}`;
      const token = await mintToken(phoneFor(k++));
      if (!token) { ok(`[${tag}] LOADING · could not mint a token locally`, false); continue; }
      const ctx = await newContext(browser, { ...w, loc });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/s/${token}?qa_hold_ms=3500`, { waitUntil: "commit" });
      const busy = await page.locator('[aria-busy="true"]').first().waitFor({ state: "visible", timeout: 3000 }).then(() => true, () => false);
      // Measured once the web fonts are in: a line measured in the fallback face wraps somewhere else.
      await page.evaluate(async () => { await document.fonts.ready; });
      await page.screenshot({ path: `${SHOTS}/loading-${tag}.png` });
      const box = async (loc_) => (await loc_.count()) ? loc_.first().boundingBox() : null;
      const skAction = page.locator('[aria-busy="true"] [data-skeleton="action"]');
      const sk = busy ? {
        action: await box(skAction),
        h1: await box(page.locator('[aria-busy="true"] h1')),
        sentence: await box(skAction.locator("xpath=preceding-sibling::p[1]")),
        says: norm(await skAction.first().innerText().catch(() => "")),
        paint: await page.evaluate(() => {
          const span = document.querySelector('[aria-busy="true"] h1 span');
          return span ? { bg: getComputedStyle(span).backgroundColor, ink: getComputedStyle(span).color } : null;
        }),
      } : null;
      ok(`[${tag}] ⭐ LOADING · the skeleton is on screen and says so to a screen reader`, busy
        && (await page.locator('[aria-busy="true"] .sr-only').first().innerText().catch(() => "")).length > 0);
      ok(`[${tag}] 🔴 LOADING · the skeleton is VISIBLE — its bars are painted (not a ~1:1 tint), its text transparent, and the action says "${C.o.loading}" on screen`,
        !!sk?.paint && !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(sk.paint.bg) && /rgba\(0, 0, 0, 0\)|transparent/.test(sk.paint.ink)
          && sk.says === norm(C.o.loading),
        JSON.stringify(sk?.paint ?? null) + ` · action says "${sk?.says ?? ""}"`);
      const real = visibleButton(page, C.o.stopButton);
      await real.waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
      const rl = {
        action: await real.boundingBox().catch(() => null),
        h1: await box(page.locator("main h1")),
        sentence: await box(real.locator("xpath=preceding-sibling::p[1]")),
      };
      const px = (b) => (b ? Math.round(b.y) : "?");
      const hh = (b) => (b ? Math.round(b.height) : "?");
      ok(`[${tag}] ⭐ LOADING · the stop button lands where the skeleton drew it, and the heading and sentence wrap to the same height (a button that moves under a thumb is a tap somewhere else)`,
        !!sk?.action && !!rl.action && Math.abs(sk.action.y - rl.action.y) <= 2
          && !!sk.h1 && !!rl.h1 && Math.abs(sk.h1.height - rl.h1.height) <= 1
          && !!sk.sentence && !!rl.sentence && Math.abs(sk.sentence.height - rl.sentence.height) <= 1,
        `button ${px(sk?.action)} → ${px(rl.action)} · heading ${hh(sk?.h1)} → ${hh(rl.h1)} · sentence ${hh(sk?.sentence)} → ${hh(rl.sentence)}`);
      await ctx.close();
    }
  }

  // ── STATE · PENDING — the button mid-tap, held by the dev-only act hold ────────────────────
  for (const loc of ["sw", "zh"]) {
    const C = COPY[loc];
    const tag = loc === "sw" ? "360" : `${loc}-360`;
    const token = await mintToken(phoneFor(k++));
    if (!token) { ok(`[${tag}] PENDING · could not mint a token locally`, false); continue; }
    const ctx = await newContext(browser, { width: 360, height: 780, loc, cookies: [{ name: "kp-qa-hold-act-ms", value: "2500" }] });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/s/${token}`, { waitUntil: "networkidle" });
    await visibleButton(page, C.o.stopButton).click();
    await page.waitForTimeout(400);
    await shot(page, `pending-${tag}`);
    const pendingBtn = visibleButton(page, C.o.loading);
    const busyAttr = (await pendingBtn.count()) ? await pendingBtn.first().getAttribute("aria-busy") : null;
    ok(`[${tag}] ⭐ PENDING · the tapped button says "${C.o.loading}", is busy, and nothing claims a success yet`,
      (await pendingBtn.count()) === 1 && busyAttr === "true" && !(await contentText(page)).includes(norm(C.o.done)),
      `pending buttons ${await pendingBtn.count()} · aria-busy ${busyAttr}`);
    // 🔴 2026-09-27 · the busy button was drawn at `.btn:disabled`'s 0.45, the faintest text on the page at the
    // moment the person waits on it. A busy button keeps (almost) full strength.
    {
      const opacity = (await pendingBtn.count()) ? await pendingBtn.first().evaluate((el) => Number(getComputedStyle(el).opacity)) : 0;
      ok(`[${tag}] ⭐ PENDING · the busy label is READABLE — the button is not dimmed like a disabled one`, opacity >= 0.8, `opacity ${opacity}`);
    }
    await page.waitForTimeout(3000);
    ok(`[${tag}] PENDING · …and the answer lands once the hold ends`, (await contentText(page)).includes(norm(C.o.done)));
    await ctx.close();
  }

  // ── STATE · THE PAGE'S OWN READ FAILED — `?qa_fail_read=1` (dev only) ──────────────────────
  for (const w of [{ loc: "sw", name: "1280", width: 1280, height: 800 }, { loc: "sw", name: "360", width: 360, height: 780 }, { loc: "zh", name: "360", width: 360, height: 780 }]) {
    const C = COPY[w.loc];
    const tag = w.loc === "sw" ? w.name : `${w.loc}-${w.name}`;
    const token = await mintToken(phoneFor(k++));
    if (!token) { ok(`[${tag}] READ FAILURE · could not mint a token locally`, false); continue; }
    const ctx = await newContext(browser, w);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/s/${token}?qa_fail_read=1`, { waitUntil: "networkidle" });
    await shot(page, `readfail-${tag}`);
    const text = await contentText(page);
    const retry = page.getByRole("link", { name: C.o.retry, exact: true }).locator("visible=true");
    const retryHref = (await retry.count()) ? await retry.first().getAttribute("href") : null;
    const desk = await page.locator('main a[href^="tel:"], main a[href^="mailto:"]').locator("visible=true").count();
    ok(`[${tag}] ⭐ READ FAILURE · "did not go through", a RETRY of the same link, and our desk — never "this link does not work"`,
      text.includes(norm(C.o.error)) && !text.includes(norm(C.o.invalid)) && retryHref === `/s/${token}` && desk >= 2
        && (await buttonCount(page, C.o.stopButton)) === 0,
      `retry ${retryHref} · desk ${desk} · ${text.slice(0, 80)}`);
    // 🔴 2026-09-27 · the two buttons sat 4px apart at two widths and read as a rendering glitch. One group now.
    {
      const settings = page.locator('main a[href="/profile/notifications"]').locator("visible=true");
      const rb = (await retry.count()) ? await retry.first().boundingBox() : null;
      const sb = (await settings.count()) ? await settings.first().boundingBox() : null;
      const gap = rb && sb ? Math.round(sb.y - (rb.y + rb.height)) : null;
      ok(`[${tag}] ⭐ READ FAILURE · the retry and the settings button are ONE group — the same width, at least 8px apart`,
        !!rb && !!sb && gap >= 8 && Math.abs(rb.width - sb.width) <= 1,
        `gap ${gap}px · widths ${rb ? Math.round(rb.width) : "?"} / ${sb ? Math.round(sb.width) : "?"}`);
    }
    await noSalesChrome(page, tag, "read failure", C);
    await ctx.close();
  }

  // ── BARE `/s` AND A DEEPER `/s/…/x` ───────────────────────────────────────────────────────
  // 🔴 Both used to render the root 404 INSIDE the stripped shell, whose soft links then opened the
  // landing page with no nav. Bare `/s` is now the refusal; a deeper path gets the full shell's 404.
  {
    const C = COPY.sw;
    const ctx = await newContext(browser, { width: 360, height: 780 });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/s`, { waitUntil: "networkidle" });
    await shot(page, "bare-360");
    const text = await contentText(page);
    const soft = await page.locator('main a[href="/"], main a[href="/markets"]').count();
    ok("⭐ BARE /s · the opt-out refusal (the link does not work, nothing changed, two other ways to stop) — not the 404",
      text.includes(norm(C.o.invalid)) && soft === 0 && (await page.locator('[data-testid="optout-footer"]').count()) === 1,
      `soft links ${soft} · ${text.slice(0, 80)}`);
    await noSalesChrome(page, "360", "bare /s", C);
    await page.goto(`${BASE}/s/ZZZZZZZZ/x`, { waitUntil: "networkidle" });
    await shot(page, "deeper-360");
    ok("⭐ DEEPER /s/…/x · rendered in the FULL shell (its 404's links work there), never the stripped one",
      (await page.locator('[data-testid="optout-footer"]').count()) === 0,
      `opt-out footer ${await page.locator('[data-testid="optout-footer"]').count()}`);
    await ctx.close();
  }

  // ── STATE · ERROR, THEN BUSY — the address's budget run dry by MISSES ─────────────────────
  // ⛔ LOCAL ONLY, AND LAST: on production this would throttle a real bucket for everybody behind our
  // address, and locally it leaves THIS address dry for the minute it takes to refill.
  const errToken = await mintToken(phoneFor(k++));
  if (errToken) {
    const C = COPY.sw;
    const ctx = await newContext(browser, { width: 360, height: 780 });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/s/${errToken}`, { waitUntil: "networkidle" });
    // ⚠️ Drained FROM THE PAGE, not from Playwright's own HTTP client: the budget is keyed on the client
    // address, and Node and Chromium can resolve `localhost` to different families (::1 vs 127.0.0.1).
    await page.evaluate(async () => { for (let i = 0; i < 45; i++) await fetch("/s/ZZZZZZZZ", { cache: "no-store" }).catch(() => null); });
    // 🔴 2026-09-27 · MEASURED BEFORE THE TAP AND AFTER THE REFUSAL, BEFORE ANY TILE IS TAKEN (a tile scrolls).
    // The alert and our desk used to be inserted ABOVE the button: it dropped ~210px, and the desk's `tel:`
    // row landed exactly where the thumb had tapped, so "try again" there opened the phone dialer.
    const stopBtn = visibleButton(page, C.o.stopButton);
    await stopBtn.scrollIntoViewIfNeeded();
    const before = await stopBtn.boundingBox();
    await stopBtn.click();
    await page.waitForTimeout(1500);
    {
      // The pointer is moved off first: `.btn:hover` lifts a button 2px (`--m-lift`), and a thumb does not hover.
      await page.mouse.move(1, 1);
      await page.waitForTimeout(300);
      const after = await visibleButton(page, C.o.stopButton).boundingBox().catch(() => null);
      const at = before ? [before.x + before.width / 2, before.y + before.height / 2] : [0, 0];
      const hit = await page.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        const b = el?.closest("button");
        return { button: b ? (b.textContent || "") : null, link: el?.closest("a")?.getAttribute("href") ?? null };
      }, at);
      ok("🔴 ERROR · 2026-09-27 — a refused tap moves NOTHING under the thumb: the stop button's box is unchanged, and the point just tapped is still the stop button, never a tel:/mailto: row",
        !!before && !!after && Math.abs(before.y - after.y) <= 1 && Math.abs(before.height - after.height) <= 1
          && hit.link === null && hit.button !== null && norm(hit.button) === norm(C.o.stopButton),
        `button y ${before ? Math.round(before.y) : "?"} → ${after ? Math.round(after.y) : "?"} · the tap point hits ${hit.link ? `a link ${hit.link}` : hit.button !== null ? `button "${hit.button.trim()}"` : "no button"}`);
    }
    await shot(page, "error-360");
    const errText = await contentText(page);
    const a = await announced(page, "alert", norm(C.o.error));
    ok("⭐ ERROR · a refused tap says so — announced as an ALERT, focus on it — and never claims a success",
      a.okay && !errText.includes(norm(C.o.done)), a.detail);
    ok("🔴 ERROR · D6 — the page keeps offering THE SAME act (it used to offer the opposite one under 'try again')",
      (await buttonCount(page, C.o.stopButton)) === 1 && (await buttonCount(page, C.o.resubscribeButton)) === 0 && (await headingIs(page, C.o.title)),
      `stop=${await buttonCount(page, C.o.stopButton)} resume=${await buttonCount(page, C.o.resubscribeButton)} heading=${await heading(page)}`);
    {
      const tel = await page.locator('main a[href^="tel:"]').locator("visible=true").count();
      const mail = await page.locator('main a[href^="mailto:"]').locator("visible=true").count();
      ok("⭐ ERROR · 2026-09-27 — a failed tap names our desk (phone and email) under the error, not only 'try again'",
        tel >= 1 && mail >= 1, `tel=${tel} mailto=${mail}`);
    }
    // 🔴 2026-09-27 · a dry address used to answer a GENUINE link "this link does not work". It now says the
    // page is busy and nothing changed, with a retry — the same answer for every token, so still no oracle.
    // ⚠️ DRAINED AGAIN FIRST: the budget refills one every 6 s (`optout.ip` 30 / 10 per minute), and the
    // ERROR checks above take longer than that — so the first capture found the address refilled and the
    // valid link rendering normally, which is the design working, not a defect.
    await page.evaluate(async () => { for (let i = 0; i < 45; i++) await fetch("/s/ZZZZZZZZ", { cache: "no-store" }).catch(() => null); });
    await page.goto(`${BASE}/s/${errToken}`, { waitUntil: "networkidle" });
    await shot(page, "busy-360");
    const dryText = await contentText(page);
    const retry = await page.getByRole("link", { name: C.o.retry, exact: true }).locator("visible=true").count();
    ok("⭐ BUSY · a dry address reads a valid link as BUSY (try again, nothing changed) — never 'this link does not work', and no lookup was made",
      dryText.includes(norm(C.o.busy)) && !dryText.includes(norm(C.o.invalid)) && retry === 1 && (await buttonCount(page, C.o.stopButton)) === 0,
      `retry=${retry} · ${dryText.slice(0, 80)}`);
    await ctx.close();
  }
}

// ── THE NO-LOGIN PROMISE, DRIVEN RATHER THAN ASSERTED ─────────────────────────────────────
// ⛔ A 200 from `curl` is not proof a BROWSER reaches a page — a streamed redirect answers 200
// on a page the browser is sent away from. This follows a real navigation and reads where it
// LANDED, signed out, and pairs it with a control that must go the other way.
{
  const ctx = await newContext(browser, { width: 1280, height: 800 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/s/ZZZZZZZZ`, { waitUntil: "networkidle" });
  ok("⭐ SIGNED OUT, A REAL BROWSER LANDS ON /s/ AND IS NOT SENT TO SIGN IN — an opt-out behind a login is one an imported contact can never use (ETA s.32(1)(c))",
    new URL(page.url()).pathname.startsWith("/s/"), `landed on ${new URL(page.url()).pathname}`);
  await page.goto(`${BASE}/wallet`, { waitUntil: "networkidle" });
  ok("⭐ CONTROL · /wallet DOES send a signed-out browser away, so the assertion above is capable of failing",
    !new URL(page.url()).pathname.startsWith("/wallet"), `landed on ${new URL(page.url()).pathname}`);
  await ctx.close();
}

await browser.close();
console.log(`\nu8-optout: ${pass} passed, ${fail} failed · viewport tiles in ${SHOTS}`);
process.exitCode = fail === 0 ? 0 : 1;
