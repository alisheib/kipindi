/**
 * OPS — PAUSE or RESUME Millionea SALES. Containment, not configuration (MASWALI-BUILD S4 item 8; MB-62, MB-78).
 *
 *   railway run npx tsx scripts/ops-maswali-pause.mts --actor "<name>" --reason "<why>"            (dry run: what it would do)
 *   railway run npx tsx scripts/ops-maswali-pause.mts --actor "<name>" --reason "<why>" --apply    (pauses)
 *   railway run npx tsx scripts/ops-maswali-pause.mts --actor "<name>" --reason "<why>" --resume --apply
 *
 * Dry run is the DEFAULT. Nothing is written without `--apply`.
 * Goes through `pauseMaswaliSales` / `resumeMaswaliSales`, the functions the integrity page's control calls, so the audit
 * rows are written with a NAMED actor exactly as if a compliance officer had pressed it. A pause stops sales only: the
 * week's close, its seals, its settlement, every refund and every free cancel go on.
 */
import { getSalesPause, pauseMaswaliSales, resumeMaswaliSales, readSalesPauseFresh } from "../src/lib/server/maswali-pause.ts";

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : null;
}
const APPLY = process.argv.includes("--apply");
const RESUME = process.argv.includes("--resume");
const ACTOR = arg("actor");
const REASON = arg("reason");

const url = process.env.DATABASE_URL ?? "";
if (!url) { console.error("✗ DATABASE_URL is not set. Run this through `railway run` so the target is explicit."); process.exit(1); }
if (!ACTOR || !REASON) { console.error('✗ --actor "<name>" and --reason "<why>" are both required: this writes a compliance record.'); process.exit(1); }

console.log(`target: ${(() => { try { return new URL(url).host; } catch { return "unparseable"; } })()}`);
console.log(`actor:  ${ACTOR}\nreason: ${REASON}`);
console.log(`mode:   ${APPLY ? `APPLY — sales will be ${RESUME ? "RESUMED" : "PAUSED"}` : "DRY RUN — nothing will be written"}\n`);

const now = await readSalesPauseFresh();
console.log(`now:    ${now.paused ? `PAUSED since ${now.at} by ${now.by}: ${now.reason}` : "selling"}`);
if (!APPLY) { console.log(`\nwould ${RESUME ? "resume" : "pause"} sales. Add --apply to do it.`); process.exit(0); }

const r = RESUME ? await resumeMaswaliSales({ officerId: ACTOR, note: REASON }) : await pauseMaswaliSales({ officerId: ACTOR, reason: REASON });
if (!r.ok) { console.error(`✗ ${r.error}`); process.exit(1); }
const after = getSalesPause();
console.log(`✓ ${after.paused ? `PAUSED: ${after.reason}` : "selling"}`);
