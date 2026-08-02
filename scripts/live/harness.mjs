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

export async function browser() {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
  return { b, ctx };
}

/**
 * Sign in. `who` is a PERSONA key. Players use /auth/login, staff use /auth/admin —
 * both render the same PhoneInput, so the selector rule is identical.
 */
export async function login(page, who) {
  const p = PERSONA[who];
  if (!p) throw new Error(`unknown persona ${who}`);
  const staff = ["officer", "trading", "growth", "finance", "admin"].includes(who);
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
  await page.fill('input[type="password"]', qaEnv(p.secret));
  await clickByName(page, /sign in|log in|ingia/i);

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
      return isStaff
        ? /back to app|muhtasari|staff · confidential/.test(t)
        : /wallet|pochi|deposit/.test(t) && !/\bsign up\b/.test(t);
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
