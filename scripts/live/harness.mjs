/**
 * LIVE PRODUCTION DRIVE HARNESS — shared by every `scripts/live-*.mjs`.
 *
 * ⚠️ This exists because the campaign kept being lied to by its OWN harness, not by the
 * product. Every helper below encodes a trap that has already cost a false finding:
 *
 *  · `bodyText()` collapses whitespace AND lowercases. Chrome applies `text-transform`,
 *    so a CSS-uppercased eyebrow reads "EMAIL CONFIRMED" while the dictionary says
 *    "Email confirmed" — a case-sensitive `includes()` once reported all seven legs of a
 *    perfect email-verify suite as failures. Never call `innerText` directly.
 *  · `login()` fills `#phone`, the VISIBLE PhoneInput node. `input[name="phone"]` is the
 *    hidden mirror and filling it times out, which reads as a broken login page.
 *    The number is the 9-digit local part — `712000101`, never `0712000101`.
 *  · `clickByName()` asks for a control by its ACCESSIBLE NAME. The kit renders
 *    `<button type="button">` inside forms and submits in JS, so `button[type=submit]`
 *    finds nothing and a working screen looks broken (§4b's withdrawal false alarm).
 *  · ⛔ There is deliberately NO `dismissPrimer()` here. The shared one clicked
 *    Skip/Got it/Close/Maybe later and DISMISSED THE VERY CONFIRMATION the run then went
 *    looking for — reported as "the player is told nothing" on a page that was fine.
 *    If you must clear an overlay, name the exact control and say why.
 *
 * THE RULE THIS FILE SERVES: measure the moment you care about, touch nothing in
 * between, scope the selector, and pair every DOM claim with the state it reflects.
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { LOCAL_STAFF, LOCAL_STAFF_PASSWORD, LOCAL_ADMIN } from "../local-staff.mjs";

export const BASE = process.env.LIVE_BASE ?? "https://50pick.tz";
export const SHOT = process.env.SHOT_DIR ?? ".";

/** The QA personas. Phone is the 9-digit local part; the secret name is the env key. */
export const PERSONA = {
  alpha:    { phone: "712000101", secret: "QA_ALPHA_PASSWORD",    label: "player alpha" },
  echo:     { phone: "712000105", secret: "QA_ECHO_PASSWORD",     label: "player echo" },
  officer:  { phone: "712000106", secret: "QA_OFFICER_PASSWORD",  label: "COMPLIANCE officer" },
  trading:  { phone: "712000104", secret: "QA_TRADING_PASSWORD",  label: "TRADING officer" },
  growth:   { phone: "712000102", secret: "QA_GROWTH_PASSWORD",   label: "GROWTH officer" },
  finance:  { phone: "712000107", secret: "QA_FINANCE_PASSWORD",  label: "FINANCE officer" },
  // ⛔ Ali's own console login. Use ONLY for something genuinely ADMIN-only, and say so
  // in the finding — ADMIN bypasses every domain check, so a sweep run as ADMIN measures
  // nothing about RBAC. NEVER re-mint this password.
  admin:    { phone: "777777777", secret: "QA_ADMIN_PASSWORD",    label: "ADMIN (Ali)" },
};

/**
 * A QA-fleet player, by its two-digit index. `fleet:07` → `+255799000007`.
 *
 * The secret is ONE shared value for the whole fleet, read from `QA_FLEET_PASSWORD` in
 * `.env.qa.local` (falling back to the script's own default) — these are disposable
 * accounts created and destroyed inside a single run, so per-account secrets would be
 * ceremony without safety.
 */
export function fleetPersona(nn) {
  const n = String(nn).padStart(2, "0");
  let secret;
  try { secret = qaEnv("QA_FLEET_PASSWORD"); } catch { secret = "qa-fleet-2026-08-03-Xk7"; }
  // ⚠️ NINE digits. The block is `+2557990000` + NN, so the local part is `7990000` + NN.
  // Writing `799000${n}` yields EIGHT digits, which the form accepts and the server
  // rejects — indistinguishable from a wrong password, and it cost a diagnosis once.
  const phone = `7990000${n}`;
  if (phone.length !== 9) throw new Error(`fleet phone must be 9 digits, got "${phone}"`);
  return { phone, secretValue: secret, label: `QA Fleet ${n}` };
}

