/**
 * `npm run qa:admin-privacy-gate` — DRIVE the /admin/privacy controls as a role that may
 * VIEW the page but may not ACT on it, and read the consequence back out of Postgres with
 * raw SQL.
 *
 * THE QUESTION. Under `DEFAULT_GRANTS` (roles.ts) an **AUDITOR** holds
 * `compliance: {canView: true, canAct: false}`. `/admin/privacy` maps to the `compliance`
 * domain, so the route gate admits them. `privacy/page.tsx` contains no `canAct`,
 * `canUseControl`, `role` or `disabled` anywhere in its 186 lines, so it renders the DSAR
 * controls unconditionally. `privacy/actions.ts`'s `requireOfficer()` then refuses.
 *
 * ⭐ THREE THINGS ARE MEASURED, AND THEY ARE DIFFERENT QUESTIONS:
 *   1. does the page OFFER the control to a role that cannot use it? (the precedent
 *      `admin/objections/page.tsx` sets is to render a read-only state instead —
 *      `control-gates.ts` documents that as the fix, not widening the grant)
 *   2. does clicking it CHANGE anything? (it must not — the action-layer refusal is the
 *      one that matters, and it is asserted against the DB, not against a toast)
 *   3. is the refusal AUDITED? Every other admin gate in this codebase writes
 *      `privilege_escalation_blocked` at SECURITY severity — `requireStaff` itself,
 *      `payments/gate`, `kyc/gate`, `reports/pack`, both resolver-queue actions,
 *      `_actions/ai-toolkit`, `objections-service`, and `markets/actions` twice.
 *      `privacy/actions.ts` imports `audit` and calls it exactly ONCE, on the SUCCESS
 *      path of `buildDsarBundleAction`.
 *
 * ⛔ WHY A CONTROL RUNS FIRST. Every assertion below is worthless if the AUDITOR simply
 * could not reach the page — a driver that is bounced to the login form and then reports
 * "no rows were written" has proven nothing at all. §1 therefore asserts the AUDITOR is
 * ON the page and can SEE its data before anything is clicked, and §5 re-runs the same
 * click as COMPLIANCE, who must succeed. A refusal that cannot be distinguished from a
 * broken driver is not evidence.
 *
 * ⛔ LOCALHOST ONLY. It signs in as the seeded local staff fixtures, which exist only on
 * the disposable cluster, and it refuses any other base outright.
 *
 * Prereqs:
 *   npm run db:seed-admin-local && npm run db:seed-staff-local   (against the local PG)
 *   next build && next start   (NOT next dev — stale CSS, and HMR never comes up here)
 */
import { Client } from "pg";
import { browser, login, bodyText, recorder } from "./live/harness.mjs";

const BASE = process.env.LIVE_BASE ?? "http://localhost:3001";
const DB = process.env.DATABASE_URL ?? "postgresql://postgres:pw@localhost:5433/kipindi_load?schema=public";
const SHOT = process.env.SHOT_DIR ?? ".50pick-shots";

if (!/^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(BASE)) {
  console.error(`REFUSED — this driver is localhost-only, got BASE=${BASE}`);
  process.exit(1);
}
if (/rlwy\.net|railway\.app|50pick\.tz|railway\.internal/i.test(DB)) {
  console.error("REFUSED — that DATABASE_URL is production.");
  process.exit(1);
}

const r = recorder("qa:admin-privacy-gate — /admin/privacy driven as AUDITOR (view, no act)");
const sql = async (c, q, p) => (await c.query(q, p)).rows;

const db = new Client({ connectionString: DB });
await db.connect();

// ── identity: prove which database is being read ──────────────────────────────────
const [who] = await sql(db, `select current_database() as db, current_user as usr`);
r.note(`db=${who.db} user=${who.usr}  base=${BASE}`);

/**
 * Snapshot what the action would write, plus the security audit trail.
 *
 * ⚠️ THERE IS NO `DsarRequest` TABLE. The queue is `globalThis.__50PICK_DSAR_QUEUE` with
 * write-through to `SystemConfig['privacy.dsar_queue']` (privacy.ts:41-52) — a JSON blob,
 * not a relation. This probe asked for a table named after the type and got a clean
 * refusal from its own existence check, which is the only reason it did not report a
 * confident `0 → 0` about a table that never existed.
 */
async function snapshot() {
  const [dsar] = await sql(db, `select coalesce(jsonb_array_length(value::jsonb), 0)::int as n
                                  from "SystemConfig" where key = 'privacy.dsar_queue'`);
  const [sec] = await sql(db, `select count(*)::int as n from "AuditLog"
                                where action = 'privilege_escalation_blocked'`);
  const [audits] = await sql(db, `select count(*)::int as n from "AuditLog"`);
  return { dsar: dsar?.n ?? 0, sec: sec.n, audits: audits.n };
}

