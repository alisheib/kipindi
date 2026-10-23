/**
 * OPS — HEAL stuck Millionea weeks (MASWALI-BUILD S4 item 8): a close that was due and not stamped, a certain week void
 * whose window has closed, a VOIDED week whose refunds have not landed (R1), a void deadline passed unsealed (flagged for
 * an officer — the result from its source if the source gave it by the deadline, else the void — never sealed by this
 * script, MR-15).
 *
 *   railway run npx tsx scripts/ops-maswali-heal.mts            (dry run: what is stuck, and what the heal would do)
 *   railway run npx tsx scripts/ops-maswali-heal.mts --apply    (runs the scheduler's own reconcile once)
 *
 * Dry run is the DEFAULT. `--apply` runs `reconcileMaswaliWeeks`, the same tick the lifecycle runs every pass — each act
 * inside it is a conditional write under the chain lock, so a heal that races the live scheduler does each thing once. A
 * VOIDED week's refunds are one transaction that answers "already" once its market is settled (`maswali-void.ts`).
 * S6 · then the notice reconcile runs at once (`reconcileMillioneaNotices`, forced past its hourly pace): a recently settled
 * or refunded week whose last notice record is not complete is run again, and only what is missing goes.
 */
import { auditFlush } from "../src/lib/server/audit.ts";
import { listConsoleWeeks, consoleAlerts } from "../src/lib/server/maswali-console.ts";
import { reconcileMaswaliWeeks } from "../src/lib/server/maswali-scheduler.ts";
import { reconcileMillioneaNotices, settleMillioneaNotices } from "../src/lib/server/maswali-notify.ts";
import { unrefundedVoids } from "../src/lib/server/maswali-void.ts";

const APPLY = process.argv.includes("--apply");
const url = process.env.DATABASE_URL ?? "";
if (!url) { console.error("✗ DATABASE_URL is not set. Run this through `railway run` so the target is explicit."); process.exit(1); }
console.log(`target: ${(() => { try { return new URL(url).host; } catch { return "unparseable"; } })()}`);
console.log(`mode:   ${APPLY ? "APPLY — the reconcile runs once" : "DRY RUN — nothing will be written"}\n`);

const weeks = await listConsoleWeeks();
for (const w of weeks.filter((x) => x.state !== "SETTLED" && x.state !== "VOIDED")) {
  console.log(`${w.code.padEnd(16)} ${w.state.padEnd(10)} closes ${w.closesAt} · tickets ${w.ticketCount} · sealed ${w.sealed}/15${w.voidCertain ? " · VOIDS WHOLE" : ""}`);
}
for (const w of await unrefundedVoids()) {
  console.log(`${w.code.padEnd(16)} ${"VOIDED".padEnd(10)} tickets ${w.ticketCount} · REFUNDS NOT LANDED — the reconcile resumes them`);
}
const alerts = await consoleAlerts();
console.log(alerts.length ? `\n${alerts.map((a) => `${a.level === "critical" ? "!!" : " !"} ${a.text}`).join("\n")}` : "\nnothing is stuck.");
if (!APPLY) process.exit(0);
const r = await reconcileMaswaliWeeks();
console.log(`\n✓ reconcile: closed ${r.closed} · voided ${r.voided} · void proposals ${r.proposals} · failures ${r.failures}`);
const notices = await reconcileMillioneaNotices(new Date(), { force: true });
await settleMillioneaNotices();
console.log(`✓ notices: ${notices.considered} recent week(s) read · ${notices.reran} re-run for what was missing · ${notices.skipped} left to the process holding the week's lease`);
// E-66 · the reconcile audits fire-and-forget (a close, a void, a week's refunds): drain the queue before the exit.
await auditFlush();
process.exit(r.failures > 0 ? 1 : 0);
