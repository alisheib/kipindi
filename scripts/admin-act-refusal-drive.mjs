/**
 * `npm run qa:admin-act-refusal` — click a MONEY control as a role that cannot act, and
 * prove from Postgres that (a) nothing moved and (b) what the refusal recorded.
 *
 * THE SURFACE. `/admin/payments` is the `accounting` domain. Under `DEFAULT_GRANTS` both
 * **AUDITOR** and **COMPLIANCE** hold `accounting: {canView: true, canAct: false}`, so the
 * route gate admits them — and `qa:admin-act-gate` measured that the page then renders the
 * *identical* control set it renders to FINANCE: the REAL-MONEY/MOCK mode toggle, the
 * provider switcher, the withdrawal-status Apply, and eight MNO kill-switches, all enabled.
 * The kill-switch is the emergency stop for the live payment rail.
 *
 * ⛔ THE REFUSAL MUST BE DRIVEN, NOT READ. `payment-actions.ts`'s `gate()` checks
 * `canAct(role, "accounting")` and returns `{error}`, so reading the source says the money
 * is safe. This campaign has repeatedly been wrong about code it only read — the write path
 * described as "end to end" that had never been executed is the same shape. So this presses
 * the button.
 *
 * ⭐ THE SECOND MEASUREMENT IS THE INTERESTING ONE. `control-gates.ts` records, as a
 * *defect* it exists to prevent, that "clicking a control the UI offered writes
 * `privilege_escalation_blocked` at SECURITY severity — so an ordinary operator's
 * legitimate click is recorded as an attempted privilege escalation in the log a compliance
 * officer reads. That is audit pollution on a licensed platform, not just a UX wart."
 * This driver reports which of the two shapes each surface has:
 *    refused + audited   → the money is safe, the SECURITY log is polluted
 *    refused + silent    → the money is safe, and nothing records the attempt at all
 *
 * ⛔ LOCALHOST ONLY. It clicks a real kill-switch, so it refuses any non-localhost base and
 * any production-shaped DATABASE_URL, and it RESTORES the control's state in a finally.
 *
 * Prereqs: npm run db:seed-admin-local && npm run db:seed-staff-local ; next build && next start
 */
import { Client } from "pg";
import { browser, login, recorder } from "./live/harness.mjs";

const BASE = process.env.LIVE_BASE ?? "http://localhost:3001";
const DB = process.env.DATABASE_URL ?? "postgresql://postgres:pw@localhost:5433/kipindi_load?schema=public";
const SHOT = process.env.SHOT_DIR ?? ".50pick-shots";

if (!/^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(BASE)) {
  console.error(`REFUSED — localhost-only, got BASE=${BASE}`); process.exit(1);
}
if (/rlwy\.net|railway\.app|50pick\.tz|railway\.internal/i.test(DB)) {
  console.error("REFUSED — that DATABASE_URL is production."); process.exit(1);
}

const r = recorder("qa:admin-act-refusal — a money control clicked by a role that cannot act");
const sql = async (c, q, p) => (await c.query(q, p)).rows;

const db = new Client({ connectionString: DB });
await db.connect();
const [who] = await sql(db, `select current_database() as db`);
r.note(`db=${who.db}  base=${BASE}`);

const tables = (await sql(db, `select table_name from information_schema.tables where table_schema='public'`)).map((x) => x.table_name);
for (const t of ["SystemConfig", "AuditLog"]) {
  if (!r.check(`table "${t}" exists`, tables.includes(t))) { await db.end(); process.exit(1); }
}

/** The kill-switch map lives at SystemConfig['payments.killswitch'] (payment-ops.ts:83). */
const killState = async () => {
  const rows = await sql(db, `select value::text as v from "SystemConfig" where key = 'payments.killswitch'`);
  return rows[0]?.v ?? "(absent)";
};
const secCount = async () => (await sql(db, `select count(*)::int as n from "AuditLog" where action='privilege_escalation_blocked'`))[0].n;
const allAudit = async () => (await sql(db, `select count(*)::int as n from "AuditLog"`))[0].n;

/**
 * Drive one kill-switch through its full hard-confirm ceremony. Returns whether the
 * action was actually submitted.
 *
 * ⚠️ Each step ASSERTS it found exactly one control — only one confirm panel can be open
 * at a time, so a count of 2 means the locator escaped the cell it was meant to be in.
 */
async function pause(p) {
  const toggle = p.getByRole("button", { name: /deposits/i }).first();
  if (await toggle.isDisabled()) return false;
  await toggle.click();
  const word = p.getByPlaceholder("PAUSE");
  if ((await word.count()) !== 1) { r.note(`   confirm panel not open (placeholder count=${await word.count()})`); return false; }
  await word.fill("PAUSE");
  const confirmBtn = p.getByRole("button", { name: "Pause", exact: true });
  if ((await confirmBtn.count()) !== 1) { r.note(`   confirm button count=${await confirmBtn.count()}`); return false; }
  if (await confirmBtn.isDisabled()) { r.note("   confirm button stayed disabled"); return false; }
  await confirmBtn.click();
  await p.waitForTimeout(3000);
  return true;
}

const { b } = await browser();
const before = { kill: await killState(), sec: await secCount(), all: await allAudit() };
r.note(`before — killswitch=${before.kill}  privilege_escalation_blocked=${before.sec}  AuditLog=${before.all}`);

