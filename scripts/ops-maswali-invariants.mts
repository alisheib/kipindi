/**
 * OPS — THE MILLIONEA INVARIANT REPORT, on demand (MASWALI-BUILD S4 item 8). Read-only; there is no `--apply`.
 *
 *   railway run npx tsx scripts/ops-maswali-invariants.mts
 *
 * The same five checks the lifecycle runs nightly (`maswali-invariants.ts`): every settled week's pool at 0, its columns
 * closing, the jackpots equal to their weeks and forfeits, at most one claimed carry outstanding, the guarantee covering
 * the unsettled weeks, every count equal to its tickets. Exit 1 when one is broken.
 */
import { checkMaswaliInvariants } from "../src/lib/server/maswali-invariants.ts";

const url = process.env.DATABASE_URL ?? "";
if (!url) { console.error("✗ DATABASE_URL is not set. Run this through `railway run` so the target is explicit."); process.exit(1); }
console.log(`target: ${(() => { try { return new URL(url).host; } catch { return "unparseable"; } })()}\n`);
const r = await checkMaswaliInvariants();
if (r.ok) { console.log(`✓ every Millionea invariant holds over ${r.weeks} week(s).`); process.exit(0); }
console.log(`✗ ${r.problems.length} broken:\n${r.problems.map((p) => `  · ${p}`).join("\n")}`);
process.exit(1);
