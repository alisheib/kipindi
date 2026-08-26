/**
 * MINT THE TWO PERSONAS RULING D5 REQUIRES — `SUPPORT` and `AUDITOR`, on production.
 *
 *   node scripts/live-mint-read-tier-personas.mjs
 *
 * ⛔ WHY THIS EXISTS AT ALL. `docs/READ-TIERS.md` §4 called D5 a HARD BLOCKER: AUDITOR and SUPPORT
 * hold no account on production, so unit K's acceptance — "prove it by refusal" — cannot run,
 * because a refusal test needs a session that is actually refused. §4a ruled that this is not a
 * wall but a STATE TO CREATE. Measured before writing this: SUPPORT 0 accounts, AUDITOR 0.
 *
 * ⭐ IT DRIVES THE REAL FLOW, NOT THE DATABASE. A row inserted with role='SUPPORT' would prove
 * nothing about the product: it would skip registration, skip the Owner's promotion, and skip the
 * audit trail the Board reads. So each persona is REGISTERED through the real sign-up form and
 * then PROMOTED through `/admin/staff` by a real ADMIN session, with a reason, exactly as a real
 * hire would be. The role change is then read back from the database — the render is not the proof.
 *
 * ⛔ THE PASSWORDS GO STRAIGHT INTO `.env.qa.local` AND ARE NEVER PRINTED. That file is gitignored
 * (`.gitignore:9`). This script prints only the KEY NAMES. A credential that reaches stdout reaches
 * a terminal scrollback, a CI log and a session transcript — and this operation has already paid
 * once for a secret quoted inside the record that described it.
 *
 * ⚠️ IT IS SAFE TO RE-RUN. An existing account is not re-registered and an account already holding
 * the target role is not re-promoted; both are reported as already-done rather than as failures.
 * ⛔ But re-running DOES mint a fresh password for a persona whose password is missing from
 * `.env.qa.local`, which would invalidate the copy on any other machine — the same two-laptop trap
 * §1 documents. Copy the file, do not re-run.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { createRequire } from "node:module";
import { BASE, browser, loginOnce } from "./live/harness.mjs";

const require = createRequire(import.meta.url);
const REPO = process.env.KP_REPO ?? "F:/kipindi-main";
const ENV_FILE = join(REPO, ".env.qa.local");

/** The two personas. ⚠️ Named so they can never be mistaken for a real hire. */
const PERSONAS = [
  { key: "support", phone: "712000108", role: "SUPPORT", envKey: "QA_SUPPORT_PASSWORD",
    email: "qa.support@50pick.test",
    reason: "QA instrument for READ_TIERS unit K — proves the tier by refusal" },
  { key: "auditor", phone: "712000109", role: "AUDITOR", envKey: "QA_AUDITOR_PASSWORD",
    email: "qa.auditor@50pick.test",
    reason: "QA instrument for READ_TIERS unit K — the second row, so the matrix is not proven at one" },
];

let pass = 0, fail = 0;
const ok = (label, cond, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};

// ── the live database, through the committed ops env ────────────────────────────
function db() {
  const { Client } = require(join(REPO, "node_modules", "pg"));
  const envPath = join(REPO, "scripts/live/ops/.env");
  if (!existsSync(envPath)) {
    throw new Error("scripts/live/ops/.env missing — run: railway run -s 50pick -- node scripts/live/ops/mkenv.cjs");
  }
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
  }
  return new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
}

async function roleOf(client, phoneE164) {
  const r = await client.query('select id, role from "User" where "phoneE164" = $1', [phoneE164]);
  return r.rows[0] ?? null;
}

/** Read/merge `.env.qa.local` BY KEY NAME, never rewriting the whole file from memory. */
function upsertEnvKey(key, value) {
  const existing = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
  const eol = existing.includes("\r\n") ? "\r\n" : "\n";
  const lines = existing.split(/\r?\n/);
  const i = lines.findIndex((l) => l.startsWith(`${key}=`));
  if (i >= 0) lines[i] = `${key}=${value}`;
  else {
    if (lines.length && lines[lines.length - 1] === "") lines.splice(lines.length - 1, 0, `${key}=${value}`);
    else lines.push(`${key}=${value}`);
  }
  writeFileSync(ENV_FILE, lines.join(eol), "utf8");
}

function hasEnvKey(key) {
  if (!existsSync(ENV_FILE)) return false;
  return new RegExp(`^${key}=.+$`, "m").test(readFileSync(ENV_FILE, "utf8"));
}

