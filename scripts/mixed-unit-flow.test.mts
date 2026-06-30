/**
 * Mixed-unit end-to-end flow test.
 *
 * Sets different categories to different units (days/hours/minutes), then:
 *   1. Generates normal AI polls for each — verifies selectionClosedAt is
 *      computed correctly per category
 *   2. Generates controlled polls with explicit dates — verifies the operator
 *      dates override, and that the backstop (sel < res) fires
 *   3. Edits polls — changes resolutionAt, verifies selectionClosedAt recomputes
 *   4. Publishes polls → creates live markets — verifies dates propagate
 *   5. Places bets — verifies selection-close blocking at minute precision
 *   6. Runs selection-closed sweep — verifies notifications fire at the right time
 *   7. Runs resolution-due sweep — verifies officer alerts
 *   8. Simulates sentinel closure — verifies the two-officer dance
 *
 * Run: npm run test:mixed-flow
 */
delete process.env.ANTHROPIC_API_KEY;
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import {
  generateAIPoll, editAIPoll, approveAIPoll, markAIPollPublished,
  getAIPoll, type StoredAIPoll,
} from "../src/lib/server/ai-poll-generation.ts";
import {
  computeSelectionClosedAt, getAIPollConfig, updateAIPollConfig,
  DEFAULT_SELECTION_LEAD_MINUTES, MIN_SELECTION_WINDOW_MINUTES,
} from "../src/lib/server/ai-poll-config.ts";
import { setAIProvider, type AIProvider, type AIPollGeneration } from "../src/lib/server/ai-provider.ts";
import {
  createMarket, getMarket, buyPosition, isSelectionClosed, isClosedByTime,
  notifySelectionClosedMarkets, notifyDueMarketsForResolution,
  resolveMarket,
} from "../src/lib/server/market-service.ts";
import { marketStore, positionStore } from "../src/lib/server/market-dal.ts";
import { listForUser } from "../src/lib/server/notification-service.ts";
import { formatDuration } from "../src/components/ui/duration-input.tsx";
import { db } from "../src/lib/server/store.ts";

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
const futureMin = (m: number) => new Date(Date.now() + m * MINUTE).toISOString();
const ago = (mins: number) => new Date(Date.now() - mins * MINUTE).toISOString();
const iso = new Date().toISOString();

let uniq = 0;
const actorId = "off_mixed_test";

// ── Provider ──
class TestProvider implements AIProvider {
  name = "test-mixed";
  private cat: string;
  constructor(cat: string) { this.cat = cat; }
  async ideate() { return { ok: true, ideas: [], tokensUsed: 0, costUsd: 0 }; }
  async generate(): Promise<{ ok: true } & Record<string, unknown>> {
    const gen: AIPollGeneration = {
      titleEn: `Mixed-unit test ${this.cat} #${++uniq}`,
      titleSw: `Test SW ${uniq}`,
      titleZh: `测试 ${uniq}`,
      category: this.cat,
      resolutionCriterion: "Official result announced.",
      resolutionAt: future(14),
      options: [{ label: "YES" }, { label: "NO" }] as never,
      sources: [{ url: "https://source.tz/test", publisher: "Test Source" }],
      confidence: 85,
      reasoning: "test poll",
    };
    return { ok: true, generation: gen, tokensUsed: 1, costUsd: 0, latencyMs: 1, rawResponse: "{}" } as never;
  }
}

