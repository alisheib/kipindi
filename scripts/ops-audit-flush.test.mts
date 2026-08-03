/**
 * E-66 · AN OPS SCRIPT THAT CHANGES MONEY-PATH STATE MUST FLUSH THE AUDIT QUEUE.
 *
 *   npx tsx scripts/ops-audit-flush.test.mts        (npm run test:ops-audit-flush)
 *
 * 🔴 THE FINDING, and it was found by checking my own work. `ops-stop-updown-chains.mts`
 * stopped FOUR chains through `setChainState` and exactly **ONE** `updown.chain.stopped` row
 * reached the database.
 *
 * WHY. Every money-path service audits FIRE-AND-FORGET — `audit({...})` is called without
 * `await`, and it chains the write onto a serialised global queue (`__50PICK_AUDIT_QUEUE`),
 * because the HMAC chain must be written in `prevHash` order. A long-lived web process always
 * drains that queue; the request outlives the write. **A script does not:** `process.exit()`
 * kills it mid-drain, and even a natural end can race it.
 *
 * ⛔ THE ENTRIES CANNOT BE RECOVERED. An `AuditLog` row is HMAC-linked to its predecessor, so
 * hand-writing the missing ones is forbidden — and re-running the action is a no-op, because
 * the services return early when the state already matches. The gap is permanent.
 *
 * ⚠️ THE ONE THAT MATTERS MOST is `ops-updown-void-stuck-rounds.mts`, which **refunds real
 * money**. A refund whose audit entry never lands is exactly the record a regulator asks for.
 *
 * WHAT THIS ASSERTS: any `scripts/ops-*` file that imports a MUTATING money-path service must
 * also call `auditFlush()`. It deliberately does NOT demand it of read-only probes — a guard
 * that fires on correct work teaches the next session to skip it (the deleted-§3 lesson from
 * `tracker-hygiene`).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; return; }
  fails.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

/**
 * The service calls that WRITE state and audit fire-and-forget. Read-only helpers
 * (`listChains`, `getAsset`, `getUpDownConfig`, the probes) are deliberately absent: importing
 * a module is not the risk, CHANGING something is.
 */
const MUTATORS = [
  "setChainState", "createChain", "updateChain",
  "createAsset", "updateAsset", "setAssetEnabled",
  "voidRoundByOperator", "generateRoundNow", "openRound", "closeRound",
  "setUpDownConfig", "settleMarket", "buyPosition",
];

const files = readdirSync(HERE).filter((f) => /^ops-.*\.(mts|mjs)$/.test(f));
ok("§0 ops scripts were found", files.length > 5, `${files.length} files`);

let checked = 0;
for (const f of files) {
  const src = readFileSync(join(HERE, f), "utf8");
  // Strip comments so a mutator NAMED in prose does not count as a call.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const used = MUTATORS.filter((m) => new RegExp(`\\b${m}\\s*\\(`).test(code));
  if (used.length === 0) continue;          // read-only: nothing to flush
  checked++;
  ok(`§1 ${f} flushes the audit queue (mutates via ${used.slice(0, 3).join(", ")})`,
    /auditFlush\s*\(\s*\)/.test(code),
    "it changes audited state and can exit before the HMAC queue drains — add `await auditFlush()`");
}
ok("§1 at least one mutating ops script was examined", checked > 0,
  "the mutator list may have drifted from the service names");

// The platform must keep exporting the thing the rule depends on.
{
  const audit = readFileSync(join(HERE, "../src/lib/server/audit.ts"), "utf8");
  ok("§2 auditFlush is still exported", /export function auditFlush\(/.test(audit));
  ok("§2 …and audit() is still the fire-and-forget queue this rule is about",
    /__50PICK_AUDIT_QUEUE/.test(audit),
    "if audit() became awaited-by-default this guard's rationale changes — re-read E-66");
}

console.log(`\nE-66 · ops audit flush — ${pass} passed, ${fails.length} failed  (${checked} mutating script(s))\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length === 0 ? 0 : 1);
