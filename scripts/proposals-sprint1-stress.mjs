/** Feature 2 · Sprint 1 STRESS — drives /api/dev-test/proposals-stress. */
const BASE = process.env.BASE || "http://localhost:3000";
const qs = process.env.SCALE || "proposers=100&voters=250";
const res = await fetch(`${BASE}/api/dev-test/proposals-stress?${qs}`, { method: "POST", headers: { connection: "close" } });
const b = await res.json();
if (!Array.isArray(b.checks)) { console.error(JSON.stringify(b, null, 2)); process.exit(1); }
console.log(`SCALE: ${b.scale.proposers} proposers · ${b.scale.proposals} proposals · ${b.scale.voters} voters · ${b.scale.ops} ops`);
console.log(`PERF:  ${b.perf.opsPerSec} ops/sec (${b.perf.elapsedMs}ms)\n`);
let pass = 0;
for (const c of b.checks) { console.log(`  ${c.pass ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${c.name}${c.detail ? `  \x1b[90m${c.detail}\x1b[0m` : ""}`); if (c.pass) pass++; }
console.log(`\n  ${pass === b.checks.length ? "\x1b[32m" : "\x1b[31m"}${pass}/${b.checks.length} invariants held\x1b[0m`);
process.exitCode = pass === b.checks.length ? 0 : 1;
