#!/usr/bin/env node
/**
 * rbac-census.cjs — read the LIVE admin access matrix straight off the production DB.
 *
 * ⭐ WHY THIS EXISTS. `DEFAULT_GRANTS` in `src/lib/server/roles.ts` is only the FALLBACK.
 * The authoritative grant for (role, domain) is the `RoleDomainGrant` row when one exists
 * (`rbac.ts` → `effectiveGrant`). So a role sweep run against a local database with an
 * empty grant table is testing the DEFAULTS, and production may not use them. A matrix
 * you assumed is not a matrix you measured.
 *
 * Rules this obeys, each learned the hard way in this campaign:
 *  - it prints an IDENTITY block first — a probe that cannot prove which database it read
 *    is not evidence.
 *  - it ASSERTS the table exists rather than trusting a `0` that is really "relation does
 *    not exist" swallowed by a try/catch (E-136's shape).
 *  - every timestamp is ::text-cast, because this laptop's clock is ~93s slow.
 *  - it reports the EFFECTIVE matrix (override ?? default), not just the override rows,
 *    because "3 rows in the table" says nothing about what any role can actually see.
 *
 * READ-ONLY. It issues no INSERT/UPDATE/DELETE and needs no login, so it cannot revoke
 * anyone's session.
 *
 *   railway run -s 50pick -- node scripts/live/ops/mkenv.cjs   # once, mints the public URL
 *   node scripts/live/ops/rbac-census.cjs
 */
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require(path.join(process.env.KP_REPO || "F:/kipindi-main", "node_modules", "pg"));

for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
}

const q = (c, sql, params) => c.query(sql, params).then((r) => r.rows);

/** The canonical display order from ADMIN_DOMAINS (roles.ts). */
const DOMAINS = ["overview", "accounting", "growth", "compliance", "trading", "ops", "support"];
/** STAFF_ROLES (roles.ts). ADMIN is first and bypasses the table entirely. */
const ROLES = ["ADMIN", "COMPLIANCE", "MODERATOR", "FINANCE", "GROWTH", "AUDITOR", "SUPPORT"];

/**
 * A TRANSCRIPTION of `DEFAULT_GRANTS` (roles.ts:171-202), kept here so the probe can
 * compute the effective matrix without a TS toolchain.
 *
 * ⛔ IT IS A COPY, AND A COPY CAN DRIFT — so the probe does not merely use it, it PRINTS
 * every cell where the live override disagrees with it. A silent "matches defaults" would
 * be indistinguishable from "my copy of the defaults is stale".
 */
const DEFAULT_GRANTS = {
  COMPLIANCE: { overview: "V", compliance: "VA", accounting: "V", support: "V" },
  MODERATOR: { overview: "V", trading: "VA" },
  FINANCE: { overview: "V", accounting: "VA" },
  GROWTH: { overview: "V", growth: "VA" },
  AUDITOR: { overview: "V", accounting: "V", compliance: "V" },
  SUPPORT: { overview: "V", support: "VA" },
};
const def = (role, domain) => {
  if (role === "ADMIN") return "VA";
  return DEFAULT_GRANTS[role]?.[domain] ?? "—";
};
const cell = (g) => (g.canAct ? "VA" : g.canView ? "V" : "—");

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const [meta] = await q(c, `select current_database() as db, inet_server_addr()::text as addr, now()::text as server_now`);
  console.log("=== IDENTITY ===");
  console.log(`db=${meta.db}  server=${meta.addr}  server_now=${meta.server_now}`);

  // ---- 0. the tables must EXIST. A 0 from a missing relation is not a measurement. ----
  const tables = (await q(c, `select table_name from information_schema.tables where table_schema='public'`)).map((r) => r.table_name);
  const missing = ["RoleDomainGrant", "User"].filter((t) => !tables.includes(t));
  if (missing.length) {
    console.log(`\n⛔ MISSING TABLES: ${missing.join(", ")} — refusing to report a matrix I cannot read.`);
    await c.end();
    process.exit(2);
  }

  // ---- 1. the live overrides ---------------------------------------------------------
  const rows = await q(c, `select role::text as role, domain::text as domain, "canView", "canAct",
                                  "updatedBy", "updatedAt"::text as updated_at
                             from "RoleDomainGrant" order by role, domain`);
  console.log(`\n=== RoleDomainGrant — LIVE OVERRIDE ROWS: ${rows.length} ===`);
  if (rows.length === 0) {
    console.log("(empty — every (role, domain) pair therefore resolves to DEFAULT_GRANTS)");
  } else {
    for (const r of rows) {
      console.log(`  ${r.role.padEnd(11)} ${r.domain.padEnd(11)} view=${r.canView ? "Y" : "n"} act=${r.canAct ? "Y" : "n"}  by=${r.updatedBy ?? "—"}  at=${r.updated_at}`);
    }
  }

  // ---- 2. the EFFECTIVE matrix, and every disagreement with the code defaults ---------
  const ov = new Map(rows.map((r) => [`${r.role}:${r.domain}`, { canView: r.canView, canAct: r.canAct }]));
  console.log(`\n=== EFFECTIVE MATRIX (override ?? default) — V=view  VA=view+act  —=no access ===`);
  console.log(`${"role".padEnd(11)}${DOMAINS.map((d) => d.slice(0, 10).padEnd(11)).join("")}`);
  const drift = [];
  for (const role of ROLES) {
    const cells = DOMAINS.map((d) => {
      const eff = role === "ADMIN" ? "VA" : ov.has(`${role}:${d}`) ? cell(ov.get(`${role}:${d}`)) : def(role, d);
      if (role !== "ADMIN" && eff !== def(role, d)) drift.push(`${role}/${d}: live=${eff} default=${def(role, d)}`);
      return eff.padEnd(11);
    });
    console.log(`${role.padEnd(11)}${cells.join("")}`);
  }
  console.log(`\n=== LIVE vs CODE DEFAULTS: ${drift.length} cell(s) differ ===`);
  for (const d of drift) console.log(`  ⚠️ ${d}`);
  if (drift.length === 0) console.log("  (production runs the code default matrix — a local sweep against defaults is representative)");

  // ---- 3. who actually holds each role ------------------------------------------------
  const staff = await q(c, `select role::text as role, status::text as status, count(*)::int as n
                              from "User" where role <> 'PLAYER' and role <> 'AGENT'
                             group by role, status order by role, status`);
  console.log(`\n=== STAFF ROSTER ON PRODUCTION ===`);
  const held = new Set(staff.map((r) => r.role));
  for (const r of staff) console.log(`  ${r.role.padEnd(11)} ${r.status.padEnd(10)} ${r.n}`);
  const unheld = ROLES.filter((r) => !held.has(r));
  console.log(`roles with NO account at all: ${unheld.length ? unheld.join(", ") : "none"}`);

  // ---- 4. the owner-only surfaces are a SEPARATE gate, ahead of the domain check -------
  console.log(`\n=== OWNER-ONLY (roles.ts:313, checked in the layout BEFORE the domain gate) ===`);
  console.log(`  /admin/staff and /admin/roles — ADMIN only, regardless of any 'ops' grant above.`);
  console.log(`  ⚠️ So the 'ops' column is NOT the gate for those two routes; do not read it as one.`);

  await c.end();
})().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
