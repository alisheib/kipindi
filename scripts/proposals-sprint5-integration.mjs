/**
 * Feature 2 · Sprint 5 · INTEGRATION & PERSISTENCE.
 *   A. Full lifecycle through REAL services (create→vote→approve→market→resolve→prize)
 *      via the proposals-e2e endpoint.
 *   B. Snapshot persistence: proposals + proposalVotes maps are in the backup envelope.
 *  (regression suites run separately by the harness.)
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0; const failures = [];
const log = (l, ok, d = "") => { console.log(`${ok ? "✓" : "✗"} ${l}${d ? "  →  " + d : ""}`); ok ? pass++ : (fail++, failures.push(`${l} ${d}`)); };

// ── A · real end-to-end lifecycle ──────────────────────────────────────
console.log("\n=== A · LIFECYCLE THROUGH REAL SERVICES ===");
{
  const b = await (await fetch(`${BASE}/api/dev-test/proposals-e2e`, { method: "POST", headers: { connection: "close" } })).json();
  if (!Array.isArray(b.checks)) log("A.e2e endpoint ran", false, JSON.stringify(b).slice(0, 200));
  else {
    const keys = ["approve & list creates a market", "proposal RESOLVED after market settles", "proposer paid the prize (+20,000)", "prize not double-paid on re-resolve"];
    for (const k of keys) { const c = b.checks.find((x) => x.name === k); log("A." + k, !!c && c.pass, c?.detail ?? "missing"); }
    log("A.full e2e suite green", b.checks.every((c) => c.pass), `${b.checks.filter((c) => c.pass).length}/${b.checks.length}`);
  }
}

// ── B · snapshot persistence ───────────────────────────────────────────
console.log("\n=== B · SNAPSHOT PERSISTENCE ===");
{
  // A mutation + wait past the 1.5s debounce.
  await fetch(`${BASE}/api/dev-test/proposals-seed`, { method: "POST", headers: { "content-type": "application/json", connection: "close" }, body: JSON.stringify({}) }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));
  const snap = join(process.cwd(), ".50pick-backups", "store.snapshot.json");
  if (!existsSync(snap)) log("B.snapshot file exists", false, snap);
  else {
    log("B.snapshot file exists", true);
    // The snapshot can be large (accumulated dev/test data) — substring-scan the
    // raw envelope rather than double-JSON.parse it. The payload escapes quotes,
    // so map markers appear as  proposals\":{\"__map\":true,\"entries\":[[
    const raw = readFileSync(snap, "utf8");
    const hasMapWithEntries = (key) => raw.includes(`${key}\\":{\\"__map\\":true,\\"entries\\":[[`);
    log("B.snapshot includes 'proposals' map with entries", hasMapWithEntries("proposals"));
    log("B.snapshot includes 'proposalVotes' map with entries", hasMapWithEntries("proposalVotes"));
    log("B.snapshot still includes affiliate maps (Feature 1 intact)", raw.includes('affiliates\\":{\\"__map\\":true') && raw.includes('referralRewards\\":{\\"__map\\":true'));
  }
}

console.log(`\n${"=".repeat(60)}\nSPRINT 5 · INTEGRATION   PASS: ${pass}   FAIL: ${fail}\n${"=".repeat(60)}`);
if (fail > 0) { console.log("\nFailures:"); failures.forEach((f) => console.log("  · " + f)); }
process.exitCode = fail > 0 ? 1 : 0;
