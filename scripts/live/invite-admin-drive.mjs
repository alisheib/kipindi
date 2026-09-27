/**
 * READ-ONLY drive of /admin/affiliate while invites are NOT PAYABLE — the Owner's "Payable / Not payable"
 * switch (2026-09-26, docs/PLAYER-INVITE-UNPAID.md §12). It opens the Owner's "Make payable…" dialog, types
 * into it and measures when Confirm arms — and it NEVER confirms, never clicks Save, never keeps a setting.
 *
 * ⛔ ON PRODUCTION (no ADMIN_SEED) IT NEVER TYPES THE FULL WORDS "MAKE PAYABLE" (2026-09-27). With them, a reason
 * and the default choice in, Confirm is ARMED on the live console — one stray click from paying referrers, with
 * only the safety net below in the way. So production proves the NEGATIVE half only: Confirm stays disabled with
 * a reason and a partial or wrong-case word. The ARMED state is proven locally (ADMIN_SEED=1) and then cancelled.
 * `fillSafely` refuses the full words on production outright, whatever a later edit asks it to type.
 *
 *   LIVE_BASE=https://www.50pick.tz SHOT_DIR=<dir> npm run qa:invite-admin
 *
 * ⛔ Production allows ONE session per account: signing in as `admin` (Ali's own console login) signs
 * him out everywhere else once. Run it only with his go-ahead, and never re-mint that password.
 * Locally: LIVE_BASE=http://localhost:<port> ADMIN_SEED=1 uses POST /api/dev-test/seed-admin instead.
 *
 * ⛔ THE SAFETY NET. Every browser context this drive opens sends EVERY request through a route handler that
 * ABORTS anything carrying a `next-action` header — a Next.js server action: the Make-payable confirm, a
 * reward Save, anything that writes — and the run FAILS naming it. So even a Confirm pressed by mistake, a
 * selector that hit the wrong button, or a page that writes on load cannot change anything, on production
 * or anywhere else. Service workers are blocked so no request can reach the network around the handler.
 * The sign-in above is the one write this drive makes (a session), and it happens before the net is up.
 * ⭐ THE NET IS PROVEN ON EVERY CONTEXT, NOT ASSUMED: the page first sends a request carrying a DECOY action
 * id to /api/health — a GET-only route, so a POST there is a harmless 405 even if the net were down — and the
 * run requires the net to have caught it. A safety net nobody has seen catch anything is a hope.
 *
 * WHAT IT READS, AND FROM WHERE. Roles, aria-labels and the SERVER's words (`invitePayableDialogs` in
 * src/lib/server/invite-rewards-ceremony.ts) — never class names. The state is also asked of the server
 * (GET /api/health → inviteRewards) and the page must agree with it. Where the page does not offer what it
 * should, the drive prints what it DID find rather than guessing.
 * ⚠️ When the page says Payable (the Owner switched it on, or the server forces it), the Not-payable half
 * cannot be measured: it is SKIPPED out loud and counted in the summary, never passed.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { BASE, loginOnce } from "./harness.mjs";

const OUT = process.env.SHOT_DIR ?? "invite-admin-shots";
/** A local dev server with the seeded admin. ⛔ Anything else is treated as production. */
const LOCAL = process.env.ADMIN_SEED === "1";
mkdirSync(OUT, { recursive: true });
const results = [];
const skipped = [];
const check = (w, name, ok, detail = "") => {
  results.push({ w, name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  [${w}] ${name}${detail ? " — " + detail : ""}`);
  return !!ok;
};
/** ⛔ Something this run could not measure is SKIPPED — printed, counted, and never a pass. */
const skip = (w, name, why) => {
  skipped.push({ w, name, why });
  console.log(`SKIP  [${w}] ${name} — ${why}`);
};
const note = (w, msg) => console.log(`      [${w}] ${msg}`);
const flat = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

/** The three reward-mode switches, by the aria-labels the page keeps. */
const REWARD_TOGGLES = ["Commission enabled", "Bonus / discount enabled", "Prize enabled"];
/** The server's words — `invitePayableDialogs` builds every one of them. */
const WORDS = {
  chipOff: "Not payable",
  chipOn: "Payable",
  titleOff: /Not payable · Hazilipwi/i,
  titleOn: /Payable · Zinalipwa/i,
  bodyOff: /Invites are tracked; 50pick pays nothing/i,
  lockedCaption: /Locked — Not payable/i,
  terms: /Referrer commission is capped at 50% of margin/i,
  // ⛔ Owner ruling 2026-09-27: 50pick's licence covers invite rewards — nothing on the switch asks for clearance.
  boardAsk: /Gaming Board|clearance|regulated inducement/i,
  provenance: [
    /Never switched on\./i,
    // ⭐ The record's number rides with it (review P1): "Since … · who · “reason” · record #N".
    /Since .{4,60} · .{1,60} · “[^”]*” · record #\d+/,
    /Stored switch unreadable — treated as Not payable/i,
    /could not be read just now — treated as Not payable/i,
  ],
  notes: {
    notOwner: /Only the Owner can make invites payable/i,
    closed: /Withdrawn in the server's (environment|code)/i,
    forced: /Forced on by the server/i,
    paused: /Paused at service level/i,
    // ⭐ The STORED position, whenever the server overrides it (review P7).
    stored: /Stored: (Payable|Not payable) —/i,
    older: /The stored switch is older than its last recorded change/i,
    settingsUnread: /The reward settings could not be re-read just now/i,
  },
  // Case-insensitive: it is also matched against innerText, which carries any CSS text-transform.
  trigger: /make payable\s*(…|\.\.\.)\s*$/i,
  stopTrigger: /stop paying\s*(…|\.\.\.)\s*$/i,
  confirm: "Make payable",
  cancel: "Cancel",
  legend: /What pays from now/i,
  nothing: /Nothing yet/i,
  asShown: /The settings on this page/i,
  reasonLabel: /making invites payable/i,
  wordLabel: /type make payable/i,
  word: "MAKE PAYABLE",
  count: /(\d[\d,]*)\s*characters left/i,
  reasonMax: 300,
};
/** What the drive types. ⛔ Never submitted: Confirm is never clicked, and the safety net would abort it. */
const REASON = "QA read-only drive, never confirmed";
const REASON_SHORT = "QA d"; // four characters, one under the server's floor of five
/** A PARTIAL word — what production types instead of the full words, which it never types. */
const WORD_PARTIAL = "MAKE PAYAB";
/** A control whose words offer to START paying. Only the Owner's ceremony trigger may match. */
const PAY_STARTER = /make payable|(^|[^a-z])(start|enable|activate|turn on|begin|resume)[^a-z].*(pay|reward|commission)|pay (now|out|all)|send payment/i;
const DECOY_ACTION = "qa-safety-net-decoy";

/**
 * ⭐ WHAT THE SERVER SAYS — GET /api/health → `inviteRewards: { payable, paying, ceiling }`. `payable` is the
 * switch (what this page's card shows); `paying` is whether a player's invite PAYS (a reward armed too).
 * ⛔ A missing or malformed field is the health CONTRACT changing, and it FAILS, loudly: a drive that guessed
 * would hold a paid page to unpaid expectations, or the reverse. A FORCED ceiling always pays and a CLOSED one
 * never does, so a body saying otherwise is broken too.
 */
async function inviteRewardsFromHealth() {
  let status = 0, body = null, err = "";
  try {
    const r = await fetch(`${BASE}/api/health`, { headers: { accept: "application/json" } });
    status = r.status;
    body = await r.json().catch(() => null);
  } catch (e) { err = String(e?.message ?? e); }
  const ir = body && typeof body === "object" ? body.inviteRewards : undefined;
  const payable = ir && typeof ir === "object" ? ir.payable : undefined;
  const paying = ir && typeof ir === "object" ? ir.paying : undefined;
  const ceiling = ir && typeof ir === "object" ? ir.ceiling : undefined;
  const shapeOk = typeof payable === "boolean" && typeof paying === "boolean" && ["FORCED", "OWNER", "CLOSED"].includes(ceiling);
  const agrees = shapeOk && !(ceiling === "CLOSED" && payable) && !(ceiling === "FORCED" && !payable) && !(paying && !payable);
  const detail = err ? `GET /api/health failed: ${err}`
    : !shapeOk ? `HTTP ${status}; inviteRewards = ${JSON.stringify(ir ?? null)} — the health contract changed (expected { payable: boolean, paying: boolean, ceiling: "FORCED" | "OWNER" | "CLOSED" })`
    : !agrees ? `inviteRewards = ${JSON.stringify(ir)} — payable=${payable}, paying=${paying} under a ${ceiling} ceiling cannot all be true`
    : `payable=${payable}, paying=${paying}, ceiling=${ceiling} (HTTP ${status})`;
  return { ok: shapeOk && agrees, payable: shapeOk && agrees ? payable : null, paying: shapeOk && agrees ? paying : null, ceiling: shapeOk ? ceiling : null, detail };
}

/** ⛔ THE SAFETY NET — see the header. Returns the tally the run reports. */
async function armSafetyNet(ctx) {
  const net = { inspected: 0, decoys: 0, blocked: [] };
  await ctx.route("**/*", async (route) => {
    const req = route.request();
    net.inspected++;
    let action = "";
    try { action = (await req.allHeaders())["next-action"] ?? ""; } catch { action = req.headers()["next-action"] ?? ""; }
    if (action) {
      if (action === DECOY_ACTION) net.decoys++;
      else net.blocked.push(`${req.method()} ${req.url().replace(BASE, "")} (action ${action.slice(0, 12)}…)`);
      await route.abort("blockedbyclient").catch(() => {});
      return;
    }
    await route.continue().catch(() => {});
  });
  return net;
}

/** The control for the net: a decoy action id, to a route where a POST is a 405 whatever happens. */
async function proveSafetyNet(page, net, w) {
  const before = net.decoys;
  const outcome = await page.evaluate(async (id) => {
    try {
      const r = await fetch("/api/health", { method: "POST", headers: { "Next-Action": id }, body: "" });
      return `reached the server (HTTP ${r.status})`;
    } catch { return "blocked"; }
  }, DECOY_ACTION);
  check(w, "CONTROL · the safety net aborts a request carrying a next-action header (a decoy to GET-only /api/health)",
    outcome === "blocked" && net.decoys === before + 1, `${outcome}; decoys caught: ${net.decoys - before}`);
}

/** Is `text` the whole text of some VISIBLE element under `scope` (a page or a locator)? DOM text, so a
 *  CSS-uppercased chip still matches. */
async function visibleExact(scope, text) {
  const loc = scope.getByText(text, { exact: true });
  const n = await loc.count();
  for (let i = 0; i < n; i++) if (await loc.nth(i).isVisible().catch(() => false)) return true;
  return false;
}

/**
 * The header chip, read INSIDE the page head — the <header> that holds the page's <h1> (AdminPageHead).
 * ⛔ NEVER PAGE-WIDE: the compliance note prints <strong>Not payable</strong>, whose whole text is the chip's
 * word, so a page-wide search would answer for a chip that is not there.
 */
async function readChip(page) {
  const head = page.locator("main header").filter({ has: page.locator("h1") }).first();
  if ((await head.count()) === 0) return { state: null, detail: "the page head (the <header> holding the <h1>) was not found" };
  const off = await visibleExact(head, WORDS.chipOff);
  const on = await visibleExact(head, WORDS.chipOn);
  const state = off && !on ? "NOT_PAYABLE" : on && !off ? "PAYABLE" : null;
  return { state, detail: state ?? (off && on ? "BOTH words in the page head" : "NEITHER word in the page head") };
}

/** Viewport tiles down the page, never a full-page capture. */
async function pageTiles(page, w, h) {
  await page.evaluate(() => scrollTo(0, 0));
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = h - 96;
  let n = 0;
  for (let y = 0; y < total && n < 6; y += step) {
    n++;
    await page.evaluate((yy) => scrollTo(0, yy), y);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/admin-affiliate-${w}-${n}.png` });
  }
  await page.evaluate(() => scrollTo(0, 0));
  return n;
}