// ── Setup ──
async function mkUser(id: string, email: string | null = null) {
  try {
    await db.user.create({
      id, phoneE164: `+25572${id.slice(-7).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
      failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
      displayName: id, dob: "1990-01-01", region: "TZ", acceptedTermsVersion: "v1",
      acceptedTermsAt: iso, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
      email, emailVerifiedAt: null, createdAt: iso, updatedAt: iso, lastLoginAt: iso, closedAt: null,
    });
    await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 1_000_000, bonusBalance: 0, status: "ACTIVE", createdAt: iso, updatedAt: iso });
  } catch { /* exists */ }
}
async function mkOfficer(id: string) {
  try {
    await db.user.create({
      id, phoneE164: `+25572${id.slice(-7).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
      failedLoginCount: 0, lockedUntil: null, role: "ADMIN", status: "ACTIVE", locale: "EN",
      displayName: id, dob: "1990-01-01", region: "TZ", acceptedTermsVersion: "v1",
      acceptedTermsAt: iso, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
      email: `${id}@admin.tz`, emailVerifiedAt: iso, createdAt: iso, updatedAt: iso, lastLoginAt: iso, closedAt: null,
    });
  } catch { /* exists */ }
}

await mkUser("usr_mf_player", "mfplayer@test.tz");
await mkOfficer("off_mf_alice");
await mkOfficer("off_mf_bob");

// ═══════════════════════════════════════════════════════════════
// STEP 0: Set mixed lead times — days, hours, minutes
// ═══════════════════════════════════════════════════════════════
section("0. Set mixed lead times per category");
{
  updateAIPollConfig({
    selectionLeadTimeHours: {
      sports: 45,          // 45 minutes
      crypto: 120,         // 2 hours
      weather: 360,        // 6 hours
      culture: 1440,       // 1 day
      tech: 2160,          // 1.5 days (1d 12h)
      macro: 4320,         // 3 days
      infrastructure: 7200,// 5 days
      other: 720,          // 12 hours
    },
  }, actorId);

  const cfg = getAIPollConfig();
  ok("0.1 sports = 45m", cfg.selectionLeadTimeHours.sports === 45);
  ok("0.2 crypto = 120m", cfg.selectionLeadTimeHours.crypto === 120);
  ok("0.3 weather = 360m", cfg.selectionLeadTimeHours.weather === 360);
  ok("0.4 culture = 1440m", cfg.selectionLeadTimeHours.culture === 1440);
  ok("0.5 tech = 2160m", cfg.selectionLeadTimeHours.tech === 2160);
  ok("0.6 macro = 4320m", cfg.selectionLeadTimeHours.macro === 4320);
  ok("0.7 infra = 7200m", cfg.selectionLeadTimeHours.infrastructure === 7200);
  ok("0.8 other = 720m", cfg.selectionLeadTimeHours.other === 720);

  // Verify formatDuration renders correctly
  ok("0.9 45m renders '45m'", formatDuration(45) === "45m");
  ok("0.10 120m renders '2h'", formatDuration(120) === "2h");
  ok("0.11 360m renders '6h'", formatDuration(360) === "6h");
  ok("0.12 1440m renders '1d'", formatDuration(1440) === "1d");
  ok("0.13 2160m renders '1d 12h'", formatDuration(2160) === "1d 12h");
  ok("0.14 4320m renders '3d'", formatDuration(4320) === "3d");
  ok("0.15 7200m renders '5d'", formatDuration(7200) === "5d");
}

// ═══════════════════════════════════════════════════════════════
// STEP 1: Generate normal AI polls — one per category
// ═══════════════════════════════════════════════════════════════
section("1. Normal AI polls — selectionClosedAt per category");
const pollsByCategory: Record<string, StoredAIPoll> = {};
{
  const categories = ["sports", "crypto", "weather", "culture", "tech", "macro"];
  const cfg = getAIPollConfig();

  for (const cat of categories) {
    setAIProvider(new TestProvider(cat));
    const poll = await generateAIPoll({ category: cat, actorId });
    ok(`1.${cat} reaches PENDING_REVIEW`, poll.state === "PENDING_REVIEW", `state=${poll.state} reasons=${poll.filterReasons}`);
    ok(`1.${cat} has selectionClosedAt`, !!poll.selectionClosedAt);

    // Verify the lead time matches the configured minutes
    const leadMs = Date.parse(poll.resolutionAt) - Date.parse(poll.selectionClosedAt!);
    const configuredMin = cfg.selectionLeadTimeHours[cat] ?? 1440;
    ok(`1.${cat} lead ~= ${configuredMin}m (${formatDuration(configuredMin)})`,
       Math.abs(leadMs - configuredMin * MINUTE) < 2 * MINUTE,
       `actual=${Math.round(leadMs / MINUTE)}m expected=${configuredMin}m`);

    ok(`1.${cat} sel < res`, Date.parse(poll.selectionClosedAt!) < Date.parse(poll.resolutionAt));
    pollsByCategory[cat] = poll;
  }
}

// ═══════════════════════════════════════════════════════════════
// STEP 2: Controlled polls — operator dates with minute precision
// ═══════════════════════════════════════════════════════════════
section("2. Controlled polls — operator dates with minute precision");
{
  setAIProvider(new TestProvider("sports"));

  // 2a: Operator sets selection close exactly 30 minutes before resolution
  const resAt = future(7);
  const selAt = new Date(Date.parse(resAt) - 30 * MINUTE).toISOString();
  const p1 = await generateAIPoll({
    category: "sports", actorId,
    controlledResolutionAt: resAt,
    controlledSelectionClosedAt: selAt,
  });
  ok("2a.1 controlled poll PENDING", p1.state === "PENDING_REVIEW", p1.state);
  ok("2a.2 operator selectionClosedAt preserved", p1.selectionClosedAt === selAt);
  const lead = Date.parse(p1.resolutionAt) - Date.parse(p1.selectionClosedAt!);
  ok("2a.3 lead is exactly 30 minutes", Math.abs(lead - 30 * MINUTE) < MINUTE);

  // 2b: Operator sets selection AFTER resolution → auto-corrected
  setAIProvider(new TestProvider("crypto"));
  const resAt2 = future(5);
  const badSel = new Date(Date.parse(resAt2) + 2 * HOUR).toISOString(); // AFTER!
  const p2 = await generateAIPoll({
    category: "crypto", actorId,
    controlledResolutionAt: resAt2,
    controlledSelectionClosedAt: badSel,
  });
  ok("2b.1 sel after res → auto-corrected", Date.parse(p2.selectionClosedAt!) < Date.parse(p2.resolutionAt),
     `sel=${p2.selectionClosedAt} res=${p2.resolutionAt}`);
  // Should fall back to crypto's configured lead (120m)
  const correctedLead = Date.parse(p2.resolutionAt) - Date.parse(p2.selectionClosedAt!);
  ok("2b.2 corrected to crypto lead (120m)", Math.abs(correctedLead - 120 * MINUTE) < 2 * MINUTE,
     `lead=${Math.round(correctedLead / MINUTE)}m`);

  // 2c: Operator sets very tight selection (5 min before res) — should work (no min lead on controlled)
  setAIProvider(new TestProvider("weather"));
  const resAt3 = future(10);
  const tightSel = new Date(Date.parse(resAt3) - 5 * MINUTE).toISOString();
  const p3 = await generateAIPoll({
    category: "weather", actorId,
    controlledResolutionAt: resAt3,
    controlledSelectionClosedAt: tightSel,
  });
  ok("2c.1 tight 5m sel accepted", p3.selectionClosedAt === tightSel);
}

// ═══════════════════════════════════════════════════════════════
// STEP 3: Edit polls — change resolution, verify recomputation
// ═══════════════════════════════════════════════════════════════
section("3. Edit poll — resolutionAt change recomputes selectionClosedAt");
{
  const poll = pollsByCategory.sports;
  const originalSel = poll.selectionClosedAt;

  // Edit resolution to 21 days out
  const newRes = future(21);
  const edited = await editAIPoll(poll.id, { officerId: actorId, resolutionAt: newRes });
  ok("3.1 edit succeeds", edited?.state === "PENDING_REVIEW", edited?.state);
  ok("3.2 selectionClosedAt changed", edited?.selectionClosedAt !== originalSel);
  // Should be 45 minutes (sports lead) before new resolution
  const editedLead = Date.parse(edited!.resolutionAt) - Date.parse(edited!.selectionClosedAt!);
  ok("3.3 lead recomputed to sports 45m", Math.abs(editedLead - 45 * MINUTE) < 2 * MINUTE,
     `lead=${Math.round(editedLead / MINUTE)}m`);

  // Edit with explicit selectionClosedAt override (2 hours before res)
  const explicitSel = new Date(Date.parse(newRes) - 2 * HOUR).toISOString();
  const edited2 = await editAIPoll(poll.id, { officerId: actorId, selectionClosedAt: explicitSel });
  ok("3.4 explicit selectionClosedAt preserved", edited2?.selectionClosedAt === explicitSel);
}

// ═══════════════════════════════════════════════════════════════
// STEP 4: Approve + publish → live market with correct dates
// ═══════════════════════════════════════════════════════════════
section("4. Publish polls → live markets with correct dates");
const markets: Record<string, { id: string; selectionClosedAt: string | null; resolutionAt: string }> = {};
{
  for (const cat of ["sports", "crypto", "culture"]) {
    const poll = pollsByCategory[cat];
    if (!poll) continue;

    // Refresh (may have been edited)
    const fresh = await getAIPoll(poll.id);
    if (!fresh || fresh.state !== "PENDING_REVIEW") continue;

    await approveAIPoll(fresh.id, { officerId: actorId });
    const market = await createMarket({
      titleEn: fresh.titleEn,
      titleSw: fresh.titleSw || fresh.titleEn,
      category: cat as "sports" | "crypto" | "culture",
      sourceUrl: fresh.sources[0]?.url ?? "",
      resolutionCriterion: fresh.resolutionCriterion,
      resolutionAt: fresh.resolutionAt,
      selectionClosedAt: fresh.selectionClosedAt,
      proposedBy: actorId,
    });
    await markAIPollPublished(fresh.id, { candidateId: `cand_${cat}`, marketId: market.id, officerId: actorId });

    ok(`4.${cat} market LIVE`, market.status === "LIVE");
    ok(`4.${cat} market.sel matches poll`, market.selectionClosedAt === fresh.selectionClosedAt);
    ok(`4.${cat} market.res matches poll`, market.resolutionAt === fresh.resolutionAt);
    markets[cat] = { id: market.id, selectionClosedAt: market.selectionClosedAt, resolutionAt: market.resolutionAt };
  }
}

// ═══════════════════════════════════════════════════════════════
// STEP 5: Bet placement — selection close blocking
// ═══════════════════════════════════════════════════════════════
section("5. Bet placement — selection close at minute precision");
{
  // Create a market with selection closing 2 minutes ago (minute precision test)
  const mkt = await createMarket({
    titleEn: `Minute-precision close #${++uniq}`, titleSw: "T", category: "sports",
    sourceUrl: "https://test.tz", resolutionCriterion: "Test",
    resolutionAt: futureMin(180), // 3h from now
    selectionClosedAt: futureMin(60), // 1h from now — still open
    proposedBy: actorId,
  });
  ok("5.1 market is LIVE", mkt.status === "LIVE");
  ok("5.2 selection NOT closed (1h from now)", !isSelectionClosed(mkt));

  // Bet should succeed
  const bet1 = await buyPosition("usr_mf_player", { marketId: mkt.id, side: "YES", stake: 1000 });
  ok("5.3 bet succeeds before selection close", bet1.ok);

  // Now backdate the selectionClosedAt to 2 minutes ago
  const mktFresh = await marketStore.get(mkt.id) as any;
  mktFresh.selectionClosedAt = ago(2);
  await marketStore.set(mktFresh);

  // Bet should now fail
  const bet2 = await buyPosition("usr_mf_player", { marketId: mkt.id, side: "NO", stake: 1000 });
  ok("5.4 bet blocked after selection close", !bet2.ok);
  ok("5.5 error code SELECTION_CLOSED", (bet2 as any).code === "SELECTION_CLOSED");

  // isSelectionClosed should return true
  const updated = await getMarket(mkt.id);
  ok("5.6 isSelectionClosed() true", isSelectionClosed(updated!));
  ok("5.7 isClosedByTime() false (resolution still future)", !isClosedByTime(updated!));
}

// ═══════════════════════════════════════════════════════════════
// STEP 6: Selection-closed notification sweep
// ═══════════════════════════════════════════════════════════════
section("6. Selection-closed notification sweep");
{
  // Create a market with selection closed + an open position
  const mkt = await createMarket({
    titleEn: `Notify sweep mixed #${++uniq}`, titleSw: "T", category: "crypto",
    sourceUrl: "https://test.tz", resolutionCriterion: "Test",
    resolutionAt: futureMin(600), // 10h from now
    selectionClosedAt: futureMin(60), // 1h from now (valid at creation)
    proposedBy: actorId,
  });
  // Place a bet while open
  await buyPosition("usr_mf_player", { marketId: mkt.id, side: "YES", stake: 2000 });

  // Backdate selection close
  const mktF = await marketStore.get(mkt.id) as any;
  mktF.selectionClosedAt = ago(3);
  await marketStore.set(mktF);

  const r = await notifySelectionClosedMarkets();
  await new Promise((res) => setTimeout(res, 100));
  ok("6.1 sweep notified >= 1 market", r.notified >= 1, JSON.stringify(r));

  const bells = (await listForUser("usr_mf_player")).filter((n) => n.kind === "SELECTION_CLOSED");
  ok("6.2 player got SELECTION_CLOSED bell", bells.length >= 1, `got ${bells.length}`);

  // Idempotency
  const r2 = await notifySelectionClosedMarkets();
  ok("6.3 re-sweep is idempotent", r2.notified === 0 || r2.bettors === 0);
}

// ═══════════════════════════════════════════════════════════════
// STEP 7: Resolution-due officer alert
// ═══════════════════════════════════════════════════════════════
section("7. Resolution-due officer alert");
{
  // Create market and backdate resolution to the past
  const mkt = await createMarket({
    titleEn: `Resolution due mixed #${++uniq}`, titleSw: "T", category: "macro",
    sourceUrl: "https://test.tz", resolutionCriterion: "Test",
    resolutionAt: futureMin(60), proposedBy: actorId,
  });
  const mktR = await marketStore.get(mkt.id) as any;
  mktR.resolutionAt = ago(10);
  mktR.selectionClosedAt = ago(30);
  await marketStore.set(mktR);

  const r = await notifyDueMarketsForResolution();
  await new Promise((res) => setTimeout(res, 100));
  ok("7.1 resolution-due sweep fires", r.notified >= 1, JSON.stringify(r));
}

// ═══════════════════════════════════════════════════════════════
// STEP 8: Sentinel close → two-officer resolve → settlement
// ═══════════════════════════════════════════════════════════════
section("8. Sentinel close → two-officer dance");
{
  // Create and publish a market
  const mkt = await createMarket({
    titleEn: `Sentinel dance #${++uniq}`, titleSw: "T", category: "sports",
    sourceUrl: "https://test.tz", resolutionCriterion: "Test",
    resolutionAt: futureMin(600),
    selectionClosedAt: futureMin(60),
    proposedBy: actorId,
  });
  // Place bets
  await buyPosition("usr_mf_player", { marketId: mkt.id, side: "YES", stake: 5000 });

  // Simulate sentinel closure (set status CLOSED + sentinel fields)
  const mktS = await marketStore.get(mkt.id) as any;
  mktS.status = "CLOSED";
  mktS.sentinelOutcome = "YES";
  mktS.sentinelConfidence = 95;
  mktS.sentinelEvidence = "Match ended. Simba won 2-0.";
  mktS.sentinelClosedAt = iso;
  await marketStore.set(mktS);

  const closed = await getMarket(mkt.id);
  ok("8.1 market CLOSED by sentinel", closed?.status === "CLOSED");
  ok("8.2 sentinel outcome = YES", (closed as any)?.sentinelOutcome === "YES");

  // Stage 1 by Alice
  const s1 = await resolveMarket({ marketId: mkt.id, outcome: "YES", officerId: "off_mf_alice" });
  ok("8.3 stage-1 succeeds", s1.ok && s1.data?.stage === "stage1");

  // Stage 2 by Alice (same officer) → blocked
  const s2bad = await resolveMarket({ marketId: mkt.id, outcome: "YES", officerId: "off_mf_alice" });
  ok("8.4 same officer stage-2 blocked", !s2bad.ok);

  // Stage 2 with wrong outcome → blocked
  const s2wrong = await resolveMarket({ marketId: mkt.id, outcome: "NO", officerId: "off_mf_bob" });
  ok("8.5 mismatched outcome blocked", !s2wrong.ok);

  // Stage 2 by Bob with correct outcome → completes
  const s2ok = await resolveMarket({ marketId: mkt.id, outcome: "YES", officerId: "off_mf_bob" });
  ok("8.6 stage-2 completes", s2ok.ok && s2ok.data?.stage === "complete");

  const resolved = await getMarket(mkt.id);
  ok("8.7 status RESOLVED", resolved?.status === "RESOLVED");
  ok("8.8 resolvedOutcome YES", resolved?.resolvedOutcome === "YES");
  ok("8.9 different officers", resolved?.resolutionStage1By === "off_mf_alice" && resolved?.resolutionStage2By === "off_mf_bob");
}

// ═══════════════════════════════════════════════════════════════
// STEP 9: Edge — computeSelectionClosedAt with all configured leads
// ═══════════════════════════════════════════════════════════════
section("9. Cross-check: every category lead vs. actual computation");
{
  const cfg = getAIPollConfig();
  const resAt = future(30);
  const resMs = Date.parse(resAt);

  const checks: Array<{ cat: string; configMin: number; actualMin: number }> = [];
  for (const [cat, configMin] of Object.entries(cfg.selectionLeadTimeHours)) {
    const sel = computeSelectionClosedAt(resAt, cat);
    const selMs = Date.parse(sel);
    const actualMin = Math.round((resMs - selMs) / MINUTE);
    checks.push({ cat, configMin, actualMin });
    ok(`9.${cat}: config=${configMin}m actual=${actualMin}m`,
       Math.abs(actualMin - configMin) <= 1,
       `diff=${actualMin - configMin}m`);
  }

  // Print summary table
  console.log("\n  Category        Config    Actual    Match");
  console.log("  ─────────────── ──────── ──────── ─────");
  for (const c of checks) {
    const match = Math.abs(c.actualMin - c.configMin) <= 1 ? "✓" : "✗";
    console.log(`  ${c.cat.padEnd(17)} ${formatDuration(c.configMin).padEnd(8)} ${formatDuration(c.actualMin).padEnd(8)} ${match}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// Restore defaults
// ═══════════════════════════════════════════════════════════════
updateAIPollConfig({ selectionLeadTimeHours: { ...DEFAULT_SELECTION_LEAD_MINUTES } }, actorId);

// ═══════════════════════════════════════════════════════════════
console.log(`\n${"═".repeat(60)}`);
console.log(`mixed-unit-flow: ${pass} passed, ${fail} failed`);
console.log(`${"═".repeat(60)}`);
if (fail > 0) process.exit(1);
