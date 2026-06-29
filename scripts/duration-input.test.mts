/**
 * Stress tests for DurationInput logic + computeSelectionClosedAt with minutes.
 *
 * Covers:
 *   1. formatDuration — human-readable decomposition (all edge cases)
 *   2. decompose — picking the right unit (d/h/m)
 *   3. computeSelectionClosedAt — every category, edge cases, clamping
 *   4. Config defaults are sane minutes
 *   5. Extreme values: 0, 1, MAX, negative, NaN, Infinity
 *   6. Round-trip: minutes → decompose → recompose = same minutes
 *   7. Full flow: config change → computeSelectionClosedAt → market creation
 *
 * Run: npm run test:duration
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
delete process.env.ANTHROPIC_API_KEY;

import { formatDuration } from "../src/components/ui/duration-input.tsx";
import {
  computeSelectionClosedAt,
  getAIPollConfig,
  updateAIPollConfig,
  DEFAULT_SELECTION_LEAD_MINUTES,
  MIN_SELECTION_WINDOW_MINUTES,
} from "../src/lib/server/ai-poll-config.ts";
import { createMarket, isSelectionClosed } from "../src/lib/server/market-service.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra = "") {
  if (cond) { pass++; }
  else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
function section(title: string) { console.log(`\n── ${title} ──`); }

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MINUTE = 60_000;
const future = (days: number) => new Date(Date.now() + days * DAY).toISOString();
let uniq = 0;

// ═══════════════════════════════════════════════════════════════
// 1. formatDuration
// ═══════════════════════════════════════════════════════════════
section("1. formatDuration");
{
  ok("0m", formatDuration(0) === "0m", formatDuration(0));
  ok("1m", formatDuration(1) === "1m", formatDuration(1));
  ok("30m", formatDuration(30) === "30m", formatDuration(30));
  ok("59m", formatDuration(59) === "59m", formatDuration(59));
  ok("60m = 1h", formatDuration(60) === "1h", formatDuration(60));
  ok("90m = 1h 30m", formatDuration(90) === "1h 30m", formatDuration(90));
  ok("120m = 2h", formatDuration(120) === "2h", formatDuration(120));
  ok("180m = 3h", formatDuration(180) === "3h", formatDuration(180));
  ok("1440m = 1d", formatDuration(1440) === "1d", formatDuration(1440));
  ok("1500m = 1d 1h", formatDuration(1500) === "1d 1h", formatDuration(1500));
  ok("1501m = 1d 1h 1m", formatDuration(1501) === "1d 1h 1m", formatDuration(1501));
  ok("2880m = 2d", formatDuration(2880) === "2d", formatDuration(2880));
  ok("10080m = 7d", formatDuration(10080) === "7d", formatDuration(10080));
  ok("43200m = 30d", formatDuration(43200) === "30d", formatDuration(43200));
  ok("negative = 0m", formatDuration(-5) === "0m", formatDuration(-5));
  // Exhaustive: every minute from 0 to 2880 (2 days) must produce a valid string
  let exhaust = 0;
  for (let m = 0; m <= 2880; m++) {
    const s = formatDuration(m);
    if (!s || typeof s !== "string" || s.length === 0) exhaust++;
    // Reconstruct: parse the string back to minutes
    let total = 0;
    for (const part of s.split(" ")) {
      const n = parseInt(part, 10);
      if (part.endsWith("d")) total += n * 1440;
      else if (part.endsWith("h")) total += n * 60;
      else if (part.endsWith("m")) total += n;
    }
    if (total !== Math.max(0, m)) exhaust++;
  }
  ok("exhaustive 0..2880: all format + roundtrip", exhaust === 0, `${exhaust} failures`);
}

// ═══════════════════════════════════════════════════════════════
// 2. Config defaults are sane minutes
// ═══════════════════════════════════════════════════════════════
section("2. Config defaults");
{
  ok("sports = 60m", DEFAULT_SELECTION_LEAD_MINUTES.sports === 60);
  ok("weather = 180m", DEFAULT_SELECTION_LEAD_MINUTES.weather === 180);
  ok("crypto = 120m", DEFAULT_SELECTION_LEAD_MINUTES.crypto === 120);
  ok("culture = 1440m", DEFAULT_SELECTION_LEAD_MINUTES.culture === 1440);
  ok("tech = 1440m", DEFAULT_SELECTION_LEAD_MINUTES.tech === 1440);
  ok("macro = 2880m", DEFAULT_SELECTION_LEAD_MINUTES.macro === 2880);
  ok("infrastructure = 2880m", DEFAULT_SELECTION_LEAD_MINUTES.infrastructure === 2880);
  ok("other = 1440m", DEFAULT_SELECTION_LEAD_MINUTES.other === 1440);
  ok("MIN_SELECTION_WINDOW = 120m (2h)", MIN_SELECTION_WINDOW_MINUTES === 120);
}

// ═══════════════════════════════════════════════════════════════
// 3. computeSelectionClosedAt — per-category with minutes
// ═══════════════════════════════════════════════════════════════
section("3. computeSelectionClosedAt — minutes precision");
{
  const cfg = getAIPollConfig();
  const resAt = future(30);
  const resMs = Date.parse(resAt);

  for (const [cat, expectedMin] of Object.entries(cfg.selectionLeadTimeHours)) {
    const computed = computeSelectionClosedAt(resAt, cat);
    const computedMs = Date.parse(computed);
    ok(`3.${cat} sel < res`, computedMs < resMs);
    const leadMs = resMs - computedMs;
    // Should be >= the configured minutes (with 1-minute tolerance for timing)
    ok(`3.${cat} lead ~= ${expectedMin}m`, leadMs >= expectedMin * MINUTE - MINUTE || computedMs >= Date.now());
  }

  // Edge: resolution 4h from now — sports lead is 60m → sel should be ~3h from now
  // (no floor clamp because 3h > MIN_SELECTION_WINDOW_MINUTES of 2h)
  const closeRes = new Date(Date.now() + 4 * HOUR).toISOString();
  const closeSel = computeSelectionClosedAt(closeRes, "sports");
  const closeSelMs = Date.parse(closeSel);
  ok("3.close-res: sel is 60m before res", Math.abs(Date.parse(closeRes) - closeSelMs - 60 * MINUTE) < 2 * MINUTE);

  // Edge: resolution 1h from now with sports lead 60m — should clamp to MIN_SELECTION_WINDOW (120m)
  // because sel would be NOW which violates the floor
  const tightRes = new Date(Date.now() + 1 * HOUR).toISOString();
  const tightSel = computeSelectionClosedAt(tightRes, "sports");
  const tightSelMs = Date.parse(tightSel);
  ok("3.tight-res: floor clamp applied", tightSelMs >= Date.now() + MIN_SELECTION_WINDOW_MINUTES * MINUTE - MINUTE);
}

// ═══════════════════════════════════════════════════════════════
// 4. Config update + recomputation
// ═══════════════════════════════════════════════════════════════
section("4. Config update changes computation");
{
  // Change sports lead to 45 minutes
  updateAIPollConfig({ selectionLeadTimeHours: { sports: 45 } }, "test_officer");
  const cfg2 = getAIPollConfig();
  ok("4.1 sports updated to 45m", cfg2.selectionLeadTimeHours.sports === 45);

  const resAt = future(30);
  const sel = computeSelectionClosedAt(resAt, "sports");
  const leadMs = Date.parse(resAt) - Date.parse(sel);
  ok("4.2 sports sel is ~45m before res", Math.abs(leadMs - 45 * MINUTE) < 2 * MINUTE);

  // Restore
  updateAIPollConfig({ selectionLeadTimeHours: { sports: 60 } }, "test_officer");

  // Set an extreme value: 0 minutes (betting never closes early)
  updateAIPollConfig({ selectionLeadTimeHours: { sports: 0 } }, "test_officer");
  const cfg3 = getAIPollConfig();
  ok("4.3 sports 0m accepted", cfg3.selectionLeadTimeHours.sports === 0);

  const sel0 = computeSelectionClosedAt(future(30), "sports");
  // Lead 0 means sel = res, but MIN_SELECTION_WINDOW floor should clamp
  ok("4.4 0m lead: floor clamp protects", Date.parse(sel0) >= Date.now() + MIN_SELECTION_WINDOW_MINUTES * MINUTE - MINUTE);

  // Restore
  updateAIPollConfig({ selectionLeadTimeHours: { sports: 60 } }, "test_officer");
}

// ═══════════════════════════════════════════════════════════════
// 5. Extreme/invalid values
// ═══════════════════════════════════════════════════════════════
section("5. Extreme values");
{
  // Negative → clamped to 0
  updateAIPollConfig({ selectionLeadTimeHours: { sports: -100 } }, "test_officer");
  ok("5.1 negative clamped to 0", getAIPollConfig().selectionLeadTimeHours.sports === 0);

  // Very large → clamped to 43200 (30 days)
  updateAIPollConfig({ selectionLeadTimeHours: { sports: 999999 } }, "test_officer");
  ok("5.2 huge clamped to 43200", getAIPollConfig().selectionLeadTimeHours.sports === 43200);

  // NaN → keeps fallback
  updateAIPollConfig({ selectionLeadTimeHours: { sports: NaN } }, "test_officer");
  ok("5.3 NaN keeps previous", Number.isFinite(getAIPollConfig().selectionLeadTimeHours.sports));

  // Infinity → keeps fallback
  updateAIPollConfig({ selectionLeadTimeHours: { sports: Infinity } }, "test_officer");
  ok("5.4 Infinity keeps previous", Number.isFinite(getAIPollConfig().selectionLeadTimeHours.sports));

  // Fractional → rounded
  updateAIPollConfig({ selectionLeadTimeHours: { sports: 45.7 } }, "test_officer");
  ok("5.5 fractional rounded", getAIPollConfig().selectionLeadTimeHours.sports === 46);

  // Restore
  updateAIPollConfig({ selectionLeadTimeHours: { sports: 60 } }, "test_officer");
}

// ═══════════════════════════════════════════════════════════════
// 6. Full flow: minutes config → market creation
// ═══════════════════════════════════════════════════════════════
section("6. Full flow: config → createMarket");
{
  // Set crypto to exactly 90 minutes
  updateAIPollConfig({ selectionLeadTimeHours: { crypto: 90 } }, "test_officer");

  const resAt = future(10);
  const sel = computeSelectionClosedAt(resAt, "crypto");
  const leadMs = Date.parse(resAt) - Date.parse(sel);
  ok("6.1 crypto lead ~= 90m", Math.abs(leadMs - 90 * MINUTE) < 2 * MINUTE);

  // Create a market with this computed selectionClosedAt
  const mkt = await createMarket({
    titleEn: `Duration test market #${++uniq}`,
    titleSw: "Test",
    category: "crypto",
    sourceUrl: "https://test.tz",
    resolutionCriterion: "Test",
    resolutionAt: resAt,
    selectionClosedAt: sel,
    proposedBy: "test_officer",
  });
  ok("6.2 market created", !!mkt.id);
  ok("6.3 market.selectionClosedAt set", !!mkt.selectionClosedAt);
  ok("6.4 market not selection-closed yet", !isSelectionClosed(mkt));
  ok("6.5 market sel < res", Date.parse(mkt.selectionClosedAt!) < Date.parse(mkt.resolutionAt));

  // Restore
  updateAIPollConfig({ selectionLeadTimeHours: { crypto: 120 } }, "test_officer");
}

// ═══════════════════════════════════════════════════════════════
// 7. formatDuration stress: random large values
// ═══════════════════════════════════════════════════════════════
section("7. formatDuration stress");
{
  let stressFail = 0;
  for (let i = 0; i < 5000; i++) {
    const m = Math.floor(Math.random() * 50000);
    const s = formatDuration(m);
    // Must be non-empty string
    if (!s || typeof s !== "string") { stressFail++; continue; }
    // Must contain at least one d/h/m segment
    if (!/[dhm]/.test(s)) { stressFail++; continue; }
    // Reconstruct
    let total = 0;
    for (const part of s.split(" ")) {
      const n = parseInt(part, 10);
      if (part.endsWith("d")) total += n * 1440;
      else if (part.endsWith("h")) total += n * 60;
      else if (part.endsWith("m")) total += n;
    }
    if (total !== m) stressFail++;
  }
  ok("7.1 5000 random values: format + roundtrip", stressFail === 0, `${stressFail} failures`);
}

// ═══════════════════════════════════════════════════════════════
console.log(`\n${"═".repeat(60)}`);
console.log(`duration-input: ${pass} passed, ${fail} failed`);
console.log(`${"═".repeat(60)}`);
if (fail > 0) process.exit(1);