// The tables must EXIST — a 0 from a missing relation is not a measurement.
const tables = (await sql(db, `select table_name from information_schema.tables where table_schema='public'`))
  .map((x) => x.table_name);
for (const t of ["SystemConfig", "AuditLog", "User"]) {
  if (!r.check(`table "${t}" exists (a 0 from a missing relation is not a measurement)`, tables.includes(t))) {
    await db.end();
    process.exit(1);
  }
}

const { b, ctx } = await browser();
const page = await ctx.newPage();

try {
  // ─────────────────────────────────────────────────────────────────────────────────
  // §1 · THE CONTROL — the AUDITOR must actually be on the page, seeing real data.
  // ─────────────────────────────────────────────────────────────────────────────────
  await login(page, "local:AUDITOR");
  await page.goto(`${BASE}/admin/privacy`, { waitUntil: "networkidle" });

  r.check("§1 AUDITOR is not bounced off /admin/privacy", new URL(page.url()).pathname === "/admin/privacy", page.url());

  const txt = await bodyText(page);
  r.check("§1 the page rendered its own heading (not the login form)", txt.includes("dsar"), txt.slice(0, 120));
  r.check("§1 not the restricted placeholder", !txt.includes("you do not have access"), txt.slice(0, 160));

  // ⚠️ SCOPE THE LOCATOR, AND ASSERT THE ANCHOR FOUND WHAT IT MEANT. A page-wide button
  // search would also match the shell chrome (refresh, AI toolkit, nav). The first version
  // of this anchored `locator("section,div").filter({hasText:/on-behalf export/i}).last()`
  // and matched a LEAF div holding the heading text but no table — it reported `rows=0`
  // for COMPLIANCE, a role that plainly sees eight controls in the screenshot. The §5
  // CONTROL is the only reason that was caught as an instrument bug rather than filed as
  // a product one. Anchor on the TABLE THAT CONTAINS the control, and assert there is
  // exactly one such table.
  const exportTables = page.locator("table").filter({ has: page.getByRole("button", { name: /export bundle/i }) });
  const nTables = await exportTables.count();
  r.check("§1 exactly ONE table carries the export control (an anchor matching twice is not an anchor)",
    nTables === 1, `tables=${nTables}`);
  const exportCard = exportTables.first();
  const rowCount = await exportCard.locator("tbody tr").count();
  r.check("§1 the on-behalf export table has rows to act on", rowCount > 0, `rows=${rowCount}`);

  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.screenshot({ path: `${SHOT}/admin-privacy-auditor-1280.png`, fullPage: true });
  r.note(`shot → ${SHOT}/admin-privacy-auditor-1280.png`);

  // ─────────────────────────────────────────────────────────────────────────────────
  // §2 · IS THE CONTROL OFFERED to a role that cannot use it?
  // ─────────────────────────────────────────────────────────────────────────────────
  const exportBtns = exportCard.getByRole("button", { name: /export bundle/i });
  const nExport = await exportBtns.count();
  r.note(`export controls rendered for AUDITOR: ${nExport}`);

  const firstBtn = exportBtns.first();
  const disabled = nExport > 0 ? await firstBtn.isDisabled() : null;
  r.note(`first export control disabled? ${disabled}`);

  // ⛔ STATE THE INVARIANT, NOT THE PRESENCE. The product is correct EITHER by hiding the
  // control OR by rendering it disabled/read-only — `objections/page.tsx` does the latter.
  // What is NOT acceptable is an ENABLED control on a role the action will refuse.
  r.check(
    "§2 no ENABLED act-control is offered to a role with canAct=false (hidden or disabled both pass)",
    nExport === 0 || disabled === true,
    `rendered=${nExport} disabled=${disabled}`,
  );

  // ─────────────────────────────────────────────────────────────────────────────────
  // §3 · CLICK IT. Whatever the page offered, the ACTION must refuse and write nothing.
  // ─────────────────────────────────────────────────────────────────────────────────
  const before = await snapshot();
  r.note(`before — DsarRequest=${before.dsar} AuditLog=${before.audits} privilege_escalation_blocked=${before.sec}`);

  let clicked = false;
  if (nExport > 0 && disabled === false) {
    await firstBtn.click();
    await page.waitForTimeout(2500); // the action is a server round-trip
    clicked = true;
  }
  // ⭐ THE INVARIANT, NOT THE PRESENCE — and it had to be restated once the fix landed.
  // Before the page gated its controls this read "the control must have been clicked", which
  // was right then and became WRONG the moment the fix made the control un-clickable: the
  // driver reported a failure over exactly the behaviour it exists to require. The real rule
  // has two arms, and one of them must hold:
  //   · the control is NOT actionable (absent, or disabled) — the page gated it, which is the fix; or
  //   · it IS actionable, in which case it must be pressed and the refusal proven below.
  // ⛔ An unconditional presence check demands a false statement — the same shape as the
  // Up & Down empty-side sentence that failed on a correct screen.
  const notActionable = nExport === 0 || disabled === true;
  r.check("§3 either the page gated the control, or it was exercised and refused",
    notActionable || clicked, `rendered=${nExport} disabled=${disabled} clicked=${clicked}`);

  const after = await snapshot();
  r.note(`after  — DsarRequest=${after.dsar} AuditLog=${after.audits} privilege_escalation_blocked=${after.sec}`);

  r.check("§3 no DSAR row was created by a role that cannot act", after.dsar === before.dsar,
    `${before.dsar} → ${after.dsar}`);

  await page.screenshot({ path: `${SHOT}/admin-privacy-auditor-clicked.png`, fullPage: true });
  r.note(`shot → ${SHOT}/admin-privacy-auditor-clicked.png`);

  // ─────────────────────────────────────────────────────────────────────────────────
  // §4 · WAS THE REFUSAL AUDITED? This is the finding under test.
  // ─────────────────────────────────────────────────────────────────────────────────
  if (clicked) {
    r.check(
      "§4 a refused compliance action writes privilege_escalation_blocked (as every other admin gate does)",
      after.sec > before.sec,
      `${before.sec} → ${after.sec} — privacy/actions.ts requireOfficer() returns {ok:false} with no audit() call`,
    );
    const recent = await sql(db, `select action, category, "actorId", "createdAt"::text as at
                                    from "AuditLog" order by "createdAt" desc limit 3`);
    r.note(`3 newest audit rows: ${recent.map((x) => `${x.category}/${x.action}@${x.at}`).join(" | ") || "(none)"}`);
  } else {
    // ⚠️ SKIP, NOT A PASS, and the distinction is the point: since the page now gates the
    // control there is no bounced click to audit — which is A3 fixed at the source. The
    // action-layer audit itself is proven separately and unconditionally by
    // `test:admin-soft-gate` + `qa:admin-act-refusal`, so nothing is left unproven here.
    r.note("§4 SKIP — the page gated the control, so no refusal reached the server. That is A3 fixed, not an untested path.");
  }

  // ─────────────────────────────────────────────────────────────────────────────────
  // §5 · THE POSITIVE CONTROL — COMPLIANCE holds canAct, and must SUCCEED on the same
  //      control. Without this, every refusal above could be a broken driver.
  // ─────────────────────────────────────────────────────────────────────────────────
  const ctx2 = await b.newContext({ viewport: { width: 1280, height: 1000 } });
  const page2 = await ctx2.newPage();
  await login(page2, "local:COMPLIANCE");
  await page2.goto(`${BASE}/admin/privacy`, { waitUntil: "networkidle" });
  r.check("§5 CONTROL — COMPLIANCE reaches /admin/privacy too", new URL(page2.url()).pathname === "/admin/privacy", page2.url());

  const card2 = page2.locator("table").filter({ has: page2.getByRole("button", { name: /export bundle/i }) }).first();
  const btn2 = card2.getByRole("button", { name: /export bundle/i }).first();
  const n2 = await card2.getByRole("button", { name: /export bundle/i }).count();
  r.check("§5 CONTROL — the export control is offered to COMPLIANCE", n2 > 0, `rendered=${n2}`);

  const beforeC = await snapshot();
  if (n2 > 0 && !(await btn2.isDisabled())) {
    await btn2.click();
    await page2.waitForTimeout(2500);
  }
  const afterC = await snapshot();
  r.check(
    "§5 CONTROL — COMPLIANCE's export IS audited (privacy.dsar.exported), proving the click reaches the action",
    afterC.audits > beforeC.audits,
    `AuditLog ${beforeC.audits} → ${afterC.audits}`,
  );
  const recentC = await sql(db, `select action from "AuditLog" order by "createdAt" desc limit 1`);
  r.note(`newest audit row after COMPLIANCE click: ${recentC[0]?.action ?? "(none)"}`);

  await page2.screenshot({ path: `${SHOT}/admin-privacy-compliance-1280.png`, fullPage: true });
  r.note(`shot → ${SHOT}/admin-privacy-compliance-1280.png`);
  await ctx2.close();
} finally {
  await b.close();
  await db.end();
}

process.exit(r.done() > 0 ? 1 : 0);