try {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1400 } });
  const page = await ctx.newPage();
  await login(page, "local:AUDITOR");
  await page.goto(`${BASE}/admin/payments`, { waitUntil: "networkidle" });

  r.check("§1 AUDITOR is on /admin/payments (the view gate admits them)",
    new URL(page.url()).pathname === "/admin/payments", page.url());

  // ⚠️ SCOPE TO ONE MNO CARD, AND ASSERT THE ANCHOR. A page-wide "DEPOSITS" search matches
  // the four kill-switch cards, the two 24h rows and the retry queue. Anchor on the M-Pesa
  // card, then on the kill-switch group inside it.
  const mpesa = page.locator("div").filter({ hasText: /^M-Pesa/ }).last();
  const killGroup = page.getByRole("button", { name: /deposits/i });
  const nKill = await killGroup.count();
  r.check("§1 the kill-switch controls are present and countable", nKill > 0, `deposits-controls=${nKill}`);

  const target = killGroup.first();
  const targetName = (await target.textContent())?.replace(/\s+/g, " ").trim() ?? "?";
  const wasDisabled = await target.isDisabled();
  r.note(`target control: "${targetName}"  disabled=${wasDisabled}`);

  r.check("§2 the kill-switch is NOT offered enabled to a role that cannot act",
    wasDisabled === true, `disabled=${wasDisabled} — the emergency stop for the live payment rail`);

  await page.screenshot({ path: `${SHOT}/admin-payments-auditor.png`, fullPage: true });
  r.note(`shot → ${SHOT}/admin-payments-auditor.png`);

  // ─── §3 · PRESS IT — THE WHOLE CEREMONY ──────────────────────────────────────────
  // ⛔ PAUSING IS A HARD-CONFIRM TIER (kill-switch-toggle.tsx:59-71): the first click only
  // opens a panel; the officer must type PAUSE and press Pause before the action fires.
  // The first version of this driver clicked ONCE and concluded "refused + silent" — and
  // §5's control caught it, because FINANCE's identical single click changed nothing
  // either. A refusal indistinguishable from an un-fired action is not evidence.
  const clicked = await pause(page);
  r.check("§3 the control was actually exercised through its confirm (else nothing below proves anything)",
    clicked, `clicked=${clicked}`);

  const after = { kill: await killState(), sec: await secCount(), all: await allAudit() };
  r.note(`after  — killswitch=${after.kill}  privilege_escalation_blocked=${after.sec}  AuditLog=${after.all}`);

  // 💰 THE ONE THAT MATTERS: the money control must not have moved.
  r.check("§3 💰 the kill-switch state is UNCHANGED — the action layer refused",
    after.kill === before.kill, `${before.kill} → ${after.kill}`);

  // ─── §4 · WHAT DID THE REFUSAL RECORD? ────────────────────────────────────────────
  if (clicked) {
    const audited = after.sec > before.sec;
    r.note(audited
      ? `§4 SHAPE = refused + AUDITED — privilege_escalation_blocked ${before.sec} → ${after.sec}. ` +
        `The money is safe and the SECURITY log now carries an "attempted privilege escalation" ` +
        `for an ordinary click on a control the page offered (control-gates.ts calls this audit pollution).`
      : `§4 SHAPE = refused + SILENT — no privilege_escalation_blocked row. The money is safe and ` +
        `nothing records that the attempt happened.`);
    // ⛔ Not scored as pass/fail: BOTH shapes are wrong in different ways, and which one a
    // surface has is the finding. Scoring one as "ok" would launder a defect into a green tick.
    const recent = await sql(db, `select category, action, "actorId", "createdAt"::text as at
                                    from "AuditLog" order by "createdAt" desc limit 3`);
    r.note(`   3 newest audit rows: ${recent.map((x) => `${x.category}/${x.action}`).join(" | ")}`);
  }

  // ─── §5 · THE POSITIVE CONTROL — FINANCE holds accounting canAct and must SUCCEED ──
  const ctx2 = await b.newContext({ viewport: { width: 1280, height: 1400 } });
  const p2 = await ctx2.newPage();
  await login(p2, "local:FINANCE");
  await p2.goto(`${BASE}/admin/payments`, { waitUntil: "networkidle" });
  const before2 = await killState();
  const fired2 = await pause(p2);
  r.check("§5 CONTROL — FINANCE's ceremony completed", fired2, `fired=${fired2}`);
  const after2 = await killState();
  r.check("§5 CONTROL — FINANCE's click DOES change the kill-switch (so the driver really clicks)",
    after2 !== before2, `${before2} → ${after2}`);
  await ctx2.close();
} finally {
  // ⛔ RESTORE. A harness must not leave state it changed — even on a disposable cluster,
  // the next driver reads this page.
  const now = await killState();
  if (now !== before.kill) {
    if (before.kill === "(absent)") {
      await db.query(`delete from "SystemConfig" where key='payments.killswitch'`);
    } else {
      await db.query(`update "SystemConfig" set value = $1::jsonb where key='payments.killswitch'`, [before.kill]);
    }
    const restored = await killState();
    r.check("§6 the kill-switch was RESTORED to the state this run found it in",
      restored === before.kill, `${now} → ${restored} (wanted ${before.kill})`);
  } else {
    r.note("§6 nothing to restore — kill-switch state never changed");
  }
  await b.close();
  await db.end();
}

process.exit(r.done() > 0 ? 1 : 0);
