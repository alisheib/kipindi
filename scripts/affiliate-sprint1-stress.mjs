/** Sprint 1 · STRESS — drives /api/dev-test/affiliate-stress and prints invariants. */
const BASE = process.env.BASE || "http://localhost:3000";
const qs = process.env.SCALE || "referrers=60&recruits=20&events=10";
const res = await fetch(`${BASE}/api/dev-test/affiliate-stress?${qs}`, { method: "POST", headers: { connection: "close" } });
const b = await res.json();
if (!Array.isArray(b.checks)) { console.error(JSON.stringify(b, null, 2)); process.exit(1); }
console.log(`SCALE: ${b.scale.referrers} referrers × ${b.scale.recruitsPerReferrer} recruits × ${b.scale.eventsPerRecruit} events = ${b.scale.totalEvents} ops · ${b.scale.users} users · ${b.scale.rewardsCreated} rewards`);
console.log(`PERF:  ${b.perf.opsPerSec} ops/sec (${b.perf.elapsedMs}ms)\n`);
let pass = 0;
for (const c of b.checks) { console.log(`  ${c.pass ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${c.name}${c.detail ? `  \x1b[90m${c.detail}\x1b[0m` : ""}`); if (c.pass) pass++; }
console.log(`\n  ${b.failed === 0 || pass === b.checks.length ? "\x1b[32m" : "\x1b[31m"}${pass}/${b.checks.length} invariants held\x1b[0m`);
process.exitCode = pass === b.checks.length ? 0 : 1;