/**
 * A LOCAL staff fixture, by role — `local:AUDITOR` → `+255700000014`.
 *
 * ⭐ WHY THESE EXIST AT ALL, MEASURED 2026-08-11 (`scripts/live/ops/rbac-census.cjs`):
 * **AUDITOR and SUPPORT hold no account on production**, and `.env.qa.local` carries no
 * persona for either. So a role sweep limited to the existing identities cannot exercise
 * 2 of the 7 staff roles, and would report a clean matrix having never touched a third of
 * it — the two-personas blindness, one layer up.
 *
 * ⛔ LOCALHOST ONLY. `seed-staff-local.mts` refuses any non-localhost DATABASE_URL, so
 * these rows cannot exist on production; signing in as one against BASE=production would
 * simply fail. They are never a way to reach the live console.
 */
export function localStaffPersona(role) {
  // ⭐ `local:ADMIN` IS THE OWNER FIXTURE from `seed-admin-local.mts`, routed through the same
  // `login()` as everyone else. A driver that hand-rolled its own Owner sign-in reproduced the
  // exact trap this file's predicate exists to prevent: it waited for
  // `/staff · confidential/`, which the ADMIN SIGN-IN PAGE also renders, so it declared
  // success on the login form and then reported seven "the Owner cannot view this page"
  // failures over a perfectly working console. One login implementation, always.
  if (role === "ADMIN") {
    return { phone: LOCAL_ADMIN.phone, secretValue: LOCAL_ADMIN.password, label: "local ADMIN (Owner)" };
  }
  const phone = LOCAL_STAFF[role];
  if (!phone) throw new Error(`unknown local staff role "${role}" — have ADMIN, ${Object.keys(LOCAL_STAFF).join(", ")}`);
  return { phone, secretValue: LOCAL_STAFF_PASSWORD, label: `local ${role}` };
}

