/**
 * Admin role tiers — locks the authority policy so a MODERATOR can never
 * silently regain money/compliance/config authority via a copy-paste regression.
 * Run: npx tsx scripts/admin-roles.test.mts
 */
import {
  ADMIN_CONSOLE_ROLES, MARKET_OPS_ROLES, MONEY_ROLES, COMPLIANCE_ROLES, CONFIG_ROLES, hasRole,
} from "../src/lib/server/roles.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean) => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}`); };

// ADMIN + COMPLIANCE may do everything.
for (const tier of [ADMIN_CONSOLE_ROLES, MARKET_OPS_ROLES, MONEY_ROLES, COMPLIANCE_ROLES, CONFIG_ROLES]) {
  ok("ADMIN in tier", tier.has("ADMIN"));
  ok("COMPLIANCE in tier", tier.has("COMPLIANCE"));
}

// MODERATOR: console + market-ops ONLY. Never money / compliance / config.
ok("MODERATOR can open console", ADMIN_CONSOLE_ROLES.has("MODERATOR"));
ok("MODERATOR can do market ops", MARKET_OPS_ROLES.has("MODERATOR"));
ok("MODERATOR CANNOT release money", !MONEY_ROLES.has("MODERATOR"));
ok("MODERATOR CANNOT do compliance/PII", !COMPLIANCE_ROLES.has("MODERATOR"));
ok("MODERATOR CANNOT change config/reports", !CONFIG_ROLES.has("MODERATOR"));

// PLAYER / AGENT / SUPPORT are never in any admin tier.
for (const r of ["PLAYER", "AGENT", "SUPPORT"] as const) {
  for (const [name, tier] of Object.entries({ ADMIN_CONSOLE_ROLES, MARKET_OPS_ROLES, MONEY_ROLES, COMPLIANCE_ROLES, CONFIG_ROLES })) {
    ok(`${r} not in ${name}`, !tier.has(r));
  }
}

// hasRole helper is null-safe.
ok("hasRole(null) is false", hasRole(null, MONEY_ROLES) === false);
ok("hasRole(undefined) is false", hasRole(undefined, MONEY_ROLES) === false);
ok("hasRole(ADMIN, MONEY) is true", hasRole("ADMIN", MONEY_ROLES) === true);

console.log(`\nadmin-roles: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