/** Viewport tiles through the dialog's own scroll box (the kit's alertdialog is the scroller). */
async function dialogTiles(page, dialog, w) {
  const box = await dialog.evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight })).catch(() => ({ sh: 0, ch: 0 }));
  let n = 0;
  for (let y = 0; n < 4; y += Math.max(200, box.ch - 96)) {
    n++;
    await dialog.evaluate((el, yy) => { el.scrollTop = yy; }, y).catch(() => {});
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${OUT}/admin-affiliate-${w}-dialog-${n}.png` });
    if (y + box.ch >= box.sh) break;
  }
  await dialog.evaluate((el) => { el.scrollTop = 0; }).catch(() => {});
  return n;
}

/**
 * ⭐ THE LOCK, MEASURED ON THE RENDERED PAGE. Each reward card is found from its own switch — the largest
 * ancestor that holds that switch and no other reward switch — so no class name is involved. Inside the cards:
 * every switch and choice. Across the whole page body (dialogs excluded): every switch and every input.
 */
async function auditLock(page) {
  return page.evaluate((labels) => {
    const main = document.querySelector("main") || document.body;
    const shown = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      // opacity too: a kit mirror input (DateSelect's) is a real box painted invisible, not a control anyone types in.
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0";
    };
    const inDialog = (el) => !!el.closest('[role="dialog"], [role="alertdialog"], dialog');
    const clean = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 48);
    const nameOf = (el) => clean(
      el.getAttribute("aria-label")
      || (el.labels && el.labels.length ? el.labels[0].innerText : "")
      || (el.closest("label") ? el.closest("label").innerText : "")
      || el.innerText || el.getAttribute("placeholder") || el.getAttribute("name") || el.tagName.toLowerCase());
    const lockOf = (el) => ({
      native: el.disabled === true || !!el.closest("fieldset:disabled"),
      aria: el.getAttribute("aria-disabled") === "true",
      readOnly: el.readOnly === true,
    });
    const FIELD = 'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, select';
    const CHOICE = 'button, [role="switch"], [role="radio"], [role="checkbox"], [role="button"], input[type="checkbox"], input[type="radio"]';
    const found = labels.map((l) => main.querySelector(`[role="switch"][aria-label="${l}"]`)).filter(Boolean);
    const regionOf = (t) => {
      let el = t;
      for (;;) {
        const p = el.parentElement;
        if (!p || p === main || p === document.body) return el;
        if (found.some((o) => o !== t && p.contains(o))) return el;
        el = p;
      }
    };
    // ⛔ Regions only when all three switches are there: one lone switch would climb to the whole page.
    const cards = found.length === labels.length
      ? found.map((t) => ({ label: t.getAttribute("aria-label"), on: t.getAttribute("aria-checked") === "true", el: regionOf(t) }))
      : [];
    const seen = new Set();
    const choices = [];
    for (const c of cards) {
      for (const el of c.el.querySelectorAll(CHOICE)) {
        if (seen.has(el) || !shown(el)) continue;
        seen.add(el);
        choices.push({ where: c.label, name: nameOf(el), ...lockOf(el) });
      }
    }
    for (const el of main.querySelectorAll('[role="switch"]')) {
      if (seen.has(el) || !shown(el) || inDialog(el)) continue;
      seen.add(el);
      choices.push({ where: "outside the reward cards", name: nameOf(el), ...lockOf(el) });
    }
    const fields = [...main.querySelectorAll(FIELD)].filter((el) => shown(el) && !inDialog(el)).map((el) => ({
      name: nameOf(el),
      where: (cards.find((c) => c.el.contains(el)) || {}).label || "outside the reward cards",
      ...lockOf(el),
    }));
    return {
      toggles: found.map((t) => ({ label: t.getAttribute("aria-label"), on: t.getAttribute("aria-checked") === "true", ...lockOf(t) })),
      regions: cards.length,
      choices,
      fields,
    };
  }, REWARD_TOGGLES);
}

/** Wait for the alertdialog to leave the DOM (the kit plays a short exit first). */
async function dialogGone(page) {
  for (let i = 0; i < 20; i++) {
    if ((await page.locator('[role="alertdialog"]').count()) === 0) return true;
    await page.waitForTimeout(200);
  }
  return false;
}

/**
 * ⭐ THE OWNER'S CEREMONY, OPENED AND NEVER CONFIRMED. It types its way through the states that must NOT arm
 * Confirm — empty, a reason only, the words in lower case, a PARTIAL word — and asserts each. ⛔ Only LOCALLY
 * (ADMIN_SEED=1) does it type the full words: a short reason with them must not arm, and a reason, the words and
 * a "what pays from now" choice WILL arm — asserted, never clicked, then Cancel. On production the full words are
 * never typed (see the header), so the armed state is a counted SKIP there.
 */
async function driveCeremony(page, w, trigger) {
  const dialog = page.getByRole("alertdialog").first();
  let opened = false;
  for (let attempt = 1; attempt <= 2 && !opened; attempt++) {
    // A dialog that opened just after the first wait covers the trigger with its scrim: look before clicking again.
    if (attempt === 2 && await dialog.isVisible().catch(() => false)) { opened = true; break; }
    await trigger.click({ timeout: 5000 }).catch(() => {});
    opened = await dialog.waitFor({ state: "visible", timeout: attempt === 1 ? 4000 : 8000 }).then(() => true).catch(() => false);
    if (opened && attempt === 2) note(w, "the dialog opened on the SECOND click — the first probably landed before hydration");
  }
  if (!opened) {
    const other = await page.locator('[role="dialog"], dialog[open]').count();
    check(w, '"Make payable…" opens a role=alertdialog', false,
      other ? `a role=dialog / <dialog> opened instead (${other}) — the ceremony must be an alertdialog` : "nothing opened within 12 s");
    return;
  }
  check(w, '"Make payable…" opens a role=alertdialog', true);

  const raw = await dialog.innerText();
  const text = flat(raw);
  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  check(w, "the dialog asks for no Gaming Board clearance (Owner ruling 2026-09-27: 50pick's licence covers invite rewards)", !WORDS.boardAsk.test(text),
    (lines.find((l) => WORDS.boardAsk.test(l)) ?? "no line asks for it").slice(0, 140));
  check(w, "the dialog says the rewards land as CASH", /CASH/.test(text),
    (lines.find((l) => /CASH/.test(l)) ?? "no line says CASH").slice(0, 140));
  // ⛔ "withdrawable at once" was not true (addendum H): a player's first withdrawal waits on their identity check.
  check(w, "the CASH effect says a first withdrawal still needs the identity check (KYC at withdrawal) — never 'at once'",
    /withdrawable CASH/i.test(text) && /KYC at withdrawal/i.test(text) && !/withdrawable at once/i.test(text),
    (lines.find((l) => /CASH/.test(l)) ?? "no line says CASH").slice(0, 200));
  const priceLines = lines.filter((l) => /TZS\s*[\d,]+/.test(l));
  const paysLines = lines.filter((l) => /(^|[^a-z])(pays|paid)([^a-z]|$)/i.test(l));
  check(w, "the dialog states a price or what pays", priceLines.length + paysLines.length > 0,
    `${priceLines.length} price line(s): ${priceLines.slice(0, 2).map((l) => l.slice(0, 110)).join(" | ") || "—"} · `
    + `${paysLines.length} pays line(s): ${paysLines.slice(0, 2).map((l) => l.slice(0, 90)).join(" | ") || "—"}`);
  const hole = text.match(/NaN|undefined|TZS(?!\s*[−-]?\d)/);
  check(w, "no money sentence in the dialog has a hole (NaN / undefined / a TZS with no figure)", !hole,
    hole ? `…${text.slice(Math.max(0, hole.index - 50), hole.index + 20)}…` : "");

  // ── "What pays from now" — the default is Nothing yet ─────────────────────────────────────────
  const radios = dialog.getByRole("radio");
  const radioList = await radios.evaluateAll((els) => els.map((e) => {
    const label = e.getAttribute("aria-label") || (e.labels && e.labels.length ? e.labels[0].innerText : "")
      || (e.closest("label") ? e.closest("label").innerText : "") || e.innerText || "(no name)";
    const on = e.checked === true || e.getAttribute("aria-checked") === "true";
    return `${on ? "(•)" : "( )"} ${String(label).replace(/\s+/g, " ").trim().slice(0, 60)}`;
  })).catch(() => []);
  const nothing = dialog.getByRole("radio", { name: WORDS.nothing });
  const asShown = dialog.getByRole("radio", { name: WORDS.asShown });
  const nothingOn = (await nothing.count()) === 1 && await nothing.isChecked().catch(() => false);
  const asShownOn = (await asShown.count()) === 1 && await asShown.isChecked().catch(() => false);
  const anyChoice = radioList.some((r) => r.startsWith("(•)"));
  check(w, '"What pays from now" offers its choices and defaults to "Nothing yet"',
    WORDS.legend.test(text) && nothingOn && !asShownOn,
    `legend ${WORDS.legend.test(text) ? "present" : "MISSING"} · ${radioList.length} radio(s): ${radioList.join(" · ") || "none"}`);

  // ── The fields and the two buttons ─────────────────────────────────────────────────────────────
  let reasonBox = dialog.getByLabel(WORDS.reasonLabel);
  let reasonHow = "by its label";
  if ((await reasonBox.count()) !== 1) { reasonBox = dialog.locator("textarea"); reasonHow = "as the dialog's textarea — its label was NOT found"; }
  let wordBox = dialog.getByLabel(WORDS.wordLabel);
  let wordHow = "by its label";
  if ((await wordBox.count()) !== 1) { wordBox = dialog.getByPlaceholder(WORDS.word, { exact: true }); wordHow = "by its placeholder — its label was NOT found"; }
  const nReason = await reasonBox.count(), nWord = await wordBox.count();
  check(w, "the dialog has one reason field and one typed-words field", nReason === 1 && nWord === 1,
    `reason: ${nReason} (${reasonHow}) · typed words: ${nWord} (${wordHow})`);
  const confirm = dialog.getByRole("button", { name: WORDS.confirm, exact: true });
  // ⚠️ The kit's scrim is a button NAMED "Cancel" with no text; the footer's Cancel is the one with text.
  const cancel = dialog.getByRole("button", { name: WORDS.cancel, exact: true }).filter({ hasText: WORDS.cancel });
  const nConfirm = await confirm.count(), nCancel = await cancel.count();
  check(w, `the dialog has one "${WORDS.confirm}" confirm and a "${WORDS.cancel}"`, nConfirm === 1 && nCancel >= 1,
    `confirm: ${nConfirm} · cancel: ${nCancel}`);

  let typedAll = false;
  let s0, s1, s2, sP, s3, s4, c0, c1;
  if (nReason === 1 && nWord === 1 && nConfirm === 1) {
    const armed = () => confirm.isEnabled();
    const left = async () => {
      const m = flat(await dialog.innerText()).match(WORDS.count);
      return m ? Number(m[1].replace(/,/g, "")) : null;
    };
    /** ⛔ THE ONE WAY THIS DRIVE TYPES — and on production it refuses the full words, whatever it is asked. */
    const fillSafely = async (box, value) => {
      if (!LOCAL && String(value).trim() === WORDS.word) {
        throw new Error(`refused to type "${WORDS.word}" — never on production; the armed state is proven locally (ADMIN_SEED=1)`);
      }
      await box.fill(value, { timeout: 8000 });
    };
    // ⛔ fill() only: no Enter is ever pressed, and Confirm is only ever READ.
    try {
      c0 = await left();
      s0 = await armed();
      await fillSafely(reasonBox, REASON);
      c1 = await left();
      s1 = await armed();
      await fillSafely(wordBox, WORDS.word.toLowerCase());
      s2 = await armed();
      await fillSafely(wordBox, WORD_PARTIAL);
      sP = await armed();
      if (LOCAL) {
        await fillSafely(reasonBox, REASON_SHORT);
        await fillSafely(wordBox, WORDS.word);
        s3 = await armed();
        await fillSafely(reasonBox, REASON);
        s4 = await armed();
      }
      typedAll = true;
    } catch (e) {
      check(w, "the dialog's fields accept typing", false, flat(e?.message ?? e).slice(0, 200));
    }
  }
  if (typedAll) {
    const typed = REASON.trim().length;
    check(w, "Confirm is disabled while the dialog is empty", s0 === false, `enabled=${s0}`);
    check(w, "Confirm stays disabled with a reason only", s1 === false, `enabled=${s1}`);
    check(w, 'Confirm stays disabled with a reason and "make payable" in lower case (the words are not case-folded)', s2 === false, `enabled=${s2}`);
    check(w, `Confirm stays disabled with a reason and a PARTIAL word ("${WORD_PARTIAL}")`, sP === false, `enabled=${sP}`);
    check(w, "the reason carries a live count", c1 !== null && (c0 !== null ? c0 - c1 === typed : c1 === WORDS.reasonMax - typed),
      `"${WORDS.count.source}" read ${c0 ?? "nothing"} before, ${c1 ?? "nothing"} after typing ${typed} characters`);
    if (!LOCAL) {
      skip(w, `the armed state (a reason + ${WORDS.word} + a choice) and the short-reason refusal`,
        "production: the full words are never typed here — a live console one click from paying. Proven locally with ADMIN_SEED=1");
    } else if (radioList.length === 0) {
      skip(w, `the armed state with a reason + ${WORDS.word}`,
        `no "what pays from now" radio was found, so whether a choice is made is unknown — Confirm read enabled=${s4} (never clicked)`);
    } else if (anyChoice) {
      check(w, `Confirm stays disabled with a ${REASON_SHORT.length}-character reason and the right words (the floor is 5)`, s3 === false, `enabled=${s3}`);
      check(w, `Confirm ARMS with a reason + ${WORDS.word} + a choice selected — asserted armed, NEVER clicked`, s4 === true,
        `enabled=${s4}; choice: ${radioList.find((r) => r.startsWith("(•)")) ?? "?"}`);
    } else {
      check(w, `Confirm stays disabled with a reason + ${WORDS.word} but NO "what pays from now" choice selected`, s4 === false,
        `enabled=${s4}; radios: ${radioList.join(" · ") || "none"}`);
    }
    note(w, `dialog screenshots: ${await dialogTiles(page, dialog, w)} tile(s), taken in the last state above (never confirmed)`);
  } else {
    skip(w, "the Confirm arming sequence", "the dialog's reason field, typed-words field or confirm could not be found or typed into — see the checks above");
    note(w, `dialog screenshots: ${await dialogTiles(page, dialog, w)} tile(s)`);
  }

  if (nCancel >= 1) {
    const clicked = await cancel.first().click({ timeout: 8000 }).then(() => "").catch((e) => flat(e?.message ?? e).slice(0, 160));
    const gone = !clicked && await dialogGone(page);
    check(w, "Cancel closes the dialog", gone, clicked ? `Cancel could not be clicked: ${clicked}` : gone ? "" : "the alertdialog is still in the DOM 4 s after Cancel");
  } else {
    skip(w, "Cancel closes the dialog", "no Cancel button with visible text was found");
  }
}

// ── RUN ────────────────────────────────────────────────────────────────────────────────────────────
const health = await inviteRewardsFromHealth();
check("all", "/api/health states whether a player invite is paid (inviteRewards.payable, .paying, .ceiling)", health.ok, health.detail);
note("all", LOCAL ? "LOCAL (ADMIN_SEED=1): the full words are typed once, to prove Confirm arms — then Cancel" : "PRODUCTION: the full words are never typed; Confirm is proven to stay disabled");

const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  let state;
  if (process.env.ADMIN_SEED === "1") {
    const ctx = await b.newContext();
    const r = await ctx.request.post(`${BASE}/api/dev-test/seed-admin`);
    if (!r.ok()) throw new Error(`seed-admin ${r.status()}`);
    state = await ctx.storageState();
    await ctx.close();
  } else {
    state = await loginOnce(b, "admin");
  }

  for (const [w, h] of [[1440, 1000], [390, 844]]) {
    const ctx = await b.newContext({
      storageState: state,
      viewport: { width: w, height: h },
      serviceWorkers: "block",
      ...(w < 500 ? { isMobile: true, hasTouch: true } : {}),
    });
    await ctx.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
    const net = await armSafetyNet(ctx);
    const page = await ctx.newPage();
    const errors = [];
    const nativeDialogs = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // A confirm() is DISMISSED (the safe answer); a leave-page prompt is accepted — leaving writes nothing.
    page.on("dialog", async (d) => {
      nativeDialogs.push(`${d.type()}: ${flat(d.message()).slice(0, 80)}`);
      await (d.type() === "beforeunload" ? d.accept() : d.dismiss()).catch(() => {});
    });
    await page.goto(`${BASE}/admin/affiliate`, { waitUntil: "networkidle" });
    await proveSafetyNet(page, net, w);
    check(w, "stays on /admin/affiliate", /\/admin\/affiliate/.test(page.url()), page.url());
    let body = flat(await page.locator("body").innerText());
    check(w, "not the 2FA setup / sign-in screen", !/provision authenticator|admin sign in/i.test(body));

    // ── THE STATE — the header chip, cross-checked against the server ─────────────────────────────
    const chip = await readChip(page);
    check(w, 'the header chip reads exactly one of "Payable" / "Not payable"', chip.state !== null, chip.detail);
    const cardSays = WORDS.titleOff.test(body) ? "NOT_PAYABLE" : WORDS.titleOn.test(body) ? "PAYABLE" : null;
    if (chip.state && cardSays) {
      check(w, "the header chip and the state card say the same state", chip.state === cardSays, `chip ${chip.state} · card ${cardSays}`);
    }
    const pageState = chip.state ?? cardSays ?? "UNKNOWN";
    if (health.ok) {
      const agrees = health.payable === false
        ? pageState === "NOT_PAYABLE"
        : pageState === "PAYABLE" || (pageState === "NOT_PAYABLE" && WORDS.notes.paused.test(body));
      check(w, "the page agrees with /api/health", agrees,
        `health payable=${health.payable} · page ${pageState}${health.payable && pageState === "NOT_PAYABLE" ? " (a service-level pause must be named)" : ""}`);
      // ⭐ `paying` (a player's invite PAYS) is never true while this card says Not payable.
      check(w, "health's paying is false whenever the card says Not payable", !(health.paying === true && pageState === "NOT_PAYABLE"),
        `health paying=${health.paying} · page ${pageState}`);
    } else {
      skip(w, "the page agrees with /api/health", "the health read failed (see the first check) — the page was measured on its own words only");
    }
    const masterSwitches = await page.locator('[role="switch"][aria-label*="master switch" i]').count();
    const retired = [
      /Unpaid — tracking only/i.test(body) && '"Unpaid — tracking only"',
      /Program master switch/i.test(body) && '"Program master switch" text',
      masterSwitches > 0 && `${masterSwitches} master-switch control(s)`,
      /These three switches are stored, not applied/i.test(body) && 'the "stored, not applied" banner',
    ].filter(Boolean);
    check(w, "the retired page is gone (no \"Unpaid — tracking only\", no master switch, no \"stored, not applied\" banner)",
      retired.length === 0, retired.join(" · "));
    const notesSeen = Object.entries(WORDS.notes).filter(([, re]) => re.test(body)).map(([k]) => k);
    if (notesSeen.length) note(w, `state-card notes on screen: ${notesSeen.join(", ")}`);

    if (pageState === "NOT_PAYABLE") {
      check(w, 'the state card reads "Not payable · Hazilipwi" and "invites are tracked; 50pick pays nothing"',
        WORDS.titleOff.test(body) && WORDS.bodyOff.test(body),
        `title ${WORDS.titleOff.test(body) ? "present" : "MISSING"} · body ${WORDS.bodyOff.test(body) ? "present" : "MISSING"}`);
      const prov = WORDS.provenance.map((re) => body.match(re)?.[0]).find(Boolean);
      check(w, "the state card states its provenance (since / who / why, never switched on, or unreadable)", !!prov,
        prov ?? "none of the four provenance sentences is on the page");
      check(w, "the state card states the enforced 50% cap, and nothing on the page asks for Gaming Board clearance",
        WORDS.terms.test(body) && !WORDS.boardAsk.test(body), body.match(WORDS.boardAsk)?.[0] ?? "");
      check(w, 'the locked caption "Locked — Not payable" is shown', WORDS.lockedCaption.test(body));

      // ── THE LOCK ──────────────────────────────────────────────────────────────────────────────────
      const lock = await auditLock(page);
      check(w, "the three reward toggles exist", lock.toggles.length === 3,
        lock.toggles.map((t) => `${t.label} (${t.on ? "on" : "off"})`).join(" | ") || "none found");
      check(w, "every reward toggle is disabled", lock.toggles.length === 3 && lock.toggles.every((t) => t.native || t.aria),
        lock.toggles.map((t) => `${t.label}=${t.native ? "disabled" : t.aria ? "aria-disabled" : "ENABLED"}`).join(" | "));
      const openChoices = lock.choices.filter((c) => !(c.native || c.aria));
      const ariaOnly = lock.choices.filter((c) => !c.native && c.aria);
      check(w, "every switch on the page, and every choice inside the reward cards, is disabled",
        lock.regions === 3 && openChoices.length === 0,
        `${lock.choices.length} control(s) in ${lock.regions} card region(s); ${ariaOnly.length} only aria-disabled`
        + (openChoices.length ? `; ENABLED: ${openChoices.map((c) => `"${c.name}" (${c.where})`).join(" · ")}` : ""));
      const openFields = lock.fields.filter((f) => !(f.readOnly || f.native));
      const modesOn = lock.toggles.filter((t) => t.on).map((t) => t.label);
      if (lock.fields.length === 0 && modesOn.length === 0) {
        skip(w, "every reward input is read-only", "no input is rendered — every reward mode is off, so there was nothing to lock");
      } else {
        check(w, "every input on the page (the reward settings) is read-only or disabled", lock.fields.length > 0 && openFields.length === 0,
          lock.fields.length === 0
            ? `NO input is rendered although ${modesOn.join(", ")} ${modesOn.length === 1 ? "is" : "are"} on — the locked fields should still show their values`
            : `${lock.fields.length} input(s): ${lock.fields.filter((f) => f.readOnly).length} readOnly, ${lock.fields.filter((f) => !f.readOnly && f.native).length} disabled`
              + (openFields.length ? `; EDITABLE: ${openFields.map((f) => `"${f.name}" (${f.where})`).join(" · ")}` : ""));
      }
      // ⭐ BEHAVIOUR, NOT ONLY AN ATTRIBUTE: a real pointer click on a locked switch must not move it.
      const commission = page.locator('[role="switch"][aria-label="Commission enabled"]');
      if ((await commission.count()) === 1) {
        const before = await commission.getAttribute("aria-checked");
        await commission.click({ force: true, timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(250);
        const after = await commission.getAttribute("aria-checked");
        if (after !== before) { await commission.click({ force: true, timeout: 5000 }).catch(() => {}); await page.waitForTimeout(250); }
        check(w, "a pointer click on the locked Commission toggle changes nothing", after === before,
          `aria-checked ${before} → ${after}${after !== before ? " (clicked again to put it back; nothing was saved)" : ""}`);
      } else {
        skip(w, "a pointer click on the locked Commission toggle changes nothing", "the Commission toggle was not found");
      }
      const saves = await page.getByRole("button", { name: /^\s*save(\s|$)/i }).evaluateAll((els) => els.map((e) => {
        const r = e.getBoundingClientRect();
        return { visible: r.width > 0 && r.height > 0, disabled: e.disabled === true || e.getAttribute("aria-disabled") === "true" };
      }));
      const liveSaves = saves.filter((s) => s.visible && !s.disabled).length;
      check(w, "no enabled Save button", liveSaves === 0, `${saves.length} Save button(s) in the DOM, ${liveSaves} visible and enabled`);
      const dirtyBars = await page.locator('[data-pending-state="dirty"]').count();
      const unsavedWords = await page.getByText("Unsaved changes").evaluateAll((els) =>
        els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }).length);
      check(w, "no pending-changes bar", dirtyBars === 0 && unsavedWords === 0, `dirty bars: ${dirtyBars} · visible "Unsaved changes": ${unsavedWords}`);
      const enabledButtons = await page.evaluate(() =>
        [...document.querySelectorAll("main button, main a[role=button]")]
          .filter((e) => !e.hasAttribute("disabled") && e.getAttribute("aria-disabled") !== "true")
          .map((e) => (e.innerText || e.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim())
          .filter(Boolean));
      const starters = enabledButtons.filter((t) => PAY_STARTER.test(t));
      check(w, 'the only enabled control that offers to start payment is the "Make payable…" ceremony trigger',
        starters.every((t) => WORDS.trigger.test(t)),
        starters.length ? starters.join(" | ") : `none — ${enabledButtons.length} enabled buttons: ${enabledButtons.slice(0, 14).join(" · ")}`);
      const paidTile = body.match(/Paid by 50pick\s*(TZS\s*[\d,]+|[\d,]+\s*TZS|TSh\s*[\d,]+|[\d,]+)/i);
      check(w, '"Paid by 50pick" KPI reads TZS 0', paidTile && /^(TZS|TSh)?\s*0$|^0\s*TZS$/i.test(paidTile[1].trim()), paidTile ? paidTile[0] : "tile not found");
      check(w, 'roster "Invites by player" present', /Invites by player/i.test(body));
    } else {
      skip(w, "the Not payable view, its lock, the KPI and the Make-payable ceremony",
        pageState === "PAYABLE"
          ? `the page says Payable (health: ${health.detail}) — this drive measures the Not payable state; nothing was touched`
          : "neither the header chip nor the state card names a state");
      check(w, "a roster heading is present", /Invites by player|Referral leaderboard/i.test(body));
    }

    note(w, `page screenshots: ${await pageTiles(page, w, h)} tile(s)`);

    if (pageState === "NOT_PAYABLE") {
      // ── THE CEREMONY — the Owner only, and only under the OWNER ceiling ─────────────────────────
      const triggers = page.getByRole("button", { name: WORDS.trigger });
      const nTrig = await triggers.count();
      // ⭐ Stop paying… is offered whenever the STORED record says Payable (review P7) — under the kill, or while
      // paused at service level — and then the card must say which stored position it is stopping. Never clicked.
      const nStop = await page.getByRole("button", { name: WORDS.stopTrigger }).count();
      if (nStop > 0) {
        check(w, 'a "Stop paying…" offered on a Not payable card comes with its reason on the card (the stored position, or the service-level pause)',
          WORDS.notes.stored.test(body) || WORDS.notes.paused.test(body), `notes on screen: ${notesSeen.join(", ") || "none"}`);
      }
      if (health.ok && health.ceiling !== "OWNER") {
        check(w, "the ceiling's own sentence is on the page", health.ceiling === "CLOSED" ? WORDS.notes.closed.test(body) : WORDS.notes.forced.test(body), `ceiling ${health.ceiling}`);
        check(w, 'no "Make payable…" is offered under a closed ceiling', nTrig === 0, `${nTrig} found`);
        skip(w, "the Make-payable ceremony", `the ceiling is ${health.ceiling} — this page cannot turn payment on, so there is no ceremony to open`);
      } else {
        check(w, 'the Owner is offered "Make payable…"', nTrig >= 1,
          nTrig ? `${nTrig} found` : `none — notes on screen: ${notesSeen.join(", ") || "none"} (this drive must run as the Owner)`);
        if (nTrig >= 1) await driveCeremony(page, w, triggers.first());
        else skip(w, "the Make-payable ceremony", 'no "Make payable…" trigger to open');
      }

      // ── AND NOTHING MOVED ──────────────────────────────────────────────────────────────────────
      await page.reload({ waitUntil: "networkidle" });
      body = flat(await page.locator("body").innerText());
      const again = await readChip(page);
      check(w, 'after a reload the header chip still says "Not payable"', again.state === "NOT_PAYABLE" && WORDS.titleOff.test(body), again.detail);
    }

    check(w, "no page errors", errors.length === 0, errors.slice(0, 2).join(" · "));
    check(w, "no native browser dialog (alert / confirm / leave-page) was raised", nativeDialogs.length === 0, nativeDialogs.join(" · "));
    check(w, "⛔ SAFETY NET · no server action was attempted", net.blocked.length === 0 && net.inspected > 0,
      net.blocked.length
        ? `BLOCKED ${net.blocked.length}: ${net.blocked.slice(0, 3).join(" · ")}`
        : `${net.inspected} requests inspected, none carried a server action (the decoy aside)`);
    await ctx.close();
  }
} catch (e) {
  check("all", "the drive ran to the end", false, flat(e?.stack ?? e?.message ?? e).slice(0, 400));
} finally {
  await b.close();
}

if (health.ok) {
  const after = await inviteRewardsFromHealth();
  check("all", "the server reports the same payable and paying state after the drive", after.ok && after.payable === health.payable && after.paying === health.paying,
    `before: ${health.detail} · after: ${after.detail}`);
}

const failed = results.filter((r) => !r.ok);
const passed = results.length - failed.length;
console.log(`\n${passed}/${results.length} passed${failed.length ? " — FAILED: " + failed.map((f) => `[${f.w}] ${f.name}`).join("; ") : ""}`);
if (skipped.length) {
  console.log(`⚠️  ${skipped.length} SKIPPED — NOT measured by this run: ${skipped.map((s) => `[${s.w}] ${s.name} (${s.why})`).join("; ")}`);
}
if (passed === 0) {
  console.log("⛔ 0 passed — a zero-assertion run is a SKIPPED run, never a green one.");
  process.exit(1);
}
process.exit(failed.length ? 1 : 0);
