/** Feature 2 engine E2E — drives /api/dev-test/proposals-e2e. */
const BASE = process.env.BASE || "http://localhost:3000";
const res = await fetch(`${BASE}/api/dev-test/proposals-e2e`, { method: "POST", headers: { connection: "close" } });
const b = await res.json();
if (!Array.isArray(b.checks)) { console.error(JSON.stringify(b, null, 2)); process.exit(1); }
let pass = 0;
for (const c of b.checks) { console.log(`  ${c.pass ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${c.name}${c.detail ? `  \x1b[90m${c.detail}\x1b[0m` : ""}`); if (c.pass) pass++; }
console.log(`\n  ${pass === b.checks.length ? "\x1b[32m" : "\x1b[31m"}${pass}/${b.checks.length} checks passed\x1b[0m`);
process.exitCode = pass === b.checks.length ? 0 : 1;
