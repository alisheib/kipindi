/**
 * OPS — THE SETTLEMENT SWITCH. Move Up & Down onto the dated 1-minute bar reader, and put
 *       the winning band on the tick floor.
 *
 *   railway run -s 50pick -- npx tsx scripts/ops-updown-switch-reader.mts --actor "<name>" --reason "<why>"
 *   railway run -s 50pick -- npx tsx scripts/ops-updown-switch-reader.mts --actor "<name>" --reason "<why>" --apply
 *
 * Dry run is the DEFAULT. Nothing is written without `--apply`.
 *
 * ── WHY THIS EXISTS AS A SCRIPT AND NOT A CLICK ──────────────────────────────
 * ⛔ IT SHOULD BE A CLICK, AND IT CANNOT BE — for a reason already on the record.
 * `/admin/updown`'s VIEW gate is `trading`, while the reading-method and threshold controls
 * demand `accounting`. So the TRADING officer sees them rendered locked, and FINANCE — the one
 * non-Owner role holding `accounting` act — **cannot open the page at all** (driven live
 * 2026-08-04: *"Your role cannot view this page."*). `control-gates.ts` states the consequence
 * verbatim: **"these five controls are Owner-only in practice"**, and §6m records that whether
 * a non-Owner should be able to turn the price feed on is Ali's decision.
 *
 * ⚠️ So this is NOT a new finding and must not be re-filed. It is the documented state, and
 * this script is how the switch is performed until Ali decides otherwise.
 *
 * ── WHAT IT CHANGES, AND WHY EACH ONE MATTERS ────────────────────────────────
 *  1. `feedProvider` → `twelvedata-bars`. A quote can only answer "the price NOW", so a missed
 *     instant voids the round forever — E-69, E-63 and E-68 are all that one choice. A dated
 *     bar returns the same number six hours later, which is what makes a late close harmless.
 *  2. `defaultMarginBps` → 0, i.e. **the tick floor**. ⚠️ THE PERSISTED VALUE WINS OVER THE
 *     CODE DEFAULT, so shipping `defaultMarginBps: 0` in `DEFAULT_UPDOWN_CONFIG` changed
 *     nothing on production — the stored 50 (0.5%) was still pricing every chain, which is a
 *     ±$316 band on a 5-minute BTC round. Read off production before this ran: every chain
 *     showed `0.50% ·def`.
 *
 * ⛔ IT IS THE ROLLBACK LEVER TOO. Re-running with `--provider twelvedata` returns settlement
 * to the quote reader in one audited edit, with no deploy.
 *
 * Goes through `setUpDownConfig` — the same service function the console calls — so the audit
 * entry is written with a NAMED ACTOR exactly as if an operator had clicked.
 */
// ⛔ REWRITE THE DB HOST BEFORE ANY IMPORT, AND USE DYNAMIC IMPORTS BELOW.
//
// `railway run` injects the SERVICE's `DATABASE_URL`, which names `postgres.railway.internal` —
// unreachable from a laptop. A STATIC import would construct the Prisma client before this line
// runs, so the rewrite would arrive too late.
//
// 🔴 AND THE FAILURE IS SILENT, WHICH IS THE DANGEROUS PART. `loadConfig` catches its own error
// and returns null, so the service falls back to `DEFAULT_UPDOWN_CONFIG`. The first version of
// this script printed a confident "BEFORE — feedProvider mock, defaultMarginBps 0" that was
// pure fiction from a failed connection — and on an `--apply` run it would have written a
// config assembled from defaults over production's real one. §0's rule again: a check that
// reports success without reaching the thing it names.
process.env.DATABASE_URL = (process.env.DATABASE_URL ?? "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
if (!process.env.DATABASE_URL) {
  console.error("✗ no DATABASE_URL — run under `railway run --service 50pick --`");
  process.exit(2);
}

const { getUpDownConfig, setUpDownConfig } = await import("../src/lib/server/updown-config.ts");
const { isFeedProviderId } = await import("../src/lib/updown-providers.ts");
const { prisma } = await import("../src/lib/server/prisma.ts");

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1]!.startsWith("--") ? process.argv[i + 1]! : null;
}
const APPLY = process.argv.includes("--apply");
const ACTOR = arg("actor");
const REASON = arg("reason");
const PROVIDER = arg("provider") ?? "twelvedata-bars";
const MARGIN_BPS = Number(arg("margin-bps") ?? "0");

