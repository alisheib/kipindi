/**
 * OPS — HEAL stuck Millionea weeks (MASWALI-BUILD S4 item 8): a close that was due and not stamped, a certain week void
 * whose window has closed, a void deadline passed unsealed (proposed, never sealed by this script — MR-15).
 *
 *   railway run npx tsx scripts/ops-maswali-heal.mts            (dry run: what is stuck, and what the heal would do)
 *   railway run npx tsx scripts/ops-maswali-heal.mts --apply    (runs the scheduler's own reconcile once)
 *
 * Dry run is the DEFAULT. `--apply` runs `reconcileMaswaliWeeks`, the same tick the lifecycle runs every pass — each act
 * inside it is a conditional write under the chain lock, so a heal that races the live scheduler does each thing once.
 */
import { listConsoleWeeks, consoleAlerts } from "../src/lib/server/maswali-console.ts";
import { reconcileMaswaliWeeks } from "../src/lib/server/maswali-scheduler.ts";

const APPLY = process.argv.includes("--apply");
const url = process.env.DATABASE_URL ?? "";
if (!url) { console.error("✗ DATABASE_URL is not set. Run this through `railway run` so the target is explicit."); process.exit(1); }
console.log(`target: ${(() => { try { return new URL(url).host; } catch { return "unparseable"; } })()}`);
console.log(`mode:   ${APPLY ? "APPLY — the reconcile runs once" : "DRY RUN — nothing will be written"}\n`);

const weeks = await listConsoleWeeks();
for (const w of weeks.filter((x) => x.state !== "SETTLED" && x.state !== "VOIDED")) {
  console.log(`${w.code.padEnd(16)} ${w.state.padEnd(10)} closes ${w.closesAt} · tickets ${w.ticketCount} · sealed ${w.sealed}/15${w.voidCertain ? " · VOIDS WHOLE" : ""}`);
}
const alerts = await consoleAlerts();
console.log(alerts.length ? `\n${alerts.map((a) => `${a.level === "critical" ? "!!" : " !"} ${a.text}`).join("\n")}` : "\nnothing is stuck.");
if (!APPLY) process.exit(0);
const r = await reconcileMaswaliWeeks();
console.log(`\n✓ reconcile: closed ${r.closed} · voided ${r.voided} · void proposals ${r.proposals} · failures ${r.failures}`);
process.exit(r.failures > 0 ? 1 : 0);
