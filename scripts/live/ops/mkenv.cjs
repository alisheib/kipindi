#!/usr/bin/env node
/**
 * mkenv.cjs — mint a live DB env for THIS laptop, without ever printing the secret.
 *
 * Run it under Railway so the service's own variables are injected:
 *   railway run -s 50pick -- node <scratchpad>/live/mkenv.cjs
 *
 * Railway injects DATABASE_URL pointing at `postgres.railway.internal`, which does not
 * resolve off-platform. Every value read through that host comes back as a DEFAULT, silently
 * — the trap that cost a whole session once. So we rewrite the host onto the Postgres
 * service's public TCP proxy and ASSERT the rewrite actually happened.
 */
const fs = require("node:fs");
const path = require("node:path");

const OUT = path.join(__dirname, ".env");

const raw = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!raw) {
  console.error("FAIL: neither DATABASE_PUBLIC_URL nor DATABASE_URL is present.");
  console.error("      Are you running this under `railway run -s 50pick --`?");
  process.exit(1);
}

const u = new URL(raw);
const wasInternal = u.hostname.endsWith(".railway.internal");

if (wasInternal) {
  // The documented public proxy for project 50pick -> service Postgres.
  // Overridable so a proxy move does not need a code edit.
  const host = process.env.PGPROXY_HOST || "turntable.proxy.rlwy.net";
  const port = process.env.PGPROXY_PORT || "40357";
  u.hostname = host;
  u.port = port;
}

// Assert: whatever we are about to write must NOT be the internal host. A file that
// looks right and points nowhere is worse than no file.
if (u.hostname.endsWith(".railway.internal")) {
  console.error("FAIL: still pointing at the internal host after rewrite — refusing to write.");
  process.exit(1);
}

const lines = [`DATABASE_URL=${u.toString()}`];

// Carry the handful of service vars the live probes legitimately need. Never the
// payment or session secrets — nothing here needs them.
for (const k of ["PAYOUT_TEST_BYPASS_MSISDN", "TWELVEDATA_API_KEY", "USE_PRISMA_DAL"]) {
  if (process.env[k] != null) lines.push(`${k}=${process.env[k]}`);
}

fs.writeFileSync(OUT, lines.join("\n") + "\n", { mode: 0o600 });

console.log(`OK: wrote ${lines.length} vars to ${OUT}`);
console.log(`    host rewritten: ${wasInternal ? "yes (internal -> public proxy)" : "no (already public)"}`);
console.log(`    db host now:    ${u.hostname}:${u.port}`);
console.log(`    keys:           ${lines.map((l) => l.split("=")[0]).join(", ")}`);