const url = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("✗ DATABASE_URL is not set. Run this through `railway run` so the target is explicit.");
  process.exit(1);
}
if (!ACTOR || !REASON) {
  console.error('✗ --actor "<name>" and --reason "<why>" are both required.');
  console.error("  This changes what settles real money; the audit trail must name who and why.");
  process.exit(1);
}
if (!isFeedProviderId(PROVIDER)) {
  console.error(`✗ "${PROVIDER}" is not a known reading method.`);
  process.exit(1);
}
if (!Number.isInteger(MARGIN_BPS) || MARGIN_BPS < 0 || MARGIN_BPS > 2000) {
  console.error(`✗ --margin-bps must be a whole number 0-2000. Got "${MARGIN_BPS}".`);
  process.exit(1);
}

console.log(`target:   ${(() => { try { return new URL(url).host; } catch { return "unparseable"; } })()}`);
console.log(`actor:    ${ACTOR}`);
console.log(`reason:   ${REASON}`);
console.log(`mode:     ${APPLY ? "APPLY — production settlement changes" : "DRY RUN — nothing will be written"}\n`);

// ⛔ PROVE THE DATABASE IS REACHABLE BEFORE READING A SINGLE VALUE.
//
// `loadConfig` swallows its own connection error and returns null, so every field below would
// silently be a DEFAULT rather than production's real value — and this script would then write
// those defaults back over the live config. The read has to fail LOUDLY, not politely.
{
  const client = prisma();
  const row = client ? await client.systemConfig.findUnique({ where: { key: "updown.config" } }).catch((e: Error) => e) : null;
  if (!client || row instanceof Error) {
    console.error(`\n✗ CANNOT REACH THE DATABASE — refusing to read or write.`);
    console.error(`  ${row instanceof Error ? row.message.split("\n")[0] : "no prisma client"}`);
    console.error(`  Every value below would be a DEFAULT, not production's, and --apply would`);
    console.error(`  write those defaults over the live settlement config.`);
    process.exit(2);
  }
  if (!row) {
    console.error("\n✗ no `updown.config` row exists on this database — is this the right target?");
    process.exit(2);
  }
  console.log("✓ database reachable, `updown.config` row present — the values below are real.\n");
}

const before = await getUpDownConfig();
console.log("── BEFORE ──");
console.log(`  feedProvider      ${before.feedProvider}`);
console.log(`  defaultMarginBps  ${before.defaultMarginBps}  (${(before.defaultMarginBps / 100).toFixed(2)}%)`);
console.log(`  marginSchedule    ${JSON.stringify(before.marginSchedule ?? [])}`);
console.log(`  observationMethod ${before.observationMethod}\n`);

console.log("── WOULD BECOME ──");
console.log(`  feedProvider      ${PROVIDER}`);
console.log(`  defaultMarginBps  ${MARGIN_BPS}  (${(MARGIN_BPS / 100).toFixed(2)}%)`);
console.log(`  marginSchedule    []   (empty — every duration falls through to the default)\n`);

if (!APPLY) {
  console.log("DRY RUN — re-run with --apply to write it.");
  process.exit(0);
}

const r = await setUpDownConfig(
  {
    feedProvider: PROVIDER,
    defaultMarginBps: MARGIN_BPS,
    // ⛔ EMPTY, DELIBERATELY. A surviving rung would silently re-price ONE duration while
    // every other surface still said "tick floor" — E-32's shape, arriving by omission.
    marginSchedule: [],
  },
  ACTOR,
);
if (!r.ok) {
  console.error(`\n✗ REFUSED — ${r.error}`);
  process.exit(1);
}

const after = await getUpDownConfig();
console.log("── AFTER (read back from the store, not assumed) ──");
console.log(`  feedProvider      ${after.feedProvider}`);
console.log(`  defaultMarginBps  ${after.defaultMarginBps}`);
console.log(`  marginSchedule    ${JSON.stringify(after.marginSchedule ?? [])}`);

const good = after.feedProvider === PROVIDER && after.defaultMarginBps === MARGIN_BPS;
console.log(good
  ? "\n✅ settlement now reads DATED BARS at the tick floor. A late close settles instead of voiding."
  : "\n🔴 the store did not take the change — investigate before opening a round.");

// ⛔ E-66 · FLUSH THE AUDIT QUEUE BEFORE THIS PROCESS ENDS. `audit()` is fire-and-forget onto a
// serialised HMAC queue; a web process drains it, a script does not. Measured on production:
// four chain stops produced exactly ONE audit row, and the missing three cannot be added
// afterwards because an `AuditLog` row is HMAC-linked and forging one is forbidden.
const { auditFlush } = await import("../src/lib/server/audit.ts");
await auditFlush();
process.exit(good ? 0 : 1);