export function qaEnv(name) {
  const txt = readFileSync(new URL("../../.env.qa.local", import.meta.url), "utf8");
  const m = txt.match(new RegExp(`^${name}\\s*=\\s*(.+)$`, "m"));
  if (!m) throw new Error(`${name} missing from .env.qa.local`);
  return m[1].trim().replace(/^["']|["']$/g, "");
}

/** Collapsed, LOWERCASED body text. Compare against lowercase literals only. */
export const bodyText = async (page) =>
  (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ").toLowerCase();

/** A tiny check recorder, so every driver reports the same way. */
export function recorder(title) {
  let pass = 0; const fails = [];
  console.log(`\n${title}\n`);
  return {
    check(name, ok, detail = "") {
      if (ok) { pass++; console.log(`  ok   ${name}`); }
      else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
      return ok;
    },
    note: (m) => console.log(`    ${m}`),
    done() {
      console.log(`\n${pass} passed, ${fails.length} failed\n`);
      for (const f of fails) console.log(`  · ${f}`);
      return fails.length;
    },
    get passed() { return pass; },
    get failed() { return fails.length; },
  };
}

/**
 * `opts.permissions` grants browser permissions for BASE's origin.
 * `opts.headless: false` opens a real window.
 *
 * ⚠️ NOTIFICATIONS CANNOT BE GRANTED HEADLESS. Measured, not assumed: in headless
 * Chromium `Notification.permission` stays `"denied"` even after `grantPermissions`,
 * while `PushManager` and `serviceWorker` are both present. The push opt-in reads that
 * property, so headless renders "notifications are blocked in your browser settings" —
 * a HARNESS state that photographs exactly like a broken feature. The same probe in
 * headed mode returns `"granted"`. Anything that tests the push opt-in must run headed.
 */
export async function browser(opts = {}) {
  // QA_CHROMIUM_PATH — sandboxes whose pinned headless-shell is missing point this
  // at any real chromium binary (same escape hatch qa:live carries).
  const b = await chromium.launch({
    headless: opts.headless !== false,
    args: ["--no-sandbox"],
    ...(process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {}),
  });
  const ctx = await b.newContext({ viewport: opts.viewport ?? { width: 1440, height: 1000 } });
  if (opts.permissions?.length) await ctx.grantPermissions(opts.permissions, { origin: BASE });
  return { b, ctx };
}

/**
 * ⭐ SIGN IN **ONCE** AND REUSE THE SESSION — for any driver that sweeps a MATRIX.
 *
 *   const state = await loginOnce(browser, "fleet:07");
 *   const ctx = await browser.newContext({ storageState: state, ...perCellOptions });
 *
 * 🔴 WHY, MEASURED 2026-08-07 (ATOM A). A 36-cell probe (3 gates × 4 widths × 3 locales)
 * that called `login()` in every cell got **22 passes and 14 failures**, and every failure
 * was `login failed` on a cell whose *product* behaviour was fine. The failures clustered
 * in the LATER cells across all three locales — i.e. after a dozen-odd successful
 * sign-ins to the same account inside a few minutes, the server stops accepting them and
 * bounces to the signed-out home page, which `login()`'s own comment already warns *"looks
 * exactly like a wrong password, and it is not one."*
 *
 * ⛔ IT IS NOT WIDTH-DEPENDENT, AND THAT WAS THE FIRST GUESS. The obvious suspect was
 * `clickByName`'s page-wide `.first()` grabbing the header's "Sign in" pill at ≥768 where
 * the nav is not collapsed — the same shape as a trap already recorded in §6b. **Measured
 * instead of assumed: `getByRole("button", …)` resolves to exactly ONE control at 360 and
 * at 1280**, the form's `type=submit`; the three matching anchors are links and carry no
 * button role. The guess was wrong and the measurement took two minutes.
 *
 * ⭐ So the fix is not a retry, it is not signing in 36 times. One sign-in, one saved
 * state, N contexts — which is also ~30× faster and is the standard Playwright pattern.
 * ⚠️ The `kp-locale` cookie is STRIPPED from the returned state on purpose: a matrix sets
 * its own per cell, and a leftover cookie from the login context would silently pin every
 * cell to the language the sign-in happened in — E-106's defect, one layer down.
 */
export async function loginOnce(b, who) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  try {
    await login(page, who);
    const state = await ctx.storageState();
    state.cookies = state.cookies.filter((c) => c.name !== "kp-locale");
    return state;
  } finally {
    await ctx.close();
  }
}

/**
 * Sign in. `who` is a PERSONA key. Players use /auth/login, staff use /auth/admin —
 * both render the same PhoneInput, so the selector rule is identical.
 *
 * ⚠️ For a MATRIX of cells use `loginOnce()` above — calling this per cell trips the
 * server's attempt limiting partway through and reports product failures that are not.
 */
export async function login(page, who) {
  // `who` is a PERSONA key, OR `fleet:NN` for a QA-fleet player (see
  // `scripts/ops-qa-fleet.mts`). The fleet is 30 tagged accounts on a reserved phone
  // block sharing one secret — enumerating them in PERSONA would be 30 lines of
  // near-identical noise that drifts the moment the fleet is resized.
  const p = typeof who === "string" && who.startsWith("fleet:")
    ? fleetPersona(who.slice(6))
    : typeof who === "string" && who.startsWith("local:")
    ? localStaffPersona(who.slice(6))
    : PERSONA[who];
  if (!p) throw new Error(`unknown persona ${who}`);
  // ⚠️ `local:*` are STAFF and must go to /auth/admin. Omitting them here would send a
  // staff account to the PLAYER form, which renders `#identifier` rather than `#phone`
  // and lands on the player shell — the sign-in "succeeds" and the driver then measures
  // the wrong surface entirely.
  const staff = ["officer", "trading", "growth", "finance", "admin"].includes(who)
    || (typeof who === "string" && who.startsWith("local:"));
  // 🔴 `networkidle`, NOT `domcontentloaded`. PhoneInput is a React component that mirrors
  // the visible field into a hidden input on change. Fill it before hydration and the DOM
  // value is set but no React onChange fires, so the HIDDEN mirror stays EMPTY and the form
  // posts a blank identifier — the server rejects it and you land back on the signed-out
  // home page. That looks exactly like a wrong password, and it is not one. The assertion
  // below makes the difference visible instead of leaving it to be re-diagnosed.
  await page.goto(`${BASE}${staff ? "/auth/admin" : "/auth/login"}`, { waitUntil: "networkidle" });
  // ⚠️ TWO DIFFERENT IDS for the same PhoneInput: staff `/auth/admin` renders `#phone`,
  // player `/auth/login` renders `#identifier` (it also accepts an email). BOTH mirror into
  // a hidden input of the same name — fill the hidden one and it times out, which reads as
  // a broken login page on a page that is fine. Ask for whichever visible node is present.
  const field = (await page.locator("#phone").count()) ? "#phone" : "#identifier";
  await page.fill(field, p.phone);                       // the VISIBLE node, 9 digits

  // Prove the mirror synced before submitting — otherwise the failure surfaces much later
  // as an unexplained "wrong password" and costs a diagnosis every time.
  const mirror = field.slice(1);                         // "phone" | "identifier"
  const synced = await page.locator(`input[name="${mirror}"]`).inputValue().catch(() => "");
  if (synced !== p.phone) {
    throw new Error(
      `PhoneInput did not sync: visible ${field}="${p.phone}" but hidden ` +
      `input[name=${mirror}]="${synced}". The page was filled before React hydrated.`,
    );
  }
  // Personas name an env key (`p.secret`); fleet players carry the value directly.
  await page.fill('input[type="password"]', p.secretValue ?? qaEnv(p.secret));
  // 🔴 THE CHINESE BUTTON WAS NEVER IN THIS PATTERN, so no driver could sign in as a ZH user —
  // found 2026-08-06 the first time a run set `kp-locale` BEFORE logging in (which E-106's fix
  // makes the natural order). The button reads **登录**; `/sign in|log in|ingia/i` misses it and
  // the run dies on a 20s wait that looks like a broken login page. ⚠️ `退出登录` (sign OUT)
  // contains `登录`, so the negative lookbehind keeps this from ever matching the wrong control.
  await clickByName(page, /sign in|log in|ingia|(?<!退出)登录/i);

  // 🔴 WAIT FOR A POSITIVE SIGNAL, never for the absence of a negative one.
  // This used to `waitForLoadState("networkidle")` and then fail if the text still said
  // "sign in" — which reported a PERFECTLY GOOD login as broken, because it read the page
  // mid-redirect while the signed-out shell was still mounted. A successful sign-in lands
  // on `/?welcome=back` (player) or the console (staff) and shows an authenticated chrome
  // item; that is the thing to wait for.
  const ok = await page.waitForFunction(
    (isStaff) => {
      const t = document.body.innerText.toLowerCase();
      if (/invalid|incorrect|too many attempts|locked/.test(t)) return "bad";
      // 🔴 THE SIGNAL MUST NOT EXIST IN THE FAILURE STATE. This once tested
      // `/overview|muhtasari|admin/` for staff — and "admin" appears in the words
      // "Admin sign in", the heading of the page you are on when login FAILS. So a
      // failed sign-in was scored as a success, and a later run then asserted six
      // things about the finance console against a screenshot of the LOGIN FORM and
      // reported them all green. Anchor on the authenticated shell, and explicitly
      // exclude the sign-in page.
      if (/admin sign in|kuingia kwa wafanyakazi|i'm a player, not staff/.test(t)) return false;
      // 🔴 AND THE SIGNAL MUST EXIST IN EVERY LANGUAGE THE APP SHIPS. Found 2026-08-06: with
      // `kp-locale=zh` set BEFORE signing in — which is the natural order once E-106 made the
      // cookie the mechanism — the login SUCCEEDED and this predicate returned false, because
      // `wallet|pochi|deposit` has no Chinese member. The run then threw "login failed" while
      // its own error text showed a plainly authenticated Chinese page (`请为账户添加邮箱地址`,
      // `直播`, `预测了`). ⛔ A trilingual product needs trilingual signals, or every ZH driver
      // reports a working sign-in as broken. `钱包` = wallet · `充值` = deposit ·
      // `返回应用` = back to app.
      if (/管理员登录|我是玩家/.test(document.body.innerText)) return false;   // the ZH sign-in page
      return isStaff
        ? /back to app|muhtasari|staff · confidential/.test(t) || /返回应用|内部机密/.test(document.body.innerText)
        : (/wallet|pochi|deposit/.test(t) || /钱包|充值/.test(document.body.innerText)) && !/\bsign up\b/.test(t);
    },
    staff,
    { timeout: 45_000 },
  ).then((h) => h.jsonValue()).catch(() => false);

  if (ok === "bad" || !ok) {
    throw new Error(`login failed for ${who} (${p.label}): ${(await bodyText(page)).slice(0, 200)}`);
  }
  return p;
}

/** Click a control by what it IS — its accessible name — never by tag or type. */
export async function clickByName(page, name, opts = {}) {
  const el = page.getByRole("button", { name }).first();
  await el.waitFor({ state: "visible", timeout: opts.timeout ?? 20_000 });
  await el.click();
  return el;
}

export async function shot(page, name) {
  await page.screenshot({ path: `${SHOT}/${name}.png`, fullPage: true }).catch(() => {});
  return `${name}.png`;
}

/** Poll a predicate against the live DOM. Returns true if it ever held. */
export async function waitForText(page, re, timeoutMs = 120_000) {
  try {
    await page.waitForFunction((src) => new RegExp(src, "i").test(document.body.innerText),
      re.source, { timeout: timeoutMs });
    return true;
  } catch { return false; }
}

/**
 * TEXT THAT IS ACTUALLY BEING CUT OFF INSIDE A CARD — measured, with the budget in px.
 *
 * ⛔ WHY THIS IS A SHARED HELPER AND NOT A ONE-LINER PER SCRIPT. Clipping INSIDE a card never
 * reaches `document.scrollWidth`, so no page-level overflow check can see it — that is how the
 * Up & Down trust line shipped reading "Live metals market · quoted 17:5…". But the naive test
 * (`scrollWidth > clientWidth`) is a GUARD THAT CRIES WOLF: on the market page it reported
 *     "Pool-share payout. Your exact …"   box 1px < content 415px
 * which is a screen-reader-only node (`sr-only` is a 1px clipped box, by design) and not a
 * defect at all. Four false positives in every one of twelve cells is how a real finding stops
 * being read.
 *
 * So the definition here is the honest one — text is CLIPPED only when the box is too small
 * AND the element is actually hiding the overflow:
 *   · `overflow-x` is hidden/clip/auto/scroll, or `text-overflow: ellipsis` — otherwise the
 *     text simply spills and is still legible (a different defect, if it is one at all);
 *   · the box is a real, painted box (≥ 12px wide and ≥ 6px tall), which excludes `sr-only`;
 *   · the element is a leaf, so a scrolling container is not reported for its children.
 *
 * ⚠️ A WRAP satisfies `scrollWidth === clientWidth` exactly as a fit does, so this finds
 * truncation, never a line that merely wrapped. Report the px budget, never just a verdict.
 */
export async function measureClipping(page, scope = "main") {
  return page.evaluate((sel) => {
    const out = [];
    const root = document.querySelector(sel) ?? document.body;
    for (const el of root.querySelectorAll("*")) {
      if (el.children.length) continue;                       // leaves only
      const text = (el.textContent || "").trim();
      if (!text) continue;
      const w = el.clientWidth, h = el.clientHeight;
      if (w < 12 || h < 6) continue;                           // sr-only and hairlines
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;
      const hides = /hidden|clip|auto|scroll/.test(cs.overflowX) || cs.textOverflow === "ellipsis";
      if (!hides) continue;                                    // it spills, it does not clip
      if (el.scrollWidth > w + 1) {
        out.push({ text: text.slice(0, 44), box: w, content: el.scrollWidth, over: el.scrollWidth - w });
      }
    }
    return out.slice(0, 8);
  }, scope);
}

/** One-line rendering of `measureClipping`, with the px budget spelled out. */
export function describeClipping(list) {
  return list.map((c) => `"${c.text}" box ${c.box}px < content ${c.content}px (over by ${c.over}px)`).join(" · ");
}
