/**
 * Affiliate / referral E2E — drives /api/dev-test/affiliate-e2e against the
 * running dev server (:3000) and prints a per-assertion report.
 *
 *   1. npm run dev   (in another terminal)
 *   2. node scripts/affiliate-e2e.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const res = await fetch(`${BASE}/api/dev-test/affiliate-e2e`, {
  method: "POST",
  headers: { connection: "close" },
});
const body = await res.json();

if (!Array.isArray(body.checks)) {
  console.error("Unexpected response:", JSON.stringify(body, null, 2));
  process.exit(1);
}

let pass = 0;
for (const c of body.checks) {
  const mark = c.pass ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
  if (c.pass) pass++;
  const detail = c.detail ? `  \x1b[90m${c.detail}\x1b[0m` : "";
  console.log(`  ${mark} ${c.name}${detail}`);
}

console.log("");
console.log(`  ${body.failed === 0 ? "\x1b[32m" : "\x1b[31m"}${pass}/${body.checks.length} checks passed\x1b[0m`);
// Set exitCode (not process.exit) so Node can tear down sockets cleanly on
// Windows — avoids the spurious libuv UV_HANDLE_CLOSING assert at exit.
process.exitCode = body.failed === 0 ? 0 : 1;