/** A password the driver chooses, meeting the platform's rules without being guessable. */
function mintPassword() {
  return `Qa${randomBytes(12).toString("base64url")}#7z`;
}

const client = db();
await client.connect();
const { b } = await browser();

try {
  // ── 0 · the measurement that justifies the whole script ──────────────────────
  const before = await client.query(
    `select role, count(*)::int as n from "User" where role in ('SUPPORT','AUDITOR') group by role`,
  );
  const beforeMap = Object.fromEntries(before.rows.map((r) => [r.role, r.n]));
  console.log(`   before: SUPPORT=${beforeMap.SUPPORT ?? 0} AUDITOR=${beforeMap.AUDITOR ?? 0}`);

  for (const p of PERSONAS) {
    const e164 = `+255${p.phone}`;

    // ── 1 · REGISTER through the real form, if the account does not exist ──────
    let row = await roleOf(client, e164);
    if (!row) {
      const password = mintPassword();
      const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/auth/register`, { waitUntil: "networkidle", timeout: 90_000 });
      await page.fill("#phone", p.phone);
      // ⚠️ REQUIRED. A .test address on purpose: these personas never need to receive mail, and a
      // deliverable address would put QA traffic into a real inbox.
      await page.fill("#email", p.email);
      // ⛔ DATE OF BIRTH IS A COMPOSITE CONTROL WITH A HIDDEN MIRROR — the same shape as
      // PhoneInput, and the same trap. `input[name="dob"]` is the HIDDEN field; writing to it
      // directly sets no React state, so the mirror is re-derived EMPTY on submit and the form
      // silently stays put. ⚠️ And `#dob` is not the control either — it is the DAY box.
      // The three real inputs carry accessible names, so ask for them that way.
      await page.getByLabel("Day", { exact: true }).fill("01");
      await page.getByLabel("Month", { exact: true }).fill("01");
      await page.getByLabel("Year", { exact: true }).fill("1990");
      // ⭐ Prove the mirror actually took the value, rather than trusting the three fills.
      const dobMirror = await page.inputValue('input[name="dob"]');
      if (!dobMirror) throw new Error("dob mirror is still empty after filling Day/Month/Year");
      await page.fill('input[name="password"]', password);
      await page.fill('input[name="passwordConfirm"]', password);
      await page.check('input[name="acceptAge"]', { force: true });
      await page.check('input[name="acceptTerms"]', { force: true });
      await Promise.all([
        page.waitForURL((u) => !u.pathname.includes("/auth/register"), { timeout: 30_000 }).catch(() => {}),
        page.locator('button[type="submit"]').click(),
      ]);
      const landed = !page.url().includes("/auth/register");
      // ⛔ Report the FORM'S refusal, not 160 characters of whatever page we ended on. The first
      // run printed the public markets board and said nothing about the missing email field.
      const bodyText = await page.evaluate(() => {
        const alerts = Array.from(document.querySelectorAll('[role="alert"]')).map((e) => (e.innerText || "").trim());
        if (alerts.length) return alerts.join(" | ").slice(0, 200);
        const m = (document.body.innerText.match(/Required[^.]*\./g) || []).slice(0, 3);
        return (m.join(" | ") || `url=${location.href}`).slice(0, 200);
      });
      await ctx.close();
      ok(`1 · ${p.key}: registered through the REAL sign-up form`, landed, landed ? e164 : bodyText);
      if (!landed) continue;
      // ⛔ Written before the promotion, so a crash between the two still leaves a usable account.
      upsertEnvKey(p.envKey, password);
      console.log(`   wrote ${p.envKey} to .env.qa.local (value not printed)`);
      row = await roleOf(client, e164);
    } else {
      ok(`1 · ${p.key}: account already exists — not re-registered`, true, `${row.id} role=${row.role}`);
      if (!hasEnvKey(p.envKey)) {
        console.log(`   ⚠️  ${p.envKey} is MISSING from .env.qa.local and this script will not mint a`);
        console.log(`      new one for an existing account — that would invalidate another machine's copy.`);
        console.log(`      Use: npx tsx scripts/ops-reset-password.mts (the real reset flow).`);
      }
    }

    // ── 2 · PROMOTE through /admin/staff, as a real ADMIN, with a reason ───────
    if (row?.role === p.role) {
      ok(`2 · ${p.key}: already holds ${p.role} — not re-promoted`, true, row.id);
    } else {
      const state = await loginOnce(b, "admin");
      const ctx = await b.newContext({ storageState: state, viewport: { width: 1440, height: 1000 } });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/admin/staff`, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await page.waitForTimeout(2_500);
      await page.fill('input[name="phone"]', e164);
      // The role Select is the kit combobox — ask it by its ACCESSIBLE NAME (E-225).
      const role = page.getByRole("combobox", { name: "Role" }).last();
      await role.click();
      await page.waitForTimeout(600);
      await page.click(`[role="listbox"] [role="option"]:has-text("${p.role}")`, { timeout: 10_000 }).catch(async () => {
        // The list shows human labels; fall back to matching the option whose text contains the role word.
        const opts = await page.$$('[role="listbox"] [role="option"]');
        for (const o of opts) {
          const t = ((await o.innerText()) || "").toUpperCase();
          if (t.includes(p.role)) { await o.click(); return; }
        }
        throw new Error(`no option matching ${p.role}`);
      });
      await page.fill('input[name="reason"]', p.reason);

      // ⛔ THE SUBMIT DOES NOT PROMOTE — IT OPENS A CONFIRMATION. `onSubmit` calls
      // `setConfirming(true)`; the action only runs from the modal's `onConfirm`. The first run
      // clicked submit, waited, and reported "db says role=PLAYER" — the product was refusing
      // nothing, it was waiting for a confirmation nobody gave. ⚠️ And the modal's confirm
      // carries the SAME label as the form's button, so the click MUST be scoped to the dialog
      // or it re-clicks submit and reopens the modal for ever.
      await page.click('button[type="submit"]:has-text("Add as staff")');
      // ⚠️ The kit's ConfirmModal renders role="alertdialog", not "dialog" — asked of the page,
      // not assumed. A wrong ARIA role here times out for 15s and reads as a broken product.
      const dialog = page.locator('[role="alertdialog"]');
      await dialog.waitFor({ state: "visible", timeout: 15_000 });
      await dialog.getByRole("button", { name: "Add as staff" }).click();
      await page.waitForTimeout(6_000);
      await ctx.close();

      // ⛔ THE DATABASE IS THE PROOF, NOT THE TOAST.
      row = await roleOf(client, e164);
      ok(`2 · ${p.key}: promoted to ${p.role} through /admin/staff by a real ADMIN session`,
         row?.role === p.role, `db says role=${row?.role ?? "no account"}`);
    }

    // ── 3 · THE AUDIT TRAIL EXISTS ────────────────────────────────────────────
    if (row) {
      const a = await client.query(
        `select action, "createdAt"::text as at from "AuditLog"
          where "targetId" = $1 and action like 'staff%' order by "createdAt" desc limit 1`,
        [row.id],
      );
      ok(`3 · ${p.key}: the promotion left an audit row the Board can read`,
         a.rowCount > 0, a.rows[0] ? `${a.rows[0].action} @ ${a.rows[0].at}` : "no staff.* audit row");
    }
  }

  // ── 4 · THE CENSUS MOVED ────────────────────────────────────────────────────
  const after = await client.query(
    `select role, count(*)::int as n from "User" where role in ('SUPPORT','AUDITOR') group by role`,
  );
  const afterMap = Object.fromEntries(after.rows.map((r) => [r.role, r.n]));
  ok("4 · ⭐ D5 is no longer a blocker — both roles now hold an account on production",
     (afterMap.SUPPORT ?? 0) >= 1 && (afterMap.AUDITOR ?? 0) >= 1,
     `SUPPORT ${beforeMap.SUPPORT ?? 0}→${afterMap.SUPPORT ?? 0} · AUDITOR ${beforeMap.AUDITOR ?? 0}→${afterMap.AUDITOR ?? 0}`);

  // ⭐ POSITIVE CONTROL: the personas must hold EXACTLY the role asked for and no more.
  const over = await client.query(
    `select "phoneE164", role from "User" where "phoneE164" = ANY($1) and role not in ('SUPPORT','AUDITOR')`,
    [PERSONAS.map((p) => `+255${p.phone}`)],
  );
  ok("4 · ⭐ …and neither persona acquired a role it was not granted",
     over.rowCount === 0, over.rows.map((r) => `${r.phoneE164}=${r.role}`).join(", ") || "none");
} catch (err) {
  fail++;
  console.log(`FAIL driver threw — ${err?.message ?? err}`);
} finally {
  await b.close();
  await client.end();
}

console.log(`\nmint-read-tier-personas: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
